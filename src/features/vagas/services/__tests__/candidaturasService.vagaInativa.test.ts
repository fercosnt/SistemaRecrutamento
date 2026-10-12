/**
 * 52-31 (JORN-59 · G-52-7 · D-52-G7-4, D-52-G7-6) — a mescla do serviço do candidato.
 *
 * `mesclarVagasDasCandidaturas` (pura) e `listCandidaturas` sobre um cliente Supabase ESPIÃO com
 * `from` (a cadeia do PostgREST, awaitable) e `rpc` (a leitura `ler_vagas_das_minhas_candidaturas`).
 *
 * O contrato vigiado aqui:
 *   - da entrada da RPC atravessam SÓ `titulo` e `departamento` (allowlist no cliente — T-52-104);
 *   - um embed `vaga` que veio nunca é sobrescrito;
 *   - entrada malformada, sem linha correspondente, ou `entradas` que não é array: as linhas ficam
 *     como vieram (nunca lança);
 *   - `listCandidaturas` chama a RPC no máximo UMA vez por leitura, e SÓ quando alguma linha veio
 *     com o embed nulo (D-52-G7-4); erro da RPC (inclusive de transporte) = as linhas como vieram,
 *     sem lançar e sem o texto do erro no retorno (T-52-109).
 *
 * Asserções com mensagem de UMA linha de propósito (o relatório TAP da evidência RED não aceita a
 * mensagem multilinha de matcher de DOM — §Task 1 da 52-31-FRONTEIRA).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'
import {
  listCandidaturas,
  mesclarVagasDasCandidaturas,
  RPC_VAGAS_DAS_MINHAS_CANDIDATURAS,
} from '../candidaturasService'

type Linhas = Parameters<typeof mesclarVagasDasCandidaturas>[0]

const CANDIDATO = '11111111-2222-3333-4444-555555555555'
const ERRO_SECRETO = 'detalhe interno do banco que nunca pode chegar ao candidato'

function linha(id: string, vaga: Record<string, unknown> | null): Record<string, unknown> {
  return {
    id,
    candidato_id: CANDIDATO,
    vaga_id: `vaga-de-${id}`,
    status: 'em_analise',
    etapa_atual: 'triagem',
    created_at: '2026-10-01T12:00:00Z',
    vaga,
  }
}

const EMBED_PUBLICO = {
  id: 'vaga-publica',
  titulo: 'Título do embed público',
  cidade: 'São Paulo',
  estado: 'SP',
  departamento: 'Clinica',
  status: 'ativa',
}

/** Cadeia do PostgREST: todo método devolve o mesmo objeto, e ele é awaitable. */
function makeQueryMock(result: { data: unknown[]; error: unknown; count: number }) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'gte', 'lte', 'order', 'range']) {
    q[m] = vi.fn(() => q)
  }
  q.then = (resolve: (v: typeof result) => unknown) => resolve(result)
  return q
}

function listaDevolve(linhas: Record<string, unknown>[]) {
  vi.mocked(supabase.from).mockReturnValue(
    makeQueryMock({ data: linhas, error: null, count: linhas.length }) as never,
  )
}

const rpc = () => vi.mocked(supabase.rpc as unknown as (...a: unknown[]) => unknown)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('mesclarVagasDasCandidaturas (52-31 · G-52-7)', () => {
  it('copia só titulo e departamento da entrada, mesmo quando ela traz status e salario', () => {
    const linhas = [linha('c1', null)] as unknown as Linhas
    const out = mesclarVagasDasCandidaturas(linhas, [
      { candidatura_id: 'c1', titulo: 'Vaga pausada', departamento: 'Marketing', status: 'inativa', salario: 9000 },
    ])
    const vaga = out[0].vaga as unknown as Record<string, unknown>
    expect(Object.keys(vaga ?? {}).sort().join(','), 'chaves do objeto mesclado').toBe('departamento,titulo')
    expect(vaga?.titulo, 'titulo mesclado').toBe('Vaga pausada')
    expect(vaga?.departamento, 'departamento mesclado').toBe('Marketing')
  })

  it('aceita departamento null e o mescla como null', () => {
    const linhas = [linha('c1', null)] as unknown as Linhas
    const out = mesclarVagasDasCandidaturas(linhas, [{ candidatura_id: 'c1', titulo: 'Sem depto', departamento: null }])
    expect(JSON.stringify(out[0].vaga), 'vaga mesclada com departamento null').toBe(JSON.stringify({ titulo: 'Sem depto', departamento: null }))
  })

  it('não sobrescreve um embed que veio', () => {
    const linhas = [linha('c1', EMBED_PUBLICO)] as unknown as Linhas
    const out = mesclarVagasDasCandidaturas(linhas, [{ candidatura_id: 'c1', titulo: 'Título da RPC', departamento: 'Outro' }])
    expect(out[0].vaga as unknown, 'o embed presente fica intacto').toBe(EMBED_PUBLICO)
  })

  it('ignora entrada malformada e entrada sem linha correspondente', () => {
    const linhas = [linha('c1', null), linha('c2', null)] as unknown as Linhas
    const out = mesclarVagasDasCandidaturas(linhas, [
      null,
      'texto',
      ['c1'],
      { candidatura_id: 1, titulo: 'id numérico', departamento: null },
      { candidatura_id: 'c1', titulo: 5, departamento: null },
      { candidatura_id: 'c1', titulo: 'departamento numérico', departamento: 7 },
      { candidatura_id: 'c1', departamento: 'sem titulo' },
      { candidatura_id: 'c-de-ninguem', titulo: 'sem linha', departamento: 'X' },
    ])
    expect(out.length, 'nenhuma linha nasce nem some').toBe(2)
    expect(out[0].vaga, 'c1 continua sem vaga').toBeNull()
    expect(out[1].vaga, 'c2 continua sem vaga').toBeNull()
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['objeto', { candidatura_id: 'c1', titulo: 'T', departamento: null }],
    ['texto', 'x'],
    ['número', 42],
  ])('devolve as linhas inalteradas quando entradas não é array (%s)', (_rotulo, entradas) => {
    const linhas = [linha('c1', null)] as unknown as Linhas
    const out = mesclarVagasDasCandidaturas(linhas, entradas)
    expect(out, 'as mesmas linhas').toBe(linhas)
    expect(out[0].vaga, 'c1 continua sem vaga').toBeNull()
  })
})

