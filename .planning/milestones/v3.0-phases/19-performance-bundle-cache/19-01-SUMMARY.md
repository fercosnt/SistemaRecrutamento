---
phase: 19-performance-bundle-cache
plan: 01
subsystem: build-config + client-cache-tests
tags: [perf-03, perf-04, code-splitting, react-lazy, suspense, tanstack-query, invalidation, wave-0, tdd-red, scaffold]
requires:
  - "src/components/ui/AsyncState.tsx (skeleton + glass idiom analog)"
  - "src/components/ui/glass.tsx (Glass primitive)"
  - "src/components/ui/skeleton.tsx (Skeleton primitive)"
  - "src/features/decisao/hooks/useConsolidacao.ts (decisaoKeys.consolidacao factory)"
  - "src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts (renderHook + per-test QueryClient harness)"
provides:
  - "src/router/lazyNamed.ts → lazyNamed(loader, name) named-export→default adapter (Plan 19-02 consumes)"
  - "src/components/ui/PageSkeleton.tsx → PageSkeleton Suspense fallback (Plan 19-02 wires into RootLayout)"
  - "scripts/assert-chunks.mjs → PERF-03 build-output chunk gate (Plan 19-02 runs after npm run build)"
  - "src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts → PERF-04 Gap A regression test (Plan 19-03 turns GREEN)"
  - "src/features/triagem/hooks/__tests__/useRedacaoRevisao.test.ts → PERF-04 Gap B regression test (Plan 19-03 turns GREEN)"
affects:
  - "Plan 19-02 (PERF-03 code-split): consumes lazyNamed + PageSkeleton + assert-chunks harness"
  - "Plan 19-03 (PERF-04 invalidation): turns the 2 RED regression tests GREEN"
tech-stack:
  added: []
  patterns:
    - "First React.lazy/Suspense usage in the codebase — lazyNamed adapter founds the named-export→default convention (CLAUDE.md forbids default exports)"
    - "First queryClient.invalidateQueries-spy unit test pattern (vi.spyOn(queryClient, 'invalidateQueries'))"
    - "First build-output assertion harness (node: built-ins, runs under build gate not Vitest)"
key-files:
  created:
    - src/router/lazyNamed.ts
    - src/components/ui/PageSkeleton.tsx
    - src/router/__tests__/lazyNamed.test.tsx
    - src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts
    - src/features/triagem/hooks/__tests__/useRedacaoRevisao.test.ts
    - scripts/assert-chunks.mjs
  modified: []
decisions:
  - "Contract-typed RED test calls (ScorecardWithVagaId cast / SalvarRevisaoVars) keep tsc at the 258 baseline while asserting the post-Plan-03 signature — no new tsc errors from referencing future contracts."
  - "assert-chunks baseline = 2,788,270 bytes (2722.92 KiB on disk = the RESEARCH-cited 2,788.27 kB Vite-reported value); the pre-split monolith equals it exactly, so the < comparison fails as intended."
  - "PageSkeleton includes the optional Loader2 spinner + 'Carregando…' label (no AsyncState dependency — self-contained, no hooks/data) per CONTEXT Área 1 branded-glass-no-blank-flash."
metrics:
  duration: ~5 min
  tasks: 3
  files: 6
  completed: "2026-06-29"
  tsc_errors: 258
  vitest: "659 passed / 2 RED-by-design (661 total)"
---

# Phase 19 Plan 01: Performance — Bundle & Cache (Wave-0 Scaffolds) Summary

Founded the project's first `React.lazy` adapter (`lazyNamed`), the branded glass Suspense fallback (`PageSkeleton`), the PERF-03 build-output chunk-assertion gate (`scripts/assert-chunks.mjs`), and the two PERF-04 targeted-invalidation regression tests (RED by design until Plan 19-03) — all contracts that Plans 19-02 (code-split) and 19-03 (invalidation) build against, with tsc held flat at the 258 baseline.

## What Was Built

### Task 1 — lazyNamed adapter + PageSkeleton fallback + adapter test (`feat`, d8b3b9f)
- `src/router/lazyNamed.ts` — `lazyNamed(loader, name)` remaps a NAMED export onto `React.lazy`'s required `{ default }` shape via `loader().then(m => ({ default: m[name] }))`. This is THE reason the helper exists: the project uses named exports exclusively (CLAUDE.md), which collides with `React.lazy`'s default-export requirement. Declared for module-top-level use only.
- `src/components/ui/PageSkeleton.tsx` — named-export `PageSkeleton()`, the single Suspense fallback for lazy routes. Reuses the `AsyncState` glass idiom (`<Skeleton className="h-24 w-full bg-white/5" />` + centered `<Loader2 animate-spin>`) inside `<Glass variant="dark" blur="lg">`. Self-contained: no data, no hooks.
- `src/router/__tests__/lazyNamed.test.tsx` — PERF-03 adapter unit test (2 cases): a named export resolves and renders behind `<Suspense>`; the requested name is picked from a multi-export module. **GREEN immediately.**

