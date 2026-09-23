---
phase: 49-consertos-da-jornada-bloco-2
plan: 24
subsystem: edge-functions
tags: [proveniencia, jorn-28, d-28, entrevista-guias, deno, deploy, gerar-guia-entrevista, fallback-openai]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "`entrevista_guias.provedor_ia` (text, CHECK `IS NULL OR IN ('anthropic','openai')`) e `.modelo_ia` (text, NULL) — CONFERIDAS no catálogo de PROD antes do deploy (Pitfall 8), com os `COMMENT ON COLUMN` do D-28 no lugar"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`CallAiResult.model` (`response.model` — a versão DATADA que respondeu) e `.provider`. ⚠ Este deploy é o PRIMEIRO a levar o contrato `ai-client`/`audit-logger` do 49-02 a PROD para ESTA função — todos os marcadores mediam 0 na v17 (ver §«O que este deploy publicou»)"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "23"
    provides: "o MOLDE de vocabulário (`provider === 'none'` ⇒ NULL nos dois campos) e a lição «commitar antes de mutar» com `git diff --quiet` por mutação. Nenhum arquivo em comum"
provides:
  - "`entrevista_guias.provedor_ia` / `.modelo_ia` escritos com a proveniência REAL — o guia de entrevista passa a dizer qual modelo o escreveu"
  - "EF `gerar-guia-entrevista` version=18 em PROD, `verify_jwt=true` — e com ela o contrato `ai-client`/`audit-logger` do 49-02 no ar para esta função"
  - "cobertura de teste do FALLBACK OpenAI nesta EF (não existia nenhuma): Anthropic falha ⇒ OpenAI responde ⇒ o guia registra `openai` + a versão datada do `gpt-4o-mini`"
  - "o caminho `provider: 'none'` (teto de custo) passa a ser ALCANÇÁVEL por mock nesta EF — faltava `gte()` no builder mockado"
affects: [49-16, 49-18, 49-10, 49-11]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 4802
  tasks: 1
  commits: 2
  plan_head_before: 9ce4a448a6751a435f282df776178765d48dfbe4
  # `commits: 2` MEDIDO por `git rev-list --count 9ce4a448..HEAD` no instante da escrita
  # deste SUMMARY (92910402, f8abb13d) — os dois de PRODUÇÃO, nenhum de metadado.
  # Re-medir DEPOIS do commit de metadado deste plano dá 3, por construção.
  # `tokens: 4802` = 19 209 octetos de `git diff 9ce4a448..HEAD -- supabase` ÷ 4.
  estimate_tokens_do_plano: 25000
  # O plano estimou 25 000 e o realizado foi 4 802 — 5,2× ABAIXO, a MAIOR razão das seis
  # amostras da fase (01/02: 27k/120k · 08: 15k/90k · 09: 17,6k/60k · 23: 19,9k/50k ·
  # 24: 4,8k/25k). A causa é a mesma de sempre e aqui é extrema: o diff de produção são
  # DOIS campos num objeto; o peso esteve inteiro em LEITURA (a EF de 453 linhas, o
  # `ai-client` de 1152, o harness de mock de 274, o PATTERNS de 931) e em MEDIÇÃO em PROD
  # (as colunas, o CHECK, os 5 guias, os dois bundles, os contadores de marcador).
  # ⚠ O plano se declarou `confidence: low` e acertou a direção do risco pelo motivo
  # errado: o risco não era o tamanho do conserto, era descobrir que o caminho que o
  # requisito existe para cobrir não tinha teste nenhum.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "quando o CHECK da coluna e o vocabulário do produtor divergem (`none` não é provedor), a normalização mora no ESCRITOR e é nomeada — gravar o valor cru transformaria uma chamada barrada por gasto num 500 de persistência"
    - "`result` reatribuído por re-prompt: a proveniência tem de ser lida DEPOIS da última passada, senão atribui o artefato a um modelo que não o produziu"
    - "a mutação que não morde é o convite para perguntar o que ESTÁ alcançável e sem vigilância — aqui a resposta era o caminho que o requisito existe para cobrir"
    - "teste de proveniência que assere a DISTINÇÃO explícita contra o valor configurado, não só a igualdade contra o esperado: um dia em que alias e snapshot coincidam não pode fazer o teste passar por acaso"
    - "mock incompleto torna um caminho de produção indistinguível de inalcançável: faltava um `gte()` para o kill-switch de custo ser exercitável"

key-files:
  created: []
  modified:
    - supabase/functions/gerar-guia-entrevista/index.ts
    - supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts

