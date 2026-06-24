/**
 * Phase 13 / Plan 13-01 Task 3 — Wave 0 RED scaffold for `RedacaoSidebar`
 * (AVAL-07 / RF-R-17/23/26 — the RH review queue sidebar).
 *
 * The sidebar lists pending essays for the vaga as color chips, ordered by
 * SEVERITY (vermelho → amarelo → verde), with a DEFAULT filter of vermelho+amarelo
 * (verde shown on demand). The 3-color triage is RH-facing ONLY — it never appears
 * on a candidate surface. (UI-SPEC §RH 3-color triage system.)
 *
 * ── Why this is RED now ──
 * `@/features/triagem/components/RedacaoSidebar` does NOT exist yet → the import
 * throws "Cannot find module" at runtime. THAT is the calibrated Wave-0 failure.
 * The component lands in the Phase-13 RH review wave (Plan 05).
 * Do NOT stub the module to make this green.
 *
 * All copy strings are the EXACT pt-BR from 13-UI-SPEC.md §Copywriting Contract.
 *
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md (RH sidebar copy + sort)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-01-PLAN.md (Task 3)
 */
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
// RED: this module does not exist yet — import throws "Cannot find module" at
// runtime (Vitest) AND tsc TS2307. The @ts-expect-error keeps the tsc baseline flat
// (Phase 4.1 precedent); it self-resolves the moment Plan 13-05 authors the component.
// @ts-expect-error — module lands in Plan 13-05; RED until then.
import { RedacaoSidebar } from '@/features/triagem/components/RedacaoSidebar'

// A mixed queue: one of each color, intentionally out of severity order on input.
const QUEUE = [
  { id: 'r-verde', candidato_nome: 'Ana', cor: 'verde' as const },
  { id: 'r-vermelho', candidato_nome: 'Bruno', cor: 'vermelho' as const },
  { id: 'r-amarelo', candidato_nome: 'Carla', cor: 'amarelo' as const },
]

describe('RedacaoSidebar (Plan 13-01 — AVAL-07, Wave 0 RED)', () => {
  it('default filter shows vermelho + amarelo (verde on demand)', () => {
    render(<RedacaoSidebar items={QUEUE} />)
    // default-filter note from UI-SPEC
    expect(screen.getByText(/Mostrando vermelhas e amarelas/)).toBeInTheDocument()
    // verde is hidden by default
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    expect(screen.getByText('Bruno')).toBeInTheDocument()
    expect(screen.getByText('Carla')).toBeInTheDocument()
  })

  it('orders the queue by severity DESC (vermelho before amarelo)', () => {
    render(<RedacaoSidebar items={QUEUE} />)
    const list = screen.getByRole('list')
    const rendered = within(list)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '')
    const vermelhoIdx = rendered.findIndex((t) => /Bruno/.test(t))
    const amareloIdx = rendered.findIndex((t) => /Carla/.test(t))
    expect(vermelhoIdx).toBeGreaterThanOrEqual(0)
    expect(amareloIdx).toBeGreaterThan(vermelhoIdx)
  })

  it('renders the queue heading "Revisão de redações"', () => {
    render(<RedacaoSidebar items={QUEUE} />)
    expect(screen.getByText(/Revisão de redações/)).toBeInTheDocument()
  })
})
