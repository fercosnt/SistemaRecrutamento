/**
 * Phase 51 / Plan 51-01 — JORN-46 (D-24, D-25, D-37; correção de fato C-11).
 *
 * O defeito medido era de RÓTULO com um salto extra: o botão das provas dizia
 * «Voltar ao painel» e levava à LISTA (`/candidato/avaliacao/:id`); quando a etapa já
 * tinha mudado, a lista mostrava o `WrongEtapaState` e só ele levava ao painel.
 *
 * Convenção (regra 2 das escolhas do planejador):
 *  - estado que existe PORQUE a etapa deixou de ser `avaliacao_assincrona` («Sua etapa
 *    avançou») → «Ir ao painel» → `/candidato/dashboard`, DIRETO (sem o bloqueio);
 *  - todo outro estado de dentro da prova (vazio, sem pergunta, indisponível, devolutiva)
 *    → «Voltar às avaliações» → `/candidato/avaliacao/:id`.
 *
 * Navegação REAL (MemoryRouter com rotas-sentinela), não um `navigate` espião: o que se
 * prova é a tela a que o clique chega.
 */
import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

// The real client throws without VITE_SUPABASE_* (.env.local); every network call below
// is mocked, so the client is a stub — the test runs in a clean checkout too.
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))

const state = vi.hoisted(() => ({
  locked: false,
  // 52-02: perguntas/opções do contexto — vazias por padrão (os casos de estado de borda
  // do 51-01 dependem disso); os casos «durante a prova» preenchem.
  perguntas: [] as Array<{
    id: string
    cargo: string
    cenario: string
    formato: string
    tempo_est_min: number | null
    status: string
  }>,
  opcoes: [] as Array<{ opcao_id: string; opcao_texto: string }>,
  redacoes: [] as Array<{
    id: string
    codigo: string
    texto: string
    valor_primario: string | null
    is_padrao: boolean
  }>,
  itensBigfive: [] as Array<{ item_id: number; texto: string; ordem: number }>,
  // 52-02: um `flushNow` só, observável — os casos de saída com rascunho trocam por um
  // diferido para provar a ORDEM (flush termina → só então navega).
  flushNow: (() => Promise.resolve()) as () => Promise<void>,
}))

vi.mock('@/features/avaliacao/hooks/useAutosaveAvaliacao', () => ({
  useAutosaveAvaliacao: () => ({
    update: vi.fn(),
    flushNow: () => state.flushNow(),
    status: 'idle',
    locked: state.locked,
  }),
}))

vi.mock('@/features/avaliacao/services/avaliacaoService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao/services/avaliacaoService')>()
  return {
    ...actual,
    getAvaliacaoContext: vi.fn(() =>
      Promise.resolve({
        candidatura: { id: 'CAND1', status: 'em_andamento', etapa_atual: 'avaliacao_assincrona', vaga_id: 'V1' },
        testes_aplicaveis: [],
        perguntas: state.perguntas,
      }),
    ),
    getOpcoesSjt: vi.fn(() => Promise.resolve(state.opcoes)),
    upsertResposta: vi.fn(() => Promise.resolve()),
    loadResposta: vi.fn(() => Promise.resolve(null)),
  }
})

vi.mock('@/features/avaliacao/services/redacaoService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao/services/redacaoService')>()
  return {
    ...actual,
    getRedacaoContext: vi.fn(() => Promise.resolve(state.redacoes)),
    getMinhasRedacoes: vi.fn(() => Promise.resolve([])),
  }
})

vi.mock('@/features/avaliacao/services/bigfiveService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao/services/bigfiveService')>()
  return {
    ...actual,
    getBigfiveItens: vi.fn(() => Promise.resolve(state.itensBigfive)),
    loadDevolutiva: vi.fn(() => Promise.reject(new Error('ainda não gerada'))),
  }
})

import { RedacaoEditorScreen } from '../RedacaoEditorScreen'
import { SjtCasoAbertoScreen } from '../SjtCasoAbertoScreen'
import { SjtMultiplaEscolhaScreen } from '../SjtMultiplaEscolhaScreen'
import { BigFiveQuestionnaireScreen } from '../BigFiveQuestionnaireScreen'
import { DevolutivaBigFiveView } from '../DevolutivaBigFiveView'

