/**
 * Phase 7 — TanStack Query hooks for vaga config (M2).
 *
 * `configVagaKeys` hierarchy + a read query for the vaga config slice +
 * mutation wrappers for the three `configVagaService` methods, invalidating
 * `configVagaKeys.config(vagaId)` onSuccess. Mirrors `features/vagas` idioms
 * (staleTime 5min / gcTime 10min / retry 2 per CLAUDE.md).
 *
 * @module features/config-vaga/hooks/useConfigVaga
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import {
  updateVagaConfig,
  upsertOpcoesMetadata,
  publishVaga,
} from '../services/configVagaService'
import type { VagaConfig, OpcaoMetadataInput } from '../types/configVagaTypes'

// ============================================
// QUERY KEYS
// ============================================

/**
 * Hierarquia: ['config-vaga'] -> ['config-vaga','config',vagaId]
 *                             -> ['config-vaga','opcoesMetadata',perguntaId]
 */
export const configVagaKeys = {
  all: ['config-vaga'] as const,
  config: (vagaId: string) => [...configVagaKeys.all, 'config', vagaId] as const,
  opcoesMetadata: (perguntaId: string) =>
    [...configVagaKeys.all, 'opcoesMetadata', perguntaId] as const,
} as const

// ============================================
// READ — vaga config slice
// ============================================

interface UseVagaConfigOptions
  extends Omit<UseQueryOptions<VagaConfig, Error>, 'queryKey' | 'queryFn'> {}

/**
 * Read the two M2 jsonb columns (`testes_aplicaveis`, `pesos_avaliacao`) of a vaga.
 * `enabled: !!vagaId` gate (TanStack never fires for null/undefined/'').
 */
export function useVagaConfig(
  vagaId: string | null | undefined,
  options?: UseVagaConfigOptions
) {
  return useQuery({
    queryKey: configVagaKeys.config(vagaId ?? ''),
    queryFn: async (): Promise<VagaConfig> => {
      const { data, error } = await supabase
        .from('vagas')
        .select('testes_aplicaveis, pesos_avaliacao')
        .eq('id', vagaId!)
        .single()

      if (error) {
        throw new Error(`Erro ao buscar configuração da vaga: ${error.message}`)
      }

      return {
        testes_aplicaveis:
          (data?.testes_aplicaveis as VagaConfig['testes_aplicaveis']) ?? [],
        pesos_avaliacao:
          (data?.pesos_avaliacao as VagaConfig['pesos_avaliacao']) ?? {
            triagem: 0,
            work_sample_sjt: 0,
            redacao_cultural: 0,
            entrevista: 0,
          },
      }
    },
    enabled: !!vagaId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    ...options,
  })
}

// ============================================
// MUTATIONS
// ============================================

/** Persist the vaga config jsonb columns (Salvar rascunho). */
export function useUpdateVagaConfig(vagaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config: VagaConfig) => updateVagaConfig(vagaId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: configVagaKeys.config(vagaId),
      })
    },
  })
}

/** Sync the tag metadata of one pergunta via the atomic RPC. */
export function useUpsertOpcoesMetadata(vagaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      perguntaId: string
      opcoes: OpcaoMetadataInput[]
    }) => upsertOpcoesMetadata(input.perguntaId, input.opcoes),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: configVagaKeys.opcoesMetadata(input.perguntaId),
      })
      queryClient.invalidateQueries({
        queryKey: configVagaKeys.config(vagaId),
      })
    },
  })
}

/** Publish the vaga (server-side D-12 gate). */
export function usePublishVaga(vagaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => publishVaga(vagaId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: configVagaKeys.config(vagaId),
      })
    },
  })
}
