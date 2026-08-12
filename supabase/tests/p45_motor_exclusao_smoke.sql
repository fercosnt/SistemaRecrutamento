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
-- GATE VERDE = o contador `smoke45m.pass` bate **24** no RESUMO (z). O gate NAO e
-- "nao levantou excecao": um run parcial acumula < 24 e o RESUMO reprova ALTO.
-- Esperado FIXO — nao ha metade adaptativa, nao ha "pelo menos N".
-- ⚠ O contador subiu de 21 para 23 no plano 45-13: (C7), o guard de INTENCAO (CR-01),
-- e (B11), o ponteiro reverso de candidaturas (CR-04). Subiu de 23 para 24 no plano
-- 45-14: (C8), `p_dry_run := NULL` resolvendo para o lado SEGURO (BL-01). Acrescentar
-- bloco sem bumpar este numero transforma uma adicao legitima em reprovacao do RESUMO.
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
-- AS 24 ASSERCOES — dezesseis delas NEGATIVAS
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
--   (B11) ⊖ NEGATIVA (CR-04, 45-13) — `candidaturas.curriculo_url` e
--        `curriculo_nome_original` NAO sobrevivem ao tombstone: o primeiro embute o
--        `auth.uid()` em claro e resolve de volta a `auth.users` por `split_part`, o
--        segundo carrega o NOME e e lido pelo painel de triagem. As LINHAS ficam.
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
--   (C7) ⊖ NEGATIVA (CR-01, 45-13) — o guard de INTENCAO: a chamada REAL feita por
--        `administrador` sobre um candidato SEM pedido em execucao recusa com `42501`
--        ANTES de tocar coluna alguma. `P0002` ali significa que a metade (c) sumiu.
--   (C8) ⊖ NEGATIVA (BL-01, 45-14) — `p_dry_run := NULL` NAO e intencao de apagar: a
--        chamada com o parametro NULO sobre uma linha REAL termina em `P45DR` com a
--        linha intacta. Precisa de fixture porque contra uuid inexistente a versao
--        defeituosa e a corrigida dao o mesmo `P0002`, e a (C7) chama com `false`
--        literal — foi por isso que o defeito passou pelas duas suites.
--   (z)  RESUMO — ⊖ negativa global de residuo + gate de contagem FIXO em 24.
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

  -- ⚠ 45-13 / CR-04 — o ponteiro reverso em candidaturas
  v_cv_url_a    text;
  v_cv_nome_a   text;
  v_cv_url_d    text;
  v_cv_nome_d   text;
  v_cands_a     int;
  v_cands_d     int;
  v_reid_cv     int;

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
  IF to_regprocedure('public.anonimizar_candidato(uuid, boolean)') IS NULL THEN
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
    -- ⚠ 45-13 / CR-04: `curriculo_url` nasce no esquema REAL (`{authUid}/{uuid}.pdf`,
    -- cvUploadService.ts:101) e `curriculo_nome_original` com um nome dentro, que e o
    -- formato que chega ao painel de triagem do RH. Sem estes dois valores a assercao
    -- (B11) mediria NULL contra NULL e passaria por VACUIDADE.
    INSERT INTO public.candidaturas
      (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura,
       curriculo_url, curriculo_nome_original)
    VALUES
      (v_cand, v_vaga, 'triagem', 'rejeitado', false, now() - interval '31 days',
       v_user::text || '/' || gen_random_uuid()::text || '.pdf',
       'Curriculo_Titular_Sintetico_P45_2026.pdf')
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

    SELECT cd.data_candidatura, cd.curriculo_url, cd.curriculo_nome_original
      INTO v_dtcand_a, v_cv_url_a, v_cv_nome_a
      FROM public.candidaturas cd WHERE cd.id = v_candtr;

    SELECT count(*) INTO v_cands_a FROM public.candidaturas cd WHERE cd.candidato_id = v_cand;

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

    -- (fixture 14, acrescentada pelo 45-13) ⚠ O PEDIDO QUE O GUARD DE INTENCAO EXIGE.
    -- A metade (c) de `anonimizar_candidato` (CR-01) recusa a chamada REAL que nao
    -- venha de dentro do motor. Sem esta linha, o caminho feliz (B2) receberia `42501`
    -- e o smoke reprovaria a implementacao CORRETA. Os tres valores sao exatamente o
    -- estado que so o motor produz: pedido em execucao, janela do D-45-01 VENCIDA e o
    -- passo 1 do Storage CARIMBADO — e e por isso que ela nasce aqui e nao antes: ela
    -- e parte do cenario, nao preparacao de ambiente.
    INSERT INTO public.solicitacoes_dados
      (candidato_id, tipo, situacao, solicitado_em, executar_em, storage_concluido_em)
    VALUES
      (v_cand, 'exclusao', 'executando', now() - interval '16 days',
       now() - interval '1 day', now() - interval '1 minute');

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

    -- ── B11: ⊖ CR-04 — O PONTEIRO REVERSO DE `candidaturas` ────────────────────
    -- A consulta de re-identificacao e a do 45-REVIEW.md, verbatim na forma:
    -- split_part(curriculo_url, '/', 1) resolve o auth.uid() e o join devolve a
    -- identidade completa. ZERO e a unica resposta aceitavel; as LINHAS ficam.
    SELECT cd.curriculo_url, cd.curriculo_nome_original
      INTO v_cv_url_d, v_cv_nome_d
      FROM public.candidaturas cd WHERE cd.id = v_candtr;

    SELECT count(*) INTO v_cands_d FROM public.candidaturas cd WHERE cd.candidato_id = v_cand;

    SELECT count(*) INTO v_reid_cv
      FROM public.candidaturas cd
      JOIN auth.users u ON u.id::text = split_part(cd.curriculo_url, '/', 1)
     WHERE cd.candidato_id = v_cand;

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

  -- (B11) ⊖ NEGATIVA (CR-04, 45-13) — O PONTEIRO REVERSO NAO SOBREVIVE.
  --       A primeira perna e obrigatoria e nao e decorativa: se a fixture nascesse sem
  --       curriculo_url, as duas negativas seriam verdadeiras por VACUIDADE.
  IF v_cv_url_a IS NULL OR v_cv_nome_a IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B11): a fixture nasceu SEM curriculo_url (%) ou SEM curriculo_nome_original (%) — as negativas abaixo passariam por VACUIDADE. Ausencia de fixture e FALHA DE TESTE', coalesce(v_cv_url_a, '<nulo>'), coalesce(v_cv_nome_a, '<nulo>');
  END IF;
  IF v_cv_url_d IS NOT NULL OR v_cv_nome_d IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B11): candidaturas.curriculo_url=% e curriculo_nome_original=% SOBREVIVERAM ao tombstone. A primeira embute o auth.uid() EM CLARO (esquema {authUid}/{uuid}.pdf, cvUploadService.ts:101) e resolve de volta ate auth.users por split_part + join — a identidade COMPLETA do titular "anonimizado", por UMA linha, sem precisar de quase-identificador nenhum. A segunda costuma carregar o NOME da pessoa e e lida pelo painel de triagem do RH (20260623000001:24) numa linha cujo candidato ja e um tombstone. Isso e pseudonimizacao apresentada como anonimizacao, e a assercao (B9) NAO pega este vetor', coalesce(v_cv_url_d, '<nulo>'), coalesce(v_cv_nome_d, '<nulo>');
  END IF;
  IF v_reid_cv <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B11): a consulta de re-identificacao por curriculo_url devolveu % linha(s) — split_part(curriculo_url, /, 1) ainda casa uma conta VIVA de auth.users', v_reid_cv;
  END IF;
  IF v_cands_d <> v_cands_a OR v_cands_a <> 1 THEN
    RAISE EXCEPTION 'P45M FAIL (B11/ERASE-08): as LINHAS de candidaturas do titular foram de % para %. A severacao e de DUAS COLUNAS e nunca de linha: as candidaturas sobrevivem por desenho, e apagar linha ali destruiria a trilha que a RNF-07a existe para proteger (e as 3 FKs NO ACTION da A1 existem justamente para tornar isso dificil)', v_cands_a, v_cands_d;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B11): curriculo_url e curriculo_nome_original severadas, re-identificacao por split_part devolvendo zero, e a LINHA de candidaturas de pe (% antes, % depois)', v_cands_a, v_cands_d;
