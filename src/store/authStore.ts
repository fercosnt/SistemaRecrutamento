/**
 * Zustand Auth Store (Unified)
 *
 * Store global de autenticação unificado para candidatos, RH e administradores.
 * Substitui o antigo authStore.ts (somente candidato) + adminAuthStore.ts
 * por uma única fonte de verdade com awareness de `role`.
 *
 * Fluxo de role:
 * 1. Após o Custom Access Token Hook (Plan 04, migration 0003_unified_auth_role.sql)
 *    ser deployado e habilitado no Dashboard, `session.user.app_metadata.role`
 *    conterá 'candidato' | 'rh' | 'administrador'.
 * 2. Antes do hook, `app_metadata.role` é `undefined`. Nesse caso, `extractRole`
 *    retorna `null` e o initialize faz fallback buscando em usuarios_rh (e depois
 *    candidatos) para determinar o role dinamicamente.
 *
 * @module store/authStore
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '../../database.types'
import { supabase } from '@/lib/supabase/client'
import { extractRole, type Role } from '@/features/auth/utils'

/**
 * Legacy typed row para candidato. Mantido como tipo do campo `candidato`
 * (back-compat) enquanto páginas do candidato acessam `.nome_completo`,
 * `.cpf`, `.celular`, etc. Pode ser removido em M2 quando componentes
 * migrarem para checar `role` e fazer cast explícito de `profile`.
 */
type CandidatoRow = Database['public']['Tables']['candidatos']['Row']

/**
 * Legacy typed row para usuário RH. Mantido como tipo do campo `adminUser`
 * (back-compat) enquanto páginas RH e hooks (useSessionTimeout) acessam
 * `.user_id`, `.email`, `.nome_completo`, etc. Pode ser removido em M2.
 */
type UsuarioRHRow = Database['public']['Tables']['usuarios_rh']['Row']

/**
 * Role do usuário autenticado.
 *
 * - `candidato`: pessoa física se candidatando a vagas (área pública)
 * - `rh`: recrutador (mapeado de `usuarios_rh.role === 'recrutador'`)
 * - `administrador`: administrador do sistema
 *
 * Fonte canonica: `@/features/auth/utils` (Phase 3 Wave 2 / Plan 03-03).
 * Re-exportado aqui para preservar compat com consumers que fazem
 * `import { type Role } from '@/store/authStore'` (ex.: RoleGuard.tsx).
 */
export type { Role }

/**
 * Estado de autenticação unificado.
 *
 * Campos principais (conforme Plan 01-02):
 * - `user`, `session`: dados de auth do Supabase
 * - `role`: papel derivado do JWT `app_metadata.role` (ou fallback via DB)
 * - `profile`: linha de `candidatos` OU `usuarios_rh` conforme o role
 * - `isLoading`, `isAuthenticated`: flags de estado
 *
 * Campos de compatibilidade (mantidos para não quebrar consumidores legados
 * em App.tsx, LoginRHPage.tsx, ProtectedAdminRoute.tsx, useSessionTimeout.ts):
 * - `adminUser`: alias de leitura para `profile` tipado como UsuarioRH legado
 * - `permissions`, `isAdmin`: derivados de `role` para RH
 * - Setters legados: `setUser`, `setCandidato`, `setAdminUser`, `setLoading`,
 *   `clearUser`, `clearAdminUser`, `setAdminSession`
 * - Métodos legados: `hasRole`, `hasPermission`
 *
 * Os campos legados serão removidos em M2 (ver D-03a) quando RH pages forem
 * migradas para a API unificada.
 */
export interface AuthState {
  // --- Estado principal ---
  user: User | null
  session: Session | null
  role: Role | null
  profile: Record<string, unknown> | null
  isLoading: boolean
  isAuthenticated: boolean

  // --- Ações principais ---
  initialize: () => Promise<void>
  logout: () => Promise<void>
  clearAuth: () => void
  setSession: (session: Session | null) => void

  // --- Compatibilidade legada (remover em M2) ---
  /** @deprecated Use `profile` com cast explícito baseado em `role` */
  candidato: CandidatoRow | null
  /** @deprecated Use `profile` com cast explícito baseado em `role` */
  adminUser: UsuarioRHRow | null
  /** @deprecated Derivado de `role` */
  permissions: Record<string, boolean> | null
  /** @deprecated Use `role === 'administrador'` */
  isAdmin: boolean

