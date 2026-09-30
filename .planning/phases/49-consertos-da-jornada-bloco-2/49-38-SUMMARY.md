---
phase: 49-consertos-da-jornada-bloco-2
plan: "38"
subsystem: api
tags: [jorn-41, prompt-injection, injection-flag, sinal-revisao, callAi, ai_call_logs, pg_cron, ai-cost-aggregation, mutacao, cr-02, deno]
status: complete

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "37"
    provides: "classifyPromptInjection (block/flag/none) e detectPromptInjection como projeção do bloqueio"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "32"
    provides: "a invariante da chave (CR-02) varrida pela forma e o mock que modela ON CONFLICT DO UPDATE"
provides:
  - "_shared/sinal-revisao.ts (zero imports): SINAL_INSTRUCAO_AO_MODELO, ROTULO_SINAL, rotuloDoSinal, sinaisDe, comSinal + a tabela das formas persistidas"
  - "AI_ERROR_CODE.prompt_injection_flagged + rótulo pt-BR em CAUSA_FALLBACK_ROTULO"
  - "callAi: caminho flag (linha-evento none com chave nula, a chamada SEGUE) e CallAiResult.injection_flag obrigatório"
  - "invariante CR-02 com a classe sinal_injecao e o caminho «injeção sinalizada»"
  - "migration 20260930000001 (NÃO aplicada): cron ai-cost-aggregation sem a classe de evento do sinal, com portão de baseline e mordida"
affects: [49-39 EFs gravam o sinal, 49-40, 49-41 telas do RH, 49-42 tela do admin (estado/filtro «Sinal»), 49-43 apply + deploy + checkpoint do operador, JORN-41]

actuals:
  tokens: 11103
  tasks: 3
  commits: 4
  plan_head_before: c8de7f26e96b0404c7f6888041b89ac925c4ca96
  plan_head_after: 5f483acfde0df5d2eb3a4f6fc9c97bc370022c6d

tech-stack:
  added: []
  patterns:
    - "Sinal de revisão como campo PRÓPRIO do retorno (injection_flag), nunca reuso de flagged_for_human_review, que três EFs leem como «sem resultado»"
    - "Linha-evento de auditoria sem provedor (provider='none', chave nula) também para eventos que NÃO bloqueiam"
    - "Classificação pura calculada uma vez no topo, antes do replay, para o replay devolver a mesma marca"
    - "Migration de cron com portão comportamental: roda o comando ANTIGO e o NOVO sobre linhas sintéticas em tabelas temporárias, baseline e mordida na mesma execução"
    - "Ensaio em PROD desfeito pelo ARNÊS (exceção final dele, depois do corpo da migration), não por GUC da própria migration"

key-files:
  created:
    - supabase/functions/_shared/sinal-revisao.ts
    - supabase/functions/_shared/__tests__/sinal-revisao.test.ts
    - supabase/migrations/20260930000001_p49_38_agregacao_sem_evento_de_sinal.sql
  modified:
    - supabase/functions/_shared/ai-client.ts
    - supabase/functions/_shared/ai-error-codes.ts
    - supabase/functions/_shared/__tests__/ai-client.test.ts

key-decisions:
  - "A classificação de sinal_injecao na invariante e o caminho «injeção sinalizada» entraram no commit GREEN da Task 1, e não na Task 2: o verify da Task 1 roda o ai-client.test.ts inteiro e o portão do tracer exige verde antes da expansão. O vermelho intermediário (8 chamadas no fonte × 7 classes) foi medido ANTES da classificação e está registrado abaixo"
  - "O portão de «edição desconhecida» compara o comando vivo com o de 20260609000003 REMOVENDO todo espaço em branco, e não colapsando: o comando vivo é uma versão compactada (success=false, COALESCE(SUM(...),0)), de origem fora do repositório, token-idêntica. Colapsar espaços reprovaria o comando correto"
  - "O comando novo é o texto de 20260609000003 + a linha da exclusão (como o plano pede), e não a versão compactada viva + a linha. Depois do apply, o md5 muda de fdd283dc… para 74983c22… (medido no ensaio)"
  - "Nenhum pacote instalado; nenhuma escrita persistida em PROD; nenhum deploy; nenhum push"
  - "requirements-completed fica []: JORN-41 não é marcado neste plano (instrução do orquestrador; restam 49-39..49-43)"

