/**
 * Edge Function: get-curriculo-url
 *
 * Phase 32 / Plan 32-02 — SEG-01. The single privileged RH path to a candidate
 * CV. Invoked by an authenticated RH (via `supabase.functions.invoke` from
 * `cvUploadService.getSignedUrl`). Mints a SHORT-LIVED (60s) signed URL over the
 * PRIVATE `curriculos` bucket AFTER verifying the role from a live active
 * `usuarios_rh` row — replacing the role-only `curriculos_select_own_or_rh`
 * Storage read branch (dropped in Migration A, applied in 32-04). Phase 50 / D-01:
 * vaga ownership is no longer authorization; every ACTIVE rh reads any CV, as the
 * administrador does.
 *
 * Architecture (D-23 two-client, authenticate-THEN-authorize — cloned verbatim
 * from `comparativo-candidatos/index.ts`):
 *   1. AUTHENTICATE: supabaseUser (anon + Authorization) → auth.getUser() (401 if none).
 *   2. AUTHORIZE role: read `usuarios_rh.role` via supabaseAdmin (service_role), ONLY
 *      a live row (`ativo = true`, `deleted_at IS NULL`); map recrutador→rh /
 *      administrador→administrador; role ∉ {rh, administrador} → 403. This is the
 *      ONLY authorization (Phase 50 / D-01, D-02 — the EF equivalent of
 *      `is_active_rh_user()`). role is NOT read from getUser().app_metadata — the
 *      custom_access_token_hook injects role ONLY into signed JWT claims; the DB
 *      raw_app_meta_data is null.
 *   3. INPUT: `{ candidatura_id }` ONLY — NEVER a client-supplied storage path
 *      (forgeable — Tampering T-32-03). The path is resolved server-side.
 *   4. RESOLVE: `candidaturas.select('curriculo_url')` (allowlist projection, NEVER
 *      select('*') — [[reference_select_star_leaks_pii]]), soft-deleted rows excluded;
 *      missing row → 404.
 *   5. NULL curriculo_url → 404.
 *   6. MINT: supabaseAdmin.storage.from('curriculos').createSignedUrl(path, 60) → 200.
 *
 * ── authenticate ≠ authorize (P10/P11 landmine) ──────────────────────────────
 *   An authenticate-ONLY EF (getUser then service_role read WITHOUT the role
 *   check) lets any authenticated candidate read any CV. The role guard (step 2)
 *   runs BEFORE any privileged read. See [[reference_ef_authenticate_vs_authorize]].
 *
 * Two-client (D-23): supabaseUser (anon + Authorization) SÓ for auth.getUser();
 *   supabaseAdmin (service_role) SÓ for privileged reads/storage. NEVER
 *   service_role for auth.getUser() (no auth.uid() context).
 *
 * Import discipline: `createClient` is a STATIC `esm.sh` import — NEVER the
 *   runtime-constructed `["npm:",pkg].join("")` form (that hid the package from
 *   the deploy bundler → ERR_MODULE_NOT_FOUND in P10-13).
 *
 * Env: needs ONLY the auto-injected SUPABASE_URL / SUPABASE_ANON_KEY /
 *   SUPABASE_SERVICE_ROLE_KEY. No Vault secret (client→EF invoke, not DB→EF pg_net).
 *
 * Deploy: `supabase functions deploy get-curriculo-url` (JWT-ON; do NOT pass
 *   --no-verify-jwt) — handled in Plan 32-04 [BLOCKING], AFTER Migration A order.
 *
 * @module supabase/functions/get-curriculo-url
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS + response helpers (cloned from comparativo-candidatos / submit-candidatura)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ErrorCode swaps comparativo's "MIXED_VAGA" for "NOT_FOUND" (nullable curriculo_url → 404).
type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR";

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
// Deps injetáveis (testes injetam mocks; sem rede)
// ---------------------------------------------------------------------------

export interface Deps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  // deno-lint-ignore no-explicit-any
  supabaseUser: any;
}

/** Allowlist projection of `candidaturas` consumed by this EF (never select('*')). */
interface CandidaturaRow {
  curriculo_url: string | null;
}

/**
 * Testable handler: receives injected `deps`. `Deno.serve` (bottom) builds the
 * real two-client from env + the Authorization header and delegates here.
 */
