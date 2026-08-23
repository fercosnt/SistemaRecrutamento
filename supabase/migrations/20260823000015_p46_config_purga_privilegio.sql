-- =============================================================================
-- Phase 46 / Code review retroativo (`46-REVIEW-2.md`) — HI-04
-- `public.config_purga`: fechar a porta que a verificacao de policies nao
-- alcancava, e passar a MEDIR o invariante que ela dizia medir.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NAO APAGA NADA, NAO CRIA TABELA, NAO CRIA COLUNA, NAO CRIA
-- FUNCAO, NAO CRIA CRON, NAO GRAVA NENHUMA LINHA E NAO MUDA O MODO DA PURGA.**
-- Ela REVOGA privilegios de TABELA de tres papeis de aplicacao e confere o
-- resultado. `config_purga.modo` continua exatamente onde estava — hoje
-- `dry_run`, desde T0 = 2026-08-23 02:06:37-03.
--
-- Nenhum `DELETE`, nenhum `DROP`, nenhum `INSERT`, nenhum `UPDATE` de dado,
-- nenhum agendamento.
--
-- -----------------------------------------------------------------------------
-- (1) O ACHADO — A PERGUNTA ESTAVA CERTA E ERA FEITA DO LADO ERRADO DA PORTA
-- -----------------------------------------------------------------------------
-- O bloco (iii) da auto-verificacao da `20260823000013:198-222` prova duas
-- coisas sobre `public.config_purga`: RLS LIGADA, e ZERO policy cujo
-- `cmd <> 'SELECT'`. A pergunta e feita pela FORMA (o COMANDO da policy) e nao
-- por lista de nomes, e isso e exemplar — uma lista de nomes envelheceria no dia
-- em que alguem criasse uma policy com nome novo.
--
-- **Mas policy nao e a unica porta, e para um dos papeis ela nao e porta
-- nenhuma.**
--
--   · `20260823000001_p46_config.sql` cria a tabela e **nao contem um unico
--     `REVOKE`**. Os privilegios de tabela ficaram os default do schema `public`
--     deste projeto — o mesmo `pg_default_acl` que as proprias migrations desta
--     fase descrevem como concedendo DIRETO a `anon` e `authenticated`.
--
--   · No Supabase, **`service_role` carrega `BYPASSRLS`**. Para esse papel, RLS
--     ligada e zero policy **nao bloqueiam nada**: so o privilegio de TABELA
--     bloquearia, e ele nao estava sendo medido.
--
--   · ⚠ MEDIDO EM PROD EM 2026-08-23, por consulta read-only, e nao presumido:
--
--       relacl = {postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres,
--                 authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres}
--       has_table_privilege('service_role',  'public.config_purga','UPDATE') = true
--       has_table_privilege('authenticated', 'public.config_purga','UPDATE') = true
--       has_table_privilege('anon',          'public.config_purga','UPDATE') = true
--       rolbypassrls do service_role                                          = true
--
--     Os grants sao DIRETOS (nao vem de pertencimento a papel), entao o `REVOKE`
--     abaixo os alcanca.
--
--   · **A prova empirica ja estava no mesmo commit:** `p46_purga_smoke.sql`
--     escreve a coluna direto sete vezes, com `UPDATE public.config_purga SET
--     modo = …`, e funciona. O caminho existia e estava exercitado.
--
-- O `46-07-SUMMARY.md:173-175` afirmava que *"T-46-07-01 — «nenhum caminho de
-- deploy altera o modo» — so e verdade enquanto esta funcao for o unico caminho
-- de escrita"* e apresentava o bloco (iii) como a verificacao disso. **O bloco
-- verificava uma condicao MAIS FRACA que a afirmada.** Nao e furo de privilegio
-- novo — quem tem `service_role` ja possui o banco —, mas e um portao que parece
-- medir o invariante e mede um vizinho dele. E um portao assim e pior que
-- nenhum: ele produz confianca sem produzir a propriedade.
--
-- -----------------------------------------------------------------------------
-- (2) O CONSERTO, E POR QUE ELE NAO DERRUBA O SMOKE
-- -----------------------------------------------------------------------------
-- `REVOKE` dos verbos de ESCRITA dos tres papeis de aplicacao, e uma
-- auto-verificacao que MEDE o privilegio em vez de medir a policy.
--
-- ⚠⚠ A PERGUNTA OBRIGATORIA ANTES DE APLICAR, e ela foi MEDIDA e nao presumida:
--   **quem roda o `p46_purga_smoke.sql` e o `postgres`, dono da tabela — nao o
--   `service_role`.** Conferido em 2026-08-23 pela mesma via de apply:
--   `current_user = postgres`, `session_user = postgres`, e
--   `pg_class.relowner = postgres`. O dono de uma tabela nao e alcancado por
--   `REVOKE`, entao as sete escritas diretas do smoke — em `(q)`, `(g)`, `(m)`
--   e `(d)` — continuam funcionando. Se essa via mudar um dia, o smoke reprovara
--   com `42501` e a mensagem sera clara.
--
-- ⚠ `SELECT` NAO E REVOGADO: `authenticated` precisa dele para a policy de
--   leitura admin-only que ja existe (`20260823000001`). O que se fecha e a
--   ESCRITA, que e a unica coisa que T-46-07-01 afirma.
--
-- ⚠ `TRIGGER` E REVOGADO JUNTO, e nao e zelo: quem pode anexar trigger a esta
--   tabela pode fazer codigo proprio rodar dentro da transacao de quem a
--   escreve — que e uma segunda porta da mesma classe, so que indireta. Nenhum
--   papel de aplicacao anexa trigger aqui; o `trg_config_purga_atualizado_em`
--   pertence ao dono e nao e afetado. `REFERENCES` fica: uma FK apontando para
--   esta tabela nao altera o modo.
--
-- ⚠ E `salvar_config_purga` CONTINUA ESCREVENDO. Ela e `SECURITY DEFINER` com
--   owner `postgres`, ou seja escreve com os privilegios do DONO. Revogar dos
--   papeis de aplicacao nao a alcanca — e esse e exatamente o desenho que se
--   queria: **uma unica porta, e ela audita e pode recusar.**
--
-- -----------------------------------------------------------------------------
-- (3) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE pela Management API com o SQL LIDO DO ARQUIVO
-- (CLAUDE.md §"Via de apply ATUAL" — `node p46apply.cjs migrate`). A `version`
-- nasce correta do nome do arquivo; NAO ha reparo a fazer.
--
-- Sem par de transacao explicita no topo, e corpos em delimitadores NOMEADOS.
--
-- ⚠ A ORDEM DENTRO DESTE ARQUIVO E LOAD-BEARING: o `REVOKE` vem ANTES da
-- auto-verificacao, de proposito. O endpoint da Management API roda o corpo
-- INTEIRO numa unica transacao (CLAUDE.md, propriedade 1), entao o bloco abaixo
-- mede o estado DEPOIS da revogacao — e, se ele reprovar, a revogacao e revertida
-- junto. **A migration prova o proprio efeito**, em vez de afirma-lo.
--
-- Conferencia obrigatoria, os DOIS lados registrados:
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260823000015';
--   -- comparar com o md5 dos BYTES CRUS do arquivo:
--   --   md5 -q supabase/migrations/20260823000015_p46_config_purga_privilegio.sql   (macOS)
--   --   md5sum  supabase/migrations/20260823000015_p46_config_purga_privilegio.sql  (Linux)
--
-- ⛔ NAO usar `printf '%s' "$(cat <arquivo>)" | md5`, que e a forma herdada dos
--    cabecalhos anteriores deste repositorio: `$( … )` REMOVE as quebras de
--    linha finais, e o ledger guarda os bytes crus (`p46apply.cjs` faz
--    `fs.readFileSync` e registra o MESMO buffer em `statements[1]`). A forma
--    herdada reporta DIVERGENCIA num apply CORRETO — HI-R3-01 do
--    `46-REVIEW-3.md`. Medido em 2026-08-23 contra a `20260823000013`, que ja
--    esta aplicada e pinada:
--
--      md5 do ledger                          = 63feeec5f3d55ea4371fa6fb5954d10a
--      md5 -q do arquivo (bytes crus)         = 63feeec5f3d55ea4371fa6fb5954d10a  ✅
--      printf '%s' "$(cat arquivo)" | md5     = c410a6723d0f8557bc3c7b13e7ddc7b0  ⛔
--
--    ⚠ Uma conferencia de md5 que da FALSO NEGATIVO e um convite a reverter o
--    que estava certo — a mesma classe de diagnostico falso que esta fase ja
--    pagou tres vezes. Os cabecalhos das migrations JA APLICADAS carregam a
--    forma errada e nao podem ser corrigidos: editar o arquivo faria o md5
--    divergir do ledger e quebraria a propria prova.
--
-- ⚠ A via automatica JA FAZ o cross-check CERTO por conta propria: `p46apply.cjs`
--   calcula `crypto.createHash('md5')` sobre o buffer do arquivo e o compara com
--   `md5(statements[1])` lido de volta do ledger, abortando se divergir.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · A PORTA — revogacao NOMINAL dos verbos de escrita
-- ---------------------------------------------------------------------------
-- ⚠ Os tres papeis aparecem por NOME, e `PUBLIC` junto. O idioma difundido deste
-- repositorio — `REVOKE … FROM PUBLIC` sozinho — remove um grant de `PUBLIC` que
-- nunca existiu e deixa `anon=arwdDxtm` de pe, porque o `pg_default_acl` do
-- schema `public` concede DIRETO e NOMINALMENTE. Foi assim que esta tabela
-- nasceu com escrita para os tres.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.config_purga
  FROM PUBLIC, anon, authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 2 · A MEDICAO — o invariante conferido do lado CERTO da porta
