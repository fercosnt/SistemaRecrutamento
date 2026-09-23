---
phase: 49-consertos-da-jornada-bloco-2
plan: 27
subsystem: edge-functions
tags: [jorn-28, jorn-39, windows-68, triagem-03, comparativo-candidatos, deno, tdd, deploy, teto-de-custo, ai-06, rf-pl-18]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "26"
    provides: "`_shared/resultado-de-provedor.ts` — `algumProvedorRespondeu()`, a pergunta estrutural em UM lugar; e o próprio defeito desta plano, MEDIDO e registrado como WINDOWS 68"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "08"
    provides: "a EF `comparativo-candidatos` v28: posse por candidatura (JORN-32), recusa de encerrada, `posicoes`, teto pela constante, proveniência real e o INSERT de auditoria com ERRO CHECADO — os 18 testes que aqui seguem intactos"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`CallAiResult.provider`/`error_code` e os dois caminhos de `callAi` que não tocam provedor nenhum"
provides:
  - "`comparativo-candidatos` v29: um bloqueio pré-provedor recusa com motivo (503 `SEM_RESULTADO_IA`) em vez de devolver ao RH um ranking que nenhum modelo produziu"
  - "a linha de auditoria do bloqueio existe e é LEGÍVEL como bloqueio — `ranking` (jsonb NOT NULL) carrega um marcador explícito, sem nenhuma chave em comum com a forma de um ranking real"
  - "o SEXTO e último sítio da família medida na fase, fechado — e o único que chegava a uma tela"
  - "para o 49-18: um invariante novo de PROD, por FORMA e não por contagem — nenhuma linha de `comparativo_solicitado` pode ter `ranking` com a chave do artefato de bloqueio E `provedor_ia` não nulo; e o marcador `bloqueado` é o detector limpo do caso legítimo"
  - "para o 49-22 / 49-16: o código `SEM_RESULTADO_IA` e o campo `motivo` chegam à tela em `details.error_code`; nenhuma cópia os traduz ainda (WINDOWS 78)"
affects: [49-18, 49-22, 49-16, 49-12]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 4492
  tasks: 1
  commits: 1
  plan_head_before: 592a1edae684d73ac3b7b7134c3e29259d4ac585
  # `commits: 1` MEDIDO por `git rev-list --count 592a1eda..HEAD` no instante da escrita deste
  # SUMMARY (107a0571, o único de PRODUÇÃO). Re-medir DEPOIS do commit de metadado deste plano
  # dá 2, e isso não é divergência: o `plan_head_before` é anterior a ele por construção.
  # `tokens: 4492` = 17 968 octetos de `git diff 592a1eda..HEAD -- supabase` ÷ 4.
  estimate_tokens_do_plano: 16000
  # O plano estimou 16 000 e o realizado foi 4 492 — 3,6× ABAIXO. Nona amostra da fase na MESMA
  # direção (49-24 5,2×, 49-25 4,0×, 49-10 3,6×, 49-26 2,6×). A causa é a mesma e já não é
  # novidade: o orçamento é dimensionado pelo TRABALHO (ler a EF de 551 linhas e os 761 do teste,
  # o `ai-client` de 1152, medir três coisas em PROD, rastrear o caminho do erro por QUATRO
  # arquivos do front até descobrir onde a cópia é decidida, cinco mutações, um deploy) e o
  # `actuals` mede o ARTEFATO. Não são a mesma grandeza, e a razão de erro não está encolhendo.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "quando a coluna de destino é NOT NULL, a pergunta «como registrar a ausência?» tem três respostas e duas são armadilhas: NULL (proibido pelo schema), `{}` (indistinguível de «não escrevemos nada») e um MARCADOR EXPLÍCITO. Só a terceira deixa o leitor futuro distinguir bloqueio de resultado por presença de chave, sem perícia de forma"
    - "reusar o vocabulário de recusa existente é bom conselho até o ponto em que reusá-lo produz uma mensagem FALSA — e aí o conselho inverte. Nenhum dos códigos do 49-08 é verdadeiro para um corte de gasto; usar um deles teria recriado exatamente o defeito que o 49-08 existe para ter removido"
    - "o detector do defeito pode ser mais falso que o defeito: a chave `recommendation` casa nas 4 linhas de PROD porque o ranking REAL também a tem. O que distingue o artefato é o TIPO do valor (string × objeto) e a ausência de `ranked_candidates`"
    - "uma mutação que reintroduz a forma proibida (lista literal de código de erro) e reprova SÓ o teste da causa que a lista não conhece é a prova mais limpa de que a guarda é estrutural — ela separa «detecta a ausência do conserto» de «detecta o padrão errado»"

key-files:
  created: []
  modified:
    - supabase/functions/comparativo-candidatos/index.ts
    - supabase/functions/comparativo-candidatos/__tests__/index.test.ts

