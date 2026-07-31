-- =============================================================================
-- 04-invent05-blast-radius.sql — o raio de impacto da correção do INVENT-05
-- =============================================================================
--
-- Requirement coberto : INVENT-05
-- Decisão             : D-P42-21
-- Milestone           : M8 / v8.0 — Phase 42 / Plano 42-12
-- Autoria             : 2026-07-31
-- Natureza            : **READ-ONLY — seguro em PROD.** Zero statement de escrita.
--
-- COMO EXECUTAR
-- -------------
-- Pelo orquestrador / main thread, via `execute_sql` do MCP do Supabase contra o
-- projeto `isljnozzlvckrgjjbjwp`. Subagentes GSD não recebem esses tools
-- (anthropics/claude-code#13898) — esta consulta nunca roda dentro do agente que
-- a escreveu, e isso é premissa de planejamento, não descoberta de meio de fase.
--
-- ⚠ EXECUTAR DUAS VEZES — E AS DUAS TÊM DE SER **ESTA MESMA CONSULTA**
-- --------------------------------------------------------------------
-- Uma vez IMEDIATAMENTE ANTES do apply da migration
-- `20260730000005_p42_invent05_not_exists.sql`, e uma vez DEPOIS. Sem mudar uma
-- vírgula de uma execução para a outra. Os dois outputs vão colados lado a lado
-- no `VERIFICATION.md` da fase.
--
-- Se as duas medições não forem a MESMA consulta, o antes/depois não prova nada:
-- qualquer diferença observada passa a ter duas explicações possíveis (o apply,
-- ou a mudança na consulta) e nenhuma delas fica descartada. É por isso que este
-- arquivo é versionado em vez de a consulta ser digitada duas vezes.
--
-- ⚠ O MODO DE FALHA QUE ESTE ARQUIVO EXISTE PARA IMPEDIR
-- ------------------------------------------------------
-- `docs/compliance/cron-inventory.md` registra contagens medidas em **2026-07-29**
-- (`ai_call_logs` = 0, `candidate_ai_decisions` = 0). **Citar aqueles números como
-- se fossem correntes é a falha.** A Phase 23 corrigiu a causa do logging quebrado;
-- se o registro de chamadas voltou a funcionar entre aquela data e o apply, a
-- primeira execução pós-correção apaga o acumulado histórico de uma vez só. A
-- contagem que autoriza o apply é a que foi tirada minutos antes dele — nenhuma
-- outra.
--
-- O QUE CADA NÚMERO SIGNIFICA
-- ---------------------------
--   total_logs                   volume total de `ai_call_logs`. Serve de âncora:
--                                ele NÃO pode ter DIMINUÍDO entre a medição de
--                                antes e a de depois. O apply substitui um
--                                agendamento; não executa a purga, então uma QUEDA
--                                significa que alguma purga rodou — isso é
--                                incidente, não resultado.
--
--                                ⚠ CORREÇÃO (code review do checkpoint, 2026-07-31):
--                                a redação anterior dizia "não pode ter MUDADO" e
--                                chamava qualquer mudança de incidente. Isso é falso
--                                para uma tabela de auditoria append-heavy: a Phase 23
--                                corrigiu a causa do logging quebrado, então uma
--                                INSERÇÃO legítima entre as duas execuções dispararia
--                                um incidente falso. O invariante real é a não-queda.
--   total_decisions              volume total de `candidate_ai_decisions`. Com esta
--                                tabela vazia o defeito está latente (a subconsulta
--                                é vazia, e a negação de pertencimento contra um
--                                conjunto vazio é verdadeira).
--   decisions_com_null_no_array  quantas decisões carregam um elemento nulo dentro
--                                de `ai_call_log_ids`. É a condição que ARMA o
--                                defeito. Se for 0, o defeito segue latente e o
--                                delta abaixo deve ser 0.
--   alcance_atual                quantas linhas o predicado VIVO alcança hoje,
--                                avaliado como contagem, sem apagar nada.
--   alcance_corrigido            quantas linhas o predicado NOVO alcançaria,
--                                idem. **O delta `alcance_corrigido - alcance_atual`
--                                É o raio de impacto real da correção**, e é o
--                                número que decide se o apply é passo automático
--                                ou vira decisão do operador (delta > 0).
--   coletado_em_utc              o carimbo da medição. Está DENTRO da consulta de
--                                propósito: um fato datado cuja data depende de
--                                alguém lembrar de anotá-la é uma promessa sem
--                                código que a execute — exatamente a classe de
--                                defeito que esta fase documenta.
--
-- ⚠ POR QUE `array_position(..., NULL)` E NÃO O OPERADOR DE CONTENÇÃO
-- -------------------------------------------------------------------
-- A tentação é escrever `ai_call_log_ids @> ARRAY[NULL]::uuid[]`. **Essa forma
-- devolve `false` sempre**, inclusive para um array que de fato contém um elemento
-- nulo: a contenção de arrays compara elementos por igualdade, e igualdade contra
-- nulo nunca é verdadeira. Ou seja, aquela forma reportaria `0` em silêncio,
-- para todo estado do banco — a MESMA classe de defeito que o INVENT-05 corrige,
-- reintroduzida dentro da própria consulta que deveria medi-lo.
-- `array_position` é a forma correta porque busca com semântica
-- `IS NOT DISTINCT FROM`, então consegue localizar um elemento nulo.
-- =============================================================================

SELECT
  -- Âncora: tem de ser IDÊNTICO entre a medição de antes e a de depois.
  (SELECT count(*) FROM public.ai_call_logs)                                   AS total_logs,

  (SELECT count(*) FROM public.candidate_ai_decisions)                         AS total_decisions,

  -- A condição que ARMA o defeito. `array_position` acha elemento nulo; o
  -- operador de contenção NÃO acharia (ver nota acima).
  (SELECT count(*) FROM public.candidate_ai_decisions
    WHERE array_position(ai_call_log_ids, NULL::uuid) IS NOT NULL)             AS decisions_com_null_no_array,

  -- Alcance do predicado VIVO (negação de pertencimento a uma lista), avaliado
  -- como contagem. Se o defeito estiver armado, este número é 0.
  (SELECT count(*) FROM public.ai_call_logs l
    WHERE l.retain_until < now()
      AND l.id NOT IN (
        SELECT unnest(ai_call_log_ids)
          FROM public.candidate_ai_decisions
         WHERE status IN ('candidate_review_requested', 'human_reviewing')
      ))                                                                       AS alcance_atual,

  -- Alcance do predicado CORRIGIDO, avaliado como contagem. O dry-run é ISTO:
  -- o mesmo predicado que a purga passará a usar, contado em vez de aplicado.
  (SELECT count(*) FROM public.ai_call_logs l
    WHERE l.retain_until < now()
      AND NOT EXISTS (
        SELECT 1
          FROM public.candidate_ai_decisions d
         WHERE d.status IN ('candidate_review_requested', 'human_reviewing')
           AND l.id = ANY(d.ai_call_log_ids)
      ))                                                                       AS alcance_corrigido,

  -- ── Vizinhos INTOCADOS, por igualdade byte a byte ──────────────────────────
  -- Acrescentados no checkpoint de 2026-07-31, por recomendação do code review
  -- bloqueante (W5). A asserção (d) do smoke afere que os outros dois agendamentos
  -- ficaram intocados, mas o faz por SUBSTRING (`strpos`) — que passaria contra um
  -- corpo materialmente reescrito. O arquivo do smoke admite a limitação e delega a
  -- igualdade byte a byte a "uma comparação manual de md5 no checkpoint".
  --
  -- Delegar a metade mais forte de uma asserção a um passo que alguém precisa lembrar
  -- de executar é EXATAMENTE a classe de defeito que esta fase existe para eliminar:
  -- uma promessa sem código que a execute. Como esta consulta já roda ANTES e DEPOIS,
  -- trazer os dois md5 para cá torna a comparação mecânica — dois números na página,
  -- não um passo de memória.
  (SELECT md5(command) FROM cron.job WHERE jobname = 'ai-cost-aggregation')    AS md5_vizinho_agregacao,
  (SELECT md5(command) FROM cron.job WHERE jobname = 'notif-retry-sweep')      AS md5_vizinho_retry,

  now() AT TIME ZONE 'UTC'                                                     AS coletado_em_utc;
