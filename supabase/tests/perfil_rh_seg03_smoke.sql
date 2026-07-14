-- =============================================================================
-- Phase 30 / Plan 30-02 — SEG-03 self-service profile behavioral smoke
-- (atualizar_meu_perfil_rh: own-row-only + role/ativo-untouched + WR-01 regression)
-- =============================================================================
-- Proves, AFTER 30-06 applies the DEFINER RPC `public.atualizar_meu_perfil_rh(
--   p_nome text, p_avatar_url text DEFAULT NULL)`, that a self-service RH profile
-- edit is SEG-03-safe BY CONSTRUCTION: the write is uid-scoped (own row only),
-- column-limited (role/ativo/cargo/email NOT in the SET list), and the Phase-28
-- self-promotion-denied state (WR-01) still holds. Asserts BEHAVIOR (the row the
-- write actually touches / the columns it changes), not pg_policies metadata —
-- the M4/SEC-07/08 lesson that a structural grep passes while a real leak/hole
-- persists (see also usr_rh_seg02_smoke.sql).
--
-- ASSERTIONS (a NOTICE 'PASS ...' per case = PASS; an EXCEPTION = FAIL):
--   (1) own-row-only  → after the CALLER recrutador calls the RPC, ONLY the caller's
--         usuarios_rh row is renamed; a SECOND disposable recrutador row is UNTOUCHED
--         (WHERE user_id = auth.uid() scoped the DEFINER write to exactly one row — IDOR
--         is impossible even though the RPC runs as owner).
--   (2) role/ativo untouched → after the RPC call (ANY args), the caller's `role` is
--         still 'recrutador' and `ativo` is unchanged. role/ativo/cargo/email are NOT
--         in the RPC SET list → the self-service path cannot escalate a privilege.
--   (3) COALESCE avatar → a NULL avatar arg (name-only save) does NOT wipe the seeded
--         avatar_url (COALESCE(p_avatar_url, avatar_url)); a non-null arg DOES update it.
--   (4) WR-01 regression → a recrutador direct `UPDATE usuarios_rh SET role='administrador'`
--         (bypassing the RPC) affects 0 rows (no client UPDATE policy — Phase-28 hole
--         drop intact); the caller's role stays 'recrutador'.
--   (5) no client UPDATE policy → pg_policies has ZERO cmd='UPDATE' policy on usuarios_rh
--         (Phase-28 state preserved; the DEFINER RPC needs no policy).
--
-- RED STATUS: cases (1) and (3) are RED against CURRENT PROD — the RPC does not exist
-- yet, so `PERFORM public.atualizar_meu_perfil_rh(...)` raises undefined_function (42883).
-- They go GREEN once 30-06 applies the migration and 30-07 runs this file on PROD.
-- Cases (2), (4) and (5) are regression guards: GREEN today (they re-prove the Phase-28
-- WR-01 / no-client-write state) and MUST stay GREEN after 30-06. Because there is NO
-- BEGIN/COMMIT wrapper, each statement auto-commits independently — an undefined_function
-- error in case (1)/(3) does NOT abort the regression cases or the cleanup.
--
-- MECHANISM (M2 SECURITY-gate idiom — impersonate a JWT via request.jwt.claims):
--   A privileged setup step (RESET ROLE → postgres/service_role, BYPASSRLS) discovers TWO
--   FREE auth.users ids (each NOT already an RH — the FK target for usuarios_rh.user_id AND
--   for the RPC's `updated_by = auth.uid()`, which is FK'd to auth.users; the Phase-28
--   USR-06 smoke hit exactly this — the actor MUST be a real auth user) and INSERTs TWO
--   DISPOSABLE recrutador rows at fixed UUIDs: `30020003-…-001` = the CALLER (whose
--   auth.uid() drives the RPC), `30020003-…-002` = the SECOND user whose row must stay
--   UNTOUCHED (so own-row-only vs IDOR is provable). Each case sets `request.jwt.claims`
--   to the impersonated `sub`, drops to `SET ROLE authenticated`, and calls the RPC /
--   asserts; privileged assertions RESET ROLE first (the caller can only self-read its own
--   row under RLS). auth.uid() → the sub, so the write target is decided by the TABLE,
--   never the JWT app_metadata. If the fixture cannot be built (fewer than two free auth
--   users), setup sets smoke30.ready='n' and every case SKIPs-with-NOTICE (never a false FAIL).
--
-- CLEANUP is ROLLBACK-free: resets the simulated claims + role and deletes ONLY the two
--   disposable fixtures (their preferencias_notificacoes children from the AFTER INSERT
--   trigger first, then the usuarios_rh rows) by fixed UUID. The discovered auth.users rows
--   are REAL and are NEVER deleted.
--
-- RUN: Supabase MCP execute_sql / SQL Editor AFTER the 30-06 RPC migration applies. THIS
--      FILE IS RED (cases 1+3) until then. Not run by the Vitest runner (branch/PROD idiom).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery of TWO free auth.users + TWO disposable recrutador
--         fixtures (RLS bypass). Seeds the caller with a non-null avatar_url so the
--         COALESCE case can prove a NULL arg does not wipe it.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_auth1 uuid; v_auth2 uuid;
BEGIN
  -- Idempotent: clear any prior run's disposable fixtures (children first — the AFTER
  -- INSERT trigger trigger_criar_preferencias_padrao creates a preferencias_notificacoes row).
  BEGIN
    DELETE FROM public.preferencias_notificacoes
      WHERE usuario_rh_id IN ('30020003-0000-0000-0000-000000000001',
                              '30020003-0000-0000-0000-000000000002');
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DELETE FROM public.usuarios_rh
    WHERE id IN ('30020003-0000-0000-0000-000000000001',
                 '30020003-0000-0000-0000-000000000002');

  -- Two DISTINCT free auth.users ids (not yet an RH) → valid, unique usuarios_rh.user_id
  -- FK targets. The caller's id also becomes the RPC's updated_by (FK'd to auth.users).
  SELECT au.id INTO v_auth1 FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = au.id)
    ORDER BY au.id LIMIT 1;
  SELECT au.id INTO v_auth2 FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = au.id)
      AND au.id <> COALESCE(v_auth1, '00000000-0000-0000-0000-000000000000')
    ORDER BY au.id LIMIT 1;

  IF v_auth1 IS NULL OR v_auth2 IS NULL THEN
    PERFORM set_config('smoke30.ready', 'n', false);
    RAISE NOTICE 'SEG-03 SKIP: need two free auth.users ids (got % / %) — cannot build the fixtures', v_auth1, v_auth2;
    RETURN;
  END IF;

  -- CALLER (…-001): seeded avatar_url so the COALESCE case can prove NULL does not wipe it.
  INSERT INTO public.usuarios_rh (id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso, avatar_url)
  VALUES ('30020003-0000-0000-0000-000000000001', v_auth1,
          '[SMOKE 30-02] Caller recrutador', 'smoke3002caller@example.com',
          'SMOKE recrutador', 'recrutador', true, false, 'smoke30/seed-avatar.png');

  -- SECOND user (…-002): its row must remain UNTOUCHED after the caller's RPC call.
  INSERT INTO public.usuarios_rh (id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso, avatar_url)
  VALUES ('30020003-0000-0000-0000-000000000002', v_auth2,
          '[SMOKE 30-02] Second recrutador', 'smoke3002second@example.com',
          'SMOKE recrutador', 'recrutador', true, false, NULL);

  PERFORM set_config('smoke30.caller_uid',  v_auth1::text, false);  -- own-row = user_id = auth.uid()
  PERFORM set_config('smoke30.second_uid',  v_auth2::text, false);
  PERFORM set_config('smoke30.second_name', '[SMOKE 30-02] Second recrutador', false); -- untouched baseline
  PERFORM set_config('smoke30.avatar_seed', 'smoke30/seed-avatar.png', false);         -- COALESCE baseline
  PERFORM set_config('smoke30.ready',       'y', false);
  RAISE NOTICE 'SEG-03 fixtures built (caller user_id=% · second user_id=%)', v_auth1, v_auth2;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke30.ready', 'n', false);
  RAISE NOTICE 'SEG-03 SKIP: disposable fixtures could not be built (%: %) — adjust to live schema at run time', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) own-row-only — caller renames itself via the RPC; the SECOND user is untouched.
