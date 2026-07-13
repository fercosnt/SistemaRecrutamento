/**
 * Edge Function: gerenciar-usuario-rh
 *
 * Phase 28 / Plan 28-06 — SEG-01 / USR-02 / USR-05 / USR-06.
 *
 * The SINGLE privileged write-path for RH accounts. An authenticated caller POSTs a
 * discriminated `action` (criar / mudar_papel / ativar / desativar / resetar_senha);
 * the handler AUTHENTICATES (two-client D-23: an anon client carrying the caller JWT →
 * getUser()), then AUTHORIZES from the TABLE — a service_role read of `usuarios_rh`
 * requiring `role='administrador' AND ativo AND deleted_at IS NULL` — BEFORE any
 * privileged write. Non-authenticated → 401; authenticated non-admin → 403.
 *
 * ── The load-bearing SEG-01 deviation from the consolidar analog ──
 * `consolidar-decisao-final` normalizes `recrutador → 'rh'` and accepts BOTH 'rh' and
 * 'administrador'. This EF is STRICTER: ONLY `role === 'administrador'` dispatches — a
 * `recrutador` (or a null usuarios_rh row) → 403. There is NO 'rh' normalization here,
 * and the role is NEVER read from `getUser().app_metadata` (raw_app_meta_data has no
 * role) — always from `usuarios_rh` via service_role.
 *
 * ── USR-02 orphan-rollback contract (T-28-06) ──
 * `criar` does a two-write: (a) auth.admin.createUser (GoTrue, temp random pw,
 * email_confirm:true) then (b) the row+audit RPC `criar_usuario_rh_com_audit` (one
 * Postgres tx). If (b) errors, the handler COMPENSATES with auth.admin.deleteUser(userId)
 * — no orphan GoTrue identity (idiom: cadastrar-candidato/index.ts:224-226).
 *
 * ── USR-05 email delivery contract ──
 * On `criar` success the handler dispatches a set-password link via
 * resetPasswordForEmail(email, { redirectTo: <origin>/auth/redefinir-senha?tipo=rh }).
 * A thrown/failed send is NON-FATAL (the account already exists) — it surfaces an
 * EMAIL_SEND_FAILED warning, it does NOT 500 the request nor roll the account back.
 *
 * ── USR-06 resetar_senha best-effort audit contract (T-28-05) ──
 * `resetar_senha` is a GoTrue-side action (outside the atomic DB RPC's transaction), so
 * the handler audits it best-effort via rpc('log_auditoria', { p_acao:'resetar_senha',
 * p_categoria:'usuario', p_recurso_tipo:'usuarios_rh', ... }). A failed/thrown audit is
 * ALARMED (console.error) but NON-FATAL — the reset already dispatched.
 *
 * ── USR-07 anti-lockout (T-28-04) — defense-in-depth ──
 * mudar_papel/desativar run a REQUIRED EF-body anti-lockout pre-count (returns a friendly
 * LAST_ADMIN early when the mutation would leave 0 active admins). The DB trigger
 * `trg_usuarios_rh_anti_lockout` (28-05, advisory-lock-before-count, RAISE P0001) is the
 * hard, bypass-proof backstop; the EF maps SQLSTATE P0001 → LAST_ADMIN, P0002 → NOT_FOUND.
 *
 * Two-client (D-23): supabaseUser (anon + Authorization) ONLY for auth.getUser();
 *   supabaseAdmin (service_role) for the authorize read + every privileged write.
 *   NEVER service_role for auth.getUser() (no auth.uid() context).
 *
 * Deploy: `supabase functions deploy gerenciar-usuario-rh` — AUTHORED-NOT-APPLIED here;
 *   the deploy is Plan 28-07 (a [BLOCKING] wave). This file only authors the handler.
 *
 * @module supabase/functions/gerenciar-usuario-rh
 * @see supabase/functions/consolidar-decisao-final/index.ts (two-client authenticate-THEN-authorize skeleton)
 * @see supabase/functions/cadastrar-candidato/index.ts:165-235 (createUser + compensating deleteUser rollback)
 * @see supabase/functions/_shared/usuario-rh-schemas.ts (the .strict() request contract + error vocabulary)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// CI-07 — the SHARED `.strict()` request contract (bare `zod` resolved by
// `supabase/functions/deno.json`'s import map). One module, no re-declaration, no drift.
import {
  gerenciarUsuarioRhSchema,
  type UsuarioRhErrorCode,
  zodPathToFieldName,
} from "../_shared/usuario-rh-schemas.ts";

// ---------------------------------------------------------------------------
// CORS + response helpers (mirror consolidar-decisao-final/index.ts:56-74)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  code: UsuarioRhErrorCode,
  message: string,
  status = 400,
  field?: string,
): Response {
  const body: { ok: false; error_code: UsuarioRhErrorCode; message: string; field?: string } = {
    ok: false,
    error_code: code,
    message,
  };
  if (field) body.field = field;
  return jsonResponse(body, status);
}

// ---------------------------------------------------------------------------
// Recovery-link destination (USR-05) — the live set-password page for RH.
// ---------------------------------------------------------------------------

const RECOVERY_PATH = "/auth/redefinir-senha?tipo=rh";

/** Resolve the recovery redirect origin from the request, with an env/prod fallback. */
function resolveOrigin(req: Request): string {
  const fromHeader = req.headers.get("Origin");
  if (fromHeader) return fromHeader;
  const fromEnv = safeEnv("PUBLIC_APP_URL");
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://rh.beautysmile.com.br";
}

