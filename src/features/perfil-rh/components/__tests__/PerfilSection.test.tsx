/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 30 / Plan 30-05 — PerfilSection (PERFIL-01 name + PERFIL-03 avatar + SEG-03 read-only).
 *
 * Pins the UI-SPEC §Section 1 contract:
 *  - editing "Nome de exibição" + submitting dispatches `atualizarPerfil({ nome, avatarPath })`;
 *  - **SEG-03 no-affordance** — there is NO textbox/combobox/button to change role/cargo/email
 *    (the read-only context is a plain definition list, not editable controls);
 *  - an avatar upload auto-saves ALWAYS carrying the currently-loaded nome (WARNING #3), so
 *    persisting a photo can never blank `nome_completo`;
 *  - an invalid-mime avatar renders an inline field error and does NOT upload.
 *
 * @see src/features/perfil-rh/components/PerfilSection.tsx
 * @see .planning/phases/30-meu-perfil-rh/30-UI-SPEC.md (§Section 1 + §Interaction correctness)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// Avoid initializing the real supabase client at import (the service pulls it in).
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))

// The consumed mutations (name save + avatar upload).
const { atualizarMutateMock, uploadMutateAsyncMock } = vi.hoisted(() => ({
  atualizarMutateMock: vi.fn(),
  uploadMutateAsyncMock: vi.fn(),
}))
vi.mock('../../hooks/usePerfilRh', () => ({
  useAtualizarPerfil: () => ({ mutate: atualizarMutateMock, isPending: false }),
  useUploadAvatar: () => ({ mutateAsync: uploadMutateAsyncMock, isPending: false }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { PerfilSection } from '../PerfilSection'
import type { PerfilRhRow } from '../../services/perfilRhService'

const PERFIL: PerfilRhRow = {
  id: 'row-1',
  user_id: 'uid-1',
  nome_completo: 'Maria Recrutadora',
  email: 'maria@beautysmile.com.br',
  cargo: 'Analista de RH',
  role: 'recrutador',
  avatar_url: null,
}

function renderSection(perfil: PerfilRhRow = PERFIL) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(<PerfilSection perfil={perfil} />, { wrapper: Wrapper })
}

beforeEach(() => {
  vi.clearAllMocks()
  uploadMutateAsyncMock.mockResolvedValue('uid-1/avatar.png')
})

describe('PerfilSection — name edit + save (PERFIL-01)', () => {
  it('editing + submitting the name dispatches atualizarPerfil with the edited nome', async () => {
    renderSection()
    fireEvent.change(screen.getByLabelText('Nome de exibição'), {
      target: { value: 'Maria Editada' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(atualizarMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({ nome: 'Maria Editada' }),
      ),
    )
  })

  it('the read-only "geridos por um administrador" note is present', () => {
    renderSection()
    expect(
      screen.getByText('E-mail, papel e cargo são geridos por um administrador.'),
    ).toBeInTheDocument()
  })
})

describe('PerfilSection — SEG-03 no role/cargo/email affordance', () => {
  it('exposes NO editable control (textbox/combobox/button) for papel, cargo or e-mail', () => {
    renderSection()
    // The ONLY textbox is the editable display name — not papel/cargo/email.
    expect(screen.queryByRole('textbox', { name: /papel|cargo|e-?mail/i })).toBeNull()
    // No select/combobox anywhere (role is never editable here).
    expect(screen.queryByRole('combobox')).toBeNull()
    // No button that changes papel/cargo.
    expect(screen.queryByRole('button', { name: /papel|cargo/i })).toBeNull()
    // Sanity: the read-only values ARE shown as context.
    expect(screen.getByText('maria@beautysmile.com.br')).toBeInTheDocument()
    expect(screen.getByText('Analista de RH')).toBeInTheDocument()
  })
})

describe('PerfilSection — avatar (PERFIL-03, WARNING #3)', () => {
  it('an avatar upload persists via atualizarPerfil carrying the loaded nome (never blank)', async () => {
    renderSection()
    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Selecionar foto de perfil'), {
      target: { files: [file] },
    })
    await waitFor(() => expect(uploadMutateAsyncMock).toHaveBeenCalledWith(file))
    await waitFor(() =>
      expect(atualizarMutateMock).toHaveBeenCalledWith({
        nome: 'Maria Recrutadora',
        avatarPath: 'uid-1/avatar.png',
      }),
    )
  })

  it('an in-progress sub-min (2-char) name is NOT sent on avatar-save — the loaded valid nome is (WR-03)', async () => {
    renderSection()
    // The user has typed only "Ma" (2 chars, fails perfilNomeSchema min-3) but not submitted.
    fireEvent.change(screen.getByLabelText('Nome de exibição'), { target: { value: 'Ma' } })

    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Selecionar foto de perfil'), {
      target: { files: [file] },
    })

    await waitFor(() => expect(uploadMutateAsyncMock).toHaveBeenCalledWith(file))
    // The invalid in-progress "Ma" must NOT be sent — the loaded (valid) nome is used instead,
    // so the unconditional RPC SET (+ the live min-3 guard) never receives a sub-min name.
    await waitFor(() =>
      expect(atualizarMutateMock).toHaveBeenCalledWith({
        nome: 'Maria Recrutadora',
        avatarPath: 'uid-1/avatar.png',
      }),
    )
    expect(atualizarMutateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Ma' }),
    )
  })

  it('an invalid-mime avatar renders an inline error and does NOT upload', async () => {
    renderSection()
    const bad = new File(['x'], 'foto.gif', { type: 'image/gif' })
    fireEvent.change(screen.getByLabelText('Selecionar foto de perfil'), {
      target: { files: [bad] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(/formato inválido/i)
    expect(uploadMutateAsyncMock).not.toHaveBeenCalled()
  })
})
