---
phase: 49-consertos-da-jornada-bloco-2
plan: "28"
subsystem: testes-portoes
status: complete
tags: [postgres, supabase, smoke, portoes, forma-nao-sintoma, lgpd, purga, mutation-testing, p46apply]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "14"
    provides: "a primeira medição da falha (j.2), provada pré-existente por restauração dos corpos anteriores em requisição que aborta, e a medição do portão cheio (27/27) com a vaga devolvida a `ativa` dentro do envelope"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "12"
    provides: "a recusa do operador ao UPDATE retroativo na vaga-semente, e a medição que a sustenta (`anon` iria de 2 para 3 vagas)"
  - phase: 46-purga-e-guardas
    provides: "`p46apply.cjs` e o arquivo `p46_purga_smoke.sql` com as 27 asserções"
provides:
  - "(j.2) ESTABELECE `ativa` dentro do envelope e RELÊ o status do banco, em vez de LER o estado vivo de PROD como linha de base — a asserção passou a provar o predicado, não o estado em que PROD calhou de estar"
  - "(j.1) e (j.3) recebem o mesmo tratamento: a instrução de estabelecimento já existia no arquivo como REPOSIÇÃO, e o defeito era ela rodar só no fim"
  - "o contador do smoke SAI da execução em forma de LINHA (`P46P_REG_CONTADOR=<n>` como última instrução do arquivo) — a via atual devolve linhas e descarta `NOTICE`, e cada sessão vinha improvisando o próprio instrumento"
  - "as asserções (o), (o.6), (o.7) e (p) voltam a ser ALCANÇADAS — o 4º ramo do guard do motor de exclusão entra no 49-19 EXERCITADO, e nenhuma vaga sintética foi publicada para consegui-lo"
  - "varredura de FORMA do arquivo inteiro, com veredito por achado (escopo deliberado × fotografia que vai envelhecer)"
affects: [49-19, 49-20, 49-18]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4).
actuals:
  tokens: 3151
  tasks: 1
  commits: 1
  plan_head_before: 01e17574348f1ddf1ffa6064360e8e649231e93d
  # `tokens: 3151` = 12 602 chars das linhas ACRESCENTADAS ao smoke / 4. A estimativa
  # era 14 000; o realizado é 0,23x. A razão de ficar em pouco mais de um quinto: o
  # conserto é de ~20 linhas de SQL; o resto do orçamento era para a investigação, e o
  # 49-14 já a tinha feito (falha reproduzida, causa medida, portão cheio medido com a
  # vaga devolvida a `ativa`). Reaproveitar não custou escrita. Registrado como medido.
  # `commits: 1` = MEDIDO por `git rev-list --count 01e17574..HEAD` no instante em que
  # este SUMMARY foi escrito (`d23bb30a`), não narrado. Re-medir DEPOIS deste ponto dá 2,
  # e isso NÃO é divergência: o commit de metadado do próprio plano entra no mesmo
  # intervalo por construção, porque o `plan_head_before` é anterior a ele.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Uma asserção de NÃO-VACUIDADE **estabelece** o estado de partida dentro do envelope que aborta, em vez de o **ler** do ambiente. Lido, ele fotografa; estabelecido, ele é reprodutível"
    - "Depois de escrever o estado de partida, RELER o efeito do banco em vez de acreditar no `ROW_COUNT`: um BEFORE trigger pode reescrever a coluna e o `ROW_COUNT` diria 1 sobre uma escrita que não pegou"
    - "Repor o estado **ORIGINAL LIDO** (e não o canônico) quando o original divergir do canônico: só assim as asserções seguintes enxergam o mesmo estado que as anteriores enxergaram"
    - "Estabelecimento com `WHERE <coluna> IS NOT NULL` / `<> <valor>`: no estado canônico toca 0 linhas, não dispara trigger condicional e não acrescenta versão ao arquivo de auditoria"
    - "O contador de um smoke sai como **LINHA da última instrução**, não como `NOTICE`: a via de execução (Management API) devolve linhas e descarta `NOTICE`, então um contador em `NOTICE` obriga cada sessão a improvisar o próprio instrumento — a mesma família de defeito do §L"
    - "Prova de mordida por PAR mutação/CONTROLE quando o estado vivo está correto: a deriva é injetada DENTRO do envelope e roda duas vezes — sem o estabelecimento (reprova) e com ele (atravessa). Sem o controle, «reprovou» não distingue «o estabelecimento trabalha» de «a deriva quebra tudo»"

key-files:
  created: []
  modified:
    - supabase/tests/p46_purga_smoke.sql
    - .planning/WINDOWS.md

