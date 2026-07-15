/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 31 / Plan 31-03 Task 1 — RED-first test for `RejeitarCandidaturaDialog`.
 *
 * The single shared reject surface (motivo `<Select>` + justificativa `<Textarea>` +
 * live ≥50 counter) is the client mirror of the server `btrim` + `char_length >= 50`
 * gate on the `rejeitar_candidatura` RPC. This suite pins the 6 behaviors from the
 * 31-UI-SPEC §Interaction States (VALIDATION Wave-0 gap):
 *   1. Idle/open → counter "0 / 50 mín.", confirm DISABLED.
 *   2. Motivo chosen + < 50 chars → too-short helper shown, confirm DISABLED.
 *   3. Motivo set + trimmed ≥ 50 → helper hidden, confirm ENABLED.
 *   4. Whitespace can't fake a pass (counter + gate use `.trim().length`, mirror `btrim`).
 *   5. Confirm click → `useRejeitarCandidatura().mutate` with { candidaturaId, motivo, justificativa }.
 *   6. While pending → confirm shows "Rejeitando…" and confirm + cancel DISABLED.
 *
 * The Radix `Select` is mocked to a native `<select>` (repo idiom, `NovoUsuarioDialog.test.tsx`)
 * so `fireEvent.change` drives the motivo deterministically in happy-dom; the real Radix
 * `AlertDialog` renders unmocked (proven by the sibling `ComparativoScreen.test.tsx`).
 *
 * @see src/features/decisao/components/RegistrarDecisaoForm.tsx (the counter + ≥50 gate analog)
 * @see .planning/phases/31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil/31-UI-SPEC.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Radix Select → native <select> (driveable with fireEvent.change in happy-dom) ──
vi.mock('@/components/ui/select', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    Select: ({ value, onValueChange, children }: any) =>
      React.createElement(
        'select',
        {
          'aria-label': 'Motivo da rejeição',
          value: value ?? '',
          onChange: (e: any) => onValueChange(e.target.value),
        },
        children,
      ),
    SelectTrigger: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SelectValue: () => null,
    SelectContent: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SelectItem: ({ value, children }: any) => React.createElement('option', { value }, children),
  }
})

// ── The consumed reject mutation ──────────────────────────────────────────────
const { mutateMock, useRejeitarMock } = vi.hoisted(() => {
  const mutateMock = vi.fn()
  return {
    mutateMock,
    useRejeitarMock: vi.fn(() => ({ mutate: mutateMock, isPending: false })),
  }
})
vi.mock('../../hooks/useRejeitarCandidatura', () => ({
  useRejeitarCandidatura: useRejeitarMock,
}))

// ── sonner (avoid portal noise) ───────────────────────────────────────────────
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { RejeitarCandidaturaDialog } from '../RejeitarCandidaturaDialog'

function renderDialog(onRejected = vi.fn()) {
  return render(
    <RejeitarCandidaturaDialog
      candidaturaId="c1"
      nome="Maria"
      trigger={<button>Abrir</button>}
      onRejected={onRejected}
    />,
  )
}

function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))
}

function setMotivo(value: string) {
  fireEvent.change(screen.getByLabelText('Motivo da rejeição'), { target: { value } })
}

function typeJustificativa(value: string) {
  fireEvent.change(screen.getByLabelText(/Justificativa/i), { target: { value } })
}

beforeEach(() => {
  vi.clearAllMocks()
  useRejeitarMock.mockReturnValue({ mutate: mutateMock, isPending: false })
})

describe('RejeitarCandidaturaDialog — reject gate (OPER-02)', () => {
  it('1. idle/open: title with nome, counter "0 / 50 mín.", confirm DISABLED', () => {
    renderDialog()
    open()
    expect(screen.getByText('Rejeitar Maria?')).toBeInTheDocument()
    expect(screen.getByText('0 / 50 mín.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeitar candidato' })).toBeDisabled()
  })

  it('2. motivo set + 40 chars (< 50): too-short helper shown, confirm DISABLED', () => {
    renderDialog()
    open()
    setMotivo('perfil_desalinhado')
    typeJustificativa('x'.repeat(40))
    expect(
      screen.getByText('A justificativa precisa de pelo menos 50 caracteres.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeitar candidato' })).toBeDisabled()
  })

  it('3. motivo set + 60 real chars: helper hidden, confirm ENABLED', () => {
    renderDialog()
    open()
    setMotivo('reprovado_avaliacao')
    typeJustificativa('a'.repeat(60))
    expect(
      screen.queryByText('A justificativa precisa de pelo menos 50 caracteres.'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeitar candidato' })).toBeEnabled()
  })

  it('4. 60 spaces cannot fake a pass — counter counts trimmed length, confirm DISABLED', () => {
    renderDialog()
    open()
    setMotivo('outro')
    typeJustificativa(' '.repeat(60))
    // Counter mirrors the server btrim → trimmed length is 0.
    expect(screen.getByText('0 / 50 mín.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeitar candidato' })).toBeDisabled()
  })

  it('5. confirm click → mutate with { candidaturaId, motivo, justificativa }', () => {
    renderDialog()
    open()
    setMotivo('nao_compareceu')
    const justificativa = 'O candidato não compareceu à entrevista agendada e não respondeu aos contatos.'
    typeJustificativa(justificativa)
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar candidato' }))
    expect(mutateMock).toHaveBeenCalledTimes(1)
    expect(mutateMock.mock.calls[0][0]).toEqual({
      candidaturaId: 'c1',
      motivo: 'nao_compareceu',
      justificativa,
    })
  })

  it('6. while pending: confirm shows "Rejeitando…" and confirm + cancel are DISABLED', () => {
    useRejeitarMock.mockReturnValue({ mutate: mutateMock, isPending: true })
    renderDialog()
    open()
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByRole('button', { name: /Rejeitando…/ })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })
})
