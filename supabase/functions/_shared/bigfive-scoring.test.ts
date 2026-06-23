/**
 * Phase 12 / Plan 12-01 Task 1 — Wave 0 RED scaffold for `_shared/bigfive-scoring.ts`.
 *
 * Gates AVAL-04 / RF-15 (IPIP-NEO-120 TS-port server-side scoring). This is the
 * single highest-blast-radius file of the phase: one mis-typed reverse-keyed id
 * silently corrupts a facet raw → the domain T-score → the percentile → the band →
 * the devolutiva band template, with NO error thrown (RESEARCH Pitfall 1, the #1
 * scoring-bug source). So we pin the reverse-key contract as executable assertions
 * BEFORE the scorer exists (smoke-runtime gate, Phase-4 lesson D-25..D-28).
 *
 * ── Why this is RED now ──
 * `./bigfive-scoring.ts` does not exist yet → the dynamic import throws
 * module-not-found at run time. That IS the calibrated RED assertion. It flips
 * GREEN in Plan 12-02 when the scorer (REVERSED set + FACET_TO_DOMAIN + facetOf +
 * the transcribed Johnson norm table + score()) lands. The tests COMPILE under
 * Deno strict; they FAIL at runtime — the failure is the assertion.
 *
 * Run: deno test --allow-read supabase/functions/_shared/bigfive-scoring.test.ts
 *
 * ── Contract the implementer (12-02) MUST satisfy ──
 *  - export `REVERSED: Set<number>`             — exactly the 55 ids below
 *  - export `FACET_TO_DOMAIN: Record<number, 'O'|'C'|'E'|'A'|'N'>`  (30 facets)
 *  - export `facetOf(id: number): number`       — ((id-1) % 30) + 1
 *  - export `reverse(v: number): number`        — 6 - v
 *  - export `score(respostas: Record<number,number>, normGroup): ScoreResult`
 *      → { dimensoes: {dim,raw,percentil,banda}[5], facetas: {faceta,raw}[30], norm_group }
 *      raw per facet 4-20; raw per domain 24-120; percentil clamp(1,99);
 *      banda ∈ muito_baixo|mod_baixo|medio|mod_alto|muito_alto by the
 *      ≤15 / 16-35 / 36-64 / 65-84 / ≥85 cutoffs.
 *
 * @see docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md L285-294 (reverse table) + L329-361 (Python reference) + L416-429 (norms)
 * @see .planning/phases/12-big-five-devolutiva/12-RESEARCH.md Pattern Map §Scoring + Pitfall 1
 * @see .planning/phases/12-big-five-devolutiva/12-01-PLAN.md Task 1
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ─── The reverse-key answer-key, transcribed VERBATIM from PESQUISA md L289-294 /
//     L329-340. These literals are the CONTRACT — the scorer's exported set must
//     equal this exactly. Per-domain counts: N7 E6 O12 A17 C13 = 55.
const REVERSED_N = [51, 81, 96, 101, 106, 111, 116]; // 7
const REVERSED_E = [62, 67, 92, 97, 102, 107]; // 6
const REVERSED_O = [48, 53, 68, 73, 78, 83, 88, 98, 103, 108, 113, 118]; // 12
const REVERSED_A = [9, 19, 24, 39, 49, 54, 69, 74, 79, 84, 89, 94, 99, 104, 109, 114, 119]; // 17
const REVERSED_C = [30, 40, 60, 70, 75, 80, 85, 90, 100, 105, 110, 115, 120]; // 13
const EXPECTED_REVERSED = [
  ...REVERSED_N,
  ...REVERSED_E,
  ...REVERSED_O,
  ...REVERSED_A,
  ...REVERSED_C,
];

// FACET_TO_DOMAIN per PESQUISA L342-348: facets cycle N,E,O,A,C across 1..30.
const EXPECTED_FACET_TO_DOMAIN: Record<number, "O" | "C" | "E" | "A" | "N"> = {
  1: "N", 6: "N", 11: "N", 16: "N", 21: "N", 26: "N",
  2: "E", 7: "E", 12: "E", 17: "E", 22: "E", 27: "E",
  3: "O", 8: "O", 13: "O", 18: "O", 23: "O", 28: "O",
  4: "A", 9: "A", 14: "A", 19: "A", 24: "A", 29: "A",
  5: "C", 10: "C", 15: "C", 20: "C", 25: "C", 30: "C",
};

// RED until Plan 12-02: the module does not exist yet.
type ScoreFn = (
  respostas: Record<number, number>,
  normGroup: { sexo: "M" | "F" | "N"; faixa: string },
) => {
  dimensoes: { dim: "O" | "C" | "E" | "A" | "N"; raw: number; percentil: number; banda: string }[];
  facetas: { faceta: number; raw: number }[];
  norm_group: { sexo: string; faixa: string };
};

async function loadScorer() {
  const mod = await import("./bigfive-scoring.ts");
  return {
    REVERSED: mod.REVERSED as Set<number>,
    FACET_TO_DOMAIN: mod.FACET_TO_DOMAIN as Record<number, "O" | "C" | "E" | "A" | "N">,
    facetOf: mod.facetOf as (id: number) => number,
    reverse: mod.reverse as (v: number) => number,
    score: mod.score as ScoreFn,
  };
}

// A fixed, fully-neutral 120-response vector (every item answered 3). After reverse
// (6-3 = 3), EVERY corrected response is still 3 → every facet raw = 4×3 = 12 →
// every domain raw = 6×12 = 72. This is norm-independent and deterministic, so it
// pins the reverse + facet + domain summation math exactly (Pitfall 1 detection).
const NEUTRAL_VECTOR: Record<number, number> = {};
for (let id = 1; id <= 120; id++) NEUTRAL_VECTOR[id] = 3;

// ───────────────────────────── reverse-key contract ─────────────────────────

Deno.test("AVAL-04 — REVERSED set has exactly 55 ids (Pitfall 1)", async () => {
  const { REVERSED } = await loadScorer();
  assertEquals(REVERSED.size, 55, "the reverse-keyed answer-key must hold exactly 55 ids");
});

Deno.test("AVAL-04 — per-domain reverse counts are N7 E6 O12 A17 C13 (D-12-AVAL-04)", async () => {
  const { REVERSED, FACET_TO_DOMAIN, facetOf } = await loadScorer();
  const counts: Record<string, number> = { N: 0, E: 0, O: 0, A: 0, C: 0 };
  for (const id of REVERSED) counts[FACET_TO_DOMAIN[facetOf(id)]]++;
  assertEquals(counts.N, 7, "N reverse count");
  assertEquals(counts.E, 6, "E reverse count");
  assertEquals(counts.O, 12, "O reverse count");
  assertEquals(counts.A, 17, "A reverse count");
  assertEquals(counts.C, 13, "C reverse count");
});

Deno.test("AVAL-04 — REVERSED equals the verbatim PESQUISA id list (no transcription drift)", async () => {
  const { REVERSED } = await loadScorer();
  for (const id of EXPECTED_REVERSED) {
    assert(REVERSED.has(id), `reverse-keyed id ${id} (PESQUISA L289-294) is missing from REVERSED`);
  }
  // and no extra ids crept in
  for (const id of REVERSED) {
    assert(EXPECTED_REVERSED.includes(id), `unexpected id ${id} in REVERSED — not in the PESQUISA list`);
  }
});

Deno.test("AVAL-04 — facetOf(id) === ((id-1)%30)+1 spot checks (PESQUISA L353)", async () => {
  const { facetOf } = await loadScorer();
  assertEquals(facetOf(1), 1);
  assertEquals(facetOf(30), 30);
  assertEquals(facetOf(31), 1); // wraps
  assertEquals(facetOf(120), 30);
  assertEquals(facetOf(51), 21); // an N reverse item → facet 21 → domain N
});

Deno.test("AVAL-04 — FACET_TO_DOMAIN matches the PESQUISA L342-348 cycle", async () => {
  const { FACET_TO_DOMAIN } = await loadScorer();
  for (const [f, dom] of Object.entries(EXPECTED_FACET_TO_DOMAIN)) {
    assertEquals(FACET_TO_DOMAIN[Number(f)], dom, `facet ${f} → domain`);
  }
});

// ───────────────────────────── golden vector ────────────────────────────────

Deno.test("AVAL-04 GOLDEN — neutral vector yields raw 72 for every domain + 12 for every facet", async () => {
  const { score } = await loadScorer();
  const out = score(NEUTRAL_VECTOR, { sexo: "N", faixa: "21-40" });
  // 5 domains, each raw = 72 (6 facets × (4 items × corrected-3)). norm-independent.
  assertEquals(out.dimensoes.length, 5, "exactly 5 OCEAN domains");
  for (const d of out.dimensoes) {
    assertEquals(d.raw, 72, `domain ${d.dim} raw (neutral vector → 72)`);
  }
  // 30 facets, each raw = 12.
  assertEquals(out.facetas.length, 30, "exactly 30 facets");
  for (const f of out.facetas) {
    assertEquals(f.raw, 12, `facet ${f.faceta} raw (neutral vector → 12)`);
  }
  assertEquals(out.norm_group.sexo, "N", "norm_group echoed for auditability");
});

Deno.test("AVAL-04 GOLDEN — every percentile is clamped to [1,99] and every band is one of the 5 (cutoffs ≤15/16-35/36-64/65-84/≥85)", async () => {
  const { score } = await loadScorer();
  const out = score(NEUTRAL_VECTOR, { sexo: "N", faixa: "21-40" });
  const VALID_BANDS = new Set(["muito_baixo", "mod_baixo", "medio", "mod_alto", "muito_alto"]);
  for (const d of out.dimensoes) {
    assert(d.percentil >= 1 && d.percentil <= 99, `percentil ${d.percentil} out of [1,99] for ${d.dim}`);
    assert(VALID_BANDS.has(d.banda), `band "${d.banda}" not one of the 5 for ${d.dim}`);
    // the band must agree with the percentile cutoffs — the contract the EF/devolutiva relies on
    const p = d.percentil;
    const expectedBand =
      p <= 15 ? "muito_baixo"
        : p <= 35 ? "mod_baixo"
          : p <= 64 ? "medio"
            : p <= 84 ? "mod_alto"
              : "muito_alto";
    assertEquals(d.banda, expectedBand, `band must follow the percentile cutoff for ${d.dim} (p=${p})`);
  }
});

// ───────────────────────────── coverage guard (WR-03) ───────────────────────

Deno.test("WR-03 — score() THROWS on a partial (<120) responses map (Pitfall 1, no silent zero score)", async () => {
  const { score } = await loadScorer();
  const partial: Record<number, number> = { ...NEUTRAL_VECTOR };
  delete partial[120]; // 119 answers
  let threw = false;
  try {
    score(partial, { sexo: "N", faixa: "21-40" });
  } catch {
    threw = true;
  }
  assert(threw, "a partial map must throw, never return a structurally-valid all-zero score");
});

Deno.test("WR-03 — score() THROWS on an empty responses map", async () => {
  const { score } = await loadScorer();
  let threw = false;
  try {
    score({}, { sexo: "N", faixa: "21-40" });
  } catch {
    threw = true;
  }
  assert(threw, "an empty map must throw (RESEARCH Pitfall 1)");
});

Deno.test("WR-03 — score() THROWS when an item id falls outside 1..120", async () => {
  const { score } = await loadScorer();
  const outOfRange: Record<number, number> = { ...NEUTRAL_VECTOR };
  delete outOfRange[1];
  outOfRange[121] = 3; // still 120 keys, but id 121 is invalid
  let threw = false;
  try {
    score(outOfRange, { sexo: "N", faixa: "21-40" });
  } catch {
    threw = true;
  }
  assert(threw, "an id outside 1..120 must throw even when the key count is 120");
});

Deno.test("AVAL-04 GOLDEN — a hand-built variant moves a single domain raw correctly (reverse math is wired)", async () => {
  const { score, facetOf, FACET_TO_DOMAIN } = await loadScorer();
  // Push every Conscienciosidade item to a 5 raw-answer. C reverse items (13 of 24)
  // flip 5→1; non-reverse C items stay 5. So C domain raw = (24-13 items × 5) + (13 × 1)
  //   = 55 + 13 = 68. Every other domain stays neutral (72). This asserts the reverse
  // correction is actually applied per-item (the Pitfall-1 failure mode).
  const variant: Record<number, number> = { ...NEUTRAL_VECTOR };
  for (let id = 1; id <= 120; id++) {
    if (FACET_TO_DOMAIN[facetOf(id)] === "C") variant[id] = 5;
  }
  const out = score(variant, { sexo: "N", faixa: "21-40" });
  const byDim = Object.fromEntries(out.dimensoes.map((d) => [d.dim, d.raw]));
  assertEquals(byDim.C, 68, "C raw with 13 reverse items flipped 5→1 + 11 non-reverse at 5 = 55+13");
  assertEquals(byDim.O, 72, "O domain untouched by the C-only variant");
  assertEquals(byDim.N, 72, "N domain untouched by the C-only variant");
});
