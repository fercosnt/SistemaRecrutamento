/**
 * Constants shared among Edge Functions (Deno runtime).
 *
 * IMPORTANT: POLICY_VERSION must match src/features/cadastro/constants.ts.
 * When bumping version, update BOTH files in the same commit and grep the
 * repo for the old value to catch stray references. (D-16, Phase 2)
 */
export const POLICY_VERSION = 'v1.0-2026-04' as const
