/**
 * useConsolidacao — query que invoca a EF `consolidar-decisao-final` (DECISAO-01).
 *
 * `useQuery` que envolve `decisaoService.getConsolidacao`. Em erro dispara um toast
 * (sonner) com a cópia pt-BR do erro de carregamento. Habilitada só quando ambos os
 * ids estão presentes. O resultado é o `{ consolidated, breakdown, recommendation }`
 * que o `ConsolidacaoDashboard` renderiza.
 *
 * @module features/decisao/hooks/useConsolidacao
 * @see src/features/triagem/hooks/useComparativo.ts (o analog query/mutation sobre um invoke da EF)
 * @see src/features/decisao/services/decisaoService.ts (getConsolidacao + error map)
 */

import { useQuery } from '@tanstack/react-query'
import { getConsolidacao } from '../services/decisaoService'
import type { ConsolidacaoResponse } from '../schemas/consolidacaoSchema'

/** Query keys hierárquicas da feature de decisão. */
export const decisaoKeys = {
  all: ['decisao'] as const,
  consolidacao: (candidaturaId: string, vagaId: string) =>
    [...decisaoKeys.all, 'consolidacao', candidaturaId, vagaId] as const,
  finalistas: (vagaId: string) => [...decisaoKeys.all, 'finalistas', vagaId] as const,
  atual: (candidaturaId: string) => [...decisaoKeys.all, 'atual', candidaturaId] as const,
}

/**
 * Carrega a consolidação de uma candidatura via a EF. O `isError` da query dirige
 * o estado de erro do `ConsolidacaoDashboard` (cópia pt-BR do UI-SPEC) — segue o
 * padrão do codebase (useAiCosts/ScorecardAvaliacao: o componente renderiza o erro,
 * não um onError na query — removido no TanStack Query v5).
 */
export function useConsolidacao(candidaturaId: string | undefined, vagaId: string | undefined) {
  return useQuery<ConsolidacaoResponse, Error>({
    queryKey: decisaoKeys.consolidacao(candidaturaId ?? '', vagaId ?? ''),
    queryFn: () => getConsolidacao(candidaturaId!, vagaId!),
    enabled: !!candidaturaId && !!vagaId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}
