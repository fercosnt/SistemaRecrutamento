/**
 * Phase 12 / Plan 12-01 Task 1 — Wave 0 RED scaffold for the Edge Function
 * `gerar-devolutiva-bigfive` (AVAL-08 / RF-19a/b — D-lite devolutiva).
 *
 * Invoked inline by `submit-bigfive-final` after the score row lands. For each of
 * the 5 OCEAN dims it deterministically picks 1 of 25 official band templates
 * (≤15/16-35/36-64/65-84/≥85 cutoffs), then asks the IA to ONLY personalize
 * (name/cargo/percentil) — never invent (RESEARCH Pattern 3). Output Zod-validated
 * to ~150-200 words/dim; 1 retry on word-count miss; graceful-degrade to the raw
 * template. Persists `devolutivas_candidato`.
 *
 * Two hard guards:
 *  - RF-19b (Pitfall 6): refuse if the precondition score row tipo !== 'big_five'.
 *  - LGPD-04: never clinical language ("Sensibilidade Emocional", not "Neuroticismo").
 *
 * ── NO real API call (Phase-9/10/11 precedent) ───────────────────────────────
 * `callAi` (which owns injection/mask/retry/cost/log) is MOCKADO via dependency
 * injection (`deps.callAi`) — the EF must accept it so the test never opens a socket.
 *
 * ── Why this is RED now ──
 * `./index.ts` does not exist yet → the dynamic import throws module-not-found.
 * That IS the calibrated RED assertion. Flips GREEN in Plan 12-04.
 *
 * Run: deno test --allow-read supabase/functions/gerar-devolutiva-bigfive/
 *
 * @see docs/conhecimento/big-five/templates-devolutiva.md (25 band templates + cutoffs + L241 N-rename)
 * @see supabase/functions/_shared/ai-client.ts (callAi — never re-implement)
 * @see .planning/phases/12-big-five-devolutiva/12-RESEARCH.md Pattern 3 + Pitfall 5/6
 * @see .planning/phases/12-big-five-devolutiva/12-01-PLAN.md Task 1
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
// A 40-word text (out of range) → must trigger the 1 retry then graceful-degrade.
const TEXT_TOO_SHORT = Array.from({ length: 40 }, (_, i) => `curto${i}`).join(" ");

// Mock callAi: returns a fixture devolutiva text per call. `behavior` lets a test
// force consecutive out-of-range outputs to exercise the retry → degrade path.
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

const CANDIDATO_ID = "auth-user-1";

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
              // CR-02: the handler now reads `candidaturas` for the owning
              // candidato_id (NOT NULL on devolutivas_candidato). The mock must
              // mirror the REAL client: the candidaturas lookup returns a
              // candidato_id; the scores_candidato lookup returns the score row.
              if (table === "candidaturas") {
                return Promise.resolve({
                  data: scoreRow ? { candidato_id: CANDIDATO_ID, vaga_id: "vaga-1" } : null,
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

async function loadHandler() {
  const mod = await import("./index.ts");
  return mod as {
    handler: (
      args: { score_id: string },
      deps: { supabaseAdmin: unknown; callAi: (a: unknown) => Promise<unknown> },
    ) => Promise<{ devolutiva_id?: string; status: string; paginas?: { dim: string; banda: string; palavras: number }[] }>;
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

// ── Word-count out of range → 1 retry, then graceful-degrade to raw template ──
Deno.test("AVAL-08 — word-count out of range triggers exactly 1 retry then graceful-degrades", async () => {
  const { handler } = await loadHandler();
  const row = bigfiveScoreRow({ O: 50, C: 50, E: 50, A: 50, N: 50 });
  // Force BOTH attempts out of range → after 1 retry, the EF degrades to the raw template.
  const callAi = makeMockCallAi([TEXT_TOO_SHORT, TEXT_TOO_SHORT]);
  const admin = makeMockSupabaseAdmin(row);
  const out = await handler({ score_id: SCORE_ID }, { supabaseAdmin: admin, callAi: callAi.fn });
  // 5 dims, each retried once on the out-of-range miss → 2 calls per dim = 10 total.
  assertEquals(callAi.calls.length, 10, "exactly 1 retry per dim (2 attempts × 5 dims)");
  assert(out.devolutiva_id, "must still persist a devolutiva (graceful-degrade to the raw template)");
  assertEquals(out.status, "sucesso", "graceful degrade is still a success");
});

// ── Happy path: in-range text on the first attempt → no retry, persisted ──────
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
  // CR-02: the upserted row carries candidato_id (NOT NULL + own-row RLS) and
  // omits the non-existent score_id/tipo columns.
  assertEquals(devRow!.row.candidato_id, CANDIDATO_ID, "upsert must include candidato_id");
  assert(!("score_id" in devRow!.row), "must NOT write the non-existent score_id column");
  assert(!("tipo" in devRow!.row), "must NOT write the non-existent tipo column");
  assertEquals((out.paginas ?? []).length, 5, "5 dimension pages");
});
