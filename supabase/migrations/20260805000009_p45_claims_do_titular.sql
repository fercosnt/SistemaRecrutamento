-- =============================================================================
-- Phase 45 / Plano 45-12 — ERASE-02 / ERASE-03 / ERASE-05 / ERASE-06 / ERASE-10
-- A metade ACL do conserto do `DI-45-10-01`: `GRANT EXECUTE ... TO authenticated`
-- nas CINCO funcoes que o titular alcanca pela Edge Function
-- `executar-direito-titular`.
-- =============================================================================
--
-- Requirement:          ERASE-02, ERASE-03, ERASE-05, ERASE-06, ERASE-10
-- Decisao de origem:    decisao do operador de 2026-08-05 (a EF passa a repassar as
--                       claims do titular) + `DI-45-10-01` (o escopo real do
--                       conserto: client + GRANT + redeploy, indivisiveis)
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 45-12, Task 3a
--
-- -----------------------------------------------------------------------------
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA
-- -----------------------------------------------------------------------------
-- **ESTA MIGRATION NAO CRIA, NAO ALTERA E NAO APAGA DADO NENHUM.** Ela nao tem
-- `INSERT`, `UPDATE`, `DELETE`, `CREATE TABLE` nem `CREATE FUNCTION`. O corpo
-- inteiro e ACL — `REVOKE` nominal e `GRANT EXECUTE` — mais um bloco anonimo de
-- auto-verificacao que so LE o catalogo.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes GSD
-- nao recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- O plano 45-12 AUTORA e **aplica ZERO**; quem aplica e o **45-11**.
--
-- ⚠ **SEM WRAPPER `BEGIN;`/`COMMIT;` NO TOPO, E A OMISSAO E DELIBERADA.** O driver
-- do Supabase CLI ja envolve cada migration na transacao implicita dele, e o
-- BEGIN/COMMIT externo e o gatilho do `42601` ("cannot insert multiple commands into
-- a prepared statement") no transaction pooler — CLAUDE.md § "Migrations + db push",
-- estabelecido nas migrations 03 e 04 da Phase 4. Este arquivo tem um corpo
-- delimitado por cifroes NOMEADOS cercado de `REVOKE`/`GRANT`, que e exatamente a
-- combinacao que o pooler recusa. Se `apply_migration` reprovar, o caminho e o
-- workaround do CLAUDE.md (SQL Editor + `migration repair --status applied`) — nunca
-- reescrever o bloco para caber no transporte.
--
-- ⚠ REPARO OBRIGATORIO DO LEDGER, logo apos o apply (o mesmo comando e RAISE NOTICE
-- pelo bloco de auto-verificacao abaixo, para que ele exista tambem dentro do SQL
-- que o ledger guarda, e nao so num comentario):
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260805000009'
--    WHERE name LIKE '%p45_claims_do_titular%';
--
-- -----------------------------------------------------------------------------
-- (a) POR QUE UM `GRANT` A `authenticated` E A OUTRA METADE DO CONSERTO
-- -----------------------------------------------------------------------------
-- A Edge Function `executar-direito-titular` chamava as RPCs desta fase com um client
-- de service-role **sem repassar o header `Authorization` do titular**. O JWT que
-- chegava ao PostgREST era a propria service key, que nao tem claim `sub` — logo
-- `auth.uid()` devolvia **NULL**, e as cinco funcoes abrem recusando exatamente isso
-- com `42501`. Efeito medido: o passo 0 do motor falha em `rpc_plano` com
-- `causa='falha_postgres'` e zero mutacao. Desfecho seguro, motor parado.
--
-- O conserto e um TERCEIRO client, com service key **e** o `Authorization` do
-- titular. ⚠ E aqui esta o detalhe que o `DI-45-07-01` nao previa e que traz esta
-- migration a existencia: **o PostgREST deriva o PAPEL do MESMO JWT que carrega as
-- claims**. Um client assim chega como `authenticated`, nao como `service_role` — o
-- `GRANT` a `service_role` que as cinco tem hoje deixa de alcancar a chamada. Este
-- `GRANT` nao e uma concessao A MAIS: e a outra metade do mesmo conserto, sem a qual
-- o terceiro client produz `42501` por um motivo diferente.
--
-- -----------------------------------------------------------------------------
-- (b) O CONTROLE E O GUARD DO CORPO — E O QUE TORNA ESTE `GRANT` DEFENSAVEL SOBRE
--     `anonimizar_candidato` E O GUARD DE **INTENCAO** (CR-01, plano 45-13)
-- -----------------------------------------------------------------------------
-- As cinco sao `SECURITY DEFINER` e DEFINER bypassa RLS: o guard do corpo e o unico
-- controle. ⚠ **ESTE BLOCO AFIRMAVA QUE O GUARD ERA "O MESMO ANTES E DEPOIS DESTA
-- MIGRATION". ISSO DEIXOU DE SER VERDADE — E, PIOR, DEIXOU DE SER O ARGUMENTO CERTO.**
--
-- O `45-REVIEW.md` (2026-08-11) mediu o **CR-01** contra a linha 144 deste arquivo: o
-- `GRANT` sobre `anonimizar_candidato` torna o tombstone chamavel direto por PostgREST,
-- e o guard de entao verificava apenas **identidade** — nunca **intencao**. Ele nao
-- sabia se existia pedido, se a janela do D-45-01 tinha vencido, nem se o passo 1 do
-- Storage tinha carimbado. Dois cenarios alcancaveis do console do navegador: o titular
-- se apagando fora da janela do ERASE-06, sem recibo e deixando o proprio curriculo
-- orfao no bucket; e o `rh` destruindo a PII de qualquer candidato com uma chamada.
--
-- **O que torna este `GRANT` defensavel a partir do 45-13** (migration
-- `20260805000006`, corpo de `anonimizar_candidato`):
--   · metade (a) — recusa `42501` o chamador SEM claim nenhuma. **NAO foi tocada.**
--   · metade (b) — recusa por PAPEL, e agora em DUAS formas: LEITURA (`p_dry_run =
--     true`) aceita `rh`, `administrador` ou o dono; DESTRUTIVO aceita apenas
--     `administrador` ou o dono. Um recrutador perde o caminho destrutivo e mantem o
--     dry-run (opcao B do checkpoint do 45-13, decisao do operador de 2026-08-11).
--   · metade (c) — **GUARD DE INTENCAO**, so no caminho destrutivo: exige pedido de
--     exclusao em `situacao = 'executando'`, `executar_em` vencido e
--     `storage_concluido_em` carimbado. E o que impede que este `GRANT` seja uma porta
--     direta por PostgREST, e e onde a ordem `Storage -> Postgres -> Auth` passa a ser
--     imposta pelo BANCO — a SONDA 2 mediu que a plataforma NAO a impoe.
-- Tudo por `IS DISTINCT FROM`, nunca por `NOT IN`, que avalia NULL, nao toma o `IF` e
-- falha ABERTO para `anon`.
--
-- ⚠ **O QUE ESTE `GRANT` CONTINUA NAO FECHANDO, dito sem eufemismo:** a primitiva
-- segue CHAMAVEL por `authenticated`; ela apenas passa a RECUSAR quase sempre. Isso e
-- mais fraco que nao estar exposta. A saida de retirar o `GRANT` foi avaliada e
-- RECUSADA no checkpoint do 45-13 porque, sob `service_role`, `auth.uid()` nao existe e
-- a metade (a) teria de aceitar NULL — a saida recusada pelo operador em 2026-08-05.
--
-- ⚠ **E A (c) TRANSFERE CONFIANCA PARA `solicitacoes_dados`**: quem escrever `situacao`
-- e `storage_concluido_em` ali autoriza o tombstone. O pressuposto nao ficou em prosa —
-- o bloco de auto-verificacao da `20260805000006` pergunta ao CATALOGO se
-- `authenticated` pode escrever naquela tabela e **aborta o apply** se puder.
--
-- O precedente e a **Phase 44**: as RPCs de la sao concedidas a `authenticated` com
-- exatamente essa divisao de responsabilidade — ACL abre a porta ao papel, o guard do
-- corpo decide quem passa. A asercao **C2** do smoke prova as DEZ recusas, e ela
-- **continua sem uma linha editada**: o `uuid` que ela usa e sintetico e inexistente, e
-- a chamada dela a `anonimizar_candidato` e de **dry-run**, entao nem a forma
-- destrutiva da metade (b) nem a metade (c) mudam o desfecho dela. Se a C2 precisasse
-- de edicao, o guard estaria sendo AFROUXADO em vez de estendido, e isso e condicao de
-- PARADA.
--
-- -----------------------------------------------------------------------------
-- (c) A SAIDA RECUSADA, E POR QUE ELA E PIOR
-- -----------------------------------------------------------------------------
-- A alternativa a este `GRANT` seria afrouxar o guard para aceitar
-- `auth.uid() IS NULL` quando o papel do banco fosse `service_role`. Ela foi
-- **explicitamente recusada** pelo `DI-45-07-01` e pela decisao do operador de
-- 2026-08-05, e a razao e mecanica: deixaria uma funcao que apaga PII de forma
-- irreversivel **sem controle nenhum no corpo**, reintroduzindo precisamente o
-- defeito que a C2 fecha. Um `GRANT` a um papel cujo guard morde e estritamente mais
-- forte que um guard desligado para um papel privilegiado.
--
-- ⚠ `gerar_bias_snapshot` **NAO entra nesta migration**. Ela nao e chamada por esta
-- Edge Function, e afrouxar o ACL dela de carona seria exatamente o reflexo que esta
-- fase existe para nao ter.
--
-- -----------------------------------------------------------------------------
-- (d) ⚠ POSICAO OBRIGATORIA NA ORDEM DE APPLY DO 45-11: **POR ULTIMO**
-- -----------------------------------------------------------------------------
-- Esta migration concede privilegio sobre funcoes que **ainda nao existem em PROD**:
-- `20260805000005` (`plano_exclusao_titular`), `20260805000006`
-- (`anonimizar_candidato`) e `20260805000007` (`retirar_candidatura`) seguem NAO
-- aplicadas. Aplicar esta antes delas falha com `undefined_function`, e a
-- auto-verificacao abaixo diz isso com todas as letras em vez de deixar o erro cru do
-- Postgres explicar.
--
--   ordem: ... -> 20260805000005 -> 20260805000006 -> 20260805000007 -> **20260805000009**
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · ACL — REVOKE nominal, e so entao o GRANT minimo
-- ---------------------------------------------------------------------------
-- ⚠ NOMEAR `anon` E OBRIGATORIO, e nao e redundancia defensiva. Medido na P42-06: o
-- `pg_default_acl` do schema `public` neste projeto concede EXECUTE a `anon` como
-- grant **DIRETO E NOMEADO** em todo `CREATE FUNCTION`. `REVOKE ... FROM PUBLIC`
-- sozinho remove um grant de PUBLIC que NUNCA EXISTIU e deixa `anon=X` de pe. Hoje ha
-- 61 funcoes DEFINER em `public` com EXECUTE para `anon`, 39 chamaveis via PostgREST
-- (`docs/compliance/anon-execute-definer-audit.md:11-18`).
--
-- O `REVOKE` vem ANTES do `GRANT` em cada par, e os pares sao separados por funcao:
-- reafirmar o estado pretendido inteiro, por funcao, e o que torna esta migration
-- legivel como a definicao completa do ACL de cada uma — em vez de um delta que so
-- faz sentido lendo tres arquivos ao mesmo tempo.

-- registrar_pedido_exclusao — o titular registra o proprio pedido (ERASE-06).
REVOKE ALL ON FUNCTION public.registrar_pedido_exclusao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pedido_exclusao(uuid) TO authenticated;

-- cancelar_pedido_exclusao — a janela de arrependimento (ERASE-06).
REVOKE ALL ON FUNCTION public.cancelar_pedido_exclusao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_pedido_exclusao(uuid) TO authenticated;

-- retirar_candidatura — sair de UM processo, sem apagar dado nenhum (ERASE-05).
REVOKE ALL ON FUNCTION public.retirar_candidatura(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retirar_candidatura(uuid) TO authenticated;

-- plano_exclusao_titular — o passo 0 do motor, STABLE (ERASE-02 / ERASE-10).
REVOKE ALL ON FUNCTION public.plano_exclusao_titular(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plano_exclusao_titular(uuid) TO authenticated;

-- anonimizar_candidato — o tombstone. ⚠ A unica das cinco que apaga PII de forma
-- irreversivel, e por isso a que mais depende de o guard do corpo ser o controle.
REVOKE ALL ON FUNCTION public.anonimizar_candidato(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO authenticated;


-- ---------------------------------------------------------------------------
-- 2 · Auto-verificacao: EXECUTA o caminho FELIZ, perguntando ao CATALOGO
-- ---------------------------------------------------------------------------
-- Molde de `20260803000001:116-150`. Um gate que nao morde nao e um gate — e aquela
-- migration existe justamente porque o gate anterior media a RECUSA e chamava aquilo
-- de cobertura, deixando um `42804` sobreviver a um smoke 10/10 verde.
--
-- ⚠ A PERGUNTA E AO CATALOGO, NUNCA AO TEXTO DESTE ARQUIVO. Ler o arquivo provaria
-- que a linha de `GRANT` existe, nao que o privilegio chegou. **Um `GRANT` que nao
-- pega e indistinguivel de um que pegou se ninguem perguntar** — e o desfecho de um
-- `GRANT` silenciosamente ausente e o `42501` de hoje voltando em PROD, que e a falha
-- que ninguem investiga porque parece autorizacao funcionando.
--
-- As duas condicoes sao verificadas por funcao, e a mensagem NOMEIA a funcao e QUAL
-- delas quebrou.
DO $verifica_claims_do_titular$
DECLARE
  v_sig   text;
  v_proc  regprocedure;
  v_auth  boolean;
  v_anon  boolean;
  v_erros text := '';
BEGIN
  FOREACH v_sig IN ARRAY ARRAY[
    'public.registrar_pedido_exclusao(uuid)',
    'public.cancelar_pedido_exclusao(uuid)',
    'public.retirar_candidatura(uuid)',
    'public.plano_exclusao_titular(uuid)',
    'public.anonimizar_candidato(uuid, boolean)'
  ]
  LOOP
    v_proc := to_regprocedure(v_sig);

    IF v_proc IS NULL THEN
      RAISE EXCEPTION 'P45-CLAIMS: % NAO existe em public. Esta migration concede privilegio sobre funcoes das migrations 20260805000005, 000006 e 000007 — ela e a ULTIMA da ordem de apply do 45-11 por construcao, e aplicada antes delas falha assim', v_sig;
    END IF;

    v_auth := has_function_privilege('authenticated', v_proc::oid, 'EXECUTE');
    v_anon := has_function_privilege('anon', v_proc::oid, 'EXECUTE');

    IF NOT v_auth THEN
      v_erros := v_erros
        || format('[%s] authenticated NAO pode executar: o GRANT nao pegou, e o terceiro client da Edge Function (service key + Authorization do titular) chega justamente como authenticated — sem isto o motor volta a receber 42501 em PROD. ', v_sig);
    END IF;

    IF v_anon THEN
      v_erros := v_erros
        || format('[%s] anon PODE executar: o REVOKE precisa NOMEAR anon, porque o pg_default_acl deste schema o concede como grant DIRETO e revogar so de PUBLIC remove um grant que nunca existiu. ', v_sig);
    END IF;
  END LOOP;

  IF v_erros <> '' THEN
    RAISE EXCEPTION 'P45-CLAIMS: %', v_erros;
  END IF;

  RAISE NOTICE 'P45-CLAIMS OK: as 5 funcoes alcancaveis pelo titular sao executaveis por authenticated e NAO por anon. O controle continua sendo o guard do corpo (42501 para chamador sem sessao e para quem nao e rh, administrador nem o proprio titular), e a assercao C2 do smoke o prova em 10 recusas sem ter sido tocada';
  RAISE NOTICE 'P45-CLAIMS: reparo obrigatorio do ledger, logo apos o apply: UPDATE supabase_migrations.schema_migrations SET version = ''20260805000009'' WHERE name LIKE ''%%p45_claims_do_titular%%'';';
END
$verifica_claims_do_titular$;
