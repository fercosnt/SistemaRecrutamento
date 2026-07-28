/**
 * ComparativoScreen — comparativo de candidatos (candidatos = colunas) / UI-SPEC §B.
 *
 * Renderiza ≤10 candidatos como COLUNAS e atributos como LINHAS (Ranking IA, Score IA
 * band, Pontos fortes, Gaps, Justificativa IA, Flags, Ação). A primeira coluna (rótulos
 * de atributo) é sticky-left; scroll horizontal no overflow. O SugestaoIABadge (full,
 * RNF-07a) é renderizado UMA vez no topo. Avançar (accent) é gateado por alert-dialog
 * confirm; Rejeitar (destructive) abre o `RejeitarCandidaturaDialog` COMPARTILHADO
 * (motivo + justificativa ≥50) que grava pela RPC `rejeitar_candidatura` auditada
 * (funil-02 / OPER-04) — NÃO mais o update cru sem justificativa. IA é sugestão, nunca
 * auto-ação. Botão "Exportar PDF" chama `exportComparativo` com estados Gerando/sucesso/erro.
 *
 * @module features/triagem/components/ComparativoScreen
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-UI-SPEC.md (§B candidatos-coluna, copy)
 */

import { useState } from 'react'
import { Download, Loader2, ArrowRight, X } from 'lucide-react'
import { toast } from 'sonner'
import { AsyncState } from '@/components/ui/AsyncState'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from './SugestaoIABadge'
import { RejeitarCandidaturaDialog } from './RejeitarCandidaturaDialog'
// PERF-03 (Plan 19-02): TYPE-ONLY import at top level — the runtime `exportComparativo`
// value (which statically pulls in jspdf + jspdf-autotable) is loaded via a call-site
// `await import()` in handleExport so jsPDF is emitted in a separate async chunk and
// never paid for unless the RH actually clicks "Exportar PDF" (RESEARCH Pitfall 3).
import type { RankedCandidate } from '../pdf/exportComparativo'

/**
 * Candidato ranqueado já resolvido pelo client: o ranking da EF + o id de candidatura
 * real (a EF anonimiza para C1/C2…) para que as ações inline saibam quem mover.
 */
export interface ComparativoCandidate extends RankedCandidate {
  /** ID real da candidatura (resolvido pelo painel a partir da seleção). */
  candidaturaId: string
  flags: string[]
}

export interface ComparativoScreenProps {
  /** Candidatos resolvidos (nome + candidaturaId), em ordem de ranking. */
  candidates: ComparativoCandidate[]
  /**
   * Avança a candidatura para a próxima etapa (confirmação já feita). OPCIONAL:
   * quando ausente (ex.: embutido na Decisão Final), a linha de Ação Avançar/Rejeitar
   * não é renderizada — a comparação segue visível e a decisão vai por `registrar_decisao`
   * em outra parte da tela (UX-06 — sem botão no-op).
   */
  onAvancar?: (candidaturaId: string) => void
  /**
   * Callback pós-rejeição bem-sucedida. A rejeição em si — motivo + justificativa ≥50 —
   * é feita pelo `RejeitarCandidaturaDialog` compartilhado (grava pela RPC auditada
   * `rejeitar_candidatura`, que já invalida as árvores de query). OPCIONAL: quando ausente
   * (junto com `onAvancar`), a linha de Ação não é renderizada — o embed read-only da
   * Decisão Final omite ambos de propósito (UX-06 — sem botão no-op).
   */
  onRejeitar?: (candidaturaId: string) => void
  /**
   * Estado do invoke do comparativo (EF `comparativo-candidatos`), delegado ao
   * `<AsyncState>` interno: loading/slow (~vários segundos) / erro / retry — nunca
   * tela em branco (RESIL-03). Opcionais p/ retrocompat com os consumidores que já
   * gateiam o invoke por fora; quando passados, a tela é a dona do estado assíncrono.
   */
  isLoading?: boolean
  isError?: boolean
  /** `'AI_UNAVAILABLE'` → cópia de sobrecarga; `'MIXED_VAGA'` → cópia de vagas diferentes. */
  errorCode?: string
  /** Re-invoca o comparativo (botão "Tentar novamente" do <AsyncState>). */
  onRetry?: () => void
  /** Enquanto true o botão de retry mostra "Tentando…" e fica disabled (sem dupla submissão). */
  retrying?: boolean
}

