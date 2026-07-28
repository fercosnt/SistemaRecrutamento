/**
 * Phase 12 — code-review fix tests for `bigfiveService.ts`.
 *
 * WR-05: `loadDevolutiva` must (a) name `candidato_id` in its column allowlist
 *   (defense-in-depth alongside the own-row RLS) and never `select('*')`
 *   ([[reference_select_star_leaks_pii]]), and (b) return null when no row comes
 *   back (the non-owner case: RLS yields no row → maybeSingle data null).
 *
 * WR-06: `submitBigfiveFinal` must map a 400 (EF VALIDATION) to a distinct
 *   INVALID_INPUT throw — NOT the retry-suggesting NETWORK_ERROR copy — while a
 *   42501/403 still maps to LOCKED and a generic transport error to NETWORK_ERROR.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted control surface for the mocked supabase client.
const ctrl = vi.hoisted(() => ({
  lastSelect: { value: '' },
  maybeSingleData: { value: null as unknown },
  invokeResult: { value: { data: null as unknown, error: null as unknown } },
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      ctrl.lastSelect.value = cols
      return q
    })
    q.eq = vi.fn(() => q)
    q.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: ctrl.maybeSingleData.value, error: null }),
    )
    return q
  }
  return {
    supabase: {
      from: vi.fn(() => makeQuery()),
      functions: {
        invoke: vi.fn(() => Promise.resolve(ctrl.invokeResult.value)),
      },
    },
  }
})

import { loadDevolutiva, submitBigfiveFinal } from '../bigfiveService'

describe('bigfiveService.loadDevolutiva — WR-05 allowlist + ownership', () => {
  beforeEach(() => {
    ctrl.lastSelect.value = ''
    ctrl.maybeSingleData.value = null
  })

  it('select() projection includes candidato_id and NEVER `*`', async () => {
    await loadDevolutiva('cand-vaga-1')
    expect(ctrl.lastSelect.value).not.toContain('*')
    expect(ctrl.lastSelect.value).toContain('candidato_id')
    expect(ctrl.lastSelect.value).toContain('conteudo_jsonb')
  })

  it('returns null when no row is returned (non-owner: RLS yields no row)', async () => {
    ctrl.maybeSingleData.value = null
    const out = await loadDevolutiva('cand-vaga-1')
    expect(out).toBeNull()
  })

  it('throws on empty candidaturaId', async () => {
    await expect(loadDevolutiva('')).rejects.toThrow()
  })
})

describe('bigfiveService.submitBigfiveFinal — WR-06 error mapping', () => {
  const RESPOSTAS: Record<string, number> = {}
  for (let id = 1; id <= 120; id++) RESPOSTAS[String(id)] = 3
  const CANDIDATURA = '11111111-1111-4111-8111-111111111111'

  beforeEach(() => {
    ctrl.invokeResult.value = { data: null, error: null }
  })

  it('maps a 400 (EF VALIDATION) to INVALID_INPUT, not NETWORK_ERROR', async () => {
    ctrl.invokeResult.value = { data: null, error: { status: 400 } }
    await expect(submitBigfiveFinal(CANDIDATURA, RESPOSTAS)).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })
  })

  it('still maps a 403 back-lock to LOCKED', async () => {
    ctrl.invokeResult.value = { data: null, error: { status: 403 } }
    await expect(submitBigfiveFinal(CANDIDATURA, RESPOSTAS)).rejects.toMatchObject({
      code: 'LOCKED',
    })
  })

  it('maps a generic transport error to NETWORK_ERROR', async () => {
    ctrl.invokeResult.value = { data: null, error: { status: 500 } }
    await expect(submitBigfiveFinal(CANDIDATURA, RESPOSTAS)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    })
  })

  it('returns the neutral ack on success', async () => {
    ctrl.invokeResult.value = { data: { ok: true, devolutiva_id: 'dev-1' }, error: null }
    const out = await submitBigfiveFinal(CANDIDATURA, RESPOSTAS)
    expect(out.ok).toBe(true)
  })
})
