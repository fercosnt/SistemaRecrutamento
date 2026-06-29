/**
 * Phase 18 / Plan 18-03 Task 2 — FIX-02 regression for `avaliacaoService.getAvaliacaoContext`
 * (the live bug 686c460).
 *
 * The candidate avaliação screen loads the active SJT `perguntas` for the cargo. The
 * original bug filtered the read with `.eq('status', 'ativo')` (pt) while the canonical
 * sentinel — the `perguntas` column DEFAULT, the partial index, the RLS policy
 * `USING (status = 'active')` and `get_opcoes_sjt` — is `'active'` (en). So the query
 * matched ZERO rows and the candidate saw an empty avaliação. The fix (686c460) switched
 * the filter to `.eq('status', 'active')`.
 *
 * This is the regression that would have caught the sentinel mismatch: the mock returns
 * rows for `status === 'active'`. We assert the perguntas read was called with
 * `.eq('status', 'active')` AND that `getAvaliacaoContext` surfaced rows (length > 0).
 * On the legacy `'ativo'` value the assertion would fail. The service is NOT modified —
 * FIX-02 is already correct; re-fixing is prohibited.
 *
 * `getAvaliacaoContext` reads TWO tables: `candidaturas` first (terminal `.maybeSingle()`,
 * must return a non-null row), then `perguntas` (terminal `.eq('status','active')`, must
 * be awaitable and return the active rows). The mock serves BOTH — mirroring the
 * `decisaoService.test.ts` multi-table `makeQuery` idiom.
 *
 * Pure/mocked — no network.
 *
 * @see src/features/decisao/services/__tests__/decisaoService.test.ts (multi-table mock idiom)
 * @see src/features/avaliacao/services/__tests__/redacaoService.test.ts (select-capture idiom)
 * @see .planning/phases/18-resili-ncia-das-efs-de-ia-bugs-do-funil/18-03-PLAN.md (Task 2 — FIX-02)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const VALID_CAND = '11111111-1111-4111-8111-111111111111'

// A candidatura row served by the `candidaturas` read (own-row allowlist + joined vaga).
const CAND_ROW = {
  id: VALID_CAND,
  status: 'em_avaliacao',
  etapa_atual: 'work_sample_sjt',
  vaga_id: '22222222-2222-4222-8222-222222222222',
  vaga: { testes_aplicaveis: { work_sample_sjt: true } },
}

// The active SJT perguntas the `perguntas` read must return for status='active'.
const ACTIVE_PERGUNTAS = [
  { id: 'p1', cargo: 'dentista', cenario: 'c', formato: 'sjt', tempo_est_min: 5, rubric: {}, status: 'active' },
  { id: 'p2', cargo: 'dentista', cenario: 'c2', formato: 'sjt', tempo_est_min: 5, rubric: {}, status: 'active' },
]

// ── Mock the supabase client BEFORE importing the service ──────────────────────
// `fromMock` dispatches per table. The `perguntas.eq` spy captures its args so the test
// can assert the canonical 'active' sentinel; it ONLY returns rows when called with
// ('status','active') — the legacy 'ativo' would resolve to an empty set (the regression
// guard). The `candidaturas` query terminates in `.maybeSingle()` returning CAND_ROW.
const { fromMock, perguntasEq } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  perguntasEq: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  const candidaturasQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn(() => q)
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: CAND_ROW, error: null }))
    return q
  }

  const perguntasQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn(() => q)
    // The terminal of the perguntas read is `.eq('status', <sentinel>)` (no further
    // chain). It must be awaitable. Rows come back ONLY for the canonical 'active'.
    perguntasEq.mockImplementation((col: string, val: string) =>
      Promise.resolve(
        col === 'status' && val === 'active'
          ? { data: ACTIVE_PERGUNTAS, error: null }
          : { data: [], error: null },
      ),
    )
    q.eq = perguntasEq
    return q
  }

  fromMock.mockImplementation((table: string) =>
    table === 'perguntas' ? perguntasQuery() : candidaturasQuery(),
  )

  return { supabase: { from: fromMock } }
})

import { getAvaliacaoContext } from '@/features/avaliacao/services/avaliacaoService'

describe('avaliacaoService — getAvaliacaoContext (FIX-02: perguntas status sentinel)', () => {
  beforeEach(() => {
    fromMock.mockClear()
    perguntasEq.mockClear()
  })

  it("queries perguntas with .eq('status','active') and returns the active rows", async () => {
    const ctx = await getAvaliacaoContext(VALID_CAND)

    // The regression: the canonical 'active' sentinel was used (legacy 'ativo' would
    // have matched zero rows in the mock → an empty avaliação for the candidate).
    expect(perguntasEq).toHaveBeenCalledWith('status', 'active')

    // And the rows were surfaced — the candidate sees the SJT items.
    expect(ctx.perguntas.length).toBeGreaterThan(0)
    expect(ctx.perguntas).toHaveLength(ACTIVE_PERGUNTAS.length)

    // The mock served both tables (candidaturas first, then perguntas).
    expect(fromMock).toHaveBeenCalledWith('candidaturas')
    expect(fromMock).toHaveBeenCalledWith('perguntas')
  })

  it("returns zero perguntas under the legacy 'ativo' sentinel (guards the mismatch)", async () => {
    // Direct proof the mock distinguishes the sentinels: the canonical 'active' yields
    // rows; the legacy 'ativo' yields none. This is why the service's .eq('status','active')
    // is the load-bearing fix — a future edit back to 'ativo' would empty the screen.
    const { supabase } = await import('@/lib/supabase/client')
    const active = await (supabase.from('perguntas').select('id') as unknown as {
      eq: (c: string, v: string) => Promise<{ data: unknown[] }>
    }).eq('status', 'active')
    const legacy = await (supabase.from('perguntas').select('id') as unknown as {
      eq: (c: string, v: string) => Promise<{ data: unknown[] }>
    }).eq('status', 'ativo')

    expect(active.data.length).toBeGreaterThan(0)
    expect(legacy.data).toHaveLength(0)
  })
})
