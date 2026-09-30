---
phase: 49-consertos-da-jornada-bloco-2
plan: "32"
subsystem: ai
tags: [edge-functions, deno, ai-client, ai_call_logs, idempotency, fallback, openai, audit, cr-02, jorn-28, d-27c, d-38, ia-02, mutation-testing]
status: complete

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "fallback com causa nominal (`fallback_*`), tentativa Anthropic em linha própria com chave nula (Pitfall 1), guarda `ehFallback` no replay e `log_id` no retorno (D-38)"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "bloqueios `none` com chave nula (JORN-39) e o mock `makeMockSupabaseBloqueio` que impõe a UNIQUE — estendido aqui"
provides:
  - "runOpenAIFallback sem campo de chave nos argumentos (FallbackArgs) e nas duas chamadas; linha do resultado com `idempotency_key: null`"
  - "comentário `Phase 49 / 49-32 · CR-02` em ai-client.ts (marcador de bundle que o 49-34 procura)"
  - "teste «CR-02 — fallback seguido de retry…» e teste tabelado «invariante da chave» (contagem de `await logAiCall(` lida do fonte na execução)"
  - "makeMockSupabaseBloqueio modela o Postgres: id por linha, ON CONFLICT DO UPDATE conservando o id, 23505, replay e teto de custo sobre as mesmas linhas"
affects: [49-33, 49-34, 49-VERIFICATION re-verificação do JORN-28]

actuals:
  tokens: 6268
  tasks: 2
  commits: 2
  plan_head_before: b5b522e2df5bdd7ec457bbc81978e74e1da329f4
  plan_head_after: 9cc339ba1ba59f60b21fdc0aafcacb6540250668

tech-stack:
  added: []
  patterns:
    - "Garantia por construção: o fallback não RECEBE a chave — nenhum caminho dele consegue gravá-la sem mudar a assinatura"
    - "Invariante varrido pela forma: cada linha gravada é classificada pelo formato na chamada `logAiCall` que a gravou, e o número de classes é comparado à contagem de chamadas lida do fonte (não constante)"
    - "Mock fiel à semântica do ON CONFLICT (id antigo conservado) — sem isso o CR-02 não reprova pelo motivo certo"

key-files:
  created: []
  modified:
    - supabase/functions/_shared/ai-client.ts
    - supabase/functions/_shared/__tests__/ai-client.test.ts

key-decisions:
  - "CR-02 / promote: só a resposta primária cacheável é dona da `idempotency_key`; o fallback vira EVENTO de auditoria (chave nula, insert simples), como tentativas e bloqueios `none` já eram. Rejeitado add-alongside (coluna nova) — exigiria migration para um problema que nenhum leitor tem"
  - "WR-01 NÃO aplicado: a guarda do replay continua reconhecendo fallback pelo prefixo `fallback_`, não pelo provedor — 3 linhas legadas `interview_guide` (06/09, provider=openai) ainda possuem chave e tirá-las do replay sem liberar a chave as exporia ao sobrescrito que este plano fecha"

requirements-completed: []

duration: ~6min
completed: 2026-09-29
---

# Phase 49 Plan 32: CR-02 — a linha de um fallback sobrevive ao retry Summary

**O fallback OpenAI deixou de receber a `idempotency_key` e grava a linha do resultado com chave nula. Assim o sucesso de um retry com a mesma chave vira uma linha nova e não sobrescreve mais o provedor, o custo, a causa `fallback_*` nem o ponteiro D-38 do fallback. Um teste tabelado garante que só o sucesso primário é dono da chave, em cada chamada `await logAiCall(` lida do fonte.**

## Performance

- **Duração:** ~6 min (medida)
- **Concluído:** 2026-09-29
- **Tarefas:** 2/2
- **Arquivos modificados:** 2

## Accomplishments

- `runOpenAIFallback`: o campo `idempotency_key` saiu de `FallbackArgs` e das duas chamadas (disjuntor aberto e fim do loop). A linha do resultado grava `idempotency_key: null`, com o comentário `Phase 49 / 49-32 · CR-02`. `grep -c -F 'a.idempotency_key' ai-client.ts` = **0**.
- A guarda `ehFallback` do replay ganhou comentário: fallbacks novos já não possuem chave, e ela fica como defesa para linhas gravadas entre o 49-02 e este conserto (0 medidas em 2026-09-29). **Sem** a condição por provedor do WR-01.
- Teste CR-02 (fallback, depois retry com sucesso e a mesma chave = duas linhas com ids distintos). O teste JORN-28/A foi invertido.
- Invariante da chave tabelado sobre 7 caminhos × 7 chamadas, com a contagem lida do fonte. Duas mutações provam que ele morde.

## Task Commits

1. **Task 1 (tracer): fallback + retry = duas linhas; o fallback não recebe a chave**: `5d6c08e8` (fix). RED e GREEN no mesmo commit (ver TDD abaixo).
2. **Task 2: invariante da chave varrido pela forma**: `9cc339ba` (test)

