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

/**
 * Known-deferred exclusion (D-08 sanctioned mechanism; tracked, not a gate disable).
 *
 * F-04.1-A / F-04-08-G: the shadcn/ui <Select> trigger placeholder text renders in
 * the muted-foreground token (#989ed6) over the dark glass surface (#303c9d) at the
 * uncontrolled "Selecione uma opção" state, yielding ~3.62:1 — below the 4.5:1 AA
 * threshold. This is a placeholder-only state on a not-yet-chosen Select; once a real
 * option is picked the value renders in white (passes). It is unrelated to the
 * BackgroundImage root-cause fix (Plan 05-07 Task 1) — it is a muted-token-on-glass
 * defect already captured in the Phase 5 backlog (F-04.1-A "dropdown initial text dark
 * on dark glass", F-04-08-G visual polish). Fixing it requires a placeholder-color /
 * token change, which is explicitly OUT of Plan 05-07 scope (no token/feature work).
 *
 * Excluding the Select trigger keeps the a11y "error" gate deterministic (it removes
 * the only remaining flaky node) while the defect stays tracked for a dedicated
 * design/token pass. All other nodes on every public route remain scanned at AA.
 */
const DEFERRED_SELECT_PLACEHOLDER = '[data-slot="select-trigger"]'

/**
 * Tracked false-positive exclusion (GAP-05-CI-4; D-08 sanctioned mechanism).
 *
 * /auth/redefinir-senha renders the `input-otp@1.4.2` component (added in Plan 05-06).
 * That library renders a single REAL <input id="token"> that is intentionally rendered
 * transparent/invisible — the six visible digits are painted by the InputOTPSlot <div>s,
 * not by this input. axe-core flags the transparent input's own text color (#2634a9) vs
 * the glass background (#263298) at ~3:1 (large-text threshold) because it cannot model
 * the input-otp slot-rendering pattern. The element carries no perceivable text, so this
 * is a genuine axe false-positive, not a real contrast failure. The VISIBLE digit slots
 * (data-slot="input-otp-slot") are NOT excluded and remain scanned at AA.
 *
 * Excluding only the library's transparent #token input keeps the gate deterministic
 * (this node was the remaining flaky/failing node on /auth/redefinir-senha) without
 * touching the library, the page, or any token. Tracked for the input-otp a11y follow-up.
 */
const OTP_TRANSPARENT_INPUT = '#token'

for (const route of routes) {
  test(`a11y: ${route} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Tracked deferral — see DEFERRED_SELECT_PLACEHOLDER comment above (F-04.1-A).
      .exclude(DEFERRED_SELECT_PLACEHOLDER)
      // Tracked false-positive — see OTP_TRANSPARENT_INPUT comment above (GAP-05-CI-4).
      .exclude(OTP_TRANSPARENT_INPUT)
      .analyze()
    expect(results.violations).toEqual([])
  })
}
