/**
 * 52-32 (JORN-59 · R1 do G-52-7 · D-52-G7B-4) — a redação por link direto com a vaga fora do ar.
 *
 * `getRedacaoContext` sobre um cliente Supabase ESPIÃO com `from` (a cadeia do PostgREST, que
 * registra a projeção e os filtros) e `rpc` (`ler_testes_das_minhas_candidaturas`).
 *
 * O contrato vigiado aqui:
 *   - a projeção é o embed SIMPLES `id, vaga:vagas(testes_aplicaveis)` (o `!inner` sumia com a linha);
 *   - com o objeto `vaga` nulo ou ausente, os `codigos` vêm da entrada da RPC (UMA chamada);
 *   - sem a entrada (erro, ausência), `NOT_FOUND` «Candidatura não encontrada» — o desfecho de hoje —
 *     e NENHUMA consulta a `perguntas_redacao` (nunca a pergunta padrão por acidente);
 *   - com o objeto `vaga` presente, nenhuma chamada à RPC.
 *
 * Asserções com mensagem de UMA linha (lição do 52-31 SUMMARY, desvio 1).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'
import { getRedacaoContext } from '../redacaoService'
import { RPC_TESTES_DAS_MINHAS_CANDIDATURAS } from '../avaliacaoService'

const CAND = 'cand-redacao-1'
const ERRO_SECRETO = 'detalhe interno do banco que nunca pode chegar ao candidato'
const BATERIA = [{ teste: 'redacao_cultural', obrigatorio: true, codigos: ['D1'] }]

const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>
const from = supabase.from as unknown as ReturnType<typeof vi.fn>

type Registro = { selects: Array<[string, string]>; filtros: Array<[string, string, unknown]> }

function montar(linha: Record<string, unknown> | null): Registro {
  const reg: Registro = { selects: [], filtros: [] }
  from.mockImplementation((tabela: string) => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      reg.selects.push([tabela, cols])
      return q
    })
    for (const m of ['is', 'order']) q[m] = vi.fn(() => q)
    q.eq = vi.fn((c: string, v: unknown) => {
      reg.filtros.push([tabela, `eq:${c}`, v])
      return q
    })
    q.in = vi.fn((c: string, v: unknown) => {
      reg.filtros.push([tabela, `in:${c}`, v])
      return q
    })
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: linha, error: null }))
    q.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: [{ id: 'r1', codigo: 'D1', texto: 'Enunciado', valor_primario: null, is_padrao: false }], error: null })
    return q
  })
  return reg
}

async function codigoDoErro(p: Promise<unknown>): Promise<string> {
  try {
    await p
    return 'resolveu'
  } catch (e) {
    return String((e as { code?: unknown }).code)
  }
}

function chamadasDaRpc(): number {
  return rpc.mock.calls.filter((c) => c[0] === RPC_TESTES_DAS_MINHAS_CANDIDATURAS).length
}

function consultouRedacao(reg: Registro): boolean {
  return reg.selects.some(([t]) => t === 'perguntas_redacao')
}

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockReset()
  from.mockReset()
})

describe('getRedacaoContext — vaga fora do ar', () => {
  it('redacao projeta o embed simples da vaga, sem inner', async () => {
    const reg = montar({ id: CAND, vaga: { testes_aplicaveis: BATERIA } })
    await getRedacaoContext(CAND)
    const proj = reg.selects.find(([t]) => t === 'candidaturas')?.[1] ?? ''
    expect(proj, 'a projecao de candidaturas').toBe('id, vaga:vagas(testes_aplicaveis)')
  })

  it('redacao com vaga nula usa os codigos da RPC', async () => {
    const reg = montar({ id: CAND, vaga: null })
    rpc.mockResolvedValue({ data: [{ candidatura_id: CAND, testes_aplicaveis: BATERIA, aplica_cognitivo: false }], error: null })
    await getRedacaoContext(CAND)
    expect(chamadasDaRpc(), 'uma chamada a RPC dos testes').toBe(1)
    const inCod = reg.filtros.find(([t, f]) => t === 'perguntas_redacao' && f === 'in:codigo')
    expect(JSON.stringify(inCod?.[2] ?? null), 'perguntas_redacao filtradas pelos codigos da RPC').toBe('["D1"]')
  })

  it('redacao com a chave vaga ausente usa os codigos da RPC, como o nulo', async () => {
    const reg = montar({ id: CAND })
    rpc.mockResolvedValue({ data: [{ candidatura_id: CAND, testes_aplicaveis: BATERIA, aplica_cognitivo: false }], error: null })
    await getRedacaoContext(CAND)
    expect(chamadasDaRpc(), 'uma chamada a RPC dos testes').toBe(1)
    const inCod = reg.filtros.find(([t, f]) => t === 'perguntas_redacao' && f === 'in:codigo')
    expect(JSON.stringify(inCod?.[2] ?? null), 'perguntas_redacao filtradas pelos codigos da RPC').toBe('["D1"]')
  })

  it('redacao com vaga nula e erro da RPC segue Candidatura nao encontrada sem a pergunta padrao', async () => {
    const reg = montar({ id: CAND, vaga: null })
    rpc.mockResolvedValue({ data: null, error: { message: ERRO_SECRETO } })
    const code = await codigoDoErro(getRedacaoContext(CAND))
    expect(chamadasDaRpc(), 'a RPC foi tentada uma vez').toBe(1)
    expect(code, 'o desfecho de hoje: NOT_FOUND').toBe('NOT_FOUND')
    expect(consultouRedacao(reg), 'nenhuma consulta a perguntas_redacao').toBe(false)
  })

  it('redacao com vaga nula e sem a entrada da candidatura segue Candidatura nao encontrada', async () => {
    const reg = montar({ id: CAND, vaga: null })
    rpc.mockResolvedValue({ data: [{ candidatura_id: 'outra', testes_aplicaveis: BATERIA, aplica_cognitivo: false }], error: null })
    const code = await codigoDoErro(getRedacaoContext(CAND))
    expect(chamadasDaRpc(), 'a RPC foi tentada uma vez').toBe(1)
    expect(code, 'sem entrada: NOT_FOUND').toBe('NOT_FOUND')
    expect(consultouRedacao(reg), 'nenhuma consulta a perguntas_redacao').toBe(false)
  })

  it('redacao com o objeto vaga presente nao chama a RPC', async () => {
    const reg = montar({ id: CAND, vaga: { testes_aplicaveis: BATERIA } })
    rpc.mockResolvedValue({ data: [], error: null })
    await getRedacaoContext(CAND)
    expect(chamadasDaRpc(), 'embed presente: nenhuma chamada').toBe(0)
    const inCod = reg.filtros.find(([t, f]) => t === 'perguntas_redacao' && f === 'in:codigo')
    expect(JSON.stringify(inCod?.[2] ?? null), 'os codigos do embed').toBe('["D1"]')
  })
})
