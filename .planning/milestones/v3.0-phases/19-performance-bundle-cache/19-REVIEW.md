---
phase: 19-performance-bundle-cache
reviewed: 2026-06-29T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/router/lazyNamed.ts
  - src/router/routes.tsx
  - src/App.tsx
  - src/components/ui/PageSkeleton.tsx
  - vite.config.ts
  - scripts/assert-chunks.mjs
  - src/features/triagem/components/ComparativoScreen.tsx
  - src/features/entrevista/hooks/useEntrevistaScorecard.ts
  - src/features/entrevista/components/EntrevistaWorkspace.tsx
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/features/triagem/hooks/useRedacaoRevisao.ts
  - src/features/triagem/components/RedacaoReviewPanel.tsx
  - src/features/vagas/hooks/useCandidaturas.ts
  - e2e/navegacao.spec.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-06-29
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 19 implements PERF-03 (route-level code-splitting of `/rh/*` + `/admin/*` via a `lazyNamed` named-export → `React.lazy` adapter behind a single `RootLayout` `<Suspense>`, a narrow `react-vendor` manualChunks split, and call-site dynamic `jsPDF` import) and PERF-04 (targeted `decisaoKeys.consolidacao` invalidation on scorecard/redação saves + per-query `refetchOnWindowFocus` on `useCandidaturas`).

The four stated invariants all HOLD:

1. **Access control — PASS.** `RoleGuard` remains OUTSIDE every lazy boundary. In `routes.tsx` each lazy component is the *child* of an eager `<RoleGuard>` (e.g. lines 292-298, 328-335, 435-468). The guard renders synchronously and only mounts the lazy `<Outlet>` child after the role check passes; the `<Suspense>` in `RootLayout` wraps `<Outlet>` ABOVE the guard, so the resolution order is Suspense → RoleGuard (eager) → lazy chunk fetch. A candidate hitting a lazy `/rh` or `/admin` route is bounced by `RoleGuard` before any chunk is even requested. No regression.
2. **Narrow manualChunks — PASS.** `vite.config.ts` matches only `react`, `react-dom`, `react-router(-dom)`, `scheduler` → `react-vendor`; everything else returns `undefined` (auto-chunk). No broad `node_modules → vendor` branch. The `react-router` substring correctly captures both `react-router` and `react-router-dom` (both present in `node_modules`, both intended). Circular-init risk avoided.
3. **Targeted invalidation + RNF-07a — PASS.** Both new invalidations use `decisaoKeys.consolidacao(candidaturaId, vagaId)`, never `decisaoKeys.all`. Both are cache-only `invalidateQueries` calls — no `candidaturas` write is introduced (RNF-07a preserved).
4. **Named-export convention — PASS.** No `export default` was added; `lazyNamed` exists precisely to bridge named exports to `React.lazy`.

The findings below are robustness, dead-code, and consistency defects — no blockers and no access-control or security regression. `tsc` baseline 258 (FOUND-08, M4-deferred) is unchanged.

## Warnings

### WR-01: `useEntrevistaScorecard` adds a required positional `vagaId` between existing params — silent over-broad blast surface if a future caller omits it

**File:** `src/features/entrevista/hooks/useEntrevistaScorecard.ts:136-140`
**Issue:** `vagaId: string | undefined` was inserted as the SECOND positional parameter, shifting `options` to third. Both current callers (`EntrevistaWorkspace.tsx:87`, `HubCandidatoRH.tsx:90`) were updated correctly, so nothing is broken today. However, the signature is now a footgun: a future caller that copies the old `useEntrevistaScorecard(candidaturaId)` two-arg shape and passes `options` as the second arg will silently bind an options object to `vagaId` (truthy) and pass nothing as options. The PERF-04 invalidation guard `if (candidaturaId && vagaId)` would then fire with a garbage `vagaId`, invalidating a never-existent consolidacao key (harmless) while the real `options` are dropped (a real bug). TypeScript does not catch this because `options` is `Omit<UseQueryOptions, ...>` which is structurally compatible-enough to slip past in some call shapes.
**Fix:** Prefer making the new freshness/invalidation dependency explicit and non-positional, e.g. accept an object: `useEntrevistaScorecard({ candidaturaId, vagaId, options })`, OR at minimum add a runtime/type guard and a doc-comment warning that `vagaId` is required-by-position. If keeping positional, leave a `// NOTE: vagaId is positional #2 — do not pass options here` comment at the signature.

### WR-02: PERF-04 consolidacao invalidation silently no-ops when `vagaId` is undefined at save time

**File:** `src/features/entrevista/hooks/useEntrevistaScorecard.ts:164-168`
**Issue:** The Decisão Final freshness contract ("dashboard refetches in ≤60s") depends on `if (candidaturaId && vagaId)`. In `EntrevistaWorkspace`, `vagaId` is derived from `contexto?.vaga_id` (`EntrevistaWorkspace.tsx:68`), which is `undefined` until `useEntrevistaContexto` resolves. The scorecard save mutation is reachable as soon as the Avaliação tab renders; if a save completes while `contexto` is still loading or errored, `vagaId` is `undefined`, the guard short-circuits, and the consolidacao cache is NOT invalidated — silently breaking the stated ≤60s freshness guarantee with no error surfaced. The redação analog (`useRedacaoRevisao.ts:74`) reads `vars.candidaturaId` from the mutation payload, so it is more robust, but the scorecard path relies on the contexto query being settled.
**Fix:** Either gate the save UI on `contexto` being loaded (disable the scorecard Salvar until `vagaId` is present), or thread `vagaId` through the mutation payload (like the redação hook does with `candidaturaId`) so the invalidation does not depend on a sibling query's load state. At minimum, log/telemetry when the guard skips so the missed invalidation is observable.

