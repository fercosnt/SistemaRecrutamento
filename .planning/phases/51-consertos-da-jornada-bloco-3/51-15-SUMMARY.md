---
phase: 51-consertos-da-jornada-bloco-3
plan: 15
subsystem: compliance
tags: [jorn-42, lgpd, d-57, export-allowlist, recibo-exclusao, pii-inventory, catalogo-vivo, drift, mordida, ensaio]
status: complete

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-08: tabela revisao_rejeicao (migration 20261008000002, NAO aplicada); 51-13: passo revisao_rejeicao.resultado no motor (0004), que autoriza o recibo a dizer «sai»; 51-06: p51_ensaio.cjs"
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-17: precedente do checklist D-57 (acrescimo medido, vereditos, recibo so com origens novas)"
provides:
  - "supabase/tests/p51_catalogo_revisao_rejeicao.sql: sonda so-leitura que publica em p51.evidencia as colunas de revisao_rejeicao medidas DENTRO do ensaio"
  - "catalogo-vivo-44.json: acrescimo 51-15 (1 tabela, 16 colunas), topo intocado"
  - "export-scope-rules.yaml 1.5.0: revisao_rejeicao em escopo, 16 vereditos escritos (12 entram, 4 fora), rejeitado_por/respondida_por em ponteiros.de_terceiro"
  - "pii-inventory.yaml/.md, gen-recibo-exclusao.cjs + 3 saidas, allowlist JSON/TS 1.5.0, os tres VALUES do drift (05 e p44 smoke), snapshots (a)/(b)/(j) e a (m) nova"
  - "rotuloTabela.revisao_rejeicao = «Seus pedidos de revisão de rejeição»"
  - "p51_ensaio.cjs carrega evidencia com aspas (JSON)"
  - "ref local refs/gsd/51-15/base = 22f97c05"
affects: [51-16, 51-17]

actuals:
  tokens: 13203        # chars/4 sobre as linhas +/- do diff 22f97c05..b0340d72 (52 812 chars)
  tasks: 3
  commits: 5           # MEDIDO: git rev-list --count 22f97c05..HEAD antes do commit deste SUMMARY
plan_head_before: 22f97c05e4879379a41433a345dcbdc59c18c85d
plan_head_after: b0340d72bc2c5154f8b5ea188c22f92da59da4c1

tech-stack:
  added: []
  patterns:
    - "Catálogo de tabela que ainda não existe em PROD medido DENTRO de um ensaio que aborta, por sonda que publica a medição como evidência JSON; o acréscimo é escrito por script a partir do log, nunca digitado"
    - "Veredito de export por analogia EXPLÍCITA: cada razão cita a coluna análoga de decisao_final e a proveniência que ela tem hoje no artefato"
    - "VALUES do drift trocados por script com âncora única por bloco, que recusa linha fora do formato do extrator da (k)"

key-files:
  created:
    - supabase/tests/p51_catalogo_revisao_rejeicao.sql
  modified:
    - scripts/p51_ensaio.cjs
    - docs/compliance/catalogo-vivo-44.json
    - docs/compliance/export-scope-rules.yaml
    - docs/compliance/pii-inventory.yaml
    - docs/compliance/pii-inventory.md
    - docs/compliance/sql/gen-recibo-exclusao.cjs
    - docs/compliance/recibo-exclusao.json
    - supabase/functions/_shared/reciboExclusao.ts
    - src/features/privacidade/constants/reciboExclusao.generated.ts
    - docs/compliance/export-allowlist.json
    - supabase/functions/_shared/exportAllowlist.ts
    - docs/compliance/sql/05-export-allowlist-drift.sql
    - supabase/tests/p44_export_drift_smoke.sql
    - docs/compliance/__tests__/exportAllowlist.test.ts
    - src/features/privacidade/services/exportacaoService.ts
    - .planning/WINDOWS.md

