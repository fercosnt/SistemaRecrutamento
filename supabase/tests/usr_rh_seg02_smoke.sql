-- =============================================================================
-- Phase 28 / Plan 28-03 — SEG-02 roster-leak behavioral smoke: usuarios_rh RLS
-- =============================================================================
-- Proves, AFTER 20260713...usr_rh_rls_seg02.sql applies (28-04/28-07), that the RH
-- roster is admin-only WITHOUT breaking non-admin login (the phase's #1 landmine —
-- drop the own-row policy and every recrutador login breaks: 0 rows → the
-- [[reference_auth_hook_rls_gap]] failure mode). Asserts the ROW PROJECTION, not
-- pg_policies metadata — the exact M4/SEC-07/08 lesson that a structural grep of
-- pg_policies passes while a real leak persists.
--
-- ASSERTIONS (a NOTICE 'PASS ...' per case = PASS; an EXCEPTION = FAIL):
--   (1) candidato JWT  → SELECT count(*) FROM usuarios_rh = 0 (no roster leak).
--   (2) recrutador JWT → sees EXACTLY its OWN row (own-row policy — mandatory for
--         login) and 0 non-own rows (roster leak closed).
--   (3) administrador JWT → reads the FULL roster (>= the live count captured
--         privileged in setup).
--   (4) SEC-09 preserved → the policy `auth_admin_le_usuarios_rh` (the auth-hook's
--         dependency, M4/SEC-09) still exists with qual = 'true'. Never re-migrated.
--
-- RED STATUS: assertions (1) and (2) are RED against CURRENT PROD — the two live
-- qual=true SELECT leaks (`usuarios_rh_authenticated_read` + `usuarios_rh_simple_read`,
-- see 28-LIVE-STATE.md A1) let ANY authenticated candidato/recrutador read the whole
-- roster, so a candidato/recrutador count is > 0 today. They go GREEN once 28-04 drops
-- the leaks + adds `is_active_rh_admin()` + admin/own-row SELECT policies, and 28-08
-- runs this file on PROD. Assertion (4) is GREEN today (the SEC-09 policy already lives)
-- — it is a regression guard proving 28-04 did NOT touch it.
--
-- MECHANISM (M2 SECURITY-gate idiom — impersonate a JWT via request.jwt.claims):
--   A privileged setup step (RESET ROLE → postgres/service_role, BYPASSRLS) discovers a
--   real active admin + a free auth.users id (one NOT already an RH — the create-path FK
--   target) and INSERTs a DISPOSABLE recrutador row (fixed UUID 28030002-…-001) so the
--   own-row (recrutador) case has a real non-admin RH to read. Each case sets
--   `request.jwt.claims` to the impersonated user's `sub`, drops to `SET ROLE authenticated`
--   (RLS now applies), and asserts the row projection. is_active_rh_admin() reads auth.uid()
--   → the sub, so the row projection is decided by the TABLE, never the JWT app_metadata.
--   The candidato uid is synthetic (28030002-…-0ca) and asserted absent from usuarios_rh.
--   If the fixture cannot be built (no free auth user / no admin), setup sets
--   smoke2.ready='n' and every case SKIPs-with-NOTICE (never a false FAIL).
--
-- CLEANUP is ROLLBACK-free: resets the simulated claims + role and deletes ONLY the
--   disposable fixture (its preferencias_notificacoes child from the AFTER INSERT trigger,
--   then the usuarios_rh row) by its fixed UUID. The discovered admin is REAL and is
--   NEVER deleted.
--
-- RUN: Supabase SQL Editor / MCP execute_sql AFTER the 28-04 RLS migration applies in the
--      [BLOCKING] wave (28-07). THIS FILE IS RED until then. Not run by the CI runner
--      (branch/PROD idiom).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery + disposable recrutador fixture (RLS bypass)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_auth uuid; v_admin uuid; v_roster int;
BEGIN
  -- Idempotent: clear any prior run's disposable fixture (child first — the AFTER INSERT
  -- trigger trigger_criar_preferencias_padrao creates a preferencias_notificacoes row).
  BEGIN
    DELETE FROM public.preferencias_notificacoes WHERE usuario_rh_id = '28030002-0000-0000-0000-000000000001';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DELETE FROM public.usuarios_rh WHERE id = '28030002-0000-0000-0000-000000000001';

  -- A free auth.users id (not yet an RH) → a valid, unique usuarios_rh.user_id FK target.
  SELECT au.id INTO v_auth FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = au.id)
    LIMIT 1;
  -- A real active administrador (the admin-roster case impersonates it).
  SELECT user_id INTO v_admin FROM public.usuarios_rh
    WHERE role = 'administrador' AND ativo AND deleted_at IS NULL LIMIT 1;
  SELECT count(*) INTO v_roster FROM public.usuarios_rh;

  IF v_auth IS NULL OR v_admin IS NULL THEN
    PERFORM set_config('smoke2.ready', 'n', false);
    RAISE NOTICE 'SEG-02 SKIP: no free auth.users id (%) or no active admin (%) — cannot build the fixture', v_auth, v_admin;
    RETURN;
  END IF;

  INSERT INTO public.usuarios_rh (id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso)
  VALUES ('28030002-0000-0000-0000-000000000001', v_auth,
          '[SMOKE 28-03] Recrutador disposable', 'smoke2803recrutador@example.com',
          'SMOKE recrutador', 'recrutador', true, false);

  PERFORM set_config('smoke2.rec_uid',   v_auth::text,  false);  -- own-row = user_id = auth.uid()
  PERFORM set_config('smoke2.admin_uid', v_admin::text, false);
  PERFORM set_config('smoke2.roster',    v_roster::text, false); -- live roster incl. the fixture (+1)
  PERFORM set_config('smoke2.cand_uid',  '28030002-0000-0000-0000-0000000000ca', false); -- synthetic, not an RH
  PERFORM set_config('smoke2.ready',     'y', false);
  RAISE NOTICE 'SEG-02 fixture built (recrutador disposable user_id=% · admin_uid=% · live roster=%)', v_auth, v_admin, v_roster;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke2.ready', 'n', false);
  RAISE NOTICE 'SEG-02 SKIP: disposable fixture could not be built (%: %) — adjust to live schema at run time', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) candidato JWT — the roster is admin-only → a candidato reads 0 rows.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke2.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting('smoke2.cand_uid'), 'role', 'authenticated',
                      'app_metadata', json_build_object('role', 'candidato'))::text, false);
