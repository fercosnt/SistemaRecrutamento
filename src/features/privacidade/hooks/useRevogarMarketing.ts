/**
 * useRevogarMarketing — a única escrita do candidato nesta fase (CONSENT-04).
 *
 * DUAS PROIBIÇÕES QUE SÃO O PONTO DO HOOK, não detalhe de implementação:
 *
 *  1. **NUNCA `onMutate`.** A Invariante 5 da 43-UI-SPEC proíbe UI otimista em escrita de
 *     consentimento: uma interface dizendo "revogado" enquanto o servidor diz "concedido"
 *     é o defeito central deste milestone em miniatura. O estado exibido vem da
 *     invalidação + releitura, nunca de um palpite local.
 *  2. **NENHUM `toast.error`.** O erro desta escrita vira ALERTA INLINE persistente na
 *     própria linha (E4 da 43-UI-SPEC). Um toast some em ~4 segundos, e este é
 *     exatamente o caso em que a pessoa precisa saber que a autorização dela NÃO mudou.
 *     O `isError` da mutation é o que a linha lê.
 *
 * A mutation vale para as DUAS direções (revogar e reativar) — o nome fala do caminho
 * que motiva a tela, não de uma restrição de direção.
 *
 * @module features/privacidade/hooks/useRevogarMarketing
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { revogarMarketing } from '../services/privacidadeService'
import type { AutorizacoesCandidato } from '../services/privacidadeService'
import { privacidadeKeys } from './usePrivacidade'

/** Copy verbatim da 43-UI-SPEC §`/candidato/privacidade` (linhas 488-489). */
export const COPY_TOAST_MARKETING = {
  revogado: 'Pronto. Você não receberá mais avisos sobre novas vagas.',
  ativado: 'Pronto. Você passará a receber avisos sobre novas vagas.',
} as const

export interface VariaveisRevogacao {
  idAutorizacao: string
  novoValor: boolean
}

export function useRevogarMarketing(candidatoId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<AutorizacoesCandidato, Error, VariaveisRevogacao>({
    mutationKey: [...privacidadeKeys.all, 'revogar-marketing', candidatoId],
    mutationFn: ({ idAutorizacao, novoValor }) =>
      revogarMarketing(idAutorizacao, novoValor),
    // Sem `onMutate`: nada é antecipado. Ver a proibição 1 no docblock.
    onSuccess: (linha) => {
      // O toast fala do que o SERVIDOR devolveu, não do que foi pedido.
      toast.success(
        linha.autorizacao_marketing_vagas === true
          ? COPY_TOAST_MARKETING.ativado
          : COPY_TOAST_MARKETING.revogado,
      )
      void queryClient.invalidateQueries({
        queryKey: privacidadeKeys.autorizacoes(candidatoId),
      })
    },
    // Sem `onError`: ver a proibição 2 no docblock. A linha renderiza o alerta inline.
  })
}
