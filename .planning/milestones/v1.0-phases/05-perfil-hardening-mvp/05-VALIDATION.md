---
phase: 5
slug: perfil-hardening-mvp
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-06
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 05-RESEARCH.md §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.7 (unit) + Playwright 1.56.1 (E2E) |
| **Config file** | `playwright.config.ts` (3 projects); Vitest config inline in `vite.config.ts` (no separate vitest.config.*) |
| **Quick run command** | `npm run test:run` (Vitest) / `npx playwright test --project=chromium --grep "<id>"` |
| **Full suite command** | `npm run test:run && npx playwright test` |
| **Estimated runtime** | ~90s Vitest + ~60s Playwright chromium (deterministic core) |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint` (baseline **296** zero-growth invariant) + `npm run test:run`
- **After every plan wave:** Run full Vitest + `npx playwright test --project=chromium` + `lhci autorun` (once LHCI lands)
- **Before `/gsd:verify-work`:** Full suite green + LHCI >80 (Perf+A11y) + axe zero-violations + manual iPhone 12 Pro UAT
- **Max feedback latency:** ~90 seconds (Vitest quick run)

---

## Per-Task Verification Map

> Filled by the planner per task. Requirement → test mapping derived from research:

| Req ID | Behavior | Test Type | Automated Command | File Exists |
|--------|----------|-----------|-------------------|-------------|
| PERF-01/02 | Perfil renders real candidaturas + personal data (no mock) | E2E (Tier-2 auth) + manual smoke-runtime | `npx playwright test --grep "perfil"` | ❌ Wave 0 (new `e2e/perfil.spec.ts`) |
| HARD-01 | Deterministic core green in CI | E2E unconditional | `npx playwright test --project=chromium` | ✅ (login/cadastro/candidatura specs exist; prune job-application) |
| HARD-02 | Lighthouse mobile >80 Perf+A11y | LHCI | `lhci autorun` | ❌ Wave 0 (new `lighthouserc.js`) |
| HARD-03 | ErrorBoundary at App root | Vitest render test + grep guard | `npm run test:run -- ErrorBoundary` | ❌ Wave 0 |
| HARD-04 | Zero WCAG A/AA violations on candidate routes | E2E axe | `npx playwright test e2e/a11y.spec.ts` | ❌ Wave 0 (new) |
| HARD-05 | iPhone 12 Pro flows + logout reachable | Manual UAT | — | Manual runbook |
| HARD-06 | DevNav DEV-gated | Vitest/grep guard | grep `import.meta.env.DEV && <DevNavigationMenu` | ✅ gate present (`App.tsx:221`); add guard |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.github/workflows/ci.yml` — unit + e2e + lighthouse jobs (D-03/D-05)
- [ ] `lighthouserc.js` — LHCI config, mobile preset, minScore 0.8 Perf+A11y (D-05)
- [ ] `e2e/a11y.spec.ts` — `@axe-core/playwright` AxeBuilder per candidate route (D-08)
- [ ] `e2e/perfil.spec.ts` — PERF-01/02 E2E (D-01)
- [ ] Install `@lhci/cli@0.15.1` + `@axe-core/playwright@4.11.3`
- [ ] Prune `e2e/job-application-flow.spec.ts` (legacy PRD-0005 duplicate — D-04)
- [ ] ErrorBoundary root render test + grep guard (D-09)
- [ ] DevNav gate grep guard (D-10)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iPhone 12 Pro full-flow + logout reachability | HARD-05 | Physical viewport + touch reachability not deterministically assertable in CI | Run all candidate flows on iPhone 12 Pro viewport (390×844); confirm logout button reachable without scroll-trap |
| PKCE→OTP recovery real-email round-trip | AUTH-03 (D-15/D-16) | Requires real inbox + cross-browser deeplink | Initiate recovery in browser A, open OTP email, complete in browser B |
| Lighthouse Perf <80 → D-17 N+1 decision | HARD-02 (D-06) | Measure-first: only fold perf fix IF Lighthouse Performance comes in <80 | Read LHCI Performance score; branch on <80 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (CI, LHCI, axe, perfil E2E)
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
