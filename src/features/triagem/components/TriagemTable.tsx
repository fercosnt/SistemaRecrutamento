/**
 * TriagemTable — painel denso de candidatos por vaga (TRIAGEM-02 / UI-SPEC §A).
 *
 * Tabela shadcn dentro do glass shell RH. Colunas: select, candidato (avatar+nome),
 * Score IA (band chip number+cor + Sparkles), Top fortes (≤2), Top gaps (≤2), etapa,
 * status, aplicou em, ações (Ver Perfil). Multi-select gateado 2-10 com barra de
 * comparação sticky. Linhas pendente → skeleton "Analisando…"; falhou → "— Falhou"
 * + botão visível "Reprocessar análise" (não tooltip-only). Flags = badges neutros
 * (sem cor de gating). O SugestaoIABadge (RNF-07a) é renderizado junto ao header
 * Score IA.
 *
 * O `SugestaoIABadge` é re-exportado daqui para compatibilidade com o contrato de
 * teste Wave-0 (que importa `{ TriagemTable, SugestaoIABadge }` deste módulo);
 * o componente real vive em `./SugestaoIABadge`.
 *
 * @module features/triagem/components/TriagemTable
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-UI-SPEC.md (§A bands 70/40, compare-bar, states)
 */

import { Sparkles, RefreshCw, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/components/ui/utils'
import type { StatusCandidatura } from '@/features/vagas/types/vagasTypes'
import { ETAPA_M2_LABELS, type EtapaFunilM2 } from '../services/triagemService'
import { SugestaoIABadge } from './SugestaoIABadge'

// Re-export so the Wave-0 test (and downstream Plans 11-15) can import either path.
export { SugestaoIABadge } from './SugestaoIABadge'

/** Cap de seleção para o comparativo (UI-SPEC §A). */
export const COMPARE_MAX = 10
/** Mínimo para habilitar "Comparar" (UI-SPEC §A). */
export const COMPARE_MIN = 2

const STATUS_LABELS: Record<string, string> = {
  aguardando_resposta: 'Aguardando Resposta',
  em_analise: 'Em Análise',
  aprovado_proxima: 'Aprovado',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
  desistente: 'Desistente',
}

const STATUS_COLORS: Record<string, string> = {
  aguardando_resposta: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
  em_analise: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  aprovado_proxima: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejeitado: 'bg-red-500/20 text-red-300 border-red-500/30',
  finalizado: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  desistente: 'bg-orange-500/20 text-orange-200 border-orange-500/30',
}

export interface TriagemTableAnalise {
  score_match: number | null
  pontos_fortes: string[]
  gaps: string[]
  flags: string[]
  status: string | null
}

export interface TriagemTableRow {
  id: string
  candidato: { id: string; nome_completo: string } | null
  etapa_atual: EtapaFunilM2 | string
  status: StatusCandidatura | string
  created_at: string
  analise: TriagemTableAnalise | null
}

export interface TriagemTableProps {
  rows: TriagemTableRow[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  /** Recebe os ids selecionados (a navegação p/ comparativo chega no 10-06). */
  onCompare: (ids: string[]) => void
  /** Re-dispara a análise de uma candidatura falhada. */
  onReprocess: (candidaturaId: string) => void
}

/**
 * Resolve a band de score (UI-SPEC §A — thresholds 70 / 40).
 * 70-100 verde, 40-69 amarelo, 0-39 vermelho, null → "—" sem-análise.
 */
function scoreBandClass(score: number | null): string {
  if (score === null || score === undefined) {
    return 'bg-white/10 text-white/50 border-white/20'
  }
  if (score >= 70) return 'bg-green-500/20 text-green-300 border-green-500/30'
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'
  return 'bg-red-500/20 text-red-300 border-red-500/30'
}

/** Célula de Score IA: chip number+cor; pendente → skeleton; falhou → reprocessar. */
function ScoreCell({
  row,
  onReprocess,
}: {
  row: TriagemTableRow
  onReprocess: (candidaturaId: string) => void
}) {
  const analiseStatus = row.analise?.status ?? null
  const score = row.analise?.score_match ?? null

  // pendente: análise em andamento → skeleton + "Analisando…"
  if (analiseStatus === 'pendente') {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-10 rounded-md bg-white/20" />
        <span className="text-xs text-white/60">Analisando…</span>
      </div>
    )
  }

  // falhou: "— Falhou" + botão visível "Reprocessar análise"
  if (analiseStatus === 'falhou') {
    return (
      <div className="flex flex-col items-start gap-1">
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
            scoreBandClass(null),
          )}
        >
          — Falhou
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Reprocessar análise"
                onClick={() => onReprocess(row.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#35BFAD] hover:text-[#35BFAD]/80 transition-colors"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Reprocessar análise
              </button>
            </TooltipTrigger>
            <TooltipContent>A análise da IA falhou. Reprocessar análise.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  // sem análise (null) → band "—"
  if (score === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-2xl font-semibold',
          scoreBandClass(null),
        )}
      >
        —
      </span>
    )
  }

  // band chip = number + cor (nunca dot nu). A cor da band fica NO MESMO elemento
  // que contém o número, para que o número seja sempre legível (RNF-07a) e
  // testável (getByText(score).className contém a cor).
  return (
    <span className="inline-flex items-center gap-1">
      <Sparkles className="h-3 w-3 text-[#35BFAD] opacity-70" aria-hidden="true" />
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-2xl font-semibold leading-none',
          scoreBandClass(score),
        )}
      >
        {score}
      </span>
    </span>
  )
}

