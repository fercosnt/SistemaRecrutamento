---
phase: 49-consertos-da-jornada-bloco-2
plan: "19"
subsystem: database
tags: [lgpd, art-18, exclusao, anonimizacao, motor-destrutivo, d-48, d-54, d-60, d-61, d-62, d-63, edge-function, jwt-do-titular, antes-depois, prod, irreversivel, jorn-36]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "18"
    provides: "a conta DESCARTÁVEL criada pelo fluxo real e percorrida inteira (cadastro → inscrição → SJT → redação → Big Five → Raven → entrevista com 5 análises → revisão humana → rejeição), o `DESCARTAVEL_CANDIDATO_ID`, e a prontidão que confirmou `apagar_respostas_e_producoes` vivo na EF `executar-direito-titular` v12"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "14, 20, 21"
    provides: "o passo `apagar_respostas_e_producoes` e os smokes que o provaram DENTRO de transações revertidas — o que este plano converte em execução real"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "29"
    provides: "`desidentificar_analises`, o passo irmão, já em PROD quando esta execução rodou"
  - phase: 45-motor-de-exclus-o-anonimiza-o
    plan: "11"
    provides: "o precedente inteiro: medir o MOTOR (EF + claims + ordem dos três sistemas) e não a RPC isolada; o formato ANTES × DEPOIS da evidência de portão"
provides:
  - "a PRIMEIRA execução real do passo novo do motor (D-48, D-60..D-63), sob portão explícito do operador, sobre a conta criada para isso — 8 de 8 colunas `p36_*` `true`, re-medidas em 2026-09-29"
  - "`supabase/tests/p49_motor_antes_depois.sql` — consulta só leitura, parametrizada por `p49.titular` e `p49.antes`, que mede tabela a tabela e coluna a coluna e devolve as 8 asserções + 7 discriminadores de população"
  - "a prova de que o recibo deixou de prometer o que o motor não fazia: o que ele diz ter apagado está apagado, e o que diz ficar (`scores_raven`, `scores_candidato`) ficou"
  - "a prova de não-contaminação: as contagens globais descontada a conta são idênticas antes e depois (`respostas_formulario` fora = 115, `respostas_raven` fora = 60)"
  - "o padrão de reconhecimento de redação por FORMA (chave `redigido` ou a frase «removid… a pedido») em vez de por sentinela literal — o motor usa marcador DIFERENTE por coluna, e a 1ª versão do tracer reprovou trabalho correto por não saber disso"
affects: [fecho-do-M8, JORN-49]

# Actuals (#2632) — mesmo instrumento do 49-18 e do 49-29 (chars acrescentados / 4).
actuals:
  tokens: 5629
  tasks: 3
  commits: 1
  plan_head_before: df3ccfd42e76c71d39d5f24d3191055bca3f387a
  # `tokens: 5629` = 22 517 chars acrescentados por `acf6db86` / 4. A estimativa era
  # 60 000; o realizado pelo INSTRUMENTO é 0,09x — e, como no 49-18, isso diz mais
  # sobre o instrumento do que sobre a estimativa. O custo deste plano foi uma
  # execução IRREVERSÍVEL sobre PROD, medida coluna a coluna antes e depois, com um
  # portão humano no meio. Nada disso é diff. ⚠ Não calibre um plano destrutivo
  # pelo tamanho do patch: o risco e o custo moram na execução, não no texto.
  # `commits: 1` = o único commit do plano (`acf6db86`), + o de metadado deste SUMMARY.
  # `git rev-list --count df3ccfd4..HEAD` devolveria um número MAIOR porque o intervalo
  # interleava os consertos de instrumento do 49-18 (`57d72447`, `5e408592`), o JORN-41
  # e a escrituração dos requisitos.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reconhecer «coluna redigida» por SENTINELA LITERAL é fotografia: o motor grava marcador DIFERENTE por coluna (`[removido a pedido do titular — LGPD Art. 18]` no texto comum, `{\"redigido\":\"anonimizacao_p49\"}` em `respostas_avaliacao.respostas`, `{\"redigido\":\"anonimizacao_p45\"}` em `ai_call_logs.raw_response`, uma sentinela própria de 258 caracteres em `user_prompt_template`, `{\"redigido\":\"anonimizacao_p49_comparativo\"}` no comparativo). Um predicado por FORMA (chave `redigido` OU a frase «removid… a pedido») não envelhece quando nascer um marcador novo"
    - "A consulta de ANTES/DEPOIS carrega o ANTES como PARÂMETRO (`p49.antes`, um jsonb) em vez de reler o passado: só assim `p36_outros_intactos` pode afirmar «igual a antes» sobre um estado que a própria execução destruiu. O JSON fica no registro entre `ANTES_JSON_BEGIN`/`END`, e é o `<verify>` que o lê de volta — não uma pessoa"
    - "Declarar as populações VAZIAS antes da execução é o que separa «passou» de «não tinha o que provar». Quatro asserções deste plano saem `true` por vacuidade (comparativo, cultura, cognitivo, revisão) e cada uma tem um `pop_*` `false` ao lado, dizendo isso em voz alta. Lê-las como aprovação seria ler metade"
    - "Antecipar um prazo em PROD por UPDATE se faz com `WHERE` estreito (candidato + tipo + situação + não cancelado) e `ROW_COUNT` EXIGIDO igual a 1, com o bloco abortando em qualquer outro número. A medida não é «deu certo»: é «tocou exatamente uma linha, e ela é a que eu nomeei»"

