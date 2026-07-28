/**
 * SlaBadge — the aging / SLA-breach indicator for the Fila work queue (KPI-03).
 *
 * Computes whole-days-in-stage from `entrouEtapaEm` (date-fns) and classifies it against
 * the per-etapa `SLA_POR_ETAPA` threshold via the pure `classifySla`:
 *   aging  → amber "Atenção · {n}d"
 *   breach → red   "Atrasado · {n}d"
 *   within → subtle "{n}d" (no color emphasis)
 *
 * COLORBLIND-SAFE INVARIANT (T-34-04-03, the `ScoreCell` rule): the badge ALWAYS carries
 * a text label + the day count in the same element — color is never the sole channel.
 *
 * @module features/funil/components/SlaBadge
 * @see src/features/funil/constants/slaThresholds.ts (SLA_POR_ETAPA + classifySla + diasNaEtapa)
 * @see .planning/phases/34-.../34-UI-SPEC.md (§Color — SLA aging/breach + §Accessibility)
 */
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/utils'
import { classifySla, diasNaEtapa } from '../constants/slaThresholds'

export interface SlaBadgeProps {
  /** The candidatura's current etapa (drives the threshold). */
  etapa: string
  /** ISO timestamp of the latest transition INTO the current stage. */
  entrouEtapaEm: string
}

/** Amber / red glass palettes (UI-SPEC §Color — data-encoding, not the accent budget). */
const AGING_CLASSES = 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'
const BREACH_CLASSES = 'bg-red-500/20 text-red-300 border-red-500/30'

export function SlaBadge({ etapa, entrouEtapaEm }: SlaBadgeProps) {
  const dias = diasNaEtapa(entrouEtapaEm)
  const level = classifySla(etapa, dias)

  if (level === 'breach') {
    return (
      <Badge variant="outline" className={cn(BREACH_CLASSES)}>
        <AlertTriangle aria-hidden="true" />
        Atrasado · {dias}d
      </Badge>
    )
  }

  if (level === 'aging') {
    return (
      <Badge variant="outline" className={cn(AGING_CLASSES)}>
        Atenção · {dias}d
      </Badge>
    )
  }

  // within — subtle, still carries the day count (never blank, never color-only).
  return <span className="text-sm text-white/50">{dias}d</span>
}
