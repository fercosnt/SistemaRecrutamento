/**
 * TranscricaoReviewPanel — the transcript-analysis review panel (ENTREV-03 / RF-24).
 *
 * Transcript paste `textarea` → "Analisar transcrição" calls the
 * `avaliar-transcricao-entrevista` EF → renders the BARS dimensions ({competência} —
 * {score}/5, each carrying SugestaoIABadge variant="compact") + citations + flags.
 * The transcript + citations read at `text-base leading-relaxed` (16px/1.6+, never
 * compressed — load-bearing reading per UI-SPEC §Typography).
 *
 * The anti-regional-bias guard (RF-24): when the language/accent flag fires (the EF's
 * `bloqueio_avanco`), a destructive-tinted block + a RevisaoHumanaMarker render and
 * the "Avançar etapa" CTA is DISABLED. The only enabled path is "Confirmar revisão
 * humana" → sets revisao_confirmada_em → releases the server avancar_etapa guard. The
 * real block is server-authoritative (14-03); the UI is defense-in-depth (RNF-07a).
 * RH-facing only.
 *
 * WR-02: the funil advance is NOT wired on this surface — advancing the etapa is the
 * Phase-15 decisão final. The "Avançar etapa" CTA is therefore rendered DISABLED with
 * a tooltip naming the decisão final (no dead button); when an `onAvancarEtapa` handler
 * is provided in the future the normal blocked/unblocked gate applies.
 *
 * @module features/entrevista/components/TranscricaoReviewPanel
 * @see src/features/triagem/components/RedacaoReviewPanel.tsx (per-dim badge + 16px reading idiom)
 * @see .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md (§Color flag block)
 */
import { useState } from 'react'
import { AlertTriangle, CircleDashed } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import type {
  EntrevistaAnaliseRow,
  AnaliseCompetencia,
} from '../services/entrevistaService'

/** The neutral human-review-required pill (mirrors ScorecardAvaliacao). */
function RevisaoHumanaMarker({ confirmada }: { confirmada: boolean }) {
  return (
    <Badge className="gap-1 border-white/20 bg-white/5 text-white/80 text-xs font-semibold">
      <CircleDashed className="h-3 w-3" aria-hidden="true" />
      {confirmada ? 'Revisão humana confirmada' : 'Revisão humana obrigatória'}
    </Badge>
  )
}

/** One BARS dimension readout — neutral, each with SugestaoIABadge variant="compact". */
function DimensaoRow({ c }: { c: AnaliseCompetencia }) {
  const score = typeof c.score === 'number' ? c.score : null
  return (
    <li className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white/90">{c.competencia}</span>
        <span className="flex items-center gap-2">
          <SugestaoIABadge variant="compact" />
          <span className="text-sm font-semibold text-white">
            {score != null ? `${score} / 5` : '—'}
          </span>
        </span>
      </div>
      {c.reasoning ? (
        <p className="text-base leading-relaxed text-white/60">{c.reasoning}</p>
      ) : null}
    </li>
  )
}

/** One Citation as the EF emits it ("Cite Before You Speak"): {text, location?}. */
interface CitacaoEvidencia {
  texto: string
  local: string | null
}

/** A normalized citação: an optional competency label + its legible evidence list. */
interface CitacaoNormalizada {
  competencia: string | null
  evidencias: CitacaoEvidencia[]
}

/**
 * Normalizes one stored citação element into a legible shape (ENTREV-CITACOES-01).
 * The EF persists per-competency groups `{ competency, cited_evidence: [{ text, location }] }`;
 * a defensive plain string or a flat `{ text, location }` are also accepted. Returns null
 * when nothing renderable is present — NEVER the raw object (which `JSON.stringify` leaked
 * verbatim into the DOM).
 */
