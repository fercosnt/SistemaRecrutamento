-- =============================================================================
-- Phase 44 / Plano 44-02 Task 3 — ESPEC EXECUTÁVEL do registro de pedidos de dados
-- (EXPORT-05 · BD-8)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Escrito ANTES do apply de `20260804000001_p44_config_sla_dados.sql` e
-- `20260804000002_p44_solicitacoes_dados.sql`, deliberadamente RED: as duas tabelas
-- e as duas funções ainda não existem em PROD. Ele descreve o que as migrations têm
-- de produzir.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se a
-- implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o
-- smoke para caber no que foi aplicado é ESCALAR o problema, não resolvê-lo — é
-- exatamente o movimento que transforma um gate em decoração.
--
-- -----------------------------------------------------------------------------
-- COMO RODAR
-- -----------------------------------------------------------------------------
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** — nunca
-- pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug upstream
-- anthropics/claude-code#13898). A chamada única é obrigatória por motivo MECÂNICO:
-- `set_config(..., false)` é escopado à SESSÃO, então statements espalhados por
-- chamadas separadas zerariam o contador `smoke44.pass` e o RESUMO (z) reprovaria um
-- run que na verdade passou (lição registrada da P41-05 e repetida na P43).
--
-- GATE VERDE = o contador `smoke44.pass` bate **14** no RESUMO (z). O gate NÃO é
-- "não levantou exceção": um run parcial (asserção pulada por erro de ambiente)
-- acumularia < 14 e o RESUMO reprova ALTO. Esperado FIXO — não há metade adaptativa.
--
-- -----------------------------------------------------------------------------
-- ⚠ ESTE SMOKE ESCREVE — E DESFAZ TUDO QUE ESCREVE, POR CONSTRUÇÃO
-- -----------------------------------------------------------------------------
-- As asserções (k), (l), (m) e (n) inserem linhas de fixture em
-- `public.solicitacoes_dados` dentro de subtransações SEMPRE revertidas (idioma
-- `RAISE EXCEPTION` com SQLSTATE próprio, capturado logo acima). **Nenhuma linha de
-- fixture sobrevive ao run.**
--
-- ⚠ A ÚNICA TABELA ESCRITA É `solicitacoes_dados`, que nasce VAZIA nesta fase.
-- O smoke **não escreve em `candidatos`, `candidaturas`, `vagas` nem `auth.users`** —
-- ele RESOLVE identidades vivas e só insere pedidos sobre elas. A alternativa
-- (fabricar candidatos de teste) exigiria escrever em `auth.users`, porque
-- `candidatos.user_id` é `NOT NULL UNIQUE REFERENCES auth.users(id)`. Trocar
-- conveniência de asserção por escrita no schema de autenticação de PRODUÇÃO seria o
-- pior negócio disponível, e o desenho abaixo evita esse negócio inteiramente.
--
-- ⚠ POR QUE O CONTADOR É INCREMENTADO **FORA** DA SUBTRANSAÇÃO. Alterações de GUC
-- são TRANSACIONAIS: um `set_config` feito dentro de um bloco revertido é revertido
-- junto. Por isso cada asserção comportamental mede DENTRO da subtransação, guarda o
-- resultado em variáveis PL/pgSQL (que sobrevivem ao rollback), reverte, e só então
-- julga e incrementa. Incrementar lá dentro produziria um RESUMO que reprova um run
-- correto — a mesma classe de falso-vermelho que a chamada única evita.
--
-- -----------------------------------------------------------------------------
-- AS 14 ASSERÇÕES — cinco delas NEGATIVAS
-- -----------------------------------------------------------------------------
--   (a) As DUAS tabelas existem e têm RLS LIGADA.
--   (b) `config_sla_dados` tem EXATAMENTE 1 policy, e ela é de SELECT.
--   (c) ⊖ NEGATIVA — `solicitacoes_dados` tem EXATAMENTE 1 policy, de SELECT: o
--       candidato NÃO tem caminho de escrita. Se pudesse escrever, poderia NÃO
--       inserir (furando o cooldown) ou inserir já `atendido` sem entrega nenhuma.
--   (d) O índice do cooldown existe e é `(candidato_id, solicitado_em DESC)`.
--   (e) As duas RPCs são `SECURITY DEFINER` com `search_path` blindado.
--   (f) ⊖ NEGATIVA — `anon` NÃO tem EXECUTE em nenhuma das duas. Perguntado ao
--       CATÁLOGO (`has_function_privilege`), nunca lendo o texto do `REVOKE`: o
--       `pg_default_acl` de `public` concede EXECUTE a `anon` em todo
--       `CREATE FUNCTION`, e `REVOKE … FROM PUBLIC` remove um grant que nunca
--       existiu (defeito sistêmico medido na 42-06).
--   (g) O seed de `config_sla_dados` tem 1 linha com dias_atencao < dias_atraso < 15.
--   (h) Os CHECKs de `tipo` e `situacao` fecham exatamente o vocabulário previsto,
--       lidos de `pg_get_constraintdef` e não de string transcrita.
--   (i) ⊖ NEGATIVA — chamador SEM CLAIM NENHUMA é recusado com 42501 nas DUAS
--       funções. É a asserção que o idioma `NOT IN` reprovaria: com `v_role` NULL o
--       `IF` não é tomado e o guard falha ABERTO.
--   (j) ⊖ NEGATIVA — papel `candidato` impersonado é recusado com 42501 nas duas.
--   (k) ESCOPO DO BD-8 (Phase 50 / D-03), positivo E negativo, por impersonação real:
--       um `rh` ATIVO (linha viva de `usuarios_rh`, lida em execução) recebe
--       EXATAMENTE a fila do administrador (md5 da lista inteira, na ordem) e vê os
--       dois pedidos semeados; o `rh` sem linha ativa em `usuarios_rh` (sub sorteado)
--       e o TOKEN VELHO (claim `rh` + recrutador INATIVO) veem 0.
--   (l) ÓRFÃO — pedido de candidato SEM candidatura nenhuma: VISÍVEL ao `rh` ATIVO e
--       ao administrador (Phase 50 / D-03). Até a Phase 49 ele era invisível ao
--       recrutador (escopo por vaga) e só o admin era o «dono»; o operador decidiu
--       que as filas do recrutador ativo são EXATAMENTE as do administrador, órfãos
--       inclusive — o pedido que queima o relógio do Art. 19, II passa a ter os dois
--       como donos, e nenhum deles trabalha às cegas.
--   (m) FILA ≡ CONTADOR (BD-8) em DOIS papéis. Um badge que conta o que a tela não
--       mostra manda o operador caçar trabalho invisível num prazo de 15 dias.
--       Phase 50: o cenário prova escopos DISTINTOS pelo token velho (fila 0 =
--       contador 0, com a do administrador ≥ 2 semeadas), não mais por rh < admin.
--
-- PHASE 50 (D-01, D-02, D-03 — operador, 2026-10-04/05). Nenhum ator `rh` é tirado de
-- `vagas.created_by`: o positivo é uma linha ATIVA de `usuarios_rh` lida em execução;
-- os negativos são uma linha INATIVA de recrutador e um sub sem linha. Rodar SÓ pelo
-- envelope que aborta: `node scripts/p50_ensaio.cjs supabase/tests/p44_pedidos_dados_smoke.sql`
-- (antes do apply do 50-10 ele prefixa 20261005000002..4; depois, `--sem-migracoes`).
-- VERMELHO sem o 20261005000003 (o rh ativo não-autor não vê a fila do admin), VERDE com ele.
--   (n) ORDENAÇÃO COMPOSTA por `WITH ORDINALITY`: pendente-antigo, pendente-novo,
--       atendido-novo, atendido-antigo. É esta asserção que torna VERDADEIRA a copy
--       "todos os não atendidos aparecem".
--   (z) RESUMO — ⊖ NEGATIVA GLOBAL de resíduo (as contagens de `solicitacoes_dados`,
--       `candidatos`, `candidaturas` e `vagas` voltaram ao estado inicial) + gate de
--       contagem com esperado FIXO de 14. Run parcial falha AQUI, não em silêncio.
--
-- -----------------------------------------------------------------------------
-- ESCOPO DA PROVA — o que ela cobre e o que ela NÃO cobre
-- -----------------------------------------------------------------------------
-- COBRE: a forma e a postura de segurança das duas tabelas nos dois sentidos, o
-- hardening de EXECUTE, os dois modos de recusa das RPCs, o CAMINHO FELIZ das duas
-- (a lição da P43: uma função cujo único teste é a recusa está, para efeito de
-- corpo, sem teste nenhum — o guard levanta na primeira linha e o corpo nunca roda),
-- o escopo do BD-8 incluindo o caso órfão, a igualdade fila≡contador e a ordenação.
--
-- NÃO COBRE: a Edge Function `exportar-meus-dados` (plano 44-05), a allowlist do
-- export (44-01/44-03), nem qualquer tela (44-06 a 44-09). Nenhum desses existe
-- ainda.
--
-- HIGIENE: `RESET ROLE` em toda troca de contexto e ao final; a claim impersonada é
-- limpa explicitamente. NOTICEs carregam apenas contagens, SQLSTATEs e nomes de
-- objeto — NUNCA PII (nome, e-mail, CPF) e nunca o valor de um segredo.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke44.pass', '0', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- FIXTURE — identidades VIVAS resolvidas em modo leitura, e as baselines de (z).
--
-- ⚠ Se alguma identidade necessária não existir, levanta exceção ALTO com o nome
-- exato do que falta. Um SKIP silencioso aqui seria indistinguível de uma RPC que
-- devolve tudo para todo mundo: as asserções de escopo deixariam de provar o BD-8 e
-- o gate ficaria verde por AUSÊNCIA DE TESTE — que é o modo de falha que este
-- arquivo inteiro existe para impedir.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_auth  uuid;
  v_rec_auth    uuid;
  v_velho_auth  uuid;
  v_cand_com    uuid;
  v_cand_orfao  uuid;
  v_solic_antes bigint;
  v_candos      bigint;
  v_cands       bigint;
  v_vagas       bigint;
