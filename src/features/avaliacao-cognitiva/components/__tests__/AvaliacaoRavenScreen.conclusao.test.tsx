/**
 * Phase 51 / Plan 51-07 (JORN-43 · D-13 · C-4) — concluir o Raven atualiza o que o painel lê.
 *
 * O card do painel (`RavenCandidatoCard`) e a tela do Raven leem do cache do React Query
 * (`staleTime` global de 5 min). Sem atualizar o cache no envio, o candidato concluía a prova,
 * clicava «Ir ao painel» e encontrava o MESMO convite «Fazer a avaliação» — dado de antes da
 * prova, ainda fresco — e, se clicasse, a tela também reabria a prova pela leitura em cache.
 *
 * O envio bem-sucedido grava 60 respostas numa transação, e o trigger da sexagésima calcula o
 * score na MESMA transação: depois do `submeterRaven` resolvido, «concluída» é fato do servidor.
 * A tela escreve isso nas duas entradas (`['avaliacao','status',id].raven.registrado` e
 * `['raven','liberacao',id].ja_respondeu`) e invalida a do status, para o servidor confirmar.
 *
 * @see src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))

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
const STATUS_KEY = ['avaliacao', 'status', CID]
const LIBERACAO_KEY = ['raven', 'liberacao', CID]

const CARD = { registrado: false, iniciado: false }
const STATUS_ANTES = {
  sjt_mc: CARD,
  sjt_caso_aberto: CARD,
  big_five: CARD,
  redacao: CARD,
  cognitivo: CARD,
  raven: { liberado: true, registrado: false },
}

/** Uma prova de UM item basta: o último item é o que dispara o envio. */
const UMA_QUESTAO = [
  {
    id: 'q1',
    numero_questao: 1,
    serie: 'A',
    imagem_matriz_url: '',
    opcoes_imagens: ['', '', '', '', '', ''],
  },
]

function montar() {
  const qc = new QueryClient({
    // o staleTime do app (5 min) — é ele que fazia o convite sobreviver à conclusão
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  })
  // o painel leu o status ANTES da prova: liberado e pendente
  qc.setQueryData(STATUS_KEY, STATUS_ANTES)
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/candidato/avaliacao-raciocinio/${CID}`]}>
        <Routes>
          <Route path="/candidato/avaliacao-raciocinio/:candidaturaId" element={<AvaliacaoRavenScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return qc
}

async function responderOUnicoItem() {
  fireEvent.click(await screen.findByRole('button', { name: 'Alternativa 1' }))
  fireEvent.click(screen.getByRole('button', { name: /Concluir avaliação/ }))
}

beforeEach(() => {
  vi.clearAllMocks()
  m.consultarLiberacao.mockResolvedValue({
    liberado: true,
    liberado_em: '2026-10-01T12:00:00Z',
    ja_respondeu: false,
  })
  m.listarQuestoesRaven.mockResolvedValue(UMA_QUESTAO)
})

describe('AvaliacaoRavenScreen — concluir atualiza o cache que o painel lê (51-07)', () => {
  it('envio ok → o status em cache passa a raven.registrado = true (o card do painel some)', async () => {
    m.submeterRaven.mockResolvedValue(undefined)
    const qc = montar()

    await responderOUnicoItem()
    expect(await screen.findByText('Avaliação concluída. Obrigado!')).toBeInTheDocument()

    await waitFor(() => {
      const st = qc.getQueryData<typeof STATUS_ANTES>(STATUS_KEY)
      expect(st?.raven).toEqual({ liberado: true, registrado: true })
    })
    // e os outros cards do status ficam como estavam
    expect(qc.getQueryData<typeof STATUS_ANTES>(STATUS_KEY)?.sjt_mc).toEqual(CARD)
  })

  it('envio ok → a liberação em cache passa a ja_respondeu = true (a tela não reabre a prova)', async () => {
    m.submeterRaven.mockResolvedValue(undefined)
    const qc = montar()

    await responderOUnicoItem()
    await screen.findByText('Avaliação concluída. Obrigado!')

    expect(qc.getQueryData<{ ja_respondeu: boolean }>(LIBERACAO_KEY)?.ja_respondeu).toBe(true)
  })

  it('envio com erro → o cache NÃO muda (a prova não foi registrada)', async () => {
    m.submeterRaven.mockRejectedValue(new Error('Não foi possível enviar suas respostas agora.'))
    const qc = montar()

    await responderOUnicoItem()
    await waitFor(() => expect(m.submeterRaven).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Concluir avaliação/ })).not.toBeDisabled(),
    )

    expect(qc.getQueryData<typeof STATUS_ANTES>(STATUS_KEY)?.raven).toEqual({
      liberado: true,
      registrado: false,
    })
    expect(qc.getQueryData<{ ja_respondeu: boolean }>(LIBERACAO_KEY)?.ja_respondeu).toBe(false)
  })
})
