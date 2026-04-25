/**
 * Phase 4 / CAND-02 — TanStack Query hook for fetching screening perguntas of a vaga.
 *
 * Cache key independent from useVaga(). Returns perguntas ordered by `ordem ASC`,
 * filtered to non-deleted rows. Empty array if vaga has no perguntas configured
 * (per D-14, this is valid — submit proceeds without respostas).
 *
 * Source: RESEARCH.md §useVagaPerguntas Hook Spec (L1611-1671)
 * Decisions honored: D-11 (separate cache hook), D-14 (empty perguntas allowed).
 *
 * Pitfall watch:
 * - Pitfall 7: hook does not log; just queries (no PII or token surface).
 * - `enabled: !!vagaId` is the gate — `null`, `undefined`, and `''` all
 *   produce `enabled: false` (TanStack Query never fires).
 *
 * @module features/vagas/hooks/useVagaPerguntas
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { vagasKeys } from './useVagas'
import type { PerguntaFormulario } from '../schemas/candidaturaFormSchema'

interface UseVagaPerguntasOptions
  extends Omit<
    UseQueryOptions<PerguntaFormulario[], Error>,
    'queryKey' | 'queryFn'
  > {}

/**
 * Hook para buscar perguntas de triagem de uma vaga.
 *
 * Query: SELECT * FROM perguntas_formulario
 *        WHERE vaga_id = ? AND deleted_at IS NULL
 *        ORDER BY ordem ASC
 *
 * Cache:
 *   - Query key: vagasKeys.perguntas(vagaId) — declarado em Plan 04-02
 *   - staleTime: 5 min (perguntas raramente mudam)
 *   - gcTime: 10 min (mantém em cache para revisitas)
 *
 * @param vagaId - UUID da vaga (ou null/undefined para desativar)
 * @param options - Opções extras do TanStack Query
 * @returns Query result com array (nunca undefined quando isSuccess)
 *
 * @example
 * const { data: perguntas, isLoading } = useVagaPerguntas(vagaId)
 * // perguntas: PerguntaFormulario[] (vazio se vaga sem perguntas — D-14)
 */
export function useVagaPerguntas(
  vagaId: string | null | undefined,
  options?: UseVagaPerguntasOptions
) {
  return useQuery({
    queryKey: vagasKeys.perguntas(vagaId ?? ''),
    queryFn: async (): Promise<PerguntaFormulario[]> => {
      const { data, error } = await supabase
        .from('perguntas_formulario')
        .select('*')
        .eq('vaga_id', vagaId!)
        .is('deleted_at', null)
        .order('ordem', { ascending: true })

      if (error) {
        throw new Error(`Erro ao buscar perguntas: ${error.message}`)
      }
      return (data ?? []) as PerguntaFormulario[]
    },
    enabled: !!vagaId,
    staleTime: 5 * 60 * 1000, // 5 min — perguntas rarely change
    gcTime: 10 * 60 * 1000, // 10 min in cache
    retry: 2,
    ...options,
  })
}
