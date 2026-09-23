---
phase: 49-consertos-da-jornada-bloco-2
plan: 26
subsystem: edge-functions
tags: [jorn-28, jorn-39, windows-64, windows-65, entrev-01, gerar-guia-entrevista, avaliar-transcricao-entrevista, shared, deno, tdd, deploy, teto-de-custo, ai-06]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`CallAiResult.provider` (`anthropic|openai|none`) e o vocabulário fechado de `error_code` em `_shared/ai-error-codes.ts` — CONFERIDO no disco antes de qualquer escrita"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "25"
    provides: "os DOIS defeitos deste plano, MEDIDOS e registrados como `WINDOWS` 64 e 65; a EF `gerar-guia-entrevista` viva em v20 com `guiaDeResultado()` exportada (o helper que aqui passa a se construir sobre o predicado compartilhado); e o harness `_local/merge-preserve.test.ts` que captura o objeto do upsert em `writes[]`"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "10"
    provides: "a EF `avaliar-transcricao-entrevista` v17, a RPC `registrar_analise_entrevista` e o ramo `falhou` que NÃO supera ninguém e NÃO é vigente — o destino correto do bloqueio por custo. Nenhuma asserção dos seus 27 testes foi reescrita"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "11"
    provides: "o idioma «na dúvida sobre quem respondeu, não afirme» (`provedorDeResultado` por EF) e o precedente medido de que um `[]` explícito sob `onConflict` apaga o valor da execução anterior"
provides:
  - "`_shared/resultado-de-provedor.ts` — `algumProvedorRespondeu()` + `PROVEDOR_NENHUM`, zero imports: a pergunta «algum modelo respondeu isto?» em UM lugar, consumida pelas duas EFs"
  - "`entrevista_guias.guia.flags` passa a ser gravado TAMBÉM no caminho de sucesso: um roteiro que ainda deixa dimensão fraca descoberta sai com `weak_dim_uncovered`, e a chave fica AUSENTE (nunca `[]`) quando não há nada a sinalizar"
  - "`avaliar-transcricao-entrevista` deixa de tratar bloqueio pré-provedor como sucesso: o teto de custo cai no ramo `falhou`, sem competências fabricadas e sem superar a análise boa anterior"
  - "EF `gerar-guia-entrevista` version=21 e `avaliar-transcricao-entrevista` version=18 em PROD, `verify_jwt=true` nas duas"
  - "para o 49-16: o selo passa a ter um estado REAL para mostrar — sem este plano `weak_dim_uncovered` era impossível de ocorrer"
  - "o SEXTO sítio da mesma família, achado e registrado (`comparativo-candidatos:434`, WINDOWS 68) — com prova de que ele chega à TELA, não só à auditoria"
affects: [49-16, 49-18, 49-12, 49-22]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 8384
  tasks: 2
  commits: 4
  plan_head_before: 199d840b19bb3d08a1e021fa0174038f709bd8a6
  # `commits: 4` MEDIDO por `git rev-list --count 199d840b..HEAD` no instante da escrita deste
  # SUMMARY (fcafccfb, c53da826, c8b2a1de, 42f5b27f) — os quatro de PRODUÇÃO, nenhum de
  # metadado. Re-medir DEPOIS do commit de metadado deste plano dá 5, e isso não é divergência:
  # o `plan_head_before` é anterior a ele por construção.
  # `tokens: 8384` = 33 538 octetos de `git diff 199d840b..HEAD -- supabase` ÷ 4.
  estimate_tokens_do_plano: 22000
  # O plano estimou 22 000 e o realizado foi 8 384 — 2,6× ABAIXO. Mesma direção de todas as
  # amostras anteriores da fase (49-24 5,2×, 49-25 4,0×, 49-10 3,6×), e é a MENOR razão de
  # erro das quatro: um plano que cria arquivo novo tem mais artefato por unidade de leitura.
  # A causa segue a mesma e vale nomear porque agora são oito amostras na MESMA direção: o
  # orçamento é dimensionado pelo TRABALHO (ler duas EFs de ~500 linhas, o `ai-client` de
  # 1152, VARRER as sete consumidoras de `callAi`, medir PROD, oito mutações, dois deploys) e
  # o `actuals` mede o ARTEFATO. Não são a mesma grandeza.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "quando o MESMO defeito é medido em dois arquivos, o conserto não é consertar os dois: é extrair a pergunta para um lugar e fazer os dois a consumirem. Duas cópias divergem em silêncio, e foi por isso que o 49-25 encontrou o defeito duas vezes em vez de uma"
    - "um predicado compartilhado que responde «tem provedor?» NÃO é o mesmo que um normalizador que responde «qual provedor, dentro da allowlist do CHECK?» — o primeiro é deliberadamente sem allowlist (um provedor novo não pode nascer classificado como «ninguém respondeu»), e fundi-los seria trocar um acerto por uma conveniência"
    - "distinguir AUSÊNCIA de chave de chave com valor vazio quando a escrita é um upsert: sob `onConflict`, um `[]` explícito não é «nada a dizer», é uma instrução de APAGAR o que a execução anterior disse"
    - "acrescentar arquivo NOVO a um diretório compartilhado NÃO entra no bundle de quem não o importa (o fechamento é recalculado a partir do entrypoint) — ao contrário de MODIFICAR um arquivo compartilhado existente, que sobe por carona. As duas coisas parecem a mesma e são opostas; verificado por `--dry-run` nas cinco EFs não deployadas"
    - "uma mutação que reintroduz LITERALMENTE a forma proibida é a prova mais forte que um portão pode dar: ela separa «o portão detecta a ausência do conserto» de «o portão detecta o padrão errado»"

key-files:
  created:
    - supabase/functions/_shared/resultado-de-provedor.ts
    - supabase/functions/_shared/__tests__/resultado-de-provedor.test.ts
  modified:
    - supabase/functions/gerar-guia-entrevista/index.ts
    - supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts
    - supabase/functions/avaliar-transcricao-entrevista/index.ts
    - supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts

