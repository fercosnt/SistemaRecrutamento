/**
 * ConsolidacaoDashboard — renders the `consolidar-decisao-final` EF output (DECISAO-01).
 *
 * Three zones:
 *   1. Hero CONSOLIDATED SCORE — `text-3xl` neutral white, NO red/green tint (it is an
 *      AGGREGATE, not a verdict), with the caption "Agregado ponderado — não re-pontuado".
 *   2. Per-etapa BREAKDOWN — neutral `ScorecardAvaliacao`-style badges
 *      (`border-white/15 bg-white/5 text-white/70`); a missing/unapplied etapa renders a
 *      neutral "N/A" pill + tooltip ("Etapa não aplicada — não pondera no agregado").
 *      Context rows (big_five/cognitivo) are marked contextual (never weighted).
 *   3. RECOMMENDATION block — carries `SugestaoIABadge variant="full"` (the ONLY place
 *      the advisory badge appears — never on the score or breakdown rows) + the advisory
 *      note. The recommendation is advisory; the decision is always human (RNF-07a).
 *
 * NEVER re-scores — reads already-recorded scores via the EF. Loading / error / empty
 * states use the exact 15-UI-SPEC copy.
 *
 * @module features/decisao/components/ConsolidacaoDashboard
 * @see src/features/avaliacao/components/ScorecardAvaliacao.tsx (neutral badge pattern)
 * @see src/features/triagem/components/SugestaoIABadge.tsx (advisory badge — recommendation only)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-UI-SPEC.md (copy + color)
 */
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { GlassButton } from '@/components/ui/glass'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import { useConsolidacao } from '../hooks/useConsolidacao'
import type { ConsolidacaoBreakdownRow } from '../schemas/consolidacaoSchema'

export interface ConsolidacaoDashboardProps {
  candidaturaId: string
  vagaId: string | undefined
}

/** pt-BR labels for the breakdown etapa keys. */
const ETAPA_LABEL: Record<string, string> = {
  triagem: 'Triagem',
  work_sample_sjt: 'Work sample (SJT)',
  redacao_cultural: 'Redação cultural',
  entrevista: 'Entrevista',
  big_five: 'Perfil comportamental',
  cognitivo: 'Cognitivo',
}

/** A single breakdown row — neutral presentation, N/A pill for missing etapas. */
function BreakdownRow({ row }: { row: ConsolidacaoBreakdownRow }) {
  const label = ETAPA_LABEL[row.etapa] ?? row.etapa

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <span className="font-medium text-white/90">{label}</span>
      <span className="flex items-center gap-2">
        {row.status === 'present' ? (
          <>
            <Badge className="border-white/15 bg-white/5 text-white/70 text-xs font-semibold">
              {row.normalized != null ? `${row.normalized} / 100` : '—'}
            </Badge>
            {row.weight != null ? (
              <span className="text-white/60">peso {row.weight}%</span>
            ) : null}
          </>
        ) : row.status === 'context' ? (
          <Badge className="border-white/15 bg-white/5 text-white/60 text-xs font-semibold">
            Contextual · não pondera
          </Badge>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="border-white/20 bg-white/5 text-white/60 text-xs font-semibold cursor-help">
                  N/A
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Etapa não aplicada — não pondera no agregado</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>
    </li>
  )
}

export function ConsolidacaoDashboard({ candidaturaId, vagaId }: ConsolidacaoDashboardProps) {
  const { data, isLoading, isError, refetch } = useConsolidacao(candidaturaId, vagaId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full bg-white/5" />
        <Skeleton className="h-40 w-full bg-white/5" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center text-white/80">
        <AlertTriangle className="h-8 w-8 text-red-300" aria-hidden="true" />
        <p className="font-semibold text-white">Não foi possível carregar a consolidação.</p>
        <p>Verifique a conexão e tente novamente.</p>
        <GlassButton onClick={() => refetch()}>Tentar novamente</GlassButton>
      </div>
    )
  }

  const breakdown = data?.breakdown ?? []
  const hasAnyPresent = breakdown.some((r) => r.status === 'present')

  // Empty state — no scorecards yet to consolidate.
  if (!hasAnyPresent) {
    return (
      <div className="space-y-2 p-12 text-center text-white/80">
        <p className="text-xl font-semibold text-white">Ainda não há scorecards para consolidar</p>
        <p>
          Os scorecards das etapas concluídas aparecerão aqui. A decisão final pode ser registrada
          mesmo com etapas não aplicadas (marcadas como N/A).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero consolidated score — neutral, NO tint. */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
          Score consolidado
        </p>
        <p className="text-3xl font-semibold text-white">
          {data?.consolidated != null ? data.consolidated : '—'}
        </p>
        <p className="text-sm text-white/60">Agregado ponderado — não re-pontuado</p>
      </div>

      {/* Per-etapa breakdown — neutral badges + N/A pill. */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-white">Breakdown por etapa</h3>
        <ul className="divide-y divide-white/10">
          {breakdown.map((row) => (
            <BreakdownRow key={row.etapa} row={row} />
          ))}
        </ul>
      </div>

      {/* Recommendation — the ONLY SugestaoIABadge placement. */}
      <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-semibold text-white">Recomendação</h3>
          <SugestaoIABadge variant="full" />
        </div>
        <p className="text-base leading-relaxed text-white/80">{data?.recommendation}</p>
        <p className="text-sm text-white/60">
          Esta recomendação é gerada a partir do breakdown — a decisão é sempre humana.
        </p>
      </div>
    </div>
  )
}
