---
phase: 49-consertos-da-jornada-bloco-2
plan: "20"
subsystem: database
tags: [postgres, supabase, lgpd, erase, anonimizacao, motor-destrutivo, delete, guc, jsonb, migrations, p46apply, mutation-testing]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "14"
    provides: "o corpo vivo de que este plano parte, os dois md5 que sao o seu PRE-PORTAO (`6ab2890e…` / `12bfca3b…`), o contador 30 do smoke, e a autorizacao exclusiva de escrever `DELETE` no motor (D-62)"
  - phase: 46-purga-e-guardas
    provides: "`p46apply.cjs` (SQL lido do ARQUIVO, migration + ledger na mesma requisicao, md5 conferido por leitura de volta) e o 4o/3o ramo do guard das duas funcoes"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "as colunas novas da fase nas tabelas que o passo novo limpa"
provides:
  - "passo `apagar_respostas_e_producoes` em `anonimizar_candidato`: TREZE statements, ANTES de `severar_fks_set_null`, escopados por `candidatura_id IN (SELECT id FROM candidaturas WHERE candidato_id = p_candidato_id)`"
  - "D-62 aplicado: o motor APAGA as linhas do titular em `respostas_raven`, `respostas_bigfive`, `respostas_disc` e `respostas_formulario` — o PRIMEIRO apagamento de linha da historia deste motor, e a excecao explicita do operador. `scores_raven` e `scores_candidato` FICAM"
  - "nas outras nove origens a linha fica: sentinela nas colunas `NOT NULL`, NULL nas nulaveis, escolha feita POR COLUNA lendo o catalogo vivo"
  - "`cited_evidence` removido CIRURGICAMENTE de `redacoes_candidato.analise_ia -> dimension_scores` e da `metadata` da SJT, preservando `score`/`level`/`dimension`/`reasoning` (ERASE-08)"
  - "`trg_redacao_rh_only_review_fields` ganha a janela `app.motor_exclusao`, ligada e ZERADA pelo motor em volta de UM statement — o passo deixa de depender do papel de quem executa (Correcao 18 / Pitfall 6), e a lista de quinze colunas do trigger continua inteira"
  - "pre-portao que le o CATALOGO VIVO de 20 colunas (tipo + nulidade) e reprova o apply se qualquer uma mudar — o 23514 tardio, que aconteceria depois do Storage apagado, passa a ser reprovado no apply"
  - "`'passos'` e o terminador do dry-run dizem quanto o passo apagou, POR TABELA e nunca somado; `plano_exclusao_titular` conta o mesmo pela MESMA expressao, condicoes `IS NOT NULL` inclusas"
  - "`p45_motor_exclusao_smoke.sql`: 14 fixtures novas, SEIS assercoes (B17..B22), rede estrutural (C3/vi) com onze checagens, contador 30 -> 36, e as quinze tabelas do passo dentro da negativa de residuo — que deixou de provar so «nao poluiu» e passa a provar «nao APAGOU»"
  - "os md5 novos, que sao o PRE-PORTAO de quem editar estes corpos depois: `anonimizar_candidato` = 0d16c0d8185fe9885d4ec823cfa4dd71 (length 75 397 / 77 508 octetos) · `plano_exclusao_titular` = f86cb2b1ae6ae007c8145c18f7797dbd (length 33 074 / 34 299 octetos) · `trg_redacao_rh_only_review_fields` = d54f28e054fc1c038793f01ed2edf524 (length 3 646 / 3 671 octetos, vigiado por FORMA e nao por pin)"
affects: [49-21, 49-19, 49-17, 49-18, 49-28]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4),
# e o MESMO instrumento do 49-14 (octetos da migration + chars das linhas
# acrescentadas ao smoke), para que os dois numeros sejam comparaveis.
actuals:
  tokens: 55244
  tasks: 1
  commits: 1
  plan_head_before: 5cc3e4eb7cda77bf6431f842dc6ed489ef69dad6
  # `commits: 1` = MEDIDO por `git rev-list --count 5cc3e4eb..HEAD` no instante em
  # que este SUMMARY foi escrito (HEAD = 99ef1b35, o commit de codigo). Re-medir
  # DEPOIS deste ponto da um numero MAIOR, e isso NAO e divergencia: os commits de
  # metadado deste plano (o do SUMMARY e o de STATE/ROADMAP) entram no mesmo
  # intervalo por construcao, porque o `plan_head_before` e anterior a eles.
  # Medido no fecho: 3 commits no intervalo — 1 de codigo + 2 de metadado.
  # `tokens: 55244` = (155 292 octetos da migration + 65 686 chars das linhas
  # acrescentadas ao smoke) / 4. A estimativa era 75 000; o realizado e 0,74x —
  # mais perto que o 0,53x do 49-14, e a razao e que o smoke cresceu MUITO mais
  # aqui (840 linhas contra ~370): catorze fixtures novas em tabelas que o arquivo
  # nunca tocou. Os corpos das funcoes, de novo, NAO foram transcritos.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Quando o passo APAGA linha, a assercao que importa nao e «apagou» e sim «apagou SO onde foi autorizado»: extrair do corpo instalado a LISTA de tabelas alvo por regex e compara-la com o conjunto permitido, em vez de asserir presenca tabela por tabela. Presenca nao ve a tabela a MAIS"
    - "Provar que uma rede de escopo morde exige uma mutacao que a FIXTURE NAO PODE VER: apagar linha numa tabela que o Bloco B nao popula (`devolutivas_candidato`) passa por todas as assercoes de pos-estado e e pega SO pela rede estrutural. Uma mutacao que a fixture pega deixa a rede sem prova propria"
    - "`GET DIAGNOSTICS ROW_COUNT` volta a ser honesto numa coluna NULAVEL quando a condicao `IS NOT NULL` entra no PREDICADO em vez de so no `SET`: a linha sem nada a raspar nao e nem visitada, e a MESMA condicao no dry-run faz a previsao bater o executado por construcao"
    - "Sancionar um trigger por GUC exige DUAS assercoes, e a segunda e a que impede o conserto errado: que o motor PASSA (por execucao) e que o MESMO statement FORA da janela ainda e RECUSADO. Desligar o trigger produz o mesmo verde na primeira"
    - "Remocao cirurgica de chave em `jsonb` (`jsonb_set` no caminho + `- 'chave'` por elemento, com `WITH ORDINALITY` para preservar a ordem) em vez de sentinela na coluna: a sentinela passaria pela metade NEGATIVA da assercao e destruiria a prova de que houve avaliacao"
    - "Pre-portao que le o CATALOGO (tipo + nulidade) de cada coluna que o passo escreve, com o esperado como DADO (`VALUES`) e nao como prosa: a divergencia sai NOMEADA, coluna por coluna, em vez de descoberta como 23502/23514 no primeiro pedido real"
    - "A negativa de residuo de um smoke que exercita passo destrutivo deixa de significar «nao poluiu» e passa a significar tambem «nao APAGOU»: as tabelas em que o passo remove linha TEM de entrar na contagem global antes/depois"

key-files:
  created:
    - supabase/migrations/20260922000013_p49_motor_respostas_e_producoes.sql
  modified:
    - supabase/tests/p45_motor_exclusao_smoke.sql

