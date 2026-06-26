/**
 * Phase 15 / Plan 15-01 Task 3a — Wave 0 RED client↔EF contract test
 * (DECISAO-01 / [[feedback_integration_contract_gap]]).
 *
 * THE integration-contract lesson (the Phase-11 SJT C1/C2 lesson): the body the
 * RH client builds for the new `consolidar-decisao-final` EF MUST parse in that
 * EF's `.strict()` Zod body schema, and an extra/unknown key MUST be rejected.
 * The Wave-1 EF and the Wave-2 client BOTH import this SAME shared schema
 * (`src/features/decisao/schemas/consolidacaoSchema.ts`) so the contract cannot
 * drift — exactly the gap that broke Phase 11 SJT (client sent a body the EF
 * Zod schema rejected, both mocked sides green while the real contract was broken).
 *
 * ── Why a Node-local Zod replica + a source-text probe (not a live import) ──
 * The shared schema module does not exist yet. A direct runtime `import('../consolidacaoSchema')`
 * would fail vitest SUITE COLLECTION ("Failed to resolve import") — which would
 * prevent the Part-1 runtime contract assertions from running at all, and would
 * NOT cleanly flip GREEN. So this mirrors the exact precedent
 * (src/features/avaliacao/__tests__/redacao-contract.test.ts):
 *   1. A Node-local Zod `.strict()` replica of the EXACT shape the shared schema
 *      must have — the runtime parse assertions document the contract (accept the
 *      well-formed body; REJECT an unknown key). These RUN today.
 *   2. A `node:fs` source-text probe over `../consolidacaoSchema.ts` asserting the
 *      real shared schema EXPORTS `ConsolidacaoRequestSchema` with the 2 identifier
 *      fields, `.strict()`, and NO score field — RED now (file absent), flips GREEN
 *      the moment Wave 2 authors the shared schema.
 *
 * Do NOT author the schema here — this task only authors the failing contract.
 *
 * Run: npm run test:run -- consolidacaoContract
 *
 * @see src/features/avaliacao/__tests__/redacao-contract.test.ts (the idiom this clones)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-VALIDATION.md §Wave 0 (contract test requirement)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-01-PLAN.md (Task 3a — DECISAO-01)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

// ── Part 1: the runtime contract via a Node-local replica of the EF body schema ──
// This is the EXACT shape the shared `consolidacaoSchema` must have in Wave 2.
// The consolidation EF body carries ONLY two identifiers — no scores, no weights.
const ConsolidacaoRequestSchemaReplica = z
  .object({
    candidatura_id: z.string().uuid(),
    vaga_id: z.string().uuid(),
  })
  .strict()

// The exact body the RH client builds (mirrors the Wave-2 decisaoService layer):
// only the two identifiers. NEVER a score/peso/threshold.
function buildClientBody() {
  return {
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    vaga_id: '22222222-2222-4222-8222-222222222222',
  }
}

describe('Consolidação client↔EF body contract (DECISAO-01 / integration-contract-gap)', () => {
  it('the exact client body {candidatura_id, vaga_id} parses in the EF .strict() schema', () => {
    const parsed = ConsolidacaoRequestSchemaReplica.safeParse(buildClientBody())
    expect(parsed.success).toBe(true)
  })

  it('.strict REJECTS a body carrying an extra/unknown key (the Phase-11 SJT drift)', () => {
    const withUnknown = { ...buildClientBody(), foo: 'bar' }
    expect(ConsolidacaoRequestSchemaReplica.safeParse(withUnknown).success).toBe(false)
  })

  it('.strict REJECTS an injected `score` field (anti-tamper, RNF-07a)', () => {
    const tampered = { ...buildClientBody(), score: 99 }
    expect(ConsolidacaoRequestSchemaReplica.safeParse(tampered).success).toBe(false)
  })

  it('a non-uuid candidatura_id fails', () => {
    const body = { ...buildClientBody(), candidatura_id: 'not-a-uuid' }
    expect(ConsolidacaoRequestSchemaReplica.safeParse(body).success).toBe(false)
  })

  // ── Part 2: source-text probe of the real shared schema — RED until Wave 2 ──
  // The shared schema is the SINGLE source both the EF (Wave 1) and the client
  // (Wave 2) import, so the contract cannot drift. A `node:fs` probe (NOT a live
  // `import`, which would fail vitest suite collection while absent) asserts the
  // file exports `ConsolidacaoRequestSchema` with the right shape — RED now
  // (file absent → empty source → no match), GREEN when Wave 2 lands the file.
  const SHARED_SCHEMA_PATH = resolve(__dirname, '../consolidacaoSchema.ts')

  function sharedSchemaSource(): string {
    return existsSync(SHARED_SCHEMA_PATH) ? readFileSync(SHARED_SCHEMA_PATH, 'utf8') : ''
  }

  it('the shared consolidacaoSchema.ts EXPORTS ConsolidacaoRequestSchema (RED until Wave 2)', () => {
    expect(sharedSchemaSource()).toMatch(/export\s+const\s+ConsolidacaoRequestSchema\b/)
  })

  it('the shared schema carries the 2 identifier fields, is .strict(), and declares no score', () => {
    const src = sharedSchemaSource()
    expect(src).toMatch(/candidatura_id/)
    expect(src).toMatch(/vaga_id/)
    expect(src).toMatch(/\.strict\(\)/)
    // the request body must NOT declare a score/pontuacao/peso field (anti-tamper).
    expect(src).not.toMatch(/\bpontuacao\b|\bscore\b/)
  })
})
