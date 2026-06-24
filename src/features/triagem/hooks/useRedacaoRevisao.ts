/**
 * TanStack Query hook para a fila de revisão de redações RH (AVAL-07).
 *
 * Espelha o shape de `useTriagemPanel` (keys hierárquicas + useQuery staleTime 5min,
 * retry 2, enabled:!!vagaId). Consome `listRedacoesRevisao` (read allowlist) + expõe
 * uma mutation `salvarRevisao` que invalida a fila no sucesso (a fila re-ordena por
 * severidade após cada decisão). A decisão é sempre humana (RNF-07a).
 *
 * @module features/triagem/hooks/useRedacaoRevisao
 * @see src/features/triagem/hooks/useTriagemPanel.ts:24-56 (analog keys + useQuery)
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  listRedacoesRevisao,
  getDuvidasGestor,
  salvarRevisao,
  type RedacaoReviewRow,
  type SalvarRevisaoPayload,
} from '../services/revisaoRedacaoService'

/** Query keys hierárquicas (espelha triagemKeys). */
export const redacaoRevisaoKeys = {
  all: ['redacao-revisao'] as const,
  queue: (vagaId: string) => [...redacaoRevisaoKeys.all, 'queue', vagaId] as const,
  duvidas: (vagaId?: string) =>
    [...redacaoRevisaoKeys.all, 'duvidas', vagaId ?? '__all__'] as const,
}

/**
 * Hook da fila de revisão: lista as redações de uma vaga (ordenadas por severidade)
 * + expõe a mutation de salvar revisão que invalida a fila no sucesso.
 */
export function useRedacaoRevisao(
  vagaId: string | undefined,
  options?: Omit<UseQueryOptions<RedacaoReviewRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: redacaoRevisaoKeys.queue(vagaId || ''),
    queryFn: () => listRedacoesRevisao(vagaId!),
    enabled: !!vagaId,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    ...options,
  })

  const salvar = useMutation({
    mutationFn: ({
      redacaoId,
      payload,
    }: {
      redacaoId: string
      payload: SalvarRevisaoPayload
    }) => salvarRevisao(redacaoId, payload),
    onSuccess: () => {
      // Re-ordena a fila por severidade + remove a row revisada do filtro padrão.
      queryClient.invalidateQueries({ queryKey: redacaoRevisaoKeys.queue(vagaId || '') })
      queryClient.invalidateQueries({ queryKey: redacaoRevisaoKeys.duvidas() })
    },
  })

  return { ...query, salvarRevisao: salvar }
}

/**
 * Hook da fila de escalação do gestor (decisao_revisor='duvida'). In-app only —
 * a notificação ao gestor está fora de escopo (Open Question 4).
 */
export function useDuvidasGestor(
  vagaId?: string,
  options?: Omit<UseQueryOptions<RedacaoReviewRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: redacaoRevisaoKeys.duvidas(vagaId),
    queryFn: () => getDuvidasGestor(vagaId),
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    ...options,
  })
}
