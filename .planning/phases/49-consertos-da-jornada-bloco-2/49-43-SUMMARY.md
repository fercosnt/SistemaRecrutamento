---
phase: 49-consertos-da-jornada-bloco-2
plan: "43"
subsystem: ai
tags: [edge-functions, deploy, eszip, management-api, migration, pg_cron, vercel, injection-detector, sinal-revisao, cr-01, cr-02, cr-04, cr-05, jorn-41, d-52, d-54, d-55]
status: complete

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "38"
    provides: "migration 20260930000001 (cron ai-cost-aggregation sem a linha-evento do sinal), não aplicada"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "39..42"
    provides: "sinal (flag) gravado por 5 EFs e visível em 7 telas, no PDF do comparativo e no log do admin"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "43 (rodadas de conserto -2-FIX e -3-FIX)"
    provides: "CR-01 (SJT sinalizada pondera) e CR-02 (Decisão Final mostra o aviso), consolidar-decisao-final importando _shared/sinal-revisao.ts"
provides:
  - "migration 20260930000001 aplicada em PROD ANTES das EFs (md5 do ledger 64b50115… BATE); cron ai-cost-aggregation com md5(command) 74983c22…, horário e active intactos; smoke p42 4/4"
  - "consolidar-decisao-final v9 → v10 (verify_jwt=true), fonte publicada 3/3 byte-igual a REV 57da895e, sinais_revisao 0 → 10"
  - "front publicado pela Vercel (bc885734, READY) com o aviso da Decisão Final servido em DecisaoFinalPage-BfpjJuaG.js (AUSENTE antes do push, PRESENTE depois)"
  - "7 EFs de IA +1 de versão (v34/v24/v18/v21/v32/v32/v24), fonte publicada byte-igual a REV em 92/92 módulos, avaliar-redacao por último"
  - "suíte do detector + sinal + callAi sobre o código PUBLICADO: 308/0 verde; sobre o anterior: 196/112 vermelho"
  - "cron-inventory.md com a seção «Re-coleta da Phase 49» (dona nova 20260930000001, md5 vivo, re-coleta dos 5 jobs)"
  - "JORN-41 anotado «… no ar nas 7 EFs (49-43); aguarda re-verificação», caixa [ ], recusado pelo mark-complete; STATE com a correção datada da linha da 49-11 e as pendências JORN-39 e WR-07"
affects: [49-VERIFICATION re-verificação do JORN-41, próximo plano de lacunas (WR-07), decisão do operador sobre os eventos de bloqueio do JORN-39]

actuals:
  tokens: 4300
  tasks: 3
  commits: 2
  plan_head_before: 57da895ecb584f538d506e411d0934011d1e7cb8
  plan_head_after: fb79d29ef77419389904f244787a7b4a4c1b2ec6

tech-stack:
  added: []
  patterns:
    - "Publicação a partir de REV fixado em ref (refs/gsd/49-43/*) e de um export `git archive` fora do repositório, com o GUARDA no mesmo comando de cada escrita; push do sha exato, enumerado"
    - "Prova de bundle das 7 EFs por programa (cmpbundle.cjs): mapa de módulos tirado do --dry-run do efdeploy.cjs de REV, fechamento do bundle = dry-run e não vazio, sourcesContent comparado com `git cat-file blob` de REV"

key-files:
  created:
    - .planning/phases/49-consertos-da-jornada-bloco-2/49-43-SUMMARY.md
  modified:
    - docs/compliance/cron-inventory.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md

key-decisions:
  - "Os três ajustes de execução do 49-REVIEW-GAPS-7 foram aplicados sem editar o plano (que exigiria um -8): WR-17 (pós-push compara com refs/gsd/49-43/head), WR-18 (prova byte a byte nas 7 EFs, avaliar-redacao inclusive), WR-19 (conferência do intervalo pelo comando literal testado do -7)"
  - "A prova byte a byte das 7 EFs (regra 5 / WR-13) foi feita por um programa do executor, cmpbundle.cjs (md5 82906ba8…), generalização do comparador do portão B, com exigência de fechamento não vazio e igual ao --dry-run"
  - "Os commits de metadados do executor (SUMMARY, STATE, ROADMAP) NÃO são publicados por este plano: o plano diz «este plano não os publica», e o gsd-49-43-push.cjs recusaria o SUMMARY (fora do pathspec permitido). Ficam locais à espera do orquestrador"

requirements-completed: []

coverage:
  - id: D1
    description: "migration 20260930000001 aplicada antes das EFs, escriturada, job íntegro, smoke p42 verde, inventário com a dona nova e o md5 vivo"
    requirement: JORN-41
    verification:
      - kind: integration
        ref: "<verify> 2 e 3 da Task 2 (cron/ledger; inventário com md5 vivo 74983c221d1cfcee08de85a68d34f5e9)"
        status: pass
      - kind: integration
        ref: "p46apply.cjs run p42_invent05_cron_smoke.sql (smoke42i.pass = 4)"
        status: pass
    human_judgment: false
  - id: D2
    description: "consolidar-decisao-final e as 7 EFs de IA no ar com fonte publicada byte-igual a REV e os marcadores do sinal"
    requirement: JORN-41
    verification:
      - kind: integration
        ref: "<verify> 1, 4 e 5 da Task 2 (8 EFs ACTIVE/verify_jwt; 7 bundles com bloquear x sinalizar; consolidar 3/3 byte-iguais a REV)"
        status: pass
      - kind: integration
        ref: "cmpbundle.cjs <slug> <bundle> REV — 12/12, 12/12, 14/14, 15/15, 14/14, 10/10, 14/14"
        status: pass
    human_judgment: false
  - id: D3
    description: "front com o aviso da SJT na Decisão Final servido em chunk lazy, publicado antes das EFs de IA"
    requirement: JORN-41
    verification:
      - kind: integration
        ref: "<verify> 6 e 7 da Task 2 (mordida no build de 00557271; crawler PRESENTE em rh.beautysmile.com.br)"
        status: pass
    human_judgment: false
  - id: D4
    description: "comportamento ponta a ponta em PROD (colar frase sinalizada na tela, ver a linha em ai_call_logs e o aviso na Decisão Final)"
    requirement: JORN-41
    verification: []
    human_judgment: true
    rationale: "O plano proíbe invocar EF de IA em PROD (gravaria análise que pode virar vigente de candidato real). Aqui o comportamento foi provado executando o código publicado contra o contrato; a prova em PROD é do verificador/UAT, como no 49-34"

duration: ~17min
completed: 2026-10-03
---

# Phase 49 Plan 43: publicação do bloquear×sinalizar (JORN-41) a partir de REV fixado Summary

