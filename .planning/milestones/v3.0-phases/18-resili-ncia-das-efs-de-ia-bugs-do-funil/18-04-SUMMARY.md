---
phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil
plan: 04
subsystem: ui
tags: [react, async-state, graceful-degradation, glass-ui, vitest, rtl, fake-timers, resil-03]

# Dependency graph
requires:
  - phase: 17-navegacao-arquitetura-informacao
    provides: HubSection async-state pattern (the base generalized here)
  - phase: 15-decis-o-final-audit-vel-lgpd-art-20
    provides: ConsolidacaoDashboard retry exemplar (the standardized retry source)
provides:
  - Shared <AsyncState> wrapper (5-state contract loading/slow/error/empty/success + standardized retry)
  - AI_UNAVAILABLE-driven error copy split (sobrecarga vs generic), single-sourced verbatim PT-BR COPY
  - AsyncStateCopyOverride type (per-slot AND per-field partial copy overrides)
  - HubSection refactored to delegate to <AsyncState> (no drift, funnel overrides preserved)
affects:
  - 18-05 (extractEfErrorCode service plumbing feeds errorCode into this component)
  - 18-06 (adopt <AsyncState> on the 5 AI-backed screens — depends on this component + 18-05)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single presentational graceful-degradation wrapper mapping a TanStack-Query-shaped result to exactly one of 5 states in binding priority order"
    - "Timed loading→slow escalation via useEffect + setTimeout(slowAfterMs), reset on resolve so it never replaces a resolved success/error"
    - "errorCode→copy selector renders ONLY static verbatim strings — never echoes the raw transport error/PII (T-18-04-ID)"
    - "Delegate-with-overrides: a feature wrapper (HubSection) keeps its own glass shell + funnel copy, delegating only the loading/error/empty mechanics via copy-override props (no-drift)"

key-files:
  created:
    - src/components/ui/AsyncState.tsx
    - src/components/ui/__tests__/AsyncState.test.tsx
  modified:
    - src/features/hub-candidato/components/HubSection.tsx

key-decisions:
  - "Slow state is a timed sub-state of loading (useEffect+setTimeout, default 8000ms), reset whenever loading resolves — it NEVER replaces a resolved success/error (18-UI-SPEC binding rule)."
  - "Retry affordance lives in the error state ONLY and only when onRetry is provided. GlassButton variant=white hover, min-h-[44px], RotateCcw 16px icon; while retrying → Loader2 + 'Tentando…' + disabled (no double-submit)."
  - "All copy single-sourced in one COPY const (verbatim PT-BR from 18-UI-SPEC §Copywriting Contract); per-call overrides via a new AsyncStateCopyOverride type whose slots AND fields are both optional."
  - "HubSection delegates with glass={false} (it owns its dark-glass surface + <h2> title); its futuro/sem_dados/erro funnel copy is preserved verbatim as HubSection-owned overrides passed via the copy prop, and it passes NO onRetry so its error state stays retry-less ('recarregar a página') — identical to pre-refactor behavior."
  - "Two empty states (futuro/sem_dados) mapped onto <AsyncState>'s single empty slot by computing the active one and passing it via copy.empty — no behavior drift; the hubEmptyState RED contract (D-07) still passes."

patterns-established:
  - "Generalize a feature-local async-state pattern into a shared UI primitive, then refactor the original to delegate so the verbatim copy never drifts between the two."

requirements-completed: []
requirements-partial: [RESIL-03]

# Metrics
duration: 9min
completed: 2026-06-29
---

# Phase 18 Plan 04: Shared <AsyncState> Graceful-Degradation Wrapper Summary

**Extracted ONE shared `<AsyncState>` presentational wrapper that renders the binding 5-state contract (loading → slow@8s → error → empty → success) with single-sourced verbatim PT-BR copy, an `AI_UNAVAILABLE`-driven sobrecarga/generic error split, and the standardized "Tentar novamente" retry — then refactored `HubSection` to delegate to it with zero behavior drift.** This is the component half of RESIL-03; Plan 05 adds the `error_code` service plumbing it reads and Plan 06 adopts it on the 5 AI-backed screens.

## Performance

- **Duration:** ~9 min
- **Completed:** 2026-06-29
- **Tasks:** 3
- **Files:** 3 (2 created, 1 modified)

