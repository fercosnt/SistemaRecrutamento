/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 47 / Plano 47-06 Task 2 — os DOIS blocos derivados de `/privacidade` (TRANSP-02).
 *
 * Um vem do artefato gerado da matriz de retenção (plano 47-01, sob `check:matriz-retencao`);
 * o outro vem do recibo de exclusão que a Phase 45 já gera (sob `check:recibo-exclusao`).
 * Nenhum dos dois é redigido à mão, e é isso que os torna honestos: uma página escrita à mão
 * diverge da política na primeira mudança de janela.
 *
 * ── AS TRÊS ASSERÇÕES QUE NÃO PODEM FALTAR ──────────────────────────────────
 * (i) NÃO-AGRUPAMENTO — a contagem de fichas é igual à contagem de estados do artefato
 * MESMO quando todas as janelas são iguais. Hoje elas quase são, e a tentação de renderizar
 * "todos os estados: 24 meses" é forte. No dia em que um administrador encurtar uma janela,
 * a forma agrupada esconderia a divergência exatamente onde ela importa.
 * (ii) LISTA VAZIA LANÇA — uma página de retenção vazia seria a declaração pública de que a
 * empresa não guarda nada.
 * (iii) AS TRÊS COLUNAS ADMINISTRATIVAS não aparecem no DOM. Uma delas é nome de quem
 * administra: publicá-la trocaria transparência sobre o candidato por exposição de um
 * funcionário.
 *
 * Zero `toMatchSnapshot()`: um snapshot passaria numa página que ficou falsa sem mudar de
 * forma, que é o único modo de falha que importa aqui.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§Bloco 1 · §Bloco 2)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'

import { RECIBO_EXCLUSAO } from '@/features/privacidade/constants/reciboExclusao.generated'

import { MatrizRetencaoPublica } from '../components/MatrizRetencaoPublica'
import { RetencaoIndeterminadaLista } from '../components/RetencaoIndeterminadaLista'
import { PrivacidadePublicaPage, type FichaRetencao } from '../components/PrivacidadePublicaPage'
import { COPY_TRANSPARENCIA } from '../constants/copyTransparencia'
import { MATRIZ_RETENCAO } from '../constants/matrizRetencao.generated'

const COPY = COPY_TRANSPARENCIA.privacidade
const RAIZ = resolve(__dirname, '../../../..')

const ETAPAS: readonly FichaRetencao[] = MATRIZ_RETENCAO.etapas
const MANTEM = RECIBO_EXCLUSAO.colunas_mantem

const fichasMatriz = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-ficha="retencao"]'))
const itensQueFicam = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-item="fica"]'))

/**
 * As quatro palavras proibidas para o prazo sem fim, montadas por junção de fragmentos —
 * assim este arquivo, que mora DENTRO do escopo varrido pelo portão de copy da feature,
 * não contém contígua nenhuma das strings que ele existe para reprovar.
 *
 * Elas descrevem um dado que continuaria sendo SOBRE a pessoa, e para sempre — que é
 * precisamente o que não acontece: o vínculo é cortado e o que sobrevive é a prova de
 * não-discriminação.
 */
