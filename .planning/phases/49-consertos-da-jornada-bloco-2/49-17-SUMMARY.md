---
phase: 49-consertos-da-jornada-bloco-2
plan: "17"
subsystem: compliance
tags: [lgpd, export-allowlist, pii-inventory, recibo-exclusao, catalogo-vivo, d-57, d-66, d-70, checkpoint, mutation-testing]

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
affects: [49-17-task-3, fecho-do-M8]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4).
actuals:
  tokens: 6985
  tasks: 1
  commits: 1
  plan_head_before: 91a753bc9d2dabe9e87f0ab4d05b35b8c7356617
  # `commits: 1` = MEDIDO por `git rev-list --count 91a753bc..HEAD` no instante em que
  # este SUMMARY foi escrito (HEAD = 04ac66cc). Re-medir DEPOIS deste ponto dá um número
  # MAIOR, e isso NÃO é divergência: o commit de metadado deste plano entra no mesmo
  # intervalo por construção, porque o `plan_head_before` é anterior a ele.
  # `tokens: 6985` = 27 940 chars acrescentados pelo diff `91a753bc..04ac66cc`, / 4.
  # ⚠ A estimativa do plano era 110 000 para TRÊS tasks. Este SUMMARY fecha UMA — o
  # plano PAROU no `checkpoint:decision` da Task 2, que é `gate="blocking-human"`. O
  # 0,06x NÃO é uma estimativa ruim: é um plano executado até um terço, de propósito, e
  # comparar os dois números como se medissem a mesma coisa corromperia a calibração.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Acrescentar coluna ao catálogo vivo por SCRIPT com portão de round-trip: o script aborta se `JSON.stringify(parse(raw),null,2) !== raw`, e aborta de novo se qualquer coluna a acrescentar JÁ existir. Sem o primeiro portão, uma reescrita reformataria 5 342 linhas e o diff deixaria de ser auditável; sem o segundo, um acréscimo viraria re-medição em silêncio"
    - "Regerar bloco `VALUES` de SQL por substituição ANCORADA e VALIDADA pela forma: o script exige que TODA linha do bloco antigo casse `('tabela','coluna'),?` antes de substituir. Um bloco com comentário no meio abortaria em vez de ser engolido — e o diff resultante (7 linhas, nenhuma outra movida) é o que prova que nada mais mudou"
    - "Um probe por NOME contra uma base cujo titular se chama como um substantivo comum produz falso positivo, e o falso positivo se apresenta como PII: ler o TRECHO em volta de cada casamento antes de contar. Dois de cinco guias 'com o nome do titular' eram a palavra `candidato` no rationale do próprio guia"
    - "Casar contra o nome ATUAL é estruturalmente cego ao titular que JÁ exerceu a exclusão: o nome dele foi substituído, e nenhum probe por nome encontra o que sobrou no texto. O caso que mais importa é exatamente o que o instrumento não vê — medir a linha dele diretamente, não pela contagem"
    - "Descobrir a assinatura de um verbo de ESCRITA lendo o fonte da ferramenta (§O): `windows waive <id> \"<reason>\"` foi lido em `broken-windows.cjs:1043`, nunca sondado por execução — e é ele, não `fixed`, o status honesto para um resíduo que o operador ACEITOU em vez de consertar"

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
    - .planning/WINDOWS.md

key-decisions:
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

requirements-completed: []

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

# Metrics
duration: 38 min
completed: 2026-09-23
status: incomplete
---

# Phase 49 Plano 17: O inventário LGPD de `entrevista_analises`, fechado de ponta a ponta — e o checkpoint do D-66 com o fato re-medido na mesa Summary

**As 7 colunas que o plano 49-01 criou em `entrevista_analises` saem do limbo em que estavam desde 2026-09-22 — existiam em PROD sem veredito de export, e a cópia do titular as omitia por fail-safe e não por decisão: `tipo` e `superada_em` passam a entrar na cópia, o UUID de quem pediu a análise fica fora pela R2, e o hash que sobrevive à exclusão de propósito (D-70) ganha o registro do resíduo com a razão escrita. O plano PARA no `checkpoint:decision` da Task 2, que é `gate="blocking-human"` — e chega nele com o fato do D-66 RE-MEDIDO e diferente do herdado nos dois sentidos.**

## ⚠ Este SUMMARY fecha UMA das três tasks, de propósito

`status: incomplete`. A Task 2 é `checkpoint:decision` com `gate="blocking-human"`, e o
`auto_advance` do projeto é `false`: paro nela sem auto-aprovar. A Task 3 depende da
resposta do operador (é ela que escreve o texto do recibo sobre as análises) e pertence a
um agente de continuação, de contexto novo.

**Nada irreversível foi aplicado.** Zero escrita em PROD — toda medição rodou com
`SET TRANSACTION READ ONLY` ou dentro de bloco que aborta. Nenhuma migration, nenhum
`efdeploy`, nenhum apply. As duas EFs **não** foram redeployadas: entre este commit e a
Task 3 o ar diz MENOS do que o artefato declara, que é a direção segura e exatamente o
estado fail-safe que a fase atravessa desde o 49-01.

## Performance

