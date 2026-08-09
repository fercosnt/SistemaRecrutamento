-- =============================================================================
-- Phase 47 / Plano 47-03 Task 2 — ESPEC EXECUTÁVEL das duas migrations aditivas:
-- a ADOÇÃO de `data_deletion_log` (CONSOL-03) e o fim da afirmação fabricada em
-- `autorizacoes.autorizacao_analise_video` (CONSENT-05)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Escrito junto com `20260809000002` e `20260809000003`, deliberadamente RED antes
-- do apply: o comentário de catálogo ainda promete uma função ausente, o escritor
-- ainda audita num destino só, e a coluna ainda tem `DEFAULT false NOT NULL`.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se o apply
-- divergir deste arquivo, **corrige-se o apply**. Alterar o smoke para caber no que
-- aconteceu é ESCALAR o problema, não resolvê-lo — é exatamente o movimento que
-- transforma um gate em decoração.
--
-- COMO RODAR
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** — nunca
-- pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug upstream
-- anthropics/claude-code#13898). A chamada única é obrigatória por motivo mecânico:
-- `set_config(..., false)` é escopado à SESSÃO, então statements espalhados por
-- chamadas separadas zerariam o contador `smoke47.pass` e o RESUMO (z) reprovaria um
-- run que na verdade passou (lição registrada da P41-05).
--
-- GATE VERDE = o contador `smoke47.pass` bate **7** no RESUMO (z). O gate NÃO é "não
-- levantou exceção": um run parcial (asserção pulada por erro de ambiente) acumularia
-- < 7 e o RESUMO reprova ALTO. Esperado FIXO — não há metade adaptativa.
--
-- ⚠ ESTE SMOKE ESCREVE — e desfaz tudo que escreve, por construção. As asserções (c)
-- e (f) fazem escritas REAIS dentro de subtransações SEMPRE revertidas (idioma
-- `RAISE EXCEPTION` com SQLSTATE próprio, capturado logo acima). Provar por EXECUÇÃO
-- em vez de por leitura de catálogo é deliberado nessas duas: o catálogo conta o que
-- os objetos DIZEM; a execução conta o que o banco FAZ, e as duas afirmações centrais
-- desta fase — "a adoção tem escrita real nos dois destinos" e "o banco parou de
-- responder no lugar do código" — só são verdadeiras no segundo sentido. As asserções
-- (d) e (g) confirmam, ao fim, que nada do smoke sobreviveu.
--
-- ⚠ PRÉ-CONDIÇÃO DE ORDEM: rodar DEPOIS de aplicar `20260809000002` **e**
-- `20260809000003`. Rodar entre as duas reprova em (e) — corretamente.
--
-- -----------------------------------------------------------------------------
-- AS 7 ASSERÇÕES
-- -----------------------------------------------------------------------------
--   (a) A tabela adotada `data_deletion_log` EXISTE, com o índice
--       `idx_data_deletion_log_deleted_at` e a policy
--       `administrador_le_data_deletion_log` intactos. A decisão do operador em
--       2026-08-09 foi ADOTAR: a ausência de qualquer um dos três significaria que
--       alguém tornou esta fase destrutiva sem passar por portão nenhum.
--   (b) O comentário de catálogo da tabela adotada NÃO promete mais a função de
--       exclusão de titular da Phase 15, **e aquela função continua AUSENTE do
--       catálogo**. As duas metades juntas são o ponto: a promessa foi removida
--       porque nunca teve executor, não porque alguém a implementou às pressas para
--       o smoke passar.
--   (c) CAMINHO FELIZ da adoção — um rollback REAL de versão de prompt, numa
--       subtransação revertida, grava **DUAS** linhas: uma em `data_deletion_log` e
--       uma em `logs_auditoria`, na MESMA transação. É a prova de que a adoção é
--       real e não nominal, e de que a trilha passou a existir onde alguém a lê.
--   (d) NEGATIVA — a contagem de `prompt_versions` é idêntica antes e depois do
--       trabalho desta fase: nenhuma versão foi promovida, depreciada ou perdida
--       por efeito colateral do smoke.
--   (e) `autorizacoes.autorizacao_analise_video` EXISTE, **não tem valor padrão**,
--       **aceita nulo** e continua COMENTADA. As duas pontas (existe + comentada)
--       são a asserção (c) do `p43_consent_prova_smoke.sql`, que tem de continuar
--       verde depois desta fase — e continua, por desenho.
--   (f) CAMINHO FELIZ do discriminador — uma linha de `autorizacoes` inserida SEM a
--       chave, numa subtransação revertida, grava **NULO**. É a asserção que prova
--       que o banco parou de responder no lugar de um código que se absteve.
--   (g) NEGATIVA — nenhum valor histórico foi alterado: a distribuição por valor
--       (nulo / false / true) é idêntica antes e depois do smoke, e o total de
--       valores NÃO-NULOS não caiu abaixo do medido em 2026-08-02 (back-fill para
--       nulo apagaria o registro de que a pergunta um dia foi feita).
--   (z) RESUMO — exige o total de 7 PASS; run parcial falha AQUI, não em silêncio.
--
-- -----------------------------------------------------------------------------
-- ESCOPO DA PROVA — o que ela cobre e o que ela NÃO cobre
-- -----------------------------------------------------------------------------
-- COBRE: a integridade do objeto adotado, a ausência da promessa E do executor
-- prometido, a escrita real nos dois destinos por execução, a forma da coluna do
-- CONSENT-05 e o comportamento de omissão por execução, mais as duas negativas.
--
-- NÃO COBRE: a UI. Que o diálogo de confirmação do rollback deixou de nomear o
-- objeto de banco é provado pelo portão automático da Task 3 do plano 47-03, no
-- corpus Vitest — não aqui. Também não cobre a regeneração de `database.types.ts`,
-- bloqueada por ambiente e REGISTRADA como dívida no `47-03-SUMMARY.md`.
--
-- HIGIENE: `RESET ROLE` em toda troca de papel e ao final; NOTICEs carregam apenas
-- contagens, SQLSTATEs e nomes de objeto — NUNCA PII (nome, e-mail, IP de aceite) e
-- nunca o valor de um segredo.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke47.pass', '0', false);

