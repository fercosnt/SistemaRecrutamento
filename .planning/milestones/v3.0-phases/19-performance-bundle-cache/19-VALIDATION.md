---
phase: 19
slug: performance-bundle-cache
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit) + `npm run build` (chunk-output assertion) + Playwright (route no-regression, optional) |
| **Config file** | vite.config.ts |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && npm run build` |
| **Estimated runtime** | ~30s vitest + ~build time |

---

## Sampling Rate

- **After every task commit:** `npm run test:run` (scoped where possible)
- **After the code-split task:** `npm run build` — assert route/vendor chunks emit separately + candidate initial chunk shrank vs the 2,788 kB baseline
- **After every plan wave:** full suite
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (filled by planner / nyquist-auditor) | — | — | PERF-03 | RoleGuard outside lazy element (no access-control regression) | build-output assert | `npm run build` | — | ⬜ pending |
| TBD | — | — | PERF-04 | targeted invalidation only (no over-broad) | unit (vitest mock) | `npm run test:run` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lazyNamed` helper (named-export → `{default}` adapter) — new util + unit test.
- [ ] Build-output chunk assertion: candidate initial chunk < 2,788 kB baseline AND `/rh/*` `/admin/*` route chunks emitted separately (assert on rollup output filenames/sizes).
- [ ] Invalidation regression tests for the 2 gaps (entrevista scorecard save + redação review → `decisaoKeys.consolidacao` invalidated).

*Existing vitest infra covers the invalidation/unit layer; build assertion is the one new harness piece.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Lazy RH/admin routes resolve at runtime with no nav regression, no fallback flash on cached chunks | PERF-03 | Visual/runtime; needs running app | Phase 21 live UAT or local `npm run dev` smoke |
| Candidate sees a RH-side change within ≤60s cross-client (separate browser/tab) | PERF-04 | Cross-client timing; needs 2 sessions | Phase 21 live UAT |

*Automated layer covers chunk-emission, lazy-adapter correctness, and same-client invalidation. Cross-client ≤60s freshness + visual no-regression are live checks (Phase 21).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