function safeEnv(key: string): string | undefined {
  try {
    return Deno.env.get(key) ?? undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// SQLSTATE → error_code mapping (P0001 anti-lockout, P0002 not-found)
// ---------------------------------------------------------------------------

function mapMutacaoError(error: { code?: string; message?: string } | null): {
  code: UsuarioRhErrorCode;
  message: string;
  status: number;
} {
  const sqlstate = error?.code ?? "";
  const msg = (error?.message ?? "").toLowerCase();
  if (
    sqlstate === "P0001" ||
    msg.includes("anti_lockout") ||
    msg.includes("last_admin") ||
    msg.includes("last active administrator")
  ) {
    return {
      code: "LAST_ADMIN",
      message: "Não é possível remover, rebaixar ou desativar o último administrador ativo.",
      status: 409,
    };
  }
  if (sqlstate === "P0002" || msg.includes("not_found")) {
    return { code: "NOT_FOUND", message: "Usuário não encontrado.", status: 404 };
  }
  return { code: "SERVER_ERROR", message: "Não foi possível concluir a operação.", status: 500 };
}

// ---------------------------------------------------------------------------
// USR-07 anti-lockout EF-body pre-count (defense-in-depth; trigger is the backstop)
// ---------------------------------------------------------------------------

/**
 * Returns true when the requested mutation would leave ZERO active administrators
 * (`role='administrador' AND ativo AND deleted_at IS NULL`). Mirrors the trigger's
 * `id <> target` count. Only `desativar` and `mudar_papel`-away-from-admin can lower
 * the floor; `ativar` (and `mudar_papel` → administrador) never do → they short-circuit
 * to false. The DB trigger remains the hard backstop for the concurrent-demote race.
 */
async function wouldBreakAdminFloor(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  targetId: string,
  action: "mudar_papel" | "ativar" | "desativar",
  novoPapel: string | null,
): Promise<boolean> {
  const removesAdmin =
    action === "desativar" || (action === "mudar_papel" && novoPapel !== "administrador");
  if (!removesAdmin) return false;

  // Is the target CURRENTLY an active administrator? (Only then can removing it matter.)
  const { data: target } = await supabaseAdmin
    .from("usuarios_rh")
    .select("role, ativo, deleted_at")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) return false; // NOT_FOUND is surfaced by the RPC (P0002) downstream.
  const targetIsActiveAdmin =
    target.role === "administrador" && target.ativo === true && target.deleted_at == null;
  if (!targetIsActiveAdmin) return false;

  // Count OTHER active admins. Zero others ⇒ this mutation would lock everyone out.
  const { count } = await supabaseAdmin
    .from("usuarios_rh")
    .select("id", { count: "exact", head: true })
    .eq("role", "administrador")
    .eq("ativo", true)
    .is("deleted_at", null)
    .neq("id", targetId);
  return (count ?? 0) === 0;
}

// ---------------------------------------------------------------------------
// Injectable deps (tests inject mocks; no network) — mirror consolidar :216-221
// ---------------------------------------------------------------------------

export interface GerenciarUsuarioRhDeps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  // deno-lint-ignore no-explicit-any
  supabaseUser: any;
}

/**
 * Testable handler: receives injected `deps`. `Deno.serve` (below) builds the real
 * two-client from env + the Authorization header and delegates here.
 */
