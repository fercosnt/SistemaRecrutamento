/**
 * Phase 4 / Plan 04-07 — VAGA-03 redirect routing tests.
 *
 * Covers the `resolveRedirect` helper exported from LoginCandidatoPage. The
 * helper guards the post-login navigation against open-redirect attacks: the
 * caller (the page) blindly hands the `?redirect=` query value here, and the
 * helper decides whether to navigate to it or fall back to the default
 * `/candidato/perfil` landing.
 *
 * Why test the helper directly (not the rendered page):
 *   The page consumes `signIn` (calls Supabase Auth), `useRateLimitCooldown`,
 *   plus several glass-UI primitives. Rendering the full tree just to assert
 *   navigation requires mocking all of those, which is far out of scope for
 *   this routing fix. The helper is the load-bearing decision point and is
 *   testable in isolation. Future E2E (Plan 04-08) will exercise the full
 *   roundtrip in Playwright.
 *
 * Mock note: importing LoginCandidatoPage transitively pulls in the supabase
 * client (which throws on missing env vars). We stub the client + the auth
 * service barrel BEFORE the import so the test file loads cleanly without
 * needing real Supabase env wired up at test time.
 */
import { describe, expect, it, vi } from 'vitest'

// Stub supabase client before importing the page under test.
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resend: vi.fn(),
      getUser: vi.fn(),
    },
  },
}))

// Stub the auth services barrel so we don't transitively load the real
// authService (which itself constructs supabase calls during module init).
vi.mock('@/features/auth/services', () => ({
  signIn: vi.fn(),
  resendConfirmation: vi.fn(),
}))

import { resolveRedirect } from '../LoginCandidatoPage'

describe('LoginCandidatoPage › resolveRedirect (VAGA-03)', () => {
  // ============================================================
  // Happy path — relative path passes through
  // ============================================================
  it('returns the redirect target when it is a same-origin absolute path', () => {
    expect(
      resolveRedirect('/candidato/candidatura/formulario/atendimento-ao-paciente')
    ).toBe('/candidato/candidatura/formulario/atendimento-ao-paciente')
  })

  it('returns a simple relative path unchanged', () => {
    expect(resolveRedirect('/foo/bar')).toBe('/foo/bar')
  })

  it('returns the path with query string preserved', () => {
    expect(resolveRedirect('/vagas?departamento=clinico')).toBe(
      '/vagas?departamento=clinico'
    )
  })

  // ============================================================
  // Anti-open-redirect — must reject and use default
  // ============================================================
  it('rejects absolute http(s) URLs (open-redirect attempt)', () => {
    expect(resolveRedirect('https://evil.com')).toBe('/candidato/perfil')
    expect(resolveRedirect('http://evil.com/phish')).toBe('/candidato/perfil')
  })

  it('rejects protocol-relative URLs (//evil.com inherits scheme)', () => {
    expect(resolveRedirect('//evil.com')).toBe('/candidato/perfil')
    expect(resolveRedirect('//evil.com/path')).toBe('/candidato/perfil')
  })

  it('rejects javascript: pseudo-protocol', () => {
    expect(resolveRedirect('javascript:alert(1)')).toBe('/candidato/perfil')
  })

  it('rejects relative paths without a leading slash', () => {
    expect(resolveRedirect('candidato/perfil')).toBe('/candidato/perfil')
    expect(resolveRedirect('foo')).toBe('/candidato/perfil')
  })

  // ============================================================
  // Empty / missing input
  // ============================================================
  it('returns default when redirect is null', () => {
    expect(resolveRedirect(null)).toBe('/candidato/perfil')
  })

  it('returns default when redirect is undefined', () => {
    expect(resolveRedirect(undefined)).toBe('/candidato/perfil')
  })

  it('returns default when redirect is an empty string', () => {
    expect(resolveRedirect('')).toBe('/candidato/perfil')
  })

  // ============================================================
  // Custom fallback
  // ============================================================
  it('honors an explicit fallback when provided', () => {
    expect(resolveRedirect(null, '/inicio')).toBe('/inicio')
    expect(resolveRedirect('https://evil.com', '/inicio')).toBe('/inicio')
  })
})