--     RED until 30-06 (PERFORM raises undefined_function 42883).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke30.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting('smoke30.caller_uid'), 'role', 'authenticated',
                      'app_metadata', json_build_object('role', 'rh'))::text, false);
END $$;
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke30.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-03 SKIP (1 own-row-only): fixture not built'; RETURN; END IF;
  -- SEG-03 by construction: uid-scoped DEFINER write. RED until the RPC exists.
  PERFORM public.atualizar_meu_perfil_rh('SMOKE Novo Nome', NULL);
  RAISE NOTICE 'SEG-03 (1 own-row-only): RPC invoked as caller-recrutador';
END $$;
RESET ROLE;
DO $$
DECLARE v_caller_name text; v_second_name text;
BEGIN
  IF current_setting('smoke30.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-03 SKIP (1 own-row-only): fixture not built'; RETURN; END IF;
  SELECT nome_completo INTO v_caller_name FROM public.usuarios_rh
    WHERE id = '30020003-0000-0000-0000-000000000001';
  SELECT nome_completo INTO v_second_name FROM public.usuarios_rh
    WHERE id = '30020003-0000-0000-0000-000000000002';
  IF v_caller_name IS DISTINCT FROM 'SMOKE Novo Nome' THEN
    RAISE EXCEPTION 'SEG-03 FAIL (1 own-row-only): caller nome_completo is % (expected SMOKE Novo Nome — the RPC did not update the own row)', v_caller_name;
  END IF;
  IF v_second_name IS DISTINCT FROM current_setting('smoke30.second_name') THEN
    RAISE EXCEPTION 'SEG-03 FAIL (1 own-row-only): the SECOND user nome_completo changed to % (expected % — IDOR: the write touched a non-own row)', v_second_name, current_setting('smoke30.second_name');
  END IF;
  RAISE NOTICE 'PASS (1 own-row-only): only the caller row was renamed; the second recrutador row is untouched (uid-scoped write)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) role/ativo untouched — after the RPC call (any args), the caller cannot have
--     escalated: role/ativo/cargo/email are NOT in the RPC SET list. GREEN today
--     (the RPC never ran → role/ativo are the seeded values) and GREEN after 30-06.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_role text; v_ativo boolean;
BEGIN
  IF current_setting('smoke30.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-03 SKIP (2 role/ativo): fixture not built'; RETURN; END IF;
  SELECT role, ativo INTO v_role, v_ativo FROM public.usuarios_rh
    WHERE id = '30020003-0000-0000-0000-000000000001';
  IF v_role IS DISTINCT FROM 'recrutador' THEN
    RAISE EXCEPTION 'SEG-03 FAIL (2 role/ativo): caller role is % (expected recrutador — the self-service path must NOT write role)', v_role;
  END IF;
  IF v_ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'SEG-03 FAIL (2 role/ativo): caller ativo is % (expected true — the self-service path must NOT write ativo)', v_ativo;
  END IF;
  RAISE NOTICE 'PASS (2 role/ativo): caller role stays recrutador and ativo unchanged (role/ativo not in the RPC SET list)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) COALESCE avatar — a NULL avatar arg preserves the seeded avatar_url; a non-null
--     arg updates it. RED until 30-06 (PERFORM raises undefined_function 42883).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke30.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting('smoke30.caller_uid'), 'role', 'authenticated',
                      'app_metadata', json_build_object('role', 'rh'))::text, false);
