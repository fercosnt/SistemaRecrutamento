/**
 * Phase 15 / Plan 15-04 Task 1 — `explicacaoService` contract test (DECISAO-04).
 *
 * Asserts the EXACT LGPD Art. 20 / RNF-07a contracts the candidate explanation data
 * layer must satisfy — the same allowlist + own-row-RPC idioms the Phase-14
 * cognitivoService test encodes:
 *  - the own-row read uses the EXPLICIT `DECISAO_EXPLICACAO_ALLOWLIST` (5 named
 *    columns) and NEVER `select('*')`, NEVER joins `scores_candidato` — the candidate
 *    never sees a score/band/percentile ([[reference_select_star_leaks_pii]], T-15-12).
 *  - the REACHABILITY GATE (Pitfall 6 / T-15-14): `getExplicacao` returns `null`
 *    unless `decisao = 'rejeitado'` (no row / aprovado / em_espera → not-available).
 *  - the derived candidate reason is a TEMPLATED non-clinical string (Open Q5) — the
 *    raw internal justificativa is NEVER surfaced verbatim, and no score leaks.
 *  - `stampExplicacao` / `solicitarRevisao` call the own-row SECURITY DEFINER RPCs
 *    with 42501/403 → neutral `'denied'` (not an error).
 *  - `solicitarRevisao` fires the N8N webhook ONCE on RPC success (redacted body,
 *    ids only) AND still resolves if the fetch REJECTS (non-blocking).
 *
 * @see src/features/decisao/services/__tests__/decisaoService.test.ts (the mock idiom)
 * @see src/features/explicacao/services/explicacaoService.ts (the unit under test)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock the supabase client BEFORE importing the service ──────────────────────
// Capture the select() projection + the rpc() calls to assert the allowlist + the
// own-row RPC contracts without a network round-trip.
const { selects, rpcMock, fromMock, maybeSingleMock } = vi.hoisted(() => ({
  selects: [] as string[],
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      selects.push(cols)
      return q
    })
    q.eq = vi.fn(() => q)
    q.maybeSingle = maybeSingleMock
    return q
  }
  fromMock.mockImplementation(() => makeQuery())
  return {
    supabase: {
      from: fromMock,
      rpc: rpcMock,
    },
  }
})

import {
  DECISAO_EXPLICACAO_ALLOWLIST,
  getExplicacao,
  solicitarRevisao,
  stampExplicacao,
} from '../explicacaoService'

const VALID_CAND = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  selects.length = 0
  rpcMock.mockReset()
  maybeSingleMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('explicacaoService — allowlist (T-15-12 / LGPD-04, no score leak)', () => {
  it('the allowlist names EXACTLY the 5 own-row columns and NO score/band/percentile', () => {
    const cols = DECISAO_EXPLICACAO_ALLOWLIST.split(',').map((c) => c.trim())
    expect(cols).toEqual([
      'decisao',
      'justificativa',
      'revisao_solicitada_em',
      'revisao_resultado',
      'explicacao_solicitada_em',
    ])
  })

  it('the allowlist is NEVER a star projection and NEVER references scores_candidato', () => {
    expect(DECISAO_EXPLICACAO_ALLOWLIST).not.toContain('*')
    expect(DECISAO_EXPLICACAO_ALLOWLIST).not.toMatch(/scores_candidato|score|banda|percentil/i)
  })

  it('getExplicacao reads decisao_final with the allowlist string (never select("*"))', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        decisao: 'rejeitado',
        justificativa: 'internal RH text 50+ chars internal RH text internal',
        revisao_solicitada_em: null,
        revisao_resultado: null,
        explicacao_solicitada_em: null,
      },
      error: null,
    })
    await getExplicacao(VALID_CAND)
    expect(fromMock).toHaveBeenCalledWith('decisao_final')
    expect(selects).toContain(DECISAO_EXPLICACAO_ALLOWLIST)
    expect(selects.some((s) => s.includes('*'))).toBe(false)
  })
})

describe('explicacaoService — reachability gate (Pitfall 6 / T-15-14)', () => {
  it('returns null when no decision row exists (not-available)', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    await expect(getExplicacao(VALID_CAND)).resolves.toBeNull()
  })

  it.each(['aprovado', 'em_espera'] as const)(
    'returns null when decisao=%s (only rejeitado reaches the page)',
    async (decisao) => {
      maybeSingleMock.mockResolvedValue({
        data: {
          decisao,
          justificativa: 'x'.repeat(60),
          revisao_solicitada_em: null,
          revisao_resultado: null,
          explicacao_solicitada_em: null,
        },
        error: null,
      })
      await expect(getExplicacao(VALID_CAND)).resolves.toBeNull()
    },
  )

  it('returns the explanation with a TEMPLATED non-clinical reason when decisao=rejeitado', async () => {
    const rawJustificativa =
      'Score abaixo do corte; banda C; reprovar — texto interno do RH com mais de 50 chars.'
    maybeSingleMock.mockResolvedValue({
      data: {
        decisao: 'rejeitado',
        justificativa: rawJustificativa,
        revisao_solicitada_em: null,
        revisao_resultado: null,
        explicacao_solicitada_em: null,
      },
      error: null,
    })
    const result = await getExplicacao(VALID_CAND)
    expect(result).not.toBeNull()
    expect(result?.decisao).toBe('rejeitado')
    // The candidate reason is the TEMPLATED string, NOT the raw internal justificativa,
    // and carries no score/band/percentile (Open Q5 / RNF-07a / LGPD-04).
    expect(result?.reason).not.toBe(rawJustificativa)
    expect(result?.reason).not.toMatch(/score|banda|percentil|\bC\b|reprovar/i)
    expect(result?.reason.length).toBeGreaterThan(20)
  })

  it('throws INVALID_INPUT when candidaturaId is empty', async () => {
    await expect(getExplicacao('')).rejects.toThrow(/obrigatório/)
  })
})

describe('explicacaoService — stampExplicacao (T-15-15 visit stamp)', () => {
  it('invokes the stamp_explicacao_acessada RPC with the candidatura id', async () => {
    rpcMock.mockResolvedValue({ error: null })
    await expect(stampExplicacao(VALID_CAND)).resolves.toBe('ok')
    expect(rpcMock).toHaveBeenCalledWith('stamp_explicacao_acessada', {
      p_candidatura_id: VALID_CAND,
    })
  })

  it('returns "denied" (neutral) on a 42501 own-row denial — not an error', async () => {
    rpcMock.mockResolvedValue({ error: { code: '42501', message: 'forbidden' } })
    await expect(stampExplicacao(VALID_CAND)).resolves.toBe('denied')
  })
})

describe('explicacaoService — solicitarRevisao (DECISAO-04 + N8N notification)', () => {
  it('invokes solicitar_revisao_decisao and fires the N8N webhook ONCE on success', async () => {
    rpcMock.mockResolvedValue({ error: null })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await expect(solicitarRevisao(VALID_CAND)).resolves.toBe('ok')

    expect(rpcMock).toHaveBeenCalledWith('solicitar_revisao_decisao', {
      p_candidatura_id: VALID_CAND,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse((init as { body: string }).body)
    // Redacted body — ids only, NO PII beyond the candidatura id.
    expect(body).toMatchObject({
      event: 'decisao.revisao_solicitada',
      data: { candidatura_id: VALID_CAND },
    })
    expect(JSON.stringify(body)).not.toMatch(/cpf|email|nome|score|banda|justificativa/i)
  })

  it('still resolves "ok" when the N8N webhook fetch REJECTS (non-blocking)', async () => {
    rpcMock.mockResolvedValue({ error: null })
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    // The mutation must NOT throw — the request is already registered server-side.
    await expect(solicitarRevisao(VALID_CAND)).resolves.toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns "denied" on a 42501 own-row denial and does NOT fire the webhook', async () => {
    rpcMock.mockResolvedValue({ error: { code: '42501', message: 'forbidden' } })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(solicitarRevisao(VALID_CAND)).resolves.toBe('denied')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['P0002', 'no_data_found'] as const)(
    'returns "unavailable" on the reachability %s (no rejected decision) — distinct from a retryable error (WR-05)',
    async (code) => {
      rpcMock.mockResolvedValue({
        error: { code, message: 'revisao indisponivel: nao ha decisao rejeitada' },
      })
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      // Non-retryable neutral outcome — NOT a thrown NETWORK_ERROR, NOT a webhook fire.
      await expect(solicitarRevisao(VALID_CAND)).resolves.toBe('unavailable')
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )
})
