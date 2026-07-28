/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 25 / Plan 25-02 Task 3 — UpdateStatusModal reject-reroute regression net (FUNIL-02).
 *
 * The modal's reject transition used to write a raw status-only update
 * (useUpdateCandidaturaStatus) with a non-empty (but unbounded) motivo — a path that
 * bypassed the audit trail (A9). This suite pins the corrected contract:
 *  - a reject requires a ≥50-char justificativa; the confirm button stays disabled
 *    until the justificativa is valid (mirrors the DB CHECK / registrar_decisao floor);
 *  - confirming a reject routes through registrar_decisao (useRegistrarDecisao) with
 *    { candidaturaId, decisao:'rejeitado', justificativa } — NOT the raw status hook;
 *  - a NON-reject transition keeps the existing useUpdateCandidaturaStatus path.
 *
 * The Radix Select/Dialog primitives are mocked to native equivalents — this suite
 * installs no pointer/scrollIntoView polyfills, and the behavior under test is the
 * modal's routing/gating logic, not the third-party widgets.
 *
 * @see src/features/decisao/hooks/useRegistrarDecisao.ts (the audited write path)
 * @see .planning/phases/25-corre-o-do-funil-lado-rh-enums-colunas-contratos/25-02-PLAN.md (Task 3)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Radix Select → native <select> (driveable with fireEvent.change in happy-dom).
vi.mock('@/components/ui/select', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    Select: ({ value, onValueChange, disabled, children }: any) =>
      React.createElement(
        'select',
        {
          'data-testid': 'status-select',
          value: value ?? '',
          disabled,
          onChange: (e: any) => onValueChange(e.target.value),
        },
        children,
      ),
    SelectTrigger: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SelectValue: ({ placeholder }: any) =>
      React.createElement('option', { value: '' }, placeholder ?? ''),
    SelectContent: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SelectItem: ({ value, children }: any) =>
      React.createElement('option', { value }, children),
  }
})

// Radix Dialog → plain container gated on `open` (avoids portal/focus-scope flakiness).
vi.mock('@/components/ui/dialog', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Passthrough = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    Dialog: ({ open, children }: any) => (open ? React.createElement('div', null, children) : null),
    DialogContent: ({ children }: any) => React.createElement('div', null, children),
    DialogDescription: Passthrough,
    DialogFooter: Passthrough,
    DialogHeader: Passthrough,
    DialogTitle: Passthrough,
  }
})

const mutateStatus = vi.fn()
const mutateReject = vi.fn()
vi.mock('@/features/vagas/hooks/useCandidaturas', () => ({
  useUpdateCandidaturaStatus: () => ({ mutate: mutateStatus, isPending: false }),
}))
vi.mock('@/features/decisao/hooks/useRegistrarDecisao', () => ({
  useRegistrarDecisao: () => ({ mutate: mutateReject, isPending: false }),
}))

import { UpdateStatusModal } from '../UpdateStatusModal'

const LONG_JUSTIFICATIVA =
  'Após a entrevista técnica o perfil não atende aos requisitos essenciais da vaga neste momento.'

function renderModal(props?: Partial<React.ComponentProps<typeof UpdateStatusModal>>) {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  render(
    <UpdateStatusModal
      open
      onOpenChange={onOpenChange}
      candidaturaId="cand-1"
      candidatoNome="Ana"
      statusAtual="em_analise"
      onSuccess={onSuccess}
      {...props}
    />,
  )
  return { onOpenChange, onSuccess }
}

function selectStatus(value: string) {
  fireEvent.change(screen.getByTestId('status-select'), { target: { value } })
}

function salvarButton() {
  return screen.getByRole('button', { name: /salvar/i })
}

describe('UpdateStatusModal — reject routes through registrar_decisao with ≥50-char justificativa (FUNIL-02)', () => {
  beforeEach(() => {
    mutateStatus.mockReset()
    mutateReject.mockReset()
  })

  it('keeps the confirm button disabled until the reject justificativa reaches 50 chars', () => {
    renderModal()
    selectStatus('rejeitado')
    // No justificativa yet → disabled.
    expect(salvarButton()).toBeDisabled()

    // Too short (<50) → still disabled.
    fireEvent.change(screen.getByLabelText(/motivo da rejeição/i), {
      target: { value: 'curto demais' },
    })
    expect(salvarButton()).toBeDisabled()

    // ≥50 chars → enabled.
    fireEvent.change(screen.getByLabelText(/motivo da rejeição/i), {
      target: { value: LONG_JUSTIFICATIVA },
    })
    expect(salvarButton()).toBeEnabled()
  })

  it('confirming a reject calls registrar_decisao (not the raw status hook)', () => {
    renderModal()
    selectStatus('rejeitado')
    fireEvent.change(screen.getByLabelText(/motivo da rejeição/i), {
      target: { value: LONG_JUSTIFICATIVA },
    })
    fireEvent.click(salvarButton())

    expect(mutateReject).toHaveBeenCalledTimes(1)
    expect(mutateReject).toHaveBeenCalledWith(
      expect.objectContaining({
        candidaturaId: 'cand-1',
        decisao: 'rejeitado',
        justificativa: LONG_JUSTIFICATIVA,
      }),
      expect.anything(),
    )
    expect(mutateStatus).not.toHaveBeenCalled()
  })

  it('a non-reject transition keeps the existing useUpdateCandidaturaStatus path', () => {
    renderModal()
    selectStatus('aprovado_proxima')
    fireEvent.click(salvarButton())

    expect(mutateStatus).toHaveBeenCalledTimes(1)
    expect(mutateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        candidaturaId: 'cand-1',
        status_candidatura: 'aprovado_proxima',
      }),
    )
    expect(mutateReject).not.toHaveBeenCalled()
  })
})
