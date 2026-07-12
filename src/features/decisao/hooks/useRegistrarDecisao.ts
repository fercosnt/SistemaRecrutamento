/**
 * useRegistrarDecisao — mutation que chama a RPC `registrar_decisao` (DECISAO-03).
 *
 * `useMutation` que envolve `decisaoService.registrarDecisao` (a RPC SECURITY DEFINER
 * que escreve `decisao_final` com `por_usuario := auth.uid()` e dispara a transição
 * terminal `avancar_etapa()`). Em sucesso: toast de confirmação + invalida as queries
 * da feature de decisão (a consolidação + a decisão atual refletem a nova row). Em
 * erro: toast com a cópia pt-BR do UI-SPEC.
 *
 * @module features/decisao/hooks/useRegistrarDecisao
 * @see src/features/triagem/hooks/useComparativo.ts (useMutation + toast onError analog)
 * @see src/features/decisao/services/decisaoService.ts (registrarDecisao)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { registrarDecisao } from '../services/decisaoService'
import { decisaoKeys } from './useConsolidacao'
import { candidaturasKeys } from '@/features/vagas/hooks/useCandidaturas'
import { vagasKeys } from '@/features/vagas/hooks/useVagas'
import type { DecisaoFormValues } from '../schemas/decisaoSchema'

export interface UseRegistrarDecisaoVars {
  candidaturaId: string
  decisao: DecisaoFormValues['decisao']
  justificativa: string
}

/**
 * Mutation de registro da decisão final. Toast de sucesso/erro + invalidação.
 */
export function useRegistrarDecisao() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UseRegistrarDecisaoVars>({
    mutationKey: [...decisaoKeys.all, 'registrar'],
    mutationFn: (vars) => registrarDecisao(vars),
    onSuccess: () => {
      toast.success('Decisão registrada e etapa finalizada.')
      queryClient.invalidateQueries({ queryKey: decisaoKeys.all })
      // MED-02: a decisão terminal também muda status/etapa da candidatura. Sem
      // invalidar estas duas árvores, a lista RH (useAllCandidaturas, staleTime 30s,
      // sem refetchOnWindowFocus) fica mostrando o status antigo após um reject via
      // UpdateStatusModal. Inócuo para DecisaoFinalPage; obrigatório para o modal.
      queryClient.invalidateQueries({ queryKey: candidaturasKeys.all })
      queryClient.invalidateQueries({ queryKey: vagasKeys.all })
    },
    onError: () => {
      toast.error('Não foi possível registrar a decisão. Tente novamente.')
    },
  })
}
