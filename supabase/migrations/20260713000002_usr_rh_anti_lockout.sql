-- =============================================================================
-- Migration: usr_rh_anti_lockout — BEFORE UPDATE OR DELETE anti-lockout guard on usuarios_rh
-- Date: 2026-07-13
-- Phase: 28 (gest-o-de-usu-rios-rh-n-cleo-seguro)
-- Requirement: USR-07 (server-enforced anti-lockout: >=1 active administrador always)
-- Plan: 28-05 (Task 1). Authored ONLY — applied to PROD in 28-07 (MCP apply_migration).
-- =============================================================================
--
-- PURPOSE
-- USR-07: the >=1 active administrador invariant must hold against EVERY writer —
-- clients (denied at RLS in 28-04), and critically the service_role EF (28-06) which
-- BYPASSes RLS. A BEFORE UPDATE OR DELETE trigger is the only bypass-proof teeth: it
-- fires inside the DEFINER mutate RPC (28-05 Task 2) too, so no path — client, RPC, or
-- raw service_role — can drop the active-admin count to zero.
--
-- Live floor at authoring (28-LIVE-STATE cnt): 4 active administradores
--   (role='administrador' AND ativo AND deleted_at IS NULL). The trigger refuses any
--   mutation that would take the count below 1.
--
-- WHAT COUNTS AS "removing an active admin" (the only transitions that threaten USR-07):
--   - DELETE of an active admin row
--   - UPDATE role administrador -> anything else
--   - UPDATE ativo true -> false
--   - UPDATE deleted_at NULL -> NOT NULL (soft delete)
-- Any change to a row that is NOT currently an active admin is harmless (early return a).
-- An UPDATE that leaves the row an active admin is harmless (early return b).
--
-- WRITE-SKEW (RESEARCH Pitfall 3): two concurrent "demote admin X" / "demote admin Y"
-- transactions can each read "others >= 1" under snapshot isolation and both commit,
-- landing on zero active admins. pg_advisory_xact_lock(hashtext('usuarios_rh_admin_guard'))
-- is taken BEFORE the count so the admin-count check is serialized — the second txn blocks
-- until the first commits/aborts, then re-reads the true remaining count. The advisory lock
-- is transaction-scoped (auto-released at commit/abort, pooler-safe) and a fixed stable
-- constant so every admin-removing mutation contends on the same lock.
--
-- COEXISTENCE (28-LIVE-STATE A5): usuarios_rh already carries `update_usuarios_rh_updated_at`
-- (BEFORE UPDATE, updated_at bump) and `trigger_criar_preferencias_padrao` (AFTER INSERT).
-- This is a SEPARATE `BEFORE UPDATE OR DELETE` trigger. BEFORE row-triggers fire in
-- alphabetical tgname order: `trg_usuarios_rh_anti_lockout` (t) < `update_usuarios_rh_updated_at`
-- (u) — anti-lockout validates first, updated_at bump second. Order is immaterial here (the
-- guard only reads the admin count); the coexistence is safe either way.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (CLAUDE.md §Commands / D-22). CREATE
-- FUNCTION + DO $$ + COMMENT (PL/pgSQL $$ bodies) → apply via Supabase MCP apply_migration
-- in the [BLOCKING] wave 28-07 — NOT applied here. Behavioral proof (P0001 on last-admin +
-- concurrency) is the 28-03 smoke, run GREEN in 28-08. Version-row reconcile → DBMIG pass.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tg_usuarios_rh_anti_lockout()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  others int;
BEGIN
  -- (a) Only removing an ACTIVE admin can threaten the >=1-admin invariant. If the row
  --     being changed is not currently an active administrador, there is nothing to guard.
  --     (DELETE => NEW is NULL, RETURN OLD lets the delete proceed.)
  IF NOT (OLD.role = 'administrador' AND OLD.ativo AND OLD.deleted_at IS NULL) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- (b) An UPDATE that leaves the row an active admin removes no admin-ness → harmless.
  IF TG_OP = 'UPDATE'
     AND NEW.role = 'administrador' AND NEW.ativo AND NEW.deleted_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- (c) This mutation removes an active admin (DELETE, demote, deactivate, or soft-delete).
  --     Serialize the admin-count check BEFORE counting to defeat write-skew (Pitfall 3).
  PERFORM pg_advisory_xact_lock(hashtext('usuarios_rh_admin_guard'));

  -- (d) Count the OTHER active admins (excluding this row). If none remain, refuse.
  SELECT count(*) INTO others
  FROM public.usuarios_rh
  WHERE role = 'administrador' AND ativo AND deleted_at IS NULL AND id <> OLD.id;

  IF others = 0 THEN
    RAISE EXCEPTION
      'anti_lockout: cannot remove/demote/deactivate the last active administrator'
      USING ERRCODE = 'P0001';  -- EF (28-06) maps SQLSTATE P0001 → error_code LAST_ADMIN
  END IF;

  -- (e) At least one other active admin survives → allow the mutation.
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Bind the trigger (idempotent: create only if absent) — coexists with the live
-- `update_usuarios_rh_updated_at` (BEFORE UPDATE) and `trigger_criar_preferencias_padrao`
-- (AFTER INSERT). BEFORE UPDATE OR DELETE so it guards every admin-removing path.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_usuarios_rh_anti_lockout'
      AND tgrelid = 'public.usuarios_rh'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_usuarios_rh_anti_lockout
             BEFORE UPDATE OR DELETE ON public.usuarios_rh
             FOR EACH ROW
             EXECUTE FUNCTION public.tg_usuarios_rh_anti_lockout()';
  END IF;
END $$;

COMMENT ON FUNCTION public.tg_usuarios_rh_anti_lockout() IS
  'Phase 28 / USR-07: BEFORE UPDATE OR DELETE anti-lockout guard on usuarios_rh. Refuses any '
  'mutation that would leave 0 active administradores (role=administrador AND ativo AND '
  'deleted_at IS NULL), RAISEing SQLSTATE P0001 (EF maps → LAST_ADMIN). Early-returns for '
  'non-threatening transitions (OLD not an active admin; UPDATE that stays an active admin). '
  'Takes pg_advisory_xact_lock(hashtext(''usuarios_rh_admin_guard'')) BEFORE the count(*) to '
  'serialize concurrent demotions and defeat write-skew to zero admins (RESEARCH Pitfall 3). '
  'Fires inside the DEFINER mutate RPC and even for the service_role EF — the only bypass-proof '
  'floor. Coexists with update_usuarios_rh_updated_at (BEFORE UPDATE) and '
  'trigger_criar_preferencias_padrao (AFTER INSERT); alphabetical BEFORE-order is safe.';

-- Harden the trigger fn (Shared Pattern C — REVOKE ALL FROM PUBLIC; trigger fns are invoked
-- by the trigger machinery, not called directly, so this removes any direct-invoke surface).
REVOKE ALL ON FUNCTION public.tg_usuarios_rh_anti_lockout() FROM PUBLIC;
