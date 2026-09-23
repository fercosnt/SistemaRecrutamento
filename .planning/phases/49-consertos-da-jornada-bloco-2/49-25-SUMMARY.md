---
phase: 49-consertos-da-jornada-bloco-2
plan: 25
subsystem: edge-functions
tags: [jorn-39, jorn-28, windows-60, entrevista-guias, gerar-guia-entrevista, deno, tdd, deploy, teto-de-custo, ai-06]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`CallAiResult.provider` (`anthropic|openai|none`) e `.error_code` do vocabulário fechado `_shared/ai-error-codes.ts` (`AI_ERROR_CODE.cost_cap_exceeded`, `.prompt_injection_detected`) — CONFERIDOS no disco antes de escrever qualquer coisa"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "24"
    provides: "o teste que MEDIU este defeito (o do teto de custo em `_local/merge-preserve.test.ts`, com o `gte()` que tornou o caminho `provider:'none'` alcançável por mock), a EF viva em v18, e a decisão `provider:'none'` ⇒ NULL nos dois campos de proveniência. NENHUMA asserção dele foi reescrita"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "11"
    provides: "o idioma `provedorDeResultado()` — «na dúvida sobre quem respondeu, não afirme» — replicado por EF (NÃO em `_shared`), que é o precedente do helper novo e do seu teste de unidade"
provides:
  - "um bloqueio ANTERIOR ao provedor nunca mais é persistido como guia pronto: a linha sai `incompleto: true` com o `error_code` do bloqueio em `flags`, e o rastro de runtime diz `needs_human: true`"
  - "`guiaDeResultado()` exportada — a pergunta «há roteiro?» keyed no PROVEDOR, não numa lista literal de códigos: cobre o teto de custo (AI-06), a injeção (RF-PL-18) e todo bloqueio pré-provedor futuro por construção"
  - "a proveniência do 49-24 deixa de poder descrever quem não escreveu nada: `result` só avança quando o re-prompt DE FATO produziu o roteiro persistido"
  - "EF `gerar-guia-entrevista` version=20 em PROD, `verify_jwt=true`"
  - "para o 49-16: um `flags`/`incompleto` vazio no guia passa a ter UMA causa (guia anterior à v20), não duas"
affects: [49-16, 49-18, 49-12]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 4523
  tasks: 1
  commits: 4
  plan_head_before: a818ee78c6370c27fcd15a4243c2fac806c9ed3e
  # `commits: 4` MEDIDO por `git rev-list --count a818ee78..HEAD` no instante da escrita
  # deste SUMMARY (bb577600, d1df410e, debeec49, 6d4eb35d) — os quatro de PRODUÇÃO,
  # nenhum de metadado. Re-medir DEPOIS do commit de metadado deste plano dá 5.
  # `tokens: 4523` = 18 094 octetos de `git diff a818ee78..HEAD -- supabase` ÷ 4.
  estimate_tokens_do_plano: 18000
  # O plano estimou 18 000 e o realizado foi 4 523 — 4,0× ABAIXO, na mesma direção e na
  # mesma ordem de grandeza do 49-24 (5,2×). A causa é idêntica e vale registrar porque
  # agora são sete amostras da fase na MESMA direção: o diff de produção é pequeno (um
  # helper de 4 linhas executáveis e três pontos de chamada), e o peso esteve inteiro em
  # LEITURA (a EF de 498 linhas, o `ai-client` de 1152, as quatro EFs irmãs varridas pelo
  # `<measure_first>`, o harness de mock de 274) e em MEDIÇÃO (PROD: as 5 linhas de
  # `entrevista_guias`, os zero bloqueios em `ai_call_logs`, o enum `llm_provider`, dois
  # bundles vivos). ⚠ O plano se declarou `confidence: low` — e acertou pelo motivo certo
  # desta vez: ele foi escrito mid-fase, sem passar pelo plan-checker, e DUAS das suas
  # quatro afirmações medidas saíram incompletas (ver §«Medições vivas»).

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a pergunta «há resultado?» é pelo PROVEDOR, nunca por lista de códigos de erro: `provider === 'none'` cobre o bloqueio de hoje e o de amanhã, enquanto enumerar códigos deixa o próximo fora da vigilância e o portão segue verde (CLAUDE.md §Portões, forma «iteração sobre lista literal»)"
    - "um stub devolvido para preservar uma invariante de produto (RNF-07a: nunca rejeitar por custo) é um objeto NÃO nulo — e por isso todo `x == null` a jusante dele é uma guarda que não guarda"
    - "quando uma variável de resultado é reatribuída por re-prompt, ela só pode AVANÇAR se a nova passada produziu o artefato que vai ser persistido; senão a proveniência descreve quem não escreveu nada"
    - "o cinto inalcançável não se remove nem se declara aprovado: ganha um teste de unidade do contrato, e a mutação que não mordia passa a morder"
    - "conferir o marcador no bundle VIVO pega o que o grep no disco não procurou — foi a conferência de publicação, não um smoke, que encontrou a citação proibida do §K neste plano"

key-files:
  created: []
  modified:
    - supabase/functions/gerar-guia-entrevista/index.ts
    - supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts

key-decisions:
  - "A condição é `provider === 'none'` (mais o provedor vazio/ausente), e o `error_code` virou DIAGNÓSTICO, nunca gatilho. O `must_haves` proibia a lista literal e a medição confirmou que a proibição é substantiva, não estética: os DOIS retornos `provider:'none'` do `ai-client` devolvem `parsed` não nulo, e a guarda antiga só conhecia um deles pelo nome. A mutação M2 reproduz exatamente a forma proibida e reprova 3 testes — o portão MORDE a forma errada, não só a ausência do conserto."
  - "`guide` é anulado ANTES do passo 7, o que também elimina um segundo pedido ao modelo que não podia dar em nada. Com dimensão fraca descoberta e o teto estourado, a EF fazia o re-prompt, tomava outro `provider:'none'` e ainda gravava `weak_dim_uncovered` — um diagnóstico FALSO (a causa era o gasto, não a cobertura). Anular na origem resolve os dois."
  - "`result` só avança quando o re-prompt produziu o roteiro (`if (reGuide) { result = reResult; … }`). Sem isso o conserto CRIARIA uma atribuição errada nova: um re-prompt barrado deixaria o roteiro da 1ª passada em pé com `provedor_ia`/`modelo_ia` NULL — a linha afirmando que ninguém escreveu um conteúdo de autor conhecido. É a mesma família do JORN-28 e o teste #2 do plano existe para ela. ⚠ Isso CONSERTA de passagem um caso pré-existente do 49-24: um re-prompt com PARSE falho já reatribuía `result`, e se essa 2ª passada tivesse caído no fallback OpenAI a linha atribuiria à OpenAI um roteiro escrito pela Anthropic."
  - "A resposta HTTP continua `{ok:true}` 200. O `<action>` pedia «a resposta NÃO deve ser um sucesso silencioso» e a honestidade desta EF mora na LINHA, não no código de status: o caminho `guide == null` (parse falho) já respondia 200 com `{incompleto:true, flags}` desde a WR-04, e o payload é NEUTRO por desenho (o RH abre o roteiro pela UI/serviço). Dar 500 ao teto de custo transformaria um corte de gasto BEM-SUCEDIDO em falha visível do sistema — o mesmo erro que o 49-24 evitou ao não gravar a string `none` crua. A resposta deixa de ser silenciosa porque a linha fala."
  - "Os testes novos foram para `_local/merge-preserve.test.ts`, não para `__tests__/index.test.ts` que o `files_modified` do plano nomeia. Esse diretório NÃO EXISTE nesta EF; o harness que captura o objeto do upsert em `writes[]` mora no arquivo `_local`, e é sobre esse objeto que as asserções falam. Criar o segundo arquivo duplicaria a superfície mockada do handler — a próxima mudança de contrato consertaria uma cópia e deixaria a outra verde (a mesma razão que o 49-24 registrou)."
  - "NÃO consertei o `persistFlags` descartado no caminho do roteiro existente, que MEDI aqui (WINDOWS 64). É pré-existente, é do ENTREV-01 (não do JORN-39) e mudaria a forma do guia no caminho de SUCESSO, que o 49-16 vai ler. Registrado com o conserto escrito, porque sem ele o selo do 49-16 nunca verá `weak_dim_uncovered`."
  - "NÃO consertei `avaliar-transcricao-entrevista:377`, que tem a MESMA forma do defeito (WINDOWS 65). Scope Boundary: é EF de outro plano, e as sete consumidoras compartilham `_shared` — um segundo sítio pede plano próprio. Medido pelo item 4 do `<measure_first>` e registrado com precisão suficiente para quem o pegar não precisar redescobrir."

patterns-established:
  - "A quarta vez na fase que a prova de mordida entrega mais pelo que NÃO morde (49-09 M8, 49-23 M3, 49-24 M5, 49-25 M5) — e a PRIMEIRA em que o conserto foi dar VIGILÂNCIA ao próprio cinto em vez de procurar outro caminho descoberto. Um teste de unidade do contrato do helper (precedente: `provedorDeResultado` em `analise-candidato-individual`) levou M5 de 0 para 1 e M1/M2 de 2 para 3. O cinto continua inalcançável e agora a sua remoção reprova."
  - "O §K do PATTERNS pegou pela TERCEIRA vez na fase — e desta vez o portão que o pegou foi a conferência de marcador no BUNDLE VIVO. O comentário que explicava a condição retirada reproduzia a forma dela; o grep no disco, que eu escrevi procurando o que eu QUERIA, não a procurava. Ler o bundle publicado é um portão sobre o que o disco não foi consultado a respeito."
  - "`<measure_first>` como instrumento, não cerimônia: das quatro afirmações do plano que ele mandou medir, DUAS estavam incompletas e UMA revelou um sítio irmão com o mesmo defeito. Um plano escrito mid-fase sem plan-checker se beneficia mais da medição do que da leitura."

requirements-completed: [JORN-39]

