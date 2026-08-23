/**
 * TextoRico — o que ele entende, e sobretudo o que ele RECUSA a entender.
 *
 * As asserções negativas aqui não são zelo: este componente existe para renderizar
 * texto que um dia pode vir de fonte menos confiável que o RH de hoje. Um teste que
 * só prova que o negrito funciona deixaria passar exatamente o defeito que importa.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextoRico } from '../TextoRico'

describe('TextoRico — o subconjunto que ele entende', () => {
  it('(a) transforma `- item` em lista com marcador, agrupando linhas consecutivas', () => {
    const { container } = render(
      <TextoRico texto={'Intro\n\n- primeiro\n- segundo\n- terceiro'} />
    )
    const listas = container.querySelectorAll('ul')
    expect(listas).toHaveLength(1)
    expect(listas[0].querySelectorAll('li')).toHaveLength(3)
    expect(screen.getByText('segundo')).toBeInTheDocument()
  })

  it('(b) transforma `1.` em lista numerada e RESPEITA o número inicial', () => {
    const { container } = render(<TextoRico texto={'3. terceiro\n4. quarto'} />)
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    expect(ol?.getAttribute('start')).toBe('3')
    expect(ol?.querySelectorAll('li')).toHaveLength(2)
  })

  it('(c) `**texto**` vira <strong>, e o conteúdo chega sem os asteriscos', () => {
    render(<TextoRico texto={'A **prioridade** é clara.'} />)
    const forte = screen.getByText('prioridade')
    expect(forte.tagName).toBe('STRONG')
    expect(forte.textContent).not.toContain('*')
  })

  it('(d) linha em branco separa parágrafos DE VERDADE, não um <p> só', () => {
    const { container } = render(<TextoRico texto={'Primeiro.\n\nSegundo.'} />)
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })

  it('(e) `### Título` vira subtítulo', () => {
    render(<TextoRico texto={'### Rotina\n\nTexto.'} />)
    expect(screen.getByText('Rotina').tagName).toBe('H4')
  })

  it('(e2) `*texto*` vira <em>', () => {
    render(<TextoRico texto={'A etapa *(foco atual)* abre a próxima.'} />)
    const it_ = screen.getByText('(foco atual)')
    expect(it_.tagName).toBe('EM')
    expect(it_.textContent).not.toContain('*')
  })

  it('(e3) ⊖ negrito NÃO é lido como itálico — a ordem da alternância segura isto', () => {
    const { container } = render(<TextoRico texto={'**Contam pontos:** GoHighLevel'} />)
    const forte = container.querySelector('strong')
    expect(forte?.textContent).toBe('Contam pontos:')
    // se a ordem invertesse, sobraria <em> e/ou asterisco solto na tela
    expect(container.querySelector('em')).toBeNull()
    expect(container.textContent).not.toContain('*')
  })
})

describe('TextoRico — o que ele RECUSA', () => {
  it('(f) ⊖ NUNCA renderiza HTML: uma tag no texto chega como TEXTO LITERAL', () => {
    const { container } = render(
      <TextoRico texto={'<img src=x onerror="alert(1)"> e <b>negrito</b>'} />
    )
    // Nenhum elemento nasceu do texto — nem img, nem b.
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    // E o texto aparece na tela como o usuário o escreveu.
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
    expect(container.textContent).toContain('<b>negrito</b>')
  })

  it('(g) ⊖ `**` órfão fica LITERAL, e não abre negrito até o fim do texto', () => {
    const { container } = render(<TextoRico texto={'isto ** não fecha nunca'} />)
    expect(container.querySelector('strong')).toBeNull()
    expect(container.textContent).toContain('**')
  })

  it('(h) ⊖ texto vazio, nulo ou só espaços não renderiza container nenhum', () => {
    expect(render(<TextoRico texto={''} />).container.firstChild).toBeNull()
    expect(render(<TextoRico texto={null} />).container.firstChild).toBeNull()
    expect(render(<TextoRico texto={undefined} />).container.firstChild).toBeNull()
    expect(render(<TextoRico texto={'   \n\n  '} />).container.firstChild).toBeNull()
  })
})

describe('TextoRico — a divergência string/array que o schema não reflete', () => {
  it('(i) aceita ARRAY, juntando os itens como blocos separados', () => {
    const { container } = render(<TextoRico texto={['Um.', 'Dois.']} />)
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })

  it('(j) ⊖ array com buracos não produz parágrafo vazio', () => {
    const { container } = render(
      <TextoRico texto={['Um.', '', 'Dois.'] as string[]} />
    )
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })
})
