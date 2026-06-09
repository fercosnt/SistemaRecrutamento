/**
 * Phase 11 / Plan 11-06 Task 1 — Wave-0 RED → GREEN for `scoresRhService.ts`
 * (AVAL-02/03 — the RH-facing read of `scores_candidato`).
 *
 * The single load-bearing assertion is the PII-leak guard (T-11-06-01,
 * [[reference_select_star_leaks_pii]]): the read MUST name its columns explicitly
 * and MUST NOT use a star projection. RLS is row-level only and does not hide
 * columns — over-projection here would leak more than the scorecard needs. We
 * capture the `.select()` string from a mocked supabase client and assert it
 * contains each allowlisted column and never `'*'`.
 *
 * @see src/features/triagem/services/__tests__/triagemService.test.ts (mock idiom copied)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-06-PLAN.md (Task 1)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture the select() string before importing the service (vi.hoisted keeps the
// capture available to the hoisted vi.mock factory).
const { lastSelect, eqArgs } = vi.hoisted(() => ({
  lastSelect: { value: '' },
  eqArgs: {} as { col?: string; val?: unknown },
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect.value = cols
      return q
    })
    q.eq = vi.fn((col: string, val: unknown) => {
      eqArgs.col = col
      eqArgs.val = val
      // Terminal: resolve like PostgREST.
      return Promise.resolve({ data: [], error: null })
    })
    return q
  }
  return {
    supabase: {
      from: vi.fn(() => makeQuery()),
    },
  }
})

import { getScores } from '../scoresRhService'

const ALLOWLIST = [
  'id',
  'tipo',
  'subtipo',
  'pergunta_id',
  'score',
  'score_max',
  'status',
  'metadata',
  'citacoes',
  'red_flags',
]

describe('scoresRhService — RH allowlist read of scores_candidato', () => {
  beforeEach(() => {
    lastSelect.value = ''
    eqArgs.col = undefined
    eqArgs.val = undefined
  })

  it('select() projection NEVER contains `*` (PII-leak guard, [[reference_select_star_leaks_pii]])', async () => {
    await getScores('cand-1')
    expect(lastSelect.value).not.toContain('*')
  })

  it('select() projection contains EVERY allowlisted column explicitly', async () => {
    await getScores('cand-1')
    for (const col of ALLOWLIST) {
      expect(lastSelect.value).toContain(col)
    }
  })

  it('filters by candidatura_id', async () => {
    await getScores('cand-42')
    expect(eqArgs.col).toBe('candidatura_id')
    expect(eqArgs.val).toBe('cand-42')
  })

  it('throws on empty candidaturaId', async () => {
    await expect(getScores('')).rejects.toThrow()
  })
})