export async function handler(req: Request, deps: GerenciarUsuarioRhDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado.", 405);

  const { supabaseAdmin, supabaseUser } = deps;

  // ── 1. AUTHENTICATE — anon client carries the caller Authorization header (D-23) ─
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 1b. AUTHORIZE from the TABLE (SEG-01) — administrador-ONLY. NEVER the JWT
  //      app_metadata; NEVER the recrutador→'rh' normalization. service_role read.
  const { data: rhRow } = await supabaseAdmin
    .from("usuarios_rh")
    .select("role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (rhRow?.role !== "administrador") {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }

  // ── 2. PARSE + validate the body (.strict() — unknown key → VALIDATION before any write) ─
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).", 400);
  }
  const parsed = gerenciarUsuarioRhSchema.safeParse(raw);
  if (!parsed.success) {
    const field = zodPathToFieldName(parsed.error.issues[0]?.path as (string | number)[]);
    return errorResponse("VALIDATION", "Payload inválido.", 400, field);
  }
  const body = parsed.data;

  try {
    // ── 3. DISPATCH on the discriminated action ──────────────────────────────
    if (body.action === "criar") {
      return await handleCriar(req, supabaseAdmin, user.id, body);
    }
    if (body.action === "resetar_senha") {
      return await handleResetarSenha(req, supabaseAdmin, user.id, body.target_id);
    }
    // mudar_papel / ativar / desativar — DB-only mutations via the atomic RPC.
    return await handleMutacao(supabaseAdmin, user.id, body);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[gerenciar-usuario-rh] erro inesperado", { action: body.action, error: message });
    return errorResponse("SERVER_ERROR", "Falha ao processar a solicitação.", 500);
  }
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

/**
 * `criar` (USR-02/USR-05): createUser(temp random pw, email_confirm:true) → the atomic
 * `criar_usuario_rh_com_audit` RPC (compensating deleteUser on RPC failure — no orphan)
 * → a best-effort set-password email (non-fatal on failure).
 */
async function handleCriar(
  req: Request,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  actorId: string,
  body: { email: string; nome_completo: string; cargo: string; papel: string },
): Promise<Response> {
  // (a) createUser — throwaway random password (user sets their own via recovery); NEVER logged.
  const tempPassword = crypto.randomUUID() + crypto.randomUUID();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nome_completo: body.nome_completo },
  });
  if (authError || !authData?.user) {
    const raw = (authError?.message ?? "").toLowerCase();
    if (raw.includes("already")) {
      return errorResponse("EMAIL_EXISTS", "Este email já está cadastrado.", 409, "email");
    }
    console.error("[gerenciar-usuario-rh] createUser falhou:", authError?.message);
    return errorResponse("SERVER_ERROR", "Não foi possível criar o usuário.", 400);
  }
  const userId = authData.user.id as string;

  // (b) row + audit in ONE tx via the DEFINER RPC. On failure → COMPENSATE (no orphan).
  const { error: rpcErr } = await supabaseAdmin.rpc("criar_usuario_rh_com_audit", {
    p_actor: actorId,
    p_user_id: userId,
    p_email: body.email,
    p_nome: body.nome_completo,
    p_cargo: body.cargo,
    p_papel: body.papel,
  });
  if (rpcErr) {
    await supabaseAdmin.auth.admin.deleteUser(userId).catch((rollbackErr: unknown) => {
      console.error("[gerenciar-usuario-rh] rollback deleteUser falhou:", { userId, rollbackErr });
    });
    const raw = (rpcErr.message ?? "").toLowerCase();
    if (raw.includes("duplicate") || raw.includes("unique") || raw.includes("already")) {
      return errorResponse("EMAIL_EXISTS", "Este email já está cadastrado.", 409, "email");
    }
    console.error("[gerenciar-usuario-rh] criar_usuario_rh_com_audit falhou:", rpcErr.message);
    return errorResponse("SERVER_ERROR", "Não foi possível registrar o usuário.", 400);
  }

  // (c) best-effort set-password email. A send failure is NON-FATAL — the account exists.
  const emailSent = await dispatchRecoveryEmail(supabaseAdmin, body.email, resolveOrigin(req));
  if (!emailSent) {
    console.warn("[gerenciar-usuario-rh] usuário criado mas email de senha falhou (EMAIL_SEND_FAILED)", {
      userId,
    });
    return jsonResponse(
      {
        ok: true,
        data: { userId },
        warning: "EMAIL_SEND_FAILED",
        message: "Usuário criado. O email de definição de senha não pôde ser enviado; reenvie depois.",
      },
      201,
    );
  }
  return jsonResponse({ ok: true, data: { userId } }, 201);
}

/**
 * mudar_papel / ativar / desativar (USR-03/USR-04/USR-07): a REQUIRED EF-body
 * anti-lockout pre-count, then the atomic `gerir_usuario_rh_mutacao` RPC. The DB
 * trigger is the hard backstop; SQLSTATE P0001 → LAST_ADMIN, P0002 → NOT_FOUND.
 */
