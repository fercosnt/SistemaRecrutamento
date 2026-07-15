/**
 * Phase 32 / Plan 32-01 Task 1 — SEG-01 deno EF unit test for the
 * `get-curriculo-url` Edge Function: the vaga-scoped CV signed-URL primitive
 * that replaces the role-only `curriculos` bucket read branch.
 *
 * ── AUTHORED RED (by design — see 32-01-PLAN.md / 32-VALIDATION.md Wave 0) ──
 * `supabase/functions/get-curriculo-url/index.ts` DOES NOT EXIST YET. `loadHandler()`
 * dynamic-imports `./index.ts`; that import FAILS TO RESOLVE (module-not-found), so every
 * test here is RED for one KNOWN, intended reason: the EF is not authored until 32-02.
 * This is NOT a syntax error in the test — the harness compiles; only the target module is
 * missing. 32-02 authors index.ts (guarded by `import.meta.main`, so importing it does NOT
 * boot a server) and greens all five branches.
 *
 * Harness cloned verbatim from `submit-candidatura/index.test.ts`: `loadHandler()` +
 * `makeChainable` query-builder mock + `makeMockSupabaseUser(user|null)`. `makeMockSupabaseAdmin`
 * routes `from("usuarios_rh")` → role row, `from("candidaturas")` → {curriculo_url, vaga_id},
 * `from("vagas")` → {created_by}, and stubs `storage.from("curriculos").createSignedUrl(path,60)`.
 *
 * ASSERTIONS — the authorize-THEN-authenticate contract this EF must encode (SEG-01):
 *   (1) no session (getUser null)                       → 401 UNAUTHORIZED
 *   (2) authed candidato (no usuarios_rh row → role null)→ 403 FORBIDDEN
 *   (3) authed rh NOT owning the vaga (created_by ≠ uid) → 403 FORBIDDEN  ← the AUTHORITATIVE
 *       cross-recruiter deny gate (RESEARCH Pitfall 6: 0 role='recrutador' PROD accounts, so
 *       no live curl can prove this — the deno test is the gate).
 *   (4) candidatura missing / curriculo_url NULL         → 404 NOT_FOUND
 *   (5a) owner rh (created_by == uid)                    → 200 { signedUrl }
 *   (5b) administrador (ownership bypass)                → 200 { signedUrl } AND never reads `vagas`
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/get-curriculo-url
 *
 * @see supabase/functions/get-curriculo-url/index.ts (32-02 — the exported handler; absent now)
 * @see supabase/functions/comparativo-candidatos/index.ts (the two-client authorize skeleton)
 * @see supabase/functions/submit-candidatura/index.test.ts (the harness cloned here)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// user.id (auth uid) carried by the JWT. For the owner branch, vaga.created_by === OWNER.id.
const OWNER = { id: "rh-uid-owner", app_metadata: { role: "recrutador" } };
const OTHER_UID = "rh-uid-not-owner";
const CANDIDATURA_ID = "11111111-1111-4111-8111-111111111111";
const VAGA_ID = "22222222-2222-4222-8222-222222222222";
const CV_PATH = "candidate-uid/33333333-3333-4333-8333-333333333333.pdf";
const SIGNED_URL = "https://storage.example/object/sign/curriculos/cv?token=xyz";

// The exact body the client (cvUploadService.getSignedUrl after 32-02) builds:
// only the candidatura_id — NEVER a raw storage path (forgeable).
const VALID_BODY = { candidatura_id: CANDIDATURA_ID };

// A thenable+chainable query-builder mock. Every call chain the handler uses
//   usuarios_rh  → .select().eq().eq().is().maybeSingle()
//   candidaturas → .select().eq().maybeSingle()
//   vagas        → .select().eq().maybeSingle()
// resolves to `result`.
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
  /** usuarios_rh.role row; `null` = no RH row (a candidato) → handler maps to 403. */
  role?: string | null;
  /** candidaturas row projection {curriculo_url, vaga_id}; `null` = no row (404). */
  cand?: { curriculo_url: string | null; vaga_id: string } | null;
  /** vagas row projection {created_by}; drives the ownership check for role='rh'. */
  vaga?: { created_by: string } | null;
  signedUrl?: string;
  signError?: unknown;
}

