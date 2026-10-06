---
phase: 44-exporta-o-acesso
plan: 11
subsystem: compliance
tags: [lgpd, export, art-18-ii, sc3, g5, allowlist, catalogo, bd-9, bd-10, bd-11, bd-12, bd-13]

requires:
  - phase: 44-exporta-o-acesso
    provides: "44-10: relatório 05 e smoke p44_export_drift com universo de tabelas = banco; (k) sobre os dois arquivos; BD-9..BD-14 com autoria no 44-CONTEXT"
provides:
  - "catalogo-vivo-44.json: acréscimo 44-11 medido (6 tabelas em `tabelas`, 24 colunas em `colunas`, 4 tabelas fora medidas com a checagem BD-12, nota «69 × 75»)"
  - "export-scope-rules.yaml 1.4.0: cognitivo_liberacao e retencao_hold em escopo; purga_execucao_itens/purga_execucoes telemetria_interna; config_purga/config_janela_exclusao pela FE1; criado_por/liberado_por em ponteiros.de_terceiro; 16 vereditos G5 com autoria"
  - "export-allowlist.json + _shared/exportAllowlist.ts 1.4.0 (75 = 32 + 43 tabelas; 451 = 395 + 56 pares)"
  - "três VALUES regenerados no 05 e no smoke; snapshots (a)/(b)/(j) com +2/+17/+7"
affects: [44-12, 44-13, re-verificação da Phase 44]

actuals:
  tokens: 19671
  tasks: 2
  commits: 2
plan_head_before: c42a6b8ddeb9789337fba0a6ac4960e61ea9c9ed
plan_head_after: 97893c976d76e7e0defcebdd09d6d89eabcd94f0

tech-stack:
  added: []
  patterns:
    - "acréscimo ao catálogo = consulta READ ONLY da execução, `medido_em` do próprio banco, `query` literal gravada, topo intocado"
    - "veredito explícito em coluna `*_em` que a R1 admitiria calada"
    - "veto estrutural por nome (`ponteiros.de_terceiro`) em vez de veredito por coluna para UUID de funcionário"

key-files:
  created:
    - .planning/phases/44-exporta-o-acesso/deferred-items.md
  modified:
    - docs/compliance/catalogo-vivo-44.json
    - docs/compliance/export-scope-rules.yaml
    - docs/compliance/export-allowlist.json
    - supabase/functions/_shared/exportAllowlist.ts
    - docs/compliance/sql/05-export-allowlist-drift.sql
    - supabase/tests/p44_export_drift_smoke.sql
    - docs/compliance/__tests__/exportAllowlist.test.ts

key-decisions:
  - "G5 fechado no artefato: as 6 tabelas e as 9 colunas receberam disposição/veredito segundo BD-9..BD-13, com a autoria de cada um escrita na razão (operador / orquestrador / planejador)"
  - "BD-12 confirmado por medição antes de decidir: purga_execucoes, config_purga e config_janela_exclusao têm zero coluna candidato_id/candidatura_id/user_id e zero FK para candidatos/candidaturas/auth.users — sem checkpoint"
  - "criado_por e liberado_por entram em ponteiros.de_terceiro (veto estrutural); medido que nenhuma tabela em escopo da 1.3.0 tinha colunas com esses nomes"
  - "Homônimo BD-9 sinalizado no YAML: o BD-9 do adendo 2026-10-06 (cognitivo_liberacao) não é o «BD-9 EM ABERTO» do pii-inventory citado em decisao_final.justificativa"

patterns-established:
  - "nota de divergência por desenho escrita no artefato e no fecho (69 × 75), para não virar ressalva infundada"

requirements-completed: [EXPORT-02, EXPORT-04]

coverage:
  - id: D1
    description: "6 tabelas e 9 colunas do G5 medidas em PROD (READ ONLY) e acrescentadas ao catálogo, idênticas à medição do planejador"
    requirement: "EXPORT-04"
    verification:
      - kind: integration
        ref: "node p46apply.cjs sql (SET TRANSACTION READ ONLY) — 57 linhas, now() 2026-10-06 17:51:22.467542-03"
        status: pass
    human_judgment: false
  - id: D2
    description: "Allowlist 1.4.0: 75 = 32 + 43 tabelas, 451 = 395 + 56 pares; vetos fora; 13 colunas com proveniência decisoes_por_coluna"
    requirement: "EXPORT-02"
    verification:
      - kind: unit
        ref: "<verify> do Task 1 — «OK 1.4.0 {…tabelas_catalogadas:75,tabelas_em_escopo:32,tabelas_excluidas:43,colunas_exportadas:395,colunas_excluidas_em_escopo:56,colunas_com_veredito_em_escopo:451}»"
        status: pass
    human_judgment: false
  - id: D3
    description: "Portões locais acompanham a 1.4.0: (k)/(k2) verdes nos dois arquivos, snapshots (a)/(b)/(j) só com adições"
    requirement: "EXPORT-04"
    verification:
      - kind: unit
        ref: "<verify> do Task 2 — «portoes locais verdes na 1.4.0» (vitest 222/222, 4 check:*, deno 20/20)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-10-06
