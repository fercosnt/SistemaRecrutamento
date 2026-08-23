-- =============================================================================
-- Phase 46 / Plano 46-04 — ME-01 e RD2-01 do `46-REVIEW.md`
-- DOIS dominios do ledger: `purga_execucoes.modo_vigente` deixa de aceitar
-- qualquer texto (ME-01), e os tres desfechos ganham `desconhecido` (RD2-01).
-- ⚠ O NOME DO ARQUIVO ficou estreito — ele nasceu so com o `modo_vigente` e a
-- rodada 2 do review acrescentou os desfechos. Renomea-lo depois de o md5 do
-- arquivo ja ter sido conferido criaria divergencia com o ledger de migrations
-- por ganho zero; o cabecalho e que manda.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA: **esta migration mexe em QUATRO constraints de
-- CHECK e nao faz mais nada** — zero funcao, zero policy, zero agendamento, zero
-- linha de dado, zero DDL alem das constraints nomeadas abaixo. Nenhuma delas
-- ESTREITA um dominio: uma e nova sobre coluna sem CHECK, tres sao alargamentos.
--
-- -----------------------------------------------------------------------------
-- (0) POR QUE ELA EXISTE
-- -----------------------------------------------------------------------------
-- `20260823000002_p46_ledger.sql:138` declarou `modo_vigente text NOT NULL`, sem
-- dominio. Aquilo era defensavel enquanto a coluna era descritiva. Deixou de ser
-- no 46-04: `20260823000006` passa a DECIDIR DESTRUICAO IRREVERSIVEL sobre
-- `e.modo_vigente = 'live'`.
--
-- ⚠ NAO HA ESCALACAO CONHECIDA, e dizer isso e parte da honestidade do registro: a
-- comparacao no guard e por IGUALDADE LITERAL com `'live'`, e o par com
-- `config_purga.modo` e CUMULATIVO — um valor inesperado na coluna nao autoriza
-- nada, apenas deixa de autorizar. O que esta constraint fecha nao e um buraco
-- aberto; e uma **superficie sem contrato**: uma coluna que participa da decisao
-- de apagar PII de forma irreversivel e que aceita qualquer string e um convite a
-- que a proxima pessoa escreva `'LIVE'`, `'live '` ou `'producao'` e descubra o
-- efeito em producao. O custo de fechar e uma linha; o de nao fechar e um bug de
-- digitacao com consequencia irreversivel.
--
-- ⚠ O VOCABULARIO INCLUI `'ausente'`, QUE NAO E UM MODO — e a inclusao e
-- deliberada, nao descuido. `20260823000007` grava `modo_vigente = 'ausente'` no
-- ramo fail-closed em que `public.config_purga` esta VAZIA: ali ninguem sabe sob
-- que regime a execucao deveria rodar, e o cabecalho registra exatamente isso.
-- Omitir `'ausente'` do CHECK faria o ramo de fail-closed ABORTAR com 23514 — o
-- portao impedindo o comportamento seguro, que e a forma de defeito que este
-- projeto ja catalogou cinco vezes nesta fase.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE pelo ORQUESTRADOR, pela via da Management API com o SQL
-- lido do arquivo (CLAUDE.md §"Via de apply ATUAL"). **Nao ha reparo de `version`
-- a fazer** — por aquela via ela nasce correta.
--
-- Sem par de transacao explicita no topo (CLAUDE.md §Migrations).
--
-- Conferencia obrigatoria, os dois lados registrados:
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260823000009';
--   -- comparar com:  printf '%s' "$(cat supabase/migrations/20260823000009_*.sql)" | md5
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIENCIA
-- -----------------------------------------------------------------------------
--   · A FORMA vem de `20260823000002:148-152`, que ja declara `ck_purga_execucoes_veredito`
--     e `ck_purga_execucoes_situacao` no mesmo estilo: constraint NOMEADA
--     explicitamente, com o vocabulario fechado por extenso.
--   · O VOCABULARIO vem de medicao, nao de suposicao: os tres modos de D-46-06
--     (`off`, `dry_run`, `live`), lidos do `CHECK` de `public.config_purga` em
--     `20260823000001`, mais `'ausente'` de `20260823000007`.
--
-- -----------------------------------------------------------------------------
-- (3) ORDEM DE ENTREGA
-- -----------------------------------------------------------------------------
-- ⚠⚠ ORDEM DE APPLY OBRIGATORIA DO PLANO 46-04: **`006 -> 008 -> 009 -> 007`**.
--
-- ⚠ ESTA MIGRATION VEM ANTES DA `007`, E A DEPENDENCIA E REAL, NAO ESTETICA: a
-- reconciliacao de `007` (RD2-01) ESCREVE `desfecho_* = 'desconhecido'`, e esse
-- valor so passa a ser aceito pelos `CHECK` depois da secao 2 deste arquivo.
-- Aplicar `007` antes faria a primeira reconciliacao abortar com 23514. Na rodada
-- 1 do review esta migration vinha por ULTIMO; a rodada 2 inverteu a ordem, e a
-- razao esta escrita aqui para que a inversao nao pareca arbitraria.
--
-- ⚠ E ELA CONTINUA SENDO A UNICA QUE PODE FALHAR POR DADO, mas so pela secao 1:
-- se houver linha viva com `modo_vigente` fora do vocabulario, o `ADD CONSTRAINT`
-- levanta 23514 e o apply para. Isso e DESEJADO — seria a descoberta de que alguem
-- escreveu a mao um valor que o guard nao reconhece. Medicao de 2026-08-22:
-- `public.purga_execucoes` tem **2** linhas, ambas com `modo_vigente = 'off'`.
-- A secao 2 nao pode falhar por dado: alargar um CHECK aceita tudo o que o antigo
-- aceitava.
-- =============================================================================


