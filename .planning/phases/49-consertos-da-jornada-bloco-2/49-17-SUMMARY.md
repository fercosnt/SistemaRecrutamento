---
phase: 49-consertos-da-jornada-bloco-2
plan: "17"
subsystem: compliance
tags: [lgpd, export-allowlist, pii-inventory, recibo-exclusao, catalogo-vivo, d-57, d-66, d-70, checkpoint, mutation-testing, windows-82, ui-spec-linha-obrigatoria]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "as 16 colunas em PROD (migration 20260922000002) que este plano decide por escrito — e o estado fail-safe que elas atravessaram desde 2026-09-22: existiam sem veredito, e a cópia do titular as omitia por allowlist, não por decisão"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "21"
    provides: "o gerador do recibo, o inventário e os dois espelhos TS no estado de que este plano parte (223 colunas com veredito, 46 razões de silêncio), e os dois itens explicitamente deixados para cá: WINDOWS 81 (D-66) e WINDOWS 82"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "12"
    provides: "a BD-9 MEIO-FECHADA — D-46 aprovada (fecha a exportação), D-47 RECUSADA (a cópia na trilha fica), versão 20260922000010 deliberadamente vazia no ledger"
  - phase: 48-consertos-da-jornada-bloco-1
    plan: "17"
    provides: "o precedente do checklist D-57 de coluna nova, o molde do item de `meta.acrescimos` e o vocabulário de razões do recibo"
provides:
  - "as 7 colunas de `entrevista_analises` MEDIDAS em PROD nesta execução e acrescentadas ao `catalogo-vivo-44.json` num item `fase: 49` / `plano: 49-17` (o `medido_em` e os `totais` do topo NÃO reescritos)"
  - "veredito de export ESCRITO para as 7: `tipo` e `superada_em` ⇒ `true`; `texto_hash`, `ai_call_log_id`, `provedor_ia`, `modelo_ia` ⇒ `false`; `solicitado_por` sem veredito próprio, saindo pela R2 — conferido por asserção no artefato"
  - "`meta.versao` do `export-scope-rules.yaml` 1.2.0 → 1.3.0, na MESMA entrega em que o conjunto exportado muda"
  - "classificação das 7 no `pii-inventory.yaml` e razão nomeada das 7 em `FORA_DO_RECIBO`; NENHUM texto de titular alterado"
  - "o registro do RESÍDUO do D-70 (dono nomeado pelo operador): a nota da coluna, a razão do veredito e `chave_tecnica` no recibo dizem que o hash sobrevive de propósito e que ele permite CONFIRMAR um texto adivinhado, nunca recuperá-lo. `WINDOWS` 77 → `waived` (não `fixed`) com a razão escrita"
  - "os dois `VALUES` do `05-export-allowlist-drift.sql` REGERADOS pelo gerador (376+39=415 → 378+44=422) e os dois snapshots inline atualizados de propósito, com diff de exatamente 7 linhas"
  - "o achado M1/M1b: com entrada explícita no inventário, apagar os vereditos de export NÃO reprova o fecho — quem reprova são os snapshots (b)/(j) e a (k). Escrito no próprio `export-scope-rules.yaml`, porque a leitura natural é falsa"
  - "a RE-MEDIÇÃO do D-66, que corrige a WINDOWS 81 nos dois sentidos (`entrevista_guias` = 0 de 5, não 2 de 5; `analise_candidato_vaga` = 9 de 25 e isso é LIMITE INFERIOR) — `WINDOWS` 83"
  - "a exposição de `anon` MEDIDA com `SET LOCAL ROLE anon`, VIEWS incluídas: zero linha das cinco tabelas, e nenhuma view expõe coluna alguma da fase"
  # --- Task 3 (agente de continuação, 2026-09-24) -------------------------------
  - "as 9 colunas restantes MEDIDAS em PROD em 2026-09-24T05:24:14Z (instante lido do próprio banco, não arredondado) e acrescentadas à MESMA entrada `fase: 49` do catálogo, que passa de 7 para 16 colunas com um `medido_em_task_3` próprio"
  - "veredito de export ESCRITO para as 5 que vivem em tabela EM ESCOPO (`provedor_ia`/`modelo_ia` de `analise_candidato_vaga` e de `redacoes_candidato`, mais `redacoes_candidato.rubrica_versao`): todas `export: false`, pela família de `devolutivas_candidato.modelo_ia`"
  - "a RAZÃO ESCRITA de as outras 4 NÃO terem veredito: `comparativo_solicitado` e `entrevista_guias` estão excluídas no nível de TABELA, e o fecho inverso do próprio gerador declara que decisão de coluna sobre tabela excluída é INERTE — quatro linhas que parecem proteger e não protegem"
  - "WINDOWS 82 CONSERTADA: a linha obrigatória `justificativa_do_recrutador` (UI-SPEC regra 4) passa a DISTINGUIR as suas três origens em vez de fazer uma afirmação única sobre as três; e a outra metade da mesma janela (`ligacao_com_a_justificativa`, cujas origens são SÓ o par sobrescrito) também. Conferido no bundle PUBLICADO, não no disco"
  - "D-66 NÃO resolvido aqui, por decisão do operador (opção (c), 2026-09-23): o texto de `avaliacoes_e_analises` fica intacto e as duas tabelas ficam em `tabelas_sem_pii_titular` — o dono é o plano 49-29. O que mudou foi o REGISTRO: a `nota` da seção afirmava 13/24 e 2/5, os dois errados, e agora carrega o re-medido com a causa de cada erro e o dono nomeado"
  - "o drift contra PROD MEDIDO caindo de 14 para 9, e os 9 re-lidos um a um: são o drift pré-existente da Phase 48, nenhum desta fase"
  - "as duas EFs redeployadas (`exportar-meus-dados` v5, `executar-direito-titular` v12, as duas ACTIVE `verify_jwt=true`) com o marcador provado no bundle vivo, um por chamada"
  - "o achado M1 da Task 1 GENERALIZADO para as colunas novas por mutação (M6): removido o veredito de `rubrica_versao`, a geração sai `exit 0` e a coluna ENTRA na cópia com `inventario:preservar` — quem reprova são (b), (j) e (k)"
  - "`WINDOWS` 85 nova: `v_analises_presas` sai do SUMMARY de um plano e entra no ledger, que é onde um defeito registrado sobrevive à fase"
affects: [49-29, fecho-do-M8]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4).
actuals:
  tokens: 15465
  tasks: 3
  commits: 4
  plan_head_before: 91a753bc9d2dabe9e87f0ab4d05b35b8c7356617
  # `commits: 4` = MEDIDO por `git rev-list --count 91a753bc..HEAD` no instante em que
  # este SUMMARY foi escrito (HEAD = dc97d071). Re-medir DEPOIS deste ponto dá **5**, e
  # isso NÃO é divergência: o commit de metadado deste plano entra no mesmo intervalo por
  # construção, porque o `plan_head_before` é anterior a ele.
  # ⚠ E um dos 4 NÃO é deste plano: `614617a6` é o PLANO 49-29, escrito pelo orquestrador
  # entre as duas sessões. O intervalo é medido por SHA, não por autoria, e mentir na
  # direção oposta (descontá-lo à mão) tornaria o número não reproduzível pelo comando.
  # Commits de CÓDIGO deste plano: 2 (`04ac66cc` na Task 1, `dc97d071` na Task 3).
  # `tokens: 15465` = 6 985 (Task 1: 27 940 chars no diff `04ac66cc^..04ac66cc`, / 4) +
  # 8 480 (Task 3: 33 922 chars em `dc97d071^..dc97d071`, / 4). O 6 985 foi RE-MEDIDO
  # nesta sessão e bateu ao caractere com o que a Task 1 registrou — é uma conferência de
  # instrumento, não uma cópia. O intervalo inteiro (`91a753bc..HEAD`) dá 31 823, e a
  # diferença é o SUMMARY da Task 1 mais o plano 49-29: prosa de planejamento, não
  # entrega. `tokens` conta a entrega.
  # ⚠ A estimativa do plano era 110 000 para três tasks; a realização é 15 465 — 0,14x.
  # Erro de estimativa REAL, não artefato de parada: as três tasks rodaram. A causa
  # medida é que o plano orçou a Task 3 como se ela repetisse a Task 1 nove vezes, e ela
  # não repetiu: os seis vereditos da Task 1 exigiram DECIDIR (duas direções de risco,
  # a tensão do D-27, o resíduo do D-70), enquanto os cinco da Task 3 herdaram a mesma
  # família de razão já decidida — e quatro das nove colunas não exigiram veredito
  # nenhum. Uma task que aplica um precedente custa uma fração de uma que o cria.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Acrescentar coluna ao catálogo vivo por SCRIPT com portão de round-trip: o script aborta se `JSON.stringify(parse(raw),null,2) !== raw`, e aborta de novo se qualquer coluna a acrescentar JÁ existir. Sem o primeiro portão, uma reescrita reformataria 5 342 linhas e o diff deixaria de ser auditável; sem o segundo, um acréscimo viraria re-medição em silêncio"
    - "Regerar bloco `VALUES` de SQL por substituição ANCORADA e VALIDADA pela forma: o script exige que TODA linha do bloco antigo casse `('tabela','coluna'),?` antes de substituir. Um bloco com comentário no meio abortaria em vez de ser engolido — e o diff resultante (7 linhas, nenhuma outra movida) é o que prova que nada mais mudou"
    - "Um probe por NOME contra uma base cujo titular se chama como um substantivo comum produz falso positivo, e o falso positivo se apresenta como PII: ler o TRECHO em volta de cada casamento antes de contar. Dois de cinco guias 'com o nome do titular' eram a palavra `candidato` no rationale do próprio guia"
    - "Casar contra o nome ATUAL é estruturalmente cego ao titular que JÁ exerceu a exclusão: o nome dele foi substituído, e nenhum probe por nome encontra o que sobrou no texto. O caso que mais importa é exatamente o que o instrumento não vê — medir a linha dele diretamente, não pela contagem"
    - "Descobrir a assinatura de um verbo de ESCRITA lendo o fonte da ferramenta (§O): `windows waive <id> \"<reason>\"` foi lido em `broken-windows.cjs:1043`, nunca sondado por execução — e é ele, não `fixed`, o status honesto para um resíduo que o operador ACEITOU em vez de consertar"
    - "Sincronizar a célula da tabela do `WINDOWS.md` chamando o `renderTable` DA PRÓPRIA FERRAMENTA sobre o JSON editado, em vez de redigitar a linha: a ferramenta recusa mutar enquanto a tabela discorda do JSON (`disagrees … for row id(s): 82, 83`), e redigitar a célula à mão é exatamente o que o §M proíbe. Consequência: a razão de um `fixed` (que o verbo não aceita como argumento) se escreve no JSON e a tabela se regenera por código"
    - "Um campo chamado `medido_em` que recebe um instante ARREDONDADO é um registro-que-mente pequeno num arquivo cuja única função é não mentir. Peguei o meu: eu havia carimbado `T00:00:00Z`. Conserto: `SELECT now()` na MESMA consulta que reconfirma as colunas, e o instante entra lido do banco"

