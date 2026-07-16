-- =============================================================================
-- Phase 32 / Plan 32-01 — SEG-01/SEG-02 vaga-scoped read-primitive behavioral smoke
-- =============================================================================
-- The LOAD-BEARING acceptance gate for Phase 32 (above any structural pg_policies/grep —
-- P24 precedent). Proves, AFTER the Phase 32 migrations apply (Migration A drops the TWO
-- role-only `curriculos` RH read policies; Migration B lands `funil_kpis` DEFINER +
-- `rh_le_historico` WR-04) + the EF deploys, that:
--
--   (a) STORAGE-POLICY PROOF (SEG-01 #1): a DIRECT impersonated read of the candidate CV row
--       on the base `storage.objects` table — recruiter A (rh JWT, does NOT own the vaga) → 0
--       rows (BOTH role-only RH read branches removed), the OWNING candidate → 1 row (own-folder
--       branch intact). Exercises the ACTUAL bucket RLS Migration A changes (NOT a reconstruction,
--       NOT the EF which uses service_role and bypasses RLS). ⚠ 32-04 discovered a SECOND role-only
--       RH read policy (`RH lê currículos`) the plan missed — this smoke is exactly what caught it.
--   (b) recruiter A's `public.funil_kpis()` shows NO vaga-B numbers (DEFINER internal vaga-scope).
--   (c) recruiter A cannot direct-SELECT vaga-B `historico_candidatura` (rh_le_historico WR-04 deny).
--   (d) `public.funil_kpis()` (recruiter B, owner) returns owned aggregates + carries NO candidate
--       identity key (ator / candidato id / nome / email) — PII-free by construction.
--   (e) an `administrador` sees all AND `funil_kpis(p_vaga_id => vagaB)` NARROWS to that vaga.
--
-- A `RAISE NOTICE 'PASS (x) …'` per assertion = PASS; a `RAISE EXCEPTION` = FAIL (a real leak).
--
-- FIXTURE (disposable, fixed-UUID, ROLLBACK-free — real rows NEVER deleted):
--   · a REAL candidato (discovered by user_id) = the CV owner + candidatura candidate + the
--     positive-control impersonation (candidatos.user_id / candidaturas.candidato_id FK real rows).
--   · TWO DISTINCT REAL usuarios_rh users owning ZERO vagas, discovered dynamically → recruiter A/B.
--     ⚠ vagas.created_by HAS a FK (vagas_created_by_fkey) — synthetic UUIDs violate it (caught in
--     32-04). Real 0-vaga users keep the funil_kpis scope assertions deterministic (A owns only the
--     empty disposable vagaA; B owns only vagaB). `admin` = any real usuarios_rh user (sub only).
--   · vagaA (created_by=A, empty) · vagaB (created_by=B) · one candidatura on vagaB with a CV path.
--   · 3 historico_candidatura rows (ator NULL — FKs auth.users; only the timing feeds the median).
--   · a `storage.objects` row: bucket_id='curriculos', name = {cand_user}/{uuid}.pdf = the
--     candidatura's curriculo_url, owner = the candidate user_id. THIS is what assertion (a) reads.
--
--   ⚠ storage.objects has a `storage.protect_delete()` trigger (blocks direct DELETE unless the
--     session GUC `storage.allow_delete_query='true'`). This smoke sets that GUC before the
--     fixture pre-delete AND before cleanup so the disposable storage row can be removed.
--
--   Direct INSERT into historico_candidatura is acceptable ONLY inside this privileged disposable
--   fixture — it is NOT product code (the M6 no-direct-INSERT invariant governs product code only).
--
-- RUN: Supabase SQL Editor / MCP `execute_sql` AFTER the migrations apply + the EF deploys (32-04).
-- =============================================================================

-- Fixed disposable UUIDs (the 32010032-* namespace → setup + cleanup are idempotent).
--   vagaA = ...0a01 · vagaB = ...0b01 · candidatura = ...0d01 · storage id = ...0f01 · CV uuid = ...0c01

RESET ROLE;
SELECT set_config('storage.allow_delete_query', 'true', false);  -- allow disposable storage.objects delete
DO $$
DECLARE
  v_cand      uuid;   -- candidatos.id (candidatura candidate)
  v_cand_user uuid;   -- candidatos.user_id (CV owner + own-folder impersonation sub)
  v_cv_path   text;
  v_recA      uuid;   -- real usuarios_rh user owning 0 vagas → owns empty vagaA
  v_recB      uuid;   -- real usuarios_rh user owning 0 vagas → owns vagaB
  v_admin     uuid;   -- real usuarios_rh user (sub only; impersonated as administrador)
BEGIN
  DELETE FROM storage.objects WHERE id = '32010032-0000-4000-8000-000000000f01';
  DELETE FROM public.historico_candidatura WHERE candidatura_id = '32010032-0000-4000-8000-000000000d01';
  DELETE FROM public.candidaturas WHERE id = '32010032-0000-4000-8000-000000000d01';
  DELETE FROM public.vagas WHERE id IN (
    '32010032-0000-4000-8000-000000000a01', '32010032-0000-4000-8000-000000000b01');

  SELECT id, user_id INTO v_cand, v_cand_user
    FROM public.candidatos WHERE user_id IS NOT NULL LIMIT 1;
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
    RAISE NOTICE 'SEG-32 SKIP: need 1 candidato(user_id) + 2 distinct 0-vaga usuarios_rh + 1 more usuarios_rh (cand=% recA=% recB=% admin=%)', v_cand, v_recA, v_recB, v_admin;
    RETURN;
  END IF;

  v_cv_path := v_cand_user::text || '/32010032-0000-4000-8000-000000000c01.pdf';

  INSERT INTO public.vagas (id, titulo, slug, status, created_by) VALUES
    ('32010032-0000-4000-8000-000000000a01', '[SMOKE 32] Vaga A', 'smoke-32-vaga-a', 'ativa'::public.status_vaga, v_recA),
    ('32010032-0000-4000-8000-000000000b01', '[SMOKE 32] Vaga B', 'smoke-32-vaga-b', 'ativa'::public.status_vaga, v_recB);
  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual, curriculo_url, curriculo_nome_original, curriculo_tamanho_bytes, data_candidatura, data_formulario_enviado)
  VALUES ('32010032-0000-4000-8000-000000000d01', v_cand, '32010032-0000-4000-8000-000000000b01',
     'aguardando_resposta'::public.status_candidatura, 'avaliacao_assincrona'::public.etapa_processo,
     v_cv_path, 'smoke.pdf', 0, now(), now());
  INSERT INTO public.historico_candidatura (candidatura_id, etapa_de, etapa_para, ator, criado_em) VALUES
    ('32010032-0000-4000-8000-000000000d01', NULL, 'inscricao'::public.etapa_processo, NULL, now() - interval '3 days'),
    ('32010032-0000-4000-8000-000000000d01', 'inscricao'::public.etapa_processo, 'triagem'::public.etapa_processo, NULL, now() - interval '2 days'),
    ('32010032-0000-4000-8000-000000000d01', 'triagem'::public.etapa_processo, 'avaliacao_assincrona'::public.etapa_processo, NULL, now() - interval '1 day');
  INSERT INTO storage.objects (id, bucket_id, name, owner, owner_id)
  VALUES ('32010032-0000-4000-8000-000000000f01', 'curriculos', v_cv_path, v_cand_user, v_cand_user::text);

  PERFORM set_config('smoke.recruiterA', v_recA::text, false);
  PERFORM set_config('smoke.recruiterB', v_recB::text, false);
  PERFORM set_config('smoke.admin',      v_admin::text, false);
  PERFORM set_config('smoke.candUser',   v_cand_user::text, false);
  PERFORM set_config('smoke.cvpath',     v_cv_path, false);
  PERFORM set_config('smoke.cand',       '32010032-0000-4000-8000-000000000d01', false);
  PERFORM set_config('smoke.ready',      'y', false);
  RAISE NOTICE 'SEG-32 fixture built (candidato % · recA % · recB % · candidatura d01 on vagaB)', v_cand, v_recA, v_recB;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke.ready', 'n', false);
  RAISE NOTICE 'SEG-32 SKIP: fixture could not be built (%: %)', SQLSTATE, SQLERRM;