key-files:
  created:
    - supabase/tests/p49_motor_antes_depois.sql
  modified:
    - .planning/phases/49-consertos-da-jornada-bloco-2/49-PROVA-PROD.md

key-decisions:
  - "A execução passou pelo CAMINHO REAL do Art. 18, não pela RPC isolada: pedido feito pela própria titular na tela (`/candidato/privacidade`), `executar_em` antecipado por UPDATE de `WHERE` estreito, e a EF `executar-direito-titular` chamada com o JWT DELA. É o precedente do 45-11 — medir o motor inteiro (EF, claims, ordem dos três sistemas), porque é o motor que roda em produção, não a função"
  - "O dry-run (`plano_exclusao_titular`) ficou PENDENTE na Task 1 e isso está declarado, não escondido: a função recusa chamador sem sessão (`FORBIDDEN: chamador sem sessao nao le o plano de exclusao de ninguem`, medido em 27/09). Ela exige JWT de titular ou de RH. O ANTES medido pela consulta própria cumpriu o papel de «o operador sabe o que vai ser apagado antes de autorizar»; o plano pela TELA foi lido pelo operador em `/candidato/privacidade` antes de confirmar"
  - "Nenhuma credencial da conta foi gravada em arquivo nenhum. A chamada da EF saiu do navegador do operador, com a sessão viva dela. O `49-PROVA-PROD.md` registra o e-mail e o `candidato_id` — nunca senha nem JWT"
  - "As quatro populações vazias foram DECLARADAS antes da execução, com o motivo de cada uma: `comparativos_ids = []` (a `+claude7` estava em entrevista/rejeitada quando os comparativos foram gerados), `respostas_cultura` e `cognitivo_respostas` = 0 (o Big Five deste sistema grava em `scores_candidato`, e a vaga tem `aplica_cognitivo = false`), `revisao_resultado` = 0 (a rejeição veio por `rejeitar_candidatura` e não criou `decisao_final`). Elas ficam cobertas só pelos smokes revertidos do 49-14/49-20 — e isso está escrito no registro"
  - "A promessa do diálogo de exclusão sobre «as análises que compararam a sua candidatura com as de outras pessoas» foi registrada como VAZIA nesta conta, não como cumprida. A distinção custa uma linha e evita que um dia alguém cite esta execução como prova de um passo que ela não exercitou"

patterns-established:
  - "Quando um tracer reprova, leia o LOG antes de reverter o trabalho. A 1ª versão de `p49_motor_antes_depois.sql` devolveu `p36_textos_em_sentinela = false` e `p36_logs_redigidos = false` sobre uma execução CORRETA — o defeito era do instrumento, e o conserto foi pela FORMA. Reverter teria desfeito um motor que funciona, com base num portão errado"
  - "Execução irreversível sem artefato é indistinguível de execução que não houve. O tracer estava NÃO RASTREADO e o registro NÃO COMMITADO quando a sessão voltou — e a exclusão já tinha acontecido, sem chance de repetir. O commit `acf6db86` existe por isso, e não por completude burocrática"
  - "Um número do ANTES medido por predicado que depois se descobre errado deve ser MARCADO no lugar onde ele está, não corrigido em silêncio: o `aval_aberta: 2` do `ANTES_JSON` continua lá, com a nota de que aquelas 2 linhas já estavam redigidas às 20:01/20:16 (a redação do rascunho acontece ao pontuar, não na exclusão). Corrigi-lo faria o `<verify>` da Task 3 deixar de reproduzir o que foi rodado"

