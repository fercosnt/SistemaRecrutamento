-- =============================================================================
-- Phase 49 / Plano 49-20 — JORN-36 · D-48 · D-62
-- `anonimizar_candidato(uuid,boolean)` ganha o passo que APAGA as respostas, os
-- textos, as transcricoes e as citacoes do titular — o que o recibo sempre disse
-- que apagava — e `plano_exclusao_titular(uuid)` passa a contar o mesmo pela
-- MESMA expressao. `trg_redacao_rh_only_review_fields()` ganha a sancao por GUC
-- que torna o passo independente do PAPEL de quem executa.
-- =============================================================================
--
-- ⚠⚠ ESCOPO NEGATIVO, EM UMA LINHA: **esta migration edita TRES FUNCOES VIVAS, uma
-- delas DESTRUTIVA, e nao faz absolutamente mais nada** — zero DDL de tabela, zero
-- policy, zero agendamento, zero linha de dado de pessoa gravada ou apagada durante
-- o apply, e nenhum bloco que EXECUTE o caminho feliz (proibicao do 46-04). O diff
-- util cabe em uma tela, e e isso que permite ao revisor saber onde olhar.
--
-- ⚠⚠ E AQUI HA `DELETE` DE PROPOSITO, E ELE E A EXCECAO NOMEADA. O motor nunca
-- apagou linha propria em nenhuma das suas cinco fatias anteriores — a devolutiva
-- morre por FK CASCADE (`auth_delete_user`), nao por statement. O **D-62** e a
-- excecao EXPLICITA do operador, decidida no portao desta fase, valida SO no passo
-- novo e SO em quatro tabelas: `respostas_raven`, `respostas_bigfive`,
-- `respostas_disc` e `respostas_formulario`. O pos-portao abaixo EXTRAI do corpo
-- instalado a lista de tabelas que o motor apaga e reprova qualquer uma fora
-- dessas quatro. `scores_raven` e `scores_candidato` FICAM: os scores sao a prova
-- de que houve avaliacao, e o ERASE-08 os preserva.
--
-- ⚠ REVERSIBILIDADE: o CODIGO e reaplicavel (`CREATE OR REPLACE`); a EXECUCAO nao.
-- Com o D-62, a execucao passa a ser irreversivel tambem no sentido mais forte —
-- as linhas das quatro tabelas deixam de existir, e nao ha PITR (D-45-10) nem
-- backup de Storage. Por isso a PRIMEIRA execucao real do motor com este passo e
-- checkpoint do plano 49-19, em conta de teste (D-54), e a prova AQUI e do smoke
-- `supabase/tests/p45_motor_exclusao_smoke.sql`, dentro de subtransacao que
-- reverte.
--
-- ⚠ CONFERIDO ANTES DO APPLY, so leitura: a purga automatica esta em ENSAIO
-- (`config_purga.modo = 'dry_run'`, medido 2026-09-23). O cron
-- `purga-retencao-sweep` dispara toda noite e CHAMA este motor; com a purga em
-- `live`, o passo NOVO alcancaria titular real antes do checkpoint do 49-19 — e
-- agora ele APAGA LINHA. O pre-portao abaixo aborta o apply nesse caso.
--
-- -----------------------------------------------------------------------------
-- (1) O QUE ESTAVA ERRADO (medido em PROD em 2026-09-23, so leitura)
-- -----------------------------------------------------------------------------
-- O item `respostas_e_producoes` do recibo
-- (`docs/compliance/sql/gen-recibo-exclusao.cjs:293-317`) promete, no passado:
-- «as suas respostas das avaliacoes, os textos que voce escreveu, as transcricoes
-- das entrevistas e a sua devolutiva foram apagados». Ele lista 14 origens.
-- Medido no corpo vivo de `anonimizar_candidato` (md5 6ab2890e…): `respostas_raven`
-- e `cited_evidence` **ausentes** — o motor nao tocava NENHUMA delas. A unica
-- exclusao concluida (22/08) foi de um titular sem esses dados: o recibo ainda nao
-- mentiu, e mentiria na proxima.
--
-- Estado vivo das origens, medido tabela a tabela (linhas hoje):
--   respostas_formulario 115 · respostas_raven 60 · respostas_avaliacao 10 ·
--   scores_candidato 15 (5 `sjt`, 1 com `cited_evidence`) · entrevista_analises 6
--   (6 com `citacoes`) · entrevistas_online 4 · redacoes_candidato 2 (2 com
--   `analise_ia`, 4 de 4 elementos com `cited_evidence` em cada) ·
--   entrevistas_presenciais 1 · respostas_bigfive / respostas_disc /
--   respostas_cultura / cognitivo_respostas / redacoes_candidato_em_progresso 0.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIENCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NAO
-- -----------------------------------------------------------------------------
--   · OS TRES CORPOS vem dos ARQUIVOS, **nunca do catalogo**, e a copia foi
--     conferida por md5 ANTES de qualquer edicao, contra o `md5(prosrc)` vivo:
--       anonimizar_candidato              = 6ab2890ebfc87fbd489215579bf1d9f8 (56 226 octetos)
--         de `supabase/migrations/20260922000012_p49_motor_logs_e_revisao.sql`
--       plano_exclusao_titular            = 12bfca3bf936704f1bc581acd5061df3 (29 603 octetos)
--         do MESMO arquivo
--       trg_redacao_rh_only_review_fields = 84d5552315a513cbea378ff94de20fb6 (1 483 octetos)
--         de `supabase/migrations/20260623100003_redacoes_candidato.sql`
--     Os dois primeiros sao byte a byte os pins vivos de
--     `supabase/tests/p45_motor_exclusao_smoke.sql` (C3/i), e sao o PRE-PORTAO
--     registrado pelo pos-portao do plano 49-14. Copiar do catalogo pinaria o que
--     esta aplicado, seja la o que for; copiar do arquivo e conferir contra o vivo
--     e a conferencia CRUZADA que aquele smoke exige.
--
--   · AS EDICOES FORAM APLICADAS POR SUBSTITUICAO DE ANCORA UNICA — uma ancora que
--     aparecesse 0 ou 2 vezes abortava a montagem, em vez de casar no lugar errado
--     em silencio. Transcrever e o que fez duas das cinco migrations do M8 chegarem
--     a PROD com os comentarios descartados.
--
--   · A FORMA do passo novo vem do proprio bloco `severar_fks_set_null`: um
--     statement EXPLICITO por tabela, um `GET DIAGNOSTICS` por statement, escopo
--     por subconsulta correlacionada as candidaturas DO TITULAR — jamais negacao
--     por pertencimento a conjunto de valores.
--
--   · ⚠ **NAO foi copiado nenhum bloco que EXECUTE o caminho feliz.** Reexecuta-lo
--     aqui seria rodar um caminho destrutivo — agora com `DELETE` — durante o apply
--     de uma migration cujo escopo negativo acabou de prometer que ela nao toca em
--     dado de pessoa. A prova e do smoke.
--
--   · ⚠ **NAO foi tocado o guard** — nem as quatro metades do ramo da purga, nem a
--     normalizacao `v_dry_run := coalesce(p_dry_run, true)` (BL-01), nem o
--     terminador do dry-run, nem os tres passos que o 49-14 escreveu (a resposta do
--     revisor nos dois lados, a redacao dos comparativos, o input da IA). A rede
--     estrutural do (C3) do smoke vigia todos eles, e o pos-portao abaixo tambem.
--
--   · ⚠ **NAO foi tocada a lista de quinze colunas de
--     `trg_redacao_rh_only_review_fields`.** O trigger continua recusando toda
--     mudanca de `texto`/`analise_ia`/… feita por RH ou administrador. O que ele
--     ganhou foi o reconhecimento de UMA janela (`app.motor_exclusao`), aberta e
--     ZERADA pelo motor em volta de um unico statement.
--
-- -----------------------------------------------------------------------------
-- (3) POR QUE APAGAR A LINHA NAS QUATRO, E NAO EM NENHUMA OUTRA
-- -----------------------------------------------------------------------------
-- Medido no catalogo vivo, e e o catalogo que decide:
--   · `respostas_raven.resposta`   `integer NOT NULL` CHECK (>= 1 AND <= 8)
--   · `respostas_bigfive.resposta` `integer NOT NULL` CHECK (>= 1 AND <= 5)
--   · `respostas_disc.mais_caracteristico`/`menos_caracteristico` `text NOT NULL`
--     CHECK (= ANY ('D','I','S','C')) e CHECK (os dois DIFERENTES entre si)
--   · `respostas_formulario` tem `resposta_preenchida_check`: ao menos uma das tres
--     colunas de resposta nao nula. Anular a de texto numa linha cujas outras duas
--     ja sao nulas aborta com 23514 — e as linhas de formulario aberto sao essas.
-- Nao existe valor de sentinela que estes esquemas aceitem. As alternativas eram
-- afrouxar `NOT NULL`/CHECK das quatro tabelas para sempre, ou o recibo ressalvar
-- que as alternativas marcadas ficam. O operador escolheu apagar a linha (D-62).
-- Em TODAS as outras origens a linha FICA: texto e jsonb `NOT NULL` recebem
-- sentinela, colunas nulaveis recebem NULL.
--
-- -----------------------------------------------------------------------------
-- (4) O QUE O RECIBO AINDA DIZ, E POR QUE ISSO NAO E CONSERTADO AQUI
-- -----------------------------------------------------------------------------
-- O recibo e o inventario de compliance ainda nao apontam este passo (o item
-- `respostas_e_producoes` declara `passo_motor: 'tombstone_candidato'`), e ainda
-- descrevem `ai_call_logs.user_prompt_template` como conteudo PRESERVADO.
-- Alinha-los e o plano **49-21**, e ele vem ANTES de qualquer execucao real
-- (49-19). Entre este plano e aquele, o recibo diz MENOS do que o motor apaga —
-- nunca mais, que seria a promessa vazia. A direcao do desalinhamento e a que
-- importa, e ela esta do lado seguro.
--
-- -----------------------------------------------------------------------------
-- (5) ERRO / AUTHZ / IDEMPOTENCIA / TRANSPORTE
-- -----------------------------------------------------------------------------
-- ERRO: o pre-portao aborta com `P49-20 PRE-PORTAO` (SQLSTATE padrao P0001) se
--   qualquer um dos TRES md5 vivos divergir do medido, se a purga estiver fora de
--   `dry_run`, ou se QUALQUER das 20 colunas do passo tiver mudado de tipo ou de
--   nulidade no catalogo. O terminador do dry-run do motor segue em `P45DR`.
-- AUTHZ: nenhum grant muda. O ACL das duas funcoes do titular e reemitido identico
--   ao vivo (`CREATE OR REPLACE` nao repoe grants, mas o `pg_default_acl` deste
--   schema concede EXECUTE a `anon` como grant DIRETO em todo `CREATE FUNCTION`, e
--   por isso o `REVOKE` NOMEIA `anon`; e `authenticated` e reconcedido porque o
--   titular chega por ele). `trg_redacao_rh_only_review_fields` e funcao de trigger
--   e nao tem ACL util — e nao ha `CREATE TRIGGER` aqui: o trigger existente
--   continua apontando para ela.
-- IDEMPOTENCIA: o pre-portao aceita SO os md5 de ANTES. Reaplicar sobre o corpo
--   novo falha de proposito, com mensagem. O passo novo e idempotente por estado:
--   os quatro `DELETE` nao acham mais linha, as sentinelas nao contem texto do
--   titular, e as condicoes `IS NOT NULL`/`cited_evidence` deixam de casar.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Migrations): corpo PL/pgSQL `$$`
-- com `DO`/`REVOKE`/`GRANT` adjacentes e a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260922000013_p49_motor_respostas_e_producoes.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO byte a byte, migration + linha do ledger
-- na MESMA requisicao e portanto na mesma transacao; a `version` nasce correta e
-- nao ha reparo a fazer).
--
-- O CONTRATO EXECUTAVEL e `supabase/tests/p45_motor_exclusao_smoke.sql`: se algo
-- divergir, corrige-se ESTA migration, nunca o smoke.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- PRE-PORTAO — os tres corpos vivos sao os medidos, a purga esta em ensaio, E o
-- catalogo das 20 colunas do passo e o que o passo assume.
-- ---------------------------------------------------------------------------
DO $pre_p49_20$
DECLARE
  v_md5_anon  text;
  v_len_anon  int;
  v_md5_plano text;
  v_len_plano int;
  v_md5_trg   text;
  v_len_trg   int;
  v_modo      text;
  v_esp_anon  constant text := '6ab2890ebfc87fbd489215579bf1d9f8';
  v_esp_plano constant text := '12bfca3bf936704f1bc581acd5061df3';
  v_esp_trg   constant text := '84d5552315a513cbea378ff94de20fb6';
  r           record;
  v_divs      text := '';
BEGIN
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_anon, v_len_anon
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.anonimizar_candidato(uuid,boolean)'::regprocedure;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_plano, v_len_plano
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.plano_exclusao_titular(uuid)'::regprocedure;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_trg, v_len_trg
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.trg_redacao_rh_only_review_fields()'::regprocedure;

  IF v_md5_anon IS DISTINCT FROM v_esp_anon THEN
    RAISE EXCEPTION 'P49-20 PRE-PORTAO: o corpo VIVO de anonimizar_candidato tem md5 % (length %), e o medido em 2026-09-23 e % (length 54807, o pos-portao do plano 49-14). O CREATE OR REPLACE abaixo APAGARIA a divergencia em silencio, numa FUNCAO DESTRUTIVA que a partir deste apply APAGA LINHA. Apply abortado: reler pg_get_functiondef, refazer a extracao do arquivo 20260922000012 e so entao reaplicar. ⚠ Se o md5 vivo for o do corpo NOVO, esta migration JA foi aplicada — o pre-portao aceita so o de ANTES, de proposito.', v_md5_anon, v_len_anon, v_esp_anon;
  END IF;

  IF v_md5_plano IS DISTINCT FROM v_esp_plano THEN
    RAISE EXCEPTION 'P49-20 PRE-PORTAO: o corpo VIVO de plano_exclusao_titular tem md5 % (length %), e o medido e % (length 28413). O dry-run e o delete real TEM de sair da mesma expressao: reescrever um sem o outro devolve o P39/CR-02 (uma guarda que era dead code), e agora com uma diferenca nova — o dry-run e o unico lugar onde o numero de linhas que VAO ser apagadas pode ser lido antes. Apply abortado.', v_md5_plano, v_len_plano, v_esp_plano;
  END IF;

  IF v_md5_trg IS DISTINCT FROM v_esp_trg THEN
    RAISE EXCEPTION 'P49-20 PRE-PORTAO: o corpo VIVO de trg_redacao_rh_only_review_fields tem md5 % (length %), e o medido e % (length 1483). Este trigger e BEFORE UPDATE em redacoes_candidato e LEVANTA EXCECAO quando rh/administrador mexe em texto/analise_ia: reescreve-lo a partir de uma copia que nao e a viva apagaria em silencio uma regra que protege o texto do candidato da propria equipe. Apply abortado.', v_md5_trg, v_len_trg, v_esp_trg;
  END IF;

  -- ⚠⚠ A PURGA TEM DE ESTAR EM ENSAIO, e neste plano a pergunta pesa mais do que
  --    pesava no 49-14: o cron `purga-retencao-sweep` dispara toda noite e CHAMA
  --    este motor, e o passo que esta sendo instalado APAGA LINHA (D-62). Com
  --    `modo = 'live'`, ele alcancaria titular real antes do checkpoint do 49-19 —
  --    que e onde a primeira execucao real foi deliberadamente colocada (D-54).
  SELECT c.modo INTO v_modo FROM public.config_purga c LIMIT 1;
  IF coalesce(v_modo, '<ausente>') IS DISTINCT FROM 'dry_run' THEN
    RAISE EXCEPTION 'P49-20 PRE-PORTAO: config_purga.modo = % e o exigido para este apply e dry_run. O cron da purga chama anonimizar_candidato; com a purga fora de ensaio, o passo NOVO — que APAGA as linhas de respostas_raven/bigfive/disc/formulario — alcancaria titular real antes do checkpoint do 49-19 (D-54), e nao ha PITR nem backup de Storage. Decisao do operador, nao conserto de agente: desligar a purga (salvar_config_purga) ou antecipar o checkpoint.', coalesce(v_modo, '<ausente>');
  END IF;

  -- ── O CATALOGO DAS 20 COLUNAS, CONFERIDO COLUNA A COLUNA (Pitfall 6) ───────
  -- ⚠⚠ A ESCOLHA ENTRE SENTINELA, NULL E APAGAR A LINHA FOI FEITA LENDO ESTE
  --    CATALOGO. Se alguem afrouxar ou endurecer a nulidade de qualquer coluna
  --    abaixo, ou trocar o tipo dela, o passo instalado passa a estar errado — e o
  --    erro NAO aparece no apply: aparece com 23514/23502 no PRIMEIRO PEDIDO REAL,
  --    **depois** de o curriculo ja ter sido apagado do Storage, sem caminho de
  --    volta. Este bloco troca esse 23514 tardio por um apply reprovado. E o
  --    esperado esta escrito aqui como DADO, e nao como prosa, para que a
  --    divergencia seja NOMEADA em vez de descoberta.
  FOR r IN
    SELECT *
      FROM (VALUES
        ('redacoes_candidato',              'texto',                   'text',  false),
        ('redacoes_candidato',              'analise_ia',              'jsonb', true),
        ('redacoes_candidato_em_progresso', 'texto_em_progresso',      'text',  true),
        ('respostas_cultura',               'resposta_texto',          'text',  false),
        ('respostas_avaliacao',             'respostas',               'jsonb', false),
        ('cognitivo_respostas',             'raw_responses',           'jsonb', false),
        ('cognitivo_respostas',             'proctoring',              'jsonb', false),
        ('entrevistas_online',              'transcricao',             'text',  true),
        ('entrevistas_online',              'feedback_candidato',      'text',  true),
        ('entrevistas_online',              'resumo_ia',               'text',  true),
        ('entrevistas_online',              'link_videochamada',       'text',  false),
        ('entrevistas_presenciais',         'documentos_apresentados', 'jsonb', true),
        ('entrevista_analises',             'citacoes',                'jsonb', true),
        ('scores_candidato',                'citacoes',                'jsonb', true),
        ('scores_candidato',                'metadata',                'jsonb', false),
        -- as quatro do D-62: o que o passo assume delas e que a coluna de resposta
        -- continua sendo a que NAO aceita sentinela. Se um dia aceitar, a decisao
        -- de apagar a linha deixa de ser a unica saida e tem de ser RE-DECIDIDA.
        ('respostas_raven',                 'resposta',                'integer', false),
        ('respostas_bigfive',               'resposta',                'integer', false),
        ('respostas_disc',                  'mais_caracteristico',     'text',    false),
        ('respostas_disc',                  'menos_caracteristico',    'text',    false),
        ('respostas_formulario',            'resposta_texto',          'text',    true)
      ) AS esp(tabela, coluna, tipo, nulavel)
  LOOP
    PERFORM 1
       FROM pg_catalog.pg_attribute a
       JOIN pg_catalog.pg_class     c ON c.oid = a.attrelid
       JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = r.tabela
        AND a.attname = r.coluna
        AND NOT a.attisdropped
        AND a.attnum > 0
        AND format_type(a.atttypid, NULL) = r.tipo
        AND a.attnotnull = (NOT r.nulavel);
    IF NOT FOUND THEN
      v_divs := v_divs || format('%s.%s (esperado %s, %s) · ', r.tabela, r.coluna, r.tipo,
                                 CASE WHEN r.nulavel THEN 'NULAVEL' ELSE 'NOT NULL' END);
    END IF;
  END LOOP;

  IF v_divs <> '' THEN
    RAISE EXCEPTION 'P49-20 PRE-PORTAO: o catalogo VIVO divergiu do que o passo apagar_respostas_e_producoes assume, em: %. A acao por coluna (sentinela / NULL / apagar a linha) foi decidida lendo o catalogo; com a divergencia, o passo instalado abortaria com 23502/23514 no PRIMEIRO PEDIDO REAL, DEPOIS de o curriculo ja ter sido apagado do Storage e sem caminho de volta (Pitfall 6). Apply abortado: reler o catalogo, re-decidir a acao daquela coluna e so entao reaplicar. ⚠ Se uma das quatro tabelas do D-62 passou a aceitar sentinela, apagar a linha deixou de ser a unica saida e a decisao do operador tem de ser RE-FEITA, nao herdada.', v_divs;
  END IF;

  RAISE NOTICE 'P49-20 PRE-PORTAO ok: anonimizar_candidato=% (%), plano_exclusao_titular=% (%), trg_redacao_rh_only_review_fields=% (%), config_purga.modo=%, 20 colunas conferidas no catalogo',
    v_md5_anon, v_len_anon, v_md5_plano, v_len_plano, v_md5_trg, v_len_trg, v_modo;