  /** @deprecated Use `setSession` */
  setUser: (user: User | null) => void
  /** @deprecated Use `setSession` com sessão completa */
  setAdminSession: (session: Session | null) => void
  /** @deprecated Use `profile` via `setSession` + `initialize` */
  setCandidato: (candidato: CandidatoRow | null) => void
  /** @deprecated Use `profile` via `setSession` + `initialize` */
  setAdminUser: (adminUser: UsuarioRHRow | User | null) => void
  /** @deprecated Use `isLoading` state via initialize */
  setLoading: (isLoading: boolean) => void
  /** @deprecated Use `clearAuth` */
  clearUser: () => void
  /** @deprecated Use `clearAuth` */
  clearAdminUser: () => void
  /**
   * @deprecated Checar role diretamente via `state.role`
   *
   * Aceita tanto nomenclatura legada (`'recrutador'`) quanto a nova
   * (`'rh'`), para compatibilidade com RH pages que passam
   * `requireRole: RoleType` (antigamente `'recrutador' | 'administrador'`,
   * agora Role = `'candidato' | 'rh' | 'administrador'`).
   */
  hasRole: (requiredRole: Role | 'recrutador') => boolean
  /** @deprecated Derivar do role diretamente */
  hasPermission: (permission: string) => boolean
}

/**
 * Resultado da busca de profile incluindo role resolvido por fallback.
 *
 * Quando `app_metadata.role` não está disponível (JWT antigo, hook desabilitado),
 * inferimos o role a partir de qual tabela contém o user_id:
 * - `usuarios_rh` com `role='administrador'` -> Role `administrador`
 * - `usuarios_rh` com `role='recrutador'` -> Role `rh`
 * - `candidatos` -> Role `candidato`
 */