key-decisions:
  - "As quatro tabelas do D-62 foram confirmadas no CATALOGO VIVO antes de escrever o apagamento, e o catalogo deu a justificativa que o plano so supunha: `respostas_raven.resposta` int NOT NULL CHECK 1..8, `respostas_bigfive.resposta` int NOT NULL CHECK 1..5, `respostas_disc` dois `text NOT NULL` com CHECK `= ANY ('D','I','S','C')` E CHECK «os dois diferentes», e `respostas_formulario` com `resposta_preenchida_check` exigindo ao menos uma das tres colunas nao nula. Nas quatro nao existe valor de sentinela que o esquema aceite — e nas outras nove existe, e a linha fica"
  - "O escopo do apagamento e vigiado por EXTRACAO e nao por presenca. O pos-portao e o (C3/vi) extraem do corpo instalado a lista de tabelas alvo e reprovam qualquer uma fora das quatro. Asserir «as quatro estao la» nao veria a QUINTA — e a quinta e a que destroi prova de nao-discriminacao sem volta"
  - "A GUC `app.motor_exclusao` sanciona o trigger em vez de afrouxa-lo, e as duas metades sao asseridas por EXECUCAO. (B21) mede que o motor rasgou `texto`/`analise_ia` sob claims de ADMINISTRADOR; (B22) mede que o MESMO UPDATE fora da janela ainda recusa com P0001. Sem a segunda, «a sancao funciona» e indistinguivel de «o trigger foi esvaziado» — e a mutacao M9 prova que a (B22) morde nesse cenario exato"
  - "`cited_evidence` sai por `jsonb_set` no caminho `{dimension_scores}`, elemento por elemento, com `WITH ORDINALITY` + `ORDER BY` preservando a ORDEM (a posicao no array carrega a dimensao). Sentinela na coluna inteira foi REJEITADA e a rejeicao esta provada: a mutacao M7 faz exatamente isso e a metade positiva da (B19) reprova, nomeando `dimension_scores=0 de 2`"
  - "`ROW_COUNT` continua sendo a contagem, ao contrario do que o 49-14 fez — porque o predicado foi escrito para que VISITADA e RASPADA sejam a mesma linha: ou a tabela tem coluna `NOT NULL` que sempre recebe sentinela, ou a condicao `IS NOT NULL` esta no WHERE. A MESMA condicao entra no dry-run, e por isso as tres fontes da (B20) batem por construcao"
  - "O comprimento das sentinelas NAO virou portao aqui, e a razao esta medida: nenhuma das colunas que recebem sentinela neste passo tem CHECK de tamanho minimo (varredura completa de `pg_constraint` nas 13 tabelas). O portao de tamanho do 49-14 existia por causa de `decisao_final_revisao_justificativa_min_check`, que e daquele passo"
  - "`trg_redacao_rh_only_review_fields` NAO e pinada por md5, e a escolha esta escrita no cabecalho do smoke: e um trigger de UI que outros planos editam legitimamente, e um pin ali reprovaria trabalho correto — a forma de portao que o `CLAUDE.md` cataloga como FOTOGRAFIA. Ela e vigiada por FORMA (a janela existe E a lista de quinze colunas continua inteira)"
  - "As quinze tabelas do passo entraram na negativa de residuo do bloco (z). Nas quatro do D-62 isso deixou de ser higiene: se a subtransacao do Bloco B nao revertesse, as respostas de candidatos REAIS teriam ido junto, sem PITR e sem backup de Storage"
  - "DEZOITO mutacoes, uma inversao por clausula, e SEIS delas em par (`Mn` / `Mnb`) porque o pos-portao da migration falava primeiro e deixava a assercao do smoke *parecendo* provada — a licao M6b/M10b do 49-14 aplicada de proposito, e nao descoberta de novo"
  - "Duas superficies adjacentes foram MEDIDAS e deliberadamente NAO ampliadas: `scores_candidato.metadata->'respostas'` (as escolhas da SJT, 4 de 5 linhas) e os hashes do texto removido. Alargar um passo de mao unica alem do que o operador enumerou nao e conserto de agente — as duas estao em `WINDOWS.md` e vao ao operador pelo 49-21, que vem ANTES de qualquer execucao real"
  - "`main` mantida como branch de trabalho (autorizacao explicita do orquestrador: `git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Nao registrado como desvio"

patterns-established:
  - "Um passo que apaga linha precisa de DUAS assercoes simetricas: o pos-estado zero nas tabelas autorizadas, E o pos-estado PRESERVADO no que deriva delas (o score). Sem a segunda, «as respostas sumiram» e indistinguivel de «o cognitivo foi destruido inteiro»"
  - "Uma mutacao que reprova por um portao ANTERIOR nao prova a assercao que se queria provar. A saida e uma variante que neutraliza o portao anterior de proposito — e registrar as duas, porque a que falhou e a razao de a outra existir"
  - "Uma lista literal de tabelas num portao pode ser ESCOPO DELIBERADO, e a classificacao tem de estar escrita ao lado dela: aqui as treze sao exatamente as origens que o recibo enumera, e uma origem NOVA no recibo TEM de reprovar o portao — e assim que o passo deixa de silenciar uma promessa nova"
  - "Antes de escrever um portao de tamanho de sentinela, VARRER `pg_constraint` das tabelas alvo: o portao do plano anterior pode ter existido por um CHECK que nao existe aqui, e copiar a forma sem o motivo produz cerimonia"

requirements-completed: []

