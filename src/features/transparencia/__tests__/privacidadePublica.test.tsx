/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 47 / Plano 47-06 Task 1 — `/privacidade`: a página pública que responde o que é
 * guardado, por quanto tempo e por quê (TRANSP-02).
 *
 * ── POR QUE NENHUM `toMatchSnapshot()` APARECE AQUI ─────────────────────────
 * Um snapshot passaria numa página que ficou FALSA sem mudar de texto — que é o único modo
 * de falha que importa nesta superfície. As asserções abaixo são sobre propriedades: a
 * origem do carimbo, o piso de alvo tátil, a ausência de estado assíncrono e a falha alta.
 *
 * ── AS TRÊS QUE SÃO INVISÍVEIS NUM TESTE DE TEXTO ───────────────────────────
 * (i) um artefato sem data de medição faz a página LANÇAR — data ausente no carimbo é
 * falha de geração, nunca estado de tela;
 * (ii) o endereço do canal humano renderizado é IDÊNTICO ao da constante canônica — a
 * comparação é com a constante, jamais com um literal copiado para cá;
 * (iii) a página autenticada de privacidade continua com os títulos dela — as duas rotas
 * têm nome quase igual e assuntos diferentes, e confundi-las é o defeito previsto.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§`/privacidade`)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'

import { ENCARREGADO_EMAIL } from '@/features/privacidade/constants/encarregado'

import {
  PrivacidadePublicaPage,
  type MatrizPublicada,
} from '../components/PrivacidadePublicaPage'
import { COPY_TRANSPARENCIA, formatarDataPtBr } from '../constants/copyTransparencia'
import { MATRIZ_RETENCAO } from '../constants/matrizRetencao.generated'

const COPY = COPY_TRANSPARENCIA.privacidade
const RAIZ = resolve(__dirname, '../../../..')

const FONTE_PAGINA = readFileSync(
  join(RAIZ, 'src/features/transparencia/components/PrivacidadePublicaPage.tsx'),
  'utf8',
)

function renderizar(props: { matriz?: MatrizPublicada } = {}) {
  return render(
    <MemoryRouter>
      <PrivacidadePublicaPage {...props} />
    </MemoryRouter>,
  )
}

/** O painel de conteúdo — a shell pinta um gradiente com pulso em toda página do projeto. */
const painel = () => screen.getByRole('heading', { level: 1 }).parentElement as HTMLElement

const carimboEsperado = `${COPY.carimboPrefixo} ${formatarDataPtBr(MATRIZ_RETENCAO.meta.medido_em)}.`

