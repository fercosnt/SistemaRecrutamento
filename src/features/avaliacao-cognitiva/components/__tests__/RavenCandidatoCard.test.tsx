/**
 * Phase 51 / Plan 51-07 (JORN-43 · D-13 · C-4) — o card do «Raciocínio lógico (Matrizes)» no
 * painel do candidato.
 *
 * O Raven não tinha porta de entrada: a rota `/candidato/avaliacao-raciocinio/:id` existia, e
 * nenhuma tela do candidato levava a ela. O card abre essa porta — e só enquanto ela leva a
 * algum lugar. As asserções que importam são as de AUSÊNCIA: um convite para uma prova que o
 * servidor recusaria (concluída, revogada, candidatura encerrada) é pior que nenhum convite.
 *
 * A fonte é a chave `raven` de `get_avaliacao_status` (51-06): só booleanos, do próprio titular.
 * `getAvaliacaoStatus` é mockado; a query é a de verdade (QueryClient real, sem retry).
 *
 * @see src/features/avaliacao-cognitiva/components/RavenCandidatoCard.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

const getAvaliacaoStatus = vi.fn()
vi.mock('@/features/avaliacao/services/avaliacaoService', () => ({
  getAvaliacaoStatus: (id: string) => getAvaliacaoStatus(id),
}))

import { RavenCandidatoCard } from '../RavenCandidatoCard'

const CID = 'cand-raven-1'
/** A MESMA chave que o `AvaliacaoContainer` usa para `getAvaliacaoStatus`. */
const STATUS_KEY = ['avaliacao', 'status', CID]

function statusCom(raven: { liberado: boolean; registrado: boolean }) {
  const card = { registrado: false, iniciado: false }
  return {
    sjt_mc: card,
    sjt_caso_aberto: card,
    big_five: card,
    redacao: card,
    cognitivo: card,
    raven,
  }
}

function montar(
  props: { etapaAtual: string; status: string },
  onParentClick = vi.fn(),
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={qc}>
      {/* o cartão-pai do painel navega para a vaga ao clique — o card não pode propagar */}
      <div data-testid="cartao-pai" onClick={onParentClick}>
        <RavenCandidatoCard candidaturaId={CID} etapaAtual={props.etapaAtual} status={props.status} />
      </div>
    </QueryClientProvider>,
  )
  return { ...utils, qc, onParentClick }
}

const EM_ANDAMENTO = { etapaAtual: 'decisao_final', status: 'em_avaliacao' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RavenCandidatoCard — liberado e pendente, candidatura em andamento (D-13)', () => {
  it('renderiza o card com o título, a linha e o botão', async () => {
    getAvaliacaoStatus.mockResolvedValue(statusCom({ liberado: true, registrado: false }))
    montar(EM_ANDAMENTO)

    const card = await screen.findByTestId('raven-candidato-card')
    expect(card).toHaveTextContent('Raciocínio lógico (Matrizes)')
    expect(card).toHaveTextContent('A equipe liberou esta avaliação para a sua candidatura.')
    expect(screen.getByRole('button', { name: /Fazer a avaliação/ })).toBeInTheDocument()
    expect(getAvaliacaoStatus).toHaveBeenCalledWith(CID)
  })

  it('o botão leva a /candidato/avaliacao-raciocinio/<id> e NÃO propaga ao cartão-pai', async () => {
    getAvaliacaoStatus.mockResolvedValue(statusCom({ liberado: true, registrado: false }))
    const { onParentClick } = montar(EM_ANDAMENTO)

    await userEvent.click(await screen.findByRole('button', { name: /Fazer a avaliação/ }))

    expect(navigate).toHaveBeenCalledWith(`/candidato/avaliacao-raciocinio/${CID}`)
    expect(onParentClick).not.toHaveBeenCalled()
  })
})

describe('RavenCandidatoCard — os cinco casos de ausência (D-13, T-51-25)', () => {
  it('concluído (registrado = true) → nada', async () => {
    getAvaliacaoStatus.mockResolvedValue(statusCom({ liberado: true, registrado: true }))
    const { qc, container } = montar(EM_ANDAMENTO)

    await waitFor(() => expect(qc.getQueryState(STATUS_KEY)?.status).toBe('success'))
    expect(screen.queryByTestId('raven-candidato-card')).toBeNull()
    expect(container.querySelector('[data-testid="cartao-pai"]')?.childElementCount).toBe(0)
  })

  it('não liberado ou revogado (liberado = false) → nada', async () => {
    getAvaliacaoStatus.mockResolvedValue(statusCom({ liberado: false, registrado: false }))
    const { qc, container } = montar(EM_ANDAMENTO)

    await waitFor(() => expect(qc.getQueryState(STATUS_KEY)?.status).toBe('success'))
    expect(screen.queryByTestId('raven-candidato-card')).toBeNull()
    expect(container.querySelector('[data-testid="cartao-pai"]')?.childElementCount).toBe(0)
  })

  it.each([
    // Medido pela pesquisa: `2ce20fbf` está finalizada (etapa aprovado) com liberação vigente.
    ['aprovado', 'finalizado'],
    ['decisao_final', 'rejeitado'],
    // linha legada: status terminal numa etapa de trabalho
    ['triagem', 'finalizado'],
  ])(
    'candidatura encerrada (etapa %s, status %s) → nada, e o RPC nem é chamado',
    async (etapaAtual, status) => {
      getAvaliacaoStatus.mockResolvedValue(statusCom({ liberado: true, registrado: false }))
      const { qc, container } = montar({ etapaAtual, status })

      // dá ao React Query a chance de disparar, se fosse disparar
      await new Promise((r) => setTimeout(r, 20))
      expect(getAvaliacaoStatus).not.toHaveBeenCalled()
      expect(qc.getQueryState(STATUS_KEY)).toBeUndefined()
      expect(screen.queryByTestId('raven-candidato-card')).toBeNull()
      expect(container.querySelector('[data-testid="cartao-pai"]')?.childElementCount).toBe(0)
    },
  )

  it('carregando → nada (o card é um convite, não um esqueleto)', async () => {
    getAvaliacaoStatus.mockReturnValue(new Promise(() => {}))
    const { qc, container } = montar(EM_ANDAMENTO)

    await waitFor(() => expect(getAvaliacaoStatus).toHaveBeenCalled())
    expect(qc.getQueryState(STATUS_KEY)?.status).toBe('pending')
    expect(screen.queryByTestId('raven-candidato-card')).toBeNull()
    expect(container.querySelector('[data-testid="cartao-pai"]')?.childElementCount).toBe(0)
  })

  it('erro na leitura → nada (um card quebrado no painel é pior que a ausência)', async () => {
    getAvaliacaoStatus.mockRejectedValue(new Error('forbidden'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { qc, container } = montar(EM_ANDAMENTO)

    await waitFor(() => expect(qc.getQueryState(STATUS_KEY)?.status).toBe('error'))
    expect(screen.queryByTestId('raven-candidato-card')).toBeNull()
    expect(container.querySelector('[data-testid="cartao-pai"]')?.childElementCount).toBe(0)
    warn.mockRestore()
  })
})
