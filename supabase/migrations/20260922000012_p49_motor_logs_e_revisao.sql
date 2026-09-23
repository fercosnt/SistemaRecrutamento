-- =============================================================================
-- Phase 49 / Plano 49-14 — JORN-36 · D-60 · D-61 · D-63
-- `anonimizar_candidato(uuid,boolean)` e `plano_exclusao_titular(uuid)` passam a
-- apagar (i) o CONTEUDO que o titular mandou as analises automaticas, (ii) as
-- linhas de comparativo que o CITAM, e (iii) a resposta do revisor ao pedido de
-- revisao da decisao — na linha corrente e no arquivo.
-- =============================================================================
--
-- ⚠⚠ ESCOPO NEGATIVO, EM UMA LINHA: **esta migration edita DUAS FUNCOES VIVAS, uma
-- delas DESTRUTIVA, e nao faz absolutamente mais nada** — zero DDL de tabela, zero
-- policy, zero agendamento, zero linha de dado de pessoa, zero `DELETE`, e nenhum
-- bloco que EXECUTE o caminho feliz durante o apply (proibicao do 46-04). O diff
-- util cabe em uma tela, e e isso que permite ao revisor saber onde olhar.
--
-- ⚠ E NAO HA `DELETE` AQUI DE PROPOSITO. O motor nunca apagou linha propria (a
-- devolutiva morre por FK CASCADE), e a excecao decidida pelo operador (D-62 — as
-- 4 tabelas de resposta) e do passo NOVO do plano 49-20, que parte do corpo que
-- ESTE plano deixa. Sao tres fatias sequenciais do mesmo motor, cada uma com dono
-- unico do trecho que escreve: 49-14 (logs e revisao) -> 49-20 (o passo novo)
-- -> 49-21 (recibo e inventario alinhados).
--
-- ⚠ REVERSIBILIDADE: o CODIGO e reaplicavel (`CREATE OR REPLACE`); a EXECUCAO nao.
-- Cada exclusao que o motor executa e irreversivel por desenho (D-48). Por isso a
-- PRIMEIRA execucao real do motor alterado e checkpoint do plano 49-19, em conta de
-- teste (D-54), e a prova AQUI e do smoke, dentro de subtransacao que reverte.
--
-- ⚠ CONFERIDO ANTES DO APPLY, so leitura: a purga automatica esta em ENSAIO
-- (`config_purga.modo = 'dry_run'`, medido 2026-09-23). Se estivesse em `live`, o
-- cron noturno levaria o motor ALTERADO sobre titular real antes do checkpoint do
-- 49-19 — e o pre-portao abaixo aborta o apply nesse caso.
--
-- -----------------------------------------------------------------------------
-- (1) O QUE ESTAVA ERRADO (medido em PROD em 2026-09-23, so leitura)
-- -----------------------------------------------------------------------------
--   · `ai_call_logs.user_prompt_template` (`text NOT NULL`) sobrevivia INTEIRA a
--     exclusao. O passo `severar_fks_set_null` (1/5) tratava a SAIDA
--     (`raw_response`, `parsed_reasoning`) desde o 45-07 e deixava a ENTRADA de pe
--     — e a entrada e a metade que carrega o que a PESSOA escreveu, mais a fala
--     literal transcrita nas chamadas de entrevista. 55 linhas vivas.
--
--   · As linhas `call_type = 'comparative_ranking'` nascem com `candidato_id` NULL
--     POR DESENHO (a chamada e sobre varias pessoas). O passo (1/5) acha a linha
--     por `candidato_id`, logo NUNCA as alcancou — e nao ha coluna alternativa:
--     `ai_call_logs` nao tem `candidatura_id`. 1 linha viva hoje, com o bloco
--     literal de cada candidato comparado dentro do `user_prompt_template`.
--
--   · `decisao_final.revisao_resultado` e a copia dela em
--     `decisao_final_historico` (as duas `text` NULAVEIS) ficavam LITERAIS. E o
--     que o revisor escreveu ao responder o pedido de revisao do Art. 20 — texto
--     sobre a pessoa, na fala de quem revisou. 1 linha nao nula em cada tabela.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIENCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NAO
-- -----------------------------------------------------------------------------
--   · OS DOIS CORPOS vem dos ARQUIVOS
--     `supabase/migrations/20260823000006_p46_guard_purga.sql` e
--     `supabase/migrations/20260823000008_p46_guard_plano.sql`, extraidos entre os
--     dois delimitadores NOMEADOS, **nunca do catalogo**. A copia foi conferida por
--     md5 ANTES de qualquer edicao, contra o `md5(prosrc)` medido em PROD:
--       anonimizar_candidato   = 5209239f191aa15b1725b726b00eb4cd  (47 549 octetos)
--       plano_exclusao_titular = 42f916d81cd274b28044a410ae57a237  (27 392 octetos)
--     que sao byte a byte os pins vivos de `p45_motor_exclusao_smoke.sql` (C3/i).
--     Copiar do catalogo pinaria o que esta aplicado, seja la o que for; copiar do
--     arquivo e conferir contra o vivo e a conferencia CRUZADA que aquele smoke
--     exige. As edicoes foram aplicadas por substituicao de ancora UNICA — uma
--     ancora que aparecesse 0 ou 2 vezes abortaria a montagem, em vez de casar no
--     lugar errado em silencio.
--
--   · A FORMA do passo novo (0/5) vem do proprio bloco `severar_fks_set_null`
--     (`20260823000006:748-763`): um statement explicito por tabela, um
--     `GET DIAGNOSTICS` por statement, escopo por EXISTS correlacionado — jamais
--     negacao por pertencimento a conjunto de valores.
--
--   · ⚠ **NAO foi copiado nenhum bloco que EXECUTE o caminho feliz** (o
--     `20260805000006:860-935` monta um candidato sintetico e roda o tombstone
--     inteiro numa subtransacao revertida). Reexecuta-lo aqui seria rodar um
--     caminho destrutivo completo durante o apply de uma migration cujo escopo
--     negativo acabou de prometer que ela nao toca em dado de pessoa. A prova e do
--     smoke `p45_motor_exclusao_smoke.sql`.
--
--   · ⚠ **NAO foi tocado o guard** — nem as quatro metades do ramo da purga, nem a
--     normalizacao `v_dry_run := coalesce(p_dry_run, true)` (BL-01), nem o
--     terminador do dry-run, nem a enumeracao de bloqueadores do plano. A rede
--     estrutural do (C3) do smoke vigia todos eles e continua verde.
--
--   · ⚠ **NAO foi criado passo novo em `'passos'`.** As tres contagens entram nas
--     chaves EXISTENTES (`tombstone_decisao_final`, `severar_fks_set_null`), e
--     `PASSOS_MOTOR` (`_shared/reciboExclusao.ts:23-31`) fica intacta. O passo novo
--     e do 49-20.
--
-- -----------------------------------------------------------------------------
-- (3) POR QUE A LINHA DE COMPARATIVO INTEIRA, E NAO SO O BLOCO DO TITULAR
-- -----------------------------------------------------------------------------
-- Cortar apenas o bloco daquele candidato foi considerado e REJEITADO: depende do
-- FORMATO do prompt (`Candidato C<n> (id=<candidatura_id>)`,
-- `comparativo-candidatos/index.ts:382`), e o formato ja mudou uma vez nesta fase.
-- Um corte por layout deixaria, na primeira mudanca de layout, o texto passando
-- intacto e o portao VERDE — a classe de defeito que o `CLAUDE.md` §"Portoes"
-- cataloga. O custo aceito, dito com todas as letras: a redacao apaga tambem o
-- input dos OUTROS titulares daquela chamada. O que NAO se perde e o resultado do
-- comparativo, que vive em `comparativo_solicitado`.
--
-- -----------------------------------------------------------------------------
-- (4) O QUE O RECIBO AINDA DIZ, E POR QUE ISSO NAO E CONSERTADO AQUI
-- -----------------------------------------------------------------------------
-- O recibo e o inventario de compliance ainda descrevem `user_prompt_template`
-- como conteudo PRESERVADO. Alinha-los e o plano 49-21, e ele vem ANTES de
-- qualquer execucao real (49-19). Entre este plano e aquele, o recibo diz MENOS do
-- que o motor apaga — nunca mais, que seria a promessa vazia. A direcao do
-- desalinhamento e a que importa, e ela esta do lado seguro.
--
-- -----------------------------------------------------------------------------
-- (5) ERRO / AUTHZ / IDEMPOTENCIA / TRANSPORTE
-- -----------------------------------------------------------------------------
-- ERRO: o pre-portao aborta com `P49-14 PRE-PORTAO` (SQLSTATE padrao P0001) se
--   qualquer um dos dois md5 vivos divergir do medido, ou se a purga estiver fora
--   de `dry_run`. O terminador do dry-run do motor segue em `P45DR`.
-- AUTHZ: nenhum grant muda. O ACL e reemitido identico ao vivo (`CREATE OR REPLACE`
--   nao repoe grants, mas o `pg_default_acl` deste schema concede EXECUTE a `anon`
--   como grant DIRETO em todo `CREATE FUNCTION`, e por isso o `REVOKE` NOMEIA
--   `anon`; e `authenticated` e reconcedido porque o titular chega por ele — sem
--   isso o `DI-45-10-01` volta e o (C1) do smoke fica vermelho).
-- IDEMPOTENCIA: o pre-portao aceita SO os md5 de ANTES. Reaplicar sobre o corpo
--   novo falha de proposito, com mensagem. O UPDATE de comparativo e idempotente
--   por construcao (a sentinela nao contem `id=<uuid>`).
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Migrations): corpo PL/pgSQL `$$`
-- com `DO`/`REVOKE`/`GRANT`/`COMMENT` adjacentes e a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260922000012_p49_motor_logs_e_revisao.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO byte a byte, migration + linha do ledger
-- na MESMA requisicao e portanto na mesma transacao; a `version` nasce correta e
-- nao ha reparo a fazer).
--
-- O CONTRATO EXECUTAVEL e `supabase/tests/p45_motor_exclusao_smoke.sql`: se algo
-- divergir, corrige-se ESTA migration, nunca o smoke.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- PRE-PORTAO — os dois corpos vivos sao os medidos, E a purga esta em ensaio.
-- ---------------------------------------------------------------------------
DO $pre_p49_14$
DECLARE
  v_md5_anon  text;
  v_len_anon  int;
  v_md5_plano text;
  v_len_plano int;
  v_modo      text;
  v_esp_anon  constant text := '5209239f191aa15b1725b726b00eb4cd';
  v_esp_plano constant text := '42f916d81cd274b28044a410ae57a237';
