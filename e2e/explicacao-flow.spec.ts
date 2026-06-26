/**
 * E2E Tests — Candidate LGPD Art. 20 explanation page (Phase 15 / Plan 15-04 / DECISAO-04)
 *
 * The explanation page at `/candidato/explicacao/:id` is a TRANSPARENCY surface,
 * reachable ONLY after a `decisao_final` with `decisao='rejeitado'` exists (own-row
 * RLS + the service reachability gate). These scenarios cover the gate + the revision
 * request + the idempotent "já solicitou" state:
 *   - EX-01 (reachability gate): a candidatura WITHOUT a rejeitado decision shows the
 *     "Esta página não está disponível" state (no explanation content mounts).
 *   - EX-02 (rejeitado): a rejeitado candidatura shows the heading "Sobre a sua
 *     candidatura" + the non-clinical result line + the revision CTA — NEVER a
 *     score/band/percentile (RNF-07a / LGPD-04).
 *   - EX-03 (idempotent revision): requesting revision flips the CTA to the disabled
 *     "Você já solicitou a revisão desta decisão." state.
 *
 * Gating (Plan 14-06 precedent — real auth login + a live rejected candidatura are
 * flaky in CI; gate behind explicit opt-in env flags so default `playwright test`
 * runs cleanly with skips). The live round-trip (revision notification to RH) is
 * HUMAN-UAT per 15-VALIDATION.md Manual-Only — this spec is list-parseable.
 *
 * Run with real login:
 *   E2E_REAL_LOGIN=1 npx playwright test e2e/explicacao-flow.spec.ts
 *
 * The candidate NEVER sees a score/band/threshold/percentile (RNF-07a); product
 * language is non-clinical (LGPD-04).
 */
import { test, expect, type Page } from '@playwright/test'

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
  password: process.env.TEST_USER_PASSWORD || 'teste123',
}

// A seeded candidatura with a rejeitado decision (reachable) + one without (gated).
// Provide via env when running the real-login battery; the UAT runbook seeds them.
const CANDIDATURA_REJEITADO = process.env.E2E_CANDIDATURA_REJEITADO || ''
const CANDIDATURA_SEM_DECISAO = process.env.E2E_CANDIDATURA_SEM_DECISAO || ''

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.locator('#email').first().fill(TEST_USER.email)
  await page.locator('#senha, #password').first().fill(TEST_USER.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/candidato/, { timeout: 10000 })
}

test.describe('Explicação candidato — LGPD Art. 20 (Plan 15-04 / DECISAO-04)', () => {
  test('EX-01: no rejeitado decision → "Esta página não está disponível" (gate)', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1 (real auth round-trip is flaky)')
    test.skip(
      !CANDIDATURA_SEM_DECISAO,
      'Requires E2E_CANDIDATURA_SEM_DECISAO (a candidatura with no rejeitado decision)',
    )
    await login(page)

    await page.goto(`/candidato/explicacao/${CANDIDATURA_SEM_DECISAO}`)

    // Reachability gate closed → the not-available state, never the explanation content.
    await expect(page.getByText(/Esta página não está disponível/i)).toBeVisible({
      timeout: 10000,
    })
    await expect(
      page.getByRole('heading', { name: /Sobre a sua candidatura/i }),
    ).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Voltar ao painel/i })).toBeVisible()
  })

  test('EX-02: rejeitado → explanation + revision CTA, never a score', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1')
    test.skip(
      !CANDIDATURA_REJEITADO,
      'Requires E2E_CANDIDATURA_REJEITADO (a seeded rejeitado candidatura)',
    )
    await login(page)

    await page.goto(`/candidato/explicacao/${CANDIDATURA_REJEITADO}`)

    // The explanation mounts: heading + non-clinical result line + the revision CTA.
    await expect(
      page.getByRole('heading', { name: /Sobre a sua candidatura/i }),
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByText(/decidimos não seguir com a sua candidatura nesta vaga/i),
    ).toBeVisible()
    await expect(
      page.getByText(/revisão desta decisão por uma pessoa natural/i),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Solicitar revisão por pessoa natural/i }),
    ).toBeVisible()

    // NEVER a score/band/threshold/percentile/forbidden term (RNF-07a / LGPD-04).
    const body = (await page.locator('body').textContent()) ?? ''
    expect(body).not.toMatch(
      /\bscore\b|\bbanda\b|\bpercentil|\d+\s*\/\s*\d+\s*pontos|teste psicol|QI\b/i,
    )
  })

  test('EX-03: requesting revision → disabled "já solicitou" state', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1')
    test.skip(
      !CANDIDATURA_REJEITADO,
      'Requires E2E_CANDIDATURA_REJEITADO (a rejeitado candidatura)',
    )
    await login(page)

    await page.goto(`/candidato/explicacao/${CANDIDATURA_REJEITADO}`)
    await expect(
      page.getByRole('heading', { name: /Sobre a sua candidatura/i }),
    ).toBeVisible({ timeout: 10000 })

    // Confirm the revision request via the alert-dialog.
    await page.getByRole('button', { name: /Solicitar revisão por pessoa natural/i }).click()
    await expect(page.getByText(/Solicitar revisão\?/i)).toBeVisible()
    await page.getByRole('button', { name: /^Solicitar revisão$/i }).click()

    // Idempotent: the CTA flips to the disabled "já solicitou" state.
    await expect(
      page.getByText(/Você já solicitou a revisão desta decisão/i),
    ).toBeVisible({ timeout: 15000 })
  })
})
