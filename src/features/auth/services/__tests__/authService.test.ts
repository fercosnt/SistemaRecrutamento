/**
 * Wave 0 stub — populated during Waves 1-3.
 * Behaviors covered: B1, B2, B3, B4, B13, B14.
 * See .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md
 *
 * Wave 1 (Plan 03-02):
 *   - AuthError class tests landed (T1.1-T1.4)
 *   - mapSupabaseError + extractRetryAfterSeconds tests landed (T2.1-T2.18)
 *   - signIn/signOut/resend tests remain todo (Wave 2 / Plan 03-04)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthError, isAuthError } from '../../types/authTypes'
import {
  mapSupabaseError,
  extractRetryAfterSeconds,
} from '../../utils/mapSupabaseError'

// ============================================================
// Task 1 — AuthError class + isAuthError guard (Wave 1, Plan 03-02)
// ============================================================

describe('AuthError class (Wave 1, Plan 03-02)', () => {
  it('T1.1: constructor with 2 args produces the canonical shape', () => {
    const e = new AuthError('msg', 'INVALID_CREDENTIALS')
    expect(e.name).toBe('AuthError')
    expect(e.message).toBe('msg')
    expect(e.code).toBe('INVALID_CREDENTIALS')
    expect(e.field).toBeUndefined()
    expect(e.retryAfterSeconds).toBeUndefined()
    expect(e.originalError).toBeUndefined()
    expect(e).toBeInstanceOf(Error)
  })

  it('T1.2: constructor preserves all 5 positional args', () => {
    const original = { status: 429 }
    const e = new AuthError('msg', 'RATE_LIMITED', undefined, 60, original)
    expect(e.code).toBe('RATE_LIMITED')
    expect(e.field).toBeUndefined()
    expect(e.retryAfterSeconds).toBe(60)
    expect(e.originalError).toBe(original)
  })

  it('T1.3: isAuthError type guard (constructor-agnostic, defensive)', () => {
    expect(isAuthError(new AuthError('x', 'UNKNOWN_ERROR'))).toBe(true)
    expect(isAuthError(new Error('x'))).toBe(false)
    expect(isAuthError(null)).toBe(false)
    expect(isAuthError(undefined)).toBe(false)
    expect(isAuthError('oops')).toBe(false)
    // Plain object with the right name must NOT pass — guard requires Error instance
    expect(isAuthError({ name: 'AuthError' })).toBe(false)
  })

  it('T1.4: 5 positional args in canonical order (message, code, field?, retryAfterSeconds?, originalError?)', () => {
    const e = new AuthError('m', 'EMAIL_NOT_CONFIRMED', 'email', 120, { a: 1 })
    expect(e.message).toBe('m')
    expect(e.code).toBe('EMAIL_NOT_CONFIRMED')
    expect(e.field).toBe('email')
    expect(e.retryAfterSeconds).toBe(120)
    expect(e.originalError).toEqual({ a: 1 })
  })
})

// ============================================================
// Task 2 — mapSupabaseError + extractRetryAfterSeconds (Wave 1, Plan 03-02)
// ============================================================

/**
 * Helper: build an AuthApiError-shaped Error instance for use as input.
 * Tests pass these through mapSupabaseError; production receives the real
 * SupabaseAuthError from `supabase.auth.*`.
 */
function buildSupabaseAuthApiError(opts: {
  code?: string
  status?: number
  message?: string
}): Error & { code?: string; status?: number; __isAuthError?: boolean } {
  const err = new Error(opts.message ?? '') as Error & {
    code?: string
    status?: number
    __isAuthError?: boolean
  }
  err.name = 'AuthApiError'
  err.code = opts.code
  err.status = opts.status
  // supabase-js isAuthError checks `__isAuthError` internally
  err.__isAuthError = true
  return err
}

