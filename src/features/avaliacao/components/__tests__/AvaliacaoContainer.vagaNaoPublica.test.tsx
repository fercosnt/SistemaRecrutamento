/**
 * 52-32 (JORN-59 · R1 do G-52-7 · D-52-G7B-1..4) — a página `/candidato/avaliacao/:candidaturaId`
 * mostra os cards da bateria também quando o RH tirou a vaga do ar.
 *
 * Com a vaga fora do ar, o embed `vaga:vagas ( testes_aplicaveis, aplica_cognitivo )` volta NULO sob
 * a RLS do candidato e a página dizia «Nenhuma avaliação pendente» (caso natural medido em PROD em
 * 2026-10-12: `f73682b6`, vaga arquivada, bateria `[work_sample_sjt]`). O conserto lê a bateria pela
 * RPC `ler_testes_das_minhas_candidaturas` quando o embed vem nulo; com erro da RPC, o desfecho é o
 * de hoje («Nenhuma avaliação pendente»), sem ecoar a mensagem.
 *
 * O container CONECTADO, na rota real (montagem do `AvaliacaoContainer.test.tsx`), com o
 * `avaliacaoService` REAL sobre um cliente Supabase espião: a linha de `candidaturas` com `vaga: null`,
 * a cadeia de `perguntas` registrando os filtros e resolvendo `[]`, e `rpc` por nome.
 *
 * Asserções do caso que morde em UMA linha de mensagem (lição do 52-31: o TAP da Vitest não escapa
 * mensagem multilinha do Testing Library).
 *
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-32-PLAN.md (Task 1, Passo 4)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}))

/*
 * O cliente Supabase espião. `from(tabela)` devolve uma cadeia que registra cada filtro
 * (`[tabela, metodo, ...args]`), `maybeSingle` (a linha da candidatura) e um `then` (a leitura de
 * `perguntas`, que resolve `[]`). `rpc` responde pelo `rpcImpl` do caso, por nome.
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
  const filtros: unknown[][] = []
  const from = vi.fn((tabela: string) => {
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is', 'in', 'order']) {
      chain[m] = vi.fn((...args: unknown[]) => {
        filtros.push([tabela, m, ...args])
        return chain
      })
    }
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: state.candRow, error: null }))
    chain.then = (ok: (v: Resposta) => unknown, falha?: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(ok, falha)
    return chain
  })
  const rpc = vi.fn((fn: string, args: unknown) => state.rpcImpl(fn, args))
  const invoke = vi.fn(() => Promise.resolve({ data: null, error: null }))
  return { state, filtros, from, rpc, invoke }
})

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: sb.from, rpc: sb.rpc, functions: { invoke: sb.invoke } },
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigateMock }
})

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ logout: vi.fn(() => Promise.resolve()) }),
  useCandidato: () => ({ nome_completo: 'Maria Teste', email: 'maria@teste.com' }),
}))

import {
  AvaliacaoContainer,
  CONTAINER_TESTE_CONFIG,
} from '@/features/avaliacao/components/AvaliacaoContainer'

const ID = 'CAND123'
const CARGO = 'consultor_p52a'
const RPC_TESTES = 'ler_testes_das_minhas_candidaturas'
const VAZIO = 'Nenhuma avaliação pendente'
const MENSAGEM_DO_ERRO = 'falha-da-rpc-dos-testes-xyz'

/** A linha que `getAvaliacaoContext` lê sob a RLS do candidato: a vaga saiu do ar, o embed é nulo. */
const candRow = {
  id: ID,
  status: 'aguardando_resposta',
  etapa_atual: 'avaliacao_assincrona',
  vaga_id: 'vaga-fora-do-ar',
  vaga: null,
}

const ALL_PENDING = {
  sjt_mc: { registrado: false, iniciado: false },
  sjt_caso_aberto: { registrado: false, iniciado: false },
  big_five: { registrado: false, iniciado: false },
  redacao: { registrado: false, iniciado: false },
  cognitivo: { registrado: false, iniciado: false },
}

type Resposta = { data: unknown; error: { message: string } | null }

/** `get_avaliacao_status` → todas pendentes; a RPC dos testes, o caso. */
function rpcPorNome(testes: () => Promise<Resposta>) {
  return (fn: string): Promise<Resposta> => {
    if (fn === 'get_avaliacao_status') return Promise.resolve({ data: ALL_PENDING, error: null })
    if (fn === RPC_TESTES) return testes()
    return Promise.resolve({ data: null, error: { message: `rpc inesperada: ${fn}` } })
  }
}

function renderConnected() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/candidato/avaliacao/${ID}`]}>
        <Routes>
          <Route
            path="/candidato/avaliacao/:candidaturaId"
            element={<AvaliacaoContainer />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sb.filtros.length = 0
  sb.state.candRow = candRow
})

describe('AvaliacaoContainer — vaga NÃO pública (52-32 / R1 do G-52-7)', () => {
  it('(1) embed nulo e a RPC traz a bateria → os cards do SJT, nunca «Nenhuma avaliação pendente»; perguntas filtradas pelo cargo', async () => {
    sb.state.rpcImpl = rpcPorNome(() =>
      Promise.resolve({
        data: [{ candidatura_id: ID, testes_aplicaveis: [{ teste: 'work_sample_sjt', cargo: CARGO }], aplica_cognitivo: false }],
        error: null,
      }),
    )
    renderConnected()

    await waitFor(() => expect(screen.queryByText(CONTAINER_TESTE_CONFIG.sjt_mc.label), 'o card de multipla escolha do SJT da vaga nao publica').not.toBeNull(), { onTimeout: (e) => e })
    expect(screen.queryByText(CONTAINER_TESTE_CONFIG.sjt_caso_aberto.label) !== null, 'o card do caso pratico').toBe(true)
    expect(screen.queryByText(VAZIO) === null, 'nunca Nenhuma avaliacao pendente com a entrada da RPC').toBe(true)
    const cargos = sb.filtros.filter((f) => f[0] === 'perguntas' && f[1] === 'eq' && f[2] === 'cargo').map((f) => String(f[3]))
    expect(cargos.join(','), 'perguntas filtradas pelo cargo do elemento SJT da RPC').toBe(CARGO)
    expect(sb.rpc.mock.calls.some(([nome]) => nome === RPC_TESTES), 'a RPC dos testes foi chamada pelo nome').toBe(true)
  })

  it('(2) a RPC devolve erro → «Nenhuma avaliação pendente» (o desfecho de hoje) e o erro nao vai a tela', async () => {
    sb.state.rpcImpl = rpcPorNome(() => Promise.resolve({ data: null, error: { message: MENSAGEM_DO_ERRO } }))
    renderConnected()

    await waitFor(() => expect(screen.queryByText(VAZIO), 'com a RPC em erro fica o desfecho de hoje').not.toBeNull(), { onTimeout: (e) => e })
    expect(sb.rpc.mock.calls.some(([nome]) => nome === RPC_TESTES), 'a RPC dos testes foi chamada pelo nome').toBe(true)
    expect(screen.queryByText(new RegExp(MENSAGEM_DO_ERRO)) === null, 'a mensagem do erro nao e ecoada').toBe(true)
    expect(screen.queryByText(CONTAINER_TESTE_CONFIG.sjt_mc.label) === null, 'sem entrada nenhum card').toBe(true)
  })
})