-- ---------------------------------------------------------------------------
-- Tres familias, e as tres ABORTAM o apply. Juntas elas dizem o que
-- T-46-07-01 sempre quis dizer: **nao existe caminho de escrita alem de
-- `salvar_config_purga`.**
--
--   (i)   ZERO privilegio de TABELA de escrita para os papeis de aplicacao.
--         Esta e a familia que faltava, e e a unica que alcanca `service_role`.
--   (ii)  RLS LIGADA. Carregada da `20260823000013` de proposito: as duas
--         familias respondem por metades diferentes do mesmo invariante, e
--         separa-las em arquivos diferentes faria cada uma parecer suficiente.
--   (iii) ZERO policy de escrita, aferida pela FORMA (`cmd <> 'SELECT'`) e nao
--         por lista de nomes.
DO $verifica_privilegio_config_purga$
DECLARE
  v_papeis     text[] := ARRAY['anon', 'authenticated', 'service_role'];
  -- ⚠⚠ HI-R3-05 · ESTA LISTA E A LISTA DO `REVOKE` DE `:123-124`, VERBO POR
  --   VERBO, E AS DUAS TEM DE MUDAR JUNTAS. Ela nasceu com QUATRO verbos e o
  --   `REVOKE` com CINCO: `TRIGGER` era revogado e nao era conferido por nada,
  --   enquanto o `COMMENT ON TABLE` desta mesma migration afirmava, como fato,
  --   que ele estava revogado. Se `TRIGGER` voltasse, as duas familias seguiriam
  --   VERDES e o catalogo continuaria afirmando o contrario — a forma "iteracao
  --   sobre lista literal" do `CLAUDE.md`, cometida dentro do bloco que se
  --   apresentava como o antidoto dela.
  v_verbos     text[] := ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER'];
  -- ⚠⚠ E ESTA E A LISTA QUE TORNA A FAMILIA (i.a) DE FATO EXAUSTIVA: os verbos
  --   que PODEM sobreviver ao `REVOKE` porque nao alteram CONTEUDO. A pergunta
  --   de (i.a) passa a ser feita por ALLOWLIST — "que verbo esta aqui e nao e um
  --   destes?" — e nao por lista de verbos proibidos. A diferenca e a direcao em
  --   que a lista envelhece: uma lista de PROIBIDOS deixa passar o verbo que
  --   ainda nao existia quando ela foi escrita (foi assim que `TRIGGER` escapou,
  --   e `MAINTAIN` nasceu no PG17 sem que ninguem a revisasse); uma lista de
  --   TOLERADOS deixa o desconhecido de FORA, que e a direcao segura num portao
  --   que responde por "nao existe caminho de escrita alem de
  --   salvar_config_purga". Medido em PROD em 2026-08-23: os tres papeis carregam
  --   SELECT, REFERENCES e MAINTAIN alem dos cinco verbos revogados, e nenhum
  --   dos tres altera conteudo — SELECT e deliberadamente MANTIDO (a policy de
  --   leitura admin-only precisa dele), REFERENCES so permite apontar FK para
  --   esta tabela, e MAINTAIN so permite VACUUM/ANALYZE/REINDEX/CLUSTER.
  v_verbos_ok  text[] := ARRAY['SELECT', 'REFERENCES', 'MAINTAIN'];
  v_papel      text;
  v_verbo      text;
  v_achados    text := '';
  v_rls_on     boolean;
  v_escrita_n  int;
  v_escrita    text;
  v_acl        text;
  v_acl_livre  text;