# Coverage (#1602)
coverage:
  - deliverable: "Um bloqueio anterior ao provedor (teto de custo AI-06) nunca é persistido como guia bem-sucedido"
    requirement: JORN-39
    human_judgment: false
    verification:
      - kind: test
        ref: "merge-preserve.test.ts#49-25 «teto de custo estourado NÃO é persistido como guia pronto» — `incompleto: true`, `cost_cap_exceeded` em `flags`, e as DUAS chaves do stub (`recommendation`, `flagged_for_human_review`) asseridas AUSENTES de dentro de `guia`, que é a forma exata do defeito medido"
        status: pass
      - kind: other
        ref: "mutação M1 (helper devolve `parsed` cru — o defeito original) ⇒ 3 reprovados; M4 (a flag perde o código do bloqueio) ⇒ 1"
        status: pass
      - kind: command
        ref: "marcadores no bundle VIVO da v20: `guiaDeResultado` ×6, `provider === \"none\"` ×2, `GuiaSlice` ×1, `if (guide == null) {` ×2 — e a forma retirada em **0**"
        status: pass
  - deliverable: "A condição é pelo PROVEDOR, não por uma lista literal de `error_code`"
    requirement: JORN-39
    human_judgment: false
    verification:
      - kind: command
        ref: "`grep -nE 'provider\\s*===\\s*[\"']none[\"']' index.ts` → presente (`:171`); `grep -E 'error_code === \"(cost_cap_exceeded|prompt_injection_detected)\"'` → ZERO ocorrências em toda a EF"
        status: pass
      - kind: other
        ref: "mutação M2 — a forma PROIBIDA reintroduzida literalmente (lista de um item, só a injeção) ⇒ 3 reprovados. O portão morde a forma errada, não só a ausência do conserto"
        status: pass
      - kind: integration
        ref: "os DOIS retornos `provider:'none'` do `ai-client` lidos no disco (`:713` teto de custo, `:761` injeção): os dois com `parsed` NÃO nulo, `model: null` e `error_code` do vocabulário do 49-02"
        status: pass
  - deliverable: "Perguntas `origem:'manual'` preservadas sob bloqueio (ENTREV-08), por asserção"
    requirement: JORN-39
    human_judgment: false
    verification:
      - kind: test
        ref: "o mesmo teste do teto: `qs.length === 1`, `origem === 'manual'` e o TEXTO da pergunta conferido contra a fixture — um bloqueio por custo não apaga edição humana"
        status: pass
      - kind: test
        ref: "os 3 testes ENTREV-08 pré-existentes seguem verdes, sem nenhuma asserção editada"
        status: pass
  - deliverable: "O conserto não cria uma atribuição de proveniência errada nova"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "merge-preserve.test.ts#49-25 «re-prompt barrado pelo teto NÃO apaga o roteiro da 1ª passada» — a pergunta `origem:'ia'` da 1ª passada sobrevive, e `provedor_ia='anthropic'` + `modelo_ia` da versão datada: a linha registra quem ESCREVEU o que ela guarda"
        status: pass
      - kind: other
        ref: "mutação M3 (`result` avança mesmo sem o re-prompt ter produzido o roteiro) ⇒ 1 reprovado"
        status: pass
      - kind: test
        ref: "os 4 testes de proveniência do 49-24 seguem verdes, nenhuma asserção reescrita (o `<required_reading>` era explícito sobre isso)"
        status: pass
  - deliverable: "O cinto do provedor vazio/ausente é vigiado, não apenas presente"
    human_judgment: false
    verification:
      - kind: test
        ref: "merge-preserve.test.ts#49-25 «guiaDeResultado: sem provedor não há roteiro» — teste de UNIDADE do contrato, com o cinto (`provider: ''` e ausente) asserido por linha própria"
        status: pass
      - kind: other
        ref: "mutação M5 (cinto removido) ⇒ **0 reprovados antes, 1 depois**. A vigilância cresceu de forma medida, e M1/M2 subiram de 2 para 3"
        status: pass
      - kind: integration
        ref: "a INALCANÇABILIDADE do cinto foi MEDIDA, não inferida: os 12 retornos de `CallAiResult` em `ai-client.ts` carregam literal não vazio, e o único de origem externa (replay por chave de idempotência, `:530`) lê `ai_call_logs.provider`, que em PROD é o enum `llm_provider` NOT NULL (`anthropic|openai|google|none`)"
        status: pass
  - deliverable: "A EF está VIVA em PROD com o conserto, e os dois canais (EF e git) em dia"
    human_judgment: false
    verification:
      - kind: command
        ref: "`node efdeploy.cjs gerar-guia-entrevista --dry-run` → 12 arquivos, os MESMOS 12 da v18 (nenhum a mais, nenhum a menos), conferidos um a um; depois sem `--dry-run` → «OK · version=19/20 · ACTIVE · verify_jwt=true»"
        status: pass
      - kind: command
        ref: "Management API RELIDA: `version: 20`, `status: ACTIVE`, `verify_jwt: true`, `import_map: true`"
        status: pass
      - kind: command
        ref: "`git log --oneline origin/main..HEAD` → vazio (push `a818ee78..6d4eb35d` executado)"
        status: pass
  - deliverable: "Nenhuma regressão além do pedido"
    human_judgment: false
    verification:
      - kind: test
        ref: "suíte Deno das EFs: **718 passed, 0 failed** (baseline 715 = 718 − os 3 testes novos)"
        status: pass
      - kind: command
        ref: "`npm run -s lint` (tsc --noEmit) → **89** erros, teto D-53 = 90, e o CONJUNTO DE MENSAGENS é idêntico ao baseline (`diff` sobre as 89 linhas ordenadas, não só a contagem)"
        status: pass
  - deliverable: "O RH VÊ que o roteiro foi barrado, em vez de receber um roteiro vazio com cara de pronto"
    requirement: JORN-39
    human_judgment: true
    rationale: "NÃO fechado por este plano — é o passo «cliente» que o D-55 separa. A linha agora DECLARA `incompleto: true` + `cost_cap_exceeded`, e o `normalizeGuia` do front já trata `{incompleto, flags}` (o teste `guia-normalize.test.ts:88` cobre a forma). Quem TRADUZ o código para o RH é o selo do 49-16. Melhor que a linha mentir, e ainda não é a tela."
  - deliverable: "Um bloqueio REAL em PROD exercitando o caminho"
    human_judgment: true
    rationale: "MEDIDO: **zero** linhas com `provider='none'` em `ai_call_logs` desde sempre, e o gasto diário por vaga mais alto da história do projeto é US$ 0,3096 contra um teto de US$ 50 — 161× de folga. O defeito é LATENTE: nunca manifestou. A observação real depende de o teto ser baixado ou de o volume subir duas ordens de grandeza; a asserção fica no handler, com mock, que é onde o objeto do upsert é observável."

# Metrics
duration: ~35 min
completed: 2026-09-23
tasks: 1
files: 2
---

# Phase 49 Plano 49-25: Um guia que nenhum modelo escreveu diz que não foi escrito Summary

**Com o teto diário de custo estourado, `callAi` devolve um `parsed` que NÃO é nulo — um stub
de recomendação que existe para preservar a RNF-07a. A EF lia «`parsed` não nulo» como «há
roteiro» e gravava a linha como guia gerado: zero perguntas de IA, nenhuma flag, resposta de
sucesso. A guarda passou a perguntar pelo PROVEDOR, não por uma lista de códigos: cobre o
teto, a injeção e todo bloqueio pré-provedor futuro por construção. De passagem, `result` só
avança quando o re-prompt DE FATO escreveu o roteiro — sem isso o conserto criaria uma
atribuição errada nova. Version 20 viva em PROD, e o defeito nunca manifestou em PROD (zero
bloqueios registrados), então é prevenção, não remediação.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-23 (01:37 BRT / 04:37Z, último commit de produção)
- **Tasks:** 1 / 1 (`type="tdd"`)
- **Files:** 2 modificados, 0 criados
- **Testes:** 14 → **17** no conjunto da EF; suíte das EFs 715 → **718**, sempre 0 falhas