key-decisions:
  - "`provider: 'none'` ⇒ NULL nos DOIS campos, e aqui há um motivo EXECUTÁVEL além do de vocabulário. O CHECK vivo é `provedor_ia IS NULL OR provedor_ia IN ('anthropic','openai')` (medido em PROD): gravar a string `none` crua devolveria 23514, e o handler tem erro de upsert CHECADO desde a WR-04 — ou seja, uma chamada barrada pelo teto de gasto viraria um 500 de persistência, convertendo um corte de custo bem-sucedido numa falha visível ao RH. O motivo de vocabulário do 49-23 continua valendo por cima disso: `none` não é nome de provedor para quem lê a coluna depois, e NULL é a verdade (ninguém respondeu)."
  - "A proveniência é lida DEPOIS do re-prompt de cobertura, não antes. O passo 7 da EF REATRIBUI `result` quando uma dimensão fraca ficou descoberta. Ler `result` antes gravaria o modelo da primeira passada num roteiro escrito pela segunda — uma atribuição errada com aparência de rigor, exatamente a família de defeito que o JORN-28 existe para fechar."
  - "O guia INCOMPLETO (parse falho, `guide == null`) TAMBÉM leva proveniência. Um modelo RESPONDEU — a resposta é que não era aproveitável —, e o conteúdo da linha (`{incompleto: true, flags, questions}`) veio dele. Deixar NULL faria a linha mentir por omissão e, pior, ficaria indistinguível dos 5 guias legados. Mesmo raciocínio do 49-23 para o caminho `ia_sem_resultado`."
  - "Mantive o cinto `modelo_ia = provedorIa === null ? null : result.model` mesmo depois de MEDIR que ele é inalcançável hoje (mutação M5, 0 reprovados). O par é lido JUNTO pelo selo do 49-16: um modelo sem provedor é um selo incoerente. Inalcançável por construção ≠ dispensável — é a diferença entre o defeito voltar inofensivo e voltar silencioso. Medido e NOMEADO no código, não escondido."
  - "NÃO gravei `ai_call_log_id`. A coluna do D-38 nasceu em `entrevista_analises`, não em `entrevista_guias` (conferido no catálogo). `result.log_id` existe no contrato do 49-02 e não tem onde morar aqui — inventar a coluna seria escopo de outro plano."
  - "`max_tokens` do `interview_guide` NÃO tocado (P1, §Deferred do portão). Segue em 8000. O risco de 98,4 s contra o teto de 110 s fica registrado em §Issues — e este plano não alonga o PEDIDO (nenhum bloco novo vai ao modelo), então não o agrava."
  - "Os 3+1 testes novos foram para `_local/merge-preserve.test.ts` em vez de um arquivo próprio. O ativo é o `makeMockSupabaseAdmin` que CAPTURA o objeto do upsert em `writes[]` — é exatamente sobre esse objeto que a proveniência fala. Duplicá-lo criaria uma segunda fonte de verdade para a superfície mockada do handler, e a próxima mudança de contrato consertaria uma cópia deixando a outra verde. Registrado no docblock do arquivo e num cabeçalho de seção."

patterns-established:
  - "Uma mutação que não morde não se resolve nem relaxando o portão nem removendo a redundância: resolve-se perguntando o que ESTÁ alcançável e não tem vigilância. Aqui a resposta foi o fallback OpenAI — o caminho que o requisito existe para cobrir, com 17 ocorrências medidas em PROD e ZERO testes nesta EF. Terceira vez na fase que a prova de mordida entrega mais valor pelo que NÃO morde do que pelo que morde (49-09 M8, 49-23 M3, 49-24 M5)."
  - "Um mock incompleto faz um caminho de produção parecer inalcançável. O kill-switch de custo de `callAi` encadeia `.select().eq().gte()`; o mock não tinha `gte()`, o encadeamento lançava, o helper caía no fail-open e o caminho `provider: 'none'` nunca era exercitado — indistinguível de «não acontece». Um método a mais no mock transformou uma hipótese em medição."
  - "Teste de proveniência assere a DISTINÇÃO, não só a igualdade. `assertEquals(modelo_ia, MODELO_REAL_DATADO)` passa mesmo se alguém gravar o configurado num dia em que os dois coincidam; `assert(modelo_ia !== PROMPT_ROW_FIXTURE.model_id)` é a asserção que nomeia o requisito. As duas juntas, com comentário dizendo que uma coincidência futura é problema da FIXTURE, não da asserção."

requirements-completed: [JORN-28]

