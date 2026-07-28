/**
 * UX-BIGFIVE-01 — Likert presentation + accessibility contract.
 *
 * Pego no UAT-11 live 2026-06-26: a escala Likert vinha como grid 4+1 (4 opções numa
 * linha + a 5ª "Muito adequado" órfã full-width embaixo) e os rótulos longos
 * ("Nem adequado, nem inadequado") quebravam linha — a percepção de escala linear se
 * perdia. A correção transforma a escala em 5 pontos iguais com SÓ os extremos
 * rotulados visualmente + numeração "{n} / 120" por afirmação.
 *
 * O invariante load-bearing protegido aqui: esconder os rótulos do meio NÃO pode
 * quebrar a acessibilidade — cada um dos 5 pontos continua alcançável pelo seu nome
 * pt-BR completo (aria-label), preservando o roving focus do radiogroup (UAT-16 C5).
 *
 * @see src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx (LikertItem)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LikertItem } from '../BigFiveQuestionnaireScreen'
import { LIKERT_LABELS, BIGFIVE_TOTAL_ITENS } from '../../schemas/bigfiveSchema'

const item = { item_id: 7, texto: 'Me preocupo com as coisas.', ordem: 12 }

describe('UX-BIGFIVE-01 — Likert a11y + linear-scale presentation', () => {
  it('exposes ALL 5 Likert points by their full pt-BR accessible name (a11y preserved)', () => {
    render(<LikertItem item={item} numero={12} value={undefined} onChange={() => {}} />)
    for (const label of LIKERT_LABELS) {
      expect(screen.getByRole('radio', { name: label })).toBeTruthy()
    }
  })

  it('shows the item position "{n} / 120"', () => {
    render(<LikertItem item={item} numero={12} value={undefined} onChange={() => {}} />)
    expect(screen.getByText(`12 / ${BIGFIVE_TOTAL_ITENS}`)).toBeTruthy()
  })

  it('labels ONLY the two extremes as visible scale anchors (middle is aria-only)', () => {
    render(<LikertItem item={item} numero={12} value={undefined} onChange={() => {}} />)
    // the middle label is NOT a visible text node anymore...
    expect(screen.queryByText('Nem adequado, nem inadequado')).toBeNull()
    // ...but it remains reachable as a radio accessible name (a11y intact).
    expect(screen.getByRole('radio', { name: 'Nem adequado, nem inadequado' })).toBeTruthy()
    // the two extremes ARE visible anchors.
    expect(screen.getByText('Muito inadequado')).toBeTruthy()
    expect(screen.getByText('Muito adequado')).toBeTruthy()
  })

  it('fires onChange with the 1..5 value when a point is chosen', () => {
    const onChange = vi.fn()
    render(<LikertItem item={item} numero={12} value={undefined} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Muito adequado' }))
    expect(onChange).toHaveBeenCalledWith(5)
  })
})
