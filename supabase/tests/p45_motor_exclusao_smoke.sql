-- =============================================================================
-- Phase 45 / Plano 45-04 — ESPEC EXECUTAVEL do motor de exclusao & anonimizacao
-- (ERASE-01 · ERASE-02 · ERASE-05 · ERASE-08 · ERASE-09 · ERASE-10)
-- =============================================================================
-- ⚠ ESTE ARQUIVO E A ESPECIFICACAO, NAO UM RELATORIO.
-- Escrito ANTES do apply das migrations de 45-05, 45-06 e 45-07, deliberadamente
-- RED: nenhuma das cinco funcoes que ele assere existe em PROD hoje, e a coluna
-- `candidatos.user_id` ainda e `NOT NULL` com FK `ON DELETE CASCADE`. Ele descreve
-- o que aquelas migrations tem de produzir.
--
-- Consequencia de processo, dita aqui para nao ser negociada depois: se a
-- implementacao divergir deste arquivo, **corrige-se a implementacao**. Alterar o
-- smoke para caber no que foi aplicado e ESCALAR o problema — e exatamente o
-- movimento que transforma um gate em decoracao. A unica excecao autorizada esta
-- escrita no bloco de PROVENIENCIA abaixo, e ela e sobre a EXTRACAO do corpo de
-- uma funcao, nunca sobre o rigor de uma assercao.
--
-- -----------------------------------------------------------------------------
-- COMO RODAR
-- -----------------------------------------------------------------------------
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa UNICA chamada — nunca
-- pelo executor (subagentes GSD nao recebem os tools MCP do Supabase; bug upstream
-- anthropics/claude-code#13898). A UNICA chamada e obrigatoria por motivo MECANICO:
-- `set_config(..., false)` e escopado a SESSAO, entao statements espalhados por
-- chamadas separadas zerariam o contador `smoke45m.pass` e o RESUMO (z) reprovaria
-- um run que na verdade passou (licao da P41-05, repetida na P43 e na P44).
--
-- GATE VERDE = o contador `smoke45m.pass` bate **21** no RESUMO (z). O gate NAO e
-- "nao levantou excecao": um run parcial acumula < 21 e o RESUMO reprova ALTO.
-- Esperado FIXO — nao ha metade adaptativa, nao ha "pelo menos N".
--
-- -----------------------------------------------------------------------------
-- ⚠ ESTE SMOKE ESCREVE — E O ESCOPO NEGATIVO INVERTE EM RELACAO AO MOLDE
-- -----------------------------------------------------------------------------
-- O `p43_previa_smoke.sql` podia declarar "nao escreve nada, nem dentro de
-- subtransacao", porque as tres funcoes sob teste eram STABLE. Aqui e o oposto:
-- **o tombstone e um `UPDATE`**, e uma espec que nao o executasse mediria apenas o
-- caminho de recusa — que foi literalmente o defeito que deixou o `42804` da P43
-- passar por um smoke 10/10.
--
-- Portanto, com todas as letras:
--   · TODA escrita deste arquivo acontece dentro de uma subtransacao PL/pgSQL
--     (`BEGIN ... EXCEPTION`) encerrada por `RAISE EXCEPTION` com SQLSTATE proprio,
--     capturado logo acima. O efeito e ROLLBACK da subtransacao inteira.
--   · A assercao (z) — contagens de `candidatos`, `candidaturas`, `auth.users`,
--     `historico_candidatura`, `decisao_final`, `decisao_final_historico`,
--     `logs_acesso`, `autorizacoes`, `notificacoes_enviadas` e `solicitacoes_dados`
--     identicas antes e depois — e o que **PROVA** que o ROLLBACK aconteceu.
--     "Deveria ter revertido" e "reverteu" sao afirmacoes diferentes; so a segunda
--     e medivel.
--   · O smoke **nunca** toca linha de pessoa real. Toda fixture e criada por ele e
--     desfeita por ele. Ele apenas RESOLVE (leitura) uma vaga viva e um
--     administrador vivo, porque impersonar papel exige ator real.
--   · ⚠ Ele escreve em `auth.users`. E deliberado e precedido: a SONDA 6 de
--     `45-SONDAS-PROD.md` (2026-08-05) exercitou hard delete em PROD pelo mesmo
--     envelope (`DO` + `RAISE EXCEPTION`), com verificacao de integridade no §6d
--     provando zero residuo — inclusive de DDL, porque Postgres reverte DDL. Sem
--     escrever em `auth.users` nao ha titular sintetico: `candidatos.user_id` e
--     `NOT NULL UNIQUE REFERENCES auth.users(id)`, e o ERASE-10 nao teria o que
--     assertar.
--
-- ⚠ POR QUE O CONTADOR E INCREMENTADO **FORA** DA SUBTRANSACAO. Alteracoes de GUC
-- sao TRANSACIONAIS: um `set_config` feito dentro de um bloco revertido e revertido
-- junto. Por isso o Bloco B mede DENTRO da subtransacao, guarda tudo em variaveis
-- PL/pgSQL (que sobrevivem ao rollback), reverte, e so entao JULGA e incrementa.
-- Incrementar la dentro produziria um RESUMO que reprova um run correto — a mesma
-- classe de falso-vermelho que a chamada unica evita.
--
-- ⚠ POR QUE A FIXTURE DE `candidaturas` NASCE COM `status = 'rejeitado'`. Existem
-- DOIS triggers `AFTER INSERT ON public.candidaturas` vivos — `trg_notif_confirmacao`
-- (20260726000001:174-177) e `trg_candidaturas_analise` (20260610000002:68-70) — e
-- os dois disparam `net.http_post` para Edge Functions. Os dois compartilham o mesmo
-- survivor-guard: `IF NEW.status = 'rejeitado' OR NEW.opcao_knockout_id IS NOT NULL
-- THEN RETURN NEW`. Com `status = 'rejeitado'` nenhum dos dois enfileira coisa
-- alguma — nem sequer uma linha em `net.http_request_queue`. Isso e cinto E
-- suspensorio: a fila do `pg_net` e transacional e o ROLLBACK a descartaria de
-- qualquer forma, mas `NOTIFICACOES_MODO` esta registrado como `producao` e a
-- SONDA 5 nao pode confirma-lo por SQL — um smoke descuidado manda e-mail REAL para
-- pessoa REAL, e "provavelmente reverte" nao e postura aceitavel diante disso.
-- `etapa_atual` fica em `'triagem'` (o que o encerramento a pedido de 45-03 exige) e
-- a linha de `historico_candidatura` da fixture usa `etapa_para = 'triagem'`, que o
-- CASE de `trg_notif_transicao` (20260726000001:75-81) deixa passar sem dispatch.
--
-- -----------------------------------------------------------------------------
-- AS 21 ASSERCOES — treze delas NEGATIVAS
-- -----------------------------------------------------------------------------
-- BLOCO A — ESTRUTURAL, SEM FIXTURE, SEM ESCRITA. E O PRIMEIRO DO ARQUIVO, E A
-- ORDEM E A DECISAO MAIS IMPORTANTE AQUI. Num batch de chamada unica, tudo depois
-- do primeiro `RAISE` e INALCANCAVEL e conta como verde (licao W-1 da P43: nove
-- assercoes morreram assim, incluindo a guarda de regressao do 42804 acrescentada
-- no mesmo dia). As assercoes que provam que A TRILHA DE DECISAO SOBREVIVEU nao
-- podem ficar atras de nada que possa abortar por outro motivo.
--   (A1) ⊖ NEGATIVA (ERASE-08) — as 3 FKs `NO ACTION` seguem com `confdeltype = 'a'`:
--        `historico_candidatura.candidatura_id`, `decisao_final.candidatura_id` e
--        `decisao_final_historico.candidatura_id`. Nenhuma foi relaxada para CASCADE.
--   (A2) ⊖ NEGATIVA (ERASE-08) — `historico_candidatura.ator -> auth.users` segue `'a'`.
--   (A3) ⊖ NEGATIVA (ERASE-09) — as 5 FKs `SET NULL` seguem `'n'`, e a sexta que o
--        requirement confunde com elas segue `'c'` (CASCADE), como medido.
--   (A4) D-45-11 — `candidatos.user_id -> auth.users` e `'n'` (SET NULL) E
--        `attnotnull = false`. RED ate 45-07; e o estado correto hoje.
--
-- BLOCO B — O CAMINHO FELIZ DO TOMBSTONE, contra fixture sintetica real.
--   (B0) A fixture existe, inclusive nas TRES tabelas que estao em ZERO linhas em
--        PROD. Ausencia de fixture e FALHA DE TESTE, nunca verde por vacuidade.
--   (B1) A fixture MOVEU as contagens da trilha — `decisao_final_historico` saiu de
--        zero. Sem isso, a assercao (B7) seria satisfeita por vacuidade.
--   (B2) CAMINHO FELIZ — `anonimizar_candidato(id, p_dry_run := false)` COMPLETOU.
--        Nao "nao lancou": completou e devolveu o que promete.
--   (B7) ⊖ NEGATIVA (ERASE-08) — contagens da trilha DEPOIS ≡ ANTES, e zero linha
--        apagada. Mais a metade que protege a PESSOA: nenhuma linha de
--        `decisao_final_historico` do titular carrega justificativa identificavel.
--   (B8) ⊖ NEGATIVA (ERASE-10) — zero `candidatos` com `user_id` existente em
--        `auth.users`; zero `historico_candidatura.ator` apontando ao titular.
--   (B3) Pos-estado do tombstone, coluna a coluna, contra as SETE CHECKs VIVAS.
--   (B4) Idempotencia por ESTADO — re-chamar nao muta nada e nao audita nada.
--   (B5) ⊖ NEGATIVA — nao existe estado intermediario observavel (par misto).
--   (B6) As 5 tabelas `SET NULL` severadas, por POS-ESTADO e nunca por ordem; os
--        dois `inet` mascarados e NUNCA nulos.
--   (B9) ⊖ RE-IDENTIFICACAO COMO GATE — buscar o titular por (faixa etaria + UF +
--        vaga + timestamp) devolve ZERO linhas. Achou 1 → a anonimizacao falhou.
--   (B10) `dedupe_key` re-namespaceada — senao o recadastro futuro morre em silencio.
--
-- BLOCO C — SEGURANCA, NAO-DIVERGENCIA E OS DOIS NEGATIVOS DO ENCERRAMENTO.
--   (C1) ⊖ NEGATIVA — `proacl` das 5 funcoes novas nao concede EXECUTE a `anon`,
--        `authenticated` nem PUBLIC.
--   (C2) ⊖ GUARD, NAS DUAS METADES — cada funcao recusa com 42501 o papel errado E
--        o chamador SEM CLAIM NENHUMA. A segunda metade e a que fecha o defeito
--        sistemico: o guard `NOT IN` com `v_role` NULL avalia NULL, o `IF` nao e
--        tomado, e o guard deixa passar exatamente o chamador `anon`.
--   (C3) GATE DE NAO-DIVERGENCIA, NAS DUAS METADES — `md5(prosrc)` pinado E
--        `pg_get_functiondef` do chamador CONTEM a chamada.
--   (C4) ⊖ NEGATIVA — `p_dry_run := true` nao muta NADA, e o SQLSTATE levantado e o
--        combinado de dry-run e nao um erro qualquer.
--   (C5) ⊖ NEGATIVA — a fila do RH nao e contaminada: uma linha `tipo = 'exclusao'`
--        nao aparece nas duas RPCs que filtram `tipo = 'acesso'`.
--   (C6) ⊖ NEGATIVA (ERASE-05 / D-45-06) — encerrar a pedido NAO gera evento
--        `'decisao'` em `notificacoes_enviadas` e NAO gera `auto_rejeitado = true`
--        em `historico_candidatura`.
--   (z)  RESUMO — ⊖ negativa global de residuo + gate de contagem FIXO em 21.
--
-- =============================================================================
-- ⚠ TRES ACHADOS MEDIDOS QUE ESTA ESPEC ENCODA, E QUE O 45-07 TEM DE RESOLVER
-- =============================================================================
-- Nao sao opinioes deste arquivo: sao propriedades lidas do catalogo e das
-- migrations vivas. Estao aqui porque uma espec que as ignorasse produziria um
-- gate que reprova o comportamento correto — ou, pior, um que aprova o errado.
--
-- (M1) `trg_decisao_final_snapshot` (20260709000011:105-118) e
--      `AFTER UPDATE ON public.decisao_final FOR EACH ROW`, SEM clausula `WHEN`, e
--      insere em `decisao_final_historico` o `OLD.justificativa` — o texto
--      IDENTIFICAVEL — junto com `OLD.por_usuario`.
--      Consequencia direta: o `UPDATE decisao_final SET justificativa = <texto
--      desidentificado>` do tombstone (D-45-02) **recria no arquivo a PII que
--      acabou de desidentificar**, e a contagem de `decisao_final_historico` sobe.
--      A leitura ingenua do ERASE-08 ("contagem identica nas tres") e, portanto,
--      INSATISFAZIVEL sem apagar linha do arquivo — que o proprio ERASE-08 proibe.
--      O que esta espec assere e o invariante que de fato protege a pessoa:
--        · `historico_candidatura` e `decisao_final`: contagem IDENTICA (estrito);
--        · `decisao_final_historico`: a contagem NUNCA DECRESCE (zero apagamento —
--          e isso que o ERASE-08 existe para garantir) e cresce no MAXIMO o numero
--          de linhas de `decisao_final` que o tombstone atualizou;
--        · e ZERO linha de `decisao_final_historico` das candidaturas do titular
--          carrega justificativa distinta do texto desidentificado, ou
--          `por_usuario` apontando ao titular.
--      Obrigacao que isso impoe ao 45-07: o scrub de `decisao_final_historico` tem
--      de ser o ULTIMO statement a tocar o par, DEPOIS do `UPDATE` em
--      `decisao_final` — porque o trigger insere a linha nova exatamente ali.
--      Fazer o scrub antes deixa uma linha identificavel recem-criada atras dele.
--
-- (M2) `candidate_ai_decisions.candidato_id` e
--      `uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE SET NULL`
--      (20260609000001:236). `NOT NULL` + `SET NULL` e uma contradicao estrutural:
--      a clausula da FK nunca pode ser cumprida, e o tombstone NAO CONSEGUE severar
--      esse ponteiro. Esta espec le `attnotnull` AO VIVO e adapta a exigencia:
--      coluna nulavel ⇒ zero linha apontando ao titular; coluna `NOT NULL` ⇒ a
--      linha pode continuar apontando, mas NAO pode continuar carregando o conteudo
--      identificante do titular. O 45-07 escolhe explicitamente entre afrouxar a
--      coluna e desidentificar o conteudo — o que ele nao pode e deixar as duas
--      coisas de pe.
--
-- (M3) Os SEIS nomes de CHECK que a `45-RESEARCH.md` previu para `candidatos` NAO
--      EXISTEM. Os vivos, medidos na SONDA 1b, sao `check_email_format`,
--      `check_cpf_format`, `check_celular_format`, `check_data_nascimento`,
--      `check_genero`, `check_estado` — e existe uma SETIMA nao prevista,
--      `check_como_conheceu`. Sao SETE. Esta espec le os nomes do catalogo e assere
--      contra o que esta vivo; nenhuma sentinela da fixture foi escolhida por
--      parecer razoavel.
--
-- =============================================================================
-- PROVENIENCIA DOS RESUMOS md5 (nao apagar — e o que torna um re-pin auditavel)
-- =============================================================================
-- A assercao (C3) compara `md5(prosrc)` de `plano_exclusao_titular` e de
-- `anonimizar_candidato` contra valores PINADOS. Duas razoes para md5 e nao para
-- string transcrita, nesta ordem:
--   1. md5 sobre o corpo inteiro E comparacao byte a byte. Um espaco a mais, uma
--      quebra de linha a menos, um acento trocado — qualquer diferenca muda o
--      resumo. E estritamente mais forte que inspecao visual e que `strpos`.
--   2. Transcrever o corpo esperado AQUI traria de volta o proprio sitio de drift
--      que este gate existe para fechar: passaria a haver DUAS copias do predicado
--      no repositorio, e a segunda envelheceria em silencio.
--
--   valor  : PENDENTE-45-07   (plano_exclusao_titular — octetos: PENDENTE-45-07)
--   valor  : PENDENTE-45-07   (anonimizar_candidato   — octetos: PENDENTE-45-07)
--   origem : corpo entre os dois delimitadores NOMEADOS de cifrao
--            (`$plano_exclusao_titular$` e `$anonimizar_candidato$`) em
--            `supabase/migrations/20260805000005_p45_plano_e_dry_run.sql` e
--            `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql`
--   medido : PENDENTE-45-07 — sera preenchido pelo 45-11, por EXECUCAO, quando as
--            funcoes existirem em PROD. NUNCA digitado a mao, NUNCA inventado.
--   recomputar (se e somente se a migration mudar):
--     node -e 'const f=require("fs").readFileSync(process.argv[1],"utf8"),
--       D="$"+process.argv[2]+"$", a=f.indexOf(D), b=f.indexOf(D,a+D.length);
--       console.log(require("crypto").createHash("md5")
--         .update(f.slice(a+D.length,b),"utf8").digest("hex"))' \
--       supabase/migrations/20260805000006_p45_anonimizar_candidato.sql \
--       anonimizar_candidato
--   ⚠ Enquanto o valor for `PENDENTE-45-07`, a assercao (C3) REPROVA ALTO com essa
--     mensagem. Um placeholder que passasse verde seria pior que assercao nenhuma.
--   ⚠ Se um resumo for re-pinado sem que a migration tenha mudado, (C3) deixa de
--     provar qualquer coisa. Re-pinar e ATO CONSCIENTE E REVISAVEL.
--
-- ⚠ A UNICA DIVERGENCIA AUTORIZADA, E O SEU TESTE DE DISCRIMINACAO
-- Se no checkpoint um pin de (C3) NAO bater **E** o `md5(statements[1])` do apply
-- tiver batido o md5 do arquivo (ou seja: o SQL aplicado e COMPROVADAMENTE identico
-- ao arquivo commitado), entao a divergencia e da EXTRACAO do corpo pelo comando
-- acima, **nao do objeto vivo**. Nesse e apenas nesse caso o orquestrador atualiza
-- o pin UMA vez com o valor medido e registra a discrepancia no SUMMARY. NUNCA o
-- contrario — nunca afrouxar a assercao, nunca trocar o md5 por `strpos`, nunca
-- marcar (C3) como opcional.
--
-- =============================================================================
-- POR QUE ESTE ARQUIVO USA FRONTEIRA DE PALAVRA E NUNCA `strpos` PARA IDENTIFICADOR
-- =============================================================================
-- Porque `strpos(lower(prosrc), 'update')` REPROVARIA a implementacao CORRETA:
-- `updated_at` e `deleted_at` contem `update` e `delete` como SUBSTRING. Um teste
-- que reprova o comportamento correto e pior que teste nenhum: ele treina quem
-- executa a desliga-lo (mesma licao que a 43-UI-SPEC registrou sobre o escopo do
-- grep de `automaticamente`).
-- `\m` e `\M` sao as fronteiras de palavra do regex do Postgres, e `_` conta como
-- caractere de palavra — entao `\mupdate\M` NAO casa dentro de `updated_at`, mas
-- casa no verbo `UPDATE` isolado. E o identificador que esta sendo procurado, nao a
-- letra.
--
-- HIGIENE: `RESET ROLE` em toda troca de contexto e ao final; a claim impersonada e
-- limpa explicitamente. Os NOTICEs carregam contagens, SQLSTATEs, resumos md5 e
-- nomes de objeto — NUNCA PII e nunca o valor de um segredo. O e-mail sintetico da
-- fixture nao e PII: e um uuid gerado neste run.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke45m.pass', '0', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- (A1) ⊖ NEGATIVA (ERASE-08) — AS 3 FKs `NO ACTION` CONTINUAM `NO ACTION`.
--
--     Esta e a primeira assercao do arquivo, e e de proposito. O modo de falha que
--     o ROADMAP nomeia para o ERASE-08 e HUMANO, nao algoritmico: diante do
--     primeiro `23503`, o reflexo e relaxar a FK para CASCADE e seguir em frente.
--     E o `23503` deixou de ser surpresa — a SONDA 6 o mediu em PROD (§6b), pela
--     cadeia `auth.users --CASCADE--> candidatos --CASCADE--> candidaturas
--     --NO ACTION--> historico_candidatura`. Ele e um desfecho ESPERADO.
--
--     Nao ha fixture aqui, nao ha escrita aqui, e nao ha nada antes daqui: relaxar
--     uma destas tres nao pode passar por "o smoke nao chegou la".
--
--     ⚠ A constraint que bloqueia e `historico_candidatura.candidatura_id`, e ela
--     e alcancada TRANSITIVAMENTE — nao e `.ator`, como o mapa da fase supunha.
--     Numa conta hibrida candidato+RH a SONDA 6 mediu um bloqueador DIFERENTE
--     (`preferencias_notificacoes_created_by_fkey`). Por isso o motor trata `23503`
--     como CLASSE; por isso este bloco assere as tres por `confdeltype`, e nao a
--     ausencia de um erro nomeado.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a1$
DECLARE
  r          record;
  v_tipo     "char";
  v_checadas int := 0;
BEGIN
  FOR r IN
    SELECT *
      FROM (VALUES
        ('public.historico_candidatura',    'candidatura_id', 'public.candidaturas'),
        ('public.decisao_final',            'candidatura_id', 'public.candidaturas'),
        ('public.decisao_final_historico',  'candidatura_id', 'public.candidaturas')
      ) AS t(tabela, coluna, referencia)
  LOOP
    SELECT c.confdeltype INTO v_tipo
      FROM pg_constraint c
      JOIN unnest(c.conkey) WITH ORDINALITY k(attnum, ord) ON TRUE
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
     WHERE c.contype  = 'f'
       AND c.conrelid = r.tabela::regclass
       AND c.confrelid = r.referencia::regclass
       AND a.attname  = r.coluna;

    IF v_tipo IS NULL THEN
      RAISE EXCEPTION 'P45M FAIL (A1): a FK %.% -> % NAO EXISTE MAIS no catalogo. A trilha de decisao humana que a RNF-07a existe para proteger perdeu a amarra que impedia que ela fosse levada junto com o titular', r.tabela, r.coluna, r.referencia;
    END IF;

    IF v_tipo <> 'a' THEN
      RAISE EXCEPTION 'P45M FAIL (A1): a FK %.% -> % esta com confdeltype = % (esperado ''a'' = NO ACTION). RELAXAR PARA CASCADE E O REFLEXO ERRADO diante do 23503, e e exatamente o que o ERASE-08 PROIBE: com CASCADE ali, apagar a candidatura apaga a prova de que a decisao foi humana. A saida correta e anonimizar a linha filha e severar o ponteiro — nunca afrouxar a constraint', r.tabela, r.coluna, r.referencia, v_tipo;
    END IF;

    v_checadas := v_checadas + 1;
  END LOOP;

  IF v_checadas <> 3 THEN
    RAISE EXCEPTION 'P45M FAIL (A1): confirmei % das 3 FKs NO ACTION do ERASE-08 — uma delas mudou de tabela, de coluna ou de referencia', v_checadas;
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (A1): as 3 FKs da trilha de decisao seguem NO ACTION — nenhuma foi relaxada para CASCADE';
END
$a1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (A2) ⊖ NEGATIVA (ERASE-08) — `historico_candidatura.ator -> auth.users` segue
--      `NO ACTION`.
--
--      O mapa da fase chamava esta FK de "o bloqueio real do deleteUser". A SONDA 6
--      REFUTOU essa parte: para os 21 titulares puros, `ator` tem ZERO linha —
--      quem move etapa e o RH, o titular nunca e ator. Severar `ator` e no-op no
--      caminho do titular puro.
--
--      A assercao continua valendo, e por outra razao: `ator` e a coluna que diz
--      QUEM decidiu. Se ela virasse CASCADE, apagar um recrutador apagaria as
--      linhas de trilha que ele escreveu sobre OUTRAS pessoas. A protecao aqui nao
--      e do titular — e da trilha inteira.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a2$
DECLARE
  v_tipo "char";
BEGIN
  SELECT c.confdeltype INTO v_tipo
    FROM pg_constraint c
    JOIN unnest(c.conkey) WITH ORDINALITY k(attnum, ord) ON TRUE
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
   WHERE c.contype   = 'f'
     AND c.conrelid  = 'public.historico_candidatura'::regclass
     AND c.confrelid = 'auth.users'::regclass
     AND a.attname   = 'ator';

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (A2): a FK historico_candidatura.ator -> auth.users NAO EXISTE MAIS — a coluna que registra QUEM decidiu deixou de ser garantida';
  END IF;

  IF v_tipo <> 'a' THEN
    RAISE EXCEPTION 'P45M FAIL (A2): historico_candidatura.ator -> auth.users esta com confdeltype = % (esperado ''a''). Com CASCADE ali, apagar UM recrutador apagaria as linhas de trilha que ele escreveu sobre TODAS as pessoas que passaram pelo funil', v_tipo;
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (A2): historico_candidatura.ator -> auth.users segue NO ACTION';
END
$a2$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (A3) ⊖ NEGATIVA (ERASE-09) — AS 5 FKs `SET NULL` SEGUEM `SET NULL`.
--
--      E a metade que o requirement escreveu ERRADO, medida na SONDA 4b:
--      `autorizacoes` tem DUAS FKs. A que aponta a `candidatos` e **CASCADE**; a
--      que e `SET NULL` aponta a `auth.users`. O ERASE-09 trata as duas como se
--      fossem uma. Este bloco assere as cinco corretas E assere que a sexta
--      continua CASCADE — porque registrar a verdade medida e o que impede a
--      confusao de voltar pela porta dos fundos num "conserto" futuro.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a3$
DECLARE
  r          record;
  v_tipo     "char";
  v_checadas int := 0;
BEGIN
  FOR r IN
    SELECT *
      FROM (VALUES
        ('public.ai_call_logs',           'candidato_id', 'public.candidatos', 'n', 'ERASE-09: SET NULL'),
        ('public.candidate_ai_decisions', 'candidato_id', 'public.candidatos', 'n', 'ERASE-09: SET NULL'),
        ('public.logs_acesso',            'user_id',      'auth.users',        'n', 'ERASE-09: SET NULL'),
        ('public.recruiter_alerts',       'candidato_id', 'public.candidatos', 'n', 'ERASE-09: SET NULL'),
        ('public.autorizacoes',           'user_id',      'auth.users',        'n', 'ERASE-09: SET NULL (esta e a SET NULL de autorizacoes)'),
        ('public.autorizacoes',           'candidato_id', 'public.candidatos', 'c', 'D8/SONDA 4b: CASCADE medido — o ERASE-09 a lista por engano entre as SET NULL')
      ) AS t(tabela, coluna, referencia, esperado, motivo)
  LOOP
    SELECT c.confdeltype INTO v_tipo
      FROM pg_constraint c
      JOIN unnest(c.conkey) WITH ORDINALITY k(attnum, ord) ON TRUE
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
     WHERE c.contype   = 'f'
       AND c.conrelid  = r.tabela::regclass
       AND c.confrelid = r.referencia::regclass
       AND a.attname   = r.coluna;

    IF v_tipo IS NULL THEN
      RAISE EXCEPTION 'P45M FAIL (A3): a FK %.% -> % NAO EXISTE — %', r.tabela, r.coluna, r.referencia, r.motivo;
    END IF;

    IF v_tipo::text <> r.esperado THEN
      RAISE EXCEPTION 'P45M FAIL (A3): %.% -> % esta com confdeltype = %, esperado % (%). O grafo de FK medido na SONDA 4 mudou, e o tratamento que o tombstone da a esta tabela deixou de corresponder ao que a plataforma faz', r.tabela, r.coluna, r.referencia, v_tipo, r.esperado, r.motivo;
    END IF;

    v_checadas := v_checadas + 1;
  END LOOP;

  IF v_checadas <> 6 THEN
    RAISE EXCEPTION 'P45M FAIL (A3): confirmei % das 6 arestas esperadas (5 SET NULL + a CASCADE de autorizacoes.candidato_id)', v_checadas;
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (A3): as 5 FKs do ERASE-09 seguem SET NULL, e autorizacoes.candidato_id segue CASCADE (D8 registrado)';
END
$a3$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (A4) D-45-11 — `candidatos.user_id` E `SET NULL` **E** NULAVEL.
--
--      As duas metades, porque uma sozinha nao resolve nada:
--        · `confdeltype = 'n'` faz um `deleteUser` fora de ordem deixar ORFAO em
--          vez de cascatear. Hoje ela e `'c'` (CASCADE), confirmado vivo, e o
--          repositorio de migrations diz `SET NULL` — e ficcao.
--        · `attnotnull = false` e o que torna o tombstone POSSIVEL. A SONDA 6
--          mediu a prova por execucao: antes da S1,
--          `UPDATE candidatos SET user_id = NULL` devolve
--          `23502 | null value in column "user_id" ... violates not-null`.
--
--      ⚠ ANTES do 45-07 esta assercao sai VERMELHA, e esse e o estado correto.
--      Ela e a prova estrutural de que a migration S1 aconteceu — nao um voto de
--      confianca nela. E o custo dela ja esta declarado: com `user_id = NULL`, a
--      policy own-row de `solicitacoes_dados` deixa de casar com qualquer sessao
--      do titular. Isso e o comportamento DESEJADO, dito aqui em vez de descoberto.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a4$
DECLARE
  v_tipo    "char";
  v_notnull boolean;
BEGIN
  SELECT c.confdeltype INTO v_tipo
    FROM pg_constraint c
    JOIN unnest(c.conkey) WITH ORDINALITY k(attnum, ord) ON TRUE
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
   WHERE c.contype   = 'f'
     AND c.conrelid  = 'public.candidatos'::regclass
     AND c.confrelid = 'auth.users'::regclass
     AND a.attname   = 'user_id';

  SELECT a.attnotnull INTO v_notnull
    FROM pg_attribute a
   WHERE a.attrelid = 'public.candidatos'::regclass
     AND a.attname  = 'user_id'
     AND NOT a.attisdropped;

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (A4): a FK candidatos.user_id -> auth.users nao foi encontrada no catalogo';
  END IF;

  IF v_tipo <> 'n' THEN
    RAISE EXCEPTION 'P45M FAIL (A4): candidatos.user_id -> auth.users esta com confdeltype = %, esperado ''n'' (SET NULL). Com CASCADE vivo, deleteUser cascateia candidatos -> candidaturas e bate nas 3 FKs NO ACTION com 23503; se isso acontecer DEPOIS do passo de Storage, o estado final e curriculo apagado (irrecuperavel: sem PITR, sem backup de Storage) e 100%% da PII do titular intacta no banco. E o pior estado alcancavel nesta fase, e hoje e o desfecho GARANTIDO. A migration S1 do 45-07 e precondicao aritmetica do ERASE-10, nao preferencia de desenho', v_tipo;
  END IF;

  IF v_notnull IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P45M FAIL (A4): candidatos.user_id ainda tem attnotnull = % — o tombstone nao consegue setar NULL, e a SONDA 6 mediu o desfecho exato disso: 23502 null value in column "user_id" violates not-null constraint. O ERASE-10 e inexecutavel enquanto esta coluna for NOT NULL', v_notnull;
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (A4): candidatos.user_id e SET NULL e nulavel — a D-45-11/S1 esta aplicada';
END
$a4$;