# Coverage (#1602)
coverage:
  - deliverable: "D-28: o upsert de `entrevista_guias` grava `provedor_ia`/`modelo_ia` REAIS, não os configurados"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "merge-preserve.test.ts#49-24/D-28 — modelo gravado é a versão DATADA que respondeu, asserido como DISTINTO de `PROMPT_ROW_FIXTURE.model_id`; `prompt_version` segue gravado (proveniência ACRESCENTA, não substitui)"
        status: pass
      - kind: test
        ref: "merge-preserve.test.ts#49-24/D-28 — guia INCOMPLETO (parse falho) também leva proveniência, com `guia.incompleto === true` asserido para provar que a fixture exercita o caminho"
        status: pass
      - kind: other
        ref: "mutação M1 (proveniência removida do upsert) ⇒ 4 reprovados; M3 (grava o modelo CONFIGURADO) ⇒ 4; M4 (proveniência só no caminho completo) ⇒ 1"
        status: pass
      - kind: integration
        ref: "colunas lidas em PROD antes do deploy (Pitfall 8): `provedor_ia` text NULL com CHECK `IS NULL OR IN ('anthropic','openai')`, `modelo_ia` text NULL, os dois com `COMMENT` do D-28; 5 guias existentes, 0 com proveniência"
        status: pass
  - deliverable: "O FALLBACK OpenAI — o caso que o requisito existe para resolver — registra o `gpt-4o-mini`, não o Sonnet configurado"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "merge-preserve.test.ts#49-24/D-28 FALLBACK — Anthropic falha (1 tentativa, sem backoff: `timeoutMs` 110 s contra `AI_TOTAL_BUDGET_MS` 140 s ⇒ `effectiveMaxAttempts = 1`), OpenAI responde: `provedor_ia='openai'`, `modelo_ia='gpt-4o-mini-2024-07-18'`, com as DUAS negativas asseridas por nome e o roteiro do fallback de fato persistido"
        status: pass
      - kind: other
        ref: "é o teste que fez M1 e M3 subirem de 3 para 4 reprovados — a vigilância cresceu, medido"
        status: pass
  - deliverable: "`provider: 'none'` (nenhum provedor chamado) ⇒ os DOIS campos NULL, e a string crua NUNCA chega à coluna"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "merge-preserve.test.ts#49-24/D-28 — teto de custo diário (US$ 999 > 50) corta antes de qualquer provedor: `provedor_ia` e `modelo_ia` NULL, com `assert(provedor_ia !== 'none')` nomeando a forma que o CHECK recusaria"
        status: pass
      - kind: other
        ref: "mutação M2 (`provider` gravado cru) ⇒ 1 reprovado — o teste pega o 23514 aqui em vez de em PROD"
        status: pass
      - kind: integration
        ref: "o CHECK que justifica a normalização foi LIDO de PROD (`pg_get_constraintdef`), não presumido do plano"
        status: pass
  - deliverable: "A EF está VIVA em PROD com o conserto (não só no disco), e os dois canais (EF e git) estão em dia"
    human_judgment: false
    verification:
      - kind: command
        ref: "node efdeploy.cjs gerar-guia-entrevista → «OK · version=18 · status=ACTIVE · verify_jwt=true»; version/status/verify_jwt/import_map RELIDOS da Management API"
        status: pass
      - kind: command
        ref: "GET /functions/gerar-guia-entrevista/body → `modelo_ia` ×6, `provedor_ia` ×4, `provedorIa` ×4, `modeloIa` ×3 — todos 0 na v17"
        status: pass
      - kind: command
        ref: "git log --oneline origin/main..HEAD → vazio (push `9ce4a448..f8abb13d` executado)"
        status: pass
      - kind: command
        ref: "fechamento conferido À MÃO contra a v17 viva: 12 arquivos contra 11, exatamente `_shared/ai-error-codes.ts` a MAIS e nenhum a menos; `import_map: true` nas duas versões"
        status: pass
  - deliverable: "Nenhuma regressão além do pedido"
    human_judgment: false
    verification:
      - kind: test
        ref: "suíte Deno inteira das EFs: 690 passed, 0 failed (baseline 687 do 49-23; +3 — o 4º teste novo entrou depois da medição da suíte e a EF fechou em 14)"
        status: pass
      - kind: command
        ref: "npm run -s lint (tsc --noEmit) → 89 erros, teto D-53 = 90, e o CONJUNTO DE MENSAGENS é idêntico ao baseline (`diff` sobre as 89 linhas ordenadas)"
        status: pass
      - kind: test
        ref: "os 10 testes pré-existentes da EF seguem verdes SEM nenhuma asserção editada (o `model` novo no mock compartilhado é aditivo)"
        status: pass
  - deliverable: "O RH VÊ qual modelo escreveu o roteiro que ele vai usar na entrevista"
    requirement: JORN-28
    human_judgment: true
    rationale: "NÃO fechado por este plano, e é o passo «cliente» do par que o D-55 separa de propósito. A proveniência está gravada a partir da v18 e NENHUMA tela a lê — o selo é o 49-16. Registrado em WINDOWS 61 como irmão do WINDOWS 56 (o mesmo para a metadata do SJT). Melhor que não estar gravado, e ainda não é o conserto."
  - deliverable: "Um guia REAL gerado depois do deploy com proveniência preenchida"
    human_judgment: true
    rationale: "Os 5 guias em PROD são anteriores e ficam NULL (D-30, sem escrita retroativa). A primeira geração pós-v18 é a primeira observação real — e ela depende de um RH clicar. A prova em PROD é do 49-18 (`p28_resultados_com_modelo`); a asserção deste plano fica no handler, com mock, que é onde o objeto do upsert é observável sem esperar um usuário."

# Metrics
duration: ~40 min
completed: 2026-09-22
tasks: 1
files: 2
---

# Phase 49 Plano 24: O guia de entrevista passa a dizer qual modelo o escreveu Summary

**`entrevista_guias` guardava qual PROMPT gerou o roteiro e nunca QUEM o escreveu. Com o
fallback OpenAI em pé — 17 fallbacks medidos em PROD pelo 49-02 —, um roteiro produzido pelo
`gpt-4o-mini` era indistinguível de um produzido pelo Sonnet configurado, e o RH conduz a
entrevista por ele. Agora o upsert grava `provedor_ia` e `modelo_ia` REAIS, `none` vira NULL
por dois motivos independentes (um deles executável: o CHECK), e o fallback — o caminho que o
requisito existe para cobrir e que não tinha teste nenhum nesta EF — passou a ter. Version 18
viva em PROD.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-09-22 (22:35 BRT / 2026-09-23T01:35Z, último commit de produção)
- **Tasks:** 1 / 1 (`type="tracer"`)
- **Files:** 2 modificados, 0 criados
- **Testes:** 10 → **14** no arquivo da EF; suíte das EFs 687 → **690**, sempre 0 falhas

## O que estava errado — medido, não inferido

`entrevista_guias` tem `prompt_version` desde sempre: **qual prompt** gerou o roteiro. Não
tinha **quem o escreveu**. Isso só é um problema porque o fallback existe e dispara: o 49-02
mediu **17 fallbacks** em PROD, e a coluna de resultado registrava o Sonnet **configurado**.

O estado medido antes do conserto (só leitura, 2026-09-22):

| O que | Medido em PROD |
|---|---|
| `entrevista_guias.provedor_ia` | `text`, NULL, CHECK `IS NULL OR IN ('anthropic','openai')` |
| `entrevista_guias.modelo_ia` | `text`, NULL |
| `COMMENT` das duas | presentes, com o texto do D-28 (o de `provedor_ia` já registra que um dos guias foi gerado por fallback) |
| linhas na tabela | **5**, em 2 tipos, **0** com `provedor_ia`, **0** com `modelo_ia` |
| `ai_call_log_id` em `entrevista_guias` | **não existe** — a coluna do D-38 nasceu em `entrevista_analises` |
| EF viva | **version 17**, ACTIVE, `verify_jwt` true, 2026-09-06 |
| marcadores do 49-02 no bundle da v17 | **todos 0** (`fallback_cause`, `FALHA_PARSE`, `log_id`, `inputHashDe`, `emitAuditLossAlert`, `anthropic_max_tokens`, `ai-error-codes`) |

O CHECK é o achado que mudou o desenho: ele **exclui** `none`, e o handler tem erro de upsert
CHECADO desde a WR-04. Gravar `result.provider` cru faria uma chamada barrada pelo teto de
gasto devolver 23514 → 500 → «Falha ao persistir a guia» para o RH. O corte de custo
bem-sucedido apareceria como falha do sistema.

