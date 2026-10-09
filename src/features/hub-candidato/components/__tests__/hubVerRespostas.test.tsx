/// <reference types="@testing-library/jest-dom" />
/**
 * ⛔ POR QUE ESTE ARQUIVO EXISTE (51-02 / JORN-45, D-17..D-20, C-7, C-8).
 *
 * O hub do RH dizia «N registro(s) de avaliação comportamental disponíveis para revisão» e não
 * dava caminho nenhum até esses registros: o `ScorecardAvaliacao` não estava montado em tela
 * nenhuma (49-REVIEW-GAPS-3 CR-02). E o N contava TODAS as linhas de `scores_candidato` — uma
 * entrevista ou uma redação entravam no número e, se o detalhe fosse montado sem filtro,
 * virariam um card de «caso aberto» (C-8).
 *
 * O contrato, medido pelo hub inteiro (não pelo bloco isolado):
 *  - logo depois da seção «Avaliação Assíncrona», em QUALQUER etapa, o texto «N avaliação(ões)
 *    respondida(s)» e o botão «Ver respostas» (`hub-ver-respostas`), com aria-expanded/controls;
 *  - o detalhe só monta depois do clique e mostra exatamente as linhas que o N conta
 *    (`tipo IN ('sjt','big_five')`, pela função exportada `linhasDeAvaliacao`);
 *  - a frase «disponíveis para revisão» não existe mais.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ScoreRow } from '@/features/avaliacao/services/scoresRhService'

const useEntrevistaContextoMock = vi.fn()
const useScorecardCandidatoMock = vi.fn()

// Sem `.env.local` (worktree da prova de mordida, CI) o client real lança ao carregar.
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))
vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useParams: () => ({ id: 'cand-1' }), useNavigate: () => vi.fn() }
})
vi.mock('@/features/entrevista/hooks/useEntrevistaScorecard', () => ({
  useEntrevistaContexto: (...args: unknown[]) => useEntrevistaContextoMock(...args),
  useEntrevistaScorecard: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/avaliacao/hooks/useScorecardCandidato', () => ({
  useScorecardCandidato: (...args: unknown[]) => useScorecardCandidatoMock(...args),
}))
// O texto integral do caso prático (D-20) é lido pela RPC — aqui, um retorno fixo.
vi.mock('@/features/avaliacao/services/scoresRhService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/avaliacao/services/scoresRhService')>()
  return {
    ...actual,
    getRespostaCasoAbertoSjt: vi.fn(async () => ({ situacao: 'disponivel', texto: 'Texto do caso.' })),
  }
})
vi.mock('@/features/triagem/hooks/useRedacaoRevisao', () => ({
  useRedacaoRevisao: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/decisao/hooks/useConsolidacao', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/decisao/hooks/useConsolidacao')>()
  return { ...actual, useConsolidacao: () => ({ data: null, isLoading: false, isError: false }) }
})
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
// Blocos irmãos que leem por conta própria — fora deste contrato.
vi.mock('../CvButton', () => ({ CvButton: () => null }))
vi.mock('@/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock', () => ({
  LiberacaoCognitivoBlock: () => null,
}))
vi.mock('@/features/agendamento/components/AgendamentoBlock', () => ({
  AgendamentoBlock: () => null,
}))

import { HubCandidatoRH } from '../HubCandidatoRH'
import * as ScorecardModulo from '@/features/avaliacao/components/ScorecardAvaliacao'

function linha(id: string, tipo: string, subtipo: string | null): ScoreRow {
  return {
    id,
    tipo,
    subtipo,
    pergunta_id: null,
    score: null,
    score_max: null,
    status: 'sucesso',
    metadata: {},
    citacoes: null,
    red_flags: null,
  } as unknown as ScoreRow
}

/** As cinco formas que existem em PROD (C-8): duas são de OUTRA etapa e não contam. */
const CINCO: ScoreRow[] = [
  linha('mc-1', 'sjt', 'mc'),
  linha('ca-1', 'sjt', 'caso_aberto'),
  linha('bf-1', 'big_five', null),
  linha('en-1', 'entrevista', null),
  linha('rd-1', 'redacao', null),
]

function montar(rows: ScoreRow[], etapa = 'avaliacao_assincrona') {
  useEntrevistaContextoMock.mockReturnValue({
    data: {
      candidatura_id: 'cand-1',
      vaga_id: 'vaga-1',
      etapa_atual: etapa,
      status: 'em_analise',
      candidato_nome: 'Fulana de Teste',
    },
    isLoading: false,
    isError: false,
  })
  useScorecardCandidatoMock.mockReturnValue({ data: rows, isLoading: false, isError: false })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <HubCandidatoRH />
    </QueryClientProvider>,
  )
}