/**
 * Cópia pt-BR exata de "vagas diferentes" (MIXED_VAGA, EF 400) — PRESERVADA do
 * contrato Phase-10. Quando o invoke falha com MIXED_VAGA o <AsyncState> mostra esta
 * mensagem (override), não a genérica/sobrecarga — sem regressão do UX existente.
 */
const MIXED_VAGA_COPY =
  'Os candidatos selecionados pertencem a vagas diferentes. Compare candidatos de uma mesma vaga.'

/** Band de score (mesmas thresholds do painel TriagemTable — 70 / 40). */
function scoreBandClass(score: number | null): string {
  if (score === null || score === undefined) {
    return 'bg-white/10 text-white/50 border-white/20'
  }
  if (score >= 70) return 'bg-green-500/20 text-green-300 border-green-500/30'
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'
  return 'bg-red-500/20 text-red-300 border-red-500/30'
}

/** Célula de rótulo sticky-left (primeira coluna). */
const labelCell =
  'sticky left-0 z-10 min-w-[160px] bg-[#00109E] px-4 py-4 text-xs font-semibold text-white/80 align-top'
/** Célula de candidato (coluna). */
const dataCell = 'min-w-[200px] px-4 py-4 text-sm text-white align-top'

/**
 * Tabela comparativa candidatos-coluna com ações inline humanas + export PDF.
 */