requirements-completed: [JORN-36]

coverage:
  - id: D1
    description: "A primeira execução real do passo novo do motor aconteceu, uma vez, sobre a conta descartável, com autorização explícita do operador"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "resposta da EF `executar-direito-titular`, chamada com o JWT da titular: `{\"ok\":true,\"acao\":\"executar\",\"concluido_em\":\"2026-09-28T02:25:42.738Z\",\"arquivos_apagados\":1}` — registrada em `49-PROVA-PROD.md` §«Motor — DEPOIS»"
        status: pass
      - kind: integration
        ref: "antecipação de `executar_em`: `2026-10-12 22:56:10` → `2026-09-27 22:58:51`, **1 linha** (`WHERE` por candidato + tipo + situação + não cancelado; o bloco aborta em qualquer outro `ROW_COUNT`)"
        status: pass
      - kind: manual_procedural
        ref: "frase literal do operador, registrada no arquivo: «autorizo a execução do motor na conta descartável fernandinho.costa.neto+claude7@gmail.com». Pedido feito pela própria titular em `/candidato/privacidade`, com «O que sai e o que fica» lido antes de confirmar"
        status: pass
    human_judgment: true
    rationale: "portão do D-54 — uma execução irreversível sobre PROD não é auto-aprovável por desenho, e a autorização é a frase de uma pessoa"
  - id: D2
    description: "O que o recibo diz ter apagado está apagado — medido coluna a coluna, com o ANTES carregado como parâmetro"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "`p36_respostas_apagadas` (D-62): `respostas_formulario` **6 → 0**, `respostas_raven` **60 → 0**"
        status: pass
      - kind: integration
        ref: "`p36_textos_em_sentinela`: a redação (1) e `respostas_avaliacao.respostas` (2) reconhecidas por FORMA. `p36_sem_citacao_literal`: `cited_evidence` da análise da redação **1 → 0** e `entrevista_analises.citacoes` **5 → 0**"
        status: pass
      - kind: integration
        ref: "`p36_logs_redigidos` (D-61): **7 de 7** dos ids capturados ANTES — `candidato_id` NULL, `user_prompt_template` e `raw_response` em sentinela. Nenhuma linha de `ai_call_logs` com o `candidato_id` dela"
        status: pass
      - kind: integration
        ref: "re-execução independente da consulta em **2026-09-29**, com o mesmo `p49.titular` e o mesmo `ANTES_JSON` lido do registro: **8 de 8 `p36_*` `true`**. Não é a leitura da sessão copiada — é a mesma medida tirada de novo, dois dias depois"
        status: pass
    human_judgment: false
  - id: D3
    description: "O que o recibo diz que FICA, ficou — e nenhum outro titular foi tocado"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "`p36_scores_preservados`: `scores_raven` **1** (39/60, percentil 65) e `scores_candidato` **3** (sjt, big_five, entrevista) — intactos. A linha é o registro de tratamento que o JORN-28 exige e a prova de não-discriminação da RNF-07a"
        status: pass
      - kind: integration
        ref: "`p36_outros_intactos`: contagens globais descontada a conta, iguais antes e depois — `respostas_formulario` fora = **115**, `respostas_raven` fora = **60**"
        status: pass
    human_judgment: false
  - id: D4
    description: "Os três sistemas foram varridos, não só o Postgres"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "`auth.users` pelo id e pelo e-mail: **0 / 0** — o usuário não existe mais. `storage.objects` sob qualquer prefixo dela: **0** (a EF relatou `arquivos_apagados: 1`). `candidatos`: 1 linha **tombstone**, e-mail `anonimizado+<id>@invalido.local`"
        status: pass
      - kind: integration
        ref: "`solicitacoes_dados.situacao` = `concluido`, `recibo_enviado_em` = 2026-09-27 23:25:43"
        status: pass
    human_judgment: false
  - id: D5
    description: "O recibo recebido na caixa da titular diz, item a item, o que o banco mostra"
    requirement: JORN-36
    verification:
      - kind: manual_procedural
        ref: "operador conferiu os itens «O que você escreveu, respondeu e falou» e «conteúdo enviado às análises automáticas» do e-mail recebido contra o DEPOIS medido — checkpoint `blocking-human` da Task 3, resume-signal «recibo confere»"
        status: pass
    human_judgment: true
    rationale: "é o TEXTO do e-mail recebido; o banco prova o apagamento, não a frase lida"
  - id: D6
    description: "As populações vazias estão declaradas — quatro asserções passam por vacuidade e dizem isso em voz alta"
    verification:
      - kind: integration
        ref: "`pop_comparativos`, `pop_revisao`, `pop_cultura`, `pop_cognitivo` = **false**, ao lado de `p36_comparativos_redigidos` e `p36_revisao_redigida_ou_ausente` = `true`. `pop_respostas`, `pop_redacao`, `pop_logs` = **true** — essas três não passam por vacuidade"
        status: pass
      - kind: other
        ref: "as quatro têm o motivo escrito na §«Populações VAZIAS — declaradas, não escondidas» do `49-PROVA-PROD.md`, com a cobertura alternativa nomeada (smokes revertidos do 49-14/49-20)"
        status: pass
    human_judgment: false

