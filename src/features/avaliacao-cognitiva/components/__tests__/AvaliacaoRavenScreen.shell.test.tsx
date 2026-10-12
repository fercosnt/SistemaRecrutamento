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
import { createRequire } from 'node:module'
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

/*
 * 52-29 (G-52-2, UAT da 52) — a alternativa marcada sumia no gradiente turquesa: o contorno accent
 * antigo media 1,08–2,28:1 contra o fundo e contra o próprio ladrilho. A prova não deixa voltar a um
 * item respondido, então a seleção tem de ser inequívoca. O contraste é julgado pelas funções do
 * medidor `scripts/p52_contraste.cjs` (a MESMA `corDeClasse`/`contraste` da CLI), com as cores LIDAS
 * das classes do DOM — nunca uma cópia da fórmula.
 */
const RAIZ = resolve(__dirname, '../../../../..')
const medidor = createRequire(import.meta.url)(resolve(RAIZ, 'scripts/p52_contraste.cjs')) as {
  corDeClasse: (token: string) => { r: number; g: number; b: number; a: number }
  contraste: (c1: object, c2: object) => number
}
const contrasteEntre = (a: string, b: string) =>
  medidor.contraste(medidor.corDeClasse(a), medidor.corDeClasse(b))

const MARCADA = ['border-[#00109E]', 'ring-4', 'ring-white']
const FOCO = [
  'focus-visible:outline-dashed',
  'focus-visible:outline-2',
  'focus-visible:outline-offset-[-10px]',
  'focus-visible:outline-[#00109E]',
]
const CHECK = 'raven-alternativa-check'

/** As classes de `el` que faltam em `esperadas` (vazio = todas presentes). */
const faltam = (el: Element, esperadas: string[]) => esperadas.filter((c) => !el.classList.contains(c)).join(' ')
/** As classes de `el` que estão em `proibidas` (vazio = nenhuma). */
const presentes = (el: Element, proibidas: string[]) => proibidas.filter((c) => el.classList.contains(c)).join(' ')

async function gradeDe8() {
  m.listarQuestoesRaven.mockResolvedValue([questao(1, 8)])
  montar()
  const grade = (await noItem1()).parentElement as HTMLElement
  const ladrilhos = within(grade).getAllByRole('button')
  return { grade, ladrilhos }
}