export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { supabaseAdmin, supabaseUser } = deps;

  // ── 1. AUTHENTICATE (two-client D-23 — auth.getUser via anon client) ────────
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 2. AUTHORIZE role (C1 — IDOR/PII): autenticar NÃO basta. O CV é lido via
  //      service_role (bypassa RLS), então a EF DEVE verificar o papel ANTES de
  //      tocar qualquer dado. role NÃO vem de getUser().app_metadata: o getUser()
  //      reflete raw_app_meta_data (SEM role); o custom_access_token_hook injeta o
  //      role SÓ nos claims do JWT assinado. Fonte de verdade = usuarios_rh (mesma
  //      derivação do hook: recrutador→rh, administrador→administrador).
  const { data: rhRow, error: rhErr } = await supabaseAdmin
    .from("usuarios_rh")
    .select("role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  // WR-04: do NOT swallow the query error — a transient DB error or a duplicate usuarios_rh
  // row must surface as 500, not a misleading permanent 403 (the sibling reads below already 500).
  if (rhErr) {
    return errorResponse("SERVER_ERROR", "Falha ao verificar permissão.", 500);
  }
  const dbRole = (rhRow?.role as string | undefined) ?? null;
  const role = dbRole === "recrutador"
    ? "rh"
    : dbRole === "administrador"
      ? "administrador"
      : dbRole;
  if (role !== "rh" && role !== "administrador") {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }

  // ── 3. Parse + valida o body ──────────────────────────────────────────────
  //      Aceita `candidatura_id: string` APENAS. NUNCA um `path` cru do client
  //      (forjável — Tampering T-32-03). O path é resolvido server-side no passo 4.
  let candidaturaId: string;
  try {
    const raw = await req.json();
    const id = (raw as { candidatura_id?: unknown })?.candidatura_id;
    if (typeof id !== "string" || id.trim() === "") {
      return errorResponse("VALIDATION", "candidatura_id é obrigatório.");
    }
    // WR-05: a non-UUID id must be a 4xx (VALIDATION), not a downstream 500 from a bad `.eq('id', …)`.
    const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!UUID_RE.test(id.trim())) {
      return errorResponse("VALIDATION", "candidatura_id inválido.");
    }
    candidaturaId = id.trim();
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).");
  }

  try {
    // ── 4. Resolve o path server-side (allowlist projection — NÃO select('*'),
    //      [[reference_select_star_leaks_pii]]). Linha ausente OU curriculo_url
    //      NULL → 404.
    const { data: candRaw, error: candErr } = await supabaseAdmin
      .from("candidaturas")
      .select("curriculo_url")
      .eq("id", candidaturaId)
      .is("deleted_at", null) // WR-03: NEVER mint a URL for a soft-deleted candidatura's CV
      .maybeSingle();
    if (candErr) {
      return errorResponse("SERVER_ERROR", "Falha ao carregar a candidatura.", 500);
    }
    const cand = (candRaw ?? null) as CandidaturaRow | null;
    if (!cand) {
      return errorResponse("NOT_FOUND", "Candidatura não encontrada.", 404);
    }

    // ── 5. Currículo ausente (NULL) → 404. (Phase 50 / D-01: a autoria da vaga
    //      deixou de ser autorização — todo rh ATIVO lê o CV de qualquer candidatura,
    //      como o administrador. A autorização é só a linha viva de usuarios_rh do
    //      passo 2; nenhuma leitura de `vagas` acontece.)
    if (!cand.curriculo_url) {
      return errorResponse("NOT_FOUND", "Currículo não encontrado.", 404);
    }

    // ── 6. Minta a URL assinada de 60s. curriculo_url é `{auth.uid()}/{uuid}.pdf`
    //      (sem prefixo de bucket, sem barra inicial) — exatamente o que
    //      createSignedUrl(path,…) espera.
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("curriculos")
      .createSignedUrl(cand.curriculo_url, 60);
    if (signErr || !signed?.signedUrl) {
      return errorResponse("SERVER_ERROR", "Falha ao gerar a URL do currículo.", 500);
    }

    // Log redigido (Pitfall 7) — só { candidatura_id, role }; NUNCA a signedUrl/path.
    console.log("[get-curriculo-url] ok", { candidatura_id: candidaturaId, role });

    return jsonResponse({ ok: true, signedUrl: signed.signedUrl }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // NUNCA loga a signedUrl — só o id + a mensagem de erro (Pitfall 7).
    console.error("[get-curriculo-url] erro", { candidatura_id: candidaturaId, error: message });
    return errorResponse("SERVER_ERROR", "Falha ao obter a URL do currículo.", 500);
  }
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (two-client a partir do env + Authorization)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // CORS preflight ANTES do guard de authHeader — o browser manda OPTIONS SEM
    // Authorization; sem este short-circuit o guard abaixo devolveria 401 no
    // preflight → o browser bloquearia por CORS.
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error("[get-curriculo-url] Faltam variáveis de ambiente");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    }

    // anon client COM Authorization → auth.getUser() decodifica/verifica o JWT do RH.
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    // service_role SÓ para leituras privilegiadas + assinar a URL (Pitfall 10 / D-23).
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
