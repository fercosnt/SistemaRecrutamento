/**
 * Phase 14 / Plan 14-01 Task 1 — Wave 0 client↔EF contract test
 * (ENTREV-01/03 / Pitfall 5 — [[feedback_integration_contract_gap]]).
 *
 * THE integration-contract lesson (the Phase-11 SJT C1/C2 lesson): the body the
 * RH/candidate client builds for the new interview/cognitive EFs MUST parse in
 * each EF's Zod body schema, and the body MUST carry only identifiers + raw text
 * — NEVER a score/band (anti-tamper, RNF-07a). We pin that contract as executable
 * assertions co-located with the EF body schema files (smoke-runtime gate).
 *
 * ── Why a Node-local Zod replica + a source-text probe (not a live import) ──
 * The EF body schemas live in `_shared` files that import `npm:zod@3.25.76` (a Deno
 * specifier). Vitest runs under Node/Vite and has NO resolver for the `npm:`
 * specifier, so a direct `import` fails at MODULE-RESOLUTION time. The faithful
 * contract (exact precedent: src/features/avaliacao/__tests__/redacao-contract.test.ts)
 * is two parts:
 *   1. Node-local Zod replicas of the EXACT shape each EF body schema must have. The
 *      runtime parse assertions document the contract — the valid client body parses;
 *      an injected `score`/`banda` is rejected (.strict()).
 *   2. `node:fs` source-text probes asserting the EF body schema files actually
 *      EXPORT the body schemas AND carry zero score/band tokens (anti-tamper). This
 *      is GREEN now (Task 1 authored the schemas).
 *
 * @see src/features/avaliacao/__tests__/redacao-contract.test.ts (the idiom this clones)
 * @see supabase/functions/_shared/entrevista-schemas.ts (the EF body schemas under test)
 * @see supabase/functions/_shared/cognitivo-schemas.ts (the cognitive body + band enum)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

// ── Part 1: runtime contract via Node-local replicas of the EF body schemas ──
// These are the EXACT shapes the EF body schemas must have (Task 1).

const GerarGuiaBodySchemaReplica = z
  .object({
    candidatura_id: z.string().min(1),
    vaga_id: z.string().min(1),
    tipo: z.enum(['online', 'presencial']),
  })
  .strict()

const AvaliarTranscricaoBodySchemaReplica = z
  .object({
    candidatura_id: z.string().min(1),
    transcricao: z.string().min(1),
  })
  .strict()

const SubmitCognitivoBodySchemaReplica = z
  .object({
    candidatura_id: z.string().min(1),
    raw_responses: z.record(z.string(), z.number().int()),
    shuffle_seed: z.string().min(1),
    client_timings: z.array(z.number()).optional(),
  })
  .strict()

const BandaCognitivaEnumReplica = z.enum([
  'bem_abaixo',
  'abaixo',
  'na_media',
  'acima',
  'bem_acima',
])

// The exact bodies the clients build (mirror the future service layers, 14-05):
// only identifiers + raw text/picks. NEVER a score/band/threshold (RNF-07a).
function buildGuiaBody() {
  return {
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    vaga_id: '22222222-2222-4222-8222-222222222222',
    tipo: 'online' as const,
  }
}

function buildTranscricaoBody() {
  return {
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    transcricao: 'Entrevistador: fale sobre... Candidato: numa ocasião eu... (transcrição).',
  }
}

function buildCognitivoBody() {
  return {
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    raw_responses: { item_01: 3, item_02: 1, item_03: 4 },
    shuffle_seed: '11111111-1111-4111-8111-111111111111',
  }
}

describe('Entrevista client↔EF body contract (ENTREV-01/03 / Pitfall 5)', () => {
  it('the GerarGuia client body {candidatura_id, vaga_id, tipo} parses in the EF schema', () => {
    expect(GerarGuiaBodySchemaReplica.safeParse(buildGuiaBody()).success).toBe(true)
  })

  it('.strict REJECTS a GerarGuia body carrying an injected `score` field (anti-tamper)', () => {
    const tampered = { ...buildGuiaBody(), score: 5 }
    expect(GerarGuiaBodySchemaReplica.safeParse(tampered).success).toBe(false)
  })

  it('GerarGuia tipo only accepts online|presencial', () => {
    const bad = { ...buildGuiaBody(), tipo: 'hibrido' }
    expect(GerarGuiaBodySchemaReplica.safeParse(bad).success).toBe(false)
  })

  it('the AvaliarTranscricao client body {candidatura_id, transcricao} parses', () => {
    expect(AvaliarTranscricaoBodySchemaReplica.safeParse(buildTranscricaoBody()).success).toBe(true)
  })

  it('.strict REJECTS an AvaliarTranscricao body carrying an injected `band` field', () => {
    const tampered = { ...buildTranscricaoBody(), banda: 'acima' }
    expect(AvaliarTranscricaoBodySchemaReplica.safeParse(tampered).success).toBe(false)
  })

  it('an empty transcricao fails (min(1) — server still revalidates length≥200)', () => {
    const body = { ...buildTranscricaoBody(), transcricao: '' }
    expect(AvaliarTranscricaoBodySchemaReplica.safeParse(body).success).toBe(false)
  })

  it('the SubmitCognitivo candidate body {candidatura_id, raw_responses, shuffle_seed} parses', () => {
    expect(SubmitCognitivoBodySchemaReplica.safeParse(buildCognitivoBody()).success).toBe(true)
  })

  it('.strict REJECTS a SubmitCognitivo body carrying an injected `score`/`banda` field', () => {
    const tamperedScore = { ...buildCognitivoBody(), score: 21 }
    expect(SubmitCognitivoBodySchemaReplica.safeParse(tamperedScore).success).toBe(false)
    const tamperedBanda = { ...buildCognitivoBody(), banda: 'acima' }
    expect(SubmitCognitivoBodySchemaReplica.safeParse(tamperedBanda).success).toBe(false)
  })

  it('the optional client_timings (advisory anti-cheat) parses', () => {
    const body = { ...buildCognitivoBody(), client_timings: [12, 8, 30] }
    expect(SubmitCognitivoBodySchemaReplica.safeParse(body).success).toBe(true)
  })

  it('BandaCognitivaEnum enumerates exactly the 5 pt-BR faixas', () => {
    const expected = ['bem_abaixo', 'abaixo', 'na_media', 'acima', 'bem_acima']
    expect(BandaCognitivaEnumReplica.options).toEqual(expected)
  })
})

// ── Part 2: source-text probes — assert the EF body schemas exist + carry no score ──
const ROOT = resolve(__dirname, '../../../..')
const ENTREVISTA_SCHEMA_PATH = resolve(ROOT, 'supabase/functions/_shared/entrevista-schemas.ts')
const COGNITIVO_SCHEMA_PATH = resolve(ROOT, 'supabase/functions/_shared/cognitivo-schemas.ts')

function readSrc(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

// Strip comments + the BandaCognitivaEnum block (which legitimately is the OUTPUT
// band, not a body field) before probing the LIVE body schema code for score tokens.
function liveBodyCode(src: string): string {
  return src
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)) // drop comment lines
    .join('\n')
}

describe('Entrevista EF body schema anti-tamper source-probe (RNF-07a)', () => {
  it('entrevista-schemas.ts EXPORTS GerarGuiaBodySchema + AvaliarTranscricaoBodySchema', () => {
    const src = readSrc(ENTREVISTA_SCHEMA_PATH)
    expect(src).toMatch(/export\s+const\s+GerarGuiaBodySchema\b/)
    expect(src).toMatch(/export\s+const\s+AvaliarTranscricaoBodySchema\b/)
  })

  it('entrevista-schemas.ts has at least two .strict() bodies', () => {
    const src = readSrc(ENTREVISTA_SCHEMA_PATH)
    const matches = src.match(/\.strict\(\)/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('the live entrevista body schema code carries NO score/band/nota/veredito token', () => {
    const code = liveBodyCode(readSrc(ENTREVISTA_SCHEMA_PATH))
    expect(code).not.toMatch(/\bscore\b|\bbanda\b|\bband\b|\bnota\b|\bveredito\b|\bthreshold\b/i)
  })

  it('the entrevista bodies carry only identifier/text fields', () => {
    const src = readSrc(ENTREVISTA_SCHEMA_PATH)
    expect(src).toMatch(/candidatura_id/)
    expect(src).toMatch(/vaga_id/)
    expect(src).toMatch(/transcricao/)
    expect(src).toMatch(/tipo/)
  })

  it('cognitivo-schemas.ts EXPORTS SubmitCognitivoBodySchema + BandaCognitivaEnum', () => {
    const src = readSrc(COGNITIVO_SCHEMA_PATH)
    expect(src).toMatch(/export\s+const\s+SubmitCognitivoBodySchema\b/)
    expect(src).toMatch(/export\s+const\s+BandaCognitivaEnum\b/)
  })

  it('the SubmitCognitivo BODY object carries no score/banda field (only raw picks)', () => {
    const src = readSrc(COGNITIVO_SCHEMA_PATH)
    // isolate the SubmitCognitivoBodySchema object literal
    const m = src.match(/SubmitCognitivoBodySchema\s*=\s*z[\s\S]*?\.strict\(\)/)
    const bodyBlock = m ? m[0] : ''
    expect(bodyBlock).not.toMatch(/\bscore\b|\bbanda\b|\bband\b|\bnota\b/i)
    expect(bodyBlock).toMatch(/raw_responses/)
    expect(bodyBlock).toMatch(/shuffle_seed/)
  })
})
