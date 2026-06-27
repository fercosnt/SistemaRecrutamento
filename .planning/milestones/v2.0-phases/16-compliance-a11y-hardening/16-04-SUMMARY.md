---
phase: 16-compliance-a11y-hardening
plan: 04
subsystem: testing
tags: [a11y, tsc-baseline, ci, console-cleanup, auth, biasMath, eslint, vagasTypes, lgpd]

# Dependency graph
requires:
  - phase: 16-01
    provides: rh-console.grep guard (FX-14 RED contract) + a11y.spec.ts Tier-A R1 axe loop
  - phase: 15
    provides: biasMath.ts type module (BandResult/AdverseImpactResult) + usuarios_rh RLS+grant+hook chain (PROD-verified)
provides:
  - "FX-14: RH-path debug console.* removed (6 sites) — 16-01 rh-console.grep guard flips GREEN (4/4)"
  - "FX-15: dead biasMath runtime fns (computeAdverseImpact, bandFromAge) surgically removed; all live type exports preserved"
  - "FOUND-08: ci.yml tsc zero-growth gate lowered 292 -> 291 (gate tightens); enum typos proved structural (reverted)"
  - "LoginRHPage race+gate fix committed (poll 100ms->3s cold-DB hydration + gate widened to {rh, administrador})"
