/**
 * 49-44 / WR-07 — o RH lê, sob demanda, o texto que o candidato gravou na resposta do caso
 * aberto da SJT. Fechado, nada é buscado; o clique busca e mostra o texto; cada situação da RPC
 * tem a sua frase; o erro oferece nova tentativa; ocultar desmonta o texto; nada é desabilitado.
 *
 * PATTERNS §N: asserimos a constante exportada E o render que de fato monta.
 *
 * @see src/features/decisao/components/RespostaCasoAbertoSjt.tsx
 */
import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/features/avaliacao/services/scoresRhService', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/features/avaliacao/services/scoresRhService')>()
  return { ...real, getRespostaCasoAbertoSjt: vi.fn() }
})

import {
  COPY_RESPOSTA_CASO_ABERTO,
  RespostaCasoAbertoConteudo,
  RespostaCasoAbertoSjt,
} from '../RespostaCasoAbertoSjt'
import { getRespostaCasoAbertoSjt } from '@/features/avaliacao/services/scoresRhService'

// Lido sob demanda (não no escopo do describe): antes da implementação a constante não existe, e o
// teste tem de reprovar na ASSERÇÃO, não na coleta do arquivo.
const COPY = new Proxy({} as typeof COPY_RESPOSTA_CASO_ABERTO, {
  get: (_alvo, chave: string) => (COPY_RESPOSTA_CASO_ABERTO as Record<string, string> | undefined)?.[chave],
})
const TEXTO = 'Primeiro eu ouviria a paciente.\nDepois explicaria o protocolo de biossegurança.'

function renderComQuery() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <RespostaCasoAbertoSjt candidaturaId="cand-1" />
    </QueryClientProvider>,
  )
}

function nadaDesabilitado() {
  expect(document.querySelectorAll('[disabled], [aria-disabled="true"]')).toHaveLength(0)
}

async function abrir() {
  const user = userEvent.setup()
  renderComQuery()
  await user.click(screen.getByRole('button', { name: COPY.botaoAbrir }))
  return user
}

describe('RespostaCasoAbertoSjt — cópia exportada (49-44)', () => {
  it('as nove frases pt-BR', () => {
    expect(COPY_RESPOSTA_CASO_ABERTO).toEqual({
      botaoAbrir: 'Ler a resposta do caso aberto',
      botaoOcultar: 'Ocultar a resposta',
      titulo: 'Resposta do candidato ao caso aberto',
      carregando: 'Carregando a resposta…',
      removida: 'O texto desta resposta não está mais disponível.',
      indisponivel: 'O texto desta resposta não está disponível.',
      semRespostaEnviada: 'Não há resposta enviada ao caso aberto.',
      erro: 'Não foi possível carregar a resposta.',
      tentarDeNovo: 'Tentar de novo',
    })
  })

  it('nenhuma frase nomeia mecanismo de IA nem afirma que o texto é o avaliado/analisado', () => {
    expect(COPY_RESPOSTA_CASO_ABERTO).toBeDefined()
    for (const frase of Object.values(COPY_RESPOSTA_CASO_ABERTO ?? {})) {
      expect(frase).not.toMatch(/\bIA\b|intelig[eê]ncia|modelo|analisad|avaliad/i)
    }
  })

  it('a frase de `removida` não atribui causa: o marcador sai do motor no direito do titular E na purga de retenção (WR-01 do REVIEW-GAPS-8)', () => {
    expect(COPY_RESPOSTA_CASO_ABERTO.removida).not.toMatch(
      /titular|pedido|solicit|exclus|purga|reten|LGPD|pol[ií]tica|apagad|removid/i,
    )
  })
})

