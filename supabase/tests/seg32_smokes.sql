-- =============================================================================
-- Phase 32 / Plan 32-01 — SEG-01/SEG-02 vaga-scoped read-primitive behavioral smoke
-- =============================================================================
-- The LOAD-BEARING acceptance gate for Phase 32 (above any structural pg_policies/grep —
-- P24 precedent: a REVOKE no-op and an OR-defeat passed structural checks while the real
-- leak remained; only a JWT-impersonated read caught them). Proves, AFTER the Phase 32
-- migrations apply (Migration A drops the `curriculos` RH role-only branch; Migration B
-- lands `funil_kpis` DEFINER + `rh_le_historico` WR-04) + the EF deploys, that:
--
--   (a) STORAGE-POLICY PROOF (SEG-01 #1 — "verificado por smoke comportamental, não por
--       inspeção de pg_policies"): a DIRECT impersonated read of the candidate CV row on the
--       base `storage.objects` table —
--         · recruiter A (rh JWT, does NOT own the vaga) → 0 rows  (RH role-only branch REMOVED)
--         · the OWNING candidate (candidato JWT)        → 1 row   (own-folder branch INTACT)
--       This exercises the ACTUAL bucket RLS Migration A changes. It is NOT a reconstruction
--       against candidaturas/vagas, and NOT the EF (service_role bypasses RLS). The deno test
--       is the EF-level twin; THIS is the DB-policy twin.
--   (b) recruiter A's `public.funil_kpis()` shows NO vaga-B numbers (DEFINER internal vaga-scope).
--   (c) recruiter A cannot direct-SELECT vaga-B `historico_candidatura` (rh_le_historico WR-04 deny).
--   (d) `public.funil_kpis()` is PII-free by construction — the returned jsonb carries NO
--       candidate-identity key (ator / candidato id / nome / email).
--   (e) an `administrador` sees all AND `funil_kpis(p_vaga_id => vagaB)` NARROWS to that vaga
--       (owner bypass + narrowing), while `funil_kpis(p_vaga_id => vagaA)` (empty) narrows to nothing.
--
-- A `RAISE NOTICE 'PASS (x) …'` per assertion = PASS; a `RAISE EXCEPTION` = FAIL (a real leak).
--
-- FIXTURE (disposable, fixed-UUID, ROLLBACK-free — real rows NEVER deleted):
--   · a REAL candidato (discovered by user_id) = the CV owner + candidatura candidate + the
--     positive-control impersonation. Needed because candidatos.user_id / candidaturas.candidato_id
--     FK real rows.
--   · TWO SYNTHETIC recruiters (fixed UUIDs) owning distinct vagas — vagas.created_by has NO FK
--     (Relationships: []), so synthetic owners keep assertions (b)/(c) deterministic: recruiter A
--     owns ONLY the empty vagaA, recruiter B owns ONLY vagaB (the disposable candidatura).
--   · vagaA (created_by=A, empty) · vagaB (created_by=B) · one candidatura on vagaB with a CV path.
--   · 2–3 historico_candidatura rows (ator NULL — FKs auth.users; only the timing feeds the median).
--   · a `storage.objects` row: bucket_id='curriculos', name = {cand_user}/{uuid}.pdf = the
--     candidatura's curriculo_url, owner = the candidate user_id. THIS is what assertion (a) reads.
--
--   Direct INSERT into historico_candidatura is acceptable ONLY inside this privileged disposable
--   fixture — it is NOT product code (the M6 no-direct-INSERT invariant governs product code only).
--
-- CLEANUP is ROLLBACK-free: reset claims + role, then delete the fixed-UUID fixture ONLY —
--   storage row, then historico (no ON DELETE CASCADE), then candidatura, then vagas. The
--   discovered candidato is REAL and is NEVER deleted.
--
-- RUN: Supabase SQL Editor / MCP `execute_sql` AFTER the migrations apply + the EF deploys
--      (Phase 32-04). THIS FILE IS RED until then — funil_kpis + the tightened policies must be
--      live for the guards to fire. Do NOT apply/run it in 32-01.
-- =============================================================================

-- Fixed disposable UUIDs (the 32010032-* namespace → setup + cleanup are idempotent):
--   recruiterA = 32010032-0000-4000-8000-0000000000a1   (synthetic; owns empty vagaA)
--   recruiterB = 32010032-0000-4000-8000-0000000000b1   (synthetic; owns vagaB)
--   administrador sub = 32010032-0000-4000-8000-0000000000ad
--   vagaA = 32010032-0000-4000-8000-000000000a01 · vagaB = 32010032-0000-4000-8000-000000000b01
--   candidatura = 32010032-0000-4000-8000-000000000d01
--   storage.objects id = 32010032-0000-4000-8000-000000000f01
--   CV path uuid = 32010032-0000-4000-8000-000000000c01

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery + disposable fixture (RLS bypass)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand      uuid;   -- candidatos.id  (candidatura candidate)
  v_cand_user uuid;   -- candidatos.user_id (CV owner + own-folder impersonation sub)
  v_cv_path   text;
BEGIN
  -- Idempotent: clear any prior run's disposable rows (children FIRST — no cascade on historico).
  DELETE FROM storage.objects WHERE id = '32010032-0000-4000-8000-000000000f01';
  DELETE FROM public.historico_candidatura WHERE candidatura_id = '32010032-0000-4000-8000-000000000d01';
  DELETE FROM public.candidaturas WHERE id = '32010032-0000-4000-8000-000000000d01';
  DELETE FROM public.vagas WHERE id IN (
    '32010032-0000-4000-8000-000000000a01', '32010032-0000-4000-8000-000000000b01');

  SELECT id, user_id INTO v_cand, v_cand_user
    FROM public.candidatos
   WHERE user_id IS NOT NULL
   LIMIT 1;
  IF v_cand IS NULL OR v_cand_user IS NULL THEN
    PERFORM set_config('smoke.ready', 'n', false);
    RAISE NOTICE 'SEG-32 SKIP: no candidato with a user_id in this DB — cannot build the CV-owner fixture';
    RETURN;
  END IF;

  -- CV path is the candidate own-folder key ({auth.uid()}/{uuid}.pdf) — exactly what the
  -- own-folder Storage branch matches AND what the candidatura stores as curriculo_url.
  v_cv_path := v_cand_user::text || '/32010032-0000-4000-8000-000000000c01.pdf';

  -- vagaA owned by synthetic recruiter A (empty); vagaB owned by synthetic recruiter B.
  INSERT INTO public.vagas (id, titulo, slug, status, created_by)
  VALUES
    ('32010032-0000-4000-8000-000000000a01', '[SMOKE 32] Vaga A', 'smoke-32-vaga-a',
     'ativa'::public.status_vaga, '32010032-0000-4000-8000-0000000000a1'),
    ('32010032-0000-4000-8000-000000000b01', '[SMOKE 32] Vaga B', 'smoke-32-vaga-b',
     'ativa'::public.status_vaga, '32010032-0000-4000-8000-0000000000b1');

  -- One candidatura on vagaB, in 'avaliacao_assincrona', carrying the CV path.
  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual,
     curriculo_url, curriculo_nome_original, curriculo_tamanho_bytes, data_candidatura, data_formulario_enviado)
  VALUES
    ('32010032-0000-4000-8000-000000000d01', v_cand, '32010032-0000-4000-8000-000000000b01',
     'aguardando_resposta'::public.status_candidatura, 'avaliacao_assincrona'::public.etapa_processo,
     v_cv_path, 'smoke.pdf', 0, now(), now());

  -- 3 transitions spread over time → non-empty per-stage median (LEAD delta; last dwell NULL).
  -- ator NULL (it FKs auth.users; only criado_em timing matters for the median).
  INSERT INTO public.historico_candidatura (candidatura_id, etapa_de, etapa_para, ator, criado_em)
  VALUES
    ('32010032-0000-4000-8000-000000000d01', NULL, 'inscricao'::public.etapa_processo, NULL, now() - interval '3 days'),
    ('32010032-0000-4000-8000-000000000d01', 'inscricao'::public.etapa_processo, 'triagem'::public.etapa_processo, NULL, now() - interval '2 days'),
    ('32010032-0000-4000-8000-000000000d01', 'triagem'::public.etapa_processo, 'avaliacao_assincrona'::public.etapa_processo, NULL, now() - interval '1 day');

  -- The candidate own-folder CV object on the BASE storage table (what assertion (a) reads).
  INSERT INTO storage.objects (id, bucket_id, name, owner, owner_id)
  VALUES ('32010032-0000-4000-8000-000000000f01', 'curriculos', v_cv_path, v_cand_user, v_cand_user::text);

  PERFORM set_config('smoke.recruiterA', '32010032-0000-4000-8000-0000000000a1', false);
  PERFORM set_config('smoke.recruiterB', '32010032-0000-4000-8000-0000000000b1', false);
  PERFORM set_config('smoke.admin',      '32010032-0000-4000-8000-0000000000ad', false);
  PERFORM set_config('smoke.candUser',   v_cand_user::text, false);
  PERFORM set_config('smoke.cvpath',     v_cv_path, false);
  PERFORM set_config('smoke.vagaA',      '32010032-0000-4000-8000-000000000a01', false);
  PERFORM set_config('smoke.vagaB',      '32010032-0000-4000-8000-000000000b01', false);
  PERFORM set_config('smoke.cand',       '32010032-0000-4000-8000-000000000d01', false);
  PERFORM set_config('smoke.ready',      'y', false);
  RAISE NOTICE 'SEG-32 fixture built (candidato % · candidatura d01 on vagaB · 3 historico rows · 1 curriculos storage row)', v_cand;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke.ready', 'n', false);
  RAISE NOTICE 'SEG-32 SKIP: disposable fixture could not be built (%: %) — adjust to live schema in 32-04', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) STORAGE-POLICY PROOF — the load-bearing SEG-01 behavioral gate.
