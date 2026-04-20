/**
 * Admin Auth Store - COMPATIBILITY SHIM
 *
 * Re-exports from unified authStore for backward compatibility with RH pages.
 * Real cleanup (remove this file, migrate all RH page imports) deferred to M2.
 *
 * See: D-03, D-03a em `.planning/phases/01-foundation-saneada/01-CONTEXT.md`
 *
 * Este arquivo NÃO define um segundo Zustand store. Todas as chamadas
 * `useAdminAuthStore(...)` retornam o estado do `useAuthStore` unificado,
 * garantindo uma única fonte de verdade de autenticação.
 *
 * @module store/adminAuthStore
 */

import { useAuthStore } from './authStore'

/**
 * Re-export do store unificado sob o nome legado.
 *
 * Consumidores RH que faziam `const { ... } = useAdminAuthStore()` recebem
 * o mesmo `AuthState` unificado. Os campos legados (`adminUser`,
 * `permissions`, `isAdmin`, `setUser`, `setSession`, `setAdminUser`,
 * `clearAdminUser`, `hasRole`, `hasPermission`) existem no unified store
 * para preservar a API.
 */
export { useAuthStore as useAdminAuthStore } from './authStore'

/**
 * Re-export do tipo Role como RoleType legado.
 *
 * NOTE: o tipo foi ampliado para incluir 'candidato' no unified store.
 * RH pages que comparam `role === 'recrutador'` precisam considerar que
 * o unified store usa 'rh' (não 'recrutador') — os selectors adaptadores
 * abaixo fazem a conversão.
 */
export type { Role as RoleType } from './authStore'

/**
 * Interface da tabela `usuarios_rh` (linha do banco).
 *
 * Preservada exatamente como estava antes da unificação para não quebrar
 * RH pages que fazem `type Admin = UsuarioRH`.
 */
export interface UsuarioRH {
  id: string
  user_id: string
  nome_completo: string
  email: string
  cargo: string
  telefone: string | null
  role: 'recrutador' | 'administrador'
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

/**
 * Preferências de notificações (preservado do admin store original).
 */
export interface PreferenciasNotificacoes {
  email_novos_candidatos: boolean
  email_testes_completos: boolean
  email_resumo_diario: boolean
  whatsapp_alertas: boolean
}

/**
 * Permissões detalhadas RH (role-based).
 *
 * Mantido para ProtectedAdminRoute, páginas de configuração e qualquer
 * componente RH que use `keyof PermissoesRH` para prop typing.
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
 * Permissões padrão por role.
 *
 * Valores preservados 1:1 do adminAuthStore.ts original (pre-unificação)
 * para garantir paridade comportamental em componentes que usam
 * `DEFAULT_PERMISSIONS[role]` diretamente.
 */
const DEFAULT_PERMISSIONS: Record<'recrutador' | 'administrador', PermissoesRH> = {
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

// =============================================================================
// Selector adapters — map unified store fields to old admin API
// =============================================================================

/**
 * Autenticado como RH/Admin?
 *
 * No unified store, qualquer role autentica. Aqui validamos adicionalmente
 * que o role é `rh` ou `administrador` (NUNCA `candidato`).
 */
export const useIsAdminAuthenticated = () =>
  useAuthStore(
    (s) => s.isAuthenticated && (s.role === 'rh' || s.role === 'administrador')
  )

/**
 * Dados do usuário RH (linha de `usuarios_rh`).
 *
 * Retorna `profile` castado para `UsuarioRH`. Callers devem verificar
 * `useIsAdminAuthenticated()` antes de confiar nos campos.
 */
export const useAdminUser = () =>
  useAuthStore((s) => s.profile as UsuarioRH | null)

/**
 * Role RH no formato legado ('recrutador' | 'administrador').
 *
 * O unified store usa 'rh' para recrutadores; aqui convertemos de volta
 * para 'recrutador' para preservar a API esperada pelas páginas RH.
 */
export const useAdminRole = () =>
  useAuthStore((s) => {
    if (s.role === 'rh') return 'recrutador' as const
    if (s.role === 'administrador') return 'administrador' as const
    return null
  })

/**
 * Estado de loading (propagado do unified store).
 */
export const useAdminAuthLoading = () => useAuthStore((s) => s.isLoading)

/**
 * Checa permissão específica baseada no role atual.
 *
 * Se role == 'administrador', retorna `true` (administradores têm tudo).
 * Se role == 'rh', consulta DEFAULT_PERMISSIONS.recrutador.
 * Caso contrário (candidato ou não autenticado), retorna `false`.
 */
export const useAdminPermission = (permission: keyof PermissoesRH) =>
  useAuthStore((s) => {
    if (s.role === 'administrador') return true
    if (s.role === 'rh') {
      return DEFAULT_PERMISSIONS.recrutador[permission] === true
    }
    return false
  })

/**
 * Checa se role atual satisfaz o role mínimo requerido.
 *
 * Hierarquia: administrador > recrutador.
 * - requiredRole === 'recrutador': aceita 'rh' (== recrutador) OU 'administrador'
 * - requiredRole === 'administrador': aceita apenas 'administrador'
 */
export const useAdminHasRole = (requiredRole: 'recrutador' | 'administrador') =>
  useAuthStore((s) => {
    if (requiredRole === 'recrutador') {
      return s.role === 'rh' || s.role === 'administrador'
    }
    if (requiredRole === 'administrador') {
      return s.role === 'administrador'
    }
    return false
  })
