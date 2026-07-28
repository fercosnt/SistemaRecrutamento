/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-02 Task 1 — RED→GREEN for `AnaliseIABlock` (VISRH-02).
 *
 * Load-bearing contract: the RH hub renders the FULL IA analysis — pontos_fortes
 * and gaps IN FULL (never the `.slice(0,2)` truncation that is vaga-table density
 * only) — plus the score_match band chip and the RNF-07a disclaimer. The block is
 * RH-only (candidate never sees it) and uses neutral, non-clinical framing (RNF-12a).
 *
 * @see .planning/phases/34-.../34-UI-SPEC.md (§Análise da IA copy + States Contract)
 * @see src/features/triagem/components/TriagemTable.tsx (scoreBandClass + ScoreCell chip reused)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { AnaliseIABlock } from '../AnaliseIABlock'
import { SUGESTAO_IA_COPY } from '@/features/triagem/components/SugestaoIABadge'

const cheia = {
  score_match: 82,
  pontos_fortes: ['Forte 1', 'Forte 2', 'Forte 3', 'Forte 4', 'Forte 5'],
  gaps: ['Gap 1', 'Gap 2', 'Gap 3'],
  flags: ['Sinal A'],
  analise_status: 'sucesso' as const,
}

describe('AnaliseIABlock — análise completa da IA (VISRH-02)', () => {
  it('renderiza os 5 pontos_fortes NA ÍNTEGRA (sem truncar a 2)', () => {
    render(<AnaliseIABlock analise={cheia} />)
    for (const p of cheia.pontos_fortes) {
      expect(screen.getByText(p)).toBeInTheDocument()
    }
    // o 3º ponto (que a tabela vaga-level truncaria) DEVE estar presente
    expect(screen.getByText('Forte 3')).toBeInTheDocument()
  })

  it('renderiza os gaps na íntegra', () => {
    render(<AnaliseIABlock analise={cheia} />)
    for (const g of cheia.gaps) {
      expect(screen.getByText(g)).toBeInTheDocument()
    }
  })

  it('renderiza o score_match como chip de banda (número + cor no mesmo elemento)', () => {
    render(<AnaliseIABlock analise={cheia} />)
    const chip = screen.getByText('82')
    // banda ≥70 → verde (colorblind-safe: número + cor juntos)
    expect(chip.className).toContain('green')
  })

  it('carrega o disclaimer RNF-07a (SugestaoIABadge)', () => {
    render(<AnaliseIABlock analise={cheia} />)
    expect(screen.getByText(SUGESTAO_IA_COPY)).toBeInTheDocument()
  })

  it('score_match null → chip neutro "—"', () => {
    render(<AnaliseIABlock analise={{ ...cheia, score_match: null }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('analise null → empty copy "Análise ainda não disponível"', () => {
    render(<AnaliseIABlock analise={null} />)
    expect(screen.getByText('Análise ainda não disponível')).toBeInTheDocument()
  })

  it('analise_status="falhou" → copy de falha (read-only, sem botão de reprocessar)', () => {
    render(<AnaliseIABlock analise={{ ...cheia, analise_status: 'falhou' }} />)
    expect(
      screen.getByText(/A análise da IA falhou nesta candidatura/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reprocessar/i })).toBeNull()
  })

  it('NUNCA usa a linguagem clínica banida (RNF-12a)', () => {
    const { container } = render(<AnaliseIABlock analise={cheia} />)
    expect(container.textContent?.toLowerCase()).not.toContain('teste psicológico')
  })
})