status: complete
---

# Phase 44 Plan 11: o banco de hoje ganha disposição inteira no artefato — Summary

**As 6 tabelas e as 9 colunas do G5 foram medidas em PROD (só leitura), entraram no catálogo versionado e receberam veredito escrito com autoria (BD-9..BD-13). A allowlist virou 1.4.0 com 75 = 32 + 43 tabelas e 451 = 395 + 56 pares, e os portões locais estão verdes. A prova contra PROD fica para o 44-12 e a publicação para o 44-13.**

## Performance

- **Duration:** ~8 min (2026-10-06T20:50:53Z → 20:58:40Z)
- **Tasks:** 2/2
- **Files modified:** 7 de código/artefato + 1 nota de planejamento criada (`deferred-items.md`)
- **Commits de task:** 2

## Medições em PROD (população antes de booleano)

Tudo por `node p46apply.cjs sql`, com `SET TRANSACTION READ ONLY` como primeira instrução de cada requisição, mais um `p46apply run` do relatório `05` (só SELECT: `grep -ciE '\b(insert|update|delete|create|drop|alter|truncate)\b'` = 0).

### (a) Colunas: 2026-10-06 17:51:22.467542-03 (= 20:51:22Z), 57 linhas

Igual linha a linha ao `<interfaces>` do plano. **Divergência com a medição do planejador: nenhuma.**

| Tabela | Colunas medidas (ordem · tipo · nulável) |
|---|---|
| `cognitivo_liberacao` (7) | 1 id uuid NO · 2 candidatura_id uuid NO · 3 liberado_por uuid NO · 4 liberado_em timestamptz NO · 5 revogado_em timestamptz YES · 6 revogado_por uuid YES · 7 motivo text YES |
| `retencao_hold` (8) | 1 id uuid NO · 2 candidatura_id uuid NO · 3 motivo text NO · 4 detalhe text YES · 5 criado_por uuid YES · 6 criado_em timestamptz NO · 7 liberado_em timestamptz YES · 8 liberado_por uuid YES |
| 9 colunas | `candidatos.faixa_etaria_materializada` text YES 33 · `candidaturas.encerrada_a_pedido_em` timestamptz YES 40 · `solicitacoes_dados` executar_em 8, cancelado_em 9, plano jsonb 10, storage_concluido_em 11, postgres_concluido_em 12, auth_concluido_em 13, recibo_enviado_em 14 (todas YES) |
| fora (33 colunas) | `config_janela_exclusao` 4 · `config_purga` 6 · `purga_execucao_itens` 13 · `purga_execucoes` 10, as mesmas do `<interfaces>` |

### (b) Checagem BD-12: 2026-10-06T20:51:39Z

| Tabela | colunas `candidato_id`/`candidatura_id`/`user_id` | FKs para candidatos/candidaturas/auth.users | todas as FKs |
|---|---|---|---|
| `purga_execucoes` | **0** | **0** | 0 |
| `config_purga` | **0** | **0** | 1 (`alterado_por` → `usuarios_rh`) |
| `config_janela_exclusao` | **0** | **0** | 0 |
| `purga_execucao_itens` (BD-11, decisão nominal) | 1 (`candidato_id`) | 0 | 1 (→ `purga_execucoes`) |
| `cognitivo_liberacao` | 1 (`candidatura_id`) | 1 | 1 |
| `retencao_hold` | 1 (`candidatura_id`) | 1 | 3 (candidaturas + 2 × usuarios_rh) |

Condição do BD-12 satisfeita: **zero chave do titular nas três**. Nenhum checkpoint foi necessário.

### (c) Populações: 2026-10-06T20:51:52Z

