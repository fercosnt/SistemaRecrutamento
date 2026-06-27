---
phase: 06-pipeline-backbone-schema
plan: 02
status: complete
requirements: [FUNIL-01, FUNIL-03]
completed: 2026-06-07
applied_via: Supabase MCP (execute_sql)
---

# 06-02 SUMMARY — historico_candidatura + etapa_processo v2 cutover

## What was built
- `historico_candidatura` append-only audit table (FK auth.users, etapa_de/etapa_para enum,
  criterio_texto, ator NULL-able, auto_rejeitado), RLS enabled (policies in 06-05).
- In-place live enum cutover: `backup_m2.candidaturas_pre_funil` snapshot → v2 enum (8 values,
  pipeline order) → ALTER COLUMN USING CASE → re-default → DROP legacy → RENAME to canonical
  `etapa_processo` → `etapa_justificativa` companion column.

## Deviation
- `(0a)` added (by Fernando): `ALTER backup.etapa_atual TYPE text` so step (5) `DROP TYPE` doesn't
  fail on the backup's column dependency. Discovery found 3 orphans (raven×2, cultura×1) — collapsed
  to triagem with audit lines (D-05), so the defensive path was actually exercised.

## Key files
- created: `supabase/migrations/20260607000001_historico_candidatura.sql`
- created: `supabase/migrations/20260607000002_etapa_processo_v2_cutover.sql`
- regenerated: `database.types.ts` (repo root — NOT src/types/, plan path was wrong)

## Verification (FUNIL-01 §B)
- post_total = 6 == discovery total 6 → zero data loss. 3 orphan audit rows written. Enum in
  regenerated types shows 8 v2 values; candidaturas.etapa_justificativa present.

## Self-Check: PASSED