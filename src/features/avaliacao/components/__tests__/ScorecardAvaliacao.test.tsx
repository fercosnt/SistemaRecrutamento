/**
 * Phase 23 / Plan 23-04 Task 2 — psychometric honesty (UX-07) for the RH scorecard.
 *
 * The Big Five rows are CONTEXTUAL / non-evaluative (RNF-07a): the RH sees only the
 * NEUTRAL band (muito baixo…muito alto), NEVER the raw percentil digit (Phase 23) and
 * NEVER an "abaixo/dentro/acima do esperado" evaluative frame.
 *
 * @see src/features/avaliacao/components/ScorecardAvaliacao.tsx
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('../../hooks/useScorecardCandidato', () => ({
  useScorecardCandidato: vi.fn(),
}))

import { ScorecardAvaliacao } from '../ScorecardAvaliacao'
import { useScorecardCandidato } from '../../hooks/useScorecardCandidato'
import type { ScoreRow } from '../../services/scoresRhService'

const BIGFIVE_ROW = {
  id: 'bf-1',
  tipo: 'big_five',
  subtipo: null,
  pergunta_id: null,
  score: null,
  score_max: null,
  status: 'sucesso',
  metadata: {
    dimensoes: [
      { dim: 'O', percentil: 88, banda: 'muito_alto' },
      { dim: 'N', percentil: 12, banda: 'muito_baixo' },
    ],
    resumo_executivo: 'Resumo executivo AI.',
  },
  citacoes: null,
  red_flags: null,
} as unknown as ScoreRow

function mockRows(rows: ScoreRow[]) {
  vi.mocked(useScorecardCandidato).mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useScorecardCandidato>)
}

describe('ScorecardAvaliacao — UX-07 Big Five banda neutra (sem percentil cru)', () => {
  it('não renderiza nenhum percentil cru nas rows Big Five', () => {
    mockRows([BIGFIVE_ROW])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.queryByText(/Percentil\s*\d/)).toBeNull()
    expect(screen.queryByText(/Percentil/i)).toBeNull()
  })

  it('mostra a banda NEUTRA por dimensão (nunca "esperado")', () => {
    mockRows([BIGFIVE_ROW])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('Muito alto')).toBeInTheDocument()
    expect(screen.getByText('Muito baixo')).toBeInTheDocument()
    // Big Five é não-avaliativo → moldura avaliativa NÃO aparece nas rows Big Five
    expect(screen.queryByText(/esperado/i)).toBeNull()
  })
})