| Objeto | Medido | Planejador |
|---|---|---|
| `cognitivo_liberacao` linhas / com `motivo` / revogadas | 4 / 0 / 0 | 4 / 0 / — |
| `retencao_hold` linhas / com `detalhe` / por motivo / liberadas | 1 / **1** / `{obrigacao_legal: 1}` / 0 | 1 / 1 / obrigacao_legal |
| `purga_execucao_itens` / `purga_execucoes` | 230 / 48 | 230 / 48 |
| `config_purga` / `config_janela_exclusao` | 1 / 1 | — |
| `solicitacoes_dados` linhas | 8 | 8 |
| ↳ não-nulos executar_em / cancelado_em / plano | 5 / 3 / 2 | 5 / 3 / 2 |
| ↳ storage_ / postgres_ / auth_concluido_em / recibo_enviado_em | 2 / 2 / 2 / 2 | 2 / 2 / 2 / 2 |
| chaves de topo de `plano` (só `jsonb_object_keys`) | achados_resumo, contagens, executor, previsto, versao | idem |
| `candidatos` com faixa (de 45) | 2 | 2 |
| `candidaturas` com `encerrada_a_pedido_em` (de 40) | 2 | 2 |

### Drift antes da edição

`node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql` → exit 0, **15 linhas** = 9 «COLUNA NOVA NO BANCO» + 6 «TABELA NOVA NO BANCO», exatamente as do G5. **Nenhum drift novo.**

## Vereditos: 6 tabelas

| Tabela | Disposição | Regra / autoria |
|---|---|---|
| `cognitivo_liberacao` | `escopo_titular`, chave `candidatura_id`, `via:candidaturas` | BD-9, OPERADOR |
| `retencao_hold` | `escopo_titular`, chave `candidatura_id`, `via:candidaturas` | BD-10, OPERADOR |
| `purga_execucao_itens` | `fora_do_escopo: telemetria_interna` (entrada EXPLÍCITA; a FE5 `*_itens` daria `configuracao_do_produto`, razão errada) | BD-11, OPERADOR |
| `purga_execucoes` | `fora_do_escopo: telemetria_interna` | BD-12, OPERADOR (condição medida) |
| `config_purga` | FE1 → `configuracao_do_produto` | BD-12, OPERADOR (condição medida) |
| `config_janela_exclusao` | FE1 → `configuracao_do_produto` | BD-12, OPERADOR (condição medida) |

## Vereditos: 24 colunas (proveniência lida do `export-allowlist.json` gerado)

| Coluna | Na cópia? | Proveniência | Regra / autoria |
|---|---|---|---|
| `cognitivo_liberacao.id` | sim | R1 | de propósito, como em toda tabela em escopo |
| `cognitivo_liberacao.candidatura_id` | sim | R1 | idem |
| `cognitivo_liberacao.liberado_em` | sim | decisoes_por_coluna | BD-9, OPERADOR |
| `cognitivo_liberacao.revogado_em` | sim | decisoes_por_coluna | BD-9, OPERADOR |
| `cognitivo_liberacao.motivo` | sim | decisoes_por_coluna | BD-9, OPERADOR |
| `cognitivo_liberacao.liberado_por` | **não** | `pii_de_terceiro (R2)` | BD-9, OPERADOR, via `ponteiros.de_terceiro` (novo) |
| `cognitivo_liberacao.revogado_por` | **não** | `pii_de_terceiro (R2)` | BD-9, OPERADOR, via `ponteiros.de_terceiro` (já estava) |
| `retencao_hold.id` | sim | R1 | de propósito |
| `retencao_hold.candidatura_id` | sim | R1 | de propósito |
| `retencao_hold.motivo` | sim | decisoes_por_coluna | BD-10, OPERADOR |
| `retencao_hold.criado_em` | sim | decisoes_por_coluna | BD-10, OPERADOR |
| `retencao_hold.liberado_em` | sim | decisoes_por_coluna | BD-10, OPERADOR |
| `retencao_hold.detalhe` | **não** | `decisoes_por_coluna: BD-10 …` | BD-10, OPERADOR (1 linha preenchida em PROD) |
| `retencao_hold.criado_por` | **não** | `pii_de_terceiro (R2)` | BD-10, OPERADOR, via `ponteiros.de_terceiro` (novo) |
| `retencao_hold.liberado_por` | **não** | `pii_de_terceiro (R2)` | BD-10, OPERADOR, via `ponteiros.de_terceiro` (novo) |
| `candidatos.faixa_etaria_materializada` | sim | decisoes_por_coluna | BD-13 (iii), PLANEJADOR |
| `candidaturas.encerrada_a_pedido_em` | sim | decisoes_por_coluna | BD-13 (i), ORQUESTRADOR |
| `solicitacoes_dados.executar_em` | sim | decisoes_por_coluna | BD-13 (i), ORQUESTRADOR |
| `solicitacoes_dados.cancelado_em` | sim | decisoes_por_coluna | BD-13 (i), ORQUESTRADOR |
| `solicitacoes_dados.plano` | **não** | `decisoes_por_coluna: BD-13 (ii) …` | BD-13 (ii), ORQUESTRADOR |
| `solicitacoes_dados.storage_concluido_em` | sim | decisoes_por_coluna | BD-13 (iv), OPERADOR, option-a |
| `solicitacoes_dados.postgres_concluido_em` | sim | decisoes_por_coluna | BD-13 (iv), OPERADOR, option-a |
| `solicitacoes_dados.auth_concluido_em` | sim | decisoes_por_coluna | BD-13 (iv), OPERADOR, option-a |
| `solicitacoes_dados.recibo_enviado_em` | **não** | `decisoes_por_coluna: BD-13 (iv) …` | BD-13 (iv), OPERADOR, option-a |

