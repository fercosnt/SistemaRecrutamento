---
phase: 44-exporta-o-acesso
plan: 15
subsystem: testing
tags: [compliance, drift-smoke, vitest, postgres, plpgsql, gates, lgpd, export]

requires:
  - phase: 44-exporta-o-acesso
    provides: "smoke p44_export_drift (44-10), allowlist 1.4.0 e VALUES (44-11), prova contra PROD (44-12)"
provides:
  - "DO $gate$ do smoke fail-closed: chave ausente/renomeada reprova (WR-03)"
  - "(k3): predicado do smoke preso ao relatório 05; estrutura que falha alto e agregador presos por forma (WR-02)"
  - "(k) com contagem permissiva por bloco, igual à canônica (WR-01)"
  - "(k4): 18 mutações em memória do smoke real, cada uma vista reprovando com o alvo nomeado"
  - "(i)/(i2) com a chave de ordenação do gerador, fixture local com prefixo comum; (i3) mordendo (WR-07)"
affects: [44-16, smoke-drift, export-allowlist, gsd-verify-work]

actuals:
  tokens: 10321
  tasks: 3
  commits: 3
plan_head_before: 5e06d9679ba8f2920f3f25f3bbb280a01298faf8
plan_head_after: 813b191cadcaecc45070bd81a608a659835769a1

tech-stack:
  added: []
  patterns:
    - "Checador de portão como função PURA sobre texto que devolve problemas NOMEADOS — a prova de mordida (mutação em memória) assere pelo nome, não por lista não vazia"
    - "Guarda PL/pgSQL fail-closed: coalesce(x, 0) = 0 para população, IS DISTINCT FROM 0 para contagem de defeito"
    - "Leitura dupla de bloco colado: extração canônica rígida + contagem permissiva, comparadas por igualdade"

key-files:
  created: []
  modified:
    - supabase/tests/p44_export_drift_smoke.sql
    - docs/compliance/__tests__/exportAllowlist.test.ts
    - docs/compliance/__tests__/genExportAllowlist.test.ts

key-decisions:
  - "WR-03: as quatro guardas de população viram coalesce((r->>'<k>')::int, 0) = 0 e a de drift (r->>'n_drift')::int IS DISTINCT FROM 0 — mais nada do smoke mudou (VALUES, predicado, vereditos e json_build_object byte a byte)"
  - "(k3) prende o agregador pela FORMA (contagem nua de CTE do arquivo, derivada do texto); o único nome fixo é `drift`, escopo deliberado — é a CTE cujos braços são presos ao 05, e o 05 não tem agregador para comparar"
  - "(k) ganha a contagem permissiva SEM afrouxar a canônica; o terceiro recorte passa a terminar em com_veredito(...) AS ( para a permissiva não ler o predicado"
  - "Prefixo comum só nos catálogos LOCAIS de (i)/(i2)/(i3) — o CATALOGO_BASE fica intocado porque o caso (a) o fixa"
  - "Cabeçalho do smoke passa de «TRÊS» para «QUATRO FORMAS DE PROVAR» (linha de comentário) com a quarta: chave renomeada num scratch"

patterns-established:
  - "Prova de mordida permanente na suíte: rótulo `M<n> ·`, âncora casa 1x, mutação muda o texto, checador nomeia o alvo"

requirements-completed: [EXPORT-04]

