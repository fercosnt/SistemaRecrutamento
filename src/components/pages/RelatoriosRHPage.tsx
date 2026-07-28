/**
 * /rh/relatorios — the operational KPI dashboard for the RH funnel (KPI-02/04).
 *
 * REPLACES the dead M1 client-side aggregation that used to live on this same route
 * (it read dropped M1 concepts and reduced candidaturas in the browser — a PII/scope
 * leak). The dashboard now sources EVERYTHING from the `funil_kpis` DEFINER RPC (7 keys,
 * vaga-scoped, PII-free by construction — 34-01) via `useFunilKpis`. There is NO
 * client-side aggregation here: the RPC returns aggregates only, never a candidate
 * identity. Structure mirrors `AiCostsPage` verbatim — 3 MetricCards + a chart grid
 * wrapped by `@/components/ui/chart` (never raw recharts containers) + loading/empty/error
 * states. A null taxa/time renders "—" (never a fabricated 0%, T-34-05-03).
 *
 * @module components/pages/RelatoriosRHPage
 * @see src/features/admin/ai-costs/components/AiCostsPage.tsx (the structure cloned)
 * @see src/features/funil/hooks/useFunilKpis.ts (the single RPC data path)
 */
import { useMemo } from 'react'
import { BarChart, Bar, CartesianGrid, XAxis } from 'recharts'
import { RHLayout } from '../RHLayout'
import { GlassCard } from '../ui/glass'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../ui/chart'
import { useFunilKpis } from '@/features/funil/hooks/useFunilKpis'