key-decisions:
  - "O predicado exportado é UM e POSITIVO (`algumProvedorRespondeu`), não um par positivo/negativo. Os dois chamadores negam explicitamente com `!`, o que é honesto e fica coberto por teste; exportar também a negação seria duas portas para a mesma pergunta, e a próxima edição consertaria uma."
  - "O predicado é deliberadamente SEM allowlist: ele pergunta «tem provedor?», não «é um dos que eu conheço». O enum `llm_provider` de PROD já tem `google` sem chamador, e um provedor novo não pode nascer classificado como «ninguém respondeu» — é a diferença entre um cinto e uma armadilha. Asserido por linha própria no teste."
  - "NÃO fundi o normalizador `provedorDeResultado` (seis cópias, medidas) com o predicado novo, apesar de o nome do arquivo convidar. Eles respondem perguntas diferentes: o normalizador é gatilhado pela allowlist de um CHECK de banco (`anthropic|openai|NULL`), o predicado é estrutural. Fundi-los faria o predicado herdar uma allowlist que ele existe para não ter. As seis cópias entre si SÃO duplicação e ficaram registradas (WINDOWS 70)."
  - "`flags` chega ao ramo do roteiro por spread condicional (`...flagsDoRoteiro`), não por `flags: persistFlags`. A diferença é a chave AUSENTE contra `[]`, e ela é substantiva, não estética: `onConflict: 'candidatura_id,tipo'` faz do upsert um sobrescritor, então um `[]` explícito apagaria a flag da execução anterior no instante do reprocessamento. Provado pela mutação M2, que grava `[]` sempre e reprova."
  - "O spread vai DEPOIS de `questions` no literal, então a nossa flag vence se um dia o schema do modelo ganhar uma chave homônima. Conferido que hoje não ganha: `InterviewGuideSchema` tem sete campos e nenhum é `flags`, e o output passa pelo parse do schema — o modelo não tem como injetar a chave. Registrado em vez de assumido."
  - "Na EF da transcrição a guarda ficou com as DUAS perguntas (`!algumProvedorRespondeu(result) || parsed == null`), e não com o predicado sozinho. «Ninguém respondeu» e «o que veio não serve» são causas independentes com diagnósticos diferentes em `error_code`; colapsá-las numa só faria a EF perder a capacidade de dizer POR QUE não há análise. O teste de unidade do predicado assere explicitamente que ele NÃO opina sobre conteúdo."
  - "O destino do bloqueio é o ramo `falhou` que o 49-10 já tinha desenhado — nenhuma RPC, nenhum predicado SQL, nenhuma coluna tocada. Foi o 49-10 que fez esse ramo não superar ninguém e não ser vigente; o conserto daqui é só fazer o bloqueio CHEGAR nele."
  - "A resposta HTTP continua 200, com `falhou: true` e `vigente: false` no payload. Mesma razão que o 49-25 registrou: dar 500 a um corte de gasto BEM-SUCEDIDO transformaria um controle funcionando em falha visível do sistema. A honestidade mora na linha e no payload, não no código de status."
  - "`main` mantida como branch de trabalho (autorização explícita do orquestrador: `git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Não registrado como desvio."

patterns-established:
  - "A quinta prova de mordida da fase, e a primeira em que TODAS as oito mutações morderam de primeira — sem nenhuma `0 → 1`. A diferença medida contra 49-09/49-23/49-24/49-25: o cinto inalcançável nasceu com teste de unidade próprio no MESMO commit, em vez de ganhá-lo depois. A lição do 49-25 («dar vigilância ao cinto») foi aplicada na ORIGEM e o custo foi zero."
  - "Re-varrer as SETE consumidoras quando o plano irmão varreu cinco achou um sítio novo que chega à TELA (o 49-25 só tinha achado sítios que chegavam ao banco). Um `<measure_first>` que manda «re-medir e dar a lista completa» vale mais que um que manda «confirmar»."
  - "A medição do RED pode corrigir o registro do defeito, não só o plano: o rastro de runtime mostrou `superadas: 1`, ou seja o WINDOWS 65 descrevia o defeito como «indistinguível de uma análise real» quando ele era pior — a linha vazia SUBSTITUÍA a boa. Ler o log do RED em vez de só a asserção que falhou."

requirements-completed: [JORN-28, JORN-39]

