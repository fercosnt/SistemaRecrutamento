-- =============================================================================
-- Migration: usr_rh_mutacao_rpc — atomic mutate+audit SECURITY DEFINER RPCs for usuarios_rh
-- Date: 2026-07-13
-- Phase: 28 (gest-o-de-usu-rios-rh-n-cleo-seguro)
-- Requirement: USR-06 (mutation and its audit row commit together — one transaction)
--              USR-02 (criar path used by the console/EF), USR-07 (UPDATE fires anti-lockout)
-- Plan: 28-05 (Task 2). Authored ONLY — applied to PROD in 28-07 (MCP apply_migration).
-- =============================================================================
--
-- PURPOSE
-- USR-06: a user-management mutation and its audit trail must never diverge. Both RPCs
-- perform the row change AND the log_auditoria() insert inside ONE function body → one
-- transaction. If the audit write fails, the mutation rolls back (and vice-versa); if the
-- anti-lockout trigger RAISEs (28-05 Task 1), the whole thing rolls back — no orphan
-- mutation, no orphan audit row.
--
-- WHY SECURITY DEFINER: usuarios_rh writes are denied to every client role (28-04 dropped
-- the client write policies; no INSERT/UPDATE policy exists). Only the authorize-gated
-- service_role EF (28-06) calls these RPCs. SECURITY DEFINER runs the body as the owner
-- (postgres / BYPASSRLS) so the write succeeds; SET search_path = public pins name
-- resolution (no search_path hijack). EXECUTE is REVOKEd from public/authenticated/anon —
-- only service_role can invoke, and the EF authorizes (administrador-only) BEFORE calling.
--
-- TRUST NOTE: the DB CHECK on usuarios_rh.role still allows the legacy 4-value set
-- (administrador/gerente/recrutador/visualizador). The v5 product surface constrains
-- p_papel / p_novo_papel to {recrutador, administrador} at the EF Zod layer (28-06,
-- .strict() discriminated union) — do NOT rely on the DB CHECK alone to enforce the v5 set.
--
-- ANTI-LOCKOUT INTERPLAY: gerir_usuario_rh_mutacao's UPDATE deliberately fires
-- trg_usuarios_rh_anti_lockout (28-05 Task 1). A last-admin demote/deactivate RAISEs P0001
-- inside the RPC and aborts the whole tx (mutation + not-yet-written audit) — the EF maps
-- P0001 → LAST_ADMIN. A missing target RAISEs P0002 → NOT_FOUND.
--
-- CREDENTIALS: dados_antes / dados_depois are to_jsonb of the usuarios_rh row, which has
-- NO password/OTP/token column (GoTrue owns credentials) — audit snapshots never leak a secret.
--
-- log_auditoria() signature (docs/sql/sql/25-functions-configuracoes.sql:63-77, verbatim):
--   log_auditoria(p_usuario_id uuid, p_usuario_tipo text, p_acao text,
--     p_categoria categoria_log_auditoria, p_descricao text, p_severidade severidade_log,
--     p_recurso_tipo text, p_recurso_id uuid, p_dados_antes jsonb, p_dados_depois jsonb,
--     p_ip_address inet, p_sucesso boolean, p_erro_mensagem text) RETURNS uuid
--   (SECURITY DEFINER, owner BYPASSRLS → the audit INSERT survives 28-04's dropped
--    authenticated INSERT policy). categoria 'usuario' + severidade 'critico'/'aviso' rows
--    are also purge-exempt (28-04 limpar_logs_antigos diff).
--
-- SIGNATURE PIN (28-06 §interfaces): the EF calls these by name via .rpc() with EXACT
-- param names — criar_usuario_rh_com_audit(p_actor,p_user_id,p_email,p_nome,p_cargo,p_papel)
-- and gerir_usuario_rh_mutacao(p_actor,p_target,p_action,p_novo_papel). Any drift surfaces
-- at the 28-08 PROD smoke. Do NOT rename params.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (CLAUDE.md §Commands / D-22). CREATE
-- FUNCTION + COMMENT (PL/pgSQL $$ bodies) → apply via Supabase MCP apply_migration in the
-- [BLOCKING] wave 28-07 — NOT applied here. Behavioral proof (atomic audit row, rollback
-- together, NOT_FOUND) is the 28-03 smoke, run GREEN in 28-08. Version-row reconcile → DBMIG.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (1) gerir_usuario_rh_mutacao — DB-only actions (mudar_papel / desativar / ativar)
--     mutate usuarios_rh AND write the audit row in one transaction.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerir_usuario_rh_mutacao(
  p_actor uuid,
  p_target uuid,
  p_action text,
  p_novo_papel text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  antes  jsonb;
  depois jsonb;
  v_sev  severidade_log;
BEGIN
  -- Read prior state and lock the target row (FOR UPDATE) so the snapshot is consistent
  -- with the mutation below and concurrent mutations serialize on the row.
  SELECT to_jsonb(u) INTO antes
  FROM public.usuarios_rh u
  WHERE u.id = p_target
  FOR UPDATE;

  IF antes IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: usuario_rh % nao existe', p_target
      USING ERRCODE = 'P0002';  -- EF maps SQLSTATE P0002 → error_code NOT_FOUND
  END IF;

  -- Branch on the action. The UPDATE deliberately fires trg_usuarios_rh_anti_lockout —
  -- a last-admin demote/deactivate RAISEs P0001 here and aborts the whole tx.
  IF p_action = 'mudar_papel' THEN
    UPDATE public.usuarios_rh
      SET role = p_novo_papel, updated_by = p_actor
      WHERE id = p_target;
    v_sev := 'critico';
  ELSIF p_action = 'desativar' THEN
    UPDATE public.usuarios_rh
      SET ativo = false, updated_by = p_actor
      WHERE id = p_target;
    v_sev := 'critico';
  ELSIF p_action = 'ativar' THEN
    UPDATE public.usuarios_rh
      SET ativo = true, updated_by = p_actor
      WHERE id = p_target;
    v_sev := 'aviso';
  ELSE
    RAISE EXCEPTION 'VALIDATION: acao % invalida', p_action
      USING ERRCODE = 'P0001';
  END IF;

  -- Post-mutation snapshot.
  SELECT to_jsonb(u) INTO depois
  FROM public.usuarios_rh u
  WHERE u.id = p_target;

  -- Atomic audit row (same transaction as the mutation above). categoria 'usuario'.
  PERFORM public.log_auditoria(
    p_usuario_id   := p_actor,
    p_usuario_tipo := 'admin',
    p_acao         := p_action,
    p_categoria    := 'usuario',
    p_descricao    := format('Acao %s sobre usuario RH %s', p_action, p_target),
    p_severidade   := v_sev,
    p_recurso_tipo := 'usuarios_rh',
    p_recurso_id   := p_target,
    p_dados_antes  := antes,
    p_dados_depois := depois,
    p_sucesso      := true
  );
END;
$$;

COMMENT ON FUNCTION public.gerir_usuario_rh_mutacao(uuid, uuid, text, text) IS
  'Phase 28 / USR-06: atomic DB-only mutate+audit for usuarios_rh (mudar_papel/desativar/ativar). '
  'SECURITY DEFINER SET search_path=public. Reads dados_antes FOR UPDATE (NOT_FOUND → P0002), '
  'mutates, then PERFORM log_auditoria(categoria=usuario) in the SAME transaction — the row change '
  'and its audit row commit or roll back together. The UPDATE fires trg_usuarios_rh_anti_lockout, so '
  'a last-admin demote/deactivate RAISEs P0001 (→ LAST_ADMIN) and aborts the whole tx. severidade '
  'critico for role-change/deactivate, aviso for reactivate. Only the service_role EF (28-06) may '
  'invoke (EXECUTE REVOKEd from public/authenticated/anon); the EF authorizes administrador-only first.';

-- -----------------------------------------------------------------------------
-- (2) criar_usuario_rh_com_audit — INSERT the usuarios_rh row AND write the audit row
--     in one transaction; returns the new usuarios_rh id.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_usuario_rh_com_audit(
  p_actor   uuid,
  p_user_id uuid,
  p_email   text,
  p_nome    text,
  p_cargo   text,
  p_papel   text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  depois   jsonb;
BEGIN
  -- INSERT the RH profile row (fires trigger_criar_preferencias_padrao AFTER INSERT — runs
  -- in this DEFINER/owner context, so the preferencias insert succeeds). nome_completo/cargo
  -- are NOT NULL on usuarios_rh (Pitfall 8) → the signature accepts them. No password column
  -- exists (GoTrue owns credentials).
  INSERT INTO public.usuarios_rh (
    user_id, email, nome_completo, cargo, role, primeiro_acesso, ativo, created_by
  )
  VALUES (
    p_user_id, p_email, p_nome, p_cargo, p_papel, true, true, p_actor
  )
  RETURNING id INTO v_new_id;

  SELECT to_jsonb(u) INTO depois
  FROM public.usuarios_rh u
  WHERE u.id = v_new_id;

  -- Atomic audit row (same transaction as the INSERT above). No dados_antes (row is new);
  -- dados_depois never contains a credential.
  PERFORM public.log_auditoria(
    p_usuario_id   := p_actor,
    p_usuario_tipo := 'admin',
    p_acao         := 'criar',
    p_categoria    := 'usuario',
    p_descricao    := format('Criou usuario RH %s (%s)', p_nome, p_email),
    p_severidade   := 'aviso',
    p_recurso_tipo := 'usuarios_rh',
    p_recurso_id   := v_new_id,
    p_dados_depois := depois,
    p_sucesso      := true
  );

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.criar_usuario_rh_com_audit(uuid, uuid, text, text, text, text) IS
  'Phase 28 / USR-02 + USR-06: atomic create+audit for usuarios_rh. SECURITY DEFINER SET '
  'search_path=public. INSERTs the RH row (primeiro_acesso=true, ativo=true, created_by=p_actor; '
  'fires trigger_criar_preferencias_padrao AFTER INSERT in owner context) then PERFORM '
  'log_auditoria(acao=criar, categoria=usuario, severidade=aviso) in the SAME transaction and '
  'returns the new id. The EF (28-06) first createUser()s the GoTrue identity and passes p_user_id; '
  'on RPC failure it compensates with deleteUser (no orphan). dados_depois never contains a password '
  '(GoTrue owns credentials). Only the service_role EF may invoke (EXECUTE REVOKEd from '
  'public/authenticated/anon); the EF authorizes administrador-only first.';

-- Harden both DEFINER RPCs (Shared Pattern C): only the service_role EF calls them. Removing
-- EXECUTE from public/authenticated/anon closes any non-service invoke/escalation path.
REVOKE EXECUTE ON FUNCTION public.gerir_usuario_rh_mutacao(uuid, uuid, text, text)
  FROM public, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.criar_usuario_rh_com_audit(uuid, uuid, text, text, text, text)
  FROM public, authenticated, anon;
