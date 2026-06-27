---
phase: 16
slug: compliance-a11y-hardening
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-26
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright + `@axe-core/playwright@4.11.3` (a11y CI gate) · vitest 1.x (unit/cleanups/grep guards) · `tsc --noEmit` (FOUND-08 baseline) · SQL smokes N/A (NO migration this phase — auth-hook RLS already live in PROD) |
| **Config file** | `playwright.config.ts` + `vitest.config.ts` |
| **Quick run command** | `npx playwright test e2e/a11y.spec.ts --project=chromium` (a11y gate) · `npm run test:run -- <pattern>` (unit/grep) |
| **Full suite command** | `npm run test:e2e` + `npm run test:run` + `npm run lint` + `npm run build` |
| **Estimated runtime** | ~axe sweep Tier-A screens + ~16s vitest + tsc |

---

## Sampling Rate

- **After every task commit:** Run the relevant quick command (a11y gate for screen fixes; `test:run -- <pattern>` for cleanups/grep; `lint` for tsc burn-down).
- **After every plan wave:** Run `npm run test:e2e` (a11y) + `npm run test:run` + `npm run build`.
- **Before verify:** Full a11y Tier-A gate green (zero serious/critical on all mockable in-scope screens) + vitest green (incl. rh-console.grep) + tsc baseline ≤291 (no growth, ideally dropped) + RH-login round-trip PASS.
- **Max feedback latency:** ~Playwright sweep (a11y) / ~20s (vitest).

---

## Validation Architecture (from 16-RESEARCH.md)

- **Tier-A — axe-core ≥90 CI gate (the headline gate, LGPD-05):** a single UNCONDITIONAL `e2e/a11y.spec.ts` loop over the mockable main M2 screens. Each route: mock the candidate/RH session (`makeJwt` + `page.route('**/auth/v1/token**')` so `RoleGuard` sees `app_metadata.role`), run `AxeBuilder`, assert `violations.filter(v => v.impact === 'serious' || v.impact === 'critical')` is empty. `.exclude()` reuses the Phase-5 tracked-false-positive mechanism. Folds into the existing CI `e2e` job — no new workflow file. (Built in 16-01 Task 1; calibrated RED until FX fixes in 16-02/16-03 land.)
- **Tier-B — score-driven / data-dependent screens (R5/R6/R7/C5):** stay `E2E_REAL_LOGIN`-gated (skip-with-reason in CI), exercised in HUMAN-UAT.
- **Unit / tsc — cleanups:** RH console.log removal verified by the 16-01 `rh-console.grep` guard (RED→GREEN); biasMath dead-fn removal verified by `npm run build`; the 2 safe enum-typo fixes verified by the tsc baseline dropping + ci.yml lowered.
- **RH-login verify:** confirm the JWT carries `role` ∈ {`rh`,`administrador`} post-login (committed LoginRHPage fix), COLD-START login as the stress case. Automatable only with a real RH PROD account → otherwise HUMAN-UAT (16-04 Task 3 checkpoint).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 0 | LGPD-05 | T-16-01 | Tier-A mocked-session axe loop (RED gate) | a11y | `npx playwright test e2e/a11y.spec.ts --project=chromium --list` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 0 | LGPD-05 | T-16-04-Info | RH-console grep guard (RED until cleanup) | unit/grep | `npm run test:run -- rh-console.grep` | ❌ W0 | ⬜ pending |
| 16-01-03 | 01 | 0 | LGPD-05 | — | Backlog deferral docs (HARD-02/PERF-01/tsc tail) | file-exists | `test -f .planning/todos/pending/hard-02-bundle-code-splitting.md` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | LGPD-05 | T-16-02-LGPD | R7 Radix Tabs (FX-04) + accent (FX-01) | a11y/build | `npm run build && npx playwright test e2e/a11y.spec.ts --project=chromium` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 1 | LGPD-05 | T-16-02-LGPD | R7 Radix RadioGroup (FX-05) + amber/weight (FX-07/02) | a11y/build | `npm run build && npx playwright test e2e/a11y.spec.ts` | ❌ W0 | ⬜ pending |
| 16-02-03 | 02 | 1 | LGPD-05 | T-16-02-LGPD | R8 H1/amber/tooltip (FX-03/07/10) | a11y/build | `npm run build && npx playwright test e2e/a11y.spec.ts` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 1 | LGPD-05 | T-16-03-RNF07a | R6 Radix Tabs + amber/eyebrow/CTA (FX-04/07/08/12) | a11y/build | `npm run build && npx playwright test e2e/a11y.spec.ts` | ❌ W0 | ⬜ pending |
| 16-03-02 | 03 | 1 | LGPD-05 | T-16-03-RNF07a | Candidate radiogroup nav (FX-06) | a11y/build | `npm run build && npx playwright test e2e/a11y.spec.ts` | ❌ W0 | ⬜ pending |
| 16-03-03 | 03 | 1 | LGPD-05 | T-16-03-RNF07a | Cognitive tooltip + autosave + sliders (FX-09/13/11) | a11y/build | `npm run build && npx playwright test e2e/a11y.spec.ts` | ❌ W0 | ⬜ pending |
| 16-04-01 | 04 | 2 | LGPD-05 | T-16-04-Info | FX-14 console removal + FX-15 biasMath dead-fn | unit/grep/build | `npm run test:run -- rh-console.grep && npm run build` | ❌ W0 | ⬜ pending |
| 16-04-02 | 04 | 2 | LGPD-05 | — | FOUND-08 enum fixes + lower ci.yml baseline | tsc | `npm run -s lint \| grep -c "error TS"` | ❌ W0 | ⬜ pending |
| 16-04-03 | 04 | 2 | LGPD-05 | T-16-04-EoP | RH-login round-trip (committed LoginRHPage fix) | manual/UAT | HUMAN-UAT (cold-start RH login → role ∈ {rh,administrador}) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Expand `e2e/a11y.spec.ts` with the Tier-A unconditional axe loop over the mockable main M2 screens (RED until the FX fixes land — the failing axe assertions ARE the calibrated Wave-0 gate, smoke-runtime precedent). [16-01 Task 1]
- [ ] `makeJwt` + `page.route` mocked-session fixture (`e2e/fixtures/a11y-session.ts`) + `.exclude()` false-positive scaffold for the new screens. [16-01 Task 1]
- [ ] `rh-console.grep` guard authored RED (the FX-14 contract). [16-01 Task 2]
- [ ] HARD-02/PERF-01/tsc-tail deferral backlog docs written. [16-01 Task 3]

*Existing Playwright + vitest infrastructure covers the rest; `@axe-core/playwright` + Radix primitives verified installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RH-login cold-start round-trip yields JWT role ∈ {rh, administrador} | (release quality) | needs a real RH PROD account; cold-start DB latency is the stress case | log in at Login RH as a recrutador AND an administrador after an idle period; confirm landing on the RH panel (no false "sem acesso" bounce); inspect JWT app_metadata.role [16-04 Task 3] |
| Tier-B score-driven screens (R5/R6/R7/C5) pass axe under real login | LGPD-05 | RoleGuard + real funnel data needed | run `E2E_REAL_LOGIN=1` sweep or manual axe DevTools pass |
| AB-5/AB-6/AB-8 keyboard / focus / live-region | LGPD-05 | axe under-tests keyboard operability, visible focus, live regions (RESEARCH Pitfall 3) | Tab-through each radiogroup/tablist with arrow keys; confirm visible focus ring on glass; confirm SR announces autosave |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers the a11y-gate expansion + grep guard + deferral docs
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned (pending execution)
