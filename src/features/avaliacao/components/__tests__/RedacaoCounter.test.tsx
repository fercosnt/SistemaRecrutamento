/**
 * Phase 13 / Plan 13-01 Task 3 — Wave 0 RED scaffold for `RedacaoCounter`
 * (AVAL-05 / RF-R-02 — the candidate essay word counter).
 *
 * The counter is a 3-BAND length gate (UI-SPEC §Color), mechanical guidance and
 * NEVER a verdict (RNF-07a — a short counter means "too short", not "you failed"):
 *   - < 200 words  → muted `text-white/60` + "{N} palavras — mínimo 200" ; submit DISABLED
 *   - 200-500 words → accent `#35BFAD` + "{N} palavras"                  ; submit ENABLED
 *   - > 500 words  → amber `text-amber-300/80` + "{N} palavras — máximo 500" ; submit DISABLED
 *
 * ── Why this is RED now ──
 * `@/features/avaliacao/components/RedacaoCounter` does NOT exist yet → the import
 * throws "Cannot find module" at runtime. THAT is the calibrated Wave-0 failure
 * (smoke-runtime gate). The component lands in the Phase-13 candidate UI wave (Plan 03).
 * Do NOT stub the module to make this green.
 *
 * All copy strings are the EXACT pt-BR from 13-UI-SPEC.md §Color / §Copywriting.
 *
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md (Color band rule + copy)
 * @see src/features/avaliacao/components/SjtCasoAbertoScreen.tsx (countWords primitive reused)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-01-PLAN.md (Task 3)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
// GREEN (Plan 13-03): the module now exists and resolves under tsc + Vitest.
import { RedacaoCounter } from '@/features/avaliacao/components/RedacaoCounter'

const ACCENT = '#35BFAD'

// Build a string with exactly N words (space-separated tokens).
function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `palavra${i}`).join(' ')
}

describe('RedacaoCounter (Plan 13-01 — AVAL-05, Wave 0 RED)', () => {
  it('< 200 words → muted + "mínimo 200" helper + submit disabled', () => {
    const { container } = render(<RedacaoCounter text={words(150)} />)
    expect(screen.getByText(/150 palavras — mínimo 200/)).toBeInTheDocument()
    // muted band — neutral, never alarm-red; submit must be gated off
    expect(container.querySelector('[data-submit-enabled="false"]')).toBeTruthy()
    expect(container.innerHTML).not.toContain(ACCENT)
  })

  it('200-500 words → accent #35BFAD + "{N} palavras" + submit enabled', () => {
    const { container } = render(<RedacaoCounter text={words(300)} />)
    expect(screen.getByText(/300 palavras/)).toBeInTheDocument()
    expect(container.querySelector('[data-submit-enabled="true"]')).toBeTruthy()
    // in-range band uses the brand accent
    expect(container.innerHTML).toContain(ACCENT)
  })

  it('> 500 words → amber warning + "máximo 500" helper + submit disabled', () => {
    const { container } = render(<RedacaoCounter text={words(600)} />)
    expect(screen.getByText(/600 palavras — máximo 500/)).toBeInTheDocument()
    expect(container.querySelector('[data-submit-enabled="false"]')).toBeTruthy()
    // warm warning, NOT destructive-red
    expect(container.innerHTML).toContain('amber')
  })
})