# Coverage (#1602)
coverage:
  - deliverable: "A flag de revisão humana que o código computa chega ao banco (WINDOWS 64 / ENTREV-01)"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "merge-preserve.test.ts#«49-26 / WINDOWS 64 — roteiro com dimensão fraca DESCOBERTA é gravado COM a flag»: `weak_dim_uncovered` em `flags`, `incompleto` ausente (é o caminho de SUCESSO), `flags.length === 1`, e as perguntas `ia` + `manual` na linha"
        status: pass
      - kind: other
        ref: "mutação M1 (o spread removido — o defeito original) ⇒ 1 reprovado, com o diagnóstico exato («a flag computada pelo passo 7 tem de chegar ao banco; veio undefined»)"
        status: pass
      - kind: other
        ref: "RED medido ANTES do conserto: 18 passed | 1 failed, por ASSERÇÃO, com o rastro de runtime dizendo `weak_dims_count: 1` e `needs_human: true` — vermelho pelo motivo certo, não por carregamento de módulo (#3770)"
        status: pass
      - kind: command
        ref: "marcadores no bundle VIVO da v21: `flagsDoRoteiro` ×4, `weak_dim_uncovered` ×6, `algumProvedorRespondeu` ×8"
        status: pass
  - deliverable: "«Não havia flag» e «havia uma lista vazia» permanecem distinguíveis (T-49-26-03)"
    human_judgment: false
    verification:
      - kind: test
        ref: "merge-preserve.test.ts#«49-26 / T-49-26-03 — sem nada a sinalizar, a chave `flags` fica AUSENTE (não `[]`)»"
        status: pass
      - kind: other
        ref: "mutação M2 (`{ flags: persistFlags }` sempre, `[]` quando vazio) ⇒ 1 reprovado («veio []»). O portão morde a forma errada, não só a ausência do conserto"
        status: pass
  - deliverable: "Bloqueio anterior ao provedor não entra como análise aguardando revisão (WINDOWS 65)"
    requirement: JORN-39
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#«49-26 / WINDOWS 65 — teto de custo estourado grava 'falhou', nunca análise aguardando revisão»: `p_status_analise='falhou'`, ZERO chamadas ao provedor, competências/citações/bias/metadata todos NULL, `p_bloqueio_avanco=false`, proveniência NULL/NULL, `vigente:false`/`falhou:true` no payload, e `escritasDiretas` vazio (D-39)"
        status: pass
      - kind: other
        ref: "mutação M6 (a guarda volta a perguntar só pelo conteúdo — o defeito original) ⇒ 1 reprovado"
        status: pass
      - kind: other
        ref: "mutação M7 (a forma PROIBIDA reintroduzida LITERALMENTE: lista de um item, só a injeção) ⇒ 1 reprovado. É a prova de que o portão morde o padrão errado"
        status: pass
      - kind: other
        ref: "RED medido: 27 passed | 1 failed, por ASSERÇÃO (`-pendente_humano` / `+falhou`), com o rastro dizendo `provider: \"none\"`, `competencias_count: 0` e `superadas: 1`"
        status: pass
  - deliverable: "A análise boa anterior continua sendo a vigente (o desenho do 49-10, preservado)"
    requirement: JORN-12
    human_judgment: false
    verification:
      - kind: test
        ref: "o mesmo teste do teto assere `json.vigente === false` — a linha de bloqueio não supera ninguém. Medido que ANTES do conserto ela superava (`superadas: 1`)"
        status: pass
      - kind: other
        ref: "mutação M8 (`pendente_humano` no ramo de falha) ⇒ 2 reprovados — a asserção de vigência e a de status, separadas"
        status: pass
      - kind: test
        ref: "os 27 testes pré-existentes do 49-10 seguem verdes, NENHUMA asserção reescrita; a RPC e o predicado SQL não foram tocados"
        status: pass
  - deliverable: "A pergunta vive em UM lugar, consumida pelas duas pontas (D-21)"
    human_judgment: false
    verification:
      - kind: unit
        ref: "`_shared/__tests__/resultado-de-provedor.test.ts` — 4 testes: provedor real (incluindo um que o predicado não conhece, para provar que NÃO é allowlist), o sentinela, o cinto (vazio/nulo/ausente/undefined) e a independência do conteúdo nos dois sentidos"
        status: pass
      - kind: command
        ref: "`grep -c 'import.*resultado-de-provedor'` ≥ 1 nas duas EFs (o `<verify>` de cada task, re-executado)"
        status: pass
      - kind: other
        ref: "mutação M4 (o predicado deixa de excluir o sentinela) ⇒ **5** reprovados, atravessando os dois arquivos de teste; M5 (o cinto removido) ⇒ 2"
        status: pass
      - kind: command
        ref: "o MESMO arquivo, byte a byte (5744), no fechamento das duas EFs deployadas — conferido nos dois `--dry-run`"
        status: pass
  - deliverable: "As duas EFs estão VIVAS em PROD e os dois canais (EF e git) em dia"
    human_judgment: false
    verification:
      - kind: command
        ref: "Management API RELIDA: `gerar-guia-entrevista` version=21 ACTIVE verify_jwt=true import_map=true · `avaliar-transcricao-entrevista` version=18 ACTIVE verify_jwt=true import_map=true"
        status: pass
      - kind: command
        ref: "fechamento conferido À MÃO: gerar-guia 12→13 e transcrição 13→14, o ÚNICO arquivo novo em cada é `resultado-de-provedor.ts`, e os demais byte-idênticos às baselines capturadas ANTES de o arquivo existir. Zero carona (`git log <v17>..HEAD` sobre os 13 arquivos do fechamento: só o meu `index.ts`)"
        status: pass
      - kind: command
        ref: "`git log --oneline origin/main..HEAD` → vazio (push depois de cada deploy, não só no fim)"
        status: pass
  - deliverable: "Nenhuma regressão além do pedido"
    human_judgment: false
    verification:
      - kind: test
        ref: "suíte Deno das EFs (45 arquivos, excluídos `strict-schema` e `resend-webhook`): **725 passed, 0 failed** — baseline 718 do 49-25 + os 7 testes novos, com o MESMO conjunto de arquivos"
        status: pass
      - kind: command
        ref: "`npm run -s lint` → **89** erros, teto D-53 = 90, e o CONJUNTO DE MENSAGENS é idêntico ao baseline (`diff` sobre as 89 linhas ordenadas, medido duas vezes — depois de cada task)"
        status: pass
      - kind: command
        ref: "as cinco EFs NÃO deployadas seguem com o fechamento inalterado e ZERO ocorrências do arquivo novo (`--dry-run` em cada: 11/13/11/12/9 arquivos)"
        status: pass
  - deliverable: "O RH VÊ que o roteiro precisa ser completado à mão, ou que a análise foi barrada"
    requirement: JORN-39
    human_judgment: true
    rationale: "NÃO fechado por este plano — é o passo «cliente» que o D-55 separa. As linhas agora DECLARAM (`guia.flags` com `weak_dim_uncovered`; `status_analise='falhou'`). Quem TRADUZ isso para o RH é o selo do 49-16, e este plano é o pré-requisito honesto dele: sem o conserto do 64, `weak_dim_uncovered` era um estado que o código tornava impossível, e o selo entregaria interface para nada."
  - deliverable: "Um bloqueio REAL em PROD exercitando os dois caminhos"
    human_judgment: true
    rationale: "MEDIDO em PROD (2026-09-23, só `SELECT`): **zero** linhas com `provider='none'` em `ai_call_logs` desde sempre; `entrevista_guias` 5 linhas, **0** com a chave `flags`, **0** incompletas; `entrevista_analises` 6 linhas, **0** `falhou`, **0** `pendente_humano` com competências vazias, **0** superadas. Os dois defeitos são LATENTES — nunca manifestaram. A observação real depende de o teto de custo ser baixado ou de o volume subir duas ordens de grandeza (a folga medida pelo 49-25 é de 161×); a asserção fica no handler, com mock, que é onde o objeto gravado é observável."

# Metrics
duration: ~50 min
completed: 2026-09-23
tasks: 2
files: 6
---

# Phase 49 Plano 49-26: O predicado de provedor em `_shared` e a flag que para de ser descartada Summary

**Duas EFs confundiam «nenhum modelo respondeu» com «o modelo respondeu isto», e uma flag de
revisão humana era computada e jogada fora. O conserto não foi consertar os dois lugares: foi
extrair a pergunta para `_shared/resultado-de-provedor.ts` e fazer os dois a consumirem — porque
a razão pela qual o 49-25 encontrou o MESMO defeito duas vezes é que a pergunta estava escrita
duas vezes. `gerar-guia-entrevista` v21 grava `weak_dim_uncovered` no caminho de sucesso (chave
AUSENTE, nunca `[]`); `avaliar-transcricao-entrevista` v18 manda o teto de custo para o ramo
`falhou`, que não supera a análise boa anterior. Oito mutações, todas mordem de primeira. Os
dois defeitos são LATENTES em PROD — zero linhas em qualquer dos dois estados — então isto é
prevenção e registro, não remediação. E a re-varredura das SETE consumidoras de `callAi` achou
um SEXTO sítio que o plano irmão não alcançou, pior que os outros porque chega à tela.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-09-23
- **Tasks:** 2 / 2 (ambas `type="tdd"`)
- **Files:** 2 criados, 4 modificados
- **Testes:** gerar-guia 17 → **19**; transcrição 27 → **28**; `_shared` **+4** (arquivo novo).
  Suíte das EFs 718 → **725**, sempre 0 falhas

## As quatro medições que o `<measure_first>` pediu

