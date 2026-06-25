/**
 * useProctoring — light, privacy-respecting proctoring for the candidate cognitive
 * prova (Phase 14 / ENTREV-05 — CONTEXT decision).
 *
 * Composition (clones the SJT soft-timer interval + the `useAutosaveAvaliacao`
 * listener-lifecycle/cleanup posture):
 *  - a SOFT count-up timer (no hard cutoff — the candidate is NEVER timed out),
 *  - DOM `blur` + `visibilitychange` listeners that COUNT tab-blur events +
 *    accumulate timestamped context, and
 *  - a paste-block handler for the answer field (`onPaste` → preventDefault +
 *    a neutral `toast.info`).
 *
 * INVARIANTS (RNF-07a / T-14-06-04 — privacy-light):
 *  - Proctoring is logged as CONTEXT only and NEVER auto-rejects. The accumulated
 *    `events`/`blurCount` are advisory signals; nothing here decides the funil.
 *  - There is NO camera / screen-capture / media-device access of any kind.
 *    Disclosed transparently in the UI copy on the prova screen (the candidate is
 *    told no camera, recording, or physical-trait data is used).
 *  - All listeners are removed on unmount (no leaks).
 *
 * @module features/avaliacao-cognitiva/hooks/useProctoring
 * @see src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx (the soft-timer interval, lines 134-138)
 * @see src/features/avaliacao/hooks/useAutosaveAvaliacao.ts (the listener-lifecycle + cleanup pattern, lines 132-140)
 * @see .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md (proctoring disclosure + paste-blocked toast)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClipboardEvent } from 'react'
import { toast } from 'sonner'

/** A single proctoring context event (logged, never auto-rejecting). */
export interface ProctoringEvent {
  /** The event kind — tab-blur, visibility-hidden, or a blocked paste attempt. */
  type: 'blur' | 'visibility_hidden' | 'paste_blocked'
  /** Epoch ms when the event fired (advisory timing context). */
  at: number
}

export interface UseProctoringOptions {
  /** Whether the proctoring listeners are armed (default true). */
  enabled?: boolean
  /**
   * The neutral toast shown when a paste is blocked. Injected for testability;
   * production passes `sonner`'s `toast.info`.
   */
  onPasteBlocked?: (message: string) => void
}

export interface UseProctoringReturn {
  /** The soft count-up elapsed seconds (NO hard cutoff). */
  seconds: number
  /** How many tab-blur / visibility-hidden events have been observed (context). */
  blurCount: number
  /** The accumulated, timestamped proctoring context (never auto-rejects). */
  events: ProctoringEvent[]
  /**
   * The `onPaste` handler to wire on the answer field — preventDefault + a neutral
   * toast (paste is disabled on the answer; the candidate must type).
   */
  pasteBlockHandler: (e: ClipboardEvent<HTMLElement>) => void
}

/** The neutral paste-blocked copy (verbatim from 14-UI-SPEC §Cognitive prova). */
export const PASTE_BLOCKED_MESSAGE =
  'Cole desabilitado nesta resposta — digite sua resposta.'

export function useProctoring(
  options: UseProctoringOptions = {},
): UseProctoringReturn {
  const { enabled = true, onPasteBlocked } = options

  const [seconds, setSeconds] = useState(0)
  const [blurCount, setBlurCount] = useState(0)
  const [events, setEvents] = useState<ProctoringEvent[]>([])

  // Keep the injected toast in a ref so the listener effect does not re-arm when a
  // parent passes a fresh closure each render.
  const onPasteBlockedRef = useRef(onPasteBlocked)
  onPasteBlockedRef.current = onPasteBlocked

  const pushEvent = useCallback((type: ProctoringEvent['type']) => {
    setEvents((prev) => [...prev, { type, at: Date.now() }])
  }, [])

  // Soft timer — counts up, NO hard cutoff (the candidate is never timed out).
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [enabled])

  // tab-blur / visibilitychange listeners — accumulate context, NEVER auto-reject.
  useEffect(() => {
    if (!enabled) return

    const handleBlur = () => {
      setBlurCount((c) => c + 1)
      pushEvent('blur')
    }
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        setBlurCount((c) => c + 1)
        pushEvent('visibility_hidden')
      }
    }

    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [enabled, pushEvent])

  // paste-block on the answer field — preventDefault + a neutral toast. NO
  // camera/screen/media-device capture anywhere in this hook (privacy-light, CONTEXT).
  const pasteBlockHandler = useCallback(
    (e: ClipboardEvent<HTMLElement>) => {
      e.preventDefault()
      pushEvent('paste_blocked')
      const notify = onPasteBlockedRef.current ?? ((m: string) => toast.info(m))
      notify(PASTE_BLOCKED_MESSAGE)
    },
    [pushEvent],
  )

  return { seconds, blurCount, events, pasteBlockHandler }
}