key-decisions:
  - "As TRÊS metades de não-vacuidade de (j) foram consertadas, não só a (j.2). A (j.1) (`count` de `retencao_hold` ativo = 1) e a (j.3) (`count` de revisão do Art. 20 em aberto = 1) têm a MESMA forma e estão UPSTREAM das asserções bloqueadas: consertar só a (j.2) deixaria duas bombas idênticas a uma asserção de distância, que é literalmente o `must_have` #5 do plano. E o conserto delas era baratíssimo — a instrução de estabelecimento já estava escrita no arquivo, como reposição no fim do bloco"
  - "A reposição é ASSIMÉTRICA de propósito. (j.1) e (j.3) repõem o estado CANÔNICO (que hoje É o vivo, e era assim que o arquivo já fazia); (j.2) repõe o ORIGINAL LIDO, porque nela o original (`arquivada`) DIVERGE do canônico (`ativa`) — repor `ativa` deixaria as asserções seguintes enxergando um estado que as anteriores não enxergaram, quebrando o invariante que o próprio arquivo declara"
  - "O status é RELIDO do banco depois do estabelecimento, e o `ROW_COUNT` NÃO é aceito como prova. `vagas_status_soft_delete_sync_trg` é um BEFORE UPDATE que reescreve `status := 'arquivada'` quando `deleted_at` não é nulo: nesse caso o `ROW_COUNT` diz 1 e o estado não é `ativa`. Medido: `deleted_at` da vaga-semente é NULL hoje, então o caminho não se realiza — e é exatamente por isso que a asserção tem de continuar capaz de vê-lo"
  - "O contador virou LINHA do arquivo em vez de continuar em `NOTICE`. O cabeçalho manda LER o contador desde o 46-02, mas a via atual (`p46apply.cjs run`, Management API) descarta `NOTICE`: o 49-14 leu o número acrescentando um `RAISE EXCEPTION` em cópia de trabalho. Instrumento improvisado a cada rodada é a mesma família do §L — produz «não levantou» e deixa quem lê concluir «as asserções rodaram»"
  - "A (k) NÃO foi consertada, e a razão não é escopo: o estabelecimento dela seria DESTRUTIVO (`DELETE` em `historico_candidatura` + `data_decisao_final := NULL`) e, se a fixture pos3 ganhou histórico, o degrau CORRETO da escada da data-âncora MUDA — forçar o degrau apagando histórico manufaturaria o cenário em vez de escolher a fixture. Registrada em `WINDOWS.md` 79"
  - "Sete mutações (5 que devem morder + 2 CONTROLES). Duas reprovaram por asserção diferente da prevista e as duas estão na tabela, não apagadas: é o que motivou a M1c"
  - "`main` mantida como branch de trabalho (autorização explícita do orquestrador; `git.allow_default_branch_commits: true`). Não registrado como desvio"

patterns-established:
  - "Antes de consertar uma asserção que reprova por estado de PROD, pergunte quantas OUTRAS asserções do mesmo arquivo têm a mesma forma. Neste arquivo eram TRÊS, e as duas restantes estavam upstream da que falhava — isto é, seriam as próximas a reprovar, com a mesma cara de defeito de produto"
  - "Um `GET DIAGNOSTICS ROW_COUNT` depois de um UPDATE cujo valor pode ser reescrito por um BEFORE trigger não é prova de efeito. Releia a coluna"
  - "Para provar que um estabelecimento faz trabalho quando o estado vivo já está CORRETO, injete a deriva dentro do envelope e rode o PAR: sem o estabelecimento e com ele"
  - "Um contador de gate que a via de execução descarta é um contador que ninguém lê. Emita-o pelo canal que a via devolve"

requirements-completed: [JORN-3b]

coverage:
  - id: D1
    description: "A (j.2) estabelece o estado que mede, dentro do envelope, e nenhuma asserção do arquivo usa o status vivo da vaga como linha de base"
    requirement: JORN-3b
    verification:
      - kind: integration
        ref: "`node p46apply.cjs run supabase/tests/p46_purga_smoke.sql` → exit 0, `P46P_REG_CONTADOR=27`, nenhum `P46P FAIL`, com a vaga-semente `arquivada` em PROD"
        status: pass
      - kind: integration
        ref: "mutação M2 (o `UPDATE ... 'ativa'` removido) ⇒ `P46P FAIL (j.2): ⊖ NAO-VACUIDADE — o envelope NAO conseguiu ESTABELECER a vaga ... o UPDATE de estabelecimento tocou <NULL> linha(s) e o status RELIDO e [arquivada]`"
        status: pass
      - kind: integration
        ref: "mutação M1 (a cláusula D-46-03 removida da função VIVA) ⇒ `P46P FAIL (j.2)`: a candidatura APARECE com a vaga ainda ATIVA"
        status: pass
      - kind: integration
        ref: "mutação M1c (o `UPDATE ... 'arquivada'` vira no-op) ⇒ `P46P FAIL (j.2): ⊖ NAO-VACUIDADE, 2ª METADE` — a metade «deixa de proteger» ISOLADA"
        status: pass
    human_judgment: false
  - id: D2
    description: "PROD não muda: a vaga `4601d000-0000-4000-8000-000000000003` permanece `arquivada` e `anon` continua vendo 2 vagas"
    requirement: JORN-3b
    verification:
      - kind: other
        ref: "medido DEPOIS da execução limpa e DEPOIS das 7 mutações: `status = arquivada`, `updated_at = 2026-08-23 17:47:45.165274-03` (byte a byte o de antes — o trigger de `updated_at` teria bumpado se alguma escrita tivesse escapado)"
        status: pass
      - kind: other
        ref: "`SET LOCAL ROLE anon; SELECT count(*) FROM public.vagas` = **2**, e os títulos são os dois reais («Social Media — Produção e Captação de Conteúdo», «Consultor(a) de Relacionamento e Pré-vendas»). Nenhum `fixture-p46` visível"
        status: pass
      - kind: other
        ref: "`purga_execucoes` = 35 com ZERO linhas nas últimas 3 horas (a última é o cron de 2026-09-23 00:00) — nem o smoke nem as 7 mutações commitaram execução, e o critério de flip «≥ 14 execuções» não foi inflado"
        status: pass
      - kind: other
        ref: "`retencao_hold` ativo da fixture = 1 · revisão do Art. 20 aberta = 1 · `decisao_final_historico` = 11 · `config_purga.modo = dry_run` · `candidaturas_alem_da_janela()` = 5 — todos idênticos antes e depois"
        status: pass
    human_judgment: false
  - id: D3
    description: "(o), (o.6), (o.7) e (p) voltam a ser exercitadas — o 4º ramo do guard do motor de exclusão entra no 49-19 alcançado"
    requirement: JORN-3b
    verification:
      - kind: integration
        ref: "o gate (z) exige EXATAMENTE 27 PASS e o run devolve `P46P_REG_CONTADOR=27`. 27 só é atingível se cada um dos 27 `set_config` tiver executado — as cinco do 46-04 (`b`, `o`, `o.6`, `o.7`, `p`) entre elas. Antes do conserto o run abortava na (j.2) e o contador nunca chegava ao resumo"
        status: pass
    human_judgment: false
  - id: D4
    description: "A mesma forma foi varrida no arquivo inteiro e cada achado tem veredito"
    verification:
      - kind: other
        ref: "tabela §«Varredura de FORMA» abaixo: 11 famílias classificadas, 3 consertadas, 2 registradas em `WINDOWS.md` (79 e 80), 6 julgadas escopo deliberado com a razão escrita"
        status: pass
    human_judgment: false
  - id: D5
    description: "Nenhuma migration, nenhuma EF, nenhum `src/`; o type-check não se move"
    verification:
      - kind: other
        ref: "`npm run -s lint` = **89** erros (teto D-53 = 90; baseline congelada do hook = 96) — idêntico ao de antes. O commit toca 1 arquivo `.sql` de teste"
        status: pass
    human_judgment: false

