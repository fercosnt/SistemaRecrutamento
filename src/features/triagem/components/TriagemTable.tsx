/**
 * TriagemTable — painel denso de candidatos por vaga (TRIAGEM-02 / UI-SPEC §A).
 *
 * Tabela shadcn dentro do glass shell RH. Colunas: select, candidato (avatar+nome),
 * Score IA (band chip number+cor + Sparkles), Top fortes (≤2), Top gaps (≤2), etapa,
 * status, aplicou em, ações (Ver Perfil). Multi-select gateado pelo piso/teto de
 * `_shared/comparativo-config.ts` (D-59 — era 2-10 escrito à mão) com barra de
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

import { Link } from 'react-router-dom'
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
import { candidaturaEncerrada } from '@/lib/candidatura/candidaturaEncerrada'
import { ETAPA_M2_LABELS, type EtapaFunilM2 } from '../services/triagemService'
import { SugestaoIABadge } from './SugestaoIABadge'
/**
 * Phase 49 / plano 49-22 — D-59. O piso e o teto do comparativo vêm da MESMA constante que a
 * Edge Function usa para recusar. Import por caminho RELATIVO porque
 * `_shared/comparativo-config.ts` tem contrato de ZERO IMPORTS — o mesmo precedente vivo de
 * `exportacaoService.ts:61` (`EXPORT_ALLOWLIST`) e do reexport de `candidaturaEncerrada`.
 *
 * ⚠ Sem isto, o número vivia aqui em oito linhas e a tela OFERECIA uma seleção que o servidor
 * recusa (ou, pior, aceitava um pedido que não cabe no tempo do modelo — foi o que produziu o
 * ranking de contingência de 20/09 registrado como sucesso).
 */
import {
  COMPARATIVO_MAX_CANDIDATOS,
  COMPARATIVO_MIN_CANDIDATOS,
} from '../../../../supabase/functions/_shared/comparativo-config'

// Re-export so the Wave-0 test (and downstream Plans 11-15) can import either path.
export { SugestaoIABadge } from './SugestaoIABadge'

/**
 * Cap / piso de seleção para o comparativo (UI-SPEC §A). São REEXPORTS da constante da EF
 * (D-59), não valores próprios: o nome local sobrevive para quem já o importava, mas não há
 * mais um segundo número que possa divergir do servidor.
 */
export const COMPARE_MAX = COMPARATIVO_MAX_CANDIDATOS
export const COMPARE_MIN = COMPARATIVO_MIN_CANDIDATOS

/**
 * As duas frases de gating, MONTADAS das constantes e num lugar só (cada uma aparecia em duas
 * linhas do JSX). Exportadas porque o `TooltipContent` do Radix não é montado enquanto o
 * tooltip está fechado — sem a constante, nenhum teste consegue vigiar o número que o RH lê.
 */
export const COPY_TETO_COMPARATIVO = `Máximo de ${COMPARATIVO_MAX_CANDIDATOS} candidatos por comparativo.`
export const COPY_PISO_COMPARATIVO = `Selecione ao menos ${COMPARATIVO_MIN_CANDIDATOS} candidatos para comparar.`
/**
 * D-34: candidatura encerrada não entra no comparativo. A EF recusa (`ENCERRADA`, 49-08) e o
 * banco trava o avanço (49-06); aqui a tela deixa de OFERECER — a primeira das três camadas.
 */
export const COPY_ENCERRADA_COMPARATIVO = 'Candidatura encerrada não entra no comparativo.'

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
  /**
   * Phase 45 / ERASE-05 — Invariante 9. Nao-nula quando o titular encerrou a
   * candidatura a pedido. A linha NAO some da tabela: `deleted_at` continua NULL,
   * e o estado e dito pela PALAVRA.
   */
  encerrada_a_pedido_em?: string | null
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
 * Painel denso de candidatos com score IA, multi-select gateado pelo piso/teto da constante
 * compartilhada (D-59) e barra de comparação.
 */
