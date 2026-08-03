/**
 * useSalvarJanela — a única escrita de `/admin/retencao` (RETEN-02).
 *
 * ── POR QUE A INVALIDAÇÃO É DUPLA, E POR QUE ISSO NÃO É ZELO ─────────────────────
 * A mutação invalida a **matriz E a prévia**. A prévia é DERIVADA da janela: mudar a
 * janela de um estado muda quantas candidaturas estão além dela. Invalidar só a matriz
 * deixaria, logo abaixo da tabela recém-alterada, um número calculado com a política
 * ANTIGA — um fato numérico obsoleto exibido ao lado do fato que o tornou obsoleto, sem
 * nenhum sinal de que é velho. É por isso que `retencaoKeys.matriz()` e
 * `retencaoKeys.previa()` são irmãs sob a mesma raiz.
 *
 * ── O QUE ESTE HOOK NÃO FAZ ─────────────────────────────────────────────────────
 *  · **Nenhum `onMutate` otimista.** Uma tabela mostrando "12 meses" enquanto o servidor
 *    guarda 24 é uma política de retenção que existe só na tela. O valor exibido vem da
 *    releitura, sempre.
 *  · **Nenhuma decisão de teto.** O `22023` do servidor é o controle; ver o docblock de
 *    `janelaRetencaoSchema`.
 *
 * O erro vira `toast.error` — e aqui o toast é adequado (ao contrário do consentimento do
 * candidato, no 43-08): o diálogo permanece aberto com o valor digitado preservado, então
 * o estado de "não salvou" continua visível na tela mesmo depois de o toast sumir.
 *
 * @module features/admin/retencao/hooks/useSalvarJanela
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { salvarJanela, type SalvarJanelaVars } from '../services/retencaoService'
import { retencaoKeys } from './useMatrizRetencao'

/** Copy verbatim da 43-UI-SPEC (§Diálogo "Editar janela de retenção"). */
export const COPY_TOAST_JANELA = {
  sucesso: 'Janela de retenção atualizada.',
  erro: 'Não foi possível salvar a janela. Tente novamente.',
} as const

export function useSalvarJanela() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, SalvarJanelaVars>({
    mutationKey: [...retencaoKeys.all, 'salvar-janela'],
    mutationFn: salvarJanela,
    // Sem `onMutate`: nada é antecipado. Ver o docblock.
    onSuccess: () => {
      toast.success(COPY_TOAST_JANELA.sucesso)
      void queryClient.invalidateQueries({ queryKey: retencaoKeys.matriz() })
      void queryClient.invalidateQueries({ queryKey: retencaoKeys.previa() })
    },
    onError: () => {
      toast.error(COPY_TOAST_JANELA.erro)
    },
  })
}
