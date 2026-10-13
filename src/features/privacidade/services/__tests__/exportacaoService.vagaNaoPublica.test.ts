/**
 * 52-32 (R1 do G-52-7 · D-52-G7B-1: a 0006 reusada) — o título da vaga no bloco de currículos.
 *
 * `mesclarTitulosDasVagas` (pura) e `listarMeusCurriculos` sobre um cliente Supabase ESPIÃO com
 * `from` e `rpc` (`ler_vagas_das_minhas_candidaturas`, a RPC da 0006). Contrato: só `vagaTitulo`
 * nulo é preenchido, só com `titulo` string não vazia da entrada da MESMA candidatura; título
 * presente nunca é sobrescrito; entrada malformada e não-array são ignoradas; cada linha mantém
 * exatamente as chaves `id, caminho, enviadoEm, vagaTitulo`; a RPC é chamada UMA vez e só quando
 * alguma linha veio sem título; erro = as linhas com título nulo, sem lançar e sem o texto do erro.
 *
 * Asserções com mensagem de UMA linha (lição do 52-31 SUMMARY, desvio 1). Os casos da mescla
 * começam por `typeof mesclarTitulosDasVagas` para o vermelho ser de asserção.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'
import * as servico from '../exportacaoService'
import { RPC_VAGAS_DAS_MINHAS_CANDIDATURAS } from '@/features/vagas/services/candidaturasService'

type Linha = servico.LinhaCurriculo
type Mescla = (linhas: Linha[], entradas: unknown) => Linha[]

const CANDIDATO = 'candidato-0001'
const ERRO_SECRETO = 'detalhe interno do banco que nunca pode chegar ao candidato'

const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>
const from = supabase.from as unknown as ReturnType<typeof vi.fn>

const mescla = (): Mescla => (servico as unknown as { mesclarTitulosDasVagas: Mescla }).mesclarTitulosDasVagas

function l(id: string, vagaTitulo: string | null): Linha {
  return { id, caminho: `cv/${id}.pdf`, enviadoEm: '2026-10-01T12:00:00Z', vagaTitulo }
}

function montar(linhas: Array<Record<string, unknown>>) {
  from.mockImplementation(() => {
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'not', 'order', 'is']) q[m] = vi.fn(() => q)
    q.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve({ data: linhas, error: null })
    return q
  })
}

function bruta(id: string, extra: Record<string, unknown>): Record<string, unknown> {
  return { id, curriculo_url: `cv/${id}.pdf`, created_at: '2026-10-01T12:00:00Z', ...extra }
}

function chamadasDaRpc(): number {
  return rpc.mock.calls.filter((c) => c[0] === RPC_VAGAS_DAS_MINHAS_CANDIDATURAS).length
}

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockReset()
  from.mockReset()
})

describe('mesclarTitulosDasVagas — pura', () => {
  it('mescla preenche so o titulo nulo com o titulo da mesma candidatura', () => {
    expect(typeof (servico as Record<string, unknown>).mesclarTitulosDasVagas, 'mesclarTitulosDasVagas exportado').toBe('function')
    const r = mescla()([l('a', null), l('b', null)], [
      { candidatura_id: 'a', titulo: 'Recepcionista', departamento: null },
    ])
    expect(r.map((x) => String(x.vagaTitulo)).join('|'), 'a recebe o titulo, b fica nulo').toBe('Recepcionista|null')
  })

  it('mescla nunca sobrescreve titulo presente', () => {
    expect(typeof (servico as Record<string, unknown>).mesclarTitulosDasVagas, 'mesclarTitulosDasVagas exportado').toBe('function')
    const r = mescla()([l('a', 'Titulo do embed')], [{ candidatura_id: 'a', titulo: 'Outro', departamento: null }])
    expect(r[0].vagaTitulo, 'o titulo do embed fica').toBe('Titulo do embed')
  })

  it('mescla ignora entrada malformada, titulo vazio e entradas que nao sao array', () => {
    expect(typeof (servico as Record<string, unknown>).mesclarTitulosDasVagas, 'mesclarTitulosDasVagas exportado').toBe('function')
    const m = mescla()
    const linhas = [l('a', null), l('b', null), l('c', null)]
    const r = m(linhas, [
      { candidatura_id: 'a', titulo: 42 },
      { candidatura_id: 'b', titulo: '   ' },
      { titulo: 'Sem candidatura' },
      'lixo',
    ])
    expect(r.map((x) => String(x.vagaTitulo)).join('|'), 'nenhuma entrada torta preenche').toBe('null|null|null')
    expect(m(linhas, { candidatura_id: 'a', titulo: 'X' }).map((x) => String(x.vagaTitulo)).join('|'), 'objeto solto nao e lista').toBe('null|null|null')
    expect(m(linhas, null).length, 'null devolve as linhas').toBe(3)
  })

  it('mescla mantem exatamente as chaves id caminho enviadoEm vagaTitulo', () => {
    expect(typeof (servico as Record<string, unknown>).mesclarTitulosDasVagas, 'mesclarTitulosDasVagas exportado').toBe('function')
    const r = mescla()([l('a', null)], [{ candidatura_id: 'a', titulo: 'Recepcionista', departamento: 'Clinica', salario: 1 }])
    expect(Object.keys(r[0]).sort().join(','), 'so as chaves da LinhaCurriculo').toBe('caminho,enviadoEm,id,vagaTitulo')
  })
})

describe('listarMeusCurriculos — a 0006 so quando falta titulo, uma vez', () => {
  it('curriculos com vaga nula chamam a RPC da 0006 uma vez e mostram o titulo', async () => {
    montar([bruta('a', { vaga: null }), bruta('b', { vaga: { titulo: 'Publica' } })])
    rpc.mockResolvedValue({ data: [{ candidatura_id: 'a', titulo: 'Inativa', departamento: null }], error: null })
    const r = await servico.listarMeusCurriculos(CANDIDATO)
    expect(chamadasDaRpc(), 'uma chamada a RPC da 0006').toBe(1)
    expect(r.map((x) => String(x.vagaTitulo)).join('|'), 'o titulo da RPC e o do embed').toBe('Inativa|Publica')
  })

  it('curriculos com a chave vaga ausente chamam a RPC uma vez e mostram o titulo', async () => {
    montar([bruta('a', {})])
    rpc.mockResolvedValue({ data: [{ candidatura_id: 'a', titulo: 'Inativa', departamento: null }], error: null })
    const r = await servico.listarMeusCurriculos(CANDIDATO)
    expect(chamadasDaRpc(), 'uma chamada a RPC da 0006').toBe(1)
    expect(r.map((x) => String(x.vagaTitulo)).join('|'), 'o titulo da RPC').toBe('Inativa')
  })

  it('curriculos com todas as linhas tituladas nao chamam a RPC', async () => {
    montar([bruta('a', { vaga: { titulo: 'Publica A' } }), bruta('b', { vaga: [{ titulo: 'Publica B' }] })])
    rpc.mockResolvedValue({ data: [], error: null })
    const r = await servico.listarMeusCurriculos(CANDIDATO)
    expect(chamadasDaRpc(), 'todas com titulo: nenhuma chamada').toBe(0)
    expect(r.map((x) => String(x.vagaTitulo)).join('|'), 'os titulos do embed').toBe('Publica A|Publica B')
  })

  it('curriculos com erro da RPC ficam com titulo nulo sem lancar e sem o texto do erro', async () => {
    montar([bruta('a', { vaga: null })])
    rpc.mockResolvedValue({ data: null, error: { message: ERRO_SECRETO } })
    const r = await servico.listarMeusCurriculos(CANDIDATO)
    expect(chamadasDaRpc(), 'a RPC foi tentada uma vez').toBe(1)
    expect(r.map((x) => String(x.vagaTitulo)).join('|'), 'titulo nulo no erro').toBe('null')
    expect(JSON.stringify(r).includes(ERRO_SECRETO), 'o texto do erro nao ecoa').toBe(false)
  })
})
