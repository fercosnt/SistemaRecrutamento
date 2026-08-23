-- =============================================================================
-- Phase 46 / Plano 46-04 — ME-01 do `46-REVIEW.md`
-- `purga_execucoes.modo_vigente` ganha DOMINIO: a coluna que o guard destrutivo
-- le deixa de aceitar qualquer texto.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA: **esta migration acrescenta UMA constraint de
-- CHECK e nao faz mais nada** — zero funcao, zero policy, zero agendamento, zero
-- linha de dado, zero DDL alem da constraint nomeada abaixo.
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
-- ⚠⚠ ORDEM DE APPLY OBRIGATORIA DO PLANO 46-04: **`006 -> 008 -> 007 -> 009`**.
-- Esta e a ULTIMA porque e a unica que pode falhar por DADO em vez de por codigo:
-- se houver linha viva com um `modo_vigente` fora do vocabulario, o `ADD
-- CONSTRAINT` levanta 23514 e o apply para. Isso e desejado — seria a descoberta
-- de que alguem ja escreveu um valor que o guard nao reconhece. Medicao de
-- 2026-08-22: `public.purga_execucoes` tem **2** linhas, ambas de execucoes com
-- `modo_vigente = 'off'`.
-- =============================================================================


ALTER TABLE public.purga_execucoes
  ADD CONSTRAINT ck_purga_execucoes_modo
  CHECK (modo_vigente IN ('off', 'dry_run', 'live', 'ausente'));


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