END $$;

-- (a) STORAGE-POLICY PROOF — recruiter A (rh, non-owner) → 0 rows; owning candidate → 1 row.
SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-32 SKIP (a)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'curriculos' AND name = current_setting('smoke.cvpath');
  IF v_count <> 0 THEN RAISE EXCEPTION 'SEG-32 FAIL (a): recruiter A read % curriculos row(s) — a role-only RH read branch is STILL live', v_count; END IF;
  RAISE NOTICE 'PASS (a deny): recruiter A rh JWT reads 0 curriculos rows (both role-only RH branches removed)';
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.candUser'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'curriculos' AND name = current_setting('smoke.cvpath');
  IF v_count <> 1 THEN RAISE EXCEPTION 'SEG-32 FAIL (a): owning candidate read % rows (expected 1) — own-folder branch broke', v_count; END IF;
  RAISE NOTICE 'PASS (a allow): owning candidate reads exactly 1 curriculos row (own-folder intact)';
END $$;

-- (b) funil_kpis vaga-scope — recruiter A (owns only empty vagaA) sees NO vaga-B numbers.
SET ROLE authenticated;
DO $$
DECLARE v_res jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-32 SKIP (b)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  v_res := public.funil_kpis();
  IF (v_res -> 'volume_by_stage') IS DISTINCT FROM '{}'::jsonb
     OR (v_res -> 'median_time_per_stage') IS DISTINCT FROM '{}'::jsonb
     OR (v_res -> 'conversion_stage_to_stage') IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'SEG-32 FAIL (b): recruiter A funil_kpis leaked vaga-B aggregates: %', v_res; END IF;
  RAISE NOTICE 'PASS (b): recruiter A funil_kpis carries no vaga-B numbers';
