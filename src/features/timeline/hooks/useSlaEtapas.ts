/**
 * `useSlaEtapas` — hook TanStack Query da config estática de prazos (`config_sla_etapa`),
 * consumido pelo painel do candidato para exibir a estimativa de prazo por etapa (TIMELINE-02).
 *
 * A config só muda por migration, então `staleTime: Infinity` (nunca refetch por tempo).
 * O hook expõe um lookup O(1) por `etapa` e o helper `rotuloDeEspera`, que devolve o texto
 * candidate-facing SÓ quando a etapa é um estado de espera (prazo_valor não-nulo).
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarSlaEtapas } from '../services/slaService'
import type { SlaEtapa } from '../types/timelineTypes'

/** Query keys hierárquicas da feature. */
export const slaKeys = {
  all: ['sla-etapas'] as const,
}

/**
 * Retorna o `rotulo_candidato` da etapa **apenas** quando ela é um estado de espera —
 * i.e. tem um `prazo_valor` não-nulo. Etapas terminais sem prazo (ex.: `aprovado`) e
 * `undefined` (etapa stale/M1 ausente do config) devolvem `null` → o painel não mostra linha.
 */
export function rotuloDeEspera(sla: SlaEtapa | undefined): string | null {
  if (!sla) return null
  if (sla.prazo_valor == null) return null
  const rotulo = sla.rotulo_candidato?.trim()
  return rotulo ? rotulo : null
}

export interface UseSlaEtapasResult {
  isLoading: boolean
  error: unknown
  /** Lookup O(1) por `etapa` (chave = valor do enum etapa_processo). */
  lookup: Map<string, SlaEtapa>
}

export function useSlaEtapas(): UseSlaEtapasResult {
  const { data, isLoading, error } = useQuery({
    queryKey: slaKeys.all,
    queryFn: listarSlaEtapas,
    staleTime: Infinity, // config estática — só muda por migration
  })

  const lookup = useMemo(() => {
    const m = new Map<string, SlaEtapa>()
    for (const row of data ?? []) m.set(row.etapa, row)
    return m
  }, [data])

  return { isLoading, error, lookup }
}
