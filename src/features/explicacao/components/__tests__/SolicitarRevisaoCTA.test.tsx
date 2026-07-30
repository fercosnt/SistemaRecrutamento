/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 42 / Plano 42-11 Task 2 — os TRÊS estados do `SolicitarRevisaoCTA` (REVISAO-04).
 *
 * O CTA nasceu na Phase 15 com dois estados (disponível · já solicitada). A 42-11
 * acrescenta o terceiro e terminal (respondida) como RAMO NOVO, à frente dos dois
 * existentes — que ficam intocados. Esta suíte assere as duas coisas ao mesmo tempo:
 * que o ramo novo existe com a copy da UI-SPEC, e que os dois antigos continuam
 * exatamente como eram (um estado que regride aqui volta a oferecer ao candidato uma
 * ação que o servidor já recusa).
 *
 * Os três rótulos são curtos e FIXOS, sem interpolação de texto livre (E7 da
 * 42-UI-SPEC) — é isso que dá largura previsível e torna a copy verificável byte a byte.
 *
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Superfície do candidato — REVISAO-04)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const mutate = vi.fn()

vi.mock('../../hooks/useExplicacao', () => ({
  useSolicitarRevisao: () => ({ mutate, isPending: false }),
}))

import { SolicitarRevisaoCTA } from '../SolicitarRevisaoCTA'

const CAND_ID = '11111111-1111-4111-8111-111111111111'
const PEDIDO_EM = '2026-07-20T10:00:00Z'
const RESPOSTA_EM = '2026-07-28T14:30:00Z'

/** Copy verbatim da 42-UI-SPEC (os três estados). */
const COPY_SPEC = {
  cta: 'Solicitar revisão por pessoa natural',
  jaSolicitada: 'Você já solicitou a revisão desta decisão.',
  respondida: 'Sua solicitação de revisão foi respondida.',
  tooltipSolicitada: 'Solicitação registrada em 20/07/2026',
  tooltipRespondida: 'Solicitação registrada em 20/07/2026 · respondida em 28/07/2026',
} as const

beforeEach(() => {
  mutate.mockReset()
})

describe('SolicitarRevisaoCTA — os dois estados da Phase 15 seguem inalterados', () => {
  it('sem pedido → o CTA está habilitado e é o gatilho do diálogo de confirmação', () => {
    render(<SolicitarRevisaoCTA candidaturaId={CAND_ID} revisaoSolicitadaEm={null} />)
    const botao = screen.getByRole('button', { name: COPY_SPEC.cta })
    expect(botao).toBeEnabled()
    expect(botao.className).toContain('min-h-[44px]')
    expect(screen.queryByText(COPY_SPEC.jaSolicitada)).not.toBeInTheDocument()
    expect(screen.queryByText(COPY_SPEC.respondida)).not.toBeInTheDocument()
  })

  it('pedido feito e SEM resposta → rótulo "já solicitou", desabilitado, copy inalterada', () => {
    render(
      <SolicitarRevisaoCTA candidaturaId={CAND_ID} revisaoSolicitadaEm={PEDIDO_EM} />,
    )
    expect(screen.getByText(COPY_SPEC.jaSolicitada)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: COPY_SPEC.cta })).toBeDisabled()
    expect(screen.queryByText(COPY_SPEC.respondida)).not.toBeInTheDocument()
  })

  it('passar `revisaoRespondidaEm` nulo explicitamente é idêntico a não passar', () => {
    const { container: semProp } = render(
      <SolicitarRevisaoCTA candidaturaId={CAND_ID} revisaoSolicitadaEm={PEDIDO_EM} />,
    )
    const { container: comNulo } = render(
      <SolicitarRevisaoCTA
        candidaturaId={CAND_ID}
        revisaoSolicitadaEm={PEDIDO_EM}
        revisaoRespondidaEm={null}
      />,
    )
    expect(comNulo.innerHTML).toBe(semProp.innerHTML)
  })
})

