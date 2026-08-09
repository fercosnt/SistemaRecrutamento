/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 47 / Plano 47-04 Task 2 — `/subprocessadores`: a página pública que responde
 * com quem os dados são compartilhados (TRANSP-01 · Art. 18, VII).
 *
 * ── POR QUE NENHUM `toMatchSnapshot()` APARECE AQUI ─────────────────────────
 * Um snapshot passaria numa página que ficou FALSA sem mudar de texto — que é o único
 * modo de falha que importa nesta superfície. As asserções abaixo são sobre propriedades
 * (alvo tátil, integridade do texto, ausência de estado assíncrono, falha alta), não
 * sobre a aparência.
 *
 * ── AS TRÊS QUE SÃO INVISÍVEIS EM TESTE DE TEXTO ────────────────────────────
 * (i) cada link acionável carrega o piso de 44px — um `<a>` de texto corrido tem cerca
 * de metade disso, e é o modo de falha mais provável desta fase inteira;
 * (ii) nome, finalidade e base legal renderizam ÍNTEGROS — truncar a base legal de uma
 * transferência internacional é apagar a justificativa que a torna legítima;
 * (iii) uma entrada com país por medir faz a renderização LANÇAR, jamais renderizar um
 * campo em branco.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§`/subprocessadores`)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'

import { SubprocessadoresPage } from '../components/SubprocessadoresPage'
import { SubprocessadorFicha } from '../components/SubprocessadorFicha'
import { COPY_TRANSPARENCIA, formatarDataPtBr } from '../constants/copyTransparencia'
import {
  LISTA_MEDIDA_EM,
  SUBPROCESSADORES,
  type Subprocessador,
} from '../constants/subprocessadores'

const COPY = COPY_TRANSPARENCIA.subprocessadores
const RAIZ = resolve(__dirname, '../../../..')

/**
 * As seis entradas reais com o único campo pendente preenchido.
 *
 * Preso à constante de propósito: uma fixture escrita à mão divergiria do conteúdo real
 * na primeira edição, e este teste passaria a provar coisa nenhuma sobre a página.
 */
const COMPLETAS: readonly Subprocessador[] = SUBPROCESSADORES.map((entrada) => ({
  ...entrada,
  pais: 'País medido na fixture',
}))

function renderizar(entradas: readonly Subprocessador[] = COMPLETAS) {
  return render(
    <MemoryRouter>
      <SubprocessadoresPage entradas={entradas} />
    </MemoryRouter>,
  )
}

const fichas = () => Array.from(document.querySelectorAll<HTMLElement>('[data-ficha="subprocessador"]'))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('a página lê-se inteira, sem clique e sem espera', () => {
  it('(1) renderiza o título, o subtítulo e o carimbo de completude com data válida', () => {
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: COPY.h1 })).toBeInTheDocument()
    expect(screen.getByText(COPY.subtitulo)).toBeInTheDocument()

    const carimbo = `${COPY.carimboPrefixo} ${formatarDataPtBr(LISTA_MEDIDA_EM)}.`
    expect(screen.getByText(carimbo)).toBeInTheDocument()
    expect(carimbo).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('(2) renderiza as SEIS fichas, cada uma com cabeçalho real e o nome da empresa', () => {
    renderizar()
    expect(fichas()).toHaveLength(6)
    for (const entrada of COMPLETAS) {
      expect(screen.getByRole('heading', { level: 3, name: entrada.nome })).toBeInTheDocument()
    }
  })

  it('(3) cada ficha traz os CINCO campos rotulados, e os rótulos aparecem uma vez por ficha', () => {
    renderizar()
    for (const rotulo of Object.values(COPY.rotulos)) {
      expect(screen.getAllByText(rotulo)).toHaveLength(6)
    }
    for (const ficha of fichas()) {
      const dentro = within(ficha)
      for (const rotulo of Object.values(COPY.rotulos)) {
        expect(dentro.getByText(rotulo).tagName.toLowerCase()).toBe('dt')
      }
    }
  })

  it('(4) o valor de cada campo renderiza dentro da ficha da própria empresa', () => {
    renderizar()
    for (const entrada of COMPLETAS) {
      const ficha = fichas().find((no) => within(no).queryByRole('heading', { name: entrada.nome }))
      expect(ficha, `ficha de ${entrada.nome}`).toBeTruthy()
      const dentro = within(ficha as HTMLElement)
      expect(dentro.getByText(entrada.recebe)).toBeInTheDocument()
      expect(dentro.getByText(entrada.finalidade)).toBeInTheDocument()
      expect(dentro.getByText(entrada.pais)).toBeInTheDocument()
      expect(dentro.getByText(entrada.baseLegal)).toBeInTheDocument()
    }
  })

  it('(5) o tratamento visual das seis é IDÊNTICO — nenhum provedor é pintado diferente', () => {
    renderizar()
    const classes = new Set(fichas().map((no) => no.className))
    expect(classes.size).toBe(1)
  })

  it('(6) nenhuma tabela, nada atrás de clique, nenhum estado de carregamento ou de erro', () => {
    const { container } = renderizar()
    expect(container.querySelector('table')).toBeNull()
    expect(container.querySelector('details')).toBeNull()
    expect(container.querySelector('summary')).toBeNull()
    expect(container.querySelector('[role="tablist"]')).toBeNull()
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.querySelector('[role="status"]')).toBeNull()

    /**
     * ⚠ O pulso é medido DENTRO do painel de conteúdo, não no documento inteiro — e a
     * distinção não é frouxidão. A shell clonada (`BackgroundImage`) pinta um gradiente
     * com pulso enquanto a imagem de fundo não carrega, em TODA página deste projeto
     * desde o M1. Uma asserção sobre o documento inteiro reprovaria a shell que a
     * UI-SPEC manda clonar — e um portão que reprova o comportamento correto treina
     * quem executa a desligá-lo. O que esta fase proíbe é esqueleto de CONTEÚDO: a
     * página não espera por dado nenhum.
     */
    const painel = screen.getByRole('heading', { level: 1 }).parentElement as HTMLElement
    expect(painel.querySelector('.animate-pulse')).toBeNull()
    expect(painel.querySelector('[aria-busy="true"]')).toBeNull()
    // Nenhum controle acionável além de links: sem formulário, sem botão.
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('form')).toBeNull()
  })

  it('(7) a lista é semântica — as fichas são itens de uma lista, e os campos são pares rótulo↔valor', () => {
    const { container } = renderizar()
    expect(container.querySelectorAll('dl').length).toBe(6)
    for (const ficha of fichas()) {
      expect(ficha.tagName.toLowerCase()).toBe('li')
      expect(within(ficha).getAllByRole('definition')).toHaveLength(4)
    }
  })
})

