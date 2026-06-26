/**
 * Phase 15 / Plan 15-01 Task 2 — Wave 0 RED golden test for the EEOC 4/5
 * adverse-impact ratio + age banding (LGPD-03).
 *
 * V1 bias audit = selection-rate per AGE BAND with the EEOC four-fifths rule.
 * Age is the ONLY demographic attribute collected (`candidatos.data_nascimento`);
 * race/gender are NOT collected (LGPD-01 minimization) → out of scope V1.
 *
 * ── The formula (RESEARCH §EEOC 4/5, CITED eeoc.gov Uniform Guidelines / 29 CFR §1607.4) ──
 *   selection_rate(band)       = selected(band) / applicants(band)
 *   adverse_impact_ratio(band) = selection_rate(band) / selection_rate(reference_band)
 *   reference_band             = the band with the HIGHEST selection rate
 *   FLAG when adverse_impact_ratio < 0.80   (the "four-fifths" / 80% rule)
 * Worked example (eeoc.gov): white hire 50% (reference), Hispanic 35% →
 *   0.35 / 0.50 = 0.70 < 0.80 → adverse impact indicated → flag true.
 *
 * ── small-N caveat (Pitfall 3) ── the 4/5 rule is statistically unreliable below
 * ~30 selections/group → `small_sample_warning` when any band's applicants < 30.
 *
 * ── null/invalid birthdate (Pitfall 4) ── candidates with no usable birthdate are
 * NOT silently dropped — an excluded-count is reported so band totals reconcile.
 *
 * ── Why this is RED now ──
 * `../biasMath` ainda NÃO existe → o `import` falha em MODULE-RESOLUTION. ESSA é a
 * asserção RED calibrada (compila, mas não resolve o módulo). A implementação
 * (pure fns, no DB) chega na Wave 2 em `src/features/admin/bias-audit/biasMath.ts`.
 *
 * NOTE — file location: the test lives under `__tests__/` (the vitest `include`
 * glob is `**​/__tests__/**​/*.{test,spec}.{ts,tsx}`; a sibling `*.test.ts` is NOT
 * discovered by `npm run test:run`). The Wave-2 module is its sibling one level up.
 *
 * Run: npm run test:run -- biasMath
 *
 * @see src/features/avaliacao-cognitiva (deterministic pure-fn + TS/SQL no-drift `bandaFromTotal` precedent)
 * @see supabase/migrations/20260625000001_phase14_gap_closure.sql:138 (banding-cutoff TS/SQL no-drift idiom)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-RESEARCH.md §EEOC 4/5 Adverse-Impact Computation
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-01-PLAN.md (Task 2 — LGPD-03)
 */
import { describe, it, expect } from 'vitest'
// RED: this module does not exist until Wave 2 → module-resolution failure here.
import { computeAdverseImpact, bandFromAge } from '../biasMath'