key-decisions:
  - "O `error_code` da recusa é NOVO (`SEM_RESULTADO_IA`), e não um dos cinco do 49-08. O `<action>` pedia o vocabulário existente «para a tela não precisar de caso novo»; medido, NENHUM dos códigos existentes é verdadeiro aqui — `SEM_ANALISE` diria que falta análise (não falta), `VALIDATION` culparia a seleção do RH (estava correta), `MIXED_VAGA` falaria de vagas diferentes (não é o caso). Reusar um deles reintroduziria a mentira de diagnóstico que o 49-08 existe para ter removido. O nome segue a FORMA pt-BR do vocabulário (`SEM_ANALISE` → `SEM_RESULTADO_IA`), que é o que o conselho realmente pedia, e a tela continua sem precisar de caso novo — ela degrada para a cópia genérica, que é a degradação já projetada para código desconhecido."
  - "503, não 200 e não 400. 200 é o envelope de sucesso cuja ambiguidade este conserto existe para remover — mantê-lo com `ok:false` funcionaria (a `triagemService` trata `!data.ok`) e ainda assim deixaria um bloqueio parecendo uma resposta bem-sucedida no nível do transporte. 400 culparia o pedido do RH, que estava correto: é a mesma classe de diagnóstico falso do parágrafo acima. 503 diz «a capacidade não está disponível agora», que é a verdade nos dois caminhos, e é o status que o próprio `lib/efErrors.ts` documenta para a família de indisponibilidade de IA — o corpo do non-2xx é a fonte que ele lê PRIMEIRO, então o código chega à tela pelo caminho autoritativo."
  - "O `ranking` do bloqueio é `{bloqueado: true, motivo}`, escolhido contra o schema VIVO (medido: `jsonb NOT NULL`, sem default e sem CHECK de forma — o único CHECK da tabela é o de `provedor_ia`). NULL é proibido pela coluna; `{}` seria indistinguível de «não escrevemos nada» (a mesma confusão entre ausência e vazio que o 49-26 mediu no upsert de flags); o artefato seria o próprio defeito. O marcador tem ZERO chaves em comum com a forma real do ranking — asserido por teste, inclusive a ausência de `match_score` (o score fabricado que o artefato de injeção carrega)."
  - "NENHUMA migration, e a decisão foi medida e não presumida: o schema vivo já permite registrar o bloqueio. Acrescentar coluna a `comparativo_solicitado` seria decisão do operador (e o inventário LGPD dela é o 49-17); a condição de PARADA do plano não foi alcançada."
  - "A guarda ficou com as DUAS perguntas separadas — `!algumProvedorRespondeu(result)` para o bloqueio e o `?? null` preservado para o parse falho com provedor REAL. É a mesma conciliação que o 49-26 registrou na Deviation 1: colapsá-las faria a EF perder a capacidade de dizer POR QUE não há ranking, e migraria o defeito de uma causa para outra."
  - "A recusa vem DEPOIS do INSERT e do seu erro checado. A ordem é o mecanismo: um bloqueio jamais é comunicado como registrado quando não está — se o INSERT falha, o `throw` do 49-08 leva ao 500, e há teste para isso."
  - "O mapeamento de `provedor_ia` NÃO foi tocado (já mapeava a sentinela para NULL, que é o que o CHECK permite). O que mudou é a resposta ao RH e a legibilidade do bloqueio na auditoria."
  - "`main` mantida como branch de trabalho (autorização explícita do orquestrador). Não registrado como desvio."

patterns-established:
  - "Sexta prova de mordida da fase, e a segunda seguida em que TODAS as mutações mordem de primeira. Nenhuma `0 → 1`: não há ramo inalcançável neste conserto, porque o cinto (`?? \"sem_provedor\"`) é o único ramo não exercitado e ele foi declarado, não escondido."
  - "O RED foi medido DUAS vezes e por instrumentos diferentes — pela suíte (19 passed | 2 failed, por asserção) e por uma sonda de execução descartável que imprimiu o corpo HTTP e a linha de auditoria REAIS. A sonda é o que transformou «o plano diz que o stub vai para o banco» em «medi o stub no banco e no corpo». Custou ~30 linhas."
  - "O meu PRÓPRIO harness de mutação nasceu com o defeito que o PATTERNS §L descreve (o `$?` lia o `sed` do pipe, não o `deno`) e imprimiu `exit=0` para cinco execuções reprovadas. Desta vez o número de reprovados estava certo, então a conclusão não mudou — mas o instrumento estava mentindo sobre metade do que ele existe para medir. §L é para ser aplicado na CONSTRUÇÃO do harness, não só quando o resultado parece estranho."

requirements-completed: [JORN-28, JORN-39]

