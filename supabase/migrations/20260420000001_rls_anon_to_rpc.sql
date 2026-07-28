-- =============================================================================
-- Migration: Revoke anonymous SELECT on candidatos (move to RPC)
-- Date: 2026-04-20
-- Requirement: FOUND-10
-- =============================================================================
--
-- PURPOSE
-- Anonymous users must not be able to SELECT directly from public.candidatos.
-- Duplicate checking (CPF/email) is the only remaining legitimate anon read
-- against this table and it is now performed via the SECURITY DEFINER RPC
-- public.check_candidato_duplicate (see migration 20260420000003).
--
-- DISCOVERY (run before apply to confirm target policies on prod)
--   SELECT schemaname, tablename, policyname, roles, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename = 'candidatos'
--     AND (
--       'anon' = ANY(roles)
--       OR 'public' = ANY(roles)
--     )
--     AND cmd IN ('SELECT', 'ALL');
--
-- If the discovery query returns rows, add a matching DROP POLICY IF EXISTS
-- line per policy name below. The baseline does NOT create any anon SELECT
-- policy on candidatos, so on a fresh environment this migration is a no-op
-- and acts as documentation. On existing prod, policies added ad-hoc during
-- the Figma Make era may still be present.
-- =============================================================================

BEGIN;

-- Defensive DROPs for policy names commonly used in the prod era.
-- Each is wrapped in IF EXISTS so missing policies are silently skipped.
DROP POLICY IF EXISTS "candidatos_anon_select"            ON public.candidatos;
DROP POLICY IF EXISTS "candidatos_public_select"          ON public.candidatos;
DROP POLICY IF EXISTS "Candidatos_selecionavel_por_anon"  ON public.candidatos;
DROP POLICY IF EXISTS "Anon can check duplicates"         ON public.candidatos;
DROP POLICY IF EXISTS "check_cpf_email_duplicate"         ON public.candidatos;
DROP POLICY IF EXISTS "candidatos_select_anon"            ON public.candidatos;

-- Also revoke any blanket table-level grants to anon that may bypass RLS
REVOKE SELECT ON public.candidatos FROM anon;
REVOKE SELECT ON public.candidatos FROM PUBLIC;

-- authenticated SELECT is preserved via candidatos_select_own policy
-- (defined in baseline). RH access is preserved via the RH policy pattern.

-- Explicit sanity: RLS must remain ENABLED
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.candidatos IS
  'Candidatos table. Anonymous SELECT is REVOKED (see migration 20260420000001). '
  'Duplicate checks run through public.check_candidato_duplicate SECURITY DEFINER RPC.';

COMMIT;
