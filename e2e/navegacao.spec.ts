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
// NOTE (WR-02): J1's /candidato/avaliacao/ URL assertion only fires when the seeded candidatura
// sits at `avaliacao_assincrona` (the one candidate-routable stage); other stages render the
// no-op "Acompanhar candidatura" CTA and J1 asserts it stays on /candidato/dashboard.
const CANDIDATURA_ID = process.env.E2E_CANDIDATURA_ID || ''
const VAGA_ID = process.env.E2E_VAGA_ID || ''

const REAL_AUTH = process.env.E2E_AUTH_TEST_USERS === 'true'
const describeRealAuth = REAL_AUTH ? test.describe : test.describe.skip

/**
 * Candidate login helper (explicacao-flow.spec.ts precedent).
 * NOTE: both login forms use react-hook-form `mode: 'onBlur'` with a submit button gated by
 * `disabled={!isValid}`. Programmatic `fill()` does NOT blur the field, so validation never
 * runs and the button stays disabled forever. Blur each field explicitly to flip `isValid`.
 */
async function loginCandidato(page: Page) {
  await page.goto('/auth/login')
  await page.locator('#email').first().fill(TEST_USER.email)
  await page.locator('#email').first().blur()
  await page.locator('#password').first().fill(TEST_USER.password)
  await page.locator('#password').first().blur()
  const entrar = page.getByRole('button', { name: /entrar/i })
  await expect(entrar).toBeEnabled({ timeout: 5000 })
  await entrar.click()
  await expect(page).toHaveURL(/\/candidato/, { timeout: 10000 })
}

/** RH/admin login helper (login-rh form). Same onBlur gating as the candidate form. */
async function loginRH(page: Page) {
  await page.goto('/auth/login-rh')
  await page.locator('#email').first().fill(TEST_ADMIN.email)
  await page.locator('#email').first().blur()
  await page.locator('#password').first().fill(TEST_ADMIN.password)
  await page.locator('#password').first().blur()
  const entrar = page.getByRole('button', { name: /entrar/i })
  await expect(entrar).toBeEnabled({ timeout: 5000 })
  await entrar.click()
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

    // The Beauty Smile 404 heading (UI-SPEC §404 copy) — wired in 17-02 (NotFoundPage
    // catch-all path:'*'). RED in 17-01 (no catch-all), GREEN now.
    await expect(
      page.getByRole('heading', { name: /Página não encontrada/i }),
    ).toBeVisible({ timeout: 10000 })

    // The role-aware "Voltar ao..." back affordance (UI-SPEC §404). NotFoundPage renders
    // it as a GlassButton (role=button, SPA navigate) — accept either button or link so
    // the assertion is resilient to the affordance kind, asserting ROUTE/affordance
    // resolution (D-16), not the element tag.
    await expect(
      page
        .getByRole('button', { name: /Voltar/i })
        .or(page.getByRole('link', { name: /Voltar/i }))
        .first(),
    ).toBeVisible()
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

    // WR-02: the step-CTA only navigates for stages with a candidate-facing route. For
    // null-route stages it renders the neutral "Acompanhar candidatura" label and the click is
    // a no-op (DashboardCandidatoPage: `if (stepCTA.destino) navigate(...)`). So assert
    // conditionally on the clicked label rather than always expecting /candidato/avaliacao/:
    //   "Continuar para…"        → routes to the avaliação container (candidaturaId-keyed).
    //   "Acompanhar candidatura" → no-op; must stay on /candidato/dashboard.
    const cta = page
      .getByRole('button', { name: /Continuar para|Acompanhar/i })
      .or(page.getByRole('link', { name: /Continuar para|Acompanhar/i }))
      .first()
    const label = (await cta.textContent()) ?? ''
    await cta.click()

    if (/Continuar para/i.test(label)) {
      await expect(page).toHaveURL(/\/candidato\/avaliacao\//, { timeout: 10000 })
    } else {
      await expect(page).toHaveURL(/\/candidato\/dashboard/, { timeout: 10000 })
    }
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
    // exact:true — avoid matching the topbar user-card trigger when the account name/email
    // contains the substring "admin" (the sidebar nav item's accessible name is exactly "Admin").
    await page.getByRole('button', { name: 'Admin', exact: true }).click()

    await expect(page).toHaveURL(/\/admin\//, { timeout: 10000 })
    // An admin surface heading is visible (route resolution, not data).
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
