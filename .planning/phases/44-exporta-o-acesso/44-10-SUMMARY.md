---
phase: 44-exporta-o-acesso
plan: 10
subsystem: compliance
tags: [lgpd, export, art-18-ii, sc3, drift, portao, smoke, bd-14, g5, management-api]

requires:
  - phase: 44-exporta-o-acesso
    provides: "export-allowlist.json 1.3.0 + gen-export-allowlist.cjs (44-01/44-03, 48-17, 49-17) e o relatório 05-export-allowlist-drift.sql (44-03)"
  - phase: 46
    provides: "p46apply.cjs (Management API: um arquivo = uma requisição = uma transação)"
provides:
  - "gen-export-allowlist.cjs --sql-values-tabelas + paresTabelas(doc): disposição de toda tabela conhecida (69 pares na 1.3.0)"
  - "05-export-allowlist-drift.sql com universo de TABELAS = information_schema.tables de public medido na execução (CTEs disposicao_tabelas e tabelas_vivas; vereditos TABELA NOVA / TABELA COM DISPOSIÇÃO SUMIU)"
  - "supabase/tests/p44_export_drift_smoke.sql: o mesmo predicado como portão que falha alto (P44-DRIFT FAIL), com populações no resultado"
  - "exportAllowlist.test.ts: paresDoArquivo (3 marcadores, cada um 1x, em ordem), disposicaoAchatada, (k) sobre os dois arquivos, (k2) vereditos idênticos, (e) testa a negação do EXPORT-06"
  - "genExportAllowlist.test.ts: caso (i2)"
  - "44-CONTEXT.md: adendo BD-9..BD-14 com autoria + override da cadência manual"
  - "p46apply.cjs migrate: lembrete BD-14 quando o corpo tem CREATE/DROP/ALTER TABLE"
  - "ROADMAP.md: SC#5 da Phase 44 reescrito para o EXPORT-06 aprovado"
affects: [44-11, 44-12, 44-13, re-verificação da Phase 44]

actuals:
  tokens: 15909
  tasks: 3
  commits: 4
plan_head_before: a016e56e39799a7ef433b957052f2b04b99448a7
plan_head_after: 396e48b1c24f98109a5281f21648b29b139ba608

tech-stack:
  added: []
  patterns:
    - "universo de comparação medido NA EXECUÇÃO (catálogo vivo × artefato), nunca contra snapshot nem contra o próprio artefato"
    - "relatório que lista + smoke que falha alto com o MESMO predicado, presos por asserção de igualdade de VALUES e de textos de veredito"
    - "população zero reprova (um banco não lido não aprova nada)"
    - "lembrete de obrigação colocado no ponto por onde todo apply passa (p46apply migrate), não em documento"

key-files:
  created:
    - supabase/tests/p44_export_drift_smoke.sql
  modified:
    - docs/compliance/sql/gen-export-allowlist.cjs
    - docs/compliance/sql/05-export-allowlist-drift.sql
    - docs/compliance/__tests__/exportAllowlist.test.ts
    - docs/compliance/__tests__/genExportAllowlist.test.ts
    - .planning/phases/44-exporta-o-acesso/44-CONTEXT.md
    - .planning/ROADMAP.md
    - p46apply.cjs

key-decisions:
  - "BD-14 implementado: universo de tabelas do drift do export = banco vivo; smoke p44_export_drift falha alto; cadência manual aceita como override escrito (CONTEXT + este SUMMARY)"
  - "Vereditos do G5 NÃO decididos aqui (prohibition do plano): o portão VÊ as 15 linhas; quem as resolve é o 44-11 (BD-9..BD-13)"
  - "BD-13 com autoria mista registrada item a item: (i)/(ii) orquestrador, (iii) planejador, (iv) operador verbatim «3 carimbos entram; recibo fora (Recommended)»"

patterns-established:
  - "paresDoArquivo: cada marcador de CTE asserido exatamente 1x e em ordem, com nome do arquivo na mensagem — marcador ausente não pode culpar o VALUES errado"

requirements-completed: [EXPORT-04, EXPORT-06]