# Metrics
duration: 42 min
completed: 2026-09-23
---

# Phase 49 Plano 28: A asserção prova o predicado, não o estado em que PROD calhou de estar Summary

**As três metades de não-vacuidade de (j) passaram a ESTABELECER o estado que medem dentro do envelope que aborta, em vez de o LEREM do ambiente; o `p46_purga_smoke` fecha 27/27 com a vaga-semente ainda `arquivada` em PROD, e o 4º ramo do guard do motor de exclusão entra no 49-19 exercitado — sem publicar uma vaga sintética para consegui-lo.**

## Performance

- **Duration:** 42 min
- **Tasks:** 1 / 1
- **Files:** 1 modificado (`supabase/tests/p46_purga_smoke.sql`) + `WINDOWS.md`

## A precondição, medida antes de editar uma linha

O plano manda medir três coisas antes de consertar, «para não consertar um sintoma que mudou». As três, lidas em PROD por `p46apply.cjs` (só leitura):

| O que | Medido em 2026-09-23, ANTES |
|---|---|
| status da vaga `4601d000-…-0003` | **`arquivada`**, título `fixture-p46 vaga ativa (sintetica)`, `updated_at` 2026-08-23 17:47:45.165274, `updated_by` `4fceff36-…` |
| o smoke reprova? | **sim**, exit code **1**, `P46P FAIL (j.2): ⊖ NAO-VACUIDADE — a vaga 4601d000-… da candidatura 4601c000-…-0006 esta em status [arquivada] (esperado ativa)` — `CONTEXT: line 1130 at RAISE` |
| vagas visíveis a `anon` | **2** |

E duas medições que o plano não pedia e que mudaram o desenho:

1. **`vagas` tem um BEFORE UPDATE que reescreve o status.** `vagas_status_soft_delete_sync_trg` → `vagas_enforce_status_soft_delete_sync()`: `IF NEW.deleted_at IS NOT NULL AND NEW.status = 'ativa' THEN NEW.status := 'arquivada'`. Medido: `deleted_at` da vaga-semente é **NULL**, então o estabelecimento pega. Mas o `ROW_COUNT` diria `1` no mundo em que ele não pega — e por isso o bloco **relê** o status do banco em vez de acreditar na escrita.
2. **O predicado protege pelo COMPLEMENTO de uma allowlist de estados fechados.** `NOT EXISTS (... AND v.status <> ALL (ARRAY['arquivada','inativa']))` — `ativa` protege, e um valor NOVO de `status_vaga` também protegeria (fail-closed). O estabelecimento tinha de ser `ativa`, não «qualquer coisa diferente de arquivada».

## O defeito, com nome e endereço

O bloco (j.2) fazia `SELECT v.status::text INTO v_j2_status` — **lia** o estado vivo como linha de base —, media, arquivava, media de novo e repunha o que leu. Auto-reversível, dentro do envelope: o defeito não é escrita vazada, é que ele **não estabelecia** o estado de partida. Com a vaga já `arquivada`, as duas medições ocorriam no mesmo estado, o delta virava zero e a metade de não-vacuidade reprovava — **corretamente, sobre uma premissa que ninguém garante**.

É a forma que o `CLAUDE.md` §«Portões: varra pela FORMA, não pelo sintoma» descreve: um **instantâneo** do estado de PROD apresentado como **invariante**. E é a variante caríssima da tabela daquela seção — «reprova trabalho correto, com diagnóstico FALSO»: a mensagem acusava a fixture do 46-01 de não ter uma vaga aberta, quando o fato era que alguém, um mês antes, arquivou uma vaga sintética em PROD — o que é a coisa certa a fazer com uma vaga sintética.

## ⚠ E o defeito estava em TRÊS asserções, não em uma

O `must_have` #5 do plano avisa: «consertar só a (j.2) e declarar o arquivo saudável repetiria o defeito uma asserção adiante». Estava literalmente uma asserção adiante — e uma atrás:

| Asserção | Linha de base LIDA | Situação hoje | Consertada? |
|---|---|---|---|
| **(j.1)** | `count(*)` de `retencao_hold` com `liberado_em IS NULL` = 1 | passa (o hold está ativo) | **sim** |
| **(j.2)** | `status` da vaga = `ativa` | **reprovava** | **sim** |
| **(j.3)** | `count(*)` de revisão do Art. 20 em aberto = 1 | passa (a revisão está aberta) | **sim** |

As três são **upstream** de (o), (o.6), (o.7) e (p). E o conserto de (j.1) e (j.3) era quase gratuito: **a instrução de estabelecimento já estava escrita no arquivo**, como reposição no fim do bloco (`UPDATE retencao_hold SET liberado_em = NULL`; `UPDATE decisao_final SET revisao_* = NULL`). O defeito era ela rodar **só no fim**. Hastear a mesma instrução para antes da primeira medição é o conserto inteiro.

**O que o estabelecimento NÃO afrouxa** — e isto é a parte que precisava de prova, porque um portão que você tornou incapaz de falhar é pior que o quebrado:

- (j.1) ainda lê **0** se a linha de `retencao_hold` nunca foi inserida: o estabelecimento tem `WHERE liberado_em IS NOT NULL`, toca 0 linhas e **não inventa a linha**. A obrigação herdada da migration `20260823000005` continua vigiada, e a mensagem que a descreve continua sendo a que sai.
- (j.3) só mexe no lado «respondida». Se `revisao_solicitada_em` for nula, a contagem cai a 0 e reprova.
- (j.2) reprova se o `UPDATE ... 'ativa'` **não pegar** — o caminho do `deleted_at`.

