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
import type { ProvenienciaIA } from '../services/triagemService'
import { triagemKeys } from './useTriagemPanel'
import type { ComparativeRankingView } from '../pdf/exportComparativo'

export interface UseComparativoVars {
  vagaId: string
  candidaturaIds: string[]
}

/**
 * Resultado do comparativo para a tela.
 *
 * `posicoes` e os três campos de `ProvenienciaIA` são ADITIVOS (plano 49-13 sobre o
 * contrato do 49-08): quem já consumia só `ranking`/`latencia_ms` — a `DecisaoFinalPage`
 * até o 49-22 — segue compilando sem tocar em nada.
 */
export interface ComparativoResult extends ProvenienciaIA {
  ranking: ComparativeRankingView
  /** `C<n>` → `candidatura_id`, montado pela EF no mesmo laço que montou o prompt. */
  posicoes: Record<string, string>
  latencia_ms?: number
}

/**
 * Mutation do comparativo: invoca a EF e devolve o ranking; toast em erro.
 */
export function useComparativo() {
  return useMutation<ComparativoResult, Error, UseComparativoVars>({
    mutationKey: [...triagemKeys.all, 'comparativo'],
    mutationFn: async ({ vagaId, candidaturaIds }) => {
      const res = await invokeComparativo(vagaId, candidaturaIds)
      return {
        ranking: res.ranking as ComparativeRankingView,
        posicoes: res.posicoes,
        provedor_ia: res.provedor_ia,
        modelo_ia: res.modelo_ia,
        fallback_cause: res.fallback_cause,
        latencia_ms: res.latencia_ms,
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Não foi possível gerar o comparativo. Tente novamente.')
    },
  })
}
