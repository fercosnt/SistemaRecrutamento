/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-02 Task 1 — RED→GREEN for `analiseCandidatoService.ts`
 * (VISRH-02 — the RH-only hub read of `analise_candidato_vaga`).
 *
 * The single load-bearing assertion is the PII-leak guard (T-34-02-01,
 * [[reference_select_star_leaks_pii]]): the read MUST name its columns explicitly
 * (score_match, pontos_fortes, gaps, flags, status) and MUST NEVER use a star
 * projection. RLS is row-level only and does NOT hide columns; the analysis row
 * carries resumo_cv/resumo_respostas/erro which the hub does not need — over-
 * projecting would leak more than the surface requires. The candidate has NO
 * SELECT policy on this table (DB-denied); RH/admin are allowed (rh_le_analise).
 *
 * @see src/features/avaliacao/services/__tests__/scoresRhService.test.ts (mock idiom cloned)
 * @see .planning/phases/34-.../34-02-PLAN.md (Task 1)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture the select() string + surface a configurable maybeSingle() result.
const { lastSelect, eqArgs, result } = vi.hoisted(() => ({
  lastSelect: { value: '' },
  eqArgs: {} as { col?: string; val?: unknown },
  result: { data: null as unknown, error: null as unknown },
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
      return q
    })
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: result.data, error: result.error }))
    return q
  }
  return {
    supabase: {
      from: vi.fn(() => makeQuery()),
    },
  }
})

import { getAnalise, ANALISE_HUB_ALLOWLIST } from '../analiseCandidatoService'

const ALLOWLIST_COLS = ['score_match', 'pontos_fortes', 'gaps', 'flags', 'status']

describe('analiseCandidatoService — allowlist read of analise_candidato_vaga (VISRH-02)', () => {
  beforeEach(() => {
    lastSelect.value = ''
    eqArgs.col = undefined
    eqArgs.val = undefined
    result.data = null
    result.error = null
  })

  it('select() projection NEVER contains `*` (PII-leak guard, [[reference_select_star_leaks_pii]])', async () => {
    await getAnalise('cand-1')
    expect(lastSelect.value).not.toContain('*')
  })

  it('select() projection contains EVERY allowlisted column explicitly', async () => {
    await getAnalise('cand-1')
    for (const col of ALLOWLIST_COLS) {
      expect(lastSelect.value).toContain(col)
    }
  })

  it('the exported ANALISE_HUB_ALLOWLIST const is star-free and names the 5 columns', () => {
    expect(ANALISE_HUB_ALLOWLIST).not.toContain('*')
    for (const col of ALLOWLIST_COLS) {
      expect(ANALISE_HUB_ALLOWLIST).toContain(col)
    }
  })

  it('filters by candidatura_id', async () => {
    await getAnalise('cand-42')
    expect(eqArgs.col).toBe('candidatura_id')
    expect(eqArgs.val).toBe('cand-42')
  })

  it('returns null when no analysis row exists (maybeSingle → null)', async () => {
    result.data = null
    await expect(getAnalise('cand-1')).resolves.toBeNull()
  })

  it('maps the DB `status` column to `analise_status` on the returned row', async () => {
    result.data = {
      score_match: 82,
      pontos_fortes: ['a', 'b'],
      gaps: ['g1'],
      flags: [],
      status: 'sucesso',
    }
    const row = await getAnalise('cand-1')
    expect(row).toMatchObject({
      score_match: 82,
      pontos_fortes: ['a', 'b'],
      gaps: ['g1'],
      flags: [],
      analise_status: 'sucesso',
    })
  })

  it('throws on empty candidaturaId', async () => {
    await expect(getAnalise('')).rejects.toThrow()
  })
})
