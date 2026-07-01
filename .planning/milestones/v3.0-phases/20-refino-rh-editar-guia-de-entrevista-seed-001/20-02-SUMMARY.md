# Plan 20-02 Summary — [BLOCKING] Apply migration to PROD + authz smokes + db:types

**Plan:** 20-02
**Requirements:** ENTREV-08 (live write-path)
**Status:** Complete
**Completed:** 2026-06-29
**Mode:** Human-gated PROD migration apply (autonomous: false) — user authorized; orchestrator applied via Supabase MCP

## Objective

Apply the `entrevista_guias` edit write-path migration to PROD (dedup → updated_at →
UNIQUE(candidatura_id,tipo) → `save_entrevista_guia_edits` SECURITY DEFINER RPC), prove
the ENTREV-08 authenticate-THEN-authorize logic with SQL smokes, and regenerate
`database.types.ts`.

## What shipped (live in PROD)

### Task 1 — Apply migration (Supabase MCP `apply_migration`)
Pre-check: 3 guide rows, 1 duplicate group (1 row to delete), column/constraint/RPC absent.
Applied via MCP `apply_migration` (name `entrevista_guia_edits`) → `success:true`. Post-apply:
- dedup DELETE removed 1 orphaned duplicate (3 → **2 rows**)
- `updated_at` column present; `entrevista_guias_candidatura_tipo_key` UNIQUE present
- `save_entrevista_guia_edits(uuid,text,jsonb)` present (SECURITY DEFINER, search_path='', REVOKE PUBLIC + GRANT authenticated)
- DB version row: `20260629190949`

### Task 2 — Authz SQL smokes (MCP `execute_sql`, transactional + auto-rollback)
Self-contained DO-block smoke (real seed: recrutador `fba9bc0f`, admin `bbbb…`, candidatura
`d5491f18` on admin-owned vaga; temp-grant for the with-ownership case), all rolled back via a
final RAISE. **6/6 PASS:**
1. candidato (no usuarios_rh row) → 42501 ✓
2. RH without ownership → 42501 ✓
3. RH **with** ownership → ok:true ✓
4. administrador bypass → ok:true ✓
5. upsert idempotency → exactly 1 row ✓
6. **claim-liar (JWT says 'rh', no usuarios_rh row) → 42501** ✓ — proves the role decision comes from `usuarios_rh`, NOT the JWT claim (THE ENTREV-08 deviation; RESEARCH Pitfall 1)

Post-smoke verify: vaga owner unchanged (rollback clean), still 2 guide rows.

### Task 3 — Regenerate `database.types.ts`
`npm run db:types` (gen types --linked) → `save_entrevista_guia_edits` + `entrevista_guias.updated_at`
now in the generated types (consumed by 20-03 service/hook).

## Migration version reconciliation

MCP `apply_migration` registered the migration under apply-time version `20260629190949` (not the
authored filename `20260629000001`). Renamed the local file → `20260629190949_entrevista_guia_edits.sql`
so it matches the DB version row (this migration is reconciled; `db push` no longer flags it).

**Pre-existing drift (NOT this phase):** `db push --dry-run` lists 21 M2 remote versions (MCP-applied,
timestamp-vs-filename) absent from local — documented M2 tech-debt, deferred (see MEMORY). Out of
Phase 20 scope; candidate for an M4 `supabase migration repair` cleanup.

## Verification

- Migration applied + schema verified live (column/UNIQUE/RPC present; dedup 3→2).
- 6/6 authz smokes PASS (incl. the claim-liar table-vs-claim proof).
- `database.types.ts` regenerated with the new RPC + column.
- No `candidaturas` write anywhere (RNF-07a).

## Deviations

None functional. Reconciled the MCP version-drift by renaming the local migration file to the
applied version (cleaner than leaving file/DB mismatched).

## Key files

- `supabase/migrations/20260629190949_entrevista_guia_edits.sql` (renamed from 20260629000001)
- `database.types.ts` (regenerated)
- PROD: `entrevista_guias` (dedup + updated_at + UNIQUE) + `save_entrevista_guia_edits` RPC live
