---
phase: 44-exporta-o-acesso
plan: 12
subsystem: compliance
tags: [lgpd, export, art-18-ii, sc3, g5, allowlist, portoes, mutacao, prod-read-only]

requires:
  - phase: 44-exporta-o-acesso
    provides: "44-11: allowlist 1.4.0 (75 = 32 + 43 tabelas; 451 = 395 + 56 pares), vereditos G5 BD-9..BD-13, três VALUES regenerados no 05 e no smoke"
provides:
  - "exportAllowlist.test.ts (l): proibições e vereditos explícitos do G5 presos por NOME (prefixo `G5 (l):`), fora de snapshot"
  - "exportar-meus-dados/__tests__/index.test.ts (19): ponte e vetos por token sobre as leituras reais do handler (prefixo `G5 (19):`)"
  - "mordidas M-a e M-b vistas por execução, restauração conferida por md5"
  - "SC#3 medido contra PROD: smoke p44_export_drift APROVA (n_drift 0) e relatório 05 = []"
  - "item da 48 «Drift de export pré-existente: 9 colunas» → resolved"
affects: [44-13, re-verificação da Phase 44]

estimate:
  tokens: 60000
  tasks: 3
actuals:
  tokens: 2585     # chars/4 sobre as linhas ACRESCENTADAS do diff 0bca7fff..fb1c50d2 (10338 chars)
  tasks: 3
  commits: 3       # git rev-list --count 0bca7fff..fb1c50d2
plan_head_before: 0bca7fffd0a5162712e32c1263a361f963980bab
plan_head_after: fb1c50d244a1cca073a321beb41dab3cc8da0f17

tech-stack:
  added: []
  patterns:
    - "proibição nomeada fora de snapshot: lista literal = registro da decisão; meta-asserção contra vacuidade (lista vazia / tabela sumida)"
    - "proveniência como contrato: veredito explícito de coluna `*_em` exigido como `decisoes_por_coluna`, porque a R1 a admitiria calada"
    - "comparação de select por token (`split(\", \")`), com meta-sonda que prova que substring não conta"

key-files:
  created: []
  modified:
    - docs/compliance/__tests__/exportAllowlist.test.ts
    - supabase/functions/exportar-meus-dados/__tests__/index.test.ts
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

key-decisions:
  - "A (l) também prende o PREFIXO da razão de cada veto (`decisoes_por_coluna:` para detalhe/plano/recibo_enviado_em; `pii_de_terceiro (R2)` para os *_por): uma coluna vetada tem de estar fora PELO veredito decidido, não por acidente de outra regra"
  - "O (19) assere também que as duas tabelas novas são lidas DEPOIS da ponte e sem `eq` — o filtro é só `in(candidatura_id, ids da ponte)`"
  - "Os verifies do plano foram rodados sob `bash`: o shell da sessão é zsh, que não faz word-splitting de `$F` sem aspas (ver Deviations)"

requirements-completed: [EXPORT-02, EXPORT-04]

coverage:
  - id: D1
    description: "(l) nomeada: 7 vetadas, 4 tabelas fora, 13 vereditos explícitos; vermelho antes do verde; M-a mordeu"
    requirement: "EXPORT-02"
    verification:
      - kind: unit
        ref: "<verify> do Task 1 — «(l) verde, mordeu em M-a e voltou byte a byte»; md5 export-allowlist.json a32b0be02b6b336b7b6d69136f9b23f9 antes = depois"
        status: pass
    human_judgment: false
  - id: D2
    description: "Deno (19): ponte e vetos por token; vermelho antes do verde; M-b reprovou (l) e (19) pelo nome"
    requirement: "EXPORT-04"
    verification:
      - kind: unit
        ref: "<verify> do Task 2 (sob bash) — «(19) verde, M-b mordeu nos dois portoes e voltou byte a byte»; md5 conjunto 40a59d18d054dcdef9101bec68e577df antes = depois; Deno 20 → 21"
        status: pass
    human_judgment: false
  - id: D3
    description: "SC#3 contra PROD: smoke aprova com populações > 0 e iguais; relatório 05 = []"
    requirement: "EXPORT-04"
    verification:
      - kind: integration
        ref: "node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql (2026-10-06T21:05:06Z) — exit 0, pass true, n_drift 0, 75/75, 32, 451/451; node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql — exit 0, `[]`"
        status: pass
    human_judgment: false

