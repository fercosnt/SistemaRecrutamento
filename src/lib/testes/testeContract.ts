/**
 * Phase 25 / Plan 25-04 (FUNIL-05 / A15) — the ONE canonical template↔container
 * test-id contract.
 *
 * `cargoTemplates.baseTestes` writes `vaga.testes_aplicaveis` entries whose
 * `teste` id is drawn from the TEMPLATE side; the candidate `AvaliacaoContainer`
 * renders/routes on the CONTAINER side. The two vocabularies only overlap on
 * `big_five`. Before this lib, `deriveCards` copied the template id VERBATIM, so
 * a real vaga's `work_sample_sjt`/`redacao_cultural`/`cognitivo` fell to the
 * container's default label + accidental `target='mc'` (redacao routed WRONG).
 *
 * This module is the single source of the mapping. `deriveCards` filters to
 * `CANDIDATE_FACING` template tests and maps each through
 * `templateTesteToContainerCards`; the FUNIL-05 contract test parses every
 * `cargoTemplates` teste through it and asserts each emitted id is one the
 * container recognizes (no default-branch fall-through).
 *
 * Scope: this is the id CONTRACT only. Actual reachability of cognitivo / SJT
 * batteries by cargo is Phase 26 — `cognitivo` here carries a card id (label +
 * route stub) but nothing pulls its screen forward.
 *
 * @see src/features/config-vaga/templates/cargoTemplates.ts (baseTestes — the template side)
 * @see src/features/avaliacao/components/AvaliacaoContainer.tsx (the container side + CONTAINER_RECOGNIZED)
 * @see .planning/phases/25-corre-o-do-funil-lado-rh-enums-colunas-contratos/25-RESEARCH.md §2d
 * @module lib/testes/testeContract
 */

/**
 * The canonical TEMPLATE-side test id union — exactly the ids
 * `cargoTemplates.baseTestes` emits into `vaga.testes_aplicaveis`.
 */
export const TEMPLATE_TESTES = [
  'triagem',
  'work_sample_sjt',
  'redacao_cultural',
  'big_five',
  'cognitivo',
  'entrevista',
] as const
export type TemplateTeste = (typeof TEMPLATE_TESTES)[number]

/**
 * The canonical CONTAINER-side card id union — the ids the `AvaliacaoContainer`
 * renders a real card + routes for (never the default fall-through).
 */
export const CONTAINER_TESTES = [
  'sjt_mc',
  'sjt_caso_aberto',
  'big_five',
  'redacao',
  'cognitivo',
] as const
export type ContainerTeste = (typeof CONTAINER_TESTES)[number]

/**
 * Which TEMPLATE tests are candidate-facing avaliação-assíncrona cards. `triagem`
 * (RH-side screening) and `entrevista` (scheduled, not self-serve) are NOT — they
 * must be filtered out of the candidate container (T-25-04-03). Typed as a
 * `ReadonlySet<string>` so read-time jsonb ids (unconstrained strings) can be
 * membership-tested without a cast.
 */
export const CANDIDATE_FACING: ReadonlySet<string> = new Set<TemplateTeste>([
  'work_sample_sjt',
  'redacao_cultural',
  'big_five',
  'cognitivo',
])

/**
 * The mapping's single source of truth. Non-candidate-facing template tests map
 * to `[]` (filtered). `work_sample_sjt` fans out to BOTH SJT cards.
 */
const TEMPLATE_TO_CONTAINER: Record<TemplateTeste, readonly ContainerTeste[]> = {
  triagem: [],
  entrevista: [],
  work_sample_sjt: ['sjt_mc', 'sjt_caso_aberto'],
  redacao_cultural: ['redacao'],
  big_five: ['big_five'],
  cognitivo: ['cognitivo'],
}

function isTemplateTeste(t: string): t is TemplateTeste {
  return (TEMPLATE_TESTES as readonly string[]).includes(t)
}

/**
 * Maps a TEMPLATE-side teste id to the CONTAINER card ids the candidate
 * container should render for it. Non-candidate-facing tests and unknown ids map
 * to `[]` (defensive — an unrecognized id is dropped, never rendered as a broken
 * default-label card that mis-routes to `target='mc'`).
 */
export function templateTesteToContainerCards(t: string): ContainerTeste[] {
  if (!isTemplateTeste(t)) return []
  return [...TEMPLATE_TO_CONTAINER[t]]
}
