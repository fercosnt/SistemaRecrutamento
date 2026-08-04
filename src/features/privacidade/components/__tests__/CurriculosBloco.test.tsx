/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 44 / Plano 44-07 Task 2 — o sub-bloco **Seu currículo** (EXPORT-03).
 *
 * A asserção que faz esta suíte valer mais que a média é a **(am)**, e ela olha para
 * as linhas que NÃO falharam. O análogo de mecanismo (`CvButton`) é um botão solto
 * com estado escalar; aqui é uma LISTA, e uma cópia cega daquele estado produziria
 * erro GLOBAL — uma vaga que falha derrubando as outras. Nenhum teste textual pegaria
 * isso: a copy de erro estaria correta, no lugar certo, dizendo a coisa certa sobre a
 * linha errada. Por isso a asserção load-bearing é sobre as **outras** linhas.
 *
 * A (ap) é a outra: depois de um clique bem-sucedido, a URL assinada não pode ter
 * ficado em atributo nenhum do documento (Invariante 4). Ela atravessa o componente
 * dentro de um gesto e morre; só flags booleanas por linha vivem em estado.
 *
 * ⚠ Os literais proibidos são montados em runtime (idioma 42-11): um arquivo que
 * proíbe uma string e a contém verbatim é sua própria primeira violação.
 *
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§Sub-bloco "Seu currículo")
 * @see src/features/hub-candidato/components/CvButton.tsx (o MECANISMO, não a fonte)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

const mocks = vi.hoisted(() => ({ mintar: vi.fn() }))

vi.mock('../../services/exportacaoService', async () => {
  const real =
    await vi.importActual<typeof import('../../services/exportacaoService')>(
      '../../services/exportacaoService',
    )
  return { ...real, mintarUrlCurriculoProprio: mocks.mintar }
})

import { CurriculosBloco, COPY_CURRICULOS } from '../CurriculosBloco'
import type { LinhaCurriculo } from '../../services/exportacaoService'

const LINHAS: LinhaCurriculo[] = [
  {
    id: 'cndt-1',
    caminho: 'uid-1/cv-a.pdf',
    enviadoEm: '2026-07-01T12:00:00.000Z',
    vagaTitulo: 'Dentista Clínico Geral para a unidade da Zona Sul, período integral',
  },
  {
    id: 'cndt-2',
    caminho: 'uid-1/cv-b.pdf',
    enviadoEm: '2026-06-01T12:00:00.000Z',
    vagaTitulo: 'Auxiliar de Saúde Bucal',
  },
  {
    id: 'cndt-3',
    caminho: 'uid-1/cv-c.pdf',
    enviadoEm: '2026-05-01T12:00:00.000Z',
    vagaTitulo: 'Recepcionista',
  },
]

/** Os botões de ação do bloco, na ordem do DOM — uma por linha. */
function acoes(): HTMLButtonElement[] {
  return screen.getAllByRole('button', {
    name: new RegExp(`${COPY_CURRICULOS.acao}|${COPY_CURRICULOS.acaoEmVoo}`),
  })
}

/** O `window.open` dublado, devolvendo uma aba controlável (ou `null`). */
function dublarAba(abaNula = false) {
  const aba = { location: { href: '' }, opener: {} as unknown, close: vi.fn() }
  const open = vi
    .spyOn(window, 'open')
    .mockImplementation(() => (abaNula ? null : (aba as unknown as Window)))
  return { aba, open }
}