coverage:
  - id: D1
    description: "Smoke p44_export_drift falha FECHADO: chave renomeada/ausente no json_build_object reprova (WR-03), provado contra PROD só leitura antes (aprovava) e depois (reprova)"
    requirement: EXPORT-04
    verification:
      - kind: integration
        ref: "node p46apply.cjs run <scratch>/{a,b,c,d,e}.sql (SET TRANSACTION READ ONLY na 1ª linha) — cadeia A–E do verify do Task 1"
        status: pass
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k3) o smoke falha alto, falha FECHADO e roda o MESMO predicado do relatório"
        status: pass
    human_judgment: false
  - id: D2
    description: "(k3): predicado do smoke = relatório 05; DO $gate$ único, sem EXCEPTION WHEN, guardas exatas, chave lida ⊆ construída, agregador = contagem nua (WR-02)"
    requirement: EXPORT-04
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k3) o smoke falha alto, falha FECHADO e roda o MESMO predicado do relatório"
        status: pass
    human_judgment: false
  - id: D3
    description: "(k) vê toda tupla que o SQL executa: contagem permissiva == canônica por bloco e por arquivo (WR-01)"
    requirement: EXPORT-04
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k) os três `VALUES` do relatório E do smoke de drift estão em sincronia com o artefato"
        status: pass
    human_judgment: false
  - id: D4
    description: "(k4): M1–M18 em memória sobre o smoke real, cada uma reprovando no checador correspondente com o alvo nomeado; M1+M2 = 526/528"
    requirement: EXPORT-04
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/exportAllowlist.test.ts#(k4) os portões (k) e (k3) MORDEM — mutações em memória do smoke real"
        status: pass
    human_judgment: false
  - id: D5
    description: "(i)/(i2) comparam com a ordem que o gerador emite, fixture local com prefixo comum; (i3) prova a mordida (WR-07)"
    requirement: EXPORT-04
    verification:
      - kind: unit
        ref: "docs/compliance/__tests__/genExportAllowlist.test.ts#(i3) a checagem de ordem MORDE e a fixture exerce o prefixo comum (WR-07)"
        status: pass
      - kind: other
        ref: "npm run -s check:export-allowlist"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-10-06
status: complete
---

# Phase 44 Plan 15: CR-01 · portões Summary

**O smoke de drift deixou de aprovar quando uma chave some (`coalesce`/`IS DISTINCT FROM 0`, provado contra PROD só leitura: o arquivo anterior aprovava com drift presente e o novo reprova). (k3) prende predicado, estrutura e agregador do smoke ao relatório 05. (k) conta toda tupla executada. (k4) carrega 18 mutações vistas mordendo. (i)/(i2) ordenam como o gerador, e (i3) prova a mordida.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-10-06T23:49:23Z
- **Completed:** 2026-10-06T23:58:00Z
- **Tasks:** 3/3
- **Files modified:** 3 (+ STATE/ROADMAP/SUMMARY)

## Accomplishments

- **WR-03 fechado e provado contra o banco real.** No `DO $gate$`, as quatro guardas de população usam `coalesce((r->>'<k>')::int, 0) = 0` e a de drift usa `(r->>'n_drift')::int IS DISTINCT FROM 0`. O resto do smoke ficou byte a byte: `VALUES`, predicado, vereditos e `json_build_object`.
- **WR-02 fechado.** A (k3) compara `com_veredito`, `tabelas_vivas`, `vivo` e os dois braços do `drift` com o relatório 05. Ela também prende a estrutura que falha alto e o agregador.
- **WR-01 fechado.** A (k) compara a contagem permissiva com a canônica, por bloco e por arquivo. A extração canônica não mudou.
- **WR-07 fechado.** (i)/(i2) usam a chave real do gerador, as fixtures locais exercem o prefixo comum e (i3) morde.
- Suíte `docs/compliance/__tests__`: **91 testes verdes** (eram 69: +1 (k3), +20 na (k4) [META + M1–M18 + M1+M2], +1 (i3)). `check:export-allowlist` OK. Gerador, relatório 05, allowlist, YAML e EF intocados desde `85bb3c96`.

## Task Commits

1. **Task 1 (tracer): smoke fail-closed + (k3) + cadeia PROD só leitura**: `f2e357a8` (fix)
2. **Task 2: (k) permissiva + (k4) M1–M18**: `a38041ae` (test)
3. **Task 3: (i)/(i2) com a chave do gerador + (i3)**: `813b191c` (test)

**Plan metadata:** o commit `docs(44-15)` deste SUMMARY + STATE + ROADMAP.

## Task 1: o vermelho da (k3) antes do conserto

Rodei a (k3) sobre o smoke de HEAD (= `0fde284f`) ANTES de tocar nele. `problemasDoPredicado` devolveu `[]`. `problemasDaEstrutura` devolveu exatamente 10 problemas, e todos são das guardas fail-open. Nenhum é de CTE, braço ou agregador:

```
chave n_tabelas_vivas: comparação nua (r->>'n_tabelas_vivas')::int = — …(WR-03)
chave n_tabelas_com_disposicao: comparação nua (r->>'n_tabelas_com_disposicao')::int = — …
chave n_colunas_vivas_em_escopo: comparação nua (r->>'n_colunas_vivas_em_escopo')::int = — …
chave n_pares_com_veredito: comparação nua (r->>'n_pares_com_veredito')::int = — …
chave n_drift: comparação nua (r->>'n_drift')::int > — …
guarda de população (1º IF do DO $gate$): termo «(r->>'n_tabelas_vivas')::int = 0» fora da forma coalesce(...) (×4, uma por chave)
guarda de drift: o DO $gate$ não contém, contíguo, IF (r->>'<k>')::int IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'P44-DRIFT FAIL: (WR-02/WR-03)
```

Depois do conserto a (k3) ficou verde (70/70 na suíte naquele ponto).

## Task 1: as cinco execuções contra PROD (só leitura)

Janela de 2026-10-06T23:53:17Z a 23:53:21Z. Cada arquivo começa por `SET TRANSACTION READ ONLY;` (primeira linha conferida nos cinco) e mora no scratch da sessão, fora do repositório. O comando foi `node p46apply.cjs run`, uma requisição por arquivo, e houve **zero escritas**. A cadeia inteira do `<automated>` terminou com `fail-open reproduzido antes, fechado depois; limpo aprova` (exit 0).

| Exec | Arquivo | Populações (lidas antes do booleano) | Resultado |
|---|---|---|---|
| **A** antes / fail-open | smoke de `0fde284f` com `n_drift` renomeada E `('retencao_hold','detalhe')` removida | 75 tabelas vivas · 75 com disposição · 32 em escopo · 451 colunas vivas em escopo · **450** pares | `"pass": true`, `"n_drift": null`: **aprovou com drift presente** (fail-open reproduzido, como o planejador mediu às 22:05Z) |
| **B** depois / mutado | smoke novo com as mesmas duas mutações | 75 · 75 · 32 · 451 · 450 | `HTTP 400 … P44-DRIFT FAIL: n_drift=<NULL> · populações: … · linhas: retencao_hold.detalhe — COLUNA NOVA NO BANCO — sem veredito em export-scope-rules.yaml` |
| **C** população | smoke novo com `n_tabelas_vivas` renomeada | n_tabelas_vivas=`<NULL>` · 75 · 451 · 451 | `HTTP 400 … P44-DRIFT FAIL (população vazia): n_tabelas_vivas=<NULL> n_tabelas_com_disposicao=75 n_colunas_vivas_em_escopo=451 n_pares_com_veredito=451 — um banco que não foi lido não aprova nada` (UTF-8 íntegro) |
| **D** clássica | smoke novo sem `('retencao_hold','detalhe')` | 75 · 75 · 32 · 451 · 450 | `HTTP 400 … P44-DRIFT FAIL: n_drift=1 · … · linhas: retencao_hold.detalhe — COLUNA NOVA NO BANCO …` |
| **E** limpo | smoke novo sem mutação; `tail -n +2 e.sql` igual ao versionado (`cmp`) | **75 · 75 · 32 · 451 · 451** | `"pass": true`, `"n_drift": 0` |

As populações de E batem com a baseline do 44-12 e do planejador: 75 tabelas, 451 colunas vivas em escopo = 451 pares com veredito. Nenhum arquivo novo apareceu sob `supabase/tests` nem sob `docs/compliance`.

## Task 2: o vermelho invertido da (k4) e o mapa rota → mutação

Primeiro escrevi a (k4) com a expectativa de mordida **invertida**. O resultado foi **18 failed | 16 passed (34)**. Cada uma das 18 falhou depois de passar por «âncora casa 1x» e «mudou o texto», e o motivo foi o checador ter devolvido o alvo nomeado. Exemplos da saída: M1 `contagem permissiva do bloco allowlist (396) deveria DIFERIR da canônica (395)`; M12 `["drift: 1 braço(s), esperado 2 (…)"]`; M18 `["agregador da chave n_tabelas_vivas: «(SELECT 1)» não é contagem nua …"]`. Com a expectativa certa ficou 34/34.