requirements-completed: []

coverage:
  - id: D1
    description: "Entrada flag chega ao modelo, grava a linha-evento none (prompt_injection_flagged, chave nula, raw_response.sinal) e volta com injection_flag, sem flagged_for_human_review; block segue igual; none sem evento"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "deno test --allow-all supabase/functions/_shared/__tests__/ai-client.test.ts supabase/functions/_shared/__tests__/sinal-revisao.test.ts supabase/functions/_shared/__tests__/injection-detector.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "injection_flag no sucesso Anthropic, no fallback e no replay; replay sem linha nova; invariante da chave com a classe sinal_injecao; A1..A6 mordem"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "supabase/functions/_shared/__tests__/ai-client.test.ts#JORN-41/replay e #CR-02 — invariante da chave"
        status: pass
      - kind: other
        ref: "arnês mut38.cjs (scratchpad): A1..A6 exit 1 com teste nomeado; sha restaurado; «arnes restaurou»"
        status: pass
    human_judgment: false
  - id: D3
    description: "Regressão: _shared (sem strict-schema) + as 7 EFs de IA"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "deno test --allow-all _shared/__tests__ (sem strict-schema) + 7 diretórios de EF → ok | 650 passed | 0 failed"
        status: pass
    human_judgment: false
  - id: D4
    description: "Migration do cron: ensaio em PROD desfeito termina em P49-38 ENSAIO OK com antigo none 2/2 × novo none 1/1 e anthropic 2/1; a cópia sem a exclusão termina em P49-38 PORTAO; job vivo intacto; ledger sem 20260930000001"
    requirement: JORN-41
    verification:
      - kind: integration
        ref: "verify 1 da Task 3 → «portao passa e morde»; verify 2 → «ensaio desfeito: job vivo sem a exclusao, horario e active intactos»"
        status: pass
    human_judgment: false
  - id: D5
    description: "Varredura D-50 dos consumidores de ai_call_logs e o achado dos eventos de BLOQUEIO contados como erro"
    requirement: JORN-41
    verification: []
    human_judgment: true
    rationale: "A classificação de cada consumidor é leitura; o achado dos bloqueios é decisão do operador, levada ao checkpoint da Task 1 do 49-43"

duration: 16min
completed: 2026-09-30
---

# Phase 49 Plan 38: O sinal (`flag`) do detector chega ao resultado sem virar bloqueio Summary

**Com uma entrada `flag`, o `callAi` grava uma linha-evento `provider='none'` com `prompt_injection_flagged` e chave nula, chama o modelo e devolve `injection_flag: { pattern }`. O campo sai no sucesso, no fallback e no replay, e fica nulo em bloqueio e em entrada `none`. O vocabulário do sinal está em `_shared/sinal-revisao.ts`, arquivo sem imports que o front também usa. As seis mutações A1..A6 mordem. A migration do cron `ai-cost-aggregation` tira a linha-evento da contagem de chamadas e erros. Ela foi ensaiada em PROD, desfeita, e fica para o 49-43 aplicar.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-09-30T06:27:30Z
- **Completed:** 2026-09-30T06:43:08Z
- **Tasks:** 3 de 3
- **Files modified:** 6 (3 criados, 3 editados)

## Accomplishments

- `callAi` agora separa o que recusa do que sinaliza. O `block` segue igual: nenhuma chamada de API, a linha `none` com `prompt_injection_detected` e o stub `hold`. O `flag` deixa rastro e segue para o disjuntor, a Anthropic e o fallback. A ordem replay → teto de custo → bloqueio → provedor não mudou.
- `CallAiResult.injection_flag` é obrigatório (precedente 49-16). Os cinco construtores o declaram: replay, teto de custo, bloqueio, sucesso Anthropic e fallback (este via `FallbackArgs.injection_flag`). Nenhum caminho novo toca em `flagged_for_human_review`.
- `sinal-revisao.ts` tem a tabela das formas persistidas por tabela, que os 49-39/49-40 cumprem e os 49-41/49-42 leem. O docblock explica por que o sinal não usa `flagged_for_human_review`.
- A invariante da chave (CR-02) exercita a chamada nova de `logAiCall`. Só o sucesso primário é dono da chave.
- A migration `20260930000001` foi escrita e ensaiada. O portão dela mede a própria mordida. Nada persistiu em PROD.

