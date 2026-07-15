/**
 * TanStack Query Hooks para Candidaturas
 *
 * Hooks para:
 * - Criar nova candidatura (mutation)
 * - Listar candidaturas do candidato
 * - Verificar duplicatas
 * - Update de status (HR)
 *
 * @module features/vagas/hooks/useCandidaturas
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import {
  createCandidatura,
  listCandidaturas,
  listCandidaturasByVaga,
  listAllCandidaturas,
  checkDuplicateApplication,
  updateCandidaturaStatus,
} from '../services/candidaturasService'
import {
  updateCandidaturaEtapa,
  type EtapaFunilM2,
} from '@/features/triagem/services/triagemService'
import { vagasKeys } from './useVagas'
import type {
  Candidatura,
  CreateCandidaturaRequest,
  CreateCandidaturaResponse,
  ListCandidaturasResponse,
  CandidaturasFilters,
  CandidaturasOrderBy,
  PaginationParams,
  CheckDuplicateApplicationResponse,
  UpdateCandidaturaStatusRequest,
  UpdateCandidaturaStatusResponse,
} from '../types/vagasTypes'

// ============================================
// QUERY KEYS
// ============================================

/**
 * Query keys para candidaturas
 */
export const candidaturasKeys = {
  all: ['candidaturas'] as const,
  lists: () => [...candidaturasKeys.all, 'list'] as const,
  list: (
    candidatoId: string,
    filters?: CandidaturasFilters,
    orderBy?: CandidaturasOrderBy,
    pagination?: PaginationParams
  ) =>
    [...candidaturasKeys.lists(), candidatoId, { filters, orderBy, pagination }] as const,
  listByVaga: (
    vagaId: string,
    filters?: CandidaturasFilters,
    orderBy?: CandidaturasOrderBy,
    pagination?: PaginationParams
  ) =>
    [...candidaturasKeys.lists(), 'by-vaga', vagaId, { filters, orderBy, pagination }] as const,
  duplicateCheck: (candidatoId: string, vagaId: string) =>
    [...candidaturasKeys.all, 'duplicateCheck', candidatoId, vagaId] as const,
}

// ============================================
// HOOKS - LIST CANDIDATURAS
// ============================================

/**
 * Hook para listar candidaturas do candidato autenticado
 *
 * @param filters - Filtros opcionais
 * @param orderBy - Ordenação
 * @param pagination - Paginação
 * @param options - Opções do TanStack Query
 *
 * @returns Query result com lista de candidaturas
 *
 * @example
 * const { data: candidaturas, isLoading } = useCandidaturas({
 *   status: 'aguardando_resposta'
 * })
 */
export function useCandidaturas(
  filters?: CandidaturasFilters,
  orderBy: CandidaturasOrderBy = 'mais_recentes',
  pagination: PaginationParams = { page: 1, limit: 20 },
  options?: Omit<
    UseQueryOptions<ListCandidaturasResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  const candidato = useAuthStore((state) => state.candidato)

  return useQuery({
    queryKey: candidaturasKeys.list(
      candidato?.id || '',
      filters,
      orderBy,
      pagination
    ),
    queryFn: () =>
      listCandidaturas(candidato!.id, filters, orderBy, pagination),
    enabled: !!candidato?.id,
    staleTime: 1 * 60 * 1000, // 1 minuto (status pode mudar)
    gcTime: 5 * 60 * 1000,
    retry: 2,
    // PERF-04 freshness: the candidate dashboard re-reads its own status on tab
    // refocus so a cross-client RH write is visible in ≤60s. PER-QUERY only — the
    // global QueryClient default stays false (App.tsx:43); flipping it would refetch
    // expensive RH/AI reads. Needs BOTH refetchOnWindowFocus AND staleTime ≤60s to
    // fire (RESEARCH Pitfall 5). useCandidaturas is the only candidate-visible
    // mutable-status read needing this (audit: useExplicacao is static; RH reads OOS).
    refetchOnWindowFocus: true,
    ...options,
  })
}

/**
 * Hook para listar TODAS as candidaturas (HR apenas) - sem filtro de vaga
 * Usado na página CandidatosRHPage
 *
 * @param filters - Filtros opcionais
 * @param orderBy - Ordenação
 * @param pagination - Paginação
 * @param options - Opções do TanStack Query
 *
 * @returns Query result com lista de candidaturas (com candidato e vaga)
 *
 * @example
 * const { data: candidaturas, isLoading } = useAllCandidaturas({
 *   status: 'em_analise'
 * })
 */
export function useAllCandidaturas(
  filters?: CandidaturasFilters,
  orderBy: CandidaturasOrderBy = 'mais_recentes',
  pagination: PaginationParams = { page: 1, limit: 50 },
  options?: Omit<
    UseQueryOptions<ListCandidaturasResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: [
      ...candidaturasKeys.lists(),
      'all-candidaturas',
      { filters, orderBy, pagination },
    ] as const,
    queryFn: () => listAllCandidaturas(filters, orderBy, pagination),
    staleTime: 30 * 1000, // 30 segundos (status pode mudar rapidamente no painel HR)
    gcTime: 2 * 60 * 1000,
    retry: 2,
    ...options,
  })
}

