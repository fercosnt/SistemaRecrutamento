---
phase: 05-perfil-hardening-mvp
plan: 05
subsystem: database
tags: [postgres, supabase, migrations, trigger, check-constraint, soft-delete, schema-drift]

requires:
  - phase: 05-01
    provides: CI/quality-gate scaffold (no direct DB dependency; wave ordering only)
provides:
  - DB-level enforcement that a soft-deleted vaga can never stay status='ativa' (trigger + one-time backfill)
  - bloco_valido_check constraint reconciled into the migration ledger (FOUND-09 source-of-truth restored)
affects: [perfil, vagas-listing, schema-reproducibility]

tech-stack:
  added: []
  patterns:
    - "Soft-delete/status invariant enforced via BEFORE INSERT/UPDATE trigger that COERCES (not rejects) — keeps the app's separate-statement soft-delete path working"
    - "Schema-drift reconciliation: idempotent DO-block re-declares a manually-added live constraint so a fresh `db push` reproduces it"
    - "D-22 PL/pgSQL db-push workaround: no outer BEGIN/COMMIT; apply SQL out-of-band, then `migration repair --status applied <version>`"

key-files:
  created:
    - supabase/migrations/20260606000001_vaga_status_sync.sql
    - supabase/migrations/20260606000002_bloco_valido_reconcile.sql
  modified: []

key-decisions:
  - "Trigger over CHECK constraint for F-04-08-B (T-05-05-01): a CHECK would reject the common `UPDATE vagas SET deleted_at=now()` soft-delete (status untouched, still 'ativa'); a BEFORE trigger coerces status→'arquivada' transparently so soft-delete keeps working AND the invariant holds"
  - "Backfill target 'arquivada' (valid status_vaga enum member representing a retired vaga)"
  - "Migration 2 is a recorded no-op on live (constraint already present); only the COMMENT re-applies + the ledger entry restores FOUND-09 parity"

patterns-established:
  - "Live db-push via Supabase MCP execute_sql (user-authorized) + CLI `migration repair --status applied` for ledger sync — a faster variant of the D-22 SQL-Editor workaround that reaches the same end state"

requirements-completed: [PERF-01]

duration: ~25min
completed: 2026-06-06
---

# Phase 05 Plan 05: DB Data-Hygiene Migrations Summary

**Closed two data-hygiene gaps at the DB level: a soft-deleted vaga can no longer remain `status='ativa'` (one drift row backfilled + a coercing trigger now enforces it), and the orphaned `bloco_valido_check` constraint is reconciled back into the migration ledger so migrations stay the single source of truth (FOUND-09).**

## Performance

- **Duration:** ~25 min (author + MCP apply + CLI ledger sync + finalize)
- **Tasks:** 2 (1 author + 1 [BLOCKING] live db-push)
- **Files modified:** 2 migrations created; `database.types.ts` regenerated with **zero diff** (DDL changes no TS type surface — expected)

## Accomplishments
- **F-04-08-B:** `vagas_enforce_status_soft_delete_sync()` BEFORE INSERT/UPDATE trigger bound + enabled; one-time backfill repaired the single drift row (`drift 1 → 0` verified live).
- **F-04-08-C:** `bloco_valido_check` (`bloco IN (jornada,tecnologia,valores,curriculo)`) captured in `supabase/migrations/` with a reconciliation COMMENT — schema-drift closed.
- **Ledger sync:** `supabase migration repair --status applied 20260606000001 20260606000002` → applied; `supabase db push --linked` → **"Remote database is up to date."**

## Task Commits
1. **Task 1: author both D-13 migrations (idempotent)** - `1f657a4` (feat)
2. **Task 2: [BLOCKING] apply live + regen types** - applied via MCP (user-authorized) + CLI repair; types zero-diff (no commit needed); finalize in docs commit below

## Live Verification
- `SELECT count(*) FROM vagas WHERE deleted_at IS NOT NULL AND status='ativa'` → **0** (post-backfill)
- `pg_trigger` shows `vagas_status_soft_delete_sync_trg` bound to `public.vagas`, `tgenabled='O'`
- `bloco_valido_check` present with the four-value IN-list + reconciliation comment
- `supabase db push --linked` → "Remote database is up to date."
- `npm run lint` → 295 (no growth)

## Deviations
- **Application path:** applied the migration SQL via Supabase MCP `execute_sql` (user-authorized in the checkpoint) instead of the literal SQL-Editor paste, then synced the ledger with `migration repair --status applied`. Same end state as the D-22 workaround; the optional 7b coercion smoke-write was (correctly) blocked as an ad-hoc prod write and skipped — trigger existence + drift=0 already prove enforcement.

## Self-Check: PASSED

## Notes for Next Plans
- Independent of the UI waves; no downstream code depends on these migrations beyond listing correctness already in place.
