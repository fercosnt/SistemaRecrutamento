-- =============================================================================
-- Phase 24 / Plan 24-02 — SEC-01 / SEC-07 candidato-DENY smoke (repeatable)
-- =============================================================================
-- Proves, from a simulated candidato JWT, that the two column-secrecy leaks are
-- closed AFTER the two migrations apply:
--   (a) SEC-01 — cognitivo_itens.gabarito_idx is unreachable (row-deny + column
--                REVOKE): candidato → permission-denied OR 0 rows, never a value.
--   (b) SEC-01 — get_cognitivo_itens() is the candidate's ONLY items path and its
--                result type NEVER carries a gabarito column (content-independent).
--   (c) SEC-07 — perguntas.rubric is denied to the candidato (column REVOKE).
--
-- Idiom: the M2 SECURITY-gate pattern — SET ROLE authenticated + set_config on
-- 'request.jwt.claims' to simulate a candidato, then RAISE on the insecure outcome.
-- Read-only, ROLLBACK-free: writes NO rows; resets role + claims at the end.
--
-- Executed against PROD in 24-08 (Supabase SQL Editor / MCP execute_sql) AFTER
-- 20260706110001_sec01_cognitivo_gabarito.sql + 20260706110002_sec07_rubric.sql.
-- A NOTICE per section = PASS; an EXCEPTION = FAIL (a real leak).
-- =============================================================================

-- Simulate an authenticated candidato (role distinct from rh/administrador).
SET ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"candidato"}}',
  false
);

-- ── (a) SEC-01 — the candidato must not obtain cognitivo_itens.gabarito_idx ─────
-- After the migration the broad row policy auth_le_cognitivo_itens is DROPPED
-- (candidato → 0 rows) and gabarito_idx is column-REVOKE'd. PASS = permission-denied
-- (42501) OR 0 rows; FAIL = any real gabarito value. NOTE: cognitivo_itens is empty
-- today (CC0 seed is M5), so this asserts the DENY posture — the content-independent
-- proof is (b).
DO $$
DECLARE v_leak int;
BEGIN
  SELECT gabarito_idx INTO v_leak FROM public.cognitivo_itens LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'SEC-01 FAIL (a): candidato read cognitivo_itens.gabarito_idx = %', v_leak;
  END IF;
  RAISE NOTICE 'SEC-01 PASS (a): candidato obtained no gabarito_idx (row-deny; table may be empty)';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'SEC-01 PASS (a): candidato denied cognitivo_itens.gabarito_idx (permission denied 42501)';
END $$;

-- ── (b) SEC-01 — get_cognitivo_itens() never exposes a gabarito column ──────────
-- Content-independent: inspects the function's declared result type and proves the
-- candidato may EXECUTE it (GRANT present). Works on the empty table.
DO $$
DECLARE v_result_sig text;
BEGIN
  SELECT pg_get_function_result(p.oid) INTO v_result_sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'get_cognitivo_itens';
  IF v_result_sig IS NULL THEN
    RAISE EXCEPTION 'SEC-01 FAIL (b): get_cognitivo_itens() does not exist';
  END IF;
  IF v_result_sig ILIKE '%gabarito%' THEN
    RAISE EXCEPTION 'SEC-01 FAIL (b): get_cognitivo_itens() result exposes a gabarito column: %', v_result_sig;
  END IF;
  PERFORM * FROM public.get_cognitivo_itens();  -- candidato must be able to execute it
  RAISE NOTICE 'SEC-01 PASS (b): get_cognitivo_itens() executable by candidato; result has no gabarito column: %', v_result_sig;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'SEC-01 FAIL (b): candidato cannot EXECUTE get_cognitivo_itens() (GRANT missing)';
END $$;

-- ── (c) SEC-07 — the candidato must not obtain perguntas.rubric ─────────────────
-- The candidate row policy cand_le_perguntas_ativas STAYS (candidato reads active
-- perguntas), so rubric is protected ONLY by the column REVOKE (no row-deny fallback).
-- PASS = permission-denied (42501); FAIL = any rubric value returned.
-- ⚠️ 24-08: a FAIL means `authenticated` holds a TABLE-level SELECT grant that defeats
--    the bare column REVOKE — remediate per the note in 20260706110002_sec07_rubric.sql
--    (REVOKE SELECT ON perguntas + GRANT SELECT on every column except rubric).
DO $$
DECLARE v_leak jsonb;
BEGIN
  SELECT rubric INTO v_leak FROM public.perguntas WHERE status = 'active' LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'SEC-07 FAIL: candidato read perguntas.rubric = % (column REVOKE ineffective — see 24-08 note)', v_leak;
  END IF;
  RAISE NOTICE 'SEC-07 PASS: candidato obtained no rubric (no active row to leak — re-run once an active caso_aberto exists)';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'SEC-07 PASS: perguntas.rubric denied to candidato (permission denied 42501)';
END $$;

-- Reset the simulated candidato context (ROLLBACK-free cleanup).
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