/**
 * Hook para listar candidaturas de uma vaga específica (HR apenas)
 *
 * @param vagaId - UUID da vaga
 * @param filters - Filtros opcionais
 * @param orderBy - Ordenação
 * @param pagination - Paginação
 * @param options - Opções do TanStack Query
 *
 * @returns Query result com lista de candidaturas (com dados do candidato)
 *
 * @example
 * const { data: candidaturas, isLoading } = useVagaCandidaturas('vaga-123', {
 *   status: 'em_analise'
 * })
 */
export function useVagaCandidaturas(
  vagaId: string | null | undefined,
  filters?: CandidaturasFilters,
  orderBy: CandidaturasOrderBy = 'mais_recentes',
  pagination: PaginationParams = { page: 1, limit: 50 },
  options?: Omit<
    UseQueryOptions<ListCandidaturasResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: candidaturasKeys.listByVaga(
      vagaId || '',
      filters,
      orderBy,
      pagination
    ),
    queryFn: () =>
      listCandidaturasByVaga(vagaId!, filters, orderBy, pagination),
    enabled: !!vagaId,
    staleTime: 30 * 1000, // 30 segundos (status pode mudar rapidamente no painel HR)
    gcTime: 2 * 60 * 1000,
    retry: 2,
    ...options,
  })
}

// ============================================
// HOOKS - CHECK DUPLICATE
// ============================================

/**
 * Hook para verificar se candidatura é duplicada
 *
 * @param vagaId - UUID da vaga
 * @param options - Opções do TanStack Query
 *
 * @returns Query result com status de duplicata
 *
 * @example
 * const { data: duplicateCheck } = useCheckDuplicate('vaga-123')
 */
export function useCheckDuplicate(
  vagaId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<CheckDuplicateApplicationResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  const candidato = useAuthStore((state) => state.candidato)

  return useQuery({
    queryKey: candidaturasKeys.duplicateCheck(candidato?.id || '', vagaId || ''),
    queryFn: () => checkDuplicateApplication(candidato!.id, vagaId!),
    enabled: !!candidato?.id && !!vagaId,
    staleTime: 30 * 1000, // 30 segundos (pode mudar rapidamente)
    gcTime: 1 * 60 * 1000,
    retry: 1,
    ...options,
  })
}

// ============================================
// MUTATIONS - CREATE CANDIDATURA
// ============================================

/**
 * Mutation para criar nova candidatura
 *
 * Automaticamente:
 * - Invalida cache de vagas (para atualizar hasApplied)
 * - Invalida cache de candidaturas
 * - Mostra toast de sucesso/erro
 *
 * @param options - Opções do useMutation
 *
 * @returns Mutation result
 *
 * @example
 * const { mutate: aplicar, isPending } = useCreateCandidatura({
 *   onSuccess: () => navigate('/dashboard')
 * })
 *
 * aplicar({ candidato_id: '123', vaga_id: '456' })
 */
export function useCreateCandidatura(
  options?: UseMutationOptions<
    CreateCandidaturaResponse,
    Error,
    CreateCandidaturaRequest
  >
) {
  const queryClient = useQueryClient()
  const candidato = useAuthStore((state) => state.candidato)

  return useMutation({
    mutationFn: createCandidatura,
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidar cache de vagas (para atualizar hasApplied)
        queryClient.invalidateQueries({
          queryKey: vagasKeys.detail(variables.vaga_id, candidato?.id),
        })
        queryClient.invalidateQueries({
          queryKey: vagasKeys.hasApplied(candidato?.id || '', variables.vaga_id),
        })

        // Invalidar cache de candidaturas
        queryClient.invalidateQueries({
          queryKey: candidaturasKeys.lists(),
        })

        // Toast de sucesso
        toast.success('Candidatura enviada com sucesso!', {
          description: 'Acompanhe o andamento pelo seu painel.',
          duration: 5000,
        })
      } else {
        // Toast de erro
        toast.error('Erro ao enviar candidatura', {
          description: data.error?.message || 'Tente novamente mais tarde.',
        })
      }
    },
    onError: (error) => {
      // Toast de erro genérico
      toast.error('Erro ao enviar candidatura', {
        description: error.message || 'Erro inesperado. Tente novamente.',
      })
    },
    ...options,
  })
}

// ============================================
// MUTATIONS - UPDATE STATUS (HR)
// ============================================

/**
 * Mutation para atualizar status de candidatura (HR apenas)
 *
 * @param options - Opções do useMutation
 *
 * @returns Mutation result
 *
 * @example
 * const { mutate: updateStatus } = useUpdateCandidaturaStatus()
 *
 * updateStatus({
 *   candidaturaId: '123',
 *   status_candidatura: 'aprovado_proxima'
 * })
 */
