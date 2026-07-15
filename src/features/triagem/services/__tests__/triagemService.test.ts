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
// vi.hoisted keeps these captures available to the hoisted vi.mock factory
// (top-level `const`s would throw "Cannot access before initialization").
const { lastSelect, rangeArgs, invokeMock, lastUpdate, rpcMock } = vi.hoisted(() => ({
  lastSelect: { value: '' },
  rangeArgs: {} as { from?: number; to?: number },
  invokeMock: vi.fn(),
  // Captures the payload passed to `.update(...)` on the candidaturas mutation so the
  // updateCandidaturaEtapa tests can assert `etapa_justificativa` is ALWAYS in the SET.
  lastUpdate: { value: null as Record<string, unknown> | null },
  // Captures `supabase.rpc('rejeitar_candidatura', {...})` — args + configurable result.
  rpcMock: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect.value = cols
      return q
    })
    q.update = vi.fn((payload: Record<string, unknown>) => {
      lastUpdate.value = payload
      return q
    })
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    q.ilike = vi.fn(() => q)
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
      rpc: rpcMock,
    },
  }
})

import {
  listTriagemPanel,
  invokeComparativo,
  updateCandidaturaEtapa,
  rejeitarCandidatura,
} from '../triagemService'

describe('triagemService — TRIAGEM-02 panel read (allowlist projection)', () => {
  beforeEach(() => {
    lastSelect.value = ''
    rangeArgs.from = undefined
    rangeArgs.to = undefined
    invokeMock.mockReset()
  })

  it('select() projection contains NO `*` and NO PII columns (cpf/data_nascimento/email/celular)', async () => {
    await listTriagemPanel('vaga-1', {}, 'score_desc', { page: 1, limit: 20 })
    // FORBIDDEN — these must never appear in the panel projection:
    expect(lastSelect.value).not.toContain('*')
    expect(lastSelect.value).not.toContain('cpf')
    expect(lastSelect.value).not.toContain('data_nascimento')
    expect(lastSelect.value).not.toContain('email')
    expect(lastSelect.value).not.toContain('celular')
  })

  it('select() reads the flat analise columns from v_triagem_panel (score_match/pontos_fortes/gaps/flags/analise_status)', async () => {
    // Reads the `v_triagem_panel` view, which flattens score_match to the top level so the
    // DESC sort actually orders the parent rows (PostgREST can't order parents by an embedded
    // resource column). The analise fields are now top-level columns, not an `analise:...` embed.
    await listTriagemPanel('vaga-1', {}, 'score_desc', { page: 1, limit: 20 })
    expect(lastSelect.value).toContain('score_match')
    expect(lastSelect.value).toContain('pontos_fortes')
    expect(lastSelect.value).toContain('gaps')
    expect(lastSelect.value).toContain('flags')
    expect(lastSelect.value).toContain('analise_status')
    expect(lastSelect.value).toContain('candidato_nome')
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

// ── OPER-01/03: updateCandidaturaEtapa ALWAYS SETs etapa_justificativa ──────
// Pitfall 3 — the trigger reads NEW.etapa_justificativa; if the UPDATE omits the
// column the trigger reads a STALE stored value. So etapa_justificativa MUST be in
// the SET list on EVERY call (forward advance → null, regression → the fresh text,
// reject → the ≥50 text). Assert the captured payload.
describe('triagemService — updateCandidaturaEtapa always writes etapa_justificativa (OPER-01/03)', () => {
  beforeEach(() => {
    lastUpdate.value = null
  })

  it('forward advance (no justificativa) → payload includes etapa_justificativa: null', async () => {
    await updateCandidaturaEtapa('cand-1', 'triagem')
    expect(lastUpdate.value).not.toBeNull()
    expect(lastUpdate.value).toHaveProperty('etapa_justificativa', null)
    expect(lastUpdate.value).toHaveProperty('etapa_atual', 'triagem')
    // Forward advance is NOT a reject → no status override.
    expect(lastUpdate.value).not.toHaveProperty('status')
  })

  it('regression WITH text → payload carries the fresh justificativa (no stale OLD)', async () => {
    await updateCandidaturaEtapa('cand-1', 'inscricao', 'voltou por X')
    expect(lastUpdate.value).toHaveProperty('etapa_justificativa', 'voltou por X')
    expect(lastUpdate.value).toHaveProperty('etapa_atual', 'inscricao')
  })

  it("reject → payload includes status:'rejeitado' AND etapa_justificativa in the SET", async () => {
    await updateCandidaturaEtapa('cand-1', 'rejeitado')
    expect(lastUpdate.value).toHaveProperty('etapa_atual', 'rejeitado')
    expect(lastUpdate.value).toHaveProperty('status', 'rejeitado')
    // etapa_justificativa is ALWAYS present (null here — no text passed).
    expect(lastUpdate.value).toHaveProperty('etapa_justificativa', null)
  })

  it('empty candidaturaId → throws TriagemServiceError INVALID_INPUT', async () => {
    await expect(updateCandidaturaEtapa('', 'triagem')).rejects.toMatchObject({
      name: 'TriagemServiceError',
      code: 'INVALID_INPUT',
    })
  })
})

// ── OPER-02: rejeitarCandidatura calls the SECURITY DEFINER RPC ─────────────
// The service is a thin typed pass-through — the DB RPC (31-01) is the ≥50 authority.
// Assert the exact p_-prefixed params and the RPC-error → TriagemServiceError mapping.
describe('triagemService — rejeitarCandidatura (OPER-02)', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it("calls supabase.rpc('rejeitar_candidatura', {p_candidatura_id,p_motivo,p_justificativa})", async () => {
    rpcMock.mockResolvedValue({ error: null })
    const justificativa = 'x'.repeat(60)
    await rejeitarCandidatura('cand-9', 'perfil_desalinhado', justificativa)
    expect(rpcMock).toHaveBeenCalledWith('rejeitar_candidatura', {
      p_candidatura_id: 'cand-9',
      p_motivo: 'perfil_desalinhado',
      p_justificativa: justificativa,
    })
  })

  it('RPC error → throws TriagemServiceError with code DATABASE_ERROR', async () => {
    rpcMock.mockResolvedValue({ error: { message: 'check_violation' } })
    await expect(
      rejeitarCandidatura('cand-9', 'outro', 'y'.repeat(60)),
    ).rejects.toMatchObject({ name: 'TriagemServiceError', code: 'DATABASE_ERROR' })
  })

  it('empty candidaturaId → throws TriagemServiceError INVALID_INPUT (no RPC call)', async () => {
    rpcMock.mockResolvedValue({ error: null })
    await expect(
      rejeitarCandidatura('', 'outro', 'z'.repeat(60)),
    ).rejects.toMatchObject({ name: 'TriagemServiceError', code: 'INVALID_INPUT' })
    expect(rpcMock).not.toHaveBeenCalled()
  })
})