# Metrics
duration: não medido com precisão — ANTES medido em 2026-09-27, execução às 23:25 -03, artefato commitado às 23:37 -03
completed: 2026-09-27
status: complete
---

# Phase 49 Plano 19: O motor de exclusão rodou de verdade, uma vez, na conta criada para isso — 8 de 8, medido coluna a coluna Summary

**A primeira execução real do passo novo do motor (D-48, D-60..D-63) aconteceu em 2026-09-27 às 23:25 -03 sobre a conta descartável `+claude7`, pelo caminho real do Art. 18 — pedido feito pela própria titular na tela, prazo antecipado por um UPDATE que toca exatamente uma linha, e a Edge Function `executar-direito-titular` chamada com o JWT DELA. Os smokes do 49-14/49-20 já provavam o motor dentro de transações que revertem; aqui ele destruiu dado de verdade e não há como repetir. As 8 colunas `p36_*` saem `true` — re-medidas em 2026-09-29, dois dias depois, com o mesmo ANTES lido do registro: `respostas_formulario` 6→0, `respostas_raven` 60→0, `cited_evidence` 1→0, 7 de 7 logs redigidos, `scores_raven` e `scores_candidato` PRESERVADOS, e as contagens do resto do mundo idênticas antes e depois. O recibo deixou de prometer o que o motor não fazia.**

## Performance

- **Tasks:** 3 / 3 (1 tracer + 2 checkpoints `blocking-human`)
- **Files:** 2 (1 criado, 1 modificado) · **Commits:** 1 (`acf6db86`) + o de metadado deste SUMMARY
- **Execução:** 2026-09-27 23:25:42 -03 · **Recibo:** 23:25:43 · **Artefato commitado:** 23:37
- ⚠ **As 8 colunas foram RE-MEDIDAS em 2026-09-29 na escrita deste SUMMARY**, com o mesmo `p49.titular` e o mesmo `ANTES_JSON` lido de volta do registro. Não é a leitura da sessão copiada.

## O caminho — e por que ele importa mais que o resultado

O plano podia ter chamado `anonimizar_candidato` direto. Não chamou, e a razão é o precedente do **45-11**: o que roda em produção é o **motor inteiro** — a EF, as claims, a ordem dos três sistemas —, não a função isolada. Uma RPC verde com uma EF quebrada é um motor quebrado.

| Etapa | Como |
|---|---|
| pedido | a própria titular, em `/candidato/privacidade`, depois de ler «O que sai e o que fica» |
| prazo | `executar_em` **2026-10-12 22:56:10 → 2026-09-27 22:58:51**, UPDATE com `WHERE` estreito (candidato + tipo + situação + não cancelado), **1 linha** exigida — o bloco aborta em qualquer outro número |
| execução | EF `executar-direito-titular`, `{"acao":"executar"}`, com **o JWT da titular**, do navegador do operador |
| resposta | `{"ok":true,"acao":"executar","concluido_em":"2026-09-28T02:25:42.738Z","arquivos_apagados":1}` |

Autorização, literal e registrada: *«autorizo a execução do motor na conta descartável fernandinho.costa.neto+claude7@gmail.com»*. **Nenhuma senha nem JWT foi gravado em arquivo algum** — o registro guarda o e-mail e o `candidato_id`, mais nada.

## ANTES × DEPOIS

O ANTES foi medido pela própria consulta, com `p49.antes = '{}'`, e gravado entre `ANTES_JSON_BEGIN`/`END` — é ele que a Task 3 passa de volta como parâmetro. Sem isso, `p36_outros_intactos` não teria como afirmar «igual a antes» sobre um estado que a execução destruiu.

