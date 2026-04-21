/**
 * Cadastro-feature constants shared across components, hooks, and services.
 *
 * IMPORTANT: POLICY_VERSION must match supabase/functions/_shared/constants.ts.
 * When bumping version, update BOTH files in the same commit and grep the repo
 * for the old value to catch stray references. (D-16, Phase 2)
 */

export const POLICY_VERSION = 'v1.0-2026-04' as const

/**
 * sessionStorage key for the cadastro draft. Suffix `v1` allows future schema
 * migrations — bump to `v2` to automatically invalidate stale drafts. (D-13)
 */
export const CADASTRO_DRAFT_KEY = 'cadastro:draft:v1' as const
