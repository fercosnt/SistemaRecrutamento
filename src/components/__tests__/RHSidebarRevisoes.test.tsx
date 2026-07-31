/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 42 / Plano 42-10 Task 3 — a entrada "Revisões" na `RHSidebar` e o contador
 * (REVISAO-02/03).
 *
 * ── OS TRÊS SÍTIOS ────────────────────────────────────────────────────────────────
 * Acrescentar um item a esta sidebar exige editar TRÊS lugares independentes:
 * `menuItems` (o item existe), `getActivePageFromPath` (o item se realça na rota certa)
 * e o mapa `routes` de `handleMenuClick` (o item navega). Esquecer qualquer um deles não
 * produz erro nenhum: produz um item inerte, ou um item que navega mas nunca se acende.
 * Esta suíte prende os três por comportamento, não por leitura.
 *
 * ── O CONTADOR, E O ZERO QUE O REACT RENDERIZA COMO TEXTO ────────────────────────
 * O slot `badge` do `MenuItem` existe na interface desde sempre e **nunca teve
 * consumidor** — esta é a primeira vez. O render fazia `item.badge && item.badge > 0 &&`,
 * e em JS `0 && …` curto-circuita para `0`, que o React renderiza como TEXTO. Ou seja: a
 * forma "óbvia" de alimentar o slot (passar a contagem crua) colocaria um "0" solto no
 * menu em três estados distintos — zero pendentes, carregando e falha de leitura.
 * As asserções negativas abaixo cobrem os três, e é por isso que elas existem em vez de
 * uma só.
 *
 * @see src/components/RHSidebar.tsx (os três sítios + o render do badge)
 * @see src/features/revisao/services/revisaoService.ts (formatarBadgePendentes)
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

function seed() {
  useAuthStore.setState({
    user: { email: 'recrutador.rh@teste.com' } as never,
    candidato: null,
    role: 'rh',
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

/** O estado de uma `useQuery` — só o que a sidebar consome. */
function contagem(over: Record<string, unknown> = {}) {
  return { data: undefined, isLoading: false, isError: false, ...over }
}

function itemRevisoes() {
  return screen.getByRole('button', { name: /Revisões/ })
}

beforeEach(() => {
  vi.clearAllMocks()
  seed()
  useContagemMock.mockReturnValue(contagem())
})

describe('RHSidebar — os três sítios da entrada "Revisões"', () => {
  it('sítio 1 (`menuItems`): o item existe e fica ENTRE Candidatos e Vagas', () => {
    useContagemMock.mockReturnValue(contagem({ data: 3 }))
    renderSidebar()

    const rotulos = screen
      .getAllByRole('button')
      .map((b) => b.textContent ?? '')
      .filter((t) => /Candidatos|Revisões|Vagas/.test(t))

    expect(rotulos.some((t) => t.includes('Revisões'))).toBe(true)

    const iCandidatos = rotulos.findIndex((t) => t.includes('Candidatos'))
    const iRevisoes = rotulos.findIndex((t) => t.includes('Revisões'))
    const iVagas = rotulos.findIndex((t) => t.includes('Vagas'))
    expect(iCandidatos).toBeLessThan(iRevisoes)
    expect(iRevisoes).toBeLessThan(iVagas)
  })

  it('sítio 2 (`routes`): clicar navega para /rh/revisoes', () => {
    renderSidebar()
    fireEvent.click(itemRevisoes())
    expect(navigateMock).toHaveBeenCalledWith('/rh/revisoes')
  })

  it('sítio 3 (`getActivePageFromPath`): estar em /rh/revisoes REALÇA o item', () => {
    renderSidebar('/rh/revisoes')
    expect(itemRevisoes().className).toContain('bg-[#35BFAD]')
  })

  it('o realce é exclusivo — em /rh/vagas o item Revisões NÃO fica ativo', () => {
    renderSidebar('/rh/vagas')
    expect(itemRevisoes().className).not.toContain('bg-[#35BFAD]')
    expect(screen.getByRole('button', { name: /Vagas/ }).className).toContain(
      'bg-[#35BFAD]',
    )
  })

  it('/rh/revisoes não cai no fallback de Dashboard (a ordem de especificidade vale)', () => {
    renderSidebar('/rh/revisoes')
    expect(screen.getByRole('button', { name: /Dashboard/ }).className).not.toContain(
      'bg-[#35BFAD]',
    )
  })
})

describe('RHSidebar — o contador: os três estados que OCULTAM o badge', () => {
  it('zero pendentes → badge OCULTO, e NENHUM "0" no DOM da sidebar', () => {
    useContagemMock.mockReturnValue(contagem({ data: 0 }))
    renderSidebar()
    expect(itemRevisoes()).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('carregando → badge OCULTO; nunca "0", nunca travessão, nunca esqueleto no menu', () => {
    useContagemMock.mockReturnValue(contagem({ isLoading: true }))
    const { container } = renderSidebar()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
  })

  it('erro de leitura → badge OCULTO e o item de menu CONTINUA acessível', () => {
    useContagemMock.mockReturnValue(contagem({ isError: true }))
    renderSidebar()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    // Um contador errado no menu é pior que contador nenhum — mas o acesso permanece.
    fireEvent.click(itemRevisoes())
    expect(navigateMock).toHaveBeenCalledWith('/rh/revisoes')
  })
})

describe('RHSidebar — o contador: preenchido e transbordo', () => {
  it('1 pendente → "1"', () => {
    useContagemMock.mockReturnValue(contagem({ data: 1 }))
    renderSidebar()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('99 → "99" (a última contagem exata)', () => {
    useContagemMock.mockReturnValue(contagem({ data: 99 }))
    renderSidebar()
    expect(screen.getByText('99')).toBeInTheDocument()
  })

  it('1234 → "99+" (largura fixa, no máximo 3 caracteres)', () => {
    useContagemMock.mockReturnValue(contagem({ data: 1234 }))
    renderSidebar()
    const badge = screen.getByText('99+')
    expect(badge).toBeInTheDocument()
    expect(badge.textContent?.length).toBeLessThanOrEqual(3)
    expect(screen.queryByText('1234')).not.toBeInTheDocument()
  })

  it('100 → "99+" (o limite do transbordo é 99, não 100)', () => {
    useContagemMock.mockReturnValue(contagem({ data: 100 }))
    renderSidebar()
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('o badge acompanha o item Revisões, não outro item do menu', () => {
    useContagemMock.mockReturnValue(contagem({ data: 7 }))
    renderSidebar()
    expect(itemRevisoes().textContent).toContain('7')
    expect(screen.getByRole('button', { name: /Vagas/ }).textContent).not.toContain('7')
  })
})
