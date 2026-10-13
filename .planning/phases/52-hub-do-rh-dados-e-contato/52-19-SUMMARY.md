---
phase: 52-hub-do-rh-dados-e-contato
plan: 19
subsystem: database
tags: [bloco-d, limpeza, dados-de-teste, lgpd, d-30, d-32, d-41, backup, management-api, populacao, portao, smoke, so-leitura, checkpoint-decision, jorn-63]

requires:
  - phase: 52-32
    provides: "a 20261011000007 em PROD com aplicado_ate 2026-10-13T01:29:02Z — o último apply da fase, contra o qual o backup diário é conferido"
  - phase: 52-26
    provides: "52-APLICACOES.json (instante de cada apply p52), p52_portao.cjs e o mecanismo do token do p46apply.cjs"
  - phase: 52-18
    provides: "52-18-DECISAO-OPERADOR.md item 3 (lista da D-30 por inteiro; a 3a9254c3 tem de estar na população)"
  - phase: 52-01
    provides: "p52_ensaio.cjs (ensaio que aborta contra PROD)"
provides:
  - "scripts/p52_backup.cjs — conferência da D-41 emendada (condição 1): GET só leitura de database/backups + ledger p52 + 52-APLICACOES.json; julgar exportado; --auto-teste 29/29; modo --apply --decisao para o 52-21"
  - "scripts/p52_limpeza_portao.cjs — SQL_VARREDURA (começa por set transaction read only), PADROES_D30, SEMENTE_P47, OBRIGATORIAS_NA_POPULACAO, medir [--decisao] [--pos], comparar, --auto-teste 40/40"
  - "supabase/tests/p52_populacao_limpeza.sql — smoke52d, cláusulas (a)–(e), 5/5 no ensaio"
  - "52-19-POPULACAO.json — população medida em PROD (47 examinados, 46 na população, 9 vagas de teste, 2 colisões, 8 possível dado real), apagaveis/populacao_md5 = null"
  - "52-19-DECISAO-ESCOPO.md — escopo decidido pelo operador item a item; consumível pelo medir --decisao (38 entradas apagáveis, populacao_md5 1b4b21a93ff00a9d01f7d10926dd1f54)"
affects: [52-20, 52-27, 52-21, 52-22, fecho-do-m8]

# chars/4 sobre os 5 arquivos do plano no diff 97c39889..02013827 (93073 chars; este SUMMARY fora)
actuals:
  tokens: 23268
  tasks: 2
  commits: 5
plan_head_before: 97c39889a2cfcefbe08b175667d17150303faa89
plan_head_after: 0201382792846062115ff44789f7bdf05a981b8e

tech-stack:
  added: []
  patterns:
    - "Conferência de backup por máquina antes de bloco destrutivo: o instante do backup físico COMPLETED é comparado com o maior aplicado_ate registrado, e versão do ledger sem registro (ou registro sem versão) recusa"
    - "Medição da população pela MESMA query que o apply vai usar (dry-run pela mesma query), com contrato do JSON conferido antes de gravar e de novo, independente, no verify"
    - "Decisão do operador como arquivo de chave-por-linha lido por máquina: o recorte (manter) só retira de apagaveis, nunca acrescenta; categorias nunca-apagáveis recusadas no parser"
    - "Padrões com forma de e-mail moram só no script; JSON e decisão levam a impressão digital (padroes_md5) e as contagens"

key-files:
  created:
    - scripts/p52_backup.cjs
    - scripts/p52_limpeza_portao.cjs
    - supabase/tests/p52_populacao_limpeza.sql
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-19-POPULACAO.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-19-DECISAO-ESCOPO.md
  modified: []

key-decisions:
  - "Operador (2026-10-13): metodo teardown_do_unico; apagar ficticios, tombstones, contas_teste_com_candidatura e contas_sem_candidatura (38 entradas); os 3 auth.users órfãos ficam (backlog do fecho do M8)"
  - "Operador: 5 itens de possível dado real apagar (4dc31256, eb718a32, d5491f18, f8318f39, fa181f41), 3 manter (2a71d384, 95d4b83c, e41b0bd5)"
  - "Operador: deleted_at nas 8 vagas de teste sem deleted_at, inclusive as colisões 53b73af6/53f75c81; cb413d5d manter (já tem); nenhuma vaga removida"
  - "Operador: fixtures fixture-p46-* com teardown próprio no fecho do M8; storage_via script_local"
  - "Operador: vagas ativas fdbe1a4a e e897f709 mantidas (só as candidaturas são limpas; leitura do orquestrador da palavra truncada «—er» = «manter»); 9f6ccf1a fora do bloco D"
  - "Executor: a linha padroes: da decisão aponta para PADROES_D30 + SEMENTE_P47 do script (blob 5c062270) com o padroes_md5, em vez de copiar os padrões com forma de e-mail (regra de privacidade do despacho)"

