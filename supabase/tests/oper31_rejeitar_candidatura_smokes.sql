-- =============================================================================
-- Phase 31 / Plan 31-01 — rejeitar_candidatura behavioral smoke (JWT-impersonated)
-- =============================================================================
-- Proves, AFTER 20260714100001_rejeitar_candidatura_rpc.sql applies, every
-- server-authoritative invariant of the funnel reject (OPER-01/02/03/04):
--
--   (a) OPER-02   — an AUTHORIZED rh (the vaga owner) calling with a <50 justificativa
--                   is RAISEd (check_violation) — the ≥50 gate is server authority, not
--                   the client counter.
--   (e) OPER-02/IDOR — a DIFFERENT rh (owns no vaga) rejecting the owner's candidatura is
--                   RAISEd insufficient_privilege (42501) — the WR-04 vaga-owner guard.
--   (b/d) OPER-01/02 — a valid reject by the owner writes EXACTLY ONE new
--                   historico_candidatura row (d), whose newest row has
--                   auto_rejeitado IS FALSE (b, RNF-07a — human write, no score path),
--                   and flips candidaturas.status='rejeitado'.
--   (c) OPER-03   — the REGRESSION guard lives in the reused avancar_etapa trigger, not
--                   the RPC: a BARE UPDATE to an earlier etapa with an EMPTY justificativa
--                   is RAISEd by the trigger ('Regressão de etapa exige justificativa …').
--
-- MECHANISM (self-contained disposable fixture — NO PROD candidatura mutated):
--   A privileged (RLS-bypassing, RESET ROLE) setup DISCOVERS a real rh user (v_owner,
--   from usuarios_rh.user_id) + a real candidato, then builds a DISPOSABLE vaga
--   (created_by = v_owner) + candidatura seeded in 'triagem'. The "second recruiter"
--   (v_other) is a synthetic sub owning no vaga — impersonated with app_metadata.role='rh'
--   it satisfies "a different rh" for the IDOR case (the RPC reads role from the JWT, not a
--   table). Fixed 31010031-* UUIDs → setup + cleanup are idempotent. If the fixture cannot
--   be built the block sets smoke.ready='n' and every assertion SKIPs-with-NOTICE (never
--   false-fails). Impersonation: SET ROLE authenticated + set_config('request.jwt.claims',
--   …sub = the discovered user…). The privileged before/after counts run under RESET ROLE
--   so RLS never masks the historico rows under assertion.
--
-- CLEANUP is ROLLBACK-free: resets claims + role, deletes the disposable historico rows,
--   candidatura, and vaga. The discovered rh user + candidato are REAL — NEVER deleted.
--
-- RUN: Supabase SQL Editor / MCP `execute_sql` AFTER the migration applies (wave 31-06).
--      THIS FILE IS RED until then — public.rejeitar_candidatura must be live to fire.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery + disposable fixture (RLS bypass)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_owner uuid; v_candidato uuid;
BEGIN
  -- Idempotent: clear any prior run's disposable rows (historico first — FK to candidatura).
  DELETE FROM public.historico_candidatura WHERE candidatura_id = '31010031-0000-0000-0000-0000000000d1';
  DELETE FROM public.candidaturas          WHERE id            = '31010031-0000-0000-0000-0000000000d1';
  DELETE FROM public.vagas                 WHERE id            = '31010031-0000-0000-0000-0000000000b1';

  -- Discover a real rh user (any usuarios_rh account) → its user_id is the vaga owner and
  -- the impersonated auth.uid() for the owner-authorized assertions.
  SELECT user_id INTO v_owner
    FROM public.usuarios_rh
   WHERE user_id IS NOT NULL
   ORDER BY created_at
   LIMIT 1;

  -- Discover any real candidato for the candidatura FK (identity is irrelevant — the RPC
  -- authorizes by vaga owner, never by the candidate).
  SELECT id INTO v_candidato
    FROM public.candidatos
   LIMIT 1;

  IF v_owner IS NULL OR v_candidato IS NULL THEN
    PERFORM set_config('smoke.ready', 'n', false);
    RAISE NOTICE 'OPER-31 SKIP: need >=1 usuarios_rh + >=1 candidato to build the fixture (owner=% candidato=%)', v_owner, v_candidato;
    RETURN;
  END IF;

  INSERT INTO public.vagas
    (id, titulo, slug, descricao_curta, sobre_cargo, requisitos_formacao, requisitos_experiencia,
     cidade, estado, tipo_contrato, status, testes_aplicaveis, created_by)
  VALUES
    ('31010031-0000-0000-0000-0000000000b1', '[SMOKE 31-01] Vaga reject RPC', 'smoke-3101-reject',
     'disposable smoke fixture', 'disposable', 'x', 'x', 'Sao Paulo', 'SP', 'CLT', 'ativa', '[]'::jsonb,
     v_owner);

  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual,
     curriculo_url, curriculo_nome_original, curriculo_tamanho_bytes, data_candidatura, data_formulario_enviado)
  VALUES
    ('31010031-0000-0000-0000-0000000000d1', v_candidato, '31010031-0000-0000-0000-0000000000b1',
     'aguardando_resposta'::public.status_candidatura, 'triagem'::public.etapa_processo,
     'smoke://cv', 'smoke.pdf', 0, now(), now());

  PERFORM set_config('smoke.owner', v_owner::text, false);
  PERFORM set_config('smoke.other', '00000000-0000-0000-0000-0000000000fe', false);  -- synthetic rh owning no vaga
  PERFORM set_config('smoke.cand',  '31010031-0000-0000-0000-0000000000d1', false);
  PERFORM set_config('smoke.ready', 'y', false);
  RAISE NOTICE 'OPER-31 fixture built (owner % · vaga b1 · candidatura d1 @ triagem)', v_owner;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke.ready', 'n', false);
  RAISE NOTICE 'OPER-31 SKIP: disposable fixture could not be built (%: %) — adjust to live schema in 31-06', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) OPER-02 — AUTHORIZED owner + <50 justificativa → check_violation (server gate).
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'OPER-31 SKIP (a <50): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.owner'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  BEGIN
    PERFORM public.rejeitar_candidatura(current_setting('smoke.cand')::uuid, 'perfil_desalinhado', 'curto');
    RAISE EXCEPTION 'OPER-31 FAIL (a): reject with a <50 justificativa was accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS (a): <50 justificativa RAISEd (check_violation) — server is the authority, not the counter';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (e) OPER-02/IDOR — a DIFFERENT rh (owns no vaga) → insufficient_privilege (42501).
