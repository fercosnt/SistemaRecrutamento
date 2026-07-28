/**
 * useAuthFlowVariant — Phase 3 Wave 3 (Plan 03-04).
 *
 * Tiny derivation hook that reads the `?tipo` query string and decides
 * which auth flow variant the page is rendering. Used by the shared
 * EsqueciSenhaPage and RedefinirSenhaPage to branch on header copy +
 * post-success redirect (candidato vs RH).
 *
 * Behavior:
 *   - `?tipo=rh` → variant='rh', isRH=true
 *   - anything else (including missing) → variant='candidato', isRH=false
 *
 * The hook is intentionally minimal — the entire surface is 4 lines of
 * computation against `useSearchParams`. Component tests in Wave 4/5
 * (Plans 03-05 / 03-06) exercise it indirectly when those pages mount.
 *
 * @see .planning/phases/03-login-recuperacao-senha/03-RESEARCH.md (§Q8)
 *
 * @module features/auth/hooks/useAuthFlowVariant
 */

import { useSearchParams } from 'react-router-dom'

export type AuthVariant = 'candidato' | 'rh'

export function useAuthFlowVariant(): {
  variant: AuthVariant
  isRH: boolean
} {
  const [searchParams] = useSearchParams()
  const variant: AuthVariant =
    searchParams.get('tipo') === 'rh' ? 'rh' : 'candidato'
  return { variant, isRH: variant === 'rh' }
}
