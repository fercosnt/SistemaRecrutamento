/**
 * passwordService tests — Phase 3 Wave 3 (Plan 03-04).
 *
 * Behaviors covered:
 *   - B9: requestPasswordReset D-09 anti-enumeration (swallow ALL errors
 *     except RATE_LIMITED)
 *   - B10: setNewPassword wraps supabase.auth.updateUser; maps errors
 *     via mapSupabaseError; throws NETWORK_ERROR on fetch throw
 *
 * Pitfall 7 enforced via console-spy serialize-and-grep — no senha,
 * password, access_token, refresh_token, or full email leakage.
 *
 * @see .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md
 * @see .planning/phases/03-login-recuperacao-senha/03-RESEARCH.md (§Code Examples)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock supabase client BEFORE importing service under test
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

import { supabase } from '@/lib/supabase/client'
import {
  requestPasswordReset,
  setNewPassword,
  verifyRecoveryOtp,
} from '../passwordService'

// happy-dom does provide window.location, but we ensure a deterministic
// origin for the redirectTo assertion.
beforeEach(() => {
  // Use Object.defineProperty to override origin in happy-dom safely.
  // Some happy-dom versions disallow direct assignment.
  try {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'http://localhost:3003' },
      writable: true,
    })
  } catch {
    // happy-dom default origin is http://localhost which still works for
    // the substring check below.
  }
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Helper: install console spies for Pitfall 7 redaction checks
function setupConsoleSpies(): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spies: any[]
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

// ============================================================
// requestPasswordReset (B9)
// ============================================================

describe('requestPasswordReset (Wave 3, Plan 03-04)', () => {
  it('T2.1 (B9 happy): no error → resolves without throwing', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    } as never)

    await expect(
      requestPasswordReset('valid@example.com')
    ).resolves.toBeUndefined()

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1)
  })

  it('T2.2 (B9 D-09 swallow): user_not_found error → resolves WITHOUT throwing', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: null,
      error: {
        code: 'user_not_found',
        status: 400,
        message: 'User not found',
        name: 'AuthApiError',
      },
    } as never)

    // T-03-02 anti-enumeration: must NOT throw
    await expect(
      requestPasswordReset('user-not-found@example.com')
    ).resolves.toBeUndefined()
  })

  it('T2.3 (B9 surface): over_email_send_rate_limit → throws AuthError{RATE_LIMITED}', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: null,
      error: {
        code: 'over_email_send_rate_limit',
        status: 429,
        message: 'try again in 60 seconds',
        name: 'AuthApiError',
      },
    } as never)

    await expect(
      requestPasswordReset('rate-limited@example.com')
    ).rejects.toMatchObject({
      name: 'AuthError',
      code: 'RATE_LIMITED',
      retryAfterSeconds: 60,
    })
  })

  it('T2.3b (B9 surface): over_request_rate_limit → throws AuthError{RATE_LIMITED}', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: null,
      error: {
        code: 'over_request_rate_limit',
        status: 429,
        message: 'too many requests',
        name: 'AuthApiError',
      },
    } as never)

    await expect(
      requestPasswordReset('rl@example.com')
    ).rejects.toMatchObject({
      name: 'AuthError',
      code: 'RATE_LIMITED',
    })
  })

  it('T2.4 (isRH=true): redirectTo includes ?tipo=rh', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    } as never)

    await requestPasswordReset('rh@example.com', true)

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'rh@example.com',
      expect.objectContaining({
        redirectTo: expect.stringMatching(/\/auth\/redefinir-senha\?tipo=rh$/),
      })
    )
  })

  it('T2.4b (isRH=false default): redirectTo OMITS ?tipo=rh', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    } as never)

    await requestPasswordReset('candidato@example.com')

    const call = vi.mocked(supabase.auth.resetPasswordForEmail).mock.calls[0]
    const opts = call[1] as { redirectTo?: string } | undefined
    expect(opts?.redirectTo).toMatch(/\/auth\/redefinir-senha$/)
    expect(opts?.redirectTo).not.toContain('?tipo=rh')
  })

  it('T2.5 (Pitfall 7): NEVER logs the email or sensitive substrings', async () => {
    const { serializeAll } = setupConsoleSpies()

    // Try a swallow path
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: null,
      error: {
        code: 'user_not_found',
        status: 400,
        message: 'User joao.secret@victim.com not found',
        name: 'AuthApiError',
      },
    } as never)
    await requestPasswordReset('joao.secret@victim.com')

    // And a surface (rate limit) path
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: null,
      error: {
        code: 'over_email_send_rate_limit',
        status: 429,
        message: 'try again in 30 seconds',
        name: 'AuthApiError',
      },
    } as never)
    await requestPasswordReset('joao.secret@victim.com').catch(() => {})

    const serialized = serializeAll()
    // Email substring should NOT appear in any log call
    expect(serialized).not.toContain('joao.secret@victim.com')
    expect(serialized).not.toContain('joao.secret')
    expect(serialized).not.toMatch(/"email"/)
    expect(serialized).not.toMatch(/"password"/)
    expect(serialized).not.toMatch(/"access_token"/)
  })

  it('T2.5b (network throw): SDK rejection is swallowed (D-09 — UI stays neutral)', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockRejectedValue(
      new TypeError('Failed to fetch')
    )

    // Network errors are swallowed too — UI shows the same neutral copy.
    await expect(
      requestPasswordReset('foo@bar.com')
    ).resolves.toBeUndefined()
  })
})

// ============================================================
// setNewPassword (B10)
// ============================================================

describe('setNewPassword (Wave 3, Plan 03-04)', () => {
  it('T2.6 (B10 happy): no error → resolves without throwing', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: { id: 'u1', email: 'x@x.com' } },
      error: null,
    } as never)

    await expect(setNewPassword('NewSenha123')).resolves.toBeUndefined()
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'NewSenha123',
    })
  })

  it('T2.7: same_password → AuthError{SERVER_ERROR, field: senha} (message matches /diferente/)', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: null,
      error: {
        code: 'same_password',
        status: 400,
        message: 'New password must be different',
        name: 'AuthApiError',
      },
    } as never)

    await expect(setNewPassword('NewSenha123')).rejects.toMatchObject({
      name: 'AuthError',
      code: 'SERVER_ERROR',
      field: 'senha',
    })

    // Re-test for message content (rejects.toMatchObject doesn't accept regex
    // for `message` reliably across vitest versions, so we catch and check)
    try {
      await setNewPassword('NewSenha123')
    } catch (err) {
      expect((err as Error).message).toMatch(/diferente/i)
    }
  })

  it('T2.8: weak_password → AuthError{SERVER_ERROR, field: senha} (message matches /fraca/)', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: null,
      error: {
        code: 'weak_password',
        status: 400,
        message: 'Password too weak',
        name: 'AuthApiError',
      },
    } as never)

    await expect(setNewPassword('weak')).rejects.toMatchObject({
      name: 'AuthError',
      code: 'SERVER_ERROR',
      field: 'senha',
    })

    try {
      await setNewPassword('weak')
    } catch (err) {
      expect((err as Error).message).toMatch(/fraca/i)
    }
  })

  it('T2.9: network throw → AuthError{NETWORK_ERROR}', async () => {
    vi.mocked(supabase.auth.updateUser).mockRejectedValue(
      new TypeError('Failed to fetch')
    )

    await expect(setNewPassword('NewSenha123')).rejects.toMatchObject({
      name: 'AuthError',
      code: 'NETWORK_ERROR',
    })
  })

  it('T2.10 (Pitfall 7): NEVER logs the password', async () => {
    const { serializeAll } = setupConsoleSpies()

    // Happy path
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: { id: 'u1' } },
      error: null,
    } as never)
    await setNewPassword('SuperSecret789')

    // Error-mapped path
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: null,
      error: {
        code: 'weak_password',
        status: 400,
        message: 'weak',
        name: 'AuthApiError',
      },
    } as never)
    await setNewPassword('AnotherPwd55').catch(() => {})

    // Network throw
    vi.mocked(supabase.auth.updateUser).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    )
    await setNewPassword('YetAnother99').catch(() => {})

    const serialized = serializeAll()
    expect(serialized).not.toContain('SuperSecret789')
    expect(serialized).not.toContain('AnotherPwd55')
    expect(serialized).not.toContain('YetAnother99')
    expect(serialized).not.toMatch(/"password"/)
    expect(serialized).not.toMatch(/"senha"/)
    expect(serialized).not.toMatch(/"access_token"/)
    expect(serialized).not.toMatch(/"refresh_token"/)
  })
})

// ============================================================
// verifyRecoveryOtp (Phase 5 Plan 05-06 — D-15 PKCE→OTP migration)
// ============================================================

describe('verifyRecoveryOtp (Wave 5, Plan 05-06)', () => {
  it('T6.1 (happy): verifyOtp resolves with session → resolves without throwing', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
      data: {
        session: { access_token: 'abc', user: { id: 'u1', email: 'x@x.com' } },
        user: { id: 'u1', email: 'x@x.com' },
      },
      error: null,
    } as never)

    await expect(
      verifyRecoveryOtp('x@x.com', '123456')
    ).resolves.toBeUndefined()
  })

  it('T6.2 (call shape): invokes verifyOtp with { email, token, type: "recovery" }', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
      data: { session: {}, user: {} },
      error: null,
    } as never)

    await verifyRecoveryOtp('user@example.com', '654321')

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '654321',
      type: 'recovery',
    })
  })

  it('T6.3 (invalid OTP): otp_expired → throws mapped AuthError (friendly pt-BR)', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
      data: { session: null, user: null },
      error: {
        code: 'otp_expired',
        status: 401,
        message: 'Token has expired or is invalid',
        name: 'AuthApiError',
      },
    } as never)

    await expect(
      verifyRecoveryOtp('x@x.com', '000000')
    ).rejects.toMatchObject({
      name: 'AuthError',
    })

    try {
      await verifyRecoveryOtp('x@x.com', '000000')
    } catch (err) {
      // friendly pt-BR message (não SDK raw)
      expect((err as Error).message).toMatch(/(código|sess|expir|inválid)/i)
    }
  })

  it('T6.4 (invalid OTP): otp_disabled / generic 403 → throws mapped AuthError', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
      data: { session: null, user: null },
      error: {
        code: 'invalid_credentials',
        status: 403,
        message: 'Invalid token',
        name: 'AuthApiError',
      },
    } as never)

    await expect(
      verifyRecoveryOtp('x@x.com', '111111')
    ).rejects.toMatchObject({ name: 'AuthError' })
  })

  it('T6.5 (network throw): SDK rejection → throws AuthError{NETWORK_ERROR}', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockRejectedValue(
      new TypeError('Failed to fetch')
    )

    await expect(
      verifyRecoveryOtp('x@x.com', '222222')
    ).rejects.toMatchObject({
      name: 'AuthError',
      code: 'NETWORK_ERROR',
    })
  })

  it('T6.6 (Pitfall 7): NEVER logs the OTP token value', async () => {
    const { serializeAll } = setupConsoleSpies()

    // Happy path
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValueOnce({
      data: { session: {}, user: {} },
      error: null,
    } as never)
    await verifyRecoveryOtp('victim@x.com', '918273')

    // Error path
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValueOnce({
      data: { session: null, user: null },
      error: {
        code: 'otp_expired',
        status: 401,
        message: 'Token 918273 expired',
        name: 'AuthApiError',
      },
    } as never)
    await verifyRecoveryOtp('victim@x.com', '918273').catch(() => {})

    // Network throw
    vi.mocked(supabase.auth.verifyOtp).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    )
    await verifyRecoveryOtp('victim@x.com', '918273').catch(() => {})

    const serialized = serializeAll()
    // The 6-digit OTP token must NEVER appear in any log call
    expect(serialized).not.toContain('918273')
    expect(serialized).not.toMatch(/"token"/)
    expect(serialized).not.toMatch(/"access_token"/)
    // The raw email must not appear either (Pitfall 7 — same precedent as
    // requestPasswordReset: only a redacted shape is logged)
    expect(serialized).not.toContain('victim@x.com')
  })
})
