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
// 49-41: o vocabulário do sinal tem UMA fonte, a mesma que a EF escreve.
import {
  SINAL_INSTRUCAO_AO_MODELO,
  rotuloDoSinal,
} from '../../../../../supabase/functions/_shared/sinal-revisao'

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

// ── Phase 49 / plano 49-41 — o motivo «instrução à IA» no card da SJT (JORN-41) ────────
//
// Na SJT caso aberto, uma resposta com imperativo nu dirigido à IA é avaliada normalmente:
// a nota composta É gravada, a linha vai a `pendente_humano` e o código entra em
// `metadata.motivos_revisao` (49-39). O marcador neutro já dizia «Requer revisão humana»;
// sem o motivo, o RH não sabe O QUE revisar. Este plano mostra SÓ o motivo do sinal — os
// outros motivos têm dono próprio e não são renderizados aqui.
describe('ScorecardAvaliacao — o motivo do sinal junto de pendente_humano (49-41 / JORN-41)', () => {
  function casoAberto(motivos: string[] | undefined): ScoreRow {
    return {
      id: 'ca-1',
      tipo: 'sjt',
      subtipo: 'caso_aberto',
      pergunta_id: 'p-1',
      score: 17,
      score_max: 25,
      status: 'pendente_humano',
      metadata: {
        dimension_scores: [{ dimension: 'D1', score_1_5: 4 }],
        composite_0_25: 17,
        ...(motivos ? { motivos_revisao: motivos } : {}),
      },
      citacoes: null,
      red_flags: null,
    } as unknown as ScoreRow
  }

  it('com o código em motivos_revisao, o rótulo pt-BR aparece junto do marcador', () => {
    mockRows([casoAberto([SINAL_INSTRUCAO_AO_MODELO])])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('Requer revisão humana')).toBeInTheDocument()
    expect(
      screen.getByText(rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO)),
    ).toBeInTheDocument()
    expect(screen.queryByText(SINAL_INSTRUCAO_AO_MODELO)).toBeNull()
  })

  it('sem o código nos motivos, o rótulo NÃO aparece (e os outros motivos não são deste plano)', () => {
    mockRows([casoAberto(['abaixo_do_corte'])])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('Requer revisão humana')).toBeInTheDocument()
    expect(screen.queryByText(rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO))).toBeNull()
    expect(screen.queryByText('abaixo_do_corte')).toBeNull()
  })

  it('sem motivos_revisao (linhas antigas), nada muda', () => {
    mockRows([casoAberto(undefined)])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.queryByText(rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO))).toBeNull()
  })

  it('tom neutro e a nota composta intacta (RNF-07a)', () => {
    mockRows([casoAberto([SINAL_INSTRUCAO_AO_MODELO])])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    const rotulo = screen.getByText(rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO))
    const tokens = rotulo.className.split(/\s+/)
    expect(tokens.filter((t) => /^(bg|text|border)-(red|destructive)/.test(t))).toEqual([])
    expect(screen.getByText('17')).toBeInTheDocument()
  })
})
