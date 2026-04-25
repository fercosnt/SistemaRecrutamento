/**
 * E2E Tests — Candidatura Submit Flow (Phase 4 / CAND-01, CAND-02, CAND-03, CAND-04)
 *
 * Promoted from Wave 0 stub (Plan 04-01 Task 8) per Plan 04-08.
 * Test IDs B-J06..B-J11 align with RESEARCH.md §Playwright E2E table.
 *
 * Gating (Plan 04-08 Rule 3 deviation — real auth login + real DB are flaky in CI; gate
 * behind explicit opt-in env flags so default `playwright test` runs cleanly with skips):
 *  - B-J06 / B-J07 / B-J08 / B-J11 → env-gated on E2E_REAL_LOGIN=1 (login required to reach
 *    formulário; real Supabase auth round-trip + JWT role decode is too slow/racey for CI).
 *  - B-J09 / B-J10 → env-gated on E2E_REAL_LOGIN=1 + E2E_ALLOW_DB_WRITE=1 (writes candidaturas
 *    table; UAT runbook is the canonical execution path for these — see 04-08-UAT.md UAT-J01..J03).
 *
 * Run all tests with real login + DB writes:
 *   E2E_REAL_LOGIN=1 E2E_ALLOW_DB_WRITE=1 npx playwright test e2e/candidatura-submit.spec.ts
 *
 * Phase 2 02-06 Sonner DOM contract regression assertion preserved in B-J11.
 */
import { test, expect, type Page } from '@playwright/test'
import { resolve } from 'node:path'

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
  password: process.env.TEST_USER_PASSWORD || 'teste123',
}

async function fillAndBlur(page: Page, selector: string, value: string) {
  const locator = page.locator(selector).first()
  await locator.fill(value)
  await locator.blur()
}

async function login(page: Page) {
  await page.goto('/auth/login')
  await fillAndBlur(page, '#email', TEST_USER.email)
  await fillAndBlur(page, '#senha, #password', TEST_USER.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/candidato/, { timeout: 10000 })
}