Contagem: 17 entram (13 por `decisoes_por_coluna` + 4 por R1) e 7 ficam fora (3 por `decisoes_por_coluna` + 4 pela R2).

## Números da 1.4.0

Do `<verify>` do Task 1: `OK 1.4.0 {"colunas_colhidas":787,"colunas_com_veredito_em_escopo":451,"colunas_excluidas_em_escopo":56,"colunas_exportadas":395,"colunas_fora_do_arquivo_legivel":4,"tabelas_catalogadas":75,"tabelas_com_colunas_colhidas":53,"tabelas_em_escopo":32,"tabelas_excluidas":43}`. O stdout do gerador: «32 tabelas em escopo, 395 colunas, 43 tabelas excluídas».

- `meta.totais_medidos_em_public` continua `{tabelas_base_public: 69, colunas_public: 1025, fks_public: 105}` (copiado do topo, 2026-08-04). A divergência com `tabelas_catalogadas: 75` vem do desenho e ficou escrita, com data, no acréscimo do catálogo, em `fecho_executado.geracao_44_11` e no cabeçalho do `05`.
- Catálogo: `tabelas` 75, ordenado; `colunas` 787 (= 763 + 24); `meta.medido_em` do topo `2026-08-04T01:34:27Z`; `git diff --numstat origin/main -- docs/compliance/catalogo-vivo-44.json` = `299 0` (nenhuma linha removida).
- Diff do artefato gerado: as 11 linhas removidas do `export-allowlist.json` são só `gerado_em`, os 8 `totais`, `versao` e o texto (não o veredito) de `solicitacoes_dados.aviso_pedido_enviado_em`. Nenhuma coluna saiu da cópia nem entrou nas exclusões além das 24 do G5.
- `git diff --quiet origin/main -- docs/compliance/pii-inventory.yaml docs/compliance/recibo-exclusao.json` → exit 0 (intocados).

## Diff dos snapshots e dos VALUES

| Região | Linhas acrescentadas | Linhas removidas |
|---|---|---|
| (a) tabelas | 2 (`cognitivo_liberacao`, `retencao_hold`) | 0 |
| (b) `tabela.coluna` exportadas | 17 | 0 |
| (j) excluídas | 7 | 0 |
| comentários de origem em (b) e (j) | 16 | 0 |
| **arquivo `exportAllowlist.test.ts`** | **42** | **0** |
| `05` e smoke, três `VALUES` (cada arquivo) | 30 pares + 1 | 1 (`('solicitacoes_dados','aviso_pedido_enviado_em')` só ganhou vírgula) |

Saídas do gerador (`wc -l`): `--sql-values` 395, `--sql-values-excluidas` 56, `--sql-values-tabelas` 75.

## Task Commits

1. **Task 1: medir e decidir; catálogo + YAML + allowlist 1.4.0**: `ab98da48` (feat)
2. **Task 2: três VALUES nos dois arquivos + snapshots (a)/(b)/(j)**: `97893c97` (test)

## Portões locais (verify do Task 2, literal)

`npx vitest run docs/compliance/__tests__ src/features/privacidade` → 15 arquivos, **222/222**; `check:export-allowlist`, `check:recibo-exclusao`, `check:matriz-retencao`, `check:pii-inventory-md` → OK; `deno test --allow-all supabase/functions/exportar-meus-dados/` → **20 passed / 0 failed**; `--sql-values-tabelas | wc -l` = 75 → «portoes locais verdes na 1.4.0».

