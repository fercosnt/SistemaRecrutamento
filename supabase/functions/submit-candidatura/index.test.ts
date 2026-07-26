/**
 * Phase 27 / Plan 27-03 Task 2 — CI-03 layer (a): Deno EF unit test for the
 * `submit-candidatura` Edge Function — the system's ONLY sanctioned auto-reject
 * path (submit_candidatura_atomic knockout sweep). Before this test the EF had
 * ZERO request-layer coverage.
 *
 * Harness cloned from `submit-bigfive-final/index.test.ts`: `loadHandler()`
 * dynamic-imports the exported `handler(req, deps)` (index.ts now guards its
 * `Deno.serve` with `import.meta.main`, so importing the module does NOT boot a
 * server), `makeMockSupabaseAdmin` captures every `rpc()` call (the write in this
 * EF is the RPC — the handler makes no direct admin.insert) and resolves the
 * candidatos ownership row, `makeMockSupabaseUser(user)` stubs auth.getUser().
 *
 * ASSERTIONS (the request-layer contract this EF must never regress):
 *   (1) no session (getUser null) → 401 AND zero writes (no recorded RPC call)
 *   (2) a body carrying an extra `.strict()` key (`score`) → 400, never reaches the RPC
 *   (3) happy path → rpc('submit_candidatura_atomic', args) with the p_-prefixed
 *       arg object carrying candidato_id / vaga_id / respostas
 *   (4) an RPC 23505 → DUPLICATE_CANDIDATURA (409); an RPC 23503 → VALIDATION (400)
 *
 * Anti-tamper (RNF-07a): the body carries only identifiers + curriculo metadata —
 * NEVER a score/peso/threshold; `.strict()` rejects any injected key.
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/submit-candidatura
 *
 * @see supabase/functions/submit-candidatura/index.ts (the exported handler)
 * @see supabase/functions/_shared/schemas.ts:204-235 (submitCandidaturaSchema, .strict)
 * @see supabase/migrations/20260709000014_submit_candidatura_flag.sql (submit_candidatura_atomic)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// OWNER.id is the auth uid carried by the JWT (user.id). The EF resolves the
// candidato owned by the authed user via candidatos.user_id=auth.uid() and
// compares that candidatos.id against the body's candidato_id + gates the
// curriculo_url path on `${user.id}/`. So OWNER.id doubles as the curriculo path
// prefix, and CANDIDATO_ID is the candidatos.id the ownership lookup returns.
const OWNER = { id: "auth-uid-1", app_metadata: { role: "candidato" } };
const CANDIDATO_ID = "11111111-1111-4111-8111-111111111111";
const VAGA_ID = "22222222-2222-4222-8222-222222222222";
const PERGUNTA_ID = "33333333-3333-4333-8333-333333333333";
const NEW_CANDIDATURA_ID = "44444444-4444-4444-8444-444444444444";

// The exact body the client (candidaturasService.submitCandidaturaWithRespostas)
// builds: only identifiers + curriculo metadata + respostas. NEVER a score.
// curriculo_url starts with `${OWNER.id}/` so the server-side path check passes.
const VALID_BODY = {
  candidato_id: CANDIDATO_ID,
  vaga_id: VAGA_ID,
  curriculo_url: `${OWNER.id}/curriculo.pdf`,
  curriculo_nome: "curriculo.pdf",
  curriculo_size: 12_345,
  respostas: [{ pergunta_id: PERGUNTA_ID, resposta_texto: "Sim" }],
};

// A thenable+chainable query builder mock. Both call chains the handler uses
// resolve to `result`:
//   candidatos           → .select().eq().is().single()      → Promise<result>
//   perguntas_formulario → .select().eq().is().in()          → awaited thenable
// deno-lint-ignore no-explicit-any
function makeChainable(result: { data: unknown; error: unknown }): any {
  // deno-lint-ignore no-explicit-any
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    // deno-lint-ignore no-explicit-any
    then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onF, onR),
  };
  return chain;
}

interface AdminOpts {
  candidatoOwner?: { id: string } | null;
  candidatoError?: unknown;
  perguntasResult?: { id: string }[];
  rpcResult?: { data: unknown; error: unknown };
}

// Mock service_role admin. Records every rpc() call so a test can assert both the
// arg shape (happy path) AND that a rejected/unauth request NEVER reaches the RPC
// (the sole write). Resolves the candidatos ownership row + the perguntas
// pre-check set.
function makeMockSupabaseAdmin(opts: AdminOpts = {}) {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const candidatoOwner = opts.candidatoOwner === undefined
    ? { id: CANDIDATO_ID }
    : opts.candidatoOwner;
  const perguntasResult = opts.perguntasResult ?? [{ id: PERGUNTA_ID }];
  const rpcResult = opts.rpcResult ?? {
    data: {
      candidatura_id: NEW_CANDIDATURA_ID,
      status: "aguardando_resposta",
      etapa_atual: "triagem",
    },
    error: null,
  };
  return {
    rpcCalls,
    from(table: string) {
      if (table === "candidatos") {
        return makeChainable({
          data: candidatoOwner,
          error: opts.candidatoError ?? null,
        });
      }
      if (table === "perguntas_formulario") {
        return makeChainable({ data: perguntasResult, error: null });
      }
      return makeChainable({ data: null, error: null });
    },
    rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return Promise.resolve(rpcResult);
    },
  };
}

function makeMockSupabaseUser(user: Record<string, unknown> | null) {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user },
          error: user ? null : new Error("no user"),
        }),
    },
  };
}

async function loadHandler() {
  const mod = await import("./index.ts");
  return mod as {
    handler: (
      req: Request,
      deps: { supabaseAdmin: unknown; supabaseUser: unknown },
    ) => Promise<Response>;
  };
}

function makeRequest(body: unknown, withAuth = true): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) headers.Authorization = "Bearer candidato-jwt";
  return new Request("http://localhost/functions/v1/submit-candidatura", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// ── (1) auth gate — no session → 401, never writes (T-27-03-02) ───────────────
Deno.test("no session (getUser null) → 401, never reaches the RPC", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(null) };
  const res = await handler(makeRequest(VALID_BODY, false), deps);
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error_code, "UNAUTHORIZED");
  assertEquals(admin.rpcCalls.length, 0, "must never call the RPC without a session");
});

// ── (2) anti-tamper — an extra `.strict()` key is rejected 400 (T-27-03-01) ───
Deno.test("a body with an extra `score` field is rejected 400 (.strict), never reaches the RPC", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const tampered = { ...VALID_BODY, score: 99 };
  const res = await handler(makeRequest(tampered), deps);
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error_code, "VALIDATION");
  assertEquals(admin.rpcCalls.length, 0, "a tampered body must never reach the RPC");
});

// ── (3) happy path — RPC name + p_-prefixed arg shape ─────────────────────────
Deno.test({
  name: "happy path calls rpc('submit_candidatura_atomic', {p_candidato_id, p_vaga_id, p_respostas, ...})",
  fn: async () => {
    const { handler } = await loadHandler();
    const admin = makeMockSupabaseAdmin();
    const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
    const res = await handler(makeRequest(VALID_BODY), deps);
    assertEquals(res.status, 200);
    assertEquals(admin.rpcCalls.length, 1, "exactly one RPC call on the happy path");
    const call = admin.rpcCalls[0];
    assertEquals(call.name, "submit_candidatura_atomic");
    assertEquals(call.args.p_candidato_id, CANDIDATO_ID);
    assertEquals(call.args.p_vaga_id, VAGA_ID);
    assert(Array.isArray(call.args.p_respostas), "p_respostas must be the respostas array");
    assertEquals(
      (call.args.p_respostas as { pergunta_id: string }[])[0].pergunta_id,
      PERGUNTA_ID,
    );
    const json = await res.json();
    assertEquals(json.ok, true);
    assertEquals(json.data.candidaturaId, NEW_CANDIDATURA_ID);
    // RNF-07a — no score/criterion leaks in the response.
    assert(
      !/score|peso|knockout_id|criterio/i.test(JSON.stringify(json)),
      "the response must carry no score/criterion data",
    );
  },
});

// ── (4a) error mapping — an RPC 23505 → DUPLICATE_CANDIDATURA (409) ────────────
Deno.test("RPC 23505 maps to DUPLICATE_CANDIDATURA (409)", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    rpcResult: {
      data: null,
      error: { code: "23505", message: 'duplicate key value violates unique constraint "candidaturas_..."' },
    },
  });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 409);
  const json = await res.json();
  assertEquals(json.error_code, "DUPLICATE_CANDIDATURA");
});

// ── (4b) error mapping — an RPC 23503 → VALIDATION (400) ──────────────────────
Deno.test("RPC 23503 maps to VALIDATION (400)", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    rpcResult: {
      data: null,
      error: { code: "23503", message: "insert or update violates foreign key constraint" },
    },
  });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error_code, "VALIDATION");
});
