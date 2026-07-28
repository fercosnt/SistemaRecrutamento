/**
 * Phase 11 / AVAL-09 (RF-18) — autosave with a 30s debounce + RLS back-lock catch.
 *
 * Composition: every `update(...)` writes the merged answer buffer to
 * `useAvaliacaoDraft` IMMEDIATELY (synchronous sessionStorage), and (re)arms a
 * single trailing-edge timer; when the 30s window elapses with no further edit,
 * one server `upsert` flushes the buffer to `respostas_avaliacao`. Rapid edits
 * inside one window collapse into a single server write (no per-keystroke writes).
 *
 * Back-lock (Pitfall 3): once `avancar_etapa` moves the candidatura past
 * `avaliacao_assincrona`, the etapa-gated RLS denies the write and PostgREST
 * surfaces it as code/`status` `42501`. The hook then sets a neutral `locked`
 * state and does NOT re-throw — the UI shows "Sua etapa avançou…", never an
 * error toast. Other failures surface a transient `error` (retry) state.
 *
 * The server writer is injected as `upsert` so the hook is unit-testable with
 * fake timers (no Supabase client / network in tests). The default writer wired
 * in production lives in `avaliacaoService.upsertResposta`.
 *
 * @see src/features/avaliacao/hooks/useAvaliacaoDraft.ts (the synchronous buffer)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-PATTERNS.md §useAutosaveAvaliacao
 * @module features/avaliacao/hooks/useAutosaveAvaliacao
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useAvaliacaoDraft,
  type AvaliacaoDraftPayload,
} from './useAvaliacaoDraft'

/** The shape the server writer returns — a Supabase-style `{ error }` envelope. */
export interface UpsertResult {
  error: { code?: string; status?: number; message?: string } | null
}

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'locked'

export interface UseAutosaveAvaliacaoOptions {
  candidaturaId: string
  teste: string
  /**
   * Server writer. Receives the full buffered answer payload and returns a
   * Supabase-style `{ error }`. Injected for testability; production passes
   * `avaliacaoService.upsertResposta`.
   */
  upsert: (payload: AvaliacaoDraftPayload) => Promise<UpsertResult>
  /** Debounce window in ms (default 30s). */
  flushMs?: number
}

export interface UseAutosaveAvaliacaoReturn {
  /** Merge a partial answer into the buffer, persist to sessionStorage, arm the flush. */
  update: (partial: AvaliacaoDraftPayload) => void
  /** Flush the current buffer to the server immediately (e.g. before submit). */
  flushNow: () => Promise<void>
  status: AutosaveStatus
  /** True once an RLS 42501 back-lock has been observed — the etapa advanced. */
  locked: boolean
}

const DEFAULT_FLUSH_MS = 30_000

/** A Supabase RLS denial surfaces as code or HTTP status 42501/403. */
function isBackLock(error: UpsertResult['error']): boolean {
  if (!error) return false
  return (
    error.code === '42501' ||
    String(error.status) === '42501' ||
    error.status === 403
  )
}

export function useAutosaveAvaliacao({
  candidaturaId,
  teste,
  upsert,
  flushMs = DEFAULT_FLUSH_MS,
}: UseAutosaveAvaliacaoOptions): UseAutosaveAvaliacaoReturn {
  const draft = useAvaliacaoDraft(candidaturaId, teste)

  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [locked, setLocked] = useState(false)

  // Latest merged buffer + timer handle survive re-renders without re-arming.
  const bufferRef = useRef<AvaliacaoDraftPayload>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockedRef = useRef(false)

  const flush = useCallback(async () => {
    if (lockedRef.current) return
    setStatus('saving')
    const { error } = await upsert({ ...bufferRef.current })
    if (error) {
      if (isBackLock(error)) {
        // Back-lock: the etapa advanced. Neutral terminal state, never re-throw.
        lockedRef.current = true
        setLocked(true)
        setStatus('locked')
        return
      }
      // Transient failure → surface a retry state without throwing.
      setStatus('error')
      return
    }
    setStatus('saved')
  }, [upsert])

  const update = useCallback(
    (partial: AvaliacaoDraftPayload) => {
      if (lockedRef.current) return
      bufferRef.current = { ...bufferRef.current, ...partial }
      // Immediate synchronous buffer (sessionStorage) — the analog of useCadastroDraft.
      draft.save(bufferRef.current)
      // (Re)arm the trailing-edge 30s flush — collapses rapid edits into one write.
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        void flush()
      }, flushMs)
    },
    [draft, flush, flushMs],
  )

  const flushNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await flush()
  }, [flush])

  // Flush any pending buffer on unmount so an in-flight window isn't lost.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        void flush()
      }
    }
  }, [flush])

  return { update, flushNow, status, locked }
}
