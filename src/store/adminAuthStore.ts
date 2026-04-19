/**
 * Admin Auth Store (Zustand)
 *
 * Store global de autenticação para gerenciar estado de usuários RH/Admin.
 * Separado do authStore.ts (candidatos) para melhor organização.
 *
 * Roles suportados:
 * - rh_basico: Visualiza candidatos, agend entrevistas, comunica
 * - rh_avancado: + Edita candidatos, aprova/rejeita, analytics
 * - admin: Todas as permissões + gerenciar usuários RH e configurações
 *
 * @module store/adminAuthStore
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

/**
 * Tipos do usuário RH/Admin
 *
 * Baseado na tabela usuarios_rh do banco de dados
 * Roles no DB: 'recrutador' e 'administrador'
 */
export type RoleType = 'recrutador' | 'administrador'

/**
 * Interface baseada na estrutura real da tabela usuarios_rh no banco de dados
 */
export interface UsuarioRH {
  id: string
  user_id: string
  nome_completo: string
  email: string
  cargo: string
  telefone: string | null
  role: RoleType
  avatar_url: string | null
  ativo: boolean
  primeiro_acesso: boolean
  data_ultimo_login: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  created_by: string | null
  updated_by: string | null
}

export interface PreferenciasNotificacoes {
  email_novos_candidatos: boolean
  email_testes_completos: boolean
  email_resumo_diario: boolean
  whatsapp_alertas: boolean
}

/**
 * Permissões detalhadas (para controle granular)
 *
 * Baseado na tabela permissoes_rh (se existir)
 * Para MVP, usamos apenas role-based (simples)
 */
export interface PermissoesRH {
  // Candidatos
  visualizar_candidatos: boolean
  editar_candidatos: boolean
  aprovar_rejeitar_candidatos: boolean
  deletar_candidatos: boolean

  // Vagas
  visualizar_vagas: boolean
  criar_vagas: boolean
  editar_vagas: boolean
  deletar_vagas: boolean

  // Analytics e Relatórios
  acessar_analytics: boolean
  exportar_relatorios: boolean

  // Sistema
  gerenciar_usuarios_rh: boolean
  configurar_sistema: boolean
  acessar_logs: boolean
  gerenciar_permissoes: boolean
}

/**
 * Estado de autenticação admin
 */
export interface AdminAuthState {
  // Estado atual
  user: User | null
  session: Session | null
  adminUser: UsuarioRH | null
  role: RoleType | null
  permissions: PermissoesRH | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean

  // Actions
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setAdminUser: (adminUser: UsuarioRH | null) => void
  setPermissions: (permissions: PermissoesRH | null) => void
  setLoading: (isLoading: boolean) => void
  clearAdminUser: () => void
  logout: () => Promise<void>

  // Helper methods
  initialize: () => Promise<void>
  hasPermission: (permission: keyof PermissoesRH) => boolean
  hasRole: (requiredRole: RoleType) => boolean
}

/**
 * Hierarquia de roles para comparação
 * Maior número = mais permissões
 *
 * Mapeamento do DB:
 * - recrutador: Equivalente a RH Avançado (permissões intermediárias)
 * - administrador: Todas as permissões do sistema
 */
const ROLE_HIERARCHY: Record<RoleType, number> = {
  recrutador: 1,
  administrador: 2,
}

/**
 * Permissões padrão por role
 *
 * Baseado nos roles reais do banco de dados:
 * - recrutador: Permissões intermediárias (visualizar, editar, aprovar candidatos + analytics)
 * - administrador: Todas as permissões do sistema
 */
const DEFAULT_PERMISSIONS: Record<RoleType, PermissoesRH> = {
  recrutador: {
    // Candidatos
    visualizar_candidatos: true,
    editar_candidatos: true,
    aprovar_rejeitar_candidatos: true,
    deletar_candidatos: false,
    // Vagas
    visualizar_vagas: true,
    criar_vagas: true,
    editar_vagas: true,
    deletar_vagas: false,
    // Analytics
    acessar_analytics: true,
    exportar_relatorios: true,
    // Sistema
    gerenciar_usuarios_rh: false,
    configurar_sistema: false,
    acessar_logs: true,
    gerenciar_permissoes: false,
  },
  administrador: {
    // Candidatos
    visualizar_candidatos: true,
    editar_candidatos: true,
    aprovar_rejeitar_candidatos: true,
    deletar_candidatos: true,
    // Vagas
    visualizar_vagas: true,
    criar_vagas: true,
    editar_vagas: true,
    deletar_vagas: true,
    // Analytics
    acessar_analytics: true,
    exportar_relatorios: true,
    // Sistema
    gerenciar_usuarios_rh: true,
    configurar_sistema: true,
    acessar_logs: true,
    gerenciar_permissoes: true,
  },
}