| Rota (re-revisão / checker) | Mutação | Checador | Problema nomeado |
|---|---|---|---|
| WR-01 tupla fora do formato | **M1** recuo de 2 espaços | (k) | allowlist: permissiva 396 ≠ canônica 395 |
| WR-01 tupla fora do formato | **M2** espaço depois da vírgula | (k) | allowlist: permissiva 396 ≠ canônica 395 |
| WR-02 `tabelas_vivas` só no smoke | **M3** `AND t.table_name NOT LIKE 'purga%'` | predicado | `tabelas_vivas: o corpo da CTE no smoke diverge do relatório 05` |
| WR-02 `DO $gate$` removido | **M4** | estrutura | `DO $gate$: 0 ocorrência(s), esperado 1` (+ fecho ausente, `'pass'`) |
| WR-02 `EXCEPTION WHEN OTHERS` | **M5** | estrutura | `EXCEPTION WHEN presente no smoke` |
| WR-02/03 ramo `n_drift` | **M6** `IS DISTINCT FROM 0` → `> 0` | estrutura | `chave n_drift: comparação nua (r->>'n_drift')::int >` (+ guarda de drift fora da forma) |
| WR-03 chave renomeada | **M7** `'n_drift'` → `'n_drift_renomeada'` | estrutura | `chave n_drift: lida por ->> mas não construída` |
| WR-02 `vivo` só no smoke | **M8** `AND c.column_name::text NOT LIKE 'tmp%'` | predicado | `vivo: o corpo da CTE …` |
| WR-02 `com_veredito` só no smoke | **M9** `WHERE e.tabela <> 'retencao_hold'` | predicado | `com_veredito: o corpo da CTE …` |
| WR-02 `FULL OUTER JOIN … WHERE` | **M10** → `LEFT JOIN` | predicado | `drift_coluna: o 1º braço … diverge` |
| WR-02 `FULL OUTER JOIN … WHERE` | **M11** sem `OR dt.tabela IS NULL` | predicado | `drift_tabela: o 2º braço … diverge` |
| partição em dois braços | **M12** braço de tabela inteiro retirado | predicado | `drift: 1 braço(s), esperado 2` |
| WR-02 ramo `n_drift` | **M13** `IF` de drift inteiro retirado | estrutura | `… IF (r->>'<k>')::int IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'P44-DRIFT FAIL:` |
| WR-02 ramo `n_drift` | **M14** só o `RAISE` de drift → `NULL;` | estrutura | idem |
| WR-02 `RAISE` de população | **M15** → `NULL;` | estrutura | `… não é seguido de RAISE EXCEPTION 'P44-DRIFT FAIL (população vazia)` |
| agregador (checker) | **M16** `(SELECT 0)` | estrutura | `agregador da chave n_drift (guarda de drift): «(SELECT 0)» …` |
| agregador (checker) | **M17** `… FROM drift WHERE false` | estrutura | `agregador da chave n_drift …` |
| agregador (checker), regra derivada | **M18** `n_tabelas_vivas` → `(SELECT 1)` | estrutura | `agregador da chave n_tabelas_vivas: «(SELECT 1)» não é contagem nua` |

**O número do revisor foi reproduzido.** Com M1+M2 aplicadas juntas, a extração canônica do smoke continua em **526** pares e a contagem permissiva sobe para **528**. Isso foi medido fora da suíte, e o caso `M1+M2 juntas ·` da (k4) prende a mesma relação (canônica imóvel, permissiva +2) sem constante.

## Task 3: o vermelho de (i)/(i2) com a chave antiga, e o verde depois

Com os catálogos locais novos e a chave antiga (`replace(/[(),']/g, '|')`), o resultado foi **2 failed | 12 passed (14)**. É o falso vermelho que o WR-07 previu, e o gerador estava certo nos dois casos:

```
(i)  - "    ||candidatos|||ativo|||",            ← o gerador emitiu ativo antes de ativo_publico (correto)
       "    ||candidatos|||ativo_publico|||",
     + "    ||candidatos|||ativo|||",
(i2) - "    ||config_sla_dados|||configuracao_do_produto|||",
       "    ||config_sla_dados_historico|||configuracao_do_produto||",
     + "    ||config_sla_dados|||configuracao_do_produto|||",
```

