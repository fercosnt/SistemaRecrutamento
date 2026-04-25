/**
 * E2E Tests — Vagas Public Browse Flow (Phase 4 / VAGA-01, VAGA-02, VAGA-03)
 *
 * Promoted from Wave 0 stub (Plan 04-01 Task 8) per Plan 04-08.
 * Test IDs B-J01..B-J05 align with RESEARCH.md §Playwright E2E table.
 *
 * Gating:
 *  - B-J01 / B-J03 / B-J05 → unconditional (anon-only / no DB write).
 *  - B-J02 → unconditional but env-skipped if dev DB has zero seed vagas.
 *  - B-J04 → env-gated on TEST_USER_EMAIL (requires real candidato login).
 */
import { test, expect, type Page } from '@playwright/test'

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
  password: process.env.TEST_USER_PASSWORD || 'teste123',
}

async function fillAndBlur(page: Page, selector: string, value: string) {
  const locator = page.locator(selector).first()
  await locator.fill(value)
  await locator.blur()
}

test.describe('Vagas Public Browse (Plan 04-08)', () => {

  test('B-J01: anon visits /vagas and sees the list region', async ({ page }) => {
    await page.goto('/vagas')
    // VagasPublicasPage always renders h1 "Vagas Disponíveis" + the resultados counter,
    // even with zero seed vagas (empty-state branch). Both are valid acceptance per VAGA-01.
    await expect(page.getByRole('heading', { level: 1, name: /Vagas Disponíveis/i })).toBeVisible({ timeout: 10000 })
    // Either >= 1 vaga card (h2 with vaga title) OR the empty-state copy "Nenhuma vaga encontrada"
    const cardTitle = page.locator('h2').first()
    const empty = page.getByText(/Nenhuma vaga encontrada|sem vagas|nenhum resultado/i)
    await expect(cardTitle.or(empty.first())).toBeVisible({ timeout: 10000 })
    // Anon = no auth-protected element visible
    await expect(page.getByRole('button', { name: /sair|logout/i })).not.toBeVisible()
  })

  test('B-J02: anon clicks vaga card → arrives at /vagas/:slug (slug-shaped, not UUID)', async ({ page }) => {
    await page.goto('/vagas')
    await expect(page.getByRole('heading', { level: 1, name: /Vagas Disponíveis/i })).toBeVisible({ timeout: 10000 })
    // Card detection: h2 elements inside the vagas list (page-level h2 only renders when ≥ 1 vaga)
    const cardCount = await page.locator('h2').count()
    test.skip(cardCount === 0, 'No seed vagas in dev DB — env-gated')

    // Click the first "Candidatar-se" button — handleCandidatar navigates to /vagas/:identifier (D-01)
    await page.getByRole('button', { name: /Candidatar-se a esta vaga/i }).first().click()
    await page.waitForURL(/\/vagas\/[a-z0-9-]+/, { timeout: 10000 })
    const url = page.url()
    // Slug should NOT match UUID pattern (D-01 — vagas use slugs in URL)
    expect(url).not.toMatch(/\/vagas\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    // Detail page title visible (h1 of the specific vaga)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('B-J03: anon clicks Candidatar-se → redirected to /auth/login?redirect=...', async ({ page }) => {
    await page.goto('/vagas')
    await expect(page.getByRole('heading', { level: 1, name: /Vagas Disponíveis/i })).toBeVisible({ timeout: 10000 })
    const cardCount = await page.locator('h2').count()
    test.skip(cardCount === 0, 'No seed vagas — env-gated')

    // List-level Candidatar navigates to /vagas/:identifier (handleCandidatar in VagasPublicasPage)
    await page.getByRole('button', { name: /Candidatar-se a esta vaga/i }).first().click()
    await page.waitForURL(/\/vagas\/[^/]+$/, { timeout: 10000 })
    // Detail-level Candidatar (VagaDetalhePage) — clicking when anon redirects to /auth/login
    const detailCandidatarBtn = page.getByRole('button', { name: /candidatar-se|candidatar me|candidatar/i }).first()
    await detailCandidatarBtn.click()

    await page.waitForURL(/\/auth\/login\?redirect=/, { timeout: 10000 })
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toMatch(/\/candidato\/candidatura\/formulario\//)
  })

  test('B-J04: after login, lands on /candidato/candidatura/formulario/:slug', async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL, 'Requires TEST_USER_EMAIL env var')
    // Step 1: anon → /vagas → click Candidatar-se from list → /vagas/:slug → click Candidatar from detail → /auth/login?redirect=...
    await page.goto('/vagas')
    await expect(page.getByRole('heading', { level: 1, name: /Vagas Disponíveis/i })).toBeVisible({ timeout: 10000 })
    const cardCount = await page.locator('h2').count()
    test.skip(cardCount === 0, 'No seed vagas — env-gated')
    await page.getByRole('button', { name: /Candidatar-se a esta vaga/i }).first().click()
    await page.waitForURL(/\/vagas\/[^/]+$/, { timeout: 10000 })
    await page.getByRole('button', { name: /candidatar/i }).first().click()
    await page.waitForURL(/\/auth\/login\?redirect=/, { timeout: 10000 })
    // Step 2: log in (use #id selectors + .blur() per Phase 3 03-07 Rule 1 auto-fix)
    await fillAndBlur(page, '#email', TEST_USER.email)
    await fillAndBlur(page, '#senha, #password', TEST_USER.password)
    await page.getByRole('button', { name: /entrar/i }).click()
    // Expected: lands on formulário, NOT back on /vagas/:slug
    await page.waitForURL(/\/candidato\/candidatura\/formulario\//, { timeout: 15000 })
  })

  test('B-J05: /vagas/<invalid-slug> shows VagaNotFoundState', async ({ page }) => {
    await page.goto('/vagas/this-slug-definitely-does-not-exist-04-08-test')
    // Allow time for the query to resolve + 404 state to render
    await expect(
      page.getByText(/Vaga não encontrada ou não está mais ativa/i),
    ).toBeVisible({ timeout: 10000 })
    // CTA present
    await expect(page.getByRole('button', { name: /Voltar para vagas/i })).toBeVisible()
  })

})