END
$bloco_b$;


-- ═════════════════════════════════════════════════════════════════════════════
-- BLOCO C — SEGURANCA DAS FUNCOES NOVAS, NAO-DIVERGENCIA DO DRY-RUN, E OS DOIS
--           NEGATIVOS DO ENCERRAMENTO.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- (C1) ACL DIFERENCIADA POR FUNCAO — `anon`/PUBLIC PROIBIDOS NAS CINCO, e
--      `authenticated` EXIGIDO nas QUATRO alcancaveis pelo titular.
--
--      ⚠ REESCRITA PELO PLANO 45-12, E A PREMISSA MUDOU POR ESCRITO. A versao
--      anterior reprovava QUALQUER `EXECUTE` para papel de cliente nas cinco. Isso
--      deixou de ser verdade para quatro delas, e a razao e mecanica: a Edge Function
--      `executar-direito-titular` passou a chamar as RPCs por um client com service
--      key **e** o `Authorization` do titular, e o PostgREST deriva o PAPEL do MESMO
--      JWT que carrega as claims — esse client chega como `authenticated`. Sem o
--      `GRANT` correspondente (migration `20260805000009`), `auth.uid()` continua
--      NULO dentro das RPCs, elas recusam com `42501`, e o motor nao roda
--      (`DI-45-10-01`).
--
--      **O CONTROLE NAO FOI REMOVIDO: ELE MUDOU DE CAMADA** — de ACL para o guard do
--      corpo, e a assercao (C2) abaixo prova que ele morde. O precedente e a Phase
--      44, cujas RPCs sao concedidas a `authenticated` com exatamente essa divisao.
--
--      ⚠ A VERIFICACAO QUE AUTORIZA ESTA REESCRITA, e ela e verificavel sem apply
--      nenhum: as DEZ recusas da (C2) sobrevivem **sem uma linha editada nela**. O
--      `uuid` que a (C2) usa e sintetico e inexistente, entao o dono resolve NULL,
--      `NULL IS DISTINCT FROM <uid>` e TRUE, e as cinco continuam recusando tanto o
--      papel `candidato` quanto o chamador sem claim nenhuma. Se a (C2) precisasse de
--      edicao, o guard estaria sendo AFROUXADO em vez de estendido — e isso e
--      condicao de PARADA, nunca de ajuste da assercao.
--
--      ── A REESCRITA ENDURECE, E CADA METADE PEGA UM DEFEITO NOMEADO ────────────
--       · `anon` e PUBLIC seguem PROIBIDOS nas cinco. Inalterado, e e a metade que o
--         `pg_default_acl` deste schema torna necessaria: ele concede EXECUTE a
--         `anon` como grant DIRETO E NOMEADO em todo `CREATE FUNCTION`, entao
--         `REVOKE ALL ... FROM PUBLIC` remove um grant que nunca existiu e deixa
--         `anon=X` de pe. Medido: 61 funcoes DEFINER em `public` com EXECUTE para
--         `anon`, 39 chamaveis via PostgREST
--         (docs/compliance/anon-execute-definer-audit.md:11-18).
--       · Para as QUATRO alcancaveis pelo titular, `EXECUTE` a `authenticated` passa
--         a ser **EXIGIDO**. Ausencia REPROVA. E o que impede a migration
--         `20260805000009` de sumir em silencio — um `GRANT` esquecido voltaria a
--         produzir `42501` em PROD, e essa e a falha que ninguem investiga porque
--         PARECE autorizacao funcionando.
--       · `gerar_bias_snapshot` segue proibida tambem a `authenticated`: ela NAO e
--         alcancada por esta Edge Function, e afrouxa-la de carona seria exatamente o
--         reflexo que esta fase existe para nao ter.
--
--      ⚠⚠ CONTRADICAO MEDIDA E **NAO RESOLVIDA POR ESTE PLANO** — LER ANTES DE
--      TRATAR UM VERMELHO EM `gerar_bias_snapshot` COMO DEFEITO DE ACL:
--      a migration `20260805000003` (plano 45-05) faz, DELIBERADAMENTE,
--      `REVOKE ALL ... FROM PUBLIC, anon, authenticated` seguido de
--      `GRANT EXECUTE ... TO authenticated`, e o bloco (6) do cabecalho dela declara
--      a divergencia com a razao: o chamador VIVO e o cliente do navegador do
--      administrador (`biasAuditService.ts:98`), que fala com o Postgres como
--      `authenticated`. Revogar dali nao endureceria nada — apagaria a tela de
--      auditoria de vies. Ou seja: esta metade da (C1) e o `20260805000003`
--      afirmam coisas OPOSTAS, e as duas foram escritas por planos diferentes que
--      nao se viram. **Isto e decisao de desenho, nao conserto mecanico**, e esta
--      endereçada ao code review bloqueante do 45-11 (Task 1), que precede o primeiro
--      apply destrutivo. O plano 45-12 escreveu a assercao como especificada e
--      registrou a contradicao em vez de resolve-la sozinho: afrouxar uma assercao
--      por conta propria e precisamente o reflexo que esta fase proibe.
--
--      PUBLIC e `grantee = 0` em `aclexplode` e NAO aparece num JOIN com `pg_roles`;
--      por isso ele e checado separadamente.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c1$
DECLARE
  r            record;
  v_ofensor    text;
  v_auth       boolean;
  v_checadas   int := 0;
  v_faltando   text;
  v_exige_auth boolean;
  -- As QUATRO que o titular alcanca pela Edge Function `executar-direito-titular`.
  -- `gerar_bias_snapshot` NAO esta aqui: ela nao e chamada por ela.
  v_do_titular text[] := ARRAY['registrar_pedido_exclusao', 'cancelar_pedido_exclusao',
                               'plano_exclusao_titular', 'anonimizar_candidato'];