## As quatro medições que o `<measure_first>` pediu — duas corrigem o plano

### 1. O que `callAi` devolve quando o teto de custo (AI-06) trip

Lido de `_shared/ai-client.ts:712-726`, não inferido:

| Campo | Valor |
|---|---|
| `provider` | `"none"` |
| `parsed` | `{ recommendation: "hold", flagged_for_human_review: true }` |
| `error_code` | `AI_ERROR_CODE.cost_cap_exceeded` |
| `model` / `log_id` | `null` / `null` |
| `flagged_for_human_review` | `true` |

**Delta contra o plano:** ele diz `parsed = {recommendation:'hold'}`. O objeto tem **duas**
chaves, e a segunda é a que importa: `flagged_for_human_review: true`. Isso porque as três
EFs irmãs (`analise-candidato-individual`, `avaliar-redacao`, `avaliar-redacao-cultural`)
testam **exatamente essa chave** e por isso estão cobertas contra este mesmo defeito —
enquanto `gerar-guia-entrevista` e `avaliar-transcricao-entrevista` não a testam. A chave
omitida do plano é a explicação de por que o defeito existe só em duas das cinco.

Há **quatro** ocorrências de `provider: "none"` no arquivo; **duas** são retornos
(`:713` teto de custo, `:761` injeção) e duas são payloads de `logAiCall` (`:687`, `:740`).

### 2. `needsHumanFlag` pode ser `true` nesse caminho? Sim — e é pior que o plano supõe

O plano trata «nenhuma dimensão fraca» como precondição do defeito. Medido, a precondição
governa apenas o **sintoma**, e o defeito existe nas duas pontas:

| Dimensões fracas | Comportamento ANTES do conserto |
|---|---|
| nenhuma | `persistFlags` vazio, `incompleto` ausente, `{ok:true}`. É o caso do `WINDOWS 60` |
| ≥1 descoberta | a EF faz o **re-prompt**, toma outro `provider:'none'`, e calcula `weak_dim_uncovered` — um diagnóstico **FALSO** (a causa é o gasto, não a cobertura). E a linha **ainda não** sai `incompleto` |

E há um agravante que o plano não podia prever: nesse segundo caso o `weak_dim_uncovered`
calculado **nem é gravado** — ver §«O defeito que medi e não consertei».

### 3. Quantas linhas em PROD já estão nesse estado? **Zero** — o defeito é LATENTE

Leitura só de `SELECT` (2026-09-23):

| Medição em `entrevista_guias` | Valor |
|---|---|
| linhas totais | **5** |
| com 0 perguntas | **0** |
| com a chave `recommendation` (a marca do stub) | **0** |
| com `incompleto` verdadeiro | **0** |
| com a chave `flags` | **0** |
| perguntas por linha | 5, 5, 5, 6, 6 |

E em `ai_call_logs`: **zero** linhas com `provider='none'` em toda a história do projeto — o
teto de custo nunca cortou, a injeção nunca disparou. O gasto diário por vaga mais alto
jamais registrado é **US$ 0,3096** (13 chamadas, 2026-09-06) contra o teto de **US$ 50**:
161× de folga.

**Consequência para o 49-12 (D-30):** não há nada retroativo a corrigir. A premissa do plano
(«se a contagem for não-trivial, é matéria do 49-12») está resolvida com contagem **0**. Os 5
guias existentes ficam com proveniência NULL porque são anteriores à v18, que é a outra causa
honesta — e agora a **única** restante para um `flags` vazio.

### 4. Outra EF com a mesma forma? **Uma** — e ela não é minha

Varridas as cinco consumidoras de `callAi` que persistem resultado:

| EF | Guarda | Teto de custo cai onde? |
|---|---|---|
| `analise-candidato-individual:540,553` | `parsed == null` **+ `flagged_for_human_review === true`** | linha `falhou`. **Coberta** |
| `avaliar-redacao:403,419` | idem | `pendente_humano` com `error_code`. **Coberta** |
| `avaliar-redacao-cultural:385-387` | idem | `pendente_humano`. **Coberta** |
| `gerar-guia-entrevista:329` | `parsed == null \|\| error_code === <injeção>` | **o defeito deste plano** |
| **`avaliar-transcricao-entrevista:377`** | `parsed == null \|\| error_code === <injeção>` | **cai no caminho de SUCESSO** e grava `status_analise='pendente_humano'` com competências vazias — indistinguível de uma análise real esperando revisão |

**NÃO consertada** (Scope Boundary, e o `<measure_first>` foi explícito: reportar, não
consertar). Registrada em **WINDOWS 65** com o conserto escrito. As sete EFs compartilham
`_shared`, e um segundo sítio pede plano próprio.

## O conserto — três mudanças, nenhuma coluna, nenhuma migration

`guiaDeResultado(result)` substitui `result.parsed` cru nos **dois** pontos em que a EF
decide se existe roteiro:

1. **Passo 6.** `guide = guiaDeResultado(result)`. Anular na origem também elimina o segundo
   pedido ao modelo que não podia dar em nada (§medição 2).
2. **Passo 7.** `result` só avança quando o re-prompt **produziu** o roteiro que vai ser
   persistido. Ver §«O conserto de passagem».
3. **Passo 8.** A condição virou estrutural (`guide == null`). O `error_code` é o
   **diagnóstico** que vai para `flags` — nunca mais o gatilho.

O helper pergunta pelo provedor (`!result.provider || result.provider === "none"`), o que
cobre `cost_cap_exceeded`, `prompt_injection_detected` e qualquer bloqueio pré-provedor
futuro **por construção**. Enumerar códigos é a forma «iteração sobre lista literal» que o
CLAUDE.md §Portões descreve — e a mutação M2 prova que o portão morde essa forma, não só a
ausência do conserto.

`max_tokens` do `interview_guide` **não** foi tocado (segue em 8000); nenhum bloco novo vai
ao modelo, então o risco de 98,4 s contra o teto de 110 s **não é agravado** — continua sendo
do P1, como o plano manda.

## O conserto de passagem — e por que ele era obrigatório, não escopo extra

