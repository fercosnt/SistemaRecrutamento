/// <reference types="@testing-library/jest-dom" />
/**
 * 48-14 (JORN-19 · D-01/D-10) — o prazo da candidatura REABERTA no painel do candidato.
 *
 * O veredito `revertida` reabre a candidatura (48-11): ela volta a `decisao_final` /
 * `em_analise`, e o e-mail (48-13) diz «será decidida novamente até DD/MM/AAAA» — 10 dias
 * corridos. Sem este ramo, o cartão mostraria o SLA da etapa («Em decisão final — resposta
 * em até 3 dias úteis»), uma promessa que contradiz o e-mail (RESEARCH §E.3 passo 8).
 *
 * Bordas (explicit): sem linha em `decisao_final` ou com `reaberta_em` nulo, a linha de SLA
 * de hoje fica exatamente como está; candidatura encerrada continua sem linha de prazo.
 *
 * O último bloco pina o select do candidato: só DUAS colunas de `decisao_final` atravessam
 * a rede (estado da reabertura) — nenhuma de revisão, justificativa ou autoria (T-48-14-01).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  candidaturasData: { data: [] as unknown[] },
  selects: [] as string[],
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigateMock }
})

vi.mock('@/features/vagas/hooks', () => ({
  useCandidaturas: () => ({ data: mocks.candidaturasData, isLoading: false, error: null }),
  useCandidaturasCount: () => ({
    total: mocks.candidaturasData.data.length,
    aguardando: 0,
    em_analise: 1,
    aprovadas: 0,
    rejeitadas: 0,
    finalizadas: 0,
  }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ logout: vi.fn(() => Promise.resolve()) }),
  useCandidato: () => ({ nome_completo: 'Pessoa Teste', email: 'pessoa@invalido.local' }),
}))

// O rótulo de SLA vem de config_sla_etapa; aqui devolvemos SEMPRE o texto da decisão final
// para provar que quem o troca é a reabertura, não a ausência de configuração.
vi.mock('@/features/timeline/hooks', () => ({
  useSlaEtapas: () => ({ isLoading: false, error: null, lookup: new Map([['decisao_final', {}]]) }),
  rotuloDeEspera: () => 'Em decisão final — resposta em até 3 dias úteis.',
}))

vi.mock('@/features/vagas/hooks/useRetirarCandidatura', () => ({
  useRetirarCandidatura: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

// Só o bloco do select usa o cliente: captura a projeção sem ida à rede.
vi.mock('@/lib/supabase/client', () => {
  const q: Record<string, unknown> = {}
  q.select = vi.fn((cols: string) => {
    mocks.selects.push(cols)
    return q
  })
  for (const m of ['eq', 'is', 'order', 'gte', 'lte']) q[m] = vi.fn(() => q)
  q.range = vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
  return { supabase: { from: vi.fn(() => q) } }
})

import { DashboardCandidatoPage } from '../DashboardCandidatoPage'
import { listCandidaturas } from '@/features/vagas/services/candidaturasService'

const SLA = /resposta em até 3 dias úteis/i
const REABERTA = {
  reaberta_em: '2026-09-23T14:30:00Z',
  // 00:00 de SP do dia SEGUINTE à data-limite (48-11) → a data dita é 03/10/2026.
  prazo_nova_decisao_em: '2026-10-04T03:00:00Z',
}

const base = {
  id: 'cand-reaberta',
  vaga_id: 'vaga-1',
  vaga: { titulo: 'Consultor(a) de Relacionamento' },
  etapa_atual: 'decisao_final',
  status: 'em_analise',
  created_at: '2026-09-06T00:00:00Z',
  data_decisao_final: null,
}

function renderCom(extra: Record<string, unknown> = {}) {
  mocks.candidaturasData = { data: [{ ...base, ...extra }] }
  return render(
    <MemoryRouter>
      <DashboardCandidatoPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.selects.length = 0
})

describe('painel do candidato — candidatura reaberta (JORN-19)', () => {
  it('reaberta: mostra «nova decisão até DD/MM/AAAA» e NÃO o SLA de 3 dias úteis', () => {
    const { container } = renderCom({ decisao_final: REABERTA })
    const linha = container.querySelector('[data-testid="prazo-reabertura"]')
    expect(linha).not.toBeNull()
    expect(linha?.textContent).toContain('Candidatura reaberta — nova decisão até 03/10/2026.')
    expect(screen.queryByText(SLA)).not.toBeInTheDocument()
  })

  it('o PostgREST pode devolver o embed como array: tratado igual', () => {
    const { container } = renderCom({ decisao_final: [REABERTA] })
    expect(container.querySelector('[data-testid="prazo-reabertura"]')?.textContent).toContain(
      'nova decisão até 03/10/2026.',
    )
    expect(screen.queryByText(SLA)).not.toBeInTheDocument()
  })

  it('reaberta com prazo ilegível: a linha sai sem data (nunca uma data inventada) e sem SLA', () => {
    const { container } = renderCom({
      decisao_final: { reaberta_em: REABERTA.reaberta_em, prazo_nova_decisao_em: 'lixo' },
    })
    const linha = container.querySelector('[data-testid="prazo-reabertura"]')
    expect(linha?.textContent).toContain('Candidatura reaberta — aguardando nova decisão.')
    expect(linha?.textContent).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(screen.queryByText(SLA)).not.toBeInTheDocument()
  })

  it.each([
    ['sem linha em decisao_final (embed nulo)', { decisao_final: null }],
    ['sem o campo do embed', {}],
    ['linha sem reabertura', { decisao_final: { reaberta_em: null, prazo_nova_decisao_em: null } }],
  ])('BORDA — %s: a linha de SLA de hoje, sem linha de reabertura', (_n, extra) => {
    const { container } = renderCom(extra)
    expect(screen.getByText(SLA)).toBeInTheDocument()
    expect(container.querySelector('[data-testid="prazo-reabertura"]')).toBeNull()
  })

  it('BORDA — encerrada: sem linha de prazo nenhuma (nem reabertura, nem SLA)', () => {
    const { container } = renderCom({
      status: 'rejeitado',
      decisao_final: REABERTA,
    })
    expect(container.querySelector('[data-testid="prazo-reabertura"]')).toBeNull()
    expect(screen.queryByText(SLA)).not.toBeInTheDocument()
  })

  it('reabrir não é aprovar: nenhuma palavra de aprovação na linha (D-01, RNF-07a)', () => {
    const { container } = renderCom({ decisao_final: REABERTA })
    const linha = container.querySelector('[data-testid="prazo-reabertura"]')
    expect(linha?.textContent ?? '').not.toMatch(/aprovad|contratad|parabéns/i)
  })
})

describe('select do candidato — o embed de decisao_final (T-48-14-01)', () => {
  it('embute SÓ reaberta_em e prazo_nova_decisao_em — nada de revisão, justificativa ou autoria', async () => {
    await listCandidaturas('cand-1')
    const projecao = mocks.selects.join('\n').replace(/\s+/g, ' ')
    expect(projecao).toMatch(/decisao_final \( reaberta_em, prazo_nova_decisao_em \)/)
    const embed = projecao.match(/decisao_final \(([^)]*)\)/)?.[1] ?? ''
    expect(embed.split(',').map((c) => c.trim())).toEqual(['reaberta_em', 'prazo_nova_decisao_em'])
    expect(projecao).not.toMatch(/justificativa|revisao_|por_usuario|alerta_prazo|\*/)
  })
})
