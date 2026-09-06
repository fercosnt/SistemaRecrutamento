/// <reference types="@testing-library/jest-dom" />
/**
 * O gate de papel do login RH tem de esperar o papel DESTE usuário.
 *
 * Medido em PROD (06/09/2026): com uma sessão de CANDIDATO ainda no armazenamento (o
 * mesmo navegador que acabara de testar o fluxo público), um administrador legítimo foi
 * recusado com «Esta conta não tem acesso ao painel RH» e um 406 no console. A condição
 * de parada do laço era `!useAuthStore.getState().role` — e `role` já estava preenchido
 * com 'candidato', do usuário anterior. O laço saía na primeira volta e o gate julgava
 * pelo papel velho.
 *
 * O teste simula exatamente isso: a store começa com o candidato e só passa a refletir o
 * administrador algumas voltas depois, como acontece com a hidratação real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  getSession: vi.fn(),
  estado: { role: null as string | null, user: null as { id: string } | null },
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: mocks.signOut,
      resend: vi.fn(),
      getUser: vi.fn(),
      getSession: mocks.getSession,
    },
  },
}))

vi.mock('@/features/auth/services', () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
  resendConfirmation: vi.fn(),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(() => ({}), { getState: () => mocks.estado }),
}))

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigate }
})

import { LoginRHPage } from '../LoginRHPage'

const ADMIN_ID = 'admin-uuid'
const CANDIDATO_ID = 'candidato-uuid'

beforeEach(() => {
  vi.clearAllMocks()
  // A sessão recém-criada é do administrador…
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: ADMIN_ID } } } })
  // …mas a store ainda carrega o candidato anterior (o defeito de 06/09).
  mocks.estado = { role: 'candidato', user: { id: CANDIDATO_ID } }
})

async function submeter() {
  render(
    <MemoryRouter>
      <LoginRHPage />
    </MemoryRouter>,
  )
  await userEvent.type(screen.getByLabelText(/^Email/i), 'rh@beautysmile.com.br')
  await userEvent.type(screen.getByLabelText(/^Senha/i), 'SenhaValida1')
  await userEvent.click(screen.getByRole('button', { name: /Entrar/i }))
}

describe('LoginRHPage — gate de papel com sessão anterior no armazenamento', () => {
  it('espera a hidratação do usuário novo em vez de julgar pelo papel do anterior', async () => {
    // A hidratação chega depois de algumas voltas do laço, como em produção.
    setTimeout(() => {
      mocks.estado = { role: 'administrador', user: { id: ADMIN_ID } }
    }, 200)

    await submeter()

    await waitFor(
      () => expect(mocks.navigate).toHaveBeenCalledWith('/rh/dashboard', { replace: true }),
      { timeout: 4000 },
    )
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.toastError).not.toHaveBeenCalled()
  }, 10000)

  it('candidato de verdade continua recusado (o gate não virou passe-livre)', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: CANDIDATO_ID } } } })
    mocks.estado = { role: 'candidato', user: { id: CANDIDATO_ID } }

    await submeter()

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalled(), { timeout: 4000 })
    expect(mocks.toastError).toHaveBeenCalledWith(
      'Esta conta não tem acesso ao painel RH.',
      expect.anything(),
    )
    expect(mocks.navigate).not.toHaveBeenCalledWith('/rh/dashboard', { replace: true })
  }, 10000)
})
