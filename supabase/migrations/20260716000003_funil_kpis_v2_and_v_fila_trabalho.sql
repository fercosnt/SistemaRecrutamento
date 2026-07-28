-- =============================================================================
-- Phase 34 / Plan 34-01 — funil_kpis v2 (+4 KPI-04 keys) + v_fila_trabalho view
-- =============================================================================
-- KPI-04: extend the LIVE funil_kpis DEFINER RPC IN-PLACE with 4 new keys
--   (time_to_hire, knockout_rate, drop_per_stage, no_show_rate) — the 3 existing
--   keys (median_time_per_stage, conversion_stage_to_stage, volume_by_stage) are
--   PRESERVED VERBATIM, re-derived from the LIVE body via pg_get_functiondef
--   (the file was already CREATE-OR-REPLACE'd once post-ship — commit 853cb03 WR-02
--   deleted_at guard — so the git file lags the live body; DBMIG-02 near-miss precedent).
-- KPI-01/03: new security_invoker view v_fila_trabalho exposing entrou_etapa_em
--   (time-in-current-stage), scope INHERITED from rh_le_candidaturas (no DEFINER).
--
-- Applied to PROD via Supabase MCP apply_migration (bypasses 42601 on $$ bodies).
-- NO explicit BEGIN;/COMMIT; wrapper (D-22). Signature stays single uuid (v1 all-time cohort).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Part A · v_fila_trabalho — cross-vaga work queue source (KPI-01/03)
-- ---------------------------------------------------------------------------
-- security_invoker=true → the querying RH's rh_le_candidaturas vaga-scoped RLS
-- applies; the view does NOT launder scope. entrou_etapa_em = the most recent
-- historico transition (= when the candidatura entered its current etapa), with
-- coalesce fallbacks for candidaturas that predate the historico backbone.
CREATE OR REPLACE VIEW public.v_fila_trabalho
WITH (security_invoker = true) AS
  SELECT c.id                                                             AS candidatura_id,
         c.vaga_id                                                        AS vaga_id,
         v.titulo                                                         AS vaga_titulo,
         c.candidato_id                                                   AS candidato_id,
         ca.nome_completo                                                 AS candidato_nome,
         c.etapa_atual                                                    AS etapa_atual,
         c.status                                                         AS status,
         GREATEST(MAX(h.criado_em), c.data_candidatura, c.created_at)     AS entrou_etapa_em
    FROM public.candidaturas c
    JOIN public.vagas        v  ON v.id  = c.vaga_id
    LEFT JOIN public.candidatos ca ON ca.id = c.candidato_id
    LEFT JOIN public.historico_candidatura h ON h.candidatura_id = c.id
   WHERE c.deleted_at IS NULL
     AND c.etapa_atual NOT IN ('aprovado', 'rejeitado')
   GROUP BY c.id, c.vaga_id, v.titulo, c.candidato_id, ca.nome_completo,
            c.etapa_atual, c.status, c.data_candidatura, c.created_at;

GRANT SELECT ON public.v_fila_trabalho TO authenticated;

COMMENT ON VIEW public.v_fila_trabalho IS
  'Phase 34 / KPI-01/03: cross-vaga work queue. security_invoker=true → scope is '
  'inherited from the RH rh_le_candidaturas vaga-scoped RLS (NOT a DEFINER view). '
  'entrou_etapa_em = MAX(historico.criado_em) (when the candidatura entered its current '
  'etapa), coalesced to data_candidatura/created_at. Terminals (aprovado/rejeitado) excluded. '
  'SLA aging/breach thresholds are applied client-side (SLA_POR_ETAPA constant).';

