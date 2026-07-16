-- =============================================================================
-- Phase 33 / Plan 33-02 — SEG-03 + AGEND-01 agendamentos_entrevista behavioral smoke
-- =============================================================================
-- The LOAD-BEARING acceptance gate for Phase 33 (above any structural pg_policies/grep —
-- P24/P32 precedent). Run via Supabase MCP `execute_sql` AFTER 33-03 applies the migration.
-- GREEN gate = all EIGHT `PASS (a..h)` NOTICEs present (Pitfall 2: "no EXCEPTION" is
-- insufficient — an all-SKIP run masks a fixture failure; COUNT the PASS notices).
--
-- The 8 assertions:
--   (b) AGEND-01 owner WRITE+READ: recruiter B (owns vagaB) INSERTs an agendamento for its
--       candidatura (agendado_por set) and reads it back → 1.
--   (a) SEG-03 cross-recruiter READ deny: recruiter A (owns only empty vagaA) counts
--       agendamentos on vagaB's candidatura → 0 (WR-04 join-through USING).
--   (c) SEG-03 spoofed-vaga_id INSERT deny: recruiter A INSERTs candidatura_id=vagaB's +
--       vaga_id=own vagaA → DENIED (42501). Belt-and-suspenders — denied by BOTH the
--       join-through WITH CHECK (keys on candidatura_id → real vaga) AND the 33-01
--       normalize-vaga_id BEFORE trigger. NOT a sole discriminator of predicate choice
--       (the AUTHORITATIVE guard is the static grep in 33-02 + review). See plan-check W1.
--   (d) admin bypass: administrador reads any agendamento → rows returned.
--   (e) SEG-03 candidate DIRECT base-table deny: owning candidate SELECTs the base table →
--       0 rows (NO candidate SELECT policy → observacoes_rh + every column unreachable).
--   (f) SEG-03 candidate RPC allow + allowlist: owning candidate calls
--       public.get_meu_agendamento(own) → 1 row. observacoes_rh/entrevistador/agendado_por/
--       updated_by/vaga_id are absent from the result signature by construction (verified
--       structurally by the 33-02 migration grep; the function type cannot return them).
--   (g) SEG-03 cross-candidate RPC deny: a DIFFERENT candidate calls
--       get_meu_agendamento(other's candidatura) → 0 rows (ownership join inside DEFINER).
--   (h) SEG-03 candidate write deny: owning candidate INSERT → 42501; UPDATE/DELETE → 0 rows.
--
-- FIXTURE (disposable, fixed-UUID namespace 33010033-*, ROLLBACK-free — real rows NEVER deleted):
--   · a REAL candidato (discovered by user_id) = owning candidate on candidatura d01.
--   · a SECOND real candidato user_id for (g); falls back to recruiter A's user_id (a real
--     non-owning user) if only one candidato exists — either way (g) proves a non-owner gets 0.
--   · TWO DISTINCT REAL usuarios_rh users owning ZERO vagas → recruiter A / recruiter B.
--     ⚠ vagas.created_by HAS a FK (vagas_created_by_fkey) — synthetic UUIDs violate it (P32 Pitfall 4).
--   · a 3rd real usuarios_rh → impersonated administrador (sub only).
--   · vagaA (created_by=A, empty) · vagaB (created_by=B) · one candidatura d01 on vagaB.
--   · the agendamento is created live by recruiter B in assertion (b), not pre-seeded.
--   Impersonation: `set_config('request.jwt.claims', jsonb …, false)` + `SET ROLE authenticated`.
-- =============================================================================

-- Fixed disposable UUIDs (33010033-* → setup + cleanup idempotent).
--   vagaA = ...0a01 · vagaB = ...0b01 · candidatura = ...0d01 · agendamento(b) = ...0e01 · spoof(c) = ...0e02

