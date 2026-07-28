/**
 * Phase 28 / Plan 28-02 Task 1 — Wave-0 RED golden test for the RH-account
 * management Edge Function `gerenciar-usuario-rh` (SEG-01 / USR-02 / USR-05 / USR-06).
 *
 * The EF is the SINGLE privileged write-path for RH accounts: an authenticated
 * caller POSTs a discriminated `action` (criar / mudar_papel / ativar / desativar /
 * resetar_senha); the handler AUTHENTICATES (two-client D-23, anon client carries the
 * caller JWT → getUser()), then AUTHORIZES from the TABLE — a service_role read of
 * `usuarios_rh` requiring role='administrador' AND ativo AND deleted_at IS NULL — BEFORE
 * any privileged write. Non-authenticated → 401; authenticated non-admin → 403.
 *
 * ── The load-bearing SEG-01 deviation from the consolidar analog ──
 * consolidar-decisao-final normalizes `recrutador → 'rh'` and accepts BOTH 'rh' and
 * 'administrador'. This EF is STRICTER: only role === 'administrador' dispatches — a
 * `recrutador` cannot manage users. There is NO 'rh' normalization here. A recrutador (or
 * a null usuarios_rh row) → 403.
 *
 * ── The USR-02 orphan-rollback contract (T-28-06) ──
 * `criar` does a two-write: (a) auth.admin.createUser (GoTrue) then (b) the row+audit RPC
 * `criar_usuario_rh_com_audit` (one Postgres tx). If (b) errors, the handler MUST
 * COMPENSATE by calling auth.admin.deleteUser(userId) — no orphan GoTrue identity.
 *
 * ── The USR-05 email delivery contract ──
 * On `criar` success the handler dispatches a set-password link via
 * resetPasswordForEmail(email, { redirectTo: <origin>/auth/redefinir-senha?tipo=rh }).
 * A thrown/failed send is NON-FATAL (the account already exists) — it surfaces an
 * EMAIL_SEND_FAILED warning, it does NOT 500 the request.
 *
 * ── The USR-06 resetar_senha best-effort audit contract (T-28-05) ──
 * `resetar_senha` is a GoTrue-side action (outside the atomic DB RPC), so the handler
 * logs it best-effort via rpc('log_auditoria', { p_acao:'resetar_senha',
 * p_categoria:'usuario', p_recurso_tipo:'usuarios_rh', ... }). A failed/thrown audit is
 * ALARMED but NON-FATAL — the reset already dispatched.
 *
 * ── No real API call happens (Supabase MOCKED via dependency injection `deps`) ──
 * The handler must accept injected deps `{ supabaseAdmin, supabaseUser }` so this test
 * runs with NO network / NO esm.sh import at call time (precedent:
 * consolidar-decisao-final/__tests__/index.test.ts, comparativo-candidatos analog).
 *
 * ── Why this is RED now ──
 * `../index.ts` does NOT exist yet → the dynamic `import()` in loadHandler() throws
 * module-not-found. THAT is the calibrated RED assertion. The implementation lands in
 * 28-06 (and the migrations/RPCs it calls in 28-04/28-05, applied in 28-07). Do NOT stub
 * index.ts to force this green.
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/gerenciar-usuario-rh
 *
 * @see supabase/functions/consolidar-decisao-final/__tests__/index.test.ts (injected-deps analog)
 * @see supabase/functions/cadastrar-candidato/index.ts:165-235 (createUser + compensating deleteUser rollback)
 * @see .planning/phases/28-gest-o-de-usu-rios-rh-n-cleo-seguro/28-PATTERNS.md (§gerenciar-usuario-rh/__tests__)
 * @see .planning/phases/28-gest-o-de-usu-rios-rh-n-cleo-seguro/28-CONTEXT.md (Área 1 authenticate-THEN-authorize)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ── Injected-deps handler shape (28-06 authors this signature) ──────────────────
async function loadHandler() {
  const mod = await import("../index.ts");
  return mod as {
    handler: (
      req: Request,
      deps: { supabaseAdmin: unknown; supabaseUser: unknown },
    ) => Promise<Response>;
  };
}

// Fixed UUIDs for request bodies (the .strict() Zod schema requires real .uuid() targets).
const TARGET_ID = "33333333-3333-4333-8333-333333333333";
const CREATED_USER_ID = "44444444-4444-4444-8444-444444444444";
const ORIGIN = "https://rh.beautysmile.com.br";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/functions/v1/gerenciar-usuario-rh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer admin-user-jwt",
      Origin: ORIGIN,
    },
    body: JSON.stringify(body),
  });
}

// ── Mock user (anon) client: only auth.getUser() — the authenticate leg ─────────
function makeMockSupabaseUser(user: Record<string, unknown> | null) {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user }, error: user ? null : new Error("no user") }),
    },
  };
}

/**
 * Mock service_role (admin) client. Serves:
 *  - from('usuarios_rh').select('role').eq().eq().is().maybeSingle() — the authorize read
 *    (returns the configured `rhRow`; null ⇒ no admin row ⇒ 403);
 *  - auth.admin.createUser(...) — returns CREATED_USER_ID (or a configured error);
 *  - auth.admin.deleteUser(id)  — records ids for the orphan-rollback assertion;
 *  - auth.resetPasswordForEmail(email, opts) — records calls; throws when `resetThrows`;
 *  - rpc(name, params) — records every call; errors when `rpcErrorFor` matches the name,
 *    throws when `rpcThrowFor` matches (to drive best-effort / non-fatal paths).
 */