BEGIN
  -- ── (i.a) ⚠⚠ A PERGUNTA EXAUSTIVA, E ELA VEM PRIMEIRO ──────────────────────
  -- A varredura por papel NOMEADO logo abaixo tem a forma que o `CLAUDE.md`
  -- cataloga como perigosa — *"iteracao sobre lista literal: o objeto novo fica
  -- fora da vigilancia e o portao segue verde"*. Ela e boa para o DIAGNOSTICO
  -- (nomeia o par papel:verbo em que o operador pode agir) e ma para a COBERTURA
  -- (um papel de aplicacao novo nao seria visto).
  --
  -- Esta primeira familia nao tem esse buraco: ela pergunta a ACL DA TABELA
  -- quem, alem do DONO, carrega qualquer verbo que NAO esteja na allowlist de
  -- verbos tolerados — sem lista de papeis, sem lista de verbos PROIBIDOS, e
  -- alcancando `PUBLIC` (grantee 0). Um papel que nascer amanha com `UPDATE`
  -- nesta tabela cai aqui, e um VERBO que nascer amanha tambem.
  --
  -- ⚠⚠ HI-R3-05 · ERA AQUI QUE ELA MENTIA. Ate este conserto o comentario dizia
  --   "sem lista de papeis, sem lista de verbos conhecidos por nome" e a linha
  --   tres abaixo era `a.privilege_type IN ('INSERT','UPDATE','DELETE',
  --   'TRUNCATE')` — uma lista literal de verbos, que OMITIA justamente o
  --   `TRIGGER` que o `REVOKE` de `:123` executa e que o cabecalho de `:81-86`
  --   justifica por extenso como "a segunda porta da mesma classe". A pergunta
  --   passou a ser por ALLOWLIST (`v_verbos_ok`): a lista que sobra e a dos
  --   verbos que PODEM ficar, e nao a dos que devem sair.
  --
  -- ⚠ E ela NAO ALARGA DEMAIS, que e o outro modo de falha: o escopo e a ACL de
  --   UMA tabela, e o dono e excluido por COMPARACAO COM `relowner` — nao por
  --   nome literal `postgres`. Papeis internos do Supabase que nao tenham grant
  --   NESTA tabela nao aparecem, entao nao ha como reprovar trabalho correto por
  --   varrer `pg_roles` inteiro.
  SELECT coalesce(string_agg(t.par, ', ' ORDER BY t.par), '')
    INTO v_acl_livre
    FROM (
      SELECT DISTINCT
             CASE WHEN a.grantee = 0 THEN 'PUBLIC'
                  ELSE a.grantee::regrole::text END || ':' || a.privilege_type AS par
        FROM pg_catalog.pg_class c,
             LATERAL pg_catalog.aclexplode(c.relacl) a
       WHERE c.oid = pg_catalog.to_regclass('public.config_purga')
         AND a.privilege_type <> ALL (v_verbos_ok)
         AND (a.grantee = 0 OR a.grantee <> c.relowner)
    ) t;

  IF v_acl_livre <> '' THEN
    RAISE EXCEPTION 'P46-CFG: a ACL de public.config_purga concede a alguem que NAO e o dono da tabela um verbo que nao esta na allowlist de tolerados (SELECT, REFERENCES, MAINTAIN — os que nao alteram CONTEUDO) [%]. Esta pergunta e EXAUSTIVA nos DOIS eixos: ela le a ACL e nao uma lista de papeis conhecidos, e ela reprova por ALLOWLIST de verbos e nao por lista de verbos proibidos — entao alcanca tanto o papel quanto o VERBO que nascerem depois desta migration. Foi por lista de proibidos que TRIGGER escapou desta familia (HI-R3-05): o REVOKE o executava, o COMMENT afirmava que ele estava revogado, e nada media. T-46-07-01 afirma que nenhum caminho de deploy altera o modo, e isso so e verdade enquanto salvar_config_purga (SECURITY DEFINER, owner postgres) for o unico caminho de escrita. Quem tiver o privilegio acima escreve o modo SEM deixar trilha e SEM poder RECUSAR',
      v_acl_livre;
  END IF;

  -- ── (i) privilegio de TABELA ───────────────────────────────────────────────
  -- ⚠ VARREDURA PELA FORMA, e nao pelo sintoma: o laco pergunta por cada
  --   combinacao de papel de aplicacao x verbo de escrita, em vez de conferir
  --   apenas o `UPDATE` que o achado nomeou. Um `INSERT` numa tabela SINGLETON
  --   parece inofensivo — ate lembrar que o `CHECK (id)` admite exatamente uma
  --   linha e que `DELETE` seguido de `INSERT` e um `UPDATE` com passos extras.
  --   ⚠ As duas listas sao ESCOPO DELIBERADO e nao fotografia: elas nao enumeram
  --   "os papeis que existem", enumeram **os papeis que o PostgREST expoe** e
  --   **os verbos que o `REVOKE` de `:123-124` executa** — `v_verbos` e a lista
  --   daquele `REVOKE`, verbo por verbo, e as duas mudam juntas. Um papel de
  --   aplicacao novo teria de ser acrescentado aqui — e ate la ele nao seria
  --   vigiado, que e a razao de a familia (i.a) existir: ela nao depende desta
  --   lista nem no eixo dos papeis nem no eixo dos verbos.
  --   ⚠ HI-R3-05 · `TRIGGER` faltava aqui e no `IN (…)` de (i.a), enquanto o
  --   `REVOKE` o executava e o `COMMENT ON TABLE` afirmava que ele estava
  --   revogado. Um `REVOKE` que nenhuma familia confere e uma linha de SQL com
  --   um `COMMENT` de garantia em cima.
  FOREACH v_papel IN ARRAY v_papeis LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname = v_papel) THEN
      FOREACH v_verbo IN ARRAY v_verbos LOOP
        IF pg_catalog.has_table_privilege(v_papel, 'public.config_purga', v_verbo) THEN
          v_achados := v_achados || CASE WHEN v_achados = '' THEN '' ELSE ', ' END
                                 || v_papel || ':' || v_verbo;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  IF v_achados <> '' THEN
    SELECT coalesce(c.relacl::text, '<default, sem ACL explicita>') INTO v_acl
      FROM pg_catalog.pg_class c WHERE c.oid = pg_catalog.to_regclass('public.config_purga');

    RAISE EXCEPTION 'P46-CFG: algum papel de aplicacao AINDA tem, em public.config_purga, um dos verbos que o REVOKE desta migration executa — INSERT, UPDATE, DELETE, TRUNCATE ou TRIGGER [%]. ACL medida: %. ⚠ RLS NAO ALCANCA service_role, que carrega BYPASSRLS no Supabase: para esse papel, "RLS ligada e zero policy de escrita" nao bloqueia coisa alguma, e so o privilegio de tabela bloquearia. Enquanto isto valer, T-46-07-01 ("nenhum caminho de deploy altera o modo") e uma afirmacao mais forte que a verificacao que a sustenta, e salvar_config_purga NAO e o unico caminho de escrita — ha um que nao deixa trilha e nao pode RECUSAR, as duas coisas que PURGA-04 exige na mesma respiracao',
      v_achados, v_acl;
  END IF;

  -- ── (ii) RLS ligada ────────────────────────────────────────────────────────
  SELECT c.relrowsecurity INTO v_rls_on
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'config_purga';

  IF NOT coalesce(v_rls_on, false) THEN
    RAISE EXCEPTION 'P46-CFG: RLS NAO esta ligada em public.config_purga. O REVOKE acima fecha o privilegio de TABELA, mas a RLS e a metade que responde por qualquer papel que venha a receber privilegio de novo — e as duas metades juntas sao o invariante. Uma so nunca foi suficiente: e literalmente o achado HI-04';
  END IF;

  -- ── (iii) zero policy de escrita, pela FORMA ───────────────────────────────
  SELECT count(*), coalesce(string_agg(p.policyname || ':' || p.cmd, ', '), '')
    INTO v_escrita_n, v_escrita
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public'
     AND p.tablename = 'config_purga'
     AND p.cmd <> 'SELECT';

  IF v_escrita_n > 0 THEN
    RAISE EXCEPTION 'P46-CFG: existe(m) % policy(ies) de ESCRITA em public.config_purga [%]. Ha um segundo caminho que altera o modo SEM deixar trilha e SEM poder RECUSAR',
      v_escrita_n, v_escrita;
  END IF;

  RAISE NOTICE 'P46-CFG: config_purga conferida do lado CERTO da porta — nenhum grantee que nao seja o dono carrega verbo fora da allowlist de tolerados (SELECT, REFERENCES, MAINTAIN), o que inclui INSERT, UPDATE, DELETE, TRUNCATE e TRIGGER zerados para anon, authenticated e service_role; RLS ligada; zero policy de escrita. salvar_config_purga (SECURITY DEFINER, owner postgres) segue sendo o unico caminho de escrita de aplicacao';
