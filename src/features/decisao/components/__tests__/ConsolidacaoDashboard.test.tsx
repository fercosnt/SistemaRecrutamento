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
import '@testing-library/jest-dom'
import type { ConsolidacaoBreakdownRow } from '../../schemas/consolidacaoSchema'

vi.mock('../../hooks/useConsolidacao', () => ({
  useConsolidacao: vi.fn(),
}))

import { ConsolidacaoDashboard } from '../ConsolidacaoDashboard'
import { useConsolidacao } from '../../hooks/useConsolidacao'

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
