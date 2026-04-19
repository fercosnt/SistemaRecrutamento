/**
 * ProtectedRoute Component
 *
 * HOC para proteger rotas que requerem autenticação.
 * Redireciona para /login se usuário não estiver autenticado.
 * Salva URL tentada para redirect pós-login.
 *
 * @module components/ProtectedRoute
 */

import { ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Componente para proteger rotas que requerem autenticação
 *
 * Funcionalidades:
 * - Verifica autenticação via Zustand store
 * - Mostra loading spinner durante verificação inicial
 * - Redireciona para /login se não autenticado
 * - Salva URL original em location.state.from
 * - Mostra toast informativo ao redirecionar
 *
 * @example
 * ```tsx
 * <Route
 *   path="/dashboard-candidato"
 *   element={
 *     <ProtectedRoute>
 *       <DashboardCandidato />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    // Mostrar toast apenas se não autenticado e não estiver carregando
    if (!isLoading && !isAuthenticated) {
      toast.error('Faça login para acessar esta página', {
        description: 'Você será redirecionado para a tela de login.',
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

  // Redirecionar para login se não autenticado
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    )
  }

  // Renderizar children se autenticado
  return <>{children}</>
}