describe('SolicitarRevisaoCTA — o terceiro estado: a revisão foi respondida', () => {
  it('mostra o rótulo terminal da UI-SPEC e desabilita a ação', () => {
    render(
      <SolicitarRevisaoCTA
        candidaturaId={CAND_ID}
        revisaoSolicitadaEm={PEDIDO_EM}
        revisaoRespondidaEm={RESPOSTA_EM}
      />,
    )
    expect(screen.getByText(COPY_SPEC.respondida)).toBeInTheDocument()
    // O estado anterior NÃO pode coexistir: são estados, não camadas.
    expect(screen.queryByText(COPY_SPEC.jaSolicitada)).not.toBeInTheDocument()
    const botao = screen.getByRole('button', { name: COPY_SPEC.cta })
    // `disabled` NATIVO é o mecanismo — não um `aria-disabled` cosmético sobre um botão
    // clicável. Vale lembrar que aqui a UI nunca é o que impede a ação: o servidor recusa
    // 22023 ('revisao ja respondida') mesmo que este botão fosse clicado.
    expect(botao).toBeDisabled()
    expect(botao.className).toContain('min-h-[44px]')
  })

  it('o motivo cita as DUAS datas e está legível sem hover (piso de acessibilidade)', () => {
    const { container } = render(
      <SolicitarRevisaoCTA
        candidaturaId={CAND_ID}
        revisaoSolicitadaEm={PEDIDO_EM}
        revisaoRespondidaEm={RESPOSTA_EM}
      />,
    )
    // Um tooltip do Radix só monta o conteúdo quando abre; a duplicata `sr-only` é o que
    // torna as datas alcançáveis por leitor de tela e em toque. Mesma fonte de copy.
    expect(container.textContent).toContain(COPY_SPEC.tooltipRespondida)
  })

  it('sem a data do pedido (estado que o servidor não produz) não inventa tooltip', () => {
    // `responder_revisao_decisao` recusa 22023 quando não há pedido de revisão, então
    // respondida-sem-pedido é impossível pelo caminho real. Defensivo pela mesma razão do
    // `formatRequestedDate` original: não afirmar data que não existe.
    const { container } = render(
      <SolicitarRevisaoCTA
        candidaturaId={CAND_ID}
        revisaoSolicitadaEm={null}
        revisaoRespondidaEm={RESPOSTA_EM}
      />,
    )
    expect(screen.getByText(COPY_SPEC.respondida)).toBeInTheDocument()
    expect(container.textContent).not.toContain('Solicitação registrada em')
    expect(container.textContent).not.toContain('undefined')
    expect(container.textContent).not.toContain('Invalid Date')
  })

  it('o rótulo é fixo: nenhum texto do servidor é interpolado nele (E7)', () => {
    render(
      <SolicitarRevisaoCTA
        candidaturaId={CAND_ID}
        revisaoSolicitadaEm={PEDIDO_EM}
        revisaoRespondidaEm={RESPOSTA_EM}
      />,
    )
    expect(screen.getByText(COPY_SPEC.respondida).textContent).toBe(COPY_SPEC.respondida)
  })

  it('nenhum vestígio do acompanhamento interno do RH, nem em title/aria-label', () => {
    const { container } = render(
      <SolicitarRevisaoCTA
        candidaturaId={CAND_ID}
        revisaoSolicitadaEm={PEDIDO_EM}
        revisaoRespondidaEm={RESPOSTA_EM}
      />,
    )
    const atributos = Array.from(
      container.querySelectorAll('[title], [aria-label]'),
    ).flatMap((el) => [el.getAttribute('title') ?? '', el.getAttribute('aria-label') ?? ''])
    for (const alvo of [container.innerHTML, ...atributos]) {
      for (const padrao of [
        /dias em espera/i,
        /acompanhament/i,
        /\bem dia\b/i,
        /atrasad/i,
        /faixa/i,
        /\bsla\b/i,
        /prazo/i,
        /\d+\s*dias?\b/i,
      ]) {
        expect(alvo).not.toMatch(padrao)
      }
    }
  })
})