key-decisions:
  - "revisao_rejeicao.id, candidatura_id e historico_rejeicao_id ENTRAM na cópia (export: true), por analogia com decisao_final e com toda tabela em escopo. A lista literal do plano as punha FORA, mas o mesmo parágrafo mandava seguir as análogas. Sem candidatura_id, um titular com duas candidaturas receberia pedidos soltos. A reversão é uma palavra por linha (WINDOWS 91)"
  - "opcao_knockout_id fica FORA, com a família configuracao_do_produto: é ponteiro para pergunta_opcao_metadata/perguntas_formulario, fora do escopo. Ficam registradas as duas ressalvas: a citação «D-15 da 48» não corresponde, e o mesmo UUID já sai em candidaturas.opcao_knockout_id (WINDOWS 92)"
  - "rejeitado_por/respondida_por: veredito escrito E veto estrutural em ponteiros.de_terceiro (precedente 44-11). Antes, foi medido que nenhuma outra tabela tem colunas com esses nomes"
  - "Recibo: resultado em «sai» (resposta_ao_seu_pedido_de_revisao); as 8 colunas do registro em «mantém» (registro_da_decisao); UUIDs como dado_de_funcionario; chaves como chave_tecnica; alerta como estado_do_processo. Só as origens crescem, e o texto ao titular não muda"
  - "Snapshot (j) também cresceu (+4), além de (a)/(b). Foi acrescentada a (m), com proibições nomeadas que sobrevivem a um -u (mitigação do T-51-46)"

patterns-established:
  - "Evidência de ensaio pode ser JSON: o RE_SENTINELA atravessa \\\" e \\\\ (e para em \\n) e o rodar() desescapa"

requirements-completed: []   # JORN-42 é declarado também por 51-16/51-17 (sem SUMMARY) — fica aberto pelo shared-ID gate

coverage:
  - id: D1
    description: "Catálogo medido (não copiado) da tabela nova, dentro de ensaio que aborta"
    requirement: JORN-42
    verification:
      - kind: integration
        ref: "node scripts/p51_ensaio.cjs --migracoes=…0002 supabase/tests/p51_catalogo_revisao_rejeicao.sql -> ENSAIO VERDE, evidencia JSON com 16 colunas, idêntica em duas corridas; verify 1 da Task 1: «catalogo-vivo com as 16 colunas medidas no ensaio»"
        status: pass
    human_judgment: false
  - id: D2
    description: "Fontes D-57 com a tabela: escopo (16 vereditos), inventário, recibo"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "verify 2 da Task 1: «escopo, inventario e gerador do recibo com a tabela nova»"
        status: pass
    human_judgment: false
  - id: D3
    description: "Saídas regeneradas, os quatro check: verdes, allowlist 1.5.0, drift verde dentro do ensaio com 0002..0004"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "npm run -s check:export-allowlist / check:recibo-exclusao / check:pii-inventory-md / check:matriz-retencao -> OK nos quatro; «allowlist 1.5.0 com revisao_rejeicao»"
        status: pass
      - kind: integration
        ref: "p51_ensaio --migracoes=0002,0003,0004 supabase/tests/p44_export_drift_smoke.sql -> ENSAIO VERDE sem P44-DRIFT FAIL"
        status: pass
    human_judgment: false
  - id: D4
    description: "Os portões editados mordem, cada um com CONTROLE verde antes da mutação"
    requirement: JORN-42
    verification:
      - kind: integration
        ref: "mordida (i): controle ENSAIO VERDE; cópia sem ('revisao_rejeicao','resultado') -> P44-DRIFT FAIL: n_drift=1 … revisao_rejeicao.resultado — COLUNA NOVA NO BANCO (repetida depois do commit)"
        status: pass
      - kind: unit
        ref: "mordida (ii): worktree de HEAD + teste editado: controle 41/41; revisao_rejeicao retirada -> (a) (b) (h) (j) (k) (m) failed (repetida depois do commit)"
        status: pass
      - kind: unit
        ref: "npx vitest run docs/compliance src/features/privacidade -> 272/272; tsc 89"
        status: pass
    human_judgment: false
  - id: D5
    description: "Reconfirmação ao vivo do catálogo, do drift contra PROD vivo e das EFs redeployadas — passos 1, 2 e 10 do D-57"
    requirement: JORN-42
    verification: []
    human_judgment: true
    rationale: "Nada foi aplicado nem publicado neste plano (ledger em 20261008000001). Apply, db:types e redeploy de exportar-meus-dados/executar-direito-titular são do 51-16/51-17"

