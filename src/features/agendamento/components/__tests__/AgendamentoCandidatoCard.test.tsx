/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 35 / Plan 35-02 Task 2 — RED→GREEN for `AgendamentoCandidatoCard`
 * (AGEND-04 / AGEND-05). REQUIRED behavioral suite (plan-check W1): a grep cannot catch
 * an inverted boolean on the .ics/badge gating, so these assertions lock it.
 *
 * The card OWNS `useMeuAgendamento`; the hook is mocked here to drive fixed rows. The
 * real service predicates (`ehUpcomingNaoCancelada`/`estaDentroDe24h`) and the real
 * SP-formatter run — dates are relative to `Date.now()` so the ≤24h gate is deterministic
 * without fake timers.
 *
 * Load-bearing contract:
 *  (a) cancelada + FUTURE → card VISIBLE (+ cancel note) but NO .ics button, NO ≤24h badge.
 *  (b) presencial → NEVER an <a> (even when local_ou_link looks like a URL) — plain `Local: `.
 *  (c) upcoming online within 24h → .ics button + ≤24h badge + link with rel="noopener noreferrer".
 *
 * @see .planning/phases/35-.../35-UI-SPEC.md (§States Contract + §.ics & ≤24h Badge Contract)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const useMeuAgendamentoMock = vi.fn()
vi.mock('@/features/agendamento/hooks/useMeuAgendamento', () => ({
  useMeuAgendamento: (...args: unknown[]) => useMeuAgendamentoMock(...args),
  meuAgendamentoKeys: {
    all: ['meu-agendamento'] as const,
    byCandidatura: (id: string) => ['meu-agendamento', id] as const,
  },
}))

import { AgendamentoCandidatoCard } from '../AgendamentoCandidatoCard'
import type { MeuAgendamentoRow } from '../../services/agendamentoCandidatoService'

const H = 60 * 60 * 1000
const in2h = () => new Date(Date.now() + 2 * H).toISOString() // future AND within 24h
const in48h = () => new Date(Date.now() + 48 * H).toISOString() // future, beyond 24h

function makeRow(over: Partial<MeuAgendamentoRow> = {}): MeuAgendamentoRow {
  return {
    id: 'ag-1',
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    tipo: 'online',
    data_hora: in2h(),
    local_ou_link: 'https://meet.example/abc',
    status: 'agendada',
    compareceu: null,
    ...over,
  }
}

function hookState(over: Record<string, unknown> = {}) {
  return {
    data: undefined as MeuAgendamentoRow | null | undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...over,
  }
}

function renderCard() {
  return render(<AgendamentoCandidatoCard candidaturaId="cand-1" />)
}

beforeEach(() => {
  useMeuAgendamentoMock.mockReset()
})

describe('AgendamentoCandidatoCard — states + AGEND-05 gating', () => {
  it('(a) cancelada + FUTURE data_hora → card visible with cancel note, but NO .ics button and NO ≤24h badge', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({ data: makeRow({ status: 'cancelada', data_hora: in2h() }) }),
    )
    renderCard()

    // card is visible — the cancelada chip + note render
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    expect(screen.getByText(/Esta entrevista foi cancelada/)).toBeInTheDocument()
    // gated OUT: no .ics button, no ≤24h badge — even though the date is in the future
    expect(screen.queryByText(/Adicionar à agenda/)).toBeNull()
    expect(screen.queryByText(/menos de 24h/)).toBeNull()
  })

  it('(b) tipo=presencial → renders NO <a> even when local_ou_link looks like a URL, and shows the "Local: " text', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({
        data: makeRow({
          tipo: 'presencial',
          // deliberately URL-shaped to prove presencial is NEVER linkified
          local_ou_link: 'https://maps.example/av-paulista-1000',
          data_hora: in2h(),
        }),
      }),
    )
    renderCard()

    expect(screen.queryByRole('link')).toBeNull()
    expect(
      screen.getByText(/Local:\s*https:\/\/maps\.example\/av-paulista-1000/),
    ).toBeInTheDocument()
    expect(screen.getByText('Presencial')).toBeInTheDocument()
  })

  it('(c) upcoming online within 24h, non-cancelled → .ics button + ≤24h badge + safe link', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({
        data: makeRow({
          tipo: 'online',
          status: 'agendada',
          local_ou_link: 'https://meet.example/abc',
          data_hora: in2h(),
        }),
      }),
    )
    renderCard()

    expect(screen.getByText(/Adicionar à agenda/)).toBeInTheDocument()
    expect(screen.getByText(/menos de 24h/)).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /videochamada/i })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('href', 'https://meet.example/abc')
  })

  it('upcoming online BEYOND 24h → .ics button present but NO ≤24h badge', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({ data: makeRow({ data_hora: in48h() }) }),
    )
    renderCard()

    expect(screen.getByText(/Adicionar à agenda/)).toBeInTheDocument()
    expect(screen.queryByText(/menos de 24h/)).toBeNull()
  })

  it('online with null local_ou_link → graceful fallback, no link (W4)', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({ data: makeRow({ tipo: 'online', local_ou_link: null }) }),
    )
    renderCard()

    expect(screen.queryByRole('link')).toBeNull()
    expect(
      screen.getByText(/Link da videochamada será informado em breve/),
    ).toBeInTheDocument()
  })

  it('(WR-01) online with a javascript:-scheme link → NOT rendered as <a>, shown as inert text', () => {
    const evil = 'javascript:alert(document.cookie)'
    useMeuAgendamentoMock.mockReturnValue(
      hookState({ data: makeRow({ tipo: 'online', local_ou_link: evil }) }),
    )
    renderCard()

    // defense-in-depth: an unsafe scheme is NEVER linkified
    expect(screen.queryByRole('link')).toBeNull()
    // the value is still shown, but as inert text (visible, not clickable)
    expect(screen.getByText(evil)).toBeInTheDocument()
  })

  it('(WR-01) online with a data:-scheme link → NOT rendered as <a>', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({
        data: makeRow({
          tipo: 'online',
          local_ou_link: 'data:text/html,<script>alert(1)</script>',
        }),
      }),
    )
    renderCard()

    expect(screen.queryByRole('link')).toBeNull()
  })

  it('loading → shows the eyebrow, no .ics button', () => {
    useMeuAgendamentoMock.mockReturnValue(hookState({ isLoading: true }))
    renderCard()

    expect(screen.getByText('Sua entrevista')).toBeInTheDocument()
    expect(screen.queryByText(/Adicionar à agenda/)).toBeNull()
  })

  it('no-agendamento (data null) → "Aguardando agendamento" empty copy', () => {
    useMeuAgendamentoMock.mockReturnValue(hookState({ data: null }))
    renderCard()

    expect(screen.getByText('Aguardando agendamento')).toBeInTheDocument()
    expect(
      screen.getByText(/O RH ainda não agendou sua entrevista/),
    ).toBeInTheDocument()
  })

  it('error → inline message + "Tentar novamente" re-triggers refetch', () => {
    const refetch = vi.fn()
    useMeuAgendamentoMock.mockReturnValue(hookState({ isError: true, refetch }))
    renderCard()

    expect(
      screen.getByText('Não foi possível carregar os detalhes da sua entrevista.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
