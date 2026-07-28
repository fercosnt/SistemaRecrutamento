/**
 * Edge Function: submit-bigfive-final
 *
 * Phase 12 / Plan 12-03 — AVAL-04 / RF-15. Invocada pelo CANDIDATO autenticado
 * (JWT-ON) para pontuar server-side o IPIP-NEO-120 (Big Five).
 *
 * Arquitetura (two-client D-23 + C1 authenticate-THEN-authorize, lição Phase 10/11,
 * clonada VERBATIM de avaliar-redacao):
 *   Recebe `{ candidatura_id, respostas: {116 ids ativos → 1-5} }`, verifica o JWT do
 *   candidato (supabaseUser anon + Authorization → auth.getUser()), AUTORIZA que
 *   auth.uid() é dono da candidatura E etapa_atual='avaliacao_assincrona' (403 caso
 *   contrário — service_role bypassa RLS, então a checagem é OBRIGATÓRIA ANTES de
 *   qualquer leitura/escrita), re-pontua server-side via bigfive-scoring.score()
 *   (o answer-key/reverse NUNCA sai do servidor — anti-tamper, Pitfall 3) e persiste
 *   UMA linha em `scores_candidato` (tipo='big_five', status='sucesso' SEMPRE).
 *
 * INVARIANTE (RNF-07a — Pitfall 4): Big Five é CONTEXTUAL. A EF NUNCA escreve
 *   `candidaturas`, NUNCA faz auto-advance/auto-reject, e NUNCA roteia para
 *   revisão-humana a partir de um valor de traço. O candidato recebe um payload
 *   NEUTRO (`{ ok:true, devolutiva_id }`) — nunca o score/percentil/banda.
 *
 * Two-client (D-23): supabaseUser (anon + Authorization) SÓ para auth.getUser();
 *   supabaseAdmin (service_role) SÓ para leituras/escritas privilegiadas.
 *
 * Após persistir o score, invoca `gerar-devolutiva-bigfive` inline (await, gated na
 *   nova linha de score) e captura o `devolutiva_id`; em falha/timeout a EF segue
 *   (a devolutiva é best-effort — RFB-11/24), nunca derrubando o submit do candidato.
 *
 * Deploy: `supabase functions deploy submit-bigfive-final` (JWT-ON; candidate-invoked;
 *   flag tratada no Plan 12-06 [BLOCKING]).
 *
 * @module supabase/functions/submit-bigfive-final
 * @see supabase/functions/avaliar-redacao/index.ts:148-363 (skeleton two-client + C1)
 * @see supabase/functions/_shared/bigfive-scoring.ts (score() + normGroupFromBirthDate())
 * @see supabase/functions/_shared/avaliacao-schemas.ts (SubmitBigfiveFinalBodySchema)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  score,
  normGroupFromBirthDate,
  type NormGroup,
  ACTIVE_ITEM_IDS,
  ACTIVE_ITEM_COUNT,
} from "../_shared/bigfive-scoring.ts";

// ---------------------------------------------------------------------------
// CORS + response helpers
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "SERVER_ERROR";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
}

// ---------------------------------------------------------------------------
// Deps injetáveis (testes injetam mocks; produção constrói clientes reais)
// ---------------------------------------------------------------------------

export interface SubmitBigfiveFinalDeps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  // deno-lint-ignore no-explicit-any
  supabaseUser: any;
}

/**
 * Anti-tamper body gate (Pitfall 3). Espelha `SubmitBigfiveFinalBodySchema.strict()`
 * sem impor o formato UUID no `candidatura_id` (a existência/posse é provada pelo
 * lookup de autorização — um id inexistente cai em 403). Rejeita qualquer campo
 * extra (ex.: `score`), exige que `respostas` cubra EXATAMENTE os 116 ids ATIVOS
 * (UX-08: os 4 itens políticos O6 {28,58,88,118} foram desativados → o conjunto de ids
 * é NÃO-CONTÍGUO, derivado server-side de ACTIVE_ITEM_IDS no scorer) e que cada valor
 * seja int 1-5. O cliente NUNCA envia um score — ele é derivado server-side.
 */