## Task Commits

1. **Task 1 (tracer, TDD):**
   - `bbd63e27`: test(49-38), RED.
   - `8df8ff44`: feat(49-38), GREEN. Traz também a classificação da invariante (ver Desvios).
   - Portão do tracer: modo interativo, `end-of-phase`, verify só com `<automated>`. O verify foi rodado de novo e passou (`ok | 306 passed | 0 failed`). ⚡ Tracer verificado de ponta a ponta, e a expansão seguiu.
2. **Task 2 (TDD):** `2c911d94`, test(49-38): o teste do replay, que já passa com o código da Task 1. A mordida dele é provada pela A3. Também inclui o arnês A1..A6 e a regressão.
3. **Task 3:** `5f483acf`, feat(49-38): a migration, NÃO aplicada.

## RED da Task 1 (saída real, antes do `feat`)

Comando: `NO_COLOR=1 deno test --allow-all --reporter=tap ai-client.test.ts sinal-revisao.test.ts injection-detector.test.ts`. Resultado: exit 1, **294 ok / 12 not ok**.

| Teste | Por que reprovou (mensagem do Deno) |
|---|---|
| JORN-41/flag — entrada sinalizada CHEGA ao modelo… | `a entrada sinalizada grava a linha-evento do sinal ANTES do resultado do modelo`. O Deno mostrou `Actual [sucesso_primario]` contra `Expected [sinal_injecao, sucesso_primario]` |
| JORN-41/block — entrada de nível block segue exatamente como antes… | `o bloqueio não é sinal: injection_flag nulo`. Veio `undefined`, esperado `null` |
| JORN-41/none — entrada benigna não grava linha-evento… | `injection_flag`: veio `undefined`, esperado `null` |
| JORN-41/flag + fallback — o sinal sobrevive ao fallback… | faltou `sinal_injecao` antes de `[tentativa_causa_deterministica, fallback_resultado]` |
| sinal-revisao (8 testes) | módulo ausente. O zero-imports deu `NotFound: readfile …/sinal-revisao.ts`, e os demais `TypeError: Module not found`. Cada teste reprova nomeado, porque o import é feito dentro do teste |

`check tdd-red-evidence` sobre o registro, com o trailer TAP derivado das linhas ok/not ok, deu **RED_EVIDENCE_OK** (`target_test_failed`). O alvo foi «JORN-41/flag — entrada sinalizada CHEGA ao modelo, deixa a linha-evento e volta com injection_flag», e ele reprovou numa asserção sobre o comportamento. Nota honesta: os 8 testes de `sinal-revisao` reprovam por módulo ausente, que é uma falha de carga, e não por asserção. O RED de comportamento é o do `ai-client`.

### Vermelho intermediário da invariante (antes de classificar `sinal_injecao`)

Com o `ai-client.ts` já gravando a linha-evento, e `classeDaLinha`/`CAMINHOS_DA_CHAVE` ainda sem a classe nova, o resultado foi 303 ok / 3 not ok:

