-- =============================================================================
-- 20260922000001 — public.llm_provider : ganha o valor 'none', o provedor das
--                  chamadas que NUNCA saíram da EF (JORN-39)
-- =============================================================================
-- Phase 49 / Plano 49-01 · JORN-39 · D-52 (via de apply) · D-55 (migration antes
-- da EF: o 49-02 é o dono do comportamento de gravação e depende deste valor).
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-22, só leitura). Os dois caminhos
-- que cortam uma chamada de IA ANTES de tocar qualquer provedor gravam
-- `provider: "none"` na linha de log:
--   · teto de custo diário (AI-06) — `_shared/ai-client.ts:536-559`;
--   · detecção de prompt injection    — `_shared/ai-client.ts:576-597`.
-- O enum `public.llm_provider` tem `{anthropic,openai,google}` e NÃO tem `none`,
-- então o INSERT do `audit-logger` falha em 22P02 (invalid input value for enum)
-- — e `logAiCall` (`_shared/audit-logger.ts:179-185`) ENGOLE o erro e devolve
-- `void`. Resultado medido: `select count(*) from public.ai_call_logs where
-- provider::text = 'none'` = **0**. Nenhum corte por teto de custo e nenhuma
-- injeção detectada jamais deixou rastro no banco — o guardrail funciona na
-- execução e é invisível na auditoria.
--
-- POR QUE 'none', E NÃO NULL. `public.ai_cost_daily.provider` é NOT NULL e o cron
-- `ai-cost-aggregation` AGRUPA por ela: uma linha com `provider` NULL sairia da
-- agregação de custo (ou a derrubaria), trocando um buraco de auditoria por
-- outro (RESEARCH §E.3, Correção 32). 'none' é o valor honesto — «nenhum
-- provedor foi chamado» é um fato sobre a chamada, não ausência de dado.
--
-- POR QUE ARQUIVO PRÓPRIO, SEM NENHUM USO DO VALOR. `ALTER TYPE … ADD VALUE` é
-- permitido dentro de transação no PG 12+ (PROD = 17.6, medido), mas o valor novo
-- NÃO pode ser USADO na mesma transação — «unsafe use of new value of enum
-- type». O `p46apply.cjs` roda o arquivo INTEIRO (migration + linha do ledger) em
-- UMA transação, logo nenhum INSERT/UPDATE/comparação com 'none' pode morar aqui.
-- Quem passa a gravar o valor é o plano 49-02, depois deste apply (D-55). Mesmo
-- molde do analog `20260706010519_bigfive_devolutiva_enum.sql`.
--
-- O PORTÃO DE PÓS-CONDIÇÃO SÓ LÊ CATÁLOGO. `pg_catalog.pg_enum` é tabela comum
-- sob MVCC — a linha nova é visível à própria transação — e a comparação é de
-- TEXTO (`enumlabel = 'none'`), nunca do valor do enum. `enum_range()` e
-- qualquer literal `'none'::public.llm_provider` estão fora de propósito aqui:
-- passariam pelas rotinas que levantam «unsafe use of new value».
--
-- ERRO que este arquivo conserta: 22P02 (invalid_text_representation) no INSERT
-- em `ai_call_logs`. O portão abaixo levanta 'raise_exception' (P0001) se o valor
-- não estiver no catálogo depois do ALTER.
--
-- AUTHZ: nenhuma mudança. Valor de enum não tem ACL; as policies e os GRANTs de
-- `ai_call_logs` ficam como estão (admin-only, purga de 180 d).
--
-- IDEMPOTÊNCIA: `ADD VALUE IF NOT EXISTS` — re-rodar é no-op (NOTICE).
--
-- REVERSIBILIDADE: costly. Valor de enum não se remove sem recriar o tipo. Mas é
-- ADITIVO: nenhum leitor existente quebra com um valor a mais (os consumidores
-- no front — `aiLogsService.ts:17`, `aiCostsService.ts:15` — leem o tipo gerado,
-- que o `db:types` deste mesmo plano regenera).
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo `$$` com
-- statements adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260922000001_p49_llm_provider_none.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
-- =============================================================================

ALTER TYPE public.llm_provider ADD VALUE IF NOT EXISTS 'none';

DO $portao_llm_provider_none$
DECLARE
  v_existe boolean;
  v_labels text;
BEGIN
  SELECT EXISTS (
           SELECT 1
             FROM pg_catalog.pg_enum e
             JOIN pg_catalog.pg_type t ON t.oid = e.enumtypid
             JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public'
              AND t.typname = 'llm_provider'
              AND e.enumlabel = 'none'
         )
    INTO v_existe;

  SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
    INTO v_labels
    FROM pg_catalog.pg_enum e
    JOIN pg_catalog.pg_type t ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
   WHERE n.nspname = 'public'
     AND t.typname = 'llm_provider';

  IF NOT v_existe THEN
    RAISE EXCEPTION 'P49-01 PORTAO: public.llm_provider nao tem o valor ''none'' depois do ALTER — rotulos vivos: %', v_labels;
  END IF;

  RAISE NOTICE 'P49-01 OK: public.llm_provider = {%} (o valor ''none'' passa a ser gravavel pelo 49-02)', v_labels;
END
$portao_llm_provider_none$;
