/**
 * Zustand Auth Store
 *
 * Store global de autenticação para gerenciar estado do usuário, sessão e candidato.
 * Utiliza persist middleware para manter estado entre reloads.
 *
 * @module store/authStore
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '../../database.types'
import { supabase } from '@/lib/supabase/client'

// Type alias para Candidato
type Candidato = Database['public']['Tables']['candidatos']['Row']

/**
 * Interface do estado de autenticação
 */
export interface AuthState {
  // Estado
  user: User | null
  session: Session | null
  candidato: Candidato | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setCandidato: (candidato: Candidato | null) => void
  setLoading: (isLoading: boolean) => void
  clearUser: () => void
  logout: () => Promise<void>

  // Helper methods
  initialize: () => Promise<void>
}

/**
 * Zustand Auth Store com persist middleware
 *
 * Armazena estado de autenticação em localStorage para persistência
 * entre reloads e tabs.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      session: null,
      candidato: null,
      isAuthenticated: false,
      isLoading: true,

      /**
       * Define o usuário autenticado
       */
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
        })
      },

      /**
       * Define a sessão ativa
       */
      setSession: (session) => {
        set({
          session,
          isAuthenticated: !!session,
        })
      },

      /**
       * Define os dados do candidato
       */
      setCandidato: (candidato) => {
        set({ candidato })
      },

      /**
       * Define o estado de loading
       */
      setLoading: (isLoading) => {
        set({ isLoading })
      },

      /**
       * Limpa todos os dados do usuário
       */
      clearUser: () => {
        set({
          user: null,
          session: null,
          candidato: null,
          isAuthenticated: false,
        })
      },

      /**
       * Executa logout completo
       * - Limpa estado do Zustand
       * - Limpa sessão do Supabase
       * - Remove dados do localStorage
       */
      logout: async () => {
        try {
          // Limpa sessão do Supabase
          await supabase.auth.signOut()

          // Limpa estado local
          get().clearUser()
        } catch (error) {
          console.error('Erro ao fazer logout:', error)
          // Limpa estado local mesmo se falhar no backend
          get().clearUser()
        }
      },

      /**
       * Inicializa o auth store verificando sessão existente
       */
      initialize: async () => {
        try {
          set({ isLoading: true })

          // Verifica se há sessão ativa
          const { data: { session }, error } = await supabase.auth.getSession()

          if (error) {
            console.error('Erro ao buscar sessão:', error)
            get().clearUser()
            return
          }

          if (session?.user) {
            get().setUser(session.user)
            get().setSession(session)

            // Busca dados do candidato
            const { data: candidato, error: candidatoError } = await supabase
              .from('candidatos')
              .select('*')
              .eq('user_id', session.user.id)
              .single()

            if (candidatoError) {
              console.error('Erro ao buscar candidato:', candidatoError)
            } else if (candidato) {
              get().setCandidato(candidato)
            }
          } else {
            get().clearUser()
          }
        } catch (error) {
          console.error('Erro ao inicializar auth store:', error)
          get().clearUser()
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        candidato: state.candidato,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

/**
 * Hook customizado para verificar se usuário está autenticado
 */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)

/**
 * Hook customizado para obter dados do candidato
 */
export const useCandidato = () => useAuthStore((state) => state.candidato)

/**
 * Hook customizado para obter usuário autenticado
 */
export const useUser = () => useAuthStore((state) => state.user)

/**
 * Hook customizado para verificar estado de loading
 */
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)
