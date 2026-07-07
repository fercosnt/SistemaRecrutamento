/**
 * Phase 24 / Plan 24-02 Task 3 — SEC-01 projection guard for cognitivoService.
 *
 * Locks the client half of SEC-01: the candidate lists the cognitive items through
 * the `get_cognitivo_itens` SECURITY DEFINER RPC (which projects only the safe
 * columns server-side), and NEVER touches the `cognitivo_itens` base table — so no
 * `?select=gabarito_idx` surface remains on the client after the base-table row
 * policy was dropped + `gabarito_idx` column-REVOKE'd. Tests the network projection,
 * not the JSX ([[reference_select_star_leaks_pii]]).
 *
 * @see supabase/migrations/20260706110001_sec01_cognitivo_gabarito.sql (the RPC + REVOKE)
 * @see src/features/avaliacao-cognitiva/__tests__/prova-cognitiva.test.tsx (the second guard)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture from(table) calls, the rpc name(s), and any select() projection so we can
// assert the candidate never reads the base table (only the DEFINER RPC).
const { fromMock, rpcMock, rpcCalls, lastSelect } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  rpcCalls: { fns: [] as string[] },
  lastSelect: { value: '' },
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect.value = cols
      return q
    })
    q.order = vi.fn(() => q)
    q.limit = vi.fn(() => q)
    q.eq = vi.fn(() => q)
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
    q.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null })
    return q
  }
  return {
    supabase: {
      from: vi.fn((table: string) => {
        fromMock(table)
        return makeQuery()
      }),
      rpc: vi.fn((fn: string, params?: unknown) => {
        rpcCalls.fns.push(fn)
        return rpcMock(fn, params)
      }),
    },
  }
})

import { listItens } from '../services/cognitivoService'

beforeEach(() => {
  fromMock.mockClear()
  rpcMock.mockReset()
  rpcCalls.fns = []
  lastSelect.value = ''
})

describe('cognitivoService.listItens — SEC-01 RPC rewire (no base-table gabarito read)', () => {
  it('reads the items via the get_cognitivo_itens SECURITY DEFINER RPC', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })
    await listItens()
    expect(rpcCalls.fns).toContain('get_cognitivo_itens')
  })

  it('never touches the cognitivo_itens base table (no `?select=gabarito_idx` surface)', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })
    await listItens()
    expect(fromMock).not.toHaveBeenCalledWith('cognitivo_itens')
    // No base-table select() projection was issued at all.
    expect(lastSelect.value).toBe('')
  })

  it('normalizes the RPC rows to the candidate item shape without a gabarito field', async () => {
    rpcMock.mockResolvedValue({
      data: [
        { id: 'i1', secao: 'matriz', enunciado: 'E?', alternativas: ['a', 'b'], ordem: 1 },
      ],
      error: null,
    })
    const itens = await listItens()
    expect(itens[0].alternativas).toEqual(['a', 'b'])
    expect(itens[0]).not.toHaveProperty('gabarito_idx')
  })
})