beforeEach(() => {
  mocks.mintar.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CurriculosBloco · render', () => {
  it('(ah) populated: uma linha por currículo, com min-h-[44px] e o par truncate+tooltip', () => {
    const { container } = render(<CurriculosBloco linhas={LINHAS} />)

    const botoes = acoes()
    expect(botoes).toHaveLength(3)
    for (const botao of botoes) {
      expect(botao.className).toContain('min-h-[44px]')
    }

    // O par é OBRIGATÓRIO: `truncate` sozinho apaga informação sem oferecer como
    // recuperá-la, e o valor íntegro no tooltip é a única forma de recuperá-la.
    const titulo = container.querySelector<HTMLElement>('[data-titulo-vaga]')
    expect(titulo).not.toBeNull()
    expect(titulo?.className).toContain('truncate')
    expect(titulo?.getAttribute('title')).toBe(LINHAS[0].vagaTitulo)
  })

  it('(ai) partial: vaga sem título vira "Vaga não identificada" e a LINHA continua existindo', () => {
    const { container } = render(
      <CurriculosBloco linhas={[{ ...LINHAS[0], vagaTitulo: null }, LINHAS[1]]} />,
    )

    // A asserção CONTA as linhas. Uma puramente textual passaria numa implementação
    // que omitisse a linha e escrevesse o rótulo em outro lugar — e omitir esconderia
    // do titular um arquivo que a empresa de fato guarda.
    expect(container.querySelectorAll('[data-linha-curriculo]')).toHaveLength(2)
    expect(acoes()).toHaveLength(2)
    expect(screen.getByText(COPY_CURRICULOS.vagaSemTitulo)).toBeInTheDocument()

    // E nunca um UUID no lugar da identidade humana da vaga.
    const linha = container.querySelectorAll('[data-linha-curriculo]')[0]
    expect(linha.textContent).not.toContain('cndt-1')
  })

  it('(aj) empty: lista vazia ⇒ o componente devolve NULO (nem container, nem título)', () => {
    const { container } = render(<CurriculosBloco linhas={[]} />)
    expect(container.querySelector('[data-bloco="curriculos"]')).toBeNull()
    expect(screen.queryByText(COPY_CURRICULOS.titulo)).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })

  it('(ak) zero-one-many: uma linha e três linhas percorrem o mesmo caminho de render', () => {
    const uma = render(<CurriculosBloco linhas={[LINHAS[0]]} />)
    const corpoUma = uma.container.querySelector('[data-corpo-bloco]')?.textContent
    expect(uma.container.querySelectorAll('[data-linha-curriculo]')).toHaveLength(1)
    uma.unmount()

    const tres = render(<CurriculosBloco linhas={LINHAS} />)
    const corpoTres = tres.container.querySelector('[data-corpo-bloco]')?.textContent
    expect(tres.container.querySelectorAll('[data-linha-curriculo]')).toHaveLength(3)

    // O corpo é NEUTRO quanto ao número — não há singular/plural a errar.
    expect(corpoTres).toBe(corpoUma)
    expect(corpoTres).toBe(COPY_CURRICULOS.corpo)
  })

  it('(ah2) 320px: a linha EMPILHA e o título recebe a largura inteira, e não 4 caracteres', () => {
    const { container } = render(<CurriculosBloco linhas={LINHAS} />)

    // ⚠ Asserção ESTRUTURAL, e o jsdom é a razão: ele não calcula layout, então
    // medir pixels aqui seria medir zero. O fato medido está no docblock do
    // componente — a 320px sobram 256px úteis e o botão come ~210px; lado a lado o
    // título ficaria com ~34px, quatro caracteres. O que o teste prende é o remédio.
    const corpo = container.querySelector<HTMLElement>('[data-linha-corpo]')
    expect(corpo).not.toBeNull()
    expect(corpo!.className).toContain('flex-col')
    expect(corpo!.className).toContain('sm:flex-row')

    const titulo = container.querySelector<HTMLElement>('[data-titulo-vaga]')
    expect(titulo!.className).toContain('w-full')
    // E o par continua de pé nas duas larguras.
    expect(titulo!.className).toContain('truncate')
    expect(titulo!.getAttribute('title')).toBe(LINHAS[0].vagaTitulo)
  })

  it('(ak2) overflow: sem altura fixa e sem scroll interno — quem tem muitas rola a página', () => {
    const { container } = render(<CurriculosBloco linhas={LINHAS} />)
    const marcacao = container.innerHTML
    for (const proibida of ['overflow-y-', 'overflow-auto', 'overflow-scroll', 'max-h-']) {
      expect(marcacao).not.toContain(proibida)
    }
  })
})

