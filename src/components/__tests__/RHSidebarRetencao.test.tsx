/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 43 / Plano 43-09 Task 1 — a entrada "Retenção" na `RHSidebar` (RETEN-01).
 *
 * ── OS TRÊS SÍTIOS ────────────────────────────────────────────────────────────────
 * Acrescentar um item a esta sidebar exige editar TRÊS lugares independentes: `menuItems`
 * (o item existe), `getActivePageFromPath` (o item se realça na rota certa) e o mapa
 * `routes` de `handleMenuClick` (o item navega). Esquecer qualquer um deles **não produz
 * erro nenhum**: produz um item inerte, ou um item que navega mas nunca se acende.
 *
 * ── A ARMADILHA DA ORDEM, E POR QUE ELA MERECE ASSERÇÃO PRÓPRIA ──────────────────
 * A linha de `/admin/retencao` tem de vir **ANTES** da linha genérica `/admin`. Sem essa
 * ordem o `/admin` genérico rouba o match: a página abre normalmente, tudo parece
 * funcionar, e o menu continua realçando "Admin" — a mesma armadilha que a Phase 42
 * documentou para `/rh/revisoes` × `/rh/vagas`. É uma falha 100% silenciosa, e é por isso
 * que ela é prendida por comportamento aqui em vez de por leitura do arquivo.
 *
 * ── A VISIBILIDADE É COSMÉTICA (D-13) ────────────────────────────────────────────
 * O item some para `rh` e para `candidato`, mas **isso não é o controle de acesso**. Quem
 * controla é o `RoleGuard role="administrador"` da rota, a policy admin-only de
 * `config_retencao_etapa` e o guard NULL-safe dentro das RPCs `SECURITY DEFINER`. As
 * asserções negativas abaixo provam a cosmética, não a segurança.
 *
 * @see src/components/RHSidebar.tsx (os três sítios)
 * @see src/components/__tests__/RHSidebarRevisoes.test.tsx (o molde, Phase 42)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const { navigateMock, useContagemMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useContagemMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

vi.mock('@/features/revisao/hooks/useRevisoesPendentesCount', () => ({
  useRevisoesPendentesCount: useContagemMock,
}))

import { RHSidebar } from '../RHSidebar'
import { useAuthStore } from '@/store/authStore'

function seed(role: 'administrador' | 'rh' | 'candidato') {
  useAuthStore.setState({
    user: { email: 'admin@teste.com' } as never,
    candidato: null,
    role,
    isAuthenticated: true,
    logout: vi.fn(() => Promise.resolve()) as never,
  })
}

function renderSidebar(rota = '/rh/dashboard') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <RHSidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const itemRetencao = () => screen.getByRole('button', { name: /Retenção/ })

beforeEach(() => {
  vi.clearAllMocks()
  seed('administrador')
  useContagemMock.mockReturnValue({ data: undefined, isLoading: false, isError: false })
})

describe('RHSidebar — os três sítios da entrada "Retenção"', () => {
  it('sítio 1 (`menuItems`): o item existe para administrador', () => {
    renderSidebar()
    expect(itemRetencao()).toBeInTheDocument()
  })

  it('sítio 2 (`routes`): clicar navega para /admin/retencao', () => {
    renderSidebar()
    fireEvent.click(itemRetencao())
    expect(navigateMock).toHaveBeenCalledWith('/admin/retencao')
  })

  it('sítio 3 (`getActivePageFromPath`): estar em /admin/retencao REALÇA o item', () => {
    renderSidebar('/admin/retencao')
    expect(itemRetencao().className).toContain('bg-[#35BFAD]')
  })

  it('a ORDEM vale: em /admin/retencao o item "Admin" genérico NÃO fica ativo', () => {
    renderSidebar('/admin/retencao')
    expect(screen.getByRole('button', { name: /Admin/i }).className).not.toContain(
      'bg-[#35BFAD]',
    )
  })

  it('o realce é exclusivo: em /admin/ai-logs quem acende é "Admin", não "Retenção"', () => {
    renderSidebar('/admin/ai-logs')
    expect(itemRetencao().className).not.toContain('bg-[#35BFAD]')
    expect(screen.getByRole('button', { name: /Admin/i }).className).toContain(
      'bg-[#35BFAD]',
    )
  })
})

describe('RHSidebar — a visibilidade do item é COSMÉTICA (D-13)', () => {
  it('rh → o item "Retenção" não aparece', () => {
    seed('rh')
    renderSidebar()
    expect(screen.queryByRole('button', { name: /Retenção/ })).not.toBeInTheDocument()
  })

  it('candidato → o item "Retenção" não aparece', () => {
    seed('candidato')
    renderSidebar()
    expect(screen.queryByRole('button', { name: /Retenção/ })).not.toBeInTheDocument()
  })
})