export function useUpdateCandidaturaStatus(
  options?: UseMutationOptions<
    UpdateCandidaturaStatusResponse,
    Error,
    UpdateCandidaturaStatusRequest
  >
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCandidaturaStatus,
    onSuccess: async (data, variables, context) => {
      if (data.success) {
        // 1. Invalidar TODAS as queries de candidaturas (marca como stale)
        queryClient.invalidateQueries({
          queryKey: candidaturasKeys.all,
        })

        // 2. Refetch TODAS as queries ativas de candidaturas (força reload imediato)
        await queryClient.refetchQueries({
          queryKey: candidaturasKeys.all,
          type: 'active',
        })

        // 3. Também invalidar queries de vagas (podem ter contador de candidaturas)
        queryClient.invalidateQueries({
          queryKey: vagasKeys.all,
        })

        toast.success('Status atualizado com sucesso!')
      } else {
        toast.error('Erro ao atualizar status', {
          description: data.error || 'Tente novamente.',
        })
      }

      // Chamar onSuccess customizado se fornecido
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      toast.error('Erro ao atualizar status', {
        description: error.message,
      })

      // Chamar onError customizado se fornecido
      options?.onError?.(error, variables, context)
    },
    // Spread das outras options (mas NÃO onSuccess/onError pois já tratamos acima)
    ...Object.fromEntries(
      Object.entries(options || {}).filter(
        ([key]) => key !== 'onSuccess' && key !== 'onError'
      )
    ),
  })
}

/**
 * Phase 25 / FUNIL-03 — variáveis da mutation de movimentação de etapa (M2).
 */
export interface UpdateCandidaturaEtapaVars {
  candidaturaId: string
  novaEtapa: EtapaFunilM2
  /**
   * Phase 31 / OPER-03 — justificativa do retrocesso (obrigatória no server para
   * regressões: o trigger `avancar_etapa()` faz RAISE se vazia). Forward-advance a
   * omite (o serviço grava null). Repassada ao serviço `updateCandidaturaEtapa`.
   */
  justificativa?: string
}

/**
 * Mutation para MOVER a etapa de uma candidatura pelo caminho M2
 * server-authoritative (`triagemService.updateCandidaturaEtapa` → trigger
 * `avancar_etapa`, que valida + audita a transição). Substitui o antigo
 * `useUpdateCandidaturaStatus` + auto-avanço para o drag-and-drop do Kanban:
 * aquele caminho inferia a próxima etapa via um map M1 morto (crash 22P02).
 *
 * Espelha a invalidação de `useUpdateCandidaturaStatus` (invalida + refetch das
 * queries de candidaturas + invalida vagas para contadores).
 *
 * @see src/features/triagem/services/triagemService.ts (updateCandidaturaEtapa)
 */
export function useUpdateCandidaturaEtapa(
  options?: UseMutationOptions<void, Error, UpdateCandidaturaEtapaVars>
) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateCandidaturaEtapaVars>({
    mutationFn: ({ candidaturaId, novaEtapa, justificativa }) =>
      updateCandidaturaEtapa(candidaturaId, novaEtapa, justificativa),
    onSuccess: async (data, variables, context) => {
      // 1. Marca stale + 2. refetch imediato das queries ativas de candidaturas.
      queryClient.invalidateQueries({ queryKey: candidaturasKeys.all })
      await queryClient.refetchQueries({
        queryKey: candidaturasKeys.all,
        type: 'active',
      })
      // 3. Invalida vagas (contadores de candidaturas por etapa).
      queryClient.invalidateQueries({ queryKey: vagasKeys.all })

      toast.success('Etapa atualizada com sucesso!')

      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      toast.error('Erro ao mover candidato', {
        description: error.message,
      })

      options?.onError?.(error, variables, context)
    },
    // Spread das outras options (mas NÃO onSuccess/onError — já tratados acima).
    ...Object.fromEntries(
      Object.entries(options || {}).filter(
        ([key]) => key !== 'onSuccess' && key !== 'onError'
      )
    ),
  })
}

// ============================================
// HELPERS
// ============================================

/**
 * Hook que retorna contadores de candidaturas por status
 *
 * @returns Objeto com contadores
 *
 * @example
 * const { total, aguardando, aprovadas } = useCandidaturasCount()
 */
export function useCandidaturasCount() {
  const { data } = useCandidaturas(
    undefined,
    'mais_recentes',
    { page: 1, limit: 100 } // Buscar todas para contar
  )

  if (!data?.data) {
    return {
      total: 0,
      aguardando: 0,
      em_analise: 0,
      aprovadas: 0,
      rejeitadas: 0,
      finalizadas: 0,
    }
  }

  const candidaturas = data.data

  return {
    total: candidaturas.length,
    aguardando: candidaturas.filter((c) => c.status === 'aguardando_resposta')
      .length,
    em_analise: candidaturas.filter((c) => c.status === 'em_analise')
      .length,
    aprovadas: candidaturas.filter((c) => c.status === 'aprovado_proxima')
      .length,
    rejeitadas: candidaturas.filter((c) => c.status === 'rejeitado')
      .length,
    finalizadas: candidaturas.filter((c) => c.status === 'finalizado')
      .length,
  }
}
