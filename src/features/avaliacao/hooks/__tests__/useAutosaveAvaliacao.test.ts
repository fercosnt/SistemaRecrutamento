/**
 * Phase 11 / Plan 11-01 Task 1 — Wave 0 RED scaffold for `useAutosaveAvaliacao`
 * (AVAL-09 / RF-18 — autosave 30s + back-lock).
 *
 * The hook buffers the candidate's in-progress answers and debounces a SERVER
 * upsert to a 30s flush window (sessionStorage buffer is the synchronous layer,
 * the analog of `useCadastroDraft`; the server upsert is the debounced layer).
 * When the upsert is rejected with a Supabase RLS back-lock (PostgREST surfaces
 * the row-level-security denial as code/`status` `42501` once `avancar_etapa`
 * has moved the candidatura past `avaliacao_assincrona`), the hook surfaces a
 * neutral `locked` state instead of re-throwing — the Pitfall 3 back-lock UX.
 *
 * ── Why this is RED now ──
 * `@/features/avaliacao/hooks/useAutosaveAvaliacao` does NOT exist yet → the
 * import throws "Cannot find module" at runtime. THAT is the calibrated Wave-0
 * failure (smoke-runtime gate). The hook lands in the Phase-11 UI wave (Plan
 * 11 autosave wave). Do NOT stub the module to make this green.
 *
 * Coverage:
 *   - T1: debounces the server upsert to a 30s flush window (fake timers)
 *   - T2: exactly ONE upsert call per debounce window (no per-keystroke writes)
 *   - T3: a 42501 RLS back-lock rejection → `locked` state, NOT a re-throw
 *
 * @see src/features/cadastro/hooks/useCadastroDraft.ts (sessionStorage buffer analog)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-RESEARCH.md (Pitfall 3)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-01-PLAN.md (Task 1)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
// RED: this module does not exist yet — import throws "Cannot find module".
import { useAutosaveAvaliacao } from '@/features/avaliacao/hooks/useAutosaveAvaliacao'

const FLUSH_MS = 30_000

describe('useAutosaveAvaliacao (Plan 11-01 — AVAL-09, Wave 0 RED)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('T1: debounces the server upsert to a 30s flush window', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const { result } = renderHook(() =>
      useAutosaveAvaliacao({
        candidaturaId: 'cand-vaga-1',
        teste: 'sjt_mc',
        upsert,
        flushMs: FLUSH_MS,
      }),
    )

    act(() => {
      result.current.update({ q1: 'a' })
    })
    // Before the flush window elapses, no server write has happened.
    expect(upsert).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(FLUSH_MS)
    })
    expect(upsert).toHaveBeenCalledTimes(1)
  })

  it('T2: a flush calls the injected upsert exactly once per debounce window', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const { result } = renderHook(() =>
      useAutosaveAvaliacao({
        candidaturaId: 'cand-vaga-1',
        teste: 'sjt_mc',
        upsert,
        flushMs: FLUSH_MS,
      }),
    )

    // Several rapid edits inside one window collapse into a SINGLE upsert.
    act(() => {
      result.current.update({ q1: 'a' })
      result.current.update({ q1: 'b' })
      result.current.update({ q2: 'c' })
    })
    await act(async () => {
      vi.advanceTimersByTime(FLUSH_MS)
    })
    expect(upsert).toHaveBeenCalledTimes(1)
  })

  it('T3: a 42501 RLS back-lock rejection surfaces a `locked` state (no re-throw)', async () => {
    // PostgREST surfaces the RLS denial after avancar_etapa as 42501.
    const upsert = vi
      .fn()
      .mockResolvedValue({ error: { code: '42501', status: 403, message: 'row-level security' } })
    const { result } = renderHook(() =>
      useAutosaveAvaliacao({
        candidaturaId: 'cand-vaga-1',
        teste: 'sjt_mc',
        upsert,
        flushMs: FLUSH_MS,
      }),
    )

    act(() => {
      result.current.update({ q1: 'a' })
    })
    await act(async () => {
      vi.advanceTimersByTime(FLUSH_MS)
    })
    await waitFor(() => {
      expect(result.current.locked).toBe(true)
    })
  })
})
