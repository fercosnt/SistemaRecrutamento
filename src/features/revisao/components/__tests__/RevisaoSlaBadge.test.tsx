/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 42 / Plano 42-09 Task 2 (TDD RED) — `RevisaoSlaBadge` (REVISAO-02).
 *
 * O contrato load-bearing é a INVARIANTE COLORBLIND-SAFE (regra `ScoreCell` /
 * T-34-04-03): o badge **sempre** carrega rótulo textual E contagem de dias no mesmo
 * elemento, e a faixa vermelha leva um ícone de alerta como 2º canal redundante. Cor
 * nunca é o único canal — e é isso que os testes de "só cor" abaixo prendem.
 *
 * O segundo contrato é a TOTALIDADE: a configuração de limiar vem de uma tabela do
 * servidor (D-P42-02), então linha ausente, limiar zerado e ordem invertida são estados
 * ALCANÇÁVEIS em produção. Nenhum deles pode produzir célula vazia nem exceção — todos
 * resolvem para a faixa degenerada (a contagem neutra, sem badge).
 *
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Faixas do badge de SLA)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { RevisaoSlaBadge } from '../RevisaoSlaBadge'

const LIMIARES = { diasAtencao: 5, diasAtraso: 10 }

describe('RevisaoSlaBadge — as 3 faixas nominais carregam rótulo + contagem', () => {
  it('em dia (dias < atenção) → "Em dia · 2d"', () => {
    render(<RevisaoSlaBadge diasEspera={2} limiares={LIMIARES} />)
    expect(screen.getByText('Em dia · 2d')).toBeInTheDocument()
  })

  it('atenção (atenção ≤ dias < atraso) → "Atenção · 5d"', () => {
    render(<RevisaoSlaBadge diasEspera={5} limiares={LIMIARES} />)
    expect(screen.getByText('Atenção · 5d')).toBeInTheDocument()
  })

  it('atrasado (dias ≥ atraso) → "Atrasado · 12d" + ícone de alerta aria-hidden', () => {
    const { container } = render(<RevisaoSlaBadge diasEspera={12} limiares={LIMIARES} />)
    expect(screen.getByText('Atrasado · 12d')).toBeInTheDocument()
    // O 2º canal redundante da faixa vermelha, decorativo para leitor de tela.
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
  })

  it('a faixa verde usa a paleta esmeralda da UI-SPEC', () => {
    const { container } = render(<RevisaoSlaBadge diasEspera={1} limiares={LIMIARES} />)
    expect(container.innerHTML).toContain('emerald')
  })
})

describe('RevisaoSlaBadge — colorblind-safe: NENHUM ramo é só cor', () => {
  const casos: Array<[string, number, typeof LIMIARES | null]> = [
    ['em dia', 1, LIMIARES],
    ['atenção', 6, LIMIARES],
    ['atrasado', 30, LIMIARES],
    ['degenerado', 3, null],
  ]

  it.each(casos)('o ramo "%s" renderiza texto legível, nunca célula vazia', (_n, dias, cfg) => {
    const { container } = render(<RevisaoSlaBadge diasEspera={dias} limiares={cfg} />)
    // Há SEMPRE conteúdo textual, e ele SEMPRE contém a contagem de dias.
    expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    expect(container.textContent).toContain(`${dias}d`)
  })

  it.each(casos.slice(0, 3))(
    'o ramo nominal "%s" carrega rótulo TEXTUAL além da contagem (não só cor)',
    (_n, dias, cfg) => {
      const { container } = render(<RevisaoSlaBadge diasEspera={dias} limiares={cfg} />)
      // Remover a contagem tem de deixar palavras — se sobrar só o número, o rótulo
      // textual foi perdido e a cor virou o único canal.
      const semContagem = (container.textContent ?? '').replace(`${dias}d`, '')
      expect(semContagem).toMatch(/[A-Za-zÀ-ÿ]/)
    },
  )
})

describe('RevisaoSlaBadge — faixa degenerada: contagem neutra e NENHUM badge', () => {
  it('config ausente (`null`) → só "3d", sem elemento de badge', () => {
    const { container } = render(<RevisaoSlaBadge diasEspera={3} limiares={null} />)
    expect(screen.getByText('3d')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="badge"]')).toBeNull()
  })

  it('limiar zerado → degenerado (um 0 no banco jogaria a fila toda em vermelho)', () => {
    const { container } = render(
      <RevisaoSlaBadge diasEspera={3} limiares={{ diasAtencao: 0, diasAtraso: 10 }} />,
    )
    expect(container.querySelector('[data-slot="badge"]')).toBeNull()
    expect(container.textContent).toContain('3d')
  })

  it('ordem invertida no banco → degenerado, nunca exceção', () => {
    expect(() =>
      render(
        <RevisaoSlaBadge diasEspera={7} limiares={{ diasAtencao: 10, diasAtraso: 5 }} />,
      ),
    ).not.toThrow()
  })

  it('a faixa degenerada NÃO usa nenhuma cor de faixa', () => {
    const { container } = render(<RevisaoSlaBadge diasEspera={3} limiares={null} />)
    expect(container.innerHTML).not.toContain('emerald')
    expect(container.innerHTML).not.toContain('yellow')
    expect(container.innerHTML).not.toContain('red')
  })
})
