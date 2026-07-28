/**
 * useComparativo — mutation que invoca a EF comparativo-candidatos (TRIAGEM-03).
 *
 * `useMutation` que envolve `invokeComparativo` (triagemService). Em erro, dispara um
 * toast (sonner) com a mensagem do `TriagemServiceError` — incluindo a cópia pt-BR de
 * vagas diferentes (MIXED_VAGA). Reusa `triagemKeys.comparativo` (de useTriagemPanel)
 * como mutationKey para rastreabilidade.
 *
 * @module features/triagem/hooks/useComparativo
 * @see src/features/triagem/services/triagemService.ts (invokeComparativo + error map)
 * @see src/features/triagem/hooks/useTriagemPanel.ts (triagemKeys.comparativo)
 */

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invokeComparativo } from '../services/triagemService'
import { triagemKeys } from './useTriagemPanel'
import type { ComparativeRankingView } from '../pdf/exportComparativo'

export interface UseComparativoVars {
  vagaId: string
  candidaturaIds: string[]
}

export interface ComparativoResult {
  ranking: ComparativeRankingView
  latencia_ms?: number
}

/**
 * Mutation do comparativo: invoca a EF e devolve o ranking; toast em erro.
 */
export function useComparativo() {
  return useMutation<ComparativoResult, Error, UseComparativoVars>({
    mutationKey: [...triagemKeys.all, 'comparativo'],
    mutationFn: async ({ vagaId, candidaturaIds }) => {
      const { ranking, latencia_ms } = await invokeComparativo(vagaId, candidaturaIds)
      return { ranking: ranking as ComparativeRankingView, latencia_ms }
    },
    onError: (error) => {
      toast.error(error.message || 'Não foi possível gerar o comparativo. Tente novamente.')
    },
  })
}