async function handleMutacao(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  actorId: string,
  body:
    | { action: "mudar_papel"; target_id: string; novo_papel: string }
    | { action: "ativar"; target_id: string }
    | { action: "desativar"; target_id: string },
): Promise<Response> {
  const novoPapel = body.action === "mudar_papel" ? body.novo_papel : null;

  // USR-07 defense-in-depth: friendly early LAST_ADMIN (the trigger is the hard floor).
  if (await wouldBreakAdminFloor(supabaseAdmin, body.target_id, body.action, novoPapel)) {
    return errorResponse(
      "LAST_ADMIN",
      "Não é possível remover, rebaixar ou desativar o último administrador ativo.",
      409,
    );
  }

  const { error } = await supabaseAdmin.rpc("gerir_usuario_rh_mutacao", {
    p_actor: actorId,
    p_target: body.target_id,
    p_action: body.action,
    p_novo_papel: novoPapel,
  });
  if (error) {
    const mapped = mapMutacaoError(error);
    if (mapped.code === "SERVER_ERROR") {
      console.error("[gerenciar-usuario-rh] gerir_usuario_rh_mutacao falhou:", error.message);
    }
    return errorResponse(mapped.code, mapped.message, mapped.status);
  }
  return jsonResponse({ ok: true }, 200);
}

/**
 * `resetar_senha` (USR-05/USR-06): dispatch a recovery email to the target, then a
 * best-effort `log_auditoria` (the GoTrue action is outside the DEFINER-RPC tx, so a
 * failed audit is alarmed but NON-FATAL). A send failure → EMAIL_SEND_FAILED.
 */
async function handleResetarSenha(
  req: Request,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  actorId: string,
  targetId: string,
): Promise<Response> {
  // Resolve the target email (service_role — bypasses RLS).
  const { data: target } = await supabaseAdmin
    .from("usuarios_rh")
    .select("email")
    .eq("id", targetId)
    .maybeSingle();
  if (!target?.email) {
    return errorResponse("NOT_FOUND", "Usuário não encontrado.", 404);
  }

  const emailSent = await dispatchRecoveryEmail(supabaseAdmin, target.email as string, resolveOrigin(req));
  if (!emailSent) {
    return errorResponse(
      "EMAIL_SEND_FAILED",
      "Não foi possível enviar o email de redefinição de senha.",
      502,
    );
  }

  // Best-effort audit (T-28-05): a GoTrue-side action can't share the DEFINER-RPC tx,
  // so we log AFTER dispatch. A failed/thrown audit is ALARMED but NON-FATAL.
  try {
    const { error: auditErr } = await supabaseAdmin.rpc("log_auditoria", {
      p_usuario_id: actorId,
      p_usuario_tipo: "admin",
      p_acao: "resetar_senha",
      p_categoria: "usuario",
      p_descricao: "Reset de senha disparado para usuário RH",
      p_severidade: "aviso",
      p_recurso_tipo: "usuarios_rh",
      p_recurso_id: targetId,
      p_sucesso: true,
    });
    if (auditErr) {
      console.error("[gerenciar-usuario-rh] ALARME: log_auditoria(resetar_senha) falhou (non-fatal)", {
        targetId,
        error: auditErr.message,
      });
    }
  } catch (auditThrow) {
    console.error("[gerenciar-usuario-rh] ALARME: log_auditoria(resetar_senha) lançou (non-fatal)", {
      targetId,
      error: auditThrow instanceof Error ? auditThrow.message : String(auditThrow),
    });
  }

  return jsonResponse({ ok: true }, 200);
}

/**
 * Dispatch a set-password / recovery link. Returns true on success, false on any
 * returned error OR thrown exception (SMTP down). NEVER logs the email/OTP/token.
 */
async function dispatchRecoveryEmail(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  email: string,
  origin: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}${RECOVERY_PATH}`,
    });
    if (error) {
      console.error("[gerenciar-usuario-rh] resetPasswordForEmail retornou erro (non-fatal)");
      return false;
    }
    return true;
  } catch {
    console.error("[gerenciar-usuario-rh] resetPasswordForEmail lançou (non-fatal)");
    return false;
  }
}

// ---------------------------------------------------------------------------
// Deno.serve — production wiring (two-client from env + Authorization header)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // CORS preflight BEFORE any auth check (the browser sends OPTIONS with no Authorization).
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error("[gerenciar-usuario-rh] Faltam variáveis de ambiente");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado.", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    }

    // anon client WITH Authorization → auth.getUser() verifies the caller JWT.
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    // service_role — the authorize read + every privileged write (D-23).
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
