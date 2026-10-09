---
phase: 51-consertos-da-jornada-bloco-3
plan: 09
subsystem: infra
tags: [jorn-42, portao, d-12, review-bloqueante, git, auto-teste, mutacoes, onda-b, tracer]
status: complete

requires:
  - phase: 50-acesso-do-recrutador
    provides: "cadeias de shell de apply/deploy/push do 50-02/50-10 (WR-02, WR-03, WR-06) e a leitura de frontmatter de scripts/p50_enumera.cjs — a semantica reproduzida"
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-07 concluido; ref refs/gsd/51-06/base (a base da Onda B que a revisao tem de cobrir)"
provides:
  - "scripts/p51_portao.cjs: --revisao/--base/--pin/--plano/--modo revisao|apply|deploy|push, PORTAO OK (0) / PORTAO RECUSADO: <motivo> (1), fail-closed"
  - "--auto-teste: 58 casos num repositorio temporario (OK de cada modo + cada recusa com motivo proprio), apaga o diretorio inclusive em falha"
  - "ref local refs/gsd/51-09/base = 28644f3c"
affects: [51-16]

actuals:
  tokens: 9458         # chars/4 sobre o diff realizado 28644f3c..cb1ff727 (1 arquivo novo, 37833 octetos)
  tasks: 2
  commits: 2           # MEDIDO: git rev-list --count 28644f3c..HEAD antes do commit deste SUMMARY
plan_head_before: 28644f3c5cf081e8adad2d04e3dbff51df4c6418
plan_head_after: cb1ff727dfd6c4897a45461ea58347e59bb749b6

tech-stack:
  added: []
  patterns:
    - "Portao como programa com auto-teste: cada recusa e um caso que monta o estado num repositorio git temporario e compara {ok, motivo}; nao mais linha de shell copiada de plano em plano"
    - "Git so de leitura com --no-optional-locks (nem o status reescreve o indice); toda verificacao booleana do git e fail-closed (so saida 0 e verdadeiro; 1 e 128 recusam)"
    - "Todo comando git roda na RAIZ do repositorio: o pathspec '.' de 'diff -- . :!.planning' e relativo ao cwd, e rodado de um subdiretorio cobriria so ele"
    - "Auto-teste isolado: GIT_* removidas, GIT_CONFIG_GLOBAL=/dev/null, GIT_CONFIG_NOSYSTEM=1, e trava que confere que cada repositorio de caso e a raiz de si mesmo antes de usa-lo"

key-files:
  created:
    - scripts/p51_portao.cjs
  modified: []

key-decisions:
  - "A revisao e conferida ANTES do pin: sem revisao, todo modo recusa por ela (SEM REVISAO), com ou sem --pin — e o que o verify do apply no repositorio real exige"
  - "Acrescimos fail-closed a semantica da Phase 50 (Rule 2), cada um com caso proprio no auto-teste: --plano tem de existir no reviewed_head (caminho errado nao passa calado); --plano modificado na arvore recusa; findings.critical, reviewed_head e diff_base repetidos recusam; revisoes de N menor tambem tem de estar commitadas uma unica vez (o laco do verify da Task 1 do 50-10); --pin no modo revisao recusa (o modo nao confere pin)"
  - "Caminhos vigiados da arvore limpa = supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts, como o plano manda; os 5 arquivos sujos de outras sessoes (docs/specs, docs/vagas, AGENTS.md, .planning/...) ficam fora — o portao nao recusa por eles, e o auto-teste prova (caso 3)"

patterns-established:
  - "Mutacao do proprio portao como prova de que ele morde: copia num diretorio de rascunho com uma checagem desligada; o auto-teste tem de ficar vermelho no caso construido para ela (X1..X14, Y1..Y8 — 22/22 mordem)"

requirements-completed: []   # JORN-42 e compartilhado: requirements.ready-ids = 0/1 (outros planos da fase ainda o declaram)

