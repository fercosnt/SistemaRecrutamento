---
status: passed
phase: 05-perfil-hardening-mvp
source: [05-VERIFICATION.md]
started: 2026-06-06T17:15:00.000Z
updated: 2026-06-06T23:20:00.000Z
---

## Current Test

[complete — live CI run 27076233734 fully green: unit + e2e + lighthouse]

## Tests

### 1. SC2 — Full E2E suite passes 100% in CI (HARD-01)
expected: A green CI check on `.github/workflows/ci.yml` — the unit + Playwright E2E jobs (login, cadastro, candidatura, recovery flows) all pass. All Tier-1 specs exist and compile locally; what remains is an actual green run in CI (05-01 PLAN requires "an actual green check, not a local runbook").
result: PASS — live CI run 27076233734 (commit 3cdad46, branch backup/local-state-2026-04): `e2e` job GREEN (all Tier-1 Playwright flows) + `unit` job GREEN (lint baseline-aware + vitest 358/358). GAP-05-CI-1..5 closed by gap-closure plan 05-07; the LoadingProgress carryover fixed in 3cdad46.

### 2. SC3 — Lighthouse mobile Performance >80 (HARD-02)
expected: LHCI job runs in CI. Accessibility is enforced at `error`/minScore 0.8 and measured 0.96–1.00 (PASS). Performance is a user-approved WARN baseline (measured 0.62–0.68; root cause is the project-wide 661 KiB monolithic bundle, de-scoped from MVP via the D-06 measure-first decision). A live LHCI run is needed only to confirm the 05-06 changes introduced no regression — Performance is NOT expected to exceed 80 and is not a blocking criterion.
result: PASS — live CI run 27076233734 `lighthouse` job GREEN: Accessibility error-gate (>= 0.8) passes; Performance warn-baseline (0.62–0.68) holds, no regression, accepted per D-06.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

(none — both runtime CI confirmations satisfied by live CI run 27076233734 on 2026-06-06)
