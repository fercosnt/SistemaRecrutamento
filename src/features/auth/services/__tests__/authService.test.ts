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
// Wave 2 — signIn / signOut / resendConfirmation / tryAutoLogin (Plan 03-04)
// ============================================================

// Mock the supabase client BEFORE importing the service under test.
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resend: vi.fn(),
    },
  },
}))

// Mock the rememberMeStorage util so we can spy on setRememberMeMode order.
vi.mock('@/features/auth/utils/rememberMeStorage', () => ({
  setRememberMeMode: vi.fn(),
  rememberMeStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

// Imports after mocks
import { supabase } from '@/lib/supabase/client'
import { setRememberMeMode } from '@/features/auth/utils/rememberMeStorage'
import {
  signIn,
  signOut,
  resendConfirmation,
  tryAutoLogin,
} from '../authService'

// Shared helpers
function setupConsoleSpies(): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spies: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serializeAll: () => string
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spies: any[] = [
    vi.spyOn(console, 'log').mockImplementation(() => {}),
    vi.spyOn(console, 'error').mockImplementation(() => {}),
    vi.spyOn(console, 'warn').mockImplementation(() => {}),
    vi.spyOn(console, 'info').mockImplementation(() => {}),
    vi.spyOn(console, 'debug').mockImplementation(() => {}),
  ]
  return {
    spies,
    serializeAll: () =>
      spies
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => JSON.stringify(s.mock.calls))
        .join(''),
  }
}

describe('signIn (Wave 2, Plan 03-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('T1.1: rememberMe=true → setRememberMeMode("local"); resolves on success', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@x.com' }, session: { access_token: 'tok' } },
      error: null,
    } as never)

    await signIn({ email: 'test@x.com', senha: 'Abcd1234', rememberMe: true })

    expect(setRememberMeMode).toHaveBeenCalledWith('local')
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@x.com',
      password: 'Abcd1234',
    })
  })

  it('T1.2: ORDER LOCK — setRememberMeMode is invoked BEFORE signInWithPassword', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@x.com' }, session: { access_token: 'tok' } },
      error: null,
    } as never)

    await signIn({ email: 'test@x.com', senha: 'Abcd1234', rememberMe: true })

    const setRememberMeOrder =
      vi.mocked(setRememberMeMode).mock.invocationCallOrder[0]
    const signInOrder =
      vi.mocked(supabase.auth.signInWithPassword).mock.invocationCallOrder[0]
    expect(setRememberMeOrder).toBeLessThan(signInOrder)
  })

  it('T1.3: rememberMe=false → setRememberMeMode("session")', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@x.com' }, session: { access_token: 'tok' } },
      error: null,
    } as never)

    await signIn({ email: 'test@x.com', senha: 'Abcd1234', rememberMe: false })

    expect(setRememberMeMode).toHaveBeenCalledWith('session')
  })

  it('T1.4: invalid_credentials → AuthError{code: INVALID_CREDENTIALS} (B2)', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: 'invalid_credentials',
        status: 400,
        message: 'Invalid login credentials',
        name: 'AuthApiError',
      },
    } as never)

    await expect(
      signIn({ email: 'wrong@x.com', senha: 'wrong', rememberMe: true })
    ).rejects.toMatchObject({
      name: 'AuthError',
      code: 'INVALID_CREDENTIALS',
    })
  })

  it('T1.5: email_not_confirmed → AuthError{code: EMAIL_NOT_CONFIRMED, field: email} (B3)', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: 'email_not_confirmed',
        status: 400,
        message: 'Email not confirmed',
        name: 'AuthApiError',
      },
    } as never)

    await expect(
      signIn({ email: 'unconfirmed@x.com', senha: 'Abcd1234', rememberMe: true })
    ).rejects.toMatchObject({
      name: 'AuthError',
      code: 'EMAIL_NOT_CONFIRMED',
      field: 'email',
    })
  })

  it('T1.6: rate_limit with "30 seconds" → AuthError{RATE_LIMITED, retryAfterSeconds=30}', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: 'over_email_send_rate_limit',
        status: 429,
        message: 'try again in 30 seconds',
        name: 'AuthApiError',
      },
    } as never)

    await expect(
      signIn({ email: 'rl@x.com', senha: 'Abcd1234', rememberMe: true })
    ).rejects.toMatchObject({
      name: 'AuthError',
      code: 'RATE_LIMITED',
      retryAfterSeconds: 30,
    })
  })

  it('T1.7/T1.8: network throw (TypeError) → AuthError{NETWORK_ERROR} (B13)', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(
      new TypeError('Failed to fetch')
    )

    await expect(
      signIn({ email: 'x@x.com', senha: 'Abcd1234', rememberMe: true })
    ).rejects.toMatchObject({
      name: 'AuthError',
      code: 'NETWORK_ERROR',
    })
  })

  it('T1.9: NEVER logs senha/password/access_token across all paths (Pitfall 7 / B14)', async () => {
    const { serializeAll } = setupConsoleSpies()

    // Success path
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: { id: 'u1', email: 'test@x.com' }, session: { access_token: 'sekret-tok' } },
      error: null,
    } as never)
    await signIn({ email: 'test@x.com', senha: 'Abcd1234', rememberMe: true })

    // Error-mapped path
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        code: 'invalid_credentials',
        status: 400,
        message: 'Invalid login credentials',
        name: 'AuthApiError',
      },
    } as never)
    await signIn({ email: 'test@x.com', senha: 'AnotherPwd9', rememberMe: false }).catch(
      () => {}
    )

    // Network throw path
    vi.mocked(supabase.auth.signInWithPassword).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    )
    await signIn({ email: 'test@x.com', senha: 'TopSecret77', rememberMe: true }).catch(
      () => {}
    )

    const serialized = serializeAll()
    expect(serialized).not.toContain('Abcd1234')
    expect(serialized).not.toContain('AnotherPwd9')
    expect(serialized).not.toContain('TopSecret77')
    expect(serialized).not.toContain('sekret-tok')
    expect(serialized).not.toMatch(/"senha"/)
    expect(serialized).not.toMatch(/"password"/)
    expect(serialized).not.toMatch(/"access_token"/)
    expect(serialized).not.toMatch(/"refresh_token"/)
  })

  it('T1.10: success path logs the redacted shape { email, rememberMe, hasPassword }', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: { id: 'u1', email: 'log@x.com' }, session: { access_token: 't' } },
      error: null,
    } as never)

    await signIn({ email: 'log@x.com', senha: 'Abcd1234', rememberMe: true })

    // At least one console.log call where the second arg has the redacted shape
    const matchingCall = logSpy.mock.calls.find((call) => {
      const arg = call[1]
      return (
        arg &&
        typeof arg === 'object' &&
        'hasPassword' in arg &&
        (arg as { hasPassword: unknown }).hasPassword === true
      )
    })
    expect(matchingCall).toBeDefined()
  })

  it('T1.11: missing session in success response → AuthError{UNKNOWN_ERROR}', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: { id: 'u1', email: 'x@x.com' }, session: null },
      error: null,
    } as never)

    await expect(
      signIn({ email: 'x@x.com', senha: 'Abcd1234', rememberMe: true })
    ).rejects.toMatchObject({
      name: 'AuthError',
      code: 'UNKNOWN_ERROR',
    })
  })
})

