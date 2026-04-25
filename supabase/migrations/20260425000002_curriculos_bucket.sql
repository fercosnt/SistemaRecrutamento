-- =============================================================================
-- Migration: curriculos bucket + RLS policies
-- Date: 2026-04-25
-- Phase: 04 (Vagas + Candidatura)
-- Requirement: CAND-01 (D-07, D-08, D-09, D-10) — Private bucket, RLS-gated
-- =============================================================================
--
-- D-10 AMENDMENT: path schema is {auth.uid()}/{uuid}.pdf instead of
-- {candidato_id}/{uuid}.pdf to eliminate a candidatos.user_id JOIN in RLS.
-- See RESEARCH.md L967-971.
--
-- BUCKET CONFIG
-- - private (public=false) — access only via signed URL or RLS-authorized SELECT
-- - file_size_limit: 5 MB (5,242,880 bytes) — enforces D-09 client-side cap
-- - allowed_mime_types: application/pdf only — enforces D-09 PDF-only
--
-- RLS PATTERN
-- - Read: own folder (candidato) OR role IN ('rh','administrador') [Custom Access Token Hook claim]
-- - Write: own folder only (no RH writes — they only read)
-- - Delete: own folder only
-- =============================================================================

BEGIN;

-- =========================================================================
-- 1) Create bucket (idempotent)
-- =========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'curriculos',
  'curriculos',
  false,                  -- private
  5242880,                -- 5 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =========================================================================
-- 2) RLS policies on storage.objects (curriculos bucket)
-- =========================================================================

-- Drop any prior policies for idempotency (safe — fresh phase install)
DROP POLICY IF EXISTS "curriculos_select_own_or_rh"   ON storage.objects;
DROP POLICY IF EXISTS "curriculos_insert_own"          ON storage.objects;
DROP POLICY IF EXISTS "curriculos_delete_own"          ON storage.objects;
DROP POLICY IF EXISTS "curriculos_update_own"          ON storage.objects;

-- Pitfall 8: (select auth.uid()::text) wraps in subquery for RLS perf cache.
-- Pitfall 9: role lives in app_metadata.role (Phase 1 Custom Access Token Hook).

-- SELECT (download): candidato reads own OR rh/administrador reads any
CREATE POLICY "curriculos_select_own_or_rh"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'curriculos'
  AND (
    -- Candidato owns the folder (path starts with their auth.uid())
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR
    -- RH/admin reads any
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
  )
);

-- INSERT (upload): candidato writes own folder only
CREATE POLICY "curriculos_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- UPDATE (overwrite): candidato updates own folder only (used by upload-with-replace)
CREATE POLICY "curriculos_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- DELETE: candidato deletes own folder only
CREATE POLICY "curriculos_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

COMMIT;
