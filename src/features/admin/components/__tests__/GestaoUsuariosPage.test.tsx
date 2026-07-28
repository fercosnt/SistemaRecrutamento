/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 29 / Plan 29-04 — GestaoUsuariosPage integration test (USR-01/USR-02).
 *
 * Pins the console COMPOSITION contract (UI-SPEC §Layout, §States, §Copywriting — verbatim pt-BR):
 *  - success: the roster query renders the real <table> (nome/email visible) under the
 *    "Gestão de usuários" header + subtitle;
 *  - loading: <AsyncState> renders a skeleton surface (data-slot="skeleton"), NOT the table
 *    and NOT a blank node (the header is always present — never a blank screen, T-29-12);
 *  - error: the AsyncState error heading "Não foi possível carregar os usuários." + a
 *    "Tentar novamente" control that calls refetch;
 *  - empty (data=[]): the defensive block "Nenhum usuário encontrado." (never blank);
 *  - CTA: clicking "Novo usuário" opens NovoUsuarioDialog (dialog title "Novo usuário" appears);
 *  - guard preserved (defense-in-depth over the Phase-28 EF authz, T-29-13): a source assertion
 *    that routes.tsx still wraps <ConfiguracoesPage/> in RoleGuard role="administrador".
 *
 * The Radix DropdownMenu / AlertDialog / Dialog / Select / Tooltip primitives are mocked to
 * native equivalents (the 29-03 harness idiom) — the behavior under test is the query→AsyncState
 * →table composition + the CTA→dialog open, not the widgets. The 29-01 hooks module is mocked:
 * `useUsuariosRh` is toggled per case (data/isLoading/isError); the mutation hooks are inert stubs.
 *
 * @see src/features/admin/components/GestaoUsuariosPage.tsx (the composed page host)
 * @see src/features/admin/components/__tests__/UsuariosRhTable.test.tsx (29-03 harness idiom)
 * @see .planning/phases/29-console-de-gest-o-de-usu-rios-rh/29-04-PLAN.md (Task 3)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Radix DropdownMenu → items always rendered (no portal/pointer gating) ──────
vi.mock('@/components/ui/dropdown-menu', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Frag = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    DropdownMenu: Frag,
    DropdownMenuTrigger: Frag,
    DropdownMenuContent: ({ children }: any) => React.createElement('div', null, children),
    DropdownMenuItem: ({ children, onClick, disabled, className }: any) =>
      React.createElement('button', { role: 'menuitem', onClick, disabled, className }, children),
    DropdownMenuSeparator: () => React.createElement('hr', null),
  }
})

// ── Radix AlertDialog → gated on `open` ────────────────────────────────────────
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

// ── Radix Dialog → gated on `open` (NovoUsuarioDialog + EditarPapelDialog) ──────
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

// ── Radix Select → native <select> ─────────────────────────────────────────────
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

// ── The 29-01 hooks module: toggleable query + inert mutation stubs ─────────────
const {
  useUsuariosRhMock,
  refetchMock,
  useCriarUsuario,
  useMudarPapel,
  useAtivarDesativar,
  useResetarSenha,
} = vi.hoisted(() => {
  const refetchMock = vi.fn()
  const stub = () => ({ mutateAsync: vi.fn(), isPending: false })
  return {
    useUsuariosRhMock: vi.fn(),
    refetchMock,
    useCriarUsuario: vi.fn(stub),
    useMudarPapel: vi.fn(stub),
    useAtivarDesativar: vi.fn(stub),
    useResetarSenha: vi.fn(stub),
  }
})
vi.mock('../../hooks/useUsuariosRh', () => ({
  useUsuariosRh: useUsuariosRhMock,
  useCriarUsuario,
  useMudarPapel,
  useAtivarDesativar,
  useResetarSenha,
}))

// ── Toast + authStore (the "(você)" marker current-user id) ────────────────────
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'ana-user' } }),
}))

import { GestaoUsuariosPage } from '../GestaoUsuariosPage'
import type { UsuarioRhRow } from '../../services/usuariosRhService'

