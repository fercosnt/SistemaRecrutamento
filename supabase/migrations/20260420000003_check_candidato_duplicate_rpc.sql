-- =============================================================================
-- Migration: RPC SECURITY DEFINER for CPF/email duplicate check
-- Date: 2026-04-20
-- Requirements: FOUND-10, D-01a
-- Threat mitigated: T-1-09 (Information Disclosure) and T-1-12
-- =============================================================================
--
-- PURPOSE
-- Replaces anonymous SELECT on public.candidatos (revoked in migration
-- 20260420000001_rls_anon_to_rpc.sql) with a narrow SECURITY DEFINER function
-- that returns ONLY boolean flags -- never raw candidato data.
--
-- RESPONSE SHAPE
--   { "cpf_exists": boolean, "email_exists": boolean }
--
-- CONSUMER
-- src/features/cadastro/services/duplicateCheckService.ts calls
--   supabase.rpc('check_candidato_duplicate', { p_cpf, p_email })
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.check_candidato_duplicate(
  p_cpf   text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cpf_clean   text;
  v_email_clean text;
  result        jsonb;
BEGIN
  -- Normalize inputs defensively. The client already strips non-digits from
  -- CPF and lowercases/trims email, but we enforce it again on the server.
  v_cpf_clean   := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  v_email_clean := lower(trim(COALESCE(p_email, '')));

  SELECT jsonb_build_object(
    'cpf_exists', CASE
      WHEN v_cpf_clean = '' THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.candidatos
        WHERE cpf = v_cpf_clean
          AND deleted_at IS NULL
      )
    END,
    'email_exists', CASE
      WHEN v_email_clean = '' THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.candidatos
        WHERE lower(email) = v_email_clean
          AND deleted_at IS NULL
      )
    END
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.check_candidato_duplicate(text, text) IS
  'Returns {cpf_exists, email_exists} booleans for duplicate registration check. '
  'SECURITY DEFINER with empty search_path. Does NOT expose raw candidato data.';

-- =========================================================================
-- Grants
-- =========================================================================
-- Lock down PUBLIC, then allow only anon + authenticated
REVOKE ALL ON FUNCTION public.check_candidato_duplicate(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_candidato_duplicate(text, text) TO anon, authenticated;

COMMIT;
