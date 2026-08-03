/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 42 / Plano 42-09 Task 2 (TDD RED) — `VereditoBadge` (REVISAO-02).
 *
 * Vocabulário FECHADO de dois valores, ambos com o MESMO tratamento neutro: um veredito
 * registrado não é alarme, e colorir "revertida" de vermelho leria como erro do sistema
 * quando é o Art. 20 funcionando. Fechar o vocabulário também é o que dá largura
 * previsível ao badge (E8 overflow / long-text) — não há texto livre a transbordar.
 *
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Badge de veredito)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { VereditoBadge } from '../VereditoBadge'

describe('VereditoBadge — dois valores, tratamento neutro idêntico', () => {
  it('`mantida` → "Mantida"', () => {
    render(<VereditoBadge veredito="mantida" />)
    expect(screen.getByText('Mantida')).toBeInTheDocument()
  })

  it('`revertida` → "Revertida"', () => {
    render(<VereditoBadge veredito="revertida" />)
    expect(screen.getByText('Revertida')).toBeInTheDocument()
  })

  it('os dois usam as MESMAS classes — nenhum é alarme', () => {
    const a = render(<VereditoBadge veredito="mantida" />)
    const b = render(<VereditoBadge veredito="revertida" />)
    const classes = (r: typeof a) =>
      r.container.querySelector('[data-slot="badge"]')?.className
    expect(classes(a)).toBe(classes(b))
  })

  it('nenhum dos dois carrega cor de alarme (vermelho/âmbar)', () => {
    for (const v of ['mantida', 'revertida']) {
      const { container } = render(<VereditoBadge veredito={v} />)
      expect(container.innerHTML).not.toContain('red')
      expect(container.innerHTML).not.toContain('yellow')
      expect(container.innerHTML).not.toContain('amber')
    }
  })
})

describe('VereditoBadge — fora do vocabulário não renderiza NADA cru', () => {
  it('`null` → nada (linha pendente não tem veredito)', () => {
    const { container } = render(<VereditoBadge veredito={null} />)
    expect(container.textContent).toBe('')
  })

  it('valor desconhecido do servidor NÃO é ecoado na tela', () => {
    const { container } = render(<VereditoBadge veredito="algo_novo_do_servidor" />)
    expect(container.textContent).toBe('')
    expect(container.innerHTML).not.toContain('algo_novo_do_servidor')
  })
})
