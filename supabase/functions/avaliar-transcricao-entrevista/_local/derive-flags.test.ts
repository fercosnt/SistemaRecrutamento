/**
 * Phase 14 / Plan 14-01 Task 3 — truth-table test for `_local/derive-flags.ts`.
 *
 * Gates ENTREV-03 (language/accent flag derivation). The flag is SERVER-AUTHORITATIVE
 * and DETERMINISTIC — NOT the LLM's decision (resolved Q2 / Assumptions Log A3). The
 * `TranscriptAnalysisSchema` has NO first-class language flag (Pitfall 5); it carries
 * per-competency `bias_flags { content_dependent_only, regional_markers_ignored,
 * disfluencies_ignored }`. We DERIVE the flag: a competency fires when
 * `score < 3 && bias_flags.regional_markers_ignored === false`; the overall flag is
 * true if ANY competency fires (it only SEGURA the advance — the human decides, RNF-07a).
 *
 * ── Why this is RED now ──
 * `./derive-flags.ts` does not exist yet → the dynamic import throws module-not-found
 * at run time. That IS the calibrated RED assertion; it flips GREEN once
 * `deriveLanguageAccentFlag` lands.
 *
 * Run: deno test supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.test.ts
 *
 * @see supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.ts (the module this satisfies)
 * @see docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts L211-242 (TranscriptAnalysisSchema)
 * @see supabase/functions/avaliar-redacao-cultural/_local/compute-score.ts (the deterministic-derive idiom)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Minimal shape of a TranscriptAnalysis competency evaluation (the slice the flag reads).
interface CompetencyEval {
  competency: string;
  score: number;
  bias_flags: {
    content_dependent_only: boolean;
    regional_markers_ignored: boolean;
    disfluencies_ignored: boolean;
  };
}

interface TranscriptAnalysisSlice {
  competency_evaluations: CompetencyEval[];
}

type DeriveFn = (parsed: TranscriptAnalysisSlice) => {
  flag: boolean;
  blockedCompetencies: string[];
};

async function loadDerive() {
  const mod = await import("./derive-flags.ts");
  return mod.deriveLanguageAccentFlag as DeriveFn;
}

function comp(competency: string, score: number, regional_markers_ignored: boolean): CompetencyEval {
  return {
    competency,
    score,
    bias_flags: {
      content_dependent_only: true,
      regional_markers_ignored,
      disfluencies_ignored: true,
    },
  };
}

// ───────────────────────────── truth table ──────────────────────────────────

Deno.test("ENTREV-03 — (score=2, regional_markers_ignored=false) FIRES", async () => {
  const derive = await loadDerive();
  const out = derive({ competency_evaluations: [comp("Comunicação", 2, false)] });
  assertEquals(out.flag, true, "score<3 AND regional ignored=false → fires");
  assertEquals(out.blockedCompetencies, ["Comunicação"]);
});

Deno.test("ENTREV-03 — (score=2, regional_markers_ignored=true) does NOT fire", async () => {
  const derive = await loadDerive();
  const out = derive({ competency_evaluations: [comp("Comunicação", 2, true)] });
  assertEquals(out.flag, false, "regional markers WERE ignored as neutral → no language penalty");
  assertEquals(out.blockedCompetencies, []);
});

Deno.test("ENTREV-03 — (score=4, regional_markers_ignored=false) does NOT fire", async () => {
  const derive = await loadDerive();
  const out = derive({ competency_evaluations: [comp("Comunicação", 4, false)] });
  assertEquals(out.flag, false, "score≥3 → no fire even if regional markers were not ignored");
  assertEquals(out.blockedCompetencies, []);
});

Deno.test("ENTREV-03 — empty competencies → flag=false", async () => {
  const derive = await loadDerive();
  const out = derive({ competency_evaluations: [] });
  assertEquals(out.flag, false);
  assertEquals(out.blockedCompetencies, []);
});

Deno.test("ENTREV-03 — flag=true if ANY competency fires; blockedCompetencies lists only the firing ones", async () => {
  const derive = await loadDerive();
  const out = derive({
    competency_evaluations: [
      comp("Comunicação", 2, false), // fires
      comp("Liderança", 4, false), // score≥3 → no
      comp("Resolução", 1, false), // fires
      comp("Empatia", 2, true), // regional ignored → no
    ],
  });
  assertEquals(out.flag, true);
  assertEquals(out.blockedCompetencies.sort(), ["Comunicação", "Resolução"].sort());
});

Deno.test("ENTREV-03 — score exactly 3 does NOT fire (strict score < 3)", async () => {
  const derive = await loadDerive();
  const out = derive({ competency_evaluations: [comp("Comunicação", 3, false)] });
  assert(out.flag === false, "score === 3 is NOT < 3");
});
