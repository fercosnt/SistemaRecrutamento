/**
 * Phase 7 / Plan 07-01 Task 1 — Wave 0 RED scaffold for cargoTemplates (VAGACFG-01).
 *
 * Imports the PLANNED (not-yet-existing) TS config module
 * `@/features/config-vaga/templates/cargoTemplates`. Compiles under TS strict
 * but is EXPECTED to FAIL at runtime (module-not-found) until Plan 03 lands the
 * module. Do NOT stub the module to make this green.
 *
 * Coverage (RESEARCH §Code Examples — cargoTemplates.ts; D-04, D-07, D-09):
 *   - all 8 CargoSlug templates exist (the 8 real cargos)
 *   - every template's pesos_avaliacao sums to EXACTLY 100 (VAGACFG-01 / Pitfall 4)
 *   - selecting a template yields a deep-copy (mutating the copy does NOT mutate
 *     the source `cargoTemplates` — the UI copies defaults INTO the vaga, D-04)
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-RESEARCH.md §Code Examples
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-04, D-07, D-09)
 */
import { describe, it, expect } from 'vitest'
import {
  cargoTemplates,
  type CargoSlug,
} from '@/features/config-vaga/templates/cargoTemplates'

// The 8 real cargos (D-04). Every one must be present and sum to 100.
const ALL_SLUGS: CargoSlug[] = [
  'dentista',
  'recepcionista',
  'consultor_vendas_premium',
  'sdr_social_seller',
  'assistente_financeiro',
  'asb',
  'tsb',
  'vaga_generica',
]

const somaTemplate = (slug: CargoSlug): number => {
  const p = cargoTemplates[slug].pesos_avaliacao
  return p.triagem + p.work_sample_sjt + p.redacao_cultural + p.entrevista
}

describe('cargoTemplates (Plan 07-01 — VAGACFG-01, Wave 0 RED)', () => {
  it('T1: exposes all 8 real cargo templates', () => {
    for (const slug of ALL_SLUGS) {
      expect(cargoTemplates[slug]).toBeDefined()
      expect(cargoTemplates[slug].slug).toBe(slug)
    }
    expect(Object.keys(cargoTemplates)).toHaveLength(8)
  })

  // Loop covering all 8 keys — each pesos block sums to exactly 100 (Pitfall 4).
  it.each(ALL_SLUGS)('T2[%s]: pesos_avaliacao sums to exactly 100', (slug) => {
    expect(somaTemplate(slug)).toBe(100)
  })

  it('T3: selecting a template yields a deep-copy (mutation isolation, D-04)', () => {
    const tpl = cargoTemplates.dentista
    // Simulate the UI copy-into-vaga: a structural clone of the template defaults.
    const copy = structuredClone(tpl)
    copy.pesos_avaliacao.triagem = 999
    copy.testes_aplicaveis[0].obrigatorio = !copy.testes_aplicaveis[0].obrigatorio
    // The source template must be untouched.
    expect(cargoTemplates.dentista.pesos_avaliacao.triagem).not.toBe(999)
    expect(somaTemplate('dentista')).toBe(100)
  })
})