**A migration do cron foi aplicada primeiro. Depois foram ao ar, nesta ordem, a `consolidar-decisao-final` (v10, com `sinais_revisao`), o front com o aviso da SJT na Decisão Final e as 7 EFs de IA, com `avaliar-redacao` por último. Tudo saiu de REV `57da895e`, o commit revisado (49-REVIEW-GAPS-7, 0 críticos), por um export `git archive`. A fonte publicada é byte-igual a REV nos 8 deploys, e o código publicado passa no contrato do detector (308/0), enquanto o anterior reprova (196/112). Nenhuma EF foi invocada em PROD. O JORN-41 fica à espera do verificador.**

## Performance

- **Duração:** ~17 min (2026-10-03T03:33:11Z → ~03:50Z; 00:33 → 00:50 no horário de Brasília)
- **Tasks:** 3 (Task 1 só conferida; Task 2 publicação; Task 3 escrituração)
- **Commits do plano:** 2 (`bc885734` inventário, `fb79d29e` REQUIREMENTS+STATE), ambos publicados
- **Arquivos do repositório modificados:** 3 (`docs/compliance/cron-inventory.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`)

## Linha do tempo (prova da ordem; UTC)

| Passo | Horário | Resultado |
|---|---|---|
| Task 1 `<verify>` + conferência do intervalo (WR-19) | 03:33 | verde; `intervalo ok: 31b6654b..HEAD = só 49-REVIEW-GAPS-7.md` |
| 0a REV fixado | 03:34 | REV = BASE..REV com 71 commits |
| **A** migration `20260930000001` | **03:36:28–03:36:29** | aplicada e escriturada, md5 do ledger BATE |
| Commit do inventário `bc885734` (local) | 03:38:15 | anexado ao `head` |
| **B** `consolidar-decisao-final` | **03:38:31–03:38:32** | v10 `ACTIVE`, `verify_jwt=true` |
| Crawler ANTES do push | 03:39:31 | AUSENTE (51 arquivos visitados) |
| **C** push do sha `bc885734` | **03:39:47–03:39:50** | `272458c0..bc885734 -> main` |
| Vercel `READY` (produção, `dpl_4JSWoqubkQHKGijtDLq4v6vTybhZ`) | 03:40:16 | status GitHub `success` |
| Crawler DEPOIS do push | 03:41:07 | PRESENTE em `DecisaoFinalPage-BfpjJuaG.js` |
| **D** `analise-candidato-individual` | 03:41:29–03:41:32 | v34 |
| **D** `avaliar-redacao-cultural` | 03:41:53–03:41:56 | v18 |
| **D** `avaliar-transcricao-entrevista` | 03:42:05–03:42:08 | v21 |
| **D** `comparativo-candidatos` | 03:42:17–03:42:20 | v32 |
| **D** `gerar-devolutiva-bigfive` | 03:42:29–03:42:31 | v32 |
| **D** `gerar-guia-entrevista` | 03:42:39–03:42:42 | v24 |
| Portão de E, re-lido na hora | 03:42:53 | `origin/main..HEAD` vazio; `consolidar` viva com `sinais_revisao` (10); crawler PRESENTE |
| **E** `avaliar-redacao` (ÚLTIMO) | **03:43:00–03:43:03** | v24 (`updated_at` 03:43:02.561Z) |
| Task 3: commit `fb79d29e` e push | 03:45:45 / 03:45:57 | push enumerado com 1 commit; Vercel `READY` 03:46:35 |

A ordem que o plano exige se cumpriu: migration < `consolidar` < push do front < `READY` + crawler PRESENTE < primeira EF de D < `avaliar-redacao`. Cada portão (A, B, C, E) estava verde antes do passo seguinte.

## Task 1: re-revisão (checkpoint atravessado; só conferida)

- O `<verify>` da Task 1 foi rodado literalmente, antes e depois de fixar REV: `re-revisao sem critico, cobrindo HEAD: …/49-REVIEW-GAPS-7.md`.
- Conferência do intervalo da regra 2 do modo simplificado, pelo comando literal testado do `49-REVIEW-GAPS-7.md` (WR-19), em comando separado do passo 0a (IN-23): `intervalo ok: 31b6654bc30323ddb1e3b9c9fc9430b106679d56..HEAD = so .planning/phases/49-consertos-da-jornada-bloco-2/49-REVIEW-GAPS-7.md`. O intervalo tem um commit só: `57da895e docs(49-43): revisão final do modo simplificado (49-REVIEW-GAPS-7: 0 críticos)`.
- Cadeia de revisões: -2 (CR-01) → -2-FIX → -3 (CR-02) → -3-FIX → -4 (CR-03) → `70c2f09e` → -5 (CR-04) → `4d3bec4c` → -6 (CR-05) → modo simplificado `31b6654b` → **-7 (`critical: 0`, `reviewed_head: 31b6654b…`)**, commitado sozinho como `57da895e`. Nenhum review foi reescrito.

### Respostas do operador (VERBATIM, com data)

Respostas dadas depois do 49-36:
- **2026-09-30, «1- sim, 2- decidir depois»**. (1) sim ao conserto do CR-01; (2) o achado do JORN-39 (eventos de bloqueio contados como erro pelo `ai-cost-aggregation`) fica para decidir depois. Virou pendência no `STATE.md`.
- **2026-09-30, «1»**. CR-02: mostrar o sinal da SJT na Decisão Final.
- **2026-10-01, «B»**. WR-07. A opção mostrada ao operador, com este texto literal: «(b) Dar ao RH acesso ao texto da resposta. É maior e mexe em permissão de dados (RLS). Viraria um plano novo, e publico com o aviso atual.» Virou pendência no `STATE.md` e nota para o próximo plano de lacunas.
- **2026-10-01, «A»**, sobre o modo de publicação. O orquestrador leu «A» como a opção (1), «Simplificar».
  - Registro do orquestrador, repassado a este executor: na mensagem seguinte ele escreveu ao operador «Entendi o «A» como a opção 1, simplificar. Se não for isso, me corrija.»
  - Segundo o orquestrador, isso corrige o WR-20 do -7, porque a leitura FOI declarada na mensagem seguinte. **Este executor não tem a transcrição e não conferiu.** O revisor do -7 conferiu as mensagens de 05:53:05Z e 05:53:17Z e não achou a declaração. Ficam registradas as duas versões, cada uma atribuída a quem a deu.
- **2026-10-03, «Outra janela parada»**. É a pré-condição da regra 1 do modo simplificado: a confirmação escrita de que a outra janela estava parada durante a publicação.

Anteriores, nos documentos do 49-36, e que continuam valendo:
- a decisão (a) de 2026-09-29;
- «1 ok confirmado» e «2- A», de 2026-09-30.

Nada além disso é atribuído ao operador.