coverage:
  - id: D1
    description: "As quatro tabelas de resposta de multipla escolha do titular deixam de existir (D-62), e os scores calculados a partir delas FICAM"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B17) fixture com 1 linha em cada uma ANTES (nao-vacuidade) e ZERO depois; ⊕ `scores_raven`=1 e `scores_candidato`>=1 continuam"
        status: pass
      - kind: integration
        ref: "mutacao M1 (os corpos ANTERIORES inteiros) ⇒ FAIL (B17) «as respostas de multipla escolha do titular SOBREVIVERAM (raven=1, bigfive=1, disc=1, formulario=1)»"
        status: pass
      - kind: integration
        ref: "mutacao M2/M2b (so os quatro apagamentos desligados) ⇒ POS-PORTAO «as tabelas do D-62 que o motor NAO apaga: as quatro» e, com o pos-portao neutralizado, FAIL (B17)"
        status: pass
      - kind: integration
        ref: "mutacao M3/M3b (escopo vazado para `scores_raven`) ⇒ POS-PORTAO «apaga linha em tabela FORA do D-62: scores_raven» e, neutralizado, FAIL (B17/⊕) «o passo levou junto o SCORE (scores_raven=0)»"
        status: pass
      - kind: other
        ref: "PROD: `pg_get_functiondef(anonimizar_candidato)` apaga linha em exatamente 4 tabelas (lista EXTRAIDA do corpo instalado e comparada com o conjunto permitido); `md5(prosrc)` = 0d16c0d8185fe9885d4ec823cfa4dd71"
        status: pass
    human_judgment: false
  - id: D2
    description: "Nas nove origens em que a linha FICA, cada coluna que o recibo promete esta redigida — sentinela nas `NOT NULL`, NULL nas nulaveis, escolha feita por coluna lendo o catalogo"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B18) nao-vacuidade coluna a coluna (o valor de ANTES carrega o nome do titular sintetico) + pos-estado em `redacoes_candidato.texto`, `redacoes_candidato_em_progresso.texto_em_progresso`, `respostas_cultura.resposta_texto`, `respostas_avaliacao.respostas`, `cognitivo_respostas.raw_responses`/`proctoring`, `entrevistas_online.transcricao`/`feedback_candidato`/`resumo_ia`/`link_videochamada`, `entrevistas_presenciais.documentos_apresentados`, `entrevista_analises.citacoes`, `scores_candidato.citacoes`"
        status: pass
      - kind: integration
        ref: "mutacao M4 (a sentinela de `redacoes_candidato.texto` desligada) ⇒ FAIL (B18/redacoes_candidato.texto), com o valor sobrevivente impresso"
        status: pass
      - kind: integration
        ref: "mutacao M5 (`entrevistas_online` volta a nao ser tocada) ⇒ FAIL (B18/entrevistas_online) nomeando transcricao, feedback e resumo"
        status: pass
      - kind: other
        ref: "pre-portao do apply: 20 colunas conferidas no catalogo vivo (tipo + nulidade) contra o esperado escrito como DADO; a migration aborta se qualquer uma divergir (Pitfall 6)"
        status: pass
    human_judgment: false
  - id: D3
    description: "O trecho LITERAL do que a pessoa escreveu (`cited_evidence`) sai dos DOIS lugares, e o RESTO da analise fica"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B19) zero elementos com `cited_evidence` em `redacoes_candidato.analise_ia` e na `metadata` da SJT; ⊕ 2 de 2 dimensoes com `reasoning` na redacao, 1 de 1 na SJT, `composite_0_25` presente"
        status: pass
      - kind: integration
        ref: "mutacao M6 (o `CASE` cai sempre no ELSE e a analise fica intacta) ⇒ FAIL (B19) «2 elemento(s) em redacoes_candidato.analise_ia»"
        status: pass
      - kind: integration
        ref: "mutacao M7 (`analise_ia` recebe sentinela INTEIRA — a remocao nao-cirurgica) ⇒ FAIL (B19/⊕) «a remocao da citacao levou a ANALISE junto (dimension_scores=0 de 2, com reasoning=0 de 2)»"
        status: pass
    human_judgment: false
  - id: D4
    description: "O passo nao depende do papel de quem executa: sob claims de ADMINISTRADOR o motor rasga `texto`/`analise_ia`, a janela nao vaza, e FORA dela o trigger continua recusando"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B21) as duas colunas vigiadas pelo trigger mudaram sob claims de administrador, e `current_setting('app.motor_exclusao', true)` ficou vazia depois"
        status: pass
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B22) ⊖ CONTROLE — o MESMO UPDATE, as MESMAS claims, FORA da janela: recusado com P0001"
        status: pass
      - kind: integration
        ref: "mutacao M8 (a janela REMOVIDA, pos-portao neutralizado) ⇒ o motor ABORTA no trigger: «RH/admin so pode atualizar campos de revisao», levantado de dentro de `trg_redacao_rh_only_review_fields` — o Pitfall 6 reproduzido por execucao"
        status: pass
      - kind: integration
        ref: "mutacao M8b (a MESMA inversao com o pos-portao intacto) ⇒ POS-PORTAO «a janela app.motor_exclusao nao envolve o UPDATE (abre=0, update=49743, fecha=0)» — aqui quem fala e a FORMA"
        status: pass
      - kind: integration
        ref: "mutacao M9 (o trigger ESVAZIADO em vez de sancionado, a janela mantida) ⇒ FAIL (B22) «devolveu [<NAO RECUSOU>] em vez de P0001»"
        status: pass
    human_judgment: false
  - id: D5
    description: "O dry-run PREVE as treze contagens pela MESMA expressao, e o motor DIZ quanto destruiu"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B20) tres fontes na mesma transacao para cada uma das 13 chaves: a expressao medida a mao antes do tombstone, o `'plano'` que o motor leu no PASSO 0, e o `'passos'` que ele declarou"
        status: pass
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B20/D-62) `linhas_apagadas_d62` = soma das quatro, conferida contra as quatro medidas a mao"
        status: pass
      - kind: integration
        ref: "mutacao M10 (o dry-run perde a chave nova) ⇒ FAIL (B20) «nao aparece no plano (<ausente>)»"
        status: pass
      - kind: integration
        ref: "mutacao M11 (o total declarado conta so `respostas_raven`) ⇒ FAIL (B20/D-62) «o total de linhas apagadas declarado (1) nao bate a soma das quatro»"
        status: pass
      - kind: other
        ref: "pos-portao do apply: exige a chave no motor E no plano, e as condicoes `IS NOT NULL` / o predicado `jsonb_exists(z, 'cited_evidence')` no dry-run"
        status: pass
    human_judgment: false
  - id: D6
    description: "A rede estrutural (C3/vi) cresceu ANTES do re-pin e morde no cenario do re-pin descuidado — inclusive contra uma mutacao que a fixture NAO pode ver"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "mutacao M13/M13b (apagamento de `devolutivas_candidato`, tabela que o Bloco B nao popula, + pin re-carimbado para o corpo mutado) ⇒ POS-PORTAO e, neutralizado, FAIL (C3/vi) «⛔ O MOTOR APAGA LINHA EM TABELA FORA DO D-62: devolutivas_candidato». E a UNICA situacao em que a rede de forma e a primeira a falar"
        status: pass
      - kind: integration
        ref: "mutacao M12/M12b (o passo movido para DEPOIS de `severar_fks_set_null`) ⇒ POS-PORTAO «posicoes 51145/41973» e, neutralizado, FAIL (C3/vi) «nao vem ANTES de severar_fks_set_null»"
        status: pass
      - kind: other
        ref: "onze checagens de forma em (C3/vi), acrescentadas no MESMO commit e ANTES da troca dos dois pins, com a proveniencia escrita no cabecalho do smoke"
        status: pass
    human_judgment: false
  - id: D7
    description: "A migration esta aplicada E escriturada, ENSAIADA antes em requisicao que aborta, e o motor NAO foi executado contra titular real"
    verification:
      - kind: other
        ref: "ledger: 20260922000013 = 4abb5feed288bbfac4d4611949386ff0 (155 292 octetos) — identico ao md5 do disco, lido de volta; `version` nasceu correta (nenhum reparo)"
        status: pass
      - kind: other
        ref: "sonda de forma (a migration sozinha + `RAISE 'SONDA_MIGRATION_OK'`) e ensaio (migration + smoke ampliado + `RAISE 'ENSAIO_OK'`), UMA requisicao cada, as duas abortaram no marcador e sem `FAIL`; `md5(prosrc)` vivo continuava o ANTIGO depois dos dois"
        status: pass
      - kind: other
        ref: "estado de PROD depois de tudo: `respostas_raven` 60, `respostas_formulario` 115, `respostas_avaliacao` 10, `redacoes_candidato` 2 (2 AINDA com `cited_evidence`), `entrevista_analises` com 6 `citacoes`, `scores_raven` 1, `scores_candidato` 15, `candidatos` 44, `config_purga.modo = dry_run`. Nada mutado — toda escrita do smoke e das 18 mutacoes viveu em requisicao que aborta"
        status: pass
      - kind: other
        ref: "`npm run -s lint` = 89 erros (teto D-53 = 90). Este plano nao toca `src/` nem `supabase/functions/`"
        status: pass
    human_judgment: false
  - id: D8
    description: "A purga automatica estava em ENSAIO no instante do apply — nenhum titular real passa pelo passo que APAGA LINHA antes do checkpoint do 49-19 (D-54)"
    verification:
      - kind: other
        ref: "`config_purga.modo = 'dry_run'` lido so leitura antes de escrever uma linha, e relido depois de tudo. O pre-portao da migration ABORTA o apply se o modo nao for `dry_run`, com a mensagem dizendo que o passo novo apaga linha"
        status: pass
    human_judgment: false
  - id: D9
    description: "O smoke fecha 36/36 com o contador LIDO, e o `p46_purga_smoke` fecha 27/27 sobre os corpos novos"
    verification:
      - kind: integration
        ref: "`p45_motor_exclusao_smoke` com um `RAISE` de leitura do contador no fim: `P45=36` — depois do apply. E `CONTADOR=36` ja no ensaio, antes dele"
        status: pass
      - kind: integration
        ref: "`p46_purga_smoke` = `P46P_REG_CONTADOR=27` (gate cheio), com a fixture-seed do 46-01 devolvida a `ativa` DENTRO da requisicao que aborta. No `run` puro ele reprova em (j.2) por estado alheio — ver «Registrado, nao consertado»"
        status: pass
      - kind: integration
        ref: "a assercao (b) do `p46_purga_smoke` roda o motor em `dry_run` sobre os titulares REAIS elegiveis: o passo novo executou contra 60 respostas de Raven e 115 de formulario reais e foi revertido, o que e a prova mais forte disponivel de que ele nao aborta em dado de verdade (Pitfall 6)"
        status: pass
    human_judgment: false

# Metrics
duration: 45 min
completed: 2026-09-23
status: complete
---

# Phase 49 Plano 20: O motor apaga as respostas, os textos, as transcrições e as citações Summary

**Excluir um titular passa a apagar o que o recibo sempre disse que apagava — as respostas das avaliações (nas quatro tabelas de múltipla escolha, apagando a LINHA, porque os CHECKs delas não aceitam sentinela: é o primeiro apagamento de linha da história deste motor e a exceção explícita do operador), os textos, os rascunhos, as transcrições, o link da sala, os documentos apresentados e os trechos literais citados pela IA — sem depender do papel de quem executa, com o escopo do apagamento vigiado por EXTRAÇÃO da lista de tabelas do corpo instalado, e com a mordida provada por dezoito inversões, seis delas em par porque o portão do apply falava antes do smoke.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-09-23T14:59:00Z
- **Completed:** 2026-09-23T15:44:00Z
- **Tasks:** 1 / 1
- **Files:** 2 (1 criado, 1 modificado)

## A precondição, lida antes de escrever uma linha