patterns-established:
  - "Tradução resposta→categorias medidas escrita ao lado da linha apagar_categorias, com o que fica fora e por quê"

requirements-completed: [JORN-63]

coverage:
  - id: D1
    description: "Backup diário físico COMPLETED posterior ao último apply da fase conferido por máquina (D-41 emendada, condição 1)"
    requirement: "JORN-63"
    verification:
      - kind: integration
        ref: "node scripts/p52_backup.cjs --auto-teste && node scripts/p52_backup.cjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Portão da limpeza (SQL_VARREDURA, medir, comparar) com auto-teste do contrato e smoke52d no ensaio que aborta"
    requirement: "JORN-63"
    verification:
      - kind: unit
        ref: "node scripts/p52_limpeza_portao.cjs --auto-teste"
        status: pass
      - kind: integration
        ref: "node scripts/p52_ensaio.cjs --sem-migracoes supabase/tests/p52_populacao_limpeza.sql"
        status: pass
    human_judgment: false
  - id: D3
    description: "52-19-POPULACAO.json medido, no contrato, sem e-mail, com a 3a9254c3 na população"
    requirement: "JORN-63"
    verification:
      - kind: integration
        ref: "Task 1 <verify> #2 (medir + conferência do contrato; re-run em cópia fora do repositório, igual à commitada salvo medido_em)"
        status: pass
    human_judgment: false
  - id: D4
    description: "52-19-DECISAO-ESCOPO.md com todas as chaves, um destino por vaga e por possível dado real, verbatim do operador; consumível pelo medir --decisao"
    requirement: "JORN-63"
    verification:
      - kind: other
        ref: "Task 2 <verify> (escopo decidido: ...) e node scripts/p52_limpeza_portao.cjs medir <scratch> --decisao 52-19-DECISAO-ESCOPO.md"
        status: pass
    human_judgment: false
  - id: D5
    description: "O conteúdo do escopo da limpeza (o que se apaga e o que fica)"
    requirement: "JORN-63"
    verification: []
    human_judgment: true
    rationale: "Decisão do operador em checkpoint blocking-human (D-30 é porta de mão única); o executor só a registrou. Os números são aprovados de novo no 52-21, minutos antes do apply."

duration: 33min (execução; ~3h45 de relógio com a espera pelo operador)
completed: 2026-10-13
status: complete
---

# Phase 52 Plan 19: Bloco D parte 1 — população de teste medida e escopo decidido Summary

**Backup diário de 06:28:38Z conferido por máquina como posterior ao último apply da fase (0007); população de teste medida em PROD, só leitura, pela mesma query do apply (47 contas examinadas, 46 na população, trava do RH com 1 conta e 3 candidaturas, 9 vagas de teste, 2 colisões, 8 itens de possível dado real, a `3a9254c3` na população pela entrada i); operador decidiu o escopo item a item: 4 categorias / 38 entradas apagáveis (`populacao_md5` 1b4b21a9…), 8 vagas com `deleted_at`, nenhuma removida, órfãos e fixtures ficam, Storage por script local.**

## Performance

- **Duration:** Task 1 07:10Z–07:30Z (despacho anterior); resposta do operador ~10:45Z; Task 2 e fechamento 10:53Z–~11:05Z
- **Started:** 2026-10-13T07:10Z
- **Completed:** 2026-10-13T11:05Z (aprox.)
- **Tasks:** 2 (1 tracer + 1 checkpoint:decision blocking-human)
- **Files modified:** 5 criados (+ este SUMMARY)

## Accomplishments

Saídas, na ordem em que os portões rodam (todas reconferidas às 10:5xZ nesta sessão, idênticas às do despacho anterior):

