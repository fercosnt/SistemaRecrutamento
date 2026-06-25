/**
 * E2E Tests — Candidate Cognitive Prova opt-in gate (Phase 14 / ENTREV-05)
 *
 * The cognitive prova at `/candidato/prova-cognitiva/:candidaturaId` is OPT-IN via
 * `vaga.aplica_cognitivo` (default false). These scenarios cover the opt-in gate
 * BOTH ways + a blocked 2nd submission:
 *   - PC-01 (opt-in OFF): aplica_cognitivo=false → the candidate sees the
 *     "Esta etapa não está disponível" empty state (no prova mounts).
 *   - PC-02 (opt-in ON): aplica_cognitivo=true → the prova flow renders (heading
 *     "Prova de raciocínio lógico" + proctoring disclosure + soft timer) up to the
 *     neutral acknowledgment "Prova registrada." — NEVER a score/band.
 *   - PC-03 (irreversible / blocked 2nd submission): after submitting, the prova is
 *     closed (neutral acknowledgment); re-opening shows the not-available / closed
 *     state — the candidate cannot submit again.
 *
 * Gating (Plan 04-08 precedent — real auth login + real DB are flaky in CI; gate
 * behind explicit opt-in env flags so default `playwright test` runs cleanly with
 * skips):
 *   - PC-01 / PC-02 / PC-03 → env-gated on E2E_REAL_LOGIN=1 (login + a seeded
 *     candidatura in an interview etapa with/without aplica_cognitivo are required;
 *     the UAT runbook is the canonical execution path — see 14-HUMAN-UAT.md).
 *
 * Run with real login:
 *   E2E_REAL_LOGIN=1 npx playwright test e2e/prova-cognitiva.spec.ts
 *
 * The candidate NEVER sees a score/band/threshold (RNF-07a); the proctoring
 * disclosure explicitly states no camera/recording/biometria; product language is
 * "prova de raciocínio lógico" (LGPD-04).
 */
import { test, expect, type Page } from '@playwright/test'

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
  password: process.env.TEST_USER_PASSWORD || 'teste123',
}

// A seeded candidatura id (opt-in ON) + one (opt-in OFF) drive the gate both ways.
// Provide via env when running the real-login battery; the UAT runbook seeds them.
const CANDIDATURA_OPTIN_ON = process.env.E2E_CANDIDATURA_COGNITIVO_ON || ''
const CANDIDATURA_OPTIN_OFF = process.env.E2E_CANDIDATURA_COGNITIVO_OFF || ''

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.locator('#email').first().fill(TEST_USER.email)
  await page.locator('#senha, #password').first().fill(TEST_USER.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/candidato/, { timeout: 10000 })
}

test.describe('Prova cognitiva — opt-in gate (Plan 14-06 / ENTREV-05)', () => {
  test('PC-01: aplica_cognitivo=false → "Esta etapa não está disponível" (no prova)', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1 (real auth round-trip is flaky without opt-in)')
    test.skip(!CANDIDATURA_OPTIN_OFF, 'Requires E2E_CANDIDATURA_COGNITIVO_OFF (a seeded opt-in-OFF candidatura)')
    await login(page)

    await page.goto(`/candidato/prova-cognitiva/${CANDIDATURA_OPTIN_OFF}`)

    // The opt-in gate is closed → the not-available empty state, never the prova.
    await expect(page.getByText(/Esta etapa não está disponível/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Prova de raciocínio lógico/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Voltar ao painel/i })).toBeVisible()
  })

  test('PC-02: aplica_cognitivo=true → prova renders + neutral acknowledgment, never a score', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1')
    test.skip(!CANDIDATURA_OPTIN_ON, 'Requires E2E_CANDIDATURA_COGNITIVO_ON (a seeded opt-in-ON candidatura with items)')
    await login(page)

    await page.goto(`/candidato/prova-cognitiva/${CANDIDATURA_OPTIN_ON}`)

    // The prova mounts: heading + transparent proctoring disclosure + soft timer.
    await expect(page.getByRole('heading', { name: /Prova de raciocínio lógico/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Nenhuma câmera, gravação ou biometria é usada/i)).toBeVisible()
    await expect(page.getByText(/Tempo nesta prova:/i)).toBeVisible()

    // Answer each item (radio-group) advancing to the last, then submit.
    // The radio options carry min-h-[44px] labels; pick the first option per item.
    // Loop bounded defensively (≤60 items in the CC0 bank).
    for (let i = 0; i < 60; i++) {
      const firstOption = page.getByRole('radio').first()
      await firstOption.check()
      const avancar = page.getByRole('button', { name: /^Avançar$/i })
      if (await avancar.isVisible().catch(() => false)) {
        await avancar.click()
      } else {
        break
      }
    }

    // Irreversible submit dialog.
    await page.getByRole('button', { name: /Concluir prova/i }).click()
    await expect(page.getByText(/Enviar prova\?/i)).toBeVisible()
    await page.getByRole('button', { name: /^Enviar prova$/i }).click()

    // Neutral acknowledgment — NEVER a score/band/threshold/pass-fail (RNF-07a).
    await expect(page.getByText(/Prova registrada\./i)).toBeVisible({ timeout: 15000 })
    const body = (await page.locator('body').textContent()) ?? ''
    expect(body).not.toMatch(/\bscore\b|\bbanda\b|\baprovad|\breprovad|\d+\s*\/\s*\d+\s*pontos|teste psicol|QI\b/i)
  })

  test('PC-03: blocked 2nd submission — re-opening after submit shows the closed state', async ({ page }) => {
    test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1')
    test.skip(!CANDIDATURA_OPTIN_ON, 'Requires E2E_CANDIDATURA_COGNITIVO_ON (already-submitted candidatura)')
    await login(page)

    // Re-opening a candidatura whose etapa has advanced (post-submit) → the prova is
    // closed: the candidate sees the not-available / etapa-advanced neutral state and
    // there is NO enabled submit path (irreversibility / back-lock — RNF-07a).
    await page.goto(`/candidato/prova-cognitiva/${CANDIDATURA_OPTIN_ON}`)
    await expect(
      page
        .getByText(/Esta etapa não está disponível/i)
        .or(page.getByText(/Sua etapa avançou/i))
        .or(page.getByText(/Prova registrada\./i)),
    ).toBeVisible({ timeout: 10000 })
    // No second "Enviar prova" submit is reachable.
    await expect(page.getByRole('button', { name: /^Enviar prova$/i })).toHaveCount(0)
  })
})
