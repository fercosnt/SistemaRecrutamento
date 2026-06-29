/**
 * Phase 19 / Plan 19-01 — PERF-04 Gap A invalidation regression test (RED until Plan 03).
 *
 * Asserts that on `salvarAvaliacao` success the hook invalidates the TARGETED
 * `decisaoKeys.consolidacao(candidaturaId, vagaId)` key — so the Decisão Final
 * dashboard refetches within ≤60s instead of holding pre-write data until the
 * 5min staleTime elapses (RESEARCH Pitfall 4).
 *
 * RED BY DESIGN (Wave-0 scaffold): `useEntrevistaScorecard` does NOT yet take a
 * `vagaId` param and does NOT yet invalidate `decisaoKeys.consolidacao`. Plan 19-03
 * adds the `vagaId` param + the targeted invalidation, turning this GREEN. The
 * `vagaId` argument is threaded through a contract-typed call (`ScorecardWithVagaId`)
 * so the file type-checks against the intended post-Plan-03 signature without
 * introducing a NEW tsc error against the current signature.
 *
 * @see src/features/entrevista/hooks/useEntrevistaScorecard.ts (Plan 19-03 adds vagaId + invalidation)
 * @see src/features/decisao/hooks/useConsolidacao.ts (decisaoKeys.consolidacao L21-22)
 * @see .planning/phases/19-performance-bundle-cache/19-PATTERNS.md (test assignments L406-430)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

// Mock the service so the mutation resolves without touching Supabase.
const mocks = vi.hoisted(() => ({
  salvarAvaliacao: vi.fn(),
  getScores: vi.fn(),
}))

vi.mock('../../services/entrevistaService', () => ({
  salvarAvaliacao: mocks.salvarAvaliacao,
  getScores: mocks.getScores,
  // The hook module imports several service symbols at the top — provide inert
  // stubs so the import does not throw (only salvarAvaliacao/getScores are used here).
  getEntrevistaContexto: vi.fn(),
  getGuia: vi.fn(),
  getAnalise: vi.fn(),
  gerarGuia: vi.fn(),
  analisarTranscricao: vi.fn(),
  confirmarRevisaoHumana: vi.fn(),
}))

import { useEntrevistaScorecard } from '../useEntrevistaScorecard'
import { decisaoKeys } from '@/features/decisao/hooks/useConsolidacao'
import type { SalvarAvaliacaoPayload } from '../../services/entrevistaService'

// Post-Plan-03 signature contract: the hook gains a positional `vagaId` BEFORE
// `options`. Typing the call through this contract keeps the test type-checking
// against the INTENDED shape (no new tsc error) while the runtime assertion stays
// RED until Plan 03 implements it.
type ScorecardWithVagaId = (
  candidaturaId: string | undefined,
  vagaId: string | undefined,
) => ReturnType<typeof useEntrevistaScorecard>
const useScorecard = useEntrevistaScorecard as unknown as ScorecardWithVagaId

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

const CAND_ID = 'cand-uuid'
const VAGA_ID = 'vaga-uuid'

describe('useEntrevistaScorecard — PERF-04 Gap A targeted invalidation (Plan 19-01, RED until 19-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mocks.salvarAvaliacao.mockResolvedValue(undefined)
    mocks.getScores.mockResolvedValue([])
  })

  it('invalidates decisaoKeys.consolidacao(candidaturaId, vagaId) on salvarAvaliacao success', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useScorecard(CAND_ID, VAGA_ID), { wrapper })

    const payload: SalvarAvaliacaoPayload = { scoresHumanos: { comunicacao: 4 }, notas: 'ok' }
    result.current.salvarAvaliacao.mutate(payload)

    await waitFor(() => expect(result.current.salvarAvaliacao.isSuccess).toBe(true))

    // TARGETED — the consolidacao key built from the real factory, NOT decisaoKeys.all.
    expect(spy).toHaveBeenCalledWith({
      queryKey: decisaoKeys.consolidacao(CAND_ID, VAGA_ID),
    })
  })
})
