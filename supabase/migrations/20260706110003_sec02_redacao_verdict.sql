-- =============================================================================
-- Phase 24 / Plan 24-03 / SEC-02 — blindar o veredito da redação do candidato
-- =============================================================================
-- Trust boundary: candidate JWT → PostgREST. RLS is ROW-level only and NEVER hides
-- a column ([[reference_select_star_leaks_pii]]); a candidato who issues
--   GET /rest/v1/redacoes_candidato?select=red_flag_etico   (or any verdict column)
-- on their OWN row must obtain ZERO verdict columns.
--
-- ⚠️ THE PHASE-24 #1 LANDMINE (RESEARCH Pitfall 1 / 24-LIVE-STATE.md): RH reads the
--    verdict via the SAME `authenticated` Postgres role as the candidate. So a column
--    REVOKE on redacoes_candidato — the mechanism SEC-01/SEC-07 use — would ALSO blind
--    RH. It is DELIBERATELY EXCLUDED here. The correct mechanism (get it right):
--
--   (1) DROP the candidate's base-table row-SELECT policy `redacao_candidato_select`.
--       After this the candidato has NO SELECT policy on redacoes_candidato → RLS
--       returns 0 rows on ANY direct base-table read (every verdict column included).
--       This is the real teeth (row-deny), NOT a column REVOKE.
--   (2) A new SECURITY DEFINER reader `get_minha_redacao(p_candidatura_id)` that
--       ENFORCES ownership INSIDE the function (candidatos.user_id = auth.uid() — the
--       reprocessar_analise:56-59 idiom; auth.uid() is GUC-based and survives DEFINER)
--       and projects ONLY the safe columns already named by MinhaRedacaoRow:
--       id / pergunta_id / ordem / texto / word_count / submetida_em / status_analise —
--       NEVER a verdict column (analise_ia, scores_dimensao, score_ponderado_0_100,
--       classificacao_cor, red_flag_etico, flags, scores_humanos, notas_revisor,
--       decisao_revisor) and NEVER bloqueio_avanco. The candidate reads their own
--       redação EXCLUSIVELY through this RPC (client rewired in the SAME plan —
--       redacaoService — so "minha redação" is never left blank, RESEARCH Pitfall 2 / A7).
--   (3) status_analise is COARSENED (RESEARCH discretion note): only 'concluida' is
--       returned verbatim; every other state (pendente / processando / falhou /
--       pendente_humano) maps to a neutral 'em_analise'. This prevents the
--       pendente_humano state from leaking "you triggered a red flag / human review".
--
-- RH READS ARE UNTOUCHED: redacao_rh_select / redacao_rh_update / redacao_no_client_insert
--   stay exactly as authored in 20260623100003_redacoes_candidato.sql:124-135. RH keeps
--   its full base-table verdict read as `authenticated`. NO column REVOKE anywhere.
--
-- RNF-07a: nothing here writes candidaturas or auto-rejects.
-- Applied via Supabase MCP in 24-08 (bypasses 42601). NO outer BEGIN/COMMIT wrapper
-- (the driver wraps each migration in its own tx — an outer BEGIN/COMMIT triggers 42601).
-- Behavioral candidato-DENY + RH-still-reads smoke: supabase/tests/sec02_smokes.sql (24-08).
-- =============================================================================

-- (1) Drop the candidate's base-table read path — candidate now reads ONLY via the RPC.
--     No replacement candidate SELECT policy → candidato reads 0 rows on the base table
--     (every verdict column included). RH policies below stay intact.
DROP POLICY IF EXISTS redacao_candidato_select ON public.redacoes_candidato;

-- (2) Own-row, verdict-safe candidate reader. SECURITY DEFINER so it can read the row
--     after the candidate row policy is gone; ownership is enforced INSIDE via
--     candidatos.user_id = auth.uid() (reprocessar_analise:56-59 idiom). Projects ONLY
--     the safe columns (MinhaRedacaoRow) — NEVER a verdict column, NEVER bloqueio_avanco.
CREATE OR REPLACE FUNCTION public.get_minha_redacao(p_candidatura_id uuid)
RETURNS TABLE (
  id             uuid,
  pergunta_id    uuid,
  ordem          smallint,
  texto          text,
  word_count     int,
  submetida_em   timestamptz,
  status_analise text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
    SELECT
      r.id,
      r.pergunta_id,
      r.ordem,
      r.texto,
      r.word_count,
      r.submetida_em,
      -- Coarsen status_analise so pendente_humano / falhou do not leak the verdict:
      -- only 'concluida' is verbatim; everything else is a neutral 'em_analise'.
      (CASE WHEN r.status_analise = 'concluida' THEN 'concluida' ELSE 'em_analise' END)::text
    FROM public.redacoes_candidato r
    JOIN public.candidaturas c  ON c.id  = r.candidatura_id
    JOIN public.candidatos    ca ON ca.id = c.candidato_id
   WHERE r.candidatura_id = p_candidatura_id
     AND ca.user_id = auth.uid()          -- own-row guard (candidate reads ONLY their own)
   ORDER BY r.ordem;
END;
$$;

REVOKE ALL ON FUNCTION public.get_minha_redacao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_minha_redacao(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_minha_redacao(uuid) IS
  'Phase 24 / SEC-02: leitor own-row verdict-safe da redação do candidato. Enforça posse via candidatos.user_id = auth.uid() DENTRO do DEFINER; projeta APENAS id/pergunta_id/ordem/texto/word_count/submetida_em/status_analise (coarsened) — NUNCA analise_ia/scores_*/classificacao_cor/red_flag_etico/flags/scores_humanos/notas_revisor/decisao_revisor nem bloqueio_avanco. RH lê o veredito completo pela base table (redacao_rh_select, intacto — coluna NAO e REVOKE-ada, pois RH compartilha o role authenticated). SET search_path = ''''; REVOKE PUBLIC / GRANT authenticated. Read-only — nao faz DML nem auto-rejeita (RNF-07a).';
