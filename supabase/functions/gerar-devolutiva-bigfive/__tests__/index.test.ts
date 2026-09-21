/**
 * Phase 12 / Plan 12-01 (band-selection + RF-19b + degrade contract) +
 * Phase 18 / Plan 18-02 (RESIL-02 — parallelize the 5 OCEAN dims).
 *
 * Deno regression test for `gerar-devolutiva-bigfive`. Asserts:
 *  - AVAL-08 band selection (cutoffs ≤15/16-35/36-64/65-84/≥85).
 *  - RF-19b refuse for a non-big_five score (Pitfall 6).
 *  - RESIL-02: the 5 dims fan out via `Promise.allSettled` (CONCURRENT — every
 *    dim's `callAi` is invoked before any of them resolves), at EXACTLY 1 attempt
 *    per dim (down from 2), with per-dim graceful-degrade to the deterministic
 *    BAND_TEMPLATES text on failure, and the O-C-E-A-N output order preserved.
 *  - RNF-07a: the degrade path persists templates, never a score/decision write.
 *
 * ── NO real API call (Phase-9/10/11/12 precedent) ────────────────────────────
 * `callAi` (which owns injection/mask/retry/cost/log) is MOCKED via dependency
 * injection (`deps.callAi`) — the EF accepts it so the test never opens a socket.
 *
 * Moved from the function root into `__tests__/` in 18-02 to match the
 * `_shared/__tests__/` convention and the 18-02 plan artifact path (no two
 * competing test files for one handler).
 *
 * Run: deno test --allow-read --allow-env supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts
 *
 * @see docs/conhecimento/big-five/templates-devolutiva.md (25 band templates + cutoffs + L241 N-rename)
 * @see supabase/functions/_shared/ai-client.ts (callAi — never re-implement)
 * @see .planning/phases/18-resili-ncia-das-efs-de-ia-bugs-do-funil/18-02-PLAN.md
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SCORE_ID = "score-1";
const CANDIDATURA_ID = "cand-vaga-1";

// A scores_candidato big_five row (the precondition the EF reads + guards on).
// metadata = the contextual 5-dim shape from 12-CONTEXT.md L57.
function bigfiveScoreRow(percentis: Record<"O" | "C" | "E" | "A" | "N", number>) {
  return {
    id: SCORE_ID,
    candidatura_id: CANDIDATURA_ID,
    tipo: "big_five",
    status: "sucesso",
    metadata: {
      dimensoes: (["O", "C", "E", "A", "N"] as const).map((dim) => ({
        dim,
        raw: 72,
        percentil: percentis[dim],
        banda:
          percentis[dim] <= 15 ? "muito_baixo"
            : percentis[dim] <= 35 ? "mod_baixo"
              : percentis[dim] <= 64 ? "medio"
                : percentis[dim] <= 84 ? "mod_alto"
                  : "muito_alto",
      })),
      facetas: [],
      norm_group: { sexo: "N", faixa: "21-40" },
    },
  };
}

// An SJT score row — the RF-19b guard must refuse to generate a devolutiva for it.
const SJT_SCORE_ROW = { id: "score-sjt", candidatura_id: CANDIDATURA_ID, tipo: "sjt", status: "sucesso", metadata: {} };

// A ~175-word interpretive text (in word-count range 150-200) the mock IA returns.
const TEXT_IN_RANGE = Array.from({ length: 175 }, (_, i) => `palavra${i}`).join(" ");
// A 40-word text (out of range) → with 1 attempt now, the dim graceful-degrades.
const TEXT_TOO_SHORT = Array.from({ length: 40 }, (_, i) => `curto${i}`).join(" ");

// Mock callAi: returns a fixture devolutiva text per call. `behavior` lets a test
// force out-of-range outputs to exercise the degrade path.
function makeMockCallAi(texts: string[]) {
  const calls: unknown[] = [];
  let i = 0;
  return {
    calls,
    fn: (args: unknown) => {
      calls.push(args);
      const texto = texts[Math.min(i, texts.length - 1)];
      i++;
      return Promise.resolve({ parsed: { texto_interpretativo: texto, palavras: texto.split(" ").length } });
    },
  };
}

// candidatos.id — what candidaturas.candidato_id holds (FK candidaturas→candidatos).
const CANDIDATO_ID = "candidato-row-1";
// auth uid (candidatos.user_id) — what devolutivas_candidato.candidato_id MUST hold
// (FK→auth.users + RLS `USING candidato_id = auth.uid()`). Kept DISTINCT from
// CANDIDATO_ID so the test models the real two-id-space indirection the prod FK
// enforces. The old mock collapsed both into one value, hiding the live 23503 (P21-FIX).
const AUTH_UID = "auth-uid-1";

function makeMockSupabaseAdmin(scoreRow: Record<string, unknown> | null) {
  // Capture BOTH inserts and upserts so a test can assert the devolutiva is
  // persisted via the real `.upsert().select("id").single()` chain (CR-04/CR-05).
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  const upserts: { table: string; row: Record<string, unknown> }[] = [];
  return {
    inserts,
    upserts,
    from(table: string) {
      return {
        select: (_cols?: string) => ({
          eq: () => ({
            maybeSingle: () => {
              // CR-02: the handler reads `candidaturas` for the owning
              // candidato_id (NOT NULL on devolutivas_candidato). The mock must
              // mirror the REAL client: the candidaturas lookup returns a
              // candidato_id; the scores_candidato lookup returns the score row.
              if (table === "candidaturas") {
                return Promise.resolve({
                  data: scoreRow ? { candidato_id: CANDIDATO_ID, vaga_id: "vaga-1" } : null,
                  error: null,
                });
              }
              // P21-FIX: the handler resolves the candidate's AUTH uid via
              // candidatos.user_id — devolutivas_candidato.candidato_id FK→auth.users.
              if (table === "candidatos") {
                return Promise.resolve({
                  data: scoreRow ? { user_id: AUTH_UID } : null,
                  error: null,
                });
              }
              return Promise.resolve({ data: scoreRow, error: null });
            },
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          return Promise.resolve({ data: { id: "dev-1" }, error: null });
        },
        // CR-04/CR-05: mirror the real `.upsert(row, { onConflict }).select("id").single()`
        // chain — `.single()` returns the persisted row id (never a fabricated literal).
        upsert: (row: Record<string, unknown>, _opts?: { onConflict?: string }) => {
          upserts.push({ table, row });
          return {
            select: (_cols?: string) => ({
              single: () => Promise.resolve({ data: { id: "dev-1" }, error: null }),
            }),
          };
        },
      };
    },
  };
}

type Pagina = { dim: string; banda: string; percentil: number; texto_interpretativo: string; palavras: number };

async function loadHandler() {
  const mod = await import("../index.ts");
  return mod as {
    handler: (
      args: { score_id: string },
      deps: { supabaseAdmin: unknown; callAi: (a: unknown) => Promise<unknown> },
    ) => Promise<{ devolutiva_id?: string; status: string; paginas?: Pagina[] }>;
    BAND_TEMPLATES: Record<string, Record<string, string>>;
    bandOf: (p: number) => string;
  };
}

// ── Band selection: a percentil maps to the correct 1-of-5 band per dim ───────
Deno.test("AVAL-08 — band selection maps percentis to the cutoffs ≤15/16-35/36-64/65-84/≥85", async () => {
  const { handler } = await loadHandler();
  // O=8 (muito_baixo) C=25 (mod_baixo) E=50 (medio) A=75 (mod_alto) N=92 (muito_alto)
  const row = bigfiveScoreRow({ O: 8, C: 25, E: 50, A: 75, N: 92 });
  const callAi = makeMockCallAi([TEXT_IN_RANGE]);
  const admin = makeMockSupabaseAdmin(row);
  const out = await handler({ score_id: SCORE_ID }, { supabaseAdmin: admin, callAi: callAi.fn });
  const byDim = Object.fromEntries((out.paginas ?? []).map((p) => [p.dim, p.banda]));
  assertEquals(byDim.O, "muito_baixo");
  assertEquals(byDim.C, "mod_baixo");
  assertEquals(byDim.E, "medio");
  assertEquals(byDim.A, "mod_alto");
  assertEquals(byDim.N, "muito_alto");
});

// ── RF-19b guard: refuse for a non-big_five score row (Pitfall 6) ─────────────
Deno.test("RF-19b — refuses to generate a devolutiva for a non-big_five score (Pitfall 6)", async () => {
  const { handler } = await loadHandler();
  const callAi = makeMockCallAi([TEXT_IN_RANGE]);
  const admin = makeMockSupabaseAdmin(SJT_SCORE_ROW);
  const out = await handler({ score_id: "score-sjt" }, { supabaseAdmin: admin, callAi: callAi.fn });
  assertEquals(out.status, "refused", "RF-19b: a devolutiva is ONLY for tipo='big_five'");
  assertEquals(callAi.calls.length, 0, "must not call the IA for a non-big_five score");
  assertEquals(admin.inserts.length, 0, "must not persist a devolutiva for the wrong test");
});

// ── Happy path: in-range text on the single attempt → no retry, persisted ─────
Deno.test("AVAL-08 — in-range text on first attempt → no retry, devolutiva persisted", async () => {
  const { handler } = await loadHandler();
  const row = bigfiveScoreRow({ O: 50, C: 50, E: 50, A: 50, N: 50 });
  const callAi = makeMockCallAi([TEXT_IN_RANGE]);
  const admin = makeMockSupabaseAdmin(row);
  const out = await handler({ score_id: SCORE_ID }, { supabaseAdmin: admin, callAi: callAi.fn });
  assertEquals(callAi.calls.length, 5, "one call per dim, no retry when in range");
  // CR-04: persisted via upsert (idempotent regeneration), not a plain insert.
  const devRow = admin.upserts.find((i) => i.table === "devolutivas_candidato");
  assert(devRow, "must UPSERT one devolutivas_candidato row");
  // CR-02 + P21-FIX: the upserted candidato_id is the candidate's AUTH uid
  // (candidatos.user_id), NOT candidatos.id — devolutivas_candidato.candidato_id
  // FK→auth.users + RLS `auth.uid()`. Persisting candidatos.id violates the FK (23503)
  // and the devolutiva silently never saves (the live Phase-21 defect). Asserting
  // AUTH_UID (≠ CANDIDATO_ID) is the regression guard.
  assertEquals(devRow!.row.candidato_id, AUTH_UID, "upsert must persist the candidate's AUTH uid");
  assert(
    devRow!.row.candidato_id !== CANDIDATO_ID,
    "must NOT persist candidatos.id into the auth.users FK column (the 23503 bug)",
  );
  assert(!("score_id" in devRow!.row), "must NOT write the non-existent score_id column");
  assert(!("tipo" in devRow!.row), "must NOT write the non-existent tipo column");
  assertEquals((out.paginas ?? []).length, 5, "5 dimension pages");
});

// ── RESIL-02 — exactly 1 attempt per dim (down from 2) ───────────────────────
// Under parallel fan-out we make a single AI attempt per dim; an out-of-range
// output graceful-degrades to the template instead of retrying (D-Área1).
Deno.test("RESIL-02 — exactly 1 attempt per dim (no retry; degrade on out-of-range)", async () => {
  const { handler, BAND_TEMPLATES, bandOf } = await loadHandler();
  const row = bigfiveScoreRow({ O: 50, C: 50, E: 50, A: 50, N: 50 });
  // Force EVERY output out of range → with 1 attempt, every dim degrades.
  const callAi = makeMockCallAi([TEXT_TOO_SHORT]);
  const admin = makeMockSupabaseAdmin(row);
  const out = await handler({ score_id: SCORE_ID }, { supabaseAdmin: admin, callAi: callAi.fn });
  // 5 dims × 1 attempt = 5 calls total (was 10 under the old 2-attempt loop).
  assertEquals(callAi.calls.length, 5, "exactly 1 attempt per dim (1 call × 5 dims)");
  assertEquals(out.status, "sucesso", "graceful degrade is still a success");
  assert(out.devolutiva_id, "must still persist a devolutiva (graceful-degrade)");
  // Each dim's text must equal the deterministic template for its band (degrade).
  for (const p of out.paginas ?? []) {
    const banda = bandOf(p.percentil);
    assertEquals(
      p.texto_interpretativo,
      BAND_TEMPLATES[p.dim][banda],
      `dim ${p.dim} must degrade to its deterministic BAND_TEMPLATES text`,
    );
  }
});

// ── RESIL-02 — the 5 dims fan out CONCURRENTLY (Promise.allSettled, not sequential) ─
// Deferred promises: each callAi returns a promise that only resolves AFTER all 5
// have been invoked. A sequential `await` loop would deadlock here (call #2 never
// fires because call #1 never resolves) → the test would hang/fail. allSettled
// fan-out invokes all 5 synchronously before awaiting, so every gate releases.
Deno.test("RESIL-02 — all 5 dims invoked before any resolves (Promise.allSettled parallel)", async () => {
  const { handler } = await loadHandler();
  const row = bigfiveScoreRow({ O: 50, C: 50, E: 50, A: 50, N: 50 });

  let invoked = 0;
  let releaseAll!: () => void;
  const gate = new Promise<void>((res) => { releaseAll = res; });
  const invokeOrder: string[] = [];

  const callAi = (args: unknown) => {
    invoked++;
    invokeOrder.push((args as { dim: string }).dim);
    // Once all 5 have been invoked, release the gate so every call can resolve.
    if (invoked === 5) releaseAll();
    return gate.then(() => ({
      parsed: { texto_interpretativo: TEXT_IN_RANGE, palavras: TEXT_IN_RANGE.split(" ").length },
    }));
  };

  const admin = makeMockSupabaseAdmin(row);
  const out = await handler({ score_id: SCORE_ID }, { supabaseAdmin: admin, callAi });

  assertEquals(invoked, 5, "all 5 dims must be invoked");
  // Concurrency proof: all 5 were invoked (gate released) before any resolved.
  // A sequential loop could never reach invoked===5 (it awaits call #1 forever).
  assertEquals(invokeOrder.length, 5, "all 5 callAi invocations happened before resolution");
  assertEquals((out.paginas ?? []).length, 5, "5 dimension pages returned");
});

// ── RESIL-02 — output paginas preserve O-C-E-A-N order (allSettled keeps input order) ─
Deno.test("RESIL-02 — paginas preserve O-C-E-A-N order even with out-of-order resolution", async () => {
  const { handler } = await loadHandler();
  const row = bigfiveScoreRow({ O: 50, C: 50, E: 50, A: 50, N: 50 });

  // Resolve N first and O last (reverse of input order) to prove the result
  // mapping is by INPUT index, not resolution order.
  const delays: Record<string, number> = { O: 50, C: 40, E: 30, A: 20, N: 10 };
  const callAi = (args: unknown) => {
    const dim = (args as { dim: string }).dim;
    return new Promise((res) =>
      setTimeout(
        () => res({ parsed: { texto_interpretativo: TEXT_IN_RANGE, palavras: TEXT_IN_RANGE.split(" ").length } }),
        delays[dim] ?? 0,
      )
    );
  };

  const admin = makeMockSupabaseAdmin(row);
  const out = await handler({ score_id: SCORE_ID }, { supabaseAdmin: admin, callAi });
  const order = (out.paginas ?? []).map((p) => p.dim);
  assertEquals(order, ["O", "C", "E", "A", "N"], "paginas must stay in O-C-E-A-N input order");
});

// ── RESIL-02 — a single dim's hard failure (callAi rejects) degrades, never hard-fails ─
// Even if `callAi` itself REJECTS for one dim, allSettled isolates it: the dim
// degrades to its template and the other 4 still produce IA text — the EF never
// loses all 5 to one rejection (Anti-Pattern: never Promise.all).
Deno.test("RESIL-02 — one dim's callAi rejection degrades that dim, the other 4 survive", async () => {
  const { handler, BAND_TEMPLATES, bandOf } = await loadHandler();
  const row = bigfiveScoreRow({ O: 50, C: 50, E: 50, A: 50, N: 50 });

  const callAi = (args: unknown) => {
    const dim = (args as { dim: string }).dim;
    if (dim === "E") return Promise.reject(new Error("provider 529 overloaded"));
    return Promise.resolve({
      parsed: { texto_interpretativo: TEXT_IN_RANGE, palavras: TEXT_IN_RANGE.split(" ").length },
    });
  };

  const admin = makeMockSupabaseAdmin(row);
  const out = await handler({ score_id: SCORE_ID }, { supabaseAdmin: admin, callAi });

  assertEquals(out.status, "sucesso", "one dim rejecting must NOT hard-fail the EF (allSettled)");
  assertEquals((out.paginas ?? []).length, 5, "all 5 paginas present despite one dim rejecting");
  const byDim = Object.fromEntries((out.paginas ?? []).map((p) => [p.dim, p]));
  // The rejecting dim (E) degrades to its deterministic template.
  const eBanda = bandOf(byDim.E.percentil);
  assertEquals(
    byDim.E.texto_interpretativo,
    BAND_TEMPLATES.E[eBanda],
    "the rejected dim must degrade to its BAND_TEMPLATES text",
  );
  // The other dims keep their IA text (not degraded).
  assertEquals(byDim.O.texto_interpretativo, TEXT_IN_RANGE, "non-failing dims keep their IA text");
  // RNF-07a: degrade persists a devolutiva (templates), never a score/decision.
  assert(out.devolutiva_id, "degrade path still persists a (template) devolutiva — no decisional write");
});

// ── SEC-04 (T-24-05-01): Bearer self-auth — the devolutiva IDOR is closed ─────
// The EF is server-to-server only (submit-bigfive-final, service_role). Before this
// guard it had ZERO caller authz — any JWT could read another candidate's devolutiva.
// `guardDevolutivaBearer` returns a 401 Response on absent/wrong Bearer, or `null`
// (proceed) on an exact-match secret. We assert the guard directly (no Deno.serve).
async function loadBearerGuard() {
  const mod = await import("../index.ts");
  return (mod as {
    guardDevolutivaBearer: (req: Request, expectedSecret: string) => Response | null;
  }).guardDevolutivaBearer;
}

const DEVOLUTIVA_SECRET = "service-role-secret-xyz";

function reqWithAuth(auth?: string): Request {
  const headers: Record<string, string> = {};
  if (auth !== undefined) headers["Authorization"] = auth;
  return new Request("http://localhost/functions/v1/gerar-devolutiva-bigfive", {
    method: "POST",
    headers,
    body: JSON.stringify({ score_id: SCORE_ID }),
  });
}

Deno.test("SEC-04 — no Bearer header → 401 (IDOR closed)", async () => {
  const guard = await loadBearerGuard();
  const res = guard(reqWithAuth(undefined), DEVOLUTIVA_SECRET);
  assert(res, "an absent Bearer must be rejected with a Response");
  assertEquals(res!.status, 401, "no Bearer → 401");
});

Deno.test("SEC-04 — wrong Bearer → 401 (IDOR closed)", async () => {
  const guard = await loadBearerGuard();
  const res = guard(reqWithAuth("Bearer not-the-secret"), DEVOLUTIVA_SECRET);
  assert(res, "a mismatched Bearer must be rejected with a Response");
  assertEquals(res!.status, 401, "wrong Bearer → 401");
});

Deno.test("SEC-04 — correct service Bearer → null (handler proceeds, 200 path)", async () => {
  const guard = await loadBearerGuard();
  const res = guard(reqWithAuth(`Bearer ${DEVOLUTIVA_SECRET}`), DEVOLUTIVA_SECRET);
  assertEquals(res, null, "an exact-match Bearer must NOT be rejected — the handler proceeds");
});

Deno.test("SEC-04 — a raw token without the 'Bearer ' scheme prefix → 401", async () => {
  const guard = await loadBearerGuard();
  // Only the `Bearer <secret>` shape is accepted; a bare secret is rejected.
  const res = guard(reqWithAuth(DEVOLUTIVA_SECRET), DEVOLUTIVA_SECRET);
  assert(res, "a token missing the 'Bearer ' scheme must be rejected");
  assertEquals(res!.status, 401, "no scheme → 401");
});

// ── UX-07: o prompt do LLM é banda-only — o percentil cru NUNCA é injetado ────
Deno.test("UX-07 — buildDevolutivaUserBlock emite banda qualitativa, nunca o percentil cru", async () => {
  const mod = await import("../index.ts");
  const build = (mod as {
    buildDevolutivaUserBlock: (a: { dim_label: string; banda: string; rawInput: string }) => string;
  }).buildDevolutivaUserBlock;

  const block = build({
    dim_label: "Abertura",
    banda: "muito_alto",
    rawInput: "Texto oficial neutro, sem qualquer número.",
  });

  // (a) a banda qualitativa neutra (label pt-BR) ESTÁ presente
  assert(block.includes("Muito alto"), "deve conter a label neutra da banda ('Muito alto')");
  // (b) o cabeçalho de percentil FOI removido
  assert(!/PERCENTIL/i.test(block), "não pode conter o cabeçalho '## PERCENTIL' (UX-07)");
  // (c) nenhum dígito de percentil vaza para o texto do prompt (guard forte)
  assert(!/\d/.test(block), "nenhum dígito de percentil pode entrar no prompt do LLM (UX-07)");
});