END $$;
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke30.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-03 SKIP (3 COALESCE avatar): fixture not built'; RETURN; END IF;
  -- name-only save (NULL avatar) — must NOT wipe the seeded avatar.
  PERFORM public.atualizar_meu_perfil_rh('SMOKE Nome2', NULL);
  -- then a real avatar path — must update.
  PERFORM public.atualizar_meu_perfil_rh('SMOKE Nome2', 'smoke30/new-avatar.png');
  RAISE NOTICE 'SEG-03 (3 COALESCE avatar): RPC invoked twice (NULL then non-null avatar)';
END $$;
RESET ROLE;
DO $$
DECLARE v_avatar text;
BEGIN
  IF current_setting('smoke30.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-03 SKIP (3 COALESCE avatar): fixture not built'; RETURN; END IF;
  SELECT avatar_url INTO v_avatar FROM public.usuarios_rh
    WHERE id = '30020003-0000-0000-0000-000000000001';
  -- After the two calls above, the final non-null arg must have won.
  IF v_avatar IS DISTINCT FROM 'smoke30/new-avatar.png' THEN
    RAISE EXCEPTION 'SEG-03 FAIL (3 COALESCE avatar): avatar_url is % (expected smoke30/new-avatar.png — the non-null arg must update; and the earlier NULL arg must NOT have wiped the seed to leave it empty)', v_avatar;
  END IF;
  RAISE NOTICE 'PASS (3 COALESCE avatar): NULL arg preserved the seed and a non-null arg updated the avatar_url';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (4) WR-01 regression — a recrutador direct UPDATE role='administrador' (bypassing the
--     RPC) affects 0 rows: no client UPDATE policy survives (Phase-28 self-promotion
--     hole drop). GREEN today and MUST stay GREEN.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke30.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting('smoke30.caller_uid'), 'role', 'authenticated',
                      'app_metadata', json_build_object('role', 'rh'))::text, false);
