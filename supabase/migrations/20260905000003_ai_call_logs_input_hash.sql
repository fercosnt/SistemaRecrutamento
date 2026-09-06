-- =============================================================================
-- Migration: ai_call_logs ganha a coluna `input_hash` que o audit-logger ja gravava
-- Date: 2026-09-05
-- =============================================================================
-- MEDIDO em 2026-09-05, nos logs da EF `analise-candidato-individual`:
--   "[audit-logger] ai_call_logs INSERT falhou (call_type=cv_job_match): PGRST204"
-- O `logAiCall` (_shared/audit-logger.ts) enviava DUAS colunas que a tabela nao
-- tem: `input_hash` (sha256 do prompt mascarado — exigencia IA-02 de
-- reprodutibilidade) e `output` (alias redundante de `raw_response`). O PostgREST
-- recusa a linha inteira, o erro era so logado, e `ai_call_logs` ficou com UMA
-- linha desde 2026-08-22: todo custo de IA desde entao e invisivel — cost-alerter
-- cego, /admin/ai-costs vazio, teto AI-06 nunca conferido.
--
-- Decisao: `output` SAI do codigo (duplicava raw_response); `input_hash` ENTRA na
-- tabela, porque o hash e o que permite provar que dois julgamentos receberam o
-- mesmo input. Aplicar ANTES do redeploy das EFs que embarcam o audit-logger.
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $mig$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'ai_call_logs' AND column_name = 'input_hash') THEN
    RAISE EXCEPTION 'ai_call_logs.input_hash ja existe — esta migration nao e a que voce pensa';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'ai_call_logs' AND column_name = 'output') THEN
    RAISE EXCEPTION 'ai_call_logs.output existe — o audit-logger devia parar de enviar `output`, nao a tabela ganhar a coluna';
  END IF;

  ALTER TABLE public.ai_call_logs ADD COLUMN input_hash text;
  COMMENT ON COLUMN public.ai_call_logs.input_hash IS
    'sha256 do user_prompt MASCARADO (pii-masker) — reprodutibilidade IA-02. Gravado por _shared/audit-logger.ts::logAiCall. Nulo nas linhas anteriores a 2026-09-05.';
END
$mig$;
