-- =============================================================================
-- Phase 28 / Plan 28-03 — USR-07 anti-lockout behavioral smoke: last-admin guard
-- =============================================================================
-- Proves, AFTER 20260713...usr_rh_anti_lockout.sql applies (28-05/28-07), that the
-- BEFORE UPDATE OR DELETE trigger tg_usuarios_rh_anti_lockout REFUSES any mutation that
-- would leave 0 active administradores — demote, deactivate, OR delete of the LAST active
-- admin each RAISE SQLSTATE P0001 (→ the EF maps it to error_code 'LAST_ADMIN'), with the
-- row unchanged; while demoting a NON-last admin still succeeds (the trigger is not
-- over-eager). The live floor is 4 active admins (28-LIVE-STATE.md cnt), so the "last admin"
-- world is reconstructed INSIDE a PL/pgSQL subtransaction that is ALWAYS rolled back — no
-- real admin row is ever permanently mutated.
--
-- ASSERTIONS (a NOTICE 'PASS ...' per case = PASS; an EXCEPTION = FAIL):
--   (1) demote the last active admin (role → recrutador) → P0001, row unchanged (0 mutation).
--   (2) deactivate the last active admin (ativo → false)  → P0001, row unchanged.
--   (3) delete the last active admin                      → P0001, row still present.
--   (4) demote a NON-last admin (>= 1 other active admin present) → succeeds (not over-eager).
--   (5) concurrency (advisory-lock write-skew): documented 2-session proof to RUN in 28-08
--         (single-session SQL cannot truly parallelize).
--
-- RED STATUS: cases (1)-(3) are RED against CURRENT PROD — the trigger does not exist yet,
-- so demote/deactivate/delete do NOT raise → the smoke reports FAIL. They go GREEN once
-- 28-05 lands the trigger and 28-08 runs this on PROD. Case (4) is GREEN even pre-apply
-- (a demote just succeeds); post-apply it proves the guard is scoped to the last-admin case.
--
-- MECHANISM (safety-first — no real admin is ever permanently touched):
--   A privileged setup step (RESET ROLE → BYPASSRLS) discovers a free auth.users id and
--   INSERTs a DISPOSABLE administrador (fixed UUID 28030007-…-001; committed — a harmless
--   5th admin, removed by cleanup). Each last-admin case runs in ONE DO block with an OUTER
--   SUBTRANSACTION (BEGIN…EXCEPTION): it deactivates every OTHER active admin one row at a
--   time (each UPDATE legally passes the trigger — >= 1 admin still active), leaving the
--   fixture as the ONLY active admin, then attempts the forbidden mutation on the fixture
--   inside an INNER subtransaction that catches P0001. Whether the assertion passes (a
--   sentinel 22023 raise) or fails (a FAIL raise propagating out), the OUTER subtransaction
--   is UNWOUND → the real admins' deactivations are rolled back and restored. PL/pgSQL
--   variables (v_raised) survive the rollback, so the PASS/FAIL verdict is still decidable.
--
-- CLEANUP is ROLLBACK-free: deletes ONLY the disposable admin fixture (child preferencias
--   first, then the usuarios_rh row) by its fixed UUID. Real admins are NEVER deleted.
--
-- RUN: Supabase SQL Editor / MCP execute_sql AFTER the 28-05 trigger migration applies in
--      the [BLOCKING] wave (28-07). THIS FILE IS RED until then. Not run by the CI runner.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery + disposable admin fixture (committed; harmless)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_auth uuid;
BEGIN
  BEGIN
    DELETE FROM public.preferencias_notificacoes WHERE usuario_rh_id = '28030007-0000-0000-0000-000000000001';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DELETE FROM public.usuarios_rh WHERE id = '28030007-0000-0000-0000-000000000001';

  SELECT au.id INTO v_auth FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = au.id)
    LIMIT 1;
  IF v_auth IS NULL THEN
    PERFORM set_config('smoke7.ready', 'n', false);
    RAISE NOTICE 'USR-07 SKIP: no free auth.users id — cannot build the disposable admin fixture'; RETURN;
  END IF;

  INSERT INTO public.usuarios_rh (id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso)
  VALUES ('28030007-0000-0000-0000-000000000001', v_auth,
          '[SMOKE 28-03] Admin disposable', 'smoke2803admin@example.com',
          'SMOKE admin', 'administrador', true, false);

  PERFORM set_config('smoke7.ready', 'y', false);
  RAISE NOTICE 'USR-07 fixture built (disposable admin id=28030007-…-001, user_id=%)', v_auth;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke7.ready', 'n', false);
  RAISE NOTICE 'USR-07 SKIP: disposable fixture could not be built (%: %) — adjust at run time', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) DEMOTE the last active admin → P0001, 0 mutation.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_fix uuid := '28030007-0000-0000-0000-000000000001';
        r record; v_raised boolean := false; v_role text;
