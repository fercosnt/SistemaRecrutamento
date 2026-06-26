/**
 * GuiaEntrevistaPanel — the AI-generated STAR/PEI interview guide (ENTREV-01).
 *
 * Renders the `gerar-guia-entrevista` output (5-7 perguntas with BARS 1-5 anchors +
 * dimensão). Two generate CTAs (online / presencial); the presencial branch focuses
 * on the online gaps (dims < 4). Each question shows its weak-dim hint ("Cobre
 * {dimensão} (score atual {n} < 3)"). The panel header carries the SugestaoIABadge
 * (variant="full") — the AI is always a suggestion, the human always decides (RNF-07a).
 * RH-facing only; the candidate never reaches this surface.
 *
 * @module features/entrevista/components/GuiaEntrevistaPanel
 * @see src/features/triagem/components/RedacaoReviewPanel.tsx (AnaliseIA per-AI-block badge idiom)
 * @see .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md (§Copywriting Guia)
 */
import { Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import type {
  EntrevistaGuiaRow,
  GuiaPergunta,
  TipoEntrevista,
} from '../services/entrevistaService'

export interface GuiaEntrevistaPanelProps {
  guia: EntrevistaGuiaRow | null
  loading?: boolean
  generating?: boolean
  /** Fires the online/presencial generate mutation. */
  onGerar?: (tipo: TipoEntrevista) => void
  className?: string
}

/** Reads the perguntas array off the EF `guia` JSON (defensive). */
function perguntasOf(guia: EntrevistaGuiaRow | null): GuiaPergunta[] {
  const arr = guia?.guia?.perguntas
  return Array.isArray(arr) ? arr : []
}

/** The weak-dim hint for a question (online <3; the EF already gates which dims). */
function weakDimHint(p: GuiaPergunta): string | null {
  if (!p.dimensao) return null
  const n = typeof p.score_atual === 'number' ? p.score_atual : null
  if (n == null) return null
  return `Cobre ${p.dimensao} (score atual ${n} < 3)`
}

/** One STAR/PEI question row with its dimension + BARS anchor label. */
function PerguntaRow({ p, idx }: { p: GuiaPergunta; idx: number }) {
  const hint = weakDimHint(p)
  return (
    <li className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-base leading-relaxed text-white/90">
          <span className="font-semibold text-white">{idx + 1}.</span> {p.pergunta}
        </p>
        {p.dimensao ? (
          <span className="shrink-0 rounded border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/70">
            {p.dimensao}
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-sm font-semibold text-white/75">{hint}</p> : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
        Âncoras BARS 1–5
      </p>
    </li>
  )
}

/**
 * The STAR/PEI guide panel — generate CTAs + the rendered guide. Header carries the
 * SugestaoIABadge (full) — every AI-derived block.
 */
export function GuiaEntrevistaPanel({
  guia,
  loading = false,
  generating = false,
  onGerar,
  className,
}: GuiaEntrevistaPanelProps) {
  const perguntas = perguntasOf(guia)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-white">Guia STAR/PEI</h3>
          <SugestaoIABadge variant="full" />
        </div>
      </div>

      {/* online / presencial generate CTAs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onGerar?.('online')}
          disabled={generating}
          className="min-h-[44px] rounded-lg border border-white/20 bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30 disabled:opacity-50"
        >
          <Sparkles className="mr-1 inline h-4 w-4 text-[#35BFAD]" aria-hidden="true" />
          Gerar guia (entrevista online)
        </button>
        <button
          type="button"
          onClick={() => onGerar?.('presencial')}
          disabled={generating}
          className="min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
        >
          <Sparkles className="mr-1 inline h-4 w-4 text-[#35BFAD]" aria-hidden="true" />
          Gerar guia (entrevista presencial)
        </button>
      </div>
      {guia?.tipo === 'presencial' ? (
        <p className="text-sm font-semibold text-white/75">
          Foco nos gaps da entrevista online (dimensões com score &lt; 4).
        </p>
      ) : null}

      {generating || loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full bg-white/5" />
          <Skeleton className="h-16 w-full bg-white/5" />
        </div>
      ) : perguntas.length === 0 ? (
        <p className="text-sm text-white/75">
          Nenhum guia gerado ainda. Gere o guia para preparar a entrevista.
        </p>
      ) : (
        <ul className="space-y-3">
          {perguntas.map((p, i) => (
            <PerguntaRow key={i} p={p} idx={i} />
          ))}
        </ul>
      )}
    </div>
  )
}
