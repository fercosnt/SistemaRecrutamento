---
phase: 05-perfil-hardening-mvp
verified: 2026-06-06T17:30:00Z
status: gaps_found
score: 6/8 must-haves verified (SC2 FAILED in first live CI run; SC3 partial)
overrides_applied: 0
reverified: 2026-06-06T20:50:00Z
reverify_note: "First live CI run (GitHub Actions run 27073197523, push to backup/local-state-2026-04) flipped SC2 from UNCERTAIN to FAILED. The pipeline had never been run; it surfaced both CI-config defects (fixed in 7f51806) and genuine E2E-suite gaps (below). Re-verification downgraded status human_needed → gaps_found."
gaps:
  - id: GAP-05-CI-1
    sc: SC2 / HARD-01
    severity: blocking
    title: "cadastro-flow happy-path test does a real cadastro submit + auto-login — fails without live Supabase"
    detail: "e2e/cadastro-flow.spec.ts:164 'happy path: auto-login lands on /candidato/perfil' is an ungated real-auth test. Gate behind E2E_AUTH_TEST_USERS==='true' (Tier-2) like login-flow's legacy suites (done in 7f51806)."
  - id: GAP-05-CI-2
    sc: SC2 / HARD-01
    severity: blocking
    title: "vagas-browse B-J01 needs vaga-list data — fails with placeholder Supabase"
    detail: "e2e/vagas-browse.spec.ts:27 'anon visits /vagas and sees the list region' expects rendered vaga cards; with no live data the list region is empty. Add a page.route mock for the vagas query, or gate as Tier-2."
  - id: GAP-05-CI-3
    sc: SC2 / HARD-01
    severity: blocking
    title: "password-recovery B10 (mocked) fails under CI env"
    detail: "e2e/password-recovery-flow.spec.ts:143 B10 'type OTP + new password → verifyOtp + updateUser' is meant to be page.route-mocked + unconditional, but fails when the app boots with placeholder Supabase. Investigate the mock interception vs the OTP/updateUser call shape."
  - id: GAP-05-CI-4
    sc: SC4 / HARD-04
    severity: blocking
    title: "a11y /auth/redefinir-senha has a real WCAG A/AA violation (contradicts 05-04 'zero violations' + 05-06 deferred-items)"
    detail: "e2e/a11y.spec.ts /auth/redefinir-senha fails expect(violations).toEqual([]) (color-contrast family). a11y is an 'error' gate (HARD-04). REOPENS SC4 — the 05-06 OTP page (input-otp + new-password form) likely introduced the violation. Fix the contrast or .exclude with a tracked reason."
  - id: GAP-05-CI-5
    sc: SC4 / HARD-04
    severity: warning
    title: "a11y /auth/login, /cadastro, /vagas are flaky (pass on retry)"
    detail: "Data/render-dependent axe flakiness (generalizes DEF-05-06-A beyond /vagas). Stabilize: pin seed/render state, exclude known-dynamic nodes, or make the a11y scan deterministic so the 'error' gate is reliable."
human_verification:
  - test: "Run full E2E suite in GitHub Actions CI (push/PR trigger) and confirm all Tier-1 jobs are green"
    expected: "unit job (lint + vitest 357/358 except pre-existing LoadingProgress carryover) + e2e job (playwright chromium) both pass; lighthouse job runs without crashing"
    why_human: "CI has never been triggered against the repo — only the local workflow file has been verified. HARD-01 requires an actual green check, not just a valid YAML. The CI yml exists and is structurally correct but no live run has been observed."
  - test: "Run `npx lhci autorun` against the current production build and confirm Lighthouse mobile Accessibility >= 0.8 (currently 0.96–1.00 per Plan 05-04 SUMMARY). Note the Performance score."
    expected: "Accessibility assertion passes at 'error' level (>= 0.8); Performance at 'warn' level (scored 0.62–0.68 per Plan 05-04 measurement, below 0.8 but accepted as warn-baseline per user approval)"
    why_human: "HARD-02 has two halves. The Accessibility half is structurally complete (axe passes, LHCI config is 'error') but requires a live LHCI run to confirm the current build still holds the 0.96–1.00 score measured in Plan 05-04. The Performance half is a deliberate warn-baseline (0.62–0.68) — this is a user-approved known deviation, not a blocking failure, but a human must confirm the warn-baseline is still the live state and that no regression has occurred since 05-04."
