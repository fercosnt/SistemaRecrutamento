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
import { useVagasStore } from '../store/vagasStore'
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
  // Pegar candidato do auth store (fonte do candidatoId para hasUserApplied)
  const candidato = useAuthStore((state) => state.candidato)
  // Plan 25-09: sinal de sessão autenticada. Uma sessão RH/administrador tem
  // `candidato === null`, então o antigo gate por candidatoId nunca ligava as
  // contagens por vaga nas tiles RH (VagasRHPage sempre mostrava 0). `user`
  // está presente para QUALQUER sessão autenticada (candidato, rh, administrador)
  // e `null` para visitante anônimo → preserva o skip anon WR-10 e liga as
  // contagens reais para o RH.
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  // 2026-09-05: `!!user` ligava as contagens para QUALQUER sessão autenticada — um
  // candidato logado via «1 candidato» no card da vaga (quantos concorrentes tem).
  // A contagem é informação do RH; o candidato só precisa do `hasUserApplied`.
  const includeCounts = !!user && role !== 'candidato'

  return useQuery({
    // O `candidato.id` entra na chave: o store carrega o candidato DEPOIS do primeiro
    // render, e sem ele na chave a lista ficava em cache com `hasUserApplied=false`
    // (medido em 2026-09-05: recém-inscrito na vaga, o card ainda dizia
    // «Candidatar-se»). Sufixo no fim preserva a invalidação por prefixo.
    queryKey: [...vagasKeys.list(filters, orderBy, pagination), candidato?.id ?? 'anon'],
    queryFn: () =>
      listVagas(
        {
          filters,
          orderBy,
          pagination,
        },
        candidato?.id,
        includeCounts
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
  // WR-05 (Phase 4 review fix): replaced legacy `require('../store/vagasStore')`
  // CommonJS interop with a top-level static import. Vite's ESM build does not
  // expose `require` in the browser — the previous code would throw
  // ReferenceError if any consumer mounted this hook. Static import also
  // restores TypeScript shape for vagasStore selectors (no more `state: any`).
  const filters = useVagasStore((state) => state.filters)
  const orderBy = useVagasStore((state) => state.orderBy)
  const pagination = useVagasStore((state) => state.pagination)

  return useVagas(filters, orderBy, pagination)
}
