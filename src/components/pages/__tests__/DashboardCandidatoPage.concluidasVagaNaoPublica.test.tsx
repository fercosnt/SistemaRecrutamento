/// <reference types="@testing-library/jest-dom" />
/**
 * 52-32 (JORN-59 · R1 do G-52-7 · D-52-G7B-1..4) — o painel do candidato diz «Avaliações concluídas —
 * aguardando a equipe» também quando o RH tirou a vaga do ar.
 *
 * Com a vaga pausada, fechada, arquivada ou apagada, a policy pública de `vagas` («Público vê vagas
 * ativas») esconde a linha do candidato e o embed `vaga:vagas ( testes_aplicaveis, aplica_cognitivo )`
 * de `getAvaliacaoContext` volta NULO: sem a bateria, nenhum card, e a frase nunca aparece (caso
 * natural medido em PROD em 2026-10-12: `f73682b6`, vaga arquivada). O conserto lê os dois campos pela
 * RPC `ler_testes_das_minhas_candidaturas` SÓ quando o embed vem nulo; erro, ausência ou leitura em voo
 * deixam o desfecho de hoje — o CTA «Continuar para …» e a linha de prazo (52-UI-SPEC E10).
 *
 * Harness copiado do `DashboardCandidatoPage.concluidas.test.tsx`: o hook `useIdsAvaliacoesConcluidas`
 * e o `avaliacaoService` são REAIS, sobre um cliente Supabase espião (a proibição de escrita da D-27
 * pode reprovar); os mocks são de HOOK, nunca do componente. A diferença: a linha de `candidaturas`
 * que o serviço lê vem com `vaga: null`, e o `rpcImpl` responde por NOME.
 *
 * Asserções do caso que morde em UMA linha de mensagem (lição do 52-31: o TAP da Vitest não escapa
 * mensagem multilinha do Testing Library).
 *
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-32-PLAN.md (Task 1, Passo 4)
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  candidaturasData: { data: [] as unknown[] },
  // O rótulo de espera devolvido pelo mock de `rotuloDeEspera`: o texto REAL da migration, gravado
  // no `beforeAll` (a fábrica do `vi.mock` é içada e não enxerga constante do topo).
  prazo: null as string | null,
}))

/*
 * O cliente Supabase espião. Leitura: `from(tabela)` devolve uma cadeia com os métodos de leitura
 * (a própria cadeia), `maybeSingle` (a linha da candidatura) e um `then` (a leitura de `perguntas`).
 * Escrita: `update`/`insert`/`upsert`/`delete` registram e devolvem a cadeia — chamá-los é o que este
 * arquivo proíbe. `rpc` responde pelo `rpcImpl` do caso, por nome.
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
  rotuloDeEspera: () => mocks.prazo,
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
const RPC_TESTES = 'ler_testes_das_minhas_candidaturas'
const RPCS_PERMITIDAS = new Set(['get_avaliacao_status', RPC_TESTES])
const MENSAGEM_DO_ERRO = 'falha-da-rpc-dos-testes-xyz'

const ID = 'cand-vaga-nao-publica'

// O prazo REAL de `avaliacao_assincrona`, extraído da migration que semeia o `config_sla_etapa`.
const RAIZ = process.cwd()
const MIGRATION_SLA = join(RAIZ, 'supabase/migrations/20260721000002_config_sla_etapa.sql')
let PRAZO = ''

beforeAll(() => {
  const sql = readFileSync(MIGRATION_SLA, 'utf8')
  const m = /\(\s*'avaliacao_assincrona'\s*,\s*[^,]+,\s*'[^']*'\s*,\s*'([^']*)'\s*\)/.exec(sql)
  PRAZO = m ? m[1] : ''
  // População vazia mente: sem o texto, a ausência do caso concluído seria vácua.
  expect(PRAZO.length, 'o prazo de avaliacao_assincrona extraido da migration nao pode sair vazio').toBeGreaterThan(0)
  expect(PRAZO.includes('conclua em até'), `o prazo extraido tem de conter «conclua em até»: ${PRAZO}`).toBe(true)
  mocks.prazo = PRAZO
})

/*
 * A candidatura da LISTA do painel (mock do hook `useCandidaturas`): o título da vaga não pública já
 * vem da RPC do 52-31 (0006). O que este arquivo exercita é a OUTRA leitura, a de `getAvaliacaoContext`.
 */
