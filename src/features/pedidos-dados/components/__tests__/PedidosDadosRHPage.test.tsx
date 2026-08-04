/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 44 / Plano 44-09 Task 3 (TDD RED) — `PedidosDadosRHPage` (EXPORT-05).
 *
 * ── O DEFAULT DO TOGGLE É O INVERSO SEMÂNTICO DO ANÁLOGO, E É AQUI QUE UMA CÓPIA
 *    CEGA PRODUZ A TELA ERRADA COM O MESMO `false` ──────────────────────────────────
 * Em `/rh/revisoes` o `false` significa "não incluir respondidos" — a tela abre
 * FILTRADA, porque uma revisão nasce pendente. Aqui o `false` significa "não filtrar" —
 * a tela abre COMPLETA, porque o pedido de dados nasce **atendido** (o export é
 * self-service). Abrir filtrado mostraria tela vazia em praticamente todo acesso, e uma
 * fila que quase sempre aparece vazia deixa de ser consultada — com ela morre a
 * supervisão que a tela existe para dar. Por isso (ce) assere a PROP ENTREGUE à tabela,
 * não o estado visual do controle: é a prop que decide qual lista o servidor devolve.
 *
 * A tabela e o shell RH são mockados: esta suíte é sobre a PÁGINA (a fila tem suíte
 * própria; a sidebar/topbar puxam authStore e rotas).
 *
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§/rh/pedidos-dados · E5)
 * @see src/features/revisao/components/__tests__/RevisoesRHPage.test.tsx (o idioma)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

const tabelaProps = vi.fn()

vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../FilaPedidosDadosTable', () => ({
  FilaPedidosDadosTable: (props: { soNaoAtendidos: boolean }) => {
    tabelaProps(props)
    return <div data-testid="fila">{String(props.soNaoAtendidos)}</div>
  },
}))

import { PedidosDadosRHPage } from '../PedidosDadosRHPage'

const BANNER =
  'Esta fila é de supervisão. O pedido de cópia é atendido pelo próprio candidato, no momento em que ele clica. O que precisa de alguém aqui é o pedido que não foi atendido. A LGPD dá 15 dias corridos para responder a um pedido de acesso (Art. 19, II).'

const NOTA_ORDENACAO =
  'Não atendidos primeiro, do mais antigo para o mais recente. Depois, os atendidos, do mais recente para o mais antigo.'

const ROTULO_TOGGLE = 'Mostrar só os não atendidos'

/** `a` vem ANTES de `b` no documento renderizado. */
function precede(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

beforeEach(() => {
  tabelaProps.mockReset()
})

describe('PedidosDadosRHPage — o default do toggle (o inverso semântico do análogo)', () => {
  it('(ce) abre DESLIGADO e a tabela recebe a visão COMPLETA (`soNaoAtendidos: false`)', () => {
    render(<PedidosDadosRHPage />)

    // A asserção é sobre a PROP, não sobre o estado visual do controle.
    expect(tabelaProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ soNaoAtendidos: false }),
    )
    expect(screen.getByRole('switch', { name: ROTULO_TOGGLE })).not.toBeChecked()
  })

  it('(cf) alternar o toggle TROCA a prop entregue à tabela, nos dois sentidos', async () => {
    const user = userEvent.setup()
    render(<PedidosDadosRHPage />)
    const toggle = screen.getByRole('switch', { name: ROTULO_TOGGLE })

    const antes = tabelaProps.mock.calls.at(-1)?.[0]?.soNaoAtendidos
    await user.click(toggle)
    const depois = tabelaProps.mock.calls.at(-1)?.[0]?.soNaoAtendidos

    expect(antes).toBe(false)
    expect(depois).toBe(true)
    expect(screen.getByTestId('fila').textContent).toBe('true')

    await user.click(toggle)
    expect(tabelaProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ soNaoAtendidos: false }),
    )
  })
})

describe('PedidosDadosRHPage — o banner de escopo e a ordem no DOM', () => {
  it('(cg) o banner é sempre visível e NÃO é colapsável', () => {
    const { container } = render(<PedidosDadosRHPage />)

    expect(screen.getByText(BANNER)).toBeInTheDocument()
    // Nenhum mecanismo nativo de colapso…
    expect(container.querySelectorAll('details')).toHaveLength(0)
    expect(container.querySelectorAll('summary')).toHaveLength(0)
    // …e nenhum controle além do próprio toggle. ⚠ O `Switch` do shadcn É um `<button>`
    // com `role="switch"`, então a asserção não pode ser "zero botões" — ela é "o único
    // controle da página é o toggle", que é o que a ausência de colapso significa aqui.
    const controles = Array.from(container.querySelectorAll('button'))
    expect(controles).toHaveLength(1)
    expect(controles[0].getAttribute('role')).toBe('switch')
  })

  it('(ch) ordem no DOM: H1 → subtítulo → banner → título de seção → controles → tabela', () => {
    render(<PedidosDadosRHPage />)

    const sequencia = [
      screen.getByRole('heading', { level: 1, name: 'Pedidos de dados' }),
      screen.getByText(
        'Pedidos de cópia dos próprios dados feitos por candidatos (LGPD, Art. 18, II).',
      ),
      screen.getByText(BANNER),
      screen.getByRole('heading', { level: 2, name: 'Pedidos registrados' }),
      screen.getByText(NOTA_ORDENACAO),
      screen.getByTestId('fila'),
    ]

    // Asserção de ORDEM, não de presença: presença sozinha passaria com o banner
    // montado no rodapé, onde ele não avisa nada a ninguém.
    for (let i = 0; i < sequencia.length - 1; i += 1) {
      expect(precede(sequencia[i], sequencia[i + 1])).toBe(true)
    }
  })

  it('(ci) H1 e subtítulo verbatim, e o subtítulo cita o artigo do ACESSO (18, II)', () => {
    render(<PedidosDadosRHPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Pedidos de dados' }),
    ).toBeInTheDocument()
    const subtitulo = screen.getByText(
      'Pedidos de cópia dos próprios dados feitos por candidatos (LGPD, Art. 18, II).',
    )
    expect(subtitulo).toBeInTheDocument()
    expect(subtitulo.textContent).toContain('Art. 18, II')
    // O Art. 20 é a OUTRA fila; confundi-los trocaria o direito e o prazo.
    expect(subtitulo.textContent).not.toContain('Art. 20')
  })
})