```
BACKUP AUTO-TESTE OK: 29/29 (26 recusas pelo motivo certo, 3 passam)
BACKUP CONFERIDO (D-41): ultimo backup fisico COMPLETED 2026-10-13T06:28:38.387Z > ultimo apply da fase 2026-10-13T01:29:02.000Z (20261011000007); walg_enabled=true
UAT da 52 concluida e commitada
PORTAO AUTO-TESTE OK: 40/40 (contrato do POPULACAO.json, recusas de populacao, --decisao/--pos, comparar, lista da D-30 no SQL, obrigatorias)
ENSAIO VERDE: supabase/tests/p52_populacao_limpeza.sql · prefixadas=[] · aplicadas=[…01,…02,…03,…05,…06,…07] · ausentes=[20261011000004] · smokes=[52d=5/5] · evidencia=52d.pop=total:47,i:46,ii:5,pop:46,trava:1,fora:0,obrig:1/1
POPULACAO MEDIDA: examinados=47 entrada_i=46 entrada_ii=5 (i∩ii=5, i−ii=41, ii−i=0) trava=1 (candidaturas 3) vagas_teste=9 colisoes=2 possivel_real=8 obrigatorias[3a9254c3=i] apagaveis=null
escopo decidido: metodo=teardown_do_unico, storage=script_local, vagas=9, possivel_real=8, apagar_categorias=ficticios,tombstones,contas_teste_com_candidatura,contas_sem_candidatura
```

Nenhum token impresso; nenhuma escrita em PROD (toda leitura por `set transaction read only`; o ensaio aborta).

### Relatório do portão por categoria (ids por prefixo de 8; nenhum e-mail, nome ou CPF)

Partição de `candidatos` (soma = 47 = `examinados_total`):

| Categoria | n | ids8 | Decisão |
|---|---|---|---|
| `trava_rh_excluidos` | 1 | d8ef9db1 (3 candidaturas) | nunca apagável — intacta |
| `fixtures_p46` | 8 | 4601b000… (8) | teardown próprio no fecho do M8 |
| `ficticios` | 6 | f0000001..f0000006 | **apagar** |
| `tombstones` | 2 | 317ff71a, 37614985 | **apagar** (os dois) |
| `contas_teste_com_candidatura` | 14 | 03f3b61d, 0cc6c027, 1c1575d8, 5a2e3f17, 6453833c, 6dbf4012, 6fcdd6bf, 747fa40c, 896c6a43, 9567034e, aecf305c, eb718a32, fe253bdb, ff3916e5 | **apagar** |
| `contas_sem_candidatura` | 16 | 098ff94c, 3394956c, 3882d7cf, 52a56c77, 5ef4263d, 697ecd60, a381c35d, aa8d21d7, b362295d, c5904850, c8d6cc80, d4ce6d50, f523aafc, fa181f41, fce7e5bd, ff394568 | **apagar** |
| `fora_da_populacao` | 0 | — | nunca apagável |

Fora da partição (`auth.users` sem `candidatos` nem `usuarios_rh`): `auth_orfaos_padrao_teste` = 0;
`auth_orfaos_sem_padrao` = 3 (2a71d384, 95d4b83c, e41b0bd5; classes de domínio: 1 + 2 internos, sem «+») — **manter** (backlog do fecho do M8).

Entradas: (i) 46, (ii) 5, i∩ii = 5, i−ii = 41, ii−i = 0. Trava: 9 usuários de RH, 0 com `user_id` nulo, 1 com linha em `candidatos`, 3 candidaturas excluídas. Candidaturas: 44 no total, 32 na população (md5 `6d5fb61a…`).

**Obrigatória:** `3a9254c3` na população pela entrada `i` (conta 5a2e3f17, vaga ativa fdbe1a4a).

### Vagas de teste (9) e colisões (2)

