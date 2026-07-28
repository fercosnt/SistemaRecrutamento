---
phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil
plan: 02
subsystem: api
tags: [edge-function, deno, anthropic, promise-allsettled, bigfive, resilience, parallelization]

# Dependency graph
requires:
  - phase: 18 (Plan 01 — RESIL-01)
    provides: "callAi now caps each provider call with { timeout: AI_CALL_TIMEOUT_MS (25s), maxRetries: 0 } — the per-call wall the 5-way fan-out relies on for its worst-case ≈ max(1 call) budget"
  - phase: 12 (Plan 04 — bigfive devolutiva)
    provides: "gerar-devolutiva-bigfive handler, BAND_TEMPLATES, personalizeDim, the deterministic band selection + degrade contract, and the DI seam (HandlerDeps) the test mocks"
provides:
  - "gerar-devolutiva-bigfive fans out its 5 OCEAN dims via Promise.allSettled (concurrent) at 1 attempt/dim with per-dim deterministic degrade — eliminates achado #2 (5 sequential dims × up to 2 attempts blowing the EF execution window)"
  - "Deno regression test asserting parallel fan-out (deferred-promise concurrency gate), 1-attempt-per-dim, per-dim degrade to BAND_TEMPLATES, O-C-E-A-N order under out-of-order resolution, and single-dim-rejection isolation"
