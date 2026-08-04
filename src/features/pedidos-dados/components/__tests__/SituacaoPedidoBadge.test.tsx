/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 44 / Plano 44-09 Task 1 (TDD RED) — `SituacaoPedidoBadge` (EXPORT-05).
 *
 * O badge do eixo "o que aconteceu". Ele existe para que uma linha que FALHOU seja
 * distinguível de uma atendida **pela palavra**, não pela cor — a Invariante 6 da
 * 44-UI-SPEC (regra colorblind-safe herdada do `ScoreCell` / T-34-04-03). Por isso toda
 * asserção de rótulo aqui é primária e toda asserção de classe é secundária: uma suíte
 * que provasse só a cor passaria numa UI que quebrou a regra.
 *
 * ── AS DUAS DIVERGÊNCIAS DELIBERADAS EM RELAÇÃO AO `VereditoBadge` ────────────────
 *  1. Valor fora do vocabulário renderiza o TOKEN CRU no tratamento neutro (o análogo
 *     devolve nulo e não renderiza nada). Normalização defensiva do precedente 42-11: o
 *     CHECK do banco já fecha o vocabulário, mas um invariante REMOTO é a coisa errada
 *     para uma decisão de RENDERIZAÇÃO se apoiar. Um valor novo tem de APARECER — sumir
 *     fecharia a superfície em silêncio.
 *  2. Os dois valores do caminho feliz NÃO têm o mesmo tratamento: neutro para atendido,
 *     âmbar para não atendido. É a regra de eixos da §Color — Situação codifica o que
 *     aconteceu (âmbar), Acompanhamento codifica quanto do prazo passou (vermelho).
 *
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§Badge de Situação · E7)
 * @see src/features/revisao/components/VereditoBadge.tsx (o molde)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { SituacaoPedidoBadge } from '../SituacaoPedidoBadge'

/** Os quatro casos que o componente atende — os mesmos das duas asserções negativas. */
const CASOS: Array<string | null | undefined> = [
  'atendido',
  'pendente',
  'situacao_nova_do_servidor',
  null,
]

function badgeDe(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-slot="badge"]')
}

describe('SituacaoPedidoBadge — vocabulário fechado, âmbar SÓ no não atendido', () => {
  it('(bm) `atendido` → "Atendido" com tratamento glass NEUTRO — um pedido atendido não é alarme', () => {
    const { container } = render(<SituacaoPedidoBadge situacao="atendido" />)

    expect(screen.getByText('Atendido')).toBeInTheDocument()

    const classes = badgeDe(container)?.className ?? ''
    expect(classes).not.toContain('amber')
    expect(classes).not.toContain('yellow')
    expect(classes).not.toContain('red')
  })

  it('(bn) `pendente` → a PALAVRA "Não atendido" primeiro; o âmbar é o canal redundante', () => {
    const { container } = render(<SituacaoPedidoBadge situacao="pendente" />)

    // Asserção PRIMÁRIA: é o texto que satisfaz a Invariante 6, nunca a cor.
    expect(screen.getByText('Não atendido')).toBeInTheDocument()

    // Só depois a cor — e ela é âmbar (eixo Situação), jamais vermelha (eixo
    // Acompanhamento). Dois alarmes vermelhos na mesma linha destruiriam a distinção
    // que o SC#4 existe para criar.
    const classes = badgeDe(container)?.className ?? ''
    expect(classes).toContain('amber')
    expect(classes).not.toContain('red-')
  })

  it('(bo) valor desconhecido → o TOKEN CRU visível, neutro — nunca célula vazia, nunca nulo', () => {
    const { container } = render(
      <SituacaoPedidoBadge situacao="situacao_nova_do_servidor" />,
    )

    // ⚠ Divergência deliberada do `VereditoBadge`, que devolve nulo fora do vocabulário.
    expect(screen.getByText('situacao_nova_do_servidor')).toBeInTheDocument()
    expect(container.textContent).not.toBe('')
    expect(badgeDe(container)).not.toBeNull()
    expect(badgeDe(container)?.className ?? '').not.toContain('amber')
  })

  it('(bp) `null` e `undefined` renderizam neutro, sem lançar e sem célula vazia', () => {
    for (const valor of [null, undefined]) {
      const { container } = render(<SituacaoPedidoBadge situacao={valor} />)

      expect(badgeDe(container)).not.toBeNull()
      expect(container.textContent).not.toBe('')
      expect(badgeDe(container)?.className ?? '').not.toContain('amber')
    }
  })
})

describe('SituacaoPedidoBadge — as duas asserções NEGATIVAS', () => {
  it('(bq) o 5º tamanho (12px) que o primitivo traz é SOBRESCRITO pela constante local', () => {
    for (const valor of CASOS) {
      const { container } = render(<SituacaoPedidoBadge situacao={valor} />)
      const classes = (badgeDe(container)?.className ?? '').split(/\s+/)

      expect(classes).toContain('text-sm')
      expect(classes).not.toContain('text-xs')
    }
  })

  it('(br) nenhum ícone em nenhum dos quatro casos — o único da linha é da faixa vermelha', () => {
    for (const valor of CASOS) {
      const { container } = render(<SituacaoPedidoBadge situacao={valor} />)
      expect(container.querySelector('svg')).toBeNull()
    }
  })
})
