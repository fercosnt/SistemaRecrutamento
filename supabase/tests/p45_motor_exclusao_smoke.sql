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
-- ⚠ ATUALIZADO NO PLANO 49-14 (2026-09-23). A instrucao anterior mandava rodar pelo
-- tool MCP `execute_sql`, "pelo orquestrador". Aquela via esta OBSOLETA desde a Phase
-- 46 (CLAUDE.md §"Via de apply ATUAL"), e por um motivo que importa aqui: ela depende
-- de o SQL ser TRANSCRITO pelo modelo, e foi por transcricao que duas das cinco
-- migrations do M8 chegaram a PROD com os comentarios descartados. A via atual le o
-- arquivo do disco, byte a byte:
--
--     node p46apply.cjs run supabase/tests/p45_motor_exclusao_smoke.sql
--
-- O arquivo INTEIRO vai numa UNICA requisicao, e isso e obrigatorio por motivo
-- MECANICO: `set_config(..., false)` e escopado a SESSAO, entao statements espalhados
-- por chamadas separadas zerariam o contador `smoke45m.pass` e o RESUMO (z) reprovaria
-- um run que na verdade passou (licao da P41-05, repetida na P43 e na P44). O
-- `p46apply run` satisfaz isso por construcao — um arquivo, uma requisicao.
--
-- GATE VERDE = o contador `smoke45m.pass` bate **37** no RESUMO (z). O gate NAO e
-- "nao levantou excecao": um run parcial acumula < 37 e o RESUMO reprova ALTO.
-- Esperado FIXO — nao ha metade adaptativa, nao ha "pelo menos N".
-- ⚠ O contador subiu de 21 para 23 no plano 45-13: (C7), o guard de INTENCAO (CR-01),
-- e (B11), o ponteiro reverso de candidaturas (CR-04). Subiu de 23 para 24 no plano
-- 45-14: (C8), `p_dry_run := NULL` resolvendo para o lado SEGURO (BL-01). Subiu de 24
-- para 25 no plano 48-01: (C6-neg), o pedido de exclusao NAO marca candidatura de
-- knockout (Defeito 26 / JORN-26). Subiu de 25 para 30 no plano 49-14, CINCO asserções
-- de uma vez porque sao cinco propriedades independentes do mesmo apply: (B12) o INPUT
-- que o titular mandou a IA sai (D-61), (B13) a linha de comparativo que o CITA e
-- redigida INTEIRA (D-63), (B14) ⊖ a que NAO o cita fica INTOCADA, (B15) a resposta do
-- revisor sai da linha corrente E de TODAS as versoes do arquivo (D-60), e (B16) o
-- dry-run PREVE as tres contagens pela mesma expressao. Subiu de 30 para 36 no plano
-- 49-20, SEIS assercoes por seis propriedades independentes do passo
-- `apagar_respostas_e_producoes`: (B17) as quatro tabelas do D-62 ficam com ZERO
-- linhas e os scores FICAM, (B18) sentinela/NULL coluna a coluna nas nove tabelas em
-- que a linha fica, (B19) `cited_evidence` sai e o RESTO da analise fica, (B20) o
-- dry-run PREVE as catorze contagens pela mesma expressao, (B21) a execucao sob claims
-- de ADMINISTRADOR rasga `texto`/`analise_ia` e a janela `app.motor_exclusao` nao
-- vaza, e (B22) ⊖ CONTROLE — sem a janela, o MESMO UPDATE sob as MESMAS claims
-- continua sendo RECUSADO pelo trigger. Subiu de 36 para 37 no plano 49-21, UMA
-- assercao pelo statement do D-69: (B23) a chave `respostas` da `metadata` da SJT —
-- as alternativas que a pessoa marcou — sai, o resto da `metadata` fica, e as linhas
-- de OUTRAS candidaturas guardam as suas escolhas. Acrescentar
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
-- AS 25 ASSERCOES — dezessete delas NEGATIVAS
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
--   (B12) 49-14 / D-61 — `ai_call_logs.user_prompt_template` do titular sai. E o INPUT
--        que foi ao modelo: o texto que a PESSOA escreveu, mais a fala literal nas
--        chamadas de entrevista. A SAIDA (`raw_response`, `parsed_reasoning`) ja era
--        tratada desde o 45-07; a entrada nao era, e severar o ponteiro deixando o
--        input de pe e pseudonimizacao apresentada como anonimizacao (Art. 12 §1o).
--   (B13) 49-14 / D-63 — a linha `call_type = 'comparative_ranking'` que CITA uma
--        candidatura do titular e redigida INTEIRA (as tres colunas de conteudo). Ela
--        nasce com `candidato_id` NULL por desenho — a chamada e sobre varias pessoas
--        — e por isso o passo (1/5), que acha a linha por `candidato_id`, NUNCA a
--        alcancou. O endereco e o proprio prompt: `(id=<candidatura_id>)`.
--   (B14) ⊖ NEGATIVA (49-14 / D-63) — a OUTRA linha de comparativo, a que NAO cita o
--        titular, fica INTOCADA nas tres colunas. Sem esta metade, "a redacao
--        funcionou" seria indistinguivel de "o passo redigiu toda linha de
--        comparativo do banco", que destruiria o historico de IA de terceiros.
--   (B15) 49-14 / D-60 — `revisao_resultado` (a resposta que o revisor ESCREVEU ao
--        pedido de revisao do Art. 20) sai da linha corrente E de TODAS as versoes do
--        arquivo, inclusive a que o snapshot acabou de criar durante o proprio passo
--        carregando o valor ANTIGO. E a mesma armadilha M1 da `justificativa`, numa
--        coluna que nasceu depois dela.
--   (B16) 49-14 — O DRY-RUN PREVE AS TRES CONTAGENS, pela MESMA expressao do motor
--        (regra (ii) do C3). Um numero previsto diferente do executado e o recibo
--        prometendo um apagamento de tamanho diferente do que a exclusao entrega.
--   (B17) 49-20 / D-62 — as QUATRO tabelas de resposta de multipla escolha
--        (`respostas_raven`, `respostas_bigfive`, `respostas_disc`,
--        `respostas_formulario`) ficam com ZERO linhas do titular, e a fixture nao
--        era vacua (tinha linha em cada uma ANTES). ⊕ E a metade que impede o
--        excesso: `scores_raven` e `scores_candidato` CONTINUAM la — os scores sao
--        a prova de que houve avaliacao, e o D-62 e excecao para as RESPOSTAS.
--   (B18) 49-20 / D-48 — nas NOVE tabelas em que a linha FICA, cada coluna prometida
--        pelo recibo esta redigida: sentinela nas `NOT NULL`, NULL nas nulaveis. Com
--        nao-vacuidade: o valor de ANTES carregava conteudo identificavel.
--   (B19) 49-20 / D-48 — `cited_evidence` (o trecho LITERAL do que a pessoa escreveu,
--        com localizacao) sai de `redacoes_candidato.analise_ia -> dimension_scores`
--        E da `metadata` da SJT, **e o resto da analise fica** (`score`, `level`,
--        `dimension`, `reasoning`). Sem a segunda metade, "a citacao saiu" seria
--        indistinguivel de "a analise inteira foi destruida", que o ERASE-08 proibe.
--   (B20) 49-20 — O DRY-RUN PREVE AS CATORZE CONTAGENS (treze no 49-20; a das
--        escolhas da SJT em `metadata -> 'respostas'` entrou no 49-21 / D-69), com as
--        condicoes `IS NOT NULL` incluidas. Tres fontes na mesma transacao: a
--        expressao medida a mao, o `'plano'` lido no PASSO 0, e o `'passos'`
--        declarado. Para as quatro do D-62 o numero previsto e o de linhas que VAO
--        DEIXAR DE EXISTIR — e o dry-run e o unico lugar onde ele pode ser lido.
--   (B21) 49-20 / Correcao 18 — a execucao acontece sob claims de ADMINISTRADOR e
--        AINDA ASSIM rasga `texto`/`analise_ia` de `redacoes_candidato`, que
--        `trg_redacao_rh_only_review_fields` recusa para `rh`/`administrador`. E a
--        janela `app.motor_exclusao` esta VAZIA depois: ela nao vaza para o resto da
--        transacao. Sem a sancao, um pedido feito por admin abortaria DEPOIS de o
--        curriculo ja ter sido apagado do Storage (Pitfall 6).
--   (B22) ⊖ CONTROLE (49-20) — com a janela DESLIGADA, o MESMO UPDATE sob as MESMAS
--        claims continua sendo RECUSADO pelo trigger. Sem esta metade, "a sancao
--        funciona" e indistinguivel de "o trigger foi esvaziado" — e a segunda
--        deixaria a tela do RH reescrevendo a redacao do candidato para sempre.
--   (B23) 49-21 / D-69 — A CHAVE `respostas` DA `metadata` DA SJT SAI, E A LINHA
--        FICA. Sao as alternativas que a pessoa marcou (`opcao_id`/`pergunta_id`/
--        `peso`, medidas pelo 49-20 em 4 de 5 linhas `sjt`). QUATRO metades: a chave
--        existia antes; nao existe depois; `motivos_revisao` e `composite_0_25`
--        FICAM (a remocao e CIRURGICA — sentinela na coluna inteira destruiria a
--        prova de que houve avaliacao); e as linhas de OUTRAS candidaturas guardam
--        as suas escolhas (⊖ escopo, sobre populacao REAL de PROD — uma mutacao que
--        remova o filtro por candidatura_id nao seria vista por fixture nenhuma).
--
-- BLOCO C — SEGURANCA, NAO-DIVERGENCIA E OS DOIS NEGATIVOS DO ENCERRAMENTO.
--   (C1) ⊖ NEGATIVA — `proacl` das 5 funcoes novas nao concede EXECUTE a `anon` nem a
--        PUBLIC (a metade que morde), e cada uma esta CLASSIFICADA explicitamente
--        quanto a `authenticated`, com a expectativa DECLARADA e nao derivada de
--        "e chamada pela Edge Function?". Hoje as 5 concedem: as 4 do titular pela
--        `20260805000009`, e `gerar_bias_snapshot` pela `20260805000003`, por ter
--        chamador vivo proprio — a tela de auditoria de vies do administrador
--        (45-REVIEW-4 / CR-02, fechando o `DI-45-12-01`). Funcao nao classificada
--        REPROVA (fail-closed).
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
--   (C6-neg) ⊖ NEGATIVA (Phase 48 / 48-01, JORN-26 — Defeito 26) — o MESMO pedido
--        de exclusao NAO marca `encerrada_a_pedido_em` numa candidatura do titular
--        com a forma do knockout (`inscricao`, `rejeitado`): ela ja estava encerrada.
--   (C7) ⊖ NEGATIVA (CR-01, 45-13) — o guard de INTENCAO: a chamada REAL feita por
--        `administrador` sobre um candidato SEM pedido em execucao recusa com `42501`
--        ANTES de tocar coluna alguma. `P0002` ali significa que a metade (c) sumiu.
--   (C8) ⊖ NEGATIVA (BL-01, 45-14) — `p_dry_run := NULL` NAO e intencao de apagar: a
--        chamada com o parametro NULO sobre uma linha REAL termina em `P45DR` com a
--        linha intacta. Precisa de fixture porque contra uuid inexistente a versao
--        defeituosa e a corrigida dao o mesmo `P0002`, e a (C7) chama com `false`
--        literal — foi por isso que o defeito passou pelas duas suites.
--   (z)  RESUMO — ⊖ negativa global de residuo + gate de contagem FIXO em 37.
--        ⚠ Esta linha dizia «FIXO em 25» ate 2026-09-23 e o gate ja era 30 desde o
--        plano 49-14: o numero vivia em TRES lugares (aqui, o «GATE VERDE» do topo,
--        e o `v_esperado` do bloco (z)) e so dois foram bumpados. Um registro
--        desatualizado num arquivo que e a ESPECIFICACAO do motor custa o mesmo que
--        registro ausente — e custa mais, porque vem com autoridade. Corrigido aqui;
--        o valor que MANDA continua sendo o `v_esperado` do bloco (z).
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
--   valor  : 6f2ef83664944b9a39c7d495a49ab8f1   (plano_exclusao_titular — length: 33716)
--   valor  : 1d8f96c8f21a755ded0505a0b652113a   (anonimizar_candidato   — length: 78301)
--   ⚠ TROCADOS no plano 49-21 (migration `20260923000001`, D-69). Os anteriores eram
--     `f86cb2b1…` / `0d16c0d8…` (49-20). A rede de FORMA cresceu ANTES da troca, no
--     MESMO commit: (C3/vii), quatro clausulas. Re-pin sem rede e carimbar o que
--     estiver la.
--   origem : corpo entre os dois delimitadores NOMEADOS de cifrao
--            (`$plano_exclusao_titular$` e `$anonimizar_candidato$`) em
--            — ⚠ OS DOIS MUDARAM DE ARQUIVO NO 49-21 (antes: 49-20, 49-14, 46-04) —
--            `supabase/migrations/20260923000001_p49_motor_respostas_sjt.sql`
--            (cujos corpos foram EXTRAIDOS do arquivo anterior,
--             `20260922000013_p49_motor_respostas_e_producoes.sql`, conferidos por
--             md5 contra o vivo ANTES da edicao e editados por ancora unica)
--
-- ⚠⚠ O QUE MUDOU NO CORPO NO 49-21 (migration `20260923000001`, JORN-36 / D-69):
--    UM statement (14/14) no MESMO passo `apagar_respostas_e_producoes`, que remove a
--    chave `respostas` de `scores_candidato.metadata` — as alternativas que a pessoa
--    marcou na SJT —, mais a sua contagem propria em `'passos'`, no terminador do
--    dry-run e em `plano_exclusao_titular`, pela MESMA expressao. A chave sai, a LINHA
--    FICA. Nenhum apagamento de linha novo: o escopo do D-62 continua sendo as quatro
--    tabelas de multipla escolha, e a extracao da lista de alvos (C3/vi) e o que
--    impede uma quinta. Vigiado por FORMA em (C3/vii) e por EXECUCAO em (B23).
--            (as DUAS funcoes vivem no MESMO arquivo desde o 49-14: o dry-run e o
--             delete real mudaram juntos, e separa-los em dois arquivos seria abrir
--             uma janela em que um conta o que o outro nao apaga)
--
-- ⚠⚠ RE-PIN DAS DUAS FUNCOES EM 2026-09-23 (Phase 49 / plano 49-20), E ELE E ATO
--    CONSCIENTE, MEDIDO E REVISAVEL. A rede estrutural (C3/vi) — ONZE checagens de
--    forma sobre o passo novo — CRESCEU NO MESMO COMMIT, ANTES de o pin ser trocado.
--    E isso nao e cerimonia aqui: este apply instala o PRIMEIRO passo do motor que
--    APAGA LINHA, e um md5 recem-carimbado casa com QUALQUER corpo, inclusive um em
--    que o apagamento tenha vazado para uma quinta tabela.
--    O QUE MUDOU NO CORPO (migration `20260922000013`, JORN-36 / D-48, D-62):
--      (a) passo NOVO `apagar_respostas_e_producoes`, TREZE statements, ANTES de
--          `severar_fks_set_null`, escopado por `candidatura_id IN (...)`;
--      (b) nele, QUATRO apagamentos de linha — `respostas_raven`,
--          `respostas_bigfive`, `respostas_disc`, `respostas_formulario` (D-62, a
--          excecao explicita do operador: os CHECKs dessas quatro nao aceitam
--          sentinela). Em TODAS as outras origens a linha FICA;
--      (c) `cited_evidence` removido cirurgicamente de
--          `redacoes_candidato.analise_ia -> dimension_scores` e da `metadata` da
--          SJT, preservando `score`/`level`/`dimension`/`reasoning`;
--      (d) chave nova em `'passos'` com as treze contagens por tabela, o mesmo no
--          terminador do dry-run, e — pela MESMA expressao, condicoes `IS NOT NULL`
--          inclusas — em `plano_exclusao_titular`.
--    ⚠ UMA TERCEIRA FUNCAO MUDOU E **NAO** E PINADA POR md5, de proposito:
--    `trg_redacao_rh_only_review_fields()` ganhou a janela `app.motor_exclusao`
--    (md5 novo `d54f28e054fc1c038793f01ed2edf524`, 3 671 octetos). Ela e vigiada
--    por FORMA em (C3/vi) — a janela existe E a lista de quinze colunas continua
--    inteira — e nao por resumo: e um trigger de UI que outros planos editam
--    legitimamente, e um pin de md5 ali reprovaria trabalho correto (a forma de
--    portao que o `CLAUDE.md` §"Portoes" cataloga como fotografia). O que ESTE
--    arquivo precisa garantir e o mecanismo, e o mecanismo e a forma.
--    ⚠ OS CORPOS ANTIGOS FORAM CONFERIDOS ANTES DA EDICAO, e a conferencia foi
--    CRUZADA: os tres foram extraidos dos ARQUIVOS (`20260922000012` para as duas
--    funcoes, `20260623100003` para o trigger) e deram exatamente
--    `6ab2890ebfc87fbd489215579bf1d9f8` / 56 226 octetos,
--    `12bfca3bf936704f1bc581acd5061df3` / 29 603 octetos e
--    `84d5552315a513cbea378ff94de20fb6` / 1 483 octetos — os pins que vigoravam E os
--    `md5(prosrc)` vivos medidos em PROD em 2026-09-23.
--    ⚠ AS EDICOES FORAM APLICADAS POR SUBSTITUICAO DE ANCORA UNICA (0 ou 2
--    ocorrencias abortam a montagem), nunca por transcricao.
--
-- ⚠⚠ RE-PIN DAS DUAS FUNCOES EM 2026-09-23 (Phase 49 / plano 49-14), E ELE E ATO
--    CONSCIENTE, MEDIDO E REVISAVEL — nao um numero atualizado para fazer o gate
--    passar. A rede estrutural (C3/iii) e (C3/iv) CRESCEU NO MESMO COMMIT, antes de
--    o pin ser trocado, e e isso que impede o re-pin de virar carimbo: um md5
--    recem-carimbado casa com QUALQUER corpo, inclusive um em que o passo novo
--    tenha sido apagado.
--    O QUE MUDOU NO CORPO (migration `20260922000012`, JORN-36 / D-60, D-61, D-63):
--      (a) `tombstone_decisao_final` rasga `revisao_resultado` nos DOIS UPDATEs, na
--          ordem corrente -> arquivo que ja era o mecanismo da `justificativa`;
--      (b) `severar_fks_set_null` ganhou um statement (0/5), ANTES do (1/5), que
--          rediga INTEIRAS as linhas `comparative_ranking` que citam o titular;
--      (c) o (1/5) passou a rasgar `user_prompt_template` no MESMO UPDATE que faz
--          `candidato_id := NULL` — e a posicao e o ponto: e o `candidato_id` que
--          ACHA a linha;
--      (d) tres contagens novas em `'passos'`, na mensagem do terminador do dry-run
--          e — pela MESMA expressao — em `plano_exclusao_titular`.
--    ⚠ OS CORPOS ANTIGOS FORAM CONFERIDOS ANTES DA EDICAO, e a conferencia foi
--    CRUZADA: os corpos foram extraidos dos ARQUIVOS `20260823000006` e
--    `20260823000008` e deram exatamente `5209239f191aa15b1725b726b00eb4cd` /
--    47 549 octetos e `42f916d81cd274b28044a410ae57a237` / 27 392 octetos — os pins
--    que vigoravam E os `md5(prosrc)` vivos medidos em PROD em 2026-09-23. Ou seja,
--    a copia editada era byte a byte o que estava aplicado.
--    ⚠ AS EDICOES FORAM APLICADAS POR SUBSTITUICAO DE ANCORA UNICA, e nao por
--    transcricao: uma ancora que aparecesse 0 ou 2 vezes abortava a montagem, em vez
--    de casar no lugar errado em silencio. Transcrever e o que fez duas das cinco
--    migrations do M8 chegarem a PROD com os comentarios descartados.
--    ⚠ POR QUE O RE-PIN E DE DUAS, E NAO DE UMA: o (C3/ii) exige que o motor CHAME
--    o plano, e a regra (ii) exige que os dois saiam da MESMA expressao. Mudar o que
--    o motor apaga sem mudar o que o plano conta e o P39/CR-02 outra vez — um
--    dry-run que diverge do predicado e decoracao.
--
-- ⚠⚠ RE-PIN DE `anonimizar_candidato` EM 2026-08-23 (Phase 46 / plano 46-04),
--    E ELE E ATO CONSCIENTE, MEDIDO E REVISAVEL — nao um numero atualizado para
--    fazer o gate passar.
--    O QUE MUDOU NO CORPO: a migration `20260823000006` acrescentou o QUARTO ramo
--    autorizado do guard (D-46-18 / D-46-24 / Blocker B-01), em duas metades
--    FISICAMENTE DISTINTAS — dry-run sob cerco em `dry_run` ou `live`, destrutivo
--    EXCLUSIVAMENTE sob `live`. Sem ele o cron nao consegue nem fazer o dry-run:
--    medido em PROD em 2026-08-22, como `postgres` e sem claims, `auth.uid()`,
--    `app_metadata.role` e `request.jwt.claims` sao os TRES nulos, e as tres
--    metades antigas recusavam com 42501.
--    ⚠ O CORPO ANTIGO FOI CONFERIDO ANTES DA EDICAO: o executor extraiu o corpo do
--    arquivo `20260805000006` e obteve exatamente `8c86e0f040219e7eade47eb587dbf5de`
--    / 34 488 octetos, o pin que vigorava e o `md5(prosrc)` vivo — ou seja, a copia
--    que ele editou era byte a byte o que estava aplicado em PROD.
--    ⚠ A EXTRACAO DO VALOR NOVO FOI CONFERIDA quanto a contaminacao de comentario
--    (a armadilha encontrada no plano 46-02, onde o `indexOf` casou uma mencao do
--    delimitador num comentario de cabecalho): o trecho comeca em `\nDECLARE\n` e
--    termina em `END;\n`. A migration `20260823000006` NAO menciona o delimitador
--    nomeado em prosa, de proposito.
--
-- ⚠⚠ RE-PIN DE `plano_exclusao_titular` EM 2026-08-23 (mesmo plano 46-04, MESMO
--    COMMIT), pelo **Blocker B-02** — e ele e o achado que quase escapou.
--    O QUE MUDOU: D-46-18 resolveu o guard de `anonimizar_candidato` e **so ele**.
--    Mas aquele corpo CHAMA esta funcao no PASSO 0 (`20260805000006:456`), e ela
--    tinha guard PROPRIO de duas metades que recusa chamador sem sessao — ou seja,
--    a chamada do cron era autorizada la e morria com 42501 AQUI, tres linhas
--    depois. `SECURITY DEFINER` nao ajuda: ele troca o papel do BANCO, e os dois
--    guards decidem sobre a CLAIM do JWT.
--    A migration `20260823000008` (Saida A, decisao do operador de 2026-08-22)
--    acrescenta o TERCEIRO ramo, nas DUAS metades — porque para um titular REAL a
--    metade (b) tambem recusaria (`<uuid> IS DISTINCT FROM NULL` e TRUE).
--
-- ⚠⚠ POR QUE OS DOIS PINS FORAM RE-CARIMBADOS **TRES** VEZES NO MESMO DIA, e a
--    explicacao importa mais que os numeros: o plano 46-04 escreveu os corpos, e
--    DUAS rodadas de code review bloqueante os corrigiram ANTES de qualquer apply.
--    A rodada 1 achou dois BLOCKERs (um revogava de `authenticated` o EXECUTE vivo
--    e derrubaria o direito de exclusao do titular; o outro deixava o 4o ramo sem
--    correlacao com o CHAMADOR). A rodada 2 pediu, entre outros, o ESCOPO HONESTO
--    do ramo escrito DENTRO do corpo — e foi essa escolha que mudou o md5 pela
--    terceira vez. **Escrever a correcao fora do corpo teria poupado o re-pin e
--    deixado a frase errada exatamente onde o proximo leitor a le**, que e a forma
--    do defeito que o BL-01 ja custou uma vez. O re-pin foi o preco, e ele e
--    barato perto disso.
--    ⚠ O CORPO ANTIGO FOI CONFERIDO ANTES DA EDICAO: extraido do arquivo
--    `20260805000005`, deu exatamente `97634d07ef13447e06741a8c8372fca6` / 21 349
--    octetos — o pin que vigorava e o `md5(prosrc)` vivo.
--    ⚠ NAO HA B-03, E ISSO FOI MEDIDO: a cadeia de chamadas com guard de sessao foi
--    varrida inteira; `anonimizar_candidato -> plano_exclusao_titular` e o UNICO
--    par, e esta funcao nao chama mais nenhuma funcao guardada.
--
--   HISTORICO DOS PINS — nao apagar, porque e o que torna a sequencia auditavel:
--   da para ver que cada pin mudou, quando, e por que, em vez de ter mudado sozinho.
--   ⚠ A COLUNA "vigorou em PROD" E A QUE IMPORTA, e ela distingue duas coisas que
--   um historico ingenuo confundiria: um pin que esteve APLICADO no banco, e um
--   pin que existiu apenas no repositorio entre dois commits do mesmo dia.
--     `anonimizar_candidato`:
--     · 8c86e0f040219e7eade47eb587dbf5de (34 488 octetos) — 2026-08-13 a
--       2026-08-23. **VIGOROU EM PROD**, inclusive durante a execucao do motor de
--       2026-08-22. E o valor contra o qual o corpo copiado foi conferido.
--     · 35d1df5d8a3739854e97dd7cbd0d600e (43 532 octetos) — 2026-08-23, algumas
--       horas. **NUNCA VIGOROU EM PROD**: escrito pelo plano 46-04 e SUPERADO
--       ANTES DE QUALQUER APPLY pela rodada 1 do `46-REVIEW.md` (BL-01, BL-02,
--       HI-02, HI-03).
--     · 4765cc68f83efb48494f0a78002dce06 (46 245 octetos) — 2026-08-23, algumas
--       horas. **NUNCA VIGOROU EM PROD**: superado pela rodada 2 (RD2-07, o
--       escopo honesto do ramo escrito DENTRO do corpo).
--       ⚠ Registrar os dois e deliberado: um pin que aparece e some sem
--       explicacao e indistinguivel de um pin trocado as escondidas, e o valor
--       deste historico esta justamente em distinguir "existiu no repositorio"
--       de "esteve APLICADO no banco".
--     `plano_exclusao_titular`:
--     · 97634d07ef13447e06741a8c8372fca6 (21 349 octetos) — 2026-08-13 a
--       2026-08-23. **VIGOROU EM PROD**, na mesma execucao.
--     · 3f6007b85f61d9d58548f560794e50b0 (26 108 octetos) — 2026-08-23, algumas
--       horas. **NUNCA VIGOROU EM PROD**, superado pela rodada 1.
--     · 12621ce84ec31c566b691fea280d3df2 (26 908 octetos) — 2026-08-23, algumas
--       horas. **NUNCA VIGOROU EM PROD**, superado pela rodada 2 (RD2-07).
--
--   medido : os DOIS re-pinados em 2026-08-23, POR EXECUCAO (nao transcrito, nao
--            inventado), com conferencia CRUZADA vivo x arquivo.
--            ⚠ E a medicao que autoriza o pin nao e "li o valor vivo e copiei" — isso
--            pinaria o que esta aplicado, seja la o que for, e o gate deixaria de
--            comparar. A conferencia feita foi a CRUZADA, nos dois lados:
--              md5(prosrc) VIVO (pg_proc, via MCP somente-leitura)  ==
--              md5(corpo)  do ARQUIVO commitado (extracao pelo comando abaixo)
--            Bateu nos DOIS, md5 E octetos, para as DUAS funcoes. Ou seja: o que esta
--            aplicado em PROD e byte a byte o que foi revisado nas 4 rodadas de review.
--            Os mesmos valores constam do `45-15-SUMMARY.md` e do `45-REVIEW-4.md`,
--            recomputados de forma independente — tres medicoes concordantes.
--   recomputar (se e somente se a migration mudar):
--     node -e 'const f=require("fs").readFileSync(process.argv[1],"utf8"),
--       D="$"+process.argv[2]+"$", a=f.indexOf(D), b=f.indexOf(D,a+D.length);
--       console.log(require("crypto").createHash("md5")
--         .update(f.slice(a+D.length,b),"utf8").digest("hex"))' \
--       supabase/migrations/20260823000006_p46_guard_purga.sql \
--       anonimizar_candidato
--     -- e, para a outra funcao:
--     --   … supabase/migrations/20260823000008_p46_guard_plano.sql \
--     --     plano_exclusao_titular
--     ⚠ OS DOIS ARQUIVOS MUDARAM NO 46-04. Recomputar contra a `20260805000006` ou
--       a `20260805000005` devolveria os corpos ANTERIORES aos ramos novos e
--       reprovaria com diagnostico falso — o `CREATE OR REPLACE` mais recente e o
--       que define o objeto vivo.
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

  -- ⚠⚠ 49-20 · AS QUINZE TABELAS DO PASSO `apagar_respostas_e_producoes`, E ELAS
  --    ENTRAM NA NEGATIVA DE RESIDUO POR UMA RAZAO NOVA. Ate aqui a metade de
  --    residuo provava que o smoke nao POLUIU producao. A partir deste plano ela
  --    prova tambem que o smoke nao APAGOU nada de producao: o passo novo remove
  --    linha em quatro destas tabelas, e se a subtransacao do Bloco B nao
  --    revertesse, as respostas de candidatos REAIS teriam ido junto — sem PITR e
  --    sem backup de Storage. Contagem global antes, contagem global depois.
  PERFORM set_config('smoke45m.rraven',   (SELECT count(*) FROM public.respostas_raven)::text,                 false);
  PERFORM set_config('smoke45m.rbig',     (SELECT count(*) FROM public.respostas_bigfive)::text,               false);
  PERFORM set_config('smoke45m.rdisc',    (SELECT count(*) FROM public.respostas_disc)::text,                  false);
  PERFORM set_config('smoke45m.rform',    (SELECT count(*) FROM public.respostas_formulario)::text,            false);
  PERFORM set_config('smoke45m.red',      (SELECT count(*) FROM public.redacoes_candidato)::text,              false);
  PERFORM set_config('smoke45m.redp',     (SELECT count(*) FROM public.redacoes_candidato_em_progresso)::text, false);
  PERFORM set_config('smoke45m.rcult',    (SELECT count(*) FROM public.respostas_cultura)::text,               false);
  PERFORM set_config('smoke45m.raval',    (SELECT count(*) FROM public.respostas_avaliacao)::text,             false);
  PERFORM set_config('smoke45m.cog',      (SELECT count(*) FROM public.cognitivo_respostas)::text,             false);
  PERFORM set_config('smoke45m.eon',      (SELECT count(*) FROM public.entrevistas_online)::text,              false);
  PERFORM set_config('smoke45m.epr',      (SELECT count(*) FROM public.entrevistas_presenciais)::text,         false);
  PERFORM set_config('smoke45m.ean',      (SELECT count(*) FROM public.entrevista_analises)::text,             false);
  PERFORM set_config('smoke45m.scand',    (SELECT count(*) FROM public.scores_candidato)::text,                false);
  PERFORM set_config('smoke45m.sraven',   (SELECT count(*) FROM public.scores_raven)::text,                    false);
  PERFORM set_config('smoke45m.pcult',    (SELECT count(*) FROM public.perguntas_cultura)::text,               false);

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

  -- ⚠ 45-REVIEW-4 / CR-01 — unicidade da sentinela de e-mail, MEDIDA dentro da
  --   subtransacao. Ver o comentario no ponto da medicao (junto ao SELECT do
  --   estado DEPOIS) e a assercao (B3/email) no julgamento.
  v_email_uniq  int;

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

  -- ── 49-14 · D-61 (o input), D-63 (comparativos), D-60 (a revisao) ─────────
  v_aicallid    uuid;      -- a linha de IA do titular (fixture 12/13)
  v_cmp_cita    uuid;      -- comparativo que CITA a candidatura do titular
  v_cmp_nao     uuid;      -- comparativo que NAO a cita — a assercao NEGATIVA
  v_upt_a       text;      -- user_prompt_template do titular, ANTES
  v_upt_d       text;      -- e DEPOIS
  v_cmp_upt_a   text;      -- o comparativo que cita, ANTES
  v_cmp_upt_d   text;      -- e DEPOIS, nas TRES colunas de conteudo
  v_cmp_raw_d   jsonb;
  v_cmp_rea_d   text;
  v_nao_upt_a   text;      -- o comparativo que NAO cita, ANTES
  v_nao_upt_d   text;      -- e DEPOIS — tem de ser IDENTICO
  v_nao_raw_a   jsonb;
  v_nao_raw_d   jsonb;
  v_nao_rea_a   text;
  v_nao_rea_d   text;
  v_rev_a       text;      -- decisao_final.revisao_resultado ANTES
  v_rev_d       text;      -- e DEPOIS
  v_revh_a      text;      -- decisao_final_historico.revisao_resultado ANTES
  v_revh_ident  int;       -- copias IDENTIFICAVEIS sobreviventes no arquivo
  v_revh_tot    int;       -- versoes do arquivo do titular com revisao NAO NULA
  -- ⚠ o dry-run, lido ANTES do tombstone (depois dele o titular ja nao existe) e
  --   comparado com a MESMA expressao medida a mao — a regra (ii) do (C3)
  v_plano_j     jsonb;
  v_pl_rev_c    int;
  v_pl_rev_a    int;
  v_pl_cmp_n    int;
  v_ex_rev_c    int;
  v_ex_rev_a    int;
  v_ex_cmp_n    int;
  v_passos      jsonb;

  -- ── 49-20 · D-48 / D-62 — o passo `apagar_respostas_e_producoes` ──────────
  -- ⚠ As origens do item `respostas_e_producoes` do recibo. Quatro delas perdem a
  --   LINHA (D-62); nas outras nove a linha fica e a coluna e redigida.
  v_rh_id       uuid;      -- usuarios_rh.id (agendado_por e FK para ELE, nao ao uid)
  v_perg_red    uuid;
  v_perg_cult   uuid;
  v_perg_form   uuid;
  v_q_big       uuid;
  v_q_disc      uuid;
  v_q_raven     uuid;
  v_eon_id      uuid;
  v_epr_id      uuid;
  v_ean_id      uuid;
  v_sc_sjt      uuid;
  v_red_id      uuid;
  v_redp_id     uuid;
  v_rcult_id    uuid;
  v_raval_id    uuid;
  v_cog_id      uuid;
  -- contagens das QUATRO do D-62, antes e depois (⊕ nao-vacuidade e ⊖ pos-estado)
  v_d62_rav_a   int;  v_d62_rav_d   int;
  v_d62_big_a   int;  v_d62_big_d   int;
  v_d62_dsc_a   int;  v_d62_dsc_d   int;
  v_d62_frm_a   int;  v_d62_frm_d   int;
  -- ⊕ os SCORES ficam: o D-62 e excecao para as RESPOSTAS, nunca para a prova
  v_scr_raven_d int;
  v_scr_cand_d  int;
  -- coluna a coluna: ANTES e DEPOIS
  v_red_txt_a   text;   v_red_txt_d   text;
  v_red_ana_a   jsonb;  v_red_ana_d   jsonb;
  v_redp_a      text;   v_redp_d      text;
  v_rcult_a     text;   v_rcult_d     text;
  v_raval_a     jsonb;  v_raval_d     jsonb;
  v_cog_raw_a   jsonb;  v_cog_raw_d   jsonb;
  v_cog_prc_a   jsonb;  v_cog_prc_d   jsonb;
  v_eon_tra_a   text;   v_eon_tra_d   text;
  v_eon_fbk_a   text;   v_eon_fbk_d   text;
  v_eon_res_a   text;   v_eon_res_d   text;
  v_eon_lnk_a   text;   v_eon_lnk_d   text;
  v_epr_doc_a   jsonb;  v_epr_doc_d   jsonb;
  v_ean_cit_a   jsonb;  v_ean_cit_d   jsonb;
  v_sc_cit_a    jsonb;  v_sc_cit_d    jsonb;
  v_sc_meta_a   jsonb;  v_sc_meta_d   jsonb;
  -- (B19) cited_evidence fora, o RESTO da analise dentro
  v_red_cit_d   int;    -- elementos de dimension_scores AINDA com cited_evidence
  v_red_ds_d    int;    -- e quantos elementos sobraram (a analise nao foi destruida)
  v_red_rea_d   int;    -- e quantos ainda tem `reasoning` (o resto ficou)
  v_sc_cit_n_d  int;
  v_sc_ds_d     int;
  -- (B23) 49-21 / D-69 · as ESCOLHAS da SJT em `metadata -> 'respostas'`
  v_sc_resp_a   boolean;  -- a chave existia ANTES (nao-vacuidade)
  v_sc_resp_d   boolean;  -- e nao existe DEPOIS
  v_sc_mot_d    text;     -- ⊕ o resto da metadata ficou (chave que SO o statement novo poderia levar)
  v_sc_out_a    int;      -- ⊖ CONTROLE: linhas de OUTRAS candidaturas com a chave, antes
  v_sc_out_d    int;      -- e depois — o escopo nao pode vazar para quem nao pediu exclusao
  -- (B20) as CATORZE contagens: plano, expressao a mao, e o que o motor declarou
  v_pl_rp       jsonb;
  v_ps_rp       jsonb;
  v_ex_rp       jsonb;
  v_rp_div      text := '';
  v_rp_k        text;
  v_rp_chaves   constant text[] := ARRAY['respostas_raven','respostas_bigfive','respostas_disc',
                                         'respostas_formulario','redacoes_candidato',
                                         'redacoes_candidato_em_progresso','respostas_cultura',
                                         'respostas_avaliacao','cognitivo_respostas',
                                         'entrevistas_online','entrevistas_presenciais',
                                         'entrevista_analises_citacoes','scores_candidato',
                                         -- 49-21 / D-69: a CATORZE. Acrescentada aqui, a chave
                                         -- entra nas TRES fontes da (B20) por construcao.
                                         'scores_candidato_respostas_sjt'];
  -- (B21)/(B22) a janela e o controle
  v_guc_depois  text;
  v_ctrl_st     text := '<nao medido>';

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

    -- ⚠ Phase 48 / 48-01 (JORN-26): o `rejeitado` acima SÓ desarma o dispatch do
    -- AFTER INSERT. Deixá-lo na linha fazia a fixture ter a forma de uma candidatura
    -- ENCERRADA (status terminal) fingindo estar em andamento — era o Defeito 26
    -- codificado no smoke. `em_analise` agora: nenhum trigger de dispatch dispara em
    -- UPDATE de status, e `guard_rejeicao_auditada` só olha a ENTRADA em `rejeitado`.
    -- Este bloco (B) não depende do status; a troca é por coerência com (C6).
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_candtr;

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
    -- ⚠⚠ 49-14 / D-60 · A FIXTURE TRAZ O CICLO DE REVISAO DO Art. 20 COMPLETO, e nao
    --    so `revisao_resultado` solto. Duas razoes, e a segunda e a que importa:
    --      1. os CHECKs vivos amarram os campos — `..._resposta_completa_check` exige
    --         veredito + revisor + data juntos, ou nenhum dos tres;
    --      2. **e `..._revisao_justificativa_min_check` exige
    --         `length(btrim(coalesce(revisao_resultado,''))) >= 50` sempre que houver
    --         veredito.** Com o veredito preenchido, esta fixture EXERCITA esse CHECK:
    --         se a sentinela do motor fosse curta, o tombstone abortaria aqui com
    --         23514 — e num pedido REAL isso acontece DEPOIS de o curriculo ja ter sido
    --         apagado do Storage, sem caminho de volta (Pitfall 1). Uma fixture sem
    --         veredito deixaria a sentinela curta passar, e o smoke ficaria verde
    --         sobre a propria armadilha que ele deveria pegar.
    -- ⚠ O revisor e o MESMO administrador. Isso nao afrouxa nada aqui: o guard de
    --   revisor-diferente-do-decisor vive em `responder_revisao_decisao`, e esta
    --   fixture escreve direto na tabela de proposito — o que esta sob teste e o
    --   TOMBSTONE, nao o ciclo de revisao.
    INSERT INTO public.decisao_final
      (candidatura_id, decisao, justificativa, por_usuario,
       revisao_solicitada_em, revisao_veredito, revisao_por_usuario,
       revisao_respondida_em, revisao_resultado)
    VALUES
      (v_candtr, 'em_espera',
       'SMOKE P45 fixture: justificativa sintetica com mais de cinquenta caracteres para exercitar a preservacao anonimizada exigida pela D-45-02.',
       v_admin_auth,
       now() - interval '10 days', 'mantida', v_admin_auth, now() - interval '9 days',
       'SMOKE P45 fixture: resposta do revisor ao pedido de revisao, sintetica, com mais de cinquenta caracteres, para exercitar a D-60 e o CHECK de tamanho minimo.');

    -- (fixture 6/13) decisao_final_historico — a SONDA 4e mediu esta tabela em ZERO
    -- linhas. Sem esta linha, a assercao de contagem do ERASE-08 sobre ela seria
    -- satisfeita TRIVIALMENTE e nao provaria nada (D-45-03).
    -- ⚠ 49-14 / D-60: a versao arquivada tambem carrega `revisao_resultado`. Sem ela,
    --   a metade "e em TODAS as versoes do arquivo" da assercao (B15) mediria SO a
    --   versao que o snapshot cria durante o passo — e um scrub que alcancasse apenas
    --   a linha nova (a mais recente) passaria, deixando as ANTIGAS identificaveis.
    --   O arquivo e onde a copia sobrevive; e por isso que ele precisa de duas.
    INSERT INTO public.decisao_final_historico
      (candidatura_id, decisao, justificativa, por_usuario, decidido_em,
       revisao_solicitada_em, revisao_veredito, revisao_por_usuario,
       revisao_respondida_em, revisao_resultado)
    VALUES
      (v_candtr, 'em_espera',
       'SMOKE P45 fixture: justificativa arquivada, sintetica, com mais de cinquenta caracteres, exigida pela D-45-03.',
       v_admin_auth, now() - interval '20 days',
       now() - interval '19 days', 'mantida', v_admin_auth, now() - interval '18 days',
       'SMOKE P45 fixture: resposta do revisor ARQUIVADA, sintetica, com mais de cinquenta caracteres, para a metade "todas as versoes" da D-60.');

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
    -- ⚠⚠ 49-14 / D-61: `user_prompt_template` deixou de ser a palavra `'usuario'`. Ela
    --    e `text NOT NULL` e guarda o INPUT que foi ao modelo — o texto que a PESSOA
    --    escreveu, mais a fala literal transcrita nas chamadas de entrevista. Com
    --    `'usuario'` a assercao (B12) compararia um valor generico contra a sentinela e
    --    passaria sem provar nada sobre conteudo identificavel: o valor agora carrega o
    --    NOME da fixture, e e por isso que a comparacao "o valor de ANTES desapareceu"
    --    significa alguma coisa.
    INSERT INTO public.ai_call_logs
      (call_type, provider, model_id, prompt_hash, prompt_version_id,
       input_token_count, output_token_count, latency_ms, raw_response, retain_until,
       system_prompt, user_prompt_template, parsed_reasoning, candidato_id, vaga_id)
    VALUES
      ('cv_summary', 'anthropic', 'modelo-sintetico-p45', 'p45smokehash', v_pv,
       1, 1, 1, '{"texto":"resposta sintetica do modelo sobre SMOKE P45 Titular Sintetico"}'::jsonb,
       now() + interval '30 days',
       'sistema',
       'SMOKE P45 fixture (input): curriculo de SMOKE P45 Titular Sintetico, ' ||
       v_email_fix || ', Campinas/SP. Trecho literal do que a pessoa escreveu.',
       'SMOKE P45 fixture: raciocinio do modelo sobre o titular sintetico.',
       v_cand, v_vaga)
    RETURNING id INTO v_aicallid;

    -- (fixture 12b/13) ⚠⚠ 49-14 / D-63 · O COMPARATIVO QUE **CITA** O TITULAR.
    -- `candidato_id` fica NULL de proposito — e o estado REAL medido em PROD (a
    -- chamada e sobre varias pessoas, nao ha UM titular a quem apontar), e e
    -- exatamente por isso que o passo (1/5) nunca a alcancou. O endereco e o proprio
    -- prompt: a EF monta cada bloco como `Candidato C<n> (id=<candidatura_id>)`
    -- (comparativo-candidatos/index.ts:382). O `id=` abaixo e o da candidatura da
    -- fixture, e e o unico fio entre esta linha e o titular.
    INSERT INTO public.ai_call_logs
      (call_type, provider, model_id, prompt_hash, prompt_version_id,
       input_token_count, output_token_count, latency_ms, raw_response, retain_until,
       system_prompt, user_prompt_template, parsed_reasoning, candidato_id, vaga_id)
    VALUES
      ('comparative_ranking', 'anthropic', 'modelo-sintetico-p45', 'p45smokehash', v_pv,
       1, 1, 1, '{"ranking":"C1 acima de C2 — SMOKE P45 Titular Sintetico"}'::jsonb,
       now() + interval '30 days',
       'sistema',
       'SMOKE P45 fixture (comparativo que CITA): Candidato C1 (id=' || v_candtr::text ||
       ') SMOKE P45 Titular Sintetico, Campinas/SP. Candidato C2 (id=' ||
       gen_random_uuid()::text || ') outra pessoa.',
       'SMOKE P45 fixture: raciocinio do comparativo que cita o titular.',
       NULL, v_vaga)
    RETURNING id INTO v_cmp_cita;

    -- (fixture 12c/13) ⊖ 49-14 / D-63 · O COMPARATIVO QUE **NAO** CITA O TITULAR.
    -- ⚠ Ela e a metade que impede o falso verde mais caro deste passo: sem esta linha,
    --   "a redacao funcionou" seria indistinguivel de "o passo redigiu TODA linha de
    --   comparativo do banco". A segunda destruiria o historico de IA de terceiros que
    --   nada tem a ver com este titular — e passaria pela (B13) sem um aviso. As duas
    --   candidaturas citadas aqui sao uuids sorteados, que nao existem.
    INSERT INTO public.ai_call_logs
      (call_type, provider, model_id, prompt_hash, prompt_version_id,
       input_token_count, output_token_count, latency_ms, raw_response, retain_until,
       system_prompt, user_prompt_template, parsed_reasoning, candidato_id, vaga_id)
    VALUES
      ('comparative_ranking', 'anthropic', 'modelo-sintetico-p45', 'p45smokehash', v_pv,
       1, 1, 1, '{"ranking":"C1 acima de C2 — terceiros"}'::jsonb,
       now() + interval '30 days',
       'sistema',
       'SMOKE P45 fixture (comparativo que NAO cita): Candidato C1 (id=' ||
       gen_random_uuid()::text || ') pessoa alheia. Candidato C2 (id=' ||
       gen_random_uuid()::text || ') outra pessoa alheia.',
       'SMOKE P45 fixture: raciocinio do comparativo de terceiros.',
       NULL, v_vaga)
    RETURNING id INTO v_cmp_nao;

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

    -- ═══════════════════════════════════════════════════════════════════════
    -- (fixtures 15/28 .. 28/28) ⚠⚠ 49-20 / D-48 · AS ORIGENS DO ITEM
    -- `respostas_e_producoes` DO RECIBO. Sem elas, TODA assercao do passo novo
    -- passa por VACUIDADE e conta como verde — e o passo novo APAGA LINHA em
    -- quatro delas. Ausencia de fixture aqui nao e "um teste a menos": e um
    -- portao que se declara satisfeito sobre um apagamento que ninguem viu.
    -- ⚠ Medido em PROD: `respostas_cultura`, `respostas_bigfive`,
    --   `respostas_disc`, `cognitivo_respostas` e
    --   `redacoes_candidato_em_progresso` estao em ZERO linhas — exatamente a
    --   familia de tabelas que a SONDA 4e obrigou a popular no 45-07.
    -- ═══════════════════════════════════════════════════════════════════════

    -- (15/28) os atores e as perguntas/questoes REAIS de que as origens dependem.
    -- ⚠ `agendado_por` e FK para `usuarios_rh(id)`, e NAO para o `auth.uid()` que
    --   `v_admin_auth` carrega. Confundir os dois da 23503 no meio da fixture.
    SELECT u.id INTO v_rh_id FROM public.usuarios_rh u WHERE u.user_id = v_admin_auth LIMIT 1;
    SELECT p.id INTO v_perg_red  FROM public.perguntas_redacao p    ORDER BY p.id LIMIT 1;
    SELECT p.id INTO v_perg_form FROM public.perguntas_formulario p ORDER BY p.id LIMIT 1;
    SELECT q.id INTO v_q_big     FROM public.questoes_bigfive q     ORDER BY q.id LIMIT 1;
    SELECT q.id INTO v_q_disc    FROM public.questoes_disc q        ORDER BY q.id LIMIT 1;
    SELECT q.id INTO v_q_raven   FROM public.questoes_raven q       ORDER BY q.id LIMIT 1;

    IF v_rh_id IS NULL OR v_perg_red IS NULL OR v_perg_form IS NULL
       OR v_q_big IS NULL OR v_q_disc IS NULL OR v_q_raven IS NULL THEN
      RAISE EXCEPTION 'P45M FAIL (B/fixture 49-20): falta um ator ou um banco de questoes real (usuarios_rh.id=%, perguntas_redacao=%, perguntas_formulario=%, questoes_bigfive=%, questoes_disc=%, questoes_raven=%). Sem eles as origens do item respostas_e_producoes nao podem ser criadas, e TODA assercao do passo apagar_respostas_e_producoes passaria por VACUIDADE. Ausencia de fixture e FALHA DE TESTE, nunca verde',
        v_rh_id, v_perg_red, v_perg_form, v_q_big, v_q_disc, v_q_raven;
    END IF;

    -- (16/28) perguntas_cultura — medida em ZERO linhas em PROD, entao a pergunta
    -- tambem e sintetica. `ordem` tem CHECK 1..7 (lido do catalogo vivo).
    INSERT INTO public.perguntas_cultura (vaga_id, ordem, texto_pergunta)
    VALUES (v_vaga, 1, 'SMOKE P45 fixture: pergunta de cultura sintetica.')
    RETURNING id INTO v_perg_cult;

    -- (17/28) redacoes_candidato — `texto` e `text NOT NULL` (sentinela), e
    -- `analise_ia` carrega `dimension_scores[]` com `cited_evidence`: o TRECHO
    -- LITERAL do que a pessoa escreveu, com localizacao. Medido em PROD: 2 linhas,
    -- 4 de 4 elementos com citacao em cada.
    -- ⚠ `word_count` tem CHECK 200..500 e NAO e tocado pelo passo: o valor fica
    --   coerente com o texto ORIGINAL, e e isso que o trigger exige (ele recusa
    --   qualquer mudanca de `word_count` feita por rh/admin).
    -- ⚠ O `reasoning` de cada elemento fica. E ele que a assercao (B19) usa para
    --   provar que a analise NAO foi destruida junto com a citacao.
    INSERT INTO public.redacoes_candidato
      (candidatura_id, pergunta_id, ordem, eh_pergunta_padrao, texto, word_count,
       texto_hash, tempo_gasto_segundos, analise_ia, status_analise)
    VALUES
      (v_candtr, v_perg_red, 1, true,
       'SMOKE P45 fixture (redacao): o texto que SMOKE P45 Titular Sintetico escreveu, com o nome dentro para que a assercao de desaparecimento signifique alguma coisa.',
       250, 'p45smoke-texto-hash', 900,
       jsonb_build_object(
         'dimension_scores', jsonb_build_array(
           jsonb_build_object('dimension', 'D1', 'score', 5, 'level', 'exemplary',
                              'reasoning', 'SMOKE P45 fixture: raciocinio da dimensao 1, que FICA.',
                              'cited_evidence', jsonb_build_array(
                                jsonb_build_object('text', 'SMOKE P45 fixture: trecho literal citado da redacao do titular.',
                                                   'location', 'Paragrafo 1'))),
           jsonb_build_object('dimension', 'D2', 'score', 4, 'level', 'proficient',
                              'reasoning', 'SMOKE P45 fixture: raciocinio da dimensao 2, que FICA.',
                              'cited_evidence', jsonb_build_array(
                                jsonb_build_object('text', 'SMOKE P45 fixture: segundo trecho literal do titular.',
                                                   'location', 'Paragrafo 3')))),
         'composite_0_25', 18),
       'concluida')
    RETURNING id INTO v_red_id;

    -- (18/28) redacoes_candidato_em_progresso — `texto_em_progresso` NULAVEL.
    -- ⚠ A pergunta e a MESMA: a UNIQUE e (candidatura_id, pergunta_id) e vale POR
    --   TABELA, e o rascunho do mesmo enunciado e o caso real.
    INSERT INTO public.redacoes_candidato_em_progresso
      (candidatura_id, pergunta_id, texto_em_progresso)
    VALUES (v_candtr, v_perg_red,
            'SMOKE P45 fixture (rascunho): o que SMOKE P45 Titular Sintetico estava escrevendo quando saiu.')
    RETURNING id INTO v_redp_id;

    -- (19/28) respostas_cultura — `resposta_texto` e `text NOT NULL` (sentinela)
    INSERT INTO public.respostas_cultura (candidatura_id, pergunta_id, resposta_texto)
    VALUES (v_candtr, v_perg_cult,
            'SMOKE P45 fixture (cultura): resposta escrita por SMOKE P45 Titular Sintetico.')
    RETURNING id INTO v_rcult_id;

    -- (20/28) respostas_avaliacao — `respostas` e `jsonb NOT NULL` (sentinela jsonb)
    INSERT INTO public.respostas_avaliacao (candidatura_id, teste, respostas)
    VALUES (v_candtr, 'sjt',
            '{"q1":"SMOKE P45 fixture: alternativa justificada pelo titular"}'::jsonb)
    RETURNING id INTO v_raval_id;

    -- (21/28) cognitivo_respostas — as DUAS colunas sao `jsonb NOT NULL`.
    -- ⚠ `proctoring` entra junto: e observacao sobre a PESSOA durante a prova
    --   (foco de janela, tempo por item), nao telemetria de custo.
    INSERT INTO public.cognitivo_respostas (candidatura_id, raw_responses, proctoring)
    VALUES (v_candtr,
            '{"itens":[{"id":1,"marcada":3}],"nota":"SMOKE P45 fixture"}'::jsonb,
            '{"trocas_de_janela":2,"nota":"SMOKE P45 fixture"}'::jsonb)
    RETURNING id INTO v_cog_id;

    -- (22/28) entrevistas_online — transcricao/feedback/resumo NULAVEIS, e
    -- `link_videochamada` `text NOT NULL`. ⚠ `data_agendada > created_at` e CHECK
    -- VIVO: uma data no passado aborta a fixture inteira.
    INSERT INTO public.entrevistas_online
      (candidatura_id, data_agendada, link_videochamada, agendado_por,
       duracao_estimada_minutos, transcricao, feedback_candidato, resumo_ia)
    VALUES
      (v_candtr, now() + interval '7 days',
       'https://meet.example/p45smoke-sala-de-SMOKE-P45-Titular-Sintetico', v_rh_id, 60,
       'SMOKE P45 fixture (transcricao): a fala literal de SMOKE P45 Titular Sintetico na entrevista.',
       'SMOKE P45 fixture (feedback): o que o titular achou do processo.',
       'SMOKE P45 fixture (resumo): resumo automatico da entrevista do titular.')
    RETURNING id INTO v_eon_id;

    -- (23/28) entrevistas_presenciais — `documentos_apresentados` jsonb NULAVEL
    INSERT INTO public.entrevistas_presenciais
      (candidatura_id, data_agendada, local_entrevista, agendado_por,
       duracao_estimada_minutos, documentos_apresentados)
    VALUES
      (v_candtr, now() + interval '8 days', 'Unidade sintetica p45', v_rh_id, 60,
       '{"documentos":["SMOKE P45 fixture: RG de SMOKE P45 Titular Sintetico"]}'::jsonb)
    RETURNING id INTO v_epr_id;

    -- (24/28) entrevista_analises — `citacoes` guarda a fala LITERAL; a coluna e
    -- NULAVEL e recebe NULL. `competencias` FICA: medida em PROD, ela tem apenas
    -- `{competency, score}` — nenhum texto — e e prova de que houve avaliacao.
    INSERT INTO public.entrevista_analises
      (candidatura_id, tipo, competencias, citacoes)
    VALUES
      (v_candtr, 'online',
       '[{"competency":"Comunicacao","score":4}]'::jsonb,
       jsonb_build_array(jsonb_build_object(
         'competency', 'Comunicacao',
         'cited_evidence', jsonb_build_array(jsonb_build_object(
           'text', 'SMOKE P45 fixture: fala literal de SMOKE P45 Titular Sintetico na entrevista.')))))
    RETURNING id INTO v_ean_id;

    -- (25/28) scores_candidato tipo `sjt` — `citacoes` NULAVEL e `metadata`
    -- `jsonb NOT NULL` com `dimension_scores[]` carregando `cited_evidence`.
    -- ⚠ A LINHA FICA: `composite_0_25` e as notas por dimensao sao a prova de
    --   nao-discriminacao (RNF-07a), e so a citacao literal sai de dentro.
    -- ⚠⚠ 49-21 / D-69 · A CHAVE `respostas` ENTRA NA FIXTURE, e com a FORMA MEDIDA
    --    em PROD pelo 49-20 (`opcao_id`/`pergunta_id`/`peso` — as alternativas que a
    --    pessoa marcou, presentes em 4 das 5 linhas `sjt`). `motivos_revisao` entra
    --    junto como TESTEMUNHA: e uma chave que o statement novo NAO pode levar, e e
    --    ela que distingue «a chave respostas saiu» de «a metadata foi substituida».
    INSERT INTO public.scores_candidato (candidatura_id, tipo, metadata, citacoes)
    VALUES
      (v_candtr, 'sjt'::public.tipo_score,
       jsonb_build_object(
         'composite_0_25', 17,
         'motivos_revisao', jsonb_build_array('dimensao_desconhecida'),
         'respostas', jsonb_build_array(jsonb_build_object(
           'pergunta_id', '00000000-0000-4000-8000-000000000045',
           'opcao_id',    '00000000-0000-4000-8000-000000000046',
           'peso',        3)),
         'dimension_scores', jsonb_build_array(
           jsonb_build_object('dimension', 'Avaliacao diagnostica', 'score', 4,
                              'level', 'proficient',
                              'reasoning', 'SMOKE P45 fixture: raciocinio da SJT, que FICA.',
                              'cited_evidence', jsonb_build_array(
                                jsonb_build_object('text', 'SMOKE P45 fixture: trecho literal da resposta do titular na SJT.'))))),
       jsonb_build_array(jsonb_build_object(
         'text', 'SMOKE P45 fixture: citacao avulsa da resposta do titular.')))
    RETURNING id INTO v_sc_sjt;

    -- ⚠⚠ 49-21 / D-69 · UMA SEGUNDA LINHA DE SCORE DO TITULAR, **SEM** a chave
    --    `respostas` e sem `citacoes`. Ela nao e enfeite: sem ela o titular tem UMA
    --    linha de score, `ROW_COUNT` sem o predicado `jsonb_exists` daria o MESMO 1
    --    da contagem correta, e a (B20) passaria sobre um statement que conta VISITAS
    --    em vez de RASPAGENS. Com ela, a mutacao que remove o predicado sai NOMEADA
    --    pelo smoke — e nao apenas pelo pos-portao do apply, que roda uma vez e nunca
    --    mais. O `tipo` e outro porque a unicidade e (candidatura, tipo, subtipo,
    --    pergunta) — medida no catalogo vivo.
    INSERT INTO public.scores_candidato (candidatura_id, tipo, metadata)
    VALUES (v_candtr, 'cognitivo'::public.tipo_score,
            jsonb_build_object('composite_0_25', 9, 'sem_respostas_por_desenho', true));

    -- (26/28 .. 28/28) ⚠⚠ AS TRES TABELAS DO D-62 QUE PERDEM A LINHA, mais a
    -- quarta (`respostas_formulario`) logo abaixo. Uma resposta em cada: os
    -- calculadores AFTER INSERT so disparam na questao 100/28/60 (medido nos tres
    -- corpos), entao uma linha nao recalcula score nenhum.
    INSERT INTO public.respostas_raven (candidatura_id, questao_id, resposta)
    VALUES (v_candtr, v_q_raven, 5);

    INSERT INTO public.respostas_bigfive (candidatura_id, questao_id, resposta)
    VALUES (v_candtr, v_q_big, 4);

    -- ⚠ `mais_caracteristico <> menos_caracteristico` e CHECK VIVO
    INSERT INTO public.respostas_disc (candidatura_id, questao_id, mais_caracteristico, menos_caracteristico)
    VALUES (v_candtr, v_q_disc, 'D', 'S');

    -- ⚠ `resposta_preenchida_check` exige AO MENOS UMA das tres colunas nao nula —
    --   e e exatamente esse CHECK que torna a sentinela impossivel aqui (anular a
    --   de texto numa linha sem as outras duas aborta com 23514). Por isso D-62.
    INSERT INTO public.respostas_formulario (candidatura_id, pergunta_id, resposta_texto)
    VALUES (v_candtr, v_perg_form,
            'SMOKE P45 fixture (formulario): resposta aberta de SMOKE P45 Titular Sintetico.');

    -- ⊕ E O SCORE DO RAVEN, QUE **FICA**. Ele e a metade que impede o excesso: o
    --   D-62 e excecao para as RESPOSTAS de multipla escolha, jamais para a prova
    --   de que houve avaliacao. Sem esta linha, "as respostas sumiram" seria
    --   indistinguivel de "o cognitivo inteiro do titular foi destruido".
    INSERT INTO public.scores_raven
      (candidatura_id, total_acertos, percentual_acerto, percentil, classificacao,
       acertos_por_serie, tempo_total_segundos)
    VALUES (v_candtr, 42, 70.0, 65, 'Médio', '{"A":10,"B":10}'::jsonb, 1800);

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

    -- ── 49-14 · ESTADO ANTES das tres origens novas ────────────────────────────
    SELECT l.user_prompt_template INTO v_upt_a
      FROM public.ai_call_logs l WHERE l.id = v_aicallid;
    SELECT l.user_prompt_template INTO v_cmp_upt_a
      FROM public.ai_call_logs l WHERE l.id = v_cmp_cita;
    SELECT l.user_prompt_template, l.raw_response, l.parsed_reasoning
      INTO v_nao_upt_a, v_nao_raw_a, v_nao_rea_a
      FROM public.ai_call_logs l WHERE l.id = v_cmp_nao;
    SELECT d.revisao_resultado INTO v_rev_a
      FROM public.decisao_final d WHERE d.candidatura_id = v_candtr;
    SELECT h.revisao_resultado INTO v_revh_a
      FROM public.decisao_final_historico h
     WHERE h.candidatura_id = v_candtr AND h.revisao_resultado IS NOT NULL
     LIMIT 1;

    -- ⚠⚠ AS TRES CONTAGENS MEDIDAS A MAO, PELA EXPRESSAO DO MOTOR, e medidas AQUI —
    --    depois do tombstone o titular ja nao existe e estas consultas dariam zero,
    --    reprovando a implementacao CORRETA em toda execucao. E o defeito nº 6 da
    --    Phase 45 (a `(B3/email)` medida depois do rollback da propria fixture) com
    --    outra cara, e este arquivo o carrega escrito como licao.
    SELECT count(*) INTO v_ex_rev_c
      FROM public.decisao_final d
     WHERE d.revisao_resultado IS NOT NULL
       AND d.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand);
    SELECT count(*) INTO v_ex_rev_a
      FROM public.decisao_final_historico h
     WHERE h.revisao_resultado IS NOT NULL
       AND h.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand);
    SELECT count(*) INTO v_ex_cmp_n
      FROM public.ai_call_logs l
     WHERE l.call_type = 'comparative_ranking'
       AND EXISTS (SELECT 1 FROM public.candidaturas c
                    WHERE c.candidato_id = v_cand
                      AND position('id=' || c.id::text IN l.user_prompt_template) > 0);

    -- ── 49-20 · ESTADO ANTES das treze origens de `respostas_e_producoes` ─────
    -- ⚠ TODAS lidas POR ID, nunca pelo ponteiro ao titular: o tombstone corta os
    --   ponteiros, e reler por eles DEPOIS devolveria zero linhas e reprovaria a
    --   implementacao CORRETA. As quatro do D-62 sao contadas pelo ESCOPO, porque
    --   e a contagem — e nao a linha — que a assercao mede.
    SELECT count(*) INTO v_d62_rav_a FROM public.respostas_raven      WHERE candidatura_id = v_candtr;
    SELECT count(*) INTO v_d62_big_a FROM public.respostas_bigfive    WHERE candidatura_id = v_candtr;
    SELECT count(*) INTO v_d62_dsc_a FROM public.respostas_disc       WHERE candidatura_id = v_candtr;
    SELECT count(*) INTO v_d62_frm_a FROM public.respostas_formulario WHERE candidatura_id = v_candtr;

    SELECT r.texto, r.analise_ia INTO v_red_txt_a, v_red_ana_a
      FROM public.redacoes_candidato r WHERE r.id = v_red_id;
    SELECT p.texto_em_progresso INTO v_redp_a
      FROM public.redacoes_candidato_em_progresso p WHERE p.id = v_redp_id;
    SELECT u.resposta_texto INTO v_rcult_a
      FROM public.respostas_cultura u WHERE u.id = v_rcult_id;
    SELECT a.respostas INTO v_raval_a
      FROM public.respostas_avaliacao a WHERE a.id = v_raval_id;
    SELECT g.raw_responses, g.proctoring INTO v_cog_raw_a, v_cog_prc_a
      FROM public.cognitivo_respostas g WHERE g.id = v_cog_id;
    SELECT e.transcricao, e.feedback_candidato, e.resumo_ia, e.link_videochamada
      INTO v_eon_tra_a, v_eon_fbk_a, v_eon_res_a, v_eon_lnk_a
      FROM public.entrevistas_online e WHERE e.id = v_eon_id;
    SELECT f.documentos_apresentados INTO v_epr_doc_a
      FROM public.entrevistas_presenciais f WHERE f.id = v_epr_id;
    SELECT n.citacoes INTO v_ean_cit_a
      FROM public.entrevista_analises n WHERE n.id = v_ean_id;
    SELECT s.citacoes, s.metadata INTO v_sc_cit_a, v_sc_meta_a
      FROM public.scores_candidato s WHERE s.id = v_sc_sjt;

    -- (B23) 49-21 / D-69 · nao-vacuidade + o ⊖ CONTROLE de escopo.
    -- ⚠ O controle NAO usa fixture: ele conta as linhas de OUTRAS candidaturas que
    --   hoje carregam a chave em PROD (medido pelo 49-20: 4 das 5 `sjt`). Uma mutacao
    --   que remova o filtro por `candidatura_id` levaria as escolhas de quem NAO pediu
    --   exclusao, e nenhuma assercao de pos-estado sobre a fixture veria isso — e a
    --   mesma classe da (B14) do 49-14 e da M13 do 49-20.
    v_sc_resp_a := jsonb_exists(v_sc_meta_a, 'respostas');
    SELECT count(*) INTO v_sc_out_a
      FROM public.scores_candidato s
     WHERE jsonb_exists(s.metadata, 'respostas')
       AND s.candidatura_id NOT IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand);

    -- ⚠⚠ AS TREZE CONTAGENS MEDIDAS A MAO, PELA EXPRESSAO DO MOTOR, e medidas AQUI
    --    — depois do tombstone o titular ja nao existe e estas consultas dariam
    --    zero, reprovando a implementacao CORRETA em toda execucao (o defeito nº 6
    --    da Phase 45, que este arquivo ja carrega escrito como licao). As condicoes
    --    `IS NOT NULL` e o predicado da SJT estao aqui porque estao no motor: sem
    --    elas a contagem mediria VISITAS em vez de RASPAGENS.
    SELECT jsonb_build_object(
      'respostas_raven',      (SELECT count(*) FROM public.respostas_raven x
                                WHERE x.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'respostas_bigfive',    (SELECT count(*) FROM public.respostas_bigfive x
                                WHERE x.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'respostas_disc',       (SELECT count(*) FROM public.respostas_disc x
                                WHERE x.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'respostas_formulario', (SELECT count(*) FROM public.respostas_formulario x
                                WHERE x.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'redacoes_candidato',   (SELECT count(*) FROM public.redacoes_candidato r
                                WHERE r.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'redacoes_candidato_em_progresso',
                              (SELECT count(*) FROM public.redacoes_candidato_em_progresso p
                                WHERE p.texto_em_progresso IS NOT NULL
                                  AND p.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'respostas_cultura',    (SELECT count(*) FROM public.respostas_cultura u
                                WHERE u.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'respostas_avaliacao',  (SELECT count(*) FROM public.respostas_avaliacao a
                                WHERE a.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'cognitivo_respostas',  (SELECT count(*) FROM public.cognitivo_respostas g
                                WHERE g.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'entrevistas_online',   (SELECT count(*) FROM public.entrevistas_online e
                                WHERE e.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'entrevistas_presenciais',
                              (SELECT count(*) FROM public.entrevistas_presenciais f
                                WHERE f.documentos_apresentados IS NOT NULL
                                  AND f.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'entrevista_analises_citacoes',
                              (SELECT count(*) FROM public.entrevista_analises n
                                WHERE n.citacoes IS NOT NULL
                                  AND n.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)),
      'scores_candidato',     (SELECT count(*) FROM public.scores_candidato s
                                WHERE s.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand)
                                  AND ( s.citacoes IS NOT NULL
                                     OR ( s.tipo = 'sjt'::public.tipo_score
                                          AND jsonb_typeof(s.metadata -> 'dimension_scores') = 'array'
                                          AND EXISTS (SELECT 1 FROM jsonb_array_elements(s.metadata -> 'dimension_scores') z
                                                       WHERE jsonb_exists(z, 'cited_evidence')) ) )),
      -- 49-21 / D-69 · a MESMA expressao do statement (14/14), `jsonb_exists` incluso
      'scores_candidato_respostas_sjt',
                              (SELECT count(*) FROM public.scores_candidato s
                                WHERE jsonb_exists(s.metadata, 'respostas')
                                  AND s.candidatura_id IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand))
    ) INTO v_ex_rp;

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

    -- ⚠ 45-REVIEW-4 / CR-01 — A UNICIDADE E MEDIDA AQUI, DENTRO DA SUBTRANSACAO.
    --   O julgamento roda DEPOIS do `RAISE ... P45B0` que reverte a fixture inteira: la a
    --   linha de `candidatos` JA NAO EXISTE, e uma consulta VIVA contra ela devolve 0,
    --   fazendo `0 <> 1` disparar em TODA execucao, com o motor CORRETO. Era a UNICA
    --   consulta viva entre as ~40 assercoes do julgamento — todas as outras leem apenas
    --   variaveis capturadas aqui dentro, que o rollback de subtransacao nao reverte.
    --   Mesmo padrao da auto-verificacao de 20260805000006:1235, que mede e SO ENTAO julga
    --   — e aquela migration aplicou em PROD, logo esta propriedade ja esta provada viva.
    SELECT count(*) INTO v_email_uniq FROM public.candidatos c WHERE c.email = v_email_d;

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

    -- ── 49-14 · ESTADO DEPOIS + o que o proprio motor DECLAROU ─────────────────
    -- ⚠⚠ O DRY-RUN E LIDO DE DENTRO DO RETORNO DO MOTOR (`'plano'`), e nao por uma
    --    segunda chamada a `plano_exclusao_titular`. E a forma mais forte disponivel:
    --    esse jsonb e o plano que O MOTOR viu no PASSO 0, na MESMA transacao, sobre o
    --    MESMO estado. Uma segunda chamada mediria outro instante — e, depois do
    --    tombstone, mediria um titular que ja nao existe.
    v_plano_j  := (v_ret::jsonb) -> 'plano';
    v_passos   := (v_ret::jsonb) -> 'passos';
    v_pl_rev_c := (v_plano_j -> 'tombstone_decisao_final' ->> 'revisao_resultado_corrente')::int;
    v_pl_rev_a := (v_plano_j -> 'tombstone_decisao_final' ->> 'revisao_resultado_arquivo')::int;
    v_pl_cmp_n := (v_plano_j -> 'severar_fks_set_null'    ->> 'ai_call_logs_comparativo')::int;

    SELECT l.user_prompt_template INTO v_upt_d
      FROM public.ai_call_logs l WHERE l.id = v_aicallid;
    SELECT l.user_prompt_template, l.raw_response, l.parsed_reasoning
      INTO v_cmp_upt_d, v_cmp_raw_d, v_cmp_rea_d
      FROM public.ai_call_logs l WHERE l.id = v_cmp_cita;
    SELECT l.user_prompt_template, l.raw_response, l.parsed_reasoning
      INTO v_nao_upt_d, v_nao_raw_d, v_nao_rea_d
      FROM public.ai_call_logs l WHERE l.id = v_cmp_nao;

    SELECT d.revisao_resultado INTO v_rev_d
      FROM public.decisao_final d WHERE d.candidatura_id = v_candtr;

    -- ⚠ A METADE QUE IMPORTA: copias IDENTIFICAVEIS sobreviventes no arquivo —
    --   contra os DOIS valores de ANTES (o da linha corrente e o da versao arquivada),
    --   porque o snapshot disparado DURANTE o passo copia o da CORRENTE para uma versao
    --   NOVA. Mesma forma da `v_justh_ident` logo acima, que e a (B7): o arquivo e onde
    --   a copia sobrevive.
    SELECT count(*) INTO v_revh_ident
      FROM public.decisao_final_historico h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
     WHERE c.candidato_id = v_cand
       AND (h.revisao_resultado = v_revh_a OR h.revisao_resultado = v_rev_a);

    SELECT count(*) INTO v_revh_tot
      FROM public.decisao_final_historico h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
     WHERE c.candidato_id = v_cand AND h.revisao_resultado IS NOT NULL;

    -- ── 49-20 · ESTADO DEPOIS das treze origens + o que o motor DECLAROU ──────
    SELECT count(*) INTO v_d62_rav_d FROM public.respostas_raven      WHERE candidatura_id = v_candtr;
    SELECT count(*) INTO v_d62_big_d FROM public.respostas_bigfive    WHERE candidatura_id = v_candtr;
    SELECT count(*) INTO v_d62_dsc_d FROM public.respostas_disc       WHERE candidatura_id = v_candtr;
    SELECT count(*) INTO v_d62_frm_d FROM public.respostas_formulario WHERE candidatura_id = v_candtr;

    -- ⊕ e os SCORES, que FICAM — a metade que impede o excesso
    SELECT count(*) INTO v_scr_raven_d FROM public.scores_raven     WHERE candidatura_id = v_candtr;
    SELECT count(*) INTO v_scr_cand_d  FROM public.scores_candidato WHERE candidatura_id = v_candtr;

    SELECT r.texto, r.analise_ia INTO v_red_txt_d, v_red_ana_d
      FROM public.redacoes_candidato r WHERE r.id = v_red_id;
    SELECT p.texto_em_progresso INTO v_redp_d
      FROM public.redacoes_candidato_em_progresso p WHERE p.id = v_redp_id;
    SELECT u.resposta_texto INTO v_rcult_d
      FROM public.respostas_cultura u WHERE u.id = v_rcult_id;
    SELECT a.respostas INTO v_raval_d
      FROM public.respostas_avaliacao a WHERE a.id = v_raval_id;
    SELECT g.raw_responses, g.proctoring INTO v_cog_raw_d, v_cog_prc_d
      FROM public.cognitivo_respostas g WHERE g.id = v_cog_id;
    SELECT e.transcricao, e.feedback_candidato, e.resumo_ia, e.link_videochamada
      INTO v_eon_tra_d, v_eon_fbk_d, v_eon_res_d, v_eon_lnk_d
      FROM public.entrevistas_online e WHERE e.id = v_eon_id;
    SELECT f.documentos_apresentados INTO v_epr_doc_d
      FROM public.entrevistas_presenciais f WHERE f.id = v_epr_id;
    SELECT n.citacoes INTO v_ean_cit_d
      FROM public.entrevista_analises n WHERE n.id = v_ean_id;
    SELECT s.citacoes, s.metadata INTO v_sc_cit_d, v_sc_meta_d
      FROM public.scores_candidato s WHERE s.id = v_sc_sjt;

    -- (B19) as DUAS metades: a citacao saiu E o resto da analise ficou
    SELECT count(*) FILTER (WHERE jsonb_exists(z, 'cited_evidence')),
           count(*),
           count(*) FILTER (WHERE jsonb_exists(z, 'reasoning'))
      INTO v_red_cit_d, v_red_ds_d, v_red_rea_d
      FROM jsonb_array_elements(coalesce(v_red_ana_d -> 'dimension_scores', '[]'::jsonb)) z;

    SELECT count(*) FILTER (WHERE jsonb_exists(z, 'cited_evidence')), count(*)
      INTO v_sc_cit_n_d, v_sc_ds_d
      FROM jsonb_array_elements(coalesce(v_sc_meta_d -> 'dimension_scores', '[]'::jsonb)) z;

    -- (B23) 49-21 / D-69 · o pos-estado da chave, a testemunha e o controle
    v_sc_resp_d := jsonb_exists(v_sc_meta_d, 'respostas');
    v_sc_mot_d  := coalesce(v_sc_meta_d #>> '{motivos_revisao,0}', '<ausente>');
    SELECT count(*) INTO v_sc_out_d
      FROM public.scores_candidato s
     WHERE jsonb_exists(s.metadata, 'respostas')
       AND s.candidatura_id NOT IN (SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = v_cand);

    v_pl_rp := v_plano_j -> 'apagar_respostas_e_producoes';
    v_ps_rp := v_passos  -> 'apagar_respostas_e_producoes';

    -- ⚠⚠ (B21/B22) A JANELA `app.motor_exclusao`, MEDIDA NOS DOIS SENTIDOS, e as
    --    claims AINDA sao de `administrador` neste ponto (elas so sao zeradas
    --    depois, junto com o rollback). Esta e a metade da Correcao 18 que so
    --    existe por EXECUCAO: o motor acabou de rasgar `texto`/`analise_ia` de
    --    `redacoes_candidato` sob um papel que `trg_redacao_rh_only_review_fields`
    --    RECUSA.
    v_guc_depois := coalesce(current_setting('app.motor_exclusao', true), '<ausente>');

    -- ⊖ CONTROLE: o MESMO UPDATE, as MESMAS claims, SEM a janela. Ele TEM de ser
    --   recusado. Sem esta metade, "a sancao funciona" e indistinguivel de "o
    --   trigger foi esvaziado" — e a segunda deixaria a tela do RH reescrevendo a
    --   redacao do candidato para sempre. O bloco aninhado captura a excecao
    --   ESPERADA e reverte so ate o savepoint implicito dele: a fixture fica.
    BEGIN
      UPDATE public.redacoes_candidato r
         SET texto = 'SMOKE P45 controle: escrita de RH que o trigger TEM de recusar.'
       WHERE r.id = v_red_id;
      v_ctrl_st := '<NAO RECUSOU>';
    EXCEPTION
      WHEN others THEN
        v_ctrl_st := SQLSTATE;
    END;

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
  IF v_email_uniq <> 1 THEN
    RAISE EXCEPTION 'P45M FAIL (B3/email): a sentinela de e-mail nao e unica por linha (% ocorrencias, MEDIDAS DENTRO da subtransacao). A coluna e NOT NULL + UNIQUE + CHECK de formato (D5): uma sentinela FIXA colide na SEGUNDA exclusao e aborta a transacao inteira de quem pediu depois', v_email_uniq;
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

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (B12)..(B16) — 49-14 · O QUE O TITULAR MANDOU A IA, OS COMPARATIVOS QUE O
  --                CITAM, E A RESPOSTA DO REVISOR (D-61, D-63, D-60)
  -- ═══════════════════════════════════════════════════════════════════════════

  -- (B12) D-61 · O INPUT SAI — e a fixture nao era vacua (o valor de ANTES tinha nome)
  IF v_upt_a IS NULL OR position('SMOKE P45 Titular Sintetico' IN v_upt_a) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B12): a fixture de ai_call_logs.user_prompt_template nao carregava conteudo identificavel ANTES do tombstone (valor=%). Sem isso, "o valor mudou" nao prova nada sobre o input que a pessoa mandou — a assercao passaria comparando dois textos genericos. Ausencia de fixture util e FALHA DE TESTE', coalesce(left(v_upt_a, 60), '<nulo>');
  END IF;
  IF v_upt_d IS NULL OR v_upt_d = v_upt_a OR position('SMOKE P45 Titular Sintetico' IN v_upt_d) > 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B12): ai_call_logs.user_prompt_template do titular SOBREVIVEU ao tombstone (depois=%). E o INPUT que foi ao modelo: o texto que a PESSOA escreveu, mais a fala literal transcrita nas chamadas de entrevista. A SAIDA (raw_response, parsed_reasoning) ja era tratada desde o 45-07 — severar o ponteiro deixando a ENTRADA de pe e pseudonimizacao apresentada como anonimizacao, que e exatamente o que o Art. 12 §1o nao aceita. ⚠ E o lugar do conserto e o MESMO UPDATE que faz candidato_id := NULL: e o candidato_id que ACHA a linha, e um UPDATE depois dele nao acha nada. D-61', coalesce(left(v_upt_d, 80), '<nulo>');
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B12): o input que o titular mandou a IA saiu — user_prompt_template redigido e sem o nome';

  -- (B13) D-63 · A LINHA DE COMPARATIVO QUE CITA O TITULAR E REDIGIDA INTEIRA
  IF v_cmp_upt_a IS NULL OR position('id=' || v_candtr::text IN v_cmp_upt_a) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B13): a fixture do comparativo nao citava a candidatura do titular ANTES do tombstone. O unico fio entre a linha comparative_ranking e o titular e o `id=<candidatura_id>` dentro do prompt (comparativo-candidatos/index.ts:382) — sem ele a assercao mediria uma linha que nada tem a ver com o caso. Ausencia de fixture util e FALHA DE TESTE';
  END IF;
  IF v_cmp_upt_d = v_cmp_upt_a OR position('id=' || v_candtr::text IN coalesce(v_cmp_upt_d, '')) > 0
     OR position('SMOKE P45 Titular Sintetico' IN coalesce(v_cmp_upt_d, '')) > 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B13/user_prompt_template): a linha comparative_ranking que CITA o titular sobreviveu (depois=%). Ela nasce com candidato_id NULL POR DESENHO — a chamada e sobre varias pessoas — e ai_call_logs nao tem candidatura_id, entao o passo (1/5) NUNCA a alcanca. O predicado tem de ser position(''id='' || <candidatura do titular>) sobre o proprio prompt. D-63', coalesce(left(v_cmp_upt_d, 80), '<nulo>');
  END IF;
  IF v_cmp_raw_d IS NULL OR (v_cmp_raw_d ->> 'redigido') IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B13/raw_response): a saida da chamada de comparativo que cita o titular nao foi redigida (valor=%). Ela repete o ranking com o nome dentro. E a sentinela tem de ser PROPRIA (anonimizacao_p49_comparativo): sem discriminador, uma auditoria nao distingue a linha de comparativo da linha de candidato', coalesce(v_cmp_raw_d::text, '<nulo>');
  END IF;
  IF v_cmp_rea_d IS NULL OR position('SMOKE P45' IN v_cmp_rea_d) > 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B13/parsed_reasoning): o raciocinio da chamada de comparativo que cita o titular sobreviveu (valor=%). Ele e saida DERIVADA de raw_response — redigir uma e deixar a outra e redigir metade', coalesce(left(v_cmp_rea_d, 80), '<nulo>');
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B13): a linha de comparativo que citava o titular foi redigida nas TRES colunas de conteudo';

  -- (B14) ⊖ NEGATIVA · A LINHA DE COMPARATIVO QUE **NAO** CITA FICA INTOCADA
  -- ⚠⚠ ESTA E A METADE QUE IMPEDE O FALSO VERDE MAIS CARO DO PASSO. Sem ela, "a
  --    redacao funcionou" seria indistinguivel de "o passo redigiu TODA linha de
  --    comparativo do banco" — e a segunda destroi o historico de IA de pessoas que
  --    nada tem a ver com este titular, passando pela (B13) sem um aviso.
  IF v_nao_upt_d IS DISTINCT FROM v_nao_upt_a THEN
    RAISE EXCEPTION 'P45M FAIL (B14): o tombstone redigiu uma linha comparative_ranking que NAO cita o titular (antes=%, depois=%). O escopo vazou: o predicado deixou de exigir a candidatura DESTE titular dentro do prompt e passou a alcancar toda chamada de comparativo. Isso apaga o historico de IA de terceiros numa exclusao que nao e deles — e o dano e irreversivel. D-63', coalesce(left(v_nao_upt_a, 50), '<nulo>'), coalesce(left(v_nao_upt_d, 50), '<nulo>');
  END IF;
  IF v_nao_raw_d IS DISTINCT FROM v_nao_raw_a OR v_nao_rea_d IS DISTINCT FROM v_nao_rea_a THEN
    RAISE EXCEPTION 'P45M FAIL (B14): o tombstone mexeu em raw_response/parsed_reasoning de uma linha de comparativo alheia ao titular. Mesmo escopo vazado da metade acima, nas outras duas colunas';
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B14): a linha de comparativo que NAO cita o titular ficou INTOCADA nas tres colunas';

  -- (B15) D-60 · A RESPOSTA DO REVISOR SAI DA CORRENTE **E** DE TODAS AS VERSOES
  IF v_rev_a IS NULL OR v_revh_a IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B15): a fixture nao tinha revisao_resultado preenchido na linha corrente (%) e/ou numa versao do arquivo (%). Sem as DUAS, a metade "todas as versoes" seria satisfeita por vacuidade — e um scrub que alcancasse somente a versao criada pelo snapshot passaria deixando as ANTIGAS identificaveis', coalesce(left(v_rev_a, 30), '<nulo>'), coalesce(left(v_revh_a, 30), '<nulo>');
  END IF;
  IF v_rev_d IS NULL OR v_rev_d = v_rev_a OR position('SMOKE P45' IN v_rev_d) > 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B15/corrente): decisao_final.revisao_resultado sobreviveu ao tombstone (depois=%). E o texto que o revisor ESCREVEU ao responder o pedido de revisao do Art. 20 — e ele tem de sair no MESMO UPDATE da justificativa: um segundo UPDATE dispararia o snapshot de novo e arquivaria uma versao a mais. ⚠ NULL nao serve: o CHECK decisao_final_revisao_justificativa_min_check exige >= 50 caracteres uteis quando ha veredito, e nulificar abortaria a transacao com 23514 DEPOIS de o curriculo ja ter sido apagado do Storage. D-60', coalesce(left(v_rev_d, 80), '<nulo>');
  END IF;
  IF v_revh_ident <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B15/arquivo): % versao(oes) de decisao_final_historico do titular ainda carregam a resposta do revisor IDENTIFICAVEL. E a armadilha M1 da justificativa repetida na coluna que nasceu depois dela: trg_decisao_final_snapshot e AFTER UPDATE e copia OLD.revisao_resultado para uma versao NOVA, entao o scrub do arquivo tem de ser o ULTIMO statement a tocar o par — DEPOIS do UPDATE em decisao_final. Faze-lo antes deixa uma versao recem-criada e identificavel atras dele. D-60', v_revh_ident;
  END IF;
  IF v_revh_tot = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B15/arquivo): ZERO versoes do arquivo do titular tem revisao_resultado nao nulo. A assercao acima passou por VACUIDADE — ou o scrub nulificou a coluna (e o CHECK da corrente diz que o valor certo e sentinela, nao NULL), ou o arquivo perdeu linhas, o que o ERASE-08 proibe';
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B15): a resposta do revisor saiu da linha corrente e de TODAS as % versao(oes) do arquivo — zero copia identificavel', v_revh_tot;

  -- (B16) O DRY-RUN PREVE O QUE O MOTOR EXECUTOU, PELA MESMA EXPRESSAO
  -- ⚠ Tres fontes independentes na MESMA transacao: (1) as contagens medidas A MAO
  --   antes do tombstone, (2) o `'plano'` que o motor leu no PASSO 0, (3) o `'passos'`
  --   que ele declarou ter executado. Duas bastariam para uma igualdade; a terceira e
  --   o que distingue "o plano e o motor concordam" de "os dois copiaram o mesmo erro".
  IF v_pl_rev_c IS NULL OR v_pl_rev_a IS NULL OR v_pl_cmp_n IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B16): o dry-run NAO expoe as tres contagens novas (corrente=%, arquivo=%, comparativo=%). O plano conta menos do que o motor apaga, e o recibo derivado dele promete um tamanho diferente do que a exclusao entrega — P39/CR-02, uma guarda que era dead code', coalesce(v_pl_rev_c::text, '<ausente>'), coalesce(v_pl_rev_a::text, '<ausente>'), coalesce(v_pl_cmp_n::text, '<ausente>');
  END IF;
  IF v_pl_rev_c <> v_ex_rev_c OR v_pl_rev_a <> v_ex_rev_a OR v_pl_cmp_n <> v_ex_cmp_n THEN
    RAISE EXCEPTION 'P45M FAIL (B16): o dry-run DIVERGE da expressao medida a mao (corrente %/%, arquivo %/%, comparativo %/%). Nao e o numero que importa e sim a EXPRESSAO: se as duas divergem, existem DUAS definicoes de "o que sai" no banco, e a que o recibo mostra nao e a que o motor executa', v_pl_rev_c, v_ex_rev_c, v_pl_rev_a, v_ex_rev_a, v_pl_cmp_n, v_ex_cmp_n;
  END IF;
  IF (v_passos -> 'tombstone_decisao_final' ->> 'revisao_resultado_corrente')::int <> v_pl_rev_c
     OR (v_passos -> 'severar_fks_set_null' ->> 'ai_call_logs_comparativo')::int <> v_pl_cmp_n THEN
    RAISE EXCEPTION 'P45M FAIL (B16): o que o motor DECLAROU ter executado nao bate o que o plano previu (corrente %/%, comparativo %/%)', (v_passos -> 'tombstone_decisao_final' ->> 'revisao_resultado_corrente'), v_pl_rev_c, (v_passos -> 'severar_fks_set_null' ->> 'ai_call_logs_comparativo'), v_pl_cmp_n;
  END IF;
  -- ⚠⚠ E AQUI A IGUALDADE E DELIBERADAMENTE **OUTRA**, e a assimetria e declarada em
  --    vez de escondida: o arquivo CRESCE DURANTE o passo. O UPDATE da linha corrente
  --    dispara o snapshot, que insere uma versao nova carregando o valor ANTIGO — e o
  --    motor conta DEPOIS disso, de proposito (contar antes deixaria a versao
  --    recem-criada fora do numero, e o recibo prometeria menos do que a raspagem
  --    alcanca). A relacao exata e `plano + <linhas correntes com revisao>`, e e ela
  --    que esta asserida. Uma igualdade simples reprovaria o comportamento CORRETO —
  --    a classe de defeito que o CLAUDE.md §"Portoes" cataloga.
  IF (v_passos -> 'tombstone_decisao_final' ->> 'revisao_resultado_arquivo')::int
     <> v_pl_rev_a + v_pl_rev_c THEN
    RAISE EXCEPTION 'P45M FAIL (B16/arquivo): o motor declarou % revisoes raspadas no arquivo e o esperado e % (plano % + % linha(s) corrente(s) que o snapshot acabou de arquivar). O excedente e escrita que ninguem previu; a falta significa que o motor contou ANTES do snapshot e o recibo promete menos do que ele apaga', (v_passos -> 'tombstone_decisao_final' ->> 'revisao_resultado_arquivo'), v_pl_rev_a + v_pl_rev_c, v_pl_rev_a, v_pl_rev_c;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B16): dry-run = expressao a mao = passos do motor (corrente %, arquivo % -> % com o snapshot, comparativo %)',
    v_pl_rev_c, v_pl_rev_a, v_pl_rev_a + v_pl_rev_c, v_pl_cmp_n;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (B17)..(B22) — 49-20 · O PASSO `apagar_respostas_e_producoes` (D-48, D-62)
  -- ═══════════════════════════════════════════════════════════════════════════

  -- (B17) D-62 · AS QUATRO TABELAS DE RESPOSTA PERDEM A LINHA — e os SCORES ficam
  IF v_d62_rav_a < 1 OR v_d62_big_a < 1 OR v_d62_dsc_a < 1 OR v_d62_frm_a < 1 THEN
    RAISE EXCEPTION 'P45M FAIL (B17): a fixture nao tinha resposta nas quatro tabelas do D-62 ANTES do tombstone (raven=%, bigfive=%, disc=%, formulario=%). Sem linha, "ficou em zero depois" e VERDADE POR VACUIDADE e o apagamento nunca foi exercitado. Ausencia de fixture e FALHA DE TESTE, nunca verde', v_d62_rav_a, v_d62_big_a, v_d62_dsc_a, v_d62_frm_a;
  END IF;
  IF v_d62_rav_d <> 0 OR v_d62_big_d <> 0 OR v_d62_dsc_d <> 0 OR v_d62_frm_d <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B17): as respostas de multipla escolha do titular SOBREVIVERAM ao tombstone (raven=%, bigfive=%, disc=%, formulario=%). O recibo diz «as suas respostas das avaliacoes … foram apagados», e nestas quatro tabelas nao ha sentinela possivel: os CHECKs vivos sao int 1..8, int 1..5, D/I/S/C com os dois diferentes, e ao-menos-uma-resposta-preenchida. E por isso que o operador decidiu apagar a LINHA (D-62) — e e a unica excecao: em toda outra origem a linha fica', v_d62_rav_d, v_d62_big_d, v_d62_dsc_d, v_d62_frm_d;
  END IF;
  -- ⊕ A METADE QUE IMPEDE O EXCESSO. Sem ela, "as respostas sumiram" seria
  --   indistinguivel de "o cognitivo do titular foi destruido inteiro" — e a
  --   segunda destroi a prova de que houve avaliacao, que o ERASE-08 preserva.
  IF v_scr_raven_d <> 1 OR v_scr_cand_d < 1 THEN
    RAISE EXCEPTION 'P45M FAIL (B17/⊕): o passo levou junto o SCORE (scores_raven=%, scores_candidato=%, esperado 1 e >=1). O D-62 e excecao para as RESPOSTAS de multipla escolha, jamais para a prova de que houve avaliacao: os scores calculados a partir delas FICAM (RNF-07a / ERASE-08). Um passo que apaga o score apaga a defesa da propria empresa numa alegacao de discriminacao', v_scr_raven_d, v_scr_cand_d;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B17): as 4 tabelas do D-62 foram de (%,%,%,%) a ZERO, e os scores ficaram (raven=%, candidato=%)',
    v_d62_rav_a, v_d62_big_a, v_d62_dsc_a, v_d62_frm_a, v_scr_raven_d, v_scr_cand_d;

  -- (B18) D-48 · NAS NOVE TABELAS EM QUE A LINHA FICA, A COLUNA ESTA REDIGIDA
  -- ⚠ A nao-vacuidade e medida PRIMEIRO, e coluna a coluna: o valor de ANTES tem de
  --   carregar o nome do titular sintetico. Sem isso, "o valor mudou" compararia
  --   dois textos genericos e passaria sem provar nada sobre conteudo identificavel.
  IF position('SMOKE P45 Titular Sintetico' IN coalesce(v_red_txt_a, '')) = 0
     OR position('SMOKE P45 Titular Sintetico' IN coalesce(v_redp_a, '')) = 0
     OR position('SMOKE P45 Titular Sintetico' IN coalesce(v_rcult_a, '')) = 0
     OR position('SMOKE P45' IN coalesce(v_raval_a::text, '')) = 0
     OR position('SMOKE P45' IN coalesce(v_cog_raw_a::text, '')) = 0
     OR position('SMOKE P45' IN coalesce(v_cog_prc_a::text, '')) = 0
     OR position('SMOKE P45 Titular Sintetico' IN coalesce(v_eon_tra_a, '')) = 0
     OR position('SMOKE P45' IN coalesce(v_eon_fbk_a, '')) = 0
     OR position('SMOKE P45' IN coalesce(v_eon_res_a, '')) = 0
     OR position('SMOKE-P45-Titular-Sintetico' IN coalesce(v_eon_lnk_a, '')) = 0
     OR position('SMOKE P45 Titular Sintetico' IN coalesce(v_epr_doc_a::text, '')) = 0
     OR position('SMOKE P45 Titular Sintetico' IN coalesce(v_ean_cit_a::text, '')) = 0
     OR v_sc_cit_a IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B18): uma das treze origens nao carregava conteudo identificavel ANTES do tombstone. Cada uma delas e uma frase do recibo: sem valor de partida, a assercao de desaparecimento e verdadeira por vacuidade. Ausencia de fixture util e FALHA DE TESTE';
  END IF;

  -- `NOT NULL` ⇒ sentinela; NULAVEL ⇒ NULL. A escolha por coluna veio do catalogo.
  IF v_red_txt_d IS NULL OR v_red_txt_d = v_red_txt_a
     OR position('SMOKE P45 Titular Sintetico' IN v_red_txt_d) > 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B18/redacoes_candidato.texto): o texto que a pessoa escreveu SOBREVIVEU ao tombstone (depois=%). E `text NOT NULL`: o valor certo e sentinela, nunca NULL. ⚠ Se o erro for 42501/P0001 em vez desta mensagem, o que faltou foi a janela app.motor_exclusao — trg_redacao_rh_only_review_fields recusa esta escrita para rh/administrador (ver B21/B22)', coalesce(left(v_red_txt_d, 80), '<nulo>');
  END IF;
  IF v_redp_d IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B18/redacoes_candidato_em_progresso): o rascunho do titular sobreviveu (depois=%). A coluna e NULAVEL: o valor certo e NULL, e nao sentinela — carimbar sentinela onde nao havia rascunho INVENTARIA um rascunho que nunca existiu', left(v_redp_d, 60);
  END IF;
  IF v_rcult_d IS NULL OR v_rcult_d = v_rcult_a
     OR position('SMOKE P45 Titular Sintetico' IN v_rcult_d) > 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B18/respostas_cultura.resposta_texto): a resposta de cultura escrita pelo titular sobreviveu (depois=%)', coalesce(left(v_rcult_d, 60), '<nulo>');
  END IF;
  IF v_raval_d IS NULL OR (v_raval_d ->> 'redigido') IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B18/respostas_avaliacao.respostas): as respostas da avaliacao nao foram redigidas (depois=%). A coluna e `jsonb NOT NULL`: o valor certo e a sentinela jsonb', coalesce(v_raval_d::text, '<nulo>');
  END IF;
  IF v_cog_raw_d IS NULL OR (v_cog_raw_d ->> 'redigido') IS NULL
     OR v_cog_prc_d IS NULL OR (v_cog_prc_d ->> 'redigido') IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B18/cognitivo_respostas): raw_responses e/ou proctoring sobreviveram (raw=%, proctoring=%). As duas sao `jsonb NOT NULL`. ⚠ `proctoring` entra junto de proposito: e observacao sobre a PESSOA durante a prova — foco de janela, tempo por item — e nao telemetria de custo', coalesce(v_cog_raw_d::text, '<nulo>'), coalesce(v_cog_prc_d::text, '<nulo>');
  END IF;
  IF v_eon_tra_d IS NOT NULL OR v_eon_fbk_d IS NOT NULL OR v_eon_res_d IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B18/entrevistas_online): a transcricao, o feedback ou o resumo sobreviveram (transcricao=%, feedback=%, resumo=%). As tres sao NULAVEIS e recebem NULL. A transcricao e a FALA LITERAL da pessoa — e a origem mais direta do item respostas_e_producoes', coalesce(left(v_eon_tra_d, 40), '<nulo>'), coalesce(left(v_eon_fbk_d, 40), '<nulo>'), coalesce(left(v_eon_res_d, 40), '<nulo>');
  END IF;
  IF v_eon_lnk_d IS NULL OR v_eon_lnk_d = v_eon_lnk_a
     OR position('SMOKE-P45-Titular-Sintetico' IN v_eon_lnk_d) > 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B18/entrevistas_online.link_videochamada): o link sobreviveu (depois=%). Ele e `text NOT NULL` e recebe sentinela — e nao e cerimonia: um link de sala NOMEADA resolve de volta a quem foi entrevistado, e e por isso que o recibo o lista como origem', coalesce(left(v_eon_lnk_d, 80), '<nulo>');
  END IF;
  IF v_epr_doc_d IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B18/entrevistas_presenciais.documentos_apresentados): os documentos apresentados pelo titular sobreviveram (depois=%)', left(v_epr_doc_d::text, 80);
  END IF;
  IF v_ean_cit_d IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B18/entrevista_analises.citacoes): a fala LITERAL transcrita sobreviveu dentro da analise da entrevista (depois=%). A coluna e NULAVEL e recebe NULL; `competencias` FICA, porque ela tem so {competency, score} e e a prova de que houve avaliacao', left(v_ean_cit_d::text, 80);
  END IF;
  IF v_sc_cit_d IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B18/scores_candidato.citacoes): as citacoes do score sobreviveram (depois=%)', left(v_sc_cit_d::text, 80);
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B18): as nove tabelas em que a linha fica estao redigidas coluna a coluna — sentinela nas NOT NULL, NULL nas nulaveis';

  -- (B19) D-48 · O TRECHO LITERAL SAI, E O RESTO DA ANALISE FICA
  -- ⚠⚠ AS DUAS METADES, E A SEGUNDA E A QUE IMPEDE O CONSERTO EXCESSIVO. Redigir a
  --    coluna `analise_ia` inteira tambem faria `cited_evidence` desaparecer — e
  --    levaria junto score, level, dimension e reasoning, que sao a prova de que
  --    houve avaliacao revisavel (Art. 7o VI / RNF-07a). Sem a metade positiva, o
  --    excesso passaria por conserto.
  IF position('cited_evidence' IN coalesce(v_red_ana_a::text, '')) = 0
     OR position('cited_evidence' IN coalesce(v_sc_meta_a::text, '')) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B19): a fixture nao tinha cited_evidence ANTES, num dos dois lugares (redacao=%, sjt=%). Sem citacao de partida, "a citacao saiu" e verdade por vacuidade', (v_red_ana_a IS NOT NULL), (v_sc_meta_a IS NOT NULL);
  END IF;
  IF v_red_cit_d <> 0 OR v_sc_cit_n_d <> 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B19): o trecho LITERAL do que a pessoa escreveu sobreviveu a exclusao (% elemento(s) em redacoes_candidato.analise_ia, % na metadata da SJT). O recibo diz que o texto foi apagado, e o trecho citado E o texto — com localizacao («Paragrafo 3»), o que o torna ainda mais reconstituivel. D-48', v_red_cit_d, v_sc_cit_n_d;
  END IF;
  IF v_red_ds_d <> 2 OR v_red_rea_d <> 2 OR v_sc_ds_d <> 1
     OR (v_sc_meta_d ->> 'composite_0_25') IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B19/⊕): a remocao da citacao levou a ANALISE junto (dimension_scores da redacao=% de 2, com reasoning=% de 2, da SJT=% de 1, composite_0_25=%). O que sai e o trecho citado; score, level, dimension e reasoning FICAM — eles sao a prova de que houve avaliacao humana revisavel, que o ERASE-08 preserva. Uma sentinela na coluna inteira passaria pela metade negativa desta assercao e destruiria a defesa da empresa', v_red_ds_d, v_red_rea_d, v_sc_ds_d, coalesce(v_sc_meta_d ->> 'composite_0_25', '<ausente>');
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B19): cited_evidence saiu dos dois lugares e a analise ficou inteira (% dimensoes na redacao, % na SJT)', v_red_ds_d, v_sc_ds_d;

  -- (B20) O DRY-RUN PREVE AS CATORZE CONTAGENS, PELA MESMA EXPRESSAO
  -- ⚠ Tres fontes independentes na MESMA transacao: (1) a expressao medida A MAO
  --   antes do tombstone, (2) o `'plano'` que o motor leu no PASSO 0, (3) o
  --   `'passos'` que ele declarou. Duas bastariam para uma igualdade; a terceira e
  --   o que distingue "o plano e o motor concordam" de "os dois copiaram o mesmo
  --   erro". ⚠ Para as quatro do D-62 o numero previsto e o de linhas que VAO
  --   DEIXAR DE EXISTIR, e o dry-run e o UNICO lugar onde ele pode ser lido antes.
  IF v_pl_rp IS NULL OR v_ps_rp IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B20): o passo apagar_respostas_e_producoes nao aparece no plano (%) e/ou nos passos declarados (%). Um passo destrutivo que nao diz quanto destruiu nao e auditavel — e este e o primeiro passo deste motor que apaga LINHA', coalesce(v_pl_rp::text, '<ausente>'), coalesce(v_ps_rp::text, '<ausente>');
  END IF;
  FOREACH v_rp_k IN ARRAY v_rp_chaves LOOP
    IF (v_pl_rp ->> v_rp_k) IS NULL OR (v_ps_rp ->> v_rp_k) IS NULL
       OR (v_pl_rp ->> v_rp_k)::int <> (v_ex_rp ->> v_rp_k)::int
       OR (v_ps_rp ->> v_rp_k)::int <> (v_ex_rp ->> v_rp_k)::int THEN
      v_rp_div := v_rp_div || format('%s(plano=%s mao=%s passos=%s) ', v_rp_k,
                                     coalesce(v_pl_rp ->> v_rp_k, '<ausente>'),
                                     coalesce(v_ex_rp ->> v_rp_k, '<ausente>'),
                                     coalesce(v_ps_rp ->> v_rp_k, '<ausente>'));
    END IF;
  END LOOP;
  IF v_rp_div <> '' THEN
    RAISE EXCEPTION 'P45M FAIL (B20): o dry-run, a expressao medida a mao e o que o motor declarou DIVERGEM em: %. Nao e o numero que importa e sim a EXPRESSAO: se as tres nao coincidem, existem DUAS definicoes de "o que sai" no banco, e a que o recibo mostra nao e a que o motor executa (P39/CR-02). Com um passo que APAGA LINHA, um dry-run que conta a menos e um ensaio que nao ensaia o que vai acontecer', v_rp_div;
  END IF;
  IF (v_ps_rp ->> 'linhas_apagadas_d62')::int
     <> (v_ex_rp ->> 'respostas_raven')::int + (v_ex_rp ->> 'respostas_bigfive')::int
      + (v_ex_rp ->> 'respostas_disc')::int + (v_ex_rp ->> 'respostas_formulario')::int THEN
    RAISE EXCEPTION 'P45M FAIL (B20/D-62): o total de linhas apagadas declarado (%) nao bate a soma das quatro tabelas do D-62. E o numero que o recibo do titular vai citar como apagamento irreversivel: ele nao pode ser um agregado que ninguem conferiu', (v_ps_rp ->> 'linhas_apagadas_d62');
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B20): as 14 contagens batem nas TRES fontes; linhas apagadas pelo D-62 = %', (v_ps_rp ->> 'linhas_apagadas_d62');

  -- (B21) Correcao 18 · A EXECUCAO NAO DEPENDE DO PAPEL DE QUEM EXECUTA
  -- ⚠ O bloco (B) inteiro roda sob claims de `administrador` (ver a impersonacao
  --   junto ao caminho feliz). `trg_redacao_rh_only_review_fields` RECUSA mudanca de
  --   `texto` e de `analise_ia` para `rh`/`administrador`: se as duas mudaram, a
  --   janela `app.motor_exclusao` funcionou. Sem ela, um pedido executado por
  --   administrador abortaria DEPOIS de o curriculo ja ter sido apagado do
  --   Storage, sem PITR e sem backup de Storage (Pitfall 6).
  IF v_red_txt_d IS NOT DISTINCT FROM v_red_txt_a
     OR v_red_ana_d IS NOT DISTINCT FROM v_red_ana_a THEN
    RAISE EXCEPTION 'P45M FAIL (B21): sob claims de ADMINISTRADOR o motor NAO alterou texto e/ou analise_ia de redacoes_candidato (texto mudou=%, analise mudou=%). Ou o passo nao roda, ou ele foi recusado por trg_redacao_rh_only_review_fields — e a segunda hipotese e a cara: a Edge Function do direito do titular chama o motor COM O JWT DE QUEM PEDIU. A saida e a janela app.motor_exclusao em volta do UPDATE, nunca depender do papel', (v_red_txt_d IS DISTINCT FROM v_red_txt_a), (v_red_ana_d IS DISTINCT FROM v_red_ana_a);
  END IF;
  IF v_guc_depois = 'on' THEN
    RAISE EXCEPTION 'P45M FAIL (B21): a janela app.motor_exclusao continua LIGADA depois do passo (valor=%). set_config(..., true) e SET LOCAL e morre com a transacao — mas "morre no fim da transacao" nao e "nao vale para o proximo statement": o tombstone das FKs roda DEPOIS deste passo, e uma janela aberta transforma uma sancao pontual em portao desligado pelo resto do pedido', v_guc_depois;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B21): sob claims de administrador o passo rasgou texto e analise_ia, e a janela ficou em [%] depois', v_guc_depois;

  -- (B22) ⊖ CONTROLE · SEM A JANELA, O TRIGGER AINDA MORDE
  -- ⚠⚠ ESTA E A METADE QUE DISTINGUE "SANCIONADO" DE "ESVAZIADO". Desligar o
  --    trigger faria a (B21) passar exatamente igual — e deixaria a tela do RH
  --    reescrevendo a redacao do candidato para sempre. O controle repete o MESMO
  --    UPDATE, sob as MESMAS claims, FORA da janela: ele tem de ser recusado.
  IF v_ctrl_st <> 'P0001' THEN
    RAISE EXCEPTION 'P45M FAIL (B22): fora da janela app.motor_exclusao, um UPDATE de redacoes_candidato.texto sob claims de ADMINISTRADOR devolveu [%] em vez de P0001 (a recusa de trg_redacao_rh_only_review_fields). Se foi "<NAO RECUSOU>", o trigger foi ESVAZIADO em vez de sancionado: a regra que impede o RH de reescrever a redacao do candidato deixou de existir, e a (B21) continuaria verde sobre isso. A sancao e UMA JANELA em volta de UM statement do motor, jamais a remocao do portao', v_ctrl_st;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B22): fora da janela, o trigger recusou a mesma escrita com [%] — sancionado, nao esvaziado', v_ctrl_st;

  -- (B23) 49-21 / D-69 · AS ESCOLHAS DA SJT SAEM, E A LINHA (COM O SCORE) FICA
  -- ⚠⚠ QUATRO METADES, e cada uma existe contra um conserto errado diferente:
  --    (⊖ vacuidade) a chave existia ANTES — sem isso "nao existe depois" e verdade
  --      por vacuidade e o statement novo nunca foi exercitado;
  --    (positiva) a chave `respostas` — as alternativas que a pessoa marcou — nao
  --      existe depois. O item `respostas_e_producoes` do recibo promete ao titular
  --      que as respostas das avaliacoes foram apagadas, e a Correcao 14 RECUSOU a
  --      formulacao que ressalvava as de multipla escolha: o desalinhamento era entre
  --      o motor e uma decisao anterior do operador (D-69);
  --    (⊕ preservacao) `motivos_revisao` e `composite_0_25` FICAM. Sao a testemunha
  --      de que a remocao foi CIRURGICA: uma sentinela na coluna inteira passaria
  --      pela metade positiva e destruiria a prova de que houve avaliacao;
  --    (⊖ escopo) as linhas de OUTRAS candidaturas guardam as suas escolhas. Um
  --      statement sem o filtro por `candidatura_id` apagaria as escolhas de quem
  --      NAO pediu exclusao, e nenhuma assercao sobre a fixture veria isso.
  IF NOT v_sc_resp_a THEN
    RAISE EXCEPTION 'P45M FAIL (B23): a fixture nao tinha a chave respostas na metadata da SJT ANTES do tombstone. Sem as escolhas de partida, "a chave saiu" e VERDADE POR VACUIDADE e o statement do D-69 nunca foi exercitado. Ausencia de fixture e FALHA DE TESTE, nunca verde';
  END IF;
  IF v_sc_out_a = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (B23/⊖escopo): nenhuma linha de OUTRA candidatura carregava a chave respostas ANTES. Sem populacao alheia, "o escopo nao vazou" nao e informacao — e o 49-20 mediu 4 de 5 linhas sjt com ela em PROD, entao um zero aqui e sinal de que a consulta do controle esta errada, nao de que o banco esta limpo';
  END IF;
  IF v_sc_resp_d THEN
    RAISE EXCEPTION 'P45M FAIL (B23): as ESCOLHAS da SJT do titular SOBREVIVERAM ao tombstone — a chave respostas continua na metadata (%). O recibo diz ao titular «as suas respostas das avaliacoes … foram apagados», e a Correcao 14 desta fase REJEITOU ressalvar as alternativas marcadas. D-69', left(coalesce(v_sc_meta_d -> 'respostas', 'null'::jsonb)::text, 120);
  END IF;
  IF v_sc_mot_d <> 'dimensao_desconhecida' OR (v_sc_meta_d ->> 'composite_0_25') IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (B23/⊕): a remocao das escolhas levou a METADATA junto (motivos_revisao=%, composite_0_25=%). O que sai e a chave respostas; o score composto, as notas por dimensao e o motivo da revisao humana FICAM — sao a prova de que houve avaliacao revisavel, que o ERASE-08 e a RNF-07a preservam. Uma sentinela na coluna inteira passaria pela metade positiva desta assercao', v_sc_mot_d, coalesce(v_sc_meta_d ->> 'composite_0_25', '<ausente>');
  END IF;
  IF v_sc_out_d <> v_sc_out_a THEN
    RAISE EXCEPTION 'P45M FAIL (B23/⊖escopo): o passo levou as escolhas da SJT de OUTRAS candidaturas (antes=%, depois=%). O statement tem de ser escopado por candidatura_id ao titular que pediu: apagar a resposta de quem nao pediu nada e uma exclusao sem pedido, e ela nao tem volta', v_sc_out_a, v_sc_out_d;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (B23): a chave respostas saiu da metadata do titular, o resto da metadata ficou (motivos_revisao=%, composite=%), e as % linha(s) de outras candidaturas continuam com as suas escolhas', v_sc_mot_d, (v_sc_meta_d ->> 'composite_0_25'), v_sc_out_d;

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
--       · `gerar_bias_snapshot` TAMBEM concede a `authenticated`, e isto e CORRETO —
--         ver a resolucao do `DI-45-12-01` logo abaixo. A expectativa de ACL de cada
--         funcao e DECLARADA em `v_concede_auth`/`v_nega_auth`, nunca derivada de
--         "e chamada pela Edge Function desta fase?".
--
--      ✅ CONTRADICAO `DI-45-12-01` — **RESOLVIDA em 2026-08-12** pelo code review
--      bloqueante nº 4 (`45-REVIEW-4.md` / CR-02), que e exatamente o portao ao qual o
--      plano 45-12 a enderecou. Registro do que era e de como fechou:
--      a migration `20260805000003` (plano 45-05) faz, DELIBERADAMENTE,
--      `REVOKE ALL ... FROM PUBLIC, anon, authenticated` seguido de
--      `GRANT EXECUTE ... TO authenticated`, e o bloco (6) do cabecalho dela declara
--      a divergencia com a razao: o chamador VIVO e o cliente do navegador do
--      administrador (`biasAuditService.ts:98`), que fala com o Postgres como
--      `authenticated`. A versao anterior desta assercao exigia o OPOSTO, e as duas
--      estavam aplicadas em PROD.
--      **VEREDITO: o ACL esta CERTO; a premissa da assercao estava errada.** Revogar
--      nao endureceria nada — apagaria a tela de auditoria de vies, que e peca
--      PROBATORIA de nao-discriminacao (RNF-07a). Seria o espelho exato do movimento
--      proibido "relaxar a FK para CASCADE diante de um 23503": tratar o sintoma que o
--      portao reporta destruindo a coisa que o portao existe para proteger.
--      ⚠ O plano 45-12 acertou em NAO resolver isto sozinho — escreveu a assercao como
--      especificada e registrou a contradicao. Afrouxar uma assercao por conta propria
--      e o reflexo que esta fase proibe; o que mudou aqui nao foi o rigor, foi a
--      PREMISSA, e ela mudou num portao com veredito datado.
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
  -- `gerar_bias_snapshot` NAO esta aqui: ela nao e chamada por ela. ⚠ Esta lista
  -- escolhe a MENSAGEM de falha; ela NAO e mais a expectativa de ACL — ver
  -- `v_concede_auth` abaixo (45-REVIEW-4 / CR-02).
  v_do_titular text[] := ARRAY['registrar_pedido_exclusao', 'cancelar_pedido_exclusao',
                               'plano_exclusao_titular', 'anonimizar_candidato'];

  -- ⚠ 45-REVIEW-4 / CR-02 (2026-08-12) — CLASSIFICACAO EXPLICITA DE ACL, fechando o
  --   `DI-45-12-01`. A expectativa deixou de ser DERIVADA de "e chamada pela Edge
  --   Function desta fase?" e passou a ser DECLARADA por funcao, porque as duas coisas
  --   nunca foram a mesma: `gerar_bias_snapshot` tem chamador vivo PROPRIO — a tela de
  --   auditoria de vies do ADMINISTRADOR (`biasAuditService.ts:98`), que fala com o
  --   Postgres como `authenticated`. A `20260805000003:500` concede DELIBERADAMENTE, e
  --   esta APLICADA em PROD.
  --   ⚠ REVOGAR NAO ENDURECE NADA — APAGA A TELA, que e peca PROBATORIA de
  --   nao-discriminacao (RNF-07a), da mesma familia de `decisao_final` e
  --   `historico_candidatura`, cuja sobrevivencia esta fase protege com tres FKs
  --   `NO ACTION`. Destruir a evidencia para satisfazer um portao de ACL e o espelho
  --   exato do movimento proibido "relaxar a FK para CASCADE diante de um 23503".
  --   O controle de `gerar_bias_snapshot` e o guard do CORPO, nao o ACL.
  --   O que continua PROIBIDO e INALTERADO para as cinco: `anon` e PUBLIC — a metade
  --   que morde de verdade, logo abaixo em (i).
  v_concede_auth text[] := ARRAY['registrar_pedido_exclusao', 'cancelar_pedido_exclusao',
                                 'plano_exclusao_titular', 'anonimizar_candidato',
                                 'gerar_bias_snapshot'];
  -- Hoje VAZIA, e de proposito: nenhuma das cinco deve NEGAR `authenticated`. Ela existe
  -- para que a checagem de classificacao abaixo continue com DUAS saidas vivas — uma
  -- assercao cujo ramo negativo e inalcancavel e vacua, e vacuidade que conta como verde
  -- e o modo de falha que custou o `42804` da Phase 43.
  v_nega_auth    text[] := ARRAY[]::text[];
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

    -- ⚠ 45-REVIEW-4 / CR-02 — FAIL-CLOSED: toda funcao deste laco tem de estar
    --   classificada em EXATAMENTE uma das duas listas. Sem isto, acrescentar uma sexta
    --   funcao ao `IN (...)` do laco sem decidir seu ACL a faria cair num ramo por
    --   omissao — que e como esta contradicao nasceu.
    IF (r.proname = ANY (v_concede_auth)) = (r.proname = ANY (v_nega_auth)) THEN
      RAISE EXCEPTION 'P45M FAIL (C1): public.%() nao esta classificada em EXATAMENTE uma das listas de expectativa de ACL (v_concede_auth / v_nega_auth). Toda funcao verificada por esta assercao precisa de uma decisao EXPLICITA e datada sobre conceder ou nao EXECUTE a authenticated — derivar a expectativa de "e chamada pela Edge Function?" foi o defeito que produziu o DI-45-12-01, em que a assercao e a migration 20260805000003 afirmavam coisas OPOSTAS e as duas estavam aplicadas', r.proname;
    END IF;

    v_exige_auth := r.proname = ANY (v_concede_auth);

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

    -- (ii) `authenticated`: EXIGIDO em `v_concede_auth`, PROIBIDO em `v_nega_auth`.
    --      A expectativa e DECLARADA por funcao, nao derivada (CR-02).
    SELECT EXISTS (
      SELECT 1
        FROM aclexplode(r.proacl) a
        LEFT JOIN pg_roles g ON g.oid = a.grantee
       WHERE a.privilege_type = 'EXECUTE' AND g.rolname = 'authenticated'
    ) INTO v_auth;

    IF v_exige_auth AND NOT v_auth THEN
      IF r.proname = ANY (v_do_titular) THEN
        RAISE EXCEPTION 'P45M FAIL (C1): public.%() NAO concede EXECUTE a authenticated, e ela e alcancada pelo titular. A Edge Function chama esta RPC por um client com service key E o Authorization do titular, e o PostgREST deriva o PAPEL do MESMO JWT: esse client chega como authenticated. Sem o GRANT da migration 20260805000009 o auth.uid() segue NULO dentro da funcao, ela recusa com 42501, e o motor NAO RODA (DI-45-10-01). Um GRANT esquecido e a falha que ninguem investiga porque PARECE autorizacao funcionando. proacl = %', r.proname, r.proacl::text;
      ELSE
        RAISE EXCEPTION 'P45M FAIL (C1): public.%() NAO concede EXECUTE a authenticated, e ela tem chamador vivo PROPRIO fora da Edge Function desta fase. Para gerar_bias_snapshot esse chamador e a tela de auditoria de vies do ADMINISTRADOR (biasAuditService.ts:98), que fala com o Postgres como authenticated: sem o GRANT da 20260805000003 a tela morre com 42501 — e ela e peca PROBATORIA de nao-discriminacao (RNF-07a). ⚠ Se este vermelho apareceu depois de alguem REVOGAR o privilegio para "consertar" um vermelho anterior da (C1), o conserto foi na direcao errada: ver 45-REVIEW-4 / CR-02. proacl = %', r.proname, r.proacl::text;
      END IF;
    END IF;

    IF NOT v_exige_auth AND v_auth THEN
      RAISE EXCEPTION 'P45M FAIL (C1): public.%() concede EXECUTE a authenticated mas esta declarada em v_nega_auth — afrouxar o ACL de carona e o reflexo que esta fase existe para nao ter. Ou o GRANT entrou sem decisao, ou a classificacao mudou e ninguem moveu a funcao para v_concede_auth. As duas saidas exigem DECISAO datada, nunca um ajuste silencioso da assercao. proacl = %', r.proname, r.proacl::text;
    END IF;
  END LOOP;

  IF v_checadas <> 5 THEN
    RAISE EXCEPTION 'P45M FAIL (C1): encontrei % das 5 funcoes esperadas em public', v_checadas;
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C1): as 5 funcoes sao DEFINER; nenhuma concede EXECUTE a anon ou PUBLIC; as 5 estao classificadas explicitamente e as 5 concedem a authenticated conforme declarado — as 4 do titular pela 20260805000009, e gerar_bias_snapshot pela 20260805000003, por ter chamador vivo proprio (tela de auditoria de vies do administrador). O controle mudou de camada, do ACL para o guard do CORPO, que a C2 prova que morde';
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
-- (C3) GATE DE NAO-DIVERGENCIA DO DRY-RUN, NAS QUATRO METADES (eram DUAS ate o 46-04).
--
--      (i) `md5(prosrc)` das duas funcoes bate os valores PINADOS no cabecalho —
--          prova que o corpo vivo e byte a byte o da migration.
--      (ii) `pg_get_functiondef(anonimizar_candidato)` CONTEM a chamada a
--           `plano_exclusao_titular` — prova que o delete real continua PASSANDO
--           pela expressao unica.
--      (iii) 46-04 · A REDE ESTRUTURAL SOBRE O MOTOR: o corpo vivo LE
--            `purga_execucao_itens`, exige o item AINDA ABERTO, exige
--            `modo_vigente` igual a `live` por extenso na metade destrutiva, e NAO
--            contem negacao por pertencimento a conjunto de valores.
--      (iv) 46-04 / B-02 · A MESMA REDE SOBRE `plano_exclusao_titular`, que o
--            motor CHAMA no PASSO 0: ela LE o ledger de itens, exige o ALVO
--            (`i.candidato_id = p_candidato_id`) e nao so o modo, e nao contem a
--            forma banida. ⚠ Sem o ramo dela, o 4o ramo do motor NAO PRODUZ EFEITO
--            UTIL — o cron passa la e e recusado tres linhas depois. Foi o
--            Blocker B-02, descoberto no 46-04, e (iv) e o que impede que ele
--            volte em silencio numa edicao futura.
--
--      ⚠⚠ POR QUE (iii) EXISTE, E POR QUE ELA NASCEU JUNTO COM UM RE-PIN: o md5
--      responde "o corpo vivo e o do arquivo?"; ele NAO responde "o arquivo tem a
--      forma certa?". Enquanto o pin nunca muda, a diferenca e teorica. No dia do
--      re-pin ela deixa de ser: um md5 recem-carimbado casa com QUALQUER corpo,
--      inclusive um em que o quarto ramo tenha sido apagado ou em que as duas
--      metades tenham passado a compartilhar um predicado. E por isso que a regra
--      de D-46-18 (obrigacao 4) e que **a rede embaixo do md5 so cresce**: um
--      re-pin nunca pode ser desculpa para afrouxar a assercao (Pitfall 2).
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
  -- ⚠ PINADOS por EXECUCAO, com conferencia CRUZADA vivo × arquivo (ver
  --   PROVENIENCIA no cabecalho). `plano_exclusao_titular` em 2026-08-13;
  --   `anonimizar_candidato` RE-PINADO em 2026-08-23 pelo plano 46-04, quando a
  --   migration 20260823000006 acrescentou o quarto ramo do guard. Re-pinar sem
  --   que a migration tenha mudado FAZ (C3/i) DEIXAR DE PROVAR QUALQUER COISA — e
  --   ato consciente e revisavel.
  --   `anonimizar_candidato` e `plano_exclusao_titular` RE-PINADOS em 2026-09-23
  --   pelo plano 49-14 (migration `20260922000012`), com a rede (iii)/(iv)/(v)
  --   CRESCIDA ANTES da troca. Ver PROVENIENCIA no cabecalho.
  --   RE-PINADOS DE NOVO em 2026-09-23 pelo plano 49-20 (migration
  --   `20260922000013`), que instala o passo `apagar_respostas_e_producoes` — o
  --   PRIMEIRO passo deste motor que APAGA LINHA (D-62). A rede (vi) cresceu ANTES
  --   da troca, no MESMO commit, e e ela que vigia o escopo do apagamento.
  v_pin_plano text := '6f2ef83664944b9a39c7d495a49ab8f1';
  v_pin_anon  text := '1d8f96c8f21a755ded0505a0b652113a';
  v_src_plano text;
  v_src_anon  text;
  v_def_anon  text;
  v_md5_plano text;
  v_md5_anon  text;
  -- ── 46-04 · A REDE ESTRUTURAL EMBAIXO DO md5, E ELA SO CRESCE ──────────────
  -- ⚠ UM RE-PIN NUNCA E DESCULPA PARA AFROUXAR A ASSERCAO (Pitfall 2 / D-46-18,
  --   obrigacao 4). O md5 sozinho responde "o corpo vivo e o do arquivo?"; ele NAO
  --   responde "o arquivo tem a forma certa?". Estas checagens respondem a segunda
  --   pergunta, e a diferenca importa exatamente no dia do re-pin: um md5 que casa
  --   com a FORMA ERRADA significa que alguem re-pinou um corpo que nao devia
  --   existir. As tres abaixo entraram no 46-04 e nenhuma pode sair.
  v_tem_itens   boolean;   -- o ramo novo LE o ledger de itens
  v_tem_aberto  boolean;   -- e exige o item AINDA ABERTO
  v_tem_notin   boolean;   -- e NUNCA nega por pertencimento a conjunto de valores
  v_tem_live    boolean;   -- e a metade destrutiva exige o modo live por extenso
  -- ME-04 · a regressao que D-46-24 nomeia, vigiada por FORMA e nao por presenca
  v_tem_2var    boolean;   -- as DUAS variaveis existem
  v_le_live     boolean;   -- e (b)/(c) leem a `live` no caminho destrutivo
  v_le_dry      boolean;   -- e a de leitura le a `dry`
  -- BL-02 · o ramo so vale para chamador SEM sessao
  v_tem_semsess boolean;
  -- HI-03 · a autorizacao EXPIRA
  v_tem_janela  boolean;
  -- RD2-06 · e as TRES janelas TEM de ser o MESMO intervalo, medido pelo VALOR
  -- RD3-01 · e medido no CODIGO, jamais na prosa (ver o bloco (C3/janela))
  v_src_sweep   text;
  r_jan         record;
  v_jan_n       int;
  v_jan_d       int;
  v_jan_val     text;
  v_jans        text[] := ARRAY[]::text[];
  -- ── 46-04 / B-02 · a mesma rede sobre a SEGUNDA funcao ────────────────────
  -- Sem estas, o re-pin de `plano_exclusao_titular` seria um numero novo sem
  -- nenhuma exigencia de forma atras dele — e foi justamente o guard DELA que
  -- quase deixou a fase inteira passar por um caminho que nao funciona.
  -- ── 49-14 · A REDE SOBRE O PASSO NOVO, E ELA NASCEU **ANTES** DO RE-PIN ───
  -- ⚠ Mesma razao de sempre, agora na terceira geracao de pins deste arquivo: o md5
  --   responde "o corpo vivo e o do arquivo?", nao "o arquivo tem a forma certa?".
  --   No dia do re-pin a diferenca deixa de ser teorica — um numero recem-carimbado
  --   casa com um corpo em que o passo novo nunca existiu. Estas oito checagens sao
  --   o que o pin de 2026-09-23 tem atras dele, e nenhuma pode sair.
  v_rev_corr    boolean;   -- o tombstone rasga revisao_resultado na linha CORRENTE
  v_rev_arq     boolean;   -- e no ARQUIVO
  v_rev_ordem   boolean;   -- e na ordem corrente -> arquivo, medida por POSICAO
  v_cmp_tipo    boolean;   -- o passo (0/5) e escopado a call_type comparative_ranking
  v_cmp_pred    boolean;   -- e acha a linha pelo `position('id=' || ...)` do prompt
  v_upt_junto   boolean;   -- user_prompt_template na MESMA lista SET de candidato_id := NULL
  v_pl_rev      boolean;   -- o PLANO conta as duas revisoes
  v_pl_cmp_f    boolean;   -- e as linhas de comparativo, pelo MESMO predicado
  -- ── (C3/vi) 49-20 · A REDE SOBRE O PASSO QUE APAGA LINHA (D-48, D-62) ─────
  v_src_trg     text;      -- prosrc do trigger da redacao, vigiado por FORMA
  v_rp_ini      int;       -- onde o passo novo comeca no corpo vivo
  v_rp_fim      int;       -- e onde `severar_fks_set_null` comeca (o passo termina)
  v_rp_trecho   text;      -- o trecho do passo, recortado entre os dois
  v_rp_alvos    text[];    -- as tabelas em que o motor APAGA linha, extraidas do vivo
  v_rp_fora     text[];    -- as que estao fora do D-62 (tem de ser NENHUMA)
  v_rp_falta    text[];    -- as do D-62 que o motor NAO apaga (tem de ser NENHUMA)
  v_rp_guc1     int;       -- a janela abre
  v_rp_upd      int;       -- o UPDATE da redacao
  v_rp_guc0     int;       -- e a janela FECHA
  v_rp_tab      text;
  v_rp_ausentes text := '';
  v_rp_permit   constant text[] := ARRAY['respostas_raven','respostas_bigfive',
                                         'respostas_disc','respostas_formulario'];
  -- ⚠ CLASSIFICACAO DA FORMA (CLAUDE.md §"Portoes"): lista LITERAL, e ela e ESCOPO
  --   DELIBERADO e nao fotografia. As treze sao exatamente as origens que o item
  --   `respostas_e_producoes` do recibo enumera, menos `devolutivas_candidato` (que
  --   morre por FK CASCADE, nao por statement). Uma origem NOVA no recibo TEM de
  --   aparecer aqui, e reprovar e o comportamento certo: e assim que o passo deixa
  --   de silenciar uma promessa nova.
  v_rp_treze    constant text[] := ARRAY['respostas_raven','respostas_bigfive','respostas_disc',
                                         'respostas_formulario','redacoes_candidato',
                                         'redacoes_candidato_em_progresso','respostas_cultura',
                                         'respostas_avaliacao','cognitivo_respostas',
                                         'entrevistas_online','entrevistas_presenciais',
                                         'entrevista_analises','scores_candidato'];
  v_pl_itens    boolean;   -- o 3o ramo LE o ledger de itens
  v_pl_alvo     boolean;   -- e exige o ALVO, nao so o modo
  v_pl_notin    boolean;   -- e nunca nega por pertencimento a conjunto
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
    RAISE EXCEPTION 'P45M FAIL (C3/i): o corpo VIVO de plano_exclusao_titular NAO casa byte a byte com a migration. md5 vivo=% (esperado %), octetos=%. ⚠ O pin vigente foi re-carimbado em 2026-08-23 pelo plano 46-04 (Blocker B-02 / Saida A, migration 20260823000008); o valor anterior APLICADO era 97634d07ef13447e06741a8c8372fca6 com 21 349 octetos. Se o md5 vivo for o ANTIGO, a migration 20260823000008 nao foi aplicada — e sem ela o 4o ramo da 20260823000006 nao produz efeito util, porque o cron e autorizado no motor e recusado tres linhas depois AQUI. Se for um TERCEIRO valor e o md5(statements[1]) do apply tiver batido o md5 do arquivo, a divergencia e de EXTRACAO e nao do objeto — ver PROVENIENCIA no cabecalho',
      v_md5_plano, v_pin_plano, octet_length(v_src_plano);
  END IF;

  IF v_md5_anon IS DISTINCT FROM v_pin_anon THEN
    RAISE EXCEPTION 'P45M FAIL (C3/i): o corpo VIVO de anonimizar_candidato NAO casa byte a byte com a migration. md5 vivo=% (esperado %), octetos=%. ⚠ O pin vigente foi re-carimbado em 2026-08-23 pelo plano 46-04 (quarto ramo do guard, migration 20260823000006); o valor anterior APLICADO era 8c86e0f040219e7eade47eb587dbf5de com 34 488 octetos. Se o md5 vivo for o ANTIGO, a migration 20260823000006 nao foi aplicada. Se for um TERCEIRO valor e o md5(statements[1]) do apply tiver batido o md5 do arquivo, a divergencia e de EXTRACAO e nao do objeto — ver PROVENIENCIA no cabecalho',
      v_md5_anon, v_pin_anon, octet_length(v_src_anon);
  END IF;

  -- ── (C3/iii) 46-04 · A REDE ESTRUTURAL, QUE SO CRESCE ─────────────────────
  -- Medida sobre o CORPO VIVO, com fronteira de palavra e nunca `strpos` (ver o
  -- bloco correspondente no cabecalho). Ela existe para o dia do RE-PIN: quando o
  -- md5 muda por decisao humana, e ela que continua exigindo que o corpo novo
  -- tenha a forma que foi revisada, e nao apenas "alguma forma".
  v_tem_itens  := (v_src_anon ~ '\mpurga_execucao_itens\M');
  v_tem_aberto := (v_src_anon ~ 'concluido_em[[:space:]]+IS[[:space:]]+NULL');
  v_tem_notin  := (v_src_anon ~* '\mNOT[[:space:]]+IN[[:space:]]*\(');
  v_tem_live   := (v_src_anon ~ 'modo_vigente[[:space:]]*=[[:space:]]*''live''');

  IF NOT v_tem_itens THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iii): o corpo vivo de anonimizar_candidato NAO menciona purga_execucao_itens. O quarto ramo do guard (D-46-18) sumiu, e com ele a UNICA autorizacao que o motor da purga tem para chamar esta funcao. Um md5 que casasse com esta forma significaria que alguem re-pinou um corpo que nao devia existir';
  END IF;

  IF NOT v_tem_aberto THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iii): o corpo vivo NAO exige item AINDA ABERTO (concluido_em IS NULL). Sem essa condicao, um item FECHADO de uma execucao antiga autorizaria a destruicao para sempre — o ramo deixaria de exigir o estado que SO o motor produz AGORA e passaria a aceitar um vestigio dele';
  END IF;

  IF v_tem_notin THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iii): o corpo vivo usa negacao por PERTENCIMENTO A CONJUNTO DE VALORES. Com um dos lados NULL essa forma avalia NULL, o IF nao e tomado e o guard FALHA ABERTO — defeito REAL medido na 42-06 e o mesmo bug do outro lado do predicado no INVENT-05. Toda verificacao de estado desta funcao tem de ser EXISTS correlacionado, e toda comparacao de papel tem de ser IS DISTINCT FROM';
  END IF;

  IF NOT v_tem_live THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iii): a metade DESTRUTIVA do quarto ramo NAO exige modo_vigente = live escrito por extenso. D-46-24 escopa o modo permissivo ao caminho de DRY-RUN, que o Postgres reverte por construcao; o caminho destrutivo e autorizado EXCLUSIVAMENTE sob live. Se as duas metades passaram a compartilhar um predicado, o caminho destrutivo acabou de herdar EM SILENCIO a permissao do reversivel — que e exatamente a obrigacao de aceite que D-46-24 escreveu';
  END IF;

  -- ── ME-04 · A REGRESSAO CONCRETA, E NAO SO A PRESENCA DA STRING ───────────
  -- ⚠ `v_tem_live` acima mede que `modo_vigente = 'live'` existe EM ALGUM LUGAR do
  --   corpo. A regressao que D-46-24 mandou tornar impossivel e mais fina: a
  --   metade destrutiva de (b) passar a ler `v_purga_dry` em vez de `v_purga_live`.
  --   Com essa troca, `v_tem_live` continuaria VERDE — a string segue no corpo, no
  --   predicado (p.2), que so teria virado dead code. Estas tres checagens medem a
  --   LIGACAO, que e onde o defeito moraria.
  v_tem_2var := (v_src_anon ~ '\mv_purga_live\M') AND (v_src_anon ~ '\mv_purga_dry\M');
  v_le_live  := (v_src_anon ~ 'AND[[:space:]]+NOT[[:space:]]+v_purga_live');
  v_le_dry   := (v_src_anon ~ 'AND[[:space:]]+NOT[[:space:]]+v_purga_dry');

  IF NOT v_tem_2var THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iii-ME04): o corpo vivo nao tem as DUAS variaveis do quarto ramo (v_purga_dry e v_purga_live). As metades deixaram de ser fisicamente distintas, e a obrigacao de aceite de D-46-24 existe para que isso seja impossivel: um predicado compartilhado e como, numa edicao futura, o caminho destrutivo herda EM SILENCIO a permissao do reversivel';
  END IF;

  IF NOT v_le_live OR NOT v_le_dry THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iii-ME04): as duas variaveis existem mas o corpo NAO consulta as duas nas guardas (le_live=%, le_dry=%). Se a metade DESTRUTIVA passou a ler v_purga_dry, o predicado (p.2) virou dead code e a string modo_vigente = live continuaria no corpo deixando (C3/iii) VERDE — este e exatamente o falso verde que ME-04 do 46-REVIEW encontrou', v_le_live, v_le_dry;
  END IF;

  -- ── BL-02 · O RAMO SO VALE PARA CHAMADOR SEM SESSAO ──────────────────────
  -- Sem esta conjuncao o ramo e propriedade apenas do alvo e do cerco: enquanto
  -- houver item aberto sob live, as metades (b) e (c) ficam desligadas para TODO
  -- MUNDO, e qualquer usuario logado com EXECUTE destroi aquele titular fora da
  -- ordem Storage -> Postgres -> Auth. Medido em execucao por (o.6) do
  -- `p46_purga_smoke.sql`; aqui a forma e vigiada mesmo que o smoke nao rode.
  v_tem_semsess := (v_src_anon ~ '\(v_uid IS NULL\)[[:space:]]*AND[[:space:]]+EXISTS');

  IF NOT v_tem_semsess THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iii-BL02): o quarto ramo NAO exige (v_uid IS NULL) como primeira conjuncao. Ele voltou a autorizar por ALVO e CERCO sem mencionar o CHAMADOR — e o ramo existe para autorizar o CRON, que se caracteriza por nao ter sessao. Um chamador COM claim tem de continuar sendo julgado pelas metades (b) e (c), como sempre foi (BL-02 do 46-REVIEW)';
  END IF;

  -- ── HI-03 · A AUTORIZACAO EXPIRA ─────────────────────────────────────────
  v_tem_janela := (v_src_anon ~ 'iniciada_em[[:space:]]*>[[:space:]]*pg_catalog\.now\(\)[[:space:]]*-[[:space:]]*interval');

  IF NOT v_tem_janela THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iii-HI03): o quarto ramo NAO limita no TEMPO o estado autorizante. Uma Edge Function que morre entre abrir o item e muta-lo deixa o item aberto e a execucao em executando INDEFINIDAMENTE — e o ramo autorizaria a destruicao daquele titular PARA SEMPRE. Isso e uma autorizacao destrutiva standing, exatamente a categoria que D-46-18 recusou ao rejeitar a Saida A. concluido_em IS NULL impede o vestigio FECHADO; nao impede o item NUNCA FECHADO, que e o caso real (HI-03 do 46-REVIEW)';
  END IF;

  -- ── (C3/iv) 46-04 / B-02 · A MESMA REDE SOBRE `plano_exclusao_titular` ────
  -- ⚠ ESTA METADE EXISTE POR CAUSA DO PROPRIO ACHADO QUE ELA VIGIA. O motor CHAMA
  --   esta funcao no PASSO 0, e o guard DELA quase deixou a fase inteira embarcar
  --   um caminho que nao funciona: o cron era autorizado no motor e recusado tres
  --   linhas depois, aqui. Um re-pin sem exigencia de forma atras dele deixaria o
  --   mesmo defeito voltar em silencio na proxima edicao.
  v_pl_itens := (v_src_plano ~ '\mpurga_execucao_itens\M');
  v_pl_alvo  := (v_src_plano ~ 'i\.candidato_id[[:space:]]*=[[:space:]]*p_candidato_id');
  v_pl_notin := (v_src_plano ~* '\mNOT[[:space:]]+IN[[:space:]]*\(');

  IF NOT v_pl_itens THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iv): o corpo vivo de plano_exclusao_titular NAO menciona purga_execucao_itens. O terceiro ramo do guard dela (Blocker B-02 / Saida A) sumiu — e sem ele o 4o ramo de anonimizar_candidato NAO PRODUZ EFEITO UTIL: o cron passa no guard do motor e e recusado com 42501 no PASSO 0, tres linhas adiante. Este e o defeito exato que o plano 46-04 descobriu, e um md5 que casasse com esta forma significaria que alguem re-pinou um corpo que nao devia existir';
  END IF;

  IF NOT v_pl_alvo THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iv): o terceiro ramo de plano_exclusao_titular NAO exige o ALVO (i.candidato_id = p_candidato_id). Sem essa condicao, estar dentro de QUALQUER execucao de purga autorizaria LER O PLANO DE QUALQUER PESSOA — e esta funcao devolve CONTAGENS DE PII POR TITULAR, que e exatamente a superficie de exfiltracao que o REVOKE nominal dela existe para fechar. O ramo tem de autorizar a leitura do plano de quem a purga esta processando, e de mais ninguem';
  END IF;

  IF NOT (v_src_plano ~ '\(v_uid IS NULL\)[[:space:]]*AND[[:space:]]+EXISTS') THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iv-BL02): o terceiro ramo de plano_exclusao_titular NAO exige (v_uid IS NULL) como primeira conjuncao. Sem isso, qualquer usuario logado que alcance a funcao pelo GRANT a authenticated LE as contagens de PII de um titular so por ele estar sendo processado pela purga — e o REVOKE nominal desta funcao existe porque contagens enumeraveis sao superficie de exfiltracao';
  END IF;

  IF NOT (v_src_plano ~ 'iniciada_em[[:space:]]*>[[:space:]]*pg_catalog\.now\(\)[[:space:]]*-[[:space:]]*interval') THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iv-HI03): o terceiro ramo de plano_exclusao_titular NAO limita no TEMPO o estado autorizante. Um item aberto por uma Edge Function que morreu autorizaria a leitura daquele plano para sempre';
  END IF;

  IF v_pl_notin THEN
    RAISE EXCEPTION 'P45M FAIL (C3/iv): o corpo vivo de plano_exclusao_titular usa negacao por PERTENCIMENTO A CONJUNTO DE VALORES. Com um dos lados NULL essa forma avalia NULL, o IF nao e tomado e o guard FALHA ABERTO — defeito REAL medido na 42-06. Toda verificacao de estado tem de ser EXISTS correlacionado, e toda comparacao de papel IS DISTINCT FROM';
  END IF;

  -- ── (C3/v) 49-14 · A REDE SOBRE O PASSO NOVO (D-60, D-61, D-63) ──────────
  -- ⚠⚠ ELA EXISTE PORQUE O PIN FOI TROCADO. Sem estas oito checagens, o re-pin de
  --    2026-09-23 seria um numero novo sem nenhuma exigencia de forma atras dele —
  --    e "a rede embaixo do md5 so cresce" (D-46-18, obrigacao 4) e a regra que
  --    impede um re-pin de virar desculpa para afrouxar a assercao.
  v_rev_corr  := (v_src_anon ~ 'revisao_resultado = CASE WHEN d\.revisao_resultado IS NULL');
  v_rev_arq   := (v_src_anon ~ 'revisao_resultado = CASE WHEN h\.revisao_resultado IS NULL');
  v_cmp_tipo  := (v_src_anon ~ 'call_type = ''comparative_ranking''');
  v_cmp_pred  := (v_src_anon ~ 'position\(''id='' \|\|');
  -- ⚠ A ORDEM E MEDIDA POR POSICAO, e nao por presenca das duas. O UPDATE da linha
  --   CORRENTE dispara `trg_decisao_final_snapshot`, que arquiva o valor ANTIGO; o
  --   scrub do arquivo tem de vir DEPOIS dele. Invertidos, sobra no arquivo uma
  --   versao recem-criada e identificavel — a armadilha M1 da `justificativa`, agora
  --   valendo tambem para a resposta do revisor. Presenca das duas passaria nos dois
  --   mundos.
  v_rev_ordem := (position('UPDATE public.decisao_final d' IN v_src_anon) > 0)
             AND (position('UPDATE public.decisao_final_historico h' IN v_src_anon) > 0)
             AND (position('UPDATE public.decisao_final d' IN v_src_anon)
                  < position('UPDATE public.decisao_final_historico h' IN v_src_anon));
  -- ⚠⚠ E AQUI A CHECAGEM E DA LISTA `SET` CONTIGUA, nao de duas presencas somadas.
  --    Duas presencas passariam com a sentinela num UPDATE SEPARADO depois do (1/5)
  --    — e esse UPDATE nao acharia linha nenhuma, porque o `candidato_id` que serve
  --    de endereco acabou de ser cortado: zero linha, zero erro, input intacto. Um
  --    falso verde que nao da nem um aviso.
  v_upt_junto := (position('candidato_id         = NULL,
         parsed_reasoning     = NULL,
         raw_response         = ''{"redigido":"anonimizacao_p45"}''::jsonb,
         user_prompt_template = ''[conteudo enviado' IN v_src_anon) > 0);
  v_pl_rev    := (v_src_plano ~ '''revisao_resultado_corrente''')
             AND (v_src_plano ~ '''revisao_resultado_arquivo''');
  v_pl_cmp_f  := (v_src_plano ~ '''ai_call_logs_comparativo''')
             AND (v_src_plano ~ 'position\(''id='' \|\|');

  IF NOT v_rev_corr OR NOT v_rev_arq THEN
    RAISE EXCEPTION 'P45M FAIL (C3/v): o tombstone nao rasga revisao_resultado nos DOIS lados (corrente=%, arquivo=%). E o texto que o revisor ESCREVEU ao responder o pedido de revisao do Art. 20 — e o arquivo entrega o que a linha corrente protege (achado M1, agora na coluna que nasceu depois da justificativa). D-60', v_rev_corr, v_rev_arq;
  END IF;

  IF NOT v_rev_ordem THEN
    RAISE EXCEPTION 'P45M FAIL (C3/v): a ordem corrente -> arquivo do tombstone nao esta no corpo vivo. O UPDATE de decisao_final dispara trg_decisao_final_snapshot, que insere no arquivo uma versao com o valor ANTIGO; raspar o arquivo ANTES dele deixa essa versao recem-criada e identificavel atras do scrub. E o mecanismo, nao o estilo';
  END IF;

  IF NOT v_cmp_tipo OR NOT v_cmp_pred THEN
    RAISE EXCEPTION 'P45M FAIL (C3/v): o passo das linhas de comparativo sumiu do corpo vivo (escopo por call_type=%, predicado por position(''id=''...)=%). Essas linhas nascem com candidato_id NULL POR DESENHO (a chamada e sobre varias pessoas), e ai_call_logs nao tem candidatura_id: sem este predicado nada as alcanca, e o user_prompt_template delas guarda o bloco literal de cada candidato comparado. D-63', v_cmp_tipo, v_cmp_pred;
  END IF;

  IF NOT v_upt_junto THEN
    RAISE EXCEPTION 'P45M FAIL (C3/v): user_prompt_template NAO esta na mesma lista SET que faz candidato_id := NULL no passo (1/5). E o candidato_id que ACHA a linha: num UPDATE separado depois dele o predicado nao casa com nada — zero linha, zero erro, e o INPUT do titular de pe. Severar o ponteiro deixando a entrada intacta e pseudonimizacao apresentada como anonimizacao (Art. 12 §1o). D-61';
  END IF;

  IF NOT v_pl_rev OR NOT v_pl_cmp_f THEN
    RAISE EXCEPTION 'P45M FAIL (C3/v): plano_exclusao_titular nao conta o que o motor passou a apagar (revisoes=%, comparativos=%). O dry-run e o delete real TEM de sair da MESMA expressao (regra (ii) desta assercao): um plano que conta menos do que o motor apaga e um recibo que promete um tamanho e entrega outro — P39/CR-02, uma guarda que era dead code', v_pl_rev, v_pl_cmp_f;
  END IF;

  -- ── (C3/vi) 49-20 · A REDE SOBRE O PASSO QUE APAGA LINHA (D-48, D-62) ────
  -- ⚠⚠ ELA EXISTE PORQUE O PIN FOI TROCADO OUTRA VEZ, E PORQUE O QUE ENTROU NO
  --    CORPO APAGA LINHA. Ate o 49-14 o pior que um re-pin descuidado escondia era
  --    uma raspagem que deixou de acontecer. A partir daqui ele pode esconder um
  --    apagamento que acontece em tabela que ninguem autorizou — e nao ha PITR
  --    (D-45-10) nem backup de Storage. As onze checagens abaixo sao a exigencia de
  --    FORMA embaixo do md5 novo, e "a rede embaixo do md5 so cresce" (D-46-18,
  --    obrigacao 4).
  v_rp_ini := position('passo_motor: apagar_respostas_e_producoes' IN v_src_anon);
  v_rp_fim := position('passo_motor: severar_fks_set_null' IN v_src_anon);

  IF v_rp_ini = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): o passo apagar_respostas_e_producoes sumiu do corpo vivo. Sem ele o motor nao toca NENHUMA das 14 origens do item respostas_e_producoes do recibo — o estado exato que o plano 49-20 encontrou (respostas_raven e cited_evidence AUSENTES do corpo) e que ele fechou. E um md5 que casasse com esta forma significaria que alguem re-pinou um corpo que nao devia existir. D-48';
  END IF;
  -- ⚠ A ORDEM E MEDIDA POR POSICAO, e nao por presenca das duas: o passo novo se
  --   enderece por `candidatura_id`, e `severar_fks_set_null` corta ponteiros logo
  --   depois. Presenca das duas passaria nos dois mundos.
  IF v_rp_fim = 0 OR v_rp_ini > v_rp_fim THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): o passo apagar_respostas_e_producoes nao vem ANTES de severar_fks_set_null (posicoes %/%)', v_rp_ini, v_rp_fim;
  END IF;

  v_rp_trecho := substr(v_src_anon, v_rp_ini, v_rp_fim - v_rp_ini);

  -- ⚠⚠ O ESCOPO DO APAGAMENTO, EXTRAIDO DO CORPO VIVO E COMPARADO COM O CONJUNTO
  --    AUTORIZADO. Esta e a assercao mais cara deste arquivo, e a razao e simples:
  --    o D-62 autoriza apagar linha em QUATRO tabelas de resposta de multipla
  --    escolha, porque os CHECKs delas (int 1..8 / 1..5, D/I/S/C, ao-menos-uma-
  --    resposta) nao aceitam sentinela. Em qualquer outra tabela, apagar a linha
  --    destruiria a prova de que houve avaliacao — que o ERASE-08 e a RNF-07a
  --    preservam — e destruiria de forma irreversivel.
  -- ⚠ O padrao e POSIX e nao a forma literal: o `<verify>` do plano varre o ARQUIVO
  --   da migration pela forma de apagamento e exige que ela apareca so para as
  --   quatro permitidas. Escrever a forma literal aqui nao reprovaria este arquivo,
  --   mas reproduziria no smoke exatamente o que ele proibe do outro lado — §K do
  --   PATTERNS: registrar a forma sem reproduzi-la.
  SELECT array_agg(m[1]) INTO v_rp_alvos
    FROM regexp_matches(v_src_anon, 'DELETE[[:space:]]+FROM[[:space:]]+public\.([a-z_]+)', 'g') AS m;

  SELECT array_agg(t) INTO v_rp_fora
    FROM unnest(coalesce(v_rp_alvos, ARRAY[]::text[])) AS t
   WHERE NOT (t = ANY (v_rp_permit));
  IF v_rp_fora IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): ⛔ O MOTOR APAGA LINHA EM TABELA FORA DO D-62: %. A excecao do operador e valida SO no passo apagar_respostas_e_producoes e SO em respostas_raven, respostas_bigfive, respostas_disc e respostas_formulario. Em toda outra origem a linha FICA (sentinela onde a coluna e NOT NULL, NULL onde ela aceita): apagar linha de score, de decisao, de candidatura ou de historico destroi a prova de nao-discriminacao que o ERASE-08 e a RNF-07a preservam — e destroi sem volta, porque PITR esta desligado e o backup de 7 dias exclui Storage', array_to_string(v_rp_fora, ', ');
  END IF;

  SELECT array_agg(p) INTO v_rp_falta
    FROM unnest(v_rp_permit) AS p
   WHERE NOT (p = ANY (coalesce(v_rp_alvos, ARRAY[]::text[])));
  IF v_rp_falta IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): as tabelas do D-62 que o motor NAO apaga: %. Nas quatro nao ha sentinela possivel — deixar uma de fora e deixar as respostas da pessoa de pe enquanto o recibo diz que sairam', array_to_string(v_rp_falta, ', ');
  END IF;

  -- ⚠⚠ A JANELA `app.motor_exclusao` ENVOLVE O UPDATE DA REDACAO, MEDIDA POR
  --    POSICAO. Presenca das tres passaria com a janela aberta cedo e fechada
  --    tarde, deixando o resto da transacao — inclusive o tombstone das FKs —
  --    rodando com o trigger sancionado. E sem o FECHO, o proximo UPDATE de redacao
  --    desta transacao herdaria a sancao.
  v_rp_guc1 := position('set_config(''app.motor_exclusao'',''on'',true)' IN v_src_anon);
  v_rp_upd  := position('UPDATE public.redacoes_candidato r' IN v_src_anon);
  v_rp_guc0 := position('set_config(''app.motor_exclusao'','''',true)' IN v_src_anon);
  IF v_rp_guc1 = 0 OR v_rp_upd = 0 OR v_rp_guc0 = 0
     OR NOT (v_rp_guc1 < v_rp_upd AND v_rp_upd < v_rp_guc0) THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): a janela app.motor_exclusao nao envolve o UPDATE de redacoes_candidato (abre=%, update=%, fecha=%). trg_redacao_rh_only_review_fields LEVANTA EXCECAO quando rh/administrador muda texto/analise_ia, e a Edge Function do direito do titular chama o motor COM O JWT DE QUEM PEDIU: sem a janela, um pedido executado por ADMINISTRADOR aborta aqui DEPOIS de o curriculo ja ter sido apagado do Storage (RESEARCH Correcao 18 / Pitfall 6). E sem o fecho, uma sancao pontual vira portao desligado pelo resto da transacao', v_rp_guc1, v_rp_upd, v_rp_guc0;
  END IF;

  -- ⚠ O TRIGGER FOI SANCIONADO, NAO ESVAZIADO — as duas metades, e a segunda e a
  --   que impede o conserto errado: desligar o trigger tambem faria o motor passar,
  --   e deixaria a tela do RH reescrevendo a redacao do candidato para sempre.
  SELECT p.prosrc INTO v_src_trg
    FROM pg_catalog.pg_proc p
   WHERE p.oid = to_regprocedure('public.trg_redacao_rh_only_review_fields()')::oid;
  IF v_src_trg IS NULL OR position('app.motor_exclusao' IN v_src_trg) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): trg_redacao_rh_only_review_fields nao reconhece a janela app.motor_exclusao. Sem ela o passo depende do PAPEL de quem executa — e o papel de quem executa um direito do titular nao e escolha do sistema';
  END IF;
  IF position('NEW.texto                 IS DISTINCT FROM OLD.texto' IN v_src_trg) = 0
     OR position('NEW.analise_ia            IS DISTINCT FROM OLD.analise_ia' IN v_src_trg) = 0
     OR position('RH/admin so pode atualizar campos de revisao' IN v_src_trg) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): trg_redacao_rh_only_review_fields perdeu a regra que ele existe para aplicar. A sancao do motor NAO e afrouxamento: FORA da janela, rh e administrador continuam impedidos de mudar texto/analise_ia. Um trigger esvaziado produz o MESMO verde no caminho feliz e abre a tela do RH para reescrever a redacao do candidato — por isso (B22) assere o controle por EXECUCAO, e esta metade assere a forma';
  END IF;
  IF position('current_setting(''app.motor_exclusao'', true)' IN v_src_trg) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): a leitura da janela nao usa missing_ok = true. Sem ele, current_setting levanta 42704 em TODO UPDATE de redacao do sistema — o portao mataria o caminho normal em vez de guarda-lo';
  END IF;

  -- ⚠ `cited_evidence` sai dos DOIS lugares, e sai CIRURGICAMENTE. Redigir a coluna
  --   inteira levaria score, level, dimension e reasoning junto — a prova de que
  --   houve avaliacao revisavel, que o ERASE-08 preserva.
  IF position('jsonb_set(r.analise_ia' IN v_rp_trecho) = 0
     OR position('jsonb_set(s.metadata' IN v_rp_trecho) = 0
     OR position('cited_evidence' IN v_rp_trecho) = 0
     OR position('''{dimension_scores}''' IN v_rp_trecho) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): o trecho literal do que a pessoa escreveu nao e removido dos DOIS lugares, ou nao e removido cirurgicamente. cited_evidence vive em redacoes_candidato.analise_ia -> dimension_scores E na metadata da SJT em scores_candidato (medido nos dois). Apagar o texto e deixar a citacao e apagar metade; redigir a coluna inteira e destruir a analise. D-48';
  END IF;

  -- ⚠ AS TREZE ORIGENS ESTAO NO PASSO. Ver a classificacao da forma no DECLARE.
  FOREACH v_rp_tab IN ARRAY v_rp_treze LOOP
    IF position(v_rp_tab IN v_rp_trecho) = 0 THEN
      v_rp_ausentes := v_rp_ausentes || v_rp_tab || ' · ';
    END IF;
  END LOOP;
  IF v_rp_ausentes <> '' THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): o passo nao menciona as origens: %. O recibo promete o apagamento de cada uma delas no item respostas_e_producoes; uma origem sem statement e uma frase do recibo sem mecanismo — e foi exatamente esse o estado que o 49-20 encontrou nas catorze', v_rp_ausentes;
  END IF;

  -- ⚠ O DRY-RUN CONTA O MESMO, PELA MESMA EXPRESSAO — incluidas as condicoes que no
  --   motor fazem `ROW_COUNT` contar RASPAGENS em vez de VISITAS. Sem elas o plano
  --   diria "vou raspar N citacoes" quando vai raspar ZERO, e para as quatro do
  --   D-62 ele e o UNICO lugar onde o numero de linhas que VAO deixar de existir
  --   pode ser lido antes de deixarem.
  IF position('''apagar_respostas_e_producoes''' IN v_src_plano) = 0
     OR position('p.texto_em_progresso IS NOT NULL' IN v_src_plano) = 0
     OR position('f.documentos_apresentados IS NOT NULL' IN v_src_plano) = 0
     OR position('n.citacoes IS NOT NULL' IN v_src_plano) = 0
     OR position('jsonb_exists(z, ''cited_evidence'')' IN v_src_plano) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vi): plano_exclusao_titular nao conta o passo novo pela MESMA expressao do motor (chave e/ou as condicoes IS NOT NULL / o predicado da SJT). O dry-run e o delete real TEM de sair da mesma expressao (regra (ii)) — e com um passo que APAGA LINHA, um dry-run que conta a menos e um ensaio que nao ensaia o que vai acontecer';
  END IF;
  FOREACH v_rp_tab IN ARRAY v_rp_treze LOOP
    IF position(v_rp_tab IN v_src_plano) = 0 THEN
      RAISE EXCEPTION 'P45M FAIL (C3/vi): o dry-run nao conta a origem %. Contar menos do que o motor apaga e um recibo que promete um tamanho e entrega outro', v_rp_tab;
    END IF;
  END LOOP;

  -- ── (C3/vii) 49-21 / D-69 · AS ESCOLHAS DA SJT, VIGIADAS POR FORMA ────────
  -- ⚠⚠ ESTAS QUATRO CLAUSULAS FORAM ACRESCENTADAS **ANTES** DA TROCA DOS PINS, no
  --    MESMO commit da migration `20260923000001` — a mesma disciplina do 49-14 e do
  --    49-20, e pela mesma razao: um re-pin descuidado carimba o md5 do corpo que
  --    estiver la, e sem rede de FORMA nada reprovaria um corpo que perdeu o
  --    statement. A (B23) prova por EXECUCAO; estas quatro provam por FORMA, e a
  --    diferenca aparece no cenario em que a fixture nao ve a mudanca.
  IF position('metadata = s.metadata - ''respostas''' IN v_rp_trecho) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vii): o statement que remove a chave respostas da metadata da SJT sumiu do passo. As escolhas de multipla escolha da SJT (opcao_id/pergunta_id/peso) sobreviveriam enquanto o item respostas_e_producoes do recibo promete ao titular que as respostas das avaliacoes foram apagadas — e a Correcao 14 REJEITOU ressalvar as alternativas marcadas. D-69';
  END IF;
  IF position('jsonb_exists(s.metadata, ''respostas'')' IN v_rp_trecho) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vii): a remocao das escolhas da SJT nao exige a chave no PREDICADO. Sem jsonb_exists no WHERE, ROW_COUNT conta VISITAS em vez de RASPAGENS e o numero declarado ao auditor fica maior do que o que saiu — a mesma classe do P39/CR-02';
  END IF;
  IF position('''scores_candidato_respostas_sjt''' IN v_src_anon) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vii): o motor nao DECLARA em passos quanto removeu de metadata -> respostas. Um passo destrutivo que nao diz quanto destruiu nao e auditavel, e este e o numero que o recibo do titular passa a poder citar';
  END IF;
  IF position('''scores_candidato_respostas_sjt''' IN v_src_plano) = 0
     OR position('jsonb_exists(s.metadata, ''respostas'')' IN v_src_plano) = 0 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/vii): plano_exclusao_titular nao conta as escolhas da SJT pela MESMA expressao do motor (chave e/ou o predicado jsonb_exists). O dry-run e o unico lugar onde esse numero pode ser lido ANTES de a exclusao acontecer';
  END IF;

  -- ── (C3/janela) RD2-06 + RD3-01 · AS TRES JANELAS, MEDIDAS NO CODIGO ─────
  -- ⚠⚠ A PRIMEIRA VERSAO DESTE PORTAO LIA COMENTARIO, NAO CODIGO — e essa e a
  --   SEXTA ocorrencia da familia "portao que parece medir e nao mede" nesta fase.
  --   Ela usava `substring()`, que devolve a PRIMEIRA ocorrencia, sobre `prosrc`,
  --   que INCLUI os comentarios do corpo. Medido: nos TRES corpos a primeira
  --   ocorrencia e prosa (um comentario que cita a janela para explica-la), e as
  --   CINCO ocorrencias reais ficavam de fora — **inclusive a da metade
  --   DESTRUTIVA**. Trocar o codigo real para `interval '30 days'` deixaria este
  --   portao VERDE, enquanto a mensagem dele afirma que isso e "o que este portao
  --   existe para tornar impossivel". E a forma do BL-01 outra vez: uma frase
  --   confiante sobre uma propriedade que ninguem verificou.
  --
  -- ⚠ O CONSERTO TEM TRES PARTES, e as tres sao necessarias:
  --   1. **Comentarios sao removidos ANTES de casar.** Sem isso o portao mede
  --      prosa, que e exatamente o que ele existe para nao fazer.
  --      ⚠⚠ RD4-01 · E "COMENTARIO" SAO AS TRES FORMAS, nao uma. A rodada 4
  --      demonstrou POR MUTACAO que a versao anterior — que so descartava a linha
  --      inteira comecada por `--` — deixava DOIS buracos por onde a janela podia
  --      ser trocada com o portao VERDE: um bloco `/* ... */` e um comentario de
  --      FIM DE LINHA. Nao e hipotetico: `plano_exclusao_titular`, um dos dois
  --      corpos PINADOS, tem blocos `/** ... */` dentro do proprio delimitador.
  --      Apagar a 2a janela e reescrever o padrao dentro de um deles devolvia
  --      `n=2, distintas=1` — verde — enquanto o codigo real rodava com outra
  --      janela. SETIMA ocorrencia da familia "portao que parece medir e nao mede"
  --      nesta fase, e a segunda DENTRO DESTE MESMO PORTAO.
  --      ⚠ A ordem importa: o bloco `/* */` e removido PRIMEIRO (ele atravessa
  --      linhas, entao tem de cair antes do split), e so entao o `--` ate o fim da
  --      linha. Trocar a ordem faria um `--` dentro de um bloco truncar o resto da
  --      linha e deixar o `*/` orfao.
  --   2. **TODAS as ocorrencias sao lidas**, e nao a primeira: `regexp_matches`
  --      com a flag global. Uma unica leitura nunca poderia ver as duas metades
  --      de `anonimizar_candidato`, e e a segunda (a DESTRUTIVA) que importa mais.
  --   3. **A CONTAGEM por corpo e exigida.** Ela e ESCOPO DELIBERADO, e nao
  --      fotografia: o numero de predicados de autorizacao de cada funcao e um
  --      fato de desenho — dois no motor (dry-run e destrutivo), um no plano (que
  --      nao tem caminho destrutivo), dois na varredura (itens e execucoes). Se um
  --      deles sumir, o portao TEM de falar; e se nascer um terceiro, alguem tem
  --      de vir aqui justifica-lo. Sem a contagem, apagar a janela da metade
  --      destrutiva passaria despercebido enquanto a outra continuasse igual.
  SELECT p.prosrc INTO v_src_sweep
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'varrer_purga_retencao';

  IF v_src_sweep IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C3/janela): public.varrer_purga_retencao() nao existe — a janela da reconciliacao nao tem onde ser medida, e a metade do conserto de HI-03 que fecha os itens orfaos nao esta aplicada';
  END IF;

  FOR r_jan IN
    SELECT t.nome, t.esperado,
           (SELECT string_agg(l, E'\n')
              FROM regexp_split_to_table(
                     -- (1) blocos `/* ... */`, inclusive multi-linha (`s` faz o
                     --     ponto casar quebra de linha; `?` impede que um bloco
                     --     engula tudo ate o ultimo `*/` do corpo)
                     regexp_replace(t.corpo, '/\*.*?\*/', '', 'gs'),
                     E'\n') AS l0
              -- (2) o `--` ate o fim da linha — o que cobre TANTO a linha inteira
              --     de comentario quanto o comentario de fim de linha de codigo
              CROSS JOIN LATERAL (SELECT regexp_replace(l0, '--.*$', '')) AS c(l)) AS codigo
      FROM (VALUES
        ('anonimizar_candidato',   v_src_anon,  2),
        ('plano_exclusao_titular', v_src_plano, 1),
        ('varrer_purga_retencao',  v_src_sweep, 2)
      ) AS t(nome, corpo, esperado)
  LOOP
    SELECT count(*), count(DISTINCT m[1]), max(m[1])
      INTO v_jan_n, v_jan_d, v_jan_val
      FROM regexp_matches(r_jan.codigo, 'now\(\) - interval ''([^'']+)''', 'g') AS m;

    IF v_jan_n IS DISTINCT FROM r_jan.esperado THEN
      RAISE EXCEPTION 'P45M FAIL (C3/janela): public.%() tem % janela(s) de expiracao NO CODIGO (esperado %). ⚠ A contagem e escopo DELIBERADO: o numero de predicados de autorizacao de cada funcao e fato de desenho — dois no motor (dry-run e destrutivo), um no plano (que nao tem caminho destrutivo), dois na varredura (itens e execucoes). Se o numero CAIU, um predicado perdeu a janela e a autorizacao dele voltou a ser standing (HI-03); se SUBIU, nasceu um predicado que ninguem justificou aqui. ⚠ Esta contagem le CODIGO: as TRES formas de comentario sao removidas antes de casar — bloco /* */ (inclusive multi-linha), linha inteira iniciada por -- e comentario de FIM DE LINHA. A 1a versao deste portao lia a primeira ocorrencia de prosrc, que nos tres corpos era PROSA, e ficava verde com o codigo real em qualquer valor (RD3-01); a 2a descartava so a linha inteira, e plano_exclusao_titular tem blocos /** */ dentro do corpo pinado, entao a janela ainda podia ser trocada com o portao verde (RD4-01, demonstrado por mutacao)',
        r_jan.nome, v_jan_n, r_jan.esperado;
    END IF;

    IF v_jan_d IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'P45M FAIL (C3/janela): public.%() declara % janelas DIFERENTES dentro do proprio corpo. As duas metades do mesmo guard passariam a expirar em momentos diferentes, e existiria um intervalo em que uma autoriza e a outra nao', r_jan.nome, v_jan_d;
    END IF;

    v_jans := v_jans || v_jan_val;
  END LOOP;

  IF array_length(v_jans, 1) IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'P45M FAIL (C3/janela): ⊖ NAO-VACUIDADE — foram medidos % corpos (esperado 3). Um laco que nao percorreu os tres nao comparou nada, e uma comparacao que nao aconteceu passaria por verde', coalesce(array_length(v_jans, 1), 0);
  END IF;

  IF v_jans[1] IS DISTINCT FROM v_jans[2] OR v_jans[1] IS DISTINCT FROM v_jans[3] THEN
    RAISE EXCEPTION 'P45M FAIL (C3/janela): as TRES janelas DIVERGIRAM (motor=[%], plano=[%], varredura=[%]). Existe agora um intervalo em que o item AINDA autoriza a destruicao e a varredura JA o considera orfao, ou o contrario — e nenhum dos dois lados sabe disso. O literal vive em cinco lugares e em tres arquivos: alterar um sem os outros e exatamente o que este portao existe para tornar impossivel (RD2-06)', v_jans[1], v_jans[2], v_jans[3];
  END IF;

  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C3): as QUATRO metades — md5 pinado (plano=%, anon=%), o tombstone CHAMA a expressao unica, a rede do 46-04 sobre o MOTOR (le purga_execucao_itens, exige item aberto, exige modo_vigente = live na metade destrutiva, zero negacao por conjunto) e a rede sobre o PLANO (le o ledger, exige o ALVO, zero negacao por conjunto); e as TRES janelas de expiracao, medidas NO CODIGO (2+1+2 ocorrencias), batem em [%]', v_md5_plano, v_md5_anon, v_jans[1];
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

  -- C6-neg (Phase 48 / 48-01): candidatura com forma de knockout, em OUTRA vaga
  -- (UNIQUE (candidato_id, vaga_id) WHERE deleted_at IS NULL).
  v_vaga_ko      uuid;
  v_candko       uuid;
  v_encerrada_ko timestamptz := NULL;
  v_ko_existe    boolean := false;

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

  SELECT v.id INTO v_vaga_ko
    FROM public.vagas v
   WHERE v.id <> v_vaga
   ORDER BY v.created_at
   LIMIT 1;
  IF v_vaga_ko IS NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C6-neg): nenhuma SEGUNDA vaga viva — a candidatura com forma de knockout precisa de outra vaga (UNIQUE (candidato_id, vaga_id)), e sem ela (C6-neg) passaria por VACUIDADE';
  END IF;

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

    -- `status = 'rejeitado'` NO INSERT desarma os dois triggers de dispatch (ver
    -- cabecalho). ⚠ Phase 48 / 48-01 (JORN-26): ATE AQUI a linha ficava assim, e o
    -- comentario dizia que `etapa_atual = 'triagem'` a mantinha EM ANDAMENTO porque
    -- "as duas colunas sao independentes". Essa frase ERA o Defeito 26 escrito como
    -- premissa: `status = 'rejeitado'` e terminal, e o predicado so-por-etapa que a
    -- fixture exercitava era exatamente o que marcava `encerrada_a_pedido_em` numa
    -- candidatura que o knockout ja tinha encerrado. Com o predicado canonico
    -- (`public.candidatura_encerrada(etapa, status)`), a fixture antiga reprovaria
    -- (C6) — com o conserto CORRETO. Agora ela fica em andamento DE VERDADE: o UPDATE
    -- para `em_analise` nao dispara dispatch nenhum (nenhum trigger de notificacao
    -- olha UPDATE de status; `guard_rejeicao_auditada` so olha a ENTRADA em
    -- `rejeitado`).
    INSERT INTO public.candidaturas
      (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES
      (v_cand, v_vaga, 'triagem', 'rejeitado', false, now() - interval '10 days')
    RETURNING id INTO v_candtr;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_candtr;

    -- (C6-neg) Uma segunda candidatura do MESMO titular, com a forma exata do
    -- knockout: `etapa_atual = 'inscricao'`, `status = 'rejeitado'` (e o INSERT com
    -- `rejeitado` e tambem o que desarma o dispatch). O pedido de exclusao NAO pode
    -- marca-la — ela ja estava encerrada, e marca-la avisaria os RH do exercicio de um
    -- direito sobre um caso que ja tinha acabado.
    INSERT INTO public.candidaturas
      (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES
      (v_cand, v_vaga_ko, 'inscricao', 'rejeitado', false, now() - interval '9 days')
    RETURNING id INTO v_candko;

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

    SELECT true, c.encerrada_a_pedido_em INTO v_ko_existe, v_encerrada_ko
      FROM public.candidaturas c WHERE c.id = v_candko;

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

  -- ── (C6-neg) ⊖ NEGATIVA (Phase 48 / JORN-26 — Defeito 26) ───────────────────
  -- A candidatura com a forma do knockout (`inscricao`, `rejeitado`) JA estava
  -- encerrada. O pedido de exclusao nao a marca. A primeira perna prova que a
  -- fixture existiu (sem ela, "nao marcada" seria verdade por vacuidade); a perna
  -- positiva e (C6) logo acima, sobre o MESMO titular e a MESMA chamada.
  IF v_ko_existe IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P45M FAIL (C6-neg): a fixture com forma de knockout NAO existia dentro da subtransacao — a negativa passaria por VACUIDADE';
  END IF;
  IF v_encerrada_ko IS NOT NULL THEN
    RAISE EXCEPTION 'P45M FAIL (C6-neg): registrar_pedido_exclusao marcou encerrada_a_pedido_em (%) numa candidatura de KNOCKOUT (etapa inscricao, status rejeitado). E o Defeito 26: o predicado de "em andamento" voltou a olhar so etapa_atual, e o trigger trg_candidatura_encerrada_a_pedido avisaria os RH do exercicio de um direito do titular sobre um caso que ja tinha acabado', v_encerrada_ko;
  END IF;
  PERFORM set_config('smoke45m.pass', (coalesce(nullif(current_setting('smoke45m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45M PASS (C6-neg): a candidatura de knockout NAO foi marcada pelo pedido de exclusao';
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
--     e na P43). O esperado e FIXO: 37 (subiu de 25 para 30 no plano 49-14, de 30
--     para 36 no plano 49-20 e de 36 para 37 no plano 49-21 — seis propriedades
--     independentes do passo que apaga
--     linha; ver o bump registrado no cabecalho).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  r          record;
  v_divergs  text := '';
  v_agora    bigint;
  v_asserts  int;
  -- ⚠ 37 desde o plano 49-21 (36 no 49-20, 30 no 49-14, 25 antes). Escopo DELIBERADO, nao fotografia: e o numero
  --   exato de assercoes que este arquivo contem, e o RESUMO existe para reprovar o run
  --   PARCIAL que termina em silencio (licao da 37-03, repetida na P41-05 e na P43).
  v_esperado int := 37;
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
      ('public.recruiter_alerts',        'alerts'),
      -- ⚠ 49-20: as quinze do passo `apagar_respostas_e_producoes`. Nas quatro
      --   primeiras a metade de residuo deixou de ser so "nao poluiu" e passou a
      --   ser tambem "nao APAGOU": o passo remove linha nelas, e uma subtransacao
      --   que nao revertesse teria levado respostas de candidatos REAIS junto.
      ('public.respostas_raven',                 'rraven'),
      ('public.respostas_bigfive',               'rbig'),
      ('public.respostas_disc',                  'rdisc'),
      ('public.respostas_formulario',            'rform'),
      ('public.redacoes_candidato',              'red'),
      ('public.redacoes_candidato_em_progresso', 'redp'),
      ('public.respostas_cultura',               'rcult'),
      ('public.respostas_avaliacao',             'raval'),
      ('public.cognitivo_respostas',             'cog'),
      ('public.entrevistas_online',              'eon'),
      ('public.entrevistas_presenciais',         'epr'),
      ('public.entrevista_analises',             'ean'),
      ('public.scores_candidato',                'scand'),
      ('public.scores_raven',                    'sraven'),
      ('public.perguntas_cultura',               'pcult')
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

  RAISE NOTICE 'P45M RESUMO: % assercoes PASS de % esperadas; zero residuo em 28 tabelas — gate VERDE. Este arquivo e a ESPECIFICACAO do motor, nao um relatorio dele: se a implementacao divergir, corrige-se a implementacao', v_asserts, v_esperado;
END
$z$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
