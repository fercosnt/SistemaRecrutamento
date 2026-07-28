-- =============================================================================
-- Migration: decisao_final (final-decision table + LGPD-02 structural guardrail)
-- Date: 2026-06-07
-- Phase: 06 (pipeline-backbone-schema)
-- Requirement: LGPD-02 (D-02, D-08), FUNIL-04
-- =============================================================================
--
-- PURPOSE
-- Create `decisao_final` COMPLETE now (D-02) so the zero-auto-rejection guardrail (LGPD-02,
-- success criterion #5) is SQL-auditable already in Phase 6 — even though the Decisão Final
-- FEATURE (the EF + UI that writes rows) only lands in Phase 15.
--
-- THE GUARDRAIL (unfalsifiable, structural):
--   - `por_usuario uuid NOT NULL REFERENCES auth.users(id)` — a decision with no human actor
--     is structurally unrepresentable. LGPD-02 audit: SELECT count(*) WHERE por_usuario IS NULL -> 0.
--   - client INSERT blocked entirely via RLS `FOR INSERT WITH CHECK (false)` (D-08) — only the
--     Phase-15 Edge Function (service_role, bypasses RLS) ever writes here.
--   - `justificativa text NOT NULL CHECK (length(justificativa) >= 50)` — a substantive rationale
--     is structurally required (no empty/trivial justification to dodge accountability).
--
-- Pure DDL + RLS (no PL/pgSQL $$ blocks) — autonomous; applies via standard `supabase db push`.
-- If the GRANT/REVOKE-free policy set still trips 42601 in the pooler, fall back to the D-22
-- SQL-Editor workaround. The executor still runs the LGPD-02 SQL audit (runbook §F) after apply.
--
-- VERIFIED live identifiers (PRD §8.3 is stale — do NOT copy it):
--   - Auth FK column: `user_id` (NOT auth_user_id)
--   - Role values: 'rh', 'administrador', 'candidato' (NOT 'admin')
--   - Shipped RLS idiom: (select auth.jwt() #>> '{app_metadata,role}') IN ('rh','administrador')
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (CLI wraps each migration in its own implicit
-- transaction — CLAUDE.md D-22).
-- =============================================================================

-- Decision result enum (Claude's discretion name) ---------------------------------------------
CREATE TYPE public.decisao_final_resultado AS ENUM ('aprovado', 'rejeitado', 'em_espera');

CREATE TABLE public.decisao_final (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL UNIQUE REFERENCES public.candidaturas(id),
  decisao public.decisao_final_resultado NOT NULL,
  justificativa text NOT NULL CHECK (length(justificativa) >= 50),
  por_usuario uuid NOT NULL REFERENCES auth.users(id),   -- NEVER null = LGPD-02 guardrail
  em timestamptz NOT NULL DEFAULT now(),
  -- LGPD Art. 20 forward-looking columns (Phase 15 writes them)
  explicacao_solicitada_em timestamptz,
  revisao_solicitada_em timestamptz,
  revisao_resultado text
);

ALTER TABLE public.decisao_final ENABLE ROW LEVEL SECURITY;

-- Client INSERT blocked entirely — only the Phase-15 EF (service_role) writes (D-08) ----------
CREATE POLICY decisao_final_no_client_insert ON public.decisao_final
  FOR INSERT WITH CHECK (false);

-- RH/admin read all decisions ----------------------------------------------------------------
CREATE POLICY rh_le_decisao_final ON public.decisao_final
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
  );

-- Candidato reads ONLY their own decision (for the LGPD Art. 20 /candidato/explicacao endpoint,
-- Phase 15) — scoped via candidatos.user_id = auth.uid() ------------------------------------
CREATE POLICY candidato_le_propria_decisao ON public.decisao_final
  FOR SELECT USING (
    candidatura_id IN (
      SELECT id FROM public.candidaturas
       WHERE candidato_id IN (
         SELECT id FROM public.candidatos WHERE user_id = (select auth.uid())
       )
    )
  );

COMMENT ON COLUMN public.decisao_final.por_usuario IS
  'Phase 6 / LGPD-02 / success criterion #5: NOT NULL is the zero-auto-rejection structural '
  'guardrail — no decision can persist without a human actor. SQL audit: '
  'SELECT count(*) FROM public.decisao_final WHERE por_usuario IS NULL  ->  must be 0.';

COMMENT ON TABLE public.decisao_final IS
  'Phase 6 / D-02: created COMPLETE now (constraints + RLS) so the LGPD-02 guardrail is '
  'SQL-auditable in Phase 6. The feature (EF + UI that INSERTs rows) lands in Phase 15; client '
  'INSERT is blocked here via WITH CHECK (false) — only the EF service_role writes.';
