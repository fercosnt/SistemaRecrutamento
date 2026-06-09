-- =============================================================================
-- Migration: Phase 10 reprocessar_analise RPC — manual re-fire of the analise dispatch
-- Date: 2026-06-10
-- Phase: 10 (triagem-rh-com-ia-comparativo-etapa-2)
-- Requirement: TRIAGEM-02 (panel reprocess button)
-- =============================================================================
--
-- PURPOSE
--   reprocessar_analise(p_candidatura_id) re-fires the SAME net.http_post dispatch as
--   trg_candidatura_analise() on demand — the migration that makes the 10-05 panel's reprocess
--   button live (backfill of old/failed analise rows — D-CONTEXT "Backfill = só botão reprocessar").
--   The EF upserts the analise row with a fresh result (UNIQUE(candidatura_id) ON CONFLICT DO
--   UPDATE — fresh idempotency, never duplicates).
--
-- GUARD (T-10-08 — SECURITY DEFINER must not allow cross-vaga dispatch):
--   1. role IN ('rh','administrador') — candidato/anon RAISE 'forbidden' (can never reprocess).
--   2. role='rh' must OWN the candidatura's vaga: vagas.created_by = auth.uid() (the live vagas
--      owner column — confirmed from database.types.ts). administrador bypasses ownership.
--   GRANT EXECUTE TO authenticated only (NOT anon); REVOKE FROM PUBLIC. The in-function guard is
--   the real control; the EF itself re-validates the Bearer.
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (CLAUDE.md D-22). PROD apply is the separate [BLOCKING]
--   Plan 10-04 (if 42601 fires at apply, 10-04 uses Supabase MCP execute_sql + version reconcile).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reprocessar_analise(p_candidatura_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vaga_id       uuid;
  v_vaga_owner    uuid;
  v_role          text;
  v_project_url   text;
  v_invoke_key    text;
BEGIN
  -- (1) Resolve the candidatura's vaga + its owner.
  SELECT c.vaga_id, v.created_by
    INTO v_vaga_id, v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;

  IF v_vaga_id IS NULL THEN
    RAISE EXCEPTION 'candidatura % not found', p_candidatura_id USING ERRCODE = 'no_data_found';
  END IF;

  -- (2) Role + own-vaga guard. candidato/anon → forbidden. rh → must own the vaga. admin → bypass.
  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (3) Re-fire the SAME dispatch as trg_candidatura_analise: read Vault secrets (graceful skip
  --     if absent), PERFORM net.http_post to the analise EF. The EF upserts the analise row fresh.
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';

  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN;  -- secrets not set yet — reprocess dispatch deferred (no error raised)
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/analise-candidato-individual',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_invoke_key
    ),
    body := jsonb_build_object(
      'candidatura_id', p_candidatura_id,
      'vaga_id', v_vaga_id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reprocessar_analise(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reprocessar_analise(uuid) TO authenticated;

COMMENT ON FUNCTION public.reprocessar_analise(uuid) IS
  'Phase 10 / TRIAGEM-02: re-fires the analise-candidato-individual dispatch on demand (panel '
  'reprocess button / backfill). SECURITY DEFINER + SET search_path=''''. Guard: role IN '
  '(''rh'',''administrador'') — candidato/anon RAISE forbidden; role=''rh'' must own the '
  'candidatura''s vaga (vagas.created_by = auth.uid()); administrador bypasses ownership. '
  'Reuses Vault project_url + edge_invoke_key with graceful skip. GRANT EXECUTE TO authenticated '
  'only (REVOKE FROM PUBLIC); the EF re-validates the Bearer.';
