/**
 * mapSupabaseError + extractRetryAfterSeconds — Phase 3 Wave 1 (Plan 03-02).
 *
 * Pura, zero side-effects:
 *   - Nao loga (Pitfall 7 — consumers sao quem logam `{ code, status }` sanitizado).
 *   - Nao muta input.
 *   - Nao acessa supabase.auth / storage / localStorage.
 *
 * Consumo:
 *   - Wave 2 (Plan 03-04): `authService.signIn/signOut/resendConfirmation`
 *     wrap supabase-js erros passando pelo `mapSupabaseError` antes de propagar.
 *   - Wave 3 (Plan 03-05/06): paginas fazem `catch (err) { if (isAuthError(err)) {...} }`.
 *
 * ISSUE-007 (clamp vs silent fallback): `extractRetryAfterSeconds` clampa a
 * [1, 3600]s. Se o servidor disser "wait 99999s", o UI cooldown nao desliga
 * antes do servidor (UI pessimista, nunca otimista). Desvia intencionalmente
 * do RESEARCH L869-878 (que fallback-a para 60s silencioso).
 */

import { AuthError } from '../types/authTypes'

// ============================================================
// Messages (from UI-SPEC L629-633 + L743-752 — verbatim)
// ============================================================

const MSG_INVALID_CREDENTIALS =
  'Email ou senha inválidos. Verifique os dados e tente novamente.'
const MSG_EMAIL_NOT_CONFIRMED = 'Confirme seu email antes de fazer login.'
const MSG_RATE_LIMITED = 'Muitas tentativas. Tente novamente em alguns instantes.'
const MSG_WEAK_PASSWORD = 'Senha muito fraca. Escolha uma senha mais forte.'
const MSG_SAME_PASSWORD = 'A nova senha deve ser diferente da atual.'
const MSG_SESSION_EXPIRED = 'Sessão expirada. Solicite um novo link.'
const MSG_SERVER_ERROR = 'Algo deu errado. Tente novamente em alguns instantes.'
const MSG_UNKNOWN_ERROR = 'Erro inesperado. Tente novamente.'

// ============================================================
// Type helpers — aceita tanto SupabaseAuthError quanto objetos AuthApiError-shaped
// ============================================================

interface AuthApiErrorShape {
  code?: string
  status?: number
  message?: string
  name?: string
}

function isObjectLike(err: unknown): err is AuthApiErrorShape {
  // Aceita tanto Error instance quanto plain objects com `.code`/`.status` — os
  // testes passam plain AuthApiError-shaped literals; producao passa Error
  // instances (o guard T-03-07 fica em typeof==='object' + !== null, que
  // rejeita null/undefined/string/number). Primitives caem no UNKNOWN_ERROR.
  return err !== null && typeof err === 'object'
}

// ============================================================
// Public API
// ============================================================

/**
 * Converte um erro cru do SDK do Supabase (ou qualquer throwable) em
 * `AuthError` canonico. Nunca loga. Nunca lanca.
 *
 * Entradas suportadas:
 *   - SupabaseAuthError (name='AuthApiError', .code, .status, .message)
 *   - AuthApiError-shaped plain objects (uso em testes)
 *   - Error genericos → UNKNOWN_ERROR
 *   - Primitives / null / undefined → UNKNOWN_ERROR
 */
export function mapSupabaseError(err: unknown): AuthError {
  // T-03-07: primitives / null / undefined curto-circuitam
  if (!isObjectLike(err)) {
    return new AuthError(
      MSG_UNKNOWN_ERROR,
      'UNKNOWN_ERROR',
      undefined,
      undefined,
      err
    )
  }

  const code = err.code
  const status = err.status
  const message = err.message ?? ''

  switch (code) {
    case 'invalid_credentials':
      return new AuthError(
        MSG_INVALID_CREDENTIALS,
        'INVALID_CREDENTIALS',
        undefined,
        undefined,
        err
      )

    case 'email_not_confirmed':
      return new AuthError(
        MSG_EMAIL_NOT_CONFIRMED,
        'EMAIL_NOT_CONFIRMED',
        'email',
        undefined,
        err
      )

    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new AuthError(
        MSG_RATE_LIMITED,
        'RATE_LIMITED',
        undefined,
        extractRetryAfterSeconds({ message, code }),
        err
      )

    case 'weak_password':
      return new AuthError(
        MSG_WEAK_PASSWORD,
        'SERVER_ERROR',
        'senha',
        undefined,
        err
      )

    case 'same_password':
      return new AuthError(
        MSG_SAME_PASSWORD,
        'SERVER_ERROR',
        'senha',
        undefined,
        err
      )

    case 'session_expired':
    case 'otp_expired':
    case 'bad_jwt':
      return new AuthError(
        MSG_SESSION_EXPIRED,
        'SERVER_ERROR',
        undefined,
        undefined,
        err
      )

    default: {
      // Pitfall 9: invalid_credentials as vezes chega com code=undefined.
      // Gate em status === 400 && /credentials/i em message.
      if (status === 400 && /credentials/i.test(message)) {
        return new AuthError(
          MSG_INVALID_CREDENTIALS,
          'INVALID_CREDENTIALS',
          undefined,
          undefined,
          err
        )
      }

      // 5xx → SERVER_ERROR
      if ((status ?? 0) >= 500) {
        return new AuthError(
          MSG_SERVER_ERROR,
          'SERVER_ERROR',
          undefined,
          undefined,
          err
        )
      }

      // Fallback absoluto
      return new AuthError(
        MSG_UNKNOWN_ERROR,
        'UNKNOWN_ERROR',
        undefined,
        undefined,
        err
      )
    }
  }
}

/**
 * Extrai `retryAfterSeconds` de uma mensagem de rate-limit.
 *
 * ISSUE-007 (DESVIA do RESEARCH L869-878):
 *   - RESEARCH propunha: `if (secs > 3600) return 60` (silent fallback).
 *   - Desvio: `if (secs > 3600) return 3600` (CLAMP no teto de 1h).
 *   - Motivacao: UI cooldown NUNCA pode ficar abaixo do server-side wait.
 *     Se o servidor disser "7200s", fallback a 60s faria o submit reabrir aos
 *     60s mas o servidor ainda rejeitaria — desincronia silenciosa.
 *     Clamp a 3600s deixa o UI pessimista (espera ate 1h) porem nunca mente.
 *
 * Retorno: inteiro finito em `[1, 3600]`. Nunca NaN, Infinity, 0 ou negativo.
 */
export function extractRetryAfterSeconds(err: {
  message?: string
  code?: string
}): number {
  const match = err.message?.match(/(\d+)\s*second/i)
  if (match) {
    const secs = parseInt(match[1], 10)
    if (Number.isFinite(secs) && secs > 0) {
      // ISSUE-007: CLAMP ao teto de 3600s (nao silent-fallback a 60)
      return secs > 3600 ? 3600 : secs
    }
  }

  // Regex miss: fallback por code
  if (err.code === 'over_email_send_rate_limit') return 60
  if (err.code === 'over_request_rate_limit') return 60

  // Fallback final
  return 60
}
