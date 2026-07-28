/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-03 Task 1 — RED→GREEN for `agendamentoService.ts` (AGEND-02/03).
 *
 * Load-bearing anti-tamper contract (T-34-03-01, Pitfall 4): every write payload the
 * service builds carries ONLY the client-writable columns. The four trigger-stamped
 * scope/audit columns MUST NEVER appear on an insert/update body — the P33 BEFORE
 * trigger stamps them, and a spoofed scope column is a tampering vector. The PII guard
 * (T-34-03-02): reads name their columns via the allowlist, never a star projection.
 * The repudiation guard (T-34-03-03): cancelar is an UPDATE to status='cancelada' —
 * never a delete — so the candidate keeps seeing the cancellation.
 *
 * @see src/features/hub-candidato/services/__tests__/analiseCandidatoService.test.ts (mock idiom cloned)
 * @see supabase/migrations/20260716000001_agendamentos_entrevista.sql (table + trigger)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Capture the select() projection + the insert/update bodies + the eq() filter, and
// surface a configurable resolved result. The mock query object is a THENABLE so an
// `await supabase.from(...).<chain>` resolves at ANY chain depth (read or write).
const { captured, result } = vi.hoisted(() => ({
  captured: {} as {
    select?: string
    insert?: Record<string, unknown>
    update?: Record<string, unknown>
    eqCol?: string
    eqVal?: unknown
    deleteCalled?: boolean
  },
  result: { data: null as unknown, error: null as unknown },
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      captured.select = cols
      return q
    })
    q.insert = vi.fn((body: Record<string, unknown>) => {
      captured.insert = body
      return q
    })
    q.update = vi.fn((patch: Record<string, unknown>) => {
      captured.update = patch
      return q
    })
    // A `.delete()` must NEVER be reachable in this service — expose it so a stray
    // call would be caught, but the service must not invoke it (T-34-03-03).
    q.delete = vi.fn(() => {
      captured.deleteCalled = true
      return q
    })
    q.eq = vi.fn((col: string, val: unknown) => {
      captured.eqCol = col
      captured.eqVal = val
      return q
    })
    q.is = vi.fn(() => q)
    q.order = vi.fn(() => q)
    q.limit = vi.fn(() => q)
    q.then = (onF: (v: unknown) => unknown) =>
      Promise.resolve({ data: result.data, error: result.error }).then(onF)
    return q
  }
  return { supabase: { from: vi.fn(() => makeQuery()) } }
})

import {
  agendar,
  reagendar,
  cancelar,
  setCompareceu,
  getAgendamento,
  AGENDAMENTO_ALLOWLIST,
} from '../agendamentoService'
import { agendamentoSchema } from '../../schemas/agendamentoSchema'

/** The four trigger-stamped columns that must NEVER reach a write payload. */
const FORBIDDEN_KEYS = ['vaga_id', 'agendado_por', 'updated_by', 'updated_at']
const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()

describe('agendamentoService — direct agendamentos_entrevista writes (AGEND-02/03)', () => {
  beforeEach(() => {
    captured.select = undefined
    captured.insert = undefined
    captured.update = undefined
    captured.eqCol = undefined
    captured.eqVal = undefined
    captured.deleteCalled = false
    result.data = null
    result.error = null
  })

  it('agendar → insert body carries NONE of the trigger-stamped columns (T-34-03-01)', async () => {
    await agendar('cand-1', { tipo: 'online', data_hora: FUTURE, local_ou_link: 'https://meet' })
    expect(captured.insert).toBeDefined()
    for (const k of FORBIDDEN_KEYS) {
      expect(Object.keys(captured.insert!)).not.toContain(k)
    }
  })

  it('agendar → insert body carries the real client-writable columns + status agendada', async () => {
    await agendar('cand-9', { tipo: 'presencial', data_hora: FUTURE, local_ou_link: 'Sala 2' })
    expect(captured.insert).toMatchObject({
      candidatura_id: 'cand-9',
      tipo: 'presencial',
      data_hora: FUTURE,
      status: 'agendada',
      local_ou_link: 'Sala 2',
    })
  })

  it('reagendar → update sets status reagendada and NO trigger-stamped columns', async () => {
    await reagendar('ag-1', { data_hora: FUTURE })
    expect(captured.update).toMatchObject({ status: 'reagendada' })
    for (const k of FORBIDDEN_KEYS) {
      expect(Object.keys(captured.update!)).not.toContain(k)
    }
    expect(captured.eqCol).toBe('id')
    expect(captured.eqVal).toBe('ag-1')
  })

  it('cancelar → update status cancelada (row kept — never a delete) (T-34-03-03)', async () => {
    await cancelar('ag-7')
    expect(captured.update).toEqual({ status: 'cancelada' })
    expect(captured.deleteCalled).toBe(false)
    expect(captured.eqVal).toBe('ag-7')
  })

  it('setCompareceu → update compareceu to true/false/null', async () => {
    await setCompareceu('ag-3', true)
    expect(captured.update).toEqual({ compareceu: true })
    await setCompareceu('ag-3', false)
    expect(captured.update).toEqual({ compareceu: false })
    await setCompareceu('ag-3', null)
    expect(captured.update).toEqual({ compareceu: null })
  })

  it('getAgendamento → allowlist projection, NEVER a star (T-34-03-02)', async () => {
    result.data = []
    await getAgendamento('cand-1')
    expect(captured.select).toBeDefined()
    expect(captured.select).not.toContain('*')
    for (const col of ['candidatura_id', 'tipo', 'data_hora', 'status', 'observacoes_rh', 'compareceu']) {
      expect(captured.select).toContain(col)
    }
  })

  it('the exported AGENDAMENTO_ALLOWLIST const is star-free', () => {
    expect(AGENDAMENTO_ALLOWLIST).not.toContain('*')
  })

  it('getAgendamento returns the newest row (or null) filtered by candidatura_id', async () => {
    result.data = [
      { id: 'ag-1', candidatura_id: 'cand-1', tipo: 'online', data_hora: FUTURE, status: 'agendada', compareceu: null },
    ]
    const row = await getAgendamento('cand-1')
    expect(row?.id).toBe('ag-1')
    expect(captured.eqCol).toBe('candidatura_id')
    result.data = []
    expect(await getAgendamento('cand-1')).toBeNull()
  })

  it('throws on an empty candidaturaId', async () => {
    await expect(getAgendamento('')).rejects.toThrow()
  })
})

describe('agendamentoSchema (zod) — future data_hora + tipo enum', () => {
  it('rejects a past data_hora', () => {
    const past = new Date(Date.now() - 3600 * 1000).toISOString()
    expect(agendamentoSchema.safeParse({ tipo: 'online', data_hora: past }).success).toBe(false)
  })

  it('accepts a future data_hora with a valid tipo', () => {
    expect(agendamentoSchema.safeParse({ tipo: 'online', data_hora: FUTURE }).success).toBe(true)
  })

  it('rejects an invalid tipo', () => {
    expect(agendamentoSchema.safeParse({ tipo: 'telefone', data_hora: FUTURE }).success).toBe(false)
  })
})
