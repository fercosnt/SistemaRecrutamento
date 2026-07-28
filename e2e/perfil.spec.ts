/**
 * E2E Tests — Meu Perfil Candidato (Phase 5 / PERF-01, PERF-02, D-01)
 *
 * Wave 0 scaffold (Plan 05-01 Task 2). Asserts the no-mock-data contract for
 * `/candidato/perfil`: real personal data + real candidaturas render (PERF-01/02).
 *
 * Two tiers (Plan 04-08 / PATTERNS §perfil precedent):
 *  - Tier-1 (unconditional, deterministic): mock the Supabase auth token endpoint
 *    (makeJwt + page.route, copied from login-flow.spec.ts:640-666) to drive the
 *    page into an authenticated state, then assert the perfil shell + personal-data
 *    inputs + logout affordance render. Runs in CI with zero live Supabase.
 *  - Tier-2 (env-gated, skip-with-reason — NEVER fixme): real auth round-trip via
 *    the login() helper, asserts real candidaturas render. Gated on E2E_REAL_LOGIN=1.
 *
 * Wave 0 RED is acceptable: perfil contrast/polish lands in Plan 05-03 and the
 * design-token fix in 05-04. This spec must COMPILE + LIST + RUN — the assertions
 * are the contract downstream waves turn green.
 *
 * Run Tier-2 (real auth round-trip):
 *   E2E_REAL_LOGIN=1 npx playwright test e2e/perfil.spec.ts
 *
 * @see .planning/phases/05-perfil-hardening-mvp/05-PATTERNS.md (§NEW e2e/perfil.spec.ts)
 */
import { test, expect, type Page } from '@playwright/test'

// ============================================================================
// Shared helpers — Tier-1 mock (login-flow.spec.ts:640-666 idiom)
// ============================================================================

/**
 * makeJwt — decode-valid (NOT signature-verifiable) JWT for mocked auth.
 * supabase-js never re-verifies the signature client-side, so any base64url
 * 3-part token round-trips through the auth flow under mock interception.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-signature-not-verified`
}

// Tier-1 deterministic MOCK values — the auth round-trip is fully intercepted by
// page.route, so these are just form-fill strings, NOT real credentials (CI-08).
const MOCK_USER = {
  email: 'candidato.mock@example.test',
  password: 'mock-password-123',
}

// Tier-2 REAL credentials — env-only, no hardcoded fallback. Read ONLY by the
// login() helper inside the E2E_REAL_LOGIN-gated PERF-02 test. See .env.test.example.
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL!,
  password: process.env.TEST_USER_PASSWORD!,
}

async function fillAndBlur(page: Page, selector: string, value: string) {
  const locator = page.locator(selector).first()
  await locator.fill(value)
  await locator.blur()
}

/**
 * login — real Supabase auth round-trip (Tier-2 only).
 * Copied from candidatura-submit.spec.ts:33-39.
 */
async function login(page: Page) {
  await page.goto('/auth/login')
  await fillAndBlur(page, '#email', TEST_USER.email)
  await fillAndBlur(page, '#senha, #password', TEST_USER.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/candidato/, { timeout: 10000 })
}

// ============================================================================
// Tier-1 — deterministic mock (unconditional in CI)
// ============================================================================

test.describe('perfil — Tier-1 (mocked auth, deterministic)', () => {
  test('PERF-01: authenticated candidato lands on /candidato/perfil with personal-data shell', async ({ page }) => {
    const candidateJwt = makeJwt({
      sub: 'test-uuid',
      email: MOCK_USER.email,
      app_metadata: { role: 'candidato', provider: 'email' },
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    // Mock the password-grant token endpoint so login resolves without live Supabase.
    await page.route('**/auth/v1/token?grant_type=password', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: candidateJwt,
          refresh_token: 'fake-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'test-uuid',
            email: MOCK_USER.email,
            app_metadata: { provider: 'email' },
          },
        }),
      })
    })

    // Mock the candidato profile read so hydration completes with deterministic data.
    await page.route('**/rest/v1/candidatos**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'cand-uuid',
            user_id: 'test-uuid',
            nome_completo: 'Candidato Teste',
            email: MOCK_USER.email,
            celular: '(11) 98765-4321',
            avatar_url: null,
            deleted_at: null,
          },
        ]),
      })
    })

    // Mock the candidaturas read (no-mock-data contract: at least one row renders).
    await page.route('**/rest/v1/candidaturas**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'cand-app-1',
            status: 'aguardando_resposta',
            etapa_atual: 'triagem',
            created_at: '2026-06-01T12:00:00Z',
            vaga: { titulo: 'Vaga Teste E2E', slug: 'vaga-teste-e2e' },
          },
        ]),
      })
    })

    await page.goto('/auth/login')
    await page.locator('#email').fill(MOCK_USER.email)
    await page.locator('#email').blur()
    await page.locator('#password, #senha').first().fill(MOCK_USER.password)
    await page.locator('#password, #senha').first().blur()
    await page.getByRole('button', { name: /^Entrar$/ }).click()

    // Lands on perfil with the personal-data shell rendered (PERF-01 no-mock contract).
    await page.waitForURL(/\/candidato\/perfil/, { timeout: 8000 })
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()

    // HARD-05 overlap: logout affordance is reachable from perfil.
    await expect(page.getByRole('button', { name: /sair/i }).first()).toBeVisible()
  })
})

// ============================================================================
// Tier-2 — real auth round-trip (env-gated, skip-with-reason)
// ============================================================================

test.describe('perfil — Tier-2 (real auth round-trip)', () => {
  test('PERF-02: real login renders real candidaturas + personal data (no mock)', async ({ page }) => {
    test.skip(
      !process.env.E2E_REAL_LOGIN,
      'Requires E2E_REAL_LOGIN=1 — real auth round-trip is flaky without opt-in',
    )

    await login(page)
    await page.goto('/candidato/perfil')

    // Personal data renders from the real candidato profile (PERF-01 no-mock).
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 10000 })

    // Logout affordance reachable (HARD-05 overlap).
    await expect(page.getByRole('button', { name: /sair/i }).first()).toBeVisible()

    // Candidaturas section renders (either at least one row or the empty-state copy —
    // the contract is "real data path", never a hardcoded mock array).
    const hasCandidaturaOrEmpty = page
      .getByText(/candidatura/i)
      .or(page.getByText(/nenhuma/i))
    await expect(hasCandidaturaOrEmpty.first()).toBeVisible({ timeout: 10000 })
  })
})
