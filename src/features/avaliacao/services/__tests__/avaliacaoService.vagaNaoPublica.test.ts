/**
 * 52-32 (JORN-59 · R1 do G-52-7 · D-52-G7B-1, D-52-G7B-4) — a leitura dos testes da vaga no serviço.
 *
 * `lerTestesDaMinhaCandidatura` e `getAvaliacaoContext` sobre um cliente Supabase ESPIÃO com `from`
 * (a cadeia do PostgREST) e `rpc` (`ler_testes_das_minhas_candidaturas`).
 *
 * O contrato vigiado aqui:
 *   - da entrada da RPC atravessam SÓ `testes_aplicaveis` e `aplica_cognitivo` (allowlist no cliente);
 *   - só a entrada da candidatura PEDIDA conta; entrada malformada é ignorada;
 *   - erro, promessa rejeitada ou retorno que não é array = `null`, sem lançar e sem ecoar o erro;
 *   - `getAvaliacaoContext` chama a RPC SÓ quando o objeto `vaga` veio nulo OU ausente, no máximo
 *     UMA vez, e usa a bateria dela no filtro de `perguntas`; sem entrada, o desfecho de hoje.
 *
 * Asserções com mensagem de UMA linha (o relatório TAP da evidência RED não aceita mensagem
 * multilinha — lição do 52-31 SUMMARY, desvio 1).
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
  getAvaliacaoContext,
  lerTestesDaMinhaCandidatura,
  RPC_TESTES_DAS_MINHAS_CANDIDATURAS,
} from '../avaliacaoService'

const CAND = 'cand-0001'
const OUTRA = 'cand-0002'
const ERRO_SECRETO = 'detalhe interno do banco que nunca pode chegar ao candidato'
const BATERIA_CARGO = [{ teste: 'work_sample_sjt', obrigatorio: true, cargo: 'recepcionista' }]
const BATERIA_ITENS = [{ teste: 'work_sample_sjt', obrigatorio: true, itens_ids: ['p-1', 'p-2'] }]

const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>
const from = supabase.from as unknown as ReturnType<typeof vi.fn>

type Filtro = [string, string, unknown]

/** Monta o cliente espião: a linha de `candidaturas` e a cadeia de `perguntas` (que registra filtros). */
function montar(linha: Record<string, unknown>) {
  const filtros: Filtro[] = []
  from.mockImplementation((tabela: string) => {
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'is', 'order']) q[m] = vi.fn(() => q)
    q.eq = vi.fn((c: string, v: unknown) => {
      filtros.push([tabela, `eq:${c}`, v])
      return q
    })
    q.in = vi.fn((c: string, v: unknown) => {
      filtros.push([tabela, `in:${c}`, v])
      return q
    })
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: tabela === 'candidaturas' ? linha : null, error: null }))
    q.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null })
    return q
  })
  return filtros
}

function linhaCand(extra: Record<string, unknown>): Record<string, unknown> {
  return { id: CAND, status: 'em_analise', etapa_atual: 'avaliacao_assincrona', vaga_id: 'vaga-x', ...extra }
}

function chamadasDaRpc(): number {
  return rpc.mock.calls.filter((c) => c[0] === RPC_TESTES_DAS_MINHAS_CANDIDATURAS).length
}

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockReset()
  from.mockReset()
})

describe('lerTestesDaMinhaCandidatura — allowlist, posse da entrada e falha silenciosa', () => {
  it('lerTestes devolve so as duas chaves mesmo com titulo e salario na entrada', async () => {
    rpc.mockResolvedValue({
      data: [{ candidatura_id: CAND, testes_aplicaveis: BATERIA_CARGO, aplica_cognitivo: true, titulo: 'T', salario: 9 }],
      error: null,
    })
    const r = await lerTestesDaMinhaCandidatura(CAND)
    expect(Object.keys(r ?? {}).sort().join(','), 'so testes_aplicaveis e aplica_cognitivo atravessam').toBe('aplica_cognitivo,testes_aplicaveis')
    expect(r?.aplica_cognitivo, 'o opt-in da entrada').toBe(true)
  })

  it('lerTestes ignora a entrada de outra candidatura', async () => {
    rpc.mockResolvedValue({
      data: [{ candidatura_id: OUTRA, testes_aplicaveis: BATERIA_CARGO, aplica_cognitivo: true }],
      error: null,
    })
    const r = await lerTestesDaMinhaCandidatura(CAND)
    expect(r, 'entrada de outra candidatura nunca vale para a pedida').toBeNull()
  })

  it('lerTestes ignora entrada malformada', async () => {
    rpc.mockResolvedValue({
      data: [{ candidatura_id: CAND, testes_aplicaveis: BATERIA_CARGO, aplica_cognitivo: 'sim' }],
      error: null,
    })
    const r = await lerTestesDaMinhaCandidatura(CAND)
    expect(r, 'aplica_cognitivo que nao e booleano invalida a entrada').toBeNull()
  })

  it('lerTestes devolve null quando a RPC responde erro, mesmo com dados junto', async () => {
    rpc.mockResolvedValue({
      data: [{ candidatura_id: CAND, testes_aplicaveis: BATERIA_CARGO, aplica_cognitivo: true }],
      error: { message: ERRO_SECRETO, code: 'XX000' },
    })
    const r = await lerTestesDaMinhaCandidatura(CAND)
    expect(r, 'resposta com erro nunca e confiada').toBeNull()
    expect(JSON.stringify(r ?? null).includes(ERRO_SECRETO), 'o texto do erro nao ecoa').toBe(false)
  })

  it('lerTestes devolve null quando a promessa da RPC rejeita, sem lancar', async () => {
    rpc.mockReturnValue(Promise.reject(new Error(ERRO_SECRETO)))
    let lancou = false
    let r: unknown = 'nao-rodou'
    try {
      r = await lerTestesDaMinhaCandidatura(CAND)
    } catch {
      lancou = true
    }
    expect(lancou, 'falha de transporte nao lanca').toBe(false)
    expect(r, 'falha de transporte vira null').toBeNull()
  })

  it('lerTestes devolve null quando o retorno nao e array', async () => {
    rpc.mockResolvedValue({
      data: { candidatura_id: CAND, testes_aplicaveis: BATERIA_CARGO, aplica_cognitivo: true },
      error: null,
    })
    const r = await lerTestesDaMinhaCandidatura(CAND)
    expect(r, 'objeto solto no lugar da lista vira null').toBeNull()
  })
})