Ou seja: o estabelecimento remove **uma** causa de reprova, e só ela — «alguém mudou o estado vivo da fixture desde a última vez».

### A reposição é assimétrica, e a assimetria é o cuidado

O arquivo declara um invariante: «enquanto o envelope ainda roda, as asserções seguintes têm de enxergar o mesmo estado que as anteriores enxergaram». Por isso:

- **(j.1) e (j.3)** repõem o estado **canônico** (hold ativo, revisão aberta), que hoje **é** o vivo — era assim que o arquivo já fazia, e mantê-lo é não mexer no que funciona;
- **(j.2)** repõe o **original LIDO** (`v_j2_status_orig`), porque nela o original (`arquivada`) **diverge** do canônico (`ativa`). Repor `ativa` faria as asserções seguintes enxergarem um estado que as anteriores não enxergaram.

## O contador agora SAI da execução — e essa era uma peça que faltava

O plano manda «ler o contador da execução, não transcrever». Ao ir buscá-lo, encontrei que **não havia de onde ler**: o cabeçalho manda ler o contador desde o 46-02, o resumo (z) o emite por `RAISE NOTICE`, e a via de execução atual (`p46apply.cjs run`, Management API) **devolve linhas e descarta `NOTICE`**. O 49-14 leu o número acrescentando um `RAISE EXCEPTION` numa cópia de trabalho.

Instrumento improvisado a cada rodada é a mesma família de defeito do 49-PATTERNS §L: ele produz «não levantou» e deixa quem lê concluir «as asserções rodaram». Conserto: a **última instrução do arquivo** — que é a linha que a requisição devolve — passou a ser

```sql
SELECT format('P46P_REG_CONTADOR=%s',
              coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')) AS resumo;
```

E o número desta execução, **lido dali**: `P46P_REG_CONTADOR=27`. Conciliado com a (z), que exige `v_esperado := 27`. **O total não mudou** — este plano não acrescentou letra nenhuma, e a (z) não foi tocada. O `27` deste SUMMARY vem da execução; o `27` do plano foi ignorado de propósito.

## (o), (o.6), (o.7) e (p) — alcançadas, e como isso está provado

O gate exige **exatamente** 27 PASS e reprova alto num run parcial. O run devolve **27**. Como cada PASS é um `set_config` que só executa se a asserção foi julgada e passou, **27 é inatingível sem que as cinco asserções do 46-04 — `(b)`, `(o)`, `(o.6)`, `(o.7)`, `(p)` — tenham rodado**. Antes do conserto o run abortava na (j.2), muito antes delas, e o contador nunca chegava ao resumo.

Nomeadas, então, como alcançadas: **(o)** (o 4º ramo do guard RECUSA em quatro casos e ACEITA em dois), **(o.6)** (BL-02 — chamador com sessão não entra pelo ramo da purga), **(o.7)** (o par positivo: mesma situação, sessão nula, a metade destrutiva AUTORIZA) e **(p)** (o 3º ramo de `plano_exclusao_titular`, Blocker B-02). É o que o `WINDOWS` 75 dizia estar bloqueado.

## PROD intocado — medido DEPOIS, e duas vezes

Não é formalidade: é a condição que o operador impôs ao recusar o UPDATE retroativo no 49-12.

| Medição | Antes | Depois da execução limpa | Depois das 7 mutações |
|---|---|---|---|
| `vagas.status` da semente | `arquivada` | **`arquivada`** | **`arquivada`** |
| `vagas.updated_at` da semente | `2026-08-23 17:47:45.165274-03` | **idêntico** | **idêntico** |
| vagas visíveis a `anon` | 2 | **2** | **2** |
| `retencao_hold` ativo da fixture | 1 | 1 | **1** |
| revisão do Art. 20 aberta | 1 | 1 | **1** |
| `decisao_final_historico` | 11 | — | **11** |
| `purga_execucoes` | — | — | **35, zero nas últimas 3 h** |
| `config_purga.modo` | `dry_run` | — | **`dry_run`** |
| `md5(prosrc)` de `candidaturas_alem_da_janela` | — | — | cláusula da vaga **presente**, `AND true` da mutação **ausente** |

O `updated_at` **byte a byte idêntico** é a prova mais forte da tabela: `update_vagas_updated_at` é um BEFORE UPDATE FOR EACH ROW que bumparia o campo se **qualquer** escrita na linha tivesse escapado do envelope. E `purga_execucoes` com **zero** linhas nas últimas 3 horas prova que nem o smoke nem as 7 mutações commitaram uma execução — o critério de flip «≥ 14 execuções» não foi inflado por teste, que é a razão de o envelope existir.

Os títulos vistos por `anon` foram lidos por extenso, e não só contados: «Social Media — Produção e Captação de Conteúdo» e «Consultor(a) de Relacionamento e Pré-vendas». Nenhum `fixture-p46`.

## O portão morde (medido nesta sessão) — 5 mutações + 2 CONTROLES

Harness em `scratchpad/mutar.cjs`, montado por substituição de **âncora ÚNICA** (0 ou 2 ocorrências abortam a montagem). Cada mutação roda numa requisição atômica que termina em `RAISE EXCEPTION 'MUTACAO_TERMINOU'` — o marcador que aparece **só se o portão não morder**. Honrando o 49-PATTERNS §L: **exit code real do runner** conferido (nunca o de um `sed` no meio do pipe) e **ANSI descontado** antes de procurar qualquer marcador.

