/**
 * Phase 13 / Plan 13-01 Task 3 — candidate-side read guard for `redacoreService`
 * (AVAL-06), UPDATED for SEC-02 (Phase 24, Plan 24-03).
 *
 * The load-bearing assertion is the PII/verdict-leak guard
 * (T-13-01-03 / T-24-03-01, [[reference_select_star_leaks_pii]] / RNF-07a): the
 * candidate MUST NOT be able to read the redação verdict columns (`analise_ia`,
 * scores, color, `red_flag_etico`, `*_revisor`).
 *
 * ── Mechanism change (SEC-02, Phase 24) ──
 * Originally the candidate read was a base-table `.from('redacoes_candidato')
 * .select(<allowlist>)` and this test asserted the `.select()` string. In Phase 24
 * the base-table candidate row policy was DROPPED and the read moved to the
 * `get_minha_redacao` SECURITY DEFINER RPC, which projects the safe columns
 * SERVER-SIDE (RH shares the `authenticated` role, so a column REVOKE was not viable).
 * The client now passes only the candidatura id — there is no client-side column
 * list to inspect. The NETWORK invariant therefore becomes: the candidate reader
 * routes through the RPC and NEVER issues a base-table select of `redacoes_candidato`
 * (which is the only way a verdict column could reach the client).
 *
 * @see src/features/avaliacao/__tests__/redacaoService.rpc.test.ts (companion RPC contract)
 * @see .planning/phases/24-blindagem-de-seguran-a-pii-lgpd/24-03-PLAN.md (SEC-02)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { rpcCalls, fromTables, lastSelect } = vi.hoisted(() => ({
  rpcCalls: { value: [] as Array<{ fn: string; args: unknown }> },
  fromTables: { value: [] as string[] },
  lastSelect: { value: '' },
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect.value = cols
      return q
    })
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
    q.order = vi.fn(() => Promise.resolve({ data: [], error: null }))
    q.then = undefined
    return q
  }
  return {
    supabase: {
      from: vi.fn((table: string) => {
        fromTables.value.push(table)
        return makeQuery()
      }),
      rpc: vi.fn((fn: string, args: unknown) => {
        rpcCalls.value.push({ fn, args })
        return Promise.resolve({ data: [], error: null })
      }),
    },
  }
})

import * as redacaoService from '@/features/avaliacao/services/redacaoService'

// The verdict columns that must NEVER reach a candidate-facing read.
const FORBIDDEN_COLUMNS = [
  'analise_ia',
  'scores_dimensao',
  'score_ponderado_0_100',
  'classificacao_cor',
  'red_flag_etico',
  'flags',
  'scores_humanos',
  'notas_revisor',
  'decisao_revisor',
]

describe('redacaoService — candidate read excludes verdict columns (SEC-02, DEFINER RPC)', () => {
  beforeEach(() => {
    rpcCalls.value = []
    fromTables.value = []
    lastSelect.value = ''
  })

  it('exports a candidate-facing redacoes_candidato reader', () => {
    const reader =
      (redacaoService as Record<string, unknown>).getRedacaoCandidato ??
      (redacaoService as Record<string, unknown>).loadRedacao
    expect(typeof reader).toBe('function')
  })

  it('routes the candidate read through the get_minha_redacao DEFINER RPC (not a base-table select)', async () => {
    const reader = (redacaoService as Record<string, unknown>).getRedacaoCandidato as
      | ((id: string) => Promise<unknown>)
      | undefined
    await reader?.('cand-1')
    // The candidate path is the RPC — the safe projection is enforced server-side.
    expect(rpcCalls.value.map((c) => c.fn)).toContain('get_minha_redacao')
  })

  it('NEVER issues a base-table select of redacoes_candidato (the only client path to a verdict column) (RNF-07a)', async () => {
    const reader = (redacaoService as Record<string, unknown>).getRedacaoCandidato as
      | ((id: string) => Promise<unknown>)
      | undefined
    await reader?.('cand-1')
    // Base-table candidate policy was dropped in Phase 24 — the reader must not touch it.
    expect(fromTables.value).not.toContain('redacoes_candidato')
    // Defense-in-depth: even if a base-table select were ever added, it must not star
    // or name a verdict column.
    expect(lastSelect.value).not.toContain('*')
    for (const col of FORBIDDEN_COLUMNS) {
      expect(lastSelect.value).not.toContain(col)
    }
  })

  it('passes ONLY the candidatura id to the RPC (safe projection is server-side)', async () => {
    const reader = (redacaoService as Record<string, unknown>).getRedacaoCandidato as
      | ((id: string) => Promise<unknown>)
      | undefined
    await reader?.('cand-1')
    const call = rpcCalls.value.find((c) => c.fn === 'get_minha_redacao')
    expect(call?.args).toEqual({ p_candidatura_id: 'cand-1' })
  })
})
