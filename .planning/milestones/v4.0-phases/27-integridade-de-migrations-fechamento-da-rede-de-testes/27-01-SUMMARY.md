---
phase: 27-integridade-de-migrations-fechamento-da-rede-de-testes
plan: 01
subsystem: testing
tags: [ci, deno, vitest, bundle-gate, error-handling, tsc-baseline]

# Dependency graph
requires:
  - phase: 22-rede-de-testes
    provides: "frozen tsc baseline gate (107) + BLOCKING deno-test CI job (EF corpus, type-check ON)"
  - phase: 19-performance
    provides: "scripts/assert-chunks.mjs PERF-03 bundle assertions (tuned floors)"
  - phase: 18-ef-resilience
    provides: "canonical src/lib/efErrors.ts extractEfErrorCode(data, error) helper"
provides:
  - "CI-06: entrevistaService uses the single canonical extractEfErrorCode from @/lib/efErrors (inverted local copy deleted)"
  - "CI-10: assert-chunks bundle gate wired as npm postbuild lifecycle + dedicated e2e CI step"
  - "CI-15: sync-prompts Deno test type-checks clean (TS2352 repaired) and runs as a distinct BLOCKING deno-test CI step"
affects: [27-02, 27-03, ci-maintenance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "double-cast-through-unknown to narrow a dynamically-imported Deno module to a test-local shape without weakening type-check"
    - "npm postbuild lifecycle self-gates a build-artifact assertion; a paired dedicated CI step gives a distinct failure signal"

key-files:
  created: []
  modified:
    - src/features/entrevista/services/entrevistaService.ts
    - package.json
    - .github/workflows/ci.yml
    - scripts/__tests__/sync-prompts.test.ts

key-decisions:
  - "CI-06 dedup: canonical (data, error)->Promise<string|undefined> arg order; VALIDATION === compare unaffected by the null->undefined miss change"
  - "CI-10: wire BOTH postbuild (build self-gate) AND a dedicated e2e CI step; assert-chunks.mjs body left byte-unchanged (Phase-19 floors intact)"
  - "CI-15: repaired the TS2352 via double-cast-through-unknown (not --no-check); new CI step carries no --config and no type-check-skip flag, matching the corpus step's blocking posture"

patterns-established:
  - "double-cast-through-unknown idiom for dynamic-import module casts in Deno tests (keeps type-check ON)"
  - "postbuild + dedicated-CI-step pairing for build-artifact gates"

requirements-completed: [CI-06, CI-10, CI-15]

# Metrics
duration: ~15min
completed: 2026-07-12
---

# Phase 27 Plan 01: Fechamento da Rede de Testes (CI-06/CI-10/CI-15) Summary

**Deduped the inverted `extractEfErrorCode` in entrevistaService onto the canonical `@/lib/efErrors` helper, wired the `assert-chunks.mjs` bundle gate into build (postbuild) + CI, and repaired the latent TS2352 in the sync-prompts Deno test so it runs type-check-ON as a distinct blocking CI step.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-12T18:52:00Z (approx)
- **Completed:** 2026-07-12T19:07:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- CI-06: entrevistaService.ts now imports the one canonical `extractEfErrorCode(data, error) → Promise<string|undefined>`; the inverted `(error, data) → Promise<string|null>` local copy is deleted (no reimplementation to drift).
- CI-10: `npm run build` self-gates the PERF-03 bundle assertions via a new `postbuild` lifecycle, and a dedicated `Bundle gate (PERF-03)` step in the e2e job gives a clean distinct CI signal — `assert-chunks.mjs` body left byte-unchanged.
- CI-15: the `sync-prompts.test.ts` module cast is repaired (double-cast through `unknown`), so `deno test --allow-env --allow-read scripts/__tests__/` exits 0 with type-check ON (7/7 pass, TS2352 gone); a distinct BLOCKING `Deno scripts test (sync-prompts)` step is wired into the existing `deno-test` job, with the EF corpus command left untouched.

## Task Commits

Each task was committed atomically (all via the allowlisted `git -c core.hooksPath=/dev/null` bypass — the husky pre-commit `npm run lint` would trip the frozen tsc baseline):

1. **Task 1: CI-06 — dedup extractEfErrorCode** — `d7ae301` (refactor)
2. **Task 2: CI-10 — wire assert-chunks (postbuild + CI step)** — `381b5fb` (chore)
3. **Task 3: CI-15 — repair sync-prompts TS2352 + wire into deno-test CI** — `c3b6fab` (test)

**Plan metadata:** committed separately with SUMMARY.md + STATE.md + ROADMAP.md.

## Files Created/Modified
- `src/features/entrevista/services/entrevistaService.ts` — import canonical helper; swap call site to `(data, error)`; delete the local inverted `extractEfErrorCode` (net −22 lines).
- `package.json` — add `postbuild` (runs `node scripts/assert-chunks.mjs` after `vite build`) + `assert:chunks` script.
- `.github/workflows/ci.yml` — add `Bundle gate (PERF-03)` step to the e2e job after Build; add `Deno scripts test (sync-prompts)` step to the deno-test job (type-check ON, no `--config`).
- `scripts/__tests__/sync-prompts.test.ts` — `return mod as { … }` → `return mod as unknown as { … }` in `loadSync()` (double-cast idiom) with an explanatory comment.

## Decisions Made
- **CI-06 arg order:** used the canonical `(data, error)` order and confirmed the `if (efCode === 'VALIDATION')` branch is unaffected by the `null`→`undefined` miss semantics (the `===` string compare is identical).
- **CI-10 double-wire:** did BOTH postbuild (local + inherited build self-gate) and a dedicated CI step (clean distinct failure signal), per plan; deliberately did NOT touch `assert-chunks.mjs` or retune its Phase-19 floors.
- **CI-15 type-check-ON:** repaired via double-cast-through-`unknown` rather than the optional real-types route (simplest, guaranteed to type-check); refused the `--no-check` escape hatch so the new step matches the corpus job's blocking posture.

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes (Rules 1–3) were required; the pre-existing TS2352 the plan predicted at `sync-prompts.test.ts:30` was reproduced and repaired exactly as specified (STEP A). No architectural decisions (Rule 4) arose. No package installs.

## Issues Encountered
- Reproduced the predicted `TS2352` (`UpsertRow` closed interface not comparable to `Record<string, unknown>`) via `deno test` before fixing; the double-cast repair cleared it and all 7 cases pass with type-check ON. No other problems.

## Verification (all green)
- `npm run test:run` → **775/775** passed (efErrors + entrevista suites green).
- `npm run -s lint 2>&1 | grep -c "error TS"` → **104** (≤ 107 frozen baseline; no inflation — this plan does NOT re-pin, 27-03 does).
- `npm run build` → succeeds; `postbuild` runs `assert-chunks` clean (react-vendor present, eager index 882 kB < baseline, 41 chunks > floor, no jsPDF markers); standalone `node scripts/assert-chunks.mjs` exits 0.
- `deno test --allow-env --allow-read scripts/__tests__/` → **exit 0, 7/7 pass, type-check ON** (no `--no-check`).
- `git diff --stat scripts/assert-chunks.mjs` → no change (body byte-unchanged).
- Grep gates: local dup 0, canonical import 1, call site `(data, error)` present, `as unknown as` ≥1, ci.yml `scripts/assert-chunks.mjs` ≥1, ci.yml `scripts/__tests__/` ≥1, EF corpus command still count 1.

## User Setup Required
None — no external service configuration required. (These are CI/build-gate wirings; they take effect on the next CI run and on `npm run build` locally.)

## Next Phase Readiness
- The three file-disjoint test-net gates are wired and green; ready for 27-02 (migration/schema work) and 27-03 (measure-last tsc re-pin — this plan intentionally left the 107 baseline untouched; the −0 net tsc change here means 27-03 will still measure 104).
- Blockers/concerns: none.

## Self-Check: PASSED
- FOUND: src/features/entrevista/services/entrevistaService.ts
- FOUND: package.json
- FOUND: .github/workflows/ci.yml
- FOUND: scripts/__tests__/sync-prompts.test.ts
- FOUND: commit d7ae301
- FOUND: commit 381b5fb
- FOUND: commit c3b6fab

---
*Phase: 27-integridade-de-migrations-fechamento-da-rede-de-testes*
*Completed: 2026-07-12*
