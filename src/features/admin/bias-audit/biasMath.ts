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

/**
 * Uma faixa PUBLICADA — a célula tem gente suficiente para ser divulgada.
 *
 * ⚠ `razao_4_5` e `flag` são OPCIONAIS no v2: quando a faixa de referência está suprimida,
 * a razão 4/5 do relatório inteiro cai (não há denominador publicável), e os campos derivados
 * não viajam. Tipá-los como obrigatórios foi o que produziu o defeito descrito no `motivo`
 * de `BandSuprimida`.
 */
export interface BandPublicada {
  faixa: string
  /** Ausente nos payloads v1 (pré-k5). Ausência ⇒ publicada. */
  suprimida?: false
  applicants: number
  selected: number
  selection_rate: number | null
  razao_4_5?: number | null
  flag?: boolean
}

/**
 * Uma faixa SUPRIMIDA por k-anonimato — o número some, o FATO de a faixa existir não.
 *
 * ⚠ NENHUM campo derivado viaja junto (`applicants`, `selected`, `selection_rate`,
 * `razao_4_5`, `flag`), e é isso que torna a supressão real: publicar a razão 4/5 de uma
 * célula suprimida devolveria a contagem por outro caminho.
 *
 * ⚠ **POR QUE ESTE TIPO EXISTE SEPARADO, e a razão é de produto, não de tipagem.** Antes
 * dele, `BandResult` declarava `applicants`/`razao_4_5` como `number` obrigatório, e o
 * consumidor lia direto: `formatRatio(band.razao_4_5)` chamava `.toFixed` em `undefined` e
 * **derrubava a página**, e `formatRate` devolvia `"NaN%"`. Numa peça probatória sobre
 * discriminação, os dois desfechos são inaceitáveis por razões diferentes — mas o pior
 * seria o terceiro, que a união fechada agora impede: uma faixa escondida **porque tem
 * menos de 5 pessoas** renderizada como "0 candidatos" afirma exatamente o oposto do que a
 * supressão significa. O `switch` sobre `suprimida` força o chamador a decidir o que
 * mostrar, em vez de deixá-lo cair num `undefined` que parece um zero.
 */
export interface BandSuprimida {
  faixa: string
  suprimida: true
  motivo_supressao: 'k_anonimato_primaria' | 'complementar'
}

/** Uma linha de faixa no snapshot — publicada ou suprimida. */
export type BandResult = BandPublicada | BandSuprimida

/** Discriminador único. Payload v1 (sem a chave) conta como publicada. */
export function bandaSuprimida(b: BandResult): b is BandSuprimida {
  return (b as BandSuprimida).suprimida === true
}

/** Optional accounting passed alongside the bands (Pitfall 4). */
export interface ComputeOptions {
  /** Count of candidates with a null/invalid birthdate, excluded from banding. */
  excluidos_sem_data?: number
}

/** The full adverse-impact snapshot payload (mirrors `bias_audit_log.dados`). */
export interface AdverseImpactResult {
  /** `eeoc_4_5_age_band_v2_k5` no v2; valor anterior nos snapshots v1. */
  metodo: string
  limitacao: string
  bands: BandResult[]
  /** ⚠ AUSENTE quando a própria faixa de referência foi suprimida (v2). */
  faixa_referencia?: string | null
  small_sample_warning: boolean
  /** pt-BR key — matches the SQL `jsonb_build_object('excluidos_sem_data', …)`. */
  excluidos_sem_data: number
  /**
   * Σ applicants ONLY — matches the SQL `v_n_total` (excluded count NOT added).
   *
   * ⚠ **AUSENTE quando existe supressão primária (v2), e a ausência É o mecanismo.**
   * O total marginal é a chave da subtração: com ele publicado, quem lê recupera a célula
   * suprimida somando as outras e subtraindo do total. Por isso o v2 tira `n_total` do
   * payload E suprime uma segunda célula (a complementar) — duas incógnitas para uma
   * equação. Suprimir só a célula não suprime nada.
   */
  n_total?: number

  // ── Campos do v2 (`eeoc_4_5_age_band_v2_k5`). Ausentes nos snapshots v1. ──
  /** Limiar de k-anonimato aplicado (5). */
  k_supressao?: number
  /** Quantas células saíram do relatório, primárias + complementar. */
  celulas_suprimidas?: number
  /** Se a segunda supressão (anti-subtração) foi necessária. */
  supressao_complementar_aplicada?: boolean
  /** `true` quando `n_total` foi retirado por existir supressão primária. */
  n_total_suprimido?: boolean
  /** `true` quando a faixa de MAIOR taxa caiu abaixo de k — a razão 4/5 do relatório cai junto. */
  faixa_referencia_suprimida?: boolean
}

// NOTE (FX-15 — Phase 16): the TypeScript parity-oracle functions `bandFromAge` and
// `computeAdverseImpact` lived here historically. They had ZERO non-test production
// callers (the live computation runs server-side in the `gerar_bias_snapshot` SQL RPC)
// and were removed. The exported TYPES + constants above are the live contract —
// `biasAuditService.ts` + `BiasAuditPage.tsx` import `AdverseImpactResult` / `BandResult`.