const candidatura = {
  id: ID,
  vaga_id: 'vaga-fora-do-ar',
  vaga: { titulo: 'Consultor(a) de Relacionamento', departamento: null },
  etapa_atual: 'avaliacao_assincrona',
  status: 'aguardando_resposta',
  created_at: '2026-10-01T00:00:00Z',
  feedback_rejeicao: null,
  data_decisao_final: null,
}

/*
 * A linha que `getAvaliacaoContext` lê de `candidaturas` sob a RLS do candidato: a vaga saiu do ar,
 * o embed volta NULO.
 */
const candRow = {
  id: ID,
  status: 'aguardando_resposta',
  etapa_atual: 'avaliacao_assincrona',
  vaga_id: 'vaga-fora-do-ar',
  vaga: null,
}

/*
 * A bateria da vaga, a MESMA da fixture do `.concluidas.test.tsx`: `work_sample_sjt` → sjt_mc +
 * sjt_caso_aberto; `big_five` → big_five; `redacao_cultural` → redacao. O `cargo` faz o serviço
 * aguardar a leitura de `perguntas`.
 */
const entradaDaRpc = {
  candidatura_id: ID,
  testes_aplicaveis: [
    { teste: 'work_sample_sjt', cargo: 'consultor' },
    { teste: 'big_five' },
    { teste: 'redacao_cultural' },
  ],
  aplica_cognitivo: false,
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

type Resposta = { data: unknown; error: { message: string } | null }

/** O `rpcImpl` por nome: `get_avaliacao_status` sempre «todas concluídas»; a RPC dos testes, o caso. */
function rpcPorNome(testes: () => Promise<Resposta>) {
  return (fn: string): Promise<Resposta> => {
    if (fn === 'get_avaliacao_status') return Promise.resolve({ data: todasConcluidas, error: null })
    if (fn === RPC_TESTES) return testes()
    return Promise.resolve({ data: null, error: { message: `rpc inesperada: ${fn}` } })
  }
}

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

/** D-27: nenhuma escrita no caminho, e toda RPC chamada é de LEITURA conhecida. */
function semEscrita() {
  expect(sb.escrita.update).not.toHaveBeenCalled()
  expect(sb.escrita.insert).not.toHaveBeenCalled()
  expect(sb.escrita.upsert).not.toHaveBeenCalled()
  expect(sb.escrita.delete).not.toHaveBeenCalled()
  expect(sb.invoke).not.toHaveBeenCalled()
  const fora = sb.rpc.mock.calls.map(([nome]) => nome).filter((nome) => !RPCS_PERMITIDAS.has(nome))
  expect(fora.join(','), 'toda RPC chamada no caminho e get_avaliacao_status ou ler_testes_das_minhas_candidaturas').toBe('')
}

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  sb.state.candRow = candRow
  sb.state.rpcImpl = rpcPorNome(() => Promise.resolve({ data: [entradaDaRpc], error: null }))
})

