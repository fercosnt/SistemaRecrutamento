/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 45 / Plano 45-08 Task 1 (TDD RED) — `ConfirmarExclusaoDialog`: a superfície
 * onde a decisão irreversível realmente acontece (ERASE-06).
 *
 * ── POR QUE ESTE ARQUIVO É DIFERENTE DE UM TESTE DE DIÁLOGO QUALQUER ─────────
 * Com o PITR desligado por decisão datada (D-45-10) e o Storage fora de qualquer
 * caminho de backup, **um currículo apagado por engano é irrecuperável por qualquer
 * meio**. As strings deste diálogo são a última coisa que uma pessoa lê antes de um
 * efeito que ninguém pode desfazer — então os testes daqui não protegem "UX": eles
 * protegem o **consentimento sob o qual um dado é destruído**.
 *
 * Dois dos casos abaixo são backstop da 45-UI-SPEC, e existem porque a asserção
 * ingênua correspondente passaria com o defeito presente:
 *
 *  - **(c1)** E3·error — os QUATRO rótulos de saída dos dois níveis são coletados do
 *    **DOM renderizado**, não do código-fonte. Nesta fase a palavra genérica de recuo
 *    significaria TRÊS coisas (fechar o diálogo / recuar um passo / cancelar a exclusão
 *    já agendada), e um teste que lesse a constante passaria mesmo se o JSX renderizasse
 *    outra coisa.
 *
 *  - **(c2)** E3·long-text — a caixa de consequência não pode ser encurtada por uma
 *    edição futura "de tom": a asserção exige a presença LITERAL das duas frases que
 *    traduzem o D-45-10 no corpo renderizado. Um teste de "existe uma caixa vermelha"
 *    continuaria verde depois de alguém apagar a frase sobre a ausência de cópia.
 *
 * ── O ESCOPO DAS ASSERÇÕES DE CONTROLE, E POR QUE ELE É DECLARADO ────────────
 * `DialogContent` (primitivo vendorizado, `src/components/ui/dialog.tsx`) renderiza um
 * "X" de fechar próprio, com texto `sr-only` **"Close"** e sem `min-h-[44px]`. Ele é
 * herdado por TODOS os diálogos do app desde o M1; corrigi-lo é mudança em primitivo
 * compartilhado, fora do escopo deste plano (registrado em `deferred-items.md`). As
 * asserções de rótulo e de alvo tátil percorrem os controles **autorados por este
 * componente**, marcados com `data-saida` — e a asserção de que a palavra genérica de
 * recuo não aparece percorre TODOS os botões, inclusive o herdado.
 *
 * @see .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-UI-SPEC.md (§O `AlertDialog` de confirmação)
 * @see src/features/admin/retencao/components/__tests__/EditarJanelaDialog.test.tsx (o molde)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ConfirmarExclusaoDialog, COPY_CONFIRMAR_EXCLUSAO } from '../ConfirmarExclusaoDialog'

const DATA_ALVO = '20/08/2026'

const onConfirmar = vi.fn()
const onOpenChange = vi.fn()

function abrir(props: Partial<Parameters<typeof ConfirmarExclusaoDialog>[0]> = {}) {
  return render(
    <ConfirmarExclusaoDialog
      open
      onOpenChange={onOpenChange}
      dataAlvo={DATA_ALVO}
      onConfirmar={onConfirmar}
      {...props}
    />,
  )
}

/** Abre o segundo nível — o único caminho até o botão vermelho. */
function avancarParaConfirmacao() {
  fireEvent.click(screen.getByRole('button', { name: COPY_CONFIRMAR_EXCLUSAO.avancar }))
  return screen.getByRole('alertdialog')
}

beforeEach(() => {
  onConfirmar.mockReset()
  onOpenChange.mockReset()
})

