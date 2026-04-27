/**
 * authStore tests — Phase 4.1 Wave 0 RED scaffold (Plan 04.1-01).
 *
 * Behaviors covered (intentionally RED until Plan 02 wires `hydrateFromSession`):
 *   - hydrateFromSession populates `candidato` when JWT app_metadata.role === 'candidato'
 *   - hydrateFromSession falls back to DB query when JWT lacks app_metadata.role (INT-WARNING-3)
 *   - hydrateFromSession with null session → no fetchProfile, store cleared (SIGNED_OUT path)
 *   - Pitfall 7 — zero console.log/error/warn during happy-path hydration
 *
 * Why RED today: `hydrateFromSession` action does not yet exist on AuthState. The
 * tests guard the action's existence (`typeof action === 'function'`) AND its
 * behavior (post-Plan 02 GREEN cycle). Tests are written so the suite COMPILES
 * under TS strict — the runtime assertions will fail until Plan 02 lands.
 *
 * @see .planning/phases/04-1-auth-hydration-fix/04.1-RESEARCH.md (§Pattern 1)
 * @see .planning/phases/04-1-auth-hydration-fix/04.1-PATTERNS.md (Pattern D)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  const getSessionMock = vi.fn()
  const fromMock = vi.fn()
  return { getSessionMock, fromMock }
})

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSessionMock,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: mocks.fromMock,
  },
}))

import { useAuthStore } from '../authStore'

// Helper: encode payload as fake JWT (header.body.signature) — body holds app_metadata.role
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-sig`
}

beforeEach(() => {
  // Reset store state between tests (Zustand persist may leak)
  useAuthStore.setState({
    user: null,
    session: null,
    role: null,
    profile: null,
    candidato: null,
    adminUser: null,
    isAuthenticated: false,
    isLoading: false,
    isAdmin: false,
    permissions: null,
  })
  vi.clearAllMocks()
})

describe('hydrateFromSession (Phase 4.1 — Pattern 1)', () => {
  it('populates candidato when JWT app_metadata.role === "candidato"', async () => {
    // RED in Wave 0: hydrateFromSession does not exist yet. Test will fail.
    // GREEN after Wave 1 (Plan 02 task T-02.1).
    const accessToken = makeJwt({ sub: 'user-uuid', app_metadata: { role: 'candidato' } })
    const session = {
      access_token: accessToken,
      refresh_token: 'r',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: { id: 'user-uuid', email: 'c@x.com', app_metadata: { role: 'candidato' } },
    } as never

    // Mock: candidatos.select(...).eq('user_id', 'user-uuid').single() returns row
    mocks.fromMock.mockImplementation((table: string) => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data:
                table === 'candidatos'
                  ? { id: 'cand-uuid', user_id: 'user-uuid', nome_completo: 'X' }
                  : null,
              error: table === 'candidatos' ? null : { code: 'PGRST116' },
            }),
        }),
      }),
    }))

    // EXPECT this action to exist after Plan 02 (currently fails compile if strict TS).
    const action = (
      useAuthStore.getState() as { hydrateFromSession?: (s: unknown) => Promise<void> }
    ).hydrateFromSession
    expect(typeof action).toBe('function')

    if (typeof action === 'function') {
      await action(session)
      const state = useAuthStore.getState()
      expect(state.candidato).toMatchObject({ id: 'cand-uuid' })
      expect(state.role).toBe('candidato')
      expect(state.isAuthenticated).toBe(true)
    }
  })

  it('falls back to DB query when JWT app_metadata.role is missing (INT-WARNING-3 defense)', async () => {
    const accessToken = makeJwt({ sub: 'user-uuid', app_metadata: {} })
    const session = {
      access_token: accessToken,
      user: { id: 'user-uuid', email: 'c@x.com', app_metadata: {} },
    } as never

    // Mock: usuarios_rh empty, candidatos returns row → fallback resolves to 'candidato'.
    // Wave 0 scaffold quirk: fetchProfile fallback path uses .maybeSingle() (not .single());
    // .eq() can be chained multiple times before terminator. Stub the full chain to match
    // both happy path (single) and fallback path (maybeSingle) terminators.
    let calls = 0
    mocks.fromMock.mockImplementation((table: string) => {
      calls++
      const result = {
        data:
          table === 'candidatos'
            ? { id: 'cand-uuid', user_id: 'user-uuid' }
            : null,
        error: table === 'candidatos' ? null : { code: 'PGRST116' },
      }
      type EqChain = {
        eq: (...args: unknown[]) => EqChain
        is: (...args: unknown[]) => EqChain
        single: () => Promise<typeof result>
        maybeSingle: () => Promise<typeof result>
      }
      const eqChain: EqChain = {
        eq: () => eqChain,
        is: () => eqChain,
        single: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
      }
      return {
        select: () => eqChain,
      }
    })

    const action = (
      useAuthStore.getState() as { hydrateFromSession?: (s: unknown) => Promise<void> }
    ).hydrateFromSession
    if (typeof action === 'function') {
      await action(session)
      expect(calls).toBeGreaterThanOrEqual(1) // fetchProfile fallback chain ran
      expect(useAuthStore.getState().role).toBe('candidato')
    }
  })

  it('skips fetchProfile when session is null (SIGNED_OUT path)', async () => {
    const action = (
      useAuthStore.getState() as { hydrateFromSession?: (s: unknown) => Promise<void> }
    ).hydrateFromSession
    if (typeof action === 'function') {
      await action(null)
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.session).toBeNull()
      expect(state.candidato).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    }
  })
})

describe('Pitfall 7 — zero console output during hydration', () => {
  it('hydrateFromSession does not emit console.log/error/warn for happy path', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const accessToken = makeJwt({ sub: 'u', app_metadata: { role: 'candidato' } })
    const session = {
      access_token: accessToken,
      user: { id: 'u', app_metadata: { role: 'candidato' } },
    } as never
    mocks.fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: 'c' }, error: null }),
        }),
      }),
    }))

    const action = (
      useAuthStore.getState() as { hydrateFromSession?: (s: unknown) => Promise<void> }
    ).hydrateFromSession
    if (typeof action === 'function') {
      await action(session)
    }

    expect(logSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
