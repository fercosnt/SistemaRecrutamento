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
--   (a) O INVENTÁRIO de `cron.job` bate o que o repositório declara: os três
--       agendamentos herdados existem, cada um UMA vez e aferido por igualdade
--       exata de `jobname`; o agendamento da purga existe UMA vez; e não há mais
--       nenhum outro. Fecha o modo de falha em que o guard de remoção condicional
--       falha e um agendamento é duplicado, passando a rodar duas vezes por
--       noite, e o modo de falha em que aparece um agendamento que ninguém
--       declarou.
--       ⚠ CONVERTIDA DE INSTANTÂNEO EM INVARIANTE EM 2026-08-23 pela Phase 46
--       (plano 46-06, D-46-23), no MESMO commit que criou o 4º agendamento. Ver
--       o bloco de razão logo acima da asserção.
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
-- =============================================================================
-- EMENDA DE 2026-08-23 — a asserção (a) era um INSTANTÂNEO (Phase 46 / D-46-23)
-- =============================================================================
-- Até esta data a asserção (a) comparava `count(*) FROM cron.job` contra a
-- **constante 3**. Ela nasceu correta e envelheceu: no dia em que a Phase 46
-- criasse o 4º agendamento — trabalho planejado, revisado e correto — este portão
-- ficaria VERMELHO, e a mensagem dele culparia *"guard de remoção condicional
-- falhou e o alvo ficou duplicado"*, uma causa que não teria acontecido. O
-- `CLAUDE.md` registra esta exata asserção como o exemplo canônico da família
-- "contagem contra constante reprova trabalho correto com diagnóstico FALSO", e
-- um portão que reprova trabalho correto treina quem executa a desligá-lo.
--
-- O conserto NÃO é afrouxar a contagem para 4 — isso seria trocar uma fotografia
-- por outra, e a próxima fase pagaria de novo. O conserto é medir a PROPRIEDADE
-- que o teste sempre quis medir: *o inventário vivo é exatamente o que o
-- repositório declara*. Três verificações, no idioma que o
-- `p43_matriz_retencao_smoke.sql:220-252` já usou em 2026-08-03 para a mesma
-- classe de defeito:
--
--   (a.i)   os três `jobname` herdados existem, cada um por igualdade exata;
--   (a.ii)  existe exatamente UM `purga-retencao-sweep`;
--   (a.iii) não existe nenhum outro `jobname` além desses quatro — é esta que
--           continua pegando o agendamento duplicado e o intruso, que era o valor
--           real do teste original.
--
-- ⚠ A LISTA DE QUATRO NOMES É UM ESCOPO DELIBERADO, E NÃO UMA FOTOGRAFIA — e a
-- diferença é o que o `CLAUDE.md` manda perguntar antes de escrever uma lista
-- literal num portão. Este arquivo é o gate do INVENT-03, cujo requisito É que
-- todo agendamento vivo seja rastreável ao repositório. Quando uma fase futura
-- criar um 5º job, (a.iii) reprova dizendo **o nome dele** — um diagnóstico
-- VERDADEIRO ("existe um agendamento que este inventário não conhece"), que
-- aponta para `docs/compliance/cron-inventory.md` e para esta lista. Acrescentar
-- o nome aqui passa a ser parte de criar um job, exatamente como a Phase 46 fez.
-- Uma contagem nua não teria como dizer o nome, e é por isso que ela mentia.
--
-- ⚠ E (a.iii) É CORRELACIONADA POR `NOT EXISTS`, JAMAIS POR NEGAÇÃO DE
-- PERTENCIMENTO A CONJUNTO. `cron.job.jobname` é anulável (a forma de dois
-- argumentos de `cron.schedule` agenda sem nome), e `jobname <> ALL (lista)` com
-- `jobname` NULO avalia DESCONHECIDO — o intruso sem nome ESCAPARIA. Escrever a
-- forma que falha ABERTO dentro do arquivo que existe para corrigir exatamente
-- essa forma seria a ironia mais cara possível.
--
-- HIGIENE: `RESET ROLE` nas trocas; os NOTICEs carregam contagens, horários e
--   resumos md5 — nunca segredo, nunca PII.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke42i.pass', '0', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) INVENTÁRIO — o conjunto vivo de `cron.job` é EXATAMENTE o que o repositório
--     declara. Três verificações, nenhuma delas uma contagem nua contra uma
--     constante. Ver a §"EMENDA DE 2026-08-23" no cabeçalho: esta asserção era um
--     instantâneo de 3 agendamentos e teria reprovado, com diagnóstico FALSO, o
--     trabalho correto que criou o 4º.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  -- ⚠ ESCOPO DELIBERADO, NÃO FOTOGRAFIA — a justificativa por extenso está no
  --   cabeçalho. Um job novo entra AQUI conscientemente, no mesmo commit que o
  --   cria; até lá, (a.iii) morde e diz o nome dele.
  c_herdados constant text[] := ARRAY['ai-cost-aggregation',
                                      'ai-logs-retention-cleanup',
                                      'notif-retry-sweep'];
  c_purga    constant text   := 'purga-retencao-sweep';
  v_nomes    text;
  v_faltando text;
  v_intrusos text;
  v_dup      text;
  v_n_purga  int;
