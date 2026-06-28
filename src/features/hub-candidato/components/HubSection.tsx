/**
 * HubSection — empty-state-aware section wrapper for the RH candidate hub (D-07).
 *
 * Each hub section is SERVICE-BACKED or shows an explicit empty state — NEVER invented
 * data (the sin of the 1864-line PerfilCandidatoRHPage mock this feature replaces). This
 * presentational wrapper renders the UI-SPEC states in priority order:
 *   1. loading      → skeleton (mirrors EntrevistaWorkspace's `<Skeleton className="… bg-white/5" />`)
 *   2. error        → "Não foi possível carregar esta seção." / "Tente recarregar a página."
 *   3. futuro       → "Etapa ainda não iniciada" / "Esta etapa será liberada quando o candidato avançar no funil."
 *   4. sem_dados    → "Sem dados nesta etapa" / "Nenhum registro foi gerado ainda para esta etapa."
 *   5. com_dados    → render the real `children` (service-backed content)
 *
 * It carries NO hardcoded numbers/percentages of its own — the verbatim empty-state copy
 * is the D-07 "never invent data" guarantee that the 17-01 hubEmptyState RED spec pins.
 *
 * Surface = dark-enough glass (`variant="dark"` → `bg-black/30`) so white/turquoise 14-16px
 * body text passes WCAG AA (UI-SPEC §Color contrast). NEVER the broken default-primary token
 * (D-26 — it renders transparent project-wide); use hex-literal / glass tokens only.
 *
 * @module features/hub-candidato/components/HubSection
 * @see src/features/entrevista/components/EntrevistaWorkspace.tsx (glass section + Skeleton idiom)
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-UI-SPEC.md (§Empty states — verbatim copy)
 */
import type { ReactNode } from 'react'
import { Glass } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'

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

/** Verbatim UI-SPEC copy — single source so the strings never drift. */
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

/** Centered empty/error block — heading + body, no fabricated data. */
function EstadoVazio({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <p className="text-base font-semibold text-white md:text-lg">{heading}</p>
      <p className="max-w-md text-sm text-white/70">{body}</p>
    </div>
  )
}

export function HubSection({ titulo, estado, isLoading, isError, children }: HubSectionProps) {
  return (
    <Glass variant="dark" blur="lg" className="rounded-xl p-6">
      <h2 className="mb-4 text-xl font-semibold text-white md:text-2xl">{titulo}</h2>

      {isLoading ? (
        <Skeleton className="h-24 w-full bg-white/5" />
      ) : isError ? (
        <EstadoVazio heading={COPY.erro.heading} body={COPY.erro.body} />
      ) : estado === 'futuro' ? (
        <EstadoVazio heading={COPY.futuro.heading} body={COPY.futuro.body} />
      ) : estado === 'sem_dados' ? (
        <EstadoVazio heading={COPY.sem_dados.heading} body={COPY.sem_dados.body} />
      ) : (
        children
      )}
    </Glass>
  )
}