key-files:
  created:
    - .planning/phases/49-consertos-da-jornada-bloco-2/49-17-SUMMARY.md
  modified:
    - docs/compliance/catalogo-vivo-44.json
    - docs/compliance/export-scope-rules.yaml
    - docs/compliance/pii-inventory.yaml
    - docs/compliance/pii-inventory.md
    - docs/compliance/sql/gen-recibo-exclusao.cjs
    - docs/compliance/sql/05-export-allowlist-drift.sql
    - docs/compliance/recibo-exclusao.json
    - docs/compliance/export-allowlist.json
    - docs/compliance/__tests__/exportAllowlist.test.ts
    - supabase/functions/_shared/exportAllowlist.ts
    - supabase/functions/_shared/reciboExclusao.ts
    - src/features/privacidade/constants/reciboExclusao.generated.ts
    - database.types.ts
    - .planning/WINDOWS.md
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  # --- Task 3 (2026-09-24) ------------------------------------------------------
  - "D-66 NÃO foi resolvido neste plano, e a razão é a decisão do operador, não escopo esquecido. Ele escolheu a opção (c) — desidentificar no MOTOR — e o `<acceptance_criteria>` da própria Task 2 diz que (c) significa que este plano não a executa. Consequências concretas e deliberadas: (1) o texto do item `avaliacoes_e_analises` está INTACTO, porque a escolha foi fazer o motor cumprir a promessa existente («sem ligação com você») e não enfraquecê-la; (2) `analise_candidato_vaga` e `entrevista_guias` continuam em `tabelas_sem_pii_titular`; (3) `WINDOWS` 83 fica `open` com o plano 49-29 NOMEADO como dono dentro da própria entrada. Um texto de recibo inalterado, sem essa explicação ao lado, é indistinguível de um esquecimento — e é por isso que ela está escrita no inventário, no ledger e aqui"
  - "A asserção do D-66 no `<verify>` da Task 3 REPROVA, de propósito, e foi rodada assim mesmo. Ela foi escrita presumindo as opções (a) ou (b); sob a (c) ela pede o contrário do que o operador decidiu. Rodei o comando VERBATIM para registrar a mensagem exata da reprovação, e depois a mesma cadeia com a cláusula invertida (as duas tabelas AINDA na lista, `exit 0`) — assim o registro mostra o que falhou e o que passou, em vez de um comando editado que esconde a diferença"
  - "As 4 colunas de `comparativo_solicitado`/`entrevista_guias` NÃO receberam veredito de export, e a razão está escrita no arquivo, não só aqui: o fecho inverso do `gen-export-allowlist.cjs` declara, em comentário próprio, que decisão de coluna sobre tabela excluída é INERTE — ele a ignora em silêncio. Quatro vereditos assim pareceriam proteção e nenhum portão jamais reprovaria por envelhecerem. Conferido antes de escrever, como o SUMMARY da Task 1 mandou conferir"
  - "A assimetria entre as duas tabelas fora de escopo é DELIBERADA e cada coluna foi para onde a sua tabela já mora: `comparativo_solicitado` tem seção em `tabelas:` (e o RECIBO a trata como em escopo, porque ela não está no `FORA_DO_ESCOPO_DO_TITULAR` daquele gerador), então as duas colunas dela ganharam classificação E razão de recibo; `entrevista_guias` é coberta em bloco pela R4 na outra lista, e uma coluna não pode ser classificada nos dois lugares. Os dois escopos são artefatos diferentes e não têm de coincidir"
  - "`analise_candidato_vaga.provedor_ia`/`modelo_ia` ficaram SEM entrada explícita no inventário, e isso é consequência direta da opção (c): a tabela é coberta em bloco pela R4 enquanto estiver naquela lista, e dar-lhe seção em `tabelas:` é justamente o movimento que pertence ao 49-29. As duas têm veredito de export escrito — que é o artefato onde a decisão delas morde — e o comentário na lista diz onde elas entram quando a tabela sair"
  - "A WINDOWS 82 foi consertada nas DUAS linhas que ela acusa, não só na obrigatória que o operador nomeou. Medido: as origens de `ligacao_com_a_justificativa` são SÓ o par `decisao_final`/`decisao_final_historico` — as duas que o motor sobrescreve —, logo ali a afirmação não era falsa para uma origem entre três, era falsa para TODAS. Fechar a janela deixando aquela linha de pé seria fechá-la no papel com o defeito vivo um item acima, na mesma tela do titular"
  - "O valor fixo que o motor grava NÃO aparece em lugar nenhum do código, nem «para registro» (49-PATTERNS §K, violado três vezes nesta fase). O que está escrito é o que a afirmação alegava e por que era falsa. Quem precisar do literal lê o corpo da função em PROD, que é a fonte"
  - "As duas EFs foram redeployadas DUAS vezes, e a segunda não foi retrabalho: ao consertar o `medido_em` arredondado do catálogo, os artefatos gerados mudaram (só no `gerado_em`) e o ar passaria a diferir do disco por um campo. Um redeploy custa segundos e apaga uma nota de pé de página do tipo «o bundle vivo carrega um carimbo anterior» — que é a classe de discrepância que esta fase gastou dias perseguindo"
  - "O bump `meta.versao` 1.2.0 → 1.3.0 foi feito na Task 1, não na Task 3 como o plano escreve. Razão: o CONJUNTO de colunas exportadas muda AQUI (entram `tipo` e `superada_em`), e uma versão que descreve um artefato que já não é o dela é a mesma classe de registro-que-mente que o topo do CLAUDE.md documenta. As 9 colunas da Task 3 entram no mesmo `1.3.0` porque nenhuma delas é exportada — nem a versão nem o conjunto se movem por causa delas"
  - "Os dois `VALUES` do drift e os dois snapshots inline foram atualizados na Task 1, não na Task 3. Razão MEDIDA: com o conjunto exportado mudado, a asserção (k) e os snapshots (b)/(j) reprovam — a árvore ficaria VERMELHA no fim de uma task `tracer`, cuja definição é ser produção e não rascunho. Adiar o conserto seria deixar o portão desarmado exatamente durante a janela em que ele é a única rede"
  - "As 7 colunas ganharam entrada EXPLÍCITA no `pii-inventory.yaml`, e isso tem um custo que foi medido antes de ser aceito: a entrada explícita resolve a coluna no passo 4 do gerador de allowlist e o fecho deixa de exigir veredito. Mutação M1b: os seis vereditos removidos ⇒ `exit 0` e QUATRO colunas de telemetria entram na cópia com proveniência `inventario:preservar`. Aceito porque o D-57 pede a classificação e porque quem reprova passa a ser o snapshot congelado, que reprova — provado por execução. O custo está ESCRITO no `export-scope-rules.yaml`, onde a próxima pessoa vai procurar"
  - "`solicitado_por` NÃO recebeu veredito próprio, de propósito. O nome está na R2 e em `ponteiros.de_terceiro`, e a R2 roda ANTES da entrada do inventário — um veredito aqui seria uma segunda fonte para a mesma decisão. Mutação M2 (veredito `export: true`) prova as duas metades: um veredito explícito INVERTE a R2, e a asserção do plano morde nomeando a coluna"
  - "NENHUM texto destinado ao titular foi alterado, e isso não é economia: a promessa do recibo sobre as análises é a decisão do operador no checkpoint da Task 2 (D-66). O diff do `recibo-exclusao.json` é 7 razões de silêncio e dois contadores — nenhuma linha `sai`/`mantém` mudou"
  - "Nenhuma EF foi redeployada. Entre este commit e a Task 3 o ar diz MENOS do que o artefato declara (`tipo`/`superada_em` ainda não chegam à cópia real), que é a direção segura e o mesmo estado fail-safe que a fase atravessou desde o 49-01. Redeployar agora obrigaria a um segundo deploy de `executar-direito-titular` depois da decisão do operador"
  - "`WINDOWS` 77 (D-70) foi marcada `waived` e não `fixed`. Nada foi consertado: o operador ACEITOU o resíduo. `fixed` seria a mentira; e a assinatura de `waive` foi lida no fonte da ferramenta, nunca sondada por execução (§O — a sonda do 49-22 gravou um `fixed` sem razão que não pôde desfazer)"
  - "`main` mantida como branch de trabalho (autorização explícita do orquestrador: `git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Não registrado como desvio"

patterns-established:
  - "Quando um plano pede para CONFERIR um número herdado, conferir o INSTRUMENTO antes do número: as duas correções deste plano (2/5 → 0/5 e 13/24 → 9/25) não vieram de o banco ter mudado, vieram de o probe original casar um substantivo comum e de ele ser cego ao titular anonimizado. Um número herdado errado é mais perigoso que um ausente, porque chega com autoridade de medição"
  - "Um plano de inventário que PARA num checkpoint tem de deixar o portão MAIS forte, não igual: se o artefato mudou, o teste que o congela muda no mesmo commit. A alternativa — 'a Task 3 arruma' — é precisamente o estado em que o portão não morde durante a única janela em que ele importa"
  - "Ao provar que um portão morde, distinga QUAL portão falou. Cinco mutações mordidas por três mecanismos diferentes (fecho do recibo, asserção do plano, snapshot do teste) é informação; 'cinco mordidas' não é. E uma mutação que NÃO morde (M1) é o achado mais valioso do conjunto"

requirements-completed: [JORN-28, JORN-12, JORN-07]