# Coverage (#1602)
coverage:
  - deliverable: "Um comparativo bloqueado antes do provedor não chega ao RH como ranking (WINDOWS 68 / T-49-27-01)"
    requirement: JORN-39
    human_judgment: false
    verification:
      - kind: test
        ref: "index.test.ts#«49-27 / WINDOWS 68 — teto de custo estourado ⇒ recusa com motivo ao RH, NUNCA ok:true com ranking»: zero chamadas ao provedor, `ok:false`, `ranking` ausente do corpo, 503, `error_code=SEM_RESULTADO_IA`, `motivo=cost_cap_exceeded`"
        status: pass
      - kind: test
        ref: "index.test.ts#«a MESMA guarda pega a injeção»: mesma recusa, `motivo=prompt_injection_detected`, e `match_score` (o score fabricado) ausente da linha"
        status: pass
      - kind: other
        ref: "RED medido: **19 passed | 2 failed**, por ASSERÇÃO (`-true / +false` em «um bloqueio NUNCA sai como ok:true»), com o rastro de runtime imprimindo `[comparativo] ok … provider: \"none\"` — vermelho pelo motivo certo, não por carregamento de módulo (#3770)"
        status: pass
      - kind: other
        ref: "sonda de execução descartável, ANTES: `STATUS 200` / `BODY {\"ok\":true,\"ranking\":{…}}`. DEPOIS: `STATUS 503` / `{\"ok\":false,\"error_code\":\"SEM_RESULTADO_IA\",\"motivo\":\"cost_cap_exceeded\"}`"
        status: pass
      - kind: other
        ref: "mutação M1 (a guarda removida — o defeito original) ⇒ 2 reprovados; M2 (a guarda pergunta só pelo conteúdo) ⇒ 2"
        status: pass
      - kind: command
        ref: "marcadores no bundle PUBLICADO da v29: `algumProvedorRespondeu`, `SEM_RESULTADO_IA`, `bloqueado: true`, `comparativo] bloqueado`, `PROVEDOR_NENHUM` — todos presentes"
        status: pass
  - deliverable: "O bloqueio continua auditado, e legível COMO bloqueio (T-49-27-02)"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "o mesmo teste assere exatamente UMA linha de `comparativo_solicitado`, com `candidatura_ids`, `solicitado_por`, `latencia_ms` numérico, `provedor_ia`/`modelo_ia` NULL, `ranking.bloqueado=true`, `ranking.motivo` e a AUSÊNCIA de `ranked_candidates`/`recommendation`"
        status: pass
      - kind: test
        ref: "index.test.ts#«um bloqueio que NÃO consegue ser auditado não vira recusa silenciosa: 500» — o erro checado do 49-08 vale também para o caminho do bloqueio"
        status: pass
      - kind: other
        ref: "mutação M3 (recusa mantida, mas a auditoria volta a receber o artefato) ⇒ 2 reprovados; M4 (o motivo some do corpo e da linha) ⇒ 2"
        status: pass
      - kind: command
        ref: "schema vivo MEDIDO em PROD (só leitura): `ranking` = `jsonb NOT NULL`, sem default; único CHECK da tabela é `comparativo_solicitado_provedor_ia_check`. Nenhuma migration foi necessária e nenhuma foi feita"
        status: pass
  - deliverable: "A pergunta é estrutural — nenhuma sétima cópia, nenhuma lista literal de códigos"
    human_judgment: false
    verification:
      - kind: command
        ref: "`grep -c 'algumProvedorRespondeu'` ≥ 1 no `index.ts` (o `<verify>` do plano); zero ocorrências de comparação de `error_code` como gatilho no fonte da EF e ZERO no bundle publicado"
        status: pass
      - kind: other
        ref: "mutação M5 — a forma PROIBIDA reintroduzida LITERALMENTE (a guarda vira comparação contra um código conhecido) ⇒ **1** reprovado, e é exatamente o teste da INJEÇÃO. O portão morde o padrão errado, não só a ausência do conserto"
        status: pass
  - deliverable: "Nada do 49-08 foi desfeito"
    human_judgment: false
    verification:
      - kind: test
        ref: "os 18 testes do 49-08 seguem verdes, **nenhuma asserção editada** (diff do arquivo de teste: só acréscimos — um parâmetro novo com default 0, um ramo de mock novo e três testes)"
        status: pass
      - kind: test
        ref: "suíte da EF 18 → **21 passed, 0 failed**"
        status: pass
  - deliverable: "Nenhuma regressão além do pedido"
    human_judgment: false
    verification:
      - kind: test
        ref: "suíte Deno das EFs (45 arquivos, excluídos `strict-schema` e `resend-webhook`): **728 passed, 0 failed** — baseline 725 do 49-26 + os 3 testes novos, MESMO conjunto de arquivos"
        status: pass
      - kind: command
        ref: "`npm run -s lint` → **89** erros, teto D-53 = 90, e o CONJUNTO DE MENSAGENS é idêntico ao baseline (`diff` sobre as 89 linhas ordenadas, medido antes e depois)"
        status: pass
      - kind: test
        ref: "guardas e serviço do front re-executados (`forbidden-strings.grep` + `triagemService`): 40 passed — o contrato que a tela consome não quebrou"
        status: pass
  - deliverable: "A EF está VIVA em PROD e os dois canais (EF e git) em dia"
    human_judgment: false
    verification:
      - kind: command
        ref: "Management API RELIDA: version=**29** ACTIVE `verify_jwt=true` `import_map=true`"
        status: pass
      - kind: command
        ref: "fechamento conferido À MÃO: 12 → **13** arquivos, o ÚNICO novo é `_shared/resultado-de-provedor.ts` (5744 octetos, o MESMO arquivo do 49-26), `index.ts` 26 954 → 32 486, os outros 11 byte-idênticos. Carona: `git log --since='<instante do deploy da v28>'` sobre os 12 arquivos do fechamento devolve só o meu commit — **zero carona**"
        status: pass
      - kind: command
        ref: "`git log --oneline origin/main..HEAD` → vazio (push feito ANTES do deploy)"
        status: pass
  - deliverable: "O RH LÊ na tela por que o comparativo não saiu"
    human_judgment: true
    rationale: "NÃO fechado por este plano — é o passo «cliente» que o D-55 separa, e está fora do `files_modified`. A EF agora DECLARA (`error_code=SEM_RESULTADO_IA` + `motivo`), e o código atravessa a `triagemService` até `details.error_code`. Quem TRADUZ ainda não existe: medido em `AsyncState.tsx:176`, a cópia ramifica só em `AI_UNAVAILABLE`; qualquer outro código cai em «Verifique a conexão e tente novamente», que é FALSO para um corte de gasto. O toast do `useComparativo` mostra «Não foi possível gerar o comparativo», verdadeiro mas mudo sobre o motivo. Registrado em **WINDOWS 78** e endereçado ao 49-22/49-16."
  - deliverable: "Um bloqueio REAL em PROD exercitando o caminho"
    human_judgment: true
    rationale: "MEDIDO em PROD (2026-09-23, só `SELECT`): `comparativo_solicitado` tem **4** linhas, as quatro com a forma REAL de 5 chaves, **zero** com o artefato. Zero linhas `provider='none'` em `ai_call_logs` desde sempre (49-26). O defeito é **LATENTE** — nunca manifestou. A observação real depende de o teto de custo ser baixado ou do volume subir duas ordens de grandeza (161× de folga, medido pelo 49-25); a asserção fica no handler, com mock, que é onde o corpo e a linha gravada são observáveis."

# Metrics
duration: ~55 min
completed: 2026-09-23
tasks: 1
files: 2
---

# Phase 49 Plano 49-27: O comparativo bloqueado recusa em vez de entregar Summary