const VOLTAR_AVALIACOES = 'Voltar às avaliações'
const IR_AO_PAINEL = 'Ir ao painel'
const ROTULO_ANTIGO = /Voltar ao painel/

function renderAt(entry: string, pattern: string, ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={pattern} element={ui} />
          <Route path="/candidato/avaliacao/:candidaturaId" element={<p>SENTINELA-LISTA</p>} />
          <Route path="/candidato/dashboard" element={<p>SENTINELA-PAINEL</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function clicarEChegar(rotulo: string, sentinela: 'SENTINELA-LISTA' | 'SENTINELA-PAINEL') {
  const btn = await screen.findByRole('button', { name: rotulo })
  expect(document.body.textContent ?? '').not.toMatch(ROTULO_ANTIGO)
  fireEvent.click(btn)
  expect(await screen.findByText(sentinela)).toBeInTheDocument()
}

describe('Telas de prova — rótulo diz o destino (51-01 / JORN-46)', () => {
  beforeEach(() => {
    state.locked = false
    state.perguntas = []
    state.opcoes = []
    state.redacoes = []
    state.itensBigfive = []
    state.flushNow = () => Promise.resolve()
  })

  it('Redação, «Sua etapa avançou» → «Ir ao painel» vai DIRETO ao painel', async () => {
    state.locked = true
    renderAt('/candidato/redacao/CAND1', '/candidato/redacao/:candidaturaId', <RedacaoEditorScreen />)
    await clicarEChegar(IR_AO_PAINEL, 'SENTINELA-PAINEL')
  })

  it('Redação, nenhuma pendente → «Voltar às avaliações» vai à lista', async () => {
    renderAt('/candidato/redacao/CAND1', '/candidato/redacao/:candidaturaId', <RedacaoEditorScreen />)
    await clicarEChegar(VOLTAR_AVALIACOES, 'SENTINELA-LISTA')
  })

  it('Caso prático, «Sua etapa avançou» → «Ir ao painel» vai DIRETO ao painel', async () => {
    state.locked = true
    renderAt(
      '/candidato/avaliacao/CAND1/caso',
      '/candidato/avaliacao/:candidaturaId/caso',
      <SjtCasoAbertoScreen />,
    )
    await clicarEChegar(IR_AO_PAINEL, 'SENTINELA-PAINEL')
  })

  it('Caso prático, sem pergunta → «Voltar às avaliações» vai à lista', async () => {
    renderAt(
      '/candidato/avaliacao/CAND1/caso',
      '/candidato/avaliacao/:candidaturaId/caso',
      <SjtCasoAbertoScreen />,
    )
    await clicarEChegar(VOLTAR_AVALIACOES, 'SENTINELA-LISTA')
  })

  it('SJT múltipla escolha, sem perguntas → «Voltar às avaliações» vai à lista', async () => {
    renderAt(
      '/candidato/avaliacao/CAND1/mc',
      '/candidato/avaliacao/:candidaturaId/mc',
      <SjtMultiplaEscolhaScreen />,
    )
    await clicarEChegar(VOLTAR_AVALIACOES, 'SENTINELA-LISTA')
  })

  it('Big Five, «Sua etapa avançou» → «Ir ao painel» vai DIRETO ao painel', async () => {
    state.locked = true
    renderAt(
      '/candidato/avaliacao/CAND1/bigfive',
      '/candidato/avaliacao/:candidaturaId/bigfive',
      <BigFiveQuestionnaireScreen />,
    )
    await clicarEChegar(IR_AO_PAINEL, 'SENTINELA-PAINEL')
  })

  it('Big Five, itens indisponíveis → «Voltar às avaliações» vai à lista', async () => {
    renderAt(
      '/candidato/avaliacao/CAND1/bigfive',
      '/candidato/avaliacao/:candidaturaId/bigfive',
      <BigFiveQuestionnaireScreen />,
    )
    await clicarEChegar(VOLTAR_AVALIACOES, 'SENTINELA-LISTA')
  })

  it('Devolutiva em preparo → «Voltar às avaliações» vai à lista (frase canônica mantida)', async () => {
    renderAt(
      '/candidato/avaliacao/CAND1/bigfive/devolutiva',
      '/candidato/avaliacao/:candidaturaId/bigfive/devolutiva',
      <DevolutivaBigFiveView />,
    )
    await screen.findByText(/Acompanhe o andamento pelo seu painel/)
    await clicarEChegar(VOLTAR_AVALIACOES, 'SENTINELA-LISTA')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────
// Phase 52 / Plan 52-02 (JORN-60 — D-24, D-26, D-36, D-52-U15): saída DURANTE a prova.
//
// SJT MC guarda as respostas só na memória da tela: com ≥1 resposta marcada, «Voltar às
// avaliações» abre a confirmação de perda; sem nenhuma, sai direto (não há o que perder,
// e um diálogo dizendo «não serão salvas» seria falso). Navegação REAL, como acima.
// ─────────────────────────────────────────────────────────────────────────────────────

const PERGUNTA_MC = {
  id: 'P-MC-1',
  cargo: 'sdr',
  cenario: 'Um cliente reclama do atraso.',
  formato: 'mc',
  tempo_est_min: null,
  status: 'ativo',
}
const OPCOES_MC = [
  { opcao_id: 'O1', opcao_texto: 'Opção A' },
  { opcao_id: 'O2', opcao_texto: 'Opção B' },
]
const TITULO_DIALOGO = 'Sair da avaliação?'
const CORPO_DIALOGO = 'Se sair agora, as respostas desta prova não serão salvas.'

const renderSjtMc = () =>
  renderAt(
    '/candidato/avaliacao/CAND1/mc',
    '/candidato/avaliacao/:candidaturaId/mc',
    <SjtMultiplaEscolhaScreen />,
  )

describe('SJT múltipla escolha — saída durante a prova (52-02 / D-24, D-52-U15)', () => {
  beforeEach(() => {
    state.locked = false
    state.perguntas = [PERGUNTA_MC]
    state.opcoes = OPCOES_MC
    state.redacoes = []
    state.itensBigfive = []
    state.flushNow = () => Promise.resolve()
  })

  it('o botão de saída está na tela da prova e diz «Voltar às avaliações»', async () => {
    renderSjtMc()
    const btn = await screen.findByTestId('sair-da-prova')
    expect(btn).toHaveAccessibleName(VOLTAR_AVALIACOES)
    expect(await screen.findByRole('heading', { name: /Situação 1 de 1/ })).toBeInTheDocument()
  })

  it('sem nenhuma resposta marcada → navega DIRETO à lista, sem diálogo', async () => {
    renderSjtMc()
    fireEvent.click(await screen.findByTestId('sair-da-prova'))
    expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
    expect(screen.queryByText(TITULO_DIALOGO)).toBeNull()
  })

  it('com 1 resposta → diálogo; «Continuar» fecha e MANTÉM a resposta; «Sair» vai à lista', async () => {
    renderSjtMc()
    const opcaoA = await screen.findByRole('radio', { name: 'Opção A' })
    fireEvent.click(opcaoA)
    expect(opcaoA).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(screen.getByTestId('sair-da-prova'))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(TITULO_DIALOGO)).toBeInTheDocument()
    expect(screen.getByText(CORPO_DIALOGO)).toBeInTheDocument()
    expect(screen.queryByText('SENTINELA-LISTA')).toBeNull()

    // «Continuar» é o cancelar: fecha, fica na prova, a resposta continua marcada.
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByText('SENTINELA-LISTA')).toBeNull()
    expect(screen.getByRole('radio', { name: 'Opção A' })).toHaveAttribute('aria-checked', 'true')

    // De novo, agora «Sair»: chega à lista.
    fireEvent.click(screen.getByTestId('sair-da-prova'))
    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
  })

  it('cronômetro diz «Tempo decorrido: mm:ss (sem limite de tempo)» com tabular-nums (D-26)', async () => {
    renderSjtMc()
    const tempo = await screen.findByText(/^Tempo decorrido: \d{2}:\d{2} \(sem limite de tempo\)$/)
    expect(tempo).toHaveClass('tabular-nums')
    expect(document.body.textContent ?? '').not.toMatch(/Tempo sugerido/i)
  })
})


// ─────────────────────────────────────────────────────────────────────────────────────
// Phase 52 / Plan 52-02 (D-24, D-36) — rodada 1 do portão do bloco B (CR-01 do
// `52-REVIEW-PORTAO-1.md`; decisão do operador em `52-14-DECISAO-RODADA-1.md`, P1).
//
// A regra continua a da D-24: «rascunho → sai direto; memória → confirma». O que mudou é
// a LISTA. Big Five e Caso prático GRAVAM rascunho (`useAutosaveAvaliacao`), mas nenhum
// dos dois o RELÊ: o Big Five nasce com `useState({})` e o Caso prático com `useState('')`.
// Para o candidato, as respostas dessas duas telas vivem só na memória — exatamente como
// no SJT MC. Então elas confirmam: com ≥1 resposta (Big Five) ou qualquer texto que não
// seja só espaço (Caso prático), «Sair da avaliação?»; sem nada, saem direto.
// Só a Redação relê o rascunho (`loadResposta`), e só ela sai direto depois do flush.
// ─────────────────────────────────────────────────────────────────────────────────────

/** Troca o flushNow por um diferido e devolve o registro de ordem + o gatilho. */
function flushDiferido() {
  const ordem: string[] = []
  let terminar: () => void = () => {}
  const chamadas = { n: 0 }
  state.flushNow = () =>
    new Promise<void>((r) => {
      chamadas.n += 1
      ordem.push('flush:inicio')
      terminar = () => {
        ordem.push('flush:fim')
        r()
      }
    })
  return { ordem, chamadas, terminar: () => terminar() }
}

/** Clica «Voltar às avaliações», prova que espera o flush, solta o flush, chega à lista. */
async function sairDepoisDoFlush() {
  const flush = flushDiferido()
  const btn = await screen.findByTestId('sair-da-prova')
  expect(btn).toHaveAccessibleName(VOLTAR_AVALIACOES)
  fireEvent.click(btn)
  await waitFor(() => expect(flush.chamadas.n).toBe(1))
  // Nunca a confirmação de perda; e, com o flush pendente, ainda na prova.
  expect(screen.queryByRole('alertdialog')).toBeNull()
  expect(screen.queryByText(TITULO_DIALOGO)).toBeNull()
  expect(screen.queryByText('SENTINELA-LISTA')).toBeNull()
  flush.terminar()
  expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
  expect(flush.ordem).toEqual(['flush:inicio', 'flush:fim'])
}

/** Conta as chamadas ao flushNow (resolvido na hora). */
function contarFlush() {
  const chamadas = { n: 0 }
  state.flushNow = () => {
    chamadas.n += 1
    return Promise.resolve()
  }
  return chamadas
}

/**
 * Sem nada a perder: «Voltar às avaliações» chega à lista sem diálogo — e sem gravar. Um
 * flush aqui não salvaria nada do candidato; só escreveria um rascunho vazio por cima do
 * que estiver guardado (a classe do WR-01).
 */
async function sairDiretoSemGravar() {
  const flush = contarFlush()
  const btn = await screen.findByTestId('sair-da-prova')
  expect(btn).toHaveAccessibleName(VOLTAR_AVALIACOES)
  fireEvent.click(btn)
  expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
  expect(screen.queryByText(TITULO_DIALOGO)).toBeNull()
  expect(flush.n).toBe(0)
}

/** Com algo a perder: abre a confirmação, sem navegar e sem gravar. */
async function abrirConfirmacao() {
  fireEvent.click(screen.getByTestId('sair-da-prova'))
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  expect(screen.getByText(TITULO_DIALOGO)).toBeInTheDocument()
  expect(screen.getByText(CORPO_DIALOGO)).toBeInTheDocument()
  expect(screen.queryByText('SENTINELA-LISTA')).toBeNull()
}

const PERGUNTA_CASO = {
  id: 'P-CASO-1',
  cargo: 'sdr',
  cenario: 'Uma paciente desmarca pela terceira vez.',
  formato: 'caso_aberto',
  tempo_est_min: null,
  status: 'ativo',
}
const REDACAO_1 = {
  id: 'R1',
  codigo: 'R1',
  texto: 'Conte uma situação em que você colaborou com a equipe.',
  valor_primario: null,
  is_padrao: true,
}
const ITENS_BF = [
  { item_id: 1, texto: 'Sou uma pessoa animada.', ordem: 1 },
  { item_id: 2, texto: 'Gosto de ordem.', ordem: 2 },
]

const renderCaso = () =>
  renderAt(
    '/candidato/avaliacao/CAND1/caso',
    '/candidato/avaliacao/:candidaturaId/caso',
    <SjtCasoAbertoScreen />,
  )
const renderBigFive = () =>
  renderAt(
    '/candidato/avaliacao/CAND1/bigfive',
    '/candidato/avaliacao/:candidaturaId/bigfive',
    <BigFiveQuestionnaireScreen />,
  )

describe('Big Five e Caso prático — memória → confirma (52-02 rodada 1 / CR-01, D-36 emendada)', () => {
  beforeEach(() => {
    state.locked = false
    state.perguntas = [PERGUNTA_CASO]
    state.opcoes = []
    state.redacoes = []
    state.itensBigfive = ITENS_BF
    state.flushNow = () => Promise.resolve()
  })

  it('Big Five, na introdução (nenhuma resposta) → direto à lista, sem diálogo', async () => {
    renderBigFive()
    await screen.findByRole('button', { name: 'Começar' })
    await sairDiretoSemGravar()
  })

  it('Big Five, numa página sem nenhuma resposta → direto à lista, sem diálogo', async () => {
    renderBigFive()
    fireEvent.click(await screen.findByRole('button', { name: 'Começar' }))
    await screen.findAllByRole('radio')
    await sairDiretoSemGravar()
  })

  it('Big Five, com 1 resposta → diálogo; «Continuar» MANTÉM a resposta; «Sair» vai à lista', async () => {
    renderBigFive()
    fireEvent.click(await screen.findByRole('button', { name: 'Começar' }))
    const primeira = (await screen.findAllByRole('radio'))[0]
    fireEvent.click(primeira)
    expect(primeira).toHaveAttribute('aria-checked', 'true')

    await abrirConfirmacao()

    // «Continuar» é o cancelar: fecha, fica na prova, a resposta e a contagem continuam.
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByText('SENTINELA-LISTA')).toBeNull()
    expect(screen.getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('1/2')).toBeInTheDocument()

    // De novo, agora «Sair»: chega à lista.
    fireEvent.click(screen.getByTestId('sair-da-prova'))
    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
  })

  it('Caso prático, sem texto → direto à lista, sem diálogo', async () => {
    renderCaso()
    await screen.findByRole('heading', { name: 'Caso prático' })
    await sairDiretoSemGravar()
  })

  it('Caso prático, só espaços e quebras de linha → direto à lista, sem diálogo', async () => {
    renderCaso()
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: '  \n\t ' } })
    const btn = await screen.findByTestId('sair-da-prova')
    fireEvent.click(btn)
    expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
    expect(screen.queryByText(TITULO_DIALOGO)).toBeNull()
  })

  it('Caso prático, com texto → diálogo; «Continuar» MANTÉM o texto; «Sair» vai à lista', async () => {
    renderCaso()
    const caixa = await screen.findByRole('textbox')
    fireEvent.change(caixa, { target: { value: 'Eu ligaria para ela.' } })

    await abrirConfirmacao()

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByText('SENTINELA-LISTA')).toBeNull()
    expect(screen.getByRole('textbox')).toHaveValue('Eu ligaria para ela.')

    fireEvent.click(screen.getByTestId('sair-da-prova'))
    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
  })
})

describe('Redação — a única tela que relê o rascunho: sai direto depois do flush (52-02 / D-24, D-36)', () => {
  beforeEach(() => {
    state.locked = false
    state.perguntas = []
    state.opcoes = []
    state.redacoes = [REDACAO_1]
    state.itensBigfive = []
    state.flushNow = () => Promise.resolve()
  })

  it('Redação, com texto escrito → flush, depois a lista; sem diálogo', async () => {
    renderAt('/candidato/redacao/CAND1', '/candidato/redacao/:candidaturaId', <RedacaoEditorScreen />)
    await screen.findByRole('heading', { name: 'Redação cultural' })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Numa semana de mutirão…' } })
    await sairDepoisDoFlush()
  })
})