/** A seção «Avaliação Assíncrona» — o vazio «futuro»/«sem dados» se repete em outras seções. */
function secaoAssincrona(): HTMLElement {
  return screen.getByRole('heading', { name: 'Avaliação Assíncrona' }).parentElement as HTMLElement
}

describe('linhasDeAvaliacao — uma fonte para o número e para o detalhe (C-8)', () => {
  it('é exportada e devolve só as linhas sjt e big_five', () => {
    const f = (ScorecardModulo as Record<string, unknown>).linhasDeAvaliacao as
      | ((rows: ScoreRow[]) => ScoreRow[])
      | undefined
    expect(typeof f).toBe('function')
    expect(f!(CINCO).map((r) => r.id)).toEqual(['mc-1', 'ca-1', 'bf-1'])
  })
})

describe('HubCandidatoRH — «Ver respostas» abre o detalhe no lugar (51-02 / JORN-45)', () => {
  beforeEach(() => {
    useEntrevistaContextoMock.mockReset()
    useScorecardCandidatoMock.mockReset()
  })

  it('anuncia «3 avaliações respondidas» (entrevista e redação fora) e não promete «disponíveis para revisão»', () => {
    montar(CINCO)
    expect(screen.getAllByText('3 avaliações respondidas').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/disponíveis para revisão/)).toBeNull()
    expect(screen.queryByText(/registro\(s\)/)).toBeNull()
  })

  it('o botão existe com aria-expanded=false e o detalhe NÃO está montado antes do clique', () => {
    montar(CINCO)
    const botao = screen.getByTestId('hub-ver-respostas')
    expect(botao).toHaveTextContent('Ver respostas')
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    const regiaoId = botao.getAttribute('aria-controls')
    expect(regiaoId).toBeTruthy()
    const regiao = document.getElementById(regiaoId!)
    expect(regiao).not.toBeNull()
    expect(regiao).toBeEmptyDOMElement()
    expect(screen.queryByText('Múltipla escolha')).toBeNull()
    expect(screen.queryByText('Caso aberto (BARS)')).toBeNull()
  })

  it('depois do clique: aria-expanded=true, «Ocultar respostas», e o detalhe mostra as linhas que o número conta', () => {
    montar(CINCO)
    const botao = screen.getByTestId('hub-ver-respostas')
    fireEvent.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(botao).toHaveTextContent('Ocultar respostas')
    const regiao = document.getElementById(botao.getAttribute('aria-controls')!)!
    expect(within(regiao).getByText('Múltipla escolha')).toBeInTheDocument()
    // Uma linha de entrevista e uma de redação NUNCA viram card de «caso aberto» (C-8).
    expect(within(regiao).getAllByText('Caso aberto (BARS)')).toHaveLength(1)

    fireEvent.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Múltipla escolha')).toBeNull()
  })

  it('em etapa ANTERIOR à avaliação (seção «futuro»), o caminho continua lá (D-17)', () => {
    montar(CINCO, 'triagem')
    expect(within(secaoAssincrona()).getByText('Etapa ainda não iniciada')).toBeInTheDocument()
    expect(screen.getByTestId('hub-ver-respostas')).toBeInTheDocument()
    expect(screen.getByText('3 avaliações respondidas')).toBeInTheDocument()
  })

  it('singular: uma linha → «1 avaliação respondida»', () => {
    montar([linha('bf-1', 'big_five', null)])
    expect(screen.getAllByText('1 avaliação respondida').length).toBeGreaterThanOrEqual(1)
  })

  it('zero linhas: diz que nenhuma foi respondida, o botão continua e o detalhe mostra o vazio', () => {
    montar([])
    expect(screen.getByText('Nenhuma avaliação respondida ainda.')).toBeInTheDocument()
    const botao = screen.getByTestId('hub-ver-respostas')
    fireEvent.click(botao)
    expect(screen.getByText('Sem avaliações registradas ainda.')).toBeInTheDocument()
  })

  it('só entrevista/redação: a seção usa a contagem FILTRADA (sem dados) e o detalhe não inventa card', () => {
    montar([linha('en-1', 'entrevista', null), linha('rd-1', 'redacao', null)])
    expect(within(secaoAssincrona()).getByText('Sem dados nesta etapa')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma avaliação respondida ainda.')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('hub-ver-respostas'))
    expect(screen.queryByText('Caso aberto (BARS)')).toBeNull()
    expect(screen.getByText('Sem avaliações registradas ainda.')).toBeInTheDocument()
  })
})