**O sexto e último sítio da família medida nesta fase, e o único que chegava a uma TELA. Com o
teto de gasto estourado (ou uma injeção detectada), `callAi` devolve um artefato NOSSO — não uma
resposta de modelo —, e esta EF não perguntava nada sobre ele: o artefato era gravado em
`comparativo_solicitado.ranking` como ranking auditado E devolvido ao RH num envelope de sucesso.
Medi os dois, executando: `STATUS 200`, corpo com o artefato, a mesma forma no banco, `provedor_ia`
NULL — uma linha de auditoria que diz «eis o ranking» e «ninguém o produziu» ao mesmo tempo. Agora a
EF pergunta o que importa, uma vez e em um lugar (`algumProvedorRespondeu`, de `_shared`): recusa
503 `SEM_RESULTADO_IA` com o motivo no corpo, e a auditoria registra o bloqueio COMO bloqueio.
Nenhuma migration — o schema vivo já permitia. Cinco mutações, cinco mordem; a que reintroduz a
forma proibida reprova exatamente o teste da causa que ela não conhece.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-09-23
- **Tasks:** 1 / 1 (`type="tdd"`)
- **Files:** 0 criados, 2 modificados
- **Testes:** EF 18 → **21**; suíte das EFs 725 → **728**, sempre 0 falhas
- **EF:** `comparativo-candidatos` v28 → **v29**

## As três medições que o `<measure_first>` pediu

### 1. `comparativo_solicitado.ranking` — `jsonb NOT NULL` **confirmado**, e o bloqueio CABE sem alterar a tabela

Lido do `information_schema` de PROD, não presumido:

| coluna | tipo | nulo? | default |
|---|---|---|---|
| `ranking` | `jsonb` | **NO** | — |
| `latencia_ms` | integer | YES | — |
| `provedor_ia` | text | YES | — |
| `modelo_ia` | text | YES | — |

E os **constraints**: só dois, `comparativo_solicitado_pkey` e
`comparativo_solicitado_provedor_ia_check` (`NULL | anthropic | openai`). **Não há CHECK de forma
sobre `ranking`** — é jsonb livre. Então a resposta ao item (b) é **sim**: a própria coluna
`ranking` carrega o registro do bloqueio, sem coluna nova e sem migration. A condição de PARADA do
plano (nenhuma forma cabe ⇒ parar e relatar) **não foi alcançada**.

### 2. Linhas já gravadas com o artefato: **ZERO** — e o detector que o plano propôs é FALSO

O plano pediu «quantas linhas têm um `ranking` com a chave `recommendation`». Medido: **4 de 4**.

E esse número não significa nada, porque **o ranking REAL também tem `recommendation`** — é um
campo do `ComparativeRankingSchema` (`{top_choice, backup_choice, note}`). O detector proposto casa
100% das linhas legítimas.

O que distingue de verdade é o **tipo do valor** e a companhia:

| medida | valor |
|---|---|
| total de linhas | 4 |
| com `recommendation` (o detector do plano) | **4** ← falso positivo total |
| com `recommendation` do tipo **objeto** (o ranking real) | 4 |
| com `recommendation` do tipo **string** (o artefato) | **0** |
| com `flagged_for_human_review` | **0** |
| com `recommendation` mas SEM `ranked_candidates` | **0** |

As 4 linhas (22/06, 22/06, 06/09, 20/09) têm as 5 chaves do schema real. **Nada para o 49-12** — e,
diferente do 49-25 e do 49-26, aqui o zero precisou de um detector próprio para ser confiável.

### 3. O que o front faz com uma recusa — rastreado até onde a cópia é decidida

Quatro arquivos, porque a resposta muda em cada camada:

1. **`triagemService.invokeComparativo`** — trata as DUAS formas: `error` (non-2xx) e `!data.ok`.
   As duas chamam `extractEfErrorCode` e lançam `TriagemServiceError(copy ?? genérica)`, com o
   código em `details.error_code`. Um código desconhecido ⇒ `COMPARATIVO_FALHA_GENERICA`.
2. **`useComparativo`** — `onError` dispara `toast.error(error.message)`. **É por aqui que a cópia
   do mapa chega ao RH.**
3. **`ComparativoCandidatosPage`** — passa `errorCodeOf(error)` ao `ComparativoScreen`; **nunca**
   renderiza `error.message`.
4. **`AsyncState:176`** — a cópia EM TELA ramifica em exatamente dois códigos: `MIXED_VAGA`
   (override do `ComparativoScreen`) e `AI_UNAVAILABLE` (sobrecarga). Todo o resto: «Verifique a
   conexão e tente novamente.»

**A consequência para este plano:** nenhum código existente produz uma frase verdadeira para um
corte de gasto. `AI_UNAVAILABLE` diria «sobrecarregado, tente em instantes» (falso: tentar de novo
não ajuda até o dia virar ou o operador subir o teto); o genérico diz «verifique a conexão» (falso:
a conexão está boa). O toast fica verdadeiro («Não foi possível gerar o comparativo») e mudo. É
disso que trata a Deviation 1 e o **WINDOWS 78**.

⚠ De passagem, e não consertado: as cópias de `ENCERRADA`/`SEM_ANALISE`/`VALIDATION`/`FORBIDDEN` no
`RECUSA_COMPARATIVO_COPY` chegam ao RH **só pelo toast** — a tela, por baixo dele, mostra «Verifique
a conexão» nos quatro casos. É pré-existente ao 49-27 e fora do escopo.

## O defeito, medido por execução (não por leitura)

A sonda descartável rodou o handler real com mocks e imprimiu o que o RH receberia e o que o banco
guardaria. **ANTES:**

```
[comparativo] ok { … provider: "none", modelo_ia: null }
STATUS 200
BODY      {"ok":true,"ranking":{…o artefato…},"posicoes":{…},"provedor_ia":null,"modelo_ia":null}
AUDITORIA ranking = {…o mesmo artefato…}   provedor_ia = null   modelo_ia = null
ai_call_logs = 1 linha | provider = "none" | error_code = "cost_cap_exceeded"
```

