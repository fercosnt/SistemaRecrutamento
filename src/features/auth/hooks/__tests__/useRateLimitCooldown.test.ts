/**
 * Wave 0 stub — populated during Waves 1-3.
 * Behaviors covered: B4 (hook layer).
 * See .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md
 */
import { describe, it } from 'vitest'

describe('useRateLimitCooldown — Wave 0 stubs (03-login-recuperacao-senha)', () => {
  it.todo(
    'B4: hook decrements remainingSeconds each tick and returns disabled=true while > 0; re-enables submit at 0 (T-03-06 cooldown countdown)'
  )
  it.todo(
    'B4: hook seeds initial cooldown from AuthError.retryAfterSeconds; CLAMPS values > 3600 to 3600 (per planner D-19/extractRetryAfterSeconds insight)'
  )
})
