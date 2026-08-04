/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 44 / Plano 44-09 Task 3 — a entrada "Pedidos de dados" na `RHSidebar` e o
 * contador (EXPORT-05).
 *
 * ── OS TRÊS SÍTIOS ────────────────────────────────────────────────────────────────
 * Acrescentar um item a esta sidebar exige editar TRÊS lugares independentes:
 * `menuItems` (o item existe), `getActivePageFromPath` (o item se realça na rota certa)
 * e o mapa `routes` de `handleMenuClick` (o item navega). Esquecer qualquer um deles não
 * produz erro nenhum — produz um item inerte, ou um item que navega mas nunca se acende.
 * Esta suíte prende os três por COMPORTAMENTO, não por leitura.
 *
 * ── ⚠ ONDE ESTE ARQUIVO MORA, E POR QUÊ ──────────────────────────────────────────
 * A `44-VALIDATION.md` aponta a linha do contador para
 * `src/features/pedidos-dados/components/__tests__/`. O componente sob teste é a
 * `RHSidebar`, que vive em `src/components/` — e o análogo direto desta suíte
 * (`RHSidebarRevisoes.test.tsx`) mora aqui. A asserção segue o componente, não a feature.
 * Divergência DECLARADA, não silenciosa.
 *
 * ── O CONTADOR E O ZERO QUE O REACT RENDERIZA COMO TEXTO ─────────────────────────
 * `formatarBadgePendentes` devolve `undefined` (não string vazia) para zero, carregando e
 * falha; o render do slot é TERNÁRIO. Um contador errado no menu é pior que contador
 * nenhum: manda o operador procurar trabalho que não existe — e aqui esse trabalho
 * invisível tem prazo de 15 dias corridos correndo.
 *
 * @see src/components/RHSidebar.tsx (os três sítios + o render do badge)
 * @see src/components/__tests__/RHSidebarRevisoes.test.tsx (o análogo direto)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const { navigateMock, usePedidosMock, useRevisoesMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  usePedidosMock: vi.fn(),
  useRevisoesMock: vi.fn(),
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

vi.mock('@/features/pedidos-dados/hooks/usePedidosDadosPendentesCount', () => ({
  usePedidosDadosPendentesCount: usePedidosMock,
}))

// O contador IRMÃO é mockado também, por determinismo: a asserção (co) exige que o
// número apareça no item certo E não no outro, e um contador vivo tornaria o "não"
// dependente do que a rede fizer.
vi.mock('@/features/revisao/hooks/useRevisoesPendentesCount', () => ({
  useRevisoesPendentesCount: useRevisoesMock,
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

function itemPedidos() {
  return screen.getByRole('button', { name: /Pedidos de dados/ })
}

beforeEach(() => {
  vi.clearAllMocks()
  seed()
  usePedidosMock.mockReturnValue(contagem())
  useRevisoesMock.mockReturnValue(contagem())
})

describe('RHSidebar — os três sítios da entrada "Pedidos de dados"', () => {
  it('(cj) sítio 1 (`menuItems`): o item existe e fica ENTRE Revisões e Vagas', () => {
    usePedidosMock.mockReturnValue(contagem({ data: 3 }))
    renderSidebar()

    const rotulos = screen
      .getAllByRole('button')
      .map((b) => b.textContent ?? '')
      .filter((t) => /Revisões|Pedidos de dados|Vagas/.test(t))

    const iRevisoes = rotulos.findIndex((t) => t.includes('Revisões'))
    const iPedidos = rotulos.findIndex((t) => t.includes('Pedidos de dados'))
    const iVagas = rotulos.findIndex((t) => t.includes('Vagas'))

    // Asserção de ÍNDICE, não de presença: as duas filas de direito do titular ficam
    // adjacentes por decisão, e presença sozinha não prende a vizinhança.
    expect(iPedidos).toBeGreaterThanOrEqual(0)
    expect(iRevisoes).toBeLessThan(iPedidos)
    expect(iPedidos).toBeLessThan(iVagas)
  })

  it('(ck) sítio 2 (`routes`): clicar navega para /rh/pedidos-dados', () => {
    renderSidebar()
    fireEvent.click(itemPedidos())
    expect(navigateMock).toHaveBeenCalledWith('/rh/pedidos-dados')
  })

  it('(cl) sítio 3 (`getActivePageFromPath`): a rota REALÇA o item — e o realce é exclusivo', () => {
    const emPedidos = renderSidebar('/rh/pedidos-dados')
    expect(itemPedidos().className).toContain('bg-[#35BFAD]')
    expect(screen.getByRole('button', { name: /Revisões/ }).className).not.toContain(
      'bg-[#35BFAD]',
    )
    emPedidos.unmount()

    // A asserção NEGATIVA é a que morde numa linha de match genérica demais.
    renderSidebar('/rh/revisoes')
    expect(itemPedidos().className).not.toContain('bg-[#35BFAD]')
    expect(screen.getByRole('button', { name: /Revisões/ }).className).toContain(
      'bg-[#35BFAD]',
    )
  })

  it('(cl2) /rh/pedidos-dados não cai no fallback de Dashboard', () => {
    renderSidebar('/rh/pedidos-dados')
    expect(screen.getByRole('button', { name: /Dashboard/ }).className).not.toContain(
      'bg-[#35BFAD]',
    )
  })
})

describe('RHSidebar — o contador: os três estados que OCULTAM o badge', () => {
  it('(cm1) zero pendentes → badge OCULTO, e NENHUM "0" no DOM da sidebar', () => {
    usePedidosMock.mockReturnValue(contagem({ data: 0 }))
    renderSidebar()
    expect(itemPedidos()).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('(cm2) carregando → badge OCULTO; nunca "0", nunca travessão', () => {
    usePedidosMock.mockReturnValue(contagem({ isLoading: true }))
    renderSidebar()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('(cm3) erro de leitura → badge OCULTO e o item CONTINUA clicável e navegável', () => {
    usePedidosMock.mockReturnValue(contagem({ isError: true }))
    renderSidebar()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    fireEvent.click(itemPedidos())
    expect(navigateMock).toHaveBeenCalledWith('/rh/pedidos-dados')
  })
})

describe('RHSidebar — o contador: preenchido e transbordo', () => {
  it('(cn1) 1 pendente → "1"', () => {
    usePedidosMock.mockReturnValue(contagem({ data: 1 }))
    renderSidebar()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('(cn2) 99 → "99" (a última contagem exata)', () => {
    usePedidosMock.mockReturnValue(contagem({ data: 99 }))
    renderSidebar()
    expect(screen.getByText('99')).toBeInTheDocument()
  })

  it('(cn3) 100 e 1234 → "99+", no máximo 3 caracteres', () => {
    usePedidosMock.mockReturnValue(contagem({ data: 100 }))
    const cem = renderSidebar()
    expect(screen.getByText('99+')).toBeInTheDocument()
    cem.unmount()

    usePedidosMock.mockReturnValue(contagem({ data: 1234 }))
    renderSidebar()
    const badge = screen.getByText('99+')
    expect(badge.textContent?.length).toBeLessThanOrEqual(3)
    expect(screen.queryByText('1234')).not.toBeInTheDocument()
  })

  it('(co) o badge acompanha o item CERTO: 7 em Pedidos de dados, e não em Revisões', () => {
    usePedidosMock.mockReturnValue(contagem({ data: 7 }))
    useRevisoesMock.mockReturnValue(contagem())
    renderSidebar()

    expect(itemPedidos().textContent).toContain('7')
    expect(screen.getByRole('button', { name: /Revisões/ }).textContent).not.toContain('7')
  })
})
