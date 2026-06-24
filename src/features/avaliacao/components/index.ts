/**
 * Phase 11 — `features/avaliacao/components` barrel.
 *
 * The candidate Avaliação Assíncrona surfaces. Plan 11-06 extends this barrel
 * (RH scorecard view) — keep these named exports stable.
 *
 * @module features/avaliacao/components
 */
export { AvaliacaoContainer } from './AvaliacaoContainer'
export type { TesteCard } from './AvaliacaoContainer'
export { SjtMultiplaEscolhaScreen } from './SjtMultiplaEscolhaScreen'
export { SjtCasoAbertoScreen } from './SjtCasoAbertoScreen'
export { ScorecardAvaliacao } from './ScorecardAvaliacao'
export type { ScorecardAvaliacaoProps } from './ScorecardAvaliacao'
// Phase 12 (Big Five candidate flow — AVAL-04 / AVAL-08)
export { BigFiveQuestionnaireScreen } from './BigFiveQuestionnaireScreen'
export { DevolutivaBigFiveView } from './DevolutivaBigFiveView'
// Phase 13 (Redação cultural candidate flow — AVAL-05 / AVAL-06)
export { RedacaoEditorScreen } from './RedacaoEditorScreen'
export { RedacaoCounter } from './RedacaoCounter'
export { RedacaoCronometro } from './RedacaoCronometro'