duration: ~4min de execução (ledger 2026-10-06T21:02:09Z → último commit de task ~21:05:30Z), leitura de contexto antes disso
completed: 2026-10-06
status: complete
---

# Phase 44 Plan 12: os portões do G5 nascem e são vistos mordendo, e PROD é medido limpo — Summary

**Agora as decisões do G5 têm asserções que falham com o nome da coluna. São duas: a (l) no Vitest, sobre o artefato, e a (19) no Deno, sobre o que o handler pede ao banco. As duas foram vistas falhando por mutação, com os arquivos restaurados byte a byte. Contra PROD, o smoke `p44_export_drift`, que reprovou no 44-10 com `n_drift=15`, aprova com `n_drift 0`, 75 tabelas vivas = 75 com disposição e 451 colunas vivas em escopo = 451 pares com veredito. O relatório `05` devolve `[]`.**

## Performance

- **Tasks:** 3/3
- **Commits de task:** 3 (`git rev-list --count 0bca7fff..fb1c50d2` = 3)
- **Arquivos:** 3 alterados, 178 inserções, 1 remoção (`git diff --stat 0bca7fff..fb1c50d2`)

## Task Commits

1. **Task 1: a (l), proibições nomeadas do G5**: `d32dc826` (test)
2. **Task 2: o Deno (19), ponte e vetos por token**: `6e061722` (test)
3. **Task 3: smoke e relatório contra PROD; item da 48 fechado**: `fb1c50d2` (docs)

## Task 1: a (l)

**Conteúdo.** Três laços nomeados, com listas literais e mensagens `G5 (l): tabela.coluna …`:
- 7 VETADAS: fora de `colunas`, dentro de `colunas_excluidas`, e a razão começa pelo prefixo decidido.
- 4 TABELAS FORA: `excluidas[t]` é igual à razão decidida, e `tabelas[t]` não existe.
- 13 VEREDITOS EXPLÍCITOS: estão em `colunas`, com `proveniencia[c] === 'decisoes_por_coluna'`.

Há também uma meta-asserção: as listas não são vazias e cada tabela citada existe em `tabelas`. Um docblock explica por que nada disso é snapshot, explica a armadilha da R1 e diz por que `id`/`candidatura_id` das tabelas novas ficam de fora (entram pela R1, como em toda tabela em escopo). `grep -c "G5 (l):"` = 9.

**Vermelho antes do verde.** Na primeira versão, de propósito, `cancelado_em` estava na lista de vetadas e `recibo_enviado_em` na de vereditos explícitos (par trocado):
```
exit=1
AssertionError: G5 (l): solicitacoes_dados.cancelado_em está na CÓPIA — o G5 a vetou (fora da cópia do titular): expected [ 'atendido_em', …(11) ] to not include 'cancelado_em'
Tests  1 failed | 12 passed (13)
```
Com o par corrigido: `Tests  13 passed (13)` (antes do plano: 12).

**Mordida M-a.** O `<verify>` do Task 1 foi rodado literal. Ele troca, no JSON versionado, `"cancelado_em": "decisoes_por_coluna"` por `"R1"`:

| | md5 `docs/compliance/export-allowlist.json` |
|---|---|
| antes | `a32b0be02b6b336b7b6d69136f9b23f9` |
| mutado | `40d570846e158b1b06eb98d005879b3c` |
| depois (restaurado da cópia) | `a32b0be02b6b336b7b6d69136f9b23f9` |

