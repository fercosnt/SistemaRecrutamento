/**
 * Phase 42 / Plano 42-03 Task 1 (TDD RED) — o classificador de faixa do badge de
 * acompanhamento da fila de revisão (REVISAO-02).
 *
 * `classifyRevisaoSla(dias, cfg)` é o motor puro por trás do `RevisaoSlaBadge`: mapeia
 * uma contagem de dias em espera contra os limiares que vêm da **tabela de configuração
 * do servidor** (D-P42-02 — alteráveis sem deploy, nunca constante compilada) para uma
 * de quatro faixas:
 *   em_dia     → dias < diasAtencao                 (verde  "Em dia · {n}d")
 *   atencao    → diasAtencao <= dias < diasAtraso   (âmbar  "Atenção · {n}d")
 *   atrasado   → dias >= diasAtraso                 (vermelho "Atrasado · {n}d")
 *   degenerado → config ausente/ilegível            (sem badge, só a contagem)
 *
 * INVARIANTE DE TOTALIDADE (a regra `classifySla` da Phase 34, endurecida): como o
 * limiar vem de uma linha de configuração que um humano pode apagar ou preencher
 * errado, o classificador é **total** — config ausente, limiar não-positivo, ordem
 * invertida ou contagem não finita resolvem para `degenerado`. **Nunca lança**, nunca
 * devolve célula vazia. Esta tabela de casos prende cada uma dessas nove entradas
 * degeneradas, mais as seis fronteiras das três faixas nominais.
 *
 * @see src/features/funil/constants/slaThresholds.ts (o molde: classifySla + diasNaEtapa)
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Faixas do badge de SLA)
 */
import { describe, it, expect } from 'vitest'
import {
  classifyRevisaoSla,
  diasEmEspera,
  ROTULOS_FAIXA_SLA_REVISAO,
  type FaixaSlaRevisao,
  type LimiaresSlaRevisao,
} from '../slaRevisao'

/** A configuração nominal usada nas fronteiras: atenção em 3 dias, atraso em 7. */
const CFG: LimiaresSlaRevisao = { diasAtencao: 3, diasAtraso: 7 }

describe('classifyRevisaoSla — as 3 faixas nominais e suas fronteiras', () => {
  const cases: Array<[number, FaixaSlaRevisao]> = [
    // verde — abaixo do limiar de atenção
    [0, 'em_dia'],
    [2, 'em_dia'],
    // âmbar — fronteira INCLUSIVA inferior em diasAtencao, exclusiva em diasAtraso
    [3, 'atencao'],
    [6, 'atencao'],
    // vermelho — fronteira INCLUSIVA em diasAtraso
    [7, 'atrasado'],
    [99, 'atrasado'],
  ]

  it.each(cases)('classifyRevisaoSla(%i, {3,7}) === %s', (dias, esperado) => {
    expect(classifyRevisaoSla(dias, CFG)).toBe(esperado)
  })
})