--     recruiter A (rh, non-owner) → 0 curriculos rows; owning candidate → 1 row.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-32 SKIP (a storage-policy): fixture not built'; RETURN; END IF;

  -- recruiter A rh JWT → DIRECT base-table read of the candidate CV MUST be denied (0 rows),
  -- because Migration A removed the RH role-only branch (own-folder is the only SELECT branch).
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.recruiterA'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO v_count FROM storage.objects
   WHERE bucket_id = 'curriculos' AND name = current_setting('smoke.cvpath');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SEG-32 FAIL (a): recruiter A read % curriculos storage row(s) — the RH role-only SELECT branch is STILL live', v_count;
  END IF;
  RAISE NOTICE 'PASS (a deny): recruiter A rh JWT reads 0 curriculos rows via base storage.objects (RH role-only branch removed)';

  -- POSITIVE CONTROL: the OWNING candidate MUST still read their own CV row (own-folder intact).
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.candUser'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
  SELECT count(*) INTO v_count FROM storage.objects
   WHERE bucket_id = 'curriculos' AND name = current_setting('smoke.cvpath');
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'SEG-32 FAIL (a): owning candidate read % rows (expected 1) — the own-folder SELECT branch was broken by Migration A', v_count;
  END IF;
  RAISE NOTICE 'PASS (a allow): owning candidate reads exactly 1 curriculos row via own-folder branch (candidate access intact)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b) funil_kpis vaga-scope — recruiter A (owns only the EMPTY vagaA) sees NO vaga-B numbers.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
