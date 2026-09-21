/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-03 Task 2 — RED→GREEN for `AgendamentoBlock` (AGEND-02/03).
 *
 * Load-bearing contract: the block is ETAPA-GATED. Outside the two entrevista etapas
 * it renders a locked `HubSection estado="futuro"` ("Etapa ainda não iniciada"); inside
 * them, with no agendamento yet, it surfaces the `Agendar entrevista` CTA. The read hook
 * is stubbed so this suite asserts the gating + empty-state affordance without a DB.
 *
 * @see .planning/phases/34-.../34-UI-SPEC.md (§Surface 2 — Agendamento + §Copywriting §Agendamento)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

const useAgendamentoMock = vi.fn()
vi.mock('@/features/agendamento/hooks/useAgendamento', () => ({
  useAgendamento: (...args: unknown[]) => useAgendamentoMock(...args),
  agendamentoKeys: {
    all: ['agendamento'] as const,
    byCandidatura: (id: string) => ['agendamento', id] as const,
  },
}))

import { AgendamentoBlock } from '../AgendamentoBlock'

const noopMut = { mutate: vi.fn(), isPending: false }
function hookState(over: Record<string, unknown> = {}) {
  return {
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    agendar: noopMut,
    reagendar: noopMut,
    cancelar: noopMut,
    setCompareceu: noopMut,
    ...over,
  }
}

describe('AgendamentoBlock — etapa-gated interview scheduling (AGEND-02/03)', () => {
  it('etapaAtual fora de entrevista_* → bloco travado ("Etapa ainda não iniciada")', () => {
    useAgendamentoMock.mockReturnValue(hookState())
    render(<AgendamentoBlock candidaturaId="cand-1" etapaAtual="triagem" />)
    expect(screen.getByText('Etapa ainda não iniciada')).toBeInTheDocument()
  })

  it('etapaAtual=entrevista_online + sem agendamento → CTA "Agendar entrevista"', () => {
    useAgendamentoMock.mockReturnValue(hookState({ data: null }))
    render(<AgendamentoBlock candidaturaId="cand-1" etapaAtual="entrevista_online" />)
    expect(
      screen.getByRole('button', { name: /Agendar entrevista/i }),
    ).toBeInTheDocument()
  })

  // Phase 48 / 48-03 (JORN-D5): o formulário recusa link inválido no online e DIZ o que falta.
  it('online com link inválido ("dddd") → mensagem no campo e nenhuma mutação', async () => {
    const agendar = { mutate: vi.fn(), isPending: false }
    useAgendamentoMock.mockReturnValue(hookState({ data: null, agendar }))
    const user = userEvent.setup()
    render(<AgendamentoBlock candidaturaId="cand-1" etapaAtual="entrevista_online" />)
    await user.click(screen.getByRole('button', { name: /Agendar entrevista/i }))
    await user.type(screen.getByLabelText('Link da videochamada'), 'dddd')
    await user.click(screen.getByRole('button', { name: /Salvar agendamento/i }))
    expect(
      await screen.findByText('Informe um link válido, começando com http:// ou https://.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Link da videochamada')).toHaveAttribute('aria-invalid', 'true')
    expect(agendar.mutate).not.toHaveBeenCalled()
  })

  it('etapaAtual=null → bloco travado (defensivo)', () => {
    useAgendamentoMock.mockReturnValue(hookState())
    render(<AgendamentoBlock candidaturaId="cand-1" etapaAtual={null} />)
    expect(screen.getByText('Etapa ainda não iniciada')).toBeInTheDocument()
  })
})
