/**
 * Regressão do escopo da redação cultural (medido em PROD, 2026-08-30).
 *
 * `getRedacaoContext` lia TODAS as `perguntas_redacao` com `ativa = true`, sem
 * olhar a vaga. Eram onze, e `RedacaoEditorScreen` itera a lista mostrando
 * "Pergunta n de total": o candidato de uma vaga comercial escreveria onze
 * redações, entre elas "defenda uma abordagem clínica não-óbvia" (feita para
 * dentista) e "dê um feedback duro a um subordinado" (para coordenação).
 *
 * É a MESMA FORMA do defeito do SJT, consertado quatro dias antes — instrumento
 * sem escopo declarado servindo o banco inteiro. Nenhum dos dois apareceu em teste
 * unitário porque não havia teste sobre o ESCOPO, só sobre a projeção de colunas.
 * Este arquivo existe para que a terceira vez não aconteça.
 *
 * @see src/features/avaliacao/services/__tests__/avaliacaoService.test.ts (o mesmo para o SJT)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

/** Banco inteiro: o que a versão quebrada devolvia. */
const BANCO = [
  { id: 'p1', codigo: 'PADRAO_BS', texto: 'padrão', valor_primario: null, is_padrao: true },
  { id: 'p2', codigo: 'D1', texto: 'dentista', valor_primario: null, is_padrao: false },
  { id: 'p3', codigo: 'C2', texto: 'coordenação', valor_primario: null, is_padrao: false },
]

const { fromMock, filtros, vagaTestes } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  filtros: { eq: [] as Array<[string, unknown]>, in: [] as Array<[string, unknown[]]> },
  vagaTestes: { valor: null as unknown },
}))

vi.mock('@/lib/supabase/client', () => {
  const candidaturas = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn(() => q)
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    q.maybeSingle = vi.fn(() =>
      Promise.resolve({
        data: { id: 'cand-1', vaga: { testes_aplicaveis: vagaTestes.valor } },
        error: null,
      }),
    )
    return q
  }

  // Acumula os filtros e resolve no await — o serviço encadeia `.eq` e às vezes
  // `.in`, e um mock terminal no primeiro elo mediria a implementação, não o efeito.
  const redacao = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn(() => q)
    q.eq = vi.fn((c: string, v: unknown) => {
      filtros.eq.push([c, v])
      return q
    })
    q.in = vi.fn((c: string, v: unknown[]) => {
      filtros.in.push([c, v])
      return q
    })
    q.order = vi.fn(() => q)
    q.then = (resolve: (v: unknown) => unknown) => {
      const porCodigo = filtros.in.find(([c]) => c === 'codigo')?.[1] as string[] | undefined
      const soPadrao = filtros.eq.some(([c, v]) => c === 'is_padrao' && v === true)
      let linhas = BANCO
      if (porCodigo) linhas = BANCO.filter((p) => porCodigo.includes(p.codigo))
      else if (soPadrao) linhas = BANCO.filter((p) => p.is_padrao)
      return Promise.resolve({ data: linhas, error: null }).then(resolve)
    }
    return q
  }

  fromMock.mockImplementation((t: string) => (t === 'candidaturas' ? candidaturas() : redacao()))
  return { supabase: { from: fromMock, rpc: vi.fn() } }
})

import { getRedacaoContext } from '@/features/avaliacao/services/redacaoService'

describe('getRedacaoContext — a vaga decide quais redações o candidato escreve', () => {
  beforeEach(() => {
    fromMock.mockClear()
    filtros.eq = []
    filtros.in = []
    vagaTestes.valor = null
  })

  it('com `codigos` declarados, serve SÓ esses — nunca o banco inteiro', async () => {
    vagaTestes.valor = [
      { teste: 'triagem', obrigatorio: true },
      { teste: 'redacao_cultural', obrigatorio: true, codigos: ['PADRAO_BS'] },
    ]

    const perguntas = await getRedacaoContext('cand-1')

    expect(filtros.in).toContainEqual(['codigo', ['PADRAO_BS']])
    expect(perguntas.map((p) => p.codigo)).toEqual(['PADRAO_BS'])

    // A regressão em uma linha: a de dentista NÃO pode chegar a uma vaga comercial.
    expect(perguntas.map((p) => p.codigo)).not.toContain('D1')
  })

  it('sem `codigos`, cai na pergunta PADRÃO — e não nas onze', async () => {
    // Diferente do SJT, onde a ausência de bateria devolve lista vazia: ali
    // `pontuar_sjt` recusaria a submissão de qualquer forma, então lista vazia evita
    // trabalho perdido. Aqui a etapa pode ser obrigatória e não há recusa no
    // servidor — travar o candidato numa etapa vazia seria pior que servir a
    // pergunta que existe justamente para ser o default.
    vagaTestes.valor = [{ teste: 'redacao_cultural', obrigatorio: true }]

    const perguntas = await getRedacaoContext('cand-1')

    expect(filtros.eq).toContainEqual(['is_padrao', true])
    expect(perguntas).toHaveLength(1)
    expect(perguntas[0].codigo).toBe('PADRAO_BS')
  })

  it('vaga sem elemento de redação nenhum também não serve o banco inteiro', async () => {
    vagaTestes.valor = [{ teste: 'triagem', obrigatorio: true }]

    const perguntas = await getRedacaoContext('cand-1')

    expect(perguntas.length).toBeLessThan(BANCO.length)
    expect(perguntas.map((p) => p.codigo)).toEqual(['PADRAO_BS'])
  })

  it('sempre filtra por `ativa` — pergunta desativada não volta a circular', async () => {
    vagaTestes.valor = [{ teste: 'redacao_cultural', obrigatorio: true, codigos: ['D1'] }]
    await getRedacaoContext('cand-1')
    expect(filtros.eq).toContainEqual(['ativa', true])
  })
})
