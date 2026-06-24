/**
 * Phase 13 / Plan 13-05 Task 1 — TDD test for `revisaoRedacaoService.ts`
 * (AVAL-07 — the RH human-review queue read + the salvar_revisao_redacao RPC write).
 *
 * The assertions encode the load-bearing contracts (D-13):
 *  - `listRedacoesRevisao(vagaId)` reads `redacoes_candidato` via the EXPLICIT
 *    `REDACAO_ALLOWLIST` — NEVER `select('*')` ([[reference_select_star_leaks_pii]]).
 *  - `salvarRevisao(redacaoId, {...})` calls `supabase.rpc('salvar_revisao_redacao', …)`
 *    — NEVER a direct UPDATE; maps insufficient_privilege → FORBIDDEN, notas<50 →
 *    INVALID_INPUT, transport → NETWORK_ERROR.
 *  - `getDuvidasGestor(vagaId?)` filters `decisao_revisor='duvida'` (gestor escalation).
 *
 * @see src/features/avaliacao/services/scoresRhService.ts (allowlist idiom)
 * @see src/features/triagem/services/triagemService.ts (RPC write + error map)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-05-PLAN.md (Task 1)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the supabase client BEFORE importing the service ──────────────────
// Capture the select() string, the .eq()/.order() calls, and the rpc() call so we
// can assert the allowlist projection + the RPC write contract without a network
// round-trip. `vi.hoisted` keeps the captures available to the hoisted vi.mock factory.
const { lastSelect, eqArgs, rpcMock, queryResult } = vi.hoisted(() => ({
  lastSelect: { value: '' },
  eqArgs: [] as Array<{ col: string; val: unknown }>,
  rpcMock: vi.fn(),
  queryResult: { value: { data: [] as unknown[], error: null as unknown } },
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect.value = cols
      return q
    })
    q.eq = vi.fn((col: string, val: unknown) => {
      eqArgs.push({ col, val })
      return q
    })
    q.is = vi.fn(() => q)
    q.order = vi.fn(() => q)
    q.limit = vi.fn(() => q)
    // Terminal: resolve like PostgREST when awaited.
    q.then = (resolve: (v: unknown) => unknown) => resolve(queryResult.value)
    return q
  }
  return {
    supabase: {
      from: vi.fn(() => makeQuery()),
      rpc: rpcMock,
    },
  }
})

import {
  listRedacoesRevisao,
  getDuvidasGestor,
  salvarRevisao,
  REDACAO_ALLOWLIST,
  RevisaoRedacaoServiceError,
} from '../revisaoRedacaoService'

describe('revisaoRedacaoService — RH read (allowlist projection)', () => {
  beforeEach(() => {
    lastSelect.value = ''
    eqArgs.length = 0
    rpcMock.mockReset()
    queryResult.value = { data: [], error: null }
  })

  it('REDACAO_ALLOWLIST names columns explicitly and never contains `*`', () => {
    expect(REDACAO_ALLOWLIST).not.toContain('*')
    expect(REDACAO_ALLOWLIST).toContain('scores_dimensao')
    expect(REDACAO_ALLOWLIST).toContain('classificacao_cor')
    expect(REDACAO_ALLOWLIST).toContain('decisao_revisor')
    expect(REDACAO_ALLOWLIST).toContain('notas_revisor')
  })

  it('listRedacoesRevisao select() projection contains NO `*`', async () => {
    await listRedacoesRevisao('vaga-1')
    expect(lastSelect.value).not.toContain('*')
    expect(lastSelect.value.length).toBeGreaterThan(0)
  })

  it('listRedacoesRevisao filters by the vaga (joined candidatura)', async () => {
    await listRedacoesRevisao('vaga-1')
    expect(eqArgs.some((e) => e.val === 'vaga-1')).toBe(true)
  })

  it('getDuvidasGestor filters decisao_revisor = duvida', async () => {
    await getDuvidasGestor('vaga-1')
    expect(eqArgs.some((e) => e.col === 'decisao_revisor' && e.val === 'duvida')).toBe(true)
  })
})

describe('revisaoRedacaoService — salvarRevisao (RPC write, never direct UPDATE)', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('calls supabase.rpc("salvar_revisao_redacao", …) with the mapped params', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null })
    await salvarRevisao('red-1', {
      decisao: 'aprovado',
      notas: 'x'.repeat(50),
      scores_humanos: { D1: 4, D2: 4, D3: 4, D4: 4 },
    })
    expect(rpcMock).toHaveBeenCalledWith(
      'salvar_revisao_redacao',
      expect.objectContaining({
        p_redacao_id: 'red-1',
        p_decisao: 'aprovado',
        p_notas: 'x'.repeat(50),
        p_scores_humanos: { D1: 4, D2: 4, D3: 4, D4: 4 },
      }),
    )
  })

  it('maps insufficient_privilege → FORBIDDEN', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'forbidden' },
    })
    await expect(
      salvarRevisao('red-1', { decisao: 'reprovado', notas: 'y'.repeat(50), scores_humanos: {} }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('maps notas<50 (check_violation) → INVALID_INPUT', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '23514', message: 'notas_revisor exige no minimo 50 caracteres' },
    })
    await expect(
      salvarRevisao('red-1', { decisao: 'aprovado', notas: 'short', scores_humanos: {} }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('rejects locally when notas < 50 chars (client-side gate) before hitting the RPC', async () => {
    await expect(
      salvarRevisao('red-1', { decisao: 'aprovado', notas: 'too short', scores_humanos: {} }),
    ).rejects.toBeInstanceOf(RevisaoRedacaoServiceError)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('maps a transport error → NETWORK_ERROR', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: 'PGRST500', message: 'network down' },
    })
    await expect(
      salvarRevisao('red-1', { decisao: 'duvida', notas: 'z'.repeat(50), scores_humanos: {} }),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
})