describe('ConfirmarExclusaoDialog — o corpo que a pessoa lê antes do irreversível', () => {
  it('(c0) nível 1: título, o que acontece, a caixa de consequência e os dois ponteiros', () => {
    abrir()

    expect(screen.getByText(COPY_CONFIRMAR_EXCLUSAO.titulo)).toBeInTheDocument()
    const corpo = (screen.getByRole('dialog').textContent ?? '').replace(/\s+/g, ' ')

    expect(corpo).toContain(COPY_CONFIRMAR_EXCLUSAO.paragrafo1(DATA_ALVO))
    expect(corpo).toContain(COPY_CONFIRMAR_EXCLUSAO.consequenciaTitulo)
    expect(corpo).toContain(COPY_CONFIRMAR_EXCLUSAO.paragrafo2)
    expect(corpo).toContain(COPY_CONFIRMAR_EXCLUSAO.paragrafo3)
  })

  it('(c1) BACKSTOP E3·error: os quatro rótulos de saída são distintos, e nenhum é o verbo genérico', () => {
    abrir()
    avancarParaConfirmacao()

    // Os quatro controles AUTORADOS por este componente, nos dois níveis. O nível 1
    // continua no DOM enquanto a confirmação está aberta (o Radix só o retira da
    // árvore acessível), então os quatro coexistem — que é justamente a condição em
    // que um rótulo repetido faria alguém tomar a saída errada.
    const saidas = Array.from(document.body.querySelectorAll('[data-saida]'))
    const rotulos = saidas.map((no) => (no.textContent ?? '').trim())

    expect(rotulos).toHaveLength(4)
    expect(new Set(rotulos).size).toBe(4)
    expect(rotulos).toContain(COPY_CONFIRMAR_EXCLUSAO.fechar)
    expect(rotulos).toContain(COPY_CONFIRMAR_EXCLUSAO.avancar)
    expect(rotulos).toContain(COPY_CONFIRMAR_EXCLUSAO.recuar)
    expect(rotulos).toContain(COPY_CONFIRMAR_EXCLUSAO.confirmar)

    // ⚠ Aqui o escopo ABRE para todo botão do documento, inclusive o "X" herdado do
    // primitivo: a palavra genérica de recuo é o nome da ação de CANCELAR A EXCLUSÃO
    // no Estado B, e vê-la como rótulo de saída aqui é a colisão que esta fase existe
    // para não construir. Montada em runtime — um teste que proíbe uma string e a
    // contém verbatim é sua própria primeira violação.
    const generico = new RegExp(`^${['cancel', 'ar'].join('')}$`, 'i')
    for (const botao of Array.from(document.body.querySelectorAll('button'))) {
      expect(
        generico.test((botao.textContent ?? '').trim()),
        `rótulo genérico de recuo encontrado: "${botao.textContent}"`,
      ).toBe(false)
    }
  })

  it('(c2) BACKSTOP E3·long-text: as duas frases que traduzem o D-45-10, literais', () => {
    abrir()

    const corpo = (screen.getByRole('dialog').textContent ?? '').replace(/\s+/g, ' ')
    // A tradução honesta do PITR desligado, em linguagem de pessoa. Montadas em
    // runtime pelo mesmo motivo do (c1).
    expect(corpo).toContain(['não podem ser', 'recuperados'].join(' '))
    expect(corpo).toContain(['Não existe cópia de reserva', 'do seu currículo.'].join(' '))
  })

  it('(c2b) sem data resolvida: a frase que a conteria degrada, e as duas frases do D-45-10 ficam', () => {
    abrir({ dataAlvo: null })

    const corpo = (screen.getByRole('dialog').textContent ?? '').replace(/\s+/g, ' ')
    // §Formatação: nunca um travessão, nunca `Invalid Date`, nunca `NaN` no lugar da
    // data de uma exclusão irreversível.
    expect(corpo).not.toContain('NaN')
    expect(corpo).not.toContain('Invalid Date')
    expect(corpo).not.toContain('undefined')
    expect(corpo).not.toContain('null')
    // E o que a pessoa precisa saber sobre a ausência de rede continua dito.
    expect(corpo).toContain(['não podem ser', 'recuperados'].join(' '))
    expect(corpo).toContain(['Não existe cópia de reserva', 'do seu currículo.'].join(' '))
  })

  it('(c3) a caixa de consequência É a descrição do diálogo (aria-describedby), não um enfeite ao lado', () => {
    abrir()

    const dialogo = screen.getByRole('dialog')
    const id = dialogo.getAttribute('aria-describedby')
    expect(id).toBeTruthy()

    const descricao = document.getElementById(id as string)
    expect(descricao).toBeTruthy()
    const texto = (descricao?.textContent ?? '').replace(/\s+/g, ' ')
    expect(texto).toContain(COPY_CONFIRMAR_EXCLUSAO.consequenciaTitulo)
    expect(texto).toContain(['não podem ser', 'recuperados'].join(' '))
    expect(texto).toContain(['Não existe cópia de reserva', 'do seu currículo.'].join(' '))
    // Tratamento destructive — item 1 da lista reservada de TRÊS da §Color.
    expect(descricao?.className).toContain('destructive')
  })
})