ALTER TABLE public.purga_execucoes
  ADD CONSTRAINT ck_purga_execucoes_modo
  CHECK (modo_vigente IN ('off', 'dry_run', 'live', 'ausente'));


-- ---------------------------------------------------------------------------
-- 2 · RD2-01 · `desconhecido` entra no vocabulario dos TRES desfechos
-- ---------------------------------------------------------------------------
-- ⚠⚠ ESTE ACRESCIMO EXISTE PARA QUE O LEDGER POSSA DIZER "EU NAO SEI", e a falta
-- dessa palavra e o que forcava a reconciliacao a MENTIR.
--
-- O vocabulario original (`20260823000002:289-297`) tem quatro valores e os quatro
-- sao AFIRMACOES: `pendente` (ainda vou tentar), `ok` (fiz), `falha` (tentei e nao
-- consegui), `nao_aplicavel` (nao havia o que fazer). Quando a Edge Function morre
-- no meio, o estado de Storage e de Auth nao e nenhum dos quatro: eles podem ter
-- acontecido, e o Postgres **nao tem como saber** — a SONDA 2 mediu que
-- `storage.objects` nao tem FK para `auth.users`, e o Auth vive fora do banco.
-- Sem `desconhecido`, a reconciliacao teria de escolher entre `falha` (afirmar que
-- nao aconteceu) e `nao_aplicavel` (afirmar que nao havia o que fazer) — as duas
-- sao asserções sobre um fato que ninguem observou, num registro de cumprimento de
-- obrigacao legal com retencao INDEFINIDA (D-46-16) e sem PITR para desmentir.
--
-- ⚠ UM CAMPO QUE DIZ "NAO SEI" E ESTRITAMENTE MAIS HONESTO QUE UM CAMPO QUE
-- AFIRMA ERRADO, e esta migration existe so para tornar essa frase exprimivel.
--
-- ⚠ ALARGAR UM `CHECK` NUNCA FALHA POR DADO: todo valor que satisfazia o antigo
-- satisfaz o novo. O `DROP` + `ADD` e a unica forma de emendar um CHECK no
-- Postgres, e a ordem aqui e irrelevante porque nenhuma linha viva usa o valor
-- novo ainda.
ALTER TABLE public.purga_execucao_itens
  DROP CONSTRAINT ck_purga_itens_desfecho_storage,
  ADD  CONSTRAINT ck_purga_itens_desfecho_storage
       CHECK (desfecho_storage IN ('pendente','ok','falha','nao_aplicavel','desconhecido'));

ALTER TABLE public.purga_execucao_itens
  DROP CONSTRAINT ck_purga_itens_desfecho_postgres,
  ADD  CONSTRAINT ck_purga_itens_desfecho_postgres
       CHECK (desfecho_postgres IN ('pendente','ok','falha','nao_aplicavel','desconhecido'));

ALTER TABLE public.purga_execucao_itens
  DROP CONSTRAINT ck_purga_itens_desfecho_auth,
  ADD  CONSTRAINT ck_purga_itens_desfecho_auth
       CHECK (desfecho_auth IN ('pendente','ok','falha','nao_aplicavel','desconhecido'));

COMMENT ON CONSTRAINT ck_purga_itens_desfecho_postgres ON public.purga_execucao_itens IS
  'Phase 46 / 46-04 (RD2-01 do 46-REVIEW): vocabulario FECHADO dos desfechos, alargado com '
  'desconhecido. Os quatro valores originais sao AFIRMACOES; desconhecido e a AUSENCIA de '
  'afirmacao, e ele existe porque a reconciliacao de execucoes vencidas precisa registrar o estado '
  'de Storage e Auth de um titular cuja Edge Function morreu no meio — e o Postgres NAO TEM COMO '
  'SABER se aqueles dois passos aconteceram (a SONDA 2 mediu que storage.objects nao tem FK para '
  'auth.users, e o Auth vive fora do banco). ⚠ O de POSTGRES e diferente e por isso e INFERIDO, '
  'nunca marcado desconhecido: o tombstone e UMA transacao, entao ou a sentinela do CR-06 esta na '
  'linha de candidatos (aconteceu -> ok) ou nao esta (nao aconteceu -> falha). Inferir do proprio '
  'banco e melhor que presumir, e presumir num registro de cumprimento de obrigacao legal com '
  'retencao indefinida (D-46-16), sem PITR para desmentir, e o pior dos dois erros.';


COMMENT ON CONSTRAINT ck_purga_execucoes_modo ON public.purga_execucoes IS
  'Phase 46 / 46-04 (ME-01 do 46-REVIEW): dominio fechado de modo_vigente. A coluna deixou de ser '
  'descritiva no 46-04: o 4o ramo do guard de public.anonimizar_candidato (migration 20260823000006) '
  'DECIDE DESTRUICAO IRREVERSIVEL sobre modo_vigente = live. Nao ha escalacao conhecida — a '
  'comparacao e por igualdade literal e o par com config_purga.modo e cumulativo, entao um valor '
  'inesperado deixa de autorizar em vez de autorizar a mais. O que este CHECK fecha e uma SUPERFICIE '
  'SEM CONTRATO: uma coluna que participa da decisao de apagar PII e aceita qualquer string convida a '
  'que alguem escreva LIVE ou live-com-espaco e descubra o efeito em producao. '
  '⚠ ausente NAO E UM MODO e esta no vocabulario DE PROPOSITO: 20260823000007 o grava no ramo '
  'fail-closed em que config_purga esta VAZIA, onde ninguem sabe sob que regime a execucao deveria '
  'rodar. Omiti-lo faria o ramo SEGURO abortar com 23514 — o portao impedindo o comportamento certo.';
