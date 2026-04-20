-- =============================================================================
-- Migration: Custom Access Token Hook for role injection
-- Date: 2026-04-20
-- Requirement: FOUND-03 (role in JWT app_metadata)
-- Decision: D-02b (forward migration for role unification)
-- =============================================================================
--
-- PURPOSE
-- Injects `role` into the JWT app_metadata claim so the client-side unified
-- auth store (src/store/authStore.ts) can read it via
-- `session.user.app_metadata.role` without a runtime DB query.
--
-- ROLE MAPPING
-- Resolves Open Question 1 from 01-RESEARCH.md:
--   usuarios_rh.role = 'recrutador'    -> JWT app_metadata.role = 'rh'
--   usuarios_rh.role = 'administrador' -> JWT app_metadata.role = 'administrador'
--   Any row in public.candidatos      -> JWT app_metadata.role = 'candidato'
--   No match (edge case)              -> default to 'candidato'
-- This normalizes 'recrutador' to 'rh' for consistency with the /rh/* route
-- prefix in src/router/routes.tsx.
--
-- DASHBOARD STEP (MANUAL, REQUIRED AFTER APPLY)
-- Applying this migration creates the function but does NOT enable the hook.
-- After apply, go to Supabase Dashboard:
--   Authentication -> Hooks -> Custom Access Token -> Enable
--   Select function: public.custom_access_token_hook
-- See .planning/phases/01-foundation-saneada/01-04-CHECKPOINT.md for details.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  claims      jsonb;
  user_role   text;
  rh_role_db  text;
BEGIN
  -- 1. Check usuarios_rh first (only ativo, non-soft-deleted rows count)
  SELECT role INTO rh_role_db
  FROM public.usuarios_rh
  WHERE user_id = (event->>'user_id')::uuid
    AND ativo = true
    AND deleted_at IS NULL
  LIMIT 1;

  IF rh_role_db IS NOT NULL THEN
    user_role := CASE
      WHEN rh_role_db = 'recrutador'    THEN 'rh'
      WHEN rh_role_db = 'administrador' THEN 'administrador'
      ELSE rh_role_db
    END;
  END IF;

  -- 2. If not RH, check candidatos
  IF user_role IS NULL THEN
    PERFORM 1 FROM public.candidatos
    WHERE user_id = (event->>'user_id')::uuid
    LIMIT 1;
    IF FOUND THEN
      user_role := 'candidato';
    END IF;
  END IF;

  -- 3. Mutate the event.claims.app_metadata.role
  claims := event->'claims';

  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb);
  END IF;

  -- Default to 'candidato' for new users mid-registration (edge case)
  claims := jsonb_set(
    claims,
    '{app_metadata,role}',
    to_jsonb(COALESCE(user_role, 'candidato'))
  );

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'Supabase Custom Access Token Hook. Reads role from usuarios_rh/candidatos '
  'and injects it into JWT app_metadata.role. Maps recrutador -> rh. '
  'Must be enabled in Supabase Dashboard under Authentication > Hooks.';

-- =========================================================================
-- Grants
-- =========================================================================
-- Only supabase_auth_admin should execute this hook (runs in auth pipeline)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, PUBLIC;

-- The hook queries these tables; supabase_auth_admin needs SELECT access
GRANT SELECT ON public.usuarios_rh TO supabase_auth_admin;
GRANT SELECT ON public.candidatos  TO supabase_auth_admin;

COMMIT;
