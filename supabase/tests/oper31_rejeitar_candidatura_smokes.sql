-- =============================================================================
-- Phase 31 / Plan 31-01 — rejeitar_candidatura behavioral smoke (JWT-impersonated)
-- =============================================================================
-- Proves, AFTER 20260714100001_rejeitar_candidatura_rpc.sql applies, every
-- server-authoritative invariant of the funnel reject (OPER-01/02/03/04):
--
--   (a) OPER-02   — an AUTHORIZED rh (Phase 50: an ACTIVE usuarios_rh row, NOT the vaga
--                   author) calling with a <50 justificativa is RAISEd (check_violation) —
--                   the ≥50 gate is server authority, not the client counter.
--   (e) OPER-02 / Phase 50 (D-01, D-02) — PAIR:
--                   ⊖ the STALE TOKEN (claim rh + an INACTIVE recrutador row, read at run
--                     time) and a row-less synthetic rh sub are RAISEd insufficient_privilege
--                     (42501) — the live helper public.is_active_rh_user();
--                   ⊕ a DIFFERENT ACTIVE rh (owns no vaga, read at run time from usuarios_rh)
--                     rejects the author's candidatura SUCCESSFULLY — that reject is the one
--                     (b/d) audits.
--                   Until Phase 49 (e) required the non-owner to get 42501 (WR-04 vaga-owner
--                   guard). D-01 (operator, 2026-10-04/05) removed vaga ownership as an
--                   authorization: an active recrutador acts on every vaga.
--   (b/d) OPER-01/02 — the valid reject of (e ⊕) writes EXACTLY ONE new
--                   historico_candidatura row (d), whose newest row has
--                   auto_rejeitado IS FALSE (b, RNF-07a — human write, no score path),
--                   and flips candidaturas.status='rejeitado'.
--   (c) OPER-03   — the REGRESSION guard lives in the reused avancar_etapa trigger, not
--                   the RPC: a BARE UPDATE to an earlier etapa with an EMPTY justificativa
--                   is RAISEd by the trigger ('Regressão de etapa exige justificativa …').
--   (f) WR-02     — the role guard runs BEFORE the lookup (no existence oracle).
--
-- MECHANISM (self-contained disposable fixture — NO PROD candidatura mutated):
--   A privileged (RLS-bypassing, RESET ROLE) setup DISCOVERS, all from usuarios_rh at run time
--   (Phase 50 form rule: no rh impersonation takes its sub from vagas.created_by):
--     · a_ativo — an ACTIVE, non-deleted usuarios_rh row that authors no vaga (recrutador
--                 first) — the actor of (a) and (e ⊕);
--     · a_velho — role = 'recrutador' AND NOT ativo — the stale token of (e ⊖);
--     · author  — any other usuarios_rh user (≠ a_ativo) — only the created_by of the
--                 disposable vaga, never impersonated;
--   + a real candidato, then builds a DISPOSABLE vaga (created_by = author) + candidatura
--   seeded in 'triagem'. Fixed 31010031-* UUIDs → setup + cleanup are idempotent.
--   Phase 50: a fixture that cannot be built (missing actor or population) RAISEs
--   'OPER-31 FAIL (fixture)' — never a SKIP-with-NOTICE: NOTICE does not come back through the
--   Management API, and an all-SKIP run would read green.
--   Impersonation: SET ROLE authenticated + set_config('request.jwt.claims', …). The privileged
--   before/after counts run under RESET ROLE so RLS never masks the historico rows under
--   assertion.
--
-- CLEANUP is ROLLBACK-free: resets claims + role, deletes the disposable historico rows,
--   candidatura, and vaga. The discovered rh users + candidato are REAL — NEVER deleted.
--
-- RUN (Phase 50): ONLY through the aborting envelope — `node scripts/p50_ensaio.cjs
--      supabase/tests/oper31_rejeitar_candidatura_smokes.sql` (before the 50-10 apply it
--      prefixes 20261005000002..4; after it, `--sem-migracoes`). Red without
--      20261005000004 (the active non-author gets 42501 in (e ⊕)), green with it.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery + disposable fixture (RLS bypass)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_owner uuid; v_ativo uuid; v_velho uuid; v_candidato uuid;
BEGIN
  -- Idempotent: clear any prior run's disposable rows (historico first — FK to candidatura).
  DELETE FROM public.historico_candidatura WHERE candidatura_id = '31010031-0000-0000-0000-0000000000d1';
  DELETE FROM public.candidaturas          WHERE id            = '31010031-0000-0000-0000-0000000000d1';
  DELETE FROM public.vagas                 WHERE id            = '31010031-0000-0000-0000-0000000000b1';

  -- Phase 50 — a_ativo: an ACTIVE usuarios_rh row that authors no vaga (recrutador first).
  -- It is the AUTHORIZED rh of (a) and the non-author who rejects in (e ⊕).
  SELECT u.user_id INTO v_ativo
    FROM public.usuarios_rh u
   WHERE u.user_id IS NOT NULL AND u.ativo AND u.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id)
   ORDER BY (u.role = 'recrutador') DESC, u.created_at, u.user_id
   LIMIT 1;

  -- Phase 50 — a_velho: the stale token (claim rh + an INACTIVE recrutador row).
  SELECT u.user_id INTO v_velho
    FROM public.usuarios_rh u
   WHERE u.user_id IS NOT NULL AND u.role = 'recrutador' AND NOT u.ativo
   ORDER BY u.created_at, u.user_id
   LIMIT 1;

  -- The disposable vaga's author: any other usuarios_rh user. It is ONLY the created_by of the
  -- disposable vaga (FK) — never impersonated (Phase 50 form rule).
  SELECT user_id INTO v_owner
    FROM public.usuarios_rh
   WHERE user_id IS NOT NULL AND user_id IS DISTINCT FROM v_ativo
   ORDER BY created_at
   LIMIT 1;

  -- Discover any real candidato for the candidatura FK (identity is irrelevant — the RPC
  -- authorizes by role + the live helper, never by the candidate).
  SELECT id INTO v_candidato
    FROM public.candidatos
   LIMIT 1;

  IF v_owner IS NULL OR v_ativo IS NULL OR v_velho IS NULL OR v_candidato IS NULL THEN
    RAISE EXCEPTION 'OPER-31 FAIL (fixture): need an active 0-vaga usuarios_rh + an inactive recrutador + another usuarios_rh + a candidato (ativo=% velho=% author=% candidato=%) — a missing actor fails, never SKIPs',
      v_ativo IS NOT NULL, v_velho IS NOT NULL, v_owner IS NOT NULL, v_candidato IS NOT NULL;
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

  PERFORM set_config('smoke.owner', v_owner::text, false);   -- author only (FK), never impersonated
  PERFORM set_config('smoke.ativo', v_ativo::text, false);   -- ACTIVE rh, authors no vaga
  PERFORM set_config('smoke.velho', v_velho::text, false);   -- INACTIVE recrutador (stale token)
  PERFORM set_config('smoke.other', '00000000-0000-0000-0000-0000000000fe', false);  -- synthetic rh, no usuarios_rh row
  PERFORM set_config('smoke.cand',  '31010031-0000-0000-0000-0000000000d1', false);
  PERFORM set_config('smoke.ready', 'y', false);
  RAISE NOTICE 'OPER-31 fixture built (author % · ativo % · velho % · vaga b1 · candidatura d1 @ triagem)', v_owner, v_ativo, v_velho;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) OPER-02 — AUTHORIZED rh (ACTIVE, non-author) + <50 justificativa → check_violation.