RESET ROLE;
DO $$
DECLARE
  v_cand       uuid;   -- candidatos.id (owning candidate)
  v_cand_user  uuid;   -- candidatos.user_id (owning candidate impersonation sub)
  v_cand2_user uuid;   -- a different real user for assertion (g)
  v_recA       uuid;   -- real 0-vaga usuarios_rh → owns empty vagaA
  v_recB       uuid;   -- real 0-vaga usuarios_rh → owns vagaB
  v_admin      uuid;   -- real usuarios_rh (impersonated administrador)
BEGIN
  DELETE FROM public.agendamentos_entrevista WHERE id IN (
    '33010033-0000-4000-8000-000000000e01', '33010033-0000-4000-8000-000000000e02');
  DELETE FROM public.candidaturas WHERE id = '33010033-0000-4000-8000-000000000d01';
  DELETE FROM public.vagas WHERE id IN (
    '33010033-0000-4000-8000-000000000a01', '33010033-0000-4000-8000-000000000b01');

  SELECT id, user_id INTO v_cand, v_cand_user
    FROM public.candidatos WHERE user_id IS NOT NULL ORDER BY id LIMIT 1;
  SELECT user_id INTO v_cand2_user
    FROM public.candidatos WHERE user_id IS NOT NULL AND user_id <> v_cand_user ORDER BY user_id LIMIT 1;
  SELECT user_id INTO v_recA FROM public.usuarios_rh u
    WHERE user_id IS NOT NULL AND deleted_at IS NULL AND ativo
      AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id)
    ORDER BY user_id LIMIT 1;
  SELECT user_id INTO v_recB FROM public.usuarios_rh u
    WHERE user_id IS NOT NULL AND deleted_at IS NULL AND ativo AND user_id <> v_recA
      AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id)
    ORDER BY user_id LIMIT 1;
  SELECT user_id INTO v_admin FROM public.usuarios_rh u
    WHERE user_id IS NOT NULL AND deleted_at IS NULL AND user_id NOT IN (v_recA, v_recB)
    ORDER BY user_id LIMIT 1;

  IF v_cand IS NULL OR v_cand_user IS NULL OR v_recA IS NULL OR v_recB IS NULL OR v_admin IS NULL THEN
    PERFORM set_config('smoke.ready', 'n', false);
    RAISE NOTICE 'SEG-33 SKIP: need 1 candidato(user_id) + 2 distinct 0-vaga usuarios_rh + 1 more usuarios_rh (cand=% recA=% recB=% admin=%)', v_cand, v_recA, v_recB, v_admin;
    RETURN;
  END IF;
  IF v_cand2_user IS NULL THEN v_cand2_user := v_recA; END IF;  -- fallback: any real non-owning user

  INSERT INTO public.vagas (id, titulo, slug, status, created_by) VALUES
    ('33010033-0000-4000-8000-000000000a01', '[SMOKE 33] Vaga A', 'smoke-33-vaga-a', 'ativa'::public.status_vaga, v_recA),
    ('33010033-0000-4000-8000-000000000b01', '[SMOKE 33] Vaga B', 'smoke-33-vaga-b', 'ativa'::public.status_vaga, v_recB);
  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual, data_candidatura, data_formulario_enviado)
  VALUES ('33010033-0000-4000-8000-000000000d01', v_cand, '33010033-0000-4000-8000-000000000b01',
     'aguardando_resposta'::public.status_candidatura, 'entrevista_online'::public.etapa_processo, now(), now());

  PERFORM set_config('smoke.recruiterA', v_recA::text, false);
  PERFORM set_config('smoke.recruiterB', v_recB::text, false);
  PERFORM set_config('smoke.admin',      v_admin::text, false);
  PERFORM set_config('smoke.candUser',   v_cand_user::text, false);
  PERFORM set_config('smoke.cand2User',  v_cand2_user::text, false);
  PERFORM set_config('smoke.cand',       '33010033-0000-4000-8000-000000000d01', false);
  PERFORM set_config('smoke.ready',      'y', false);
  RAISE NOTICE 'SEG-33 fixture built (candidato % · recA % · recB % · candidatura d01 on vagaB)', v_cand, v_recA, v_recB;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke.ready', 'n', false);
  RAISE NOTICE 'SEG-33 SKIP: fixture could not be built (%: %)', SQLSTATE, SQLERRM;
