/**
 * Phase 13 / Plan 13-03 (AVAL-05) — the candidate essay cronômetro.
 *
 * An INFORMATIVE elapsed timer rendering "Tempo nesta redação: {mm:ss}" — it
 * counts UP from mount via `setInterval(1s)`. There is NO countdown, NO alarm
 * color, NO deadline (UI-SPEC §Copywriting Contract: the timer reassures, it never
 * pressures — the redação is not time-boxed). No in-repo analog exists (SJT/Big
 * Five never showed a timer); the pattern is a trivial elapsed counter
 * (13-PATTERNS No-Analog guidance).
 *
 * The elapsed seconds can be surfaced to the parent via `onTick` so the screen may
 * persist `tempo_gasto_segundos` on submit (Plan 13-02 noted V1 sends 0; this wires
 * the real elapsed time when the screen opts in).
 *
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md §Copywriting Contract (Cronômetro row)
 * @module features/avaliacao/components/RedacaoCronometro
 */
import { useEffect, useRef, useState } from 'react'

function formatMmSs(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60)
  const ss = totalSeconds % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export interface RedacaoCronometroProps {
  /** Notified every second with the elapsed seconds (for `tempo_gasto_segundos`). */
  onTick?: (elapsedSeconds: number) => void
}

/** Informative elapsed timer — counts up, no countdown, no alarm color. */
export function RedacaoCronometro({ onTick }: RedacaoCronometroProps) {
  const [elapsed, setElapsed] = useState(0)
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1
        onTickRef.current?.(next)
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <p className="text-sm font-semibold text-white/70">
      Tempo nesta redação: {formatMmSs(elapsed)}
    </p>
  )
}
