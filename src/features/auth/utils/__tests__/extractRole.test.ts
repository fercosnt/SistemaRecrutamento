/**
 * Wave 0 stub — populated during Waves 1-3.
 * Behaviors covered: B7.
 * See .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md
 */
import { describe, it } from 'vitest'

describe('extractRole — Wave 0 stubs (03-login-recuperacao-senha)', () => {
  it.todo(
    'B7: extractRole(session) decodes session.access_token via jwt-decode and returns payload.app_metadata.role (NOT session.user.app_metadata) — fixes D-13/Bug 1'
  )
  it.todo('B7: extractRole returns null for malformed JWT (jwt-decode InvalidTokenError swallowed)')
  it.todo('B7: extractRole returns null when role claim is missing from JWT payload')
  it.todo('B7: extractRole NEVER logs the access_token on decode failure (Pitfall 7)')
})
