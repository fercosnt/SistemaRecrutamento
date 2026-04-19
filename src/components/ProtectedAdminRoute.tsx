/**
 * ProtectedAdminRoute Component
 *
 * HOC para proteger rotas que requerem autenticação RH/Admin.
 * Verifica não apenas autenticação, mas também permissões e roles.
 * Redireciona para /auth/login-rh se usuário não estiver autenticado.
 * Salva URL tentada para redirect pós-login.
 *
 * @module components/ProtectedAdminRoute
 */

import { ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuthStore, type RoleType, type PermissoesRH } from '@/store/adminAuthStore'
import { toast } from 'sonner'
import { AlertCircle, ShieldAlert } from 'lucide-react'

interface ProtectedAdminRouteProps {
  children: ReactNode
  /**
   * Role mínimo necessário para acessar a rota
   * Se não especificado, apenas verifica autenticação
   */
  requireRole?: RoleType
  /**
   * Permissão específica necessária para acessar a rota
   * Se não especificado, apenas verifica autenticação (e role, se especificado)
   */
  requirePermission?: keyof PermissoesRH
}

/**
 * Componente para proteger rotas que requerem autenticação RH/Admin
 *
 * Funcionalidades:
 * - Verifica autenticação via adminAuthStore
 * - Opcionalmente verifica role mínimo necessário
 * - Opcionalmente verifica permissão específica
 * - Mostra loading spinner durante verificação inicial
 * - Redireciona para /auth/login-rh se não autenticado
 * - Salva URL original em location.state.from
 * - Mostra toast informativo ao redirecionar
 *
 * @example
 * ```tsx
 * // Apenas autenticação necessária
 * <Route
 *   path="/rh/dashboard"
 *   element={
 *     <ProtectedAdminRoute>
 *       <DashboardRH />
 *     </ProtectedAdminRoute>
 *   }
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Requer role de administrador
 * <Route
 *   path="/rh/usuarios"
 *   element={
 *     <ProtectedAdminRoute requireRole="administrador">
 *       <GerenciarUsuarios />
 *     </ProtectedAdminRoute>
 *   }
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Requer permissão específica
 * <Route
 *   path="/rh/configuracoes"
 *   element={
 *     <ProtectedAdminRoute requirePermission="configurar_sistema">
 *       <Configuracoes />
 *     </ProtectedAdminRoute>
 *   }
 * />
 * ```
 */
export function ProtectedAdminRoute({
  children,
  requireRole,
  requirePermission,
}: ProtectedAdminRouteProps) {
  const { isAuthenticated, isLoading, adminUser, hasRole, hasPermission } = useAdminAuthStore()
  const location = useLocation()

  useEffect(() => {
    // Mostrar toast apenas se não autenticado e não estiver carregando
    if (!isLoading && !isAuthenticated) {
      toast.error('Autenticação necessária', {
        description: 'Faça login como RH/Admin para acessar esta área.',
        icon: <AlertCircle className="w-5 h-5" />,
      })
    }
  }, [isLoading, isAuthenticated])

  // Mostrar loading spinner durante verificação inicial de sessão
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00109E] to-[#0066CC]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg drop-shadow-lg">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Redirecionar para login RH se não autenticado
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/login-rh"
        state={{ from: location.pathname + location.search }}
        replace
      />
    )
  }

  // Verificar se perfil RH existe (proteção adicional)
  if (!adminUser) {
    toast.error('Perfil inválido', {
      description: 'Seu perfil RH não foi encontrado. Entre em contato com o administrador.',
      icon: <AlertCircle className="w-5 h-5" />,
      duration: 5000,
    })
    return (
      <Navigate
        to="/auth/login-rh"
        state={{ from: location.pathname + location.search }}
        replace
      />
    )
  }

  // Verificar role mínimo necessário
  if (requireRole && !hasRole(requireRole)) {
    toast.error('Permissão insuficiente', {
      description: `Esta área requer nível de acesso "${requireRole}". Entre em contato com o administrador.`,
      icon: <ShieldAlert className="w-5 h-5" />,
      duration: 5000,
    })
    return <Navigate to="/rh/dashboard" replace />
  }

  // Verificar permissão específica necessária
  if (requirePermission && !hasPermission(requirePermission)) {
    toast.error('Sem permissão', {
      description: `Você não tem permissão para acessar esta área. Entre em contato com o administrador.`,
      icon: <ShieldAlert className="w-5 h-5" />,
      duration: 5000,
    })
    return <Navigate to="/rh/dashboard" replace />
  }

  // Renderizar children se todas as verificações passarem
  return <>{children}</>
}
