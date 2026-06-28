/// <reference types="@testing-library/jest-dom" />
/**
 * RoleGuard candidate-landing repoint test — Phase 17 Plan 17-04 (D-09 / Pitfall 3 / A5).
 *
 * RED until Task 1 repoints ROLE_HOME.candidato from '/candidato/perfil' to
 * '/candidato/dashboard' so the funnel hub is the real post-login landing.
 *
 * A `rh`-role user hitting a candidato route is redirected to the candidato home —
 * which, after the repoint, MUST be /candidato/dashboard. (We exercise the
 * ROLE_HOME map via the wrong-role redirect path; both 'rh'→candidato and
 * candidato landing share the same map entry.)
 *
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-04-PLAN.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(),
  },
}))

import { RoleGuard } from '../RoleGuard'
import { useAuthStore } from '@/store/authStore'

beforeEach(() => {
  useAuthStore.setState({
    user: { id: 'u1' } as never,
    session: {} as never,
    role: 'candidato',
    profile: null,
    candidato: null,
    adminUser: null,
    isAuthenticated: true,
    isLoading: false,
    isAdmin: false,
    permissions: null,
  })
  vi.clearAllMocks()
})

describe('RoleGuard candidate landing repoint (D-09 / Pitfall 3)', () => {
  it('redirects a candidato away from an RH-only route to /candidato/dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/rh/dashboard']}>
        <Routes>
          <Route
            path="/rh/dashboard"
            element={
              <RoleGuard role={['rh', 'administrador']}>
                <div>RH area</div>
              </RoleGuard>
            }
          />
          <Route path="/candidato/dashboard" element={<div>Candidate Dashboard landing</div>} />
          <Route path="/candidato/perfil" element={<div>Candidate Perfil</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Candidate Dashboard landing')).toBeInTheDocument()
    expect(screen.queryByText('Candidate Perfil')).not.toBeInTheDocument()
  })
})
