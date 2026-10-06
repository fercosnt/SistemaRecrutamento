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
 *   (3) authed ACTIVE rh on a vaga authored by someone else → 200 { signedUrl }, 0 `vagas`
 *       reads. Until Phase 50 this was a 403 (cross-recruiter deny); Phase 50 / D-01 removed
 *       vaga authorship as authorization — the live active usuarios_rh row is the only gate.
 *   (4) candidatura missing / curriculo_url NULL         → 404 NOT_FOUND
 *   (5a) rh on a vaga they authored                      → 200 { signedUrl }
 *   (5b) administrador                                   → 200 { signedUrl } AND never reads `vagas`
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

// ── WR-05 (50-REVIEW-ACESSO-1) ─────────────────────────────────────────────────
// Since Phase 50 / D-01 the ONLY authorization of this EF is the caller's LIVE usuarios_rh
// row (`.eq("user_id", user.id).eq("ativo", true).is("deleted_at", null)`). A mock that
// returns the same row whatever filter the EF chains would keep every test green with any
// of those predicates deleted. This query APPLIES the `.eq`/`.is`/`.in` predicates it
// receives to in-memory rows, so a deleted filter changes what the EF reads.
// deno-lint-ignore no-explicit-any
function consultaQueFiltra(linhas: Array<Record<string, unknown>>): any {
  const preds: Array<(r: Record<string, unknown>) => boolean> = [];
  const filtradas = () => linhas.filter((r) => preds.every((p) => p(r)));
  // deno-lint-ignore no-explicit-any
  const q: any = {
    select: () => q,
    eq: (c: string, v: unknown) => {
      preds.push((r) => r[c] === v);
      return q;
    },
    is: (c: string, v: unknown) => {
      preds.push((r) => (r[c] ?? null) === v);
      return q;
    },
    in: (c: string, vs: unknown[]) => {
      preds.push((r) => vs.includes(r[c]));
      return q;
    },
    maybeSingle: () => {
      const a = filtradas();
      return Promise.resolve(
        a.length > 1
          ? { data: null, error: { code: "PGRST116", message: "mais de uma linha" } }
          : { data: a[0] ?? null, error: null },
      );
    },
    // deno-lint-ignore no-explicit-any
    then: (ok: (v: any) => unknown, ko?: (e: unknown) => unknown) =>
      Promise.resolve({ data: filtradas(), error: null }).then(ok, ko),
  };
  return q;
}

/** A usuarios_rh row; live (`ativo`, not deleted) unless `extra` says otherwise. */
function linhaRh(user_id: string, role: string, extra: Record<string, unknown> = {}) {
  return { user_id, role, ativo: true, deleted_at: null, ...extra };
}

const ADMIN_UID = "admin-uid";
const CAND_UID = "cand-uid";
/** Every caller these tests authenticate as; `role` (below) gives each of them a live row. */
const CALLERS = [OWNER.id, ADMIN_UID, CAND_UID];

interface AdminOpts {
  /** usuarios_rh.role of a LIVE row for every caller; `null` = no RH row (a candidato) → 403. */
  role?: string | null;
  /** Explicit usuarios_rh rows (overrides `role`) — the WR-05 cases (inactive, deleted, other user). */
  rhRows?: Array<Record<string, unknown>>;
  /** candidaturas row {curriculo_url, vaga_id, [deleted_at, is_rascunho]}; `null` = no row (404).
   *  WR-06: the row is LIVE (`deleted_at` null, `is_rascunho` false) unless the test says otherwise,
   *  and the query APPLIES the EF's filters — a dead/draft row is only hidden if the EF filters it. */
  cand?: { curriculo_url: string | null; vaga_id: string; deleted_at?: string | null; is_rascunho?: boolean } | null;
  /** vagas row projection {created_by}; inert since Phase 50 / D-01 (the EF no longer reads vagas). */
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
  const rhRows = opts.rhRows ?? (role === null ? [] : CALLERS.map((id) => linhaRh(id, role)));
  const reads = { usuariosRh: 0, candidaturas: 0, vagas: 0 };
  return {
    reads,
    from(table: string) {
      if (table === "usuarios_rh") {
        reads.usuariosRh++;
        return consultaQueFiltra(rhRows);
      }
      if (table === "candidaturas") {
        reads.candidaturas++;
        return consultaQueFiltra(
          cand === null ? [] : [{ id: CANDIDATURA_ID, deleted_at: null, is_rascunho: false, ...cand }],
        );
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
    supabaseUser: makeMockSupabaseUser({ id: CAND_UID, app_metadata: { role: "candidato" } }),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
});

// ── (3) Phase 50 / D-01 — active rh on a vaga authored by someone else → 200 ───
// Until Phase 50 this asserted 403 (cross-recruiter deny). Vaga authorship is no longer
// authorization: every ACTIVE rh reads any CV, as the administrador does. The negative that
// stays is (2): no live active usuarios_rh row → 403.
Deno.test("authed active rh on a vaga authored by someone else → 200 with signedUrl, 0 vagas reads", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    role: "recrutador",
    cand: { curriculo_url: CV_PATH, vaga_id: VAGA_ID },
    vaga: { created_by: OTHER_UID }, // a DIFFERENT recruiter authored the vaga
  });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.ok, true);
  assertEquals(json.signedUrl, SIGNED_URL);
  assertEquals(admin.reads.vagas, 0, "active rh must NOT read vagas (no ownership lookup)");
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
    supabaseUser: makeMockSupabaseUser({ id: ADMIN_UID, app_metadata: { role: "administrador" } }),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.ok, true);
  assert(typeof json.signedUrl === "string" && json.signedUrl.length > 0, "admin gets a signedUrl");
  assertEquals(admin.reads.vagas, 0, "administrador must NOT read vagas (ownership bypass)");
});

