---
phase: 16
slug: compliance-a11y-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-26
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright + `@axe-core/playwright@4.11.3` (a11y CI gate) · vitest 1.x (unit/cleanups) · `tsc --noEmit` (FOUND-08 baseline) · SQL smokes N/A (NO migration this phase — auth-hook RLS already live in PROD) |
| **Config file** | `playwright.config.ts` + `vitest.config.ts` |
| **Quick run command** | `npx playwright test e2e/a11y.spec.ts` (a11y gate) · `npm run test:run -- <pattern>` (unit) |
| **Full suite command** | `npm run test:e2e` + `npm run test:run` + `npm run lint` |
| **Estimated runtime** | ~axe sweep 16 screens (Tier-A) + ~16s vitest + tsc |

---

## Sampling Rate

- **After every task commit:** Run the relevant quick command (a11y gate for screen fixes; `test:run -- <pattern>` for cleanups; `lint` for tsc burn-down).
- **After every plan wave:** Run `npm run test:e2e` (a11y) + `npm run test:run` + `npm run build`.
- **Before verify:** Full a11y gate green (zero serious/critical on all in-scope screens) + vitest green + tsc baseline ≤291 (no growth).
- **Max feedback latency:** ~Playwright sweep (a11y) / ~20s (vitest).

---

## Validation Architecture (from 16-RESEARCH.md)

- **Tier-A — axe-core ≥90 CI gate (the headline gate, LGPD-05):** a single UNCONDITIONAL `e2e/a11y.spec.ts` loop over the in-scope main M2 screens. Each route: mock the candidate/RH session (`makeJwt` + `page.route('**/auth/v1/token**')` so `RoleGuard` sees `app_metadata.role`), run `AxeBuilder`, assert `violations.filter(v => v.impact === 'serious' || v.impact === 'critical')` is empty. `.exclude()` reuses the Phase-5 tracked-false-positive mechanism. Folds into the existing CI `e2e` job — no new workflow file.
- **Tier-B — score-driven / data-dependent screens:** stay `E2E_REAL_LOGIN`-gated (skip-with-reason in CI), exercised in HUMAN-UAT.
- **Unit / tsc — cleanups:** the 4 misc cleanups (dead Agendar CTA, autosave-copy-mismatch, RH console.log, biasMath dead-fn removal) verified by vitest + grep + `tsc` no-growth. The 2 safe enum-typo tsc fixes verified by the baseline dropping.
- **RH-login verify:** confirm the JWT carries `role` ∈ {`rh`,`administrador`} post-login (hook + LoginRHPage fix), with a COLD-START login as the stress case. Automatable only with a real RH PROD account → otherwise HUMAN-UAT.

---

## Per-Task Verification Map

> Populated by the planner per plan/task. Each behavior-adding task carries an `<automated>` verify
> (axe assertion, vitest pattern, or grep/tsc assertion).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-NN-NN | NN | N | LGPD-05 | — | (planner fills) | a11y/unit | `npx playwright test e2e/a11y.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Expand `e2e/a11y.spec.ts` with the Tier-A unconditional axe loop over the in-scope main M2 screens (RED until the FX fixes land — the failing axe assertions ARE the calibrated Wave-0 gate, smoke-runtime precedent).
- [ ] Confirm the `makeJwt` + `page.route` mocked-session idiom + `.exclude()` false-positive list scaffold exists for the new screens.

*Existing Playwright + vitest infrastructure covers the rest; `@axe-core/playwright` + Radix primitives verified installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RH-login cold-start round-trip yields JWT role ∈ {rh, administrador} | (release quality) | needs a real RH PROD account; cold-start DB latency is the stress case | log in at Login RH as a recrutador AND an administrador after an idle period; confirm landing on the RH panel (no false "sem acesso" bounce) |
| Tier-B score-driven screens pass axe under real login | LGPD-05 | RoleGuard + real funnel data needed | run `E2E_REAL_LOGIN=1` sweep or manual axe DevTools pass |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers the a11y-gate expansion
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