## Accomplishments

1. **A linha diz quem a escreveu.** `provedor_ia` e `modelo_ia` REAIS no upsert, do
   `CallAiResult` do 49-02. `modelo_ia` = `response.model`, a versão **datada** — que
   diverge do alias configurado em `prompt_versions.model_id`. É a divergência que faz o
   campo valer algo: gravar o configurado seria repetir a configuração e chamá-la de medição.

2. **A proveniência é da ÚLTIMA passada, não da primeira.** O passo 7 da EF (cobertura de
   dimensão fraca) **reatribui** `result` quando faz o re-prompt bounded. Ler `result` antes
   disso atribuiria o roteiro a um modelo que não o produziu — uma atribuição errada com
   aparência de rigor, que é a família de defeito que o JORN-28 fecha. Registrado no §8b do
   código, porque a variável ser reatribuída não é óbvio para quem lê só o upsert.

3. **`none` vira NULL por dois motivos independentes.** O de vocabulário é o do 49-09/49-23
   (`none` não é nome de provedor; NULL é a verdade). O **executável** é novo aqui: o CHECK
   vivo o recusa e o erro de upsert é checado, então o valor cru converteria um corte de gasto
   num 500. Há teste que nomeia a string proibida por asserção própria.

4. **O guia incompleto TAMBÉM leva proveniência.** `guide == null` persiste
   `{incompleto: true, flags, questions}` — conteúdo que **veio de um modelo que respondeu**.
   NULL aqui faria a linha mentir por omissão e ficaria indistinguível dos 5 guias legados.

5. **O fallback OpenAI ganhou o primeiro teste desta EF.** Não estava no plano; ver
   §«A mutação que não mordeu». Anthropic falha, OpenAI responde, e o guia registra `openai` +
   `gpt-4o-mini-2024-07-18`, com as duas negativas asseridas por nome.

6. **O caminho `provider: 'none'` deixou de ser inalcançável por acidente de mock.** Faltava
   `gte()` no builder mockado; sem ele `isDailyCostCapExceeded` lançava e caía no fail-open.
   Um método a mais transformou uma hipótese em medição — inclusive a de §Deferred abaixo.

## Passo 1 (D-50) — as varreduras C7 e C6 re-rodadas

### C7 — `vagaRubricBlock:` (6 sítios de chamada)

| # do kickoff | Onde está hoje | Delta |
|---|---|---|
| 1 | `avaliar-redacao-cultural/index.ts:299` — `vagaRubricBlock: rubricaBlock` | consertado pelo 49-09 |
| 2 | `avaliar-redacao/index.ts:372` — `montarBlocoRubricaSjt(rubricDimensoes)` | **consertado pelo 49-23**; a linha andou de `:256` para `:372` |
| 3 | `comparativo-candidatos/index.ts:409` — `Vaga: ${body.vaga_id}` | escopo deliberado, segue aberto |
| 4 | `gerar-devolutiva-bigfive/index.ts:791` | escopo deliberado (IA desligada) |
| 5 | `avaliar-transcricao-entrevista/index.ts:237` — `barsRubricBlock` | escopo deliberado (o precedente certo) |
| — | **`gerar-guia-entrevista/index.ts:271`** — `barsRubricBlock` | **SIM, eu o vi** (o `<scope_note>` pediu que eu dissesse). Andou de `:267` para `:271` porque acrescentei 4 linhas ao docblock. **NÃO consertado** — é do 49-10/49-11 |

⚠ Sobre o sítio 6, uma medição que refina o que os SUMMARYs anteriores dizem: `barsRubricBlock`
aqui **não é** o `Vaga: <uuid>` vazio de 42 octetos que o 49-23 encontrou no SJT. É um bloco
substantivo (`:249-254`) — título da vaga, formato, competências com pesos, perfil ideal,
dimensões fracas. O defeito é **outro** e mais sutil: o nome promete âncoras BARS e o bloco
**não tem nenhuma âncora**, só os nomes das dimensões fracas. Quem ler a tabela C7 e assumir
«mesmo defeito dos outros cinco» vai escrever o conserto errado. Registro aqui porque a
distinção não custa nada agora e custaria um plano depois.

### C6 #6 — escrita de EF sem erro destruturado: segue em **5**

```
supabase/functions/avaliar-transcricao-entrevista/index.ts:266,299,309
supabase/functions/analise-candidato-individual/index.ts:301,602
```

Sem delta contra o 49-23. `gerar-guia-entrevista` **não aparece** — e é por isso que o plano
diz «os dois já destruturam o erro»: a WR-04 fechou essa ponta nesta EF antes da fase 49.
Conferido, não presumido.

### Varredura de FORMA nos smokes (CLAUDE.md §«Portões»)

Este plano não toca nenhum arquivo `.sql` (`git diff --name-only 9ce4a448..HEAD` → 0 `.sql`) e
não acrescenta objeto SQL nem smoke — a varredura de forma **não tem alvo novo**. Os testes
Deno são o portão deste plano, e é por isso que as 5 mutações abaixo existem.

## A mutação que não mordeu — e o que ela encontrou

### Prova de mordida (D-56) — 5 mutações

| # | Mutação | Reprovados (antes do teste novo → depois) |
|---|---|---|
| M1 | proveniência REMOVIDA do objeto do upsert (o defeito original) | 3 → **4** |
| M2 | `provider` gravado CRU (o `none` que o CHECK recusa) | 1 → **1** |
| M3 | grava o modelo **CONFIGURADO** (`resolved.model_id`) em vez do que respondeu | 3 → **4** |
| M4 | proveniência só quando o guia veio completo (a linha incompleta volta a mentir) | 1 → **1** |
| M5 | o cinto do par removido (`modelo_ia = result.model` direto) | **0** — ver abaixo |