END
$pre_p49_20$;


-- ---------------------------------------------------------------------------
-- 1 · `public.trg_redacao_rh_only_review_fields()` — corpo INTEIRO do arquivo
--     20260623100003, com UMA mudanca e nada mais: a janela `app.motor_exclusao`
--     reconhecida no topo, ANTES da leitura do papel.
--     ⚠ A lista de quinze colunas NAO foi tocada. O trigger continua recusando
--     toda mudanca de `texto`/`analise_ia`/… feita por `rh` ou `administrador`
--     fora da janela — e o smoke assere as DUAS metades, porque "a sancao
--     funciona" e "o portao foi esvaziado" produzem o mesmo verde na primeira.
--     ⚠ NAO HA `CREATE TRIGGER` aqui: `redacao_rh_only_review_fields` (BEFORE
--     UPDATE em `redacoes_candidato`) continua apontando para esta funcao, e
--     recria-lo seria uma janela — por curta que fosse — sem o portao.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_redacao_rh_only_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $trg_redacao_rh_only_review_fields$
BEGIN
  -- ══ 49-20 · SANCAO DO MOTOR DE EXCLUSAO (JORN-36 / D-48, RESEARCH Correcao 18) ══
  -- ⚠⚠ POR QUE ISTO EXISTE. Este trigger recusa toda mudanca de `texto`,
  --    `analise_ia` e outras treze colunas quando a claim de papel e `rh` ou
  --    `administrador` — e essa e a regra CERTA para a tela do RH, que so pode
  --    escrever campos de revisao. Mas `anonimizar_candidato` tem de raspar `texto`
  --    e `analise_ia` a pedido do titular, e a Edge Function do direito do titular
  --    chama o motor COM O JWT DE QUEM PEDIU. Um pedido executado por
  --    administrador abortaria aqui, com 42501/P0001, **DEPOIS** de o curriculo da
  --    pessoa ja ter sido apagado do Storage — que e irreversivel, sem PITR e sem
  --    backup de Storage. Pitfall 6 desta fase, e o modo de falha mais caro dela.
  -- ⚠ SANCAO, E NAO AFROUXAMENTO. Nada aqui deixou de valer para o RH: a lista de
  --   quinze colunas abaixo esta intacta e continua levantando excecao. O que o
  --   trigger passou a reconhecer e UMA janela, que o proprio motor abre
  --   imediatamente antes do seu unico UPDATE em `redacoes_candidato` e ZERA na
  --   linha seguinte (`set_config(..., true)` = SET LOCAL, e ainda assim zerada
  --   explicitamente). Um portao que fosse desligado e nao sancionado deixaria o
  --   RH escrevendo `texto` para sempre, e o smoke assere as DUAS metades: que o
  --   motor passa, e que o MESMO UPDATE sem a janela continua sendo recusado.
  -- ⚠ NENHUM CLIENTE SETA `app.*` (mesmo pressuposto de `app.rejeicao_sancionada`,
  --   `20260921000012:223`): o PostgREST nao repassa GUC do prefixo `app.` vinda da
  --   requisicao, e `set_config` nao e alcancavel por RPC. A janela e escrita por
  --   codigo do servidor, dentro de uma funcao SECURITY DEFINER, em volta de um
  --   unico statement.
  -- ⚠ `missing_ok = true` e `coalesce` porque a GUC nao existe em sessao nenhuma
  --   fora do passo: sem os dois, `current_setting` levantaria 42704 em TODO UPDATE
  --   de redacao do sistema — o portao mataria o caminho normal em vez de guarda-lo.
  IF coalesce(current_setting('app.motor_exclusao', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador') THEN
    IF NEW.texto                 IS DISTINCT FROM OLD.texto                 OR
       NEW.candidatura_id        IS DISTINCT FROM OLD.candidatura_id        OR
       NEW.pergunta_id           IS DISTINCT FROM OLD.pergunta_id           OR
       NEW.word_count            IS DISTINCT FROM OLD.word_count            OR
       NEW.texto_hash            IS DISTINCT FROM OLD.texto_hash            OR
       NEW.tempo_gasto_segundos  IS DISTINCT FROM OLD.tempo_gasto_segundos  OR
       NEW.submetida_em          IS DISTINCT FROM OLD.submetida_em          OR
       NEW.analise_ia            IS DISTINCT FROM OLD.analise_ia            OR
       NEW.scores_dimensao       IS DISTINCT FROM OLD.scores_dimensao       OR
       NEW.score_ponderado_0_100 IS DISTINCT FROM OLD.score_ponderado_0_100 OR
       NEW.classificacao_cor     IS DISTINCT FROM OLD.classificacao_cor     OR
       NEW.red_flag_etico        IS DISTINCT FROM OLD.red_flag_etico        OR
       NEW.prompt_version        IS DISTINCT FROM OLD.prompt_version        OR
       NEW.model_version         IS DISTINCT FROM OLD.model_version         OR
       NEW.input_hash            IS DISTINCT FROM OLD.input_hash            THEN
      RAISE EXCEPTION 'RH/admin so pode atualizar campos de revisao (scores_humanos, notas_revisor, decisao_revisor, revisada_*, status_analise, bloqueio_avanco).';
    END IF;
  END IF;
  RETURN NEW;
END;
$trg_redacao_rh_only_review_fields$;


-- ---------------------------------------------------------------------------
-- 2 · `public.anonimizar_candidato(uuid, boolean)` — corpo INTEIRO do arquivo
--     20260922000012, com QUATRO mudancas e nada mais:
--       (a) o passo NOVO `apagar_respostas_e_producoes`, treze statements, ANTES
--           de `severar_fks_set_null`;
--       (b) as treze contagens no DECLARE, e o texto que o terminador do dry-run
--           carrega;
--       (c) a chave nova em `'passos'`, com as quatro contagens de LINHAS
--           APAGADAS (D-62) nomeadas e separadas;
--       (d) o terminador do dry-run passa a dizer quanto o passo apagaria.
--     Nada mais foi tocado: nem o guard, nem a normalizacao da intencao, nem os
--     tres passos do 49-14, nem as sentinelas antigas, nem o objeto de retorno
--     fora da chave nova.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anonimizar_candidato(
  p_candidato_id uuid,
  p_dry_run      boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $anonimizar_candidato$
DECLARE
  -- ⚠⚠ A INTENÇÃO, NORMALIZADA UMA ÚNICA VEZ E ANTES DE QUALQUER OUTRA COISA (BL-01 do
  --     `45-REVIEW-2.md`). `p_dry_run` é um `boolean` de TRÊS valores, e o `DEFAULT true`
  --     NÃO protege contra o terceiro: `NULL` é um argumento EXPLÍCITO perfeitamente
  --     construível — o PostgREST converte um `null` JSON no argumento nomeado, e no SQL
  --     Editor basta `anonimizar_candidato('<id>'::uuid, NULL)`.
  --
  --     Com o parâmetro cru, os TRÊS `IF` do corpo avaliavam NULL e NENHUM era tomado:
  --       · `IF p_dry_run`        → caía no ELSE, o ramo DESTRUTIVO da metade (b);
  --       · `IF NOT p_dry_run`    → a metade (c), o GUARD DE INTENÇÃO, NÃO RODAVA;
  --       · `IF p_dry_run` (fim)  → o `P45DR` não era levantado, e a transação COMMITAVA.
  --     Uma chamada destruía a PII do titular sem pedido nenhum, fora da janela do
  --     ERASE-06, sem recibo e sem trilha — e pior que antes do 45-13, porque sem linha em
  --     `solicitacoes_dados` o reencontro do CR-03 não acha nada e o currículo fica órfão
  --     no bucket para sempre. É o MESMO defeito NULL-aberto que este arquivo proíbe em
  --     três comentários sobre `NOT IN` (`IS DISTINCT FROM` em toda comparação de papel),
  --     reaparecido como lógica de três valores no PARÂMETRO em vez de na coluna.
  --
  --     ⚠ POR QUE `NULL` RESOLVE PARA O LADO SEGURO, e não para uma recusa: destruir PII
  --     sobre uma intenção NÃO DECLARADA é exatamente o desfecho que o portão inteiro
  --     desta fase existe para impedir. `true` é o modo que não persiste nada — o mesmo
  --     que o `DEFAULT` já promete — e o chamador que quisesse apagar recebe o `P45DR`,
  --     que é ALTO e distinguível, com a instrução de dizer `false` EXPLICITAMENTE.
  --
  --     ⚠ UM LUGAR SÓ, E É ESTE. Três `coalesce` espalhados pelos três sítios é como um
  --     quarto sítio nasce sem ele. A partir daqui o corpo NÃO consulta `p_dry_run` em
  --     lugar nenhum: as quatro leituras são de `v_dry_run`, e uma leitura nova do
  --     parâmetro cru é a regressão a procurar em qualquer diff futuro deste arquivo.
  v_dry_run    boolean := coalesce(p_dry_run, true);
  v_uid        uuid := auth.uid();
  v_role       text := (select auth.jwt() #>> '{app_metadata,role}');
  -- O dono de `p_candidato_id`, lido ANTES do guard: a metade (b) precisa dele.
  v_dono       uuid;
  v_plano      jsonb;
  v_user_id    uuid;
  v_email      text;
  v_nasc       date;
  v_achou      boolean := false;
  v_sent_email text;
  v_aidec_fixa boolean;
  -- 45-13: a trilha de executor. `v_eh_titular` é resolvido junto com `v_dono`,
  -- ANTES de qualquer mutação, porque depois dela o dono já não existe.
  v_eh_titular boolean := false;

  v_n_cand     integer := 0;
  v_n_df       integer := 0;
  v_n_dfh      integer := 0;
  v_n_hist     integer := 0;
  v_n_aicall   integer := 0;
  v_n_aidec    integer := 0;
  v_n_logs     integer := 0;
  v_n_alerts   integer := 0;
  v_n_aut      integer := 0;
  v_n_notif    integer := 0;
  -- 45-13 · CR-04 (o ponteiro reverso em `candidaturas`) e CR-05 (o bloqueador medido).
  v_n_cvurl    integer := 0;
  v_n_pref     integer := 0;

  -- ══ 49-14 · AS TRES CONTAGENS NOVAS (D-60, D-61, D-63) ════════════════════
  -- ⚠⚠ ELAS NAO SAEM DE `GET DIAGNOSTICS` DO UPDATE QUE AS ESCREVE, e a razao e
  --    estrutural: `ROW_COUNT` conta TODA linha atualizada, e as duas colunas de
  --    revisao sao NULAVEIS — a maioria das linhas do titular nao tem resposta de
  --    revisor nenhuma. Um `ROW_COUNT` aqui diria "raspei N respostas de revisor"
  --    quando raspou ZERO, e o recibo passaria a prometer um apagamento que nao
  --    aconteceu. As duas sao MEDIDAS pela MESMA expressao que
  --    `plano_exclusao_titular` usa no dry-run (a regra (ii) do C3 do smoke:
  --    dry-run e delete real saem da mesma expressao), imediatamente ANTES do
  --    UPDATE correspondente.
  v_n_df_rev     integer := 0;   -- decisao_final.revisao_resultado NAO NULOS, raspados
  v_n_dfh_rev    integer := 0;   -- decisao_final_historico.revisao_resultado, idem
  -- ⚠ D-63: linhas `comparative_ranking` que CITAM uma candidatura do titular. Elas
  --   tem `candidato_id` NULL POR DESENHO (a chamada e sobre varias pessoas), entao
  --   o passo (1/5) — que acha a linha por `candidato_id` — NUNCA as alcancou, e o
  --   input literal do titular ficava inteiro dentro delas.
  v_n_aicall_cmp integer := 0;

  -- ══ 49-20 · AS TREZE CONTAGENS DO PASSO NOVO (D-48, D-62) ═════════════════
  -- ⚠⚠ POR QUE AQUI **SAI** DE `GET DIAGNOSTICS`, AO CONTRARIO DAS TRES DO 49-14.
  --    A licao do 49-14 e que `ROW_COUNT` conta linhas VISITADAS, e numa coluna
  --    NULAVEL isso diria "raspei N" quando raspou zero. A saida nao e abandonar
  --    `ROW_COUNT`: e fazer com que VISITADA e RASPADA sejam a mesma linha. Duas
  --    formas, e cada statement abaixo usa uma delas de proposito:
  --      · a tabela tem ao menos UMA coluna `NOT NULL` que SEMPRE recebe sentinela
  --        (`redacoes_candidato.texto`, `respostas_cultura.resposta_texto`,
  --        `respostas_avaliacao.respostas`, `cognitivo_respostas.raw_responses`,
  --        `entrevistas_online.link_videochamada`) ⇒ toda linha visitada foi
  --        raspada, e `ROW_COUNT` e a contagem honesta;
  --      · a tabela SO tem colunas nulaveis a tratar ⇒ o predicado carrega a
  --        condicao `<coluna> IS NOT NULL`, e a linha sem nada a raspar nao e nem
  --        visitada. `ROW_COUNT` volta a ser honesto POR CONSTRUCAO, e a MESMA
  --        condicao aparece na contagem do dry-run (regra (ii) do C3 do smoke).
  --    Nos quatro `DELETE` a questao nao se poe: `ROW_COUNT` de um apagamento e o
  --    numero de linhas que deixaram de existir, que e exatamente o que o recibo
  --    precisa dizer. Um passo destrutivo que nao diz quanto destruiu nao e
  --    auditavel — e este e o primeiro passo deste motor que APAGA LINHA.
  v_n_rp_raven   integer := 0;   -- D-62 · linhas APAGADAS
  v_n_rp_bigfive integer := 0;   -- D-62 · idem
  v_n_rp_disc    integer := 0;   -- D-62 · idem
  v_n_rp_form    integer := 0;   -- D-62 · idem
  v_n_rp_red     integer := 0;   -- redacoes_candidato (texto + analise_ia)
  v_n_rp_redp    integer := 0;   -- redacoes_candidato_em_progresso (nulavel)
  v_n_rp_cult    integer := 0;   -- respostas_cultura
  v_n_rp_aval    integer := 0;   -- respostas_avaliacao
  v_n_rp_cog     integer := 0;   -- cognitivo_respostas
  v_n_rp_eon     integer := 0;   -- entrevistas_online
  v_n_rp_epr     integer := 0;   -- entrevistas_presenciais (nulavel)
  v_n_rp_ean     integer := 0;   -- entrevista_analises.citacoes (nulavel)
  v_n_rp_sc      integer := 0;   -- scores_candidato (citacoes + metadata SJT)
  -- ⚠ O terminador do dry-run recebe as treze POR TABELA, embrulhadas num texto e
  --   nunca somadas. Uma soma passaria por "13 numeros" e esconderia um ZERO em
  --   qualquer das tabelas — e "zero redacoes" e um fato diferente de "zero
  --   respostas de Raven". O mesmo argumento que o 49-14 escreveu para nao somar
  --   `ai_call_logs` com `ai_call_logs_comparativo`.
  v_rp_txt       text := '<passo nao executado>';

  -- ⚠⚠ 46-04 · AS DUAS METADES DO QUARTO RAMO (D-46-18 / D-46-24 / Blocker B-01).
  --     Elas nascem FALSAS e sao calculadas no topo do corpo, antes do guard. O
  --     valor default `false` e load-bearing: qualquer caminho que deixasse de
  --     calcula-las recusa, em vez de autorizar.
  --     ⚠ SAO DUAS VARIAVEIS, E NUNCA UMA. Um unico booleano servindo aos dois
  --     caminhos e como, numa edicao futura, o caminho destrutivo herda EM
  --     SILENCIO a permissao do caminho reversivel — bastaria alguem acrescentar
  --     um modo a uma lista. A obrigacao de aceite de D-46-24 e exatamente esta.
  v_purga_dry  boolean := false;   -- caminho de DRY-RUN, reversivel por construcao
  v_purga_live boolean := false;   -- caminho DESTRUTIVO, so sob cerco em live
  -- A metade que vale para ESTA chamada, escolhida por `v_dry_run` e jamais pelo
  -- parametro cru. Usada apenas na metade (a) do guard, que e anterior a
  -- bifurcacao por intencao; as metades (b) e (c) consultam a variavel especifica.
  v_ramo_purga boolean := false;
BEGIN
  -- ══ 46-04 · (p) O QUARTO RAMO, CALCULADO ANTES DO GUARD ═══════════════════
  -- ⚠ POR QUE ESTE RAMO EXISTE. Medido em PROD em 2026-08-22, como `postgres` e
  --   sem claims: `auth.uid()` NULO, `auth.jwt() #>> '{app_metadata,role}'` NULO e
  --   `request.jwt.claims` NULO. Um cron nao tem sessao, nao tem papel e nao tem
  --   pedido em `solicitacoes_dados` — as TRES metades do guard recusam com 42501,
  --   e sem um caminho autorizado a purga nao consegue nem fazer o DRY-RUN. A
  --   saida A (credencial de operador permanente) foi RECUSADA por criar
  --   credencial standing capaz de destruir a PII de qualquer pessoa; a saida C
  --   (um segundo motor destrutivo) foi RECUSADA por contradizer D-46-12. Esta e
  --   a saida B: o chamador e aceito EXCLUSIVAMENTE pelo estado que so o motor da
  --   purga produz — jamais por uma credencial que uma pessoa possa portar.
  --   ⚠ E E POR ISSO QUE A PURGA NUNCA E INSTRUMENTO DE EXCLUSAO DIRIGIDA: nao ha
  --   nada aqui que alguem possa "ter". Ha um estado que o motor cria e destroi.
  --
  -- ⚠ ESTAS SAO TRES LEITURAS ESCOPADAS AO ID RECEBIDO, E NADA E DEVOLVIDO ANTES
  --   DO GUARD — a mesma disciplina da leitura de `v_dono` logo abaixo da metade
  --   (a). O que sai daqui sao dois booleanos.
  --
  -- ⚠⚠ `v_uid IS NULL` E A PRIMEIRA CONJUNCAO DOS DOIS PREDICADOS, E ELA E O
  --   CONSERTO DO BL-02 DO `46-REVIEW.md`. Sem ela, `v_purga_*` era propriedade
  --   APENAS do `p_candidato_id` e do cerco — nao mencionava o chamador em lugar
  --   nenhum. Consequencia medida por leitura: enquanto houvesse item aberto sob
  --   execucao em `live`, as metades (b) e (c) — as duas UNICAS que restringem a
  --   destruicao — ficavam desligadas PARA TODO MUNDO. Qualquer usuario logado que
  --   alcancasse a funcao pelo `GRANT` a `authenticated` (um `rh`, ou o proprio
  --   candidato, via PostgREST) destruiria aquele titular FORA da ordem
  --   Storage -> Postgres -> Auth, orfanando o curriculo no bucket de forma
  --   irrecuperavel — sem PITR (D-45-10) e com o Storage fora de todo backup. Era
  --   o CR-01 cenario 2 reaberto pela duracao da janela de dispatch.
  --   O cabecalho ja prometia "SE E SOMENTE SE" em PROSA; esta linha e onde a
  --   promessa passa a ser imposta pelo CODIGO. Um chamador COM claim volta a ser
  --   julgado por (b) e por (c), como sempre foi.
  --
  -- ⚠⚠ ESCOPO HONESTO DO RAMO, E ELE NAO E "O CRON" (RD2-07 do `46-REVIEW.md`).
  --   `v_uid IS NULL` nao seleciona o cron: seleciona **TODO chamador sem sessao
  --   de usuario**, o que na pratica e `service_role` — o cron, a Edge Function
  --   `purgar-retencao`, um script, o MCP. Dizer "o cron" onde se le "quem nao tem
  --   sessao" e a MESMA classe de imprecisao que produziu o BL-01: um comentario
  --   que descreve a intencao como se fosse o conjunto, e a partir do qual a
  --   proxima pessoa raciocina errado.
  --   ⚠ E ISSO **NAO** E ESCALACAO, e a razao e dura: `service_role` bypassa RLS e
  --   ja tem DML irrestrito sobre `public.candidatos`, `public.candidaturas` e
  --   todas as demais que este motor toca; o Storage responde a service key pela
  --   API e o `auth.users` pela Admin API. Ele tambem pode simplesmente FABRICAR o
  --   item que autoriza, porque as quatro tabelas do ledger nao tem policy de
  --   escrita nenhuma. O guard nunca foi — e nao poderia ser — defesa contra a
  --   service key; o 4o ramo nao lhe da capacidade alguma que ele ja nao tivesse,
  --   muda apenas POR QUAL PORTA o mesmo ator faz o mesmo estrago.
  --   ⚠ O que o ramo NAO faz, e e por isso que a metade (a) continua de pe, e
  --   autorizar um papel de CLIENTE sem sessao: `authenticated` sempre traz `sub`,
  --   e `anon` esta revogado nos dois arquivos.
  --
  -- ⚠⚠ `e.iniciada_em > now() - interval '1 hour'` E O CONSERTO DO HI-03: A
  --   AUTORIZACAO EXPIRA. Sem ele, nada limitava no TEMPO o estado autorizante. No
  --   desenho do 46-06 o item e aberto pelo Postgres e fechado ASSINCRONAMENTE
  --   pela Edge Function; se ela morre (deploy, timeout, o `at-most-once` do
  --   `pg_net`), o item fica aberto e a execucao fica `executando`
  --   INDEFINIDAMENTE — e `v_purga_live` seria TRUE para aquele candidato PARA
  --   SEMPRE. Isso e uma autorizacao destrutiva *standing*, que e exatamente a
  --   categoria que D-46-18 recusou ao rejeitar a Saida A. `concluido_em IS NULL`
  --   impede que um vestigio FECHADO autorize; ele nao impede o item NUNCA
  --   FECHADO, que e o caso real.
  --   ⚠ A outra metade deste conserto vive em `20260823000007`: a varredura
  --   RECONCILIA execucoes vencidas antes de materializar o conjunto, fechando os
  --   itens orfaos — sem isso o titular sumiria de todas as varreduras seguintes
  --   pelo claim anti-sobreposicao, e ninguem seria avisado.
  --
  -- ⚠ FALHA FECHADA POR CONSTRUCAO, e e por isso que nao ha clausula `IS NOT NULL`
  --   extra em lugar nenhum destes dois predicados: com qualquer lado nulo a
  --   comparacao avalia NULL, a linha NAO e selecionada, o `EXISTS` e FALSE e a
  --   funcao RECUSA. E a mesma propriedade que a metade (c) descreve para
  --   `executar_em`, e o oposto exato da negacao por pertencimento a conjunto de
  --   valores, que avalia NULL e falha ABERTO (INVENT-05 / `20260730000005`).
  --
  -- ── (p.1) CAMINHO DE DRY-RUN — autorizado sob cerco em `dry_run` OU `live` ──
  -- O efeito deste caminho o Postgres reverte por construcao: ele termina no
  -- terminador de dry-run, que levanta e derruba a transacao inteira. Autoriza-lo
  -- fora de `live` NAO da permissao destrutiva nova a ninguem — e o que torna
  -- possivel a assercao que o contrato desta fase exige, e sem a qual os 14 dias
  -- de `dry_run` provariam ZERO sobre o caminho do delete (SC#1, P39/CR-02).
  SELECT (v_uid IS NULL) AND EXISTS (
    SELECT 1
      FROM public.purga_execucao_itens i
      JOIN public.purga_execucoes e ON e.id = i.execucao_id
      CROSS JOIN public.config_purga cp
     WHERE i.candidato_id  = p_candidato_id
       AND i.concluido_em IS NULL
       AND e.situacao      = 'executando'
       AND e.iniciada_em   > pg_catalog.now() - interval '1 hour'
       AND (e.modo_vigente = 'dry_run' OR e.modo_vigente = 'live')
       AND (cp.modo        = 'dry_run' OR cp.modo        = 'live')
  ) INTO v_purga_dry;

  -- ── (p.2) CAMINHO DESTRUTIVO — autorizado EXCLUSIVAMENTE sob cerco em `live` ─
  -- ⚠ PREDICADO SEPARADO, DE PROPOSITO, e a separacao e a obrigacao de aceite de
  -- D-46-24. Ele NAO deriva de (p.1) nem o reusa: o unico jeito de o caminho
  -- destrutivo passar a aceitar um modo novo e alguem editar ESTA consulta, onde
  -- o `= 'live'` esta escrito duas vezes e por extenso.
  -- ⚠ AS DUAS LEITURAS DE MODO SAO CUMULATIVAS: `e.modo_vigente` e o regime sob o
  -- qual aquela execucao FOI ABERTA, e `cp.modo` e o cerco AGORA. Exigir os dois
  -- e o que faz o kill switch de D-46-06 morder no meio de uma execucao ja em
  -- curso: por em `off` retira a autorizacao do item que ja estava aberto.
  SELECT (v_uid IS NULL) AND EXISTS (
    SELECT 1
      FROM public.purga_execucao_itens i
      JOIN public.purga_execucoes e ON e.id = i.execucao_id
      CROSS JOIN public.config_purga cp
     WHERE i.candidato_id  = p_candidato_id
       AND i.concluido_em IS NULL
       AND e.situacao      = 'executando'
       AND e.iniciada_em   > pg_catalog.now() - interval '1 hour'
       AND e.modo_vigente  = 'live'
       AND cp.modo         = 'live'
  ) INTO v_purga_live;

  -- A metade que vale para ESTA chamada. A chave e `v_dry_run`, normalizada uma
  -- unica vez no DECLARE: com o parametro cru, NULL nao tomaria nenhum dos ramos
  -- e a escolha cairia no default `false`, que RECUSA — seguro, mas por acidente.
  -- Aqui ela e explicita, e espelha a forma que a metade (b) tem desde o 45-13.
  IF v_dry_run THEN
    v_ramo_purga := v_purga_dry;
  ELSE
    v_ramo_purga := v_purga_live;
  END IF;

  -- ── GUARD, QUATRO METADES: (a) sessão · (b) papel · (c) INTENÇÃO · (p) PURGA ─
  -- (a) chamador SEM claim nenhuma é recusado EXPLICITAMENTE. Esta função apaga
  --     PII de forma irreversível e nasceria executável por `anon` sem o REVOKE
  --     abaixo — mas um guard confiado só ao ACL é um controle confiado a uma
  --     configuração de schema que ninguém relê.
  --
  -- ⚠⚠ 46-04 · A MENSAGEM DESTA METADE NAO MUDA — NEM UMA LETRA — E ISSO E
  --     ASSERCAO, nao estilo. O que muda e a CONDICAO, que ganha UMA alternativa
  --     cumulativa e nomeada. A distincao e a linha inteira que separa esta
  --     emenda da saida RECUSADA:
  --       · saida RECUSADA (DI-45-07-01 + decisao do operador de 2026-08-05):
  --         "aceitar `auth.uid() IS NULL` quando o papel do banco for
  --         `service_role`" — isso e uma credencial, e uma credencial e portavel.
  --         Continua recusada e nao aparece em lugar nenhum deste arquivo.
  --       · o que esta escrito aqui: sessao nula e aceitavel SE E SOMENTE SE
  --         existir, AGORA, item vivo de purga para ESTE `p_candidato_id`, sob
  --         execucao em `executando` INICIADA HA MENOS DE UMA HORA, com o cerco no
  --         modo que autoriza AQUELE caminho. E um ESTADO, e um estado ninguem
  --         carrega no bolso.
  --         ⚠ E desde o BL-02 o "se e somente se" esta no CODIGO e nao so nesta
  --         frase: os dois predicados exigem `v_uid IS NULL` como PRIMEIRA
  --         conjuncao, entao a alternativa nao existe para chamador COM sessao.
  --     `v_ramo_purga` e o unico ponto do corpo em que as duas metades sao
  --     consultadas por uma variavel comum, e ele existe porque esta metade e
  --     ANTERIOR a bifurcacao por intencao. A escolha entre as duas ja aconteceu
  --     logo acima, por `v_dry_run`, e esta escrita por extenso.
  IF v_uid IS NULL AND NOT v_ramo_purga THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao anonimiza ninguem'
      USING ERRCODE = '42501';
  END IF;

  -- O DONO é lido ANTES da metade (b), porque a metade (b) precisa dele. É uma
  -- leitura de UMA coluna, escopada ao id recebido, e nada é devolvido antes do guard.
  SELECT c.user_id INTO v_dono
    FROM public.candidatos c
   WHERE c.id = p_candidato_id;

  -- A titularidade do CHAMADOR, resolvida aqui e não depois: o passo seguinte severa
  -- `user_id`, e a partir dele não existe mais dono a comparar. É o que alimenta a
  -- trilha de executor no retorno.
  v_eh_titular := (v_dono IS NOT NULL AND v_dono = v_uid);

  -- (b) TRÊS comparações, todas por `IS DISTINCT FROM` e NUNCA por `NOT IN`: com um
  --     dos lados NULL o `NOT IN` avalia NULL, o `IF` NÃO é tomado, e o guard FALHA
  --     ABERTO exatamente para `anon` (defeito REAL medido na 42-06). Com o candidato
  --     inexistente ou já severado o dono resolve NULL, `NULL IS DISTINCT FROM <uid>`
  --     é TRUE, e a função recusa — falha FECHADA por construção, não por lembrança.
  --
  -- ⚠ O TITULAR ENTRA AQUI, E A RAZÃO É DATÁVEL. O 45-07 desenhou esta função como
  --     função de OPERADOR (`rh`/`administrador`, `GRANT` só a `service_role`); o
  --     45-10 — escrito depois — a cabeou dentro do caminho de execução **do próprio
  --     titular**, cujo papel de aplicação é `candidato`. As duas metades estavam
  --     certas isoladamente; a junta não. ⚠ A metade (a) NÃO é tocada: aceitar
  --     `auth.uid() IS NULL` sob `service_role` é a saída **recusada** pelo
  --     `DI-45-07-01` e pela decisão do operador de 2026-08-05, e deixaria uma função
  --     que apaga PII irreversivelmente sem controle nenhum no corpo.
  --
  -- ⚠ A METADE (b) TEM DUAS FORMAS DESDE O 45-13 (opção B do checkpoint, decisão do
  --     operador de 2026-08-11), e a diferença é o que a chamada FAZ, não quem chama:
  --     · LEITURA (`p_dry_run = true`): `rh`, `administrador` ou o dono. Ler o que a
  --       exclusão faria não destrói nada, e o `rh` precisa disso para operar.
  --     · DESTRUTIVO (`p_dry_run = false`): apenas `administrador` ou o dono. Um
  --       recrutador deixa de conseguir disparar o tombstone de quem quer que seja —
  --       o cenário 2 do CR-01 perde o ator. O `administrador` permanece como escotilha
  --       de operador, que é justamente quem o CR-03 precisa quando uma execução trava.
  --     As comparações continuam TODAS por `IS DISTINCT FROM`, nas duas formas.
  --
  -- ⚠ A CHAVE É `v_dry_run`, NUNCA `p_dry_run`: o parâmetro cru admite NULL, e com NULL
  --     este `IF` não seria tomado — a chamada cairia no ramo DESTRUTIVO por omissão de
  --     intenção. Ver a normalização no `DECLARE` (BL-01).
  --
  -- ⚠⚠ 46-04 · CADA FORMA CONSULTA A SUA PROPRIA METADE DO RAMO NOVO, e nunca a
  --     variavel comum: a forma de LEITURA le `v_purga_dry`, a forma DESTRUTIVA
  --     le `v_purga_live`. Escrito assim, a pergunta do code review — "a metade
  --     destrutiva herdou a permissividade da metade de leitura?" — se responde
  --     lendo UMA palavra, e nao rastreando de onde veio um booleano.
  --     As mensagens sao ESTENDIDAS para nomear a quarta condicao: uma recusa que
  --     enumera as condicoes exigidas e nao menciona o caminho da purga faria a
  --     proxima pessoa procurar o defeito no lugar errado as tres da manha.
  IF v_dry_run THEN
    IF v_role IS DISTINCT FROM 'rh'
       AND v_role IS DISTINCT FROM 'administrador'
       AND v_dono IS DISTINCT FROM v_uid
       AND NOT v_purga_dry THEN
      RAISE EXCEPTION 'FORBIDDEN: o dry-run da anonimizacao so pode ser lido por rh, por administrador, pelo proprio titular daquele candidato, ou pelo MOTOR DA PURGA de retencao. O caminho da purga (D-46-18 / D-46-24) exige as QUATRO condicoes cumulativas: (1) existir item em purga_execucao_itens para ESTE candidato, (2) com concluido_em ainda nulo, (3) sob execucao em purga_execucoes com situacao = executando e modo_vigente em dry_run ou live, e (4) com config_purga.modo em dry_run ou live. Nenhuma credencial autoriza este caminho — apenas o estado que so o motor da purga produz'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF v_role IS DISTINCT FROM 'administrador'
       AND v_dono IS DISTINCT FROM v_uid
       AND NOT v_purga_live THEN
      RAISE EXCEPTION 'FORBIDDEN: a anonimizacao REAL so pode ser executada por administrador, pelo proprio titular daquele candidato, ou pelo MOTOR DA PURGA de retencao em modo live. O papel rh alcanca o dry-run e nao o caminho destrutivo: destruir a PII de outra pessoa nao e capacidade de recrutamento (CR-01, cenario 2). O caminho da purga aqui e ESTRITAMENTE mais exigente que o do dry-run — ele exige purga_execucoes.modo_vigente = live E config_purga.modo = live, e um modo que nao seja live NAO autoriza destruicao (D-46-18). O escopo DUPLO de D-46-24 vale para o caminho reversivel, jamais para este'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- (c) ⚠⚠ GUARD DE INTENÇÃO — O QUE IMPEDE QUE «SER CHAMÁVEL» SEJA SUFICIENTE PARA
  --     SER PERIGOSA (CR-01). As metades (a) e (b) verificam QUEM chama; nenhuma das
  --     duas sabe EM QUE ESTADO O MOTOR ESTÁ. Esta exige o estado que só o motor
  --     produz: pedido de exclusão em execução, janela do D-45-01 vencida e o passo 1
  --     do Storage carimbado. É ela que impede que o `GRANT EXECUTE ... TO
  --     authenticated` da `20260805000009` vire uma porta direta por PostgREST, fora da
  --     janela do ERASE-06 e fora do recibo.
  --
  --     ⚠ E É AQUI QUE A ORDEM `Storage -> Postgres -> Auth` PASSA A SER IMPOSTA PELO
  --     BANCO. A SONDA 2 mediu que a plataforma NÃO a impõe — `storage.objects` não tem
  --     FK para `auth.users` — e que o modo de falha de violá-la é SILENCIOSO: nada
  --     levanta erro, o blob apenas fica órfão para sempre, sem PITR e sem backup.
  --
  --     ⚠ NULL-SAFE POR CONSTRUÇÃO, e é por isso que não há `IS NOT NULL` sobre
  --     `executar_em`: com a coluna nula o predicado `s.executar_em <= now()` avalia
  --     NULL, a linha NÃO é selecionada, o `NOT EXISTS` é TRUE e a função RECUSA. Falha
  --     FECHADA sem cláusula extra — o oposto do `NOT IN`, que avalia NULL e falha
  --     ABERTO. `storage_concluido_em` é exigido explicitamente porque ali a pergunta é
  --     de EXISTÊNCIA do carimbo, não de comparação.
  --
  --     ⚠ DE QUE ESTE GUARD DEPENDE: da segurança de `public.solicitacoes_dados`. Quem
  --     escrever `situacao` e `storage_concluido_em` naquela tabela autoriza o
  --     tombstone. O bloco de auto-verificação abaixo pergunta ao CATÁLOGO se
  --     `authenticated` pode escrever ali e ABORTA O APPLY se puder — o pressuposto é
  --     asserção, não confiança.
  --
  --     ⚠ Só no caminho destrutivo: o dry-run do 45-11 tem de poder rodar sobre uma
  --     linha arbitrária, e ler não destrói nada.
  --     ⚠ E A CHAVE É `v_dry_run`: com o parâmetro cru, `NOT NULL` avalia NULL e este
  --     `IF` NÃO é tomado — o guard de intenção deixaria de existir para quem chamasse
  --     com `p_dry_run := NULL`, que é o cenário 1 do CR-01 inteiro de volta (BL-01).
  --
  -- ⚠⚠ 46-04 · DOIS MOTORES, E A ALTERNATIVA E CUMULATIVA DOS DOIS LADOS. A (c)
  --     passa a aceitar o estado do motor do DIREITO DO TITULAR (a linha viva em
  --     `solicitacoes_dados`, inalterada) **ou** o estado do motor da PURGA
  --     (`v_purga_live`, que ja exige as suas quatro condicoes proprias). Nao ha
  --     terceira via: uma chamada destrutiva que nao esteja dentro de um dos dois
  --     motores continua recusando com 42501, e e a mesma tese da metade (c)
  --     original — exigir o estado que so um motor produz.
  --     ⚠ A metade de DRY-RUN do ramo novo NAO aparece aqui, e a ausencia e o
  --     ponto: este bloco so roda quando `v_dry_run` e falso.
  IF NOT v_dry_run THEN
    IF NOT v_purga_live AND NOT EXISTS (
      SELECT 1
        FROM public.solicitacoes_dados s
       WHERE s.candidato_id = p_candidato_id
         AND s.tipo         = 'exclusao'
         AND s.situacao     = 'executando'
         AND s.executar_em <= now()
         AND s.storage_concluido_em IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN: anonimizar_candidato so executa DENTRO de um dos DOIS motores. (I) MOTOR DO DIREITO DO TITULAR, com as QUATRO condicoes: (1) existir pedido em solicitacoes_dados para este candidato, (2) com tipo = exclusao, (3) em situacao = executando com executar_em ja vencido (a janela do D-45-01 / ERASE-06), e (4) com storage_concluido_em carimbado (o passo 1 concluido). (II) MOTOR DA PURGA DE RETENCAO (D-46-18 / D-46-24), com as QUATRO suas: (1) item em purga_execucao_itens para este candidato, (2) com concluido_em nulo, (3) sob execucao com situacao = executando e modo_vigente = live, e (4) com config_purga.modo = live. A ordem Storage -> Postgres -> Auth NAO e imposta pela plataforma — a SONDA 2 mediu que a tabela de objetos do Storage nao tem FK para auth.users — e passa a ser imposta AQUI. Sem este guard, o GRANT a authenticated da 20260805000009 seria uma porta direta por PostgREST para destruir PII fora da janela e fora do recibo (CR-01)'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── PASSO 0 · A EXPRESSÃO ÚNICA. CHAMAR, NUNCA COPIAR O CORPO ─────────────
  -- O dry-run e o delete real saem DAQUI. Reescrever este predicado inline criaria
  -- uma segunda definição de exclusão no banco, e a que o dry-run mostra deixaria
  -- de ser a que o delete real executa (P39 CR-02). A asserção C3 do smoke exige
  -- que `pg_get_functiondef` desta função CONTENHA esta chamada.
  v_plano := public.plano_exclusao_titular(p_candidato_id);

  SELECT true, c.user_id, c.email, c.data_nascimento
    INTO v_achou, v_user_id, v_email, v_nasc
    FROM public.candidatos c
   WHERE c.id = p_candidato_id;

  IF NOT coalesce(v_achou, false) THEN
    RAISE EXCEPTION 'CANDIDATO_INEXISTENTE: nao ha linha em candidatos para o id informado — anonimizar o que nao existe seria um sucesso silencioso, e o recibo prometeria ao titular um apagamento que nunca teve alvo'
      USING ERRCODE = 'P0002';
  END IF;

  v_sent_email := 'anonimizado+' || p_candidato_id::text || '@invalido.local';

  -- ── IDEMPOTÊNCIA POR ESTADO, NUNCA POR try/catch ──────────────────────────
  -- O predicado RECONHECE a sentinela. "Apagar de novo porque não dá erro" funciona
  -- por ACIDENTE e para de funcionar no dia em que a enumeração devolver algo novo
  -- — e nesse dia a evidência de que já tinha rodado não existe. Zero coluna muda,
  -- zero linha de auditoria nasce: um no-op que audita não é um no-op.
  --
  -- ⚠⚠ A SENTINELA É IGUALDADE COM O VALOR DERIVADO DO ID DESTA LINHA, NUNCA UM
  -- PADRÃO SOBRE UMA COLUNA QUE O USUÁRIO ESCREVE (CR-06). `email` é escolhida pela
  -- pessoa no cadastro, e a `check_email_format` viva aceita QUALQUER endereço do
  -- namespace de anonimização — nada valida o domínio. Um casamento por prefixo fazia
  -- qualquer pessoa que se cadastrasse com um endereço desse namespace receber
  -- `ja_anonimizado` com 100% da PII intacta: a Edge Function leria isso como sucesso,
  -- carimbaria `postgres_concluido_em`, apagaria a conta do Auth e mandaria o recibo.
  -- O recibo seria uma declaração de conformidade FALSA.
  --
  -- ⚠ CINTO SECUNDÁRIO, porque a igualdade sozinha depende de `p_candidato_id` nunca
  -- mudar: o resto do tombstone também tem de estar de pé — `user_id` já severado E
  -- `data_nascimento` já na sentinela de 1900. Uma linha que case o e-mail mas não os
  -- outros dois NÃO é um tombstone: é uma linha meio anonimizada, e declará-la no-op
  -- faria a EF carimbar o passo 2 e mandar o recibo sobre PII intacta.
  IF v_email = v_sent_email
     AND v_user_id IS NULL
     AND v_nasc = DATE '1900-01-01' THEN
    RETURN jsonb_build_object(
      'resultado',    'ja_anonimizado',
      'candidato_id', p_candidato_id,
      -- ⚠ O valor NORMALIZADO, nunca o parâmetro cru: quem chamou com NULL tem de ler no
      -- retorno o modo em que a função de fato operou, e não o que ele digitou (BL-01).
      'dry_run',      v_dry_run,
      'plano',        v_plano,
      'observacao',   'o tombstone foi reconhecido por IGUALDADE com a sentinela derivada do id desta linha, mais user_id severado e data_nascimento na sentinela de 1900. Nenhuma coluna foi tocada e nenhuma linha de auditoria foi criada'
    );
  END IF;

  -- ── WR-06 · `user_id` JÁ NULO SEM QUE A LINHA SEJA UM TOMBSTONE ───────────
  -- A `20260805000004` (a S1) tornou a FK `ON DELETE SET NULL` — ou seja, ela CRIA o
  -- estado em que `candidatos.user_id` é NULL sem que o tombstone tenha rodado (um
  -- `deleteUser` fora de ordem, exatamente o caso que a rede existe para amortecer).
  -- Nesse estado as severações guardadas por `v_user_id IS NOT NULL` não acontecem, e
  -- a função ainda declararia sucesso com zero — e zero seria lido como «não havia».
  IF v_user_id IS NULL THEN
    RAISE WARNING 'P45: candidatos.user_id ja era NULL ANTES do tombstone (deleteUser fora de ordem, pela rede da FK SET NULL da 20260805000004). As severacoes por user_id NAO acontecem por este caminho: logs_acesso.email_tentativa, logs_acesso.ip_address e autorizacoes.ip_aceite podem permanecer EM CLARO, e historico_candidatura.ator tambem. Os tres re-identificam sozinhos. O retorno carrega severacao_por_user_id = false para que zero deixe de ser lido como "nao havia" — severar por candidato_id onde a coluna existir, e registrar o residuo';
  END IF;

  -- ══ passo_motor: tombstone_candidato ══════════════════════════════════════
  -- ⚠ (1/2) A FAIXA ETÁRIA PRIMEIRO — restrição de ordenação nº 1 do ROADMAP.
  -- `gerar_bias_snapshot()` deriva a idade por JOIN VIVO em `data_nascimento` no
  -- momento do snapshot. Toda data no passado tem idade, então a sentinela CAI numa
  -- faixa real: se a faixa continuasse sendo derivada, anonimizar um titular moveria
  -- a coorte e a série EEOC 4/5 mudaria RETROATIVAMENTE (SC#5). Materializar depois
  -- da sentinela gravaria a faixa do ANO 1900 — o mesmo defeito com outra cara.
  -- As bandas são as de `20260625100001:349-353`, copiadas verbatim: uma segunda
  -- definição de faixa etária no repositório envelheceria em silêncio.
  UPDATE public.candidatos c
     SET faixa_etaria_materializada = coalesce(
           c.faixa_etaria_materializada,
           CASE
             WHEN c.data_nascimento IS NULL                                        THEN NULL
             WHEN date_part('year', age(c.data_nascimento))::int BETWEEN 18 AND 24 THEN '18-24'
             WHEN date_part('year', age(c.data_nascimento))::int BETWEEN 25 AND 34 THEN '25-34'
             WHEN date_part('year', age(c.data_nascimento))::int BETWEEN 35 AND 44 THEN '35-44'
             WHEN date_part('year', age(c.data_nascimento))::int BETWEEN 45 AND 54 THEN '45-54'
             WHEN date_part('year', age(c.data_nascimento))::int >= 55             THEN '55+'
           END)
   WHERE c.id = p_candidato_id;

  -- ⚠ (2/2) O TOMBSTONE. Cada sentinela contra a SONDA 1 — ver o bloco (4) do
  -- cabeçalho. `estado` NÃO aparece aqui: é preservada por decisão registrada em (5).
  UPDATE public.candidatos c
     SET nome_completo          = '[titular removido a pedido]',
         email                  = v_sent_email,
         cpf                    = NULL,
         celular                = '(00) 00000-0000',
         data_nascimento        = DATE '1900-01-01',
         genero                 = NULL,
         cidade                 = '[removido]',
         como_conheceu          = NULL,
         como_conheceu_detalhes = NULL,
         linkedin               = NULL,
         instagram              = NULL,
         linkedin_url           = NULL,
         instagram_url          = NULL,
         avatar_url             = NULL,
         cep                    = NULL,
         logradouro             = NULL,
         numero                 = NULL,
         complemento            = NULL,
         bairro                 = NULL,
         bloqueado_motivo       = NULL,
         data_ultimo_acesso     = NULL,
         -- passo_motor: severar_user_id — só possível pela 20260805000004 (S1).
         user_id                = NULL,
         -- As duas abaixo apontam a auth.users com NO ACTION: se o titular tiver
         -- criado a própria linha, elas BLOQUEIAM o deleteUser com 23503 depois de
         -- o currículo já ter sido apagado. A SONDA 6 mediu ZERO no caminho do
         -- titular puro — o predicado existe para a conta híbrida, que existe em PROD.
         created_by             = CASE WHEN v_user_id IS NOT NULL AND c.created_by = v_user_id
                                       THEN NULL ELSE c.created_by END,
         updated_by             = CASE WHEN v_user_id IS NOT NULL AND c.updated_by = v_user_id
                                       THEN NULL ELSE c.updated_by END,
         updated_at             = now()
   WHERE c.id = p_candidato_id;

  GET DIAGNOSTICS v_n_cand = ROW_COUNT;

  -- ⚠⚠ (2/2b) O PONTEIRO REVERSO EM `candidaturas` — CR-04, plano 45-13.
  -- As LINHAS de `candidaturas` são PRESERVADAS por desenho (ERASE-08) e nada aqui as
  -- remove. Mas estas duas colunas NÃO são trilha de decisão — são PII e um ponteiro
  -- de volta à pessoa:
  --   · `curriculo_url` embute o `auth.uid()` EM CLARO: o esquema de caminho é
  --     `{authUid}/{uuid}.pdf` (`cvUploadService.ts:101`), e um `split_part(...,'/',1)`
  --     mais um join em `auth.users` devolve a identidade COMPLETA do titular
  --     «anonimizado», por uma linha. Isso é pseudonimização apresentada como
  --     anonimização — exatamente o que o bloco desta função sobre `ai_call_logs`
  --     argumenta não aceitar, e com rigor menor;
  --   · `curriculo_nome_original` costuma carregar o NOME da pessoa dentro do nome do
  --     arquivo, e é SELECIONADA pela view do painel de triagem
  --     (`20260623000001_v_triagem_panel_orderable.sql:24`) — legível para o RH numa
  --     linha cujo candidato já é um tombstone. A busca de re-identificação por
  --     quase-identificadores (faixa + UF + vaga + timestamp) NÃO cobre esse vetor,
  --     porque ele não precisa deles: o nome está escrito.
  -- ⚠ A ORDEM JÁ É SEGURA e não depende de lembrança: o passo 0 da Edge Function LÊ
  -- `curriculo_url` para montar o plano, e a EF só chama esta função no passo 2.
  -- ⚠ AS DUAS SÃO NULÁVEIS no catálogo, e isso é CONFERIDO pelo bloco de
  -- auto-verificação antes do apply — se alguma virasse `NOT NULL`, a saída seria
  -- sentinela, pelo mesmo raciocínio das sentinelas de `candidatos`, e este `UPDATE`
  -- abortaria a transação DEPOIS de o currículo já ter sido apagado (Pitfall 1).
  -- ⚠ `created_by`/`updated_by` são severadas na MESMA forma guardada que
  -- `candidatos.created_by`/`updated_by` acima: são FKs `NO ACTION` para `auth.users` e,
  -- de pé, bloqueiam o `deleteUser` com 23503 depois do passo 1 (CR-05).
  -- ⚠ NADA MAIS de `candidaturas` é tocado: `encerrada_a_pedido_em` é do D-45-13,
  -- `etapa_atual` tem um único escritor desde o M2/Phase 6, e `deleted_at` faria a linha
  -- sumir de cinco leituras do RH em silêncio.
  UPDATE public.candidaturas c
     SET curriculo_url           = NULL,
         curriculo_nome_original = NULL,
         created_by              = CASE WHEN v_user_id IS NOT NULL AND c.created_by = v_user_id
                                        THEN NULL ELSE c.created_by END,
         updated_by              = CASE WHEN v_user_id IS NOT NULL AND c.updated_by = v_user_id
                                        THEN NULL ELSE c.updated_by END
   WHERE c.candidato_id = p_candidato_id;

  GET DIAGNOSTICS v_n_cvurl = ROW_COUNT;

  -- ══ passo_motor: tombstone_decisao_final ══════════════════════════════════
  -- D-45-02 / D-45-03: PRESERVAR ANONIMIZADA. As duas colunas são `NOT NULL` —
  -- nunca NULL, nunca remoção da linha. O texto sobrevive como prova de
  -- não-discriminação (Art. 7º, VI / RNF-07a); o vínculo com o titular, não.
  -- ⚠⚠ 49-14 / D-60 · `revisao_resultado` ENTRA NO MESMO UPDATE, E O "MESMO" E O
  --    MECANISMO INTEIRO. Essa coluna guarda o que o revisor ESCREVEU ao responder o
  --    pedido de revisao do Art. 20: texto sobre a pessoa, na fala de quem revisou.
  --    Um segundo UPDATE depois deste dispararia `trg_decisao_final_snapshot` DE NOVO
  --    e arquivaria uma segunda versao da linha; um UPDATE ANTES dele arquivaria a
  --    justificativa ainda identificavel. Uma escrita por linha, as duas colunas juntas.
  -- ⚠ A FORMA E `CASE WHEN ... IS NULL THEN NULL ELSE <sentinela> END`, e nao
  --   sentinela seca: a coluna e NULAVEL, e "nunca houve revisao" e informacao que a
  --   trilha deve continuar dizendo. Carimbar sentinela numa linha sem revisao
  --   INVENTARIA uma revisao que nao aconteceu, e o recibo passaria a prometer o
  --   apagamento de um texto que nunca existiu.
  SELECT count(*) INTO v_n_df_rev
    FROM public.decisao_final d
   WHERE d.revisao_resultado IS NOT NULL
     AND d.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  UPDATE public.decisao_final d
     SET justificativa = '[justificativa preservada de forma desidentificada a pedido do titular — o texto original foi removido; a decisao permanece registrada como prova de que houve avaliacao humana (LGPD Art. 7o, VI / RNF-07a)]',
         revisao_resultado = CASE WHEN d.revisao_resultado IS NULL THEN NULL
                                  ELSE '[resposta do revisor preservada de forma desidentificada a pedido do titular — o texto original foi removido; o registro de que houve revisao humana permanece (LGPD Art. 20 / RNF-07a)]' END
   WHERE d.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_df = ROW_COUNT;

  -- ⚠⚠ ESTE É O ÚLTIMO STATEMENT A TOCAR O PAR, E A ORDEM É O MECANISMO.
  -- O `UPDATE` acima acabou de disparar `trg_decisao_final_snapshot` (AFTER UPDATE,
  -- FOR EACH ROW, SEM `WHEN`), que inseriu no arquivo uma linha nova carregando
  -- `OLD.justificativa` — a PII que o statement anterior removeu da linha corrente.
  -- Fazer este scrub ANTES deixaria essa linha recém-criada identificável atrás
  -- dele. Ver o bloco (3) do cabeçalho.
  -- ⚠⚠ 49-14 / D-60 · E AQUI A CONTAGEM E LIDA **DEPOIS** DO UPDATE DE CIMA, DE
  --    PROPOSITO. O UPDATE anterior acabou de disparar o snapshot, que inseriu no
  --    arquivo uma linha nova carregando `OLD.revisao_resultado` — a resposta do
  --    revisor que o statement anterior removeu da linha corrente. Medir antes dele
  --    deixaria essa linha recem-criada FORA da contagem, e o numero do recibo seria
  --    menor do que o que a raspagem de fato alcanca. E a MESMA assimetria que
  --    `v_n_dfh` ja tem em relacao a contagem do dry-run: o arquivo cresce DURANTE
  --    o passo, e quem conta antes conta o mundo de antes do snapshot.
  SELECT count(*) INTO v_n_dfh_rev
    FROM public.decisao_final_historico h
   WHERE h.revisao_resultado IS NOT NULL
     AND h.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  UPDATE public.decisao_final_historico h
     SET justificativa = '[justificativa arquivada, preservada de forma desidentificada a pedido do titular — LGPD Art. 7o, VI / RNF-07a]',
         revisao_resultado = CASE WHEN h.revisao_resultado IS NULL THEN NULL
                                  ELSE '[resposta do revisor arquivada, preservada de forma desidentificada a pedido do titular — LGPD Art. 20 / RNF-07a]' END
   WHERE h.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_dfh = ROW_COUNT;

  -- ══ passo_motor: apagar_respostas_e_producoes ══════════════════════════════
  -- JORN-36 / D-48 · O QUE O RECIBO SEMPRE DISSE QUE APAGAVA, E QUE O MOTOR NAO
  -- TOCAVA EM NENHUMA DAS 14 ORIGENS. O item `respostas_e_producoes` do recibo
  -- (`docs/compliance/sql/gen-recibo-exclusao.cjs:293-317`) promete: «as suas
  -- respostas das avaliacoes, os textos que voce escreveu, as transcricoes das
  -- entrevistas e a sua devolutiva foram apagados». Medido em 2026-09-23 no corpo
  -- vivo: `respostas_raven` e `cited_evidence` AUSENTES do motor — nenhuma das
  -- origens era alcancada. A unica exclusao concluida (22/08) foi de um titular sem
  -- esses dados: o recibo ainda nao mentiu, e mentiria na proxima.
  --
  -- ⚠⚠ ESTE E O PRIMEIRO PASSO DESTE MOTOR QUE APAGA LINHA, E A EXCECAO E NOMEADA.
  --    Ate aqui o motor NUNCA apagou linha propria — a devolutiva morre por FK
  --    CASCADE para `auth.users` no passo 3 (`auth_delete_user`), e e por isso que
  --    `devolutivas_candidato` NAO aparece abaixo: a frase do recibo sobre a
  --    devolutiva ja era verdade, por FK e nao pelo motor (RESEARCH Correcao 15).
  --    O D-62 e a excecao EXPLICITA do operador, valida SO neste passo e SO nas
  --    quatro tabelas de resposta de multipla escolha, e o motivo e de ESQUEMA e
  --    foi medido no catalogo vivo, nao suposto:
  --      · `respostas_raven.resposta`   `integer NOT NULL` CHECK (1..8)
  --      · `respostas_bigfive.resposta` `integer NOT NULL` CHECK (1..5)
  --      · `respostas_disc.mais_caracteristico` / `menos_caracteristico`
  --        `text NOT NULL` CHECK (= ANY ('D','I','S','C')) e CHECK (os dois
  --        DIFERENTES entre si)
  --      · `respostas_formulario` tem `resposta_preenchida_check`, que exige AO
  --        MENOS UMA das tres colunas de resposta nao nula — anular a de texto
  --        deixando as outras duas nulas ABORTA a transacao com 23514
  --    Ou seja: nestas quatro nao existe valor de sentinela que o esquema aceite.
  --    As opcoes eram (a) apagar a linha, (b) afrouxar `NOT NULL`/CHECK das quatro
  --    tabelas para sempre, (c) o recibo ressalvar que as alternativas marcadas
  --    ficam. O operador escolheu (a) no portao. ⚠ E o que NAO se perde: os scores
  --    ja calculados (`scores_raven`, `scores_candidato`) FICAM — eles sao a prova
  --    de que houve avaliacao, e o D-62 nao os toca.
  --
  -- ⚠ ESCOPO, UMA VEZ E SEMPRE O MESMO: `candidatura_id IN (SELECT id FROM
  --   candidaturas WHERE candidato_id = p_candidato_id)`. Todas as treze tabelas se
  --   enderecam pela CANDIDATURA, nunca pelo candidato — e as linhas de
  --   `candidaturas` sao PRESERVADAS por desenho (ERASE-08), entao o escopo
  --   sobrevive ao tombstone que roda antes.
  --
  -- ⚠ A ESCOLHA POR COLUNA (sentinela / NULL / apagar a linha) VEM DO CATALOGO, e
  --   esta CONFERIDA no pre-portao desta migration, coluna por coluna. Se alguem
  --   afrouxar ou endurecer a nulidade de qualquer uma delas, o APPLY reprova — em
  --   vez de o 23514 esperar pelo primeiro pedido real, que acontece DEPOIS de o
  --   curriculo ja ter sido apagado do Storage, sem PITR e sem backup de Storage
  --   (Pitfall 6 desta fase, e o modo de falha mais caro dela).
  --
  -- ⚠ O QUE NAO ENTRA, E DITO COM TODAS AS LETRAS (o recibo nao promete, e alargar
  --   um passo de mao unica alem do que o operador decidiu nao e conserto de
  --   agente): `redacoes_candidato.texto_hash`/`input_hash` e
  --   `entrevista_analises.texto_hash` sobrevivem — sao resumos do texto removido,
  --   nao o texto; `entrevistas_online.analise_ia` (medida em ZERO linhas hoje) e
  --   `entrevista_analises.competencias` (medida: so `{competency, score}`, sem
  --   texto) ficam como prova de que houve avaliacao. Os tres primeiros estao
  --   registrados para o operador e para o 49-21.

  -- ── (1/13 · D-62) respostas_raven — a linha deixa de existir ────────────────
  DELETE FROM public.respostas_raven
   WHERE candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_raven = ROW_COUNT;

  -- ── (2/13 · D-62) respostas_bigfive ────────────────────────────────────────
  DELETE FROM public.respostas_bigfive
   WHERE candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_bigfive = ROW_COUNT;

  -- ── (3/13 · D-62) respostas_disc ───────────────────────────────────────────
  DELETE FROM public.respostas_disc
   WHERE candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_disc = ROW_COUNT;

  -- ── (4/13 · D-62) respostas_formulario ─────────────────────────────────────
  -- ⚠ Aqui o `resposta_preenchida_check` e o argumento inteiro: `resposta_texto`,
  --   `resposta_opcoes` e `resposta_numerica` sao TODAS nulaveis, e o CHECK exige
  --   ao menos uma preenchida. Anular a de texto numa linha cujas outras duas ja
  --   sao nulas aborta com 23514 — e as linhas de formulario aberto sao
  --   exatamente essas. Nao ha sentinela possivel numa coluna `jsonb`/`numeric` de
  --   resposta sem inventar uma resposta que a pessoa nao deu.
  DELETE FROM public.respostas_formulario
   WHERE candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_form = ROW_COUNT;

  -- ── (5/13) redacoes_candidato — o texto E os trechos citados na analise ────
  -- ⚠⚠ A GUC `app.motor_exclusao` ENVOLVE ESTE UNICO UPDATE, e ela existe porque
  --    `trg_redacao_rh_only_review_fields` (BEFORE UPDATE, `20260623100003:139`)
  --    LEVANTA EXCECAO quando a claim de papel e `rh` ou `administrador` e o UPDATE
  --    mexe em `texto` ou `analise_ia`. Medido: a Edge Function do direito do
  --    titular chama o motor com o JWT de quem pediu, e um pedido executado por
  --    ADMINISTRADOR abortaria aqui — DEPOIS do passo de Storage, que e
  --    irreversivel (RESEARCH Correcao 18 / Pitfall 6). O passo NAO pode depender
  --    do papel de quem executa.
  -- ⚠ SANCAO POR GUC, E NAO AFROUXAMENTO DO TRIGGER. O trigger continua recusando
  --   toda mudanca de `texto`/`analise_ia` feita por RH/admin; o que ele passou a
  --   reconhecer e UMA janela, ligada e ZERADA pelo proprio motor em volta de um
  --   unico statement. `set_config(..., true)` e SET LOCAL: morre com a transacao
  --   de todo modo, e ainda assim e zerada explicitamente na linha seguinte —
  --   porque "morre no fim da transacao" nao e o mesmo que "nao vale para o
  --   proximo statement desta transacao", e depois deste passo vem o tombstone das
  --   FKs. Nenhum cliente seta `app.*` (mesmo pressuposto de
  --   `app.rejeicao_sancionada`): PostgREST nao repassa GUC de `app.` na requisicao.
  -- ⚠ `cited_evidence` (D-48, consequencia declarada): os elementos de
  --   `analise_ia -> 'dimension_scores'` guardam o TRECHO LITERAL do que a pessoa
  --   escreveu, com localizacao («Paragrafo 3»). Medido: 2 linhas vivas, 4 de 4
  --   elementos com `cited_evidence` em cada. Apagar `texto` e deixar a citacao e
  --   apagar metade. O RESTO da analise (`score`, `level`, `dimension`,
  --   `reasoning`) e PRESERVADO — e a prova de que houve avaliacao humana revisavel
  --   (Art. 7o VI / RNF-07a), e removê-lo iria contra o ERASE-08.
  -- ⚠ A ORDEM DOS ELEMENTOS E PRESERVADA por `WITH ORDINALITY` + `ORDER BY`: a
  --   posicao no array carrega a dimensao, e reordenar silenciosamente trocaria os
  --   scores de dimensao entre si. E o `CASE` de `jsonb_typeof` existe para que uma
  --   analise com forma diferente (ou nula) passe INTACTA em vez de abortar com
  --   "cannot delete from scalar" no meio de uma exclusao real.
  PERFORM set_config('app.motor_exclusao','on',true);

  UPDATE public.redacoes_candidato r
     SET texto = '[removido a pedido do titular — LGPD Art. 18]',
         analise_ia = CASE
           WHEN jsonb_typeof(r.analise_ia -> 'dimension_scores') = 'array'
           THEN jsonb_set(r.analise_ia, '{dimension_scores}',
                  (SELECT coalesce(jsonb_agg(CASE WHEN jsonb_typeof(e.v) = 'object'
                                                  THEN e.v - 'cited_evidence'
                                                  ELSE e.v END ORDER BY e.ord),
                                   '[]'::jsonb)
                     FROM jsonb_array_elements(r.analise_ia -> 'dimension_scores')
                          WITH ORDINALITY AS e(v, ord)))
           ELSE r.analise_ia END
   WHERE r.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_red = ROW_COUNT;

  PERFORM set_config('app.motor_exclusao','',true);

  -- ── (6/13) redacoes_candidato_em_progresso — rascunho, coluna NULAVEL ──────
  -- ⚠ `texto_em_progresso` e `text` NULAVEL: recebe NULL, nao sentinela. Carimbar
  --   sentinela onde nao havia texto INVENTARIA um rascunho que nunca existiu — a
  --   licao que o 49-14 escreveu para `revisao_resultado`. E a condicao
  --   `IS NOT NULL` esta no PREDICADO, e nao so no `SET`: e ela que faz
  --   `ROW_COUNT` contar raspagens em vez de visitas.
  UPDATE public.redacoes_candidato_em_progresso p
     SET texto_em_progresso = NULL
   WHERE p.texto_em_progresso IS NOT NULL
     AND p.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_redp = ROW_COUNT;

  -- ── (7/13) respostas_cultura — `resposta_texto` e `text NOT NULL` ──────────
  UPDATE public.respostas_cultura u
     SET resposta_texto = '[removido a pedido do titular — LGPD Art. 18]'
   WHERE u.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_cult = ROW_COUNT;

  -- ── (8/13) respostas_avaliacao — `respostas` e `jsonb NOT NULL` ────────────
  UPDATE public.respostas_avaliacao a
     SET respostas = '{"redigido":"anonimizacao_p49"}'::jsonb
   WHERE a.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_aval = ROW_COUNT;

  -- ── (9/13) cognitivo_respostas — as DUAS colunas sao `jsonb NOT NULL` ──────
  -- ⚠ `proctoring` entra junto: ela guarda o registro de vigilancia da prova
  --   (foco da janela, colagem, tempo por item), que e observacao sobre a PESSOA
  --   durante a avaliacao — nao telemetria de custo.
  UPDATE public.cognitivo_respostas g
     SET raw_responses = '{"redigido":"anonimizacao_p49"}'::jsonb,
         proctoring    = '{"redigido":"anonimizacao_p49"}'::jsonb
   WHERE g.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_cog = ROW_COUNT;

  -- ── (10/13) entrevistas_online — transcricao, feedback, resumo e o link ────
  -- ⚠ As tres primeiras sao NULAVEIS e recebem NULL; `link_videochamada` e
  --   `text NOT NULL` e recebe sentinela. E o link nao e cerimonia: um link de sala
  --   nomeada resolve de volta a quem foi entrevistado, e e por isso que o recibo o
  --   lista como origem. ⚠ `ROW_COUNT` e honesto AQUI sem condicao no predicado
  --   porque `link_videochamada` SEMPRE muda: visitada e raspada sao a mesma linha.
  UPDATE public.entrevistas_online e
     SET transcricao        = NULL,
         feedback_candidato = NULL,
         resumo_ia          = NULL,
         link_videochamada  = '[removido a pedido do titular — LGPD Art. 18]'
   WHERE e.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_eon = ROW_COUNT;

  -- ── (11/13) entrevistas_presenciais — `documentos_apresentados` NULAVEL ────
  UPDATE public.entrevistas_presenciais f
     SET documentos_apresentados = NULL
   WHERE f.documentos_apresentados IS NOT NULL
     AND f.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_epr = ROW_COUNT;

  -- ── (12/13) entrevista_analises.citacoes — a fala LITERAL transcrita ───────
  -- ⚠ Medido: `citacoes` e um array de `{competency, cited_evidence:[{text,...}]}`
  --   com a FALA da pessoa dentro. `competencias` fica: medida, ela tem apenas
  --   `{competency, score}` — nenhum texto — e e a prova de que houve avaliacao.
  UPDATE public.entrevista_analises n
     SET citacoes = NULL
   WHERE n.citacoes IS NOT NULL
     AND n.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_rp_ean = ROW_COUNT;

  -- ── (13/13) scores_candidato — `citacoes` e o `cited_evidence` da SJT ──────
  -- ⚠ A LINHA FICA, SEMPRE: o score e prova de nao-discriminacao (RNF-07a) e o
  --   ERASE-08 o preserva. O que sai e o texto literal dentro dele.
  -- ⚠ `citacoes` e `jsonb` NULAVEL (medido: nulo em todas as 15 linhas vivas hoje —
  --   e por isso um `ROW_COUNT` sem a condicao do predicado diria "raspei 15
  --   citacoes" quando raspou ZERO). `metadata` e `jsonb NOT NULL` e NAO pode
  --   receber sentinela: ela carrega `composite_0_25` e as notas por dimensao, que
  --   ficam. So o `cited_evidence` de dentro de `dimension_scores[]` sai, e so na
  --   SJT — medido: e o unico `tipo` cujo `metadata` tem essa forma (1 linha de 5).
  -- ⚠ O PREDICADO EXIGE QUE HAJA ALGO A FAZER, nas duas metades. Sem isso o
  --   `ROW_COUNT` contaria toda linha de score do titular.
  UPDATE public.scores_candidato s
     SET citacoes = NULL,
         metadata = CASE
           WHEN s.tipo = 'sjt'::public.tipo_score
            AND jsonb_typeof(s.metadata -> 'dimension_scores') = 'array'
           THEN jsonb_set(s.metadata, '{dimension_scores}',
                  (SELECT coalesce(jsonb_agg(CASE WHEN jsonb_typeof(e.v) = 'object'
                                                  THEN e.v - 'cited_evidence'
                                                  ELSE e.v END ORDER BY e.ord),
                                   '[]'::jsonb)
                     FROM jsonb_array_elements(s.metadata -> 'dimension_scores')
                          WITH ORDINALITY AS e(v, ord)))
           ELSE s.metadata END
   WHERE s.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)
     AND ( s.citacoes IS NOT NULL
        OR ( s.tipo = 'sjt'::public.tipo_score
             AND jsonb_typeof(s.metadata -> 'dimension_scores') = 'array'
             AND EXISTS (SELECT 1
                           FROM jsonb_array_elements(s.metadata -> 'dimension_scores') z
                          WHERE jsonb_exists(z, 'cited_evidence')) ) );

  GET DIAGNOSTICS v_n_rp_sc = ROW_COUNT;

  -- ⚠ O texto que o terminador do dry-run carrega. POR TABELA, jamais somado.
  v_rp_txt := format(
    'raven=%s bigfive=%s disc=%s formulario=%s (as 4 APAGADAS, D-62) redacoes=%s '
    || 'redacoes_em_progresso=%s cultura=%s avaliacao=%s cognitivo=%s '
    || 'entrevistas_online=%s entrevistas_presenciais=%s entrevista_analises_citacoes=%s '
    || 'scores_candidato=%s',
    v_n_rp_raven, v_n_rp_bigfive, v_n_rp_disc, v_n_rp_form, v_n_rp_red,
    v_n_rp_redp, v_n_rp_cult, v_n_rp_aval, v_n_rp_cog,
    v_n_rp_eon, v_n_rp_epr, v_n_rp_ean, v_n_rp_sc);

  -- ══ passo_motor: severar_fks_set_null (ERASE-09) ══════════════════════════
  -- Cinco statements EXPLÍCITOS, um por tabela, mais `historico_candidatura.ator`.
  -- A ordem relativa entre eles NÃO é observável de fora (mesma transação) — a
  -- asserção correta é sobre o PÓS-ESTADO das cinco, e um teste que dependesse da
  -- ordem estaria medindo implementação em vez de contrato.

  -- (1/5) ai_call_logs — `candidato_id` é nulável: não há desculpa estrutural.
  -- ⚠ Além do ponteiro, o CONTEÚDO: `raw_response` e `parsed_reasoning` carregam o
  -- texto que a IA leu e escreveu SOBRE A PESSOA (inclusive trechos de currículo).
  -- Um ponteiro severado com o texto intacto é pseudonimização apresentada como
  -- anonimização, que é exatamente o que o Art. 12 §1º não aceita.
  -- ⚠⚠ 49-14 / D-63 · (0/5) AS LINHAS DE COMPARATIVO, E ELAS VEM ANTES DO (1/5).
  --    `comparative_ranking` e a UNICA chamada de IA deste sistema que fala de varias
  --    pessoas na mesma requisicao, e por isso a linha nasce com `candidato_id` NULL:
  --    nao ha UM titular a quem apontar. Consequencia medida: o passo (1/5), que acha
  --    a linha por `candidato_id`, NUNCA a alcancou — e o `user_prompt_template` dela
  --    guarda o bloco literal de cada candidato comparado, com nome e texto.
  -- ⚠ O ENDERECO E O PROPRIO PROMPT. A EF monta cada bloco como
  --   `Candidato C<n> (id=<candidatura_id>)` (comparativo-candidatos/index.ts:382), e e
  --   esse `id=` que liga a linha ao titular. Nao ha coluna: `ai_call_logs` nao tem
  --   `candidatura_id`. Por isso o predicado e `position` sobre o texto, correlacionado
  --   as candidaturas DO TITULAR, e nunca uma busca por nome (que casaria homonimo).
  -- ⚠⚠ A REDACAO E DA LINHA INTEIRA, E ISSO CUSTA A TELEMETRIA DOS OUTROS TITULARES
  --    DAQUELA CHAMADA. A alternativa — cortar so o bloco do titular — foi REJEITADA
  --    por depender do formato do prompt: qualquer mudanca de layout na EF (e o
  --    formato ja mudou uma vez nesta fase) deixaria o corte passando ao lado do texto
  --    e o portao VERDE. O que o RH perde e a entrada da chamada; o que ele NAO perde
  --    e o resultado, que vive em `comparativo_solicitado`.
  -- ⚠ IDEMPOTENTE por construcao: a sentinela nao contem `id=<uuid>`, entao uma segunda
  --   passagem nao acha mais a linha. E `parsed_reasoning` entra junto com
  --   `raw_response` porque e saida DERIVADA dela — o (1/5) abaixo ja as anula juntas.
  UPDATE public.ai_call_logs l
     SET user_prompt_template = '[entrada de comparativo removida a pedido de um dos titulares citados — a linha INTEIRA foi redigida porque o bloco de um titular nao e separavel sem depender do formato do prompt; o resultado do comparativo permanece em comparativo_solicitado]',
         raw_response         = '{"redigido":"anonimizacao_p49_comparativo"}'::jsonb,
         parsed_reasoning     = '[raciocinio de comparativo redigido a pedido de um dos titulares citados — ver a nota do passo severar_fks_set_null]'
   WHERE l.call_type = 'comparative_ranking'
     AND EXISTS (
           SELECT 1 FROM public.candidaturas c
            WHERE c.candidato_id = p_candidato_id
              AND position('id=' || c.id::text IN l.user_prompt_template) > 0);

  GET DIAGNOSTICS v_n_aicall_cmp = ROW_COUNT;

  -- ⚠⚠ 49-14 / D-61 · `user_prompt_template` ENTRA NESTE UPDATE, E A POSICAO IMPORTA:
  --    ele esta no MESMO statement que faz `candidato_id := NULL`, e e o
  --    `candidato_id` que ACHA a linha. Um UPDATE separado DEPOIS deste nao acharia
  --    nada — o ponteiro que servia de endereco acabou de ser cortado.
  -- ⚠ O QUE ESSA COLUNA GUARDA, medido: e o INPUT que foi ao modelo, ja mascarado dos
  --   identificadores diretos, mas com o texto que a pessoa escreveu e, nas chamadas de
  --   entrevista, a fala literal transcrita. `raw_response` e `parsed_reasoning` (a
  --   SAIDA) ja eram tratados desde o 45-07; a ENTRADA nao era, e ela e a metade que
  --   carrega o que a pessoa disse. Severar o ponteiro deixando o input intacto e
  --   pseudonimizacao apresentada como anonimizacao — o que o Art. 12 §1o nao aceita.
  UPDATE public.ai_call_logs l
     SET candidato_id         = NULL,
         parsed_reasoning     = NULL,
         raw_response         = '{"redigido":"anonimizacao_p45"}'::jsonb,
         user_prompt_template = '[conteudo enviado a analise automatica removido a pedido do titular — o texto que a pessoa mandou ao modelo (inclusive trechos do curriculo e fala literal) nao sobrevive a exclusao; a telemetria de custo, latencia e versao do prompt permanece para auditoria]'
   WHERE l.candidato_id = p_candidato_id;

  GET DIAGNOSTICS v_n_aicall = ROW_COUNT;

  -- (2/5) candidate_ai_decisions — achado M2, ver bloco (6) do cabeçalho.
  -- `attnotnull` é lido AO VIVO: enquanto a coluna for `NOT NULL` o ponteiro não é
  -- severável e o conteúdo é desidentificado; se alguém afrouxar a coluna depois,
  -- o MESMO statement passa a severar também. `ai_reasoning_summary` é `NOT NULL`.
  SELECT a.attnotnull INTO v_aidec_fixa
    FROM pg_attribute a
   WHERE a.attrelid = 'public.candidate_ai_decisions'::regclass
     AND a.attname  = 'candidato_id'
     AND NOT a.attisdropped;

  UPDATE public.candidate_ai_decisions x
     SET ai_reasoning_summary = '[sumario de raciocinio desidentificado a pedido do titular]',
         candidato_id         = CASE WHEN coalesce(v_aidec_fixa, true)
                                     THEN x.candidato_id ELSE NULL END
   WHERE x.candidato_id = p_candidato_id;

  GET DIAGNOSTICS v_n_aidec = ROW_COUNT;

  -- (3/5) logs_acesso — `ip_address` é `inet NOT NULL`: TRUNCAR, nunca anular
  -- (NULL abortaria a transação de anonimização inteira). `network(set_masklen(...))`
  -- zera os bits de host de verdade; `set_masklen` sozinho preservaria o endereço
  -- completo e só mudaria a máscara — seria mascaramento de fachada.
  -- `email_tentativa` guarda o endereço digitado e re-identifica sozinho.
  UPDATE public.logs_acesso g
     SET user_id         = NULL,
         email_tentativa = NULL,
         device_info     = NULL,
         ip_address      = network(set_masklen(g.ip_address,
                             CASE WHEN family(g.ip_address) = 4 THEN 24 ELSE 48 END))::inet
   WHERE v_user_id IS NOT NULL AND g.user_id = v_user_id;

  GET DIAGNOSTICS v_n_logs = ROW_COUNT;

  -- (4/5) recruiter_alerts
  UPDATE public.recruiter_alerts r
     SET candidato_id = NULL,
         message      = '[alerta desidentificado a pedido do titular]'
   WHERE r.candidato_id = p_candidato_id;

  GET DIAGNOSTICS v_n_alerts = ROW_COUNT;

  -- (5/5) autorizacoes — ⚠ D8: esta tabela tem DUAS FKs. A que é SET NULL aponta a
  -- `auth.users` (`user_id`); a que aponta a `candidatos` é CASCADE, e o ERASE-09
  -- confunde as duas. O predicado cobre os dois caminhos porque uma linha pode
  -- chegar por qualquer um deles.
  -- `ip_aceite` é a PROVA DE ACEITE: a linha fica, o endereço não.
  UPDATE public.autorizacoes a
     SET user_id           = NULL,
         user_agent_aceite = '[desidentificado]',
         ip_aceite         = network(set_masklen(a.ip_aceite,
                               CASE WHEN family(a.ip_aceite) = 4 THEN 24 ELSE 48 END))::inet
   WHERE a.candidato_id = p_candidato_id
      OR (v_user_id IS NOT NULL AND a.user_id = v_user_id);

  GET DIAGNOSTICS v_n_aut = ROW_COUNT;

  -- `historico_candidatura.ator` — nulável, e é o ponteiro que resta ao titular na
  -- trilha. ⚠ EFEITO COLATERAL REGISTRADO (Pitfall 8, item 1): a linha passa a
  -- PARECER escrita pelo sistema. `auto_rejeitado` é boolean ARMAZENADO, então a
  -- prova RNF-07a sobrevive — mas qualquer leitor que derive "foi o sistema" de
  -- `ator IS NULL` passa a mentir. Fica como dependência declarada da W-1/CONSOL-02
  -- da Phase 47. Isto é `UPDATE`: zero linha removida, contagem inalterada.
  UPDATE public.historico_candidatura h
     SET ator = NULL
   WHERE v_user_id IS NOT NULL AND h.ator = v_user_id;

  GET DIAGNOSTICS v_n_hist = ROW_COUNT;

  -- ⚠⚠ `preferencias_notificacoes.created_by` / `updated_by` — CR-05, plano 45-13.
  -- As duas são FKs `NO ACTION` para `auth.users`, e a SONDA 6 mediu `created_by` como
  -- o bloqueador REAL do `deleteUser` na conta híbrida candidato+RH que existe em PROD.
  -- A `20260805000005` já NOMEAVA esse bloqueador desde o 45-07 — e nunca o transformou
  -- em código. Sem esta severação, o 23503 acontece no passo 3, DEPOIS de o currículo
  -- ter sido apagado do Storage, e (CR-03) esse estado era terminal.
  -- ⚠ `usuario_rh_id` NÃO é tocada: ela não aponta para `auth.users`.
  -- ⚠ As duas são NULÁVEIS no catálogo, conferido pelo bloco de auto-verificação antes
  -- do apply — se fossem `NOT NULL`, este `UPDATE` abortaria a transação inteira depois
  -- do Storage já ter sido apagado, que é o Pitfall 1.
  UPDATE public.preferencias_notificacoes p
     SET created_by = CASE WHEN p.created_by = v_user_id THEN NULL ELSE p.created_by END,
         updated_by = CASE WHEN p.updated_by = v_user_id THEN NULL ELSE p.updated_by END
   WHERE v_user_id IS NOT NULL
     AND (p.created_by = v_user_id OR p.updated_by = v_user_id);

  GET DIAGNOSTICS v_n_pref = ROW_COUNT;

  -- ══ passo_motor: scrub_ledger_email ═══════════════════════════════════════
  -- `destinatario_email` E `destinatario_original` são AMBOS `NOT NULL`: o endereço
  -- é gravado DUAS vezes por linha, e NULL abortaria a transação inteira.
  -- ⚠ `dedupe_key` é UNIQUE e precisa ser RE-NAMESPACEADA. Sem isso, um recadastro
  -- futuro colide, o claim `ON CONFLICT DO NOTHING RETURNING id` volta VAZIO, e o
  -- e-mail legítimo NUNCA É ENVIADO — sem erro em lugar nenhum (Pitfall 8, item 2).
  -- O discriminador é o próprio id da linha, que garante unicidade sem sorteio.
  UPDATE public.notificacoes_enviadas n
     SET destinatario_email    = v_sent_email,
         destinatario_original = v_sent_email,
         ultimo_erro           = NULL,
         dedupe_key            = n.evento || ':' || n.candidatura_id::text
                                 || ':purgado-' || n.id::text
   WHERE n.candidato_id = p_candidato_id;

  GET DIAGNOSTICS v_n_notif = ROW_COUNT;

  -- ══ DRY-RUN — AO FIM DO MESMO CORPO, NUNCA UM SEGUNDO CORPO ═══════════════
  -- Tudo acima já executou de verdade; o `RAISE` reverte a transação inteira. É
  -- essa forma — e não `IF p_dry_run THEN <query A> ELSE <query B>` — que garante
  -- que o que o dry-run mostra é literalmente o que o delete real faz. A forma de
  -- dois corpos é o parente direto do CR-02 da P39, uma guarda que era dead code.
  -- O `ERRCODE` é PRÓPRIO para que o chamador distinga "dry-run concluído" de "erro
  -- real": um erro real disfarçado de sucesso de dry-run seria o pior falso verde
  -- desta fase, e no sentido inverso um P45DR chegando no caminho real passaria por
  -- sucesso quando nada foi apagado.
  -- ⚠ `v_dry_run`, nunca `p_dry_run`: com NULL este `IF` não seria tomado e a transação
  -- COMMITARIA — o terminador do dry-run é a última coisa entre o corpo executado e a
  -- persistência, e ele não pode depender de um booleano de três valores (BL-01).
  IF v_dry_run THEN
    RAISE EXCEPTION 'P45 DRY-RUN concluido: o corpo COMPLETO da anonimizacao executou e esta sendo revertido agora. Nada foi persistido. candidatos=% candidaturas_cv=% decisao_final=% decisao_final_historico=% historico_ator=% ai_call_logs=% candidate_ai_decisions=% logs_acesso=% recruiter_alerts=% autorizacoes=% preferencias_notificacoes=% notificacoes_enviadas=% revisao_resultado_corrente=% revisao_resultado_arquivo=% ai_call_logs_comparativo=% respostas_e_producoes=[%]. Para executar de verdade, chame com p_dry_run := false — o modo seguro e o DEFAULT, e apagar exige dize-lo',
      v_n_cand, v_n_cvurl, v_n_df, v_n_dfh, v_n_hist, v_n_aicall, v_n_aidec, v_n_logs,
      v_n_alerts, v_n_aut, v_n_pref, v_n_notif,
      v_n_df_rev, v_n_dfh_rev, v_n_aicall_cmp, v_rp_txt
      USING ERRCODE = 'P45DR';
  END IF;

  RETURN jsonb_build_object(
    'resultado',    'anonimizado',
    'candidato_id', p_candidato_id,
    'dry_run',      false,
    'executado_em', now(),
    'plano',        v_plano,
    -- ⚠ WR-06: `false` aqui significa que as severações guardadas por `user_id` NÃO
    -- aconteceram. Sem este campo, a contagem zero delas seria lida como «não havia».
    'severacao_por_user_id', (v_user_id IS NOT NULL),
    -- ⚠⚠ A TRILHA DE QUEM DESTRUIU PII (45-13). Ela existe aqui porque esta função
    -- NÃO escreve em `logs_auditoria` — e a razão está no bloco (7) do cabeçalho: os
    -- dois enums daquela tabela nunca foram medidos, e um valor inventado abortaria a
    -- anonimização no pedido real, DEPOIS de o currículo já ter sido apagado.
    -- A Edge Function persiste este bloco no `plano`, que sobrevive ao fecho.
    -- ⚠ O `uid` entra APENAS quando o executor NÃO é o titular: o uid do titular é o
    -- identificador que esta exclusão existe para apagar, e gravá-lo no registro que
    -- PROVA a exclusão seria o mesmo defeito do CR-04 com outra cara. O uid de um
    -- operador é identidade de equipe, e é exatamente o que uma trilha precisa guardar.
    'executor', jsonb_build_object(
      'papel',         coalesce(v_role, '[sem papel na claim]'),
      'foi_o_titular', v_eh_titular
    ) || CASE WHEN v_eh_titular THEN '{}'::jsonb
              ELSE jsonb_build_object('uid', v_uid) END,
    'passos', jsonb_build_object(
      -- ⚠ `candidaturas_curriculo` conta LINHAS ATUALIZADAS, nunca linhas removidas: as
      -- linhas de `candidaturas` são preservadas por desenho (ERASE-08) e o que morre
      -- são as duas colunas que resolvem de volta até a pessoa (CR-04).
      'tombstone_candidato',     jsonb_build_object('candidatos', v_n_cand,
                                                    'candidaturas_curriculo', v_n_cvurl),
      'tombstone_decisao_final', jsonb_build_object('decisao_final', v_n_df,
                                                    'decisao_final_historico', v_n_dfh,
                                                    -- 49-14 / D-60: as duas contagens novas entram nas chaves
                                                    -- EXISTENTES, e nao num passo novo. O passo e o mesmo — o que
                                                    -- cresceu foi o que ele apaga dentro da mesma escrita.
                                                    'revisao_resultado_corrente', v_n_df_rev,
                                                    'revisao_resultado_arquivo',   v_n_dfh_rev),
      'severar_user_id',         jsonb_build_object('candidatos', v_n_cand,
                                                    'candidaturas_autoria', v_n_cvurl,
                                                    'historico_candidatura_ator', v_n_hist),
      -- ⚠⚠ 49-20 / D-48 · A CHAVE DO PASSO NOVO, com as treze contagens POR TABELA.
      --    E o PRIMEIRO passo deste motor cujas quatro primeiras contagens sao de
      --    LINHAS QUE DEIXARAM DE EXISTIR (D-62) — e nao de linhas atualizadas. Elas
      --    vao nomeadas e separadas de proposito: somadas, um ZERO em qualquer das
      --    treze ficaria invisivel, e "zero redacoes" e um fato diferente de "zero
      --    respostas de Raven". ⚠ `PASSOS_MOTOR` (`_shared/reciboExclusao.ts:23-31`)
      --    e o recibo passam a apontar este passo no plano 49-21, que vem ANTES de
      --    qualquer execucao real (49-19).
      'apagar_respostas_e_producoes', jsonb_build_object(
                                                    'respostas_raven', v_n_rp_raven,
                                                    'respostas_bigfive', v_n_rp_bigfive,
                                                    'respostas_disc', v_n_rp_disc,
                                                    'respostas_formulario', v_n_rp_form,
                                                    'linhas_apagadas_d62', v_n_rp_raven + v_n_rp_bigfive + v_n_rp_disc + v_n_rp_form,
                                                    'redacoes_candidato', v_n_rp_red,
                                                    'redacoes_candidato_em_progresso', v_n_rp_redp,
                                                    'respostas_cultura', v_n_rp_cult,
                                                    'respostas_avaliacao', v_n_rp_aval,
                                                    'cognitivo_respostas', v_n_rp_cog,
                                                    'entrevistas_online', v_n_rp_eon,
                                                    'entrevistas_presenciais', v_n_rp_epr,
                                                    'entrevista_analises_citacoes', v_n_rp_ean,
                                                    'scores_candidato', v_n_rp_sc,
                                                    'nota', 'devolutivas_candidato NAO entra neste passo: a linha morre por FK CASCADE para auth.users no passo auth_delete_user. A frase do recibo sobre a devolutiva ja era verdade — por FK, nao pelo motor. E os quatro primeiros numeros sao LINHAS APAGADAS (D-62, a excecao explicita do operador para as tabelas de multipla escolha, cujos CHECKs nao aceitam sentinela); os scores calculados a partir delas (scores_raven, scores_candidato) FICAM'),
      'severar_fks_set_null',    jsonb_build_object('ai_call_logs', v_n_aicall,
                                                    -- 49-14 / D-63: as linhas de comparativo sao contadas SEPARADAS
                                                    -- das de `candidato_id`, porque sao achadas por outro predicado
                                                    -- e um numero somado esconderia um zero em qualquer das metades.
                                                    'ai_call_logs_comparativo', v_n_aicall_cmp,
                                                    'candidate_ai_decisions', v_n_aidec,
                                                    'logs_acesso', v_n_logs,
                                                    'recruiter_alerts', v_n_alerts,
                                                    'autorizacoes', v_n_aut,
                                                    'preferencias_notificacoes', v_n_pref),
      'scrub_ledger_email',      jsonb_build_object('notificacoes_enviadas', v_n_notif)
    )
  );
END;
$anonimizar_candidato$;


-- ACL reemitido identico ao vivo. Ver §5 do cabecalho: `CREATE OR REPLACE` nao
-- repoe grants, mas o `pg_default_acl` deste schema concede EXECUTE a `anon` como
-- grant DIRETO E NOMEADO em todo `CREATE FUNCTION`, e `REVOKE ... FROM PUBLIC`
-- sozinho removeria um grant que nunca existiu. `authenticated` e reconcedido
-- porque o titular chega por ele (o PostgREST deriva o papel do MESMO JWT).
REVOKE ALL ON FUNCTION public.anonimizar_candidato(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3 · `public.plano_exclusao_titular(uuid)` — corpo INTEIRO do arquivo
--     20260922000012, com a chave nova `apagar_respostas_e_producoes` e as
--     treze contagens pela MESMA expressao do motor, condicoes `IS NOT NULL` e
--     predicado da SJT inclusos. O dry-run e o delete real TEM de sair da mesma
--     expressao (regra (ii) do C3) — e neste plano ele e tambem o unico lugar
--     onde o numero de linhas que VAO ser apagadas pode ser lido antes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plano_exclusao_titular(p_candidato_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $plano_exclusao_titular$
DECLARE
  v_uid     uuid := auth.uid();
  v_role    text := (select auth.jwt() #>> '{app_metadata,role}');
  v_user_id uuid;
  v_existe  boolean;
  v_anon    boolean;
  v_email   text;
  v_nasc    date;
  -- ── CR-05 (plano 45-13): a enumeração dos bloqueadores do hard delete ──────
  v_bloq    jsonb := '[]'::jsonb;
  v_tem     boolean;
  r_fk      record;
  v_chave   text;
  v_escopo  text;
  v_sql     text;
  /**
   * ⚠⚠ O CONTRATO ENTRE AS DUAS FUNÇÕES DO MOTOR, E ELE VIVE AQUI, EM UM LUGAR SÓ.
   *
   * Esta é a lista das `(schema.tabela.coluna)` que `anonimizar_candidato` severa
   * dentro da transação do tombstone **PARA O `user_id` INTEIRO**, sem escopo de
   * candidato. Ela é subtraída da enumeração abaixo — sem isso, a chave de bloqueadores
   * viria não-vazia para todo titular e o motor recusaria TODA execução legítima.
   *
   * ⚠⚠ E O QUALIFICADOR «PARA O `user_id` INTEIRO» É O DEFEITO QUE O 45-14 FECHOU
   * (BL-02 do `45-REVIEW-2.md`). Até o 45-13, quatro pares de AUTORIA moravam nesta
   * lista — `candidatos.created_by/updated_by` e `candidaturas.created_by/updated_by` —
   * mas o tombstone os severa **APENAS nas linhas DESTE candidato**
   * (`20260805000006`: `WHERE c.id = p_candidato_id` e `WHERE c.candidato_id =
   * p_candidato_id`). Uma linha de OUTRO candidato cuja autoria fosse deste `user_id`
   * não era severada **e não era enumerada**: `bloqueadores_deleteuser` voltava `[]` com
   * um bloqueador REAL de pé, a Edge Function não recusava, o passo 1 destruía o
   * currículo, e o `deleteUser` do passo 3 falhava com 23503 — de forma REPETÍVEL, com o
   * e-mail do titular vivo em `auth.users` para sempre e o recibo nunca enviado. O
   * gatilho medido é a conta híbrida candidato+RH que a SONDA 6 encontrou em PROD, que é
   * a razão de existir do CR-05. As quatro passaram a ser enumeradas com o MESMO ESCOPO
   * da severação — ver `v_esc_candidatos` / `v_esc_candidaturas` e o laço.
   *
   * ⚠ A ASSIMETRIA É O QUE FECHA O RESÍDUO INDEFINIDAMENTE, e é deliberada:
   *   · quem acrescentar uma severação em `anonimizar_candidato` acrescenta aqui — e,
   *     se ela for ESCOPADA a uma linha, acrescenta no laço e nunca nesta lista;
   *   · quem acrescentar uma FK NOVA ao schema **não precisa fazer nada** — ela aparece
   *     sozinha como bloqueador, e o motor recusa ANTES do passo 1. O custo de esquecer
   *     é uma recusa barata, nunca um currículo destruído com o 23503 no passo 3.
   *
   * ⚠ `public.decisao_final.por_usuario` **NÃO ENTRA AQUI, E A OMISSÃO É A DECISÃO.**
   * Ela é `NOT NULL` e aponta para o RECRUTADOR que decidiu; severá-la destruiria a
   * prova de que houve avaliação humana (RNF-07a / LGPD Art. 7º, VI). Numa conta
   * híbrida candidato+RH ela é um bloqueador LEGÍTIMO, e o desfecho certo é a recusa
   * antes da primeira mutação — com o nome da tabela e da coluna no plano, para que
   * quem for resolver saiba o que está olhando. Quem vier "consertar" isto severando a
   * coluna está trocando um pedido que para por uma prova que não volta.
   */
  v_severadas text[] := ARRAY[
    'public.candidatos.user_id',
    'public.historico_candidatura.ator',
    'public.logs_acesso.user_id',
    'public.autorizacoes.user_id',
    'public.preferencias_notificacoes.created_by',
    'public.preferencias_notificacoes.updated_by'
  ];
  /**
   * Os pares que o tombstone severa **ESCOPADOS A UMA LINHA**, e por isso eles NÃO são
   * subtraídos: são enumerados com o MESMO recorte que a severação tem, de forma que o
   * probe pergunte exatamente o que continua de pé DEPOIS do tombstone. São dois arrays
   * e não um porque a coluna de recorte é diferente em cada tabela.
   *
   * ⚠ A saída alternativa — alargar a severação para o `user_id` inteiro — foi RECUSADA:
   * ela faria linhas de OUTRAS pessoas perderem o registro de autoria por causa do
   * pedido de exclusão de um terceiro. Aqui a resposta certa é a RECUSA barata antes do
   * passo 1, com o nome da tabela e da coluna no plano, exatamente como para
   * `decisao_final.por_usuario`.
   */
  v_esc_candidatos   text[] := ARRAY[
    'public.candidatos.created_by',
    'public.candidatos.updated_by'
  ];
  v_esc_candidaturas text[] := ARRAY[
    'public.candidaturas.created_by',
    'public.candidaturas.updated_by'
  ];

  -- ⚠⚠ 46-04 · O TERCEIRO RAMO (Blocker B-02 / Saida A, operador 2026-08-22).
  --     Nasce FALSO, e o default e load-bearing: qualquer caminho que deixasse de
  --     calcula-lo RECUSA, em vez de autorizar.
  --     ⚠ E **UM** BOOLEANO, E NAO DOIS, E A RAZAO ESTA NA SECAO (3) DO CABECALHO:
  --     esta funcao e `STABLE` e nao tem caminho destrutivo, entao um segundo ramo
  --     restrito a `live` seria um SUBCONJUNTO ESTRITO deste e nunca poderia ser a
  --     razao de a funcao autorizar. Codigo morto dentro de um guard e o P39/CR-02
  --     literal. A restricao ativa por modo vive onde ela tem efeito: na secao
  --     (p.2) de `20260823000006`, no caminho que de fato destroi.
  v_por_purga boolean := false;
BEGIN
  -- ══ 46-04 · (p) O TERCEIRO RAMO, CALCULADO ANTES DO GUARD ═════════════════
  -- ⚠ POR QUE ELE EXISTE. `anonimizar_candidato` CHAMA esta funcao no PASSO 0
  --   (`20260805000006:456`), e o 4o ramo daquele guard sozinho nao basta: sem
  --   este, a chamada do cron e autorizada la e morre 42501 AQUI, tres linhas
  --   depois. `SECURITY DEFINER` nao ajuda — ele troca o papel do BANCO, e estes
  --   dois guards decidem sobre a CLAIM do JWT.
  --
  -- ⚠ O ALVO IMPORTA TANTO QUANTO O MODO, e por isso a condicao de
  --   `i.candidato_id = p_candidato_id` nao e opcional: sem ela, estar em uma
  --   execucao de purga autorizaria LER O PLANO DE QUALQUER PESSOA. Esta funcao
  --   devolve contagens de PII por titular, e o ACL abaixo existe justamente
  --   porque contagens enumeraveis sao superficie de exfiltracao. O ramo autoriza
  --   ler o plano de quem a purga ESTA processando agora, e de mais ninguem.
  --
  -- ⚠ ESCOPO DUPLO (`dry_run` OU `live`), pela mesma razao de D-46-24 um nivel
  --   abaixo: o laco de dry-run chama `anonimizar_candidato(id, true)`, que chama
  --   ESTA funcao. Exigir `live` aqui mataria o dry-run durante os 14 dias
  --   inteiros da janela, e a fase voltaria a provar ZERO sobre o caminho do
  --   delete. `off` nao autoriza — e o kill switch de D-46-06, e o smoke assere.
  --
  -- ⚠ FALHA FECHADA POR CONSTRUCAO, e e por isso que nao ha clausula `IS NOT NULL`
  --   extra: com qualquer lado nulo a comparacao avalia NULL, a linha NAO e
  --   selecionada, o `EXISTS` e FALSE e a funcao RECUSA. `EXISTS` correlacionado,
  --   jamais negacao por pertencimento a conjunto de valores — aquela forma avalia
  --   NULL e falha ABERTO (INVENT-05 / `20260730000005`).
  -- ⚠⚠ `v_uid IS NULL` E A PRIMEIRA CONJUNCAO — CONSERTO DO BL-02. Sem ela o ramo
  --   era propriedade apenas do alvo e do cerco, e nao mencionava o chamador:
  --   qualquer usuario logado que alcancasse a funcao pelo `GRANT` a
  --   `authenticated` leria as contagens de PII de um titular so por ele estar
  --   sendo processado pela purga.
  -- ⚠⚠ ESCOPO HONESTO (RD2-07): `v_uid IS NULL` nao seleciona "o cron" — seleciona
  --   TODO chamador sem sessao de usuario, o que na pratica e `service_role` (o
  --   cron, a EF `purgar-retencao`, um script, o MCP). Isso NAO e escalacao:
  --   `service_role` bypassa RLS, ja tem DML irrestrito sobre tudo o que o motor
  --   toca, e pode ate FABRICAR o item que autoriza. O ramo nao lhe da capacidade
  --   nova; muda so a porta. O que ele NAO faz e autorizar papel de CLIENTE sem
  --   sessao — `authenticated` sempre traz `sub`, e `anon` esta revogado.
  -- ⚠⚠ `e.iniciada_em > now() - interval '1 hour'` — CONSERTO DO HI-03: a
  --   autorizacao EXPIRA. Uma Edge Function que morre deixaria item aberto e
  --   execucao `executando` indefinidamente, e sem este limite a leitura ficaria
  --   autorizada para sempre.
  SELECT (v_uid IS NULL) AND EXISTS (
    SELECT 1
      FROM public.purga_execucao_itens i
      JOIN public.purga_execucoes e ON e.id = i.execucao_id
      CROSS JOIN public.config_purga cp
     WHERE i.candidato_id  = p_candidato_id
       AND i.concluido_em IS NULL
       AND e.situacao      = 'executando'
       AND e.iniciada_em   > pg_catalog.now() - interval '1 hour'
       AND (e.modo_vigente = 'dry_run' OR e.modo_vigente = 'live')
       AND (cp.modo        = 'dry_run' OR cp.modo        = 'live')
  ) INTO v_por_purga;

  -- ── GUARD, TRÊS METADES desde o 46-04: (a) sessão · (b) papel · (p) PURGA ──
  -- (a) chamador SEM claim nenhuma é recusado EXPLICITAMENTE. Toda função DEFINER
  --     nova neste projeto NASCE executável por `anon` (o `pg_default_acl` de
  --     `public` concede EXECUTE como grant DIRETO E NOMEADO), e o `REVOKE` abaixo
  --     é a outra metade — mas um guard que dependesse só do ACL seria um controle
  --     confiado a uma configuração de schema que ninguém relê.
  --
  -- ⚠⚠ 46-04 · A MENSAGEM DESTA METADE NAO MUDA — NEM UMA LETRA — E ISSO E
  --     ASSERCAO. O que muda e a CONDICAO, que ganha UMA alternativa cumulativa.
  --     A saida RECUSADA continua recusada e nao aparece neste arquivo: aceitar
  --     `auth.uid() IS NULL` porque o PAPEL DO BANCO e `service_role` seria uma
  --     CREDENCIAL, e credencial e portavel. O que esta escrito aqui e um ESTADO —
  --     existir, AGORA, item vivo de purga para ESTE titular — e estado ninguem
  --     carrega no bolso (`DI-45-07-01` + decisao do operador de 2026-08-05).
  IF v_uid IS NULL AND NOT v_por_purga THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao le o plano de exclusao de ninguem'
      USING ERRCODE = '42501';
  END IF;

  -- A LEITURA VEM ANTES DA METADE (b) porque a metade (b) precisa do DONO. Ela é a
  -- mesma leitura de sempre — não há uma segunda consulta — apenas movida para cima.
  SELECT true, c.user_id, c.email, c.data_nascimento
    INTO v_existe, v_user_id, v_email, v_nasc
    FROM public.candidatos c
   WHERE c.id = p_candidato_id;

  -- ⚠ CR-06 (plano 45-13), o MESMO predicado do tombstone e pelo mesmo motivo: o
  -- reconhecimento é IGUALDADE com a sentinela derivada do id desta linha, mais o cinto
  -- de `user_id` severado e `data_nascimento` na sentinela de 1900 — nunca um padrão
  -- sobre `email`, que é escrita pelo usuário no cadastro. Aqui a chave é informativa
  -- (`ja_anonimizado`), mas ela é EXATAMENTE a que o 45-11 lê antes do dry-run para
  -- saber qual das duas terminações esperar (WR-05): um `true` falso faria o gate medir
  -- um retorno normal e registrar evidência ambígua.
  v_anon := (v_email = 'anonimizado+' || p_candidato_id::text || '@invalido.local'
             AND v_user_id IS NULL
             AND v_nasc = DATE '1900-01-01');

  -- (b) TRÊS comparações, todas por `IS DISTINCT FROM` e NUNCA por `NOT IN`: com um
  --     dos lados NULL o `NOT IN` avalia NULL, o `IF` NÃO é tomado, e o guard FALHA
  --     ABERTO exatamente para o chamador mais suspeito, que é `anon` (defeito REAL
  --     medido na 42-06). A forma NULL-safe falha FECHADA por construção, não por
  --     lembrança — e com `p_candidato_id` inexistente ou já severado o dono resolve
  --     NULL, `NULL IS DISTINCT FROM <uid>` é TRUE, e a função recusa.
  --
  -- ⚠ O TITULAR ENTRA AQUI, E A RAZÃO É DATÁVEL. O plano 45-07 desenhou esta função
  --     como função de OPERADOR (`rh`/`administrador`, `GRANT` só a `service_role`);
  --     o 45-10 — escrito depois — a cabeou dentro do caminho de execução **do
  --     próprio titular**, que é quem clica em "apagar meus dados" e cujo papel de
  --     aplicação é `candidato`. As duas metades estavam certas isoladamente; a junta
  --     não estava, e o desfecho era `42501` na metade (b) mesmo com as claims
  --     chegando. O conserto é ESTENDER o guard para reconhecer o chamador que o
  --     desenho de fato tem — nunca afrouxar a metade (a), que continua recusando
  --     quem não tem sessão (`DI-45-07-01`, saída recusada; decisão do operador de
  --     2026-08-05).
  --
  -- ⚠⚠ 46-04 · A ALTERNATIVA ENTRA AQUI TAMBEM, E NAO SO NA METADE (a) — FOI
  --     MEDIDO. Para um titular REAL sob o cron, `v_user_id` e um uuid e `v_uid` e
  --     NULL, entao `v_user_id IS DISTINCT FROM v_uid` e TRUE e esta metade
  --     recusaria MESMO com a (a) ja resolvida. Emendar so a (a) deixaria o
  --     Blocker B-02 de pe com outra cara — e mudanca de sintoma sem mudanca de
  --     causa e o modo de falha mais caro de diagnosticar as tres da manha.
  --     ⚠ A alternativa e CUMULATIVA, nunca substitutiva: `rh`, `administrador` e
  --     o proprio titular continuam passando exatamente pelo caminho de sempre.
  IF v_role IS DISTINCT FROM 'rh'
     AND v_role IS DISTINCT FROM 'administrador'
     AND v_user_id IS DISTINCT FROM v_uid
     AND NOT v_por_purga THEN
    RAISE EXCEPTION 'FORBIDDEN: o plano de exclusao so pode ser lido por rh, por administrador, pelo proprio titular daquele candidato, ou pelo MOTOR DA PURGA de retencao. O caminho da purga (Blocker B-02 / Saida A) exige as QUATRO condicoes cumulativas: (1) existir item em purga_execucao_itens para ESTE candidato, (2) com concluido_em ainda nulo, (3) sob execucao em purga_execucoes com situacao = executando e modo_vigente em dry_run ou live, e (4) com config_purga.modo em dry_run ou live. Nenhuma credencial autoriza este caminho — apenas o estado que so o motor da purga produz, e ele autoriza ler o plano de quem a purga esta processando, de mais ninguem'
      USING ERRCODE = '42501';
  END IF;

  -- Titular inexistente NÃO é erro: é um plano legítimo cujas contagens são todas
  -- zero. Levantar aqui obrigaria o chamador a distinguir "não achei" de "falhou",
  -- e a Edge Function do 45-10 precisa exatamente do oposto — de um plano que ela
  -- possa mostrar ao operador sem ramificar.
  v_existe := coalesce(v_existe, false);

  -- ══ CR-05 · OS BLOQUEADORES DO HARD DELETE, ENUMERADOS DO CATÁLOGO ═════════
  -- Até o 45-12, este arquivo AFIRMAVA em dois lugares — no jsonb devolvido ao chamador
  -- e no `COMMENT` que vai para o catálogo vivo — que o motor tratava a violação de FK
  -- por classe. Uma varredura do repositório inteiro não encontrava leitura de SQLSTATE
  -- de violação de FK em migration alguma nem na Edge Function: era uma garantia que
  -- era dead code, vivendo num texto que a próxima pessoa lê como fato medido (o padrão
  -- P39/CR-02 repetido). Agora o plano ENUMERA em vez de afirmar.
  --
  -- ⚠ O QUE ISSO COMPRA, em uma linha: uma verificação ANTES da primeira mutação
  -- transforma o 23503 de «desfecho esperado» em «recusa barata». É a única forma de
  -- ele não custar um currículo — sem PITR e com o Storage fora de todo backup, um
  -- 23503 no passo 3 deixa o CV destruído e a pessoa não apagada, sem retomada.
  --
  -- ⚠ SEGURANÇA DO SQL DINÂMICO: o `user_id` vai por PARÂMETRO (`USING`), nunca
  -- interpolado no texto do comando; os identificadores vão por `%I`, nunca por
  -- concatenação crua. Esta função é `SECURITY DEFINER` — aqui isso não é estilo.
  -- ⚠ E ela continua `STABLE`: `EXECUTE` de um `SELECT` não escreve nada.
  IF v_user_id IS NOT NULL THEN
    FOR r_fk IN
      SELECT n.nspname AS esquema, cl.relname AS tabela, a.attname AS coluna
        FROM pg_constraint c
        JOIN pg_class cl     ON cl.oid = c.conrelid
        JOIN pg_namespace n  ON n.oid  = cl.relnamespace
        JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
        JOIN pg_attribute a  ON a.attrelid = c.conrelid AND a.attnum = k.attnum
       WHERE c.contype     = 'f'
         AND c.confrelid   = 'auth.users'::regclass
         -- 'a' = NO ACTION, 'r' = RESTRICT: as duas BLOQUEIAM o delete. 'c'/'n'/'d'
         -- (CASCADE / SET NULL / SET DEFAULT) resolvem sozinhas e não são bloqueio.
         AND c.confdeltype IN ('a', 'r')
         AND array_length(c.conkey, 1) = 1
         AND cl.relkind IN ('r', 'p')
         AND NOT a.attisdropped
         AND (n.nspname || '.' || cl.relname || '.' || a.attname) <> ALL (v_severadas)
       ORDER BY n.nspname, cl.relname, a.attname
    LOOP
      -- ⚠⚠ O ESCOPO DO PROBE TEM DE SER O ESCOPO DA SEVERAÇÃO (BL-02). Para os quatro
      -- pares de autoria, o tombstone só severa as linhas DESTE candidato — então a
      -- pergunta certa é «sobra alguma linha de OUTRO candidato apontando a este
      -- `user_id`?». Perguntar sem recorte devolveria bloqueador para uma linha que o
      -- tombstone vai severar (sempre-vermelho); subtrair o par inteiro devolveria `[]`
      -- com um bloqueador de pé (o falso-negativo que custa o currículo).
      v_chave  := r_fk.esquema || '.' || r_fk.tabela || '.' || r_fk.coluna;
      v_escopo := CASE
                    WHEN v_chave = ANY (v_esc_candidatos)   THEN ' AND t.id IS DISTINCT FROM $2'
                    WHEN v_chave = ANY (v_esc_candidaturas) THEN ' AND t.candidato_id IS DISTINCT FROM $2'
                    ELSE ''
                  END;

      -- ⚠ `IS DISTINCT FROM` e nunca `<>`, pelo motivo de sempre: com `$2` NULO, `<>`
      -- avaliaria NULL, nenhuma linha entraria e o bloqueador sumiria — falha ABERTA.
      -- Com `IS DISTINCT FROM`, `$2` nulo faz TODAS as linhas contarem: falha FECHADA.
      -- ⚠ Pelo mesmo raciocínio, um `v_chave` NULO cai no `ELSE` e o probe vai SEM
      -- recorte, enumerando de MAIS. Os dois desvios apontam para a recusa.
      -- ⚠ O `%s` recebe APENAS um dos três literais escritos acima — nunca um valor do
      -- catálogo, nunca entrada de chamador. Os identificadores continuam por `%I` e o
      -- valor continua por `USING`; isto é `SECURITY DEFINER`, e aqui isso não é estilo.
      v_sql := format('SELECT EXISTS (SELECT 1 FROM %I.%I t WHERE t.%I = $1%s)',
                      r_fk.esquema, r_fk.tabela, r_fk.coluna, v_escopo);

      IF v_escopo = '' THEN
        EXECUTE v_sql INTO v_tem USING v_user_id;
      ELSE
        EXECUTE v_sql INTO v_tem USING v_user_id, p_candidato_id;
      END IF;

      IF v_tem THEN
        v_bloq := v_bloq || jsonb_build_object(
          'tabela', r_fk.esquema || '.' || r_fk.tabela,
          'coluna', r_fk.coluna
        );
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'candidato_id',      p_candidato_id,
    'candidato_existe',  v_existe,
    'ja_anonimizado',    coalesce(v_anon, false),
    'user_id_presente',  (v_user_id IS NOT NULL),
    'gerado_em',         now(),

    -- ── storage_remove — FORA DO BANCO, e dito com todas as letras ───────────
    'storage_remove', jsonb_build_object(
      'fonte',     'fora_do_banco',
      'objetos',   NULL,
      'motivo',    'storage.objects NAO tem FK para auth.users (SONDA 2): nao ha caminho relacional do titular ate os objetos dele. A enumeracao e storage.list(prefixo) paginado, na Edge Function do 45-10. Um zero aqui seria lido como "nao ha curriculo a apagar" e o recibo prometeria o apagamento que ninguem executou'
    ),

    -- ── tombstone_candidato ─────────────────────────────────────────────────
    'tombstone_candidato', jsonb_build_object(
      'candidatos',            (CASE WHEN v_existe THEN 1 ELSE 0 END),
      'candidaturas_vinculadas',
        (SELECT count(*) FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id),
      'devolutivas_candidato',
        (SELECT count(*) FROM public.devolutivas_candidato d WHERE d.candidato_id = v_user_id),
      'disponibilidade',
        (SELECT count(*) FROM public.disponibilidade x WHERE x.candidato_id = p_candidato_id),
      'solicitacoes_dados',
        (SELECT count(*) FROM public.solicitacoes_dados s WHERE s.candidato_id = p_candidato_id)
    ),

    -- ── tombstone_decisao_final ─────────────────────────────────────────────
    -- ⚠ As duas colunas são PRESERVADAS ANONIMIZADAS (D-45-02 / D-45-03), nunca
    -- apagadas: o texto sobrevive como prova de não-discriminação (Art. 7º, VI /
    -- RNF-07a) e o vínculo com o titular é o que morre.
    'tombstone_decisao_final', jsonb_build_object(
      'decisao_final',
        (SELECT count(*) FROM public.decisao_final d
          JOIN public.candidaturas c ON c.id = d.candidatura_id
         WHERE c.candidato_id = p_candidato_id),
      'decisao_final_historico',
        (SELECT count(*) FROM public.decisao_final_historico h
          JOIN public.candidaturas c ON c.id = h.candidatura_id
         WHERE c.candidato_id = p_candidato_id),
      -- ⚠⚠ 49-14 / D-60 · A MESMA EXPRESSAO DO MOTOR, e e isso que torna o dry-run
      --    uma previsao e nao uma decoracao (regra (ii) do C3 do smoke). O motor mede
      --    `revisao_resultado IS NOT NULL` escopado as candidaturas do titular; aqui e
      --    a mesma condicao, na mesma juncao. Se as duas divergirem, o recibo promete um
      --    numero e a exclusao entrega outro — e o P39/CR-02 (uma guarda que era dead
      --    code) e o precedente nomeado de por que isso importa.
      -- ⚠ O numero do ARQUIVO e o do estado de AGORA. Durante o passo, o UPDATE da linha
      --   corrente dispara o snapshot e o arquivo GANHA linha, entao a contagem do motor
      --   pode ser maior — a mesma assimetria que `decisao_final_historico` acima ja
      --   tem. Declarada aqui em vez de escondida numa igualdade que nao se sustenta.
      'revisao_resultado_corrente',
        (SELECT count(*) FROM public.decisao_final d
          JOIN public.candidaturas c ON c.id = d.candidatura_id
         WHERE c.candidato_id = p_candidato_id AND d.revisao_resultado IS NOT NULL),
      'revisao_resultado_arquivo',
        (SELECT count(*) FROM public.decisao_final_historico h
          JOIN public.candidaturas c ON c.id = h.candidatura_id
         WHERE c.candidato_id = p_candidato_id AND h.revisao_resultado IS NOT NULL),
      'nota', 'preservar anonimizada (D-45-02/D-45-03): UPDATE in-place. Zero linha apagada, zero valor nulo — as duas colunas de justificativa sao NOT NULL'
    ),

    -- ── severar_user_id ─────────────────────────────────────────────────────
    -- ⚠ A SONDA 6 (§6a) REFUTOU a lista fixa de "sete colunas a severar": as vinte
    -- FKs NO ACTION para auth.users medem ZERO linha para os 21 titulares puros,
    -- porque quem move etapa e quem decide é o RH. O bloqueio real do deleteUser é
    -- TRANSITIVO (§6b) e a S1 o resolve mantendo `candidatos` fora do cascade. As
    -- contagens abaixo são por CONTA, medidas na hora — nunca uma lista fixa.
    'severar_user_id', jsonb_build_object(
      'candidatos_user_id',    (CASE WHEN v_user_id IS NOT NULL THEN 1 ELSE 0 END),
      'candidatos_created_by',
        (SELECT count(*) FROM public.candidatos c
          WHERE c.id = p_candidato_id AND v_user_id IS NOT NULL AND c.created_by = v_user_id),
      'candidatos_updated_by',
        (SELECT count(*) FROM public.candidatos c
          WHERE c.id = p_candidato_id AND v_user_id IS NOT NULL AND c.updated_by = v_user_id),
      'historico_candidatura_ator',
        (SELECT count(*) FROM public.historico_candidatura h
          WHERE v_user_id IS NOT NULL AND h.ator = v_user_id),
      'candidaturas_autoria',
        (SELECT count(*) FROM public.candidaturas c
          WHERE c.candidato_id = p_candidato_id AND v_user_id IS NOT NULL
            AND (c.created_by = v_user_id OR c.updated_by = v_user_id)),
      'preferencias_notificacoes',
        (SELECT count(*) FROM public.preferencias_notificacoes p
          WHERE v_user_id IS NOT NULL
            AND (p.created_by = v_user_id OR p.updated_by = v_user_id)),
      'nota', 'as contagens sao por CONTA, medidas na hora. Os bloqueadores do deleteUser nao sao afirmados aqui: eles sao ENUMERADOS do catalogo na chave bloqueadores_deleteuser, e quem recusa antes do passo 1 e a Edge Function. As duas contas reais da SONDA 6 deram bloqueadores DIFERENTES (historico_candidatura.candidatura_id no titular puro, alcancado transitivamente; preferencias_notificacoes.created_by na conta hibrida candidato+RH) — e o segundo passou a ser severado na mesma transacao do tombstone'
    ),

    -- ── bloqueadores_deleteuser (CR-05) ─────────────────────────────────────
    -- ⚠ ENUMERADO DO CATALOGO, NUNCA AFIRMADO. Lista das FKs para `auth.users` cujo
    -- `ON DELETE` BLOQUEIA (`NO ACTION`/`RESTRICT`) e que TEM linha viva apontando para
    -- este titular, MENOS as `(tabela, coluna)` que o tombstone severa para o `user_id`
    -- INTEIRO (a lista `v_severadas`, declarada nominalmente no corpo). Os quatro pares
    -- de AUTORIA, que o tombstone severa apenas nas linhas DESTE candidato, não são
    -- subtraídos: são enumerados com o MESMO escopo da severação (BL-02, plano 45-14) —
    -- subtraí-los inteiros devolvia `[]` com um bloqueador de pé, e o 23503 voltava a
    -- acontecer DEPOIS do passo 1.
    -- ⚠ VAZIA É O ESTADO ESPERADO de um titular puro. Não-vazia significa que o
    -- `deleteUser` do passo 3 falharia com 23503 — e a Edge Function recusa ANTES do
    -- passo 1, quando isso ainda não custou nada. `decisao_final.por_usuario` aparece
    -- aqui de propósito nas contas híbridas: ela é `NOT NULL`, aponta ao recrutador que
    -- decidiu, e severá-la destruiria a prova de não-discriminação (RNF-07a).
    'bloqueadores_deleteuser', v_bloq,

    -- ── apagar_respostas_e_producoes (49-20 / JORN-36 · D-48, D-62) ──────────
    -- ⚠⚠ AS TREZE CONTAGENS SAEM DA **MESMA EXPRESSAO** QUE O MOTOR EXECUTA, e e
    --    isso que torna o dry-run um espelho em vez de decoracao (regra (ii) do C3
    --    do `p45_motor_exclusao_smoke`). Em particular as condicoes `IS NOT NULL` e
    --    o predicado composto da SJT estao aqui LITERALMENTE como estao la: no
    --    motor elas fazem `ROW_COUNT` contar raspagens em vez de visitas, e aqui
    --    elas fazem a PREVISAO bater o executado. Contar sem a condicao devolveria
    --    "vou raspar N citacoes" quando vai raspar ZERO — um recibo que promete um
    --    tamanho e entrega outro (P39/CR-02, uma guarda que era dead code).
    -- ⚠ Os quatro primeiros sao LINHAS QUE SERAO APAGADAS (D-62). O dry-run e o
    --   unico lugar onde esse numero pode ser lido ANTES, e com PITR desligado
    --   (D-45-10) ele nao e processo: e a unica rede que a fase tem.
    'apagar_respostas_e_producoes', jsonb_build_object(
      'respostas_raven',
        (SELECT count(*) FROM public.respostas_raven x
          WHERE x.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'respostas_bigfive',
        (SELECT count(*) FROM public.respostas_bigfive x
          WHERE x.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'respostas_disc',
        (SELECT count(*) FROM public.respostas_disc x
          WHERE x.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'respostas_formulario',
        (SELECT count(*) FROM public.respostas_formulario x
          WHERE x.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'redacoes_candidato',
        (SELECT count(*) FROM public.redacoes_candidato r
          WHERE r.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'redacoes_candidato_em_progresso',
        (SELECT count(*) FROM public.redacoes_candidato_em_progresso p
          WHERE p.texto_em_progresso IS NOT NULL
            AND p.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'respostas_cultura',
        (SELECT count(*) FROM public.respostas_cultura u
          WHERE u.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'respostas_avaliacao',
        (SELECT count(*) FROM public.respostas_avaliacao a
          WHERE a.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'cognitivo_respostas',
        (SELECT count(*) FROM public.cognitivo_respostas g
          WHERE g.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'entrevistas_online',
        (SELECT count(*) FROM public.entrevistas_online e
          WHERE e.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'entrevistas_presenciais',
        (SELECT count(*) FROM public.entrevistas_presenciais f
          WHERE f.documentos_apresentados IS NOT NULL
            AND f.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'entrevista_analises_citacoes',
        (SELECT count(*) FROM public.entrevista_analises n
          WHERE n.citacoes IS NOT NULL
            AND n.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)),
      'scores_candidato',
        (SELECT count(*) FROM public.scores_candidato s
          WHERE s.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id)
            AND ( s.citacoes IS NOT NULL
               OR ( s.tipo = 'sjt'::public.tipo_score
                    AND jsonb_typeof(s.metadata -> 'dimension_scores') = 'array'
                    AND EXISTS (SELECT 1
                                  FROM jsonb_array_elements(s.metadata -> 'dimension_scores') z
                                 WHERE jsonb_exists(z, 'cited_evidence')) ) )),
      'nota', 'D-62: os quatro primeiros numeros sao LINHAS QUE SERAO APAGADAS, e nao atualizadas — a excecao explicita do operador, valida so neste passo e so nestas quatro tabelas, porque os CHECKs delas (int 1..8 / 1..5, D/I/S/C, ao-menos-uma-resposta) nao aceitam sentinela. Os scores calculados (scores_raven, scores_candidato) FICAM. devolutivas_candidato nao aparece: ela morre por FK CASCADE no passo auth_delete_user'),

    -- ── severar_fks_set_null (ERASE-09) ─────────────────────────────────────
    -- ⚠ D8, medido na SONDA 4b: `autorizacoes` tem DUAS FKs. A que é SET NULL
    -- aponta a `auth.users` (`user_id`); a que aponta a `candidatos`
    -- (`candidato_id`) é CASCADE. O ERASE-09 trata as duas como se fossem uma.
    'severar_fks_set_null', jsonb_build_object(
      'ai_call_logs',
        (SELECT count(*) FROM public.ai_call_logs l WHERE l.candidato_id = p_candidato_id),
      'candidate_ai_decisions',
        (SELECT count(*) FROM public.candidate_ai_decisions x WHERE x.candidato_id = p_candidato_id),
      'logs_acesso',
        (SELECT count(*) FROM public.logs_acesso g WHERE v_user_id IS NOT NULL AND g.user_id = v_user_id),
      'recruiter_alerts',
        (SELECT count(*) FROM public.recruiter_alerts r WHERE r.candidato_id = p_candidato_id),
      'autorizacoes',
        (SELECT count(*) FROM public.autorizacoes a
          WHERE a.candidato_id = p_candidato_id
             OR (v_user_id IS NOT NULL AND a.user_id = v_user_id)),
      -- ⚠⚠ 49-14 / D-63 · O MESMO PREDICADO DO MOTOR, `position('id=' || ...)` incluso.
      --    Estas linhas nao aparecem na contagem de `ai_call_logs` acima porque o
      --    `candidato_id` delas e NULL por desenho — e era exatamente por isso que
      --    ninguem as via. Contadas separadas: um numero somado esconderia um zero em
      --    qualquer das duas metades, e "zero comparativos citando o titular" e um fato
      --    diferente de "zero chamadas de IA do titular".
      'ai_call_logs_comparativo',
        (SELECT count(*) FROM public.ai_call_logs l
          WHERE l.call_type = 'comparative_ranking'
            AND EXISTS (
                  SELECT 1 FROM public.candidaturas c
                   WHERE c.candidato_id = p_candidato_id
                     AND position('id=' || c.id::text IN l.user_prompt_template) > 0)),
      'nota', 'candidate_ai_decisions declara candidato_id E vaga_id NOT NULL com ON DELETE SET NULL — clausulas INEXEQUIVEIS (achado M2 do smoke). Enquanto as colunas forem NOT NULL o ponteiro NAO e severavel e o motor desidentifica o CONTEUDO; a escolha esta registrada no COMMENT de anonimizar_candidato'
    ),

    -- ── scrub_ledger_email ──────────────────────────────────────────────────
    'scrub_ledger_email', jsonb_build_object(
      'notificacoes_enviadas',
        (SELECT count(*) FROM public.notificacoes_enviadas n WHERE n.candidato_id = p_candidato_id),
      'nota', 'destinatario_email E destinatario_original sao ambos NOT NULL — o endereco e gravado DUAS vezes por linha, e NULL abortaria a transacao de anonimizacao inteira. dedupe_key e UNIQUE e precisa ser re-namespaceada, senao um recadastro futuro colide, o claim ON CONFLICT DO NOTHING RETURNING id volta VAZIO, e o e-mail legitimo nunca e enviado sem erro em lugar nenhum'
    ),

    -- ── auth_delete_user — FORA DO BANCO ────────────────────────────────────
    'auth_delete_user', jsonb_build_object(
      'fonte',   'fora_do_banco',
      'usuario', NULL,
      'motivo',  'a remocao e da Auth Admin API (GoTrue), fora de transacao do Postgres, com shouldSoftDelete = false (D-45-09). Este plano so pode dizer se HA user_id a remover — ver user_id_presente'
    )
  );
END;
$plano_exclusao_titular$;


REVOKE ALL ON FUNCTION public.plano_exclusao_titular(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plano_exclusao_titular(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.plano_exclusao_titular(uuid) TO authenticated;


-- ---------------------------------------------------------------------------
-- POS-PORTAO — o instalado contem o passo novo, apaga linha SO nas quatro
-- tabelas do D-62, e nao perdeu nada do que o 49-14 e o 46-04 exigem.
-- ---------------------------------------------------------------------------
-- ⚠ As assercoes de NAO-REGRESSAO nao sao cerimonia. Um `CREATE OR REPLACE` de
--   ~800 linhas que perdesse qualquer uma delas passaria por "aplicou" sem uma
--   linha de erro — e a proxima pessoa a descobrir seria quem exercesse o direito.
DO $pos_p49_20$
DECLARE
  v_def_anon  text := pg_get_functiondef('public.anonimizar_candidato(uuid,boolean)'::regprocedure);
  v_def_plano text := pg_get_functiondef('public.plano_exclusao_titular(uuid)'::regprocedure);
  v_def_trg   text := pg_get_functiondef('public.trg_redacao_rh_only_review_fields()'::regprocedure);
  v_md5_anon  text;
  v_len_anon  int;
  v_md5_plano text;
  v_len_plano int;
  v_md5_trg   text;
  v_len_trg   int;
  v_p_ini     int;
  v_p_fim     int;
  v_passo     text;
  v_alvos     text[];
  v_fora      text[];
  v_falta     text[];
  v_pos_guc1  int;
  v_pos_upd   int;
  v_pos_guc0  int;
  v_tab       text;
  v_ausentes  text := '';
  v_permitido constant text[] := ARRAY['respostas_raven','respostas_bigfive','respostas_disc','respostas_formulario'];
  v_treze     constant text[] := ARRAY['respostas_raven','respostas_bigfive','respostas_disc',
                                       'respostas_formulario','redacoes_candidato',
                                       'redacoes_candidato_em_progresso','respostas_cultura',
                                       'respostas_avaliacao','cognitivo_respostas',
                                       'entrevistas_online','entrevistas_presenciais',
                                       'entrevista_analises','scores_candidato'];
BEGIN
  -- ── (a) o passo novo existe, e vem ANTES de `severar_fks_set_null` ─────────
  v_p_ini := position('passo_motor: apagar_respostas_e_producoes' IN v_def_anon);
  v_p_fim := position('passo_motor: severar_fks_set_null' IN v_def_anon);
  IF v_p_ini = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: o passo apagar_respostas_e_producoes NAO esta no corpo instalado (D-48). Sem ele o motor nao toca nenhuma das 14 origens do item respostas_e_producoes do recibo, e o recibo continua prometendo um apagamento que nao acontece';
  END IF;
  IF v_p_fim = 0 OR v_p_ini > v_p_fim THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: o passo novo NAO vem antes de severar_fks_set_null (posicoes %/%). A ordem e o mecanismo: o passo novo se enderece por candidatura_id, e o severar corta os ponteiros de ai_call_logs/logs_acesso logo depois. Medida por POSICAO, nao por presenca', v_p_ini, v_p_fim;
  END IF;

  v_passo := substr(v_def_anon, v_p_ini, v_p_fim - v_p_ini);

  -- ── (b) APAGA LINHA SO NAS QUATRO DO D-62, e nas quatro apaga ─────────────
  -- ⚠ O padrao e POSIX e nao a forma literal, de proposito: o `<verify>` deste
  --   plano varre ESTE arquivo pela forma de apagamento nas linhas de codigo e
  --   exige que ela apareca SO para as quatro tabelas permitidas. Uma assercao
  --   escrita com a forma literal se somaria a essa contagem e reprovaria a si
  --   mesma. E a §K do PATTERNS com outra cara: registrar a forma sem reproduzi-la.
  SELECT array_agg(m[1]) INTO v_alvos
    FROM regexp_matches(v_def_anon, 'DELETE[[:space:]]+FROM[[:space:]]+public\.([a-z_]+)', 'g') AS m;

  SELECT array_agg(t) INTO v_fora
    FROM unnest(coalesce(v_alvos, ARRAY[]::text[])) AS t
   WHERE NOT (t = ANY (v_permitido));
  IF v_fora IS NOT NULL THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: o motor apaga linha em tabela FORA do D-62: %. A excecao do operador e valida SO neste passo e SO em respostas_raven, respostas_bigfive, respostas_disc e respostas_formulario — porque os CHECKs delas nao aceitam sentinela. Em toda outra origem a linha FICA (sentinela ou NULL): apagar linha de score, de decisao ou de candidatura destruiria a prova de nao-discriminacao que o ERASE-08 e a RNF-07a preservam, e nao ha PITR', array_to_string(v_fora, ', ');
  END IF;

  SELECT array_agg(p) INTO v_falta
    FROM unnest(v_permitido) AS p
   WHERE NOT (p = ANY (coalesce(v_alvos, ARRAY[]::text[])));
  IF v_falta IS NOT NULL THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: as tabelas do D-62 que o motor NAO apaga: %. As quatro tem CHECK que impede sentinela (int 1..8 / 1..5, D/I/S/C, ao-menos-uma-resposta): deixar uma de fora e deixar as respostas da pessoa de pe enquanto o recibo diz que sairam', array_to_string(v_falta, ', ');
  END IF;

  -- ── (c) a GUC envolve o UPDATE da redacao, e e ZERADA depois ──────────────
  -- ⚠ MEDIDA POR POSICAO, nas tres. Presenca das tres passaria com a janela aberta
  --   ANTES e fechada muito DEPOIS, deixando o resto da transacao (o tombstone das
  --   FKs) rodando com o trigger sancionado. E sem o reset, o proximo UPDATE de
  --   redacao DESTA transacao herdaria a janela.
  v_pos_guc1 := position('set_config(''app.motor_exclusao'',''on'',true)' IN v_def_anon);
  v_pos_upd  := position('UPDATE public.redacoes_candidato r' IN v_def_anon);
  v_pos_guc0 := position('set_config(''app.motor_exclusao'','''',true)' IN v_def_anon);
  IF v_pos_guc1 = 0 OR v_pos_upd = 0 OR v_pos_guc0 = 0
     OR NOT (v_pos_guc1 < v_pos_upd AND v_pos_upd < v_pos_guc0) THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: a janela app.motor_exclusao nao envolve o UPDATE de redacoes_candidato (abre=%, update=%, fecha=%). trg_redacao_rh_only_review_fields LEVANTA EXCECAO quando rh/administrador muda texto/analise_ia: sem a janela, um pedido executado por ADMINISTRADOR aborta aqui DEPOIS de o curriculo ja ter sido apagado do Storage (RESEARCH Correcao 18 / Pitfall 6). E sem o reset a janela vale para o resto da transacao, o que transforma uma sancao pontual em portao desligado', v_pos_guc1, v_pos_upd, v_pos_guc0;
  END IF;

  -- ── (d) o trecho literal da analise sai, nos DOIS lugares ────────────────
  IF position('cited_evidence' IN v_passo) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: o passo nao remove cited_evidence (D-48, consequencia declarada). Os elementos de dimension_scores guardam o TRECHO LITERAL do que a pessoa escreveu, com localizacao: apagar o texto e deixar a citacao e apagar metade';
  END IF;
  IF position('jsonb_set(r.analise_ia' IN v_passo) = 0
     OR position('jsonb_set(s.metadata' IN v_passo) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: cited_evidence e removido de um so dos dois lugares. Ele vive em redacoes_candidato.analise_ia -> dimension_scores E na metadata da SJT em scores_candidato — medido nos dois. Tratar um e deixar o outro e a mesma promessa parcial';
  END IF;
  -- ⚠ E O RESTO DA ANALISE FICA: `jsonb_set` sobre a chave `dimension_scores` em vez
  --   de sentinela na coluna inteira. Uma sentinela ali destruiria score, level,
  --   dimension e reasoning — a prova de que houve avaliacao revisavel (ERASE-08).
  IF position('''{dimension_scores}''' IN v_passo) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: a remocao de cited_evidence nao e cirurgica (falta o caminho {dimension_scores}). Redigir a coluna inteira levaria score, level, dimension e reasoning com ela — e esses sao a prova de que houve avaliacao, que o ERASE-08 preserva';
  END IF;

  -- ── (e) as TREZE tabelas do passo estao todas no trecho do passo ─────────
  -- ⚠ CLASSIFICACAO DA FORMA (CLAUDE.md §Portoes): esta e uma lista LITERAL, e ela
  --   e ESCOPO DELIBERADO, nao fotografia. As treze sao exatamente as origens que o
  --   item `respostas_e_producoes` do recibo enumera (menos `devolutivas_candidato`,
  --   que morre por FK CASCADE). Uma origem NOVA no recibo tem de aparecer aqui —
  --   e reprovar e o comportamento certo: e assim que o passo deixa de silenciar
  --   uma promessa nova.
  FOREACH v_tab IN ARRAY v_treze LOOP
    IF position(v_tab IN v_passo) = 0 THEN
      v_ausentes := v_ausentes || v_tab || ' · ';
    END IF;
  END LOOP;
  IF v_ausentes <> '' THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: o passo nao menciona as origens: %. O recibo promete o apagamento de cada uma delas no item respostas_e_producoes; uma origem sem statement e uma frase do recibo sem mecanismo', v_ausentes;
  END IF;

  -- ── (f) o retorno do motor DIZ quanto destruiu ───────────────────────────
  IF position('''apagar_respostas_e_producoes''' IN v_def_anon) = 0
     OR position('''linhas_apagadas_d62''' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: o retorno do motor nao expoe o passo novo com a contagem de linhas apagadas. Um passo destrutivo que nao diz quanto destruiu nao e auditavel — e este e o primeiro passo deste motor que apaga LINHA';
  END IF;
  IF position('respostas_e_producoes=[%]' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: o terminador do dry-run nao carrega as contagens do passo novo. No caminho de dry-run o RAISE acontece ANTES do RETURN, entao a mensagem e o UNICO canal: sem ela, quem ensaia uma exclusao nao ve quantas linhas o passo apagaria';
  END IF;

  -- ── (g) o dry-run conta o MESMO, pela MESMA expressao ───────────────────
  IF position('''apagar_respostas_e_producoes''' IN v_def_plano) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: plano_exclusao_titular nao conta o passo novo. O dry-run voltaria a divergir do delete real (P39/CR-02) — e agora com uma diferenca nova: ele e o UNICO lugar onde o numero de linhas que VAO ser apagadas pode ser lido antes de serem';
  END IF;
  FOREACH v_tab IN ARRAY v_treze LOOP
    IF position(v_tab IN v_def_plano) = 0 THEN
      RAISE EXCEPTION 'P49-20 POS-PORTAO: o dry-run nao conta a origem %. Contar menos do que o motor apaga e um recibo que promete um tamanho e entrega outro', v_tab;
    END IF;
  END LOOP;
  -- ⚠ As condicoes que fazem `ROW_COUNT` honesto no motor TEM de estar no dry-run:
  --   sem elas o plano diria "vou raspar N citacoes" quando vai raspar ZERO.
  IF position('p.texto_em_progresso IS NOT NULL' IN v_def_plano) = 0
     OR position('f.documentos_apresentados IS NOT NULL' IN v_def_plano) = 0
     OR position('n.citacoes IS NOT NULL' IN v_def_plano) = 0
     OR position('jsonb_exists(z, ''cited_evidence'')' IN v_def_plano) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: o dry-run conta as colunas NULAVEIS sem a condicao IS NOT NULL (ou a SJT sem o predicado de cited_evidence). O motor as carrega no PREDICADO para que ROW_COUNT conte raspagens em vez de visitas; o plano sem elas conta visitas, e a previsao deixa de bater o executado na unica direcao que importa — para cima';
  END IF;

  -- ── (h) o trigger foi SANCIONADO, nao esvaziado ─────────────────────────
  IF position('app.motor_exclusao' IN v_def_trg) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: trg_redacao_rh_only_review_fields nao reconhece a janela app.motor_exclusao. Sem ela o passo depende do PAPEL de quem executa, e um pedido feito por administrador aborta DEPOIS do Storage';
  END IF;
  IF position('NEW.texto                 IS DISTINCT FROM OLD.texto' IN v_def_trg) = 0
     OR position('NEW.analise_ia            IS DISTINCT FROM OLD.analise_ia' IN v_def_trg) = 0
     OR position('RH/admin so pode atualizar campos de revisao' IN v_def_trg) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: trg_redacao_rh_only_review_fields perdeu a regra que ele existe para aplicar. A sancao do motor NAO e afrouxamento: fora da janela, RH e administrador continuam impedidos de mudar texto/analise_ia. Um trigger esvaziado deixaria a tela do RH reescrevendo a redacao do candidato para sempre, e o smoke assere as DUAS metades';
  END IF;
  IF position('current_setting(''app.motor_exclusao'', true)' IN v_def_trg) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: a leitura da janela nao usa missing_ok = true. Sem ele, current_setting levanta 42704 em TODO UPDATE de redacao do sistema — o portao mataria o caminho normal em vez de guarda-lo';
  END IF;

  -- ── NAO-REGRESSAO: o que o 49-14 e o 46-04 exigem do motor ──────────────
  IF position('revisao_resultado = CASE WHEN d.revisao_resultado IS NULL' IN v_def_anon) = 0
     OR position('revisao_resultado = CASE WHEN h.revisao_resultado IS NULL' IN v_def_anon) = 0
     OR position('comparative_ranking' IN v_def_anon) = 0
     OR position('position(''id='' ||' IN v_def_anon) = 0
     OR position('anonimizacao_p49_comparativo' IN v_def_anon) = 0
     OR position('''revisao_resultado_corrente''' IN v_def_anon) = 0
     OR position('''ai_call_logs_comparativo''' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: o motor perdeu um dos tres passos do plano 49-14 (a resposta do revisor nos dois lados / a redacao das linhas de comparativo / as tres contagens). Este CREATE OR REPLACE tem 800+ linhas: perder uma delas passa por "aplicou" sem uma linha de erro';
  END IF;
  IF position('candidato_id         = NULL,
         parsed_reasoning     = NULL,
         raw_response         = ''{"redigido":"anonimizacao_p45"}''::jsonb,
         user_prompt_template = ''[conteudo enviado' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: a sentinela de user_prompt_template saiu da MESMA lista SET que faz candidato_id := NULL (D-61). E o candidato_id que ACHA a linha: num UPDATE separado depois dele o predicado nao casa com nada — zero linha, zero erro, e o input do titular intacto';
  END IF;
  IF position('UPDATE public.decisao_final d' IN v_def_anon) = 0
     OR position('UPDATE public.decisao_final_historico h' IN v_def_anon) = 0
     OR position('UPDATE public.decisao_final d' IN v_def_anon)
        > position('UPDATE public.decisao_final_historico h' IN v_def_anon) THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: a ordem corrente -> arquivo do tombstone nao esta no corpo instalado. O UPDATE da linha corrente dispara trg_decisao_final_snapshot, que arquiva o valor ANTIGO; raspar o arquivo ANTES dele deixa uma versao recem-criada e identificavel atras do scrub';
  END IF;
  IF position('purga_execucao_itens' IN v_def_anon) = 0
     OR position('v_purga_live' IN v_def_anon) = 0
     OR position('v_purga_dry' IN v_def_anon) = 0
     OR position('modo_vigente = ''live''' IN v_def_anon) = 0
     OR position('coalesce(p_dry_run, true)' IN v_def_anon) = 0
     OR position('plano_exclusao_titular' IN v_def_anon) = 0
     OR position('USING ERRCODE = ''P45DR''' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: o motor perdeu um trecho vivo (4o ramo da purga / as duas variaveis do D-46-24 / o modo live por extenso / a normalizacao da intencao BL-01 / a chamada ao plano / o terminador do dry-run)';
  END IF;
  IF position('purga_execucao_itens' IN v_def_plano) = 0
     OR position('i.candidato_id = p_candidato_id' IN v_def_plano) = 0
     OR position('bloqueadores_deleteuser' IN v_def_plano) = 0 THEN
    RAISE EXCEPTION 'P49-20 POS-PORTAO: plano_exclusao_titular perdeu o 3o ramo do guard (Blocker B-02) ou a enumeracao de bloqueadores do deleteUser (CR-05)';
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_anon, v_len_anon
    FROM pg_catalog.pg_proc p WHERE p.oid = 'public.anonimizar_candidato(uuid,boolean)'::regprocedure;
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_plano, v_len_plano
    FROM pg_catalog.pg_proc p WHERE p.oid = 'public.plano_exclusao_titular(uuid)'::regprocedure;
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_trg, v_len_trg
    FROM pg_catalog.pg_proc p WHERE p.oid = 'public.trg_redacao_rh_only_review_fields()'::regprocedure;

  -- ⚠ ESTES TRES VALORES SAO OS PINS NOVOS DO (C3) do p45_motor_exclusao_smoke.sql
  --   e o PRE-PORTAO de quem editar estes corpos depois. Sem eles no log, o re-pin
  --   do smoke seria um numero sem proveniencia — e um md5 recem-carimbado casa com
  --   QUALQUER corpo, inclusive um em que o passo novo nunca existiu.
  RAISE NOTICE 'P49-20 INSTALADO — anonimizar_candidato md5=% (length %) · plano_exclusao_titular md5=% (length %) · trg_redacao_rh_only_review_fields md5=% (length %)',
    v_md5_anon, v_len_anon, v_md5_plano, v_len_plano, v_md5_trg, v_len_trg;
END
$pos_p49_20$;
