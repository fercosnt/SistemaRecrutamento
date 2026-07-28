/**
 * Phase 7 / Plan 07-01 Task 1 — Wave 0 RED scaffold for pesosAvaliacaoSchema (VAGACFG-02).
 *
 * These tests import from the PLANNED (not-yet-existing) module
 * `@/features/config-vaga/schemas/pesosAvaliacaoSchema`. They MUST compile
 * under TS strict but are EXPECTED to FAIL at runtime (module-not-found) until
 * Plan 03 lands the schema. The RED state IS the assertion that the module is
 * absent — do NOT stub the module to make this green.
 *
 * Coverage (RESEARCH §Code Examples — pesosAvaliacaoSchema + somaPesos):
 *   - `.refine` REJECTS sum≠100 (D-12 publish gate input)
 *   - `.refine` ACCEPTS sum=100 (the 4 D-07 weighted keys)
 *   - integer guard REJECTS floats (Pitfall 4 — IEEE-754 slider rounding)
 *   - `somaPesos(Partial)` returns the live running sum for the indicator
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-RESEARCH.md §Code Examples
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-07, D-08, D-12)
 */
import { describe, it, expect } from 'vitest'
import {
  pesosAvaliacaoSchema,
  somaPesos,
  type PesosAvaliacao,
} from '@/features/config-vaga/schemas/pesosAvaliacaoSchema'

describe('pesosAvaliacaoSchema (Plan 07-01 — VAGACFG-02, Wave 0 RED)', () => {
  it('T1: REJECTS when the 4 weighted keys do not sum to 100', () => {
    // 30+30+15+20 = 95 ≠ 100 — must fail the refine (D-12 condition 1)
    const result = pesosAvaliacaoSchema.safeParse({
      triagem: 30,
      work_sample_sjt: 30,
      redacao_cultural: 15,
      entrevista: 20,
    })
    expect(result.success).toBe(false)
  })

  it('T2: ACCEPTS when the 4 weighted keys sum to exactly 100', () => {
    const result = pesosAvaliacaoSchema.safeParse({
      triagem: 30,
      work_sample_sjt: 30,
      redacao_cultural: 15,
      entrevista: 25,
    })
    expect(result.success).toBe(true)
  })

  it('T3: integer guard REJECTS float pesos (Pitfall 4)', () => {
    // Floats that "look" like they sum to 100 must still be rejected by .int()
    const result = pesosAvaliacaoSchema.safeParse({
      triagem: 33.33,
      work_sample_sjt: 33.33,
      redacao_cultural: 16.67,
      entrevista: 16.67,
    })
    expect(result.success).toBe(false)
  })

  it('T4: somaPesos returns the live running sum for a Partial', () => {
    const partial: Partial<PesosAvaliacao> = {
      triagem: 30,
      work_sample_sjt: 30,
    }
    expect(somaPesos(partial)).toBe(60)
    expect(
      somaPesos({
        triagem: 30,
        work_sample_sjt: 30,
        redacao_cultural: 15,
        entrevista: 25,
      })
    ).toBe(100)
  })

  it('T5: somaPesos treats missing keys as 0 (empty Partial → 0)', () => {
    expect(somaPesos({})).toBe(0)
  })
})
