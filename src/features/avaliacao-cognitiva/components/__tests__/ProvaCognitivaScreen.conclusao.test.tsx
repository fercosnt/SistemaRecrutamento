/**
 * Phase 51 / Plan 51-18 (TRACER · G2 do `51-GAPS-DECISAO.md` · WR-01 do `51-REVIEW.md` ·
 * JORN-46 / D-37) — concluir a prova cognitiva atualiza o que a LISTA de avaliações lê.
 *
 * O `AvaliacaoContainer` lê `['avaliacao','status',id]` do cache do React Query (`staleTime`
 * global de 5 min). O 51-01 fez de «Voltar às avaliações» o caminho padrão depois do envio — e a
 * lista voltava com o status de ANTES da prova, ainda fresco: o card «Prova cognitiva» seguia em
 * «Começar avaliação», e refazer sobrescrevia a banda que o RH vê.
 *
 * O tracer vai da tela da prova até a lista REAL: envio → cache → «Voltar às avaliações» →
 * `AvaliacaoContainer` (não um dublê do card) com o card em «Concluído» e sem convite.
 * Bordas: envio `'locked'` ou com erro NÃO escreve nem invalida o cache.
 *
 * Molde: `AvaliacaoRavenScreen.conclusao.test.tsx` (51-07).
 *
 * @see src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
 * @see src/features/avaliacao/lib/avaliacaoStatusCache.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ logout: vi.fn(() => Promise.resolve()) }),
  useCandidato: () => ({ nome_completo: 'Maria Teste', email: 'maria@teste.com' }),
}))

const m = vi.hoisted(() => ({
  getContexto: vi.fn(),
  listItens: vi.fn(),
  submitProva: vi.fn(),
  getAvaliacaoContext: vi.fn(),
  getAvaliacaoStatus: vi.fn(),
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

vi.mock('@/features/avaliacao/services/avaliacaoService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/avaliacao/services/avaliacaoService')>()
  return {
    ...actual,
    getAvaliacaoContext: m.getAvaliacaoContext,
    getAvaliacaoStatus: m.getAvaliacaoStatus,
  }
})

import { ProvaCognitivaScreen } from '../ProvaCognitivaScreen'
import { AvaliacaoContainer } from '@/features/avaliacao/components/AvaliacaoContainer'

const CID = 'CAND1'
const STATUS_KEY = ['avaliacao', 'status', CID]

const CARD = { registrado: false, iniciado: false }
/** O status que a lista leu ANTES da prova: tudo pendente. */
const STATUS_ANTES = {
  sjt_mc: CARD,
  sjt_caso_aberto: CARD,
  big_five: CARD,
  redacao: CARD,
  cognitivo: CARD,
  raven: { liberado: false, registrado: false },
}
/** A verdade do servidor DEPOIS do envio. */
const STATUS_SERVIDOR_DEPOIS = { ...STATUS_ANTES, cognitivo: { registrado: true, iniciado: false } }

/**
 * Um card pendente além do cognitivo (Big Five): sem ele, um cognitivo concluído levaria a lista
 * ao estado «Tudo concluído!», que não mostra cards — e o tracer quer ver o CARD em «Concluído».
 */
const CONTEXTO_LISTA = {
  candidatura: { id: CID, status: 'em_andamento', etapa_atual: 'avaliacao_assincrona', vaga_id: 'V1' },
  testes_aplicaveis: [{ teste: 'big_five' }],
  perguntas: [],
  aplica_cognitivo: true,
}

const CTX_PROVA = {
  candidatura_id: CID,
  vaga_id: 'V1',
  etapa_atual: 'avaliacao_assincrona',
  aplica_cognitivo: true,
}
const UM_ITEM = [{ id: 'i1', secao: 'matriz', enunciado: 'Qual completa?', alternativas: ['A', 'B'], ordem: 1 }]

