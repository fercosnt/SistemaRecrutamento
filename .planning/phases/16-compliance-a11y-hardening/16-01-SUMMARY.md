---
phase: 16
plan: 01
subsystem: a11y-ci-gate
tags: [a11y, axe-core, playwright, wcag, lgpd-05, fx-14, grep-guard, tech-debt, wave-0, red-gate]
requires:
  - "@axe-core/playwright (already in lockfile)"
  - "e2e/perfil.spec.ts makeJwt + page.route idiom"
  - "src/components/RoleGuard.tsx + extractRole.ts role gate"
provides:
  - "Tier-A unconditional mocked-session axe loop over 15 in-scope main M2 screens (LGPD-05 gate)"
  - "e2e/fixtures/a11y-session.ts reusable makeJwt + mockSession + driveLogin fixture"
  - "FX-14 RH-path console.* grep guard (RED until cleanup)"
  - "3 backlog deferral docs (HARD-02, PERF-01, FOUND-08 tsc tail)"
affects:
  - "e2e/a11y.spec.ts (extended — public loop preserved)"
  - "CI e2e job picks up the new Tier-A assertions unconditionally"
tech-stack:
  added: []
  patterns:
    - "Tier-A mocked-session axe scan of RoleGuard-protected routes (RESEARCH Pattern 1)"
    - "serious|critical severity-filtered axe assertion (vs strict toEqual([]) public loop)"
    - "comment-aware node:fs grep guard mirroring pitfall7.grep.test.ts"
    - "calibrated RED Wave-0 gate (smoke-runtime precedent, Phase 4.1)"
key-files:
  created:
    - "e2e/fixtures/a11y-session.ts"
    - "src/__tests__/guards/rh-console.grep.test.ts"
    - ".planning/todos/pending/hard-02-bundle-code-splitting.md"
    - ".planning/todos/pending/perf-01-cache-invalidation.md"
    - ".planning/todos/pending/found-08-tsc-burndown-tail.md"
  modified:
    - "e2e/a11y.spec.ts"
decisions:
  - "R6 EntrevistaWorkspace + R7 DecisaoFinalPage placed in unconditional Tier-A (RESEARCH Open-Q1); only R5 redacao + C5 BigFive default to Tier-B E2E_REAL_LOGIN skip-with-reason"
  - "Catch-all empty-array rest/v1 mock (mockEmptyRestReads) over per-table enumeration — brittle-to-maintain per-screen mocks avoided; score-driven screens are Tier-B not mocked"
  - "FX-14 guard forbids console.(log|debug|info|warn) but NOT console.error (genuine error reporting kept)"
metrics:
  duration: "~19 min (fully autonomous)"
  completed: "2026-06-26"
  tasks: 3
  files: 6
  commits: 3
---

# Phase 16 Plan 01: Wave-0 RED Gates (a11y axe loop + FX-14 grep guard + backlog docs) Summary

Stood up the Phase-16 Wave-0 CALIBRATED RED gates before any FX fix lands: the unconditional Tier-A mocked-session axe loop over 15 in-scope main M2 screens (the LGPD-05 "axe-core ≥90, zero serious/critical" contract), a reusable `a11y-session` fixture, the FX-14 RH-path `console.*` grep guard, and the three documented-deferral backlog docs. The failing axe assertions and the failing grep guard ARE the contracts that downstream waves flip GREEN (smoke-runtime precedent from Phase 4.1). No application source changed; tsc baseline held at 291.

## What was built

| Task | Deliverable | Commit | Outcome |
|------|-------------|--------|---------|
| 1 | `e2e/fixtures/a11y-session.ts` (makeJwt + mockSession + driveLogin) + extended `e2e/a11y.spec.ts` Tier-A axe loop (15 screens) + Tier-B skip-with-reason (R5/C5) | `bc662c5` | Parses to 22 tests (5 public + 15 Tier-A + 2 Tier-B); public loop preserved strict; R8 confirmed RED with `critical` violations |
| 2 | `src/__tests__/guards/rh-console.grep.test.ts` (comment-aware node:fs grep, sanity-count ≥2) | `ebf2435` | RED on current tree — flags the 6 confirmed console.log sites (5 PerfilCandidatoRHPage + 1 SuporteRHPage); 3 sub-tests GREEN |
| 3 | 3 backlog docs under `.planning/todos/pending/` (HARD-02, PERF-01, FOUND-08 tsc tail) | `8f38bef` | All grep tokens present (661/Lighthouse; 60s/perfil; TS2307/tempo_integral/core.hooksPath) |