/**
 * Zustand Admin Auth Store com persist middleware
 *
 * Armazena estado de autenticação admin em localStorage separado
 */
export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      session: null,
      adminUser: null,
      role: null,
      permissions: null,
      isAuthenticated: false,
      isAdmin: false,
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
       * Define os dados do usuário RH/Admin
       */
      setAdminUser: (adminUser) => {
        const role = adminUser?.role || null
        const permissions = role ? DEFAULT_PERMISSIONS[role] : null

        set({
          adminUser,
          role,
          permissions,
          isAdmin: role === 'administrador',
        })
      },

      /**
       * Define as permissões customizadas (override padrão)
       */
      setPermissions: (permissions) => {
        set({ permissions })
      },

      /**
       * Define o estado de loading
       */
      setLoading: (isLoading) => {
        set({ isLoading })
      },

      /**
       * Limpa todos os dados do usuário admin
       */
      clearAdminUser: () => {
        set({
          user: null,
          session: null,
          adminUser: null,
          role: null,
          permissions: null,
          isAuthenticated: false,
          isAdmin: false,
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
          get().clearAdminUser()
        } catch (error) {
          console.error('Erro ao fazer logout:', error)
          // Limpa estado local mesmo se falhar no backend
          get().clearAdminUser()
        }
      },

      /**
       * Inicializa o admin auth store verificando sessão existente
       */
      initialize: async () => {
        try {
          set({ isLoading: true })

          // Verifica se há sessão ativa
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession()

          if (error) {
            console.error('Erro ao buscar sessão:', error)
            get().clearAdminUser()
            return
          }

          if (session?.user) {
            get().setUser(session.user)
            get().setSession(session)

            // Buscar dados do usuário RH
            const { data: adminUser, error: adminError } = await supabase
              .from('usuarios_rh')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('ativo', true)
              .is('deleted_at', null)
              .single()

            if (adminError) {
              console.error('Erro ao buscar usuário RH:', adminError)
              // Usuário tem sessão mas não é RH - limpar tudo
              get().clearAdminUser()
            } else if (adminUser) {
              get().setAdminUser(adminUser)
            } else {
              // Perfil RH não existe
              get().clearAdminUser()
            }
          } else {
            get().clearAdminUser()
          }
        } catch (error) {
          console.error('Erro ao inicializar admin auth store:', error)
          get().clearAdminUser()
        } finally {
          set({ isLoading: false })
        }
      },

      /**
       * Verifica se usuário tem permissão específica
       *
       * @param permission - Nome da permissão a verificar
       * @returns true se tem permissão, false caso contrário
       */
      hasPermission: (permission) => {
        const { role, permissions } = get()

        // Administrador tem todas as permissões
        if (role === 'administrador') return true

        // Verifica permissão específica
        return permissions?.[permission] === true
      },

      /**
       * Verifica se usuário tem role suficiente
       *
       * Usa hierarquia: admin > rh_avancado > rh_basico
       *
       * @param requiredRole - Role mínimo necessário
       * @returns true se role atual >= role necessário
       */
      hasRole: (requiredRole) => {
        const { role } = get()

        if (!role) return false

        return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole]
      },
    }),
    {
      name: 'admin-auth-storage', // Chave do localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        adminUser: state.adminUser,
        role: state.role,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
)

/**
 * Hook customizado para verificar se usuário está autenticado como admin
 */
export const useIsAdminAuthenticated = () => useAdminAuthStore((state) => state.isAuthenticated)

/**
 * Hook customizado para obter dados do usuário RH
 */
export const useAdminUser = () => useAdminAuthStore((state) => state.adminUser)

/**
 * Hook customizado para obter role do usuário
 */
export const useAdminRole = () => useAdminAuthStore((state) => state.role)

/**
 * Hook customizado para verificar estado de loading
 */
export const useAdminAuthLoading = () => useAdminAuthStore((state) => state.isLoading)

/**
 * Hook customizado para verificar permissão específica
 */
export const useAdminPermission = (permission: keyof PermissoesRH) => {
  return useAdminAuthStore((state) => state.hasPermission(permission))
}

/**
 * Hook customizado para verificar role
 */
export const useAdminHasRole = (requiredRole: RoleType) => {
  return useAdminAuthStore((state) => state.hasRole(requiredRole))
}