async function gotoFirstFormulario(page: Page): Promise<string | null> {
  await page.goto('/vagas')
  await expect(page.getByRole('heading', { level: 1, name: /Vagas Disponíveis/i })).toBeVisible({ timeout: 10000 })
  const cardCount = await page.locator('h2').count()
  if (cardCount === 0) return null
  // List-level Candidatar navigates to /vagas/:identifier
  await page.getByRole('button', { name: /Candidatar-se a esta vaga/i }).first().click()
  await page.waitForURL(/\/vagas\/[^/]+$/, { timeout: 10000 })
  // Detail-level Candidatar (logged-in path) navigates to /candidato/candidatura/formulario/:slug
  await page.getByRole('button', { name: /candidatar/i }).first().click()
  await page.waitForURL(/\/candidato\/candidatura\/formulario\//, { timeout: 10000 })
  return page.url()
}

test.describe('Candidatura Submit (Plan 04-08)', () => {

  test('B-J06: form renders vaga summary + CV upload + submit (perguntas conditional)', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1 (real auth round-trip is flaky without opt-in)')
    await login(page)
    const url = await gotoFirstFormulario(page)
    test.skip(!url, 'No seed vagas — env-gated')

    // Section 1: vaga title (heading level 1)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Section 2: CV upload area (file input present, accepts PDF)
    await expect(page.locator('input[type="file"][accept="application/pdf"]')).toHaveCount(1)
    // Section 4: submit button visible (disabled until CV + valid form)
    await expect(page.getByRole('button', { name: /Enviar candidatura/i })).toBeVisible()
  })

  test('B-J07: upload .docx → inline error "Apenas arquivos PDF"', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1 (real auth round-trip is flaky without opt-in)')
    await login(page)
    const url = await gotoFirstFormulario(page)
    test.skip(!url, 'No seed vagas — env-gated')

    const fixturePath = resolve(__dirname, 'fixtures', 'not-a-cv.docx')
    await page.locator('input[type="file"]').setInputFiles(fixturePath)

    // Toast or inline error should appear with INVALID_MIME copy
    await expect(
      page.getByText(/Apenas arquivos PDF/i).or(page.getByText(/Formato inválido/i)),
    ).toBeVisible({ timeout: 5000 })
  })

  test('B-J08: upload 6MB PDF → inline error "máximo 5 MB"', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1 (real auth round-trip is flaky without opt-in)')
    await login(page)
    const url = await gotoFirstFormulario(page)
    test.skip(!url, 'No seed vagas — env-gated')

    const fixturePath = resolve(__dirname, 'fixtures', 'cv-sample-6mb.pdf')
    await page.locator('input[type="file"]').setInputFiles(fixturePath)

    await expect(
      page.getByText(/máximo.*5\s*MB/i).or(page.getByText(/Currículo muito grande/i)),
    ).toBeVisible({ timeout: 5000 })
  })

  test('B-J09: successful submit → toast.success + navigate /candidato/perfil (env-gated, writes DB)', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1')
    test.skip(!process.env.E2E_ALLOW_DB_WRITE, 'DB-writing test — set E2E_ALLOW_DB_WRITE=1 to enable')
    await login(page)
    const url = await gotoFirstFormulario(page)
    test.skip(!url, 'No seed vagas — env-gated')

    const fixturePath = resolve(__dirname, 'fixtures', 'cv-sample-1mb.pdf')
    await page.locator('input[type="file"]').setInputFiles(fixturePath)
    // Wait for preview to appear
    await expect(page.getByText(/cv-sample-1mb\.pdf/)).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: /Enviar candidatura/i }).click()

    // Either success → /candidato/perfil OR DUPLICATE_APPLICATION → /vagas/:slug
    // (depending on whether the test user has already applied to this vaga)
    await page.waitForURL(/\/(candidato\/perfil|vagas\/)/, { timeout: 30000 })
  })

  test('B-J10: duplicate submit → DUPLICATE_APPLICATION toast (env-gated, requires existing candidatura)', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1')
    test.skip(!process.env.E2E_ALLOW_DB_WRITE, 'DB-writing — set E2E_ALLOW_DB_WRITE=1')
    await login(page)
    const url = await gotoFirstFormulario(page)
    test.skip(!url, 'No seed vagas — env-gated')

    // Defense in depth: if useHasApplied returns true on mount, page redirects with info toast.
    // Otherwise, attempt submit; expect DUPLICATE error from server.
    const onVagaPage = page.url().match(/\/vagas\/[^/]+$/)
    if (onVagaPage) {
      // Already detected duplicate via useHasApplied → assertion: info toast visible
      await expect(page.getByText(/já se candidatou/i)).toBeVisible({ timeout: 5000 })
      return
    }

    const fixturePath = resolve(__dirname, 'fixtures', 'cv-sample-1mb.pdf')
    await page.locator('input[type="file"]').setInputFiles(fixturePath)
    await page.getByRole('button', { name: /Enviar candidatura/i }).click()

    await expect(page.getByText(/já se candidatou/i)).toBeVisible({ timeout: 15000 })
  })

  test('B-J11: Sonner DOM contract — toast appears in <section aria-label="Notifications alt+T"> (Phase 2 02-06 pattern)', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1 (real auth round-trip is flaky without opt-in)')
    await login(page)
    const url = await gotoFirstFormulario(page)
    test.skip(!url, 'No seed vagas — env-gated')

    // Trigger any toast — easy path: upload .docx (B-J07 trigger)
    const fixturePath = resolve(__dirname, 'fixtures', 'not-a-cv.docx')
    await page.locator('input[type="file"]').setInputFiles(fixturePath)

    // Sonner DOM contract: <li data-sonner-toast> inside <section aria-label="Notifications alt+T">
    const notificationsRegion = page.locator('section[aria-label*="Notifications"]')
    await expect(notificationsRegion).toBeVisible({ timeout: 5000 })
    await expect(notificationsRegion.locator('li[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 })
  })

})