**Pergunta ABERTA ao operador, NÃO decidida (IN-07):** a nota da IA no caso aberto da SJT deve ponderar na Decisão Final sem confirmação humana? Ver o docblock da `consolidar-decisao-final/index.ts`, «DECISÃO ABERTA».

### Disposição dos achados

A disposição é da revisão do plano e do orquestrador, não do operador.

| Achado | Disposição |
|---|---|
| WR-01, WR-02, WR-03; IN-01..IN-05; IN-09, IN-10, IN-11; IN-14 | registrado, fora do escopo (carried até o -7) |
| WR-04, WR-05 | consertados (`dec41825`, `3ff15af6`) |
| WR-06 | consertado (`737cdb0c`) |
| IN-06 | consertado (`c9f19cb7`) |
| IN-08 | consertado (`022458f2`) |
| IN-07 | docblock consertado (`1371a2a8`); segue aberto SÓ como a pergunta acima |
| CR-04, WR-08, WR-09, WR-10, WR-11, IN-12, IN-13 | consertados NO PLANO (`4d3bec4c`), sem código |
| WR-07 | «B» do operador, 2026-10-01 → pendência no `STATE.md` |
| CR-05 (-6) | fechado pelo modo simplificado (`31b6654b`): pausa da outra janela (regra 1) + conferência do intervalo (regra 2), rodada verde |
| WR-12 (-6) | push do sha exato no plano (`31b6654b`); a metade pós-push foi aplicada na execução pelo WR-17 |
| WR-13 (-6) | aceito pela regra 5; executado com `cmpbundle.cjs`, que exige fechamento não vazio e igual ao `--dry-run` (o caso vazio do -7) |
| WR-14 (-6) | aceito pela regra 5: `vitest` no checkout com a outra janela parada (218 arquivos / 2377 testes verdes, exit 0) |
| WR-15 (-6) | fechado: os md5 dos três programas foram comparados aos do -6 e também à extração por `awk` do plano em REV. Os três conferem |
| WR-16 (-6) | atribuição carried; o aviso ao RH aparece aqui como RECOMENDAÇÃO, não como ação do operador |
| IN-15, IN-16, IN-18 | carried. No IN-16, o hook Husky rodou nos dois commits (`tsc errors: 89 (frozen baseline: 96)`), sem `--no-verify` |
| IN-17 | fechado pela regra 4 |
| WR-17 (-7) | aplicado na execução: pós-push compara o `main` remoto com `refs/gsd/49-43/head` e avança o `remoto` para esse ref |
| WR-18 (-7) | aplicado na execução: prova byte a byte nas 7 EFs, `avaliar-redacao` inclusive |
| WR-19 (-7) | aplicado na execução: conferência do intervalo pelo comando literal do -7 |
| WR-20 (-7) | ver «Respostas do operador» acima: registro do orquestrador e achado do revisor lado a lado |
| IN-19 (-7) | cumprido: nenhum commit entre `57da895e` (o -7, sozinho) e o passo 0, conferido pela conferência do intervalo |
| IN-20 (-7) | a pausa cobriu também o push da Task 3 (03:45:57Z) e a conferência pós-push dele |
| IN-21 (-7) | prosa e contagens superadas; nada executável dependia delas (a contagem real foi 71 / 72 / 1) |
| IN-22 (-7) | os programas foram gravados com `\n` final, e os md5 conferiram |
| IN-23 (-7) | o passo 0a e a conferência do intervalo rodaram em comandos separados; nenhum comando juntou `cut -f1` e `push` |

## Task 2: publicação

### Passo 0: REV, export, programas, testes, escopo, ALHEIO

- **REV** = `57da895ecb584f538d506e411d0934011d1e7cb8`.
- **BASE** = `272458c047675fddf0278db4a0c41dff59b0ddd3` (= `ls-remote` = `origin/main`).
- **71 commits em BASE..REV.**
- Refs `refs/gsd/49-43/{rev,base,head,remoto}` criados; ficam no repositório.
- Export em `$TMPDIR/gsd-49-43-57da895e…`, sem `.env*` (só os `.example` rastreados). Removido no fim, com tudo verde.
- **md5 dos três programas** (gravados com Write; iguais aos do -6 e à extração `awk` do plano em REV, conferidos com `cmp`):
  - `gsd-49-43-guarda.cjs` `fd13e32f38d4e49e581e7fead9bf42d2`
  - `gsd-49-43-push.cjs` `ede2ecf159495a0e2edb8a3905ae5566`
  - `gsd-49-43-escopo.cjs` `968471efcd141f847191457c70bdf96f`
- **GUARDA sozinho:** `GUARDA ok: HEAD=57da895e REV=57da895e, 93 arquivos no disco e no export = REV`.
- **deno test no export:** `1009 passed | 0 failed (32s)`.
- **vitest no checkout**, com o GUARDA no mesmo comando: `Test Files 218 passed (218)`, `Tests 2377 passed (2377)`, exit 0.
- **Escopo:** `escopo derivado = os 8 declarados, verify_jwt pela tabela do efdeploy.cjs de REV: analise-candidato-individual:false avaliar-redacao:true avaliar-redacao-cultural:true avaliar-transcricao-entrevista:true comparativo-candidatos:true consolidar-decisao-final:true gerar-devolutiva-bigfive:false gerar-guia-entrevista:true; src embarcado: src/features/decisao/schemas/consolidacaoSchema.ts`.
- **ALHEIO (passo 0f):** vazio; 30 commits nos caminhos publicados desde 2026-09-30T02:14:09Z, todos aceitos.
- **Ledger antes:** sem a versão `20260930000001` (0 linhas).
- **Vivo antes:** as 8 EFs estavam nas versões esperadas, v33/v23/v17/v20/v31/v31/v23 e `consolidar` v9 (2026-07-12). Ninguém publicou desde o -6.

### Uma linha `GUARDA ok` por escrita

| Escrita | Saída do GUARDA (no mesmo comando) |
|---|---|
| A apply | `GUARDA ok: HEAD=57da895e REV=57da895e, 93 arquivos…` |
| A smoke p42 (e a releitura do contador) | `GUARDA ok: HEAD=57da895e REV=57da895e, 93 arquivos…` |
| commit do inventário | `GUARDA ok: HEAD=57da895e REV=57da895e, 93 arquivos…` |
| B `consolidar-decisao-final` | `GUARDA ok: HEAD=bc885734 REV=57da895e, 93 arquivos…` |
| C push | `GUARDA ok: HEAD=bc885734 REV=57da895e, 93 arquivos…` |
| D × 6 e E | `GUARDA ok: HEAD=bc885734 REV=57da895e, 93 arquivos…` (7 vezes) |
| Task 3 commit | `GUARDA ok: HEAD=bc885734 REV=57da895e, 93 arquivos…` |
| Task 3 push | `GUARDA ok: HEAD=fb79d29e REV=57da895e, 93 arquivos…` |

