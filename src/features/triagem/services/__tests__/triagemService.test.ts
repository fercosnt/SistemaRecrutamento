/**
 * Phase 10 / Plan 10-01 Task 3 — Wave 0 RED scaffold for `triagemService.ts`
 * (TRIAGEM-02 panel read + TRIAGEM-03 comparativo invoke).
 *
 * RED against the not-yet-existing `../triagemService`. The dynamic import via the
 * static `import { ... } from '../triagemService'` below makes Vitest fail with
 * "Cannot find module '../triagemService'" — the calibrated Wave-0 RED signal
 * (smoke-runtime gate, the central Phase-4 lesson). The implementation lands in
 * a later Phase-10 wave and flips these GREEN.
 *
 * The assertions encode the EXACT contracts the service must satisfy:
 *  - allowlist projection (NO `*`, NO cpf/data_nascimento/email/celular) joining
 *    `analise_candidato_vaga` — the [[reference_select_star_leaks_pii]] lesson.
 *  - default order = score_match DESC nulls-last; `.range()` math for 20/page.
 *  - invokeComparativo posts { vaga_id, candidatura_ids } to
 *    functions.invoke('comparativo-candidatos') and maps the EF mixed-vaga 400
 *    to the exact pt-BR copy (the contract 10-06/T1 implements).
 *
 * @see src/features/vagas/services/candidaturasService.ts:1145-1230 (listByVaga select('*') hazard — the anti-pattern forbidden here)
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-UI-SPEC.md (§A panel)
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-01-PLAN.md (Task 3 — TRIAGEM-02/03)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the supabase client BEFORE importing the service ──────────────────
// Capture the select() string and the invoke() call so we can assert the
// allowlist projection and the comparativo contract without a network round-trip.
let lastSelect = ''
const rangeArgs: { from?: number; to?: number } = {}
const invokeMock = vi.fn()

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect = cols
      return q
    })
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    q.order = vi.fn(() => q)
    q.range = vi.fn((from: number, to: number) => {
      rangeArgs.from = from
      rangeArgs.to = to
      // Terminal: resolve like PostgREST.
      return Promise.resolve({ data: [], error: null, count: 0 })
    })
    return q
  }
  return {
    supabase: {
      from: vi.fn(() => makeQuery()),
      functions: { invoke: invokeMock },
    },
  }
})

// RED: '../triagemService' does not exist yet → Vitest "Cannot find module".
import {
  listTriagemPanel,
  invokeComparativo,
} from '../triagemService'

describe('triagemService — TRIAGEM-02 panel read (allowlist projection)', () => {
  beforeEach(() => {
    lastSelect = ''
    rangeArgs.from = undefined
    rangeArgs.to = undefined
    invokeMock.mockReset()
  })

  it('select() projection contains NO `*` and NO PII columns (cpf/data_nascimento/email/celular)', async () => {
    await listTriagemPanel('vaga-1', {}, 'score_desc', { page: 1, limit: 20 })
    // FORBIDDEN — these must never appear in the panel projection:
    expect(lastSelect).not.toContain('*')
    expect(lastSelect).not.toContain('cpf')
    expect(lastSelect).not.toContain('data_nascimento')
    expect(lastSelect).not.toContain('email')
    expect(lastSelect).not.toContain('celular')
  })

  it('select() joins analise:analise_candidato_vaga with score_match/pontos_fortes/gaps/flags/status', async () => {
    await listTriagemPanel('vaga-1', {}, 'score_desc', { page: 1, limit: 20 })
    expect(lastSelect).toContain('analise_candidato_vaga')
    expect(lastSelect).toContain('score_match')
    expect(lastSelect).toContain('pontos_fortes')
    expect(lastSelect).toContain('gaps')
    expect(lastSelect).toContain('flags')
  })

  it('.range() math = (page-1)*limit for 20/page (page 2 → 20..39)', async () => {
    await listTriagemPanel('vaga-1', {}, 'score_desc', { page: 2, limit: 20 })
    expect(rangeArgs.from).toBe(20)
    expect(rangeArgs.to).toBe(39)
  })
})

describe('triagemService — TRIAGEM-03 invokeComparativo', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it('posts { vaga_id, candidatura_ids } to functions.invoke("comparativo-candidatos")', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true, ranking: [], latencia_ms: 1200 }, error: null })
    await invokeComparativo('vaga-1', ['c1', 'c2'])
    expect(invokeMock).toHaveBeenCalledWith(
      'comparativo-candidatos',
      expect.objectContaining({ body: { vaga_id: 'vaga-1', candidatura_ids: ['c1', 'c2'] } }),
    )
  })

  it('maps the EF mixed-vaga 400 to the exact pt-BR copy', async () => {
    // The EF returns { ok:false, error_code:'MIXED_VAGA' } for vagas diferentes.
    invokeMock.mockResolvedValue({ data: { ok: false, error_code: 'MIXED_VAGA' }, error: null })
    await expect(invokeComparativo('vaga-1', ['c1', 'c2'])).rejects.toThrow(
      'Os candidatos selecionados pertencem a vagas diferentes. Compare candidatos de uma mesma vaga.',
    )
  })
})
