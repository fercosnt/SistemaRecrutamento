---
phase: 44-exporta-o-acesso
plan: 13
subsystem: compliance
tags: [lgpd, export, art-18-ii, g5, allowlist, publicacao, vercel, edge-function, prod]

requires:
  - phase: 44-exporta-o-acesso
    provides: "44-11: allowlist 1.4.0; 44-12: (l) e Deno (19) mordendo, smoke aprova contra PROD"
provides:
  - "arquivo legível com rótulos em português de produto para retencao_hold, cognitivo_liberacao e as 6 colunas técnicas do G5 (caso (p5))"
  - "front publicado na Vercel (SHA 4aa9f2ca, dpl_4WevCfL9XCKe6eQAxzzuBqyyJUCN, Ready, production) com os marcadores no chunk index-BgK7K5Is.js"
  - "EF exportar-meus-dados v6 (V0 = 5), ACTIVE, verify_jwt true, corpo com 1.4.0 / retencao_hold / cognitivo_liberacao"
  - "EXPORT-02 em REQUIREMENTS: PROD roda 1.4.0 desde 06/10/2026"
affects: [re-verificação da Phase 44]

estimate:
  tokens: 75000
  tasks: 3
actuals:
  tokens: 3468     # chars/4 sobre as linhas ACRESCENTADAS de 18e96fad..4aa9f2ca + o diff do REQUIREMENTS (13875 chars)
  tasks: 3
  commits: 2       # git rev-list --count 18e96fad..HEAD no momento desta escrita (38455e5f, 4aa9f2ca); o commit que carrega este SUMMARY e o de STATE/ROADMAP vêm depois
plan_head_before: 18e96fadc6411304a644f7b469fedd743843d44d
plan_head_after: 4aa9f2ca21484e375d4d6abba104a8dd7b69427d

tech-stack:
  added: []
  patterns:
    - "portões sobre a árvore exata: código commitado ANTES dos portões, GATES_SHA registrado, publicação só se GATES_SHA..HEAD tocar só .planning/"
    - "sonda de DDL numa requisição que sempre termina em erro (SELECT 1/0 no fim): nada persiste mesmo que o portão não morda; o discriminador é a mensagem, não o exit"
    - "publicação em dois canais na ordem segura: front (Vercel) antes da EF, marcador conferido no publicado de cada um"

key-files:
  created:
    - .planning/phases/44-exporta-o-acesso/44-13-SUMMARY.md
  modified:
    - src/features/privacidade/services/exportacaoService.ts
    - src/features/privacidade/services/__tests__/exportacaoService.test.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Rótulos explícitos para as 2 tabelas e as 6 colunas técnicas do G5; motivo/criado_em/liberado_em/revogado_em/cancelado_em ficam com o humanizador; recibo_enviado_em sem rótulo (fora da cópia)"
  - "Re-revisão independente (gsd-code-review) não rodou: o workflow exige Agent(gsd-code-reviewer) e o executor não tem ferramenta de agente; valeram os itens 1 e 3 do Task 2, mais uma leitura do diff pelo próprio executor"
  - "Publicado: front 797c6110..4aa9f2ca (24 commits, todos no conjunto autorizado) antes da EF v5 → v6"

requirements-completed: [EXPORT-02]

coverage:
  - id: D1
    description: "(p5): tabelas e colunas do G5 com rótulo legível; vermelho antes do verde"
    requirement: "EXPORT-02"
    verification:
      - kind: unit
        ref: "npx vitest run src/features/privacidade → 155/155 (antes: (p5) 1 failed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Portões sobre GATES_SHA 38455e5f: re-revisão do artefato, suíte inteira, smoke limpo, três mordidas sem resíduo"
    requirement: "EXPORT-02"
    verification:
      - kind: integration
        ref: "dois <automated> do Task 2 sob bash — «re-revisado, suite e banco limpos» e «portao mordeu nas tres direcoes, sem residuo»"
        status: pass
    human_judgment: false
  - id: D3
    description: "Publicação: front com marcador no chunk publicado; EF v6 ACTIVE verify_jwt true com 1.4.0 no corpo"
    requirement: "EXPORT-02"
    verification:
      - kind: integration
        ref: "vercel inspect rh.beautysmile.com.br → dpl_4WevCfL9XCKe6eQAxzzuBqyyJUCN Ready; GET functions/exportar-meus-dados → version 6; body grep 1.4.0/retencao_hold/cognitivo_liberacao"
        status: pass
    human_judgment: false

