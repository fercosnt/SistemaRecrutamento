/**
 * Phase 24 / Plan 24-03 Task 3 — SEC-02 projection guard for redacaoService.
 *
 * Locks the client half of SEC-02: the candidate own-row read of `redacoes_candidato`
 * must go through the `get_minha_redacao` SECURITY DEFINER RPC — NOT the base table
 * (whose candidate row policy was DROPPED in 20260706110003_sec02_redacao_verdict.sql)
 * — and the candidate projection must NEVER carry a verdict column (analise_ia,
 * scores_dimensao, score_ponderado_0_100, classificacao_cor, red_flag_etico, flags,
 * scores_humanos, notas_revisor, decisao_revisor). We assert the network CALL + the
 * returned shape, not the JSX ([[reference_select_star_leaks_pii]], T-24-03-01).
 *
 * @see supabase/migrations/20260706110003_sec02_redacao_verdict.sql (DROP row policy + RPC)
 * @see src/features/avaliacao/__tests__/avaliacaoService.rubric.test.ts (the sibling SEC guard idiom)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture every rpc()/from() call so we can assert the candidate read uses the RPC
// and never the base table.
const { rpcCalls, fromTables } = vi.hoisted(() => ({
  rpcCalls: [] as Array<{ fn: string; args: unknown }>,
  fromTables: [] as string[],
}))

// The single safe row the RPC returns (verdict-free — matches MinhaRedacaoRow + the
// RPC's coarsened status_analise). If any verdict key leaks into the client, the
// assertions below fail.
const SAFE_ROW = {
  id: 'r1',
  pergunta_id: 'p1',
  ordem: 1,
  texto: 'Uma vez precisei tomar uma decisão difícil...',
  word_count: 250,
  submetida_em: '2026-07-07T00:00:00Z',
  status_analise: 'em_analise',
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: vi.fn((fn: string, args: unknown) => {
      rpcCalls.push({ fn, args })
      return Promise.resolve({ data: [SAFE_ROW], error: null })
    }),
    // The candidate own-row read must NOT touch the base table anymore. If it does,
    // fromTables records it and the guard test fails.
    from: vi.fn((table: string) => {
      fromTables.push(table)
      const q: Record<string, unknown> = {}
      q.select = vi.fn(() => q)
      q.eq = vi.fn(() => q)
      q.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
      q.order = vi.fn(() => Promise.resolve({ data: [], error: null }))
      return q
    }),
  },
}))

import {
  getRedacaoCandidato,
  getMinhasRedacoes,
  REDACAO_CANDIDATO_ALLOWLIST,
} from '@/features/avaliacao/services/redacaoService'

const VERDICT_KEYS = [
  'analise_ia',
  'scores_dimensao',
  'score_ponderado_0_100',
  'classificacao_cor',
  'red_flag_etico',
  'flags',
  'scores_humanos',
  'notas_revisor',
  'decisao_revisor',
  'bloqueio_avanco',
] as const

const CANDIDATURA_ID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  rpcCalls.length = 0
  fromTables.length = 0
})

describe('redacaoService — SEC-02 candidate own-row read goes through get_minha_redacao', () => {
  it('getRedacaoCandidato calls .rpc(get_minha_redacao) with the candidatura id and never the base table', async () => {
    const row = await getRedacaoCandidato(CANDIDATURA_ID)

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].fn).toBe('get_minha_redacao')
    expect(rpcCalls[0].args).toEqual({ p_candidatura_id: CANDIDATURA_ID })
    // No base-table read of redacoes_candidato for the candidate own-row path.
    expect(fromTables).not.toContain('redacoes_candidato')
    // The returned row carries none of the verdict columns.
    expect(row).not.toBeNull()
    for (const k of VERDICT_KEYS) {
      expect(row).not.toHaveProperty(k)
    }
  })

  it('getMinhasRedacoes calls .rpc(get_minha_redacao) and maps only verdict-free rows', async () => {
    const rows = await getMinhasRedacoes(CANDIDATURA_ID)

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].fn).toBe('get_minha_redacao')
    expect(rpcCalls[0].args).toEqual({ p_candidatura_id: CANDIDATURA_ID })
    expect(fromTables).not.toContain('redacoes_candidato')
    expect(rows).toHaveLength(1)
    for (const k of VERDICT_KEYS) {
      expect(rows[0]).not.toHaveProperty(k)
    }
  })

  it('REDACAO_CANDIDATO_ALLOWLIST (defense-in-depth anchor) names no verdict column', () => {
    for (const k of VERDICT_KEYS) {
      expect(REDACAO_CANDIDATO_ALLOWLIST).not.toContain(k)
    }
    // and never a star projection
    expect(REDACAO_CANDIDATO_ALLOWLIST).not.toContain('*')
  })
})
