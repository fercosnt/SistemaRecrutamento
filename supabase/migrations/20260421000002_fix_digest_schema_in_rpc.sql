-- =============================================================================
-- Migration: Fix public.digest() schema reference in check_candidato_duplicate
-- Date: 2026-04-21
-- Requirements: CAD-03 (Phase 2), D-12 (carryover fix from 02-02 Wave 1)
-- Threats mitigated: T-02-01 (Info Disclosure) — keeps rate-limit behavior intact
-- =============================================================================
--
-- PROBLEM
-- Migration 20260421000001_rate_limit_duplicate_check.sql created
-- `check_candidato_duplicate` with `SET search_path = ''` (hardened security
-- posture) and then called `public.digest(...)` inside the body. But on a
-- Supabase hosted project, `CREATE EXTENSION pgcrypto` installs the
-- extension's objects into the `extensions` schema — NOT `public`. Result:
-- every RPC call fails at runtime with:
--
--   42883 function public.digest(text, unknown) does not exist
--
-- PostgREST surfaces this as HTTP 404 to the client (because the RPC cannot
-- complete its introspection), breaking the entire duplicate-check flow
-- used by Plan 02-06 cadastro.
--
-- FIX
-- Re-create the function body qualifying `digest` with `extensions.` so the
-- hardened empty-search_path still resolves it. Also cast the second arg to
-- `text` explicitly to match the `digest(text, text)` signature — without the
-- cast PostgREST error resolver reports `(text, unknown)` and fails to pick
-- the binary overload, even though that's not the root cause here.
--
-- Everything else about the function is identical to migration 0005: same
-- parameters, same RETURNS jsonb shape { cpf_exists, email_exists, rate_limited },
-- same GRANTs. The rate-limit audit table is untouched.
--
-- RESPONSE SHAPE (unchanged)
--   { "cpf_exists": boolean|null, "email_exists": boolean|null, "rate_limited": boolean }
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
  v_cpf_clean    text;
  v_email_clean  text;
  v_xff          text := current_setting('request.headers', true)::json->>'x-forwarded-for';
  v_hash         text := encode(
                            extensions.digest(
                              (coalesce(p_cpf,'') || '|' || coalesce(p_email,''))::text,
                              'sha256'::text
                            ),
                            'hex'
                          );
  v_recent_count int;
  v_global_count int;
  v_cpf_exists   boolean;
  v_email_exists boolean;
BEGIN
  -- 2a. Opportunistic cleanup of rows older than 10 minutes
  DELETE FROM public.rate_limit_check_duplicate
  WHERE called_at < now() - interval '10 minutes';

  -- 2b. Per-key (x_forwarded_for, hash_cpf_email) count in the last 60s
  SELECT count(*) INTO v_recent_count
  FROM public.rate_limit_check_duplicate
  WHERE hash_cpf_email = v_hash
    AND (x_forwarded_for IS NOT DISTINCT FROM v_xff)
    AND called_at > now() - interval '60 seconds';

  IF v_recent_count >= 30 THEN
    RETURN jsonb_build_object(
      'cpf_exists',   null,
      'email_exists', null,
      'rate_limited', true
    );
  END IF;

  -- 2c. Global upper bound (defense-in-depth against distributed DDoS)
  SELECT count(*) INTO v_global_count
  FROM public.rate_limit_check_duplicate
  WHERE called_at > now() - interval '60 seconds';

  IF v_global_count >= 1000 THEN
    RETURN jsonb_build_object(
      'cpf_exists',   null,
      'email_exists', null,
      'rate_limited', true
    );
  END IF;

  -- 2d. Log the probe
  INSERT INTO public.rate_limit_check_duplicate (x_forwarded_for, hash_cpf_email)
  VALUES (v_xff, v_hash);

  -- 2e. Normal duplicate check (normalize CPF digits + lowercase email)
  v_cpf_clean   := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  v_email_clean := lower(trim(COALESCE(p_email, '')));

  SELECT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE cpf = v_cpf_clean AND deleted_at IS NULL
  ) INTO v_cpf_exists;

  SELECT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE lower(email) = v_email_clean AND deleted_at IS NULL
  ) INTO v_email_exists;

  RETURN jsonb_build_object(
    'cpf_exists',   CASE WHEN v_cpf_clean   = '' THEN false ELSE v_cpf_exists   END,
    'email_exists', CASE WHEN v_email_clean = '' THEN false ELSE v_email_exists END,
    'rate_limited', false
  );
END;
$$;

COMMENT ON FUNCTION public.check_candidato_duplicate(text, text) IS
  'Returns {cpf_exists, email_exists, rate_limited}. SECURITY DEFINER with '
  'HYBRID rate limit: primary key is x-forwarded-for header, composite fallback '
  'keyed on (x_forwarded_for, hash_cpf_email) at 30 calls/60s, plus global upper '
  'bound of 1000/60s. Opportunistic cleanup deletes rows > 10min old on each '
  'call. (D-09, D-12 revised, Phase 2) — fixed in 0006: extensions.digest + '
  'explicit text casts for hardened empty search_path.';

-- Re-affirm grants (REPLACE keeps them but be defensive)
REVOKE ALL ON FUNCTION public.check_candidato_duplicate(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_candidato_duplicate(text, text) TO anon, authenticated;

-- Force PostgREST to reload its schema cache so the new function body is seen
-- immediately (prevents stale 404 after migration push).
NOTIFY pgrst, 'reload schema';

COMMIT;