BEGIN
  -- (1) Um administrador VIVO — ator de (l) e de (m).
  SELECT u.user_id INTO v_admin_auth
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador'
     AND u.ativo
     AND u.deleted_at IS NULL
   ORDER BY u.created_at
   LIMIT 1;

  IF v_admin_auth IS NULL THEN
    RAISE EXCEPTION 'P44 FAIL (fixture): nenhum administrador VIVO em usuarios_rh — as asseracoes (l) e (m) nao podem provar que o admin ve a fila inteira, inclusive os orfaos, sem um ator real';
  END IF;

  -- (2) Phase 50 / D-03 — o recrutador do cenário POSITIVO é uma linha ATIVA de
  --     usuarios_rh lida em execução (recrutador primeiro), NUNCA o autor de uma vaga:
  --     a regra deixou de ser a posse. O candidato COM candidatura é o de qualquer
  --     candidatura viva.
  SELECT u.user_id INTO v_rec_auth
    FROM public.usuarios_rh u
   WHERE u.user_id IS NOT NULL AND u.ativo AND u.deleted_at IS NULL
   ORDER BY (u.role = 'recrutador') DESC, u.created_at, u.user_id
   LIMIT 1;

  --     O TOKEN VELHO dos negativos: claim `rh` + recrutador INATIVO (D-02).
  SELECT u.user_id INTO v_velho_auth
    FROM public.usuarios_rh u
   WHERE u.user_id IS NOT NULL AND u.role = 'recrutador' AND NOT u.ativo
   ORDER BY u.created_at, u.user_id
   LIMIT 1;

  SELECT cd.candidato_id INTO v_cand_com
    FROM public.candidaturas cd
   WHERE cd.deleted_at IS NULL
     AND cd.is_rascunho = false
   ORDER BY cd.created_at
   LIMIT 1;

  IF v_rec_auth IS NULL OR v_velho_auth IS NULL OR v_cand_com IS NULL THEN
    RAISE EXCEPTION 'P44 FAIL (fixture): falta ator ou cenario do BD-8 (rh ativo = %, recrutador inativo = %, candidatura viva = %) — a metade POSITIVA do escopo nao tem cenario, e um escopo provado so pela negativa passaria verde com uma RPC que nao devolve nada a ninguem',
      v_rec_auth IS NOT NULL, v_velho_auth IS NOT NULL, v_cand_com IS NOT NULL;
  END IF;

  -- (3) Um candidato ÓRFÃO — zero candidaturas, de qualquer espécie.
  SELECT c.id INTO v_cand_orfao
    FROM public.candidatos c
   WHERE NOT EXISTS (SELECT 1 FROM public.candidaturas cd WHERE cd.candidato_id = c.id)
   ORDER BY c.created_at
   LIMIT 1;

  IF v_cand_orfao IS NULL THEN
    RAISE EXCEPTION 'P44 FAIL (fixture): nenhum candidato SEM candidatura nenhuma — a asseracao (l) do caso ORFAO nao tem cenario. Fabricar um exigiria escrever em auth.users (candidatos.user_id e NOT NULL UNIQUE REFERENCES auth.users), o que este smoke se recusa a fazer em PROD';
  END IF;

  -- Baselines da asserção negativa global de resíduo (z).
  SELECT count(*) INTO v_solic_antes FROM public.solicitacoes_dados;
  SELECT count(*) INTO v_candos      FROM public.candidatos;
  SELECT count(*) INTO v_cands       FROM public.candidaturas;
  SELECT count(*) INTO v_vagas       FROM public.vagas;

  PERFORM set_config('smoke44.admin_auth', v_admin_auth::text,  false);
  PERFORM set_config('smoke44.rec_auth',   v_rec_auth::text,    false);
  PERFORM set_config('smoke44.velho_auth', v_velho_auth::text,  false);
  PERFORM set_config('smoke44.cand_com',   v_cand_com::text,    false);
  PERFORM set_config('smoke44.cand_orfao', v_cand_orfao::text,  false);
  PERFORM set_config('smoke44.solic',      v_solic_antes::text, false);
  PERFORM set_config('smoke44.candos',     v_candos::text,      false);
  PERFORM set_config('smoke44.cands',      v_cands::text,       false);
  PERFORM set_config('smoke44.vagas',      v_vagas::text,       false);

  RAISE NOTICE 'FIXTURE ok: admin, rh ativo, recrutador inativo, candidato-com-candidatura e candidato-orfao resolvidos; baseline = % pedidos / % candidatos / % candidaturas / % vagas',
    v_solic_antes, v_candos, v_cands, v_vagas;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) AS DUAS TABELAS EXISTEM E TÊM RLS LIGADA.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  r        record;
  v_vistas int := 0;