describe('classifyRevisaoSla — totalidade: toda entrada degenerada vira faixa degenerada', () => {
  it('config AUSENTE (undefined) resolve para degenerado', () => {
    expect(classifyRevisaoSla(5, undefined)).toBe('degenerado')
  })

  it('config NULA (null) resolve para degenerado', () => {
    expect(classifyRevisaoSla(5, null)).toBe('degenerado')
  })

  it('limiar de atenção não-positivo (0) resolve para degenerado', () => {
    expect(classifyRevisaoSla(5, { diasAtencao: 0, diasAtraso: 7 })).toBe('degenerado')
  })

  it('limiar de atraso negativo (-1) resolve para degenerado', () => {
    expect(classifyRevisaoSla(5, { diasAtencao: 3, diasAtraso: -1 })).toBe('degenerado')
  })

  it('ordem INVERTIDA (atraso 3 < atencao 7) resolve para degenerado', () => {
    expect(classifyRevisaoSla(5, { diasAtencao: 7, diasAtraso: 3 })).toBe('degenerado')
  })

  it('limiares IGUAIS (3 e 3) resolvem para degenerado — a faixa âmbar seria vazia', () => {
    expect(classifyRevisaoSla(5, { diasAtencao: 3, diasAtraso: 3 })).toBe('degenerado')
  })

  it('contagem de dias NaN resolve para degenerado', () => {
    expect(classifyRevisaoSla(NaN, CFG)).toBe('degenerado')
  })

  it('limiar não finito (NaN / Infinity) resolve para degenerado', () => {
    expect(classifyRevisaoSla(5, { diasAtencao: NaN, diasAtraso: 7 })).toBe('degenerado')
    expect(classifyRevisaoSla(5, { diasAtencao: 3, diasAtraso: Infinity })).toBe('degenerado')
  })

  // T-42-12 — a prova de que o classificador é TOTAL: nenhuma das entradas
  // degenerativas acima pode lançar. Um throw aqui derrubaria a fila inteira do RH
  // por causa de uma linha de configuração mal preenchida.
  it('NUNCA lança para nenhuma das entradas degeneradas (classificador total)', () => {
    const entradas: Array<[number, LimiaresSlaRevisao | null | undefined]> = [
      [5, undefined],
      [5, null],
      [5, { diasAtencao: 0, diasAtraso: 7 }],
      [5, { diasAtencao: 3, diasAtraso: -1 }],
      [5, { diasAtencao: 7, diasAtraso: 3 }],
      [5, { diasAtencao: 3, diasAtraso: 3 }],
      [NaN, CFG],
      [5, { diasAtencao: NaN, diasAtraso: 7 }],
      [5, { diasAtencao: 3, diasAtraso: Infinity }],
    ]
    for (const [dias, cfg] of entradas) {
      expect(() => classifyRevisaoSla(dias, cfg)).not.toThrow()
      // e sempre devolve uma das quatro faixas — nunca undefined, nunca célula vazia
      expect(['em_dia', 'atencao', 'atrasado', 'degenerado']).toContain(
        classifyRevisaoSla(dias, cfg),
      )
    }
  })
})

describe('diasEmEspera — dias corridos inteiros, clampados em 0', () => {
  /** Âncora fixa para determinismo: 2026-07-29T12:00:00Z. */
  const AGORA = new Date('2026-07-29T12:00:00.000Z')

  it('ontem → 1', () => {
    expect(diasEmEspera('2026-07-28T12:00:00.000Z', AGORA)).toBe(1)
  })

  it('hoje → 0', () => {
    expect(diasEmEspera('2026-07-29T09:00:00.000Z', AGORA)).toBe(0)
  })

  it('dez dias atrás → 10', () => {
    expect(diasEmEspera('2026-07-19T12:00:00.000Z', AGORA)).toBe(10)
  })

  // Desvio de relógio: um timestamp no futuro jamais pode virar "-1d" na tela.
  it('amanhã (desvio de relógio) → 0, nunca negativo', () => {
    expect(diasEmEspera('2026-07-30T12:00:00.000Z', AGORA)).toBe(0)
  })

  it('data INVÁLIDA → 0 (nunca NaN na tela, nunca lança)', () => {
    expect(diasEmEspera('nao-e-data', AGORA)).toBe(0)
    expect(() => diasEmEspera('nao-e-data', AGORA)).not.toThrow()
  })

  it('string vazia → 0', () => {
    expect(diasEmEspera('', AGORA)).toBe(0)
  })

  it('usa `new Date()` como `now` por padrão (ontem real → 1)', () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(diasEmEspera(ontem)).toBe(1)
  })
})

describe('ROTULOS_FAIXA_SLA_REVISAO — os prefixos textuais do badge (colorblind-safe)', () => {
  it('carrega rótulo textual para as 3 faixas nominais', () => {
    expect(ROTULOS_FAIXA_SLA_REVISAO.em_dia).toBe('Em dia')
    expect(ROTULOS_FAIXA_SLA_REVISAO.atencao).toBe('Atenção')
    expect(ROTULOS_FAIXA_SLA_REVISAO.atrasado).toBe('Atrasado')
  })

  it('a faixa degenerada NÃO tem rótulo — mostra só a contagem, sem badge', () => {
    expect(ROTULOS_FAIXA_SLA_REVISAO.degenerado).toBe('')
  })
})
