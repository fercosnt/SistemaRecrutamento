/**
 * E2E Tests — Fluxo de Recuperação de Senha (OTP) — Phase 5 Plan 05-06
 *
 * REWRITTEN for the PKCE→OTP migration (D-15/D-16). The recovery flow no longer
 * uses a magic-link deeplink with `?code=`/`?access_token=` + a
 * `useRecoverySession` state machine. Instead:
 *
 *   1. EsqueciSenhaPage: user submits email → resetPasswordForEmail → neutral
 *      success card ("Verifique seu email" / code copy) → "Já tenho o código"
 *      navigates to /auth/redefinir-senha carrying the email in router state.
 *   2. RedefinirSenhaPage: user types the 6-digit OTP (input-otp) + the new
 *      password → verifyOtp({type:'recovery'}) → updateUser → /candidato/perfil.
 *
 * Why OTP: the PKCE `code_verifier` deeplink failed cross-browser (Phase 3
 * 03-07 finding). OTP entry is flowType-independent — the ISSUE-006 deeplink
 * hash-fragment flakiness disappears, so B10 is now UNCONDITIONAL.
 *
 * Tiers:
 *   - Unconditional (every CI run): B9 (neutral copy / anti-enumeration),
 *     B10 (OTP verify mocked → form submit → success), B12 (redefinir renders
 *     the OTP form), B15 (Sonner DOM contract).
 *   - Tier-2 real-email (skip-with-reason, NEVER a deferred-stub — D-04): the
 *     real-inbox round-trip requires a human reading a real 6-digit code; it
 *     lives in the manual UAT runbook (Task 4 of 05-06-PLAN).
 *
 * Mock idiom: page.route('** /auth/v1/verify', ...) mirrors
 * login-flow.spec.ts:654 — GoTrue's verifyOtp posts to /auth/v1/verify.
 *
 * @see .planning/phases/05-perfil-hardening-mvp/05-06-PLAN.md
 * @see .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md (B9/B10/B12/B15)
 */

import { test, expect } from '@playwright/test'

// CI-08: env-only, no hardcoded fallback. TEST_USER is referenced ONLY by the
// always-skipped Tier-2 manual-UAT test (`void TEST_USER.email`). See .env.test.example.
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL!,
}