duration: ~9min (ledger 2026-10-06T21:09:16Z → REQUIREMENTS ~21:16Z)
completed: 2026-10-06
status: complete
---

# Phase 44 Plan 13: publicação do G5 — Summary

**A cópia que o titular pede hoje é a 1.4.0 nos dois canais. O front está publicado pela Vercel: SHA `4aa9f2ca`, deployment `dpl_4WevCfL9XCKe6eQAxzzuBqyyJUCN`, estado Ready, com os rótulos novos no chunk `index-BgK7K5Is.js`. A EF `exportar-meus-dados` está na v6 (antes v5), ACTIVE, com `verify_jwt` true e a allowlist 1.4.0 no corpo publicado. Antes disso, os portões aprovaram a árvore exata que subiu: GATES_SHA `38455e5f`, re-revisão do artefato 0/0/2/4/17, suíte inteira só com as 2 falhas pré-existentes, e o portão visto mordendo nas três direções sem deixar resíduo.**

## Task Commits

1. **Task 1: rótulos do arquivo legível + (p5)**: `38455e5f` (feat)
2. **Task 2: portões + SUMMARY parcial com GATES_SHA**: `4aa9f2ca` (docs)
3. **Task 3: REQUIREMENTS + este SUMMARY**: o commit que carrega este arquivo (docs), seguido do commit de STATE/ROADMAP e do push final

## Arquivo legível (Task 1, commit `38455e5f`)

- `COPY_ARQUIVO.rotuloTabela`: `retencao_hold` → «Conservação dos seus dados além do prazo»; `cognitivo_liberacao` → «Liberação da avaliação cognitiva».
- `COPY_ARQUIVO.rotuloColuna`, seis entradas novas: `faixa_etaria_materializada` → «Faixa etária registrada»; `encerrada_a_pedido_em` → «Encerrada a seu pedido em»; `executar_em` → «Data prevista para a execução do pedido»; `storage_concluido_em` → «Etapa dos arquivos concluída em»; `postgres_concluido_em` → «Etapa do cadastro concluída em»; `auth_concluido_em` → «Etapa da conta de acesso concluída em». Nenhuma para `recibo_enviado_em`.
- **(p5) vermelho antes do verde:** `npx vitest run …/exportacaoService.test.ts -t "p5"` antes da implementação → `Tests  1 failed | 49 skipped (50)`, falha em `expect(html).toContain('<h2>Conservação dos seus dados além do prazo</h2>')` (o HTML trazia o título humanizado pelo fallback). Depois: `npx vitest run src/features/privacidade` → `Test Files 10 passed (10) · Tests 155 passed (155)`, exit 0; `tsc` = 89 (`error TS` contados; 0 em `privacidade`); `grep -c "Conservação dos seus dados além do prazo" exportacaoService.ts` = 1. Hook do commit: `tsc errors: 89 (frozen baseline: 96)`.
- (t) (strings banidas) verde.
- Colisão de rótulo: `rotuloColuna` é indexado por NOME de coluna, não por tabela. Medido na allowlist 1.4.0: cada uma das seis chaves existe em exatamente UMA tabela exportada (`faixa_etaria_materializada` só em `candidatos`, `encerrada_a_pedido_em` só em `candidaturas`, as outras quatro só em `solicitacoes_dados`), então nenhum rótulo novo cai em coluna homônima de outra tabela.

## Antes de publicar (Task 2)

GATES_SHA: 38455e5f8794fbc95999c7aa9f1756ba92b00997

Os dois `<automated>` do Task 2 foram rodados LITERAIS, salvos em script e executados com `bash` (o shell da sessão é zsh), sobre o HEAD `38455e5f`, que é o commit do Task 1. Os dois imprimiram a linha final e saíram com exit 0.

### 1 · Re-revisão do artefato contra `origin/main` (`797c6110`)

