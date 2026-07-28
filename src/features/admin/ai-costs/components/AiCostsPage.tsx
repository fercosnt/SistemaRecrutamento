/**
 * /admin/ai-costs — dashboard recharts de ai_cost_daily + tabela paginada.
 *
 * Gated por RoleGuard role="administrador" (rota). Lê via aiCostsService com
 * allowlist explícito. Três gráficos (linha = custo diário, barra = top 10
 * vagas, pizza = por tipo de chamada) via o wrapper vendado chart.tsx usando os
 * tokens --chart-1..5. Empty state é o estado default no ship (agregação roda
 * via pg_cron). Copy verbatim do UI-SPEC §Copywriting.
 *
 * @module features/admin/ai-costs/components/AiCostsPage
 */

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import { RHLayout } from '../../../../components/RHLayout'
import { GlassCard } from '../../../../components/ui/glass'
import { Button } from '../../../../components/ui/button'
import { Skeleton } from '../../../../components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../../../components/ui/chart'
import { useAiCosts } from '../hooks/useAiCosts'
import { currentMonth, type AiCostDailyRow } from '../services/aiCostsService'

const CALL_TYPE_LABELS: Record<string, string> = {
  cv_summary: 'Resumo de currículo',
  cv_job_match: 'Aderência à vaga',
  comparative_ranking: 'Ranking comparativo',
  interview_guide: 'Roteiro de entrevista',
  transcript_analysis: 'Análise de transcrição',
  culture_fit_essay: 'Fit cultural',
  work_sample_sjt: 'Amostra de trabalho',
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const chartConfig: ChartConfig = {
  custo: { label: 'Custo (US$)', color: 'var(--chart-2)' },
}

// Guardrails (PRD §2.4 / RNF-10): R$ 0,50/candidato baseline, R$ 1,00 p95.
const GUARDRAIL_P95_USD = 0.2 // referência diária aproximada para a linha de p95

function buildMonthOptions(): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

function formatUSD(usd: number): string {
  return `US$ ${usd.toFixed(4)}`
}

export function AiCostsPage() {
  const [month, setMonth] = useState<string>(currentMonth())
  const { data, isLoading, isError, refetch } = useAiCosts(month)
  const rows = useMemo(() => data ?? [], [data])

  const dailySeries = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.date, (map.get(r.date) ?? 0) + r.total_cost_usd)
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, custo]) => ({ date: date.slice(8), custo: Number(custo.toFixed(6)) }))
  }, [rows])

  const topVagas = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      const key = r.vaga_id ?? 'sem-vaga'
      map.set(key, (map.get(key) ?? 0) + r.total_cost_usd)
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([vaga, custo]) => ({ vaga: vaga.slice(0, 8), custo: Number(custo.toFixed(6)) }))
  }, [rows])

  const byCallType = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.call_type, (map.get(r.call_type) ?? 0) + r.total_cost_usd)
    return Array.from(map.entries()).map(([ct, custo]) => ({
      name: CALL_TYPE_LABELS[ct] ?? ct,
      value: Number(custo.toFixed(6)),
    }))
  }, [rows])

  const monthOptions = useMemo(() => buildMonthOptions(), [])

  return (
    <RHLayout>
      <div className="space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[28px] font-semibold leading-tight text-white">Custos de IA</h1>
          <div className="w-48">
            <Select value={month} onValueChange={(v: string) => setMonth(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                Não foi possível carregar os dados. Verifique sua conexão e tente novamente.
              </p>
              <Button onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          </GlassCard>
        ) : rows.length === 0 ? (
          <GlassCard>
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <h2 className="text-xl font-semibold text-white">Sem dados de custo no período</h2>
              <p className="max-w-2xl text-base text-white/70">
                A agregação diária de custo roda via pg_cron às 01:30 UTC. Selecione outro mês ou
                aguarde a primeira execução.
              </p>
            </div>
          </GlassCard>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <GlassCard className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Custo diário</h2>
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <LineChart data={dailySeries}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ReferenceLine
                      y={GUARDRAIL_P95_USD}
                      stroke="var(--chart-5)"
                      strokeDasharray="4 4"
                      label="p95"
                    />
                    <Line
                      type="monotone"
                      dataKey="custo"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </GlassCard>

              <GlassCard className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Top 10 vagas</h2>
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <BarChart data={topVagas}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="vaga" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="custo" fill="var(--chart-1)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </GlassCard>

              <GlassCard className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Por tipo de chamada</h2>
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie data={byCallType} dataKey="value" nameKey="name" outerRadius={80}>
                      {byCallType.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </GlassCard>
            </div>

            <GlassCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Chamadas</TableHead>
                    <TableHead>Tokens in</TableHead>
                    <TableHead>Tokens out</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row: AiCostDailyRow) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">{row.date}</TableCell>
                      <TableCell className="font-mono text-sm">{row.vaga_id ?? '—'}</TableCell>
                      <TableCell>{CALL_TYPE_LABELS[row.call_type] ?? row.call_type}</TableCell>
                      <TableCell>{row.provider}</TableCell>
                      <TableCell>{row.call_count}</TableCell>
                      <TableCell>{row.total_input_tokens}</TableCell>
                      <TableCell>{row.total_output_tokens}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatUSD(row.total_cost_usd)}
                      </TableCell>
                      <TableCell>{row.error_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </GlassCard>
          </>
        )}
      </div>
    </RHLayout>
  )
}
