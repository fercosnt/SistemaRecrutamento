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
  gerarIcsAgendamento,
  ehUpcomingNaoCancelada,
  estaDentroDe24h,
  MeuAgendamentoServiceError,
  type MeuAgendamentoRow,
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

// ─────────────────────────────────────────────────────────────────────────────
// Plan 35-02 Task 1 — the hand-rolled .ics builder (AGEND-05) + the upcoming/≤24h
// pure predicates. All deterministic (fixed `now` injected), no network, no DOM.
// ─────────────────────────────────────────────────────────────────────────────

/** A minimal MeuAgendamentoRow factory for the .ics builder tests. */
function makeRow(over: Partial<MeuAgendamentoRow> = {}): MeuAgendamentoRow {
  return {
    id: 'abc',
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    tipo: 'presencial',
    data_hora: '2026-07-20T17:30:00Z',
    local_ou_link: 'Av. Paulista, 1000',
    status: 'agendada',
    compareceu: null,
    ...over,
  }
}

describe('gerarIcsAgendamento — RFC 5545 VCALENDAR/VEVENT (AGEND-05)', () => {
  it('emits a valid VCALENDAR/VEVENT with UTC DTSTART, +1h DTEND, generic SUMMARY, UID and DTSTAMP', () => {
    const ics = gerarIcsAgendamento(makeRow())
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    // 2026-07-20T17:30:00Z → basic UTC form 20260720T173000Z
    expect(ics).toContain('DTSTART:20260720T173000Z')
    // DTEND = DTSTART + 1h
    expect(ics).toContain('DTEND:20260720T183000Z')
    // SUMMARY is the GENERIC constant — never a vaga/candidate field
    expect(ics).toContain('SUMMARY:Entrevista Beauty Smile')
    expect(ics).toContain('UID:abc@')
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/)
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('joins lines with CRLF (\\r\\n) — Outlook rejects bare LF', () => {
    const ics = gerarIcsAgendamento(makeRow())
    expect(ics.includes('\r\n')).toBe(true)
  })

  it('escapes a comma in LOCATION per RFC 5545 §3.3.11', () => {
    const ics = gerarIcsAgendamento(makeRow({ local_ou_link: 'Av. Paulista, 1000' }))
    expect(ics).toContain('LOCATION:Av. Paulista\\, 1000')
  })

  it('emits NO LOCATION line when local_ou_link is null', () => {
    const ics = gerarIcsAgendamento(makeRow({ local_ou_link: null }))
    expect(ics).not.toContain('LOCATION:')
  })

  it('SUMMARY carries no vaga/candidate interpolation — the generic constant only', () => {
    const ics = gerarIcsAgendamento(
      makeRow({ local_ou_link: 'Vaga Secreta XYZ' }),
    )
    // the summary line is exactly the generic label
    const summaryLine = ics.split('\r\n').find((l) => l.startsWith('SUMMARY:'))
    expect(summaryLine).toBe('SUMMARY:Entrevista Beauty Smile')
  })

  it('folds a LOCATION longer than 75 octets per RFC 5545 §3.1 (WR-02): every physical line ≤75 octets, continuations start with a space, value round-trips', () => {
    const longUrl =
      'https://meet.example.com/rooms/entrevista-beauty-smile/av-paulista-1000-conjunto-1234-sala-de-reuniao-principal'
    const ics = gerarIcsAgendamento(
      makeRow({ tipo: 'online', local_ou_link: longUrl }),
    )
    const encoder = new TextEncoder()
    const physicalLines = ics.split('\r\n')

    // (1) the unfolded input WAS long enough to require folding
    expect(encoder.encode(`LOCATION:${longUrl}`).length).toBeGreaterThan(75)
    // (2) NO physical line exceeds the 75-octet limit
    for (const line of physicalLines) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
    }
    // (3) the LOCATION was actually split across ≥2 physical lines whose continuations
    //     begin with the mandatory single leading space
    const continuations = physicalLines.filter((l) => l.startsWith(' '))
    expect(continuations.length).toBeGreaterThan(0)
    // (4) unfolding (strip CRLF + one leading space) reconstructs the original value
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain(`LOCATION:${longUrl}`)
  })

  it('short content lines are NOT folded (no spurious continuation lines)', () => {
    const ics = gerarIcsAgendamento(makeRow({ local_ou_link: 'Av. Paulista, 1000' }))
    // none of these short lines should have gained a CRLF+space continuation
    expect(ics).toContain('DTSTART:20260720T173000Z')
    expect(ics).toContain('SUMMARY:Entrevista Beauty Smile')
    expect(ics).toContain('LOCATION:Av. Paulista\\, 1000')
    expect(ics).not.toContain('\r\n ') // no fold markers for the short fixture
  })

  it('throws INVALID_INPUT for an unparseable data_hora instead of an opaque RangeError (IN-03)', () => {
    expect(() => gerarIcsAgendamento(makeRow({ data_hora: 'not-a-date' }))).toThrow(
      MeuAgendamentoServiceError,
    )
    expect(() => gerarIcsAgendamento(makeRow({ data_hora: '' }))).toThrow(
      /data_hora inválida/,
    )
  })
})

describe('ehUpcomingNaoCancelada — future AND non-cancelled gate (AGEND-05)', () => {
  const now = new Date('2026-07-19T12:00:00Z')
  const future = '2026-07-20T12:00:00Z'
  const past = '2026-07-18T12:00:00Z'

  it('future + agendada → true', () => {
    expect(ehUpcomingNaoCancelada(future, 'agendada', now)).toBe(true)
  })
  it('past + agendada → false', () => {
    expect(ehUpcomingNaoCancelada(past, 'agendada', now)).toBe(false)
  })
  it('future + cancelada → false', () => {
    expect(ehUpcomingNaoCancelada(future, 'cancelada', now)).toBe(false)
  })
  it('invalid ISO → false (Number.isNaN guard)', () => {
    expect(ehUpcomingNaoCancelada('not-a-date', 'agendada', now)).toBe(false)
  })
})

describe('estaDentroDe24h — 0 < (data_hora − now) ≤ 24h boundary (AGEND-05)', () => {
  const now = new Date('2026-07-19T12:00:00Z')
  const H = 60 * 60 * 1000

  it('exactly +24h00m00s → true (inclusive)', () => {
    const iso = new Date(now.getTime() + 24 * H).toISOString()
    expect(estaDentroDe24h(iso, now)).toBe(true)
  })
  it('+24h00m01s → false (over the boundary)', () => {
    const iso = new Date(now.getTime() + 24 * H + 1000).toISOString()
    expect(estaDentroDe24h(iso, now)).toBe(false)
  })
  it('+23h59m → true', () => {
    const iso = new Date(now.getTime() + 23 * H + 59 * 60 * 1000).toISOString()
    expect(estaDentroDe24h(iso, now)).toBe(true)
  })
  it('now (0 diff) → false', () => {
    expect(estaDentroDe24h(now.toISOString(), now)).toBe(false)
  })
  it('past → false', () => {
    const iso = new Date(now.getTime() - H).toISOString()
    expect(estaDentroDe24h(iso, now)).toBe(false)
  })
})
