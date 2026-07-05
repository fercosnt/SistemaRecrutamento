/**
 * resolveRedirect — shared anti-open-redirect guard for the `?redirect=` query
 * param (VAGA-03 / UX-05).
 *
 * This is the SINGLE source of truth for validating a redirect target before
 * any client-side navigation. Extracted from LoginCandidatoPage (Phase 22 /
 * Plan 22-03) so login AND cadastro consume ONE copy of this security-sensitive
 * logic instead of duplicating it (mirrors the CI-06 dedup lesson).
 *
 * Returns the redirect target ONLY when it is a same-origin, non-protocol-relative
 * absolute path (must start with `/` and must NOT start with `//`). Anything else
 * (`https://evil.com`, `//evil.com`, `javascript:...`, empty/missing) yields the
 * default fallback `/candidato/dashboard` (Phase 17 / D-09: the funnel hub is the
 * candidate landing — repointed from `/candidato/perfil`).
 *
 * Consumers should ALWAYS route a raw `?redirect` value through this guard before
 * navigating — never navigate to `searchParams.get('redirect')` directly. When
 * propagating the value across a route boundary (e.g. login → /cadastro),
 * `encodeURIComponent` it and re-guard on consumption.
 *
 * @module features/auth/utils/resolveRedirect
 */
export function resolveRedirect(
  raw: string | null | undefined,
  fallback = '/candidato/dashboard'
): string {
  if (!raw) return fallback
  // Reject protocol-relative URLs like `//evil.com/path` (browsers treat them as
  // absolute by inheriting the current scheme — anti-open-redirect).
  if (raw.startsWith('//')) return fallback
  // Only accept relative paths anchored at root.
  if (!raw.startsWith('/')) return fallback
  return raw
}