O passo 7 reatribuía `result` **incondicionalmente** antes de saber se a 2ª passada tinha
produzido algo. Sem mexer nisso, o meu próprio conserto criaria um defeito novo: um
re-prompt barrado pelo teto deixaria o roteiro da 1ª passada em pé com `provedor_ia`/
`modelo_ia` **NULL** — a linha afirmando que ninguém escreveu um conteúdo de autor
conhecido. Exatamente a família do JORN-28.

⚠ E isso **conserta de passagem um caso pré-existente do 49-24**: um re-prompt cujo
**parse** falhasse já reatribuía `result`. Se essa 2ª passada tivesse caído no fallback
OpenAI, a linha atribuiria à OpenAI um roteiro escrito pela Anthropic. Narrow, real, e agora
fechado — com a regra do 49-24 («a proveniência é da última passada») **preservada e
afiada**: a última passada relevante é a que escreveu a linha, não a que rodou por último.

## A prova de mordida (D-56) — 5 mutações, e a que não mordia passou a morder

| # | Mutação | Reprovados (antes do teste de unidade → depois) |
|---|---|---|
| M1 | helper devolve `parsed` cru (o defeito original) | 2 → **3** |
| M2 | **a forma PROIBIDA**: lista literal de um código em vez do provedor | 2 → **3** |
| M3 | `result` avança mesmo sem o re-prompt ter produzido o roteiro | **1** |
| M4 | a flag perde o código do bloqueio (grava `ia_sem_resultado` fixo) | **1** |
| M5 | cinto do provedor vazio/ausente removido | **0 → 1** |

Restauração `git checkout --` **verificada em todas as cinco**, com `git diff --quiet` como
guarda de entrada e uma checagem de que a mutação de fato alterou o arquivo (uma mutação que
não muda nada e «reprova 0» é um resultado inválido disfarçado de medição). A árvore estava
commitada nas duas execuções — a lição do 49-09 via 49-23 e 49-24.

### M5 não mordia, e desta vez o conserto foi vigiar o próprio cinto

Quarta vez na fase que uma mutação não morde (49-09 M8, 49-23 M3, 49-24 M5). O ramo é
inalcançável, e isso foi **MEDIDO**: os 12 retornos de `CallAiResult` em `ai-client.ts`
carregam um literal não vazio, e o único de origem externa — o replay por chave de
idempotência (`:530`, `String(existing.provider ?? "unknown")`) — lê
`ai_call_logs.provider`, que em PROD é o enum **`llm_provider` NOT NULL**
(`anthropic|openai|google|none`). String vazia é impossível pelo esquema.

As três vezes anteriores a resposta foi procurar **outro** caminho descoberto. Aqui a
resposta foi mais barata e melhor: dar vigilância **ao cinto**, com um teste de unidade do
contrato do helper — precedente direto do irmão `provedorDeResultado` em
`analise-candidato-individual`. O cinto continua inalcançável, e agora **a sua remoção
reprova**. Efeito colateral medido: M1 e M2 subiram de 2 para 3.

(Nota de reachability que registro porque custa zero agora: a injeção é inalcançável nesta EF
porque `rawInput` é montado pela própria função — **com uma exceção**. O `extraInstruction`
do re-prompt interpola `coverage.missing`, cujos rótulos vêm de
`scores_candidato.metadata.competencias[].competency`, que por sua vez saiu da saída de um
LLM sobre dados do candidato. Caminho estreito e indireto; não construí teste para ele, e o
conserto deste plano o cobre por construção de qualquer modo.)

## O §K pegou pela terceira vez na fase — e o portão foi o bundle vivo

O comentário que eu escrevi no passo 8 para explicar a condição **retirada** reproduzia a
forma dela. O meu próprio grep de verificação não a procurava: eu tinha escrito o grep para
achar o que eu **queria** no disco (`provider === "none"`), não o que eu havia acabado de
proibir.

Quem pegou foi a **conferência de marcador no bundle publicado**: a expressão apareceu
`2×` no corpo vivo da **v19** — publicada, no mesmo arquivo que a tinha removido. Consertado
por descrição em prosa (commit `6d4eb35d`), zero ocorrências no disco conferidas por grep, e
**v20 deployada** para que o bundle vivo case com o disco. Um bundle que diverge do disco é o
outro modo de falha dos dois canais que o CLAUDE.md descreve.

Terceira ocorrência do §K na fase (49-09, 49-23, 49-25) — e a **primeira** em que o portão
que a pegou não foi um smoke SQL.

## O defeito que medi e NÃO consertei — o que o 49-16 precisa saber

`persistFlags` é computado e então **descartado** quando existe roteiro. O upsert grava
`flags` **apenas** no ramo `{ incompleto: true, flags, questions }`:

```
guia: guide ? { ...guide, questions: mergedQuestions }
            : { incompleto: true, flags: persistFlags, questions: manualQs },
```

Logo um roteiro que, **depois** do re-prompt, ainda deixa uma dimensão fraca descoberta é
persistido **sem nenhuma flag** — enquanto o docblock da EF afirma que ela «persiste o
roteiro com flag para humano (nunca passa um roteiro incompleto em silêncio)». O rastro de
runtime do meu teste #2 mostra os dois lados: `needs_human: true` no log e nenhuma flag na
linha.

**Não consertado** — é pré-existente, é do **ENTREV-01** (não do JORN-39), e mudaria a forma
do guia no caminho de **sucesso**, que o 49-16 vai ler. **WINDOWS 64**, com o conserto
escrito (uma linha: acrescentar `flags` ao ramo do roteiro existente). **O 49-16 precisa
disto**: sem ele o selo nunca verá `weak_dim_uncovered`.

## Deploy (D-52) — fechamento conferido À MÃO contra a versão viva

O cabeçalho do `efdeploy.cjs` afirma recusar subir se o fechamento divergir da lista
esperada; **essa checagem não existe no código** — mesmo achado dos planos 49-03, 49-08,
49-09, 49-23 e 49-24. Daí a conferência manual.

**12 arquivos, exatamente os mesmos 12 da v18** — nenhum a mais, nenhum a menos. Dois
tamanhos mudaram:

| Arquivo | v18 | v19/v20 | Por quê |
|---|---|---|---|
| `functions/gerar-guia-entrevista/index.ts` | 24 761 | 28 128 → **28 371** | este plano |
| `functions/_shared/entrevista-schemas.ts` | 3 246 | **4 242** | **não é meu** — do 49-10 (`0d9a46db`) |

⚠ O `entrevista-schemas.ts` crescido entrou no meu bundle por carona. Conferido linha a
linha: o diff do 49-10 toca **apenas** `AvaliarTranscricaoBodySchema` (um `tipo` opcional),
consumido por `avaliar-transcricao-entrevista`. Esta EF usa `GerarGuiaBodySchema`, **intacto**
— a carona é inerte aqui. Registro porque um `_shared` que cresce entre dois deploys é
exatamente o que publica trabalho de outro plano sem que ninguém decida, e a verificação é
barata.

`functions/deno.json` **não aparece** na lista do `--dry-run` (o script o anexa depois,
`efdeploy.cjs:136`) mas vai no payload: `import_map: true` conferido nas duas versões, porque
um import map faltando não falha no deploy — falha na primeira invocação.

## Verification results

| Verify | Resultado |
|---|---|
| `<verify>` #1 — `deno test` da EF | **17 passed, 0 failed** |
| `<verify>` #1 — `grep -qE "provider\s*===\s*['\"]none['\"]"` | presente (`index.ts:171`) |
| `<verify>` #1 (`fails_when`) — lista literal de `error_code` como gatilho | **ZERO** ocorrências em toda a EF |
| `<verify>` #2 — `npm run -s lint` ≤ 90 | **89**, e conjunto de MENSAGENS idêntico ao baseline |
| `<verify>` #2 — `git log --oneline origin/main..HEAD` | **vazio** (push `a818ee78..6d4eb35d`) |
| Deploy — `--dry-run` | 12 arquivos, os mesmos 12 da v18, conferidos um a um |
| Deploy — `node efdeploy.cjs gerar-guia-entrevista` | **OK · version=20 · ACTIVE · verify_jwt=true** |
| Management API **relida** | `version: 20`, `status: ACTIVE`, `verify_jwt: true`, `import_map: true` |
| Bundle **vivo** da v20 | `guiaDeResultado` ×6 · `provider === "none"` ×2 · `GuiaSlice` ×1 · a forma retirada em **0** |
| **Regressão além do pedido:** suíte Deno das EFs | **718 passed, 0 failed** (baseline 715) |
| Prova de mordida | 5 mutações, **todas mordem** (3/3/1/1/1), restauração verificada em cada |

## Medições vivas (D-49 / D-51) — o plano NÃO foi ajustado para caber

| O que o plano assume | Medido (2026-09-23) | Bate? |
|---|---|---|
| Precondição: EF v18 em PROD | `version 18`, ACTIVE, `verify_jwt` true | sim |
| Precondição: `AI_ERROR_CODE.cost_cap_exceeded` no disco | presente em `_shared/ai-error-codes.ts` | sim |
| `parsed = {recommendation:'hold'}` no teto | **duas** chaves; a 2ª (`flagged_for_human_review`) é a que explica por que só 2 de 5 EFs têm o defeito | **não, incompleto** |
| defeito requer «nenhuma dimensão fraca» | governa o SINTOMA, não a existência; com dimensão fraca o diagnóstico sai **falso** (`weak_dim_uncovered`) | **não, incompleto** |
| os 4 retornos `provider:'none'` (`:680-770`) | **4 ocorrências, 2 retornos** (`:713`, `:761`); as outras 2 são payloads de `logAiCall` | sim, com refino |
| `persistFlags` em `:328-332` | `:328-332` antes; `:385-388` depois | sim |
| testes em `__tests__/index.test.ts` | **o diretório não existe** nesta EF; o harness é `_local/merge-preserve.test.ts` | **não** |
| linhas defeituosas em PROD | **0** (e **0** bloqueios em `ai_call_logs` desde sempre) | sim, com número |
| «alguma outra EF com a mesma forma?» | **uma**: `avaliar-transcricao-entrevista:377` | sim, achada |
| `VERIFY_JWT['gerar-guia-entrevista'] = true` | `efdeploy.cjs:54` | sim |
| `tsc` em 89, teto D-53 = 90 | **89**, conjunto de mensagens idêntico | sim |

## Deviations from Plan

**1. [Rule 2 - Funcionalidade crítica ausente] `result` reatribuído sem saber se a 2ª passada produziu o roteiro**

- **Found during:** desenho do GREEN, ao perguntar o que aconteceria se o **re-prompt** — e
  não a 1ª passada — fosse o barrado.
- **Issue:** o passo 7 fazia `result = await runGuide(...)` **antes** de checar `reGuide`.
  Com o conserto do plano aplicado sozinho, um re-prompt barrado deixaria o roteiro da 1ª
  passada persistido com `provedor_ia`/`modelo_ia` **NULL** — a linha negando o autor de um
  conteúdo cujo autor é conhecido. O conserto **criaria** uma atribuição errada nova, da
  mesma família que o JORN-28 fecha. E há o caso pré-existente do 49-24 por baixo: um
  re-prompt com parse falho já reatribuía `result`, e se essa 2ª passada tivesse caído no
  fallback a linha atribuiria à OpenAI um roteiro da Anthropic.
- **Fix:** `result = reResult` **dentro** do `if (reGuide)`. A regra do 49-24 fica preservada
  e afiada: a última passada relevante é a que escreveu a linha.
- **Files modified:** `supabase/functions/gerar-guia-entrevista/index.ts`
- **Verification:** teste #2 do plano; mutação M3 ⇒ 1 reprovado.
- **Commit:** `d1df410e`

**2. [Rule 1 - Bug] O comentário do conserto reproduzia a forma que o conserto removeu (§K)**

