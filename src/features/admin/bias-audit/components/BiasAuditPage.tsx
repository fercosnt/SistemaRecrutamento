/**
 * /admin/bias-audit — auditoria de viés (LGPD-03), admin-only.
 *
 * Copia o AiCostsPage VERBATIM em estrutura (RHLayout + GlassCard + Table + estados
 * loading/error/empty). Mostra o último snapshot de `bias_audit_log`: selection rate
 * por FAIXA ETÁRIA com a razão 4/5 (EEOC). NÃO usa charts library — a tabela basta (V1).
 *
 * Invariantes:
 *  - Banner de LIMITAÇÃO sempre visível (honesto): apenas faixa etária; raça/gênero NÃO
 *    são coletados (minimização — LGPD-01). Nunca escondido (T-15-18).
 *  - Linhas com razao_4_5 < 0,8 recebem tint destrutivo + tooltip (regra 4/5 EEOC).
 *  - A faixa de referência (maior taxa) é neutra + micro-label "referência (maior taxa)".
 *  - "Gerar snapshot" (RPC admin gerar_bias_snapshot) + "Exportar CSV" (blob idiom),
 *    ambos min-h-[44px].
 *  - Route gate RoleGuard role="administrador" é cabeado na Plan 06.
 *
 * Copy pt-BR verbatim do 15-UI-SPEC §Admin bias-audit.
 *
 * @module features/admin/bias-audit/components/BiasAuditPage
 * @see src/features/admin/ai-costs/components/AiCostsPage.tsx (analog estrutural)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-UI-SPEC.md (copy + color)
 */

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { RHLayout } from '@/components/RHLayout'
import { GlassCard, GlassButton } from '@/components/ui/glass'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useGerarBiasSnapshot, useLatestBiasSnapshot } from '../hooks/useBiasAudit'
import { currentPeriod, exportCsv } from '../services/biasAuditService'
import type { BandResult } from '../biasMath'

/** Formata a selection rate como percentual pt-BR (ex.: 0,35 → "35,0%"). */
function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1).replace('.', ',')}%`
}

/** Formata a razão 4/5 com 2 casas pt-BR (ex.: 0.7 → "0,70"). */
function formatRatio(ratio: number): string {
  return ratio.toFixed(2).replace('.', ',')
}

/** Formata uma data ISO para dd/mm/aaaa. */
function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

export function BiasAuditPage() {
  const { data: snapshot, isLoading, isError, refetch } = useLatestBiasSnapshot()
  const gerar = useGerarBiasSnapshot()

  const bands = useMemo<BandResult[]>(() => snapshot?.dados?.bands ?? [], [snapshot])
  const faixaReferencia = snapshot?.dados?.faixa_referencia ?? null
  const periodo = snapshot?.periodo ?? null

  function handleGerar() {
    gerar.mutate(periodo ?? currentPeriod())
  }

  function handleExport() {
    if (snapshot?.dados) exportCsv(snapshot.dados, snapshot.periodo)
  }

  return (
    <RHLayout>
      <div className="space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[28px] font-semibold leading-tight text-white">Auditoria de viés</h1>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleGerar}
              disabled={gerar.isPending}
              className="min-h-[44px]"
            >
              {gerar.isPending ? 'Gerando…' : 'Gerar snapshot'}
            </Button>
            <GlassButton
              onClick={handleExport}
              disabled={!snapshot?.dados || bands.length === 0}
              className="min-h-[44px]"
            >
              Exportar CSV
            </GlassButton>
          </div>
        </header>

        {/* Banner de limitação — SEMPRE visível, honesto (T-15-18 / LGPD-01). */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="leading-relaxed">
            <span className="font-semibold">Esta auditoria considera apenas faixa etária.</span>{' '}
            Raça e gênero não são coletados (minimização de dados — LGPD). A análise de outras
            dimensões depende de coleta com consentimento e está fora do escopo atual.
          </p>
        </div>

        {isLoading ? (
          <GlassCard>
            <Skeleton className="h-56 w-full" />
          </GlassCard>
        ) : isError ? (
          <GlassCard>
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-base text-white/80">
                Não foi possível carregar os dados. Verifique sua conexão e tente novamente.
              </p>
              <Button onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          </GlassCard>
        ) : !snapshot || bands.length === 0 ? (
          <GlassCard>
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <h2 className="text-xl font-semibold text-white">Nenhum snapshot ainda</h2>
              <p className="max-w-2xl text-base text-white/70">
                Gere o primeiro snapshot para registrar a selection rate por faixa etária.
              </p>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold text-white">
                Selection rate por faixa etária{' '}
                <span className="text-sm font-semibold text-white/60">(regra 4/5 EEOC)</span>
              </h2>
              <p className="text-sm text-white/60">
                Período: <span className="font-semibold text-white/80">{periodo ?? '—'}</span> ·
                gerado em {formatDate(snapshot.snapshot_em ?? snapshot.criado_em)}
              </p>
            </div>

            {snapshot.dados?.small_sample_warning ? (
              <p className="flex items-center gap-2 text-sm text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                Amostra pequena em ao menos uma faixa (&lt; 30) — a regra 4/5 é estatisticamente
                menos confiável.
              </p>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faixa etária</TableHead>
                  <TableHead>Selection rate</TableHead>
                  <TableHead>Razão 4/5</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bands.map((band: BandResult) => {
                  const isReference = band.faixa === faixaReferencia
                  return (
                    <TableRow
                      key={band.faixa}
                      className={cn(
                        band.flag && 'border-red-400/30 bg-red-500/15 text-red-300',
                      )}
                    >
                      <TableCell className="whitespace-nowrap font-semibold">
                        {band.faixa}
                        {isReference ? (
                          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                            referência (maior taxa)
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatRate(band.selection_rate)}
                        <span className="ml-2 text-white/50">
                          ({band.selected}/{band.applicants})
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {band.flag ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex cursor-help items-center gap-1">
                                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                  {formatRatio(band.razao_4_5)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Razão de selection-rate &lt; 0,8 vs a faixa de maior taxa — regra
                                4/5 EEOC (possível impacto adverso).
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          formatRatio(band.razao_4_5)
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {snapshot.dados?.excluidos_sem_data ? (
              <p className="text-xs text-white/50">
                {snapshot.dados.excluidos_sem_data} candidato(s) sem data de nascimento válida —
                excluídos do banding (contabilizados, nunca descartados).
              </p>
            ) : null}
          </GlassCard>
        )}
      </div>
    </RHLayout>
  )
}
