/**
 * Wave 0 stub — populated during Waves 1-3.
 * Behaviors covered: B1, B2, B3, B4, B13, B14.
 * See .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md
 */
import { describe, it } from 'vitest'

describe('authService — Wave 0 stubs (03-login-recuperacao-senha)', () => {
  it.todo('B1: signIn with correct creds resolves; authStore listener picks up SIGNED_IN')
  it.todo('B2: signIn with wrong creds throws AuthError{code: INVALID_CREDENTIALS}')
  it.todo(
    'B3: signIn with email_not_confirmed throws AuthError{code: EMAIL_NOT_CONFIRMED, field: email}'
  )
  it.todo(
    'B4: mapSupabaseError maps over_email_send_rate_limit → AuthError{code: RATE_LIMITED, retryAfterSeconds ≥ 1}'
  )
  it.todo('B13: signIn with network exception throws AuthError{code: NETWORK_ERROR}')
  it.todo('B14: signIn never logs senha/password/access_token via console.* (Pitfall 7)')
})
