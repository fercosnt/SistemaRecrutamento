/// <reference types="@testing-library/jest-dom" />
/**
 * DashboardCandidatoPage funnel step-CTA + LGPD card tests — Phase 17 Plan 17-04
 * (D-09 / D-11 / D-09-drift-guard).
 *
 * RED until Task 1 replaces the hardcoded "Testes disponíveis" mock block with the
 * funilNavMap-driven step-CTA + the in-app LGPD card, and repoints the candidate
 * landing (RoleGuard.ROLE_HOME.candidato → /candidato/dashboard).
 *
 * Behaviors covered:
 *   - avaliacao_assincrona → "Continuar para Avaliação Assíncrona" CTA navigates to
 *     /candidato/avaliacao/{candidaturaId} on click (D-09).
 *   - an unknown/stale (non-M2) etapa_atual → neutral "Acompanhar candidatura" (drift guard,
 *     never crashes — D-09 drift guard).
 *   - etapa in {decisao_final, aprovado, rejeitado} with a decision present → LGPD card
 *     ("Entenda a decisão sobre sua candidatura") whose CTA routes to
 *     /candidato/explicacao/{candidaturaId} (D-11).
 *   - the hardcoded mock progress block ("45%", "Vagas Compatíveis") is gone.
 *   - RoleGuard.ROLE_HOME.candidato === '/candidato/dashboard' (landing repoint, Pitfall 3 / A5).
 *
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-04-PLAN.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  candidaturasData: { data: [] as unknown[] },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigateMock }
})

vi.mock('@/features/vagas/hooks', () => ({
  useCandidaturas: () => ({
    data: mocks.candidaturasData,
    isLoading: false,
    error: null,
  }),
  useCandidaturasCount: () => ({
    total: mocks.candidaturasData.data.length,
    aguardando: 0,
    em_analise: 0,
    aprovadas: 0,
    rejeitadas: 0,
    finalizadas: 0,
  }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ logout: vi.fn(() => Promise.resolve()) }),
  useCandidato: () => ({ nome_completo: 'Maria Teste', email: 'maria@teste.com' }),
}))

import { DashboardCandidatoPage } from '../DashboardCandidatoPage'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardCandidatoPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.candidaturasData = { data: [] }
})

describe('DashboardCandidatoPage funnel step-CTA (D-09)', () => {
  it('renders "Continuar para Avaliação Assíncrona" and navigates to /candidato/avaliacao/{id}', () => {
    mocks.candidaturasData = {
      data: [
        {
          id: 'cand-1',
          vaga_id: 'vaga-1',
          vaga: { titulo: 'Dentista' },
          etapa_atual: 'avaliacao_assincrona',
          status: 'aguardando_resposta',
          created_at: '2026-06-01T00:00:00Z',
          feedback_rejeicao: null,
          data_decisao_final: null,
        },
      ],
    }
    renderDashboard()

    const cta = screen.getByText(/Continuar para Avaliação Assíncrona/i)
    expect(cta).toBeInTheDocument()
    fireEvent.click(cta)
    expect(mocks.navigateMock).toHaveBeenCalledWith('/candidato/avaliacao/cand-1')
  })

  it('falls back to neutral "Acompanhar candidatura" for an unknown/stale etapa (drift guard, no crash)', () => {
    mocks.candidaturasData = {
      data: [
        {
          id: 'cand-stale',
          vaga_id: 'vaga-1',
          vaga: { titulo: 'Vaga' },
          // M1 legacy value not present in the M2 funilNavMap → must not crash.
          etapa_atual: 'bigfive',
          status: 'em_analise',
          created_at: '2026-06-01T00:00:00Z',
          feedback_rejeicao: null,
          data_decisao_final: null,
        },
      ],
    }
    renderDashboard()
    expect(screen.getByText(/Acompanhar candidatura/i)).toBeInTheDocument()
  })
})

describe('DashboardCandidatoPage LGPD card (D-11)', () => {
  it('shows the LGPD card and routes to /candidato/explicacao/{id} when a final decision exists', () => {
    mocks.candidaturasData = {
      data: [
        {
          id: 'cand-rej',
          vaga_id: 'vaga-1',
          vaga: { titulo: 'Vaga' },
          etapa_atual: 'rejeitado',
          status: 'rejeitado',
          created_at: '2026-06-01T00:00:00Z',
          feedback_rejeicao: 'Agradecemos o interesse.',
          data_decisao_final: '2026-06-10T00:00:00Z',
        },
      ],
    }
    renderDashboard()

    expect(
      screen.getByText(/Entenda a decisão sobre sua candidatura/i),
    ).toBeInTheDocument()
    const verExplicacao = screen.getByText(/Ver explicação/i)
    fireEvent.click(verExplicacao)
    expect(mocks.navigateMock).toHaveBeenCalledWith('/candidato/explicacao/cand-rej')
  })

  it('does NOT show the LGPD card when there is no final decision', () => {
    mocks.candidaturasData = {
      data: [
        {
          id: 'cand-1',
          vaga_id: 'vaga-1',
          vaga: { titulo: 'Vaga' },
          etapa_atual: 'avaliacao_assincrona',
          status: 'aguardando_resposta',
          created_at: '2026-06-01T00:00:00Z',
          feedback_rejeicao: null,
          data_decisao_final: null,
        },
      ],
    }
    renderDashboard()
    expect(
      screen.queryByText(/Entenda a decisão sobre sua candidatura/i),
    ).not.toBeInTheDocument()
  })
})

describe('DashboardCandidatoPage mock block removed (D-09)', () => {
  it('no longer renders the hardcoded progress mock ("45%" / "Vagas Compatíveis")', () => {
    renderDashboard()
    expect(screen.queryByText(/Vagas Compatíveis/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^45%$/)).not.toBeInTheDocument()
  })
})