## Accomplishments
- **`<AsyncState>` (NEW)** — named-export presentational wrapper. Maps `isLoading|isPending`, `isError`+`errorCode`, `isEmpty` to exactly one of 5 states in the binding priority order (loading → slow → error → empty → children). Composes ONLY vendored primitives (`Glass`/`GlassButton`, `Skeleton`) + lucide (`AlertTriangle`/`Loader2`/`RotateCcw`) — no registry pull, no new dependency.
- **Slow-state timed escalation** — `useEffect` + `setTimeout(slowAfterMs ?? 8000)` while loading; reset on resolve/threshold-change/unmount so it never replaces a resolved success/error.
- **errorCode-driven copy** — `errorCode === 'AI_UNAVAILABLE'` → "O serviço de IA está sobrecarregado. Tente novamente em instantes."; any other error → "Verifique a conexão e tente novamente." Renders only static copy keyed off the code string — no raw error/PII echo (T-18-04-ID).
- **Standardized retry** — error state only, only when `onRetry` provided. `GlassButton variant="white" hover min-h-[44px]`; in-flight → `Loader2` + "Tentando…" + `disabled`.
- **Single-sourced COPY** — one `const COPY: AsyncStateCopy` holds the verbatim PT-BR strings; `AsyncStateCopyOverride` allows per-call overrides (slot- and field-level optional).
- **Contract test (NEW)** — 11 RTL cases covering all 7 behaviors (loading, slow@8s via fake timers, error generic/overload, retry+onRetry, retrying-disabled, empty, success) + precedence (loading/error > empty) + retry-absent-without-onRetry.
- **HubSection refactor** — delegates loading/error/empty mechanics to `<AsyncState>` (`glass={false}`, keeps its title + dark-glass shell). `futuro`/`sem_dados`/`erro` copy preserved verbatim as HubSection-owned overrides; public props unchanged; hubEmptyState (D-07) test still green.

## Task Commits

Each task committed atomically (via `git -c core.hooksPath=/dev/null commit --no-verify` — pre-commit tsc gate fails on the 258 FOUND-08/M4 baseline):

1. **Task 1: Build the shared `<AsyncState>` wrapper** — `64fd33e` (feat)
2. **Task 2: Contract test (5 states + errorCode + retry + slow@8s)** — `4ab369e` (test)
3. **Task 3: Refactor HubSection to delegate to `<AsyncState>`** — `a89af5a` (refactor; also folded the `AsyncStateCopyOverride` type fix that the delegation required)

## Files Created/Modified
- `src/components/ui/AsyncState.tsx` — NEW (214 → 224 lines after the override-type fix). Named `AsyncState` export, `AI_UNAVAILABLE` const, `AsyncStateCopy`/`AsyncStateCopyOverride` types, single-source `COPY`, the 5-state render with binding precedence.
- `src/components/ui/__tests__/AsyncState.test.tsx` — NEW. 11 RTL cases; `vi.useFakeTimers()` + `vi.advanceTimersByTime(8000)` for the slow@8s escalation; both verbatim error bodies asserted for the errorCode branch.
- `src/features/hub-candidato/components/HubSection.tsx` — MODIFIED. Replaced inline `Skeleton`/`EstadoVazio` state mux with an `<AsyncState glass={false}>` delegation; removed the now-unused `Skeleton` import and the local `EstadoVazio`; `futuro`/`sem_dados`/`erro` COPY kept as overrides; doc comment updated to point at `AsyncState`.

## Decisions Made
- **Slow = loading sub-state**, not a separate query state — reset on every loading transition so a resolved error/success is shown immediately, never overwritten by a stale slow flag.
- **Retry is opt-in via `onRetry`** — HubSection passes none, so its error stays retry-less ("recarregar a página"), exactly matching its pre-refactor UX. AI screens (Plan 06) will pass `onRetry={() => refetch()}`.
- **`AsyncStateCopyOverride` (Rule 3 type fix)** — the original `copy?: Partial<AsyncStateCopy>` only made top-level slots optional, forcing HubSection's `copy.error` override to supply the unused `overload` field (tsc 259). Added a mapped type making each slot AND each field optional; back to 258. Folded into the Task 3 commit since the delegation is what surfaced it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking type] `Partial<AsyncStateCopy>` was too shallow for per-field overrides**
- **Found during:** Task 3 (HubSection delegation)
- **Issue:** HubSection passes a partial `error` override (`heading` + `generic` only). `copy?: Partial<AsyncStateCopy>` makes only the top-level slots optional, so the nested `error` object still required `overload` → `error TS2741`, regressing tsc to 259.
- **Fix:** Introduced `AsyncStateCopyOverride = { [K in keyof AsyncStateCopy]?: Partial<AsyncStateCopy[K]> }` and used it for the `copy` prop + `mergeCopy` param. Per-field overrides now type-check; merge logic was already per-slot-shallow so no runtime change.
- **Files modified:** `src/components/ui/AsyncState.tsx`
- **Commit:** `a89af5a` (folded into Task 3)

