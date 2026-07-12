---
status: partial
phase: 27-integridade-de-migrations-fechamento-da-rede-de-testes
source: [27-05-PLAN.md, 27-05-SUMMARY.md]
started: 2026-07-12
updated: 2026-07-12
---

## Current Test

DBMIG-01 baseline-fill + clean-room from-zero rebuild proof — deferred as environment-gated
(routed by Fernando 2026-07-12). Needs a Supabase CLI-authenticated / Docker session.

## Tests

### 1. DBMIG-01 — fill 20260419000000_baseline.sql with the real base schema
expected: The Figma-Make base schema (candidatos, vagas, usuarios_rh, candidaturas,
respostas_formulario, perguntas_formulario, base enums, storage buckets) — everything the 72
non-baseline migrations assume pre-exists and never CREATE — captured into the baseline so a
from-empty replay does not fail with "relation/type does not exist".
how: iterate the from-empty rebuild loop (local `supabase db reset` with seed DISABLED, or a
Pro preview branch RESET to empty + `supabase db push`): replay baseline+72 files onto a clean
Postgres, add each missing base object to the baseline until the replay is clean.
result: [pending]

### 2. DBMIG-01 — catalog-fingerprint diff (rebuild vs live PROD) == empty
expected: after the baseline is filled, the six catalog-fingerprint queries (tables/columns,
enums, functions, triggers, policies, indexes) diff EMPTY between the rebuilt clean DB and live
PROD — proving the 73 migrations reconstruct the DB from zero AND there are no only-in-PROD
objects beyond the ledger bijection already verified.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

- DBMIG-01 rebuild-from-zero proof is environment-gated (no SUPABASE_ACCESS_TOKEN in the
  autonomous session; the rebuild loop needs Docker + an iterative pass). The ledger IS
  converged (73/73 exact, 0 orphans/0 missing — verified 2026-07-12) and DBMIG-02/CI-03 are
  live+smoked; only the baseline body + clean-room replay proof remain.
