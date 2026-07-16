/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-04 Task 1 (TDD RED) — the SLA classifier boundaries (KPI-03).
 *
 * `classifySla(etapa, dias)` is the pure engine behind the Fila SLA badge: it maps a
 * per-etapa day threshold (from `SLA_POR_ETAPA`) to one of three levels —
 *   within  → dias < threshold
 *   aging   → threshold <= dias <= 1.5 × threshold   (amber "Atenção")
 *   breach  → dias > 1.5 × threshold                 (red "Atrasado")
 * An etapa with NO configured threshold (e.g. `inscricao`, `aprovado`) NEVER crashes
 * and always resolves to `within`. This unit table nails every boundary so the badge
 * (a colorblind-safe text+number chip) can never mis-classify aging vs. breach.
 *
 * @see .planning/phases/34-.../34-UI-SPEC.md (§Surface 3 — SLA badge thresholds)
 */
import { describe, it, expect } from 'vitest'
import { SLA_POR_ETAPA, classifySla } from '../slaThresholds'

describe('SLA_POR_ETAPA — the 5 hardcoded per-etapa day thresholds (KPI-03)', () => {
  it('has the 5 working-etapa thresholds (triagem 3, avaliacao 5, entrevistas 4/4, decisao 3)', () => {
    expect(SLA_POR_ETAPA.triagem).toBe(3)
    expect(SLA_POR_ETAPA.avaliacao_assincrona).toBe(5)
    expect(SLA_POR_ETAPA.entrevista_online).toBe(4)
    expect(SLA_POR_ETAPA.entrevista_presencial).toBe(4)
    expect(SLA_POR_ETAPA.decisao_final).toBe(3)
  })

  it('does NOT threshold the non-working etapas (inscricao / terminals)', () => {
    expect(SLA_POR_ETAPA.inscricao).toBeUndefined()
    expect(SLA_POR_ETAPA.aprovado).toBeUndefined()
    expect(SLA_POR_ETAPA.rejeitado).toBeUndefined()
  })
})

describe('classifySla — within / aging / breach at each boundary', () => {
  // etapa, dias, expected — a table proving each boundary (threshold & 1.5× threshold).
  const cases: Array<[string, number, 'within' | 'aging' | 'breach']> = [
    // triagem: threshold 3, breach > 4.5
    ['triagem', 0, 'within'],
    ['triagem', 2, 'within'],
    ['triagem', 3, 'aging'], // == threshold → aging (inclusive lower bound)
    ['triagem', 4, 'aging'], // <= 1.5× (4.5)
    ['triagem', 5, 'breach'], // > 4.5
    // avaliacao_assincrona: threshold 5, breach > 7.5
    ['avaliacao_assincrona', 4, 'within'],
    ['avaliacao_assincrona', 5, 'aging'],
    ['avaliacao_assincrona', 7, 'aging'], // <= 7.5
    ['avaliacao_assincrona', 8, 'breach'], // > 7.5
    // entrevista_online: threshold 4, breach > 6
    ['entrevista_online', 3, 'within'],
    ['entrevista_online', 4, 'aging'],
    ['entrevista_online', 6, 'aging'], // == 1.5× (6) → still aging (inclusive upper bound)
    ['entrevista_online', 7, 'breach'], // > 6
    // entrevista_presencial: threshold 4
    ['entrevista_presencial', 4, 'aging'],
    ['entrevista_presencial', 7, 'breach'],
    // decisao_final: threshold 3
    ['decisao_final', 2, 'within'],
    ['decisao_final', 3, 'aging'],
    ['decisao_final', 5, 'breach'], // > 4.5
  ]

  it.each(cases)('classifySla(%s, %i) === %s', (etapa, dias, expected) => {
    expect(classifySla(etapa, dias)).toBe(expected)
  })

  it('an etapa with NO threshold (inscricao) always returns within — never crashes', () => {
    expect(classifySla('inscricao', 0)).toBe('within')
    expect(classifySla('inscricao', 100)).toBe('within')
  })

  it('a terminal / unknown etapa returns within (undefined-threshold guard)', () => {
    expect(classifySla('aprovado', 999)).toBe('within')
    expect(classifySla('rejeitado', 999)).toBe('within')
    expect(classifySla('etapa_que_nao_existe', 999)).toBe('within')
  })
})
