/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 17 / Plan 17-01 Task 2 — Wave 0 RED scaffold for the RH hub empty state (D-07).
 *
 * RED CONTRACT: this file STATICALLY imports `HubSection` from
 * `@/features/hub-candidato/components/HubSection`, which does NOT exist until Plan 17-03
 * lands the hub feature. The import makes Vitest fail with "Cannot find module" at
 * collection — the calibrated Wave-0 RED signal. The component lands in 17-03 → GREEN.
 *
 * The assertions encode the D-07 "NEVER invent data" contract + the UI-SPEC verbatim copy:
 *  - A future / not-yet-reached stage renders the empty-state heading
 *    "Etapa ainda não iniciada" and body
 *    "Esta etapa será liberada quando o candidato avançar no funil."
 *  - The rendered output contains NONE of the hardcoded mock values that were the sin of
 *    the 1864-line PerfilCandidatoRHPage mock ("45%", "Concluído") — the hub reads real
 *    services or shows an explicit empty state, never fabricated numbers.
 *
 * Contract for the hub component (Plan 17-03 must satisfy): `HubSection` accepts at least
 * `{ titulo: string; estado: 'futuro' | 'sem_dados' | 'com_dados'; children?: ReactNode }`
 * and renders the UI-SPEC empty-state copy for `estado === 'futuro'`. The exact prop names
 * are the implementer's choice in 17-03; this RED spec pins the COPY + the no-mock-data
 * invariant, which are the load-bearing D-07 guarantees.
 *
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-UI-SPEC.md (§Empty states — verbatim copy)
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-PATTERNS.md (§hub section empty-state pattern)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// RED: '@/features/hub-candidato/components/HubSection' does not exist yet → "Cannot find module".
// GREEN after Plan 17-03 creates the hub feature + its empty-state-aware section component.
import { HubSection } from '@/features/hub-candidato/components/HubSection'

describe('Hub do candidato (RH) — empty state de etapa futura (D-07)', () => {
  it('etapa futura/não-iniciada → mostra o heading "Etapa ainda não iniciada" (cópia UI-SPEC)', () => {
    render(<HubSection titulo="Entrevista" estado="futuro" />)
    expect(screen.getByText('Etapa ainda não iniciada')).toBeInTheDocument()
  })

  it('etapa futura → mostra o corpo verbatim "Esta etapa será liberada quando o candidato avançar no funil."', () => {
    render(<HubSection titulo="Entrevista" estado="futuro" />)
    expect(
      screen.getByText('Esta etapa será liberada quando o candidato avançar no funil.'),
    ).toBeInTheDocument()
  })

  it('NUNCA inventa dados — sem números mock hardcoded ("45%" / "Concluído") no empty state', () => {
    const { container } = render(<HubSection titulo="Avaliação Assíncrona" estado="futuro" />)
    expect(container.textContent).not.toContain('45%')
    expect(container.textContent).not.toContain('Concluído')
  })
})
