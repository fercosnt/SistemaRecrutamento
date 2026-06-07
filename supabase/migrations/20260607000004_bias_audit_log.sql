-- =============================================================================
-- Migration: bias_audit_log (schema-only placeholder)
-- Date: 2026-06-07
-- Phase: 06 (pipeline-backbone-schema)
-- Requirement: FUNIL-04 (schema for LGPD-03, deferred to Phase 15)
-- =============================================================================
--
-- PURPOSE
-- Schema-only placeholder for the future monthly selection-rate bias snapshot (LGPD-03). The
-- snapshot JOB (the EF that computes selection-rate breakdown by raça/gênero/idade and applies
-- the EEOC 4/5 rule) is Phase 15 — NOT this phase (Assumption A4). Here we create only the
-- empty table + admin-only read RLS so the backbone is complete and 100%-RLS-covered.
--
-- Pure DDL + RLS — autonomous; applies via standard `supabase db push`.
--
-- VERIFIED live identifiers: role value is 'administrador' (NOT 'admin'); shipped RLS idiom is
-- (select auth.jwt() #>> '{app_metadata,role}'). Bias audit is administrador-only (not rh).
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (CLI wraps each migration in its own implicit
-- transaction — CLAUDE.md D-22).
-- =============================================================================

CREATE TABLE public.bias_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_em timestamptz NOT NULL DEFAULT now(),
  periodo     text,                                  -- e.g. month label '2026-06'
  dados       jsonb NOT NULL DEFAULT '{}'::jsonb,     -- selection-rate breakdown (EEOC 4/5 rule), written in Phase 15
  criado_em   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bias_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only read; NO INSERT policy this phase — the Phase-15 snapshot EF writes via service_role
CREATE POLICY administrador_le_bias_audit ON public.bias_audit_log
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
  );

COMMENT ON TABLE public.bias_audit_log IS
  'Phase 6 / LGPD-03 placeholder: schema-only. The monthly selection-rate snapshot job (EEOC '
  '4/5 rule breakdown by raça/gênero/idade) is deferred to Phase 15, which writes here via the '
  'EF service_role. This migration creates the empty table + administrador-only read RLS only.';