coverage:
  - id: D1
    description: "As 7 colunas de `entrevista_analises` têm o checklist D-57 COMPLETO: medidas no catálogo, veredito de export escrito com razão, classificação no inventário, razão nomeada no recibo, artefatos regenerados pelos geradores e portões verdes"
    requirement: JORN-12
    verification:
      - kind: integration
        ref: "`information_schema.columns` em PROD (só leitura, 2026-09-23T21:03:45Z): as 7 existem, as 7 nuláveis, tipos e ordens 14..20 lidos da consulta e gravados no catálogo"
        status: pass
      - kind: command
        ref: "`<verify>` da Task 1 rodado VERBATIM: os três geradores + os três `check:*` + a asserção do artefato ⇒ `VERIFY_TASK1_EXIT=0`. `tipo`/`superada_em` na cópia; `solicitado_por`/`texto_hash`/`ai_call_log_id`/`provedor_ia`/`modelo_ia` fora; razão de `solicitado_por` citando a R2"
        status: pass
      - kind: command
        ref: "os QUATRO `check:*` (export-allowlist, pii-inventory-md, recibo-exclusao, matriz-retencao) OK; recibo fecha 230 de 230 colunas em escopo com veredito (era 223), 53 razões de silêncio (era 46)"
        status: pass
      - kind: tests
        ref: "`npx vitest run docs/compliance src/features/privacidade src/__tests__/guards` ⇒ 298 testes, 23 arquivos, verdes"
        status: pass
    human_judgment: false
  - id: D2
    description: "O drift contra PROD não lista mais nenhuma coluna de `entrevista_analises`, e a lista pré-existente foi re-medida em vez de copiada"
    requirement: JORN-28
    verification:
      - kind: integration
        ref: "`node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql` contra PROD: **21 linhas ANTES** (9 de drift pré-existente + 12 da fase em tabela em escopo) e **14 DEPOIS** — as 7 de `entrevista_analises` saíram, nenhuma outra se moveu"
        status: pass
      - kind: command
        ref: "os dois `VALUES` REGERADOS por `--sql-values` / `--sql-values-excluidas` (376+39=415 → 378+44=422); `git diff` do arquivo = 7 linhas `+` e ZERO `-`"
        status: pass
    human_judgment: false
  - id: D3
    description: "Os portões que protegem a cópia do titular MORDEM, e está medido QUAL deles fala em cada caso"
    verification:
      - kind: integration
        ref: "M2 (veredito `export: true` em `solicitado_por`) ⇒ a asserção da R2 do plano morde, `exit 1`, «solicitado_por na copia do titular»"
        status: pass
      - kind: integration
        ref: "M3 (razão de silêncio de `texto_hash`/`ai_call_log_id` removida) ⇒ `gen-recibo-exclusao` REPROVA com 2 ERROS DE FECHAMENTO (cobertura), nomeando as duas colunas; nenhum artefato produzido"
        status: pass
      - kind: integration
        ref: "M4 (os dois `VALUES` do drift estagnados) ⇒ asserção (k) morde: «o `VALUES` da CTE `allowlist` envelheceu — rode --sql-values: expected […(376)] to deeply equal […(378)]»"
        status: pass
      - kind: integration
        ref: "M5 (`texto_hash` classificada `apagar`) ⇒ `gen-recibo-exclusao` REPROVA com SILÊNCIO PROIBIDO + DIREÇÃO ERRADA — o motor NÃO a apaga (D-70), e o gerador recusa prometer que apaga"
        status: pass
      - kind: integration
        ref: "M1/M1b/M1c (os vereditos de export removidos) ⇒ o FECHO **não** morde (`exit 0`) e 4 colunas de telemetria entram na cópia com `inventario:preservar`; quem morde são (b), (j) e (k), três reprovações nomeando as colunas. Registrado no `export-scope-rules.yaml`"
        status: pass
      - kind: other
        ref: "as cinco mutações revertidas por cópia de arquivo (nunca `git stash`/`clean`), com md5 conferido depois de cada restauração: `d2d064b8…` / `b17dc6ca…` / `517d9c0d…` de volta aos valores de antes"
        status: pass
    human_judgment: false
  - id: D4
    description: "A exposição de `anon` às cinco tabelas foi MEDIDA com `SET LOCAL ROLE anon`, VIEWS incluídas — não inferida das ACLs"
    verification:
      - kind: integration
        ref: "`SET LOCAL ROLE anon` dentro de transação só-leitura que aborta: `entrevista_analises` e `entrevista_guias` ⇒ **42501** (privilégio insuficiente); `redacoes_candidato`, `analise_candidato_vaga`, `comparativo_solicitado` ⇒ **0 linhas**. Nenhuma das 16 colunas é legível por `anon`"
        status: pass
      - kind: integration
        ref: "causa do 42501 medida e não suposta: as policies das duas tabelas (`{public}`, logo valem para `anon`) sub-consultam `candidaturas`, e `has_table_privilege('anon','candidaturas','SELECT')` = **false**. `vagas` = true, e é por isso que `comparativo_solicitado` devolve 0 em vez de erro"
        status: pass
      - kind: integration
        ref: "as 10 views de `public` varridas: nenhuma expõe coluna alguma da fase. As duas que `anon` pode SELECIONAR (`v_fila_trabalho`, `v_triagem_panel`) têm `security_invoker=true` e, sob `anon`, também dão 42501"
        status: pass
      - kind: integration
        ref: "achado PRÉ-EXISTENTE, registrado e não consertado: `v_analises_presas` é a forma perigosa (`security_invoker` NÃO setado, dono `postgres` ⇒ ignora RLS) e tem SELECT para `authenticated`. Lida a definição: expõe `candidatura_id`, `vaga_id`, `vaga_slug`, data, situação e `erro` de análise — nenhuma coluna da fase, nenhum nome, nenhum CPF"
        status: pass
    human_judgment: false
  - id: D5
    description: "Os cinco itens herdados carregados com veredito — e os dois que são PERGUNTA continuam perguntas"
    verification:
      - kind: integration
        ref: "BD-9 meio-fechada CONFERIDA em PROD: as 5 linhas seguem carregando a cópia (`d47 = 5`, tamanhos 55..372 chars), e `d46 = 0` confirma que a metade aprovada continua aplicada. E os 5 ids que o 49-12 chama de «candidaturas» são `historico_candidatura.id` — ids de LINHA, cobrindo 4 candidaturas (`0b1c887b`, `6e5d8051`, `2ce20fbf` ×2, `d31c78bb`, esta a conta real)"
        status: pass
      - kind: other
        ref: "D-70 documentado nos três lugares (nota do inventário, razão do veredito, `chave_tecnica` no recibo) e `WINDOWS` 77 ⇒ `waived` com a razão lida de volta do JSON. Cobertura desta task: `entrevista_analises.texto_hash`; as duas de `redacoes_candidato` são da Task 3"
        status: pass
      - kind: integration
        ref: "WINDOWS 56 RESPONDIDA — «quem lê isto?»: NINGUÉM. O único escritor de `motivos_revisao`/`dimensoes_desconhecidas` é `supabase/functions/avaliar-redacao/index.ts` (`:480`, `:486`), as duas gravadas condicionalmente, e não há leitor em `src/` nem em nenhuma outra EF (as demais ocorrências são os testes do próprio arquivo). Em PROD: **0 de 5** linhas `sjt` carregam qualquer uma das duas chaves hoje — é defeito LATENTE, não perda de dado corrente"
        status: pass
      - kind: integration
        ref: "WINDOWS 81 (D-66) RE-MEDIDA e corrigida nos dois sentidos — `WINDOWS` 83. A DECISÃO continua com o operador, no checkpoint: nada foi escrito no recibo"
        status: pass
      - kind: other
        ref: "WINDOWS 82 carregada como PERGUNTA ao operador, não decidida: nenhuma das três linhas obrigatórias da UI-SPEC foi tocada"
        status: pass
    human_judgment: false
  - id: D6
    description: "Nada irreversível aplicado, e a árvore está publicada"
    verification:
      - kind: other
        ref: "ZERO escrita em PROD: toda consulta rodou com `SET TRANSACTION READ ONLY` ou dentro de bloco que aborta. Nenhuma migration, nenhum `efdeploy`, nenhum apply. `config_purga`, contagens e corpos de função intocados"
        status: pass
      - kind: other
        ref: "`npm run -s lint` = **89** erros TS (teto D-53 = 90; margem de um preservada, nenhum erro novo)"
        status: pass
      - kind: other
        ref: "`git log --oneline origin/main..HEAD` VAZIO depois do push"
        status: pass
    human_judgment: false
  - id: D7
    description: "As 16 colunas da fase terminam com o checklist D-57 fechado: as 9 restantes medidas no catálogo, as 5 em tabela em escopo com veredito escrito, as 4 em tabela excluída com a RAZÃO de não terem veredito, classificação e razão de recibo onde cada artefato as cobre"
    requirement: JORN-28
    verification:
      - kind: integration
        ref: "`information_schema.columns` em PROD, só leitura, instante lido do banco (`now()` na mesma consulta) = 2026-09-24T05:24:14Z: as 9 existem, todas `text` e nuláveis, ordens 16/17 (analise_candidato_vaga), 8/9 (comparativo_solicitado), 8/9 (entrevista_guias), 31/32/33 (redacoes_candidato) — gravadas no catálogo na MESMA entrada `fase: 49`, que passa de 7 para 16 colunas"
        status: pass
      - kind: command
        ref: "os três geradores + os QUATRO `check:*` verdes; o recibo fecha **235 de 235** colunas em escopo com veredito (era 230) — as 5 novas razões são as 3 de `redacoes_candidato` e as 2 de `comparativo_solicitado`"
        status: pass
      - kind: tests
        ref: "`npx vitest run docs/compliance src/features/privacidade src/__tests__/guards` ⇒ 298 testes, 23 arquivos, verdes (o mesmo total da Task 1 — nenhum teste novo, nenhum perdido)"
        status: pass
      - kind: command
        ref: "o fecho inverso do `gen-export-allowlist.cjs` LIDO antes de decidir sobre as 4 de tabela excluída: «Tabela fora de escopo já é coberta pelo fecho de TABELA — uma decisão de coluna sobre tabela excluída é inerte, não órfã». Nenhum veredito escrito para elas"
        status: pass
    human_judgment: false
  - id: D8
    description: "WINDOWS 82 consertada: a linha obrigatória distingue as suas três origens, as outras duas obrigatórias intactas, e o conserto conferido no artefato PUBLICADO"
    requirement: JORN-07
    verification:
      - kind: integration
        ref: "o fato RE-MEDIDO no corpo vivo de `anonimizar_candidato` (md5 `1d8f96c8f21a755ded0505a0b652113a`, 78 301 octetos — o mesmo pin do 49-21): `position('motivo_rejeicao')` = **0**, `position('justificativa_recomendacao')` = **0**, `position('avaliacoes_rh')` = **0** ⇒ as duas origens sobrevivem de verdade; e o trecho do passo `tombstone_decisao_final` lido na íntegra mostra um `UPDATE … SET justificativa = <valor fixo>` INCONDICIONAL (sem `CASE`, diferente do `revisao_resultado` ao lado) ⇒ a terceira não"
        status: pass
      - kind: command
        ref: "a linha continua existindo e continua obrigatória: `OBRIGATORIAS_MANTEM` inalterado, as mesmas quatro colunas reivindicadas, `historico_das_etapas` e `numeros_agregados` sem uma linha de diff. `git diff` do gerador = só os dois itens da justificativa e as razões novas de FORA_DO_RECIBO"
        status: pass
      - kind: integration
        ref: "PROVA NO AR (§N, um marcador por chamada): `executar-direito-titular` v12 ACTIVE `verify_jwt=true`, bundle baixado da Management API (640 005 octetos) ⇒ **3×** «trocado por um aviso padrão», **3×** «a recomendação escrita por quem avaliou», e **ZERO** ocorrência de cada uma das duas afirmações retiradas"
        status: pass
      - kind: other
        ref: "§K respeitado: o valor fixo não é citado em nenhum comentário, docblock ou mensagem de commit — só descrito"
        status: pass
    human_judgment: false
  - id: D9
    description: "O drift contra PROD caiu de 14 para 9, medido, e os 9 restantes foram re-lidos um a um"
    requirement: JORN-28
    verification:
      - kind: integration
        ref: "`node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql` contra PROD: **9 linhas**, e o filtro pelas 7 colunas da fase devolve lista VAZIA. As 9 são `candidatos.faixa_etaria_materializada`, `candidaturas.encerrada_a_pedido_em` e 7 de `solicitacoes_dados` — exatamente as pré-existentes da Phase 48"
        status: pass
      - kind: command
        ref: "os dois `VALUES` REGERADOS por `--sql-values` / `--sql-values-excluidas` (378+44=422 → 378+49=427, contagem do cabeçalho vinda do que os comandos imprimiram); `git diff` do arquivo = 5 linhas `+` de `VALUES` e ZERO `-`; o snapshot inline = as MESMAS 5 chaves, zero linha removida"
        status: pass
    human_judgment: false
  - id: D10
    description: "O portão morde sobre as colunas NOVAS, e está medido qual portão fala"
    verification:
      - kind: integration
        ref: "M6 (veredito de `redacoes_candidato.rubrica_versao` removido) ⇒ a geração sai **`exit 0`** e a coluna ENTRA na cópia do titular com proveniência `inventario:preservar` (379 colunas em vez de 378). Quem reprova são **(b)**, **(j)** e **(k)**, três reprovações, a (k) nomeando o número: «expected […(378)] to deeply equal […(379)]». O achado M1 da Task 1 GENERALIZA para as colunas novas — não era propriedade daquelas seis"
        status: pass
      - kind: other
        ref: "mutação revertida por cópia de arquivo (nunca `git stash`/`clean`), md5 conferido de volta: `16fbe1984f2d1ff2c81e1729ab1bfd72` antes e depois; artefato regenerado e os 11 testes do arquivo verdes outra vez"
        status: pass
    human_judgment: false
  - id: D11
    description: "As duas EFs carregam no ar exatamente o que está no disco, e os tipos finais da fase estão regenerados"
    requirement: JORN-12
    verification:
      - kind: integration
        ref: "`exportar-meus-dados` v5 e `executar-direito-titular` v12, as duas `status=ACTIVE · verify_jwt=true`, com `--dry-run` rodado antes do primeiro deploy de cada (2 e 5 arquivos + import map). O segundo par de deploys existe porque o conserto do `medido_em` mudou o `gerado_em` dos artefatos — o bundle vivo contém o carimbo NOVO (`2026-09-24T05:24:24`, 2 ocorrências em cada)"
        status: pass
      - kind: command
        ref: "`database.types.ts` regenerado com `< /dev/null`: 217 982 octetos, não vazio, com `superada_em` (4×), `rubrica_versao` (3×) e `registrar_analise_entrevista`. O ÚNICO delta contra o disco é a assinatura da RPC — as colunas já estavam lá desde o 49-01, o que é um sinal saudável e não uma falha de geração"
        status: pass
      - kind: command
        ref: "`npm run -s lint` = **89** erros TS (teto D-53 = 90; o mesmo 89 da Task 1, nenhum erro novo, margem de um preservada)"
        status: pass
    human_judgment: false

