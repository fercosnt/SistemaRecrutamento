/**
 * biasMath — EEOC 4/5 adverse-impact TYPE module (LGPD-03).
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
 *
 * ── LIVE SCORER vs THIS MODULE (WR-02 / FX-15) ── the LIVE bias scorer is the
 * server-side `gerar_bias_snapshot` SQL RPC; `BiasAuditPage` renders the SQL-produced
 * jsonb directly. The TypeScript parity-oracle functions (`computeAdverseImpact`,
 * `bandFromAge`) that this module used to host had ZERO non-test production callers
 * and were removed in Phase 16 (FX-15). What REMAINS — and is LIVE — is the shape
 * contract: `AdverseImpactResult` + `BandResult` (and the supporting types/constants)
 * are imported by `biasAuditService.ts` (the snapshot `dados` type + CSV export) and
 * `BiasAuditPage.tsx` (the rendered band rows). The fields stay byte-aligned to the
 * SQL truth (`excluidos_sem_data` pt-BR key; `n_total` = Σ applicants only).
 * NO DB/network imports — pure type declarations + constants.
 *
 * @module features/admin/bias-audit/biasMath
 * @see src/features/admin/bias-audit/services/biasAuditService.ts (live type consumer)
 * @see src/features/admin/bias-audit/components/BiasAuditPage.tsx (live type consumer)
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
  excluidos_sem_data?: number
}

/** The full adverse-impact snapshot payload (mirrors `bias_audit_log.dados`). */
export interface AdverseImpactResult {
  metodo: string
  limitacao: string
  bands: BandResult[]
  faixa_referencia: string | null
  small_sample_warning: boolean
  /** pt-BR key — matches the SQL `jsonb_build_object('excluidos_sem_data', …)`. */
  excluidos_sem_data: number
  /** Σ applicants ONLY — matches the SQL `v_n_total` (excluded count NOT added). */
  n_total: number
}

// NOTE (FX-15 — Phase 16): the TypeScript parity-oracle functions `bandFromAge` and
// `computeAdverseImpact` lived here historically. They had ZERO non-test production
// callers (the live computation runs server-side in the `gerar_bias_snapshot` SQL RPC)
// and were removed. The exported TYPES + constants above are the live contract —
// `biasAuditService.ts` + `BiasAuditPage.tsx` import `AdverseImpactResult` / `BandResult`.
