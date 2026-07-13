-- =============================================================================
-- Phase 28 / Plan 28-04 / SEG-02 — usuarios_rh RLS hardening (roster is admin-only)
-- =============================================================================
-- Trust boundary: authenticated candidato/recrutador -> usuarios_rh roster.
--
-- LIVE state today (28-LIVE-STATE.md Wave-0 capture, 2026-07-13, via Supabase MCP
-- read-only pg_policies) carries TWO permissive qual=true SELECT policies on
-- usuarios_rh (usuarios_rh_authenticated_read, usuarios_rh_simple_read) that let
-- ANY authenticated user — including a candidato or recrutador — read the ENTIRE
-- RH roster (a standing PII leak). It also carries an own-row UPDATE policy with
-- NO WITH CHECK ("RH pode atualizar seu próprio perfil"): a live self-promotion
-- hole (a recrutador can UPDATE ... SET role='administrador' / ativo=true on their
-- own row). A grep of src/ finds ZERO client writes to usuarios_rh (authStore only
-- SELECTs its own row), so dropping that UPDATE policy is a zero-regression early
-- close of SEG-03.
--
-- This migration is leak REMOVAL, not guard addition:
--   (1) ADD a recursion-safe admin predicate is_active_rh_admin() — LANGUAGE
--       plpgsql (NEVER sql: a plain-sql helper is inlined during planning, loses
--       the DEFINER context and re-introduces the RLS recursion trap) SECURITY
--       DEFINER so it reads usuarios_rh as owner (bypasses RLS -> no recursion).
--   (2) DROP the two qual=true roster leaks + the WITH-CHECK-less self-promotion
--       UPDATE policy.
--   (3) ADD one admin-only SELECT policy (full roster for an active admin).
--
-- PRESERVED UNTOUCHED (do NOT re-create — a duplicate own-row policy would be a
--   redundant permissive OR, M4/SEC-08 discipline):
--   * "RH pode ler seu próprio perfil"  — SELECT {public} USING (auth.uid() = user_id).
--       This IS the own-row SELECT that keeps recrutador login working
--       (src/store/authStore.ts:164-170 fetchProfile: .select('*').eq('user_id',
--       userId)) and is required for A37 self-service (Phase 30). The 28-04 plan
--       proposed ADDING a usuarios_rh_own_select policy; the Wave-0 capture found
--       the own-row SELECT ALREADY EXISTS live under this name, so we PRESERVE it
--       rather than create a duplicate (deviation — see 28-04-SUMMARY.md).
--       Clean-rebuild caveat: this preserved policy is live-drift (no migration
--       file declares it yet); its migration-file reconciliation is deferred to a
--       future DBMIG pass, exactly as SEC-09's version-row reconcile was deferred.
--   * "auth_admin_le_usuarios_rh"        — SEC-09 auth-hook dependency (Phase 24 /
--       20260706110006). Never touched here.
--   * The JWT role-resolution auth hook   — NOT referenced/altered (its live body
--       already filters ativo AND deleted_at IS NULL, so USR-04 needs no change).
--
-- No INSERT/UPDATE/DELETE policy is created for authenticated/anon -> ALL client
-- writes to usuarios_rh are denied; the service_role EF + SECURITY DEFINER RPCs
-- are the only writers (they bypass RLS). FORCE RLS is NOT enabled (it would
-- subject the DEFINER writes/reads, owner postgres/BYPASSRLS, to RLS).
--
-- Applied via Supabase MCP apply_migration in 28-07 (bypasses 42601); the
-- 0-row-roster / admin-roster / own-row / SEC-09-intact behavioral proofs run
-- against PROD in 28-08. NO outer BEGIN/COMMIT wrapper (the driver wraps each
-- migration in its own tx — an outer BEGIN/COMMIT triggers 42601). RNF-07a:
-- nothing here writes candidaturas or auto-rejects.
-- =============================================================================

-- (1) Recursion-safe admin predicate. LANGUAGE plpgsql (NOT sql) + SECURITY
--     DEFINER so it reads usuarios_rh as its owner, bypassing RLS -> the SELECT
--     inside does NOT re-trigger the usuarios_rh policies (no infinite recursion).
CREATE OR REPLACE FUNCTION public.is_active_rh_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_rh
    WHERE user_id = auth.uid()
      AND role = 'administrador'
      AND ativo
      AND deleted_at IS NULL
  ) INTO ok;
  RETURN COALESCE(ok, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_rh_admin() FROM public;
GRANT  EXECUTE ON FUNCTION public.is_active_rh_admin() TO authenticated;

COMMENT ON FUNCTION public.is_active_rh_admin() IS
  'SEG-02 (Phase 28 / 28-04): recursion-safe admin predicate for usuarios_rh RLS. '
  'LANGUAGE plpgsql (never plain-sql — an inlined sql helper loses the DEFINER '
  'context and re-introduces the RLS recursion trap) SECURITY DEFINER so it reads '
  'usuarios_rh as owner (bypasses RLS). Returns true iff auth.uid() is an active, '
  'non-deleted administrador. Used by policy usuarios_rh_admin_select.';

-- (2) DROP the live leaks + the self-promotion UPDATE hole (28-LIVE-STATE A1).
--     Idempotent (IF EXISTS) so a re-apply / clean rebuild is safe. Quoted names
--     because the live policy contains spaces/accents.
DROP POLICY IF EXISTS usuarios_rh_authenticated_read ON public.usuarios_rh;   -- qual=true roster leak
DROP POLICY IF EXISTS usuarios_rh_simple_read        ON public.usuarios_rh;   -- qual=true roster leak
DROP POLICY IF EXISTS "RH pode atualizar seu próprio perfil" ON public.usuarios_rh; -- UPDATE own-row, NO WITH CHECK -> self-promotion (SEG-03 early close)

-- (3) ADD the admin-only roster SELECT (recursion-safe via the DEFINER helper).
--     Idempotent DROP+CREATE per the SEC-09 analog (20260706110006).
DROP POLICY IF EXISTS usuarios_rh_admin_select ON public.usuarios_rh;
CREATE POLICY usuarios_rh_admin_select ON public.usuarios_rh
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.is_active_rh_admin());

COMMENT ON POLICY usuarios_rh_admin_select ON public.usuarios_rh IS
  'SEG-02 (Phase 28 / 28-04): an active administrador reads the full RH roster via '
  'the recursion-safe DEFINER predicate is_active_rh_admin(). A non-admin '
  'authenticated user (recrutador/candidato) matches only the preserved own-row '
  'policy "RH pode ler seu próprio perfil" -> sees only their own row. Replaces the '
  'dropped qual=true leaks usuarios_rh_authenticated_read / usuarios_rh_simple_read.';