BEGIN
  SELECT string_agg(t.nome, ', ') INTO v_faltando
    FROM (VALUES
      ('registrar_pedido_exclusao'), ('cancelar_pedido_exclusao'),
      ('plano_exclusao_titular'), ('anonimizar_candidato'), ('gerar_bias_snapshot')
    ) AS t(nome)
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = t.nome);

  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C1): as funcoes % NAO existem em public. Este arquivo e a ESPECIFICACAO e foi escrito ANTES delas — RED aqui e o estado correto ate os planos 45-03, 45-05 e 45-07 aplicarem as migrations', v_faltando;
  END IF;

  FOR r IN
    SELECT p.proname, p.proacl, p.prosecdef
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('registrar_pedido_exclusao', 'cancelar_pedido_exclusao',
                         'plano_exclusao_titular', 'anonimizar_candidato',
                         'gerar_bias_snapshot')
  LOOP
    v_checadas   := v_checadas + 1;
    v_exige_auth := r.proname = ANY (v_do_titular);

    IF NOT r.prosecdef THEN
      RAISE EXCEPTION 'P45M FAIL (C1): public.%() NAO e SECURITY DEFINER — sem DEFINER ela nao atravessa a RLS para fazer o que precisa, e o desenho inteiro do motor pressupoe que ela atravessa', r.proname;
    END IF;

    IF r.proacl IS NULL THEN
      RAISE EXCEPTION 'P45M FAIL (C1): proacl NULO em public.%() — nenhum REVOKE explicito foi aplicado, logo o pg_default_acl deste schema (que concede EXECUTE a anon E a authenticated como grant DIRETO em todo CREATE FUNCTION) esta em vigor. Uma funcao que apaga PII de forma irreversivel acabou de nascer chamavel via PostgREST', r.proname;
    END IF;

    -- (i) `anon` e PUBLIC: PROIBIDOS nas cinco, sem excecao.
    SELECT string_agg(coalesce(g.rolname, 'PUBLIC') || ':' || a.privilege_type, ', ')
      INTO v_ofensor
      FROM aclexplode(r.proacl) a
      LEFT JOIN pg_roles g ON g.oid = a.grantee
     WHERE a.privilege_type = 'EXECUTE'
       AND (a.grantee = 0 OR g.rolname = 'anon');

    IF v_ofensor IS NOT NULL THEN
      RAISE EXCEPTION 'P45M FAIL (C1): public.%() concede EXECUTE a anon ou a PUBLIC (%) — o REVOKE precisa NOMEAR anon, nao apenas PUBLIC, porque revogar de PUBLIC remove um grant que nunca existiu. Duas destas funcoes apagam PII de forma irreversivel. proacl = %', r.proname, v_ofensor, r.proacl::text;
    END IF;

    -- (ii) `authenticated`: EXIGIDO nas quatro do titular, PROIBIDO nas demais.
    SELECT EXISTS (
      SELECT 1
        FROM aclexplode(r.proacl) a
        LEFT JOIN pg_roles g ON g.oid = a.grantee
       WHERE a.privilege_type = 'EXECUTE' AND g.rolname = 'authenticated'
    ) INTO v_auth;

    IF v_exige_auth AND NOT v_auth THEN
      RAISE EXCEPTION 'P45M FAIL (C1): public.%() NAO concede EXECUTE a authenticated, e ela e alcancada pelo titular. A Edge Function chama esta RPC por um client com service key E o Authorization do titular, e o PostgREST deriva o PAPEL do MESMO JWT: esse client chega como authenticated. Sem o GRANT da migration 20260805000009 o auth.uid() segue NULO dentro da funcao, ela recusa com 42501, e o motor NAO RODA (DI-45-10-01). Um GRANT esquecido e a falha que ninguem investiga porque PARECE autorizacao funcionando. proacl = %', r.proname, r.proacl::text;
    END IF;

    IF NOT v_exige_auth AND v_auth THEN
      RAISE EXCEPTION 'P45M FAIL (C1): public.%() concede EXECUTE a authenticated e NAO e alcancada pela Edge Function desta fase — afrouxar o ACL dela de carona e o reflexo que esta fase existe para nao ter. ⚠ ANTES DE "CONSERTAR" ISTO: leia o comentario de cabecalho desta assercao. A migration 20260805000003 (plano 45-05) concede este privilegio DELIBERADAMENTE, porque o chamador vivo e a tela de auditoria de vies do administrador (biasAuditService.ts:98) — revogar apagaria a tela. As duas afirmacoes sao OPOSTAS e a decisao e do code review bloqueante do 45-11, nunca de um ajuste da assercao. proacl = %', r.proname, r.proacl::text;
    END IF;
  END LOOP;

  IF v_checadas <> 5 THEN
    RAISE EXCEPTION 'P45M FAIL (C1): encontrei % das 5 funcoes esperadas em public', v_checadas;
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C1): as 5 funcoes sao DEFINER; nenhuma concede EXECUTE a anon ou PUBLIC; as 4 alcancaveis pelo titular concedem a authenticated (o controle mudou de camada, do ACL para o guard do corpo, que a C2 prova que morde) e gerar_bias_snapshot nao concede';
END
$c1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (C2) ⊖ GUARD, NAS DUAS METADES — 10 recusas com 42501.
--
--      A SEGUNDA METADE E A QUE FECHA O DEFEITO SISTEMICO. O idioma difundido no
--      repositorio — `IF v_role NOT IN ('rh','administrador')` — avalia NULL quando
--      nao ha JWT, e um `IF` NULL **nao e tomado**: o guard FALHA ABERTO exatamente
--      para o chamador mais suspeito, que e `anon`. Um guard NULL-cego passa pela
--      metade "papel errado" em verde e reprova SO aqui.
--
--      A impersonacao e por `set_config('request.jwt.claims', ...)` — nunca por
--      leitura de catalogo. O guard LE a claim, entao e a claim que tem de ser
--      exercitada; ler `pg_get_functiondef` provaria apenas que o TEXTO do guard
--      existe, nao que ele RECUSA.
--
--      ⚠ Tudo aqui roda dentro de subtransacao revertida, e a diferenca em relacao
--      ao molde da P43 e material: la as tres funcoes eram STABLE, e uma chamada que
--      passasse pelo guard nao faria nada. Aqui DUAS das cinco sao VOLATILE e apagam
--      PII. Se um guard falhar aberto, a chamada de teste EXECUTA — e o unico motivo
--      de isso nao ser catastrofico e o rollback. O uuid passado tambem e sintetico
--      e inexistente, para que nem no pior caso exista alvo real.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c2$
DECLARE
  r          record;
  ctx        record;
  v_fake     uuid := gen_random_uuid();
  v_ok       int  := 0;
  v_esperado int  := 10;
