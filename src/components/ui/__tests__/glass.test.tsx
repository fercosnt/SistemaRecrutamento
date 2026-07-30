import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GlassButton } from '../glass'

/**
 * Regressão do achado D-42-11-01.
 *
 * `GlassButton` desestruturava `...props` e usava o objeto SOMENTE para computar classes,
 * sem nunca fazer `{...props}` no `<button>`. Consequência: todo `aria-*`, `data-*`,
 * `title`, `id`, `role` e `tabIndex` que um consumidor passasse era descartado **sem erro
 * e sem warning** — a pior forma de falhar, porque o call site parece correto.
 *
 * Havia 2 vítimas reais em `CandidatoNavbar.tsx`, ambas botões que ficam ICON-ONLY no
 * mobile (o rótulo visível vive em `hidden sm:inline`), ou seja exatamente o caso em que
 * o `aria-label` é o ÚNICO nome acessível — num projeto mobile-first para o candidato.
 *
 * O contra-teste (as props de estilo do Glass NÃO podem chegar ao DOM) é igualmente
 * necessário: um `{...props}` ingênuo consertaria o a11y e criaria um warning do React em
 * cada render, o que é como um fix vira dois bugs.
 */
describe('GlassButton — repasse de props ao <button>', () => {
  it('repassa aria-label, de modo que um botão icon-only tenha nome acessível', () => {
    render(
      <GlassButton aria-label="Sair">
        <span aria-hidden="true">×</span>
      </GlassButton>,
    )

    // getByRole com `name` resolve pelo nome ACESSÍVEL — falha se o aria-label for descartado.
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('repassa title, data-* e os atributos de identidade/foco', () => {
    render(
      <GlassButton title="dica" data-testid="alvo" id="btn-x" tabIndex={-1}>
        rótulo
      </GlassButton>,
    )

    const btn = screen.getByTestId('alvo')
    expect(btn).toHaveAttribute('title', 'dica')
    expect(btn).toHaveAttribute('id', 'btn-x')
    expect(btn).toHaveAttribute('tabindex', '-1')
  })

  it('NÃO deixa as props de estilo do Glass chegarem ao DOM (e não emite warning do React)', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <GlassButton data-testid="estilado" blur="lg" variant="accent" opacity={40} border={false} hover>
        rótulo
      </GlassButton>,
    )

    const btn = screen.getByTestId('estilado')
    for (const attr of ['blur', 'variant', 'opacity', 'border', 'hover', 'as']) {
      expect(btn.hasAttribute(attr)).toBe(false)
    }

    // React reclama de atributo desconhecido via console.error — a ausência é a asserção.
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('mantém o comportamento anterior: type default button, onClick e disabled', () => {
    const onClick = vi.fn()
    render(
      <GlassButton data-testid="a" onClick={onClick}>
        ok
      </GlassButton>,
    )
    expect(screen.getByTestId('a')).toHaveAttribute('type', 'button')

    render(
      <GlassButton data-testid="b" disabled type="submit">
        ok
      </GlassButton>,
    )
    const desabilitado = screen.getByTestId('b')
    expect(desabilitado).toBeDisabled()
    expect(desabilitado).toHaveAttribute('type', 'submit')
  })
})