describe('DashboardCandidatoPage — avaliações concluídas em vaga NÃO pública (52-32 / JORN-59)', () => {
  it('(1) embed nulo e a RPC traz a bateria, todas concluídas → a frase, o selo, nenhum botão, sem prazo; nada escrito', async () => {
    renderPainel()

    const proximo = await screen.findByTestId('painel-proximo-passo')
    await waitFor(() => expect(within(proximo).queryByText(FRASE), 'a frase do JORN-59 para a vaga nao publica').not.toBeNull(), { onTimeout: (e) => e })
    expect(screen.queryByText(SELO) !== null, 'o selo Aguardando a equipe').toBe(true)
    expect(within(proximo).queryAllByRole('button').length, 'nenhum botao no Proximo passo').toBe(0)
    expect(screen.queryByText(CTA_DE_HOJE) === null, 'o CTA de hoje some com tudo concluido').toBe(true)
    expect(screen.queryByText(PRAZO) === null, 'a linha de prazo nao aparece com todas as avaliacoes concluidas').toBe(true)

    // A leitura REAL aconteceu: a candidatura, o status e a RPC dos testes (pelo nome).
    expect(sb.from).toHaveBeenCalledWith('candidaturas')
    expect(sb.rpc).toHaveBeenCalledWith('get_avaliacao_status', { p_candidatura_id: ID })
    expect(sb.rpc.mock.calls.some(([nome]) => nome === RPC_TESTES), 'a RPC dos testes foi chamada pelo nome').toBe(true)
    semEscrita()
  })

  it('(2) a RPC devolve [] → nenhuma frase, o CTA de hoje e a linha de prazo; nada escrito', async () => {
    sb.state.rpcImpl = rpcPorNome(() => Promise.resolve({ data: [], error: null }))
    renderPainel()

    await esperarLeiturasComSucesso()
    expect(sb.rpc.mock.calls.some(([nome]) => nome === RPC_TESTES), 'a RPC dos testes foi chamada pelo nome').toBe(true)
    const proximo = screen.getByTestId('painel-proximo-passo')
    expect(within(proximo).queryByRole('button', { name: CTA_DE_HOJE }) !== null, 'o CTA de hoje fica').toBe(true)
    expect(screen.queryByText(FRASE) === null, 'sem entrada da RPC nao ha frase de concluido').toBe(true)
    expect(screen.queryByText(PRAZO) !== null, 'sem entrada da RPC a linha de prazo fica').toBe(true)
    semEscrita()
  })

  it('(3) a RPC devolve erro → nenhuma frase, o CTA de hoje e a linha de prazo; o erro nao vai a tela', async () => {
    sb.state.rpcImpl = rpcPorNome(() => Promise.resolve({ data: null, error: { message: MENSAGEM_DO_ERRO } }))
    renderPainel()

    await esperarLeiturasComSucesso()
    expect(sb.rpc.mock.calls.some(([nome]) => nome === RPC_TESTES), 'a RPC dos testes foi chamada pelo nome').toBe(true)
    const proximo = screen.getByTestId('painel-proximo-passo')
    expect(within(proximo).queryByRole('button', { name: CTA_DE_HOJE }) !== null, 'o CTA de hoje fica com a RPC em erro').toBe(true)
    expect(screen.queryByText(FRASE) === null, 'erro da RPC nunca vira a frase de concluido').toBe(true)
    expect(screen.queryByText(PRAZO) !== null, 'erro da RPC: a linha de prazo fica').toBe(true)
    expect(screen.queryByText(new RegExp(MENSAGEM_DO_ERRO)) === null, 'a mensagem do erro nao e ecoada').toBe(true)
    semEscrita()
  })

  it('(4) a RPC fica em voo → nenhuma frase, o CTA de hoje e a linha de prazo; nada escrito', async () => {
    sb.state.rpcImpl = rpcPorNome(() => new Promise<Resposta>(() => {}))
    renderPainel()

    await waitFor(() => expect(sb.rpc.mock.calls.some(([nome]) => nome === RPC_TESTES), 'a RPC dos testes foi chamada pelo nome').toBe(true))
    expect(queryClient.getQueryState(['avaliacao', 'context', ID])?.status, 'o contexto segue carregando').toBe('pending')
    const proximo = screen.getByTestId('painel-proximo-passo')
    expect(within(proximo).queryByRole('button', { name: CTA_DE_HOJE }) !== null, 'o CTA de hoje fica com a RPC em voo').toBe(true)
    expect(screen.queryByText(FRASE) === null, 'em voo nunca a frase de concluido antes da hora').toBe(true)
    expect(screen.queryByText(PRAZO) !== null, 'em voo: a linha de prazo fica').toBe(true)
    semEscrita()
  })
})
