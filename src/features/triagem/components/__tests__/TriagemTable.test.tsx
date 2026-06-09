/**
 * Phase 10 / Plan 10-01 Task 3 — Wave 0 RED scaffold for `TriagemTable.tsx`
 * (TRIAGEM-02 dense panel) + the shared `SugestaoIABadge` (RNF-07a).
 *
 * RED against the not-yet-existing `../TriagemTable`. The static import below
 * makes Vitest fail with "Cannot find module '../TriagemTable'" — the calibrated
 * Wave-0 RED signal. The component lands in a later Phase-10 wave and flips this
 * GREEN.
 *
 * Assertions encode the UI-SPEC §A/§C contract exactly:
 *  - Score band thresholds: 70-100 verde, 40-69 amarelo, 0-39 vermelho,
 *    null → "—" sem-análise. The band shows the NUMBER plus the color.
 *  - "Comparar" disabled below 2 selected, enabled at 2-10, checkboxes disabled
 *    past 10.
 *  - SugestaoIABadge text "Sugestão da IA — decisão é sempre humana" rendered.
 *  - A falhou row shows a visible "Reprocessar análise" text label (not tooltip-only).
 *
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-UI-SPEC.md (§A bands 70/40, compare-bar gating, §C badge)
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-01-PLAN.md (Task 3 — TRIAGEM-02 / RNF-07a)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// RED: '../TriagemTable' does not exist yet → "Cannot find module".
import { TriagemTable, SugestaoIABadge } from '../TriagemTable'

type Row = {
  id: string
  candidato: { id: string; nome_completo: string }
  etapa_atual: string
  status: string
  created_at: string
  analise: {
    score_match: number | null
    pontos_fortes: string[]
    gaps: string[]
    flags: string[]
    status: 'sucesso' | 'falhou' | null
  } | null
}

function makeRow(over: Partial<Row> & { id: string }): Row {
  return {
    candidato: { id: `cand-${over.id}`, nome_completo: `Candidato ${over.id}` },
    etapa_atual: 'triagem',
    status: 'aguardando_resposta',
    created_at: '2026-06-01T00:00:00Z',
    analise: { score_match: 85, pontos_fortes: ['a'], gaps: ['b'], flags: [], status: 'sucesso' },
    ...over,
  } as Row
}

const noop = () => {}

describe('TriagemTable — TRIAGEM-02 score bands (UI-SPEC §A thresholds 70/40)', () => {
  it('score 85 renders the verde (forte) band', () => {
    render(
      <TriagemTable
        rows={[makeRow({ id: '1', analise: { score_match: 85, pontos_fortes: [], gaps: [], flags: [], status: 'sucesso' } })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    const chip = screen.getByText('85')
    expect(chip.className).toMatch(/green/)
  })

  it('score 55 renders the amarelo (médio) band', () => {
    render(
      <TriagemTable
        rows={[makeRow({ id: '2', analise: { score_match: 55, pontos_fortes: [], gaps: [], flags: [], status: 'sucesso' } })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    const chip = screen.getByText('55')
    expect(chip.className).toMatch(/yellow/)
  })

  it('score 20 renders the vermelho (fraco) band', () => {
    render(
      <TriagemTable
        rows={[makeRow({ id: '3', analise: { score_match: 20, pontos_fortes: [], gaps: [], flags: [], status: 'sucesso' } })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    const chip = screen.getByText('20')
    expect(chip.className).toMatch(/red/)
  })

  it('null score renders the "—" sem-análise band', () => {
    render(
      <TriagemTable
        rows={[makeRow({ id: '4', analise: null })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={noop}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('TriagemTable — TRIAGEM-02 compare-bar gating (2-10)', () => {
  const rows = Array.from({ length: 12 }, (_, i) => makeRow({ id: String(i) }))

  it('"Comparar" is disabled with fewer than 2 selected', () => {
    render(
      <TriagemTable rows={rows} selectedIds={['0']} onToggleSelect={noop} onCompare={noop} onReprocess={noop} />,
    )
    expect(screen.getByRole('button', { name: /comparar/i })).toBeDisabled()
  })

  it('"Comparar" is enabled with 2-10 selected', () => {
    render(
      <TriagemTable rows={rows} selectedIds={['0', '1']} onToggleSelect={noop} onCompare={noop} onReprocess={noop} />,
    )
    expect(screen.getByRole('button', { name: /comparar/i })).toBeEnabled()
  })

  it('checkboxes are disabled once 10 are selected', () => {
    const ten = Array.from({ length: 10 }, (_, i) => String(i))
    render(
      <TriagemTable rows={rows} selectedIds={ten} onToggleSelect={noop} onCompare={noop} onReprocess={noop} />,
    )
    // Row 11 (not selected) must be disabled because the cap is reached.
    const checkboxes = screen.getAllByRole('checkbox')
    const unselectedDisabled = checkboxes.some((c) => (c as HTMLInputElement).disabled)
    expect(unselectedDisabled).toBe(true)
  })
})

describe('TriagemTable — RNF-07a guardrails + reprocess affordance', () => {
  it('renders the SugestaoIABadge copy "Sugestão da IA — decisão é sempre humana"', () => {
    render(<SugestaoIABadge />)
    expect(screen.getByText('Sugestão da IA — decisão é sempre humana')).toBeInTheDocument()
  })

  it('a falhou row shows a visible "Reprocessar análise" text label (not tooltip-only)', () => {
    render(
      <TriagemTable
        rows={[makeRow({ id: '9', analise: { score_match: null, pontos_fortes: [], gaps: [], flags: [], status: 'falhou' } })]}
        selectedIds={[]}
        onToggleSelect={noop}
        onCompare={noop}
        onReprocess={vi.fn()}
      />,
    )
    expect(screen.getByText('Reprocessar análise')).toBeInTheDocument()
  })
})