Restauração `git checkout --` **verificada em todas as 5**, com `git diff --quiet` por mutação
como guard (a lição do 49-23, que por sua vez veio do 49-09). O harness abortaria antes de
tocar o disco se a árvore estivesse suja; rodei-o duas vezes, sempre com a árvore commitada.

### M5 não mordeu — e o conserto foi dar vigilância ao que ESTAVA alcançável

Trocando `modelo_ia = provedorIa === null ? null : result.model` por `result.model` direto,
**nada reprova**. Medido, não inferido: os **dois** retornos `provider: "none"` do `ai-client`
(teto de custo `:722`, injeção `:769`) já devolvem `model: null`. O ramo é **inalcançável por
construção** — defesa em profundidade, redundante quanto ao veredito, como o M8 do 49-09 e o
M3 do 49-23.

Não removi a redundância (é ela que faz o retorno do defeito ser inofensivo em vez de
silencioso) e **não declarei o portão aprovado**. Perguntei o que ESTAVA alcançável e sem
vigilância — e a resposta era grande:

**O fallback OpenAI não tinha um único teste nesta EF.** O caminho que o JORN-28 existe para
cobrir. 17 ocorrências medidas em PROD. Nenhum teste da EF sequer fazia a OpenAI responder —
o `makeMockOpenAI` devolvia `{choices: [], usage: {}}`, um mock que existe só para não ser
`undefined`.

Isso virou o quarto teste (`f8abb13d`): Anthropic falha por timeout, `effectiveMaxAttempts = 1`
(a aritmética: `timeoutMs` 110 s da EF > 25 s ⇒ `floor(AI_TOTAL_BUDGET_MS 140 s / 110 s)` = 1,
logo **uma** tentativa e **nenhum** backoff — o teste roda em 863 µs, sem sleep), OpenAI
responde com `gpt-4o-mini-2024-07-18`, e o guia registra `openai` + esse modelo. As duas
negativas são asseridas **por nome**: nem o modelo nem o provedor configurados podem aparecer
num roteiro escrito pelo fallback.

E a vigilância **cresceu de forma medida**: M1 e M3 subiram de 3 para 4 reprovados.

## O que este deploy publicou — leia antes de concluir qualquer coisa sobre proveniência

A v17 (viva desde 2026-09-06) estava **inteiramente** no contrato antigo:

| Marcador | v17 (antes) | v18 (agora) |
|---|---|---|
| `modelo_ia` | **0** | 6 |
| `provedor_ia` | **0** | 4 |
| `provedorIa` / `modeloIa` | **0** / **0** | 4 / 3 |
| `ai-error-codes` (49-02) | **0** | 4 |
| `fallback_cause` (49-02) | **0** | 6 |
| `FALHA_PARSE` (49-02) | **0** | 7 |
| `emitAuditLossAlert` (49-02) | **0** | 8 |
| `inputHashDe` (49-02) | **0** | 5 |
| `anthropic_max_tokens` (49-02) | **0** | 4 |
| `log_id` (49-02 / D-38) | **0** | 8 |

**Sim: este deploy levou o contrato do 49-02 a PROD para esta função, pela primeira vez.** É a
**quarta** EF da fase a fazê-lo (comparativo v28, redação-cultural v15, `avaliar-redacao` v21).
Importa porque o sintoma de uma EF deixada no contrato velho — proveniência NULL na tabela de
resultado — é **indistinguível** de uma coluna que ninguém preencheu. A partir da v18, um
`provedor_ia` NULL em `entrevista_guias` significa uma de duas coisas honestas: o guia é
anterior à v18, ou nenhum provedor foi chamado.

**As outras consumidoras do 49-02 seguem no contrato antigo**
(`avaliar-transcricao-entrevista`, `analise-candidato-individual`, `consolidar-decisao-final`,
`gerar-devolutiva-bigfive`) — cada uma é deployada pelo plano que a toca (D-55 / Pitfall 8).
Não deployei nenhuma.

## Deploy (D-52) — o fechamento, conferido À MÃO contra a versão viva

O cabeçalho do `efdeploy.cjs` afirma que o script «RECUSA subir se o fechamento divergir da
lista esperada». **Essa checagem não existe no código** — mesmo achado dos planos 49-03, 49-08,
49-09 e 49-23 —, daí a conferência manual que o D-52 manda. A v17 referencia 11 arquivos; o
fechamento novo tem 12:

| Arquivo | v17 (viva) | v18 (nova) |
|---|---|---|
| `functions/_shared/ai-client.ts` | ✓ | 55 065 |
| `functions/_shared/ai-cost.ts` | ✓ | 2 059 |
| `functions/_shared/ai-error-codes.ts` | **—** | **6 867 (novo no bundle)** |
| `functions/_shared/audit-logger.ts` | ✓ | 18 412 |
| `functions/_shared/circuit-breaker.ts` | ✓ | 4 946 |
| `functions/_shared/entrevista-schemas.ts` | ✓ | 3 246 |
| `functions/_shared/injection-detector.ts` | ✓ | 2 060 |
| `functions/_shared/interview-output-schemas.ts` | ✓ | 8 777 |
| `functions/_shared/pii-masker.ts` | ✓ | 3 372 |
| `functions/_shared/prompt-loader.ts` | ✓ | 7 948 |
| `functions/gerar-guia-entrevista/_local/weak-dim-coverage.ts` | ✓ | 2 266 |
| `functions/gerar-guia-entrevista/index.ts` | ✓ | 24 761 |
| `functions/deno.json` (import map) | ✓ | ✓ |

**Exatamente UM arquivo mais, nenhum a menos.** ⚠ `deno.json` **não aparece na lista do
`--dry-run`** (o script o anexa depois, `efdeploy.cjs:136`), mas vai no payload e `import_map`
está `true` na v17 e na v18 — conferido nas duas, porque um import map faltando não falha no
deploy, falha na primeira invocação.

