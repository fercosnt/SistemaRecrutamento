/**
 * Phase 19 / Plan 19-01 — PERF-04 Gap B invalidation regression test (RED until Plan 03).
 *
 * Asserts that on `salvarRevisao` success the hook invalidates the TARGETED
 * `decisaoKeys.consolidacao(rowCandidaturaId, vagaId)` key, where the per-row
 * `candidatura_id` is threaded through the mutation VARIABLES (the hook only
 * knows `vagaId`; each essay carries its own `candidatura_id` — RESEARCH Gap B).
 *
 * RED BY DESIGN (Wave-0 scaffold): the `salvar` mutation variables do NOT yet
 * carry `candidaturaId` and `onSuccess` does NOT yet invalidate
 * `decisaoKeys.consolidacao`. Plan 19-03 threads `candidaturaId` into the
 * variables + adds the targeted invalidation, turning this GREEN. The variable
 * is typed through a contract (`SalvarRevisaoVars`) so the file type-checks
 * against the intended post-Plan-03 shape without a NEW tsc error.
 *
 * @see src/features/triagem/hooks/useRedacaoRevisao.ts (Plan 19-03 threads candidaturaId + invalidation)
 * @see src/features/decisao/hooks/useConsolidacao.ts (decisaoKeys.consolidacao L21-22)
 * @see .planning/phases/19-performance-bundle-cache/19-PATTERNS.md (test assignments L406-430)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

// Mock the service so the mutation resolves without touching Supabase.
const mocks = vi.hoisted(() => ({
  salvarRevisao: vi.fn(),
  listRedacoesRevisao: vi.fn(),
  getDuvidasGestor: vi.fn(),
}))

vi.mock('../../services/revisaoRedacaoService', () => ({
  salvarRevisao: mocks.salvarRevisao,
  listRedacoesRevisao: mocks.listRedacoesRevisao,
  getDuvidasGestor: mocks.getDuvidasGestor,
  NOTAS_MIN_CHARS: 50,
}))

import { useRedacaoRevisao } from '../useRedacaoRevisao'
import { decisaoKeys } from '@/features/decisao/hooks/useConsolidacao'
import type { SalvarRevisaoPayload } from '../../services/revisaoRedacaoService'

// Post-Plan-03 mutation-variable contract: the per-row `candidaturaId` is added
// alongside `redacaoId`/`payload`. Typing the mutate call through this contract
// keeps the test type-checking against the INTENDED shape (no new tsc error)
// while the runtime assertion stays RED until Plan 03 implements it.
type SalvarRevisaoVars = {
  redacaoId: string
  candidaturaId: string
  payload: SalvarRevisaoPayload
}

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

const VAGA_ID = 'vaga-uuid'
const ROW_CAND_ID = 'row-cand-uuid'
const REDACAO_ID = 'redacao-uuid'

describe('useRedacaoRevisao — PERF-04 Gap B targeted invalidation (Plan 19-01, RED until 19-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mocks.salvarRevisao.mockResolvedValue(undefined)
    mocks.listRedacoesRevisao.mockResolvedValue([])
    mocks.getDuvidasGestor.mockResolvedValue([])
  })

  it('invalidates decisaoKeys.consolidacao(rowCandidaturaId, vagaId) threading the per-row candidatura_id', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRedacaoRevisao(VAGA_ID), { wrapper })

    const payload: SalvarRevisaoPayload = {
      decisao: 'aprovado',
      notas: 'Justificativa com mais de cinquenta caracteres para passar no gate.',
      scores_humanos: {},
    }
    const vars: SalvarRevisaoVars = {
      redacaoId: REDACAO_ID,
      candidaturaId: ROW_CAND_ID,
      payload,
    }
    // The mutate accepts the post-Plan-03 variable shape (candidaturaId threaded).
    result.current.salvarRevisao.mutate(vars as never)

    await waitFor(() => expect(result.current.salvarRevisao.isSuccess).toBe(true))

    // TARGETED — consolidacao built from the real factory using the ROW's candidatura_id.
    expect(spy).toHaveBeenCalledWith({
      queryKey: decisaoKeys.consolidacao(ROW_CAND_ID, VAGA_ID),
    })
  })
})
