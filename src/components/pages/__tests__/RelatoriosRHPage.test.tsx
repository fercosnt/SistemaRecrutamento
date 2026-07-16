/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-05 Task 2 — the KPI dashboard on /rh/relatorios (KPI-02/04).
 *
 * Load-bearing contract: the page sources everything from `useFunilKpis` (the funil_kpis
 * DEFINER RPC) and renders 3 MetricCards + 4 chart titles; a null taxa/time renders "—"
 * (never a fabricated 0%, T-34-05-03); an all-empty payload → the verbatim empty copy;
 * an error → the retry copy. The `useFunilKpis` hook is stubbed so this suite asserts the
 * cards/titles/states without a DB. The chart wrapper + RHLayout are stubbed to keep the
 * assertions on the dashboard content (recharts needs real layout dims — out of scope here).
 *
 * @see src/features/funil/components/__tests__/FilaTrabalhoTab.test.tsx (mock idiom cloned)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const useFunilKpisMock = vi.fn()
vi.mock('@/features/funil/hooks/useFunilKpis', () => ({
  useFunilKpis: (...args: unknown[]) => useFunilKpisMock(...args),
  funilKpisKeys: {
    all: ['funil-kpis'] as const,
    byVaga: (v: string | null) => ['funil-kpis', v ?? 'todas'] as const,
  },
}))

// Chart wrapper stub — do NOT mount recharts (no layout dims in happy-dom). The chart
// card <h2> titles live OUTSIDE ChartContainer, so they still render + are asserted.
vi.mock('../../ui/chart', () => ({
  ChartContainer: ({ className }: { className?: string }) => (
    <div data-testid="chart" className={className} />
  ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}))

// RHLayout stub — render children only (avoids the RH shell's router/auth deps).
vi.mock('../../RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { RelatoriosRHPage } from '../RelatoriosRHPage'

function hookState(over: Record<string, unknown> = {}) {
  return { data: undefined, isLoading: false, isError: false, refetch: vi.fn(), ...over }
}

const POPULATED = {
  median_time_per_stage: { triagem: 172800 },
  conversion_stage_to_stage: [{ de: 'triagem', para: 'entrevista_online', n: 4 }],
  volume_by_stage: { triagem: 10, entrevista_online: 3 },
  time_to_hire: 864000, // 10 days
  knockout_rate: { knockouts: 2, total: 10, taxa: 0.2 }, // 20.0%
  drop_per_stage: { triagem: { dropped: 1, saidas: 5, taxa: 0.2 } },
  no_show_rate: { no_shows: 1, total: 4, taxa: 0.25 }, // 25.0%
}

const EMPTY = {
  median_time_per_stage: {},
  conversion_stage_to_stage: [],
  volume_by_stage: {},
  time_to_hire: null,
  knockout_rate: { knockouts: 0, total: 0, taxa: null },
  drop_per_stage: {},
  no_show_rate: { no_shows: 0, total: 0, taxa: null },
}

describe('RelatoriosRHPage — funil_kpis dashboard (KPI-02/04)', () => {
  beforeEach(() => {
    useFunilKpisMock.mockReset()
  })

  it('renders the page title + 3 metric cards + 4 chart titles from the RPC payload', () => {
    useFunilKpisMock.mockReturnValue(hookState({ data: POPULATED }))
    render(<RelatoriosRHPage />)

    expect(screen.getByText('Relatórios do funil')).toBeInTheDocument()

    // 3 metric cards
    expect(screen.getByText('Tempo até contratação')).toBeInTheDocument()
    expect(screen.getByText('Taxa de no-show')).toBeInTheDocument()
    expect(screen.getByText('Taxa de knockout')).toBeInTheDocument()

    // 4 chart titles
    expect(screen.getByText('Volume por etapa')).toBeInTheDocument()
    expect(screen.getByText('Tempo mediano por etapa')).toBeInTheDocument()
    expect(screen.getByText('Conversão etapa a etapa')).toBeInTheDocument()
    expect(screen.getByText('Drop por etapa')).toBeInTheDocument()
  })

  it('formats time_to_hire in days and taxa as a percent', () => {
    useFunilKpisMock.mockReturnValue(hookState({ data: POPULATED }))
    render(<RelatoriosRHPage />)
    expect(screen.getByText('10 dias')).toBeInTheDocument()
    expect(screen.getByText('25.0%')).toBeInTheDocument() // no-show
    expect(screen.getByText('20.0%')).toBeInTheDocument() // knockout
  })

  it('renders "—" for a null taxa/time (never a fabricated 0%)', () => {
    useFunilKpisMock.mockReturnValue(
      hookState({
        data: {
          ...POPULATED,
          time_to_hire: null,
          no_show_rate: { no_shows: 0, total: 0, taxa: null },
        },
      }),
    )
    render(<RelatoriosRHPage />)
    // time_to_hire "—" + no_show "—"
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('renders the empty state for an all-empty payload', () => {
    useFunilKpisMock.mockReturnValue(hookState({ data: EMPTY }))
    render(<RelatoriosRHPage />)
    expect(screen.getByText('Sem dados no período')).toBeInTheDocument()
    expect(
      screen.getByText('Os KPIs aparecerão conforme os candidatos avançam pelo funil.'),
    ).toBeInTheDocument()
    // no metric cards in the empty state
    expect(screen.queryByText('Tempo até contratação')).not.toBeInTheDocument()
  })

  it('renders the error state with retry copy', () => {
    useFunilKpisMock.mockReturnValue(hookState({ isError: true }))
    render(<RelatoriosRHPage />)
    expect(
      screen.getByText(
        'Não foi possível carregar os KPIs. Verifique sua conexão e tente novamente.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('shows the loading skeleton grid', () => {
    useFunilKpisMock.mockReturnValue(hookState({ isLoading: true }))
    const { container } = render(<RelatoriosRHPage />)
    // loading = no metric labels, no empty/error copy yet
    expect(screen.queryByText('Sem dados no período')).not.toBeInTheDocument()
    expect(screen.queryByText('Tempo até contratação')).not.toBeInTheDocument()
    expect(container.querySelector('.lg\\:grid-cols-3')).toBeInTheDocument()
  })
})