duration: 14min
completed: 2026-10-09
---

# Phase 51 Plan 15: a tabela `revisao_rejeicao` entra em todo artefato de conformidade Summary

**`revisao_rejeicao` foi medida dentro de um ensaio que aborta, porque ainda não existe em PROD. As 16 colunas foram acrescentadas ao catálogo e cada uma recebeu veredito por analogia com `decisao_final`: 12 entram na cópia e 4 ficam fora com razão. O inventário e o recibo foram estendidos. A allowlist subiu para `1.5.0`, com 407 colunas exportadas + 60 excluídas e 76 disposições, e os VALUES do drift foram regenerados. O drift fica verde no ensaio, e os dois portões editados mordem, cada um com controle verde antes da mutação. Nada foi aplicado, publicado ou empurrado.**

## Performance

- **Duração:** ~14 min (2026-10-09T07:00:41Z → 07:14:21Z)
- **Tasks:** 3 de 3
- **Arquivos:** 1 criado, 16 modificados (incluindo `.planning/WINDOWS.md`)

## Checklist D-57 (49-CONTEXT), passo a passo

| # | Passo | Estado |
|---|---|---|
| 1 | `p46apply` | **51-16** (apply de `0002`→`0003`→`0004`) |
| 2 | `db:types` com `< /dev/null` | **51-16** |
| 3 | `meta.acrescimos` em `catalogo-vivo-44.json` | ✅ acréscimo «51-15», com 16 colunas medidas no ensaio (2026-10-09T07:03:10Z) e `tabelas`/`colunas` do corpo crescidos. `medido_em`/`totais` do topo ficaram intocados. A reconfirmação ao vivo é do 51-16 |
| 4 | Veredito em `export-scope-rules.yaml` | ✅ disposição `revisao_rejeicao` e 16 vereditos no bloco «PHASE 51». `cobertura_declarada` passou a 33 + 23 + 20 = 76, e `fecho_executado.geracao_51_15` foi acrescentado |
| 5 | `pii-inventory.yaml` + `.md` | ✅ 15 colunas classificadas (`id` fica pela R1, como em `decisao_final`). `resultado` = `apagar`, citando o passo da `0004`. `.md` regenerado |
| 6 | `gen-recibo-exclusao.cjs` + 3 saídas | ✅ «sai», «mantém» e `FORA_DO_RECIBO`. Resultado: 251/251 colunas em escopo com veredito |
| 7 | allowlist + bump | ✅ `1.4.0 → 1.5.0`: 33 tabelas em escopo, 407 + 60 = 467 pares, 76 disposições |
| 8 | VALUES do drift + snapshots | ✅ três blocos × dois arquivos, trocados por script, só com acréscimos (+12/+4/+1). Snapshots (a) +1, (b) +12, (j) +4, e (m) nova |
| 9 | Os quatro `check:` | ✅ OK nos quatro |
| 10 | Redeploy `exportar-meus-dados`/`executar-direito-titular` | **51-16/51-17** |
| — | `rotuloTabela` | ✅ «Seus pedidos de revisão de rejeição» |

**Transitório declarado.** Do commit `2e1e179f` até o apply do 51-16, o `p44_export_drift_smoke.sql` e o `05-export-allowlist-drift.sql` acusam `revisao_rejeicao` quando rodados contra o PROD vivo: ela aparece como disposição sem tabela viva e com vereditos sem coluna. Isso é esperado. Nesse intervalo, o smoke só vale como prova dentro do ensaio com `0002`..`0004`, onde fica verde. A nota está no cabeçalho do `05`.

