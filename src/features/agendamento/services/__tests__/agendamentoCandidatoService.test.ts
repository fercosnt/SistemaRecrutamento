/**
 * Phase 35 / Plan 35-01 Task 2 — AGEND-04 / SEG-03 consumer-discipline guard.
 *
 * Locks the client half of SEG-03: the candidate own-row read of
 * `agendamentos_entrevista` must go through the `get_meu_agendamento` SECURITY DEFINER
 * RPC — NEVER the base table (no candidate SELECT policy exists → a `.from(...)` read
 * returns 0 rows) — and the projected row must NEVER carry an RH-internal column
 * (observacoes_rh, entrevistador, agendado_por, updated_by, vaga_id). We assert the
 * network CALL + the returned shape, not the JSX ([[reference_select_star_leaks_pii]],
 * T-35-01).
 *
 * @see supabase/migrations/20260716000001_agendamentos_entrevista.sql (the DEFINER RPC)
 * @see src/features/avaliacao/__tests__/redacaoService.rpc.test.ts (the sibling SEC harness)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture every rpc()/from() call so we can assert the candidate read uses the RPC and
// never the base table. `rpcResult` is mutable so each test drives a different return.
const { rpcCalls, fromTables, rpcResult } = vi.hoisted(() => ({
  rpcCalls: [] as Array<{ fn: string; args: unknown }>,
  fromTables: [] as string[],
  rpcResult: {
    current: { data: null as unknown, error: null as { message: string } | null },
  },
}))

// The single safe row the RPC returns — the 7-col allowlist ONLY. If any RH-internal
// key leaks into the client shape, the assertions below fail.
const SAFE_ROW = {
  id: 'ag-1',
  candidatura_id: '11111111-1111-4111-8111-111111111111',
  tipo: 'online',
  data_hora: '2026-07-20T17:30:00Z',
  local_ou_link: 'https://meet.example/abc',
  status: 'agendada',
  compareceu: null,
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: vi.fn((fn: string, args: unknown) => {
      rpcCalls.push({ fn, args })
      return Promise.resolve(rpcResult.current)
    }),
    // The candidate own-row read must NOT touch the base table. If it does, fromTables
    // records it and the guard test fails.
    from: vi.fn((table: string) => {
      fromTables.push(table)
      const q: Record<string, unknown> = {}
      q.select = vi.fn(() => q)
      q.eq = vi.fn(() => q)
      q.is = vi.fn(() => q)
      q.order = vi.fn(() => q)
      q.limit = vi.fn(() => Promise.resolve({ data: [], error: null }))
      return q
    }),
  },
}))

import {
  getMeuAgendamento,
  MeuAgendamentoServiceError,
} from '@/features/agendamento/services/agendamentoCandidatoService'

const RH_INTERNAL_KEYS = [
  'observacoes_rh',
  'entrevistador',
  'agendado_por',
  'updated_by',
  'vaga_id',
] as const

const CANDIDATURA_ID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  rpcCalls.length = 0
  fromTables.length = 0
  rpcResult.current = { data: [SAFE_ROW], error: null }
})

describe('agendamentoCandidatoService — SEG-03 candidate read goes through get_meu_agendamento', () => {
  it('getMeuAgendamento calls .rpc(get_meu_agendamento) with the candidatura id and never the base table', async () => {
    const row = await getMeuAgendamento(CANDIDATURA_ID)

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].fn).toBe('get_meu_agendamento')
    expect(rpcCalls[0].args).toEqual({ p_candidatura_id: CANDIDATURA_ID })
    // No base-table read of agendamentos_entrevista for the candidate own-row path.
    expect(fromTables).not.toContain('agendamentos_entrevista')
    expect(row).not.toBeNull()
  })

  it('projects a row that carries none of the RH-internal columns', async () => {
    const row = await getMeuAgendamento(CANDIDATURA_ID)
    expect(row).not.toBeNull()
    for (const k of RH_INTERNAL_KEYS) {
      expect(row).not.toHaveProperty(k)
    }
  })

  it('returns the newest row (rows[0], the RPC already ORDER BY data_hora DESC)', async () => {
    const rowA = { ...SAFE_ROW, id: 'newest' }
    const rowB = { ...SAFE_ROW, id: 'older' }
    rpcResult.current = { data: [rowA, rowB], error: null }

    const row = await getMeuAgendamento(CANDIDATURA_ID)
    expect(row?.id).toBe('newest')
  })

  it('returns null when the RPC returns no rows', async () => {
    rpcResult.current = { data: [], error: null }
    const row = await getMeuAgendamento(CANDIDATURA_ID)
    expect(row).toBeNull()
  })

  it('throws MeuAgendamentoServiceError INVALID_INPUT for an empty candidatura id', async () => {
    await expect(getMeuAgendamento('')).rejects.toMatchObject({
      name: 'MeuAgendamentoServiceError',
      code: 'INVALID_INPUT',
    })
    // no network call fired
    expect(rpcCalls).toHaveLength(0)
  })

  it('throws MeuAgendamentoServiceError DATABASE_ERROR when the RPC errors', async () => {
    rpcResult.current = { data: null, error: { message: 'boom' } }
    await expect(getMeuAgendamento(CANDIDATURA_ID)).rejects.toBeInstanceOf(
      MeuAgendamentoServiceError,
    )
    await expect(getMeuAgendamento(CANDIDATURA_ID)).rejects.toMatchObject({
      code: 'DATABASE_ERROR',
    })
  })
})
