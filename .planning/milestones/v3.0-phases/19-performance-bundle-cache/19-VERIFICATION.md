---
phase: 19-performance-bundle-cache
verified: 2026-06-29T19:20:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navigate to an /rh/* route (e.g. /rh/candidatos) in a production or dev build and confirm the PageSkeleton glass spinner appears briefly then the page renders with no blank flash and no JS error in the console."
    expected: "The branded glass skeleton appears while the lazy chunk loads (first visit) and the destination heading renders within a second. No blank screen, no Suspense fallback stuck."
    why_human: "Visual/runtime behavior of Suspense fallback requires a running browser; cannot be verified by grep or chunk analysis."
  - test: "Open the candidate dashboard in one browser tab (logged in as candidato). In a second session (RH), update the candidatura status (e.g. approve or advance stage). Within 60 seconds, focus the candidate tab and confirm the new status appears without a manual refresh."
    expected: "The dashboard status updates in ≤60s on window focus due to refetchOnWindowFocus:true + staleTime 1min on useCandidaturas."
    why_human: "Cross-client timing with two concurrent browser sessions requires live app interaction; cannot be simulated by unit tests."
deferred:
  - truth: "Lazy RH/admin routes resolve at runtime with no navigation regression in PROD"
    addressed_in: "Phase 21"
    evidence: "Phase 21 (Production-Readiness — UATs) — PROD-01/PROD-02 cover live UATs of the running system including PROD navigation checks."
  - truth: "Cross-client ≤60s freshness with two real browser sessions in PROD"
    addressed_in: "Phase 21"
    evidence: "Phase 21 (Production-Readiness — UATs) — 19-VALIDATION.md explicitly lists cross-client ≤60s freshness as a Phase 21 manual UAT item."
---

# Phase 19: Performance — Bundle & Cache Verification Report

**Phase Goal:** O candidato mobile-first deixa de pagar o bundle monolítico de 661 KiB no first paint, e qualquer mudança escrita por candidato ou RH aparece no perfil/dashboard do candidato em ≤60s.
**Verified:** 2026-06-29T19:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Candidate first paint loads only the eager route chunk + react-vendor (not /rh/*, /admin/*, jsPDF, recharts) | ✓ VERIFIED | `assert-chunks.mjs` exit 0: eager index 883.35 kB < 2722.92 kB baseline; jsPDF absent from index-czR9OIOb.js; 41 chunks vs 4 pre-split floor; react-vendor-CSwU0OnC.js emitted |
| 2 | /rh/* and /admin/* routes are lazy-loaded via lazyNamed with RoleGuard staying OUTSIDE the lazy element | ✓ VERIFIED | routes.tsx: 20 `lazyNamed()` calls for all RH/admin pages; element blocks byte-identical with `<RoleGuard ...><LazyPage/></RoleGuard>`; `grep -c "RoleGuard"` shows 31 opening+closing tags intact |
| 3 | manualChunks groups only react/react-dom/react-router/scheduler into react-vendor (narrow, not broad) | ✓ VERIFIED | vite.config.ts L123-130: `manualChunks(id)` returns 'react-vendor' only for those 4 packages; build output has `react-vendor-CSwU0OnC.js` (202.96 kB) as a separate cacheable chunk |
| 4 | jsPDF loads via dynamic import() at the export click in ComparativoScreen, not at top level | ✓ VERIFIED | ComparativoScreen.tsx L37: `import type { RankedCandidate }` (type-only); L122: `const { exportComparativo } = await import('../pdf/exportComparativo')` in async handleExport |
| 5 | salvarAvaliacao success invalidates decisaoKeys.consolidacao(candidaturaId, vagaId) — TARGETED, not broad | ✓ VERIFIED | useEntrevistaScorecard.ts L197-200: invalidates `decisaoKeys.consolidacao(candidaturaId, vagaId)` when both ids present (falls back to prefix key when vagaId undefined — WR-02 robustness); regression test GREEN (2/2) |
| 6 | salvarRevisao success invalidates decisaoKeys.consolidacao(rowCandidaturaId, vagaId) — per-row threading | ✓ VERIFIED | useRedacaoRevisao.ts L74-77: `vars.candidaturaId` threaded from mutation variables into `decisaoKeys.consolidacao(vars.candidaturaId, vagaId)` guarded by both present; regression test GREEN (1/1) |
| 7 | useCandidaturas has per-query refetchOnWindowFocus:true with staleTime 1min; global default stays false | ✓ VERIFIED | useCandidaturas.ts L112+L121: `staleTime: 1 * 60 * 1000` + `refetchOnWindowFocus: true`; App.tsx L43: global `refetchOnWindowFocus: false` untouched |
| 8 | No new write to candidaturas by trait/score/idade — RNF-07a preserved | ✓ VERIFIED | Both hooks only call `queryClient.invalidateQueries` (cache invalidation); mutationFn in useRedacaoRevisao still calls `salvarRevisao(redacaoId, payload)` (service signature unchanged, candidaturaId is invalidation-only); no candidaturas INSERT/UPDATE introduced |

**Score:** 6/6 must-haves from PLAN frontmatter verified. All 8 observable truths (derived from phase goal + plan) verified.

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Live visual no-regression for lazy RH/admin routes in PROD | Phase 21 | Phase 21 (PROD-01/PROD-02 live UATs) — 19-VALIDATION.md explicitly labels this "Phase 21 live UAT or local npm run dev smoke" |
| 2 | Cross-client ≤60s freshness (two browser sessions) | Phase 21 | Phase 21 (PROD-01/PROD-02 live UATs) — 19-VALIDATION.md: "Candidate sees a RH-side change within ≤60s cross-client (separate browser/tab) ... Phase 21 live UAT" |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/router/lazyNamed.ts` | named-export → default adapter for React.lazy | ✓ VERIFIED | Exists; exports `lazyNamed<T, K extends keyof T>`; contains `loader().then(m => ({ default: m[name] }))` |
| `src/components/ui/PageSkeleton.tsx` | Suspense fallback glass skeleton | ✓ VERIFIED | Exists; named export `PageSkeleton`; imports Glass + Skeleton; uses `bg-white/5` glass token; self-contained (no hooks/data) |
| `scripts/assert-chunks.mjs` | PERF-03 build-output chunk assertion harness | ✓ VERIFIED | Exists; 4 assertions implemented; exits 0 against current build; Node ESM only (no new deps) |
| `src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts` | PERF-04 Gap A invalidation regression test | ✓ VERIFIED | Exists; asserts targeted `decisaoKeys.consolidacao(candidaturaId, vagaId)`; GREEN (2/2) |
| `src/features/triagem/hooks/__tests__/useRedacaoRevisao.test.ts` | PERF-04 Gap B invalidation regression test | ✓ VERIFIED | Exists; asserts per-row `decisaoKeys.consolidacao(vars.candidaturaId, vagaId)`; GREEN (1/1) |
| `vite.config.ts` | narrow react-vendor manualChunks | ✓ VERIFIED | `manualChunks(id)` added at L123-130; returns 'react-vendor' for react/react-dom/react-router/scheduler only |
| `src/router/routes.tsx` | lazyNamed for all /rh/* and /admin/* routes | ✓ VERIFIED | 20 `lazyNamed(() => import(...), 'Name')` const declarations; all RoleGuard element blocks unchanged |
| `src/App.tsx` | Suspense boundary wrapping Outlet | ✓ VERIFIED | L226: `<Suspense fallback={<PageSkeleton />}>` wrapping `<Outlet/>`; `Suspense` added to React import L19 |
| `src/features/triagem/components/ComparativoScreen.tsx` | dynamic import jsPDF at click | ✓ VERIFIED | Top-level value import replaced by `import type`; `await import('../pdf/exportComparativo')` in async handleExport |
| `src/features/entrevista/hooks/useEntrevistaScorecard.ts` | vagaId option + targeted consolidacao invalidation | ✓ VERIFIED | `UseEntrevistaScorecardOptions` type with `vagaId?`; `decisaoKeys.consolidacao` invalidation in onSuccess with WR-02 prefix fallback |
| `src/features/triagem/hooks/useRedacaoRevisao.ts` | candidaturaId threaded + targeted invalidation | ✓ VERIFIED | Mutation vars `{ redacaoId, candidaturaId, payload }`; onSuccess calls `decisaoKeys.consolidacao(vars.candidaturaId, vagaId)` |
| `src/features/vagas/hooks/useCandidaturas.ts` | per-query refetchOnWindowFocus:true | ✓ VERIFIED | L121: `refetchOnWindowFocus: true` alongside L112: `staleTime: 1 * 60 * 1000` |
| `src/features/entrevista/components/EntrevistaWorkspace.tsx` | threads vagaId to useEntrevistaScorecard | ✓ VERIFIED | L87: `useEntrevistaScorecard(candidaturaId, { vagaId })` |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx` | threads vagaId to useEntrevistaScorecard | ✓ VERIFIED | L90: `useEntrevistaScorecard(candidaturaId, { vagaId })` (auto-fixed deviation) |
| `src/features/triagem/components/RedacaoReviewPanel.tsx` | passes selected.candidatura_id | ✓ VERIFIED | L191: `{ redacaoId: selected.id, candidaturaId: selected.candidatura_id, payload }` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/router/routes.tsx` | `src/router/lazyNamed.ts` | `lazyNamed(() => import(...), 'Name')` | ✓ WIRED | 20 occurrences confirmed by grep |
| `src/router/routes.tsx` | `RoleGuard` | `element: <RoleGuard ...><LazyPage/></RoleGuard>` | ✓ WIRED | 31 opening + 31 closing RoleGuard tags; guard is outside the lazy element |
| `src/App.tsx` | `src/components/ui/PageSkeleton.tsx` | `<Suspense fallback={<PageSkeleton />}>` around `<Outlet/>` | ✓ WIRED | L26 import + L226 usage confirmed |
| `src/features/triagem/components/ComparativoScreen.tsx` | `../pdf/exportComparativo` | `await import()` in async handleExport | ✓ WIRED | L122 confirmed; type-only at top level |
| `src/features/entrevista/hooks/useEntrevistaScorecard.ts` | `decisaoKeys.consolidacao` | `onSuccess invalidateQueries` with candidaturaId + vagaId | ✓ WIRED | L197-200 confirmed; WR-02 prefix fallback when vagaId undefined |
| `src/features/triagem/hooks/useRedacaoRevisao.ts` | `decisaoKeys.consolidacao` | `onSuccess(_d, vars) invalidateQueries` with vars.candidaturaId | ✓ WIRED | L74-77 confirmed |
| `src/features/entrevista/components/EntrevistaWorkspace.tsx` | `useEntrevistaScorecard` | `useEntrevistaScorecard(candidaturaId, { vagaId })` | ✓ WIRED | L87 confirmed |
| `src/features/triagem/components/RedacaoReviewPanel.tsx` | `useRedacaoRevisao.salvarRevisao` | mutate variables carry `selected.candidatura_id` | ✓ WIRED | L191 confirmed |
| `src/features/vagas/hooks/useCandidaturas.ts` | TanStack Query | `refetchOnWindowFocus: true` paired with `staleTime ≤60s` | ✓ WIRED | L112 + L121 confirmed; global default untouched |

### Data-Flow Trace (Level 4)

Not applicable to this phase. Phase 19 is an infrastructure phase (build config + cache wiring). No new data-rendering components were created; the PageSkeleton is a static Suspense fallback with no data source. The invalidation hooks produce cache invalidation signals, not rendered data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| assert-chunks PERF-03 gate | `node scripts/assert-chunks.mjs` | exit 0; all 4 assertions PASS; 883.35 kB eager index (< 2722.92 kB baseline); react-vendor-CSwU0OnC.js; 41 chunks; no jsPDF in index | ✓ PASS |
| lazyNamed adapter test | `npm run test:run -- src/router/__tests__/lazyNamed.test.tsx` | 2/2 tests GREEN | ✓ PASS |
| PERF-04 Gap A regression test | `npm run test:run -- src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts` | 2/2 tests GREEN | ✓ PASS |
| PERF-04 Gap B regression test | `npm run test:run -- src/features/triagem/hooks/__tests__/useRedacaoRevisao.test.ts` | 1/1 test GREEN | ✓ PASS |
| Full vitest suite | `npm run test:run` | 662/662 GREEN (79 files) | ✓ PASS |
| TypeScript lint | `npm run lint` | 257 errors (FOUND-08 M4-deferred baseline; strictly below the 258 cap; 1 error was cleared by IN-01 cleanup) | ✓ PASS |

### Probe Execution

No probe scripts defined for this phase (`scripts/tests/probe-*.sh` not applicable to a build/cache phase).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PERF-03 | 19-02-PLAN.md | Bundle servido em chunks — candidato mobile-first não paga 661 KiB monolíticos no first paint | ✓ SATISFIED | Eager index 883.35 kB (67% reduction from 2788 kB); react-vendor + 41 per-page chunks; assert-chunks exit 0; jsPDF isolated in 411 kB on-demand chunk |
| PERF-04 | 19-03-PLAN.md | Mudança escrita aparece no perfil/dashboard em ≤60s | ✓ SATISFIED (same-client path verified) | Targeted consolidacao invalidation in both hooks (regression tests GREEN); useCandidaturas refetchOnWindowFocus:true + staleTime 1min. Cross-client path deferred to Phase 21 |

Both requirements declared for Phase 19 in REQUIREMENTS.md are accounted for. No orphaned requirements.

### Anti-Patterns Found

No debt markers (TBD/FIXME/XXX) found in any files modified by this phase.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No anti-patterns found |

Stub-detection passes: PageSkeleton is intentionally static markup (Suspense fallback, no data source — correct). lazyNamed is a pure adapter. Both regression tests contain `vi.spyOn` with real assertions — not stubs.

The `decisaoKeys.all` references in useEntrevistaScorecard.ts comments (L183, L195) are documentation of the forbidden alternative, not active usage. The active invalidation at L199 uses the prefix key `[...decisaoKeys.all, 'consolidacao', candidaturaId]` as a targeted fallback (not a broad invalidation), which is the correct WR-02 robustness pattern.

### Human Verification Required

All automated code-level and build-level must-haves are verified. The following two items require a running application with a real browser — they are legitimately deferred to Phase 21 per the 19-VALIDATION.md contract.

#### 1. Lazy Route Suspense No-Regression (Visual)

**Test:** Log in as an RH user. Navigate to any /rh/* route (e.g. /rh/candidatos, /rh/entrevista/:id). On first visit (cold cache), observe the transition.
**Expected:** The PageSkeleton glass spinner appears briefly while the lazy chunk downloads. The destination page then renders correctly with its heading visible. No blank/white screen; no console JS errors. On subsequent visits the page renders instantly (React caches the resolved chunk Promise).
**Why human:** Visual/runtime behavior of Suspense fallback rendering and chunk-load timing requires a running browser and human observation. Cannot be verified by grep or chunk size analysis.

#### 2. Cross-Client ≤60s Freshness (Two Sessions)

**Test:** Open the candidate dashboard in one browser tab (authenticated as candidato). In a separate session (as RH/admin), update the candidatura status. Wait up to 60 seconds, then bring the candidate tab into focus.
**Expected:** The candidate dashboard shows the updated status within ≤60s of the RH write, without a manual page refresh.
**Why human:** Cross-client timing with two concurrent browser sessions requires live app interaction. The unit tests verify the same-client invalidation path (the TanStack Query spy confirms invalidateQueries is called on mutation success) but cannot simulate a cross-client refetchOnWindowFocus trigger.

### Gaps Summary

No gaps. All PLAN must-haves are VERIFIED by codebase evidence and automated checks.

Two items are deferred to Phase 21 (live visual UAT + cross-client ≤60s timing) — these are correctly classified as human_needed, not gaps, because the code-level implementation is complete and verified.

---

_Verified: 2026-06-29T19:20:00Z_
_Verifier: Claude (gsd-verifier)_


## Phase 21 closure (2026-06-30)
The human_verification items were the deferred live UATs; Phase 21 executed/closed them in PROD (see `.planning/phases/21-production-readiness-uats-live/21-HUMAN-UAT.md`). Status flipped human_needed → passed.