export function normalizeCitacao(c: unknown): CitacaoNormalizada | null {
  if (typeof c === 'string') {
    const t = c.trim()
    return t ? { competencia: null, evidencias: [{ texto: t, local: null }] } : null
  }
  if (!c || typeof c !== 'object') return null
  const obj = c as Record<string, unknown>
  const competencia =
    typeof obj.competency === 'string'
      ? obj.competency
      : typeof obj.competencia === 'string'
        ? obj.competencia
        : null
  const toEvidencia = (e: unknown): CitacaoEvidencia | null => {
    if (typeof e === 'string') {
      const t = e.trim()
      return t ? { texto: t, local: null } : null
    }
    if (!e || typeof e !== 'object') return null
    const eo = e as Record<string, unknown>
    const texto =
      typeof eo.text === 'string' ? eo.text : typeof eo.texto === 'string' ? eo.texto : ''
    if (!texto) return null
    const local =
      typeof eo.location === 'string' ? eo.location : typeof eo.local === 'string' ? eo.local : null
    return { texto, local }
  }
  const evidenciaSource = obj.cited_evidence ?? obj.evidencias
  if (Array.isArray(evidenciaSource)) {
    const evidencias = evidenciaSource
      .map(toEvidencia)
      .filter((e): e is CitacaoEvidencia => e != null)
    return evidencias.length ? { competencia, evidencias } : null
  }
  // flat Citation {text, location}
  const flat = toEvidencia(obj)
  return flat ? { competencia, evidencias: [flat] } : null
}

/** One citação group — competency label + each evidence as «trecho» — localização. */
function CitacaoItem({ citacao }: { citacao: unknown }) {
  const n = normalizeCitacao(citacao)
  if (!n) return null
  return (
    <li className="space-y-1">
      {n.competencia ? (
        <p className="text-sm font-semibold text-white/80">{n.competencia}</p>
      ) : null}
      <ul className="space-y-1">
        {n.evidencias.map((e, i) => (
          <li key={i} className="text-base leading-relaxed text-white/70">
            <span className="text-white/90">«{e.texto}»</span>
            {e.local ? <span className="text-white/50"> — {e.local}</span> : null}
          </li>
        ))}
      </ul>
    </li>
  )
}

export interface TranscricaoReviewPanelProps {
  analise: EntrevistaAnaliseRow | null
  loading?: boolean
  analyzing?: boolean
  confirming?: boolean
  /** Fires the analyze mutation with the pasted transcript. */
  onAnalisar?: (transcricao: string) => void
  /** Fires confirmarRevisaoHumana(analiseId) — releases the flag block. */
  onConfirmarRevisao?: (analiseId: string) => void
  /** Fires the funil advance (enabled only when no firing flag is unresolved). */
  onAvancarEtapa?: () => void
  className?: string
}

/**
 * The transcript paste + analysis + flag-block panel. The language/accent flag
 * gates the Avançar CTA; "Confirmar revisão humana" is the only enabled release path.
 */