coverage:
  - id: D1
    description: "Modo revisao: so diz OK com a revisao de maior N commitada uma vez e = HEAD, critical: 0, reviewed_head/diff_base que resolvem, diff_base <= --base, nenhum codigo depois do reviewed_head, plano inalterado e arvore limpa; cada recusa com motivo proprio"
    requirement: JORN-42
    verification:
      - kind: unit
        ref: "node scripts/p51_portao.cjs --auto-teste → auto-teste ok: 58 casos (casos 1..36 + cli 55, 56)"
        status: pass
      - kind: other
        ref: "mutacoes X1..X14 (copia com a checagem desligada) → 14/14 MORDE"
        status: pass
    human_judgment: false
  - id: D2
    description: "Modos apply/deploy/push: --pin obrigatorio; apply HEAD = pin; deploy/push aceitam so commits de .planning/ depois do pin; codigo do pin = codigo revisado; (6) e (7) em todos os modos"
    requirement: JORN-42
    verification:
      - kind: unit
        ref: "node scripts/p51_portao.cjs --auto-teste → casos 37..54 + cli 57"
        status: pass
      - kind: other
        ref: "mutacoes Y1..Y8 → 8/8 MORDE"
        status: pass
    human_judgment: false
  - id: D3
    description: "No repositorio real, hoje, os modos revisao e apply RECUSAM (nao existe 51-REVIEW-PORTAO-N.md)"
    requirement: JORN-42
    verification:
      - kind: other
        ref: "node scripts/p51_portao.cjs --revisao …/51-REVIEW-PORTAO --base refs/gsd/51-06/base [--pin refs/gsd/51-09/base] --plano …/51-16-PLAN.md --modo revisao|apply → saida 1, PORTAO RECUSADO: SEM REVISAO"
        status: pass
    human_judgment: false
  - id: D4
    description: "Com uma revisao commitada, o portao deixa passar a historia real nos quatro modos, no formato exato dos comandos do 51-16"
    verification:
      - kind: other
        ref: "clone --shared do repositorio real no rascunho + revisao sintetica commitada → PORTAO OK em revisao/apply/deploy/push; efdeploy.cjs sujo → PORTAO RECUSADO: ARVORE SUJA (clone apagado)"
        status: pass
    human_judgment: false

duration: 16min
completed: 2026-10-09
---

# Phase 51 Plan 09: O portão do JORN-42 como programa testado — Summary

**`scripts/p51_portao.cjs`: a cadeia «revisão commitada sem crítico + pin + código do pin = código revisado + plano inalterado + árvore limpa» que o 51-16 põe no mesmo comando de cada apply, deploy e push, com `--auto-teste` de 58 casos num repositório temporário. 22 mutações do próprio portão mordem, e hoje, no repositório real, ele recusa por falta de revisão.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-10-09T05:19:41Z
- **Completed:** 2026-10-09T05:35:23Z
- **Tasks:** 2 / 2
- **Files modified:** 1 (criado)

## Accomplishments

- O modo `revisao` faz as checagens (1)(2)(3)(4-revisao)(6)(7), cada uma com o seu `PORTAO RECUSADO: <motivo>` e saída 1. Ao final imprime `PORTAO OK: revisao=<arquivo> reviewed_head=<sha> pin=- modo=revisao`, com saída 0.
- Modos `apply`, `deploy` e `push`, checagens (4) e (5):
  - o `--pin` é obrigatório e tem de resolver;
  - `apply` exige HEAD = pin;
  - `deploy` e `push` aceitam depois do pin apenas commits de `.planning/`;
  - nos três, o código do pin tem de ser igual ao código revisado.
- `--auto-teste`: **58 casos**. Ficam no `os.tmpdir()`, e o diretório é apagado inclusive em falha (conferido: nenhum `p51-portao-*` sobra). Composição:
  - 54 casos de função: OK de cada modo e cada recusa;
  - 4 casos de processo: saída 0 e 1, a linha exata e a opção desconhecida.
- Prova de que o portão morde: cada checagem foi desligada numa cópia no rascunho, e o auto-teste ficou vermelho no caso construído para ela — **22/22**.
- No repositório real, hoje, os modos `revisao` e `apply` saem 1 com `PORTAO RECUSADO: SEM REVISAO: nenhum 51-REVIEW-PORTAO-<N>.md em .planning/phases/51-consertos-da-jornada-bloco-3`.

## TDD — RED / GREEN