/** Os cinco blocos, na ordem da especificação. */
const TITULOS_NA_ORDEM = [
  COPY.matriz.titulo,
  COPY.fica.titulo,
  COPY.compartilhamos.titulo,
  COPY.direitos.titulo,
  COPY.comoEFeita.titulo,
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('a página lê-se inteira, sem clique e sem espera', () => {
  it('(1) renderiza o título, o subtítulo e o carimbo de vigência com data válida', () => {
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: COPY.h1 })).toBeInTheDocument()
    expect(screen.getByText(COPY.subtitulo)).toBeInTheDocument()
    expect(screen.getByText(carimboEsperado)).toBeInTheDocument()
    expect(carimboEsperado).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('(2) a data do carimbo é a da MEDIÇÃO da matriz viva, não a data do build nem a de hoje', () => {
    renderizar()
    const carimbo = screen.getByText(carimboEsperado)

    // A data de geração do artefato existe e é OUTRA coisa: publicá-la seria dizer
    // "quando o arquivo foi escrito" onde a pergunta é "quando isto era verdade".
    expect(MATRIZ_RETENCAO.meta.medido_em).not.toBe(MATRIZ_RETENCAO.meta.gerado_em)
    expect(carimbo.textContent).toContain(formatarDataPtBr(MATRIZ_RETENCAO.meta.medido_em))
    expect(carimbo.textContent).not.toContain(MATRIZ_RETENCAO.meta.gerado_em.slice(0, 10))

    const hoje = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    if (formatarDataPtBr(MATRIZ_RETENCAO.meta.medido_em) !== hoje) {
      expect(carimbo.textContent).not.toContain(hoje)
    }
  })

  it('(3) o carimbo fica logo abaixo do subtítulo e no tamanho de RÓTULO, nunca em letra miúda', () => {
    renderizar()
    const subtitulo = screen.getByText(COPY.subtitulo)
    const carimbo = screen.getByText(carimboEsperado)

    expect(subtitulo.nextElementSibling).toBe(carimbo)
    expect(carimbo.className).toContain('text-sm')
    expect(carimbo.className).toContain('font-semibold')
    // 12px é o quinto tamanho que este contrato de tipografia recusa, e é exatamente o
    // tamanho em que um carimbo de vigência vira burocracia que ninguém lê.
    expect(carimbo.className).not.toContain('text-xs')
  })

  it('(4) as cinco seções aparecem na ordem da especificação, cada uma com cabeçalho real', () => {
    const { container } = renderizar()
    const titulos = Array.from(container.querySelectorAll('h2')).map((no) => no.textContent)
    expect(titulos).toEqual(TITULOS_NA_ORDEM)
    expect(container.querySelectorAll('section')).toHaveLength(5)
  })

  it('(5) o bloco de direitos nomeia o canal humano com a constante CANÔNICA', () => {
    const { container } = renderizar()
    expect(screen.getByText(COPY.direitos.corpo)).toBeInTheDocument()

    const canal = container.querySelector('[data-canal="encarregado"]')
    expect(canal, 'o canal humano é a única saída de quem perdeu o acesso à conta').toBeTruthy()
    // A comparação é com a CONSTANTE. Um literal copiado para cá provaria apenas que duas
    // cópias combinam entre si, que é o defeito, não a garantia.
    expect(canal?.textContent).toBe(ENCARREGADO_EMAIL)
  })

  it('(6) o bloco que explica como a página é feita existe e NÃO afirma atualização sozinha', () => {
    renderizar()
    expect(screen.getByRole('heading', { level: 2, name: COPY.comoEFeita.titulo })).toBeInTheDocument()
    expect(screen.getByText(COPY.comoEFeita.corpo)).toBeInTheDocument()

    const texto = painel().textContent ?? ''
    for (const proibida of [/automaticamente/i, /autom[áa]tic/i, /sozinh/i, /por conta pr[óo]pria/i]) {
      expect(proibida.test(texto), `a página não promete regeneração: ${proibida}`).toBe(false)
    }
  })

  it('(7) nenhuma tabela, nada atrás de clique, nenhum estado de carregamento ou de erro', () => {
    const { container } = renderizar()
    expect(container.querySelector('table')).toBeNull()
    expect(container.querySelector('details')).toBeNull()
    expect(container.querySelector('summary')).toBeNull()
    expect(container.querySelector('[role="tablist"]')).toBeNull()
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.querySelector('[role="status"]')).toBeNull()
    expect(painel().querySelector('.animate-pulse')).toBeNull()
    expect(painel().querySelector('[aria-busy="true"]')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('form')).toBeNull()
    expect(container.innerHTML).not.toContain('truncate')
    expect(container.innerHTML).not.toContain('line-clamp')
    expect(container.querySelector('[title]')).toBeNull()
  })

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

  it('(9) o link cruzado aponta para a outra página pública, e o ponteiro aponta para a autenticada', () => {
    renderizar()
    expect(screen.getByRole('link', { name: COPY.compartilhamos.link })).toHaveAttribute(
      'href',
      '/subprocessadores',
    )
    expect(screen.getByRole('link', { name: COPY.direitos.linkAutenticada })).toHaveAttribute(
      'href',
      '/candidato/privacidade',
    )
  })

  it('(10) o arquivo da página não tem hook de dado, estado local nem leitura de banco', () => {
    for (const proibido of [
      /useQuery/,
      /useMutation/,
      /useState/,
      /useEffect/,
      /supabase\./,
      /AsyncState/,
    ]) {
      expect(proibido.test(FONTE_PAGINA), `padrão proibido no arquivo: ${proibido}`).toBe(false)
    }
  })
})

