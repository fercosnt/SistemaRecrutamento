/**
 * Phase 11 / AVAL-09 — sessionStorage draft for the SJT avaliação answers.
 *
 * Mirrors `useCadastroDraft`: a synchronous `save`/`load`/`clear` buffer over
 * `sessionStorage` (NOT localStorage — it dies with the tab, LGPD-compliant for
 * candidate answer drafts), with a `_savedAt` stamp and try/catch-swallow so a
 * storage failure never breaks the test-taking flow.
 *
 * Keyed by `candidatura_id` + `teste` so each test of each candidatura keeps an
 * independent draft (the container allows partial completion per test).
 *
 * @see src/features/cadastro/hooks/useCadastroDraft.ts (structure copied)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-PATTERNS.md §useAvaliacaoDraft
 * @module features/avaliacao/hooks/useAvaliacaoDraft
 */
import { useCallback, useMemo } from 'react'

/** The draft payload is the in-progress SJT answer map (q-id → answer). */
export type AvaliacaoDraftPayload = Record<string, unknown>

type StoredDraft = AvaliacaoDraftPayload & { _savedAt?: number }

export interface UseAvaliacaoDraftReturn {
  save: (data: AvaliacaoDraftPayload) => void
  load: () => AvaliacaoDraftPayload | null
  clear: () => void
}

/** Storage key — namespaced per candidatura + teste so drafts never collide. */
export function avaliacaoDraftKey(candidaturaId: string, teste: string): string {
  return `avaliacao-draft:${candidaturaId}:${teste}`
}

export function useAvaliacaoDraft(
  candidaturaId: string,
  teste: string,
): UseAvaliacaoDraftReturn {
  const key = useMemo(
    () => avaliacaoDraftKey(candidaturaId, teste),
    [candidaturaId, teste],
  )

  const save = useCallback(
    (data: AvaliacaoDraftPayload) => {
      try {
        // No secrets to strip in the SJT answer payload, but keep a defensive
        // shallow copy + stamp pass for parity with useCadastroDraft.
        const safe: StoredDraft = { ...data, _savedAt: Date.now() }
        sessionStorage.setItem(key, JSON.stringify(safe))
      } catch (err) {
        console.warn('[useAvaliacaoDraft] save failed', err)
      }
    },
    [key],
  )

  const load = useCallback((): AvaliacaoDraftPayload | null => {
    try {
      const raw = sessionStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as StoredDraft
      const { _savedAt: _omit, ...rest } = parsed
      void _omit
      return rest as AvaliacaoDraftPayload
    } catch {
      return null
    }
  }, [key])

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key)
    } catch (err) {
      console.warn('[useAvaliacaoDraft] clear failed', err)
    }
  }, [key])

  return { save, load, clear }
}
