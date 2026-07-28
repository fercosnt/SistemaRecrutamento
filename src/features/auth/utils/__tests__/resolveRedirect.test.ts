/**
 * resolveRedirect — shared anti-open-redirect guard unit tests
 * (Phase 22 / Plan 22-03, UX-05).
 *
 * The guard is the single source of truth for validating the `?redirect=`
 * query param before any client-side navigation (login + cadastro). It must
 * reject protocol-relative (`//evil`) and non-root-anchored (`https://evil`)
 * targets, accept root-anchored relative paths, and honor a custom fallback.
 *
 * This is the ONE copy of the logic — previously it lived inline in
 * LoginCandidatoPage (which now re-exports from here so the pre-existing
 * routing test keeps its import path valid).
 */
import { describe, expect, it } from 'vitest'
import { resolveRedirect } from '../resolveRedirect'

describe('resolveRedirect (shared anti-open-redirect guard)', () => {
  // ============================================================
  // <behavior> case 1 — null → fallback
  // ============================================================
  it('falls back to /candidato/dashboard when the target is null', () => {
    expect(resolveRedirect(null)).toBe('/candidato/dashboard')
  })

  it('falls back when the target is undefined or empty', () => {
    expect(resolveRedirect(undefined)).toBe('/candidato/dashboard')
    expect(resolveRedirect('')).toBe('/candidato/dashboard')
  })

  // ============================================================
  // <behavior> case 2 — protocol-relative //evil → fallback
  // ============================================================
  it('rejects protocol-relative URLs (//evil.com inherits scheme)', () => {
    expect(resolveRedirect('//evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('//evil.com/path')).toBe('/candidato/dashboard')
  })

  // ============================================================
  // <behavior> case 3 — non-root-anchored absolute → fallback
  // ============================================================
  it('rejects non-root-anchored absolute URLs (open-redirect attempt)', () => {
    expect(resolveRedirect('https://evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('http://evil.com/phish')).toBe('/candidato/dashboard')
  })

  it('rejects relative paths without a leading slash', () => {
    expect(resolveRedirect('candidato/perfil')).toBe('/candidato/dashboard')
  })

  // ============================================================
  // <behavior> case 4 — root-anchored relative path passes through
  // ============================================================
  it('accepts root-anchored relative paths (query string preserved)', () => {
    expect(resolveRedirect('/vagas/123')).toBe('/vagas/123')
    expect(resolveRedirect('/vagas?departamento=clinico')).toBe(
      '/vagas?departamento=clinico'
    )
  })

  // ============================================================
  // <behavior> case 5 — custom fallback honored
  // ============================================================
  it('honors a custom fallback when provided', () => {
    expect(resolveRedirect('x', '/rh/dashboard')).toBe('/rh/dashboard')
    expect(resolveRedirect(null, '/rh/dashboard')).toBe('/rh/dashboard')
  })

  // ============================================================
  // <behavior> case 6 — backslash open-redirect bypasses (CR-01, CWE-601)
  //
  // The WHATWG URL parser treats `\` as `/` for http(s) schemes, so a value
  // that starts with a single `/` followed by `\` normalizes to a
  // protocol-relative cross-origin URL — it MUST be rejected even though it
  // passes a naive `startsWith('/')` / `!startsWith('//')` check.
  // ============================================================
  it('rejects backslash-relative open-redirect bypasses', () => {
    expect(resolveRedirect('/\\evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('/\\\\evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('/\\/evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('\\/\\/evil.com')).toBe('/candidato/dashboard')
  })

  // ============================================================
  // <behavior> case 7 — control-character open-redirect bypasses (CR-01)
  //
  // Browsers strip TAB/LF/CR from a URL BEFORE parsing, so `/<TAB>/evil.com`
  // (the decoded form of `?redirect=%2F%09%2Fevil.com`) normalizes to
  // `//evil.com`. Reject any value carrying control characters.
  // ============================================================
  it('rejects control-character open-redirect bypasses (stripped TAB/LF/CR)', () => {
    expect(resolveRedirect('/\t/evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('\thttps://evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('/\nevil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('/\revil.com')).toBe('/candidato/dashboard')
  })

  it('rejects leading-whitespace open-redirect bypasses', () => {
    expect(resolveRedirect('  //evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect(' /\\evil.com')).toBe('/candidato/dashboard')
  })

  // ============================================================
  // <behavior> case 8 — legit paths still pass after hardening
  // ============================================================
  it('still accepts a legit root-anchored path with query + hash', () => {
    expect(resolveRedirect('/vagas/abc?x=1#h')).toBe('/vagas/abc?x=1#h')
  })
})
