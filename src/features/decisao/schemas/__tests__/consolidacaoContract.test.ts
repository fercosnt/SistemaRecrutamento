/**
 * Phase 15 / Plan 15-01 Task 3a — client↔EF contract test (DECISAO-01 /
 * [[feedback_integration_contract_gap]]). MIGRATED in Phase 27 / Plan 27-02 (CI-07)
 * from the Node-local replica + filesystem source-text probe to a REAL `.safeParse`
 * against the ONE shared schema both runtimes import.
 *
 * THE integration-contract lesson (the Phase-11 SJT C1/C2 lesson): the body the
 * RH client builds for the `consolidar-decisao-final` EF MUST parse in that EF's
 * `.strict()` Zod body schema, and an extra/unknown/injected key MUST be rejected.
 * The EF (Deno, via the deno.json `zod` import map) and this client test (Node, via
 * node_modules) import the SAME module — `../consolidacaoSchema` — so the contract
 * CANNOT drift (the replica idiom could not catch drift; the consolidar EF had in
 * fact loosened `z.string().uuid()` → `z.string()` before CI-07 de-drifted it).
 *
 * Run: npm run test:run -- consolidacaoContract
 *
 * @see supabase/functions/consolidar-decisao-final/index.ts (imports the same schema)
 * @see src/features/decisao/schemas/consolidacaoSchema.ts (the shared source of truth)
 */
import { describe, it, expect } from 'vitest'
import { ConsolidacaoRequestSchema } from '../consolidacaoSchema'

// The exact body the RH client builds (mirrors the decisaoService layer): only the
// two identifiers. NEVER a score/peso/threshold.
function buildClientBody() {
  return {
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    vaga_id: '22222222-2222-4222-8222-222222222222',
  }
}

describe('Consolidação client↔EF body contract (DECISAO-01 / integration-contract-gap)', () => {
  it('the exact client body {candidatura_id, vaga_id} parses in the shared .strict() schema', () => {
    const parsed = ConsolidacaoRequestSchema.safeParse(buildClientBody())
    expect(parsed.success).toBe(true)
  })

  it('.strict REJECTS a body carrying an extra/unknown key (the Phase-11 SJT drift)', () => {
    const withUnknown = { ...buildClientBody(), foo: 'bar' }
    expect(ConsolidacaoRequestSchema.safeParse(withUnknown).success).toBe(false)
  })

  it('.strict REJECTS an injected `score` field (anti-tamper, RNF-07a)', () => {
    const tampered = { ...buildClientBody(), score: 99 }
    expect(ConsolidacaoRequestSchema.safeParse(tampered).success).toBe(false)
  })

  it('a non-uuid candidatura_id fails (`.uuid()` restored via the shared schema)', () => {
    const body = { ...buildClientBody(), candidatura_id: 'not-a-uuid' }
    expect(ConsolidacaoRequestSchema.safeParse(body).success).toBe(false)
  })
})
