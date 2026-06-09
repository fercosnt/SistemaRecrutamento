/**
 * ScorecardAvaliacao — the RH-facing read-only SJT scorecard (AVAL-02/03).
 *
 * Desktop RH shell (NOT the candidate glass shell — inherits the Phase-10 panel
 * contract). Renders the deterministic MC per-item breakdown + the open-case BARS
 * dimensions (1-5 → composite 0-25) + citations/red_flags from `metadata`, in a
 * NEUTRAL/structured presentation (no red/green pass-fail tints). Every AI-derived
 * block carries the reused `SugestaoIABadge` (RNF-07a — full on the panel header,
 * compact inline on each AI dimension). When a row is `pendente_humano` it surfaces
 * a neutral "Requer revisão humana" marker — the system never auto-rejects and
 * never changes etapa by score. The candidate never reaches this surface (RLS +
 * allowlist deny in `scoresRhService`).
 *
 * @module features/avaliacao/components/ScorecardAvaliacao
 * @see src/features/triagem/components/SugestaoIABadge.tsx (reused verbatim — not re-authored)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-UI-SPEC.md (§RH Scorecard View)
 */
import { CircleDashed } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import { useScorecardCandidato } from '../hooks/useScorecardCandidato'
import {
  isBigFiveRow,
  type ScoreRow,
  type McMetadata,
  type CasoAbertoMetadata,
  type BigFiveMetadata,
} from '../services/scoresRhService'

export interface ScorecardAvaliacaoProps {
  candidaturaId: string
  className?: string
}

/** Neutral copy for the human-review marker (RNF-07a — never auto-rejects). */
const REQUER_REVISAO_COPY = 'Requer revisão humana'

/** Neutral marker shown when a score row is `pendente_humano`. */
function RevisaoHumanaMarker() {
  return (
    <Badge className="gap-1 border-white/20 bg-white/5 text-white/80 text-xs font-semibold">
      <CircleDashed className="h-3 w-3" aria-hidden="true" />
      {REQUER_REVISAO_COPY}
    </Badge>
  )
}

/** A neutral score display "x / max" — never tinted red/green. */
function ScoreValue({
  score,
  scoreMax,
}: {
  score: number | null
  scoreMax: number | null
}) {
  if (score == null) {
    return <span className="text-white/50">—</span>
  }
  return (
    <span className="font-semibold text-white">
      {score}
      {scoreMax != null ? <span className="text-white/50"> / {scoreMax}</span> : null}
    </span>
  )
}

