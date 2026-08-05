/**
 * usePedirExclusao — a mutation que **é** o pedido de exclusão (ERASE-06).
 *
 * TRÊS AUSÊNCIAS QUE SÃO O PONTO DO HOOK, não detalhe de implementação:
 *
 *  1. **NUNCA `onMutate`.** UI otimista sobre uma escrita destrutiva é a categoria
 *     errada de mentira, e a Invariante 5 da 45-UI-SPEC a proíbe explicitamente
 *     nesta página: a tela **nunca declara conclusão antes de os três sistemas
 *     confirmarem**. Antecipar aqui seria afirmar um efeito irreversível que ainda
 *     não aconteceu — e que pode não acontecer.
 *
 *  2. **NENHUM `toast`.** Todo desfecho desta fase é persistente por definição. Um
 *     aviso de 4 segundos sobre uma exclusão irreversível é a forma errada de dizer
 *     qualquer coisa aqui. Quem renderiza o resultado é o `ExcluirDadosBloco`.
 *
 *  3. **SEM `onError`.** O bloco renderiza o alerta inline persistente, com a única
 *     copy em que "Nada foi apagado." é permitida — a da falha do REGISTRO, que
 *     acontece antes de qualquer mutação.
 *
 * O `onSuccess` invalida a leitura de estado para que a tela passe ao Estado B a
 * partir do que o SERVIDOR devolveu, nunca do que foi pedido.
 *
 * @module features/privacidade/hooks/usePedirExclusao
 * @see src/features/privacidade/hooks/useExportarMeusDados.ts (o molde de mutation)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invocarPedirExclusao, type RespostaPedirExclusao } from '../services/exclusaoService'
import { privacidadeKeys } from './usePrivacidade'

/** Chave da mutation — hierárquica, no idioma de `privacidadeKeys`. */
export const exclusaoMutationKey = ['privacidade', 'pedir-exclusao'] as const

export function usePedirExclusao(candidatoId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation<RespostaPedirExclusao, Error, void>({
    mutationKey: [...exclusaoMutationKey],
    mutationFn: () => invocarPedirExclusao(),
    // Sem `onMutate`: nada é antecipado. Ver a ausência 1 no docblock.
    onSuccess: () => {
      // Reler o estado é o que faz a tela passar ao Estado B pelo FATO do servidor.
      void queryClient.invalidateQueries({
        queryKey: privacidadeKeys.pedidoExclusao(candidatoId),
      })
    },
    // Sem `onError`: o bloco renderiza o alerta inline persistente.
  })
}