function validateBody(raw: Record<string, unknown>): {
  ok: boolean;
  numeric: Record<number, number>;
} {
  // .strict — só `candidatura_id` e `respostas` são permitidos.
  const allowed = new Set(["candidatura_id", "respostas"]);
  for (const k of Object.keys(raw)) {
    if (!allowed.has(k)) return { ok: false, numeric: {} };
  }
  if (typeof raw.candidatura_id !== "string") return { ok: false, numeric: {} };
  const respostas = raw.respostas;
  if (!respostas || typeof respostas !== "object" || Array.isArray(respostas)) {
    return { ok: false, numeric: {} };
  }
  const rec = respostas as Record<string, unknown>;
  // UX-08: cobertura exata do conjunto ATIVO (116 ids não-contíguos). Isso rejeita um
  // body de 120 itens, um body carregando um id desativado (28/58/88/118), ou qualquer
  // cobertura errada — o loop exige que CADA id ativo esteja presente e 1-5.
  if (Object.keys(rec).length !== ACTIVE_ITEM_COUNT) return { ok: false, numeric: {} };
  const numeric: Record<number, number> = {};
  for (const id of ACTIVE_ITEM_IDS) {
    const v = rec[String(id)];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) {
      return { ok: false, numeric: {} };
    }
    numeric[id] = v;
  }
  return { ok: true, numeric };
}

/**
 * Handler testável: recebe `deps` injetadas. `Deno.serve` (no fim) constrói os
 * clientes reais a partir do env + do Authorization header e delega para cá.
 */
