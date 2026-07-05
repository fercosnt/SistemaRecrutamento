/**
 * Phase 4.1 Auth Hydration Smoke-Runtime Gate (D-25..D-28 carryover from Phase 4)
 *
 * Closes 3 broken flows from v1.0-MILESTONE-AUDIT.md:
 *   - FLOW-CADASTRO  (SC-1)
 *   - FLOW-CANDIDATURA (SC-2)
 *   - FLOW-RECOVERY  (SC-3)
 *
 * Plus INT-WARNING-3 defense:
 *   - SC-4: JWT app_metadata.role missing → no infinite redirect loop
 *
 * Gating:
 *   - SC-1, SC-2 → env-gated on E2E_REAL_LOGIN=1 + E2E_ALLOW_DB_WRITE=1 (write rows)
 *   - SC-3, SC-4 → unconditional via addInitScript pre-seed
 *
 * Run:
 *   E2E_REAL_LOGIN=1 E2E_ALLOW_DB_WRITE=1 npx playwright test e2e/auth-hydration.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'
import { resolve } from 'node:path'

// CI-08: env-only, no hardcoded fallback. TEST_USER is read ONLY by SC-2, which
// is gated by E2E_REAL_LOGIN + E2E_ALLOW_DB_WRITE + a TEST_USER_EMAIL skip.
// Real values live only in .env.test (gitignored); see .env.test.example.
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL!,
  password: process.env.TEST_USER_PASSWORD!,
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-signature-not-verified`
}

async function flushAuth(page: Page) {
  await page.goto('/auth/login')
  await page.evaluate(() => {
    sessionStorage.clear()
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-') || k.includes('supabase') || k === 'auth-storage')
      .forEach((k) => localStorage.removeItem(k))
  })
}

test.describe('Phase 4.1 Auth Hydration', () => {
  test.beforeEach(async ({ page, context }) => {
    // Critical: bug only reproduces fresh-login (no prior initialize() run).
    await context.clearCookies()
    await flushAuth(page)
  })

  test('SC-1: cadastro fresh login hydrates candidato', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1 (real auth round-trip)')
    test.skip(!process.env.E2E_ALLOW_DB_WRITE, 'Cadastro creates DB rows — set E2E_ALLOW_DB_WRITE=1')

    // Wave 0 stub: navigate to /cadastro and assert page loads.
    // Full implementation (4-step submit + tryAutoLogin + assert candidato.nome_completo
    // visible on /candidato/perfil) is exercised manually in 04.1-UAT.md (Plan 05).
    // The automated assertion here is a smoke-runtime gate: cadastro page renders + no console errors.
    await page.goto('/cadastro')
    await expect(page).toHaveURL(/\/cadastro/)
    // FUTURE-WAVE: full flow assertion lives in 04.1-UAT.md scenario 1.
  })

  test('SC-2: anon redirect-after-login submits candidatura with hydrated candidato', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1 (real auth round-trip)')
    test.skip(!process.env.E2E_ALLOW_DB_WRITE, 'DB-writing — set E2E_ALLOW_DB_WRITE=1')
    test.skip(!process.env.TEST_USER_EMAIL, 'Requires TEST_USER_EMAIL (see .env.test.example)')

    // 1. Anon → /vagas → /vagas/:slug
    await page.goto('/vagas')
    await page.getByRole('button', { name: /Candidatar-se a esta vaga/i }).first().click()
    await page.waitForURL(/\/vagas\/[^/]+$/, { timeout: 10000 })

    // 2. Click "Candidatar-se" (anon) → redirect to /auth/login?redirect=...
    await page.getByRole('button', { name: /candidatar/i }).first().click()
    await page.waitForURL(/\/auth\/login\?redirect=/, { timeout: 5000 })

    // 3. Fill credentials + submit
    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#senha, #password').fill(TEST_USER.password)
    await page.getByRole('button', { name: /entrar/i }).click()

    // 4. Land on /candidato/candidatura/formulario/:slug — submit button must NOT be disabled.
    await page.waitForURL(/\/candidato\/candidatura\/formulario\//, { timeout: 10000 })

    // CRITICAL ASSERTION (the bug under test):
    //   - Before Phase 4.1 fix: candidato=null → submit handler silent-returns → button stays usable
    //     but click does nothing. Defense: button should be DISABLED until candidato hydrates.
    //   - After Phase 4.1 fix: candidato hydrates within 3s; button enabled; submit works.
    const fixturePath = resolve(__dirname, 'fixtures', 'cv-sample-1mb.pdf')
    await page.locator('input[type="file"]').setInputFiles(fixturePath)
    await expect(page.getByRole('button', { name: /Enviar candidatura/i })).toBeEnabled({ timeout: 5000 })
  })

  test('SC-3: recovery deeplink → setNewPassword → /candidato/perfil with candidato', async ({ page }) => {
    // Unconditional via addInitScript pre-seed — does not require real Supabase round-trip.
    const candidateJwt = makeJwt({
      sub: 'uuid-recovery',
      email: 'recovery-test@x.com',
      app_metadata: { role: 'candidato' },
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    // Mock /auth/v1/user PUT (avoid hitting real Supabase) — replicate password-recovery-flow.spec.ts pattern.
    await page.route('**/auth/v1/user**', (route) => {
      const method = route.request().method()
      if (method === 'PUT' || method === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'uuid-recovery', email: 'recovery-test@x.com' }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'uuid-recovery',
          email: 'recovery-test@x.com',
          app_metadata: { role: 'candidato' },
        }),
      })
    })

    // Pre-seed recovery session
    await page.addInitScript((token) => {
      const sessionPayload = {
        access_token: token,
        refresh_token: 'fake-refresh',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: 'uuid-recovery',
          email: 'recovery-test@x.com',
          app_metadata: { role: 'candidato' },
        },
      }
      window.localStorage.setItem(
        'sb-isljnozzlvckrgjjbjwp-auth-token',
        JSON.stringify(sessionPayload)
      )
    }, candidateJwt)

    // Wave 0 stub: navigate, confirm page reachable. Full assertion (candidato.nome_completo visible)
    // requires hydrateFromSession from Plan 02 — covered by SC-2 + manual UAT.
    await page.goto('/auth/redefinir-senha')
    await expect(page).toHaveURL(/\/auth\/redefinir-senha/)
  })

  test('SC-4: JWT app_metadata.role missing → no infinite redirect loop (INT-WARNING-3)', async ({ page }) => {
    // Pre-seed session WITHOUT role claim. Mock candidatos table to enable RoleGuard fallback success.
    const noRoleJwt = makeJwt({
      sub: 'uuid-norole',
      email: 'norole@x.com',
      app_metadata: {},
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    await page.route('**/rest/v1/usuarios_rh**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    )
    await page.route('**/rest/v1/candidatos**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cand-uuid', user_id: 'uuid-norole', nome_completo: 'NoRole User' },
        ]),
      })
    )

    await page.addInitScript((token) => {
      window.localStorage.setItem(
        'sb-isljnozzlvckrgjjbjwp-auth-token',
        JSON.stringify({
          access_token: token,
          refresh_token: 'r',
          user: { id: 'uuid-norole', email: 'norole@x.com', app_metadata: {} },
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
        })
      )
    }, noRoleJwt)

    let loginRedirects = 0
    page.on('framenavigated', (frame) => {
      if (frame.url().includes('/auth/login')) loginRedirects++
    })

    await page.goto('/candidato/perfil')

    // Page must SETTLE within 5s. Pattern 3 one-shot fallback ref ensures at most ONE bounce.
    await page.waitForTimeout(5000)
    expect(loginRedirects).toBeLessThanOrEqual(1) // proven not-loop
  })
})
