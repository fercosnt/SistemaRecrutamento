/// <reference types="@testing-library/jest-dom" />
/**
 * ⛔ POR QUE ESTE ARQUIVO EXISTE (51-02 / JORN-45, C-8 → 52-25 / JORN-58, D-18, D-52-U03).
 *
 * Origem (51-02): o hub do RH dizia «N registro(s) … disponíveis para revisão» e não dava caminho
 * nenhum até esses registros; e o N contava TODAS as linhas de `scores_candidato` — uma entrevista
 * ou uma redação entravam no número e, montadas sem filtro, virariam card de «caso aberto» (C-8).
 * A 51-02 resolveu com o bloco irmão «Ver respostas» (`AvaliacoesRespondidasBloco`).
 *
 * Substituído pelo 52-25 (não apagado — o lock continua, sobre o comportamento novo):
 *  - D-18 manda tudo aberto dentro das abas; com tudo aberto, o bloco irmão só repetia a contagem
 *    (defeito (c) do UAT da 51). O «Ver respostas» SAI do hub (D-52-U03): o `ScorecardAvaliacao`
 *    monta aberto DENTRO da seção «Avaliação assíncrona», e a frase «N avaliações respondidas»
 *    aparece UMA vez.
 *  - O motivo de o bloco ser irmão (caminho em QUALQUER etapa, D-17 da 51) é preservado pela regra
 *    de estado: havendo linha `sjt`/`big_five`, a seção é `com_dados` em qualquer etapa — o dado
 *    vence a etapa, como o 51-03/D-16 já fazia o dado vencer a configuração.
 *  - C-8 continua: o N e o detalhe têm UMA fonte, `linhasDeAvaliacao`.
 *
 * Este arquivo nunca travou a D-32 da 51 (nenhuma asserção dela, medido em 2026-10-10): a única
 * trava dela era um `describe` de `ScorecardAvaliacao.test.tsx`, substituído pelo 52-11 (D-01).
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
// 52-23: o cabeçalho do hub monta o contato (ContatoCandidatoHeader), que lê pela EF do 52-09.
// Stub do hook — sem rede, sem QueryClientProvider; fora do contrato deste arquivo.
vi.mock('@/features/hub-candidato/hooks/useCadastroCandidatoRh', () => ({
  useCadastroCandidatoRh: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }),
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
      <MemoryRouter initialEntries={['/rh/candidatos/cand-1?aba=avaliacoes']}><HubCandidatoRH /></MemoryRouter>
    </QueryClientProvider>,
  )
}

/** A seção «Avaliação assíncrona» — o vazio «futuro»/«sem dados» se repete em outras seções. */
function secaoAssincrona(): HTMLElement {
  return screen.getByRole('heading', { name: 'Avaliação assíncrona' }).parentElement as HTMLElement
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

describe('HubCandidatoRH — «Avaliação assíncrona» aberta, contagem uma vez (52-25 / D-18, D-52-U03, defeito c)', () => {
  beforeEach(() => {
    useEntrevistaContextoMock.mockReset()
    useScorecardCandidatoMock.mockReset()
  })

  it('«3 avaliações respondidas» aparece exatamente UMA vez no hub (entrevista e redação fora), sem «disponíveis para revisão»', () => {
    montar(CINCO)
    expect(screen.getAllByText('3 avaliações respondidas')).toHaveLength(1)
    expect(within(secaoAssincrona()).getByText('3 avaliações respondidas')).toBeInTheDocument()
    expect(screen.queryByText(/disponíveis para revisão/)).toBeNull()
    expect(screen.queryByText(/registro\(s\)/)).toBeNull()
  })

  it('nenhum «Ver respostas» / «Ocultar respostas» — o detalhe não se abre por botão', () => {
    montar(CINCO)
    expect(screen.queryByTestId('hub-ver-respostas')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ver respostas' })).toBeNull()
    expect(screen.queryByText('Ver respostas')).toBeNull()
    expect(screen.queryByText('Ocultar respostas')).toBeNull()
  })

  it('o ScorecardAvaliacao está montado ABERTO dentro da seção, com exatamente as linhas que o número conta', () => {
    montar(CINCO)
    const secao = secaoAssincrona()
    expect(within(secao).getByText('Múltipla escolha')).toBeInTheDocument()
    // Uma linha de entrevista e uma de redação NUNCA viram card de «caso aberto» (C-8).
    expect(within(secao).getAllByText('Caso aberto (BARS)')).toHaveLength(1)
    // A contagem vem ANTES dos cards.
    const contagem = within(secao).getByText('3 avaliações respondidas')
    const card = within(secao).getByText('Múltipla escolha')
    expect(contagem.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each(['inscricao', 'triagem'])(
    'o dado vence a etapa: em «%s» (anterior à avaliação) com linha sjt, a seção é com_dados',
    (etapa) => {
      montar([linha('mc-1', 'sjt', 'mc')], etapa)
      const secao = secaoAssincrona()
      expect(within(secao).queryByText('Etapa ainda não iniciada')).toBeNull()
      expect(within(secao).queryByText('Sem dados nesta etapa')).toBeNull()
      expect(within(secao).getByText('1 avaliação respondida')).toBeInTheDocument()
      expect(within(secao).getByText('Múltipla escolha')).toBeInTheDocument()
    },
  )

  it('singular: uma linha → «1 avaliação respondida», uma vez só', () => {
    montar([linha('bf-1', 'big_five', null)])
    expect(screen.getAllByText('1 avaliação respondida')).toHaveLength(1)
  })

  it('zero linhas na etapa da avaliação → «Sem dados nesta etapa», sem contagem e sem card', () => {
    montar([])
    const secao = secaoAssincrona()
    expect(within(secao).getByText('Sem dados nesta etapa')).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma avaliação respondida ainda.')).toBeNull()
    expect(screen.queryByText(/avaliaç(ão|ões) respondida/)).toBeNull()
    expect(screen.queryByText('Múltipla escolha')).toBeNull()
  })

  it('zero linhas em etapa anterior → a etapa ainda manda («Etapa ainda não iniciada»)', () => {
    montar([], 'triagem')
    expect(within(secaoAssincrona()).getByText('Etapa ainda não iniciada')).toBeInTheDocument()
  })

  it('só entrevista/redação: a seção usa a contagem FILTRADA (sem dados) e nenhum card é inventado', () => {
    montar([linha('en-1', 'entrevista', null), linha('rd-1', 'redacao', null)])
    expect(within(secaoAssincrona()).getByText('Sem dados nesta etapa')).toBeInTheDocument()
    expect(screen.queryByText('Caso aberto (BARS)')).toBeNull()
    expect(screen.queryByText(/avaliaç(ão|ões) respondida/)).toBeNull()
  })
})
