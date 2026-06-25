/**
 * Phase 14 / Plan 14-06 Task 1 — the cognitive prova opt-in + proctoring + anti-tamper test
 * (ENTREV-05 / RNF-07a / T-14-06-01..05).
 *
 * Encodes the load-bearing candidate-side contracts:
 *  - (opt-in) `getContexto` resolves `vaga.aplica_cognitivo` (default false) — the
 *    prova only mounts when it is true; false → the "Esta etapa não está disponível"
 *    empty state. The gate decision is asserted at the service level (the screen,
 *    Task 2, consumes this exact flag).
 *  - (no-gabarito) `COGNITIVO_ITENS_ALLOWLIST` names columns explicitly, never `*`,
 *    and NEVER carries the gabarito column (the answer key stays server-side).
 *  - (anti-tamper) `submitProva` posts ONLY raw picks to the `pontuar_cognitivo` RPC
 *    — the call body carries no score/band field; a 42501 back-lock → neutral
 *    `'locked'`, not an error.
 *  - (proctoring) `useProctoring` blocks a paste (preventDefault) + fires the neutral
 *    toast; a tab-blur increments the logged count; NO webcam/getUserMedia anywhere.
 *
 * @see src/features/triagem/services/__tests__/revisaoRedacaoService.test.ts (the supabase mock idiom)
 * @see src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx (the candidate screen test idiom)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mock the supabase client BEFORE importing the service ──────────────────
// Capture the select() string + the rpc() call/args so we can assert the
// allowlist projection + the raw-picks-only RPC body without a network round-trip.
const { lastSelect, rpcMock, rpcArgs, queryResult, maybeSingleResult } = vi.hoisted(
  () => ({
    lastSelect: { value: '' },
    rpcMock: vi.fn(),
    rpcArgs: { fn: '', params: {} as Record<string, unknown> },
    queryResult: { value: { data: [] as unknown[], error: null as unknown } },
    maybeSingleResult: {
      value: { data: null as unknown, error: null as unknown },
    },
  }),
)

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect.value = cols
      return q
    })
    q.eq = vi.fn(() => q)
    q.order = vi.fn(() => q)
    q.limit = vi.fn(() => q)
    q.maybeSingle = vi.fn(() => Promise.resolve(maybeSingleResult.value))
    // Terminal: resolve like PostgREST when awaited.
    q.then = (resolve: (v: unknown) => unknown) => resolve(queryResult.value)
    return q
  }
  return {
    supabase: {
      from: vi.fn(() => makeQuery()),
      rpc: vi.fn((fn: string, params: Record<string, unknown>) => {
        rpcArgs.fn = fn
        rpcArgs.params = params
        return rpcMock(fn, params)
      }),
    },
  }
})

import {
  getContexto,
  listItens,
  submitProva,
  COGNITIVO_ITENS_ALLOWLIST,
} from '../services/cognitivoService'
import { useProctoring, PASTE_BLOCKED_MESSAGE } from '../hooks/useProctoring'

beforeEach(() => {
  lastSelect.value = ''
  rpcMock.mockReset()
  rpcArgs.fn = ''
  rpcArgs.params = {}
  queryResult.value = { data: [], error: null }
  maybeSingleResult.value = { data: null, error: null }
})

// ── (a) opt-in gate — vaga.aplica_cognitivo decides whether the prova mounts ──
describe('opt-in gate (vaga.aplica_cognitivo)', () => {
  it('aplica_cognitivo=false → the gate is closed (the candidate sees the not-available state)', async () => {
    maybeSingleResult.value = {
      data: {
        id: 'cand-1',
        vaga_id: 'vaga-1',
        etapa_atual: 'entrevista_online',
        vagas: { aplica_cognitivo: false },
      },
      error: null,
    }
    const ctx = await getContexto('cand-1')
    expect(ctx?.aplica_cognitivo).toBe(false)
  })

  it('aplica_cognitivo missing → defaults to false (opt-in, never on by accident)', async () => {
    maybeSingleResult.value = {
      data: {
        id: 'cand-1',
        vaga_id: 'vaga-1',
        etapa_atual: 'entrevista_online',
        vagas: null,
      },
      error: null,
    }
    const ctx = await getContexto('cand-1')
    expect(ctx?.aplica_cognitivo).toBe(false)
  })

  it('aplica_cognitivo=true → the gate is open (the prova renders)', async () => {
    maybeSingleResult.value = {
      data: {
        id: 'cand-1',
        vaga_id: 'vaga-1',
        etapa_atual: 'entrevista_online',
        vagas: { aplica_cognitivo: true },
      },
      error: null,
    }
    const ctx = await getContexto('cand-1')
    expect(ctx?.aplica_cognitivo).toBe(true)
  })
})

// ── (no-gabarito) the items read never projects the answer key ────────────────
describe('cognitivo_itens read (no gabarito, no star)', () => {
  it('COGNITIVO_ITENS_ALLOWLIST names columns explicitly and never contains `*` or the gabarito', () => {
    expect(COGNITIVO_ITENS_ALLOWLIST).not.toContain('*')
    expect(COGNITIVO_ITENS_ALLOWLIST).not.toMatch(/gabarito/)
    expect(COGNITIVO_ITENS_ALLOWLIST).toContain('enunciado')
    expect(COGNITIVO_ITENS_ALLOWLIST).toContain('alternativas')
  })

  it('listItens select() projection carries no `*` and no gabarito', async () => {
    queryResult.value = { data: [], error: null }
    await listItens()
    expect(lastSelect.value).not.toContain('*')
    expect(lastSelect.value).not.toMatch(/gabarito/)
    expect(lastSelect.value.length).toBeGreaterThan(0)
  })

  it('listItens normalizes the jsonb alternativas to a string[] (no gabarito surfaced)', async () => {
    queryResult.value = {
      data: [
        { id: 'i1', secao: 'matriz', enunciado: 'E?', alternativas: ['a', 'b', 'c'], ordem: 1 },
      ],
      error: null,
    }
    const itens = await listItens()
    expect(itens[0].alternativas).toEqual(['a', 'b', 'c'])
    // The candidate item shape carries no gabarito_idx field.
    expect(itens[0]).not.toHaveProperty('gabarito_idx')
  })
})

// ── (anti-tamper) submitProva posts ONLY raw picks; no score/band in the body ──
describe('submitProva (raw picks only → pontuar_cognitivo)', () => {
  it('calls rpc("pontuar_cognitivo") with raw picks + advisory proctoring — never a score/band (CR-02)', async () => {
    rpcMock.mockResolvedValue({ error: null })
    const rawPicks = { item_01: 2, item_02: 0 }
    const outcome = await submitProva('cand-1', rawPicks, 'seed-1', {
      blurCount: 2,
      events: [{ type: 'blur', at: 1 }],
      completionTimeSeconds: 42,
    })

    expect(outcome).toBe('registrado')
    expect(rpcArgs.fn).toBe('pontuar_cognitivo')
    // CR-02: the body carries the candidatura id + raw picks + the advisory shuffle
    // seed + proctoring/timing context (no longer dead) — but NEVER a score/band.
    expect(Object.keys(rpcArgs.params).sort()).toEqual([
      'p_candidatura_id',
      'p_completion_time_seconds',
      'p_proctoring',
      'p_respostas',
      'p_shuffle_seed',
    ])
    expect(rpcArgs.params.p_respostas).toEqual(rawPicks)
    expect(rpcArgs.params.p_shuffle_seed).toBe('seed-1')
    expect(rpcArgs.params.p_completion_time_seconds).toBe(42)
    // The proctoring context is persisted (tab-blur is registered server-side).
    expect((rpcArgs.params.p_proctoring as { blur_count: number }).blur_count).toBe(2)
    // Anti-tamper: no score/band/banda/threshold key reaches the RPC body.
    const bodyJson = JSON.stringify(rpcArgs.params)
    expect(bodyJson).not.toMatch(/"score"|"banda"|"band"|"threshold"|"nota"/i)
  })

  it('42501 back-lock → neutral "locked" outcome (etapa advanced), NOT an error', async () => {
    rpcMock.mockResolvedValue({ error: { code: '42501', message: 'forbidden' } })
    const outcome = await submitProva('cand-1', { item_01: 1 })
    expect(outcome).toBe('locked')
  })

  it('a transient failure throws NETWORK_ERROR (retryable)', async () => {
    rpcMock.mockResolvedValue({ error: { code: '08006', message: 'connection lost' } })
    await expect(submitProva('cand-1', { item_01: 1 })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    })
  })
})

// ── (proctoring) paste-block + tab-blur logging, no webcam ────────────────────
describe('useProctoring (privacy-light context, never auto-rejects)', () => {
  it('blocks a paste attempt (preventDefault) + fires the neutral toast', () => {
    const onPasteBlocked = vi.fn()
    const { result } = renderHook(() => useProctoring({ onPasteBlocked }))

    const preventDefault = vi.fn()
    act(() => {
      result.current.pasteBlockHandler({
        preventDefault,
      } as unknown as React.ClipboardEvent<HTMLElement>)
    })

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(onPasteBlocked).toHaveBeenCalledWith(PASTE_BLOCKED_MESSAGE)
    // The blocked paste is logged as context (never auto-rejects).
    expect(result.current.events.some((e) => e.type === 'paste_blocked')).toBe(true)
  })

  it('a tab-blur increments the logged blurCount (context)', () => {
    const { result } = renderHook(() => useProctoring())
    expect(result.current.blurCount).toBe(0)

    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(result.current.blurCount).toBe(1)
    expect(result.current.events.some((e) => e.type === 'blur')).toBe(true)
  })

  it('the proctoring hook source uses NO webcam / getUserMedia / biometria', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(
      resolve(__dirname, '../hooks/useProctoring.ts'),
      'utf8',
    )
    // Strip comment lines (the disclosure copy legitimately names "câmera/biometria").
    const code = src
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n')
    expect(code).not.toMatch(/getUserMedia|getDisplayMedia|webcam|biometr/i)
  })
})