## TDD: RED → GREEN (Task 1)

**RED** (código de antes, só com o teste novo e o mock estendido): `FAILED | 48 passed | 1 failed`.

```
CR-02 — fallback seguido de retry bem-sucedido com a MESMA chave deixa DUAS linhas com ids distintos ... FAILED
error: AssertionError: Values are not equal: CR-02: o retry reescreveu a linha do fallback no lugar
(linha-2 agora diz provider=anthropic, error_code=null) — o ai_call_log_id de uma análise antiga
passaria a descrever outra chamada
```

O RED é válido: o módulo carregou e os 48 testes anteriores passaram, inclusive os dois JORN-39 que já usavam o mock estendido. A falha é a do CR-02: a linha `linha-2`, devolvida como `log_id` do fallback, foi reescrita no lugar pelo upsert do sucesso, com o id conservado.

**GREEN:** `ok | 49 passed | 0 failed` (com o JORN-28/A invertido). **Tracer gate** (interativo, `end-of-phase`, verify só automatizado): o verify foi reexecutado sobre a árvore commitada e passou; seguimos para a Task 2.

Asserções ajustadas no arquivo (`grep -n idempotency_key …test.ts`):
- **JORN-28/A (antigo `:1078`)**: `assert(resultado.row.idempotency_key != null, "a linha do RESULTADO leva a chave efetiva")` virou `assertEquals(…, null)` + `assertEquals(resultado.via, "insert")`. A asserção antiga congelava o defeito.
- Nenhum outro teste dependia da chave no fallback. A linha `:1295` confere chave nula na TENTATIVA e não mudou. Fora do `_shared`, só `avaliar-redacao-cultural/index.test.ts` menciona `idempotency_key`, e sem relação com o fallback (a suíte dele passa).

## Invariante (Task 2): chamada → caminho → chave esperada

`grep -n "await logAiCall(" supabase/functions/_shared/ai-client.ts` depois do conserto (os números mudaram com os comentários novos):

| Chamada | Linha | Classe (`classeDaLinha`) | Caminho(s) que a exercitam | Chave esperada |
|---|---|---|---|---|
| teto de custo | `:687` | `bloqueio_teto_de_custo` | teto de custo | nula |
| injeção | `:740` | `bloqueio_injecao` | injeção | nula |
| tentativa com causa determinística | `:882` | `tentativa_causa_deterministica` | truncamento + fallback; fallback que também falha | nula |
| sucesso primário Anthropic | `:912` | `sucesso_primario` | sucesso Anthropic | **chave efetiva** |
| tentativa do caminho de exceção | `:973` | `tentativa_excecao` | exceção esgotada (timeout) + fallback | nula |
| falha do fallback OpenAI | `:1086` | `fallback_falha` | fallback que também falha | nula |
| resultado do fallback | `:1120` | `fallback_resultado` | truncamento + fallback; exceção + fallback; disjuntor aberto | nula (**era a chave, CR-02**) |

Menções sem `await` (`grep -n 'logAiCall(' … | grep -v 'await logAiCall('`), só os dois comentários:
```
29: *   8. logAiCall(...) (mask aplicado ao template armazenado)
227:    // injetado em `deps.supabase` precisa expor `upsert` p/ o `logAiCall(supabase, ...)`
```
Chamadores fora do `ai-client.ts` (`grep -rn "logAiCall(" supabase/functions | grep -v __tests__ | grep -v _shared/ai-client.ts`): só o docblock `audit-logger.ts:20` e a definição `audit-logger.ts:184`.

O teste compara `exercitadas.size` (classes vistas nas linhas gravadas) com `fonte.match(/await logAiCall\(/g).length`, lido com `Deno.readTextFile` na execução. Cada caminho também confere a sequência exata de classes que grava.

### Mutações (commitadas antes; guarda `git diff --quiet -- supabase/functions/_shared/`)

- **M1: a chave volta ao fallback** (`git show 5d6c08e8~1:…/ai-client.ts` sobre o arquivo, 1 ocorrência de `idempotency_key: a.idempotency_key`): `FAILED | 47 passed | 3 failed`.
  ```
  JORN-28/A … FAILED  — CR-02: a linha do RESULTADO do fallback NÃO leva a chave — só o sucesso primário é dono dela
  CR-02 — fallback seguido de retry … FAILED  — (linha-2 agora diz provider=anthropic, error_code=null)
  CR-02 — invariante da chave … FAILED  — caminho «causa determinística (truncamento) + fallback», linha
    fallback_resultado: gravou a chave cand:invariante:01016fd222bd685b — um upsert posterior pela mesma chave apagaria esta linha
  ```
  Restaurado com `git checkout -- supabase/functions/_shared/ai-client.ts`. `git diff --quiet -- supabase/functions/_shared/` deu limpo.
