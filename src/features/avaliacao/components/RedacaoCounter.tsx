/**
 * Phase 13 / Plan 13-03 (AVAL-05 / RF-R-02) — the candidate essay word counter.
 *
 * A 3-BAND length gate (UI-SPEC §Color) — MECHANICAL writing guidance, NEVER a
 * verdict (RNF-07a: a short counter means "too short", not "you failed", so
 * below-min is NEUTRAL muted, never alarm-red):
 *   - < 200 words  → muted `text-white/60`     + "{N} palavras — mínimo 200"  ; submit DISABLED
 *   - 200-500 words → accent `#35BFAD`           + "{N} palavras"               ; submit ENABLED
 *   - > 500 words  → amber `text-amber-300/80`  + "{N} palavras — máximo 500"  ; submit DISABLED
 *
 * The displayed count is updated with a 200ms trailing-edge debounce so the band
 * does not thrash on every keystroke; the INITIAL render reflects the seeded
 * `text` prop immediately (the debounce governs subsequent edits, not mount).
 *
 * The component exposes the in-range verdict via a `data-submit-enabled` attribute
 * on its root so the parent screen drives submit-disabled, and via the optional
 * `onValidChange` callback. `countWords` is extracted verbatim from
 * `SjtCasoAbertoScreen` (trim → split /\s+/ → length).
 *
 * @see src/features/avaliacao/components/SjtCasoAbertoScreen.tsx (countWords primitive)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md §Color (3-band rule + copy)
 * @module features/avaliacao/components/RedacaoCounter
 */
import { useEffect, useRef, useState } from 'react'

export const MIN_WORDS = 200
export const MAX_WORDS = 500
const DEBOUNCE_MS = 200

/** Extracted verbatim from SjtCasoAbertoScreen — trim → split on whitespace → length. */
export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export interface RedacaoCounterProps {
  /** The current essay text. */
  text: string
  /** Notified whenever the in-range (200-500) validity flips. */
  onValidChange?: (isValid: boolean) => void
}

/**
 * Renders the 3-band word counter. The initial count is computed synchronously
 * from `text`; subsequent `text` changes update the displayed count after a 200ms
 * debounce.
 */
export function RedacaoCounter({ text, onValidChange }: RedacaoCounterProps) {
  // Seed from the initial prop so first render is correct (debounce governs edits).
  const [words, setWords] = useState(() => countWords(text))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setWords(countWords(text))
    }, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text])

  const belowMin = words < MIN_WORDS
  const aboveMax = words > MAX_WORDS
  const isValid = !belowMin && !aboveMax

  // Notify the parent of validity transitions (drives submit-disabled).
  const lastValidRef = useRef<boolean | null>(null)
  useEffect(() => {
    if (lastValidRef.current !== isValid) {
      lastValidRef.current = isValid
      onValidChange?.(isValid)
    }
  }, [isValid, onValidChange])

  const helper = belowMin
    ? `${words} palavras — mínimo ${MIN_WORDS}`
    : aboveMax
      ? `${words} palavras — máximo ${MAX_WORDS}`
      : `${words} palavras`

  // 3-band code-of-colors (UI-SPEC §Color): muted / accent / amber — never red.
  const colorClass = belowMin
    ? 'text-white/60'
    : aboveMax
      ? 'text-amber-300/80'
      : ''
  const colorStyle = isValid ? { color: '#35BFAD' } : undefined

  return (
    <p
      data-submit-enabled={isValid ? 'true' : 'false'}
      className={`text-sm font-semibold ${colorClass}`}
      style={colorStyle}
    >
      {helper}
    </p>
  )
}