Nenhuma escrita em PROD leu o checkout compartilhado. A migration, o smoke e as 8 EFs saíram de `$X`, pelos `p46apply.cjs`/`efdeploy.cjs` de REV. O `git status` terminou como começou: `.planning/ui-reviews/.gitignore` e `docs/specs/DRAFT-banco-sjt-marketing.md` modificados, `docs/vagas/` não rastreado. Nenhum deles foi staged, commitado ou publicado.

### A: migration do cron ([BLOCKING])

```
── 20260930000001_p49_38_agregacao_sem_evento_de_sinal.sql
   version : 20260930000001
   octetos : 17064
   md5     : 64b501154fe180dc4da111458e18bb71
   ✅ aplicada e escriturada — md5 do ledger BATE (17064 octetos)
```

- `<verify>` 2: `migration do cron aplicada e escriturada` (n=1, ok=1, ledger=1).
- Job `ai-cost-aggregation`: `md5(command)` `fdd283dc…` (839 octetos) → `74983c221d1cfcee08de85a68d34f5e9` (999 octetos), igual ao md5 do `c_cmd_novo` da migration. Horário `30 1 * * *` e `active` intactos; uma linha só.
- O portão comportamental da própria migration rodou na mesma transação. O apply persistiu e foi escriturado, logo ele não levantou.
- **Smoke p42:** `p46apply.cjs run` saiu com exit 0. Como o endpoint não devolve os `NOTICE`s, rodei-o de novo pelo `sql`, com o arquivo do export seguido de `SELECT current_setting('smoke42i.pass', true)`: **`"smoke42i_pass": "4"`**. São 4 de 4, e o RESUMO (z) exige exatamente 4.
- Os outros 4 jobs ficaram byte-iguais à re-coleta da Phase 48.
- **Inventário** (`bc885734`): seção «Re-coleta da Phase 49 — o comando do `ai-cost-aggregation` re-apontado (JORN-41)», mais uma linha na nota de camadas do topo e uma no item 1 de «Limites». O diff tem 57 inserções e 0 remoções: os blocos históricos com `fdd283dc…` ficaram intactos. `<verify>` 3: `inventario com a dona nova e o md5 vivo: 74983c221d1cfcee08de85a68d34f5e9`.

### B: `consolidar-decisao-final` (8º deploy, fora das provas das 7)

| | Antes | Depois |
|---|---|---|
| versão / status | v9 `ACTIVE` (2026-07-12, Supabase CLI de `…/Cursor Repo/DB Sistema de recrutamento/…`) | **v10 `ACTIVE`** (2026-10-03T03:38:32Z, `efdeploy.cjs` de REV) |
| `verify_jwt` | true | **true** (tabela; sem override) |
| fechamento (sourcemaps) | `index.ts` + `consolidacaoSchema.ts` (prefixo do checkout antigo; iguais a `b875352c`) | + `functions/_shared/sinal-revisao.ts`, e nada mais (dry-run: exatamente os 3) |
| `sinais_revisao` / `sinaisDasLinhas` | 0 / 0 | **10 / 6** |
| `sourcesContent` contra REV | 2 diferem | **3/3 byte-iguais** |

Saídas do comparador do `<verify>` 5, que é o texto literal da linha 586 do plano:
- bundle novo contra REV: `consolidar: 3/3 modulos byte-iguais a REV 57da895e, com sinais_revisao`;
- **mordida 1**, bundle anterior (v9) contra REV: `FECHAMENTO DIVERGE: ["functions/consolidar-decisao-final/index.ts","src/features/decisao/schemas/consolidacaoSchema.ts"]`;
- **mordida 2**, bundle novo contra `00557271`: `DIFERE DE 00557271: functions/consolidar-decisao-final/index.ts`.

O primeiro deploy desta EF pelo `efdeploy.cjs`, com `../src/…` resolvido dentro do export, respondeu `HTTP 200`.

### C: front

- **Build do export de REV:** o marcador `decisao-sjt-sinal-revisao` aparece em exatamente 1 chunk, `DecisaoFinalPage-C1M7Tmtd.js`, que não é `index-*`.
- **Mordida** (build de `00557271`, a árvore anterior ao CR-02): `decisao-sjt-sinal-revisao` não aparece em nenhum chunk, e `instrucao_ao_modelo` aparece em `sinal-revisao-QGNE1TfZ.js`. `<verify>` 6: `portao do front morde (vazio em 00557271, onde o marcador antigo passa) e passa em REV: …/build-rev/assets/DecisaoFinalPage-C1M7Tmtd.js`.
- **Crawler em `https://rh.beautysmile.com.br`:**
  - antes do push: `AUSENTE em chunk lazy de PROD: decisao-sjt-sinal-revisao (visitados=51; achados=[])`;
  - controle de alcance: `PRESENTE em PROD, chunk lazy: proveniencia-ia-badge ["/assets/ProvenienciaIABadge-DjVQoZcM.js"]`;
  - depois do `READY`: `PRESENTE em PROD, chunk lazy: decisao-sjt-sinal-revisao ["/assets/DecisaoFinalPage-BfpjJuaG.js"]`. O hash difere do build local, como esperado: o portão procura o marcador, não o nome.
- **Push:** sha `bc88573483261d07a5a9a372722ec408c8ad4f73`, saída `272458c0..bc885734 -> main`.
- **Vercel:** produção `dpl_4JSWoqubkQHKGijtDLq4v6vTybhZ` (`sistema-recrutamento-qi0ev5z5y`), **Ready**, build de 21 s; status do commit no GitHub `success` às 03:40:16Z.
- **Conferência pós-push (WR-17):** `remoto = head (bc885734)`, e `git log --oneline origin/main..HEAD` vazio antes da primeira EF de IA.

#### Push enumerado do passo C: `PUSH ENUMERADO: 72 commits, todos de BASE..REV (71) ou proprios (1)`