BEGIN
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_anon, v_len_anon
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.anonimizar_candidato(uuid,boolean)'::regprocedure;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_plano, v_len_plano
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.plano_exclusao_titular(uuid)'::regprocedure;

  IF v_md5_anon IS DISTINCT FROM v_esp_anon THEN
    RAISE EXCEPTION 'P49-14 PRE-PORTAO: o corpo VIVO de anonimizar_candidato tem md5 % (length %), e o medido em 2026-09-23 e % (length 46246). O CREATE OR REPLACE abaixo APAGARIA a divergencia em silencio, numa FUNCAO DESTRUTIVA. Apply abortado: reler pg_get_functiondef, refazer a extracao do arquivo 20260823000006 e so entao reaplicar. ⚠ Se o md5 vivo for o do corpo NOVO, esta migration JA foi aplicada — o pre-portao aceita so o de ANTES, de proposito.', v_md5_anon, v_len_anon, v_esp_anon;
  END IF;

  IF v_md5_plano IS DISTINCT FROM v_esp_plano THEN
    RAISE EXCEPTION 'P49-14 PRE-PORTAO: o corpo VIVO de plano_exclusao_titular tem md5 % (length %), e o medido e % (length 26220). O dry-run e o delete real TEM de sair da mesma expressao: reescrever um sem o outro devolve o P39/CR-02 (uma guarda que era dead code). Apply abortado.', v_md5_plano, v_len_plano, v_esp_plano;
  END IF;

  -- ⚠⚠ A PURGA TEM DE ESTAR EM ENSAIO. Esta e a unica pergunta deste bloco que nao
  --    e sobre o codigo: o cron `purga-retencao-sweep` dispara toda noite e CHAMA
  --    este motor. Com `modo = 'live'`, o motor ALTERADO rodaria sobre titular real
  --    antes do checkpoint do 49-19 — que e onde a primeira execucao real foi
  --    deliberadamente colocada (D-54). Um apply que ligasse esse caminho por
  --    omissao seria a porta de mao unica atravessada sem ninguem decidir.
  SELECT c.modo INTO v_modo FROM public.config_purga c LIMIT 1;
  IF coalesce(v_modo, '<ausente>') IS DISTINCT FROM 'dry_run' THEN
    RAISE EXCEPTION 'P49-14 PRE-PORTAO: config_purga.modo = % e o exigido para este apply e dry_run. O cron da purga chama anonimizar_candidato; com a purga fora de ensaio, o motor ALTERADO alcancaria titular real antes do checkpoint do 49-19 (D-54). Decisao do operador, nao conserto de agente: desligar a purga (salvar_config_purga) ou antecipar o checkpoint.', coalesce(v_modo, '<ausente>');
  END IF;

  RAISE NOTICE 'P49-14 PRE-PORTAO ok: anonimizar_candidato=% (%), plano_exclusao_titular=% (%), config_purga.modo=%',
    v_md5_anon, v_len_anon, v_md5_plano, v_len_plano, v_modo;
