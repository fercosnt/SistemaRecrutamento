/**
 * useConfirmarJanela — confirmar a janela de um estado **sem alterá-la** (RETEN-02 / D-46-22).
 *
 * ── POR QUE ISTO É UMA MUTAÇÃO SEPARADA, E NÃO UM `useSalvarJanela` COM O MESMO VALOR
 *
 * Porque as duas ações **afirmam coisas diferentes**, e é a afirmação que está sendo
 * registrada. Salvar diz «mudei de X para Y»; confirmar diz «olhei e mantive N». O
 * servidor recusa a primeira quando não há mudança — corretamente, porque a trilha não
 * pode alegar uma alteração que não houve —, e é a segunda que o portão do flip da purga
 * precisa: `origem` deixa de ser `'seed'` («ninguém contestou») e passa a `'admin'`
 * («alguém decidiu»), sem que o número se mova.
 *
 * ⚠ A invalidação é a MESMA DUPLA da irmã, e não por simetria decorativa: confirmar não
 * muda `janela_meses`, mas muda `origem`, `alterado_por` e `atualizado_em` — as três
 * colunas que a tabela EXIBE. Invalidar só a prévia deixaria a linha dizendo «Seed (teto
 * consentido)» logo depois de alguém tê-la confirmado. A prévia entra junto porque ela é
 * derivada da matriz e o custo de invalidar a mais é uma releitura; o custo de invalidar
 * a menos é um fato obsoleto exibido como atual.
 *
 * ── O QUE ESTE HOOK NÃO FAZ
 *  · **Nenhum `onMutate` otimista.** Uma linha marcada «Alterado por você» enquanto o
 *    servidor ainda diz `seed` seria uma atestação que existe só na tela — e atestação
 *    é exatamente a coisa que este caminho serve para produzir.
 *  · **Nenhuma decisão de autorização.** O `42501` do servidor é o controle.
 *
 * @module features/admin/retencao/hooks/useConfirmarJanela
 * @see supabase/migrations/20260907000001_confirmar_janela_retencao.sql (o contrato vivo)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { confirmarJanela } from '../services/retencaoService'
import type { EtapaFunilM2 } from '@/features/triagem/services/triagemService'
import { retencaoKeys } from './useMatrizRetencao'

/**
 * Copy do toast.
 *
 * ⚠ A mensagem de sucesso NÃO pode dizer «atualizada» — é a palavra da irmã, e aqui nada
 * foi atualizado. Dizer «atualizada» seria a tela repetindo, em pt-BR, a mesma mentira
 * que o guard de no-op do servidor existe para impedir na trilha.
 */
export const COPY_TOAST_CONFIRMAR = {
  sucesso: 'Janela confirmada. O valor não mudou — fica registrado que você a revisou.',
  erro: 'Não foi possível confirmar a janela. Tente novamente.',
} as const

export function useConfirmarJanela() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, EtapaFunilM2>({
    mutationKey: [...retencaoKeys.all, 'confirmar-janela'],
    mutationFn: confirmarJanela,
    onSuccess: () => {
      toast.success(COPY_TOAST_CONFIRMAR.sucesso)
      void queryClient.invalidateQueries({ queryKey: retencaoKeys.matriz() })
      void queryClient.invalidateQueries({ queryKey: retencaoKeys.previa() })
    },
    onError: () => {
      toast.error(COPY_TOAST_CONFIRMAR.erro)
    },
  })
}
