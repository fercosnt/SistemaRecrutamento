/**
 * useCancelarExclusao — a mutation que interrompe a exclusão dentro da janela (ERASE-06).
 *
 * TRÊS AUSÊNCIAS, e aqui elas pesam mais do que no `usePedirExclusao`:
 *
 *  1. **NUNCA `onMutate`.** A Invariante 5 proíbe a tela declarar desfecho antes de o
 *     servidor confirmar — e neste caminho a mentira otimista seria a pior das duas
 *     possíveis: mostrar "exclusão cancelada" sobre um cancelamento que falhou deixaria
 *     a pessoa tranquila enquanto o relógio da destruição continua correndo.
 *
 *  2. **NENHUM `toast`.** O desfecho do cancelamento é persistente por definição: quem
 *     acabou de interromper a destruição dos próprios dados precisa poder reler que
 *     interrompeu. Um aviso de 4 segundos é a forma errada de dizer isso.
 *
 *  3. **SEM `onError`.** O bloco renderiza o alerta inline com a copy PRÓPRIA do
 *     cancelamento — a que diz que o pedido **continua agendado para a data** e nomeia
 *     o canal humano. A copy do pedido ("Nada foi apagado.") é proibida aqui.
 *
 * O `onSuccess` invalida a leitura de estado: a tela sai do Estado B pelo FATO que o
 * servidor devolveu, nunca pelo que foi pedido.
 *
 * @module features/privacidade/hooks/useCancelarExclusao
 * @see src/features/privacidade/hooks/usePedirExclusao.ts (o irmão simétrico)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  invocarCancelarExclusao,
  type RespostaCancelarExclusao,
} from '../services/exclusaoService'
import { privacidadeKeys } from './usePrivacidade'

/** Chave da mutation — hierárquica, no idioma de `privacidadeKeys`. */
export const cancelamentoMutationKey = ['privacidade', 'cancelar-exclusao'] as const

export function useCancelarExclusao(candidatoId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation<RespostaCancelarExclusao, Error, void>({
    mutationKey: [...cancelamentoMutationKey],
    mutationFn: () => invocarCancelarExclusao(),
    // Sem `onMutate`: nada é antecipado. Ver a ausência 1 no docblock.
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: privacidadeKeys.pedidoExclusao(candidatoId),
      })
    },
    // Sem `onError`: o bloco renderiza o alerta inline persistente do cancelamento.
  })
}