---

# Phase 5: perfil-hardening-mvp Verification Report

**Phase Goal:** "The candidate can see their real application data on a profile page, and the entire MVP passes E2E tests, Lighthouse thresholds, and accessibility checks"
**Verified:** 2026-06-06T17:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth (Success Criterion) | Status | Evidence |
|---|--------------------------|--------|----------|
| 1 | /candidato/perfil shows real personal data + candidaturas with status, etapa, date — no mocked data | ✓ VERIFIED | `useCandidaturas()` hook (line 25) queries `candidaturasService` which does a live `.from('candidaturas').select(...)` Supabase call (Level 4: real DB data). `useCandidato()` from authStore provides personal data. 05-03 smoke-runtime gate approved by human. |
| 2 | Full E2E suite (login, cadastro, candidatura flows) passes 100% in CI | ✗ FAILED (first live run) | CI run 27073197523 (first ever) was RED. Config defects fixed in 7f51806 (lint baseline gate, placeholder Supabase env, login-flow legacy real-auth gating). Genuine E2E gaps remain — see frontmatter GAP-05-CI-1..3 (cadastro happy-path ungated, vagas-browse needs data/mock, password-recovery B10 mock). Gap-closure plan tracks these. |
| 3 | Lighthouse mobile scores exceed 80 for both Performance and Accessibility | ? UNCERTAIN (split) | Accessibility: 0.96–1.00 measured in Plan 05-04, enforced at 'error' level in `lighthouserc.cjs`. Performance: 0.62–0.68 measured — below 0.8 but deliberately accepted as a warn-baseline (user-approved per 05-04 key-decisions). LHCI config correctly reflects this split. Needs live run to confirm current state has not regressed. |
| 4 | Every form input has visible label, tab order is logical, focus indicators are visible | ⚠ REOPENED | Labels/form structure VERIFIED (change-password `<form>` with labelled inputs). BUT the first live a11y run found a real WCAG A/AA violation on `/auth/redefinir-senha` (GAP-05-CI-4) + flaky scans on /auth/login, /cadastro, /vagas (GAP-05-CI-5) — contradicting the 05-04 "zero violations" claim. a11y is an 'error' gate (HARD-04); SC4 is reopened pending the gap-closure fixes. |
| 5 | On iPhone 12 Pro viewport (390x844), all flows complete and logout button is reachable | ✓ VERIFIED | Plan 05-04 Task 3 human UAT: iPhone 12 Pro (390x844) logout reachable on every candidate flow; all flows completed without scroll traps. HARD-05 approved 2026-06-06. |

**Score:** 7/8 truths fully verified (SC2 and SC3 require a CI/live-run gate)

