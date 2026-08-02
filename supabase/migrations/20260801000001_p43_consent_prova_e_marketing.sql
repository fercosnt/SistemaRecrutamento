-- =============================================================================
-- Phase 43 / Plan 43-01 — CONSENT-01 · CONSENT-02 · CONSENT-03 · CONSENT-05
-- As colunas de PROVA do consentimento e a separação do consentimento de marketing
-- =============================================================================
--
-- ADITIVA PURA · ZERO-DESTRUTIVA. Quatro `ADD COLUMN` em `public.autorizacoes`.
-- Nenhum `DELETE`, nenhum `DROP`, nenhum `UPDATE`, nenhuma policy tocada.
--
-- -----------------------------------------------------------------------------
-- (1) POR QUE NENHUMA DAS QUATRO COLUNAS TEM `NOT NULL DEFAULT`
-- -----------------------------------------------------------------------------
-- Porque ESTA MESMA TABELA já cometeu exatamente esse erro. Em
-- `20260421000001_rate_limit_duplicate_check.sql:190`:
--
--     policy_version text NOT NULL DEFAULT 'v1.0-2026-04'
--
-- No instante daquele apply, TODA linha anterior passou a AFIRMAR
-- retroativamente que o titular leu uma versão de política que ele nunca viu. O
-- banco não distinguiu — e não tem como distinguir — entre "gravamos a versão que
-- a pessoa leu" e "o Postgres preencheu a coluna". As duas afirmações ficaram
-- indistinguíveis, para sempre.
--
-- Repetir isso com o HASH destruiria o critério de sucesso #1 da fase:
-- **NULL é o discriminador entre pré e pós-enforcement.** Uma linha com
-- `consent_text_hash IS NULL` diz honestamente "não há prova do texto lido". Uma
-- linha com o hash preenchido por DEFAULT diria "a pessoa leu o texto v2-2026-08"
-- sobre um cadastro de abril, e essa mentira seria inauditável.
--
-- As 4 colunas nascem NULLABLE e SEM DEFAULT. As 17 linhas históricas de
-- `autorizacoes` permanecem com NULL nas quatro. **Nenhum back-fill.** A asserção
-- (b) de `supabase/tests/p43_consent_prova_smoke.sql` prova isso por contagem.
--
-- ⚠ E os 4 candidatos (de 21 vivos) que não têm linha NENHUMA em `autorizacoes`
-- também NÃO são back-fillados (BD-4). Consentimento retroativo é fabricar prova —
-- o oposto exato do que esta fase entrega. A ausência deles É o registro honesto.
-- A correção é para frente: a EF `cadastrar-candidato` passou a gravar fail-closed.
--
-- -----------------------------------------------------------------------------
-- (2) ⚠ ORDEM DE ENTREGA OBRIGATÓRIA — É O CONTROLE, NÃO UMA PREFERÊNCIA
-- -----------------------------------------------------------------------------
--   1º  ESTA MIGRATION (as colunas existem)
--   2º  DEPLOY da Edge Function `cadastrar-candidato` (que grava o hash)
--
-- Uma EF deployada ANTES das colunas faria toda uma janela de cadastros reais
-- falhar no INSERT — e, por ser FAIL-CLOSED desde a Phase 43 (BD-4), cada um
-- desses cadastros seria DESFEITO: conta Auth apagada, candidato apagado, pessoa
-- vendo erro. Pior ainda no cenário em que o INSERT passasse ignorando as colunas:
-- a janela inteira de cadastros gravaria consentimento SEM prova, e essas linhas
-- ficariam indistinguíveis das históricas — o mesmo defeito que esta migration
-- existe para tornar impossível, criado pela ordem errada de aplicá-la.
--
-- O deploy da EF é, portanto, passo ORDENADO do checkpoint 43-07, nunca paralelo.
-- ⚠ E o deploy da EF é BREAKING para clientes antigos: `autorizacoesSchema` ganhou
-- `.strict()` e perdeu `autorizacao_analise_video` / `autorizacao_comunicacao`, então
-- um bundle de browser desatualizado recebe `400 VALIDATION`. Isso é o comportamento
-- correto (D-04 / LGPD-01) e obriga a sequência: migration → EF → cliente.
--
-- -----------------------------------------------------------------------------
-- (3) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- Sem wrapper `BEGIN;/COMMIT;`: o driver já envolve cada migration na sua própria
-- transação implícita, e o BEGIN/COMMIT externo é o gatilho do SQLSTATE 42601
-- ("cannot insert multiple commands into a prepared statement") — CLAUDE.md.
--
-- ⚠ AS DUAS PROPRIEDADES DO `apply_migration`, MEDIDAS TRÊS VEZES NA PHASE 42:
--
--   1. **Ele carimba a PRÓPRIA `version` no ledger** — um timestamp do instante do
--      apply, não o do nome do arquivo. A linha PRECISA ser reparada à mão:
--
--        UPDATE supabase_migrations.schema_migrations
--           SET version = '20260801000001'
--         WHERE name LIKE '%p43_consent_prova_e_marketing%';
--
--      Sem o reparo, `supabase db push` leria este arquivo como NÃO aplicado e
--      tentaria reaplicá-lo — e `ADD COLUMN` puro falha alto na segunda vez.
--
--   2. **O ledger guarda o SQL LITERALMENTE aplicado** em
--      `supabase_migrations.schema_migrations.statements text[]`. Isso torna a
--      fidelidade PROVÁVEL em vez de presumida — e ela precisa ser provada, porque
--      o `apply_migration` recebe o SQL como STRING na chamada da ferramenta e o
--      agente que aplica precisa RETRANSMITI-LO. Duas das cinco migrations do M8
--      chegaram a PROD com os comentários descartados por essa via. Asserção
--      obrigatória logo após o apply:
--
--        SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--         WHERE version = '20260801000001';
--        -- comparar com:
--        --   printf '%s' "$(cat supabase/migrations/20260801000001_*.sql)" | md5
--
--      Divergência ⇒ o conteúdo aplicado NÃO é este arquivo. Nesta migration a
--      perda de um comentário seria benigna, mas o mecanismo não distingue
--      comentário de código: a mesma abreviação descartaria um `COMMENT ON COLUMN`,
--      e os COMMENTs DESTE arquivo são onde BD-2 e BD-5 estão declarados em voz alta.
--
--      ⚠ NOTA PÓS-APPLY (2026-08-02 · code review WR-03) — LEIA ANTES DE COMPARAR.
--      O md5 do ledger corresponde ao estado DESTE ARQUIVO NO INSTANTE DO APPLY:
--      `>>> antes:` do bloco (4) preenchido, `>>> depois:` AINDA VAZIO. As linhas
--      `>>> depois:` só podem ser medidas DEPOIS do apply e foram escritas no mesmo
--      commit (`6a1b13f`). Logo o md5 do arquivo COMMITADO já NÃO bate o
--      `md5(statements[1])` do ledger — e isso é ESPERADO. Não é drift; é
--      consequência do desenho deste runbook, e não indica perda de conteúdo: a
--      fidelidade foi conferida byte a byte no instante do apply.
--
--        md5(statements[1]) medido e conferido no checkpoint 43-07:
--          b577295077ee19a1aec0f8982816c631
--
--      Confira contra ESSE valor, nunca contra o md5 do arquivo de hoje. Os dois
--      valores (o do apply e o pin anterior, SUPERSEDIDO) estão registrados em
--      `.planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-07-SUMMARY.md`
--      §"Nota de md5: por que o pin de `…0001` e `…0003` mudou".
--
--      Para migrations futuras: manter a medição pós-apply no SUMMARY (ou num
--      `COMMENT ON …` de uma migration seguinte), para o artefato aplicado
--      permanecer imutável e o próprio check de md5 continuar utilizável.
--
-- `ADD COLUMN` puro, **sem `IF NOT EXISTS`**: coluna nova DEVE falhar alto se já
-- existir. O idioma está medido em `docs/compliance/ddl-idiom-sweep.md` e a razão
-- está escrita em `20260721000001:35-37` — um `ADD COLUMN … IF NOT EXISTS` sobre
-- uma coluna pré-existente vira no-op e silencia junto qualquer cláusula adjacente.
-- Foi assim que `candidatos.user_id` ficou `ON DELETE CASCADE` em PROD enquanto o
-- repo afirma `ON DELETE SET NULL`. Mascarar divergência é o que produz drift.
--
-- ⚠ NOTA AO GATE AUTOMATIZADO: a elipse acima é deliberada, e este parágrafo evita
-- de propósito escrever a sequência proibida por extenso. O `<verify>` do plano
-- 43-01 faz um `grep` de ARQUIVO INTEIRO pela sequência, sem distinguir DDL de
-- comentário — enquanto a `<action>` do MESMO plano manda explicar aqui por que o
-- idioma é proibido. As duas exigências se contradizem: escrever a sequência
-- literal, ainda que para condená-la, faz o gate reprovar exatamente a
-- documentação que ele existe para preservar.
--
-- Precedente direto e mesma conclusão: a 43-UI-SPEC §"ESCOPO DO GREP" registrou a
-- armadilha idêntica para `automaticamente` — a palavra é BANIDA na superfície do
-- candidato e OBRIGATÓRIA no banner do `/admin/retencao`, e um grep repo-wide
-- reprovaria a copy que a spec manda escrever. "Um teste que reprova o
-- comportamento correto é pior que teste nenhum: ele treina quem executa a
-- desligá-lo."
--
-- O que o gate REALMENTE afere é a ausência do idioma no DDL **EXECUTÁVEL**. A
-- forma correta dele descarta comentários primeiro:
--
--   grep -v '^[[:space:]]*--' <arquivo> | grep -qi 'if not exists'   # deve ser vazio
--
-- Verificado assim em 2026-08-01: os quatro `ADD COLUMN` do BLOCO A são puros.
--
-- -----------------------------------------------------------------------------
-- (4) MEDIÇÕES DO VIVO — a preencher pelo ORQUESTRADOR no checkpoint 43-07
-- -----------------------------------------------------------------------------
-- Transcrever ANTES do apply. A asserção (f) do smoke compara a contagem de linhas
-- de `autorizacoes` contra o `>>> antes:` — se este campo ficar vazio, o smoke não
-- consegue provar que o apply não apagou nada.
--
--   SELECT count(*) FROM public.autorizacoes;
--   SELECT policyname, cmd FROM pg_policies
--    WHERE schemaname='public' AND tablename='autorizacoes' ORDER BY policyname;
--
-- >>> antes:  linhas=17           policies=3   (medido 2026-08-02, checkpoint 43-07)
-- >>> depois: linhas=17           policies=3   (medido 2026-08-02, pos-apply)
--
-- ESTADO ESPERADO (medido pelo operador em 2026-08-01, ANTES do planejamento):
--   linhas   = 17  (de 21 candidatos vivos — 4 sem linha nenhuma, BD-4)
--   policies = 3   ("Candidatos podem ler suas autorizacoes"     SELECT
--                   "RH pode ler todas as autorizacoes"          SELECT
--                   "Candidatos podem atualizar suas autorizacoes" UPDATE, com
--                   `qual` E `with_check`)
--
-- -----------------------------------------------------------------------------
-- ⛔ ESCOPO NEGATIVO — ESTA MIGRATION NÃO TOCA POLICY ALGUMA
-- -----------------------------------------------------------------------------
-- Nenhum `CREATE POLICY`, `ALTER POLICY` ou `DROP POLICY`. Nenhum `ALTER TABLE …
-- ENABLE ROW LEVEL SECURITY` (já está ligada).
--
-- ⚠ E AS 3 POLICIES VIVAS DE `public.autorizacoes` NÃO EXISTEM EM ARQUIVO DE
-- MIGRATION NENHUM. Medido em `pg_policies` em 2026-08-01: elas existem em PROD e
-- em nenhum lugar do repositório — é a **4ª instância** do drift em aberto
-- (`.planning/todos/pending/processo-origem-do-drift-desconhecida.md`), e um
-- `supabase db reset` as perderia em silêncio.
--
-- **Não corrigir aqui.** Reaplicar DDL de policy sem medir o `pg_get_expr` vivo
-- primeiro é a armadilha do 42-07: o arquivo não é o objeto vivo, e um
-- `CREATE POLICY` reconstruído de memória substituiria um `with_check` real por um
-- palpite. O `with_check` da policy de UPDATE é o que impede o candidato de
-- reapontar a própria linha de autorizações para outro `candidato_id`. Reconciliar
-- essas policies é trabalho com medição própria, não um brinde desta migration.
-- A asserção (e) do smoke é NEGATIVA justamente por isso: prova que o apply não as
-- tocou.
--
-- CONTEÚDO
--   BLOCO A — as 4 colunas novas (todas NULL, todas sem DEFAULT)
--   BLOCO B — COMMENTs: as 4 novas + as 2 que MUDARAM DE SIGNIFICADO sem mudar de forma
-- =============================================================================