BEGIN
  BEGIN
    FOR ctx IN
      SELECT * FROM (VALUES
        ('papel candidato', json_build_object('sub', gen_random_uuid()::text,
           'app_metadata', json_build_object('role', 'candidato'))::text),
        ('SEM CLAIM NENHUMA', '')
      ) AS c(rotulo, claims)
    LOOP
      PERFORM set_config('request.jwt.claims', ctx.claims, false);
      PERFORM set_config('request.jwt.claim.sub', '', false);

      FOR r IN
        SELECT * FROM (VALUES
          ('registrar_pedido_exclusao', format('SELECT public.registrar_pedido_exclusao(%L::uuid)', v_fake)),
          ('cancelar_pedido_exclusao',  format('SELECT public.cancelar_pedido_exclusao(%L::uuid)',  v_fake)),
          ('plano_exclusao_titular',    format('SELECT public.plano_exclusao_titular(%L::uuid)',    v_fake)),
          ('anonimizar_candidato',      format('SELECT public.anonimizar_candidato(%L::uuid, true)', v_fake)),
          ('gerar_bias_snapshot',       'SELECT public.gerar_bias_snapshot(''p45-smoke'')')
        ) AS t(nome, chamada)
      LOOP
        BEGIN
          EXECUTE r.chamada;
          RAISE EXCEPTION 'P45M FAIL (C2): public.%() ACEITOU chamada com % — em SECURITY DEFINER isso e grave porque DEFINER bypassa RLS e o guard do corpo e o UNICO controle. Trocar IS DISTINCT FROM por NOT IN reintroduz precisamente este defeito', r.nome, ctx.rotulo
            USING ERRCODE = 'P45C2';
        EXCEPTION
          WHEN sqlstate 'P45C2' THEN RAISE;
          WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
          WHEN sqlstate 'P45DR' THEN
            RAISE EXCEPTION 'P45M FAIL (C2): public.%() com % chegou ate o RAISE de dry-run — ou seja, o guard NAO recusou e o corpo EXECUTOU. O guard falhou ABERTO', r.nome, ctx.rotulo;
        END;
      END LOOP;
    END LOOP;

    PERFORM set_config('request.jwt.claims', '', false);
    RAISE EXCEPTION 'rollback_smoke45m_c2' USING ERRCODE = 'P45C9';
  EXCEPTION
    WHEN sqlstate 'P45C9' THEN
      NULL;  -- reversao esperada
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);

  IF v_ok <> v_esperado THEN
    RAISE EXCEPTION 'P45M FAIL (C2): apenas % de % recusas ocorreram com 42501 (5 funcoes x 2 contextos: papel errado + sem claim nenhuma)', v_ok, v_esperado;
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C2): as 5 funcoes recusaram papel candidato E chamador sem claim — as % recusas com 42501 (guard NULL-safe)', v_ok;
END
$c2$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (C3) GATE DE NAO-DIVERGENCIA DO DRY-RUN, NAS DUAS METADES.
--
--      (i) `md5(prosrc)` das duas funcoes bate os valores PINADOS no cabecalho —
--          prova que o corpo vivo e byte a byte o da migration.
--      (ii) `pg_get_functiondef(anonimizar_candidato)` CONTEM a chamada a
--           `plano_exclusao_titular` — prova que o delete real continua PASSANDO
--           pela expressao unica.
--
--      Uma sozinha nao serve. Com so (i), alguem deixaria `plano_exclusao_titular`
--      intacta e reescreveria o tombstone com um predicado proprio "mais rapido": o
--      md5 continuaria verde e o dry-run voltaria a mentir sobre a exclusao. E o
--      COMMENT vivo de `candidaturas_alem_da_janela()` (20260801000004:226-232) ja
--      escreveu a regra endereçada a esta fase: CHAME a funcao, nao copie o corpo —
--      o dry-run e o delete real TEM de sair da mesma expressao, e um dry-run que
--      diverge do predicado e decoracao. Precedente nomeado: P39 CR-02, uma guarda
--      que era dead code.
--
--      ⚠ E isso importa mais aqui do que importava na P43: com PITR desligado
--      (D-45-10) e o backup de 7 dias EXCLUINDO Storage, o dry-run nao e processo —
--      e o unico mecanismo de seguranca que a fase tem.
--
--      A busca em (ii) usa FRONTEIRA DE PALAVRA e nunca `strpos` (ver o bloco
--      correspondente no cabecalho).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c3$
DECLARE
  v_pin_plano text := 'PENDENTE-45-07';
  v_pin_anon  text := 'PENDENTE-45-07';
  v_src_plano text;
  v_src_anon  text;
  v_def_anon  text;
  v_md5_plano text;
  v_md5_anon  text;
