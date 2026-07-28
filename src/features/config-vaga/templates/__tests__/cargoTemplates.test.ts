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

// ============================================================================
// Phase 8 / Plan 08-01 Task 2 — INSCR-03 / D-14 default knockouts (Wave 0 RED)
// ============================================================================
//
// INSCR-03 / D-14: every cargo template seeds an Etapa-1 `qualificacao` block.
// EVERY cargo carries the presencial-SP knockout question (the "Não" option is
// tagged `knockout`); ONLY `dentista` ALSO carries the harmonização-orofacial
// knockout. `CargoTemplate` has no `qualificacao` field today, so the field
// access reads `undefined` → these assertions are RED until Plan 08-03 adds the
// `qualificacao` seed.
//
// The field is read through a structural shape (not the CargoTemplate type)
// because the type intentionally lacks `qualificacao` until Plan 03 lands it —
// this keeps the file TS-strict-clean while still failing at runtime (the
// Phase-7 Wave-0 RED idiom: compiles green, fails at runtime).

const PRESENCIAL_SP_TEXTO =
  'Você tem disponibilidade para trabalhar presencialmente em São Paulo, perto dos metros Brigadeiro e Paraíso?'

interface QualificacaoOpcaoShape {
  texto: string
  tag?: string
}
interface QualificacaoPerguntaShape {
  texto_pergunta: string
  opcoes: QualificacaoOpcaoShape[]
}

// Reads `template.qualificacao` defensively — undefined today (RED), an array
// of perguntas once Plan 08-03 seeds it.
const qualificacaoDe = (slug: CargoSlug): QualificacaoPerguntaShape[] => {
  const tpl = cargoTemplates[slug] as unknown as {
    qualificacao?: QualificacaoPerguntaShape[]
  }
  return tpl.qualificacao ?? []
}

const temKnockout = (
  perguntas: QualificacaoPerguntaShape[],
  textoPergunta: string,
  textoOpcao: string,
): boolean =>
  perguntas.some(
    (p) =>
      p.texto_pergunta === textoPergunta &&
      p.opcoes.some((o) => o.texto === textoOpcao && o.tag === 'knockout'),
  )

describe('cargoTemplates qualificacao seed (Plan 08-01 — INSCR-03 / D-14, Wave 0 RED)', () => {
  // RED until Plan 08-03 adds qualificacao seed.
  it.each(ALL_SLUGS)(
    'KO1[%s]: carries the presencial-SP knockout question (Não → knockout)',
    (slug) => {
      const qualificacao = qualificacaoDe(slug)
      expect(Array.isArray(qualificacao)).toBe(true)
      expect(temKnockout(qualificacao, PRESENCIAL_SP_TEXTO, 'Não')).toBe(true)
    },
  )

  // RED until Plan 08-03: ONLY dentista carries the harmonização-orofacial KO.
  it('KO2: only the dentista template carries a harmonização-orofacial knockout', () => {
    const dentistaTemHarmonizacao = qualificacaoDe('dentista').some((p) =>
      /harmoniza/i.test(p.texto_pergunta) &&
      p.opcoes.some((o) => o.tag === 'knockout'),
    )
    expect(dentistaTemHarmonizacao).toBe(true)

    // No OTHER cargo carries a harmonização knockout.
    const outrosComHarmonizacao = ALL_SLUGS.filter(
      (slug) =>
        slug !== 'dentista' &&
        qualificacaoDe(slug).some((p) => /harmoniza/i.test(p.texto_pergunta)),
    )
    expect(outrosComHarmonizacao).toEqual([])
  })
})
