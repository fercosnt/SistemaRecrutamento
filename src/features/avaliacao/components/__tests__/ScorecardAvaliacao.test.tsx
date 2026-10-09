/**
 * Phase 23 / Plan 23-04 Task 2 — psychometric honesty (UX-07) for the RH scorecard.
 *
 * The Big Five rows are CONTEXTUAL / non-evaluative (RNF-07a): NEVER the raw percentil
 * digit (Phase 23) and NEVER an "abaixo/dentro/acima do esperado" evaluative frame.
 *
 * ⚠ 51-02 / JORN-45 (D-19, D-32 — D-56): até aqui este arquivo FIXAVA as faixas («Muito alto» /
 * «Muito baixo») como contrato — a D-31 da 49 dizia «as faixas seguem no hub». A D-32 da 51 a
 * revoga para o hub: o detalhe que o RH abre diz SÓ «Concluído» ou «Não fez». O caso das faixas
 * virou o caso «Concluído» com as ausências (faixa, percentil, dígito, resumo da IA) — e a mordida
 * foi provada contra `refs/gsd/51-02/base`, onde as faixas ainda renderizam.
 *
 * D-20: o card do caso aberto mostra o TEXTO INTEGRAL do candidato ao lado das citações da IA,
 * lido por `getRespostaCasoAbertoSjt` (mockado aqui), sempre como nó de texto React.
 *
 * @see src/features/avaliacao/components/ScorecardAvaliacao.tsx
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

// Sem `.env.local` (worktree da prova de mordida, CI) o client real lança ao carregar.
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))
vi.mock('../../hooks/useScorecardCandidato', () => ({
  useScorecardCandidato: vi.fn(),
}))
const getRespostaMock = vi.fn()
vi.mock('../../services/scoresRhService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/scoresRhService')>()
  return { ...actual, getRespostaCasoAbertoSjt: (...a: unknown[]) => getRespostaMock(...a) }
})

import { ScorecardAvaliacao } from '../ScorecardAvaliacao'
import { useScorecardCandidato } from '../../hooks/useScorecardCandidato'
import type { ScoreRow } from '../../services/scoresRhService'

/** O card do caso aberto lê o texto do candidato por `useQuery` (D-20). */
function render(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return rtlRender(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  getRespostaMock.mockReset()
  getRespostaMock.mockResolvedValue({ situacao: 'sem_resposta_enviada', texto: null })
})
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

const MC_ROW = {
  id: 'mc-1',
  tipo: 'sjt',
  subtipo: 'mc',
  pergunta_id: null,
  score: 8,
  score_max: 10,
  status: 'sucesso',
  metadata: { respostas: [] },
  citacoes: null,
  red_flags: null,
} as unknown as ScoreRow

describe('ScorecardAvaliacao — UX-07 Big Five banda neutra (sem percentil cru)', () => {
  it('não renderiza nenhum percentil cru nas rows Big Five', () => {
    mockRows([BIGFIVE_ROW])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.queryByText(/Percentil\s*\d/)).toBeNull()
    expect(screen.queryByText(/Percentil/i)).toBeNull()
  })
})

describe('ScorecardAvaliacao — Big Five «Concluído» / «Não fez», sem nota (51-02 / D-19, D-32)', () => {
  it('com linha big_five: diz «Concluído» e nada que leia como nota (faixa, dígito, resumo da IA)', () => {
    mockRows([BIGFIVE_ROW])
    const { container } = render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(container.textContent).toContain('Big Five — Concluído')
    expect(screen.getByText('Big Five — Concluído')).toBeInTheDocument()
    expect(screen.queryByText('Muito alto')).toBeNull()
    expect(screen.queryByText('Muito baixo')).toBeNull()
    expect(screen.queryByText(/esperado/i)).toBeNull()
    expect(screen.queryByText('Abertura à Experiência')).toBeNull()
    expect(container.textContent).not.toContain('Resumo executivo AI.')
    expect(container.textContent).not.toMatch(/\d/)
  })

  it('sem linha big_five: a linha do Big Five diz «Não fez»', () => {
    mockRows([MC_ROW])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('Big Five — Não fez')).toBeInTheDocument()
    expect(screen.queryByText('Big Five — Concluído')).toBeNull()
  })
})

describe('ScorecardAvaliacao — texto integral do caso aberto ao lado das citações (51-02 / D-20)', () => {
  const CASO = {
    id: 'ca-9',
    tipo: 'sjt',
    subtipo: 'caso_aberto',
    pergunta_id: 'p-9',
    score: 15,
    score_max: 25,
    status: 'sucesso',
    metadata: { dimension_scores: [], composite_0_25: 15 },
    citacoes: ['trecho recortado pela IA'],
    red_flags: null,
  } as unknown as ScoreRow

  it('mostra as citações E o texto do candidato, lido pela RPC da candidatura', async () => {
    getRespostaMock.mockResolvedValue({ situacao: 'disponivel', texto: 'Eu ligaria para o paciente.' })
    mockRows([CASO])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('trecho recortado pela IA')).toBeInTheDocument()
    expect(screen.getByText('Texto do candidato')).toBeInTheDocument()
    expect(await screen.findByText('Eu ligaria para o paciente.')).toBeInTheDocument()
    expect(getRespostaMock).toHaveBeenCalledWith('cand-1')
  })

  it('o texto com marcação aparece LITERAL, nunca como HTML (T-51-04)', async () => {
    getRespostaMock.mockResolvedValue({ situacao: 'disponivel', texto: 'antes <b>negrito</b> depois' })
    mockRows([CASO])
    const { container } = render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(await screen.findByText('antes <b>negrito</b> depois')).toBeInTheDocument()
    expect(container.querySelector('b')).toBeNull()
  })

  it('sem resposta enviada: o lugar do texto diz isso (o recorte nunca fica sozinho calado)', async () => {
    mockRows([CASO])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('Texto do candidato')).toBeInTheDocument()
    expect(await screen.findByText('Não há resposta enviada ao caso aberto.')).toBeInTheDocument()
  })
})

// ── Phase 49 / plano 49-41 — o motivo «instrução à IA» no card da SJT (JORN-41) ────────
//
// Na SJT caso aberto, uma resposta com imperativo nu dirigido à IA é avaliada normalmente:
// a nota composta É gravada e o código entra em `metadata.motivos_revisao` (49-39). O status
// é o que as OUTRAS causas decidirem — desde o 49-REVIEW-GAPS-2 CR-01 o sinal não manda mais a
// linha para `pendente_humano`, então o aviso aparece com qualquer status. Este plano mostra
// SÓ o motivo do sinal — os outros motivos têm dono próprio e não são renderizados aqui.
describe('ScorecardAvaliacao — o motivo do sinal, com qualquer status (49-41 / JORN-41)', () => {
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

  // 49-REVIEW-GAPS-2 CR-01 (2026-09-30): o sinal deixou de mandar a linha para
  // `pendente_humano` — uma resposta sinalizada sem outra causa é gravada `sucesso`, com o
  // código em `motivos_revisao`. O aviso tem de aparecer MESMO ASSIM (é a única marca que
  // sobra), e o marcador «Requer revisão humana» — decidido só pelo status — não.
  it('linha `sucesso` com o código em motivos_revisao: o rótulo aparece, sem o marcador de revisão', () => {
    mockRows([{ ...casoAberto([SINAL_INSTRUCAO_AO_MODELO]), status: 'sucesso' } as ScoreRow])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(
      screen.getByText(rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO)),
    ).toBeInTheDocument()
    expect(screen.queryByText('Requer revisão humana')).toBeNull()
    expect(screen.getByText('17')).toBeInTheDocument()
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
