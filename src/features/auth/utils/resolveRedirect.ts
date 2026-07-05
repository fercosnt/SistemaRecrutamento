/**
 * resolveRedirect — shared anti-open-redirect guard for the `?redirect=` query
 * param (VAGA-03 / UX-05).
 *
 * This is the SINGLE source of truth for validating a redirect target before
 * any client-side navigation. Extracted from LoginCandidatoPage (Phase 22 /
 * Plan 22-03) so login AND cadastro consume ONE copy of this security-sensitive
 * logic instead of duplicating it (mirrors the CI-06 dedup lesson).
 *
 * Returns the redirect target ONLY when it is a genuine same-origin absolute path
 * (must start with a single `/`, must NOT start with `//` or `/\`, must contain no
 * control characters or surrounding whitespace, and must resolve same-origin under
 * the WHATWG URL parser). Anything else (`https://evil.com`, `//evil.com`,
 * `/\evil.com`, `/<TAB>/evil.com`, `javascript:...`, empty/missing) yields the
 * default fallback `/candidato/dashboard` (Phase 17 / D-09: the funnel hub is the
 * candidate landing — repointed from `/candidato/perfil`).
 *
 * CR-01 (Phase 22 code review) hardening: the old guard only rejected `//` and
 * required a leading `/`, which the well-known CWE-601 backslash/control-char
 * bypass class defeats — the browser's WHATWG URL parser treats `\` as `/` for
 * `http(s)` and strips `TAB`/`LF`/`CR` before parsing, so `/\evil.com` and
 * `/<TAB>/evil.com` normalize to protocol-relative cross-origin URLs while still
 * passing a naive `startsWith('/')` check. We now reject that whole class up-front
 * (cheap string guards) AND belt-and-suspenders re-parse the value against a dummy
 * origin using the SAME algorithm the browser uses, rejecting anything that escapes
 * same-origin. A same-origin value is returned verbatim (behavior preserved).
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
  // Reject control characters (char code < 0x20 — NUL/TAB/LF/CR/FF/VT — and DEL
  // 0x7f). Browsers strip TAB/LF/CR from URLs BEFORE parsing, so `/<TAB>/evil.com`
  // would otherwise normalize to a cross-origin URL (CWE-601). Reject the class
  // rather than trying to sanitize it.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback
  // Reject leading/trailing whitespace (e.g. `  //evil.com`) — a legit in-app path
  // never has it, and browsers trim it before parsing.
  if (raw !== raw.trim()) return fallback
  // Must be a root-anchored relative path...
  if (!raw.startsWith('/')) return fallback
  // ...but NOT protocol-relative (`//evil.com`) nor backslash-relative
  // (`/\evil.com` — the WHATWG parser treats `\` as `/` for http(s), so a leading
  // `/\` is an open-redirect exactly like `//`).
  if (raw[1] === '/' || raw[1] === '\\') return fallback
  // Belt-and-suspenders: resolve against a dummy origin with the SAME algorithm the
  // browser uses. Anything that escapes same-origin via a normalization trick the
  // string guards above missed is rejected. A same-origin value is returned as-is.
  try {
    const DUMMY_ORIGIN = 'https://x.invalid'
    if (new URL(raw, DUMMY_ORIGIN).origin !== DUMMY_ORIGIN) return fallback
  } catch {
    return fallback
  }
  return raw
}