| O que o plano exige | Medido em PROD (2026-09-23, só leitura) | Bate? |
|---|---|---|
| purga automática em ensaio | **`config_purga.modo = 'dry_run'`** | sim |
| `md5(prosrc)` de `anonimizar_candidato` = `6ab2890e…` | **`6ab2890ebfc87fbd489215579bf1d9f8`**, length 54 807 | sim |
| `md5(prosrc)` de `plano_exclusao_titular` = `12bfca3b…` | **`12bfca3bf936704f1bc581acd5061df3`**, length 28 413 | sim |
| (medido a mais) `trg_redacao_rh_only_review_fields` | **`84d5552315a513cbea378ff94de20fb6`**, length 1 483 | pinado aqui |
| os corpos do ARQUIVO são byte a byte os vivos | extraídos de `20260922000012` e `20260623100003`: md5 **idênticos** aos três vivos (conferência CRUZADA) | sim |

⚠ A precondição não ficou só lida: ela virou **pré-portão da migration**, e a mensagem dele
diz por que pesa mais neste plano que no 49-14 — o cron `purga-retencao-sweep` dispara toda
noite, chama este motor, e o passo que está sendo instalado **apaga linha**.

## Passo 1 — a tabela «origem → ação → asserção», re-executada contra o catálogo vivo

O 49-14 deixou os itens **1** e **5** da C4 abertos e mediu `respostas_raven` e
`cited_evidence` **ausentes** do corpo vivo. As 14 origens do item `respostas_e_producoes`
(`gen-recibo-exclusao.cjs:293-317`), com a ação decidida **lendo o catálogo** e a asserção
que a vigia:

| # | Origem | Catálogo vivo | Ação | Asserção |
|---|---|---|---|---|
| 1 | `redacoes_candidato.texto` | `text NOT NULL` | sentinela | (B18) |
| — | `redacoes_candidato.analise_ia` | `jsonb` NULÁVEL | `cited_evidence` fora, resto fica | (B19) |
| 2 | `redacoes_candidato_em_progresso.texto_em_progresso` | `text` NULÁVEL | NULL | (B18) |
| 3 | `respostas_cultura.resposta_texto` | `text NOT NULL` | sentinela | (B18) |
| 4 | `respostas_formulario` | `resposta_preenchida_check` | **DELETE** (D-62) | (B17) |
| 5 | `respostas_bigfive.resposta` | `int NOT NULL` CHECK 1..5 | **DELETE** (D-62) | (B17) |
| 6 | `respostas_disc.mais/menos_caracteristico` | `text NOT NULL` CHECK D/I/S/C + «diferentes» | **DELETE** (D-62) | (B17) |
| 7 | `respostas_raven.resposta` | `int NOT NULL` CHECK 1..8 | **DELETE** (D-62) | (B17) |
| 8 | `respostas_avaliacao.respostas` | `jsonb NOT NULL` | sentinela jsonb | (B18) |
| 9 | `cognitivo_respostas.raw_responses` / `proctoring` | `jsonb NOT NULL` × 2 | sentinela jsonb | (B18) |
| 10 | `entrevistas_online.transcricao`/`feedback_candidato`/`resumo_ia` | `text` NULÁVEL × 3 | NULL | (B18) |
| — | `entrevistas_online.link_videochamada` | `text NOT NULL` | sentinela | (B18) |
| 11 | `entrevistas_presenciais.documentos_apresentados` | `jsonb` NULÁVEL | NULL | (B18) |
| 12 | `entrevista_analises.citacoes` | `jsonb` NULÁVEL | NULL | (B18) |
| 13 | `scores_candidato.citacoes` | `jsonb` NULÁVEL | NULL | (B18) |
| — | `scores_candidato.metadata` (SJT) | `jsonb NOT NULL` | `cited_evidence` fora, resto fica | (B19) |
| 14 | `devolutivas_candidato.conteudo_jsonb` | — | **não entra**: morre por FK CASCADE no `auth_delete_user` (Correção 15) | já coberta |

⚠ **O catálogo deu a justificativa que o plano só supunha.** O `resposta_preenchida_check`
de `respostas_formulario` (ao menos uma das três colunas de resposta não nula) e o
`respostas_disc_diferente_check` (as duas letras diferentes entre si) não estavam escritos
em lugar nenhum do plano — e são exatamente o que torna a sentinela **impossível** naquelas
tabelas. A decisão do operador (D-62) não foi herdada: foi **reconfirmada por medição**.

⚠ **E uma medição que mudou o desenho do portão.** O 49-14 transformou o comprimento da
sentinela em portão de apply porque `decisao_final` tem um CHECK de tamanho mínimo. Varri
`pg_constraint` nas 13 tabelas deste passo: **nenhuma coluna que recebe sentinela aqui tem
CHECK de tamanho**. Copiar aquele portão para cá seria cerimônia — uma forma sem o motivo.
O que *existe* aqui e foi conferido: `redacoes_candidato_word_count_check` (200..500) e os
dois `data_futura_check` das entrevistas são re-avaliados em todo UPDATE, então medi as
linhas violadoras em PROD antes de escrever: **zero nas três, todas as constraints
`convalidated`**. Nenhum trigger recalcula `word_count` a partir de `texto` (varredura de
`pg_trigger` nas 13 tabelas) — se houvesse, a sentinela curta derrubaria o CHECK.

## Passo 1 — varredura de portões pela FORMA (`CLAUDE.md` §«Portões»)

Padrão do `CLAUDE.md` sobre `supabase/tests/*.sql`: **311 achados** (o número que o 49-14
deixou). Filtrando pelos que citam qualquer das 13 tabelas de origem ou
`trg_redacao_rh_only_review_fields`: **ZERO**. Nenhum portão existente vigiava estas tabelas
— e o `p45_motor_exclusao_smoke` não as mencionava em nenhuma linha antes deste plano.

As formas que **eu acrescentei** e a classificação de cada uma:

| Forma nova | Classificação |
|---|---|
| lista literal das 4 tabelas do D-62 (`v_rp_permit`) | **escopo deliberado** — é a autorização do operador escrita como dado; ela é usada como conjunto PERMITIDO (o portão reprova o que está FORA), então uma tabela nova não passa em silêncio |
| lista literal das 13 origens (`v_rp_treze`) | **escopo deliberado, e declarado no comentário ao lado** — são exatamente as origens que o recibo enumera. Uma origem NOVA no recibo TEM de reprovar: é assim que o passo deixa de silenciar uma promessa nova |
| `v_rp_ini > v_rp_fim`, `v_rp_guc1 < v_rp_upd < v_rp_guc0` | comparação de POSIÇÃO entre dois achados da própria execução — não é contagem contra constante |
| `v_d62_*_d <> 0`, `v_scr_raven_d <> 1` | contagem contra constante, mas sobre uma **fixture criada na própria execução** — não é fotografia de PROD |
| contador `36` | escopo deliberado, com o bump registrado em TRÊS lugares (ver a deviation 3) |

⚠ **A lista de 4 é usada ao contrário da forma-armadilha, e isso é o ponto.** O
`CLAUDE.md` alerta que `proname IN ('a','b')` deixa o objeto novo **fora da vigilância**.
Aqui a lista é o conjunto **permitido** e a asserção é sobre o **complemento**: a tabela
nova cai em `v_rp_fora` e reprova. A mutação **M13** prova isso por execução.

## Task Commits

1. **Task 1 (tracer): o passo `apagar_respostas_e_producoes`** — `99ef1b35` (feat)

**Ledger de PROD:**

| version | name | md5 do arquivo | md5 do ledger | octetos |
|---|---|---|---|---|
| 20260922000013 | p49_motor_respostas_e_producoes | `4abb5feed288bbfac4d4611949386ff0` | `4abb5feed288bbfac4d4611949386ff0` | 155 292 |

A `version` nasceu correta (nenhum reparo de ledger). O md5 do ledger foi **lido de volta**
e conferido, porque «aplicado» e «escriturado» são afirmações diferentes.

## md5 — antes e depois (⚠ os pins novos do smoke saem daqui)

