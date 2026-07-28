/**
 * useAnaliseCandidato — TanStack Query hook for the RH-only hub IA analysis (VISRH-02).
 *
 * Mirrors the Phase-13 `useEntrevistaScorecard` shape verbatim: a hierarchical
 * query-key factory + `useQuery(staleTime 5min, gcTime 5min, retry 2, enabled:!!id)`.
 * The read goes through the allowlist service layer (never `select('*')`); the AI is
 * always a suggestion, the human always decides (RNF-07a).
 *
 * @module features/hub-candidato/hooks/useAnaliseCandidato
 * @see src/features/entrevista/hooks/useEntrevistaScorecard.ts (analog keys + useQuery config)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { getAnalise, type AnaliseHubRow } from '../services/analiseCandidatoService'

/** Hierarchical query-key namespace (mirrors `entrevistaKeys`). */
export const analiseHubKeys = {
  all: ['analise-hub'] as const,
  analise: (id: string) => [...analiseHubKeys.all, 'analise', id] as const,
}

const STALE = 5 * 60 * 1000

/**
 * Reads the IA analysis for one candidatura (RH surface). Returns null when no
 * analysis row exists (the block renders its "Análise ainda não disponível" empty
 * state). `candidaturaId` is the `:id` route param (Pitfall 8).
 */
export function useAnaliseCandidato(
  candidaturaId: string | undefined,
  options?: Omit<UseQueryOptions<AnaliseHubRow | null, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: analiseHubKeys.analise(candidaturaId || ''),
    queryFn: () => getAnalise(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}