```
bc88573483261d07a5a9a372722ec408c8ad4f73 docs(49-43): inventário do cron — 20260930000001 é a nova dona do comando do ai-cost-aggregation (md5 vivo 74983c22…)
57da895ecb584f538d506e411d0934011d1e7cb8 docs(49-43): revisão final do modo simplificado (49-REVIEW-GAPS-7: 0 críticos)
31b6654bc30323ddb1e3b9c9fc9430b106679d56 docs(49-43): modo de publicação simplificado — outra janela pausada, push do sha exato, intervalo do review conferido (CR-05/WR-12 do -6)
0fd55e084ab892d855d7077f45a8cd4b40cdde26 docs(49-43): re-revisão do plano (49-REVIEW-GAPS-6: CR-05 — portão da Task 1 não vigia o intervalo até o commit do review)
4d3bec4ce11844724ef586f6918b134a19cdfc8d docs(49-43): revisão do plano — CR-04 (REV fixado, bundle de REV, push enumerado) + WR-08..11, IN-12/13
17e3582479c31049f56787d88b359a65ff883270 docs(49-43): re-revisão do plano revisado (49-REVIEW-GAPS-5: CR-04 — disco = HEAD conferido uma vez só numa publicação longa)
70c2f09e62464e8ba8d8a3bb951d77380a35b0d0 docs(49-43): revisão do plano — CR-03 (consolidar no deploy, ordem segura, marcador da Decisão Final)
26c7be4439d1b076a4c358c0c3a1e839059cb2a3 docs(49-43): re-revisão do 2º conserto (49-REVIEW-GAPS-4: CR-03 — plano de publicação reintroduziria o CR-02)
1c9e8b1bdd9d920778938ad6baae9eb0860c8188 docs(49-43): relatório dos consertos do 49-REVIEW-GAPS-3 (CR-02, WR-06, IN-06, IN-07, IN-08)
022458f2c791d2e5ff4a5a8b0144febb6d103783 fix(49-43): IN-08 — título de teste e quebras de comentário desatualizados pelo conserto do CR-01
1371a2a8378df6ee683a26028b823c5f97859d67 fix(49-43): IN-07 — docblock do consolidar-decisao-final deixa de prometer que só pondera nota confirmada por humano
c9f19cb71a188bbb06a6dd6ecb157dad457fa256 fix(49-43): IN-06 — o alerta de perda de auditoria do sinal não afirma no passado a chamada ao modelo
737cdb0cd7301f633368fc84cb9f9c5ab09116af fix(49-43): WR-06 — sinal + composto < 13 e sinal + insufficient_evidence seguem em pendente_humano (testes)
483e25aefc6c8b68bbf88a22399f4d7842aaaa01 fix(49-43): CR-02 — o sinal de revisão da SJT que pondera aparece na Decisão Final
447025397d0aaf09204d9c8823df5a28669e1dd0 fix(49-43): CR-02 (RED) — a Decisão Final tem de mostrar o sinal de revisão da SJT que pondera
00557271d637feade7cf88d05f35f2c9aa653982 docs(49-43): re-revisão do conserto (49-REVIEW-GAPS-3: CR-02 — SJT sinalizada pondera sem aviso visível)
6ebb88a1c128d52ad8e3f63d8e436a7369a67191 docs(49-43): relatório dos consertos do 49-REVIEW-GAPS-2 (CR-01, WR-04, WR-05)
3ff15af6eda0f37f54baf8d3f3e41a1fef92bf27 fix(49-43): WR-05 — alerta de perda de auditoria do SINAL diz que a análise seguiu, não que houve bloqueio
dec418252394c2c00005173cbdb34d192c0f18bf fix(49-43): WR-04 — comentários deixam de atribuir ao operador escolhas que foram do planejador
88b127f62ffb37a91ac778e7a6cf4f7010426aa2 fix(49-43): CR-01 — o sinal (flag) na SJT caso aberto só marca: sai do status, a nota volta a contar na Decisão Final
fa1c609b5c7629a4746e1aa734b3a696963340a2 fix(49-43): CR-01 (RED) — SJT sinalizada exige status sucesso e etapa SJT consolidada idêntica à da resposta sem a frase
c933b2eb36615555ee631b0405551c2149775950 docs(49-43): re-revisão adversarial do fechamento 49-36..49-42 (49-REVIEW-GAPS-2: 1 crítico, 5 warnings, 5 infos)
d81079cf9dfc29b45303e01eb29162fba9d1b73c docs(49-42): STATE e ROADMAP — 49-42 concluído, fase 49 segue executing (42/43)
7f72c77595d75e32cc03609f2f5c63978f5c46e2 docs(49-42): SUMMARY do sinal na entrevista, no comparativo, na Decisão Final, no PDF e no log do admin (filtro ≡ célula)
48deef2cbe49898cb2292d12ce1117f57a660476 feat(49-42): o log do admin mostra a linha-evento do sinal como «Sinal», e o filtro de Status usa o mesmo predicado da célula
8c4a04e590a7c68d604b0d9c19cda4cf62be2ebc test(49-42): o log do admin exige o estado «Sinal» e o filtro de Status concordando com a célula em todas as formas de linha (RED)
513ee48d445267a9ba6106344882b7364078c936 feat(49-42): o comparativo e a Decisão Final mostram o aviso do ranking sinalizado, e o PDF exportado leva o sinal
0241e750a650f998473a0c51fb1fb860ecb98bfc test(49-42): o comparativo exige o aviso do ranking sinalizado, o PDF com o sinal e a prop fiada nas duas páginas (RED)
3103e36af4f387fd155f813d3525d7928a10d23e feat(49-42): a análise de entrevista sinalizada mostra o aviso sem travar o avanço, e o PDF do comparativo aprende a imprimir o rótulo
49e7a6a15baa18e0042594fc3034ee6f889e5a01 test(49-42): transcrição exige o aviso do sinal sem trava e o PDF do comparativo exige a linha do rótulo (RED)
757a15398bd393debb0c8301534b1e187ab8c31a docs(49-41): STATE e ROADMAP — 49-41 concluído, fase 49 segue executing (41/43)
75f8e969b553e9bfdda6b085c7ae0299138dc9f8 docs(49-41): SUMMARY do sinal de revisão com rótulo pt-BR no hub, na triagem, na revisão da redação e no card da SJT
a0e428f8432ce56340d6fcaf718c04cbaee2f6fc feat(49-41): revisão da redação renderiza os flags e o card da SJT mostra o motivo do sinal
99a4345fbd88514d9f67bd1e56f55eb8438b5c66 test(49-41): revisão da redação exige a seção de flags e o card da SJT exige o motivo do sinal (RED)
0e856ba81509c760371949184bec1cc3f6895354 feat(49-41): hub e triagem mostram o sinal de revisão com o rótulo pt-BR de rotuloDoSinal
0347bf8a24544b284b6ff9544ef8bb9c11109c28 test(49-41): hub e triagem exigem o rótulo pt-BR do sinal no lugar do código cru (RED)
af9068e78097b788a5b7284e93ff10f720839913 docs(49-40): STATE e ROADMAP — 49-40 concluído, fase 49 segue executing (40/43)
a1eddcf4e03ee23113e01b3bea1c307c305aca18 docs(49-40): SUMMARY do sinal (flag) na entrevista e no comparativo, e da prova de que guia e devolutiva recebem só texto do sistema
ee24d1da326b5614904d326d4d37e8b819ba48d2 test(49-40): texto do sistema do guia e da devolutiva classifica como none, provado por teste
58a862159a2d6e32789a17cb2d9779afecca2c4c feat(49-40): comparativo sinalizado grava e devolve ranking.sinais_revisao com o ranking do modelo intacto
69c0a8c4b998fa326b4d887c7e7216dbe85b3d87 test(49-40): comparativo com imperativo nu (flag) exige ranking.sinais_revisao gravado e devolvido (RED)
042c7df3adea2c5ef745de81604f9c27bbca5038 feat(49-40): transcrição sinalizada grava { sinal: instrucao_ao_modelo } em bias_flags, sem tocar bloqueio_avanco
723580968e7ff4330fa726a3e3fdf741486f922c test(49-40): transcrição com imperativo nu (flag) exige { sinal } em bias_flags sem segurar o avanço (RED)
8abfb980edeb6b779714013ca32af324372c8a4d docs(49-39): STATE e ROADMAP — 49-39 concluído, fase 49 segue executing (39/43)
dfcb872044bca9334c495cfaf82ac9bd46968bb8 docs(49-39): SUMMARY do sinal (flag) gravado na triagem, na SJT e na redação cultural
7a958313202c9d765b7564d1abf58c3996128f77 feat(49-39): redação cultural sinalizada grava instrucao_ao_modelo em flags, sem mexer em nota, cor nem bloqueio
dbb94ea32d4a8441f3e7c3136d6bc9c38ed6ae7b test(49-39): redação cultural com imperativo nu (flag) exige o sinal em flags sem mudar nota, cor nem bloqueio (RED)
9890ad9fd6b21ffa50bc4a163fef7b28fcc8c358 feat(49-39): SJT sinalizada vai a pendente_humano com a nota composta e o motivo instrucao_ao_modelo
6c70cb697bedd447ff4907f91809d379f4901b1d test(49-39): SJT caso aberto com imperativo nu (flag) exige nota gravada, pendente_humano e o motivo (RED)
87b402344c5c5630eab426bdacddaa52ccf69195 feat(49-39): triagem grava o sinal (flag) em flags da análise, sem mexer em nota nem status
307e759b50d0581e8df37f8c2533669aac20e3bc test(49-39): triagem — resposta com imperativo nu (flag) gera análise sucesso com o sinal em flags (RED)
f9ab3f453ebd4f52d2ce3c2cb2f21a291ceee086 docs(49-38): STATE e ROADMAP — 49-38 concluído, fase 49 segue executing (38/43)
e61fd8bccfafbbafda5822251e042dad751acce7 docs(49-38): SUMMARY do sinal (flag) no callAi e da migration do cron ensaiada
5f483acfde0df5d2eb3a4f6fc9c97bc370022c6d feat(49-38): migration do cron ai-cost-aggregation sem o evento do sinal (NÃO aplicada)
2c911d94107f6c6815cfdaacee4bb725e543c952 test(49-38): replay de entrada sinalizada volta marcado e sem linha nova; A1..A6 mordem
8df8ff442052393040cc76dcaf6e7bebd2716639 feat(49-38): callAi registra o sinal (flag) e devolve injection_flag sem cortar a chamada
bbd63e27b2ace37522aa379eb0bb98158a000989 test(49-38): contrato do sinal de revisão (flag) no callAi e em sinal-revisao (RED)
c8de7f26e96b0404c7f6888041b89ac925c4ca96 docs(49-37): STATE e ROADMAP — 49-37 concluído, fase 49 segue executing (37/43)
0f24c5fcf5dfda81a6f8dd969275fb60ce938efc docs(49-37): SUMMARY do GREEN do detector de injeção em três níveis
04bfcbb36878680d7ad6849267d0120d66d76b8a feat(49-37): detector de injeção em três níveis (block/flag/none) com as famílias B1..B3/F1..F5
35974c0c9d1ec7fc3ef44ab808fe1a04d8a08f78 docs(49-36): complete contrato de três níveis (RED) com corpus real de PROD
eecca0b122c3a065cac9f410a9ae0de1528bdbdb test(49-36): contrato de três níveis do detector de injeção (RED contra HEAD e d32d201f)
f881da95b8847e8f67cc37d63075f0da48b202a8 test(49-36): corpus real mascarado de PROD para o contrato de três níveis do detector
fe7814da1c131f635e571a50c2e83e4f9cf0cdfd feat(49-36): extração só-leitura de PROD com máscara M1..M5 e portões G1/G2 (tracer)
cd04178245c744e72e949fd805ea9d44d92c8105 test(49-36): portão G1 de PII do corpus real de injeção (RED — corpus ausente)
62b446d1893b4db884bf8deb496d2c1cc81e51f3 docs(49): STATE — fechamento de lacunas 2 planejado (49-36..49-43), decisão (a) do operador registrada
1545ee6034fb4172f60070fcd11dabf4150b8565 docs(49): revisão 4 dos planos 49-36/37/39 — quadro das listas fechadas com drop-one, rotas do resíduo com custos, atribuição da SJT ao planejador
324460316a5be8e52a241b9c0776156446f44cf1 docs(49): revisão 3 dos planos 49-36..49-43 pelo plan-checker — vírgula e «se/quando» fecham o bypass de prefixo do B1, resíduo R1/R2 com piso e ao operador, sinal no PDF do comparativo, inventário do cron, ensaio desfeito pelo arnês
14ffb1eb967ec592987d3e467fdde91d1b663356 docs(49): revisão dos planos 49-36..49-43 pelo plan-checker — pisos flag das formas rebaixadas, subjuntivo subordinado fora do BLOCK, evento de sinal fora do error_count, filtro≡célula no admin, onda 4 serializada
7ef73cdb5a3c505c7aaea2bad8a2ccd10c66d730 docs(49): plano de fechamento 2 do CR-01/JORN-41 — decisão do operador (a) block×flag (49-36..49-43)
6cb08ead52fe5bd962dbbf482bbb63fdd7f4ef92 docs(49): re-verificação pós-lacunas — gaps_found 12/13 (CR-01/JORN-41 segue aberto)
0b73f475778d376cec8c1023a1b1184060f5de97 docs(49): re-revisão dos consertos de lacunas (49-30..34) — CR-01 segue aberto
```