- **Duration:** 38 min
- **Started:** 2026-09-23T20:43:00Z
- **Completed:** 2026-09-23T21:21:00Z
- **Tasks:** 1 de 3 (parada no checkpoint da Task 2)
- **Files:** 13 (12 modificados no commit de código + `WINDOWS.md`)

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
| `analise_candidato_vaga.provedor_ia` | **NÃO** | — | não (sem veredito) | — | — |
| `analise_candidato_vaga.modelo_ia` | **NÃO** | — | não (sem veredito) | — | — |
| `redacoes_candidato.provedor_ia` | **NÃO** | — | não (sem veredito) | — | — |
| `redacoes_candidato.modelo_ia` | **NÃO** | — | não (sem veredito) | — | — |
| `redacoes_candidato.rubrica_versao` | **NÃO** | — | não (sem veredito) | — | — |
| `comparativo_solicitado.provedor_ia` | **NÃO** | — | tabela fora de escopo | — | — |
| `comparativo_solicitado.modelo_ia` | **NÃO** | — | tabela fora de escopo | — | — |
| `entrevista_guias.provedor_ia` | **NÃO** | — | tabela fora de escopo | — | — |
| `entrevista_guias.modelo_ia` | **NÃO** | — | tabela fora de escopo | — | — |

As 7 primeiras estão FECHADAS. As 9 restantes são da Task 3 e continuam sem veredito — e
continuam **fora da cópia por fail-safe**, o que é seguro e silencioso: é precisamente o
silêncio que o `05-export-allowlist-drift.sql` quebra, e ele as lista.

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

## Task Commits

1. **Task 1 (tracer): `entrevista_analises` medida, decidida e regenerada — o UUID de quem pediu fica fora da cópia** — `04ac66cc` (feat)

Nenhum apply, nenhum deploy, nenhuma linha de PROD escrita. **Não há entrada de ledger de
migration neste plano**, e a ausência é a verdade: o plano não cria objeto de banco.

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

---

**Total deviations:** 4 (1 de bloqueio, 1 de funcionalidade crítica, 1 de número herdado
falso, 1 de registro). **O estado vivo bateu com o que o plano assume nas 16 colunas, nos
tipos, nas nulidades e na contagem do drift.** O que o plano **não** previa: que a
classificação explícita desarma o fecho que ele cita como portão, e que o fato do D-66 —
escrito em três documentos com autoridade de medição — está errado nos dois sentidos.
**Impact on plan:** a Task 3 herda um artefato mais forte e um fato diferente. A decisão da
Task 2 deve ser tomada sobre o fato re-medido, não sobre o herdado.

## Registrado, não consertado

- **`v_analises_presas`** — view com `security_invoker` **não setado** e dono `postgres`
  (logo ignora RLS), com SELECT para `authenticated`. Expõe ids de candidatura, vaga, slug,
  data, situação e mensagem de erro de análise. **Nenhuma coluna da fase, nenhum nome,
  nenhum CPF**, e `anon` não a alcança. Pré-existente, fora do escopo deste plano.
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
- **WINDOWS 81 e 82** ficam `open`: as duas são decisão do operador, no checkpoint.

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
| T-49-17-04 (decisão escrita que não chega à cópia real) | **aberta por desenho** | nenhuma EF redeployada. O ar diz MENOS do que o artefato, que é a direção segura; o fechamento é da Task 3 |
| T-49-17-SC (supply chain) | mitigate | zero instalação de pacote |

Adicional não previsto no `<threat_model>`, e **registrado em vez de consertado**: o nome
COMPLETO do único titular excluído sobrevive em `analise_candidato_vaga.resumo_cv`
(`WINDOWS` 83). É o insumo central da decisão do operador.

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

## User Setup Required

None — nenhuma configuração de serviço externo. O token do Supabase já está no Keychain
(serviço "Supabase CLI", conta "supabase").

## Next Phase Readiness

**Este plano NÃO está completo, e a próxima etapa é o operador.**

- **Task 2 (`checkpoint:decision`, `gate="blocking-human"`)** — duas perguntas na mesa:
  o D-66 (WINDOWS 81/83) e a copy da WINDOWS 82. A opção **(c)** do D-66 (desidentificar no
  motor) implica, pelo critério de acceptance do próprio plano, que **este plano PARA e
  reporta**: é escopo novo de motor.
- **Task 3** herda: as 9 colunas restantes (2 de `analise_candidato_vaga`, 3 de
  `redacoes_candidato`, 4 nas duas tabelas fora de escopo), o item `fase: 49` do catálogo
  **já criado** (acrescentar na MESMA entrada, não criar outra), a versão **já em 1.3.0**
  (não bumpar de novo), os `VALUES` do drift e os snapshots **já sincronizados** (regerar,
  não re-decidir), e os dois redeploys.
  - ⚠ O drift contra PROD deve cair de **14** para **9** quando a Task 3 fechar. Os 9
    restantes são o drift pré-existente da 48 e **não** são dela.
  - ⚠ As 4 colunas de `comparativo_solicitado`/`entrevista_guias` **nunca** aparecem no
    drift (tabelas fora de escopo) — e por isso o gerador **não exige** veredito para elas.
    Conferir antes de escrever um que o fecho recusaria como inerte.
- **Fecho do M8:** a **BD-9 fica MEIO-FECHADA**, e é item aberto declarado. E a WINDOWS 83
  entra junto: o nome completo do único titular excluído sobrevive numa análise.

**Atenção:** `tsc` em 89, teto 90 (D-53) — margem de um.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Parada no checkpoint da Task 2: 2026-09-23*

## Self-Check: PASSED

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
