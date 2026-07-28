/**
 * Phase 11 / Plan 11-01 Task 2 — Wave 0 RED case pinning the SJT-key extension
 * of `testeAplicavelSchema` (AVAL-01 / RF-11).
 *
 * Phase 7 shipped the schema with 4 keys (`teste, obrigatorio, customizado,
 * perguntas?`). Phase 11 extends it with the SJT contract keys the avaliação
 * container consumes (CONTEXT §Container de Avaliação + post-research threshold
 * decision):
 *   - `tipo: 'sjt'`
 *   - `cargo: string`
 *   - `itens_ids: string[]`
 *   - `bateria_size: number`
 *   - `threshold: { mc_min_pct (default 60), case_min, flag_on_atencao }`
 *
 * The SJT cases below are RED until Plan 11-03 lands the extension: today the
 * Phase-7 `testeAplicavelSchema` (a non-strict z.object) silently STRIPS the new
 * keys, so the parsed result does NOT carry `tipo`/`threshold` and the
 * `mc_min_pct` default of 60 is absent — that absence is the calibrated failure.
 * The existing Phase-7 cases stay GREEN (they pin the current 4-key contract).
 *
 * @see src/features/config-vaga/schemas/testesAplicaveisSchema.ts (current 4-key shape)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-RESEARCH.md (extension shape)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-CONTEXT.md (post-research threshold)
 */
import { describe, it, expect } from 'vitest'
import {
  testeAplicavelSchema,
  testesAplicaveisSchema,
} from '@/features/config-vaga/schemas/testesAplicaveisSchema'

describe('testesAplicaveisSchema — Phase-7 4-key contract (preserve GREEN)', () => {
  it('accepts a minimal Phase-7 teste entry', () => {
    const result = testeAplicavelSchema.safeParse({
      teste: 'sjt_mc',
      obrigatorio: true,
      customizado: false,
    })
    expect(result.success).toBe(true)
  })

  it('accepts an array of teste entries', () => {
    const result = testesAplicaveisSchema.safeParse([
      { teste: 'sjt_mc', obrigatorio: true, customizado: false },
      { teste: 'sjt_caso_aberto', obrigatorio: false, customizado: true, perguntas: ['p1'] },
    ])
    expect(result.success).toBe(true)
  })
})

describe('testeAplicavelSchema — SJT-key extension (Plan 11-01 Wave 0 RED)', () => {
  it('parses the SJT keys (tipo/cargo/itens_ids/bateria_size/threshold)', () => {
    const parsed = testeAplicavelSchema.parse({
      teste: 'sjt_mc',
      obrigatorio: true,
      customizado: false,
      tipo: 'sjt',
      cargo: 'dentista',
      itens_ids: ['sjt-dentista-01', 'sjt-dentista-02'],
      bateria_size: 4,
      threshold: { mc_min_pct: 60, case_min: 13, flag_on_atencao: true },
    }) as Record<string, unknown>
    // RED today: the Phase-7 z.object strips unknown keys, so `tipo` is absent
    // until Plan 11-03 adds the SJT keys to the schema.
    expect(parsed.tipo).toBe('sjt')
    expect(parsed.cargo).toBe('dentista')
    expect((parsed.threshold as { mc_min_pct: number }).mc_min_pct).toBe(60)
  })

  it('threshold.mc_min_pct defaults to 60 when omitted', () => {
    const parsed = testeAplicavelSchema.parse({
      teste: 'sjt_mc',
      obrigatorio: true,
      customizado: false,
      tipo: 'sjt',
      cargo: 'dentista',
      itens_ids: ['sjt-dentista-01'],
      bateria_size: 1,
      threshold: { case_min: 13, flag_on_atencao: true },
    }) as Record<string, unknown>
    // RED today: no `threshold` key survives the strip, so the default-60 cannot apply.
    expect((parsed.threshold as { mc_min_pct: number } | undefined)?.mc_min_pct).toBe(60)
  })
})
