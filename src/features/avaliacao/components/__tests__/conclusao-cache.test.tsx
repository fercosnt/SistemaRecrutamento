/**
 * Phase 51 / Plan 51-18 (G2 do `51-GAPS-DECISAO.md` · WR-01 do `51-REVIEW.md` · JORN-46) —
 * caso aberto do SJT, envio final do Big Five e ÚLTIMO envio da Redação escrevem a conclusão
 * na entrada `['avaliacao','status',id]` que a lista de avaliações lê do cache (5 min).
 *
 * Cada caso:
 *  - sucesso → `registrado: true` SÓ no card da prova, entrada invalidada, e isso já está no
 *    cache QUANDO a próxima tela monta (a rota-sentinela lê o cache no próprio render — prova
 *    de que a escrita veio ANTES da navegação);
 *  - `LOCKED` → cache idêntico ao semeado e não invalidado (a lista não pode dizer «Concluído»
 *    de uma prova que o servidor recusou);
 *  - Redação com duas perguntas: o 1º envio NÃO toca o status (só `redacaoKeys.minhas`, como
 *    antes); o envio que completa o conjunto escreve e invalida.
 * Em todos: as outras folhas e `raven` ficam como estavam; toda folha continua booleana.
 *
 * Mocks no idioma do `navegacao-provas.test.tsx` (51-01).
 *
 * @see src/features/avaliacao/lib/avaliacaoStatusCache.ts
 */
import type { ReactElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import '@testing-library/jest-dom'

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))

const m = vi.hoisted(() => ({
  avaliarRedacao: vi.fn(),
  enviarRedacao: vi.fn(),
  submitBigfiveFinal: vi.fn(),
  getRedacaoContext: vi.fn(),
}))

vi.mock('@/features/avaliacao/hooks/useAutosaveAvaliacao', () => ({
  useAutosaveAvaliacao: () => ({
    update: vi.fn(),
    flushNow: vi.fn(() => Promise.resolve()),
    status: 'idle',
    locked: false,
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
        perguntas: [
          { id: 'PCA', cargo: 'x', cenario: 'Um caso prático.', formato: 'caso_aberto', tempo_est_min: 15, status: 'ativa' },
        ],
      }),
    ),
    avaliarRedacao: m.avaliarRedacao,
    upsertResposta: vi.fn(() => Promise.resolve()),
    loadResposta: vi.fn(() => Promise.resolve(null)),
  }
})

vi.mock('@/features/avaliacao/services/redacaoService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao/services/redacaoService')>()
  return {
    ...actual,
    getRedacaoContext: m.getRedacaoContext,
    getMinhasRedacoes: vi.fn(() => Promise.resolve([])),
    enviarRedacao: m.enviarRedacao,
  }
})

vi.mock('@/features/avaliacao/services/bigfiveService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao/services/bigfiveService')>()
  return {
    ...actual,
    getBigfiveItens: vi.fn(() => Promise.resolve([{ item_id: 1, texto: 'Sou comunicativo.', ordem: 1 }])),
    submitBigfiveFinal: m.submitBigfiveFinal,
  }
})

import { AvaliacaoServiceError } from '@/features/avaliacao/services/avaliacaoService'
import { RedacaoServiceError } from '@/features/avaliacao/services/redacaoService'
import { BigfiveServiceError } from '@/features/avaliacao/services/bigfiveService'
import { SjtCasoAbertoScreen } from '../SjtCasoAbertoScreen'
import { BigFiveQuestionnaireScreen } from '../BigFiveQuestionnaireScreen'
import { RedacaoEditorScreen } from '../RedacaoEditorScreen'

const CID = 'CAND1'
const STATUS_KEY = ['avaliacao', 'status', CID]
const CARD = { registrado: false, iniciado: false }
const STATUS_ANTES = {
  sjt_mc: { registrado: true, iniciado: false },
  sjt_caso_aberto: { registrado: false, iniciado: true },
  big_five: { registrado: false, iniciado: true },
  redacao: { registrado: false, iniciado: true },
  cognitivo: CARD,
  raven: { liberado: true, registrado: false },
}
type Status = typeof STATUS_ANTES
type Card = Exclude<keyof Status, 'raven'>

