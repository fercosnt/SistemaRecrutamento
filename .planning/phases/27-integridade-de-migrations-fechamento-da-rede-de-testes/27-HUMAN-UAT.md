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

## Orchestrator-confirmed (verifier's items 2–4, closed live via MCP 2026-07-12)

- **Ledger convergence re-confirmed:** `schema_migrations` = 73 rows, 0 malformed versions (item 2). ✓
- **DBMIG-02 CR-01 live-data integrity:** `SELECT count(*) … auto_rejeitado=false AND etapa_de='inscricao' AND etapa_para='inscricao' AND criterio_texto LIKE 'knockout%'` = **0** — no genuine knockout audit row was corrupted by the (now-fixed) backfill (item 3). ✓
- **CI-07 EF runtime resolution:** edge-function logs show all 5 redeployed EFs responding with their expected gate/guard statuses (5×401 jwt-on, 405/405/401 self-auth) and **zero boot/ERR_MODULE/5xx errors**; `supabase functions deploy` (esbuild) resolves the bare-`zod` import map at build time and inlines it, so a successful deploy guarantees runtime resolution (item 4). ✓ (A fully-authed deep-invoke of the 3 non-canary EFs is belt-and-suspenders only.)

## Gaps

- **DBMIG-01 rebuild-from-zero proof (item 1)** remains environment-gated (no SUPABASE_ACCESS_TOKEN /
  no Docker rebuild loop in the autonomous session). The ledger IS converged (73/73 exact, 0 orphans/
  0 missing) and DBMIG-02/CI-03 are live+smoked; only the baseline body + clean-room replay proof
  remain — routed by Fernando 2026-07-12 as a deferred confirmatory item.
