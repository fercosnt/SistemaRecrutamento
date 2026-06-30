/**
 * ENTREV-GUIA-DISPLAY-01 — guia EF-output ↔ RH-panel shape contract.
 *
 * THE integration-contract lesson again ([[feedback_integration_contract_gap]]): the
 * `gerar-guia-entrevista` EF persists `guia` under its `InterviewGuideSchema` OUTPUT
 * shape — `{ questions: [{ question, competency, bars_anchors, ... }], ... }` (English
 * keys) — but `GuiaEntrevistaPanel` reads `guia.perguntas[]` with `pergunta`/`dimensao`
 * (pt-BR). Nothing bridged the two, so the panel rendered "Nenhum guia gerado ainda."
 * for EVERY persisted guide, however it was created. The existing `entrevista-contract`
 * test only pins the REQUEST body; this pins the OUTPUT shape the panel consumes.
 *
 * The fixture mirrors the EXACT keys `_shared/interview-output-schemas.ts`
 * (InterviewQuestionSchema/InterviewGuideSchema) emits — kept in sync with the live
 * PROD row observed for candidatura a1dd4c42 (top keys: questions[].{type,question,
 * competency,rationale,bars_anchors,...}).
 *
 * @see src/features/entrevista/services/entrevistaService.ts (normalizeGuia — the bridge)
 * @see supabase/functions/_shared/interview-output-schemas.ts (the EF OUTPUT shape)
 * @see src/features/entrevista/components/GuiaEntrevistaPanel.tsx (perguntasOf reads guia.perguntas)
 */
import { describe, it, expect } from 'vitest'
import { normalizeGuia } from '../services/entrevistaService'

/** A guia exactly as the EF persists it (InterviewGuideSchema OUTPUT shape, English keys). */
function efPersistedGuia() {
  return {
    candidate_id: 'cand-1',
    job_title: 'TESTE Dentista — Funil E2E',
    duration_minutes: 45,
    format: 'online',
    introduction: 'Olá! Vamos começar a entrevista...',
    questions: [
      {
        type: 'star',
        competency: 'Triagem clínica',
        question: 'Descreva uma situação em que você avaliou rapidamente um paciente com dor.',
        rationale: 'Investiga a capacidade de triagem, essencial para a posição.',
        bars_anchors: [{ level: 'proficient', score: 4, description: 'Prioriza com critério claro.' }],
        follow_up_probes: ['Como priorizou?', 'O que mudaria hoje?'],
        red_flags: ['Não prioriza'],
        green_flags: ['Critério estruturado'],
      },
      {
        type: 'pei',
        competency: 'Comunicação',
        question: 'Conte sobre uma vez em que explicou um procedimento complexo a um paciente ansioso.',
        rationale: 'Avalia a clareza e empatia na comunicação.',
        bars_anchors: [{ level: 'developing', score: 3, description: 'Explica, mas com jargão.' }],
        follow_up_probes: ['Como reduziu a ansiedade?', 'O paciente entendeu?'],
        red_flags: [],
        green_flags: [],
      },
    ],
    closing: 'Obrigado! Tem alguma dúvida sobre a posição?',
    scoring_instructions: 'Registre os scores BARS após a entrevista.',
  }
}

describe('ENTREV-GUIA-DISPLAY-01 — normalizeGuia bridges the EF output shape to the RH panel', () => {
  it('maps questions[] → perguntas[] so GuiaEntrevistaPanel.perguntasOf finds them', () => {
    const normalized = normalizeGuia(efPersistedGuia() as never)
    const perguntas = (normalized as { perguntas?: unknown[] }).perguntas
    expect(Array.isArray(perguntas)).toBe(true)
    expect(perguntas).toHaveLength(2)
  })

  it('maps question→pergunta and competency→dimensao (the keys PerguntaRow renders)', () => {
    const normalized = normalizeGuia(efPersistedGuia() as never)
    const p0 = (normalized as { perguntas: Array<Record<string, unknown>> }).perguntas[0]
    expect(p0.pergunta).toBe('Descreva uma situação em que você avaliou rapidamente um paciente com dor.')
    expect(p0.dimensao).toBe('Triagem clínica')
  })

  it('is non-lossy — preserves the original EF keys via spread', () => {
    const normalized = normalizeGuia(efPersistedGuia() as never)
    const p0 = (normalized as { perguntas: Array<Record<string, unknown>> }).perguntas[0]
    expect(p0.question).toBe('Descreva uma situação em que você avaliou rapidamente um paciente com dor.')
    expect(p0.competency).toBe('Triagem clínica')
    expect((normalized as { job_title?: string }).job_title).toBe('TESTE Dentista — Funil E2E')
  })

  it('leaves an already pt-BR guia untouched (defensive — future EF emitting perguntas)', () => {
    const ptbr = { perguntas: [{ pergunta: 'Já em pt-BR', dimensao: 'X' }] }
    const normalized = normalizeGuia(ptbr as never)
    expect((normalized as { perguntas: unknown[] }).perguntas).toHaveLength(1)
  })

  it('returns an incompleto/empty guia unchanged (no questions → panel shows empty-state)', () => {
    const incompleto = { incompleto: true, flags: ['ia_sem_resultado'] }
    const normalized = normalizeGuia(incompleto as never)
    expect((normalized as { perguntas?: unknown }).perguntas).toBeUndefined()
  })

  it('handles null guia without throwing', () => {
    expect(normalizeGuia(null)).toBeNull()
  })
})