BEGIN
  SELECT p.prosrc INTO v_src_plano
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'plano_exclusao_titular';

  SELECT p.prosrc, pg_get_functiondef(p.oid) INTO v_src_anon, v_def_anon
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'anonimizar_candidato';

  IF v_src_plano IS NULL OR v_src_anon IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C3): plano_exclusao_titular ou anonimizar_candidato nao existe — nao ha expressao unica, e o dry-run que o portao destrutivo exige nao teria o que comparar';
  END IF;

  v_md5_plano := md5(v_src_plano);
  v_md5_anon  := md5(v_src_anon);

  -- Metade (ii) PRIMEIRO: ela e a que continua significativa mesmo com o pin
  -- pendente, e um arquivo que so soubesse reprovar por pin nao provaria nada hoje.
  IF v_def_anon !~ '\mplano_exclusao_titular\M' THEN
    RAISE EXCEPTION 'P45M FAIL (C3/ii): anonimizar_candidato NAO chama plano_exclusao_titular. O tombstone foi reescrito com um predicado PROPRIO: existem agora DUAS definicoes de exclusao no banco, e a que o dry-run mostra nao e a que o delete real executa. O dry-run voltou a ser decoracao (P39 CR-02), e nesta fase ele e a UNICA rede — PITR esta desligado e o backup de 7 dias exclui Storage inteiramente';
  END IF;

  IF v_pin_plano = 'PENDENTE-45-07' OR v_pin_anon = 'PENDENTE-45-07' THEN
    RAISE EXCEPTION 'P45M FAIL (C3/i): os resumos md5(prosrc) ainda estao com o marcador PENDENTE-45-07 no cabecalho. Os valores VIVOS medidos agora sao plano_exclusao_titular=% (% octetos) e anonimizar_candidato=% (% octetos). O 45-11 pina estes valores por EXECUCAO, e so entao esta assercao passa a morder. Um placeholder que ficasse VERDE seria pior que assercao nenhuma — seria um gate que se declara satisfeito sem nunca ter comparado nada',
      v_md5_plano, octet_length(v_src_plano), v_md5_anon, octet_length(v_src_anon);
  END IF;

  IF v_md5_plano IS DISTINCT FROM v_pin_plano THEN
    RAISE EXCEPTION 'P45M FAIL (C3/i): o corpo VIVO de plano_exclusao_titular NAO casa byte a byte com a migration. md5 vivo=% (esperado %), octetos=%. Se o md5(statements[1]) do apply TIVER batido o md5 do arquivo, a divergencia e de EXTRACAO e nao do objeto — ver PROVENIENCIA no cabecalho. Caso contrario alguem editou a expressao unica sem re-pinar, e o dry-run deixou de descrever o que o delete real faz',
      v_md5_plano, v_pin_plano, octet_length(v_src_plano);
  END IF;

  IF v_md5_anon IS DISTINCT FROM v_pin_anon THEN
    RAISE EXCEPTION 'P45M FAIL (C3/i): o corpo VIVO de anonimizar_candidato NAO casa byte a byte com a migration. md5 vivo=% (esperado %), octetos=%',
      v_md5_anon, v_pin_anon, octet_length(v_src_anon);
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C3): as duas metades — md5 pinado (plano=%, anon=%) e o tombstone CHAMA a expressao unica', v_md5_plano, v_md5_anon;
END
$c3$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (C7) ⊖ NEGATIVA — O GUARD DE **INTENCAO** RECUSA A CHAMADA REAL FORA DO MOTOR.
--      (CR-01 do 45-REVIEW.md, fechado pelo plano 45-13, metade (c) do guard.)
--
--      O que esta assercao mede, e por que ela precisa existir SEPARADA da (C2): a
--      (C2) prova que o guard recusa o PAPEL errado e o chamador SEM CLAIM. Nenhuma
--      das duas metades sabe EM QUE ESTADO O MOTOR ESTA. Com o
--      `GRANT EXECUTE ... TO authenticated` da `20260805000009`, uma sessao legitima
--      alcanca esta primitiva direto por PostgREST — e ate o 45-13 ela ACEITAVA,
--      destruindo PII fora da janela do ERASE-06, sem `storage_concluido_em`, sem
--      recibo e sem trilha. «Ser chamavel» era suficiente para ser perigosa.
--
--      ⚠ O DESENHO DESTA ASSERCAO E O QUE A TORNA SEGURA, e ele nao e detalhe:
--       · a impersonacao e de **administrador**, que a metade (b) do caminho
--         destrutivo ACEITA — logo um `42501` aqui so pode ter vindo da metade (c);
--       · o `p_candidato_id` e um uuid **sintetico e inexistente**. Se a metade (c)
--         estiver ausente, a funcao passa do guard, chama `plano_exclusao_titular`
--         (que e STABLE e nao escreve) e levanta **`P0002`** no
--         `CANDIDATO_INEXISTENTE` — um desfecho DISTINGUIVEL e inofensivo. Nunca se
--         exercita este caminho contra uma linha real: se o guard estivesse aberto, a
--         chamada apagaria a PII de uma pessoa de verdade, e o rollback nao devolve
--         curriculo apagado do Storage.
--
--      ⚠ E POR ISSO A DISCRIMINACAO E POR SQLSTATE, e cada um significa uma coisa:
--        42501 = a metade (c) existe e mordeu (PASS);
--        P0002 = a metade (c) NAO existe — a funcao chegou a procurar a linha (FAIL);
--        P45DR = a chamada real virou dry-run, defeito grave por si (FAIL).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c7$
DECLARE
  v_admin uuid := current_setting('smoke45m.admin_auth')::uuid;
  v_fake  uuid := gen_random_uuid();
  v_lev   boolean := false;
  v_st    text;
BEGIN
  IF to_regprocedure('public.anonimizar_candidato(uuid, boolean)') IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C7): public.anonimizar_candidato(uuid, boolean) NAO EXISTE — RED correto ate a migration 20260805000006 ser aplicada';
  END IF;

  -- Subtransacao por precaucao ESTRUTURAL: nada aqui deveria escrever (o guard recusa
  -- antes de tudo, e o caminho de fallback levanta P0002 antes da primeira mutacao),
  -- mas esta e a funcao que apaga PII de forma irreversivel — o envelope existe para
  -- o dia em que alguem mudar o corpo e nao lembrar deste arquivo.
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);

    BEGIN
      PERFORM public.anonimizar_candidato(v_fake, false);
      v_lev := false;
    EXCEPTION
      WHEN OTHERS THEN
        v_lev := true;
        v_st  := SQLSTATE;
    END;

    PERFORM set_config('request.jwt.claims', '', false);
    RAISE EXCEPTION 'rollback_smoke45m_c7' USING ERRCODE = 'P45C9';
  EXCEPTION
    WHEN sqlstate 'P45C9' THEN
      NULL;  -- reversao esperada
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);

  IF NOT v_lev THEN
    RAISE EXCEPTION 'P45M FAIL (C7): anonimizar_candidato(<uuid inexistente>, p_dry_run := false) RETORNOU NORMALMENTE sob claims de administrador. Nao ha guard de intencao NENHUM, e a funcao ainda declara sucesso sobre um alvo que nao existe';
  END IF;

  IF v_st = 'P0002' THEN
    RAISE EXCEPTION 'P45M FAIL (C7): a chamada REAL passou do guard e foi PROCURAR A LINHA (SQLSTATE P0002 = CANDIDATO_INEXISTENTE). A metade (c) do guard — o guard de INTENCAO — NAO EXISTE no corpo vivo. Com o GRANT a authenticated da 20260805000009, isso significa que qualquer sessao alcanca o tombstone por PostgREST e o executa sobre uma linha REAL: PII destruida fora da janela do D-45-01/ERASE-06, sem storage_concluido_em, sem recibo e sem trilha, e com o curriculo ficando orfao no bucket porque candidatos.user_id vira NULL e nenhuma sessao volta a resolver o titular. E o CR-01 do 45-REVIEW.md reaberto';
  END IF;

  IF v_st = 'P45DR' THEN
    RAISE EXCEPTION 'P45M FAIL (C7): a chamada com p_dry_run := false terminou em P45DR — o caminho REAL virou dry-run. Alguem trocou o default ou o parametro, e um chamador que leia isso como sucesso marca o pedido como concluido com 100%% da PII intacta';
  END IF;

  IF v_st IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P45M FAIL (C7): a recusa veio com SQLSTATE % e o combinado do guard e 42501. O vocabulario importa: a Edge Function traduz 42501 para 403 e qualquer outro codigo para 500, e um 500 aqui mandaria o titular tentar de novo contra um estado que nao muda', coalesce(v_st, '<nulo>');
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C7): o guard de INTENCAO recusou com 42501 uma chamada REAL feita por administrador fora do motor — sem pedido em execucao, a primitiva nao executa, e ser chamavel deixou de ser suficiente para ser perigosa';
END
$c7$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (C8) ⊖ NEGATIVA (BL-01 do `45-REVIEW-2.md`, plano 45-14) — `p_dry_run := NULL`
--      NAO E INTENCAO DE APAGAR. A chamada com o parametro NULO, sob claims que a
--      metade (b) aceita, tem de terminar em `P45DR` com a linha INTACTA.
--
--      Por que esta assercao existe SEPARADA da (C7), e por que a (C7) nao a alcanca:
--      a (C7) chama com `false` LITERAL, e o bloco `DO` da migration fazia o mesmo nos
--      seus tres casos. Nenhuma das duas suites exercitava NULL — e foi por isso que o
--      defeito passou pelas duas. `p_dry_run` e um booleano de TRES valores e o
--      `DEFAULT true` NAO protege contra NULL EXPLICITO: o PostgREST converte um `null`
--      JSON no argumento nomeado, e no SQL Editor basta escrever `NULL`.
--
--      O QUE ACONTECIA COM O PARAMETRO CRU (os tres IF avaliando NULL, nenhum tomado):
--        · `IF p_dry_run`       -> caia no ELSE, o ramo DESTRUTIVO da metade (b);
--        · `IF NOT p_dry_run`   -> a metade (c), o GUARD DE INTENCAO, NAO RODAVA;
--        · `IF p_dry_run` (fim) -> o `P45DR` nao era levantado, e a transacao COMMITAVA.
--      Desfecho: PII destruida sem pedido em `solicitacoes_dados`, fora da janela do
--      ERASE-06, sem recibo e sem trilha — e pior que antes do 45-13, porque sem o
--      pedido o reencontro do CR-03 nao acha nada e o curriculo fica ORFAO no bucket
--      para sempre (Storage fora de todo backup, PITR desligado por D-45-10).
--
--      ⚠ ESTA ASSERCAO PRECISA DE FIXTURE REAL, e a razao e MECANICA: contra um uuid
--      inexistente — o alvo seguro que a (C7) usa — a versao DEFEITUOSA e a CORRIGIDA
--      produzem o MESMO desfecho (`P0002`, candidato inexistente, antes de qualquer
--      mutacao). O uuid sintetico nao discrimina, e uma assercao que nao discrimina e
--      decoracao. A fixture e sintetica, criada aqui, e a subtransacao a reverte.
--
--      ⚠ DISCRIMINACAO POR SQLSTATE, e cada um significa uma coisa:
--        P45DR = a intencao foi normalizada para o lado SEGURO (PASS);
--        <retorno normal> = a funcao APAGOU (so nao persistiu porque isto reverte) — e
--          o BL-01 de pe (FAIL);
--        42501 = alguem trocou a normalizacao por uma RECUSA. Tambem fecha o furo, mas
--          muda o contrato desta funcao, e a mudanca tem de passar por aqui (FAIL).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c8$
DECLARE
  v_admin  uuid := current_setting('smoke45m.admin_auth')::uuid;
  v_user   uuid := gen_random_uuid();
  v_cand   uuid;
  v_email  text;
  v_antes  text;
  v_pos    text;
  v_lev    boolean := false;
  v_st     text;
