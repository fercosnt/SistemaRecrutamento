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

// ============================================================================
// Phase 8 / Plan 08-01 Task 2 — INSCR-02 / D-09 qualification gate (Wave 0 RED)
// ============================================================================
//
// INSCR-02 / D-09: the publish gate also bounds the Etapa-1 qualification block:
//   (4) > 10 perguntas in the qualification block  → reject
//   (5) > 1 open-ended (resposta_texto) pergunta   → reject
// The current `publishGate` has no such check (and `PublishGateInput` has no
// `qualificacao` field), so a publish carrying an oversized / multi-open-ended
// qualification block returns NO failure today. These assertions are RED until
// Plan 08-03 extends the gate.
//
// The `qualificacao` block is attached to the input via an augmented shape so
// the file stays TS-strict-clean (the production `PublishGateInput` does not yet
// model it — the Phase-7 Wave-0 RED idiom).

interface QualificacaoPerguntaInput {
  texto_pergunta: string
  tipo_resposta: 'single_choice' | 'multiple_choice' | 'resposta_texto'
}

const withQualificacao = (
  perguntas: QualificacaoPerguntaInput[],
): PublishGateInput => {
  const base = validInput() as PublishGateInput & {
    qualificacao?: QualificacaoPerguntaInput[]
  }
  base.qualificacao = perguntas
  return base
}

const choicePergunta = (n: number): QualificacaoPerguntaInput => ({
  texto_pergunta: `Pergunta de qualificação ${n}`,
  tipo_resposta: 'single_choice',
})

const openEndedPergunta = (n: number): QualificacaoPerguntaInput => ({
  texto_pergunta: `Pergunta dissertativa ${n}`,
  tipo_resposta: 'resposta_texto',
})

describe('publishGate qualification block (Plan 08-01 — INSCR-02 / D-09, Wave 0 RED)', () => {
  // RED until Plan 08-03 extends the gate.
  it('Q1: flags a qualification block with MORE THAN 10 perguntas', () => {
    const input = withQualificacao(
      Array.from({ length: 11 }, (_, i) => choicePergunta(i)),
    )
    const failures = publishGate(input)
    expect(failures.length).toBeGreaterThan(0)
  })

  // RED until Plan 08-03 extends the gate.
  it('Q2: flags a qualification block with MORE THAN 1 open-ended pergunta', () => {
    const input = withQualificacao([
      choicePergunta(0),
      openEndedPergunta(1),
      openEndedPergunta(2),
    ])
    const failures = publishGate(input)
    expect(failures.length).toBeGreaterThan(0)
  })

  // GREEN both before AND after Plan 03 — a compliant block (≤10 perguntas,
  // ≤1 open-ended) introduces NO new failure from the qualification check.
  it('Q3: a compliant qualification block (≤10 perguntas, ≤1 open-ended) adds no failure', () => {
    const input = withQualificacao([
      choicePergunta(0),
      choicePergunta(1),
      openEndedPergunta(2),
    ])
    const failures = publishGate(input)
    // The baseline validInput() passes the original 3 D-12 conditions, so a
    // compliant qualification block must leave failures empty.
    expect(failures).toEqual([])
  })
})
