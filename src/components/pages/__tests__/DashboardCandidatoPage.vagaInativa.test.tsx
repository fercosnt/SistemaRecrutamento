/// <reference types="@testing-library/jest-dom" />
/**
 * 52-31 (JORN-59 · G-52-7 · D-52-G7-4, D-52-G7-6) — a candidatura viva de uma vaga INATIVA no
 * painel do candidato.
 *
 * A única policy de SELECT de `vagas` que alcança o candidato é «Público vê vagas ativas»: inativada
 * a vaga, o embed `vaga:vagas (...)` de `listCandidaturas` volta NULO e o cartão caía em «Vaga não
 * encontrada» / «N/A». A fonte nova é a RPC `ler_vagas_das_minhas_candidaturas` (posse por
 * `auth.uid()`, allowlist `titulo`/`departamento`), chamada pelo serviço só quando alguma linha veio
 * com o embed nulo.
 *
 * O painel roda de PONTA A PONTA no cliente: `@/features/vagas/hooks` NÃO é mockado — o
 * `useCandidaturas` e o `listCandidaturas` reais rodam sobre um cliente Supabase ESPIÃO. Os mocks são
 * de HOOK, no idioma do `.reaberta.test.tsx`, nunca do componente. O título da vaga existe SÓ na
 * resposta da RPC (o embed é nulo), então o caso (1) morde por construção.
 *
 * Caso (2): a RPC responde sem entrada para a candidatura — o caso «vaga inexistente» da D-52-G7-6
 * (impossível no banco: `candidaturas.vaga_id` NOT NULL, FK com ON DELETE CASCADE) — e o fallback
 * «Vaga não encontrada» / «N/A» fica.
 *
 * Casos (3)–(5) (52-31 Task 2): erro da RPC → o cartão da vaga inativa no fallback e o outro cartão
 * intacto, sem eco do erro; todo embed presente → a RPC não é chamada; o diálogo de «Retirar minha
 * candidatura» da candidatura de vaga inativa nomeia a vaga com o título da RPC (abrir e sair por
 * «Voltar»). Asserções de UMA linha (o relatório TAP da evidência RED).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  linhas: [] as unknown[],
  rpcResposta: { data: [] as unknown, error: null as unknown },
  rpcChamadas: [] as string[],
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigateMock }
})

// O store HONRA o seletor: o `useCandidaturas` real lê `state.candidato` por seletor, e o navbar lê
// `isAuthenticated`/`role`/`candidato`/`logout` do mesmo jeito.
vi.mock('@/store/authStore', () => {
  const estado = {
    isAuthenticated: true,
    role: 'candidato',
    candidato: { id: 'candidato-1', nome_completo: 'Pessoa Teste', email: 'pessoa@invalido.local' },
    logout: vi.fn(() => Promise.resolve()),
  }
  return {
    useAuthStore: (sel?: (s: typeof estado) => unknown) => (sel ? sel(estado) : estado),
    useCandidato: () => estado.candidato,
  }
})

vi.mock('@/features/timeline/hooks', () => ({
  useSlaEtapas: () => ({ isLoading: false, error: null, lookup: new Map() }),
  rotuloDeEspera: () => null,
}))

vi.mock('@/features/vagas/hooks/useRetirarCandidatura', () => ({
  useRetirarCandidatura: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

vi.mock('@/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato', () => ({
  useStatusRavenCandidato: () => ({ data: undefined, error: null }),
}))

vi.mock('@/features/avaliacao/hooks/useIdsAvaliacoesConcluidas', () => ({
  useIdsAvaliacoesConcluidas: () => new Set<string>(),
}))

// Cliente ESPIÃO: a lista de candidaturas pela cadeia do PostgREST e a RPC pelo nome.
vi.mock('@/lib/supabase/client', () => {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'order', 'gte', 'lte']) q[m] = vi.fn(() => q)
  q.range = vi.fn(() =>
    Promise.resolve({ data: mocks.linhas, error: null, count: mocks.linhas.length }),
  )
  return {
    supabase: {
      from: vi.fn(() => q),
      rpc: vi.fn((fn: string) => {
        mocks.rpcChamadas.push(fn)
        return Promise.resolve(mocks.rpcResposta)
      }),
    },
  }
})

import { DashboardCandidatoPage } from '../DashboardCandidatoPage'
import { COPY_RETIRAR_CANDIDATURA } from '@/features/vagas/components/RetirarCandidaturaAcao'

const TITULO = 'Analista de Conteúdo — vaga pausada pelo RH'
const DEPARTAMENTO = 'Marketing'

const candidaturaVagaInativa = {
  id: 'candidatura-inativa-1',
  candidato_id: 'candidato-1',
  vaga_id: 'vaga-inativa-1',
  status: 'em_analise',
  etapa_atual: 'triagem',
  created_at: '2026-10-01T12:00:00Z',
  encerrada_a_pedido_em: null,
  decisao_final: null,
  vaga: null,
}

const TITULO_PUBLICA = 'Auxiliar de Saúde Bucal — vaga aberta'

const candidaturaVagaPublica = {
  id: 'candidatura-publica-1',
  candidato_id: 'candidato-1',
  vaga_id: 'vaga-publica-1',
  status: 'em_analise',
  etapa_atual: 'triagem',
  created_at: '2026-09-20T12:00:00Z',
  encerrada_a_pedido_em: null,
  decisao_final: null,
  vaga: {
    id: 'vaga-publica-1',
    titulo: TITULO_PUBLICA,
    cidade: 'São Paulo',
    estado: 'SP',
    departamento: 'Clinica',
    status: 'ativa',
  },
}

const ERRO_SECRETO = 'detalhe interno do banco que nunca pode chegar ao candidato'

function renderPainel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardCandidatoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.rpcChamadas.length = 0
  mocks.linhas = [candidaturaVagaInativa]
  mocks.rpcResposta = { data: [], error: null }
})

describe('painel do candidato — candidatura de vaga inativa (G-52-7)', () => {
  it('(1) mostra o título e o departamento da vaga inativa vindos da RPC — nunca «Vaga não encontrada» nem «N/A»', async () => {
    mocks.rpcResposta = {
      data: [{ candidatura_id: 'candidatura-inativa-1', titulo: TITULO, departamento: DEPARTAMENTO }],
      error: null,
    }
    renderPainel()

    // O título só existe na resposta da RPC: o embed da vaga veio nulo. (Asserção de uma linha
    // de propósito: a mensagem multilinha do Testing Library quebra o relatório TAP da evidência
    // RED — a semântica é a mesma de um `findByText`.)
    await waitFor(
      () => expect(screen.queryByText(TITULO), 'o título da vaga inativa, vindo da RPC, no cartão').not.toBeNull(),
      { onTimeout: (e) => e },
    )

    const titulo = screen.getByTestId('painel-vaga-titulo')
    expect(titulo).toHaveTextContent(TITULO)
    expect(screen.getByTestId('painel-vaga-departamento')).toHaveTextContent(DEPARTAMENTO)

    const cartao = titulo.closest('div.flex-1') as HTMLElement
    expect(within(cartao).queryByText('Vaga não encontrada')).not.toBeInTheDocument()
    expect(within(cartao).queryByText('N/A')).not.toBeInTheDocument()
    expect(screen.queryByText('Vaga não encontrada')).not.toBeInTheDocument()
    expect(screen.queryByText('N/A')).not.toBeInTheDocument()

    expect(mocks.rpcChamadas).toContain('ler_vagas_das_minhas_candidaturas')
  })

  it('(2) a RPC sem entrada para a candidatura (vaga inexistente, D-52-G7-6): o fallback «Vaga não encontrada» / «N/A» fica', async () => {
    mocks.rpcResposta = { data: [], error: null }
    renderPainel()

    // A RPC foi consultada (o embed veio nulo) e não trouxe nada para esta candidatura.
    await waitFor(() => expect(mocks.rpcChamadas).toContain('ler_vagas_das_minhas_candidaturas'))
    expect(await screen.findByText('Vaga não encontrada')).toBeInTheDocument()
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('(3) erro da RPC: o cartão da vaga inativa fica no fallback e o outro cartão fica intacto, sem eco do erro', async () => {
    mocks.linhas = [candidaturaVagaInativa, candidaturaVagaPublica]
    mocks.rpcResposta = { data: null, error: { message: ERRO_SECRETO, code: 'XX000' } }
    renderPainel()

    await waitFor(() => expect(mocks.rpcChamadas, 'a RPC consultada pelo embed nulo').toContain('ler_vagas_das_minhas_candidaturas'))
    await waitFor(() => expect(screen.queryAllByTestId('painel-vaga-titulo').length, 'os dois cartões').toBe(2), { onTimeout: (e) => e })

    const titulos = screen.getAllByTestId('painel-vaga-titulo').map((el) => el.textContent?.trim())
    expect(titulos.join(' | '), 'o cartão da vaga inativa no fallback e o da vaga pública intacto').toBe(`Vaga não encontrada | ${TITULO_PUBLICA}`)
    const deptos = screen.getAllByTestId('painel-vaga-departamento').map((el) => el.textContent?.trim())
    expect(deptos.join(' | '), 'os departamentos dos dois cartões').toBe('N/A | Clinica')
    expect(document.body.textContent?.includes(ERRO_SECRETO), 'o texto do erro na tela').toBe(false)
  })

  it('(4) todo embed presente: a RPC não é chamada', async () => {
    mocks.linhas = [candidaturaVagaPublica]
    mocks.rpcResposta = { data: [{ candidatura_id: 'candidatura-publica-1', titulo: 'NÃO pode aparecer', departamento: 'X' }], error: null }
    renderPainel()

    await waitFor(() => expect(screen.queryByText(TITULO_PUBLICA), 'o título do embed no cartão').not.toBeNull(), { onTimeout: (e) => e })
    expect(mocks.rpcChamadas.length, 'chamadas à RPC com todo embed presente').toBe(0)
    expect(screen.queryByText('NÃO pode aparecer'), 'título da RPC sobre embed presente').toBeNull()
  })

  it('(5) o diálogo de «Retirar minha candidatura» da vaga inativa nomeia a vaga pelo título da RPC', async () => {
    mocks.rpcResposta = {
      data: [{ candidatura_id: 'candidatura-inativa-1', titulo: TITULO, departamento: DEPARTAMENTO }],
      error: null,
    }
    renderPainel()

    await waitFor(() => expect(screen.queryByRole('button', { name: COPY_RETIRAR_CANDIDATURA.acao }), 'a ação de retirar no cartão').not.toBeNull(), { onTimeout: (e) => e })
    fireEvent.click(screen.getByRole('button', { name: COPY_RETIRAR_CANDIDATURA.acao }))

    await waitFor(() => expect(screen.queryByRole('alertdialog'), 'o diálogo de retirada aberto').not.toBeNull(), { onTimeout: (e) => e })
    const dialogo = screen.getByRole('alertdialog')
    expect(within(dialogo).queryByText(COPY_RETIRAR_CANDIDATURA.titulo(TITULO)), 'o título do diálogo com o nome da vaga vindo da RPC').not.toBeNull()

    fireEvent.click(within(dialogo).getByRole('button', { name: COPY_RETIRAR_CANDIDATURA.recuar }))
    await waitFor(() => expect(screen.queryByRole('alertdialog'), 'o diálogo fechado por «Voltar»').toBeNull(), { onTimeout: (e) => e })
  })
})
