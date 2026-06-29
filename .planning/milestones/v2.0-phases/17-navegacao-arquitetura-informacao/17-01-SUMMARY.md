---
phase: 17-navegacao-arquitetura-informacao
plan: 01
subsystem: testing
tags: [vitest, playwright, react-router, navigation, red-tests, smoke-runtime-gate, grep-guard]

# Dependency graph
requires:
  - phase: M2 (Phases 6-16, archived)
    provides: EtapaFunilM2 + ETAPA_M2_LABELS enum, the orphaned funnel workspaces (entrevista/decisao/redacao), admin /admin/* routes, candidaturaId route contract
provides:
  - Calibrated Wave-0 RED test battery (5 Vitest specs + 1 Playwright nav smoke) authored BEFORE any wiring
  - funilNavMap exhaustiveness + candidaturaId route-shape contract (RED until 17-02)
  - route-table catch-all path:'*' + /rh/candidatos/:id reachability contract (RED until 17-02)
  - RHSidebar Admin role-gating contract (RED until 17-03)
  - hub future-stage empty-state copy contract, never-invent-data (RED until 17-03)
  - legacy-routes grep guard — 12 confirmed-dead refs + VagaLPPage.tsx file presence + MeuPerfilPage KEEP control (RED until 17-05)
  - e2e navegability smoke — 4 journeys, J4 unconditional, J1-J3 gated real-auth (RED until 17-02/03/04)
affects: [17-02, 17-03, 17-04, 17-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Smoke-runtime gate (M1 Phase 4.1 precedent): RED tests compile under TS strict but fail at runtime/collection against pre-wiring code — the failure IS the assertion that the navegability gap is detectable"
    - "Calibrated RED via static import → module-not-found at vitest collection (funilNavMap, HubSection) is the intended downstream-flip signal"
    - "Mixed-shape grep guard: route-coupled dead components asserted via routes.tsx ref-count==0; unrouted dead file (VagaLPPage) asserted via node:fs file-existence"
    - "Positive-control assertion (MeuPerfilPage KEEP) green NOW guards against over-deletion in 17-05"

key-files:
  created:
    - src/lib/navegacao/__tests__/funilNavMap.test.ts
    - src/router/__tests__/routes.nav.test.tsx
    - src/components/__tests__/RHSidebar.admin.test.tsx
    - src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx
    - src/__tests__/guards/legacy-routes.grep.test.ts
    - e2e/navegacao.spec.ts
  modified:
    - .planning/phases/17-navegacao-arquitetura-informacao/17-VALIDATION.md

key-decisions:
  - "RED-by-static-import (not it.todo): module-not-found at collection is the cleanest 'flips GREEN when 17-02/03 creates the module' signal — accepted because the WHOLE plan is Wave-0 RED"
  - "Legacy grep guard splits the dead set by shape: 11 route-coupled via ref-count, VagaLPPage (unrouted, 0 routes.tsx refs already) via file-existence — so EVERY dead artifact is RED today, none mis-calibrated GREEN"
  - "candidaturaId is the asserted route key everywhere (Pitfall 1) — funilNavMap route fns interpolate candidaturaId, NOT vaga/candidato id"
  - "404 journey (J4) is unconditional; RH/admin/candidate journeys (J1-J3) gated behind E2E_AUTH_TEST_USERS (login-flow precedent) so the suite lists without creds"

patterns-established:
  - "Wave-0 RED battery authored before wiring (smoke-runtime gate) — Definition of Done = navegable-journey test gate (D-03)"
  - "tsc baseline allows transient +N module-not-found RED errors that self-resolve when downstream creates the module — NOT counted as baseline growth"

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-06-28
---

# Phase 17 Plan 01: Calibrated RED Navegability Battery Summary

**5 Vitest RED specs + 1 Playwright nav smoke authored before any wiring — funilNavMap exhaustiveness, route catch-all 404, RHSidebar admin gating, hub empty-state copy, legacy-routes grep guard, and the 4 audit-broken journeys — each calibrated to fail now and flip GREEN as 17-02/03/04/05 land.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-28T19:07:04Z
- **Completed:** 2026-06-28T19:19:09Z
- **Tasks:** 3
- **Files modified:** 7 (6 created tests + 1 modified VALIDATION.md)

## Accomplishments

- Authored the complete Wave-0 RED battery: every Phase-17 wiring contract (funilNavMap, catch-all 404, route normalization reachability, admin role-gating, hub empty-state, legacy cleanup, 4 navegable journeys) is now pinned by a test that FAILS today for the right structural reason and flips GREEN exactly when the corresponding downstream wave lands.
- Calibrated the RED so it is the gate, not noise: 2 specs RED via module-not-found at collection (funilNavMap → 17-02, HubSection → 17-03); routes.nav RED on absent `path:'*'`; RHSidebar.admin RED on absent /Admin/ item; legacy-routes 12 RED (dead refs + VagaLPPage.tsx file present); J4 404 RED (no NotFound heading). 5 positive-control assertions stay GREEN now (route reachability guards, rh/candidato admin-item negatives, MeuPerfilPage KEEP).
- Verified the candidaturaId route contract (Pitfall 1) directly in the funilNavMap assertions: `avaliacao_assincrona`→`/candidato/avaliacao/{id}`, `rejeitado`→`/candidato/explicacao/{id}`, `entrevista_online`→`/rh/candidato/{id}/entrevista`, `decisao_final`→`/rh/candidato/{id}/decisao`.
- Playwright nav smoke lists 12 tests across chromium + mobile-chrome + tablet; J4 unconditional, J1-J3 gated behind `E2E_AUTH_TEST_USERS`; the rh-role seed gap (0 `recrutador` accounts, A3) documented in the file-top comment.

## Task Commits

Each task was committed atomically (all via `git -c core.hooksPath=/dev/null`, project convention):

1. **Task 1: RED unit specs — funilNavMap + route catch-all + RHSidebar admin** - `d04b305` (test)
2. **Task 2: RED hub empty-state spec + legacy-routes grep guard** - `33f418d` (test)
3. **Task 3: Playwright navegability smoke — 4 journeys, gated real-auth** - `73ac177` (test)

**Plan metadata:** _(this docs commit — SUMMARY + STATE + VALIDATION + ROADMAP)_

## Files Created/Modified

- `src/lib/navegacao/__tests__/funilNavMap.test.ts` - RED exhaustiveness over 8 EtapaFunilM2 members + ETAPA_M2_LABELS reuse + candidaturaId route-shape (D-17)
- `src/router/__tests__/routes.nav.test.tsx` - RED catch-all `path:'*'` present+last + `/rh/candidatos/:id` reachability guard (D-08/D-14)
- `src/components/__tests__/RHSidebar.admin.test.tsx` - RED Admin item renders ONLY for administrador, hidden for rh/candidato (D-13)
- `src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx` - RED future-stage empty-state verbatim copy + no invented mock data (D-07)
- `src/__tests__/guards/legacy-routes.grep.test.ts` - 12 RED dead-ref assertions + VagaLPPage.tsx file-presence + MeuPerfilPage KEEP positive control (D-12)
- `e2e/navegacao.spec.ts` - 4 journeys, J4 (404) unconditional RED, J1-J3 gated real-auth, route/heading assertions only (D-16/D-03)
- `.planning/phases/17-navegacao-arquitetura-informacao/17-VALIDATION.md` - `wave_0_complete: true`, Wave 0 boxes checked, Per-Task map status → ❌ red (calibrated)

## Decisions Made

- **RED via static import over `it.todo`:** module-not-found at vitest collection is the clearest "flips GREEN when the module is created" signal, and the whole plan is Wave-0 RED so a collection abort per-file is acceptable (TriagemTable.test.tsx Phase-10 precedent).
- **Legacy grep guard split by shape:** VagaLPPage is unrouted (0 routes.tsx refs already → a "zero refs" assertion would be GREEN-today/mis-calibrated), so its RED is asserted via `existsSync(VagaLPPage.tsx) === false` (file present today, hard-deleted in 17-05); the 11 route-coupled dead components keep the ref-count==0 assertion. Every dead artifact is therefore RED today.
- **MeuPerfilPage positive control GREEN now:** the `/rh/perfil` KEEP guard (RHTopBar.tsx:38 live entry) must stay >0 — it protects against an over-aggressive 17-05 deletion (RESEARCH Pitfall 7).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] SWC parser crash on backtick + comment-delimiter substrings inside JSDoc comments**
- **Found during:** Task 2 (legacy-routes grep guard)
- **Issue:** The `vite:react-swc` lexer threw `Unterminated template` / `Expected unicode escape` at collection because helper JSDoc comments contained a backtick wrapping an escape (`` `\b` ``) and the literal substring `*/` inside a backtick (`` `*/` ``) — SWC prematurely closed the block comment and read the trailing backtick as an unterminated template literal. The whole file reported "no tests" (collection abort), masking the intended calibrated RED.
- **Fix:** Rewrote the two helper-function JSDoc comments without backticks and without `*/`/`/*` substrings; built the word-boundary regex via string concatenation (`'\\b' + name + '\\b'`) instead of a template literal. Zero change to the assertions themselves.
- **Files modified:** src/__tests__/guards/legacy-routes.grep.test.ts
- **Verification:** File now collects 13 tests — 12 RED (dead refs + VagaLPPage file present) + 1 GREEN (MeuPerfilPage KEEP), exactly the calibrated outcome.
- **Committed in:** `33f418d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — test-infra, zero assertion change)
**Impact on plan:** The fix was required for the test file to collect at all; it changes only comment prose and the regex-construction syntax, not what the guard asserts. No scope creep.

## Issues Encountered

- **tsc baseline +2 (290 → 292):** the two intended module-not-found RED errors (`@/lib/navegacao/funilNavMap` and `@/features/hub-candidato/components/HubSection`). These are NOT baseline growth — they are the calibrated RED-by-design signal and self-resolve the moment 17-02/17-03 create those modules. Well under the ~301 gate. No other new tsc errors introduced.

## User Setup Required

None — no external service configuration required. The gated J1-J3 journeys require `E2E_AUTH_TEST_USERS=true` + `TEST_USER_*`/`TEST_ADMIN_*` creds at the runtime battery (17-05), but no setup is needed for this RED-authoring plan.

## Next Phase Readiness

- **17-02 (Wave 1):** `funilNavMap.ts` + `NotFoundPage.tsx` + catch-all `path:'*'` + D-08 redirects will flip `funilNavMap.test.ts`, `routes.nav.test.tsx`, and J4 GREEN. The candidaturaId route targets are pinned exactly by the funilNavMap spec — implement to those strings.
- **17-03 (Wave 2):** the `hub-candidato` feature (`HubSection` named export with `estado='futuro'` → verbatim empty-state copy) + RHSidebar Admin item flip `hubEmptyState.test.tsx` and `RHSidebar.admin.test.tsx` GREEN.
- **17-04 (Wave 2):** Dashboard step-CTA + landing repoint feed J1.
- **17-05 (Wave 3):** the 12-component legacy deletion + J2-J3 real-auth run flip `legacy-routes.grep.test.ts` and the gated journeys GREEN — keep the MeuPerfilPage KEEP control green.
- No blockers.

## Self-Check: PASSED

All 6 test files + SUMMARY.md present on disk; all 3 task commits (`d04b305`, `33f418d`, `73ac177`) present in git history.

---
*Phase: 17-navegacao-arquitetura-informacao*
*Completed: 2026-06-28*