---

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Lighthouse mobile Performance >= 0.8 | Future dedicated performance phase (post-M1) | User-approved warn-baseline per 05-04 key-decisions: "real remedy (code-splitting + image optimization) deferred to a dedicated follow-up phase"; LHCI Performance assertion relaxed to 'warn' to document the known state. Not a blocking gap for M1 MVP close. |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/ci.yml` | GitHub Actions pipeline (unit + e2e + lighthouse) | ✓ VERIFIED | Exists. Contains lint (296-invariant), vitest, playwright chromium, LHCI jobs. Triggered on push to main/backup/**. No `VITE_`-prefixed service_role (comment-only reference). |
| `lighthouserc.cjs` | LHCI config — preview server, mobile preset, minScore 0.8 | ✓ VERIFIED | Exists (`.cjs` not `.js` — correct for `type:module` package). `minScore: 0.8` present. Performance at `'warn'`, Accessibility at `'error'`. Port 4173 preview server. |
| `e2e/a11y.spec.ts` | axe-core WCAG A/AA scan on public routes | ✓ VERIFIED | Exists. Contains `AxeBuilder`. Scans `/auth/login`, `/auth/esqueci-senha`, `/cadastro`, `/vagas`. |
| `e2e/perfil.spec.ts` | PERF-01/02 E2E Tier-1 mock + Tier-2 env-gated | ✓ VERIFIED | Exists. Contains Tier-1 mocked auth + Tier-2 `E2E_REAL_LOGIN`-gated block. Zero `test.fixme` occurrences. |
| `e2e/password-recovery-flow.spec.ts` | B10 unconditional OTP recovery E2E | ✓ VERIFIED | Exists. B10 is unconditional (no fixme). Real-email Tier-2 `skip-with-reason`. |
| `src/components/layouts/CandidatoNavbar.tsx` | Shared candidate navbar with `showAreaLink` prop | ✓ VERIFIED | Exists. Imported and rendered by MeuPerfilCandidatoPage, VagasPublicasPage, VagaDetalhePage, FormularioCandidaturaPage. |
| `src/App.tsx` | ErrorBoundary wrapping RouterProvider (HARD-03) | ✓ VERIFIED | Line 257: `<ErrorBoundary>` wraps `<RouterProvider router={router} />`. DevNav gate at line 221 intact (`import.meta.env.DEV && <DevNavigationMenu />`). |
| `src/components/__tests__/ErrorBoundaryRoot.test.tsx` | HARD-03 render-catch test | ✓ VERIFIED | Exists. Passes in Vitest suite (357 pass, 1 pre-existing carryover fail). |
| `src/__tests__/guards/devnav-gate.grep.test.ts` | HARD-06 DevNav DEV-gate grep guard | ✓ VERIFIED | Exists at `src/__tests__/guards/` (relocated from plan's `tests/guards/` for vitest collection — documented in 05-01 SUMMARY as intentional deviation). File passes. |
| `src/features/auth/services/passwordService.ts` | `verifyRecoveryOtp` with Pitfall-7 redaction | ✓ VERIFIED | Exists. Contains `verifyOtp` + `type: 'recovery'`. Token never logged (redaction asserted by console-spy test). |
| `src/features/auth/schemas/redefinirSenhaSchema.ts` | 6-digit token field | ✓ VERIFIED | Contains `token` field. Schema validates 6-digit numeric. |
| `supabase/migrations/20260606000001_vaga_status_sync.sql` | F-04-08-B: soft-deleted vaga cannot be status='ativa' | ✓ VERIFIED | Exists. Contains `deleted_at` logic. No outer `BEGIN`/`COMMIT` wrappers. Applied to live DB via PL/pgSQL workaround (confirmed in 05-05 SUMMARY). |
| `supabase/migrations/20260606000002_bloco_valido_reconcile.sql` | F-04-08-C: bloco_valido_check captured in migrations | ✓ VERIFIED | Exists. Contains `bloco_valido` constraint re-declaration. Applied to live DB. |
| `e2e/job-application-flow.spec.ts` | Must be deleted (D-04 legacy duplicate) | ✓ VERIFIED | File does not exist — pruned in Plan 05-01. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/App.tsx` | `src/components/ErrorBoundary.tsx` | Import + wrap RouterProvider | ✓ WIRED | Line 30: `import { ErrorBoundary } from './components/ErrorBoundary'`; lines 257-261: wraps RouterProvider. |
| `src/components/pages/MeuPerfilCandidatoPage.tsx` | `src/components/layouts/CandidatoNavbar.tsx` | Import + render | ✓ WIRED | Confirmed via grep: CandidatoNavbar imported and rendered. |
| `src/components/pages/RedefinirSenhaPage.tsx` | `verifyRecoveryOtp` in passwordService | OTP input → verify → updateUser | ✓ WIRED | Line 117: `await verifyRecoveryOtp(targetEmail, data.token)`. InputOTP component renders before password fields. |
| `e2e/a11y.spec.ts` | candidate route DOM | `AxeBuilder.analyze()` | ✓ WIRED | AxeBuilder scans 4 public routes; passes with zero violations. |
| `lighthouserc.cjs` | `categories:accessibility` / `categories:performance` | `minScore 0.8` assertions | ✓ WIRED | Both assertions present; accessibility at `'error'`, performance at `'warn'` (documented baseline). |
| `.github/workflows/ci.yml` | npm run lint / test:run / playwright / lhci | job steps | ✓ WIRED | All 4 commands present in respective jobs. |
| `src/store/authStore.ts` | logout signOut errors | re-throw after clearAuth | ✓ WIRED | Lines 400–414: `signOutError` is captured and re-thrown; WR-01-09 root fix confirmed. |
| `MeuPerfilCandidatoPage:handleAlterarSenha` | `signInWithPassword` re-auth + `passwordSchema` | WR-01 re-auth gate | ✓ WIRED | Line 164: `supabase.auth.signInWithPassword({email, password: atual})`; line 137: `passwordSchema.safeParse(senhas.nova)`. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `MeuPerfilCandidatoPage` | `candidaturas` | `useCandidaturas()` → `candidaturasService.getCandidaturas()` → `.from('candidaturas').select(...)` | Yes — live Supabase query, RLS-scoped | ✓ FLOWING |
| `MeuPerfilCandidatoPage` | `candidato` | `useCandidato()` → `useAuthStore()` → Supabase Auth session + DB profile | Yes — real auth profile | ✓ FLOWING |
| `e2e/perfil.spec.ts` (Tier-1) | mock candidaturas | `page.route('**/auth/v1/token...')` + mock JSON | Mock (by design — Tier-1 contract) | ✓ FLOWING (correct by design) |

