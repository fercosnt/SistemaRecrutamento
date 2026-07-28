/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 29 / Review WR-01 — `useUsuariosRh` row-mutation error toasts.
 *
 * Pins the `toastRowError` mapping the row mutations share on `onError` (the code-review
 * WR-01 fix): the EF returns a `resetar_senha` email-send failure as HTTP 502 → the
 * mutation REJECTS with `error_code:'EMAIL_SEND_FAILED'`, so the aviso must surface on the
 * ERROR trail via `toast.warning` (the old `onSuccess` warning branch was dead code and was
 * removed). LAST_ADMIN / UNAUTHORIZED keep their DISTINCT copy; everything else is generic.
 *
 * The service layer is mocked so the mutation rejects/resolves without touching Supabase;
 * `sonner` is mocked so the exact pt-BR copy is observable.
 *
 * @see src/features/admin/hooks/useUsuariosRh.ts (toastRowError + useResetarSenha)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  listUsuariosRh: vi.fn(),
  criarUsuario: vi.fn(),
  mudarPapel: vi.fn(),
  ativarDesativar: vi.fn(),
  resetarSenha: vi.fn(),
}))

vi.mock('../../services/usuariosRhService', () => ({
  listUsuariosRh: mocks.listUsuariosRh,
  criarUsuario: mocks.criarUsuario,
  mudarPapel: mocks.mudarPapel,
  ativarDesativar: mocks.ativarDesativar,
  resetarSenha: mocks.resetarSenha,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

import { useResetarSenha, useAtivarDesativar } from '../useUsuariosRh'
import { toast } from 'sonner'

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

/** A rejection shaped like the service error the EF error_code rides on. */
const rejectWithCode = (code: string) => Promise.reject({ details: { error_code: code } })

const TARGET = 'target-uuid'

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
})

describe('useResetarSenha — EMAIL_SEND_FAILED surfaces the reset warning, NOT the generic error (WR-01)', () => {
  it('a 502 EMAIL_SEND_FAILED rejection warns instead of erroring', async () => {
    mocks.resetarSenha.mockImplementation(() => rejectWithCode('EMAIL_SEND_FAILED'))
    const { result } = renderHook(() => useResetarSenha(), { wrapper })

    result.current.mutate(TARGET)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.warning).toHaveBeenCalledWith(
      'Não foi possível enviar o e-mail de redefinição agora. Tente novamente em instantes.',
    )
    // NOT the generic error bucket.
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('a clean success toasts the success copy (no warning)', async () => {
    mocks.resetarSenha.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useResetarSenha(), { wrapper })

    result.current.mutate(TARGET)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('E-mail de redefinição de senha enviado.')
    expect(toast.warning).not.toHaveBeenCalled()
  })
})

describe('toastRowError — LAST_ADMIN / UNAUTHORIZED / generic stay distinct (WR-01 regression)', () => {
  it('LAST_ADMIN → the last-admin error copy', async () => {
    mocks.ativarDesativar.mockImplementation(() => rejectWithCode('LAST_ADMIN'))
    const { result } = renderHook(() => useAtivarDesativar(), { wrapper })
    result.current.mutate({ targetId: TARGET, ativar: false })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith(
      'Não é possível remover o último administrador ativo do sistema.',
    )
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it('UNAUTHORIZED → the expired-session copy', async () => {
    mocks.ativarDesativar.mockImplementation(() => rejectWithCode('UNAUTHORIZED'))
    const { result } = renderHook(() => useAtivarDesativar(), { wrapper })
    result.current.mutate({ targetId: TARGET, ativar: false })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Sua sessão expirou. Entre novamente.')
  })

  it('an unknown code → the generic try-again error', async () => {
    mocks.ativarDesativar.mockImplementation(() => rejectWithCode('SERVER_ERROR'))
    const { result } = renderHook(() => useAtivarDesativar(), { wrapper })
    result.current.mutate({ targetId: TARGET, ativar: false })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Não foi possível concluir a ação. Tente novamente.')
    expect(toast.warning).not.toHaveBeenCalled()
  })
})
