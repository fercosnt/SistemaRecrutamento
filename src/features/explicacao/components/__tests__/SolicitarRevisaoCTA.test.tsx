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
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'

const mutate = vi.fn()

vi.mock('../../hooks/useExplicacao', () => ({
  useSolicitarRevisao: () => ({ mutate, isPending: false }),
}))

import { SolicitarRevisaoCTA } from '../SolicitarRevisaoCTA'

const CAND_ID = '11111111-1111-4111-8111-111111111111'
const PEDIDO_EM = '2026-07-20T10:00:00Z'
const RESPOSTA_EM = '2026-07-28T14:30:00Z'

/**
 * Copy verbatim da 42-UI-SPEC (os três estados), com os 3 sítios do Art. 20
 * REESCRITOS pela 43-UI-SPEC §"Copy do Art. 20 reescrita (BD-3)".
 *
 * ⚠ `cta`, `dialogTitle` e `dialogConfirm` mudaram na Phase 43 (BD-3): o juridiquês que a
 * Invariante 8 manda matar ("por pessoa … natural", escrito aqui com elipse porque o portão
 * de `src/__tests__/copyPortoesLgpd.test.ts` varre COMENTÁRIO também) morreu, e a citação do
 * Art. 20 continua viva ao lado (em `ExplicacaoCandidatoPage`). Os rótulos abaixo são PINS —
 * é o que faz a próxima reescrita aparecer no diff em vez de escorregar. `solicitar`
 * /`solicitação` NÃO é juridiquês e permanece nos dois rótulos de estado, que a
 * UI-SPEC declara explicitamente inalterados.
 */
const COPY_SPEC = {
  cta: 'Pedir que uma pessoa revise esta decisão',
  jaSolicitada: 'Você já solicitou a revisão desta decisão.',
  respondida: 'Sua solicitação de revisão foi respondida.',
  tooltipSolicitada: 'Solicitação registrada em 20/07/2026',
  tooltipRespondida: 'Solicitação registrada em 20/07/2026 · respondida em 28/07/2026',
  /** 43-UI-SPEC (BD-3) — pin NOVO: não existia, e por isso a reescrita anterior escorregou. */
  dialogTitle: 'Pedir revisão desta decisão?',
  /** 43-UI-SPEC (BD-3) — pin NOVO. */
  dialogConfirm: 'Pedir revisão',
  /** Declarado INALTERADO pela 43-UI-SPEC — pinado para provar que continua byte-idêntico. */
  dialogBody:
    'Sua solicitação será enviada à equipe responsável, que revisará a decisão. Acompanhe o andamento pelo seu painel.',
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

/**
 * Phase 43 / Plano 43-02 Task 2 (BD-3) — os DOIS sítios do diálogo que não tinham pin.
 *
 * ⚠ POR QUE ESTAS ASSERÇÕES LEEM `document.body` E NUNCA O `container` DO RENDER:
 * o conteúdo do `AlertDialog` do Radix é montado em PORTAL, fora da árvore devolvida
 * pelo `render()`. Uma asserção sobre `container.textContent` fica olhando um nó vazio
 * e PASSA sem ter verificado nada — foram 3 falsos verdes medidos no 42-10. `screen`
 * é `within(document.body)` por definição, e é por isso que ele é o alvo aqui.
 */
describe('SolicitarRevisaoCTA — a copy do diálogo de confirmação (BD-3)', () => {
  function abrirDialogo() {
    render(<SolicitarRevisaoCTA candidaturaId={CAND_ID} revisaoSolicitadaEm={null} />)
    fireEvent.click(screen.getByRole('button', { name: COPY_SPEC.cta }))
  }

  it('o TÍTULO do diálogo fala em linguagem que o titular decodifica', () => {
    abrirDialogo()
    const corpo = within(document.body)
    expect(corpo.getByText(COPY_SPEC.dialogTitle)).toBeInTheDocument()
    // Pin por igualdade: o rótulo é fixo, sem interpolação (E7 da 42-UI-SPEC).
    expect(corpo.getByText(COPY_SPEC.dialogTitle).textContent).toBe(COPY_SPEC.dialogTitle)
  })

  it('o BOTÃO de confirmação fala em linguagem que o titular decodifica', () => {
    abrirDialogo()
    const confirmar = within(document.body).getByRole('button', {
      name: COPY_SPEC.dialogConfirm,
    })
    expect(confirmar).toBeInTheDocument()
    expect(confirmar.textContent).toBe(COPY_SPEC.dialogConfirm)
  })

  it('confirmar dispara a mutação — a reescrita é de COPY, não de comportamento', () => {
    abrirDialogo()
    fireEvent.click(
      within(document.body).getByRole('button', { name: COPY_SPEC.dialogConfirm }),
    )
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('o CORPO do diálogo continua byte-idêntico (declarado INALTERADO pela UI-SPEC)', () => {
    abrirDialogo()
    expect(within(document.body).getByText(COPY_SPEC.dialogBody)).toBeInTheDocument()
  })

  it('nenhuma superfície do componente carrega o juridiquês que a BD-3 mata', () => {
    abrirDialogo()
    // Invariante 8 da 43-UI-SPEC. Montado em runtime para não gravar o literal
    // proibido neste arquivo — o mesmo idioma do portão em src/__tests__.
    const juridiques = ['pessoa', 'natural'].join(' ')
    expect(document.body.textContent ?? '').not.toContain(juridiques)
  })
})
