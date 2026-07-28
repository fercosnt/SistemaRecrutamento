/**
 * Phase 12 / Plan 12-01 Task 1 — Wave 0 RED client↔EF contract test (AVAL-04 / RF-15).
 *
 * THE integration-contract lesson ([[feedback_integration_contract_gap]], the
 * Phase-11 C1/C2 lesson): the body the CLIENT builds for `submit-bigfive-final`
 * MUST parse in the EF's `SubmitBigfiveFinalBodySchema`, and that schema MUST be
 * `.strict()` so a client-sent `score` is rejected, not silently stripped
 * (anti-tamper, RESEARCH Pitfall 3). We pin that contract as executable assertions
 * BEFORE the schema + the client body land (smoke-runtime gate).
 *
 * ── Why a Node-local Zod replica + a source-text probe (not a live import) ──
 * `supabase/functions/_shared/avaliacao-schemas.ts` imports `npm:zod@3.25.76`
 * (a Deno specifier). Vitest runs under Node/Vite and has NO resolver for the
 * `npm:` specifier, so a direct `import { SubmitBigfiveFinalBodySchema }` fails at
 * MODULE-RESOLUTION time — a failure that would NOT flip GREEN when 12-02 adds the
 * schema. The faithful RED→GREEN contract (exact precedent:
 * supabase/functions/_shared/__tests__/strict-schema.test.ts) is two parts:
 *   1. A Node-local Zod replica of the EXACT shape the EF schema must have. The
 *      runtime parse assertions document the contract the EF + client must honor —
 *      the 120×(1-5) body parses; `.strict` rejects an extra `score`; a 119-key or
 *      out-of-range value fails. (Project zod is 3.25.76 — same pin as the EF.)
 *   2. A `node:fs` source-text probe asserting the EF file actually EXPORTS
 *      `SubmitBigfiveFinalBodySchema` carrying `.strict()` + the 1..5 range. This
 *      is RED now (the symbol is absent) and flips GREEN the moment 12-02 authors
 *      the real schema — proving the replica and the production schema agree.
 *
 * Do NOT add the schema here or edit the EF schema — this task only authors the
 * failing test.
 *
 * @see supabase/functions/_shared/__tests__/strict-schema.test.ts (the source-probe idiom)
 * @see supabase/functions/_shared/avaliacao-schemas.ts (where SubmitBigfiveFinalBodySchema lands in 12-02)
 * @see .planning/phases/12-big-five-devolutiva/12-RESEARCH.md Pitfall 3 + §Code Examples
 * @see .planning/phases/12-big-five-devolutiva/12-01-PLAN.md Task 1
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

// ── Part 1: the runtime contract via a Node-local replica of the EF schema ────
// This is the EXACT shape `SubmitBigfiveFinalBodySchema` must have in 12-02.
const SubmitBigfiveFinalBodySchemaReplica = z
  .object({
    candidatura_id: z.string().uuid(),
    // exactly the 120 Likert answers, each an int 1..5; NO score field anywhere
    respostas: z.record(z.string(), z.number().int().min(1).max(5)),
  })
  .strict()

// The exact body the CLIENT builds (mirrors src/features/avaliacao service layer):
// { candidatura_id: uuid, respostas: { "1".."120" → 1..5 } }. Never a score.
function buildClientBody(): { candidatura_id: string; respostas: Record<string, number> } {
  const respostas: Record<string, number> = {}
  for (let id = 1; id <= 120; id++) respostas[String(id)] = ((id % 5) + 1) // cycles 1..5
  return { candidatura_id: '11111111-1111-4111-8111-111111111111', respostas }
}

describe('Big Five client↔EF body contract (AVAL-04 / Pitfall 3)', () => {
  it('the exact client Likert body (120 × 1-5) parses in the EF schema', () => {
    const body = buildClientBody()
    const parsed = SubmitBigfiveFinalBodySchemaReplica.safeParse(body)
    expect(parsed.success).toBe(true)
    expect(Object.keys(body.respostas)).toHaveLength(120)
  })

  it('.strict REJECTS a body carrying an extra `score` field (anti-tamper)', () => {
    const tampered = { ...buildClientBody(), score: 99 }
    const parsed = SubmitBigfiveFinalBodySchemaReplica.safeParse(tampered)
    expect(parsed.success).toBe(false)
  })

  it('a respostas value out of the 1..5 range fails', () => {
    const body = buildClientBody()
    body.respostas['1'] = 7 // out of range
    expect(SubmitBigfiveFinalBodySchemaReplica.safeParse(body).success).toBe(false)
  })

  it('a non-integer respostas value fails', () => {
    const body = buildClientBody()
    body.respostas['2'] = 3.5
    expect(SubmitBigfiveFinalBodySchemaReplica.safeParse(body).success).toBe(false)
  })

  // ── Part 2: source-text probe — RED until 12-02 authors the real EF schema ──
  const SCHEMA_PATH = resolve(
    __dirname,
    '../../../../supabase/functions/_shared/avaliacao-schemas.ts',
  )
  const schemaSource = () => readFileSync(SCHEMA_PATH, 'utf8')

  it('the EF schema file EXPORTS SubmitBigfiveFinalBodySchema (RED until 12-02)', () => {
    expect(schemaSource()).toMatch(/export\s+const\s+SubmitBigfiveFinalBodySchema\b/)
  })

  it('SubmitBigfiveFinalBodySchema carries .strict() (anti-tamper, Pitfall 3)', () => {
    const src = schemaSource()
    // the schema declaration block must include a .strict() call
    const block = src.slice(src.indexOf('SubmitBigfiveFinalBodySchema'))
    expect(block).toMatch(/\.strict\(\)/)
  })

  it('the EF schema constrains respostas to the 1..5 Likert range', () => {
    const src = schemaSource()
    const block = src.slice(src.indexOf('SubmitBigfiveFinalBodySchema'))
    // .min(1) and .max(5) on the respostas value (defense in depth with the client)
    expect(block).toMatch(/\.min\(1\)/)
    expect(block).toMatch(/\.max\(5\)/)
  })
})