describe('ConfirmarExclusaoDialog — o que NÃO pode existir aqui', () => {
  it('(c4) o ponteiro para o export é TEXTO: zero link e zero botão de navegação', () => {
    abrir()
    avancarParaConfirmacao()

    // Invariante 2 na direção segura: o parágrafo manda FECHAR a janela, não navegar
    // dentro dela. Um link aqui transformaria a leitura da consequência num caminho
    // de dois cliques para outro lugar, no instante em que a atenção é mais cara.
    expect(document.body.querySelectorAll('a').length).toBe(0)
    expect(document.body.querySelectorAll('[href]').length).toBe(0)

    for (const botao of Array.from(document.body.querySelectorAll('button'))) {
      const texto = (botao.textContent ?? '').toLowerCase()
      expect(texto.includes(['pedir uma cópia', 'dos seus dados'].join(' '))).toBe(false)
    }

    // E o parágrafo que aponta para o export continua presente, como TEXTO.
    expect(screen.getByText(COPY_CONFIRMAR_EXCLUSAO.paragrafo3)).toBeInTheDocument()
  })

  it('(c5) sem digitação-refém: zero input e zero textarea nos DOIS níveis', () => {
    abrir()
    avancarParaConfirmacao()

    // Invariante 7 — e a justificativa é jurídica, não ergonômica: exigir transcrição
    // de uma palavra para exercer um direito do Art. 18 é fricção sobre um direito. A
    // rede desta fase é a janela cancelável, que protege sem obstruir.
    expect(document.body.querySelectorAll('input').length).toBe(0)
    expect(document.body.querySelectorAll('textarea').length).toBe(0)
    expect(document.body.querySelectorAll('[contenteditable]').length).toBe(0)
  })

  it('(c6) o gatilho NÃO é destructive; só o botão de confirmar é', () => {
    abrir()

    // ⚠ A ASSERÇÃO É SOBRE O PREENCHIMENTO (`bg-destructive`), NÃO SOBRE O TOKEN SOLTO.
    // O `buttonVariants` vendorizado carrega `aria-invalid:ring-destructive/20` e
    // `aria-invalid:border-destructive` em TODA variante — são estados de campo
    // inválido, não tratamento destructive. Um `not.toContain('destructive')` cru
    // reprovaria o recuo correto e ensinaria a próxima pessoa a afrouxar a asserção;
    // o que a §Color reserva é o preenchimento.
    const avancar = screen.getByRole('button', { name: COPY_CONFIRMAR_EXCLUSAO.avancar })
    expect(avancar.className).not.toContain('bg-destructive')
    expect(avancar.className).not.toContain('accent')

    const confirmacao = avancarParaConfirmacao()
    const confirmar = within(confirmacao).getByRole('button', {
      name: COPY_CONFIRMAR_EXCLUSAO.confirmar,
    })
    // Item 2 da lista reservada: o vermelho vive DENTRO da confirmação (Invariante 6).
    expect(confirmar.className).toContain('bg-destructive')

    const recuar = within(confirmacao).getByRole('button', {
      name: COPY_CONFIRMAR_EXCLUSAO.recuar,
    })
    expect(recuar.className).not.toContain('bg-destructive')
  })
})

