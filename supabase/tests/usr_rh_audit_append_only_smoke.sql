-- =============================================================================
-- Phase 28 / Plan 28-03 — USR-06 atomic-audit + append-only behavioral smoke
-- =============================================================================
-- Proves, AFTER the 28-05 mutate+audit RPCs and the 28-04 append-only hardening apply
-- (28-07), that every user-management action writes EXACTLY ONE immutable logs_auditoria
-- row (categoria='usuario') atomically with the mutation, that a FAILED mutation writes
-- ZERO audit rows (they commit/rollback together), and that the audit trail is append-only
-- (no role may INSERT via the client; nobody — not even an admin — may UPDATE/DELETE).
--
-- ASSERTIONS (a NOTICE 'PASS ...' per case = PASS; an EXCEPTION = FAIL):
--   (1) atomic mutate — gerir_usuario_rh_mutacao(actor, target, 'ativar') writes exactly ONE
--         row (categoria='usuario', recurso_tipo='usuarios_rh', recurso_id=target, usuario_id=actor,
--         acao='ativar').
--   (2) atomic create — criar_usuario_rh_com_audit(actor, new_user_id, email, nome, cargo, papel)
--         inserts the usuarios_rh row AND writes exactly ONE row (acao='criar', categoria='usuario',
--         recurso_id=<new id>, usuario_id=actor) in the SAME tx — not only the mutate path.
--   (3) rollback-together — a mutation on a NON-existent target (→ NOT_FOUND/P0002) writes ZERO
--         audit rows (audit and mutation are one transaction).
--   (4) append-only INSERT — a candidato JWT AND a recrutador JWT INSERT into logs_auditoria are
--         DENIED (the "Sistema insere logs" WITH CHECK true policy must be dropped + INSERT REVOKEd).
--   (5) append-only UPDATE/DELETE — an administrador JWT UPDATE and DELETE on an existing
--         logs_auditoria row are BOTH DENIED (no UPDATE/DELETE policy for anyone + REVOKE).
--   (6) resetar_senha shape — the EF-driven best-effort audit row (acao='resetar_senha',
--         categoria='usuario') the 28-06 EF emits after a GoTrue reset is recorded via the
--         existing DEFINER log_auditoria() path (a SQL smoke cannot invoke GoTrue; there is no
--         DB mutation to bind to atomically — so this asserts the row SHAPE only).
--
-- RED STATUS: (1)/(2)/(3) are RED — the RPCs do not exist yet (undefined_function → FAIL).
-- (4) is RED — the live "Sistema insere logs" policy lets ANY authenticated user forge a row
-- (INSERT succeeds → FAIL). (5) is RED — without the 28-04 REVOKE, UPDATE/DELETE quietly
-- affect 0 rows (no raise) → FAIL. (6) is GREEN today (log_auditoria already exists) — it
-- documents the EF audit-row shape. All go GREEN once 28-04/28-05 apply and 28-08 runs this.
--
-- MECHANISM: privileged setup (RESET ROLE → BYPASSRLS) discovers a real admin + two free
--   auth.users ids and builds a disposable non-admin target (fixed UUID 28030006-…-001) plus
--   a seed audit row (via log_auditoria, recurso_id=the target) for the UPDATE/DELETE case.
--   The mutate/create/rollback cases run under the privileged (service_role-like) role with
--   request.jwt.claims CLEARED — faithfully the EF's system-write context (the RPCs are
--   REVOKEd from authenticated). The append-only INSERT/UPDATE/DELETE cases impersonate a
--   candidato/recrutador/administrador JWT (set_config claims + SET ROLE authenticated) and
--   assert the DENIAL. If the fixture cannot be built (no admin / < 2 free auth ids), setup
--   sets smoke6.ready='n' and every case SKIPs-with-NOTICE.
--
-- CLEANUP is ROLLBACK-free and self-limited: deletes ONLY the audit rows the smoke created
--   (recurso_id = the disposable target / bogus / forge markers, and the created fixture's id)
--   and the disposable usuarios_rh fixtures (by their [SMOKE] emails), child preferencias
--   first. NEVER deletes a real audit row or a real usuarios_rh row.
--
-- RUN: Supabase SQL Editor / MCP execute_sql AFTER the 28-04 + 28-05 migrations apply in the
--      [BLOCKING] wave (28-07). THIS FILE IS RED until then. Not run by the CI runner.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery + disposable target + seed audit row (RLS bypass)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_auth1 uuid; v_auth2 uuid; v_admin uuid; v_logid uuid;
BEGIN
  -- Idempotent prior-run cleanup: audit rows (by our disposable recurso markers) + fixtures.
  DELETE FROM public.logs_auditoria
   WHERE categoria = 'usuario'
     AND recurso_id IN ('28030006-0000-0000-0000-000000000001','28030006-0000-0000-0000-0000000000ff');
  DELETE FROM public.logs_auditoria WHERE recurso_id = '28030006-0000-0000-0000-0000000000fe'; -- leaked forge rows
  BEGIN
    DELETE FROM public.preferencias_notificacoes WHERE usuario_rh_id IN
      (SELECT id FROM public.usuarios_rh WHERE email IN ('smoke2803target@example.com','smoke2803created@example.com'));
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DELETE FROM public.logs_auditoria WHERE categoria = 'usuario' AND recurso_id IN
    (SELECT id FROM public.usuarios_rh WHERE email = 'smoke2803created@example.com');
  DELETE FROM public.usuarios_rh WHERE email IN ('smoke2803target@example.com','smoke2803created@example.com');

  SELECT au.id INTO v_auth1 FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = au.id) LIMIT 1;
  SELECT au.id INTO v_auth2 FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = au.id)
      AND au.id <> v_auth1 LIMIT 1;
  SELECT user_id INTO v_admin FROM public.usuarios_rh
    WHERE role = 'administrador' AND ativo AND deleted_at IS NULL LIMIT 1;

  IF v_auth1 IS NULL OR v_auth2 IS NULL OR v_admin IS NULL THEN
    PERFORM set_config('smoke6.ready', 'n', false);
    RAISE NOTICE 'USR-06 SKIP: need 2 free auth.users ids (create-path FK) + 1 active admin — found %/%/%', v_auth1, v_auth2, v_admin;
    RETURN;
  END IF;

  -- Disposable non-admin target (the mutate/'ativar' + resetar_senha target).
  INSERT INTO public.usuarios_rh (id, user_id, nome_completo, email, cargo, role, ativo, primeiro_acesso)
  VALUES ('28030006-0000-0000-0000-000000000001', v_auth1,
          '[SMOKE 28-03] Target disposable', 'smoke2803target@example.com',
          'SMOKE target', 'recrutador', true, false);

  -- Seed an audit row (DEFINER path — allowed) for the append-only UPDATE/DELETE case.
  PERFORM public.log_auditoria(
    p_usuario_id := '28030006-0000-0000-0000-0000000000ac', p_usuario_tipo := 'admin',
    p_acao := 'smoke_seed', p_categoria := 'usuario', p_descricao := '[SMOKE 28-03] seed row for append-only test',
    p_recurso_tipo := 'usuarios_rh', p_recurso_id := '28030006-0000-0000-0000-000000000001', p_sucesso := true);
  SELECT id INTO v_logid FROM public.logs_auditoria
    WHERE recurso_id = '28030006-0000-0000-0000-000000000001' AND acao = 'smoke_seed'
    ORDER BY created_at DESC LIMIT 1;

  PERFORM set_config('smoke6.auth1',     v_auth1::text, false);  -- target user_id (recrutador impersonation)
  PERFORM set_config('smoke6.auth2',     v_auth2::text, false);  -- create-path new user_id
  PERFORM set_config('smoke6.admin_uid', v_admin::text, false);
  PERFORM set_config('smoke6.logid',     v_logid::text, false);
  PERFORM set_config('smoke6.ready',     'y', false);
  RAISE NOTICE 'USR-06 fixture built (target=28030006-…-001 · create auth=% · admin=% · seed log=%)', v_auth2, v_admin, v_logid;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke6.ready', 'n', false);
  RAISE NOTICE 'USR-06 SKIP: disposable fixture could not be built (%: %) — adjust at run time', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) ATOMIC MUTATE — gerir_usuario_rh_mutacao('ativar') writes exactly ONE audit row.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_actor uuid := current_setting('smoke6.admin_uid', true)::uuid;  -- real admin user_id (usuarios_rh.updated_by/created_by are FK'd to auth.users)
        v_target uuid := '28030006-0000-0000-0000-000000000001'; v_n int;
BEGIN
  IF current_setting('smoke6.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-06 SKIP (1 mutate-audit): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '', true);  -- system context (RPC REVOKEd from authenticated)
  BEGIN
    PERFORM public.gerir_usuario_rh_mutacao(v_actor, v_target, 'ativar');
  EXCEPTION
    WHEN undefined_function THEN
      RAISE EXCEPTION 'USR-06 FAIL (1 mutate-audit): gerir_usuario_rh_mutacao(uuid,uuid,text) not applied yet (RED until 28-05/28-07)';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'USR-06 FAIL (1 mutate-audit): RPC raised (%: %)', SQLSTATE, SQLERRM;
  END;
  SELECT count(*) INTO v_n FROM public.logs_auditoria
   WHERE recurso_id = v_target AND categoria = 'usuario' AND recurso_tipo = 'usuarios_rh'
     AND usuario_id = v_actor AND acao = 'ativar';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'USR-06 FAIL (1 mutate-audit): expected exactly 1 categoria=usuario audit row (ativar), found % (atomic mutate+audit broken)', v_n;
  END IF;
  RAISE NOTICE 'PASS (1 mutate-audit): gerir_usuario_rh_mutacao(ativar) wrote exactly one categoria=usuario audit row atomically';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) ATOMIC CREATE — criar_usuario_rh_com_audit inserts the row AND one 'criar' audit row.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_actor uuid := current_setting('smoke6.admin_uid', true)::uuid;  -- real admin user_id (usuarios_rh.updated_by/created_by are FK'd to auth.users)
        v_auth2 uuid; v_new uuid; v_n int;
BEGIN
  IF current_setting('smoke6.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-06 SKIP (2 create-audit): fixture not built'; RETURN; END IF;
  v_auth2 := current_setting('smoke6.auth2')::uuid;
  PERFORM set_config('request.jwt.claims', '', true);
  BEGIN
    PERFORM public.criar_usuario_rh_com_audit(
      v_actor, v_auth2, 'smoke2803created@example.com', '[SMOKE 28-03] Created disposable', 'SMOKE created', 'recrutador');
  EXCEPTION
    WHEN undefined_function THEN
      RAISE EXCEPTION 'USR-06 FAIL (2 create-audit): criar_usuario_rh_com_audit(...) not applied yet (RED until 28-05/28-07)';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'USR-06 FAIL (2 create-audit): RPC raised (%: %)', SQLSTATE, SQLERRM;
  END;
  SELECT id INTO v_new FROM public.usuarios_rh
   WHERE user_id = v_auth2 AND email = 'smoke2803created@example.com';
  IF v_new IS NULL THEN
    RAISE EXCEPTION 'USR-06 FAIL (2 create-audit): the create RPC did not insert the usuarios_rh row';
  END IF;
  SELECT count(*) INTO v_n FROM public.logs_auditoria
   WHERE recurso_id = v_new AND categoria = 'usuario' AND recurso_tipo = 'usuarios_rh'
     AND usuario_id = v_actor AND acao = 'criar';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'USR-06 FAIL (2 create-audit): expected exactly 1 categoria=usuario acao=criar audit row for the new user, found % (create is not atomic mutate+audit)', v_n;
  END IF;
  RAISE NOTICE 'PASS (2 create-audit): criar_usuario_rh_com_audit wrote the row + exactly one categoria=usuario acao=criar audit row atomically';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) ROLLBACK-TOGETHER — a mutation on a NON-existent target writes ZERO audit rows.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_actor uuid := current_setting('smoke6.admin_uid', true)::uuid;  -- real admin user_id (usuarios_rh.updated_by/created_by are FK'd to auth.users)
        v_bogus uuid := '28030006-0000-0000-0000-0000000000ff';
        v_raised boolean := false; v_n int;
BEGIN
  IF current_setting('smoke6.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-06 SKIP (3 rollback-together): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '', true);
  BEGIN
    PERFORM public.gerir_usuario_rh_mutacao(v_actor, v_bogus, 'ativar');
  EXCEPTION
    WHEN undefined_function THEN
      RAISE EXCEPTION 'USR-06 FAIL (3 rollback-together): gerir_usuario_rh_mutacao not applied yet (RED until 28-05/28-07)';
    WHEN OTHERS THEN
      v_raised := true;  -- NOT_FOUND (P0002) or any raise → the mutation failed
  END;
  IF NOT v_raised THEN
    RAISE EXCEPTION 'USR-06 FAIL (3 rollback-together): mutating a non-existent target did NOT raise (expected NOT_FOUND/P0002)';
  END IF;
  SELECT count(*) INTO v_n FROM public.logs_auditoria WHERE recurso_id = v_bogus AND categoria = 'usuario';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'USR-06 FAIL (3 rollback-together): % audit row(s) written for a FAILED mutation — audit must roll back WITH the mutation (atomic)', v_n;
  END IF;
  RAISE NOTICE 'PASS (3 rollback-together): a failed mutation wrote 0 audit rows (audit and mutation commit/rollback together)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (4a) APPEND-ONLY INSERT — a candidato JWT INSERT into logs_auditoria is DENIED.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke6.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '28030006-0000-0000-0000-0000000000ca', 'role', 'authenticated',
                      'app_metadata', json_build_object('role', 'candidato'))::text, false);
END $$;
SET ROLE authenticated;
DO $$
DECLARE v_denied boolean := false;
BEGIN
  IF current_setting('smoke6.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-06 SKIP (4a candidato INSERT): fixture not built'; RETURN; END IF;
  BEGIN
    INSERT INTO public.logs_auditoria (usuario_id, usuario_tipo, acao, categoria, descricao, severidade, recurso_tipo, recurso_id)
    VALUES ('28030006-0000-0000-0000-0000000000ca', 'candidato', 'forge_attempt', 'usuario',
            '[SMOKE 28-03] candidato forge attempt', 'info', 'usuarios_rh', '28030006-0000-0000-0000-0000000000fe');
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'USR-06 FAIL (4a candidato INSERT): candidato forged a logs_auditoria row (append-only breach — "Sistema insere logs" must be dropped + INSERT REVOKEd)';
  END IF;
  RAISE NOTICE 'PASS (4a candidato INSERT): candidato INSERT into logs_auditoria denied (append-only)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (4b) APPEND-ONLY INSERT — a recrutador JWT INSERT into logs_auditoria is DENIED.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke6.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting('smoke6.auth1'), 'role', 'authenticated',
                      'app_metadata', json_build_object('role', 'rh'))::text, false);
END $$;
SET ROLE authenticated;
DO $$
DECLARE v_denied boolean := false;
BEGIN
  IF current_setting('smoke6.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-06 SKIP (4b recrutador INSERT): fixture not built'; RETURN; END IF;
  BEGIN
    INSERT INTO public.logs_auditoria (usuario_id, usuario_tipo, acao, categoria, descricao, severidade, recurso_tipo, recurso_id)
    VALUES ((current_setting('smoke6.auth1'))::uuid, 'rh', 'forge_attempt', 'usuario',
            '[SMOKE 28-03] recrutador forge attempt', 'info', 'usuarios_rh', '28030006-0000-0000-0000-0000000000fe');
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'USR-06 FAIL (4b recrutador INSERT): recrutador forged a logs_auditoria row (append-only breach)';
  END IF;
  RAISE NOTICE 'PASS (4b recrutador INSERT): recrutador INSERT into logs_auditoria denied (append-only)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (5) APPEND-ONLY UPDATE/DELETE — an administrador JWT UPDATE and DELETE are BOTH DENIED.
--     The seed audit row (id captured in setup) is the target; the SECURE outcome is a
--     42501 raise from the 28-04 REVOKE (no UPDATE/DELETE policy exists for anyone).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke6.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting('smoke6.admin_uid'), 'role', 'authenticated',
                      'app_metadata', json_build_object('role', 'administrador'))::text, false);
