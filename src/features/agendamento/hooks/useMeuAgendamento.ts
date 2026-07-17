/**
 * useMeuAgendamento — TanStack Query read hook for the CANDIDATE agendamento card
 * (AGEND-04). The read-only mirror of `useAgendamento`'s read half: a hierarchical
 * query-key factory + `useQuery(staleTime/gcTime 5min, retry 2, enabled:!!id)`. The
 * candidate never writes, so the four RH mutations are dropped.
 *
 * `enabled:!!candidaturaId` is the seam that keeps the DEFINER RPC from firing without
 * an id — belt-and-suspenders with the parent (Plan 35-02) mounting the card only for
 * the two entrevista etapas.
 *
 * @module features/agendamento/hooks/useMeuAgendamento
 * @see src/features/agendamento/hooks/useAgendamento.ts (analog keys + useQuery read half)
 * @see src/features/agendamento/services/agendamentoCandidatoService.ts (the RPC read)
 */
import { useQuery } from '@tanstack/react-query'
import { getMeuAgendamento } from '../services/agendamentoCandidatoService'

/** Hierarchical query-key namespace (mirrors `agendamentoKeys`). */
export const meuAgendamentoKeys = {
  all: ['meu-agendamento'] as const,
  byCandidatura: (id: string) => [...meuAgendamentoKeys.all, id] as const,
}

const STALE = 5 * 60 * 1000

/**
 * Reads the candidate's own latest agendamento via the `get_meu_agendamento` RPC.
 * `enabled:!!candidaturaId` — no read fires without an id.
 */
export function useMeuAgendamento(candidaturaId: string | undefined) {
  return useQuery({
    queryKey: meuAgendamentoKeys.byCandidatura(candidaturaId || ''),
    queryFn: () => getMeuAgendamento(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
  })
}