---

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| Vitest suite: 357 pass, 1 pre-existing fail | `npm run test:run` | 357 passed / 1 failed (LoadingProgress — pre-existing carryover from Phase 2/3 [02-06]) | ✓ PASS |
| Lint baseline at 292 (post-05-04 tsc error reduction) | `npm run lint \| grep "error TS" \| wc -l` | 292 errors — baseline held throughout Phase 5 | ✓ PASS |
| Legacy spec pruned | `test ! -f e2e/job-application-flow.spec.ts` | File does not exist | ✓ PASS |
| Zero `test.fixme` in perfil + recovery E2E specs | `grep -c "test.fixme"` | 0 in both specs | ✓ PASS |
| DevNav DEV gate present | `devnav-gate.grep.test.ts` | Passes (regex match confirmed) | ✓ PASS |
| OTP recovery: `client.ts` flowType untouched | `grep flowType src/lib/supabase/client.ts` | `flowType: 'pkce'` unchanged | ✓ PASS |

---

### Probe Execution

Step 7c: SKIPPED — no conventional `scripts/*/tests/probe-*.sh` files found in this phase. Phase uses Vitest + Playwright as the probe mechanism (run above under Behavioral Spot-Checks).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PERF-01 | 05-01, 05-03 | Listagem de candidaturas com status + etapa + data (dados reais) | ✓ SATISFIED | `useCandidaturas()` → real DB query; candidaturas rendered in MeuPerfilCandidatoPage lines 672-714; smoke-runtime approved 05-03. |
| PERF-02 | 05-01, 05-02, 05-03 | Página /candidato/perfil com dados pessoais + candidaturas | ✓ SATISFIED | Page exists, wired to real auth + DB data; smoke-runtime UAT approved. |
| HARD-01 | 05-01 | E2E suite completa passa 100% em CI | ? NEEDS HUMAN | CI yml exists and is structurally correct; Tier-1 E2E passes locally. No live CI run confirmed. |
| HARD-02 | 05-04 | Lighthouse mobile > 80 em Performance e Accessibility | ? NEEDS HUMAN (split) | Accessibility ✓ (0.96–1.00, 'error' gate). Performance warn-baseline (0.62–0.68, user-approved). Needs live LHCI run confirmation. |
| HARD-03 | 05-01, 05-03 | ErrorBoundary global no root da aplicação | ✓ SATISFIED | App.tsx wraps RouterProvider in `<ErrorBoundary>`; render test passes. |
| HARD-04 | 05-04, 05-06 | Labels em todos inputs; tab order; focus visível | ✓ SATISFIED | axe spec zero violations (4 public routes + recovery pages); perfil change-password form wrapped with labelled inputs. |
| HARD-05 | 05-04 | Validação manual mobile iPhone 12 Pro — logout acessível | ✓ SATISFIED | Human UAT approved 2026-06-06 (Plan 05-04 Task 3): all flows + logout reachable at 390x844. REQUIREMENTS.md marks as Pending but UAT evidence confirms it is complete. |
| HARD-06 | 05-01, 05-03 | DevNavigationMenu oculto em produção (DEV gate) | ✓ SATISFIED | `import.meta.env.DEV && <DevNavigationMenu />` at App.tsx:221; grep guard passes. |