BEGIN
  FOR r IN
    SELECT c.relname, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname IN ('config_sla_dados', 'solicitacoes_dados')
  LOOP
    v_vistas := v_vistas + 1;
    IF NOT r.relrowsecurity THEN
      RAISE EXCEPTION 'P44 FAIL (a): RLS NAO esta ligada em public.% — sem RLS a tabela fica legivel por qualquer papel autenticado, e uma delas registra que pessoa pediu copia dos proprios dados e quando', r.relname;
    END IF;
  END LOOP;

  IF v_vistas <> 2 THEN
    RAISE EXCEPTION 'P44 FAIL (a): encontrei % das 2 tabelas esperadas em public — as migrations 20260804000001 / 20260804000002 nao foram ambas aplicadas', v_vistas;
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): config_sla_dados e solicitacoes_dados existem com RLS ligada';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) `config_sla_dados` — EXATAMENTE 1 policy, de SELECT, RH-only.
--
--     "Exatamente uma" é load-bearing e não contagem decorativa: a postura desta
--     tabela é UMA leitura restrita e NENHUMA escrita. Uma segunda policy já seria
--     um caminho de leitura que ninguém revisou — e a armadilha nomeada é copiar a
--     RLS public-read de `config_sla_etapa`, que poria o limiar interno ao alcance
--     do papel anônimo (Invariante 8 da 44-UI-SPEC).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_total int;
  v_cmd   text;
  v_qual  text;
BEGIN
  SELECT count(*) INTO v_total
    FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'config_sla_dados';

  IF v_total <> 1 THEN
    RAISE EXCEPTION 'P44 FAIL (b): esperava EXATAMENTE 1 policy em config_sla_dados, encontrei %', v_total;
  END IF;

  SELECT p.cmd, p.qual INTO v_cmd, v_qual
    FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'config_sla_dados';

  IF v_cmd <> 'SELECT' THEN
    RAISE EXCEPTION 'P44 FAIL (b): a unica policy de config_sla_dados e de comando %, esperado SELECT', v_cmd;
  END IF;
  IF coalesce(v_qual, '') NOT LIKE '%administrador%' THEN
    RAISE EXCEPTION 'P44 FAIL (b): a policy de SELECT nao restringe por papel (qual = %) — se ela tiver sido copiada da RLS public-read de config_sla_etapa, o limiar interno de acompanhamento esta ao alcance do papel anonimo', coalesce(v_qual, '<nulo>');
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): config_sla_dados tem exatamente 1 policy, de SELECT, restrita por papel';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) ⊖ NEGATIVA — `solicitacoes_dados` tem EXATAMENTE 1 policy, e ela é de SELECT.
--
--     O CANDIDATO NÃO TEM CAMINHO DE ESCRITA, e a razão não é óbvia: se pudesse
--     inserir, ele poderia também NÃO inserir — furando o cooldown de 24h que existe
--     para conter exfiltração repetida — ou inserir uma linha já `atendido` sem que
--     nada tivesse sido entregue, zerando o relógio de um prazo legal sobre uma
--     entrega que não houve. A escrita é exclusiva da EF com `service_role`.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_total   int;
  v_escrita int;
  v_nomes   text;
  v_cmd     text;
BEGIN
  SELECT count(*) INTO v_total
    FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'solicitacoes_dados';

  IF v_total <> 1 THEN
    RAISE EXCEPTION 'P44 FAIL (c): esperava EXATAMENTE 1 policy em solicitacoes_dados, encontrei %', v_total;
  END IF;

  SELECT count(*), coalesce(string_agg(p.policyname || ':' || p.cmd, ', '), '')
    INTO v_escrita, v_nomes
    FROM pg_policies p
   WHERE p.schemaname = 'public'
     AND p.tablename = 'solicitacoes_dados'
     AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');

  IF v_escrita <> 0 THEN
    RAISE EXCEPTION 'P44 FAIL (c): existe(m) % policy(ies) de ESCRITA em solicitacoes_dados (%) — o candidato ganhou um caminho para NAO registrar o proprio pedido (furando o cooldown) ou para registra-lo ja como atendido sem entrega nenhuma', v_escrita, v_nomes;
  END IF;

  SELECT p.cmd INTO v_cmd
    FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'solicitacoes_dados';

  IF v_cmd <> 'SELECT' THEN
    RAISE EXCEPTION 'P44 FAIL (c): a unica policy de solicitacoes_dados e de comando %, esperado SELECT', v_cmd;
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): solicitacoes_dados tem 1 policy, de SELECT; zero caminho de escrita para o candidato';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) O ÍNDICE DO COOLDOWN — `(candidato_id, solicitado_em DESC)`.
--
--     A leitura do cooldown roda em todo carregamento do painel do candidato E em
--     toda invocação da EF. A ordem das colunas e o DESC são o que a torna barata.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_indexdef(i.indexrelid) INTO v_def
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'idx_solicitacoes_dados_cooldown';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P44 FAIL (d): idx_solicitacoes_dados_cooldown NAO existe — a leitura do cooldown roda no painel do candidato e em toda invocacao da EF';
  END IF;
  IF v_def NOT LIKE '%candidato_id%' OR v_def NOT LIKE '%solicitado_em DESC%' THEN
    RAISE EXCEPTION 'P44 FAIL (d): o indice existe mas nao e (candidato_id, solicitado_em DESC): %', v_def;
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): idx_solicitacoes_dados_cooldown e (candidato_id, solicitado_em DESC)';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) AS DUAS RPCs SÃO `SECURITY DEFINER` COM `search_path` BLINDADO.
--
--     DEFINER sem search_path fixo é sequestrável por objeto homônimo num schema que
--     o chamador controle. As duas funções bypassam RLS por construção, então o
--     search_path vazio é parte do controle, não estilo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  r          record;
  v_checadas int := 0;