END $$;

-- (b) AGEND-01 owner WRITE+READ — recruiter B INSERTs an agendamento for its candidatura, reads it back.
SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-33 SKIP (b)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterB'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  INSERT INTO public.agendamentos_entrevista
    (id, candidatura_id, vaga_id, tipo, data_hora, observacoes_rh, entrevistador, agendado_por)
  VALUES ('33010033-0000-4000-8000-000000000e01', current_setting('smoke.cand')::uuid,
     '33010033-0000-4000-8000-000000000b01', 'online'::public.tipo_entrevista_avaliacao,
     now() + interval '2 days', '[SMOKE 33] internal RH note — must never reach candidate',
     'Dra. Smoke', current_setting('smoke.recruiterB')::uuid);
  SELECT count(*) INTO v_count FROM public.agendamentos_entrevista WHERE id = '33010033-0000-4000-8000-000000000e01';
  IF v_count <> 1 THEN RAISE EXCEPTION 'SEG-33 FAIL (b): owner read % agendamento row(s) back (expected 1)', v_count; END IF;
  RAISE NOTICE 'PASS (b): recruiter B (owner) inserted + read back its agendamento (agendado_por set)';
END $$;

-- (a) SEG-03 cross-recruiter READ deny — recruiter A (non-owner) sees 0 of vagaB's agendamentos.
SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-33 SKIP (a)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO v_count FROM public.agendamentos_entrevista WHERE candidatura_id = current_setting('smoke.cand')::uuid;
  IF v_count <> 0 THEN RAISE EXCEPTION 'SEG-33 FAIL (a): recruiter A read % vaga-B agendamento row(s) — WR-04 leak', v_count; END IF;
  RAISE NOTICE 'PASS (a): recruiter A reads 0 vaga-B agendamentos (rh_gerencia_agendamento WR-04 USING)';
END $$;

-- (c) SEG-03 spoofed-vaga_id INSERT deny — recruiter A INSERTs candidatura d01 + vaga_id=own vagaA → 42501.
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-33 SKIP (c)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  BEGIN
    INSERT INTO public.agendamentos_entrevista
      (id, candidatura_id, vaga_id, tipo, data_hora, agendado_por)
    VALUES ('33010033-0000-4000-8000-000000000e02', current_setting('smoke.cand')::uuid,
       '33010033-0000-4000-8000-000000000a01', 'online'::public.tipo_entrevista_avaliacao,
       now() + interval '1 day', current_setting('smoke.recruiterA')::uuid);
    RAISE EXCEPTION 'SEG-33 FAIL (c): recruiter A inserted a cross-vaga agendamento (spoofed vaga_id) — WITH CHECK leak';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS (c): recruiter A spoofed-vaga_id INSERT denied (42501 WITH CHECK)';
  END;
END $$;

-- (d) admin bypass — administrador reads the agendamento.
SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-33 SKIP (d)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.admin'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);
  SELECT count(*) INTO v_count FROM public.agendamentos_entrevista WHERE candidatura_id = current_setting('smoke.cand')::uuid;
  IF v_count < 1 THEN RAISE EXCEPTION 'SEG-33 FAIL (d): administrador read % agendamento rows (expected >= 1)', v_count; END IF;
  RAISE NOTICE 'PASS (d): administrador bypass reads the agendamento';
END $$;

-- (e) SEG-03 candidate DIRECT base-table deny — owning candidate SELECTs the base table → 0 rows.
SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-33 SKIP (e)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.candUser'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  SELECT count(*) INTO v_count FROM public.agendamentos_entrevista WHERE candidatura_id = current_setting('smoke.cand')::uuid;
  IF v_count <> 0 THEN RAISE EXCEPTION 'SEG-33 FAIL (e): owning candidate direct-read % base-table row(s) — observacoes_rh reachable!', v_count; END IF;
  RAISE NOTICE 'PASS (e): owning candidate reads 0 base-table rows (no candidate SELECT policy; observacoes_rh unreachable)';
