/**
 * useRecoverySession — Phase 3 Wave 3 (Plan 03-04).
 *
 * Hook used by RedefinirSenhaPage to validate that a Supabase recovery
 * session is materialized before exposing the new-password form.
 *
 * State machine:
 *   - `{ status: 'validating' }` (initial — gates the UI to a spinner)
 *   - `{ status: 'valid', email }` — confirmed via PASSWORD_RECOVERY event
 *     OR via getSession() fallback (deeplink already materialized session
 *     before this component mounted)
 *   - `{ status: 'invalid' }` — 2s timeout fired without confirmation
 *     (expired link / replay / token already consumed → T-03-05)
 *
 * Three convergence paths (RESEARCH §Q4):
 *   1. `onAuthStateChange` subscription catches PASSWORD_RECOVERY event.
 *      This is the canonical happy path — Supabase fires this event when
 *      `detectSessionInUrl: true` parses the recovery hash fragment.
 *   2. `getSession()` imperative check — if the deeplink was processed
 *      BEFORE the component mounted (race), the event already fired and
 *      we'd miss it. getSession() reads the materialized state directly.
 *   3. 2-second `setTimeout` fallback — if neither (1) nor (2) confirmed
 *      the session, treat the link as invalid.
 *
 * Cleanup (T-03-07 — subscription leak):
 *   - `cancelled` flag prevents late state updates after unmount
 *   - `clearTimeout(timeoutId)` cancels the 2s fallback
 *   - `subscription.unsubscribe()` releases the onAuthStateChange listener
 *
 * @see .planning/phases/03-login-recuperacao-senha/03-RESEARCH.md (§Q4 + §Code Examples)
 *
 * @module features/auth/hooks/useRecoverySession
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export type RecoveryState =
  | { status: 'validating' }
  | { status: 'valid'; email: string }
  | { status: 'invalid' }

export function useRecoverySession(): RecoveryState {
  const [state, setState] = useState<RecoveryState>({ status: 'validating' })

  useEffect(() => {
    let cancelled = false

    // 2s fallback: if neither the event nor getSession confirmed by then,
    // treat as invalid.
    const timeoutId = setTimeout(() => {
      if (cancelled) return
      setState((prev) => (prev.status === 'validating' ? { status: 'invalid' } : prev))
    }, 2000)

    // Subscribe to PASSWORD_RECOVERY event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' && session?.user?.email) {
        setState({ status: 'valid', email: session.user.email })
      }
    })

    // Imperative fallback: detectSessionInUrl may have already materialized
    // the recovery session before this hook mounted (typical when the
    // user clicks the email link and the page renders after the SDK has
    // already parsed the hash fragment).
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session?.user?.email) {
        setState((prev) =>
          prev.status === 'validating'
            ? { status: 'valid', email: data.session!.user.email! }
            : prev
        )
      }
    })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  return state
}