describe('ConfirmarExclusaoDialog — foco, alvo tátil e a armadilha WR-09', () => {
  it('(c7) o primeiro elemento focável da confirmação é o RECUO, nunca o confirmar', () => {
    abrir()
    const confirmacao = avancarParaConfirmacao()

    // Um `Enter` reflexo não pode confirmar uma exclusão. A ordem é de DOM, que é o
    // que o Radix e o teclado seguem — não a ordem visual do `flex-col-reverse`.
    const focaveis = Array.from(
      confirmacao.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((no) => !no.hasAttribute('disabled'))

    expect(focaveis.length).toBeGreaterThan(0)
    expect((focaveis[0].textContent ?? '').trim()).toBe(COPY_CONFIRMAR_EXCLUSAO.recuar)
  })

  it('(c8) todo controle autorado tem alvo tátil de 44px', () => {
    abrir()
    avancarParaConfirmacao()

    const saidas = Array.from(document.body.querySelectorAll('[data-saida]'))
    expect(saidas).toHaveLength(4)
    for (const no of saidas) {
      expect(
        no.className.includes('min-h-[44px]'),
        `controle sem alvo tátil de 44px: "${no.textContent}"`,
      ).toBe(true)
    }
  })

  it('(c9) WR-09: no estado MÍNIMO o conteúdo da confirmação existe — nada de diálogo vazio', () => {
    // No molde (`EditarJanelaDialog:264-272`), montar o `AlertDialogContent` sob
    // condição MAIS ESTRITA que a do gatilho produziu um diálogo vazio: "sem
    // confirmação, sem erro, sem salvar". Aqui o efeito seria um titular que confirma
    // e não acontece nada, numa tela cuja premissa inteira é honestidade.
    abrir({ dataAlvo: null })

    const confirmacao = avancarParaConfirmacao()
    expect(
      within(confirmacao).getByRole('button', { name: COPY_CONFIRMAR_EXCLUSAO.confirmar }),
    ).toBeInTheDocument()
    expect(
      within(confirmacao).getByRole('button', { name: COPY_CONFIRMAR_EXCLUSAO.recuar }),
    ).toBeInTheDocument()
    expect((confirmacao.textContent ?? '').trim().length).toBeGreaterThan(0)
  })
})

describe('ConfirmarExclusaoDialog — as quatro saídas fazem coisas diferentes', () => {
  it('(c10) abrir a confirmação NÃO chama a mutação — só o confirmar chama', () => {
    abrir()
    const confirmacao = avancarParaConfirmacao()
    expect(onConfirmar).not.toHaveBeenCalled()

    fireEvent.click(
      within(confirmacao).getByRole('button', { name: COPY_CONFIRMAR_EXCLUSAO.confirmar }),
    )
    expect(onConfirmar).toHaveBeenCalledTimes(1)
  })

  it('(c11) o recuo curto volta um passo e NÃO fecha o diálogo inteiro', () => {
    abrir()
    const confirmacao = avancarParaConfirmacao()
    fireEvent.click(
      within(confirmacao).getByRole('button', { name: COPY_CONFIRMAR_EXCLUSAO.recuar }),
    )

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onConfirmar).not.toHaveBeenCalled()
    // O corpo de leitura continua lá — o recuo curto devolve à leitura, não à página.
    expect(screen.getByText(COPY_CONFIRMAR_EXCLUSAO.titulo)).toBeInTheDocument()
  })

  it('(c12) o recuo largo abandona a leitura inteira e não apaga nada', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: COPY_CONFIRMAR_EXCLUSAO.fechar }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirmar).not.toHaveBeenCalled()
  })

  it('(c13) fechado, o diálogo não renderiza nada — o corpo destrutivo não existe na página', () => {
    const { container } = render(
      <ConfirmarExclusaoDialog
        open={false}
        onOpenChange={onOpenChange}
        dataAlvo={DATA_ALVO}
        onConfirmar={onConfirmar}
      />,
    )
    expect(container.textContent).toBe('')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