| Objeto | Antes do apply | Depois (vivo) |
|---|---|---|
| `anonimizar_candidato(uuid,boolean)` | `6ab2890ebfc87fbd489215579bf1d9f8` (54 807 / 56 226 octetos) | **`0d16c0d8185fe9885d4ec823cfa4dd71`** (**75 397** / 77 508) |
| `plano_exclusao_titular(uuid)` | `12bfca3bf936704f1bc581acd5061df3` (28 413 / 29 603) | **`f86cb2b1ae6ae007c8145c18f7797dbd`** (**33 074** / 34 299) |
| `trg_redacao_rh_only_review_fields()` | `84d5552315a513cbea378ff94de20fb6` (1 483) | **`d54f28e054fc1c038793f01ed2edf524`** (**3 646** / 3 671) — vigiado por FORMA, não pinado |
| pins do `p45_motor_exclusao_smoke` (C3/i) | os dois do 49-14 | **os dois novos, re-pinados no MESMO commit, com a rede (C3/vi) crescida ANTES** |
| contador do RESUMO (z) | 30 | **36** |
| ACL das duas funções do titular | `service_role` + `authenticated` | **idêntico** (reemitido de propósito: `pg_default_acl` deste schema concede a `anon` como grant DIRETO) |

⚠ Os três valores «depois» foram **previstos do arquivo** (md5 do corpo montado) antes do
apply, para que os pins do smoke pudessem ser trocados e o ensaio rodasse com eles — e
depois **conferidos contra o catálogo**. Os três bateram exatamente. Não é redundância: é a
diferença entre um pin calculado e um pin carimbado.

## Ensaio ANTES do apply

| Ensaio | Conteúdo (uma requisição, que aborta) | Resultado |
|---|---|---|
| sonda de forma | a migration sozinha + `RAISE 'SONDA_MIGRATION_OK'` | abortou em `SONDA_MIGRATION_OK` — os dois portões passaram e o PL/pgSQL compila |
| ensaio 1 | `…000013` + `p45_motor_exclusao_smoke` ampliado + `RAISE 'ENSAIO_OK'` | abortou em **`ENSAIO_OK`**, sem `FAIL` |
| ensaio 1b | o mesmo, com o `RAISE` LENDO o contador | **`CONTADOR=36 (esperado 36)`** — medido, não inferido de «não levantou» |
| conferência | `md5(prosrc)` lido DEPOIS dos ensaios | ainda o ANTIGO — **os ensaios não vazaram** |

## O portão morde (medido nesta sessão) — DEZOITO inversões

Uma inversão por cláusula, cada uma em requisição atômica que **aborta**. O marcador
`MUTACAO_TERMINOU` é o que apareceria se o portão **não** mordesse: **nenhuma das dezoito
chegou a ele**.

| Mutação | Inversão | Saída (abreviada) |
|---|---|---|
| **M1** | os corpos ANTERIORES inteiros (a inversão que o plano pede) | `P45M FAIL (B17): as respostas de multipla escolha do titular SOBREVIVERAM ao tombstone (raven=1, bigfive=1, disc=1, formulario=1)` |
| **M2** | só os quatro apagamentos desligados | `P49-20 POS-PORTAO: as tabelas do D-62 que o motor NAO apaga: respostas_raven, respostas_bigfive, respostas_disc, respostas_formulario` |
| **M2b** | idem, **pós-portão neutralizado** | `P45M FAIL (B17)` — a asserção do smoke falando por si |
| **M3** | escopo VAZADO: apaga também `scores_raven` | `P49-20 POS-PORTAO: o motor apaga linha em tabela FORA do D-62: scores_raven` |
| **M3b** | idem, **pós-portão neutralizado** | `P45M FAIL (B17/⊕): o passo levou junto o SCORE (scores_raven=0, scores_candidato=1)` |
| **M4** | a sentinela de `redacoes_candidato.texto` desligada | `P45M FAIL (B18/redacoes_candidato.texto): o texto que a pessoa escreveu SOBREVIVEU (depois=SMOKE P45 fixture (redacao): o texto que SMOKE P45 Titular Sintetico escreveu, c…)` |
| **M5** | `entrevistas_online` volta a não ser tocada | `P45M FAIL (B18/entrevistas_online): a transcricao, o feedback ou o resumo sobreviveram` |
| **M6** | `cited_evidence` deixa de sair da redação (o `CASE` cai sempre no ELSE) | `P45M FAIL (B19): o trecho LITERAL … sobreviveu (2 elemento(s) em redacoes_candidato.analise_ia, 0 na metadata da SJT)` |
| **M7** | remoção NÃO-cirúrgica: `analise_ia` recebe sentinela inteira | `P45M FAIL (B19/⊕): a remocao da citacao levou a ANALISE junto (dimension_scores da redacao=0 de 2, com reasoning=0 de 2)` |
| **M8** | a janela `app.motor_exclusao` REMOVIDA (pós-portão neutralizado) | `P0001: RH/admin so pode atualizar campos de revisao …` levantado de dentro de **`trg_redacao_rh_only_review_fields`** — o **Pitfall 6 reproduzido por execução**: o motor aborta no meio |
| **M8b** | a MESMA inversão com o pós-portão intacto | `P49-20 POS-PORTAO: a janela app.motor_exclusao nao envolve o UPDATE (abre=0, update=49743, fecha=0)` |
| **M9** | o trigger **ESVAZIADO** em vez de sancionado (a janela fica) | `P45M FAIL (B22): fora da janela … devolveu [<NAO RECUSOU>] em vez de P0001` |
| **M10** | o dry-run perde a chave nova | `P45M FAIL (B20): o passo … nao aparece no plano (<ausente>)` |
| **M11** | o total declarado conta só `respostas_raven` | `P45M FAIL (B20/D-62): o total de linhas apagadas declarado (1) nao bate a soma das quatro` |
| **M12** | o passo movido para DEPOIS de `severar_fks_set_null` | `P49-20 POS-PORTAO: o passo novo NAO vem antes de severar_fks_set_null (posicoes 51145/41973)` |
| **M12b** | idem, **pós-portão neutralizado** | `P45M FAIL (C3/vi): … nao vem ANTES de severar_fks_set_null (posicoes 50950/41778)` |
| **M13** | apagamento de `devolutivas_candidato` + pin re-carimbado | `P49-20 POS-PORTAO: o motor apaga linha em tabela FORA do D-62: devolutivas_candidato` |
| **M13b** | idem, **pós-portão neutralizado** | `P45M FAIL (C3/vi): ⛔ O MOTOR APAGA LINHA EM TABELA FORA DO D-62: devolutivas_candidato` |

### Três honestidades sobre as mutações, e as três geraram trabalho

1. **Seis mutações reprovaram pelo portão do APPLY, não pela asserção do smoke** (M2, M3,
   M7, M12, M13 e, na direção oposta, M8). Isso é a lição M6b/M10b do 49-14 acontecendo de
   novo, e desta vez eu a esperava: um portão anterior que fala primeiro deixa a asserção
   pretendida **parecendo provada**. As variantes `Mnb` neutralizam o pós-portão da
   migration de propósito, para que o smoke seja quem reprova. As duas saídas estão na
   tabela porque as duas são informação: a forma é pega no apply, e o comportamento é pego
   no smoke.
2. **`M13` é a mutação que só a rede estrutural pode pegar, e foi desenhada assim.** Ela
   apaga linha em `devolutivas_candidato` — uma tabela que a fixture do Bloco B **não
   popula**. Todas as asserções de pós-estado passam (zero linhas do titular lá), o pin foi
   re-carimbado para o corpo mutado, e a única coisa que a reprova é a extração da lista de
   alvos. É o argumento de D-46-18 obrigação 4 fechado por execução para um **apagamento**,
   e não apenas para uma raspagem.
3. **Duas mutações minhas eram defeito de INSTRUMENTO, e eu medi antes de concluir**
   (PATTERNS §L). A primeira versão de `M6` escrevia `jsonb + jsonb` (operador que não
   existe) e a de `M7` jogava um array em `status_analise` (que tem CHECK): as duas
   abortaram com `42883` e `23514` — erros do meu SQL de mutação, **não** veredito sobre o
   portão. A primeira versão de `M12` removia o próprio guard de ordem do pós-portão e o
   `substr` seguinte estourava com `22011`. Nos três casos a conclusão correta era «o
   instrumento está quebrado», e as três foram reescritas antes de qualquer afirmação. Um
   harness que falha em silêncio produz a conclusão **oposta** à verdade.