Saída do primeiro comando:
```json
{"versao":["1.3.0","1.4.0"],"removidas_exportadas":[],"removidas_excluidas":[],"tabelas_novas":["cognitivo_liberacao","retencao_hold"],"excluidas_novas":["config_janela_exclusao","config_purga","purga_execucao_itens","purga_execucoes"],"exportadas_novas":["candidatos.faixa_etaria_materializada","candidaturas.encerrada_a_pedido_em","cognitivo_liberacao.candidatura_id","cognitivo_liberacao.id","cognitivo_liberacao.liberado_em","cognitivo_liberacao.motivo","cognitivo_liberacao.revogado_em","retencao_hold.candidatura_id","retencao_hold.criado_em","retencao_hold.id","retencao_hold.liberado_em","retencao_hold.motivo","solicitacoes_dados.auth_concluido_em","solicitacoes_dados.cancelado_em","solicitacoes_dados.executar_em","solicitacoes_dados.postgres_concluido_em","solicitacoes_dados.storage_concluido_em"]}
```
Conferência item a item das 17 exportadas novas contra o `<interfaces>`: as 13 com veredito (`faixa_etaria_materializada`, `encerrada_a_pedido_em`, `executar_em`, `cancelado_em`, `storage/postgres/auth_concluido_em`, `retencao_hold.{motivo, criado_em, liberado_em}`, `cognitivo_liberacao.{liberado_em, revogado_em, motivo}`) mais `id`/`candidatura_id` das duas tabelas = 17. Não aparecem `plano` nem `recibo_enviado_em`. Zero coluna removida e zero exclusão removida.

### 2 · Re-revisão independente: indisponível neste executor

A skill `gsd-code-review` está na lista do executor e foi carregada (`44 --files <os 11 arquivos de código de origin/main..HEAD>`). O workflow dela (`~/.claude/gsd-core/workflows/code-review.md:770`) despacha `Agent(subagent_type="gsd-code-reviewer")`, e este executor **não tem ferramenta de agente**. Além disso, o workflow grava em `44-REVIEW.md`, que já existe com a revisão anterior da fase. **A re-revisão independente não rodou.** Seguindo o plano, o que vale como re-revisão possível são os itens 1 e 3.

Para não ficar só nisso, o executor leu o diff de código de `origin/main..HEAD`. Isto é leitura do próprio executor, não revisão independente. São 13 arquivos fora de `.planning/`, com 2165 inserções e 122 remoções:
- `exportacaoService.ts`: +13 linhas, só entradas de rótulo e comentário. Nenhuma lógica mudou e o fallback `rotularTabela`/`rotularColuna` continua igual.
- `gen-export-allowlist.cjs`: flag nova `--sql-values-tabelas` (`paresTabelas`). Não muda a geração da allowlist.
- `p46apply.cjs`: lembrete BD-14 no `migrate`, só `console.log`.
- `export-scope-rules.yaml`: só acréscimos de veredito/disposição e a contagem de cobertura (69 → 75), com o histórico preservado.
- A EF `exportar-meus-dados/index.ts` **não mudou**. Ela lê as tabelas novas pelo caminho genérico `via:candidaturas`, e o Deno (19) prende isso.

Achado BLOCKER/CRITICAL: **nenhum.**

### 3 · Suíte inteira, `deno`, `tsc`, `check:*`, smoke limpo

- `npx vitest run --reporter=json`: 220 arquivos, **2419 testes**, 2417 passaram e **2 falharam**, ambas em `__tests__/promessasComExecutor.test.ts`, que é 1 arquivo de 220:
  - «Metade 1 — o registro curado: toda promessa nomeada tem executor provado no disco · deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…»
  - «Deferimento com prazo: a fase dona é conferida contra o roadmap, nos dois sentidos · fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos»

  São as 2 falhas pré-existentes nomeadas no plano (`faseDona 'Phase 46'`, registradas no `deferred-items.md` pelo 44-11). Não há nenhuma outra. 2419 ≥ baseline 2415 (+1 é a (p5); o resto é a (l) do 44-12 e testes entrados depois da medição do planejador).
