---
phase: 22-rede-de-testes-destravamento-varredura-de-honestidade
plan: 03
subsystem: auth
tags: [react, react-router, react-hook-form, open-redirect, localStorage, zustand, vitest]

# Dependency graph
requires:
  - phase: 22-01/22-02
    provides: green Deno corpus + hardened supply-chain (unchanged by this plan)
provides:
  - Single shared anti-open-redirect guard (resolveRedirect) in features/auth/utils, consumed by login + cadastro
  - Candidate + RH login submit buttons enabled by default (no !isValid gate) — E2E blur() hack now unnecessary
  - "?redirect" propagated login→cadastro→post-login, always guarded by resolveRedirect
  - Orphan candidatura_vaga_id localStorage key cleared on successful login
affects: [Phase 24 (react-router open-redirect CVE flag; auth surface), E2E login helpers, Phase 22-06 tsc baseline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Security-sensitive guard extracted to ONE shared util + re-exported from its old site so existing test imports stay valid (mirrors CI-06 dedup)"
    - "Defense-in-depth redirect: guard at both the CadastroPage boundary AND the CadastroMultiStepForm navigate site (idempotent resolveRedirect)"

key-files:
  created:
    - src/features/auth/utils/resolveRedirect.ts
    - src/features/auth/utils/__tests__/resolveRedirect.test.ts
  modified:
    - src/features/auth/utils/index.ts
    - src/components/pages/LoginCandidatoPage.tsx
    - src/components/pages/LoginRHPage.tsx
    - src/components/pages/__tests__/LoginCandidatoPage.test.tsx
    - src/components/pages/CadastroPage.tsx
    - src/features/cadastro/components/CadastroMultiStepForm.tsx

key-decisions:
  - "resolveRedirect EXTRACTED (not duplicated) to a shared util; LoginCandidatoPage re-exports it so the pre-existing routing test's import path is untouched"
  - "Dropped isValid from the formState destructure alongside !isValid from disabled — avoids a fresh TS6133 that would inflate the frozen 257 baseline (Pitfall 4)"
  - "Esqueci/Redefinir pages left untouched (already clean) — a grep regression guard locks that in"
  - "CadastroMultiStepForm re-guards redirectTo via resolveRedirect at the navigate site (idempotent) so no raw param can ever reach navigate()"

patterns-established:
  - "Login validate-on-submit: button disables only on isSubmitting || isInCooldown; handleSubmit blocks invalid submits + renders role=alert"

requirements-completed: [UX-04, UX-05]

# Metrics
duration: 12min
completed: 2026-07-05
---

# Phase 22 Plan 03: Candidate-facing auth honesty (login buttons + ?redirect + orphan cleanup) Summary

**Extracted the anti-open-redirect guard into ONE shared util, enabled both login submit buttons by default (killing the E2E blur() hack), threaded a resolveRedirect-guarded `?redirect` through login→cadastro→post-login, and cleared the orphan `candidatura_vaga_id` localStorage key on login — zero new type errors.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-05T21:13:52Z
- **Completed:** 2026-07-05T21:25:17Z
- **Tasks:** 3
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments
- `resolveRedirect` moved verbatim into `src/features/auth/utils/resolveRedirect.ts` (single source of truth), re-exported from LoginCandidatoPage + added to the auth utils barrel; a dedicated unit test covers all 5 `<behavior>` cases (null/`//evil`/non-root/root-anchored/custom-fallback).
- Both login submit buttons (candidato + RH) now enable on mount with an empty form — `!isValid` and the now-unused `isValid` destructure removed from both pages; `handleSubmit` still blocks invalid submits and renders `role="alert"`.
- `?redirect` survives the full login→cadastro→post-login journey: "Criar conta →" carries it (encoded) to `/cadastro`; CadastroPage guards it via `resolveRedirect` and passes a safe `redirectTo` down; CadastroMultiStepForm re-guards it at the post-auto-login navigate site.
- Orphan `candidatura_vaga_id` localStorage key is removed on successful login (was written by CadastroPage, read by InstrucoesFormularioPage, never cleaned before).

## Task Commits

Each task committed atomically (husky-bypass convention `git -c core.hooksPath=/dev/null`):

1. **Task 1: Extract resolveRedirect into a shared, unit-tested util** (TDD) — `473e6c7` (test, RED) → `0fb0480` (refactor, GREEN)
2. **Task 2: Enable login buttons by default (drop !isValid + dangling destructure)** (TDD) — `09062ce` (test, RED) → `1097ef7` (feat, GREEN)
3. **Task 3: Propagate ?redirect login→cadastro→post-login + clear orphan key** — `4363d2d` (feat)

**Plan metadata:** see final `docs(22-03)` commit.

## Files Created/Modified
- `src/features/auth/utils/resolveRedirect.ts` — CREATED: single shared anti-open-redirect guard (rejects `//`, non-root-anchored; default fallback `/candidato/dashboard`).
- `src/features/auth/utils/__tests__/resolveRedirect.test.ts` — CREATED: 7 unit tests covering all 5 `<behavior>` cases.
- `src/features/auth/utils/index.ts` — MODIFIED: barrel re-exports `resolveRedirect`.
- `src/components/pages/LoginCandidatoPage.tsx` — MODIFIED: imports + re-exports resolveRedirect (no local def); dropped `!isValid` + `isValid` destructure; clears orphan key on login success; "Criar conta →" carries encoded `?redirect`.
- `src/components/pages/LoginRHPage.tsx` — MODIFIED: dropped `!isValid` + `isValid` destructure.
- `src/components/pages/__tests__/LoginCandidatoPage.test.tsx` — MODIFIED: added render-based button-enabled assertions (candidato + RH), invalid-submit guard, and UX-05 redirect/orphan tests (navigate spy + fast-hydration mock; real resolveRedirect exercised).
- `src/components/pages/CadastroPage.tsx` — MODIFIED: reads `?redirect`, guards via resolveRedirect, passes `redirectTo` to the form.
- `src/features/cadastro/components/CadastroMultiStepForm.tsx` — MODIFIED: new optional `redirectTo` prop; post-auto-login navigate routes through `resolveRedirect` (fallback `/candidato/dashboard`).

## Decisions Made
- **Extract, don't duplicate** (Open Question 3 / CI-06 lesson): the security guard lives in one file; LoginCandidatoPage re-exports it so the legacy test import stays valid — no second copy of open-redirect logic.
- **Drop the `isValid` destructure too** (Pitfall 4): removing only `!isValid` from `disabled` would leave `isValid` unused → a fresh `TS6133` under `noUnusedLocals`, inflating the frozen baseline. Removed both.
- **Double-guard the redirect** (defense-in-depth): CadastroPage guards at the boundary AND CadastroMultiStepForm re-guards at the navigate site — `resolveRedirect` is idempotent, so no raw param can reach `navigate()`.
- **Left Esqueci/Redefinir untouched** — already had no `isValid`; a grep regression guard in the acceptance criteria locks in that already-compliant state.

## Deviations from Plan

None - plan executed exactly as written. All 3 tasks landed with their planned files, acceptance greps, and TDD RED/GREEN cadence.

## Issues Encountered
- **Pre-existing, out-of-scope suite failure (NOT fixed):** the full `npm run test:run` shows 1 red — `forbidden-strings.grep.test.ts` (LGPD-04 guard) flags `supabase/functions/gerar-devolutiva-bigfive/index.ts:192` ("psicólogo(a)" literal, introduced by commit `7853eac`). This file is not touched by this plan; the failure is version-independent and already logged in `deferred-items.md` (discovered in Plan 22-02) for UX-02 / Phase 24. Per the scope boundary, it was left as-is. Every test in the plan's own files is green (703 passing overall, the sole red being this documented pre-existing item).

## Verification
- `npx vitest run` on the plan's touched tests: **18 → 16 → all green** (resolveRedirect util 7, LoginCandidatoPage 16 incl. resolveRedirect 11 + UX-04 3 + UX-05 2).
- `grep -n "isValid" LoginCandidatoPage.tsx LoginRHPage.tsx` → empty; `grep -n "isValid" EsqueciSenhaPage.tsx RedefinirSenhaPage.tsx` → empty (regression guard).
- `npm run -s lint` total = **257 `error TS`** (exactly the frozen baseline — zero new type errors); `TS6133.*isValid` count = 0.
- Acceptance greps: `removeItem('candidatura_vaga_id')` present; "Criar conta →" carries encoded `redirect=`; CadastroMultiStepForm navigates through `resolveRedirect`; no raw `searchParams.get('redirect')` reaches navigate.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UX-04 and UX-05 satisfied for this plan's scope. UX-04's landing CTA piece is UX-02 (Plan 22-04, next in Wave 1).
- Security note carried forward to Phase 24: the installed `react-router@6.30.1` carries a HIGH open-redirect CVE (protocol-relative reinterpretation). App-level `resolveRedirect` mitigates it for the `?redirect` param this plan touches; the router bump (≥6.30.3) is out of Phase-22 scope (threat T-22-03-02, disposition accept).
- No blockers for the rest of Wave 1 (22-04 landing copy, 22-05 test creds) or Wave 2 (22-06 tsc paths + Deno CI job).

## Self-Check: PASSED

- FOUND: src/features/auth/utils/resolveRedirect.ts
- FOUND: src/features/auth/utils/__tests__/resolveRedirect.test.ts
- FOUND commits: 473e6c7, 0fb0480, 09062ce, 1097ef7, 4363d2d

---
*Phase: 22-rede-de-testes-destravamento-varredura-de-honestidade*
*Completed: 2026-07-05*
