/**
 * Phase 23 / Plan 23-04 Task 3 — UX-09 gate (≥2 etapas) rendered by the RH dashboard.
 *
 * The consolidated number is server-authoritative (the EF returns consolidated=null
 * with <2 weighted etapas present). When there IS content but no aggregate (1 etapa
 * present), the dashboard must show a DISTINCT suppression message + keep the per-etapa
 * breakdown visible — NOT the generic "Ainda não há scorecards" empty-state.
 *
 * @see src/features/decisao/components/ConsolidacaoDashboard.tsx
 * @see supabase/functions/consolidar-decisao-final/index.ts (gate ≥2 etapas)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { within } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ConsolidacaoBreakdownRow } from '../../schemas/consolidacaoSchema'
import { ROTULO_SINAL } from '../../../../../supabase/functions/_shared/sinal-revisao'

vi.mock('../../hooks/useConsolidacao', () => ({
  useConsolidacao: vi.fn(),
}))

import { ConsolidacaoDashboard } from '../ConsolidacaoDashboard'
import { useConsolidacao } from '../../hooks/useConsolidacao'
import { COPY_RESPOSTA_CASO_ABERTO } from '../RespostaCasoAbertoSjt'

function ctx(etapa: string, normalized: number | null): ConsolidacaoBreakdownRow {
  return { etapa, normalized, status: 'context', weight: null, effective_weight: null }
}
function present(etapa: string, normalized: number, weight: number): ConsolidacaoBreakdownRow {
  return { etapa, normalized, status: 'present', weight, effective_weight: 1 }
}
function na(etapa: string): ConsolidacaoBreakdownRow {
  return { etapa, normalized: null, status: 'na', weight: null, effective_weight: null }
}

function mockConsolidacao(
  consolidated: number | null,
  breakdown: ConsolidacaoBreakdownRow[],
  recommendation: string,
) {
  vi.mocked(useConsolidacao).mockReturnValue({
    data: { consolidated, breakdown, recommendation },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useConsolidacao>)
}

describe('ConsolidacaoDashboard — UX-09 supressão do agregado com <2 etapas', () => {
  it('1 etapa present + consolidated null → mensagem de supressão DISTINTA (não o empty-state)', () => {
    mockConsolidacao(
      null,
      [
        ctx('triagem', null),
        present('work_sample_sjt', 72, 30),
        na('redacao_cultural'),
        na('entrevista'),
        ctx('big_five', null),
        ctx('cognitivo', null),
      ],
      'Agregado suprimido até ≥2 etapas concluídas. Sugestão advisory — a decisão final é sempre humana (RNF-07a).',
    )
    render(<ConsolidacaoDashboard candidaturaId="cand-1" vagaId="v1" />)

    // mensagem de supressão distinta presente (aparece no hero E é ecoada na recomendação)
    expect(
      screen.getAllByText(/Agregado suprimido até ≥2 etapas concluídas/).length,
    ).toBeGreaterThan(0)
    // NÃO cai no empty-state genérico
    expect(screen.queryByText(/Ainda não há scorecards para consolidar/)).toBeNull()
    // as rows de breakdown por etapa seguem visíveis
    expect(screen.getByText('Work sample (SJT)')).toBeInTheDocument()
  })

  it('≥2 etapas present → mostra o número consolidado (sem mensagem de supressão)', () => {
    mockConsolidacao(
      75.2,
      [
        ctx('triagem', 90),
        present('work_sample_sjt', 72, 30),
        present('redacao_cultural', 80, 20),
        na('entrevista'),
        ctx('big_five', null),
        ctx('cognitivo', null),
      ],
      'Aderência moderada nas etapas avaliadas. Sugestão advisory — a decisão final é sempre humana (RNF-07a).',
    )
    render(<ConsolidacaoDashboard candidaturaId="cand-1" vagaId="v1" />)

    expect(screen.getByText('75.2')).toBeInTheDocument()
    expect(screen.queryByText(/Agregado suprimido/)).toBeNull()
    // triagem visível como contexto COM valor (score de CV, 90/100 único), marcada "não pondera"
    expect(screen.getByText('90 / 100')).toBeInTheDocument()
    // as 3 rows de contexto (triagem/big_five/cognitivo) carregam o marcador "não pondera"
    expect(screen.getAllByText('Contextual · não pondera').length).toBeGreaterThan(0)
  })
})

// ── 49-REVIEW-GAPS-3 CR-02: o sinal de revisão da SJT aparece na Decisão Final ────────────
//
// Um caso aberto sinalizado (`instrucao_ao_modelo`) sem outra causa é `sucesso` e PONDERA na
// etapa SJT. A marca só existia no `ScorecardAvaliacao`, que não está montado em tela nenhuma.
// Decisão do operador (2026-09-30, «1»): a Decisão Final mostra o rótulo junto da etapa SJT.
// O rótulo vem da fonte ÚNICA (`_shared/sinal-revisao.ts`), nunca de uma cópia no teste.
describe('ConsolidacaoDashboard — CR-02 sinal de revisão da etapa SJT', () => {
  const ROTULO = ROTULO_SINAL.instrucao_ao_modelo

  function breakdownComSjt(sjt: ConsolidacaoBreakdownRow): ConsolidacaoBreakdownRow[] {
    return [
      ctx('triagem', 90),
      sjt,
      present('redacao_cultural', 80, 20),
      na('entrevista'),
      ctx('big_five', null),
      ctx('cognitivo', null),
    ]
  }

  it('SJT com sinal → o rótulo aparece JUNTO da etapa SJT, sem tom de reprovação e sem travar ação', () => {
    mockConsolidacao(
      73.94,
      breakdownComSjt({
        ...present('work_sample_sjt', 68.57, 30),
        sinais_revisao: ['instrucao_ao_modelo'],
      }),
      'Aderência moderada nas etapas avaliadas. Sugestão advisory — a decisão final é sempre humana (RNF-07a).',
    )
    render(<ConsolidacaoDashboard candidaturaId="cand-1" vagaId="v1" />)

    const aviso = screen.getByTestId('decisao-sjt-sinal-revisao')
    expect(aviso).toHaveTextContent(ROTULO)
    // Junto da etapa SJT — dentro da MESMA linha do breakdown.
    const linha = aviso.closest('li')
    expect(linha).not.toBeNull()
    expect(linha).toHaveTextContent('Work sample (SJT)')
    expect(linha).toHaveTextContent('68.57 / 100')
    // Só UM aviso, e nenhuma outra etapa leva o rótulo.
    expect(screen.getAllByText(ROTULO)).toHaveLength(1)
    // Tom âmbar/neutro, nunca o de reprovação (RNF-07a).
    expect(aviso.className).not.toMatch(/red|destructive|rose/)
    // O número consolidado segue exibido; nenhuma ação desabilitada pelo sinal.
    expect(screen.getByText('73.94')).toBeInTheDocument()
    expect(document.querySelectorAll('[disabled], [aria-disabled="true"]')).toHaveLength(0)
  })

  it('SJT sem sinal → nenhum aviso', () => {
    mockConsolidacao(
      73.94,
      breakdownComSjt(present('work_sample_sjt', 68.57, 30)),
      'Aderência moderada nas etapas avaliadas. Sugestão advisory — a decisão final é sempre humana (RNF-07a).',
    )
    render(<ConsolidacaoDashboard candidaturaId="cand-1" vagaId="v1" />)

    expect(screen.queryByTestId('decisao-sjt-sinal-revisao')).toBeNull()
    expect(screen.queryByText(ROTULO)).toBeNull()
  })
})

// ── 49-44 / WR-07: o botão de leitura do caso aberto mora DENTRO do aviso da SJT ─────────────
//
// O aviso manda «revise o texto»; o botão que busca o texto aparece só ali. Outra etapa com sinal
// (redação, transcrição) já tem o texto ao lado do rótulo noutras telas e não ganha o botão.
describe('ConsolidacaoDashboard — 49-44 botão da resposta do caso aberto', () => {
  // Lido dentro de cada teste (antes da implementação a constante não existe: reprova na asserção).
  const nomeBotao = () => COPY_RESPOSTA_CASO_ABERTO?.botaoAbrir ?? '<COPY ausente>'

  function breakdown(sjt: ConsolidacaoBreakdownRow, redacao: ConsolidacaoBreakdownRow) {
    return [ctx('triagem', 90), sjt, redacao, na('entrevista'), ctx('big_five', null), ctx('cognitivo', null)]
  }

  it('SJT com sinal → o botão está DENTRO de decisao-sjt-sinal-revisao', () => {
    mockConsolidacao(
      73.94,
      breakdown(
        { ...present('work_sample_sjt', 68.57, 30), sinais_revisao: ['instrucao_ao_modelo'] },
        present('redacao_cultural', 80, 20),
      ),
      'Sugestão advisory — a decisão final é sempre humana (RNF-07a).',
    )
    render(<ConsolidacaoDashboard candidaturaId="cand-1" vagaId="v1" />)

    const aviso = screen.getByTestId('decisao-sjt-sinal-revisao')
    expect(within(aviso).getByRole('button', { name: nomeBotao() })).toBeInTheDocument()
    expect(within(aviso).getByTestId('decisao-sjt-resposta-caso-aberto')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: nomeBotao() })).toHaveLength(1)
  })

  it('SJT sem sinal → sem botão', () => {
    mockConsolidacao(
      73.94,
      breakdown(present('work_sample_sjt', 68.57, 30), present('redacao_cultural', 80, 20)),
      'Sugestão advisory — a decisão final é sempre humana (RNF-07a).',
    )
    render(<ConsolidacaoDashboard candidaturaId="cand-1" vagaId="v1" />)

    expect(screen.queryByRole('button', { name: nomeBotao() })).toBeNull()
    expect(screen.queryByTestId('decisao-sjt-resposta-caso-aberto')).toBeNull()
  })

  it('outra etapa com sinais_revisao (redacao_cultural) → aviso sem botão', () => {
    mockConsolidacao(
      73.94,
      breakdown(
        present('work_sample_sjt', 68.57, 30),
        { ...present('redacao_cultural', 80, 20), sinais_revisao: ['instrucao_ao_modelo'] },
      ),
      'Sugestão advisory — a decisão final é sempre humana (RNF-07a).',
    )
    render(<ConsolidacaoDashboard candidaturaId="cand-1" vagaId="v1" />)

    expect(screen.getByTestId('decisao-etapa-sinal-revisao')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: nomeBotao() })).toBeNull()
    expect(screen.queryByTestId('decisao-sjt-resposta-caso-aberto')).toBeNull()
  })
})