DECLARE v_res jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-32 SKIP (b funil_kpis-scope): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.recruiterA'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);

  v_res := public.funil_kpis();
  -- recruiter A owns ONLY the empty vagaA → every aggregate must be empty (no vaga-B leak).
  IF (v_res -> 'volume_by_stage')        IS DISTINCT FROM '{}'::jsonb
     OR (v_res -> 'median_time_per_stage') IS DISTINCT FROM '{}'::jsonb
     OR (v_res -> 'conversion_stage_to_stage') IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'SEG-32 FAIL (b): recruiter A funil_kpis leaked vaga-B aggregates (expected all-empty for A''s empty vagaA): %', v_res;
  END IF;
  RAISE NOTICE 'PASS (b): recruiter A funil_kpis carries no vaga-B numbers (empty aggregates over A''s owned vagas)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) rh_le_historico WR-04 — recruiter A cannot direct-SELECT vaga-B historico (RLS deny).
--     PASS = 0 rows OR 42501; FAIL = a returned row.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
DECLARE v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-32 SKIP (c historico-deny): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.recruiterA'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  BEGIN
    SELECT count(*) INTO v_count FROM public.historico_candidatura
     WHERE candidatura_id = current_setting('smoke.cand')::uuid;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'SEG-32 FAIL (c): recruiter A direct-SELECTed % vaga-B historico row(s) — rh_le_historico is still role-only', v_count;
    END IF;
    RAISE NOTICE 'PASS (c): recruiter A reads 0 vaga-B historico_candidatura rows via base table (rh_le_historico WR-04 vaga-scoped)';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS (c): recruiter A denied vaga-B historico_candidatura (permission denied 42501)';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (d) funil_kpis PII-free — recruiter B (OWNER of vagaB) gets its numbers, and the returned