## Vereditos de `revisao_rejeicao`

| Coluna | Export | Análoga citada | Inventário | Recibo |
|---|---|---|---|---|
| `id` | true | `decisao_final.id` (R1) | (R1) | — |
| `candidatura_id` | true | `decisao_final.candidatura_id` | preservar | FORA `chave_tecnica` |
| `historico_rejeicao_id` | true | FK para dentro da cópia (`historico_candidatura`) | preservar | FORA `chave_tecnica` |
| `origem`, `etapa_rejeitada`, `etapa_reabertura`, `solicitada_em`, `veredito`, `respondida_em`, `reaberta_em`, `prazo_nova_decisao_em` | true | `revisao_*`/`reaberta_em`/`prazo_*` de `decisao_final`; `etapa_de/para` do histórico | preservar | `registro_da_decisao` (mantém) |
| `resultado` | true | `decisao_final.revisao_resultado` | **apagar** (passo da `0004`) | `resposta_ao_seu_pedido_de_revisao` (sai) |
| `rejeitado_por` / `respondida_por` | **false** | `por_usuario` / `revisao_por_usuario` (R2) | preservar | FORA `dado_de_funcionario` |
| `opcao_knockout_id` | **false** | — (família `configuracao_do_produto`) | preservar | FORA `chave_tecnica` |
| `alerta_prazo_enviado_em` | **false** | `decisao_final.alerta_prazo_enviado_em` | preservar | FORA `estado_do_processo` |

A página de explicação (`estado_revisao_rejeicao`) mostra `origem`, `solicitada_em`, `veredito`, `resultado`, `respondida_em`, `reaberta_em` e `prazo_nova_decisao_em`. As sete estão na cópia, e a (m) passou a prendê-las.

## Mordida dos portões editados (D-56)

**(i) VALUES do drift.** O mesmo comando foi rodado antes e depois do commit, com o mesmo resultado:
```
controle: ENSAIO VERDE: supabase/tests/p44_export_drift_smoke.sql · prefixadas=[20261008000002,20261008000003,20261008000004] · … 04:anon=a68e4a6a…,plano=0a4996fe…
mutação:  ENSAIO VERMELHO: P0001: P44-DRIFT FAIL: n_drift=1 · populações: n_tabelas_vivas=76 n_tabelas_com_disposicao=76 n_tabelas_em_escopo=33 n_colunas_vivas_em_escopo=467 n_pares_com_veredito=466 · linhas: revisao_rejeicao.resultado — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml
```
**(ii) Snapshots.** Num worktree de HEAD, com o teste editado copiado, também antes e depois do commit:
```
controle verde (41 passam); mutado: (a) e (b) reprovam, 6 falha(s) no total  [(a) (b) (h) (j) (k) (m)]
```
Os md5 do versionado são os de antes: `p44_export_drift_smoke.sql` `cc38f771…` e `export-allowlist.json` `18cd5a70…`. O `git worktree list` mostra só o checkout principal, e nenhuma cópia mutada foi commitada.

## RED → GREEN (Task 3, tdd)

- **RED:** `npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts --reporter=junit` deu exit 1, com 40 testes, 37 passando e 3 falhando: (a), (b) e (j), todos com `Snapshot … mismatched`. O classificador respondeu `RED_EVIDENCE_OK target_test_failed` para o alvo (a). Na leitura semântica, os três snapshots congelados reprovam contra o artefato `1.5.0` porque a tabela nova não estava neles. É a falha pretendida, e não erro de carga. Com o reporter JSON do vitest o classificador devolve `invalid_record` (formato não suportado), e por isso o RED foi registrado com junit.
- **GREEN:** `-u` mais a (m) e o rótulo dão 272/272 e tsc 89. O diff dos snapshots só acrescenta linhas.
- O commit `test(51-15)` reúne teste e rótulo, como o plano prescreve. Não houve `feat(...)` separado, porque a implementação (o artefato `1.5.0`) veio nas Tasks 1 e 2. Não houve REFACTOR.

