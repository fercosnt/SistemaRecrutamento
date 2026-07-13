---
phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos
plan: 08
subsystem: infra
tags: [ci, github-actions, tsc, typescript, baseline, regression-net]

# Dependency graph
requires:
  - phase: 25 (25-02..25-06)
    provides: "enum re-alias to DB enum + Editar-Vaga phantom-column removal + mock-screen gutting that dropped the tsc error count 128 -> 107"
provides:
  - "CI tsc gate re-pinned to the MEASURED post-Phase-25 count (107), red-on-growth preserved"
  - "FUNIL-04 regression net: a new type error introduced after Phase 25 now trips CI (was silently loose until 134)"
affects: [phase-26, phase-27, ci, tsc-baseline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "measure-first re-pin: pin the CI tsc gate to the freshly measured count, never to a guessed/carried-over number"
    - "keep superseded baselines as narrative history (like the 292/291/290 chain), move only the operative pin"

key-files:
  created:
    - .planning/phases/25-corre-o-do-funil-lado-rh-enums-colunas-contratos/25-08-SUMMARY.md
  modified:
    - .github/workflows/ci.yml

key-decisions:
  - "Measured N = 107 (both `npx tsc --noEmit | grep -c 'error TS'` and CI's `npm run -s lint` agree), not the plan-estimated 113-114 — 25-06's mock-screen gutting cleared an extra -8 the estimate did not fully anticipate. Pinned to the measured 107, not the estimate."
  - "Re-pinned only the OPERATIVE gate refs (step label, echo, `-gt` compare, error message) to 107; kept the Phase-22 '257 -> 133' cascade + '290' as superseded narrative history, mirroring how ci.yml already preserves the 292/291/290 chain."

patterns-established:
  - "CI tsc gate is honest: pinned == freshly measured N; red only on growth above N"

requirements-completed: [FUNIL-04]

# Metrics
duration: 9min
completed: 2026-07-12
---

# Phase 25 Plan 08: CI tsc Baseline Re-pin Summary

**Re-pinned the CI `tsc --noEmit` frozen baseline from a stale 133 to the MEASURED post-Phase-25 count of 107 (a real -21 clearance from the 128 that entered the phase), locking in the enum-cutover + phantom-column + mock-screen reductions and closing the FUNIL-04 regression hole where CI stayed green until 134.**

## Performance

- **Duration:** ~9 min
- **Tasks:** 1
- **Files modified:** 1 (`.github/workflows/ci.yml`)

## Accomplishments

- Measured the merged Phase-25 tree twice, via both the plan's `npx tsc --noEmit 2>/dev/null | grep -c "error TS"` and CI's exact `npm run -s lint 2>&1 | grep -c "error TS"` — both returned **107** (stable, agree).
- Re-pinned every operative `133` in `ci.yml` to `107`: the step label, the `echo "…frozen baseline: 107"`, the compare `if [ "$COUNT" -gt 107 ]`, and the `::error::…exceeds frozen baseline (107)` message.
- Added a Phase-25 line to the header narrative documenting the 128 → 107 clearance and the measure-first lesson (the 133 pin had gone stale/loose so CI only tripped at 134).
- Preserved red-on-growth semantics (`-gt`) and the measurement command unchanged.

## Task Commits

Each task was committed atomically (via the allowlisted hook-bypass `git -c core.hooksPath=/dev/null` — the husky pre-commit runs `npm run lint` which fails against the now-lower baseline until this very commit lands):

1. **Task 1: Measure the post-fix tsc count and re-pin ci.yml** — `2f75155` (ci)

**Plan metadata:** (final docs commit — this SUMMARY + STATE.md + ROADMAP.md)

## Files Created/Modified

- `.github/workflows/ci.yml` — tsc gate re-pinned 133 → 107 (4 operative refs + header narrative); Phase-25 history line added.

## Verification

Plan `<verify>` automated block passed:

```
measured=107 pinned=107
REPIN_OK
```

- `grep -oE 'frozen baseline: ?[0-9]+' ci.yml` (the echo) → **107** == measured **107** ✓
- N = 107 **< 128** (the phase reduced the count) ✓
- compare is still **`-gt`** (red-on-growth) ✓
- `npm run build` unaffected — the change is isolated to a GitHub Actions YAML not consumed by the Vite build ✓

## Decisions Made

- **Pinned to the MEASURED 107, not the plan-estimated 113–114.** The estimate (−14 from 128) predated 25-06's mock-screen gutting, which cleared an extra −8. Measure-first is load-bearing (Pitfall 1): "keep 128 green" and "trust the 113-114 estimate" would both be wrong. 107 is what the merged tree actually types.
- **Kept the Phase-22 `257 -> 133` cascade and the `290` as superseded historical narrative**, updating only the operative gate references — mirroring ci.yml's existing precedent of preserving the 292/291/290 history when Phase 22 re-pinned to 133. The 4 remaining `133` literals are all clearly-labeled history ("a measured 133", "the 133 pin had gone stale/loose", "now-superseded 133"); none refer to the current baseline (satisfies the acceptance parenthetical "or none refer to the tsc baseline").

## Deviations from Plan

None — plan executed exactly as written. The only expected-vs-actual gap was numeric (measured 107 vs the plan's ≈113–114 estimate), which is precisely what the measure-first mandate exists to catch: 107 < 128, so it is the correct direction (a further reduction, not a regression) and was pinned to the exact measured value per the plan's `<action>` ("If N is unexpectedly ≥ 128, STOP" — N is well under 128, so no stop condition).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The CI tsc gate is honestly pinned to 107; Phase 26 (Funil lado candidato) and Phase 27 (Migrations & Rede de Testes) inherit a tight regression net — any new type error trips CI at 108.
- Maintenance note carried forward: tsconfig `paths` must stay in sync with `vite.config.ts resolve.alias`, or the 65 phantom TS2307 return and the 107 gate goes red.

## Self-Check: PASSED

- FOUND: `.planning/phases/25-corre-o-do-funil-lado-rh-enums-colunas-contratos/25-08-SUMMARY.md`
- FOUND: commit `2f75155` (Task 1)

---
*Phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos*
*Completed: 2026-07-12*
