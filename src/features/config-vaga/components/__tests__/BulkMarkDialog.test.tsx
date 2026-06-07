/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 7 / Plan 07-01 Task 2 — Wave 0 RED scaffold for BulkMarkDialog (VAGACFG-03).
 *
 * Renders the PLANNED (not-yet-existing) component
 * `@/features/config-vaga/components/BulkMarkDialog`. Compiles under TS strict
 * but is EXPECTED to FAIL at runtime (module-not-found) until Plan 04 lands the
 * component. Do NOT stub the module to make this green.
 *
 * Coverage (UI-SPEC §Copywriting "Marcar tudo como informativa" + D-11):
 *   - confirming sets EVERY option to neutro + peso 0 + nota_ia null
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-UI-SPEC.md §Copywriting
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-11)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BulkMarkDialog } from '@/features/config-vaga/components/BulkMarkDialog'

describe('BulkMarkDialog (Plan 07-01 — VAGACFG-03, Wave 0 RED)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('T1: confirming sets every option to neutro + peso 0 + nota_ia null (D-11)', () => {
    const onConfirm = vi.fn()
    render(
      <BulkMarkDialog
        open
        opcoes={[
          { opcao_id: 'o1', texto: 'Sim', tag: 'knockout', peso: 50, nota_ia: 'x' },
          { opcao_id: 'o2', texto: 'Não', tag: 'pontua', peso: 10, nota_ia: 'y' },
        ]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )

    // The trigger copy from UI-SPEC.
    fireEvent.click(screen.getByText(/Marcar tudo como informativa/i))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    const reset = onConfirm.mock.calls[0][0]
    for (const opt of reset) {
      expect(opt.tag).toBe('neutro')
      expect(opt.peso).toBe(0)
      expect(opt.nota_ia).toBeNull()
    }
  })
})
