/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 43 / Plano 43-09 — `/admin/retencao` (RETEN-01/02/04).
 *
 * Esta suíte existe porque as três afirmações mais importantes da página **não vivem na
 * tabela**, e portanto nenhuma asserção da suíte da tabela as alcança:
 *
 *  1. **Os dois banners são SEMPRE VISÍVEIS e nunca colapsáveis.** É onde a BD-1 é dita ao
 *     operador (24 meses é o teto que o candidato já leu e aceitou, não recomendação
 *     técnica) e onde o escopo honesto da fase é declarado (nada nesta página apaga dados).
 *     Um banner atrás de um "ver mais" é um banner que ninguém lê — e a 43-UI-SPEC o
 *     proíbe explicitamente (Invariante 6, precedente T-15-18 do `BiasAuditPage`).
 *  2. **A palavra `automaticamente` é OBRIGATÓRIA aqui.** O portão de copy do 43-02 a bane
 *     apenas na superfície do CANDIDATO; nesta página ela é honesta, porque afirma que
 *     NADA apaga automaticamente. A asserção abaixo prende esse recorte: se alguém
 *     alargar o portão para `src/` inteiro, esta suíte mostra qual copy ele reprovaria.
 *  3. **Nenhum controle da página carrega verbo destrutivo.** A fase é zero-destrutiva por
 *     desenho e a interface declara isso. A asserção é ESTRUTURAL (varre todo `<button>` e
 *     `<a>` da página), porque uma asserção sobre o texto visível não pegaria um botão
 *     acrescentado depois com rótulo novo.
 *
 * Os verbos proibidos são montados em runtime (idioma do 42-11): um teste que proíbe uma
 * string e a contém verbatim é auto-invalidante.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as renderRTL, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const useMatrizMock = vi.fn()

vi.mock('../../hooks/useMatrizRetencao', () => ({
  useMatrizRetencao: (...args: unknown[]) => useMatrizMock(...args),
  retencaoKeys: {
    all: ['retencao'] as const,
    matriz: () => ['retencao', 'matriz'] as const,
    previa: () => ['retencao', 'previa'] as const,
  },
}))

const usePreviaMock = vi.fn()

vi.mock('../../hooks/usePreviaRetencao', () => ({
  usePreviaRetencao: (...args: unknown[]) => usePreviaMock(...args),
}))

// A shell do RH monta sidebar + topbar + store de auth; nada disso é o objeto deste teste.
vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { RetencaoPage } from '../RetencaoPage'
import type { MatrizRetencaoRow } from '../../services/retencaoService'

const ETAPAS = [
  'inscricao',
  'triagem',
  'avaliacao_assincrona',
  'entrevista_online',
  'entrevista_presencial',
  'decisao_final',
  'aprovado',
  'rejeitado',
] as const

function matrizSemeada(): MatrizRetencaoRow[] {
  return ETAPAS.map((etapa) => ({
    etapa,
    janela_meses: 24,
    origem: 'seed',
    alterado_por_nome: null,
    atualizado_em: '2026-08-01T10:00:00Z',
  }))
}

