---
id: hard-02-bundle-code-splitting
created: 2026-06-26
source: Phase 16 / Plan 16-01 (documented-deferral; 16-CONTEXT §Deferred + UI-SPEC §5)
priority: medium
resolves_phase: null
tags: [hard-02, performance, bundle, code-splitting, lighthouse, deferred, m1-tech-debt]
---

# HARD-02 — Bundle code-splitting (661 KiB monolith)

**Deferred** during Phase 16 (Compliance & A11y Hardening). The phase's success
criterion explicitly permits documented deferral of the large, higher-risk tech-debt
items so the LGPD-05 axe-core ≥90 work can ship without a multi-day bundle/perf effort
(16-CONTEXT.md §Scope & Triage, §Deferred; 16-UI-SPEC.md §5).

## What is deferred
- Splitting the **661 KiB monolithic production bundle** into route-level / vendor
  chunks (lazy `React.lazy` + `import()` per route, manual `rollupOptions.output.manualChunks`,
  or vendor-splitting the heavy libs) so the candidate/RH funnel does not pay the whole
  bundle on first paint.
- Chasing the **Lighthouse Performance score** up from its current **warn-baseline of
  0.62–0.68**. The existing `lighthouse` CI job stays AT its current baseline — Phase 16
  does NOT tighten or chase that score; it is left untouched so a perf regression is still
  caught, but no new perf budget is enforced this phase.

## Why deferred
- Large surface, higher-risk: route-level code-splitting touches the router, every lazy
  boundary needs a Suspense fallback, and a mis-split can break SSR-less hydration timing
  or the glass-shell first-paint. Out of proportion to a hardening phase whose contract is
  WCAG AA, not perf.
- LGPD-05 (the Phase-16 requirement) is an accessibility/compliance gate, not a perf gate —
  HARD-02 is orthogonal to it.

## What's left (this todo)
1. Profile the 661 KiB bundle (`vite build` + `rollup-plugin-visualizer`) to find the
   heavy chunks (likely the avaliação/Big-Five questionnaire surfaces + chart/PDF libs).
2. Introduce route-level `React.lazy` + `Suspense` boundaries (candidate funnel and the
   RH workspace are the natural split points) and/or `manualChunks` vendor splitting.
3. Re-measure Lighthouse Performance; if it clears a chosen budget, RAISE the `lighthouse`
   CI baseline (red-on-regression spirit) — do not leave it loose.

## Success criterion it satisfies
ROADMAP Phase-16 criterion: *"M1-inherited tech-debt is triaged — the cheap, high-value
items fixed in-phase, the heavy items documented and deferred."* HARD-02 is the heavy item;
this doc is its required documentation of the deferral.
