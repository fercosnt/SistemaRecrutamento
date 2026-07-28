/**
 * RedacaoCorBadge — the RH 3-color triage chip (verde/amarelo/vermelho) + the
 * vermelho top badge whose tooltip names the firing rule (AVAL-07 / RF-R-17/23/26).
 *
 * The 3-color triage is RH-facing ONLY — it is the review-priority signal, never a
 * candidate verdict (RNF-07a). Tints copied from the `SugestaoIABadge` Badge+cn
 * convention (UI-SPEC §RH 3-color triage system):
 *   verde    → emerald-500/15  ·  amarelo → amber-500/15  ·  vermelho → red-500/15.
 *
 * @module features/triagem/components/RedacaoCorBadge
 * @see src/features/triagem/components/SugestaoIABadge.tsx (Badge tint convention)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md (§Color)
 */
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/components/ui/utils'
import type { RedacaoCor } from '../services/revisaoRedacaoService'

/** The 3 triage tints (UI-SPEC §Color — RH-facing only). */
const COR_TINT: Record<RedacaoCor, string> = {
  verde: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  amarelo: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  vermelho: 'bg-red-500/15 text-red-300 border-red-400/30',
}

const COR_LABEL: Record<RedacaoCor, string> = {
  verde: 'Verde',
  amarelo: 'Amarela',
  vermelho: 'Vermelha',
}

export interface RedacaoCorBadgeProps {
  cor: RedacaoCor | null
  className?: string
}

/** The small color chip used in the sidebar + per-row. RH-facing only. */
export function RedacaoCorBadge({ cor, className }: RedacaoCorBadgeProps) {
  const c = (cor ?? 'verde') as RedacaoCor
  return (
    <Badge
      className={cn('text-xs font-semibold leading-[1.4]', COR_TINT[c], className)}
      aria-label={`Triagem ${COR_LABEL[c]}`}
    >
      {COR_LABEL[c]}
    </Badge>
  )
}

/**
 * Derives the human-readable firing-rule for a vermelho row (UI-SPEC: "score ≤40" /
 * "red flag ético" / "D1≤2"). The earliest-firing rule wins for the tooltip text.
 */
export function regraVermelho({
  score,
  redFlagEtico,
  d1,
}: {
  score?: number | null
  redFlagEtico?: boolean
  d1?: number | null
}): string {
  if (redFlagEtico) return 'red flag ético'
  if (typeof d1 === 'number' && d1 <= 2) return 'D1≤2'
  if (typeof score === 'number' && score <= 40) return 'score ≤40'
  return 'revisão obrigatória'
}

export interface RedacaoVermelhoBadgeProps {
  /** The firing rule that marked this essay vermelho (for the tooltip). */
  regra: string
  className?: string
}

/**
 * The top-of-essay vermelho badge with the rule tooltip (UI-SPEC §Color +
 * §Copywriting Contract — "Marcada como vermelha por: {regra}. Revisão humana
 * obrigatória antes de avançar.").
 */
export function RedacaoVermelhoBadge({ regra, className }: RedacaoVermelhoBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              'gap-1 text-xs font-semibold leading-[1.4] cursor-default',
              COR_TINT.vermelho,
              className,
            )}
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Vermelha
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Marcada como vermelha por: {regra}. Revisão humana obrigatória antes de avançar.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
