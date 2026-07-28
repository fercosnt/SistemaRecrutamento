/**
 * SLA thresholds + classifier for the cross-vaga work queue (KPI-03).
 *
 * v1 thresholds are HARDCODED per-etapa (CONTEXT Area 3 — per-vaga config is deferred
 * to backlog). `classifySla` is a pure function that turns a day-count-in-stage into one
 * of three levels the Fila SLA badge renders:
 *
 *   within  → dias < threshold                       (no badge / subtle)
 *   aging   → threshold <= dias <= 1.5 × threshold   (amber "Atenção · {n}d")
 *   breach  → dias > 1.5 × threshold                 (red "Atrasado · {n}d")
 *
 * An etapa with no configured threshold (inscricao, aprovado, rejeitado, or any unknown
 * string) always resolves to `within` — the classifier never throws. The badge is always
 * colorblind-safe: it carries a text label + the day count, never color alone.
 *
 * @module features/funil/constants/slaThresholds
 * @see .planning/phases/34-.../34-UI-SPEC.md (§Surface 3 — SLA badge thresholds)
 */
import { differenceInCalendarDays } from 'date-fns'
import type { EtapaFunilM2 } from '@/features/triagem/services/triagemService'

/** The SLA level a candidatura's time-in-stage classifies into. */
export type SlaLevel = 'within' | 'aging' | 'breach'

/**
 * Recommended default day thresholds per WORKING etapa (UI-SPEC §Surface 3). Only the
 * five actionable etapas are thresholded; `inscricao` and the terminals (aprovado/
 * rejeitado) are intentionally absent → `within` by construction.
 */
export const SLA_POR_ETAPA: Partial<Record<EtapaFunilM2, number>> = {
  triagem: 3,
  avaliacao_assincrona: 5,
  entrevista_online: 4,
  entrevista_presencial: 4,
  decisao_final: 3,
}

/** The breach multiplier: dias beyond 1.5× the etapa threshold is a breach. */
const BREACH_FACTOR = 1.5

/**
 * Classifies a day-count-in-stage against the etapa's SLA threshold.
 * Pure + total: an etapa with no configured threshold returns `within` (never throws).
 */
export function classifySla(etapa: string, dias: number): SlaLevel {
  const threshold = SLA_POR_ETAPA[etapa as EtapaFunilM2]
  if (threshold === undefined) return 'within'
  if (dias > BREACH_FACTOR * threshold) return 'breach'
  if (dias >= threshold) return 'aging'
  return 'within'
}

/**
 * Whole-calendar-days a candidatura has been sitting in its current stage.
 * Clamps negatives (clock skew / future timestamp) to 0. `entrouEtapaEm` is the ISO
 * timestamp from `v_fila_trabalho.entrou_etapa_em` (latest transition into the stage).
 */
export function diasNaEtapa(entrouEtapaEm: string, now: Date = new Date()): number {
  const dias = differenceInCalendarDays(now, new Date(entrouEtapaEm))
  return dias < 0 ? 0 : dias
}