E a ordem do Pitfall 8 foi respeitada: as **duas colunas da onda 1 foram lidas no catálogo de
PROD antes** de qualquer deploy. Sem elas, o upsert da v18 falharia com PGRST204 em TODA
geração de guia — e o handler tem erro checado, então seria um 500 visível, não um silêncio.

## Verification results

| Verify | Resultado |
|---|---|
| `<verify>` #1 — `deno test` da EF + `grep modelo_ia` no fonte | **14 passed, 0 failed** · grep OK |
| `<verify>` #2 — `efdeploy --dry-run` \| `grep functions/_shared/ai-client.ts` | **presente** (12 arquivos + import map) |
| `<verify>` #2 — `node efdeploy.cjs gerar-guia-entrevista` | **OK · version=18 · status=ACTIVE · verify_jwt=true** |
| `<verify>` #2 — Management API **relida** | `version: 18`, `status: ACTIVE`, `verify_jwt: true`, `import_map: true` |
| `<verify>` #2 — `GET .../functions/.../body \| grep -ac modelo_ia` | **6** (era 0) |
| `<verify>` #2 — `git log --oneline origin/main..HEAD` | **vazio** (push `9ce4a448..f8abb13d`) |
| **Regressão além do pedido:** suíte Deno inteira das EFs | **690 passed, 0 failed** (baseline 687 do 49-23) |
| `npm run -s lint` (tsc --noEmit) | **89 erros** — teto D-53 é 90, e o **conjunto de MENSAGENS é idêntico** ao baseline (`diff` sobre as 89 linhas ordenadas) |

A regressão da suíte inteira importa porque o `ai-client` novo entrou no fechamento desta EF:
um efeito colateral não apareceria no subconjunto do plano.

## Medições vivas (D-49 / D-51) — o plano não foi ajustado para caber

| O que o plano assume | Medido em PROD / no disco (2026-09-22, só leitura) | Bate? |
|---|---|---|
| Precondição: `entrevista_guias.provedor_ia`/`.modelo_ia` existem | as duas, `text`, NULL, com `COMMENT` do D-28 | sim |
| Precondição: `CallAiResult.model` no disco (49-02) | `model: string \| null` em `ai-client.ts:315`, com o docblock do D-28 | sim |
| upsert em `:362-370` | `:362-373` antes da edição; `:394-410` depois | sim |
| «os dois já destruturam o erro» | `const { error: upsertErr }` presente desde a WR-04; ausente da varredura C6 #6 | sim |
| `VERIFY_JWT['gerar-guia-entrevista'] = true` | `efdeploy.cjs:54` | sim |
| `result.provider` pode valer `anthropic`/`openai`/`none` | os 3; e o CHECK vivo **exclui** `none` | sim, **com delta** |
| EF viva antes do plano | **version 17**, ACTIVE, `verify_jwt` true, todos os marcadores do 49-02 em **0** | sim |
| baseline de testes das EFs | 687 antes, **690** depois | sim |
| `tsc` em 89, teto D-53 = 90 | **89**, conjunto de mensagens idêntico | sim |
| «acrescentar um teste mínimo… ou registrar por que a asserção fica na prova de PROD» | havia harness (`writes[]` captura o upsert) — **4** testes, não a saída de registrar no SUMMARY | sim, melhor |

**Delta a registrar:** o plano diz «`result.provider` quando `anthropic`/`openai`, senão NULL»
e trata isso como escolha de vocabulário. A medição mostra que também é **obrigação de
esquema**: o CHECK `entrevista_guias_provedor_ia_check` recusa `none`, e o erro de upsert é
checado. O plano estava certo pelo motivo mais fraco dos dois — e quem reusasse o raciocínio
«é só vocabulário» numa tabela sem CHECK poderia concluir que o valor cru é aceitável.

## Deviations from Plan

### Registradas

**1. [Rule 2 - Funcionalidade crítica ausente] O fallback OpenAI não tinha teste nenhum nesta EF**

- **Found during:** prova de mordida, mutação M5 (0 reprovados)
- **Issue:** M5 não reprovou nada. O ramo mutado é inalcançável por construção (§M5). Mas ao
  perguntar o que ESTAVA alcançável e sem vigilância, apareceu que o **fallback OpenAI** — o
  caminho que motiva o requisito, com 17 ocorrências medidas em PROD — não tinha um único
  teste nesta EF. O `makeMockOpenAI` devolvia `{choices: [], usage: {}}`: um mock que existe
  só para não ser `undefined`. Uma mitigação declarada no `<threat_model>` sem teste no
  caminho que ela protege não está mitigada.
- **Fix:** não relaxei o portão nem removi a redundância (mantida e **nomeada** no código).
  Acrescentei o teste do fallback: Anthropic falha, OpenAI responde com a versão datada, e o
  guia registra `openai` + `gpt-4o-mini-2024-07-18`, com as duas negativas asseridas por nome.
- **Files modified:** `supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts`
- **Verification:** 14/0; M1 e M3 subiram de 3 → 4 reprovados (a vigilância cresceu, medido).
- **Commit:** `f8abb13d`

**2. [Rule 3 - Blocker instrumental] O caminho `provider: 'none'` era inalcançável por MOCK, não por construção**

- **Found during:** escrita do teste do teto de custo
- **Issue:** `isDailyCostCapExceeded` encadeia `.select("cost_usd").eq().gte()`. O mock não
  tinha `gte()` → o encadeamento lançava → o helper caía no **fail-open** → o caminho
  `provider: 'none'` nunca era exercitado, **indistinguível de «não acontece»**. Sem isso eu
  teria de registrar no SUMMARY que a asserção do `none` ficava para a prova de PROD.
- **Fix:** `gte()` no builder mockado + `custoDiarioUsd` como parâmetro do
  `makeMockSupabaseAdmin`, com o motivo escrito no comentário. O caminho passou a ser
  exercitado de verdade — e foi ele que revelou o achado do §Deferred abaixo.