// Mock service_role admin. Records how many times `vagas` was read so a test can prove the
// administrador branch BYPASSES the ownership lookup (never touches `vagas`).
function makeMockSupabaseAdmin(opts: AdminOpts = {}) {
  const role = opts.role === undefined ? "recrutador" : opts.role;
  const cand = opts.cand === undefined
    ? { curriculo_url: CV_PATH, vaga_id: VAGA_ID }
    : opts.cand;
  const vaga = opts.vaga === undefined ? { created_by: OWNER.id } : opts.vaga;
  const signedUrl = opts.signedUrl ?? SIGNED_URL;
  const reads = { usuariosRh: 0, candidaturas: 0, vagas: 0 };
  return {
    reads,
    from(table: string) {
      if (table === "usuarios_rh") {
        reads.usuariosRh++;
        return makeChainable({ data: role === null ? null : { role }, error: null });
      }
      if (table === "candidaturas") {
        reads.candidaturas++;
        return makeChainable({ data: cand, error: null });
      }
      if (table === "vagas") {
        reads.vagas++;
        return makeChainable({ data: vaga, error: null });
      }
      return makeChainable({ data: null, error: null });
    },
    storage: {
      from(_bucket: string) {
        return {
          createSignedUrl: (_path: string, _expiresIn: number) =>
            Promise.resolve(
              opts.signError
                ? { data: null, error: opts.signError }
                : { data: { signedUrl }, error: null },
            ),
        };
      },
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
  // RED until 32-02: ./index.ts does not exist → this import rejects with module-not-found.
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
  if (withAuth) headers.Authorization = "Bearer rh-jwt";
  return new Request("http://localhost/functions/v1/get-curriculo-url", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// ── (1) auth gate — no session → 401 UNAUTHORIZED ─────────────────────────────
Deno.test("no session (getUser null) → 401 UNAUTHORIZED", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(null) };
  const res = await handler(makeRequest(VALID_BODY, false), deps);
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error_code, "UNAUTHORIZED");
});

// ── (2) role gate — authed candidato (no usuarios_rh row) → 403 FORBIDDEN ──────
Deno.test("authed candidato (no usuarios_rh row → role null) → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ role: null });
  const deps = {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser({ id: "cand-uid", app_metadata: { role: "candidato" } }),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
});

// ── (3) ownership gate — authed rh NOT owning the vaga → 403 (cross-recruiter) ─
Deno.test("authed rh NOT owning the vaga (created_by ≠ uid) → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    role: "recrutador",
    cand: { curriculo_url: CV_PATH, vaga_id: VAGA_ID },
    vaga: { created_by: OTHER_UID }, // a DIFFERENT recruiter owns the vaga
  });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
});

// ── (4) not-found — candidatura curriculo_url NULL → 404 NOT_FOUND ────────────
Deno.test("candidatura with NULL curriculo_url → 404 NOT_FOUND", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    role: "administrador",
    cand: { curriculo_url: null, vaga_id: VAGA_ID },
  });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 404);
  const json = await res.json();
  assertEquals(json.error_code, "NOT_FOUND");
});

// ── (5a) owner rh → 200 { signedUrl } ─────────────────────────────────────────
Deno.test("owner rh (created_by == uid) → 200 with a signedUrl string", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    role: "recrutador",
    cand: { curriculo_url: CV_PATH, vaga_id: VAGA_ID },
    vaga: { created_by: OWNER.id }, // the caller owns the vaga
  });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.ok, true);
  assertEquals(json.signedUrl, SIGNED_URL);
});

// ── (5b) administrador → 200 AND never reads `vagas` (ownership bypass) ────────
Deno.test("administrador bypasses ownership → 200 and does NOT read vagas", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    role: "administrador",
    cand: { curriculo_url: CV_PATH, vaga_id: VAGA_ID },
  });
  const deps = {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser({ id: "admin-uid", app_metadata: { role: "administrador" } }),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.ok, true);
  assert(typeof json.signedUrl === "string" && json.signedUrl.length > 0, "admin gets a signedUrl");
  assertEquals(admin.reads.vagas, 0, "administrador must NOT read vagas (ownership bypass)");
});
