-- =============================================================================
-- Phase 46 / Plan 46-02 (TRACER) — PURGA-02 · PURGA-05 · PURGA-06
-- A varredura: lê o cerco sob bloqueio, materializa o conjunto UMA vez, aborta
-- inteira se ele exceder o cap, grava o heartbeat sempre, e registra no ledger o
-- que selecionou e sob qual política — sem apagar nada.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM DUAS LINHAS (esta migration é a mais perigosa das quatro
-- em aparência, e a mais inofensiva em efeito — dizer isso no topo é o que
-- permite ao code review saber onde olhar):
-- **ELA NÃO CHAMA `public.anonimizar_candidato`, NÃO LÊ O VAULT, NÃO EXECUTA
-- `net.http_post`, NÃO CRIA NEM REMOVE AGENDAMENTO, E NÃO CONTÉM UM ÚNICO VERBO
-- DE ESCRITA SOBRE DADO DE CANDIDATO.** As únicas tabelas que ela escreve são
-- `public.purga_execucoes` e `public.purga_execucao_itens`, criadas vazias pela
-- migration `20260823000002` e desenhadas para não conter PII.
--
-- ⚠⚠ A LACUNA DELIBERADA, NOMEADA E DATADA. O laço percorre os titulares e grava
-- um item por titular, mas **ainda não chama o motor**
-- `public.anonimizar_candidato(...)` — porque a metade (a) do guard daquela
-- função (`20260805000006:341-349`) recusa QUALQUER chamador sem sessão, e um
-- cron não tem sessão (medido em PROD 2026-08-22: `auth.uid()`,
-- `auth.jwt() #>> '{app_metadata,role}'` e `request.jwt.claims` os TRÊS nulos sob
-- `postgres`). O 4º ramo autorizado que resolve isso é D-46-18, com o escopo
-- duplo de D-46-24, e nasce no plano **46-04**. O laço, a subtransação por
-- titular, o carimbo de `concluido_em` e a coluna `relato_dry_run` já nascem
-- AQUI, no formato final. **É um vão de FUNCIONALIDADE, nunca de arquitetura** —
-- o 46-04 acrescenta uma chamada dentro de um `BEGIN … EXCEPTION` que já existe,
-- e não move nenhuma peça.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR
-- (subagentes GSD não recebem os tools MCP do Supabase — bug upstream
-- anthropics/claude-code#13898). Sem par de transacao explicita no topo deste
-- arquivo: o driver ja envolve cada migration na sua propria transacao
-- implicita, e um par externo de abertura e fechamento de transacao
-- e o gatilho do SQLSTATE 42601 ("cannot insert multiple commands into a
-- prepared statement") — CLAUDE.md §Migrations. Este arquivo é exatamente a
-- combinação que o transaction pooler recusa: um corpo PL/pgSQL delimitado por
-- cifrão NOMEADO, adjacente a `ALTER FUNCTION` / `COMMENT` / `REVOKE` / `GRANT`.
--
--   1. **`apply_migration` carimba a PRÓPRIA `version`.** Reparar:
--
--        UPDATE supabase_migrations.schema_migrations
--           SET version = '20260823000004'
--         WHERE name LIKE '%p46_sweep_tracer%';
--
--   2. **O ledger de migrations guarda o SQL LITERALMENTE aplicado.** Conferir:
--
--        SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--         WHERE version = '20260823000004';
--        -- comparar com:
--        --   printf '%s' "$(cat supabase/migrations/20260823000004_*.sql)" | md5
--
--      ⚠ AQUI A PERDA DE COMENTÁRIO **NÃO É BENIGNA**: o `COMMENT ON FUNCTION`
--      desta migration é o único lugar DENTRO DO BANCO onde ficam registrados a
--      ORDEM do corpo e o desfecho de cada ramo — inclusive por que o cap ABORTA
--      em vez de recortar. Quem ler a função sem esse comentário vai achar que
--      falta um `LIMIT`.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIÊNCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260727000001_p41_recon_retry.sql:144-199` — o ESQUELETO da varredura:
--     `SECURITY DEFINER SET search_path = ''`, o `FOR r IN … LOOP` com cada
--     iteração isolada num `BEGIN … EXCEPTION … END` próprio (uma falha de um
--     titular NÃO aborta os demais nem levanta erro para o cron), e
--     `pg_catalog.now()` totalmente qualificado dentro de corpo que roda sob cron.
--
--   · `20260801000002:384-387` (o passo 4 de `salvar_janela_retencao`) — o `FOR
--     UPDATE` que serializa alterações concorrentes sobre a linha de config.
--
--   · ⚠ **NÃO foi copiada a leitura de Vault nem o `net.http_post`** de
--     `20260727000001:155-193`. O ramo `live` não existe neste plano; ele nasce
--     no 46-05/46-06 junto com a Edge Function `purgar-retencao`. Copiar a
--     estrutura de dispatch agora, mesmo desligada, criaria a única coisa que
--     este plano existe para não criar: um caminho destrutivo com um `IF` na
--     frente. O escopo negativo do topo pode afirmar "ela não despacha" porque
--     não há o que desligar.
--
--   · ⚠ **NÃO foi copiado o `RAISE WARNING` SOZINHO** do analog
--     (`20260727000001:194-196`). `WARNING` não marca o job como `failed`, não
--     chega ao `return_message` do cron e não sobrevive à rotação de log — uma
--     falha reportada só por `WARNING` é uma falha que ninguém vê. Aqui o
--     `WARNING` continua, mas ACOMPANHADO de uma linha de ledger com
--     `desfecho_postgres = 'falha'` (RESEARCH §Code Examples, divergência 1).
--
--   · ⚠ **NÃO foi copiado o `RETURN` silencioso** do graceful-skip de Vault
--     (`:159-161`). Quando o `segredo_ausente` passar a existir (46-05), ele
--     grava o veredito ANTES do `RETURN` (divergência 2). O vocabulário já está
--     no `CHECK` da migration `20260823000002`, esperando.
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DO PRECEDENTE, E POR QUÊ
-- -----------------------------------------------------------------------------
-- `varrer_retry_notificacoes()` seleciona com `LIMIT 20` — um cinto anti-rajada
-- que RECORTA o trabalho e deixa o resto para a próxima passada. Está certo lá:
-- uma notificação não enviada hoje é enviada em 15 minutos.
--
-- **`varrer_purga_retencao()` faz o OPOSTO, e a divergência é D-46-08**: se o
-- conjunto elegível excede `cap_titulares`, ela ABORTA A EXECUÇÃO INTEIRA — zero
-- linha tocada, zero item, zero dispatch — grava `veredito = 'cap_excedido'` e
-- retorna. **Ela NUNCA processa "até o cap".** A razão é dura e não é estilo: com
-- PITR desligado (D-45-10) e o Storage fora do backup do Supabase, um CV apagado
-- é irrecuperável por qualquer meio. Um predicado quebrado que processasse até o
-- cap apagaria 50 pessoas reais por dia, em silêncio, e cada dia de atraso na
-- detecção seria irreversível. Abortar torna a purga RECUSÁVEL POR DESENHO: ela
-- só roda quando o conjunto elegível cabe dentro do cerco. Como `net.http_post`
-- só dispara no COMMIT, retornar antes garante zero request por ESTRUTURA, e não
-- por esperança.
--
-- Segunda divergência: o analog não tem ledger. Aqui o cabeçalho é gravado em
-- TODA execução, inclusive com `modo = 'off'` e com `elegiveis = 0` — o heartbeat
-- do Pitfall 5. Sem ele, "o cron parou" e "não havia nada a purgar" produzem o
-- mesmo silêncio.
--
-- Terceira divergência: `statement_timeout` próprio de 300s. O global do papel
-- `postgres` é 2 min (medido em PROD 2026-08-22, `46-01-MEDICOES.md` §M7), e um
-- laço com uma subtransação por titular é caro de entrar e de sair (Pitfall 8).
-- Um sweep cortado pelo timeout global acusaria o lugar errado.
--
-- -----------------------------------------------------------------------------
-- (4) ORDEM DE ENTREGA + QUAL SMOKE É O CONTRATO
-- -----------------------------------------------------------------------------
-- ORDEM OBRIGATÓRIA das quatro migrations do plano 46-02:
--   1º  20260823000001  (config — CRIA `public.config_purga`, lida aqui)
--   2º  20260823000002  (ledger — CRIA as duas tabelas escritas aqui)
--   3º  20260823000003  (predicado — CRIA `titulares_alem_da_janela()`)
--   4º  20260823000004  (ESTA — varredura)
--
-- Aplicar esta antes de qualquer uma das três FALHA ALTO no `CREATE FUNCTION`, e
-- falhar no apply é a forma barata.
--
-- ⚠ NENHUM AGENDAMENTO É CRIADO AQUI. O job `purga-retencao-sweep` (`0 3 * * *`,
-- D-46-10) nasce no plano **46-06**, e aquele plano emenda
-- `supabase/tests/p42_invent05_cron_smoke.sql` no MESMO commit (D-46-23), porque
-- a asserção (a) daquele smoke fixa `cron.job` em exatamente 3 e a mensagem de
-- falha dela daria DIAGNÓSTICO FALSO para o 4º job legítimo.
--
-- A espec executável é `supabase/tests/p46_purga_smoke.sql`, asserções (c), (f),
-- (i) e a de idempotência. Ele é CONTRATO: se algo divergir, corrige-se ESTA
-- migration, nunca o smoke.
-- =============================================================================


CREATE FUNCTION public.varrer_purga_retencao()
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

      -- ⚠⚠ A LACUNA DELIBERADA VIVE AQUI, E EM MAIS LUGAR NENHUM.
      -- O plano 46-04 insere NESTE ponto, dentro DESTE `BEGIN … EXCEPTION`:
      --     PERFORM public.anonimizar_candidato(r.candidato_id, v_modo <> 'live');
      -- capturando `WHEN SQLSTATE 'P45DR'` — e NUNCA `WHEN OTHERS` — para
      -- distinguir "dry-run concluído" de erro real, e gravando o resumo em
      -- `relato_dry_run`. A chamada não existe hoje porque a metade (a) do guard
      -- daquela função recusa chamador sem sessão, e o 4º ramo que a autoriza é
      -- D-46-18 com o escopo duplo de D-46-24. O envelope existe DESDE JÁ para que
      -- aquele plano acrescente uma chamada, e não uma estrutura.

      -- Fechamento do item. Os três desfechos ficam em `nao_aplicavel` porque
      -- NADA foi tentado — dizer `ok` aqui seria a mentira mais cara possível
      -- neste arquivo. `concluido_em` é LOAD-BEARING: sem ele o titular ficaria
      -- com item aberto e a execução seguinte o excluiria para sempre.
      UPDATE public.purga_execucao_itens i
         SET desfecho_storage  = 'nao_aplicavel',
             desfecho_postgres = 'nao_aplicavel',
             desfecho_auth     = 'nao_aplicavel',
             concluido_em      = pg_catalog.now()
       WHERE i.id = v_item;

    EXCEPTION WHEN OTHERS THEN
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
  -- legível quando o 46-04 chegar.
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
  '⚠⚠ LACUNA DELIBERADA, NOMEADA E DATADA: este corpo NAO chama public.anonimizar_candidato, NAO le '
  'o Vault e NAO despacha requisicao HTTP alguma pelo pg_net. A metade (a) do guard daquele motor recusa qualquer chamador '
  'sem sessao, e um cron nao tem sessao (medido em PROD 2026-08-22: as tres claims nulas sob '
  'postgres). O 4o ramo autorizado e D-46-18, com o escopo DUPLO de D-46-24 (caminho de dry-run sob '
  'dry_run|live, caminho destrutivo SO sob live), e nasce no plano 46-04. O laco, a subtransacao, o '
  'carimbo de concluido_em e a coluna relato_dry_run ja estao aqui no formato final: e um vao de '
  'FUNCIONALIDADE, nunca de arquitetura. '
  'statement_timeout proprio de 300s (Pitfall 8) porque o global do papel postgres e 2 min. '
  'SECURITY DEFINER com search_path vazio; REVOKE nominal de PUBLIC, anon e authenticated; GRANT '
  'EXECUTE apenas a service_role.';