| Vaga | slug | status | deleted_at | pop. | excl. (trava) | Destino |
|---|---|---|---|---|---|---|
| 53b73af6 | teste-coordenador-rh-sede | arquivada | — | 0 | **1** | `deleted_at` (colisão) |
| 53f75c81 | teste-asb-shopping-riomar | arquivada | — | 2 | **1** | `deleted_at` (colisão) |
| 629a5f31 | teste-e2e-social-media-junior-1-… | inativa | — | 1 (d31c78bb) | 0 | `deleted_at` |
| a32fe930 | teste-dentista-funil-e2e | arquivada | — | 3 | 0 | `deleted_at` |
| bc370a8b | teste-analista-marketing-digital-remoto | arquivada | — | 1 (tombstone a111296a) | 0 | `deleted_at` |
| cb413d5d | teste-auxiliar-administrativo-sede | arquivada | 2025-11-23 | 0 | 0 | `manter` (já tem) |
| e36e9929 | teste-asb-shopping-riomar-copia-… | inativa | — | 0 | 0 | `deleted_at` |
| f7655d91 | teste-atendente-shopping-recife | inativa | — | 0 | 0 | `deleted_at` |
| fb362e28 | teste-assistente-comercial-vendas | inativa | — | 0 | 0 | `deleted_at` |

Nenhuma vaga `remover`: remoção de colisão atravessaria a trava por CASCADE.

Vagas ativas (2), nenhuma de teste, todas as candidaturas na população: e897f709 (13/13) e fdbe1a4a (10/10) — operador: **manter as vagas, limpar só as candidaturas**. Vagas não ativas fora do padrão: as 3 fixtures (4601d000…) e 9f6ccf1a (arquivada) — **fora do bloco D**. Candidaturas em vagas ativas fora da população: 0.

### Fronteira das fixtures

3 vagas, 8 candidatos, 9 candidaturas; 8 na entrada (i); 0 em vaga de teste; 0 vagas que casam o padrão de teste; 0 candidaturas de outros em vaga fixture. `fixtures_md5` = `17c2491d454bb43640af53a336e169d0` (o 52-21 Task 3 confere que não muda).

### Possível dado real (8) — decisão do operador por item

| id8 | tipo | motivo | Decisão |
|---|---|---|---|
| 4dc31256 | candidatura (conta eb718a32, vaga de colisão 53f75c81) | candidatura até 2026-04-26 | apagar |
| eb718a32 | candidato | conta interna sem «+» (usada em teste) | apagar |
| d5491f18 | candidatura (conta aecf305c, vaga 9f6ccf1a) | candidatura até 2026-04-26 (semente) | apagar |
| f8318f39 | candidatura (conta 6fcdd6bf, vaga 9f6ccf1a) | candidatura até 2026-04-26 (semente) | apagar |
| fa181f41 | candidato | conta interna sem «+» (conta de UAT de formulário) | apagar |
| 2a71d384 | auth.users órfão | conta interna sem «+» | manter |
| 95d4b83c | auth.users órfão | conta interna sem «+» | manter |
| e41b0bd5 | auth.users órfão | conta interna sem «+» | manter |

### Tombstones

317ff71a: candidaturas a111296a (bc370a8b) e c912aa17 (a32fe930), ambas em vaga de teste. 37614985: candidatura dae837f4 em e897f709 (vaga real) — o operador a identificou como a conta descartável do 49-19 (fontes que ele citou: `49-18-SUMMARY.md:331`, `49-PROVA-PROD.md:772`). Os dois: apagar.

### Storage (`curriculos`, só contagem)

trava_rh 4 · ficticios 6 · população 18. Via decidida: `script_local` (remoção no 52-21 Task 3, sob o mesmo OK destrutivo).

### Prova de consumo da decisão (só leitura, saída fora do repositório)

`node scripts/p52_limpeza_portao.cjs medir <scratch>/52-19-populacao-com-decisao.json --decisao 52-19-DECISAO-ESCOPO.md` → saída 0, `apagaveis=ficticios+tombstones+contas_teste_com_candidatura+contas_sem_candidatura`:

| apagaveis[k] | entradas / categorias[k].n | user_id nulo |
|---|---|---|
| ficticios | 6 / 6 | 6 |
| tombstones | 2 / 2 | 2 |
| contas_teste_com_candidatura | 14 / 14 | 0 |
| contas_sem_candidatura | 16 / 16 | 0 |

38 entradas, 38 ids distintos, **`populacao_md5` = `1b4b21a93ff00a9d01f7d10926dd1f54`**. Órfãos em `apagaveis`: 0; d8ef9db1: ausente; eb718a32, fa181f41 e 5a2e3f17: presentes. Os md5 das 9 categorias, `examinados_total` e `fixtures_md5` iguais aos do JSON commitado — a população não mudou entre 07:29Z e 10:55Z. O `52-19-POPULACAO.json` commitado NÃO foi sobrescrito (segue `apagaveis: null`, como o plano especifica para esta task; o 52-21 re-mede com `--decisao`).

