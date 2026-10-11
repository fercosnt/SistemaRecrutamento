/// <reference types="@testing-library/jest-dom" />
/**
 * ⛔ 52-10 / JORN-54, JORN-58 (D-17, D-52-U01, D-52-U02) — o hub do RH em quatro abas.
 *
 * O contrato medido pelo hub inteiro:
 *  - quatro abas, nesta ordem: «Resumo» (abre primeiro) · «Cadastro e inscrição» · «Avaliações» ·
 *    «Histórico» (`data-testid="hub-abas"`);
 *  - a aba mora na URL (`?aba=`); valor desconhecido → «Resumo», sem erro; trocar de aba grava com
 *    `{ replace: true }` — nenhuma entrada nova no histórico do navegador;
 *  - `?aba=cadastro` mostra «Dados do cadastro» lido pelo `useCadastroCandidatoRh` (a MESMA query do
 *    cabeçalho de contato);
 *  - as seções existentes vão para a aba da D-52-U01 sem mudar de conteúdo; as ações de funil
 *    ficam no «Próximo passo» do Resumo; o contato fica no cabeçalho, fora das abas (D-12).
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type {
  CadastroCandidatoRh,
  DadosCadastroRh,
} from '@/features/hub-candidato/services/cadastroCandidatoRhService'
import { CAMPOS_CADASTRO_RH } from '@/features/hub-candidato/services/cadastroCandidatoRhService'

const useEntrevistaContextoMock = vi.fn()
const useCadastroCandidatoRhMock = vi.fn()
const setSearchParamsSpy = vi.fn()

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))
vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useParams: () => ({ id: 'cand-1' }),
    useNavigate: () => vi.fn(),
    // Espião em volta do hook real: a URL muda de verdade e o teste vê as opções da chamada.
    useSearchParams: (...a: Parameters<typeof actual.useSearchParams>) => {
      const [params, set] = actual.useSearchParams(...a)
      const espiao: typeof set = (...args) => {
        setSearchParamsSpy(...args)
        set(...args)
      }
      return [params, espiao] as const
    },
  }
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
vi.mock('@/features/hub-candidato/hooks/useCadastroCandidatoRh', () => ({
  useCadastroCandidatoRh: (...args: unknown[]) => useCadastroCandidatoRhMock(...args),
  cadastroRhKeys: {
    all: ['hub-candidato', 'cadastro'],
    porCandidatura: (id: string) => ['hub-candidato', 'cadastro', id],
  },
}))
// Blocos irmãos que leem por conta própria: marcadores, para provar em que aba cada um mora.
vi.mock('../CvButton', () => ({ CvButton: () => <span data-testid="stub-cv" /> }))
vi.mock('@/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock', () => ({
  LiberacaoCognitivoBlock: () => <span data-testid="stub-raven" />,
}))
vi.mock('@/features/agendamento/components/AgendamentoBlock', () => ({
  AgendamentoBlock: () => <span data-testid="stub-agendamento" />,
}))

import { HubCandidatoRH } from '../HubCandidatoRH'

function cadastro(parcial: Partial<DadosCadastroRh>): DadosCadastroRh {
  const base = Object.fromEntries(CAMPOS_CADASTRO_RH.map((c) => [c, null])) as DadosCadastroRh
  return { ...base, ...parcial }
}

const PAYLOAD: CadastroCandidatoRh = {
  vaga_titulo: 'Recepcionista',
  contato: { email: 'fulana@exemplo.com', celular: null },
  cadastro: cadastro({ nome_completo: 'Fulana de Tal Souza', cpf: '12345678901', cidade: 'Campinas' }),
  disponibilidade: null,
  inscricao: [],
}

function montar(url: string) {
  useEntrevistaContextoMock.mockReturnValue({
    data: {
      vaga_id: 'vaga-1',
      etapa_atual: 'triagem',
      status: 'em_analise',
      candidato_nome: 'Fulana de Teste',
    },
    isLoading: false,
    isError: false,
  })
  const router = createMemoryRouter(
    [{ path: '/rh/candidatos/:id', element: <HubCandidatoRH /> }],
    { initialEntries: [url] },
  )
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

function abaSelecionada(): string | null {
  return screen.getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')
    ?.textContent ?? null
}

describe('HubCandidatoRH — quatro abas com a aba na URL (52-10 / D-17, D-52-U02)', () => {
  beforeEach(() => {
    useEntrevistaContextoMock.mockReset()
    useCadastroCandidatoRhMock.mockReset()
    setSearchParamsSpy.mockReset()
    useCadastroCandidatoRhMock.mockReturnValue({
      data: PAYLOAD,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
  })

  it('?aba=cadastro → «Dados do cadastro» com a ficha lida pelo useCadastroCandidatoRh', () => {
    montar('/rh/candidatos/cand-1?aba=cadastro')
    expect(screen.getByTestId('hub-abas')).toBeInTheDocument()
    expect(abaSelecionada()).toBe('Cadastro e inscrição')
    expect(screen.getByRole('heading', { name: 'Dados do cadastro' })).toBeInTheDocument()
    const ficha = screen.getByTestId('hub-dados-cadastro')
    expect(ficha).toHaveTextContent('Fulana de Tal Souza')
    expect(ficha).toHaveTextContent('123.456.789-01')
    expect(useCadastroCandidatoRhMock).toHaveBeenCalledWith('cand-1')
  })

  it('?aba=cadastro → «Respostas da inscrição» abaixo de «Dados do cadastro», com a inscricao do MESMO hook (52-24 / D-19)', () => {
    useCadastroCandidatoRhMock.mockReturnValue({
      data: {
        ...PAYLOAD,
        inscricao: [
          {
            pergunta_id: 'perg-1',
            bloco: 'curriculo',
            ordem: 1,
            texto_pergunta: 'Onde trabalhou por último?',
            tipo_resposta: 'texto_curto',
            eliminatoria: false,
            removida: false,
            resposta: { texto: 'Clínica Sorriso' },
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    montar('/rh/candidatos/cand-1?aba=cadastro')
    const titulo = screen.getByRole('heading', { name: 'Respostas da inscrição' })
    const dados = screen.getByRole('heading', { name: 'Dados do cadastro' })
    expect(dados.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const respostas = screen.getByTestId('hub-respostas-inscricao')
    expect(respostas).toHaveTextContent('Onde trabalhou por último?')
    expect(respostas).toHaveTextContent('Clínica Sorriso')
    // Nenhuma leitura nova: todas as chamadas do hook são a mesma query, pela candidatura.
    expect(useCadastroCandidatoRhMock.mock.calls.every((c) => c.length === 1 && c[0] === 'cand-1')).toBe(true)
  })

  it('as quatro abas, nesta ordem, com os rótulos da D-17', () => {
    montar('/rh/candidatos/cand-1')
    expect(within(screen.getByTestId('hub-abas')).getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Resumo',
      'Cadastro e inscrição',
      'Avaliações',
      'Histórico',
    ])
  })

  it('sem ?aba → Resumo abre primeiro, com as ações de funil no «Próximo passo»', () => {
    montar('/rh/candidatos/cand-1')
    expect(abaSelecionada()).toBe('Resumo')
    expect(screen.getByText('Próximo passo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Avançar/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Dados do cadastro' })).toBeNull()
  })

  it('?aba=xyz (desconhecido) → Resumo, sem erro', () => {
    montar('/rh/candidatos/cand-1?aba=xyz')
    expect(abaSelecionada()).toBe('Resumo')
    expect(screen.getByRole('heading', { name: 'Linha do funil' })).toBeInTheDocument()
  })

  it('clicar em «Avaliações» chama setSearchParams com { replace: true } e a URL muda sem nova entrada', async () => {
    const router = montar('/rh/candidatos/cand-1?aba=cadastro')
    await userEvent.click(screen.getByRole('tab', { name: 'Avaliações' }))
    expect(setSearchParamsSpy).toHaveBeenCalled()
    expect(setSearchParamsSpy.mock.calls.at(-1)?.[1]).toEqual({ replace: true })
    expect(router.state.location.search).toContain('aba=avaliacoes')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(abaSelecionada()).toBe('Avaliações')
    expect(screen.getByRole('heading', { name: 'Prova cognitiva' })).toBeInTheDocument()
  })

  it('Resumo (D-52-U01): Próximo passo, Linha do funil, Currículo, Análise da IA, Agendamento, Decisão Final', () => {
    montar('/rh/candidatos/cand-1?aba=resumo')
    const painel = screen.getByRole('tabpanel')
    for (const t of ['Linha do funil', 'Currículo', 'Análise da IA', 'Decisão Final']) {
      expect(within(painel).getByRole('heading', { name: t })).toBeInTheDocument()
    }
    expect(within(painel).getByText('Próximo passo')).toBeInTheDocument()
    expect(within(painel).getByTestId('stub-cv')).toBeInTheDocument()
    expect(within(painel).getByTestId('stub-agendamento')).toBeInTheDocument()
    expect(within(painel).queryByRole('heading', { name: 'Prova cognitiva' })).toBeNull()
  })

  it('?aba=avaliacoes (D-52-U01): assíncrona, prova cognitiva, Raven, redação (+ workspace), entrevista', () => {
    montar('/rh/candidatos/cand-1?aba=avaliacoes')
    expect(abaSelecionada()).toBe('Avaliações')
    const painel = screen.getByRole('tabpanel')
    for (const t of ['Avaliação assíncrona', 'Prova cognitiva', 'Redação', 'Entrevista']) {
      expect(within(painel).getByRole('heading', { name: t })).toBeInTheDocument()
    }
    // 52-25 / D-52-U03: o «Ver respostas» saiu do hub (o detalhe monta aberto na seção — contrato
    // do hubVerRespostas.test.tsx); nenhuma aba o mostra mais.
    expect(screen.queryByText('Ver respostas')).toBeNull()
    expect(within(painel).getByTestId('stub-raven')).toBeInTheDocument()
    expect(within(painel).getByRole('button', { name: 'Abrir workspace de redação' })).toBeInTheDocument()
    expect(within(painel).queryByRole('heading', { name: 'Linha do funil' })).toBeNull()
  })

  it('?aba=historico → o HistoricoBlock, e nada do Resumo', () => {
    montar('/rh/candidatos/cand-1?aba=historico')
    expect(abaSelecionada()).toBe('Histórico')
    const painel = screen.getByRole('tabpanel')
    expect(within(painel).getByRole('heading', { name: 'Histórico' })).toBeInTheDocument()
    expect(screen.queryByText('Próximo passo')).toBeNull()
  })

  it('o contato fica no cabeçalho, fora das abas, em qualquer aba (D-12)', () => {
    montar('/rh/candidatos/cand-1?aba=historico')
    const email = screen.getByTestId('hub-contato-email')
    expect(screen.getByRole('tabpanel').contains(email)).toBe(false)
    expect(screen.getByTestId('hub-abas').contains(email)).toBe(false)
  })
})