**Nenhuma mutação vazou:** depois das dezoito, `md5(prosrc)` de `anonimizar_candidato` era
ainda `6ab2890e…` e do trigger `84d5552e…` (os de ANTES do apply — as mutações rodaram
todas antes dele); `respostas_raven` 60, `respostas_formulario` 115, `redacoes_candidato` 2,
`scores_raven` 1, `devolutivas_candidato` 3, `perguntas_cultura` 0, `config_purga.modo =
dry_run`.

## Regressão em PROD (depois do apply)

| Smoke / prova | Como | Resultado |
|---|---|---|
| `p45_motor_exclusao_smoke.sql` | `run` puro | verde (sem exceção) |
| `p45_motor_exclusao_smoke.sql` | `run` com `RAISE` de leitura do contador | **`P45=36 (esperado 36)`** |
| `p46_purga_smoke.sql` | `run` puro | **FAIL (j.2)** — ⚠ alheia, ver abaixo |
| `p46_purga_smoke.sql` | com a fixture-seed do 46-01 devolvida a `ativa` DENTRO da requisição que aborta | **`P46P_REG_CONTADOR=27`** (gate cheio) |
| estado de PROD | relido coluna a coluna depois de tudo | intacto (tabela em D7 do `coverage`) |
| `npm run -s lint` | | **89** erros (teto D-53 = 90; margem de um preservada) |

### ⚠ A prova mais forte deste plano é a asserção `(b)` do `p46_purga_smoke`, e ela é acidental

A `(b)` chama `anonimizar_candidato(id, true)` **para todos os titulares elegíveis reais** e
termina em `P45DR`, revertendo. Ou seja: depois do apply, o passo novo **executou contra 60
respostas de Raven, 115 de formulário, 10 de avaliação, 2 redações com `analise_ia` real e 6
análises de entrevista de pessoas REAIS**, e voltou atrás. Nenhum `NOT NULL`, nenhum CHECK e
nenhum trigger abortou. É a medição que o Pitfall 6 pede e que nenhuma fixture sintética
consegue dar — e ela roda **antes** da (j.2) no arquivo, então estava verde no `run` puro.

### ⚠ A FAIL do `p46_purga_smoke` (j.2) é alheia e já estava registrada

```
P46P FAIL (j.2): ⊖ NAO-VACUIDADE — a vaga 4601d000-0000-4000-8000-000000000003 da
candidatura 4601c000-0000-4000-8000-000000000006 esta em status [arquivada] (esperado ativa)
```

A vaga é a fixture-seed `fixture-p46 vaga ativa (sintetica)`, `arquivada` desde
**2026-08-23 17:47** — um mês antes deste plano. Está em `WINDOWS.md` **67** e **75**, a
segunda registrando que o **operador RECUSOU** abrir a vaga e que o conserto é do plano
**49-28**. O 49-14 já mediu que a FAIL é idêntica com os corpos anteriores. Não repeti essa
medição: ela já existe, e repeti-la não acrescentaria informação — mas medi o gate cheio
(27/27) com a vaga devolvida a `ativa` **dentro da requisição que aborta**, porque a (j.2)
bloqueia `(o)`, `(o.6)`, `(o.7)` e `(p)`, que são justamente as que exercitam o 4º ramo do
guard da função que eu reescrevi. A vaga continua `arquivada` em PROD (relida depois: sim).

## Deviations from Plan

### Registradas

**1. [Rule 2 — funcionalidade crítica ausente] As quinze tabelas do passo entraram na negativa de resíduo do bloco (z)**
- **Found during:** Task 1, Passo 3
- **Issue:** a metade de resíduo do `(z)` enumerava 13 tabelas e provava «o smoke não
  poluiu PROD». Com o passo novo, o smoke passa a **apagar linha** em quatro tabelas dentro
  da subtransação. Se o envelope falhasse em reverter, as respostas de candidatos **reais**
  teriam ido junto — sem PITR e sem backup de Storage — e o `(z)` não teria como notar,
  porque nenhuma daquelas tabelas estava na lista.
- **Fix:** as quinze tabelas do passo (as 13 origens + `scores_raven` + `perguntas_cultura`)
  ganharam baseline global no bloco `BASELINE` e entraram no laço do `(z)`. A negativa
  passou a significar também «não APAGOU», e o comentário ao lado diz isso.
- **Files modified:** `supabase/tests/p45_motor_exclusao_smoke.sql`
- **Verification:** o smoke fecha 36/36 e o `(z)` compara 28 tabelas; o estado de PROD foi
  relido tabela a tabela depois de tudo e está intacto
- **Committed in:** `99ef1b35`

**2. [Escopo — ampliação deliberada] DEZOITO mutações em vez de uma, seis delas em par**
- **Found during:** Task 1, Passo 4
- **Issue:** o plano pede UMA prova de mordida (os corpos anteriores + o smoke). Com um
  smoke fail-fast, as outras cinco asserções novas e as onze cláusulas da rede (C3/vi)
  ficariam sem prova própria. E seis inversões «óbvias» reprovaram pelo **pós-portão da
  migration**, que fala antes do smoke.
- **Fix:** dezoito inversões — uma por cláusula, com as variantes `Mnb` neutralizando o
  pós-portão de propósito, e a `M13` desenhada para ser invisível à fixture (a única forma
  de a rede estrutural ser a primeira a falar sobre um apagamento).
- **Files modified:** nenhum (as mutações vivem no scratchpad; nunca no repositório)
- **Verification:** ver «O portão morde»; nenhuma chegou a `MUTACAO_TERMINOU`
- **Committed in:** n/a (prova de sessão)

**3. [Rule 2 — registro desatualizado] O cabeçalho do smoke dizia «gate de contagem FIXO em 25» quando o gate já era 30**
- **Found during:** Task 1, Passo 3
- **Issue:** o número do contador vive em **três** lugares do arquivo (o «GATE VERDE» do
  topo, a descrição do `(z)` na lista de asserções, e o `v_esperado` que MANDA). O 49-14
  bumpou dois e deixou o terceiro em 25 — cinco a menos que o valor real. Num arquivo que se
  declara «a ESPECIFICAÇÃO do motor», um registro desatualizado custa o mesmo que registro
  ausente, e custa mais, porque vem com autoridade (é a lição que o próprio `CLAUDE.md`
  deste projeto abre dizendo).
- **Fix:** os três lugares agora dizem 36, com o histórico (25 → 30 → 36) escrito, e a linha
  corrigida registra **por que** ela envelheceu, para que o próximo bump não perca o mesmo
  lugar. A afirmação retirada foi **descrita, não reproduzida** (PATTERNS §K).
- **Files modified:** `supabase/tests/p45_motor_exclusao_smoke.sql`
- **Verification:** `P45=36` lido por execução; o `(z)` reprovaria em qualquer outro valor
- **Committed in:** `99ef1b35`

**4. [Rule 2 — funcionalidade crítica ausente] O pré-portão do catálogo cobre 20 colunas, incluindo as quatro do D-62**
- **Found during:** Task 1, Passo 2
- **Issue:** o plano pede um `DO` de auto-verificação que aborte «se alguma coluna mudar de
  nulidade/tipo». Escrito só para as colunas que **recebem sentinela**, ele deixaria de
  fora exatamente a pergunta que a decisão de mão única depende: *as quatro tabelas do D-62
  continuam sem aceitar sentinela?* Se alguém afrouxar `respostas_raven.resposta` para
  nulável, apagar a linha deixa de ser a única saída — e o motor continuaria apagando.
- **Fix:** a tabela do pré-portão inclui as quatro colunas de resposta do D-62, e a mensagem
  de erro diz com todas as letras que, se uma delas passou a aceitar sentinela, a decisão do
  operador tem de ser **RE-FEITA e não herdada**.
- **Files modified:** `supabase/migrations/20260922000013_p49_motor_respostas_e_producoes.sql`
- **Verification:** o pré-portão passou no apply («20 colunas conferidas no catalogo»); a
  forma é `VALUES` comparado com `pg_attribute`, então a divergência sai nomeada
- **Committed in:** `99ef1b35`

