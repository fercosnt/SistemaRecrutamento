/**
 * Phase 40 / Plan 40-02 Task 3 — o componente puro da estimativa (TIMELINE-02).
 *
 * Prova: (1) com rotulo → o texto + o chip "Estimativa" aparecem; (2) com rotulo null →
 * renderiza nada; (3) o texto renderizado é EXATAMENTE o rotulo (sem sufixo de contagem —
 * nunca countdown).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrazoEstimadoLinha } from '../PrazoEstimadoLinha'

describe('PrazoEstimadoLinha', () => {
  const ROTULO = 'Em triagem — retorno em até 48 horas.'

  it('mostra o rotulo e o chip "Estimativa" quando há rotulo', () => {
    render(<PrazoEstimadoLinha rotulo={ROTULO} />)
    expect(screen.getByText(ROTULO)).toBeInTheDocument()
    expect(screen.getByText('Estimativa')).toBeInTheDocument()
  })

  it('renderiza nada quando rotulo é null', () => {
    const { container } = render(<PrazoEstimadoLinha rotulo={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('exibe o texto verbatim, sem contagem regressiva anexada', () => {
    render(<PrazoEstimadoLinha rotulo={ROTULO} />)
    const el = screen.getByText(ROTULO)
    // O nó de texto é exatamente o rotulo — nenhum "faltam X" / "-00:00" concatenado.
    expect(el.textContent).toBe(ROTULO)
  })
})