BEGIN
  FOR r IN
    SELECT p.proname, p.prosecdef, p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('listar_pedidos_dados', 'contar_pedidos_dados_pendentes')
  LOOP
    v_checadas := v_checadas + 1;

    IF NOT r.prosecdef THEN
      RAISE EXCEPTION 'P44 FAIL (e): public.% NAO e SECURITY DEFINER — sem DEFINER a funcao nao resolve o nome do candidato atras da RLS, e a fila renderizaria tudo como Nao identificado', r.proname;
    END IF;
    IF r.proconfig IS NULL
       OR NOT EXISTS (SELECT 1 FROM unnest(r.proconfig) cfg WHERE cfg LIKE 'search_path=%') THEN
      RAISE EXCEPTION 'P44 FAIL (e): public.% nao fixa search_path (proconfig = %) — um DEFINER com search_path herdado do chamador e sequestravel por objeto homonimo', r.proname, coalesce(r.proconfig::text, '<nulo>');
    END IF;
  END LOOP;

  IF v_checadas <> 2 THEN
    RAISE EXCEPTION 'P44 FAIL (e): encontrei % das 2 funcoes esperadas em public — a migration nao criou ambas', v_checadas;
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (e): as 2 RPCs sao SECURITY DEFINER com search_path fixado';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) ⊖ NEGATIVA — `anon` NÃO tem EXECUTE em nenhuma das duas.
--
--     Perguntado ao CATÁLOGO, nunca lendo o texto do `REVOKE`: ler o arquivo provaria
--     que a linha existe, não que o privilégio sumiu. O `pg_default_acl` do schema
--     `public` concede EXECUTE a `anon` em todo `CREATE FUNCTION` como grant DIRETO E
--     NOMEADO, e o idioma difundido no repositório (`REVOKE … FROM PUBLIC`) remove um
--     grant de `PUBLIC` que nunca existiu, deixando `anon=X` de pé. Defeito sistêmico
--     medido na 42-06: 61 funções DEFINER com EXECUTE para anon, 39 via PostgREST.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_assinaturas text[] := ARRAY[
    'public.listar_pedidos_dados(boolean)',
    'public.contar_pedidos_dados_pendentes()'
  ];
  v_sig text;
BEGIN
  FOREACH v_sig IN ARRAY v_assinaturas LOOP
    IF has_function_privilege('anon', v_sig, 'EXECUTE') THEN
      RAISE EXCEPTION 'P44 FAIL (f): o papel anon TEM EXECUTE em % — o REVOKE precisa NOMEAR anon, nao apenas PUBLIC. Como estas funcoes sao SECURITY DEFINER e bypassam RLS, um anonimo leria a fila inteira de quem pediu copia dos proprios dados', v_sig;
    END IF;
    IF NOT has_function_privilege('authenticated', v_sig, 'EXECUTE') THEN
      RAISE EXCEPTION 'P44 FAIL (f): authenticated NAO tem EXECUTE em % — a tela do RH nao conseguiria chamar a funcao', v_sig;
    END IF;
  END LOOP;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (f): anon sem EXECUTE nas 2 RPCs; authenticated com EXECUTE';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (g) O SEED DE `config_sla_dados` — 1 linha, com dias_atencao < dias_atraso < 15.
--
--     O `< 15` aqui é asserção sobre o SEED, e é deliberadamente ASSIMÉTRICO em
--     relação ao banco: **não existe CHECK impondo esse teto**, porque a ANPD pode
--     dispor prazo diferenciado por setor (Art. 19 §4o) e a tabela existe para ser
--     alterável sem deploy. O smoke afirma que o valor SEMEADO é prudente; ele não
--     afirma que o banco proíbe o contrário.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_total    int;
  v_atencao  int;
  v_atraso   int;