/**
 * makeJwt — creates a decode-valid JWT (NOT signature-verifiable) used in the
 * mocked verifyOtp/updateUser responses so the SDK can materialize a session.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-signature-not-verified`
}

test.describe('password-recovery (OTP) — Phase 5 Plan 05-06', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Wipe any sb-* state from prior tests so getSession() does not leak a
    // session from a previous test in the file.
    await page.goto('/auth/login')
    await page.evaluate(() => {
      sessionStorage.clear()
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
        .forEach((k) => localStorage.removeItem(k))
    })
  })

  // ─── B9 (unconditional) — esqueci-senha neutral copy / anti-enumeration ───
  test('B9: esqueci-senha submit shows neutral success regardless of email existence (D-09)', async ({
    page,
  }) => {
    // Intercept resetPasswordForEmail so no real recovery email is minted.
    await page.route('**/auth/v1/recover', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      })
    })

    await page.goto('/auth/esqueci-senha')
    // #id locator: the label renders an asterisk sibling <span>, so getByLabel
    // string-matching may flake; #id is unambiguous.
    await page.locator('#email').fill('any-email@test.com')
    await page.getByRole('button', { name: /Enviar instruções/i }).click()

    // Neutral success card copy — now OTP/code-based (D-15), still no email echo.
    await expect(
      page.getByRole('heading', { name: 'Verifique seu email' }),
    ).toBeVisible({ timeout: 4000 })
    await expect(
      page.getByText(
        'Se o email estiver cadastrado, enviamos um código de 6 dígitos de recuperação',
      ),
    ).toBeVisible()
    await expect(page.getByText('O código expira em 1 hora.')).toBeVisible()

    // D-09 anti-enumeration: the submitted email is NEVER rendered.
    await expect(page.getByText(/any-email@test\.com/)).not.toBeVisible()
  })

  // ─── B12 (unconditional) — redefinir-senha renders the OTP form ──────────
  // Under OTP there is no longer a deeplink-gated "validating → invalid" state
  // machine: the form (OTP input + password fields) renders immediately so the
  // user can type the code from the email.
  test('B12: /auth/redefinir-senha renders the OTP + new-password form immediately', async ({
    page,
  }) => {
    await page.goto('/auth/redefinir-senha')

    await expect(
      page.getByRole('heading', { name: 'Nova senha', exact: true }),
    ).toBeVisible({ timeout: 4000 })

    // The 6-digit OTP input is present (input-otp renders a hidden input
    // carrying the aria-label) BEFORE the password fields.
    await expect(
      page.getByLabel('Código de verificação de 6 dígitos'),
    ).toBeVisible()
    // #id locators avoid the eye-toggle aria-label partial-match.
    await expect(page.locator('#nova_senha')).toBeVisible()
    await expect(page.locator('#confirmar_nova_senha')).toBeVisible()

    // No leftover deeplink-era invalid-link state.
    await expect(page.getByText('Link inválido ou expirado')).not.toBeVisible()
    await expect(page.getByText('Validando seu link...')).not.toBeVisible()
  })

  // ─── B12b — direct navigation (no router state) shows the email field ─────
  test('B12b: direct navigation to /auth/redefinir-senha exposes an email field (no router state)', async ({
    page,
  }) => {
    await page.goto('/auth/redefinir-senha')
    await expect(
      page.getByRole('heading', { name: 'Nova senha', exact: true }),
    ).toBeVisible({ timeout: 4000 })
    // Without an email carried in router state, the page asks for it.
    await expect(page.locator('#recovery_email')).toBeVisible()
  })

  // ─── B10 (UNCONDITIONAL) — OTP verify mocked → form submit → success ─────
  // The ISSUE-006 deeplink flakiness is GONE under OTP entry, so this is now an
  // unconditional CI test (never deferred/stubbed). We mock /auth/v1/verify (verifyOtp)
  // and /auth/v1/user (updateUser) and drive the full form.
  test('B10: type OTP + new password → verifyOtp + updateUser → success toast + redirect', async ({
    page,
  }) => {
    const candidateJwt = makeJwt({
      sub: 'uuid-otp',
      email: 'otp-test@x.com',
      app_metadata: { role: 'candidato' },
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    // verifyOtp({type:'recovery'}) posts to /auth/v1/verify → return a session.
    await page.route('**/auth/v1/verify**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: candidateJwt,
          refresh_token: 'fake-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: 'uuid-otp',
            email: 'otp-test@x.com',
            app_metadata: { role: 'candidato' },
          },
        }),
      })
    })

    // updateUser (setNewPassword) — PUT /auth/v1/user; GET used internally.
    await page.route('**/auth/v1/user**', (route) => {
      const method = route.request().method()
      if (method === 'PUT' || method === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'uuid-otp',
            email: 'otp-test@x.com',
            app_metadata: { role: 'candidato' },
          }),
        })
      } else {
        route.continue()
      }
    })

    // GAP-05-CI-3: after verifyOtp + updateUser succeed and the success toast fires,
    // navigate('/candidato/perfil') runs — but RoleGuard bounces back to /auth/login
    // because `candidato` never hydrates (the candidatos profile read is unmocked under
    // placeholder Supabase). Mock the candidatos read (idiom from perfil.spec.ts:97-113)
    // with user_id 'uuid-otp' / email 'otp-test@x.com' to match the B10 JWT sub/email,
    // so waitForCandidatoHydrated resolves and /candidato/perfil renders.
    await page.route('**/rest/v1/candidatos**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'cand-uuid',
            user_id: 'uuid-otp',
            nome_completo: 'Candidato Teste',
            email: 'otp-test@x.com',
            celular: '(11) 98765-4321',
            avatar_url: null,
            deleted_at: null,
          },
        ]),
      })
    })

    // Carry the email in router state by going through EsqueciSenhaPage first.
    await page.route('**/auth/v1/recover', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      })
    })
    await page.goto('/auth/esqueci-senha')
    await page.locator('#email').fill('otp-test@x.com')
    await page.getByRole('button', { name: /Enviar instruções/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Verifique seu email' }),
    ).toBeVisible({ timeout: 4000 })
    await page.getByRole('button', { name: /Já tenho o código/i }).click()

    // Now on RedefinirSenhaPage with email carried in state (no email field).
    await expect(
      page.getByRole('heading', { name: 'Nova senha', exact: true }),
    ).toBeVisible({ timeout: 4000 })

    // Type the 6-digit OTP into the input-otp hidden input.
    await page.getByLabel('Código de verificação de 6 dígitos').fill('123456')
    await page.locator('#nova_senha').fill('NovaSenha123')
    await page.locator('#nova_senha').blur()
    await page.locator('#confirmar_nova_senha').fill('NovaSenha123')
    await page.locator('#confirmar_nova_senha').blur()

    await page.getByRole('button', { name: /Redefinir senha/i }).click()

    const toastRegion = page.getByLabel('Notifications alt+T')
    await expect(
      toastRegion.getByText('Senha alterada com sucesso.'),
    ).toBeVisible({ timeout: 5000 })
    await page.waitForURL(/\/candidato\/perfil/, { timeout: 5000 })
  })

  // ─── B10b — invalid/expired OTP → field error + neutral toast ────────────
  test('B10b: invalid OTP (verify 401) → "Código inválido ou expirado" error', async ({
    page,
  }) => {
    await page.route('**/auth/v1/verify**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'otp_expired',
          error_code: 'otp_expired',
          msg: 'Token has expired or is invalid',
        }),
      })
    })
    await page.route('**/auth/v1/recover', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    await page.goto('/auth/esqueci-senha')
    await page.locator('#email').fill('otp-bad@x.com')
    await page.getByRole('button', { name: /Enviar instruções/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Verifique seu email' }),
    ).toBeVisible({ timeout: 4000 })
    await page.getByRole('button', { name: /Já tenho o código/i }).click()

    await page.getByLabel('Código de verificação de 6 dígitos').fill('000000')
    await page.locator('#nova_senha').fill('NovaSenha123')
    await page.locator('#nova_senha').blur()
    await page.locator('#confirmar_nova_senha').fill('NovaSenha123')
    await page.locator('#confirmar_nova_senha').blur()
    await page.getByRole('button', { name: /Redefinir senha/i }).click()

    await expect(
      page.getByText(/Código inválido ou expirado/i).first(),
    ).toBeVisible({ timeout: 5000 })
    // Must NOT navigate away on a bad code.
    await expect(page).toHaveURL(/\/auth\/redefinir-senha/)
  })

  // ─── B15 — Sonner DOM regression on esqueci-senha ────────────────────────
  test('B15: Sonner DOM contract on esqueci-senha — toast renders inside Notifications region', async ({
    page,
  }) => {
    await page.route('**/auth/v1/recover', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto('/auth/esqueci-senha')
    await page.locator('#email').fill('x@y.com')
    await page.getByRole('button', { name: /Enviar instruções/i }).click()
    const toastRegion = page.getByLabel('Notifications alt+T')
    await expect(toastRegion.locator('[data-sonner-toast]')).toBeVisible({
      timeout: 2000,
    })
  })

  // ─── Tier-2 (skip-with-reason — D-04, NEVER a deferred-stub) ─────────────
  // The real-inbox cross-browser OTP round-trip requires a human reading a real
  // 6-digit code from a real email. It cannot run unattended in CI and lives in
  // the manual UAT runbook (05-06-PLAN Task 4). Documented here so the coverage
  // gap is explicit and greppable.
  test('Tier-2: real-email cross-browser OTP recovery (manual UAT)', async () => {
    test.skip(
      true,
      'Real 6-digit OTP requires a human reading a real inbox + a second browser — covered by the manual UAT runbook (05-06-PLAN Task 4), not unattended CI.',
    )
    // Intentionally references TEST_USER so the constant is not flagged unused
    // and so a future authenticated harness has the entrypoint wired.
    void TEST_USER.email
  })
})
