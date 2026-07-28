-- =============================================================================
-- Phase 24 / Plan 24-03 — SEC-02 candidato-DENY verdict + RH-intact smoke (repeatable)
-- =============================================================================
-- Proves, AFTER 20260706110003_sec02_redacao_verdict.sql applies, that the essay
-- verdict leak is closed WITHOUT breaking RH — the phase's #1 landmine (Pitfall 1):
--   (a) SEC-02 — a candidato can no longer read ANY verdict column of redacoes_candidato
--                via the base table (the candidate row policy was DROPPED): 0 rows /
--                permission-denied, never a red_flag/score/color value.
--   (b) SEC-02 — get_minha_redacao() is the candidate's ONLY own-row path and its
--                declared result type NEVER carries a verdict column (content-independent).
--   (c) SEC-02 — an RH/administrador STILL reads the full verdict from the base table
--                (redacao_rh_select intact — NO column REVOKE blinded RH).
--
-- Idiom: the M2 SECURITY-gate pattern — SET ROLE authenticated + set_config on
-- 'request.jwt.claims' to simulate candidato / administrador, then RAISE on the
-- insecure outcome. Read-only, ROLLBACK-free: writes NO rows; resets role + claims.
--
-- Executed against PROD in 24-08 (Supabase SQL Editor / MCP execute_sql) AFTER the
-- migration. A NOTICE per section = PASS; an EXCEPTION = FAIL (a real leak / a broken RH).
-- =============================================================================

-- ── (a) SEC-02 — the candidato must not read any verdict column via the base table ──
-- Simulate an authenticated candidato (role distinct from rh/administrador). After the
-- migration there is NO candidate SELECT policy on redacoes_candidato → RLS returns 0
-- rows on ANY direct read. PASS = permission-denied (42501) OR 0 rows; FAIL = a value.
SET ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"candidato"}}',
  false
);

DO $$
DECLARE v_leak boolean;
BEGIN
  SELECT red_flag_etico INTO v_leak FROM public.redacoes_candidato LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'SEC-02 FAIL (a): candidato read redacoes_candidato.red_flag_etico = % via base table', v_leak;
  END IF;
  RAISE NOTICE 'SEC-02 PASS (a): candidato obtained no verdict row via base table (candidate row policy dropped; table may be empty)';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'SEC-02 PASS (a): candidato denied redacoes_candidato.red_flag_etico (permission denied 42501)';
END $$;

-- ── (b) SEC-02 — get_minha_redacao() never exposes a verdict column ─────────────────
-- Content-independent: inspect the function's declared result type (must carry NONE of
-- the verdict columns nor bloqueio_avanco) and prove the candidato may EXECUTE it
-- (GRANT present). Works on an empty table / a non-matching candidatura_id.
DO $$
DECLARE v_result_sig text;
BEGIN
  SELECT pg_get_function_result(p.oid) INTO v_result_sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'get_minha_redacao';
  IF v_result_sig IS NULL THEN
    RAISE EXCEPTION 'SEC-02 FAIL (b): get_minha_redacao() does not exist';
  END IF;
  IF v_result_sig ~* '(analise_ia|scores_dimensao|score_ponderado|classificacao_cor|red_flag_etico|flags|scores_humanos|notas_revisor|decisao_revisor|bloqueio_avanco)' THEN
    RAISE EXCEPTION 'SEC-02 FAIL (b): get_minha_redacao() result exposes a verdict column: %', v_result_sig;
  END IF;
  -- candidato must be able to EXECUTE it (a random candidatura_id → 0 rows, own-row guard):
  PERFORM * FROM public.get_minha_redacao('00000000-0000-0000-0000-0000000000ff'::uuid);
  RAISE NOTICE 'SEC-02 PASS (b): get_minha_redacao() executable by candidato; result has no verdict column: %', v_result_sig;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'SEC-02 FAIL (b): candidato cannot EXECUTE get_minha_redacao() (GRANT missing)';
END $$;

-- ── (c) SEC-02 — an RH/administrador STILL reads the full verdict (Pitfall 1 guard) ──
-- Simulate an administrador. redacao_rh_select is intact and NO column was REVOKE'd, so
-- RH must read red_flag_etico WITHOUT permission-denied. PASS = the read executes (a value
-- OR 0 rows if empty); FAIL = insufficient_privilege (RH was blinded → the REVOKE landmine).
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated","app_metadata":{"role":"administrador"}}',
  false
);

DO $$
DECLARE v_verdict boolean;
BEGIN
  SELECT red_flag_etico INTO v_verdict FROM public.redacoes_candidato LIMIT 1;
  RAISE NOTICE 'SEC-02 PASS (c): RH/administrador still reads redacoes_candidato.red_flag_etico (found=%, value=%) — RH not blinded', FOUND, v_verdict;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'SEC-02 FAIL (c): RH/administrador denied redacoes_candidato.red_flag_etico — the column-REVOKE landmine broke RH (Pitfall 1)';
END $$;

-- Reset the simulated context (ROLLBACK-free cleanup).
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
