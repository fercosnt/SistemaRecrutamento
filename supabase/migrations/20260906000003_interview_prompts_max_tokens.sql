-- =============================================================================
-- Migration: interview_guide 3000 → 8000 e transcript_analysis 4000 → 6000 max_tokens
-- Date: 2026-09-06
-- =============================================================================
-- MEDIDO em ai_call_logs as 04:59-03 (E4 do guia de validação, EF gerar-guia v14, teto
-- de 110 s): a Anthropic RESPONDEU e o ai-client falhou em
--   "Failed to parse structured output as JSON: Unterminated string in JSON at
--    position 10326"
-- → JSON cortado em max_tokens=3000. Um guia presencial tem 6-7 perguntas, cada uma
-- com 5 âncoras BARS de ≥40 chars, rationale, 2-5 probes, red/green flags, intro e
-- closing — ~10 KB de JSON, mais de 3000 tokens. O parse falho vira
-- `anthropic_retries_exhausted` e cai no gpt-4o-mini, cuja saída terse cabe (1874
-- tokens) e cujas perguntas são visivelmente piores ("Após nossa conversa, você se
-- sentiu confortável…"). O guia ONLINE do E2 (02:30) caiu no mesmo fallback e foi
-- atribuído ao teto de 60 s — a causa provável era esta, escondida pelo log morto
-- (23503, corrigido em 163709fa).
--
-- Mesma família do 20260905000004 (cv_job_match 2048 → 4096): o teto de saída foi
-- dimensionado antes de o Sonnet ser o provedor efetivo e nunca foi medido, porque
-- ai_call_logs ficou vazio de 22/08 a 05/09.
--
-- transcript_analysis sobe por antecipação: 1598 tokens para 4 competências (E3);
-- o schema admite 8 competências com reasoning de até 2400 chars cada.
--
-- As linhas são editáveis: `deployed_at` é NULL (o guard prevent_published_prompt_edit
-- só trava linhas carimbadas) e max_tokens não entra no content_hash. Portão: os
-- valores atuais TÊM de ser 3000 e 4000. Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $mig$
DECLARE
  v_guia int;
  v_transcricao int;
BEGIN
  SELECT max_tokens INTO v_guia FROM public.prompt_versions
   WHERE call_type = 'interview_guide' AND is_active;
  SELECT max_tokens INTO v_transcricao FROM public.prompt_versions
   WHERE call_type = 'transcript_analysis' AND is_active;

  IF v_guia IS DISTINCT FROM 3000 THEN
    RAISE EXCEPTION 'interview_guide ativo com max_tokens=% (esperava 3000) — esta migration nao e a que voce pensa', v_guia;
  END IF;
  IF v_transcricao IS DISTINCT FROM 4000 THEN
    RAISE EXCEPTION 'transcript_analysis ativo com max_tokens=% (esperava 4000) — esta migration nao e a que voce pensa', v_transcricao;
  END IF;

  UPDATE public.prompt_versions SET max_tokens = 8000
   WHERE call_type = 'interview_guide' AND is_active;
  UPDATE public.prompt_versions SET max_tokens = 6000
   WHERE call_type = 'transcript_analysis' AND is_active;

  IF NOT EXISTS (SELECT 1 FROM public.prompt_versions WHERE call_type='interview_guide' AND is_active AND max_tokens = 8000)
     OR NOT EXISTS (SELECT 1 FROM public.prompt_versions WHERE call_type='transcript_analysis' AND is_active AND max_tokens = 6000) THEN
    RAISE EXCEPTION 'pos-condicao: max_tokens nao ficaram em 8000/6000';
  END IF;
END
$mig$;
