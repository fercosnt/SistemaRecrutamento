-- =============================================================================
-- Phase 47 / Plano 47-03 Task 2 — CONSENT-05
-- A coluna de autorização de análise de vídeo para de FABRICAR uma afirmação:
-- o `DEFAULT` sai, a obrigatoriedade sai, e nulo volta a significar
-- "essa pergunta não foi feita".
-- =============================================================================
--
-- Requirement:          CONSENT-05 (.planning/REQUIREMENTS.md:56, :197, :256)
-- Decisão de origem:    operador, 2026-08-09 — simetria NÃO-DESTRUTIVA do CONSOL-03
-- Origem do achado:     .planning/todos/pending/43-analise-video-default-false-fabrica-afirmacao.md
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 47-03, Task 2
--
-- -----------------------------------------------------------------------------
-- (0) O FATO MEDIDO, E POR QUE ELE É UM DEFEITO E NÃO UM DETALHE
-- -----------------------------------------------------------------------------
-- Estado vivo da coluna antes desta migration:
--
--     autorizacao_analise_video   NOT NULL   DEFAULT false
--
-- Distribuição medida em 2026-08-02, no checkpoint 43-07, sobre 17 linhas:
--   · com NULL:  **0**
--   · com false: 14
--   · com true:   3
--
-- O módulo que escreve autorizações — `supabase/functions/_shared/autorizacoes-registro.ts`
-- — está CORRETO e faz exatamente o que o BD-2 manda: **nunca emite esta chave**. O
-- docblock dele diz por quê, em voz alta: emitir `false` também estaria errado,
-- porque `false` é uma AFIRMAÇÃO sobre uma pergunta que deixou de ser feita. O
-- contrato de entrada da Edge Function é `.strict()`: um cliente que ainda mande a
-- chave recebe 400 VALIDATION em vez de tê-la descartada em silêncio.
--
-- Mas o `DEFAULT false` da COLUNA reintroduz o defeito UMA CAMADA ABAIXO: o Postgres
-- preenche `false` sozinho e a linha passa a afirmar que o titular respondeu "não" a
-- uma pergunta que o formulário não faz desde a Phase 43. **O código se absteve; o
-- banco respondeu por ele.**
--
-- CONSEQUÊNCIA MEDÍVEL, que é o requirement inteiro: com **zero** nulos,
-- *"respondeu não"* e *"nunca foi perguntado"* são INDISTINGUÍVEIS nesta coluna —
-- ontem e daqui pra frente. É a ausência exata do discriminador que o CONSENT-05
-- existe para criar. A partir do apply desta migration o discriminador passa a
-- existir: **nulo significa que a pergunta não foi feita**.
--
-- É a mesma classe de defeito que o cabeçalho da `20260801000001` condena por três
-- parágrafos a respeito de `policy_version NOT NULL DEFAULT 'v1.0-2026-04'`
-- (`20260421000001:190`) — um `DEFAULT` que faz toda linha afirmar retroativamente
-- algo que ninguém declarou, de forma inauditável. A Phase 43 tomou o cuidado de
-- fazer suas QUATRO colunas novas nullable-e-sem-`DEFAULT` exatamente por isso, e
-- esta coluna pré-existente continuava fazendo o oposto ao lado delas.
--
-- -----------------------------------------------------------------------------
-- (1) ESCOPO NEGATIVO — o que esta migration NÃO faz, e por quê
-- -----------------------------------------------------------------------------
-- · **A coluna PERMANECE.** A `20260801000001` deferiu a eventual remoção a esta
--   fase "onde já existe portão destrutivo previsto". Esse portão DEIXOU DE EXISTIR:
--   a decisão do operador em 2026-08-09 tornou a Phase 47 inteiramente aditiva
--   (CONSOL-03 → adotar). A resolução do CONSENT-05 é a simetria dessa disciplina —
--   remover o `DEFAULT` e a obrigatoriedade, nunca o registro histórico.
--
-- · **ZERO back-fill.** Nenhuma linha existente é reescrita. Converter os 14 `false`
--   em nulo apagaria a prova de que a pergunta um dia FOI feita — e a Phase 43
--   inteira se apoia no princípio inverso: a ausência é o registro honesto, jamais
--   uma reescrita retroativa. Os valores históricos são registro de tratamento de
--   dados.
--
-- · Nenhuma policy é tocada. As 3 policies vivas de `public.autorizacoes` (que vivem
--   em PROD e em nenhum arquivo de migration — a 4ª instância do drift documentado
--   pela Phase 43) permanecem como estão, e a asserção (e) do
--   `p43_consent_prova_smoke.sql` continua contando exatamente 3.
--
-- -----------------------------------------------------------------------------
-- (2) CUSTO ACEITO E DECLARADO — o tipo gerado muda e não pode ser regenerado hoje
-- -----------------------------------------------------------------------------
-- Depois do apply, `autorizacoes.autorizacao_analise_video` passa de `boolean` para
-- `boolean | null` em `database.types.ts:370`. Esse arquivo é GERADO pelo Supabase
-- CLI e **não é regenerável neste ambiente** (sem `SUPABASE_ACCESS_TOKEN`, sem CLI no
-- PATH — 47-RESEARCH §Environment). Editá-lo à mão é proibido pela CLAUDE.md.
--
-- A auditoria de risco foi feita AQUI, no plano, e não deixada para o `tsc` de
-- alguém depois: varredura repo-wide de `autorizacao_analise_video` em `src/` e
-- `supabase/functions/` encontrou **zero** leitura do VALOR da coluna. Todas as
-- ocorrências são (i) o nome da coluna em listas de allowlist/recibo geradas,
-- (ii) docblocks explicando que a chave não é emitida, e (iii) testes que provam a
-- rejeição da chave. Nenhum consumidor desreferencia o booleano.
-- O registro completo da varredura está em `47-03-SUMMARY.md`.
--
-- -----------------------------------------------------------------------------
-- (3) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- O plano 47-03 apenas AUTORA este arquivo.
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`**: o driver já envolve cada migration na sua
-- própria transação implícita, e o BEGIN/COMMIT externo é o gatilho documentado do
-- SQLSTATE 42601 quando há corpo delimitado por cifrões adjacente a
-- `COMMENT`/`GRANT`/`REVOKE` — CLAUDE.md §Migrations + db push.
--
-- ⚠ Higiene deste arquivo: o corpo de verificação usa delimitador NOMEADO
-- (`verifica_p47_consent05`) e o par de cifrões anônimo não aparece literalmente.
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER. `apply_migration` carimba a PRÓPRIA `version`.
-- Reconciliar logo depois:
--
--   supabase migration repair --status applied 20260809000003
--
-- ou, direto no ledger:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260809000003'
--    WHERE name LIKE '%p47_consent05_analise_video%';
--
-- ⚠ FIDELIDADE DO CONTEÚDO — conferir após o apply:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260809000003';
--
-- ⚠ ORDEM DE APPLY: depois de `20260809000002` (a adoção do CONSOL-03). As duas são
-- independentes em objeto, mas o `p47_consol03_consent05_smoke.sql` prova as duas
-- numa única execução e assume a ordem numérica.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- (4) A MUTAÇÃO — duas cláusulas, nada mais
-- -----------------------------------------------------------------------------
-- Ambas são reversíveis por uma migration inversa e nenhum valor existente é
-- tocado. O que muda é o que o banco escreve nas linhas FUTURAS quando o código
-- deliberadamente se abstém: nada, que é a resposta honesta.
-- -----------------------------------------------------------------------------
ALTER TABLE public.autorizacoes
  ALTER COLUMN autorizacao_analise_video DROP DEFAULT,
  ALTER COLUMN autorizacao_analise_video DROP NOT NULL;


-- -----------------------------------------------------------------------------
-- (5) O COMENTÁRIO DE CATÁLOGO — o registro da Phase 43 PRESERVADO, o da Phase 47
--     ACRESCENTADO, e a regra final mantida VERBATIM
-- -----------------------------------------------------------------------------
-- O texto vivo termina com uma instrução operacional ("não alimentar esta coluna em
-- código novo, nem com false") que continua valendo palavra por palavra depois desta
-- mudança — ela é preservada como última frase, no lugar em que estava. O que sai é
-- apenas a frase que deferia a remoção a esta fase, porque essa deferência foi
-- RESOLVIDA aqui, e no sentido oposto.
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN public.autorizacoes.autorizacao_analise_video IS
  'Phase 43 / BD-2 / CONSENT-05: A COLETA PAROU. O sistema nao faz analise de video, e '
  'pedir permissao para algo que nao se faz e promessa orfa. O campo saiu do formulario, '
  'da copy e do contrato de entrada da EF (autorizacoesSchema, que e .strict(): um '
  'cliente que ainda envie a chave recebe 400 VALIDATION em vez de te-la descartada em '
  'silencio). A COLUNA PERMANECE, com os valores historicos INTACTOS: apagar o registro '
  'de que a pergunta foi feita seria apagar historico de tratamento de dados. '
  'Phase 47 / CONSENT-05 RESOLVIDO, 2026-08-09: a coluna era NOT NULL DEFAULT false, e '
  'esse DEFAULT reintroduzia o defeito UMA CAMADA ABAIXO do codigo — a EF se abstinha e '
  'o BANCO respondia por ela, fazendo cada linha nova AFIRMAR um "nao" a uma pergunta '
  'que ninguem faz desde a Phase 43. Medido em 2026-08-02 sobre 17 linhas: ZERO nulos, '
  '14 false, 3 true, ou seja "respondeu nao" e "nunca foi perguntado" eram '
  'INDISTINGUIVEIS. O DEFAULT e a obrigatoriedade foram removidos e A PARTIR DAQUI NULO '
  'SIGNIFICA QUE A PERGUNTA NAO FOI FEITA, distinguivel de uma resposta negativa. '
  'NENHUM back-fill foi feito: os false historicos ficam como estao e NAO devem ser '
  'lidos como resposta a uma pergunta atual. A resolucao e NAO-DESTRUTIVA por decisao '
  'do operador — a Phase 47 e inteiramente aditiva e nao tem portao destrutivo, ao '
  'contrario do que este comentario previa quando foi escrito. '
  'NAO alimentar esta coluna em codigo novo — nem com false, que tambem e uma afirmacao '
  'sobre uma pergunta que deixou de ser feita.';


-- -----------------------------------------------------------------------------
-- (6) AUTO-VERIFICAÇÃO POR CATÁLOGO — quatro asserções
-- -----------------------------------------------------------------------------
-- As asserções (a) e (d) parecem redundantes com a mutação, mas não são: a asserção
-- (c) do `p43_consent_prova_smoke.sql` exige que esta coluna CONTINUE existindo e
-- CONTINUE comentada, e mantê-la verde é parte do contrato desta mudança. Provar
-- isso aqui, no apply, é o que impede a regressão de aparecer só na próxima vez que
-- alguém rodar o smoke da Phase 43.
-- -----------------------------------------------------------------------------
DO $verifica_p47_consent05$
DECLARE
  v_attnum   smallint;
  v_notnull  boolean;
  v_hasdef   boolean;
  v_comment  text;
BEGIN
  -- (a) A COLUNA EXISTE. A resolução do CONSENT-05 é não-destrutiva: se a coluna
  --     sumiu, alguém trocou a correção pela remoção do registro histórico.
  SELECT a.attnum, a.attnotnull, a.atthasdef
    INTO v_attnum, v_notnull, v_hasdef
    FROM pg_attribute a
   WHERE a.attrelid = 'public.autorizacoes'::regclass
     AND a.attname  = 'autorizacao_analise_video'
     AND a.attnum   > 0
     AND NOT a.attisdropped;

  IF v_attnum IS NULL THEN
    RAISE EXCEPTION 'P47-CONSENT05 FAIL (a): autorizacoes.autorizacao_analise_video DESAPARECEU. A resolucao decidida em 2026-08-09 e NAO-DESTRUTIVA: remover o DEFAULT e a obrigatoriedade, jamais o registro historico. Os 14 false e os 3 true medidos em 2026-08-02 sao prova de tratamento de dados, e a assercao (c) do p43_consent_prova_smoke depende desta coluna existir';
  END IF;

  -- (b) O `DEFAULT` SUMIU. É a asserção central do requirement: enquanto o default
  --     existir, o banco continua respondendo no lugar de um código que se absteve.
  IF v_hasdef IS TRUE THEN
    RAISE EXCEPTION 'P47-CONSENT05 FAIL (b): a coluna AINDA tem valor padrao. Enquanto ele existir, toda linha nova continua AFIRMANDO uma resposta a uma pergunta que o formulario nao faz desde a Phase 43 — o codigo se abstem e o banco responde por ele';
  END IF;

  -- (c) A COLUNA ACEITA NULO. É o discriminador que o CONSENT-05 existe para criar.
  IF v_notnull IS TRUE THEN
    RAISE EXCEPTION 'P47-CONSENT05 FAIL (c): a coluna continua obrigatoria. Sem aceitar nulo nao existe representacao para "nunca foi perguntado", e ela permanece indistinguivel de "respondeu nao" — que e exatamente o defeito medido em 2026-08-02 (zero nulos em 17 linhas)';
  END IF;

  -- (d) O COMENTÁRIO CONTINUA NÃO-VAZIO (dependência direta da asserção (c) da P43).
  v_comment := col_description('public.autorizacoes'::regclass, v_attnum);

  IF v_comment IS NULL OR length(btrim(v_comment)) = 0 THEN
    RAISE EXCEPTION 'P47-CONSENT05 FAIL (d): a coluna ficou SEM comentario de catalogo. Uma coluna que nao e mais alimentada e cujo motivo nao esta escrito vira candidata a remocao acidental na proxima fase que olhar para ela — e a assercao (c) do p43_consent_prova_smoke reprova alto por isso';
  END IF;

  RAISE NOTICE 'P47-CONSENT05 OK: a coluna existe, perdeu o valor padrao, aceita nulo e continua comentada (% chars). A partir daqui, nulo significa que a pergunta nao foi feita', length(v_comment);
END
$verifica_p47_consent05$;