# Metrics
duration: 38 min (Task 1) + ~30 min (Task 3, agente de continuação)
completed: 2026-09-24
status: complete
---

# Phase 49 Plano 17: O inventário LGPD das 16 colunas da fase, fechado — e a linha obrigatória do recibo passa a distinguir as suas três origens Summary

**Nenhuma coluna que a Phase 49 criou ficou sem decisão escrita sobre ir ou não para a cópia do titular: as 7 de `entrevista_analises` na Task 1, as 9 restantes na Task 3, e as 4 que vivem em tabela excluída com a RAZÃO escrita de não terem veredito — porque ali um veredito seria inerte. E a linha obrigatória `justificativa_do_recrutador` do recibo (UI-SPEC regra 4, prova de não-discriminação) para de fazer uma afirmação única sobre três origens que o motor trata de duas maneiras opostas: duas sobrevivem de verdade, a do campo da decisão final é sobrescrita por um valor fixo. O D-66 não foi resolvido aqui de propósito — o operador escolheu consertar o MOTOR (plano 49-29) em vez de enfraquecer a promessa do recibo, e por isso o texto ficou intacto.**

## Duas sessões, um plano — e o que o checkpoint separou

O plano tem um `checkpoint:decision` com `gate="blocking-human"` na Task 2, e o
`auto_advance` do projeto é `false`. A Task 1 (tracer) rodou em 2026-09-23 e PAROU nele;
o operador respondeu em 2026-09-23; a Task 3 rodou em 2026-09-24 num agente de
continuação, de contexto novo. As duas metades deste SUMMARY estão marcadas, e o que a
Task 1 deixou escrito continua aqui na íntegra: é o registro daquela sessão, não rascunho.

**A resposta do operador, nas duas perguntas que foram à mesa:**

| Pergunta | Resposta | O que este plano fez |
|---|---|---|
| **D-66** (WINDOWS 81/83) — que promessa o recibo faz sobre as análises que contêm o nome | **(c) DESIDENTIFICAR** | **Nada no recibo.** Pelo `<acceptance_criteria>` da própria Task 2, (c) significa que este plano NÃO a executa. Dono: plano **49-29** (onda 8) |
| **WINDOWS 82** — a linha que esconde um apagamento | **CONSERTAR AGORA, neste plano** | Consertada nas DUAS linhas que a janela acusa, na mesma passada do gerador |

## Performance

- **Duration:** 38 min (Task 1) + ~30 min (Task 3)
- **Task 1:** 2026-09-23T20:43:00Z → 21:21:00Z (medido)
- **Task 3:** o primeiro artefato da sessão está carimbado 2026-09-24T05:10:16Z e o commit
  às 05:26Z; a fase de leitura antes dele não é instrumentada, então o honesto é dizer
  **≥16 min medidos, ≈30 min contando a leitura** — e não um número redondo que pareça medido.
- **Tasks:** 3 de 3
- **Files:** 16 (13 no commit da Task 3, 12 no da Task 1 — com 11 em comum — mais
  `WINDOWS.md`, `STATE.md` e `ROADMAP.md`)

## As 16 colunas da fase, MEDIDAS nesta sessão contra o catálogo e a allowlist VIVOS

Nenhuma linha desta tabela foi herdada. A coluna «catálogo» vem do `catalogo-vivo-44.json`
no disco agora; «veredito» do `export-scope-rules.yaml`; «na cópia» do
`export-allowlist.json` regenerado; «inventário» e «recibo» dos dois artefatos gerados.

| Coluna | No catálogo | Veredito | Na cópia | Inventário | Recibo |
|---|---|---|---|---|---|
| `entrevista_analises.tipo` | sim | `true` | **SIM** | preservar | silêncio: `estado_do_processo` |
| `entrevista_analises.superada_em` | sim | `true` | **SIM** | preservar | silêncio: `estado_do_processo` |
| `entrevista_analises.provedor_ia` | sim | `false` | não | preservar | silêncio: `estado_do_processo` |
| `entrevista_analises.modelo_ia` | sim | `false` | não | preservar | silêncio: `estado_do_processo` |
| `entrevista_analises.texto_hash` | sim | `false` | não | preservar | silêncio: `chave_tecnica` |
| `entrevista_analises.ai_call_log_id` | sim | `false` | não | preservar | silêncio: `chave_tecnica` |
| `entrevista_analises.solicitado_por` | sim | R2 (sem veredito próprio) | não | preservar | silêncio: `dado_de_funcionario` |
| `analise_candidato_vaga.provedor_ia` | sim | `false` | não | R4 em bloco (ver abaixo) | n/a (tabela fora do universo do recibo) |
| `analise_candidato_vaga.modelo_ia` | sim | `false` | não | R4 em bloco (ver abaixo) | n/a |
| `redacoes_candidato.provedor_ia` | sim | `false` | não | preservar | silêncio: `estado_do_processo` |
| `redacoes_candidato.modelo_ia` | sim | `false` | não | preservar | silêncio: `estado_do_processo` |
| `redacoes_candidato.rubrica_versao` | sim | `false` | não | preservar | silêncio: `estado_do_processo` |
| `comparativo_solicitado.provedor_ia` | sim | **inerte por desenho** | tabela fora de escopo | preservar | silêncio: `estado_do_processo` |
| `comparativo_solicitado.modelo_ia` | sim | **inerte por desenho** | tabela fora de escopo | preservar | silêncio: `estado_do_processo` |
| `entrevista_guias.provedor_ia` | sim | **inerte por desenho** | tabela fora de escopo | R4 em bloco | n/a |
| `entrevista_guias.modelo_ia` | sim | **inerte por desenho** | tabela fora de escopo | R4 em bloco | n/a |

**As 16 estão fechadas, e três células merecem ser lidas com atenção, porque «—» e «n/a»
não são a mesma coisa que «esquecido».**

1. **«inerte por desenho» (4 colunas).** `comparativo_solicitado` e `entrevista_guias`
   estão excluídas no nível de TABELA no `export-scope-rules.yaml` (`pii_de_terceiro` e
   `configuracao_do_produto`). O fecho inverso do `gen-export-allowlist.cjs` diz, em
   comentário próprio que eu li antes de decidir: *«Tabela fora de escopo já é coberta
   pelo fecho de TABELA — uma decisão de coluna sobre tabela excluída é inerte, não
   órfã»*. Ele a ignora **em silêncio**. Escrever quatro vereditos ali produziria quatro
   linhas que parecem proteger algo, não protegem nada, e que nenhum portão reprovaria por
   envelhecerem. É também por isso que essas 4 **nunca** aparecem no drift: o predicado
   dele não varre tabela excluída.
2. **«R4 em bloco» (4 colunas).** `analise_candidato_vaga` e `entrevista_guias` são
   cobertas em bloco pela regra R4 na lista `tabelas_sem_pii_titular`, e uma coluna não
   pode ser classificada nos dois lugares. Para `analise_candidato_vaga` isso é
   consequência DIRETA da opção (c): dar-lhe seção em `tabelas:` é exatamente o movimento
   que pertence ao 49-29. As duas dela têm veredito de export escrito, que é o artefato
   onde a decisão delas morde; o comentário na lista diz onde elas entram quando a tabela
   sair.
3. **«n/a» no recibo (4 colunas).** O universo do recibo é `Object.keys(inv.tabelas)` menos
   as fora de escopo DELE — `analise_candidato_vaga` e `entrevista_guias` não estão em
   `tabelas:`, logo o fecho de cobertura nem chega a elas. Já `comparativo_solicitado`
   **está** em `tabelas:` e **não** está no `FORA_DO_ESCOPO_DO_TITULAR` daquele gerador:
   para ela a razão de recibo é obrigatória, e sem ela o fecho reprovaria. Os dois escopos
   são artefatos diferentes e não têm de coincidir — e é a leitura contrária («está fora
   de escopo, então não precisa de nada») que produziria uma reprovação.

Contra o outro lado do balanço: o recibo fecha agora **235 de 235** colunas em escopo com
veredito (eram 230 no fim da Task 1; as 5 novas razões são as 3 de `redacoes_candidato` e
as 2 de `comparativo_solicitado`), e o `export-allowlist.json` segue com **378** colunas
exportadas — nenhuma das 9 entra na cópia, e é por isso que `meta.versao` **não** subiu de
novo: nem a versão nem o conjunto se movem por causa delas.

**Por que 16 e não outro número, medido:** a consulta devolveu **19** linhas. Três são
homônimas PRÉ-EXISTENTES e já catalogadas — `comparativo_solicitado.solicitado_por`,
`entrevista_guias.tipo` e `redacoes_candidato.texto_hash` —, conferidas uma a uma para não
serem duplicadas. 19 − 3 = 16. E o drift contra PROD fecha pelo outro lado: **12** da fase
em tabela em escopo + **4** em tabela fora de escopo (que o predicado do drift não varre,
por desenho) = 16.

## `anon` medido com `SET LOCAL ROLE anon`, VIEWS incluídas — não inferido das ACLs