export function TranscricaoReviewPanel({
  analise,
  loading = false,
  analyzing = false,
  confirming = false,
  onAnalisar,
  onConfirmarRevisao,
  onAvancarEtapa,
  className,
}: TranscricaoReviewPanelProps) {
  const [transcricao, setTranscricao] = useState('')

  const competencias = Array.isArray(analise?.competencias) ? analise!.competencias : []
  const citacoes = Array.isArray(analise?.citacoes) ? analise!.citacoes : []
  // The flag fires when the EF set bloqueio_avanco AND no human confirmed review yet.
  const flagFired = !!analise?.bloqueio_avanco
  const revisaoConfirmada = !!analise?.revisao_confirmada_em
  const bloqueado = flagFired && !revisaoConfirmada

  return (
    <div className={cn('space-y-6', className)}>
      {/* Transcript paste box. */}
      <div className="space-y-2">
        <Label htmlFor="transcricao" className="text-sm font-semibold text-white/90">
          Cole a transcrição da entrevista
        </Label>
        <Textarea
          id="transcricao"
          value={transcricao}
          onChange={(e) => setTranscricao(e.target.value)}
          placeholder="Cole aqui a transcrição completa da entrevista para análise."
          className="min-h-40 bg-white/5 text-base leading-relaxed text-white placeholder:text-white/40"
          disabled={analyzing}
        />
        <button
          type="button"
          onClick={() => onAnalisar?.(transcricao)}
          disabled={analyzing || transcricao.trim().length === 0}
          className="min-h-[44px] rounded-lg border border-white/20 bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30 disabled:opacity-50"
        >
          Analisar transcrição
        </button>
        {analyzing ? <p className="text-sm text-white/70">Analisando…</p> : null}
      </div>

      {/* Analysis result. */}
      {loading ? (
        <p className="text-sm text-white/60">Carregando análise…</p>
      ) : competencias.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-white">Análise da transcrição</h3>
            <SugestaoIABadge variant="full" />
          </div>

          <ul className="space-y-3">
            {competencias.map((c, i) => (
              <DimensaoRow key={`${c.competencia}-${i}`} c={c} />
            ))}
          </ul>

          {citacoes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Citações
              </p>
              <ul className="space-y-3">
                {citacoes.map((c, i) => (
                  <CitacaoItem key={i} citacao={c} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Language/accent flag block — gates the Avançar CTA (RF-24). */}
      {flagFired ? (
        <div
          className={cn(
            'space-y-3 rounded-lg border px-4 py-3',
            bloqueado
              ? 'border-red-400/30 bg-red-500/15 text-red-300'
              : 'border-white/20 bg-white/5 text-white/80',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Bandeiras
            </span>
            <RevisaoHumanaMarker confirmada={revisaoConfirmada} />
          </div>

          {bloqueado ? (
            <p className="text-base leading-relaxed">
              <span className="font-semibold">
                Bandeira de linguagem/sotaque (score &lt; 3).
              </span>{' '}
              O avanço está bloqueado até a revisão humana ser confirmada. Esta bandeira
              evita viés regional — não é um julgamento de mérito.
            </p>
          ) : (
            <p className="text-base leading-relaxed">
              <span className="font-semibold">Revisão humana confirmada.</span> O avanço
              está liberado.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {/* Confirmar revisão humana — the only enabled path while blocked. */}
            {bloqueado ? (
              <button
                type="button"
                onClick={() => analise?.id && onConfirmarRevisao?.(analise.id)}
                disabled={confirming || !analise?.id}
                className="min-h-[44px] rounded-lg border border-white/20 bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30 disabled:opacity-50"
              >
                Confirmar revisão humana
              </button>
            ) : null}

            {/* Avançar etapa (WR-02): there is NO funil-advance service on this
                surface — advancing the funil is the Phase-15 decisão final. The CTA
                is rendered DISABLED with a tooltip naming where the advance happens,
                rather than a dead button that silently no-ops. We never invent an
                advance RPC here. When a wired handler IS provided (future), the
                normal blocked/unblocked gate applies. */}
            <AvancarEtapaCTA
              disabled={bloqueado || !onAvancarEtapa}
              blockedByFlag={bloqueado}
              onClick={onAvancarEtapa}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * The Avançar etapa CTA — disabled while the flag block fires OR while no funil-advance
 * handler is wired (WR-02). The tooltip names the rule: when blocked by the flag it
 * tells the gestor to review first; when unwired it points to the decisão final (the
 * Phase-15 surface that owns the actual advance).
 */
function AvancarEtapaCTA({
  disabled,
  blockedByFlag,
  onClick,
}: {
  disabled: boolean
  /** True when the disable is the language/accent flag (vs. no wired advance handler). */
  blockedByFlag?: boolean
  onClick?: () => void
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Avançar etapa
    </button>
  )
  if (!disabled) return button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed">{button}</span>
        </TooltipTrigger>
        <TooltipContent>
          {blockedByFlag
            ? 'Revise a bandeira de linguagem/sotaque antes de avançar a etapa.'
            : 'O avanço de etapa acontece na decisão final.'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