Três fatos que a leitura sozinha não daria: (a) o log de runtime dizia **`ok`** para um bloqueio —
o rastro que alguém investigando leria primeiro estava errado também; (b) a EF ainda devolvia
`posicoes` completo, ou seja a resposta parecia íntegra; (c) o bloqueio JÁ estava corretamente
registrado em `ai_call_logs` — o sistema sabia, e só a camada que fala com o RH não perguntava.

**E a consequência na tela, lida no código (não executada):** `ranking.ranked_candidates` é
`undefined` ⇒ `candidates = []`; o `ComparativoScreen` **não passa `isEmpty`** ao `AsyncState`, então
ele renderiza a moldura inteira do comparativo — selo de sugestão de IA, selo de proveniência,
botão «Exportar PDF» — em volta de uma tabela vazia. Não era uma tela de erro: era um comparativo
bem-sucedido e vazio.

**DEPOIS:**

```
[comparativo] bloqueado { … motivo: "cost_cap_exceeded" }
STATUS 503
BODY      {"ok":false,"error_code":"SEM_RESULTADO_IA","message":"…","motivo":"cost_cap_exceeded"}
AUDITORIA ranking = {"bloqueado":true,"motivo":"cost_cap_exceeded"}   provedor_ia = null
```

## O conserto

Uma guarda, três consequências:

```
const bloqueado = !algumProvedorRespondeu(result);
const motivo = bloqueado ? (result.error_code ?? "sem_provedor") : null;
const ranking = bloqueado ? { bloqueado: true, motivo } : (result.parsed ?? null);
```

- **A auditoria** continua saindo pelo MESMO INSERT, com o MESMO erro checado — uma única escrita,
  dois valores possíveis de `ranking`. Duplicar o INSERT teria criado dois caminhos para divergirem.
- **A recusa** vem DEPOIS da checagem do INSERT: se a linha do bloqueio não é gravada, o `throw` do
  49-08 leva ao 500, e há teste para isso. Um bloqueio nunca é comunicado como registrado sem estar.
- **O `?? null` ficou**, para o parse falho com provedor REAL. As duas perguntas são independentes,
  e é a lição que o 49-26 pagou para aprender: substituir uma pela outra migra o defeito de causa.

O mapeamento de `provedor_ia` não foi tocado. Nenhuma migration, nenhuma RPC, nenhuma coluna,
nenhum pacote.

## A prova de mordida (D-56) — 5 mutações, **todas** mordem de primeira

| # | Mutação | Reprovados |
|---|---|---|
| M1 | a guarda removida — o artefato volta ao caminho de sucesso (o defeito original) | **2** |
| M2 | a guarda pergunta só pelo CONTEÚDO (`parsed == null`) | **2** |
| M3 | a recusa fica, mas a auditoria volta a receber o artefato | **2** |
| M4 | o motivo desaparece do corpo e da linha | **2** |
| M5 | **a forma PROIBIDA reintroduzida literalmente** (a guarda vira comparação contra um código de bloqueio conhecido) | **1** |

`git diff --quiet` como guarda de entrada, md5 conferido para provar que a mutação **alterou** o
arquivo, restauração verificada em todas as cinco, e um **controle** sem mutação (exit 0).

**M5 merece nome próprio:** o único teste que ela reprova é o da **injeção** — a causa que a lista
literal não conhece. Ela separa «o portão detecta a ausência do conserto» de «o portão detecta o
padrão errado», e é a diferença entre uma guarda estrutural e uma fotografia dos bloqueios de hoje.

## Deploy (D-52 / PATTERNS §J) — fechamento conferido À MÃO

| | antes (v28) | depois (v29) |
|---|---|---|
| arquivos do fechamento | 12 | **13** |
| delta | — | `+_shared/resultado-de-provedor.ts` (5744) · `index.ts` 26 954 → 32 486 · os outros 11 byte-idênticos |

**Zero carona**, conferido com o instante REAL do deploy da v28 lido da Management API
(`2026-09-23T00:05:45Z`): dos 12 arquivos do fechamento anterior, o único commit posterior a esse
instante é o meu. Os 6 arquivos de `_shared` mais suspeitos (tocados por outros planos desta fase)
têm última alteração entre 18:07 e 20:56 de **22/09**, todos anteriores ao deploy. O arquivo novo é
o entrante intencional — o mesmo byte a byte que o 49-26 subiu nas outras duas EFs.

O `efdeploy.cjs` afirma no cabeçalho que recusa subir com fechamento divergente; **essa checagem
continua não existindo no código** — oitava confirmação da fase (49-03, 49-08, 49-09, 49-23, 49-24,
49-25, 49-26 e esta). Daí a conferência manual.

`import_map: true` relido (um import map faltando não falha no deploy — falha na primeira
invocação). **Push feito ANTES do deploy**, e `origin/main..HEAD` conferido vazio depois.

## §K — não violado, conferido no disco E no bundle publicado

| Onde | Comparação de código de erro como GATILHO | Forma do artefato reproduzida |
|---|---|---|
| `index.ts` (fonte) | **0** | **0** |
| bundle **PUBLICADO** da v29 | **0** | — |

A descrição do bloqueio no docblock é em prosa: ela diz o que o artefato é e por que não pode ser
persistido, sem escrever a forma. Os **testes** citam os dois códigos de propósito (M5 os
reintroduz, e esse é o valor dela).

## Verification results

