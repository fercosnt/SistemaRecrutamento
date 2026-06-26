/**
 * biasMath — pure deterministic EEOC 4/5 adverse-impact module (LGPD-03).
 *
 * V1 bias audit = selection-rate per AGE BAND with the EEOC four-fifths rule
 * (29 CFR §1607.4, Uniform Guidelines on Employee Selection Procedures).
 * Age is the ONLY demographic attribute collected (`candidatos.data_nascimento`);
 * race/gender are NOT collected (LGPD-01 minimization) → out of scope V1.
 *
 * ── The formula (RESEARCH §EEOC 4/5, CITED eeoc.gov) ──
 *   selection_rate(band)       = selected(band) / applicants(band)
 *   reference_band             = the band with the HIGHEST selection rate
 *   adverse_impact_ratio(band) = selection_rate(band) / selection_rate(reference_band)
 *   FLAG when adverse_impact_ratio < 0.80   (the "four-fifths" / 80% rule)
 * Worked example (eeoc.gov): reference hire 50%, other band 35% →
 *   0.35 / 0.50 = 0.70 < 0.80 → adverse impact indicated → flag true.
 *
 * ── small-N caveat (Pitfall 3) ── the 4/5 rule is statistically unreliable below
 * ~30 selections/group → `small_sample_warning` when any band's applicants < 30.
 *
 * ── null/invalid birthdate (Pitfall 4) ── candidates with no usable birthdate are
 * NOT silently dropped — an `excluded_sem_data` count is surfaced so band totals
 * reconcile against the population.
 *
 * ── No-drift invariant ── this is the TS mirror of the server-side
 * `gerar_bias_snapshot` SQL (Plan 02): the formula here MUST stay identical to the
 * SQL (the cognitivo `bandaFromTotal` TS/SQL no-drift precedent). NO DB/network
 * imports — pure deterministic functions only.
 *
 * @module features/admin/bias-audit/biasMath
 * @see src/features/admin/bias-audit/__tests__/biasMath.test.ts (the Wave-0 golden test this satisfies)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-RESEARCH.md §EEOC 4/5
 */

/** The five fixed age bands (open-ended top band). */
export type AgeBand = '18-24' | '25-34' | '35-44' | '45-54' | '55+'

/** The four-fifths (80%) adverse-impact threshold. */
export const FOUR_FIFTHS_THRESHOLD = 0.8

/** Below this many applicants per band the 4/5 rule is statistically unreliable. */
export const SMALL_SAMPLE_FLOOR = 30

/** Raw per-band counts fed into the computation. */
export interface BandInput {
  faixa: string
  applicants: number
  selected: number
}

/** A single computed band row in the snapshot output. */
export interface BandResult {
  faixa: string
  applicants: number
  selected: number
  selection_rate: number
  razao_4_5: number
  flag: boolean
}

/** Optional accounting passed alongside the bands (Pitfall 4). */
export interface ComputeOptions {
  /** Count of candidates with a null/invalid birthdate, excluded from banding. */
  excluded_sem_data?: number
}

/** The full adverse-impact snapshot payload (mirrors `bias_audit_log.dados`). */
export interface AdverseImpactResult {
  metodo: string
  limitacao: string
  bands: BandResult[]
  faixa_referencia: string | null
  small_sample_warning: boolean
  excluded_sem_data: number
  n_total: number
}

const METODO =
  'EEOC 4/5 (regra dos quatro quintos) — selection rate por faixa etária vs a faixa de maior taxa.'

const LIMITACAO =
  'Esta auditoria considera apenas faixa etária. Raça e gênero não são coletados (minimização de dados — LGPD).'

/**
 * Buckets an age (in whole years) into one of the five fixed bands.
 *
 * Boundaries (inclusive lower, inclusive upper except the open top band):
 *   18–24 · 25–34 · 35–44 · 45–54 · 55+
 *
 * TS mirror of the server-side banding-cutoff CASE (no-drift). Ages below 18 fall
 * into the first band defensively; the top band is open-ended.
 */
export function bandFromAge(age: number): AgeBand {
  if (age <= 24) return '18-24'
  if (age <= 34) return '25-34'
  if (age <= 44) return '35-44'
  if (age <= 54) return '45-54'
  return '55+'
}

/**
 * Computes the EEOC 4/5 adverse-impact snapshot over per-band counts.
 *
 * - `selection_rate = selected / applicants` (0 when applicants is 0).
 * - `reference_band` = the band with the HIGHEST selection rate (razao_4_5 = 1.0).
 * - `razao_4_5 = selection_rate / reference_rate` (1.0 for the reference band).
 * - `flag = razao_4_5 < 0.8` (never flags the reference band).
 * - `small_sample_warning = true` if any band has `applicants < 30`.
 * - `excluded_sem_data` is surfaced (never dropped) — Pitfall 4.
 */
export function computeAdverseImpact(
  bands: BandInput[],
  opts: ComputeOptions = {},
): AdverseImpactResult {
  const excluded_sem_data = opts.excluded_sem_data ?? 0

  const withRate = bands.map((b) => ({
    faixa: b.faixa,
    applicants: b.applicants,
    selected: b.selected,
    selection_rate: b.applicants > 0 ? b.selected / b.applicants : 0,
  }))

  // Reference = the band with the highest selection rate.
  let referenceRate = 0
  let faixa_referencia: string | null = null
  for (const b of withRate) {
    if (b.selection_rate > referenceRate) {
      referenceRate = b.selection_rate
      faixa_referencia = b.faixa
    }
  }

  const resultBands: BandResult[] = withRate.map((b) => {
    const razao_4_5 = referenceRate > 0 ? b.selection_rate / referenceRate : 0
    const isReference = b.faixa === faixa_referencia
    return {
      faixa: b.faixa,
      applicants: b.applicants,
      selected: b.selected,
      selection_rate: b.selection_rate,
      razao_4_5,
      flag: !isReference && razao_4_5 < FOUR_FIFTHS_THRESHOLD,
    }
  })

  const small_sample_warning = bands.some((b) => b.applicants < SMALL_SAMPLE_FLOOR)
  const n_total =
    bands.reduce((acc, b) => acc + b.applicants, 0) + excluded_sem_data

  return {
    metodo: METODO,
    limitacao: LIMITACAO,
    bands: resultBands,
    faixa_referencia,
    small_sample_warning,
    excluded_sem_data,
    n_total,
  }
}