describe('mapSupabaseError + extractRetryAfterSeconds (Wave 1, Plan 03-02)', () => {
  // Vitest v4 has overloaded-method spy-typing limitations on DOM/console methods
  // (see STATE.md Phase 2 decision [02-04]). Escape hatch: typed as `any[]` with
  // explicit callback annotations below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consoleSpies: any[] = []

  beforeEach(() => {
    // Install spies on all 5 console methods to verify Pitfall 7 (zero calls).
    consoleSpies.push(vi.spyOn(console, 'log').mockImplementation(() => {}))
    consoleSpies.push(vi.spyOn(console, 'error').mockImplementation(() => {}))
    consoleSpies.push(vi.spyOn(console, 'warn').mockImplementation(() => {}))
    consoleSpies.push(vi.spyOn(console, 'info').mockImplementation(() => {}))
    consoleSpies.push(vi.spyOn(console, 'debug').mockImplementation(() => {}))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    consoleSpies.length = 0
  })

  it('T2.1: invalid_credentials → INVALID_CREDENTIALS (generic copy, D-01)', () => {
    const out = mapSupabaseError(
      buildSupabaseAuthApiError({
        code: 'invalid_credentials',
        status: 400,
        message: 'Invalid login credentials',
      })
    )
    expect(out).toBeInstanceOf(AuthError)
    expect(out.code).toBe('INVALID_CREDENTIALS')
    expect(out.message).toBe(
      'Email ou senha inválidos. Verifique os dados e tente novamente.'
    )
    expect(out.field).toBeUndefined()
  })

  it('T2.2: email_not_confirmed → EMAIL_NOT_CONFIRMED + field=email', () => {
    const out = mapSupabaseError(
      buildSupabaseAuthApiError({
        code: 'email_not_confirmed',
        status: 400,
        message: 'Email not confirmed',
      })
    )
    expect(out.code).toBe('EMAIL_NOT_CONFIRMED')
    expect(out.field).toBe('email')
    expect(out.message).toBe('Confirme seu email antes de fazer login.')
  })

  it('T2.3: over_email_send_rate_limit with "45 seconds" → RATE_LIMITED retryAfterSeconds=45', () => {
    const out = mapSupabaseError(
      buildSupabaseAuthApiError({
        code: 'over_email_send_rate_limit',
        status: 429,
        message: 'try again in 45 seconds',
      })
    )
    expect(out.code).toBe('RATE_LIMITED')
    expect(out.retryAfterSeconds).toBe(45)
  })

  it('T2.4: over_request_rate_limit with no seconds → RATE_LIMITED retryAfterSeconds=60 (fallback)', () => {
    const out = mapSupabaseError(
      buildSupabaseAuthApiError({
        code: 'over_request_rate_limit',
        status: 429,
        message: 'too many requests',
      })
    )
    expect(out.code).toBe('RATE_LIMITED')
    expect(out.retryAfterSeconds).toBe(60)
  })

  it('T2.5: weak_password → SERVER_ERROR + field=senha', () => {
    const out = mapSupabaseError(
      buildSupabaseAuthApiError({
        code: 'weak_password',
        status: 400,
        message: 'weak',
      })
    )
    expect(out.code).toBe('SERVER_ERROR')
    expect(out.field).toBe('senha')
    expect(out.message).toBe('Senha muito fraca. Escolha uma senha mais forte.')
  })

  it('T2.6: same_password → SERVER_ERROR + field=senha + diferente message', () => {
    const out = mapSupabaseError(
      buildSupabaseAuthApiError({
        code: 'same_password',
        status: 400,
        message: 'same',
      })
    )
    expect(out.code).toBe('SERVER_ERROR')
    expect(out.field).toBe('senha')
    expect(out.message).toMatch(/diferente/i)
  })

  it('T2.7: Pitfall 9 fallback — code=undefined + 400 + /credentials/i → INVALID_CREDENTIALS', () => {
    const out = mapSupabaseError(
      buildSupabaseAuthApiError({
        code: undefined,
        status: 400,
        message: 'Invalid login credentials',
      })
    )
    expect(out.code).toBe('INVALID_CREDENTIALS')
  })

  it('T2.8: 5xx fallback — code=undefined + 503 → SERVER_ERROR', () => {
    const out = mapSupabaseError(
      buildSupabaseAuthApiError({
        code: undefined,
        status: 503,
        message: 'Gateway',
      })
    )
    expect(out.code).toBe('SERVER_ERROR')
  })

  it('T2.9: non-Error input — null and string both → UNKNOWN_ERROR', () => {
    const outNull = mapSupabaseError(null)
    const outStr = mapSupabaseError('oops')
    expect(outNull.code).toBe('UNKNOWN_ERROR')
    expect(outStr.code).toBe('UNKNOWN_ERROR')
    expect(outNull.message).toBe('Erro inesperado. Tente novamente.')
  })

  it('T2.10: NEVER calls console.* across every branch (Pitfall 7)', () => {
    // Exercise every branch with a single test
    mapSupabaseError(
      buildSupabaseAuthApiError({
        code: 'invalid_credentials',
        status: 400,
        message: 'Invalid login credentials',
      })
    )
    mapSupabaseError(
      buildSupabaseAuthApiError({
        code: 'email_not_confirmed',
        status: 400,
        message: 'Email not confirmed',
      })
    )
    mapSupabaseError(
      buildSupabaseAuthApiError({
        code: 'over_email_send_rate_limit',
        status: 429,
        message: 'try again in 45 seconds',
      })
    )
    mapSupabaseError(
      buildSupabaseAuthApiError({
        code: 'over_request_rate_limit',
        status: 429,
        message: 'too many requests',
      })
    )
    mapSupabaseError(
      buildSupabaseAuthApiError({ code: 'weak_password', status: 400, message: 'weak' })
    )
    mapSupabaseError(
      buildSupabaseAuthApiError({ code: 'same_password', status: 400, message: 'same' })
    )
    mapSupabaseError(
      buildSupabaseAuthApiError({ code: 'session_expired', status: 401, message: 'expired' })
    )
    mapSupabaseError(
      buildSupabaseAuthApiError({
        code: undefined,
        status: 400,
        message: 'Invalid login credentials',
      })
    )
    mapSupabaseError(
      buildSupabaseAuthApiError({ code: undefined, status: 503, message: 'Gateway' })
    )
    mapSupabaseError(null)
    mapSupabaseError('oops')
    for (const spy of consoleSpies) {
      expect(spy).not.toHaveBeenCalled()
    }
  })

  it('T2.11: extractRetryAfterSeconds — "120 second" → 120', () => {
    expect(
      extractRetryAfterSeconds({
        message: 'try again in 120 second',
        code: 'over_email_send_rate_limit',
      })
    ).toBe(120)
  })

  it('T2.12: extractRetryAfterSeconds — no regex match + over_request_rate_limit → 60', () => {
    expect(
      extractRetryAfterSeconds({
        message: 'Gateway',
        code: 'over_request_rate_limit',
      })
    ).toBe(60)
  })

  it('T2.13: extractRetryAfterSeconds — no number, undefined code → 60 (final fallback)', () => {
    expect(
      extractRetryAfterSeconds({ message: 'no number', code: undefined })
    ).toBe(60)
  })

  it('T2.14: extractRetryAfterSeconds — ISSUE-007 99999 seconds clamps to 3600 (NOT fallback to 60)', () => {
    expect(
      extractRetryAfterSeconds({
        message: 'try again in 99999 seconds',
        code: 'over_email_send_rate_limit',
      })
    ).toBe(3600)
  })

  it('T2.15: extractRetryAfterSeconds — ISSUE-007 7200 seconds clamps to 3600', () => {
    expect(
      extractRetryAfterSeconds({
        message: 'try again in 7200 seconds',
        code: 'over_email_send_rate_limit',
      })
    ).toBe(3600)
  })

  it('T2.16: extractRetryAfterSeconds — ISSUE-007 3601 seconds clamps to 3600 (first second above ceiling)', () => {
    expect(
      extractRetryAfterSeconds({
        message: 'try again in 3601 seconds',
        code: 'over_email_send_rate_limit',
      })
    ).toBe(3600)
  })

  it('T2.17: extractRetryAfterSeconds — exact 3600 is in-range, returned as-is', () => {
    expect(
      extractRetryAfterSeconds({
        message: 'try again in 3600 seconds',
        code: 'over_email_send_rate_limit',
      })
    ).toBe(3600)
  })

  it('T2.18: extractRetryAfterSeconds — regex miss + rate-limit code → 60 (code-based fallback path)', () => {
    expect(
      extractRetryAfterSeconds({
        message: 'no number here',
        code: 'over_email_send_rate_limit',
      })
    ).toBe(60)
  })
})

// ============================================================
// Wave 2+ todos (Plan 03-04 will implement signIn/signOut/resend)
// ============================================================

describe('authService — Wave 2+ stubs (03-login-recuperacao-senha)', () => {
  it.todo('B1: signIn with correct creds resolves; authStore listener picks up SIGNED_IN')
  it.todo('B2: signIn with wrong creds throws AuthError{code: INVALID_CREDENTIALS}')
  it.todo(
    'B3: signIn with email_not_confirmed throws AuthError{code: EMAIL_NOT_CONFIRMED, field: email}'
  )
  it.todo(
    'B4: mapSupabaseError maps over_email_send_rate_limit → AuthError{code: RATE_LIMITED, retryAfterSeconds ≥ 1} — production integration'
  )
  it.todo('B13: signIn with network exception throws AuthError{code: NETWORK_ERROR}')
  it.todo('B14: signIn never logs senha/password/access_token via console.* (Pitfall 7)')
})
