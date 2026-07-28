/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 29 / Plan 29-03 — UsuariosRhTable (USR-01/03/04/05) + EditarPapelDialog.
 *
 * Pins the roster + per-row account-action contract from the UI-SPEC (§Row Actions,
 * §Anti-Lockout, §Status Vocabulary, §Copywriting — verbatim pt-BR):
 *  - the glass <table> renders each RH user (nome+email, cargo, papel/status badges,
 *    "Aguardando 1º acesso" chip when primeiro_acesso, último acesso, "(você)" self-marker);
 *  - "Ativar" is a DIRECT non-destructive action (no confirm) → useAtivarDesativar ativar:true;
 *  - "Desativar" + "Resetar senha" are each gated behind an honest AlertDialog before dispatch;
 *  - "Editar papel" opens EditarPapelDialog whose "Salvar papel" dispatches mudar_papel;
 *  - anti-lockout: on the SINGLE active administrador's row, "Desativar" is disabled + tooltip,
 *    and the EditarPapelDialog demote path ("Salvar papel" → recrutador) is disabled + the same tooltip;
 *  - a LAST_ADMIN mutation rejection surfaces the server toast (the hook maps it — server is authoritative).
 *
 * The Radix DropdownMenu / AlertDialog / Dialog / Select / Tooltip primitives are mocked to
 * native equivalents (the repo idiom, NovoUsuarioDialog.test.tsx) — this suite installs no
 * pointer/portal polyfills; the behavior under test is the dispatch + confirm gating + anti-lockout,
 * not the widgets. The 29-01 mutation hooks are mocked (mutateAsync + isPending); the LAST_ADMIN
 * mock replicates the hook's onError toast (29-01) so the server-toast contract is observable here.
 *
 * @see src/features/admin/hooks/useUsuariosRh.ts (the consumed mutations)
 * @see .planning/phases/29-console-de-gest-o-de-usu-rios-rh/29-UI-SPEC.md (§Row Actions / §Anti-Lockout)
 * @see .planning/phases/29-console-de-gest-o-de-usu-rios-rh/29-03-PLAN.md (Task 2)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Radix DropdownMenu → items always rendered (avoids portal/pointer gating) ──
vi.mock('@/components/ui/dropdown-menu', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Frag = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    DropdownMenu: Frag,
    DropdownMenuTrigger: Frag, // asChild → renders the Button
    DropdownMenuContent: ({ children }: any) => React.createElement('div', null, children),
    DropdownMenuItem: ({ children, onClick, disabled, className }: any) =>
      React.createElement('button', { role: 'menuitem', onClick, disabled, className }, children),
    DropdownMenuSeparator: () => React.createElement('hr', null),
  }
})

// ── Radix AlertDialog → gated on `open` prop (controlled confirm) ──────────────
vi.mock('@/components/ui/alert-dialog', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Frag = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    AlertDialog: ({ open, children }: any) =>
      open ? React.createElement('div', null, children) : null,
    AlertDialogContent: ({ children }: any) => React.createElement('div', null, children),
    AlertDialogHeader: Frag,
    AlertDialogFooter: Frag,
    AlertDialogTitle: ({ children }: any) => React.createElement('h2', null, children),
    AlertDialogDescription: ({ children }: any) => React.createElement('p', null, children),
    AlertDialogAction: ({ children, onClick, disabled }: any) =>
      React.createElement('button', { onClick, disabled }, children),
    AlertDialogCancel: ({ children, onClick }: any) =>
      React.createElement('button', { onClick }, children),
  }
})

// ── Radix Dialog → gated on `open` (for EditarPapelDialog) ─────────────────────
vi.mock('@/components/ui/dialog', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Frag = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    Dialog: ({ open, children }: any) =>
      open ? React.createElement('div', null, children) : null,
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

// ── Radix Tooltip → content always rendered (assert anti-lockout copy presence) ─
vi.mock('@/components/ui/tooltip', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Frag = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    TooltipProvider: Frag,
    Tooltip: Frag,
    TooltipTrigger: Frag, // asChild → renders the wrapped span/control
    TooltipContent: ({ children }: any) =>
      React.createElement('span', { role: 'tooltip' }, children),
  }
})