// ── WR-05 (50-REVIEW-ACESSO-1) — the live-row filter IS the authorization ─────────
// Each negative differs from the positive control in ONE attribute of the caller's
// usuarios_rh row. With the matching predicate deleted from the EF, that negative goes 200.
async function comLinhas(rows: Array<Record<string, unknown>>) {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ rhRows: rows });
  const res = await handler(makeRequest(VALID_BODY), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OWNER),
  });
  return { res, admin };
}

Deno.test("WR-05 controle — linha usuarios_rh VIVA do chamador → 200", async () => {
  const { res } = await comLinhas([linhaRh(OWNER.id, "recrutador")]);
  assertEquals(res.status, 200);
});

Deno.test("WR-05 — linha do chamador INATIVA (ativo=false) → 403, nenhuma candidatura lida", async () => {
  const { res, admin } = await comLinhas([linhaRh(OWNER.id, "recrutador", { ativo: false })]);
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error_code, "FORBIDDEN");
  assertEquals(admin.reads.candidaturas, 0);
});

Deno.test("WR-05 — linha do chamador EXCLUÍDA (deleted_at) → 403, nenhuma candidatura lida", async () => {
  const { res, admin } = await comLinhas([
    linhaRh(OWNER.id, "recrutador", { deleted_at: "2026-10-01T00:00:00Z" }),
  ]);
  assertEquals(res.status, 403);
  assertEquals(admin.reads.candidaturas, 0);
});

Deno.test("WR-05 — só a linha viva de OUTRO usuário → 403 (o filtro user_id)", async () => {
  const { res, admin } = await comLinhas([linhaRh(OTHER_UID, "administrador")]);
  assertEquals(res.status, 403);
  assertEquals(admin.reads.candidaturas, 0);
});

// ── WR-06 (50-REVIEW-ACESSO-1) — só candidatura VIVA, o predicado do ramo rh da RLS ──
// `deleted_at IS NULL AND is_rascunho = false` (rh_le_candidaturas). Morta e rascunho recebem o
// MESMO 404 da candidatura ausente — e nenhuma URL é assinada.
async function comCand(cand: AdminOpts["cand"], role = "recrutador") {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ role, cand });
  const res = await handler(makeRequest(VALID_BODY), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OWNER),
  });
  return { res, admin };
}

Deno.test("WR-06 controle — candidatura VIVA → 200", async () => {
  const { res } = await comCand({ curriculo_url: CV_PATH, vaga_id: VAGA_ID, deleted_at: null, is_rascunho: false });
  assertEquals(res.status, 200);
});

Deno.test("WR-06 — candidatura RASCUNHO → 404 (o mesmo da ausente), sem URL", async () => {
  const { res } = await comCand({ curriculo_url: CV_PATH, vaga_id: VAGA_ID, is_rascunho: true });
  assertEquals(res.status, 404);
  const json = await res.json();
  assertEquals(json.error_code, "NOT_FOUND");
  assertEquals(json.signedUrl, undefined);
});

Deno.test("WR-06 — candidatura EXCLUÍDA (deleted_at) → 404, sem URL", async () => {
  const { res } = await comCand({ curriculo_url: CV_PATH, vaga_id: VAGA_ID, deleted_at: "2026-10-01T00:00:00Z" });
  assertEquals(res.status, 404);
  assertEquals((await res.json()).signedUrl, undefined);
});

Deno.test("WR-06 — administrador e candidatura RASCUNHO → 404 também", async () => {
  const { res } = await comCand({ curriculo_url: CV_PATH, vaga_id: VAGA_ID, is_rascunho: true }, "administrador");
  assertEquals(res.status, 404);
});
