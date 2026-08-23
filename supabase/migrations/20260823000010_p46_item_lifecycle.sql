-- =============================================================================
-- Phase 46 / Plano 46-05 — PURGA-02 · PURGA-06 · Pitfall 11 (classe T-32-03)
-- O CICLO DE VIDA DO ITEM: `reivindicar_item_purga` e `concluir_item_purga`.
-- As duas unicas portas pelas quais a Edge Function `purgar-retencao` toca o
-- ledger — e a reivindicacao e o lugar onde **o payload SELECIONA e o banco
-- AUTORIZA**.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NAO APAGA NADA, NAO CRIA TABELA, NAO CRIA COLUNA, NAO CRIA
-- CRON, NAO TOCA EM NENHUM GUARD EXISTENTE E NAO GRAVA NENHUMA LINHA.** Ela cria
-- DUAS funcoes novas e nada mais. Nenhum `DELETE`, nenhum `DROP`, nenhum
-- `INSERT`, nenhum `ALTER`, nenhum agendamento. As duas funcoes nascem sem
-- chamador: a Edge Function que as invoca so e deployada no checkpoint deste
-- mesmo plano, e nada a invoca ate o 46-06.
--
-- -----------------------------------------------------------------------------
-- (0) POR QUE ELAS EXISTEM — e por que a reivindicacao nao e um detalhe de RPC
-- -----------------------------------------------------------------------------
-- A Edge Function `purgar-retencao` e disparada por cron. Ela **nao tem sessao de
-- titular** de onde derivar o alvo: o alvo tem de chegar no CORPO da requisicao.
-- Essa e, literalmente, a superficie do Pitfall 11 / classe T-32-03 — quem
-- conseguisse forjar um POST com o Bearer certo escolheria quem e destruido.
--
-- A resposta e a mesma que o 45-12 ja documentou e que a EF
-- `executar-direito-titular` implementa numa emenda de UM UNICO CAMPO:
-- **o corpo da requisicao SELECIONA qual item, e nao autoriza NADA.** Quem
-- autoriza e este guard, que reverifica o encontro inteiro no servidor e devolve
-- o identificador **do ITEM** — o unico que a EF usa dali em diante.
--
-- ⚠⚠ ELA NAO PRODUZ O ESTADO QUE AUTORIZA — ELA O VERIFICA. Isto e a coisa mais
-- importante do arquivo. O 4o ramo do guard de `public.anonimizar_candidato`
-- (`20260823000006`, secao (p)) autoriza o chamador com base em existir item
-- ABERTO sob execucao em `executando`; se a reivindicacao pudesse CARIMBAR esse
-- estado, a Edge Function se autorizaria sozinha e o guard viraria decoracao.
-- O estado autorizante e produzido EXCLUSIVAMENTE por
-- `public.varrer_purga_retencao()`, que escolhe o alvo por POLITICA. Esta funcao
-- so pergunta se ele existe.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE pelo ORQUESTRADOR, pela via da Management API com o SQL
-- LIDO DO ARQUIVO (CLAUDE.md §"Via de apply ATUAL" — `node p46apply.cjs migrate`).
-- **NAO ha reparo de `version` a fazer**: por aquela via ela nasce correta, do
-- nome do arquivo. As instrucoes de reparo que ainda vivem nos cabecalhos das
-- migrations `20260823000001`..`4` estao OBSOLETAS e foram condenadas pela rodada
-- 4 do review do 46-04 (RD4-02); corrigi-las la faria o md5 divergir do ledger e
-- quebraria a propria prova, e por isso a correcao vive no CLAUDE.md.
--
-- Sem par de transacao explicita no topo deste arquivo, e corpos em delimitadores
-- NOMEADOS: o driver ja envolve cada migration na sua propria transacao, e um par
-- externo adjacente a `COMMENT` / `REVOKE` / `GRANT` e o gatilho do SQLSTATE
-- 42601 (CLAUDE.md §Migrations).
--
-- Conferencia obrigatoria, os DOIS lados registrados:
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260823000010';
--   -- comparar com:  printf '%s' "$(cat supabase/migrations/20260823000010_*.sql)" | md5
--
-- ⚠ AQUI A PERDA DE COMENTARIO NAO E BENIGNA: o `COMMENT ON FUNCTION` de
-- `reivindicar_item_purga` e o unico lugar DENTRO DO BANCO onde fica escrito por
-- que o identificador devolvido e o do item e nao o do parametro. Perder esse
-- texto entrega a mecanica e apaga a razao dela — e a razao e o que obriga a
-- proxima emenda a se justificar sozinha.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIENCIA — o que foi copiado, de onde
-- -----------------------------------------------------------------------------
--   · `20260801000002:322-455` — o molde da RPC AUDITADA: passos numerados no
--     corpo, um SQLSTATE por recusa, e o `COMMENT ON FUNCTION` que ENUMERA a
--     ordem do corpo e o codigo de cada recusa.
--   · `20260805000006:405-449` — a verificacao de estado por `EXISTS`
--     correlacionado e a propriedade de FALHA FECHADA: com qualquer lado nulo a
--     comparacao avalia NULL, a linha nao e selecionada, o `EXISTS` e falso e a
--     funcao RECUSA. E por isso que nao ha clausula `IS NOT NULL` extra.
--   · `20260823000006:364-397` — as duas metades do 4o ramo do guard. O predicado
--     da secao 1 deste arquivo e uma copia estrutural da metade (p.2), com dois
--     acrescimos declarados na secao (3).
--   · `20260823000003:229-240` — o `REVOKE` que NOMEIA `anon` e `authenticated`,
--     com a medicao que o obriga (o `pg_default_acl` deste schema concede EXECUTE
--     a `anon` como grant DIRETO E NOMEADO em todo `CREATE FUNCTION`; revogar so
--     de `PUBLIC` nao removeria nada).
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DO QUE O PLANO 46-05 ESPECIFICOU, E POR QUE
-- -----------------------------------------------------------------------------
-- O plano enumerou CINCO condicoes cumulativas para o encontro. Estao aqui as
-- cinco, mais DUAS que o plano nao podia ter previsto porque foram escritas
-- depois dele, no 46-04. As duas existem pela MESMA razao, e a razao e o Blocker
-- B-02 daquele plano: **uma porta que autoriza a entrada e morre tres linhas
-- depois nao autorizou nada — so moveu a falha para um ponto pior.**
--
--   (6) `cp.modo = 'live'` — o CERCO AGORA. O guard destrutivo exige as DUAS
--       leituras de modo, cumulativamente (`20260823000006:382-385`). Sem esta
--       condicao aqui, uma reivindicacao seria concedida com o kill switch de
--       D-46-06 ja em `off`, a EF apagaria o CV do Storage, e so entao o motor
--       recusaria com 42501. **O kill switch tem de morder ANTES do primeiro ato
--       irreversivel, nao depois.**
--
--   (7) A JANELA DE HI-03, COM MARGEM. O guard exige
--       `e.iniciada_em > now() - interval '1 hour'`, avaliado no instante em que
--       o MOTOR e chamado — e o motor e chamado DEPOIS do passo de Storage. Este
--       e o cenario RD2-03 do `46-REVIEW.md`, registrado la como obrigacao de
--       aceite do 46-06:
--
--         post entregue 70 min depois -> a EF apaga o CV no Storage
--                                     -> chama o motor -> 42501 (janela vencida)
--                                     -> Storage apagado, Postgres intacto
--
--       Curriculo orfao e irrecuperavel, num sistema em que o Storage esta fora
--       de todo caminho de backup. **O mecanismo que fecha isso vive aqui**, na
--       unica porta que a EF atravessa ANTES de tocar em qualquer sistema: a
--       reivindicacao exige que a execucao tenha, no minimo, o TETO DE PAREDE DA
--       PROPRIA EF de janela restante (150 s, medido na RESEARCH desta fase).
--       Concedida a reivindicacao, a invocacao inteira nao consegue sobreviver a
--       janela — ou seja, **se a reivindicacao passou, o guard ainda autoriza em
--       todo passo posterior**. A obrigacao do 46-06 continua de pe: la o teste
--       tem de provar que uma sonda que devolve 42501 implica ZERO chamada de
--       Storage. A diferenca entre "a EF retornou erro" e "nenhuma chamada de
--       Storage aconteceu" e um curriculo.
--
-- ⚠⚠ INVARIANTE DE ACOPLAMENTO, e ele e a razao de as duas condicoes acima nao
-- serem zelo: **o predicado da reivindicacao e, por construcao, ESTRITAMENTE MAIS
-- EXIGENTE que a metade (p.2) do 4o ramo do guard.** Ele repete as SEIS condicoes
-- daquele predicado e acrescenta duas (a identidade do item e a margem de 150 s).
-- Se alguem afrouxar este predicado sem afrouxar o guard, a EF volta a poder
-- apagar Storage para uma chamada que o motor recusara. A assercao (q.4) de
-- `supabase/tests/p46_purga_smoke.sql` mede o acoplamento por FORMA sobre os dois
-- corpos VIVOS — e ela existe porque uma frase de cabecalho afirmando um
-- invariante nao e o invariante (a licao literal do BL-01).
--
-- ⚠ TERCEIRA DIVERGENCIA, e ela e um LIMITE DECLARADO e nao um conserto:
-- **`FOR UPDATE` aqui NAO e exclusao mutua entre invocacoes CONCORRENTES.** O
-- plano descreveu a trava como se serializasse duas invocacoes com o mesmo
-- `item_id`; ela serializa a LEITURA, mas esta funcao nao MUTA o item, e a
-- transacao da RPC termina no retorno — entao a segunda invocacao readquire a
-- trava e ve o mesmo item aberto. A idempotencia real e por ESTADO no ledger
-- (`concluido_em`) e vale para invocacao SEQUENCIAL: depois que a primeira
-- concluiu, a segunda e recusada com `P46FB`. Duas invocacoes verdadeiramente
-- simultaneas sobre o mesmo item passariam as duas — e o dano e limitado, porque
-- nenhuma delas alcanca ninguem que a POLITICA ja nao tivesse selecionado (o
-- segundo passo de Storage nao acha arquivo, o motor devolve `ja_anonimizado`, o
-- `deleteUser` nao acha conta). Tornar a reivindicacao exclusiva exigiria um
-- carimbo de estado, e carimbar estado aqui e exatamente o que a secao (0) proibe.
-- **A exclusao mutua pertence ao DESPACHANTE (46-06), que emite um post por item.**
-- Registrado por escrito para que a proxima pessoa nao leia `FOR UPDATE` e conclua
-- uma garantia que ele nao da.
--
-- -----------------------------------------------------------------------------
-- (4) ORDEM DE ENTREGA + QUAL SMOKE E O CONTRATO
-- -----------------------------------------------------------------------------
-- Migration UNICA do plano 46-05, e ela vem DEPOIS das quatro do 46-04
-- (`20260823000006` -> `000008` -> `000009` -> `000007`, todas aplicadas em PROD
-- em 2026-08-23). A dependencia e real: o predicado desta funcao espelha o guard
-- que a `000006` escreveu, e a assercao de acoplamento le o corpo vivo daquele
-- guard.
--
-- ⚠ ESTE ARQUIVO NASCEU NUMERADO `20260823000008` NO PLANO e foi RENUMERADO para
-- `20260823000010`: o 46-04 tomou `000008` (`p46_guard_plano`, o fecho do Blocker
-- B-02) e `000009` (`p46_ck_modo_vigente`) depois que o plano 46-05 foi escrito.
--
-- A espec executavel e `supabase/tests/p46_purga_smoke.sql`, assercoes (q.1) a
-- (q.5). Ele e CONTRATO: se algo divergir, corrige-se ESTA migration.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · public.reivindicar_item_purga — o payload SELECIONA, o banco AUTORIZA
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.reivindicar_item_purga(
  p_item_id      uuid,
  p_candidato_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $reivindicar_item_purga$
DECLARE
  -- ⚠ A JANELA E A MARGEM, as duas por extenso e no mesmo lugar. A janela e a
  -- MESMA de `20260823000006` (HI-03); a margem e o teto de parede da Edge
  -- Function. Ver a secao (3) do cabecalho e a assercao (q.4) do smoke.
  c_janela_guard constant interval := interval '1 hour';
  c_teto_parede  constant interval := interval '150 seconds';

  -- O identificador CARREGADO DO ITEM. E este que a funcao devolve.
  v_candidato_do_item uuid;

  -- A decisao. UMA expressao, fail-closed por construcao.
  v_autoriza boolean := false;

  -- ⚠ AS SETE MEDICOES ABAIXO NAO DECIDEM NADA — elas so DIAGNOSTICAM a recusa.
  -- A separacao e deliberada: a decisao tem de ser uma expressao unica, espelho
  -- do guard, para que o acoplamento seja conferivel por forma; e a mensagem de
  -- recusa tem de IMPRIMIR O QUE MEDIU em vez de narrar uma causa presumida.
  -- Um diagnostico errado custa mais caro que um "falhou" — esta fase ja gastou
  -- um dia inteiro perseguindo uma mensagem que afirmava, com texto fixo, que uma
  -- migration nao fora aplicada enquanto ela estava aplicada e conferida por md5.
  v_existe      boolean;
  v_aberto      boolean;
  v_alvo_bate   boolean;
  v_executando  boolean;
  v_modo_live   boolean;
  v_cerco_live  boolean;
  v_na_janela   boolean;
  v_diag        text;
BEGIN
  -- PASSO 1 — trava a linha do item e carrega o identificador DELE.
  -- ⚠ Sem `JOIN`, de proposito: `FOR UPDATE` sobre uma consulta com juncao
  -- travaria tambem a execucao e a config, e travar `public.config_purga` seria
  -- serializar TODA a purga contra a leitura de uma linha de configuracao.
  -- ⚠ E ver o LIMITE DECLARADO na secao (3) do cabecalho: esta trava serializa a
  -- leitura, e nao e exclusao mutua entre invocacoes concorrentes.
  SELECT i.candidato_id
    INTO v_candidato_do_item
    FROM public.purga_execucao_itens i
   WHERE i.id = p_item_id
     FOR UPDATE;

  -- PASSO 2 — O ENCONTRO, REVERIFICADO NO SERVIDOR. Sete condicoes cumulativas,
  -- numa unica expressao. As seis primeiras sao a metade (p.2) do 4o ramo do
  -- guard, verbatim na estrutura; a setima e a margem do teto de parede.
  -- ⚠ FALHA FECHADA POR CONSTRUCAO: com qualquer lado nulo a comparacao avalia
  -- NULL, a linha nao e selecionada, o `EXISTS` e falso e a funcao RECUSA. Nao ha
  -- clausula extra de nulidade em lugar nenhum deste predicado, e a ausencia dela
  -- e deliberada (`20260805000006:418-423`).
  SELECT EXISTS (
    SELECT 1
      FROM public.purga_execucao_itens i
      JOIN public.purga_execucoes e ON e.id = i.execucao_id
      CROSS JOIN public.config_purga cp
     WHERE i.id            = p_item_id
       AND i.candidato_id  = p_candidato_id
       AND i.concluido_em IS NULL
       AND e.situacao      = 'executando'
       AND e.modo_vigente  = 'live'
       AND cp.modo         = 'live'
       AND e.iniciada_em   > pg_catalog.now() - (c_janela_guard - c_teto_parede)
  ) INTO v_autoriza;

  IF NOT v_autoriza THEN
    -- PASSO 3 — MEDIR a recusa, condicao por condicao, para que a mensagem diga
    -- o que foi medido. As comparacoes vao envolvidas em `coalesce` porque aqui
    -- NULL significa "nao pude medir", e "nao pude medir" e informacao.
    SELECT true,
           (i.concluido_em IS NULL),
           (i.candidato_id  = p_candidato_id),
           (e.situacao      = 'executando'),
           (e.modo_vigente  = 'live'),
           (e.iniciada_em   > pg_catalog.now() - (c_janela_guard - c_teto_parede))
      INTO v_existe, v_aberto, v_alvo_bate, v_executando, v_modo_live, v_na_janela
      FROM public.purga_execucao_itens i
      JOIN public.purga_execucoes e ON e.id = i.execucao_id
     WHERE i.id = p_item_id;

    SELECT EXISTS (SELECT 1 FROM public.config_purga cp WHERE cp.modo = 'live')
      INTO v_cerco_live;

    -- ⚠ A MENSAGEM NAO ECOA NENHUM VALOR RECEBIDO. Ecoar de volta o identificador
    -- forjado e dar ao atacante o oraculo de graca; e a Edge Function traduz esta
    -- recusa para um 403 SEM CORPO DE DETALHE, entao o texto abaixo existe para o
    -- log do servidor e para quem investiga, nunca para quem chamou.
    v_diag := pg_catalog.concat_ws(
      ', '::text,
      CASE WHEN coalesce(v_existe,     false) THEN NULL ELSE 'o item nao existe'::text                                            END,
      CASE WHEN coalesce(v_aberto,     false) THEN NULL ELSE 'o item ja esta concluido'::text                                     END,
      CASE WHEN coalesce(v_alvo_bate,  false) THEN NULL ELSE 'o titular recebido nao e o do item'::text                           END,
      CASE WHEN coalesce(v_executando, false) THEN NULL ELSE 'a execucao nao esta em situacao executando'::text                   END,
      CASE WHEN coalesce(v_modo_live,  false) THEN NULL ELSE 'a execucao nao foi aberta em modo_vigente live'::text               END,
      CASE WHEN coalesce(v_cerco_live, false) THEN NULL ELSE 'config_purga.modo nao esta em live (kill switch de D-46-06)'::text  END,
      CASE WHEN coalesce(v_na_janela,  false) THEN NULL ELSE 'a execucao nao tem 150 s de janela restante (HI-03 + RD2-03)'::text END
    );

    IF v_diag IS NULL OR v_diag = '' THEN
      -- ⚠ Ramo de DIVERGENCIA, e ele e honesto de proposito: o predicado de
      -- decisao recusou e nenhuma medicao individual reprovou. Isso e um fato
      -- sobre a funcao, nao sobre o chamador — e dize-lo assim vale mais que
      -- inventar uma causa plausivel.
      v_diag := 'nenhuma condicao individual reprovou — o predicado de decisao e a medicao de diagnostico divergiram, e a divergencia e o defeito a investigar'::text;
    END IF;

    RAISE EXCEPTION
      'FORBIDDEN: a reivindicacao do item de purga foi recusada. O corpo da requisicao SELECIONA qual item, e nao autoriza nada — quem autoriza e este guard, que reverifica o encontro inteiro no servidor (Pitfall 11 / classe T-32-03). Medido: %', v_diag
      USING ERRCODE = 'P46FB';
  END IF;

  -- PASSO 4 — devolve o identificador DO ITEM.
  -- ⚠ E ESTA LINHA E A DIFERENCA INTEIRA. Hoje os dois valores sao
  -- NECESSARIAMENTE iguais, porque o encontro exigiu a igualdade — a diferenca e
  -- ESTRUTURAL, e existe para o dia em que alguem afrouxar aquela condicao. Nesse
  -- dia a funcao continua devolvendo o identificador do ITEM, e a Edge Function
  -- continua sem nunca ter lido o do corpo. E a mesma emenda de um unico campo
  -- que o 45-12 documentou.
  RETURN v_candidato_do_item;
END;
$reivindicar_item_purga$;

-- ⚠ `FROM PUBLIC` sozinho NAO basta e nao e redundancia defensiva: medido na
-- P42-06, o `pg_default_acl` do schema `public` neste projeto concede EXECUTE a
-- `anon` e `authenticated` como grants DIRETOS E NOMEADOS em todo
-- `CREATE FUNCTION`. Nomear os dois e obrigatorio.
-- ⚠ E aqui a revogacao de `authenticated` e LOAD-BEARING de um jeito que nas
-- outras funcoes desta fase nao era: `public.anonimizar_candidato` e
-- `public.plano_exclusao_titular` TEM EXECUTE para `authenticated` (a EF do
-- direito do titular chama as duas com o JWT da pessoa). Se esta funcao tambem
-- tivesse, qualquer usuario logado poderia reivindicar itens ate descobrir um
-- aberto — e a reivindicacao e a porta que o 4o ramo do guard reconhece.
REVOKE ALL ON FUNCTION public.reivindicar_item_purga(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reivindicar_item_purga(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.reivindicar_item_purga(uuid, uuid) IS
  'Phase 46 / 46-05 (PURGA-02, Pitfall 11 / classe T-32-03): a UNICA porta de entrada da Edge '
  'Function purgar-retencao, e a defesa contra a escolha de alvo pelo corpo da requisicao. '
  'O CORPO SELECIONA QUAL ITEM, E NAO AUTORIZA NADA. Quem autoriza e este guard. '
  'ORDEM DO CORPO: (1) trava a linha do item com FOR UPDATE e carrega o candidato DELE; '
  '(2) reverifica o encontro no servidor, SETE condicoes cumulativas numa unica expressao; '
  '(3) se recusar, MEDE condicao por condicao e imprime o que mediu; (4) devolve o identificador '
  'DO ITEM. '
  'AS SETE CONDICOES: o item existe; concluido_em nulo; o candidato do item e identico ao recebido; '
  'a execucao esta em situacao = executando; modo_vigente = live; config_purga.modo = live; e a '
  'execucao tem pelo menos 150 s de janela restante dentro da hora de HI-03. '
  'RECUSA: SQLSTATE P46FB, sempre — nao ha segundo codigo. A Edge Function traduz P46FB para 403 '
  'EXCLUSIVAMENTE no passo da reivindicacao; em qualquer outro passo, qualquer erro e 500. Um erro '
  'transitorio virando negativa de autorizacao e uma mentira sobre autorizacao, e e o tipo de '
  'mentira que ninguem investiga. '
  '⚠ A MENSAGEM DE RECUSA NUNCA ECOA O VALOR RECEBIDO: ecoar o identificador forjado de volta e dar '
  'ao atacante o oraculo de graca. Ela nomeia a CONDICAO que reprovou, medida, e vai para o log do '
  'servidor — a EF responde 403 sem corpo de detalhe. '
  '⚠⚠ ELA NAO PRODUZ O ESTADO QUE AUTORIZA — ELA O VERIFICA. Se ela pudesse carimbar situacao ou '
  'abrir item, a Edge Function se autorizaria sozinha e o 4o ramo do guard de anonimizar_candidato '
  'viraria decoracao. O estado autorizante e produzido EXCLUSIVAMENTE por varrer_purga_retencao(), '
  'que escolhe o alvo por POLITICA, nunca por pessoa. '
  '⚠ ELA E ESTRITAMENTE MAIS EXIGENTE que a metade (p.2) daquele guard (20260823000006:386-397): '
  'repete as seis condicoes dele e acrescenta a identidade do item e a margem de 150 s. Essa margem '
  'fecha o cenario RD2-03: sem ela, um post entregue no fim da hora faria a EF apagar o CV no '
  'Storage e so entao receber 42501 do motor — Storage apagado, Postgres intacto, curriculo orfao e '
  'IRRECUPERAVEL num sistema em que o Storage esta fora de todo caminho de backup. Concedida a '
  'reivindicacao, a invocacao inteira nao consegue sobreviver a janela. '
  '⚠ O FOR UPDATE NAO E EXCLUSAO MUTUA entre invocacoes concorrentes: esta funcao nao muta o item e '
  'a transacao da RPC termina no retorno. A idempotencia e por ESTADO (concluido_em) e vale para '
  'invocacao SEQUENCIAL. A exclusao mutua pertence ao despachante do 46-06, que emite um post por '
  'item. '
  'ACL: revogada nominalmente de PUBLIC, anon e authenticated (o pg_default_acl deste schema concede '
  'EXECUTE a anon como grant direto em todo CREATE FUNCTION), com EXECUTE apenas para o papel de '
  'servico. A revogacao de authenticated e load-bearing: anonimizar_candidato e '
  'plano_exclusao_titular tem EXECUTE para authenticated, e se esta tambem tivesse, qualquer usuario '
  'logado poderia reivindicar itens ate achar um aberto.';


-- ---------------------------------------------------------------------------
-- 2 · public.concluir_item_purga — fechar o item e RETIRAR a autorizacao
-- ---------------------------------------------------------------------------
-- ⚠ A JANELA DE DESTRUICAO DE UM TITULAR DURA EXATAMENTE O TEMPO ENTRE A
-- REIVINDICACAO E A CONCLUSAO. Fechar o item e o que RETIRA a autorizacao do 4o
-- ramo do guard — `concluido_em IS NULL` e uma das condicoes dele. Por isso a
-- Edge Function chama esta funcao em bloco de finalizacao, alcancavel tambem nos
-- caminhos de falha: um item que fica aberto mantem a autorizacao destrutiva
-- viva ate a hora de HI-03 vencer.
CREATE FUNCTION public.concluir_item_purga(
  p_item_id    uuid,
  p_desfechos  jsonb
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $concluir_item_purga$
DECLARE
  -- ⚠ VOCABULARIO FECHADO, e ele e DELIBERADAMENTE MENOR que o CHECK da coluna.
  -- A `20260823000009` alargou os tres CHECK com `desconhecido` para que a
  -- RECONCILIACAO de execucoes vencidas possa dizer "eu nao sei" sobre passos que
  -- ninguem observou. Esta funcao nunca escreve `desconhecido`: quem a chama e a
  -- Edge Function, que OBSERVOU cada um dos tres passos. Deixa-la escrever
  -- `desconhecido` seria permitir que um observador declarasse ignorancia.
  c_vocabulario constant text[] := ARRAY['pendente','ok','falha','nao_aplicavel']::text[];

  v_storage     text;
  v_postgres    text;
  v_auth        text;
  v_execucao_id uuid;
  v_aberto      boolean;
BEGIN
  -- PASSO 1 — o desfecho tem de ser um objeto com as tres chaves.
  IF p_desfechos IS NULL OR pg_catalog.jsonb_typeof(p_desfechos) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION
      'INVALIDO: concluir_item_purga espera um objeto jsonb com as chaves storage, postgres e auth. Recebido: %',
      coalesce(pg_catalog.jsonb_typeof(p_desfechos), 'nulo')
      USING ERRCODE = '22023';
  END IF;

  v_storage  := p_desfechos ->> 'storage';
  v_postgres := p_desfechos ->> 'postgres';
  v_auth     := p_desfechos ->> 'auth';

  -- ⚠ CHAVE AUSENTE E RECUSA, JAMAIS GRAVACAO SILENCIOSA. Um item concluido com
  -- um desfecho que ninguem escreveu ficaria em `pendente` — e `pendente` quer
  -- dizer "ainda vou tentar", que e uma afirmacao FALSA sobre um item fechado.
  IF v_storage IS NULL OR v_postgres IS NULL OR v_auth IS NULL THEN
    RAISE EXCEPTION
      'INVALIDO: falta desfecho para pelo menos um dos tres sistemas (storage=%, postgres=%, auth=%). Um item concluido com desfecho ausente ficaria em pendente, e pendente afirma "ainda vou tentar" sobre um item fechado',
      coalesce(v_storage, 'ausente'), coalesce(v_postgres, 'ausente'), coalesce(v_auth, 'ausente')
      USING ERRCODE = '22023';
  END IF;

  -- PASSO 2 — vocabulario fechado. Valor fora dele e recusa, nunca gravacao
  -- silenciosa. `array_position` devolve NULL quando o valor nao esta na lista,
  -- e essa e a forma NULL-safe da pergunta.
  IF pg_catalog.array_position(c_vocabulario, v_storage)  IS NULL
     OR pg_catalog.array_position(c_vocabulario, v_postgres) IS NULL
     OR pg_catalog.array_position(c_vocabulario, v_auth)     IS NULL THEN
    RAISE EXCEPTION
      'INVALIDO: desfecho fora do vocabulario fechado pendente|ok|falha|nao_aplicavel (storage=%, postgres=%, auth=%). O valor desconhecido existe no CHECK da coluna e pertence a RECONCILIACAO de execucoes vencidas, jamais a quem OBSERVOU os tres passos',
      v_storage, v_postgres, v_auth
      USING ERRCODE = '22023';
  END IF;

  -- ⚠ `pendente` E RECUSADO NA CONCLUSAO, e isso nao e rigor decorativo: ele e o
  -- unico valor do vocabulario que descreve uma INTENCAO em vez de uma
  -- observacao. Todo caminho da Edge Function tem um desfecho terminal para cada
  -- passo — `ok` no que completou, `falha` no que quebrou, `nao_aplicavel` no que
  -- nem chegou a ser tentado.
  IF v_storage = 'pendente' OR v_postgres = 'pendente' OR v_auth = 'pendente' THEN
    RAISE EXCEPTION
      'INVALIDO: pendente nao e desfecho de conclusao (storage=%, postgres=%, auth=%). Ele descreve uma intencao, e um item fechado nao tem intencoes: use ok para o que completou, falha para o que quebrou e nao_aplicavel para o que nem chegou a ser tentado',
      v_storage, v_postgres, v_auth
      USING ERRCODE = '22023';
  END IF;

  -- PASSO 3 — trava o item e confere que ele esta ABERTO.
  SELECT i.execucao_id, (i.concluido_em IS NULL)
    INTO v_execucao_id, v_aberto
    FROM public.purga_execucao_itens i
   WHERE i.id = p_item_id
     FOR UPDATE;

  -- ⚠ REESCREVER UM ITEM JA CONCLUIDO E FALSIFICAR UMA OBSERVACAO, e este ledger
  -- e registro de cumprimento de obrigacao legal com retencao INDEFINIDA
  -- (D-46-16), sem PITR para desmentir. A recusa carrega o MESMO P46FB da
  -- reivindicacao porque e a mesma classe de fato — o encontro nao vale mais —, e
  -- a Edge Function NAO a traduz para 403: fora do passo da reivindicacao,
  -- qualquer erro e 500.
  IF v_execucao_id IS NULL THEN
    RAISE EXCEPTION
      'FORBIDDEN: nao existe item de purga com o identificador recebido'
      USING ERRCODE = 'P46FB';
  END IF;

  IF NOT coalesce(v_aberto, false) THEN
    RAISE EXCEPTION
      'FORBIDDEN: este item de purga ja esta concluido. Reescrever o desfecho de um item fechado e falsificar uma observacao num registro de cumprimento de obrigacao legal com retencao indefinida'
      USING ERRCODE = 'P46FB';
  END IF;

  -- PASSO 4 — carimba os tres desfechos e FECHA o item. E este UPDATE que retira
  -- a autorizacao do 4o ramo do guard.
  UPDATE public.purga_execucao_itens i
     SET desfecho_storage  = v_storage,
         desfecho_postgres = v_postgres,
         desfecho_auth     = v_auth,
         concluido_em      = pg_catalog.now()
   WHERE i.id = p_item_id
     AND i.concluido_em IS NULL;

  -- PASSO 5 — incrementa `processados` na MESMA transacao.
  -- ⚠ E ELE E DISCRIMINADO, contra o que o plano 46-05 pediu. `processados` diz
  -- de si mesmo, no COMMENT de `20260823000002:206-210`, que conta "quantos
  -- titulares tiveram o motor destrutivo efetivamente executado". Incrementar em
  -- toda conclusao contaria tambem o titular cujo Storage falhou e cujo motor
  -- NUNCA RODOU — a coluna passaria a significar "itens fechados" e mentiria
  -- sobre o unico numero que ela existe para responder. E a mesma classe do
  -- RD2-01: a mentira simetrica custa o mesmo que a mentira otimista.
  IF v_postgres = 'ok' OR v_postgres = 'falha' THEN
    UPDATE public.purga_execucoes e
       SET processados = e.processados + 1
     WHERE e.id = v_execucao_id;
  END IF;

  -- PASSO 6 — se nao restou item aberto, FECHA a execucao.
  -- ⚠ `situacao = 'executando'` no WHERE nao e higiene: a reconciliacao de
  -- `20260823000007` ABORTA execucoes vencidas, e uma conclusao tardia que
  -- virasse `abortada` de volta para `concluida` apagaria o registro de que a
  -- execucao morreu no meio. Uma execucao abortada permanece abortada.
  UPDATE public.purga_execucoes e
     SET situacao     = 'concluida',
         concluida_em = pg_catalog.now()
   WHERE e.id       = v_execucao_id
     AND e.situacao = 'executando'
     AND NOT EXISTS (
           SELECT 1
             FROM public.purga_execucao_itens i
            WHERE i.execucao_id  = e.id
              AND i.concluido_em IS NULL
         );
END;
$concluir_item_purga$;

REVOKE ALL ON FUNCTION public.concluir_item_purga(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.concluir_item_purga(uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.concluir_item_purga(uuid, jsonb) IS
  'Phase 46 / 46-05 (PURGA-06): fecha o item do ledger com o desfecho de cada um dos tres sistemas, '
  'e ao faze-lo RETIRA a autorizacao do 4o ramo do guard de anonimizar_candidato. '
  '⚠ A JANELA DE DESTRUICAO DE UM TITULAR DURA EXATAMENTE O TEMPO ENTRE A REIVINDICACAO E A '
  'CONCLUSAO: concluido_em IS NULL e uma das condicoes daquele ramo. E por isso que a Edge Function '
  'chama esta funcao em bloco de finalizacao, alcancavel tambem nos caminhos de falha — um item que '
  'fica aberto mantem a autorizacao destrutiva viva ate a hora de HI-03 vencer. '
  'ORDEM DO CORPO: (1) exige objeto jsonb com as chaves storage, postgres e auth; (2) valida os tres '
  'contra o vocabulario fechado e recusa pendente; (3) trava o item e exige que ele esteja ABERTO; '
  '(4) carimba os tres desfechos e concluido_em; (5) incrementa processados, DISCRIMINADO; (6) fecha '
  'a execucao se nao restou item aberto. '
  'RECUSAS: 22023 para objeto invalido, chave ausente, valor fora do vocabulario e pendente; P46FB '
  'para item inexistente e para item ja concluido. '
  '⚠ O VOCABULARIO ACEITO E MENOR QUE O CHECK DA COLUNA, de proposito: desconhecido foi acrescentado '
  'pela 20260823000009 para que a RECONCILIACAO de execucoes vencidas possa dizer "eu nao sei" sobre '
  'passos que ninguem observou. Quem chama esta funcao OBSERVOU os tres passos, e um observador nao '
  'declara ignorancia. '
  '⚠ pendente E RECUSADO NA CONCLUSAO: e o unico valor do vocabulario que descreve INTENCAO em vez de '
  'observacao, e um item fechado nao tem intencoes. '
  '⚠ REESCREVER ITEM JA CONCLUIDO E RECUSADO: falsificaria uma observacao num registro de cumprimento '
  'de obrigacao legal com retencao INDEFINIDA (D-46-16), sem PITR para desmentir. '
  '⚠ processados SO E INCREMENTADO quando o desfecho de Postgres e ok ou falha — ou seja, quando o '
  'motor foi efetivamente executado. Incrementar em toda conclusao contaria tambem o titular cujo '
  'Storage falhou e cujo motor nunca rodou, e a coluna passaria a significar "itens fechados" em vez '
  'de "titulares processados". Mesma classe do RD2-01: a mentira simetrica custa o mesmo. '
  '⚠ A execucao so vira concluida se estiver em executando: a reconciliacao de 20260823000007 aborta '
  'execucoes vencidas, e uma conclusao tardia que revertesse abortada para concluida apagaria o '
  'registro de que a execucao morreu no meio. '
  'ACL: revogada nominalmente de PUBLIC, anon e authenticated, com EXECUTE apenas para o papel de '
  'servico.';
