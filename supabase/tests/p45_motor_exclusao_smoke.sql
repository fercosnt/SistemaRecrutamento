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
-- (M2) `candidate_ai_decisions` declara DUAS FKs inexequiveis, nao uma
--      (20260609000001:236-237, confirmado no catalogo vivo de PROD):
--        `candidato_id uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE SET NULL`
--        `vaga_id      uuid NOT NULL REFERENCES public.vagas(id)      ON DELETE SET NULL`
--      `NOT NULL` + `SET NULL` e uma contradicao estrutural: apagar a linha
--      referenciada faz o Postgres tentar gravar NULL numa coluna `NOT NULL` e
--      levantar `23502`. A clausula nunca pode ser cumprida — a FK e BOMBA LATENTE,
--      nao protecao, e hoje esta dormente APENAS porque a tabela tem 0 linhas. O
--      tombstone, pelo mesmo motivo, NAO CONSEGUE severar esses dois ponteiros.
--      Esta espec le `attnotnull` AO VIVO para AS DUAS COLUNAS e adapta a
--      exigencia: coluna nulavel ⇒ zero linha apontando ao titular; coluna
--      `NOT NULL` ⇒ a linha pode continuar apontando, mas NAO pode continuar
--      carregando o conteudo identificante do titular. O 45-07 escolhe
--      explicitamente entre afrouxar as colunas e desidentificar o conteudo, e a
--      escolha vale para O PAR — o que ele nao pode e deixar as duas coisas de pe.
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


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — identidades vivas resolvidas em LEITURA, e as contagens globais que
-- a assercao (z) usa para provar que o ROLLBACK aconteceu.
--
-- Nao ha escrita aqui e nao ha incremento de contador: este bloco nao e uma
-- assercao, e a fixture propriamente dita nasce e morre dentro do Bloco B.
--
-- ⚠ Se uma identidade necessaria nao existir, levanta ALTO com o nome exato do que
-- falta. Um SKIP silencioso aqui seria indistinguivel de um motor que funciona: as
-- assercoes seguintes deixariam de provar qualquer coisa e o gate ficaria verde por
-- AUSENCIA DE TESTE — o modo de falha que este arquivo inteiro existe para impedir.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $baseline$
DECLARE
  v_admin_auth uuid;
  v_vaga       uuid;
  v_pv         uuid;
  v_solic      bigint := -1;
BEGIN
  SELECT u.user_id INTO v_admin_auth
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador'
     AND u.ativo
     AND u.deleted_at IS NULL
   ORDER BY u.created_at
   LIMIT 1;

  IF v_admin_auth IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (baseline): nenhum administrador VIVO em usuarios_rh. O caminho FELIZ do tombstone nao pode ser exercitado sem um ator real, e verificar so a recusa foi exatamente o defeito que a 20260803000001 corrigiu — um smoke que so exercita o caminho de recusa nao e cobertura do caminho feliz, e conta como verde do mesmo jeito';
  END IF;

  SELECT v.id INTO v_vaga
    FROM public.vagas v
   ORDER BY v.created_at
   LIMIT 1;

  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (baseline): nenhuma vaga viva — a candidatura sintetica e as linhas de ai_call_logs/candidate_ai_decisions/recruiter_alerts exigem vaga_id, e a assercao de re-identificacao (B9) usa a vaga como quase-identificador';
  END IF;

  -- Opcional: se nao houver prompt_versions viva, o Bloco B cria uma sintetica.
  SELECT p.id INTO v_pv FROM public.prompt_versions p ORDER BY p.created_at LIMIT 1;

  IF to_regclass('public.solicitacoes_dados') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.solicitacoes_dados' INTO v_solic;
  END IF;

  PERFORM set_config('smoke45m.admin_auth', v_admin_auth::text,    false);
  PERFORM set_config('smoke45m.vaga',       v_vaga::text,          false);
  PERFORM set_config('smoke45m.pv',         coalesce(v_pv::text, ''), false);
  PERFORM set_config('smoke45m.solic',      v_solic::text,         false);

  PERFORM set_config('smoke45m.candos',   (SELECT count(*) FROM public.candidatos)::text,             false);
  PERFORM set_config('smoke45m.cands',    (SELECT count(*) FROM public.candidaturas)::text,           false);
  PERFORM set_config('smoke45m.users',    (SELECT count(*) FROM auth.users)::text,                    false);
  PERFORM set_config('smoke45m.hist',     (SELECT count(*) FROM public.historico_candidatura)::text,  false);
  PERFORM set_config('smoke45m.df',       (SELECT count(*) FROM public.decisao_final)::text,          false);
  PERFORM set_config('smoke45m.dfh',      (SELECT count(*) FROM public.decisao_final_historico)::text,false);
  PERFORM set_config('smoke45m.logs',     (SELECT count(*) FROM public.logs_acesso)::text,            false);
  PERFORM set_config('smoke45m.aut',      (SELECT count(*) FROM public.autorizacoes)::text,           false);
  PERFORM set_config('smoke45m.notif',    (SELECT count(*) FROM public.notificacoes_enviadas)::text,  false);
  PERFORM set_config('smoke45m.aicall',   (SELECT count(*) FROM public.ai_call_logs)::text,           false);
  PERFORM set_config('smoke45m.aidec',    (SELECT count(*) FROM public.candidate_ai_decisions)::text, false);
  PERFORM set_config('smoke45m.alerts',   (SELECT count(*) FROM public.recruiter_alerts)::text,       false);

  RAISE NOTICE 'P45M BASELINE ok: admin e vaga resolvidos; % candidatos / % candidaturas / % auth.users / % historico / % decisao_final / % decisao_final_historico',
    current_setting('smoke45m.candos'), current_setting('smoke45m.cands'), current_setting('smoke45m.users'),
    current_setting('smoke45m.hist'), current_setting('smoke45m.df'), current_setting('smoke45m.dfh');
END
$baseline$;


