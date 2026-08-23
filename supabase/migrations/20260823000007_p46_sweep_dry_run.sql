-- =============================================================================
-- Phase 46 / Plano 46-04 — PURGA-02 · PURGA-05
-- `varrer_purga_retencao()` v2: o laco de dry-run passa a CHAMAR O MOTOR. A
-- lacuna deliberada do 46-02 fecha aqui, e fecha com UMA chamada dentro de um
-- envelope que ja existia.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM DUAS LINHAS:
-- **ELA NAO DESPACHA REQUISICAO HTTP ALGUMA, NAO LE O VAULT, NAO CRIA NEM REMOVE
-- AGENDAMENTO, E NAO CONTEM UM UNICO VERBO DE ESCRITA SOBRE DADO DE CANDIDATO.**
-- O ramo `live` — com leitura de Vault e o hop de dispatch para a Edge Function
-- `purgar-retencao` — nasce no plano **46-06**, junto com o cron. Nao ha o que
-- "desligar" aqui: a estrutura de dispatch simplesmente nao existe neste arquivo,
-- e o escopo negativo pode afirma-lo porque nao ha `IF` na frente de nada.
--
-- ⚠ O QUE MUDA EM RELACAO AO `20260823000004`: **o interior do bloco por titular,
-- e nada mais**. Cabecalho, leitura do cerco sob bloqueio, materializacao unica,
-- contagem, aborto por cap, heartbeat, kill switch e fechamento sao byte a byte os
-- mesmos. A migration substitui a funcao inteira porque `CREATE OR REPLACE`
-- exige o corpo completo, mas o diff util cabe em uma tela.
--
-- ⚠⚠ PRECONDICAO DURA, E SAO **DUAS** MIGRATIONS (HI-01 do `46-REVIEW.md`): tanto
-- `20260823000006` (o 4o ramo do MOTOR) quanto `20260823000008` (o 3o ramo do
-- PLANO) TEM de estar aplicadas ANTES desta. A segunda e facil de esquecer e a
-- versao anterior deste cabecalho a esquecia: o motor chama
-- `plano_exclusao_titular` no PASSO 0, e o guard ANTIGO daquela funcao recusa
-- chamador sem sessao. Faltando QUALQUER uma das duas, a chamada abaixo recebe
-- 42501 em TODO titular, cada um vira item com `desfecho_postgres = 'falha'` com
-- `relato_dry_run` nulo, e a varredura inteira vira uma lista de recusas — um
-- estado que descreve corretamente o banco e ainda assim seria lido como defeito
-- deste plano.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE pelo ORQUESTRADOR (subagentes GSD nao recebem os tools MCP
-- do Supabase — bug upstream anthropics/claude-code#13898), pela via da Management
-- API com o SQL lido do arquivo, byte a byte (CLAUDE.md §"Via de apply ATUAL").
--
-- ⚠ **NAO HA REPARO DE `version` A FAZER.** Por aquela via a linha de
-- `supabase_migrations.schema_migrations` nasce com a version do nome do arquivo.
-- A instrucao `UPDATE ... SET version` dos cabecalhos das migrations
-- `20260823000001`..`4` esta OBSOLETA; ela continua escrita dentro do banco porque
-- corrigir aqueles arquivos faria o md5 deles divergir do ledger e quebraria a
-- propria prova.
--
-- Sem par de transacao explicita no topo: o driver ja envolve cada migration na
-- sua propria transacao implicita, e um par externo e o gatilho do SQLSTATE 42601
-- (CLAUDE.md §Migrations). Este arquivo tem a combinacao de gatilho: corpo
-- delimitado por cifrao NOMEADO adjacente a `ALTER FUNCTION` / `REVOKE` / `GRANT`
-- / `COMMENT`.
--
-- Conferencia obrigatoria logo apos o apply, **os dois lados registrados**:
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260823000007';
--   -- comparar com:  printf '%s' "$(cat supabase/migrations/20260823000007_*.sql)" | md5
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIENCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NAO
-- -----------------------------------------------------------------------------
--   · O CORPO INTEIRO vem do arquivo `20260823000004_p46_sweep_tracer.sql`, cujo
--     bloco por titular ja nasceu no formato final justamente para que este plano
--     acrescentasse uma CHAMADA, e nao uma ESTRUTURA. O comentario daquele arquivo
--     (`:298-306`) marca o ponto exato da insercao e nomeia a captura tipada.
--
--   · A FORMA DA CAPTURA vem de `20260805000006:760-777` — o terminador do dry-run
--     do motor — e de `supabase/functions/executar-direito-titular/index.ts:975-999`,
--     que e o mesmo tratamento do lado do chamador em TypeScript: o SQLSTATE de
--     dry-run chegando no caminho real vira erro ATRIBUIDO A PASSO, jamais sucesso.
--
--   · ⚠ **NAO foi copiada a captura generica** para o envelope da chamada, e a
--     razao esta escrita no proprio motor (`20260805000006:765-768`): um erro real
--     disfarcado de "dry-run concluido" seria o pior falso verde desta fase, e no
--     sentido inverso um `P45DR` chegando no caminho real passaria por sucesso
--     quando nada foi apagado. A captura e por SQLSTATE nomeado e SO por ele.
--     Bonus mecanico: uma captura tipada deixa `QUERY_CANCELED` (o corte por
--     `statement_timeout`) subir em vez de virar item de ledger falso.
--
--   · ⚠ **NAO foi copiada a leitura de Vault nem o hop de dispatch** de
--     `20260727000001:155-193`. Ver o escopo negativo acima.
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DO PLANO QUE A ENCOMENDOU, E POR QUE
-- -----------------------------------------------------------------------------
-- **DIVERGENCIA 1 — o item e inserido ANTES da chamada, nunca depois.** O plano
-- 46-04 pedia o `INSERT` do item *depois* do bloco da chamada. Isso e impossivel
-- por construcao do guard que o MESMO plano acabou de escrever: o 4o ramo exige
-- **item vivo com `concluido_em IS NULL` para aquele `candidato_id`**, e um item
-- que ainda nao existe nao autoriza nada. Com a ordem invertida, TODA chamada
-- receberia 42501 e a fase inteira provaria zero. A ordem correta ja estava no
-- tracer e continua: o item nasce ABERTO, o motor roda dentro dessa janela, e o
-- `UPDATE` que fecha o item e o mesmo que grava `relato_dry_run`.
--
-- **DIVERGENCIA 2 — "nao levantou" e DEFEITO, exceto por UMA terminacao que e
-- CONTRATO.** O plano pedia `PERFORM` e um `RAISE ... 'P46NT'` incondicional na
-- linha seguinte. Escrito assim, o portao reprovaria trabalho CORRETO: o dry-run
-- do motor tem **DUAS terminacoes**, e as duas estao no `COMMENT` vivo daquela
-- funcao (WR-05) — numa linha VIVA ele termina em `P45DR`; numa linha que JA e
-- tombstone ele **RETORNA NORMALMENTE** com `resultado = 'ja_anonimizado'`, porque
-- o ramo de idempotencia devolve ANTES do terminador. Depois do primeiro `live`,
-- um titular anonimizado continua com linha em `candidatos` e em `candidaturas`
-- (ERASE-08 as preserva), continua alem da janela e continua numa etapa da
-- allowlist — ou seja, **ele volta a ser selecionado**, e um `P46NT` incondicional
-- transformaria essa reincidencia legitima num "defeito" diario.
-- Por isso a chamada usa `SELECT ... INTO` em vez de `PERFORM`: o retorno e
-- DISCRIMINADO. `ja_anonimizado` e registrado como o que e; qualquer OUTRO retorno
-- normal levanta `P46NT`, porque ai sim o terminador sumiu e a transacao teria
-- COMMITADO o corpo destrutivo inteiro.
--
-- **DIVERGENCIA 3 — `processados` continua ZERO.** Nesta versao nada foi
-- processado: o dry-run e revertido por construcao. Um `processados` maior que
-- zero com `modo_vigente` diferente de `live` e a assinatura de que o escopo duplo
-- de D-46-24 foi violado, e manter o numero em zero aqui e o que torna essa
-- assinatura legivel quando o 46-06 chegar.
--
-- -----------------------------------------------------------------------------
-- (4) ORDEM DE ENTREGA + QUAL SMOKE E O CONTRATO
-- -----------------------------------------------------------------------------
-- ⚠⚠ ORDEM DE APPLY OBRIGATORIA, E ELA E **`006 -> 008 -> 007`** (HI-01 do
-- `46-REVIEW.md`; a ordem declarada antes estava ERRADA):
--   1o  20260823000001..5  (config, ledger, predicado, varredura, hold+excecoes)
--   2o  20260823000006     (o 4o ramo do MOTOR + o bloco que ABORTA o apply)
--   3o  20260823000008     (o 3o ramo do PLANO — Blocker B-02)
--   4o  20260823000007     (o laco de dry-run passa a CHAMAR o motor)
--   5o  20260823000009     (o CHECK de dominio em purga_execucoes.modo_vigente)
--
-- ⚠ POR QUE `008` VEM ANTES DE `007`, e a razao e a cadeia de chamadas: `007`
-- chama o MOTOR, e o motor chama `plano_exclusao_titular` no PASSO 0. Sem `008`
-- aplicada, o guard ANTIGO daquela funcao (`20260805000005:201-253`, metade (a):
-- chamador sem sessao -> 42501) recusa o cron — e TODO titular vira
-- `desfecho_postgres = 'falha'` com `relato_dry_run` nulo. Pior: a mensagem de
-- falha da assercao (b) aponta a hipotese no 1 para a `006`, ou seja o
-- diagnostico sairia FALSO, que e o modo de falha que esta fase inteira cataloga.
-- Aplicar `006` e `008` sem `007` e seguro: os ramos novos so autorizam quem
-- estiver dentro de uma execucao de purga, e ate `007` existir ninguem esta.
--
-- A espec executavel e `supabase/tests/p46_purga_smoke.sql`, assercoes **(b)** —
-- o laco termina em `P45DR` e zero coluna mutou — e **(o)** — o 4o ramo recusa
-- fora das condicoes, em quatro casos, e ACEITA no quinto. Elas sao CONTRATO: se
-- algo divergir, corrige-se ESTA migration, nunca o smoke.
-- =============================================================================


CREATE OR REPLACE FUNCTION public.varrer_purga_retencao()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $sweep_purga$
DECLARE
  v_modo     text;
  v_cap      integer;
  v_n        integer;
  v_execucao uuid;
  v_item     uuid;
  r          record;
  -- ── 46-04 ─────────────────────────────────────────────────────────────────
  -- ⚠ `v_relato` E `v_ret` SAO VARIAVEIS LOCAIS, E E POR ISSO QUE O RELATORIO
  --   EXISTE SEM NADA TER PERSISTIDO. O motor executa o corpo COMPLETO e o
  --   derruba com um `RAISE`; a subtransacao que o envolve e revertida inteira,
  --   inclusive as contagens que ele acabou de fazer. Mas variavel plpgsql e
  --   MEMORIA, e o rollback de subtransacao nao a reverte — o resumo capturado
  --   aqui sobrevive ao rollback e e o unico artefato do dry-run.
  v_relato   text;
  v_ret      jsonb;
  -- HI-03 · a reconciliacao de execucoes vencidas, medida para o WARNING
  v_reconc      integer := 0;
  v_reconc_exec integer := 0;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- (a) LER O CERCO, SOB BLOQUEIO DE LINHA
  -- ═══════════════════════════════════════════════════════════════════════════
  -- `FOR UPDATE` serializa contra um flip concorrente de `modo`. Ler a config numa
  -- transação e despachar noutra É a corrida: entre a leitura de `dry_run` e o
  -- dispatch, um administrador pode ter posto `live`, ou vice-versa — e o
  -- resultado seria uma execução que apaga sob um regime que ninguém autorizou.
  -- Sem `WHERE`: a tabela é singleton por construção (id boolean PRIMARY KEY com
  -- CHECK (id)), então "a linha" é inequívoca.
  SELECT cp.modo, cp.cap_titulares
    INTO v_modo, v_cap
    FROM public.config_purga cp
     FOR UPDATE;

  -- ⚠ FAIL-CLOSED: config ausente NÃO é "seguir com o padrão". Se a linha do
  -- singleton sumiu, ninguém sabe sob que regime esta execução deveria rodar, e a
  -- única resposta segura é não rodar — deixando um registro VISÍVEL de que não
  -- rodou, que é o ponto inteiro do heartbeat.
  IF v_modo IS NULL THEN
    INSERT INTO public.purga_execucoes
           (modo_vigente, cap_vigente, elegiveis, processados, veredito, situacao, concluida_em)
    VALUES ('ausente', 0, 0, 0, 'desligado', 'abortada', pg_catalog.now());
    RAISE WARNING 'varrer_purga_retencao: public.config_purga esta VAZIA — execucao abortada sem tocar em nada. Reaplicar o seed de 20260823000001.';
    RETURN;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (a.2) 46-04 · RECONCILIACAO — FECHAR EXECUCOES VENCIDAS ANTES DE QUALQUER
  --       OUTRA COISA (HI-03 do `46-REVIEW.md`)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠⚠ E A OUTRA METADE DO CONSERTO CUJA PRIMEIRA METADE ESTA NO GUARD. O 4o ramo
  -- de `20260823000006` exige `e.iniciada_em > now() - interval '1 hour'`, entao a
  -- AUTORIZACAO ja expira sozinha. Mas expirar a autorizacao nao fecha o item — e
  -- e o ITEM ABERTO que o claim anti-sobreposicao de (b) enxerga. Sem esta secao,
  -- um titular cuja Edge Function morreu (deploy, timeout, `at-most-once` do
  -- `pg_net`) ficaria com item aberto para sempre e **sumiria de todas as
  -- varreduras seguintes, sem ninguem ser avisado** — um registro que deveria ser
  -- purgado e nunca mais e, que e o modo de falha silencioso que PURGA-07 nomeia.
  --
  -- ⚠ A JANELA E A MESMA DO GUARD, E ISSO E OBRIGACAO: se as duas divergissem,
  -- existiria um intervalo em que o item ainda autoriza a destruicao e a varredura
  -- ja o considera orfao, ou o contrario. Uma constante em dois lugares e como as
  -- duas se separam; ate haver um so lugar para escreve-la, o par tem de ser
  -- alterado junto, e esta frase existe para que a proxima pessoa saiba disso.
  --
  -- ⚠ `situacao = 'abortada'` e NAO `'concluida'`: aquela execucao nao chegou ao
  -- fim, e dizer que chegou seria a mesma mentira que carimbar `desfecho = ok` sem
  -- ter tentado. O vocabulario ja existe no CHECK de `20260823000002:151-152`.
  UPDATE public.purga_execucao_itens i
     SET desfecho_postgres = 'falha',
         concluido_em      = pg_catalog.now(),
         relato_dry_run    = coalesce(i.relato_dry_run, '')
           || '[RECONCILIADO] item ABERTO em execucao que nao terminou dentro da janela de 1 hora. '
           || 'A autorizacao do 4o ramo do guard ja havia EXPIRADO; este fechamento devolve o titular '
           || 'as varreduras seguintes, porque um item aberto para sempre o excluiria para sempre.'
   WHERE i.concluido_em IS NULL
     AND EXISTS (
           SELECT 1
             FROM public.purga_execucoes e
            WHERE e.id = i.execucao_id
              AND e.situacao    = 'executando'
              AND e.iniciada_em <= pg_catalog.now() - interval '1 hour'
         );

  GET DIAGNOSTICS v_reconc = ROW_COUNT;

  UPDATE public.purga_execucoes e
     SET situacao     = 'abortada',
         concluida_em = pg_catalog.now()
   WHERE e.situacao    = 'executando'
     AND e.iniciada_em <= pg_catalog.now() - interval '1 hour';

  GET DIAGNOSTICS v_reconc_exec = ROW_COUNT;

  IF v_reconc > 0 OR v_reconc_exec > 0 THEN
    -- ⚠ `WARNING` E O PISO, NAO O TETO: os itens reconciliados ficam gravados com
    -- `desfecho_postgres = 'falha'` e o relato dizendo o que houve, porque uma
    -- falha reportada so por WARNING e uma falha que ninguem ve (a divergencia 1
    -- que este arquivo herdou do 46-02).
    RAISE WARNING 'varrer_purga_retencao: RECONCILIACAO fechou % item(ns) orfao(s) em % execucao(oes) vencida(s) (mais de 1 hora em executando). Investigar a Edge Function purgar-retencao: item aberto para sempre e autorizacao destrutiva permanente pelo guard, e titular excluido para sempre das varreduras pelo claim anti-sobreposicao.', v_reconc, v_reconc_exec;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (b) MATERIALIZAR O CONJUNTO **UMA VEZ**
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Contar de uma consulta e percorrer de outra é a corrida. A temporária dá a
  -- MESMA expressão às duas perguntas — "quantos são" e "quais são" — e é por isso
  -- que `elegiveis` no ledger é o número que o laço efetivamente percorreu, e não
  -- um número parecido.
  --
  -- ⚠ O `NOT EXISTS` de item ABERTO é o CLAIM ANTI-SOBREPOSIÇÃO (Pitfall 6):
  -- efeitos podem se sobrepor sem que as EXECUÇÕES se sobreponham. Um titular que
  -- ficou com item aberto numa execução anterior — porque aquela foi cortada pelo
  -- `statement_timeout`, ou porque um passo falhou entre Storage e Auth — NÃO é
  -- re-selecionado, mesmo continuando além da janela. Correlacionado por
  -- `NOT EXISTS`, jamais por negação de pertencimento a conjunto de valores: com
  -- um conjunto que contenha NULL, aquela forma devolve DESCONHECIDO e o registro
  -- ESCAPA (INVENT-05, `20260730000005`) — aqui "escapar" significaria apagar
  -- alguém duas vezes.
  --
  -- ⚠ `pg_temp.` EXPLÍCITO, e o `DROP` guardado: com `search_path = ''` a
  -- resolução implícita do schema temporário é sutil demais para se confiar num
  -- corpo que decide quem é apagado, e o smoke desta fase chama esta função DUAS
  -- VEZES dentro da mesma transação (a prova de idempotência do dry-run) — onde o
  -- `ON COMMIT DROP` ainda não teria disparado.
  IF pg_catalog.to_regclass('pg_temp.tmp_purga_alvos') IS NOT NULL THEN
    DROP TABLE pg_temp.tmp_purga_alvos;
  END IF;

  CREATE TEMP TABLE tmp_purga_alvos ON COMMIT DROP AS
    SELECT t.candidato_id,
           t.candidaturas_alem,
           t.etapa,
           t.janela_meses_aplicada,
           t.ancora_origem,
           t.ancora_em
      FROM public.titulares_alem_da_janela() t
     WHERE NOT EXISTS (
             SELECT 1
               FROM public.purga_execucao_itens i
              WHERE i.candidato_id = t.candidato_id
                AND i.concluido_em IS NULL
           );

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (c) O NÚMERO — contado da temporária, e de mais lugar nenhum
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT count(*)::integer INTO v_n FROM pg_temp.tmp_purga_alvos;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (d) CAP — ABORTO INTEGRAL (D-46-08 / PURGA-05)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠ NUNCA RECORTA O TRABALHO PELO CAP. Não há `LIMIT v_cap` neste corpo, e a
  -- ausência dele é o requisito — ver a seção (3) do cabeçalho. Zero linha tocada,
  -- zero item, zero dispatch.
  --
  -- ⚠ ORDEM DELIBERADA: o cap é avaliado ANTES do kill switch. Um conjunto grande
  -- demais é informação que o operador precisa ter mesmo com a purga desligada —
  -- é o sinal de que o predicado pode ter quebrado. Nada fica mascarado, porque
  -- `modo_vigente` é gravado na mesma linha: uma linha `cap_excedido` com
  -- `modo_vigente = 'off'` diz as duas coisas de uma vez.
  IF v_n > v_cap THEN
    INSERT INTO public.purga_execucoes
           (modo_vigente, cap_vigente, elegiveis, processados, veredito, situacao, concluida_em)
    VALUES (v_modo, v_cap, v_n, 0, 'cap_excedido', 'concluida', pg_catalog.now());
    RAISE WARNING 'varrer_purga_retencao: conjunto elegivel (%) EXCEDE o cap (%) — execucao ABORTADA INTEIRA, zero linha tocada. Isto nao e um limite de lote: um conjunto acima do cap e sinal de predicado quebrado, e processar ate o cap apagaria gente em silencio (D-46-08).', v_n, v_cap;
    RETURN;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (e)+(f) HEARTBEAT E KILL SWITCH — o cabeçalho é gravado SEMPRE
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠ O KILL SWITCH É PROVADO DESLIGANDO DE VERDADE (D-46-09 / SC#3), nunca por
  -- leitura de config. Por isso o ramo `off` não é um `RETURN` mudo no topo da
  -- função: ele CONTA os elegíveis, grava a linha com `veredito = 'desligado'` e
  -- `processados = 0`, e só então retorna — ANTES de qualquer item. É uma execução
  -- real que não apaga nada, e o ledger prova isso por escrito.
  --
  -- ⚠ O cabeçalho é gravado inclusive com `elegiveis = 0`. É isso que torna
  -- detectável a lacuna "nenhuma linha de ledger há mais de 36 h", e é isso que
  -- torna mensurável o critério de D-46-14. `cron.job_run_details` não serve:
  -- acumula disco, não é limpo automaticamente, sobrevive ao desagendamento, e
  -- registra que o JOB rodou — não que a POLÍTICA foi aplicada.
  IF v_modo = 'off' THEN
    INSERT INTO public.purga_execucoes
           (modo_vigente, cap_vigente, elegiveis, processados, veredito, situacao, concluida_em)
    VALUES (v_modo, v_cap, v_n, 0, 'desligado', 'concluida', pg_catalog.now());
    RETURN;
  END IF;

  INSERT INTO public.purga_execucoes
         (modo_vigente, cap_vigente, elegiveis, processados, veredito, situacao)
  VALUES (v_modo, v_cap, v_n, 0, 'dry_run', 'executando')
  RETURNING id INTO v_execucao;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (g) O LAÇO — um item por titular, cada um em subtransação própria
  -- ═══════════════════════════════════════════════════════════════════════════
  -- As colunas de política vêm DIRETO da temporária, ou seja: do par (origem, em)
  -- que o `LATERAL` do predicado calculou UMA vez. Recomputá-las aqui seria a
  -- segunda cópia, e é assim que o ledger passaria a mentir sobre por que a linha
  -- foi escolhida.
  FOR r IN SELECT * FROM pg_temp.tmp_purga_alvos LOOP
    BEGIN
      -- O item nasce ABERTO (`concluido_em` nulo). Entre este `INSERT` e o
      -- `UPDATE` que o fecha está a janela em que o motor roda — e é exatamente
      -- essa janela que o claim anti-sobreposição de (b) enxerga.
      INSERT INTO public.purga_execucao_itens
             (execucao_id, candidato_id, etapa, janela_meses_aplicada, ancora_origem, ancora_em)
      VALUES (v_execucao, r.candidato_id, r.etapa, r.janela_meses_aplicada, r.ancora_origem, r.ancora_em)
      RETURNING id INTO v_item;

      -- ══ 46-04 · A CHAMADA AO MOTOR — A LACUNA DELIBERADA DO 46-02 FECHA AQUI ══
      -- ⚠ ELA E O REQUISITO INTEIRO DO PURGA-02: o dry-run tem de sair da MESMA
      --   EXPRESSAO do delete real. Nao "uma query equivalente", nao "o mesmo
      --   WHERE copiado" — a MESMA CHAMADA DE FUNCAO. O motor executa o corpo
      --   COMPLETO (as doze mutacoes, na ordem que a plataforma impoe) e so entao
      --   derruba tudo com o terminador. Uma segunda definicao de exclusao no
      --   banco e como o dry-run passa a mentir sobre a purga sem que ninguem
      --   perceba, e tem nome neste projeto: P39 / CR-02.
      --
      -- ⚠ O SEGUNDO ARGUMENTO E O LITERAL `true`, e nao uma expressao derivada do
      --   modo. O ramo `live` nasce no 46-06; enquanto ele nao existe, um
      --   `v_modo <> 'live'` aqui seria um caminho destrutivo com um `IF` na
      --   frente — exatamente a unica coisa que o escopo negativo deste arquivo
      --   promete nao criar.
      --
      -- ⚠ O ITEM JA ESTA ABERTO NESTE PONTO, E ISSO E PRE-CONDICAO, NAO ORDEM
      --   ARBITRARIA: o 4o ramo do guard (`20260823000006`) exige item vivo com
      --   `concluido_em IS NULL` para este `candidato_id`. Inserir o item depois
      --   da chamada faria TODA chamada receber 42501.
      v_relato := NULL;
      v_ret    := NULL;

      BEGIN
        SELECT public.anonimizar_candidato(r.candidato_id, true) INTO v_ret;

        -- ⚠⚠ CHEGAR A ESTA LINHA E, EM REGRA, DEFEITO — E O DEFEITO MAIS CARO QUE
        --   ESTE ARQUIVO PODE ENCONTRAR: significa que o terminador do dry-run
        --   sumiu do motor e que a transacao teria COMMITADO o corpo destrutivo.
        --   "Nao lancou" nunca foi o mesmo que "completou".
        --
        -- ⚠ EXCETO POR UMA TERMINACAO, E ELA E CONTRATO (WR-05, escrito no COMMENT
        --   vivo do motor): o dry-run tem DUAS terminacoes. Numa linha VIVA ele
        --   termina em `P45DR`; numa linha que JA e tombstone ele RETORNA
        --   NORMALMENTE com `resultado = 'ja_anonimizado'`, porque o ramo de
        --   idempotencia por ESTADO devolve ANTES do terminador, sem mutar coluna
        --   alguma. Depois do primeiro `live`, um titular anonimizado continua com
        --   linha em `candidatos` e em `candidaturas` (ERASE-08 as preserva),
        --   continua alem da janela e continua numa etapa da allowlist — ou seja,
        --   ele VOLTA a ser selecionado. Tratar essa reincidencia legitima como
        --   defeito seria um portao correto reprovando trabalho correto, todo dia.
        IF (v_ret ->> 'resultado') = 'ja_anonimizado' THEN
          v_relato := 'P45 DRY-RUN (2a terminacao, WR-05): o titular JA e tombstone. O motor reconheceu a sentinela por ESTADO e devolveu ja_anonimizado ANTES do terminador, sem mutar coluna alguma e sem criar linha de auditoria. Nao e defeito: e a idempotencia por estado funcionando.';
        ELSE
          RAISE EXCEPTION 'P46 DRY-RUN NAO TERMINOU: public.anonimizar_candidato(%, true) RETORNOU NORMALMENTE com resultado = %. As duas terminacoes CONTRATADAS do dry-run sao o SQLSTATE P45DR (linha viva) e o retorno ja_anonimizado (linha que ja e tombstone) — qualquer outro retorno normal significa que o terminador sumiu do corpo do motor e que esta transacao teria COMMITADO as doze mutacoes destrutivas. Com PITR desligado (D-45-10) e o Storage fora do backup, isso seria irrecuperavel. A varredura e DERRUBADA aqui de proposito, sem gravar item nem fechar a execucao: uma linha de ledger dizendo falha diria a coisa errada, e um sweep que continuasse repetiria o corpo destrutivo em cada titular restante',
            r.candidato_id, coalesce(v_ret ->> 'resultado', '<nulo>')
            USING ERRCODE = 'P46NT';
        END IF;

      EXCEPTION
        -- ⚠⚠ CAPTURA TIPADA, E SO ELA. A captura generica e PROIBIDA NESTE
        --   ENVELOPE, e a razao esta escrita no proprio motor
        --   (`20260805000006:765-768`): um erro real disfarcado de "dry-run
        --   concluido" seria o pior falso verde desta fase, e no sentido inverso
        --   um `P45DR` chegando no caminho real passaria por sucesso quando nada
        --   foi apagado. Tudo o que NAO for o terminador — 42501 do guard, erro
        --   real, corte por timeout — sobe para o envelope de fora e vira o que
        --   deve virar: falha atribuida, e nunca sucesso.
        WHEN SQLSTATE 'P45DR' THEN
          -- `SQLERRM` traz as doze contagens por passo que o motor acabou de
          -- produzir. A subtransacao deste bloco ja foi revertida; a variavel,
          -- nao. E assim que o relatorio existe sem nada ter persistido.
          v_relato := SQLERRM;
      END;

      -- Fechamento do item. Os três desfechos ficam em `nao_aplicavel` porque
      -- NADA foi tentado — dizer `ok` aqui seria a mentira mais cara possível
      -- neste arquivo. `concluido_em` é LOAD-BEARING: sem ele o titular ficaria
      -- com item aberto e a execução seguinte o excluiria para sempre.
      -- ⚠ 46-04: `relato_dry_run` recebe a variavel local, e ela e NOT NULL por
      --   construcao — os dois unicos caminhos que chegam aqui a preenchem. Um
      --   item com `relato_dry_run` nulo significa que a chamada nao aconteceu, e
      --   a assercao (b) do smoke reprova exatamente sobre isso.
      UPDATE public.purga_execucao_itens i
         SET desfecho_storage  = 'nao_aplicavel',
             desfecho_postgres = 'nao_aplicavel',
             desfecho_auth     = 'nao_aplicavel',
             relato_dry_run    = v_relato,
             concluido_em      = pg_catalog.now()
       WHERE i.id = v_item;

    EXCEPTION
      -- ⚠⚠ 46-04 · DUAS CONDICOES QUE **NAO** VIRAM ITEM DE LEDGER E SOBEM ATE
      --   DERRUBAR A VARREDURA. O envelope por titular existe para que a falha de
      --   UM nao aborte os demais — e isso continua valendo para falhas de um
      --   titular. Estas duas nao sao falhas de um titular:
      --
      --   · `P46NT` — o terminador do dry-run sumiu do MOTOR. E uma propriedade do
      --     corpo daquela funcao, nao daquele candidato: os titulares restantes
      --     teriam o corpo destrutivo executado tambem. Registrado como
      --     `desfecho_postgres = 'falha'`, viraria N linhas dizendo "a purga teve
      --     falhas" quando o fato e "uma funcao destrutiva perdeu o freio" —
      --     diagnostico FALSO, que e o modo de falha que esta fase inteira cataloga.
      --
      --   · `query_canceled` — o corte por `statement_timeout`. Engolido, cada
      --     statement seguinte seria cortado de novo e o ledger encheria de itens
      --     com `falha` que descrevem o relogio, e nao o dado.
      --
      --   ⚠ CONSEQUENCIA ACEITA E DECLARADA: subindo daqui, o cabecalho da
      --   execucao tambem e revertido e o heartbeat daquele dia NAO existe. A
      --   ausencia da linha somada ao registro de falha do job e um sinal
      --   INEQUIVOCO; uma linha `concluida` com N falhas dentro nao seria.
      WHEN SQLSTATE 'P46NT' THEN
        RAISE;
      WHEN query_canceled THEN
        RAISE;
      WHEN OTHERS THEN
      -- Uma falha de um titular NÃO aborta os demais (idioma de
      -- `20260727000001:194-196`) — mas, divergindo do analog, ela NÃO fica só no
      -- `WARNING`: `WARNING` não marca o job como `failed`, não chega ao
      -- `return_message` do cron e não sobrevive à rotação de log. A falha vira
      -- LINHA DE LEDGER. O registro da falha roda no seu próprio envelope para
      -- que não conseguir registrar também não derrube a varredura.
      RAISE WARNING 'varrer_purga_retencao: titular % falhou (%: %)', r.candidato_id, SQLSTATE, SQLERRM;
      BEGIN
        INSERT INTO public.purga_execucao_itens
               (execucao_id, candidato_id, etapa, janela_meses_aplicada, ancora_origem, ancora_em,
                desfecho_storage, desfecho_postgres, desfecho_auth, concluido_em)
        VALUES (v_execucao, r.candidato_id, r.etapa, r.janela_meses_aplicada, r.ancora_origem, r.ancora_em,
                'nao_aplicavel', 'falha', 'nao_aplicavel', pg_catalog.now());
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'varrer_purga_retencao: nem o registro da falha do titular % pode ser gravado (%: %)', r.candidato_id, SQLSTATE, SQLERRM;
      END;
    END;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (h) FECHAMENTO
  -- ═══════════════════════════════════════════════════════════════════════════
  -- `processados = 0` é literal e não é preguiça: nesta versão NADA foi
  -- processado, e o número tem de dizer isso. Um `processados` maior que zero com
  -- `modo_vigente` diferente de `live` é a assinatura de que o escopo duplo de
  -- D-46-24 foi violado — deixá-lo em zero aqui é o que torna essa assinatura
  -- legível quando o **46-06** chegar. (LO-01 do `46-REVIEW.md`: esta seta
  -- apontava para o 46-04, que é o plano que escreveu ESTE arquivo — num arquivo
  -- cujo valor está na prosa, uma referência ao plano que já terminou manda a
  -- próxima pessoa para o lugar errado.)
  UPDATE public.purga_execucoes e
     SET processados  = 0,
         veredito     = 'dry_run',
         situacao     = 'concluida',
         concluida_em = pg_catalog.now()
   WHERE e.id = v_execucao;
END;
$sweep_purga$;

-- ⚠ `statement_timeout` PRÓPRIO (Pitfall 8). O global do papel `postgres` é 2 min
-- (medido em PROD 2026-08-22), e um laço com uma subtransação por titular é caro
-- de entrar e de sair. Sem este `ALTER`, um sweep cortado pelo timeout global
-- acusaria o lugar errado — e a mensagem de erro é o que alguém vai ler às 3 da
-- manhã. 300s é folgado para o cap de 50 e ainda assim finito.
ALTER FUNCTION public.varrer_purga_retencao() SET statement_timeout = '300s';

-- ACL: esta função escreve no ledger e, a partir do 46-04, dispara o motor
-- destrutivo. Nenhum papel de cliente a alcança. `FROM PUBLIC` sozinho NÃO basta:
-- o `pg_default_acl` do schema `public` neste projeto concede EXECUTE a `anon` e
-- `authenticated` como grants DIRETOS E NOMEADOS em todo `CREATE FUNCTION`
-- (medição de 2026-07-30: 61 funções DEFINER com EXECUTE para `anon`).
REVOKE ALL ON FUNCTION public.varrer_purga_retencao()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.varrer_purga_retencao() TO service_role;

COMMENT ON FUNCTION public.varrer_purga_retencao() IS
  'Phase 46 / 46-02 PURGA-02/05/06: a VARREDURA da purga de retencao. Acionada pelo cron '
  'purga-retencao-sweep (0 3 * * *, D-46-10) — que nasce no plano 46-06; hoje ela so e chamada a '
  'mao e pelo smoke. '
  'ORDEM DO CORPO, e ela E o requisito: '
  '(a) le public.config_purga sob FOR UPDATE — serializa contra um flip concorrente de modo; ler a '
  'config numa transacao e despachar noutra E a corrida. Config ausente e FAIL-CLOSED: grava '
  'cabecalho com modo_vigente = ausente / situacao = abortada e retorna. '
  '(b) materializa o conjunto UMA vez numa temporaria ON COMMIT DROP, a partir de '
  'public.titulares_alem_da_janela(), EXCLUINDO por NOT EXISTS todo candidato_id com item ABERTO '
  '(concluido_em nulo) de execucao anterior — o claim anti-sobreposicao do Pitfall 6: efeitos podem '
  'se sobrepor sem que as execucoes se sobreponham. '
  '(c) conta da temporaria, e de mais lugar nenhum: contar de uma consulta e percorrer de outra e a '
  'corrida que a temporaria existe para nao ter. '
  '(d) CAP (D-46-08 / PURGA-05): se elegiveis > cap_titulares, grava veredito cap_excedido, '
  'processados 0, situacao concluida, e RETORNA. Zero linha tocada, zero item, zero dispatch. '
  '⚠ ELA NUNCA RECORTA O TRABALHO PELO CAP — nao existe LIMIT neste corpo, e a ausencia dele e o '
  'requisito. Com PITR desligado (D-45-10) e o Storage fora do backup, um CV apagado e '
  'irrecuperavel; um predicado quebrado que processasse ate o cap apagaria 50 pessoas reais por dia, '
  'em silencio. Abortar torna a purga RECUSAVEL POR DESENHO. Como o despacho HTTP do pg_net so ocorre no '
  'COMMIT, retornar antes garante zero request por ESTRUTURA, nao por esperanca. '
  '(e) HEARTBEAT: o cabecalho e gravado em TODA execucao, inclusive com modo off e com elegiveis 0. '
  'E isso que torna detectavel "nenhuma linha de ledger ha mais de 36 h" e mensuravel o criterio de '
  'D-46-14. cron.job_run_details NAO serve: acumula disco, nao e limpo automaticamente, sobrevive ao '
  'desagendamento, e registra que o JOB rodou — nao que a POLITICA foi aplicada. '
  '(f) KILL SWITCH: com modo = off, grava veredito desligado, processados 0, e retorna ANTES de '
  'qualquer item. D-46-09 / SC#3 exigem que o kill switch seja provado DESLIGANDO DE VERDADE, por '
  'execucao real que nao apaga nada — nunca por leitura de config, e por isso o ramo off nao e um '
  'RETURN mudo: ele conta os elegiveis primeiro. '
  '(g) LACO: um item por titular, cada um em subtransacao propria, com as colunas de politica vindas '
  'DIRETO da temporaria (ou seja, do par (origem, em) que o LATERAL do predicado calculou uma vez). '
  'Falha de um titular NAO aborta os demais e vira LINHA DE LEDGER com desfecho_postgres = falha — '
  'divergencia deliberada do analog 20260727000001, cujo RAISE WARNING sozinho nao marca o job como '
  'failed nem chega ao return_message. '
  '(h) FECHAMENTO: processados 0, veredito dry_run, situacao concluida, concluida_em carimbado. '
  '⚠⚠ 46-04 — A LACUNA DO 46-02 ESTA FECHADA: o laco CHAMA public.anonimizar_candidato(id, true), e '
  'e dai que o dry-run sai. PURGA-02 exige que o dry-run saia da MESMA EXPRESSAO do delete real — '
  'nao uma query equivalente, nao o mesmo WHERE copiado, a MESMA chamada de funcao. O motor executa o '
  'corpo COMPLETO e so entao o derruba com o terminador; uma segunda definicao de exclusao no banco e '
  'como o dry-run passa a mentir sobre a purga sem ninguem perceber (P39 / CR-02). '
  'ORDEM DENTRO DO BLOCO POR TITULAR, e ela e PRE-CONDICAO e nao arbitrio: o item nasce ABERTO, o '
  'motor roda DENTRO dessa janela — o 4o ramo do guard (20260823000006) exige item com concluido_em '
  'nulo para aquele candidato_id — e so entao o UPDATE fecha o item e grava relato_dry_run. '
  'CAPTURA TIPADA E SO ELA: WHEN SQLSTATE P45DR, jamais captura generica no envelope da chamada. Um '
  'erro real disfarcado de dry-run concluido seria o pior falso verde desta fase, e no sentido '
  'inverso um P45DR chegando no caminho real passaria por sucesso quando nada foi apagado. O SQLERRM '
  'capturado traz as doze contagens por passo, e sobrevive ao rollback da subtransacao porque '
  'variavel plpgsql e memoria — e assim que o relatorio existe sem NADA ter persistido. '
  'AS DUAS TERMINACOES CONTRATADAS DO DRY-RUN (WR-05): P45DR numa linha VIVA, e retorno normal com '
  'resultado = ja_anonimizado numa linha que JA e tombstone, porque a idempotencia por ESTADO devolve '
  'ANTES do terminador. As duas sao registradas em relato_dry_run. QUALQUER OUTRO retorno normal e '
  'DEFEITO e levanta o ERRCODE proprio P46NT: significa que o terminador sumiu do corpo do motor e '
  'que a transacao teria COMMITADO as doze mutacoes destrutivas. '
  'P46NT e query_canceled NAO viram item de ledger: sao re-levantados e DERRUBAM a varredura. Nao sao '
  'falhas de UM titular — a primeira e uma propriedade do corpo do motor (os titulares restantes '
  'teriam o corpo destrutivo executado tambem) e a segunda e o relogio. Registra-las como falha diria '
  'a coisa errada. Consequencia aceita: nesses dois casos o cabecalho tambem e revertido e o '
  'heartbeat do dia nao existe — a ausencia da linha somada ao registro de falha do job e um sinal '
  'inequivoco, e uma linha concluida com N falhas dentro nao seria. '
  '⚠ AINDA SEM DISPATCH: este corpo NAO le o Vault e NAO despacha requisicao HTTP alguma pelo pg_net. '
  'O ramo live, com a Edge Function purgar-retencao, nasce no plano 46-06 junto com o cron. '
  'processados continua ZERO: um processados maior que zero fora de modo live e a assinatura de que o '
  'escopo DUPLO de D-46-24 foi violado. '
  'statement_timeout proprio de 300s (Pitfall 8) porque o global do papel postgres e 2 min. '
  'SECURITY DEFINER com search_path vazio; REVOKE nominal de PUBLIC, anon e authenticated; GRANT '
  'EXECUTE apenas a service_role.';