### Provas por mutação (despacho anterior)

8 mutações do auto-teste do backup mordem; 8 do auto-teste do portão mordem; as cláusulas (c) e (e) do smoke52d mordem no ensaio — com linha de base verde antes de cada mutação.

## Task Commits

1. **Task 1 (Passo 0): conferência do backup diário (D-41 emendada)** — `ede0482c` (feat)
2. **Task 1: varredura da população (só leitura) e portão da limpeza** — `d8dcad7f` (feat)
3. **Task 1: JSON sem os padrões literais** — `46ebc0a7` (fix)
4. **Task 1: população medida** — `b9644545` (docs)
5. **Task 2: decisão do operador sobre o escopo** — `02013827` (docs)

**Plan metadata:** commit deste SUMMARY (docs) e o de tracking (STATE/ROADMAP) a seguir.

## Files Created/Modified

- `scripts/p52_backup.cjs` — conferência da D-41 emendada; `julgar` puro, GET único de `database/backups`, `--apply --decisao` para o 52-21
- `scripts/p52_limpeza_portao.cjs` — portão da limpeza: `SQL_VARREDURA`, `medir`, `comparar`, `--auto-teste`
- `supabase/tests/p52_populacao_limpeza.sql` — smoke52d (a)–(e), só leitura, recusa fora do ensaio
- `.planning/phases/52-hub-do-rh-dados-e-contato/52-19-POPULACAO.json` — população medida (ids, categorias, contagens, md5)
- `.planning/phases/52-hub-do-rh-dados-e-contato/52-19-DECISAO-ESCOPO.md` — escopo decidido pelo operador

## Decisions Made

Ver `key-decisions` e `52-19-DECISAO-ESCOPO.md` (resposta verbatim e a nota do orquestrador sobre a palavra truncada). Do executor, só uma: a linha `padroes:` aponta para a lista do script (blob `5c062270`, `padroes_md5` `fa46cb9e…`, 4 + 9 entradas) em vez de copiar os padrões, porque vários têm forma de endereço de e-mail e a regra do despacho proíbe escrevê-los fora do bloco verbatim. O `<verify>` só exige a linha não vazia; o 52-20 copia os padrões do script (fonte única), o que também evita duas listas divergirem.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `medir` recusou o primeiro JSON por carregar os padrões literais**
- **Found during:** Task 1
- **Issue:** o JSON levava os padrões (com forma de e-mail) e o próprio contrato/verify recusa e-mail no JSON.
- **Fix:** o JSON leva só `padroes_md5` e `padroes_n`; os padrões moram no script.
- **Files modified:** `scripts/p52_limpeza_portao.cjs`
- **Verification:** Task 1 `<verify>` #2 verde
- **Commit:** `46ebc0a7`

**2. [Rule 1 - Bug] Cláusula (c) do smoke: `NOT IN` precisava de `user_id IS NULL OR …` do lado esquerdo**
- **Found during:** Task 1
- **Issue:** sem isso, 8 candidatos legítimos com `user_id` nulo caíam fora da forma `NOT IN` (46 vs 38), e a cláusula acusaria divergência falsa. O nulo do lado do RH continua pego.
- **Files modified:** `supabase/tests/p52_populacao_limpeza.sql`
- **Commit:** `d8dcad7f`

**3. [Rule 2 - Correção] Fixtures fora de «possível dado real»**
- **Found during:** Task 1
- **Issue:** o `created_at` das fixtures é 2024-02-22 de propósito (data-âncora da purga) e as jogaria no critério «até 2026-04-26».
- **Fix:** fixtures excluídas do critério; fronteira mostrada em `fixtures_p46` com `fixtures_md5`.
- **Commit:** `d8dcad7f`

**4. [Rule 2 - Correção] Regras de «possível dado real» mais largas que o plano**
- **Found during:** Task 1
- **Issue:** o plano citava só o domínio `.com.br`; o domínio interno sem `.br` também é sinal de dado real. Padrões casados sobre o e-mail em minúsculas.
- **Commit:** `d8dcad7f`

