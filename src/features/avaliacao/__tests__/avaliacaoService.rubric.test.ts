/**
 * Phase 24 / Plan 24-02 Task 3 — SEC-07 projection guard for avaliacaoService.
 *
 * Locks the client half of SEC-07: the candidate-facing `perguntas` projection in
 * `getAvaliacaoContext` must NOT carry the BARS `rubric` (open-case answer key). The
 * column is also REVOKE'd at Postgres (20260706110002_sec07_rubric.sql); this asserts
 * the network projection, not the JSX ([[reference_select_star_leaks_pii]]).
 *
 * @see supabase/migrations/20260706110002_sec07_rubric.sql (the column REVOKE)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture the `perguntas` select() projection string so we can assert it excludes rubric.
const { perguntasSelect } = vi.hoisted(() => ({
  perguntasSelect: { value: '' },
}))

vi.mock('@/lib/supabase/client', () => {
  const candidaturasQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn(() => q)
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    q.maybeSingle = vi.fn(() =>
      Promise.resolve({
        data: {
          id: 'c1',
          status: 'em_avaliacao',
          etapa_atual: 'work_sample_sjt',
          vaga_id: 'v1',
          vaga: { testes_aplicaveis: {} },
        },
        error: null,
      }),
    )
    return q
  }

  const perguntasQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      perguntasSelect.value = cols
      return q
    })
    // Terminal of the perguntas read is `.eq('status','active')` — awaitable.
    q.eq = vi.fn(() => Promise.resolve({ data: [], error: null }))
    return q
  }

  return {
    supabase: {
      from: vi.fn((table: string) =>
        table === 'perguntas' ? perguntasQuery() : candidaturasQuery(),
      ),
    },
  }
})

import { getAvaliacaoContext } from '@/features/avaliacao/services/avaliacaoService'

beforeEach(() => {
  perguntasSelect.value = ''
})

describe('avaliacaoService.getAvaliacaoContext — SEC-07 rubric drop', () => {
  it('the candidate perguntas projection excludes the BARS rubric column', async () => {
    await getAvaliacaoContext('11111111-1111-4111-8111-111111111111')
    expect(perguntasSelect.value.length).toBeGreaterThan(0)
    // The answer key must not be projected — and never a star projection.
    expect(perguntasSelect.value).not.toMatch(/rubric/)
    expect(perguntasSelect.value).not.toContain('*')
    // The columns the candidate still legitimately needs remain present.
    expect(perguntasSelect.value).toContain('cenario')
    expect(perguntasSelect.value).toContain('formato')
  })
})