/** MC per-item breakdown card (subtipo='mc'). */
function McBreakdown({ row }: { row: ScoreRow }) {
  const meta = (row.metadata ?? {}) as McMetadata
  const respostas = meta.respostas ?? []
  const pendente = row.status === 'pendente_humano'
  const falhou = row.status === 'falhou'

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-white">Múltipla escolha</CardTitle>
          {/* MC scoring is purely deterministic (Σ peso) — NO AI. No SugestaoIABadge here
              (UI-review fix: the badge belongs only on AI-derived blocks / CasoAbertoBreakdown). */}
          <div className="flex items-center gap-2">
            {pendente ? <RevisaoHumanaMarker /> : null}
          </div>
        </div>
        <CardDescription className="text-white/70">
          {falhou ? (
            'Pontuação indisponível'
          ) : (
            <>
              Pontuação: <ScoreValue score={row.score} scoreMax={row.score_max} />
            </>
          )}
        </CardDescription>
      </CardHeader>
      {!falhou && respostas.length > 0 ? (
        <CardContent>
          <ul className="divide-y divide-white/10">
            {respostas.map((item, i) => (
              <li
                key={`${item.pergunta_id}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="text-white/80">Item {i + 1}</span>
                <span className="flex items-center gap-2">
                  <Badge className="border-white/15 bg-white/5 text-white/70 text-xs">
                    {item.tag}
                  </Badge>
                  <span className="text-white/60">peso {item.peso}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  )
}

/** Open-case BARS card (subtipo='caso_aberto'): dimensions + composite + citations/red_flags. */
function CasoAbertoBreakdown({ row }: { row: ScoreRow }) {
  const meta = (row.metadata ?? {}) as CasoAbertoMetadata
  const dimensions = meta.dimension_scores ?? []
  const composite = meta.composite_0_25 ?? row.score
  const pendente = row.status === 'pendente_humano'
  const falhou = row.status === 'falhou'
  const citacoes = Array.isArray(row.citacoes) ? (row.citacoes as unknown[]) : []
  const redFlags = Array.isArray(row.red_flags) ? (row.red_flags as unknown[]) : []

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-white">Caso aberto (BARS)</CardTitle>
          <div className="flex items-center gap-2">
            <SugestaoIABadge variant="full" />
            {pendente ? <RevisaoHumanaMarker /> : null}
          </div>
        </div>
        <CardDescription className="text-white/70">
          {falhou ? (
            'Pontuação indisponível'
          ) : (
            <>
              Composto:{' '}
              <span className="font-semibold text-white">
                {composite ?? '—'}
                <span className="text-white/50"> / 25</span>
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      {!falhou ? (
        <CardContent className="space-y-4">
          {dimensions.length > 0 ? (
            <ul className="space-y-3">
              {dimensions.map((dim, i) => (
                <li key={`${dim.dimension}-${i}`} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white/90">{dim.dimension}</span>
                    <span className="flex items-center gap-2">
                      <SugestaoIABadge variant="compact" />
                      <span className="font-semibold text-white">
                        {dim.score_1_5}
                        <span className="text-white/50"> / 5</span>
                      </span>
                      {dim.level ? (
                        <Badge className="border-white/15 bg-white/5 text-white/70 text-xs">
                          {dim.level}
                        </Badge>
                      ) : null}
                    </span>
                  </div>
                  {dim.reasoning ? (
                    <p className="text-sm text-white/60">{dim.reasoning}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {citacoes.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Citações
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-white/70">
                {citacoes.map((c, i) => (
                  <li key={i}>{typeof c === 'string' ? c : JSON.stringify(c)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {redFlags.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Red flags
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-white/70">
                {redFlags.map((f, i) => (
                  <li key={i}>{typeof f === 'string' ? f : JSON.stringify(f)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  )
}

/** Candidate-facing dimension labels — "N" is "Sensibilidade Emocional" (LGPD-04). */
const BIGFIVE_DIM_LABEL: Record<string, string> = {
  O: 'Abertura à Experiência',
  C: 'Conscienciosidade',
  E: 'Extroversão',
  A: 'Amabilidade',
  N: 'Sensibilidade Emocional',
}

const BIGFIVE_BANDA_LABEL: Record<string, string> = {
  muito_baixo: 'Muito baixo',
  mod_baixo: 'Moderadamente baixo',
  medio: 'Médio',
  mod_alto: 'Moderadamente alto',
  muito_alto: 'Muito alto',
}

/**
 * Big Five contextual card (tipo='big_five'). Marked CONTEXTUAL / não-eliminatório
 * (RNF-07a) — the traits NEVER drive a pass/fail. The SugestaoIABadge appears ONLY
 * on the AI-polished executive summary, NOT on the raw percentil rows. Reads via
 * the `scoresRhService` allowlist (never `select('*')`).
 */
function BigFiveBreakdown({ row }: { row: ScoreRow }) {
  const meta = (row.metadata ?? {}) as BigFiveMetadata
  const dimensoes = meta.dimensoes ?? []
  const resumo = meta.resumo_executivo

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-white">Perfil comportamental (Big Five)</CardTitle>
          <Badge className="border-white/15 bg-white/5 text-white/70 text-xs font-semibold">
            Contextual · não-eliminatório
          </Badge>
        </div>
        <CardDescription className="text-white/70">
          Sinaliza estilo de trabalho — não decide a etapa. Decisão sempre humana.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {dimensoes.length > 0 ? (
          <ul className="space-y-2">
            {dimensoes.map((d, i) => (
              <li
                key={`${d.dim}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                {/* Raw percentil rows are NOT AI-derived → no SugestaoIABadge here. */}
                <span className="font-medium text-white/90">
                  {BIGFIVE_DIM_LABEL[d.dim] ?? d.dim}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-white/70">Percentil {d.percentil}</span>
                  <Badge className="border-white/15 bg-white/5 text-white/70 text-xs">
                    {BIGFIVE_BANDA_LABEL[d.banda] ?? d.banda}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/60">Perfil ainda não disponível.</p>
        )}

        {resumo ? (
          <div className="space-y-1 border-t border-white/10 pt-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Resumo
              </p>
              {/* SugestaoIABadge ONLY on the AI-polished text block. */}
              <SugestaoIABadge variant="compact" />
            </div>
            <p className="text-sm text-white/70">{resumo}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

/**
 * RH read-only scorecard for the SJT scores of one candidatura. Structured,
 * neutral, AI-as-suggestion (RNF-07a) — never an auto-decision.
 */
export function ScorecardAvaliacao({
  candidaturaId,
  className,
}: ScorecardAvaliacaoProps) {
  const { data, isLoading, isError } = useScorecardCandidato(candidaturaId)

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-24 w-full bg-white/5" />
        <Skeleton className="h-40 w-full bg-white/5" />
      </div>
    )
  }

  if (isError) {
    return (
      <p className={cn('text-sm text-white/60', className)}>
        Não foi possível carregar as avaliações.
      </p>
    )
  }

  const rows = data ?? []
  if (rows.length === 0) {
    return (
      <p className={cn('text-sm text-white/60', className)}>
        Sem avaliações registradas ainda.
      </p>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {rows.map((row) =>
        isBigFiveRow(row) ? (
          <BigFiveBreakdown key={row.id} row={row} />
        ) : row.subtipo === 'mc' ? (
          <McBreakdown key={row.id} row={row} />
        ) : (
          <CasoAbertoBreakdown key={row.id} row={row} />
        ),
      )}
    </div>
  )
}
