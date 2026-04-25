/**
 * Wave 0 stub — populated during Waves 1-3.
 * Behaviors covered: B9, B10.
 * See .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md
 */
import { describe, it } from 'vitest'

describe('passwordService — Wave 0 stubs (03-login-recuperacao-senha)', () => {
  it.todo(
    'B9: requestPasswordReset → resetPasswordForEmail invoked; resolves with neutral copy regardless of email existence (no enumeration)'
  )
  it.todo(
    'B10: setNewPassword → updateUser({ password }) on PASSWORD_RECOVERY session; rejects when no recovery session present'
  )
})
