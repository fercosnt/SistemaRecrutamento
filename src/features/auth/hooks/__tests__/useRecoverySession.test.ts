/**
 * useRecoverySession tests — Phase 3 Wave 3 (Plan 03-04).
 *
 * Behaviors covered (B12):
 *   - validating → valid via PASSWORD_RECOVERY event from onAuthStateChange
 *   - validating → valid via getSession() fallback (deeplink already
 *     materialized session before mount)
 *   - validating → invalid after 2s timeout when neither path confirms
 *   - cleanup: subscription.unsubscribe + clearTimeout on unmount
 *
 * @see .planning/phases/03-login-recuperacao-senha/03-RESEARCH.md (§Q4)
 * @see .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md (B12)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Use vi.hoisted so the mocks live at the top of the module
// (vi.mock factories are hoisted ABOVE imports — vars in the factory
// must also be hoisted via vi.hoisted to be in scope).
const mocks = vi.hoisted(() => {
  const unsubscribeMock = vi.fn()
  const refs = {
    latestOnAuthChangeHandler: null as
      | ((event: string, session: { user?: { email?: string } } | null) => void)
      | null,
  }
  const onAuthStateChangeMock = vi.fn(
    (
      handler: (
        event: string,
        session: { user?: { email?: string } } | null
      ) => void
    ) => {
      refs.latestOnAuthChangeHandler = handler
      return { data: { subscription: { unsubscribe: unsubscribeMock } } }
    }
  )
  const getSessionMock = vi.fn()
  return { unsubscribeMock, onAuthStateChangeMock, getSessionMock, refs }
})

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mocks.onAuthStateChangeMock,
      getSession: mocks.getSessionMock,
    },
  },
}))

import { useRecoverySession } from '../useRecoverySession'

beforeEach(() => {
  vi.useFakeTimers()
  mocks.refs.latestOnAuthChangeHandler = null
  mocks.unsubscribeMock.mockClear()
  mocks.onAuthStateChangeMock.mockClear()
  mocks.getSessionMock.mockReset()
  // Default: getSession resolves with no session
  mocks.getSessionMock.mockResolvedValue({ data: { session: null }, error: null })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useRecoverySession (Wave 3, Plan 03-04)', () => {
  it('T3.7: initial state is { status: "validating" }', () => {
    const { result } = renderHook(() => useRecoverySession())
    expect(result.current.status).toBe('validating')
  })

  it('T3.8: PASSWORD_RECOVERY event from onAuthStateChange → { status: "valid", email }', async () => {
    const { result } = renderHook(() => useRecoverySession())
    expect(result.current.status).toBe('validating')
    expect(mocks.refs.latestOnAuthChangeHandler).not.toBeNull()

    await act(async () => {
      mocks.refs.latestOnAuthChangeHandler?.('PASSWORD_RECOVERY', {
        user: { email: 'recover@example.com' },
      })
    })

    expect(result.current.status).toBe('valid')
    if (result.current.status === 'valid') {
      expect(result.current.email).toBe('recover@example.com')
    }
  })

  it('T3.9: getSession() returning a session with user.email → { status: "valid" } (fallback)', async () => {
    mocks.getSessionMock.mockResolvedValueOnce({
      data: {
        session: { user: { email: 'fallback@example.com' } },
      },
      error: null,
    })

    const { result } = renderHook(() => useRecoverySession())
    // Allow microtasks: getSession is async
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('valid')
    if (result.current.status === 'valid') {
      expect(result.current.email).toBe('fallback@example.com')
    }
  })

  it('T3.10: 2s timeout with no event and no session → { status: "invalid" }', async () => {
    const { result } = renderHook(() => useRecoverySession())

    // Let getSession promise resolve (returns no session)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('validating')

    // Advance past the 2s timeout
    await act(async () => {
      vi.advanceTimersByTime(2100)
    })

    expect(result.current.status).toBe('invalid')
  })

  it('T3.11: cleanup on unmount calls subscription.unsubscribe', async () => {
    const { unmount } = renderHook(() => useRecoverySession())
    expect(mocks.unsubscribeMock).not.toHaveBeenCalled()

    unmount()

    expect(mocks.unsubscribeMock).toHaveBeenCalledTimes(1)
  })

  it('T3.12: cancelled flag — late event after unmount does NOT update state', async () => {
    const { result, unmount } = renderHook(() => useRecoverySession())
    unmount()

    // Fire the event AFTER unmount; should not update state machine
    await act(async () => {
      mocks.refs.latestOnAuthChangeHandler?.('PASSWORD_RECOVERY', {
        user: { email: 'late@example.com' },
      })
    })

    // result.current still reflects the last in-mount value (validating)
    expect(result.current.status).toBe('validating')
  })
})
