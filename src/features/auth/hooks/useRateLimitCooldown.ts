/**
 * useRateLimitCooldown — Phase 3 Wave 3 (Plan 03-04).
 *
 * Hook that exposes a per-tab in-memory rate-limit cooldown timer. Used by
 * Login + EsqueciSenha pages to disable submit while the AuthError
 * `retryAfterSeconds` is still active.
 *
 * Internal store: a Zustand slice WITHOUT `persist` middleware (T-03-06
 * mitigation — never persist cooldown to storage; user clearing storage
 * MUST NOT bypass rate-limit). Slice is module-scoped — singleton across
 * the app. Multiple components rendering the hook share the same state.
 *
 * Public API:
 *   - `remainingSeconds: number` — seconds until cooldown expires (0 when off)
 *   - `isActive: boolean` — true while remainingSeconds > 0
 *   - `setCooldown(seconds: number): void` — start a cooldown.
 *     Clamps `seconds` to `[0, 3600]` (defensive — extractRetryAfterSeconds
 *     also clamps, so this is belt-and-braces). `setCooldown(0)` clears.
 *
 * @see .planning/phases/03-login-recuperacao-senha/03-RESEARCH.md (§Code Examples)
 * @see .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md (B4 hook layer)
 *
 * @module features/auth/hooks/useRateLimitCooldown
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'

interface RateLimitState {
  rateLimitedUntil: number | null // epoch ms, or null when inactive
  setCooldown: (seconds: number) => void
}

/**
 * Module-scoped Zustand store. NO `persist` middleware — T-03-06 requires
 * cooldown to die with the tab. User clearing localStorage / closing tab
 * is NOT a legitimate unlock; the next request will re-trigger rate-limit
 * server-side anyway.
 */
const useRateLimitStore = create<RateLimitState>((set) => ({
  rateLimitedUntil: null,
  setCooldown: (seconds) => {
    // Clamp to [0, 3600]. 0 = clear; >3600 = clamp to 1h ceiling.
    const clamped = Math.max(0, Math.min(3600, Math.floor(seconds)))
    if (clamped === 0) {
      set({ rateLimitedUntil: null })
      return
    }
    set({ rateLimitedUntil: Date.now() + clamped * 1000 })
  },
}))

/**
 * Hook entry point.
 *
 * Implementation: derives `remainingSeconds` from the difference between
 * `rateLimitedUntil` and `Date.now()` on every render. A `setInterval`
 * runs at 1Hz while a cooldown is active to force re-renders. The interval
 * is cleared in the useEffect cleanup AND when remainingSeconds reaches 0
 * (defensive — guards against any leak across tab visibility changes).
 */
export function useRateLimitCooldown(): {
  remainingSeconds: number
  isActive: boolean
  setCooldown: (seconds: number) => void
} {
  const rateLimitedUntil = useRateLimitStore((s) => s.rateLimitedUntil)
  const setCooldown = useRateLimitStore((s) => s.setCooldown)
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!rateLimitedUntil) return
    if (rateLimitedUntil <= Date.now()) return
    const id = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      clearInterval(id)
    }
  }, [rateLimitedUntil])

  const remaining = rateLimitedUntil
    ? Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000))
    : 0

  return {
    remainingSeconds: remaining,
    isActive: remaining > 0,
    setCooldown,
  }
}