- `deno test --allow-all supabase/functions/exportar-meus-dados/` → `ok | 21 passed | 0 failed`.
- `tsc` (`error TS`) = 89, dentro do limite de 89.
- `check:export-allowlist`, `check:recibo-exclusao`, `check:matriz-retencao`, `check:pii-inventory-md` → os quatro `OK`, exit 0.
- Smoke contra PROD, agora (`node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql`, 33118 octetos, SEM registro no ledger):
  ```json
  {"smoke":"p44_export_drift","pass":true,"n_tabelas_vivas":75,"n_tabelas_com_disposicao":75,"n_tabelas_em_escopo":32,"n_colunas_vivas_em_escopo":451,"n_pares_com_veredito":451,"n_drift":0}
  ```
  As populações são idênticas às do 44-12. Nenhuma coluna da allowlist sumiu do banco.

### 4 · O portão morde com o banco em zero (segundo comando, iniciado em 2026-10-06T21:11:20Z)

| | Entrada | Saída (literal) |
|---|---|---|
| ausência ANTES | `SET TRANSACTION READ ONLY; SELECT to_regclass('public.p44_sonda_drift') IS NULL AS ausente` | `"ausente": true` |
| (i) sonda | `CREATE TABLE public.p44_sonda_drift (id int);` + smoke literal + `SELECT 1/0;` (725 linhas, 33177 octetos) | `HTTP 400 … P0001: P44-DRIFT FAIL: n_drift=1 · populações: n_tabelas_vivas=76 n_tabelas_com_disposicao=75 n_tabelas_em_escopo=32 n_colunas_vivas_em_escopo=451 n_pares_com_veredito=451 · linhas: p44_sonda_drift — TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml` |
| ausência DEPOIS | a mesma leitura | `"ausente": true` |
| (ii) coluna | smoke sem `    ('retencao_hold','detalhe'),` (722 → 721 linhas; a linha 535 fica entre `criado_por` e `liberado_por`) | `P44-DRIFT FAIL: n_drift=1 · … n_pares_com_veredito=450 · linhas: retencao_hold.detalhe — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml` |
| (iii) tabela | smoke sem `    ('purga_execucao_itens','telemetria_interna'),` (722 → 721 linhas; a linha 591 fica entre `prompt_versions` e `purga_execucoes`) | `P44-DRIFT FAIL: n_drift=1 · … n_tabelas_com_disposicao=74 … · linhas: purga_execucao_itens — TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml` |

Quem decide a sonda é o `P44-DRIFT FAIL` que nomeia `p44_sonda_drift`, e ele apareceu antes de o `SELECT 1/0` ser alcançado: o `RAISE` aborta a requisição primeiro. A requisição terminou em erro e reverteu inteira, como mostra a ausência lida depois. `git status --porcelain -- supabase/tests docs/compliance` saiu vazio. Os scratches ficaram em `mktemp -d`, fora do repositório.

Linha final do comando: «portao mordeu nas tres direcoes, sem residuo» (exit 0).

## Publicação (Task 3)

### Precondições (somente leitura)

- (a) `git diff --name-only 38455e5f..HEAD` listou só `.planning/phases/44-exporta-o-acesso/44-13-SUMMARY.md`. Os portões aprovaram o código que sobe.
- (b) `git fetch origin`: `origin/main` = `797c611022f4…` e `git rev-list --count HEAD..origin/main` = **0**.
- (c) Token presente no Keychain (`security find-generic-password … -w` com exit 0; valor não impresso).

### 1 · Lista do que sobe, conferida antes do push

O script do verify (mesmas regex de assunto e de arquivo) rodou sobre `git log --format=@@@%s --name-only origin/main..HEAD`: `commits=24 fora=[]`. Foi repetido imediatamente antes do push, depois de um novo `git fetch`, com o mesmo resultado (`commits=24 fora=[]`). `origin/main` ainda era `797c6110` e `HEAD..origin/main` = 0. Nenhuma janela concorrente. `git status --short` mostrou só as três mudanças alheias de antes da fase (`.planning/ui-reviews/.gitignore`, `docs/specs/DRAFT-banco-sjt-marketing.md`, `docs/vagas/`), que não foram commitadas e não subiram.