-- ═════════════════════════════════════════════════════════════════════════════
-- BLOCO B — O CAMINHO FELIZ DO TOMBSTONE, CONTRA FIXTURE SINTETICA REAL.
--
-- Um unico bloco, por uma razao mecanica: as onze assercoes B0..B10 precisam medir
-- o MESMO titular sintetico, e ele nao pode sobreviver entre blocos (a subtransacao
-- que o cria e a mesma que o desfaz). O desenho e:
--
--   1. subtransacao: cria fixture -> mede ANTES -> roda o tombstone -> mede DEPOIS
--      -> guarda TUDO em variaveis PL/pgSQL (que sobrevivem ao rollback)
--   2. `RAISE EXCEPTION` com SQLSTATE proprio -> ROLLBACK da subtransacao inteira
--   3. so ENTAO julga e incrementa, ja fora dela (GUC e transacional — incrementar
--      la dentro produziria um RESUMO que reprova um run correto)
--
-- ⚠ A ORDEM DO JULGAMENTO NAO E A ORDEM DA NUMERACAO, E ISSO E DELIBERADO.
-- Todas as MEDICOES acontecem antes de qualquer julgamento, entao nenhum julgamento
-- pode impedir outra medicao. Mas num batch de chamada unica o primeiro `RAISE`
-- torna os julgamentos seguintes inalcancaveis, entao a ordem e:
--     B0 (a fixture existe) -> B1 (ela moveu as contagens) -> B2 (o tombstone
--     COMPLETOU) -> B7 e B8 (as NEGATIVAS do ERASE-08 e do ERASE-10) -> o resto.
-- B2 vem antes de B7/B8 porque um tombstone que nao rodou torna TODA assercao de
-- pos-estado sem sentido — B7 passaria por vacuidade, que e pior que reprovar. A
-- garantia estrutural contra a inalcancabilidade e o Bloco A, que ja rodou.
-- ═════════════════════════════════════════════════════════════════════════════
RESET ROLE;
DO $bloco_b$
DECLARE
  -- identidades
  v_admin_auth  uuid := current_setting('smoke45m.admin_auth')::uuid;
  v_vaga        uuid := current_setting('smoke45m.vaga')::uuid;
  v_pv          uuid := nullif(current_setting('smoke45m.pv'), '')::uuid;
  v_user        uuid := gen_random_uuid();
  v_cand        uuid;
  v_candtr      uuid;
  v_aidec       uuid;
  v_logid       uuid;
  v_autid       uuid;
  v_notifid     uuid;
  v_email_fix   text;

  -- B0 / B1
  v_n_aicall    int;
  v_n_aidec     int;
  v_n_alerts    int;
  v_n_notif     int;
  v_n_logs      int;
  v_n_aut       int;
  v_hist_pre    bigint;
  v_df_pre      bigint;
  v_dfh_pre     bigint;
  v_hist_pos    bigint;
  v_df_pos      bigint;
  v_dfh_pos     bigint;
  v_df_tit      int;

  -- ANTES (pos-fixture, pre-tombstone)
  v_nome_a      text;
  v_email_a     text;
  v_cpf_a       text;
  v_cel_a       text;
  v_nasc_a      date;
  v_gen_a       text;
  v_cid_a       text;
  v_uf_a        char(2);
  v_conh_a      text;
  v_just_a      text;
  v_justh_a     text;
  v_ip_log_a    inet;
  v_ip_aut_a    inet;
  v_dedupe_a    text;
  v_dest_a      text;
  v_desto_a     text;
  v_airsum_a    text;
  v_idade_a     int;
  v_dtcand_a    timestamptz;
  v_aud_a       bigint;
  v_aud_mid     bigint;

  -- DEPOIS
  v_nome_d      text;
  v_email_d     text;
  v_cpf_d       text;
  v_cel_d       text;
  v_nasc_d      date;
  v_gen_d       text;
  v_cid_d       text;
  v_uf_d        char(2);
  v_conh_d      text;
  v_uid_d       uuid;
  v_just_d      text;
  v_justh_ident int;
  v_justh_ator  int;
  v_ip_log_d    inet;
  v_ip_aut_d    inet;
  v_dedupe_d    text;
  v_dest_d      text;
  v_desto_d     text;
  v_airsum_d    text;

  -- severacao (ERASE-09)
  v_p_aicall    int;
  v_p_aidec     int;
  v_p_logs      int;
  v_p_alerts    int;
  v_p_aut       int;
  v_nn_aidec_c  boolean;
  v_nn_aidec_v  boolean;
  v_nn_cpf      boolean;

  -- ERASE-10 / re-identificacao / idempotencia
  v_uid_viva    int;
  v_ator_tit    int;
  v_reid        int;
  v_ret         text;
  v_ret2        text;
  v_aud_delta   bigint;
  v_mudou2      int;

  v_mudadas     int;
  v_ufs         text[] := ARRAY['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
                                'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  v_conhecidos  text[] := ARRAY['linkedin','instagram','indicacao','site','google','facebook','outro'];
BEGIN
  -- Guarda de existencia: sem ela, a ausencia das funcoes de 45-07 apareceria como
  -- um 42883 cru, e nao como o estado RED que este arquivo descreve.
  IF to_regproc('public.anonimizar_candidato(uuid, boolean)') IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B): public.anonimizar_candidato(uuid, boolean) NAO EXISTE. Este arquivo e a ESPECIFICACAO do tombstone e foi escrito ANTES dele: RED aqui e o estado correto ate a migration 20260805000006 do plano 45-07 ser aplicada';
  END IF;

  v_email_fix := 'p45smoke-' || replace(v_user::text, '-', '') || '@invalido.local';

  -- ───────────────────────────────────────────────────────────────────────────
  -- SUBTRANSACAO — tudo daqui ate o RAISE e revertido.
  -- ───────────────────────────────────────────────────────────────────────────
  BEGIN
    -- (fixture 1/13) auth.users — sem ele nao ha titular: candidatos.user_id e
    -- NOT NULL UNIQUE REFERENCES auth.users(id). Precedente: SONDA 6, §6d.
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email_fix, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);

    -- (fixture 2/13) candidatos — TODAS as colunas NOT NULL medidas na SONDA 1a,
    -- com valores escolhidos contra as SETE CHECKs VIVAS da SONDA 1b (M3), nunca
    -- contra `docs/sql/sql/02-tabela-candidatos.sql`, que e de 2025 e diverge.
    -- O CPF usa o prefixo 000.000, que nao ocorre em CPF real, e sufixo aleatorio:
    -- a coluna e UNIQUE e uma colisao abortaria a fixture inteira.
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, cpf, celular, data_nascimento, genero,
       cidade, estado, como_conheceu, linkedin, instagram, linkedin_url, instagram_url)
    VALUES
      (v_user,
       'SMOKE P45 Titular Sintetico',
       v_email_fix,
       '000.000.' || lpad((floor(random() * 1000))::int::text, 3, '0')
                  || '-' || lpad((floor(random() * 100))::int::text, 2, '0'),
       '(11) 98888-7777',
       DATE '1991-03-14',
       'prefiro_nao_informar',
       'Campinas',
       'SP',
       'site',
       'smoke-p45', 'smoke-p45',
       'https://linkedin.example/smoke-p45', 'https://instagram.example/smoke-p45')
    RETURNING id INTO v_cand;

    -- (fixture 3/13) candidaturas — `status = 'rejeitado'` e o survivor-guard que
    -- desarma os DOIS triggers AFTER INSERT que fariam net.http_post (ver cabecalho).
    -- `etapa_atual = 'triagem'` e o que o encerramento a pedido de 45-03 exige.
    INSERT INTO public.candidaturas
      (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES
      (v_cand, v_vaga, 'triagem', 'rejeitado', false, now() - interval '31 days')
    RETURNING id INTO v_candtr;

    -- (fixture 4/13) historico_candidatura com `ator` = o titular. etapa_para =
    -- 'triagem' cai no ramo `RETURN NEW` do CASE de trg_notif_transicao: zero
    -- dispatch. A SONDA 6 mediu `ator` = 0 linhas para os 21 titulares puros
    -- (quem move etapa e o RH), entao esta linha e sintetica de proposito — sem ela
    -- a metade `ator` do ERASE-10 nao teria o que severar.
    INSERT INTO public.historico_candidatura
      (candidatura_id, etapa_de, etapa_para, ator, criado_em)
    VALUES
      (v_candtr, 'inscricao', 'triagem', v_user, now() - interval '30 days');

    -- (fixture 5/13) decisao_final — justificativa longa, para que a
    -- desidentificacao seja visivel e nao confundivel com truncamento.
    INSERT INTO public.decisao_final
      (candidatura_id, decisao, justificativa, por_usuario)
    VALUES
      (v_candtr, 'em_espera',
       'SMOKE P45 fixture: justificativa sintetica com mais de cinquenta caracteres para exercitar a preservacao anonimizada exigida pela D-45-02.',
       v_admin_auth);

    -- (fixture 6/13) decisao_final_historico — a SONDA 4e mediu esta tabela em ZERO
    -- linhas. Sem esta linha, a assercao de contagem do ERASE-08 sobre ela seria
    -- satisfeita TRIVIALMENTE e nao provaria nada (D-45-03).
    INSERT INTO public.decisao_final_historico
      (candidatura_id, decisao, justificativa, por_usuario, decidido_em)
    VALUES
      (v_candtr, 'em_espera',
       'SMOKE P45 fixture: justificativa arquivada, sintetica, com mais de cinquenta caracteres, exigida pela D-45-03.',
       v_admin_auth, now() - interval '20 days');

    -- (fixture 7/13) logs_acesso — `ip_address` e `inet NOT NULL`.
    INSERT INTO public.logs_acesso (user_id, evento, ip_address)
    VALUES (v_user, 'login_sucesso', '203.0.113.42'::inet)
    RETURNING id INTO v_logid;

    -- (fixture 8/13) autorizacoes — `ip_aceite` e prova de aceite: a linha fica, o
    -- endereco nao.
    INSERT INTO public.autorizacoes (candidato_id, user_id, ip_aceite, user_agent_aceite)
    VALUES (v_cand, v_user, '198.51.100.77'::inet, 'smoke-p45')
    RETURNING id INTO v_autid;

    -- (fixture 9/13) recruiter_alerts — SONDA 4e: ZERO linhas em PROD (D10).
    INSERT INTO public.recruiter_alerts (candidato_id, vaga_id, threshold_violated, message)
    VALUES (v_cand, v_vaga, 'smoke_p45_fixture', 'fixture sintetica do p45 smoke');

    -- (fixture 10/13) notificacoes_enviadas — `destinatario_email` E
    -- `destinatario_original`, ambos NOT NULL: o endereco e gravado DUAS vezes por
    -- linha, e NULL abortaria a transacao de anonimizacao inteira (Pitfall 12).
    INSERT INTO public.notificacoes_enviadas
      (candidato_id, candidatura_id, evento, template, dedupe_key,
       destinatario_email, destinatario_original, status)
    VALUES
      (v_cand, v_candtr, 'confirmacao', 'confirmacao_candidatura',
       'confirmacao:' || v_candtr::text || ':confirmacao',
       v_email_fix, v_email_fix, 'enviado')
    RETURNING id INTO v_notifid;

    -- (fixture 11/13) prompt_versions, SE nao houver nenhuma viva — ai_call_logs
    -- exige `prompt_version_id NOT NULL` com FK.
    IF v_pv IS NULL THEN
      INSERT INTO public.prompt_versions
        (call_type, semver, model_id, max_tokens, content_hash,
         change_summary, changed_by, system_template, user_template)
      VALUES
        ('cv_summary', '0.0.0-p45smoke', 'modelo-sintetico-p45', 256, 'p45smokehash',
         'fixture sintetica do p45 smoke', v_admin_auth::text, 'sistema', 'usuario')
      RETURNING id INTO v_pv;
    END IF;

    -- (fixture 12/13) ai_call_logs — SONDA 4e: ZERO linhas em PROD.
    INSERT INTO public.ai_call_logs
      (call_type, provider, model_id, prompt_hash, prompt_version_id,
       input_token_count, output_token_count, latency_ms, raw_response, retain_until,
       system_prompt, user_prompt_template, candidato_id, vaga_id)
    VALUES
      ('cv_summary', 'anthropic', 'modelo-sintetico-p45', 'p45smokehash', v_pv,
       1, 1, 1, '{}'::jsonb, now() + interval '30 days',
       'sistema', 'usuario', v_cand, v_vaga);

    -- (fixture 13/13) candidate_ai_decisions — SONDA 4e: ZERO linhas em PROD. O
    -- `ai_reasoning_summary` carrega texto sobre a PESSOA: e o conteudo que a
    -- assercao (B6) exige desidentificado quando a coluna de FK for NOT NULL (M2).
    INSERT INTO public.candidate_ai_decisions
      (candidato_id, vaga_id, ai_call_log_ids, ai_composite_score,
       ai_recommendation, ai_reasoning_summary)
    VALUES
      (v_cand, v_vaga, ARRAY[]::uuid[], 50.00,
       'review', 'SMOKE P45 fixture: sumario de raciocinio sintetico sobre o titular.')
    RETURNING id INTO v_aidec;

    -- ── B0: a fixture EXISTE, com enfase nas TRES tabelas em zero linhas ────────
    SELECT count(*) INTO v_n_aicall FROM public.ai_call_logs           WHERE candidato_id = v_cand;
    SELECT count(*) INTO v_n_aidec  FROM public.candidate_ai_decisions WHERE candidato_id = v_cand;
    SELECT count(*) INTO v_n_alerts FROM public.recruiter_alerts       WHERE candidato_id = v_cand;
    SELECT count(*) INTO v_n_notif  FROM public.notificacoes_enviadas  WHERE candidato_id = v_cand;
    SELECT count(*) INTO v_n_logs   FROM public.logs_acesso            WHERE user_id      = v_user;
    SELECT count(*) INTO v_n_aut    FROM public.autorizacoes           WHERE user_id      = v_user;

    -- ── B1: contagens da trilha ANTES do tombstone (ja com a fixture dentro) ────
    SELECT count(*) INTO v_hist_pre FROM public.historico_candidatura;
    SELECT count(*) INTO v_df_pre   FROM public.decisao_final;
    SELECT count(*) INTO v_dfh_pre  FROM public.decisao_final_historico;
    SELECT count(*) INTO v_df_tit   FROM public.decisao_final d
      JOIN public.candidaturas c ON c.id = d.candidatura_id WHERE c.candidato_id = v_cand;

    -- ── Estado ANTES, coluna a coluna ──────────────────────────────────────────
    SELECT c.nome_completo, c.email, c.cpf, c.celular, c.data_nascimento, c.genero,
           c.cidade, c.estado, c.como_conheceu,
           date_part('year', age(c.data_nascimento))::int
      INTO v_nome_a, v_email_a, v_cpf_a, v_cel_a, v_nasc_a, v_gen_a,
           v_cid_a, v_uf_a, v_conh_a, v_idade_a
      FROM public.candidatos c WHERE c.id = v_cand;

    SELECT cd.data_candidatura INTO v_dtcand_a FROM public.candidaturas cd WHERE cd.id = v_candtr;

    SELECT d.justificativa INTO v_just_a FROM public.decisao_final d WHERE d.candidatura_id = v_candtr;
    SELECT h.justificativa INTO v_justh_a FROM public.decisao_final_historico h WHERE h.candidatura_id = v_candtr LIMIT 1;
    -- ⚠ As tres linhas abaixo sao lidas POR ID, nunca pelo ponteiro ao titular. O
    -- tombstone severa exatamente esses ponteiros, entao reler por eles DEPOIS
    -- devolveria zero linhas e a assercao (B6) reprovaria a implementacao CORRETA.
    SELECT l.ip_address    INTO v_ip_log_a FROM public.logs_acesso l  WHERE l.id = v_logid;
    SELECT a.ip_aceite     INTO v_ip_aut_a FROM public.autorizacoes a WHERE a.id = v_autid;
    SELECT n.dedupe_key, n.destinatario_email, n.destinatario_original
      INTO v_dedupe_a, v_dest_a, v_desto_a
      FROM public.notificacoes_enviadas n WHERE n.id = v_notifid;
    SELECT x.ai_reasoning_summary INTO v_airsum_a FROM public.candidate_ai_decisions x WHERE x.id = v_aidec;

    SELECT count(*) INTO v_aud_a FROM public.logs_auditoria;

    -- nullability MEDIDA AO VIVO — nunca lida de arquivo (Pitfall 9)
    SELECT a.attnotnull INTO v_nn_cpf FROM pg_attribute a
     WHERE a.attrelid = 'public.candidatos'::regclass AND a.attname = 'cpf' AND NOT a.attisdropped;
    SELECT a.attnotnull INTO v_nn_aidec_c FROM pg_attribute a
     WHERE a.attrelid = 'public.candidate_ai_decisions'::regclass AND a.attname = 'candidato_id' AND NOT a.attisdropped;
    SELECT a.attnotnull INTO v_nn_aidec_v FROM pg_attribute a
     WHERE a.attrelid = 'public.candidate_ai_decisions'::regclass AND a.attname = 'vaga_id' AND NOT a.attisdropped;

    -- ── B2: O CAMINHO FELIZ ────────────────────────────────────────────────────
    -- Impersonacao de `administrador` — papel REAL e nomeado. E deliberado que o
    -- motor NAO seja chamavel sem claim nenhuma: (C2) assere essa recusa para as
    -- cinco funcoes, o que torna "passar claims" uma obrigacao declarada da Edge
    -- Function do 45-10, e nao um detalhe que ela descobre em producao.
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);

    SELECT public.anonimizar_candidato(v_cand, false)::text INTO v_ret;

    -- Marco de auditoria APOS a primeira execucao. A assercao (B4) mede o delta da
    -- SEGUNDA chamada — usar o marco pre-tombstone contaria as linhas legitimas da
    -- primeira e reprovaria a implementacao correta.
    SELECT count(*) INTO v_aud_mid FROM public.logs_auditoria;

    -- ── Estado DEPOIS ──────────────────────────────────────────────────────────
    SELECT c.nome_completo, c.email, c.cpf, c.celular, c.data_nascimento, c.genero,
           c.cidade, c.estado, c.como_conheceu, c.user_id
      INTO v_nome_d, v_email_d, v_cpf_d, v_cel_d, v_nasc_d, v_gen_d,
           v_cid_d, v_uf_d, v_conh_d, v_uid_d
      FROM public.candidatos c WHERE c.id = v_cand;

    SELECT count(*) INTO v_hist_pos FROM public.historico_candidatura;
    SELECT count(*) INTO v_df_pos   FROM public.decisao_final;
    SELECT count(*) INTO v_dfh_pos  FROM public.decisao_final_historico;

    SELECT d.justificativa INTO v_just_d FROM public.decisao_final d WHERE d.candidatura_id = v_candtr;

    -- M1: o arquivo pode ter GANHADO linha (o trigger AFTER UPDATE a insere com o
    -- OLD.justificativa). O que NAO pode e sobrar linha identificavel.
    SELECT count(*) INTO v_justh_ident
      FROM public.decisao_final_historico h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
     WHERE c.candidato_id = v_cand
       AND (h.justificativa = v_justh_a OR h.justificativa = v_just_a);

    SELECT count(*) INTO v_justh_ator
      FROM public.decisao_final_historico h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
     WHERE c.candidato_id = v_cand AND h.por_usuario = v_user;

    SELECT l.ip_address INTO v_ip_log_d FROM public.logs_acesso l  WHERE l.id = v_logid;
    SELECT a.ip_aceite  INTO v_ip_aut_d FROM public.autorizacoes a WHERE a.id = v_autid;
    SELECT n.dedupe_key, n.destinatario_email, n.destinatario_original
      INTO v_dedupe_d, v_dest_d, v_desto_d
      FROM public.notificacoes_enviadas n WHERE n.id = v_notifid;
    SELECT x.ai_reasoning_summary INTO v_airsum_d FROM public.candidate_ai_decisions x WHERE x.id = v_aidec;

    -- ── B6: severacao das 5 tabelas SET NULL, medida por POS-ESTADO ────────────
    SELECT count(*) INTO v_p_aicall FROM public.ai_call_logs           WHERE candidato_id = v_cand;
    SELECT count(*) INTO v_p_aidec  FROM public.candidate_ai_decisions WHERE candidato_id = v_cand;
    SELECT count(*) INTO v_p_logs   FROM public.logs_acesso            WHERE user_id      = v_user;
    SELECT count(*) INTO v_p_alerts FROM public.recruiter_alerts       WHERE candidato_id = v_cand;
    SELECT count(*) INTO v_p_aut    FROM public.autorizacoes           WHERE user_id      = v_user;

    -- ── B8: ERASE-10, escopado ao titular ──────────────────────────────────────
    -- ⚠ Escopado, e nao global: PROD tem 22 candidatos vivos com user_id vivo
    -- (SONDA 4e). Uma assercao global de "zero candidatos com user_id em
    -- auth.users" reprovaria o banco inteiro e nao diria nada sobre a exclusao.
    SELECT count(*) INTO v_uid_viva
      FROM public.candidatos c
     WHERE c.id = v_cand AND c.user_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id);

    SELECT count(*) INTO v_ator_tit
      FROM public.historico_candidatura h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
     WHERE c.candidato_id = v_cand AND h.ator = v_user;

    -- ── B9: RE-IDENTIFICACAO COMO GATE ─────────────────────────────────────────
    -- Os quase-identificadores que sobrevivem por desenho: a UF (preservada), a
    -- vaga e o timestamp da candidatura (a trilha nao e tocada). Se a faixa etaria
    -- tambem sobreviver, os quatro juntos apontam para UMA pessoa.
    SELECT count(*) INTO v_reid
      FROM public.candidatos c
      JOIN public.candidaturas cd ON cd.candidato_id = c.id
     WHERE cd.vaga_id          = v_vaga
       AND cd.data_candidatura = v_dtcand_a
       AND c.estado            = v_uf_a
       AND date_part('year', age(c.data_nascimento))::int BETWEEN v_idade_a - 2 AND v_idade_a + 2;

    -- ── B4: IDEMPOTENCIA POR ESTADO ────────────────────────────────────────────
    SELECT public.anonimizar_candidato(v_cand, false)::text INTO v_ret2;

    SELECT count(*) INTO v_mudou2
      FROM public.candidatos c
     WHERE c.id = v_cand
       AND (c.nome_completo   IS DISTINCT FROM v_nome_d
         OR c.email           IS DISTINCT FROM v_email_d
         OR c.cpf             IS DISTINCT FROM v_cpf_d
         OR c.celular         IS DISTINCT FROM v_cel_d
         OR c.data_nascimento IS DISTINCT FROM v_nasc_d
         OR c.genero          IS DISTINCT FROM v_gen_d
         OR c.cidade          IS DISTINCT FROM v_cid_d
         OR c.estado          IS DISTINCT FROM v_uf_d
         OR c.user_id         IS DISTINCT FROM v_uid_d);

    SELECT count(*) - v_aud_mid INTO v_aud_delta FROM public.logs_auditoria;

    PERFORM set_config('request.jwt.claims', '', false);

    RAISE EXCEPTION 'rollback_smoke45m_bloco_b' USING ERRCODE = 'P45B0';
  EXCEPTION
    WHEN sqlstate 'P45B0' THEN
      NULL;  -- reversao ESPERADA; as variaveis acima sobreviveram ao rollback
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- JULGAMENTO — fora da subtransacao. Ordem deliberada (ver cabecalho do bloco).
  -- ═══════════════════════════════════════════════════════════════════════════

  -- (B0) A FIXTURE EXISTE — e a ausencia dela e FALHA DE TESTE, nunca verde.
  IF v_n_aicall <> 1 OR v_n_aidec <> 1 OR v_n_alerts <> 1 THEN
    RAISE EXCEPTION 'P45M FAIL (B0): a fixture das TRES tabelas medidas em ZERO linhas em PROD nao foi criada (ai_call_logs=%, candidate_ai_decisions=%, recruiter_alerts=%, esperado 1 em cada). Sem fixture, TODA assercao sobre o tratamento delas passa por VACUIDADE e conta como verde — que e exatamente o modo de falha que a SONDA 4e (D10) mandou fechar. Ausencia de fixture e FALHA DE TESTE', v_n_aicall, v_n_aidec, v_n_alerts;
  END IF;
  IF v_n_notif <> 1 OR v_n_logs <> 1 OR v_n_aut <> 1 THEN
    RAISE EXCEPTION 'P45M FAIL (B0): fixture incompleta em notificacoes_enviadas=%, logs_acesso=%, autorizacoes=% (esperado 1 em cada)', v_n_notif, v_n_logs, v_n_aut;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B0): fixture completa nas 3 tabelas em zero + ledger + logs + autorizacoes';

  -- (B1) A FIXTURE MOVEU AS CONTAGENS — senao (B7) seria verde por vacuidade.
  IF v_hist_pre <> current_setting('smoke45m.hist')::bigint + 1
     OR v_df_pre <> current_setting('smoke45m.df')::bigint + 1
     OR v_dfh_pre <> current_setting('smoke45m.dfh')::bigint + 1 THEN
    RAISE EXCEPTION 'P45M FAIL (B1): a fixture nao moveu a trilha como esperado (historico %->%; decisao_final %->%; decisao_final_historico %->%). A SONDA 4e mediu decisao_final_historico em ZERO: sem linha sintetica ali, a assercao de contagem do ERASE-08 sobre ela e satisfeita TRIVIALMENTE e nao prova nada',
      current_setting('smoke45m.hist'), v_hist_pre, current_setting('smoke45m.df'), v_df_pre, current_setting('smoke45m.dfh'), v_dfh_pre;
  END IF;
  IF v_df_tit <> 1 THEN
    RAISE EXCEPTION 'P45M FAIL (B1): o titular sintetico tem % linha(s) em decisao_final, esperado 1 — a D-45-02 nao teria o que preservar anonimizado', v_df_tit;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B1): trilha com fixture dentro — historico=%, decisao_final=%, decisao_final_historico=% (esta ultima saiu de zero)', v_hist_pre, v_df_pre, v_dfh_pre;

  -- (B2) CAMINHO FELIZ — a funcao COMPLETOU. Nao "nao lancou".
  IF v_ret IS NULL OR btrim(v_ret) = '' THEN
    RAISE EXCEPTION 'P45M FAIL (B2): anonimizar_candidato(id, p_dry_run := false) nao devolveu nada. A assercao e sobre COMPLETUDE, nao sobre ausencia de excecao: uma funcao que retorna vazio nao provou que chegou ao fim do corpo';
  END IF;
  IF v_email_d IS NOT DISTINCT FROM v_email_a THEN
    RAISE EXCEPTION 'P45M FAIL (B2): a funcao retornou (%) mas o e-mail do titular NAO mudou — ela nao executou o tombstone. As SETE CHECKs vivas de candidatos (check_email_format, check_cpf_format, check_celular_format, check_data_nascimento, check_genero, check_estado, check_como_conheceu) e os NOT NULL medidos so sao exercitados por um caminho que PASSA; uma sentinela plausivel-mas-invalida aborta a transacao inteira com check_violation, e e esse desfecho que esta assercao existe para pegar ANTES do primeiro pedido real', v_ret;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B2): o tombstone COMPLETOU contra as 7 CHECKs vivas e devolveu %', v_ret;

  -- (B7) ⊖ NEGATIVA (ERASE-08) — a trilha de decisao sobreviveu.
  --      Ver (M1) no cabecalho: a forma desta assercao e MEDIDA, nao literal.
  IF v_hist_pos <> v_hist_pre THEN
    RAISE EXCEPTION 'P45M FAIL (B7): historico_candidatura saiu de % para % linhas durante o tombstone. A trilha que a RNF-07a existe para proteger acabou de ser tocada, e o ERASE-08 proibe isso: a saida e anonimizar a linha filha e severar o ponteiro, NUNCA apagar a linha nem relaxar a FK', v_hist_pre, v_hist_pos;
  END IF;
  IF v_df_pos <> v_df_pre THEN
    RAISE EXCEPTION 'P45M FAIL (B7): decisao_final saiu de % para % linhas. A D-45-02 manda PRESERVAR ANONIMIZADA — tratar por tombstone/desvinculacao, nunca por DELETE', v_df_pre, v_df_pos;
  END IF;
  IF v_dfh_pos < v_dfh_pre THEN
    RAISE EXCEPTION 'P45M FAIL (B7): decisao_final_historico DECRESCEU de % para % linhas — alguem apagou do arquivo. Zero apagamento e exatamente o que o ERASE-08 garante, e a FK dele segue NO ACTION (A1) justamente para tornar isso dificil', v_dfh_pre, v_dfh_pos;
  END IF;
  IF v_dfh_pos > v_dfh_pre + v_df_tit THEN
    RAISE EXCEPTION 'P45M FAIL (B7): decisao_final_historico cresceu de % para % linhas, mais do que as % linha(s) de decisao_final do titular que o tombstone atualizou. O crescimento esperado vem do trg_decisao_final_snapshot (AFTER UPDATE, sem WHEN), um por UPDATE; qualquer excedente e escrita que ninguem previu', v_dfh_pre, v_dfh_pos, v_df_tit;
  END IF;
  IF v_justh_ident <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B7): % linha(s) de decisao_final_historico do titular ainda carregam justificativa IDENTIFICAVEL. Este e o achado M1 mordendo: trg_decisao_final_snapshot (20260709000011:105-118) e AFTER UPDATE ON decisao_final SEM clausula WHEN, e insere OLD.justificativa no arquivo — ou seja, o proprio UPDATE de anonimizacao RECRIA no historico a PII que acabou de remover da linha corrente. O operador antecipou isto por escrito ao travar a BD-9: "o historico entrega o que a linha corrente protege". CONSERTO NO 45-07: o scrub de decisao_final_historico tem de ser o ULTIMO statement a tocar o par, DEPOIS do UPDATE em decisao_final — faze-lo antes deixa uma linha identificavel recem-criada atras dele', v_justh_ident;
  END IF;
  IF v_justh_ator <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B7): % linha(s) de decisao_final_historico do titular ainda tem por_usuario apontando ao titular', v_justh_ator;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B7): trilha intacta (historico %=%, decisao_final %=%), arquivo sem decrescimo (%->%, teto %+%) e ZERO justificativa identificavel do titular',
    v_hist_pre, v_hist_pos, v_df_pre, v_df_pos, v_dfh_pre, v_dfh_pos, v_dfh_pre, v_df_tit;

  -- (B8) ⊖ NEGATIVA (ERASE-10)
  IF v_uid_viva <> 0 OR v_uid_d IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B8): o titular anonimizado ainda tem user_id (%) apontando para linha VIVA de auth.users. O ERASE-10 exige a severacao ANTES do deleteUser: com o ponteiro de pe, apagar o usuario cascateia candidatos -> candidaturas e bate nas 3 FKs NO ACTION com 23503 — e se isso acontecer depois do passo de Storage, o curriculo ja foi apagado e nao ha PITR nem backup de Storage para trazer de volta', v_uid_d;
  END IF;
  IF v_ator_tit <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B8): % linha(s) de historico_candidatura ainda tem ator apontando ao titular anonimizado', v_ator_tit;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B8): user_id severado e zero historico_candidatura.ator apontando ao titular';

  -- (B3) POS-ESTADO COLUNA A COLUNA, contra as constraints VIVAS.
  IF v_email_d !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'P45M FAIL (B3/email): a sentinela % nao casa o check_email_format vivo', v_email_d;
  END IF;
  IF (SELECT count(*) FROM public.candidatos c WHERE c.email = v_email_d) <> 1 THEN
    RAISE EXCEPTION 'P45M FAIL (B3/email): a sentinela de e-mail nao e unica por linha. A coluna e NOT NULL + UNIQUE + CHECK de formato (D5): uma sentinela FIXA colide na SEGUNDA exclusao e aborta a transacao inteira de quem pediu depois';
  END IF;
  IF v_cel_d !~ '^\(\d{2}\) \d{5}-\d{4}$' THEN
    RAISE EXCEPTION 'P45M FAIL (B3/celular): a sentinela % nao casa o check_celular_format vivo — a coluna e NOT NULL e um marcador em prosa ([removido]) aborta a transacao', v_cel_d;
  END IF;
  IF v_nasc_d IS NULL OR v_nasc_d >= CURRENT_DATE OR v_nasc_d = v_nasc_a THEN
    RAISE EXCEPTION 'P45M FAIL (B3/data_nascimento): valor % — tem de ser NAO-NULO, no passado (check_data_nascimento) e DIFERENTE do original. E a coluna cuja faixa etaria o ERASE-01 materializa ANTES desta escrita', v_nasc_d;
  END IF;
  IF v_uf_d IS NULL OR NOT (v_uf_d::text = ANY (v_ufs)) THEN
    RAISE EXCEPTION 'P45M FAIL (B3/estado): valor % nao esta entre as 27 UFs do check_estado vivo. Nao existe valor "removido" valido para esta coluna: a decisao registrada e PRESERVAR a UF com base legal no COMMENT, nunca inventar sentinela que a CHECK recusa', v_uf_d;
  END IF;
  IF v_nn_cpf IS DISTINCT FROM true AND v_cpf_d IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B3/cpf): a coluna e NULAVEL no catalogo vivo (SONDA 1a / D4) e o CPF deveria ter ido a NULL, mas ficou %. O mapa de nullability NAO pode ser lido de docs/sql/sql/02-tabela-candidatos.sql, que declara NOT NULL e diverge do catalogo (Pitfall 9)', v_cpf_d;
  END IF;
  IF v_nn_cpf IS true AND (v_cpf_d IS NULL OR v_cpf_d = v_cpf_a OR v_cpf_d !~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$') THEN
    RAISE EXCEPTION 'P45M FAIL (B3/cpf): a coluna e NOT NULL no catalogo vivo, entao a sentinela tem de ser unica e NO FORMATO do check_cpf_format — veio %', coalesce(v_cpf_d, '<nulo>');
  END IF;
  IF v_gen_d IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B3/genero): valor % — a coluna e NULAVEL (SONDA 1a) e CHECK sobre NULL e NULL, entao NULL passa e e o tratamento correto', v_gen_d;
  END IF;
  IF v_conh_d IS NOT NULL AND NOT (v_conh_d = ANY (v_conhecidos)) THEN
    RAISE EXCEPTION 'P45M FAIL (B3/como_conheceu): valor % nao esta no check_como_conheceu — a SETIMA CHECK, que a pesquisa NAO previu (D2). A coluna e nulavel, entao NULL resolve', v_conh_d;
  END IF;
  IF v_nome_d IS NULL OR v_nome_d = v_nome_a OR v_cid_d IS NULL OR v_cid_d = v_cid_a THEN
    RAISE EXCEPTION 'P45M FAIL (B3/nome_cidade): nome=% e cidade=% — as duas sao NOT NULL sem CHECK de formato, e as duas tem de mudar', coalesce(v_nome_d, '<nulo>'), coalesce(v_cid_d, '<nulo>');
  END IF;
  IF v_just_d IS NULL OR btrim(v_just_d) = '' OR v_just_d = v_just_a THEN
    RAISE EXCEPTION 'P45M FAIL (B3/decisao_final.justificativa): valor %. A D-45-02 manda PRESERVAR ANONIMIZADA: o texto sobrevive como prova de nao-discriminacao (Art. 7o, VI / RNF-07a), o vinculo com o titular nao. A coluna e NOT NULL — nunca NULL, nunca DELETE da linha', coalesce(v_just_d, '<nulo>');
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B3): pos-estado coerente com as 7 CHECKs vivas e com a nullability MEDIDA (cpf notnull=%)', v_nn_cpf;

  -- (B4) IDEMPOTENCIA POR ESTADO — nunca por try/catch.
  IF v_mudou2 <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B4): a segunda chamada MUTOU a linha. A idempotencia tem de ser por ESTADO — o predicado reconhece a sentinela e retorna sem tocar em nada. Apagar de novo "porque nao da erro" funciona por acidente e para de funcionar no dia em que a enumeracao devolver algo novo, e nesse dia a evidencia de que ja tinha rodado nao existe';
  END IF;
  IF v_aud_delta <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B4): a segunda chamada acrescentou % linha(s) em logs_auditoria — um no-op que audita nao e um no-op, e a trilha passa a registrar exclusoes que nao aconteceram', v_aud_delta;
  END IF;
  IF v_ret2 IS NULL OR v_ret2 !~* 'ja_anonimizado' THEN
    RAISE EXCEPTION 'P45M FAIL (B4): a segunda chamada devolveu %, e o contrato do 45-07 e retornar ja_anonimizado quando a sentinela e reconhecida. Um retorno indistinguivel do primeiro impede o chamador de saber se ele acabou de apagar algo ou nao', coalesce(v_ret2, '<nulo>');
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B4): re-execucao e no-op por ESTADO — zero coluna mudada, zero linha nova em logs_auditoria (a 1a execucao auditou %), retorno %', v_aud_mid - v_aud_a, v_ret2;

  -- (B5) ⊖ NEGATIVA — SEM ESTADO INTERMEDIARIO OBSERVAVEL.
  v_mudadas := 0;
  IF v_nome_d  IS DISTINCT FROM v_nome_a  THEN v_mudadas := v_mudadas + 1; END IF;
  IF v_email_d IS DISTINCT FROM v_email_a THEN v_mudadas := v_mudadas + 1; END IF;
  IF v_cel_d   IS DISTINCT FROM v_cel_a   THEN v_mudadas := v_mudadas + 1; END IF;
  IF v_nasc_d  IS DISTINCT FROM v_nasc_a  THEN v_mudadas := v_mudadas + 1; END IF;
  IF v_mudadas <> 4 THEN
    RAISE EXCEPTION 'P45M FAIL (B5): apenas % de 4 colunas identificantes mudaram — existe estado INTERMEDIARIO observavel (por exemplo nome anonimizado com CPF intacto). A metade Postgres e UMA transacao, e essa e a unica atomicidade que a fase tem: uma interrupcao deixa a linha INTEIRAMENTE nao-anonimizada, nunca meio anonimizada', v_mudadas;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B5): tudo-ou-nada — as 4 colunas identificantes mudaram juntas';

  -- (B6) AS 5 TABELAS `SET NULL`, POR POS-ESTADO E NUNCA POR ORDEM.
  --      A ordem relativa das severacoes nao e observavel de fora (mesma transacao);
  --      um teste que dependesse dela estaria medindo implementacao, nao contrato.
  IF v_p_aicall <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B6/ai_call_logs): % linha(s) ainda apontam ao titular (candidato_id e nulavel — nao ha desculpa estrutural)', v_p_aicall;
  END IF;
  IF v_p_logs <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B6/logs_acesso): % linha(s) ainda apontam ao titular por user_id', v_p_logs;
  END IF;
  IF v_p_alerts <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B6/recruiter_alerts): % linha(s) ainda apontam ao titular', v_p_alerts;
  END IF;
  IF v_p_aut <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B6/autorizacoes): % linha(s) ainda apontam ao titular por user_id (a FK SET NULL do ERASE-09 e esta; autorizacoes.candidato_id e CASCADE — sao FKs distintas, D8)', v_p_aut;
  END IF;
  -- M2: leitura dinamica de attnotnull para o PAR de colunas inexequiveis.
  IF v_nn_aidec_c IS DISTINCT FROM true THEN
    IF v_p_aidec <> 0 THEN
      RAISE EXCEPTION 'P45M FAIL (B6/candidate_ai_decisions): candidato_id e NULAVEL no catalogo vivo e ainda ha % linha(s) apontando ao titular — a severacao e possivel e nao foi feita', v_p_aidec;
    END IF;
  ELSE
    IF v_airsum_d IS NOT DISTINCT FROM v_airsum_a THEN
      RAISE EXCEPTION 'P45M FAIL (B6/candidate_ai_decisions): candidato_id e NOT NULL (%) e vaga_id e NOT NULL (%) no catalogo vivo, as duas com ON DELETE SET NULL — clausulas INEXEQUIVEIS (apagar a linha referenciada tentaria gravar NULL em coluna NOT NULL e levantaria 23502). O ponteiro nao pode ser severado, entao o CONTEUDO tinha de ser desidentificado, e ai_reasoning_summary continua identico ao original. O 45-07 escolhe explicitamente entre afrouxar AS DUAS colunas e desidentificar o conteudo — o que ele nao pode e deixar as duas coisas de pe (achado M2)', v_nn_aidec_c, v_nn_aidec_v;
    END IF;
  END IF;
  IF v_ip_log_d IS NULL OR v_ip_log_d = v_ip_log_a THEN
    RAISE EXCEPTION 'P45M FAIL (B6/logs_acesso.ip_address): valor %. E `inet NOT NULL`: tem de ser TRUNCADO ou MASCARADO, e NUNCA nulo — NULL aborta a transacao de anonimizacao inteira', coalesce(v_ip_log_d::text, '<nulo>');
  END IF;
  IF v_ip_aut_d IS NULL OR v_ip_aut_d = v_ip_aut_a THEN
    RAISE EXCEPTION 'P45M FAIL (B6/autorizacoes.ip_aceite): valor %. E prova de aceite: a linha fica, o endereco nao — mascarado, nunca nulo', coalesce(v_ip_aut_d::text, '<nulo>');
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B6): as 5 tabelas SET NULL tratadas por pos-estado; os 2 inet mascarados e nao nulos';

  -- (B9) RE-IDENTIFICACAO COMO GATE — a unica assercao da fase que prova
  --      IRREVERSIBILIDADE em vez de apagamento.
  IF v_reid <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B9): ACHEI O TITULAR — % linha(s) devolvidas por (faixa etaria %+-2 + UF % + vaga + timestamp da candidatura). A ANONIMIZACAO FALHOU. A UF, a vaga e o timestamp sobrevivem por desenho (a trilha nao e tocada); e a faixa etaria que tem de deixar de casar, e ela so deixa se data_nascimento receber sentinela DEPOIS de a faixa ter sido materializada em faixa_etaria_materializada (ERASE-01 / SC#5). Apagar dados nao basta: o que resta nao pode reconstituir a pessoa', v_reid, v_idade_a, v_uf_a;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B9): zero linhas ao buscar o titular por (faixa % + UF % + vaga + timestamp)', v_idade_a, v_uf_a;

  -- (B10) O LEDGER DE E-MAIL — sentinela nos dois enderecos + dedupe re-namespaceada.
  IF v_dest_d IS NULL OR v_desto_d IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B10): destinatario_email=% / destinatario_original=% — os DOIS sao NOT NULL e o endereco e gravado DUAS vezes por linha. NULL aborta a transacao de anonimizacao inteira: a sentinela nao e conveniencia, e requisito', coalesce(v_dest_d, '<nulo>'), coalesce(v_desto_d, '<nulo>');
  END IF;
  IF v_dest_d = v_dest_a OR v_desto_d = v_desto_a THEN
    RAISE EXCEPTION 'P45M FAIL (B10): o endereco do titular sobreviveu no ledger (email igual=%, original igual=%) — o inventario classifica as duas colunas como apagar', (v_dest_d = v_dest_a), (v_desto_d = v_desto_a);
  END IF;
  IF v_dedupe_d IS NULL OR v_dedupe_d = v_dedupe_a THEN
    RAISE EXCEPTION 'P45M FAIL (B10): dedupe_key nao foi re-namespaceada (%). O formato e {evento}:{candidatura_id}:{discriminador} e a coluna e UNIQUE: com a chave preservada, um recadastro futuro COLIDE, o claim INSERT ... ON CONFLICT DO NOTHING RETURNING id volta VAZIO, e o e-mail legitimo NUNCA E ENVIADO — sem erro em lugar nenhum (Pitfall 8, item 2)', coalesce(v_dedupe_d, '<nulo>');
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B10): ledger com sentinela nos dois enderecos e dedupe_key re-namespaceada';
END
$bloco_b$;
