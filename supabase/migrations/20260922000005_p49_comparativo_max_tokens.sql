-- =============================================================================
-- 20260922000005 — public.prompt_versions : comparative_ranking ativo passa de
--                  max_tokens 3000 para 3600 (D-59)
-- =============================================================================
-- Phase 49 / Plano 49-08 · JORN-28 · D-59 (ex-D-29) · D-52 (via de apply).
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-22 e 2026-09-20, só leitura):
-- `comparative_ranking` é o único `call_type` com um truncamento REAL registrado.
-- Em 2026-09-20 um comparativo de 6 candidatos passou de `max_tokens=3000` — o
-- JSON saiu cortado (posição 9290, razão medida de 3,10 caracteres por token), o
-- parse do structured output falhou, a chamada virou
-- `anthropic_retries_exhausted` e o ranking que o RH viu na tela saiu do
-- `gpt-4o-mini`, gravado como SUCESSO. O teto de 3000 foi dimensionado antes de o
-- Sonnet ser o provedor efetivo e nunca foi medido contra a saída real.
--
-- A CONTA (D-59 — RESEARCH §D-29). Throughput Sonnet no pior caso de saída longa:
-- **45 tok/s** (medido: `interview_guide`, 4436 tok em 98,4 s). O teto por
-- tentativa da EF é 110 s com 1 tentativa (`comparativo-candidatos/index.ts`,
-- `timeoutMs: 110_000`). Reservando ~30 s (27 %) para DB, TTFT e variância sobram
-- 80 s de geração:
--
--     80 s × 45 tok/s = 3600 tokens
--
-- E o teto de candidatos que caber nesses 3600 tok com folga é 4 (modelo
-- conservador: parte fixa 1500 tok + 4 × 410 tok = 3140 tok = 87 % do teto; n=5
-- daria 3550 = 99 %, sem folga nenhuma). Os dois números são IRMÃOS e andam
-- juntos: a constante `COMPARATIVO_MAX_CANDIDATOS = 4` vive em
-- `supabase/functions/_shared/comparativo-config.ts`, cujo docblock repete esta
-- conta de propósito — o teto de candidatos sem o `max_tokens` traz de volta o
-- truncamento de 20/09, e o `max_tokens` sem o teto de candidatos troca
-- truncamento por TIMEOUT, que é pior (saída maior demora mais).
--
-- POR QUE UM UPDATE NA PRÓPRIA LINHA, E NÃO UMA VERSÃO NOVA DE PROMPT. O guard
-- `prevent_published_prompt_edit` protege `system_template`, `user_template`,
-- `content_hash` e `semver` — e NÃO `max_tokens` (RESEARCH Correção 6, verificado
-- por `pg_get_functiondef`). `max_tokens` também não entra no `content_hash`.
-- Precedente exato: `20260906000003_interview_prompts_max_tokens.sql`, deste mesmo
-- repositório, que fez 3000 → 8000 no `interview_guide` e 4000 → 6000 no
-- `transcript_analysis` pela mesma via. Uma versão nova de prompt para mudar um
-- teto de saída mentiria sobre o texto do prompt, que não muda aqui.
--
-- O QUE ESTA MIGRATION NÃO TOCA: o `interview_guide`. Ele está em `max_tokens:
-- 8000` contra um teto efetivo por TEMPO de ~4 950 tok (98,4 s de 110 s = 89 % do
-- timeout, medido) — ou seja, nele o timeout chega ANTES do truncamento, e subir
-- ou baixar o teto de saída não é o conserto. Fica registrado como risco P1 e
-- DEFERIDO (§Deferred do 49-02, `WINDOWS.md`). Mexer nele aqui seria consertar o
-- parâmetro errado, que é precisamente o que a taxonomia nova do JORN-28 existe
-- para evitar.
--
-- O PORTÃO DE VALOR ESPERADO (`IS DISTINCT FROM 3000`) não é cerimônia: se a
-- linha ativa já não estiver em 3000, alguém mexeu nela entre a medição e o apply,
-- e esta migration NÃO é a que quem a aplica pensa que é. Medido imediatamente
-- antes deste arquivo: exatamente UMA linha `comparative_ranking`
-- (`b562fbd6-5d6a-492c-bf5a-b6081fc61a71`, semver 1.0.0, `claude-sonnet-4-6`),
-- `is_active = true`, `is_canary = false`, `max_tokens = 3000`.
--
-- ERRO: 'raise_exception' (P0001) — tanto no portão de pré-condição quanto no de
-- pós-condição. Nenhum dado é alterado se qualquer um levantar (o
-- `p46apply.cjs` roda o arquivo inteiro numa transação).
--
-- AUTHZ: nenhuma mudança. `prompt_versions` segue admin-only; nenhum GRANT,
-- REVOKE ou policy é tocado. Esta migration muda UM inteiro numa linha de
-- configuração.
--
-- IDEMPOTÊNCIA: NÃO é idempotente por desenho, e isso é deliberado. Re-rodar
-- levanta o portão de pré-condição ('comparative_ranking ativo com
-- max_tokens=3600') porque o valor já é 3600 — uma segunda passagem silenciosa
-- esconderia que o estado mudou entre as duas.
--
-- REVERSIBILIDADE: reversível, trivialmente (`UPDATE … SET max_tokens = 3000`).
-- O `max_tokens` entra na impressão digital de idempotência do `ai-client`, então
-- nem a ida nem a volta faz replay de linha antiga de `ai_call_logs`.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo `$$` com
-- statements adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260922000005_p49_comparativo_max_tokens.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
-- =============================================================================

DO $mig_comparativo_max_tokens$
DECLARE
  v_atual int;
  v_linhas int;
BEGIN
  SELECT count(*) INTO v_linhas
    FROM public.prompt_versions
   WHERE call_type = 'comparative_ranking' AND is_active;

  IF v_linhas IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'comparative_ranking tem % linha(s) ativa(s) (esperava exatamente 1) — um UPDATE por call_type+is_active atingiria o conjunto errado', v_linhas;
  END IF;

  SELECT max_tokens INTO v_atual
    FROM public.prompt_versions
   WHERE call_type = 'comparative_ranking' AND is_active;

  IF v_atual IS DISTINCT FROM 3000 THEN
    RAISE EXCEPTION 'comparative_ranking ativo com max_tokens=% (esperava 3000) — esta migration nao e a que voce pensa', v_atual;
  END IF;

  UPDATE public.prompt_versions SET max_tokens = 3600
   WHERE call_type = 'comparative_ranking' AND is_active;

  IF NOT EXISTS (
    SELECT 1 FROM public.prompt_versions
     WHERE call_type = 'comparative_ranking' AND is_active AND max_tokens = 3600
  ) THEN
    RAISE EXCEPTION 'pos-condicao: max_tokens do comparative_ranking ativo nao ficou em 3600';
  END IF;

  RAISE NOTICE 'comparative_ranking: max_tokens 3000 -> 3600 (D-59: 80 s x 45 tok/s; teto de 4 candidatos = 3140 tok = 87 %%)';
END
$mig_comparativo_max_tokens$;
