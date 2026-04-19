/**
 * Log Access Service
 *
 * Serviço para registrar eventos de acesso (login, logout, tentativas falhas)
 * na tabela logs_acesso do Supabase.
 *
 * Funcionalidades:
 * - Captura informações do dispositivo (navegador, SO, tipo)
 * - Tenta obter IP do cliente
 * - Registra tentativas de login (sucesso e falha)
 * - Registra logouts
 *
 * @module services/logAccessService
 */

import { supabase } from '@/lib/supabase/client'
import { UAParser } from 'ua-parser-js'

/**
 * Tipos de eventos de acesso suportados
 */
export type EventoAcesso =
  | 'login_sucesso'
  | 'login_falha'
  | 'logout'
  | 'sessao_expirada'
  | 'acesso_negado'
  | 'password_reset_request'
  | 'password_reset_completed'
  | 'password_reset_failed'

/**
 * Interface para dados de log de acesso
 */
export interface LogAcessoData {
  user_id?: string | null
  evento: EventoAcesso
  email_tentativa?: string
  ip_address: string
  device_info?: string
  device_type?: string
  browser?: string
  operating_system?: string
  country?: string
  city?: string
  erro_mensagem?: string
}

/**
 * Informações do dispositivo extraídas do user agent
 */
interface DeviceInfo {
  device_info: string
  device_type: string
  browser: string
  operating_system: string
}

/**
 * Extrai informações do dispositivo usando user agent
 *
 * @param userAgent - String do user agent do navegador
 * @returns Objeto com informações do dispositivo
 */
function getDeviceInfo(userAgent: string): DeviceInfo {
  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  // Determinar tipo de dispositivo
  let deviceType = 'desktop'
  if (result.device.type === 'mobile') {
    deviceType = 'mobile'
  } else if (result.device.type === 'tablet') {
    deviceType = 'tablet'
  }

  // Nome do navegador e versão
  const browser = result.browser.name
    ? `${result.browser.name} ${result.browser.version || ''}`
    : 'Unknown Browser'

  // Sistema operacional e versão
  const os = result.os.name
    ? `${result.os.name} ${result.os.version || ''}`
    : 'Unknown OS'

  return {
    device_info: userAgent,
    device_type: deviceType,
    browser: browser.trim(),
    operating_system: os.trim(),
  }
}

/**
 * Obtém o endereço IP do cliente
 *
 * Estratégias:
 * 1. Tenta usar ipify.org API (público e gratuito)
 * 2. Fallback para IP local (127.0.0.1) se falhar
 *
 * Nota: Em produção, considere usar o header X-Forwarded-For do backend
 * ou um serviço de geolocalização mais robusto.
 *
 * @returns Promise com endereço IP
 */
async function getClientIP(): Promise<string> {
  try {
    // Usar ipify.org para obter IP público
    const response = await fetch('https://api.ipify.org?format=json', {
      timeout: 3000,
    } as RequestInit)

    if (!response.ok) {
      throw new Error('Failed to fetch IP')
    }

    const data = await response.json()
    return data.ip || '127.0.0.1'
  } catch (error) {
    console.warn('Não foi possível obter IP do cliente, usando fallback:', error)
    // Fallback para IP local
    return '127.0.0.1'
  }
}

/**
 * Registra um evento de acesso no banco de dados
 *
 * @param evento - Tipo do evento (login_sucesso, login_falha, etc)
 * @param options - Dados opcionais para o log
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await logAccessEvent('login_sucesso', {
 *   user_id: authData.user.id,
 *   email_tentativa: 'user@example.com',
 * })
 * ```
 *
 * @example
 * ```typescript
 * await logAccessEvent('login_falha', {
 *   email_tentativa: 'user@example.com',
 *   erro_mensagem: 'Invalid login credentials',
 * })
 * ```
 */
export async function logAccessEvent(
  evento: EventoAcesso,
  options: {
    user_id?: string | null
    email_tentativa?: string
    erro_mensagem?: string
  } = {}
): Promise<void> {
  try {
    // Obter informações do dispositivo
    const userAgent = navigator.userAgent
    const deviceInfo = getDeviceInfo(userAgent)

    // Obter IP do cliente
    const ipAddress = await getClientIP()

    // Preparar dados do log
    const logData: LogAcessoData = {
      evento,
      user_id: options.user_id || null,
      email_tentativa: options.email_tentativa,
      ip_address: ipAddress,
      device_info: deviceInfo.device_info,
      device_type: deviceInfo.device_type,
      browser: deviceInfo.browser,
      operating_system: deviceInfo.operating_system,
      erro_mensagem: options.erro_mensagem,
      // country e city podem ser preenchidos futuramente com serviço de geolocalização
      country: undefined,
      city: undefined,
    }

    // Inserir log no banco de dados
    const { error } = await (supabase as any).from('logs_acesso').insert(logData)

    if (error) {
      console.error('Erro ao registrar log de acesso:', error)
      // Não lançar erro para não afetar fluxo principal
      // Logging é secundário ao processo de autenticação
    } else {
      console.log(`Log de acesso registrado: ${evento}`)
    }
  } catch (error) {
    console.error('Erro inesperado ao registrar log de acesso:', error)
    // Não lançar erro para não afetar fluxo principal
  }
}

/**
 * Helper para registrar login bem-sucedido
 *
 * @param user_id - ID do usuário autenticado
 * @param email - Email usado no login
 */
export async function logLoginSuccess(user_id: string, email: string): Promise<void> {
  await logAccessEvent('login_sucesso', {
    user_id,
    email_tentativa: email,
  })
}

/**
 * Helper para registrar falha de login
 *
 * @param email - Email usado na tentativa
 * @param errorMessage - Mensagem de erro
 */
export async function logLoginFailure(email: string, errorMessage: string): Promise<void> {
  await logAccessEvent('login_falha', {
    email_tentativa: email,
    erro_mensagem: errorMessage,
  })
}

/**
 * Helper para registrar logout
 *
 * @param user_id - ID do usuário que está saindo
 */
export async function logLogout(user_id: string): Promise<void> {
  await logAccessEvent('logout', {
    user_id,
  })
}

/**
 * Helper para registrar acesso negado
 *
 * @param email - Email usado na tentativa
 * @param reason - Motivo do acesso negado
 */
export async function logAccessDenied(email: string, reason: string): Promise<void> {
  await logAccessEvent('acesso_negado', {
    email_tentativa: email,
    erro_mensagem: reason,
  })
}

/**
 * Helper para registrar solicitação de recuperação de senha
 *
 * @param email - Email para o qual foi solicitada recuperação
 */
export async function logPasswordResetRequest(email: string): Promise<void> {
  await logAccessEvent('password_reset_request', {
    email_tentativa: email,
  })
}

/**
 * Helper para registrar recuperação de senha concluída
 *
 * @param user_id - ID do usuário que redefiniu a senha
 * @param email - Email do usuário
 */
export async function logPasswordResetCompleted(user_id: string, email?: string): Promise<void> {
  await logAccessEvent('password_reset_completed', {
    user_id,
    email_tentativa: email,
  })
}

/**
 * Helper para registrar falha na recuperação de senha
 *
 * @param email - Email usado na tentativa
 * @param errorMessage - Mensagem de erro
 */
export async function logPasswordResetFailed(email: string, errorMessage: string): Promise<void> {
  await logAccessEvent('password_reset_failed', {
    email_tentativa: email,
    erro_mensagem: errorMessage,
  })
}