const PROIBIDAS_PRAZO_SEM_FIM = [
  ['para ', 'sem', 'pre'],
  ['indefinida', 'mente'],
  ['perma', 'nente', 'mente'],
  ['indefi', 'nido'],
].map((partes) => partes.join(''))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('bloco 1 — os prazos, derivados do artefato gerado', () => {
  it('(1) renderiza UMA ficha por estado do artefato, na ordem do funil', () => {
    render(<MatrizRetencaoPublica />)
    const fichas = fichasMatriz()
    expect(fichas).toHaveLength(ETAPAS.length)
    expect(fichas.map((no) => no.querySelector('h3')?.textContent)).toEqual(
      ETAPAS.map((e) => e.rotulo),
    )
  })

  it('(2) NÃO agrupa estados de mesma janela — provado com fixture de janelas idênticas', () => {
    const iguais: readonly FichaRetencao[] = ETAPAS.map((e) => ({ ...e, janela_meses: 24 }))
    render(<MatrizRetencaoPublica etapas={iguais} />)

    expect(fichasMatriz()).toHaveLength(iguais.length)
    expect(new Set(iguais.map((e) => e.janela_meses)).size).toBe(1)
    for (const etapa of iguais) {
      expect(screen.getByRole('heading', { level: 3, name: etapa.rotulo })).toBeInTheDocument()
    }
    expect(screen.getAllByText(COPY.matriz.prazo(24))).toHaveLength(iguais.length)
  })

  it('(3) cada ficha traz cabeçalho real, o prazo e a finalidade com a base legal AO LADO', () => {
    render(<MatrizRetencaoPublica />)
    for (const etapa of ETAPAS) {
      const ficha = fichasMatriz().find((no) =>
        within(no).queryByRole('heading', { name: etapa.rotulo }),
      )
      expect(ficha, `ficha de ${etapa.rotulo}`).toBeTruthy()
      const dentro = within(ficha as HTMLElement)
      expect(dentro.getByText(COPY.matriz.prazo(etapa.janela_meses))).toBeInTheDocument()
      expect(dentro.getByText(etapa.finalidade)).toBeInTheDocument()
      expect(dentro.getByText(etapa.base_legal)).toBeInTheDocument()
      expect(dentro.getByText(COPY.matriz.rotulos.prazo).tagName.toLowerCase()).toBe('dt')
      expect(dentro.getByText(COPY.matriz.rotulos.motivo).tagName.toLowerCase()).toBe('dt')
    }
  })

  it('(4) o prazo é INTEIRO PURO na unidade da fonte — nunca convertido, nunca abreviado', () => {
    render(<MatrizRetencaoPublica />)
    for (const etapa of ETAPAS) {
      const valor = COPY.matriz.prazo(etapa.janela_meses)
      expect(valor).toMatch(new RegExp(`^${etapa.janela_meses} meses\\b`))
      expect(valor).not.toMatch(/\d+\s*m\b/)
      expect(valor).not.toMatch(/anos?/i)
    }
    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/\d+\s*anos?\b/i)
  })

  it('(5) a lista é SEMÂNTICA e não usa elemento de tabela', () => {
    const { container } = render(<MatrizRetencaoPublica />)
    expect(container.querySelector('table')).toBeNull()
    expect(container.querySelectorAll('ul')).toHaveLength(1)
    expect(container.querySelectorAll('li')).toHaveLength(ETAPAS.length)
    expect(container.querySelectorAll('dl')).toHaveLength(ETAPAS.length)
    for (const ficha of fichasMatriz()) {
      expect(ficha.tagName.toLowerCase()).toBe('li')
      expect(within(ficha).getAllByRole('definition')).toHaveLength(2)
    }
  })

  it('(6) duas colunas acima do ponto de quebra, empilhadas abaixo, com os rótulos nos DOIS casos', () => {
    const { container } = render(<MatrizRetencaoPublica />)
    const lista = container.querySelector('ul') as HTMLElement
    expect(lista.className).toContain('sm:grid-cols-2')
    // O empilhamento abaixo do ponto de quebra é a ausência de coluna fixa: nada de
    // `grid-cols-2` sem prefixo, que valeria também em tela estreita.
    expect(lista.className).not.toMatch(/(^|\s)grid-cols-2/)
    // Cada ficha carrega os PRÓPRIOS rótulos — é isso que preserva o pareamento entre
    // campo e valor quando a grade vira coluna única.
    expect(screen.getAllByText(COPY.matriz.rotulos.prazo)).toHaveLength(ETAPAS.length)
    expect(screen.getAllByText(COPY.matriz.rotulos.motivo)).toHaveLength(ETAPAS.length)
    expect(container.innerHTML).not.toContain('truncate')
    expect(container.innerHTML).not.toContain('line-clamp')
    expect(container.querySelector('[title]')).toBeNull()
  })

  it('(7) uma lista VAZIA lança — página de retenção vazia é falha de geração', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<MatrizRetencaoPublica etapas={[]} />)).toThrow()
  })

  it('(8) as três colunas administrativas não aparecem no DOM nem no arquivo', () => {
    const { container } = render(<MatrizRetencaoPublica />)
    const texto = (container.textContent ?? '').toLowerCase()
    for (const coluna of ['origem', 'alterado', 'atualizado em', 'seed', 'admin']) {
      expect(texto.includes(coluna), `coluna administrativa projetada: ${coluna}`).toBe(false)
    }

    const fonte = readFileSync(
      join(RAIZ, 'src/features/transparencia/components/MatrizRetencaoPublica.tsx'),
      'utf8',
    )
    const semComentario = fonte
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((linha) => !/^\s*\/\//.test(linha))
      .join('\n')
    for (const coluna of ['origem', 'alterado_por', 'atualizado_em']) {
      expect(
        new RegExp(`\\b${coluna}\\b`).test(semComentario),
        `coluna administrativa no código: ${coluna}`,
      ).toBe(false)
    }
  })

  it('(9) uma janela sem número é falha de GERAÇÃO — o bloco lança em vez de renderizar', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const semJanela = [{ ...ETAPAS[0], janela_meses: 0 }] as readonly FichaRetencao[]
    expect(() => render(<MatrizRetencaoPublica etapas={semJanela} />)).toThrow()
  })

  it('(10) NENHUM prazo sem fim aparece no bloco de prazos', () => {
    const { container } = render(<MatrizRetencaoPublica />)
    const texto = (container.textContent ?? '').toLowerCase()
    expect(texto).not.toContain('indetermin')
    for (const proibida of PROIBIDAS_PRAZO_SEM_FIM) {
      expect(texto.includes(proibida), `palavra proibida no bloco de prazos: ${proibida}`).toBe(
        false,
      )
    }
  })
})

