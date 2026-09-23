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

// ── Phase 49 / plano 49-16 — o selo de proveniência na análise da triagem (D-27b) ─────
//
// Esta é a análise que abre o hub do candidato: o `score_match` que o RH lê primeiro. As
// 25 linhas vivas de `analise_candidato_vaga` em PROD têm `provedor_ia`/`modelo_ia` NULL
// (medido 2026-09-23) — para elas a frase verdadeira é «modelo não registrado» (D-30).
describe('AnaliseIABlock — selo de proveniência (49-16 / D-27b / JORN-28)', () => {
  it("provedor_ia='openai' ⇒ selo de CONTINGÊNCIA com o modelo que respondeu", () => {
    render(
      <AnaliseIABlock
        analise={{ ...cheia, provedor_ia: 'openai', modelo_ia: 'gpt-4o-mini' } as never}
      />,
    )
    const selo = screen.getByTestId('proveniencia-ia-badge')
    expect(selo).toHaveAttribute('data-contingencia', 'true')
    expect(selo).toHaveTextContent('gpt-4o-mini')
  })

  it("provedor_ia='anthropic' ⇒ selo neutro", () => {
    render(
      <AnaliseIABlock
        analise={
          { ...cheia, provedor_ia: 'anthropic', modelo_ia: 'claude-sonnet-4-6' } as never
        }
      />,
    )
    expect(screen.getByTestId('proveniencia-ia-badge')).toHaveAttribute(
      'data-contingencia',
      'false',
    )
  })

  it('proveniência NULL ⇒ «modelo não registrado», nunca silêncio (as 25 linhas de PROD)', () => {
    render(<AnaliseIABlock analise={cheia} />)
    expect(screen.getByTestId('proveniencia-ia-badge')).toHaveTextContent(
      'modelo não registrado',
    )
  })

  it('a análise que FALHOU também diz de onde veio (ou que não se sabe)', () => {
    render(
      <AnaliseIABlock
        analise={
          {
            ...cheia,
            analise_status: 'falhou',
            provedor_ia: 'openai',
            modelo_ia: 'gpt-4o-mini',
          } as never
        }
      />,
    )
    expect(screen.getByTestId('proveniencia-ia-badge')).toHaveAttribute(
      'data-contingencia',
      'true',
    )
  })

  it('sem análise NÃO há selo — não existe proveniência de um resultado que não existe', () => {
    render(<AnaliseIABlock analise={null} />)
    expect(screen.queryByTestId('proveniencia-ia-badge')).toBeNull()
  })
})