describe('CurriculosBloco · a cunhagem dentro do gesto', () => {
  it('(al) o clique cunha UMA vez, com o caminho DAQUELA linha, e aponta a aba já aberta', async () => {
    const { aba, open } = dublarAba()
    mocks.mintar.mockResolvedValue('https://exemplo.test/assinada?token=abc')
    render(<CurriculosBloco linhas={LINHAS} />)

    await userEvent.click(acoes()[1])

    await waitFor(() => expect(aba.location.href).toBe('https://exemplo.test/assinada?token=abc'))
    expect(mocks.mintar).toHaveBeenCalledTimes(1)
    expect(mocks.mintar).toHaveBeenCalledWith('uid-1/cv-b.pdf')
    // A aba é aberta DENTRO do gesto (a ativação transitória não sobrevive ao await)
    // e a referência reversa é cortada.
    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(aba.opener).toBeNull()
  })

  it('(am) falha POR LINHA: a linha 2 falha e as linhas 1 e 3 seguem HABILITADAS', async () => {
    dublarAba()
    mocks.mintar.mockRejectedValue(new Error('storage caiu'))
    const { container } = render(<CurriculosBloco linhas={LINHAS} />)

    await userEvent.click(acoes()[1])

    const linhas = container.querySelectorAll('[data-linha-curriculo]')
    await waitFor(() =>
      expect(within(linhas[1] as HTMLElement).getByText(COPY_CURRICULOS.erro)).toBeInTheDocument(),
    )

    const erro = within(linhas[1] as HTMLElement).getByText(COPY_CURRICULOS.erro)
    expect(erro).toHaveAttribute('aria-live', 'polite')
    // O erro cru do transporte nunca chega à tela.
    expect(container.textContent).not.toContain('storage caiu')

    // ⚠ A ASSERÇÃO LOAD-BEARING: as OUTRAS linhas. É exatamente aqui que uma cópia
    // cega do estado escalar do `CvButton` quebraria, e é o único desvio do análogo
    // que uma asserção textual não pegaria.
    for (const indice of [0, 2]) {
      const outra = linhas[indice] as HTMLElement
      expect(within(outra).getByRole('button')).toBeEnabled()
      expect(within(outra).queryByText(COPY_CURRICULOS.erro)).not.toBeInTheDocument()
    }
  })

  it('(an) em voo POR LINHA: só o botão daquela linha desabilita, com aria-busy e copy própria', async () => {
    dublarAba()
    let liberar: (url: string) => void = () => {}
    mocks.mintar.mockReturnValue(
      new Promise<string>((resolve) => {
        liberar = resolve
      }),
    )
    const { container } = render(<CurriculosBloco linhas={LINHAS} />)

    await userEvent.click(acoes()[0])

    const linhas = container.querySelectorAll('[data-linha-curriculo]')
    const emVoo = within(linhas[0] as HTMLElement).getByRole('button')
    await waitFor(() => expect(emVoo).toBeDisabled())
    expect(emVoo).toHaveAttribute('aria-busy', 'true')
    expect(emVoo).toHaveTextContent(COPY_CURRICULOS.acaoEmVoo)

    for (const indice of [1, 2]) {
      const outra = within(linhas[indice] as HTMLElement).getByRole('button')
      expect(outra).toBeEnabled()
      expect(outra).toHaveAttribute('aria-busy', 'false')
    }

    liberar('https://exemplo.test/assinada')
    await waitFor(() => expect(emVoo).toBeEnabled())
  })

  it('(ao) popup barrado: window.open nulo produz o erro VISÍVEL daquela linha, nunca silêncio', async () => {
    dublarAba(true)
    mocks.mintar.mockResolvedValue('https://exemplo.test/assinada')
    const { container } = render(<CurriculosBloco linhas={LINHAS} />)

    await userEvent.click(acoes()[0])

    const linhas = container.querySelectorAll('[data-linha-curriculo]')
    await waitFor(() =>
      expect(within(linhas[0] as HTMLElement).getByText(COPY_CURRICULOS.erro)).toBeInTheDocument(),
    )
  })

  it('(ap) NEGATIVA: depois do clique, nenhuma substring da URL assinada ficou no documento', async () => {
    const { aba } = dublarAba()
    // Dois tokens montados em runtime — o que a busca procura não existe como
    // literal neste arquivo.
    const tokenA = ['tok', 'en-assinado-44-07'].join('')
    const tokenB = ['X-Amz-', 'Signature'].join('')
    mocks.mintar.mockResolvedValue(`https://exemplo.test/cv.pdf?${tokenB}=${tokenA}`)

    const { container } = render(<CurriculosBloco linhas={LINHAS} />)
    await userEvent.click(acoes()[0])
    await waitFor(() => expect(aba.location.href).toContain(tokenA))

    // A URL atravessou o componente e NÃO ficou: nem em texto, nem em atributo.
    expect(container.innerHTML).not.toContain(tokenA)
    expect(container.innerHTML).not.toContain(tokenB)
    expect(document.body.innerHTML).not.toContain(tokenA)
    expect(`prefixo ${tokenA} sufixo`).toContain(tokenA) // META-TEST
  })
})
