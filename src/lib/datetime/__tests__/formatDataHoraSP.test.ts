/**
 * Phase 35 / Plan 35-01 Task 1 — AGEND-04 shared timezone formatter.
 *
 * `formatDataHoraSP` renders an ISO `timestamptz` as `dd/mm/aaaa às hh:mm` pinned to
 * America/Sao_Paulo (NOT the browser's local zone — a candidate traveling must still
 * see Brasília time). Extracted verbatim from EntrevistaDashboard.tsx:44-73 so both the
 * RH dashboard and the (Plan 35-02) candidate card consume one implementation.
 *
 * We assert the SP-pinned offset (UTC-3), the engine midnight-'24'→'00' edge via the
 * `saoPauloParts` seam, and null in / null out — deterministic, no mocks.
 *
 * @see src/lib/datetime/formatDataHoraSP.ts (the extracted util)
 * @see src/features/entrevista/components/EntrevistaDashboard.tsx (the extraction source)
 */
import { describe, it, expect } from 'vitest'
import { formatDataHoraSP, saoPauloParts } from '../formatDataHoraSP'

describe('formatDataHoraSP — America/Sao_Paulo pinned dd/mm/aaaa às hh:mm', () => {
  it('formats a known UTC instant at the São Paulo offset (UTC-3), not browser-local', () => {
    // 2026-07-20T17:30:00Z − 3h = 14:30 in America/Sao_Paulo (no DST in Brazil since 2019)
    expect(formatDataHoraSP('2026-07-20T17:30:00Z')).toBe('20/07/2026 às 14:30')
  })

  it('normalizes the midnight engine edge — hh is "00", never "24"', () => {
    // 2026-07-20T03:00:00Z is exactly midnight in São Paulo (UTC-3).
    const parts = saoPauloParts('2026-07-20T03:00:00Z')
    expect(parts).not.toBeNull()
    expect(parts!.hh).toBe('00')
    expect(parts!.dd).toBe('20')
    expect(formatDataHoraSP('2026-07-20T03:00:00Z')).toBe('20/07/2026 às 00:00')
  })

  it('returns null for null input', () => {
    expect(formatDataHoraSP(null)).toBeNull()
  })

  it('returns null for an unparseable date (Number.isNaN guard)', () => {
    expect(formatDataHoraSP('not-a-date')).toBeNull()
    expect(saoPauloParts('not-a-date')).toBeNull()
  })
})
