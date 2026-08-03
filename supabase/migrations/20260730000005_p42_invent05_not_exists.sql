-- =============================================================================
-- Phase 42 / Plano 42-12 — INVENT-05 · D-P42-21
-- Correção do predicado da purga de retenção de `ai_call_logs`
-- =============================================================================
--
-- Requirement : INVENT-05 — "predicado de purga que apaga zero em silêncio"
-- Decisão     : D-P42-21
-- Milestone   : M8 / v8.0 — critério de sucesso #5 do ROADMAP
-- Autoria     : 2026-07-31
-- Objeto      : `cron.job` `ai-logs-retention-cleanup` (agendado desde a Phase 6,
--               em `20260609000003_prompt_library_cron.sql:70`). Corpo substituído
--               EM LUGAR: mesmo `jobname`, mesmo horário (02:00 diárias).
--
-- ⚠ ESTE ARQUIVO É O ÚNICO WRITE DESTRUTIVO DA PHASE 42
-- -----------------------------------------------------
-- Ele exercita, pela primeira vez e por inteiro, o **portão de fase destrutiva**
-- adotado como exit criterion do ROADMAP do M8 (`.planning/STATE.md`). O portão
-- exige, NESTA ordem, ANTES do apply em produção:
--   1. raio de impacto MEDIDO pela mesma consulta que mede o alcance do predicado
--      atual (`docs/compliance/sql/04-invent05-blast-radius.sql`);
--   2. dry-run pela MESMA consulta do comando real (os campos `alcance_atual` e
--      `alcance_corrigido` são o dry-run: o predicado avaliado como contagem);
--   3. code review BLOQUEANTE — o apply não acontece sem veredito;
--   4. asserções NEGATIVAS pós-apply (`supabase/tests/p42_invent05_cron_smoke.sql`);
--   5. zero `--no-verify` nos commits.
-- A origem da exigência está registrada na STATE.md: a Phase 39 fechou sem
-- `VERIFICATION.md` e sem code review, e 2 defeitos CRÍTICOS chegaram a produção.
--
-- ⚠ SEM WRAPPER `BEGIN;` / `COMMIT;` — o driver do Supabase CLI envolve cada
-- migration na própria transação implícita, e o wrapper externo é o gatilho do
-- SQLSTATE 42601 em corpos com `$$` (CLAUDE.md § "Migrations + db push").
--
-- =============================================================================
-- A MECÂNICA EXATA DO DEFEITO — sem simplificação
-- =============================================================================
--
-- O predicado vivo protege da purga qualquer log referenciado por uma decisão em
-- revisão. Ele faz isso negando o pertencimento do identificador do log ao
-- conjunto produzido por `unnest` sobre a coluna de identificadores dessas
-- decisões. São três fatos encadeados:
--
-- (1) `candidate_ai_decisions.ai_call_log_ids` é declarada `uuid[] NOT NULL`
--     (`20260609000001:235`). Essa declaração impede que **o array** seja nulo.
--     Ela **não impede** que os **elementos dentro dele** sejam nulos:
--     `'{NULL}'::uuid[]` é um array não-nulo perfeitamente válido, e satisfaz a
--     restrição sem reclamação.
--
-- (2) `unnest` de um array que contém um elemento nulo produz uma **linha nula**
--     no conjunto resultante.
--
-- (3) Em SQL, a negação de pertencimento a um conjunto que contém uma linha nula
--     avalia para **nulo — nunca para verdadeiro**. E avalia assim para **TODA**
--     linha candidata, não só para as relacionadas àquela decisão. Como a
--     cláusula de filtro só conserva linhas cujo predicado seja verdadeiro, o
--     comando agendado passa a apagar **zero linhas**, em silêncio, todos os dias
--     às 02:00 — sem erro, sem log, sem sinal algum de que parou de funcionar.
--
-- ESTADO DO DEFEITO EM 2026-07-29 (`docs/compliance/cron-inventory.md`): **latente**.
-- Com `candidate_ai_decisions` vazia, `unnest` produz o conjunto vazio, e a negação
-- de pertencimento a um conjunto vazio é verdadeira — hoje a purga apaga
-- corretamente. O defeito **arma-se** no instante em que a primeira decisão em
-- revisão for gravada com um elemento nulo no array. Por isso o efeito desta
-- correção não é "voltar a apagar": é **impedir que pare de apagar no futuro, em
-- silêncio**. E é por isso que a contagem de 2026-07-29 NÃO autoriza o apply — só
-- a contagem tirada minutos antes dele autoriza.
--
-- =============================================================================
-- POR QUE A FORMA NOVA É IMUNE
-- =============================================================================
--
-- A forma nova pergunta pela **inexistência de uma linha correspondente** em vez
-- de negar pertencimento a um conjunto de valores. Com um elemento nulo dentro do
-- array, a comparação daquele elemento contra o identificador do log é nula, a
-- subconsulta correlacionada não devolve linha nenhuma, a inexistência é
-- verdadeira, e a linha é corretamente apagada. Um nulo perdido no array deixa de
-- envenenar o predicado inteiro: ele passa a valer, no máximo, por si mesmo.
--
-- A outra metade do predicado já era segura: `ai_call_logs.retain_until` é
-- declarada `NOT NULL` (`20260609000001:197`), então a comparação de janela de
-- retenção nunca produz nulo.
--
-- POR QUE NÃO SE REMENDA O PREDICADO ATUAL
-- ----------------------------------------
-- A alternativa aparentemente menor seria manter a forma atual e acrescentar uma
-- condição de não-nulidade dentro da subconsulta. Ela funcionaria hoje e seria
-- pior: continua frágil a qualquer mudança futura na origem do array — outro
-- caminho de escrita, outra agregação, outra migration — e a proteção passa a
-- depender de alguém lembrar da armadilha toda vez. A forma adotada aqui é imune
-- **por construção**, não por vigilância. Numa fase cujo tema é "toda promessa
-- precisa de código que a execute", trocar uma garantia estrutural por uma
-- garantia de atenção humana seria contradizer a própria tese.
--
-- =============================================================================
-- ESCOPO NEGATIVO — o que esta migration deliberadamente NÃO faz
-- =============================================================================
--
--   · Não cria nem remove nenhum agendamento além do alvo nomeado abaixo. Os
--     outros dois agendamentos vivos do sistema não são sequer mencionados neste
--     arquivo — a ausência dos nomes deles aqui é asserida por grep, e o estado
--     intocado deles é asserido pelo smoke.
--   · Não muda o horário nem o estado ativo do agendamento alvo.
--   · Não toca em nenhuma tabela, política, índice, função ou permissão.
--   · Não executa a purga. Substituir um agendamento não o dispara; a primeira
--     execução real acontece às 02:00 seguintes.
--
-- REAPLICAÇÃO
-- -----------
-- O guard de remoção condicional abaixo (idioma de `20260727000001:220-221`)
-- torna a migration idempotente: reaplicá-la não duplica o agendamento.
--
-- VERIFICAÇÃO PÓS-APPLY
-- ---------------------
-- `supabase/tests/p42_invent05_cron_smoke.sql`, numa ÚNICA chamada `execute_sql`
-- (o gate por GUC é escopado à sessão). Esperado 4/4. A asserção (b) daquele
-- arquivo compara o corpo vivo com o corpo declarado aqui por md5 — igualdade
-- byte a byte, não inspeção visual.
-- =============================================================================


SELECT cron.unschedule('ai-logs-retention-cleanup')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-logs-retention-cleanup');

SELECT cron.schedule(
  'ai-logs-retention-cleanup',
  '0 2 * * *',
  $CRON$
    DELETE FROM public.ai_call_logs l
     WHERE l.retain_until < now()
       AND NOT EXISTS (
         SELECT 1
           FROM public.candidate_ai_decisions d
          WHERE d.status IN ('candidate_review_requested', 'human_reviewing')
            AND l.id = ANY(d.ai_call_log_ids)
       );
  $CRON$
);