Depois de trocar para `ordenadoComoOGerador` e acrescentar a (i3), o arquivo ficou em **15/15**. A (i3) prova duas coisas: a saída invertida reprova, e a chave antiga reprovaria a saída correta, ou seja, a fixture ainda exerce o prefixo comum. Acceptance: `ordenadoComoOGerador` aparece 6×, a chave antiga 1× (só na (i3)), e as linhas do array `CATALOGO_BASE` não mudaram.

## Files Created/Modified

- `supabase/tests/p44_export_drift_smoke.sql`: guardas do `DO $gate$` fail-closed, mais comentários (bloco e cabeçalho «QUATRO FORMAS», a quarta é a chave renomeada). `git diff 0fde284f` só toca o bloco e linhas de comentário.
- `docs/compliance/__tests__/exportAllowlist.test.ts`: helpers puros `semComentarioSql`, `corpoDaCte`, `fechamento`, `ocorrencias`, `bracosDoUnion`, `profundidades`, `problemasDoPredicado`, `problemasDaEstrutura` e `paresDoTexto` (`paresDoArquivo` virou invólucro dele); (k) estendida; (k3) e (k4) novas.
- `docs/compliance/__tests__/genExportAllowlist.test.ts`: `ordenadoComoOGerador`, `CATALOGO_PREFIXO_COLUNA` e `CATALOGO_PREFIXO_TABELA` (locais), (i)/(i2) corrigidas, (i3) nova.

## Decisions Made

Ver `key-decisions` no frontmatter. Em resumo: o conserto do smoke ficou restrito às guardas. O agregador é preso pela forma e não por lista. A canônica continua rígida, e a permissiva é acrescentada a ela, não a substitui. O prefixo comum fica só nas fixtures locais.

## Deviations from Plan

**1. [Rule 3 - Blocking] O scratch da cadeia PROD é o diretório da sessão, não `mktemp -d`.**
- **Found during:** Task 1 (segundo `<automated>`)
- **Issue:** O `<automated>` do plano usa `S=$(mktemp -d)`. O orquestrador exigiu o scratch da sessão (`/private/tmp/claude-501/…/scratchpad`), que também fica fora do repositório.
- **Fix:** Rodei a cadeia com exatamente os mesmos passos, mutações e asserções, e só troquei `S` por `<scratchpad>/prod`.
- **Verification:** A cadeia saiu com 0 e imprimiu a linha final. A primeira linha dos 5 arquivos é `SET TRANSACTION READ ONLY;`.
- **Committed in:** n/a (nada versionado)

**Total deviations:** 1 (Rule 3, só de caminho; não muda o que foi provado).
**Impact on plan:** Nenhum. Os tasks foram executados como escritos.

## Issues Encountered

Nenhum. Cada portão endurecido foi visto vermelho antes ((k3) contra o smoke antigo, (k4) invertida, (i)/(i2) com a chave antiga) e verde depois.

## TDD Gate Compliance

Os Tasks 2 e 3 têm `tdd="true"`, mas o plano é `type: execute` e manda **um** commit `test(44-15)` por task: são tasks só de teste, sem código de produção, e o vermelho fica registrado neste SUMMARY. Por isso não há par `test`→`feat` separado. O vermelho de cada um está descrito acima, e os dois falharam pela asserção-alvo, não por erro de carga.

## Threat Flags

Nenhuma superfície nova. As requisições a PROD foram só leitura (T-44-91 mitigada: `SET TRANSACTION READ ONLY`, scratch fora do repo, `cmp` do corpo limpo), e não houve sonda de DDL.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **44-16** (publicação com checkpoint do operador): os portões sobre a árvore exata já estão verdes (91/91, `check:export-allowlist` OK). Nada foi publicado: `origin/main..HEAD` tem os commits do 44-14 e do 44-15, e o push pertence ao 44-16.
- O smoke versionado mudou. Ele não é aplicado (é `run`), e a forma limpa já foi vista aprovando contra PROD (E).

---
*Phase: 44-exporta-o-acesso*
*Completed: 2026-10-06*

## Self-Check: PASSED

- FOUND: supabase/tests/p44_export_drift_smoke.sql, docs/compliance/__tests__/exportAllowlist.test.ts, docs/compliance/__tests__/genExportAllowlist.test.ts
- FOUND commits: f2e357a8, a38041ae, 813b191c (`git rev-list --count 5e06d967..813b191c` = 3)
