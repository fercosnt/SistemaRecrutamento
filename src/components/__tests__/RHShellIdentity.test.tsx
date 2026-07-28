/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 30 / Plan 30-05 Task 3 — RH panel chrome identity (BLOCKER / Success Criterion #1).
 *
 * Before this plan BOTH shells computed identity as `candidato?.nome_completo || email-prefix`.
 * For an RH user `candidato` is null, so the chrome showed the EMAIL PREFIX — never the edited
 * `usuarios_rh.nome_completo`. This suite pins the fix:
 *
 *  - RHTopBar AND RHSidebar read the display name from `adminUser?.nome_completo` (email prefix
 *    is the LAST-resort fallback only) → the shell shows the real name, NOT the email prefix;
 *  - after `setAdminUser` refreshes the store (as 30-04's useAtualizarPerfil does on a name edit),
 *    the chrome name updates WITHOUT a re-login — proving panel-wide propagation after an edit.
 *
 * Store-via-setState + MemoryRouter mirrors RHSidebar.admin.test.tsx (the render-test analog);
 * a QueryClientProvider is added because the signed-avatar query is now `useQuery`-backed. The
 * seeded `avatar_url` is null so the signing path is never invoked here (identity-only test).
 *
 * @see src/components/RHTopBar.tsx · src/components/RHSidebar.tsx
 * @see .planning/phases/30-meu-perfil-rh/30-05-PLAN.md (Task 3)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}))

import { RHTopBar } from '../RHTopBar'
import { RHSidebar } from '../RHSidebar'
import { useAuthStore } from '@/store/authStore'

/** Seed an RH user whose email prefix ('outra.pessoa') differs from the RH nome_completo. */
function seedRhUser(nome: string) {
  useAuthStore.setState({
    user: { email: 'outra.pessoa@beautysmile.com.br' } as never,
    candidato: null,
    adminUser: { nome_completo: nome, avatar_url: null, role: 'recrutador' } as never,
    role: 'rh',
    isAuthenticated: true,
    logout: vi.fn(() => Promise.resolve()) as never,
  })
}

function renderWithProviders(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/rh/dashboard']}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RHTopBar — shell identity from adminUser (not the email prefix)', () => {
  it('shows the RH nome_completo and its initial, not the email prefix', () => {
    seedRhUser('Maria Recrutadora')
    renderWithProviders(<RHTopBar />)
    expect(screen.getByText('Maria Recrutadora')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.queryByText('outra.pessoa')).toBeNull()
  })

  it('updates the name after setAdminUser WITHOUT a re-login (panel-wide propagation)', () => {
    seedRhUser('Maria Recrutadora')
    renderWithProviders(<RHTopBar />)
    act(() => {
      useAuthStore
        .getState()
        .setAdminUser({ nome_completo: 'Nova Maria', avatar_url: null, role: 'recrutador' } as never)
    })
    expect(screen.getByText('Nova Maria')).toBeInTheDocument()
    expect(screen.queryByText('Maria Recrutadora')).toBeNull()
  })
})

describe('RHSidebar — shell identity from adminUser (not the email prefix)', () => {
  it('shows the RH nome_completo, not the email prefix', () => {
    seedRhUser('Maria Recrutadora')
    renderWithProviders(<RHSidebar />)
    expect(screen.getByText('Maria Recrutadora')).toBeInTheDocument()
    expect(screen.queryByText('outra.pessoa')).toBeNull()
  })

  it('updates the name after setAdminUser WITHOUT a re-login', () => {
    seedRhUser('Maria Recrutadora')
    renderWithProviders(<RHSidebar />)
    act(() => {
      useAuthStore
        .getState()
        .setAdminUser({ nome_completo: 'Nova Maria', avatar_url: null, role: 'recrutador' } as never)
    })
    expect(screen.getByText('Nova Maria')).toBeInTheDocument()
  })
})
