/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 17 / Plan 17-01 Task 1 — Wave 0 RED scaffold for the RHSidebar Admin item (D-13).
 *
 * RED CONTRACT: `RHSidebar.tsx` today renders a fixed 6-item menu (Dashboard, Candidatos,
 * Vagas, Relatórios, Suporte, Configurações) and does NOT read `role` from the store —
 * there is NO "Admin" item at all. Plan 17-03 adds a role-gated "Admin" item that renders
 * ONLY when `role === 'administrador'`. These assertions are therefore RED until 17-03:
 *   - administrador → an "Admin" nav control is present.
 *   - rh           → no "Admin" control (it is admin-only).
 *   - candidato    → no "Admin" control.
 *
 * Visibility is cosmetic, NOT the access control — the underlying `/admin/*` routes stay
 * RoleGuard + RLS protected regardless of sidebar visibility (RESEARCH §Security V4). This
 * test asserts the UX affordance only.
 *
 * Why store-via-setState + MemoryRouter: mirrors src/components/__tests__/RoleGuard.test.tsx
 * (the established render-test analog — Supabase client mocked, store seeded via setState,
 * component wrapped in MemoryRouter for useNavigate/useLocation).
 *
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-PATTERNS.md (§RHSidebar three touch points)
 * @see src/components/__tests__/RoleGuard.test.tsx (the render-test setup mirrored here)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(),
  },
}))

import { RHSidebar } from '../RHSidebar'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/store/authStore'

/** Seed the store with a given role + the minimal fields RHSidebar destructures
 * (`user`, `candidato`, `logout`). */
function seedRole(role: Role | null) {
  useAuthStore.setState({
    user: { email: 'rh@beautysmile.com.br' } as never,
    candidato: null,
    role,
    isAuthenticated: role !== null,
    logout: vi.fn(() => Promise.resolve()) as never,
  })
}

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={['/rh/dashboard']}>
      <RHSidebar />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RHSidebar — item Admin role-gated (D-13)', () => {
  it('administrador → renderiza um controle de navegação "Admin"', () => {
    // RED em Wave 0: o sidebar atual não tem item "Admin" e nem lê `role`.
    // GREEN após 17-03 adicionar o item gated por role === 'administrador'.
    seedRole('administrador')
    renderSidebar()
    expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument()
  })

  it('rh → NÃO renderiza o controle "Admin" (item é admin-only)', () => {
    seedRole('rh')
    renderSidebar()
    expect(screen.queryByRole('button', { name: /Admin/i })).not.toBeInTheDocument()
  })

  it('candidato → NÃO renderiza o controle "Admin"', () => {
    seedRole('candidato')
    renderSidebar()
    expect(screen.queryByRole('button', { name: /Admin/i })).not.toBeInTheDocument()
  })
})
