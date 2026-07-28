/**
 * `gerar-guia-entrevista/_local/weak-dim-coverage.ts` — verificação DETERMINÍSTICA,
 * server-side, de que o roteiro de entrevista cobre toda dimensão fraca (ENTREV-01 /
 * Pitfall 4).
 *
 * Phase 14 / Plan 14-01 — ENTREV-01.
 *
 * Depois que o LLM emite o `InterviewGuideSchema`, o EF NÃO confia cegamente que o
 * roteiro probe as dimensões fracas (score<3 online / <4 presencial no scorecard da
 * Etapa 3). Este módulo asserta server-side que TODA dimensão fraca é coberta por
 * alguma `questions[].competency`. Se alguma ficar descoberta, o EF faz um re-prompt
 * bounded OU sinaliza para o humano — NUNCA passa um roteiro incompleto em silêncio.
 *
 * O match é case/whitespace-insensitive (o LLM emite variantes leves do rótulo da
 * competência). A comparação normaliza (trim + lowercase) dos dois lados.
 *
 * @see docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts L190-203 (InterviewGuideSchema, questions[].competency)
 * @see supabase/functions/gerar-guia-entrevista/_local/weak-dim-coverage.test.ts (o teste 14-01 que isto satisfaz)
 */

export interface GuideQuestionSlice {
  competency: string;
}

export interface InterviewGuideSlice {
  questions: GuideQuestionSlice[];
}

export interface WeakDimCoverage {
  /** true se TODA dimensão fraca é coberta por alguma questions[].competency. */
  covered: boolean;
  /** as dimensões fracas que NENHUMA pergunta cobre (case/whitespace-insensitive). */
  missing: string[];
}

const norm = (s: string): string => s.trim().toLowerCase();

/**
 * Verifica se cada dimensão fraca é coberta por alguma `questions[].competency`.
 * Retorna `{ covered, missing }`. `missing` lista (na grafia ORIGINAL da weak dim)
 * as dimensões não cobertas; é `[]` quando todas estão cobertas (ou quando não há
 * weak dims — trivialmente coberto). Match case/whitespace-insensitive.
 */
export function checkWeakDimCoverage(
  guide: InterviewGuideSlice,
  weakDims: string[],
): WeakDimCoverage {
  const covered = new Set<string>((guide.questions ?? []).map((q) => norm(q.competency)));

  const missing: string[] = [];
  for (const dim of weakDims ?? []) {
    if (!covered.has(norm(dim))) missing.push(dim);
  }

  return { covered: missing.length === 0, missing };
}
