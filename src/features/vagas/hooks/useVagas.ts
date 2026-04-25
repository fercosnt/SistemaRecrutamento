/**
 * TanStack Query Hooks para Vagas
 *
 * Hooks para:
 * - Listar vagas com filtros e paginação
 * - Buscar vaga por ID
 * - Verificar se candidato já aplicou
 *
 * @module features/vagas/hooks/useVagas
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  listVagas,
  getVagaById,
  getVagaBySlug, // NEW — Phase 4 / Plan 04-02
  checkIfCandidatoApplied,
} from '../services/vagasService'
import type {
  Vaga,
  VagasFilters,
  VagasOrderBy,
  PaginationParams,
  ListVagasResponse,
  GetVagaResponse,
} from '../types/vagasTypes'

// ============================================
// QUERY KEYS
// ============================================

/**
 * Query keys para cache do TanStack Query
 * Hierarquia: ['vagas'] -> ['vagas', 'list'] -> ['vagas', 'list', filters]
 */
export const vagasKeys = {
  all: ['vagas'] as const,
  lists: () => [...vagasKeys.all, 'list'] as const,
  list: (
    filters?: VagasFilters,
    orderBy?: VagasOrderBy,
    pagination?: PaginationParams
  ) => [...vagasKeys.lists(), { filters, orderBy, pagination }] as const,
  details: () => [...vagasKeys.all, 'detail'] as const,
  // Legacy — kept for back-compat (createCandidatura, useHasApplied still call detail(id))
  detail: (id: string, candidatoId?: string) =>
    [...vagasKeys.details(), id, candidatoId] as const,
  // Phase 4 split — distinct branches prevent cache pollution between ID and slug variants (T-04-18)
  detailById: (id: string, candidatoId?: string) =>
    [...vagasKeys.details(), 'by-id', id, candidatoId] as const,
  detailBySlug: (slug: string, candidatoId?: string) =>
    [...vagasKeys.details(), 'by-slug', slug, candidatoId] as const,
  // Phase 4 — perguntas of a vaga (consumed by useVagaPerguntas in Plan 04-04)
  perguntas: (vagaId: string) =>
    [...vagasKeys.all, 'perguntas', vagaId] as const,
  hasApplied: (candidatoId: string, vagaId: string) =>
    [...vagasKeys.all, 'hasApplied', candidatoId, vagaId] as const,
} as const

// ============================================
// HOOKS - LIST VAGAS
// ============================================

/**
 * Hook para listar vagas com filtros, ordenação e paginação
 *
 * @param filters - Filtros a aplicar
 * @param orderBy - Tipo de ordenação
 * @param pagination - Parâmetros de paginação
 * @param options - Opções do TanStack Query
 *
 * @returns Query result com lista de vagas
 *
 * @example
 * const { data, isLoading, error } = useVagas({
 *   tipo_vaga: 'tempo_integral',
 *   departamento: 'atendimento'
 * })
 */
export function useVagas(
  filters?: VagasFilters,
  orderBy: VagasOrderBy = 'mais_recentes',
  pagination: PaginationParams = { page: 1, limit: 12 },
  options?: Omit<
    UseQueryOptions<ListVagasResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  // Pegar candidato do auth store
  const candidato = useAuthStore((state) => state.candidato)

  return useQuery({
    queryKey: vagasKeys.list(filters, orderBy, pagination),
    queryFn: () =>
      listVagas(
        {
          filters,
          orderBy,
          pagination,
        },
        candidato?.id
      ),
    // Configurações default
    staleTime: 5 * 60 * 1000, // 5 minutos (vagas não mudam frequentemente)
    gcTime: 10 * 60 * 1000, // 10 minutos no cache
    retry: 2,
    ...options,
  })
}

// ============================================
// HOOKS - VAGA DETAIL
// ============================================

/**
 * Hook para buscar detalhes de uma vaga específica
 *
 * @param vagaId - UUID da vaga
 * @param options - Opções do TanStack Query
 *
 * @returns Query result com detalhes da vaga
 *
 * @example
 * const { data: vaga, isLoading } = useVaga('abc-123')
 */
export function useVaga(
  vagaId: string | null | undefined,
  options?: Omit<UseQueryOptions<GetVagaResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const candidato = useAuthStore((state) => state.candidato)

  return useQuery({
    queryKey: vagasKeys.detail(vagaId || '', candidato?.id),
    queryFn: () => getVagaById(vagaId!, candidato?.id),
    enabled: !!vagaId, // Só executa se vagaId existir
    staleTime: 2 * 60 * 1000, // 2 minutos (detalhe pode mudar mais rápido)
    gcTime: 5 * 60 * 1000,
    retry: 2,
    ...options,
  })
}

/**
 * Phase 4 / VAGA-02 — Hook para buscar vaga pelo slug da URL.
 *
 * Mirror de useVaga(id) keyed contra vagasKeys.detailBySlug para evitar
 * cache pollution entre ID e slug variants (T-04-18). Pareia com o runtime
 * branch isUuid em VagaDetalhePage (Plan 04-06).
 *
 * @param slug - URL slug da vaga (ou null/undefined para desativar)
 * @param options - Opções do TanStack Query
 *
 * @returns Query result com detalhes da vaga
 *
 * @example
 * const { data: vaga, isLoading } = useVagaBySlug('atendimento-ao-paciente')
 */
export function useVagaBySlug(
  slug: string | null | undefined,
  options?: Omit<UseQueryOptions<GetVagaResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const candidato = useAuthStore((state) => state.candidato)

  return useQuery({
    queryKey: vagasKeys.detailBySlug(slug || '', candidato?.id),
    queryFn: () => getVagaBySlug(slug!, candidato?.id),
    enabled: !!slug, // Só executa se slug existir
    staleTime: 2 * 60 * 1000, // 2 minutos (mesmo do useVaga)
    gcTime: 5 * 60 * 1000,
    retry: 2,
    ...options,
  })
}

// ============================================
// HOOKS - CHECK APPLICATION
// ============================================

/**
 * Hook para verificar se candidato já aplicou para uma vaga
 *
 * @param vagaId - UUID da vaga
 * @param options - Opções do TanStack Query
 *
 * @returns Query result indicando se já aplicou
 *
 * @example
 * const { data: hasApplied } = useHasApplied('vaga-123')
 */
export function useHasApplied(
  vagaId: string | null | undefined,
  options?: Omit<UseQueryOptions<boolean, Error>, 'queryKey' | 'queryFn'>
) {
  const candidato = useAuthStore((state) => state.candidato)

  return useQuery({
    queryKey: vagasKeys.hasApplied(candidato?.id || '', vagaId || ''),
    queryFn: () => checkIfCandidatoApplied(candidato!.id, vagaId!),
    enabled: !!candidato?.id && !!vagaId,
    staleTime: 1 * 60 * 1000, // 1 minuto (pode mudar se candidato aplicar)
    gcTime: 3 * 60 * 1000,
    retry: 1,
    ...options,
  })
}

// ============================================
// HELPERS
// ============================================

/**
 * Hook customizado que combina listagem de vagas com estado do Zustand
 *
 * Usa filtros, ordenação e paginação do store automaticamente
 *
 * @example
 * const { data, isLoading } = useVagasWithStore()
 */
export function useVagasWithStore() {
  const { useVagasStore } = require('../store/vagasStore')
  const filters = useVagasStore((state: any) => state.filters)
  const orderBy = useVagasStore((state: any) => state.orderBy)
  const pagination = useVagasStore((state: any) => state.pagination)

  return useVagas(filters, orderBy, pagination)
}
