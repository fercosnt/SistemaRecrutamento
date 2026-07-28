/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 29 / Plan 29-02 — NovoUsuarioDialog (USR-02 create form).
 *
 * Pins the create-dialog contract from the UI-SPEC §Create User Dialog +
 * §Copywriting Contract (verbatim pt-BR):
 *  - a valid submit dispatches the `criar` mutation with the 4 form fields (papel
 *    defaults to 'recrutador'); on resolve the dialog CLOSES (onOpenChange(false))
 *    and does NOT double-toast — the hook owns success/EMAIL_SEND_FAILED warning;
 *  - EMAIL_SEND_FAILED (success-with-warning) still closes the dialog, no error toast;
 *  - EMAIL_EXISTS routes to a FIELD error on `email` and KEEPS the dialog open;
 *  - VALIDATION / FORBIDDEN / NOT_FOUND / SERVER_ERROR map to the exact pt-BR toast;
 *  - client-side invalid input (empty required fields) BLOCKS the invoke;
 *  - while pending the submit shows "Criando…" + disabled (no double submit).
 *
 * The Radix Dialog/Select primitives are mocked to native equivalents (the repo idiom,
 * `UpdateStatusModal.test.tsx`) — this suite installs no pointer/portal polyfills; the
 * behavior under test is the dialog's dispatch + error routing, not the widgets.
 *
 * @see src/features/admin/hooks/useUsuariosRh.ts (useCriarUsuario — the consumed mutation)
 * @see .planning/phases/29-console-de-gest-o-de-usu-rios-rh/29-UI-SPEC.md (§Create User Dialog)
 * @see .planning/phases/29-console-de-gest-o-de-usu-rios-rh/29-02-PLAN.md (Task 1)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Radix Dialog → plain container gated on `open` (avoids portal/focus-scope flakiness) ──
vi.mock('@/components/ui/dialog', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Passthrough = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    Dialog: ({ open, children }: any) => (open ? React.createElement('div', null, children) : null),
    DialogContent: ({ children }: any) => React.createElement('div', null, children),
    DialogDescription: Passthrough,
    DialogFooter: Passthrough,
    DialogHeader: Passthrough,
    DialogTitle: ({ children }: any) => React.createElement('h2', null, children),
  }
})

// ── Radix Select → native <select> (driveable with fireEvent.change in happy-dom) ──
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

// ── The consumed create mutation ──────────────────────────────────────────────
const { mutateAsyncMock, useCriarUsuarioMock } = vi.hoisted(() => {
  const mutateAsyncMock = vi.fn()
  return {
    mutateAsyncMock,
    useCriarUsuarioMock: vi.fn(() => ({ mutateAsync: mutateAsyncMock, isPending: false })),
  }
})
vi.mock('../../hooks/useUsuariosRh', () => ({ useCriarUsuario: useCriarUsuarioMock }))

// ── Toast (assert dialog error routing without portal noise) ───────────────────
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

import { NovoUsuarioDialog } from '../NovoUsuarioDialog'
import { toast } from 'sonner'

function fillValid() {
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'novo@beautysmile.com.br' },
  })
  fireEvent.change(screen.getByLabelText('Nome completo'), {
    target: { value: 'Novo Usuário' },
  })
  fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'Recrutador' } })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Criar usuário' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  useCriarUsuarioMock.mockReturnValue({ mutateAsync: mutateAsyncMock, isPending: false })
  mutateAsyncMock.mockResolvedValue({ ok: true })
})

