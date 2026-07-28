/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-04 Task 2 — RED→GREEN for `FilaTrabalhoTab` (KPI-01/03).
 *
 * Load-bearing contract: the cross-vaga queue renders one row per waiting candidatura
 * with a colorblind-safe SLA badge (text + day count, never color-only — T-34-04-03) and
 * a row link to `/rh/candidatos/:candidaturaId`. The empty state uses the verbatim UI-SPEC
 * copy. The read hook is stubbed so this suite asserts the table + badges + links + empty
 * copy without a DB. System time is frozen so the day-count classification is deterministic.
 *
 * @see .planning/phases/34-.../34-UI-SPEC.md (§Surface 3 + §Copywriting §Fila)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

const useFilaMock = vi.fn()
vi.mock('@/features/funil/hooks/useFilaTrabalho', () => ({
  useFilaTrabalho: (...args: unknown[]) => useFilaMock(...args),
  filaKeys: {
    all: ['fila-trabalho'] as const,
    lista: () => ['fila-trabalho', 'lista'] as const,
  },
}))

import { FilaTrabalhoTab } from '../FilaTrabalhoTab'

function hookState(over: Record<string, unknown> = {}) {
  return {
    data: [] as unknown[],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isRefetching: false,
    ...over,
  }
}

// triagem threshold = 3 (breach > 4.5). Timestamps are relative to the frozen "now".
const rows = [
  {
    candidatura_id: 'c-aging',
    vaga_id: 'v1',
    vaga_titulo: 'Dentista — Matriz',
    candidato_id: 'k1',
    candidato_nome: 'Ana Aging',
    etapa_atual: 'triagem',
    status: 'em_analise',
    entrou_etapa_em: '2026-07-13T12:00:00Z', // 3 days ago → aging
  },
  {
    candidatura_id: 'c-breach',
    vaga_id: 'v2',
    vaga_titulo: 'Recepção — Filial',
    candidato_id: 'k2',
    candidato_nome: 'Bruno Breach',
    etapa_atual: 'triagem',
    status: 'em_analise',
    entrou_etapa_em: '2026-07-10T12:00:00Z', // 6 days ago → breach
  },
]

function renderTab() {
  return render(
    <MemoryRouter>
      <FilaTrabalhoTab />
    </MemoryRouter>,
  )
}

describe('FilaTrabalhoTab — cross-vaga work queue (KPI-01/03)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-16T12:00:00Z'))
    useFilaMock.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders both candidatos with their SLA badges (aging amber + breach red, text + day count)', () => {
    useFilaMock.mockReturnValue(hookState({ data: rows }))
    renderTab()

    expect(screen.getByText('Ana Aging')).toBeInTheDocument()
    expect(screen.getByText('Bruno Breach')).toBeInTheDocument()

    // Colorblind-safe: the badge carries a text label + day count in the same element.
    expect(screen.getByText('Atenção · 3d')).toBeInTheDocument()
    expect(screen.getByText('Atrasado · 6d')).toBeInTheDocument()
  })

  it('every row links to /rh/candidatos/:candidaturaId', () => {
    useFilaMock.mockReturnValue(hookState({ data: rows }))
    renderTab()

    const links = screen.getAllByRole('link', { name: /abrir/i })
    expect(links).toHaveLength(2)
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/rh/candidatos/c-aging')
    expect(hrefs).toContain('/rh/candidatos/c-breach')
  })

  it('empty queue → verbatim UI-SPEC empty copy', () => {
    useFilaMock.mockReturnValue(hookState({ data: [] }))
    renderTab()

    expect(screen.getByText('Nenhum candidato aguardando ação')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Quando houver candidatos parados em uma etapa, eles aparecerão aqui priorizados por tempo de espera.',
      ),
    ).toBeInTheDocument()
  })

  it('error → verbatim error heading + retry affordance', () => {
    useFilaMock.mockReturnValue(hookState({ isError: true }))
    renderTab()

    expect(screen.getByText('Não foi possível carregar a fila.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  })
})