END $$;

-- (f) SEG-03 candidate RPC allow + allowlist — owning candidate calls get_meu_agendamento(own) → 1 row.
SET ROLE authenticated;
DO $$
DECLARE v_count integer; v_tipo public.tipo_entrevista_avaliacao;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-33 SKIP (f)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.candUser'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  SELECT count(*), max(tipo) INTO v_count, v_tipo FROM public.get_meu_agendamento(current_setting('smoke.cand')::uuid);
  IF v_count <> 1 THEN RAISE EXCEPTION 'SEG-33 FAIL (f): owning candidate got % RPC row(s) (expected 1)', v_count; END IF;
  IF v_tipo IS DISTINCT FROM 'online'::public.tipo_entrevista_avaliacao THEN RAISE EXCEPTION 'SEG-33 FAIL (f): RPC returned unexpected tipo %', v_tipo; END IF;
  RAISE NOTICE 'PASS (f): owning candidate reads 1 row via get_meu_agendamento (allowlist excludes observacoes_rh by construction)';
END $$;

-- (g) SEG-03 cross-candidate RPC deny — a DIFFERENT user calls get_meu_agendamento(d01) → 0 rows.
SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-33 SKIP (g)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.cand2User'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  SELECT count(*) INTO v_count FROM public.get_meu_agendamento(current_setting('smoke.cand')::uuid);
  IF v_count <> 0 THEN RAISE EXCEPTION 'SEG-33 FAIL (g): non-owning user got % RPC row(s) (expected 0) — ownership join defeated', v_count; END IF;
  RAISE NOTICE 'PASS (g): non-owning user reads 0 rows via get_meu_agendamento (DEFINER ownership join)';
END $$;

-- (h) SEG-03 candidate write deny — owning candidate INSERT → 42501; UPDATE/DELETE → 0 rows.
SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-33 SKIP (h)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.candUser'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  BEGIN
    INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora)
    VALUES (current_setting('smoke.cand')::uuid, '33010033-0000-4000-8000-000000000b01',
       'online'::public.tipo_entrevista_avaliacao, now());
    RAISE EXCEPTION 'SEG-33 FAIL (h): candidate INSERTed an agendamento (no candidate write policy should exist)';
  EXCEPTION WHEN insufficient_privilege THEN NULL;  -- expected
  END;
  UPDATE public.agendamentos_entrevista SET entrevistador = 'hacked' WHERE id = '33010033-0000-4000-8000-000000000e01';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN RAISE EXCEPTION 'SEG-33 FAIL (h): candidate UPDATE affected % row(s) (expected 0)', v_count; END IF;
  DELETE FROM public.agendamentos_entrevista WHERE id = '33010033-0000-4000-8000-000000000e01';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN RAISE EXCEPTION 'SEG-33 FAIL (h): candidate DELETE affected % row(s) (expected 0)', v_count; END IF;
  RAISE NOTICE 'PASS (h): candidate INSERT denied (42501) + UPDATE/DELETE affect 0 rows (no candidate write policy)';
END $$;

-- CLEANUP — ROLLBACK-free. Deletes ONLY the disposable 33010033-* rows.
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
DELETE FROM public.agendamentos_entrevista WHERE id IN (
  '33010033-0000-4000-8000-000000000e01', '33010033-0000-4000-8000-000000000e02');
DELETE FROM public.candidaturas WHERE id = '33010033-0000-4000-8000-000000000d01';
DELETE FROM public.vagas WHERE id IN (
  '33010033-0000-4000-8000-000000000a01', '33010033-0000-4000-8000-000000000b01');
SELECT set_config('smoke.ready', '', false);