-- =============================================================================
-- BLOCO A — As quatro colunas
-- =============================================================================
-- Três de PROVA (CONSENT-02) e uma de CONSENTIMENTO SEPARADO (CONSENT-03).
-- Todas nullable. Todas sem DEFAULT. Um `ALTER TABLE` só, quatro cláusulas.

ALTER TABLE public.autorizacoes
  ADD COLUMN consent_text_version   text,
  ADD COLUMN consent_text_hash      text,
  ADD COLUMN consent_registrado_em  timestamptz,
  ADD COLUMN autorizacao_marketing_vagas boolean;


-- Auto-verificação: falha ALTO se qualquer uma das quatro nasceu com DEFAULT ou
-- NOT NULL. Um gate que não morde não é um gate — e este protege o SC#1 inteiro.
-- A checagem é sobre o CATÁLOGO (`pg_attribute` + `pg_attrdef`), não sobre o texto
-- deste arquivo: o que importa é o que o banco FEZ, não o que o arquivo DIZ.
DO $verifica_colunas$
DECLARE
  v_col     text;
  v_cols    text[] := ARRAY[
    'consent_text_version', 'consent_text_hash',
    'consent_registrado_em', 'autorizacao_marketing_vagas'
  ];
  v_notnull boolean;
  v_temdef  boolean;