// ── Fixture roster (1 admin/self · 1 recrutador · 1 primeiro_acesso) ───────────
const roster: UsuarioRhRow[] = [
  {
    id: 'ana-id',
    user_id: 'ana-user',
    nome_completo: 'Ana Admin',
    email: 'ana@beautysmile.com.br',
    cargo: 'Gerente de RH',
    role: 'administrador',
    ativo: true,
    primeiro_acesso: false,
    data_ultimo_login: '2026-07-10T12:00:00Z',
  },
  {
    id: 'rui-id',
    user_id: 'rui-user',
    nome_completo: 'Rui Recrutador',
    email: 'rui@beautysmile.com.br',
    cargo: 'Recrutador',
    role: 'recrutador',
    ativo: true,
    primeiro_acesso: false,
    data_ultimo_login: '2026-07-09T12:00:00Z',
  },
]

type QueryState = { data?: UsuarioRhRow[]; isLoading?: boolean; isError?: boolean }

function mockQuery(state: QueryState) {
  useUsuariosRhMock.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
    refetch: refetchMock,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockQuery({ data: roster }) // default: success roster
})

describe('GestaoUsuariosPage — success roster under the console header (USR-01)', () => {
  it('renders the header + subtitle and the real table rows (nome/email)', () => {
    render(<GestaoUsuariosPage />)
    expect(screen.getByRole('heading', { name: 'Gestão de usuários' })).toBeInTheDocument()
    expect(
      screen.getByText('Gerencie as contas da equipe de RH — papéis, acesso e redefinição de senha.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ana Admin')).toBeInTheDocument()
    expect(screen.getByText('ana@beautysmile.com.br')).toBeInTheDocument()
    expect(screen.getByText('Rui Recrutador')).toBeInTheDocument()
  })
})

describe('GestaoUsuariosPage — AsyncState never leaves a blank surface (T-29-12)', () => {
  it('loading → a skeleton surface renders, NOT the table and NOT a blank node', () => {
    mockQuery({ isLoading: true })
    const { container } = render(<GestaoUsuariosPage />)
    // never blank: the header is always present
    expect(screen.getByRole('heading', { name: 'Gestão de usuários' })).toBeInTheDocument()
    // skeleton surface (AsyncState loading), not the table
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    expect(screen.queryByText('Ana Admin')).not.toBeInTheDocument()
  })

  it('error → the error heading + a "Tentar novamente" control that calls refetch', () => {
    mockQuery({ isError: true })
    render(<GestaoUsuariosPage />)
    expect(screen.getByText('Não foi possível carregar os usuários.')).toBeInTheDocument()
    expect(screen.queryByText('Ana Admin')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    expect(refetchMock).toHaveBeenCalledTimes(1)
  })

  it('empty (data=[]) → the defensive empty block, never a blank surface', () => {
    mockQuery({ data: [] })
    render(<GestaoUsuariosPage />)
    expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument()
    expect(screen.getByText("Crie o primeiro usuário com o botão 'Novo usuário'.")).toBeInTheDocument()
    expect(screen.queryByText('Ana Admin')).not.toBeInTheDocument()
  })
})

describe('GestaoUsuariosPage — the "Novo usuário" CTA opens the create dialog (USR-02)', () => {
  it('is closed initially and opens NovoUsuarioDialog on click', async () => {
    render(<GestaoUsuariosPage />)
    // the CTA button exists; the dialog title is NOT yet rendered
    expect(screen.getByRole('button', { name: 'Novo usuário' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Novo usuário' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Novo usuário' }))
    expect(await screen.findByRole('heading', { name: 'Novo usuário' })).toBeInTheDocument()
    // the honest create-helper copy confirms the real dialog mounted
    expect(
      screen.getByText('O usuário receberá um e-mail para definir a própria senha e acessar o painel.'),
    ).toBeInTheDocument()
  })
})

describe('GestaoUsuariosPage — RoleGuard preserved (defense-in-depth, T-29-13)', () => {
  it('routes.tsx still wraps <ConfiguracoesPage/> in RoleGuard role="administrador"', () => {
    const routesSrc = readFileSync(resolve(process.cwd(), 'src/router/routes.tsx'), 'utf-8')
    expect(routesSrc).toContain('RoleGuard role="administrador"')
    expect(routesSrc).toMatch(/<RoleGuard role="administrador">\s*<ConfiguracoesPage\s*\/>/)
  })
})
