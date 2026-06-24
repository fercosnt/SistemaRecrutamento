/**
 * Phase 14 / Plan 14-01 Task 2 — Wave 0 golden test for `_shared/cognitivo/scoring.ts`.
 *
 * Gates ENTREV-05 (raciocínio lógico CTT-soma server-side scorer). The cognitive
 * scorer is the deterministic, no-LLM, anti-tamper module: the candidate posts ONLY
 * raw picks, the server re-scores from `rawResponses` + the server-only `gabarito`
 * (the candidate NEVER receives the key). One mis-mapped item silently corrupts a
 * section raw → the total → the banda → the RH band card, with NO error thrown. So
 * we pin the CTT-soma + 5-faixa banding contract as executable assertions BEFORE the
 * scorer exists (smoke-runtime gate, Phase-4 lesson D-25..D-28).
 *
 * ── Why this is RED now ──
 * `./scoring.ts` does not exist yet → the dynamic import throws module-not-found at
 * run time. That IS the calibrated RED assertion. It flips GREEN once `scoreRaciocinio`
 * (CTT soma 0/1 per item, per-section sum, 5-faixa banding) lands. The tests COMPILE
 * under Deno strict; they FAIL at runtime — the failure is the assertion.
 *
 * Run: deno test supabase/functions/_shared/cognitivo/scoring.test.ts
 *
 * ── Definition of "bom teste" (PRD-cognitivo §11 L231) ──
 * Validate EXTERNAL behavior (input `rawResponses` → output `banda`/`flags`), NOT
 * the internal soma loop. 10 synthetic profiles (known raw answers → expected banda).
 *
 * @see supabase/functions/_shared/cognitivo/scoring.ts (the scorer this satisfies)
 * @see docs/prds/m2-funil-rh/PRD-cognitivo-raciocinio.md §8.2 L157-191 (CTT soma + 5-faixa banda)
 * @see supabase/functions/_shared/bigfive-scoring.test.ts (the golden-test idiom this clones)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// 20-item bank: items 1-12 are matriz, items 13-20 are letra_numero (PRD §8.2:
// ~18 matriz + ~10 letra-número in PROD; the test uses a 12+8 = 20-item fixture).
const MATRIZ_IDS = Array.from({ length: 12 }, (_, i) => `item_${String(i + 1).padStart(2, "0")}`);
const LETRA_NUMERO_IDS = Array.from({ length: 8 }, (_, i) => `item_${String(i + 13).padStart(2, "0")}`);

// The server-only gabarito: itemId → correct optionIndex. The candidate NEVER sees this.
const GABARITO: Record<string, number> = {};
for (const id of [...MATRIZ_IDS, ...LETRA_NUMERO_IDS]) GABARITO[id] = 2; // correct pick is index 2 for all

const N_TOTAL = 20;

// Build a rawResponses map where exactly `nCorrect` items (the first nCorrect ids)
// match the gabarito; the rest pick a wrong index (0).
function profileWithCorrect(nCorrect: number): Record<string, number> {
  const ids = [...MATRIZ_IDS, ...LETRA_NUMERO_IDS];
  const out: Record<string, number> = {};
  ids.forEach((id, idx) => {
    out[id] = idx < nCorrect ? GABARITO[id] : 0;
  });
  return out;
}

type ScoreFn = (
  rawResponses: Record<string, number>,
  gabarito: Record<string, number>,
) => {
  total: number;
  secoes: {
    matriz: { raw: number; n_itens: number };
    letra_numero: { raw: number; n_itens: number };
  };
  banda: string;
  flags: string[];
};

async function loadScorer() {
  const mod = await import("./scoring.ts");
  return {
    scoreRaciocinio: mod.scoreRaciocinio as ScoreFn,
    bandaFromTotal: mod.bandaFromTotal as ((total: number, nTotal: number) => string) | undefined,
  };
}

// ── 10 synthetic profiles: raw nCorrect → expected banda. Provisional wide quintile
//    cutoffs over the proportion correct (pct = total / nTotal), PRD §8.2 norm_ref
//    'provisoria_item_difficulty_sapa': ≤20% bem_abaixo / ≤40% abaixo / ≤60% na_media
//    / ≤80% acima / >80% bem_acima. The 5 bands map to the snake_case pt-BR enum.
const VALID_BANDS = new Set(["bem_abaixo", "abaixo", "na_media", "acima", "bem_acima"]);

const GOLDEN: { nCorrect: number; banda: string }[] = [
  { nCorrect: 0, banda: "bem_abaixo" }, // 0%
  { nCorrect: 2, banda: "bem_abaixo" }, // 10%
  { nCorrect: 4, banda: "bem_abaixo" }, // 20% (boundary ≤20 → bem_abaixo)
  { nCorrect: 6, banda: "abaixo" }, // 30%
  { nCorrect: 8, banda: "abaixo" }, // 40% (boundary ≤40 → abaixo)
  { nCorrect: 10, banda: "na_media" }, // 50%
  { nCorrect: 12, banda: "na_media" }, // 60% (boundary ≤60 → na_media)
  { nCorrect: 14, banda: "acima" }, // 70%
  { nCorrect: 16, banda: "acima" }, // 80% (boundary ≤80 → acima)
  { nCorrect: 20, banda: "bem_acima" }, // 100%
];

// ───────────────────────────── golden battery ───────────────────────────────

Deno.test("ENTREV-05 GOLDEN — 10 synthetic profiles map to the expected banda (CTT soma)", async () => {
  const { scoreRaciocinio } = await loadScorer();
  for (const { nCorrect, banda } of GOLDEN) {
    const out = scoreRaciocinio(profileWithCorrect(nCorrect), GABARITO);
    assertEquals(out.total, nCorrect, `total raw for ${nCorrect} correct`);
    assertEquals(out.banda, banda, `banda for ${nCorrect}/${N_TOTAL} correct (pct=${(nCorrect / N_TOTAL) * 100}%)`);
    assert(VALID_BANDS.has(out.banda), `banda "${out.banda}" is one of the 5 pt-BR faixas`);
  }
});

Deno.test("ENTREV-05 — total = matriz.raw + letra_numero.raw (per-section sum)", async () => {
  const { scoreRaciocinio } = await loadScorer();
  // 6 correct: first 6 ids (all matriz) correct → matriz.raw 6, letra_numero.raw 0.
  const out = scoreRaciocinio(profileWithCorrect(6), GABARITO);
  assertEquals(out.secoes.matriz.raw, 6, "matriz raw");
  assertEquals(out.secoes.letra_numero.raw, 0, "letra_numero raw");
  assertEquals(out.total, out.secoes.matriz.raw + out.secoes.letra_numero.raw, "total is the section sum");
  assertEquals(out.secoes.matriz.n_itens, 12, "matriz n_itens");
  assertEquals(out.secoes.letra_numero.n_itens, 8, "letra_numero n_itens");
});

Deno.test("ENTREV-05 — CTT soma 0/1: a wrong/blank pick scores 0, correct scores 1", async () => {
  const { scoreRaciocinio } = await loadScorer();
  // 14 correct spans all 12 matriz + first 2 letra_numero.
  const out = scoreRaciocinio(profileWithCorrect(14), GABARITO);
  assertEquals(out.secoes.matriz.raw, 12, "all 12 matriz correct");
  assertEquals(out.secoes.letra_numero.raw, 2, "first 2 letra_numero correct");
  assertEquals(out.total, 14, "soma 0/1 total");
});

Deno.test("ENTREV-05 — a blank/missing answer scores 0 (never crashes)", async () => {
  const { scoreRaciocinio } = await loadScorer();
  // Only answer the first 5 items correctly; the rest are absent from the map.
  const partial: Record<string, number> = {};
  [...MATRIZ_IDS, ...LETRA_NUMERO_IDS].slice(0, 5).forEach((id) => (partial[id] = GABARITO[id]));
  const out = scoreRaciocinio(partial, GABARITO);
  assertEquals(out.total, 5, "5 correct, the 15 missing items score 0");
  assertEquals(out.secoes.matriz.raw, 5, "5 matriz correct");
});

Deno.test("ENTREV-05 — a client-sent score is structurally impossible to influence", async () => {
  const { scoreRaciocinio } = await loadScorer();
  // Inject a forged `score`/`banda` into the rawResponses map — the scorer must
  // ignore everything but the gabarito-keyed item picks (anti-tamper).
  const forged = { ...profileWithCorrect(4), score: 9999, banda: "bem_acima" } as unknown as Record<string, number>;
  const out = scoreRaciocinio(forged, GABARITO);
  assertEquals(out.total, 4, "the forged score/banda is ignored — only gabarito-keyed picks count");
  assertEquals(out.banda, "bem_abaixo", "4/20 = 20% → bem_abaixo regardless of the forged banda");
});

Deno.test("ENTREV-05 — banda is always one of the 5 pt-BR faixas across the full raw range", async () => {
  const { scoreRaciocinio } = await loadScorer();
  for (let n = 0; n <= N_TOTAL; n++) {
    const out = scoreRaciocinio(profileWithCorrect(n), GABARITO);
    assert(VALID_BANDS.has(out.banda), `banda "${out.banda}" for ${n} correct is one of the 5 faixas`);
  }
});