affects: [phase-16-verification, 16-HUMAN-UAT, future-tsc-burndown, vagas-types-realignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tsc baseline lowered to the genuine live count, never raised (zero-growth gate tightening)"
    - "surgical dead-fn removal keeps a module alive for its type exports (delete callers, keep contract)"
    - "structural-vs-trivial tsc triage: a one-line enum rename that unmasks the next stale key in the same Record<> literal is STRUCTURAL, not trivial"

key-files:
  created:
    - .planning/phases/16-compliance-a11y-hardening/16-04-SUMMARY.md
  modified:
    - src/components/pages/PerfilCandidatoRHPage.tsx
    - src/components/pages/SuporteRHPage.tsx
    - src/features/admin/bias-audit/biasMath.ts
    - src/components/pages/LoginRHPage.tsx
    - .github/workflows/ci.yml
  deleted:
    - src/features/admin/bias-audit/__tests__/biasMath.test.ts

key-decisions:
  - "FOUND-08 enum typos (clinica->clinico L581, big_five->bigfive L734) REVERTED: both are load-bearing — each rename only unmasks the next stale key in the SAME Record<> map (DEPARTAMENTO_LABELS / ETAPA_TO_KANBAN are wholesale-stale vs their unions), so the net tsc count does NOT drop. Deferred with the tempo_integral/TIPO_VAGA_LABELS map-realignment decision."
  - "ci.yml baseline lowered to 291 (the genuine measured count) rather than a fictitious sub-291 number — honest gate tightening from the stale 292 literal."
  - "biasMath.ts kept alive (not flat-deleted) because BandResult/AdverseImpactResult type exports are live in biasAuditService.ts + BiasAuditPage.tsx; only the dead runtime fns + their test were removed."
  - "Task-3 checkpoint handled as approved-with-deferral (autonomous run, no real RH account in-session): LoginRHPage fix committed + R1 axe confirmed green; live RH cold-start round-trip deferred to 16-HUMAN-UAT.md per the plan's <how-to-verify> fallback."

patterns-established:
  - "Structural-vs-trivial tsc triage rule: verify a one-line enum fix lowers the NET count before claiming it; if it shifts the reported error to an adjacent key in the same object literal, the whole map is stale (structural) — revert + defer."

requirements-completed: [LGPD-05]

# Metrics
duration: ~10min
completed: 2026-06-26
---

# Phase 16 Plan 04: Final Cleanups + tsc Burn-Down + RH-Login Fix Summary

**RH-path console.* removed (16-01 grep guard GREEN), dead biasMath runtime fns surgically deleted with live types intact, ci.yml tsc gate tightened 292→291, and the staged LoginRHPage cold-DB race+gate fix committed (R1 axe still green) — the final plan of Phase 16.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-26T13:33:43Z
- **Completed:** 2026-06-26T13:44Z
- **Tasks:** 3 (2 auto + 1 checkpoint handled as approved-with-deferral)
- **Files modified:** 4 modified + 1 deleted (across 3 task commits)

## Accomplishments

- **FX-14** — removed all 6 RH-path debug `console.log` sites (PerfilCandidatoRHPage `handleNavigation`/`handleLogout`/`handleVoltar`/`handleSalvarTranscricao{Online,Presencial}` + SuporteRHPage `handleSubmit`); the 16-01 `rh-console.grep` guard flips **GREEN 4/4**.
- **FX-15** — surgically deleted the dead runtime functions `computeAdverseImpact` + `bandFromAge` (and their now-unused `METODO`/`LIMITACAO` local constants) from `biasMath.ts`, **keeping every exported type** (`BandResult`, `AdverseImpactResult`, `AgeBand`, `BandInput`, `ComputeOptions`, `FOUR_FIFTHS_THRESHOLD`, `SMALL_SAMPLE_FLOOR`) that `biasAuditService.ts` + `BiasAuditPage.tsx` import live; deleted the orphaned `__tests__/biasMath.test.ts`. Build exits 0.
- **FOUND-08** — lowered the `ci.yml` unit-job tsc zero-growth gate from `-gt 292` to `-gt 291` (the genuine live count) so the gate tightens. The two "trivial" enum typos proved **structural** and were reverted (see Deviations).
- **LoginRHPage** — committed the staged cold-DB race+gate fix (poll `5×20ms=100ms` → `60×50ms=3s` for the `usuarios_rh` hydration round-trip; gate widened admin-only → `{rh, administrador}`). **No migration** authored (the RLS+grant+hook chain is already PROD-verified complete). R1 (`/auth/login-rh`) axe assertion confirmed still **green**.

## Task Commits

Each task was committed atomically via `git -c core.hooksPath=/dev/null` (project convention — bypasses the husky tsc pre-commit hook against the legacy baseline):

1. **Task 1: FX-14 RH-path console.* removal + FX-15 biasMath dead-fn surgical delete** — `97519af` (chore)
2. **Task 2: FOUND-08 — lower ci.yml tsc baseline 292 → 291; enum typos proved structural** — `6183457` (chore)
3. **Task 3 (checkpoint, deferral): commit staged LoginRHPage race+gate fix** — `464ead8` (fix)

**Plan metadata:** (this SUMMARY + STATE/ROADMAP) — final docs commit.

## Files Created/Modified

- `src/components/pages/PerfilCandidatoRHPage.tsx` — removed 5 debug `console.log` (handlers left as clean no-ops / pt-BR comments; `transcricao*` vars still consumed in JSX).
- `src/components/pages/SuporteRHPage.tsx` — removed 1 debug `console.log` in `handleSubmit`.
- `src/features/admin/bias-audit/biasMath.ts` — dead runtime fns + local consts removed; type exports + `FOUR_FIFTHS_THRESHOLD`/`SMALL_SAMPLE_FLOOR` preserved; JSDoc updated to describe the type-only contract.
- `src/features/admin/bias-audit/__tests__/biasMath.test.ts` — **deleted** (only exercised the removed fns).
- `src/components/pages/LoginRHPage.tsx` — staged race+gate fix committed.
- `.github/workflows/ci.yml` — tsc baseline literal `292` → `291` in the gate (`-gt`), step name, echo, and header comment; comment notes the FOUND-08 enum revert + map-realignment deferral.

## Decisions Made

1. **FOUND-08 enum typos REVERTED (not applied).** `clinica`→`clinico` (L581) and `big_five`→`bigfive` (L734) each cleared their TS2561 but immediately unmasked a TS2353 on the **next stale key in the same `Record<>` literal** (`ti` at L583 in `DEPARTAMENTO_LABELS`; `entrevista_telefonica` at L736 in `ETAPA_TO_KANBAN`). tsc reports only one excess-property per literal, so the **net count stays 291** — the maps are wholesale-stale vs their unions (e.g. `DEPARTAMENTO_LABELS` has `ti`/`rh`/`outro` and lacks `comercial` vs `Departamento = …|comercial|clinico|…|recursos_humanos|…|tecnologia`). Per the FOUND-08 guardrail + RESEARCH Pitfall 1 ("a one-line fix that produces a new error elsewhere = structural → revert + defer"), both were reverted. `vagasTypes.ts` is unchanged this plan; map-realignment is deferred with the `tempo_integral`/`TIPO_VAGA_LABELS` decision (16-01 backlog).
2. **ci.yml baseline = 291 (the genuine live count).** Lowered from the stale `292` literal to the real measured count, never raised — the gate tightens honestly.
3. **biasMath.ts kept alive for its types.** A flat `rm` would break the build (`BandResult is not exported`); only the dead runtime surface was removed.
4. **Task-3 checkpoint = approved-with-deferral.** No real RH account is available in-session; the frontend fix is committed and R1 axe is green, so the live RH cold-start round-trip is recorded as a deferred human-verification item (below) per the plan's explicit `<how-to-verify>` fallback.

## Deviations from Plan

### 1. [Rule 1 - Blocking-issue / Decision] FOUND-08 enum typos proved structural → reverted

- **Found during:** Task 2 (FOUND-08 enum fixes + ci.yml baseline)
- **Issue:** The plan + must_haves expected `clinica`→`clinico` and `big_five`→`bigfive` to be trivial one-liners that **drop tsc below 291**. On apply, the net count stayed **291 = 291**: each rename cleared its TS2561 but unmasked a TS2353 on the next stale key in the **same** `Record<>` map. The maps (`DEPARTAMENTO_LABELS`, `ETAPA_TO_KANBAN`) are wholesale-stale vs their current unions — a structural realignment, not a typo. This is the exact RESEARCH Pitfall 1 warning sign ("a one-line fix that produces a new error elsewhere = it was structural").
- **Fix:** Reverted both edits (`git checkout -- src/features/vagas/types/vagasTypes.ts`); `vagasTypes.ts` is unchanged this plan. Lowered the `ci.yml` gate to **291** (the genuine measured count) so it still tightens from the stale 292. Documented the map-realignment as deferred alongside the `tempo_integral`/`TIPO_VAGA_LABELS` decision.
- **Files modified:** `.github/workflows/ci.yml` (baseline 292→291); `src/features/vagas/types/vagasTypes.ts` reverted (no net change).
- **Verification:** `npm run -s lint` = 291 before and after the revert; `npm run build` exits 0; `ci.yml` gate literal now `-gt 291`.
- **Committed in:** `6183457` (Task 2 commit)

### 2. [Checkpoint deferral] Task-3 live RH cold-start round-trip deferred to HUMAN-UAT

- **Found during:** Task 3 (`checkpoint:human-verify`)
- **Issue:** No confirmed real `recrutador`/`administrador` PROD account is available in this autonomous session to exercise the live RH-login round-trip (RESEARCH A5 / Open-Q2).
- **Fix:** Handled as approved-with-deferral per the plan's `<how-to-verify>` fallback — committed the LoginRHPage fix (`464ead8`), confirmed build 0 and R1 axe green, and recorded the live round-trip as the deferred item below for the orchestrator to persist into 16-HUMAN-UAT.md.
- **Verification:** `npx playwright test e2e/a11y.spec.ts -g "R1"` → **1 passed** (zero serious/critical on `/auth/login-rh`); `npm run build` exits 0.
- **Committed in:** `464ead8` (Task 3 commit)

---

**Total deviations:** 1 auto-handled decision (Rule 1 — structural enum revert) + 1 checkpoint deferral.
**Impact on plan:** No scope creep. The console cleanup, biasMath slimming, ci.yml tightening, and LoginRHPage commit all landed as specified; the only divergence is that the "trivial" enum set was structural and stayed deferred (count held at 291, gate still tightened 292→291).

## Human Verification (deferred — for 16-HUMAN-UAT.md)

The frontend `LoginRHPage.tsx` race+gate fix is **committed** (`464ead8`); the only remaining manual gate is the **live RH cold-start login round-trip** (no real RH account available in-session). The orchestrator should persist this runbook into `16-HUMAN-UAT.md`:

**RH cold-start login round-trip (FX / auth — T-16-04-EoP verify):**
1. After an idle period (**COLD-START** — the stress case for the new 3s poll window), navigate to `/auth/login-rh`.
2. Log in with a real **`recrutador` (role `'rh'`)** account → confirm you land on **`/rh/dashboard`** and are NOT bounced to `/vagas` with *"Esta conta não tem acesso ao painel RH."*
3. Log in with a real **`administrador`** account → confirm the same (no false "sem acesso" bounce).
4. In devtools, inspect the JWT `app_metadata.role` (or the authStore `role`) → confirm it is `'rh'` or `'administrador'` respectively.
5. Confirm `/auth/login-rh` (R1) still renders the login form cleanly (axe AA bar). *(Automated R1 axe already GREEN this plan.)*

**Pass = both `rh` and `administrador` reach `/rh/dashboard` with the correct role in the JWT.** If no real RH account is available, record as a deferred item and approve to proceed — the frontend fix is committed and the server RLS (Phase 15 WR-03) is the real gate; the widened client gate cannot grant data the RLS doesn't already permit.

## Issues Encountered

- The "trivial" FOUND-08 enum set turned out to be structural (see Deviation 1) — resolved by reverting and tightening the ci.yml baseline to the genuine count. No other problems.

## User Setup Required

None — no external service configuration required. No migration authored (CONTEXT fact #1: the `usuarios_rh` RLS+grant+hook chain is already PROD-verified complete).

## Next Phase Readiness

- **Phase 16 plan execution: 4/4 — final plan landed.** FX-14 guard GREEN, biasMath slimmed (build 0), ci.yml gate tightened 292→291, LoginRHPage fix committed, R1 axe green.
- **Orchestrator-owned next:** persist the deferred RH cold-start round-trip into 16-HUMAN-UAT.md; run the Phase-16 verification gates (full Tier-A axe sweep + tsc baseline + verifier).
- **Deferred / backlog:** `DEPARTAMENTO_LABELS` + `ETAPA_TO_KANBAN` + `TIPO_VAGA_LABELS` map-realignment vs their unions (structural tsc tail, FOUND-08 follow-up); migration-version drift reconciliation (cosmetic).

## Self-Check: PASSED

- FOUND: `.planning/phases/16-compliance-a11y-hardening/16-04-SUMMARY.md`
- FOUND: `src/features/admin/bias-audit/biasMath.ts` (types preserved, dead fns removed)
- FOUND: `.github/workflows/ci.yml` (gate `-gt 291`)
- CONFIRMED DELETED: `src/features/admin/bias-audit/__tests__/biasMath.test.ts`
- FOUND commit: `97519af` (Task 1) · `6183457` (Task 2) · `464ead8` (Task 3)
- `npm run build` exits 0 · `npm run -s lint` = 291 · `rh-console.grep` 4/4 GREEN · R1 axe 1 passed

---
*Phase: 16-compliance-a11y-hardening*
*Completed: 2026-06-26*