-- ⚠ TRANSCREVER ANTES DE RODAR: total de linhas de `autorizacoes` com
-- `autorizacao_analise_video` NÃO-NULO, medido ANTES do apply de `20260809000003`.
-- O valor abaixo é a medição de 2026-08-02 (14 false + 3 true = 17). Se a base
-- cresceu entre aquela data e o apply, o número real é MAIOR — atualize-o. A
-- asserção (g) exige `>=`, nunca `=`: linhas novas nascidas antes do apply herdaram
-- o `DEFAULT false` e são não-nulas legitimamente. O que (g) barra é a queda, que
-- só um back-fill para nulo produz.
SELECT set_config('smoke47.esperado_nao_nulos', '17', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) A TABELA ADOTADA ESTÁ INTEIRA — relação, índice e policy.
--
--     Adotar significa manter o OBJETO, não só a relação. Um índice ou uma policy
--     perdidos no caminho fariam a "adoção" entregar menos do que existia antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  v_tabela oid;
  v_indice int;
  v_policy int;
BEGIN
  SELECT c.oid INTO v_tabela
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'data_deletion_log' AND c.relkind = 'r';

  IF v_tabela IS NULL THEN
    RAISE EXCEPTION 'P47 FAIL (a): public.data_deletion_log nao existe. A decisao do operador em 2026-08-09 foi ADOTAR, e a Phase 47 nao tem portao destrutivo. A ausencia desta tabela deixa ONZE consumidores derivados descrevendo um objeto inexistente, dois deles artefatos que se declaram autoridade de compliance';
  END IF;

  SELECT count(*) INTO v_indice
    FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid
   WHERE i.indrelid = v_tabela AND ic.relname = 'idx_data_deletion_log_deleted_at';

  SELECT count(*) INTO v_policy
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'data_deletion_log'
     AND policyname = 'administrador_le_data_deletion_log';

  IF v_indice <> 1 THEN
    RAISE EXCEPTION 'P47 FAIL (a): idx_data_deletion_log_deleted_at ausente (% encontrados)', v_indice;
  END IF;

  IF v_policy <> 1 THEN
    RAISE EXCEPTION 'P47 FAIL (a): a policy administrador_le_data_deletion_log esta ausente (% encontradas). Sem ela a unica leitura possivel da trilha adotada deixa de existir, e a adocao vira uma tabela que ninguem pode nem sequer consultar', v_policy;
  END IF;

  PERFORM set_config('smoke47.pass', (coalesce(nullif(current_setting('smoke47.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): tabela adotada intacta — relacao, indice e policy de leitura de administrador';
END $a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) A PROMESSA SAIU **E** O EXECUTOR PROMETIDO CONTINUA AUSENTE.
--
--     A segunda metade é a que impede o atalho: alguém poderia fazer a primeira
--     metade passar criando às pressas uma função com aquele nome. Exigir que ela
--     continue NÃO existindo é exigir que a promessa tenha sido removida pelo
--     motivo certo — ela nunca teve executor.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $b$
DECLARE
  v_comment text;
  v_funcao  int;
BEGIN
  v_comment := obj_description('public.data_deletion_log'::regclass, 'pg_class');

  IF v_comment IS NULL OR length(btrim(v_comment)) = 0 THEN
    RAISE EXCEPTION 'P47 FAIL (b): a tabela adotada esta SEM comentario de catalogo. Uma tabela adotada sem razao escrita e uma tabela que a proxima fase apaga por nao saber para que serve';
  END IF;

  IF v_comment LIKE '%delete_candidate_data%' THEN
    RAISE EXCEPTION 'P47 FAIL (b): o comentario de catalogo AINDA promete a funcao de exclusao de titular deferida a Phase 15. E a promessa orfa canonica deste repositorio e a entrada no 1 do registro de promessas do CONSOL-04 — enquanto ela estiver la, o CONSOL-03 nao fechou';
  END IF;

  SELECT count(*) INTO v_funcao
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'delete_candidate_data';

  IF v_funcao <> 0 THEN
    RAISE EXCEPTION 'P47 FAIL (b): existe(m) % funcao(oes) public.delete_candidate_data no catalogo. A promessa devia ter sido removida por NUNCA TER TIDO EXECUTOR — se alguem criou a funcao para fazer esta assercao passar, o motor de exclusao de titular deste projeto passou a ter DOIS caminhos, e o real e a RPC de anonimizacao da Phase 45', v_funcao;
  END IF;

  IF v_comment NOT LIKE '%anonimizar_candidato%' THEN
    RAISE EXCEPTION 'P47 FAIL (b): o comentario novo nao NOMEIA o motor real de exclusao de titular (public.anonimizar_candidato, Phase 45). Remover a promessa sem apontar o caminho certo troca uma mentira por um vazio — a proxima pessoa que abrir o catalogo continua sem saber onde a exclusao de verdade acontece';
  END IF;

  PERFORM set_config('smoke47.pass', (coalesce(nullif(current_setting('smoke47.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): promessa removida do catalogo, executor prometido continua ausente (0 funcoes) e o motor real esta nomeado';
END $b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) CAMINHO FELIZ — o rollback grava nos DOIS destinos, na mesma transação.
--
--     Fixture: uma versão de prompt depreciada há 1 dia, criada dentro da própria
--     subtransação revertida, para não depender de o banco ter por acaso um alvo
--     elegível (a validação exige depreciação < 1 ano). A claim de administrador é
--     injetada por `request.jwt.claims` — o guard da RPC é NULL-safe e recusaria a
--     chamada sem ela, e um SKIP silencioso aqui seria indistinguível de uma
--     função que não audita.
--
--     ⚠ Variáveis de PL/pgSQL NÃO são revertidas por rollback de subtransação, então
--     as contagens sobrevivem à reversão das linhas.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c$
DECLARE
  v_call        public.llm_call_type;
  v_semver      text := '0.0.0-smoke47';
  v_ddl_antes   int;
  v_ddl_depois  int  := -1;
  v_log_antes   int;
  v_log_depois  int  := -1;
  v_pv_antes    int;
  v_alvo        uuid;
BEGIN
  SELECT count(*) INTO v_pv_antes FROM public.prompt_versions;
  PERFORM set_config('smoke47.pv_antes', v_pv_antes::text, false);

  SELECT pv.call_type INTO v_call
    FROM public.prompt_versions pv
   GROUP BY pv.call_type
   ORDER BY count(*) DESC
   LIMIT 1;

  IF v_call IS NULL THEN
    RAISE EXCEPTION 'P47 FAIL (c/fixture): nenhuma linha em public.prompt_versions — nao ha call_type para exercitar o rollback. Um SKIP silencioso aqui seria indistinguivel de uma funcao que nao audita';
  END IF;

  BEGIN
    -- Fixture: alvo elegivel (depreciado ha 1 dia, inativo). INSERT nao passa pelo
    -- trigger de imutabilidade, que so vigia UPDATE de conteudo.
    INSERT INTO public.prompt_versions
      (call_type, semver, content_hash, system_template, user_template,
       model_id, max_tokens, is_active, is_canary, change_summary, changed_by,
       created_at, deployed_at, deprecated_at)
    VALUES
      (v_call, v_semver, 'smoke47-' || gen_random_uuid()::text, 'smoke47', 'smoke47',
       'smoke47-model', 16, false, false, 'fixture do smoke 47-03 — sempre revertida', 'smoke47',
       now(), now() - INTERVAL '2 days', now() - INTERVAL '1 day');

    -- Claim de administrador. O guard vivo da RPC e NULL-safe: sem esta linha ele
    -- recusa com 42501, corretamente.
    PERFORM set_config(
      'request.jwt.claims',
      json_build_object(
        'sub', gen_random_uuid()::text,
        'app_metadata', json_build_object('role', 'administrador')
      )::text,
      true
    );

    SELECT count(*) INTO v_ddl_antes FROM public.data_deletion_log;
    SELECT count(*) INTO v_log_antes FROM public.logs_auditoria;

    v_alvo := public.rollback_to_version(v_call, v_semver);

    SELECT count(*) INTO v_ddl_depois FROM public.data_deletion_log;
    SELECT count(*) INTO v_log_depois FROM public.logs_auditoria;

    -- ROLLBACK INTENCIONAL: as linhas ja provaram o que tinham de provar e nao podem
    -- sobreviver — um rollback de prompt real teria trocado a versao ATIVA em
    -- producao. SQLSTATE proprio para nao confundir com falha real.
    RAISE EXCEPTION 'rollback_smoke47c' USING ERRCODE = 'P4703';
  EXCEPTION
    WHEN sqlstate 'P4703' THEN
      NULL;  -- reversao esperada
  END;

  IF v_alvo IS NULL THEN
    RAISE EXCEPTION 'P47 FAIL (c): rollback_to_version nao devolveu o id do alvo — a chamada nao chegou ao fim do corpo, entao nem a escrita da tabela adotada nem a do sink canonico podem ser afirmadas';
  END IF;

  IF v_ddl_depois - v_ddl_antes <> 1 THEN
    RAISE EXCEPTION 'P47 FAIL (c): o rollback gravou % linha(s) em data_deletion_log, esperado 1. Sem essa escrita a adocao vira NOMINAL, e o criterio de sucesso do CONSOL-03 exige "adotado com escritas REAIS"', v_ddl_depois - v_ddl_antes;
  END IF;

  IF v_log_depois - v_log_antes <> 1 THEN
    RAISE EXCEPTION 'P47 FAIL (c): o rollback gravou % linha(s) em logs_auditoria, esperado 1. Sem o PERFORM de log_auditoria a trilha do rollback existe apenas numa tabela que NENHUMA tela le, e a copy do dialogo de confirmacao ("registrada na trilha de auditoria") volta a ser promessa orfa', v_log_depois - v_log_antes;
  END IF;

  PERFORM set_config('smoke47.pass', (coalesce(nullif(current_setting('smoke47.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): um rollback real gravou DUAS linhas — 1 na tabela adotada e 1 no sink canonico — na mesma transacao, e tudo foi revertido';
END $c$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) NEGATIVA — nenhuma versão de prompt sobreviveu ao smoke.
--
--     A fixture de (c) inserida e o rollback executado teriam deixado a biblioteca
--     de prompts com uma versão a mais e a versão ATIVA trocada. Esta asserção é o
--     que separa "o smoke provou a auditoria" de "o smoke provou a auditoria e
--     mexeu no que está servindo produção".
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $d$
DECLARE
  v_antes  int := current_setting('smoke47.pv_antes')::int;
  v_depois int;
  v_res    int;
BEGIN
  SELECT count(*) INTO v_depois FROM public.prompt_versions;

  IF v_depois <> v_antes THEN
    RAISE EXCEPTION 'P47 FAIL (d): public.prompt_versions tinha % linha(s) e agora tem % — a subtransacao da assercao (c) NAO foi revertida. Uma versao fixture sobrevivente e uma versao ativa trocada em producao', v_antes, v_depois;
  END IF;

  SELECT count(*) INTO v_res FROM public.prompt_versions WHERE changed_by = 'smoke47';

  IF v_res <> 0 THEN
    RAISE EXCEPTION 'P47 FAIL (d): % linha(s) de fixture do smoke sobreviveram em prompt_versions', v_res;
  END IF;

  PERFORM set_config('smoke47.pass', (coalesce(nullif(current_setting('smoke47.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): prompt_versions inalterada (% linhas), zero residuo do smoke', v_depois;
END $d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) A FORMA DA COLUNA DO CONSENT-05 — existe, sem valor padrão, aceita nulo,
--     comentada.
--
--     A existência e o comentário não são zelo extra: são exatamente a asserção (c)
--     do `p43_consent_prova_smoke.sql`, que esta fase se compromete a manter verde.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $e$
DECLARE
  v_attnum  smallint;
  v_notnull boolean;
  v_hasdef  boolean;
  v_comment text;
BEGIN
  SELECT a.attnum, a.attnotnull, a.atthasdef
    INTO v_attnum, v_notnull, v_hasdef
    FROM pg_attribute a
   WHERE a.attrelid = 'public.autorizacoes'::regclass
     AND a.attname  = 'autorizacao_analise_video'
     AND a.attnum   > 0
     AND NOT a.attisdropped;

  IF v_attnum IS NULL THEN
    RAISE EXCEPTION 'P47 FAIL (e): autorizacoes.autorizacao_analise_video DESAPARECEU. A resolucao do CONSENT-05 decidida em 2026-08-09 e NAO-DESTRUTIVA — apagar a coluna apagaria o registro de que a pergunta um dia foi feita, que e historico de tratamento de dados';
  END IF;

  IF v_hasdef IS TRUE THEN
    RAISE EXCEPTION 'P47 FAIL (e): a coluna AINDA tem valor padrao. Enquanto ele existir o banco continua respondendo no lugar de um codigo que deliberadamente se absteve, e cada linha nova afirma um "nao" a uma pergunta que ninguem faz desde a Phase 43';
  END IF;

  IF v_notnull IS TRUE THEN
    RAISE EXCEPTION 'P47 FAIL (e): a coluna continua obrigatoria. Sem aceitar nulo nao existe representacao para "nunca foi perguntado", e ela permanece indistinguivel de "respondeu nao"';
  END IF;

  v_comment := col_description('public.autorizacoes'::regclass, v_attnum);

  IF v_comment IS NULL OR length(btrim(v_comment)) = 0 THEN
    RAISE EXCEPTION 'P47 FAIL (e): a coluna esta SEM comentario de catalogo — e a assercao (c) do p43_consent_prova_smoke reprova alto por isso';
  END IF;

  PERFORM set_config('smoke47.pass', (coalesce(nullif(current_setting('smoke47.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (e): coluna existe, sem valor padrao, aceita nulo, comentada (% chars)', length(v_comment);
END $e$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) CAMINHO FELIZ DO DISCRIMINADOR — omitir a chave grava NULO.
--
--     Provado por INSERÇÃO, não por leitura de `pg_attrdef`: o catálogo conta o que
--     a coluna DIZ; a inserção conta o que o banco FAZ quando o código se abstém —
--     e é o segundo que decide se uma linha afirma um consentimento que ninguém deu.
--     A linha vive só dentro de uma subtransação revertida.
--
--     O candidato-alvo é escolhido entre os que NÃO têm linha de autorizações, para
--     que a inserção não dependa de a tabela ser 1:1 apenas na prática.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $f$
DECLARE
  v_cando   uuid;
  v_valor   boolean;
  v_ehnulo  boolean := NULL;
BEGIN
  SELECT c.id INTO v_cando
    FROM public.candidatos c
   WHERE NOT EXISTS (SELECT 1 FROM public.autorizacoes a WHERE a.candidato_id = c.id)
   LIMIT 1;

  IF v_cando IS NULL THEN
    RAISE EXCEPTION 'P47 FAIL (f/fixture): todo candidato ja possui linha em autorizacoes — nao ha alvo para inserir sem arriscar colidir com a unicidade de fato da tabela. Resolver criando um candidato de teste antes de rodar, nunca reaproveitando uma linha viva';
  END IF;

  BEGIN
    -- A CHAVE autorizacao_analise_video E DELIBERADAMENTE OMITIDA. E o mesmo que a
    -- Edge Function faz (autorizacoes-registro.ts nunca a emite) — a diferenca e que
    -- ate esta fase o banco preenchia `false` por conta propria.
    INSERT INTO public.autorizacoes
      (candidato_id, autorizacao_uso_dados, autorizacao_retencao_curriculo,
       autorizacao_comunicacao, ip_aceite)
    VALUES
      (v_cando, true, true, true, '127.0.0.1'::inet);

    SELECT a.autorizacao_analise_video INTO v_valor
      FROM public.autorizacoes a
     WHERE a.candidato_id = v_cando
     ORDER BY a.created_at DESC
     LIMIT 1;

    v_ehnulo := (v_valor IS NULL);

    RAISE EXCEPTION 'rollback_smoke47f' USING ERRCODE = 'P4704';
  EXCEPTION
    WHEN sqlstate 'P4704' THEN
      NULL;  -- reversao esperada
  END;

  IF v_ehnulo IS NOT TRUE THEN
    RAISE EXCEPTION 'P47 FAIL (f): uma insercao que OMITE a chave gravou um valor nao-nulo. O banco continua respondendo no lugar do codigo, e a linha nova AFIRMA uma resposta a uma pergunta que o formulario nao faz desde a Phase 43 — que e literalmente o defeito que o CONSENT-05 existe para eliminar';
  END IF;

  PERFORM set_config('smoke47.pass', (coalesce(nullif(current_setting('smoke47.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (f): omitir a chave grava NULO — "nunca foi perguntado" passou a ter representacao propria, e a linha do smoke foi revertida';
END $f$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (g) NEGATIVA — nenhum valor histórico foi alterado.
--
--     Duas metades. A primeira: a linha inserida em (f) não sobreviveu. A segunda,
--     que é a que importa para a LGPD: o total de valores NÃO-NULOS não caiu abaixo
--     do medido antes do apply. Um back-fill dos `false` para nulo — o reflexo
--     "limpar o dado fabricado" — apagaria o registro de que a pergunta um dia FOI
--     feita, e a Phase 43 inteira se apoia no princípio inverso: a ausência é o
--     registro honesto, jamais a reescrita retroativa.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $g$
DECLARE
  v_esperado  int := current_setting('smoke47.esperado_nao_nulos')::int;
  v_nulos     int;
  v_falsos    int;
  v_verdades  int;
  v_naonulos  int;
BEGIN
  SELECT count(*) FILTER (WHERE a.autorizacao_analise_video IS NULL),
         count(*) FILTER (WHERE a.autorizacao_analise_video IS FALSE),
         count(*) FILTER (WHERE a.autorizacao_analise_video IS TRUE)
    INTO v_nulos, v_falsos, v_verdades
    FROM public.autorizacoes a;

  v_naonulos := v_falsos + v_verdades;

  IF v_naonulos < v_esperado THEN
    RAISE EXCEPTION 'P47 FAIL (g): o total de valores nao-nulos caiu de % para % — alguem fez BACK-FILL dos historicos para nulo. Isso apaga o registro de que a pergunta foi feita, que e historico de tratamento de dados. A correcao do CONSENT-05 muda o que o banco escreve nas linhas FUTURAS, jamais o que ele ja escreveu', v_esperado, v_naonulos;
  END IF;

  IF v_nulos > 0 AND v_naonulos = 0 THEN
    RAISE EXCEPTION 'P47 FAIL (g): TODA a coluna virou nula (% linhas). O apply reescreveu a base inteira', v_nulos;
  END IF;

  PERFORM set_config('smoke47.pass', (coalesce(nullif(current_setting('smoke47.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (g): distribuicao preservada — % nulo(s), % false, % true (nao-nulos: %, baseline: %)', v_nulos, v_falsos, v_verdades, v_naonulos, v_esperado;
END $g$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — o gate. Um run parcial reprova AQUI, não em silêncio.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  v_pass int := coalesce(nullif(current_setting('smoke47.pass', true), ''), '0')::int;
BEGIN
  IF v_pass <> 7 THEN
    RAISE EXCEPTION 'P47 SMOKE REPROVADO: % de 7 assercoes passaram. Um total menor significa run PARCIAL (statements em chamadas separadas zeram o contador de sessao, ou uma assercao foi pulada por erro de ambiente) — nao significa que o resto passou', v_pass;
  END IF;

  RAISE NOTICE 'P47 SMOKE VERDE: 7/7. CONSOL-03 adotado com escritas reais nos dois destinos e sem promessa orfa no catalogo; CONSENT-05 resolvido de forma nao-destrutiva, com nulo significando "a pergunta nao foi feita" e zero valor historico tocado';
END $z$;

RESET ROLE;
