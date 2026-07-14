/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 30 / Plan 30-05 — SenhaSection (PERFIL-02 password change with re-auth).
 *
 * Pins the UI-SPEC §Section 2 contract:
 *  - a valid change dispatches `alterarSenha({ email, senhaAtual, novaSenha })` (the email
 *    comes from the loaded profile, never a form field);
 *  - WRONG_CURRENT sets a FIELD error on "Senha atual" and keeps the form open (session valid);
 *  - NO signOut is ever called (the live session is preserved — honest GoTrue copy);
 *  - Zod blocks nova<8 / confirmar mismatch / nova===atual before the invoke.
 *
 * @see src/features/perfil-rh/components/SenhaSection.tsx
 * @see .planning/phases/30-meu-perfil-rh/30-UI-SPEC.md (§Section 2)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Documents "session preserved": SenhaSection must never sign the user out.
const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { signOut: signOutMock } },
}))

const { mutateAsyncMock } = vi.hoisted(() => ({ mutateAsyncMock: vi.fn() }))
vi.mock('../../hooks/usePerfilRh', () => ({
  useAlterarSenha: () => ({ mutateAsync: mutateAsyncMock, isPending: false }),
}))

import { SenhaSection } from '../SenhaSection'

const EMAIL = 'maria@beautysmile.com.br'

function fill(atual: string, nova: string, confirmar: string) {
  fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: atual } })
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: nova } })
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
    target: { value: confirmar },
  })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mutateAsyncMock.mockResolvedValue(undefined)
})

describe('SenhaSection — re-auth dispatch (PERFIL-02)', () => {
  it('a valid change dispatches alterarSenha with the loaded email + both passwords', async () => {
    render(<SenhaSection email={EMAIL} />)
    fill('SenhaAtual1', 'SenhaNova1', 'SenhaNova1')
    submit()
    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        email: EMAIL,
        senhaAtual: 'SenhaAtual1',
        novaSenha: 'SenhaNova1',
      }),
    )
  })

  it('never signs the user out (session preserved)', async () => {
    render(<SenhaSection email={EMAIL} />)
    fill('SenhaAtual1', 'SenhaNova1', 'SenhaNova1')
    submit()
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalled())
    expect(signOutMock).not.toHaveBeenCalled()
  })
})

describe('SenhaSection — WRONG_CURRENT → field error, form stays open', () => {
  it('sets the "Senha atual" field error and keeps the form open', async () => {
    mutateAsyncMock.mockRejectedValue({ code: 'WRONG_CURRENT' })
    render(<SenhaSection email={EMAIL} />)
    fill('errada', 'SenhaNova1', 'SenhaNova1')
    submit()
    expect(await screen.findByText('Senha atual incorreta.')).toBeInTheDocument()
    // The form stays open (heading + fields still present).
    expect(screen.getByRole('heading', { name: 'Senha' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
    expect(signOutMock).not.toHaveBeenCalled()
  })
})

describe('SenhaSection — Zod guards block the invoke', () => {
  it('blocks nova < 8 chars', async () => {
    render(<SenhaSection email={EMAIL} />)
    fill('SenhaAtual1', '123', '123')
    submit()
    expect(await screen.findByText('Mínimo 8 caracteres')).toBeInTheDocument()
    expect(mutateAsyncMock).not.toHaveBeenCalled()
  })

  it('blocks a confirmation mismatch', async () => {
    render(<SenhaSection email={EMAIL} />)
    fill('SenhaAtual1', 'SenhaNova1', 'Diferente9')
    submit()
    expect(await screen.findByText('As senhas não conferem')).toBeInTheDocument()
    expect(mutateAsyncMock).not.toHaveBeenCalled()
  })

  it('blocks nova === atual', async () => {
    render(<SenhaSection email={EMAIL} />)
    fill('MesmaSenha1', 'MesmaSenha1', 'MesmaSenha1')
    submit()
    expect(
      await screen.findByText('A nova senha deve ser diferente da atual'),
    ).toBeInTheDocument()
    expect(mutateAsyncMock).not.toHaveBeenCalled()
  })
})