| O que | Medido |
|---|---|
| `anon` tem GRANT de SELECT nas 5 tabelas? | **sim**, de TABELA (todas as colunas) — as 16 herdam a exposição da tabela |
| RLS ligada nas 5? | **sim** nas 5; `forcerowsecurity` = false; nenhuma policy nomeia `anon` |
| `anon` lê `entrevista_analises` / `entrevista_guias` | **42501** (privilégio insuficiente) |
| `anon` lê `redacoes_candidato` / `analise_candidato_vaga` / `comparativo_solicitado` | **0 linhas** |
| Views em `public` | 10; **nenhuma** expõe coluna alguma da fase |
| Views que `anon` pode SELECIONAR | `v_fila_trabalho` e `v_triagem_panel` — as duas com `security_invoker=true`, e sob `anon` também **42501** |

A diferença entre 42501 e 0 linhas foi medida, não suposta: as policies das duas tabelas
que erram são `{public}` (valem para `anon`) e sub-consultam `candidaturas`, e
`has_table_privilege('anon','candidaturas','SELECT')` = **false**. `vagas` = true, e é por
isso que `comparativo_solicitado` devolve 0 em vez de erro.

**Achado pré-existente, registrado e NÃO consertado:** `v_analises_presas` é a forma que a
memória do projeto nomeia como perigosa — `security_invoker` **não setado** (semântica de
definidor) e dono `postgres`, logo **ignora RLS** — e tem SELECT para `authenticated`. Lida
a definição: expõe `candidatura_id`, `vaga_id`, `vaga_slug`, `data_candidatura`, situação,
`erro` e o tempo parada. Nenhuma coluna da fase, nenhum nome, nenhum CPF. `anon` não a
alcança. Fora do escopo deste plano; qualquer candidato autenticado consegue listar as
candidaturas travadas do sistema.

## O portão morde — cinco mutações, TRÊS mecanismos diferentes, e uma que não morde

Cada mutação foi revertida por cópia de arquivo, com md5 conferido depois (nunca
`git stash`, nunca `git clean` — proibição do executor).

| Mutação | Inversão | Quem falou |
|---|---|---|
| **M2** | veredito `export: true` em `solicitado_por` | a **asserção da R2** do plano: `exit 1`, «solicitado_por na copia do titular (esperado fora)» |
| **M3** | razão de silêncio de `texto_hash`/`ai_call_log_id` removida | **`gen-recibo-exclusao`**: 2 × ERRO DE FECHAMENTO (cobertura), nomeando as duas; nenhum artefato produzido |
| **M4** | os dois `VALUES` do drift estagnados | **asserção (k)**: «o `VALUES` da CTE `allowlist` envelheceu — rode --sql-values: expected […(376)] to deeply equal […(378)]» |
| **M5** | `texto_hash` classificada `apagar` | **`gen-recibo-exclusao`**: SILÊNCIO PROIBIDO + DIREÇÃO ERRADA — o motor não a apaga, e o gerador recusa prometer que apaga |
| **M1 / M1b / M1c** | os vereditos de export removidos | **o FECHO NÃO MORDE** — ver abaixo |

### ⚠ O achado: o fecho deste arquivo deixou de proteger estas colunas, e a culpa é da própria classificação

Apagar os seis vereditos de export **não reprova a geração** — ela sai com `exit 0`. Razão
medida: o passo 4 do `gen-export-allowlist.cjs` (entrada explícita do inventário) resolve a
coluna ANTES de o fecho poder sobrar, e `preservar` a empurra **para dentro** da cópia. Com
os vereditos fora, **`texto_hash`, `ai_call_log_id`, `provedor_ia` e `modelo_ia` ENTRAM na
cópia do titular** com proveniência `inventario:preservar`, e nada no gerador reclama.

Quem reprova, medido na mesma mutação (M1c), são as asserções **(b)**, **(j)** e **(k)** do
`exportAllowlist.test.ts` — três reprovações nomeando as colunas. É a divisão de universos
que aquele arquivo declara, funcionando: o fecho pega **coluna sem fonte**, o snapshot pega
**mudança de conjunto**.

Isto está escrito dentro do `export-scope-rules.yaml`, ao lado dos vereditos, porque a
leitura natural — «coluna `text` sem veredito reprova o fecho» — é verdadeira **só enquanto
a coluna não tem entrada no inventário**, e as seis têm. A exceção é `solicitado_por`: a R2
roda antes do passo 4 e, na mesma mutação, ele continuou FORA.

## Varredura de portões pela FORMA (D-50 / D-56)

Padrão exato do `CLAUDE.md`: **315 achados** em `supabase/tests/*.sql`.

⚠ O 49-21 registra **311**. O número foi re-medido contra o **HEAD**, antes de qualquer
edição minha: **já era 315**. A diferença são as próprias cláusulas que o 49-21 acrescentou
ao `p45_motor_exclusao_smoke.sql`; **este plano contribuiu com ZERO** — nenhum arquivo sob
`supabase/tests/` aparece no meu diff.

Forma que eu toquei, e a classificação: os dois blocos `VALUES` do
`05-export-allowlist-drift.sql` **são** listas literais, e são **escopo deliberado** — são
GERADOS pelo gerador e a asserção (k) os compara com o artefato a cada execução. É
comparação com baseline derivada da própria fonte, não fotografia que envelhece; e o
arquivo não está no escopo da varredura (`docs/compliance/sql/`, não `supabase/tests/`).

## Os cinco itens herdados, cada um com veredito

### 1. BD-9 meio-fechada (49-12) — PENDÊNCIA DECLARADA, não resolvida

Conferida em PROD: as **5 linhas seguem carregando a cópia** da justificativa
(`d47 = 5`, textos de 55 a 372 caracteres), e `d46 = 0` confirma que a metade APROVADA
continua aplicada. Os dois caminhos são diferentes e a assimetria é a decisão do operador:
a **D-46 (aprovada)** fechou a EXPORTAÇÃO; a **D-47 (recusada)** cobriria a TRILHA DE
AUDITORIA, e essa segue aberta.

⚠ **Correção de registro:** o 49-12 lista `2b7b0e1b`, `5e4357b9`, `9c01dc72`, `dda6287d`,
`e0b90cfe` chamando-as de «candidaturas». Medido: são **`historico_candidatura.id`** — ids
de LINHA. Elas cobrem **4 candidaturas**: `0b1c887b`, `6e5d8051`, `2ce20fbf` (duas linhas) e
`d31c78bb`, esta última a conta real que o 49-12 nomeia. O estado não mudou; o rótulo
estava errado, e um id de linha lido como id de candidatura manda a próxima pessoa procurar
no lugar errado.

**A BD-9 entra no fecho do M8 como MEIO-FECHADA.** Marcá-la fechada seria o
registro-que-mente de que este projeto tem entrada de defeito.

### 2. Resíduo do D-70 — DOCUMENTADO, com a razão e o limite exatos

`redacoes_candidato.texto_hash`, `.input_hash` e `entrevista_analises.texto_hash`
sobrevivem à exclusão **de propósito**: são o vínculo com `ai_call_logs` que os planos
49-10/49-12 construíram e a chave de idempotência de que o D-40 depende; apagá-los desfaria
a proveniência que o JORN-28 exige.

O limite, dito sem suavizar e sem inflar: **permitem CONFIRMAR um texto adivinhado por quem
já tenha acesso ao banco — nunca RECUPERAR o texto.** Exige as duas coisas ao mesmo tempo:
acesso ao banco **e** o palpite.

Registrado em três lugares para a Task 1 (`entrevista_analises.texto_hash`): a nota da
coluna no `pii-inventory.yaml`, a razão do veredito de export, e `chave_tecnica` em
`FORA_DO_RECIBO`. O recibo **não afirma em lugar nenhum** que ele foi apagado. `WINDOWS` 77
passou a **`waived`** — não `fixed`: nada foi consertado, o operador ACEITOU. As duas de
`redacoes_candidato` entram na Task 3.

### 3. WINDOWS 81 / D-66 — PERGUNTA ao operador, e o fato herdado estava errado nos DOIS sentidos

Re-medido em PROD em 2026-09-23, só leitura. Está no checkpoint; **nada foi escrito no
recibo**.

| O que a WINDOWS 81 diz | Medido agora | O que muda |
|---|---|---|
| `entrevista_guias`: 2 de 5 guias contêm o primeiro nome do titular | **0 de 5** | Os dois «achados» são a palavra comum **`candidato`** dentro do `rationale` do próprio guia (posições 475 e 629, trecho extraído e lido). Casam por acidente porque a conta de teste se chama **«Candidato Funil Teste»** |
| `analise_candidato_vaga`: 13 de 24 análises | **9 de 25** | E os 9 são **LIMITE INFERIOR** — ver abaixo |

⚠ **E o caso que mais importa é aquele que nenhum probe por nome consegue ver.** Casar
contra o nome ATUAL é estruturalmente cego ao titular que já exerceu a exclusão: o nome
dele foi substituído em `candidatos`. Medido diretamente na linha dele: o **único** titular
anonimizado de PROD tem, em `analise_candidato_vaga.resumo_cv`, o **nome COMPLETO original
— três partes, 132 caracteres — depois da exclusão concluída**. `anonimizar_candidato` não
cita `analise_candidato_vaga` nem nenhuma das três colunas no corpo vivo (md5
`1d8f96c8f21a755ded0505a0b652113a`, 78 301 octetos — o mesmo pin que o 49-21 carimbou).

Consequência direta para a decisão: o item `avaliacoes_e_analises` do recibo promete a esse
titular que as análises «ficaram guardadas **sem ligação com você**», e para aquela linha a
frase é **falsa hoje**. `WINDOWS` **83**.

### 4. WINDOWS 82 — PERGUNTA ao operador, não decidida

O recibo ESCONDE um apagamento na linha da justificativa da decisão: o motor substitui o
texto por um valor fixo, e o recibo diz que ele «continua guardado». Direção segura (o
recibo diz MENOS do que o motor faz) e **falsa ao titular**, numa das TRÊS linhas
obrigatórias da UI-SPEC — prova de não-discriminação. **Nenhuma das três foi tocada.**

### 5. WINDOWS 56 — RESPONDIDA: quem lê é NINGUÉM

O único escritor de `motivos_revisao` e `dimensoes_desconhecidas` é
`supabase/functions/avaliar-redacao/index.ts` (`:480`, `:486`), as duas gravadas
**condicionalmente** (só quando há algo a relatar). **Não existe leitor** — nem em `src/`,
nem em nenhuma outra EF; as demais ocorrências são os testes do próprio arquivo.

Em PROD: **0 de 5** linhas `sjt` carregam qualquer uma das duas chaves hoje (4 de 5 ainda
carregam `respostas`). Ou seja: é **defeito LATENTE**, não perda de dado corrente. A
primeira SJT que for para revisão humana porque a IA inventou o nome de uma dimensão vai
gravar a chave e **nenhuma tela vai mostrá-la** — e aí o RH verá «pendente_humano» sem o
motivo. `WINDOWS` 56 fica **`open`**: a resposta à pergunta do inventário existe; o
conserto é de front e pertence a quem o tocar (D-55).

## A WINDOWS 82, consertada — e a medição que decide a frase

O defeito, dito com precisão: a linha obrigatória `justificativa_do_recrutador` tem
**três origens** e o motor as trata de **duas maneiras opostas**, e a linha fazia **uma
afirmação só** sobre as três. RE-MEDIDO nesta sessão no corpo vivo de
`anonimizar_candidato` (md5 `1d8f96c8f21a755ded0505a0b652113a`, 78 301 octetos — o mesmo
pin que o 49-21 carimbou, conferido antes de escrever uma palavra):

