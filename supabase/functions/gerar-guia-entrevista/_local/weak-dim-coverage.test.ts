/**
 * Phase 14 / Plan 14-01 Task 3 — test for `_local/weak-dim-coverage.ts`.
 *
 * Gates ENTREV-01 (Pitfall 4 — never silently pass an interview guide that fails to
 * probe a weak dimension). After the LLM emits the `InterviewGuideSchema` guide, the
 * EF asserts SERVER-SIDE that every weak dimension (from the prior Etapa-3 scorecard)
 * is covered by some `questions[].competency`. Uncovered → bounded re-prompt OR flag
 * for human; NEVER a silent incomplete guide.
 *
 * ── Why this is RED now ──
 * `./weak-dim-coverage.ts` does not exist yet → module-not-found at run time (the
 * calibrated RED assertion). Flips GREEN once `checkWeakDimCoverage` lands.
 *
 * Run: deno test supabase/functions/gerar-guia-entrevista/_local/weak-dim-coverage.test.ts
 *
 * @see supabase/functions/gerar-guia-entrevista/_local/weak-dim-coverage.ts (the module this satisfies)
 * @see docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts L190-203 (InterviewGuideSchema)
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Minimal slice of the InterviewGuideSchema the coverage check reads.
interface GuideQuestion {
  competency: string;
}
interface GuideSlice {
  questions: GuideQuestion[];
}

type CheckFn = (guide: GuideSlice, weakDims: string[]) => {
  covered: boolean;
  missing: string[];
};

async function loadCheck() {
  const mod = await import("./weak-dim-coverage.ts");
  return mod.checkWeakDimCoverage as CheckFn;
}

function guide(...competencies: string[]): GuideSlice {
  return { questions: competencies.map((c) => ({ competency: c })) };
}

Deno.test("ENTREV-01 — every weak dim covered → covered=true, missing=[]", async () => {
  const check = await loadCheck();
  const out = check(guide("Comunicação", "Liderança", "Empatia"), ["Comunicação", "Liderança"]);
  assertEquals(out.covered, true);
  assertEquals(out.missing, []);
});

Deno.test("ENTREV-01 — an uncovered weak dim → covered=false, missing lists it", async () => {
  const check = await loadCheck();
  const out = check(guide("Comunicação"), ["Comunicação", "Resolução de Problemas"]);
  assertEquals(out.covered, false);
  assertEquals(out.missing, ["Resolução de Problemas"]);
});

Deno.test("ENTREV-01 — no weak dims → trivially covered", async () => {
  const check = await loadCheck();
  const out = check(guide("Comunicação"), []);
  assertEquals(out.covered, true);
  assertEquals(out.missing, []);
});

Deno.test("ENTREV-01 — empty guide with a weak dim → not covered", async () => {
  const check = await loadCheck();
  const out = check(guide(), ["Comunicação"]);
  assertEquals(out.covered, false);
  assertEquals(out.missing, ["Comunicação"]);
});

Deno.test("ENTREV-01 — coverage is case/whitespace-insensitive (LLM emits slight variants)", async () => {
  const check = await loadCheck();
  const out = check(guide("  comunicação  "), ["Comunicação"]);
  assertEquals(out.covered, true, "trimmed + lowercased match");
  assertEquals(out.missing, []);
});

Deno.test("ENTREV-01 — multiple uncovered dims all listed in missing", async () => {
  const check = await loadCheck();
  const out = check(guide("Comunicação"), ["Liderança", "Empatia", "Comunicação"]);
  assertEquals(out.covered, false);
  assertEquals(out.missing.sort(), ["Empatia", "Liderança"].sort());
});