END $$;
SET ROLE authenticated;
DO $$
DECLARE v_n int;
BEGIN
  IF current_setting('smoke2.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-02 SKIP (1 candidato): fixture not built'; RETURN; END IF;
  SELECT count(*) INTO v_n FROM public.usuarios_rh;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'SEG-02 FAIL (1 candidato): read % usuarios_rh row(s) via the roster (expected 0 — the qual=true leak policies must be dropped in 28-04)', v_n;
  END IF;
  RAISE NOTICE 'PASS (1 candidato): candidato JWT reads 0 usuarios_rh rows (no roster leak)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) recrutador JWT — sees EXACTLY its own row (own-row policy) and 0 non-own rows.
--     Own-row read is MANDATORY: authStore.fetchProfile reads the caller's own row on
--     every RH login; drop it and non-admin login breaks.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke2.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting('smoke2.rec_uid'), 'role', 'authenticated',
                      'app_metadata', json_build_object('role', 'rh'))::text, false);
END $$;
SET ROLE authenticated;
DO $$
DECLARE v_total int; v_others int;
BEGIN
  IF current_setting('smoke2.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-02 SKIP (2 recrutador): fixture not built'; RETURN; END IF;
  SELECT count(*) INTO v_total  FROM public.usuarios_rh;
  SELECT count(*) INTO v_others FROM public.usuarios_rh
    WHERE user_id <> (current_setting('smoke2.rec_uid'))::uuid;
  IF v_total <> 1 THEN
    RAISE EXCEPTION 'SEG-02 FAIL (2 recrutador): expected exactly 1 visible row (own-row only), saw % (roster leak OR own-row policy missing → login breaks)', v_total;
  END IF;
  IF v_others <> 0 THEN
    RAISE EXCEPTION 'SEG-02 FAIL (2 recrutador): saw % non-own row(s) (roster leak — a non-admin RH must read its own row ONLY)', v_others;
  END IF;
  RAISE NOTICE 'PASS (2 recrutador): non-admin RH reads exactly its OWN row (own-row policy works) and 0 roster rows (leak closed)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) administrador JWT — reads the full roster (>= the live count captured in setup).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke2.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting('smoke2.admin_uid'), 'role', 'authenticated',
                      'app_metadata', json_build_object('role', 'administrador'))::text, false);