- **Files modified:** o mesmo arquivo de teste
- **Verification:** o teste do teto reprova M2; o log da execução mostra `provider: "none"`.
- **Commit:** `92910402`

### Não-deviations que registro por honestidade

- **O `<verify>` #2 embute uma escrita e não é re-rodável.** Ele encadeia `node efdeploy.cjs`
  **sem** `--dry-run`: re-rodá-lo criaria uma version 19 idêntica à 18, poluindo o histórico
  de deploy para não provar nada novo. Re-verificado pelo **resultado** (version/status/
  verify_jwt/import_map relidos da Management API, marcadores do bundle vivo, `--dry-run`
  re-rodável, `origin/main..HEAD` vazio). **QUARTA ocorrência da fase** → **WINDOWS 59**.
- **`resend-webhook.test.ts`** continua abortando ao resolver `npm:svix@1.99.1` — pré-existente,
  fora de escopo (Scope Boundary), já em WINDOWS. Excluído das rodadas de suíte; **não**
  «consertado».
- **Padrão K do PATTERNS respeitado.** Não havia afirmação falsa a retirar neste plano (nenhum
  comentário mentiroso removido), então não houve risco de citar verbatim uma forma que um
  portão estático vigia. Li a entrada antes de escrever os comentários, e o `<verify>` deste
  plano procura `modelo_ia` — um token que eu QUERO no disco —, não uma proibição.

---

**Total deviations:** 2 (1 × Rule 2, 1 × Rule 3).
**Impact:** nenhum negativo. A **1** é de longe a mais valiosa e é a razão de a prova de
mordida existir: a mutação que não morde vale mais que as quatro que mordem, porque as quatro
confirmam o que eu já sabia e a quinta apontou um caminho de produção sem nenhuma vigilância.
A **2** converteu uma hipótese («o `none` é difícil de testar aqui») numa medição.

## Deferred (registrado, não consertado)

| Item | Por quê fica fora | Onde ficou registrado |
|---|---|---|
| **Teto de custo estourado persiste um guia que PARECE bem-sucedido.** `callAi` devolve `parsed = {recommendation:'hold'}` (não-null), então `guide != null`, `persistFlags` fica **vazio** e a EF grava um guia com 0 perguntas, sem flag, devolvendo `{ok:true}`. Medido pelo teste novo (`needs_human: false` no log). A proveniência NULL/NULL é honesta, mas conflate «barrado por gasto» com «guia legado» | é um defeito de **flag**, não de proveniência — fora do objetivo deste plano (Scope Boundary). O conserto é acrescentar `cost_cap_exceeded` ao `persistFlags`, e pertence a quem for dono do caminho de degradação da EF | **WINDOWS 60** |
| Nenhuma tela lê `provedor_ia`/`modelo_ia` do guia — o selo é o 49-16 | o front é de quem o toca (D-55); irmão do WINDOWS 56 | **WINDOWS 61** |
| O `<verify>` #2 embute escritas | quarta ocorrência da fase | **WINDOWS 59** |
| `max_tokens` do `interview_guide` (8000) e o risco de 98,4 s contra o teto de 110 s | P1, §Deferred do portão, explicitamente fora (`must_haves.truths`). E este plano **não agrava**: não acrescenta bloco novo ao pedido nem token de saída | §Issues abaixo |
| `gerar-guia-entrevista:271` — sexto sítio de `vagaRubricBlock` | é do 49-10/49-11; confirmado ainda aberto, **com uma distinção nova** (o bloco NÃO é o `Vaga: <uuid>` vazio) | §Passo 1 acima |
| `ai_call_log_id` (D-38) no guia | a coluna não existe em `entrevista_guias` (conferido); `result.log_id` não tem onde morar aqui | §key-decisions |
| Os 5 guias existentes ficam NULL | D-30, sem escrita retroativa: os modelos que os escreveram não são reconstruíveis a partir da tabela de resultado | §key-decisions |

## Known Stubs

**Nenhum.** Varridos os 2 arquivos tocados por
`TODO|FIXME|placeholder|coming soon|not available|não disponível|= \[\]|= \{\}`. Os 4 acertos
são falsos positivos:

1. `index.ts:147` («Método não suportado») e o comentário em `merge-preserve.test.ts:200`
   («este método…») casam **`todo` dentro de «mé-todo»** — a mesma família de falso positivo
   em português que o 49-23 registrou.
2. `writes: […] = []` (`:157`) e `persistFlags: string[] = []` (`:328`) são **acumuladores**
   que a execução preenche, os dois **pré-existentes** e não tocados por este plano.

Nenhum valor vazio codificado que chegue à tela, nenhum componente sem fonte de dados, nenhum
caminho não fiado.

⚠ **Uma coisa que NÃO é stub mas parece:** o cinto
`modelo_ia = provedorIa === null ? null : result.model`. Inalcançável por construção hoje (M5,
medido e nomeado no código e no §M5), mantido como segunda linha de defesa — não é um ramo
esquecido nem um TODO.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano: nenhum endpoint novo,
nenhum caminho de auth novo, nenhuma mudança de esquema (as colunas são do 49-01), nenhuma
tabela nova. As duas mitigações declaradas ficaram provadas:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-24-01 (guia sem registro do modelo, ou com o configurado) | mitigate | `modelo_ia = result.model` e `provedor_ia` do resultado, nos dois caminhos de persistência (completo e incompleto); 4 testes; mutações M1 (4), M3 (4), M4 (1); marcador `modelo_ia` ×6 lido do bundle vivo |
| T-49-24-SC (supply chain) | mitigate | **zero instalação de pacote**, nenhum import novo (o fechamento cresceu em 1 arquivo, e é `_shared/ai-error-codes.ts`, do 49-02, já no repositório) |