**Task 1 (tracer)**
- **RED:** esqueleto com o auto-teste e os casos; `verificar()` só fazia `recusar('CHECAGENS AINDA NAO IMPLEMENTADAS')`. Resultado: `auto-teste FALHOU: 39/40 casos`, saída 1.
  - *Avaliação semântica:* todo caso montou o estado sem `MONTAGEM FALHOU`. Cada falha foi pelo motivo-stub, não por erro de montagem. O único caso verde foi `cli: opcao desconhecida`, que pertence ao parser de argumentos e não a uma checagem.
  - O formato da saída é próprio do programa (não TAP/JUnit), por isso a evidência fica aqui e não no classificador `tdd-red-evidence`. O plano é `type: execute` e manda um commit por task.
- **GREEN:** `auto-teste ok: 40 casos`.

**Task 2**
- **RED:** os casos dos modos apply/deploy/push entraram no lugar do caso «não implementado». Resultado: `auto-teste FALHOU: 18/58 casos`, todos com `modo <m> ainda nao implementado`.
  - O caso 51 («apply sem revisão recusa pela revisão antes do pin») já estava verde, como devia: a recusa pela revisão precede o ramo de modo.
- **GREEN:** `auto-teste ok: 58 casos`.

**REFACTOR:** nenhum.

**Mutações** (cópias em `$SCRATCHPAD/mut/`; nenhuma tocou o repositório):

| Id | Checagem desligada | Mordeu em |
|---|---|---|
| X1 | revisão reescrita aceita | 11 |
| X2 | maior N não commitada aceita | 7, 8 |
| X3 | revisão ≠ HEAD aceita | 9, 10 |
| X4 | `critical` qualquer aceito | 13 |
| X5 | `diff_base` não conferido | 22 |
| X6 | código depois da revisão aceito | 24, 25 |
| X7 | plano mudado aceito | 28, 52, 53 |
| X8 | plano sujo aceito | 29 |
| X9 | `scripts` fora da vigilância | 32 |
| X10 | git no cwd e não na raiz | 25, 26 |
| X11 | revisão anterior não conferida | 12 |
| X12 | `reviewed_head` fora de HEAD aceito | 27 |
| X13 | plano ausente no `reviewed_head` aceito | 30 |
| X14 | `critical` repetido aceito | 15 |
| Y1 | apply sem HEAD = pin | 38 |
| Y2 | código depois do pin aceito | 42, 43 |
| Y3 | pin fora do histórico aceito | 49 |
| Y4 | código do pin ≠ revisado aceito | 39, 44 |
| Y5 | `reviewed_head` fora do pin aceito | 50 |
| Y6 | pin opcional | 45, 46, 47 |
| Y7 | deploy/push com a regra do apply | 40, 41, 42 |
| Y8 | diff sem excluir `.planning` | 1, 2, 3, … |

## Verify do plano (rodados no estado commitado)

```
portao (revisao) testado
portao recusa sem revisao (como deve, antes do 51-16)
portao (todos os modos) testado
portao (apply) recusa sem revisao
```

Prova positiva extra na história real, sem tocar o repositório:
1. `git clone --shared` no rascunho.
2. `refs/gsd/51-06/base` trazida para o clone.
3. Portão atual commitado e revisão sintética `51-REVIEW-PORTAO-1.md` commitada.
4. `refs/gsd/51-16/sha` = HEAD.

Resultado: `PORTAO OK` nos quatro modos, nos comandos exatos do 51-16, com `--plano` = o `51-16-PLAN.md` real. Com `efdeploy.cjs` sujo veio `PORTAO RECUSADO: ARVORE SUJA: M efdeploy.cjs`. O clone foi apagado depois.

## Task Commits

1. **Task 1 (tracer): modo `revisao` + auto-teste** — `1d02c19f` (test)
2. **Task 2: modos `apply`, `deploy`, `push`** — `cb1ff727` (test)

Os dois commits foram limitados por caminho (`git commit -- scripts/p51_portao.cjs`). `git show --stat` de cada um lista só `scripts/p51_portao.cjs`, e nenhum apaga arquivo.

## Files Created/Modified