export async function handler(req: Request, deps: SubmitBigfiveFinalDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { supabaseAdmin, supabaseUser } = deps;

  // ── 1. Autentica o JWT do candidato (two-client D-23 — auth.getUser anon) ────
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 2. Lê o body cru (sem confiar em nada além do candidatura_id p/ a AUTZ).
  //      A validação .strict (anti-tamper) acontece DEPOIS da autorização (passo 4)
  //      — a posse/etapa (403, IDOR/back-lock) precede qualquer processamento do
  //      payload, espelhando a ordem auth→authz da família de EFs de avaliação.
  let raw: { candidatura_id?: unknown; respostas?: unknown; [k: string]: unknown };
  try {
    raw = await req.json();
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).");
  }
  const candidaturaId = typeof raw?.candidatura_id === "string" ? raw.candidatura_id : null;
  if (!candidaturaId) {
    return errorResponse("VALIDATION", "candidatura_id ausente.");
  }

  // ── 3. AUTORIZA (C1 — IDOR/back-lock): service_role bypassa RLS, então a EF
  //      DEVE verificar posse + etapa ANTES de tocar qualquer dado. Allowlist
  //      explícita de colunas, nunca o wildcard — [[reference_select_star_leaks_pii]].
  const { data: candRow, error: candErr } = await supabaseAdmin
    .from("candidaturas")
    .select("id, candidato_id, vaga_id, etapa_atual")
    .eq("id", candidaturaId)
    .maybeSingle();
  if (candErr) {
    return errorResponse("SERVER_ERROR", "Falha ao verificar a candidatura.", 500);
  }
  if (!candRow) {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }
  // posse: resolve o candidato do usuário logado via candidatos.user_id=auth.uid()
  //   e compara contra candaturas.candidato_id (= candidatos.id). Comparar
  //   `candRow.candidato_id` direto contra `user.id` é um bug: candidato_id é
  //   candidatos.id, NÃO o auth uid — eles diferem em PROD → 403 para todo candidato.
  const { data: candidatoOwner } = await supabaseAdmin
    .from("candidatos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!candidatoOwner || candidatoOwner.id !== candRow.candidato_id) {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }
  if (candRow.etapa_atual !== "avaliacao_assincrona") {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }

  // ── 4. SÓ AGORA valida o body (anti-tamper, Pitfall 3 — rejeita qualquer campo
  //      extra como `score`) e a cobertura exata dos 116 ids ativos (1-5 cada).
  const validated = validateBody(raw);
  if (!validated.ok) {
    return errorResponse("VALIDATION", "Payload da avaliação inválido.");
  }
  const numericRespostas = validated.numeric;

  try {
    // ── 4. Resolve o norm-group pela data de nascimento (allowlist explícita).
    //      Sexo='N' (LGPD-01 — sexo não é coletado); faixa derivada do dob.
    //      Se o dob não for legível, cai no fallback (>60 não é eliminatório:
    //      Big Five é contextual; V1 roteia todos os grupos ao mesmo norm).
    let normGroup: NormGroup = { sexo: "N", faixa: "21-40" };
    try {
      const { data: candidatoRow } = await supabaseAdmin
        .from("candidatos")
        .select("id, data_nascimento")
        .eq("id", candRow.candidato_id)
        .maybeSingle();
      if (candidatoRow?.data_nascimento) {
        normGroup = normGroupFromBirthDate(candidatoRow.data_nascimento as string);
      }
    } catch {
      // sem dob legível → mantém o fallback 21-40 (não-eliminatório).
    }

    // ── 5. Re-pontua server-side (anti-tamper, Pitfall 3): só math, sem LLM. ───
    const scored = score(numericRespostas, normGroup);

    // ── 6. Persiste UMA linha de score (NUNCA toca candidaturas — RNF-07a /
    //      Pitfall 4). status='sucesso' SEMPRE — Big Five é contextual, nenhum
    //      valor de traço deriva revisão-humana nem rejeição. ──────────────────
    // CR-03: `.select("id").single()` é OBRIGATÓRIO. Sem ele, supabase-js v2 não
    // pede representação e devolve `{ data: null }` → scoreId sempre null → a
    // devolutiva é invocada com score_id:null e NUNCA resolve. O `.single()`
    // devolve a linha recém-inserida com o id real.
    const { data: scoreRow, error: scoreErr } = await supabaseAdmin
      .from("scores_candidato")
      .insert({
        candidatura_id: candidaturaId,
        tipo: "big_five",
        status: "sucesso",
        metadata: {
          dimensoes: scored.dimensoes,
          facetas: scored.facetas,
          norm_group: scored.norm_group,
        },
      })
      .select("id")
      .single();
    if (scoreErr || !scoreRow?.id) {
      return errorResponse("SERVER_ERROR", "Falha ao registrar a avaliação.", 500);
    }
    const scoreId: string = scoreRow.id;

    // ── 7. Invoca gerar-devolutiva-bigfive inline (gated na nova linha de score).
    //      Best-effort (RFB-11/24): falha/timeout NÃO derruba o submit; a devolutiva
    //      é gerada de forma assíncrona/retry pelo n8n nesse caso.
    let devolutivaId: string | null = null;
    try {
      if (typeof supabaseAdmin.functions?.invoke === "function") {
        const invokePromise = supabaseAdmin.functions.invoke("gerar-devolutiva-bigfive", {
          body: { candidatura_id: candidaturaId, score_id: scoreId },
        });
        const timeout = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 10_000)
        );
        const { data: devRes } = (await Promise.race([invokePromise, timeout])) as {
          data: { devolutiva_id?: string } | null;
        };
        devolutivaId = devRes?.devolutiva_id ?? null;
      }
    } catch {
      // best-effort — a devolutiva pode ser (re)gerada pelo pipeline assíncrono.
      devolutivaId = null;
    }

    // Log redigido (Pitfall 7) — só ids/counts/status; NUNCA respostas/score brutos.
    console.log("[submit-bigfive-final] ok", {
      candidatura_id: candidaturaId,
      score_id: scoreId,
      respostas_count: Object.keys(numericRespostas).length,
      norm_faixa: normGroup.faixa,
      status: "sucesso",
      devolutiva_id: devolutivaId,
    });

    // Payload NEUTRO — o candidato nunca recebe score/percentil/banda (RNF-07a).
    return jsonResponse({ ok: true, devolutiva_id: devolutivaId }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[submit-bigfive-final] erro", {
      candidatura_id: candidaturaId,
      error: message,
    });
    return errorResponse("SERVER_ERROR", "Falha ao processar a avaliação.", 500);
  }
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (two-client a partir do env + Authorization)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error("[submit-bigfive-final] Faltam variáveis de ambiente");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    }

    // anon client COM Authorization → auth.getUser() verifica o JWT do candidato.
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    // service_role SÓ para leituras/escritas privilegiadas (D-23).
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
