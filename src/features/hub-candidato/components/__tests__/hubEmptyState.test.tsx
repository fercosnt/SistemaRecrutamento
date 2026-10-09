/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 17 / Plan 17-01 Task 2 — Wave 0 RED scaffold for the RH hub empty state (D-07).
 *
 * RED CONTRACT: this file STATICALLY imports `HubSection` from
 * `@/features/hub-candidato/components/HubSection`, which does NOT exist until Plan 17-03
 * lands the hub feature. The import makes Vitest fail with "Cannot find module" at
 * collection — the calibrated Wave-0 RED signal. The component lands in 17-03 → GREEN.
 *
 * The assertions encode the D-07 "NEVER invent data" contract + the UI-SPEC verbatim copy:
 *  - A future / not-yet-reached stage renders the empty-state heading
 *    "Etapa ainda não iniciada" and body
 *    "Esta etapa será liberada quando o candidato avançar no funil."
 *  - The rendered output contains NONE of the hardcoded mock values that were the sin of
 *    the 1864-line PerfilCandidatoRHPage mock ("45%", "Concluído") — the hub reads real
 *    services or shows an explicit empty state, never fabricated numbers.
 *
 * Contract for the hub component (Plan 17-03 must satisfy): `HubSection` accepts at least
 * `{ titulo: string; estado: 'futuro' | 'sem_dados' | 'com_dados'; children?: ReactNode }`
 * and renders the UI-SPEC empty-state copy for `estado === 'futuro'`. The exact prop names
 * are the implementer's choice in 17-03; this RED spec pins the COPY + the no-mock-data
 * invariant, which are the load-bearing D-07 guarantees.
 *
 * ⛔ 51-03 / JORN-48 (D-15, D-16) — o 4º estado e os dois nomes.
 *  - `nao_se_aplica`: «Não se aplica a esta vaga» (marcador `hub-secao-nao-se-aplica`). «Sem
 *    dados nesta etapa» sugere FALTA; o que a vaga nunca aplicou é DESENHO. O estado novo
 *    continua sem «Concluído» e sem «Sem dados».
 *  - O instrumento textual liberado pela vaga se chama «Prova cognitiva» no hub, e não mais
 *    «Avaliação Cognitiva» — o Raven, logo abaixo, é «Raciocínio lógico (Matrizes)».
 *
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-UI-SPEC.md (§Empty states — verbatim copy)
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-PATTERNS.md (§hub section empty-state pattern)
 */
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ScoreRow } from '@/features/avaliacao/services/scoresRhService'

// RED: '@/features/hub-candidato/components/HubSection' does not exist yet → "Cannot find module".
// GREEN after Plan 17-03 creates the hub feature + its empty-state-aware section component.
import { HubSection } from '@/features/hub-candidato/components/HubSection'