### 1. `flags` realmente nunca chega ao upsert de sucesso? **Sim** — lido, não inferido

Lido em `gerar-guia-entrevista/index.ts:457-471` (a construção do objeto do upsert), não deduzido
da afirmação do plano:

```
guia: guide ? { ...guide, questions: mergedQuestions }
            : { incompleto: true, flags: persistFlags, questions: manualQs },
```

`flags` aparece **uma única vez**, no ramo em que NÃO há roteiro. E `weak_dim_uncovered` só pode
existir quando HÁ roteiro — o passo 7 nem roda sem ele. Ou seja: no único caminho capaz de
produzir a flag, ela era computada (`:389`) e descartada. O plano estava certo.

**O RED confirmou por execução, não por leitura:** `weak_dims_count: 1`, `needs_human: true` no
rastro de runtime, e `flags` **`undefined`** na linha gravada. A distinção importa — um teste que
ficasse vermelho porque «não havia flag a gravar» estaria medindo o outro caso.

### 2. O que a EF da transcrição faz hoje no teto de custo — confirmado, **e pior**

O plano diz `pendente_humano` com competências vazias. **Confirmado**, e a medição do RED
acrescentou um fato que nem o plano nem o `WINDOWS 65` registravam:

| Medido no rastro de runtime do RED | Valor |
|---|---|
| `provider` | `"none"` |
| chamadas ao provedor | **0** (o corte é anterior) |
| `p_status_analise` gravado | **`pendente_humano`** |
| `competencias_count` | **0** |
| **`superadas`** | **1** |

`superadas: 1` é o agravante. A linha vazia não era apenas *indistinguível* de uma análise real
esperando revisão — ela marcava a análise boa anterior como **SUPERADA**, então a tela, a revisão
e o portão de avanço passavam a ler a vazia. O `WINDOWS 65` foi **atualizado** com essa correção.

Causa mecânica: `parsed` não nulo ⇒ a guarda de `:377` dá falso ⇒ cai no sucesso ⇒
`extractCompetencias(parsed)` sobre o stub devolve `[]` (o stub não tem
`competency_evaluations`) ⇒ a RPC grava `pendente_humano` e supera a vigente.

### 3. Outras EFs com a mesma forma — as SETE varridas, e **um sítio novo**

O 49-25 varreu **cinco** («as que persistem resultado») e achou 2 afetadas / 3 cobertas. Re-varri
as **sete** consumidoras de `callAi`:

| EF | Guarda | Teto de custo cai onde? |
|---|---|---|
| `analise-candidato-individual:540,552` | `parsed == null` + `flagged_for_human_review === true` | `falhou`. **Coberta** |
| `avaliar-redacao:403,418` | idem | `pendente_humano` com `error_code`. **Coberta** |
| `avaliar-redacao-cultural:386` | idem | `pendente_humano`. **Coberta** |
| `gerar-devolutiva-bigfive:390` | `res?.parsed?.texto_interpretativo ?? ""` depois `texto.length > 0` | **coberta POR CONSTRUÇÃO** — a guarda é pelo CONTEÚDO que ela precisa, não por «não nulo». O stub não tem a chave ⇒ `texto` vazio ⇒ degrada ao template oficial |
| `gerar-guia-entrevista` | `guiaDeResultado` (pelo provedor) | **consertada pelo 49-25** (v20), e aqui reconstruída sobre o predicado compartilhado |
| `avaliar-transcricao-entrevista:377` | lista literal de um código | **o defeito da Task 2** |
| **`comparativo-candidatos:434`** | **NENHUMA** | **SÍTIO NOVO — e o pior dos seis** |

**O sexto sítio, medido e NÃO consertado** (Scope Boundary — o `<measure_first>` foi explícito:
reportar, não consertar). `const ranking = result.parsed ?? null;` e **zero** guardas de bloqueio
na EF inteira: nenhuma ocorrência de `flagged_for_human_review`, nenhuma leitura de `error_code`.
Com o teto estourado o stub fica não nulo e é:

1. **inserido** em `comparativo_solicitado.ranking` (`jsonb NOT NULL`) como ranking auditado, e
2. **devolvido ao RH** no payload (`return jsonResponse({ ok: true, ranking, ... })`).

Os outros cinco sítios erravam **no banco**; este chega à **TELA**. E a linha de auditoria fica
auto-contraditória, porque `provedor_ia`/`modelo_ia` já saem NULL corretamente: ranking presente,
autor ausente. Registrado em **WINDOWS 68** com o conserto escrito (o predicado deste plano, que
a EF ainda não importa).

### 4. O arquivo novo em `_shared` desincroniza as outras cinco EFs? **Não** — verificado, não assumido

O `closure()` do `efdeploy.cjs:89` recalcula o fechamento a partir do **entrypoint**, seguindo
imports relativos. Um arquivo que ninguém importa não está em fechamento nenhum. Verificado por
`--dry-run` nas cinco, contra as baselines capturadas **antes** de o arquivo existir:

| EF não deployada | arquivos antes → depois | `resultado-de-provedor` no fechamento |
|---|---|---|
| `avaliar-redacao` | 11 → **11** | 0 |
| `avaliar-redacao-cultural` | — → 13 | 0 |
| `analise-candidato-individual` | — → 11 | 0 |
| `comparativo-candidatos` | — → 12 | 0 |
| `gerar-devolutiva-bigfive` | — → 9 | 0 |

⚠ **Isto é o oposto do caso que surpreendeu o 49-25**, e vale registrar porque as duas coisas
parecem a mesma: *acrescentar* arquivo novo a `_shared` é inerte para quem não o importa;
*modificar* um arquivo compartilhado existente sobe por carona no próximo deploy de qualquer EF
que o importe (foi assim que `entrevista-schemas.ts` do 49-10 entrou no bundle do 49-25). Conferi
o segundo caso também: nenhum arquivo do fechamento das duas EFs mudou desde o deploy anterior
além do meu `index.ts` — **zero carona** nos dois deploys.

## O conserto

### Task 1 — o predicado e a flag

`_shared/resultado-de-provedor.ts` (novo, **zero imports** por contrato — o molde de
`candidaturaEncerrada.ts` e `ai-error-codes.ts`) exporta `algumProvedorRespondeu(resultado)` e a
constante `PROVEDOR_NENHUM`. `guiaDeResultado` do 49-25 passou a se construir sobre ele:

```
if (!algumProvedorRespondeu(result)) return null;
```

E `flags` passou a alcançar o ramo do roteiro por **spread condicional**:

```
const flagsDoRoteiro = persistFlags.length > 0 ? { flags: persistFlags } : {};
…
guia: guide ? { ...guide, questions: mergedQuestions, ...flagsDoRoteiro } : { … }
```