Saída da mutação (`Tests  2 failed | 11 passed (13)`):
```
× (h) o espelho `_shared/exportAllowlist.ts` está em sincronia com o `.json`
× (l) proibições nomeadas do G5 (44-11) — sobrevivem a um `vitest -u`
AssertionError: G5 (l): solicitacoes_dados.cancelado_em — proveniência deveria ser «decisoes_por_coluna»: o veredito escrito sumiu e a coluna entra calada pela R1 (o fecho do gerador não reprova isso; esta asserção sim): expected 'R1' to be 'decisoes_por_coluna' // Object.is equality
```
A (h) reprovou porque só o `.json` foi mutado e o espelho `.ts` ficou como estava, o que é esperado. Depois da restauração: `Tests  13 passed (13)`, e a linha final «(l) verde, mordeu em M-a e voltou byte a byte» foi impressa.

## Task 2: o Deno (19)

**Conteúdo.** O caso «(19) G5 — as duas tabelas novas entram pela ponte candidaturas, e as colunas vetadas nunca chegam ao select» assere o seguinte:
- `retencao_hold` e `cognitivo_liberacao` têm `ligacao === "via:candidaturas"` e `chave_titular === "candidatura_id"` no artefato importado.
- Cada uma é lida DEPOIS da leitura de `candidaturas`, com `in("candidatura_id", [CANDIDATURA_ID])` e nenhum `eq`.
- Os vetos são conferidos por token (`cols.split(", ")`). Nenhum destes aparece no select: `retencao_hold.{detalhe, criado_por, liberado_por}`, `cognitivo_liberacao.{liberado_por, revogado_por}`, `solicitacoes_dados.{plano, recibo_enviado_em}`.
- Lado positivo: `executar_em` e `cancelado_em` estão no select de `solicitacoes_dados`.
- Meta-sonda: `"a, detalhe_x, b"` não contém o token `detalhe`, e `"a, detalhe, b"` contém.

`grep -c "G5 (19):"` = 12.

**Vermelho antes do verde.** Na primeira versão, a lista de `retencao_hold` tinha `motivo` no lugar de `detalhe`:
```
exit=1
(19) G5 — … ... FAILED
error: AssertionError: G5 (19): retencao_hold.motivo está no select da EF — o G5 a vetou
FAILED | 20 passed | 1 failed
```
Com a lista corrigida: `ok | 21 passed | 0 failed`. Antes do plano eram 20.

**Mordida M-b**, ponta a ponta. O `<verify>` do Task 2 foi rodado literal, sob `bash`. Ele troca o `export: false` de `retencao_hold.detalhe` no YAML por `export: true` e roda `node docs/compliance/sql/gen-export-allowlist.cjs`, que sai com 0 («gerador exit 0 na mutacao»):

| Arquivo | md5 antes | md5 depois |
|---|---|---|
| `docs/compliance/export-scope-rules.yaml` | `6b7472c3942fce965ee068a10173bdcb` | `6b7472c3942fce965ee068a10173bdcb` |
| `docs/compliance/export-allowlist.json` | `a32b0be02b6b336b7b6d69136f9b23f9` | `a32b0be02b6b336b7b6d69136f9b23f9` |
| `supabase/functions/_shared/exportAllowlist.ts` | `89d9f6636053a6d34cfda12ecfb78f69` | `89d9f6636053a6d34cfda12ecfb78f69` |
| conjunto (`cat $F \| md5`) | `40a59d18d054dcdef9101bec68e577df` | `40a59d18d054dcdef9101bec68e577df` (mutado: `85e8e6902fc9c42a1a0f4a1e5cf4fad7`) |

