/// <reference types="@testing-library/jest-dom" />
/**
 * ⛔ POR QUE ESTE ARQUIVO EXISTE (JORN-26, C1/C1b da varredura da Phase 48).
 *
 * O hub decidia «Avançar»/«Rejeitar» só por `etapa_atual`. O knockout da inscrição
 * PRESERVA `etapa_atual='inscricao'` por desenho e muda só `status` para `rejeitado`, então
 * o RH via «Avançar → triagem» para uma candidata já eliminada — e o clique a devolvia ao
 * funil com status `rejeitado`. «Rejeitar» também aparecia para knockout e para linhas
 * legadas `finalizado` em etapa de trabalho, e reescrevia o motivo.
 *
 * O critério é o predicado canônico `candidaturaEncerrada(etapa, status)`. Estes casos
 * reprovam se alguém voltar a decidir pela etapa sozinha — ou se esconder as ações sem a
 * linha que diz por quê.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const useEntrevistaContextoMock = vi.fn()
const navigateSpy = vi.fn()

vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useParams: () => ({ id: 'cand-1' }), useNavigate: () => navigateSpy }
})
vi.mock('@/features/entrevista/hooks/useEntrevistaScorecard', () => ({
  useEntrevistaContexto: (...args: unknown[]) => useEntrevistaContextoMock(...args),
  useEntrevistaScorecard: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/avaliacao/hooks/useScorecardCandidato', () => ({
  useScorecardCandidato: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/triagem/hooks/useRedacaoRevisao', () => ({
  useRedacaoRevisao: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/decisao/hooks/useConsolidacao', () => ({
  useConsolidacao: () => ({ data: null, isLoading: false, isError: false }),
}))
vi.mock('@/features/vagas/hooks/useCandidaturas', () => ({
  useUpdateCandidaturaEtapa: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/triagem/hooks/useRejeitarCandidatura', () => ({
  useRejeitarCandidatura: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/hub-candidato/hooks/useAnaliseCandidato', () => ({
  useAnaliseCandidato: () => ({ data: null, isLoading: false, isError: false }),
}))
vi.mock('@/features/hub-candidato/hooks/useHistoricoCandidatura', () => ({
  useHistoricoCandidatura: () => ({ data: [], isLoading: false, isError: false }),
}))

import { HubCandidatoRH } from '../HubCandidatoRH'

function montar(etapa: string, status: string | null) {
  useEntrevistaContextoMock.mockReturnValue({
    data: {
      candidatura_id: 'cand-1',
      vaga_id: 'vaga-1',
      etapa_atual: etapa,
      status,
      candidato_nome: 'Fulana de Teste',
    },
    isLoading: false,
    isError: false,
  })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <HubCandidatoRH />
    </QueryClientProvider>,
  )
}

describe('HubCandidatoRH — sem ação de funil para candidatura encerrada (JORN-26)', () => {
  beforeEach(() => {
    useEntrevistaContextoMock.mockReset()
    navigateSpy.mockReset()
  })

  it('(a) knockout (`inscricao` + `rejeitado`): sem Avançar, sem Rejeitar, e diz por quê', () => {
    montar('inscricao', 'rejeitado')
    expect(screen.queryByRole('button', { name: /Avançar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Rejeitar/i })).toBeNull()
    expect(screen.getByTestId('hub-acoes-encerrada')).toHaveTextContent(
      'Candidatura encerrada — não há ação de funil a tomar.',
    )
  })

  it('(b) legado `triagem` + `finalizado`: idem', () => {
    montar('triagem', 'finalizado')
    expect(screen.queryByRole('button', { name: /Avançar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Rejeitar/i })).toBeNull()
    expect(screen.getByTestId('hub-acoes-encerrada')).toBeInTheDocument()
  })

  it('(c) em andamento (`triagem` + `em_analise`): Avançar e Rejeitar continuam, sem a linha de encerrada', () => {
    montar('triagem', 'em_analise')
    expect(screen.getByRole('button', { name: /Avançar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rejeitar/i })).toBeInTheDocument()
    expect(screen.queryByTestId('hub-acoes-encerrada')).toBeNull()
  })
})
