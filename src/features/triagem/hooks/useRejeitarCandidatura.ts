/**
 * useRejeitarCandidatura — mutation que chama a RPC `rejeitar_candidatura` (OPER-02).
 *
 * `useMutation` que envolve `triagemService.rejeitarCandidatura` (a RPC SECURITY
 * DEFINER que aplica o gate ≥50, re-autoriza WR-04 e faz o UPDATE único que dispara o
 * trigger `avancar_etapa()` — o único escritor de `historico_candidatura`). Em sucesso:
 * toast de confirmação + invalidação das TRÊS árvores de query (`candidaturasKeys.all`,
 * `vagasKeys.all`, `triagemKeys.all`) para que a lista/painel RH reflita o novo status
 * (staleTime + sem refetchOnWindowFocus mostrariam o status antigo). Em erro: toast com
 * a cópia pt-BR do 31-UI-SPEC — ou, na recusa D-23 do servidor (51-16), o motivo real
 * (`mensagemErroRejeitarCandidatura`).
 *
 * Copiado verbatim de `useRegistrarDecisao` (mesma razão da invalidação — nota MED-02).
 *
 * @module features/triagem/hooks/useRejeitarCandidatura
 * @see src/features/decisao/hooks/useRegistrarDecisao.ts (analog: mutation + toast + invalidation)
 * @see src/features/triagem/services/triagemService.ts (rejeitarCandidatura)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  mensagemErroRejeitarCandidatura,
  rejeitarCandidatura,
  type MotivoRejeicaoRh,
} from '../services/triagemService'
import { triagemKeys } from './useTriagemPanel'
import { candidaturasKeys } from '@/features/vagas/hooks/useCandidaturas'
import { vagasKeys } from '@/features/vagas/hooks/useVagas'
import { entrevistaKeys } from '@/features/entrevista/hooks/useEntrevistaScorecard'

export interface UseRejeitarCandidaturaVars {
  candidaturaId: string
  motivo: MotivoRejeicaoRh
  justificativa: string
}

/**
 * Mutation de rejeição de candidatura. Toast de sucesso/erro + invalidação das 3 árvores.
 */
export function useRejeitarCandidatura() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UseRejeitarCandidaturaVars>({
    mutationFn: ({ candidaturaId, motivo, justificativa }) =>
      rejeitarCandidatura(candidaturaId, motivo, justificativa),
    onSuccess: () => {
      toast.success('Candidato movido para "Rejeitado".')
      // As três árvores: a lista de candidaturas, os contadores de vagas e o painel de
      // triagem. Sem invalidar, a lista RH (staleTime, sem refetchOnWindowFocus) fica
      // mostrando o status antigo após um reject.
      queryClient.invalidateQueries({ queryKey: candidaturasKeys.all })
      queryClient.invalidateQueries({ queryKey: vagasKeys.all })
      queryClient.invalidateQueries({ queryKey: triagemKeys.all })
      // WR-01: o HubCandidatoRH deriva a UI de etapa via `useEntrevistaContexto`
      // (chave `['entrevista', …]`). Sem invalidar essa árvore, uma ação disparada
      // DE DENTRO do Hub deixa o Hub stale e re-oferece Rejeitar → RPC bate no guard
      // terminal. Invalidar a árvore da entrevista mantém o Hub coerente.
      queryClient.invalidateQueries({ queryKey: entrevistaKeys.all })
    },
    onError: (erro) => {
      // 51-16 (padrão do 48-15): a recusa D-23 do servidor (decisor revertido) diz o motivo real e
      // quem pode seguir — não «Tente novamente», que levaria o RH a repetir uma recusa permanente.
      toast.error(mensagemErroRejeitarCandidatura(erro))
    },
  })
}
