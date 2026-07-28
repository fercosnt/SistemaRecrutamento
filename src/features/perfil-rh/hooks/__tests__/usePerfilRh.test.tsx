/**
 * Phase 30 / Plan 30-04 Task 2 — `usePerfilRh` hooks test (PERFIL-01/02/03).
 *
 * Pins the contracts the profile hooks must satisfy:
 *  - `usePerfilRh` calls `readMeuPerfil(uid)` (own-row query).
 *  - each of the three mutations invalidates the own-row query on success.
 *  - **BLOCKER (Success Criterion #1):** after a successful `atualizarPerfil`,
 *    `useAtualizarPerfil` calls `authStore.setAdminUser` with the updated
 *    `nome_completo` + `avatar_url` so the RH panel chrome refreshes WITHOUT a re-login.
 *
 * The service + the authStore + sonner are mocked so the hooks resolve without Supabase
 * and the store refresh is observable.
 *
 * @see src/features/admin/hooks/__tests__/useUsuariosRh.test.tsx (the renderHook + QueryClient idiom)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  readMeuPerfil: vi.fn(),
  atualizarPerfil: vi.fn(),
  alterarSenha: vi.fn(),
  uploadAvatar: vi.fn(),
  setAdminUser: vi.fn(),
  currentAdminUser: {
    id: 'row-1',
    user_id: 'uid-1',
    nome_completo: 'Nome Antigo',
    email: 'ana@bs.com',
    cargo: 'Recrutadora',
    role: 'recrutador',
    avatar_url: null,
  } as Record<string, unknown>,
}))

vi.mock('../../services/perfilRhService', () => ({
  readMeuPerfil: mocks.readMeuPerfil,
  atualizarPerfil: mocks.atualizarPerfil,
  alterarSenha: mocks.alterarSenha,
  uploadAvatar: mocks.uploadAvatar,
}))

vi.mock('@/store/authStore', () => ({
  useUser: () => ({ id: 'uid-1', email: 'ana@bs.com' }),
  useAuthStore: {
    getState: () => ({ adminUser: mocks.currentAdminUser, setAdminUser: mocks.setAdminUser }),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

import {
  usePerfilRh,
  useAtualizarPerfil,
  useAlterarSenha,
  useUploadAvatar,
  perfilRhKeys,
} from '../usePerfilRh'
import { toast } from 'sonner'

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
})

describe('usePerfilRh — own-row query', () => {
  it('calls readMeuPerfil with the caller uid', async () => {
    mocks.readMeuPerfil.mockResolvedValue({ ...mocks.currentAdminUser })
    const { result } = renderHook(() => usePerfilRh(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mocks.readMeuPerfil).toHaveBeenCalledWith('uid-1')
  })
})

describe('useAtualizarPerfil — refresh the authStore (BLOCKER)', () => {
  it('on success calls setAdminUser with the updated nome + avatar_url and invalidates the own-row query', async () => {
    mocks.atualizarPerfil.mockResolvedValue(undefined)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useAtualizarPerfil(), { wrapper })
    result.current.mutate({ nome: 'Nome Novo', avatarPath: 'uid-1/avatar.png' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // The store refresh — merged nome + avatar_url routed back through setAdminUser.
    expect(mocks.setAdminUser).toHaveBeenCalledWith(
      expect.objectContaining({
        nome_completo: 'Nome Novo',
        avatar_url: 'uid-1/avatar.png',
      }),
    )
    // Own-row query invalidated.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: perfilRhKeys.me('uid-1') })
    expect(toast.success).toHaveBeenCalledWith('Perfil atualizado.')
  })

  it('a name-only save carries the loaded avatar_url (avatarPath undefined → keeps adminUser.avatar_url)', async () => {
    mocks.atualizarPerfil.mockResolvedValue(undefined)
    const { result } = renderHook(() => useAtualizarPerfil(), { wrapper })
    result.current.mutate({ nome: 'Só Nome' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mocks.setAdminUser).toHaveBeenCalledWith(
      expect.objectContaining({ nome_completo: 'Só Nome', avatar_url: null }),
    )
  })
})

describe('useAlterarSenha — success toast, no field-error toast', () => {
  it('on success toasts the success copy', async () => {
    mocks.alterarSenha.mockResolvedValue(undefined)
    const { result } = renderHook(() => useAlterarSenha(), { wrapper })
    result.current.mutate({ email: 'ana@bs.com', senhaAtual: 'a', novaSenha: 'novaSenha8' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Senha alterada com sucesso.')
  })

  it('a WRONG_CURRENT rejection does NOT toast (the field owns it)', async () => {
    mocks.alterarSenha.mockRejectedValue({ code: 'WRONG_CURRENT' })
    const { result } = renderHook(() => useAlterarSenha(), { wrapper })
    result.current.mutate({ email: 'ana@bs.com', senhaAtual: 'errada', novaSenha: 'novaSenha8' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('useUploadAvatar — returns the path, invalidates on success', () => {
  it('returns the storage path and invalidates the own-row query', async () => {
    mocks.uploadAvatar.mockResolvedValue('uid-1/avatar.jpg')
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUploadAvatar(), { wrapper })
    const file = new File([new Uint8Array(10)], 'a', { type: 'image/jpeg' })
    result.current.mutate(file)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mocks.uploadAvatar).toHaveBeenCalledWith(file, 'uid-1')
    expect(result.current.data).toBe('uid-1/avatar.jpg')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: perfilRhKeys.me('uid-1') })
  })

  it('invalidates the avatar-signed cache so a same-extension re-upload refreshes the preview (WR-02)', async () => {
    mocks.uploadAvatar.mockResolvedValue('uid-1/avatar.jpg')
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUploadAvatar(), { wrapper })
    result.current.mutate(new File([new Uint8Array(10)], 'a', { type: 'image/jpeg' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Identical path on same-ext re-upload → the signed-URL cache MUST be invalidated too,
    // else the 55min-stale cache keeps serving the OLD image.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['avatar-signed'] })
  })
})
