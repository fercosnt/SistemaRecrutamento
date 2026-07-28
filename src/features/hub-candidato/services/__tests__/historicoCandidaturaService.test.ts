/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-02 Task 2 — RED→GREEN for `historicoCandidaturaService.ts`
 * (VISRH-03 — the RH read-only history feed of `historico_candidatura`).
 *
 * Load-bearing assertions: (1) the PII-leak guard — the read names its columns
 * explicitly (etapa_de, etapa_para, ator, criterio_texto, criado_em) and NEVER uses
 * a star projection ([[reference_select_star_leaks_pii]]); (2) newest-first ordering
 * (criado_em DESC). RLS `rh_le_historico` (WR-04, P32) is row-level only.
 *
 * @see src/features/avaliacao/services/__tests__/scoresRhService.test.ts (mock idiom cloned)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { lastSelect, eqArgs, orderArgs, result } = vi.hoisted(() => ({
  lastSelect: { value: '' },
  eqArgs: {} as { col?: string; val?: unknown },
  orderArgs: {} as { col?: string; opts?: { ascending?: boolean } },
  result: { data: [] as unknown, error: null as unknown },
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect.value = cols
      return q
    })
    q.eq = vi.fn((col: string, val: unknown) => {
      eqArgs.col = col
      eqArgs.val = val
      return q
    })
    q.order = vi.fn((col: string, opts: { ascending?: boolean }) => {
      orderArgs.col = col
      orderArgs.opts = opts
      return q
    })
    q.limit = vi.fn(() => Promise.resolve({ data: result.data, error: result.error }))
    return q
  }
  return {
    supabase: {
      from: vi.fn(() => makeQuery()),
    },
  }
})

import { listHistorico, HISTORICO_ALLOWLIST } from '../historicoCandidaturaService'

const ALLOWLIST_COLS = ['etapa_de', 'etapa_para', 'ator', 'criterio_texto', 'criado_em']

describe('historicoCandidaturaService — allowlist read of historico_candidatura (VISRH-03)', () => {
  beforeEach(() => {
    lastSelect.value = ''
    eqArgs.col = undefined
    eqArgs.val = undefined
    orderArgs.col = undefined
    orderArgs.opts = undefined
    result.data = []
    result.error = null
  })

  it('select() projection NEVER contains `*` (PII-leak guard)', async () => {
    await listHistorico('cand-1')
    expect(lastSelect.value).not.toContain('*')
  })

  it('select() projection contains EVERY allowlisted column explicitly', async () => {
    await listHistorico('cand-1')
    for (const col of ALLOWLIST_COLS) {
      expect(lastSelect.value).toContain(col)
    }
  })

  it('the exported HISTORICO_ALLOWLIST const is star-free and names the 5 columns', () => {
    expect(HISTORICO_ALLOWLIST).not.toContain('*')
    for (const col of ALLOWLIST_COLS) {
      expect(HISTORICO_ALLOWLIST).toContain(col)
    }
  })

  it('orders by criado_em DESCending (newest-first)', async () => {
    await listHistorico('cand-1')
    expect(orderArgs.col).toBe('criado_em')
    expect(orderArgs.opts).toMatchObject({ ascending: false })
  })

  it('filters by candidatura_id', async () => {
    await listHistorico('cand-9')
    expect(eqArgs.col).toBe('candidatura_id')
    expect(eqArgs.val).toBe('cand-9')
  })

  it('returns the rows array from the query', async () => {
    result.data = [
      { etapa_de: 'triagem', etapa_para: 'avaliacao_assincrona', ator: 'u1', criterio_texto: 'ok', criado_em: '2026-07-16T10:00:00Z' },
    ]
    const rows = await listHistorico('cand-1')
    expect(rows).toHaveLength(1)
    expect(rows[0].etapa_para).toBe('avaliacao_assincrona')
  })

  it('throws on empty candidaturaId', async () => {
    await expect(listHistorico('')).rejects.toThrow()
  })
})
