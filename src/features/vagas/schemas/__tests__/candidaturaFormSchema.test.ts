/**
 * Phase 4 / Plan 04-04 — candidaturaFormSchema Vitest coverage.
 *
 * Activates Wave 0 stubs from Plan 04-01 Task 6.
 *
 * Coverage:
 *   - zodForType: 9 cases covering all 5 tipo_resposta_pergunta branches
 *     (texto_curto ×2, texto_longo ×1, numerico ×2, single_choice ×2,
 *     multiple_choice ×2)
 *   - buildCandidaturaSchema: 4 cases (empty list D-14, mixed perguntas,
 *     missing required pergunta, 5MB cap at schema layer)
 *
 * Total: 13 active it() blocks (target plano: ≥13).
 *
 * @see .planning/phases/04-vagas-candidatura/04-RESEARCH.md L1766
 * @see .planning/phases/04-vagas-candidatura/04-PATTERNS.md L270-304
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { zodForType, buildCandidaturaSchema } from '../candidaturaFormSchema'
import type { PerguntaFormulario } from '../candidaturaFormSchema'
// Phase 7 / D-13 regression — neutral normalizer (Plan 03 creates it here, NOT
// inside config-vaga, to avoid a vagas→config-vaga cross-feature edge per
// CLAUDE.md). RED until Plan 03 lands the module (module-not-found by design).
import { opcoesToStrings } from '@/lib/opcoes/opcoesNormalize'

// ============================================
// Fixture helper — minimal pergunta with realistic DB column shape
// ============================================
//
// Cast `as PerguntaFormulario` follows the discipline from PATTERNS L304
// (mirrors cadastroService.test.ts:72-80 `as unknown as CandidatoFormData`).
// Field names match database.types.ts perguntas_formulario.Row exactly:
//   texto_pergunta (NOT pergunta), bloco: string (NOT nullable),
//   plus created_by/updated_by/timestamps.
const buildPergunta = (
  overrides: Partial<PerguntaFormulario>
): PerguntaFormulario =>
  ({
    id: 'pergunta-uuid',
    vaga_id: 'vaga-uuid',
    tipo_resposta: 'texto_curto',
    texto_pergunta: 'Pergunta de teste',
    obrigatoria: false,
    ordem: 1,
    bloco: 'Geral',
    texto_ajuda: null,
    limite_caracteres: null,
    opcoes_resposta: null,
    permite_outros: false,
    valor_minimo: null,
    valor_maximo: null,
    deleted_at: null,
    created_at: '2026-04-25T00:00:00Z',
    updated_at: '2026-04-25T00:00:00Z',
    created_by: null,
    updated_by: null,
    ...overrides,
  }) as PerguntaFormulario

describe('zodForType (Plan 04-04)', () => {
  it('T1.1: texto_curto obrigatoria empty fails with "Resposta obrigatória"', () => {
    const schema = zodForType(
      buildPergunta({ tipo_resposta: 'texto_curto', obrigatoria: true })
    )
    const result = schema.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Resposta obrigatória')
    }
  })

  it('T1.2: texto_curto with limite_caracteres enforces max', () => {
    const schema = zodForType(
      buildPergunta({
        tipo_resposta: 'texto_curto',
        obrigatoria: true,
        limite_caracteres: 10,
      })
    )
    const result = schema.safeParse('1234567890123')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Máximo 10 caracteres')
    }
  })

  it('T1.3: texto_longo enforces max via limite_caracteres', () => {
    const schema = zodForType(
      buildPergunta({
        tipo_resposta: 'texto_longo',
        obrigatoria: false,
        limite_caracteres: 5,
      })
    )
    const result = schema.safeParse('123456')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Máximo 5 caracteres')
    }
  })

  it('T1.4: numerico with valor_minimo/maximo bounds', () => {
    const schema = zodForType(
      buildPergunta({
        tipo_resposta: 'numerico',
        obrigatoria: true,
        valor_minimo: 5,
        valor_maximo: 10,
      })
    )
    expect(schema.safeParse(7).success).toBe(true)
    expect(schema.safeParse(4).success).toBe(false)
    expect(schema.safeParse(11).success).toBe(false)
  })

  it('T1.5: numerico optional when not obrigatoria (accepts undefined and null)', () => {
    const schema = zodForType(
      buildPergunta({ tipo_resposta: 'numerico', obrigatoria: false })
    )
    expect(schema.safeParse(undefined).success).toBe(true)
    expect(schema.safeParse(null).success).toBe(true)
    expect(schema.safeParse(42).success).toBe(true)
  })

  it('T1.6: single_choice from opcoes_resposta via z.enum (rejects unknown)', () => {
    const schema = zodForType(
      buildPergunta({
        tipo_resposta: 'single_choice',
        obrigatoria: true,
        opcoes_resposta: ['Sim', 'Não', 'Talvez'],
      })
    )
    expect(schema.safeParse('Sim').success).toBe(true)
    expect(schema.safeParse('Outro').success).toBe(false)
  })

  it('T1.7: single_choice with permite_outros relaxes to z.string', () => {
    const schema = zodForType(
      buildPergunta({
        tipo_resposta: 'single_choice',
        obrigatoria: true,
        opcoes_resposta: ['Sim', 'Não'],
        permite_outros: true,
      })
    )
    // "Outro qualquer" não está em opcoes_resposta, mas permite_outros
    // relaxa o validator para z.string().min(1) — passa.
    expect(schema.safeParse('Outro qualquer').success).toBe(true)
  })

  it('T1.8: multiple_choice obrigatoria min 1 fails on empty array', () => {
    const schema = zodForType(
      buildPergunta({
        tipo_resposta: 'multiple_choice',
        obrigatoria: true,
        opcoes_resposta: ['A', 'B', 'C'],
      })
    )
    const result = schema.safeParse([])
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Selecione pelo menos uma opção'
      )
    }
  })

  it('T1.9: multiple_choice empty array allowed when not obrigatoria', () => {
    const schema = zodForType(
      buildPergunta({
        tipo_resposta: 'multiple_choice',
        obrigatoria: false,
        opcoes_resposta: ['A', 'B'],
      })
    )
    expect(schema.safeParse([]).success).toBe(true)
  })
})

describe('buildCandidaturaSchema (Plan 04-04)', () => {
  it('T2.1: empty perguntas list accepts valid curriculo (D-14)', () => {
    // D-14: vaga sem perguntas configuradas → schema valida APENAS currículo;
    // respostas é z.object({}) (vazio), aceita {} como input.
    // F-04-08-F (carryover-c): curriculo is now optional in the schema.
    // Presence gating moved to FormularioCandidaturaPage (submitDisabled +
    // onSubmit early return) + EF server-side validation. See T2.5 for the
    // optional-curriculo regression guard.
    const schema = buildCandidaturaSchema([])
    const okResult = schema.safeParse({
      curriculo: { path: 'auth-uid/uuid.pdf', name: 'cv.pdf', size: 1024 },
      respostas: {},
    })
    expect(okResult.success).toBe(true)
  })

  it('T2.2: mixed perguntas validates real input', () => {
    const perguntas = [
      buildPergunta({
        id: 'p1',
        tipo_resposta: 'texto_curto',
        obrigatoria: true,
      }),
      buildPergunta({
        id: 'p2',
        tipo_resposta: 'numerico',
        obrigatoria: false,
        valor_minimo: 0,
        valor_maximo: 100,
      }),
    ]
    const schema = buildCandidaturaSchema(perguntas)
    const result = schema.safeParse({
      curriculo: { path: 'auth-uid/uuid.pdf', name: 'cv.pdf', size: 1024 },
      respostas: { p1: 'Resposta válida', p2: 50 },
    })
    expect(result.success).toBe(true)
  })

  it('T2.3: rejects respostas missing required pergunta value', () => {
    const perguntas = [
      buildPergunta({
        id: 'p1',
        tipo_resposta: 'texto_curto',
        obrigatoria: true,
      }),
    ]
    const schema = buildCandidaturaSchema(perguntas)
    const result = schema.safeParse({
      curriculo: { path: 'auth-uid/uuid.pdf', name: 'cv.pdf', size: 1024 },
      respostas: { p1: '' },
    })
    expect(result.success).toBe(false)
  })

  it('T2.4: rejects curriculo size > 5MB at schema layer', () => {
    const schema = buildCandidaturaSchema([])
    const result = schema.safeParse({
      curriculo: {
        path: 'auth-uid/uuid.pdf',
        name: 'cv.pdf',
        size: 5_242_881, // 1 byte over 5MB cap
      },
      respostas: {},
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes('5 MB'))
      ).toBe(true)
    }
  })

  // ============================================
  // F-04-08-F regression guards — curriculo .optional() alignment
  // with Plan 04-07's just-in-time upload pattern (D-09)
  // ============================================
  it('T2.5: curriculo undefined passes when respostas are valid (F-04-08-F)', () => {
    // F-04-08-F: schema must NOT block submission when curriculo is missing
    // — the FormularioCandidaturaPage uploads cvFile just-in-time inside
    // onSubmit, so Zod validation runs with curriculo=undefined and must
    // pass. Presence gating lives in the component (submitDisabled +
    // onSubmit early return), not in the schema.
    const perguntas = [
      buildPergunta({
        id: 'p1',
        tipo_resposta: 'texto_curto',
        obrigatoria: true,
      }),
    ]
    const schema = buildCandidaturaSchema(perguntas)
    const result = schema.safeParse({
      curriculo: undefined,
      respostas: { p1: 'Resposta válida' },
    })
    expect(result.success).toBe(true)
  })

  it('T2.6: curriculo with full {path, name, size} still passes (regression)', () => {
    // Regression guard — making curriculo optional must NOT reject valid
    // populated curriculos.
    const schema = buildCandidaturaSchema([])
    const result = schema.safeParse({
      curriculo: {
        path: 'auth-uid/abc-123.pdf',
        name: 'curriculo.pdf',
        size: 102_400,
      },
      respostas: {},
    })
    expect(result.success).toBe(true)
  })

  it('T2.7: curriculo with empty path still fails when present', () => {
    // Shape integrity — when curriculo IS present, its inner fields must
    // still validate. Empty path means a malformed object slipped past the
    // page-layer guards; schema is the last sanity check before submit.
    const schema = buildCandidaturaSchema([])
    const result = schema.safeParse({
      curriculo: { path: '', name: 'cv.pdf', size: 100 },
      respostas: {},
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes('Currículo obrigatório'))
      ).toBe(true)
    }
  })
})

// ============================================
// Phase 7 / D-13 regression (Pitfall 1) — Wave 0 RED
// ============================================
//
// D-10 migrates `opcoes_resposta` jsonb from a flat `string[]` to the object
// shape `[{id, texto}]` and gives each option a stable `opcao_id`. The shipped
// Phase-4 candidato form reads the OLD shape (`opcoes_resposta as string[]` →
// `z.enum(opts)` at candidaturaFormSchema.ts:66,80). This regression guards
// that the candidato form still builds the CORRECT `z.enum` of option STRINGS
// after the shape change, by normalizing through the neutral
// `@/lib/opcoes/opcoesNormalize` helper (Plan 03 creates it). The case is RED
// until Plan 03 lands the normalizer — the module-not-found IS the assertion
// that the D-13 migration's shipped-reader bridge does not yet exist.
//
// These NEW cases do NOT touch the existing zodForType / buildCandidaturaSchema
// suites above (no deletions).
describe('D-13 regression — opcoesToStrings bridges [{id,texto}] → z.enum (Plan 07-01, Wave 0 RED)', () => {
  it('T3.1: NEW [{id,texto}] object shape normalizes to a string z.enum (accepts a valid option, rejects unknown)', () => {
    // The breaking input D-10 introduces: objects, not strings.
    const opcoesObjectShape = [
      { id: 'o1', texto: 'Imediata' },
      { id: 'o2', texto: 'Em até 15 dias' },
      { id: 'o3', texto: 'Em até 30 dias' },
    ]
    const strings = opcoesToStrings(opcoesObjectShape)
    // The candidato form's z.enum must be built from the option STRINGS.
    const enumSchema = z.enum(strings as [string, ...string[]])
    expect(enumSchema.safeParse('Imediata').success).toBe(true)
    expect(enumSchema.safeParse('Em até 15 dias').success).toBe(true)
    // A value not among the option texts is rejected (the form still validates).
    expect(enumSchema.safeParse('Inexistente').success).toBe(false)
  })

  it('T3.2: legacy string[] shape still normalizes idempotently (no double-wrap)', () => {
    // The normalizer must accept BOTH shapes — legacy string[] passes through.
    const legacy = ['Imediata', 'Em até 15 dias']
    const strings = opcoesToStrings(legacy)
    expect(strings).toEqual(['Imediata', 'Em até 15 dias'])
    const enumSchema = z.enum(strings as [string, ...string[]])
    expect(enumSchema.safeParse('Imediata').success).toBe(true)
    expect(enumSchema.safeParse('Outro').success).toBe(false)
  })
})