describe('ENTREV-08 — normalizeGuia is origem-aware (provenance survives the read)', () => {
  it('defaults a missing/legacy origem → "ia" (legacy guides are wholly AI-generated, A2)', () => {
    // The EF-persisted fixture has NO origem on its questions (pre-edit, legacy).
    const normalized = normalizeGuia(efPersistedGuia() as never)
    const perguntas = (normalized as { perguntas: Array<Record<string, unknown>> }).perguntas
    expect(perguntas).toHaveLength(2)
    expect(perguntas[0].origem).toBe('ia')
    expect(perguntas[1].origem).toBe('ia')
  })

  it('preserves an explicit origem:"manual" on a question (RH-added)', () => {
    const withManual = {
      ...efPersistedGuia(),
      questions: [
        { ...efPersistedGuia().questions[0], origem: 'manual' },
        efPersistedGuia().questions[1],
      ],
    }
    const normalized = normalizeGuia(withManual as never)
    const perguntas = (normalized as { perguntas: Array<Record<string, unknown>> }).perguntas
    expect(perguntas[0].origem).toBe('manual')
    expect(perguntas[1].origem).toBe('ia')
  })

  it('coerces any non-"manual" origem value → "ia" (defensive)', () => {
    const garbled = {
      ...efPersistedGuia(),
      questions: [{ ...efPersistedGuia().questions[0], origem: 'whatever' }],
    }
    const normalized = normalizeGuia(garbled as never)
    const perguntas = (normalized as { perguntas: Array<Record<string, unknown>> }).perguntas
    expect(perguntas[0].origem).toBe('ia')
  })

  it('leaves an already pt-BR guia with origem untouched (passthrough branch)', () => {
    const ptbr = {
      perguntas: [
        { pergunta: 'Já em pt-BR', dimensao: 'X', origem: 'manual' },
        { pergunta: 'Outra', dimensao: 'Y', origem: 'ia' },
      ],
    }
    const normalized = normalizeGuia(ptbr as never)
    const perguntas = (normalized as { perguntas: Array<Record<string, unknown>> }).perguntas
    expect(perguntas).toHaveLength(2)
    expect(perguntas[0].origem).toBe('manual')
    expect(perguntas[1].origem).toBe('ia')
  })
})

describe('CR-01 — normalizeGuia survives a regen-merge with a manual pt-BR row under questions[]', () => {
  /**
   * The post-regen persisted shape: the EF merge writes `mergedQuestions = [...manualQs,
   * ...freshIaQs]` under the English `questions` key. A manual row written by the RPC
   * carries the pt-BR keys (`pergunta`/`dimensao`, NO `question`/`competency`); an IA row
   * carries English keys. So `questions[]` is HETEROGENEOUS. normalizeGuia must read both
   * shapes per element — the manual row's text must NOT normalize to '' (CR-01 data loss).
   */
  function mergedGuiaAfterRegen() {
    return {
      job_title: 'TESTE Dentista — Funil E2E',
      format: 'online',
      questions: [
        // Preserved MANUAL row — pt-BR keys only (as the RPC wrote it, then EF merge
        // concatenated it verbatim into the English-keyed questions[]).
        {
          pergunta: 'Como você lida com um paciente irritado na recepção?',
          dimensao: 'Resiliência',
          origem: 'manual',
        },
        // Fresh IA row — English keys (as the EF emits).
        {
          type: 'star',
          question: 'Descreva uma situação de triagem clínica sob pressão.',
          competency: 'Triagem clínica',
          origem: 'ia',
        },
      ],
    }
  }

  it('keeps the manual row pergunta text non-empty (no silent blanking on regen)', () => {
    const normalized = normalizeGuia(mergedGuiaAfterRegen() as never)
    const perguntas = (normalized as { perguntas: Array<Record<string, unknown>> }).perguntas
    expect(perguntas).toHaveLength(2)
    expect(perguntas[0].pergunta).toBe('Como você lida com um paciente irritado na recepção?')
    expect(perguntas[0].pergunta).not.toBe('')
  })

  it('carries the manual row origem="manual" and its dimensao through the merge (WR-02)', () => {
    const normalized = normalizeGuia(mergedGuiaAfterRegen() as never)
    const perguntas = (normalized as { perguntas: Array<Record<string, unknown>> }).perguntas
    expect(perguntas[0].origem).toBe('manual')
    expect(perguntas[0].dimensao).toBe('Resiliência')
  })

  it('still maps the fresh IA row English keys → pt-BR (question→pergunta, competency→dimensao)', () => {
    const normalized = normalizeGuia(mergedGuiaAfterRegen() as never)
    const perguntas = (normalized as { perguntas: Array<Record<string, unknown>> }).perguntas
    expect(perguntas[1].pergunta).toBe('Descreva uma situação de triagem clínica sob pressão.')
    expect(perguntas[1].dimensao).toBe('Triagem clínica')
    expect(perguntas[1].origem).toBe('ia')
  })
})
