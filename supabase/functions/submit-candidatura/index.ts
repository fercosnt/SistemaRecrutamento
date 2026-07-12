/**
 * Edge Function: submit-candidatura
 *
 * Phase 4 / Plan 04-05 — Atomic submission of candidatura + respostas_formulario.
 *
 * Architecture (RESEARCH.md §submit-candidatura Edge Function L990-1252):
 *   1. Validate body via submitCandidaturaSchema (Zod)
 *   2. Verify Authorization header → auth.getUser() (anon-with-Authorization client, Pitfall 10)
 *   3. Match candidatos.user_id == authenticated user.id (server-side IDOR cross-check)
 *   4. Validate curriculo_url path starts with `${user.id}/` (T-04-04 / T-04-11b mitigation)
 *   5. Call submit_candidatura_atomic RPC (SECURITY DEFINER, service_role grant — migration 20260425000003)
 *   6. Map Postgres 23505 → DUPLICATE_CANDIDATURA, 23503 → VALIDATION
 *   7. Fire-and-forget N8N webhook AFTER COMMIT (failure non-blocking; T-XX webhook contract)
 *   8. Return { ok: true, data: { candidaturaId } } or structured error
 *
 * Two-client pattern (Pitfall 10):
 *   - supabaseUser (anon + Authorization header) — auth.getUser() resolves user identity
 *   - supabaseAdmin (service_role) — candidatos lookup + submit_candidatura_atomic RPC
 *
 * Deploy: `supabase functions deploy submit-candidatura` (JWT verification ON; do NOT pass --no-verify-jwt)
 *
 * @module supabase/functions/submit-candidatura
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  submitCandidaturaSchema,
  type SubmitCandidaturaInput,
  type SubmitCandidaturaErrorCode,
} from '../_shared/schemas.ts'

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Phase 4 error response shape.
 * Drops the legacy `error` alias from Phase 2 — submit-candidatura has no
 * pre-Phase-4 cached clients, so the Phase 2→3 transition compatibility
 * field is unnecessary here.
 */
function errorResponse(
  code: SubmitCandidaturaErrorCode,
  message: string,
  field?: string,
  status = 400,
): Response {
  const body: Record<string, unknown> = { ok: false, error_code: code, message }
  if (field !== undefined) body.field = field
  return jsonResponse(body, status)
}

// deno-lint-ignore no-explicit-any
function zodPathToFieldName(path: any[]): string | undefined {
  return path && path.length > 0 ? String(path[0]) : undefined
}

// ---------------------------------------------------------------------------
// Deps injetáveis (testes injetam mocks; produção constrói clientes reais)
// ---------------------------------------------------------------------------

export interface SubmitCandidaturaDeps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any
  // deno-lint-ignore no-explicit-any
  supabaseUser: any
}

// ---------------------------------------------------------------------------
// Handler testável — recebe `deps` injetadas (mirror de submit-bigfive-final).
// A produção (wrapper no fim) constrói os dois clientes reais a partir do env +
// do Authorization header e delega para cá. Nenhum status/error_code/mensagem/
// arg da RPC muda — apenas o seam (o ponto de injeção dos clientes) foi extraído.
// ---------------------------------------------------------------------------

