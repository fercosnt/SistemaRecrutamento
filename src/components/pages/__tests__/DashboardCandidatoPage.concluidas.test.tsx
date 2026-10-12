/// <reference types="@testing-library/jest-dom" />
/**
 * 52-04 (JORN-59 · D-27 · D-52-U16) — o painel do candidato diz a verdade depois que ele conclui
 * todas as avaliações: «Avaliações concluídas — aguardando a equipe» no «Próximo passo», sem botão,
 * e o selo «Aguardando a equipe». NADA muda no banco: a tela deriva o estado do que lê.
 *
 * ⚠ Este é o ÚNICO teste do painel que roda o hook `useIdsAvaliacoesConcluidas` de verdade (os
 * outros quatro o mockam pelo caminho do módulo). E o `avaliacaoService` NÃO é mockado: ele roda
 * sobre um cliente Supabase espião, para que a proibição de escrita (D-27) possa reprovar. Quem
 * plantar um `update` em `candidaturas` no caminho do hook vê este arquivo vermelho — e, no caso
 * concluído, a leitura real é provada (`from('candidaturas')` e `rpc('get_avaliacao_status')`),
 * senão «zero escrita» passaria vácuo.
 *
 * Os mocks de hook são os do harness do `funnel` (o mock é do HOOK, nunca do componente).
 *
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-04-PLAN.md (Task 1)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRequire } from 'node:module'

// 52-28 (G-52-6) — a MESMA função de contraste do medidor `scripts/p52_contraste.cjs`.
const requireDoTeste = createRequire(import.meta.url)

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  candidaturasData: { data: [] as unknown[] },
}))

/*
 * O cliente Supabase espião. Leitura: `from(tabela)` devolve uma cadeia com os métodos de leitura
 * (a própria cadeia), `maybeSingle` (a linha da candidatura) e um `then` (a leitura de `perguntas`
 * é aguardada direto na cadeia). Escrita: `update`/`insert`/`upsert`/`delete` registram e devolvem
 * a cadeia — chamá-los é o que este arquivo proíbe. `rpc` responde pelo `rpcImpl` do caso.
 */
const sb = vi.hoisted(() => {
  type Resposta = { data: unknown; error: { message: string } | null }
  const state = {
    candRow: null as unknown,
    rpcImpl: (() => Promise.resolve({ data: null, error: null })) as (
      fn: string,
      args: unknown,
    ) => Promise<Resposta>,
  }
  const escrita = {
    update: vi.fn(),
    insert: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  }
  const from = vi.fn((tabela: string) => {
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is', 'in', 'order']) chain[m] = vi.fn(() => chain)
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: state.candRow, error: null }))
    chain.then = (ok: (v: Resposta) => unknown, falha?: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(ok, falha)
    for (const m of ['update', 'insert', 'upsert', 'delete'] as const) {
      chain[m] = vi.fn((...args: unknown[]) => {
        escrita[m](tabela, ...args)
        return chain
      })
    }
    return chain
  })
  const rpc = vi.fn((fn: string, args: unknown) => state.rpcImpl(fn, args))
  const invoke = vi.fn(() => Promise.resolve({ data: null, error: null }))
  return { state, escrita, from, rpc, invoke }
})

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: sb.from, rpc: sb.rpc, functions: { invoke: sb.invoke } },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigateMock }
})

vi.mock('@/features/vagas/hooks', () => ({
  useCandidaturas: () => ({
    data: mocks.candidaturasData,
    isLoading: false,
    error: null,
  }),
  useCandidaturasCount: () => ({
    total: mocks.candidaturasData.data.length,
    aguardando: 0,
    em_analise: 0,
    aprovadas: 0,
    rejeitadas: 0,
    finalizadas: 0,
  }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ logout: vi.fn(() => Promise.resolve()) }),
  useCandidato: () => ({ nome_completo: 'Maria Teste', email: 'maria@teste.com' }),
}))

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

import { DashboardCandidatoPage } from '../DashboardCandidatoPage'

const FRASE = 'Avaliações concluídas — aguardando a equipe'
const SELO = 'Aguardando a equipe'
const CTA_DE_HOJE = /Continuar para Avaliação Assíncrona/

const ID = 'cand-concluida'

const candidatura = {
  id: ID,
  vaga_id: 'vaga-1',
  vaga: { titulo: 'Consultor(a) de Relacionamento' },
  etapa_atual: 'avaliacao_assincrona',
  status: 'aguardando_resposta',
  created_at: '2026-10-01T00:00:00Z',
  feedback_rejeicao: null,
  data_decisao_final: null,
}

/*
 * A linha que `getAvaliacaoContext` lê de `candidaturas`. `testes_aplicaveis` gera, por
 * `deriveCards`: `work_sample_sjt` → sjt_mc + sjt_caso_aberto; `big_five` → big_five; e
 * `redacao_cultural` → redacao. O `cargo` faz o serviço aguardar a leitura de `perguntas`.
 */
const candRow = {
  id: ID,
  status: 'aguardando_resposta',
  etapa_atual: 'avaliacao_assincrona',
  vaga_id: 'vaga-1',
  vaga: {
    testes_aplicaveis: [
      { teste: 'work_sample_sjt', cargo: 'consultor' },
      { teste: 'big_five' },
      { teste: 'redacao_cultural' },
    ],
    aplica_cognitivo: false,
  },
}

const feito = { registrado: true, iniciado: true }
const todasConcluidas = {
  sjt_mc: feito,
  sjt_caso_aberto: feito,
  big_five: feito,
  redacao: feito,
  cognitivo: { registrado: false, iniciado: false },
  raven: { liberado: false, registrado: false },
}
const umaPendente = { ...todasConcluidas, redacao: { registrado: false, iniciado: true } }