coverage:
  - id: D1
    description: "Relatório de drift vê tabela nova no banco e reproduz sozinho as 15 linhas do G5 contra PROD"
    requirement: "EXPORT-04"
    verification:
      - kind: integration
        ref: "node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql (2026-10-06T20:41:46Z) — 15 = 6 TABELA NOVA + 9 COLUNA NOVA"
        status: pass
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Smoke p44_export_drift falha alto em drift e em população vazia; visto reprovando contra o drift real de PROD"
    requirement: "EXPORT-04"
    verification:
      - kind: integration
        ref: "node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql (2026-10-06T20:45:41Z) — exit 1, P44-DRIFT FAIL n_drift=15"
        status: pass
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "(e) testa a negação do EXPORT-06 e foi vista mordendo por mutação"
    requirement: "EXPORT-06"
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(e)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Gerador --sql-values-tabelas (caso i2)"
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genExportAllowlist.test.ts#(i2)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Registro: BD-9..BD-14 com autoria no CONTEXT, override da cadência manual, lembrete no p46apply, SC#5 reescrito"
    requirement: "EXPORT-06"
    verification:
      - kind: other
        ref: "verify do Task 3 (grep das chaves no CONTEXT, SC#5 na seção da Phase 44, p46apply migrate --dry-run com e sem DDL) — «registro ok»"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-10-06
status: complete
---

# Phase 44 Plan 10: o portão do SC#3 passa a ver o banco — Summary

**O drift do export compara agora o catálogo VIVO de `public` (tabelas e colunas, medidos na execução) com a disposição gerada da allowlist, num relatório e num smoke que falha alto; contra PROD os dois reproduziram sozinhos as 15 linhas do G5 que a verificação de 2026-10-06 tinha achado à mão.**

## Performance

- **Duration:** ~10 min (2026-10-06T20:38:57Z → 20:49Z)
- **Tasks:** 3/3
- **Files modified:** 8 (1 criado)
- **Commits de task:** 4 (Task 2 é TDD: RED + GREEN)

## Populações medidas (antes de qualquer booleano)

### Saídas do gerador (`wc -l`, allowlist 1.3.0, 2026-10-06)

| Comando | Linhas |
|---|---|
| `gen-export-allowlist.cjs --sql-values` | 378 |
| `gen-export-allowlist.cjs --sql-values-excluidas` | 49 |
| `gen-export-allowlist.cjs --sql-values-tabelas` | 69 (= `tabelas_em_escopo` 30 + `tabelas_excluidas` 39, lidos do `export-allowlist.json`) |
| Pares colados no smoke (`grep -c "^    ('"`) | 496 = 378 + 49 + 69 |

### Relatório `05-export-allowlist-drift.sql` contra PROD — 2026-10-06T20:41:46Z

`node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql` → exit 0.

População: **15 linhas** — 6 «TABELA NOVA NO BANCO», 9 «COLUNA NOVA NO BANCO», 0 «SUMIU» (nenhuma de coluna, nenhuma de tabela).

Nomes (só depois da população):

- TABELA NOVA: `cognitivo_liberacao`, `config_janela_exclusao`, `config_purga`, `purga_execucao_itens`, `purga_execucoes`, `retencao_hold`
- COLUNA NOVA: `candidatos.faixa_etaria_materializada`, `candidaturas.encerrada_a_pedido_em`, `solicitacoes_dados.{auth_concluido_em, cancelado_em, executar_em, plano, postgres_concluido_em, recibo_enviado_em, storage_concluido_em}`

É exatamente a lista do `<interfaces>` do plano: **nenhum drift novo desde 2026-10-06.** O `<verify>` literal do Task 1 imprimiu `{"total":15,"tabela_nova":6,"coluna_nova":9,"sumiu":0,…}` e «G5 reproduzido pelo relatorio: 15 linhas».

### Smoke `p44_export_drift_smoke.sql` contra PROD — 2026-10-06T20:45:41Z

`node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql` → **exit 1**. Mensagem de erro inteira, como voltou da Management API:

```
p46apply: HTTP 400: {"message":"Failed to run sql query: ERROR:  P0001: P44-DRIFT FAIL: n_drift=15 · populações: n_tabelas_vivas=75 n_tabelas_com_disposicao=69 n_tabelas_em_escopo=30 n_colunas_vivas_em_escopo=436 n_pares_com_veredito=427 · linhas: candidatos.faixa_etaria_materializada — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml | candidaturas.encerrada_a_pedido_em — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml | solicitacoes_dados.auth_concluido_em — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml | solicitacoes_dados.cancelado_em — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml | solicitacoes_dados.executar_em — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml | solicitacoes_dados.plano — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml | solicitacoes_dados.postgres_concluido_em — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml | solicitacoes_dados.recibo_enviado_em — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml | solicitacoes_dados.storage_concluido_em — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml | cognitivo_liberacao — TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml | config_janela_exclusao — TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml | config_purga — TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml | purga_execucao_itens — TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml | purga_execucoes — TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml | retencao_hold — TABELA NOVA NO BANCO — sem disposição em export-scope-rules.yaml\nCONTEXT:  PL/pgSQL function inline_code_block line 18 at RAISE\n"}
```

Populações: 75 tabelas vivas (o planejador mediu 75), 69 com disposição (planejador: 69), 30 em escopo, 436 colunas vivas em escopo, 427 pares com veredito. Coerência interna: 436 − 427 = 9 = as 9 «COLUNA NOVA»; 75 − 69 = 6 = as 6 «TABELA NOVA». O `<verify>` literal do Task 2 imprimiu «smoke mordeu no drift real de PROD» (nenhum «FALTOU», nenhum «SMOKE PASSOU COM DRIFT CONHECIDO»).

## Provas de mordida (cópias mutadas, nunca commitadas)

| Portão | Mutação no arquivo versionado | Falha observada | md5 antes | md5 depois |
|---|---|---|---|---|
| (k), bloco novo | `05-export-allowlist-drift.sql`: removida a linha `    ('ai_cost_daily','telemetria_interna'),` de `disposicao_tabelas` | `AssertionError: docs/compliance/sql/05-export-allowlist-drift.sql: o \`VALUES\` da CTE \`disposicao_tabelas\` envelheceu — rode --sql-values-tabelas: expected [ …(68) ] to deeply equal [ …(69) ]` · `- "ai_cost_daily.telemetria_interna"` · Tests 1 failed / 10 passed | `2d3b4c6a7b58cdfbf5f1f42070f98ec3` | `2d3b4c6a7b58cdfbf5f1f42070f98ec3` |
| (e) | `docs/compliance/export-allowlist.json`: a entrada da Phase 45 de `meta.consumidores` trocada pelo texto «ANTES» preservado no comentário do `export-scope-rules.yaml` («Phase 45 — plano de exclusão/anonimização: o escopo do titular exercitado em produção é o insumo do motor destrutivo (ERASE-02, ERASE-06)») | `× (e) …` · `AssertionError: a entrada da Phase 45 deve NEGAR o consumo: expected 'Phase 45 — plano de exclusão/anonimiz…' to contain 'NÃO consome'` (a (h) também reprovou, porque o espelho `.ts` deixou de bater — esperado) | `de25d8f23d55689e07ec9549195dfcae` | `de25d8f23d55689e07ec9549195dfcae` |

Depois das duas restaurações: `npm run -s check:export-allowlist` → OK; `git status --porcelain -- docs/compliance supabase/tests` vazio (após o commit do smoke).

## Accomplishments