export async function handler(
  req: Request,
  deps: SubmitCandidaturaDeps,
): Promise<Response> {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errorResponse('SERVER_ERROR', 'Método não suportado', undefined, 405)
  }

  // ---- 1) Parse + validate body --------------------------------------------
  // WR-09 (Phase 4 review iteration 2 fix): defense-in-depth body-size cap.
  // The realistic candidatura payload — uuid IDs + curriculo metadata + up to
  // ~30 respostas — is well under 16 KB. 64 KB leaves 4× headroom and
  // rejects DoS attempts before req.json() buffers the entire body into
  // memory. Status 413 (Payload Too Large) is the conventional response.
  // The Zod schema's `.max(100)` on respostas[] (schemas.ts:209-220) is the
  // second layer of defense in case Content-Length is missing or spoofed.
  const contentLength = parseInt(
    req.headers.get('content-length') ?? '0',
    10,
  )
  if (contentLength > 64 * 1024) {
    return errorResponse(
      'VALIDATION',
      'Payload muito grande',
      undefined,
      413,
    )
  }

  let input: SubmitCandidaturaInput
  try {
    const raw = await req.json()
    const parsed = submitCandidaturaSchema.safeParse(raw)
    if (!parsed.success) {
      const issue = parsed.error.errors[0]
      return errorResponse(
        'VALIDATION',
        issue?.message ?? 'Payload inválido',
        zodPathToFieldName(issue?.path),
      )
    }
    input = parsed.data
  } catch {
    return errorResponse(
      'VALIDATION',
      'Corpo da requisição inválido (JSON malformado)',
    )
  }

  // ---- 2) Verify auth via the injected user-context client -----------------
  // Pitfall 10 — the anon client WITH the Authorization header forwarded is
  // built in the production wrapper and injected here; auth.getUser() decodes +
  // verifies the candidato JWT. A missing/invalid Authorization header resolves
  // to no user here → 401 (byte-identical response to the pre-refactor explicit
  // no-header 401 — same status/error_code/message).
  const { supabaseUser, supabaseAdmin } = deps
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser()
  if (userErr || !userRes?.user) {
    return errorResponse('UNAUTHORIZED', 'Sessão inválida.', undefined, 401)
  }
  const user = userRes.user

  // ---- 3) Cross-check body.candidato_id matches user.id via candidatos -----
  // Pitfall 10 — service_role client (built in the production wrapper) used ONLY
  // for privileged reads/writes. It MUST NOT be used for auth verification (no
  // auth.uid() context).
  const { data: candidato, error: candErr } = await supabaseAdmin
    .from('candidatos')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()
  if (candErr || !candidato) {
    return errorResponse(
      'UNAUTHORIZED',
      'Cadastro de candidato não encontrado.',
      undefined,
      403,
    )
  }
  if (candidato.id !== input.candidato_id) {
    return errorResponse(
      'UNAUTHORIZED',
      'candidato_id não corresponde ao usuário autenticado.',
      undefined,
      403,
    )
  }

  // ---- 3b) Validate curriculo_url path prefix — T-04-04 / T-04-11b ---------
  // Storage RLS on `curriculos` bucket already enforces (storage.foldername(name))[1]
  // = auth.uid()::text on writes; this server-side check provides defense-in-depth
  // for the path that was just inserted into candidaturas.curriculo_url.
  if (!input.curriculo_url.startsWith(`${user.id}/`)) {
    return errorResponse(
      'VALIDATION',
      'Caminho do currículo inválido.',
      'curriculo_url',
    )
  }

  // ---- 3c) Validate every pergunta_id belongs to this vaga — WR-02 ---------
  // Before the atomic RPC, confirm each pergunta in the payload references
  // a non-deleted pergunta_formulario for the target vaga. The RPC's
  // FK-on-pergunta_id constraint would otherwise raise 23503 with a generic
  // 'Vaga ou pergunta não encontrada.' VALIDATION message that lacks a field
  // hint. By pre-checking here we surface a precise field='pergunta_id' so
  // the client can highlight the offending answer instead of showing a
  // generic 'Dados inválidos' toast.
  const perguntaIds = input.respostas.map((r) => r.pergunta_id)
  if (perguntaIds.length > 0) {
    const { data: validPerguntas, error: perguntaErr } = await supabaseAdmin
      .from('perguntas_formulario')
      .select('id')
      .eq('vaga_id', input.vaga_id)
      .is('deleted_at', null)
      .in('id', perguntaIds)
    if (perguntaErr) {
      console.error('[submit-candidatura] perguntas pre-check failed:', {
        code: (perguntaErr as { code?: string }).code,
        message: (perguntaErr as { message?: string }).message,
      })
      return errorResponse(
        'SERVER_ERROR',
        'Não foi possível validar as perguntas.',
        undefined,
        500,
      )
    }
    const validSet = new Set(
      // supabaseAdmin is injected as `any` via deps → annotate the row shape so
      // the map callback param is not an implicit any (noImplicitAny).
      ((validPerguntas ?? []) as { id: string }[]).map((p) => p.id),
    )
    const missing = perguntaIds.find((id) => !validSet.has(id))
    if (missing) {
      return errorResponse(
        'VALIDATION',
        'Pergunta não pertence à vaga.',
        'pergunta_id',
      )
    }
  }

  // ---- 4) Atomic RPC — INSERT candidatura + INSERT respostas_formulario ----
  // submit_candidatura_atomic is SECURITY DEFINER + REVOKE PUBLIC + GRANT EXECUTE
  // service_role only (migration 20260425000003). On UNIQUE violation
  // (candidato_id+vaga_id partial idx WHERE deleted_at IS NULL — migration
  // 20260425000004), Postgres raises 23505; we map it to DUPLICATE_CANDIDATURA.
  // deno-lint-ignore no-explicit-any
  const { data: rpcData, error: rpcErr } = await (supabaseAdmin.rpc as any)(
    'submit_candidatura_atomic',
    {
      p_candidato_id: input.candidato_id,
      p_vaga_id: input.vaga_id,
      p_curriculo_url: input.curriculo_url,
      p_curriculo_nome: input.curriculo_nome,
      p_curriculo_size: input.curriculo_size,
      p_respostas: input.respostas,
    },
  )

  if (rpcErr) {
    const code = (rpcErr as { code?: string }).code
    const msg = (rpcErr as { message?: string }).message?.toLowerCase() ?? ''
    const isUnique =
      code === '23505' ||
      (msg.includes('unique') && msg.includes('candidat'))
    if (isUnique) {
      return errorResponse(
        'DUPLICATE_CANDIDATURA',
        'Você já se candidatou a esta vaga.',
        undefined,
        409,
      )
    }
    if (code === '23503') {
      // Foreign-key violation — pergunta_id not in perguntas_formulario, or
      // vaga_id not in vagas. Either way, surface as VALIDATION (the client
      // sent stale references).
      return errorResponse('VALIDATION', 'Vaga ou pergunta não encontrada.')
    }
    // Pitfall 7 — log code + summary message; never log full RPC payload
    // (which could contain candidato PII or the curriculo path).
    console.error('[submit-candidatura] RPC failed:', { code, message: msg })
    return errorResponse(
      'SERVER_ERROR',
      'Não foi possível registrar a candidatura.',
      undefined,
      500,
    )
  }

  // Phase 8 / D-16: the RPC now returns `status` + `etapa_atual` alongside the
  // id so the client can branch on a server-authoritative knockout. On a
  // knockout match the RPC auto-rejects synchronously in the same txn
  // (status='rejeitado', etapa_atual='inscricao'); a survivor advances to
  // 'triagem'. We pass these through unchanged below. The criterion
  // (opcao_knockout_id) is NEVER included in the response — it is audit-only.
  const rpcResult = rpcData as {
    candidatura_id: string
    status?: string
    etapa_atual?: string
  }
  const candidaturaId = rpcResult.candidatura_id

  // ---- 5) Fire-and-forget N8N webhook AFTER COMMIT — non-blocking ----------
  // Webhook failure MUST NOT roll back the candidatura. The RPC has already
  // committed; we report success to the client regardless of webhook outcome.
  // Phase 8 / A5: knocked-out candidaturas ALSO fire the nova-candidatura
  // webhook in V1 — RH may want the record of every inscrição, including
  // auto-rejected ones. The webhook is NOT suppressed for status='rejeitado'.
  // WR-04 (Phase 4 review fix): URL is read from N8N_NOVA_CANDIDATURA_URL env
  // var with a hardcoded fallback so existing prod deploys keep working until
  // the env var is set. Drift between this EF and any frontend caller is now
  // a deploy-time choice rather than a code-edit in two places.
  const N8N_NOVA_CANDIDATURA_URL =
    Deno.env.get('N8N_NOVA_CANDIDATURA_URL') ??
    'https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura'
  fetch(N8N_NOVA_CANDIDATURA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'candidatura.created',
      timestamp: new Date().toISOString(),
      data: {
        candidatura_id: candidaturaId,
        vaga_id: input.vaga_id,
        candidato_id: input.candidato_id,
      },
    }),
  }).catch((e) =>
    console.warn(
      '[submit-candidatura] N8N webhook failed (non-blocking):',
      (e as { message?: string })?.message ?? String(e),
    ),
  )

  // ---- 6) Success ----------------------------------------------------------
  // Phase 8 / D-16: surface `status` + `etapa_atual` so the client can render
  // the D-15 neutral inline result on a knockout (status='rejeitado') vs. the
  // normal success confirmation on a survivor. No criterion is leaked.
  return jsonResponse(
    {
      ok: true,
      data: {
        candidaturaId,
        candidaturaUrl: '/candidato/perfil',
        status: rpcResult.status,
        etapa_atual: rpcResult.etapa_atual,
      },
    },
    200,
  )
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (two-client a partir do env + Authorization).
// Guardado por `import.meta.main` para que `await import('./index.ts')` nos
// testes NÃO suba um servidor (mirror de submit-bigfive-final).
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error('[submit-candidatura] Missing env vars')
      return errorResponse(
        'SERVER_ERROR',
        'Servidor mal configurado',
        undefined,
        500,
      )
    }

    // Pitfall 10 — anon client WITH the Authorization header forwarded so
    // auth.getUser() can decode + verify the candidato JWT. A missing header
    // yields no user inside the handler → 401 (same response as before).
    const authHeader = req.headers.get('Authorization')
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader ?? '' } },
    })
    // service_role SÓ para leituras/escritas privilegiadas (Pitfall 10 / D-23).
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    return await handler(req, { supabaseAdmin, supabaseUser })
  })
}