END $$;

-- (c) rh_le_historico WR-04 — recruiter A cannot direct-SELECT vaga-B historico (RLS deny).
SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-32 SKIP (c)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterA'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  BEGIN
    SELECT count(*) INTO v_count FROM public.historico_candidatura WHERE candidatura_id = current_setting('smoke.cand')::uuid;
    IF v_count <> 0 THEN RAISE EXCEPTION 'SEG-32 FAIL (c): recruiter A direct-SELECTed % vaga-B historico row(s)', v_count; END IF;
    RAISE NOTICE 'PASS (c): recruiter A reads 0 vaga-B historico rows (rh_le_historico WR-04)';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS (c): recruiter A denied vaga-B historico (42501)';
  END;
END $$;

-- (d) funil_kpis PII-free — recruiter B (owner) gets numbers; jsonb has NO candidate-identity key.
SET ROLE authenticated;
DO $$
DECLARE v_res jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-32 SKIP (d)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.recruiterB'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  v_res := public.funil_kpis();
  IF (v_res -> 'volume_by_stage') = '{}'::jsonb THEN RAISE EXCEPTION 'SEG-32 FAIL (d): owner got EMPTY funil_kpis: %', v_res; END IF;
  IF v_res::text ~* '"(ator|candidato_id|candidatura_id|candidato|nome|email|cpf|user_id)"[[:space:]]*:' THEN
    RAISE EXCEPTION 'SEG-32 FAIL (d): funil_kpis output contains a candidate-identity key (PII leak): %', v_res; END IF;
  RAISE NOTICE 'PASS (d): recruiter B funil_kpis returns owned aggregates, PII-free';
END $$;

-- (e) administrador — bypass + p_vaga_id narrows (vagaB → 1; empty vagaA → {}); admin reads historico.
SET ROLE authenticated;
DO $$
DECLARE v_b jsonb; v_a jsonb; v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN RAISE NOTICE 'SEG-32 SKIP (e)'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('smoke.admin'), 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);
  v_b := public.funil_kpis('32010032-0000-4000-8000-000000000b01'::uuid);
  IF (v_b -> 'volume_by_stage' ->> 'avaliacao_assincrona') IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'SEG-32 FAIL (e): admin funil_kpis(vagaB) did not narrow: %', v_b; END IF;
  v_a := public.funil_kpis('32010032-0000-4000-8000-000000000a01'::uuid);
  IF (v_a -> 'volume_by_stage') IS DISTINCT FROM '{}'::jsonb THEN RAISE EXCEPTION 'SEG-32 FAIL (e): admin funil_kpis(vagaA) non-empty for an empty vaga: %', v_a; END IF;
  SELECT count(*) INTO v_count FROM public.historico_candidatura WHERE candidatura_id = current_setting('smoke.cand')::uuid;
  IF v_count < 3 THEN RAISE EXCEPTION 'SEG-32 FAIL (e): administrador read % historico rows (expected >= 3)', v_count; END IF;
  RAISE NOTICE 'PASS (e): administrador bypass + p_vaga_id narrowing hold';
END $$;

-- CLEANUP — ROLLBACK-free. storage.allow_delete_query re-armed (session GUC survives, re-set for safety).
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
SELECT set_config('storage.allow_delete_query', 'true', false);
DELETE FROM storage.objects WHERE id = '32010032-0000-4000-8000-000000000f01';
DELETE FROM public.historico_candidatura WHERE candidatura_id = '32010032-0000-4000-8000-000000000d01';
DELETE FROM public.candidaturas WHERE id = '32010032-0000-4000-8000-000000000d01';
DELETE FROM public.vagas WHERE id IN (
  '32010032-0000-4000-8000-000000000a01', '32010032-0000-4000-8000-000000000b01');
SELECT set_config('smoke.ready', '', false);