Saída do Vitest na mutação (`Tests  4 failed | 9 passed (13)`):
```
× (b) o conjunto achatado `tabela.coluna` está congelado
× (j) o conjunto do que FICOU DE FORA com veredito também está congelado
× (k) os três `VALUES` do relatório E do smoke de drift estão em sincronia com o artefato
× (l) proibições nomeadas do G5 (44-11) — sobrevivem a um `vitest -u`
AssertionError: G5 (l): retencao_hold.detalhe está na CÓPIA — o G5 a vetou (fora da cópia do titular): expected [ 'candidatura_id', 'criado_em', …(4) ] to not include 'detalhe'
```
Saída do Deno na mutação:
```
(19) G5 — … ... FAILED
error: AssertionError: G5 (19): retencao_hold.detalhe está no select da EF — o G5 a vetou
FAILED | 20 passed | 1 failed
```
Isto mostra a razão de ser do plano. Na M-b, (b) e (j) reprovam, mas como snapshots um `vitest -u` os reescreveria e eles passariam a aceitar `detalhe` na cópia. A (k) reprova até alguém regerar os VALUES, e regerar é o que a mensagem dela manda fazer. Só a (l) e a (19) continuam reprovando com o nome da coluna depois de um `-u` e de uma regeração.

Depois da restauração: `check:export-allowlist` OK, Vitest `13 passed (13)`, Deno `21 passed | 0 failed`, e a linha final «(19) verde, M-b mordeu nos dois portoes e voltou byte a byte» foi impressa (exit 0). `git status --porcelain -- docs/compliance supabase/functions/_shared` saiu vazio.

## Task 3: PROD medido (só leitura)

`node p46apply.cjs run …` manda o arquivo como está, «SEM registro no ledger». O smoke só tem `set_config`, `DO … RAISE` e `SELECT`, e a (k) garante que não há palavra de escrita fora de comentário.

**Populações primeiro, no mesmo banco, antes e depois:**

| População | 44-10 (2026-10-06T20:45:41Z, allowlist 1.3.0) | 44-12 (2026-10-06T21:05:06Z, allowlist 1.4.0) |
|---|---|---|
| `n_tabelas_vivas` | 75 | **75** |
| `n_tabelas_com_disposicao` | 69 | **75** |
| `n_tabelas_em_escopo` | 30 | **32** |
| `n_colunas_vivas_em_escopo` | 436 | **451** |
| `n_pares_com_veredito` | 427 | **451** |
| `n_drift` | 15 (6 TABELA NOVA + 9 COLUNA NOVA) | **0** |
| desfecho | exit 1, `P44-DRIFT FAIL: n_drift=15` | **exit 0, `pass: true`** |

Os números fecham entre si. O número de tabelas vivas não mudou (75), e as 6 que faltavam agora têm disposição (69 → 75): 2 entraram em escopo (30 → 32) e 4 ficaram fora. As colunas vivas em escopo cresceram 15 (436 → 451), que são as 10 das duas tabelas novas mais as 5 a mais que o catálogo do 44-11 conta nelas. Todas têm veredito (427 → 451, +24 = as 9 colunas novas + as 15 das tabelas novas). Os mesmos números aparecem nos totais da 1.4.0: 451 = 395 + 56, e 32 + 43 = 75. Os acceptance criteria previam 75 / 32 / 451 / 0, e foi o que se mediu.

Saída literal do smoke:
```json
{"smoke":"p44_export_drift","pass":true,"n_tabelas_vivas":75,"n_tabelas_com_disposicao":75,"n_tabelas_em_escopo":32,"n_colunas_vivas_em_escopo":451,"n_pares_com_veredito":451,"n_drift":0}
```
Relatório `05` contra PROD: exit 0 e uma linha exatamente `[]`. Esse `[]` não vem de uma população vazia: o mesmo relatório devolveu 15 linhas contra este banco no 44-10, e o smoke de agora, com o mesmo predicado, mediu populações maiores que zero.

O `<verify>` literal do Task 3 rodou de novo depois da edição da 48, re-executando smoke e relatório. Imprimiu o mesmo `resultado` e «G5 fechado contra PROD» (exit 0).

**Item da 48.** «Drift de export pré-existente: 9 colunas vivas sem veredito» passou para `status: resolved`, com a linha «Resolvido nos planos 44-11/44-12 (2026-10-06): …» e as populações medidas. `git diff fb1c50d2^..fb1c50d2 -- …/deferred-items.md` mostra 2 inserções e 1 remoção, todas dentro desse item. Nenhum outro item mudou.