describe('AvaliacaoRavenScreen — alternativa marcada visível no gradiente (52-29 / G-52-2)', () => {
  it('nenhuma escolha: nenhum check; todo ladrilho com borda branca grossa, sem borda navy nem anel', async () => {
    const { ladrilhos } = await gradeDe8()
    expect(ladrilhos.length).toBe(8)
    expect(screen.queryAllByTestId(CHECK).length, 'sem escolha nao ha check').toBe(0)
    for (const l of ladrilhos) {
      expect(faltam(l, ['border-4', 'border-white']), `ladrilho livre: ${l.getAttribute('aria-label')}`).toBe('')
      expect(presentes(l, MARCADA), `ladrilho livre sem a marca: ${l.getAttribute('aria-label')}`).toBe('')
    }
  })

  it('clique na «Alternativa 3»: um único check, dentro dela e aria-hidden; borda navy + anel branco só nela; nada accent na grade', async () => {
    const { grade, ladrilhos } = await gradeDe8()
    fireEvent.click(screen.getByRole('button', { name: 'Alternativa 3' }))

    const tres = screen.getByRole('button', { name: 'Alternativa 3' })
    const checks = screen.queryAllByTestId(CHECK)
    expect(checks.length, 'exatamente um check').toBe(1)
    expect(tres.contains(checks[0]), 'o check mora dentro da Alternativa 3').toBe(true)
    expect(checks[0].getAttribute('aria-hidden'), 'o check e aria-hidden (aria-pressed carrega o estado)').toBe('true')
    expect(faltam(tres, MARCADA), 'a marcada tem borda navy e anel branco').toBe('')
    expect(tres.getAttribute('aria-pressed')).toBe('true')
    for (const l of ladrilhos.filter((x) => x !== tres)) {
      expect(presentes(l, ['border-[#00109E]', 'ring-4']), `livre sem a marca: ${l.getAttribute('aria-label')}`).toBe('')
    }
    // A seleção saiu do accent: nenhum elemento DENTRO da grade carrega o turquesa da marca.
    const turquesa = Array.from(grade.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') || '')
      .filter((c) => /35bfad/i.test(c))
    expect(turquesa.join(' | '), 'nenhuma classe accent dentro da grade').toBe('')
  })

  it('clique na «Alternativa 5» depois da 3: o check se move (continua um só, agora no 5)', async () => {
    await gradeDe8()
    fireEvent.click(screen.getByRole('button', { name: 'Alternativa 3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Alternativa 5' }))
    const checks = screen.queryAllByTestId(CHECK)
    expect(checks.length, 'exatamente um check').toBe(1)
    expect(screen.getByRole('button', { name: 'Alternativa 5' }).contains(checks[0]), 'o check foi para a 5').toBe(true)
    expect(presentes(screen.getByRole('button', { name: 'Alternativa 3' }), MARCADA), 'a 3 perdeu a marca').toBe('')
  })

  it('foco do teclado: contorno tracejado navy interno em todo ladrilho; a seleção não usa outline', async () => {
    const { ladrilhos } = await gradeDe8()
    fireEvent.click(screen.getByRole('button', { name: 'Alternativa 3' }))
    for (const l of ladrilhos) {
      expect(faltam(l, FOCO), `foco em ${l.getAttribute('aria-label')}`).toBe('')
      const semFoco = Array.from(l.classList).filter((c) => !c.startsWith('focus-visible:'))
      expect(semFoco.filter((c) => c.includes('outline')).join(' '), 'a selecao nao usa outline').toBe('')
    }
  })

  it('contraste ≥ 3:1 pela função do medidor, com as cores lidas das classes do DOM', async () => {
    await gradeDe8()
    fireEvent.click(screen.getByRole('button', { name: 'Alternativa 3' }))
    const tres = screen.getByRole('button', { name: 'Alternativa 3' })
    const classes = Array.from(tres.classList)
    const borda = classes.find((c) => /^border-\[#/.test(c)) || ''
    const fundo = classes.find((c) => /^bg-/.test(c)) || ''
    const anel = classes.find((c) => /^ring-(white|black|\[#|[a-z]+-[0-9])/.test(c)) || ''
    const foco = (classes.find((c) => /^focus-visible:outline-\[#/.test(c)) || '').replace('focus-visible:', '')
    const seloOuNada = screen.queryByTestId(CHECK)
    expect(seloOuNada !== null, 'o check da marcada existe').toBe(true)
    const selo = seloOuNada as HTMLElement
    const glifo = Array.from(selo.classList).find((c) => /^text-/.test(c)) || ''
    const fundoSelo = Array.from(selo.classList).find((c) => /^bg-/.test(c)) || ''
    expect([borda, fundo, anel, foco, glifo, fundoSelo].every(Boolean), `classes lidas: ${[borda, fundo, anel, foco, glifo, fundoSelo].join(' ')}`).toBe(true)
    expect(contrasteEntre(borda, fundo)).toBeGreaterThanOrEqual(3)
    expect(contrasteEntre(borda, anel)).toBeGreaterThanOrEqual(3)
    expect(contrasteEntre(glifo, fundoSelo)).toBeGreaterThanOrEqual(3)
    expect(contrasteEntre(foco, fundo)).toBeGreaterThanOrEqual(3)
  })

  // O JIT do Tailwind só gera a classe escrita INTEIRA no fonte (o mesmo motivo da grade).
  it('fonte: as classes da seleção e do foco estão escritas por extenso; a seleção accent antiga saiu', () => {
    const fonte = readFileSync(resolve(__dirname, '../AvaliacaoRavenScreen.tsx'), 'utf-8')
    expect(fonte.includes("'border-[#00109E] ring-4 ring-white'"), 'marcada por extenso').toBe(true)
    expect(fonte.includes("'border-white hover:border-slate-300'"), 'livre por extenso').toBe(true)
    expect(FOCO.filter((c) => !fonte.includes(c)).join(' '), 'foco por extenso').toBe('')
    expect(fonte.includes('border-[#35BFAD]') || fonte.includes('ring-[#35BFAD]/40'), 'a selecao accent antiga saiu').toBe(false)
    expect(/(border|ring|outline)-(\[)?\$\{/.test(fonte), 'nenhuma classe de borda/anel/contorno interpolada').toBe(false)
  })
})
