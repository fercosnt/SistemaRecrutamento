# Legacy SQL Migrations

Legacy migration scripts archived during Phase 1 baseline consolidation (D-02).

The source of truth is now `supabase/migrations/20260419000000_baseline.sql`.

## Files in this directory

- `20250116_create_logs_acesso_table.sql` — Originally `supabase/migrations/20250116_create_logs_acesso_table.sql`. Creates `public.logs_acesso` table for authentication/security event auditing, along with indexes, RLS policies, grants, and the `security_analysis_view`. The schema these objects reflect is captured in the new baseline.
- `20250123_add_avaliacao_final_etapa.sql` — Originally `supabase/migrations/20250123_add_avaliacao_final_etapa.sql`. Adds `avaliacao_final` value to the `etapa_processo` enum. Already reflected in the baseline enum definition.

## Why these were moved

Before Phase 1, the migrations directory was not a faithful source of truth for the production schema — dozens of DDL changes were applied directly (Figma Make era) without a corresponding migration file. Two stray scripts here were insufficient to rebuild the schema from scratch.

Phase 1 Plan 04 consolidates the schema into a hybrid baseline + forward model:

1. `20260419000000_baseline.sql` — captures the current production schema (schema-only, no user data)
2. `20260420000001_rls_anon_to_rpc.sql` — revokes anon SELECT on `candidatos` (FOUND-10)
3. `20260420000002_unified_auth_role.sql` — Custom Access Token Hook for JWT role injection (FOUND-03)
4. `20260420000003_check_candidato_duplicate_rpc.sql` — RPC SECURITY DEFINER for duplicate checks

These legacy files are kept here for historical reference only. Do not re-apply them — the baseline supersedes them.

## Recovery

If something in the baseline does not match prod, the legacy scripts can be consulted to understand the original DDL intent (e.g., exact RLS policy wording for `logs_acesso`).

---
*Archived: 2026-04-20*
*Phase: 01-foundation-saneada, Plan 04*