**5. [Rule 2 - Correção] Recorte do `--decisao` só retira**
- **Found during:** Task 1
- **Issue:** sem limite, um `manter_ids:`/`possivel_real_<id8>:` poderia acrescentar alvo.
- **Fix:** as duas formas só REMOVEM entradas de `apagaveis`; `trava_rh_excluidos` e `fora_da_populacao` são recusadas como categoria apagável. A rever no 52-20/52-21.
- **Commit:** `d8dcad7f`

### Desvio de registro (Task 2)

**6. Linha `padroes:` por referência ao script, não pela cópia literal** — ver «Decisions Made». Sem efeito em máquina: nenhum leitor faz parse dos padrões nessa linha.

**7. Reexecução do `<verify>` #2 da Task 1 com a saída do `medir` em cópia fora do repositório** — o comando literal sobrescreveria o `52-19-POPULACAO.json` commitado (novo `medido_em`). A conferência do contrato rodou sobre a cópia e sobre o arquivo commitado, as duas verdes, iguais salvo `medido_em`.

**Total deviations:** 5 auto-fixed (2 Rule 1, 3 Rule 2) + 2 de registro. **Impact on plan:** nenhum aumento de escopo; tudo na direção de recusar mais, não menos.

## Issues Encountered

Para o 52-20 / 52-27 (nada consertado aqui — fora do escopo deste plano):

1. **Tombstones com `user_id` nulo em `apagaveis`.** O contrato do plano diz «`user_id` nulo só nos fictícios», mas os 2 tombstones também saem com `user_id` nulo (anonimizados), e o `conferirContrato` não recusa. Não quebra nada — o fecho do 52-27 só sobe por `user_id` não nulo —, mas o texto do contrato e o código divergem; o 52-20 deve tratar tombstone como raiz sem `auth.users`.
2. **Candidaturas da população em vaga fora do bloco D.** d5491f18 e f8318f39 (contas aecf305c, 6fcdd6bf, ambas em `contas_teste_com_candidatura`) estão na vaga 9f6ccf1a, que o operador deixou fora do bloco D. Elas saem pela conta; a vaga fica, com 1 candidatura restante (387e91c0, da conta da trava d8ef9db1). A migration não deve tocar a linha da vaga 9f6ccf1a.
3. **Vagas ativas ficam vazias.** As 23 candidaturas de fdbe1a4a e e897f709 estão todas na população; depois do 52-21 as duas vagas ativas ficam sem candidatura, por decisão do operador (reaproveitar).
4. **A colisão 53f75c81** tem 2 candidaturas da população (inclusive 4dc31256) e 1 da trava: só `deleted_at` na vaga; a da trava fica.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Pronto para o 52-20 e o 52-27 (onda 17)**, ambos autônomos e sem apply: o 52-20 escreve a migration `20261011000004` exatamente para `52-19-DECISAO-ESCOPO.md` (38 entradas em 4 categorias, `populacao_md5` esperado `1b4b21a9…` enquanto a população não mudar; 8 vagas `deleted_at`, nenhuma `remover`); o 52-27 constrói o export prévio a partir de `apagaveis` e dos destinos de vaga.
- **52-21 segura o portão destrutivo** (medição fresca, export fora do git, backup posterior ao export, OK do operador sobre os números, remoção do Storage por `script_local`).
- **Backlog do fecho do M8** (52-22): os 3 `auth.users` órfãos (2a71d384, 95d4b83c, e41b0bd5); `deleted_at` na vaga 9f6ccf1a; teardown próprio das fixtures `fixture-p46-*`.
- JORN-63 NÃO marcado completo no REQUIREMENTS.md: 52-20, 52-21, 52-22 e 52-27 também o declaram.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-13*

## Self-Check: PASSED

- Arquivos criados presentes e rastreados: `scripts/p52_backup.cjs`, `scripts/p52_limpeza_portao.cjs`, `supabase/tests/p52_populacao_limpeza.sql`, `52-19-POPULACAO.json`, `52-19-DECISAO-ESCOPO.md`.
- Commits ancestrais de HEAD: `ede0482c`, `d8dcad7f`, `46ebc0a7`, `b9644545`, `02013827` (`git rev-list --count 97c39889..02013827` = 5).
- Critérios de aceitação das Tasks 1 e 2 reexecutados nesta sessão: verdes.