| Mutação | Inversão | Esperado | Saída medida |
|---|---|---|---|
| **M1** | a cláusula D-46-03 removida da função **VIVA** `candidaturas_alem_da_janela` (dentro do envelope) | `FAIL (j.2)` | `P46P FAIL (j.2): a candidatura 4601c000-…-0006 APARECE em candidaturas_alem_da_janela() com a vaga ainda ATIVA (1 linha(s), esperado 0)` |
| **M1b** | o predicado **PROTEGE qualquer vaga** (`v.status <> ALL (...)` → `true`) | `FAIL` da 2ª metade | `P46P FAIL (f)` — reprovou pela asserção **ANTERIOR** (o kill switch por conjunto vazio): proteger tudo encolhe o conjunto elegível. Registrada, e foi o que motivou a M1c |
| **M1c** | a metade «deixa de proteger» **isolada**: o `UPDATE ... 'arquivada'` vira no-op | `FAIL (j.2) 2ª metade` | `P46P FAIL (j.2): ⊖ NAO-VACUIDADE, 2ª METADE — arquivada a vaga, a candidatura … NAO passa a estar em candidaturas_alem_da_janela() (0 linha(s), esperado 1)` |
| **M2** | **o conserto deste plano desfeito**: o `UPDATE ... 'ativa'` removido | `FAIL (j.2) não-vacuidade` | `P46P FAIL (j.2): ⊖ NAO-VACUIDADE — o envelope NAO conseguiu ESTABELECER a vaga … o estado ORIGINAL era [arquivada], o UPDATE de estabelecimento tocou <NULL> linha(s) e o status RELIDO e [arquivada]` |
| **M3a** | deriva injetada (hold LIBERADO em PROD) **+** o estabelecimento de (j.1) removido | `FAIL (j.1)` | `P46P FAIL (j.1): ⊖ NAO-VACUIDADE — depois de o envelope ESTABELECER o hold como ativo (<NULL> linha(s) tocada(s)), a candidatura … tem 0 linha(s) de retencao_hold ATIVA` |
| **M3b** | **CONTROLE**: a MESMA deriva, estabelecimento **presente** | atravessa | nenhum `P46P FAIL`; chegou a **`MUTACAO_TERMINOU`** |
| **M4a** | deriva injetada (revisão RESPONDIDA em PROD) **+** o estabelecimento de (j.3) removido | `FAIL (j.3)` | `P46P FAIL (j.3): ⊖ NAO-VACUIDADE — depois de o envelope ESTABELECER a revisao como em aberto (<NULL> …), a candidatura … tem 0 decisao(oes) com revisao do Art. 20 EM ABERTO` |
| **M4b** | **CONTROLE**: a MESMA deriva, estabelecimento **presente** | atravessa | nenhum `P46P FAIL`; chegou a **`MUTACAO_TERMINOU`** |

### Três honestidades sobre as mutações

1. **Os dois CONTROLES são a metade que faltava do argumento.** Para (j.1) e (j.3) o estado vivo está CORRETO hoje, então remover o estabelecimento sozinho não produziria falha nenhuma — a mutação pareceria «não morder» quando o que aconteceu é que não havia o que consertar. Injetar a deriva DENTRO do envelope e rodar o **par** (sem o estabelecimento: reprova · com ele: atravessa) é o que distingue «o estabelecimento trabalha» de «a deriva quebra tudo».
2. **A M1b reprovou pela asserção errada, e está na tabela.** Fazer o predicado proteger toda vaga encolhe o conjunto elegível e a **(f)** — o kill switch, que exige conjunto não-vazio — dispara antes. Sem a **M1c**, a metade «deixa de proteger» ficaria *parecendo* provada por uma mutação que provou outra coisa. É a lição das M6/M10 do 49-14, na terceira repetição desta fase.
3. **`<NULL> linha(s) tocada(s)` na saída da M2/M3a/M4a não é bug da mensagem.** É a variável de `ROW_COUNT` nunca atribuída, porque o estabelecimento inteiro foi removido — e diz exatamente isso: não houve tentativa, não houve 0 tentativas malsucedidas.

**Nenhuma mutação vazou:** as 8 requisições abortaram (exit 1 do runner em todas, inclusive nos controles, cujo aborto é o `MUTACAO_TERMINOU` deliberado), e a tabela de PROD acima foi relida depois.

## Varredura de FORMA do arquivo inteiro

O plano exige: «toda asserção que LÊ o estado vivo como linha de base é listada, com veredito de escopo deliberado × fotografia que vai envelhecer». As 160 condições `IF … RAISE EXCEPTION 'P46P FAIL` do arquivo foram extraídas e agrupadas por família.