| Origem | `position()` no corpo vivo | O que acontece de fato |
|---|---|---|
| `candidaturas.motivo_rejeicao` | **0** | O motor não a cita. O texto do recrutador sobrevive |
| `avaliacoes_rh.justificativa_recomendacao` | **0** (e a própria tabela: **0**) | Idem: sobrevive |
| `decisao_final.justificativa` (+ a cópia arquivada) | passo em 38 011 | `UPDATE … SET justificativa = <valor fixo>` **INCONDICIONAL** — o que o recrutador escreveu deixa de existir |

O detalhe que confirma a leitura: no MESMO `UPDATE`, a coluna vizinha `revisao_resultado`
recebe `CASE WHEN … IS NULL THEN NULL ELSE <sentinela> END` — condicional, de propósito,
para não inventar uma revisão que não houve. A `justificativa` **não** tem o `CASE`. A
assimetria dentro do mesmo statement é a prova de que o valor fixo ali é incondicional.

**O conserto muda o que a linha DIZ, nunca se ela existe.** Continua em
`OBRIGATORIAS_MANTEM`, continua reivindicando as mesmas quatro colunas, a classificação no
inventário segue `preservar_com_ressalva` (a direção do erro era a segura — o recibo dizia
MENOS do que o motor apaga — e o que faltava era distinguir origem, não reclassificar
coluna), e **as outras duas linhas obrigatórias não têm uma linha de diff**.

**E foi consertada a OUTRA metade que a janela acusa.** `ligacao_com_a_justificativa`, na
coluna «sai», tem como origens **só** o par `decisao_final`/`decisao_final_historico` — as
duas que o motor sobrescreve. Ali a afirmação não era falsa para uma origem entre três: era
falsa para **todas as origens da linha**. Fechar a WINDOWS 82 deixando aquela de pé seria
fechá-la no papel com o defeito vivo um item acima, na mesma tela do titular.

**§K respeitado:** o valor fixo não é citado em nenhum comentário, docblock ou mensagem de
commit. O que está escrito é o que a afirmação alegava e por que era falsa. Quem precisar do
literal lê o corpo da função em PROD, que é a fonte — e é justamente porque os portões desta
fase procuram expressões **no disco** que uma citação «para registro» as deixaria
encontráveis no arquivo que acabou de ser consertado.

**Prova no ar, não no disco** (§N, um marcador por chamada) — e esta parte é o pedido
explícito do operador, porque no 49-25 o que pegou o §K foi o bundle vivo:

| Marcador | Bundle vivo de `executar-direito-titular` (v12, 640 005 octetos) |
|---|---|
| «trocado por um aviso padrão» (texto novo) | **3** |
| «a recomendação escrita por quem avaliou» (linha obrigatória nova) | **3** |
| a afirmação retirada da coluna «sai» | **0** |
| a afirmação indistinta retirada da linha obrigatória | **0** |

## O D-66, e por que o texto do recibo NÃO mudou

O operador leu o checkpoint com o fato re-medido e escolheu a opção **(c)**:
desidentificar no motor. As opções (a) e (b) — as duas que reescreveriam a promessa ao
titular — foram **recusadas**, e a razão importa: o item `avaliacoes_e_analises` promete
que as análises ficam guardadas «sem ligação com você», e a escolha foi fazer o motor
**cumprir** essa promessa em vez de enfraquecê-la.

Consequências concretas neste plano, todas deliberadas:

- o texto de `avaliacoes_e_analises` está **intacto** — e isto está escrito em três lugares
  (o inventário, o ledger e aqui) precisamente porque **um texto inalterado é
  indistinguível de um esquecimento** para quem ler depois;
- `analise_candidato_vaga` e `entrevista_guias` **continuam** em `tabelas_sem_pii_titular`;
- `WINDOWS` **83** fica **`open`**, agora com o plano **49-29 NOMEADO como dono dentro da
  própria entrada** — não deixada sem responsável.

**O que mudou foi o REGISTRO, e ele estava errado.** A `nota` da seção afirmava «13 de 24
análises e 2 de 5 guias», com autoridade de medição. As duas metades estavam erradas:

| O que a nota dizia | Medido | Causa |
|---|---|---|
| `analise_candidato_vaga`: 13 de 24 | **9 de 25**, e LIMITE INFERIOR | Casar contra o nome ATUAL é cego ao titular que já se excluiu; na linha dele, `resumo_cv` guarda o nome COMPLETO original |
| `entrevista_guias`: 2 de 5 | **0 de 5** | Os dois «achados» eram a palavra comum `candidato` no `rationale` do próprio guia |

E uma medição nova desta sessão, que fecha o ponto cego para a segunda tabela: **zero de 5
guias pertencem a titular anonimizado** (`entrevista_guias` × `candidaturas` ×
`candidatos` com e-mail `@invalido.local`). Ou seja, o caso que o probe por nome não vê
**não existe** hoje para `entrevista_guias` — enquanto para `analise_candidato_vaga` são
**8 linhas** de titulares já anonimizados com `resumo_cv` preenchido. A ressalva de
`entrevista_guias` fica na lista como **estrutural** (o guia é derivado do currículo e pode
passar a conter o nome), não como medida — e essa distinção está escrita no comentário, para
que o 49-29 decida o escopo dele por medição e não por herança.

## O portão morde sobre as colunas NOVAS — e o achado M1 generaliza

Uma mutação, revertida por cópia de arquivo com md5 conferido de volta
(`16fbe1984f2d1ff2c81e1729ab1bfd72` antes e depois; nunca `git stash`, nunca `git clean`):

**M6 — o veredito de `redacoes_candidato.rubrica_versao` removido.** Predição do achado M1
da Task 1: o fecho **não** morde, porque a entrada explícita do inventário resolve a coluna
no passo 4 antes de o fecho poder sobrar. Medido: a geração sai **`exit 0`**, o artefato
passa de 378 para **379** colunas, e `rubrica_versao` **ENTRA na cópia do titular** com
proveniência `inventario:preservar`. Quem reprova são **(b)**, **(j)** e **(k)** — três
reprovações, a (k) nomeando o número: *«o `VALUES` da CTE `allowlist` envelheceu — rode
--sql-values: expected […(378)] to deeply equal […(379)]»*.

O valor disso não é «o portão mordeu»: é que **o achado M1 não era propriedade daquelas
seis colunas**. Ele vale para qualquer coluna com entrada explícita no inventário, o que
inclui as 5 desta task. A leitura natural («coluna `text` sem veredito reprova o fecho»)
continua falsa, e agora está provada falsa duas vezes, em conjuntos diferentes de colunas.

## Task Commits

1. **Task 1 (tracer): `entrevista_analises` medida, decidida e regenerada — o UUID de quem pediu fica fora da cópia** — `04ac66cc` (feat)
2. **Task 2 (`checkpoint:decision`, `gate="blocking-human"`)** — sem commit: o plano PAROU nela e o operador respondeu em 2026-09-23. A resposta está na tabela do topo e no `<operator_decision>` do prompt da continuação.
3. **Task 3: as 9 colunas restantes decididas, e a linha obrigatória passa a distinguir as suas três origens** — `dc97d071` (feat)

**Nenhuma migration, nenhum apply, nenhuma linha de PROD escrita.** Toda medição rodou com
`SET TRANSACTION READ ONLY`. **Não há entrada de ledger de migration neste plano**, e a
ausência é a verdade: o plano não cria objeto de banco. O que este plano escreveu em
infraestrutura foram **quatro deploys de Edge Function** (duas funções, duas vezes cada),
todos reversíveis por redeploy.

## Deviations from Plan

### Registradas

**1. [Rule 3 — bloqueio] O bump de versão, os dois `VALUES` do drift e os dois snapshots foram feitos na Task 1, não na Task 3**
- **Found during:** Task 1, depois de regenerar o `export-allowlist.json`
- **Issue:** o plano aloca `meta.versao` → 1.3.0, os `VALUES` do drift e os snapshots à Task 3. Mas o CONJUNTO de colunas exportadas muda na Task 1 (entram `tipo` e `superada_em`), e medido: `npx vitest run docs/compliance` reprovou em **3** asserções — os snapshots (b) e (j) e a (k). Deixar a árvore vermelha no fim de uma task `tracer`, e desarmar o único portão que pega mudança de conjunto durante justamente a janela em que ele importa, é a troca errada.
- **Fix:** versão `1.2.0` → `1.3.0` com a razão do bump escrita no comentário; os dois `VALUES` REGERADOS pelo gerador (`--sql-values` / `--sql-values-excluidas`), com a contagem do cabeçalho atualizada pelo que os comandos imprimiram (376+39=415 → 378+44=422); os dois snapshots por `vitest -u`, com o diff conferido linha a linha.
- **Files modified:** `docs/compliance/export-scope-rules.yaml`, `docs/compliance/sql/05-export-allowlist-drift.sql`, `docs/compliance/__tests__/exportAllowlist.test.ts`
- **Verification:** `git diff` do drift = 7 linhas `+`, ZERO `-`; `git diff` do teste = exatamente as 7 chaves (2 em (b), 5 em (j)), nenhuma outra linha movida; 298 testes verdes
- **Committed in:** `04ac66cc`

**2. [Rule 2 — funcionalidade crítica ausente] O custo da classificação explícita foi medido e ESCRITO, em vez de descoberto por quem vier depois**
- **Found during:** Task 1, mutação M1
- **Issue:** M1 (um veredito removido) **não mordeu**, e a conclusão natural («a mutação é inócua») estava errada. Medindo o instrumento: as entradas explícitas que eu mesmo acrescentei ao `pii-inventory.yaml` fazem o passo 4 do gerador resolver a coluna antes do fecho. M1b provou o efeito: os seis vereditos fora ⇒ `exit 0` e quatro colunas de telemetria **na cópia do titular**.
- **Fix:** o custo está escrito no `export-scope-rules.yaml`, ao lado dos vereditos, com a mutação que o provou e com quem de fato reprova (as asserções (b)/(j)/(k), medido em M1c). Nenhuma entrada do inventário foi removida: o D-57 pede a classificação, e o portão existe — só não é o que a leitura natural supõe.
- **Files modified:** `docs/compliance/export-scope-rules.yaml`
- **Verification:** M1c ⇒ 3 reprovações nomeando as colunas; os quatro `check:*` OK depois de restaurar
- **Committed in:** `04ac66cc`

**3. [Rule 1 — número herdado falso] A medição do D-66 estava errada nos dois sentidos, e uma das metades era um substantivo comum**
- **Found during:** preparação do checkpoint da Task 2
- **Issue:** o plano, a WINDOWS 81 e o D-66 afirmam «13/24 análises e 2/5 guias contêm o primeiro nome do titular». Re-medido: `entrevista_guias` = **0 de 5** (os dois casamentos são a palavra `candidato` no `rationale` do guia, porque a conta de teste se chama «Candidato Funil Teste» — trecho extraído e lido), e `analise_candidato_vaga` = **9 de 25**. Pior: casar contra o nome ATUAL é cego ao único titular que exerceu a exclusão, e a linha dele guarda o nome COMPLETO original.
- **Fix:** nada corrigido no motor nem no recibo — é decisão do operador. A medição foi levada ao checkpoint e registrada em `WINDOWS` **83**, com a causa de cada falso positivo/negativo nomeada.
- **Files modified:** `.planning/WINDOWS.md`
- **Verification:** consultas só-leitura em PROD, linha a linha, com o trecho em volta de cada casamento extraído; `position()` no corpo vivo do motor = 0 para a tabela e as três colunas
- **Committed in:** commit de metadado deste plano

