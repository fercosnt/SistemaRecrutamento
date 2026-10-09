/**
 * Phase 51 / Plan 51-01 — D-37 (posição da tela decide o rótulo) + D-15 (nomes).
 *
 *  - `ProvaCognitivaScreen` vive DENTRO do container de avaliações: os estados de
 *    dentro da prova dizem «Voltar às avaliações» e vão à lista
 *    (`/candidato/avaliacao/:id`); o estado «Sua etapa avançou» diz «Ir ao painel» e
 *    vai DIRETO a `/candidato/dashboard`. Título: «Prova cognitiva»; a introdução não
 *    usa «raciocínio lógico» (esse nome é do Raven).
 *  - `AvaliacaoRavenScreen` vive FORA do container (liberação nominal, sem etapa):
 *    «Ir ao painel» → `/candidato/dashboard`. Título: «Raciocínio lógico (Matrizes)».
 *
 * Navegação REAL (MemoryRouter com rotas-sentinela): prova-se a tela a que o clique chega.
 */
import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const m = vi.hoisted(() => ({
  getContexto: vi.fn(),
  listItens: vi.fn(),
  submitProva: vi.fn(),
  consultarLiberacao: vi.fn(),
  listarQuestoesRaven: vi.fn(),
}))

vi.mock('@/features/avaliacao-cognitiva/services/cognitivoService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao-cognitiva/services/cognitivoService')>()
  return {
    ...actual,
    getContexto: m.getContexto,
    listItens: m.listItens,
    submitProva: m.submitProva,
  }
})

vi.mock('@/features/avaliacao-cognitiva/services/ravenService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao-cognitiva/services/ravenService')>()
  return {
    ...actual,
    consultarLiberacao: m.consultarLiberacao,
    listarQuestoesRaven: m.listarQuestoesRaven,
  }
})

import { ProvaCognitivaScreen } from '../ProvaCognitivaScreen'
import { AvaliacaoRavenScreen } from '../AvaliacaoRavenScreen'

const VOLTAR_AVALIACOES = 'Voltar às avaliações'
const IR_AO_PAINEL = 'Ir ao painel'

const CTX = (aplica: boolean) => ({
  candidatura_id: 'CAND1',
  vaga_id: 'V1',
  etapa_atual: 'avaliacao_assincrona',
  aplica_cognitivo: aplica,
})
const UM_ITEM = [{ id: 'i1', secao: 'matriz', enunciado: 'Qual completa?', alternativas: ['A', 'B'], ordem: 1 }]

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

const renderProva = () =>
  renderAt('/candidato/prova-cognitiva/CAND1', '/candidato/prova-cognitiva/:candidaturaId', <ProvaCognitivaScreen />)

async function clicarEChegar(rotulo: string, sentinela: 'SENTINELA-LISTA' | 'SENTINELA-PAINEL') {
  const btn = await screen.findByRole('button', { name: rotulo })
  expect(document.body.textContent ?? '').not.toMatch(/Voltar ao painel/)
  fireEvent.click(btn)
  expect(await screen.findByText(sentinela)).toBeInTheDocument()
}

async function responderEEnviar() {
  fireEvent.click(await screen.findByRole('radio', { name: 'A' }))
  fireEvent.click(screen.getByRole('button', { name: 'Concluir prova' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Enviar prova' }))
}

describe('ProvaCognitivaScreen — nome e destino (51-01 / D-15, D-37)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.listItens.mockResolvedValue(UM_ITEM)
  })

  it('o título é «Prova cognitiva» e a introdução não diz «raciocínio lógico»', async () => {
    m.getContexto.mockResolvedValue(CTX(true))
    renderProva()
    expect(await screen.findByRole('heading', { name: 'Prova cognitiva' })).toBeInTheDocument()
    expect(document.body.textContent ?? '').not.toMatch(/racioc[ií]nio l[oó]gico/i)
  })

  it('vaga sem prova cognitiva → «Voltar às avaliações» vai à lista', async () => {
    m.getContexto.mockResolvedValue(CTX(false))
    renderProva()
    await clicarEChegar(VOLTAR_AVALIACOES, 'SENTINELA-LISTA')
  })

  it('sem itens → «Voltar às avaliações» vai à lista', async () => {
    m.getContexto.mockResolvedValue(CTX(true))
    m.listItens.mockResolvedValue([])
    renderProva()
    await clicarEChegar(VOLTAR_AVALIACOES, 'SENTINELA-LISTA')
  })

  it('prova registrada → «Voltar às avaliações» vai à lista', async () => {
    m.getContexto.mockResolvedValue(CTX(true))
    m.submitProva.mockResolvedValue('registrado')
    renderProva()
    await responderEEnviar()
    expect(await screen.findByText(/Prova registrada\./)).toBeInTheDocument()
    await clicarEChegar(VOLTAR_AVALIACOES, 'SENTINELA-LISTA')
  })

  it('«Sua etapa avançou» (envio bloqueado) → «Ir ao painel» vai DIRETO ao painel', async () => {
    m.getContexto.mockResolvedValue(CTX(true))
    m.submitProva.mockResolvedValue('locked')
    renderProva()
    await responderEEnviar()
    expect(await screen.findByText(/Sua etapa avançou\./)).toBeInTheDocument()
    expect(screen.queryByText(/Prova registrada\./)).toBeNull()
    await clicarEChegar(IR_AO_PAINEL, 'SENTINELA-PAINEL')
  })
})

describe('AvaliacaoRavenScreen — nome e destino (51-01 / D-15, D-37)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.listarQuestoesRaven.mockResolvedValue([])
  })

  it('não liberado: título «Raciocínio lógico (Matrizes)» e «Ir ao painel» vai ao painel', async () => {
    m.consultarLiberacao.mockResolvedValue({ liberado: false, liberado_em: null, ja_respondeu: false })
    renderAt(
      '/candidato/avaliacao-raciocinio/CAND1',
      '/candidato/avaliacao-raciocinio/:candidaturaId',
      <AvaliacaoRavenScreen />,
    )
    expect(
      await screen.findByRole('heading', { name: 'Raciocínio lógico (Matrizes)' }),
    ).toBeInTheDocument()
    await clicarEChegar(IR_AO_PAINEL, 'SENTINELA-PAINEL')
  })

  it('já respondeu: «Ir ao painel» vai ao painel', async () => {
    m.consultarLiberacao.mockResolvedValue({ liberado: true, liberado_em: '2026-10-01', ja_respondeu: true })
    renderAt(
      '/candidato/avaliacao-raciocinio/CAND1',
      '/candidato/avaliacao-raciocinio/:candidaturaId',
      <AvaliacaoRavenScreen />,
    )
    await clicarEChegar(IR_AO_PAINEL, 'SENTINELA-PAINEL')
  })
})
