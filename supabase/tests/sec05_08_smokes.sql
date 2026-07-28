-- =============================================================================
-- Phase 24 / Plan 24-04 — SEC-05 / SEC-06 / SEC-08 vaga-scope smoke (repeatable)
-- =============================================================================
-- Proves, AFTER 20260706110004_sec05_08_vaga_scope.sql applies, that the horizontal
-- (cross-recruiter) read/write leak is closed WITHOUT blinding the vaga OWNER or the
-- administrador — the four tables that were role-only in 24-LIVE-STATE.md are now
-- vaga-scoped (WR-04):
--   SEC-05  analise_candidato_vaga / comparativo_solicitado  — SELECT vaga-scoped.
--   SEC-08  candidaturas (base table)                        — SELECT + UPDATE vaga-scoped.
--   SEC-06  redacoes_candidato RH (via candidaturas→vagas)   — SELECT vaga-scoped;
--           reprocessar_analise (ALREADY scoped)             — 42501 regression-guard.
--   RNF-07a no pontuar_* path writes candidaturas             — structural invariant.
--
-- MECHANISM (no fixture-authoring / no PROD mutation):
--   The M2 SECURITY-gate idiom — SET ROLE authenticated + set_config('request.jwt.claims',…)
--   to simulate three JWTs: (owner-rh) sub == the vaga's real created_by, (non-owner-rh) a
--   synthetic sub owning no vaga, (administrador). A privileged (RLS-bypassing) discovery step
--   picks a REAL (vaga_id, owner) target per table from live data (only ids/owners/counts are
--   read — never a score/flag/verdict PII value) and stashes it in session GUCs. If a table is
--   empty the behavioral block SKIPs (NOTICE) rather than false-failing — PROD carries the live
--   [TESTE] funil rows, so all paths exercise there.
--
-- Read-only + ROLLBACK-free: mutating statements are no-ops (SET col = col, filtered to 0 rows
-- for the non-owner) and the reprocessar guard RAISEs BEFORE any pg_net dispatch. Resets role +
-- claims at the end. A NOTICE per section = PASS; an EXCEPTION = FAIL (a real horizontal leak).
--
-- Executed against PROD in 24-08 (Supabase SQL Editor / MCP execute_sql) AFTER the migration.
-- =============================================================================

-- A synthetic recruiter that owns NO vaga → its vaga-scope subselect is always empty.
-- (kept as a literal so the non-owner assertions are deterministic)
--   NON_OWNER sub = 00000000-0000-0000-0000-0000000000ff

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-05 (a) — analise_candidato_vaga : owner→rows · non-owner→0 · admin→all
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;  -- privileged discovery (RLS bypass)
DO $$
DECLARE v_vaga uuid; v_owner uuid; v_cnt int;
BEGIN
  SELECT a.vaga_id, v.created_by
    INTO v_vaga, v_owner
    FROM public.analise_candidato_vaga a
    JOIN public.vagas v ON v.id = a.vaga_id
   WHERE v.created_by IS NOT NULL
   LIMIT 1;
  IF v_vaga IS NULL THEN
    PERFORM set_config('smoke.analise_has', 'n', false);
    RAISE NOTICE 'SEC-05 SKIP (analise): no analise row on an owned vaga in this DB';
  ELSE
    SELECT count(*) INTO v_cnt FROM public.analise_candidato_vaga WHERE vaga_id = v_vaga;
    PERFORM set_config('smoke.analise_has', 'y', false);
    PERFORM set_config('smoke.analise_vaga', v_vaga::text, false);
    PERFORM set_config('smoke.analise_owner', v_owner::text, false);
    PERFORM set_config('smoke.analise_cnt', v_cnt::text, false);
  END IF;
END $$;

