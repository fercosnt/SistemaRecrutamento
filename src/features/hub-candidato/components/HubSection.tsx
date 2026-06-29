/**
 * HubSection — empty-state-aware section wrapper for the RH candidate hub (D-07).
 *
 * Each hub section is SERVICE-BACKED or shows an explicit empty state — NEVER invented
 * data (the sin of the 1864-line PerfilCandidatoRHPage mock this feature replaces). The
 * loading/error/empty rendering MECHANICS are delegated to the shared `<AsyncState>`
 * (18-04, RESIL-03) so the two never drift; HubSection keeps only its funnel-relative
 * COPY overrides. The UI-SPEC states render in priority order:
 *   1. loading      → skeleton (via <AsyncState>, `<Skeleton className="… bg-white/5" />`)
 *   2. error        → "Não foi possível carregar esta seção." / "Tente recarregar a página."
 *   3. futuro       → "Etapa ainda não iniciada" / "Esta etapa será liberada quando o candidato avançar no funil."
 *   4. sem_dados    → "Sem dados nesta etapa" / "Nenhum registro foi gerado ainda para esta etapa."
 *   5. com_dados    → render the real `children` (service-backed content)
 *
 * It carries NO hardcoded numbers/percentages of its own — the verbatim empty-state copy
 * is the D-07 "never invent data" guarantee that the 17-01 hubEmptyState RED spec pins.
 *
 * Surface = dark-enough glass (`variant="dark"` → `bg-black/30`) so white/turquoise 14-16px
 * body text passes WCAG AA (UI-SPEC §Color contrast). The `primary` token resolves correctly
 * (hsl(var(--primary)) = #00109E) — this section uses glass tokens for the surface.
 *
 * @module features/hub-candidato/components/HubSection
 * @see src/components/ui/AsyncState.tsx (shared loading/slow/error/empty wrapper — delegated to here)
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-UI-SPEC.md (§Empty states — verbatim copy)
 */
import type { ReactNode } from 'react'
import { Glass } from '@/components/ui/glass'
import { AsyncState } from '@/components/ui/AsyncState'

/**
 * The section render state. `estado` is the canonical driver (matches the 17-01 RED
 * contract); `isLoading` / `isError` are convenience flags that take precedence when set
 * so a caller can map a TanStack-Query `{ isLoading, isError }` directly.
 */
export type HubSectionEstado = 'futuro' | 'sem_dados' | 'com_dados'

export interface HubSectionProps {
  /** Section heading (e.g. "Entrevista", "Avaliação Assíncrona"). */
  titulo: string
  /** Funnel-relative state of this section (D-07). */
  estado: HubSectionEstado
  /** When true, the section read is in flight → skeleton (overrides `estado`). */
  isLoading?: boolean
  /** When true, the section read failed → error copy (overrides `estado`). */
  isError?: boolean
  /** Service-backed content, rendered only when `estado === 'com_dados'`. */
  children?: ReactNode
}

/**
 * Verbatim UI-SPEC copy — single source so the strings never drift. These are the
 * HUB-SPECIFIC funnel-relative overrides (`futuro` / `sem_dados` / `erro`); the
 * loading/slow/empty/error *mechanics* are delegated to the shared <AsyncState> so the
 * two components never drift (18-UI-SPEC §Adoption — "keep its futuro/sem_dados semantics").
 */
const COPY = {
  futuro: {
    heading: 'Etapa ainda não iniciada',
    body: 'Esta etapa será liberada quando o candidato avançar no funil.',
  },
  sem_dados: {
    heading: 'Sem dados nesta etapa',
    body: 'Nenhum registro foi gerado ainda para esta etapa.',
  },
  erro: {
    heading: 'Não foi possível carregar esta seção.',
    body: 'Tente recarregar a página.',
  },
} as const

export function HubSection({ titulo, estado, isLoading, isError, children }: HubSectionProps) {
  // `futuro` and `sem_dados` are HubSection's two funnel-relative empty states. Map the
  // active one onto <AsyncState>'s single empty slot via the `copy.empty` override so the
  // verbatim funnel copy stays HubSection-owned while the rendering mechanics are shared.
  const isEmpty = estado === 'futuro' || estado === 'sem_dados'
  const emptyCopy = estado === 'futuro' ? COPY.futuro : COPY.sem_dados

  return (
    <Glass variant="dark" blur="lg" className="rounded-xl p-6">
      <h2 className="mb-4 text-xl font-semibold text-white md:text-2xl">{titulo}</h2>

      {/* Delegate loading/error/empty rendering to the shared <AsyncState> (no drift).
          glass={false} — HubSection already owns the dark-glass surface + title above.
          No onRetry → HubSection's error state stays retry-less (recarregar a página),
          identical to its pre-refactor behavior. */}
      <AsyncState
        glass={false}
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        copy={{
          // WR-04: o Hub lê dados do funil do DB (sem IA); override neutro da slow-note
          // p/ não dizer "processando com IA / ~30s" num read de DB lento.
          slow: { heading: 'Carregando…', body: 'Isso pode levar alguns segundos.' },
          error: { heading: COPY.erro.heading, generic: COPY.erro.body },
          empty: { heading: emptyCopy.heading, body: emptyCopy.body },
        }}
      >
        {children}
      </AsyncState>
    </Glass>
  )
}
