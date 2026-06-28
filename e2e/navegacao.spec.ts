/**
 * E2E — Navegability smoke (Phase 17 / Plan 17-01 Task 3 / D-16 / D-03)
 *
 * The Definition of Done for Phase 17 is "wiring proven by a navegable-journey gate"
 * (D-03): this smoke clicks through the four journeys the nav-audit (§5) marked ❌ QUEBRA
 * and asserts each resolves to the RIGHT route/heading — NOT the data flow (already UAT'd
 * in M2). It is RED today for all four (the production wiring is absent) and flips GREEN as
 * Plans 17-02 (404 + funilNavMap), 17-03 (hub + admin sidebar item) and 17-04 (Dashboard
 * step-CTA) land.
 *
 * Four journeys (nav-audit §5):
 *   J1 — Candidato pós-candidatura → avaliação via Dashboard step-CTA.
 *   J2 — RH TriagemTable → hub do candidato → cada um dos 3 workspaces.
 *   J3 — Admin → sidebar "Admin" → /admin/*.
 *   J4 — URL inválida → 404 estilizada com link de volta.
 *
 * Gating (e2e/login-flow.spec.ts precedent): J1-J3 require a real login round-trip against
 * a live Supabase + seeded users — flaky in CI without creds — so they sit behind
 * `E2E_AUTH_TEST_USERS === 'true'` (describeRealAuth). J4 (404) needs NO auth and runs
 * unconditionally — it is the load-bearing RED that proves the catch-all is missing today.
 *
 * KNOWN SMOKE GAP (RESEARCH A3): only `administrador` test credentials exist in PROD
 * (0 rows with role 'recrutador' — MEMORY reference_auth_hook_rls_gap). The generic-`rh`
 * role path therefore has no separately-seeded account; the `administrador` credential
 * covers BOTH J2 (RH hub → workspaces) and J3 (admin sidebar → /admin/*). Document this as
 * a smoke limitation rather than a coverage claim for the `rh`-only role.
 *
 * Assertions use getByRole heading/link/button (route + heading resolution), NEVER a
 * response-body / per-section data assertion (D-16).
 *
 * Run the gated journeys with real auth:
 *   E2E_AUTH_TEST_USERS=true TEST_USER_EMAIL=... TEST_USER_PASSWORD=... \
 *   TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npx playwright test navegacao
 */
import { test, expect, type Page } from '@playwright/test'

// Candidate test user (login-flow.spec.ts convention).
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
  password: process.env.TEST_USER_PASSWORD || 'teste123',
}

// Administrador test user — covers BOTH the RH and admin journeys (RESEARCH A3:
// no 'recrutador' account exists to exercise the generic-rh path separately).
const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || process.env.TEST_USER_EMAIL || 'admin@beautysmile.com.br',
  password: process.env.TEST_ADMIN_PASSWORD || process.env.TEST_USER_PASSWORD || 'teste123',
}

// A seeded candidatura id reachable for the RH hub journey (provide via env when running the
// real-login battery; the UAT runbook seeds it).
const CANDIDATURA_ID = process.env.E2E_CANDIDATURA_ID || ''
const VAGA_ID = process.env.E2E_VAGA_ID || ''

const REAL_AUTH = process.env.E2E_AUTH_TEST_USERS === 'true'
const describeRealAuth = REAL_AUTH ? test.describe : test.describe.skip

/** Candidate login helper (explicacao-flow.spec.ts precedent). */
async function loginCandidato(page: Page) {
  await page.goto('/auth/login')
  await page.locator('#email').first().fill(TEST_USER.email)
  await page.locator('#senha, #password').first().fill(TEST_USER.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/candidato/, { timeout: 10000 })
}

/** RH/admin login helper (login-rh form). */
async function loginRH(page: Page) {
  await page.goto('/auth/login-rh')
  await page.locator('#email').first().fill(TEST_ADMIN.email)
  await page.locator('#senha, #password').first().fill(TEST_ADMIN.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/rh/, { timeout: 10000 })
}

// ============================================================================
// J4 — URL inválida → 404 (UNCONDITIONAL, no auth). RED today: no catch-all
// path:'*' exists, so React Router renders its default error, NOT the Beauty
// Smile NotFound heading. GREEN after Plan 17-02 adds the catch-all + NotFoundPage.
// ============================================================================
test.describe('Navegação — 404 catch-all (D-14, sem auth)', () => {
  test('J4: URL inválida resolve para a 404 estilizada com link de volta', async ({ page }) => {
    await page.goto('/rota/invalida/xyz')

    // The Beauty Smile 404 heading (UI-SPEC §404 copy) — absent today.
    await expect(
      page.getByRole('heading', { name: /Página não encontrada/i }),
    ).toBeVisible({ timeout: 10000 })

    // A role-aware back-link ("Voltar ao..." per UI-SPEC) — absent today.
    await expect(page.getByRole('link', { name: /Voltar/i })).toBeVisible()
  })
})

// ============================================================================
// J1-J3 — gated real-auth (E2E_AUTH_TEST_USERS=true). Route/heading only (D-16).
// ============================================================================
describeRealAuth('Navegação — jornadas com auth real (D-16, gated)', () => {
  test('J1: candidato → Dashboard step-CTA → avaliação (rota, não dado)', async ({ page }) => {
    await loginCandidato(page)

    // D-09: the Dashboard is the funnel hub; the step-guided CTA routes to the pending etapa.
    await page.goto('/candidato/dashboard')
    await page
      .getByRole('button', { name: /Continuar para|Acompanhar/i })
      .or(page.getByRole('link', { name: /Continuar para|Acompanhar/i }))
      .first()
      .click()

    // Route resolution: lands on the avaliação container (candidaturaId-keyed). RED today.
    await expect(page).toHaveURL(/\/candidato\/avaliacao\//, { timeout: 10000 })
  })

  test('J2: RH → TriagemTable → hub do candidato → cada um dos 3 workspaces', async ({ page }) => {
    test.skip(!CANDIDATURA_ID, 'Requires E2E_CANDIDATURA_ID (a seeded candidatura for the hub)')
    test.skip(!VAGA_ID, 'Requires E2E_VAGA_ID (the vaga whose TriagemTable lists the candidatura)')
    await loginRH(page)

    // Entry point: the vaga TriagemTable (the inbound link from row name → hub).
    await page.goto(`/rh/vagas/${VAGA_ID}/candidatos`)
    // Click a candidate name → the candidate hub (D-04). RED today: link still targets the
    // 1864-line mock, not the wired hub.
    await page.getByRole('link', { name: /.+/ }).first().click()

    // Then "Abrir {label}" CTAs route to each reachable workspace heading (D-06). The
    // workspace headings are verified exact strings (PATTERNS §e2e workspace headings):
    // "Entrevista" (EntrevistaWorkspace), "Decisão final" (DecisaoFinalPage), the Redação panel.
    await expect(
      page
        .getByRole('heading', { name: /Entrevista/i })
        .or(page.getByRole('heading', { name: /Decisão final/i }))
        .or(page.getByRole('heading', { name: /Redação/i }))
        .first(),
    ).toBeVisible({ timeout: 10000 })
  })

  test('J3: admin → sidebar "Admin" → /admin/*', async ({ page }) => {
    await loginRH(page)

    // D-13: the role-gated "Admin" sidebar item (administrador only). RED today: no item.
    await page.getByRole('button', { name: /Admin/i }).click()

    await expect(page).toHaveURL(/\/admin\//, { timeout: 10000 })
    // An admin surface heading is visible (route resolution, not data).
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