END $$;
SET ROLE authenticated;
DO $$
DECLARE v_n int; v_roster int;
BEGIN
  IF current_setting('smoke2.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-02 SKIP (3 admin): fixture not built'; RETURN; END IF;
  v_roster := current_setting('smoke2.roster')::int;
  SELECT count(*) INTO v_n FROM public.usuarios_rh;
  IF v_n < v_roster THEN
    RAISE EXCEPTION 'SEG-02 FAIL (3 admin): administrador read % row(s) but the live roster is >= % — admin must read the FULL roster', v_n, v_roster;
  END IF;
  RAISE NOTICE 'PASS (3 admin): administrador JWT reads the full roster (% rows >= captured %)', v_n, v_roster;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (4) SEC-09 preserved — auth_admin_le_usuarios_rh still present with qual = 'true'.
--     The custom_access_token_hook (SECURITY INVOKER) depends on it to resolve every
--     RH role at login; 28-04 must NOT drop/alter it (regression guard, GREEN today).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
DO $$
DECLARE v_cnt int; v_qual text;
BEGIN
  SELECT count(*), max(qual) INTO v_cnt, v_qual FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'usuarios_rh'
     AND policyname = 'auth_admin_le_usuarios_rh';
  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'SEG-02 FAIL (4 SEC-09): policy auth_admin_le_usuarios_rh is MISSING — the auth-hook dependency was dropped (must be preserved intact)';
  END IF;
  IF v_qual IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'SEG-02 FAIL (4 SEC-09): auth_admin_le_usuarios_rh present but qual is % (expected true)', v_qual;
  END IF;
  RAISE NOTICE 'PASS (4 SEC-09): auth_admin_le_usuarios_rh preserved (USING true) — auth-hook role resolution intact';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (5) SEG-03 EARLY CLOSE (WR-01) — a recrutador CANNOT self-promote. No client WRITE
--     policy exists on usuarios_rh (28-04 dropped the WITH-CHECK-less UPDATE + names the
--     baseline write policies in defensive drops), so an own-row UPDATE affects 0 rows.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke2.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting('smoke2.rec_uid'), 'role', 'authenticated',
                      'app_metadata', json_build_object('role', 'rh'))::text, false);
END $$;
SET ROLE authenticated;
DO $$
DECLARE v_affected int; v_role text; v_denied boolean := false;
BEGIN
  IF current_setting('smoke2.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-02 SKIP (5 self-promotion): fixture not built'; RETURN; END IF;
  BEGIN
    UPDATE public.usuarios_rh SET role = 'administrador'
      WHERE user_id = (current_setting('smoke2.rec_uid'))::uuid;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true; v_affected := 0;
  END;
  IF v_affected <> 0 THEN
    RAISE EXCEPTION 'SEG-02 FAIL (5 self-promotion): recrutador UPDATE role=administrador affected % row(s) — self-promotion OPEN (a client WRITE policy survives)', v_affected;
  END IF;
  RAISE NOTICE 'PASS (5 self-promotion): recrutador cannot self-promote (0 rows, denied=%)', v_denied;
END $$;
RESET ROLE;
DO $$
DECLARE v_role text;
BEGIN
  IF current_setting('smoke2.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  SELECT role INTO v_role FROM public.usuarios_rh WHERE id = '28030002-0000-0000-0000-000000000001';
  IF v_role IS DISTINCT FROM 'recrutador' THEN
    RAISE EXCEPTION 'SEG-02 FAIL (5 self-promotion): the recrutador fixture role changed to % (self-promotion succeeded)', v_role;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: reset the simulated context + drop ONLY the disposable
--   fixture (child preferencias first, then the usuarios_rh row) by its fixed UUID.
--   The discovered admin is REAL and is NEVER deleted.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
DO $$
BEGIN
  BEGIN
    DELETE FROM public.preferencias_notificacoes WHERE usuario_rh_id = '28030002-0000-0000-0000-000000000001';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DELETE FROM public.usuarios_rh WHERE id = '28030002-0000-0000-0000-000000000001';
END $$;
SELECT set_config('smoke2.ready', '', false);