**4. [Registro] `WINDOWS` 77 marcada `waived`, e a assinatura do verbo foi lida no fonte**
- **Found during:** registro do D-70
- **Issue:** a 77 pedia «avaliar no 49-21», e o 49-21 devolveu a avaliação ao 49-17. A avaliação EXISTE — é o D-70 —, mas nada foi consertado: `fixed` seria a mentira.
- **Fix:** `windows waive 77 "<razão>"`, com a assinatura lida em `broken-windows.cjs:1043` (§O: nunca sondar verbo de escrita por execução — a sonda do 49-22 gravou um `fixed` sem razão que não pôde desfazer). A razão vive no bloco JSON, que é a fonte, e a tabela é gerada pela própria ferramenta.
- **Files modified:** `.planning/WINDOWS.md`
- **Verification:** razão LIDA DE VOLTA do JSON; `windows status` = `ok: true` **e** `windows append` aceitou duas entradas (§M: o `append` é o comparador FORTE, o `status` é o fraco)
- **Committed in:** commit de metadado deste plano

**5. [Rule 4 — decisão do operador supera a asserção escrita] A cláusula do D-66 no `<verify>` da Task 3 REPROVA de propósito**
- **Found during:** Task 3, ao rodar o primeiro `<verify>` verbatim
- **Issue:** a asserção diz «se `analise_candidato_vaga` OU `entrevista_guias` ainda estiverem em `tabelas_sem_pii_titular`, reprove». Ela foi escrita presumindo a opção (a) ou (b) do checkpoint. Sob a **(c)**, que o operador escolheu, ela pede **o contrário** do que foi decidido: tirar as tabelas da lista hoje obrigaria o recibo a dar um veredito por coluna, e o único disponível sem mentir seria justamente a linha nova de copy que as opções (a)/(b) propunham e que ele recusou.
- **Fix:** nenhuma edição de plano e nenhum comando maquiado. Rodei o `<verify>` **verbatim** para registrar a reprovação exata (`Error: D-66: as duas tabelas ainda estao em tabelas_sem_pii_titular`, `EXIT_VERIFY1=1`) e depois a MESMA cadeia com a cláusula invertida — afirmando que as duas **continuam** na lista, que é o estado correto sob a (c) — e essa saiu `exit 0`. Toda a cadeia anterior à cláusula (3 geradores, 4 `check:*`, 298 testes, versão `1.3.0`) passou nas duas execuções.
- **Files modified:** nenhum por causa disto
- **Verification:** as duas execuções registradas; a razão está escrita também na `nota` do inventário e na entrada 83 do ledger, para não depender deste SUMMARY
- **Committed in:** `dc97d071` (o registro) — a asserção do plano ficou como está

**6. [Rule 1 — registro-que-mente pequeno, pego em mim mesmo] O campo `medido_em_task_3` recebeu um instante ARREDONDADO**
- **Found during:** Task 3, ao calcular a duração para este SUMMARY
- **Issue:** eu havia carimbado `2026-09-24T00:00:00Z` num campo chamado `medido_em_*`, dentro do arquivo cuja única função é ser medido. Ninguém teria reprovado — nenhum portão confere carimbo — e é exatamente isso que faz esta classe de defeito sobreviver. O topo do `CLAUDE.md` documenta o custo: registro desatualizado custa mais que registro ausente, porque chega com autoridade.
- **Fix:** `SELECT now()` na MESMA consulta que reconfirmou as 9 colunas ⇒ `2026-09-24T05:24:14Z`, lido do banco. A `nota` da entrada diz agora, com estas palavras, que o instante foi lido e não arredondado.
- **Files modified:** `docs/compliance/catalogo-vivo-44.json` (e os 5 artefatos gerados, cujo único delta foi o `gerado_em`)
- **Verification:** os 3 geradores + 3 `check:*` verdes depois; `git diff` dos artefatos = só linhas `gerado_em`. E as duas EFs redeployadas outra vez para o ar não ficar com o carimbo anterior
- **Committed in:** `dc97d071` (emendado antes do push)

---

**Total deviations:** 6 (1 de bloqueio, 1 de funcionalidade crítica, 1 de número herdado
falso, 1 de registro, 1 de asserção superada por decisão do operador, 1 de carimbo
arredondado). **O estado vivo bateu com o que o plano assume nas 16 colunas, nos tipos, nas
nulidades e nas duas contagens de drift (14 antes, 9 depois).** O que o plano **não** previa,
em ordem de importância: que a classificação explícita desarma o fecho que ele cita como
portão (e que isso vale para qualquer coluna classificada, não só as seis da Task 1); que o
fato do D-66 — escrito em três documentos com autoridade de medição — está errado nos dois
sentidos; e que uma das suas próprias asserções ficaria em contradição com a decisão que o
seu próprio checkpoint produziu. **Impact on plan:** nenhum item de escopo ficou sem
tratamento; o único desvio de resultado é o D-66, que saiu deste plano por decisão explícita
e entrou no 49-29 com dono nomeado.

## Registrado, não consertado

- **`v_analises_presas`** — view com `security_invoker` **não setado** e dono `postgres`
  (logo ignora RLS), com SELECT para `authenticated`. Expõe ids de candidatura, vaga, slug,
  data, situação e mensagem de erro de análise. **Nenhuma coluna da fase, nenhum nome,
  nenhum CPF**, e `anon` não a alcança. Pré-existente, fora do escopo deste plano.
  ⚠ **Task 3:** este achado passou a existir no **ledger** (`WINDOWS` **85**), com o
  conserto nomeado (`ALTER VIEW … SET (security_invoker = true)` mais a re-medição de quem
  a lê antes e depois). Até aqui ele vivia só neste SUMMARY, que é a forma de registro que
  **não sobrevive à fase** — o mesmo defeito, um nível acima, que o §K documenta.
- **As 9 colunas de drift pré-existente** (`candidatos.faixa_etaria_materializada`,
  `candidaturas.encerrada_a_pedido_em` e 7 de `solicitacoes_dados`) seguem sem veredito, por
  decisão da Phase 48. Re-medidas nesta sessão: as mesmas 9.
- **`npm run lint` = 89**, teto 90 (D-53). Os dois quebrados pré-existentes seguem
  quebrados e **não** foram «consertados»: `resend-webhook.test.ts` (`npm:svix@1.99.1`) e
  `_shared/__tests__/strict-schema.test.ts:88`.
- **`p46_purga_smoke (j.2)`** não reprova mais, e isso é o resultado ESPERADO do plano
  49-28. Não é drift inexplicado e não foi re-investigado.
- **WINDOWS 56** fica `open`: a pergunta do inventário está respondida (ninguém lê), o
  conserto é de front.
- **WINDOWS 82** ⇒ **`fixed`** na Task 3, com a razão escrita no bloco JSON (o verbo
  `fixed` não aceita razão — §M, lido no fonte) e a célula da tabela regenerada pelo
  `renderTable` da própria ferramenta sobre o JSON editado, nunca redigitada.
- **WINDOWS 83** fica **`open`**, com o plano **49-29** nomeado como dono dentro da
  entrada. É a decisão do operador, não uma pendência sem responsável.
- **WINDOWS 85** nova e `open`: `v_analises_presas`.
- **As 9 colunas de drift pré-existente** continuam sem veredito (decisão da Phase 48),
  re-medidas em 2026-09-24: as mesmas 9, uma a uma.

## Known Stubs

Nenhum. O plano produz artefatos de compliance gerados pelos geradores, vereditos em YAML
e o registro de um ledger — não há componente, valor vazio codificado, texto de placeholder
nem fonte de dados não ligada. As 9 colunas sem veredito **não são stub**: são o escopo
declarado da Task 3, e o `05-export-allowlist-drift.sql` as lista em voz alta a cada
execução, que é o oposto de um silêncio.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. As quatro mitigações declaradas,
provadas por execução:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-17-01 (UUID de funcionário na cópia) | mitigate | `solicitado_por` FORA do artefato com razão `pii_de_terceiro (R2)`, conferido por asserção; e a mutação M2 prova que a asserção morde |
| T-49-17-02 (recibo prometendo «sem ligação» sobre texto com o nome) | mitigate | nenhum texto de titular escrito — a decisão é do operador, no checkpoint, e chega a ele com o fato RE-MEDIDO |
| T-49-17-03 (artefato gerado editado à mão) | mitigate | só os geradores escreveram os artefatos; os `VALUES` do drift também (`--sql-values`); os quatro `check:*` OK depois de tudo |
| T-49-17-04 (decisão escrita que não chega à cópia real) | **mitigate — FECHADA na Task 3** | as duas EFs redeployadas (`exportar-meus-dados` v5, `executar-direito-titular` v12, ACTIVE `verify_jwt=true`), com o marcador provado no bundle VIVO, um por chamada: 3× `superada_em` numa, 3× o texto novo da linha obrigatória na outra, e ZERO ocorrência das afirmações retiradas |
| T-49-17-SC (supply chain) | mitigate | zero instalação de pacote |

Adicional não previsto no `<threat_model>`, e **registrado em vez de consertado**: o nome
COMPLETO do único titular excluído sobrevive em `analise_candidato_vaga.resumo_cv`
(`WINDOWS` 83). É o insumo central da decisão do operador — e, com a opção (c) escolhida,
passou a ser o objetivo declarado do plano 49-29, não uma pendência sem destino.

Nenhuma superfície nova na Task 3: ela escreve YAML de veredito, comentários de gerador e
copy de recibo, e redeploya duas funções cujo `verify_jwt` continua `true`. O único vetor
que ela move é o texto que o titular lê — e a mudança é na direção de dizer a verdade sobre
um apagamento que já acontecia.

## Issues Encountered

- **Uma mutação que não morde pode ser o achado, não o instrumento.** A M1 saiu «não
  mordeu» e o §L manda desconfiar do harness. Desta vez o harness estava certo e o
  **desenho** era a surpresa: a entrada explícita no inventário resolve antes do fecho.
  Medi o efeito (M1b) e depois QUEM reprova (M1c) antes de escrever qualquer veredito.
- **O meu `restore()` não restaurou, e o arquivo ficou mutado.** Em zsh, `for f in $FILES`
  com `FILES` como string não faz word-split; o `cp` recebeu tudo como um caminho só e
  falhou. Peguei porque **confiro md5 depois de cada restauração** — sem isso, a mutação
  M1b teria ido para o commit. Defeito de instrumento, medido antes de qualquer conclusão.
- **`h.etapa` não existe em `historico_candidatura`.** Duas consultas abortaram em 42703
  antes de eu ler o schema. Custo baixo, lição repetida: ler a coluna, não supô-la.
- **Os 5 ids da BD-9 não são candidaturas.** Procurei-os em `candidaturas`,
  `historico_candidatura.candidatura_id` e `decisao_final` — 0 linhas nas três. São
  `historico_candidatura.id`. A conclusão natural («as linhas foram limpas, a D-47 foi
  aplicada por alguém») estava a uma linha de distância e era **falsa**: as 5 linhas estão
  todas lá.