BEGIN
  SELECT string_agg(coalesce(j.jobname, '<sem nome>'), ', ' ORDER BY coalesce(j.jobname, '<sem nome>'))
    INTO v_nomes
    FROM cron.job j;

  -- (a.i) os TRÊS herdados existem, cada um por IGUALDADE EXATA de `jobname`.
  SELECT string_agg(x.nome, ', ' ORDER BY x.nome)
    INTO v_faltando
    FROM unnest(c_herdados) AS x(nome)
   WHERE NOT EXISTS (SELECT 1 FROM cron.job j WHERE j.jobname = x.nome);

  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (a.i): agendamento(s) herdado(s) AUSENTE(S) de cron.job: [%]. Vivos agora: [%]. Uma migration removeu um agendamento fora do seu escopo declarado — cada um dos três tem dono no repositório (ai-cost-aggregation e ai-logs-retention-cleanup em 20260609000003, notif-retry-sweep em 20260727000001), e nenhuma migration desta fase os menciona',
      v_faltando, coalesce(v_nomes, '<nenhum>');
  END IF;

  -- (a.ii) existe exatamente UM agendamento de purga.
  -- ⚠ ESTA COMPARAÇÃO CONTRA `1` É UMA CARDINALIDADE POR NOME, e não uma
  --   contagem de inventário contra um instantâneo: ela não muda quando o sistema
  --   ganha agendamentos, só quando ESTE agendamento é duplicado ou some. É a
  --   mesma forma que (c) já usa para o alvo do INVENT-05, e ela é invariante.
  SELECT count(*) INTO v_n_purga FROM cron.job j WHERE j.jobname = c_purga;

  IF v_n_purga <> 1 THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (a.ii): há % agendamento(s) chamados % (esperado exatamente 1). ZERO significa que a migration 20260823000012 não está aplicada neste banco — e então não existe purga automática, só uma função que ninguém chama. MAIS DE UM significa que o guard de remoção condicional daquela migration não mordeu, e a purga passaria a rodar duas vezes por noite: em live, duas varreduras concorrentes disputando os mesmos titulares',
      v_n_purga, c_purga;
  END IF;

  -- (a.iii) NENHUM outro `jobname` além desses quatro — e nenhum deles duplicado.
  -- ⚠ Correlacionado por NOT EXISTS, jamais por negação de pertencimento a
  --   conjunto: `jobname` é anulável (cron.schedule de dois argumentos agenda sem
  --   nome) e a forma banida devolveria DESCONHECIDO para o intruso sem nome,
  --   deixando-o ESCAPAR. É o INVENT-05 literal, dentro do gate do INVENT-05.
  SELECT string_agg(coalesce(j.jobname, '<sem nome, jobid ' || j.jobid || '>'), ', ')
    INTO v_intrusos
    FROM cron.job j
   WHERE NOT EXISTS (
           SELECT 1 FROM unnest(c_herdados || ARRAY[c_purga]) AS a(nome)
            WHERE a.nome = j.jobname
         );

  IF v_intrusos IS NOT NULL THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (a.iii): existe(m) agendamento(s) vivo(s) que este inventário NÃO conhece: [%]. Vivos agora: [%]. ⚠ Este portão NÃO decide a causa, e não vai inventar uma: ou a fase que criou o agendamento não atualizou esta lista e o docs/compliance/cron-inventory.md — e o conserto é acrescentar o nome nos dois, no mesmo commit que o cria —, ou ele foi criado FORA do repositório, que é a hipótese processo-origem-do-drift-desconhecida que este projeto mantém em aberto. O nome acima é o que discrimina as duas',
      v_intrusos, coalesce(v_nomes, '<nenhum>');
  END IF;

  SELECT string_agg(t.jobname || ' x' || t.n, ', ' ORDER BY t.jobname)
    INTO v_dup
    FROM (SELECT j.jobname, count(*) AS n
            FROM cron.job j
           WHERE j.jobname IS NOT NULL
           GROUP BY j.jobname
          HAVING count(*) > 1) t;

  IF v_dup IS NOT NULL THEN
    RAISE EXCEPTION 'P42-INVENT05 FAIL (a.iii): agendamento(s) DUPLICADO(S) em cron.job: [%]. Cada nome tem de aparecer uma vez só — um duplicado roda o mesmo corpo duas vezes por período, e o par desagendar-antes-de-agendar existe em toda migration de cron deste repositório justamente para que reaplicar não duplique',
      v_dup;
  END IF;

  PERFORM set_config('smoke42i.pass', (coalesce(nullif(current_setting('smoke42i.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): inventário de cron.job bate o repositório — os três herdados presentes por igualdade exata de nome, exatamente um %, nenhum intruso e nenhum duplicado [%]', c_purga, v_nomes;
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
-- (d) ESCOPO NEGATIVO — os outros dois agendamentos HERDADOS estão intocados em
--     relação ao que `docs/compliance/cron-inventory.md` registrou em 2026-07-29.
--     ⚠ "Dois" continua exato depois da Phase 46: este bloco cobre os vizinhos do
--     alvo do INVENT-05 entre os TRÊS herdados. O 4º agendamento
--     (`purga-retencao-sweep`, criado em 2026-08-23) não pertence a este
--     antes/depois — ele não existia em 2026-07-29, não há estado anterior dele a
--     preservar, e quem o afere é a asserção (a) aqui e a asserção (a) do
--     `p46_purga_smoke.sql`, que pina o `md5(command)` dele.
--     Os dois vizinhos: existem uma
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
