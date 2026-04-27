/**
 * RoleGuard Component
 *
 * Guard de rota centralizado que substitui ProtectedRoute e ProtectedAdminRoute.
 * Aceita `role: Role | Role[]` e aplica a ordem de verificacao definida em D-06:
 *
 *   1. isLoading -> renderiza spinner apos delay de 200ms (via LoadingDelay)
 *   2. Nao autenticado OU role === null -> redireciona para /auth/login com ?redirect=
 *   3. Role incorreto -> redireciona para home do role atual + toast informativo
 *   4. Role correto -> renderiza children
 *
 * Defense-in-depth: este guard e UX + orientacao; a autorizacao real
 * e imposta pelas RLS policies do Supabase (ver threat model do plan 01-03).
 *
 * @module components/RoleGuard
 */

import { type ReactNode, useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useAuthStore, type Role } from '@/store/authStore'
import { LoadingDelay } from '@/components/LoadingDelay'

interface RoleGuardProps {
  /**
   * Conteudo protegido a renderizar quando o role atual for permitido.
   */
  children: ReactNode
  /**
   * Role (ou lista de roles) permitido(s).
   *
   * - `'candidato'`: so candidatos
   * - `'rh'`: so recrutadores
   * - `'administrador'`: so administradores
   * - `['rh', 'administrador']`: qualquer usuario RH (recrutador ou admin)
   */
  role: Role | Role[]
}

/**
 * Mapa de home por role.
 *
 * Quando um usuario autenticado tenta acessar uma rota de outro role,
 * redirecionamos para a home do role que ele realmente possui,
 * ao inves de / ou 403 (UX ruim per D-05).
 */
const ROLE_HOME: Record<Role, string> = {
  candidato: '/candidato/perfil',
  rh: '/rh/dashboard',
  administrador: '/rh/dashboard',
}

/**
 * Mensagem de toast exibida quando o usuario tenta acessar uma area
 * reservada a outro role.
 *
 * A mensagem fala sobre a AREA acessada (nao sobre o role do usuario),
 * porque essa e a informacao relevante para o usuario: "essa tela nao e
 * para voce".
 */
function wrongAreaMessage(currentRole: Role): string {
  if (currentRole === 'candidato') {
    // Candidato tentando acessar area RH
    return 'Esta area e exclusiva para recrutadores'
  }
  // RH ou administrador tentando acessar area de candidato
  return 'Esta area e exclusiva para candidatos'
}

/**
 * Verifica se o role atual esta na lista de roles permitidos.
 */
function isRoleAllowed(current: Role | null, allowed: Role | Role[]): boolean {
  if (current === null) return false
  const list = Array.isArray(allowed) ? allowed : [allowed]
  return list.includes(current)
}

/**
 * Guard de rota com verificacao sequencial: loading -> auth -> role -> children.
 */
export function RoleGuard({ children, role }: RoleGuardProps) {
  const isLoading = useAuthStore((state) => state.isLoading)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const currentRole = useAuthStore((state) => state.role)
  const location = useLocation()

  // Guard para evitar disparar o toast multiplas vezes no mesmo redirect
  // (render duplicado do React StrictMode, re-render antes do Navigate unmount).
  const toastFiredRef = useRef(false)
  // Phase 4.1 — Pattern 3 (RESEARCH §Pattern 3 / INT-WARNING-3 defense).
  // Quando JWT app_metadata.role não é emitido, role==null. Em vez de
  // redirect direto a /auth/login (que cria loop, login é bem-sucedido com
  // role ainda null), tentamos UM one-shot initialize() que tem fallback DB
  // via fetchProfile (queries usuarios_rh + candidatos com RLS).
  const fallbackTriedRef = useRef(false)

  // Decisao derivada do estado atual.
  const authResolved = !isLoading
  const authenticated = authResolved && isAuthenticated && currentRole !== null
  const allowed = authenticated && isRoleAllowed(currentRole, role)
  const wrongRole = authenticated && !allowed

  useEffect(() => {
    if (wrongRole && currentRole && !toastFiredRef.current) {
      toastFiredRef.current = true
      toast.info(wrongAreaMessage(currentRole))
    }
  }, [wrongRole, currentRole])

  // 1. Loading -> spinner apos delay de 200ms
  if (isLoading) {
    return (
      <LoadingDelay delay={200}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LoadingDelay>
    )
  }

  // 2a. Nao autenticado -> redireciona para login preservando destino
  if (!isAuthenticated) {
    const redirectTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth/login?redirect=${redirectTo}`} replace />
  }

  // 2b. Authenticated mas role===null -> tentar one-shot DB fallback antes de bouncar.
  //     Previne INT-WARNING-3 redirect loop quando JWT custom hook nao emite
  //     app_metadata.role. fetchProfile (via initialize) consulta usuarios_rh
  //     + candidatos com RLS.
  if (currentRole === null) {
    if (!fallbackTriedRef.current) {
      fallbackTriedRef.current = true
      void useAuthStore.getState().initialize()
      return (
        <LoadingDelay delay={200}>
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </LoadingDelay>
      )
    }
    // Fallback ja tentado e ainda role===null -> bounce to login (last resort)
    const redirectTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth/login?redirect=${redirectTo}`} replace />
  }

  // 3. Role incorreto -> redireciona para home do role atual (toast ja disparou no effect)
  if (!isRoleAllowed(currentRole, role)) {
    return <Navigate to={ROLE_HOME[currentRole]} replace />
  }

  // 4. Role correto -> renderiza children
  return <>{children}</>
}