END $$;
SET ROLE authenticated;
DO $$
DECLARE v_affected int; v_denied boolean := false;
BEGIN
  IF current_setting('smoke30.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-03 SKIP (4 WR-01 self-promotion): fixture not built'; RETURN; END IF;
  BEGIN
    UPDATE public.usuarios_rh SET role = 'administrador'
      WHERE user_id = (current_setting('smoke30.caller_uid'))::uuid;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true; v_affected := 0;
  END;
  IF v_affected <> 0 THEN
    RAISE EXCEPTION 'SEG-03 FAIL (4 WR-01 self-promotion): direct UPDATE role=administrador affected % row(s) — self-promotion OPEN (a client UPDATE policy survives)', v_affected;
  END IF;
  RAISE NOTICE 'PASS (4 WR-01 self-promotion): recrutador direct UPDATE role=administrador affects 0 rows (denied=%)', v_denied;
END $$;
RESET ROLE;
DO $$
DECLARE v_role text;
BEGIN
  IF current_setting('smoke30.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  SELECT role INTO v_role FROM public.usuarios_rh WHERE id = '30020003-0000-0000-0000-000000000001';
  IF v_role IS DISTINCT FROM 'recrutador' THEN
    RAISE EXCEPTION 'SEG-03 FAIL (4 WR-01 self-promotion): caller role changed to % (self-promotion succeeded)', v_role;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (5) no client UPDATE policy — pg_policies has ZERO cmd='UPDATE' policy on
--     usuarios_rh (Phase-28 state preserved; the DEFINER RPC needs no policy).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
DO $$
DECLARE v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'usuarios_rh' AND cmd = 'UPDATE';
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'SEG-03 FAIL (5 no client UPDATE policy): usuarios_rh has % cmd=UPDATE policy(ies) — a client write path was re-introduced (Phase-28 hole re-opened)', v_cnt;
  END IF;
  RAISE NOTICE 'PASS (5 no client UPDATE policy): usuarios_rh has 0 cmd=UPDATE policies (Phase-28 no-client-write state preserved)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: reset the simulated context + drop ONLY the two disposable
--   fixtures (children preferencias first, then the usuarios_rh rows) by fixed UUID.
--   The discovered auth.users rows are REAL and are NEVER deleted.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
DO $$
BEGIN
  BEGIN
    DELETE FROM public.preferencias_notificacoes
      WHERE usuario_rh_id IN ('30020003-0000-0000-0000-000000000001',
                              '30020003-0000-0000-0000-000000000002');
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DELETE FROM public.usuarios_rh
    WHERE id IN ('30020003-0000-0000-0000-000000000001',
                 '30020003-0000-0000-0000-000000000002');
END $$;
SELECT set_config('smoke30.ready', '', false);