BEGIN
  IF to_regprocedure('public.anonimizar_candidato(uuid, boolean)') IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C8): public.anonimizar_candidato(uuid, boolean) NAO EXISTE — RED correto ate a migration 20260805000006 ser aplicada';
  END IF;

  v_email := 'p45smoked-' || replace(v_user::text, '-', '') || '@invalido.local';

  BEGIN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);

    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P45 Titular D', v_email, '(11) 96666-5555',
       DATE '1990-05-09', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;

    -- ⚠ NENHUMA linha em `solicitacoes_dados` para esta fixture, e a ausencia e o
    -- desenho: e o estado em que a metade (c) recusaria a chamada destrutiva. Se a
    -- normalizacao sumir, a chamada com NULL cai no ramo destrutivo COM a metade (c)
    -- pulada — exatamente o cenario 1 do CR-01 — e retorna normalmente.
    SELECT c::text INTO v_antes FROM public.candidatos c WHERE c.id = v_cand;

    -- Claims de `administrador`: as DUAS formas da metade (b) o aceitam, entao o que
    -- esta sob medicao aqui e o VALOR DO PARAMETRO e nada mais.
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);

    BEGIN
      PERFORM public.anonimizar_candidato(v_cand, NULL::boolean);
      v_lev := false;
    EXCEPTION
      WHEN OTHERS THEN
        v_lev := true;
        v_st  := SQLSTATE;
    END;

    SELECT c::text INTO v_pos FROM public.candidatos c WHERE c.id = v_cand;

    PERFORM set_config('request.jwt.claims', '', false);
    RAISE EXCEPTION 'rollback_smoke45m_c8' USING ERRCODE = 'P45CA';
  EXCEPTION
    WHEN sqlstate 'P45CA' THEN
      NULL;  -- reversao esperada
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);

  IF NOT v_lev THEN
    RAISE EXCEPTION 'P45M FAIL (C8): anonimizar_candidato(<linha real>, p_dry_run := NULL) RETORNOU NORMALMENTE. Com NULL, os tres IF do corpo avaliam NULL e nenhum e tomado: a chamada recebe o ramo DESTRUTIVO da metade (b), o guard de INTENCAO da metade (c) NAO roda, e o terminador do dry-run NAO levanta P45DR — a transacao COMMITA. Uma chamada de navegador destroi a PII do titular sem pedido, fora da janela do ERASE-06, sem recibo e sem trilha, e o curriculo fica orfao no bucket para sempre. A saida e normalizar a intencao UMA vez, no DECLARE, para o lado SEGURO: v_dry_run := coalesce(p_dry_run, true), com o corpo inteiro lendo v_dry_run';
  END IF;

  IF v_st = '42501' THEN
    RAISE EXCEPTION 'P45M FAIL (C8): a chamada com p_dry_run := NULL foi RECUSADA com 42501 em vez de resolver para o dry-run. O furo esta fechado, mas por outro mecanismo: alguem trocou a normalizacao para o lado seguro por uma recusa explicita. Nao e regressao de seguranca — e mudanca de CONTRATO desta funcao, e ela tem de passar por este arquivo, pelo bloco (vi.d) da 20260805000006 e pelo COMMENT das duas, no mesmo commit';
  END IF;

  IF v_st IS DISTINCT FROM 'P45DR' THEN
    RAISE EXCEPTION 'P45M FAIL (C8): a chamada com p_dry_run := NULL levantou SQLSTATE % e o esperado e P45DR — o modo SEGURO, o mesmo que o DEFAULT true promete. Destruir PII sobre uma intencao NAO DECLARADA e o desfecho que o portao inteiro desta fase existe para impedir', coalesce(v_st, '<nulo>');
  END IF;

  IF v_pos IS DISTINCT FROM v_antes THEN
    RAISE EXCEPTION 'P45M FAIL (C8): a linha de candidatos MUDOU sob p_dry_run := NULL. O SQLSTATE sozinho nao e a prova — a linha e';
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C8): p_dry_run := NULL resolveu para o lado SEGURO — P45DR, zero coluna mutada, e o guard de intencao continua sendo o que decide o caminho destrutivo (BL-01)';
END
$c8$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (C4) (C5) (C6) — DRY-RUN QUE NAO MUTA, FILA DO RH NAO CONTAMINADA, E OS DOIS
--      NEGATIVOS DO ENCERRAMENTO. Uma fixture minima compartilhada, uma
--      subtransacao, tres assercoes.
--
--      Estao juntas por uma razao de economia HONESTA e nao de conveniencia: as
--      tres precisam do mesmo cenario — um titular com candidatura em andamento que
--      acabou de pedir exclusao — e o pedido que (C5) procura na fila do RH e
--      exatamente o que `registrar_pedido_exclusao` cria em (C6).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c456$
DECLARE
  v_admin_auth uuid := current_setting('smoke45m.admin_auth')::uuid;
  v_vaga       uuid := current_setting('smoke45m.vaga')::uuid;
  v_user       uuid := gen_random_uuid();
  v_cand       uuid;
  v_candtr     uuid;
  v_email_fix  text;
  v_solic      uuid;

  -- C6
  v_encerrada  timestamptz;
  v_ev_decisao int;
  v_auto_rej   int;

  -- C5
  v_ve_fila    boolean := NULL;
  v_tipo_fila  int     := -1;
  v_cont_antes int     := -1;
  v_cont_pos   int     := -2;
  v_fila_pend  int     := -3;

  -- C4
  v_snap_antes text;
  v_snap_pos   text;
  v_sqlstate   text := NULL;
  v_levantou   boolean := false;