| Verify | Resultado |
|---|---|
| `<verify>` #1 — `deno test` da EF | **21 passed, 0 failed** |
| `<verify>` #1 — a EF consome o predicado compartilhado | `grep -c 'algumProvedorRespondeu'` ≥ 1 ✓ |
| `<verify>` #2 — `tsc` ≤ 90 | **89**, conjunto de MENSAGENS idêntico ao baseline (`diff` vazio) |
| `<verify>` #2 — `origin/main..HEAD` | **vazio** |
| Deploy — `--dry-run` | 13 arquivos, conferidos um a um contra a baseline de 12 |
| Deploy — Management API **relida** | v29 ACTIVE `verify_jwt=true` `import_map=true` |
| Bundle **publicado** | 5 marcadores presentes; forma proibida em **0** |
| Regressão — suíte Deno das EFs | **728 passed, 0 failed** (baseline 725, MESMO conjunto de 45 arquivos) |
| Regressão — guardas + serviço do front | 40 passed |
| Prova de mordida | **5 mutações, 5 mordem** (2/2/2/2/1), restauração verificada + controle |
| PROD (só `SELECT`) | 4 linhas, **0** com o artefato; nenhuma migration necessária |

⚠ Os dois `<verify>` deste plano são **RE-RODÁVEIS** — nenhum embute escrita nem deploy (o deploy
ficou no `<action>`). É o padrão que o 49-26 recomendou copiar, e foi copiado.

## Medições vivas (D-49 / D-51) — o plano NÃO foi ajustado para caber

| O que o plano assume | Medido (2026-09-23) | Bate? |
|---|---|---|
| Precondição: `_shared/resultado-de-provedor.ts` com `algumProvedorRespondeu` e testes verdes | presente, 5744 octetos, 4/4 verdes | sim |
| Precondição: EF em v28 | version 28 ACTIVE `verify_jwt=true`, relida da Management API | sim |
| `comparativo_solicitado.ranking` é `jsonb NOT NULL` | confirmado, **e sem CHECK de forma** | sim |
| existe coluna onde o bloqueio caiba sem alterar a tabela | **sim, a própria `ranking`** ⇒ nenhuma migration | sim |
| «quantas linhas têm `recommendation`» detecta o artefato | **não** — 4/4, porque o ranking real também a tem. Detector correto ⇒ **0** | **não — o detector do plano é falso** |
| «use o vocabulário do 49-08 para a tela não precisar de caso novo» | nenhum dos 5 códigos é verdadeiro aqui; a tela **continua sem caso novo** por degradação | **não — ver Deviation 1** |
| `:434` é a linha de `const ranking = result.parsed ?? null` | `:434` antes; o bloco do conserto começa em `:462` depois | sim |
| `:441-450` (mapeamento de `provedor_ia`) já correto | confirmado, não tocado | sim |
| linhas defeituosas em PROD: a medir | **0**, com detector próprio | sim, com número |
| `tsc` em 89, teto D-53 = 90 | **89**, conjunto idêntico | sim |

## Deviations from Plan

**1. [Rule 2 - Funcionalidade crítica ausente] O código de recusa teve de ser NOVO — reusar o vocabulário do 49-08 recriaria a mentira que o 49-08 removeu**

- **Found during:** desenho do GREEN, depois de rastrear o front até `AsyncState:176`.
- **Issue:** o `<action>` manda «usar o vocabulário das recusas que o 49-08 estabeleceu, para a tela
  não precisar de caso novo». Medido, os cinco códigos existentes dizem coisas falsas sobre um
  bloqueio pré-provedor: `SEM_ANALISE` afirmaria que falta análise (não falta — ela foi lida e
  enviada), `VALIDATION` culparia a seleção do RH (que estava correta), `MIXED_VAGA` falaria de
  vagas diferentes, `FORBIDDEN` de acesso negado, `SERVER_ERROR` de falha do servidor (quando um
  controle de gasto FUNCIONOU). Seguir a instrução ao pé da letra teria reintroduzido exatamente o
  defeito que o 49-08 existe para ter removido: uma causa vestindo a mensagem de outra.
- **Fix:** código novo `SEM_RESULTADO_IA`, na FORMA pt-BR do vocabulário existente (o irmão de
  `SEM_ANALISE`), com o `motivo` no corpo como diagnóstico. A tela **continua sem precisar de caso
  novo** — ela degrada para a cópia genérica, que é a degradação já projetada para código
  desconhecido. Que essa cópia genérica também não seja verdadeira é um defeito do front, separado e
  registrado em **WINDOWS 78**.
- **Files modified:** `supabase/functions/comparativo-candidatos/index.ts`
- **Verification:** 3 testes novos asserem o código e o motivo; M4 ⇒ 2.
- **Commit:** `107a0571`

**2. [Rule 3 - Blocker instrumental] O caminho do teto de custo era INALCANÇÁVEL no teste**

- **Found during:** escrita do RED.
- **Issue:** `isDailyCostCapExceeded` faz `.select("cost_usd").eq(…).gte(…)`; o mock de
  `supabaseAdmin` não oferecia `.gte`, a chamada lançava, e o `catch` **fail-open** devolvia `false`.
  O teto NUNCA estourava. É por isso que o defeito viveu com 18 testes verdes em volta — o cenário
  não era só não-testado, era **inexprimível**. Sem esse parâmetro não haveria RED nenhum.
- **Fix:** parâmetro `custoDiarioUsd` (novo, último, default **0**) e um ramo de mock para
  `ai_call_logs` que serve a soma do dia e recebe o `insert` do `logAiCall`. Aditivo: os 18 testes
  anteriores seguem idênticos, sem uma edição.
- **Files modified:** `supabase/functions/comparativo-candidatos/__tests__/index.test.ts`
- **Verification:** o RED assere `anthropic.calls.length === 0` — prova de que o corte foi anterior
  ao provedor e não uma falha do mock.
- **Commit:** `107a0571`

**3. [Rule 1 - Bug, no meu próprio instrumento] O harness de mutação nasceu com o defeito do §L**

