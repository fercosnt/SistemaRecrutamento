---
id: perf-01-cache-invalidation
created: 2026-06-26
source: Phase 16 / Plan 16-01 (documented-deferral; 16-CONTEXT §Deferred + UI-SPEC §5)
priority: medium
resolves_phase: null
tags: [perf-01, cache, tanstack-query, freshness, deferred, m1-tech-debt]
---

# PERF-01 — Cache-invalidation ≤60s window (candidate perfil)

**Deferred** during Phase 16 (Compliance & A11y Hardening). It is a backend /
data-freshness concern, NOT a UI-SPEC accessibility item, so it falls outside the
LGPD-05 axe-core acceptance contract and is logged as backlog
(16-CONTEXT.md §Deferred; 16-UI-SPEC.md §5).

## What is deferred
- Tightening the **≤60s apply→display window** on the candidate **perfil** surface:
  the gap between a candidate (or an RH action) writing data and that change becoming
  visible on the candidate **perfil** / dashboard read path. Today the staleness can
  exceed the desired 60s freshness window because of TanStack Query `staleTime`
  (5 min project default) + the absence of a targeted invalidation on the relevant
  mutations.

## Why deferred
- This is a server / data-freshness tuning task (query-key invalidation strategy,
  `staleTime`/`refetchOnWindowFocus` policy, possibly a realtime/`invalidateQueries`
  trigger), not an a11y/compliance fix. It does not move the WCAG AA bar that Phase 16
  is scoped to.
- Right-sizing the 60s window needs a deliberate freshness-vs-request-volume decision
  (over-invalidating thrashes the API; under-invalidating misses the window) — a focused
  perf task, not a hardening one-liner.

## What's left (this todo)
1. Identify the mutations whose results must reflect on the candidate **perfil** within
   60s (profile edits, candidatura status transitions).
2. Add targeted `queryClient.invalidateQueries({ queryKey: ... })` on those mutations
   (hierarchical keys already exist per CLAUDE.md convention) and/or lower `staleTime`
   for the perfil read keys only.
3. Verify the apply→display window is ≤60s (manual or an e2e timing probe).

## Success criterion it satisfies
ROADMAP Phase-16 criterion: *"M1-inherited tech-debt is triaged … the heavy items
documented and deferred."* PERF-01 is documented here as a deferred backend item.