describe('RespostaCasoAbertoSjt — leitura sob demanda (49-44 / WR-07)', () => {
  beforeEach(() => {
    vi.mocked(getRespostaCasoAbertoSjt).mockReset()
  })

  it('fechado por padrão: o serviço NÃO é chamado', () => {
    renderComQuery()
    expect(screen.getByTestId('decisao-sjt-resposta-caso-aberto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: COPY.botaoAbrir })).toHaveAttribute('aria-expanded', 'false')
    expect(getRespostaCasoAbertoSjt).not.toHaveBeenCalled()
    nadaDesabilitado()
  })

  it('carregando: anunciado com role="status", e nada desabilitado', async () => {
    vi.mocked(getRespostaCasoAbertoSjt).mockReturnValue(new Promise(() => {}))
    await abrir()
    expect(await screen.findByRole('status')).toHaveTextContent(COPY.carregando)
    nadaDesabilitado()
  })

  it('disponivel: o serviço é chamado uma vez com o id e o texto aparece com as quebras de linha', async () => {
    vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao: 'disponivel', texto: TEXTO })
    await abrir()

    const texto = await screen.findByText(/Primeiro eu ouviria a paciente\./)
    expect(texto.textContent).toBe(TEXTO)
    expect(texto.className).toContain('whitespace-pre-line')
    expect(screen.getByText(COPY.titulo)).toBeInTheDocument()
    expect(getRespostaCasoAbertoSjt).toHaveBeenCalledTimes(1)
    expect(getRespostaCasoAbertoSjt).toHaveBeenCalledWith('cand-1')

    const botao = screen.getByRole('button', { name: COPY.botaoOcultar })
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    const regiao = document.getElementById(botao.getAttribute('aria-controls') ?? '')
    expect(regiao).not.toBeNull()
    expect(regiao).toContainElement(texto)
    nadaDesabilitado()
  })

  it.each([
    ['removida', 'removida'],
    ['indisponivel', 'indisponivel'],
    ['sem_resposta_enviada', 'semRespostaEnviada'],
  ] as const)('%s → a frase própria (COPY.%s), e nada desabilitado', async (situacao, chave) => {
    const frase = COPY[chave]
    expect(frase).toEqual(expect.any(String))
    vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao, texto: null })
    await abrir()
    expect(await screen.findByText(frase)).toBeInTheDocument()
    for (const outra of [COPY.removida, COPY.indisponivel, COPY.semRespostaEnviada]) {
      if (outra !== frase) expect(screen.queryByText(outra)).toBeNull()
    }
    nadaDesabilitado()
  })

  it('erro: mostra a frase de erro, e «Tentar de novo» chama o serviço de novo', async () => {
    vi.mocked(getRespostaCasoAbertoSjt)
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValueOnce({ situacao: 'disponivel', texto: TEXTO })
    const user = await abrir()

    expect(await screen.findByText(COPY.erro)).toBeInTheDocument()
    nadaDesabilitado()
    await user.click(screen.getByRole('button', { name: COPY.tentarDeNovo }))

    expect(await screen.findByText(/Primeiro eu ouviria a paciente\./)).toBeInTheDocument()
    expect(getRespostaCasoAbertoSjt).toHaveBeenCalledTimes(2)
  })

  it('«Ocultar a resposta» desmonta o texto', async () => {
    vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao: 'disponivel', texto: TEXTO })
    const user = await abrir()
    await screen.findByText(/Primeiro eu ouviria a paciente\./)

    await user.click(screen.getByRole('button', { name: COPY.botaoOcultar }))

    expect(screen.queryByText(/Primeiro eu ouviria a paciente\./)).toBeNull()
    expect(screen.getByRole('button', { name: COPY.botaoAbrir })).toHaveAttribute('aria-expanded', 'false')
  })
})

// ── Phase 52 / plano 52-12 — a variante do hub (D-22, D-52-U08/U09) ──────────────────────────
//
// O hub monta `RespostaCasoAbertoConteudo` com `variante="hub"` e as citações da IA: ficha neutra
// em 16px, citações marcadas no texto, e — sem o texto (carregando, erro, removida, indisponível,
// sem resposta enviada) — TODAS as citações na lista lateral, nunca sumidas. A Decisão Final (sem
// `variante`) segue âmbar e em 12px (C-7 da 51).

/** Cor por classe: jsdom não computa Tailwind; a cor herdada é a do ancestral mais próximo que declara cor. */
const COR = /^text-(white|black|amber|red|green|yellow|orange|emerald|teal|cyan|sky|blue|slate|gray|zinc|neutral|stone|\[#)/

function elementosComTexto(raiz: HTMLElement): Element[] {
  return [raiz, ...Array.from(raiz.querySelectorAll('*'))].filter((el) =>
    Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''),
  )
}

/** Para cada elemento com texto próprio no ramo do hub: zero `text-amber` até o body, e a cor efetiva vem de um `text-white…` de dentro do ramo. */
function corNeutraNoRamo(raiz: HTMLElement) {
  const elementos = elementosComTexto(raiz)
  expect(elementos.length).toBeGreaterThan(0)
  for (const el of elementos) {
    let efetiva: { dono: Element; classe: string } | null = null
    for (let n: Element | null = el; n; n = n.parentElement) {
      const classes = (n.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
      expect(classes.filter((c) => c.startsWith('text-amber')), `âmbar na cadeia de «${el.textContent}»`).toEqual([])
      if (!efetiva) {
        const cor = classes.find((c) => COR.test(c))
        if (cor) efetiva = { dono: n, classe: cor }
      }
      if (n === document.body) break
    }
    expect(efetiva, `sem cor declarada para «${el.textContent}»`).not.toBeNull()
    expect(raiz.contains(efetiva!.dono), `cor de «${el.textContent}» vem de fora do ramo`).toBe(true)
    expect(efetiva!.classe).toMatch(/^text-white/)
  }
}

const CITACOES = ['ouviria a paciente', 'citação que não está no texto']

function renderHub(citacoes: string[] = CITACOES) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Conteudo = RespostaCasoAbertoConteudo as unknown as (p: {
    candidaturaId: string
    variante?: 'hub' | 'decisao'
    citacoes?: string[]
  }) => ReactElement
  return render(
    <QueryClientProvider client={client}>
      <Conteudo candidaturaId="cand-1" variante="hub" citacoes={citacoes} />
    </QueryClientProvider>,
  )
}

describe('RespostaCasoAbertoConteudo — a Decisão Final continua âmbar (52-12 / E7 iv)', () => {
  beforeEach(() => {
    vi.mocked(getRespostaCasoAbertoSjt).mockReset()
  })

  it('sem `variante`: o texto `disponivel` em text-amber-100 e text-xs, e o contêiner em text-amber-100', async () => {
    vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao: 'disponivel', texto: TEXTO })
    await abrir()
    const texto = await screen.findByText(/Primeiro eu ouviria a paciente\./)
    const classes = texto.className.split(/\s+/)
    expect(classes).toContain('text-amber-100')
    expect(classes).toContain('text-xs')
    expect(screen.getByTestId('decisao-sjt-resposta-caso-aberto').className.split(/\s+/)).toContain('text-amber-100')
    expect(screen.queryByTestId('caso-aberto-hub')).toBeNull()
  })
})