### 2 · Front PRIMEIRO

| | Antes | Depois |
|---|---|---|
| `git push origin main` (2026-10-06T21:13:22Z) | `origin/main` = `797c6110` | `797c6110..4aa9f2ca  main -> main` |
| status do commit na Vercel (`gh api …/commits/4aa9f2ca…/statuses`) | `pending` 21:13:29Z | `success` 21:13:56Z «Deployment has completed» |
| `vercel inspect rh.beautysmile.com.br` | — | `id dpl_4WevCfL9XCKe6eQAxzzuBqyyJUCN · target production · status ● Ready` (o mesmo deployment que o status do commit aponta) |
| índice eager publicado | `assets/index-xHiBTNZs.js` | `assets/index-BgK7K5Is.js` |
| JS publicado com `retencao_hold` E «Conservação dos seus dados além do prazo» (índice e todos os `assets/*.js` referenciados até ponto fixo, 50 arquivos) | **nenhum** | **`index-BgK7K5Is.js`** |

O marcador está no índice eager, porque o `exportacaoService` continua lá, como o planejador mediu. A busca percorreu todos os chunks e não só o índice, então o resultado não depende disso.

### 3 · EF DEPOIS (o marcador do front já tinha sido conferido)

| | V0 (medido 2026-10-06T21:15:17Z) | depois (`efdeploy` em 21:15:22Z) |
|---|---|---|
| `version` | **5** | **6** (= V0 + 1, comparado com a medição) |
| `status` | ACTIVE | ACTIVE |
| `verify_jwt` | true | true |
| `ezbr_sha256` | `4b8208a1…c8f1` | `c6825fe8…5a48` |
| corpo publicado (`grep -a -c`): `1.3.0` / `1.4.0` / `retencao_hold` / `cognitivo_liberacao` | 2 / 0 / 0 / 0 | **0 / 2 / 4 / 2** |

- `node efdeploy.cjs exportar-meus-dados --dry-run`, fechamento de imports: `functions/_shared/exportAllowlist.ts (56463 bytes)` e `functions/exportar-meus-dados/index.ts (19937 bytes)`, com `verify_jwt=true`. Contém `_shared/exportAllowlist.ts`.
- `node efdeploy.cjs exportar-meus-dados` → `efdeploy: OK · version=6 · status=ACTIVE · verify_jwt=true` (subiu também `functions/deno.json` como import map).
- Sonda de leitura depois do deploy: `POST` sem JWT → **401** (o gateway continua barrando) e `OPTIONS` com `Origin: https://rh.beautysmile.com.br` → **200** (o preflight CORS continua respondendo).

Ordem registrada: o push e o marcador do front vieram às 21:13:22Z–21:14Z, e o `efdeploy` real às 21:15:22Z. No intervalo, o ar teve front novo com EF velha (a cópia 1.3.0 com os rótulos novos), nunca o contrário.

### 4 · REQUIREMENTS

`git diff -U0 .planning/REQUIREMENTS.md` mostra só dois blocos, `@@ -93 +93 @@` e `@@ -369 +369 @@` (2 inserções e 2 remoções):
- linha 93 (EXPORT-02): «PROD roda **1.4.0** desde 06/10/2026 (EF `exportar-meus-dados` v6, fecho do G5)»
- linha 369 (rastreabilidade): «PROD roda **1.4.0** desde 06/10/2026 (EF v6, fecho do G5; 1.3.0 de 24/09 a 06/10)»

A ressalva «exercitado na allowlist **1.1.0**» ficou nas duas linhas. Nenhum outro requisito mudou.

### 5 · Push final

Depois do commit deste SUMMARY com o REQUIREMENTS e do commit de STATE/ROADMAP, a checagem de conjunto do item 1 é repetida, vem o `git push origin main`, e roda o `<automated>` do Task 3: EF, corpo, `origin/main..HEAD` vazio, `797c6110..origin/main` dentro do conjunto e marcador no front. Como este arquivo vai dentro do próprio push, o resultado desse último passo não pode estar escrito aqui. Ele está no retorno ao orquestrador.

## Pendências do re-verificador

