/**
 * Wave 0 stub — populated during Waves 1-3.
 * Behaviors covered: B5, B6, B16.
 * See .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md
 */
import { describe, it } from 'vitest'

describe('rememberMeStorage adapter — Wave 0 stubs (03-login-recuperacao-senha)', () => {
  it.todo(
    'B5: setRememberMeMode("session") routes subsequent setItem/getItem/removeItem to window.sessionStorage — sessão morre ao fechar a aba (manual UAT primary)'
  )
  it.todo(
    'B6: default mode (or "local") routes to window.localStorage — sessão sobrevive a tab close (manual UAT primary)'
  )
  it.todo(
    'B16: setRememberMeMode("session") wipes pre-existing localStorage sb-* keys (T-03-04 mitigation — switching mode must NOT leave stale tokens)'
  )
})