## Task Commits

1. **Desvio (Rule 3): harness** — `e74ac758` (fix): `p51_ensaio` passa a carregar evidência com aspas
2. **Task 1: fontes D-57** — `f7783145` (feat)
3. **Task 2: saídas regeneradas** — `2e1e179f` (feat)
4. **Desvio (Rule 1): portão CR-01** — `1db1af20` (fix): família de razão do veredito de `opcao_knockout_id`
5. **Task 3: snapshots, (m), rótulo, mordidas** — `b0340d72` (test)

## PROD — escritas

**Nenhuma.** Houve só ensaios que abortam e uma leitura. Os ensaios foram: a sonda de catálogo (2×), o drift (controle 3× e mutação 2×) e as tentativas iniciais da sonda. Todos fecharam sem `PERSISTIU`. A leitura foi feita com `SET TRANSACTION READ ONLY` em 2026-10-09 04:13:39-03:
- `max(version)` do ledger = **`20261008000001`**, com 0 linhas ≥ `20261008000002`;
- `public.revisao_rejeicao` **não existe**;
- `config_purga.modo = 'dry_run'`.

Não houve `git push`: `origin/main..HEAD` tem 37 commits locais da onda, que sobem no 51-16.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bloqueante] `p51_ensaio.cjs` cortava evidência JSON**
- **Found during:** Task 1 (primeira corrida da sonda)
- **Issue:** a sonda produziu `ENSAIO VERDE … evidencia=[{`. O `RE_SENTINELA` capturava `[^"\\]*` e parava no primeiro `\` do corpo do HTTP 400, onde as aspas da evidência chegam escapadas.
- **Fix:** a captura agora atravessa só os pares `\"` e `\\` e continua parando em `\n`. O `rodar()` desescapa o resultado. Um teste sintético confirmou que a evidência antiga (`02:rr=0,…\nCONTEXT`) sai igual.
- **Files modified:** `scripts/p51_ensaio.cjs` (fora da lista do plano)
- **Commit:** `e74ac758`

**2. [Divergência do texto do plano, registrada] `id`/`candidatura_id`/`historico_rejeicao_id` ENTRAM**
- **Issue:** o plano mandava pôr as três fora («chave técnica») e, no mesmo parágrafo, «seguir o tratamento que as tabelas análogas dão a essas chaves». Medido no artefato: toda tabela em escopo exporta `id` e `candidatura_id`, e o 44-11 escreveu que isso é «de propósito». Não existe precedente de chave excluída que aponte para dentro da cópia.
- **Fix:** as três ficam `export: true`, com razão que cita a análoga, e a divergência está registrada no YAML e em WINDOWS 91 para decisão no portão.
- **Commit:** `f7783145`

**3. [Rule 1 - Portão] razão de `opcao_knockout_id` sem família (CR-01)**
- **Found during:** Task 3 (vitest de `src/features/privacidade`)
- **Issue:** o (cr1) reprovou com «item retido sem família de razão», e o (cr3), por consequência, também. A frase «O que não está na cópia» não cobria o item.
- **Fix:** a razão foi reescrita pela natureza medida. A coluna é ponteiro para `pergunta_opcao_metadata`/`perguntas_formulario`, que estão fora do escopo como `configuracao_do_produto` pelas regras `pergunta_*`/`perguntas*`. O veredito continua `false`, os VALUES ficaram idênticos e o resultado é 272/272. O portão CR-01 não foi tocado.
- **Files modified:** `export-scope-rules.yaml`, `export-allowlist.json`, `_shared/exportAllowlist.ts`
- **Commit:** `1db1af20`