- `gen-export-allowlist.cjs`: `--sql-values-tabelas` e `paresTabelas(doc)` (um par por tabela, pela mesma `emitirPares`), checada antes de `--sql-values`; docblock com o motivo (G5); cabeçalho «Colar SQL» com as três flags.
- `05-export-allowlist-drift.sql`: `disposicao_tabelas` (colada da saída do gerador), `tabelas_vivas`, `vivo` restrito pelas tabelas `escopo_titular` da disposição, `drift_coluna` (frases inalteradas) `UNION ALL` `drift_tabela` (duas frases novas), `ORDER BY veredito, tabela, coluna NULLS FIRST`. Cabeçalho: «O UNIVERSO DE TABELAS É O BANCO» substitui «ESCOPO DELIBERADO: COLUNA, NÃO TABELA», honestidade de número com os três comandos, baseline de 15 linhas, META-TEST com a direção de tabela (6b) e o ponteiro para o smoke.
- `p44_export_drift_smoke.sql`: `set_config('smoke44.r', (WITH … json_build_object …)::text, false)` → `DO $gate$` com os dois ramos `P44-DRIFT FAIL` → `SELECT json_build_object('smoke','p44_export_drift','pass',true, …populações…) AS resultado`. Sem escrita, sem `EXCEPTION WHEN OTHERS`, sem constante de contagem (as comparações são só `= 0` / `> 0`).
- `exportAllowlist.test.ts`: (k) itera os dois arquivos; (k2) prende os 5 literais de veredito; (e) reescrita com docblock sobre por que a anterior era oca.
- `44-CONTEXT.md`, `p46apply.cjs`, `ROADMAP.md` (só a linha do SC#5 — `git diff 396e48b1^..396e48b1 -- .planning/ROADMAP.md` = 1 linha removida, 1 adicionada; a seção segue com 5 SCs numerados).

## Task Commits

1. **Task 1 (TRACER): relatório vê o banco** — `12e11121` (feat)
2. **Task 2 (TDD): smoke que falha alto** — RED `0743f65f` (test) → GREEN `f5a7672e` (feat)
3. **Task 3: registro** — `396e48b1` (docs)

Tracer gate (modo interativo, `human_verify_mode` padrão, `<verify>` só automatizado): `<verify>` do Task 1 rodado de ponta a ponta e verde antes do Task 2 — sem checkpoint.

## TDD Gate Compliance (Task 2)

- **RED** (`0743f65f`): `npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts` → exit 1; 12 testes, 2 falhas, ambas as de alvo — `not ok 11 … (k) os três \`VALUES\` do relatório E do smoke…` e `not ok 12 … (k2) …`, com `AssertionError: supabase/tests/p44_export_drift_smoke.sql: arquivo ausente: expected false to be true`. A falha é sobre uma asserção do comportamento planejado, não um crash de carga.
- `gsd_run check tdd-red-evidence`: **RED_EVIDENCE_OK (target_test_failed, 12 testes / 2 falhas)**, com ressalva de ferramenta — ver Desvio 1: o verificador não resolve nomes de teste do Vitest, então o alvo registrado é o arquivo (`docs/compliance/__tests__/exportAllowlist.test.ts`); a evidência por nome é a saída TAP acima.
- **GREEN** (`f5a7672e`): 26/26 nos dois arquivos de teste.
- A (e) reescrita passa já no RED, por desenho: ela codifica o contrato que o artefato 1.3.0 já cumpre (a negação). A prova de que ela não é oca é a mutação da tabela acima, não o RED.
- REFACTOR: não foi necessário.

## Override para o re-verificador (BD-14)

```yaml
overrides:
  - must_have: "O portão do SC#3 que vê o banco (drift do export: universo de tabelas e colunas = catálogo vivo de public) roda de forma recorrente/automática"
    reason: "O operador escolheu cadência MANUAL (BD-14, 2026-10-06). O que a torna aceitável: o universo de tabelas agora é o banco medido na execução (não o artefato nem o snapshot de 2026-08-04), e o smoke supabase/tests/p44_export_drift_smoke.sql FALHA ALTO (RAISE EXCEPTION 'P44-DRIFT FAIL …', inclusive em população vazia) — foi visto reprovando contra o drift real de PROD em 2026-10-06 (44-10). Obrigação de execução: rodar `node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql` depois de todo apply que crie, renomeie ou remova tabela ou coluna em public, e antes de toda regeração da allowlist; o `p46apply.cjs migrate` imprime esse lembrete sempre que a migration contém CREATE/ALTER/DROP TABLE."
    accepted_by: "operador (Fernando) — via pergunta do orquestrador (AskUserQuestion) em 2026-10-06, opção «Universo do banco + smoke»"
    accepted_at: "2026-10-06"
```

(Idêntico ao bloco do `44-CONTEXT.md` §«Adendo 2026-10-06 — G5».)

## Lembrete no `p46apply.cjs` — conferido

- `node p46apply.cjs migrate --dry-run supabase/migrations/20260823000005_p46_retencao_hold_e_excecoes.sql` imprime `⚠ BD-14: esta migration mexe em tabela — depois do apply, rode \`node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql\` …` antes de `DRY-RUN — nada enviado.`
- O mesmo para `20261005000003_p50_rpcs_leitura_filas.sql` (0 ocorrências de `CREATE|DROP|ALTER TABLE` medidas com `grep -ciE`) **não** imprime o lembrete.
- Ledger antes/depois dos dois ensaios: `SELECT count(*) FROM supabase_migrations.schema_migrations` = 215 / 215.

## PROD — o que foi executado

Só leitura: o relatório `05` (SELECT), o smoke (SELECT + `set_config` + `DO … RAISE`, transação abortada pelo próprio RAISE), duas contagens do ledger e dois `migrate --dry-run` (nada enviado). Nenhuma escrita, nenhum apply, nenhum deploy, nenhum push.

## Deviations from Plan

### Auto-fixed / ajustes

**1. [Ferramenta] Registro de evidência RED: o verificador `check tdd-red-evidence` não lê nomes de teste do Vitest**
- **Found during:** Task 2 (RED)
- **Issue:** com saída JUnit, o regex `name="…"` do verificador casa dentro de `classname="…"` e todo caso vira o nome do arquivo; com TAP do Vitest (`tap-flat`), falta o resumo `# tests N` do `node --test` e o veredito é `zero_tests_discovered`.
- **Fix:** registro com a saída JUnit real e `targetTest` = o arquivo de teste → `RED_EVIDENCE_OK`. A evidência por nome (TAP `not ok 11 (k)`, `not ok 12 (k2)`) está na seção TDD acima. Nada foi fabricado na saída.
- **Commit:** — (sem mudança de código; defeito do verificador fora do repositório)

**2. [Rule 1 - texto falso no cabeçalho do `05`] três frases corrigidas além do pedido**
- «COMO EXECUTAR» mandava rodar pelo `execute_sql` do MCP no orquestrador; o plano roda por `p46apply.cjs run` — atualizado (a instrução antiga ficou registrada entre parênteses).
- «COLUNA EXCLUÍDA SUMIU» dizia que a Phase 45 herda o registro como plano de exclusão, o que o EXPORT-06 reescrito nega — corrigido com a redação antiga explicada.
- No bloco de mecanismos, a linha «tabela DECLARADA e não viva» seria lida como coberta pela consulta; não é (o gerador não põe em `tabelas` uma tabela que nunca existiu no catálogo) — a linha diz isso.
- **Commit:** `12e11121`

**3. [Rule 2 - portão] `paresDoArquivo` também asserta ORDEM dos três marcadores e existência do arquivo**
- Além do «exatamente uma vez» pedido: um marcador fora de ordem faria o recorte trocar blocos e culpar o `VALUES` errado; a asserção de existência é o que torna o RED do Task 2 uma falha de asserção, e não um `ENOENT`.
- **Commit:** `12e11121`, `0743f65f`

No resto, o plano foi executado como escrito. Nenhum veredito de coluna ou tabela foi criado (é do 44-11); a versão da allowlist segue 1.3.0.

## Known Stubs

Nenhum.

## Issues Encountered

Nenhum além do Desvio 1.

## Next Phase Readiness

- 44-11 pode dar os vereditos BD-9..BD-13: o portão já vê as 15 linhas e a (k) obriga a regerar os três `VALUES` nos dois arquivos.
- 44-12: depois dos vereditos, o smoke deve **aprovar** e o relatório deve devolver `[]` contra PROD — a primeira aprovação vista do portão.
- O META-TEST do `05` (passos 1-7, inclusive 6b) e a tabela-sonda do smoke só são prova com a baseline em zero drift — portanto depois do 44-11.

## Self-Check: PASSED
