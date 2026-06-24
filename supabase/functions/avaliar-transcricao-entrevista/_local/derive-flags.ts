/**
 * `avaliar-transcricao-entrevista/_local/derive-flags.ts` — derivação DETERMINÍSTICA
 * e SERVER-AUTHORITATIVE da flag de língua/sotaque a partir da análise de transcrição
 * (ENTREV-03 / RF-24).
 *
 * Phase 14 / Plan 14-01 — ENTREV-03.
 *
 * A flag NÃO é decisão do LLM (resolved Q2 / Assumptions Log A3). O
 * `TranscriptAnalysisSchema` (00-shared-zod-schemas.ts L211-242) NÃO tem uma flag
 * de língua de primeira classe (Pitfall 5): ele carrega, por competência,
 * `bias_flags { content_dependent_only, regional_markers_ignored, disfluencies_ignored }`.
 * Este módulo DERIVA a flag deterministicamente — anti-pattern: jamais deixar o LLM
 * decidir o bloqueio.
 *
 * PREDICADO (resolved Q2): uma competência "dispara" quando
 *   `score < 3 && bias_flags.regional_markers_ignored === false`
 * (ou seja: nota baixa E o avaliador NÃO neutralizou regionalismos — sinal de que a
 * forma oral/sotaque pode ter penalizado injustamente). A flag geral é `true` se
 * QUALQUER competência dispara. A flag SÓ SEGURA o avanço (`bloqueio_avanco=true`) —
 * o humano sempre decide (RNF-07a). NUNCA rejeita automaticamente.
 *
 * @see docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts L211-242 (TranscriptAnalysisSchema + bias_flags L230-234)
 * @see supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.test.ts (a truth table 14-01 que isto satisfaz)
 * @see supabase/functions/avaliar-redacao-cultural/_local/compute-score.ts (o padrão derive-determinístico-server-side)
 */

/**
 * O slice do `TranscriptAnalysisSchema` que a derivação lê. Mantido mínimo de
 * propósito (o EF passa o objeto parseado completo; só estes campos importam aqui).
 */
export interface TranscriptCompetencyEval {
  competency: string;
  score: number;
  bias_flags: {
    content_dependent_only: boolean;
    regional_markers_ignored: boolean;
    disfluencies_ignored: boolean;
  };
}

export interface TranscriptAnalysisSlice {
  competency_evaluations: TranscriptCompetencyEval[];
}

export interface LanguageAccentFlag {
  /** true se QUALQUER competência dispara o predicado de língua/sotaque. */
  flag: boolean;
  /** as competências que dispararam (score<3 && regional_markers_ignored===false). */
  blockedCompetencies: string[];
}

/**
 * Deriva a flag de língua/sotaque deterministicamente a partir da análise parseada.
 * Server-authoritative (NÃO o LLM). O predicado por competência é
 * `score < 3 && bias_flags.regional_markers_ignored === false`. A flag geral é true
 * se ao menos uma competência dispara; `blockedCompetencies` lista as que dispararam.
 * SÓ SEGURA o avanço — nunca rejeita (RNF-07a).
 */
export function deriveLanguageAccentFlag(parsed: TranscriptAnalysisSlice): LanguageAccentFlag {
  const blockedCompetencies: string[] = [];

  for (const c of parsed.competency_evaluations ?? []) {
    const fires = c.score < 3 && c.bias_flags.regional_markers_ignored === false;
    if (fires) blockedCompetencies.push(c.competency);
  }

  return {
    flag: blockedCompetencies.length > 0,
    blockedCompetencies,
  };
}
