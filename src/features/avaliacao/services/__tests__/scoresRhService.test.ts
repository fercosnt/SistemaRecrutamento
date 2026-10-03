/**
 * Phase 11 / Plan 11-06 Task 1 — Wave-0 RED → GREEN for `scoresRhService.ts`
 * (AVAL-02/03 — the RH-facing read of `scores_candidato`).
 *
 * The single load-bearing assertion is the PII-leak guard (T-11-06-01,
 * [[reference_select_star_leaks_pii]]): the read MUST name its columns explicitly
 * and MUST NOT use a star projection. RLS is row-level only and does not hide
 * columns — over-projection here would leak more than the scorecard needs. We
 * capture the `.select()` string from a mocked supabase client and assert it
 * contains each allowlisted column and never `'*'`.
 *
 * @see src/features/triagem/services/__tests__/triagemService.test.ts (mock idiom copied)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-06-PLAN.md (Task 1)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture the select() string before importing the service (vi.hoisted keeps the
// capture available to the hoisted vi.mock factory).
const { lastSelect, eqArgs, rpcMock } = vi.hoisted(() => ({
  lastSelect: { value: '' },
  eqArgs: {} as { col?: string; val?: unknown },
  // 49-44: a leitura do caso aberto vai por RPC (`ler_resposta_caso_aberto_sjt`).
  rpcMock: { fn: null as null | ((...args: unknown[]) => unknown) },
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
      // Terminal: resolve like PostgREST.
      return Promise.resolve({ data: [], error: null })
    })
    return q
  }
  return {
    supabase: {
      from: vi.fn(() => makeQuery()),
      rpc: vi.fn((...args: unknown[]) => rpcMock.fn?.(...args)),
    },
  }
})

import {
  getScores,
  getRespostaCasoAbertoSjt,
  SITUACOES_RESPOSTA_CASO_ABERTO,
  ScoresRhServiceError,
} from '../scoresRhService'
import { supabase } from '@/lib/supabase/client'

const ALLOWLIST = [
  'id',
  'tipo',
  'subtipo',
  'pergunta_id',
  'score',
  'score_max',
  'status',
  'metadata',
  'citacoes',
  'red_flags',
]

describe('scoresRhService — RH allowlist read of scores_candidato', () => {
  beforeEach(() => {
    lastSelect.value = ''
    eqArgs.col = undefined
    eqArgs.val = undefined
  })

  it('select() projection NEVER contains `*` (PII-leak guard, [[reference_select_star_leaks_pii]])', async () => {
    await getScores('cand-1')
    expect(lastSelect.value).not.toContain('*')
  })

  it('select() projection contains EVERY allowlisted column explicitly', async () => {
    await getScores('cand-1')
    for (const col of ALLOWLIST) {
      expect(lastSelect.value).toContain(col)
    }
  })

  it('filters by candidatura_id', async () => {
    await getScores('cand-42')
    expect(eqArgs.col).toBe('candidatura_id')
    expect(eqArgs.val).toBe('cand-42')
  })

  it('throws on empty candidaturaId', async () => {
    await expect(getScores('')).rejects.toThrow()
  })
})

// ── 49-44 / WR-07: o RH lê o texto do caso aberto da SJT por RPC ─────────────────────────────
describe('scoresRhService — getRespostaCasoAbertoSjt (contrato da RPC ler_resposta_caso_aberto_sjt)', () => {
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockClear()
    rpcMock.fn = null
  })

  function rpcDevolve(data: unknown, error: unknown = null) {
    rpcMock.fn = () => Promise.resolve({ data, error })
  }

  it('candidaturaId vazio → INVALID_INPUT, e a RPC não é chamada', async () => {
    await expect(getRespostaCasoAbertoSjt('')).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('chama a RPC pelo nome com p_candidatura_id e devolve { situacao, texto }', async () => {
    rpcDevolve({ situacao: 'disponivel', texto: 'linha 1\nlinha 2' })
    await expect(getRespostaCasoAbertoSjt('c-1')).resolves.toEqual({
      situacao: 'disponivel',
      texto: 'linha 1\nlinha 2',
    })
    expect(supabase.rpc).toHaveBeenCalledWith('ler_resposta_caso_aberto_sjt', { p_candidatura_id: 'c-1' })
  })

  it.each([
    ['42501', 'UNAUTHORIZED'],
    ['P0002', 'NOT_FOUND'],
    ['XX000', 'DATABASE_ERROR'],
  ])('erro %s da RPC → %s', async (sqlstate, code) => {
    rpcDevolve(null, { message: 'falhou', code: sqlstate })
    const err = await getRespostaCasoAbertoSjt('c-1').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ScoresRhServiceError)
    expect(err).toMatchObject({ code })
  })

  it('SITUACOES_RESPOSTA_CASO_ABERTO são exatamente os quatro literais da RPC', () => {
    expect([...SITUACOES_RESPOSTA_CASO_ABERTO].sort()).toEqual(
      ['disponivel', 'indisponivel', 'removida', 'sem_resposta_enviada'].sort(),
    )
  })

  it('o literal antigo removida_pelo_titular (alegava causa; WR-01 do REVIEW-GAPS-8) é recusado como fora do contrato', async () => {
    rpcDevolve({ situacao: 'removida_pelo_titular', texto: null })
    await expect(getRespostaCasoAbertoSjt('c-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' })
  })

  it('situacao fora da lista → DATABASE_ERROR, sem ecoar o retorno na mensagem', async () => {
    rpcDevolve({ situacao: 'apagada', texto: 'segredo do candidato' })
    const err = await getRespostaCasoAbertoSjt('c-1').catch((e: unknown) => e)
    expect(err).toMatchObject({ code: 'DATABASE_ERROR' })
    expect((err as Error).message).not.toContain('segredo do candidato')
    expect((err as Error).message).not.toContain('apagada')
  })

  it.each([null, 'texto solto', 42, []])('retorno que não é objeto (%j) → DATABASE_ERROR', async (data) => {
    rpcDevolve(data)
    await expect(getRespostaCasoAbertoSjt('c-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' })
  })

  it.each([null, '', '   ', 7])('disponivel sem texto string não vazio (%j) → lança DATABASE_ERROR', async (texto) => {
    rpcDevolve({ situacao: 'disponivel', texto })
    await expect(getRespostaCasoAbertoSjt('c-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' })
  })

  it.each(['sem_resposta_enviada', 'indisponivel', 'removida'] as const)(
    '%s → texto normalizado para null (mesmo se a RPC mandasse algo)',
    async (situacao) => {
      rpcDevolve({ situacao, texto: 'nao deveria aparecer' })
      await expect(getRespostaCasoAbertoSjt('c-1')).resolves.toEqual({ situacao, texto: null })
    },
  )
})