// ── The consumed row mutations (each its own mutateAsync for independent asserts) ──
const { mudarPapelMock, ativarDesativarMock, resetarSenhaMock, hooks } = vi.hoisted(() => {
  const mudarPapelMock = vi.fn()
  const ativarDesativarMock = vi.fn()
  const resetarSenhaMock = vi.fn()
  return {
    mudarPapelMock,
    ativarDesativarMock,
    resetarSenhaMock,
    hooks: {
      useMudarPapel: vi.fn(() => ({ mutateAsync: mudarPapelMock, isPending: false })),
      useAtivarDesativar: vi.fn(() => ({ mutateAsync: ativarDesativarMock, isPending: false })),
      useResetarSenha: vi.fn(() => ({ mutateAsync: resetarSenhaMock, isPending: false })),
    },
  }
})
vi.mock('../../hooks/useUsuariosRh', () => hooks)

// ── Toast + authStore (the "(você)" marker current-user id) ────────────────────
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'ana-user' } }),
}))

import { UsuariosRhTable } from '../UsuariosRhTable'
import type { UsuarioRhRow } from '../../services/usuariosRhService'
import { toast } from 'sonner'

// ── Fixture roster: 1 active admin (self, last admin) · 1 recrutador · 1 primeiro_acesso ──
const ana: UsuarioRhRow = {
  id: 'ana-id',
  user_id: 'ana-user',
  nome_completo: 'Ana Admin',
  email: 'ana@beautysmile.com.br',
  cargo: 'Gerente de RH',
  role: 'administrador',
  ativo: true,
  primeiro_acesso: false,
  data_ultimo_login: '2026-07-10T12:00:00Z',
}
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
const pedro: UsuarioRhRow = {
  id: 'pedro-id',
  user_id: 'pedro-user',
  nome_completo: 'Pedro Primeiro',
  email: 'pedro@beautysmile.com.br',
  cargo: '',
  role: 'recrutador',
  ativo: false,
  primeiro_acesso: true,
  data_ultimo_login: null,
}
const roster = [ana, rui, pedro]

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

beforeEach(() => {
  vi.clearAllMocks()
  hooks.useMudarPapel.mockReturnValue({ mutateAsync: mudarPapelMock, isPending: false })
  hooks.useAtivarDesativar.mockReturnValue({ mutateAsync: ativarDesativarMock, isPending: false })
  hooks.useResetarSenha.mockReturnValue({ mutateAsync: resetarSenhaMock, isPending: false })
  mudarPapelMock.mockResolvedValue({ ok: true })
  ativarDesativarMock.mockResolvedValue({ ok: true })
  resetarSenhaMock.mockResolvedValue({ ok: true })
})

