/**
 * Phase 15 / Plan 15-03 Task 1 — `decisaoService` contract test (DECISAO-01/02/03).
 *
 * Asserts the EXACT contracts the RH decision data layer must satisfy — the same
 * idioms the Phase-10 triagemService test encodes:
 *  - allowlist projections (NO `select('*')`, NO PII) on `listFinalistas` +
 *    `getDecisaoAtual` — the [[reference_select_star_leaks_pii]] lesson (T-15-09).
 *  - `getConsolidacao` posts the SHARED `.strict()` body { candidatura_id, vaga_id }
 *    to functions.invoke('consolidar-decisao-final') — closing the integration-
 *    contract-gap (the body the EF parses).
 *  - `registrarDecisao` calls supabase.rpc('registrar_decisao', { p_candidatura_id,
 *    p_decisao, p_justificativa }) — the RPC owns the terminal transition; the client
 *    NEVER writes `candidaturas.etapa_atual` directly (no auto-decision, RNF-07a).
 *
 * @see src/features/triagem/services/__tests__/triagemService.test.ts (the mock idiom)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-03-PLAN.md (Task 1)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the supabase client BEFORE importing the service ──────────────────────
// Capture the select() projections + the invoke()/rpc() calls to assert the
// allowlist + the EF/RPC contracts without a network round-trip.
const { selects, invokeMock, rpcMock, fromMock } = vi.hoisted(() => ({
  selects: [] as string[],
  invokeMock: vi.fn(),
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      selects.push(cols)
      return q
    })
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    // `.maybeSingle()` terminal (getDecisaoAtual). Default: no decision row.
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
    // Make the query itself awaitable like PostgREST (listFinalistas — no terminal).
    q.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: [], error: null })
    return q
  }
  fromMock.mockImplementation(() => makeQuery())
  return {
    supabase: {
      from: fromMock,
      functions: { invoke: invokeMock },
      rpc: rpcMock,
    },
  }
})

import {
  getConsolidacao,
  registrarDecisao,
  listFinalistas,
  getDecisaoAtual,
} from '../decisaoService'

const VALID_CAND = '11111111-1111-4111-8111-111111111111'
const VALID_VAGA = '22222222-2222-4222-8222-222222222222'

describe('decisaoService — getConsolidacao (DECISAO-01 EF invoke + shared contract)', () => {
  beforeEach(() => {
    selects.length = 0
    invokeMock.mockReset()
    rpcMock.mockReset()
  })

  it('posts the shared .strict() body { candidatura_id, vaga_id } to consolidar-decisao-final', async () => {
    invokeMock.mockResolvedValue({
      data: { consolidated: 80, breakdown: [], recommendation: 'ok' },
      error: null,
    })
    await getConsolidacao(VALID_CAND, VALID_VAGA)
    expect(invokeMock).toHaveBeenCalledWith(
      'consolidar-decisao-final',
      expect.objectContaining({
        body: { candidatura_id: VALID_CAND, vaga_id: VALID_VAGA },
      }),
    )
  })

  it('rejects an invalid (non-uuid) candidatura_id at the shared schema BEFORE invoking', async () => {
    await expect(getConsolidacao('not-a-uuid', VALID_VAGA)).rejects.toThrow(
      /Identificadores da consolidação inválidos/,
    )
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('maps a transport error to the pt-BR copy', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(getConsolidacao(VALID_CAND, VALID_VAGA)).rejects.toThrow(
      /Não foi possível carregar a consolidação/,
    )
  })

  it('returns the EF { consolidated, breakdown, recommendation } shape on success', async () => {
    const payload = {
      consolidated: 72.5,
      breakdown: [{ etapa: 'triagem', normalized: 72.5, status: 'present', weight: 100, effective_weight: 1 }],
      recommendation: 'Aderência moderada.',
    }
    invokeMock.mockResolvedValue({ data: payload, error: null })
    const result = await getConsolidacao(VALID_CAND, VALID_VAGA)
    expect(result).toEqual(payload)
  })
})

describe('decisaoService — registrarDecisao (DECISAO-03 terminal RPC)', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    fromMock.mockClear()
  })

  it('calls rpc("registrar_decisao", { p_candidatura_id, p_decisao, p_justificativa })', async () => {
    rpcMock.mockResolvedValue({ data: {}, error: null })
    await registrarDecisao({
      candidaturaId: VALID_CAND,
      decisao: 'rejeitado',
      justificativa: 'x'.repeat(55),
    })
    expect(rpcMock).toHaveBeenCalledWith(
      'registrar_decisao',
      expect.objectContaining({
        p_candidatura_id: VALID_CAND,
        p_decisao: 'rejeitado',
        p_justificativa: expect.any(String),
      }),
    )
  })

  it('the client NEVER writes candidaturas.etapa_atual directly (RPC owns the transition)', async () => {
    rpcMock.mockResolvedValue({ data: {}, error: null })
    await registrarDecisao({
      candidaturaId: VALID_CAND,
      decisao: 'aprovado',
      justificativa: 'y'.repeat(55),
    })
    // No `from('candidaturas')` UPDATE — the SECURITY DEFINER RPC is the sole writer.
    expect(fromMock).not.toHaveBeenCalledWith('candidaturas')
  })

  it('maps an RPC error to the pt-BR copy', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'forbidden' } })
    await expect(
      registrarDecisao({ candidaturaId: VALID_CAND, decisao: 'aprovado', justificativa: 'z'.repeat(55) }),
    ).rejects.toThrow(/Não foi possível registrar a decisão/)
  })
})

describe('decisaoService — allowlist reads (T-15-09, NEVER select(*))', () => {
  beforeEach(() => {
    selects.length = 0
  })

  it('listFinalistas projects ONLY candidatura_id + decisao (no *, no PII)', async () => {
    await listFinalistas(VALID_VAGA)
    const proj = selects.join(' | ')
    expect(proj).not.toContain('*')
    expect(proj).toContain('candidatura_id')
    expect(proj).toContain('decisao')
    // never identity/score columns:
    expect(proj).not.toContain('cpf')
    expect(proj).not.toContain('data_nascimento')
    expect(proj).not.toContain('score')
  })

  it('getDecisaoAtual projects ONLY decisao, justificativa, em (no *, no PII)', async () => {
    await getDecisaoAtual(VALID_CAND)
    const proj = selects.join(' | ')
    expect(proj).not.toContain('*')
    expect(proj).toContain('decisao')
    expect(proj).toContain('justificativa')
    expect(proj).toContain('em')
    expect(proj).not.toContain('cpf')
  })
})
