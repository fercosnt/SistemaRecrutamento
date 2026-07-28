/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 29 / Review WR-02 — EditarPapelDialog reset-on-open (USR-03).
 *
 * Pins the code-review WR-02 fix: the dialog is rendered ONCE per row and never unmounts
 * (Radix keeps it mounted), so the RHF default seeds only at mount. Without a
 * `reset({ novo_papel })` on every `open`, a change-then-cancel-then-reopen would show the
 * STALE uncommitted selection (and could arm the demote guard from stale input). This suite
 * mocks the Dialog to keep children MOUNTED across `open` toggles (the real Radix behavior —
 * NOT the table suite's unmount-on-close mock, which would mask the bug), so the reset effect
 * is what has to re-sync the Select to the live role.
 *
 * @see src/features/admin/components/EditarPapelDialog.tsx (reset-on-open effect)
 * @see src/features/admin/components/NovoUsuarioDialog.tsx (reset-on-open/close/success analog)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Radix Dialog → children ALWAYS mounted (mirror Radix's non-unmount; do NOT gate on open) ──
vi.mock('@/components/ui/dialog', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Frag = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    Dialog: Frag,
    DialogContent: ({ children }: any) => React.createElement('div', null, children),
    DialogDescription: Frag,
    DialogFooter: Frag,
    DialogHeader: Frag,
    DialogTitle: ({ children }: any) => React.createElement('h2', null, children),
  }
})

// ── Radix Select → native <select> (drivable with fireEvent.change) ────────────
vi.mock('@/components/ui/select', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    Select: ({ value, onValueChange, children }: any) =>
      React.createElement(
        'select',
        {
          'aria-label': 'Papel',
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

// ── Radix Tooltip → content always rendered ────────────────────────────────────
vi.mock('@/components/ui/tooltip', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Frag = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    TooltipProvider: Frag,
    Tooltip: Frag,
    TooltipTrigger: Frag,
    TooltipContent: ({ children }: any) => React.createElement('span', { role: 'tooltip' }, children),
  }
})

const { mudarPapelMock, useMudarPapelMock } = vi.hoisted(() => {
  const mudarPapelMock = vi.fn()
  return {
    mudarPapelMock,
    useMudarPapelMock: vi.fn(() => ({ mutateAsync: mudarPapelMock, isPending: false })),
  }
})
vi.mock('../../hooks/useUsuariosRh', () => ({ useMudarPapel: useMudarPapelMock }))

import { EditarPapelDialog } from '../EditarPapelDialog'
import type { UsuarioRhRow } from '../../services/usuariosRhService'

const rui: UsuarioRhRow = {
  id: 'rui-id',
  user_id: 'rui-user',
  nome_completo: 'Rui Recrutador',
  email: 'rui@beautysmile.com.br',
  cargo: 'Recrutador',
  role: 'recrutador',
  ativo: true,
  primeiro_acesso: false,
  data_ultimo_login: '2026-07-09T12:00:00Z',
}

const papelSelect = () => screen.getByLabelText('Papel') as HTMLSelectElement

beforeEach(() => {
  vi.clearAllMocks()
  useMudarPapelMock.mockReturnValue({ mutateAsync: mudarPapelMock, isPending: false })
  mudarPapelMock.mockResolvedValue({ ok: true })
})

describe('EditarPapelDialog — reset-on-open re-syncs the Select to the live role (WR-02)', () => {
  it('seeds the Select to the current role on open', () => {
    render(<EditarPapelDialog open onOpenChange={vi.fn()} user={rui} isLastActiveAdmin={false} />)
    expect(papelSelect().value).toBe('recrutador')
  })

  it('a change-then-close-then-reopen shows the LIVE role, not the stale uncommitted selection', () => {
    const { rerender } = render(
      <EditarPapelDialog open onOpenChange={vi.fn()} user={rui} isLastActiveAdmin={false} />,
    )
    // Change the Select but never commit (no Salvar).
    fireEvent.change(papelSelect(), { target: { value: 'administrador' } })
    expect(papelSelect().value).toBe('administrador')

    // Close (component stays MOUNTED — Radix does not unmount).
    rerender(
      <EditarPapelDialog open={false} onOpenChange={vi.fn()} user={rui} isLastActiveAdmin={false} />,
    )
    // Reopen → the reset effect must re-seed to the live role.
    rerender(
      <EditarPapelDialog open onOpenChange={vi.fn()} user={rui} isLastActiveAdmin={false} />,
    )
    expect(papelSelect().value).toBe('recrutador')
  })
})
