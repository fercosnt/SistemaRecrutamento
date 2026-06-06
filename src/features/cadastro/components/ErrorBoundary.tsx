/**
 * Re-export shim — canonical ErrorBoundary lives at src/components/ErrorBoundary.tsx.
 *
 * Phase 5 / Plan 05-03 Task 1 (HARD-03 / D-09): the project had TWO ErrorBoundary
 * implementations. The richer `src/components/ErrorBoundary.tsx` (BeautySmileLogo +
 * GlassCard fallback) was chosen as canonical in Plan 05-01 and is now hoisted to the
 * App root. This file previously held a leaner duplicate; its body was deleted and it
 * is kept as a re-export so the `@/features/cadastro/components` barrel keeps resolving
 * `ErrorBoundary` to the single canonical implementation (no duplicate maintenance).
 *
 * @see src/components/ErrorBoundary.tsx (canonical)
 */
export { ErrorBoundary, withErrorBoundary } from '@/components/ErrorBoundary'