describe('os três modos de falha invisíveis em teste de texto', () => {
  it('(8) CADA link acionável carrega o piso de alvo tátil de 44px', () => {
    const { container } = renderizar()
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('a'))
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.className, `link "${link.textContent}" sem piso de alvo tátil`).toContain(
        'min-h-[44px]',
      )
    }
  })

  it('(9) o link cruzado aponta para a outra página pública e traz o rótulo travado', () => {
    renderizar()
    const link = screen.getByRole('link', { name: COPY.linkPrivacidade })
    expect(link).toHaveAttribute('href', '/privacidade')
  })

  it('(10) nome, finalidade e base legal renderizam ÍNTEGROS, sem truncar e sem atributo de dica', () => {
    const longa = 'LGPD, Art. 33 — '.concat('a justificativa da transferência internacional '.repeat(8)).trim()
    const entrada: Subprocessador = {
      nome: 'Uma Empresa Com Nome Comercial Bastante Longo Para O Teste',
      recebe: 'Um texto de recebimento igualmente longo '.repeat(6).trim(),
      finalidade: 'Uma finalidade descrita por extenso, sem abreviar nada '.repeat(6).trim(),
      pais: 'Um país com nome longo escrito por extenso',
      baseLegal: longa,
    }

    const { container } = render(
      <MemoryRouter>
        <SubprocessadoresPage entradas={[entrada]} />
      </MemoryRouter>,
    )

    expect(screen.getByText(entrada.baseLegal)).toBeInTheDocument()
    expect(screen.getByText(entrada.finalidade)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: entrada.nome })).toBeInTheDocument()

    expect(container.innerHTML).not.toContain('truncate')
    expect(container.innerHTML).not.toContain('line-clamp')
    // Um `title` como substituto do texto é truncamento com outro nome.
    expect(container.querySelector('[title]')).toBeNull()
  })

  it('(11) uma entrada com país por medir faz a página LANÇAR, nunca renderizar campo em branco', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <MemoryRouter>
          <SubprocessadoresPage />
        </MemoryRouter>,
      ),
    ).toThrow(/sentinela/i)
  })

  it('(12) a própria ficha lança quando a entrada está incompleta — a falha alta é do componente', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const incompleta = { ...COMPLETAS[0], baseLegal: '   ' }
    expect(() =>
      render(
        <MemoryRouter>
          <ul>
            <SubprocessadorFicha entrada={incompleta} />
          </ul>
        </MemoryRouter>,
      ),
    ).toThrow(/base legal/i)
  })
})

describe('a rota é 100% pública e nenhuma rota existente foi tocada', () => {
  const rotas = readFileSync(join(RAIZ, 'src/router/routes.tsx'), 'utf8')

  it('(13) a rota está registrada na seção de rotas públicas', () => {
    expect(rotas).toContain("path: '/subprocessadores'")
    const indiceManifesto = rotas.indexOf("path: '/manifesto'")
    const indiceNova = rotas.indexOf("path: '/subprocessadores'")
    const indiceAuth = rotas.indexOf('ROTAS DE AUTENTICAÇÃO')
    expect(indiceManifesto).toBeGreaterThan(0)
    expect(indiceNova).toBeGreaterThan(indiceManifesto)
    expect(indiceNova).toBeLessThan(indiceAuth)
  })

  it('(14) a rota não carrega proteção de sessão nem redirecionamento', () => {
    const bloco = rotas.slice(
      rotas.indexOf("path: '/subprocessadores'"),
      rotas.indexOf("path: '/subprocessadores'") + 220,
    )
    expect(bloco).not.toContain('RoleGuard')
    expect(bloco).not.toContain('ProtectedRoute')
    expect(bloco).not.toContain('Navigate')
  })

  it('(15) as rotas públicas que já existiam continuam lá', () => {
    for (const caminho of ["path: '/'", "path: '/vagas'", "path: '/vagas/:identifier'", "path: '/manifesto'"]) {
      expect(rotas).toContain(caminho)
    }
  })
})