BEGIN
  IF current_setting('smoke7.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-07 SKIP (1 demote): fixture not built'; RETURN; END IF;
  BEGIN  -- OUTER subtransaction: everything here is rolled back (real admins restored)
    FOR r IN SELECT id FROM public.usuarios_rh
             WHERE role = 'administrador' AND ativo AND deleted_at IS NULL AND id <> v_fix LOOP
      UPDATE public.usuarios_rh SET ativo = false WHERE id = r.id;  -- legal: >= 1 admin (the fixture) stays active
    END LOOP;
    BEGIN  -- INNER subtransaction: the forbidden mutation
      UPDATE public.usuarios_rh SET role = 'recrutador' WHERE id = v_fix;
    EXCEPTION WHEN sqlstate 'P0001' THEN v_raised := true;  -- anti-lockout fired; demote rolled back
    END;
    SELECT role INTO v_role FROM public.usuarios_rh WHERE id = v_fix;
    IF NOT v_raised THEN
      RAISE EXCEPTION 'USR-07 FAIL (1 demote): demoting the LAST active admin did NOT raise P0001 (trigger missing/inactive) — role is now %', v_role;
    END IF;
    IF v_role IS DISTINCT FROM 'administrador' THEN
      RAISE EXCEPTION 'USR-07 FAIL (1 demote): last-admin row was mutated despite P0001 (role=%) — the 0-mutation invariant is broken', v_role;
    END IF;
    RAISE EXCEPTION 'SMOKE_ROLLBACK_2807' USING ERRCODE = '22023';  -- pass path → unwind the outer subtransaction
  EXCEPTION WHEN sqlstate '22023' THEN
    NULL;  -- outer subtransaction unwound → the deactivated real admins are restored
  END;
  RAISE NOTICE 'PASS (1 demote): demoting the last active admin raises P0001 and leaves the row unchanged (0 mutation)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) DEACTIVATE the last active admin (ativo → false) → P0001, 0 mutation.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_fix uuid := '28030007-0000-0000-0000-000000000001';
        r record; v_raised boolean := false; v_ativo boolean;
BEGIN
  IF current_setting('smoke7.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-07 SKIP (2 deactivate): fixture not built'; RETURN; END IF;
  BEGIN
    FOR r IN SELECT id FROM public.usuarios_rh
             WHERE role = 'administrador' AND ativo AND deleted_at IS NULL AND id <> v_fix LOOP
      UPDATE public.usuarios_rh SET ativo = false WHERE id = r.id;
    END LOOP;
    BEGIN
      UPDATE public.usuarios_rh SET ativo = false WHERE id = v_fix;
    EXCEPTION WHEN sqlstate 'P0001' THEN v_raised := true;
    END;
    SELECT ativo INTO v_ativo FROM public.usuarios_rh WHERE id = v_fix;
    IF NOT v_raised THEN
      RAISE EXCEPTION 'USR-07 FAIL (2 deactivate): deactivating the LAST active admin did NOT raise P0001 (trigger missing/inactive) — ativo is now %', v_ativo;
    END IF;
    IF v_ativo IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'USR-07 FAIL (2 deactivate): last-admin row was deactivated despite P0001 (ativo=%) — invariant broken', v_ativo;
    END IF;
    RAISE EXCEPTION 'SMOKE_ROLLBACK_2807' USING ERRCODE = '22023';
  EXCEPTION WHEN sqlstate '22023' THEN
    NULL;
  END;
  RAISE NOTICE 'PASS (2 deactivate): deactivating the last active admin raises P0001 and leaves it active (0 mutation)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) DELETE the last active admin → P0001, row still present.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_fix uuid := '28030007-0000-0000-0000-000000000001';
        r record; v_raised boolean := false; v_still int;
BEGIN
  IF current_setting('smoke7.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-07 SKIP (3 delete): fixture not built'; RETURN; END IF;
  BEGIN
    FOR r IN SELECT id FROM public.usuarios_rh
             WHERE role = 'administrador' AND ativo AND deleted_at IS NULL AND id <> v_fix LOOP
      UPDATE public.usuarios_rh SET ativo = false WHERE id = r.id;
    END LOOP;
    BEGIN
      DELETE FROM public.usuarios_rh WHERE id = v_fix;
    EXCEPTION WHEN sqlstate 'P0001' THEN v_raised := true;
    END;
    SELECT count(*) INTO v_still FROM public.usuarios_rh WHERE id = v_fix;
    IF NOT v_raised THEN
      RAISE EXCEPTION 'USR-07 FAIL (3 delete): deleting the LAST active admin did NOT raise P0001 (trigger missing/inactive) — rows remaining=%', v_still;
    END IF;
    IF v_still <> 1 THEN
      RAISE EXCEPTION 'USR-07 FAIL (3 delete): last-admin row was deleted despite P0001 (remaining=%) — invariant broken', v_still;
    END IF;
    RAISE EXCEPTION 'SMOKE_ROLLBACK_2807' USING ERRCODE = '22023';
  EXCEPTION WHEN sqlstate '22023' THEN
    NULL;
  END;
  RAISE NOTICE 'PASS (3 delete): deleting the last active admin raises P0001 and the row survives';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (4) DEMOTE a NON-last admin — succeeds (the trigger is not over-eager). The live 4
--     real admins remain active, so demoting the disposable fixture leaves >= 4 others.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_fix uuid := '28030007-0000-0000-0000-000000000001'; v_role text;
BEGIN
  IF current_setting('smoke7.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-07 SKIP (4 non-last): fixture not built'; RETURN; END IF;
  BEGIN  -- OUTER subtransaction: the demote is rolled back (fixture stays admin for cleanup)
    BEGIN
      UPDATE public.usuarios_rh SET role = 'recrutador' WHERE id = v_fix;
    EXCEPTION WHEN sqlstate 'P0001' THEN
      RAISE EXCEPTION 'USR-07 FAIL (4 non-last): demoting a NON-last admin raised P0001 (trigger over-eager) — % other active admins exist',
        (SELECT count(*) FROM public.usuarios_rh WHERE role = 'administrador' AND ativo AND deleted_at IS NULL AND id <> v_fix);
    END;
    SELECT role INTO v_role FROM public.usuarios_rh WHERE id = v_fix;
    IF v_role IS DISTINCT FROM 'recrutador' THEN
      RAISE EXCEPTION 'USR-07 FAIL (4 non-last): expected the demote to succeed, role is %', v_role;
    END IF;
    RAISE EXCEPTION 'SMOKE_ROLLBACK_2807' USING ERRCODE = '22023';
  EXCEPTION WHEN sqlstate '22023' THEN
    NULL;
  END;
  RAISE NOTICE 'PASS (4 non-last): demoting an admin while >= 1 other active admin remains succeeds (trigger not over-eager)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (5) CONCURRENCY (advisory-lock write-skew) — DOCUMENTED 2-session proof for 28-08.
--     A single SQL session cannot truly parallelize, so RUN this in TWO MCP/psql sessions
--     that overlap. The trigger PERFORMs pg_advisory_xact_lock(hashtext('usuarios_rh_admin_guard'))
--     BEFORE counting active admins, so the two demotions serialize: whichever commits
--     first is fine (an admin remains); the second re-counts, sees 0 others, and RAISEs
--     P0001 → exactly ONE succeeds and >= 1 active admin always survives (RESEARCH Pitfall 3).
--
--     PRECONDITION: reduce the world to EXACTLY TWO active admins (A and B) in a disposable
--     way — e.g. deactivate all but two real admins inside a transaction you keep open, OR
--     run against a staging DB seeded with two admins. Capture their ids into :adminA / :adminB.
--
--     -- Session 1:                              -- Session 2 (start while S1 is mid-transaction):
--     BEGIN;                                     BEGIN;
--     UPDATE public.usuarios_rh                  UPDATE public.usuarios_rh
--        SET role='recrutador'                      SET role='recrutador'
--      WHERE id = :adminA;                        WHERE id = :adminB;
--     -- (holds the advisory xact lock)          -- (blocks on the advisory lock until S1 ends)
--     COMMIT;   -- succeeds                       -- unblocks, re-counts others=0 → RAISE P0001
--                                                 ROLLBACK;
--
--     EXPECTED: S1 COMMIT succeeds; S2 fails with SQLSTATE P0001 (LAST_ADMIN). Assert that
--     AFTER both sessions end, count(*) FROM usuarios_rh WHERE role='administrador' AND ativo
--     AND deleted_at IS NULL >= 1. Then restore the two admins (ROLLBACK the disposable
--     precondition). This 2-session case is NOT executed by this single-session file.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: drop ONLY the disposable admin fixture (child preferencias
--   first, then the usuarios_rh row) by its fixed UUID. Real admins are NEVER deleted.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  BEGIN
    DELETE FROM public.preferencias_notificacoes WHERE usuario_rh_id = '28030007-0000-0000-0000-000000000001';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DELETE FROM public.usuarios_rh WHERE id = '28030007-0000-0000-0000-000000000001';
END $$;
SELECT set_config('smoke7.ready', '', false);