describe('RespostaCasoAbertoConteudo variante="hub" — texto legível com as citações marcadas (52-12 / D-22)', () => {
  beforeEach(() => {
    vi.mocked(getRespostaCasoAbertoSjt).mockReset()
  })

  it('disponivel: ficha neutra em 16px, a citação localizada num <mark>, a outra na lista lateral, sem rótulo próprio', async () => {
    vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao: 'disponivel', texto: TEXTO })
    const { container } = renderHub()
    const marca = await screen.findByText('ouviria a paciente', { selector: 'mark' })
    expect(marca).toBeInTheDocument()
    const hub = screen.getByTestId('caso-aberto-hub')
    const caixa = within(hub).getByTestId('caso-aberto-texto')
    expect(caixa.textContent).toBe(TEXTO)
    expect(caixa.className.split(/\s+/)).toContain('text-base')
    expect(caixa.className).not.toMatch(/text-xs|text-amber/)
    const lista = within(hub).getByTestId('caso-aberto-citacoes-nao-localizadas')
    expect(within(lista).getByText('citação que não está no texto')).toBeInTheDocument()
    expect(within(lista).queryByText('ouviria a paciente')).toBeNull()
    expect(container.querySelectorAll('mark')).toHaveLength(1)
    // O rótulo é do card (um dono só): nem «Texto do candidato» nem o título da Decisão Final.
    expect(screen.queryByText('Texto do candidato')).toBeNull()
    expect(screen.queryByText(COPY.titulo)).toBeNull()
    expect(screen.queryByTestId('decisao-sjt-resposta-caso-aberto')).toBeNull()
    corNeutraNoRamo(hub)
    nadaDesabilitado()
  })

  const SEM_TEXTO = [
    ['carregando', () => vi.mocked(getRespostaCasoAbertoSjt).mockReturnValue(new Promise(() => {})), 'carregando'],
    ['erro', () => vi.mocked(getRespostaCasoAbertoSjt).mockRejectedValue(new Error('rede')), 'erro'],
    ['removida', () => vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao: 'removida', texto: null }), 'removida'],
    ['indisponivel', () => vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao: 'indisponivel', texto: null }), 'indisponivel'],
    [
      'sem_resposta_enviada',
      () => vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao: 'sem_resposta_enviada', texto: null }),
      'semRespostaEnviada',
    ],
    [
      'disponivel com texto vazio',
      () => vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao: 'disponivel', texto: '' }),
      'indisponivel',
    ],
  ] as const

  it.each(SEM_TEXTO)('%s: a frase de estado, as 2 citações na lista lateral, zero <mark>, cor neutra', async (_nome, preparar, chave) => {
    preparar()
    const { container } = renderHub()
    const frase = await screen.findByText(COPY[chave])
    expect(frase).toBeInTheDocument()
    expect(frase.className.split(/\s+/)).toContain('text-base')
    const hub = screen.getByTestId('caso-aberto-hub')
    const lista = within(hub).getByTestId('caso-aberto-citacoes-nao-localizadas')
    for (const c of CITACOES) expect(within(lista).getByText(c)).toBeInTheDocument()
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(within(hub).queryByTestId('caso-aberto-texto')).toBeNull()
    expect(screen.queryByText('Trechos marcados: citados pela análise da IA.')).toBeNull()
    corNeutraNoRamo(hub)
    nadaDesabilitado()
  })

  it('carregando: anunciado com role="status"', async () => {
    vi.mocked(getRespostaCasoAbertoSjt).mockReturnValue(new Promise(() => {}))
    renderHub()
    expect(await screen.findByRole('status')).toHaveTextContent(COPY.carregando)
  })

  it('erro: «Tentar de novo» (14px/600) chama o serviço de novo e o texto chega com a marca', async () => {
    vi.mocked(getRespostaCasoAbertoSjt)
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValueOnce({ situacao: 'disponivel', texto: TEXTO })
    const user = userEvent.setup()
    renderHub()
    const botao = await screen.findByRole('button', { name: COPY.tentarDeNovo })
    expect(botao.className.split(/\s+/)).toEqual(expect.arrayContaining(['text-sm', 'font-semibold', 'text-white']))
    await user.click(botao)
    expect(await screen.findByText('ouviria a paciente', { selector: 'mark' })).toBeInTheDocument()
    expect(getRespostaCasoAbertoSjt).toHaveBeenCalledTimes(2)
  })
})
