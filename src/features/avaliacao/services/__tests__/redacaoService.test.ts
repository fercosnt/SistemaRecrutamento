/**
 * Phase 13 / Plan 13-01 Task 3 — Wave 0 RED scaffold for `redacaoService`
 * (AVAL-06 — the candidate-side read of `redacoes_candidato`).
 *
 * The single load-bearing assertion is the PII/verdict-leak guard
 * (T-13-01-03, [[reference_select_star_leaks_pii]] / RNF-07a): the candidate read
 * MUST name its columns explicitly and MUST NOT use a star projection. RLS is
 * row-level only and does NOT hide columns — an own-row `select('*')` would leak
 * `analise_ia`, scores, color, `red_flag_etico`, and all `*_revisor` fields to the
 * candidate. We assert the NETWORK PROJECTION (the `.select()` string), not the JSX.
 *
 * The exact allowlist the candidate read must use (RESEARCH §Code Examples):
 *   'id, pergunta_id, texto, word_count, submetida_em, status_analise'
 * and NEVER: analise_ia, scores_dimensao, score_ponderado_0_100, classificacao_cor,
 *            red_flag_etico, flags, scores_humanos, notas_revisor, decisao_revisor.
 *
 * ── Why this is RED now ──
 * `@/features/avaliacao/services/redacaoService` does NOT exist yet → the import
 * throws "Cannot find module" at runtime. THAT is the calibrated Wave-0 failure.
 * The service lands in the Phase-13 candidate wave (Plan 03). The mocked-supabase
 * `.select()`-capture idiom (copied from scoresRhService.test.ts) holds the
 * allowlist contract as an executable assertion BEFORE the service lands.
 *
 * @see src/features/avaliacao/services/__tests__/scoresRhService.test.ts (mock idiom)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-RESEARCH.md Pitfall 3
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-01-PLAN.md (Task 3)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { lastSelect } = vi.hoisted(() => ({ lastSelect: { value: '' } }))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect.value = cols
      return q
    })
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
    q.order = vi.fn(() => Promise.resolve({ data: [], error: null }))
    q.then = undefined
    return q
  }
  return { supabase: { from: vi.fn(() => makeQuery()) } }
})

// RED: this module does not exist yet — import throws "Cannot find module".
// The candidate-facing read function (name per PLAN 03; assert via the captured select string).
// @ts-expect-error — module lands in Plan 13-03; RED until then.
import * as redacaoService from '@/features/avaliacao/services/redacaoService'

// The verdict columns that must NEVER appear in a candidate-facing projection.
const FORBIDDEN_COLUMNS = [
  'analise_ia',
  'scores_dimensao',
  'score_ponderado_0_100',
  'classificacao_cor',
  'red_flag_etico',
  'flags',
  'scores_humanos',
  'notas_revisor',
  'decisao_revisor',
]

// The columns the candidate read IS allowed to project.
const ALLOWLIST = ['id', 'pergunta_id', 'texto', 'word_count', 'submetida_em', 'status_analise']

describe('redacaoService — candidate read excludes verdict columns (Plan 13-01, Wave 0 RED)', () => {
  beforeEach(() => {
    lastSelect.value = ''
  })

  it('exports a candidate-facing redacoes_candidato reader', () => {
    // RED: no export exists yet. The reader function lands in Plan 13-03.
    const reader =
      (redacaoService as Record<string, unknown>).getRedacaoCandidato ??
      (redacaoService as Record<string, unknown>).loadRedacao
    expect(typeof reader).toBe('function')
  })

  it('the read projection NEVER contains `*` (PII-leak guard)', async () => {
    const reader = (redacaoService as Record<string, unknown>).getRedacaoCandidato as
      | ((id: string) => Promise<unknown>)
      | undefined
    await reader?.('cand-1')
    expect(lastSelect.value).not.toContain('*')
  })

  it('the read projection EXCLUDES every verdict column (RNF-07a)', async () => {
    const reader = (redacaoService as Record<string, unknown>).getRedacaoCandidato as
      | ((id: string) => Promise<unknown>)
      | undefined
    await reader?.('cand-1')
    for (const col of FORBIDDEN_COLUMNS) {
      expect(lastSelect.value).not.toContain(col)
    }
  })

  it('the read projection contains each allowlisted column', async () => {
    const reader = (redacaoService as Record<string, unknown>).getRedacaoCandidato as
      | ((id: string) => Promise<unknown>)
      | undefined
    await reader?.('cand-1')
    for (const col of ALLOWLIST) {
      expect(lastSelect.value).toContain(col)
    }
  })
})
