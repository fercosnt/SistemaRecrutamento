/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 7 / Plan 07-01 Task 1 — Wave 0 RED scaffold for TemplateVagaSelector (VAGACFG-01).
 *
 * Renders the PLANNED (not-yet-existing) component
 * `@/features/config-vaga/components/TemplateVagaSelector`. Compiles under TS
 * strict but is EXPECTED to FAIL at runtime (module-not-found) until Plan 04
 * lands the component. Do NOT stub the module to make this green.
 *
 * Coverage (UI-SPEC §Interaction Notes — TemplateVagaSelector; D-04):
 *   - all 8 cargo cards render
 *   - on-select invokes the form-state callback with a DEEP COPY of the
 *     template's pesos+testes (mutating the received value does NOT mutate
 *     `cargoTemplates`)
 *   - re-selecting a DIFFERENT template after one is chosen surfaces the
 *     "Trocar template" AlertDialog (overwrite confirm) before applying
 *
 * Mirrors the RTL idiom of src/components/__tests__/RoleGuard.test.tsx.
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-UI-SPEC.md §Interaction Notes
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-04)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplateVagaSelector } from '@/features/config-vaga/components/TemplateVagaSelector'
import { cargoTemplates } from '@/features/config-vaga/templates/cargoTemplates'

describe('TemplateVagaSelector (Plan 07-01 — VAGACFG-01, Wave 0 RED)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('T1: renders all 8 cargo cards', () => {
    render(<TemplateVagaSelector onSelect={vi.fn()} selectedSlug={null} />)
    // Each of the 8 cargo labels must be visible (role-based query on the card).
    for (const tpl of Object.values(cargoTemplates)) {
      expect(screen.getByText(tpl.label)).toBeInTheDocument()
    }
  })

  it('T2: on-select invokes onSelect with a DEEP COPY (mutation isolation, D-04)', () => {
    const onSelect = vi.fn()
    render(<TemplateVagaSelector onSelect={onSelect} selectedSlug={null} />)

    fireEvent.click(screen.getByText(cargoTemplates.dentista.label))
    expect(onSelect).toHaveBeenCalledTimes(1)

    const received = onSelect.mock.calls[0][0]
    // Mutating the received payload must NOT mutate the source template.
    received.pesos_avaliacao.triagem = 999
    expect(cargoTemplates.dentista.pesos_avaliacao.triagem).not.toBe(999)
  })

  it('T3: re-selecting a DIFFERENT template opens the "Trocar template" AlertDialog', () => {
    const onSelect = vi.fn()
    // A template is already chosen (selectedSlug=dentista). Picking another one
    // must surface the overwrite-confirm AlertDialog BEFORE applying.
    render(
      <TemplateVagaSelector onSelect={onSelect} selectedSlug="dentista" />
    )

    fireEvent.click(screen.getByText(cargoTemplates.recepcionista.label))
    // The "Trocar template" confirm copy must appear; onSelect must NOT have
    // fired yet (the swap is gated behind the dialog).
    expect(screen.getByText(/Trocar template/i)).toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