BEGIN
  SELECT count(*) INTO v_total FROM public.config_sla_dados;
  IF v_total <> 1 THEN
    RAISE EXCEPTION 'P44 FAIL (g): config_sla_dados tem % linhas, esperado exatamente 1 (o seed acesso_dados)', v_total;
  END IF;

  SELECT c.dias_atencao, c.dias_atraso INTO v_atencao, v_atraso
    FROM public.config_sla_dados c WHERE c.chave = 'acesso_dados';

  IF v_atencao IS NULL THEN
    RAISE EXCEPTION 'P44 FAIL (g): nao existe linha com chave = acesso_dados — o classificador do badge cairia na faixa degenerada em toda a fila';
  END IF;
  IF NOT (v_atencao < v_atraso) THEN
    RAISE EXCEPTION 'P44 FAIL (g): dias_atencao (%) nao e menor que dias_atraso (%) — o ck_config_sla_dados_ordem deveria ter impedido', v_atencao, v_atraso;
  END IF;
  IF v_atraso >= 15 THEN
    RAISE EXCEPTION 'P44 FAIL (g): dias_atraso semeado = %, que NAO fica abaixo do teto de 15 dias corridos do Art. 19, II — um alerta que dispara no dia do vencimento e constatacao, nao alerta', v_atraso;
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (g): seed acesso_dados com % / % — ambos abaixo do teto legal de 15', v_atencao, v_atraso;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (h) OS CHECKS DE `tipo` E `situacao` FECHAM O VOCABULÁRIO.
--
--     Lido de `pg_get_constraintdef` — o que o banco IMPÕE — e não de uma string
--     transcrita neste arquivo, que provaria apenas que sabemos digitar.
--     `tipo` precisa aceitar `exclusao` desde já: é a economia que poupa a Phase 45
--     de uma migration de retrofit sobre linhas vivas.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_tipo     text;
  v_situacao text;
  v_causa    text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_tipo
    FROM pg_constraint WHERE conname = 'ck_solicitacoes_dados_tipo'
      AND conrelid = 'public.solicitacoes_dados'::regclass;
  SELECT pg_get_constraintdef(oid) INTO v_situacao
    FROM pg_constraint WHERE conname = 'ck_solicitacoes_dados_situacao'
      AND conrelid = 'public.solicitacoes_dados'::regclass;
  SELECT pg_get_constraintdef(oid) INTO v_causa
    FROM pg_constraint WHERE conname = 'ck_solicitacoes_dados_causa'
      AND conrelid = 'public.solicitacoes_dados'::regclass;

  IF v_tipo IS NULL OR v_situacao IS NULL OR v_causa IS NULL THEN
    RAISE EXCEPTION 'P44 FAIL (h): faltam CHECKs nomeados em solicitacoes_dados (tipo=%, situacao=%, causa=%)',
      coalesce(v_tipo, '<ausente>'), coalesce(v_situacao, '<ausente>'), coalesce(v_causa, '<ausente>');
  END IF;

  IF v_tipo NOT LIKE '%acesso%' OR v_tipo NOT LIKE '%exclusao%' THEN
    RAISE EXCEPTION 'P44 FAIL (h): o CHECK de tipo nao fecha em acesso/exclusao (%) — sem exclusao aceito desde ja, a Phase 45 precisa de migration de retrofit sobre linhas VIVAS, que e exatamente o risco que esta coluna nasceu para evitar', v_tipo;
  END IF;
  IF v_situacao NOT LIKE '%atendido%' OR v_situacao NOT LIKE '%pendente%' THEN
    RAISE EXCEPTION 'P44 FAIL (h): o CHECK de situacao nao fecha em atendido/pendente (%)', v_situacao;
  END IF;
  IF v_causa NOT LIKE '%falha_geracao%'
     OR v_causa NOT LIKE '%curriculo_ausente%'
     OR v_causa NOT LIKE '%permissao%' THEN
    RAISE EXCEPTION 'P44 FAIL (h): o CHECK de causa nao carrega o vocabulario da 44-UI-SPEC (%) — divergencia entre banco e cliente produz celula EM BRANCO na fila, que le como dado ausente em vez de vocabulario dessincronizado', v_causa;
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (h): os CHECKs de tipo, situacao e causa fecham o vocabulario previsto';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (i) ⊖ NEGATIVA — CHAMADOR SEM CLAIM NENHUMA É RECUSADO COM 42501 NAS DUAS.
--
--     ESTA É A ASSERÇÃO QUE FECHA O DEFEITO SISTÊMICO. O idioma difundido —
--     `IF v_role NOT IN ('rh','administrador')` — avalia NULL quando não há JWT, e um
--     `IF` NULL **não é tomado**: o guard FALHA ABERTO exatamente para o chamador
--     mais suspeito. Em `SECURITY DEFINER` isso é grave porque o DEFINER bypassa RLS
--     e o guard do corpo é o ÚNICO controle. Trocar `IS DISTINCT FROM` por `NOT IN`
--     reintroduz precisamente este defeito, e SÓ esta asserção o pega.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_ok int := 0;
BEGIN
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('request.jwt.claim.sub', '', false);

  BEGIN
    PERFORM * FROM public.listar_pedidos_dados();
    RAISE EXCEPTION 'P44 FAIL (i): listar_pedidos_dados ACEITOU chamada SEM CLAIM NENHUMA — o guard e NULL-cego e falha ABERTO, e um DEFINER sem guard devolve a fila inteira de quem pediu copia dos proprios dados'
      USING ERRCODE = 'P4401';
  EXCEPTION
    WHEN sqlstate 'P4401' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  BEGIN
    PERFORM public.contar_pedidos_dados_pendentes();
    RAISE EXCEPTION 'P44 FAIL (i): contar_pedidos_dados_pendentes ACEITOU chamada SEM CLAIM NENHUMA — o guard e NULL-cego e falha ABERTO'
      USING ERRCODE = 'P4402';
  EXCEPTION
    WHEN sqlstate 'P4402' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  IF v_ok <> 2 THEN
    RAISE EXCEPTION 'P44 FAIL (i): apenas % de 2 funcoes recusaram o chamador sem claim com 42501', v_ok;
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (i): as 2 RPCs recusaram o chamador SEM CLAIM com 42501 (guard NULL-safe)';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (j) ⊖ NEGATIVA — PAPEL `candidato` É RECUSADO COM 42501 NAS DUAS.
--
--     `candidato` é papel REAL deste sistema, e é o papel de quem aparece NA fila.
--     Se ele conseguisse chamar, o titular leria os pedidos dos outros titulares.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_auth uuid := current_setting('smoke44.admin_auth')::uuid;
  v_ok         int  := 0;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin_auth::text,
                      'app_metadata', json_build_object('role', 'candidato'))::text, false);

  BEGIN
    PERFORM * FROM public.listar_pedidos_dados();
    RAISE EXCEPTION 'P44 FAIL (j): listar_pedidos_dados ACEITOU chamada com papel candidato — o titular leria os pedidos dos OUTROS titulares'
      USING ERRCODE = 'P4403';
  EXCEPTION
    WHEN sqlstate 'P4403' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  BEGIN
    PERFORM public.contar_pedidos_dados_pendentes();
    RAISE EXCEPTION 'P44 FAIL (j): contar_pedidos_dados_pendentes ACEITOU chamada com papel candidato'
      USING ERRCODE = 'P4404';
  EXCEPTION
    WHEN sqlstate 'P4404' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_ok <> 2 THEN
    RAISE EXCEPTION 'P44 FAIL (j): apenas % de 2 funcoes recusaram o papel candidato com 42501', v_ok;
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (j): as 2 RPCs recusaram o papel candidato com 42501';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (k) ESCOPO DO BD-8 — POSITIVO E NEGATIVO, POR IMPERSONAÇÃO REAL (Phase 50 / D-03).
--
--     Dois pedidos de fixture: um do candidato COM candidatura, outro do candidato
--     ÓRFÃO.
--
--       · o rh ATIVO recebe EXATAMENTE a fila do administrador — mesma lista, mesma
--         ordem (md5 de cada linha inteira, na ordem de saída) — e vê os DOIS pedidos
--       · o rh sem linha ativa em `usuarios_rh` (sub SORTEADO) não vê NENHUM dos dois
--       · o TOKEN VELHO (claim `rh` + recrutador INATIVO, lido em execução) não vê
--         NENHUM dos dois
--
--     Até a Phase 49 esta asserção provava o escopo POR VAGA: o dono via o pedido do
--     seu candidato e não via o órfão. A D-03 (operador) trocou a regra: as filas do
--     recrutador ativo são as do administrador, órfãos inclusive. O que continua
--     recusado é quem não é rh ATIVO — o helper vivo `public.is_active_rh_user()`.
--
--     ⚠ Esta asserção também é o CAMINHO FELIZ de `listar_pedidos_dados`. A lição da
--     P43 (k): uma função cujo único teste é a recusa está, para efeito de corpo, sem
--     teste nenhum — o guard levanta na primeira linha e o `RETURN QUERY` nunca roda.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_auth uuid := current_setting('smoke44.admin_auth')::uuid;
  v_rec_auth   uuid := current_setting('smoke44.rec_auth')::uuid;
  v_velho_auth uuid := current_setting('smoke44.velho_auth')::uuid;
  v_cand_com   uuid := current_setting('smoke44.cand_com')::uuid;
  v_cand_orfao uuid := current_setting('smoke44.cand_orfao')::uuid;
  v_id_com     uuid;
  v_id_orfao   uuid;
  v_md5_admin  text;
  v_md5_rec    text;
  v_n_admin    int     := -1;
  v_n_rec      int     := -2;
  v_ve_com     boolean := NULL;
  v_ve_orfao   boolean := NULL;
  v_nada       int     := -1;
  v_velho      int     := -1;
