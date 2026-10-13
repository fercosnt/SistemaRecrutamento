/**
 * 52-32 (D-52-G7B-5 — o quarto leitor) — o opt-in cognitivo da prova com a vaga fora do ar.
 *
 * `getContexto` sobre um cliente Supabase ESPIÃO com `from` e `rpc`
 * (`ler_testes_das_minhas_candidaturas`). Contrato: com o objeto `vagas` nulo ou ausente, o
 * `aplica_cognitivo` vem da entrada da RPC (UMA chamada); erro = falso (a prova segue fechada,
 * nunca aberta por acidente); com o objeto presente, nenhuma chamada e o valor do embed.
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
import { getContexto } from '../services/cognitivoService'
import { RPC_TESTES_DAS_MINHAS_CANDIDATURAS } from '@/features/avaliacao/services/avaliacaoService'

const CAND = 'cand-cog-1'
const ERRO_SECRETO = 'detalhe interno do banco que nunca pode chegar ao candidato'

const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>
const from = supabase.from as unknown as ReturnType<typeof vi.fn>

function montar(linha: Record<string, unknown>) {
  from.mockImplementation(() => {
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is']) q[m] = vi.fn(() => q)
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: linha, error: null }))
    return q
  })
}

function chamadasDaRpc(): number {
  return rpc.mock.calls.filter((c) => c[0] === RPC_TESTES_DAS_MINHAS_CANDIDATURAS).length
}

const base = { id: CAND, vaga_id: 'vaga-cog', etapa_atual: 'avaliacao_assincrona' }

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockReset()
  from.mockReset()
})

describe('getContexto — opt-in cognitivo com a vaga fora do ar', () => {
  it('cognitivo com vagas nula e a entrada da RPC com opt-in abre a prova', async () => {
    montar({ ...base, vagas: null })
    rpc.mockResolvedValue({ data: [{ candidatura_id: CAND, testes_aplicaveis: [], aplica_cognitivo: true }], error: null })
    const ctx = await getContexto(CAND)
    expect(chamadasDaRpc(), 'uma chamada a RPC dos testes').toBe(1)
    expect(ctx?.aplica_cognitivo, 'o opt-in veio da RPC').toBe(true)
  })

  it('cognitivo com a chave vagas ausente usa a entrada da RPC, como o nulo', async () => {
    montar({ ...base })
    rpc.mockResolvedValue({ data: [{ candidatura_id: CAND, testes_aplicaveis: [], aplica_cognitivo: true }], error: null })
    const ctx = await getContexto(CAND)
    expect(chamadasDaRpc(), 'uma chamada a RPC dos testes').toBe(1)
    expect(ctx?.aplica_cognitivo, 'o opt-in veio da RPC').toBe(true)
  })

  it('cognitivo com vagas nula e erro da RPC fica fechado sem lancar', async () => {
    montar({ ...base, vagas: null })
    rpc.mockResolvedValue({ data: null, error: { message: ERRO_SECRETO } })
    const ctx = await getContexto(CAND)
    expect(chamadasDaRpc(), 'a RPC foi tentada uma vez').toBe(1)
    expect(ctx?.aplica_cognitivo, 'erro: prova fechada').toBe(false)
    expect(JSON.stringify(ctx).includes(ERRO_SECRETO), 'o texto do erro nao ecoa').toBe(false)
  })

  it('cognitivo com o objeto vagas presente nao chama a RPC e usa o embed', async () => {
    montar({ ...base, vagas: { aplica_cognitivo: true } })
    rpc.mockResolvedValue({ data: [{ candidatura_id: CAND, testes_aplicaveis: [], aplica_cognitivo: false }], error: null })
    const ctx = await getContexto(CAND)
    expect(chamadasDaRpc(), 'embed presente: nenhuma chamada').toBe(0)
    expect(ctx?.aplica_cognitivo, 'o opt-in do embed').toBe(true)
  })
})
