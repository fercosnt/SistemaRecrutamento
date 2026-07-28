/**
 * Phase 15 / Plan 15-03 Task 2 — `RegistrarDecisaoForm` test (DECISAO-03, TDD).
 *
 * The terminal decision-capture form: a 3-option `decisao` radio (Aprovar / Rejeitar
 * / Manter em espera) + a mandatory justificativa textarea (≥50 chars, the client
 * mirror of the DB CHECK) + a char counter ('{n} / 50 mín.') + a "Registrar decisão"
 * CTA gated on a selection AND ≥50 chars. The confirm runs through an alert-dialog
 * whose body mentions LGPD Art. 20 for the `rejeitado` path.
 *
 * All copy strings are the EXACT pt-BR from 15-UI-SPEC.md §Copywriting Contract.
 *
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-UI-SPEC.md (decision form copy)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-03-PLAN.md (Task 2)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RegistrarDecisaoForm } from '../RegistrarDecisaoForm'

function renderForm(props?: Partial<React.ComponentProps<typeof RegistrarDecisaoForm>>) {
  return render(
    <RegistrarDecisaoForm
      onConfirm={props?.onConfirm ?? vi.fn()}
      submitting={props?.submitting ?? false}
      decisaoAtual={props?.decisaoAtual ?? null}
    />,
  )
}

describe('RegistrarDecisaoForm (Plan 15-03 — DECISAO-03)', () => {
  it('renders the 3 decisão options + the justificativa label', () => {
    renderForm()
    expect(screen.getByText('Aprovar')).toBeInTheDocument()
    expect(screen.getByText('Rejeitar')).toBeInTheDocument()
    expect(screen.getByText('Manter em espera')).toBeInTheDocument()
    expect(screen.getByText(/Justificativa/)).toBeInTheDocument()
  })

  it('the Registrar decisão CTA is DISABLED until a decisão is selected AND justificativa ≥ 50', () => {
    renderForm()
    const cta = screen.getByRole('button', { name: /Registrar decisão/ })
    expect(cta).toBeDisabled()
  })

  it('the CTA stays disabled with a decisão selected but < 50 chars', () => {
    renderForm()
    fireEvent.click(screen.getByText('Aprovar'))
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'muito curto' } })
    expect(screen.getByRole('button', { name: /Registrar decisão/ })).toBeDisabled()
  })

  it('the CTA ENABLES once a decisão is selected AND justificativa ≥ 50 chars', () => {
    renderForm()
    fireEvent.click(screen.getByText('Aprovar'))
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'x'.repeat(55) } })
    expect(screen.getByRole('button', { name: /Registrar decisão/ })).toBeEnabled()
  })

  it('renders the {n} / 50 mín. char counter reflecting the current length', () => {
    renderForm()
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'abcde' } })
    expect(screen.getByText(/5 \/ 50 mín\./)).toBeInTheDocument()
  })

  it('shows the append-only note when a decisão already exists', () => {
    renderForm({ decisaoAtual: { decisao: 'aprovado', justificativa: 'prévia', em: '2026-06-01' } })
    expect(screen.getByText(/Já existe uma decisão registrada/)).toBeInTheDocument()
  })
})