O `verify_jwt=true` foi **preservado** e relido de PROD: a EF continua exigindo JWT de RH. A
invariante RNF-07a segue intacta — a EF não escreve `candidaturas`, e a proveniência só
acrescenta duas colunas a um upsert que já existia.

## Issues Encountered

- **`tsc` em 89 contra teto 90 (D-53): margem de UM.** Este plano não acrescentou nenhum erro
  (os dois arquivos tocados são Deno/EF, fora do `include` do `tsconfig.json`) e o **conjunto
  de mensagens é idêntico** — conferido por `diff` sobre as linhas ordenadas, não só pela
  contagem, como o `<known_blocker>` pediu. O hook imprimiu `tsc errors: 89 (frozen baseline:
  96)` nos dois commits.
- **`max_tokens` do `interview_guide` = 8000 e o teto por chamada de 110 s.** Registrado como o
  plano mandou. O risco não é agravado por este plano: nenhum bloco novo vai ao modelo, nenhum
  token de saída a mais é pedido. A conta de 98,4 s contra 110 s continua sendo do P1.
- **A primeira geração de guia pós-v18 é a primeira observação real da proveniência.** Os 5
  guias em PROD são anteriores e ficam NULL. A asserção deste plano é no handler, com mock
  — que é onde o objeto do upsert é observável sem esperar um RH clicar. A prova em PROD é do
  49-18 (`p28_resultados_com_modelo`).
- **`gsd-tools check tdd-red-evidence` não se aplica:** Task 1 é `type="tracer"`, que por
  definição não tem fase RED própria; e o checker lê contadores do `node:test`, não a saída do
  `deno test`. As 5 mutações são a prova de mordida equivalente, e nenhum artefato foi
  sintetizado para agradar um checker.

## Next

Plano 49-24 era o menor da fase e fecha o par «EF» do D-28 para o guia. O que deixa pronto:

- **49-16** (o passo «cliente», D-55): `entrevista_guias.provedor_ia`/`.modelo_ia` estão
  gravados desde a v18 e **nenhuma tela os lê** (WINDOWS 61). O selo precisa tratar NULL como
  «modelo não registrado» (D-30) — e vai encontrar NULL nos 5 guias legados **e** num guia
  barrado por teto de custo, que é o WINDOWS 60.
- **49-18** (prova em PROD): tem `entrevista_guias.provedor_ia`/`.modelo_ia` para vigiar em
  `p28_resultados_com_modelo`. ⚠ Um NULL ali tem hoje **duas** leituras honestas (linha
  anterior à v18, ou nenhum provedor chamado) e o smoke precisa distingui-las por data, não
  por ausência — «inferir da ausência» é a família de erro que o MEMORY registra.
- **49-10 / 49-11**: o sítio 6 de `vagaRubricBlock` (`gerar-guia-entrevista:271`) segue aberto,
  e **não é o mesmo defeito** dos outros cinco — ver §Passo 1. O bloco existe e é substantivo;
  o que falta são as âncoras que o nome da variável promete.
- **Quem tocar `avaliar-transcricao-entrevista`, `analise-candidato-individual`,
  `consolidar-decisao-final` ou `gerar-devolutiva-bigfive`**: elas seguem no contrato antigo do
  49-02. O deploy é de quem a toca (D-55 / Pitfall 8), e o contrato está no ar em quatro EFs
  (comparativo v28, redação-cultural v15, `avaliar-redacao` v21, `gerar-guia-entrevista` v18).

## Self-Check: PASSED

- `supabase/functions/gerar-guia-entrevista/index.ts` — FOUND
- `supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts` — FOUND
- commits `92910402`, `f8abb13d` — os dois FOUND em `git log --all`, e os dois já em
  `origin/main`
- `commits: 2` **MEDIDO** por `git rev-list --count 9ce4a448..HEAD`, não narrado;
  `plan_head_before` registrado; `tokens` = octetos de diff ÷ 4, sem arredondar para agradar a
  estimativa (o erro de 5,2× está escrito, não suavizado)
- nenhuma deleção de arquivo no intervalo (`git diff --diff-filter=D` vazio); nenhum arquivo
  untracked; `git status --short` limpo
- `<precondition>` verificada **antes** de qualquer escrita, por leitura de PROD: as duas
  colunas existem com o CHECK e os COMMENTs, e `CallAiResult.model` está no disco
- `<acceptance_criteria>` re-executados: verdes — o upsert grava `provedor_ia`/`modelo_ia`
  reais (4 testes, 5 mutações); EF deployada com `verify_jwt=true`; marcador `modelo_ia`=6 no
  bundle vivo; `origin/main..HEAD` vazio
- `<verification>` de plano re-executada: **14/0** no conjunto da EF, **690/0** na suíte inteira
  das EFs, `version=18 ACTIVE verify_jwt=true import_map=true` relidos de PROD, fechamento
  conferido arquivo a arquivo contra a v17 (12 contra 11, um a mais, nenhum a menos), push
  confirmado
- 5 mutações executadas com restauração **verificada** em cada uma; a única que não mordeu foi
  **medida e nomeada**, e virou um teste novo para o caminho que ESTAVA alcançável e sem
  vigilância — nenhuma declarada aprovada
- varreduras C7 e C6 re-rodadas: C7 com delta (o sítio 2 consertado pelo 49-23, o 6 andou de
  `:267` para `:271`) **e um refinamento novo** (o bloco do sítio 6 não é o `Vaga: <uuid>`
  vazio); C6 #6 sem delta, em 5, e `gerar-guia-entrevista` ausente dela — conferido
- varredura de FORMA nos smokes: **sem alvo** (0 arquivos `.sql` tocados), declarado em vez de
  omitido
- `<scope_note>` respeitado: **vi** o sítio `:271` e o digo; **não** o consertei; **não** toquei
  `{{BARS_RUBRIC_WITH_CRITERIA}}`; `max_tokens` intacto

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-22*
