/**
 * useRetirarCandidatura — a mutação da retirada (ERASE-05).
 *
 * ⚠ ESTE ARQUIVO ESTÁ EM ESTADO **RED** (TDD). A implementação chega no commit
 * GREEN seguinte.
 *
 * @module features/vagas/hooks/useRetirarCandidatura
 */

export interface RetirarCandidaturaMutation {
  mutate: (candidaturaId: string) => void
  isPending: boolean
  isError: boolean
}

export function useRetirarCandidatura(): RetirarCandidaturaMutation {
  throw new Error('useRetirarCandidatura: não implementado (TDD RED)')
}
