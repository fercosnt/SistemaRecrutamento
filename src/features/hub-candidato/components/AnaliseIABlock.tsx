/**
 * AnaliseIABlock — the FULL IA analysis on the RH candidate hub (VISRH-02).
 *
 * Replaces the empty "Score de Triagem" placeholder. Renders the complete IA analysis
 * for ONE candidatura: the `score_match` band chip (number + colour in the SAME element
 * — the colorblind-safe `ScoreCell` invariant, thresholds 70/40), `Pontos fortes` and
 * `Gaps` IN FULL (the top-2 truncation in `TriagemTable` is vaga-table density only —
 * the hub shows the whole lists), `flags` under `Sinais de atenção`, and the
 * `SugestaoIABadge` (RNF-07a — the IA suggests, the human decides).
 *
 * RH-ONLY: this component is imported only under `HubCandidatoRH`. The candidate has no
 * `rh_le_analise` SELECT (DB-denied) and NEVER sees this block. Behavioural framing is
 * neutral and descriptive (never the banned clinical wording — RNF-12a).
 *
 * States: `isLoading` → HubSection skeleton; `isError` → HubSection error copy; a null
 * `analise` → the "Análise ainda não disponível" empty copy; `analise_status='falhou'`
 * → the read-only failure copy (no reprocess button — that lives on the vaga triagem panel).
 *
 * @module features/hub-candidato/components/AnaliseIABlock
 * @see src/features/triagem/components/TriagemTable.tsx (scoreBandClass + ScoreCell chip visual)
 * @see .planning/phases/34-.../34-UI-SPEC.md (§Análise da IA copy + §States Contract)
 */
import { Sparkles } from 'lucide-react'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import type { AnaliseHubRow } from '../services/analiseCandidatoService'
import { HubSection } from './HubSection'

export interface AnaliseIABlockProps {
  /** The allowlist-projected IA analysis, or null when none exists. */
  analise: AnaliseHubRow | null | undefined
  /** The section read is in flight → HubSection skeleton. */
  isLoading?: boolean
  /** The section read failed → HubSection error copy. */
  isError?: boolean
}

/**
 * Resolve a band de score (UI-SPEC §Color — thresholds 70 / 40). Duplicated from
 * `TriagemTable` (module-private there) so this block owns its colorblind-safe chip
 * without widening the triagem module's export surface. 70-100 verde, 40-69 amarelo,
 * 0-39 vermelho, null → "—" sem-análise.
 */
function scoreBandClass(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return 'bg-white/10 text-white/50 border-white/20'
  }
  if (score >= 70) return 'bg-green-500/20 text-green-300 border-green-500/30'
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'
  return 'bg-red-500/20 text-red-300 border-red-500/30'
}

/** The score band chip — number + colour in ONE element (never colour-only). */
function ScoreBandChip({ score }: { score: number | null | undefined }) {
  const hasScore = score !== null && score !== undefined
  return (
    <span className="inline-flex items-center gap-1">
      <Sparkles className="h-3 w-3 text-[#35BFAD] opacity-70" aria-hidden="true" />
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-2xl font-semibold leading-none',
          scoreBandClass(score),
        )}
      >
        {hasScore ? score : '—'}
      </span>
    </span>
  )
}

/** A named, full (never truncated) list of strings under a sub-label. */
function ListaCompleta({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-white/80">{titulo}</p>
      <ul className="list-disc space-y-1 pl-5">
        {itens.map((item, i) => (
          <li key={`${titulo}-${i}`} className="text-sm text-white/80 leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AnaliseIABlock({ analise, isLoading, isError }: AnaliseIABlockProps) {
  return (
    <HubSection
      titulo="Análise da IA"
      estado="com_dados"
      isLoading={isLoading}
      isError={isError}
    >
      {/* Empty — no analysis row for this candidatura yet. */}
      {!analise ? (
        <div className="space-y-1">
          <p className="text-base font-semibold text-white">Análise ainda não disponível</p>
          <p className="text-sm text-white/70 leading-relaxed">
            A análise por IA é gerada na triagem da vaga.
          </p>
        </div>
      ) : analise.analise_status === 'falhou' ? (
        // Failed — read-only here; reprocess lives on the vaga triagem panel.
        <div className="space-y-3">
          <SugestaoIABadge />
          <p className="text-sm text-white/80 leading-relaxed">
            A análise da IA falhou nesta candidatura. Reprocesse pelo painel de triagem da vaga.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* RNF-07a — a IA sugere, a decisão é humana. */}
          <SugestaoIABadge />

          {/* Aderência à vaga — band chip (número + cor no mesmo elemento). */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white/80">Aderência à vaga</span>
            <ScoreBandChip score={analise.score_match} />
          </div>

          {/* Pontos fortes / Gaps — NA ÍNTEGRA (sem .slice — o corte é só na tabela vaga-level). */}
          <ListaCompleta titulo="Pontos fortes" itens={analise.pontos_fortes} />
          <ListaCompleta titulo="Gaps" itens={analise.gaps} />
          <ListaCompleta titulo="Sinais de atenção" itens={analise.flags} />
        </div>
      )}
    </HubSection>
  )
}