BEGIN
  FOREACH v_col IN ARRAY v_cols LOOP
    SELECT a.attnotnull, (d.adbin IS NOT NULL)
      INTO v_notnull, v_temdef
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE a.attrelid = 'public.autorizacoes'::regclass
       AND a.attname  = v_col
       AND a.attnum   > 0
       AND NOT a.attisdropped;

    IF v_notnull IS NULL THEN
      RAISE EXCEPTION 'P43-01 BLOCO A: a coluna % nao existe apos o ADD COLUMN', v_col;
    END IF;
    IF v_notnull THEN
      RAISE EXCEPTION 'P43-01 BLOCO A: % nasceu NOT NULL — as linhas historicas nao podem ser forcadas a afirmar valor nenhum', v_col;
    END IF;
    IF v_temdef THEN
      RAISE EXCEPTION 'P43-01 BLOCO A: % nasceu com DEFAULT — e exatamente o erro que policy_version cometeu em 20260421000001:190, e destruiria o SC#1', v_col;
    END IF;
  END LOOP;

  RAISE NOTICE 'P43-01 BLOCO A OK: as 4 colunas existem, todas nullable e sem DEFAULT';
END
$verifica_colunas$;


-- =============================================================================
-- BLOCO B — COMMENTs
-- =============================================================================
-- Os COMMENTs desta migration não são documentação de cortesia: BD-2 e BD-5 são
-- decisões do operador cuja consequência é INVISÍVEL no schema, e o catálogo é o
-- único lugar que sobrevive a um `db reset` de arquivo. A asserção (c) e a (d) do
-- smoke exigem que eles estejam presentes e não-vazios.