- **Aplicar o override BD-14 (cadência manual)** ao must-have de recorrência do portão do SC#3. O bloco está verbatim em `44-CONTEXT.md` §«Adendo 2026-10-06 — G5» e em `44-10-SUMMARY.md` §«Override para o re-verificador (BD-14)»:
  ```yaml
  overrides:
    - must_have: "O portão do SC#3 que vê o banco (drift do export: universo de tabelas e colunas = catálogo vivo de public) roda de forma recorrente/automática"
      accepted_by: "operador (Fernando) — via pergunta do orquestrador (AskUserQuestion) em 2026-10-06, opção «Universo do banco + smoke»"
      accepted_at: "2026-10-06"
  ```
  (`reason` completo nos dois arquivos citados.) A obrigação que o override impõe foi cumprida neste plano: o smoke rodou contra PROD imediatamente antes da publicação (`n_drift` 0).
- **A re-revisão independente de código (`gsd-code-review`) não rodou** neste executor (ver Task 2, item 2). Se o re-verificador quiser essa camada, ela continua pendente para os 13 arquivos de código de `797c6110..4aa9f2ca`.
- Continuam fora deste gap as 2 falhas pré-existentes de `src/__tests__/promessasComExecutor.test.ts` (`deferred-items.md`, 44-11).
- O U1 do EXPORT-02 (exercitado na 1.1.0) continua sendo aceite, não prova. Ninguém pediu uma cópia real na 1.4.0 neste plano.

## Deviations from Plan

### Ajustes

**1. [Rule 3 - ferramenta] A re-revisão independente não pôde ser despachada**
- **Found during:** Task 2, item 2
- **Issue:** a skill `gsd-code-review` foi carregada, mas o workflow dela despacha `Agent(subagent_type="gsd-code-reviewer")` e este executor não tem ferramenta de agente. Rodar o workflow à mão também reescreveria o `44-REVIEW.md` existente.
- **Fix:** o plano prevê o caso («registrar no SUMMARY e seguir com os itens 1 e 3»). Além disso, o executor leu o diff de código de `origin/main..HEAD` e conferiu que nenhuma das 6 chaves novas de `rotuloColuna` colide com coluna homônima de outra tabela exportada. Nada foi achado.
- **Commit:** nenhum.

**2. [Rule 3 - ferramenta] Os `<automated>` rodaram sob `bash`**
- Mesma razão do 44-12: o shell da sessão é zsh. Os comandos foram salvos sem alteração em scripts e executados com `bash`.

**3. [Rule 2 - verificação a mais] Prova de qual deployment está no ar, e sonda 401/200 da EF**
- O plano pedia o marcador no site publicado. O executor também amarrou o alias de produção ao deployment do SHA empurrado (`vercel inspect`), para que o resultado não fosse uma carga em cache, e conferiu que o gateway da EF continua barrando chamada sem JWT e respondendo ao preflight.

O resto foi executado como escrito.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova. As mitigações T-44-71..T-44-77 foram aplicadas e conferidas por execução:
- T-44-71: GATES_SHA, re-revisão do artefato e suíte.
- T-44-72: `verify_jwt` true antes e depois, mais a sonda 401.
- T-44-73: smoke com `n_drift` 0.
- T-44-74: sonda com `SELECT 1/0`, ausência lida antes e depois.
- T-44-75: marcador nos dois canais.
- T-44-76: conjunto de commits conferido duas vezes antes do push, com `HEAD..origin/main` = 0.
- T-44-77: (p5) e (t).

## Self-Check: PASSED

- FOUND `38455e5f`, `4aa9f2ca`, `797c6110` (`git cat-file -e`)
- FOUND `src/features/privacidade/services/exportacaoService.ts`, `…/__tests__/exportacaoService.test.ts`, `.planning/REQUIREMENTS.md`
- `grep -c "Conservação dos seus dados além do prazo" exportacaoService.ts` = 1; `grep -c retencao_hold exportacaoService.test.ts` = 3; `grep -c 1.4.0 .planning/REQUIREMENTS.md` = 2
- Linha `GATES_SHA: 38455e5f8794fbc95999c7aa9f1756ba92b00997` presente, e o sha existe no repositório
