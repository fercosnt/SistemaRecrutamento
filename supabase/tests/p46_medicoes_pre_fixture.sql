-- =============================================================================
-- p46_medicoes_pre_fixture.sql
-- Phase 46 (Purga Automatica) / plano 46-01 / Task 1 — PURGA-03 · PURGA-07
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA
--   Este arquivo NAO escreve nada. Zero verbo de escrita fora de comentario.
--   Ele nao cria objeto, nao carimba coluna, nao chama funcao volatil, nao le
--   valor de segredo (le apenas a PRESENCA de um segredo, como booleano) e nao
--   invoca `public.plano_exclusao_titular` nem `public.anonimizar_candidato` —
--   sobre essas duas ele apenas LE O CATALOGO.
--
-- (1) PROTOCOLO DE EXECUCAO — o executor GSD nao roda isto
--   `supabase db push` e PROIBIDO neste projeto e subagentes GSD nao recebem os
--   tools MCP do Supabase (bug upstream anthropics/claude-code#13898). Este
--   script e rodado pelo ORQUESTRADOR, por MCP `execute_sql`, EM UMA UNICA
--   CHAMADA. Por isso ele e UM UNICO `SELECT`: com varios statements, o
--   transporte devolveria so o resultado do ultimo e seis das sete medicoes
--   sumiriam em silencio. Um resultado parcial que parece completo e a forma
--   mais barata de esta fase medir errado.
--
--   Sem wrapper de transacao explicita: alem de desnecessario para um `SELECT`,
--   o par externo de abertura/fecho e o gatilho do SQLSTATE 42601 no transaction
--   pooler quando ha corpo `$$` adjacente (CLAUDE.md §Migrations). O grep do
--   criterio de aceite exige literalmente ZERO ocorrencia desse par no arquivo,
--   inclusive em comentario — por isso ele nao aparece nem aqui.
--
-- (2) POR QUE ESTAS SETE MEDICOES, E NAO OUTRAS
--   A fixture de 46-01 escreve em PROD, inclusive em `auth.users`. Cada uma das
--   sete medicoes abaixo fecha uma premissa que a fixture, se a presumisse,
--   poderia errar em silencio. A ordem de importancia nao e a ordem numerica:
--   M1 e a medicao que decide se a fixture rende alguma coisa ou ZERO.
--
-- (3) PROVENIENCIA
--   Copiado de: nada — este arquivo nao tem gemeo. A DISCIPLINA vem do bloco de
--   proveniencia de `supabase/tests/p45_motor_exclusao_smoke.sql:217-265`: um
--   valor so conta como medido quando foi lido por EXECUCAO contra o objeto
--   vivo, nunca transcrito de documentacao e nunca inferido de um arquivo do
--   repositorio.
--   ⚠ DELIBERADAMENTE NAO COPIADO: a chamada `SELECT * FROM
--   public.listar_matriz_retencao()` que o plano 46-01 sugere para M5. Aquela
--   RPC tem guard de papel NULL-safe (`20260801000002:288-291`) e RECUSA com
--   SQLSTATE 42501 todo chamador cujo `auth.jwt() #>> '{app_metadata,role}'`
--   nao seja 'administrador' — que e exatamente o chamador desta medicao, como
--   M3 registra por execucao. Chama-la aqui abortaria as SETE medicoes de uma
--   vez. M5 le a TABELA-BASE, e M4 registra o catalogo da RPC recusante.
--
-- (4) O QUE FAZER COM O RESULTADO
--   Transcrever os sete valores para
--   `.planning/phases/46-purga-autom-tica-dry-run-live/46-01-MEDICOES.md`,
--   uma secao por medicao, com a data. Um valor que contradiga uma premissa da
--   46-RESEARCH.md nao e um erro da medicao: o texto do artefato passa a ser a
--   premissa nova, e a contradicao fica ESCRITA.
--
-- =============================================================================

SELECT jsonb_pretty(jsonb_build_object(

  -- ═════════════════════════════════════════════════════════════════════════
  -- M1 · GATILHOS DAS TABELAS QUE A FIXTURE TOCA
  -- ═════════════════════════════════════════════════════════════════════════
  -- ⚠⚠ ESTA E A MEDICAO QUE DECIDE SE A FIXTURE RENDE ALGUMA COISA OU ZERO.
  --
  -- `candidaturas.updated_at` e o degrau (3) do COALESCE da data-ancora de
  -- `public.candidaturas_alem_da_janela()` (`20260801000004:192-200`) e nasce
  -- `now()`. Se existir gatilho BEFORE UPDATE que carimbe `updated_at`, todo
  -- retrodate feito por `UPDATE` e sobrescrito, a soma nunca fica menor que
  -- `now()`, o predicado devolve ZERO e a fixture SE AUTODERROTA sem erro
  -- nenhum. E o modo de falha mais provavel desta fase (D-46-21).
  --
  -- M1a vai alem do que 46-01 pediu, e a razao e medida: a fixture tambem
  -- dispara AFTER INSERT em `public.candidaturas`, e dois gatilhos vivos ali
  -- fazem `net.http_post` para fora — `trg_candidaturas_analise`
  -- (`20260610000002:68-70`, chama a EF de analise de IA) e
  -- `trg_n8n_nova_candidatura` (`20260706110005:90-93`). Nove linhas
  -- sinteticas produziriam nove analises de IA reais: custo, escrita nas
  -- tabelas de IA e contaminacao do snapshot de vies — precisamente as ameacas
  -- T-46-01-02 e T-46-01-03 do registro STRIDE deste plano. A coluna
  -- `dispara_http` e o que permite a fixture desligar EXATAMENTE esses e
  -- religa-los, sem nunca remover gatilho nenhum.
  'M1a_gatilhos_das_tabelas_da_fixture', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'tabela',              t.tgrelid::regclass::text,
             'tgname',              t.tgname,
             'proname',             p.proname,
             'tgenabled',           t.tgenabled,
             'dispara_http',        (pg_get_functiondef(p.oid) LIKE '%net.http_post%'),
             'menciona_updated_at', (pg_get_functiondef(p.oid) LIKE '%updated_at%'),
             'definicao',           pg_get_triggerdef(t.oid)
           ) ORDER BY t.tgrelid::regclass::text, t.tgname), '[]'::jsonb)
      FROM pg_trigger t
      JOIN pg_proc p ON p.oid = t.tgfoid
     WHERE NOT t.tgisinternal
       AND t.tgrelid = ANY (ARRAY[
             'public.candidaturas'::regclass,
             'public.candidatos'::regclass,
             'public.vagas'::regclass,
             'public.decisao_final'::regclass,
             'public.historico_candidatura'::regclass
           ])
  ),

  -- M1b · A RESPOSTA DIRETA A PERGUNTA DE D-46-21, isolada para nao se perder
  -- no meio de M1a: gatilhos de `public.candidaturas` que disparam em UPDATE
  -- (bit 16 de `tgtype`) e cujo corpo menciona `updated_at`. Lista vazia =
  -- `trigger de updated_at: ausente`. Lista nao-vazia = `presente`, e o
  -- `tgname` de cada um e o que a fixture desliga e religa.
  'M1b_gatilho_updated_at_em_candidaturas', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'tgname',    t.tgname,
             'proname',   p.proname,
             'tgenabled', t.tgenabled,
             'definicao', pg_get_triggerdef(t.oid)
           ) ORDER BY t.tgname), '[]'::jsonb)
      FROM pg_trigger t
      JOIN pg_proc p ON p.oid = t.tgfoid
     WHERE NOT t.tgisinternal
       AND t.tgrelid = 'public.candidaturas'::regclass
       AND (t.tgtype & 16) <> 0
       AND pg_get_functiondef(p.oid) LIKE '%updated_at%'
  ),

  -- M1c · Presenca dos tres segredos de Vault que os gatilhos de despacho leem.
  -- ⚠ SO O BOOLEANO SAI DAQUI. `decrypted_secret` nunca e projetado — um valor
  -- de segredo num artefato de planning versionado seria um vazamento
  -- permanente, e a pergunta desta medicao e "o despacho chega a sair?", que
  -- um booleano responde inteira. Segredo ausente = gatilho faz graceful-skip.
  'M1c_segredos_de_vault_presentes', (
    SELECT coalesce(jsonb_object_agg(s.name, (s.decrypted_secret IS NOT NULL)), '{}'::jsonb)
      FROM vault.decrypted_secrets s
     WHERE s.name = ANY (ARRAY['project_url', 'edge_invoke_key', 'n8n_webhook_base'])
  ),

  -- ═════════════════════════════════════════════════════════════════════════
  -- M2 · O QUE O INSERT DA FIXTURE E OBRIGADO A PREENCHER
  -- ═════════════════════════════════════════════════════════════════════════
  -- Colunas NOT NULL sem default: o conjunto que a fixture tem de preencher ou
  -- falhar. Medir, nunca copiar de tutorial.
  --
  -- ⚠ M2 cobre `auth.users` (que 46-01 pediu) E as cinco tabelas de dominio da
  -- cadeia da fixture. A razao e medida e esta escrita dentro do repositorio:
  -- `20260805000006:1814` registra que `docs/sql/sql/02-tabela-candidatos.sql`
  -- e de 2025 e DIVERGE do catalogo vivo em pelo menos `cpf` (Pitfall 9 da
  -- 46-RESEARCH). O arquivo de baseline nao e fonte confiavel de nullability;
  -- o catalogo e.
  'M2a_notnull_sem_default', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'tabela', c.table_schema || '.' || c.table_name,
             'coluna', c.column_name,
             'tipo',   c.data_type
           ) ORDER BY c.table_schema, c.table_name, c.ordinal_position), '[]'::jsonb)
      FROM information_schema.columns c
     WHERE c.is_nullable = 'NO'
       AND c.column_default IS NULL
       AND (
             (c.table_schema = 'auth'   AND c.table_name = 'users')
          OR (c.table_schema = 'public' AND c.table_name = ANY (ARRAY[
                'candidatos', 'candidaturas', 'vagas',
                'decisao_final', 'historico_candidatura'
              ]))
           )
  ),

  -- M2b · CHECKs e UNIQUEs das mesmas tabelas. Um CHECK de formato desconhecido
  -- (CPF, celular, UF, slug) e a diferenca entre a fixture aplicar de primeira
  -- e cada tentativa custar uma ida e volta ao orquestrador. `contype`: 'c' =
  -- CHECK, 'u' = UNIQUE.
  'M2b_checks_e_uniques', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'tabela',     rel.relname,
             'constraint', con.conname,
             'tipo',       con.contype,
             'definicao',  pg_get_constraintdef(con.oid)
           ) ORDER BY rel.relname, con.conname), '[]'::jsonb)
      FROM pg_constraint con
      JOIN pg_class     rel ON rel.oid = con.conrelid
      JOIN pg_namespace n   ON n.oid   = rel.relnamespace
     WHERE n.nspname = 'public'
       AND con.contype = ANY (ARRAY['c'::"char", 'u'::"char"])
       AND rel.relname = ANY (ARRAY[
             'candidatos', 'candidaturas', 'vagas',
             'decisao_final', 'historico_candidatura'
           ])
  ),

  -- M2c · A FK de `decisao_final.por_usuario`. A variante `neg-art20` da
  -- fixture precisa dessa coluna NOT NULL preenchida, e o valor legitimo
  -- depende de existir ou nao referencia a `public.usuarios_rh`. Sem esta
  -- medicao a fixture escolheria por adivinhacao.
  'M2c_fks_de_decisao_final', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'constraint', con.conname,
             'definicao',  pg_get_constraintdef(con.oid)
           ) ORDER BY con.conname), '[]'::jsonb)
      FROM pg_constraint con
      JOIN pg_class     rel ON rel.oid = con.conrelid
      JOIN pg_namespace n   ON n.oid   = rel.relnamespace
     WHERE n.nspname = 'public'
       AND rel.relname = 'decisao_final'
       AND con.contype = 'f'::"char"
  ),

  -- ═════════════════════════════════════════════════════════════════════════
  -- M3 · IDENTIDADE DO PAPEL CORRENTE, SEM CLAIMS
  -- ═════════════════════════════════════════════════════════════════════════
  -- Re-afere POR EXECUCAO o `[ASSUMED A3]` da 46-RESEARCH, que fundamenta a
  -- Saida B de D-46-18: um cron nao tem sessao, nao tem papel e nao tem
  -- intencao, e por isso as tres metades do guard de
  -- `public.anonimizar_candidato` (`20260805000006:340-449`) recusam com 42501.
  -- Se qualquer um dos tres vier NAO-NULO aqui, D-46-18 muda de fundamento e o
  -- plano 46-04 precisa ser relido antes de escrever o quarto ramo.
  'M3_identidade_da_sessao', jsonb_build_object(
    'auth_uid',            (SELECT auth.uid()),
    'jwt_app_metadata_role', (SELECT auth.jwt() #>> '{app_metadata,role}'),
    'request_jwt_claims',  current_setting('request.jwt.claims', true),
    'current_user',        current_user,
    'session_user',        session_user
  ),

  -- ═════════════════════════════════════════════════════════════════════════
  -- M4 · O CATALOGO DAS FUNCOES QUE A FASE 46 CONSOME (A6)
  -- ═════════════════════════════════════════════════════════════════════════
  -- `prosecdef` (DEFINER?), `proconfig` (o `search_path`, que o catalogo grava
  -- como `search_path=""` e nao `search_path=` — Pitfall 10) e `proacl` (quem
  -- pode EXECUTE). NENHUMA das quatro e INVOCADA aqui: `plano_exclusao_titular`
  -- e `anonimizar_candidato` sao caminhos do motor destrutivo, e
  -- `listar_matriz_retencao` recusaria a sessao inteira (ver §3 do cabecalho).
  'M4_catalogo_das_funcoes', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'proname',    p.proname,
             'argumentos', pg_get_function_identity_arguments(p.oid),
             'prosecdef',  p.prosecdef,
             'provolatile', p.provolatile,
             'proconfig',  to_jsonb(p.proconfig),
             'proacl',     to_jsonb(p.proacl::text[])
           ) ORDER BY p.proname), '[]'::jsonb)
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY (ARRAY[
             'plano_exclusao_titular',
             'anonimizar_candidato',
             'candidaturas_alem_da_janela',
             'previa_retencao',
             'previa_retencao_total',
             'listar_matriz_retencao'
           ])
  ),

  -- ═════════════════════════════════════════════════════════════════════════
  -- M5 · A MATRIZ DE RETENCAO, LINHA A LINHA (D-46-22)
  -- ═════════════════════════════════════════════════════════════════════════
  -- Lida da TABELA-BASE e nao da RPC, pela razao do §3 do cabecalho. D-46-22
  -- transforma esta leitura em PRE-CONDICAO do flip `dry_run -> live`: o
  -- `COMMENT` de `config_retencao_etapa.janela_meses` (`20260801000002:174-177`)
  -- declara, dentro do banco, que a Phase 46 nao pode ligar a purga enquanto
  -- houver linha em `origem='seed'` sem confirmacao por estado. `em_seed` e o
  -- numero que essa pre-condicao consome.
  -- `alterado_por` sai como o uuid cru: o NOME viria de `usuarios_rh`, que e
  -- admin-only desde a SEG-02, e um nome de administrador num artefato de
  -- planning versionado seria vazamento por conveniencia.
  'M5a_matriz_de_retencao', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'etapa',         m.etapa,
             'janela_meses',  m.janela_meses,
             'origem',        m.origem,
             'alterado_por',  m.alterado_por,
             'atualizado_em', m.atualizado_em
           ) ORDER BY m.etapa::text), '[]'::jsonb)
      FROM public.config_retencao_etapa m
  ),
  'M5b_linhas_em_seed', (
    SELECT count(*) FROM public.config_retencao_etapa m WHERE m.origem = 'seed'
  ),
  -- A coluna `elegivel_purga` (D-46-19) nasce no plano 46-02. `false` aqui e o
  -- estado esperado ANTES daquele plano, e o valor contra o qual a asserção (l)
  -- do smoke novo prova que a allowlist passou a existir.
  'M5c_ja_tem_coluna_elegivel_purga', (
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
       WHERE c.table_schema = 'public'
         AND c.table_name   = 'config_retencao_etapa'
         AND c.column_name  = 'elegivel_purga'
    )
  ),

  -- ═════════════════════════════════════════════════════════════════════════
  -- M6 · O INSTANTANEO DE `cron.job` (D-46-23)
  -- ═════════════════════════════════════════════════════════════════════════
  -- A asserção (a) de `supabase/tests/p42_invent05_cron_smoke.sql:98` fixa esta
  -- contagem em 3 HOJE, e a mensagem de falha dela acusa "guard de remocao
  -- condicional falhou e o alvo ficou duplicado" — um diagnostico FALSO no dia
  -- em que o 4º job legitimo nascer. Por isso D-46-23 manda emendar aquele
  -- smoke no MESMO commit que cria `purga-retencao-sweep`. Este e o valor de
  -- base que a emenda transforma em invariante.
  'M6a_total_de_jobs', (SELECT count(*) FROM cron.job),
  'M6b_jobs', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'jobname',  j.jobname,
             'schedule', j.schedule,
             'active',   j.active
           ) ORDER BY j.jobname), '[]'::jsonb)
      FROM cron.job j
  ),

  -- ═════════════════════════════════════════════════════════════════════════
  -- M7 · A LINHA DE BASE DE ZERO QUE A FIXTURE TEM DE MOVER
  -- ═════════════════════════════════════════════════════════════════════════
  -- ⊖ NAO-VACUIDADE: `alem_da_janela` e o numero contra o qual a Task 3 prova
  -- que a fixture funcionou. Medido em 2026-08-22 ele era 0 — nao por defeito,
  -- por ARITMETICA: a candidatura mais antiga tem ~9,5 meses e a matriz esta em
  -- 24. O criterio de aceite da Task 3 e `>= 3`, nunca `>= 0`.
  -- `candidaturas_vivas` e o valor que a Task 3 compara com `+ 9` para provar
  -- que ZERO linha de pessoa real foi alterada (T-46-01-01).
  -- `ja_existe_fixture` protege contra aplicar a fixture duas vezes: se vier
  -- diferente de 0, rodar `p46_teardown_fixture.sql` ANTES de qualquer coisa.
  'M7_linha_de_base', jsonb_build_object(
    'now_do_servidor',        pg_catalog.now(),
    'statement_timeout',      current_setting('statement_timeout'),
    'current_user',           current_user,
    'candidaturas_vivas',     (SELECT count(*) FROM public.candidaturas c WHERE c.deleted_at IS NULL),
    'candidatura_mais_antiga',(SELECT min(c.data_candidatura) FROM public.candidaturas c WHERE c.deleted_at IS NULL),
    'alem_da_janela',         (SELECT count(*) FROM public.candidaturas_alem_da_janela()),
    'auth_users',             (SELECT count(*) FROM auth.users),
    'notificacoes_enviadas',  (SELECT count(*) FROM public.notificacoes_enviadas),
    'ja_existe_fixture',      (SELECT count(*) FROM auth.users u WHERE u.email LIKE 'fixture-p46+%@invalido.local'),
    'ja_existe_retencao_hold',(SELECT to_regclass('public.retencao_hold') IS NOT NULL)
  )

)) AS p46_medicoes;
