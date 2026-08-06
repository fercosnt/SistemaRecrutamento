/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 45 / Plano 45-09 Task 3 (TDD RED) — `RetirarCandidaturaAcao`: sair de UMA
 * vaga sem apagar nada (ERASE-05).
 *
 * ── A ARMADILHA MEDIDA, E POR QUE ELA DITA A FORMA DESTES TESTES ─────────────
 * O card inteiro do dashboard é clicável: `GlassCard … onClick={() =>
 * handleVerVaga(candidatura.vaga_id)}` (`DashboardCandidatoPage.tsx:289`). Sem
 * `stopPropagation`, um toque na ação abre o diálogo **e navega para a vaga por
 * baixo dele** — defeito de mis-tap numa superfície mobile-first.
 *
 * ⚠ **O TESTE INGÊNUO NÃO PEGA ISSO.** Uma asserção que invoque o handler
 * diretamente (`onClick()`) passa com o defeito presente, porque o defeito não está
 * no handler — está na PROPAGAÇÃO. Por isso os casos (a1) e (a2) disparam o evento
 * **no elemento**, com bubbling real, dentro de um card cujo `onClick` é um mock.
 *
 * ⚠ E o caso (a2) não é redundante com o (a1): o `AlertDialogContent` do Radix
 * renderiza num **portal**, e eventos de portal do React propagam pela ÁRVORE REACT,
 * não pela árvore do DOM. Um clique dentro do diálogo aberto alcança o `onClick` do
 * card mesmo estando fora dele no DOM — é a metade da armadilha que passa
 * despercebida justamente por parecer impossível.
 *
 * ── OS DOIS BACKSTOPS DA 45-UI-SPEC ─────────────────────────────────────────
 *  - **(b)** E7·error — a distinção do ERASE-05 não pode se perder numa edição de
 *    copy. A asserção tem DUAS metades, e a segunda é a que um teste de texto
 *    sozinho não pega: presença literal de "Seus dados continuam com a Beauty
 *    Smile" **E** ausência de qualquer elemento de navegação para a rota de
 *    privacidade dentro do diálogo (Invariante 2 — um link ali transformaria "quero
 *    sair desta vaga" num caminho de dois cliques até um efeito irreversível).
 *
 *  - **(c)** §Color — o `AlertDialogAction` da retirada é glass-branco, **nunca**
 *    destructive. Se os dois diálogos fossem vermelhos, o vermelho deixaria de
 *    significar "isto não tem volta" e passaria a significar "isto é um diálogo" —
 *    e a distinção que o ERASE-05 exige morreria no único lugar onde ela é lida sob
 *    pressão.
 *
 * @see .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-UI-SPEC.md (§`/candidato/dashboard` · Retirar minha candidatura)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'

const mutate = vi.fn()
let estadoMutacao = { isPending: false, isError: false }

vi.mock('../../hooks/useRetirarCandidatura', () => ({
  useRetirarCandidatura: () => ({ mutate, ...estadoMutacao }),
}))

import { RetirarCandidaturaAcao, COPY_RETIRAR_CANDIDATURA } from '../RetirarCandidaturaAcao'

const onNavegarCard = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  estadoMutacao = { isPending: false, isError: false }
})

/**
 * Monta a ação DENTRO de um card clicável — a réplica fiel do hospedeiro. Sem este
 * envelope, os casos (a1)/(a2) não teriam o que provar.
 */
function renderNoCard(props: Partial<Parameters<typeof RetirarCandidaturaAcao>[0]> = {}) {
  return render(
    <div data-testid="card" onClick={onNavegarCard}>
      <RetirarCandidaturaAcao
        candidaturaId="cand-1"
        tituloVaga="Dentista Sênior"
        encerradaEm={null}
        emAndamento
        {...props}
      />
    </div>,
  )
}

function abrirDialogo() {
  fireEvent.click(screen.getByRole('button', { name: COPY_RETIRAR_CANDIDATURA.acao }))
}