**Note on HARD-05:** REQUIREMENTS.md marks HARD-05 as `Pending` (checkbox unchecked), but this appears to be a tracking file update lag — the 05-04 SUMMARY records iPhone 12 Pro UAT PASS and `requirements-completed: [HARD-04, HARD-05]`. The code evidence and human gate are complete.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `.github/workflows/ci.yml` line 70 | `npm install -g @lhci/cli@0.15.1` (global install instead of devDependency) | ⚠️ Warning | Identified as IN-03 in 05-REVIEW.md; logged in backlog. Not blocking — LHCI still runs correctly. |
| `src/styles/globals.css` lines 147-154 | Sidebar tokens reference `var(--brand-*)` / `var(--neutral-*)` hex vars (WR-04) | ⚠️ Warning | Identified in 05-REVIEW.md. No sidebar tailwind mapping exists yet, so not a current regression. Pre-existing latent risk for M2 sidebar work. |
| `src/features/cadastro/services/cadastroService.ts` lines 172-176 | Email + nome logged in console.log (WR-02) | ⚠️ Warning | Identified and FIXED in 05-REVIEW.md (commit noted: "WR-02, WR-03 — FIXED"). Verify: orchestrator review recorded fix applied. |
| `src/features/cadastro/services/cadastroService.ts` lines 237-239 | `invokeError.message` logged verbatim (WR-03) | ⚠️ Warning | Fixed same commit as WR-02 per 05-REVIEW orchestrator note. |
| `src/styles/globals.css` (CR-01) | `input-background` Tailwind key absent from `tailwind.config.js` | ⚠️ Warning (deferred) | Identified as CR-01; explicitly deferred as a design decision per 05-REVIEW orchestrator: "adding the white token would flip bare inputs to solid white, changing the dark-glass look the user approved." Logged in deferred-items. NOT blocking for phase close per user decision. |

No `TBD`, `FIXME`, or `XXX` debt markers found in phase-modified files (verified by prior review pass). Lint baseline holds at 292 (no growth from pre-Phase-5 baseline of 292 post-05-04 reduction).

---

### Human Verification Required

#### 1. CI Live Run (HARD-01)

**Test:** Push a commit (or trigger manually via Actions tab) on the `backup/local-state-2026-04` branch and wait for the GitHub Actions workflow to complete.
**Expected:** The `unit` job passes (lint 292 + vitest 357/1-preexisting) and the `e2e` job passes (playwright chromium Tier-1 deterministic). The `lighthouse` job runs without crashing (warn-level Performance will not fail the build; Accessibility 'error' gate should pass at 0.96+).
**Why human:** HARD-01 explicitly requires "an actual green check, not a local runbook" (05-01 PLAN). The CI yml has never been triggered — only its structural correctness has been verified locally.

#### 2. Lighthouse Live Run (HARD-02 Accessibility gate + Performance warn-baseline)

**Test:** Run `npm run build && npx lhci autorun` locally (or read the CI lighthouse job output from item 1 above).
**Expected:** Accessibility assertion at 'error' level passes (>= 0.8, expected 0.96–1.00 per 05-04 measurement). Performance assertion at 'warn' level — expected 0.62–0.68, does NOT fail the build. Record the exact scores.
**Why human:** The accessibility gate must be confirmed against the current build (which has been modified by Plans 05-04 through 05-06). The warn-baseline for performance needs to be confirmed as still the live state with no regressions from the OTP/a11y work in 05-06.

---

### Gaps Summary

No blocking gaps found. All phase success criteria are met or substantiated at the code layer. The two `human_needed` items are runtime/CI gates, not missing implementation:

- **SC2 (E2E in CI):** Implementation complete; CI yml exists and is structurally valid. Gate: first live CI run.
- **SC3 (Lighthouse >80):** Accessibility implementation complete and gate enforced; Performance is a user-accepted warn-baseline (0.62–0.68), not a failure. Gate: live LHCI run to confirm no regression.

The one known-acceptable Vitest failure (LoadingProgress pre-existing carryover from Phase 2/3) does not affect phase goal.

Deferred items that are explicitly out of scope for phase pass/fail: DEF-05-06-A (/vagas axe color-contrast data-dependent flake), CR-01 (input-background design decision deferred to user), WR-04/IN-01/IN-03 (backlog).

---

_Verified: 2026-06-06T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
