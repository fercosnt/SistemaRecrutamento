/**
 * Phase 26 / Plan 26-05 — client-half unit tests for the corrected avaliacaoService.
 *
 * Mirrors the supabase-mock idiom in avaliacaoService.rubric.test.ts. The Supabase
 * client/RPC are mocked — NO live DB (the RPC contracts are proven by the SQL smokes
 * in 26-07, RED until then). Covers:
 *   - FUNIL-07 battery filter: getAvaliacaoContext routes the perguntas query to
 *     `.in('id', itens_ids)` when the SJT element carries them, else `.eq('cargo', …)`.
 *   - FUNIL-08 client half: aplica_cognitivo surfaces from the vaga join.
 *   - FUNIL-01 neutral errors: pontuarSjt maps 42501 → LOCKED and 22023 → a neutral
 *     code and NEVER leaks a numeric score/threshold in the message (T-26-05-02).
 *   - FUNIL-12: getAvaliacaoStatus returns per-card presence booleans only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mutable, hoisted mock state so each test can steer the mocked client without
// re-registering the module (vi.mock is hoisted above imports).
const { state } = vi.hoisted(() => ({
  state: {
    testesAplicaveis: null as unknown,
    perguntasCalls: {
      select: '',
      eq: [] as unknown[][],
      in: [] as unknown[][],
    },
    rpcError: null as { code?: string; status?: number; message?: string } | null,
    statusPayload: null as unknown,
    statusError: null as { message: string } | null,
  },
}))

vi.mock('@/lib/supabase/client', () => {
  const candidaturasBuilder = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn(() => q)
    q.eq = vi.fn(() => q)
    q.is = vi.fn(() => q)
    q.maybeSingle = vi.fn(() =>
      Promise.resolve({
        data: {
          id: 'c1',
          status: 'em_avaliacao',
          etapa_atual: 'avaliacao_assincrona',
          vaga_id: 'v1',
          vaga: {
            testes_aplicaveis: state.testesAplicaveis,
            aplica_cognitivo: true,
          },
        },
        error: null,
      }),
    )
    return q
  }

  // Chainable + thenable perguntas builder: records .select/.eq/.in and resolves to
  // an empty active battery when awaited.
  const perguntasBuilder = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      state.perguntasCalls.select = cols
      return q
    })
    q.eq = vi.fn((col: string, val: unknown) => {
      state.perguntasCalls.eq.push([col, val])
      return q
    })
    q.in = vi.fn((col: string, val: unknown) => {
      state.perguntasCalls.in.push([col, val])
      return q
    })
    q.then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: [], error: null })
    return q
  }

  return {
    supabase: {
      from: vi.fn((table: string) =>
        table === 'perguntas' ? perguntasBuilder() : candidaturasBuilder(),
      ),
      rpc: vi.fn((fn: string) => {
        if (fn === 'pontuar_sjt')
          return Promise.resolve({ data: null, error: state.rpcError })
        if (fn === 'get_avaliacao_status')
          return Promise.resolve({
            data: state.statusPayload,
            error: state.statusError,
          })
        return Promise.resolve({ data: null, error: null })
      }),
    },
  }
})

import {
  getAvaliacaoContext,
  getAvaliacaoStatus,
  pontuarSjt,
  AvaliacaoServiceError,
} from '@/features/avaliacao/services/avaliacaoService'

// A digit in a candidate-facing message would betray a raw score/threshold/count.
const SCORE_LEAK = /\d/

const CID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  state.testesAplicaveis = null
  state.perguntasCalls = { select: '', eq: [], in: [] }
  state.rpcError = null
  state.statusPayload = null
  state.statusError = null
})

describe('avaliacaoService.getAvaliacaoContext — FUNIL-07 battery filter', () => {
  it('filters perguntas by itens_ids (.in) when the SJT element carries them', async () => {
    state.testesAplicaveis = [
      { tipo: 'sjt', cargo: 'dentista', itens_ids: ['a', 'b'] },
    ]

    await getAvaliacaoContext(CID)

    // Battery membership → `.in('id', [a,b])`, and NO cargo fallback.
    expect(state.perguntasCalls.in).toContainEqual(['id', ['a', 'b']])
    const cargoEq = state.perguntasCalls.eq.filter(([c]) => c === 'cargo')
    expect(cargoEq).toHaveLength(0)
    // Allowlist invariant #1 — never a star projection.
    expect(state.perguntasCalls.select).not.toContain('*')
    expect(state.perguntasCalls.select).toContain('cenario')
  })

  it('falls back to .eq(cargo) when the SJT element has a cargo but no itens_ids', async () => {
    state.testesAplicaveis = [{ tipo: 'sjt', cargo: 'dentista' }]

    await getAvaliacaoContext(CID)

    expect(state.perguntasCalls.eq).toContainEqual(['cargo', 'dentista'])
    expect(state.perguntasCalls.in).toHaveLength(0)
  })

  it('leaves the battery unfiltered (active-only) when there is no SJT element', async () => {
    state.testesAplicaveis = { some: 'object-not-array' }

    await getAvaliacaoContext(CID)

    // Only the status='active' filter, no id/cargo battery narrowing.
    expect(state.perguntasCalls.in).toHaveLength(0)
    const cargoEq = state.perguntasCalls.eq.filter(([c]) => c === 'cargo')
    expect(cargoEq).toHaveLength(0)
  })

  it('surfaces aplica_cognitivo from the vaga join (FUNIL-08 client half)', async () => {
    state.testesAplicaveis = [{ tipo: 'sjt', cargo: 'dentista' }]

    const ctx = await getAvaliacaoContext(CID)

    expect(ctx.aplica_cognitivo).toBe(true)
  })
})

describe('avaliacaoService.pontuarSjt — FUNIL-01 neutral error mapping', () => {
  it('maps a 42501 (back-lock / re-submit / foreign pergunta) to LOCKED with no numeric leak', async () => {
    state.rpcError = { code: '42501', message: 'avaliacao ja registrada' }

    let caught: unknown
    try {
      await pontuarSjt(CID, [])
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AvaliacaoServiceError)
    const e = caught as AvaliacaoServiceError
    expect(e.code).toBe('LOCKED')
    expect(e.message).not.toMatch(SCORE_LEAK)
  })

  it('maps a 22023 (dup / incomplete / unconfigured battery) to a neutral code with no numeric leak', async () => {
    // The raw server message carries counts ("bateria incompleta (3 de 10)") —
    // asserting the client NEVER echoes them is the load-bearing RNF-07a check.
    state.rpcError = { code: '22023', message: 'bateria incompleta (3 de 10)' }

    let caught: unknown
    try {
      await pontuarSjt(CID, [])
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AvaliacaoServiceError)
    const e = caught as AvaliacaoServiceError
    expect(['DATABASE_ERROR', 'LOCKED']).toContain(e.code)
    expect(e.message).not.toMatch(SCORE_LEAK)
  })
})

describe('avaliacaoService.getAvaliacaoStatus — FUNIL-12 neutral card status', () => {
  it('returns per-card presence booleans from the status RPC (no raw score)', async () => {
    state.statusPayload = {
      sjt_mc: { registrado: true, iniciado: true },
      redacao: { registrado: false },
      cognitivo: { registrado: true },
    }

    const status = await getAvaliacaoStatus(CID)

    expect(status.sjt_mc.registrado).toBe(true)
    expect(status.sjt_mc.iniciado).toBe(true)
    expect(status.redacao.registrado).toBe(false)
    expect(status.cognitivo.registrado).toBe(true)
    // A card absent from the payload defaults to false (never throws / leaks).
    expect(status.big_five.registrado).toBe(false)
  })

  it('throws a neutral AvaliacaoServiceError when the status RPC errors', async () => {
    // A foreign candidatura RAISEs 42501 'forbidden' server-side (IDOR guard).
    state.statusError = { message: 'forbidden' }

    let caught: unknown
    try {
      await getAvaliacaoStatus(CID)
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AvaliacaoServiceError)
    expect((caught as AvaliacaoServiceError).code).toBe('DATABASE_ERROR')
  })
})