export function TriagemTable({
  rows,
  selectedIds,
  onToggleSelect,
  onCompare,
  onReprocess,
}: TriagemTableProps) {
  const selectedCount = selectedIds.length
  const capReached = selectedCount >= COMPARATIVO_MAX_CANDIDATOS
  const compareEnabled =
    selectedCount >= COMPARATIVO_MIN_CANDIDATOS && selectedCount <= COMPARATIVO_MAX_CANDIDATOS

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
              /*
               * D-34 / predicado CANÔNICO (`candidaturaEncerrada`, espelho TS da função SQL do
               * 48-01) — nunca uma allowlist local. ⚠ Ele é FALSO para retirada a pedido
               * (`encerrada_a_pedido_em` com status em andamento): aquilo é um direito do
               * titular exercido, não um desfecho do funil, e a Phase 45 exige que a linha
               * continue operável. As duas coisas moram na mesma tabela e não são a mesma.
               */
              const encerrada = candidaturaEncerrada(row.etapa_atual, row.status)
              const checkboxDisabled = encerrada || (capReached && !isSelected)
              const motivoDoBloqueio = encerrada
                ? COPY_ENCERRADA_COMPARATIVO
                : COPY_TETO_COMPARATIVO
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
                          <TooltipContent>{motivoDoBloqueio}</TooltipContent>
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
                    {/*
                      Phase 45 / ERASE-05 — Invariante 9: o silencio tambem e
                      proibido. O estado entra na celula de etapa JA EXISTENTE —
                      sem contentor novo e sem coluna nova (E10-overflow).

                      Tratamento NEUTRO (`border-white/20 bg-white/5 text-white/80`):
                      NAO e alarme, porque ninguem errou. Ambar/vermelho aqui
                      competiriam com os eixos de SLA que as Phases 42 e 44 ja
                      codificam nesta mesma tela.

                      NENHUMA acao e oferecida — nem reabrir, nem contatar, nem
                      reverter. E NADA sobre a janela: a data da exclusao, a
                      contagem regressiva e a existencia do pedido NAO aparecem. O
                      recrutador precisa saber que o processo acabou; a politica de
                      dados do titular nao e informacao de funil.

                      A PALAVRA e o canal (Invariante 11): cor e posicao jamais
                      sozinhas.
                    */}
                    {row.encerrada_a_pedido_em ? (
                      <span className="mt-1 block whitespace-normal rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs font-semibold text-white/80">
                        Encerrada a pedido do candidato
                      </span>
                    ) : null}
                    {/*
                      Phase 49 / plano 49-22 — D-34. Selo NEUTRO (`bg-white/15 text-white/80`),
                      como o `kanban-selo-encerrada` do 49-05 e pela MESMA razão: «Encerrada»
                      não afirma se acabou bem ou mal, e pintar com cor de desfecho inventaria
                      um desfecho que a linha não tem. Entra na célula de etapa JÁ EXISTENTE —
                      sem coluna nova (E10-overflow).

                      ⚠ Não substitui o selo de retirada a pedido acima: os dois podem
                      conviver (uma candidatura retirada que depois foi finalizada), e cada um
                      responde uma pergunta diferente.
                    */}
                    {encerrada ? (
                      <span
                        data-testid="triagem-selo-encerrada"
                        data-candidatura-id={row.id}
                        className="mt-1 block w-fit whitespace-normal rounded-md border border-white/20 bg-white/15 px-2 py-1 text-xs font-semibold text-white/80"
                      >
                        Encerrada
                      </span>
                    ) : null}
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
                      {/* D-04 / Pitfall 1: SPA navigation carrying the candidaturaId (row.id),
                          NOT candidato.id — the hub + every workspace key on candidaturaId.
                          <Link> keeps keyboard accessibility (no bare onClick div). */}
                      <Link
                        to={`/rh/candidatos/${row.id}`}
                        aria-label="Ver perfil"
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white hover:bg-white/15 transition-colors"
                      >
                        <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Ver Perfil</span>
                      </Link>
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
            {selectedCount} de {COMPARATIVO_MAX_CANDIDATOS} selecionados
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
                    {selectedCount < COMPARATIVO_MIN_CANDIDATOS
                      ? COPY_PISO_COMPARATIVO
                      : COPY_TETO_COMPARATIVO}
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