BEGIN
  BEGIN
    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao, causa)
    VALUES (v_cand_com, 'acesso', 'pendente', 'falha_geracao')
    RETURNING id INTO v_id_com;

    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao, causa)
    VALUES (v_cand_orfao, 'acesso', 'pendente', 'falha_geracao')
    RETURNING id INTO v_id_orfao;

    -- Referência: o ADMINISTRADOR, na mesma execução.
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    SELECT count(*), md5(coalesce(string_agg(to_jsonb(t)::text, '|' ORDER BY t.ord), ''))
      INTO v_n_admin, v_md5_admin
      FROM public.listar_pedidos_dados(true)
             WITH ORDINALITY AS t(id, candidato_id, candidato_nome, situacao, causa,
                                  solicitado_em, atendido_em, ord);

    -- Papel do rh ATIVO (linha viva de usuarios_rh, não autor de nada por exigência).
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_rec_auth::text,
                        'app_metadata', json_build_object('role', 'rh'))::text, false);
    SELECT count(*), md5(coalesce(string_agg(to_jsonb(t)::text, '|' ORDER BY t.ord), ''))
      INTO v_n_rec, v_md5_rec
      FROM public.listar_pedidos_dados(true)
             WITH ORDINALITY AS t(id, candidato_id, candidato_nome, situacao, causa,
                                  solicitado_em, atendido_em, ord);
    SELECT EXISTS (SELECT 1 FROM public.listar_pedidos_dados(true) p WHERE p.id = v_id_com),
           EXISTS (SELECT 1 FROM public.listar_pedidos_dados(true) p WHERE p.id = v_id_orfao)
      INTO v_ve_com, v_ve_orfao;

    -- Papel de um rh SEM LINHA ATIVA em usuarios_rh (uuid sorteado).
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', gen_random_uuid()::text,
                        'app_metadata', json_build_object('role', 'rh'))::text, false);
    SELECT count(*) INTO v_nada
      FROM public.listar_pedidos_dados(true) p
     WHERE p.id IN (v_id_com, v_id_orfao);

    -- Papel do TOKEN VELHO (claim rh + recrutador INATIVO).
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_velho_auth::text,
                        'app_metadata', json_build_object('role', 'rh'))::text, false);
    SELECT count(*) INTO v_velho
      FROM public.listar_pedidos_dados(true) p
     WHERE p.id IN (v_id_com, v_id_orfao);

    RAISE EXCEPTION 'rollback_smoke44' USING ERRCODE = 'P4405';
  EXCEPTION
    WHEN sqlstate 'P4405' THEN
      NULL;  -- reversão esperada; as variáveis abaixo sobreviveram
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_n_admin < 2 THEN
    RAISE EXCEPTION 'P44 FAIL (k): o administrador viu % linha(s) com os 2 pedidos semeados — a referencia do par nao tem populacao', v_n_admin;
  END IF;
  IF v_ve_com IS DISTINCT FROM true OR v_ve_orfao IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P44 FAIL (k): o rh ATIVO nao ve os pedidos semeados (com candidatura = %, orfao = %) — a D-03 nao vale e a fila do recrutador estaria vazia para quem tem trabalho a fazer', v_ve_com, v_ve_orfao;
  END IF;
  IF v_n_rec IS DISTINCT FROM v_n_admin OR v_md5_rec IS DISTINCT FROM v_md5_admin THEN
    RAISE EXCEPTION 'P44 FAIL (k): a fila do rh ATIVO (% linhas) NAO e a do administrador (% linhas) — a D-03 exige EXATAMENTE a mesma lista, na mesma ordem', v_n_rec, v_n_admin;
  END IF;
  IF v_nada <> 0 THEN
    RAISE EXCEPTION 'P44 FAIL (k): um rh SEM LINHA ATIVA em usuarios_rh viu % pedido(s) de fixture — o predicado de escopo nao esta exigindo o helper vivo (D-02)', v_nada;
  END IF;
  IF v_velho <> 0 THEN
    RAISE EXCEPTION 'P44 FAIL (k): o TOKEN VELHO (recrutador INATIVO) viu % pedido(s) de fixture — o helper vivo (D-02) nao esta no predicado da fila', v_velho;
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (k): escopo do BD-8 (D-03) — rh ativo recebe a fila do admin (% linhas, md5 igual), sem linha e token velho nao veem nada (fixture revertida)', v_n_rec;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (l) O ÓRFÃO — VISÍVEL ao rh ATIVO e ao administrador (Phase 50 / D-03).
--
--     Um pedido de candidato SEM candidatura nenhuma não tem dono por vaga. Ele é,
--     precisamente, o pedido que queima o relógio do Art. 19, II sem que ninguém
--     seja responsável por ele. Até a Phase 49 só o administrador o via (o BD-8 dava
--     o admin como dono) e esta asserção exigia que ele fosse INVISÍVEL ao
--     recrutador. A D-03 (operador, 2026-10-04/05) INVERTEU essa metade: as filas do
--     recrutador ativo são exatamente as do administrador, órfãos inclusive — o
--     pedido sem vaga passa a ter quem o atenda no dia a dia, e o admin continua a
--     vê-lo. Se o admin também não o visse, o pedido existiria sem nenhuma tela
--     capaz de mostrá-lo, e o prazo correria no escuro.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_auth uuid := current_setting('smoke44.admin_auth')::uuid;
  v_rec_auth   uuid := current_setting('smoke44.rec_auth')::uuid;
  v_cand_orfao uuid := current_setting('smoke44.cand_orfao')::uuid;
  v_id_orfao   uuid;
  v_ve_rec     boolean := NULL;
  v_ve_admin   boolean := NULL;
