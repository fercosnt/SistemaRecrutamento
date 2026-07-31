-- =============================================================================
-- Phase 42 / Plano 42-12 — smoke de ASSERÇÃO NEGATIVA do INVENT-05
-- =============================================================================
-- Gate de aceitação da migration `20260730000005_p42_invent05_not_exists.sql`.
-- Rodar via `execute_sql` do MCP do Supabase DEPOIS do apply. RED até lá — a
-- asserção (b) compara o corpo vivo com o corpo novo, que só existe pós-apply.
--
-- ⚠ RODAR NUMA ÚNICA CHAMADA `execute_sql`
-- `set_config(..., false)` é escopado à SESSÃO. Statements espalhados por chamadas
-- separadas do MCP zerariam o contador e o RESUMO (z) reprovaria por run parcial
-- (precedente P41-05, registrado na STATE.md).
--
-- ⚠ NATUREZA: 100% CATÁLOGO. Toda asserção lê `cron.job`. **Zero statement de
-- escrita, zero linha criada, zero linha removida, zero disparo de e-mail.** É
-- seguro rodar contra PROD vivo — e essa segurança é asserida por grep sobre este
-- arquivo, não prometida em prosa: nenhum verbo de escrita aparece aqui, nem
-- mesmo dentro de string.
--
-- GATE VERDE = a contagem AUTO-EXIGIDA `smoke42i.pass` bate **4** no RESUMO (z).
-- O gate NÃO é "não levantou exceção": um run parcial (asserção pulada por erro de
-- ambiente) acumularia < 4 e o RESUMO reprova. Cada asserção incrementa o GUC.
--
-- =============================================================================
-- POR QUE TODAS AS 4 ASSERÇÕES SÃO NEGATIVAS
-- =============================================================================
-- O portão de fase destrutiva do M8 exige asserções sobre **o que NÃO aconteceu**.
-- Uma asserção positiva ("o agendamento alvo tem o corpo novo") passa igualmente
-- bem num banco onde a correção funcionou e num banco onde ela funcionou E levou
-- junto outra coisa. As quatro abaixo fecham as saídas laterais:
--
--   (a) NENHUM agendamento foi criado nem removido — continuam exatamente 3.
--       Fecha o modo de falha em que o guard de remoção condicional falha e o
--       agendamento é duplicado, passando a rodar duas vezes por noite.
--   (b) O corpo vivo do agendamento alvo casa **byte a byte** com o corpo
--       declarado na migration. Fecha o modo de falha em que o transporte
--       (`apply_migration`) altera o texto no caminho, ou em que o apply pegou
--       uma versão diferente do arquivo.
--   (c) O horário e o estado ativo do agendamento alvo NÃO mudaram. Fecha o modo
--       de falha em que a substituição em lugar vira recriação com outro horário,
--       ou em que o agendamento volta inativo e a purga simplesmente nunca roda.
--   (d) Os outros dois agendamentos estão INTOCADOS em relação ao que
--       `docs/compliance/cron-inventory.md` registrou em 2026-07-29. Fecha o modo
--       de falha em que a correção "arruma de passagem" algo fora do escopo.
--
-- =============================================================================
-- POR QUE (b) COMPARA POR md5 E NÃO POR STRING LITERAL
-- =============================================================================
-- Duas razões, nesta ordem:
--   1. md5 sobre o corpo inteiro É comparação byte a byte. Um espaço a mais, uma
--      quebra de linha a menos, um acento trocado — qualquer diferença muda o
--      resumo. É estritamente mais forte que inspeção visual e que `strpos`.
--   2. Transcrever o corpo esperado aqui traria para dentro deste arquivo o verbo
--      de escrita que ele declara não conter. O arquivo deixaria de ser
--      provadamente seguro por grep, e a segurança viraria promessa. O resumo
--      carrega a mesma informação sem carregar o risco.
--
-- PROVENIÊNCIA DO RESUMO ESPERADO (não apagar — é o que torna um re-pin auditável)
--   valor  : b64ca58d089f3ed580205e95a40c4e5f   (299 bytes)
--   origem : corpo entre os dois delimitadores `$CRON$` de
--            `supabase/migrations/20260730000005_p42_invent05_not_exists.sql`
--   medido : 2026-07-31, por execução — nunca digitado à mão
--   recomputar (se e somente se a migration mudar):
--     node -e 'const f=require("fs").readFileSync(process.argv[1],"utf8"),
--       a=f.indexOf("$CRON$"),b=f.indexOf("$CRON$",a+6);
--       console.log(require("crypto").createHash("md5")
--         .update(f.slice(a+6,b),"utf8").digest("hex"))' \
--       supabase/migrations/20260730000005_p42_invent05_not_exists.sql
--   ⚠ Se este resumo for re-pinado sem que a migration tenha mudado, a asserção
--     (b) deixa de provar qualquer coisa. Re-pinar é ato consciente e revisável.
--
-- ⚠ NB SOBRE IGUALDADE DE NOME: as asserções contam por igualdade exata de
--   `jobname`, sem `LIKE` — não há curinga `_` a escapar nem risco de casar
--   vizinho por acidente.
--
-- HIGIENE: `RESET ROLE` nas trocas; os NOTICEs carregam contagens, horários e
--   resumos md5 — nunca segredo, nunca PII.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke42i.pass', '0', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) ESCOPO — continuam existindo EXATAMENTE 3 agendamentos. Nenhum foi criado,
--     nenhum foi removido. Um 4º significa guard de remoção condicional falho
--     (agendamento duplicado ⇒ a purga rodaria duas vezes por noite); um 2º
--     significa que algo além do alvo desapareceu.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_n int; v_nomes text;
BEGIN
  SELECT count(*), string_agg(jobname, ', ' ORDER BY jobname)
    INTO v_n, v_nomes
    FROM cron.job;

  IF v_n <> 3 THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (a): cron.job tem % agendamento(s) (esperado 3) — [%]. Um a mais = guard de remoção condicional falhou e o alvo ficou duplicado; um a menos = algo além do alvo sumiu', v_n, v_nomes;
  END IF;

  PERFORM set_config('smoke42i.pass', (coalesce(nullif(current_setting('smoke42i.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): exatamente 3 agendamentos em cron.job — nenhum criado, nenhum removido [%]', v_nomes;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b) FIDELIDADE — o corpo vivo do agendamento alvo casa BYTE A BYTE com o corpo
--     declarado na migration (md5 sobre o texto inteiro). Em caso de falha, a
--     mensagem carrega o resumo medido, o tamanho e dois discriminadores
--     estruturais, para que o diagnóstico não dependa de olhar o corpo a olho nu.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cmd       text;
  v_md5       text;
  v_esperado  text := 'b64ca58d089f3ed580205e95a40c4e5f';
  v_tem_novo  boolean;
  v_tem_velho boolean;
BEGIN
  SELECT command INTO v_cmd
    FROM cron.job WHERE jobname = 'ai-logs-retention-cleanup';

  IF v_cmd IS NULL THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (b): o agendamento ai-logs-retention-cleanup NÃO existe — a substituição em lugar removeu sem recriar';
  END IF;

  v_md5       := md5(v_cmd);
  v_tem_novo  := strpos(v_cmd, 'NOT EXISTS') > 0;
  v_tem_velho := v_cmd ~ '\mNOT\s+IN\M';

  IF v_md5 IS DISTINCT FROM v_esperado THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (b): corpo vivo NÃO casa byte a byte com a migration. md5 vivo=% (esperado %), octetos=%, forma corrigida presente=%, forma antiga (negação por lista) presente=%',
      v_md5, v_esperado, octet_length(v_cmd), v_tem_novo, v_tem_velho;
  END IF;

  -- Redundante quando o md5 casa; mantido como rede de diagnóstico para o caso
  -- de um re-pin indevido do resumo esperado (ver PROVENIÊNCIA no cabeçalho).
  IF v_tem_velho OR NOT v_tem_novo THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (b): md5 casou mas a forma está errada (corrigida=%, antiga=%) — o resumo esperado foi re-pinado sem a migration ter mudado', v_tem_novo, v_tem_velho;
  END IF;

  PERFORM set_config('smoke42i.pass', (coalesce(nullif(current_setting('smoke42i.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): corpo vivo de ai-logs-retention-cleanup casa byte a byte com a migration (md5 %, % octetos)', v_md5, octet_length(v_cmd);
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) PRESERVAÇÃO — horário e estado ativo do agendamento alvo INALTERADOS. A
--     substituição é em lugar: mesmo nome, mesmo horário, ativo. Um agendamento
--     correto porém inativo é uma política de retenção que continua não rodando —
--     o mesmo desfecho do defeito que esta migration corrige, por outra via.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_sched text; v_active boolean; v_n int;
BEGIN
  SELECT count(*), max(schedule), bool_and(active)
    INTO v_n, v_sched, v_active
    FROM cron.job WHERE jobname = 'ai-logs-retention-cleanup';

  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (c): há % agendamento(s) chamados ai-logs-retention-cleanup (esperado 1)', v_n;
  END IF;
  IF v_sched IS DISTINCT FROM '0 2 * * *' THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (c): horário é "%" (esperado "0 2 * * *", o mesmo registrado em cron-inventory.md) — a substituição mudou o agendamento', v_sched;
  END IF;
  IF v_active IS NOT TRUE THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (c): o agendamento alvo NÃO está ativo — a política de retenção seguiria sem executar';
  END IF;

  PERFORM set_config('smoke42i.pass', (coalesce(nullif(current_setting('smoke42i.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): ai-logs-retention-cleanup preservado — horário % e ativo', v_sched;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (d) ESCOPO NEGATIVO — os OUTROS dois agendamentos estão intocados em relação ao
--     que `docs/compliance/cron-inventory.md` registrou em 2026-07-29: existem uma
--     vez cada, com o mesmo horário, ativos, e com a assinatura de corpo que
--     aquele artefato descreve. É a asserção de que a correção não tocou o que
--     não devia.
--
--     ⚠ LIMITE DESTA ASSERÇÃO, dito explicitamente: o inventário de 42-05 NÃO
--     transcreveu o corpo do agregador verbatim (descreveu-o), então aqui não há
--     md5 de referência para os dois. A igualdade byte a byte desses dois corpos
--     é asserida no CHECKPOINT, por `md5(command)` coletado ANTES do apply e
--     comparado com o coletado DEPOIS — dois números que este arquivo estático
--     não teria como conhecer de antemão.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_agg_n int; v_agg_sched text; v_agg_active boolean; v_agg_cmd text;
  v_swp_n int; v_swp_sched text; v_swp_active boolean; v_swp_cmd text;
BEGIN
  SELECT count(*), max(schedule), bool_and(active), max(command)
    INTO v_agg_n, v_agg_sched, v_agg_active, v_agg_cmd
    FROM cron.job WHERE jobname = 'ai-cost-aggregation';

  SELECT count(*), max(schedule), bool_and(active), max(command)
    INTO v_swp_n, v_swp_sched, v_swp_active, v_swp_cmd
    FROM cron.job WHERE jobname = 'notif-retry-sweep';

  IF v_agg_n <> 1 OR v_swp_n <> 1 THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (d): contagem inesperada dos agendamentos vizinhos (ai-cost-aggregation=%, notif-retry-sweep=%; esperado 1 e 1)', v_agg_n, v_swp_n;
  END IF;

  IF v_agg_sched IS DISTINCT FROM '30 1 * * *' THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (d): ai-cost-aggregation tem horário "%" (cron-inventory.md registrou "30 1 * * *") — agendamento fora de escopo foi tocado', v_agg_sched;
  END IF;
  IF v_swp_sched IS DISTINCT FROM '*/15 * * * *' THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (d): notif-retry-sweep tem horário "%" (cron-inventory.md registrou "*/15 * * * *") — agendamento fora de escopo foi tocado', v_swp_sched;
  END IF;
  IF v_agg_active IS NOT TRUE OR v_swp_active IS NOT TRUE THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (d): agendamento vizinho ficou inativo (ai-cost-aggregation=%, notif-retry-sweep=%)', v_agg_active, v_swp_active;
  END IF;

  -- Assinaturas de corpo, conforme cron-inventory.md § "Corpo de cada job".
  IF strpos(v_agg_cmd, 'ai_cost_daily') = 0 OR strpos(v_agg_cmd, 'ON CONFLICT') = 0 THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (d): o corpo de ai-cost-aggregation não tem mais a assinatura registrada (agregação em ai_cost_daily com ON CONFLICT)';
  END IF;
  IF strpos(v_swp_cmd, 'varrer_retry_notificacoes') = 0 THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (d): o corpo de notif-retry-sweep não chama mais varrer_retry_notificacoes';
  END IF;

  PERFORM set_config('smoke42i.pass', (coalesce(nullif(current_setting('smoke42i.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): agendamentos vizinhos intocados — ai-cost-aggregation (% · md5 %) e notif-retry-sweep (% · md5 %)',
    v_agg_sched, md5(v_agg_cmd), v_swp_sched, md5(v_swp_cmd);
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO = 4 (todas de catálogo, nenhuma
--     comportamental adaptativa). Run parcial falha AQUI, não em silêncio.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_n int; v_esperado int := 4;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke42i.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (z): RESUMO % PASS de % esperadas — run parcial; NÃO tratar como verde', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'RESUMO: % asserções PASS de % esperadas (todas negativas, todas de catálogo) — gate VERDE', v_n, v_esperado;
END $$;

RESET ROLE;
