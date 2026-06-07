---
phase: 05-perfil-hardening-mvp
plan: 04
subsystem: testing
tags: [accessibility, axe-core, wcag, lighthouse, lhci, playwright, performance, design-tokens]

requires:
  - phase: 05-01
    provides: e2e/a11y.spec.ts (axe) + lighthouserc.cjs scaffolds — the gates this plan satisfies
  - phase: 05-02
    provides: repaired tokens/primitives (a11y measures the fixed UI)
  - phase: 05-03
    provides: shared CandidatoNavbar (one a11y fix covers all candidate pages)
provides:
  - axe-core a11y gate GREEN — 4/4 public routes, zero WCAG A/AA violations
  - Lighthouse mobile Accessibility 0.96–1.00 (>0.8 met)
  - Lighthouse mobile Performance measured (0.62–0.68) — tracked as warn-baseline (HARD-02 perf deferred)
  - remaining candidate-facing hex literals swept to semantic tokens
  - iPhone 12 Pro manual UAT passed (logout reachable on every candidate flow — HARD-05)
affects: [05-06, verification, future-perf-phase]

tech-stack:
  added: []
  patterns:
    - "Accessible names on Radix Select triggers via aria-label (button-name fix)"
    - "Measure-first perf gate (D-06): LHCI measures before any optimization is applied"
    - "LHCI assertion split: Accessibility kept at 'error' (hard gate), Performance relaxed to 'warn' (known build-architecture baseline)"

key-files:
  created: []
  modified:
    - src/components/pages/VagasPublicasPage.tsx
    - src/features/cadastro/components/CadastroMultiStepForm.tsx
    - src/components/pages/LoginCandidatoPage.tsx
    - src/components/pages/EsqueciSenhaPage.tsx
    - src/components/pages/FormularioCandidaturaPage.tsx
    - lighthouserc.cjs
    - .gitignore
    - src/features/cadastro/services/cadastroService.ts

key-decisions:
  - "D-17 N+1 fix MEASURED-AND-SKIPPED (D-06): mobile TBT is 30ms — the N+1 is not on the critical render path; login/cadastro score the same ~0.65 without ever calling enriquecerVaga. Applying D-17 would not move the score."
  - "Performance shortfall (0.62–0.68 < 0.8) is project-wide build architecture (661 KiB gzip bundle, unoptimized images) — relaxed LHCI Performance to 'warn'; real remedy (code-splitting + image optimization) deferred to a dedicated follow-up phase. User-approved accept-warn-baseline."
  - "Gate-discovered (out of declared scope): fixed cadastroService 400-body mislabel so EMAIL_EXISTS/CPF_EXISTS/VALIDATION surface correctly instead of 'Sem conexão com o servidor'."

patterns-established:
  - "iPhone 12 Pro manual UAT as the HARD-05 logout-reachability gate (Playwright mobile-chrome is Pixel 5, not iPhone 12 Pro)"

requirements-completed: [HARD-04, HARD-05]
requirements-partial:
  - id: HARD-02
    status: "Accessibility >0.8 met (0.96–1.00); Performance 0.62–0.68 deferred as warn-baseline (user-approved). Defer perf optimization to a dedicated phase."

duration: ~50min
completed: 2026-06-06
---

# Phase 05 Plan 04: Accessibility Audit + Lighthouse Gate Summary

**Drove the axe-core a11y gate to zero WCAG A/AA violations across all candidate flows, confirmed Lighthouse mobile Accessibility 0.96–1.00, measured Performance (0.62–0.68, deferred as a project-wide build-architecture warn-baseline), passed the iPhone 12 Pro logout-reachability UAT, and fixed a UAT-discovered cadastro error-mislabel.**

## Performance

- **Duration:** ~50 min (audit + LHCI + iPhone UAT + gate-discovered cadastro fix)
- **Tasks:** 3 (2 implementation + 1 manual UAT gate)
- **Files modified:** 8 (incl. 1 gate-discovered out-of-scope fix)

## Accomplishments
- **HARD-04/D-08 — a11y GREEN:** `e2e/a11y.spec.ts` passes with **zero** WCAG A/AA violations on 4 public routes. Fixed 4× critical `button-name` (Radix Select filter triggers on /vagas → aria-label) + 1× serious `aria-progressbar-name` (cadastro step progressbar → aria-label).
- **HARD-02 (a11y) — PASS:** Lighthouse mobile Accessibility 0.96–1.00 across login/cadastro/vagas.
- **HARD-02 (perf) — DEFERRED:** Performance 0.62–0.68; **D-17 N+1 measured-and-skipped** (TBT 30ms, not on critical path). Relaxed LHCI Performance to `warn`; real fix (code-splitting + image optimization) deferred to a follow-up phase (user-approved).
- **PERF-02/D-26:** swept remaining candidate-facing hex literals (login/recovery/vagas/candidatura) to semantic tokens — 0 `#00109E`/`#35BFAD` left on the 4 pages.
- **HARD-05/D-11:** iPhone 12 Pro (390×844) manual UAT PASSED — logout button reachable on every candidate flow, no transparency regressions.
- **Gate-discovered fix:** cadastroService now parses the Edge Function 400 body, so duplicate/validation errors show the correct message instead of "Sem conexão com o servidor".

## Task Commits
1. **Task 1: accessible names (a11y violations) — HARD-04/D-08** - `cc87478` (fix)
2. **Task 2a: hex literal sweep — PERF-02/D-26** - `5895049` (fix)
3. **Task 2b: LHCI measure-first (a11y gate green, perf warn-baseline) — HARD-02** - `e2acb5a` (fix)
4. **Task 3 (gate):** iPhone 12 Pro manual UAT — user-approved
5. **Gate-discovered:** cadastro 400-body mislabel fix - `b4e3716` (fix)

## Self-Check: PASSED
- a11y spec GREEN (zero WCAG A/AA violations, 4/4 routes)
- Lighthouse a11y 0.96–1.00 (>0.8); perf 0.62–0.68 (deferred warn-baseline, documented)
- build exits 0; lint **292** (held after every task)
- iPhone 12 Pro UAT approved; cadastro mislabel fix re-tested + approved

## Notes for Next Plans / Phase Verification
- **HARD-02 is partially satisfied** — Accessibility met, Performance deferred. The phase VERIFICATION must record success-criterion #3 (Lighthouse mobile >80 for BOTH Perf and a11y) as partial: a11y yes, perf as a tracked warn-baseline for a future optimization phase.
- **05-06** rewrites EsqueciSenhaPage + RedefinirSenhaPage for OTP — it MUST re-run `e2e/a11y.spec.ts` to keep the recovery pages at zero violations (its plan already includes the `<form>` a11y wrap).
