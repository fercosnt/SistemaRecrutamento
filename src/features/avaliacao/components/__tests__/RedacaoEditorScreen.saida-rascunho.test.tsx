/**
 * Phase 52 / Plan 52-02 — rodada 1 do portão do bloco B (WR-01 do `52-REVIEW-PORTAO-1.md`;
 * decisão do operador em `52-14-DECISAO-RODADA-1.md`, P2).
 *
 * O defeito: o `flushNow` do `useAutosaveAvaliacao` grava `upsert({...buffer})` SEMPRE, mesmo
 * sem edição. Na Redação o buffer só é semeado quando o `loadResposta` responde e o rascunho
 * é da pergunta atual. Então «Voltar às avaliações» (ou só tocar e soltar a caixa) ANTES de a
 * releitura voltar gravava `{}` por cima do rascunho salvo — e, com rascunho de OUTRA
 * pergunta, o buffer nunca era semeado e a saída o apagava para sempre.
 *
 * Aqui o hook é o REAL (nenhum mock dele): o que se observa é a chamada ao `upsertResposta`,
 * a escrita em `respostas_avaliacao`. Os controles positivos provam que o conserto não
 * desligou o flush de quem editou.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))

type Linha = { respostas: unknown } | null

const m = vi.hoisted(() => ({
  upsertResposta: vi.fn(),
  loadResposta: vi.fn(),
}))

vi.mock('@/features/avaliacao/services/avaliacaoService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao/services/avaliacaoService')>()
  return {
    ...actual,
    upsertResposta: m.upsertResposta,
    loadResposta: m.loadResposta,
  }
})

vi.mock('@/features/avaliacao/services/redacaoService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao/services/redacaoService')>()
  return {
    ...actual,
    getRedacaoContext: vi.fn(() =>
      Promise.resolve([
        {
          id: 'R1',
          codigo: 'R1',
          texto: 'Conte uma situação em que você colaborou com a equipe.',
          valor_primario: null,
          is_padrao: true,
        },
      ]),
    ),
    getMinhasRedacoes: vi.fn(() => Promise.resolve([])),
  }
})

import { RedacaoEditorScreen } from '../RedacaoEditorScreen'

const SALVO = 'Rascunho de vinte minutos que já estava no banco.'

/** `loadResposta` que só responde quando o teste manda. */
function leituraPendente() {
  let responder: (l: Linha) => void = () => {}
  m.loadResposta.mockImplementation(
    () =>
      new Promise<Linha>((r) => {
        responder = r
      }),
  )
  return { responder: (l: Linha) => responder(l) }
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/candidato/redacao/CAND1']}>
        <Routes>
          <Route path="/candidato/redacao/:candidaturaId" element={<RedacaoEditorScreen />} />
          <Route path="/candidato/avaliacao/:candidaturaId" element={<p>SENTINELA-LISTA</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function sair() {
  fireEvent.click(await screen.findByTestId('sair-da-prova'))
  expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
}

/** Todo payload que chegou ao banco. */
const gravados = () => m.upsertResposta.mock.calls.map((c) => c[2] as Record<string, unknown>)

describe('Redação — sair não grava vazio por cima do rascunho (52-02 rodada 1 / WR-01)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    m.upsertResposta.mockReset()
    m.upsertResposta.mockResolvedValue({ error: null })
    m.loadResposta.mockReset()
  })

  it('sair ANTES de a releitura do rascunho responder → nenhuma escrita (nem `{}`)', async () => {
    const leitura = leituraPendente()
    montar()
    await screen.findByRole('heading', { name: 'Redação cultural' })
    await waitFor(() => expect(m.loadResposta).toHaveBeenCalledTimes(1))

    await sair()
    expect(gravados()).toEqual([])

    // A releitura tardia (tela já desmontada) também não vira escrita vazia.
    await act(async () => {
      leitura.responder({ respostas: { pergunta_id: 'R1', texto: SALVO } })
    })
    expect(gravados().some((p) => Object.keys(p).length === 0)).toBe(false)
  })

  it('tocar a caixa e sair antes da releitura (blur + saída) → nenhuma escrita', async () => {
    leituraPendente()
    montar()
    const caixa = await screen.findByRole('textbox')
    fireEvent.focus(caixa)
    fireEvent.blur(caixa)
    await sair()
    expect(gravados()).toEqual([])
  })

  it('rascunho de OUTRA pergunta (buffer nunca semeado) → sair não o apaga', async () => {
    m.loadResposta.mockResolvedValue({ respostas: { pergunta_id: 'R2', texto: SALVO } })
    montar()
    await screen.findByRole('heading', { name: 'Redação cultural' })
    await waitFor(() => expect(m.loadResposta).toHaveBeenCalledTimes(1))
    await act(async () => {})
    await sair()
    expect(gravados()).toEqual([])
  })

  it('controle: rascunho relido e nenhuma edição → o que for gravado é o próprio rascunho, nunca `{}`', async () => {
    m.loadResposta.mockResolvedValue({ respostas: { pergunta_id: 'R1', texto: SALVO } })
    montar()
    expect(await screen.findByDisplayValue(SALVO)).toBeInTheDocument()
    await sair()
    for (const p of gravados()) expect(p).toEqual({ pergunta_id: 'R1', texto: SALVO })
  })

  it('controle: com edição → o texto digitado é gravado ANTES de a tela navegar', async () => {
    m.loadResposta.mockResolvedValue(null)
    let gravouAntesDeNavegar: boolean | null = null
    m.upsertResposta.mockImplementation(() => {
      gravouAntesDeNavegar = screen.queryByText('SENTINELA-LISTA') === null
      return Promise.resolve({ error: null })
    })
    montar()
    await waitFor(() => expect(m.loadResposta).toHaveBeenCalledTimes(1))
    fireEvent.change(await screen.findByRole('textbox'), {
      target: { value: 'Numa semana de mutirão, dividi as tarefas.' },
    })
    await sair()
    expect(gravados()[0]).toEqual({
      pergunta_id: 'R1',
      texto: 'Numa semana de mutirão, dividi as tarefas.',
    })
    expect(gravouAntesDeNavegar).toBe(true)
  })
})
