/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-05 Task 1 — RED→GREEN for `funilKpisService.ts` (KPI-02/04).
 *
 * Load-bearing contract (T-34-05-01): the ONLY data path is the `funil_kpis` DEFINER RPC.
 * The service performs NO client-side aggregation — it never `.from('candidaturas')` /
 * `.from('historico_candidatura')` and reduces (the dead M1 pattern being replaced, a
 * PII/scope leak). The RPC is called with `{ p_vaga_id }`; the returned object passes
 * through untouched. `supabase.from` is exposed so a stray client read/aggregation is caught.
 *
 * @see src/features/agendamento/services/__tests__/agendamentoService.test.ts (mock idiom cloned)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { captured, result } = vi.hoisted(() => ({
  captured: {} as { rpcName?: string; rpcArgs?: unknown; fromCalled?: boolean },
  result: { data: null as unknown, error: null as unknown },
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: vi.fn((name: string, args: unknown) => {
      captured.rpcName = name
      captured.rpcArgs = args
      return Promise.resolve({ data: result.data, error: result.error })
    }),
    // A `.from()` client read must NEVER be reachable in this service — expose it so a
    // stray call (the dead M1 client-side aggregation) is caught (T-34-05-01).
    from: vi.fn(() => {
      captured.fromCalled = true
      return {}
    }),
  },
}))

import { getFunilKpis, FunilKpisServiceError, type FunilKpis } from '../funilKpisService'

const SAMPLE: FunilKpis = {
  median_time_per_stage: { triagem: 3600 },
  conversion_stage_to_stage: [{ de: 'triagem', para: 'entrevista_online', n: 4 }],
  volume_by_stage: { triagem: 10 },
  time_to_hire: 864000,
  knockout_rate: { knockouts: 2, total: 10, taxa: 0.2 },
  drop_per_stage: { triagem: { dropped: 1, saidas: 5, taxa: 0.2 } },
  no_show_rate: { no_shows: 0, total: 0, taxa: null },
}

describe('funilKpisService — funil_kpis DEFINER RPC read (KPI-02/04)', () => {
  beforeEach(() => {
    captured.rpcName = undefined
    captured.rpcArgs = undefined
    captured.fromCalled = false
    result.data = null
    result.error = null
  })

  it('calls rpc("funil_kpis", { p_vaga_id }) and passes the payload through', async () => {
    result.data = SAMPLE
    const out = await getFunilKpis('vaga-1')
    expect(captured.rpcName).toBe('funil_kpis')
    expect(captured.rpcArgs).toEqual({ p_vaga_id: 'vaga-1' })
    expect(out).toEqual(SAMPLE)
  })

  it('passes p_vaga_id for the all-vagas (null) default, with NO client-side read', async () => {
    result.data = SAMPLE
    await getFunilKpis(null)
    expect(captured.rpcName).toBe('funil_kpis')
    expect('p_vaga_id' in (captured.rpcArgs as Record<string, unknown>)).toBe(true)
    expect(captured.fromCalled).toBe(false)
  })

  it('never touches candidaturas/historico client-side (single RPC data path)', async () => {
    result.data = SAMPLE
    await getFunilKpis('vaga-1')
    expect(captured.fromCalled).toBe(false)
  })

  it('returns the 7 keys with taxa/time as number | null', async () => {
    result.data = SAMPLE
    const out = await getFunilKpis('vaga-1')
    expect(Object.keys(out).sort()).toEqual(
      [
        'conversion_stage_to_stage',
        'drop_per_stage',
        'knockout_rate',
        'median_time_per_stage',
        'no_show_rate',
        'time_to_hire',
        'volume_by_stage',
      ].sort(),
    )
    expect(out.no_show_rate.taxa).toBeNull()
    expect(out.knockout_rate.taxa).toBe(0.2)
  })

  it('maps an RPC error to FunilKpisServiceError', async () => {
    result.error = { message: 'boom', code: 'XX000' }
    await expect(getFunilKpis(null)).rejects.toBeInstanceOf(FunilKpisServiceError)
  })

  it('coerces a null RPC payload to an empty object (no data → empty state upstream)', async () => {
    result.data = null
    const out = await getFunilKpis(null)
    expect(out).toEqual({})
  })
})