**4. [Rule 2] (m) com proibições nomeadas, e (j) também atualizado**
- **Issue:** o plano previa mudança só em (a)/(b)/(e). Mas (j) reprova pela mesma razão (+4 excluídas). E um `-u` re-carimba os snapshots sem que nada impeça. O T-51-46 pede justamente o veto que não cede a `-u`.
- **Fix:** (j) foi atualizado e anotado. A (m) foi criada no molde da (l) e confere duas coisas: os 4 vetados estão fora com veredito escrito, e as 7 colunas da página de explicação estão dentro com veredito escrito. A (e) não precisou mudar, porque já aceita qualquer semver.
- **Commit:** `b0340d72`

**5. [Documental] cabeçalho do `05-export-allowlist-drift.sql`**
- As contagens de proveniência (395/56/75) foram trocadas pelas medidas (407/60/76), com o histórico preservado. Também foram acrescentados o parágrafo «PHASE 51» e o transitório. São linhas de comentário; os VALUES continuam gerados.

---

**Total deviations:** 3 auto-fixed (1 bloqueante de harness, 1 de portão, 1 de força de contrato), 1 divergência do texto do plano decidida pela analogia que o próprio plano prescreve, e 1 documental.
**Impact:** nenhum portão foi afrouxado. O CR-01 continua mordendo pelo próprio (cr3), e as mordidas (i)/(ii) foram provadas antes e depois do commit.

## Issues Encountered

- O `gsd_run check tdd-red-evidence` não aceita o JSON do vitest (`invalid_record`). A corrida foi repetida com `--reporter=junit`, que o classificador aceita.

## Open questions para o operador (WINDOWS 91–93)

- **91:** decidir se as três chaves de `revisao_rejeicao` ficam na cópia, como está agora, ou saem, como dizia a lista literal do plano.
- **92:** o veto «a opção do knockout nunca vai ao titular» cita «D-15 da 48», que é sobre o tsc. A fonte não foi localizada. Além disso, `candidaturas.opcao_knockout_id` já é `export: true`. Se o veto vale, o veredito a revisar é o de `candidaturas`.
- **93:** o recibo mostra as linhas da revisão quando o bloco `tombstone_decisao_final` do plano soma mais que 0 (`executar-direito-titular/index.ts:1369`). Isso cobre o pedido respondido, porque a chave da 51-13 entra na soma. Fica uma lacuna: um pedido de `revisao_rejeicao` não respondido e sem `decisao_final` sobrevive, e a linha «mantém» `registro_da_decisao` não aparece. O recibo diz menos do que fica. Conferir ao vivo no 51-16/51-17.

## Threat Flags

Nenhuma superfície nova. T-51-46: os UUIDs de funcionário e a opção ficam fora por veredito escrito, presos pela (m) e pela (j). T-51-47: os quatro `check:` estão verdes e o drift verde no ensaio. T-51-71: as duas mordidas foram feitas com controle. T-51-SC: nada instalado.

## Known Stubs

Nenhum.

## User Setup Required

None.

## Next Phase Readiness

O 51-16 (portão) tem quatro coisas a fazer:
1. Aplicar `0002` → `0003` → `0004`.
2. Rodar `db:types < /dev/null`.
3. Reconfirmar ao vivo a sonda de catálogo, sem ensaio: uma consulta só-leitura das 16 colunas, comparada com o acréscimo «51-15».
4. Rodar `node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql` contra o PROD vivo. O esperado é verde, o que fecha o transitório.

Depois disso, redeploy de `exportar-meus-dados` (allowlist `1.5.0`) e de `executar-direito-titular` (recibo). Por fim, `git push` e conferir que `origin/main..HEAD` sai vazio.

## Self-Check: PASSED

- FOUND: `supabase/tests/p51_catalogo_revisao_rejeicao.sql`, `docs/compliance/export-allowlist.json` (`1.5.0`, `revisao_rejeicao`), `docs/compliance/export-scope-rules.yaml` (`revisao_rejeicao:`)
- FOUND commits (ancestrais de HEAD): `e74ac758`, `f7783145`, `2e1e179f`, `1db1af20`, `b0340d72`
- commits medidos: `git rev-list --count 22f97c05..HEAD` = 5

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-09*