describe('signOut (Wave 2, Plan 03-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('T1.12: success → resolves; calls supabase.auth.signOut', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never)
    await expect(signOut()).resolves.toBeUndefined()
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('T1.13: error from SDK → AuthError{SERVER_ERROR or UNKNOWN}', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: {
        code: undefined,
        status: 500,
        message: 'Internal',
        name: 'AuthApiError',
      },
    } as never)

    await expect(signOut()).rejects.toMatchObject({ name: 'AuthError' })
  })

  it('T1.14: network throw → AuthError{NETWORK_ERROR}', async () => {
    vi.mocked(supabase.auth.signOut).mockRejectedValue(
      new TypeError('Failed to fetch')
    )
    await expect(signOut()).rejects.toMatchObject({
      name: 'AuthError',
      code: 'NETWORK_ERROR',
    })
  })
})

describe('resendConfirmation (Wave 2, Plan 03-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('T1.15: success → calls resend({ type: "signup", email })', async () => {
    vi.mocked(supabase.auth.resend).mockResolvedValue({ error: null } as never)
    await expect(
      resendConfirmation('user@example.com')
    ).resolves.toBeUndefined()
    expect(supabase.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'user@example.com',
    })
  })

  it('T1.16: rate_limit error → AuthError{RATE_LIMITED}', async () => {
    vi.mocked(supabase.auth.resend).mockResolvedValue({
      error: {
        code: 'over_email_send_rate_limit',
        status: 429,
        message: 'try again in 60 seconds',
        name: 'AuthApiError',
      },
    } as never)

    await expect(
      resendConfirmation('user@example.com')
    ).rejects.toMatchObject({
      name: 'AuthError',
      code: 'RATE_LIMITED',
      retryAfterSeconds: 60,
    })
  })
})

describe('tryAutoLogin (Wave 2, Plan 03-04 — moved from cadastro)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('T1.17: returns true on first success (no retry)', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    } as never)

    const promise = tryAutoLogin('joao@example.com', 'Abcd1234')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe(true)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1)
  })

  it('T1.18: retries once with 500ms backoff, second succeeds', async () => {
    vi.mocked(supabase.auth.signInWithPassword)
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      } as never)
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      } as never)

    const promise = tryAutoLogin('joao@example.com', 'Abcd1234')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe(true)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(2)
  })

  it('T1.19: returns false when both attempts fail', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    } as never)

    const promise = tryAutoLogin('joao@example.com', 'Abcd1234')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe(false)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(2)
  })

  it('T1.20: NEVER logs the password (Pitfall 7)', async () => {
    const { serializeAll } = setupConsoleSpies()

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    } as never)

    const promise = tryAutoLogin('joao@example.com', 'Abcd1234')
    await vi.runAllTimersAsync()
    await promise

    const serialized = serializeAll()
    expect(serialized).not.toContain('Abcd1234')
  })
})