Antes do `-u`, o Vitest do arquivo reprovou exatamente (a), (b) e (j) (3 de 12). A (k) e a (k2) já passavam com os VALUES regenerados.

## PROD: o que foi executado

Só leitura: três `p46apply sql` com `SET TRANSACTION READ ONLY` (colunas, BD-12, populações) e um `p46apply run` do relatório `05` (SELECT). Nenhuma escrita, nenhum apply, nenhum deploy, nenhum push (`git log origin/main..HEAD` segue com commits locais não publicados; publicar é tarefa do 44-13).

## Deviations from Plan

### Ajustes

**1. [Rule 2 - registro] Aviso de homônimo «BD-9» no `export-scope-rules.yaml`**
- **Found during:** Task 1
- **Issue:** a razão de `decisao_final.justificativa` (44-03) cita «DECISÃO DO OPERADOR EM ABERTO (BD-9)», que vem do `pii-inventory.yaml` (5 ocorrências de `BD-9` lá) e usa outra numeração. O bloco novo cita BD-9 para `cognitivo_liberacao`. Lidos lado a lado, os dois «BD-9» se confundem.
- **Fix:** três linhas de comentário no cabeçalho do bloco «G5 (44-11)» separando os dois. Nenhum veredito mudou.
- **Commit:** `ab98da48`

**2. [Registro] Query BD-12 e `medido_em_bruto` gravados no acréscimo**
- Além da `query` pedida, o acréscimo do catálogo traz `query_bd12` (o texto literal da checagem rodada) e `medido_em_bruto` (o `now()` como o banco devolveu, `2026-10-06 17:51:22.467542-03`). O `medido_em` vem em UTC e sem a fração, no formato dos acréscimos anteriores. Isso foi conversão de formato, não arredondamento.
- **Commit:** `ab98da48`

**3. [Escopo] A «REGRA DE HONESTIDADE DE NÚMERO» só existe no `05`**
- O plano mandava atualizar as contagens «nos dois cabeçalhos». O cabeçalho do smoke não tem contagem nenhuma, de propósito («Não há constante numérica de contagem neste arquivo»), e o texto dele sobre o G5 continua verdadeiro. Por isso só o `05` foi atualizado. Inventar uma seção de números no smoke criaria a constante que ele proíbe.

**4. [Ferramenta] `npx vitest run -u <arquivo>` rodou a suíte inteira**
- Resultado: «Snapshots 3 updated», os de (a)/(b)/(j), os únicos que falhavam. `git status` confirmou que nenhum outro arquivo mudou e o diff do teste é só de adições. A suíte inteira mostrou **2 falhas pré-existentes** em `src/__tests__/promessasComExecutor.test.ts`, as duas presas a `faseDona: 'Phase 46'`, que o ROADMAP marca como concluída. `git diff --quiet c42a6b8d HEAD -- .planning/ROADMAP.md src/__tests__/promessasComExecutor.test.ts` → 0, então nada deste plano mexe nelas. Ficaram registradas em `deferred-items.md` e não foram consertadas.

O resto foi executado como escrito. `pii-inventory.yaml`, `recibo-exclusao.json`, `gen-recibo-exclusao.cjs` e os espelhos do recibo ficaram intocados: estão fora do G5, porque o gerador do export resolve pelas `decisoes_por_coluna`, e mexer no inventário propagaria para o recibo da Phase 45.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>`. As mitigações T-44-64..T-44-70 foram aplicadas e conferidas pelo verify do Task 1: `detalhe`, `plano` e `recibo_enviado_em` ficam fora por veredito; os UUIDs de funcionário ficam fora pela R2; as 13 colunas que entram têm proveniência `decisoes_por_coluna`; o BD-12 foi medido; e `purga_execucao_itens` tem entrada explícita. As asserções nomeadas (l), o Deno (19) e as mutações M-a/M-b são do 44-12.

## Next Phase Readiness

- **44-12:** contra PROD, o relatório `05` deve devolver `[]` e o smoke deve **aprovar pela primeira vez**. Hoje isso é ESPERADO, ainda não MEDIDO. Os VALUES da 1.4.0 já estão nos dois arquivos e a (k) os prende ao artefato. Faltam ainda a (l) nomeada, o teste Deno (19) e as mutações.
- **44-13:** publicar. O ar segue dizendo MENOS do que o artefato (EF com a 1.3.0), que é a direção segura.

## Self-Check: PASSED