export function ComparativoScreen({
  candidates,
  onAvancar,
  onRejeitar,
  isLoading,
  isError,
  errorCode,
  onRetry,
  retrying,
}: ComparativoScreenProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const ordered = [...candidates].sort((a, b) => a.rank - b.rank)

  // UX-06: a linha de Ação (Avançar/Rejeitar) só renderiza quando AMBOS os handlers são
  // fornecidos. Consumidores read-only (DecisaoFinalPage) omitem os handlers → nenhum
  // botão no-op aparece; a comparação em si permanece visível.
  const showActions = Boolean(onAvancar && onRejeitar)

  // PRESERVE MIXED_VAGA: branch the error body so "vagas diferentes" never collapses
  // into the generic/sobrecarga copy when adopting <AsyncState> (T-18-06-T2).
  const errorCopyOverride =
    errorCode === 'MIXED_VAGA' ? { error: { generic: MIXED_VAGA_COPY } } : undefined

  const handleExport = async () => {
    setIsGenerating(true)
    try {
      // PERF-03: load jsPDF only on click (separate async chunk; not in the eager path).
      const { exportComparativo } = await import('../pdf/exportComparativo')
      // W1: passa os candidatos JÁ RESOLVIDOS (carregam `.nome` real) — a EF
      // anonimiza C1/C2… e não popula `nome` no ranking, então o PDF deve ler daqui.
      exportComparativo(candidates)
      toast.success('PDF exportado.')
    } catch {
      toast.error('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <AsyncState
      isLoading={isLoading}
      isError={isError}
      errorCode={errorCode}
      onRetry={onRetry}
      retrying={retrying}
      copy={errorCopyOverride}
      glass={false}
    >
    <div className="space-y-6">
      {/* Header band: SugestaoIABadge (RNF-07a) + Exportar PDF */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SugestaoIABadge variant="full" />
        <button
          type="button"
          onClick={handleExport}
          disabled={isGenerating}
          className={cn(
            'inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#35BFAD]/60 bg-transparent px-4 text-sm font-semibold text-[#35BFAD] transition-colors hover:bg-[#35BFAD]/10',
            isGenerating && 'cursor-not-allowed opacity-60',
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Gerando PDF…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar PDF
            </>
          )}
        </button>
      </div>

      {/* Candidatos = colunas; atributos = linhas. Scroll horizontal no overflow. */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/10">
              <th className={cn(labelCell, 'text-left')} scope="col">
                Atributo
              </th>
              {ordered.map((c) => (
                <th key={c.candidaturaId} className={cn(dataCell, 'text-left')} scope="col">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-[#35BFAD] to-[#00109E] text-sm font-semibold text-white">
                      {c.nome?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{c.nome}</span>
                      <Badge className="mt-1 w-fit border-[#35BFAD]/40 bg-[#35BFAD]/10 text-[10px] font-semibold text-white">
                        {c.rank}º
                      </Badge>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Ranking IA */}
            <tr className="border-b border-white/10">
              <th className={cn(labelCell, 'text-left')} scope="row">
                Ranking IA
              </th>
              {ordered.map((c) => (
                <td key={c.candidaturaId} className={dataCell}>
                  {c.rank}
                </td>
              ))}
            </tr>

            {/* Score IA */}
            <tr className="border-b border-white/10">
              <th className={cn(labelCell, 'text-left')} scope="row">
                Score IA
              </th>
              {ordered.map((c) => (
                <td key={c.candidaturaId} className={dataCell}>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md border px-2 py-0.5 text-2xl font-semibold leading-none',
                      scoreBandClass(c.composite_score),
                    )}
                  >
                    {c.composite_score}
                  </span>
                </td>
              ))}
            </tr>

            {/* Pontos fortes */}
            <tr className="border-b border-white/10">
              <th className={cn(labelCell, 'text-left')} scope="row">
                Pontos fortes
              </th>
              {ordered.map((c) => (
                <td key={c.candidaturaId} className={dataCell}>
                  <ul className="list-disc space-y-1 pl-4 text-white/80">
                    {c.relative_strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            {/* Gaps */}
            <tr className="border-b border-white/10">
              <th className={cn(labelCell, 'text-left')} scope="row">
                Gaps
              </th>
              {ordered.map((c) => (
                <td key={c.candidaturaId} className={dataCell}>
                  <ul className="list-disc space-y-1 pl-4 text-white/80">
                    {c.relative_weaknesses.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            {/* Justificativa IA */}
            <tr className="border-b border-white/10">
              <th className={cn(labelCell, 'text-left')} scope="row">
                Justificativa IA
              </th>
              {ordered.map((c) => (
                <td key={c.candidaturaId} className={cn(dataCell, 'leading-[1.5] text-white/80')}>
                  {c.rationale}
                </td>
              ))}
            </tr>

            {/* Flags (neutros, sem cor de gating) */}
            <tr className="border-b border-white/10">
              <th className={cn(labelCell, 'text-left')} scope="row">
                Flags
              </th>
              {ordered.map((c) => (
                <td key={c.candidaturaId} className={dataCell}>
                  <div className="flex flex-wrap gap-1">
                    {(c.flags ?? []).map((flag) => (
                      <Badge
                        key={flag}
                        className="border-white/20 bg-white/10 text-[10px] font-semibold text-white/70"
                      >
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </td>
              ))}
            </tr>

            {/* Ação: Avançar (accent) + Rejeitar (destructive), via confirm dialog.
                UX-06: oculto quando os handlers não são fornecidos (embed read-only). */}
            {showActions && (
            <tr>
              <th className={cn(labelCell, 'text-left')} scope="row">
                Ação
              </th>
              {ordered.map((c) => (
                <td key={c.candidaturaId} className={dataCell}>
                  <div className="flex flex-col gap-2">
                    {/* Avançar */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md bg-[#35BFAD] px-3 text-sm font-semibold text-[#00109E] transition-colors hover:bg-[#35BFAD]/90"
                        >
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          Avançar
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Avançar {c.nome} para a próxima etapa?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            O candidato seguirá para a próxima etapa do processo seletivo. A
                            sugestão da IA é apenas um apoio — a decisão é sempre humana.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onAvancar?.(c.candidaturaId)}>
                            Avançar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Rejeitar — funil-02 / OPER-04: abre o RejeitarCandidaturaDialog
                        COMPARTILHADO (motivo + justificativa ≥50) que grava pela RPC
                        auditada `rejeitar_candidatura`, substituindo o antigo confirm
                        sem justificativa. Mount-don't-fork: o dialog é dono da escrita +
                        do gate ≥50; `onRejeitar` fica como callback pós-sucesso opcional. */}
                    <RejeitarCandidaturaDialog
                      candidaturaId={c.candidaturaId}
                      nome={c.nome ?? 'candidato'}
                      onRejected={() => onRejeitar?.(c.candidaturaId)}
                      trigger={
                        <button
                          type="button"
                          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          Rejeitar
                        </button>
                      }
                    />
                  </div>
                </td>
              ))}
            </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </AsyncState>
  )
}
