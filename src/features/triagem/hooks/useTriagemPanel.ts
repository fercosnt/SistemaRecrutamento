/**
 * TanStack Query hook para o painel de triagem RH (TRIAGEM-02).
 *
 * Espelha o shape de `useCandidaturas` (keys hierárquicas + useQuery staleTime 5min,
 * retry 2, enabled:!!vagaId). Consome `listTriagemPanel` (read allowlist) e expõe
 * `triagemKeys` para invalidação após reprocess/comparativo.
 *
 * @module features/triagem/hooks/useTriagemPanel
 * @see src/features/vagas/hooks/useCandidaturas.ts:51-117 (analog keys + useQuery)
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { PaginationParams } from '@/features/vagas/types/vagasTypes'
import {
  listTriagemPanel,
  type TriagemFilters,
  type TriagemOrderBy,
  type TriagemPanelResponse,
} from '../services/triagemService'

/**
 * Query keys hierárquicas (espelha candidaturasKeys).
 */
export const triagemKeys = {
  all: ['triagem'] as const,
  panel: (
    vagaId: string,
    filters?: TriagemFilters,
    orderBy?: TriagemOrderBy,
    pagination?: PaginationParams,
  ) => [...triagemKeys.all, 'panel', vagaId, { filters, orderBy, pagination }] as const,
  comparativo: (vagaId: string, ids: string[]) =>
    [...triagemKeys.all, 'comparativo', vagaId, ids.slice().sort()] as const,
}

/**
 * Hook do painel de triagem: lista candidaturas de uma vaga com score IA,
 * paginadas 20/página, ordenadas score_match DESC nulls-last.
 */
export function useTriagemPanel(
  vagaId: string | undefined,
  filters: TriagemFilters = {},
  orderBy: TriagemOrderBy = 'score_desc',
  pagination: PaginationParams = { page: 1, limit: 20 },
  options?: Omit<UseQueryOptions<TriagemPanelResponse, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: triagemKeys.panel(vagaId || '', filters, orderBy, pagination),
    queryFn: () => listTriagemPanel(vagaId!, filters, orderBy, pagination),
    enabled: !!vagaId,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    ...options,
  })
}
