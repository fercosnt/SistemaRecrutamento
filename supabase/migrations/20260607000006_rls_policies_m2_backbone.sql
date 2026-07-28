-- =============================================================================
-- Migration: M2 backbone RLS bundle (candidato isolation + RH/admin reads + UPDATE policy)
-- Date: 2026-06-07
-- Phase: 06 (pipeline-backbone-schema)
-- Requirement: FUNIL-04, LGPD-02 (D-08)
-- =============================================================================
--
-- PURPOSE
-- Completes access control across the M2 backbone (FUNIL-04):
--   - candidato row-isolation on candidaturas + historico_candidatura
--   - RH/admin role-gated reads via the JWT app_metadata.role claim
--   - the rh_avanca_etapa UPDATE policy on candidaturas (D-08) that makes the direct-UPDATE
--     pipeline-advance flow work (the 06-04 trigger only fires once an UPDATE passes RLS)
--
-- CRITICAL CORRECTNESS RISK — do NOT copy the stale PRD §8.3 template. It uses `auth_user_id`
-- (live column is `user_id`) and `'admin'` (live role is `'administrador'`); a verbatim copy
-- silently matches nothing and breaks every read. Every policy here uses the LIVE-verified
-- identifiers + the shipped `(select auth.jwt() #>> '{app_metadata,role}')` idiom (Shared
-- Pattern A, in production in 20260425000002_curriculos_bucket.sql).
--
-- decisao_final + bias_audit_log policies already landed in 06-03 (20260607000003 / 000004) —
-- NOT re-created here. historico_candidatura gets SELECT policies only: it is written solely by
-- the SECURITY INVOKER avancar_etapa() trigger inside the authorized candidaturas UPDATE
-- transaction, so NO INSERT policy is needed (the candidaturas UPDATE policy authorizes the
-- whole transaction).
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (CLI wraps each migration in its own implicit
-- transaction — CLAUDE.md D-22). This file is RLS DDL with no $$ blocks, but GRANT/REVOKE-class
-- policy adjacency can still trip SQLSTATE 42601 in the transaction pooler; if `supabase db
-- push` fails with 42601, apply via the D-22 SQL-Editor workaround (paste + run manually, then
-- `supabase migration repair --status applied 20260607000006`).
-- =============================================================================

-- Ensure RLS is enabled on candidaturas (idempotent) -----------------------------------------
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;

-- candidaturas: candidato reads ONLY their own row -------------------------------------------
DROP POLICY IF EXISTS candidato_le_propria_candidatura ON public.candidaturas;
CREATE POLICY candidato_le_propria_candidatura ON public.candidaturas
  FOR SELECT USING (
    candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = (select auth.uid()))
  );

-- candidaturas: RH/admin read all -----------------------------------------------------------
DROP POLICY IF EXISTS rh_le_candidaturas ON public.candidaturas;
CREATE POLICY rh_le_candidaturas ON public.candidaturas
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
  );

-- candidaturas: RH/admin UPDATE (D-08) — enables the direct-UPDATE pipeline advance ----------
-- candidato has NO UPDATE policy -> candidato UPDATE is denied. The 06-04 trigger validates
-- the transition + writes the audit row once this UPDATE passes RLS.
DROP POLICY IF EXISTS rh_avanca_etapa ON public.candidaturas;
CREATE POLICY rh_avanca_etapa ON public.candidaturas
  FOR UPDATE
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'))
  WITH CHECK ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));

-- historico_candidatura: candidato reads ONLY their own audit trail --------------------------
DROP POLICY IF EXISTS candidato_le_proprio_historico ON public.historico_candidatura;
CREATE POLICY candidato_le_proprio_historico ON public.historico_candidatura
  FOR SELECT USING (
    candidatura_id IN (
      SELECT id FROM public.candidaturas
       WHERE candidato_id IN (
         SELECT id FROM public.candidatos WHERE user_id = (select auth.uid())
       )
    )
  );

-- historico_candidatura: RH/admin read all --------------------------------------------------
DROP POLICY IF EXISTS rh_le_historico ON public.historico_candidatura;
CREATE POLICY rh_le_historico ON public.historico_candidatura
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
  );

-- NO INSERT policy on historico_candidatura: it is written only by the SECURITY INVOKER
-- avancar_etapa() trigger inside the authorized candidaturas UPDATE transaction (the trigger
-- runs with the caller's rights; the candidaturas UPDATE policy authorizes the whole txn).
-- decisao_final + bias_audit_log policies are NOT re-created here — see 20260607000003 / 000004.