BEGIN
  IF to_regprocedure('public.registrar_pedido_exclusao(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C4/C5/C6): public.registrar_pedido_exclusao(uuid) NAO EXISTE — RED correto ate a migration do plano 45-03 ser aplicada';
  END IF;

  v_email_fix := 'p45smokec-' || replace(v_user::text, '-', '') || '@invalido.local';

  BEGIN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email_fix, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);

    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P45 Titular C', v_email_fix, '(11) 97777-6666',
       DATE '1988-07-02', 'Sorocaba', 'SP', 'site')
    RETURNING id INTO v_cand;

    -- `status = 'rejeitado'` desarma os dois triggers de dispatch (ver cabecalho);
    -- `etapa_atual = 'triagem'` mantem a candidatura EM ANDAMENTO para o predicado
    -- de `registrar_pedido_exclusao` — as duas colunas sao independentes.
    INSERT INTO public.candidaturas
      (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES
      (v_cand, v_vaga, 'triagem', 'rejeitado', false, now() - interval '10 days')
    RETURNING id INTO v_candtr;

    -- Contador da fila do RH ANTES do pedido de exclusao — a metade de (C5) que
    -- cobre a SEGUNDA RPC. Se `contar_pedidos_dados_pendentes` perder o filtro de
    -- tipo, este numero se move quando o pedido de EXCLUSAO nascer.
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    v_cont_antes := public.contar_pedidos_dados_pendentes();

    -- ── O ENCERRAMENTO A PEDIDO (D-45-06 / D-45-13) ────────────────────────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_user::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, false);

    PERFORM public.registrar_pedido_exclusao(v_cand);

    PERFORM set_config('request.jwt.claims', '', false);

    SELECT c.encerrada_a_pedido_em INTO v_encerrada
      FROM public.candidaturas c WHERE c.id = v_candtr;

    SELECT count(*) INTO v_ev_decisao
      FROM public.notificacoes_enviadas n
     WHERE n.candidatura_id = v_candtr AND n.evento = 'decisao';

    SELECT count(*) INTO v_auto_rej
      FROM public.historico_candidatura h
     WHERE h.candidatura_id = v_candtr AND h.auto_rejeitado = true;

    -- ── (C5) A FILA DO RH ──────────────────────────────────────────────────────
    EXECUTE format(
      'SELECT id FROM public.solicitacoes_dados WHERE candidato_id = %L::uuid AND tipo = %L ORDER BY solicitado_em DESC LIMIT 1',
      v_cand, 'exclusao') INTO v_solic;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);

    SELECT EXISTS (SELECT 1 FROM public.listar_pedidos_dados(true) p WHERE p.id = v_solic)
      INTO v_ve_fila;

    SELECT count(*) INTO v_tipo_fila
      FROM public.listar_pedidos_dados(true) p
      JOIN public.solicitacoes_dados s ON s.id = p.id
     WHERE s.tipo <> 'acesso';

    v_cont_pos := public.contar_pedidos_dados_pendentes();

    SELECT count(*) INTO v_fila_pend
      FROM public.listar_pedidos_dados(true) p
     WHERE p.situacao = 'pendente';

    -- ── (C4) O DRY-RUN ─────────────────────────────────────────────────────────
    SELECT c::text INTO v_snap_antes FROM public.candidatos c WHERE c.id = v_cand;

    BEGIN
      PERFORM public.anonimizar_candidato(v_cand, p_dry_run := true);
      v_levantou := false;
    EXCEPTION
      WHEN OTHERS THEN
        v_levantou := true;
        v_sqlstate := SQLSTATE;
    END;

    SELECT c::text INTO v_snap_pos FROM public.candidatos c WHERE c.id = v_cand;

    PERFORM set_config('request.jwt.claims', '', false);

    RAISE EXCEPTION 'rollback_smoke45m_c456' USING ERRCODE = 'P45C8';
  EXCEPTION
    WHEN sqlstate 'P45C8' THEN
      NULL;  -- reversao esperada
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);

  -- ── (C4) ────────────────────────────────────────────────────────────────────
  -- Tres pernas, e a honestidade sobre o que cada uma prova importa aqui: o
  -- savepoint do bloco EXCEPTION ja desfaz o que o dry-run tenha mutado, entao a
  -- comparacao de snapshot e a perna mais fraca. As que discriminam sao (a) ter
  -- levantado — uma funcao que retorna normalmente sob dry-run ou nao tem ramo de
  -- dry-run ou muta e segue — e (b) o SQLSTATE ser o COMBINADO. Um erro real
  -- disfarcado de "sucesso do dry-run" seria o pior falso verde desta fase.
  IF NOT v_levantou THEN
    RAISE EXCEPTION 'P45M FAIL (C4): anonimizar_candidato(..., p_dry_run := true) RETORNOU NORMALMENTE. Ou nao existe ramo de dry-run, ou ele muta e segue em frente. O contrato do 45-07 e terminar o MESMO corpo com RAISE EXCEPTION — nunca dois corpos, nunca IF p_dry_run THEN <query A> ELSE <query B>, que e o parente direto do CR-02 da P39';
  END IF;
  IF v_sqlstate IS DISTINCT FROM 'P45DR' THEN
    RAISE EXCEPTION 'P45M FAIL (C4): o dry-run levantou SQLSTATE % e o combinado desta fase e P45DR. A distincao e a que impede um ERRO REAL de ser lido como "dry-run concluido com sucesso" pela Edge Function do 45-10 — e, no sentido inverso, impede que P45DR chegando no caminho real passe por sucesso quando na verdade nada foi apagado', v_sqlstate;
  END IF;
  IF v_snap_pos IS DISTINCT FROM v_snap_antes THEN
    RAISE EXCEPTION 'P45M FAIL (C4): a linha de candidatos MUDOU sob p_dry_run := true. Sob dry-run, zero coluna muda';
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C4): dry-run levantou o SQLSTATE combinado % e nao mutou coluna nenhuma', v_sqlstate;

  -- ── (C5) ────────────────────────────────────────────────────────────────────
  IF v_solic IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C5): registrar_pedido_exclusao nao criou linha com tipo = exclusao em solicitacoes_dados — sem ela nao ha o que procurar na fila, e as duas assercoes seguintes passariam por vacuidade';
  END IF;
  IF v_ve_fila IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P45M FAIL (C5): o pedido de EXCLUSAO aparece em listar_pedidos_dados. As duas RPCs do RH filtram tipo = acesso NO SERVIDOR, e o corolario esta escrito em 20260804000002:133-139: sem esse filtro as linhas de exclusao entram em silencio na fila de ACESSO, que tem outro prazo, outro dono e outra copy (Invariante 9 da UI-SPEC)';
  END IF;
  IF v_tipo_fila <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C5): a fila devolveu % linha(s) com tipo diferente de acesso — o filtro do servidor deixou de recortar por tipo', v_tipo_fila;
  END IF;
  IF v_cont_pos <> v_cont_antes THEN
    RAISE EXCEPTION 'P45M FAIL (C5): contar_pedidos_dados_pendentes saiu de % para % quando o pedido de EXCLUSAO nasceu — a SEGUNDA RPC da fila perdeu o filtro tipo = acesso. Um badge que conta o que a tela nao mostra manda o operador cacar trabalho invisivel, e aqui o numero inflado seria de um prazo que nao e o dele', v_cont_antes, v_cont_pos;
  END IF;
  IF v_cont_pos <> v_fila_pend THEN
    RAISE EXCEPTION 'P45M FAIL (C5): a fila mostra % pendentes e o contador diz % — os dois predicados de escopo DIVERGIRAM, e um deles esta recortando por tipo e o outro nao', v_fila_pend, v_cont_pos;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C5): a fila de acesso do RH nao foi contaminada pelo pedido de exclusao';

  -- ── (C6) ⊖ NEGATIVA (ERASE-05 / D-45-06) ────────────────────────────────────
  -- A primeira perna e obrigatoria e nao e decorativa: se o encerramento NAO
  -- aconteceu, as duas negativas sao verdadeiras por vacuidade — nada aconteceu,
  -- logo nada foi notificado. E a mesma armadilha que a fixture das tabelas em zero
  -- linhas fecha no Bloco B.
  IF v_encerrada IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C6): a candidatura em andamento NAO foi encerrada (encerrada_a_pedido_em nula). Pedir exclusao encerra automaticamente as candidaturas em andamento (D-45-06); a alternativa "esperar o funil fechar sozinho" foi recusada explicitamente porque um funil parado deixaria o pedido pendente INDEFINIDAMENTE, e o Art. 18 nao tem clausula de "quando der". Sem o encerramento, as duas negativas abaixo passariam por VACUIDADE';
  END IF;
  IF v_ev_decisao <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C6): o encerramento gerou % linha(s) de evento decisao em notificacoes_enviadas. E a modelagem por JWT do titular mordendo: avancar_etapa insere em historico_candidatura, trg_notif_transicao dispara evento decisao para etapa_para IN (aprovado, rejeitado) com auto_rejeitado = false, e o resultado e UM E-MAIL DE REJEICAO PARA A PESSOA QUE ACABOU DE PEDIR PARA SER ESQUECIDA. O encerramento a pedido vive em candidaturas.encerrada_a_pedido_em e nao passa por etapa_atual (D-45-13)', v_ev_decisao;
  END IF;
  IF v_auto_rej <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C6): o encerramento gerou % linha(s) com auto_rejeitado = true. E a modelagem por service_role mordendo: com auth.uid() NULL, avancar_etapa grava auto_rejeitado := true e FABRICA, na tabela cuja funcao e provar que nenhum candidato e rejeitado automaticamente, o registro de uma rejeicao automatica. E a RNF-07a invertida pelo proprio motor de compliance', v_auto_rej;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C6): encerrou a pedido (%) sem evento decisao e sem auto_rejeitado', v_encerrada;