BEGIN
  BEGIN
    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao)
    VALUES (v_cand_orfao, 'acesso', 'pendente')
    RETURNING id INTO v_id_orfao;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_rec_auth::text,
                        'app_metadata', json_build_object('role', 'rh'))::text, false);
    SELECT EXISTS (SELECT 1 FROM public.listar_pedidos_dados(true) p WHERE p.id = v_id_orfao)
      INTO v_ve_rec;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    SELECT EXISTS (SELECT 1 FROM public.listar_pedidos_dados(true) p WHERE p.id = v_id_orfao)
      INTO v_ve_admin;

    RAISE EXCEPTION 'rollback_smoke44' USING ERRCODE = 'P4406';
  EXCEPTION
    WHEN sqlstate 'P4406' THEN
      NULL;
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_ve_rec IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P44 FAIL (l): o rh ATIVO NAO ve o pedido de um candidato orfao — a D-03 exige as filas do administrador, orfaos inclusive; o pedido que queima o prazo do Art. 19, II ficaria fora da tela de quem trabalha a fila';
  END IF;
  IF v_ve_admin IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P44 FAIL (l): o ADMINISTRADOR NAO ve o pedido orfao — este e o pedido que consome prazo legal sem dono natural, e o BD-8 da o admin como dono. Sem esta visao o pedido existe e nenhuma tela o mostra, com o relogio do Art. 19, II correndo no escuro';
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (l): pedido orfao VISIVEL ao rh ativo e ao administrador (D-03, fixture revertida)';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (m) FILA ≡ CONTADOR (BD-8), EM DOIS PAPÉIS.
--
--     O invariante que a engenharia impõe sobre a decisão do operador: um badge que
--     conta o que a tela não mostra manda o operador procurar trabalho invisível — e
--     aqui esse trabalho tem prazo de 15 dias corridos. O comentário vivo de
--     `20260730000001:421-429` já nomeia esta classe de defeito para a fila do
--     Art. 20; esta asserção impede que ela renasça aqui.
--
--     A igualdade é asserida como IGUALDADE, não contra um número absoluto: assim ela
--     continua válida qualquer que seja o conteúdo real da tabela.
--
--     ⚠ Esta é também a única asserção que executa o CORPO de
--     `contar_pedidos_dados_pendentes` — sem ela, aquela função teria apenas as duas
--     provas de recusa, (i) e (j), e o corpo nunca rodaria.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_auth  uuid := current_setting('smoke44.admin_auth')::uuid;
  v_rec_auth    uuid := current_setting('smoke44.rec_auth')::uuid;
  v_cand_com    uuid := current_setting('smoke44.cand_com')::uuid;
  v_cand_orfao  uuid := current_setting('smoke44.cand_orfao')::uuid;
  v_fila_admin  int := -1;
  v_cont_admin  int := -2;
  v_fila_rec    int := -1;
  v_cont_rec    int := -2;
  v_velho_auth  uuid := current_setting('smoke44.velho_auth')::uuid;
  v_fila_velho  int := -1;
  v_cont_velho  int := -2;
BEGIN
  BEGIN
    -- Mistura deliberada: pendentes e atendidos, com e sem candidatura, para que a
    -- igualdade seja exercitada sobre um conjunto que os dois predicados PRECISAM
    -- recortar da mesma forma.
    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao, causa, atendido_em)
    VALUES (v_cand_com,   'acesso', 'pendente', 'permissao', NULL),
           (v_cand_com,   'acesso', 'atendido', NULL,        now()),
           (v_cand_orfao, 'acesso', 'pendente', 'falha_geracao', NULL);

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    SELECT count(*) INTO v_fila_admin
      FROM public.listar_pedidos_dados(true) p WHERE p.situacao = 'pendente';
    v_cont_admin := public.contar_pedidos_dados_pendentes();

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_rec_auth::text,
                        'app_metadata', json_build_object('role', 'rh'))::text, false);
    SELECT count(*) INTO v_fila_rec
      FROM public.listar_pedidos_dados(true) p WHERE p.situacao = 'pendente';
    v_cont_rec := public.contar_pedidos_dados_pendentes();

    -- Phase 50: o TOKEN VELHO é o escopo DISTINTO que torna a igualdade não-trivial.
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_velho_auth::text,
                        'app_metadata', json_build_object('role', 'rh'))::text, false);
    SELECT count(*) INTO v_fila_velho
      FROM public.listar_pedidos_dados(true) p WHERE p.situacao = 'pendente';
    v_cont_velho := public.contar_pedidos_dados_pendentes();

    RAISE EXCEPTION 'rollback_smoke44' USING ERRCODE = 'P4407';
  EXCEPTION
    WHEN sqlstate 'P4407' THEN
      NULL;
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_fila_admin <> v_cont_admin THEN
    RAISE EXCEPTION 'P44 FAIL (m/administrador): a fila mostra % pendentes e o contador diz % — o badge conta o que a tela nao mostra, e o operador vai caçar trabalho invisivel num relogio de 15 dias', v_fila_admin, v_cont_admin;
  END IF;
  IF v_fila_rec <> v_cont_rec THEN
    RAISE EXCEPTION 'P44 FAIL (m/rh): a fila mostra % pendentes e o contador diz % — os dois predicados de escopo do BD-8 DIVERGIRAM', v_fila_rec, v_cont_rec;
  END IF;
  IF v_fila_velho <> v_cont_velho THEN
    RAISE EXCEPTION 'P44 FAIL (m/token velho): a fila mostra % pendentes e o contador diz % — os dois predicados DIVERGIRAM para quem foi desativado', v_fila_velho, v_cont_velho;
  END IF;
  -- Sanidade do próprio cenário (Phase 50 / D-03). Até a Phase 49 a diferença de escopo
  -- exercitada era admin > rh (o órfão só do admin); a D-03 a eliminou — o rh ATIVO tem
  -- a fila do admin. A igualdade fila≡contador só não é trivial se (1) a fila do admin
  -- carrega os 2 pendentes semeados, (2) a do rh ativo é a MESMA, e (3) existe um
  -- escopo comprovadamente DISTINTO no mesmo cenário: o token velho, com 0 = 0.
  IF v_fila_admin < 2 THEN
    RAISE EXCEPTION 'P44 FAIL (m): o administrador viu % pendentes com 2 semeados — o cenario nao tem populacao e a igualdade fila≡contador passaria trivialmente', v_fila_admin;
  END IF;
  IF v_fila_rec IS DISTINCT FROM v_fila_admin THEN
    RAISE EXCEPTION 'P44 FAIL (m): o rh ATIVO viu % pendentes e o administrador % — a D-03 exige a mesma fila', v_fila_rec, v_fila_admin;
  END IF;
  IF v_fila_velho <> 0 OR v_cont_velho <> 0 THEN
    RAISE EXCEPTION 'P44 FAIL (m): o TOKEN VELHO viu % pendentes (contador %) — o cenario nao exercitou um escopo distinto e o helper vivo (D-02) nao filtra', v_fila_velho, v_cont_velho;
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (m): fila ≡ contador em 2 papeis (admin %=%, rh ativo %=%) + token velho %=% — escopo distinto comprovado pelo token velho (D-03)', v_fila_admin, v_cont_admin, v_fila_rec, v_cont_rec, v_fila_velho, v_cont_velho;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (n) ORDENAÇÃO COMPOSTA — pendente-antigo, pendente-novo, atendido-novo,
--     atendido-antigo.
--
--     É ESTA asserção que torna verdadeira a copy do aviso de corte: "Mostrando 200
--     pedidos. **Todos os não atendidos aparecem**; os atendidos mais antigos podem
--     ter ficado de fora." A afirmação só é honesta porque o `ORDER BY` põe os não
--     atendidos primeiro. Mudar a ordenação sem mudar a copy faz a fila MENTIR POR
--     OMISSÃO — e o cap de 200 é o que torna a mentira consequente.
--
--     A posição é lida com `WITH ORDINALITY`, que é a única forma garantida de
--     capturar a ordem de saída de uma função de conjunto; `row_number() OVER ()`
--     dependeria de um detalhe de execução não contratado.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_auth uuid := current_setting('smoke44.admin_auth')::uuid;
  v_cand_com   uuid := current_setting('smoke44.cand_com')::uuid;
  v_p_antigo   uuid;
  v_p_novo     uuid;
  v_a_antigo   uuid;
  v_a_novo     uuid;
  v_ord        uuid[];
