-- =============================================================================
-- Migration: vagas slug generation trigger + backfill
-- Date: 2026-04-25
-- Phase: 04 (Vagas + Candidatura)
-- Requirement: VAGA-02 (D-02) — DB-owned slug single source of truth
-- =============================================================================
--
-- PURPOSE
-- Auto-generate URL-safe `slug` from `titulo` on INSERT. Dedup numeric suffix
-- (`-2`, `-3`, ...) on collision. INSERT-only per Pitfall 5 / Option A —
-- UPDATEs to titulo do NOT regenerate slug (URL stability > self-updating).
--
-- BACKFILL
-- Existing rows with NULL/empty slug are populated using the same generator.
-- Since `slug` is currently NOT NULL with a default, this is defensive.
-- =============================================================================

BEGIN;

-- Ensure unaccent extension exists (Supabase Pro has it pre-installed; defensive)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =========================================================================
-- 1) slugify(text) — pure function, deterministic, immutable
-- =========================================================================
CREATE OR REPLACE FUNCTION public.slugify(p_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_slug text;
BEGIN
  -- Lowercase
  v_slug := lower(COALESCE(p_input, ''));
  -- Remove accents (á→a, ç→c, etc.)
  v_slug := public.unaccent(v_slug);
  -- Replace any non-alphanumeric run with a single hyphen
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  -- Trim leading/trailing hyphens
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  -- Collapse multiple hyphens (defensive — regexp_replace above already handles)
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  -- Empty fallback (e.g., titulo = "🚀" or all-non-alphanumeric)
  IF v_slug = '' THEN
    v_slug := 'vaga';
  END IF;
  -- Hard cap at 100 chars (DB column likely text but prudent for URLs)
  v_slug := substring(v_slug from 1 for 100);
  RETURN v_slug;
END;
$$;

COMMENT ON FUNCTION public.slugify(text) IS
  'Phase 4: Convert pt-BR text to URL-safe slug. Deterministic, immutable.';

-- =========================================================================
-- 2) generate_unique_vaga_slug — collision-aware wrapper
-- =========================================================================
CREATE OR REPLACE FUNCTION public.generate_unique_vaga_slug(
  p_titulo text,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix int := 1;
BEGIN
  v_base := public.slugify(p_titulo);
  v_candidate := v_base;
  -- Loop until we find an unused slug; bounded at 1000 to prevent infinite
  -- loops on pathological data
  WHILE v_suffix < 1000 LOOP
    -- Check collision (excluding current row if provided — supports future UPDATE trigger if needed)
    IF NOT EXISTS (
      SELECT 1 FROM public.vagas
      WHERE slug = v_candidate
        AND (p_exclude_id IS NULL OR id <> p_exclude_id)
    ) THEN
      RETURN v_candidate;
    END IF;
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix::text;
  END LOOP;
  -- Pathological: 1000 vagas with same titulo. Fall back to UUID suffix.
  RETURN v_base || '-' || replace(gen_random_uuid()::text, '-', '');
END;
$$;

COMMENT ON FUNCTION public.generate_unique_vaga_slug(text, uuid) IS
  'Phase 4: Generate slug from titulo with numeric dedup suffix.';

-- =========================================================================
-- 3) Trigger function — INSERT-only (Pitfall 5 Option A)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.vagas_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Only generate if NEW.slug is NULL or empty (allows explicit override by RH if ever needed)
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_unique_vaga_slug(NEW.titulo);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vagas_set_slug_trigger ON public.vagas;

CREATE TRIGGER vagas_set_slug_trigger
  BEFORE INSERT ON public.vagas
  FOR EACH ROW
  EXECUTE FUNCTION public.vagas_set_slug();

COMMENT ON TRIGGER vagas_set_slug_trigger ON public.vagas IS
  'Phase 4: Auto-populate slug from titulo on INSERT only. UPDATE intentionally NOT covered (URL stability > self-updating). See .planning/phases/04-vagas-candidatura/04-RESEARCH.md Pitfall 5.';

-- =========================================================================
-- 4) Backfill existing rows with NULL/empty slug (defensive)
-- =========================================================================
UPDATE public.vagas
SET slug = public.generate_unique_vaga_slug(titulo, id)
WHERE slug IS NULL OR slug = '';

-- =========================================================================
-- 5) Ensure UNIQUE constraint on slug (idempotent)
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'vagas'
      AND indexdef LIKE '%UNIQUE%(slug)%'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX vagas_slug_unique_idx ON public.vagas (slug)';
  END IF;
END $$;

-- =========================================================================
-- 6) Grants
-- =========================================================================
REVOKE ALL ON FUNCTION public.slugify(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_unique_vaga_slug(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.slugify(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_unique_vaga_slug(text, uuid) TO service_role;

COMMIT;
