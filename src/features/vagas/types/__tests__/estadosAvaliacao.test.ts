/**
 * Phase 49 / Plan 49-04 — tabela-verdade dos ESTADOS das células de avaliação do card do RH.
 *
 * O que estes testes existem para impedir é uma forma, não um valor: **ausência virando 0**.
 * Os três helpers que estavam aqui antes (`calculateBigFiveAverage`, `getCultureScore`,
 * `formatDiscProfile`) devolviam um valor de nota quando a fonte não tinha dado, e a tela
 * não tinha como distinguir isso de uma nota real. Medido no kickoff da Phase 49: 38 cards
 * mostrando `0`.
 *
 * Forma do arquivo herdada de `src/lib/candidatura/__tests__/candidaturaEncerrada.test.ts`
 * (48-02 / 49-03): tabela-verdade como DADO + `it.each`, para que um caso acrescentado de
 * um lado e esquecido do outro fique visível.
 *
 * @see src/features/vagas/types/vagasTypes.ts
 */
import { describe, it, expect } from 'vitest'
import {
  estadoCultura,
  type EstadoCultura,
  type ScoreCandidatoRow,
  type RedacaoSinal,
} from '../vagasTypes'

/** Fábrica de linha de `scores_candidato` na projeção que as listas do RH leem. */
function linha(
  tipo: string,
  status: string,
  score: number | null = null
): ScoreCandidatoRow {
  return { tipo, status, score, score_max: score === null ? null : 100 }
}

const REDACAO_ENVIADA: RedacaoSinal[] = [{ id: 'red-1' }]

describe('estadoCultura — só a nota revisada por humano vira número (D-32)', () => {
  const TABELA_VERDADE: Array<{
    caso: string
    scores: ScoreCandidatoRow[] | null | undefined
    redacoes: RedacaoSinal[] | null | undefined
    esperado: EstadoCultura
  }> = [
    {
      caso: 'linha redacao/sucesso com 72 → nota 72',
      scores: [linha('redacao', 'sucesso', 72)],
      redacoes: REDACAO_ENVIADA,
      esperado: { estado: 'nota', valor: 72 },
    },
    {
      caso: 'redação existente SEM linha de sucesso → aguardando revisão',
      scores: [],
      redacoes: REDACAO_ENVIADA,
      esperado: { estado: 'aguardando_revisao' },
    },
    {
      caso: 'linha redacao com status pendente_humano → aguardando revisão (NUNCA a nota da IA)',
      scores: [linha('redacao', 'pendente_humano', 88)],
      redacoes: REDACAO_ENVIADA,
      esperado: { estado: 'aguardando_revisao' },
    },
    {
      caso: 'nada → não fez',
      scores: [],
      redacoes: [],
      esperado: { estado: 'nao_fez' },
    },
    {
      caso: 'ausência total (undefined nos dois) → não fez, nunca 0',
      scores: undefined,
      redacoes: undefined,
      esperado: { estado: 'nao_fez' },
    },
    {
      caso: 'só Big Five (score NULL por desenho) não é sinal de Cultura → não fez',
      scores: [linha('big_five', 'sucesso', null)],
      redacoes: [],
      esperado: { estado: 'nao_fez' },
    },
    {
      caso: 'linha pendente_humano SEM redacoes embutidas ainda conta como aguardando revisão',
      scores: [linha('redacao', 'pendente_humano', 60)],
      redacoes: [],
      esperado: { estado: 'aguardando_revisao' },
    },
    {
      caso: 'SJT com nota não vira Cultura → não fez',
      scores: [linha('sjt', 'sucesso', 91)],
      redacoes: [],
      esperado: { estado: 'nao_fez' },
    },
  ]

  it.each(TABELA_VERDADE)('$caso', ({ scores, redacoes, esperado }) => {
    expect(estadoCultura(scores, redacoes)).toEqual(esperado)
  })

  it('nenhum caso da tabela devolve 0 como nota de Cultura', () => {
    for (const { scores, redacoes } of TABELA_VERDADE) {
      const r = estadoCultura(scores, redacoes)
      if (r.estado === 'nota') expect(r.valor).not.toBe(0)
    }
  })
})