BEGIN
  BEGIN
    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao, causa, solicitado_em, atendido_em)
    VALUES (v_cand_com, 'acesso', 'pendente', 'permissao', now() - interval '10 days', NULL)
    RETURNING id INTO v_p_antigo;

    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao, causa, solicitado_em, atendido_em)
    VALUES (v_cand_com, 'acesso', 'pendente', 'permissao', now() - interval '2 days', NULL)
    RETURNING id INTO v_p_novo;

    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao, causa, solicitado_em, atendido_em)
    VALUES (v_cand_com, 'acesso', 'atendido', NULL, now() - interval '20 days', now() - interval '20 days')
    RETURNING id INTO v_a_antigo;

    INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao, causa, solicitado_em, atendido_em)
    VALUES (v_cand_com, 'acesso', 'atendido', NULL, now() - interval '1 day', now() - interval '1 day')
    RETURNING id INTO v_a_novo;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);

    SELECT array_agg(t.id ORDER BY t.ord)
      INTO v_ord
      FROM public.listar_pedidos_dados(true)
             WITH ORDINALITY AS t(id, candidato_id, candidato_nome, situacao, causa,
                                  solicitado_em, atendido_em, ord)
     WHERE t.id IN (v_p_antigo, v_p_novo, v_a_antigo, v_a_novo);

    RAISE EXCEPTION 'rollback_smoke44' USING ERRCODE = 'P4408';
  EXCEPTION
    WHEN sqlstate 'P4408' THEN
      NULL;
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_ord IS NULL OR array_length(v_ord, 1) <> 4 THEN
    RAISE EXCEPTION 'P44 FAIL (n): a fila devolveu % das 4 linhas de fixture — sem as quatro nao ha o que ordenar', coalesce(array_length(v_ord, 1), 0);
  END IF;
  IF v_ord[1] <> v_p_antigo OR v_ord[2] <> v_p_novo THEN
    RAISE EXCEPTION 'P44 FAIL (n): os NAO ATENDIDOS nao vieram primeiro, do mais antigo ao mais recente — a copy do aviso de corte ("todos os nao atendidos aparecem") passa a mentir por omissao assim que houver mais de 200 pedidos';
  END IF;
  IF v_ord[3] <> v_a_novo OR v_ord[4] <> v_a_antigo THEN
    RAISE EXCEPTION 'P44 FAIL (n): os ATENDIDOS nao vieram depois, do mais recente ao mais antigo — a segunda metade da ordenacao composta esta errada';
  END IF;

  PERFORM set_config('smoke44.pass', (coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (n): ordenacao composta correta — pendente-antigo, pendente-novo, atendido-novo, atendido-antigo (fixture revertida)';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — ⊖ NEGATIVA GLOBAL DE RESÍDUO + gate de contagem com esperado FIXO.
--
--     A metade de resíduo é obrigatória: um smoke que cria dados e não PROVA que os
--     removeu é um smoke que polui PROD. "Deveria ter revertido" e "reverteu" são
--     afirmações diferentes, e só a segunda é medível.
--
--     A metade de contagem existe porque delegar a leitura dos NOTICEs a quem roda
--     produz run parcial que termina em silêncio (lição da 37-03).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_solic_antes  bigint := current_setting('smoke44.solic')::bigint;
  v_candos_antes bigint := current_setting('smoke44.candos')::bigint;
  v_cands_antes  bigint := current_setting('smoke44.cands')::bigint;
  v_vagas_antes  bigint := current_setting('smoke44.vagas')::bigint;
  v_solic_agora  bigint;
  v_candos_agora bigint;
  v_cands_agora  bigint;
  v_vagas_agora  bigint;
  v_n            int;
  v_esperado     int := 14;
BEGIN
  SELECT count(*) INTO v_solic_agora  FROM public.solicitacoes_dados;
  SELECT count(*) INTO v_candos_agora FROM public.candidatos;
  SELECT count(*) INTO v_cands_agora  FROM public.candidaturas;
  SELECT count(*) INTO v_vagas_agora  FROM public.vagas;

  IF v_solic_agora <> v_solic_antes THEN
    RAISE EXCEPTION 'P44 FAIL (z): solicitacoes_dados saiu de % para % linhas — as subtransacoes de (k), (l), (m) e (n) NAO reverteram, e PROD ficou com pedidos de teste numa tabela que registra exercicio de direito do titular', v_solic_antes, v_solic_agora;
  END IF;
  IF v_candos_agora <> v_candos_antes THEN
    RAISE EXCEPTION 'P44 FAIL (z): public.candidatos saiu de % para % linhas durante o smoke', v_candos_antes, v_candos_agora;
  END IF;
  IF v_cands_agora <> v_cands_antes THEN
    RAISE EXCEPTION 'P44 FAIL (z): public.candidaturas saiu de % para % linhas durante o smoke', v_cands_antes, v_cands_agora;
  END IF;
  IF v_vagas_agora <> v_vagas_antes THEN
    RAISE EXCEPTION 'P44 FAIL (z): public.vagas saiu de % para % linhas durante o smoke', v_vagas_antes, v_vagas_agora;
  END IF;

  v_n := coalesce(nullif(current_setting('smoke44.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P44 FAIL (z): RESUMO % PASS de % esperadas — run parcial; NAO tratar como verde', v_n, v_esperado;
  END IF;

  RAISE NOTICE 'RESUMO: % asseracoes PASS de % esperadas; zero residuo (% pedidos / % candidatos / % candidaturas / % vagas, todos inalterados) — gate VERDE',
    v_n, v_esperado, v_solic_agora, v_candos_agora, v_cands_agora, v_vagas_agora;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