--     jsonb carries NO candidate-identity key anywhere (ator / candidato id / nome / email).
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
DECLARE
  v_res jsonb;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-32 SKIP (d funil_kpis-PII): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.recruiterB'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);

  v_res := public.funil_kpis();
  -- Owner sees own data (vagaB has one candidatura in avaliacao_assincrona) → non-empty proves scope works.
  IF (v_res -> 'volume_by_stage') = '{}'::jsonb THEN
    RAISE EXCEPTION 'SEG-32 FAIL (d): recruiter B (owner of vagaB) got EMPTY funil_kpis — vaga-scope wrongly excluded owned data: %', v_res;
  END IF;
  -- Portable PII scan: forbidden identity tokens must NOT appear as any object key in the jsonb text.
  IF v_res::text ~* '"(ator|candidato_id|candidatura_id|candidato|nome|email|cpf|user_id)"[[:space:]]*:' THEN
    RAISE EXCEPTION 'SEG-32 FAIL (d): funil_kpis output contains a candidate-identity key (PII leak): %', v_res;
  END IF;
  RAISE NOTICE 'PASS (d): recruiter B funil_kpis returns owned aggregates and carries NO candidate-identity key (PII-free by construction)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (e) administrador — sees all (bypass) AND funil_kpis(p_vaga_id => vagaB) NARROWS;
--     funil_kpis(p_vaga_id => vagaA) (empty vaga) narrows to nothing; admin reads vaga-B historico.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
DECLARE
  v_b     jsonb;
  v_a     jsonb;
  v_count integer;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEG-32 SKIP (e admin): fixture not built'; RETURN; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.admin'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);

  -- Admin bypass: narrows to vagaB even though admin does NOT own it → the disposable
  -- candidatura (etapa_atual='avaliacao_assincrona') MUST appear (exactly 1, vagaB is disposable).
  v_b := public.funil_kpis('32010032-0000-4000-8000-000000000b01'::uuid);
  IF (v_b -> 'volume_by_stage' ->> 'avaliacao_assincrona') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'SEG-32 FAIL (e): admin funil_kpis(vagaB) did not narrow to the disposable candidatura (expected volume avaliacao_assincrona=1): %', v_b;
  END IF;

  -- Narrowing to the EMPTY vagaA returns empty aggregates (proves p_vaga_id truly narrows).
  v_a := public.funil_kpis('32010032-0000-4000-8000-000000000a01'::uuid);
  IF (v_a -> 'volume_by_stage') IS DISTINCT FROM '{}'::jsonb THEN
    RAISE EXCEPTION 'SEG-32 FAIL (e): admin funil_kpis(vagaA) was non-empty for an empty vaga — p_vaga_id narrowing is broken: %', v_a;
  END IF;

  -- Admin reads vaga-B historico directly (bypass in rh_le_historico) — the belt-and-suspenders read still works for admin.
  SELECT count(*) INTO v_count FROM public.historico_candidatura
   WHERE candidatura_id = current_setting('smoke.cand')::uuid;
  IF v_count < 3 THEN
    RAISE EXCEPTION 'SEG-32 FAIL (e): administrador read % vaga-B historico rows (expected >= 3) — admin bypass broken', v_count;
  END IF;
  RAISE NOTICE 'PASS (e): administrador bypass + p_vaga_id narrowing hold (vagaB narrows to the candidatura; empty vagaA narrows to nothing; admin reads all historico)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: reset the simulated context + drop the disposable fixture ONLY.
--   Order: storage row → historico (no cascade) → candidatura → vagas. The candidato is REAL.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
DELETE FROM storage.objects WHERE id = '32010032-0000-4000-8000-000000000f01';
DELETE FROM public.historico_candidatura WHERE candidatura_id = '32010032-0000-4000-8000-000000000d01';
DELETE FROM public.candidaturas WHERE id = '32010032-0000-4000-8000-000000000d01';
DELETE FROM public.vagas WHERE id IN (
  '32010032-0000-4000-8000-000000000a01', '32010032-0000-4000-8000-000000000b01');
-- Clear the disposable session GUCs.
SELECT set_config('smoke.ready', '', false);
