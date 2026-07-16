-- =============================================================================
-- Migration B: funil_kpis SECURITY DEFINER RPC (PII-safe KPI aggregates)
--              + rh_le_historico WR-04 vaga-scoped hardening
-- Date: 2026-07-15
-- Phase: 32 (Fechar os Dois Vazamentos Vivos) / Plan 32-03
-- Requirement: SEG-02 — the funil KPI aggregation is vaga-scoped BY CONSTRUCTION
--              (the DEFINER RPC re-imposes owner-scope internally) and the audit-trail
--              read is vaga-scoped (RLS), no longer role-only.
-- =============================================================================
--
-- WHY THIS MIGRATION (two composed, shipped-pattern copies — belt-and-suspenders)
--
-- Part 1 — funil_kpis (the vaga-scoped, PII-free aggregate channel Phase 34's dashboard
--   consumes). Clones the DEFINER/jsonb/REVOKE-GRANT discipline of get_avaliacao_status
--   (20260712100003:56-116). It aggregates over historico_candidatura but returns ONLY
--   PII-free numbers — median time per stage (percentile_cont over LEAD-derived
--   transition deltas), raw stage->stage conversion counts, and current volume by
--   etapa_atual — all scoped to the caller's owned vagas (administrador sees all;
--   p_vaga_id narrows, still owner-checked). The CTEs project only candidatura_id /
--   etapa_* / criado_em / vaga_id — never the transition-author column, never any
--   candidatos column — so the payload is PII-safe by construction (RESEARCH #3).
--
-- Part 2 — rh_le_historico (the role-only audit-trail read that Phase 24 explicitly
--   deferred at 20260706110004:126-131 and never swept — the second live horizontal
--   leak). Hardened to the WR-04 vaga-scoped predicate by copying redacao_rh_select
--   (20260706110004:94-104) verbatim. historico_candidatura has NO direct vaga_id, so
--   the scope goes via candidatura_id -> candidaturas -> vagas.created_by. The RPC does
--   NOT depend on this policy (DEFINER bypasses row RLS); the policy closes the DIRECT
--   client SELECT leak on the audit trail. The candidate own-row historico read policy
--   (20260607000006:61-70) is left intact.
--
-- No write policy is added on historico_candidatura: the audit trail is written ONLY by
-- the SECURITY INVOKER avancar_etapa() trigger inside the authorized candidaturas UPDATE
-- transaction (20260607000006:79-81) — do NOT touch that trigger (near-miss P27).
--
-- SECURITY (Pitfall 2 / P24): SET search_path='' with every object schema-qualified
-- (public./auth.). auth.uid()/auth.jwt() read the per-request request.jwt.claims GUC and
-- survive SECURITY DEFINER (the "Phase-6 proof"). Structural greps confirm the shape; the
-- JWT-impersonated behavioral smoke (seg32_smokes.sql b/c/d/e) is the LOAD-BEARING gate.
--
-- APPLY MECHANIC (D-22 / CLAUDE.md §Migrations): apply via Supabase MCP apply_migration
-- (bypasses SQLSTATE 42601 on $$ bodies + adjacent REVOKE/GRANT). Do NOT run db push for
-- this file. NO outer BEGIN;…COMMIT; wrapper. Authored here (32-03); APPLIED + reconciled
-- (schema_migrations) + database.types.ts regen in 32-04, AFTER which seg32_smokes.sql runs.
-- =============================================================================

-- ── Part 1 — funil_kpis: PII-safe operational KPIs over the funnel audit trail ──────────────
CREATE OR REPLACE FUNCTION public.funil_kpis(p_vaga_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- Scope guards read the request.jwt GUC → survive SECURITY DEFINER (Phase-6 proof).
  v_is_admin boolean := (auth.jwt() #>> '{app_metadata,role}') = 'administrador';
  v_uid      uuid    := auth.uid();
  r          jsonb;
BEGIN
  WITH scoped_hist AS (
    -- Audit-trail rows for candidaturas of vagas the caller owns (admin = all);
    -- optional p_vaga_id narrows further (still owner-checked by the same join).
    -- PII-SAFE PROJECTION: candidatura_id / etapa_* / criado_em / vaga_id ONLY —
    -- never the transition-author column, never any candidatos column.
    SELECT h.candidatura_id,
           h.etapa_de,
           h.etapa_para,
           h.criado_em,
           c.vaga_id
      FROM public.historico_candidatura h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
      JOIN public.vagas        v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL   -- WR-02: soft-deleted candidaturas must not inflate the KPIs
  ),
  deltas AS (
    -- time-in-stage(etapa_para) = next transition's criado_em − this criado_em.
    -- NULL for each candidatura's last (in-progress) transition → excluded from the median
    -- (Pitfall 5: an in-progress stage has no exit transition, must not skew the median).
    SELECT etapa_para AS stage,
           (LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em) - criado_em) AS dwell
      FROM scoped_hist
  ),
  median AS (
    SELECT stage,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM dwell)) AS median_seconds
      FROM deltas
     WHERE dwell IS NOT NULL
     GROUP BY stage
  ),
  conversion AS (
    -- raw stage→stage transition counts (closed-cohort refinement K4 deferred to P34).
    SELECT etapa_de  AS from_stage,
           etapa_para AS to_stage,
           COUNT(*)  AS n
      FROM scoped_hist
     WHERE etapa_de IS NOT NULL
     GROUP BY etapa_de, etapa_para
  ),
  volume AS (
    -- current volume by stage (candidaturas presently in each etapa_atual, owner-scoped;
    -- Assumption A1 — current distribution, not cumulative entries).
    SELECT c.etapa_atual AS stage,
           COUNT(*)      AS n
      FROM public.candidaturas c
      JOIN public.vagas       v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL   -- WR-02: exclude soft-deleted candidaturas from volume
     GROUP BY c.etapa_atual
  )
  SELECT jsonb_build_object(
    'median_time_per_stage',
      COALESCE((SELECT jsonb_object_agg(stage, round(median_seconds)::bigint) FROM median), '{}'::jsonb),
    'conversion_stage_to_stage',
      COALESCE((SELECT jsonb_agg(jsonb_build_object('de', from_stage, 'para', to_stage, 'n', n)) FROM conversion), '[]'::jsonb),
    'volume_by_stage',
      COALESCE((SELECT jsonb_object_agg(stage, n) FROM volume), '{}'::jsonb)
  ) INTO r;

  RETURN r;   -- aggregates ONLY — no author identity, no candidate id/name/email (PII-safe).