Pós-push (WR-17): `remoto = head (bc885734)`; o `remoto` avançou de `272458c0` para `bc885734`.

### D e E: as 7 EFs de IA

| EF | Antes → depois | status | `verify_jwt` (tabela) | fechamento antes → depois | marcadores antes → depois (`prompt_injection_flagged` / `classifyPromptInjection` / `instrucao_ao_modelo`) | módulos ≠ REV antes | depois: byte-iguais a REV |
|---|---|---|---|---|---|---|---|
| `analise-candidato-individual` | v33 → **v34** | ACTIVE | false | 11 → 12 (+ `sinal-revisao.ts`) | 0/0/0 → 20/23/4 | 4 `_shared` + `index.ts` | **12/12** |
| `avaliar-redacao-cultural` | v17 → **v18** | ACTIVE | true | 13 → 14 | 0/0/0 → 20/23/4 | 4 `_shared` + `index.ts` | **14/14** |
| `avaliar-transcricao-entrevista` | v20 → **v21** | ACTIVE | true | 14 → 15 | 0/0/0 → 20/23/4 | 4 `_shared` + `index.ts` | **15/15** |
| `comparativo-candidatos` | v31 → **v32** | ACTIVE | true | 13 → 14 | 0/0/0 → 20/23/4 | 4 `_shared` + `index.ts` | **14/14** |
| `gerar-devolutiva-bigfive` | v31 → **v32** | ACTIVE | false | 9 → 10 | 0/0/0 → 20/23/4 | 4 `_shared` | **10/10** |
| `gerar-guia-entrevista` | v23 → **v24** | ACTIVE | true | 13 → 14 | 0/0/0 → 20/23/4 | 4 `_shared` | **14/14** |
| `avaliar-redacao` (E, ÚLTIMA) | v23 → **v24** | ACTIVE | true | 11 → 12 | 0/0/0 → 20/23/8 | 4 `_shared` + `index.ts` | **12/12** |