```
CR-02 — invariante da chave … : o ai-client.ts tem 8 chamadas `await logAiCall(` e este invariante
exercita 7 (sucesso_primario, tentativa_causa_deterministica, fallback_resultado, tentativa_excecao,
bloqueio_teto_de_custo, bloqueio_injecao, fallback_falha): há caminho novo de gravação sem
classificação em `classeDaLinha` nem caminho em `CAMINHOS_DA_CHAVE`   [Actual 7 / Expected 8]
```

Os dois testes do flag reprovaram com `DESCONHECIDA(provider=none, success=false, error_code=prompt_injection_flagged)`. Depois de classificar a linha e acrescentar o caminho «injeção sinalizada» (`espera: ['sinal_injecao','sucesso_primario']`), o resultado foi `ok | 306 passed | 0 failed`.

## Mordida por mutação (Task 2)

O arnês `mut38.cjs` fica no scratchpad e não é commitado. Ele segue o idioma do mut33/mut37:
1. lê o `ai-client.ts` em memória (Buffer) e aplica UMA inversão, com âncora única;
2. confere a carga com `deno check`;
3. roda o `ai-client.test.ts` com TAP;
4. restaura byte a byte e confere o sha256 a cada rodada.

Todas as rodadas passaram no `deno check`. `restaurado: true`. Depois do commit, o verify imprimiu «arnes restaurou».

| Mutação | Inversão | Exit | Passa/Reprova | Teste(s) que reprovaram |
|---|---|---|---|---|
| A1 | remover a linha-evento do caminho `flag` | 1 | 51/4 | JORN-41/flag; JORN-41/flag + fallback; JORN-41/replay; CR-02 invariante (`caminho «injeção sinalizada»: … veio ["sucesso_primario"]`) |
| A2 | `injection_flag: null` no sucesso Anthropic | 1 | 53/2 | JORN-41/flag; JORN-41/replay |
| A3 | `injection_flag: null` no retorno do replay | 1 | 54/1 | JORN-41/replay |
| A4 | tratar `flag` como `block` (devolver o stub) | 1 | 51/4 | JORN-41/flag; JORN-41/flag + fallback; JORN-41/replay; CR-02 invariante |
| A5 | `flagged_for_human_review: true` no sucesso sinalizado | 1 | 54/1 | JORN-41/flag (`o sinal NÃO pode usar flagged_for_human_review`) |
| A6 | linha-evento gravada com a chave efetiva | 1 | 52/3 | JORN-41/flag; JORN-41/replay; CR-02 invariante (`caminho «injeção sinalizada»: … veio ["sucesso_primario"]`: o upsert do sucesso reescreveu o evento no lugar) |

**Ressalva medida sobre a A1.** O plano esperava que a A1 reprovasse a invariante pela CONTAGEM (fonte × classes). Não é isso que acontece. Remover a chamada tira a chamada do fonte E a classe exercitada ao mesmo tempo, e a contagem fica 7 = 7. Quem morde a A1 é a asserção por caminho (`espera`), que roda antes. A contagem morde na direção oposta: uma chamada nova sem classificação, que é o vermelho intermediário acima. As duas asserções se complementam, e nenhuma é vácua.

### Regressão

`deno test --allow-all $(find _shared/__tests__ -name '*.test.ts' | grep -v strict-schema)` mais os 7 diretórios de EF deram **`ok | 650 passed | 0 failed`**, exit 0. Nenhum mock de EF precisou mudar: os payloads delas são em inglês (`block`) ou benignos (`none`).

## Varredura D-50 dos consumidores de `ai_call_logs` (Task 3, só leitura)

Padrões, que podem ser rodados de novo:
- `grep -rnE "from\(['\"]ai_call_logs['\"]\)" src supabase/functions`, fora de testes;
- `grep -rn "ai_cost_daily" src supabase/functions`;
- no banco vivo, sempre com `node p46apply.cjs sql "set transaction read only; …"`:
  - `cron.job WHERE command ILIKE '%ai_call_logs%'`;
  - `pg_proc WHERE prosrc ILIKE '%ai_call_logs%'`, com as colunas usa_success/usa_provider/usa_error_code;
  - `pg_views` e `pg_matviews WHERE definition ILIKE '%ai_call_logs%'`;
  - gatilhos não internos em `ai_call_logs` e `ai_cost_daily`.

A leitura do planejador foi conferida, não copiada. Ela se confirmou, com dois consumidores de exibição a mais: `aiLogsService` e `AiLogsPage`.

| Consumidor | Onde | O que lê | Conta a linha-evento do sinal como falha? | Razão |
|---|---|---|---|---|
| cron `ai-cost-aggregation` | `cron.job` jobid 1 | `COUNT(*)`, `SUM(success=false)` por (data, vaga, call_type, provider) | **sim (defeito)**: consertado pela migration `20260930000001` | é o único que agrega |
| `notify_cost_anomaly()` | gatilho `trg_ai_cost_daily_anomaly` em `ai_cost_daily` | `NEW.error_count / NEW.call_count > 0.05` ⇒ `error_rate` | derivado | lê só a linha de `ai_cost_daily` |
| EF `cost-alerter` | chamada pelo gatilho | payload do gatilho | derivado | idem |
| `AiCostsPage` / `aiCostsService` | `src/features/admin/ai-costs` | colunas «Chamadas»/«Erros» de `ai_cost_daily` | derivado | idem |
| `aiLogsService.listAiLogs`, filtro de estado | `src/features/admin/ai-logs/services` | `.eq('success', status === 'sucesso')` | sim, só na EXIBIÇÃO: a linha aparece no filtro «falha» | fica para o 49-42 (estado e filtro «Sinal»). Não é contagem de falha de IA |
| `AiLogsPage.estadoDaChamada` | `src/features/admin/ai-logs/components` | `!success ⇒ 'falha'` | sim, só na EXIBIÇÃO | fica para o 49-42. A causa legível já sai «sinal de instrução à IA — a análise seguiu, marcada para revisão humana» (entrada nova em `CAUSA_FALLBACK_ROTULO`) |
| `getAiLogDetail` | idem | a linha por id | não se aplica | não classifica |
| `tryIdempotencyReplay` | `ai-client.ts` | lookup por `idempotency_key` | não se aplica | a linha-evento tem chave nula |
| `isDailyCostCapExceeded` | `ai-client.ts` | soma `cost_usd` | não se aplica | custo 0 |
| `logAiCall` | `audit-logger.ts` | escreve | não se aplica | é o escritor |
| cron `ai-logs-retention-cleanup` | `cron.job` jobid 4 | `DELETE … retain_until < now()` | não se aplica | não conta nada |
| `anonimizar_candidato`, `plano_exclusao_titular` | `pg_proc` | citam a tabela; medido: não leem `success`/`provider`/`error_code` | não se aplica | exclusão LGPD por titular |
| views / matviews | `pg_views`, `pg_matviews` | nenhuma cita `ai_call_logs` (medido: `[]`) | não se aplica | não há |
| `exportAllowlist` / `reciboExclusao` | `_shared` | classificação de tabela (`telemetria_interna`) | não se aplica | metadado LGPD |
| migrations antigas | `supabase/migrations` | de uma vez só | não se aplica | não rodam de novo |

### ACHADO para o operador (checkpoint da Task 1 do 49-43): registrado, NÃO consertado

Os eventos de BLOQUEIO do JORN-39 (`provider='none'`, `success=false`: `cost_cap_exceeded` e `prompt_injection_detected`) são contados como chamada E erro pelo mesmo cron desde o 49-02. Medido em PROD em 2026-09-30, só leitura:
- `ai_call_logs`: 1 linha `none`, `prompt_injection_detected`, de 2026-09-28;
- `ai_cost_daily`: `2026-09-28 · transcript_analysis · none · call_count 1 · error_count 1`. É uma taxa de erro de 100% no grupo, acima do limiar de 5% do `notify_cost_anomaly`;
- `recruiter_alerts`: 1 linha no total, a última em 2026-08-22. Não houve alerta registrado pelo bloqueio de 28/09. **Por que o alerta não chegou não foi medido**: segredo do Vault ausente, falha do `cost-alerter` ou outra causa.

É outra classe de evento, e a decisão é do operador. A migration deste plano NÃO muda o que os bloqueios contam, e o portão EXIGE que o bloqueio continue contado (`novo none = 1/1`). O achado vai ao operador como item próprio no brief do checkpoint da Task 1 do 49-43, com a tabela acima. Este plano mede e registra. Não decide nem adia em nome dele.

## Migration do cron e ensaio em PROD (Task 3)

**Estado vivo antes, medido só-leitura:** jobid 1, `30 1 * * *`, `active`, username `postgres`, md5 `fdd283dc3e266884761a3649c31acd6c`. O corpo vivo é uma versão COMPACTADA do texto de `20260609000003`, e é token-idêntico a ele: sem espaço em branco, os dois textos são iguais, conferido por script. O papel do apply é `postgres`, o mesmo dono do job. O `pg_cron` está na 1.6.4, e `cron.alter_job(job_id, schedule, command, database, username, active)` existe.

**Verify 1 da Task 3**, o comando do plano sem alteração: imprimiu **«portao passa e morde»**.
- Ensaio (migration + bloco final do arnês):
  ```
  P49-38 ENSAIO OK: antigo.anthropic=2/1 antigo.none=2/2 job.active=true job.horario=30 1 * * * job.jobid=1
  job.md5_antes=fdd283dc3e266884761a3649c31acd6c job.md5_depois=74983c221d1cfcee08de85a68d34f5e9
  novo.anthropic=2/1 novo.none=1/1
  ```
- Cópia sem a linha da exclusão:
  ```
  P49-38 PORTAO: o comando NOVO deu none=2/2 (chamadas/erros), esperado 1/1 — so o bloqueio conta;
  o evento do sinal ainda entra na agregacao
  ```

Mordidas extras, fora do plano, também desfeitas pela exceção:
- **Variante `<>`** no lugar de `IS DISTINCT FROM`: deu `P49-38 PORTAO: o comando NOVO deu anthropic=1/1 …`. O `<>` tiraria da agregação todo sucesso de código nulo, e a linha sintética de sucesso prende isso.
- **Edição desconhecida**, com a referência de `20260609000003` alterada (`COUNT(1)`): deu `P49-38 PORTAO: o comando vivo de ai-cost-aggregation (md5 fdd283dc…) NAO e o de 20260609000003 …`. Isso mitiga o T-49-38-06.

**Verify 2 da Task 3:** «ensaio desfeito: job vivo sem a exclusao, horario e active intactos». Depois de todos os ensaios, o md5 do comando vivo continua `fdd283dc3e266884761a3649c31acd6c`. `cron.job` segue com os mesmos 5 jobs (1, 3, 4, 6, 9). No ledger, `select count(*) from supabase_migrations.schema_migrations where version = '20260930000001'` dá **0**: a migration não está aplicada.

**Para o 49-43:**
- aplicar com `node p46apply.cjs migrate supabase/migrations/20260930000001_p49_38_agregacao_sem_evento_de_sinal.sql`, ANTES do deploy das EFs (D-55);
- registrar a migration como nova dona do comando no `docs/compliance/cron-inventory.md`, com o md5 LIDO de `cron.job` depois do apply. O ensaio mediu `74983c221d1cfcee08de85a68d34f5e9`, mas esse número deve ser relido no apply, não copiado daqui;
- o smoke `p42_invent05_cron_smoke.sql` (d) continua satisfeito: o horário, o `active`, `ai_cost_daily` e `ON CONFLICT` estão no comando novo, e o portão da migration confere horário e `active`;
- o `p46_purga_smoke.sql` (a) só exige que o job exista.

## Decisions Made

Ver `key-decisions` no frontmatter. Nenhuma decisão do operador foi criada ou atribuída neste plano.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] A classificação da invariante foi da Task 2 para o GREEN da Task 1**
- **Found during:** Task 1 (GREEN)
- **Issue:** o verify da Task 1 roda o `ai-client.test.ts` inteiro, e o portão do tracer exige verde antes da expansão. Com a chamada nova de `logAiCall` e sem classificação, a invariante fica vermelha, porque é isso que ela existe para fazer.
- **Fix:** o vermelho intermediário foi medido e registrado. Depois, a classe `sinal_injecao` e o caminho «injeção sinalizada» entraram no commit `feat(49-38)` da Task 1. A Task 2 ficou com o teste do replay, o arnês A1..A6 e a regressão.
- **Files modified:** `supabase/functions/_shared/__tests__/ai-client.test.ts`
- **Verification:** `ok | 306 passed | 0 failed` no verify da Task 1. A6 e A1 mordem a invariante.
- **Committed in:** `8df8ff44`

