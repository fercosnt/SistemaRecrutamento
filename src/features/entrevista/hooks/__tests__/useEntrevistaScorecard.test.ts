/**
 * Phase 19 / Plan 19-01 — PERF-04 Gap A invalidation regression test.
 *
 * Asserts that on `salvarAvaliacao` success the hook invalidates the TARGETED
 * Decisão Final consolidacao key — so the dashboard refetches within ≤60s instead
 * of holding pre-write data until the 5min staleTime elapses (RESEARCH Pitfall 4).
 *
 * WR-01: `vagaId` is now a NAMED option (`useEntrevistaScorecard(id, { vagaId })`),
 * not a bare positional arg — removing the footgun of a positional inserted between
 * params. WR-02: the invalidation must ALSO fire when `vagaId` is undefined (the
 * contexto query has not resolved at save time); in that case the hook invalidates
 * the candidatura-PREFIX key `['decisao','consolidacao',candidaturaId]`, which
 * TanStack matches against the full `[...,vagaId]` key — so the ≤60s freshness guard
 * is never silently skipped. Both cases stay targeted (never decisaoKeys.all).
 *
 * @see src/features/entrevista/hooks/useEntrevistaScorecard.ts (vagaId option + invalidation)
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
  getGuia: vi.fn(),
  saveGuiaEdits: vi.fn(),
}))

vi.mock('../../services/entrevistaService', () => ({
  salvarAvaliacao: mocks.salvarAvaliacao,
  getScores: mocks.getScores,
  // The hook module imports several service symbols at the top — provide inert
  // stubs so the import does not throw (only salvarAvaliacao/getScores/getGuia/
  // saveGuiaEdits are exercised here).
  getEntrevistaContexto: vi.fn(),
  getGuia: mocks.getGuia,
  getAnalise: vi.fn(),
  gerarGuia: vi.fn(),
  saveGuiaEdits: mocks.saveGuiaEdits,
  analisarTranscricao: vi.fn(),
  confirmarRevisaoHumana: vi.fn(),
}))

import { useEntrevistaScorecard, useGuiaEntrevista } from '../useEntrevistaScorecard'
import { decisaoKeys } from '@/features/decisao/hooks/useConsolidacao'
import { entrevistaKeys } from '../useEntrevistaScorecard'
import type {
  SalvarAvaliacaoPayload,
  GuiaPergunta,
} from '../../services/entrevistaService'

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

const CAND_ID = 'cand-uuid'
const VAGA_ID = 'vaga-uuid'

describe('useEntrevistaScorecard — PERF-04 Gap A targeted invalidation (Plan 19-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mocks.salvarAvaliacao.mockResolvedValue(undefined)
    mocks.getScores.mockResolvedValue([])
  })

  it('invalidates decisaoKeys.consolidacao(candidaturaId, vagaId) on salvarAvaliacao success', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useEntrevistaScorecard(CAND_ID, { vagaId: VAGA_ID }), {
      wrapper,
    })

    const payload: SalvarAvaliacaoPayload = { scoresHumanos: { comunicacao: 4 }, notas: 'ok' }
    result.current.salvarAvaliacao.mutate(payload)

    await waitFor(() => expect(result.current.salvarAvaliacao.isSuccess).toBe(true))

    // TARGETED — the consolidacao key built from the real factory, NOT decisaoKeys.all.
    expect(spy).toHaveBeenCalledWith({
      queryKey: decisaoKeys.consolidacao(CAND_ID, VAGA_ID),
    })
  })

  it('WR-02: still invalidates the consolidacao PREFIX when vagaId is undefined at save time', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    // contexto query unresolved → vagaId is undefined when the save completes.
    const { result } = renderHook(() => useEntrevistaScorecard(CAND_ID, { vagaId: undefined }), {
      wrapper,
    })

    const payload: SalvarAvaliacaoPayload = { scoresHumanos: { comunicacao: 4 }, notas: 'ok' }
    result.current.salvarAvaliacao.mutate(payload)

    await waitFor(() => expect(result.current.salvarAvaliacao.isSuccess).toBe(true))

    // The candidatura-PREFIX key — TanStack prefix-matches the full
    // ['decisao','consolidacao',candidaturaId,vagaId] key for ANY vagaId, so the
    // ≤60s freshness guard fires even without vagaId. It is the consolidacao prefix,
    // NOT decisaoKeys.all (still targeted to this candidatura's consolidacao).
    const prefixKey = [...decisaoKeys.all, 'consolidacao', CAND_ID]
    expect(spy).toHaveBeenCalledWith({ queryKey: prefixKey })

    // Guard against an accidental over-broad sweep: never decisaoKeys.all.
    expect(spy).not.toHaveBeenCalledWith({ queryKey: decisaoKeys.all })
  })
})

const VAGA_ID_GUIA = 'vaga-guia-uuid'

describe('useGuiaEntrevista — saveEdits mutation (ENTREV-06/07/08 / Plan 20-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mocks.getGuia.mockResolvedValue(null)
    mocks.saveGuiaEdits.mockResolvedValue(null)
  })

  const perguntas: GuiaPergunta[] = [
    { pergunta: 'Pergunta IA', dimensao: 'Comunicação', origem: 'ia' },
    { pergunta: 'Pergunta manual', dimensao: 'Clínica', origem: 'manual' },
  ]

  it('calls saveGuiaEdits(candidaturaId, tipo, perguntas) with the mutation vars', async () => {
    const { result } = renderHook(() => useGuiaEntrevista(CAND_ID, VAGA_ID_GUIA), { wrapper })

    await result.current.saveEdits.mutateAsync({ tipo: 'online', perguntas })

    expect(mocks.saveGuiaEdits).toHaveBeenCalledWith(CAND_ID, 'online', perguntas)
  })

  it('invalidates entrevistaKeys.guia(candidaturaId) on success — the same key the read + gerar use', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useGuiaEntrevista(CAND_ID, VAGA_ID_GUIA), { wrapper })

    await result.current.saveEdits.mutateAsync({ tipo: 'presencial', perguntas })

    await waitFor(() => expect(result.current.saveEdits.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith({ queryKey: entrevistaKeys.guia(CAND_ID) })
  })

  it('exposes saveEdits alongside gerarGuia (does not replace it)', () => {
    const { result } = renderHook(() => useGuiaEntrevista(CAND_ID, VAGA_ID_GUIA), { wrapper })
    expect(result.current.saveEdits).toBeDefined()
    expect(result.current.gerarGuia).toBeDefined()
  })
})