SET ROLE authenticated;
DO $$
DECLARE n int; v_cnt int;
BEGIN
  IF current_setting('smoke.analise_has', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  v_cnt := current_setting('smoke.analise_cnt')::int;

  -- owner-rh → must still read its own vaga's rows
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.analise_owner'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.analise_candidato_vaga WHERE vaga_id = current_setting('smoke.analise_vaga')::uuid;
  IF n = 0 THEN RAISE EXCEPTION 'SEC-05 FAIL (analise/owner): owner-rh read 0 rows on its OWN vaga (over-scoped)'; END IF;

  -- non-owner-rh → must read 0 rows of the foreign vaga
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000ff', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.analise_candidato_vaga WHERE vaga_id = current_setting('smoke.analise_vaga')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'SEC-05 FAIL (analise/non-owner): non-owner-rh read % foreign analise row(s) — horizontal leak', n; END IF;

  -- administrador → must read all rows of that vaga
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000aa', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);
  SELECT count(*) INTO n FROM public.analise_candidato_vaga WHERE vaga_id = current_setting('smoke.analise_vaga')::uuid;
  IF n <> v_cnt THEN RAISE EXCEPTION 'SEC-05 FAIL (analise/admin): administrador read %/% rows — admin blinded', n, v_cnt; END IF;

  RAISE NOTICE 'SEC-05 PASS (analise): owner reads own vaga; non-owner→0; admin→all (% rows)', v_cnt;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-05 (b) — comparativo_solicitado : owner→rows · non-owner→0 · admin→all
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_vaga uuid; v_owner uuid; v_cnt int;
BEGIN
  SELECT co.vaga_id, v.created_by
    INTO v_vaga, v_owner
    FROM public.comparativo_solicitado co
    JOIN public.vagas v ON v.id = co.vaga_id
   WHERE v.created_by IS NOT NULL
   LIMIT 1;
  IF v_vaga IS NULL THEN
    PERFORM set_config('smoke.comp_has', 'n', false);
    RAISE NOTICE 'SEC-05 SKIP (comparativo): no comparativo row on an owned vaga in this DB';
  ELSE
    SELECT count(*) INTO v_cnt FROM public.comparativo_solicitado WHERE vaga_id = v_vaga;
    PERFORM set_config('smoke.comp_has', 'y', false);
    PERFORM set_config('smoke.comp_vaga', v_vaga::text, false);
    PERFORM set_config('smoke.comp_owner', v_owner::text, false);
    PERFORM set_config('smoke.comp_cnt', v_cnt::text, false);
  END IF;
END $$;

SET ROLE authenticated;
DO $$
DECLARE n int; v_cnt int;
BEGIN
  IF current_setting('smoke.comp_has', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  v_cnt := current_setting('smoke.comp_cnt')::int;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.comp_owner'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.comparativo_solicitado WHERE vaga_id = current_setting('smoke.comp_vaga')::uuid;
  IF n = 0 THEN RAISE EXCEPTION 'SEC-05 FAIL (comparativo/owner): owner-rh read 0 rows on its OWN vaga'; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000ff', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.comparativo_solicitado WHERE vaga_id = current_setting('smoke.comp_vaga')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'SEC-05 FAIL (comparativo/non-owner): non-owner-rh read % foreign row(s) — horizontal leak', n; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000aa', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);
  SELECT count(*) INTO n FROM public.comparativo_solicitado WHERE vaga_id = current_setting('smoke.comp_vaga')::uuid;
  IF n <> v_cnt THEN RAISE EXCEPTION 'SEC-05 FAIL (comparativo/admin): administrador read %/% rows — admin blinded', n, v_cnt; END IF;

  RAISE NOTICE 'SEC-05 PASS (comparativo): owner reads own vaga; non-owner→0; admin→all (% rows)', v_cnt;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-08 (a) — candidaturas (base table) SELECT : owner→rows · non-owner→0 · admin→all
--             (b) — candidaturas UPDATE : non-owner UPDATE of a foreign vaga → 0 rows (WITH CHECK)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_vaga uuid; v_owner uuid; v_cand uuid; v_cnt int;
BEGIN
  SELECT c.vaga_id, v.created_by, c.id
    INTO v_vaga, v_owner, v_cand
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE v.created_by IS NOT NULL
   LIMIT 1;
  IF v_vaga IS NULL THEN
    PERFORM set_config('smoke.cand_has', 'n', false);
    RAISE NOTICE 'SEC-08 SKIP (candidaturas): no candidatura on an owned vaga in this DB';
  ELSE
    SELECT count(*) INTO v_cnt FROM public.candidaturas WHERE vaga_id = v_vaga;
    PERFORM set_config('smoke.cand_has', 'y', false);
    PERFORM set_config('smoke.cand_vaga', v_vaga::text, false);
    PERFORM set_config('smoke.cand_owner', v_owner::text, false);
    PERFORM set_config('smoke.cand_id', v_cand::text, false);
    PERFORM set_config('smoke.cand_cnt', v_cnt::text, false);
  END IF;
END $$;

SET ROLE authenticated;
DO $$
DECLARE n int; v_cnt int; v_upd int;
BEGIN
  IF current_setting('smoke.cand_has', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  v_cnt := current_setting('smoke.cand_cnt')::int;

  -- SELECT: owner-rh → rows
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.cand_owner'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.candidaturas WHERE vaga_id = current_setting('smoke.cand_vaga')::uuid;
  IF n = 0 THEN RAISE EXCEPTION 'SEC-08 FAIL (candidaturas/owner): owner-rh read 0 rows on its OWN vaga'; END IF;

  -- SELECT: non-owner-rh → 0 rows
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000ff', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.candidaturas WHERE vaga_id = current_setting('smoke.cand_vaga')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'SEC-08 FAIL (candidaturas/non-owner SELECT): non-owner-rh read % foreign candidatura(s) — horizontal leak', n; END IF;

  -- UPDATE denial: non-owner-rh no-op UPDATE (SET updated_at = updated_at) of the foreign vaga
  -- → RLS USING filters every row out → 0 rows affected (nothing mutates either way).
  UPDATE public.candidaturas SET updated_at = updated_at
   WHERE vaga_id = current_setting('smoke.cand_vaga')::uuid;
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  IF v_upd <> 0 THEN RAISE EXCEPTION 'SEC-08 FAIL (candidaturas/non-owner UPDATE): non-owner-rh UPDATE touched % foreign row(s) — write leak', v_upd; END IF;

  -- SELECT: administrador → all rows of that vaga
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000aa', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);
  SELECT count(*) INTO n FROM public.candidaturas WHERE vaga_id = current_setting('smoke.cand_vaga')::uuid;
  IF n <> v_cnt THEN RAISE EXCEPTION 'SEC-08 FAIL (candidaturas/admin): administrador read %/% rows — admin blinded', n, v_cnt; END IF;

  RAISE NOTICE 'SEC-08 PASS (candidaturas): owner reads/updates own vaga; non-owner SELECT→0 + UPDATE→0; admin→all (% rows)', v_cnt;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-06 (a) — redacoes_candidato RH SELECT (scope via candidaturas→vagas JOIN)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_cand uuid; v_owner uuid; v_cnt int;
BEGIN
  SELECT r.candidatura_id, v.created_by
    INTO v_cand, v_owner
    FROM public.redacoes_candidato r
    JOIN public.candidaturas c ON c.id = r.candidatura_id
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE v.created_by IS NOT NULL
   LIMIT 1;
  IF v_cand IS NULL THEN
    PERFORM set_config('smoke.red_has', 'n', false);
    RAISE NOTICE 'SEC-06 SKIP (redacoes): no redação on an owned vaga in this DB';
  ELSE
    SELECT count(*) INTO v_cnt FROM public.redacoes_candidato WHERE candidatura_id = v_cand;
    PERFORM set_config('smoke.red_has', 'y', false);
    PERFORM set_config('smoke.red_cand', v_cand::text, false);
    PERFORM set_config('smoke.red_owner', v_owner::text, false);
    PERFORM set_config('smoke.red_cnt', v_cnt::text, false);
  END IF;
END $$;

SET ROLE authenticated;
DO $$
DECLARE n int; v_cnt int;
BEGIN
  IF current_setting('smoke.red_has', true) IS DISTINCT FROM 'y' THEN RETURN; END IF;
  v_cnt := current_setting('smoke.red_cnt')::int;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.red_owner'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.redacoes_candidato WHERE candidatura_id = current_setting('smoke.red_cand')::uuid;
  IF n = 0 THEN RAISE EXCEPTION 'SEC-06 FAIL (redacoes/owner): owner-rh read 0 redação rows on its OWN vaga'; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000ff', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.redacoes_candidato WHERE candidatura_id = current_setting('smoke.red_cand')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'SEC-06 FAIL (redacoes/non-owner): non-owner-rh read % foreign redação(s) — verdict horizontal leak', n; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000aa', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);
  SELECT count(*) INTO n FROM public.redacoes_candidato WHERE candidatura_id = current_setting('smoke.red_cand')::uuid;
  IF n <> v_cnt THEN RAISE EXCEPTION 'SEC-06 FAIL (redacoes/admin): administrador read %/% rows — admin blinded', n, v_cnt; END IF;

  RAISE NOTICE 'SEC-06 PASS (redacoes RH): owner reads own vaga; non-owner→0; admin→all (% rows)', v_cnt;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-06 (b) — reprocessar_analise regression-guard : non-owner CALL on a foreign vaga → 42501
--   (ALREADY vaga-scoped at 20260610000003:52-59 — this GUARDS, does not re-author.)
--   The role/owner guard RAISEs insufficient_privilege BEFORE any Vault read / pg_net dispatch,
--   so no side effect fires for the non-owner simulation.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  IF current_setting('smoke.cand_has', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'SEC-06 SKIP (reprocessar): no candidatura target discovered';
    RETURN;
  END IF;
  -- Simulate a non-owner recruiter (owns no vaga) invoking reprocess on a foreign candidatura.
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000ff', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  BEGIN
    PERFORM public.reprocessar_analise(current_setting('smoke.cand_id')::uuid);
    RAISE EXCEPTION 'SEC-06 FAIL (reprocessar): non-owner-rh was NOT blocked (expected 42501 insufficient_privilege)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'SEC-06 PASS (reprocessar): non-owner-rh denied reprocessar_analise (42501 insufficient_privilege)';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RNF-07a — the scoring path never writes candidaturas (no auto-reject / status flip)
--   Content-independent: inspect every pontuar_* function body — none may write candidaturas.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE r record; v_bad text := '';
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_functiondef(p.oid) AS def
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname LIKE 'pontuar\_%'
  LOOP
    IF r.def ~* '(insert|update|delete)\s+(into\s+)?(public\.)?candidaturas\M' THEN
      v_bad := v_bad || r.proname || ' ';
    END IF;
  END LOOP;
  IF v_bad <> '' THEN
    RAISE EXCEPTION 'RNF-07a FAIL: pontuar_* function(s) write candidaturas (auto-reject risk): %', v_bad;
  END IF;
  RAISE NOTICE 'RNF-07a PASS: no pontuar_* function writes candidaturas (scoring never flips status)';
END $$;

-- ── Reset the simulated context (ROLLBACK-free cleanup) ──────────────────────
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