| # | Onde | Forma | Veredito |
|---|---|---|---|
| 1 | **(j.1)** `v_j1_ativos <> 1` | lê `count(*)` de hold ativo como linha de base | **FOTOGRAFIA — CONSERTADA** (estabelece) |
| 2 | **(j.2)** `v_j2_status IS DISTINCT FROM 'ativa'` | lê o status vivo da vaga como linha de base | **FOTOGRAFIA — CONSERTADA** (estabelece + relê) |
| 3 | **(j.3)** `v_j3_abertas <> 1` | lê `count(*)` de revisão aberta como linha de base | **FOTOGRAFIA — CONSERTADA** (estabelece) |
| 4 | **(k)** `v_k4_hist <> 0 OR v_k4_dec <> 0` (:1690) | lê histórico e `data_decisao_final` da fixture pos3 como linha de base | **FOTOGRAFIA — registrada, NÃO consertada.** O estabelecimento seria `DELETE` em `historico_candidatura`; e se pos3 ganhou histórico, o degrau CORRETO da escada MUDA — forçar o degrau apagando histórico manufaturaria o cenário. Conserto honesto = fixture criada dentro do envelope (redesenho). `WINDOWS` **79** |
| 5 | **(a)** `c_herdados` com `NOT EXISTS` (:2452) | **lista literal** de 3 `jobname` | **CEGA PARA ACRÉSCIMO — registrada, NÃO consertada.** Escopo deliberado para o que afirma (os 3 declarados continuam existindo); um job NOVO fica fora da vigilância e o portão segue verde. O inventário por contagem é do `p42_invent05_cron_smoke`. `WINDOWS` **80** |
| 6 | **(l)** `v_l_allow IS DISTINCT FROM v_l_esperada` (:1718) | compara a allowlist VIVA da matriz contra `ARRAY['aprovado','decisao_final','rejeitado']` | **ESCOPO DELIBERADO.** É um **pin de política** (D-46-19), não uma leitura de linha de base: os 3 estados terminais são decisão registrada, e mudá-los DEVE exigir mudar o teste. Igualdade de CONJUNTO (não contagem) é o que impede o falso verde com «3 etapas erradas». Fica sob observação: é a mesma família do achado `p43_matriz_retencao_smoke` que o 49-20 mediu |
| 7 | **(a)** `v_a_md5 IS DISTINCT FROM c_md5` (:2444) | md5 do `command` do cron pinado contra constante | **ESCOPO DELIBERADO** — pin documentado contra a migration `20260823000012` |
| 8 | **(f)/(c)/(b)/(i)/(g)/(m)** `v_*_eleg < 3`, `v_i_pos < 2`, `2 ≤ v_g_n ≤ 498`, `v_m_eleg < 2` | leem o conjunto elegível vivo, mas por **faixa** | **ESCOPO DELIBERADO.** O cabeçalho declara os `>=` como propositais para o arquivo sobreviver aos planos 46-04..07. Faixa é o que não envelhece; medido hoje o conjunto é **5** (o cabeçalho dizia 4 — ver §Registro corrigido) e todas seguem válidas |
| 9 | **(o)/(q)** `v_o_alvo_ex <> 0`, `v_alvo_ex <> 0` | leem se um uuid sintético existe em `candidatos`, contra `0` | **ESCOPO DELIBERADO** e **fail-closed na direção segura**: o uuid foi escolhido por não existir, e é isso que faz `P0002` significar «o guard autorizou e o motor parou por não haver titular». Se algum dia existir, o teste TEM de parar |
| 10 | **(d)/(e)** `v_admin_rh IS NULL` (:3168) | lê um administrador VIVO de `usuarios_rh` para impersonar | **ESCOPO DELIBERADO com dependência DECLARADA.** O arquivo recusa skip silencioso de propósito («um skip aqui seria indistinguível de uma RPC que aceita qualquer um»). Estabelecer seria criar uma linha privilegiada — pior que o problema. Depende de PROD ter admin ativo, e falha ALTO se não tiver |
| 11 | todo o resto (`v_dom_z IS DISTINCT FROM v_dom_a`, `v_led_n_z`/`v_led_n_a`, `v_fila_g`/`v_fila_a`, `v_d_conta13`, os `v_*_st[n]` de SQLSTATE, `v_e_antes`/`v_e_depois`) | comparam **antes × depois medidos na própria execução**, ou contra o que a própria execução plantou | **FORMA EXEMPLAR** — é o padrão que o `CLAUDE.md` prescreve («baseline capturada na própria execução, impressão digital via `to_jsonb`»), e é de onde o conserto da (j.2) foi copiado |

Padrão de varredura do `CLAUDE.md` sobre este arquivo: **62 achados**, e o número é **idêntico antes e depois** do conserto — este plano não acrescentou nenhuma forma de contagem-contra-constante. (Sobre todo `supabase/tests/*.sql` o padrão acha hoje **315**, contra as 244 medidas em 2026-09-06: o crescimento é das asserções que o 49-14 e o 49-20 acrescentaram, fora do escopo deste plano.)

## ⚠ Registro corrigido: o cabeçalho dizia 4 e o vivo é 5

A trajetória do cabeçalho («7 → 6 → **4**») descreve a fixture como ela nasceu em 2026-08-22. Medido hoje: `candidaturas_alem_da_janela()` = **5** e `titulares_alem_da_janela()` = **5**, porque a vaga de `neg-vaga#06` foi arquivada e aquela candidatura deixou de ser protegida por D-46-03.

A trajetória **ficou escrita como história** — ela diz quais linhas caíram e por quê, que é o valor dela — com um aviso ao lado dizendo que o `4` não é o estado atual. Corrigir o número apagaria a informação; deixá-lo sem aviso o daria como fato, e este repositório já pagou por isso («registro desatualizado custa o mesmo que registro ausente — e este custava mais, porque vinha com autoridade»).

## Task Commits

1. **Task 1: (j.2) estabelece o estado que ela mede** — `d23bb30a` (fix)

## Deviations from Plan

### 1. [Escopo — ampliação que o próprio plano pede] (j.1) e (j.3) consertadas junto, não só (j.2)

- **Found during:** Task 1, varredura de forma (feita ANTES de editar, de propósito)
- **Issue:** o `<action>` fala só de (j.2), mas as metades de não-vacuidade de (j.1) e (j.3) têm a MESMA forma — leem estado vivo como linha de base — e estão UPSTREAM das asserções bloqueadas. Consertar só a (j.2) deixaria duas bombas idênticas a uma asserção de distância, que é o `must_have` #5 do plano com outras palavras.
- **Fix:** hastear para antes da primeira medição a instrução de estabelecimento **que já existia no arquivo** como reposição no fim do bloco. Zero invenção; o estabelecimento continua não inventando a linha nem a solicitação de revisão (`WHERE … IS NOT NULL` toca 0 linhas no estado canônico), então a detecção de ausência ESTRUTURAL — que é o que as mensagens sempre descreveram — fica intacta.
- **Verification:** mutações M3a/M4a reprovam; controles M3b/M4b atravessam
- **Committed in:** `d23bb30a`

### 2. [Rule 2 — funcionalidade crítica ausente] O contador não tinha por onde ser lido