--     The ≥50 gate runs before the authorization line, so a 42501 here means the role guard
--     itself refused an active rh — reported as FAIL (a), not as a bare error.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE EXCEPTION 'OPER-31 FAIL (a): fixture not built'; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.ativo'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  BEGIN
    PERFORM public.rejeitar_candidatura(current_setting('smoke.cand')::uuid, 'perfil_desalinhado', 'curto');
    RAISE EXCEPTION 'OPER-31 FAIL (a): reject with a <50 justificativa was accepted';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS (a): <50 justificativa RAISEd (check_violation) — server is the authority, not the counter';
    WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'OPER-31 FAIL (a): an ACTIVE rh got 42501 before the <50 gate (%)', SQLERRM;
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (e ⊖) Phase 50 / D-02 — the STALE TOKEN (claim rh + INACTIVE recrutador) and the row-less
--     synthetic rh sub → insufficient_privilege (42501). Justificativa is >=50 so the ≥50 gate
--     passes and the live-helper line is what fires. Runs while the candidatura is still in
--     'triagem', so a 42501 cannot be confused with the terminal guard.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
DECLARE v_sub text; v_rot text;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE EXCEPTION 'OPER-31 FAIL (e): fixture not built'; END IF;
  FOREACH v_rot IN ARRAY ARRAY['token velho (recrutador INATIVO)', 'rh sem linha em usuarios_rh'] LOOP
    v_sub := CASE WHEN v_rot LIKE 'token velho%' THEN current_setting('smoke.velho') ELSE current_setting('smoke.other') END;
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
      'sub', v_sub, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
    BEGIN
      PERFORM public.rejeitar_candidatura(current_setting('smoke.cand')::uuid, 'outro', repeat('x', 60));
      RAISE EXCEPTION 'OPER-31 FAIL (e): % rejected a candidatura — the live helper (D-02) did not refuse it', v_rot;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS (e ⊖): % → 42501', v_rot;
      WHEN raise_exception THEN
        RAISE;  -- the FAIL above
      WHEN OTHERS THEN
        -- any other refusal (e.g. 23503 from the audit trigger's FK on a row-less sub) means the
        -- authorization line LET IT THROUGH and something later stopped it — not the helper.
        RAISE EXCEPTION 'OPER-31 FAIL (e): % passed the authorization and was stopped later (% %) — expected 42501 from the live helper (D-02)', v_rot, SQLSTATE, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (f) WR-02 (code-review hardening) — a candidato (role NOT rh/administrador) calling with a
--     NON-EXISTENT candidatura id must get insufficient_privilege, NEVER no_data_found. Proves
--     the role-membership guard runs BEFORE the candidatura lookup → no existence oracle over
--     candidaturas.id.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE EXCEPTION 'OPER-31 FAIL (f): fixture not built'; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000ca', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    PERFORM public.rejeitar_candidatura('99999999-9999-9999-9999-999999999999'::uuid, 'outro', repeat('x', 60));
    RAISE EXCEPTION 'OPER-31 FAIL (f): a candidato reject on a non-existent candidatura was accepted';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS (f): candidato + non-existent id → insufficient_privilege (no existence oracle)';
    WHEN no_data_found THEN
      RAISE EXCEPTION 'OPER-31 FAIL (f): existence oracle LEAK — got no_data_found (role guard ran AFTER the lookup)';
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
    RAISE EXCEPTION 'OPER-31 FAIL (c): fixture not built'; END IF;
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
-- (e ⊕) + (b/d) OPER-01/02 — Phase 50 / D-01: a DIFFERENT ACTIVE rh (authors no vaga) rejects
--       the author's candidatura SUCCESSFULLY (e ⊕); that valid reject writes exactly ONE new
--       historico row, auto_rejeitado=false (RNF-07a), status flipped to 'rejeitado' (b/d).
--       Counts run privileged (RESET ROLE); the RPC call runs impersonated as a_ativo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE EXCEPTION 'OPER-31 FAIL (b/d): fixture not built'; END IF;
  PERFORM set_config('smoke.before',
    (SELECT count(*)::text FROM public.historico_candidatura
      WHERE candidatura_id = current_setting('smoke.cand')::uuid), false);
END $$;

SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE EXCEPTION 'OPER-31 FAIL (e): fixture not built'; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.ativo'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  BEGIN
    PERFORM public.rejeitar_candidatura(current_setting('smoke.cand')::uuid, 'reprovado_avaliacao', repeat('x', 60));
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'OPER-31 FAIL (e): an ACTIVE rh that authors no vaga could NOT reject the author''s candidatura (% %) — D-01 does not hold', SQLSTATE, SQLERRM;
  END;
  RAISE NOTICE 'PASS (e ⊕): ACTIVE non-author rh rejected the candidatura';
END $$;

RESET ROLE;
DO $$
DECLARE v_cand uuid; v_before int; v_after int; v_auto boolean; v_status text;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE EXCEPTION 'OPER-31 FAIL (b/d): fixture not built'; END IF;
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