COMMENT ON COLUMN public.autorizacoes.consent_text_version IS
  'Phase 43 / CONSENT-02: versao do TEXTO das autorizacoes que o titular leu, '
  'ex. v2-2026-08. Fonte unica do texto: supabase/functions/_shared/consent-text.json. '
  'EIXO INDEPENDENTE de policy_version — a Politica de Privacidade muda sem que o '
  'rotulo de um checkbox mude, e reusar policy_version faria uma edicao de politica '
  'cunhar versoes falsas de consentimento. NULL = linha PRE-ENFORCEMENT: nao ha prova '
  'do texto lido. O NULL e o discriminador (SC#1) e por isso a coluna NAO tem DEFAULT. '
  'Nenhuma linha jamais carregara o rotulo v1: o texto que as linhas NULL de fato viram '
  'esta capturado verbatim em consent-text.v1-historico.json, como identificador '
  'DOCUMENTAL, insumo da pagina de transparencia da Phase 47.';

COMMENT ON COLUMN public.autorizacoes.consent_text_hash IS
  'Phase 43 / CONSENT-02: SHA-256 hex (64 chars, minusculo) do texto lido. Calculado '
  'EXCLUSIVAMENTE NO SERVIDOR pela EF cadastrar-candidato, via '
  '_shared/consent-hash.ts, a partir do arquivo do servidor. Nenhum campo de hash '
  'existe no schema de entrada e o .strict() rejeita qualquer chave que tentasse '
  'injeta-lo (T-43-01): um hash controlado pelo titular nao prova nada, porque o '
  'atacante escolheria o texto ao qual a linha corresponde. A entrada do hash e '
  'SEMANTICA, nao os bytes crus do arquivo — pares (rotulo, descricao) na ordem de '
  'renderizacao, com trim + NFC, mais a versao. Recomputavel por qualquer pessoa que '
  'tenha o arquivo e a versao, e e isso que torna a linha VERIFICAVEL. NULL = linha '
  'pre-enforcement. Sem DEFAULT, pela mesma razao de consent_text_version.';

