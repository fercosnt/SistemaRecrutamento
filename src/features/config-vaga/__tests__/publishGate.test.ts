/**
 * Phase 7 / Plan 07-01 Task 1 — Wave 0 RED scaffold for the publish gate (D-12).
 *
 * Imports the PLANNED (not-yet-existing) pure fn from
 * `@/features/config-vaga/publishGate`. Compiles under TS strict but is
 * EXPECTED to FAIL at runtime (module-not-found) until Plan 03/04 lands the
 * function. Do NOT stub the module to make this green.
 *
 * The publish gate (rascunho→ativa) flags ALL THREE D-12 conditions:
 *   (1) pesos_avaliacao does NOT sum to 100
 *   (2) zero testes_aplicaveis with obrigatorio=true
 *   (3) a pergunta carrying a knockout-tagged option is NOT obrigatoria
 * and returns NO failures when all three pass. Rascunho never validates.
 *
 * Mirrors the pure-fn test idiom of src/features/vagas/utils/__tests__/isUuid.test.ts.
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-12)
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-RESEARCH.md §Architecture Pattern 3
 */
import { describe, it, expect } from 'vitest'
import {
  publishGate,
  type PublishGateInput,
} from '@/features/config-vaga/publishGate'

// A baseline that PASSES all three conditions — each negative case mutates
// exactly one field so the failing condition is isolated.
const validInput = (): PublishGateInput => ({
  pesos_avaliacao: {
    triagem: 30,
    work_sample_sjt: 30,
    redacao_cultural: 15,
    entrevista: 25,
  },
  testes_aplicaveis: [
    { teste: 'triagem', obrigatorio: true, customizado: false },
    { teste: 'entrevista', obrigatorio: false, customizado: false },
  ],
  perguntas: [
    {
      id: 'p1',
      texto_pergunta: 'Pergunta com knockout',
      obrigatoria: true,
      opcoes: [
        { opcao_id: 'o1', texto: 'Sim', tag: 'knockout' },
        { opcao_id: 'o2', texto: 'Não', tag: 'neutro' },
      ],
    },
  ],
})

describe('publishGate (Plan 07-01 — D-12, Wave 0 RED)', () => {
  it('T1: NO failures when all three conditions pass', () => {
    expect(publishGate(validInput())).toEqual([])
  })

  it('T2: condition 1 — flags when pesos do not sum to 100', () => {
    const input = validInput()
    input.pesos_avaliacao.entrevista = 20 // sum = 95
    const failures = publishGate(input)
    expect(failures.length).toBeGreaterThan(0)
  })

  it('T3: condition 2 — flags when no test has obrigatorio=true', () => {
    const input = validInput()
    input.testes_aplicaveis = [
      { teste: 'triagem', obrigatorio: false, customizado: false },
      { teste: 'entrevista', obrigatorio: false, customizado: false },
    ]
    const failures = publishGate(input)
    expect(failures.length).toBeGreaterThan(0)
  })

  it('T4: condition 3 — flags a knockout pergunta that is NOT obrigatoria', () => {
    const input = validInput()
    input.perguntas[0].obrigatoria = false // knockout option but pergunta optional
    const failures = publishGate(input)
    expect(failures.length).toBeGreaterThan(0)
  })

  it('T5: flags ALL THREE conditions simultaneously', () => {
    const input = validInput()
    input.pesos_avaliacao.entrevista = 20 // condition 1
    input.testes_aplicaveis = [
      { teste: 'triagem', obrigatorio: false, customizado: false },
    ] // condition 2
    input.perguntas[0].obrigatoria = false // condition 3
    const failures = publishGate(input)
    expect(failures.length).toBeGreaterThanOrEqual(3)
  })
})
