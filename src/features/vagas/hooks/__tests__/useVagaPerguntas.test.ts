/**
 * Phase 4 / Plan 04-04 — useVagaPerguntas Vitest coverage.
 *
 * Activates Wave 0 stubs from Plan 04-01 Task 6.
 *
 * Coverage (4 cases):
 *   - T1: disabled when vagaId null — query never fires
 *   - T2: returns ordered array (ordem ASC) + chain assertions on .eq/.order
 *   - T3: returns [] when vaga has no perguntas (D-14)
 *   - T4: error propagation throws Error with prefixed pt-BR message
 *
 * Mock pattern: vi.hoisted() for the supabase storage chain (carryover de
 * 04-03 — Plan 04-03 SUMMARY documenta o pattern para chains do SDK).
 * QueryClient com retry: false para isolation entre tests.
 *
 * @see .planning/phases/04-vagas-candidatura/04-RESEARCH.md L1767
 * @see .planning/phases/04-vagas-candidatura/04-PATTERNS.md L253-263
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createElement } from 'react'

// vi.hoisted: Vitest 4.x hoists vi.mock factories above all top-level
// statements. Chain mocks must live in the same hoisted phase to be in
// scope inside the factory. Pattern documented in 04-03-SUMMARY.md.
const mocks = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockIs = vi.fn(() => ({ order: mockOrder }))
  const mockEq = vi.fn(() => ({ is: mockIs }))
  const mockSelect = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  return { mockOrder, mockIs, mockEq, mockSelect, mockFrom }
})

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: mocks.mockFrom },
}))

import { useVagaPerguntas } from '../useVagaPerguntas'

// Per-test QueryClient (built fresh in beforeEach) — ensures retry: false
// is applied to every query in isolation. Wrapper closes over the live
// reference, NOT a stale instance from a closure created at first render.
let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

describe('useVagaPerguntas (Plan 04-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('T1: disabled when vagaId null — query never fires', async () => {
    const { result } = renderHook(() => useVagaPerguntas(null), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(mocks.mockFrom).not.toHaveBeenCalled()
  })

  it('T2: returns ordered array by ordem ASC + builds correct query chain', async () => {
    const fakeData = [
      { id: 'p1', ordem: 1, texto_pergunta: 'Q1' },
      { id: 'p2', ordem: 2, texto_pergunta: 'Q2' },
    ]
    mocks.mockOrder.mockResolvedValue({ data: fakeData, error: null })

    const { result } = renderHook(() => useVagaPerguntas('vaga-uuid'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(fakeData)
    expect(mocks.mockFrom).toHaveBeenCalledWith('perguntas_formulario')
    expect(mocks.mockSelect).toHaveBeenCalledWith('*')
    expect(mocks.mockEq).toHaveBeenCalledWith('vaga_id', 'vaga-uuid')
    expect(mocks.mockIs).toHaveBeenCalledWith('deleted_at', null)
    expect(mocks.mockOrder).toHaveBeenCalledWith('ordem', { ascending: true })
  })

  it('T3: returns [] for vaga with no perguntas (D-14)', async () => {
    mocks.mockOrder.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useVagaPerguntas('vaga-uuid'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // D-14: vaga sem perguntas configuradas → empty array (NOT undefined).
    expect(result.current.data).toEqual([])
    expect(Array.isArray(result.current.data)).toBe(true)
  })

  it('T4: error propagation throws Error with prefixed pt-BR message', async () => {
    mocks.mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'connection lost' },
    })

    // Override hook's hardcoded `retry: 2` to make error propagation single-
    // shot. Without this, the 2 retries (with exponential backoff) exceed
    // the default waitFor timeout of 1000ms and the test flakes.
    const { result } = renderHook(
      () => useVagaPerguntas('vaga-uuid', { retry: false }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toMatch(/^Erro ao buscar perguntas/)
    expect(result.current.error?.message).toContain('connection lost')
  })
})