A forma (spread, não `flags: persistFlags`) é a decisão substantiva: ela mantém a chave
**AUSENTE** quando não há nada a sinalizar. Sob `onConflict: 'candidatura_id,tipo'` o upsert é um
sobrescritor, e um `[]` explícito não diria «nada a relatar» — diria «apague o que a execução
anterior relatou». A mutação M2 prova que essa distinção é vigiada.

O docblock da EF foi corrigido: ele prometia desde a Phase 14 que a EF «persiste o roteiro com
flag para humano», e a promessa valia só no ramo sem roteiro. Agora descreve ONDE a flag vive, em
qual ramo, e a regra da ausência — **sem reproduzir a forma proibida** (§K), conferido no disco e
no bundle vivo.

### Task 2 — as duas perguntas

A guarda de never-absent da transcrição passou a fazer as duas, e a ordem é deliberada:

```
if (!algumProvedorRespondeu(result) || parsed == null) {
```

Colapsá-las numa só pareceria mais limpo e seria pior: «ninguém respondeu» e «o que veio não
serve» têm `error_code` diferentes, e é esse código que diz ao RH (e ao 49-15) **por que** não há
análise. O teste de unidade do predicado assere explicitamente, nos dois sentidos, que ele **não
opina sobre o conteúdo** — para que uma futura «simplificação» que o faça olhar `parsed` reprove.

Nenhuma RPC, nenhum predicado SQL, nenhuma coluna, nenhuma migration, nenhum `max_tokens`.

## A prova de mordida (D-56) — 8 mutações, **todas** morderam de primeira

| # | Mutação | Reprovados |
|---|---|---|
| M1 | o spread removido — `flags` não chega ao ramo do roteiro (o defeito original) | **1** |
| M2 | `flags` SEMPRE presente (`[]` quando vazio) | **1** |
| M3 | `guiaDeResultado` volta ao `parsed` cru, sem o predicado | **3** |
| M4 | o predicado deixa de excluir o sentinela de «nenhum provedor» | **5** |
| M5 | o CINTO removido (provedor vazio/ausente vira «respondeu») | **2** |
| M6 | a guarda da transcrição volta a perguntar só pelo conteúdo (o defeito original) | **1** |
| M7 | **a forma PROIBIDA reintroduzida literalmente** (lista de um código de erro) | **1** |
| M8 | o bloqueio entra como `pendente_humano` no ramo de falha | **2** |

Restauração `git checkout --` **verificada em todas as oito**, com `git diff --quiet` como guarda
de entrada e uma checagem de md5 de que a mutação **de fato alterou o arquivo** — uma mutação que
não muda nada e «reprova 0» é um resultado inválido disfarçado de medição.

### A primeira vez na fase em que nenhuma mutação sai `0`

49-09 (M8), 49-23 (M3), 49-24 (M5) e 49-25 (M5) tiveram cada um uma mutação que não mordia, sempre
o mesmo tipo de ramo: o cinto inalcançável. A diferença aqui é de sequência, não de sorte — o
cinto do predicado novo nasceu **com o seu teste de unidade no mesmo commit**, porque a lição do
49-25 foi aplicada na origem em vez de depois. M5 morde 2, e o custo de tê-lo desde o início foi
zero.

⚠ Um efeito colateral que vale nomear: **M4 reprova 5, atravessando os dois arquivos de teste**.
Isso é o predicado compartilhado se pagando — uma regressão nele não pode mais sair verde em
nenhuma das duas pontas, o que era exatamente impossível quando a pergunta estava escrita duas
vezes.

## §K — não violado desta vez, e conferido onde o 49-25 foi pego

O 49-25 reproduziu a forma proibida num comentário e foi pego pelo **bundle vivo**, não pelo
disco. Conferi nos dois lugares, nas duas EFs:

| Onde | Ocorrências da forma proibida |
|---|---|
| disco, `gerar-guia-entrevista/` (exceto testes) | **0** |
| disco, `avaliar-transcricao-entrevista/` (exceto testes) | **0** |
| **bundle VIVO** da v21 | **0** |
| **bundle VIVO** da v18 | **0** |

As duas descrições da condição retirada são em prosa. De passagem, o parágrafo do 49-25 que
**nomeava** os dois códigos de bloqueio saiu do docblock de `guiaDeResultado` — a explicação
mudou de lugar para o módulo de `_shared`, que é onde a razão pertence agora.

Os testes CITAM a forma (M7 a reintroduz de propósito, e isso é o valor dela). Os greps de
conferência excluem `__tests__`/`_local`, porque um portão que não distingue o arquivo que
testa a forma do arquivo que a contém não é um portão — é um falso positivo esperando acontecer.

## Deploy (D-52 / PATTERNS §J) — fechamento conferido À MÃO

O cabeçalho do `efdeploy.cjs` afirma recusar subir se o fechamento divergir da lista esperada;
**essa checagem não existe no código** — mesmo achado dos planos 49-03, 49-08, 49-09, 49-23,
49-24 e 49-25. Sétima confirmação; daí a conferência manual.

| EF | antes | depois | delta conferido arquivo a arquivo |
|---|---|---|---|
| `gerar-guia-entrevista` | 12 (v20) | **13** (v21) | `+_shared/resultado-de-provedor.ts` (5744) · `index.ts` 28 371 → 30 192 · os outros 11 byte-idênticos |
| `avaliar-transcricao-entrevista` | 13 (v17) | **14** (v18) | `+_shared/resultado-de-provedor.ts` (5744, **o mesmo arquivo, os mesmos bytes**) · `index.ts` 25 028 → 26 748 · os outros 12 byte-idênticos |

**Zero carona nos dois.** Conferido por `git log <último commit do 49-10>..HEAD` sobre os 13
arquivos do fechamento da transcrição: só o meu `index.ts` aparece.

`functions/deno.json` não aparece na lista do `--dry-run` (o script o anexa depois,
`efdeploy.cjs:136`) mas vai no payload: `import_map: true` conferido nas duas versões, porque um
import map faltando não falha no deploy — falha na primeira invocação.

**Push feito depois de CADA deploy**, não só no fim do plano. É o defeito que o CLAUDE.md
descreve (§«Esta via NÃO passa pelo git»): com a EF viva e o código parado no disco, o sintoma na
tela é idêntico ao de um conserto que não funciona.

## Verification results