function montar() {
  const qc = new QueryClient({
    // o staleTime do app (5 min) — é ele que fazia a lista de antes sobreviver à conclusão
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  })
  // a lista leu o status ANTES da prova: cognitivo pendente
  qc.setQueryData(STATUS_KEY, structuredClone(STATUS_ANTES))
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/candidato/prova-cognitiva/${CID}`]}>
        <Routes>
          <Route path="/candidato/prova-cognitiva/:candidaturaId" element={<ProvaCognitivaScreen />} />
          <Route path="/candidato/avaliacao/:candidaturaId" element={<AvaliacaoContainer />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return qc
}

async function responderEEnviar() {
  fireEvent.click(await screen.findByRole('radio', { name: 'A' }))
  fireEvent.click(screen.getByRole('button', { name: 'Concluir prova' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Enviar prova' }))
}

/** O maior ancestral do título que ainda contém UM só título de card — o próprio card. */
function cardDe(titulo: HTMLElement): HTMLElement {
  let el: HTMLElement = titulo
  while (el.parentElement && el.parentElement.querySelectorAll('h3').length === 1) {
    el = el.parentElement
  }
  return el
}

beforeEach(() => {
  vi.clearAllMocks()
  m.getContexto.mockResolvedValue(CTX_PROVA)
  m.listItens.mockResolvedValue(UM_ITEM)
  m.getAvaliacaoContext.mockResolvedValue(CONTEXTO_LISTA)
  m.getAvaliacaoStatus.mockResolvedValue(STATUS_SERVIDOR_DEPOIS)
})

describe('ProvaCognitivaScreen — concluir escreve a conclusão no cache da lista (51-18 / G2)', () => {
  it('envio ok → cognitivo.registrado = true no cache, entrada invalidada, tela «Prova registrada»', async () => {
    m.submitProva.mockResolvedValue('registrado')
    const qc = montar()

    await responderEEnviar()
    expect(await screen.findByText(/Prova registrada\./)).toBeInTheDocument()

    const st = qc.getQueryData<typeof STATUS_ANTES>(STATUS_KEY)
    expect(st?.cognitivo).toEqual({ registrado: true, iniciado: false })
    expect(qc.getQueryState(STATUS_KEY)?.isInvalidated).toBe(true)
    // os outros cards e o raven ficam como estavam
    expect({ ...st, cognitivo: CARD }).toEqual(STATUS_ANTES)
  })

  it('TRACER: «Voltar às avaliações» abre a lista REAL com «Prova cognitiva» em «Concluído» e sem «Começar avaliação»', async () => {
    m.submitProva.mockResolvedValue('registrado')
    montar()

    await responderEEnviar()
    await screen.findByText(/Prova registrada\./)
    fireEvent.click(screen.getByRole('button', { name: 'Voltar às avaliações' }))

    // a lista real montou (o Big Five é o outro card, pendente)
    await screen.findByRole('heading', { name: 'Avaliação comportamental' })
    const card = cardDe(screen.getByRole('heading', { name: 'Prova cognitiva' }))
    // asserta pelo texto do card inteiro: sem o conserto, a falha mostra o que a lista ofereceu
    // («Pendente» + «Começar avaliação» — o status de antes, fresco no cache)
    await waitFor(() => expect(card.textContent).toContain('Concluído'))
    expect(within(card).getByText('Concluído')).toBeInTheDocument()
    expect(card.textContent).not.toContain('Começar avaliação')
    expect(within(card).queryByText('Continuar avaliação')).toBeNull()
  })

  it.each([
    ['locked', () => m.submitProva.mockResolvedValue('locked'), /Sua etapa avançou\./],
    ['erro', () => m.submitProva.mockRejectedValue(new Error('rede')), null],
  ] as const)('envio %s → o cache fica idêntico ao semeado e não é invalidado', async (_nome, armar, texto) => {
    armar()
    const qc = montar()

    await responderEEnviar()
    await waitFor(() => expect(m.submitProva).toHaveBeenCalled())
    if (texto) {
      expect(await screen.findByText(texto)).toBeInTheDocument()
    } else {
      // o erro devolve o botão de concluir habilitado (a prova não foi registrada)
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Concluir prova' })).not.toBeDisabled(),
      )
    }
    expect(screen.queryByText(/Prova registrada\./)).toBeNull()

    expect(qc.getQueryData(STATUS_KEY)).toEqual(STATUS_ANTES)
    expect(qc.getQueryState(STATUS_KEY)?.isInvalidated).toBe(false)
  })
})