## Verification results

- `npx playwright test e2e/a11y.spec.ts --project=chromium --list` → 22 tests, parses without syntax error. Tier-A list includes R6 (Entrevista) + R7 (DecisaoFinal) per the resolved Open-Q1; R5 + C5 are the only Tier-B entries.
- Public Phase-5 loop preserved untouched: `expect(results.violations).toEqual([])` strict assertion + both `.exclude()` constants (`DEFERRED_SELECT_PLACEHOLDER`, `OTP_TRANSPARENT_INPUT`) intact.
- Calibrated RED confirmed: `R8 BiasAuditPage` ran RED (EXIT=1) with `received +95` axe `"impact": "critical"` entries — the Wave-0 gate fires exactly as designed (NOT a Task-1 defect).
- `npm run test:run -- rh-console.grep` → 1 failed (the FX-14 contract) / 3 passed (regex-correctness, comment-aware, sanity-count). Guard uses `node:fs`; `child_process` appears only in explanatory prose, never imported.
- All 3 backlog docs exist with the required grep tokens.
- tsc baseline `npm run -s lint | grep -c "error TS"` = **291** (≤291, zero growth — the e2e fixture is under `e2e/` outside the tsconfig `include: ["src"]`; the grep guard under `src/__tests__/` adds no type errors).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] JSDoc block comment `*/` literal broke SWC parse of the grep guard**
- **Found during:** Task 2 (first `npm run test:run -- rh-console.grep` reported "Failed Suites / no tests" — a transform-time Syntax Error, not the intended RED assertion).
- **Issue:** Two JSDoc lines described the comment-aware logic with a backtick span containing the literal block-comment closer `*/` (`` `*`/`/*`/`*/` ``). The `vite:react-swc` transform saw the embedded `*/` as the end of the block comment and failed to parse the file, so the suite never collected.
- **Fix:** Rewrote both doc lines to describe the comment markers in prose ("an asterisk JSDoc-body marker, or a block-comment opener / closer") instead of embedding the literal `*/`. The actual code (`t.startsWith('*/')` inside a string literal) was correct and unchanged.
- **Files modified:** `src/__tests__/guards/rh-console.grep.test.ts` (doc-comment only).
- **Commit:** `ebf2435` (fixed before the task commit; zero behavior change to the guard logic).

### Concurrent-edit isolation (not a deviation — noted for traceability)

During Task 3, `git status` showed `.planning/STATE.md`, `.planning/phases/16-compliance-a11y-hardening/16-CONTEXT.md` (modified) and `16-UI-SPEC.md` (untracked) dirty. These were NOT authored by this executor (I only Read them). They are the orchestrator's concurrent planning-doc updates in a multi-active scenario. Per the guardrails, I staged ONLY my three backlog docs individually and left those files untouched — no blanket `git add`.

## Authentication gates

None. This plan adds only test/fixture/doc files; no live service, no auth round-trip executed (the Tier-A login is a fully mocked `page.route` interception; Tier-B real-login is env-gated skip-with-reason).

## Known Stubs

None. The two grep guards and the axe loop are calibrated to be RED by design (the Wave-0 contract) — that is the intended assertion state, not a stub. The Tier-B block is a sanctioned `test.skip`-with-reason (env-gated), not a disabled assertion.

## Pre-existing untouched files (per guardrails)

Left exactly alone, as instructed: `.planning/phases/11-*/11-HUMAN-UAT.md`, `.planning/ui-reviews/`, `src/components/pages/LoginRHPage.tsx` (the LoginRHPage race fix commits in a later plan 16-04, not here).