- **O primeiro probe do D-66 devolveu 0/5 em `entrevista_guias` contra os 2/5 herdados.**
  Antes de acusar o documento, li o trecho: os 2/5 herdados eram a palavra `candidato`. O
  erro estava no número herdado, não no meu probe — mas eu só soube disso depois de medir
  o meu.
- **`windows status --raw` não reporta `counts.open`** no formato que eu esperava
  (`undefined`). Não confiei nele: usei o `append`, que é o comparador forte (§M).

### Task 3

- **A ferramenta do ledger RECUSOU mutar, e a recusa estava certa.** Editei o bloco JSON à
  mão (a razão do `fixed` 82 e o dono do 83) e o `windows fixed 82` respondeu
  «*disagrees with the fenced JSON entries … for row id(s): 82, 83*». O §M explica: a tabela
  é gerada a partir do JSON, e ela valida ANTES de mutar. A saída não é redigitar a célula —
  é chamar o `renderTable` **da própria ferramenta** sobre o JSON já editado e substituir as
  duas linhas por código. Um comparador que recusa é melhor que um que aceita.
- **`renderTable(d.entries || d)` renderizou «_No windows recorded._» sobre 84 entradas.** O
  bloco JSON é um **array**, e `array.entries` é um método do protótipo — logo truthy, logo
  passei uma **função** para o renderer, cujo `.length` é o número de parâmetros: zero. O
  idioma defensivo `a || b` produziu silenciosamente o caso vazio. Peguei porque conferi a
  contagem de linhas renderizadas (3) contra o esperado (86) antes de escrever no arquivo.
- **O meu próprio `medido_em` estava arredondado.** Ver o desvio 6. É a segunda vez nesta
  fase que o defeito encontrado é do **instrumento de quem mede**, não do medido.
- **O `<verify>` do plano contradisse a decisão do checkpoint do plano.** Rodei-o verbatim
  em vez de editá-lo, porque a reprovação registrada é informação e um comando maquiado não
  é. A tentação aqui é real: bastava tirar a cláusula e ninguém veria a diferença.
- **A primeira ideia para o D-66 era ERRADA e quase a executei.** Como o `<verify>` pede as
  tabelas fora da lista, comecei a desenhar como tirá-las — e o caminho levava, em três
  passos, a acrescentar `analise_candidato_vaga.resumo_cv` como origem do item
  `avaliacoes_e_analises`, ou seja a fazer o recibo prometer «sem ligação com você» sobre um
  texto que contém o nome. Isso é literalmente a proibição JORN-07 do próprio plano. O que
  me parou foi ler o fecho de cobertura do gerador **antes** de editar, não depois.

## User Setup Required

None — nenhuma configuração de serviço externo. O token do Supabase já está no Keychain
(serviço "Supabase CLI", conta "supabase").

## Next Phase Readiness

**Este plano está COMPLETO.** As três tasks rodaram, o inventário da fase fechou, e as
duas EFs carregam no ar exatamente o que está no disco.

**O que sai daqui para o plano 49-29 (onda 8, roda ANTES do 49-18 e do 49-19):**

- o **escopo** dele deve ser MEDIDO, não herdado, e as medições prontas estão aqui:
  `analise_candidato_vaga` = 9 de 25 com o nome atual (**limite inferior**) e **8 linhas**
  de titulares já anonimizados com `resumo_cv` preenchido; `entrevista_guias` = **0 de 5**
  com o nome, e **0 de 5** guias pertencentes a titular anonimizado — ou seja, para essa
  tabela nem o caso cego existe hoje, e a ressalva dela é estrutural;
- o **texto do recibo não muda** (é a premissa da opção (c)), e o item
  `avaliacoes_e_analises` é o que ele faz voltar a ser verdadeiro;
- as colunas de telemetria que este plano acabou de decidir (`provedor_ia`, `modelo_ia`,
  `rubrica_versao`) **não são dado do titular** e não devem ser tocadas pelo passo novo;
- quando o 49-29 tirar `analise_candidato_vaga` de `tabelas_sem_pii_titular`, as duas
  colunas dela ganham entrada explícita em `tabelas:` — o comentário na lista já diz isso,
  e é nesse momento que a reclassificação do D-66 acontece;
- `WINDOWS` **83** é a entrada dele, já nomeada.

**Itens abertos declarados no fecho do M8** (nenhum é surpresa, todos têm registro):

| Item | Estado | Dono |
|---|---|---|
| **BD-9** | **MEIO-FECHADA** — D-46 aplicada (exportação), D-47 recusada (a cópia na trilha fica) | decisão do operador, registrada |
| **WINDOWS 83** / D-66 | `open` | plano **49-29** |
| **WINDOWS 85** (`v_analises_presas`) | `open` | quem tocar as views (D-55) |
| **WINDOWS 56** | `open` — pergunta respondida, conserto é de front | quem tocar a tela (D-55) |
| **WINDOWS 77** / D-70 | `waived` — resíduo ACEITO pelo operador, não consertado | — |
| 9 colunas de drift pré-existente | sem veredito, por decisão da Phase 48 | — |

**Atenção:** `tsc` em **89**, teto 90 (D-53) — margem de **um**. Os dois quebrados
pré-existentes seguem quebrados e **não** foram «consertados»: `resend-webhook.test.ts`
(`npm:svix@1.99.1`) e `_shared/__tests__/strict-schema.test.ts:88`.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Task 1 + checkpoint: 2026-09-23 · Task 3 e fecho: 2026-09-24*

## Self-Check: PASSED

### Task 3 (agente de continuação, 2026-09-24)

- commits anteriores CONFERIDOS antes de construir sobre eles: `04ac66cc` e `781225b2`
  presentes, `git log --oneline origin/main..HEAD` VAZIO no início, árvore limpa
- `docs/compliance/catalogo-vivo-44.json` — FOUND (item `fase: 49` com **16** colunas na
  MESMA entrada, `medido_em_task_3` lido do banco; portão de round-trip e portão de
  não-duplicação ativos — o primeiro abortou uma vez, corretamente, porque o arquivo não
  termina em newline, e o script foi corrigido em vez de o portão ser afrouxado)
- `docs/compliance/export-scope-rules.yaml` — FOUND (5 vereditos novos + a razão escrita de
  as outras 4 não terem; `meta.versao` **NÃO** re-bumpada, continua `1.3.0`)
- `docs/compliance/pii-inventory.yaml` / `.md` — FOUND (5 classificações novas; `nota` do
  D-66 corrigida pelo re-medido; os dois comentários inline corrigidos com o dono nomeado)
- `docs/compliance/sql/gen-recibo-exclusao.cjs` — FOUND (5 razões novas + as duas linhas da
  WINDOWS 82; `OBRIGATORIAS_MANTEM` inalterado)
- `docs/compliance/sql/05-export-allowlist-drift.sql` — FOUND (`VALUES` regerados,
  422 → 427; 5 linhas `+`, ZERO `-`)
- `docs/compliance/__tests__/exportAllowlist.test.ts` — FOUND (snapshot: as MESMAS 5
  chaves, zero linha removida)
- `database.types.ts` — FOUND (217 982 octetos, não vazio; `superada_em`, `rubrica_versao`,
  `registrar_analise_entrevista`)
- `.planning/WINDOWS.md` — FOUND (82 `fixed` com razão lida de volta do JSON; 83 `open` com
  o dono 49-29 dentro da entrada; 85 acrescentada; `status` **e** `append` concordam — o
  `append` aceitou, que é o comparador forte)
- commits `04ac66cc` e `dc97d071` — FOUND
- `commits: 4` = MEDIDO por `git rev-list --count 91a753bc..HEAD` no instante da escrita
  (HEAD = `dc97d071`), não narrado; `tokens: 15465` medido nos dois diffs
- `<acceptance_criteria>` da Task 3 re-executados um a um: **(1)** as 16 colunas com
  veredito / classificação / razão de recibo / medição onde cada artefato as cobre, versão
  `1.3.0`, **e o D-66 aplicado conforme a decisão da Task 2 — que sob a opção (c) é
  NÃO aplicá-lo aqui**; **(2)** os quatro `check:*` e os 298 testes verdes, snapshots
  mudados só pelas 5 colunas da fase; **(3)** o drift sem coluna da fase (9 linhas, as
  pré-existentes listadas); **(4)** as duas EFs `verify_jwt=true` com o marcador no bundle,
  tipos finais, `tsc` = 89 ≤ 90
- `<verify>` da Task 3: os quatro blocos rodados. O bloco 1 reprova **na cláusula do D-66**,
  de propósito e registrado como desvio 5 — a cadeia inteira antes dela passa, e a versão
  com a cláusula invertida (o estado correto sob a (c)) sai `exit 0`
- portão provado por mutação nas colunas NOVAS (M6), revertido por cópia com md5 conferido

- `docs/compliance/catalogo-vivo-44.json` — FOUND (7 colunas + item `fase: 49`; diff só aditivo, 66 linhas `+`, 0 `-`)
- `docs/compliance/export-scope-rules.yaml` — FOUND (6 vereditos + versão 1.3.0 + o achado M1)
- `docs/compliance/pii-inventory.yaml` / `.md` — FOUND (7 classificações / regenerado)
- `docs/compliance/sql/gen-recibo-exclusao.cjs` — FOUND (7 razões em `FORA_DO_RECIBO`)
- `docs/compliance/sql/05-export-allowlist-drift.sql` — FOUND (VALUES regerados, 7 linhas `+`, 0 `-`)
- `docs/compliance/export-allowlist.json` · `recibo-exclusao.json` — FOUND (regenerados)
- `docs/compliance/__tests__/exportAllowlist.test.ts` — FOUND (2 snapshots, diff = as 7 chaves)
- `supabase/functions/_shared/exportAllowlist.ts` · `reciboExclusao.ts` · `src/features/privacidade/constants/reciboExclusao.generated.ts` — FOUND (regenerados)
- `.planning/WINDOWS.md` — FOUND (77 `waived` com razão lida de volta do JSON; 83 acrescentada; 84 sonda de comparador, `waived`; `status` e `append` concordam)
- commit `04ac66cc` — FOUND
- `commits: 1` = MEDIDO por `git rev-list --count 91a753bc..HEAD` no instante da escrita (HEAD = `04ac66cc`), não narrado
- `<acceptance_criteria>` da Task 1 re-executados: as 7 no catálogo num item `fase: 49` datado e **nenhuma outra coluna nesta task**; vereditos, classificação e razão de recibo das 7 com razão; artefatos regenerados; os três `check:*` verdes; o artefato exporta `tipo`/`superada_em` e não exporta `solicitado_por`
- `<verify>` da Task 1 re-executado AGORA, verbatim ⇒ `VERIFY_TASK1_EXIT=0`
- `<verify>` da Task 2 re-executado ⇒ `gen-recibo-exclusao.cjs:611` tem `item_id: 'avaliacoes_e_analises'` (o item da decisão está onde o plano diz)
- portão de realimentação do tracer: `<verify>` re-rodado de ponta a ponta, verde ⇒ ⚡ tracer verificado; e a Task 2 é `gate="blocking-human"`, logo PARO nela em todo modo
- `npm run -s lint` = 89 ≤ 90
- `git log --oneline origin/main..HEAD` = **VAZIO** depois do push
