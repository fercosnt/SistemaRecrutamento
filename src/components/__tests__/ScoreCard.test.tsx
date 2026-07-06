/**
 * Phase 23 / Plan 23-04 Task 2 — psychometric honesty (UX-07) for the RH ScoreCard.
 *
 * The cognitivo (Raven) cell is a job-fit score → an evaluative 3-band frame fits
 * (unlike the non-evaluative Big Five). The raw percentil digit `P{n}` must NEVER
 * reach the RH screen — it is replaced by a PROVISIONAL band (real norm deferred M5).
 *
 * @see src/components/ScoreCard.tsx
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreCard } from '../ScoreCard'
import '@testing-library/jest-dom'

describe('ScoreCard — UX-07 cognitivo job-fit banda avaliativa (sem P{n} cru)', () => {
  it('não renderiza o percentil cru "P{n}" do cognitivo', () => {
    render(<ScoreCard inteligencia={85} />)
    expect(screen.queryByText(/^P\d/)).toBeNull()
  })

  it('percentil ≥70 → "Acima do esperado"', () => {
    render(<ScoreCard inteligencia={85} />)
    expect(screen.getByText('Acima do esperado')).toBeInTheDocument()
  })

  it('percentil 40-69 → "Dentro do esperado"', () => {
    render(<ScoreCard inteligencia={55} />)
    expect(screen.getByText('Dentro do esperado')).toBeInTheDocument()
  })

  it('percentil <40 → "Abaixo do esperado"', () => {
    render(<ScoreCard inteligencia={20} />)
    expect(screen.getByText('Abaixo do esperado')).toBeInTheDocument()
  })

  it('cognitivo ausente → "N/A" (nunca um dígito)', () => {
    render(<ScoreCard inteligencia={null} />)
    expect(screen.queryByText(/^P\d/)).toBeNull()
    // a célula Intel mostra N/A quando não há score
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0)
  })
})
