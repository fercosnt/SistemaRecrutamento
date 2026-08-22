-- =============================================================================
-- p46_fixture_elegivel.sql
-- Phase 46 (Purga Automatica) / plano 46-01 / Task 2 — PURGA-03 · PURGA-07
-- =============================================================================
--
-- ⚠⚠ ESTE ARQUIVO ESCREVE EM PRODUCAO, INCLUSIVE EM `auth.users`.
--   A escrita e ADITIVA e SINTETICA: nenhuma linha de pessoa real e tocada e
--   nenhuma data de pessoa real e alterada. Retrodatar a candidatura de uma
--   pessoa real para tornar o conjunto elegivel nao-vazio e a forma RECUSADA
--   (46-VALIDATION §fixture): tornaria alguem real purgavel, e o erro seria
--   irreversivel — PITR desligado por D-45-10 e Storage fora do backup.
--
-- ⚠ O TEARDOWN DESTE ARQUIVO JA EXISTE: `supabase/tests/p46_teardown_fixture.sql`,
--   commitado ANTES deste (D-46-21). Se qualquer coisa der errado depois do
--   commit desta transacao, o caminho de saida e ele.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE EXECUCAO
-- -----------------------------------------------------------------------------
--   Rodado pelo ORQUESTRADOR por MCP `execute_sql`, EM UMA UNICA CHAMADA
--   (subagentes GSD nao recebem os tools MCP do Supabase — bug upstream
--   anthropics/claude-code#13898; `supabase db push` e proibido neste projeto).
--   O arquivo inteiro e UM UNICO `DO` de proposito: ele roda numa transacao
--   implicita, e portanto ou a fixture INTEIRA existe, ou NADA existe. Um
--   estado intermediario — meia dúzia de titulares sinteticos sem candidatura,
--   ou gatilhos desligados e nunca religados — seria pior do que nao ter
--   rodado. Sem wrapper de transacao explicita (CLAUDE.md §Migrations).
--
-- -----------------------------------------------------------------------------
-- (2) POR QUE ESTA FIXTURE EXISTE
-- -----------------------------------------------------------------------------
--   Medido em PROD em 2026-08-22: `public.candidaturas_alem_da_janela()`
--   devolve ZERO. Nao por defeito — por ARITMETICA: a candidatura mais antiga
--   tem ~9,5 meses e a matriz de `config_retencao_etapa` esta em 24. O conjunto
--   elegivel e vazio e continuara vazio ate ~2027.
--
--   Sem esta fixture, 18 das 21 linhas do contrato de validacao da Phase 46
--   passam por VACUIDADE, e o dry-run de 14 dias de PURGA-03 prova exatamente
--   zero. E a licao da Phase 45 repetida verbatim: as 3 tabelas de IA estavam
--   VAZIAS em PROD e as asserções sobre as 5 tabelas `SET NULL` teriam passado
--   sobre nada.
--
--   ⊖ Por isso este arquivo TERMINA se recusando a existir se render menos de
--   3 candidaturas elegiveis. Uma fixture que rende zero e pior que fixture
--   nenhuma: ela produz verde vazio com aparencia de prova.
--
-- -----------------------------------------------------------------------------
-- (3) O MODO DE FALHA QUE ESTE ARQUIVO FOI DESENHADO PARA NAO TER (D-46-21)
-- -----------------------------------------------------------------------------
--   `candidaturas.updated_at` e o degrau (3) do `COALESCE` da data-ancora
--   (`20260801000004:192-200`) e nasce `now()`. `docs/sql/sql/13-tabela-candidaturas.sql:145`
--   declara `update_candidaturas_updated_at BEFORE UPDATE ... NEW.updated_at = NOW()`.
--   Se isso estiver vivo — M1 mede —, um `UPDATE` de retrodate e SOBRESCRITO, a
--   soma nunca fica menor que `now()`, o predicado devolve ZERO e a fixture
--   SE AUTODERROTA em silencio.
--
--   DUAS DEFESAS, e a ordem importa:
--     1ª  `updated_at` ja vai RETRODATADO NO PROPRIO `INSERT`. O gatilho e
--         BEFORE **UPDATE**; ele nao dispara em INSERT, entao esta defesa vale
--         mesmo que a segunda seja impossivel.
--     2ª  o `UPDATE` explicito da secao 6, rodado com o gatilho DESLIGADO e
--         RELIGADO na mesma transacao — nunca removido.
--
-- -----------------------------------------------------------------------------
-- (4) O OUTRO EFEITO COLATERAL, MEDIDO NO REPOSITORIO E CONFIRMADO POR M1
-- -----------------------------------------------------------------------------
--   `public.candidaturas` tem DOIS gatilhos AFTER INSERT que fazem
--   `net.http_post` para FORA do banco:
--     · `trg_candidaturas_analise`   (`20260610000002:68-70`) -> EF de analise de IA
--     · `trg_n8n_nova_candidatura`  (`20260706110005:90-93`)  -> webhook n8n
--   Nove linhas sinteticas produziriam nove analises de IA REAIS: custo,
--   escrita nas tabelas de IA, `score_geral` carimbado de volta e contaminacao
--   do snapshot de vies k=5. Sao as ameacas T-46-01-02 e T-46-01-03 do registro
--   STRIDE deste plano, e nenhuma delas seria visivel numa leitura de
--   `candidaturas`.
--
--   A secao 3 desliga, POR MEDICAO DO CATALOGO (`dispara_http`), exatamente os
--   gatilhos que fazem `net.http_post` nas cinco tabelas da fixture, e a secao 7
--   religa todos. Se o desligamento falhar, a transacao inteira aborta: FALHA
--   FECHADA, nunca despacho silencioso. Nenhum gatilho e removido em momento
--   algum.
--
-- -----------------------------------------------------------------------------
-- (5) AS OITO VARIANTES, E O QUE CADA UMA PROVA
-- -----------------------------------------------------------------------------
--   TRES POSITIVAS, cada uma exercitando um degrau DIFERENTE da data-ancora,
--   para que `ancora_origem` (que nasce no ledger de 46-05) seja observada em
--   mais de um valor e a coluna prove alguma coisa:
--
--     pos1  degrau (1) — linha em `historico_candidatura` com `etapa_para` = a
--           etapa atual, `criado_em` a -30 meses. ⚠ `updated_at` fica a -1 MES
--           DE PROPOSITO: assim pos1 so e elegivel SE o degrau (1) funcionar.
--           Com tudo a -30 meses ela seria elegivel mesmo com o degrau (1)
--           quebrado — verde pelo motivo errado, que e o defeito que esta fase
--           inteira existe para nao repetir.
--     pos2  degrau (2) — sem historico, `data_decisao_final` a -30 meses,
--           `updated_at` a -1 mes. Mesma logica discriminante.
--     pos3  degrau (3) — sem historico, sem decisao, dependendo SO de
--           `updated_at` a -30 meses. ⚠ Esta e a prova direta de D-46-21: se o
--           retrodate de `updated_at` tivesse sido sobrescrito, o degrau (3)
--           resolveria para `now()` — que vem ANTES do degrau (4) no COALESCE —
--           e pos3 nao seria elegivel. pos3 elegivel == retrodate sobreviveu.
--
--   QUATRO NEGATIVAS, cada uma ALEM DA JANELA por MULTIPLOS degraus (historico
--   E `updated_at` E `data_candidatura`, todos a -30 meses). A razao e o
--   contrario da dos positivos: se uma negativa estivesse DENTRO da janela, a
--   asserção passaria porque A DATA protegeu, e nao porque A EXCECAO funcionou
--   — falso verde. Elas tem de estar robustamente fora, para que a unica coisa
--   que as segure seja a excecao que elas testam:
--
--     neg-hold   igual a pos1 + linha em `retencao_hold` com `liberado_em` nulo (D-46-04)
--     neg-vaga   igual a pos1 mas com a vaga em `status = 'ativa'`            (D-46-03)
--     neg-art20  igual a pos1 + `decisao_final` com revisao do Art. 20 aberta (ja viva)
--     neg-etapa  igual a pos1 mas em `entrevista_online`, fora da allowlist   (D-46-19)
--
--   UMA DE CAPACIDADE:
--     cap2  segundo titular elegivel, identico a pos1. Existe para que a prova
--           do cap (D-46-08) seja feita REDUZINDO O CAP PARA 1 por RPC, em vez
--           de criar 51 titulares — o cap e config alteravel sem deploy, e usar
--           isso e ordens de magnitude mais barato.
--
--   MAIS UMA NONA CANDIDATURA, sem titular proprio: uma segunda candidatura do
--   titular `neg-etapa`, DENTRO da janela (-1 mes). Ela existe para D-46-11 —
--   "o alvo e o TITULAR, quando TODAS as suas candidaturas estao alem da
--   janela". Sem ela, `titulares_alem_da_janela()` (plano 46-02) nasceria sem
--   nenhum caso em que o agrupamento por titular MORDE, e a asserção passaria
--   por vacuidade. Ela e presa a `neg-etapa` justamente porque aquele titular
--   ja e nao-elegivel por outro motivo: nenhum positivo e perturbado.
--
-- -----------------------------------------------------------------------------
-- (6) IDENTIFICADORES: LITERAIS E DERIVADOS, NUNCA SORTEADOS
-- -----------------------------------------------------------------------------
--   Todo UUID e literal e fixo neste arquivo — greppavel, previsivel entre
--   execucoes, e reconhecivel a olho como sintetico (`4601...`). O CPF de
--   `public.candidatos` e DERIVADO do UUID por transformacao deterministica
--   (`translate(md5(uuid), 'abcdef', '012345')`), nunca sorteado sobre coluna
--   `UNIQUE`: com sorteio, uma colisao faz tudo falhar sem que a proxima pessoa
--   entenda por que. A razao medida esta em `20260805000006:247-249`.
--
--   ⚠ O CPF e preenchido, e nao deixado nulo, DE PROPOSITO: `20260608000001:75`
--   tornou a coluna nulavel e `20260805000006:1253` assere que `cpf` VAI A NULL
--   na anonimizacao. Uma fixture que ja nascesse com `cpf IS NULL` faria a
--   prova de anonimizacao de `modo='live'` passar POR VACUIDADE.
--
-- -----------------------------------------------------------------------------
-- (7) O QUE ESTE ARQUIVO NAO FAZ
-- -----------------------------------------------------------------------------
--   · Nao escreve em `public.notificacoes_enviadas` e nao dispara notificacao.
--     `NOTIFICACOES_MODO` esta em `producao`; o dominio `@invalido.local` e
--     reservado e nao roteavel, mas a defesa real e nao escrever a linha.
--   · Nao cria conta capaz de autenticar: sem senha utilizavel e com
--     `email_confirmed_at` nulo (T-46-01-05). A conta existe para ser
--     destruida, nao para logar.
--   · Nao liga nenhuma vaga a um usuario de RH (`created_by` fica nulo), entao
--     nenhuma linha da fixture entra na fila vaga-scoped do papel `rh`
--     (`20260706110004:63-69`).
--   · Nao remove gatilho nenhum, nao altera schema, nao instala pacote.
--
-- =============================================================================

DO $p46_fixture$
DECLARE
  v_agora      constant timestamptz := pg_catalog.now();
  v_ns_email   constant text        := 'fixture-p46+%@invalido.local';
  v_meses_fora constant integer     := 30;   -- alem da janela de 24 (e da de 18)
  v_meses_dentro constant integer   := 1;    -- dentro de qualquer janela da matriz

  -- Vagas: dois UUIDs arquivados e um ativo. `neg-vaga` usa o ativo (D-46-03);
  -- a nona candidatura usa o segundo arquivado, porque
  -- `unique_candidato_vaga UNIQUE (candidato_id, vaga_id)` proibe repetir o par
  -- e porque uma candidatura sintetica numa vaga ATIVA apareceria no funil.
  v_vaga_arq1  constant uuid := '4601d000-0000-4000-8000-000000000001';
  v_vaga_arq2  constant uuid := '4601d000-0000-4000-8000-000000000002';
  v_vaga_ativa constant uuid := '4601d000-0000-4000-8000-000000000003';

  -- ⚠ AS OITO VARIANTES. `n` e o sufixo dos UUIDs; `upd_m` e quantos meses
  -- `updated_at` recua (1 nas positivas discriminantes, 30 nas robustas).
  v_variantes constant jsonb := jsonb_build_array(
    jsonb_build_object('slug','pos1',     'email','fixture-p46+pos1@invalido.local',     'n','01','etapa','aprovado',          'vaga','arq1',  'hist',true, 'dec_col',false,'art20',false,'hold',false,'upd_m',1),
    jsonb_build_object('slug','pos2',     'email','fixture-p46+pos2@invalido.local',     'n','02','etapa','decisao_final',     'vaga','arq1',  'hist',false,'dec_col',true, 'art20',false,'hold',false,'upd_m',1),
    jsonb_build_object('slug','pos3',     'email','fixture-p46+pos3@invalido.local',     'n','03','etapa','rejeitado',         'vaga','arq1',  'hist',false,'dec_col',false,'art20',false,'hold',false,'upd_m',30),
    jsonb_build_object('slug','cap2',     'email','fixture-p46+cap2@invalido.local',     'n','04','etapa','aprovado',          'vaga','arq1',  'hist',true, 'dec_col',false,'art20',false,'hold',false,'upd_m',30),
    jsonb_build_object('slug','neg-hold', 'email','fixture-p46+neg-hold@invalido.local', 'n','05','etapa','aprovado',          'vaga','arq1',  'hist',true, 'dec_col',false,'art20',false,'hold',true, 'upd_m',30),
    jsonb_build_object('slug','neg-vaga', 'email','fixture-p46+neg-vaga@invalido.local', 'n','06','etapa','aprovado',          'vaga','ativa', 'hist',true, 'dec_col',false,'art20',false,'hold',false,'upd_m',30),
    jsonb_build_object('slug','neg-art20','email','fixture-p46+neg-art20@invalido.local','n','07','etapa','aprovado',          'vaga','arq1',  'hist',true, 'dec_col',false,'art20',true, 'hold',false,'upd_m',30),
    jsonb_build_object('slug','neg-etapa','email','fixture-p46+neg-etapa@invalido.local','n','08','etapa','entrevista_online', 'vaga','arq1',  'hist',true, 'dec_col',false,'art20',false,'hold',false,'upd_m',30)
  );

  v            jsonb;
  r            record;
  v_user_id    uuid;
  v_cand_id    uuid;
  v_cdt_id     uuid;
  v_hist_id    uuid;
  v_dec_id     uuid;
  v_vaga_id    uuid;
  v_email      text;
  v_slug       text;
  v_n          text;
  v_digitos    text;
  v_cpf        text;
  v_celular    text;
  v_nascido    date;
  v_criado     timestamptz;
  v_upd_at     timestamptz;

  v_desejado   jsonb;
  v_lista_cols text;
  v_lista_vals text;
  v_faltantes  text;

  v_desligados jsonb := '[]'::jsonb;
  v_http_vivos bigint;

  v_fk_def     text;
  v_por_usuario uuid;

  v_upd_map    jsonb := '{}'::jsonb;
  v_n_upd      bigint := 0;

  v_ja         bigint;
  v_n_users    bigint;
  v_n_titulares bigint;
  v_n_cdt      bigint;
  v_n_vagas    bigint;
  v_n_orfas    bigint;
  v_elegiveis  bigint;
  v_quem       jsonb;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1 · GUARDA DE REENTRADA — a fixture nao se aplica duas vezes
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Sem esta guarda, a segunda aplicacao morreria numa violacao de chave
  -- primaria a meio caminho, e a mensagem falaria de um UUID em vez de falar do
  -- problema. Aqui ela fala do problema e nomeia a saida.
  SELECT count(*) INTO v_ja FROM auth.users u WHERE u.email LIKE v_ns_email;
  IF v_ja <> 0 THEN
    RAISE EXCEPTION 'P46FX: a fixture JA ESTA VIVA em PROD — % conta(s) no namespace fixture-p46+. Aplica-la de novo nao e idempotente: os UUIDs sao literais e fixos de proposito. Saida: rodar supabase/tests/p46_teardown_fixture.sql primeiro e so entao reaplicar. Se a intencao era MEDIR e nao criar, a consulta e SELECT count(*) FROM public.candidaturas_alem_da_janela().', v_ja;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2 · O ATOR DA DECISAO DO ART. 20 — resolvido do catalogo, nao adivinhado
  -- ═══════════════════════════════════════════════════════════════════════════
  -- `decisao_final.por_usuario` e NOT NULL. O valor legitimo depende de haver
  -- ou nao FK, e para onde ela aponta — que M2c mede. Aqui a mesma pergunta e
  -- feita ao catalogo em tempo de execucao, para que a fixture nao dependa de
  -- a medicao ter sido transcrita corretamente.
  SELECT pg_get_constraintdef(con.oid) INTO v_fk_def
    FROM pg_constraint con
    JOIN pg_class     rel ON rel.oid = con.conrelid
    JOIN pg_namespace n   ON n.oid   = rel.relnamespace
   WHERE n.nspname = 'public'
     AND rel.relname = 'decisao_final'
     AND con.contype = 'f'::"char"
     AND pg_get_constraintdef(con.oid) LIKE '%(por_usuario)%'
   LIMIT 1;

  IF v_fk_def IS NULL THEN
    -- Sem FK: o proprio titular sintetico assina a decisao sintetica. E a opcao
    -- que nao encosta em ninguem real.
    v_por_usuario := ('4601a000-0000-4000-8000-000000000007')::uuid;
  ELSIF v_fk_def LIKE '%usuarios_rh%' THEN
    SELECT ur.id INTO v_por_usuario FROM public.usuarios_rh ur ORDER BY ur.id LIMIT 1;
    IF v_por_usuario IS NULL THEN
      RAISE EXCEPTION 'P46FX: decisao_final.por_usuario referencia public.usuarios_rh (%) mas nao existe nenhuma linha viva ali para assinar a decisao sintetica da variante neg-art20. Sem essa linha a excecao do Art. 20 nao tem como ser exercitada, e a asserção (j.3) do smoke passaria por vacuidade.', v_fk_def;
    END IF;
  ELSIF v_fk_def LIKE '%users%' THEN
    v_por_usuario := ('4601a000-0000-4000-8000-000000000007')::uuid;
  ELSE
    RAISE EXCEPTION 'P46FX: decisao_final.por_usuario tem FK para um alvo que esta fixture nao sabe satisfazer: %. Ler M2c em 46-01-MEDICOES.md e emendar esta secao — adivinhar aqui produziria uma violacao de FK no meio da transacao.', v_fk_def;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3 · DESLIGAR OS GATILHOS DE DESPACHO E O CARIMBO DE `updated_at`
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Selecionados POR MEDICAO DO CATALOGO, nunca por lista fixa de nomes: o
  -- criterio e "o corpo da funcao faz `net.http_post`" ou "dispara em UPDATE e
  -- mexe em `updated_at`". Uma lista de nomes envelheceria em silencio no dia
  -- em que nascesse o proximo gatilho de despacho; um criterio nao envelhece.
  -- `tgenabled <> 'D'` garante que nao religamos, na secao 7, algo que ja
  -- estava desligado antes de nos.
  FOR r IN
    SELECT t.tgrelid::regclass::text AS tabela,
           t.tgname                  AS nome,
           (pg_get_functiondef(p.oid) LIKE '%net.http_post%') AS por_http
      FROM pg_trigger t
      JOIN pg_proc    p ON p.oid = t.tgfoid
     WHERE NOT t.tgisinternal
       AND t.tgenabled <> 'D'
       AND t.tgrelid = ANY (ARRAY[
             'public.candidaturas'::regclass,
             'public.candidatos'::regclass,
             'public.vagas'::regclass,
             'public.decisao_final'::regclass,
             'public.historico_candidatura'::regclass
           ])
       AND (
             pg_get_functiondef(p.oid) LIKE '%net.http_post%'
          OR ((t.tgtype & 16) <> 0 AND pg_get_functiondef(p.oid) LIKE '%updated_at%')
           )
     ORDER BY 1, 2
  LOOP
    EXECUTE format('ALTER TABLE %s DISABLE TRIGGER %I', r.tabela, r.nome);
    v_desligados := v_desligados || jsonb_build_array(
      jsonb_build_object('tabela', r.tabela, 'tgname', r.nome, 'por_http', r.por_http)
    );
  END LOOP;

  RAISE NOTICE 'P46 FIXTURE — gatilhos desligados nesta transacao (religados na secao 7): %', v_desligados;

  -- ⊖ FALHA FECHADA: se sobrou algum gatilho de despacho ATIVO nas tabelas da
  -- fixture, a transacao para AQUI, antes do primeiro INSERT. Um despacho
  -- silencioso e irreversivel do lado de fora do banco — o `net.http_post` ja
  -- saiu, e nenhum ROLLBACK o traz de volta.
  SELECT count(*) INTO v_http_vivos
    FROM pg_trigger t
    JOIN pg_proc    p ON p.oid = t.tgfoid
   WHERE NOT t.tgisinternal
     AND t.tgenabled <> 'D'
     AND t.tgrelid = ANY (ARRAY[
           'public.candidaturas'::regclass,
           'public.candidatos'::regclass,
           'public.vagas'::regclass,
           'public.decisao_final'::regclass,
           'public.historico_candidatura'::regclass
         ])
     AND pg_get_functiondef(p.oid) LIKE '%net.http_post%';

  IF v_http_vivos <> 0 THEN
    RAISE EXCEPTION 'P46FX: ainda ha % gatilho(s) de net.http_post ATIVO(S) nas tabelas da fixture depois da secao 3. Prosseguir dispararia analise de IA real e webhook n8n para nove linhas sinteticas — custo, escrita nas tabelas de IA e contaminacao do snapshot de vies (T-46-01-02 / T-46-01-03). Um despacho que ja saiu NAO volta com ROLLBACK. A transacao para aqui.', v_http_vivos;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 4 · AS TRES VAGAS
  -- ═══════════════════════════════════════════════════════════════════════════
  -- `created_by` fica NULO de proposito: `rh_le_candidaturas`
  -- (`20260706110004:63-69`) escopa o papel `rh` a `vagas.created_by =
  -- auth.uid()`, entao nenhuma vaga sem dono aparece para nenhum recrutador. O
  -- `titulo` carrega o prefixo `fixture-p46`, que e a unica marca pela qual o
  -- teardown alcanca estas tres linhas.
  INSERT INTO public.vagas (id, titulo, slug, status, descricao_curta, cidade, estado, exibir_salario, created_at, updated_at)
  VALUES
    (v_vaga_arq1,  'fixture-p46 vaga arquivada 1 (sintetica)', 'fixture-p46-vaga-arquivada-1', 'arquivada'::public.status_vaga, 'Vaga sintetica da fixture da Phase 46. Nao e uma vaga real.', 'Sao Paulo', 'SP', false, v_agora - make_interval(months => v_meses_fora), v_agora - make_interval(months => v_meses_fora)),
    (v_vaga_arq2,  'fixture-p46 vaga arquivada 2 (sintetica)', 'fixture-p46-vaga-arquivada-2', 'arquivada'::public.status_vaga, 'Vaga sintetica da fixture da Phase 46. Nao e uma vaga real.', 'Sao Paulo', 'SP', false, v_agora - make_interval(months => v_meses_fora), v_agora - make_interval(months => v_meses_fora)),
    (v_vaga_ativa, 'fixture-p46 vaga ativa (sintetica)',       'fixture-p46-vaga-ativa',       'ativa'::public.status_vaga,     'Vaga sintetica da fixture da Phase 46. Existe para provar D-46-03.', 'Sao Paulo', 'SP', false, v_agora - make_interval(months => v_meses_fora), v_agora - make_interval(months => v_meses_fora));

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 5 · AS OITO VARIANTES
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR v IN SELECT jsonb_array_elements(v_variantes)
  LOOP
    v_slug    := v ->> 'slug';
    v_email   := v ->> 'email';
    v_n       := v ->> 'n';

    v_user_id := ('4601a000-0000-4000-8000-0000000000' || v_n)::uuid;
    v_cand_id := ('4601b000-0000-4000-8000-0000000000' || v_n)::uuid;
    v_cdt_id  := ('4601c000-0000-4000-8000-0000000000' || v_n)::uuid;
    v_hist_id := ('4601f000-0000-4000-8000-0000000000' || v_n)::uuid;
    v_dec_id  := ('4601e000-0000-4000-8000-0000000000' || v_n)::uuid;

    v_vaga_id := CASE v ->> 'vaga'
                   WHEN 'ativa' THEN v_vaga_ativa
                   WHEN 'arq2'  THEN v_vaga_arq2
                   ELSE v_vaga_arq1
                 END;

    v_criado  := v_agora - make_interval(months => v_meses_fora);
    v_upd_at  := v_agora - make_interval(months => (v ->> 'upd_m')::integer);
    v_nascido := DATE '1990-01-01';

    -- Identificadores DERIVADOS do UUID, deterministicos. `translate` troca as
    -- seis letras do hexadecimal por digitos: 32 caracteres, todos numericos,
    -- estaveis entre execucoes. Sem sorteio em coluna UNIQUE, e sem aritmetica
    -- de bits que muda de sinal em borda.
    v_digitos := translate(md5(v_cand_id::text), 'abcdef', '012345');
    v_cpf     := substr(v_digitos,1,3) || '.' || substr(v_digitos,4,3) || '.' || substr(v_digitos,7,3) || '-' || substr(v_digitos,10,2);
    v_celular := '(11) 9' || substr(v_digitos,13,4) || '-' || substr(v_digitos,17,4);

    -- ── 5a · auth.users, com a lista de colunas MEDIDA do catalogo ──────────
    -- O conjunto de colunas de `auth.users` e da plataforma, muda entre versoes
    -- de GoTrue e nao esta sob o controle deste repositorio. Uma lista fixa de
    -- colunas quebraria num upgrade, e uma coluna a mais nomeada aqui derruba o
    -- INSERT inteiro. Por isso a lista e INTERSECTADA com o catalogo vivo, e
    -- logo abaixo ha a metade que importa: se sobrar coluna NOT NULL sem
    -- default que este mapa nao preenche, a transacao PARA e nomeia a coluna.
    v_desejado := jsonb_build_object(
      'id',                         format('%L::uuid', v_user_id),
      'instance_id',                format('%L::uuid', '00000000-0000-0000-0000-000000000000'),
      'aud',                        quote_literal('authenticated'),
      'role',                       quote_literal('authenticated'),
      'email',                      quote_literal(v_email),
      'encrypted_password',         quote_literal(''),
      'email_confirmed_at',         'NULL',
      'invited_at',                 'NULL',
      'confirmation_token',         quote_literal(''),
      'confirmation_sent_at',       'NULL',
      'recovery_token',             quote_literal(''),
      'recovery_sent_at',           'NULL',
      'email_change_token_new',     quote_literal(''),
      'email_change',               quote_literal(''),
      'email_change_token_current', quote_literal(''),
      'email_change_confirm_status','0',
      'email_change_sent_at',       'NULL',
      'last_sign_in_at',            'NULL',
      'raw_app_meta_data',          format('%L::jsonb', '{"provider":"fixture-p46","providers":["fixture-p46"]}'),
      'raw_user_meta_data',         format('%L::jsonb', '{"fixture":"p46","sintetico":true}'),
      'is_super_admin',             'false',
      'is_sso_user',                'false',
      'is_anonymous',               'false',
      'phone',                      'NULL',
      'phone_change',               quote_literal(''),
      'phone_change_token',         quote_literal(''),
      'reauthentication_token',     quote_literal(''),
      'banned_until',               'NULL',
      'deleted_at',                 'NULL',
      'created_at',                 format('%L::timestamptz', v_criado),
      'updated_at',                 format('%L::timestamptz', v_criado)
    );

    SELECT string_agg(c.column_name, ', ' ORDER BY c.column_name)
      INTO v_faltantes
      FROM information_schema.columns c
     WHERE c.table_schema = 'auth'
       AND c.table_name   = 'users'
       AND c.is_nullable  = 'NO'
       AND c.column_default IS NULL
       -- `jsonb_exists(a, b)` e a forma FUNCIONAL do operador `a ? b`. O
       -- operador esta correto em SQL, mas o caractere `?` e o marcador de
       -- placeholder de varios drivers, e este arquivo atravessa um transporte
       -- MCP antes de chegar ao servidor. A forma funcional nao tem esse
       -- caractere e portanto nao tem essa classe de falha.
       AND NOT jsonb_exists(v_desejado, c.column_name);

    IF v_faltantes IS NOT NULL THEN
      RAISE EXCEPTION 'P46FX: auth.users tem coluna(s) NOT NULL sem default que esta fixture nao preenche: %. E a divergencia que M2a existe para medir. Emendar o mapa v_desejado da secao 5a com o valor sintetico correto — nunca contornar tornando a coluna nulavel, que seria alterar o schema da plataforma para acomodar uma fixture.', v_faltantes;
    END IF;

    SELECT string_agg(quote_ident(k.nome), ', ' ORDER BY k.nome),
           string_agg(v_desejado ->> k.nome, ', ' ORDER BY k.nome)
      INTO v_lista_cols, v_lista_vals
      FROM jsonb_object_keys(v_desejado) AS k(nome)
     WHERE EXISTS (
             SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = 'auth'
                AND c.table_name   = 'users'
                AND c.column_name  = k.nome
           );

    EXECUTE format('INSERT INTO auth.users (%s) VALUES (%s)', v_lista_cols, v_lista_vals);

    -- ── 5b · public.candidatos ─────────────────────────────────────────────
    -- `ativo = false`: nada nesta fixture precisa parecer um candidato ativo, e
    -- um titular inativo e o que menos aparece em leitura de produto.
    INSERT INTO public.candidatos (
      id, user_id, nome_completo, email, cpf, celular, data_nascimento,
      cidade, estado, ativo, email_verificado, bloqueado, created_at, updated_at
    ) VALUES (
      v_cand_id, v_user_id,
      'FIXTURE P46 ' || upper(v_slug) || ' (sintetico, nao e pessoa real)',
      v_email, v_cpf, v_celular, v_nascido,
      'Sao Paulo', 'SP', false, false, false, v_criado, v_criado
    );

    -- ── 5c · public.candidaturas ───────────────────────────────────────────
    -- ⚠ `updated_at` VAI RETRODATADO AQUI, no proprio INSERT. Esta e a 1ª das
    -- duas defesas de D-46-21: o gatilho de carimbo e BEFORE **UPDATE** e nao
    -- dispara em INSERT, entao este valor sobrevive mesmo que a secao 6 nao
    -- pudesse rodar. `status = 'finalizado'` mantem as nove linhas fora de
    -- qualquer leitura de trabalho pendente.
    INSERT INTO public.candidaturas (
      id, candidato_id, vaga_id, etapa_atual, status,
      data_candidatura, data_decisao_final, is_rascunho, is_favorito,
      created_at, updated_at
    ) VALUES (
      v_cdt_id, v_cand_id, v_vaga_id,
      (v ->> 'etapa')::public.etapa_processo,
      'finalizado'::public.status_candidatura,
      v_criado,
      CASE WHEN (v ->> 'dec_col')::boolean THEN v_agora - make_interval(months => v_meses_fora) ELSE NULL END,
      false, false,
      v_criado, v_upd_at
    );

    v_upd_map := v_upd_map || jsonb_build_object(v_cdt_id::text, (v ->> 'upd_m')::integer);

    -- ── 5d · public.historico_candidatura — o degrau (1) da data-ancora ────
    -- `etapa_para` TEM de ser a `etapa_atual` da candidatura: e assim que o
    -- degrau (1) do COALESCE a encontra (`20260801000004:193-196`). Com
    -- `etapa_para` diferente, a subconsulta devolve NULL, o COALESCE desce, e a
    -- variante passaria a provar outro degrau sem avisar ninguem.
    IF (v ->> 'hist')::boolean THEN
      INSERT INTO public.historico_candidatura (id, candidatura_id, etapa_de, etapa_para, criado_em, auto_rejeitado)
      VALUES (v_hist_id, v_cdt_id, NULL, (v ->> 'etapa')::public.etapa_processo, v_agora - make_interval(months => v_meses_fora), false);
    END IF;

    -- ── 5e · public.decisao_final com revisao do Art. 20 ABERTA ────────────
    -- `revisao_solicitada_em` preenchida e `revisao_respondida_em` NULA e
    -- exatamente o par que a excecao JA VIVA do predicado
    -- (`20260801000004:185-191`) procura. INSERT, e nao UPDATE, de proposito:
    -- `trg_n8n_revisao_decisao` (`20260706110005:203-207`) dispara AFTER UPDATE
    -- OF revisao_solicitada_em, e um INSERT nao o aciona.
    IF (v ->> 'art20')::boolean THEN
      INSERT INTO public.decisao_final (
        id, candidatura_id, decisao, justificativa, por_usuario, em,
        revisao_solicitada_em, revisao_respondida_em
      ) VALUES (
        v_dec_id, v_cdt_id, 'rejeitado'::public.decisao_final_resultado,
        'FIXTURE P46 — decisao sintetica sobre titular sintetico. NUNCA foi uma decisao sobre pessoa real e NUNCA participou de processo seletivo.',
        v_por_usuario, v_agora - make_interval(months => v_meses_fora),
        v_agora - make_interval(months => v_meses_fora - 1), NULL
      );
    END IF;

    -- ── 5f · public.retencao_hold — inerte ate a tabela existir (46-03) ────
    -- ⚠ `public.retencao_hold` NASCE NO PLANO 46-03. Guardado por
    -- `to_regclass`, este bloco fica presente e inerte enquanto a tabela nao
    -- existir, e ativo assim que existir — sem uma segunda edicao deste arquivo.
    IF (v ->> 'hold')::boolean THEN
      IF to_regclass('public.retencao_hold') IS NOT NULL THEN
        EXECUTE format('INSERT INTO public.retencao_hold (candidatura_id) VALUES (%L::uuid)', v_cdt_id);
      ELSE
        RAISE NOTICE 'P46 FIXTURE — variante % criada SEM a linha de retencao_hold: a tabela ainda nao existe. O plano 46-03, que a cria, TEM de inserir a linha de hold para a candidatura % — enquanto ela faltar, neg-hold e apenas mais uma candidatura elegivel e a asserção (j.1) do smoke passaria por vacuidade.', v_slug, v_cdt_id;
      END IF;
    END IF;

  END LOOP;

  -- ── 5g · A NONA CANDIDATURA — o caso de D-46-11 ──────────────────────────
  -- Segunda candidatura do titular `neg-etapa`, DENTRO da janela. Faz com que
  -- exista, em PROD, ao menos um titular cujas candidaturas NAO estao TODAS
  -- alem da janela — o unico caso em que o agrupamento por titular de D-46-11
  -- MORDE. Sem ela, `titulares_alem_da_janela()` (46-02) nasceria sem caso
  -- negativo e sua asserção passaria por vacuidade.
  INSERT INTO public.candidaturas (
    id, candidato_id, vaga_id, etapa_atual, status,
    data_candidatura, data_decisao_final, is_rascunho, is_favorito,
    created_at, updated_at
  ) VALUES (
    ('4601c000-0000-4000-8000-000000000009')::uuid,
    ('4601b000-0000-4000-8000-000000000008')::uuid,
    v_vaga_arq2,
    'triagem'::public.etapa_processo,
    'finalizado'::public.status_candidatura,
    v_agora - make_interval(months => v_meses_dentro),
    NULL, false, false,
    v_agora - make_interval(months => v_meses_dentro),
    v_agora - make_interval(months => v_meses_dentro)
  );
  v_upd_map := v_upd_map || jsonb_build_object('4601c000-0000-4000-8000-000000000009', v_meses_dentro);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 6 · O RETRODATE EXPLICITO DE `updated_at` — a 2ª defesa de D-46-21
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Roda com o gatilho de carimbo DESLIGADO pela secao 3 (e religado pela 7).
  -- Correlacionado pela presenca da chave no mapa — nunca por negacao de
  -- pertencimento a um conjunto de valores. Redundante com o valor ja gravado
  -- no INSERT, e a redundancia e o ponto: se um dia alguem trocar o INSERT por
  -- um caminho que nao carimbe `updated_at`, esta linha ainda segura a fixture.
  -- ⚠ NAO toca `status` nem `etapa_atual`, entao nao aciona
  -- `trg_candidaturas_guard_rejeicao`, `candidaturas_avancar_etapa_trg` nem
  -- `trg_n8n_status_candidatura`, que sao todos `... OF <coluna>`.
  UPDATE public.candidaturas c
     SET updated_at = v_agora - make_interval(months => (v_upd_map ->> c.id::text)::integer)
   WHERE jsonb_exists(v_upd_map, c.id::text);
  GET DIAGNOSTICS v_n_upd = ROW_COUNT;

  IF v_n_upd <> 9 THEN
    RAISE EXCEPTION 'P46FX: o retrodate explicito de updated_at atingiu % linhas, e nao as 9 candidaturas da fixture. O mapa e as linhas divergiram, e prosseguir deixaria alguma candidatura com updated_at = now() — que e o degrau (3) do COALESCE e o modo de falha nomeado por D-46-21.', v_n_upd;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 7 · RELIGAR TUDO O QUE A SECAO 3 DESLIGOU
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Na mesma transacao. Se algo tivesse falhado antes daqui, o ROLLBACK ja teria
  -- restaurado os gatilhos — Postgres reverte DDL. Religar explicitamente cobre
  -- o caminho de SUCESSO, que e o unico que o ROLLBACK nao cobre.
  FOR r IN SELECT * FROM jsonb_array_elements(v_desligados) AS d(item)
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE TRIGGER %I', r.item ->> 'tabela', r.item ->> 'tgname');
  END LOOP;

  SELECT count(*) INTO v_http_vivos
    FROM jsonb_array_elements(v_desligados) AS d(item)
   WHERE NOT EXISTS (
           SELECT 1
             FROM pg_trigger t
            WHERE t.tgname = (d.item ->> 'tgname')
              AND t.tgrelid = (d.item ->> 'tabela')::regclass
              AND t.tgenabled <> 'D'
         );

  IF v_http_vivos <> 0 THEN
    RAISE EXCEPTION 'P46FX: % gatilho(s) desligado(s) pela secao 3 NAO voltaram a ficar ativos. Deixar um gatilho de despacho desligado em PROD e pior do que a fixture nao existir: o sistema pararia de notificar e de analisar sem erro nenhum, e o silencio seria indistinguivel de nao haver o que fazer. A transacao inteira esta sendo revertida.', v_http_vivos;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 8 · INTEGRIDADE DA CADEIA — o elo que, se faltar, ninguem e selecionavel
  -- ═══════════════════════════════════════════════════════════════════════════
  -- auth.users -> candidatos.user_id -> candidaturas.candidato_id -> vagas.id.
  -- A cadeia inteira tem de existir ou o titular nao e selecionavel pelo
  -- predicado, e a fixture teria custado uma escrita em PROD por nada.
  SELECT count(*) INTO v_n_users     FROM auth.users u        WHERE u.email  LIKE v_ns_email;
  SELECT count(*) INTO v_n_vagas     FROM public.vagas v2     WHERE v2.titulo LIKE 'fixture-p46%';
  SELECT count(*) INTO v_n_titulares FROM public.candidatos ca
   WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ca.user_id AND u.email LIKE v_ns_email);
  SELECT count(*) INTO v_n_cdt       FROM public.candidaturas c
   WHERE EXISTS (SELECT 1 FROM public.candidatos ca JOIN auth.users u ON u.id = ca.user_id
                  WHERE ca.id = c.candidato_id AND u.email LIKE v_ns_email);

  SELECT count(*) INTO v_n_orfas
    FROM public.candidaturas c
   WHERE c.id::text = ANY (ARRAY(SELECT jsonb_object_keys(v_upd_map)))
     AND NOT EXISTS (
           SELECT 1 FROM public.vagas v3 WHERE v3.id = c.vaga_id
         );

  IF v_n_users <> 8 OR v_n_titulares <> 8 OR v_n_cdt <> 9 OR v_n_vagas <> 3 OR v_n_orfas <> 0 THEN
    RAISE EXCEPTION 'P46FX: a cadeia da fixture nao fechou — auth.users=% (esperado 8), candidatos=% (8), candidaturas=% (9), vagas=% (3), candidaturas sem vaga=% (0). A transacao inteira esta sendo revertida, entao PROD volta ao estado anterior.', v_n_users, v_n_titulares, v_n_cdt, v_n_vagas, v_n_orfas;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 9 · ⊖ NAO-VACUIDADE — a fixture se recusa a existir se render menos de 3
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Esta e a razao de ser do arquivo, e por isso e uma condicao de COMMIT e nao
  -- uma observacao no fim do log. O valor de base medido em 2026-08-22 era 0.
  SELECT count(*) INTO v_elegiveis FROM public.candidaturas_alem_da_janela();

  -- ⚠ A chave e `<slug>#<sufixo da candidatura>`, e nao o nome do titular: o
  -- titular `neg-etapa` tem DUAS candidaturas (a nona, de D-46-11), e
  -- `jsonb_object_agg` com chave repetida descarta uma das duas em silencio —
  -- justamente a linha que existe para provar o agrupamento por titular.
  SELECT jsonb_object_agg(x.chave, x.elegivel) INTO v_quem
    FROM (
      SELECT split_part(split_part(ca.email, '+', 2), '@', 1) || '#' || right(c.id::text, 2) AS chave,
             EXISTS (SELECT 1 FROM public.candidaturas_alem_da_janela() f WHERE f.candidatura_id = c.id) AS elegivel
        FROM public.candidaturas c
        JOIN public.candidatos ca ON ca.id = c.candidato_id
       WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ca.user_id AND u.email LIKE v_ns_email)
    ) x;

  RAISE NOTICE 'P46 FIXTURE — candidaturas_alem_da_janela() agora devolve % (base medida em 2026-08-22: 0). Por titular: %', v_elegiveis, v_quem;

  IF v_elegiveis < 3 THEN
    RAISE EXCEPTION 'P46FX: a fixture rendeu apenas % candidatura(s) alem da janela, e o contrato desta fase exige no minimo 3. Ela SE AUTODERROTOU e a transacao inteira esta sendo revertida — nenhuma linha sintetica ficou em PROD. A causa mais provavel, na ordem: (1) o retrodate de updated_at foi sobrescrito por um gatilho que a secao 3 nao encontrou — e o degrau (3) do COALESCE, e o modo de falha nomeado por D-46-21; conferir M1b em 46-01-MEDICOES.md; (2) a matriz de config_retencao_etapa foi alterada para uma janela maior que % meses, e -30 meses deixou de ser "alem"; conferir M5a; (3) o predicado ganhou uma excecao nova entre a escrita desta fixture e este apply. NAO baixar o limite de 3: um dry-run sobre conjunto vazio prova exatamente zero, que e o "dry-run que e decoracao" que o SC#1 desta fase existe para proibir.', v_elegiveis, v_meses_fora;
  END IF;

  RAISE NOTICE 'P46 FIXTURE OK — 8 titulares sinteticos, 9 candidaturas, 3 vagas, no namespace fixture-p46+%%@invalido.local. Teardown: supabase/tests/p46_teardown_fixture.sql';

END
$p46_fixture$;