- **Found during:** Task 1, ao cumprir «ler o contador da execução»
- **Issue:** o `<verify>` do plano procura `P46P_REG_CONTADOR=[0-9]+` na saída do run, e **o arquivo nunca emitiu essa string**. O 49-14 a produziu acrescentando um `RAISE EXCEPTION` numa cópia de trabalho. A via atual devolve linhas e descarta `NOTICE`, então o `P46P RESUMO` da (z) não chega a quem roda: na prática cada sessão inventa o próprio instrumento, que é a família de defeito do §L (o harness produz «não levantou» e quem lê conclui «as asserções rodaram»).
- **Fix:** a última instrução do arquivo passou a devolver `P46P_REG_CONTADOR=<n>` como LINHA. O `<verify>` do plano passou a ser satisfazível por construção, e sem cópia de trabalho.
- **Verification:** `VERIFY-1a OK (contador emitido)`; o valor lido é 27
- **Committed in:** `d23bb30a`

### 3. [Rule 2 — registro desatualizado] O `4` da trajetória do cabeçalho

- **Found during:** Task 1, medição do conjunto elegível
- **Issue:** o cabeçalho afirma `candidaturas_alem_da_janela() = 4`; o vivo é 5.
- **Fix:** aviso ⚠ ao lado, com o número medido e a causa. A trajetória preservada como história.
- **Committed in:** `d23bb30a`

### 4. [Registro — mutação que reprovou pela asserção errada] M1b

- **Found during:** Task 1, prova de mordida
- **Issue:** a mutação «o predicado protege qualquer vaga», que deveria atingir a 2ª metade da (j.2), reprovou na **(f)** — encolher o conjunto elegível dispara o kill switch por vacuidade primeiro.
- **Fix:** **M1c**, que isola a 2ª metade tornando no-op o `UPDATE` que arquiva a vaga, sem tocar no conjunto global. A M1b fica na tabela: apagar a tentativa que falhou esconderia o raciocínio que produziu a prova boa.
- **Committed in:** n/a (prova de sessão)

### 5. [Processo] O `windows fixed`/tabela exigiu reparo de mecânica, e o `status --raw` não detecta o defeito que o `append` detecta

- **Found during:** Task 1, fechamento das janelas 67 e 75
- **Issue:** seguindo o 49-PATTERNS §M (razão no bloco JSON, célula sincronizada por LEITURA), a primeira sincronização sobrescreveu a célula de `resolved_at` **sem o `|` de fecho** da linha. `gsd-tools windows status --raw` respondeu **`ok: true`** mesmo assim; foi o `windows append` que recusou, nomeando as linhas 67 e 75. Dois comparadores diferentes para a mesma consistência — e o mais fraco é o que se chama «status».
- **Fix:** fecho restaurado e as duas células reescritas lendo o texto de volta do JSON. `status --raw` = `ok: true` **e** `append` aceita.
- **Files modified:** `.planning/WINDOWS.md`
- **Committed in:** metadado deste plano

---

**Total deviations:** 5 (1 ampliação que o próprio `must_have` pede, 2 da Regra 2, 2 de registro/processo). **Impacto:** o artefato é mais forte que o pedido — 3 asserções consertadas em vez de 1, 7 mutações com 2 controles em vez de 2 mutações, e o contador do gate passou a ser legível pela via real de execução. **Nada escrito em PROD**: este plano não aplica migration, não faz deploy e não toca `src/`.

## Registrado, não consertado

- **(k) lê o estado vivo da fixture pos3 como linha de base** (`WINDOWS` 79). O conserto seria destrutivo (`DELETE` em `historico_candidatura`) e, pior, manufaturaria o cenário: se pos3 ganhou histórico, o degrau correto da escada da data-âncora **é outro**, e apagar o histórico para forçar o degrau antigo faria a asserção afirmar uma coisa falsa. O conserto honesto é uma fixture criada dentro do envelope — redesenho, não conserto de uma linha. **Hoje passa.**
- **(a) itera sobre lista literal de `jobname`** (`WINDOWS` 80) — o ponto cego que o `CLAUDE.md` nomeia. Escopo deliberado para o que ela afirma, cega para acréscimo.
- **(l) compara a allowlist viva contra um array literal.** Classificada escopo deliberado (pin de política D-46-19), mas fica sob observação: é a mesma família do achado do `p43_matriz_retencao_smoke` que o 49-20 mediu, em que o pin acusou falsamente uma edição legítima do operador. Se a política ganhar um 4º estado terminal, esta asserção vai reprovar com diagnóstico que **soa** como defeito.
- **Por que a vaga foi arquivada em 2026-08-23 17:47 não foi investigado** — o plano dispensa, e a medição mostra por quê: foi `updated_by = 4fceff36-…` (usuário), não este arquivo, cujo bloco é auto-reversível dentro do envelope. O conserto torna a asserção imune à causa de qualquer modo. **A varredura de forma não achou nenhum escritor** de `vagas.status` no smoke além do próprio bloco (j.2).
- **`resend-webhook.test.ts`** (`npm:svix@1.99.1`) e **`_shared/__tests__/strict-schema.test.ts:88`** (TS7053 no type-check Deno) continuam quebrados. Pré-existentes, já em `WINDOWS.md`, fora de escopo: este plano não roda teste Deno nenhum. **Não foram «consertados».**
- **`p43_previa_smoke.sql:667`** segue usando `proname IN (...)`. Fora do escopo desta fase, como no 49-06, 49-07 e 49-14.

## Known Stubs

Nenhum. O plano produz SQL de teste: não há componente, valor vazio codificado, texto de placeholder nem fonte de dados não ligada. Os `UPDATE` de estabelecimento **não são placeholders** — são o estado de partida que a asserção precisa medir, e vivem e morrem dentro do envelope que aborta em `P46B0`.

## Threat Flags

Nenhuma superfície de segurança nova. As três mitigações declaradas no `<threat_model>` ficaram provadas por execução:

