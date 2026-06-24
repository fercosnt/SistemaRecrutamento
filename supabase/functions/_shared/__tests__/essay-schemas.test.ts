/**
 * Phase 13 / Plan 13-01 Task 1 — `EssayScoringV1Schema` contract test (AVAL-06).
 *
 * This is a REAL contract (GREEN), not a stub: the schema is the validation
 * boundary between the untrusted LLM structured output and the deterministic
 * `computeScoreAndCors` pipeline. The six behaviors below pin the load-bearing
 * shape from PRD §8.4 — the same assertions the drifted canonical
 * `CultureFitEssaySchema` (Pitfall 7) would FAIL:
 *   - exactly 4 dimension_scores (`.length(4)`)
 *   - `red_flag_etico` is a required boolean (drives the 30-cap)
 *   - `dimension` is the `D1..D4` enum (not `z.string()`)
 *   - `score` union accepts the `'insufficient_evidence'` literal, rejects 6
 *   - `style_neutralized_in_scoring` is `z.literal(true)` (not a free boolean)
 *
 * Run: `deno test supabase/functions/_shared/__tests__/essay-schemas.test.ts`
 *
 * @see supabase/functions/_shared/essay-schemas.ts (the schema under test)
 * @see docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md §8.4 (binding source)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EssayScoringV1Schema } from "../essay-schemas.ts";

// A canonical, fully-valid EssayScoringV1 object (4 dims, all required fields).
function validDim(dimension: "D1" | "D2" | "D3" | "D4", score: number | "insufficient_evidence" = 4) {
  return {
    dimension,
    dimension_name: "dimensão",
    cited_evidence: [{ text: "trecho literal da redação", location: "Parágrafo 2" }],
    reasoning: "raciocínio com pelo menos vinte caracteres aqui",
    score,
    level: "proficient" as const,
  };
}

function validEssay() {
  return {
    preprocessing_check: {
      word_count: 312,
      detected_writing_style: "formal" as const,
      style_neutralized_in_scoring: true as const,
    },
    dimension_scores: [validDim("D1"), validDim("D2"), validDim("D3"), validDim("D4")],
    overall_score: 80,
    qualitative_summary:
      "Resumo qualitativo com no mínimo cinquenta caracteres para passar na validação do schema.",
    recommendation: "good_fit" as const,
    red_flag_etico: false,
    bias_audit: {
      formality_did_not_affect_score: true,
      regional_markers_treated_as_neutral: true,
      grammar_errors_did_not_affect_content_score: true,
    },
  };
}

Deno.test("valid EssayScoringV1 with exactly 4 dimension_scores → parses", () => {
  const res = EssayScoringV1Schema.safeParse(validEssay());
  assert(res.success, "expected a valid 4-dim essay to parse");
});

Deno.test("3 or 5 dimension_scores → THROWS (.length(4) enforced)", () => {
  const three = { ...validEssay(), dimension_scores: [validDim("D1"), validDim("D2"), validDim("D3")] };
  assertEquals(EssayScoringV1Schema.safeParse(three).success, false, "3 dims must fail");

  const five = {
    ...validEssay(),
    dimension_scores: [validDim("D1"), validDim("D2"), validDim("D3"), validDim("D4"), validDim("D1")],
  };
  assertEquals(EssayScoringV1Schema.safeParse(five).success, false, "5 dims must fail");
});

Deno.test("missing red_flag_etico → THROWS (required boolean — load-bearing cap)", () => {
  const obj = validEssay() as Record<string, unknown>;
  delete obj.red_flag_etico;
  assertEquals(EssayScoringV1Schema.safeParse(obj).success, false);
});

Deno.test("dimension 'D5' / arbitrary string → THROWS (z.enum(['D1'..'D4']))", () => {
  const bad = { ...validEssay(), dimension_scores: [
    { ...validDim("D1"), dimension: "D5" },
    validDim("D2"), validDim("D3"), validDim("D4"),
  ] };
  assertEquals(EssayScoringV1Schema.safeParse(bad).success, false);
});

Deno.test("score === 'insufficient_evidence' accepted; score === 6 rejected", () => {
  const insuff = {
    ...validEssay(),
    dimension_scores: [
      validDim("D1", "insufficient_evidence"),
      validDim("D2"), validDim("D3"), validDim("D4"),
    ],
  };
  assert(EssayScoringV1Schema.safeParse(insuff).success, "'insufficient_evidence' literal must be accepted");

  const over = {
    ...validEssay(),
    dimension_scores: [validDim("D1", 6), validDim("D2"), validDim("D3"), validDim("D4")],
  };
  assertEquals(EssayScoringV1Schema.safeParse(over).success, false, "score 6 must be rejected (max 5)");
});

Deno.test("style_neutralized_in_scoring === false → THROWS (z.literal(true))", () => {
  const obj = validEssay();
  // deno-lint-ignore no-explicit-any
  (obj.preprocessing_check as any).style_neutralized_in_scoring = false;
  assertEquals(EssayScoringV1Schema.safeParse(obj).success, false);
});