describe('(a) a armadilha de mis-tap — evento REAL, com bubbling', () => {
  it('(a1) tocar a ação abre o diálogo e NÃO dispara a navegação do card', () => {
    renderNoCard()
    const acao = screen.getByRole('button', { name: COPY_RETIRAR_CANDIDATURA.acao })

    // Evento disparado NO ELEMENTO, com bubbling real — nunca `props.onClick()`.
    fireEvent.click(acao)

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(onNavegarCard).not.toHaveBeenCalled()
  })

  it('(a2) clicar DENTRO do diálogo aberto não dispara a navegação do card (portal do React)', () => {
    renderNoCard()
    abrirDialogo()
    onNavegarCard.mockClear()

    const dialogo = screen.getByRole('alertdialog')
    fireEvent.click(dialogo)
    fireEvent.click(within(dialogo).getByText(COPY_RETIRAR_CANDIDATURA.paragrafo2))
    fireEvent.click(within(dialogo).getByRole('button', { name: COPY_RETIRAR_CANDIDATURA.recuar }))

    expect(onNavegarCard).not.toHaveBeenCalled()
  })
})

describe('(b) BACKSTOP E7·error — a distinção do ERASE-05', () => {
  it('(b1) o diálogo diz literalmente que os dados continuam com a Beauty Smile', () => {
    renderNoCard()
    abrirDialogo()
    const dialogo = screen.getByRole('alertdialog')
    expect(within(dialogo).getByText(COPY_RETIRAR_CANDIDATURA.paragrafo2)).toBeInTheDocument()
    expect(dialogo).toHaveTextContent('Seus dados continuam com a Beauty Smile')
  })

  it('(b2) o diálogo NÃO oferece nenhuma navegação para a página de dados', () => {
    renderNoCard()
    abrirDialogo()
    const dialogo = screen.getByRole('alertdialog')

    // Metade que um teste de texto sozinho não pega: zero elementos de navegação.
    expect(dialogo.querySelectorAll('a')).toHaveLength(0)
    expect(dialogo.querySelector('[href*="privacidade"]')).toBeNull()
    for (const btn of within(dialogo).getAllByRole('button')) {
      expect(btn.getAttribute('href')).toBeNull()
      expect(btn.textContent ?? '').not.toMatch(/seus dados e autoriza|ir para|abrir/i)
    }
  })
})

describe('(c) BACKSTOP §Color — a assimetria é o mecanismo', () => {
  it('(c1) o controle de confirmação NÃO carrega tratamento destructive', () => {
    renderNoCard()
    abrirDialogo()
    const confirmar = within(screen.getByRole('alertdialog')).getByRole('button', {
      name: COPY_RETIRAR_CANDIDATURA.confirmar,
    })
    expect(confirmar.className).not.toMatch(/destructive/)
  })

  it('(c2) os dois rótulos de saída são distintos e nenhum é o verbo genérico', () => {
    renderNoCard()
    abrirDialogo()
    const rotulos = within(screen.getByRole('alertdialog'))
      .getAllByRole('button')
      .map((b) => (b.textContent ?? '').trim())
      .filter(Boolean)
    expect(new Set(rotulos).size).toBe(rotulos.length)
    // "Cancelar" é também o nome da ação de cancelar a exclusão (outra tela).
    expect(rotulos).not.toContain('Cancelar')
  })
})

describe('(d) título do diálogo — nunca UUID, nunca "Vaga não encontrada"', () => {
  it('(d1) com título resolvível, o diálogo nomeia a vaga', () => {
    renderNoCard({ tituloVaga: 'Dentista Sênior' })
    abrirDialogo()
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      COPY_RETIRAR_CANDIDATURA.titulo('Dentista Sênior'),
    )
  })

  it('(d2) sem título resolvível, o diálogo diz «esta vaga»', () => {
    for (const semTitulo of [null, undefined, '', '   ']) {
      const { unmount } = renderNoCard({ tituloVaga: semTitulo as string | null })
      abrirDialogo()
      const dialogo = screen.getByRole('alertdialog')
      expect(dialogo).toHaveTextContent(COPY_RETIRAR_CANDIDATURA.titulo('esta vaga'))
      expect(dialogo.textContent ?? '').not.toMatch(/Vaga não encontrada/i)
      expect(dialogo.textContent ?? '').not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      )
      unmount()
    }
  })
})