- **Found during:** primeira rodada de mutações.
- **Issue:** a captura do exit code lia `$?` **depois de um pipe para `sed`** — ou seja o status do
  `sed`, não o do `deno`. As cinco rodadas imprimiram `exit=0` para execuções que reprovaram. Desta
  vez a contagem de reprovados estava correta (o `grep` achava a linha de resumo), então a conclusão
  não mudou; mas metade do instrumento estava mentindo, e é a metade que o §L existe para exigir.
- **Fix:** saída para arquivo temporário, `code=$?` imediatamente depois do `deno`, ANSI descontado
  na leitura. Re-medido: cinco mutações, `exit=1` em todas, e um **controle** sem mutação com
  `exit=0` — porque um harness que só vê falhas também é um harness quebrado.
- **Verification:** M1..M5 re-executadas do zero; contagens idênticas à primeira rodada, agora com
  exit code verdadeiro.
- **Nota:** o §L descreve esta causa exata. Ela foi lida antes de eu escrever o harness e reproduzida
  mesmo assim — o padrão é para ser aplicado na CONSTRUÇÃO, não como diagnóstico posterior.

---

**Total deviations:** 3 (1 × Rule 2, 1 × Rule 3, 1 × Rule 1).
**Impact:** nenhum negativo. A **1** é a mais importante e confirma o aviso do `<plan_provenance>`:
pela quarta vez na fase, seguir ao pé da letra o `<action>` de um plano escrito mid-fase sem
plan-checker teria criado um defeito novo — aqui, uma mensagem de recusa falsa, que é precisamente a
classe de defeito que o plano irmão (49-08) existiu para remover.

## Deferred (registrado, não consertado)

| Item | Por quê fica fora | Onde |
|---|---|---|
| **Nenhuma tela traduz `SEM_RESULTADO_IA`** — a cópia em tela cai no genérico «Verifique a conexão», falso para um corte de gasto | D-55 (a EF vai primeiro) + fora do `files_modified` deste plano | **WINDOWS 78** |
| As cópias de `ENCERRADA`/`SEM_ANALISE`/`VALIDATION`/`FORBIDDEN` chegam ao RH **só pelo toast**; a tela mostra «Verifique a conexão» nos quatro | pré-existente ao 49-27, mesmo arquivo e mesmo conserto do item acima | idem (WINDOWS 78 descreve o mecanismo) |
| `ComparativoScreen` não passa `isEmpty` ao `AsyncState` — um ranking vazio renderiza a moldura completa | pré-existente; só foi VISÍVEL porque o defeito produzia esse estado, e o conserto da EF o torna inalcançável por esta causa | §«o defeito, medido» |
| `provedorDeResultado` em SEIS cópias (esta EF tem uma inline) | normalizador contra a allowlist do CHECK, NÃO o predicado deste plano — fundi-los seria errado (49-26) | **WINDOWS 70** |
| Linhas já persistidas com o artefato | D-30 — e a contagem medida é **0** | §medição 2 |

**WINDOWS 68 marcado `fixed`**, com o motivo escrito à mão nos dois lugares (a ferramenta aceita o
motivo e o descarta — WINDOWS 69); `windows status --raw` responde `ok: true`, ou seja tabela e JSON
concordam. **Uma entrada nova (78).**

## Known Stubs

**Nenhum.** Varridos os 2 arquivos tocados por
`TODO|FIXME|placeholder|coming soon|not available|não disponível|= \[\]|= \{\}|=""`.

⚠ **Uma coisa que NÃO é stub mas parece:** o fallback `result.error_code ?? "sem_provedor"`. Hoje
inalcançável — os dois caminhos de bloqueio de `callAi` sempre carimbam um código —, e mantido
porque «ninguém respondeu e não sabemos por quê» é uma verdade registrável, enquanto uma linha sem
motivo ou com motivo inventado não é. Declarado em vez de escondido; é o único ramo não exercitado
por teste neste conserto, e por isso nenhuma mutação sai `0`.

**Varredura de FORMA nos smokes (CLAUDE.md §Portões):** **sem alvo** — 0 arquivos `.sql` tocados por
este plano. Declarado em vez de omitido.

## Threat Flags

Nenhuma superfície nova: nenhum endpoint, nenhum caminho de auth, nenhuma mudança de esquema,
nenhuma migration, nenhuma tabela, nenhuma coluna, nenhum pacote.

| Threat | Disposição | Prova |
|---|---|---|
| T-49-27-01 (artefato entregue ao RH como resultado de IA) | mitigate | guarda estrutural de `_shared` antes do sucesso; 2 testes novos; M1 ⇒ 2, M2 ⇒ 2, **M5 (a forma proibida) ⇒ 1**; marcadores no bundle publicado |
| T-49-27-02 (bloqueio não auditado) | mitigate | linha preservada com marcador explícito, forma medida contra o schema vivo; erro do INSERT checado também no caminho do bloqueio (teste próprio); M3 ⇒ 2, M4 ⇒ 2 |
| T-49-27-SC (supply chain) | mitigate | **zero** instalação de pacote; o único import novo é um arquivo local de `_shared` com zero imports ele mesmo |

`verify_jwt=true` **preservado e relido de PROD**. A posse por candidatura (JORN-32), a recusa de
encerrada e o 403 genérico sem oráculo de existência do 49-08 seguem asseridos pelos seus 18 testes.
RNF-07a intacta: esta EF não escreve `candidaturas`, e um corte por gasto agora **recusa** em vez de
entregar um «segurar» que ninguém calculou — o oposto de decidir por score. O termo do LGPD-04 não
aparece em nenhum dos dois arquivos (0 ocorrências).

## Issues Encountered