- **Total: 92/92 módulos byte-iguais a REV.** Os «4 `_shared`» que diferiam antes são `ai-client`, `ai-error-codes`, `audit-logger` e `injection-detector`. A lista bate exatamente com a esperada pelo plano.
- **Controle:** os mesmos bundles «antes» davam 0 diferença contra `d6cb0159`, o disco que o 49-34 publicou.
- **Fechamento:** o `--dry-run` de cada EF deu 12/12/14/15/14/10/14, na ordem da lista do plano: o fechamento vivo + `functions/_shared/sinal-revisao.ts`, e nada mais.
- **Mordida, nas 7:** o mesmo comparador, estrito, sobre o bundle anterior saiu `FECHAMENTO DIVERGE` (falta `sinal-revisao.ts`).
- **Instrumento:** `cmpbundle.cjs` (scratchpad, md5 `82906ba81a210bd7ee0a99dd330952d6`).
  - O mapa de módulos vem do `--dry-run` do `efdeploy.cjs` de REV.
  - Exige que o fechamento dos sourcemaps seja igual ao dry-run e não vazio.
  - Compara cada `sourcesContent` com `git cat-file blob <REV>:supabase/<caminho>`. Nunca lê o disco.
- **`<verify>` 1:** as 8 linhas `… ACTIVE verify_jwt=…` batem com a tabela: `analise-candidato-individual v34`, `avaliar-redacao v24`, `avaliar-redacao-cultural v18`, `avaliar-transcricao-entrevista v21`, `comparativo-candidatos v32`, `gerar-devolutiva-bigfive v32`, `gerar-guia-entrevista v24`, `consolidar-decisao-final v10`.
- **`<verify>` 4:** `7 bundles com bloquear x sinalizar`.

### Prova de comportamento sem invocar PROD

- **Montagem:** os 15 módulos extraídos do bundle NOVO da `avaliar-transcricao-entrevista` (v21), mais, do export de REV:
  - `__tests__/injection-detector.test.ts`, `sinal-revisao.test.ts` e `ai-client.test.ts`;
  - `__tests__/fixtures/`;
  - `deno.json`.
- **Bundle novo:** `ok | 308 passed | 0 failed (17s)`, exit 0. **VERDE.**
- **Bundle anterior (v20, 14 módulos):** `FAILED | 196 passed | 112 failed (17s)`, exit 1. **VERMELHO.** O instrumento morde.

### Resíduo das abas antigas (WR-11)

- **Janela do resíduo:** do push do front, **2026-10-03T03:39:47Z (00:39 em Brasília)**, ao deploy de E, **2026-10-03T03:43:02Z (00:43 em Brasília)**. Uma aba do RH carregada ANTES do push guarda o `ConsolidacaoDashboard` antigo até recarregar.
- **Skew Protection da Vercel:** legível só por leitura (`vercel api /v9/projects/sistema-recrutamento`): `skewProtectionMaxAge=43200`, ou seja, 12 h. Uma aba antiga pode receber os chunks antigos por até 12 h em vez de 404. Nenhuma configuração da Vercel foi alterada.
- **Recomendação do planejador** (item 7 da Task 1; registrada como recomendação, não como ação do operador): avisar o RH para recarregar (F5) as abas do sistema abertas antes de 00:39 de 2026-10-03.

### Desfazer

Nada foi desfeito. A ordem e as regras estão no plano (E → D → C → B → A, contagem por leitura antes, conserto para frente depois da primeira linha sinalizada).

## Task 3: conferência do front e escrituração

- **`<verify>` 1** (build do export de REV): `marcadores em chunks lazy do build de REV: DecisaoFinalPage-C1M7Tmtd.js sinal-revisao-CaNcPgX4.js ai-error-codes-D-xkg7kc.js AiLogsPage-CxhVkx4L.js`.
- **No front servido**, por crawler, além do que o plano pede: `instrucao_ao_modelo` está em `sinal-revisao-2K646GbY.js`; `prompt_injection_flagged` está em `AiLogsPage-DRThI8kz.js` e `ai-error-codes-D-xkg7kc.js`. O `instrucao_ao_modelo` mora no chunk compartilhado e não prova o CR-02 sozinho: quem prova é o `decisao-sjt-sinal-revisao`.
- **STATE (`fb79d29e`):**
  - a linha da 49-11 ficou byte-igual;
  - logo abaixo dela, a correção datada (2026-10-03): a `consolidar` importa `_shared/sinal-revisao.ts` desde `483e25ae`, e foi publicada v9 → v10 com `verify_jwt=true` e `sinais_revisao` 0 → ≥ 1;
  - no fim de `### Pending Todos`, as pendências JORN-39 («1- sim, 2- decidir depois», 2026-09-30) e WR-07 («B», 2026-10-01, com o texto literal da opção (b), a glosa marcada como do planejador e a nota para o próximo plano de lacunas);
  - `<verify>` 2: `STATE: linha da 49-11 intacta, correcao logo abaixo, pendencias registradas`.
- **REQUIREMENTS (`fb79d29e`):**
  - a célula do JORN-41 agora começa por «Gaps Found — CR-01 reaberto na re-verificação de 2026-09-30; decisão do operador (a) bloquear×sinalizar entregue (49-36..49-42) e no ar nas 7 EFs (49-43); aguarda re-verificação.», com o texto anterior inteiro depois de «Histórico:»;
  - o item segue `- [ ]` e ganhou o complemento do plano;
  - **simulação do `mark-complete JORN-41` numa cópia:** `"updated": false`, `"not_found": ["JORN-41"]`, `"total": 1`;
  - `<verify>` 3: `JORN-41 resiste ao mark-complete`.
