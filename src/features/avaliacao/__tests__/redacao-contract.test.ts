/**
 * Phase 13 / Plan 13-01 Task 3 — client↔EF contract test (AVAL-06 / Pitfall 5 —
 * [[feedback_integration_contract_gap]]). MIGRATED in Phase 27 / Plan 27-02 (CI-07)
 * from the Node-local replica + filesystem source-text probe to a REAL `.safeParse`
 * against the ONE shared EF body schema both runtimes import.
 *
 * THE integration-contract lesson (the Phase-11 SJT C1/C2 lesson): the body the
 * CANDIDATE client builds for the `avaliar-redacao-cultural` EF MUST parse in that
 * EF's `.strict()` Zod body schema, and the body carries only identifiers + essay
 * text — NEVER a score (anti-tamper, RNF-07a). The EF (Deno, via the deno.json `zod`
 * import map) and this client test (Node, via node_modules) import the SAME module
 * — `_shared/redacao-schemas` — so the contract CANNOT drift.
 *
 * Run: npm run test:run -- redacao-contract
 *
 * @see supabase/functions/_shared/redacao-schemas.ts (the shared EF body schema)
 */
import { describe, it, expect } from 'vitest'
import { AvaliarRedacaoCulturalBodySchema } from '../../../../supabase/functions/_shared/redacao-schemas'

// The exact body the CANDIDATE client builds (mirrors the service layer): only
// identifiers + essay text. NEVER a score/color/threshold (RNF-07a).
function buildClientBody() {
  return {
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    pergunta_id: '22222222-2222-4222-8222-222222222222',
    texto: 'Uma vez precisei tomar uma decisão difícil sobre... (redação do candidato).',
  }
}

describe('Redação client↔EF body contract (AVAL-06 / Pitfall 5)', () => {
  it('the exact client body {candidatura_id, pergunta_id, texto} parses in the shared EF schema', () => {
    const parsed = AvaliarRedacaoCulturalBodySchema.safeParse(buildClientBody())
    expect(parsed.success).toBe(true)
  })

  it('.strict REJECTS a body carrying an injected `score` field (anti-tamper, RNF-07a)', () => {
    const tampered = { ...buildClientBody(), score: 99 }
    expect(AvaliarRedacaoCulturalBodySchema.safeParse(tampered).success).toBe(false)
  })

  it('an empty texto fails (min(1) — server still revalidates word_count)', () => {
    const body = { ...buildClientBody(), texto: '' }
    expect(AvaliarRedacaoCulturalBodySchema.safeParse(body).success).toBe(false)
  })

  it('the optional WR-03 tempo_gasto_segundos (anti-cheat timing) parses', () => {
    const body = { ...buildClientBody(), tempo_gasto_segundos: 412 }
    expect(AvaliarRedacaoCulturalBodySchema.safeParse(body).success).toBe(true)
  })
})