| Verify | Resultado |
|---|---|
| Task 1 `<verify>` — `deno test` do `_shared` + da EF | **23 passed, 0 failed** |
| Task 1 `<verify>` — a EF consome o predicado compartilhado | `grep -c 'import.*resultado-de-provedor'` = 1 |
| Task 2 `<verify>` #1 — `deno test` da EF | **28 passed, 0 failed** |
| Task 2 `<verify>` #1 — a EF consome o predicado | `grep -c 'resultado-de-provedor'` ≥ 1 |
| Task 2 `<verify>` #2 — `tsc` ≤ 90 | **89** (`tsc 89 <= 90`), conjunto de MENSAGENS idêntico ao baseline |
| Task 2 `<verify>` #2 — `origin/main..HEAD` | **vazio** |
| Deploy — `--dry-run` das duas | 13 e 14 arquivos, conferidos um a um contra as baselines |
| Deploy — Management API **relida** | v21 e v18, ACTIVE, `verify_jwt=true`, `import_map=true` |
| Bundles **vivos** | `algumProvedorRespondeu` ×8 em cada · forma proibida em **0** nos dois |
| Regressão além do pedido — suíte Deno das EFs | **725 passed, 0 failed** (baseline 718, MESMO conjunto de 45 arquivos) |
| Fechamento das 5 EFs não deployadas | inalterado, `resultado-de-provedor` em **0** |
| Prova de mordida | **8 mutações, 8 mordem** (1/1/3/5/2/1/1/2), restauração verificada em cada |
| PROD (só `SELECT`) | 0 linhas em qualquer dos dois estados defeituosos; 0 `provider='none'` em `ai_call_logs` |

⚠ **Os três `<verify>` deste plano são RE-RODÁVEIS** — nenhum embute escrita. Quebra a sequência
de cinco ocorrências da fase (WINDOWS 51, 53, 55, 59, 66), e a razão é simples: o plano manteve o
deploy no `<action>` e deixou o `<verify>` com `deno test`, `grep`, `npm run lint` e `git log`.
Vale registrar como o padrão a copiar.

## Medições vivas (D-49 / D-51) — o plano NÃO foi ajustado para caber

| O que o plano assume | Medido (2026-09-23) | Bate? |
|---|---|---|
| Precondição: EF `gerar-guia` v20 com `guiaDeResultado` no bundle vivo | version 20 ACTIVE; `guiaDeResultado` ×10 no bundle | sim |
| Precondição: `_shared/ai-error-codes.ts` no disco | presente, 6867 octetos, com os dois códigos de bloqueio | sim |
| Precondição Task 2: `_shared/resultado-de-provedor.ts` com testes verdes | criado na Task 1, 4/4 | sim |
| `flags` nunca chega ao upsert de sucesso | confirmado por leitura **e** por RED executado | sim |
| teto de custo ⇒ `pendente_humano` com competências vazias | confirmado — **e a linha também SUPERAVA a vigente** (`superadas: 1`) | **sim, incompleto** |
| «duas de cinco EFs afetadas» (49-25) | das **SETE**: 3 cobertas por `flagged_for_human_review`, 1 coberta por construção, 1 consertada pelo 49-25, 1 a desta task, **1 NOVA** | **não — falta um sítio** |
| arquivo novo em `_shared` não desincroniza as outras | confirmado por `--dry-run` nas cinco | sim |
| `:377` é a linha da guarda na transcrição | `:377` antes; `:396` depois | sim |
| `__tests__/index.test.ts` existe nesta EF | **existe** (ao contrário do que o 49-25 relatou para a OUTRA EF) | sim |
| linhas defeituosas em PROD: zero | **0** nos dois estados, e 0 `provider='none'` desde sempre | sim, com número |
| `tsc` em 89, teto D-53 = 90 | **89**, conjunto idêntico, medido depois de cada task | sim |

## Deviations from Plan

**1. [Rule 2 - Funcionalidade crítica ausente] A guarda da transcrição precisava das DUAS perguntas, não da substituição**

- **Found during:** desenho do GREEN da Task 2.
- **Issue:** o `<action>` diz «trocar a lista literal de `:377` pela pergunta estrutural». Trocar
  ao pé da letra — `if (!algumProvedorRespondeu(result))` — teria **removido** a checagem
  `parsed == null`, que é o caso do parse falho / schema recusado com provedor real. A EF passaria
  a gravar `pendente_humano` com competências vazias quando o Sonnet respondesse algo fora do
  schema: exatamente o defeito que o plano existe para fechar, migrado de uma causa para outra.
- **Fix:** a condição ficou `!algumProvedorRespondeu(result) || parsed == null`. As duas perguntas
  são independentes e o predicado compartilhado assere, por teste próprio, que não opina sobre
  conteúdo.
- **Files modified:** `supabase/functions/avaliar-transcricao-entrevista/index.ts`
- **Verification:** os 27 testes do 49-10 seguem verdes (o de parse nulo entre eles); M6 ⇒ 1.
- **Commit:** `42f5b27f`

**2. [Rule 2 - Funcionalidade crítica ausente] A chave AUSENTE exigiu forma própria, não a linha única que o WINDOWS 64 previa**

- **Found during:** escrita do GREEN da Task 1.
- **Issue:** o `WINDOWS 64` descreve o conserto como «uma linha: acrescentar `flags` ao ramo do
  roteiro existente». Feito assim (`flags: persistFlags`), a chave nasceria **sempre**, com `[]`
  no caso comum — e sob `onConflict` um `[]` explícito APAGA a flag gravada pela execução
  anterior. O conserto de um defeito de registro criaria um defeito de sobrescrita, no mesmo
  upsert.
- **Fix:** spread condicional (`...flagsDoRoteiro`), com a chave nascendo só quando há o que
  dizer, e um teste dedicado à ausência.
- **Files modified:** `supabase/functions/gerar-guia-entrevista/index.ts`
- **Verification:** teste T-49-26-03; mutação M2 ⇒ 1.
- **Commit:** `c53da826`

**3. [Rule 3 - Blocker instrumental] O caminho `provider:'none'` era inexpressável no mock da transcrição**

- **Found during:** escrita do RED da Task 2.
- **Issue:** o mock de `ai_call_logs` devolvia `{data: []}` fixo na soma do gasto do dia, então o
  teto de custo **nunca** estourava. O cenário do defeito era inalcançável — e é por isso que ele
  vivia com 27 testes verdes em volta. Sem esse parâmetro não haveria RED nenhum.
- **Fix:** `custoDiarioUsd` em `AdminOpts`, alimentando `gte` com `[{cost_usd: N}]`. Aditivo: os
  27 testes existentes não mudaram de comportamento (default 0).
- **Files modified:** `supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts`
- **Verification:** RED medido com `anthropic.calls.length === 0` asserido — prova de que o corte
  foi anterior ao provedor e não uma falha do mock.
