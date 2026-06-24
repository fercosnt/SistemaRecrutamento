/**
 * RedacaoSidebar — the RH review-queue sidebar (AVAL-07 / RF-R-17/23/26).
 *
 * Lists the pending essays for the vaga as color chips, ordered by SEVERITY
 * (vermelho → amarelo → verde), with a DEFAULT filter of vermelho+amarelo (verde
 * shown on demand). The 3-color triage is RH-facing ONLY — it never appears on a
 * candidate surface. All copy is verbatim from UI-SPEC §Copywriting Contract.
 *
 * @module features/triagem/components/RedacaoSidebar
 * @see src/features/triagem/components/TriagemTable.tsx (queue list + filter pattern)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md (§RH 3-color triage system)
 */
import { useMemo, useState } from 'react'
import { cn } from '@/components/ui/utils'
import { RedacaoCorBadge } from './RedacaoCorBadge'
import type { RedacaoCor } from '../services/revisaoRedacaoService'

/** One queue item the sidebar renders (the minimal shape the list needs). */
export interface RedacaoSidebarItem {
  id: string
  candidato_nome: string | null
  cor: RedacaoCor
}

/** Severity rank (vermelho first → verde last). */
const COR_SEVERITY: Record<RedacaoCor, number> = { vermelho: 3, amarelo: 2, verde: 1 }

/** The default filter = vermelho+amarelo (verde on demand — UI-SPEC). */
const DEFAULT_FILTER: RedacaoCor[] = ['vermelho', 'amarelo']
const ALL_CORES: RedacaoCor[] = ['vermelho', 'amarelo', 'verde']

const COR_FILTER_LABEL: Record<RedacaoCor, string> = {
  vermelho: 'Vermelhas',
  amarelo: 'Amarelas',
  verde: 'Verdes',
}

export interface RedacaoSidebarProps {
  items: RedacaoSidebarItem[]
  /** The currently-selected essay id (highlighted). */
  selectedId?: string | null
  /** Called when an essay row is clicked (1-at-a-time navigation). */
  onSelect?: (id: string) => void
  className?: string
}

/**
 * The review-queue sidebar. Severity-sorted, default filter vermelho+amarelo.
 */
export function RedacaoSidebar({
  items,
  selectedId,
  onSelect,
  className,
}: RedacaoSidebarProps) {
  const [filter, setFilter] = useState<RedacaoCor[]>(DEFAULT_FILTER)

  const visible = useMemo(() => {
    const filtered = items.filter((it) => filter.includes(it.cor))
    return [...filtered].sort(
      (a, b) => (COR_SEVERITY[b.cor] ?? 0) - (COR_SEVERITY[a.cor] ?? 0),
    )
  }, [items, filter])

  const isDefaultFilter =
    filter.length === DEFAULT_FILTER.length &&
    DEFAULT_FILTER.every((c) => filter.includes(c))

  function toggleCor(cor: RedacaoCor) {
    setFilter((prev) =>
      prev.includes(cor) ? prev.filter((c) => c !== cor) : [...prev, cor],
    )
  }

  return (
    <aside className={cn('space-y-4', className)}>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold leading-tight text-white">
          Revisão de redações
        </h2>
        {isDefaultFilter ? (
          <p className="text-sm font-semibold text-white/60">
            Mostrando vermelhas e amarelas.
          </p>
        ) : null}
      </div>

      {/* Filtrar por cor */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-white/70">Filtrar por cor</p>
        <div className="flex flex-wrap gap-2">
          {ALL_CORES.map((cor) => {
            const active = filter.includes(cor)
            return (
              <button
                key={cor}
                type="button"
                onClick={() => toggleCor(cor)}
                aria-pressed={active}
                className={cn(
                  'min-h-[44px] rounded-lg border px-3 py-1 text-sm font-semibold transition-colors',
                  active
                    ? 'border-white/30 bg-white/20 text-white'
                    : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10',
                )}
              >
                {COR_FILTER_LABEL[cor]}
              </button>
            )
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-white/60">
          Nenhuma redação pendente de revisão.
        </p>
      ) : (
        <ul role="list" className="space-y-2">
          {visible.map((it) => {
            const selected = it.id === selectedId
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(it.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                    selected
                      ? 'border-white/30 bg-white/20'
                      : 'border-white/15 bg-white/5 hover:bg-white/10',
                  )}
                >
                  <span className="truncate text-sm font-semibold text-white">
                    {it.candidato_nome ?? 'Candidato'}
                  </span>
                  <RedacaoCorBadge cor={it.cor} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
