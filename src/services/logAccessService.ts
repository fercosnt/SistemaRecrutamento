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
 * O vocabulário de eventos, em **runtime** e não só em tipo.
 *
 * ⚠ ELE TEM DE BATER, VALOR A VALOR, com o CHECK `check_evento` de
 * `supabase/migrations/20260822000001_p47_check_evento_vocabulario.sql`.
 * `logAccessVocabulario.test.ts` lê aquele arquivo e compara com esta lista —
 * editar um sem o outro reprova.
 *
 * ── POR QUE ISTO EXISTE COMO ARRAY ───────────────────────────────────────────
 * Até 2026-08-22 isto era só um `type` union, e por isso **nada podia
 * compará-lo com o banco**. O resultado: o tipo declarava 8 valores, o CHECK
 * aceitava 8 OUTROS, e a interseção era de TRÊS. Cinco valores do tipo eram
 * ilegais no banco — inclusive `sessao_expirada`, que é o que o único chamador
 * vivo manda (`useSessionTimeout.ts:76`).
 *
 * Aquele INSERT falhava com `23514` em toda execução, e o `catch` de
 * `logAccessEvent` engole o erro de propósito. **O log de acesso ficou sem
 * gravar de 2026-04-20 a 2026-08-22 — quatro meses — sem ninguém notar.**
 * Um tipo que não pode ser confrontado com o banco é uma promessa sem gate.
 */
export const EVENTOS_ACESSO = [
  'login_sucesso',
  'login_falha',
  'logout',
  'sessao_expirada',
  'acesso_negado',
  'senha_alterada',
  'senha_resetada',
  'senha_reset_solicitada',
  'senha_reset_falhou',
  'email_alterado',
  'conta_bloqueada',
  'conta_desbloqueada',
] as const

/** Tipos de eventos de acesso suportados — derivado do array, nunca duplicado. */
export type EventoAcesso = (typeof EVENTOS_ACESSO)[number]

/**
 * Interface para dados de log de acesso
 */
export interface LogAcessoData {
  user_id?: string | null
  evento: EventoAcesso
  email_tentativa?: string
  /**
   * ⚠ AUSENTE DE PROPÓSITO no que o cliente envia — quem preenche é o SERVIDOR,
   * pelo trigger `trg_preencher_ip_logs_acesso` (migration `20260813000001`), a
   * partir do `x-forwarded-for` da própria requisição. Continua opcional aqui
   * para inserções de servidor que já saibam o endereço; o trigger preenche o
   * que falta e **nunca sobrescreve** o que veio.
   */
  ip_address?: string
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

/*
 * ── O IP NÃO É MAIS DESCOBERTO PELO NAVEGADOR (2026-08-13) ───────────────────
 *
 * Aqui existia `getClientIP()`, que pedia o próprio endereço a
 * `https://api.ipify.org` e mandava o resultado no INSERT. Foi removida, e a
 * remoção conserta DOIS defeitos que tinham a mesma raiz — `ip_address` era
 * `NOT NULL`, então o cliente PRECISAVA produzir algum valor:
 *
 *   1. Todo registro de acesso mandava o endereço de quem usa o sistema para um
 *      terceiro. O destino estava registrado como `pendente-de-decisao` em
 *      `src/__tests__/destinosDeRedeComFicha.test.ts`; o operador decidiu, em
 *      2026-08-13, ELIMINAR a transferência em vez de declará-la. O servidor já
 *      vê o IP — pedir a um terceiro o que se tem em casa é transferir à toa.
 *
 *   2. Quando o `fetch` falhava, o `catch` gravava `127.0.0.1` — um endereço que
 *      não é de ninguém — num log de auditoria. Um log que inventa o campo que
 *      ele existe para provar é pior que um log sem o campo. Os 23 registros
 *      vivos têm IP real (o fallback nunca chegou a gravar), então isto fecha a
 *      porta antes de o defeito produzir dado ruim.
 *
 * Quem preenche agora é o trigger `trg_preencher_ip_logs_acesso`
 * (`supabase/migrations/20260813000001_p47_ip_no_servidor.sql`), a partir do
 * primeiro elemento de `x-forwarded-for`. Sem cabeçalho legível ele grava NULL,
 * de propósito: `inet_client_addr()` devolveria o IP do POOLER, uma resposta
 * verdadeira sobre a pergunta errada — o mesmo erro do `127.0.0.1`, mais sutil.
 *
 * ⚠⚠ ORDEM DE DEPLOY, E A INVERSÃO É SILENCIOSA: a migration tem de estar
 * APLICADA antes de este arquivo ir para produção. Sem ela, o INSERT sem
 * `ip_address` bate `23502` — e o `catch` logo abaixo ENGOLE o erro de
 * propósito, então o registro de sessão expirada pararia de ser gravado sem
 * alarme nenhum. A ordem inversa (migration antes, frontend depois) é segura: o
 * trigger respeita um `ip_address` que venha preenchido.
 */

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

    // Preparar dados do log. `ip_address` é OMITIDO de propósito — quem preenche
    // é o trigger `trg_preencher_ip_logs_acesso`, no servidor (ver o bloco acima).
    const logData: LogAcessoData = {
      evento,
      user_id: options.user_id || null,
      email_tentativa: options.email_tentativa,
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
  await logAccessEvent('senha_reset_solicitada', {
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
  await logAccessEvent('senha_resetada', {
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
  await logAccessEvent('senha_reset_falhou', {
    email_tentativa: email,
    erro_mensagem: errorMessage,
  })
}