/** Texto entre 200 e 500 palavras (o envio só habilita nessa faixa). */
const TEXTO_VALIDO = Array.from({ length: 220 }, (_, i) => `palavra${i}`).join(' ')

/**
 * Rota-sentinela que lê o cache NO PRÓPRIO RENDER: o texto prova o que já estava escrito
 * quando a navegação aconteceu (a escrita tem de vir antes dela).
 */
function Sentinela({ nome, card }: { nome: string; card: Card }) {
  const qc = useQueryClient()
  const st = qc.getQueryData<Status>(STATUS_KEY)
  return <p>{`${nome}:registrado=${String(st?.[card]?.registrado)}`}</p>
}

function montar(entry: string, pattern: string, ui: ReactElement, card: Card) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  })
  qc.setQueryData(STATUS_KEY, structuredClone(STATUS_ANTES))
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={pattern} element={ui} />
          <Route path="/candidato/avaliacao/:candidaturaId" element={<Sentinela nome="LISTA" card={card} />} />
          <Route
            path="/candidato/avaliacao/:candidaturaId/bigfive/devolutiva"
            element={<Sentinela nome="DEVOLUTIVA" card={card} />}
          />
          <Route path="/candidato/dashboard" element={<p>SENTINELA-PAINEL</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return qc
}

/** Toda folha do status é booleana — nenhum número (score/banda) entrou no cache. */
function folhas(obj: unknown): unknown[] {
  if (obj === null || typeof obj !== 'object') return [obj]
  return Object.values(obj as Record<string, unknown>).flatMap(folhas)
}

function esperarSoOCard(qc: QueryClient, card: Card) {
  const st = qc.getQueryData<Status>(STATUS_KEY)
  expect(st).toEqual({ ...STATUS_ANTES, [card]: { ...STATUS_ANTES[card], registrado: true } })
  expect(qc.getQueryState(STATUS_KEY)?.isInvalidated).toBe(true)
  for (const f of folhas(st)) expect(typeof f).toBe('boolean')
}

function esperarIntacto(qc: QueryClient) {
  expect(qc.getQueryData(STATUS_KEY)).toEqual(STATUS_ANTES)
  expect(qc.getQueryState(STATUS_KEY)?.isInvalidated).toBe(false)
}