| Threat | Disposição | Prova em PROD |
|---|---|---|
| T-49-28-01 (vaga sintética vazar para o público) | mitigate | escrita só no envelope; `anon` contado DEPOIS (**2**, títulos lidos por extenso) e `vagas.updated_at` da semente **byte a byte idêntico** — o trigger de `updated_at` teria bumpado se algo escapasse |
| T-49-28-02 (asserção incapaz de falhar depois do conserto) | mitigate | **M2** remove o estabelecimento e a (j.2) reprova; **M1** e **M1c** cobrem as duas metades; **M3a/M4a** cobrem (j.1) e (j.3), com **M3b/M4b** de controle |
| T-49-28-SC (supply chain) | mitigate | zero instalação de pacote; só SQL e um harness local |

Adicional não previsto no `<threat_model>`, e fechado: **o `ROW_COUNT` como prova de escrita.** `vagas_status_soft_delete_sync_trg` pode reescrever o status num BEFORE UPDATE, e um estabelecimento que confiasse no `ROW_COUNT` declararia sucesso sobre uma escrita que não pegou. O bloco **relê** a coluna, e a mensagem da asserção nomeia o trigger como causa provável.

## Issues Encountered

- **A prova de mordida de (j.1) e (j.3) precisou de um par, não de uma mutação.** Com o estado vivo correto, remover o estabelecimento não produz falha — a mutação sairia «0 reprovados» e a conclusão errada seria «o portão não morde». É a forma do §L aparecendo pelo lado que o §L não descreve: não é o harness que falha em silêncio, é o **cenário** que não existe. A deriva injetada dentro do envelope constrói o cenário, e o controle prova que é o estabelecimento que o atravessa.
- **`gsd-tools windows status --raw` disse `ok: true` sobre um ledger que o `append` recusou.** Duas verificações de consistência diferentes, e a que se chama «status» é a mais fraca. Quem fechar janela seguindo o §M deve rodar `append` (mesmo que com uma entrada de sanidade, depois corrigida) para saber se a tabela e o JSON realmente concordam.
- **Um erro meu que vale registrar:** a primeira extração do bloco JSON do `WINDOWS.md` procurou por cerca de três backticks e um objeto; o arquivo usa **quatro** e o conteúdo é um **array**. O `JSON.parse` estourou em «position 63416» — e o diagnóstico correto veio de olhar o arquivo, não de teorizar sobre o parser.
- `tsc` segue em **89**, teto 90 (D-53). Este plano não acrescentou nenhum erro — não toca `src/` nem `supabase/functions/`.

## User Setup Required

Nenhum. O token do Supabase já está no Keychain (serviço «Supabase CLI», conta «supabase»).

## Next Phase Readiness

**Pronto, e o 49-19 é quem colhe.**

- **`49-19`** (primeira execução real do motor, checkpoint) herda o 4º ramo do guard **EXERCITADO**: `(o)` prova as quatro recusas e as duas aceitações, `(o.6)` o BL-02 com sessão, `(o.7)` o par positivo com sessão nula, `(p)` o 3º ramo de `plano_exclusao_titular`. Era exatamente o que o `WINDOWS` 75 dizia que entraria não exercitado.
- **`49-20`** e qualquer plano futuro que acrescente letra a este arquivo: o total é **27** e o número vive em **DOIS** lugares — `v_esperado := 27` na (z) e a linha de trajetória do cabeçalho. Acrescentar asserção sem bumpar reprova o RESUMO; bumpar só um dos dois é o defeito que o 49-20 mediu no `p45_motor_exclusao_smoke` («gate FIXO em 25» quando o gate já era 30). O contador agora **sai do run** — leia-o, não o transcreva.
- **Quem rodar este smoke de agora em diante:** `node p46apply.cjs run supabase/tests/p46_purga_smoke.sql`. Exit 0 **e** `P46P_REG_CONTADOR=27` na saída. Exit 0 sozinho nunca foi verde.
- **Quem for mexer nas asserções (j):** o estado de partida é ESTABELECIDO, não lido. Se você acrescentar uma metade nova, estabeleça-a também — e, se o original divergir do canônico, reponha o **original lido**, como a (j.2) faz.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `supabase/tests/p46_purga_smoke.sql` — FOUND (modificado)
- `.planning/phases/49-consertos-da-jornada-bloco-2/49-28-SUMMARY.md` — FOUND
- `.planning/WINDOWS.md` — FOUND (67 e 75 `fixed` com razão no bloco JSON; 79 e 80 novas)
- commit `d23bb30a` — FOUND
- `commits: 1` no frontmatter = MEDIDO por `git rev-list --count 01e17574..HEAD` no
  instante da escrita deste SUMMARY. Re-medido depois do commit de metadado dá **2**,
  previsto no comentário do `actuals` — não é divergência.
- `<acceptance_criteria>` da Task 1 re-executados:
  - (j.2) estabelece `ativa` no envelope e relê o status; **nenhuma** asserção do arquivo
    usa o status vivo da vaga como linha de base (e (j.1)/(j.3) também passaram a
    estabelecer) — ver §Varredura de FORMA, linhas 1-3
  - smoke sem nenhum `P46P FAIL`; contador **LIDO** da execução (`P46P_REG_CONTADOR=27`)
    e conciliado com o `v_esperado := 27` da (z)
  - (o), (o.6), (o.7) e (p) nomeadas como alcançadas — o 27 é inatingível sem elas
  - PROD intocado: vaga `arquivada`, `anon` = 2 vagas, `updated_at` byte a byte idêntico,
    zero linha nova em `purga_execucoes` — **medidos DEPOIS**, duas vezes
  - as duas mutações que o plano pede (M1 pelo predicado, M2 removendo o conserto)
    reprovam, mais M1c isolando a 2ª metade e M3a/M4a com controles M3b/M4b
  - varredura de forma do arquivo inteiro no SUMMARY, 11 famílias com veredito
- `<verification>` de plano re-executada AGORA: `VERIFY-1a OK` (contador emitido) ·
  `VERIFY-1b OK` (nenhum `P46P FAIL`) · `VERIFY-2a OK` (vaga `arquivada`) ·
  `npm run -s lint` = **89** · `origin/main..HEAD` vazio depois do push.
- `gsd-tools windows status --raw` = `ok: true` (tabela e bloco JSON concordam).
