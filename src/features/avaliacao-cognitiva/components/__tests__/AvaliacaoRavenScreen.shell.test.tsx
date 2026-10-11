/**
 * Phase 52 / Plan 52-03 (JORN-60 — D-24 + D-52-U14; 51-UI-REVIEW Pilar 2) — o Raven na shell da
 * marca, com saída DURANTE a prova.
 *
 * O Raven vive fora do container de avaliações (liberação nominal, D-37 da 51): o caminho dele é
 * o painel. Por isso o botão de saída diz «Ir ao painel» e leva a `/candidato/dashboard` — o rótulo
 * diz o destino (Invariante 8). As respostas do Raven vivem SÓ na memória da tela (nenhum
 * rascunho): com qualquer resposta marcada — inclusive a escolha do item atual ainda não enviada,
 * que também se perde (T-52-06) — o botão abre a confirmação de perda; sem nenhuma, sai direto
 * (D-52-U15).
 *
 * O `BackgroundImage` é trocado por um dublê que expõe as props: o que se prova aqui é QUAL shell
 * a tela pede (`gradient` + overlay preto 15%), não a pintura do fundo.
 *
 * @see src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
 * @see src/features/avaliacao/components/SairDaProvaButton.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))

vi.mock('@/components/BackgroundImage', () => ({
  BackgroundImage: ({
    background,
    overlayColor,
    overlayOpacity,
    children,
  }: {
    background: string
    overlayColor?: string
    overlayOpacity?: number
    children?: ReactNode
  }) => (
    <div
      data-testid="background-image"
      data-background={background}
      data-overlay-color={overlayColor}
      data-overlay-opacity={overlayOpacity}
    >
      {children}
    </div>
  ),
}))

const m = vi.hoisted(() => ({
  consultarLiberacao: vi.fn(),
  listarQuestoesRaven: vi.fn(),
  submeterRaven: vi.fn(),
}))

vi.mock('@/features/avaliacao-cognitiva/services/ravenService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao-cognitiva/services/ravenService')>()
  return {
    ...actual,
    consultarLiberacao: m.consultarLiberacao,
    listarQuestoesRaven: m.listarQuestoesRaven,
    submeterRaven: m.submeterRaven,
  }
})

import { AvaliacaoRavenScreen } from '../AvaliacaoRavenScreen'

const CID = 'CAND1'
const IR_AO_PAINEL = 'Ir ao painel'
const SUBTITULO =
  'São 60 itens em ordem crescente de dificuldade. Escolha a peça que completa cada figura.'
const SEM_VOLTA = 'Não é possível voltar a um item já respondido.'

const questao = (n: number, opcoes: number) => ({
  id: `q${n}`,
  numero_questao: n,
  serie: 'A',
  imagem_matriz_url: '',
  opcoes_imagens: Array.from({ length: opcoes }, () => ''),
})

/** Duas questões: a primeira resposta enviada vira «resposta anterior» no item 2. */
const DUAS_QUESTOES = [questao(1, 6), questao(2, 6)]

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/candidato/avaliacao-raciocinio/${CID}`]}>
        <Routes>
          <Route
            path="/candidato/avaliacao-raciocinio/:candidaturaId"
            element={<AvaliacaoRavenScreen />}
          />
          <Route path="/candidato/dashboard" element={<p>SENTINELA-PAINEL</p>} />
          <Route path="/candidato/avaliacao/:candidaturaId" element={<p>SENTINELA-LISTA</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function noItem1() {
  return screen.findByRole('button', { name: 'Alternativa 1' })
}

beforeEach(() => {
  vi.clearAllMocks()
  m.consultarLiberacao.mockResolvedValue({
    liberado: true,
    liberado_em: '2026-10-01T12:00:00Z',
    ja_respondeu: false,
  })
  m.listarQuestoesRaven.mockResolvedValue(DUAS_QUESTOES)
})

describe('AvaliacaoRavenScreen — saída «Ir ao painel» durante a prova (52-03 / D-24, D-52-U14)', () => {
  it('sem nenhuma escolha → «Ir ao painel» vai DIRETO ao painel, sem diálogo', async () => {
    montar()
    await noItem1()

    const sair = screen.getByTestId('sair-da-prova')
    expect(sair).toHaveTextContent(IR_AO_PAINEL)
    fireEvent.click(sair)

    expect(await screen.findByText('SENTINELA-PAINEL')).toBeInTheDocument()
    expect(screen.queryByText('Sair da avaliação?')).not.toBeInTheDocument()
  })

  it('escolha no item atual (ainda não enviada) → diálogo; «Continuar» mantém o item e a escolha', async () => {
    montar()
    fireEvent.click(await noItem1())
    expect(screen.getByRole('button', { name: 'Alternativa 1' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByTestId('sair-da-prova'))
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).getByText('Sair da avaliação?')).toBeInTheDocument()
    expect(
      within(dialogo).getByText('Se sair agora, as respostas desta prova não serão salvas.'),
    ).toBeInTheDocument()

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Continuar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByText('SENTINELA-PAINEL')).not.toBeInTheDocument()
    expect(screen.getByText(/Item 1 de 2/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alternativa 1' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('escolha no item atual → diálogo; «Sair» vai a /candidato/dashboard', async () => {
    montar()
    fireEvent.click(await noItem1())

    fireEvent.click(screen.getByTestId('sair-da-prova'))
    const dialogo = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Sair' }))

    expect(await screen.findByText('SENTINELA-PAINEL')).toBeInTheDocument()
    expect(screen.queryByText('SENTINELA-LISTA')).not.toBeInTheDocument()
  })

  it('resposta anterior enviada e nenhuma escolha no item atual → ainda confirma a perda', async () => {
    montar()
    fireEvent.click(await noItem1())
    fireEvent.click(screen.getByRole('button', { name: /Próximo item/ }))
    expect(await screen.findByText(/Item 2 de 2/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alternativa 1' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByTestId('sair-da-prova'))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.queryByText('SENTINELA-PAINEL')).not.toBeInTheDocument()
  })
})

describe('AvaliacaoRavenScreen — shell da marca (52-03 / 51-UI-REVIEW Pilar 2)', () => {
  it('prova em andamento: dentro do BackgroundImage gradient + overlay preto 15%, coluna max-w-4xl', async () => {
    montar()
    await noItem1()

    const shell = screen.getByTestId('background-image')
    expect(shell).toHaveAttribute('data-background', 'gradient')
    expect(shell).toHaveAttribute('data-overlay-color', 'bg-black')
    expect(shell).toHaveAttribute('data-overlay-opacity', '15')

    const titulo = screen.getByRole('heading', { name: 'Raciocínio lógico (Matrizes)' })
    expect(shell).toContainElement(titulo)
    expect(shell).toContainElement(screen.getByTestId('sair-da-prova'))
    expect(titulo.closest('.max-w-4xl')).not.toBeNull()
    expect(titulo.closest('.container')).not.toBeNull()
  })

  it('as instruções (subtítulo e «sem volta») estão no item 1 e continuam no item seguinte', async () => {
    montar()
    await noItem1()
    expect(screen.getByText(SUBTITULO)).toBeInTheDocument()
    expect(screen.getByText(SEM_VOLTA)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Alternativa 1' }))
    fireEvent.click(screen.getByRole('button', { name: /Próximo item/ }))
    expect(await screen.findByText(/Item 2 de 2/)).toBeInTheDocument()
    expect(screen.getByText(SUBTITULO)).toBeInTheDocument()
    expect(screen.getByText(SEM_VOLTA)).toBeInTheDocument()
  })

  it('8 alternativas → grade com as classes literais grid-cols-4 e sm:grid-cols-8', async () => {
    m.listarQuestoesRaven.mockResolvedValue([questao(1, 8)])
    montar()
    const grade = (await noItem1()).parentElement as HTMLElement
    expect(grade).toHaveClass('grid', 'grid-cols-4', 'sm:grid-cols-8')
    expect(grade).not.toHaveClass('grid-cols-3')
  })

  it('6 alternativas → grade com as classes literais grid-cols-3 e sm:grid-cols-6', async () => {
    montar()
    const grade = (await noItem1()).parentElement as HTMLElement
    expect(grade).toHaveClass('grid', 'grid-cols-3', 'sm:grid-cols-6')
    expect(grade).not.toHaveClass('grid-cols-4')
  })

  // O DOM não distingue o defeito: o template `sm:${…}` também produz «sm:grid-cols-8» no
  // atributo class. O que falha é o JIT do Tailwind, que só gera a classe que aparece INTEIRA
  // no fonte. Por isso a prova é sobre o fonte.
  it('fonte: as classes da grade estão escritas inteiras (o JIT do Tailwind as gera)', () => {
    const fonte = readFileSync(resolve(__dirname, '../AvaliacaoRavenScreen.tsx'), 'utf-8')
    expect(fonte).toContain("'grid-cols-4 sm:grid-cols-8'")
    expect(fonte).toContain("'grid-cols-3 sm:grid-cols-6'")
    expect(fonte).not.toMatch(/sm:\$\{/)
  })

  it('o CTA de avanço é accent sólido (bg-[#35BFAD] text-white)', async () => {
    montar()
    await noItem1()
    expect(screen.getByRole('button', { name: /Próximo item/ })).toHaveClass('bg-[#35BFAD]', 'text-white')
  })

  it('não liberado: a mesma shell envolve o aviso', async () => {
    m.consultarLiberacao.mockResolvedValue({ liberado: false, liberado_em: null, ja_respondeu: false })
    montar()
    const titulo = await screen.findByRole('heading', { name: 'Raciocínio lógico (Matrizes)' })
    const shell = screen.getByTestId('background-image')
    expect(shell).toHaveAttribute('data-background', 'gradient')
    expect(shell).toContainElement(titulo)
  })

  it('já respondeu: a mesma shell envolve a conclusão', async () => {
    m.consultarLiberacao.mockResolvedValue({ liberado: true, liberado_em: '2026-10-01', ja_respondeu: true })
    montar()
    const titulo = await screen.findByRole('heading', {
      name: 'Você já concluiu esta avaliação. O resultado fica com a equipe de recrutamento.',
    })
    const shell = screen.getByTestId('background-image')
    expect(shell).toHaveAttribute('data-background', 'gradient')
    expect(shell).toContainElement(titulo)
  })
})