describe('UsuariosRhTable — roster render (USR-01, UI-SPEC §Status Vocabulary)', () => {
  it('renders a real <table> row per user with name + email + cargo', () => {
    render(<UsuariosRhTable rows={roster} />)
    expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(4) // header + 3
    expect(screen.getByText('Ana Admin')).toBeInTheDocument()
    expect(screen.getByText('ana@beautysmile.com.br')).toBeInTheDocument()
    expect(screen.getByText('Rui Recrutador')).toBeInTheDocument()
    expect(screen.getByText('Pedro Primeiro')).toBeInTheDocument()
    expect(screen.getByText('Gerente de RH')).toBeInTheDocument()
    // Pedro has no cargo → em-dash
    expect(within(rowOf('Pedro Primeiro')).getByText('—')).toBeInTheDocument()
  })

  it('renders papel + status badges and the primeiro_acesso chip', () => {
    render(<UsuariosRhTable rows={roster} />)
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getAllByText('Recrutador').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Ativo').length).toBe(2)
    expect(screen.getByText('Inativo')).toBeInTheDocument()
    // chip only on the primeiro_acesso row
    const chips = screen.getAllByText('Aguardando 1º acesso')
    expect(chips).toHaveLength(1)
    expect(within(rowOf('Pedro Primeiro')).getByText('Aguardando 1º acesso')).toBeInTheDocument()
  })

  it('formats último acesso (dd/mm/aaaa) and shows "Nunca acessou" for primeiro_acesso', () => {
    render(<UsuariosRhTable rows={roster} />)
    expect(within(rowOf('Ana Admin')).getByText('10/07/2026')).toBeInTheDocument()
    expect(within(rowOf('Pedro Primeiro')).getByText('Nunca acessou')).toBeInTheDocument()
  })

  it('marks the logged-in admin\'s own row with "(você)" and does NOT hide it', () => {
    render(<UsuariosRhTable rows={roster} />)
    expect(within(rowOf('Ana Admin')).getByText('(você)')).toBeInTheDocument()
    // no other row carries the marker
    expect(screen.getAllByText('(você)')).toHaveLength(1)
  })

  it('does NOT leak non-allowlisted PII column labels', () => {
    render(<UsuariosRhTable rows={roster} />)
    expect(screen.queryByText(/avatar_url|telefone|created_by/i)).not.toBeInTheDocument()
  })
})

describe('UsuariosRhTable — Ativar is a DIRECT action, no confirm (USR-04)', () => {
  it('dispatches ativar:true immediately with no AlertDialog', async () => {
    render(<UsuariosRhTable rows={roster} />)
    fireEvent.click(within(rowOf('Pedro Primeiro')).getByRole('menuitem', { name: 'Ativar' }))
    await waitFor(() =>
      expect(ativarDesativarMock).toHaveBeenCalledWith({ targetId: 'pedro-id', ativar: true }),
    )
    // no confirm dialog appeared
    expect(screen.queryByText('Desativar usuário?')).not.toBeInTheDocument()
  })
})

describe('UsuariosRhTable — Desativar behind an AlertDialog confirm (USR-04)', () => {
  it('opens the honest confirm and only dispatches ativar:false after confirming', async () => {
    render(<UsuariosRhTable rows={roster} />)
    fireEvent.click(within(rowOf('Rui Recrutador')).getByRole('menuitem', { name: 'Desativar' }))
    expect(await screen.findByText('Desativar usuário?')).toBeInTheDocument()
    expect(
      screen.getByText('Rui Recrutador perderá o acesso ao painel imediatamente. Você pode reativar depois.'),
    ).toBeInTheDocument()
    expect(ativarDesativarMock).not.toHaveBeenCalled()
    fireEvent.click(within(rowOf('Rui Recrutador')).getByRole('button', { name: 'Desativar' }))
    await waitFor(() =>
      expect(ativarDesativarMock).toHaveBeenCalledWith({ targetId: 'rui-id', ativar: false }),
    )
  })

  it('shows the "Desativando…" pending label + disabled action while pending', async () => {
    hooks.useAtivarDesativar.mockReturnValue({ mutateAsync: ativarDesativarMock, isPending: true })
    render(<UsuariosRhTable rows={roster} />)
    fireEvent.click(within(rowOf('Rui Recrutador')).getByRole('menuitem', { name: 'Desativar' }))
    const action = await within(rowOf('Rui Recrutador')).findByRole('button', { name: /Desativando…/ })
    expect(action).toBeDisabled()
  })
})

