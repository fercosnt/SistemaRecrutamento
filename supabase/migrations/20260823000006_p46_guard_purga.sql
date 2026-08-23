-- =============================================================================
-- Phase 46 / Plano 46-04 — PURGA-02 · PURGA-05 · Blocker B-01 · D-46-18 / D-46-24
-- `anonimizar_candidato(uuid, boolean)` ganha o QUARTO RAMO autorizado: o motor
-- da purga passa a poder chamar o tombstone sem sessao, e SO de dentro dele.
-- =============================================================================
--
-- ⚠⚠ ESCOPO NEGATIVO, EM UMA LINHA — E ELA E O MOTIVO DE ESTE ARQUIVO EXISTIR
-- SOZINHO: **esta migration EDITA UMA FUNCAO DESTRUTIVA VIVA, exercitada em
-- PRODUCAO em 2026-08-22, e nao faz absolutamente mais nada** — zero DDL de
-- tabela, zero policy, zero agendamento, zero linha de dado, zero verbo de
-- escrita sobre dado de candidato. E isso que permite ao code review bloqueante
-- saber exatamente onde olhar: o diff util deste arquivo cabe em uma tela.
--
-- ⚠ REVERSIBILIDADE: `one-way` na pratica. Reverter exige uma migration NOVA
-- sobre a mesma funcao destrutiva viva, mais um terceiro re-pin de md5. Foi por
-- isso que D-46-18 passou por checkpoint de decisao antes de qualquer linha ser
-- escrita, e por isso que o code review vem ANTES do apply (portao de fase
-- destrutiva do M8, item 2).
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply e EXCLUSIVAMENTE pelo ORQUESTRADOR (subagentes GSD nao recebem os tools
-- MCP do Supabase — bug upstream anthropics/claude-code#13898), pela via
-- estabelecida em 2026-08-22 e registrada em CLAUDE.md §"Via de apply ATUAL":
-- Management API (`POST /v1/projects/{ref}/database/query`) com o SQL **lido do
-- arquivo**, byte a byte, nunca transcrito. Foi a transcricao que fez DUAS das
-- cinco migrations do M8 chegarem a PROD com os comentarios descartados.
--
-- ⚠ **NAO HA REPARO DE `version` A FAZER, e dizer isso aqui e deliberado.** Por
-- aquela via a linha de `supabase_migrations.schema_migrations` nasce com a
-- version do nome do arquivo. A instrucao `UPDATE ... SET version` que os
-- cabecalhos das migrations `20260823000001`..`4` mandam rodar esta OBSOLETA e
-- continua escrita dentro do banco (o `statements[1]` guarda o arquivo literal);
-- corrigi-los faria o md5 deles divergir do ledger e quebraria a propria prova,
-- e por isso a correcao vive no CLAUDE.md e neste cabecalho, e nao la.
--
-- Sem par de transacao explicita no topo: o driver ja envolve cada migration na
-- sua propria transacao implicita, e um par externo de abertura e fechamento e o
-- gatilho do SQLSTATE 42601 ("cannot insert multiple commands into a prepared
-- statement") — CLAUDE.md §Migrations. Este arquivo e exatamente a combinacao que
-- o transaction pooler recusa: dois corpos delimitados por cifrao NOMEADO,
-- adjacentes a `REVOKE` / `GRANT` / `COMMENT`.
--
-- Conferencia obrigatoria logo apos o apply, **os dois lados registrados**:
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260823000006';
--   -- comparar com:  printf '%s' "$(cat supabase/migrations/20260823000006_*.sql)" | md5
--
-- ⚠ O token do delimitador de cifrao da funcao NAO aparece em prosa neste
-- arquivo, e a omissao e deliberada: a receita de extracao registrada em
-- `supabase/tests/p45_motor_exclusao_smoke.sql` §PROVENIENCIA e um `indexOf`
-- ingenuo, e uma mencao em comentario antes da funcao faria o re-pin de (C3)
-- carimbar o md5 de um trecho de prosa em vez do corpo. Foi exatamente essa
-- armadilha que o plano 46-02 encontrou e registrou.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIENCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NAO
-- -----------------------------------------------------------------------------
--   · O CORPO INTEIRO da funcao vem do ARQUIVO
--     `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql`, extraido
--     entre os dois delimitadores nomeados, **nao do catalogo**. A copia foi
--     conferida por md5 ANTES de qualquer edicao:
--       md5(corpo copiado) = 8c86e0f040219e7eade47eb587dbf5de  (34 488 octetos)
--     que e byte a byte o pin vivo em `p45_motor_exclusao_smoke.sql:1591` e o
--     `md5(prosrc)` medido em PROD em 2026-08-22. Copiar do catalogo pinaria o que
--     esta aplicado, seja la o que for; copiar do arquivo e conferir contra o vivo
--     e a conferencia CRUZADA que a disciplina daquele smoke exige.
--
--   · A FORMA do ramo novo vem de `20260805000006:405-449` — a metade (c), o
--     guard de INTENCAO. Mesmo idioma: `EXISTS` correlacionado sobre o estado que
--     SO o motor produz, jamais negacao por pertencimento a conjunto de valores;
--     comparacao de papel por `IS DISTINCT FROM`; e falha FECHADA por construcao,
--     sem clausula `IS NOT NULL` extra (ver a propriedade em `:418-423`).
--
--   · A FORMA do bloco de auto-verificacao vem de `20260805000006:988-1028`, com
--     as tabelas trocadas e as DUAS metades preservadas: a que ABORTA o apply e a
--     que apenas AVISA e declara a RLS como parte do guard.
--
--   · ⚠ **NAO foi copiado o bloco de auto-verificacao que EXECUTA o caminho feliz**
--     (`20260805000006:860-935`). Aquele bloco monta um candidato sintetico e roda
--     o tombstone inteiro dentro de uma subtransacao revertida; ele pertence ao
--     arquivo que CRIA a funcao. Reexecuta-lo aqui seria rodar um caminho
--     destrutivo completo durante o apply de uma migration cujo escopo negativo
--     acabou de prometer que ela nao toca em dado de pessoa. A prova de que o ramo
--     novo funciona e do smoke — assercao (o) de `p46_purga_smoke.sql`, cinco
--     chamadas, quatro negativas e uma positiva.
--
--   · ⚠ **NAO foi relaxada a metade (a).** Aceitar `auth.uid() IS NULL` sob
--     `service_role` e a saida RECUSADA pelo `DI-45-07-01` e pela decisao do
--     operador de 2026-08-05, e continua recusada. A mensagem original da metade
--     (a) segue neste arquivo VERBATIM, e o ramo novo NAO e "sessao nula e
--     aceitavel": ele e "sessao nula e aceitavel SE E SOMENTE SE existir, agora,
--     item vivo de purga para ESTE candidato, sob execucao em `executando`, com o
--     cerco no modo que autoriza aquele caminho".
--
--   · ⚠ **NAO foi tocada a normalizacao da intencao.** `coalesce(p_dry_run, true)`
--     continua sendo o UNICO lugar em que o parametro cru e lido, e as duas metades
--     do ramo novo sao escolhidas por `v_dry_run` — nunca pelo parametro cru. Uma
--     leitura nova do parametro cru e a regressao a procurar em qualquer diff
--     futuro deste arquivo (BL-01 do `45-REVIEW-2.md`).
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DO PRECEDENTE, E POR QUE
-- -----------------------------------------------------------------------------
-- **DIVERGENCIA 1 — o ramo tem DUAS METADES FISICAMENTE DISTINTAS (D-46-24).**
-- D-46-18 escreveu, na letra: *"Um `modo` que nao seja `live` nao autoriza nada."*
-- Lido ao pe da letra, isso recusaria o PROPRIO laco de dry-run durante os 14 dias
-- da janela `dry_run`, e tornaria impossivel a assercao que o contrato de
-- validacao desta fase exige ("o loop de dry-run termina em P45DR e zero coluna
-- mutou"). Ou seja: produziria exatamente o **dry-run decorativo** que o SC#1
-- desta fase existe para proibir, e que o P39/CR-02 ja embarcou uma vez neste
-- projeto. D-46-24 resolveu escopando a frase a DESTRUICAO:
--   · caminho de DRY-RUN   — autorizado sob cerco em `dry_run` OU em `live`;
--   · caminho DESTRUTIVO   — autorizado EXCLUSIVAMENTE sob cerco em `live`;
--   · `off` nao autoriza NENHUM dos dois — e o kill switch de D-46-06.
--
-- ⚠⚠ E POR ISSO AS DUAS METADES SAO DOIS `SELECT EXISTS` SEPARADOS, e nunca um
-- unico predicado com uma lista de modos servindo aos dois caminhos. Um predicado
-- compartilhado e como, numa edicao futura, o caminho destrutivo herda EM SILENCIO
-- a permissao do caminho reversivel — basta alguem acrescentar um modo a lista. A
-- assimetria nao e nova: e a mesma que a metade (b) ja tem desde o 45-13
-- (`20260805000006:390-403`), onde o `ELSE` destrutivo exige `administrador` ou o
-- dono e o ramo de leitura aceita tambem `rh`. Nenhuma capacidade destrutiva ganha
-- permissao nova aqui: o que o ramo passa a autorizar fora de `live` e um caminho
-- cujo efeito o Postgres reverte por construcao, porque ele termina no `RAISE` do
-- terminador de dry-run.
--
-- **DIVERGENCIA 2 — o bloco de auto-verificacao pergunta por INSERT, e nao so por
-- UPDATE.** O precedente (`20260805000006:1004-1006`) pergunta apenas pela escrita
-- de DUAS COLUNAS de uma linha que o motor ja criou. Aqui a pergunta tem de ser
-- mais larga, e a razao e estrutural: quem puder **INSERIR** em `purga_execucoes` e
-- em `purga_execucao_itens` fabrica o estado autorizante do zero — nao precisa
-- editar linha nenhuma. Perguntar so por UPDATE deixaria a porta mais obvia aberta.
--
-- **DIVERGENCIA 3 — `retencao_hold` entra na MESMA pergunta, embora o guard nao a
-- leia.** Levantado pelo plano 46-03 e nao previsto pelo 46-04: com a tabela viva,
-- **liberar um hold (carimbar `liberado_em`) passou a ser o passo que falta entre
-- "registro sob litigio" e "registro apagado irreversivelmente"**. Quem escreve
-- `liberado_em` nao chama esta funcao — devolve a candidatura ao conjunto
-- elegivel, e o cron faz o resto. E uma superficie de destruicao IRREVERSIVEL por
-- caminho indireto, e ela merece a mesma asserção de catalogo que a direta.
-- `config_purga` entra pelo mesmo raciocinio, e nele o caminho e DIRETO: `modo` e
-- lido dentro do proprio predicado do ramo novo.
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
-- ⚠ ESTA MIGRATION MUDA O `md5(prosrc)` DE `anonimizar_candidato`. O pin
-- `8c86e0f040219e7eade47eb587dbf5de` de `p45_motor_exclusao_smoke.sql` (assercao
-- C3) e re-carimbado no MESMO commit, com conferencia CRUZADA vivo × arquivo, e
-- o valor antigo permanece no bloco de PROVENIENCIA como historico. Um commit
-- intermediario em que esta migration exista e o pin ainda aponte para o corpo
-- antigo e um estado em que o portao esta mecanicamente vermelho por construcao do
-- proprio repositorio (CLAUDE.md §"Portoes").
--
-- As especs executaveis sao `supabase/tests/p46_purga_smoke.sql` assercao (o) — as
-- QUATRO recusas do ramo novo mais a UMA aceitacao — e `p45_motor_exclusao_smoke.sql`
-- (C3). Elas sao CONTRATO: se algo divergir, corrige-se ESTA migration, nunca o
-- smoke.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · `public.anonimizar_candidato(uuid, boolean)` — corpo INTEIRO, com UMA
--     mudanca: o quarto ramo autorizado do guard.
-- ---------------------------------------------------------------------------
-- ⚠ O corpo abaixo e a copia fiel do arquivo `20260805000006`, conferida por md5
-- antes da edicao (secao 2 do cabecalho). As unicas diferencas em relacao aquele
-- arquivo estao marcadas com `46-04` e sao TRES, todas na regiao do guard:
--   (p)  o calculo das duas metades do ramo novo, ANTES da metade (a);
--   (a)(b)(c)  cada metade ganha a alternativa do ramo novo — a metade (a)
--        mantendo a mensagem VERBATIM, as metades (b) e (c) com a mensagem
--        ESTENDIDA para nomear a quarta condicao. Uma mensagem de recusa que nao
--        menciona o caminho da purga faria a proxima pessoa procurar o defeito no
--        lugar errado as tres da manha.
-- Nada mais do corpo foi tocado: nem os passos do tombstone, nem as sentinelas,
-- nem o terminador do dry-run, nem o objeto de retorno.
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
  --   promessa passa a ser imposta pelo CODIGO. **O ramo existe para autorizar O
  --   CRON, e o cron se caracteriza por nao ter sessao** — um chamador COM claim
  --   volta a ser julgado por (b) e por (c), como sempre foi.
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
  UPDATE public.decisao_final d
     SET justificativa = '[justificativa preservada de forma desidentificada a pedido do titular — o texto original foi removido; a decisao permanece registrada como prova de que houve avaliacao humana (LGPD Art. 7o, VI / RNF-07a)]'
   WHERE d.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_df = ROW_COUNT;

  -- ⚠⚠ ESTE É O ÚLTIMO STATEMENT A TOCAR O PAR, E A ORDEM É O MECANISMO.
  -- O `UPDATE` acima acabou de disparar `trg_decisao_final_snapshot` (AFTER UPDATE,
  -- FOR EACH ROW, SEM `WHEN`), que inseriu no arquivo uma linha nova carregando
  -- `OLD.justificativa` — a PII que o statement anterior removeu da linha corrente.
  -- Fazer este scrub ANTES deixaria essa linha recém-criada identificável atrás
  -- dele. Ver o bloco (3) do cabeçalho.
  UPDATE public.decisao_final_historico h
     SET justificativa = '[justificativa arquivada, preservada de forma desidentificada a pedido do titular — LGPD Art. 7o, VI / RNF-07a]'
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
  UPDATE public.ai_call_logs l
     SET candidato_id     = NULL,
         parsed_reasoning = NULL,
         raw_response     = '{"redigido":"anonimizacao_p45"}'::jsonb
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
    RAISE EXCEPTION 'P45 DRY-RUN concluido: o corpo COMPLETO da anonimizacao executou e esta sendo revertido agora. Nada foi persistido. candidatos=% candidaturas_cv=% decisao_final=% decisao_final_historico=% historico_ator=% ai_call_logs=% candidate_ai_decisions=% logs_acesso=% recruiter_alerts=% autorizacoes=% preferencias_notificacoes=% notificacoes_enviadas=%. Para executar de verdade, chame com p_dry_run := false — o modo seguro e o DEFAULT, e apagar exige dize-lo',
      v_n_cand, v_n_cvurl, v_n_df, v_n_dfh, v_n_hist, v_n_aicall, v_n_aidec, v_n_logs,
      v_n_alerts, v_n_aut, v_n_pref, v_n_notif
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
                                                    'decisao_final_historico', v_n_dfh),
      'severar_user_id',         jsonb_build_object('candidatos', v_n_cand,
                                                    'candidaturas_autoria', v_n_cvurl,
                                                    'historico_candidatura_ator', v_n_hist),
      'severar_fks_set_null',    jsonb_build_object('ai_call_logs', v_n_aicall,
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

-- ---------------------------------------------------------------------------
-- 2 · ACL — REVOKE nominal e so entao o GRANT minimo
-- ---------------------------------------------------------------------------
-- ⚠ `CREATE OR REPLACE` NAO repoe grants, entao este bloco e estritamente
-- redundante hoje. Reemiti-lo e barato e o `pg_default_acl` do schema `public`
-- deste projeto e agressivo o bastante para justificar a redundancia: ele concede
-- EXECUTE a `anon` e `authenticated` como grants DIRETOS E NOMEADOS em todo
-- `CREATE FUNCTION` (medicao de 2026-07-30: 61 funcoes DEFINER com EXECUTE para
-- `anon`, 39 delas chamaveis via PostgREST). `REVOKE ... FROM PUBLIC` sozinho
-- removeria um grant que nunca existiu e deixaria `anon=X` de pe.
--
-- ⚠⚠ ORDEM DE REPOSITORIO **NAO** E ORDEM DE APPLY, E ESSA CONFUSAO JA CUSTOU UM
-- BLOCKER NESTE ARQUIVO (BL-01 do `46-REVIEW.md`). A versao anterior desta secao
-- afirmava que a `20260805000009` concede EXECUTE a `authenticated` "depois desta
-- linha na ordem de aplicacao do repositorio" e que portanto o `REVOKE` abaixo
-- "nao revoga na pratica". **Isso e falso, e o argumento e que fez o defeito
-- passar.** Numa reconstrucao do zero seria verdade; num apply INCREMENTAL contra
-- o banco vivo — que e o unico apply que vai acontecer — a `20260805000009` esta
-- aplicada desde 2026-08-05, o `REVOKE` abaixo roda DEPOIS dela, e sem o `GRANT`
-- da linha seguinte o titular que exerce o Art. 18 recebe 42501 e o motor NAO
-- RODA. Seria o `DI-45-10-01` reintroduzido em producao por uma migration cujo
-- escopo negativo promete nao tocar em nada.
--
-- ⚠ A LINHA DE BASE REAL, RECOMPOSTA POR INTEIRO E COM A PROVENIENCIA DE CADA
-- GRANTEE — e o `REVOKE` continua NOMEANDO `anon`, que e a metade que morde:
--   · `anon` e `PUBLIC` — REVOGADOS. O `pg_default_acl` do schema `public` deste
--     projeto concede EXECUTE a `anon` como grant DIRETO E NOMEADO em todo
--     `CREATE FUNCTION` (medicao de 2026-07-30: 61 funcoes DEFINER com EXECUTE
--     para `anon`, 39 chamaveis via PostgREST). `REVOKE ... FROM PUBLIC` sozinho
--     removeria um grant que nunca existiu e deixaria `anon=X` de pe.
--   · `service_role` — `20260805000006:836`. O caminho do cron e das EFs de
--     servico.
--   · `authenticated` — **`20260805000009:179-180`** (plano 45-12 / `DI-45-10-01`).
--     A EF `executar-direito-titular` chama o motor com o `Authorization` do
--     titular, e o PostgREST deriva o PAPEL do MESMO JWT que carrega as claims:
--     a chamada chega como `authenticated`, nao como `service_role`. Sem este
--     grant o direito de exclusao do titular para de funcionar.
--     ⚠ O portao `p45_motor_exclusao_smoke.sql` (C1) EXIGE este grant e ficaria
--     vermelho sem ele — e o proprio smoke avisa que revogar "para consertar um
--     vermelho anterior" e o conserto na direcao errada (45-REVIEW-4 / CR-02).
--
-- Quem passa continua sendo decidido pelo guard do CORPO, e nao pelo ACL: o ACL
-- abre a porta ao papel, o guard decide quem entra. E desde o BL-02 o 4o ramo so
-- vale para chamador SEM sessao, entao alcancar a funcao como `authenticated` nao
-- da acesso nenhum ao caminho da purga.
REVOKE ALL ON FUNCTION public.anonimizar_candidato(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3 · Auto-verificacao: O PRESSUPOSTO DE SEGURANCA DO 4o RAMO VIRA ASSERCAO
--     DE CATALOGO, E O APPLY PARA ANTES DE CRIAR A PORTA
-- ---------------------------------------------------------------------------
-- ⚠⚠ ESTE E O BLOCO MAIS IMPORTANTE DESTE ARQUIVO, e ele e o espelho de
-- `20260805000006:988-1028`, onde a MESMA pergunta e feita ao catalogo sobre
-- `solicitacoes_dados`.
--
-- O 4o ramo transfere confianca para QUATRO tabelas, e a lista abaixo diz de cada
-- uma o que exatamente ela passa a autorizar:
--
--   · `purga_execucoes`      — quem carimba `situacao = executando` e
--     `modo_vigente = live` autoriza o caminho DESTRUTIVO desta funcao. Direto.
--   · `purga_execucao_itens` — quem cria um item para um `candidato_id` com
--     `concluido_em` nulo escolhe QUEM sera destruido. Direto.
--   · `config_purga`         — `modo` e lido DENTRO do predicado do ramo novo:
--     quem escreve `live` ali liga a metade destrutiva. Direto.
--   · `retencao_hold`        — INDIRETO, e por isso mesmo o mais facil de esquecer
--     (levantado pelo plano 46-03, nao previsto pelo 46-04). Quem carimba
--     `liberado_em` NAO chama esta funcao: devolve a candidatura ao conjunto
--     elegivel do predicado, e o cron faz o resto. **Liberar um hold passou a ser
--     o passo que falta entre "registro sob litigio" e "registro apagado
--     irreversivelmente".** Uma superficie de destruicao irreversivel por caminho
--     indireto merece a mesma assercao de catalogo que a direta.
--
-- ⚠ A PERGUNTA E AO CATALOGO, E A COMPOSICAO IMPORTA. O `GRANT` de tabela sozinho
-- NAO e a capacidade de escrever: as quatro tabelas tem RLS LIGADA com UMA unica
-- policy de SELECT e ZERO caminho de escrita (medido no 46-02 e no 46-03), e no
-- Supabase o `authenticated` costuma receber os privilegios de tabela por default
-- no schema `public`. Abortar so pelo `GRANT` reprovaria uma configuracao CORRETA
-- — e um gate que reprova o comportamento certo treina quem executa a desliga-lo.
-- Entao o apply aborta quando o papel PODE DE FATO ESCREVER: tem o privilegio
-- **E** (a RLS esta desligada **OU** existe policy que o alcance).
--
-- ⚠ DIVERGENCIA DELIBERADA DO PRECEDENTE: a pergunta inclui **INSERT**, e nao so
-- UPDATE. O precedente pergunta pela escrita de duas colunas de uma linha que o
-- motor ja criou; aqui, quem puder INSERIR em `purga_execucoes` e em
-- `purga_execucao_itens` fabrica o estado autorizante DO ZERO, sem editar linha
-- nenhuma. Perguntar so por UPDATE deixaria aberta a porta mais obvia. Para
-- `retencao_hold` os verbos perigosos sao UPDATE (liberar) e DELETE (sumir com o
-- hold), e sao esses os perguntados.
--
-- ⚠ AS DUAS METADES SAO OBRIGATORIAS, e a segunda nao e cerimonia: quando o
-- privilegio existe mas a RLS esta ligada e nao ha policy que alcance, o bloco
-- AVISA em vez de abortar, e o aviso declara que **a RLS daquela tabela virou
-- parte do guard desta funcao**. Um alarme parcial que aborta treina quem executa
-- a desliga-lo; um que avisa e registra a dependencia e o que o precedente faz.
DO $verifica_guard_purga$
DECLARE
  r_alvo   record;
  v_priv   boolean;
  v_rls_on boolean;
  v_pol    boolean;
  v_verbo  text;
  v_col    text;
  v_falta  text;
  v_papel  text;
  -- ⚠⚠ HI-02 do `46-REVIEW.md`: A PERGUNTA E FEITA PARA `anon` TAMBEM, E NAO SO
  --    PARA `authenticated`. O `REVOKE` das funcoes deste plano NOMEIA `anon`
  --    porque o `pg_default_acl` deste schema concede a ele como grant DIRETO
  --    (P42-06). O bloco de catalogo — que e o mecanismo que transforma o
  --    pressuposto em assercao — nao aplicava a mesma licao: uma policy
  --    `FOR INSERT TO anon` em `purga_execucao_itens` nao casaria em nenhuma das
  --    tres perguntas, o apply NAO abortaria, e o ramo que decide QUEM sera
  --    destruido ficaria aberto a `anon` sem nenhum portao falar.
  v_papeis constant text[] := ARRAY['authenticated', 'anon'];
BEGIN
  -- ── PRECONDICAO: as quatro tabelas existem ────────────────────────────────
  -- Sem elas o corpo acima referencia relacao inexistente e o erro cru do
  -- Postgres nao diria qual migration falta. Falhar no apply e a forma barata.
  v_falta := NULL;
  IF pg_catalog.to_regclass('public.config_purga') IS NULL THEN
    v_falta := 'public.config_purga (migration 20260823000001)';
  ELSIF pg_catalog.to_regclass('public.purga_execucoes') IS NULL
     OR pg_catalog.to_regclass('public.purga_execucao_itens') IS NULL THEN
    v_falta := 'public.purga_execucoes e/ou public.purga_execucao_itens (migration 20260823000002)';
  ELSIF pg_catalog.to_regclass('public.retencao_hold') IS NULL THEN
    v_falta := 'public.retencao_hold (migration 20260823000005)';
  END IF;

  IF v_falta IS NOT NULL THEN
    RAISE EXCEPTION 'P46-GUARD: % NAO existe — o 4o ramo do guard LE o estado dessas tabelas (ou depende dele), e sem elas ele nao existe. Aplicar as migrations 20260823000001..5 ANTES desta. O apply para AQUI porque um guard que referencia relacao inexistente falharia na PRIMEIRA chamada real, quando ja nao ha ninguem lendo o log', v_falta;
  END IF;

  -- ── A PERGUNTA, TABELA POR TABELA ─────────────────────────────────────────
  -- A lista e ESCOPO DELIBERADO, e nao fotografia do catalogo: sao exatamente as
  -- quatro tabelas de que a autorizacao desta funcao passa a depender. Uma tabela
  -- nova em `public` nao pertence a esta lista; uma leitura nova dentro do ramo
  -- do guard, sim — e acrescenta-la aqui e obrigacao de quem a escrever.
  FOR r_alvo IN
    SELECT *
      FROM (VALUES
        ('purga_execucoes',
         ARRAY['INSERT','UPDATE'],
         ARRAY['situacao','modo_vigente'],
         'quem carimba situacao = executando e modo_vigente = live AUTORIZA o caminho destrutivo desta funcao'),
        ('purga_execucao_itens',
         ARRAY['INSERT','UPDATE'],
         ARRAY['candidato_id','concluido_em'],
         'quem cria um item aberto para um candidato_id ESCOLHE quem sera destruido'),
        ('config_purga',
         ARRAY['INSERT','UPDATE'],
         ARRAY['modo'],
         'modo e lido DENTRO do predicado do 4o ramo: escrever live ali liga a metade destrutiva'),
        ('retencao_hold',
         ARRAY['UPDATE','DELETE'],
         ARRAY['liberado_em'],
         'CAMINHO INDIRETO: liberar um hold devolve a candidatura ao conjunto elegivel, e o cron faz o resto — e o passo que falta entre registro sob litigio e registro apagado irreversivelmente')
      ) AS t(tabela, verbos, colunas, razao)
  LOOP
    v_priv := false;

    FOREACH v_papel IN ARRAY v_papeis LOOP
      FOREACH v_verbo IN ARRAY r_alvo.verbos LOOP
        IF has_table_privilege(v_papel, 'public.' || r_alvo.tabela, v_verbo) THEN
          v_priv := true;
        END IF;
      END LOOP;

      -- Privilegio de COLUNA e caminho proprio: um GRANT por coluna nao aparece
      -- em `has_table_privilege`, e as colunas listadas sao exatamente as que
      -- autorizam. `has_column_privilege` nao existe para DELETE — a pergunta por
      -- coluna e sempre de UPDATE, que e o verbo com que se carimba um estado.
      FOREACH v_col IN ARRAY r_alvo.colunas LOOP
        IF has_column_privilege(v_papel, 'public.' || r_alvo.tabela, v_col, 'UPDATE') THEN
          v_priv := true;
        END IF;
      END LOOP;
    END LOOP;

    SELECT c.relrowsecurity INTO v_rls_on
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = r_alvo.tabela;

    -- ⚠ HI-02: `p.roles && ARRAY[...]` — sobreposicao de conjuntos, e nao
    -- igualdade com UM papel. Cobre `authenticated`, `anon` e o `public` que uma
    -- policy sem clausula `TO` produz. `p.roles` e `name[]`, entao o literal e
    -- convertido explicitamente.
    SELECT EXISTS (
      SELECT 1
        FROM pg_policies p
       WHERE p.schemaname = 'public'
         AND p.tablename  = r_alvo.tabela
         AND (p.cmd = ANY (r_alvo.verbos) OR p.cmd = 'ALL')
         AND p.roles && ARRAY['authenticated', 'anon', 'public']::name[]
    ) INTO v_pol;

    IF coalesce(v_priv, false)
       AND (coalesce(v_rls_on, false) = false OR coalesce(v_pol, false)) THEN
      RAISE EXCEPTION 'P46-GUARD: um papel de CLIENTE (authenticated ou anon) PODE ESCREVER em public.% (privilegio=%, rls_ligada=%, policy_que_alcanca=%). O 4o ramo do guard de anonimizar_candidato acaba de perder o valor: %. A partir dai o GRANT EXECUTE a authenticated da 20260805000009 volta a ser uma porta por PostgREST para destruir PII fora do motor (CR-01), agora pela via da purga. O apply para AQUI, ANTES de criar essa porta. Saidas honestas: remover a policy/privilegio de escrita daquela tabela, ou retirar o 4o ramo e replanejar o caminho de chamada do cron. ⚠ A saida que NAO existe e apagar este bloco',
        r_alvo.tabela, v_priv, v_rls_on, v_pol, r_alvo.razao;
    END IF;

    IF coalesce(v_priv, false) THEN
      RAISE NOTICE 'P46-GUARD: um papel de cliente (authenticated e/ou anon) tem GRANT de escrita em public.%, mas a RLS esta LIGADA e nao ha policy que o alcance — a escrita e barrada pela RLS. ⚠ ISSO TORNA A RLS DAQUELA TABELA PARTE DO GUARD desta funcao: criar uma policy de escrita ali passa a ser uma mudanca de SEGURANCA do tombstone, e este apply abortaria da proxima vez. Razao pela qual a tabela esta na lista: %',
        r_alvo.tabela, r_alvo.razao;
    END IF;
  END LOOP;

  -- ⚠⚠ ME-03 do `46-REVIEW.md` — O ESCOPO HONESTO DESTE BLOCO, DITO EM VOZ ALTA.
  -- Ele pergunta pelos papeis de CLIENTE. Ele NAO fecha, e nao pode fechar, a via
  -- do `service_role` e do `postgres`: os dois bypassam RLS por desenho e sao hoje
  -- os UNICOS papeis que conseguem carimbar `liberado_em` em `retencao_hold` ou
  -- fabricar um item em `purga_execucao_itens`. Ou seja: a ameaca nomeada no
  -- cabecalho deste arquivo — "liberar um hold e o passo que falta entre registro
  -- sob litigio e registro apagado irreversivelmente" — **continua aberta pela via
  -- do service key**, sem RPC auditada e sem trilha. Dizer "assercao, nao
  -- confianca" sobre a superficie que NAO carrega o risco seria a pior forma de
  -- falso conforto, entao o NOTICE declara as duas coisas.
  RAISE NOTICE 'P46-GUARD: auto-verificacao EXECUTADA sobre as quatro tabelas (purga_execucoes, purga_execucao_itens, config_purga, retencao_hold), perguntando por authenticated E anon. Um apply que NAO tenha emitido este NOTICE nao exercitou o bloco, e um bloco nao exercitado e indistinguivel de um bloco ausente. ⚠ ESCOPO HONESTO: este bloco cobre os papeis de CLIENTE. service_role e postgres bypassam RLS por desenho e continuam podendo escrever nas quatro — e por isso a RPC AUDITADA de escrita em retencao_hold e PRE-CONDICAO do flip dry_run -> live, e nao melhoria posterior: hoje um comprometimento de service key libera um hold sem deixar trilha, e o cron faz o resto';
END
$verifica_guard_purga$;


-- ---------------------------------------------------------------------------
-- 4 · COMMENT ON FUNCTION — o texto vivo, PRESERVADO, mais o 4o ramo
-- ---------------------------------------------------------------------------
-- ⚠ O texto abaixo e o `COMMENT` vivo da `20260805000006` COPIADO VERBATIM, com
-- exatamente duas emendas: o paragrafo do guard passa de TRES para QUATRO metades,
-- e um bloco novo no fim declara o ramo da purga e a dependencia de seguranca que
-- ele cria. Reescrever o texto inteiro teria descartado prosa paga com quatro
-- rodadas de code review e um incidente medido em producao — e o `COMMENT` e o
-- unico lugar DENTRO DO BANCO onde essas razoes existem.
COMMENT ON FUNCTION public.anonimizar_candidato(uuid, boolean) IS
  'Phase 45 / ERASE-02 + ERASE-08 + ERASE-09 + ERASE-10: O TOMBSTONE. Desidentifica o titular '
  'in-place e severa os ponteiros que resolveriam de volta ate a pessoa, TUDO EM UMA TRANSACAO. '
  'Devolve jsonb com resultado, o plano e as contagens por passo. VOLATILE SECURITY DEFINER com '
  'search_path vazio; delimitador NOMEADO para que md5(prosrc) seja extraivel pelo smoke. '
  '⚠ p_dry_run tem DEFAULT true: o modo SEGURO e o padrao, e apagar exige dize-lo. O dry-run '
  'executa o MESMO corpo do delete real e termina nele com RAISE EXCEPTION USING ERRCODE = P45DR, '
  'que reverte tudo. Nunca dois corpos, nunca IF p_dry_run THEN <query A> senao <query B> — essa '
  'forma e o parente direto do CR-02 da P39, uma guarda que era dead code. O ERRCODE e proprio '
  'para que o chamador distinga "dry-run concluido" de erro real. '
  '⚠⚠ E A INTENCAO E NORMALIZADA UMA UNICA VEZ, NO DECLARE, PARA O LADO SEGURO (45-14 / '
  'BL-01): v_dry_run := coalesce(p_dry_run, true), e o corpo inteiro le v_dry_run — o '
  'parametro cru NAO e consultado em lugar nenhum. Razao medida: p_dry_run e um booleano '
  'de TRES valores e o DEFAULT true NAO protege contra NULL EXPLICITO (o PostgREST '
  'converte um null JSON no argumento nomeado). Com o parametro cru, os tres IF do corpo '
  'avaliavam NULL e NENHUM era tomado: IF p_dry_run caia no ELSE (o ramo DESTRUTIVO da '
  'metade (b)), IF NOT p_dry_run nao rodava a metade (c) (o guard de INTENCAO), e o '
  'IF p_dry_run do terminador nao levantava P45DR — a transacao COMMITAVA. Uma unica '
  'chamada destruia a PII do titular sem pedido, fora da janela do ERASE-06, sem recibo e '
  'sem trilha; e pior que antes do 45-13, porque sem linha em solicitacoes_dados o '
  'reencontro do CR-03 nao acha nada e o curriculo fica orfao no bucket para sempre. E o '
  'MESMO defeito NULL-aberto que esta funcao proibe em NOT IN, no parametro em vez de na '
  'coluna. ⚠ POR QUE NULL RESOLVE PARA SEGURO E NAO PARA RECUSA: destruir PII sobre uma '
  'intencao NAO DECLARADA e o desfecho que o portao inteiro desta fase existe para '
  'impedir; true nao persiste nada e o chamador recebe P45DR, que e alto e distinguivel. '
  '⚠ UM LUGAR SO: tres coalesce espalhados pelos tres sitios e como um QUARTO sitio nasce '
  'sem ele. Uma leitura nova de p_dry_run no corpo e a regressao a procurar em qualquer '
  'diff futuro, e o bloco de auto-verificacao (vi.d) a pega — chamada com NULL sob claims '
  'de administrador tem de terminar em P45DR, com a linha inalterada. '
  '⚠ CHAMA public.plano_exclusao_titular(uuid) e NAO copia o corpo dela: o dry-run e o delete real '
  'saem da MESMA expressao. A assercao C3 do smoke exige que pg_get_functiondef desta funcao '
  'CONTENHA a chamada, e pina o md5(prosrc) das duas. Com PITR desligado (D-45-10) e o backup de 7 '
  'dias excluindo Storage, o dry-run nao e processo: e a UNICA rede desta fase. '
  '⚠ O DRY-RUN TEM DUAS TERMINACOES, E ELAS SAO CONTRATO (WR-05): numa linha VIVA ele termina o '
  'corpo com RAISE EXCEPTION USING ERRCODE = P45DR; numa linha que JA e tombstone ele RETORNA '
  'normalmente com resultado = ja_anonimizado, porque o ramo de idempotencia devolve ANTES do '
  'IF p_dry_run. Quem for medir o SQLSTATE do dry-run (Task 1 do 45-11) precisa exercitar uma linha '
  'com ja_anonimizado = false no plano ANTES da chamada — plano_exclusao_titular ja devolve essa '
  'chave. Sem essa distincao escrita, o gate mede um retorno normal e registra evidencia AMBIGUA no '
  'exato item que ele existe para tornar inequivoco. '
  '⚠ IDEMPOTENCIA POR ESTADO, nunca por try/catch: o predicado RECONHECE o tombstone e devolve '
  'ja_anonimizado sem mutar coluna alguma e sem criar linha de auditoria. Apagar de novo '
  '"porque nao da erro" funciona por acidente e para de funcionar no dia em que a enumeracao '
  'devolver algo novo — e nesse dia a evidencia de que ja tinha rodado nao existe. '
  '⚠⚠ E O RECONHECIMENTO E POR IGUALDADE COM O VALOR DERIVADO DO ID DESTA LINHA, NUNCA POR PADRAO '
  'SOBRE A COLUNA email (CR-06, corrigido pelo 45-13). email e escrita pelo usuario no cadastro e a '
  'check_email_format viva aceita qualquer endereco do namespace de anonimizacao — nada valida o '
  'dominio. Com casamento por padrao, quem se cadastrasse assim receberia ja_anonimizado com 100% '
  'da PII intacta, a Edge Function carimbaria postgres_concluido_em, apagaria a conta do Auth e '
  'mandaria o recibo: uma declaracao de conformidade FALSA. CINTO SECUNDARIO, porque a igualdade '
  'sozinha depende de p_candidato_id nunca mudar: o no-op tambem exige user_id JA severado e '
  'data_nascimento JA na sentinela de 1900 — uma linha meio anonimizada nao e um tombstone. '
  'MAPA passo_motor -> statements (PASSOS_MOTOR de reciboExclusao.ts): '
  'tombstone_candidato = os DOIS updates em candidatos (faixa etaria PRIMEIRO, depois as '
  'sentinelas) MAIS o update em candidaturas que anula curriculo_url e '
  'curriculo_nome_original; tombstone_decisao_final = update em decisao_final e, DEPOIS dele, o '
  'scrub de decisao_final_historico; severar_user_id = user_id/created_by/updated_by em candidatos, '
  'created_by/updated_by em candidaturas, mais historico_candidatura.ator; severar_fks_set_null = '
  'os cinco updates das tabelas do ERASE-09 mais preferencias_notificacoes; '
  'scrub_ledger_email = update em notificacoes_enviadas. storage_remove e auth_delete_user sao de '
  'FORA do banco (45-10). '
  '⚠⚠ CR-04 — candidaturas.curriculo_url E curriculo_nome_original SAO SEVERADAS, e as LINHAS '
  'ficam. As linhas de candidaturas sao preservadas por desenho (ERASE-08) e nada aqui as remove; '
  'mas essas duas colunas nao sao trilha de decisao. curriculo_url embute o auth.uid() EM CLARO '
  '(esquema {authUid}/{uuid}.pdf, cvUploadService.ts:101) e resolve de volta ate auth.users por '
  'split_part + join, devolvendo a identidade COMPLETA do titular "anonimizado" por UMA linha; '
  'curriculo_nome_original costuma carregar o NOME da pessoa e e selecionada pela view do painel de '
  'triagem do RH (20260623000001:24). A ordem e segura por construcao: o passo 0 da Edge Function '
  'LE curriculo_url para montar o plano, e a EF so chama esta funcao no passo 2. NADA MAIS de '
  'candidaturas e tocado: encerrada_a_pedido_em e do D-45-13, etapa_atual tem um unico escritor '
  'desde o M2/Phase 6, e deleted_at faria a linha sumir de cinco leituras do RH em silencio. '
  '⚠⚠ CR-05 — preferencias_notificacoes.created_by/updated_by SAO SEVERADAS na mesma transacao. As '
  'duas sao FKs NO ACTION para auth.users e a SONDA 6 mediu created_by como o bloqueador REAL do '
  'deleteUser na conta hibrida candidato+RH que existe em PROD. Sem esta severacao o 23503 acontece '
  'no passo 3, DEPOIS de o curriculo ter sido apagado. usuario_rh_id NAO e tocada: ela nao aponta '
  'para auth.users. A nullability das QUATRO colunas novas e MEDIDA pelo bloco de auto-verificacao '
  'antes do apply — se alguma virasse NOT NULL, a saida seria sentinela, nunca desistir da '
  'severacao, porque um UPDATE que aborta apos o Storage e o Pitfall 1. '
  '⚠⚠ ORDEM QUE E MECANISMO, EM DOIS PONTOS. (1) faixa_etaria_materializada e escrita ANTES da '
  'sentinela de data_nascimento: gerar_bias_snapshot deriva a idade por JOIN vivo, toda data no '
  'passado tem idade, e materializar depois gravaria a faixa do ano 1900 — a serie EEOC 4/5 '
  'mudaria RETROATIVAMENTE (ERASE-01 / SC#5). (2) o scrub de decisao_final_historico e o ULTIMO '
  'statement a tocar o par, DEPOIS do update em decisao_final: trg_decisao_final_snapshot '
  '(20260709000011:105-118) e AFTER UPDATE FOR EACH ROW SEM clausula WHEN e insere OLD.justificativa '
  'no arquivo, ou seja o proprio update de anonimizacao RECRIA no historico a PII que acabou de '
  'remover da linha corrente. Fazer o scrub antes deixa uma linha identificavel recem-criada atras '
  'dele. O operador antecipou isto ao travar a BD-9: "o historico entrega o que a linha corrente '
  'protege". '
  '⚠ NENHUMA SENTINELA FOI ESCOLHIDA POR PARECER RAZOAVEL — cada uma foi escolhida contra a lista '
  'de constraints lida do catalogo VIVO (45-SONDAS-PROD.md SONDA 1, 2026-08-05), nunca contra '
  'docs/sql/sql/02-tabela-candidatos.sql, que e de 2025 e diverge em pelo menos cpf. '
  'email: NOT NULL + UNIQUE + check_email_format -> sentinela UNICA POR LINHA e no formato (uma '
  'sentinela FIXA colidiria na SEGUNDA exclusao e abortaria a transacao de quem pediu depois). '
  'celular: NOT NULL + check_celular_format -> (00) 00000-0000. '
  'data_nascimento: NOT NULL + check_data_nascimento -> 1900-01-01, escolhida tambem para CAIR '
  'FORA de qualquer faixa etaria real, senao a busca por faixa + UF + vaga + timestamp reacha o '
  'titular (assercao B9). '
  'cpf, genero e como_conheceu: NULAVEIS no catalogo vivo -> NULL (check sobre NULL e NULL). '
  'como_conheceu tem a SETIMA CHECK, check_como_conheceu, que a pesquisa nao previu. '
  'nome_completo e cidade: NOT NULL sem CHECK -> marcadores livres. '
  'linkedin/instagram: sao QUATRO colunas (dois pares duplicados) -> NULL. avatar_url idem. '
  '⚠ estado E PRESERVADA, E A ALTERNATIVA FOI RECUSADA EXPLICITAMENTE: a coluna e bpchar NOT NULL '
  'com check_estado aceitando as 27 UFs, e NAO EXISTE valor removido valido. Mexer na CHECK dentro '
  'de uma fase irreversivel e risco maior que o dado retido; a UF sozinha nao re-identifica, e o '
  'que fecha o vetor de re-identificacao e a faixa etaria deixar de casar (ERASE-01). '
  '⚠ candidate_ai_decisions declara candidato_id E vaga_id NOT NULL com clausula SET NULL — '
  'contradicao estrutural que nunca pode ser cumprida (achado M2). ESCOLHA REGISTRADA: '
  'desidentificar o CONTEUDO (ai_reasoning_summary), nao afrouxar as colunas, porque a fase foi '
  'desenhada para conter UMA unica migration destrutiva de schema. O corpo LE attnotnull ao vivo: '
  'se alguem afrouxar a coluna depois, o mesmo statement passa a severar o ponteiro tambem. '
  '⚠ OS DOIS inet SAO TRUNCADOS, NUNCA ANULADOS: logs_acesso.ip_address e inet NOT NULL e NULL '
  'abortaria a transacao inteira. network(set_masklen(...)) zera os bits de host de verdade; '
  'set_masklen sozinho preservaria o endereco completo e seria mascaramento de fachada. '
  '⚠ dedupe_key E RE-NAMESPACEADA (formato evento:candidatura_id:purgado-id, e a coluna e UNIQUE): '
  'sem isso um recadastro futuro colide, o claim ON CONFLICT DO NOTHING RETURNING id volta VAZIO, '
  'e o e-mail legitimo NUNCA E ENVIADO, sem erro em lugar nenhum (Pitfall 8, item 2). '
  '⚠ EFEITO COLATERAL REGISTRADO: com historico_candidatura.ator nulo a linha passa a PARECER '
  'escrita pelo sistema. auto_rejeitado e boolean ARMAZENADO, entao a prova RNF-07a sobrevive, mas '
  'qualquer leitor que derive "foi o sistema" de ator IS NULL passa a mentir — dependencia '
  'declarada da W-1/CONSOL-02 da Phase 47. '
  '⚠ O QUE ESTA FUNCAO NUNCA FAZ: nao remove linha de tabela alguma; nao toca as 3 FKs NO ACTION '
  'da trilha de decisao (o 23503 e o schema fazendo o trabalho certo, e afrouxar a constraint e o '
  'atalho que o ERASE-08 proibe); nao anula decisao_final.justificativa nem '
  'decisao_final_historico.justificativa (as duas sao NOT NULL e sao PRESERVADAS ANONIMIZADAS por '
  'D-45-02/D-45-03 — o texto sobrevive como prova de nao-discriminacao, o vinculo nao); nao toca '
  'deleted_at nem ativo (5 leituras de RH filtram por deleted_at e um soft delete faria a linha '
  'sumir de todas em silencio). '
  '⚠ NAO ESCREVE EM logs_auditoria, E A RAZAO E MEDIDA — NAO E NEUTRALIDADE: os dois enums daquela '
  'tabela (categoria_log_auditoria, severidade_log) nunca puderam ser medidos por esta fase, e um '
  'valor inventado abortaria a anonimizacao INTEIRA no pedido real, DEPOIS de o curriculo ja ter '
  'sido apagado do Storage — trocar um defeito de rastreabilidade por um defeito irreversivel '
  '(Pitfall 1). A TRILHA QUE EXISTE NO LUGAR e o bloco executor do retorno (papel lido da claim, '
  'booleano foi_o_titular, e o uid APENAS quando o executor NAO e o titular), que a Edge Function '
  'persiste no plano e que sobrevive ao fecho do pedido, mais o recibo e as colunas de estado de '
  'solicitacoes_dados. O uid do TITULAR fica de fora porque ele e o identificador que esta exclusao '
  'existe para apagar: grava-lo no registro que PROVA a exclusao seria o CR-04 com outra cara. A '
  'lacuna restante e o item diferido DI-45-13-01, nomeado, e nao silencio. '
  '⚠ WR-06: quando candidatos.user_id ja e NULL sem que a linha seja tombstone (estado que a FK '
  'SET NULL da 20260805000004 CRIA), as severacoes guardadas por user_id nao acontecem. A funcao '
  'levanta RAISE WARNING nomeando logs_acesso.email_tentativa, logs_acesso.ip_address e '
  'autorizacoes.ip_aceite, e devolve severacao_por_user_id = false — para que zero deixe de ser '
  'lido como "nao havia". '
  '⚠ OBRIGACAO DO CHAMADOR: o guard le a CLAIM (auth.uid e app_metadata.role), nao o papel do '
  'banco. Um cliente service_role SEM Authorization de usuario tem auth.uid() NULO e recebe 42501 '
  '— passar as claims e obrigacao declarada da Edge Function do 45-10, e a assercao C2 do smoke a '
  'exige das cinco funcoes da fase. '
  'GUARD NULL-SAFE em QUATRO metades desde o 46-04 (eram TRES desde o 45-13). (a) recusa 42501 o '
  'chamador SEM CLAIM NENHUMA — a MENSAGEM dela nao mudou nem uma letra, e aceitar '
  'auth.uid() IS NULL sob service_role continua sendo a saida RECUSADA '
  '(DI-45-07-01 e decisao do operador de 2026-08-05); o que ela ganhou no 46-04 foi UMA alternativa '
  'cumulativa por ESTADO, descrita no bloco do 4o ramo no fim deste texto — e a diferenca entre '
  'credencial e estado e a linha inteira que separa as duas coisas. (b) recusa por PAPEL, e ela tem DUAS FORMAS: '
  'no caminho de LEITURA (p_dry_run = true) aceita rh, administrador ou o dono; no caminho '
  'DESTRUTIVO (p_dry_run = false) aceita apenas administrador ou o dono — destruir a PII de outra '
  'pessoa nao e capacidade de recrutamento (CR-01 cenario 2; opcao B do checkpoint do 45-13, '
  'decisao do operador de 2026-08-11). Todas as comparacoes das duas formas sao por '
  'IS DISTINCT FROM e nunca por NOT IN, que avalia NULL, nao toma o IF e falha ABERTO para anon; '
  'com o candidato inexistente ou ja severado o dono resolve NULL, NULL IS DISTINCT FROM <uid> e '
  'TRUE, e a funcao recusa. '
  '⚠⚠ (c) GUARD DE INTENCAO, SO NO CAMINHO DESTRUTIVO — e a metade que fecha o CR-01. As metades '
  '(a) e (b) verificam QUEM chama; nenhuma sabe EM QUE ESTADO O MOTOR ESTA. A (c) exige as QUATRO '
  'condicoes que so o motor produz: existir pedido em solicitacoes_dados para este candidato, com '
  'tipo = exclusao, em situacao = executando com executar_em ja VENCIDO (a janela do D-45-01 / '
  'ERASE-06), e com storage_concluido_em CARIMBADO (o passo 1 concluido). SEM ELA, ser CHAMAVEL era '
  'suficiente para ser perigosa: com o GRANT a authenticated da 20260805000009, uma chamada do '
  'console do navegador destruia PII fora da janela, sem recibo e sem trilha, e deixava o curriculo '
  'orfao no bucket porque candidatos.user_id acabava de virar NULL. ⚠ E E AQUI QUE A ORDEM '
  'Storage -> Postgres -> Auth PASSA A SER IMPOSTA PELO BANCO: a SONDA 2 mediu que a plataforma NAO '
  'a impoe (a tabela de objetos do Storage nao tem FK para auth.users) e que o modo de falha e SILENCIOSO. '
  '⚠ NULL-SAFE POR CONSTRUCAO: com executar_em nulo o predicado avalia NULL, a linha nao e '
  'selecionada, o NOT EXISTS e TRUE e a funcao RECUSA — falha FECHADA sem clausula extra. '
  '⚠ DE QUE A (c) DEPENDE: da seguranca de public.solicitacoes_dados. Quem escrever situacao e '
  'storage_concluido_em ali AUTORIZA o tombstone — por isso o bloco de auto-verificacao desta '
  'migration pergunta ao CATALOGO se authenticated pode escrever naquela tabela e ABORTA O APPLY se '
  'puder. Afrouxar o ACL ou criar policy de UPDATE ali e mudanca de SEGURANCA desta funcao. '
  '⚠ O dry-run NAO e submetido a (c), deliberadamente: ler nao destroi nada, e o dry-run do 45-11 '
  'precisa poder rodar sobre uma linha arbitraria. '
  '⚠ POR QUE O TITULAR ESTA ENTRE OS CHAMADORES ACEITOS, E A RAZAO E DATAVEL (45-12): o plano '
  '45-07 desenhou esta funcao como funcao de OPERADOR (rh/administrador, GRANT so a service_role) '
  'e o plano 45-10 — escrito depois — a cabeou dentro do caminho de execucao DO PROPRIO TITULAR, '
  'cujo papel de aplicacao e candidato. As duas metades estavam certas isoladamente; a junta nao '
  'estava. O conserto ESTENDE a metade (b); a metade (a) NAO foi tocada, e aceitar '
  'auth.uid() IS NULL sob service_role e a saida RECUSADA — deixaria uma funcao que apaga PII '
  'irreversivelmente sem controle nenhum no corpo. '
  'ACL: REVOKE ALL de PUBLIC e anon NOMINALMENTE. Alem do GRANT a service_role, a migration '
  '20260805000009 (plano 45-12) concede EXECUTE a authenticated, porque o PostgREST deriva o PAPEL '
  'do MESMO JWT que carrega as claims: o client da Edge Function que repassa o Authorization do '
  'titular chega como authenticated. O precedente e a Phase 44 — o ACL abre a porta ao papel e o '
  'guard do corpo decide quem passa. '
  '⚠⚠⚠ 46-04 — (p) O QUARTO RAMO: O MOTOR DA PURGA DE RETENCAO (Blocker B-01 / D-46-18 / D-46-24). '
  'PROBLEMA MEDIDO EM PROD EM 2026-08-22, como postgres e sem claims: auth.uid() NULO, '
  'app_metadata.role NULO e request.jwt.claims NULO. Um cron nao tem sessao, nao tem papel e nao tem '
  'pedido em solicitacoes_dados: as tres metades recusavam com 42501 e a purga automatica nao '
  'conseguia nem fazer o DRY-RUN, o que tornava PURGA-02 impossivel de cumprir. '
  'SAIDAS RECUSADAS, e elas continuam recusadas: (A) credencial de operador permanente — criaria uma '
  'credencial standing capaz de destruir a PII de qualquer pessoa e poluiria a fila do RH com '
  'pedidos que ninguem fez; (C) um segundo motor destrutivo ao lado deste — contradiz D-46-12 e '
  'refaz o CR-02 da P39. '
  'A SAIDA ADOTADA (B): o chamador e aceito EXCLUSIVAMENTE pelo ESTADO que so o motor da purga '
  'produz, nunca por uma credencial que uma pessoa possa portar. E POR ISSO QUE A PURGA NUNCA E '
  'INSTRUMENTO DE EXCLUSAO DIRIGIDA: nao ha nada aqui que alguem possa TER; ha um estado que o motor '
  'cria e destroi. '
  '⚠⚠ O RAMO TEM DUAS METADES FISICAMENTE DISTINTAS — DOIS predicados separados, jamais um so com '
  'uma lista de modos servindo aos dois caminhos (obrigacao de aceite de D-46-24). '
  '(p.1) CAMINHO DE DRY-RUN: exige item em purga_execucao_itens para ESTE candidato com concluido_em '
  'nulo, sob purga_execucoes com situacao = executando e modo_vigente em dry_run OU live, e '
  'config_purga.modo em dry_run OU live. O efeito deste caminho o Postgres reverte por construcao — '
  'ele termina no terminador de dry-run. '
  '(p.2) CAMINHO DESTRUTIVO: as mesmas condicoes de item e situacao, porem com modo_vigente = live E '
  'config_purga.modo = live, os dois escritos por extenso. Um modo que nao seja live NAO autoriza '
  'destruicao. '
  'POR QUE A ASSIMETRIA NAO AFROUXA NADA: ela e a MESMA que a metade (b) ja tinha desde o 45-13, onde '
  'o ramo de leitura aceita rh e o destrutivo nao. Nenhuma capacidade destrutiva ganhou permissao '
  'nova; o que passou a ser autorizado fora de live e um caminho reversivel por construcao. Sem ele, '
  'os 14 dias de dry_run provariam ZERO sobre o caminho do delete — o dry-run decorativo que o SC#1 '
  'existe para proibir. '
  'AS DUAS LEITURAS DE MODO SAO CUMULATIVAS de proposito: modo_vigente e o regime sob o qual a '
  'execucao FOI ABERTA e config_purga.modo e o cerco AGORA. Exigir os dois e o que faz o kill switch '
  'de D-46-06 morder no meio de uma execucao em curso. '
  'NULL-SAFE POR CONSTRUCAO nos dois predicados, e por isso nao ha clausula IS NOT NULL extra: com '
  'qualquer lado nulo a comparacao avalia NULL, a linha nao e selecionada, o EXISTS e FALSE e a '
  'funcao RECUSA. Correlacionado por EXISTS, jamais por negacao de pertencimento a conjunto de '
  'valores, que avalia NULL e falha ABERTO (INVENT-05 / 20260730000005). '
  '⚠⚠ DE QUE ESTE GUARD PASSA A DEPENDER, E A LISTA CRESCEU: alem da seguranca de '
  'public.solicitacoes_dados (metade c), agora tambem da de public.purga_execucoes, '
  'public.purga_execucao_itens e public.config_purga — quem escrever situacao, modo_vigente, '
  'concluido_em ou modo naquelas tabelas AUTORIZA a destruicao. E, por caminho INDIRETO, da de '
  'public.retencao_hold: quem carimba liberado_em nao chama esta funcao, devolve a candidatura ao '
  'conjunto elegivel do predicado e o cron faz o resto — liberar um hold e o passo que falta entre '
  'registro sob litigio e registro apagado irreversivelmente. O bloco de auto-verificacao da '
  'migration 20260823000006 pergunta ao CATALOGO se authenticated pode escrever nas QUATRO e ABORTA '
  'O APPLY se puder: o pressuposto e assercao, nao confianca. Criar policy de escrita em qualquer '
  'uma delas passa a ser mudanca de SEGURANCA desta funcao.';
