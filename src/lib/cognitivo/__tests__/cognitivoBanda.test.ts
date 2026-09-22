/**
 * Tabela-verdade de `cognitivoBanda` (49-04 Task 2 / D-64).
 *
 * Forma herdada de `src/lib/candidatura/__tests__/candidaturaEncerrada.test.ts`: a tabela
 * como DADO + `it.each`, porque os limites são PROVISÓRIOS (a norma real do instrumento
 * ficou diferida para o M5) e vão ser revisitados — quando forem, a mudança tem de
 * aparecer em uma tabela legível, não espalhada por `if`s de dois componentes.
 *
 * Os limites travados aqui (70 e 40) são exatamente os que a função privada do
 * `ScoreCard.tsx` usava desde a Phase 23. A extração foi um MOVE.
 *
 * @see src/lib/cognitivo/cognitivoBanda.ts
 */
import { describe, it, expect } from 'vitest'
import { cognitivoBanda, type CognitivoBanda } from '../cognitivoBanda'

describe('cognitivoBanda — faixa, nunca o dígito (UX-07 / D-33 / D-64)', () => {
  const TABELA_VERDADE: Array<{ percentil: number; esperado: CognitivoBanda }> = [
    // Acima: limite inferior é 70, inclusive.
    { percentil: 100, esperado: 'Acima do esperado' },
    { percentil: 85, esperado: 'Acima do esperado' },
    { percentil: 70, esperado: 'Acima do esperado' },
    // Dentro: [40, 70).
    { percentil: 69, esperado: 'Dentro do esperado' },
    { percentil: 55, esperado: 'Dentro do esperado' },
    { percentil: 40, esperado: 'Dentro do esperado' },
    // Abaixo: < 40.
    { percentil: 39, esperado: 'Abaixo do esperado' },
    { percentil: 20, esperado: 'Abaixo do esperado' },
    { percentil: 12, esperado: 'Abaixo do esperado' },
    { percentil: 0, esperado: 'Abaixo do esperado' },
  ]

  it.each(TABELA_VERDADE)(
    'percentil $percentil → $esperado',
    ({ percentil, esperado }) => {
      expect(cognitivoBanda(percentil)).toBe(esperado)
    }
  )

  it('nenhuma saída contém dígito — é a regra, não um detalhe de redação', () => {
    for (const { percentil } of TABELA_VERDADE) {
      expect(cognitivoBanda(percentil)).not.toMatch(/\d/)
    }
  })

  it('os limites 70 e 40 são fronteiras, não aproximações', () => {
    expect(cognitivoBanda(70)).not.toBe(cognitivoBanda(69))
    expect(cognitivoBanda(40)).not.toBe(cognitivoBanda(39))
  })
})