END
$c456$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — ⊖ NEGATIVA GLOBAL DE RESIDUO + gate de contagem com esperado FIXO.
--
--     A metade de RESIDUO e obrigatoria: um smoke que cria dados — inclusive em
--     `auth.users` — e nao PROVA que os removeu e um smoke que polui PROD. E o que
--     torna verdadeira a frase do cabecalho de que toda escrita e revertida.
--
--     A metade de CONTAGEM existe porque delegar a leitura dos NOTICEs a quem roda
--     produz run parcial que termina em silencio (licao da 37-03, repetida na P41-05
--     e na P43). O esperado e FIXO: 24.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  r          record;
  v_divergs  text := '';
  v_agora    bigint;
  v_asserts  int;
  v_esperado int := 24;
  v_solic_b  bigint := current_setting('smoke45m.solic')::bigint;
  v_solic_a  bigint;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('public.candidatos',              'candos'),
      ('public.candidaturas',            'cands'),
      ('auth.users',                     'users'),
      ('public.historico_candidatura',   'hist'),
      ('public.decisao_final',           'df'),
      ('public.decisao_final_historico', 'dfh'),
      ('public.logs_acesso',             'logs'),
      ('public.autorizacoes',            'aut'),
      ('public.notificacoes_enviadas',   'notif'),
      ('public.ai_call_logs',            'aicall'),
      ('public.candidate_ai_decisions',  'aidec'),
      ('public.recruiter_alerts',        'alerts')
    ) AS t(tabela, chave)
  LOOP
    EXECUTE format('SELECT count(*) FROM %s', r.tabela) INTO v_agora;
    IF v_agora <> current_setting('smoke45m.' || r.chave)::bigint THEN
      v_divergs := v_divergs || format('%s: %s -> %s; ', r.tabela, current_setting('smoke45m.' || r.chave), v_agora);
    END IF;
  END LOOP;

  IF v_solic_b >= 0 THEN
    EXECUTE 'SELECT count(*) FROM public.solicitacoes_dados' INTO v_solic_a;
    IF v_solic_a <> v_solic_b THEN
      v_divergs := v_divergs || format('public.solicitacoes_dados: %s -> %s; ', v_solic_b, v_solic_a);
    END IF;
  END IF;

  IF v_divergs <> '' THEN
    RAISE EXCEPTION 'P45M FAIL (z): RESIDUO EM PROD — as subtransacoes dos Blocos B e C NAO reverteram. Divergencias: %. Um smoke que cria dados e nao prova que os removeu e um smoke que polui producao, e aqui a poluicao inclui linha em auth.users e linha de PII sintetica em candidatos', v_divergs;
  END IF;

  v_asserts := coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int;
  IF v_asserts <> v_esperado THEN
    RAISE EXCEPTION 'P45M FAIL (z): RESUMO % PASS de % esperadas — run parcial, NAO tratar como verde. Confira que o arquivo rodou numa UNICA chamada de execute_sql: set_config(..., false) e escopado a SESSAO, e statements espalhados por chamadas separadas zeram o contador e reprovam um run que na verdade passou', v_asserts, v_esperado;
  END IF;

  RAISE NOTICE 'P45M RESUMO: % assercoes PASS de % esperadas; zero residuo em 13 tabelas — gate VERDE. Este arquivo e a ESPECIFICACAO do motor, nao um relatorio dele: se a implementacao divergir, corrige-se a implementacao', v_asserts, v_esperado;
END
$z$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
