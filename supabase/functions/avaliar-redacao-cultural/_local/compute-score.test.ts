/**
 * Phase 13 / Plan 13-01 Task 2 — `computeScoreAndCors` + `normalizeForHash`
 * table-driven contract test (AVAL-06).
 *
 * A REAL contract (GREEN), not a stub: the caps + 3-color are DETERMINISTIC EF
 * code (NOT the LLM). Each row pins one PRD §8.3 behavior:
 *   - equal-weights ×20 mean (4×5 → 100/verde, 4×3 → 60/amarelo, 4×2 → 40/vermelho)
 *   - cap (a) red_flag_etico → MIN(score,30) + flag + vermelho
 *   - cap (b) D1≤2 → MIN(score,50) + flag + vermelho
 *   - insufficient_evidence excluded from the mean (validDims=3) + dim flag
 *   - tempoSegundos < 90 → 'tempo_anormalmente_curto'
 *   - per-vaga threshold respected over the default
 *   - flags deduped (Set)
 *   - normalizeForHash lowercases + strips punctuation + collapses whitespace + trims
 *
 * Run: `deno test supabase/functions/avaliar-redacao-cultural/_local/compute-score.test.ts`
 *
 * @see supabase/functions/avaliar-redacao-cultural/_local/compute-score.ts (under test)
 * @see docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md §8.3 (binding source)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeScoreAndCors, normalizeForHash } from "./compute-score.ts";
import type { EssayScoringV1 } from "../../_shared/essay-schemas.ts";

const DEFAULT_THRESHOLD = { vermelho_max: 40, amarelo_max: 64 };

// Build a minimal-but-valid-shaped EssayScoringV1 with the 4 dims at given scores.
function essayWith(
  scores: Array<number | "insufficient_evidence">,
  redFlagEtico = false,
): EssayScoringV1 {
  const dims = (["D1", "D2", "D3", "D4"] as const).map((dimension, i) => ({
    dimension,
    dimension_name: "dim",
    cited_evidence: [],
    reasoning: "raciocínio com mais de vinte caracteres ok",
    score: scores[i],
    level: "proficient" as const,
  }));
  return {
    preprocessing_check: { word_count: 300, detected_writing_style: "formal", style_neutralized_in_scoring: true },
    dimension_scores: dims as EssayScoringV1["dimension_scores"],
    overall_score: 0,
    qualitative_summary: "resumo qualitativo com mais de cinquenta caracteres para o schema passar tranquilo",
    recommendation: "neutral",
    red_flag_etico: redFlagEtico,
    bias_audit: {
      formality_did_not_affect_score: true,
      regional_markers_treated_as_neutral: true,
      grammar_errors_did_not_affect_content_score: true,
    },
  };
}

Deno.test("4 dims all 5, no red flag → score 100, verde", () => {
  const r = computeScoreAndCors(essayWith([5, 5, 5, 5]), DEFAULT_THRESHOLD, 300, 600);
  assertEquals(r.scoreGeral, 100);
  assertEquals(r.classificacaoCor, "verde");
  assertEquals(r.redFlagEtico, false);
});

Deno.test("4 dims all 3 → score 60, amarelo (≤64, >40)", () => {
  const r = computeScoreAndCors(essayWith([3, 3, 3, 3]), DEFAULT_THRESHOLD, 300, 600);
  assertEquals(r.scoreGeral, 60);
  assertEquals(r.classificacaoCor, "amarelo");
});

Deno.test("4 dims all 2 → score 40, vermelho (≤vermelho_max AND D1≤2)", () => {
  const r = computeScoreAndCors(essayWith([2, 2, 2, 2]), DEFAULT_THRESHOLD, 300, 600);
  // mean 2×20 = 40, but D1≤2 cap also fires → MIN(40,50)=40
  assertEquals(r.scoreGeral, 40);
  assertEquals(r.classificacaoCor, "vermelho");
  assert(r.flags.includes("situacao_generica_ou_inventada"));
});

Deno.test("red_flag_etico=true with high dims → capped at MIN(score,30), flag, vermelho", () => {
  const r = computeScoreAndCors(essayWith([5, 5, 5, 5], true), DEFAULT_THRESHOLD, 300, 600);
  assertEquals(r.scoreGeral, 30);
  assert(r.flags.includes("red_flag_etico"));
  assertEquals(r.classificacaoCor, "vermelho");
  assertEquals(r.redFlagEtico, true);
});

Deno.test("D1 score 2 (others 5) → capped at MIN(score,50), flag, vermelho", () => {
  const r = computeScoreAndCors(essayWith([2, 5, 5, 5]), DEFAULT_THRESHOLD, 300, 600);
  // mean (2+5+5+5)/4 = 4.25 ×20 = 85, then D1≤2 cap → MIN(85,50)=50
  assertEquals(r.scoreGeral, 50);
  assert(r.flags.includes("situacao_generica_ou_inventada"));
  assertEquals(r.classificacaoCor, "vermelho");
});

Deno.test("one dim insufficient_evidence → excluded from mean (validDims=3), dim flag", () => {
  const r = computeScoreAndCors(essayWith([5, "insufficient_evidence", 5, 5]), DEFAULT_THRESHOLD, 300, 600);
  // (5+5+5)/3 = 5 ×20 = 100 ; D2 insufficient flagged
  assertEquals(r.scoreGeral, 100);
  assert(r.flags.includes("D2_insufficient_evidence"));
  assertEquals(r.classificacaoCor, "verde");
});

Deno.test("tempoSegundos < 90 → flag 'tempo_anormalmente_curto'", () => {
  const r = computeScoreAndCors(essayWith([4, 4, 4, 4]), DEFAULT_THRESHOLD, 300, 45);
  assert(r.flags.includes("tempo_anormalmente_curto"));
});

Deno.test("per-vaga threshold {vermelho_max:30, amarelo_max:55} respected over default", () => {
  // score 60 → with custom thresholds 60 > 55 → verde (would be amarelo under default 64)
  const r = computeScoreAndCors(essayWith([3, 3, 3, 3]), { vermelho_max: 30, amarelo_max: 55 }, 300, 600);
  assertEquals(r.scoreGeral, 60);
  assertEquals(r.classificacaoCor, "verde");
});

Deno.test("normalizeForHash lowercases + strips punctuation + collapses whitespace + trims", () => {
  assertEquals(normalizeForHash("Olá, Mundo!  TESTE"), "olá mundo teste");
});

Deno.test("flags array is deduped (Set)", () => {
  // red_flag + D1≤2 + tempo all fire; ensure no accidental duplicate
  const r = computeScoreAndCors(essayWith([2, 2, 2, 2], true), DEFAULT_THRESHOLD, 300, 30);
  const unique = new Set(r.flags);
  assertEquals(r.flags.length, unique.size, "flags must be unique");
  assert(r.flags.includes("red_flag_etico"));
  assert(r.flags.includes("situacao_generica_ou_inventada"));
  assert(r.flags.includes("tempo_anormalmente_curto"));
});
