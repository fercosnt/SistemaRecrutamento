-- =============================================================================
-- Phase 24 / Plan 24-04 — SEC-05 / SEC-06 / SEC-08
-- Vaga-ownership horizontal scoping for the RH SELECT/UPDATE leak
-- =============================================================================
-- PROBLEM (24-LIVE-STATE.md, live-verified against PROD 2026-07-07):
--   `analise_candidato_vaga.rh_le_analise`, `comparativo_solicitado.rh_le_comparativo`,
--   `candidaturas.{rh_le_candidaturas, rh_avanca_etapa}` and `redacoes_candidato.{redacao_rh_select,
--   redacao_rh_update}` are ROLE-ONLY (role ∈ {rh, administrador}). A recruiter therefore reads —
--   and, on candidaturas/redacoes, writes — EVERY other recruiter's vaga rows (horizontal / IDOR).
--
-- FIX: re-emit the SHIPPED WR-04 predicate (administrador bypass OR rh-owns-the-vaga) verbatim.
--   This is verbatim precedent — the WR-04 predicate already ships on 4 tables (Phase 14/15):
--   scores_candidato / entrevista_analises / entrevista_guias / decisao_final. The failure mode is
--   inventing a new predicate instead of copying the one that already ships.
--   Template: supabase/migrations/20260625000001_phase14_gap_closure.sql:294-327 (WR-04).
--   `(select auth.jwt() … )` / `(select auth.uid())` is the planner-cache idiom — keep it verbatim.
--
-- SCOPE MECHANICS:
--   analise_candidato_vaga.vaga_id, comparativo_solicitado.vaga_id and candidaturas.vaga_id exist
--   DIRECTLY → scope on `vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid()))`.
--   redacoes_candidato has NO direct vaga_id → scope via the candidaturas→vagas JOIN on candidatura_id.
--
-- OUT OF SCOPE (do NOT touch here):
--   • the candidate's own-row candidatura SELECT policy stays intact.
--   • the candidate own-row essay read policy owned by 24-03 (disjoint migration) stays intact.
--   • the client-INSERT-denied essay policy stays denied (with_check false).
--   • reprocessar_analise — ALREADY vaga-scoped (20260610000003:52-59); regression-guarded in the
--     smoke, NOT re-authored.
--   • scores_candidato / entrevista_analises / entrevista_guias / decisao_final — ALREADY WR-04-scoped
--     (Phase 14/15); regression-guard only, NOT re-scoped here.
--
-- INVARIANTS: only SELECT/UPDATE tightening — NO new write path to candidaturas; nothing
--   auto-rejects (RNF-07a). administrador is never blinded (bypass branch on every predicate).
--
-- PROD apply is 24-08 (Supabase MCP apply_migration / SQL Editor — bypasses the 42601 pooler bug).
-- FILE ONLY here. No outer BEGIN;…COMMIT; wrapper (the CLI/MCP wraps each migration itself — D-22).
-- =============================================================================

-- ── SEC-05 — analise_candidato_vaga: recrutador só lê análises das SUAS vagas ──────────────
-- Was role-only (20260610000001_analise_tables.sql:78-82). vaga_id is on the table directly.
DROP POLICY IF EXISTS rh_le_analise ON public.analise_candidato_vaga;
CREATE POLICY rh_le_analise ON public.analise_candidato_vaga
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid())))
  );

-- ── SEC-05 — comparativo_solicitado: mesmo predicado, mesmo vaga_id direto ─────────────────
-- Was role-only (20260610000001_analise_tables.sql:85-89).
DROP POLICY IF EXISTS rh_le_comparativo ON public.comparativo_solicitado;
CREATE POLICY rh_le_comparativo ON public.comparativo_solicitado
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid())))
  );

-- ── SEC-08 — candidaturas (base table) SELECT: recrutador só vê candidaturas das SUAS vagas ─
-- Was role-only (20260607000006_rls_policies_m2_backbone.sql:45-49). vaga_id is on the table.
-- The candidate own-row candidatura SELECT policy is left UNTOUCHED.
DROP POLICY IF EXISTS rh_le_candidaturas ON public.candidaturas;
CREATE POLICY rh_le_candidaturas ON public.candidaturas
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid())))
  );

-- ── SEC-08 — candidaturas UPDATE (pipeline advance): USING **and** WITH CHECK both vaga-scoped ─
-- Was role-only USING+WITH CHECK (20260607000006_rls_policies_m2_backbone.sql:54-58). A non-owner
-- recruiter is now denied both the row (USING) and the resulting row (WITH CHECK). The avancar_etapa
-- trigger still validates the transition + writes the audit row inside the authorized UPDATE txn.
-- NO new write path — this only TIGHTENS the existing scoped UPDATE (RNF-07a: nothing auto-rejects).
DROP POLICY IF EXISTS rh_avanca_etapa ON public.candidaturas;
CREATE POLICY rh_avanca_etapa ON public.candidaturas
  FOR UPDATE
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid())))
  )
  WITH CHECK (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND vaga_id IN (SELECT id FROM public.vagas WHERE created_by = (select auth.uid())))
  );

-- ── SEC-06 (A30 include) — redacoes_candidato RH policies: scope via candidaturas→vagas JOIN ──
-- redacoes_candidato has NO direct vaga_id (20260623100003:124-135 were role-only). Scope on
-- candidatura_id through the JOIN. The review-fields-only BEFORE UPDATE trigger stays the column
-- guard (this migration only tightens WHICH rows the recruiter may touch, not which columns).
-- The candidate own-row essay SELECT (24-03) and the client-INSERT-denied essay policy are NOT touched.
DROP POLICY IF EXISTS redacao_rh_select ON public.redacoes_candidato;
CREATE POLICY redacao_rh_select ON public.redacoes_candidato
  FOR SELECT TO authenticated
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  );

DROP POLICY IF EXISTS redacao_rh_update ON public.redacoes_candidato;
CREATE POLICY redacao_rh_update ON public.redacoes_candidato
  FOR UPDATE TO authenticated
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  )
  WITH CHECK (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  );

-- ── DEFERRED (RESEARCH Open Q1 / A30) — remaining role-only RH SELECT surfaces ──────────────
-- `devolutivas_candidato` (rh_le_devolutivas, 20260612000002:57) and
-- `historico_candidatura` (rh_le_historico, 20260607000006:74) carry the SAME role-only gap but are
-- LOWER-sensitivity (devolutiva copy / audit trail) and are DEFERRED to Phase 25's funil-RH sweep,
-- where the RH kanban/edit surfaces are consolidated. They are intentionally NOT swept here to keep
-- 24-04 to the high-value analysis/comparative/candidaturas/verdict horizontal leak.