function estado(over: Record<string, unknown> = {}) {
  return {
    data: matrizSemeada(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isRefetching: false,
    ...over,
  }
}

/**
 * A página monta o `EditarJanelaDialog`, cuja mutação de escrita chama `useQueryClient`
 * ANTES do `return null` de diálogo fechado (regra dos hooks). O provider é infraestrutura
 * do teste — nenhuma query é disparada aqui, porque o hook da matriz está mockado.
 */
function render(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderRTL(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  useMatrizMock.mockReset()
  useMatrizMock.mockReturnValue(estado())
  usePreviaMock.mockReset()
  // O estado ZERO é o que a tela mostra hoje em PROD (medido no 43-07): a matriz está
  // semeada em 24 meses e o sistema é mais novo que isso.
  usePreviaMock.mockReturnValue({
    data: { linhas: [], total: 0, calculadaEm: '2026-08-02T14:35:00' },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isRefetching: false,
  })
})

describe('RetencaoPage — cabeçalho e os dois banners sempre visíveis', () => {
  it('H1 e subtítulo verbatim, sem card próprio', () => {
    render(<RetencaoPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Retenção de dados' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Por quanto tempo os dados de uma candidatura ficam guardados, por estado. Alterável aqui, sem deploy.',
      ),
    ).toBeInTheDocument()
  })

  it('banner do seed (BD-1) visível, com o teto apresentado como CONSENTIDO', () => {
    render(<RetencaoPage />)
    const banner = screen.getByTestId('banner-seed')
    expect(banner).toBeVisible()
    expect(banner.textContent).toContain(
      'Todos os estados nascem com 2 anos porque 2 anos é o teto que o candidato já leu e aceitou no cadastro',
    )
    expect(banner.textContent).toContain('não é uma recomendação técnica')
    expect(banner.textContent).toContain('parecer jurídico trabalhista')
  })

  it('banner de escopo visível — e ele DIZ que nada apaga automaticamente', () => {
    render(<RetencaoPage />)
    const banner = screen.getByTestId('banner-escopo')
    expect(banner).toBeVisible()
    expect(banner.textContent).toContain('Esta matriz é')
    expect(banner.textContent).toContain('configuração')
    expect(banner.textContent).toContain('Nada nesta página apaga dados')
    // O recorte da allowlist do portão de copy do 43-02, exercido: a palavra é obrigatória
    // AQUI porque aqui ela nega a exclusão em vez de prometê-la.
    expect(banner.textContent).toContain(['automatica', 'mente'].join(''))
  })

  it('nenhum dos dois banners é colapsável — sem `<details>`, sem gatilho de mostrar/ocultar', () => {
    const { container } = render(<RetencaoPage />)
    expect(container.querySelector('details')).toBeNull()
    const gatilhos = Array.from(container.querySelectorAll('button')).filter((b) =>
      /mostrar|ocultar|expandir|recolher|ver mais|fechar aviso|dispensar/i.test(
        b.textContent ?? '',
      ),
    )
    expect(gatilhos).toHaveLength(0)
    // E nenhum ancestral esconde o banner.
    for (const id of ['banner-seed', 'banner-escopo']) {
      let no: HTMLElement | null = screen.getByTestId(id)
      while (no) {
        expect(no.hasAttribute('hidden')).toBe(false)
        expect(no.getAttribute('aria-hidden')).not.toBe('true')
        no = no.parentElement
      }
    }
  })

  it('os banners vêm ACIMA da tabela — a prévia é consequência, o aviso é premissa', () => {
    const { container } = render(<RetencaoPage />)
    const seed = screen.getByTestId('banner-seed')
    const tabela = container.querySelector('table')
    expect(tabela).not.toBeNull()
    expect(
      seed.compareDocumentPosition(tabela as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('a prévia vem ABAIXO da tabela — inverter a ordem inverteria a leitura', () => {
    const { container } = render(<RetencaoPage />)
    const tabela = container.querySelector('table') as Node
    const previa = screen.getByText('Prévia — quantos seriam afetados')
    expect(
      tabela.compareDocumentPosition(previa) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('a prévia mostra ZERO hoje, e esse é o número CERTO — não um vazio nem um erro', () => {
    render(<RetencaoPage />)
    expect(
      screen.getByText('Nenhum candidato seria afetado por esta janela hoje.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Prévia calculada em/)).toBeInTheDocument()
  })
})

describe('RetencaoPage — a asserção negativa da fase zero-destrutiva', () => {
  it('nenhum controle da página carrega verbo destrutivo', () => {
    const { container } = render(<RetencaoPage />)

    // Montados em runtime — ver o aviso do cabeçalho deste arquivo.
    const VERBOS = [
      ['purg', 'ar'],
      ['apag', 'ar'],
      ['exclu', 'ir'],
      ['delet', 'ar'],
      ['limp', 'ar'],
      ['execut', 'ar'],
      ['elimin', 'ar'],
      ['remov', 'er'],
    ].map((p) => p.join(''))

    const controles = Array.from(container.querySelectorAll('button, a'))
    expect(controles.length).toBeGreaterThan(0)

    for (const controle of controles) {
      const texto = (
        (controle.textContent ?? '') +
        ' ' +
        (controle.getAttribute('aria-label') ?? '') +
        ' ' +
        (controle.getAttribute('title') ?? '')
      ).toLowerCase()
      for (const verbo of VERBOS) {
        expect(
          texto.includes(verbo),
          `Controle com verbo destrutivo "${verbo}": "${controle.textContent}"`,
        ).toBe(false)
      }
    }
  })
})