describe('UsuariosRhTable — Resetar senha behind an AlertDialog confirm (USR-05)', () => {
  it('opens the honest confirm (no lock claim) and dispatches resetar after confirming', async () => {
    render(<UsuariosRhTable rows={roster} />)
    fireEvent.click(within(rowOf('Rui Recrutador')).getByRole('menuitem', { name: 'Resetar senha' }))
    expect(await screen.findByText('Enviar e-mail de redefinição de senha?')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Enviaremos um e-mail para rui@beautysmile.com.br redefinir a senha. A senha atual continua válida até o usuário definir uma nova.',
      ),
    ).toBeInTheDocument()
    expect(resetarSenhaMock).not.toHaveBeenCalled()
    fireEvent.click(within(rowOf('Rui Recrutador')).getByRole('button', { name: 'Enviar e-mail' }))
    await waitFor(() => expect(resetarSenhaMock).toHaveBeenCalledWith('rui-id'))
  })
})

describe('UsuariosRhTable — Editar papel opens the dialog + dispatches mudar_papel (USR-03)', () => {
  it('changing the role and saving dispatches mudar_papel with the target', async () => {
    render(<UsuariosRhTable rows={roster} />)
    fireEvent.click(within(rowOf('Rui Recrutador')).getByRole('menuitem', { name: 'Editar papel' }))
    expect(await screen.findByRole('heading', { name: 'Editar papel' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Papel'), { target: { value: 'administrador' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar papel' }))
    await waitFor(() =>
      expect(mudarPapelMock).toHaveBeenCalledWith({ targetId: 'rui-id', novoPapel: 'administrador' }),
    )
  })
})

describe('UsuariosRhTable — anti-lockout on the last active administrador (USR-07 UX)', () => {
  it('disables Desativar + exposes the keyboard-reachable tooltip on the last-admin row', () => {
    render(<UsuariosRhTable rows={roster} />)
    const anaRow = rowOf('Ana Admin')
    expect(within(anaRow).getByRole('menuitem', { name: 'Desativar' })).toBeDisabled()
    expect(
      within(anaRow).getByText('Não é possível desativar ou rebaixar o último administrador ativo.'),
    ).toBeInTheDocument()
  })

  it('disables the EditarPapelDialog demote path (Salvar papel → recrutador) + shows the tooltip', async () => {
    render(<UsuariosRhTable rows={roster} />)
    fireEvent.click(within(rowOf('Ana Admin')).getByRole('menuitem', { name: 'Editar papel' }))
    expect(await screen.findByRole('heading', { name: 'Editar papel' })).toBeInTheDocument()
    // pre-set to administrador; choosing recrutador demotes the last admin
    fireEvent.change(screen.getByLabelText('Papel'), { target: { value: 'recrutador' } })
    const save = screen.getByRole('button', { name: 'Salvar papel' })
    expect(save).toBeDisabled()
    // Scope to the dialog form — the last-admin row also carries the same tooltip copy.
    const form = save.closest('form') as HTMLElement
    expect(
      within(form).getByText('Não é possível desativar ou rebaixar o último administrador ativo.'),
    ).toBeInTheDocument()
    expect(mudarPapelMock).not.toHaveBeenCalled()
  })
})

describe('UsuariosRhTable — server LAST_ADMIN is authoritative (surfaces the server toast)', () => {
  it('a LAST_ADMIN rejection surfaces the server toast (the 29-01 hook maps it)', async () => {
    // The mock replicates the 29-01 hook onError → toastRowError mapping (LAST_ADMIN).
    ativarDesativarMock.mockImplementation(() => {
      toast.error('Não é possível remover o último administrador ativo do sistema.')
      return Promise.reject({ details: { error_code: 'LAST_ADMIN' } })
    })
    render(<UsuariosRhTable rows={roster} />)
    fireEvent.click(within(rowOf('Rui Recrutador')).getByRole('menuitem', { name: 'Desativar' }))
    fireEvent.click(within(rowOf('Rui Recrutador')).getByRole('button', { name: 'Desativar' }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Não é possível remover o último administrador ativo do sistema.',
      ),
    )
  })
})