**5. [Processo] O portão de comprimento de sentinela do 49-14 NÃO foi copiado, e a ausência foi medida**
- **Found during:** Task 1, Passo 2
- **Issue:** o instinto era repetir o pós-portão do 49-14 que lê o mínimo de um CHECK vivo e
  compara com o comprimento da sentinela. Copiar a forma sem o motivo produziria cerimônia.
- **Fix:** varredura completa de `pg_constraint` nas 13 tabelas: **nenhuma** coluna que
  recebe sentinela neste passo tem CHECK de tamanho. O que existe e foi conferido em vez
  disso: as três constraints re-avaliadas em todo UPDATE (`word_count` 200..500 e os dois
  `data_agendada > created_at`) têm **zero linhas violadoras** e estão todas
  `convalidated`; e **nenhum trigger** recalcula `word_count` a partir de `texto`.
- **Files modified:** nenhum (a decisão é de não-escrita, e está registrada aqui e no
  cabeçalho da migration)
- **Verification:** o apply passou; o smoke escreve a sentinela em `redacoes_candidato.texto`
  numa linha com `word_count = 250` e nenhum CHECK reprova
- **Committed in:** n/a (medição)

**6. [Registro] `trg_redacao_rh_only_review_fields` foi editada mas NÃO pinada por md5**
- **Found during:** Task 1, Passo 3
- **Issue:** o plano manda pinar «o de `trg_redacao_rh_only_review_fields`» no pré-portão da
  migration (feito: `84d5552e…`), mas não diz nada sobre o `(C3)` do smoke. Pinar ali um
  trigger de UI que outros planos editam legitimamente criaria um portão-fotografia, que
  reprovaria trabalho correto.
- **Fix:** no pré-portão da migration ele **é** pinado (a edição parte de uma cópia
  conferida); no smoke ele é vigiado por **FORMA** em `(C3/vi)` — a janela existe, a lista
  de quinze colunas continua inteira, e a leitura usa `missing_ok = true`. A escolha e a
  razão estão escritas no cabeçalho do smoke.
- **Files modified:** os dois arquivos do plano
- **Verification:** mutação **M9** (trigger esvaziado) reprova em (B22) por execução, e
  `(C3/vi)` reprovaria por forma se a lista de colunas sumisse
- **Committed in:** `99ef1b35`

---

**Total deviations:** 6 (3 da Regra 2, 1 ampliação deliberada de escopo, 2 de
processo/registro). **O estado vivo medido bateu integralmente com o que o plano assume** —
os dois md5 do pré-portão, a purga em `dry_run`, e as 14 origens do recibo. O que o plano
**não** previa e a medição trouxe: os dois CHECKs que justificam o D-62 (`resposta_preenchida_check`
e `respostas_disc_diferente_check`), a ausência de CHECK de tamanho nestas tabelas, e o fato
de `perguntas_cultura` estar em zero linhas (a fixture teve de criar a pergunta também).
**Impact on plan:** o artefato é mais forte que o pedido (6 asserções + 11 cláusulas de rede
em vez de «uma por coluna», 18 mutações em vez de 1, o pré-portão de catálogo cobrindo as
colunas do D-62, e as 15 tabelas na negativa de resíduo). Nada aplicado em PROD além do que
o plano especifica.

## Registrado, não consertado

- **⚠ `scores_candidato.metadata->'respostas'` sobrevive, e é a primeira linha para o
  operador.** Medido: 4 das 5 linhas `sjt` carregam as escolhas da SJT
  (`opcao_id`/`pergunta_id`/`peso`). O recibo promete, no item `respostas_e_producoes`, que
  «as suas respostas das avaliações foram apagadas», e a **Correção 14 rejeitou
  explicitamente** a opção (c) («as alternativas que você marcou ficam»). O conserto é
  cirúrgico e da mesma classe do `cited_evidence` (`metadata - 'respostas'`, a linha fica),
  mas alargar o escopo de um passo de mão única além do que o operador enumerou **não é
  conserto de agente** — e a migration já está aplicada e escriturada, então editá-la faria
  o md5 divergir do ledger. Registrado em `WINDOWS.md` como `unmet-truth`; vai ao operador
  pelo **49-21**, que vem ANTES de qualquer execução real (49-19).
- **Resumos do texto removido sobrevivem:** `redacoes_candidato.texto_hash` (`NOT NULL`, 2
  linhas) e `input_hash`, e `entrevista_analises.texto_hash` (5 linhas). Não são o texto e
  não estão entre as 14 origens do recibo, mas permitem **confirmar** um texto adivinhado
  depois de o original ter sido apagado. Registrado em `WINDOWS.md` como `unmet-truth`.
- **`entrevistas_online.analise_ia`** (jsonb nulável) não está entre as origens do recibo e
  está em **zero linhas** hoje. Se um dia for populada, cai na mesma família do
  `cited_evidence`. Não tocada.
- **`redacoes_candidato.analise_ia -> dimension_scores[].reasoning` fica, e ele parafraseia
  o texto.** Medido: o `reasoning` real em PROD cita trechos entre aspas («o que a incomodava
  de fato»). Removê-lo destruiria a prova de que houve avaliação revisável (ERASE-08 /
  RNF-07a), e o recibo não o promete. A decisão de preservá-lo é **asserida** pela metade ⊕
  da (B19) — ou seja, é escolha declarada e vigiada, não omissão.
- **`p46_purga_smoke` (j.2)** reprova por estado de fixture-seed alheio. Já em `WINDOWS.md`
  **67** e **75**; conserto é do plano **49-28**, e o operador já recusou abrir a vaga.
- **O recibo e o inventário ainda não apontam este passo:** o item `respostas_e_producoes`
  declara `passo_motor: 'tombstone_candidato'`, e `PASSOS_MOTOR`
  (`_shared/reciboExclusao.ts:23-31`) não conhece `apagar_respostas_e_producoes`. É o plano
  **49-21**. A direção do desalinhamento é a segura: o recibo diz MENOS do que o motor apaga.
- **O item 6 da C4 do 49-14** (`tabelas_sem_pii_titular` afirmando que
  `analise_candidato_vaga` e `entrevista_guias` estão «sem PII») segue aberto — defeito de
  inventário pré-existente, fora do escopo do motor.
- **`resend-webhook.test.ts`** (`npm:svix@1.99.1`) e **`_shared/__tests__/strict-schema.test.ts:88`**
  continuam quebrados. Pré-existentes, já em `WINDOWS.md`, e fora de escopo: este plano não
  roda nenhum teste Deno (é SQL puro). **Não foram «consertados».**
- **`p43_previa_smoke.sql:667`** segue usando a forma de lista literal (`proname IN (...)`)
  que o `CLAUDE.md` nomeia como ponto cego. Fora do escopo desta fase.

## Known Stubs

Nenhum. O plano produz DDL aplicado em PROD e SQL de teste: não há componente, valor vazio
codificado, texto de placeholder nem fonte de dados não ligada. As **sentinelas não são
placeholders** — são os valores finais que o motor grava. A `'nota'` textual dentro de
`'passos'` e do `'plano'` **também não é placeholder**: é o registro, legível pelo auditor,
de por que quatro daqueles números são linhas apagadas e não linhas atualizadas.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. O plano **remove**
superfície de dados (treze origens passam a ser apagadas ou redigidas) e acrescenta **uma**
superfície de autorização — a GUC `app.motor_exclusao` —, que o próprio `<threat_model>`
classifica como `accept` (T-49-20-05) com o mesmo pressuposto de `app.rejeicao_sancionada`.
As cinco mitigações declaradas ficaram provadas por execução:

