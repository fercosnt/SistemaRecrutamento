/**
 * Phase 31 / Plan 31-02 Task 2 — RED-first test for `useRejeitarCandidatura`.
 *
 * The reject mutation must, on success, invalidate ALL THREE key trees named in
 * CONTEXT so the RH list/panel refresh after a reject (staleTime + no
 * refetchOnWindowFocus otherwise shows the old status):
 *   - `candidaturasKeys.all` (src/features/vagas/hooks/useCandidaturas.ts)
 *   - `vagasKeys.all`        (src/features/vagas/hooks/useVagas.ts)
 *   - `triagemKeys.all`      (src/features/triagem/hooks/useTriagemPanel.ts)
 * and toast the exact 31-UI-SPEC success copy; on error it toasts the error copy.
 *
 * Mirrors the QueryClientProvider + renderHook + invalidateQueries-spy pattern of
 * `useRedacaoRevisao.test.ts`.
 *
 * @see src/features/decisao/hooks/useRegistrarDecisao.ts (the mutation+toast+invalidation analog)
 * @see .planning/phases/31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil/31-02-PLAN.md (Task 2)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

// Mock the service + sonner so the mutation resolves without touching Supabase/UI.
const mocks = vi.hoisted(() => ({
  rejeitarCandidatura: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('../../services/triagemService', () => ({
  rejeitarCandidatura: mocks.rejeitarCandidatura,
}))

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

import { useRejeitarCandidatura } from '../useRejeitarCandidatura'
import { candidaturasKeys } from '@/features/vagas/hooks/useCandidaturas'
import { vagasKeys } from '@/features/vagas/hooks/useVagas'
import { triagemKeys } from '../useTriagemPanel'

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('useRejeitarCandidatura — 3-tree invalidation + toast (OPER-01/02/03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  it('on success → forwards to rejeitarCandidatura, invalidates all THREE trees, toasts success', async () => {
    mocks.rejeitarCandidatura.mockResolvedValue(undefined)
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRejeitarCandidatura(), { wrapper })
    const justificativa = 'x'.repeat(60)
    result.current.mutate({ candidaturaId: 'c1', motivo: 'perfil_desalinhado', justificativa })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mocks.rejeitarCandidatura).toHaveBeenCalledWith('c1', 'perfil_desalinhado', justificativa)
    expect(spy).toHaveBeenCalledWith({ queryKey: candidaturasKeys.all })
    expect(spy).toHaveBeenCalledWith({ queryKey: vagasKeys.all })
    expect(spy).toHaveBeenCalledWith({ queryKey: triagemKeys.all })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Candidato movido para "Rejeitado".')
  })

  it('on error → toasts the exact error copy', async () => {
    mocks.rejeitarCandidatura.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useRejeitarCandidatura(), { wrapper })
    result.current.mutate({ candidaturaId: 'c1', motivo: 'outro', justificativa: 'y'.repeat(60) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mocks.toastError).toHaveBeenCalledWith(
      'Não foi possível rejeitar o candidato. Tente novamente.',
    )
  })
})
