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
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const state = vi.hoisted(() => ({ locked: false }))

vi.mock('@/features/avaliacao/hooks/useAutosaveAvaliacao', () => ({
  useAutosaveAvaliacao: () => ({
    update: vi.fn(),
    flushNow: vi.fn(() => Promise.resolve()),
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
        perguntas: [],
      }),
    ),
    getOpcoesSjt: vi.fn(() => Promise.resolve([])),
    upsertResposta: vi.fn(() => Promise.resolve()),
    loadResposta: vi.fn(() => Promise.resolve(null)),
  }
})

vi.mock('@/features/avaliacao/services/redacaoService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao/services/redacaoService')>()
  return {
    ...actual,
    getRedacaoContext: vi.fn(() => Promise.resolve([])),
    getMinhasRedacoes: vi.fn(() => Promise.resolve([])),
  }
})

vi.mock('@/features/avaliacao/services/bigfiveService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao/services/bigfiveService')>()
  return {
    ...actual,
    getBigfiveItens: vi.fn(() => Promise.resolve([])),
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