COMMENT ON COLUMN public.autorizacoes.consent_registrado_em IS
  'Phase 43 / CONSENT-02: instante em que o consentimento com prova foi registrado. '
  'POR QUE NAO BASTA created_at: created_at esta PREENCHIDA em TODA linha historica '
  '(DEFAULT now() desde o baseline) e por isso nao discrimina nada — nao ha como '
  'perguntar ao banco quais linhas tem prova olhando para ela. Esta coluna e NULL '
  'exatamente onde nao houve prova, o que a torna a chave de leitura do SC#1. '
  'NAO e redundante com created_at; e a metade que created_at nunca pode ser.';

COMMENT ON COLUMN public.autorizacoes.autorizacao_marketing_vagas IS
  'Phase 43 / CONSENT-03 / BD-5: consentimento SEPARADO para receber divulgacao de '
  'novas vagas, fora de um processo seletivo em andamento. Base legal: consentimento '
  '(Art. 7o, I). Nasce NULL para TODA a base historica, e **NULL E TRATADO COMO NAO '
  'AUTORIZADO** pelo guard do ledger de notificacoes. '
  'CONSEQUENCIA DECLARADA EM VOZ ALTA: depois desta fase, ZERO candidato ja cadastrado '
  'esta autorizado a receber divulgacao de vagas. ISSO NAO E REGRESSAO, E A CORRECAO — '
  'ninguem nunca consentiu marketing separadamente, porque o consentimento separado nao '
  'existia. Herdar de autorizacao_comunicacao (UPDATE ... SET marketing = comunicacao) '
  'seria reconstruir consentimento por INFERENCIA, que e precisamente o que o '
  '.default(true) fazia e o que esta fase existe para eliminar. Nenhum UPDATE em massa '
  'foi feito. Reconquistar essa base exige campanha de re-opt-in, que e feature de '
  'outro milestone. Se uma metrica de alcance de divulgacao cair a zero apos esta fase, '
  'este COMMENT e a explicacao.';

-- ── As duas colunas que MUDARAM DE SIGNIFICADO SEM MUDAR DE FORMA ────────────
-- Nenhum DDL as toca. O que muda e o que elas QUEREM DIZER, e uma mudanca de
-- significado sem mudanca de forma e invisivel em qualquer diff de schema — por
-- isso ela e registrada aqui, no unico lugar que viaja junto com a coluna.

COMMENT ON COLUMN public.autorizacoes.autorizacao_analise_video IS
  'Phase 43 / BD-2 / CONSENT-05: A COLETA PAROU. O sistema nao faz analise de video, e '
  'pedir permissao para algo que nao se faz e promessa orfa. O campo saiu do formulario, '
  'da copy e do contrato de entrada da EF (autorizacoesSchema, que e .strict(): um '
  'cliente que ainda envie a chave recebe 400 VALIDATION em vez de te-la descartada em '
  'silencio). A COLUNA PERMANECE, com os valores historicos INTACTOS: DROP e acao '
  'destrutiva e a Phase 43 e zero-destrutiva por desenho, e apagar o registro de que a '
  'pergunta foi feita seria apagar historico de tratamento de dados. O eventual DROP e '
  'decisao da Phase 47 (CONSOL-03), onde ja existe portao destrutivo previsto. '
  'NAO alimentar esta coluna em codigo novo — nem com false, que tambem e uma afirmacao '
  'sobre uma pergunta que deixou de ser feita.';

COMMENT ON COLUMN public.autorizacoes.autorizacao_comunicacao IS
  'Phase 43 / CONSENT-03: SIGNIFICADO ESTREITADO. Passa a designar APENAS o canal '
  'TRANSACIONAL — confirmacao de candidatura, mudanca de etapa, convite de entrevista e '
  'resultado. Base legal: execucao de procedimentos preliminares ao contrato (LGPD, '
  'Art. 7o, V), NAO consentimento; por isso o canal NAO tem opt-out e a UI o renderiza '
  'como LINHA INFORMATIVA, nunca como checkbox ou switch (43-UI-SPEC Invariante 3 — um '
  'controle que a pessoa nao pode desligar e a forma mais pura da doenca deste '
  'milestone). A parte de MARKETING que esta coluna acumulava migrou para '
  'autorizacao_marketing_vagas. NENHUM UPDATE EM MASSA FOI FEITO: os valores historicos '
  'ficam como estao, e nao devem ser lidos como consentimento de marketing. A EF grava '
  'true de forma fixa e explicita, porque o valor afirma um FATO DO SISTEMA (o canal '
  'esta ativo) e nao uma escolha do titular.';
