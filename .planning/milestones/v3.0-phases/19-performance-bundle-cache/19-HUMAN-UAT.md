---
status: closed_via_phase21
phase: 19-performance-bundle-cache
source: [19-VERIFICATION.md]
started: 2026-06-29
updated: 2026-06-29
deferred_to: Phase 21 (live UAT)
---

## Current Test

[awaiting live verification — by design, deferred to Phase 21]

All 6 code/build-level must-haves (PERF-03 + PERF-04) are VERIFIED green against the tree
+ build output: `npm run build` clean, `node scripts/assert-chunks.mjs` PASS (eager index
2,788 → 883 kB, react-vendor split, 41 chunks, jsPDF behind dynamic boundary), tsc 257,
vitest 662/662. The 2 items below need a running app / two concurrent browser sessions,
which is Phase 21's scope (per 19-VALIDATION.md Manual-Only Verifications).

## Tests

### UAT-19-01 — Lazy-route visual no-regression (PERF-03)
- **Requirement:** PERF-03
- **Why manual:** needs a running browser; visual.
- **Steps:** In the running app, navigate to several `/rh/*` and `/admin/*` routes (and back).
  Confirm: each route resolves at runtime; the `PageSkeleton` Suspense fallback shows briefly
  on first visit (cached chunks show no flash on revisit); no blank screen; no console
  "Cannot access X before initialization" error; candidate flows (landing, dashboard, avaliação)
  load eagerly with the smaller initial chunk.
- **Status:** deferred → Phase 21

### UAT-19-02 — Cross-client ≤60s freshness (PERF-04)
- **Requirement:** PERF-04
- **Why manual:** needs two concurrent sessions (candidate tab + RH tab).
- **Steps:** Open the candidate dashboard in one session; in another, have RH change the
  candidate's status / save an interview scorecard / save a redação review. Confirm the
  candidate's profile/dashboard reflects the change within ≤60s (on window focus —
  `refetchOnWindowFocus` + staleTime 1min). Confirm the RH consolidação dashboard updates
  immediately after saving scorecard/redação (targeted `decisaoKeys.consolidacao` invalidation).
- **Status:** deferred → Phase 21

## Notes

- Same-client invalidation + chunk-emission + lazy-adapter correctness are automated & green.
- When Phase 21 runs these green, re-run `/gsd-verify-work 19` to flip 19-VERIFICATION.md to `passed`.


## Phase 21 closure (2026-06-30)
Deferred live UATs executed/closed in Phase 21 (live PROD). See `.planning/phases/21-production-readiness-uats-live/21-HUMAN-UAT.md` + `21-RUNBOOK.md`. Backend/deterministic halves PASS live; visual residue → 21-RUNBOOK; literal SR/overload re-deferred with justification.
