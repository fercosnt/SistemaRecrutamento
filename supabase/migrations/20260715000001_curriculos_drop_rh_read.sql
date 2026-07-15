-- =============================================================================
-- Migration A: drop the RH role-only read branch of curriculos_select_own_or_rh
-- Date: 2026-07-15
-- Phase: 32 (Fechar os Dois Vazamentos Vivos) / Plan 32-02
-- Requirement: SEG-01 — the curriculos bucket must have NO role-only RH read path
-- =============================================================================
--
-- LEAK (from 20260425000002_curriculos_bucket.sql:55-68): the SELECT policy had a
-- role-only OR branch `(auth.jwt() #>> '{app_metadata,role}') IN ('rh','administrador')`
-- that let ANY authenticated RH read ANY candidate CV directly from Storage — no
-- vaga-ownership scope. This migration removes that branch, keeping ONLY the
-- candidate own-folder branch. After this, the single privileged RH CV path is the
-- get-curriculo-url Edge Function (service_role, authenticate-THEN-authorize with a
-- vaga-ownership guard) — authored in 32-02, deployed in 32-04.
--
-- SEQUENCING (RESEARCH Pitfall 1 — enforced in 32-04): deploy the EF FIRST, then
-- apply this migration. Dropping the branch before the EF is live leaves RH with no
-- CV path at all. Blast radius today is nil (no live component consumer — only tests).
--
-- The three upload policies (curriculos_insert_own / update_own / delete_own) are
-- INTENTIONALLY untouched — candidate own-folder write is unchanged.
--
-- No outer BEGIN;…COMMIT; wrapper (D-22): the MCP/CLI wraps each migration in its own
-- implicit transaction; an external BEGIN/COMMIT is the SQLSTATE 42601 trigger.
--
-- Authored here (32-02); APPLIED via MCP in 32-04 (AFTER the EF deploy), then the
-- behavioral proof runs via seg32_smokes.sql (RH direct Storage read → 0 rows).
-- =============================================================================

-- Recreate the SELECT policy with the candidate own-folder branch ONLY.
-- Pitfall 8: (select auth.uid()::text) wraps in a subquery for the RLS perf cache.
DROP POLICY IF EXISTS "curriculos_select_own_or_rh" ON storage.objects;

CREATE POLICY "curriculos_select_own_or_rh"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);