| O que | Antes | Depois |
|---|---|---|
| `respostas_formulario` (conta) | **6** | **0** |
| `respostas_raven` (conta) | **60** | **0** |
| `redacoes_candidato.texto` | 1 aberto | **sentinela** |
| `respostas_avaliacao.respostas` | 2 | **redigidas** |
| `entrevista_analises.citacoes` | **5** | **0** |
| `cited_evidence` na análise da redação | **1** | **0** |
| `ai_call_logs` da conta | **7** | **7 de 7 redigidos**, `candidato_id` NULL |
| `scores_raven` | 1 (39/60, percentil 65) | **1 — preservado** |
| `scores_candidato` | 3 (sjt, big_five, entrevista) | **3 — preservados** |
| `respostas_formulario` **fora** | 115 | **115** |
| `respostas_raven` **fora** | 60 | **60** |

Fora do Postgres: `auth.users` **0 / 0** (por id e por e-mail), `storage.objects` sob o prefixo **0**, `candidatos` com **1 tombstone** (`anonimizado+<id>@invalido.local`), `solicitacoes_dados.situacao` = `concluido` com `recibo_enviado_em` 2026-09-27 23:25:43.

## As quatro populações VAZIAS — declaradas, não escondidas

Quatro asserções deste plano saem `true` **por vacuidade**, e cada uma tem um `pop_*` `false` ao lado dizendo isso:

| Vazia | Por quê | Coberta por |
|---|---|---|
| `comparativos_ids = []` | a `+claude7` estava em entrevista/rejeitada quando os comparativos foram gerados | smoke revertido do 49-20 |
| `respostas_cultura`, `cognitivo_respostas` = 0 | o Big Five deste sistema grava em `scores_candidato` (`tipo='big_five'`), não em `respostas_bigfive`; e a vaga tem `aplica_cognitivo = false` | smokes do 49-14/49-20 |
| `revisao_resultado` = 0 | a rejeição veio por `rejeitar_candidatura` e não criou `decisao_final`, então não há revisão a redigir | smoke do 49-14 |

**Lê-las como aprovação seria ler metade.** O diálogo de exclusão promete apagar «as análises que compararam a sua candidatura com as de outras pessoas» — nesta conta essa promessa **não tem população**, e isso está registrado como vazio, não como cumprido. A distinção custa uma linha e evita que um dia alguém cite esta execução como prova de um passo que ela não exercitou.

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 — bug de instrumento] O tracer REPROVOU trabalho correto**
- **Found during:** Task 3, primeira execução da consulta do DEPOIS
- **Issue:** `p36_textos_em_sentinela` e `p36_logs_redigidos` saíram **`false`** sobre uma execução que estava **certa**. A 1ª versão comparava as colunas redigidas com **uma** sentinela literal (`[removido a pedido do titular — LGPD Art. 18]`). O motor usa marcador **diferente por coluna**:

  | Coluna | Marcador |
  |---|---|
  | texto comum | `[removido a pedido do titular — LGPD Art. 18]` |
  | `respostas_avaliacao.respostas` | `{"redigido":"anonimizacao_p49"}` |
  | `ai_call_logs.raw_response` | `{"redigido":"anonimizacao_p45"}` |
  | `ai_call_logs.user_prompt_template` | sentinela própria, 258 caracteres |
  | comparativo | `{"redigido":"anonimizacao_p49_comparativo"}` |

- **Fix:** o predicado passou a reconhecer a **FORMA** — chave `redigido`, ou a frase «removid… a pedido» — e por isso não envelhece quando nascer um marcador novo. É a mesma lição do `CLAUDE.md` §«Portões: varra pela FORMA, não pelo sintoma»
- ⚠ **O que quase aconteceu:** com a execução já feita e irreversível, um vermelho do portão convidava a concluir que o motor estava errado. **Ler o log antes de reverter** foi o que separou o conserto certo do desfazimento de um motor que funciona
- **Committed in:** `acf6db86`

**2. [Rule 1 — medição errada, marcada e NÃO corrigida em silêncio] `aval_aberta: 2` no `ANTES_JSON`**
- **Issue:** aquelas 2 linhas de `respostas_avaliacao` **já estavam redigidas** às 20:01 e 20:16 — a redação do rascunho acontece **ao pontuar**, não na exclusão. O número é medição do predicado velho
- **Fix:** o valor ficou onde está, com a nota ao lado. Corrigi-lo faria o `<verify>` da Task 3 deixar de reproduzir o que foi efetivamente rodado. **Nenhuma coluna `p36_*` depende dele**
- **Registrado em:** `49-PROVA-PROD.md`, logo abaixo da tabela de marcadores