- **Found during:** conferência de marcador no bundle VIVO da v19, depois do deploy.
- **Issue:** ao explicar a condição retirada, o comentário reproduziu a forma dela. O grep de
  verificação que eu escrevi procurava o que eu **queria** no disco, não o que eu havia
  proibido, então não a viu. O bundle publicado a mostrou `2×`. É o §K do PATTERNS, medido
  pela terceira vez na fase.
- **Fix:** descrição em prosa, sem reproduzir a forma; grep confirmando **0** no disco; **v20
  deployada** para o bundle vivo casar com o disco.
- **Files modified:** `supabase/functions/gerar-guia-entrevista/index.ts`
- **Verification:** `grep 'guide == null || result.error_code'` → 0 no disco e 0 no bundle da
  v20; 17/0 nos testes.
- **Commit:** `6d4eb35d`

**3. [Rule 3 - Blocker instrumental] O caso «só o re-prompt barrado» não era expressável no mock**

- **Found during:** escrita do teste #2.
- **Issue:** `custoDiarioUsd` era um número só — a soma do gasto do dia era a mesma em todas
  as chamadas, logo o cenário «a 1ª passada roda e a 2ª é barrada» era inalcançável. E sem
  linhas de `scores_candidato` no mock, `weakDims` era sempre `[]` e o re-prompt **nunca**
  acontecia. Sem os dois, o conserto do passo 7 não teria teste nenhum.
- **Fix:** `custoDiarioUsd` aceita um **array** (um valor por leitura, uma leitura por
  `callAi`) e `scores_candidato` passou a ser servido. Verificado que só a soma de custo
  consome o `then()` — o replay por idempotência usa `maybeSingle()`, que o mock responde
  com `null`, então a sequência é determinística.
- **Files modified:** `supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts`
- **Verification:** os 14 testes pré-existentes seguem verdes (as mudanças são aditivas); o
  teste #2 exercita as duas passadas, com `weak_dims_count: 1` no log.
- **Commit:** `bb577600`

**4. [Registro, não conserto] O `files_modified` do plano aponta um arquivo que não existe**

- O plano nomeia `supabase/functions/gerar-guia-entrevista/__tests__/index.test.ts`. Esse
  **diretório não existe** nesta EF. Os testes do handler vivem em
  `_local/merge-preserve.test.ts`, onde está o `makeMockSupabaseAdmin` que captura o objeto
  do upsert em `writes[]` — o ativo sobre o qual as asserções falam. Criar o segundo arquivo
  duplicaria a superfície mockada e a próxima mudança de contrato consertaria uma cópia
  deixando a outra verde (a razão que o 49-24 já registrou). O `<plan_provenance>` avisava
  que este plano não passou pelo plan-checker; este é um dos dois lugares onde isso aparece.

---

**Total deviations:** 3 consertos (1 × Rule 1, 1 × Rule 2, 1 × Rule 3) + 1 registro.
**Impact:** nenhum negativo. A **1** é a mais importante: sem ela o conserto trocaria um
defeito de flag por um defeito de atribuição, e o plano não a previa. A **2** é a única que
chegou a PROD (na v19, num comentário, sem efeito executável) e foi pega pelo portão certo.

## Deferred (registrado, não consertado)

| Item | Por quê fica fora | Onde |
|---|---|---|
| **`persistFlags` descartado quando existe roteiro** — `weak_dim_uncovered` é computado e nunca gravado; o docblock da EF promete o contrário | pré-existente, requisito **ENTREV-01** (não JORN-39), e muda a forma do guia no caminho de sucesso que o 49-16 lê | **WINDOWS 64** |
| **`avaliar-transcricao-entrevista:377` tem a MESMA forma** — teto de custo cai no caminho de sucesso e grava análise `pendente_humano` com competências vazias | Scope Boundary: EF de outro plano; as 7 consumidoras compartilham `_shared` e um 2º sítio pede plano próprio | **WINDOWS 65** |
| O `<verify>` #2 embute escrita (deploy) e não é re-rodável | **quinta** ocorrência da fase | **WINDOWS 66** (as 4 anteriores em WINDOWS 59) |
| Guias já persistidos vazios por teto de custo **não** são reescritos | D-30 — e a contagem medida é **0**, então não há matéria para o 49-12 | §medição 3 |
| Nenhuma tela traduz `incompleto`/`flags` para o RH | o selo é o 49-16 (D-55) | **WINDOWS 61**, irmão |
| `max_tokens` do `interview_guide` (8000) e 98,4 s contra o teto de 110 s | P1, explicitamente fora (`must_haves.truths`). Este plano **não agrava**: nenhum bloco novo ao modelo, e na verdade **remove** um pedido inútil (§medição 2) | §Issues |
| `gerar-guia-entrevista:271` — o 6º sítio de `vagaRubricBlock` | é do 49-10/49-11; não toquei | §Issues |

**WINDOWS 60 marcado como `fixed`** — é o defeito que este plano existe para fechar.

## Known Stubs

**Nenhum.** Varridos os 2 arquivos tocados por
`TODO|FIXME|placeholder|coming soon|not available|não disponível|= \[\]|= \{\}`. Os 4
acertos são **acumuladores** que a execução preenche — `persistFlags: string[] = []`
(pré-existente), `writes: […] = []` (pré-existente), e os dois novos do mock
(`scoreRows = []` como default de parâmetro, `rows: unknown[] = []` como acumulador local).
Nenhum valor vazio codificado que chegue à tela, nenhum componente sem fonte de dados.

⚠ **Uma coisa que NÃO é stub mas parece:** o cinto `!result.provider` em
`guiaDeResultado`. Inalcançável por construção — **medido** contra o esquema de PROD (enum
`llm_provider` NOT NULL) e contra os 12 retornos do `ai-client` —, mantido como segunda
linha de defesa e agora **vigiado por teste de unidade**. Não é ramo esquecido nem TODO.

## Threat Flags