- **M2: uma 8ª chamada `await logAiCall(` sem caminho** (função acrescentada ao fim do arquivo): `FAILED | 0 passed | 1 failed | 49 filtered out`.
  ```
  o ai-client.ts tem 8 chamadas `await logAiCall(` e este invariante exercita 7 (sucesso_primario, tentativa_causa_deterministica,
  fallback_resultado, tentativa_excecao, bloqueio_teto_de_custo, bloqueio_injecao, fallback_falha): há caminho novo de gravação
  sem classificação em `classeDaLinha` nem caminho em `CAMINHOS_DA_CHAVE`
  ```
  Restaurado, e o `shasum` confere byte a byte com o de antes da mutação.

### Suíte das 7 EFs de IA + `_shared`

`deno test --allow-all $(find supabase/functions/_shared/__tests__ -name '*.test.ts' | grep -v strict-schema)` + os diretórios `analise-candidato-individual`, `avaliar-redacao`, `avaliar-redacao-cultural`, `avaliar-transcricao-entrevista`, `comparativo-candidatos`, `gerar-devolutiva-bigfive` e `gerar-guia-entrevista` → **`ok | 408 passed | 0 failed`** (exit 0). Nenhum teste de EF dependia da chave no fallback. O `strict-schema.test.ts` ficou excluído, como no 49-11 (falha de type-check pré-existente). Nenhum deploy foi feito: é tarefa do 49-34.

### JORN-28 não afirma Complete

- Precondição da Task 1: a célula da tabela era `| JORN-28 | Phase 49 | Gaps Found — CR-02 em conserto (49-32 disco, 49-34 7 EFs); aguarda re-verificação |` (linha 408) e a caixa era `- [ ] **JORN-28**` (linha 276).
- Simulação em cópia descartável (verify 3 da Task 2): com a célula anotada, o `mark-complete JORN-28` devolveu `"updated": false`, `"not_found": ["JORN-28"]`, `"total": 1`, e a cópia não virou. Na mordida, com a célula restaurada para `Gaps Found` exato, a mesma simulação virou a caixa para `[x]`. Saída: `JORN-28 resiste ao mark-complete; a simulação morde`.
- `mark-complete JORN-28` real, rodado no arquivo do repositório: `"updated": false`. Depois dele, `grep -cE '^- \[x\] \*\*JORN-28\*\*' .planning/REQUIREMENTS.md` = **0**, e a célula continua começando por «Gaps Found — ». Este plano não escreveu o `REQUIREMENTS.md`.

## Decisions Made

- **Promote:** o fallback deixa de disputar a chave. As alternativas rejeitadas estão em `key-decisions`.
- **WR-01 fica fora** (T-49-32-03, aceito). Medido pelo planejador em 2026-09-29: 3 linhas legadas `interview_guide` com chave, `provider='openai'`, `success=true` e sem prefixo `fallback_`. Aplicar o WR-01 exige antes liberar a chave dessas linhas.
- O caminho «exceção esgotada» do invariante usa `timeoutMs: 60_000` + `totalBudgetMs: 60_000`. Pelo AI-04 isso dá 1 tentativa: o caminho esgota por timeout de verdade, sem os ~6 s de backoff real.

## Deviations from Plan

Nenhuma. O plano foi executado como escrito. Observações de execução (nenhuma muda o escopo):
- O mock de `:1539` foi estendido no lugar, como pedido, e não virou um terceiro mock. Os dois testes JORN-39 que o usam passaram sem edição.
- Uma segunda mutação (M2, 8ª chamada) foi acrescentada à pedida (M1). Ela prova que a comparação com a contagem lida do fonte também morde.

## Issues Encountered

Nenhum. O `.husky/pre-commit` passou nos dois commits (`tsc errors: 89 (frozen baseline: 96)`), porque os arquivos deste plano ficam fora do `tsc`.

## Known Stubs

Nenhum.

## Next Phase Readiness

- **49-33** (`depends_on` este plano) já pode começar. A árvore de `_shared` está limpa, sem mutação residual.
- **49-34:** vai deployar as 7 EFs e procurar o marcador `Phase 49 / 49-32` no bundle publicado. Depois do deploy, precisa reconferir a contagem de linhas `fallback_*` com chave em PROD (era 0 em 2026-09-29) e confirmar que linhas novas de fallback nascem com chave nula.
- A re-verificação do JORN-28 continua pendente: a célula só deve virar depois do 49-34 e da re-verificação.

## Self-Check: PASSED

- FOUND: supabase/functions/_shared/ai-client.ts (marcador `Phase 49 / 49-32` presente; `a.idempotency_key` = 0)
- FOUND: supabase/functions/_shared/__tests__/ai-client.test.ts (contém `CR-02` e `invariante da chave`)
- FOUND: commit 5d6c08e8
- FOUND: commit 9cc339ba