**3. [Rule 3 — bloqueio declarado, não contornado] O dry-run ficou PENDENTE**
- **Issue:** `plano_exclusao_titular` recusa chamador sem sessão — `FORBIDDEN: chamador sem sessao nao le o plano de exclusao de ninguem` (medido em 27/09). Ela exige JWT de titular ou de RH, e o acesso por Management API não tem nenhum dos dois
- **Fix:** **não** se inventou um contorno com `service_role`. O papel que o plano pedia ao dry-run — «o operador sabe o que vai ser apagado antes de autorizar» — foi cumprido pelo ANTES medido pela consulta própria, e pelo plano que o operador leu **na tela**, em `/candidato/privacidade`, antes de confirmar. A pendência está escrita no registro como pendência

### Desvio de PROCESSO

**4. O artefato quase não existiu.** Quando a sessão voltou, `p49_motor_antes_depois.sql` estava **não rastreado** e o `49-PROVA-PROD.md` com as seções ANTES/DEPOIS **não commitado** — com a exclusão **já executada e irreversível**. O commit `acf6db86` existe por isso. É o `CLAUDE.md` §«Apply sem artefato é indistinguível de não-aplicado» na sua forma mais aguda: aqui não havia como repetir a medição, porque o dado tinha deixado de existir.

---

**Total:** 3 auto-fixes (1 de instrumento, 1 de escrituração de medida, 1 de bloqueio declarado) + 1 desvio de processo.
**Impacto:** nenhum scope creep. O conserto do tracer o tornou mais resistente do que o plano pedia; a pendência do dry-run está declarada e não foi contornada com privilégio.

## Issues Encountered

- **O `p36_outros_intactos` só é verificável porque o ANTES virou parâmetro.** Uma consulta que relesse o passado não teria como afirmar isso — o passado foi destruído. Vale como desenho para a próxima execução destrutiva.
- **Nada aqui é repetível.** Se uma medida ficasse faltando, não haveria segunda chance na mesma conta. É a razão de a Task 1 medir tabela a tabela **e** coluna a coluna, e de declarar as populações vazias **antes** da execução.

## User Setup Required

Nenhum. O que dependeu de humano foram o pedido pela tela, a frase de autorização e a conferência do recibo — todos concluídos em 2026-09-27.

## Next Phase Readiness

- **JORN-36 fechado com execução real**, sob portão do operador, com contagem antes/depois e recibo conferido.
- A conta `+claude7` está **consumida** — é tombstone e não serve para mais nada. Uma nova execução real exige uma nova conta descartável.
- ⚠ **JORN-49 nasceu perto daqui** e segue aberto: o recibo lista «endereço» entre os campos apagados, mas `estado` e `faixa_etaria_materializada` permanecem por desenho (alimentam o relatório agregado). É ajuste de TEXTO, não de motor — e é exatamente a classe de defeito que esta execução existia para caçar, encontrada na borda que ela não cobre.
- ⚠ O `49-PROVA-PROD.md` tem as seções do motor escritas e completas; as **§4/§5 do 49-18** (sessão 1 e fallback) seguem em branco — ver o SUMMARY do 49-18.

## Self-Check: PASSED

| Afirmação | Como foi conferida |
|---|---|
| `supabase/tests/p49_motor_antes_depois.sql` existe | 209 linhas, 8 `p36_*` + 7 `pop_*` |
| o registro tem o titular e o ANTES | `DESCARTAVEL_CANDIDATO_ID: 37614985-76fe-4bb5-af90-3a734caeebe0`, bloco `ANTES_JSON_BEGIN/END` |
| 8 de 8 `p36_*` `true` | re-medido em 2026-09-29 por `p46apply.cjs run`, só leitura, com o ANTES lido do registro |
| as populações vazias são 4 | `pop_cultura`, `pop_cognitivo`, `pop_comparativos`, `pop_revisao` = `false` (medido) |
| o commit existe | `acf6db86` — `git log --oneline` |

---
*Phase: 49-consertos-da-jornada-bloco-2 · Plano 19*
*Executado: 2026-09-27 · SUMMARY escrito e re-medido em 2026-09-29*
