/**
 * useSessionTimeout Hook
 *
 * Custom hook para gerenciar timeout de sessão por inatividade.
 * Monitora atividade do usuário e faz logout automático após período de inatividade.
 *
 * Funcionalidades:
 * - Detecta atividade do usuário (mouse, teclado, toque)
 * - Faz logout automático após 30 minutos de inatividade
 * - Mostra avisos antes do timeout
 * - Registra evento de sessão expirada nos logs
 *
 * @module hooks/useSessionTimeout
 */

import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import { logAccessEvent } from '@/services/logAccessService'

/**
 * Configurações de timeout de sessão (em milissegundos)
 */
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutos
const WARNING_TIME = 2 * 60 * 1000 // Avisar 2 minutos antes do logout

/**
 * Hook para gerenciar timeout de sessão admin por inatividade
 *
 * @param isEnabled - Se true, o monitoramento está ativo. Útil para desabilitar em certas rotas.
 *
 * @example
 * ```tsx
 * function RootLayout() {
 *   const { isAuthenticated } = useAdminAuthStore()
 *   useSessionTimeout(isAuthenticated) // Monitora apenas se autenticado
 *
 *   return <Outlet />
 * }
 * ```
 */
export function useSessionTimeout(isEnabled: boolean = true) {
  const navigate = useNavigate()
  const { isAuthenticated, adminUser, logout } = useAdminAuthStore()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  /**
   * Registra atividade do usuário e reseta timers
   */
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Limpar timers existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }

    // Configurar aviso 2 minutos antes do logout
    warningTimeoutRef.current = setTimeout(() => {
      toast.warning('Sessão próxima de expirar', {
        description: 'Você será desconectado em 2 minutos por inatividade. Mova o mouse para continuar conectado.',
        duration: 10000,
      })
    }, INACTIVITY_TIMEOUT - WARNING_TIME)

    // Configurar logout automático
    timeoutRef.current = setTimeout(async () => {
      // Registrar logout por inatividade
      if (adminUser) {
        await logAccessEvent('sessao_expirada', {
          user_id: adminUser.user_id,
          email_tentativa: adminUser.email,
        })
      }

      // Fazer logout
      await logout()

      // Mostrar mensagem
      toast.error('Sessão expirada', {
        description: 'Você foi desconectado por inatividade. Faça login novamente.',
        duration: 5000,
      })

      // Redirecionar para login
      navigate('/auth/login-rh', { replace: true })
    }, INACTIVITY_TIMEOUT)
  }, [adminUser, logout, navigate])

  /**
   * Event handlers para detectar atividade
   */
  const handleActivity = useCallback(() => {
    if (isEnabled && isAuthenticated) {
      resetTimer()
    }
  }, [isEnabled, isAuthenticated, resetTimer])

  /**
   * Configurar event listeners para detectar atividade
   */
  useEffect(() => {
    if (!isEnabled || !isAuthenticated) {
      // Limpar timers se não estiver ativado ou não autenticado
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
      return
    }

    // Eventos que indicam atividade do usuário
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    // Adicionar event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Iniciar timer
    resetTimer()

    // Cleanup: remover event listeners e limpar timers
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [isEnabled, isAuthenticated, handleActivity, resetTimer])
}