- **`tsc` em 89 contra teto 90 (D-53): margem de UM.** Nenhum erro acrescentado (os 2 arquivos são
  Deno/EF, fora do `include` do `tsconfig.json`) e o **conjunto de mensagens é idêntico** ao
  baseline — conferido por `diff` sobre as 89 linhas ordenadas, antes e depois. O hook imprimiu
  `tsc errors: 89 (frozen baseline: 96)`.
- **`resend-webhook.test.ts`** (`npm:svix@1.99.1`) e **`_shared/__tests__/strict-schema.test.ts:88`**
  (TS7053) seguem pré-existentes e fora de escopo. Excluídos das rodadas e **nomeados**, em vez de
  «consertados». É por isso que o baseline comparável é **725 → 728** sobre os MESMOS 45 arquivos.
- **`deno test` não emite os contadores que `check tdd-red-evidence` lê.** O RED foi **medido**
  (19 passed | 1+1 failed, as falhas por **asserção**, com o diff `-true / +false` e o rastro
  `provider: "none"` no log) e nenhuma linha de contador foi sintetizada.
- **O terceiro teste novo já passava no RED** — o do INSERT que falha ⇒ 500. É honesto dizer: ele
  não é um RED, é um **portão de regressão** sobre o erro checado do 49-08, que precisava passar a
  valer também para o caminho do bloqueio. Vermelho falso teria sido pior que nenhum.
- **O meu harness de mutação leu o exit code do `sed`.** Ver Deviation 3. Pego porque o §L manda
  conferir o exit code do runner, e `exit=0` ao lado de `reprovados=2` é uma contradição interna que
  não sobrevive a uma segunda leitura.
- **O defeito é LATENTE.** Zero linhas em PROD no estado defeituoso, zero bloqueios em
  `ai_call_logs` desde sempre, 161× de folga no teto. Isto é prevenção e registro, não remediação — e
  a primeira observação real depende de o teto ser baixado ou do volume subir duas ordens de grandeza.

## Next

- **49-22 / 49-16 (a tela):** **WINDOWS 78.** A EF declara `SEM_RESULTADO_IA` + `motivo`, e o código
  já atravessa `triagemService` até `details.error_code`. Falta uma entrada em
  `RECUSA_COMPARATIVO_COPY` (para o toast) e um ramo de cópia no `ComparativoScreen`/`AsyncState`
  (para a tela). Enquanto não houver, o RH lê «Verifique a conexão» para um corte de gasto.
- **49-18 (prova em PROD):** um invariante novo, por FORMA e não por contagem — nenhuma linha de
  `comparativo_solicitado` pode ter `ranking` contendo `recommendation` do tipo **string** (o
  artefato). Hoje é 0. O par natural: toda linha com `ranking ? 'bloqueado'` tem de ter
  `provedor_ia IS NULL` e `modelo_ia IS NULL`. ⚠ **Não** escrever o portão como «`recommendation`
  presente», que casa 100% das linhas legítimas.
- **49-12 (retroativos):** **nada a fazer.** A contagem medida com o detector correto é 0.
- **A família está fechada.** Seis sítios medidos na fase, seis consertados (60, 64, 65 e 68 por
  planos desta fase; os outros dois já cobertos por construção). O que sobra da varredura é o
  normalizador duplicado (WINDOWS 70), que é outra pergunta.

## Self-Check: PASSED

- `supabase/functions/comparativo-candidatos/index.ts` — FOUND
- `supabase/functions/comparativo-candidatos/__tests__/index.test.ts` — FOUND
- commit `107a0571` — FOUND em `git log --all` e já em `origin/main`
- `commits: 1` **MEDIDO** por `git rev-list --count 592a1eda..HEAD`, não narrado; `plan_head_before`
  registrado; `tokens` = octetos de diff ÷ 4, com o erro de 3,6× escrito em vez de suavizado
- nenhuma deleção de arquivo no intervalo (`git diff --diff-filter=D` vazio); nenhum arquivo
  untracked; `git status --short` limpo além do `WINDOWS.md` que vai no commit de metadado
- `<precondition>` verificada **antes** de qualquer escrita: `resultado-de-provedor.ts` no disco com
  os 4 testes verdes, e a EF relida da Management API em **v28** ACTIVE
- os **três** itens do `<measure_first>` medidos e reportados, com **um detector do plano refutado**
  (o de `recommendation`) e **uma instrução do plano medida como impossível de cumprir com verdade**
  (o vocabulário de recusa) — nenhum ajustado para caber
- `<acceptance_criteria>` re-executados: recusa com motivo / linha de auditoria na forma que o schema
  vivo permite, justificada acima / predicado da fonte única, zero cópia nova / os 18 testes do 49-08
  verdes sem uma asserção editada / EF relida de PROD em v29 / `origin/main..HEAD` vazio
- **5 mutações** com `git diff --quiet` de entrada, md5 provando alteração, restauração verificada em
  cada e um **controle**; todas mordem, nenhuma declarada aprovada
- PATTERNS §J respeitado: `--dry-run` antes do deploy, fechamento conferido à mão contra a baseline,
  carona conferida com o instante REAL do deploy anterior, versão/status/`verify_jwt`/`import_map`
  relidos, marcadores conferidos no **bundle publicado**, `npm run lint` ≤ 90, push antes do deploy
- PATTERNS §K: **não violado** — a forma proibida em 0 no disco e 0 no bundle publicado
- PATTERNS §L: aplicado **contra o meu próprio harness**, que tinha o defeito descrito (Deviation 3)
- PATTERNS §M: **WINDOWS 68 `fixed`** com o motivo escrito no bloco JSON e a célula da tabela
  sincronizada **lendo o texto de volta do JSON**; `windows status --raw` → `ok: true`. Entrada nova
  **78** para a metade «cliente»
- varredura de FORMA nos smokes: **sem alvo** (0 arquivos `.sql`), declarado em vez de omitido

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*