describe('LGPD-03 — EEOC 4/5 adverse-impact ratio (computeAdverseImpact)', () => {
  it('computes selection_rate per band = selected / applicants', () => {
    const result = computeAdverseImpact([
      { faixa: '25-34', applicants: 40, selected: 20 }, // 0.50 — reference (highest)
      { faixa: '45-54', applicants: 40, selected: 14 }, // 0.35
    ])
    const byFaixa = Object.fromEntries(result.bands.map((b) => [b.faixa, b]))
    expect(byFaixa['25-34'].selection_rate).toBeCloseTo(0.5, 4)
    expect(byFaixa['45-54'].selection_rate).toBeCloseTo(0.35, 4)
  })

  it('reference band = the band with the HIGHEST selection rate (razao_4_5 = 1.0)', () => {
    const result = computeAdverseImpact([
      { faixa: '25-34', applicants: 40, selected: 20 }, // 0.50 — highest → reference
      { faixa: '45-54', applicants: 40, selected: 14 }, // 0.35
    ])
    expect(result.faixa_referencia).toBe('25-34')
    const byFaixa = Object.fromEntries(result.bands.map((b) => [b.faixa, b]))
    expect(byFaixa['25-34'].razao_4_5).toBeCloseTo(1.0, 4)
  })

  it('the cited 0.70 worked example FLAGS (0.35/0.50 = 0.70 < 0.80)', () => {
    const result = computeAdverseImpact([
      { faixa: '25-34', applicants: 40, selected: 20 }, // 0.50 reference
      { faixa: '45-54', applicants: 40, selected: 14 }, // 0.35 → ratio 0.70
    ])
    const lowBand = result.bands.find((b) => b.faixa === '45-54')!
    expect(lowBand.razao_4_5).toBeCloseTo(0.7, 4)
    expect(lowBand.flag).toBe(true)
  })

  it('a band at/above 0.80 of the reference is NOT flagged', () => {
    const result = computeAdverseImpact([
      { faixa: '25-34', applicants: 40, selected: 20 }, // 0.50 reference
      { faixa: '35-44', applicants: 40, selected: 18 }, // 0.45 → ratio 0.90 ≥ 0.80
    ])
    const band = result.bands.find((b) => b.faixa === '35-44')!
    expect(band.razao_4_5).toBeCloseTo(0.9, 4)
    expect(band.flag).toBe(false)
  })

  it('small_sample_warning is true when ANY band has applicants < 30', () => {
    const result = computeAdverseImpact([
      { faixa: '25-34', applicants: 40, selected: 20 },
      { faixa: '18-24', applicants: 12, selected: 5 }, // < 30 → small sample
    ])
    expect(result.small_sample_warning).toBe(true)
  })

  it('small_sample_warning is false when EVERY band has applicants >= 30', () => {
    const result = computeAdverseImpact([
      { faixa: '25-34', applicants: 40, selected: 20 },
      { faixa: '45-54', applicants: 30, selected: 12 },
    ])
    expect(result.small_sample_warning).toBe(false)
  })

  it('reports an excluded-count for null/invalid birthdates — candidates NOT silently dropped (Pitfall 4)', () => {
    const result = computeAdverseImpact(
      [
        { faixa: '25-34', applicants: 40, selected: 20 },
        { faixa: '45-54', applicants: 40, selected: 14 },
      ],
      { excluidos_sem_data: 3 },
    )
    // the excluded count is surfaced in the snapshot, never dropped on the floor.
    expect(result.excluidos_sem_data).toBe(3)
  })

  it('n_total = Σ applicants ONLY — the excluded count is NOT added in (SQL v_n_total)', () => {
    const result = computeAdverseImpact(
      [
        { faixa: '25-34', applicants: 40, selected: 20 },
        { faixa: '45-54', applicants: 40, selected: 14 },
      ],
      { excluidos_sem_data: 3 },
    )
    // SQL: v_n_total := COALESCE(sum(applicants), 0) — excluded count surfaced separately.
    expect(result.n_total).toBe(80)
  })

  it('reference-band tie-break = highest rate then faixa ASC (matches SQL ORDER BY rate DESC, faixa ASC)', () => {
    // Two bands tie at the SAME selection rate (0.50). The SQL LIMIT 1 over
    // `ORDER BY rate DESC, faixa ASC` picks the lexicographically-lowest faixa.
    const result = computeAdverseImpact([
      { faixa: '45-54', applicants: 40, selected: 20 }, // 0.50 — ties
      { faixa: '25-34', applicants: 40, selected: 20 }, // 0.50 — ties; lower faixa wins
    ])
    expect(result.faixa_referencia).toBe('25-34')
  })

  it('the method + age-only limitation are self-described in the result (LGPD-01 honesty)', () => {
    const result = computeAdverseImpact([
      { faixa: '25-34', applicants: 40, selected: 20 },
      { faixa: '45-54', applicants: 40, selected: 14 },
    ])
    expect(result.metodo).toMatch(/eeoc/i)
    expect(result.limitacao).toMatch(/idade|faixa et[aá]ria|ra[çc]a|g[êe]nero/i)
  })
})

describe('LGPD-03 — age banding (bandFromAge)', () => {
  it.each([
    [18, '18-24'],
    [24, '18-24'], // upper boundary of first band
    [25, '25-34'], // lower boundary of second band
    [34, '25-34'],
    [35, '35-44'],
    [44, '35-44'],
    [45, '45-54'],
    [54, '45-54'],
    [55, '55+'], // open-ended top band
    [70, '55+'],
  ])('age %i buckets into %s', (age, expected) => {
    expect(bandFromAge(age)).toBe(expected)
  })
})