### Task 2 — PERF-04 invalidation regression tests (`test`, RED, 043f186)
- `src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts` (Gap A) — asserts `salvarAvaliacao` success invalidates the TARGETED `decisaoKeys.consolidacao(candidaturaId, vagaId)` key (built from the real imported factory, not `decisaoKeys.all`). Renders the hook with the post-Plan-03 `(candidaturaId, vagaId)` signature; spies on `queryClient.invalidateQueries`.
- `src/features/triagem/hooks/__tests__/useRedacaoRevisao.test.ts` (Gap B) — asserts `salvarRevisao` success invalidates `decisaoKeys.consolidacao(rowCandidaturaId, vagaId)`, threading the per-row `candidatura_id` through the post-Plan-03 mutation variables `{ redacaoId, candidaturaId, payload }`.
- Both reuse the `useVagaPerguntas.test.ts` harness (per-test `QueryClient({ defaultOptions: { queries: { retry: false } } })` + `createElement` wrapper + `vi.hoisted` service mocks). This establishes the project's **first `invalidateQueries`-spy pattern**.

### Task 3 — PERF-03 build-output chunk-assertion harness (`test`, fd49e2e)
- `scripts/assert-chunks.mjs` — standalone Node ESM gate (`node: built-ins only, no new deps`). Reads `build/assets/*.js` and asserts 4 PERF-03 conditions: (1) a `react-vendor-*.js` chunk exists, (2) the eager `index-*.js` is smaller than the 2,788,270-byte baseline, (3) jsPDF markers are ABSENT from the eager index chunk (only in a dynamic chunk), (4) more js chunks emit than the pre-split floor (lazy `/rh/* /admin/*` routes split out). Prints a human-readable chunk inventory; exits non-zero with actionable messages. Runs under the build gate (`scripts/**` excluded from Vitest), invoked by Plan 19-02. Tolerates a missing `build/` with a "run npm run build first" message.

## TDD Gate Compliance

Task 2 is `tdd="true"` and was committed at the **RED** gate intentionally (a `test(...)` commit), per the plan and the executor's sequential-execution directive: this is a Wave-0 scaffold where the 2 invalidation regression tests are EXPECTED to fail until Plan 19-03 wires the hook signature changes + the `decisaoKeys.consolidacao` invalidation. The GREEN gate (a `feat(...)` turning them green) is owned by Plan 19-03 — out of scope here. The lazyNamed adapter test (Task 1) is GREEN now; the chunk harness (Task 3) runs under `npm run build`, not Vitest.

## Verification Results

- **lazyNamed.test.tsx:** GREEN (2/2 cases pass).
- **PERF-04 regression tests:** RED by design — both fail because `salvarAvaliacao`/`salvarRevisao` currently invalidate only their own keys (`entrevistaKeys.scorecard` / `redacaoRevisaoKeys.queue` + `.duvidas`) and NOT `decisaoKeys.consolidacao`. The mutations DO resolve and the spy IS called (harness verified working); only the targeted consolidacao key is missing. Plan 19-03 turns them GREEN.
- **assert-chunks.mjs:** Exits non-zero (1) against the current pre-split monolith — all 4 assertions fire (no react-vendor, no shrink vs baseline, `jspdf` marker present in the eager `index-CphRg52V.js`, only 4 chunks ≤ floor). Proves it is a real gate, not a no-op.
- **Full vitest suite:** `659 passed / 2 failed (661 total)` — the ONLY 2 failures are the two intentionally-RED PERF-04 tests.
- **tsc (`npm run lint`):** **258 errors — flat at the FOUND-08/M4 baseline. ZERO new errors introduced.** (≤ 258 required.) ✓

## Deviations from Plan

None — plan executed exactly as written. All 6 files created at their specified paths; no source hooks/routes/vite.config touched (those are owned by Plans 19-02/19-03). The contract-typed RED test calls (the `as unknown as ScorecardWithVagaId` cast and the `SalvarRevisaoVars` shape with `as never`) were applied as anticipated by the plan's acceptance criteria ("gate the call with the post-Plan-03 signature so the file type-checks against the intended contract") to keep tsc at 258.

## Authentication Gates

None — pure build-config + in-memory test work; no Supabase/network/auth interaction.

## Known Stubs

None. The PageSkeleton renders static branded markup (intentional, no data source — it is a Suspense fallback). The 2 RED tests are scaffolds documented above (turn GREEN in 19-03), not stubs.

## Self-Check: PASSED

- FOUND: src/router/lazyNamed.ts
- FOUND: src/components/ui/PageSkeleton.tsx
- FOUND: src/router/__tests__/lazyNamed.test.tsx
- FOUND: src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts
- FOUND: src/features/triagem/hooks/__tests__/useRedacaoRevisao.test.ts
- FOUND: scripts/assert-chunks.mjs
- FOUND: commit d8b3b9f (Task 1)
- FOUND: commit 043f186 (Task 2)
- FOUND: commit fd49e2e (Task 3)
