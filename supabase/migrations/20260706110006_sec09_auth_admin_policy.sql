-- =============================================================================
-- Phase 24 / Plan 24-06 / SEC-09 — declare the auth_admin RLS policy in a file
-- =============================================================================
-- Trust boundary: DB rebuild → GoTrue auth pipeline. The custom_access_token_hook
-- (20260420000002_unified_auth_role.sql) is SECURITY INVOKER and runs as the
-- `supabase_auth_admin` role. It SELECTs public.usuarios_rh to resolve the RH role
-- into the signed JWT app_metadata.role. Without a SELECT RLS policy granting
-- `supabase_auth_admin` access to usuarios_rh, the hook reads 0 rows and EVERY RH
-- login is silently demoted to 'candidato' — a self-lockout (see memory
-- [[reference_auth_hook_rls_gap]]).
--
-- The policy `auth_admin_le_usuarios_rh` ALREADY EXISTS LIVE in PROD, but it was
-- created via execute_sql ONLY and never captured in a migration file (drift). A
-- future `supabase db reset` / rebuild would lose it. This migration ENDS the drift
-- by declaring the exact live policy as a faithful, idempotent MIRROR.
--
-- ⚠️ ZERO BEHAVIOR CHANGE — this is NOT a re-migration. The 24-01 live-state capture
--    (24-LIVE-STATE.md, assumption A2, confirmed via MCP pg_policies) records the live
--    predicate byte-for-behavior as:
--        policyname = auth_admin_le_usuarios_rh
--        cmd        = SELECT
--        roles      = {supabase_auth_admin}
--        qual       = true
--    i.e. `AS PERMISSIVE FOR SELECT TO supabase_auth_admin USING (true)`. The DROP+CREATE
--    below reproduces that predicate exactly. Do NOT alter the predicate — a differing
--    predicate would make this a behavior change, which is out of scope (per CONTEXT
--    SEC-09: "NÃO re-migrar a policy se já existe; só declará-la").
--
-- The supporting GRANT (also already present live, shipped in
-- 20260420000002_unified_auth_role.sql:100-102) is repeated here idempotently so this
-- file is self-contained for a clean rebuild.
--
-- NOTE (version-row reconcile — Phase 27 / DBMIG-01): because the live policy was
--   applied via execute_sql, the supabase_migrations ledger has no version row for it.
--   Reconciling the ledger (so `supabase db push` reports "up to date" without drift) is
--   deferred to Phase 27 / DBMIG-01 (the 49-migration rebuild + ledger convergence). This
--   file only declares the policy; it does not reconcile the version row here.
--
-- RNF-07a: nothing here writes candidaturas or auto-rejects.
-- Applied via Supabase MCP in 24-08 (bypasses 42601). NO outer BEGIN/COMMIT wrapper
-- (the driver wraps each migration in its own tx — an outer BEGIN/COMMIT triggers 42601).
-- =============================================================================

-- (1) Supporting grant — supabase_auth_admin must be able to SELECT usuarios_rh for the
--     hook. Already present live (20260420000002:101); harmless idempotent repeat so a
--     clean rebuild from this file alone is self-contained.
GRANT SELECT ON public.usuarios_rh TO supabase_auth_admin;

-- (2) The mirror of the live policy — byte-for-behavior identical to the 24-01 capture.
--     DROP IF EXISTS makes it idempotent (no error if the live policy is present).
DROP POLICY IF EXISTS auth_admin_le_usuarios_rh ON public.usuarios_rh;
CREATE POLICY auth_admin_le_usuarios_rh ON public.usuarios_rh
  AS PERMISSIVE
  FOR SELECT
  TO supabase_auth_admin
  USING (true);

COMMENT ON POLICY auth_admin_le_usuarios_rh ON public.usuarios_rh IS
  'SEC-09 (Phase 24 / 24-06): declared mirror of the execute_sql-only live policy that '
  'lets the custom_access_token_hook (supabase_auth_admin role) read usuarios_rh to '
  'resolve the RH role into the JWT. Zero behavior change — drift-fix only. Version-row '
  'reconcile deferred to Phase 27 / DBMIG-01. See [[reference_auth_hook_rls_gap]].';