- **Commit:** `c8b2a1de`

**4. [Rule 1 - Bug, no meu próprio registro] `gsd-tools windows fixed` aceita o motivo e o descarta**

- **Found during:** marcação do `WINDOWS 64`.
- **Issue:** `windows fixed <id> <reason>` aceita o segundo posicional sem erro e grava
  `status: fixed` com `reason` **vazio**, nos dois lugares (tabela e bloco JSON). E recusa
  re-marcar («already fixed»), então o motivo não é recuperável pela via normal. Medido duas
  vezes (64 e 65) e confirmado **retroativamente**: a entrada **60**, marcada `fixed` pelo 49-25,
  também está com `reason` vazio — é sistemático, não um erro meu de digitação.
- **Fix:** motivo escrito à mão nos DOIS lugares de cada entrada, com verificação por leitura de
  volta (`windows status` → 64 com 715 caracteres, 65 com 965). A entrada 60 não é minha e ficou
  como está.
- **Files modified:** `.planning/WINDOWS.md`
- **Verification:** `windows status` relido; `open_count` 25 com 64 e 65 fora dos abertos.
- **Registrado como WINDOWS 69** — um ledger que diz QUE foi consertado mas não COMO é meio
  registro, e quem reabrir a janela no futuro não terá a prova.

---

**Total deviations:** 4 (2 × Rule 2, 1 × Rule 3, 1 × Rule 1).
**Impact:** nenhum negativo. A **1** é a mais importante: seguir o `<action>` ao pé da letra
teria migrado o defeito de uma causa para outra, e o plano não a previa — é a terceira vez na
fase que um plano escrito mid-fase, sem plan-checker, pede um conserto que criaria um defeito
novo (49-25 Deviation 1, 49-25 Deviation 2, esta). A **4** é sobre a ferramenta, não sobre o
código.

## Deferred (registrado, não consertado)

| Item | Por quê fica fora | Onde |
|---|---|---|
| **`comparativo-candidatos:434` — o SEXTO sítio, e o único que chega à TELA**: nenhuma guarda de bloqueio, o stub entra em `comparativo_solicitado.ranking` E volta no payload ao RH | Scope Boundary: o `<measure_first>` mandou reportar e não consertar; EF de outro plano, exige deploy próprio | **WINDOWS 68** |
| **`provedorDeResultado` em SEIS cópias** (transcrição :157, análise :166, cultural :139, redação :254, gerar-guia :442 inline, comparativo :443 inline) | é normalizador contra a allowlist de um CHECK, NÃO o predicado deste plano — fundi-los seria errado. As seis entre si são duplicação, mas são seis EFs e seis deploys | **WINDOWS 70** |
| `gsd-tools windows fixed` descarta o motivo | ferramenta do `gsd-core`, fora do repositório do projeto | **WINDOWS 69** |
| Guias/análises já persistidos nos estados defeituosos **não** são reescritos | D-30 — e a contagem medida é **0** nos dois, então não há matéria para o 49-12 | §medição «PROD» |
| Nenhuma tela traduz `flags`/`falhou` para o RH | o selo é o 49-16 (D-55) | **WINDOWS 61**, irmão |
| `max_tokens` do `interview_guide` (8000) e 98,4 s contra o teto de 110 s | P1, fora do escopo declarado. Este plano **não agrava**: nenhum bloco novo ao modelo | **WINDOWS 47** |

**WINDOWS 64 e 65 marcados `fixed`**, com o motivo escrito — são os dois defeitos que este plano
existe para fechar. **Três entradas novas** (68, 69, 70).

## Known Stubs

**Nenhum.** Varridos os 4 arquivos de produção/teste tocados por
`TODO|FIXME|placeholder|coming soon|not available|não disponível|= \[\]|= \{\}|=""`. Os 3 acertos
são **acumuladores pré-existentes** que a execução preenche: `persistFlags: string[] = []`,
`guias: unknown[] = []` e a sua reatribuição `guias = []`. Nenhum valor vazio codificado que
chegue à tela, nenhum componente sem fonte de dados.

⚠ **Duas coisas que NÃO são stub mas parecem:**

1. O cinto `!resultado.provider` em `algumProvedorRespondeu`. Inalcançável hoje — **medido** pelo
   49-25 contra o esquema de PROD (enum `llm_provider` NOT NULL) e contra os 12 retornos do
   `ai-client` —, mantido como segunda linha de defesa e **vigiado por teste desde o primeiro
   commit** (M5 ⇒ 2 reprovados). Não é ramo esquecido.
2. `const flagsDoRoteiro = … : {}` — o objeto vazio é o **valor correto**, não um placeholder: ele
   é o que faz a chave `flags` não nascer. A mutação M2 existe para que trocá-lo por `[]` reprove.

**Varredura de FORMA nos smokes (CLAUDE.md §Portões):** **sem alvo** — 0 arquivos `.sql` tocados
por este plano. Declarado em vez de omitido.

## Threat Flags

Nenhuma superfície nova: nenhum endpoint, nenhum caminho de auth, nenhuma mudança de esquema,
nenhuma tabela, nenhuma coluna, nenhuma migration, nenhum pacote.

| Threat | Disposição | Prova |
|---|---|---|
| T-49-26-01 (flag de revisão computada e descartada) | mitigate | `...flagsDoRoteiro` no ramo do roteiro; 1 teste novo; mutação M1 ⇒ 1; marcador no bundle vivo da v21 |
| T-49-26-02 (bloqueio por custo apresentado como análise aguardando revisão) | mitigate | predicado estrutural de `_shared` nas duas perguntas; 1 teste novo; M6 ⇒ 1, **M7 (a forma proibida) ⇒ 1**, M8 ⇒ 2 |
| T-49-26-03 (`[]` explícito apagar flag anterior sob `onConflict`) | mitigate | chave AUSENTE por spread condicional, **asserida por teste próprio**; M2 ⇒ 1 |
| T-49-26-SC (supply chain) | mitigate | **zero** instalação de pacote; o único import novo é um arquivo local de `_shared` com **zero imports** ele mesmo |

`verify_jwt=true` **preservado e relido de PROD** nas duas EFs. RNF-07a intacta: nenhuma das duas
escreve `candidaturas`, e o `p_bloqueio_avanco: false` do ramo de falha é asserido — um corte por
gasto nunca segura o avanço de um candidato. O disclaimer NEGADO do rodapé da devolutiva (exceção
decidida no CLAUDE.md) **não foi tocado**: conferido por grep que nenhuma das duas EFs nem o
módulo novo o contêm (0 ocorrências de `teste psicol`/`_NEG` nos três).

## Issues Encountered