-- ---------------------------------------------------------------------------
-- Part B · funil_kpis v2 — 3 existing keys preserved + 4 new (KPI-02/04)
-- ---------------------------------------------------------------------------
-- Re-derived from pg_get_functiondef('public.funil_kpis(uuid)') LIVE output:
-- DECLARE + scoped_hist/deltas/median/conversion/volume CTEs + the 3 keys are
-- BYTE-PRESERVED; 4 CTEs (tth/ko/drop_flow/ns) + 4 keys appended, all reusing the
-- same (v_is_admin OR v.created_by=v_uid) AND (p_vaga_id…) AND deleted_at IS NULL scope.
CREATE OR REPLACE FUNCTION public.funil_kpis(p_vaga_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_is_admin boolean := (auth.jwt() #>> '{app_metadata,role}') = 'administrador';
  v_uid      uuid    := auth.uid();
  r          jsonb;
BEGIN
  WITH scoped_hist AS (
    SELECT h.candidatura_id, h.etapa_de, h.etapa_para, h.criado_em, c.vaga_id
      FROM public.historico_candidatura h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
      JOIN public.vagas        v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
  ),
  deltas AS (
    SELECT etapa_para AS stage,
           (LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em) - criado_em) AS dwell
      FROM scoped_hist
  ),
  median AS (
    SELECT stage, percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM dwell)) AS median_seconds
      FROM deltas WHERE dwell IS NOT NULL GROUP BY stage
  ),
  conversion AS (
    SELECT etapa_de AS from_stage, etapa_para AS to_stage, COUNT(*) AS n
      FROM scoped_hist WHERE etapa_de IS NOT NULL GROUP BY etapa_de, etapa_para
  ),
  volume AS (
    SELECT c.etapa_atual AS stage, COUNT(*) AS n
      FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
     GROUP BY c.etapa_atual
  ),
  -- KPI-04 · time_to_hire: median inscrição→aprovado seconds (closed by definition).
  tth AS (
    SELECT EXTRACT(EPOCH FROM (sh.criado_em - COALESCE(c.data_candidatura, c.created_at))) AS secs
      FROM scoped_hist sh
      JOIN public.candidaturas c ON c.id = sh.candidatura_id
     WHERE sh.etapa_para = 'aprovado'
       AND COALESCE(c.data_candidatura, c.created_at) IS NOT NULL
       AND sh.criado_em >= COALESCE(c.data_candidatura, c.created_at)
  ),
  -- KPI-04 · knockout_rate: auto-reject-at-inscription / total (plain candidaturas column, PII-free).
  ko AS (
    SELECT count(*) FILTER (WHERE c.motivo_rejeicao = 'knockout_automatico') AS knockouts,
           count(*)                                                          AS total
      FROM public.candidaturas c
      JOIN public.vagas v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
  ),
  -- KPI-04 · drop_per_stage: closed-cohort per-stage drop (exited denominator; inscricao self-loop + terminals excluded).
  drop_flow AS (
    SELECT sh.etapa_de AS stage,
           count(*) FILTER (WHERE sh.etapa_para = 'rejeitado') AS dropped,
           count(*)                                            AS saidas
      FROM scoped_hist sh
     WHERE sh.etapa_de IS NOT NULL
       AND sh.etapa_de <> sh.etapa_para
       AND sh.etapa_de NOT IN ('aprovado', 'rejeitado')
     GROUP BY sh.etapa_de
  ),
  -- KPI-04 · no_show_rate: from agendamentos_entrevista (decided attendance only; 0-agendamento → taxa=null).
  ns AS (
    SELECT count(*) FILTER (WHERE a.compareceu = false) AS no_shows,
           count(*)                                     AS total
      FROM public.agendamentos_entrevista a
      JOIN public.candidaturas c ON c.id = a.candidatura_id
      JOIN public.vagas        v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
       AND a.deleted_at IS NULL
       AND a.compareceu IS NOT NULL
  )
  SELECT jsonb_build_object(
    'median_time_per_stage', COALESCE((SELECT jsonb_object_agg(stage, round(median_seconds)::bigint) FROM median), '{}'::jsonb),
    'conversion_stage_to_stage', COALESCE((SELECT jsonb_agg(jsonb_build_object('de', from_stage, 'para', to_stage, 'n', n)) FROM conversion), '[]'::jsonb),
    'volume_by_stage', COALESCE((SELECT jsonb_object_agg(stage, n) FROM volume), '{}'::jsonb),
    'time_to_hire', (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY secs))::bigint FROM tth WHERE secs IS NOT NULL),
    'knockout_rate', (SELECT jsonb_build_object(
        'knockouts', knockouts, 'total', total,
        'taxa', CASE WHEN total > 0 THEN round(knockouts::numeric / total, 4) ELSE NULL END) FROM ko),
    'drop_per_stage', COALESCE((SELECT jsonb_object_agg(stage, jsonb_build_object(
        'dropped', dropped, 'saidas', saidas,
        'taxa', CASE WHEN saidas > 0 THEN round(dropped::numeric / saidas, 4) ELSE NULL END)) FROM drop_flow), '{}'::jsonb),
    'no_show_rate', (SELECT jsonb_build_object(
        'no_shows', no_shows, 'total', total,
        'taxa', CASE WHEN total > 0 THEN round(no_shows::numeric / total, 4) ELSE NULL END) FROM ns)
  ) INTO r;
  RETURN r;
END;
$function$;

REVOKE ALL ON FUNCTION public.funil_kpis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.funil_kpis(uuid) TO authenticated;

COMMENT ON FUNCTION public.funil_kpis(uuid) IS
  'Phase 32 (3 keys) + Phase 34 KPI-04 (4 keys). SECURITY DEFINER, owner-scoped '
  '(v_is_admin OR vagas.created_by=auth.uid()), PII-free by construction (never ator/candidatos). '
  'Keys: median_time_per_stage, conversion_stage_to_stage, volume_by_stage (P32) + time_to_hire '
  '(median inscrição→aprovado seconds), knockout_rate {knockouts,total,taxa}, drop_per_stage '
  '(closed-cohort per-stage), no_show_rate {no_shows,total,taxa} (0-agendamento → taxa=null). '
  'Single-arg (uuid) — all-time cohort; a rolling window would be a new overload. Proven by supabase/tests/funil34_kpis_smokes.sql.';
