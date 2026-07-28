/**
 * Zustand Vagas Store
 *
 * Store para gerenciar UI state do feature de vagas:
 * - Filtros de listagem
 * - Ordenação
 * - Paginação
 * - Estado de loading de aplicação
 *
 * NOTA: Server state (vagas, candidaturas) é gerenciado por TanStack Query,
 * não por este store.
 *
 * @module features/vagas/store/vagasStore
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  VagasFilters,
  VagasOrderBy,
  PaginationParams,
} from '../types/vagasTypes'

/**
 * Interface do estado de vagas UI
 */
export interface VagasState {
  // Filtros
  filters: VagasFilters
  orderBy: VagasOrderBy
  pagination: PaginationParams

  // UI State
  isFilterSidebarOpen: boolean
  selectedVagaId: string | null

  // Application State
  isApplying: boolean
  applyingToVagaId: string | null
  applyError: string | null

  // Actions - Filters
  setFilters: (filters: Partial<VagasFilters>) => void
  resetFilters: () => void
  setOrderBy: (orderBy: VagasOrderBy) => void

  // Actions - Pagination
  setPagination: (pagination: Partial<PaginationParams>) => void
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void

  // Actions - UI
  toggleFilterSidebar: () => void
  setFilterSidebarOpen: (isOpen: boolean) => void
  setSelectedVagaId: (vagaId: string | null) => void

  // Actions - Application
  setApplying: (vagaId: string | null, error?: string | null) => void
  clearApplyError: () => void

  // Computed
  getActiveFiltersCount: () => number
}

/**
 * Valores default para filtros
 */
const DEFAULT_FILTERS: VagasFilters = {
  tipo_vaga: null,
  localizacao: null,
  departamento: null,
  modelo_trabalho: null,
  nivel_experiencia: null,
  apenasAtivas: true, // Por padrão, mostrar apenas vagas ativas
  search: null,
}

/**
 * Valores default para paginação
 */
const DEFAULT_PAGINATION: PaginationParams = {
  page: 1,
  limit: 12, // 12 vagas por página (como especificado no PRD)
}

/**
 * Zustand Vagas Store com persist middleware
 *
 * Persiste filtros e ordenação em localStorage para melhor UX
 * (usuário mantém filtros ao voltar para a página)
 */
export const useVagasStore = create<VagasState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      filters: DEFAULT_FILTERS,
      orderBy: 'mais_recentes', // Default: mais recentes primeiro
      pagination: DEFAULT_PAGINATION,
      isFilterSidebarOpen: false,
      selectedVagaId: null,
      isApplying: false,
      applyingToVagaId: null,
      applyError: null,

      /**
       * Define filtros (merge com filtros existentes)
       */
      setFilters: (newFilters) => {
        set((state) => ({
          filters: {
            ...state.filters,
            ...newFilters,
          },
          // Reset para página 1 ao mudar filtros
          pagination: {
            ...state.pagination,
            page: 1,
          },
        }))
      },

      /**
       * Reseta todos os filtros para valores default
       */
      resetFilters: () => {
        set({
          filters: DEFAULT_FILTERS,
          pagination: {
            ...get().pagination,
            page: 1,
          },
        })
      },

      /**
       * Define ordenação
       */
      setOrderBy: (orderBy) => {
        set({
          orderBy,
          // Reset para página 1 ao mudar ordenação
          pagination: {
            ...get().pagination,
            page: 1,
          },
        })
      },

      /**
       * Define paginação (merge com paginação existente)
       */
      setPagination: (newPagination) => {
        set((state) => ({
          pagination: {
            ...state.pagination,
            ...newPagination,
          },
        }))
      },

      /**
       * Avança para próxima página
       */
      nextPage: () => {
        set((state) => ({
          pagination: {
            ...state.pagination,
            page: state.pagination.page + 1,
          },
        }))
      },

      /**
       * Volta para página anterior
       */
      prevPage: () => {
        set((state) => ({
          pagination: {
            ...state.pagination,
            page: Math.max(1, state.pagination.page - 1),
          },
        }))
      },

      /**
       * Vai para página específica
       */
      goToPage: (page) => {
        set((state) => ({
          pagination: {
            ...state.pagination,
            page: Math.max(1, page),
          },
        }))
      },

      /**
       * Toggle sidebar de filtros
       */
      toggleFilterSidebar: () => {
        set((state) => ({
          isFilterSidebarOpen: !state.isFilterSidebarOpen,
        }))
      },

      /**
       * Define se sidebar de filtros está aberto
       */
      setFilterSidebarOpen: (isOpen) => {
        set({ isFilterSidebarOpen: isOpen })
      },

      /**
       * Define vaga selecionada (para modal/página de detalhes)
       */
      setSelectedVagaId: (vagaId) => {
        set({ selectedVagaId: vagaId })
      },

      /**
       * Define estado de aplicação a vaga
       */
      setApplying: (vagaId, error = null) => {
        set({
          isApplying: !!vagaId,
          applyingToVagaId: vagaId,
          applyError: error,
        })
      },

      /**
       * Limpa erro de aplicação
       */
      clearApplyError: () => {
        set({ applyError: null })
      },

      /**
       * Conta quantos filtros estão ativos
       * (excluindo 'apenasAtivas' que é default)
       */
      getActiveFiltersCount: () => {
        const { filters } = get()
        let count = 0

        if (filters.tipo_vaga) count++
        if (filters.localizacao) count++
        if (filters.departamento) count++
        if (filters.modelo_trabalho) count++
        if (filters.nivel_experiencia) count++
        if (filters.search && filters.search.trim()) count++

        return count
      },
    }),
    {
      name: 'vagas-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persistir apenas filtros e ordenação, não UI state
        filters: state.filters,
        orderBy: state.orderBy,
      }),
    }
  )
)

/**
 * Hooks customizados para facilitar uso do store
 */

/**
 * Hook para obter filtros ativos
 */
export const useVagasFilters = () => useVagasStore((state) => state.filters)

/**
 * Hook para obter ordenação
 */
export const useVagasOrderBy = () => useVagasStore((state) => state.orderBy)

/**
 * Hook para obter paginação
 */
export const useVagasPagination = () => useVagasStore((state) => state.pagination)

/**
 * Hook para obter contagem de filtros ativos
 */
export const useActiveFiltersCount = () =>
  useVagasStore((state) => state.getActiveFiltersCount())

/**
 * Hook para obter estado de aplicação
 */
export const useVagasApplicationState = () =>
  useVagasStore((state) => ({
    isApplying: state.isApplying,
    applyingToVagaId: state.applyingToVagaId,
    applyError: state.applyError,
  }))

/**
 * Hook para obter sidebar state
 */
export const useFilterSidebarState = () =>
  useVagasStore((state) => state.isFilterSidebarOpen)