function makeMockSupabaseAdmin(opts: {
  rhRow?: Record<string, unknown> | null;
  createUserError?: boolean;
  rpcErrorFor?: string;
  rpcThrowFor?: string;
  resetThrows?: boolean;
} = {}) {
  const rhRow = opts.rhRow === undefined ? { role: "administrador", email: "alvo@bs.com" } : opts.rhRow;
  const calledTables: string[] = [];
  const deleteUserCalls: string[] = [];
  const createUserCalls: Record<string, unknown>[] = [];
  const resetEmailCalls: { email: string; options?: { redirectTo?: string } }[] = [];
  const rpcCalls: { name: string; params: Record<string, unknown> }[] = [];

  return {
    calledTables,
    deleteUserCalls,
    createUserCalls,
    resetEmailCalls,
    rpcCalls,
    from(table: string) {
      calledTables.push(table);
      // usuarios_rh authorize lookup (and any target lookup) — chainable, ignores filters.
      const chain = {
        eq: () => chain,
        is: () => chain,
        maybeSingle: () => Promise.resolve({ data: rhRow, error: null }),
      };
      return { select: (_cols?: string) => chain };
    },
    auth: {
      admin: {
        createUser: (attrs: Record<string, unknown>) => {
          createUserCalls.push(attrs);
          if (opts.createUserError) {
            return Promise.resolve({ data: { user: null }, error: { message: "createUser failed" } });
          }
          return Promise.resolve({ data: { user: { id: CREATED_USER_ID } }, error: null });
        },
        deleteUser: (id: string) => {
          deleteUserCalls.push(id);
          return Promise.resolve({ data: null, error: null });
        },
      },
      resetPasswordForEmail: (email: string, options?: { redirectTo?: string }) => {
        resetEmailCalls.push({ email, options });
        if (opts.resetThrows) return Promise.reject(new Error("SMTP down"));
        return Promise.resolve({ data: {}, error: null });
      },
    },
    rpc: (name: string, params: Record<string, unknown>) => {
      rpcCalls.push({ name, params });
      if (opts.rpcThrowFor === name) return Promise.reject(new Error(`${name} threw`));
      if (opts.rpcErrorFor === name) {
        return Promise.resolve({ data: null, error: { message: `${name} failed` } });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

const ADMIN_USER = { id: "adm-1", app_metadata: { role: "administrador" } };
const RECRUTADOR_USER = { id: "rec-1", app_metadata: { role: "candidato" } };

const CRIAR_BODY = {
  action: "criar",
  email: "novo.rh@beautysmile.com.br",
  nome_completo: "Novo Recrutador",
  cargo: "Recrutador",
  papel: "recrutador",
};
const RESETAR_BODY = { action: "resetar_senha", target_id: TARGET_ID };
const ATIVAR_BODY = { action: "ativar", target_id: TARGET_ID };

// ── SEG-01 authenticate: unauthenticated → 401 UNAUTHORIZED ─────────────────────
Deno.test("SEG-01 — unauthenticated caller (getUser null) → 401 UNAUTHORIZED, never writes", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin();
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(null) };
  const res = await handler(makeRequest(ATIVAR_BODY), deps);
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error_code, "UNAUTHORIZED");
  // No privileged write happened (the authenticate leg rejected before any RPC).
  assertEquals(supabaseAdmin.rpcCalls.length, 0);
});

// ── SEG-01 authorize: authenticated non-admin → 403 (administrador-only, NO 'rh') ──
Deno.test("SEG-01 — authenticated but usuarios_rh role is null → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin({ rhRow: null }); // no admin row
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RECRUTADOR_USER) };
  const res = await handler(makeRequest(ATIVAR_BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
});

Deno.test("SEG-01 — a 'recrutador' role → 403 (administrador-only; the 'rh' normalization is ABSENT)", async () => {
  const { handler } = await loadHandler();
  // The role comes from usuarios_rh (the TABLE), NOT from getUser().app_metadata.
  const supabaseAdmin = makeMockSupabaseAdmin({ rhRow: { role: "recrutador" } });
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RECRUTADOR_USER) };
  const res = await handler(makeRequest(ATIVAR_BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
  // Authorization was read from usuarios_rh, not the JWT app_metadata.
  assert(supabaseAdmin.calledTables.includes("usuarios_rh"), "authorize must read usuarios_rh");
});

