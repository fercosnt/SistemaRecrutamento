/**
 * 49-44 / WR-07 — o RH lê, sob demanda, o texto que o candidato gravou na resposta do caso
 * aberto da SJT. Fechado, nada é buscado; o clique busca e mostra o texto; cada situação da RPC
 * tem a sua frase; o erro oferece nova tentativa; ocultar desmonta o texto; nada é desabilitado.
 *
 * PATTERNS §N: asserimos a constante exportada E o render que de fato monta.
 *
 * @see src/features/decisao/components/RespostaCasoAbertoSjt.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/features/avaliacao/services/scoresRhService', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/features/avaliacao/services/scoresRhService')>()
  return { ...real, getRespostaCasoAbertoSjt: vi.fn() }
})

import { COPY_RESPOSTA_CASO_ABERTO, RespostaCasoAbertoSjt } from '../RespostaCasoAbertoSjt'
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
      removidaPeloTitular: 'O texto foi removido a pedido do titular dos dados.',
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
    ['removida_pelo_titular', 'removidaPeloTitular'],
    ['indisponivel', 'indisponivel'],
    ['sem_resposta_enviada', 'semRespostaEnviada'],
  ] as const)('%s → a frase própria (COPY.%s), e nada desabilitado', async (situacao, chave) => {
    const frase = COPY[chave]
    expect(frase).toEqual(expect.any(String))
    vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao, texto: null })
    await abrir()
    expect(await screen.findByText(frase)).toBeInTheDocument()
    for (const outra of [COPY.removidaPeloTitular, COPY.indisponivel, COPY.semRespostaEnviada]) {
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