/** pt-BR labels for the funnel etapas (nicer axis ticks; unknown keys pass through). */
const ETAPA_LABEL: Record<string, string> = {
  inscricao: 'Inscrição',
  triagem: 'Triagem',
  avaliacao_assincrona: 'Avaliação',
  entrevista_online: 'Entr. online',
  entrevista_presencial: 'Entr. presencial',
  decisao_final: 'Decisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}
const etapaLabel = (etapa: string): string => ETAPA_LABEL[etapa] ?? etapa

/** seconds → days, rounded to 1 decimal (matches the metric-card unit). */
const toDays = (secs: number): number => Math.round((secs / 86400) * 10) / 10

/** A null time renders "—" (never a fabricated 0). */
const fmtDays = (secs: number | null): string => (secs == null ? '—' : `${toDays(secs)} dias`)

/** A null taxa renders "—" (never a misleading 0%). Fraction 0–1 → percent. */
const fmtPct = (taxa: number | null | undefined): string =>
  taxa == null ? '—' : `${(taxa * 100).toFixed(1)}%`

const volumeCfg: ChartConfig = { n: { label: 'Candidatos', color: 'var(--chart-1)' } }
const tempoCfg: ChartConfig = { dias: { label: 'Dias (mediana)', color: 'var(--chart-2)' } }
const conversaoCfg: ChartConfig = { n: { label: 'Transições', color: 'var(--chart-3)' } }
const dropCfg: ChartConfig = { taxa: { label: 'Drop (%)', color: 'var(--chart-5)' } }

export function RelatoriosRHPage() {
  // All-vagas default (p_vaga_id NULL). The optional per-vaga filter is deferred — the
  // RPC scopes to the recruiter's owned vagas either way.
  const { data, isLoading, isError, refetch } = useFunilKpis(null)

  const volumeData = useMemo(
    () =>
      Object.entries(data?.volume_by_stage ?? {}).map(([etapa, n]) => ({
        etapa: etapaLabel(etapa),
        n,
      })),
    [data],
  )

  const tempoData = useMemo(
    () =>
      Object.entries(data?.median_time_per_stage ?? {}).map(([etapa, secs]) => ({
        etapa: etapaLabel(etapa),
        dias: toDays(secs),
      })),
    [data],
  )

  const conversaoData = useMemo(
    () =>
      (data?.conversion_stage_to_stage ?? []).map((c) => ({
        fluxo: `${etapaLabel(c.de)} → ${etapaLabel(c.para)}`,
        n: c.n,
      })),
    [data],
  )

  const dropData = useMemo(
    () =>
      Object.entries(data?.drop_per_stage ?? {}).map(([etapa, d]) => ({
        etapa: etapaLabel(etapa),
        // null taxa (a stage with no exits yet) → 0-height bar; the metric cards own the "—".
        taxa: d.taxa == null ? 0 : Math.round(d.taxa * 1000) / 10,
      })),
    [data],
  )

  // Empty = every key empty/{}/null (no data yet) → render the empty state, never a 0-grid.
  const isEmpty = useMemo(() => {
    if (!data) return true
    return (
      Object.keys(data.median_time_per_stage ?? {}).length === 0 &&
      (data.conversion_stage_to_stage?.length ?? 0) === 0 &&
      Object.keys(data.volume_by_stage ?? {}).length === 0 &&
      data.time_to_hire == null &&
      (data.knockout_rate?.total ?? 0) === 0 &&
      Object.keys(data.drop_per_stage ?? {}).length === 0 &&
      (data.no_show_rate?.total ?? 0) === 0
    )
  }, [data])

  return (
    <RHLayout>
      <div className="space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[28px] font-semibold leading-tight text-white">
            Relatórios do funil
          </h1>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <GlassCard key={i}>
                <Skeleton className="h-56 w-full" />
              </GlassCard>
            ))}
          </div>
        ) : isError ? (
          <GlassCard>
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-base text-white/80">
                Não foi possível carregar os KPIs. Verifique sua conexão e tente novamente.
              </p>
              <Button onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          </GlassCard>
        ) : isEmpty ? (
          <GlassCard>
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <h2 className="text-xl font-semibold text-white">Sem dados no período</h2>
              <p className="max-w-2xl text-base text-white/70">
                Os KPIs aparecerão conforme os candidatos avançam pelo funil.
              </p>
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Metric cards — aggregates only, never a candidate identity. null → "—". */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <GlassCard className="space-y-1">
                <p className="text-sm text-white/70">Tempo até contratação</p>
                <p className="text-[28px] font-semibold leading-tight text-white">
                  {fmtDays(data?.time_to_hire ?? null)}
                </p>
              </GlassCard>
              <GlassCard className="space-y-1">
                <p className="text-sm text-white/70">Taxa de no-show</p>
                <p className="text-[28px] font-semibold leading-tight text-white">
                  {fmtPct(data?.no_show_rate?.taxa)}
                </p>
              </GlassCard>
              <GlassCard className="space-y-1">
                <p className="text-sm text-white/70">Taxa de knockout</p>
                <p className="text-[28px] font-semibold leading-tight text-white">
                  {fmtPct(data?.knockout_rate?.taxa)}
                </p>
              </GlassCard>
            </div>

            {/* Charts — every one wrapped by @/components/ui/chart (never raw recharts). */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <GlassCard className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Volume por etapa</h2>
                <ChartContainer config={volumeCfg} className="h-56 w-full">
                  <BarChart data={volumeData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="etapa" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="n" fill="var(--chart-1)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </GlassCard>

              <GlassCard className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Tempo mediano por etapa</h2>
                <ChartContainer config={tempoCfg} className="h-56 w-full">
                  <BarChart data={tempoData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="etapa" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="dias" fill="var(--chart-2)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </GlassCard>

              <GlassCard className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Conversão etapa a etapa</h2>
                <ChartContainer config={conversaoCfg} className="h-56 w-full">
                  <BarChart data={conversaoData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="fluxo" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="n" fill="var(--chart-3)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </GlassCard>

              <GlassCard className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Drop por etapa</h2>
                <ChartContainer config={dropCfg} className="h-56 w-full">
                  <BarChart data={dropData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="etapa" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="taxa" fill="var(--chart-5)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </RHLayout>
  )
}
