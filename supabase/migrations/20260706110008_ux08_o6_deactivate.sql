-- =============================================================================
-- Migration: UX-08 — deactivate the 4 political-opinion O6 Big Five items
--            {28, 58, 88, 118} (LGPD special-category) + get_bigfive_itens filters
--            the active set (reversible ativo flag, NOT a hard DELETE)
-- Date: 2026-07-06
-- Phase: 24 (Blindagem de Segurança / PII / LGPD)
-- Requirement: UX-08
-- =============================================================================
--
-- PURPOSE
-- The IPIP-NEO-120 item bank seeds 4 political-opinion items in facet 28 (O6,
-- "Liberalism/Values") — verified live in 24-LIVE-STATE.md (A5): item_id
-- IN (28, 58, 88, 118) are all dimensao='O', faceta=28; 88 & 118 are reverse_keyed.
-- Asking a candidate to declare political opinion is LGPD special-category data
-- (Art. 5º, II — "convicção política") and must NOT be presented in a hiring
-- assessment. This migration removes the exposure WITHOUT breaking the psychometric
-- calculation:
--   * a reversible `ativo` boolean flag (NOT a hard DELETE) — M5 flips it back to
--     true for the authoral non-political O6 replacement (deferred to M5);
--   * get_bigfive_itens() filters `WHERE b.ativo` → the candidate never sees the 4
--     political items (the administered instrument becomes 116 items, non-contiguous).
--
-- SCORER LOCKSTEP (RESEARCH Pitfall 3): the server-side scorer
-- (supabase/functions/_shared/bigfive-scoring.ts) is updated IN THE SAME PLAN (24-07)
-- to accept 116 items, drop 88/118 from the reverse-key set (O reversed 12→10), and
-- prorate the O domain ×6/5 so the wired Johnson O norm stays valid. Removing the 4
-- items drops the whole O6 facet → O domain 24→20 items; the prorate keeps O
-- comparable. N/E/A/C are untouched.
--
-- REVERSIBILITY (M5): to restore the O6 facet, seed 4 non-political O6 items (or flip
-- these back) and set `ativo = true`; the scorer prorate reverts to 120/no-prorate.
--
-- RNF-07a: this migration writes NOTHING to candidaturas and never auto-rejects.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (CLAUDE.md §Commands / D-22). The
-- Supabase CLI driver wraps each migration in its own implicit transaction; an outer
-- BEGIN/COMMIT combined with a $$ function body + adjacent GRANT/REVOKE breaks the
-- prepared-statement boundary parser and raises SQLSTATE 42601 at push time. This
-- file has one $$ body (get_bigfive_itens) + adjacent GRANT/REVOKE → apply via the
-- Supabase MCP execute_sql / SQL-Editor workaround if `db push --linked` trips.
-- NOT applied here — PROD application is the 24-08 apply wave; the submit-bigfive-final
-- EF (which bundles the scorer) REDEPLOYS in 24-09 (bundle-freeze).
-- =============================================================================

-- Reversible deactivation flag (idempotent — the column does not exist yet per
-- 24-LIVE-STATE.md, but ADD COLUMN IF NOT EXISTS keeps re-runs safe). DEFAULT true so
-- every existing/seeded item stays active; only the 4 political items are flipped off.
ALTER TABLE public.bigfive_itens
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.bigfive_itens.ativo IS
  'Phase 24 / UX-08: when false the item is NOT administered (get_bigfive_itens filters it out). The 4 political-opinion O6 items {28,58,88,118} (LGPD special-category) are set false; reversible for the M5 authoral replacement.';

-- Deactivate exactly the 4 political-opinion O6 items (LGPD special-category).
-- NOT a hard DELETE — the rows stay for auditability + the M5 re-activation.
UPDATE public.bigfive_itens
   SET ativo = false
 WHERE item_id IN (28, 58, 88, 118);

-- =============================================================================
-- Recreate get_bigfive_itens() adding the `WHERE b.ativo` filter — same signature,
-- same projection (item_id, texto, ordem — NEVER the scoring key), same SECURITY
-- DEFINER + SET search_path = '' + REVOKE/GRANT. Now returns the 116 active items in
-- presentation order; the candidate never sees the deactivated political items.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_bigfive_itens()
RETURNS TABLE (item_id int, texto text, ordem int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.item_id, b.texto, b.ordem
    FROM public.bigfive_itens b
   WHERE b.ativo
   ORDER BY b.ordem;
$$;

REVOKE ALL ON FUNCTION public.get_bigfive_itens() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bigfive_itens() TO authenticated;
