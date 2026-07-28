/// <reference types="@testing-library/jest-dom" />
/**
 * RoleGuard tests — Phase 4.1 Wave 0 RED scaffold (Plan 04.1-01).
 *
 * Behaviors covered (intentionally RED until Plan 02 wires the one-shot fallback):
 *   - one-shot fallback: when isAuthenticated && role === null, RoleGuard MUST
 *     trigger initialize() once (via fallbackTriedRef) instead of bouncing to
 *     /auth/login. Defense against INT-WARNING-3 (JWT custom hook drops claim →
 *     infinite redirect loop).
 *   - existing behavior preserved: not authenticated → redirect to /auth/login
 *   - existing behavior preserved: role matches → render children
 *
 * Why RED today: current RoleGuard.tsx:118-121 redirects immediately to
 * /auth/login when role===null (no fallback try). Plan 02 task T-02.3 adds
 * fallbackTriedRef + spinner pattern (RESEARCH §Pattern 3).
 *
 * @see .planning/phases/04-1-auth-hydration-fix/04.1-PATTERNS.md (Pattern B)
 * @see .planning/phases/04-1-auth-hydration-fix/04.1-RESEARCH.md (§Pattern 3)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  initializeMock: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(),
  },
}))

import { RoleGuard } from '../RoleGuard'
import { useAuthStore } from '@/store/authStore'

beforeEach(() => {
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
    initialize: mocks.initializeMock as never,
  })
  vi.clearAllMocks()
})

describe('RoleGuard one-shot fallback (Phase 4.1 — Pattern 3 / INT-WARNING-3)', () => {
  it('triggers initialize() ONCE when isAuthenticated && role === null (no infinite loop)', async () => {
    // RED in Wave 0: current RoleGuard redirects immediately to /auth/login when role===null.
    // GREEN after Plan 02 task T-02.3 adds fallbackTriedRef one-shot.
    useAuthStore.setState({
      isAuthenticated: true,
      role: null,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/candidato/perfil']}>
        <Routes>
          <Route
            path="/candidato/perfil"
            element={
              <RoleGuard role="candidato">
                <div>Protected</div>
              </RoleGuard>
            }
          />
          <Route path="/auth/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>
    )

    // After Plan 02 fix: initialize called once, spinner shown (LoadingDelay 200ms gates).
    expect(mocks.initializeMock).toHaveBeenCalledTimes(1)
    // No bounce to login on first render.
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('redirects to /auth/login when not authenticated (preserve existing behavior)', () => {
    useAuthStore.setState({
      isAuthenticated: false,
      role: null,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/candidato/perfil']}>
        <Routes>
          <Route
            path="/candidato/perfil"
            element={
              <RoleGuard role="candidato">
                <div>Protected</div>
              </RoleGuard>
            }
          />
          <Route path="/auth/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(mocks.initializeMock).not.toHaveBeenCalled()
  })

  it('renders children when role matches', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      role: 'candidato',
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/candidato/perfil']}>
        <Routes>
          <Route
            path="/candidato/perfil"
            element={
              <RoleGuard role="candidato">
                <div>Protected Content</div>
              </RoleGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