| Threat | Disposição | Prova em PROD |
|---|---|---|
| T-49-20-01 (texto/transcrição/citação sobrevivendo) | mitigate | (B18) coluna a coluna + (B19) nas duas metades; mutações M4, M5, M6, M7 reprovam |
| T-49-20-02 (`DELETE` além do escopo decidido) | mitigate | pós-portão e (C3/vi) EXTRAEM a lista de alvos do corpo instalado e reprovam o que está fora; mutações M3/M3b (score) e M13/M13b (tabela invisível à fixture) reprovam nomeando a tabela |
| T-49-20-03 (passo abortando depois do Storage) | mitigate | pré-portão com 20 colunas do catálogo; janela `app.motor_exclusao`; (B21) sob claims de administrador; e a asserção `(b)` do `p46_purga_smoke` rodando o passo contra dado REAL e revertendo |
| T-49-20-04 (re-pin sem rede estrutural) | mitigate | (C3/vi) com 11 cláusulas, crescida ANTES do re-pin no MESMO commit; proveniência no cabeçalho; **M13b** prova que a rede morde no cenário do re-pin |
| T-49-20-05 (cliente ligando a GUC) | accept | a GUC é zerada na linha seguinte ao UPDATE, e (B21) assere que ela está vazia depois; (B22) assere que sem ela o portão ainda morde |
| T-49-20-SC (supply chain) | mitigate | zero instalação de pacote; só SQL |

Adicional não previsto no `<threat_model>`, e **registrado em vez de consertado**: as
escolhas da SJT em `scores_candidato.metadata->'respostas'` e os hashes do texto removido
(ver «Registrado, não consertado»).

## Issues Encountered

- **Dois dos meus próprios SQL de mutação estavam errados, e a primeira leitura da saída
  parecia veredito sobre o portão.** `M6` usava `jsonb + jsonb` (operador inexistente) e
  `M7` jogava um array em `status_analise` (que tem CHECK): `42883` e `23514`. Os dois são
  erros do instrumento, não do portão — e a conclusão oposta («o portão não mordeu») estava
  a uma linha de distância. Reescritas as duas antes de escrever qualquer veredito.
- **A primeira versão de `M12` removia o guard de ordem do pós-portão**, e o `substr`
  seguinte estourava com `22011: negative substring length`. Além de ser defeito de
  instrumento, isso mostra que o guard de ordem do pós-portão é load-bearing para o `substr`
  que vem depois dele — o que é correto, mas vale estar escrito.
- **O ensaio e as mutações só devolvem a ÚLTIMA linha de erro pela Management API.** Os
  `NOTICE` não voltam. Por isso o contador foi lido por um `RAISE` explícito, e não inferido
  de «não levantou» — a leitura deu `36` no ensaio e `36` depois do apply.
- **`agendado_por` das entrevistas é FK para `usuarios_rh(id)`, não para o `auth.uid()`**
  que o smoke já carregava em `v_admin_auth`. Confundir os dois daria `23503` no meio da
  fixture; a variável `v_rh_id` é resolvida à parte, com guarda que levanta alto se faltar.
- **`perguntas_cultura` está em ZERO linhas em PROD**, então a fixture teve de criar a
  pergunta também (com `ordem` dentro do CHECK 1..7, lido do catálogo).
- `tsc` segue em **89**, teto 90 (D-53). Este plano não acrescentou nenhum erro — não toca
  `src/` nem `supabase/functions/`.

## User Setup Required

None — nenhuma configuração de serviço externo. O token do Supabase já está no Keychain
(serviço "Supabase CLI", conta "supabase").

## Next Phase Readiness

**Pronto.** O que este plano entrega e quem consome:

- **`49-21`** (recibo e inventário) tem a lista exata do que alinhar, e ela cresceu:
  1. o item `respostas_e_producoes` declara `passo_motor: 'tombstone_candidato'` e tem de
     apontar `apagar_respostas_e_producoes`; `PASSOS_MOTOR`
     (`_shared/reciboExclusao.ts:23-31`) precisa da chave nova;
  2. `ai_call_logs.user_prompt_template` segue mapeado como `conteudo_do_produto` em
     `recibo-exclusao.json:500` e `:534` (herdado do 49-14);
  3. ⚠ **as duas superfícies que eu medi e não ampliei** — `scores_candidato.metadata->'respostas'`
     (as escolhas da SJT, que o recibo promete apagar e a Correção 14 recusou ressalvar) e
     os hashes do texto removido. As duas estão em `WINDOWS.md` e precisam de **decisão do
     operador**, não de conserto de agente;
  4. o recibo pode agora citar um número de linhas apagadas: `passos.apagar_respostas_e_producoes.linhas_apagadas_d62`.
- **`49-19`** (primeira execução real, checkpoint) herda um motor cujo dry-run PREVÊ as
  treze contagens novas, inclusive as quatro de linhas que **vão deixar de existir** — a
  contagem antes/depois que o checkpoint exige pode ser lida do `'plano'` e conferida contra
  o `'passos'`, e `linhas_apagadas_d62` é o número irreversível a mostrar ao operador antes
  de ele aprovar.
- **`49-28`** fecha a (j.2) do `p46_purga_smoke` e com ela as `(o)`, `(o.6)`, `(o.7)` e
  `(p)`, que exercitam o 4º ramo do guard deste motor. Enquanto não rodar, a regressão desse
  smoke precisa da fixture-seed devolvida a `ativa` dentro de requisição que aborta.
- **`49-18`** (`p49_prova_prod.sql`) pode se apoiar nas (B17)..(B22) como especificação
  executável do que o motor apaga.
- **Quem for mexer nos três corpos depois:** os corpos NÃO devem ser transcritos. Ler do
  arquivo (`20260922000013`, entre os delimitadores nomeados; o do trigger agora tem
  delimitador nomeado também), conferir o md5 contra o vivo, editar por âncora única. Os
  pins de partida são `0d16c0d8185fe9885d4ec823cfa4dd71` (motor, 75 397),
  `f86cb2b1ae6ae007c8145c18f7797dbd` (plano, 33 074) e
  `d54f28e054fc1c038793f01ed2edf524` (trigger, 3 646). O contador do smoke é **36**.

**Atenção para os planos seguintes:** `tsc` em 89, teto 90 (D-53) — margem de um. E a partir
deste apply o motor **apaga linha**: qualquer edição dele tem de manter a extração da lista
de alvos no pós-portão e em `(C3/vi)`, porque é ela — e não a presença das quatro tabelas —
que impede uma quinta.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `supabase/migrations/20260922000013_p49_motor_respostas_e_producoes.sql` — FOUND
- `supabase/tests/p45_motor_exclusao_smoke.sql` — FOUND (modificado)
- `.planning/phases/49-consertos-da-jornada-bloco-2/49-20-SUMMARY.md` — FOUND
- commit `99ef1b35` — FOUND
- `commits: 1` no frontmatter = MEDIDO por `git rev-list --count 5cc3e4eb..HEAD` no
  instante da escrita deste SUMMARY (HEAD = `99ef1b35`). Re-medido no fecho dá **3**,
  e a diferença são os dois commits de metadado deste plano — previsto no comentário
  do `actuals`, não divergência.
- `origin/main..HEAD` = **VAZIO** (push `5cc3e4eb..99ef1b35`)
- `<acceptance_criteria>` da Task 1 re-executados:
  - PROD contém `apagar_respostas_e_producoes` ANTES de `severar_fks_set_null`
    (posições medidas pelo pós-portão), apagamento em EXATAMENTE 4 tabelas (lista
    EXTRAÍDA do corpo instalado), a janela `app.motor_exclusao` em volta do UPDATE
    da redação (abre < update < fecha), e as formas do 49-14 intactas — todas
    asseridas pelo pós-portão do apply, que passou
  - `plano_exclusao_titular` conta o mesmo: chave nova + as 13 contagens + as
    condições `IS NOT NULL` + `jsonb_exists(z, 'cited_evidence')`
  - o smoke passa com uma asserção por origem nova, **inclusive** a execução com
    claims de administrador (B21) e o controle sem a janela (B22); a mutação
    reprova (18 delas, tabela no SUMMARY)
  - `p46_purga_smoke` fecha **27/27** com a fixture-seed devolvida a `ativa` dentro
    da requisição que aborta; a (j.2) alheia está em `WINDOWS.md` 67 e 75
  - a precondição está registrada com os valores lidos: `config_purga.modo = dry_run`
    e os dois md5 de partida
- `<verification>` de plano re-executada AGORA: `<verify>` #1 = `OK`; ledger
  `md5(statements[1])` = `4abb5feed288bbfac4d4611949386ff0` batendo o disco;
  `p45_motor_exclusao_smoke` = `P45=36`; purga relida = `dry_run`;
  `origin/main..HEAD` vazio.