describe('listCandidaturas + ler_vagas_das_minhas_candidaturas (52-31 · G-52-7)', () => {
  it('não chama a RPC quando todo embed veio', async () => {
    listaDevolve([linha('c1', EMBED_PUBLICO), linha('c2', { ...EMBED_PUBLICO, id: 'vaga-2' })])
    rpc().mockResolvedValue({ data: [], error: null })

    const r = await listCandidaturas(CANDIDATO)

    expect(rpc().mock.calls.length, 'chamadas à RPC com todo embed presente').toBe(0)
    expect(r.data.map((c) => c.vaga?.titulo).join(' | '), 'títulos do embed').toBe(`${EMBED_PUBLICO.titulo} | ${EMBED_PUBLICO.titulo}`)
  })

  it('chama a RPC UMA vez, pelo nome, com N linhas de embed nulo, e mescla só nelas', async () => {
    listaDevolve([linha('c1', null), linha('c2', EMBED_PUBLICO), linha('c3', null)])
    rpc().mockResolvedValue({
      data: [
        { candidatura_id: 'c3', titulo: 'Vaga arquivada', departamento: null },
        { candidatura_id: 'c2', titulo: 'NÃO pode sobrescrever o embed', departamento: 'X' },
        { candidatura_id: 'c1', titulo: 'Vaga pausada', departamento: 'Marketing' },
      ],
      error: null,
    })

    const r = await listCandidaturas(CANDIDATO)

    expect(rpc().mock.calls.length, 'uma chamada por leitura da lista').toBe(1)
    expect(rpc().mock.calls[0][0], 'o nome da RPC').toBe(RPC_VAGAS_DAS_MINHAS_CANDIDATURAS)
    expect(RPC_VAGAS_DAS_MINHAS_CANDIDATURAS, 'o nome da migration 0006').toBe('ler_vagas_das_minhas_candidaturas')
    expect(JSON.stringify(r.data[0].vaga), 'c1 mesclada').toBe(JSON.stringify({ titulo: 'Vaga pausada', departamento: 'Marketing' }))
    expect(r.data[1].vaga as unknown, 'c2 com o embed intacto').toBe(EMBED_PUBLICO)
    expect(JSON.stringify(r.data[2].vaga), 'c3 mesclada').toBe(JSON.stringify({ titulo: 'Vaga arquivada', departamento: null }))
  })

  it('com erro da RPC resolve com as linhas como vieram, sem lançar e sem o texto do erro', async () => {
    listaDevolve([linha('c1', null), linha('c2', EMBED_PUBLICO)])
    rpc().mockResolvedValue({ data: null, error: { message: ERRO_SECRETO, code: 'XX000' } })

    const r = await listCandidaturas(CANDIDATO)

    expect(r.success, 'a lista resolve').toBe(true)
    expect(r.data[0].vaga, 'c1 fica no fallback').toBeNull()
    expect(r.data[1].vaga as unknown, 'c2 intacta').toBe(EMBED_PUBLICO)
    expect(JSON.stringify(r).includes(ERRO_SECRETO), 'o texto do erro no retorno').toBe(false)
  })

  it('com falha de transporte da RPC (promessa rejeitada) resolve com as linhas como vieram', async () => {
    listaDevolve([linha('c1', null)])
    rpc().mockRejectedValue(new Error(ERRO_SECRETO))

    const r = await listCandidaturas(CANDIDATO)

    expect(r.success, 'a lista resolve').toBe(true)
    expect(r.data[0].vaga, 'c1 fica no fallback').toBeNull()
    expect(JSON.stringify(r).includes(ERRO_SECRETO), 'o texto do erro no retorno').toBe(false)
  })
})