## Verificação do plano

- `npx vitest run docs/compliance/__tests__ src/features/privacidade` → 15 arquivos, **223/223** (o 44-11 tinha 222; +1 = a (l)).
- `check:export-allowlist`, `check:recibo-exclusao`, `check:matriz-retencao`, `check:pii-inventory-md` → exit 0 nos quatro.
- `deno test --allow-all supabase/functions/exportar-meus-dados/` → **21 passed / 0 failed**.
- Nada publicado. Nenhum deploy de EF, nenhum `git push`: `git log --oneline origin/main..HEAD | wc -l` = 20 commits locais, os do 44-10/44-11 mais os 3 deste plano. Publicar é do 44-13.
- O hook de pre-commit relatou `tsc errors: 89 (frozen baseline: 96)` nos três commits, ou seja, sem regressão de tipos.

## Deviations from Plan

### Ajustes

**1. [Rule 3 - ferramenta] Os `<verify>` com `F="a b c"` e `cp $F` foram rodados sob `bash`**
- **Found during:** Task 2
- **Issue:** o shell da sessão é zsh, que não faz word-splitting de `$F` sem aspas. Na primeira execução, `md5 $F`/`cp $F "$S/"` receberam os três caminhos como UM argumento e falharam («No such file or directory»). A cadeia `&&` parou ANTES de qualquer mutação. O `trap` disparou e o `cp` dele, a partir do scratch vazio, falhou sem efeito. `git status --porcelain -- docs/compliance supabase/functions/_shared` confirmou os três artefatos intocados.
- **Fix:** o mesmo comando, sem mudar nada, salvo num script e executado com `bash`. O verify do Task 1 não usa `$F` e rodou direto no zsh. O do Task 3 também foi rodado sob `bash -c`, por coerência.
- **Commit:** nenhum (não muda código).

**2. [Rule 2 - correção] A (l) prende também o prefixo da razão dos vetos, e o (19) a ordem ponte → tabela e a ausência de `eq`**
- Não estava no `<behavior>`. Sem o prefixo, `retencao_hold.detalhe` poderia ficar fora por outra regra (uma R2 acidental, por exemplo) e a decisão BD-10 deixaria de ser a razão sem que nada reprovasse. Sem a ordem, uma leitura sem a ponte não seria distinguível pelo filtro. São asserções a mais, e nenhuma lista do plano mudou.
- **Commits:** `d32dc826`, `6e061722`

O resto foi executado como escrito.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova. O plano só mexeu em testes e num registro de planejamento. As mitigações T-44-78..T-44-82 foram aplicadas e conferidas por execução:
- T-44-78: (l) mais M-b.
- T-44-79: (19) mais M-b.
- T-44-80: proveniência das 13 colunas mais M-a.
- T-44-81: cópia prévia, `trap`, md5 e suíte verde dentro do mesmo verify.
- T-44-82: smoke e relatório executados, com populações.

## Next Phase Readiness

- **44-13:** publicar a EF `exportar-meus-dados` (que no ar ainda serve a 1.3.0) e o front, e só então empurrar `main`. Depois do deploy, conferir que o marcador chegou ao chunk certo (CLAUDE.md).
- As 2 falhas pré-existentes de `src/__tests__/promessasComExecutor.test.ts` (`faseDona 'Phase 46'`), registradas no 44-11, ficam fora do escopo deste plano.

## Self-Check: PASSED

- FOUND `d32dc826`, `6e061722`, `fb1c50d2` (`git cat-file -e`)
- `grep -c "G5 (l):" docs/compliance/__tests__/exportAllowlist.test.ts` = 9 (≥ 3)
- `grep -c "G5 (19):" supabase/functions/exportar-meus-dados/__tests__/index.test.ts` = 12 (≥ 1)
- `grep -c "44-12" .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md` = 1