describe('getAvaliacaoContext — a RPC so com o embed da vaga nulo ou ausente, uma vez', () => {
  it('contexto com o objeto vaga presente nao chama a RPC mesmo com testes nulos dentro dele', async () => {
    montar(linhaCand({ vaga: { testes_aplicaveis: null, aplica_cognitivo: false } }))
    rpc.mockResolvedValue({ data: [{ candidatura_id: CAND, testes_aplicaveis: BATERIA_CARGO, aplica_cognitivo: true }], error: null })
    const ctx = await getAvaliacaoContext(CAND)
    expect(chamadasDaRpc(), 'embed presente: nenhuma chamada a RPC dos testes').toBe(0)
    expect(ctx.aplica_cognitivo, 'o opt-in do embed').toBe(false)
  })

  it('contexto com vaga nula chama a RPC uma vez e usa a bateria e o opt-in dela', async () => {
    const filtros = montar(linhaCand({ vaga: null }))
    rpc.mockResolvedValue({ data: [{ candidatura_id: CAND, testes_aplicaveis: BATERIA_CARGO, aplica_cognitivo: true }], error: null })
    const ctx = await getAvaliacaoContext(CAND)
    expect(chamadasDaRpc(), 'vaga nula: exatamente uma chamada').toBe(1)
    expect(ctx.aplica_cognitivo, 'o opt-in veio da RPC').toBe(true)
    expect(filtros.some(([t, f, v]) => t === 'perguntas' && f === 'eq:cargo' && v === 'recepcionista'), 'perguntas filtradas pelo cargo da RPC').toBe(true)
  })

  it('contexto com a chave vaga ausente chama a RPC uma vez, como o nulo', async () => {
    const filtros = montar(linhaCand({}))
    rpc.mockResolvedValue({ data: [{ candidatura_id: CAND, testes_aplicaveis: BATERIA_CARGO, aplica_cognitivo: false }], error: null })
    await getAvaliacaoContext(CAND)
    expect(chamadasDaRpc(), 'vaga ausente: exatamente uma chamada').toBe(1)
    expect(filtros.some(([t, f, v]) => t === 'perguntas' && f === 'eq:cargo' && v === 'recepcionista'), 'perguntas filtradas pelo cargo da RPC').toBe(true)
  })

  it('contexto filtra perguntas pelos itens_ids da bateria vinda da RPC', async () => {
    const filtros = montar(linhaCand({ vaga: null }))
    rpc.mockResolvedValue({ data: [{ candidatura_id: CAND, testes_aplicaveis: BATERIA_ITENS, aplica_cognitivo: false }], error: null })
    await getAvaliacaoContext(CAND)
    const inIds = filtros.find(([t, f]) => t === 'perguntas' && f === 'in:id')
    expect(JSON.stringify(inIds?.[2] ?? null), 'in id com os itens_ids da RPC').toBe('["p-1","p-2"]')
  })

  it('contexto com erro da RPC fica sem testes e com opt-in falso, sem lancar', async () => {
    const filtros = montar(linhaCand({ vaga: null }))
    rpc.mockResolvedValue({ data: null, error: { message: ERRO_SECRETO } })
    const ctx = await getAvaliacaoContext(CAND)
    expect(chamadasDaRpc(), 'a RPC foi tentada uma vez').toBe(1)
    expect(ctx.testes_aplicaveis, 'sem testes no erro').toBeNull()
    expect(ctx.aplica_cognitivo, 'opt-in falso no erro').toBe(false)
    expect(filtros.some(([t, f]) => t === 'perguntas' && (f === 'in:id' || f === 'eq:cargo')), 'sem bateria nenhum filtro de bateria em perguntas').toBe(false)
    expect(ctx.perguntas.length, 'sem bateria nenhuma pergunta').toBe(0)
    expect(JSON.stringify(ctx).includes(ERRO_SECRETO), 'o texto do erro nao ecoa').toBe(false)
  })
})
