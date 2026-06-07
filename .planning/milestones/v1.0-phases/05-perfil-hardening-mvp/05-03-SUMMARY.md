---
phase: 05-perfil-hardening-mvp
plan: 03
subsystem: ui
tags: [react, error-boundary, zustand, auth, logout, navbar, toast, perfil, react-router]

requires:
  - phase: 05-01
    provides: ErrorBoundaryRoot test + DevNav grep guard (the gates this plan satisfies)
  - phase: 05-02
    provides: repaired design tokens + primitives (correct contrast for the perfil/navbar polish)
provides:
  - ErrorBoundary hoisted to the App root (single canonical boundary; cadastro one re-exports it)
  - logout root-fix (signOut errors surface instead of being swallowed) — WR-01-09
  - shared <CandidatoNavbar /> extracted, consistent across perfil/vagas/vaga-detalhe/candidatura — WR-02-09
  - real-data perfil render verified (personal data + candidaturas status/etapa/date) — PERF-01/02
  - CEP "encontrado" toast fires exactly once (F-04.1-B); friendly 422-retry toast (F-04.1-E)
affects: [05-04, accessibility, perfil]

tech-stack:
  added: []
  patterns:
    - "Single root-level ErrorBoundary; feature boundaries re-export the canonical component"
    - "Shared persona navbar component parameterized per-page (perfil hides its own 'Área do candidato' link)"
    - "useRef latch to dedupe a success toast that would otherwise re-fire on hook re-render"

key-files:
  created:
    - src/components/layouts/CandidatoNavbar.tsx
  modified:
    - src/App.tsx
    - src/features/cadastro/components/ErrorBoundary.tsx
    - src/store/authStore.ts
    - src/components/pages/MeuPerfilCandidatoPage.tsx
    - src/components/pages/VagasPublicasPage.tsx
    - src/components/pages/VagaDetalhePage.tsx
    - src/components/pages/FormularioCandidaturaPage.tsx
    - src/features/cadastro/components/steps/EnderecoStep.tsx
    - src/components/pages/RedefinirSenhaPage.tsx

key-decisions:
  - "ErrorBoundary hoisted to App root (HARD-03/D-09); cadastro's boundary becomes a re-export of the canonical one to avoid duplication"
  - "Logout root-fix (WR-01-09): signOut failures now surface an error toast rather than being silently swallowed"
  - "Extracted CandidatoNavbar (WR-02-09): perfil intentionally omits the 'Área do candidato' link (it IS the área); the other three pages show it"
  - "F-04.1-B: lastToastedCepRef latch ensures the CEP-found toast fires once per resolved CEP, not per render"

patterns-established:
  - "Blocking smoke-runtime gate verifies real-data render + cross-page navbar consistency that automated tests cannot assert"

requirements-completed: [PERF-01, PERF-02, HARD-03, HARD-06]

duration: ~45min
completed: 2026-06-06
---

# Phase 05 Plan 03: Perfil Verify+Polish + Hardening + Carryover-Debt Summary

**Hoisted the ErrorBoundary to the App root, root-fixed logout so signOut errors surface, extracted a shared CandidatoNavbar consistent across all four candidate pages, verified the perfil renders real candidatura data, and killed the CEP-toast loop + added a friendly 422-retry toast.**

## Performance

- **Duration:** ~45 min (3 implementation tasks + blocking smoke-runtime gate, user-approved)
- **Tasks:** 4 (3 implementation + 1 smoke-runtime gate)
- **Files modified:** 9 (1 created: CandidatoNavbar)

## Accomplishments
- **HARD-03/D-09:** ErrorBoundary hoisted to App root; cadastro boundary de-duped to a re-export of the canonical component (covered by 05-01's `ErrorBoundaryRoot` test).
- **HARD-06/D-10:** DevNav DEV-gate verified (hidden in the production preview; covered by 05-01's `devnav-gate` grep guard).
- **PERF-01/02/D-01:** perfil real-data render verified at the gate — personal data + candidaturas with real status badge / etapa / inscrição date.
- **WR-01-09:** logout root-fix — signOut errors now toast instead of being swallowed.
- **WR-02-09:** `<CandidatoNavbar />` extracted and applied consistently to perfil, vagas, vaga-detalhe, and the candidatura form.
- **F-04.1-B:** CEP "encontrado" toast fires exactly once via a `lastToastedCepRef` latch. **F-04.1-E:** friendly 422-retry toast on RedefinirSenha.

## Task Commits
1. **Task 1: hoist ErrorBoundary to App root + DevNav verify** - `1d2b05c` (feat)
2. **Task 2: root-fix logout + extract shared CandidatoNavbar** - `465e148` (feat)
3. **Task 3: CEP toast loop fix + 422 retry toast** - `72ec9ae` (fix)
4. **Task 4 (gate):** smoke-runtime — user-approved (perfil real data, navbar consistent, Sair works, single CEP toast, DevNav hidden)

## Self-Check: PASSED
- build exits 0; lint **292** (down from the 295 ceiling — zero new errors from this plan)
- vitest 352 pass / 1 fail (pre-existing `LoadingProgress.test.tsx` carryover since [02-06] — NOT a regression)
- ErrorBoundaryRoot + devnav-gate guards pass
- smoke-runtime gate APPROVED by user (real-data perfil, consistent navbar across 4 pages, working logout, single CEP toast, DevNav hidden)

## Notes for Next Plans
- **05-04** (a11y/LHCI) measures this polished, real-data UI — navbar is now a single component (one a11y fix covers all pages).
- **05-06** (PKCE→OTP recovery) will also touch `RedefinirSenhaPage.tsx` + `passwordService.ts`; this plan's F-04.1-E toast change there is minimal and compatible.
