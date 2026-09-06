-- =============================================================================
-- Migration: cv_job_match — max_tokens 2048 → 4096 (a saida do Sonnet era TRUNCADA)
-- Date: 2026-09-05
-- =============================================================================
-- MEDIDO em ai_call_logs as 23:41/23:42-03 (EF v21, teto de 55 s): a Anthropic
-- RESPONDEU em ~40 s e o ai-client falhou em
--   "Failed to parse structured output as JSON: Unterminated string in JSON at
--    position 6445"
-- → JSON cortado em max_tokens. A rubrica (…0019) pede 5 competencias com BARS,
-- pontos fortes com citacao literal, gaps com nota e severidade, reasoning em CoT e
-- competency_scores — nao cabe em 2048 tokens. O parse falho vira
-- `anthropic_retries_exhausted` e cai no gpt-4o-mini, cuja saida terse cabe.
-- Antes de hoje isso era invisivel: o teto de 25 s cortava a chamada ANTES da
-- resposta chegar (commit b84fabc) e o ai_call_logs nao gravava (f62ef6f).
--
-- O RETOMAR-AQUI de 23/08 ja registrava o risco: "cv_job_match tem max_tokens: 2048
-- — passar disso arrisca truncar o JSON". Passou, e truncou.
--
-- A linha e editavel: `deployed_at` e NULL (o guard prevent_published_prompt_edit so
-- trava linhas carimbadas) e max_tokens nao entra no content_hash. Portao: o valor
-- atual TEM de ser 2048. Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $mig$
DECLARE
  v_atual int;
BEGIN
  SELECT max_tokens INTO v_atual FROM public.prompt_versions
   WHERE call_type = 'cv_job_match' AND is_active;
  IF v_atual IS DISTINCT FROM 2048 THEN
    RAISE EXCEPTION 'cv_job_match ativo com max_tokens=% (esperava 2048) — esta migration nao e a que voce pensa', v_atual;
  END IF;

  UPDATE public.prompt_versions SET max_tokens = 4096
   WHERE call_type = 'cv_job_match' AND is_active;

  IF NOT EXISTS (SELECT 1 FROM public.prompt_versions WHERE call_type='cv_job_match' AND is_active AND max_tokens = 4096) THEN
    RAISE EXCEPTION 'pos-condicao: max_tokens nao ficou em 4096';
  END IF;
END
$mig$;
