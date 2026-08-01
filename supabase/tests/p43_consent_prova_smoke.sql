-- =============================================================================
-- Phase 43 / Plan 43-01 Task 3 — ESPEC EXECUTÁVEL das colunas de prova do
-- consentimento e da separação do marketing (CONSENT-01/02/03/05 · BD-2 · BD-5)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Escrito junto com a migration `20260801000001` e deliberadamente RED antes do
-- apply: as quatro colunas ainda não existem. Ele descreve o que a migration tem
-- de produzir — e, tão importante quanto, o que ela NÃO PODE ter tocado.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se o apply
-- divergir deste arquivo, **corrige-se o apply**. Alterar o smoke para caber no
-- que aconteceu é ESCALAR o problema, não resolvê-lo — é exatamente o movimento
-- que transforma um gate em decoração.
--
-- COMO RODAR
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** —
-- nunca pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug
-- upstream anthropics/claude-code#13898). A chamada única é obrigatória por motivo
-- mecânico: `set_config(..., false)` é escopado à SESSÃO, então statements
-- espalhados por chamadas separadas zerariam o contador `smoke43c.pass` e o RESUMO
-- (z) reprovaria um run que na verdade passou (lição registrada da P41-05).
--
-- GATE VERDE = o contador `smoke43c.pass` bate **6** no RESUMO (z). O gate NÃO é
-- "não levantou exceção": um run parcial (asserção pulada por erro de ambiente)
-- acumularia < 6 e o RESUMO reprova ALTO. Esperado FIXO — não há metade adaptativa.
--
-- ⚠ ESTE SMOKE É SOMENTE-LEITURA. Zero INSERT, zero UPDATE, zero DELETE. É a
-- diferença deste smoke para o `p42_notif_revisao_smoke.sql`, que prova um CHECK
-- por inserção: aqui o objeto sob prova é a AUSÊNCIA de escrita (nenhum back-fill,
-- nenhuma linha apagada, nenhuma policy alterada), e um smoke que escrevesse não
-- poderia provar isso sobre si mesmo.
--
-- ⚠ ANTES DE RODAR: preencher `smoke43c.esperado_linhas` logo abaixo com o número
-- transcrito em `>>> antes: linhas=` do cabeçalho da migration. A asserção (f) é o
-- que separa "as colunas foram adicionadas" de "as colunas foram adicionadas e
-- nenhuma linha sumiu no caminho".
--
-- -----------------------------------------------------------------------------
-- AS 6 ASSERÇÕES
-- -----------------------------------------------------------------------------
--   (a) As 4 colunas novas existem, TODAS nullable, e **NENHUMA tem DEFAULT** —
--       consultando `pg_attrdef` além de `information_schema`. A ausência do
--       default é a asserção que protege o SC#1: com `NOT NULL DEFAULT` toda linha
--       histórica passaria a AFIRMAR uma versão/hash que ninguém leu, e a mentira
--       seria inauditável (foi o que `policy_version` fez em 20260421000001:190).
--   (b) **ZERO BACK-FILL** — contagem de linhas com cada uma das 4 colunas
--       NÃO-NULA é 0. Prova por dado que o apply não preencheu nada.
--   (c) `autorizacao_analise_video` continua existindo e tem `COMMENT` não vazio
--       (BD-2: a coleta parou, a coluna e os valores históricos permanecem).
--   (d) `autorizacao_comunicacao` continua existindo e tem `COMMENT` não vazio
--       (CONSENT-03: significado estreitado ao canal transacional, Art. 7º, V).
--   (e) **NEGATIVA** — `pg_policies` sobre `public.autorizacoes` devolve
--       EXATAMENTE 3 linhas, RLS ligada, e existe EXATAMENTE UMA policy de comando
--       `UPDATE` com `qual` E `with_check` preenchidos. As 3 vivem em PROD e em
--       NENHUM arquivo de migration (4ª instância do drift); esta asserção prova
--       que o apply não as tocou.
--   (f) **NEGATIVA** — nenhuma linha de `autorizacoes` foi apagada: a contagem
--       total bate a transcrita em `>>> antes:` pelo orquestrador.
--   (z) RESUMO — exige o total de 6 PASS; run parcial falha AQUI, não em silêncio.
--
-- -----------------------------------------------------------------------------
-- ESCOPO DA PROVA — o que ela cobre e o que ela NÃO cobre
-- -----------------------------------------------------------------------------
-- COBRE: a forma das colunas tal como o CATÁLOGO a impõe, a ausência de back-fill
-- medida por dado, a preservação das duas colunas de significado alterado, e a
-- não-regressão das 3 policies vivas.
--
-- NÃO COBRE: a gravação REAL do hash por um cadastro ao vivo — isso exige a EF
-- deployada e é passo do checkpoint 43-07. Também NÃO cobre a aritmética do hash,
-- que vive no corpus Deno (`consent-hash.test.ts`, com o hex do arquivo vivo
-- PINADO). As duas metades juntas são o CONSENT-02 inteiro.
--
-- HIGIENE: `RESET ROLE` em toda troca de papel e ao final; NOTICEs carregam apenas
-- contagens e nomes de objeto — NUNCA PII (nome, e-mail, IP) e nunca hash de linha.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke43c.pass', '0', false);

