---
status: partial
phase: 05-perfil-hardening-mvp
source: [05-VERIFICATION.md]
started: 2026-06-06T17:15:00.000Z
updated: 2026-06-06T17:15:00.000Z
---

## Current Test

[awaiting CI run]

## Tests

### 1. SC2 — Full E2E suite passes 100% in CI (HARD-01)
expected: A green CI check on `.github/workflows/ci.yml` — the unit + Playwright E2E jobs (login, cadastro, candidatura, recovery flows) all pass. All Tier-1 specs exist and compile locally; what remains is an actual green run in CI (05-01 PLAN requires "an actual green check, not a local runbook").
result: [pending — requires pushing the branch to trigger GitHub Actions]

### 2. SC3 — Lighthouse mobile Performance >80 (HARD-02)
expected: LHCI job runs in CI. Accessibility is enforced at `error`/minScore 0.8 and measured 0.96–1.00 (PASS). Performance is a user-approved WARN baseline (measured 0.62–0.68; root cause is the project-wide 661 KiB monolithic bundle, de-scoped from MVP via the D-06 measure-first decision). A live LHCI run is needed only to confirm the 05-06 changes introduced no regression — Performance is NOT expected to exceed 80 and is not a blocking criterion.
result: [pending — requires CI/LHCI run; Performance accepted as warn-baseline]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

(none code-level — both items are runtime CI confirmations, not missing implementation)
