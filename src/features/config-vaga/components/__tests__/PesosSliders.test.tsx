/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 7 / Plan 07-01 Task 2 — Wave 0 RED scaffold for PesosSliders (VAGACFG-02).
 *
 * Renders the PLANNED (not-yet-existing) component
 * `@/features/config-vaga/components/PesosSliders`. Compiles under TS strict
 * but is EXPECTED to FAIL at runtime (module-not-found) until Plan 04 lands the
 * component. Do NOT stub the module to make this green.
 *
 * Coverage (UI-SPEC §Color/Copywriting + D-08):
 *   - live-sum indicator renders the ERROR state (red text / "faltam") when sum≠100
 *   - live-sum indicator renders the VALID/accent state when sum=100
 *   - dragging one slider does NOT auto-rebalance the others (D-08 no silent rebalance)
 *
 * Mirrors the RTL idiom of src/components/__tests__/RoleGuard.test.tsx.
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-UI-SPEC.md §Copywriting
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-07, D-08)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PesosSliders } from '@/features/config-vaga/components/PesosSliders'

describe('PesosSliders (Plan 07-01 — VAGACFG-02, Wave 0 RED)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('T1: live-sum indicator shows the invalid/error copy when sum != 100', () => {
    render(
      <PesosSliders
        value={{
          triagem: 30,
          work_sample_sjt: 30,
          redacao_cultural: 15,
          entrevista: 20,
        }}
        onChange={vi.fn()}
      />
    )
    // Sum = 95 → invalid state. The "faltam" hint must be present (D-08 copy).
    expect(screen.getByText(/faltam/i)).toBeInTheDocument()
  })

  it('T2: live-sum indicator shows the valid copy when sum = 100', () => {
    render(
      <PesosSliders
        value={{
          triagem: 30,
          work_sample_sjt: 30,
          redacao_cultural: 15,
          entrevista: 25,
        }}
        onChange={vi.fn()}
      />
    )
    // Sum = 100 → valid state ("pesos prontos para publicar" per UI-SPEC).
    expect(screen.getByText(/prontos para publicar/i)).toBeInTheDocument()
  })

  it('T3: dragging one slider does NOT auto-rebalance the others (D-08)', () => {
    const onChange = vi.fn()
    render(
      <PesosSliders
        value={{
          triagem: 30,
          work_sample_sjt: 30,
          redacao_cultural: 15,
          entrevista: 25,
        }}
        onChange={onChange}
      />
    )
    const sliders = screen.getAllByRole('slider')
    fireEvent.keyDown(sliders[0], { key: 'ArrowRight' })
    // Only the dragged key changes; the others stay put (no silent rebalance).
    // The change payload must NOT redistribute — the other 3 keys keep their value.
    const lastCall = onChange.mock.calls.at(-1)?.[0]
    expect(lastCall.work_sample_sjt).toBe(30)
    expect(lastCall.redacao_cultural).toBe(15)
    expect(lastCall.entrevista).toBe(25)
  })
})