// ── Mocks do hub inteiro (51-03): as seções leem hooks reais; aqui, retornos fixos. ──────────
const useEntrevistaContextoMock = vi.fn()
const useEntrevistaScorecardMock = vi.fn()
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
  useEntrevistaScorecard: (...args: unknown[]) => useEntrevistaScorecardMock(...args),
}))
vi.mock('@/features/avaliacao/hooks/useScorecardCandidato', () => ({
  useScorecardCandidato: (...args: unknown[]) => useScorecardCandidatoMock(...args),
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
// Blocos irmãos que leem por conta própria — fora deste contrato.
vi.mock('../CvButton', () => ({ CvButton: () => null }))
vi.mock('@/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock', () => ({
  LiberacaoCognitivoBlock: () => null,
}))
vi.mock('@/features/agendamento/components/AgendamentoBlock', () => ({
  AgendamentoBlock: () => null,
}))
vi.mock('../AvaliacoesRespondidasBloco', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../AvaliacoesRespondidasBloco')>()
  return {
    ...actual,
    AvaliacoesRespondidasBloco: () => <div data-testid="hub-ver-respostas">Ver respostas</div>,
  }
})

import { HubCandidatoRH } from '../HubCandidatoRH'

function linhaScore(id: string, tipo: string): ScoreRow {
  return {
    id,
    tipo,
    subtipo: null,
    pergunta_id: null,
    score: null,
    score_max: null,
    status: 'sucesso',
    metadata: {},
    citacoes: null,
    red_flags: null,
  } as unknown as ScoreRow
}

interface MontarHub {
  vaga?: Record<string, unknown>
  avaliacoes?: ScoreRow[]
  entrevistaRows?: ScoreRow[]
  etapa?: string
}

function montarHub({ vaga = {}, avaliacoes = [], entrevistaRows = [], etapa = 'avaliacao_assincrona' }: MontarHub = {}) {
  useEntrevistaContextoMock.mockReturnValue({
    data: {
      candidatura_id: 'cand-1',
      vaga_id: 'vaga-1',
      etapa_atual: etapa,
      status: 'em_analise',
      candidato_nome: 'Fulana de Teste',
      entrevista_agendada_em: null,
      ...vaga,
    },
    isLoading: false,
    isError: false,
  })
  useScorecardCandidatoMock.mockReturnValue({ data: avaliacoes, isLoading: false, isError: false })
  useEntrevistaScorecardMock.mockReturnValue({ data: entrevistaRows, isLoading: false, isError: false })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <HubCandidatoRH />
    </QueryClientProvider>,
  )
}

/** A seção pelo heading — os vazios se repetem em várias seções do hub. */
function secao(titulo: string): HTMLElement {
  return screen.getByRole('heading', { name: titulo }).parentElement as HTMLElement
}

describe('Hub do candidato (RH) — empty state de etapa futura (D-07)', () => {
  it('etapa futura/não-iniciada → mostra o heading "Etapa ainda não iniciada" (cópia UI-SPEC)', () => {
    render(<HubSection titulo="Entrevista" estado="futuro" />)
    expect(screen.getByText('Etapa ainda não iniciada')).toBeInTheDocument()
  })

  it('etapa futura → mostra o corpo verbatim "Esta etapa será liberada quando o candidato avançar no funil."', () => {
    render(<HubSection titulo="Entrevista" estado="futuro" />)
    expect(
      screen.getByText('Esta etapa será liberada quando o candidato avançar no funil.'),
    ).toBeInTheDocument()
  })

  it('NUNCA inventa dados — sem números mock hardcoded ("45%" / "Concluído") no empty state', () => {
    const { container } = render(<HubSection titulo="Avaliação Assíncrona" estado="futuro" />)
    expect(container.textContent).not.toContain('45%')
    expect(container.textContent).not.toContain('Concluído')
  })
})

describe('HubSection — 4º estado «Não se aplica a esta vaga» (51-03 / D-16)', () => {
  it('nao_se_aplica diz «Não se aplica a esta vaga»', () => {
    const { container } = render(<HubSection titulo="Prova cognitiva" estado="nao_se_aplica" />)
    expect(container.textContent).toContain('Não se aplica a esta vaga')
  })

  it('nao_se_aplica carrega o marcador hub-secao-nao-se-aplica e não mostra os filhos', () => {
    render(
      <HubSection titulo="Prova cognitiva" estado="nao_se_aplica">
        <p>conteúdo com dados</p>
      </HubSection>,
    )
    expect(screen.getByTestId('hub-secao-nao-se-aplica')).toHaveTextContent('Não se aplica a esta vaga')
    expect(screen.queryByText('conteúdo com dados')).toBeNull()
  })

  it('nao_se_aplica NUNCA diz «Concluído» nem «Sem dados» (não é dado, nem falta)', () => {
    const { container } = render(<HubSection titulo="Redação" estado="nao_se_aplica" />)
    expect(container.textContent).not.toContain('Concluído')
    expect(container.textContent).not.toContain('Sem dados')
    expect(container.textContent).not.toContain('45%')
  })

  it('carregando e erro continuam vencendo o estado (nao_se_aplica não esconde falha de leitura)', () => {
    const { container } = render(<HubSection titulo="Redação" estado="nao_se_aplica" isError />)
    expect(container.textContent).toContain('Não foi possível carregar esta seção.')
    expect(screen.queryByTestId('hub-secao-nao-se-aplica')).toBeNull()
  })
})

describe('HubCandidatoRH — «Prova cognitiva» distinta do Raven e «Não se aplica» (51-03 / D-15, D-16)', () => {
  it('a seção do instrumento textual se chama «Prova cognitiva», não mais «Avaliação Cognitiva»', () => {
    montarHub({ vaga: { aplica_cognitivo: true } })
    expect(screen.getByRole('heading', { name: 'Prova cognitiva' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Avaliação Cognitiva' })).toBeNull()
  })

  it('vaga com aplica_cognitivo=false → a «Prova cognitiva» diz «Não se aplica a esta vaga»', () => {
    montarHub({ vaga: { aplica_cognitivo: false, testes_aplicaveis: [{ teste: 'work_sample_sjt' }] } })
    expect(secao('Prova cognitiva').textContent).toContain('Não se aplica a esta vaga')
  })

  it('vaga com aplica_cognitivo=true e sem banda → o estado de hoje («Sem dados nesta etapa»)', () => {
    montarHub({ vaga: { aplica_cognitivo: true, testes_aplicaveis: [{ teste: 'work_sample_sjt' }] } })
    const s = secao('Prova cognitiva')
    expect(within(s).getByText('Sem dados nesta etapa')).toBeInTheDocument()
    expect(within(s).queryByTestId('hub-secao-nao-se-aplica')).toBeNull()
  })

  it('com banda registrada → o texto de com_dados fala de «prova cognitiva»', () => {
    montarHub({
      vaga: { aplica_cognitivo: true, testes_aplicaveis: [{ teste: 'work_sample_sjt' }] },
      entrevistaRows: [linhaScore('cg-1', 'cognitivo')],
    })
    expect(
      within(secao('Prova cognitiva')).getByText(
        'Banda da prova cognitiva registrada — disponível no workspace de entrevista.',
      ),
    ).toBeInTheDocument()
  })
})