END $verifica_privilegio_config_purga$;


-- ⚠ O `COMMENT` da tabela e REESCRITO, e nao acrescentado, porque `COMMENT ON`
-- SUBSTITUI. O texto abaixo carrega o da `20260823000001:245-259` INTEGRALMENTE
-- — cada frase dele continua verdadeira — e troca apenas a ultima, que dizia
-- *"RLS ligada, UMA policy de SELECT admin-only, ZERO policy de escrita"*. Ela
-- estava certa e era INCOMPLETA, e e essa incompletude que HI-04 nomeia: quem
-- lesse o catalogo concluiria que a escrita estava fechada, quando os tres
-- papeis de aplicacao tinham `UPDATE` de tabela e `service_role` ignora RLS.
-- ⚠ Este e o lugar certo para a correcao: quem for investigar as tres da manha
-- le o catalogo, e nao o planning.
COMMENT ON TABLE public.config_purga IS
  'Phase 46 / 46-02 PURGA-04/05 (D-46-05/06/07/20): o CERCO OPERACIONAL da purga automatica, em UMA '
  'linha. A razao de existir, e nao a estrutura: PURGA-04 exige que o flip dry_run -> live seja '
  'checkpoint SEPARADO E EVIDENCIADO, nunca efeito colateral de um deploy, e PURGA-05 exige um kill '
  'switch SEM DEPLOY. Um secret de projeto muda sem deixar trilha e sem recusar nada; uma linha '
  'alterada por RPC deixa trilha atomica e PODE RECUSAR. Por isso o modo vive aqui e nao em env var. '
  'SINGLETON POR CONSTRUCAO: id boolean PRIMARY KEY DEFAULT true + CHECK (id) — a segunda linha e '
  'INEXPRIMIVEL, nao meramente improvavel. '
  'modo IN (off, dry_run, live): UM campo, TRES estados. O kill switch E o estado off; com um '
  'booleano separado existiria o estado contraditorio "live e inativo". '
  'cap_titulares (D-46-07/08): teto de blast-radius por execucao. Conjunto elegivel ACIMA do cap '
  'ABORTA a execucao inteira e grava veredito cap_excedido — NUNCA processa "ate o cap". '
  'janela_notificacoes_meses (D-46-20): escalar PROPRIO do RETEN-05, jamais derivado da matriz. '
  '⚠ A LINHA NASCE EM modo = off: a purga chega ao banco DESLIGADA, e liga-la e um ato separado, '
  'humano e auditado. '
  '⚠⚠ ESCRITA FECHADA EM TRES CAMADAS DESDE A 20260823000015 (HI-04 do 46-REVIEW-2), e as tres sao '
  'necessarias porque cada uma deixa passar o que a outra pega: '
  '(1) PRIVILEGIO DE TABELA — INSERT, UPDATE, DELETE, TRUNCATE e TRIGGER revogados nominalmente de '
  'PUBLIC, anon, authenticated e service_role, e os CINCO conferidos por medicao no mesmo apply. '
  'Esta e a UNICA camada que alcanca service_role, que carrega BYPASSRLS no Supabase e para quem RLS '
  'e policies nao bloqueiam nada. '
  '⚠ O QUE SOBREVIVE AO REVOKE, dito aqui para que o catalogo nao prometa mais do que executa: os '
  'tres papeis mantem SELECT (deliberado — authenticated precisa dele para a policy de leitura '
  'admin-only), REFERENCES (so permite apontar FK para esta tabela) e MAINTAIN (PG17; so permite '
  'VACUUM/ANALYZE/REINDEX/CLUSTER). Nenhum dos tres altera CONTEUDO, e sao exatamente eles a '
  'allowlist contra a qual a familia (i.a) do apply reprova: ela cobra qualquer verbo FORA dessa '
  'lista, e nao os quatro que alguem lembrou de escrever — foi por lista de proibidos que TRIGGER '
  'ficou revogado sem ser conferido ate o HI-R3-05 do 46-REVIEW-3; '
  '(2) RLS LIGADA; '
  '(3) ZERO POLICY DE ESCRITA, aferida pela FORMA (cmd <> SELECT) e nao por lista de nomes. '
  '⚠ O UNICO caminho de escrita de aplicacao e public.salvar_config_purga(text,integer,integer,'
  'boolean), SECURITY DEFINER com owner postgres — ela escreve com privilegio do DONO, que o REVOKE '
  'nao alcanca. E e ela, e nao a tabela, que carrega a trilha ATOMICA e a RECUSA server-side do '
  'flip: as duas coisas que PURGA-04 exige na mesma respiracao e que uma policy de UPDATE nao daria. '
  '⚠ O dono da tabela (postgres) continua escrevendo por definicao, e e sob ele que o '
  'p46_purga_smoke.sql roda — medido, nao presumido. '
  'SELECT permanece concedido: authenticated precisa dele para a policy de leitura admin-only.';