- **`tsc` em 89 contra teto 90 (D-53): margem de UM.** Nenhum erro acrescentado (os 6 arquivos são
  Deno/EF, fora do `include` do `tsconfig.json`) e o **conjunto de mensagens é idêntico** ao
  baseline — conferido por `diff` sobre as 89 linhas ordenadas, duas vezes, como o
  `<known_blocker>` pediu. O hook imprimiu `tsc errors: 89 (frozen baseline: 96)` nos quatro
  commits.
- **`resend-webhook.test.ts`** continua abortando ao resolver `npm:svix@1.99.1` — pré-existente,
  fora de escopo, já em WINDOWS 46. Excluído das rodadas; **não** «consertado».
- **`_shared/__tests__/strict-schema.test.ts:88`** falha o type-check do Deno (TS7053).
  Pré-existente, arquivo não tocado. É por isso que o baseline deste plano é **718/725** e não os
  690 que o 49-24 reporta: os conjuntos de arquivos não são os mesmos. Excluído e **nomeado**, em
  vez de apresentado como número comparável.
- **`deno test` não emite os contadores que `check tdd-red-evidence` lê.** Os dois REDs foram
  **medidos** (18/1 e 27/1, as falhas por **asserção**, com o diff `undefined`/`true` e
  `pendente_humano`/`falhou` no log) e nenhuma linha de contador foi sintetizada — forjar o
  artefato que o checker existe para ler é pior que não tê-lo.
- **A primeira tentativa de medir as mutações deu «0 reprovados» em três seguidas — e era o meu
  harness, não os testes.** A extração da contagem não removia os códigos ANSI do `deno test`.
  Peguei porque «três mutações consecutivas sem morder» é implausível o suficiente para conferir
  à mão antes de acreditar: rodei M1 manualmente e vi `1 failed`. Um instrumento de medição que
  falha silenciosamente teria produzido a conclusão exatamente oposta à verdade — «nenhuma
  mutação morde» em vez de «todas mordem».
- **Os dois defeitos são LATENTES em PROD.** Zero linhas em qualquer dos dois estados, zero
  bloqueios registrados em `ai_call_logs` desde sempre, e 161× de folga no teto de custo (medido
  pelo 49-25). Isso muda a leitura do conserto: é prevenção, e a primeira observação real depende
  de o teto ser baixado ou do volume subir duas ordens de grandeza.

## Next

- **49-16** (o selo, passo «cliente»): **o pré-requisito está fechado.** `weak_dim_uncovered`
  deixou de ser um estado impossível — a linha de `entrevista_guias` agora o carrega em
  `guia.flags`, e a chave é **ausente** (não `[]`) quando não há flag, o que dá ao componente uma
  distinção limpa entre «nada a sinalizar» e «lista vazia». Do lado da análise, `status_analise`
  passa a poder valer `falhou` num caso novo (bloqueio por custo), com o `error_code` no log.
- **49-18** (prova em PROD): dois invariantes novos para vigiar, os dois impressões digitais de
  forma e não contagens que envelhecem — (a) nenhuma linha de `entrevista_analises` com
  `status_analise='pendente_humano'` e `competencias` vazio; (b) nenhuma linha de
  `entrevista_guias` com `flags` igual a `[]` (a forma que o conserto proíbe). Hoje as duas são 0.
- **49-12** (retroativos): **nada a fazer** deste plano. As contagens medidas são 0 nos dois
  estados.
- **49-22 / quem tocar `comparativo-candidatos`**: **WINDOWS 68** — o sexto sítio, e o único que
  entrega o stub à TELA. O conserto é uma linha com o predicado que este plano criou; a EF já tem
  `_shared` no fechamento, só não importa o arquivo.

## Self-Check: PASSED

- `supabase/functions/_shared/resultado-de-provedor.ts` — FOUND
- `supabase/functions/_shared/__tests__/resultado-de-provedor.test.ts` — FOUND
- `supabase/functions/gerar-guia-entrevista/index.ts` — FOUND
- `supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts` — FOUND
- `supabase/functions/avaliar-transcricao-entrevista/index.ts` — FOUND
- `supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts` — FOUND
- commits `fcafccfb`, `c53da826`, `c8b2a1de`, `42f5b27f` — os quatro FOUND em `git log --all` e os
  quatro já em `origin/main`
- `commits: 4` **MEDIDO** por `git rev-list --count 199d840b..HEAD`, não narrado;
  `plan_head_before` registrado; `tokens` = octetos de diff ÷ 4, com o erro de 2,6× escrito em vez
  de suavizado
- nenhuma deleção de arquivo no intervalo (`git diff --diff-filter=D` vazio); nenhum arquivo
  untracked; `git status --short` limpo além do `WINDOWS.md` que vai no commit de metadado
- `<precondition>` das DUAS tasks verificadas **antes** de qualquer escrita: EF v20 ACTIVE relida
  da Management API com `guiaDeResultado` ×10 no bundle vivo, `ai-error-codes.ts` lido do disco, e
  o módulo novo verde antes da Task 2
- os **quatro** itens do `<measure_first>` medidos e reportados, com **um sítio NOVO achado** e
  **uma correção ao registro do defeito** (o `superadas: 1`) — nenhum ajustado para caber
- `<acceptance_criteria>` das duas tasks re-executados: flag gravada com roteiro / chave ausente
  sem flag / predicado em `_shared` consumido pelas duas pontas / docblock verdadeiro conferido no
  bundle vivo / teto ⇒ `falhou` / vigente anterior preservada por asserção / as duas EFs relidas
  de PROD / `origin/main..HEAD` vazio
- **8 mutações** com restauração verificada em cada e checagem de md5 de que a mutação alterou o
  arquivo; **todas mordem**, nenhuma declarada aprovada — e o harness que dizia o contrário foi
  pego e consertado
- varredura de FORMA nos smokes: **sem alvo** (0 arquivos `.sql`), declarado em vez de omitido
- PATTERNS §J respeitado: `--dry-run` antes dos dois deploys, fechamento conferido à mão contra as
  baselines, carona conferida por `git log`, versão/status/`verify_jwt`/`import_map` relidos,
  marcadores conferidos nos **bundles vivos**, `npm run lint` ≤ 90, push depois de CADA deploy
- PATTERNS §K: **não violado** — a forma proibida em 0 no disco e em 0 nos dois bundles vivos,
  conferido nos dois lugares porque foi o bundle (não o disco) que pegou o 49-25
- 3 entradas novas no `WINDOWS.md` (68, 69, 70) e as **64 e 65 marcadas `fixed` com o motivo
  escrito à mão**, porque a ferramenta o descarta

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*