describe('o carimbo é falha de GERAÇÃO, nunca meia-verdade de tela', () => {
  function comMedicao(medido_em: string): MatrizPublicada {
    return { etapas: MATRIZ_RETENCAO.etapas, meta: { medido_em } }
  }

  it('(11) um artefato SEM data de medição faz a página lançar', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderizar({ matriz: comMedicao('') })).toThrow()
  })

  it('(12) um artefato com data INVÁLIDA faz a página lançar', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderizar({ matriz: comMedicao('nao-e-uma-data') })).toThrow()
  })
})

describe('a colisão com a página autenticada — duas rotas de nome quase igual', () => {
  const FONTE_AUTENTICADA = readFileSync(
    join(RAIZ, 'src/features/privacidade/components/PrivacidadeCandidatoPage.tsx'),
    'utf8',
  )

  it('(13) o título desta página NÃO é o título da seção da página autenticada', () => {
    expect(FONTE_AUTENTICADA).toContain("secao2: 'O que guardamos e por quê',")
    expect(COPY.h1).not.toBe('O que guardamos e por quê')
    expect(COPY.h1).not.toBe('Seus dados e autorizações')
  })

  it('(14) os títulos da página autenticada continuam byte-idênticos — esta fase não a edita', () => {
    for (const linha of [
      "h1: 'Seus dados e autorizações',",
      "secao1: 'Suas autorizações',",
      "secao2: 'O que guardamos e por quê',",
      "secao3: 'Pedir uma cópia dos seus dados',",
      "secao4: 'Apagar meus dados',",
    ]) {
      expect(FONTE_AUTENTICADA, `copy da página autenticada alterada: ${linha}`).toContain(linha)
    }
  })

  it('(15) a página pública NÃO repete os controles da autenticada', () => {
    const { container } = renderizar()
    const texto = painel().textContent ?? ''
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelector('[role="switch"]')).toBeNull()
    for (const controle of [/revogar/i, /apagar meus dados/i, /baixar/i, /tentar novamente/i]) {
      expect(controle.test(texto), `controle da página autenticada repetido: ${controle}`).toBe(
        false,
      )
    }
  })
})

describe('a rota é 100% pública e nenhuma rota existente foi tocada', () => {
  const rotas = readFileSync(join(RAIZ, 'src/router/routes.tsx'), 'utf8')

  it('(16) a rota está registrada na seção de rotas públicas', () => {
    const indicePublicas = rotas.indexOf('ROTAS PÚBLICAS')
    const indiceNova = rotas.indexOf("path: '/privacidade'")
    const indiceAuth = rotas.indexOf('ROTAS DE AUTENTICAÇÃO')

    expect(indiceNova).toBeGreaterThan(indicePublicas)
    expect(indiceNova).toBeLessThan(indiceAuth)
  })

  it('(17) a rota NÃO tem proteção de sessão', () => {
    const bloco = rotas.slice(rotas.indexOf("path: '/privacidade'")).slice(0, 200)
    expect(bloco).not.toContain('ProtectedRoute')
    expect(bloco).not.toContain('RoleGuard')
  })

  it('(18) as rotas que já existiam continuam registradas', () => {
    for (const rota of [
      "path: '/'",
      "path: '/vagas'",
      "path: '/vagas/:identifier'",
      "path: '/manifesto'",
      "path: '/subprocessadores'",
      "path: '/candidato/privacidade'",
    ]) {
      expect(rotas, `rota existente perdida: ${rota}`).toContain(rota)
    }
  })
})