async function fetchProfile(
  userId: string,
  role: Role | null
): Promise<{ profile: Record<string, unknown> | null; resolvedRole: Role | null }> {
  // Se temos role pelo JWT, buscar na tabela correta diretamente
  if (role === 'rh' || role === 'administrador') {
    const { data } = await supabase
      .from('usuarios_rh')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .is('deleted_at', null)
      .single()
    return {
      profile: (data as Record<string, unknown> | null) ?? null,
      resolvedRole: role,
    }
  }

  if (role === 'candidato') {
    const { data } = await supabase
      .from('candidatos')
      .select('*')
      .eq('user_id', userId)
      .single()
    return {
      profile: (data as Record<string, unknown> | null) ?? null,
      resolvedRole: 'candidato',
    }
  }

  // Fallback: role ausente no JWT (hook ainda não deployado — Plan 04)
  // Estratégia: tentar usuarios_rh primeiro (subconjunto menor), depois candidatos.
  const { data: rhRow } = await supabase
    .from('usuarios_rh')
    .select('*')
    .eq('user_id', userId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (rhRow) {
    const dbRole = (rhRow as { role?: string }).role
    const resolvedRole: Role =
      dbRole === 'administrador' ? 'administrador' : 'rh'
    return {
      profile: rhRow as Record<string, unknown>,
      resolvedRole,
    }
  }

  const { data: candidatoRow } = await supabase
    .from('candidatos')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (candidatoRow) {
    return {
      profile: candidatoRow as Record<string, unknown>,
      resolvedRole: 'candidato',
    }
  }

  // Usuário autenticado mas sem profile em nenhuma tabela.
  // Default seguro: tratar como candidato (menor privilégio).
  return { profile: null, resolvedRole: 'candidato' }
}

/**
 * Permissões default por role (mantido para compat com ProtectedAdminRoute
 * e outras checagens RH legadas).
 *
 * Será removido em M2 junto com os métodos `hasPermission`/`hasRole`.
 */
const DEFAULT_PERMISSIONS_BY_ROLE: Record<'rh' | 'administrador', Record<string, boolean>> = {
  rh: {
    visualizar_candidatos: true,
    editar_candidatos: true,
    aprovar_rejeitar_candidatos: true,
    deletar_candidatos: false,
    visualizar_vagas: true,
    criar_vagas: true,
    editar_vagas: true,
    deletar_vagas: false,
    acessar_analytics: true,
    exportar_relatorios: true,
    gerenciar_usuarios_rh: false,
    configurar_sistema: false,
    acessar_logs: true,
    gerenciar_permissoes: false,
  },
  administrador: {
    visualizar_candidatos: true,
    editar_candidatos: true,
    aprovar_rejeitar_candidatos: true,
    deletar_candidatos: true,
    visualizar_vagas: true,
    criar_vagas: true,
    editar_vagas: true,
    deletar_vagas: true,
    acessar_analytics: true,
    exportar_relatorios: true,
    gerenciar_usuarios_rh: true,
    configurar_sistema: true,
    acessar_logs: true,
    gerenciar_permissoes: true,
  },
}

function permissionsFromRole(role: Role | null): Record<string, boolean> | null {
  if (role === 'rh' || role === 'administrador') {
    return DEFAULT_PERMISSIONS_BY_ROLE[role]
  }
  return null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // --- Estado inicial ---
      user: null,
      session: null,
      role: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,
      candidato: null,
      adminUser: null,
      permissions: null,
      isAdmin: false,

      // --- Ações principais ---

      clearAuth: () => {
        set({
          user: null,
          session: null,
          role: null,
          profile: null,
          isAuthenticated: false,
          candidato: null,
          adminUser: null,
          permissions: null,
          isAdmin: false,
        })
      },

      setSession: (session) => {
        const role = extractRole(session)
        set({
          session,
          user: session?.user ?? null,
          role,
          isAuthenticated: !!session,
          isAdmin: role === 'administrador',
          permissions: permissionsFromRole(role),
        })
      },

      initialize: async () => {
        try {
          set({ isLoading: true })
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession()

          if (error) {
            console.error('Erro ao buscar sessão:', error)
            get().clearAuth()
            return
          }

          if (session?.user) {
            const roleFromJwt = extractRole(session)
            const { profile, resolvedRole } = await fetchProfile(session.user.id, roleFromJwt)

            set({
              user: session.user,
              session,
              role: resolvedRole,
              profile,
              candidato:
                resolvedRole === 'candidato'
                  ? (profile as CandidatoRow | null)
                  : null,
              adminUser:
                resolvedRole === 'rh' || resolvedRole === 'administrador'
                  ? (profile as UsuarioRHRow | null)
                  : null,
              permissions: permissionsFromRole(resolvedRole),
              isAdmin: resolvedRole === 'administrador',
              isAuthenticated: true,
            })
          } else {
            get().clearAuth()
          }
        } catch (error) {
          console.error('Erro ao inicializar auth store:', error)
          get().clearAuth()
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut()
        } catch (error) {
          console.error('Erro ao fazer logout:', error)
        }
        get().clearAuth()
      },

      // --- Compatibilidade legada ---

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user || !!get().session,
        })
      },

      setAdminSession: (session) => {
        // Idêntico a setSession; alias histórico.
        get().setSession(session)
      },

      setCandidato: (candidato) => {
        // Legado: define `profile` mantendo consistência com alias `candidato`.
        set({
          profile: candidato as Record<string, unknown> | null,
          candidato,
        })
      },

      setAdminUser: (adminUser) => {
        // Pode receber um User do Supabase (quando chamado em onAuthStateChange)
        // OU um registro de usuarios_rh (após lookup no LoginRHPage).
        // Heurística: objeto com `nome_completo` -> UsuarioRHRow; caso contrário -> User.
        if (
          adminUser &&
          typeof adminUser === 'object' &&
          'nome_completo' in adminUser
        ) {
          const rhRow = adminUser as UsuarioRHRow
          const mappedRole: Role =
            rhRow.role === 'administrador' ? 'administrador' : 'rh'
          set({
            profile: rhRow as unknown as Record<string, unknown>,
            adminUser: rhRow,
            candidato: null,
            role: mappedRole,
            permissions: permissionsFromRole(mappedRole),
            isAdmin: mappedRole === 'administrador',
          })
        } else {
          // User do Supabase Auth — atualiza user mas não muda profile/adminUser
          set({
            user: adminUser as User | null,
          })
        }
      },

      setLoading: (isLoading) => {
        set({ isLoading })
      },

      clearUser: () => {
        get().clearAuth()
      },

      clearAdminUser: () => {
        get().clearAuth()
      },

      hasRole: (requiredRole) => {
        const current = get().role
        if (!current) return false
        // Hierarquia: administrador > rh (== recrutador legado)
        if (requiredRole === 'administrador') {
          return current === 'administrador'
        }
        // Aceita 'rh' (nomenclatura unificada) ou 'recrutador' (legado)
        if (requiredRole === 'rh' || requiredRole === 'recrutador') {
          return current === 'rh' || current === 'administrador'
        }
        if (requiredRole === 'candidato') {
          return current === 'candidato'
        }
        return false
      },

      hasPermission: (permission) => {
        const { role, permissions } = get()
        if (role === 'administrador') return true
        return permissions?.[permission] === true
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

/**
 * Hook: usuário está autenticado?
 */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)

/**
 * Hook: dados do candidato (linha da tabela `candidatos`).
 *
 * Retorna `null` quando o role atual não é 'candidato'. Mantém
 * compatibilidade com componentes candidatos (MeuPerfilCandidatoPage,
 * DashboardCandidatoPage, useVagas, useCandidaturas) que ainda fazem
 * `const candidato = useCandidato()` e acessam `.id`, `.nome_completo`, etc.
 *
 * Internamente reflete `profile` quando `role === 'candidato'`.
 */
export const useCandidato = () => useAuthStore((state) => state.candidato)

/**
 * Hook: usuário Supabase (User object).
 */
export const useUser = () => useAuthStore((state) => state.user)

/**
 * Hook: estado de loading (true enquanto initialize() não completou).
 */
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)

/**
 * Hook: role atual do usuário ('candidato' | 'rh' | 'administrador' | null).
 */
export const useRole = () => useAuthStore((state) => state.role)

/**
 * Hook: profile do usuário (candidato ou usuario_rh conforme role).
 */
export const useProfile = () => useAuthStore((state) => state.profile)