END;
$$;

REVOKE ALL ON FUNCTION public.funil_kpis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.funil_kpis(uuid) TO authenticated;

COMMENT ON FUNCTION public.funil_kpis(uuid) IS
  'Phase 32 / SEG-02 (32-03): KPIs operacionais do funil, PII-safe — mediana de tempo por etapa (percentile_cont sobre deltas LEAD de criado_em, exclui a ultima transicao em andamento), conversao bruta etapa->etapa e volume por etapa_atual. Escopo interno as vagas do chamador (v.created_by = auth.uid(); administrador ve todas; p_vaga_id estreita, ainda owner-checked). Retorna um unico jsonb apenas com agregados — nunca identidade do candidato (sem coluna de autor da transicao, sem id/nome/email). SECURITY DEFINER SET search_path=''; REVOKE PUBLIC + GRANT authenticated. Prova comportamental: seg32_smokes.sql (b)/(d)/(e).';

-- ── Part 2 — rh_le_historico WR-04 hardening (the P24-deferred sweep) ────────────────────────
-- historico_candidatura has NO direct vaga_id → scope via candidatura_id -> candidaturas -> vagas.
-- Copy of redacao_rh_select (20260706110004:94-104). Keep the (select auth.jwt() …)/(select
-- auth.uid()) subquery-wrapping verbatim (planner-cache idiom). The candidate own-row historico
-- read policy (20260607000006:61-70) is NOT touched.
DROP POLICY IF EXISTS rh_le_historico ON public.historico_candidatura;
CREATE POLICY rh_le_historico ON public.historico_candidatura
  FOR SELECT TO authenticated
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  );
