/**
 * UX-BIGFIVE-02 — Big Five intro legibility + scale explanation (follow-up do 01).
 *
 * Re-teste visual 2026-06-27 marcou o UX-BIGFIVE-01 como PARCIAL: a escala horizontal
 * + afirmação ficaram boas, mas (a) o disclaimer foi escondido num <details> colapsado,
 * (b) faltava explicação dos 5 níveis da escala. Aqui fixamos esses contratos:
 *  - o disclaimer é VISÍVEL (nunca dentro de um <details>/disclosure);
 *  - existe uma legenda explicando os 5 níveis (1..5 → rótulo pt-BR);
 *  - o CTA "Começar" segue funcionando.
 * (O contraste WCAG do glass escuro é verificado por cálculo de razão fora do unit test —
 * jsdom/happy-dom não computa cores renderizadas.)
 *
 * @see src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx (BigFiveIntro/EscalaLegenda)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BigFiveIntro, EscalaLegenda } from '../BigFiveQuestionnaireScreen'
import { LIKERT_LABELS } from '../../schemas/bigfiveSchema'

describe('UX-BIGFIVE-02 — intro legível + escala explicada', () => {
  it('EscalaLegenda explica os 5 níveis (cada ponto 1..5 com o rótulo pt-BR)', () => {
    render(<EscalaLegenda />)
    // os rótulos únicos do meio + extremos aparecem como texto da legenda
    expect(screen.getByText('Muito inadequado')).toBeTruthy()
    expect(screen.getByText('Relativamente inadequado')).toBeTruthy()
    expect(screen.getByText('Nem adequado, nem inadequado')).toBeTruthy()
    expect(screen.getByText('Relativamente adequado')).toBeTruthy()
    expect(screen.getByText('Muito adequado')).toBeTruthy()
    // sanity: cobre exatamente os 5 rótulos canônicos
    expect(LIKERT_LABELS).toHaveLength(5)
  })

  it('BigFiveIntro mostra o disclaimer VISÍVEL (não escondido num <details>)', () => {
    const { container } = render(<BigFiveIntro onComecar={() => {}} />)
    expect(screen.getByText(/reflete como você se descreveu hoje/)).toBeTruthy()
    // o acordeão colapsado foi removido — nada de <details>/<summary>.
    expect(container.querySelector('details')).toBeNull()
  })

  it('BigFiveIntro embute a explicação da escala (os 5 níveis)', () => {
    render(<BigFiveIntro onComecar={() => {}} />)
    expect(screen.getByText('Nem adequado, nem inadequado')).toBeTruthy()
  })

  it('BigFiveIntro chama onComecar ao clicar em Começar', () => {
    const onComecar = vi.fn()
    render(<BigFiveIntro onComecar={onComecar} />)
    fireEvent.click(screen.getByText('Começar'))
    expect(onComecar).toHaveBeenCalledTimes(1)
  })
})
