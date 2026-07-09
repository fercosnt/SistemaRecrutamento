-- =============================================================================
-- Phase 24 / Plan 24-08 / SEC-08 REMEDIATION — close the duplicate-policy OR-leak
-- =============================================================================
-- 24-08 BEHAVIORAL smoke (2026-07-09, simulated non-owner RH JWT under RLS) found a
-- leak that the structural check missed: a non-owner recruiter still saw ALL 8
-- candidaturas even though 24-04 swapped rh_le_candidaturas / rh_avanca_etapa to the
-- WR-04 vaga-scoped predicate. analise_candidato_vaga and comparativo_solicitado
-- correctly returned 0 — only candidaturas leaked.
--
-- ROOT CAUSE: candidaturas carried a SECOND, M1-era pair of RH policies —
--   "RH vê candidaturas de suas vagas" (SELECT) and "RH atualiza candidaturas" (UPDATE)
-- whose NAMES imply vaga-scoping but whose predicates are role-only
-- (EXISTS active usuarios_rh). Permissive RLS policies are OR-combined, so this
-- role-only branch re-opened the horizontal read/write that the WR-04 swap closed.
-- 24-04 swapped only the M2 pair (rh_le_candidaturas / rh_avanca_etapa) and left the
-- M1 duplicates untouched. SEC-08 is only truly closed once EVERY RH policy on
-- candidaturas is vaga-scoped.
--
-- FIX:
--   (1) DROP the two redundant M1-era role-only duplicates — they are superseded by the
--       M2 vaga-scoped pair (rh_le_candidaturas SELECT, rh_avanca_etapa UPDATE).
--   (2) Re-emit rh_le_candidaturas preserving the M1 SELECT semantics the dropped policy
--       enforced (RH does NOT see drafts/soft-deleted: deleted_at IS NULL AND
--       is_rascunho = false), now AND-scoped to the recruiter's own vagas. administrador
--       keeps the unfiltered bypass. UPDATE stays owned by rh_avanca_etapa (already
--       vaga-scoped USING + WITH CHECK from 24-04).
--
-- INVARIANTS: only SELECT/UPDATE tightening; the candidate own-row policies + the anon
--   duplicate-check policy are untouched; nothing writes candidaturas or auto-rejects
--   (RNF-07a). No BEGIN/COMMIT wrapper.
-- =============================================================================

-- (1) Drop the redundant M1-era role-only RH duplicates (the OR-leak branch).
DROP POLICY IF EXISTS "RH vê candidaturas de suas vagas" ON public.candidaturas;
DROP POLICY IF EXISTS "RH atualiza candidaturas" ON public.candidaturas;

-- (2) Re-emit the canonical vaga-scoped RH SELECT, preserving the M1 non-draft filter.
DROP POLICY IF EXISTS rh_le_candidaturas ON public.candidaturas;
CREATE POLICY rh_le_candidaturas ON public.candidaturas
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND deleted_at IS NULL
        AND is_rascunho = false
        AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid())))
  );
