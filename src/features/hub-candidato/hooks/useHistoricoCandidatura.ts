/**
 * useHistoricoCandidatura — TanStack Query hook for the RH history feed (VISRH-03).
 *
 * Mirrors the Phase-13 `useEntrevistaScorecard` shape verbatim: a hierarchical
 * query-key factory + `useQuery(staleTime 5min, gcTime 5min, retry 2, enabled:!!id)`.
 * The read goes through the allowlist service layer (never `select('*')`).
 *
 * @module features/hub-candidato/hooks/useHistoricoCandidatura
 * @see src/features/entrevista/hooks/useEntrevistaScorecard.ts (analog keys + useQuery config)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { listHistorico, type HistoricoRow } from '../services/historicoCandidaturaService'

/** Hierarchical query-key namespace (mirrors `entrevistaKeys`). */
export const historicoKeys = {
  all: ['historico-candidatura'] as const,
  lista: (id: string) => [...historicoKeys.all, 'lista', id] as const,
}

const STALE = 5 * 60 * 1000

/**
 * Reads the newest-first etapa-transition feed for one candidatura (RH surface).
 * `candidaturaId` is the `:id` route param (Pitfall 8).
 */
export function useHistoricoCandidatura(
  candidaturaId: string | undefined,
  options?: Omit<UseQueryOptions<HistoricoRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: historicoKeys.lista(candidaturaId || ''),
    queryFn: () => listHistorico(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}