END
$pre_p49_14$;


-- ---------------------------------------------------------------------------
-- 1 · `public.anonimizar_candidato(uuid, boolean)` — corpo INTEIRO do arquivo
--     20260823000006, com QUATRO mudancas e nada mais:
--       (a) `tombstone_decisao_final`: `revisao_resultado` nos DOIS UPDATEs, na
--           ordem de hoje (corrente -> arquivo), cada um com a sua contagem;
--       (b) `severar_fks_set_null` (0/5): UPDATE NOVO, antes do (1/5), que rediga
--           as linhas `comparative_ranking` que CITAM o titular;
--       (c) `severar_fks_set_null` (1/5): `user_prompt_template` no MESMO UPDATE
--           que faz `candidato_id := NULL`;
--       (d) as tres contagens em `'passos'` e na mensagem do terminador do dry-run.
--     Nada mais foi tocado: nem o guard, nem a normalizacao da intencao, nem as
--     sentinelas antigas, nem o objeto de retorno fora das duas chaves citadas.
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
    RAISE EXCEPTION 'P45 DRY-RUN concluido: o corpo COMPLETO da anonimizacao executou e esta sendo revertido agora. Nada foi persistido. candidatos=% candidaturas_cv=% decisao_final=% decisao_final_historico=% historico_ator=% ai_call_logs=% candidate_ai_decisions=% logs_acesso=% recruiter_alerts=% autorizacoes=% preferencias_notificacoes=% notificacoes_enviadas=% revisao_resultado_corrente=% revisao_resultado_arquivo=% ai_call_logs_comparativo=%. Para executar de verdade, chame com p_dry_run := false — o modo seguro e o DEFAULT, e apagar exige dize-lo',
      v_n_cand, v_n_cvurl, v_n_df, v_n_dfh, v_n_hist, v_n_aicall, v_n_aidec, v_n_logs,
      v_n_alerts, v_n_aut, v_n_pref, v_n_notif,
      v_n_df_rev, v_n_dfh_rev, v_n_aicall_cmp
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
-- 2 · `public.plano_exclusao_titular(uuid)` — corpo INTEIRO do arquivo
--     20260823000008, com as MESMAS TRES contagens, pela MESMA expressao.
--     O dry-run e o delete real TEM de sair da mesma expressao (regra (ii) do C3).
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
-- POS-PORTAO — o instalado contem as formas novas E nao perdeu as antigas.
-- ---------------------------------------------------------------------------
-- ⚠ As assercoes de NAO-REGRESSAO nao sao cerimonia: sao as que o 46-04 exige (o
--   quarto ramo do guard, as duas variaveis fisicamente distintas, a janela de
--   tempo) e as que o 45-14 exige (a normalizacao da intencao). Um
--   `CREATE OR REPLACE` de 730 linhas que perdesse qualquer uma delas passaria por
--   "aplicou" sem uma linha de erro — e a proxima pessoa a descobrir seria quem
--   rodasse o smoke, ou pior, quem exercesse o direito.
DO $pos_p49_14$
DECLARE
  v_def_anon  text := pg_get_functiondef('public.anonimizar_candidato(uuid,boolean)'::regprocedure);
  v_def_plano text := pg_get_functiondef('public.plano_exclusao_titular(uuid)'::regprocedure);
  v_md5_anon  text;
  v_len_anon  int;
  v_md5_plano text;
  v_len_plano int;
  v_sent_rev  text;
  v_len_sent  int;
  v_min_rev   int;
  v_def_check text;
