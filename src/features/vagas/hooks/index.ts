/**
 * Exports centralizados dos hooks de Vagas
 *
 * @module features/vagas/hooks
 */

// Hooks de Vagas
export {
  useVagas,
  useVaga,
  useHasApplied,
  useVagasWithStore,
  vagasKeys,
} from './useVagas'

// Hooks de Candidaturas
export {
  useCandidaturas,
  useCheckDuplicate,
  useCreateCandidatura,
  useUpdateCandidaturaStatus,
  useCandidaturasCount,
  candidaturasKeys,
} from './useCandidaturas'

// Re-export types úteis
export type {
  Vaga,
  Candidatura,
  VagasFilters,
  CandidaturasFilters,
} from '../types/vagasTypes'