- **Push enumerado da Task 3:**
  - `fb79d29ef77419389904f244787a7b4a4c1b2ec6 docs(49-43): JORN-41 anotado à espera do verificador; STATE corrige a linha da 49-11 sobre a consolidar e registra as pendências do operador`;
  - `PUSH ENUMERADO: 1 commits, todos de BASE..REV (71) ou proprios (2)`;
  - `bc885734..fb79d29e -> main`;
  - pós-push (WR-17): `remoto = head (fb79d29e)`; `origin/main..HEAD` vazio;
  - Vercel `success` às 03:46:35Z, e o crawler seguiu PRESENTE às 03:46:53Z.
- **Commits próprios, cada um conferido** (HEAD^ = `head`, pathspec exato, assunto `docs(49-43): `) e anexado ao `head`:
  - `bc885734`: só `docs/compliance/cron-inventory.md`;
  - `fb79d29e`: só `.planning/REQUIREMENTS.md` e `.planning/STATE.md`.
- **Limpeza** (depois de tudo verde): export, `.tar` e os três programas removidos de `$TMPDIR`. Os 4 refs `refs/gsd/49-43/*` ficam: `rev`=`57da895e`, `base`=`272458c0`, `head`=`remoto`=`fb79d29e`.

## Task Commits

1. **Task 1:** sem commit (só conferência; o -7 já estava commitado como `57da895e`, pelo orquestrador).
2. **Task 2 (tracer):** `bc885734` (docs, inventário do cron). A publicação em si não gera commit: migration, 8 EFs e front.
3. **Task 3:** `fb79d29e` (docs, REQUIREMENTS + STATE).

**Metadados do plano:** o commit do SUMMARY/STATE/ROADMAP vem depois deste arquivo e **não é publicado por este plano** (ver Decisões).

## Decisions Made

- Os ajustes de execução vindos do 49-REVIEW-GAPS-7 (WR-17, WR-18, WR-19) foram aplicados sem tocar o plano, por instrução do orquestrador, porque mudar o plano exigiria um `-8`.
- A prova das 7 EFs foi feita por programa (`cmpbundle.cjs`), e não por inspeção.
- Os commits de metadados ficam locais, conforme o plano: «o SUMMARY e o STATE do executor vêm depois, e este plano não os publica». O `gsd-49-43-push.cjs` também os recusaria, porque o SUMMARY e o ROADMAP estão fora do pathspec permitido. Publicá-los é decisão do orquestrador.

## Deviations from Plan

1. **[Execução, origem 49-REVIEW-GAPS-7] WR-17, WR-18, WR-19 e IN-19 aplicados na execução, sem editar o plano.**
   - Pós-push pelo comando do WR-17 nas duas vezes.
   - Prova byte a byte nas 7 EFs, `avaliar-redacao` inclusive (WR-18; a regra 5 dizia «6»).
   - Conferência do intervalo pelo comando literal do WR-19.
   - Nenhum commit antes do passo 0 (IN-19).
2. **[Instrumento] Contador do smoke p42 lido explicitamente.** O `p46apply.cjs run` não devolve `NOTICE`s, e o exit 0 só prova que nada levantou. Para mostrar o 4/4 positivamente, o mesmo arquivo do export foi reenviado pelo `sql`, seguido de `SELECT current_setting('smoke42i.pass', true)`, com o GUARDA no comando. É 100% catálogo, sem escrita.
3. **[Instrumento] Comparador literal do `<verify>` 5 rodado por `node -e "$(cat arquivo)"`.** Rodar o mesmo texto como `node arquivo.js` desloca o `argv` e deu `REV AUSENTE`, o que é sintoma do instrumento e não do bundle. O texto foi conferido com `cmp` contra a linha 586 do plano.
4. **[Ordem de leitura] Os bundles «antes» das 8 EFs foram capturados juntos, antes do passo A**, e não imediatamente antes de cada deploy. Só leitura. Cada deploy devolveu exatamente a versão anterior +1, então ninguém publicou entre a captura e o deploy.
5. **[Evidência extra]** Crawler dos outros dois marcadores no front servido, e crawler de novo depois do deploy da Task 3.

**Total:** 5. Nenhuma muda o que foi publicado nem a ordem.

## Issues Encountered

- O primeiro laço de `<verify>` composto quebrou no zsh por causa de uma linha `====` usada como separador (`=` é expansão no zsh). Os `<verify>` foram re-rodados separados e literais.

## Known Stubs

Nenhum.

## User Setup Required

Nenhum. **Recomendação do planejador ao operador (não é ação registrada):** avisar o RH para recarregar (F5) as abas do sistema abertas antes de 2026-10-03 00:39 (Brasília).

## Next Phase Readiness

- **JORN-41 aguarda o verificador.** Ainda falta a prova ponta a ponta em PROD (human_verification/UAT):
  - colar um imperativo nu na tela e ver a linha-evento `prompt_injection_flagged` em `ai_call_logs`;
  - ver o rótulo nas telas;
  - numa SJT caso aberto sinalizada, ver o aviso `decisao-sjt-sinal-revisao` na Decisão Final.
- **Pendências do operador no STATE:**
  - JORN-39 (eventos de bloqueio contados como erro), «decidir depois»;
  - WR-07 (RH sem acesso ao texto da SJT caso aberto), «B», que vira plano novo;
  - pergunta aberta IN-07.
- **Metadados locais:** o commit do SUMMARY/STATE/ROADMAP fica em `origin/main..HEAD` até o orquestrador decidir publicá-lo.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-10-03*

## Self-Check: PASSED

- FOUND: `49-43-SUMMARY.md`, `docs/compliance/cron-inventory.md` (seção «Re-coleta da Phase 49»)
- FOUND: commits `57da895e` (o -7), `bc885734` (inventário), `fb79d29e` (REQUIREMENTS + STATE) em `git log`
- `git ls-remote origin refs/heads/main` = `fb79d29e` = `refs/gsd/49-43/head` = `refs/gsd/49-43/remoto`
- `<verify>` da Task 2: 8 EFs ACTIVE / `verify_jwt` pela tabela; cron/ledger; inventário com o md5 vivo; 7 bundles com bloquear x sinalizar; consolidar 3/3 byte-iguais a REV; portão do front morde; crawler PRESENTE. Todos verdes
- `<verify>` da Task 3: marcadores em chunks lazy do build de REV; STATE; JORN-41 resiste ao mark-complete. Todos verdes
- `grep -cE '^- \[x\] \*\*JORN-41\*\*' .planning/REQUIREMENTS.md` = 0
