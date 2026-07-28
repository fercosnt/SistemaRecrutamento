/**
 * useAgendamento — TanStack Query hook for the RH interview-scheduling surface
 * (AGEND-02/03).
 *
 * Mirrors the `entrevistaKeys` / `useEntrevistaScorecard` shape verbatim: a
 * hierarchical query-key factory + `useQuery(staleTime/gcTime 5min, retry 2,
 * enabled:!!id)` for the read, plus `agendar`/`reagendar`/`cancelar`/`setCompareceu`
 * mutations that invalidate the SAME key on success so the block re-renders with the
 * fresh row. The write path is the allowlist-safe service (never a star projection;
 * payloads exclude the trigger-stamped columns).
 *
 * @module features/agendamento/hooks/useAgendamento
 * @see src/features/entrevista/hooks/useEntrevistaScorecard.ts (analog keys + useQuery + mutation)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAgendamento,
  agendar as agendarSvc,
  reagendar as reagendarSvc,
  cancelar as cancelarSvc,
  setCompareceu as setCompareceuSvc,
  type AgendarInput,
  type ReagendarInput,
} from '../services/agendamentoService'

/** Hierarchical query-key namespace (mirrors `entrevistaKeys`). */
export const agendamentoKeys = {
  all: ['agendamento'] as const,
  byCandidatura: (id: string) => [...agendamentoKeys.all, id] as const,
}

const STALE = 5 * 60 * 1000

/**
 * Reads the latest agendamento for a candidatura and exposes the four write
 * mutations. Every mutation invalidates the read key on success (≤ staleTime
 * freshness). `enabled:!!candidaturaId` — no read fires without an id.
 */
export function useAgendamento(candidaturaId: string | undefined) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: agendamentoKeys.byCandidatura(candidaturaId || ''),
    queryFn: () => getAgendamento(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: agendamentoKeys.byCandidatura(candidaturaId || ''),
    })

  const agendar = useMutation({
    mutationFn: (input: AgendarInput) => agendarSvc(candidaturaId!, input),
    onSuccess: invalidate,
  })

  const reagendar = useMutation({
    mutationFn: (vars: { id: string; input: ReagendarInput }) =>
      reagendarSvc(vars.id, vars.input),
    onSuccess: invalidate,
  })

  const cancelar = useMutation({
    mutationFn: (id: string) => cancelarSvc(id),
    onSuccess: invalidate,
  })

  const setCompareceu = useMutation({
    mutationFn: (vars: { id: string; value: boolean | null }) =>
      setCompareceuSvc(vars.id, vars.value),
    onSuccess: invalidate,
  })

  return { ...query, agendar, reagendar, cancelar, setCompareceu }
}