Nenhuma superfície nova: nenhum endpoint, nenhum caminho de auth, nenhuma mudança de
esquema, nenhuma tabela, nenhuma coluna, nenhuma migration. As duas mitigações declaradas
ficaram provadas:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-25-01 (roteiro barrado por custo persistido como sucesso vazio) | mitigate | `guiaDeResultado` + a condição estrutural do passo 8; 3 testes novos; mutações M1 (3), M2 (3), M4 (1), M5 (1); marcador `guiaDeResultado` ×6 no bundle vivo |
| T-49-25-02 (bloqueio apagar pergunta manual) | mitigate | asserção própria no teste do teto (`qs.length === 1`, `origem === 'manual'`, texto conferido) + os 3 testes ENTREV-08 pré-existentes intactos |
| T-49-25-SC (supply chain) | mitigate | **zero** instalação de pacote, **zero** import novo; o fechamento do deploy não ganhou nem perdeu arquivo |

`verify_jwt=true` **preservado** e relido de PROD. RNF-07a intacta: a EF não escreve
`candidaturas`, e o conserto só faz a linha declarar o que já era verdade.

## Issues Encountered

- **`tsc` em 89 contra teto 90 (D-53): margem de UM.** Nenhum erro acrescentado (os 2
  arquivos são Deno/EF, fora do `include` do `tsconfig.json`) e o **conjunto de mensagens é
  idêntico** ao baseline — conferido por `diff` sobre as 89 linhas ordenadas, não só pela
  contagem, como o `<known_blocker>` pediu. O hook imprimiu `tsc errors: 89 (frozen
  baseline: 96)` nos quatro commits.
- **`resend-webhook.test.ts`** continua abortando ao resolver `npm:svix@1.99.1` —
  pré-existente, fora de escopo, já em WINDOWS. Excluído das rodadas de suíte; **não**
  «consertado».
- **`_shared/__tests__/strict-schema.test.ts:88` falha o type-check do Deno** (TS7053, um
  `expect(payload[forbiddenKey])` indexando um tipo que não tem a chave). Pré-existente,
  arquivo não tocado por mim, e é por isso que o baseline deste plano é **715/718** e não os
  **690** que o 49-24 reporta: os dois conjuntos de arquivos não são os mesmos. Excluído da
  rodada e **nomeado**, em vez de o número ser apresentado como comparável.
- **`deno test` não emite os contadores que `check tdd-red-evidence` lê.** O RED foi
  **medido** (`14 passed | 2 failed`, as duas falhas por **asserção**, com o diff
  `undefined`/`true` e `0`/`1` no log) e nenhuma linha de contador foi sintetizada — forjar o
  artefato que o checker existe para ler é pior que não tê-lo.
- **O defeito é LATENTE em PROD.** Zero bloqueios já registrados e 161× de folga no teto.
  Isso é bom e muda a leitura do conserto: é prevenção, e a primeira observação real depende
  de o teto ser baixado ou do volume subir duas ordens de grandeza.

## Next

- **49-16** (o selo, passo «cliente»): a linha agora **declara** `incompleto: true` +
  `cost_cap_exceeded`, e `normalizeGuia` já trata essa forma (`guia-normalize.test.ts:88`).
  Um `flags` vazio passou a ter **uma** causa (guia anterior à v20), não duas. ⚠ Leia
  **WINDOWS 64** antes: sem aquele conserto de uma linha, o selo **nunca** verá
  `weak_dim_uncovered`, por mais correto que o componente esteja.
- **49-18** (prova em PROD): tem agora um invariante forte para vigiar — nenhuma linha de
  `entrevista_guias` com a chave `recommendation` dentro de `guia`. Hoje são **0**, e é uma
  impressão digital da forma do defeito, não uma contagem que envelhece.
- **49-12** (retroativos): **nada a fazer** deste plano. A contagem medida é 0.
- **Quem tocar `avaliar-transcricao-entrevista`**: **WINDOWS 65** — mesma forma, mesmo
  conserto, e a EF também segue no contrato antigo do 49-02 (o deploy é de quem a toca,
  D-55 / Pitfall 8).

## Self-Check: PASSED

- `supabase/functions/gerar-guia-entrevista/index.ts` — FOUND
- `supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts` — FOUND
- commits `bb577600`, `d1df410e`, `debeec49`, `6d4eb35d` — os quatro FOUND em `git log --all`
  e os quatro já em `origin/main`
- `commits: 4` **MEDIDO** por `git rev-list --count a818ee78..HEAD`, não narrado;
  `plan_head_before` registrado; `tokens` = octetos de diff ÷ 4, com o erro de 4,0× escrito
  em vez de suavizado
- nenhuma deleção de arquivo no intervalo (`git diff --diff-filter=D` vazio); nenhum arquivo
  untracked; `git status --short` limpo
- `<precondition>` verificada **antes** de qualquer escrita: EF v18 ACTIVE relida da
  Management API e `AI_ERROR_CODE.cost_cap_exceeded` lido do disco
- os **quatro** itens do `<measure_first>` medidos e reportados, com **duas** correções ao
  plano e **um** sítio irmão achado — nenhum ajustado para caber
- `<acceptance_criteria>` re-executados: teto estourado ⇒ `incompleto: true` +
  `cost_cap_exceeded`; condição pelo provedor (grep confirma, e zero lista literal);
  `origem:'manual'` preservada por asserção; EF v20 com `verify_jwt=true` relido de PROD;
  `origin/main..HEAD` vazio
- **5 mutações** executadas com restauração verificada em cada, e uma checagem de que a
  mutação alterou o arquivo; a que não mordia foi **medida, nomeada e passou a morder** —
  nenhuma declarada aprovada
- varredura de FORMA nos smokes: **sem alvo** (0 arquivos `.sql` tocados), declarado em vez
  de omitido
- PATTERNS §J respeitado: `--dry-run` antes, fechamento conferido à mão contra a v18 (12 × 12,
  com a carona do `_shared` do 49-10 conferida e declarada inerte), versão/status/`verify_jwt`/
  `import_map` relidos, marcador conferido no **bundle vivo**, `npm run lint` ≤ 90, push feito
- PATTERNS §K: violado por mim na v19, **pego pelo bundle vivo**, consertado por descrição, e
  a correção deployada — registrado como Deviation 2 em vez de omitido
- 3 entradas novas no `WINDOWS.md` (64, 65, 66) e o **60 marcado `fixed`**

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*