/**
 * Painel denso de candidatos com score IA, multi-select 2-10 e barra de comparação.
 */
export function TriagemTable({
  rows,
  selectedIds,
  onToggleSelect,
  onCompare,
  onReprocess,
}: TriagemTableProps) {
  const selectedCount = selectedIds.length
  const capReached = selectedCount >= COMPARE_MAX
  const compareEnabled = selectedCount >= COMPARE_MIN && selectedCount <= COMPARE_MAX

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 bg-white/10 hover:bg-white/10">
              <TableHead className="w-11 text-white/80" />
              <TableHead className="text-xs font-semibold text-white/80">Candidato</TableHead>
              <TableHead className="text-xs font-semibold text-white/80">
                <div className="flex items-center gap-2">
                  <span>Score IA</span>
                  <SugestaoIABadge variant="compact" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-white/80">Top fortes</TableHead>
              <TableHead className="text-xs font-semibold text-white/80">Top gaps</TableHead>
              <TableHead className="text-xs font-semibold text-white/80">Etapa</TableHead>
              <TableHead className="text-xs font-semibold text-white/80">Status</TableHead>
              <TableHead className="text-xs font-semibold text-white/80">Aplicou em</TableHead>
              <TableHead className="text-xs font-semibold text-white/80">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isSelected = selectedIds.includes(row.id)
              const checkboxDisabled = capReached && !isSelected
              const candidato = row.candidato
              const fortes = (row.analise?.pontos_fortes ?? []).slice(0, 2)
              const gaps = (row.analise?.gaps ?? []).slice(0, 2)
              const flags = row.analise?.flags ?? []

              return (
                <TableRow
                  key={row.id}
                  data-state={isSelected ? 'selected' : undefined}
                  className="min-h-[44px] border-white/10 text-white hover:bg-white/10 data-[state=selected]:bg-[#35BFAD]/10"
                >
                  <TableCell className="w-11">
                    {checkboxDisabled ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Checkbox
                                checked={isSelected}
                                disabled
                                aria-label={`Selecionar ${candidato?.nome_completo ?? 'candidato'}`}
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Máximo de 10 candidatos por comparativo.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(row.id)}
                        aria-label={`Selecionar ${candidato?.nome_completo ?? 'candidato'}`}
                      />
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-[#35BFAD] to-[#00109E] text-sm font-semibold text-white">
                        {candidato?.nome_completo?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm text-white">
                        {candidato?.nome_completo ?? 'Nome não disponível'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="w-24">
                    <ScoreCell row={row} onReprocess={onReprocess} />
                  </TableCell>

                  <TableCell className="max-w-[200px]">
                    <span className="block truncate text-sm text-white/70">
                      {fortes.length ? fortes.join(', ') : ''}
                    </span>
                  </TableCell>

                  <TableCell className="max-w-[200px]">
                    <span className="block truncate text-sm text-white/70">
                      {gaps.length ? gaps.join(', ') : ''}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge className="border-white/20 bg-white/10 text-xs font-semibold text-white/80">
                      {ETAPA_M2_LABELS[row.etapa_atual as EtapaFunilM2] ?? row.etapa_atual}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={cn(
                        'text-xs font-semibold',
                        STATUS_COLORS[row.status] ?? 'border-white/20 bg-white/10 text-white/80',
                      )}
                    >
                      {STATUS_LABELS[row.status] ?? row.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-sm text-white/70">
                    {row.created_at
                      ? format(new Date(row.created_at), "d 'de' MMM", { locale: ptBR })
                      : '—'}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <a
                        href={`/rh/candidatos/${candidato?.id ?? ''}`}
                        aria-label="Ver perfil"
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white hover:bg-white/15 transition-colors"
                      >
                        <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Ver Perfil</span>
                      </a>
                      {flags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {flags.map((flag) => (
                            <Badge
                              key={flag}
                              className="border-white/20 bg-white/10 text-[10px] font-semibold text-white/70"
                            >
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Barra de comparação sticky — visível quando há seleção */}
      {selectedCount > 0 && (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/20 bg-[#00109E]/80 p-4 backdrop-blur-xl">
          <span className="text-sm font-semibold text-white">
            {selectedCount} de {COMPARE_MAX} selecionados
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => selectedIds.forEach((id) => onToggleSelect(id))}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Limpar seleção
            </button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <button
                      type="button"
                      disabled={!compareEnabled}
                      onClick={() => onCompare(selectedIds)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors',
                        compareEnabled
                          ? 'bg-[#35BFAD] text-[#00109E] hover:bg-[#35BFAD]/90'
                          : 'cursor-not-allowed bg-white/10 text-white/40',
                      )}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Comparar ({selectedCount})
                    </button>
                  </span>
                </TooltipTrigger>
                {!compareEnabled && (
                  <TooltipContent>
                    {selectedCount < COMPARE_MIN
                      ? 'Selecione ao menos 2 candidatos para comparar.'
                      : 'Máximo de 10 candidatos por comparativo.'}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  )
}