-- ⚠ PREENCHER com o `>>> antes: linhas=` do cabeçalho da migration.
-- 17 é a medição do operador em 2026-08-01 (21 candidatos vivos, 4 sem linha
-- nenhuma — BD-4). Se o apply ocorrer noutra data, transcrever o valor medido.
SELECT set_config('smoke43c.esperado_linhas', '17', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) AS 4 COLUNAS: existem, nullable, e SEM DEFAULT.
--
--     `information_schema.columns` sozinho NÃO basta: ele reporta
--     `column_default`, mas a fonte da verdade é `pg_attrdef`, e é ela que a
--     migration usa na sua própria auto-verificação. Consultamos AS DUAS e
--     exigimos concordância — se divergirem, algo muito estranho aconteceu e é
--     melhor falhar alto do que escolher uma.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_col      text;
  v_cols     text[] := ARRAY[
    'consent_text_version', 'consent_text_hash',
    'consent_registrado_em', 'autorizacao_marketing_vagas'
  ];
  v_existe   boolean;
  v_notnull  boolean;
  v_defcat   boolean;   -- pg_attrdef
  v_definfo  text;      -- information_schema
BEGIN
  FOREACH v_col IN ARRAY v_cols LOOP
    SELECT true, a.attnotnull, (d.adbin IS NOT NULL)
      INTO v_existe, v_notnull, v_defcat
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE a.attrelid = 'public.autorizacoes'::regclass
       AND a.attname  = v_col
       AND a.attnum   > 0
       AND NOT a.attisdropped;

    IF v_existe IS NOT TRUE THEN
      RAISE EXCEPTION 'P43C FAIL (a): a coluna % NAO existe em public.autorizacoes — a migration 20260801000001 nao foi aplicada, ou foi aplicada parcialmente', v_col;
    END IF;

    IF v_notnull THEN
      RAISE EXCEPTION 'P43C FAIL (a): % e NOT NULL — as 17 linhas historicas foram forcadas a afirmar um valor que ninguem gravou', v_col;
    END IF;

    IF v_defcat THEN
      RAISE EXCEPTION 'P43C FAIL (a): % tem DEFAULT em pg_attrdef. E exatamente o erro que policy_version cometeu em 20260421000001:190: toda linha anterior passa a AFIRMAR retroativamente um valor que o titular nunca leu, e o NULL deixa de discriminar pre de pos-enforcement (SC#1 destruido)', v_col;
    END IF;

    SELECT c.column_default INTO v_definfo
      FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = 'autorizacoes'
       AND c.column_name = v_col;

    IF v_definfo IS NOT NULL THEN
      RAISE EXCEPTION 'P43C FAIL (a): information_schema reporta default % para % enquanto pg_attrdef nao — as duas visoes do catalogo divergem', v_definfo, v_col;
    END IF;
  END LOOP;

  PERFORM set_config('smoke43c.pass', (coalesce(nullif(current_setting('smoke43c.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): as 4 colunas existem, todas nullable, nenhuma com DEFAULT (pg_attrdef e information_schema concordam)';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) ZERO BACK-FILL — prova POR DADO, não por leitura de DDL.
--
--     A asserção (a) prova que não há DEFAULT. Esta prova que ninguém rodou um
--     UPDATE depois. São coisas diferentes: um `UPDATE ... SET
--     autorizacao_marketing_vagas = autorizacao_comunicacao` passaria por (a) em
--     verde e teria reconstruido consentimento por INFERENCIA (BD-5).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_versao  int;
  v_hash    int;
  v_em      int;
  v_mkt     int;
BEGIN
  SELECT
    count(*) FILTER (WHERE consent_text_version       IS NOT NULL),
    count(*) FILTER (WHERE consent_text_hash          IS NOT NULL),
    count(*) FILTER (WHERE consent_registrado_em      IS NOT NULL),
    count(*) FILTER (WHERE autorizacao_marketing_vagas IS NOT NULL)
    INTO v_versao, v_hash, v_em, v_mkt
    FROM public.autorizacoes;

  IF v_versao <> 0 OR v_hash <> 0 OR v_em <> 0 THEN
    RAISE EXCEPTION 'P43C FAIL (b): % linha(s) com consent_text_version, % com consent_text_hash e % com consent_registrado_em ja preenchidas — o apply BACK-FILLOU prova de consentimento. Essas linhas agora AFIRMAM que o titular leu um texto que ele nunca viu, e nao ha como distingui-las de linhas legitimas', v_versao, v_hash, v_em;
  END IF;

  IF v_mkt <> 0 THEN
    RAISE EXCEPTION 'P43C FAIL (b): % linha(s) com autorizacao_marketing_vagas preenchida — BD-5 violado. NULL significa NUNCA FOI PERGUNTADO DESTA FORMA; herdar de autorizacao_comunicacao reconstroi consentimento por inferencia, que e o defeito que esta fase existe para eliminar', v_mkt;
  END IF;

  PERFORM set_config('smoke43c.pass', (coalesce(nullif(current_setting('smoke43c.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): zero back-fill — as 4 colunas estao NULL em 100%% das linhas historicas';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) `autorizacao_analise_video` INTACTA e COMENTADA (BD-2).
--
--     A coleta parou; a coluna fica. Se ela sumir, alguem transformou esta fase
--     em destrutiva sem passar por portao nenhum — e os valores historicos, que
--     sao registro de tratamento de dados, teriam ido junto.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_existe  boolean;
  v_comment text;
BEGIN
  SELECT true, col_description(a.attrelid, a.attnum)
    INTO v_existe, v_comment
    FROM pg_attribute a
   WHERE a.attrelid = 'public.autorizacoes'::regclass
     AND a.attname  = 'autorizacao_analise_video'
     AND a.attnum   > 0
     AND NOT a.attisdropped;

  IF v_existe IS NOT TRUE THEN
    RAISE EXCEPTION 'P43C FAIL (c): autorizacao_analise_video DESAPARECEU. A Phase 43 e zero-destrutiva por desenho (BD-2): o DROP e decisao da Phase 47, sob portao destrutivo. Os valores historicos eram registro de tratamento de dados';
  END IF;

  IF v_comment IS NULL OR length(btrim(v_comment)) = 0 THEN
    RAISE EXCEPTION 'P43C FAIL (c): autorizacao_analise_video existe mas esta SEM COMMENT. Uma coluna que nao e mais alimentada e cujo motivo nao esta escrito no catalogo vira candidata a DROP acidental na proxima fase que olhar para ela';
  END IF;

  PERFORM set_config('smoke43c.pass', (coalesce(nullif(current_setting('smoke43c.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): autorizacao_analise_video intacta e comentada (% chars)', length(v_comment);
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) `autorizacao_comunicacao` INTACTA e COMENTADA (CONSENT-03).
--
--     Mudanca de SIGNIFICADO sem mudanca de FORMA e invisivel em diff de schema.
--     O COMMENT e o unico lugar onde ela viaja junto com a coluna.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_existe  boolean;
  v_comment text;
BEGIN
  SELECT true, col_description(a.attrelid, a.attnum)
    INTO v_existe, v_comment
    FROM pg_attribute a
   WHERE a.attrelid = 'public.autorizacoes'::regclass
     AND a.attname  = 'autorizacao_comunicacao'
     AND a.attnum   > 0
     AND NOT a.attisdropped;

  IF v_existe IS NOT TRUE THEN
    RAISE EXCEPTION 'P43C FAIL (d): autorizacao_comunicacao DESAPARECEU — esta fase nao dropa coluna nenhuma';
  END IF;

  IF v_comment IS NULL OR length(btrim(v_comment)) = 0 THEN
    RAISE EXCEPTION 'P43C FAIL (d): autorizacao_comunicacao esta SEM COMMENT. Sem ele, os valores historicos desta coluna continuam legiveis como consentimento de MARKETING — que e exatamente a inferencia que o BD-5 proibe';
  END IF;

  PERFORM set_config('smoke43c.pass', (coalesce(nullif(current_setting('smoke43c.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): autorizacao_comunicacao intacta e comentada (% chars)', length(v_comment);
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) NEGATIVA — AS 3 POLICIES VIVAS INTACTAS, RLS LIGADA, 1 UPDATE COM with_check.
--
--     Esta asserção existe porque as 3 policies de public.autorizacoes vivem em
--     PROD e em NENHUM arquivo de migration (4ª instância do drift, medida em
--     2026-08-01). Um `apply_migration` que "aproveitasse" para reconstruí-las de
--     memória substituiria um `with_check` REAL por um palpite — e o with_check da
--     policy de UPDATE é o que impede o candidato de reapontar a própria linha de
--     autorizações para outro candidato_id (a base do CONSENT-04, plano 43-05).
--
--     A migration 20260801000001 declara escopo negativo sobre policies. Isto
--     verifica a declaração em vez de acreditar nela.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_total    int;
  v_updates  int;
  v_rls      boolean;
  v_qual     text;
  v_check    text;
  v_nomes    text;
BEGIN
  SELECT count(*), string_agg(policyname || ' [' || cmd || ']', ' | ' ORDER BY policyname)
    INTO v_total, v_nomes
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'autorizacoes';

  IF v_total <> 3 THEN
    RAISE EXCEPTION 'P43C FAIL (e): esperava 3 policies em public.autorizacoes, achei % — %. O apply desta migration NAO podia tocar policy alguma; as 3 vivem em PROD e em nenhum arquivo de migration, entao uma perda aqui e irrecuperavel a partir do repositorio', v_total, coalesce(v_nomes, '<nenhuma>');
  END IF;

  SELECT relrowsecurity INTO v_rls
    FROM pg_class WHERE oid = 'public.autorizacoes'::regclass;
  IF NOT v_rls THEN
    RAISE EXCEPTION 'P43C FAIL (e): RLS DESLIGADA em public.autorizacoes — a tabela de prova de consentimento ficou legivel por qualquer papel';
  END IF;

  SELECT count(*) INTO v_updates
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'autorizacoes' AND cmd = 'UPDATE';
  IF v_updates <> 1 THEN
    RAISE EXCEPTION 'P43C FAIL (e): esperava EXATAMENTE 1 policy de UPDATE, achei % — a revogacao own-row do CONSENT-04 depende dela', v_updates;
  END IF;

  SELECT qual, with_check INTO v_qual, v_check
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'autorizacoes' AND cmd = 'UPDATE';

  IF v_qual IS NULL OR length(btrim(v_qual)) = 0 THEN
    RAISE EXCEPTION 'P43C FAIL (e): a policy de UPDATE perdeu o USING (qual) — o candidato passaria a poder atualizar linha de outra pessoa';
  END IF;
  IF v_check IS NULL OR length(btrim(v_check)) = 0 THEN
    RAISE EXCEPTION 'P43C FAIL (e): a policy de UPDATE perdeu o WITH CHECK — o candidato poderia REAPONTAR a propria linha de autorizacoes para outro candidato_id. USING sem WITH CHECK protege a leitura da linha e deixa a escrita aberta';
  END IF;

  PERFORM set_config('smoke43c.pass', (coalesce(nullif(current_setting('smoke43c.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (e): 3 policies intactas, RLS ligada, 1 UPDATE com qual E with_check — %', v_nomes;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) NEGATIVA — NENHUMA LINHA APAGADA.
--
--     A migration e ADITIVA PURA. Se a contagem divergir do `>>> antes:`, algo
--     alem do ALTER TABLE rodou — e numa tabela de prova probatoria uma linha
--     perdida e um consentimento que deixa de ser demonstravel.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_agora    int;
  v_esperado int := coalesce(nullif(current_setting('smoke43c.esperado_linhas', true), ''), '-1')::int;
BEGIN
  SELECT count(*) INTO v_agora FROM public.autorizacoes;

  IF v_esperado < 0 THEN
    RAISE EXCEPTION 'P43C FAIL (f): smoke43c.esperado_linhas nao foi preenchido. Transcrever o valor de ">>> antes: linhas=" do cabecalho da migration ANTES de rodar — sem ele esta assercao nao prova nada, e um smoke que nao prova nada e pior que smoke nenhum';
  END IF;

  IF v_agora <> v_esperado THEN
    RAISE EXCEPTION 'P43C FAIL (f): public.autorizacoes tem % linhas, esperado % (">>> antes:"). A migration e aditiva pura — nenhuma linha podia entrar nem sair no apply', v_agora, v_esperado;
  END IF;

  PERFORM set_config('smoke43c.pass', (coalesce(nullif(current_setting('smoke43c.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (f): % linhas em public.autorizacoes, identico ao ">>> antes:" — nada foi apagado', v_agora;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO. Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_n int; v_esperado int := 6;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke43c.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P43C FAIL (z): RESUMO % PASS de % esperadas — run parcial; NAO tratar como verde', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'RESUMO: % assercoes PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $$;

RESET ROLE;