describe('NovoUsuarioDialog — layout + honest copy (UI-SPEC §Create User Dialog)', () => {
  it('renders the title, the 4 fields, the honest helper and the footer buttons', () => {
    render(<NovoUsuarioDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Novo usuário' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    expect(screen.getByLabelText('Cargo')).toBeInTheDocument()
    expect(screen.getByLabelText('Papel')).toBeInTheDocument()
    expect(
      screen.getByText(
        'O usuário receberá um e-mail para definir a própria senha e acessar o painel.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar usuário' })).toBeInTheDocument()
  })

  it('offers exactly Recrutador/Administrador with recrutador as the default', () => {
    render(<NovoUsuarioDialog open onOpenChange={vi.fn()} />)
    const select = screen.getByLabelText('Papel') as HTMLSelectElement
    expect(select.value).toBe('recrutador')
    expect(screen.getByRole('option', { name: 'Recrutador' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Administrador' })).toBeInTheDocument()
  })
})

describe('NovoUsuarioDialog — submit dispatches criar (USR-02)', () => {
  it('sends { email, nome_completo, cargo, papel:recrutador } to the criar mutation', async () => {
    render(<NovoUsuarioDialog open onOpenChange={vi.fn()} />)
    fillValid()
    submit()
    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        email: 'novo@beautysmile.com.br',
        nome_completo: 'Novo Usuário',
        cargo: 'Recrutador',
        papel: 'recrutador',
      }),
    )
  })

  it('on success closes the dialog and does NOT double-toast (the hook owns the toast)', async () => {
    const onOpenChange = vi.fn()
    render(<NovoUsuarioDialog open onOpenChange={onOpenChange} />)
    fillValid()
    submit()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('treats EMAIL_SEND_FAILED as success-with-warning: closes, no error toast', async () => {
    mutateAsyncMock.mockResolvedValue({ ok: true, warning: 'EMAIL_SEND_FAILED' })
    const onOpenChange = vi.fn()
    render(<NovoUsuarioDialog open onOpenChange={onOpenChange} />)
    fillValid()
    submit()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('NovoUsuarioDialog — error_code routing (UI-SPEC §Create feedback)', () => {
  it('EMAIL_EXISTS shows a field error on email and KEEPS the dialog open', async () => {
    mutateAsyncMock.mockRejectedValue({ details: { error_code: 'EMAIL_EXISTS' } })
    const onOpenChange = vi.fn()
    render(<NovoUsuarioDialog open onOpenChange={onOpenChange} />)
    fillValid()
    submit()
    expect(
      await screen.findByText('Já existe um usuário com este e-mail.'),
    ).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('VALIDATION toasts the generic field message and stays open', async () => {
    mutateAsyncMock.mockRejectedValue({ details: { error_code: 'VALIDATION' } })
    const onOpenChange = vi.fn()
    render(<NovoUsuarioDialog open onOpenChange={onOpenChange} />)
    fillValid()
    submit()
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Verifique os campos e tente novamente.'),
    )
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('FORBIDDEN toasts the permission message', async () => {
    mutateAsyncMock.mockRejectedValue({ details: { error_code: 'FORBIDDEN' } })
    render(<NovoUsuarioDialog open onOpenChange={vi.fn()} />)
    fillValid()
    submit()
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Você não tem permissão para esta ação.'),
    )
  })

  it('NOT_FOUND toasts the not-found message', async () => {
    mutateAsyncMock.mockRejectedValue({ details: { error_code: 'NOT_FOUND' } })
    render(<NovoUsuarioDialog open onOpenChange={vi.fn()} />)
    fillValid()
    submit()
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Usuário não encontrado.'))
  })

  it('SERVER_ERROR / unknown toasts the generic try-again message', async () => {
    mutateAsyncMock.mockRejectedValue({ details: { error_code: 'SERVER_ERROR' } })
    render(<NovoUsuarioDialog open onOpenChange={vi.fn()} />)
    fillValid()
    submit()
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Não foi possível concluir agora. Tente novamente em instantes.',
      ),
    )
  })
})

describe('NovoUsuarioDialog — client validation + pending', () => {
  it('client-side invalid input blocks the invoke (empty required fields)', async () => {
    render(<NovoUsuarioDialog open onOpenChange={vi.fn()} />)
    submit()
    expect(await screen.findByText('Email inválido')).toBeInTheDocument()
    expect(mutateAsyncMock).not.toHaveBeenCalled()
  })

  it('while pending the submit shows "Criando…" and is disabled', () => {
    useCriarUsuarioMock.mockReturnValue({ mutateAsync: mutateAsyncMock, isPending: true })
    render(<NovoUsuarioDialog open onOpenChange={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /Criando…/ })
    expect(btn).toBeDisabled()
  })
})
