/**
 * E2E Tests — Accessibility (axe-core) WCAG A/AA scan (Phase 5 / HARD-04, D-08)
 *
 * Wave 0 scaffold (Plan 05-01 Task 2). Runs UNCONDITIONALLY in CI — no Supabase
 * dependency. Scans the public (pre-auth) routes for WCAG 2.0/2.1 A + AA
 * violations via @axe-core/playwright.
 *
 * RED is acceptable in Wave 0: this spec WILL surface violations on the current
 * (broken-token) UI — those get FIXED in Plan 05-04 (D-08 is a fix mandate, not a
 * disable mandate). The contract this spec establishes is the downstream green gate:
 * `expect(results.violations).toEqual([])` is what 05-04 must satisfy.
 *
 * Scope note: auth-gated routes (/candidato/perfil, candidatura form) are NOT in
 * this unconditional loop — they require a real/mocked auth round-trip and live in
 * perfil.spec.ts (Tier-2) or a manual axe run. Do NOT block the public-route gate
 * on auth-gated routes.
 *
 * For known-unfixable elements this phase, prefer `.exclude(selector)` with a
 * tracking comment over disabling the whole gate (PATTERNS §a11y / D-08).
 *
 * @see .planning/phases/05-perfil-hardening-mvp/05-PATTERNS.md (§NEW e2e/a11y.spec.ts)
 * @see .planning/phases/05-perfil-hardening-mvp/05-RESEARCH.md (§Q4)
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Public (pre-auth) routes — no Supabase session required to render.
//
// Phase 5 Plan 05-06 (D-15 OTP migration): /auth/redefinir-senha is now a
// public renderable route. Under OTP entry the page no longer gates on a
// materialized deeplink recovery session — it renders the OTP + new-password
// form immediately so the user can type the 6-digit code. Added here so the
// recovery form stays at zero WCAG A/AA violations (05-04 gate, no regression).
const routes = [
  '/auth/login',
  '/auth/esqueci-senha',
  '/auth/redefinir-senha',
  '/cadastro',
  '/vagas',
]

for (const route of routes) {
  test(`a11y: ${route} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
}