// ── SEG-01 dispatch: active administrador + valid action → dispatches (not 401/403) ──
Deno.test("SEG-01 — active administrador + valid action → dispatches (2xx / ok:true, not 401/403)", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin({ rhRow: { role: "administrador" } });
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(ADMIN_USER) };
  const res = await handler(makeRequest(ATIVAR_BODY), deps);
  assert(res.status !== 401 && res.status !== 403, `admin must dispatch, got ${res.status}`);
  assert(res.status >= 200 && res.status < 300, `admin dispatch must be 2xx, got ${res.status}`);
  const json = await res.json();
  assertEquals(json.ok, true);
});

// ── USR-02 orphan-rollback (T-28-06): criar row-RPC error → deleteUser compensation ──
Deno.test("USR-02 — criar: when criar_usuario_rh_com_audit RPC errors, handler calls deleteUser(userId)", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin({
    rhRow: { role: "administrador" },
    rpcErrorFor: "criar_usuario_rh_com_audit", // force the row+audit tx to fail
  });
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(ADMIN_USER) };
  const res = await handler(makeRequest(CRIAR_BODY), deps);
  // The created GoTrue user must be compensated — no orphan identity.
  assert(
    supabaseAdmin.deleteUserCalls.includes(CREATED_USER_ID),
    `orphan rollback must call deleteUser('${CREATED_USER_ID}'), got ${JSON.stringify(supabaseAdmin.deleteUserCalls)}`,
  );
  // The request itself reports a server-side failure (row not registered).
  const json = await res.json();
  assertEquals(json.ok, false);
});

// ── USR-05 email path: resetPasswordForEmail redirectTo + non-fatal send failure ──
Deno.test("USR-05 — criar success dispatches resetPasswordForEmail with redirectTo /auth/redefinir-senha?tipo=rh", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin({ rhRow: { role: "administrador" } });
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(ADMIN_USER) };
  const res = await handler(makeRequest(CRIAR_BODY), deps);
  assert(res.status >= 200 && res.status < 300, `criar success must be 2xx, got ${res.status}`);
  assert(supabaseAdmin.resetEmailCalls.length >= 1, "criar success must dispatch a set-password email");
  const redirect = supabaseAdmin.resetEmailCalls[0].options?.redirectTo ?? "";
  assert(
    redirect.endsWith("/auth/redefinir-senha?tipo=rh"),
    `redirectTo must end /auth/redefinir-senha?tipo=rh, got '${redirect}'`,
  );
});

Deno.test("USR-05 — a thrown resetPasswordForEmail is NON-FATAL (account created; request still succeeds)", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin({ rhRow: { role: "administrador" }, resetThrows: true });
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(ADMIN_USER) };
  const res = await handler(makeRequest(CRIAR_BODY), deps);
  // A failed email must NOT 500 the request — the GoTrue account + usuarios_rh row exist.
  assert(res.status !== 500, "email send failure must NOT 500 the request");
  assert(res.status >= 200 && res.status < 300, `request must still succeed, got ${res.status}`);
  // No compensating deleteUser: a send failure does NOT roll the account back.
  assertEquals(supabaseAdmin.deleteUserCalls.length, 0);
});

// ── USR-06 resetar_senha best-effort audit (T-28-05): rpc('log_auditoria') categoria='usuario' ──
Deno.test("USR-06 — resetar_senha writes best-effort log_auditoria (p_acao='resetar_senha', p_categoria='usuario')", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin({ rhRow: { role: "administrador", email: "alvo@bs.com" } });
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(ADMIN_USER) };
  const res = await handler(makeRequest(RESETAR_BODY), deps);
  assert(res.status >= 200 && res.status < 300, `resetar_senha must dispatch, got ${res.status}`);
  const auditCall = supabaseAdmin.rpcCalls.find((c) => c.name === "log_auditoria");
  assert(auditCall !== undefined, "resetar_senha must invoke rpc('log_auditoria') best-effort");
  assertEquals(auditCall!.params.p_acao, "resetar_senha");
  assertEquals(auditCall!.params.p_categoria, "usuario");
  assertEquals(auditCall!.params.p_recurso_tipo, "usuarios_rh");
});

Deno.test("USR-06 — a thrown/failed log_auditoria on resetar_senha is NON-FATAL (the reset already dispatched)", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin({
    rhRow: { role: "administrador", email: "alvo@bs.com" },
    rpcThrowFor: "log_auditoria", // the best-effort audit throws
  });
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(ADMIN_USER) };
  const res = await handler(makeRequest(RESETAR_BODY), deps);
  // Best-effort: a failed audit is alarmed but must NOT fail the already-dispatched reset.
  assert(res.status !== 500, "a failed best-effort audit must NOT 500 the reset");
  assert(res.status >= 200 && res.status < 300, `reset must still succeed, got ${res.status}`);
});