describe('(e) o card permanece — retirar não apaga, e a tela não pode sugerir que apaga', () => {
  it('(e1) já retirada: o estado é dito por escrito e a ação some', () => {
    renderNoCard({ encerradaEm: '2026-08-06T12:00:00Z' })
    expect(screen.getByText(/Você retirou sua candidatura em \d{2}\/\d{2}\/\d{4}\./)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: COPY_RETIRAR_CANDIDATURA.acao }),
    ).not.toBeInTheDocument()
  })

  it('(e2) data ilegível: a frase que a conteria é omitida — nunca «Invalid Date»', () => {
    renderNoCard({ encerradaEm: 'nao-e-data' })
    const raiz = screen.getByTestId('card')
    expect(raiz.textContent ?? '').not.toMatch(/Invalid Date|NaN|—/)
    expect(
      screen.queryByRole('button', { name: COPY_RETIRAR_CANDIDATURA.acao }),
    ).not.toBeInTheDocument()
  })

  it('(e3) candidatura já decidida não oferece a ação', () => {
    renderNoCard({ emAndamento: false })
    expect(
      screen.queryByRole('button', { name: COPY_RETIRAR_CANDIDATURA.acao }),
    ).not.toBeInTheDocument()
  })
})

describe('(f) E6·loading e E6·error — estado POR CARD', () => {
  it('(f1) em voo: rótulo de voo, desabilitado, aria-busy e motivo irmão visível', () => {
    estadoMutacao = { isPending: true, isError: false }
    renderNoCard()
    const acao = screen.getByRole('button', { name: COPY_RETIRAR_CANDIDATURA.emVoo })
    expect(acao).toBeDisabled()
    expect(acao).toHaveAttribute('aria-busy', 'true')

    // Todo botão desabilitado desta fase carrega irmão com o motivo em texto
    // visível, ligado por aria-describedby (§Acessibilidade).
    const idMotivo = acao.getAttribute('aria-describedby')
    expect(idMotivo).toBeTruthy()
    const motivo = document.getElementById(idMotivo!)
    expect(motivo).toBeInTheDocument()
    expect(motivo?.textContent?.trim()).toBeTruthy()
  })

  it('(f2) o alvo tátil da ação nunca encolhe abaixo de 44px', () => {
    renderNoCard()
    expect(
      screen.getByRole('button', { name: COPY_RETIRAR_CANDIDATURA.acao }).className,
    ).toMatch(/min-h-\[44px\]/)
  })

  it('(f3) erro: alerta inline destructive com role="alert", por card', () => {
    estadoMutacao = { isPending: false, isError: true }
    renderNoCard()
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent(COPY_RETIRAR_CANDIDATURA.erro)
    expect(alerta.className).toMatch(/destructive/)
  })

  it('(f4) confirmar dispara a mutação com a candidatura DAQUELE card', () => {
    renderNoCard({ candidaturaId: 'cand-42' })
    abrirDialogo()
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: COPY_RETIRAR_CANDIDATURA.confirmar,
      }),
    )
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledWith('cand-42')
  })
})

describe('(g) a copy é constante `as const`, nunca literal no JSX', () => {
  it('(g1) nenhuma string da ação promete apagar dados', () => {
    const todas = [
      COPY_RETIRAR_CANDIDATURA.acao,
      COPY_RETIRAR_CANDIDATURA.emVoo,
      COPY_RETIRAR_CANDIDATURA.paragrafo1,
      COPY_RETIRAR_CANDIDATURA.paragrafo3,
      COPY_RETIRAR_CANDIDATURA.confirmar,
      COPY_RETIRAR_CANDIDATURA.recuar,
      COPY_RETIRAR_CANDIDATURA.erro,
    ].join(' ')
    // O parágrafo 2 é o ÚNICO que pode conter "apagar", e em forma NEGATIVA.
    expect(todas).not.toMatch(/apagar|excluir|eliminad/i)
    expect(COPY_RETIRAR_CANDIDATURA.paragrafo2).toMatch(/não é o mesmo que apagar seus dados/i)
  })
})