async function escreverEConfirmar(botaoEnviar: string) {
  fireEvent.change(await screen.findByRole('textbox'), { target: { value: TEXTO_VALIDO } })
  const btn = await screen.findByRole('button', { name: botaoEnviar })
  await waitFor(() => expect(btn).not.toBeDisabled())
  fireEvent.click(btn)
  fireEvent.click(await screen.findByRole('button', { name: 'Enviar' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  m.getRedacaoContext.mockResolvedValue([
    { id: 'R1', codigo: 'r1', texto: 'Pergunta um?', valor_primario: null, is_padrao: true },
    { id: 'R2', codigo: 'r2', texto: 'Pergunta dois?', valor_primario: null, is_padrao: true },
  ])
})

// ── Caso aberto do SJT ────────────────────────────────────────────────────────────
const montarCaso = () =>
  montar(
    `/candidato/avaliacao/${CID}/caso`,
    '/candidato/avaliacao/:candidaturaId/caso',
    <SjtCasoAbertoScreen />,
    'sjt_caso_aberto',
  )

describe('SjtCasoAbertoScreen — envio escreve a conclusão no cache (51-18 / G2)', () => {
  it('sucesso → sjt_caso_aberto.registrado = true e invalidada ANTES de ir à lista', async () => {
    m.avaliarRedacao.mockResolvedValue({ ok: true })
    const qc = montarCaso()

    await escreverEConfirmar('Enviar resposta')

    expect(await screen.findByText('LISTA:registrado=true')).toBeInTheDocument()
    esperarSoOCard(qc, 'sjt_caso_aberto')
  })

  it('LOCKED → cache idêntico e não invalidado', async () => {
    m.avaliarRedacao.mockRejectedValue(new AvaliacaoServiceError('etapa avançou', 'LOCKED'))
    const qc = montarCaso()

    await escreverEConfirmar('Enviar resposta')

    expect(await screen.findByText('SENTINELA-PAINEL')).toBeInTheDocument()
    esperarIntacto(qc)
  })
})

// ── Big Five ──────────────────────────────────────────────────────────────────────
const montarBigFive = () =>
  montar(
    `/candidato/avaliacao/${CID}/bigfive`,
    '/candidato/avaliacao/:candidaturaId/bigfive',
    <BigFiveQuestionnaireScreen />,
    'big_five',
  )

async function responderBigFiveEEnviar() {
  fireEvent.click(await screen.findByRole('button', { name: 'Começar' }))
  fireEvent.click((await screen.findAllByRole('radio'))[2])
  const btn = await screen.findByRole('button', { name: 'Concluir avaliação' })
  await waitFor(() => expect(btn).not.toBeDisabled())
  fireEvent.click(btn)
  fireEvent.click(await screen.findByRole('button', { name: 'Enviar' }))
}

describe('BigFiveQuestionnaireScreen — envio final escreve a conclusão no cache (51-18 / G2)', () => {
  it('sucesso → big_five.registrado = true e invalidada ANTES de ir à devolutiva', async () => {
    m.submitBigfiveFinal.mockResolvedValue({ ok: true })
    const qc = montarBigFive()

    await responderBigFiveEEnviar()

    expect(await screen.findByText('DEVOLUTIVA:registrado=true')).toBeInTheDocument()
    esperarSoOCard(qc, 'big_five')
  })

  it('LOCKED → cache idêntico e não invalidado', async () => {
    m.submitBigfiveFinal.mockRejectedValue(new BigfiveServiceError('etapa avançou', 'LOCKED'))
    const qc = montarBigFive()

    await responderBigFiveEEnviar()

    expect(await screen.findByText('SENTINELA-PAINEL')).toBeInTheDocument()
    esperarIntacto(qc)
  })
})

// ── Redação (duas perguntas) ─────────────────────────────────────────────────────
const montarRedacao = () =>
  montar(`/candidato/redacao/${CID}`, '/candidato/redacao/:candidaturaId', <RedacaoEditorScreen />, 'redacao')

describe('RedacaoEditorScreen — só o envio que completa o conjunto escreve no cache (51-18 / G2)', () => {
  it('1º envio NÃO toca o status; o 2º (último) escreve redacao.registrado = true e invalida', async () => {
    m.enviarRedacao.mockResolvedValue({ ok: true })
    const qc = montarRedacao()

    await escreverEConfirmar('Enviar redação')
    await waitFor(() => expect(m.enviarRedacao).toHaveBeenCalledTimes(1))
    // a tela passou à 2ª pergunta: o conjunto ainda não está completo
    expect(await screen.findByText('Pergunta dois?')).toBeInTheDocument()
    esperarIntacto(qc)
    // o contador (debounce de 200 ms) tem de ver a caixa vazia antes do novo texto — senão a
    // validade não muda de lado e o botão da 2ª pergunta segue desabilitado
    expect(await screen.findByText(/^0 palavras/)).toBeInTheDocument()

    await escreverEConfirmar('Enviar redação')
    expect(await screen.findByText('Redações concluídas.')).toBeInTheDocument()
    expect(m.enviarRedacao).toHaveBeenCalledTimes(2)
    esperarSoOCard(qc, 'redacao')
  })

  it('LOCKED → cache idêntico e não invalidado', async () => {
    m.getRedacaoContext.mockResolvedValue([
      { id: 'R1', codigo: 'r1', texto: 'Pergunta um?', valor_primario: null, is_padrao: true },
    ])
    m.enviarRedacao.mockRejectedValue(new RedacaoServiceError('etapa avançou', 'LOCKED'))
    const qc = montarRedacao()

    await escreverEConfirmar('Enviar redação')

    expect(await screen.findByText('SENTINELA-PAINEL')).toBeInTheDocument()
    esperarIntacto(qc)
  })
})
