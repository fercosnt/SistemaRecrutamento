-- =============================================================================
-- Migration: Phase 15 code-review gap closure (WR-03)
-- Date: 2026-06-25
-- Phase: 15 (decis-o-final-audit-vel-lgpd-art-20)
-- Requirement: DECISAO-03 / DECISAO-04 / LGPD-03 (15-REVIEW.md WR-03)
-- =============================================================================
--
-- PURPOSE
-- Closes WR-03: the RH-side decision reads (decisaoService.getDecisaoAtual /
-- listFinalistas) were bounded ONLY by the Phase-6 rh_le_decisao_final RLS policy,
-- which is role-only — `(auth.jwt()#>>'{app_metadata,role}') IN ('rh','administrador')`
-- with NO vagas.created_by ownership scope. So any authenticated RH could read the
-- `decisao`, `em`, and the internal `justificativa` of a candidatura on a vaga owned
-- by a DIFFERENT recruiter (horizontal-access gap), and listFinalistas enumerated
-- decisao_final rows of any vaga. The new consolidar-decisao-final EF already enforces
-- per-vaga ownership for role='rh' (index.ts:267), so the page's direct table reads
-- side-stepped the ownership boundary the EF established.
--
-- FIX: DROP the broad role-only SELECT policy and CREATE an ownership-scoped one,
-- mirroring the Phase-14 WR-04 precedent (rh_le_scores / rh_le_entrevista_analises in
-- supabase/migrations/20260625000001_phase14_gap_closure.sql:314-327): administrador
-- bypasses; role='rh' must own the candidatura's vaga via
-- candidaturas → vagas.created_by = auth.uid().
--
-- UNTOUCHED: candidato_le_propria_decisao (the LGPD Art. 20 own-row candidate read)
-- and decisao_final_no_client_insert (WITH CHECK(false)) are NOT referenced — the
-- candidate own-row scope and the client-INSERT block stay exactly as shipped.
--
-- AUTHZ idiom (Phase-6 proof): auth.uid() / auth.jwt() read the request.jwt GUC and
-- survive RLS evaluation. `(select auth.…())` wraps the call so the planner caches it
-- once per statement (the shipped policy idiom).
--
-- INVARIANT (RNF-07a): this migration only TIGHTENS a SELECT policy — no path writes
-- candidaturas, advances the funil, or auto-rejects. It narrows RH read access; the
-- human always decides.
--
-- IDEMPOTENCY: DROP POLICY IF EXISTS before CREATE POLICY → re-runnable.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (CLAUDE.md §Commands — the Supabase
-- CLI driver wraps each migration in its own implicit transaction; an outer BEGIN/COMMIT
-- adjacent to other statements is the 42601-risk shape). This migration is plain DDL
-- (DROP/CREATE POLICY), no $$ body.
-- AUTHORED-NOT-APPLIED: the orchestrator applies this LIVE to PROD AFTER the executor
-- returns, with the user's authorization. NOT applied here.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- WR-03: vaga-ownership-scoped RH SELECT policy on decisao_final
-- ─────────────────────────────────────────────────────────────────────────────
-- The RH read path was role-only; scope it to the RH's own vagas (administrador
-- bypasses). Join: decisao_final.candidatura_id → candidaturas.vaga_id → vagas.created_by.
-- candidato_le_propria_decisao + decisao_final_no_client_insert stay intact.
DROP POLICY IF EXISTS rh_le_decisao_final ON public.decisao_final;
CREATE POLICY rh_le_decisao_final ON public.decisao_final
  FOR SELECT
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR (
      (select auth.jwt() #>> '{app_metadata,role}') = 'rh'
      AND candidatura_id IN (
        SELECT c.id FROM public.candidaturas c
          JOIN public.vagas v ON v.id = c.vaga_id
         WHERE v.created_by = (select auth.uid())
      )
    )
  );

COMMENT ON POLICY rh_le_decisao_final ON public.decisao_final IS
  'Phase 15 / WR-03 (15-07 gap closure): leitura de decisao_final escopada por posse da vaga. administrador le tudo; rh le APENAS candidaturas de vagas que possui (candidaturas.vaga_id -> vagas.created_by = auth.uid()). Fecha o gap de acesso horizontal (RH nao-dono lia decisao/justificativa de pares). Espelha o precedente Phase-14 WR-04 (rh_le_scores / rh_le_entrevista_analises). candidato_le_propria_decisao + decisao_final_no_client_insert permanecem intactas.';