let queryClient: QueryClient

function renderPainel() {
  mocks.candidaturasData = { data: [candidatura] }
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardCandidatoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** As duas leituras do container terminaram com sucesso (o caso não é vácuo de carregamento). */
async function esperarLeiturasComSucesso() {
  await waitFor(() => {
    expect(queryClient.getQueryState(['avaliacao', 'context', ID])?.status).toBe('success')
    expect(queryClient.getQueryState(['avaliacao', 'status', ID])?.status).toBe('success')
  })
}

/** D-27: nenhuma escrita no caminho, em TODO caso. */
function semEscrita() {
  expect(sb.escrita.update).not.toHaveBeenCalled()
  expect(sb.escrita.insert).not.toHaveBeenCalled()
  expect(sb.escrita.upsert).not.toHaveBeenCalled()
  expect(sb.escrita.delete).not.toHaveBeenCalled()
  expect(sb.invoke).not.toHaveBeenCalled()
  for (const [nome] of sb.rpc.mock.calls) expect(nome).toMatch(/^get_/)
}

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  sb.state.candRow = candRow
  sb.state.rpcImpl = () => Promise.resolve({ data: todasConcluidas, error: null })
})

describe('DashboardCandidatoPage — avaliações concluídas (52-04 / D-27)', () => {
  it('todas concluídas → a frase no «Próximo passo», nenhum botão, selo «Aguardando a equipe»; nada escrito', async () => {
    renderPainel()

    const proximo = await screen.findByTestId('painel-proximo-passo')
    expect(await within(proximo).findByText(FRASE)).toBeInTheDocument()
    expect(within(proximo).queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByText(CTA_DE_HOJE)).not.toBeInTheDocument()

    // O selo herdado, com o tratamento neutro — opaco desde o 52-28 (G-52-6, «Todos os selos»),
    // com o contraste julgado pela função do medidor `scripts/p52_contraste.cjs`.
    const selo = screen.getByText(SELO)
    expect(selo).toHaveClass('text-gray-100')
    expect(selo.parentElement).toHaveClass('bg-gray-700')
    const { contrasteDeClasses } = requireDoTeste('../../../../scripts/p52_contraste.cjs') as {
      contrasteDeClasses: (texto: string, fundo: string) => number
    }
    const tokenTexto = Array.from(selo.classList).find((c) => /^text-[a-z]+-[0-9]{2,3}$/.test(c))
    const tokenFundo = Array.from((selo.parentElement as HTMLElement).classList).find((c) => c.startsWith('bg-'))
    expect(contrasteDeClasses(tokenTexto as string, tokenFundo as string)).toBeGreaterThanOrEqual(4.5)
    expect(screen.queryByText('Aguardando Resposta')).not.toBeInTheDocument()

    // A frase quebra linha: nada de truncar nem de proibir a quebra.
    const span = within(proximo).getByText(FRASE)
    expect(span).not.toHaveClass('truncate')
    expect(span).not.toHaveClass('whitespace-nowrap')

    // A leitura REAL aconteceu — sem isso «zero escrita» seria vácuo.
    expect(sb.from).toHaveBeenCalledWith('candidaturas')
    expect(sb.rpc).toHaveBeenCalledWith('get_avaliacao_status', { p_candidatura_id: ID })
    semEscrita()
  })

  it('uma avaliação pendente → o CTA de hoje («Continuar para …»); nada escrito', async () => {
    sb.state.rpcImpl = () => Promise.resolve({ data: umaPendente, error: null })
    renderPainel()

    await esperarLeiturasComSucesso()
    const proximo = screen.getByTestId('painel-proximo-passo')
    expect(within(proximo).getByRole('button', { name: CTA_DE_HOJE })).toBeInTheDocument()
    expect(screen.queryByText(FRASE)).not.toBeInTheDocument()
    expect(screen.queryByText(SELO)).not.toBeInTheDocument()
    expect(screen.getByText('Aguardando Resposta')).toBeInTheDocument()
    semEscrita()
  })

  it('status carregando → o CTA de hoje, sem piscar para vazio (D-52-U16); nada escrito', async () => {
    sb.state.rpcImpl = () => new Promise(() => {})
    renderPainel()

    await waitFor(() =>
      expect(sb.rpc).toHaveBeenCalledWith('get_avaliacao_status', { p_candidatura_id: ID }),
    )
    expect(queryClient.getQueryState(['avaliacao', 'status', ID])?.status).toBe('pending')
    const proximo = screen.getByTestId('painel-proximo-passo')
    expect(within(proximo).getByRole('button', { name: CTA_DE_HOJE })).toBeInTheDocument()
    expect(screen.queryByText(FRASE)).not.toBeInTheDocument()
    semEscrita()
  })

  it('status em erro → o CTA de hoje (D-52-U16); nada escrito', async () => {
    sb.state.rpcImpl = () => Promise.resolve({ data: null, error: { message: 'falha' } })
    renderPainel()

    await waitFor(() =>
      expect(queryClient.getQueryState(['avaliacao', 'status', ID])?.status).toBe('error'),
    )
    await act(async () => {})
    const proximo = screen.getByTestId('painel-proximo-passo')
    expect(within(proximo).getByRole('button', { name: CTA_DE_HOJE })).toBeInTheDocument()
    expect(screen.queryByText(FRASE)).not.toBeInTheDocument()
    semEscrita()
  })
})