**2. [Rule 1 - Bug de instrumento] A comparação «espaços normalizados» mudou para «sem espaço em branco»**
- **Found during:** Task 3
- **Issue:** o comando vivo é uma versão compactada, fora do repositório. Colapsar os espaços reprovaria o comando correto (`success = false` ≠ `success=false`) e bloquearia a migration por um falso «edição desconhecida».
- **Fix:** a comparação passou a ser `regexp_replace(…, '\s', '', 'g')` nos dois textos, e está documentada no cabeçalho da migration. A mordida contra uma edição real foi provada: a referência alterada reprovou.
- **Files modified:** a migration
- **Committed in:** `5f483acf`

### Notas de execução (não são desvios)

- O título da invariante dizia «7 caminhos». Virou «caminhos», porque uma contagem escrita em texto é fotografia (CLAUDE.md §«Portões»).
- O hook de injeção do harness marcou `ai-client.test.ts` na leitura. Foi falso positivo: são as frases de ataque dos fixtures.
- Arquivos de outra janela (`.planning/ui-reviews/.gitignore`, `docs/specs/DRAFT-banco-sjt-marketing.md`, `docs/vagas/`) não foram tocados nem incluídos em commit.

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug de instrumento). **Impact on plan:** nenhum no escopo. As duas mudanças mantêm o contrato do plano: a invariante exercita a chamada nova, e o portão recusa uma edição desconhecida.

