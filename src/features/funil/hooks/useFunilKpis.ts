/**
 * useFunilKpis — TanStack Query hook for the operational-KPI dashboard (KPI-02/04).
 *
 * Mirrors the house `entrevistaKeys` factory + `useQuery(staleTime 5min, retry 2)` shape
 * (`src/features/entrevista/hooks/useEntrevistaScorecard.ts:39-63`). Reads the single
 * `getFunilKpis` data path (the `funil_kpis` DEFINER RPC) — never a client-side aggregation.
 *
 * @module features/funil/hooks/useFunilKpis
 * @see src/features/funil/services/funilKpisService.ts
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { getFunilKpis, type FunilKpis } from '../services/funilKpisService'

/** Hierarchical query-key namespace (mirrors `entrevistaKeys`). */
export const funilKpisKeys = {
  all: ['funil-kpis'] as const,
  byVaga: (vagaId: string | null) => [...funilKpisKeys.all, vagaId ?? 'todas'] as const,
}

const STALE = 5 * 60 * 1000

/**
 * The KPI dashboard hook — reads the 7-key `funil_kpis` payload for `vagaId` (null = all
 * owned vagas). House `useQuery` config: 5min stale + 2 retries.
 */
export function useFunilKpis(
  vagaId: string | null,
  options?: Omit<UseQueryOptions<FunilKpis, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: funilKpisKeys.byVaga(vagaId),
    queryFn: () => getFunilKpis(vagaId),
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}