BEGIN
  -- ── (a) D-60 · `revisao_resultado` nos DOIS UPDATEs do tombstone ──────────
  IF position('revisao_resultado = CASE WHEN d.revisao_resultado IS NULL' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: o tombstone da linha CORRENTE nao rasga revisao_resultado (D-60)';
  END IF;
  IF position('revisao_resultado = CASE WHEN h.revisao_resultado IS NULL' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: o tombstone do ARQUIVO nao rasga revisao_resultado (D-60) — e e o arquivo que entrega o que a linha corrente protege';
  END IF;
  -- ⚠ A ORDEM E O MECANISMO: o UPDATE da corrente dispara o snapshot com o valor
  --   ANTIGO, e o do arquivo vem DEPOIS e o raspa. Invertida, sobra no arquivo uma
  --   linha recem-criada e identificavel. Medida por POSICAO, nao por presenca.
  IF position('UPDATE public.decisao_final d' IN v_def_anon) = 0
     OR position('UPDATE public.decisao_final_historico h' IN v_def_anon) = 0
     OR position('UPDATE public.decisao_final d' IN v_def_anon)
        > position('UPDATE public.decisao_final_historico h' IN v_def_anon) THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: a ordem corrente -> arquivo do tombstone nao esta no corpo instalado. O UPDATE da linha corrente dispara trg_decisao_final_snapshot, que arquiva o valor ANTIGO; raspar o arquivo ANTES dele deixa uma linha recem-criada e identificavel atras do scrub';
  END IF;

  -- ── (a2) O COMPRIMENTO DA SENTINELA DA REVISAO E LOAD-BEARING ────────────
  -- ⚠⚠ MEDIDO, NAO SUPOSTO. `decisao_final` tem um CHECK VIVO
  --    (`decisao_final_revisao_justificativa_min_check`) que exige
  --    `length(btrim(coalesce(revisao_resultado, ''))) >= 50` sempre que
  --    `revisao_veredito` nao for nulo — e uma resposta de revisor SEMPRE tem
  --    veredito (o CHECK irmao `..._resposta_completa_check` amarra os tres campos).
  --    Uma sentinela CURTA nao falha aqui: falha no PEDIDO REAL, com 23514, DEPOIS
  --    de o curriculo ja ter sido apagado do Storage e sem caminho de volta — o
  --    Pitfall 1 desta fase, com nome e endereco.
  -- ⚠ O MINIMO E LIDO DO CATALOGO VIVO, e nao escrito como constante aqui: se
  --   alguem subir o CHECK para 80, este portao reprova o apply e manda alongar a
  --   sentinela, em vez de deixar o 23514 esperando pelo primeiro pedido real. Uma
  --   constante transcrita seria uma FOTOGRAFIA do CHECK de hoje.
  SELECT pg_get_constraintdef(c.oid) INTO v_def_check
    FROM pg_catalog.pg_constraint c
   WHERE c.conrelid = 'public.decisao_final'::regclass
     AND c.conname  = 'decisao_final_revisao_justificativa_min_check';
  v_min_rev  := coalesce((regexp_match(coalesce(v_def_check, ''), '>= \(?([0-9]+)'))[1]::int, 50);
  v_sent_rev := (regexp_match(v_def_anon, 'ELSE ''(\[resposta do revisor preservada[^'']*)'' END'))[1];
  v_len_sent := length(btrim(coalesce(v_sent_rev, '')));
  IF v_len_sent < v_min_rev THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: a sentinela de revisao_resultado tem % caracteres uteis e o CHECK VIVO de decisao_final exige >= % (%). Uma sentinela curta NAO falha no apply — falha com 23514 no primeiro pedido real, DEPOIS de o curriculo ja ter sido apagado do Storage, sem caminho de volta (Pitfall 1). Alongar a sentinela, nunca afrouxar o CHECK: ele existe para que uma resposta de revisor com veredito nao possa ficar vazia.', v_len_sent, v_min_rev, coalesce(v_def_check, '<CHECK ausente — minimo caiu para o valor medido em 2026-09-23>');
  END IF;

  -- ── (b) D-63 · a redacao das linhas de comparativo ───────────────────────
  IF position('comparative_ranking' IN v_def_anon) = 0
     OR position('position(''id='' ||' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: o passo (0/5) das linhas comparative_ranking nao esta no corpo instalado (D-63). Elas tem candidato_id NULL por desenho, e sem este predicado o (1/5) nunca as alcanca';
  END IF;
  IF position('anonimizacao_p49_comparativo' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: raw_response das linhas de comparativo nao recebe sentinela propria — sem discriminador, a linha de comparativo fica indistinguivel da de candidato na auditoria';
  END IF;

  -- ── (c) D-61 · `user_prompt_template` no MESMO UPDATE do (1/5) ───────────
  -- ⚠⚠ A ASSERCAO E DA LISTA `SET` CONTIGUA, e nao de duas presencas somadas nem de
  --    uma comparacao de POSICAO. Duas presencas passariam com a sentinela num
  --    UPDATE SEPARADO depois deste — e esse UPDATE nao acharia linha nenhuma,
  --    porque o `candidato_id` que serve de endereco acabou de ser cortado: zero
  --    linhas, zero erro, input intacto. E uma comparacao de posicao mediria a
  --    PRIMEIRA ocorrencia de `user_prompt_template =`, que e a do passo (0/5) dos
  --    comparativos — a assercao ficaria verde falando de outro statement.
  IF position('candidato_id         = NULL,
         parsed_reasoning     = NULL,
         raw_response         = ''{"redigido":"anonimizacao_p45"}''::jsonb,
         user_prompt_template = ''[conteudo enviado' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: a sentinela de user_prompt_template NAO esta na MESMA lista SET que faz candidato_id := NULL (D-61). E o candidato_id que ACHA a linha: num UPDATE separado depois dele o predicado nao casa com nada — zero linha, zero erro, e o input do titular intacto. Severar o ponteiro deixando o input de pe e pseudonimizacao apresentada como anonimizacao (Art. 12 §1o)';
  END IF;

  -- ── (d) as tres contagens, no motor E no plano ───────────────────────────
  IF position('''revisao_resultado_corrente''' IN v_def_anon) = 0
     OR position('''revisao_resultado_arquivo''' IN v_def_anon) = 0
     OR position('''ai_call_logs_comparativo''' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: o retorno do motor nao expoe as tres contagens novas. Um passo destrutivo que nao diz quanto destruiu nao e auditavel';
  END IF;
  IF position('''revisao_resultado_corrente''' IN v_def_plano) = 0
     OR position('''revisao_resultado_arquivo''' IN v_def_plano) = 0
     OR position('''ai_call_logs_comparativo''' IN v_def_plano) = 0
     OR position('position(''id='' ||' IN v_def_plano) = 0 THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: plano_exclusao_titular nao conta as tres coisas novas pela mesma expressao. O dry-run voltaria a divergir do delete real (P39/CR-02)';
  END IF;

  -- ── NAO-REGRESSAO: o que o 46-04 e o 45-14 exigem do motor ───────────────
  IF position('purga_execucao_itens' IN v_def_anon) = 0
     OR position('v_purga_live' IN v_def_anon) = 0
     OR position('v_purga_dry' IN v_def_anon) = 0
     OR position('modo_vigente = ''live''' IN v_def_anon) = 0
     OR position('coalesce(p_dry_run, true)' IN v_def_anon) = 0
     OR position('plano_exclusao_titular' IN v_def_anon) = 0
     OR position('USING ERRCODE = ''P45DR''' IN v_def_anon) = 0 THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: o motor perdeu um trecho vivo (4o ramo da purga / as duas variaveis do D-46-24 / o modo live por extenso / a normalizacao da intencao BL-01 / a chamada ao plano / o terminador do dry-run). Este CREATE OR REPLACE tem 700+ linhas: perder uma delas passa por "aplicou" sem uma linha de erro';
  END IF;
  IF position('purga_execucao_itens' IN v_def_plano) = 0
     OR position('i.candidato_id = p_candidato_id' IN v_def_plano) = 0
     OR position('bloqueadores_deleteuser' IN v_def_plano) = 0 THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: plano_exclusao_titular perdeu o 3o ramo do guard (Blocker B-02) ou a enumeracao de bloqueadores do deleteUser (CR-05)';
  END IF;

  -- ── E nenhum apagamento de linha entrou: a excecao D-62 e do 49-20 ──────
  -- ⚠ O padrao e POSIX e nao a string literal, de proposito: o `<verify>` deste
  --   plano varre ESTE arquivo por `/DELETE\s+FROM/i` nas linhas de codigo, e uma
  --   assercao escrita com a forma literal reprovaria a si mesma. E a §K do
  --   PATTERNS com outra cara: registrar a forma proibida sem reproduzi-la.
  IF v_def_anon ~ 'DELETE[[:space:]]+FROM' THEN
    RAISE EXCEPTION 'P49-14 POS-PORTAO: apareceu um DELETE no corpo do motor. Esta migration NAO apaga linha (D-54); a unica excecao decidida (D-62) e o passo novo do plano 49-20, nas 4 tabelas de resposta';
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_anon, v_len_anon
    FROM pg_catalog.pg_proc p WHERE p.oid = 'public.anonimizar_candidato(uuid,boolean)'::regprocedure;
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5_plano, v_len_plano
    FROM pg_catalog.pg_proc p WHERE p.oid = 'public.plano_exclusao_titular(uuid)'::regprocedure;

  -- ⚠ ESTES DOIS VALORES SAO O PRE-PORTAO DO PLANO 49-20 e os pins novos do (C3)
  --   do p45_motor_exclusao_smoke.sql. Sem eles no log, o re-pin do smoke seria um
  --   numero sem proveniencia — e um md5 recem-carimbado casa com QUALQUER corpo.
  RAISE NOTICE 'P49-14 INSTALADO — anonimizar_candidato md5=% (length %) · plano_exclusao_titular md5=% (length %)',
    v_md5_anon, v_len_anon, v_md5_plano, v_len_plano;
END
$pos_p49_14$;