describe('bloco 2 — o que fica, derivado do recibo já gerado', () => {
  it('(11) renderiza UM item por entrada do recibo, com o rótulo e a base legal do recibo', () => {
    render(<RetencaoIndeterminadaLista />)
    const itens = itensQueFicam()
    expect(itens).toHaveLength(MANTEM.length)
    for (const item of MANTEM) {
      const no = itens.find((candidato) =>
        within(candidato).queryByRole('heading', { name: item.rotulo }),
      )
      expect(no, `item ${item.item_id}`).toBeTruthy()
      const dentro = within(no as HTMLElement)
      expect(dentro.getByText(item.base_legal)).toBeInTheDocument()
    }
  })

  it('(12) a expressão contratada aparece INTEIRA em cada item', () => {
    render(<RetencaoIndeterminadaLista />)
    expect(screen.getAllByText(COPY.fica.prazoIndeterminado)).toHaveLength(MANTEM.length)
    // A segunda metade da frase é o que transforma um fato assustador num fato protetivo.
    expect(COPY.fica.prazoIndeterminado).toContain('sem ligação com você')
  })

  it('(13) nenhuma das quatro palavras proibidas para o prazo sem fim aparece', () => {
    const { container } = render(<RetencaoIndeterminadaLista />)
    const texto = (container.textContent ?? '').toLowerCase()
    for (const proibida of PROIBIDAS_PRAZO_SEM_FIM) {
      expect(texto.includes(proibida), `palavra proibida no bloco do que fica: ${proibida}`).toBe(
        false,
      )
    }
  })

  it('(14) o bloco é DERIVADO do recibo — o texto não é redigido de novo neste arquivo', () => {
    const fonte = readFileSync(
      join(RAIZ, 'src/features/transparencia/components/RetencaoIndeterminadaLista.tsx'),
      'utf8',
    )
    expect(fonte).toMatch(/RECIBO_EXCLUSAO|reciboExclusao/)
    for (const item of MANTEM) {
      expect(fonte, `rótulo redigido de novo: ${item.item_id}`).not.toContain(item.rotulo)
    }
  })

  it('(15) a lista é semântica, sem tabela e sem conteúdo atrás de clique', () => {
    const { container } = render(<RetencaoIndeterminadaLista />)
    expect(container.querySelector('table')).toBeNull()
    expect(container.querySelector('details')).toBeNull()
    expect(container.querySelectorAll('li')).toHaveLength(MANTEM.length)
    for (const item of itensQueFicam()) {
      expect(item.tagName.toLowerCase()).toBe('li')
      expect(within(item).getAllByRole('definition')).toHaveLength(2)
    }
  })

  it('(16) uma lista vazia lança', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<RetencaoIndeterminadaLista itens={[]} />)).toThrow()
  })
})

describe('a página compõe os dois blocos derivados', () => {
  it('(17) `/privacidade` renderiza as fichas da matriz e os itens do que fica', () => {
    render(
      <MemoryRouter>
        <PrivacidadePublicaPage />
      </MemoryRouter>,
    )
    expect(fichasMatriz()).toHaveLength(ETAPAS.length)
    expect(itensQueFicam()).toHaveLength(MANTEM.length)
  })

  it('(18) o prazo sem fim vive SÓ no bloco do que fica, nunca no bloco de prazos', () => {
    const { container } = render(
      <MemoryRouter>
        <PrivacidadePublicaPage />
      </MemoryRouter>,
    )
    expect(container.textContent).toContain(COPY.fica.prazoIndeterminado)
    for (const ficha of fichasMatriz()) {
      expect((ficha.textContent ?? '').toLowerCase()).not.toContain('indetermin')
    }
  })
})
