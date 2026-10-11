/// <reference types="@testing-library/jest-dom" />
/**
 * SelectItem — realce turquesa e texto HERDADO (52-06 · D-52-U21 · achado do aceite 51-17, R1).
 *
 * O defeito: o primitivo forçava `text-white` no item em hover/foco (`hover:text-white`,
 * `focus:text-white`, `[&_*]:hover:!text-white`, …) com um véu `bg-white/25`. No painel PADRÃO
 * (`bg-popover`, branco — `RejeitarCandidaturaDialog`) a opção sob o cursor virava branco sobre
 * branco. Forçar texto escuro quebraria o outro fundo do projeto (`bg-[#00109E]/95` —
 * `CandidatosRHPage`). Só a HERANÇA acerta os dois: o item não tem cor de texto própria, herda a
 * do painel, e o realce é `bg-[#35BFAD]/20` (turquesa 20%), legível sobre branco e sobre azul.
 *
 * O teste monta os DOIS fundos e lê a `className` real do item renderizado pelo Radix.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select'

beforeAll(() => {
  // jsdom não implementa o que o Radix Select chama ao abrir.
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {}
})

/** As classes que FORÇAVAM cor de texto no item (o defeito). */
const FORCA_TEXTO = [
  'hover:text-white',
  'focus:text-white',
  '[&_*]:hover:text-white',
  '[&_*]:focus:text-white',
  '[&_*]:hover:!text-white',
  '[&_*]:focus:!text-white',
  'focus:text-accent-foreground',
]

/**
 * Qualquer classe de COR de texto no próprio item (com ou sem variante). `text-sm` é tamanho;
 * a regra arbitrária `[&_svg:not([class*='text-'])]:text-muted-foreground` é do ÍCONE, não do texto.
 */
function classesDeCorDeTexto(className: string): string[] {
  return className
    .split(/\s+/)
    .filter(Boolean)
    .filter((c) => !c.startsWith('[&_svg'))
    .filter((c) => /(^|:)!?text-(?!(xs|sm|base|lg|xl|[2-9]xl)$)/.test(c))
}

function renderAberto(contentClassName?: string) {
  render(
    <Select open value="a">
      <SelectTrigger aria-label="Motivo">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        <SelectItem value="a">Opção A</SelectItem>
        <SelectItem value="b">Opção B</SelectItem>
      </SelectContent>
    </Select>,
  )
  const itens = screen.getAllByRole('option')
  expect(itens.length).toBe(2)
  return itens
}

describe.each([
  ['painel padrão (bg-popover — RejeitarCandidaturaDialog)', undefined],
  ['painel azul (bg-[#00109E]/95 — CandidatosRHPage)', 'bg-[#00109E]/95 backdrop-blur-xl border-white/20 shadow-xl'],
])('SelectItem no %s (52-06 · D-52-U21)', (_rotulo, contentClassName) => {
  it('(a) ⊖ não força text-white nem text-accent-foreground em hover/foco', () => {
    for (const item of renderAberto(contentClassName)) {
      const classes = item.className.split(/\s+/)
      for (const proibida of FORCA_TEXTO) expect(classes).not.toContain(proibida)
      expect(item.className).not.toContain('!text-white')
    }
  })

  it('(b) realce turquesa 20% em hover e foco', () => {
    for (const item of renderAberto(contentClassName)) {
      const classes = item.className.split(/\s+/)
      expect(classes).toContain('hover:bg-[#35BFAD]/20')
      expect(classes).toContain('focus:bg-[#35BFAD]/20')
      expect(classes).not.toContain('hover:bg-white/25')
      expect(classes).not.toContain('focus:bg-white/25')
    }
  })

  it('(c) o item HERDA a cor do painel — nenhuma classe de cor de texto própria', () => {
    for (const item of renderAberto(contentClassName)) {
      expect(classesDeCorDeTexto(item.className)).toEqual([])
    }
  })
})