- `scripts/p51_portao.cjs` (941 linhas): o portão, o auto-teste e o cabeçalho. O cabeçalho registra:
  - a origem de cada regra (WR-02, WR-03 e WR-06 da Phase 50);
  - por que virou programa;
  - o que o programa nunca faz;
  - a tabela modo × checagem.

## Decisions Made

As decisões estão em `key-decisions` no frontmatter. A principal é a ordem: a revisão é conferida antes do pin.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fechamentos fail-closed além da letra do plano**
- **Found during:** Task 1
- **Issue:** a letra das checagens deixava quatro portas abertas:
  - um `--plano` com caminho errado passaria a (6) calado (`git diff` de caminho inexistente é vazio);
  - o plano modificado na árvore não era visto (a (7) não cobre `.planning/`);
  - campos repetidos no frontmatter eram ambíguos;
  - uma revisão de N menor podia ser reescrita sem que nada recusasse.
- **Fix:** cinco acréscimos, cada um com o seu caso no auto-teste e a sua mutação:
  - `PLANO AUSENTE NO reviewed_head`;
  - `PLANO MODIFICADO NA ARVORE`;
  - `findings.critical` / `reviewed_head` / `diff_base` têm de ser únicos;
  - `REVISAO ANTERIOR REESCRITA OU NAO COMMITADA`, o laço do verify da Task 1 do 50-10;
  - `PIN NO MODO revisao`.
- **Files modified:** scripts/p51_portao.cjs
- **Verification:** casos 12, 14, 15, 29, 30 e 35; mutações X8, X11, X13 e X14 mordem. A história real com revisão sintética continua `PORTAO OK`, ou seja, os acréscimos não recusam o caso legítimo do 51-16.
- **Committed in:** 1d02c19f

**2. [Rule 3 - Blocking] Pathspec na raiz do repositório**
- **Found during:** Task 1
- **Issue:** `git diff -- . ':!.planning'`, rodado de um subdiretório, cobriria só esse subdiretório: código mudado em `supabase/` passaria.
- **Fix:** todo git roda na raiz (`rev-parse --show-toplevel`), e os caminhos de `--revisao` e `--plano` são resolvidos a partir do cwd do chamador.
- **Files modified:** scripts/p51_portao.cjs
- **Verification:** casos 25 e 26; mutação X10 morde.
- **Committed in:** 1d02c19f

---

**Total deviations:** 2 auto-fixed (1 Rule 2, 1 Rule 3)
**Impact on plan:** só endurecem o portão. Cada uma tem caso e mutação. Nenhuma recusa a história real com revisão.

## Issues Encountered

- O primeiro lote de mutações Y abortou no Y2. A causa era um defeito do **meu harness de rascunho**, não do portão: o `/` no nome da mutação virava subdiretório inexistente. Corrigido o nome do arquivo, Y1..Y8 rodaram e as 8 mordem. As X1..X14 rodaram duas vezes (antes e depois da Task 2), 14/14 nas duas.

## Escritas em PROD / publicação

Nenhuma. Nada foi aplicado, publicado nem empurrado neste plano. O portão só lê git, e o `--auto-teste` escreve só no próprio diretório temporário.
- Os 5 arquivos sujos de outras sessões não foram tocados nem staged.
- `git status --porcelain` nos caminhos vigiados do repositório real está vazio após os commits.

## User Setup Required

None.

## Next Phase Readiness

- O 51-16 já pode amarrar a `scripts/p51_portao.cjs`:
  - o verify do checkpoint (`--modo revisao`);
  - cada `p46apply migrate` (`--modo apply`);
  - cada `efdeploy` (`--modo deploy`);
  - o push (`--modo push`, junto com `p50_enumera`).
- Hoje o portão recusa, como deve: não existe `51-REVIEW-PORTAO-N.md`. O review bloqueante do 51-16 é o que o abre.
- JORN-42 segue aberto (ID compartilhada; `ready-ids` 0/1).

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-09*

## Self-Check: PASSED

- FOUND: `scripts/p51_portao.cjs`, `51-09-SUMMARY.md`
- FOUND (ancestrais de HEAD): `1d02c19f`, `cb1ff727`, `54b0117b`
- `check evaluation-scope --plan 51-09 --commits-only`: `status: resolved`, 3 commits deste branch