END $$;
SET ROLE authenticated;
DO $$
DECLARE v_logid uuid; v_upd boolean := false; v_del boolean := false;
BEGIN
  IF current_setting('smoke6.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-06 SKIP (5 admin UPDATE/DELETE): fixture not built'; RETURN; END IF;
  v_logid := current_setting('smoke6.logid')::uuid;
  BEGIN
    UPDATE public.logs_auditoria SET descricao = '[SMOKE 28-03] tamper' WHERE id = v_logid;
  EXCEPTION WHEN insufficient_privilege THEN v_upd := true; END;
  BEGIN
    DELETE FROM public.logs_auditoria WHERE id = v_logid;
  EXCEPTION WHEN insufficient_privilege THEN v_del := true; END;
  IF NOT v_upd THEN
    RAISE EXCEPTION 'USR-06 FAIL (5 admin UPDATE): admin UPDATE on logs_auditoria was not denied (append-only requires REVOKE UPDATE + no UPDATE policy)';
  END IF;
  IF NOT v_del THEN
    RAISE EXCEPTION 'USR-06 FAIL (5 admin DELETE): admin DELETE on logs_auditoria was not denied (append-only requires REVOKE DELETE + no DELETE policy)';
  END IF;
  RAISE NOTICE 'PASS (5 admin UPDATE/DELETE): both denied on logs_auditoria (append-only — audit is immutable)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (6) RESETAR_SENHA SHAPE — the EF best-effort audit row (acao='resetar_senha',
--     categoria='usuario'). A SQL smoke cannot invoke GoTrue; there is no DB mutation to
--     bind to atomically, so we assert the SHAPE the 28-06 EF emits via log_auditoria().
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
DO $$
DECLARE v_actor uuid := current_setting('smoke6.admin_uid', true)::uuid;  -- real admin user_id (usuarios_rh.updated_by/created_by are FK'd to auth.users)
        v_target uuid := '28030006-0000-0000-0000-000000000001'; v_n int;
BEGIN
  IF current_setting('smoke6.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'USR-06 SKIP (6 resetar_senha shape): fixture not built'; RETURN; END IF;
  PERFORM public.log_auditoria(
    p_usuario_id := v_actor, p_usuario_tipo := 'admin', p_acao := 'resetar_senha',
    p_categoria := 'usuario', p_recurso_tipo := 'usuarios_rh', p_recurso_id := v_target,
    p_descricao := format('Reset de senha do usuário RH %s', v_target), p_sucesso := true);
  SELECT count(*) INTO v_n FROM public.logs_auditoria
   WHERE recurso_id = v_target AND categoria = 'usuario' AND acao = 'resetar_senha'
     AND usuario_id = v_actor AND recurso_tipo = 'usuarios_rh';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'USR-06 FAIL (6 resetar_senha shape): expected exactly 1 categoria=usuario acao=resetar_senha audit row, found %', v_n;
  END IF;
  RAISE NOTICE 'PASS (6 resetar_senha shape): the EF best-effort audit-row shape (acao=resetar_senha, categoria=usuario) is recorded via log_auditoria';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free and self-limited: delete ONLY rows this smoke created (by our
--   disposable recurso markers + [SMOKE] emails), child preferencias first. NEVER a real row.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
DO $$
BEGIN
  DELETE FROM public.logs_auditoria
   WHERE categoria = 'usuario'
     AND recurso_id IN ('28030006-0000-0000-0000-000000000001','28030006-0000-0000-0000-0000000000ff');
  DELETE FROM public.logs_auditoria WHERE recurso_id = '28030006-0000-0000-0000-0000000000fe'; -- any leaked forge rows
  BEGIN
    DELETE FROM public.preferencias_notificacoes WHERE usuario_rh_id IN
      (SELECT id FROM public.usuarios_rh WHERE email IN ('smoke2803target@example.com','smoke2803created@example.com'));
  EXCEPTION WHEN OTHERS THEN NULL; END;
  DELETE FROM public.logs_auditoria WHERE categoria = 'usuario' AND recurso_id IN
    (SELECT id FROM public.usuarios_rh WHERE email = 'smoke2803created@example.com');
  DELETE FROM public.usuarios_rh WHERE email IN ('smoke2803target@example.com','smoke2803created@example.com');
END $$;
SELECT set_config('smoke6.ready', '', false);