### WR-03: `ComparativoScreen` `ranking` prop is required by the interface but never consumed — dead required prop forces dead arg at every call site

**File:** `src/features/triagem/components/ComparativoScreen.tsx:50,100-109`
**Issue:** `ComparativoScreenProps.ranking: ComparativeRankingView` (line 50) is declared REQUIRED, but the component body destructures only `candidates, onAvancar, onRejeitar, isLoading, isError, errorCode, onRetry, retrying` (lines 100-109) — `ranking` is not used anywhere in the render. (This predates Phase 19 but the file is in scope and the type-only import change at line 37 keeps `ComparativeRankingView` alive solely to type a dead prop.) Every caller (`DecisaoFinalPage`, `ComparativoCandidatosPage`, the test) is forced to compute and pass a `ranking` value that the component discards, which is misleading and a maintenance trap.
**Fix:** Remove `ranking` from `ComparativoScreenProps` and from all call sites, OR actually render it. If removed, `ComparativeRankingView` can also be dropped from the type-only import unless still needed elsewhere in the file.

## Info

### IN-01: Leftover `console.log` debug artifacts in `useUpdateCandidaturaStatus`

**File:** `src/features/vagas/hooks/useCandidaturas.ts:347,360`
**Issue:** `console.log('🔄 Invalidando queries de candidaturas...')` and `console.log('✅ Queries refetchadas:', refetchResult.length)` ship to production. Pre-existing (not introduced by Phase 19), but this file is in scope and the project has an RH-console grep guard (`src/__tests__/guards/rh-console.grep.test.ts`) signalling console statements are unwanted.
**Fix:** Remove both `console.log` lines or replace with a gated logger (`import.meta.env.DEV`).

### IN-02: `useUpdateCandidaturaStatus` invalidates `candidaturasKeys.all` + refetches all active — over-broad, contrasts with the PERF-04 targeting goal

**File:** `src/features/vagas/hooks/useCandidaturas.ts:350-358`
**Issue:** This mutation does `invalidateQueries({ queryKey: candidaturasKeys.all })` AND an explicit `refetchQueries({ queryKey: candidaturasKeys.all, type: 'active' })` AND `vagasKeys.all`. Phase 19's PERF-04 explicitly narrows invalidation elsewhere; this broad sweep is the opposite pattern and re-reads every active candidaturas query (including the now-`refetchOnWindowFocus:true` candidate list). Pre-existing and out of PERF-04's stated scope, but worth flagging for consistency.
**Fix:** Scope to the affected candidatura/vaga keys (`candidaturasKeys.listByVaga(...)`, the specific list) rather than `.all`, mirroring the targeted PERF-04 approach.

### IN-03: `assert-chunks.mjs` jsPDF leak check is a substring scan that can false-negative on minified/renamed identifiers

**File:** `scripts/assert-chunks.mjs:44,113-123`
**Issue:** Assertion 3 greps the eager index source for the literal markers `['jspdf','jsPDF','addImage','autoTable']`. esbuild/Rollup minification can rename or inline these identifiers, and the lib banner may not survive tree-shaking, so a real leak could slip past (false negative). Conversely a comment or unrelated string containing "addImage" could false-positive. It is a heuristic gate, which is acceptable, but it should not be read as a hard guarantee.
**Fix:** Strengthen by also asserting a dedicated jsPDF dynamic chunk EXISTS (a chunk filename/content containing jsPDF markers), so the test proves jsPDF moved to a separate chunk rather than only proving its absence from index. Document the heuristic limitation in the file header.

### IN-04: `eagerIndex` picks `indexChunks[0]` by size-desc order, not by being the entry chunk — could assert against the wrong `index-*.js`

**File:** `scripts/assert-chunks.mjs:94-95`
**Issue:** `indexChunks = sized.filter(/^index[-.]/)` then `eagerIndex = indexChunks[0]`. `sized` is sorted by bytes descending, so `eagerIndex` is the LARGEST `index-*.js`. Rollup can emit multiple `index-*.js` files (e.g. `index.es-*.js` for recharts — already noted in the PRESPLIT floor comment, line 38). The `^index[-.]` regex would also match `index.es-*.js`. If a non-entry `index.es` chunk ever grows larger than the real entry chunk, the size/jsPDF assertions would run against the wrong file. Today the entry is the largest so it works, but the selection is by size coincidence, not by identity.
**Fix:** Identify the entry chunk by reading the build manifest (`build/.vite/manifest.json` with `isEntry: true`) or by excluding the `index.es` pattern explicitly, rather than relying on largest-by-bytes.

---

_Reviewed: 2026-06-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