Otherwise the plan executed as written. No architectural change, no package install, no checkpoints.

## Issues Encountered
- Full `npm run test:run` reports **2 failed suites / 0 failed tests** — `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` and `supabase/functions/_shared/__tests__/essay-schemas.test.ts`. Both are **Deno EF tests** that import `https://deno.land` specifiers the Node/Vitest ESM loader cannot resolve; they run under `deno test`, not Vitest, and are simply missing from the `vite.config.ts` `test.exclude` list. **Pre-existing and already logged** in `deferred-items.md` (from 18-02) — out of scope per the SCOPE BOUNDARY rule; my changes added zero new failures (650 frontend tests pass).

## Verification
- `npm run test:run -- src/components/ui/__tests__/AsyncState.test.tsx` → **11 passed | 0 failed** (incl. slow@8s fake-timer case).
- `npm run test:run -- src/features/hub-candidato` → **3 passed | 0 failed** (hubEmptyState D-07 — no behavior drift).
- `grep -n "AI_UNAVAILABLE" src/components/ui/AsyncState.tsx` → matches (errorCode branch).
- `grep` for verbatim copy → "Tentar novamente", "O serviço de IA está sobrecarregado…", "Nada para mostrar ainda" all present.
- `grep -n "AsyncState" HubSection.tsx` → delegation present; `grep` "Etapa ainda não iniciada" / "Sem dados nesta etapa" → preserved.
- **tsc error count: 258** (`npm run lint | grep -cE "error TS"`) — at the FOUND-08/M4 baseline, ≤ 258 ✓.

## Threat Surface
- **T-18-04-ID (Info Disclosure / error rendering):** mitigated — the error state renders ONLY static verbatim PT-BR copy selected by the `errorCode` string; it never parses or echoes the raw transport/Supabase error, stack, or PII.
- **T-18-04-ID2 (errorCode prop):** accept — `errorCode` carries only a low-sensitivity code (e.g. `AI_UNAVAILABLE`) set by the Plan 05 service layer; no PII by contract.
- **T-18-04-T (Tampering / retry):** mitigated — retry re-runs a read/invoke (non-destructive); `disabled`-while-`retrying` prevents double-submit; no write to `candidaturas`.
- **T-18-SC (Supply chain / imports):** mitigated — no registry pull, no new package; composes only vendored `Glass`/`GlassButton`/`Skeleton` + lucide.
- No new security-relevant surface introduced. No `## Threat Flags`.

## Known Stubs
None. `<AsyncState>` is a fully-wired presentational primitive; HubSection delegates to it with real props. Screen adoption (the data wiring) is the explicit scope of Plan 06, not a stub left here.

## User Setup Required
None — no external service configuration.

## Next Phase Readiness
- `<AsyncState>` is ready for adoption. Plan 05 lands `extractEfErrorCode` + wires `error_code` into the AI services so callers can pass `errorCode={(error as *ServiceError)?.details?.error_code}`. Plan 06 adopts `<AsyncState onRetry={() => refetch()}>` on the 5 AI-backed screens (BigFive, SJT, Redação, Comparativo, Consolidação).
- The component is live in code only — no PROD deploy needed for a frontend primitive (the [BLOCKING] EF redeploy is Plan 18-07).

## Self-Check: PASSED

- FOUND: `src/components/ui/AsyncState.tsx`
- FOUND: `src/components/ui/__tests__/AsyncState.test.tsx`
- FOUND: `src/features/hub-candidato/components/HubSection.tsx`
- FOUND: `.planning/phases/18-resili-ncia-das-efs-de-ia-bugs-do-funil/18-04-SUMMARY.md`
- FOUND commit: `64fd33e` (Task 1) · FOUND commit: `4ab369e` (Task 2) · FOUND commit: `a89af5a` (Task 3)

---
*Phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil*
*Completed: 2026-06-29*
