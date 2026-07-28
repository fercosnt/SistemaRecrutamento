/**
 * useFilaTrabalho — TanStack Query hook for the cross-vaga work queue (KPI-01).
 *
 * Mirrors the house `useEntrevistaScorecard` / `useHistoricoCandidatura` shape verbatim:
 * a hierarchical query-key factory + `useQuery(staleTime 5min, gcTime 5min, retry 2)`.
 * The read goes through the allowlist service layer (never `select('*')`). The queue is
 * cross-vaga (no id param) — the view's inherited RLS is the only scope.
 *
 * @module features/funil/hooks/useFilaTrabalho
 * @see src/features/entrevista/hooks/useEntrevistaScorecard.ts (analog keys + useQuery config)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { listFila, type FilaRow } from '../services/filaTrabalhoService'

/** Hierarchical query-key namespace (mirrors `entrevistaKeys` / `historicoKeys`). */
export const filaKeys = {
  all: ['fila-trabalho'] as const,
  lista: () => [...filaKeys.all, 'lista'] as const,
}

const STALE = 5 * 60 * 1000

/**
 * Reads the cross-vaga work queue, oldest-waiting first. No arguments — the queue spans
 * every vaga the RH owns (view-inherited RLS scope).
 */
export function useFilaTrabalho(
  options?: Omit<UseQueryOptions<FilaRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: filaKeys.lista(),
    queryFn: () => listFila(),
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}
