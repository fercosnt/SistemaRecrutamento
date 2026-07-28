/**
 * Phase 7 — Read hook for `pergunta_opcao_metadata` rows of a pergunta.
 *
 * Mirrors `features/vagas/hooks/useVagaPerguntas` (inline queryFn, `enabled:!!id`
 * gate). Returns the tag/peso/nota_ia rows ordered by `ordem ASC`.
 *
 * @module features/config-vaga/hooks/usePerguntaOpcaoMetadata
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { configVagaKeys } from './useConfigVaga'
import type { PerguntaOpcaoMetadataRow } from '../types/configVagaTypes'

interface UsePerguntaOpcaoMetadataOptions
  extends Omit<
    UseQueryOptions<PerguntaOpcaoMetadataRow[], Error>,
    'queryKey' | 'queryFn'
  > {}

/**
 * Hook para buscar a metadata de tags das opções de uma pergunta.
 *
 * Query: SELECT * FROM pergunta_opcao_metadata
 *        WHERE pergunta_id = ? ORDER BY ordem ASC
 *
 * @param perguntaId - UUID da pergunta (ou null/undefined para desativar)
 */
export function usePerguntaOpcaoMetadata(
  perguntaId: string | null | undefined,
  options?: UsePerguntaOpcaoMetadataOptions
) {
  return useQuery({
    queryKey: configVagaKeys.opcoesMetadata(perguntaId ?? ''),
    queryFn: async (): Promise<PerguntaOpcaoMetadataRow[]> => {
      const { data, error } = await supabase
        .from('pergunta_opcao_metadata')
        .select('*')
        .eq('pergunta_id', perguntaId!)
        .order('ordem', { ascending: true })

      if (error) {
        throw new Error(
          `Erro ao buscar metadata das opções: ${error.message}`
        )
      }
      return (data ?? []) as PerguntaOpcaoMetadataRow[]
    },
    enabled: !!perguntaId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    ...options,
  })
}
