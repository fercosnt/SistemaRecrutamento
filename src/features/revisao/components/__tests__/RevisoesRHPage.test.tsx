/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 42 / Plano 42-09 Task 3 — `RevisoesRHPage` (REVISAO-02).
 *
 * Assere o contrato de copy verbatim da 42-UI-SPEC (H1, subtítulo, título de seção, nota
 * de ordenação e rótulo do switch, byte a byte) e o único comportamento da página: o
 * toggle muda o FILTRO passado à tabela. O filtro é o que separa duas listas distintas no
 * cache do TanStack Query, então passá-lo errado não daria erro visível — daria a lista
 * errada. É esse silêncio que este teste tira.
 *
 * A tabela e o shell RH são mockados: esta suíte é sobre a página, não sobre a fila
 * (a fila tem suíte própria) nem sobre a sidebar/topbar (que puxam authStore e rotas).
 *
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Fila RH — copy)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

const tabelaProps = vi.fn()

vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../FilaRevisoesTable', () => ({
  FilaRevisoesTable: (props: { incluirRespondidos: boolean }) => {
    tabelaProps(props)
    return <div data-testid="fila">{String(props.incluirRespondidos)}</div>
  },
}))

import { RevisoesRHPage } from '../RevisoesRHPage'

beforeEach(() => {
  tabelaProps.mockReset()
})

describe('RevisoesRHPage — a copy bate byte a byte com a UI-SPEC', () => {
  it('monta com H1, subtítulo, título de seção, nota de ordenação e rótulo do switch', () => {
    render(<RevisoesRHPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Revisões de decisão' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Pedidos de revisão de decisão feitos por candidatos (LGPD, Art. 20).',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Pedidos pendentes' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Ordenados do pedido mais antigo para o mais recente.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Incluir respondidos')).toBeInTheDocument()
  })

  it('o switch tem `Label` associado por `htmlFor` (piso de acessibilidade)', () => {
    render(<RevisoesRHPage />)
    const toggle = screen.getByRole('switch', { name: 'Incluir respondidos' })
    expect(toggle).toBeInTheDocument()
  })

  it('a copy da página nunca chama o limite interno de exigência estatutária', () => {
    const { container } = render(<RevisoesRHPage />)
    expect(container.textContent?.toLowerCase()).not.toContain('prazo legal')
    expect(container.textContent?.toLowerCase()).not.toContain('prazo da lei')
  })
})

describe('RevisoesRHPage — o toggle muda o filtro passado à tabela', () => {
  it('abre desligado: a tabela recebe `incluirRespondidos: false`', () => {
    render(<RevisoesRHPage />)
    expect(tabelaProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ incluirRespondidos: false }),
    )
  })

  it('ao ligar o switch a tabela passa a receber `true`', async () => {
    const user = userEvent.setup()
    render(<RevisoesRHPage />)
    await user.click(screen.getByRole('switch', { name: 'Incluir respondidos' }))
    expect(tabelaProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ incluirRespondidos: true }),
    )
    expect(screen.getByTestId('fila').textContent).toBe('true')
  })

  it('ao desligar volta para `false`', async () => {
    const user = userEvent.setup()
    render(<RevisoesRHPage />)
    const toggle = screen.getByRole('switch', { name: 'Incluir respondidos' })
    await user.click(toggle)
    await user.click(toggle)
    expect(tabelaProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ incluirRespondidos: false }),
    )
  })
})
