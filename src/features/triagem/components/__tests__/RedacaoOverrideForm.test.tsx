/**
 * Phase 13 / Plan 13-01 Task 3 — Wave 0 RED scaffold for `RedacaoOverrideForm`
 * (AVAL-07 / RF-R-23/24 — the RH human-review override form).
 *
 * The RH reviewer overrides via 4 BARS sliders (D1-D4, 1-5), which recompute the
 * composite (= mean × 20) + color live on change; `notas_revisor` is mandatory
 * (≥50 chars on EVERY decision, not only override); `decisao_revisor` is a radio
 * ∈ {aprovado, reprovado, duvida}. "Salvar revisão" is disabled until notes ≥50
 * AND a decision is chosen. (UI-SPEC §RH human-review queue.)
 *
 * ── Why this is RED now ──
 * `@/features/triagem/components/RedacaoOverrideForm` does NOT exist yet → the
 * import throws "Cannot find module" at runtime. THAT is the calibrated Wave-0
 * failure. The component lands in the Phase-13 RH review wave (Plan 05).
 * Do NOT stub the module to make this green.
 *
 * All copy strings are the EXACT pt-BR from 13-UI-SPEC.md §Copywriting Contract.
 *
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md (RH review copy)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-01-PLAN.md (Task 3)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
// GREEN as of Plan 13-05 — the component now exists (the Wave-0 @ts-expect-error
// self-resolved on authoring, per the scaffold note). The import resolves cleanly.
import { RedacaoOverrideForm } from '@/features/triagem/components/RedacaoOverrideForm'

// IA-suggested baseline scores the sliders default to (the override starts from these).
const IA_SCORES = { D1: 4, D2: 4, D3: 4, D4: 4 } as const

describe('RedacaoOverrideForm (Plan 13-01 — AVAL-07, Wave 0 RED)', () => {
  it('renders the 4 BARS dimensions (D1-D4) + the decisão radio (aprovado/reprovado/duvida)', () => {
    render(<RedacaoOverrideForm iaScores={IA_SCORES} />)
    // the 4 Beauty Smile value dimensions
    expect(screen.getByText(/Experiência UAU/)).toBeInTheDocument()
    expect(screen.getByText(/Inovação/)).toBeInTheDocument()
    expect(screen.getByText(/Atitude de Dono/)).toBeInTheDocument()
    expect(screen.getByText(/Sede de Crescimento/)).toBeInTheDocument()
    // decisão options
    expect(screen.getByText(/Aprovado/)).toBeInTheDocument()
    expect(screen.getByText(/Reprovado/)).toBeInTheDocument()
    expect(screen.getByText(/Dúvida/)).toBeInTheDocument()
  })

  it('shows the live composite recompute note (mean ×20 on slider change)', () => {
    render(<RedacaoOverrideForm iaScores={IA_SCORES} />)
    expect(screen.getByText(/Composto e cor recalculados ao ajustar/)).toBeInTheDocument()
  })

  it('Salvar revisão is DISABLED until notas_revisor ≥ 50 chars + a decisão chosen', () => {
    render(<RedacaoOverrideForm iaScores={IA_SCORES} />)
    // initial render: no notes, no decision → Salvar disabled
    const salvar = screen.getByRole('button', { name: /Salvar revisão/ })
    expect(salvar).toBeDisabled()
    // the ≥50 char counter affordance is present
    expect(screen.getByText(/mínimo 50 caracteres/)).toBeInTheDocument()
  })
})