--     Justificativa is >=50 so the ≥50 gate passes and the WR-04 owner guard is what fires.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'OPER-31 SKIP (e cross-recruiter): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.other'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  BEGIN
    PERFORM public.rejeitar_candidatura(current_setting('smoke.cand')::uuid, 'outro', repeat('x', 60));
    RAISE EXCEPTION 'OPER-31 FAIL (e): recruiter B rejected a candidatura of a vaga owned by A';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS (e): cross-recruiter reject denied (42501 insufficient_privilege) — WR-04 vaga-owner guard';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) OPER-03 — the REGRESSION guard is the reused avancar_etapa TRIGGER, not the RPC.
--     A BARE UPDATE (NOT the RPC) to an earlier etapa with an EMPTY justificativa must be
--     RAISEd by the trigger. Run privileged (RESET ROLE) so RLS never masks the trigger.
--     The candidatura is still non-terminal ('triagem') here (the reject in (b/d) is next).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_cand uuid; v_c_ok boolean := false; v_err text;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'OPER-31 SKIP (c regression): fixture not built'; RETURN; END IF;
  v_cand := current_setting('smoke.cand')::uuid;
  BEGIN
    UPDATE public.candidaturas
       SET etapa_atual = 'inscricao', etapa_justificativa = ''
     WHERE id = v_cand;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err ~ 'Regress' THEN v_c_ok := true; END IF;
  END;
  IF v_c_ok THEN
    RAISE NOTICE 'PASS (c): the avancar_etapa trigger blocked the empty-justificativa regression';
  ELSE
    RAISE EXCEPTION 'OPER-31 FAIL (c): empty-justificativa regression not blocked (got: %)',
      COALESCE(v_err, 'no error — the bare UPDATE was accepted');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b/d) OPER-01/02 — a valid reject by the owner: exactly ONE new historico row,
--       auto_rejeitado=false (RNF-07a), status flipped to 'rejeitado'.
--       Counts run privileged (RESET ROLE); the RPC call runs impersonated as the owner.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('smoke.before',
    (SELECT count(*)::text FROM public.historico_candidatura
      WHERE candidatura_id = current_setting('smoke.cand')::uuid), false);
END $$;

SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.owner'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  PERFORM public.rejeitar_candidatura(current_setting('smoke.cand')::uuid, 'reprovado_avaliacao', repeat('x', 60));
END $$;

RESET ROLE;
DO $$
DECLARE v_cand uuid; v_before int; v_after int; v_auto boolean; v_status text;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'OPER-31 SKIP (b/d reject): fixture not built'; RETURN; END IF;
  v_cand   := current_setting('smoke.cand')::uuid;
  v_before := current_setting('smoke.before')::int;

  SELECT count(*) INTO v_after FROM public.historico_candidatura WHERE candidatura_id = v_cand;
  IF v_after - v_before <> 1 THEN
    RAISE EXCEPTION 'OPER-31 FAIL (d): expected exactly 1 new historico_candidatura row, got %', v_after - v_before;
  END IF;

  SELECT auto_rejeitado INTO v_auto FROM public.historico_candidatura
    WHERE candidatura_id = v_cand ORDER BY criado_em DESC LIMIT 1;
  IF v_auto IS NOT FALSE THEN
    RAISE EXCEPTION 'OPER-31 FAIL (b): human reject wrote auto_rejeitado=% (RNF-07a violated)', v_auto;
  END IF;

  SELECT status::text INTO v_status FROM public.candidaturas WHERE id = v_cand;
  IF v_status IS DISTINCT FROM 'rejeitado' THEN
    RAISE EXCEPTION 'OPER-31 FAIL (b/d): candidaturas.status=% (expected rejeitado)', v_status;
  END IF;

  RAISE NOTICE 'PASS (b/d): exactly ONE audit row, auto_rejeitado=false, status=rejeitado';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: reset the simulated context + drop the disposable fixture.
--   historico first (FK), then candidatura, then vaga. The rh user + candidato are REAL
--   and are NEVER deleted.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
DELETE FROM public.historico_candidatura WHERE candidatura_id = '31010031-0000-0000-0000-0000000000d1';
DELETE FROM public.candidaturas          WHERE id            = '31010031-0000-0000-0000-0000000000d1';
DELETE FROM public.vagas                 WHERE id            = '31010031-0000-0000-0000-0000000000b1';
-- Clear the disposable session GUCs.
SELECT set_config('smoke.ready',  '', false);
SELECT set_config('smoke.before', '', false);
