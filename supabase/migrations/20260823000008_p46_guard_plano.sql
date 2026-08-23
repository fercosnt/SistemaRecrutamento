-- =============================================================================
-- Phase 46 / Plano 46-04 — PURGA-02 · Blocker B-02 · Saida A (operador, 2026-08-22)
-- `plano_exclusao_titular(uuid)` ganha o TERCEIRO ramo autorizado do guard: o
-- motor da purga passa a poder LER o plano sem sessao, e so de dentro dela.
-- =============================================================================
--
-- ⚠⚠ ESCOPO NEGATIVO, EM UMA LINHA: **esta migration edita o guard de UMA funcao
-- de LEITURA da Phase 45 (`STABLE`) e nao faz absolutamente mais nada** — zero DDL
-- de tabela, zero policy, zero agendamento, zero linha de dado, zero verbo de
-- escrita em lugar nenhum. Ela e a segunda metade obrigatoria da `20260823000006`,
-- e sem ela aquela migration nao produz efeito util.
--
-- -----------------------------------------------------------------------------
-- (0) POR QUE ESTE ARQUIVO EXISTE — O BLOCKER B-02, DESCOBERTO NO 46-04
-- -----------------------------------------------------------------------------
-- D-46-18 mediu, corretamente, que sob `postgres` e sem claims `auth.uid()`,
-- `app_metadata.role` e `request.jwt.claims` sao os TRES nulos, e que as tres
-- metades do guard de `anonimizar_candidato` recusavam o cron com 42501. Ela
-- resolveu aquele guard — e **so aquele**. O que ela nao perguntou foi o que
-- aquele corpo CHAMA.
--
-- `anonimizar_candidato`, no PASSO 0 (`20260805000006:456`), executa
-- `public.plano_exclusao_titular(p_candidato_id)`. E esta funcao tem guard PROPRIO,
-- de duas metades (`20260805000005:201-253`):
--   (a) `v_uid IS NULL`                                        -> 42501
--   (b) papel/dono, por `IS DISTINCT FROM` nas tres comparacoes -> 42501
--
-- Consequencia medida por leitura: o 4o ramo autoriza o cron a ENTRAR no motor, e
-- tres linhas depois a chamada morre com 42501 vindo de OUTRA funcao.
-- `SECURITY DEFINER` nao ajuda — ele troca o papel do BANCO, e estes guards
-- decidem sobre a CLAIM do JWT.
--
-- ⚠ **AS DUAS METADES PRECISAM DA ALTERNATIVA, NAO SO A (a).** Para um titular
-- REAL, `v_user_id IS DISTINCT FROM v_uid` e `<uuid real> IS DISTINCT FROM NULL`,
-- que e TRUE — a metade (b) recusaria mesmo depois de a (a) ter passado. Ver a
-- secao (3), divergencia 2.
--
-- ⚠ **NAO HA B-03, E ISSO FOI MEDIDO, NAO PRESUMIDO.** A cadeia de chamadas com
-- guard de sessao foi varrida inteira: `anonimizar_candidato -> plano_exclusao_titular`
-- e o UNICO par, e `plano_exclusao_titular` nao chama mais nenhuma funcao guardada.
-- E isso que torna a Saida A SUFICIENTE, em vez de "o proximo nivel a descobrir".
--
-- ⚠ SAIDAS RECUSADAS (decisao do operador, 2026-08-22):
--   · B — o motor pular esta funcao quando chamado pela purga: a assercao (C3/ii)
--     do smoke exige que `pg_get_functiondef(anonimizar_candidato)` CONTENHA a
--     chamada, e pular criaria um SEGUNDO caminho pelo corpo destrutivo. E o
--     P39/CR-02 outra vez, e contradiz PURGA-02 na letra.
--   · C — a varredura carimbar `request.jwt.claims` antes de chamar: e forjar
--     sessao. Faria `auth.uid()` MENTIR para tudo o que rodasse naquela transacao,
--     e e a familia de "credencial standing" que D-46-18 ja recusou.
--
-- ⚠ POR QUE A SAIDA A E DEFENSAVEL, E A RAZAO E DE SUPERFICIE: esta funcao e
-- `STABLE` — ela NAO DESTROI NADA. O retorno foi lido coluna por coluna antes desta
-- edicao: `candidato_id`, booleanos de estado, contagens por tabela, e nomes de
-- tabela/coluna em `bloqueadores_deleteuser`. **Nao ha nome, e-mail, CPF, telefone,
-- endereco nem data de nascimento em lugar nenhum do jsonb.** O que a Saida A
-- amplia e quem LE contagens de um plano de exclusao, e nao quem destroi.
-- ⚠ Isso NAO a torna inofensiva, e o ACL abaixo diz por que: contagens de PII por
-- pessoa, enumeraveis, sao superficie de exfiltracao. Por isso o ramo novo exige o
-- ALVO (o `p_candidato_id` daquele item), e nao apenas o modo.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE pelo ORQUESTRADOR (subagentes GSD nao recebem os tools MCP
-- do Supabase — bug upstream anthropics/claude-code#13898), pela via da Management
-- API com o SQL lido do arquivo, byte a byte (CLAUDE.md §"Via de apply ATUAL").
--
-- ⚠ **NAO HA REPARO DE `version` A FAZER.** Por aquela via a linha de
-- `supabase_migrations.schema_migrations` nasce com a version do nome do arquivo. A
-- instrucao `UPDATE ... SET version` dos cabecalhos das migrations
-- `20260823000001`..`4` esta OBSOLETA e continua escrita dentro do banco porque
-- corrigi-los faria o md5 deles divergir do ledger e quebraria a propria prova.
--
-- Sem par de transacao explicita no topo: o driver ja envolve cada migration na sua
-- propria transacao implicita, e um par externo e o gatilho do SQLSTATE 42601
-- (CLAUDE.md §Migrations). Este arquivo tem a combinacao de gatilho: corpo
-- delimitado por cifrao NOMEADO adjacente a `REVOKE` / `GRANT` / `COMMENT`.
--
-- Conferencia obrigatoria logo apos o apply, **os dois lados registrados**:
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260823000008';
--   -- comparar com:  printf '%s' "$(cat supabase/migrations/20260823000008_*.sql)" | md5
--
-- ⚠ O token do delimitador de cifrao da funcao NAO aparece em prosa neste arquivo,
-- e a omissao e deliberada: a receita de extracao registrada em
-- `p45_motor_exclusao_smoke.sql` §PROVENIENCIA e um `indexOf` ingenuo, e uma mencao
-- em comentario antes da funcao faria o re-pin de (C3) carimbar o md5 de um trecho
-- de prosa em vez do corpo.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIENCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NAO
-- -----------------------------------------------------------------------------
--   · O CORPO INTEIRO vem do ARQUIVO `20260805000005_p45_plano_e_dry_run.sql`,
--     extraido entre os dois delimitadores nomeados, **nao do catalogo**. A copia
--     foi conferida por md5 ANTES de qualquer edicao:
--       md5(corpo copiado) = 97634d07ef13447e06741a8c8372fca6  (21 349 octetos)
--     que e byte a byte o pin vivo em `p45_motor_exclusao_smoke.sql` e o
--     `md5(prosrc)` medido em PROD. Copiar do catalogo pinaria o que esta aplicado,
--     seja la o que for, e o gate deixaria de comparar.
--
--   · A FORMA do ramo novo vem da secao (p) de `20260823000006_p46_guard_purga.sql`
--     — o 4o ramo do motor. Mesmo idioma, MESMAS condicoes de item e execucao, e o
--     mesmo `EXISTS` correlacionado com falha FECHADA por construcao.
--
--   · ⚠ **NAO foi copiado o bloco de auto-verificacao que aborta o apply.** Ele ja
--     roda na `20260823000006`, que e aplicada ANTES desta, sobre exatamente as
--     mesmas quatro tabelas. Duplica-lo aqui faria a mesma pergunta duas vezes no
--     mesmo apply, e a segunda copia envelheceria em silencio no dia em que a
--     primeira ganhasse uma tabela. A dependencia esta declarada na secao (4).
--
--   · ⚠ **NAO foi relaxada a metade (a).** A mensagem original continua neste
--     arquivo VERBATIM. Aceitar `auth.uid() IS NULL` sob `service_role` continua
--     sendo a saida RECUSADA (`DI-45-07-01` + decisao do operador de 2026-08-05).
--
--   · ⚠ **NAO foi tocado o ACL.** `REVOKE` nominal de PUBLIC/anon/authenticated e
--     `GRANT` so a `service_role`, reemitido identico ao vivo. Esta funcao devolve
--     CONTAGENS de PII por pessoa, e a proibicao vive no ACL de proposito.
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DA `20260823000006`, E POR QUE
-- -----------------------------------------------------------------------------
-- **DIVERGENCIA 1 — AQUI O RAMO E **UM** PREDICADO, E NAO DOIS. A obrigacao de
-- D-46-24 nao transfere para esta funcao, e escreve-la aqui produziria exatamente
-- o defeito que ela existe para impedir.**
--
-- Em `anonimizar_candidato` as duas metades tem conteudo: ha um caminho REVERSIVEL
-- e um caminho DESTRUTIVO, e separa-las fisicamente e o que impede o segundo de
-- herdar em silencio a permissao do primeiro. **Esta funcao nao tem caminho
-- destrutivo.** Ela e `STABLE`, tem UMA assinatura, nao recebe intencao e devolve
-- sempre a mesma coisa. Nao existe segunda metade a restringir.
--
-- E a consequencia de escreve-la mesmo assim nao e "verbosidade inofensiva": o
-- predicado de `live` e um SUBCONJUNTO ESTRITO do de `dry_run OU live`. Dois
-- `EXISTS` unidos por OU dariam um segundo ramo que **nunca pode ser a razao de a
-- funcao autorizar** — porque sempre que ele fosse verdadeiro o primeiro tambem
-- seria. Isso e **codigo morto dentro de um guard**, e este projeto tem precedente
-- nomeado e datado para isso: P39 / CR-02, "uma guarda que era dead code". Um
-- ramo que nao pode decidir nada e pior que ausente, porque o proximo leitor gasta
-- o tempo dele procurando a restricao que aquele ramo aparenta impor.
--
-- ⚠ A restricao ATIVA por modo continua existindo, e continua onde ela tem efeito:
-- em `20260823000006`, secao (p.2), onde o caminho destrutivo exige
-- `modo_vigente = 'live'` E `config_purga.modo = 'live'`, os dois por extenso.
-- Autorizar a LEITURA do plano em `dry_run` nao autoriza destruicao nenhuma: quem
-- decide destruir e o outro guard, e ele nao foi tocado por este arquivo.
--
-- **DIVERGENCIA 2 — o ramo entra nas DUAS metades desta funcao, e nao so na (a).**
-- Foi medido: para um titular REAL sob o cron, `v_user_id` e um uuid e `v_uid` e
-- NULL, entao `v_user_id IS DISTINCT FROM v_uid` e TRUE e a metade (b) recusaria
-- mesmo com a (a) ja resolvida. Emendar so a (a) deixaria o blocker de pe com outra
-- cara — e a mudanca de sintoma sem mudanca de causa e o modo de falha mais caro de
-- diagnosticar as tres da manha.
--
-- **DIVERGENCIA 3 — o escopo aqui e DUPLO (`dry_run` OU `live`), e a razao e a
-- mesma de D-46-24, um nivel abaixo.** O laco de dry-run chama
-- `anonimizar_candidato(id, true)`, que chama ESTA funcao no PASSO 0. Se este ramo
-- exigisse `modo_vigente = 'live'`, o dry-run morreria aqui durante os 14 dias
-- inteiros da janela `dry_run` — a asserção (b) do contrato de validacao voltaria a
-- ser insatisfazivel e a fase voltaria a provar ZERO sobre o caminho do delete. E
-- literalmente a contradicao que D-46-24 resolveu, reaparecida uma funcao adiante.
-- `off` NAO autoriza, e o smoke assere exatamente isso — assercao (p.1) de
-- `p46_purga_smoke.sql`.
--
-- **O QUE O RAMO EXIGE, E POR QUE O ALVO IMPORTA TANTO QUANTO O MODO:** item vivo
-- em `purga_execucao_itens` PARA AQUELE `p_candidato_id`, com `concluido_em` nulo,
-- sob execucao em `situacao = 'executando'`. Sem a condicao de ALVO, estar em
-- `dry_run` autorizaria ler o plano de QUALQUER pessoa — e o ACL desta funcao
-- existe precisamente porque contagens de PII enumeraveis sao superficie de
-- exfiltracao. O ramo autoriza ler o plano de quem a purga ESTA processando, e de
-- mais ninguem.
--
-- -----------------------------------------------------------------------------
-- (4) ORDEM DE ENTREGA + QUAL SMOKE E O CONTRATO
-- -----------------------------------------------------------------------------
-- ⚠⚠ ORDEM DE APPLY OBRIGATORIA, E ELA E **`006 -> 008 -> 009 -> 007`**:
--   1o  20260823000001..5  (config, ledger, predicado, varredura, hold+excecoes)
--   2o  20260823000006     (o 4o ramo do MOTOR + o bloco que ABORTA o apply)
--   3o  20260823000008     (o 3o ramo do PLANO — Blocker B-02)
--   4o  20260823000009     (os dominios: modo_vigente, e `desconhecido` nos desfechos)
--   5o  20260823000007     (o laco de dry-run passa a CHAMAR o motor)
--
-- ⚠ POR QUE `009` VEM ANTES DE `007`, e a razao mudou na rodada 2 do review: a
-- reconciliacao de `007` ESCREVE `desfecho_* = 'desconhecido'` (RD2-01), e esse
-- valor so passa a ser aceito pelos `CHECK` depois de `009`. Aplicar `007` antes
-- faria a primeira reconciliacao abortar com 23514.
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
-- ⚠ ESTA MIGRATION DEPENDE do bloco de auto-verificacao da `20260823000006`, que
-- pergunta ao catalogo se um papel de CLIENTE pode escrever em `purga_execucoes`,
-- `purga_execucao_itens`, `config_purga` e `retencao_hold`, e ABORTA o apply se
-- puder. O ramo escrito AQUI se apoia nas mesmas tres primeiras leituras.
--
-- ⚠ ESTA MIGRATION MUDA O `md5(prosrc)` DE `plano_exclusao_titular`. O pin
-- `97634d07ef13447e06741a8c8372fca6` de `p45_motor_exclusao_smoke.sql` (assercao
-- C3) e re-carimbado no MESMO commit, com conferencia CRUZADA vivo x arquivo, e o
-- valor antigo permanece no bloco de PROVENIENCIA como historico.
--
-- A espec executavel e `supabase/tests/p46_purga_smoke.sql`, assercao **(p)**: o
-- ramo novo RECUSA sob `off` e sem alvo, e ACEITA dentro das condicoes. Ela e
-- CONTRATO: se algo divergir, corrige-se ESTA migration, nunca o smoke.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · `public.plano_exclusao_titular(uuid)` — corpo INTEIRO, com UMA mudanca:
--     o terceiro ramo autorizado do guard, nas DUAS metades.
-- ---------------------------------------------------------------------------
-- ⚠ O corpo abaixo e a copia fiel do arquivo `20260805000005`, conferida por md5
-- antes da edicao (secao 2). As unicas diferencas sao DUAS, ambas na regiao do
-- guard: o calculo de `v_por_purga` antes da metade (a), e a alternativa
-- cumulativa em (a) e em (b) — a (a) mantendo a mensagem VERBATIM e a (b) com a
-- mensagem ESTENDIDA para nomear a terceira condicao. Nada mais foi tocado: nem a
-- enumeracao de bloqueadores, nem os arrays de escopo, nem o objeto de retorno.
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

-- o `pg_default_acl` do schema `public` neste projeto concede EXECUTE a `anon` e a
-- `authenticated` como grants DIRETOS E NOMEADOS em todo `CREATE FUNCTION`.
-- `REVOKE ... FROM PUBLIC` sozinho remove um grant de PUBLIC que NUNCA EXISTIU e
-- deixa `anon=X` de pé. Hoje há 61 funções DEFINER em `public` com EXECUTE para
-- `anon`, 39 chamáveis via PostgREST
-- (`docs/compliance/anon-execute-definer-audit.md:11-18`).
--
-- Esta função devolve CONTAGENS de PII por pessoa. Uma tela capaz de enumerá-las é
-- superfície de exfiltração construída sem necessidade — então a proibição vive
-- AQUI, no ACL, e não na camada de apresentação.
--
-- ⚠⚠ BL-01 do `46-REVIEW.md`. A versao anterior desta secao dizia que o ACL era
-- "reemitido identico ao vivo". **Nao era**: o ACL vivo NAO e o do arquivo
-- `20260805000005`, porque a `20260805000009:174-175` (plano 45-12 / `DI-45-10-01`)
-- o emendou em 2026-08-05 acrescentando `authenticated`. Num apply incremental
-- contra o banco vivo, o `REVOKE` abaixo roda DEPOIS daquela migration e, sem o
-- `GRANT` da ultima linha, remove o grant de que o caminho do titular depende — a
-- EF `executar-direito-titular` chama esta funcao com o `Authorization` do
-- titular e o PostgREST deriva o PAPEL do MESMO JWT, entao a chamada chega como
-- `authenticated`. O motor pararia no PASSO 0 com 42501.
--
-- A LINHA DE BASE REAL, recomposta por inteiro, com a proveniencia de cada grantee:
--   · `anon` e `PUBLIC` — REVOGADOS (a metade que morde; ver acima).
--   · `service_role`    — `20260805000005:477`.
--   · `authenticated`   — **`20260805000009:174-175`**, e o portao (C1) do
--     `p45_motor_exclusao_smoke.sql` EXIGE este grant.
-- ⚠ Alcancar a funcao como `authenticated` nao da acesso ao caminho da purga:
-- desde o BL-02 o 3o ramo so vale para chamador SEM sessao.
REVOKE ALL ON FUNCTION public.plano_exclusao_titular(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plano_exclusao_titular(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.plano_exclusao_titular(uuid) TO authenticated;


COMMENT ON FUNCTION public.plano_exclusao_titular(uuid) IS
  'Phase 45 / ERASE-02 + ERASE-09 + ERASE-10: A UNICA DEFINICAO do que a exclusao de um titular '
  'faria. Devolve jsonb com uma chave por passo de PASSOS_MOTOR (supabase/functions/_shared/'
  'reciboExclusao.ts:23-31) e as contagens do que seria afetado. STABLE SECURITY DEFINER com '
  'search_path vazio; delimitador NOMEADO para que md5(prosrc) seja extraivel pelo smoke. '
  '⚠ SE VOCE VEIO ESCREVER O EXECUTOR (o tombstone, ou o passo 0 da Edge Function do 45-10): '
  'CHAME ESTA FUNCAO, NAO COPIE O CORPO. O dry-run e o delete real TEM de sair da mesma expressao; '
  'um dry-run que diverge do predicado e decoracao. Precedente nomeado: P39 CR-02, uma guarda que '
  'era dead code. O smoke supabase/tests/p45_motor_exclusao_smoke.sql fecha isso por DOIS lados na '
  'assercao C3 — pina o md5(prosrc) desta funcao E exige que pg_get_functiondef de '
  'anonimizar_candidato CONTENHA a chamada a ela. Uma segunda copia do predicado reprova o gate. '
  'Com so o md5, alguem deixaria esta funcao intacta e reescreveria o tombstone com um predicado '
  'proprio "mais rapido": o md5 seguiria verde e o dry-run voltaria a mentir. '
  '⚠ E ISSO IMPORTA MAIS AQUI DO QUE IMPORTAVA NA P43: com o PITR desligado (D-45-10) e o backup '
  'de 7 dias excluindo Storage inteiramente, o dry-run nao e processo — e a UNICA rede desta fase. '
  '⚠ O QUE ESTA FUNCAO NAO ENUMERA, E POR QUE: Storage e Auth vem com fonte = fora_do_banco e '
  'contagem NULA. A SONDA 2 mediu que storage.objects NAO tem FK para auth.users (a unica FK e '
  'bucket_id -> storage.buckets), entao nao existe caminho relacional do titular ate os objetos '
  'dele e um numero inventado por convencao de prefixo PARECERIA resposta. A enumeracao real e '
  'storage.list(prefixo) paginado, no 45-10. Corolario que redefine o ERASE-03: a ordem '
  'Storage -> Postgres -> Auth NAO e imposta pela plataforma (REQUIREMENTS.md:25 esta factualmente '
  'errado) — e disciplina do motor, e o modo de falha e SILENCIOSO, porque uma ordem errada nao '
  'levanta erro: apenas orfana o blob para sempre, sem PITR e sem backup de Storage. '
  '⚠ AS CONTAGENS SAO POR CONTA, MEDIDAS NA HORA, NUNCA POR LISTA FIXA. A SONDA 6 (§6a) refutou a '
  'inferencia de "sete colunas a severar": as vinte FKs NO ACTION para auth.users tem ZERO linha '
  'para os 21 titulares puros, porque quem move etapa e quem decide e o RH. E o bloqueador do '
  'deleteUser foi DIFERENTE em duas contas reais (historico_candidatura.candidatura_id no titular '
  'puro, alcancado transitivamente; preferencias_notificacoes.created_by na conta hibrida '
  'candidato+RH). '
  '⚠⚠ bloqueadores_deleteuser (CR-05, plano 45-13): ESTA FUNCAO ENUMERA OS BLOQUEADORES, EM VEZ DE '
  'AFIRMAR QUE O MOTOR OS TRATA. Ate o 45-12 esta chave e este COMMENT declaravam um tratamento de '
  '23503 por classe que NAO EXISTIA EM CODIGO NENHUM da fase — uma garantia que era dead code, '
  'vivendo num COMMENT que a proxima pessoa le como fato medido (padrao P39/CR-02). O que existe '
  'agora e mecanismo: a chave lista, do catalogo (pg_constraint por confdeltype em a/r), as FKs '
  'para auth.users que BLOQUEIAM o delete e que tem linha viva apontando ao titular, MENOS as '
  '(tabela, coluna) que o tombstone severa para o USER_ID INTEIRO — lista declarada nominalmente no '
  'corpo, num lugar so, que e o contrato entre as duas funcoes do motor. '
  '⚠⚠ E O QUALIFICADOR "PARA O USER_ID INTEIRO" E O DEFEITO QUE O 45-14 FECHOU (BL-02): ate o 45-13 '
  'a lista subtraia tambem candidatos.created_by/updated_by e candidaturas.created_by/updated_by, '
  'que o tombstone severa APENAS nas linhas DESTE candidato. Uma linha de OUTRO candidato com '
  'autoria deste user_id nao era severada e nao era enumerada: a chave voltava VAZIA com um '
  'bloqueador real de pe, a Edge Function nao recusava, o passo 1 destruia o curriculo e o '
  'deleteUser do passo 3 falhava com 23503 de forma REPETIVEL — curriculo destruido, e-mail do '
  'titular vivo em auth.users para sempre, recibo nunca enviado. Os quatro passaram a ser enumerados '
  'com o MESMO escopo da severacao (t.id / t.candidato_id IS DISTINCT FROM o candidato do pedido). '
  'A saida alternativa — alargar a severacao para o user_id inteiro — foi RECUSADA: linhas de '
  'OUTRAS pessoas perderiam o registro de autoria por causa do pedido de um terceiro. '
  '⚠ A prova esta na auto-verificacao de 20260805000006 (caso (vii)), e nao aqui, porque ela exige '
  'FIXTURE e esta migration e declaradamente READ-ONLY: uma linha de OUTRO candidato com '
  'updated_by = <uid do titular> tem de fazer bloqueadores_deleteuser vir NAO-VAZIA. '
  '⚠⚠ 45-15 / NW-01: a (vii) mede as duas tabelas SEPARADAMENTE, porque as colunas de recorte '
  'sao DIFERENTES — t.id em candidatos, t.candidato_id em candidaturas — e a assimetria e onde o '
  'erro nasce. Escrever t.id tambem para candidaturas compara o id da CANDIDATURA com o id do '
  'CANDIDATO, que nunca sao iguais: o probe nunca excluiria nada e o motor RECUSARIA TODA exclusao '
  'legitima, porque quem se candidata por si mesmo escreve a propria autoria na propria '
  'candidatura. A (vii)(c) e a unica assercao da fase que alcanca esse par. '
  '⚠ E a (vii) tem uma PRECONDICAO de catalogo (45-15 / NW-02): os QUATRO pares tem de continuar '
  'FK NO ACTION/RESTRICT para auth.users, senao o laco abaixo nao os enumera, as medicoes passam '
  'por vacuidade e a falha culparia um defeito de recorte que nao aconteceu. '
  'A assimetria e deliberada: quem '
  'acrescenta uma severacao la acrescenta aqui (e no laco, se ela for escopada a uma linha), e quem '
  'acrescenta uma FK NOVA ao schema nao precisa '
  'fazer nada — ela aparece sozinha como bloqueador e o motor recusa. A Edge Function recusa ANTES '
  'do passo 1 se a lista vier nao-vazia, e e isso que transforma o 23503 de desfecho esperado em '
  'recusa barata: sem PITR e com o Storage fora de todo backup, um 23503 no passo 3 deixa o '
  'curriculo destruido e a pessoa nao apagada. '
  '⚠ decisao_final.por_usuario NAO esta entre as severadas, e a omissao e a DECISAO: e NOT NULL, '
  'aponta ao recrutador que decidiu, e severa-la destruiria a prova de avaliacao humana (RNF-07a / '
  'Art. 7o, VI). Numa conta hibrida candidato+RH ela e um bloqueador LEGITIMO, e o desfecho certo e '
  'a recusa antes da primeira mutacao — com o nome da tabela e da coluna no plano. '
  '⚠ O SQL dinamico da enumeracao passa o user_id por PARAMETRO e os identificadores por %I: '
  'interpolar valor no texto do comando numa funcao SECURITY DEFINER nao e estilo. '
  'GUARD NULL-SAFE em TRES metades desde o 46-04 (eram duas): (a) recusa 42501 o chamador SEM CLAIM '
  'NENHUMA; (b) recusa quem '
  'nao e rh, nao e administrador E nao e o dono de p_candidato_id. As TRES comparacoes da metade '
  '(b) sao por IS DISTINCT FROM e nunca por NOT IN (que avalia NULL, nao toma o IF, e falha ABERTO '
  'para anon — defeito real medido na 42-06); com o candidato inexistente ou ja severado o dono '
  'resolve NULL, NULL IS DISTINCT FROM <uid> e TRUE, e a funcao recusa. DEFINER bypassa RLS, entao '
  'este guard e o unico controle do corpo. '
  '⚠ POR QUE O TITULAR ESTA ENTRE OS CHAMADORES ACEITOS, E A RAZAO E DATAVEL (45-12): o plano '
  '45-07 desenhou esta funcao como funcao de OPERADOR (rh/administrador, GRANT so a service_role) '
  'e o plano 45-10 — escrito depois — a cabeou dentro do caminho de execucao DO PROPRIO TITULAR, '
  'que e quem clica em "apagar meus dados" e cujo papel de aplicacao e candidato. As duas metades '
  'estavam certas isoladamente; a junta nao estava, e o desfecho era 42501 na metade (b) mesmo com '
  'as claims chegando. O conserto ESTENDE o guard, nunca afrouxa a metade (a). '
  '⚠ OBRIGACAO DO CHAMADOR: o guard le a CLAIM, nao o papel do banco. Um cliente service_role sem '
  'Authorization de usuario tem auth.uid() NULO e recebe 42501 — passar as claims e obrigacao '
  'declarada da Edge Function, e a assercao C2 do smoke a exige das cinco funcoes da fase. '
  'ACL: REVOKE ALL de PUBLIC e anon NOMINALMENTE (pg_default_acl concede a anon como grant DIRETO, '
  'entao revogar so de PUBLIC nao remove nada). Alem do GRANT a service_role, a migration '
  '20260805000009 (plano 45-12) concede EXECUTE a authenticated: o PostgREST deriva o PAPEL do '
  'MESMO JWT que carrega as claims, entao o client da Edge Function que repassa o Authorization do '
  'titular chega como authenticated e nao como service_role. O precedente e a Phase 44 — ACL abre '
  'a porta ao papel, o guard do corpo decide quem passa. '
  '⚠⚠⚠ 46-04 — (p) A TERCEIRA METADE: O MOTOR DA PURGA DE RETENCAO (Blocker B-02, Saida A, decisao '
  'do operador de 2026-08-22). PROBLEMA MEDIDO: anonimizar_candidato CHAMA esta funcao no PASSO 0, '
  'e o 4o ramo do guard DAQUELA funcao (D-46-18) sozinho nao bastava — a chamada do cron era '
  'autorizada la e morria com 42501 AQUI, tres linhas depois. SECURITY DEFINER nao ajuda: ele troca '
  'o papel do BANCO, e estes guards decidem sobre a CLAIM do JWT, que sob pg_cron e NULA (medido em '
  'PROD em 2026-08-22). ⚠ A ALTERNATIVA ENTRA NAS DUAS METADES, e nao so na (a): para um titular '
  'REAL sob o cron, v_user_id e um uuid e v_uid e NULL, entao v_user_id IS DISTINCT FROM v_uid e '
  'TRUE e a metade (b) recusaria mesmo com a (a) resolvida. Ela e CUMULATIVA, nunca substitutiva — '
  'rh, administrador e o proprio titular continuam passando pelo caminho de sempre. '
  'O QUE O RAMO EXIGE: item em purga_execucao_itens para ESTE candidato, com concluido_em nulo, sob '
  'execucao com situacao = executando e modo_vigente em dry_run ou live, e config_purga.modo em '
  'dry_run ou live. ⚠ O ALVO IMPORTA TANTO QUANTO O MODO: sem a condicao de candidato_id, estar numa '
  'purga autorizaria ler o plano de QUALQUER pessoa, e esta funcao devolve contagens de PII por '
  'titular — e por isso que o REVOKE acima nomeia anon e authenticated. '
  'ESCOPO DUPLO (dry_run OU live), pela mesma razao de D-46-24 um nivel abaixo: o laco de dry-run '
  'chama anonimizar_candidato(id, true), que chama ESTA funcao. Exigir live aqui mataria o dry-run '
  'durante os 14 dias inteiros da janela e a fase voltaria a provar ZERO sobre o caminho do delete. '
  'off NAO autoriza — e o kill switch de D-46-06. '
  '⚠ E UM PREDICADO SO, E ISSO E DELIBERADO: esta funcao e STABLE e NAO TEM caminho destrutivo, '
  'entao um segundo ramo restrito a live seria um SUBCONJUNTO ESTRITO deste e nunca poderia ser a '
  'razao de a funcao autorizar — codigo morto dentro de um guard, que e o P39/CR-02 literal. A '
  'obrigacao de metades fisicamente distintas de D-46-24 vale onde HA duas metades, e la ela esta '
  'cumprida: 20260823000006, secao (p.2), no caminho que de fato destroi. '
  '⚠⚠ ESCOPO HONESTO DO RAMO (RD2-07): v_uid IS NULL nao seleciona "o cron" e sim TODO chamador sem '
  'sessao de usuario — na pratica service_role (o cron, a EF purgar-retencao, um script, o MCP). NAO '
  'e escalacao: service_role bypassa RLS, ja tem DML irrestrito sobre tudo o que esta funcao conta, e '
  'pode FABRICAR o item que autoriza. O ramo nao lhe da capacidade nova; muda so a porta. O que ele '
  'NAO faz e autorizar papel de CLIENTE sem sessao. '
  '⚠ NAO HA B-03: a cadeia de chamadas com guard de sessao foi varrida inteira e '
  'anonimizar_candidato -> plano_exclusao_titular e o UNICO par; esta funcao nao chama mais nenhuma '
  'funcao guardada. E isso que torna a Saida A suficiente em vez de o proximo nivel a descobrir. '
  '⚠ DE QUE ESTE RAMO DEPENDE: da seguranca de public.purga_execucoes, public.purga_execucao_itens '
  'e public.config_purga. O bloco de auto-verificacao da migration 20260823000006 pergunta ao '
  'CATALOGO se authenticated pode escrever nas tres (mais retencao_hold, pelo caminho indireto) e '
  'ABORTA O APPLY se puder — o pressuposto e assercao, nao confianca.';
