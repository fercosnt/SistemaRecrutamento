/**
 * Phase 4 / Plan 04-07 — VAGA-03 redirect routing tests.
 *
 * Covers the `resolveRedirect` helper exported from LoginCandidatoPage. The
 * helper guards the post-login navigation against open-redirect attacks: the
 * caller (the page) blindly hands the `?redirect=` query value here, and the
 * helper decides whether to navigate to it or fall back to the default
 * `/candidato/dashboard` landing (Phase 17 / D-09 — repointed from
 * `/candidato/perfil` so the funnel hub is the candidate landing).
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
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

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

import { resolveRedirect, LoginCandidatoPage } from '../LoginCandidatoPage'
import { LoginRHPage } from '../LoginRHPage'
import { signIn } from '@/features/auth/services'

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
    expect(resolveRedirect('https://evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('http://evil.com/phish')).toBe('/candidato/dashboard')
  })

  it('rejects protocol-relative URLs (//evil.com inherits scheme)', () => {
    expect(resolveRedirect('//evil.com')).toBe('/candidato/dashboard')
    expect(resolveRedirect('//evil.com/path')).toBe('/candidato/dashboard')
  })

  it('rejects javascript: pseudo-protocol', () => {
    expect(resolveRedirect('javascript:alert(1)')).toBe('/candidato/dashboard')
  })

  it('rejects relative paths without a leading slash', () => {
    expect(resolveRedirect('candidato/perfil')).toBe('/candidato/dashboard')
    expect(resolveRedirect('foo')).toBe('/candidato/dashboard')
  })

  // ============================================================
  // Empty / missing input
  // ============================================================
  it('returns default when redirect is null', () => {
    expect(resolveRedirect(null)).toBe('/candidato/dashboard')
  })

  it('returns default when redirect is undefined', () => {
    expect(resolveRedirect(undefined)).toBe('/candidato/dashboard')
  })

  it('returns default when redirect is an empty string', () => {
    expect(resolveRedirect('')).toBe('/candidato/dashboard')
  })

  // ============================================================
  // Custom fallback
  // ============================================================
  it('honors an explicit fallback when provided', () => {
    expect(resolveRedirect(null, '/inicio')).toBe('/inicio')
    expect(resolveRedirect('https://evil.com', '/inicio')).toBe('/inicio')
  })
})

/**
 * UX-04 — Login submit buttons enabled by default (Phase 22 / Plan 22-03).
 *
 * The `disabled={!isValid}` gate was the origin of the E2E `blur()` hack: with
 * an empty form RHF's `isValid` is false, so the button was disabled on mount
 * and the E2E helper had to blur a field to enable it. `handleSubmit(onSubmit)`
 * already blocks invalid submits AND renders `role="alert"` errors, so the gate
 * was pure friction. These tests render the real pages (supabase + auth-service
 * barrels are mocked above) and assert the button is enabled from the first paint.
 */
describe('Login submit buttons enabled by default (UX-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enables the CANDIDATE submit button on mount with an empty form', () => {
    render(
      <MemoryRouter>
        <LoginCandidatoPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /entrar/i })).not.toBeDisabled()
  })

  it('enables the RH submit button on mount with an empty form', () => {
    render(
      <MemoryRouter>
        <LoginRHPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /entrar/i })).not.toBeDisabled()
  })

  it('blocks an invalid submit without calling signIn and surfaces a validation error (no prior blur needed)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginCandidatoPage />
      </MemoryRouter>
    )
    const submit = screen.getByRole('button', { name: /entrar/i })
    expect(submit).not.toBeDisabled()
    await user.click(submit)
    // handleSubmit blocks the callback for an empty (invalid) form...
    expect(signIn).not.toHaveBeenCalled()
    // ...and populates role="alert" validation errors.
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
  })
})