affects: [phase-18-plan-07 (BLOCKING redeploy — bundle freeze), phase-21 (live PROD round-trip), RESIL-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.allSettled fan-out over a fixed ordered set (DIMS) with index-mapped result reassembly → preserves input order independent of resolution order; per-element inline degrade so one rejection never loses the batch (NOT Promise.all)"
    - "Deferred-promise concurrency gate in Deno tests: a callAi mock that only resolves after all N invocations fired — a sequential await loop deadlocks (proves parallelism); allSettled releases the gate"

key-files:
  created:
    - "supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts"
  modified:
    - "supabase/functions/gerar-devolutiva-bigfive/index.ts"
    - "vite.config.ts"

key-decisions:
  - "Moved the existing bigfive Deno test from the function root (index.test.ts) into __tests__/ to match the _shared/__tests__/ convention and the 18-02 plan artifact path — one canonical test file per handler, no two competing files"
  - "Defensive inline degrade for a 'rejected' allSettled result even though personalizeDim never throws — defense-in-depth for T-18-02-T; the single-dim-rejection test exercises this path directly"
  - "Excluded gerar-devolutiva-bigfive/**/*.test.ts from Vitest (the moved test now matches Vitest's __tests__/ include glob but uses https://deno.land/npm: specifiers — deno test only)"

patterns-established:
  - "Index-mapped Promise.allSettled fan-out preserving a fixed output order with per-element degrade"
  - "Deferred-promise gate to assert concurrency (not sequencing) in a DI-mocked Deno handler test"

requirements-completed: [RESIL-02]

# Metrics
duration: 7min
completed: 2026-06-29
---

# Phase 18 Plan 02: Parallelize bigfive devolutiva (RESIL-02) Summary

**gerar-devolutiva-bigfive now fans out its 5 OCEAN dims via Promise.allSettled at 1 attempt/dim with per-dim deterministic degrade and preserved O-C-E-A-N order — killing the 5×2 sequential AI-call timeout (achado #2) while keeping RNF-07a (degrade writes only templates, never a decision).**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-06-29T03:01Z (-03:00)
- **Completed:** 2026-06-29T03:08Z (-03:00)
- **Tasks:** 2 (both TDD)
- **Files modified:** 3 (2 code/test + 1 config fix)

## Accomplishments
- Replaced the sequential `for (const dim of DIMS) { await personalizeDim(...) }` loop with `await Promise.allSettled(DIMS.map(...))` — the 5 dims now run concurrently; worst-case wall time ≈ max(single call) instead of the sum of 5 calls.
- Mapped `allSettled` results back to `paginas` by INPUT index → O-C-E-A-N order is preserved regardless of which dim resolves first; the `dashboard[]` array is derived from the same index-mapped `paginas`.
- Dropped `personalizeDim`'s attempt loop from 2 to 1 (D-Área1: 1 attempt/dim under parallel) while keeping the `inRange` word-count gate and the raw-template degrade (still never throws).
- Added per-dim inline degrade for any `rejected` allSettled result (defense-in-depth — a single dim's hard failure can never lose the other 4).
- New Deno regression test (7 cases) asserting concurrency (deferred-promise gate), 1-attempt-per-dim, per-dim degrade text == BAND_TEMPLATES, O-C-E-A-N order under reverse resolution, and single-dim-rejection isolation + RNF-07a.

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: Deno test for parallel + 1-attempt + degrade + OCEAN order (RED)** — `fd54d75` (test)
2. **Task 2: Parallelize the 5-dim handler with Promise.allSettled + 1 attempt/dim (GREEN)** — `167e485` (feat)

**Plan metadata:** (this commit) `docs(18-02): complete plan`

_TDD: the RED commit moved the test into `__tests__/` and asserted the target parallel/1-attempt shape (the concurrency case deadlocks on sequential code); the GREEN commit made it pass._

## Files Created/Modified
- `supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts` — created (moved from function root + RESIL-02 cases): band selection, RF-19b refuse, happy path, 1-attempt degrade, allSettled concurrency (deferred-promise gate), O-C-E-A-N order, single-dim-rejection isolation.
- `supabase/functions/gerar-devolutiva-bigfive/index.ts` — `Promise.allSettled` fan-out (index-mapped, OCEAN-order-safe, inline degrade for rejected); `personalizeDim` attempt loop `< 2` → `< 1`; `export` on `BAND_TEMPLATES` (degrade-text assertions).
- `vite.config.ts` — added `supabase/functions/gerar-devolutiva-bigfive/**/*.test.ts` to the Vitest `test.exclude` (the moved test now matches the `__tests__/` include glob but is a Deno test).

## Decisions Made
- **Single canonical test file:** moved `gerar-devolutiva-bigfive/index.test.ts` → `__tests__/index.test.ts` (the plan's artifact path + the `_shared/__tests__/` convention) and `git rm`'d the root copy, rather than maintaining two files for one handler.
- **Defensive `rejected` branch:** kept an inline degrade for a `rejected` allSettled result even though `personalizeDim` never throws — covers the (theoretical) hard-failure path and satisfies T-18-02-T; the rejection test proves the other 4 dims survive.
- **`Promise.allSettled` (not `Promise.all`):** locked by CONTEXT/Anti-Pattern — one rejected dim must not reject the whole batch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded the moved bigfive Deno test from Vitest**
- **Found during:** Task 2 (after moving the test into `__tests__/` and running `npm run test:run`)
- **Issue:** Moving the test from the function root into `__tests__/` made it match Vitest's `include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']` glob. Vitest then tried to load the Deno test under the Node ESM loader and errored on its `https://deno.land` / `npm:` specifiers — a regression I introduced (the old root-level path was never matched by Vitest).
- **Fix:** Added `supabase/functions/gerar-devolutiva-bigfive/**/*.test.ts` to the `vite.config.ts` `test.exclude` array, mirroring the existing per-EF exclusion pattern (avaliar-redacao, analise-candidato-individual, etc.).
- **Files modified:** `vite.config.ts`
- **Verification:** `npm run test:run` — bigfive no longer in the failure list; 637 tests pass; the EF test stays green under `deno test`.
- **Committed in:** `167e485` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking). No scope creep — the fix only re-establishes the pre-existing Vitest/Deno test boundary that the file move disturbed.

## Issues Encountered
- **Pre-existing (out of scope, NOT fixed):** `npm run test:run` reports 2 other failed *suites* (0 failed tests) — `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` (added in `350e994`, FIX-01) and `supabase/functions/_shared/__tests__/essay-schemas.test.ts` (added in `3af37d8`, Phase 13). Both are Deno tests living in `__tests__/` dirs that Vitest cannot load and that are NOT in the exclude list — they were already failing before this plan. Logged to `18-.../deferred-items.md`; a good fit for Plan 18-07 (deploy/cleanup), since FIX-01's Deno test is one consolidar suite that should run under `deno test`.

## Verification
- `deno test --allow-read --allow-env supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts` → **7 passed | 0 failed** (concurrency case completes 0ms; OCEAN-order case resolves reverse yet keeps order).
- `deno check supabase/functions/gerar-devolutiva-bigfive/index.ts` → clean (exit 0).
- `grep -n "Promise.allSettled"` → present (fan-out); `grep -n "Promise.all("` → absent (no Promise.all for the fan-out).
- `personalizeDim` attempt loop bound = `< 1`; `inRange` gate + raw-template degrade intact.
- Preservation guards unchanged (diff-reviewed): RF-19b `tipo !== "big_five"` refuse, LGPD `candidato_id`/`vaga_id` attribution, service_role precondition read, `max_tokens: 1200`, serve-wrapper status mapping (`refused`→422 / `falhou`→500 / else 200), static `npm:` imports.
- `npm run lint` (tsc --noEmit) → **258 errors** (exactly the FOUND-08 baseline; EF-only change does not touch the frontend tsc project).
- `npm run test:run` → **637 tests pass**; 2 pre-existing failed Deno suites remain (out of scope, deferred).

## Threat Flags
None — no new network endpoint, auth path, file access, or schema surface. The change is internal to the handler's fan-out; the serve-wrapper authz, LGPD attribution, and service_role read are untouched (T-18-02-EoP/ID preserved).

## Next Phase Readiness
- **Code-only — NOT live in PROD.** Per `reference_ef_shared_bundle_freeze` + the plan, this change takes effect in PROD only after the `[BLOCKING]` human-gated redeploy of `gerar-devolutiva-bigfive` (and the other AI EFs importing the updated `callAi`) in **Plan 18-07**. Do NOT redeploy here.
- Live PROD round-trip verification of the parallelized devolutiva is deferred to **Phase 21** (PROD-01/02).
- `BAND_TEMPLATES` is now exported — any future test/consumer can import the deterministic degrade source.

## Self-Check: PASSED

- `supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts` — FOUND
- `supabase/functions/gerar-devolutiva-bigfive/index.ts` — FOUND (modified)
- `vite.config.ts` — FOUND (modified)
- Commit `fd54d75` (test RED) — FOUND
- Commit `167e485` (feat GREEN) — FOUND

---
*Phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil*
*Completed: 2026-06-29*
