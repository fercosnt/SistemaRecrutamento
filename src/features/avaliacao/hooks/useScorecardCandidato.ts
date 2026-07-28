/**
 * TanStack Query hook for the RH scorecard read (AVAL-02/03).
 *
 * Mirrors `useTriagemPanel`: a `useQuery` keyed by candidaturaId with the project
 * staleTime/retry defaults (5min, retry 2). Consumes `scoresRhService.getScores`
 * (allowlist read; candidate denied by RLS). The candidate never reaches this
 * hook — it lives in the desktop RH shell.
 *
 * @module features/avaliacao/hooks/useScorecardCandidato
 * @see src/features/triagem/hooks/useTriagemPanel.ts (analog keys + useQuery)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { getScores, type ScoreRow } from '../services/scoresRhService'

/** Query keys for the scorecard read. */
export const scorecardKeys = {
  all: ['scorecard-avaliacao'] as const,
  byCandidatura: (candidaturaId: string) =>
    [...scorecardKeys.all, candidaturaId] as const,
}

/**
 * Reads the SJT scores for a candidatura (RH read-only). Disabled until a
 * candidaturaId is present; project staleTime (5min) + retry 2 defaults.
 */
export function useScorecardCandidato(
  candidaturaId: string | undefined,
  options?: Omit<UseQueryOptions<ScoreRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: scorecardKeys.byCandidatura(candidaturaId || ''),
    queryFn: () => getScores(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    ...options,
  })
}