## TDD Gate Compliance

- Task 1: RED `bbd63e27`, test(49-38), com RED_EVIDENCE_OK. Depois, GREEN `8df8ff44`, feat(49-38).
- Task 2: `2c911d94`, test(49-38). O teste do replay já passa com o código da Task 1, porque o plano pôs o `injection_flag` do replay na Task 1. O RED dele é provado pela mutação A3, que reprova só ele (exit 1).
- Task 3: a migration não é TDD de código. A mordida é o ensaio da cópia sem a exclusão (`P49-38 PORTAO`).
- REFACTOR: nenhum.

## Issues Encountered

Nenhum bloqueio. O único ponto que pedia medição era o corpo compactado do job, e ele foi medido acima.

## Known Stubs

Nenhum. (`injecao.pattern ?? ""` é um cinto para um caso inalcançável: o detector sempre devolve `pattern` com `flag`. Não é stub.)

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`. Mitigações cumpridas:
- T-49-38-02: chave nula na linha-evento, com A6 e a invariante;
- T-49-38-03: campo próprio, com A5;
- T-49-38-04: classificação no topo, com A3;
- T-49-38-05: varredura D-50 e a migration com baseline e mordida;
- T-49-38-06: comparação com o comando conhecido, `alter_job` por jobid, horário e `active` conferidos, e a mordida de edição desconhecida;
- T-49-38-07: exceção do arnês depois do corpo, sem controle de transação na migration, e leitura de `cron.job` e do ledger depois;
- T-49-38-SC: nenhum pacote.

## User Setup Required

Nenhum.

## Next Phase Readiness

- 49-39/49-40: as EFs leem `result.injection_flag` e gravam `SINAL_INSTRUCAO_AO_MODELO` nas formas de `_shared/sinal-revisao.ts`. As telas (49-41/49-42) usam `sinaisDe` e `rotuloDoSinal`.
- 49-42: o estado e o filtro «Sinal» na tela do admin. Hoje a linha-evento aparece como «falha», com a causa legível certa.
- 49-43:
  - aplicar a `20260930000001` antes das EFs;
  - registrar o md5 no inventário de cron;
  - levar ao operador o ACHADO dos eventos de bloqueio contados como erro, com a pergunta de por que o alerta de 28/09 não chegou.
- **Nenhuma EF deve ser deployada antes do 49-43.** O disco tem o `callAi` novo, que já grava a linha-evento. Sem a migration aplicada, essa linha contaria como erro.
- JORN-41 segue «Gaps Found». Quem marca é o verificador.

## Self-Check: PASSED

- FOUND: supabase/functions/_shared/sinal-revisao.ts
- FOUND: supabase/functions/_shared/__tests__/sinal-revisao.test.ts
- FOUND: supabase/migrations/20260930000001_p49_38_agregacao_sem_evento_de_sinal.sql
- FOUND commits: bbd63e27, 8df8ff44, 2c911d94, 5f483acf
- `commits: 4` medido por `git rev-list --count c8de7f26..HEAD`; `plan_head_after` = `5f483acfde0df5d2eb3a4f6fc9c97bc370022c6d`
- Critérios de aceitação: `grep -c '^import' sinal-revisao.ts` = 0; `prompt_injection_flagged` em ai-error-codes.ts = 2; `classifyPromptInjection` em ai-client.ts = 6
