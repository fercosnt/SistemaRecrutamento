---
phase: 52-hub-do-rh-dados-e-contato
plan: 30
subsystem: infra
tags: [publicacao, push-por-sha, review-adversarial, vercel, wcag, contraste, gap-closure, uat]

requires:
  - phase: 52-28
    provides: "consertos do G-52-6 (caixa painel-rejeicao, selos opacos, «Cancelada») e o medidor scripts/p52_contraste.cjs"
  - phase: 52-29
    provides: "consertos do G-52-4, G-52-4b e G-52-2 (painel concluído sem prazo, «Próximo passo» em texto, seleção do Raven); caso do código cru no ContextoRejeicaoTriagemRevisao.test"
  - phase: 52-26
    provides: "o pin refs/gsd/52-26/sha (87cfe0ea), base do review e da enumeração — o último código publicado"
provides:
  - "os consertos dos gaps G-52-2, G-52-4, G-52-4b e G-52-6 no ar em https://rh.beautysmile.com.br (chunk index-EkWKvKBY.js), publicados por push por sha 70528fba com o pin refs/gsd/52-30/sha"
  - "os cinco chips, o descritor de reserva e as duas notas do cartão de entrevista opacos e legíveis (a0f24b76, decisão «consertar agora»); os sete cenários agendamento-* do medidor em alvo 4,5:1"
  - "52-REVIEW-UAT-1.md (critical 0 / warning 1 / info 7) e 52-REVIEW-UAT-2.md (critical 0 / warning 0 / info 5, approved) — o prefixo de review desta publicação"
  - "52-30-DECISAO.md: publicar, janela única confirmada três vezes, disposição do WR-01 e dos cinco INFO, os dois residuais com dono"
  - "conferência visual do operador aprovada nos itens 1, 2, 3 e 5; item 4 NÃO OBSERVADO; um gap novo (vaga inativa no painel do candidato) para o /gsd-verify-work 52 registrar"
affects: [52-19, verify-work-52, fecho-da-fase-52]

actuals:
  tokens: 23986
  tasks: 3
  commits: 3
plan_head_before: b08e7b3bf4cf666dc116faaa50be515df7779980
plan_head_after: 70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8

tech-stack:
  added: []
  patterns:
    - "Publicação da fase: review adversarial de prefixo próprio → p52_portao --modo revisao → decisão escrita com janela única → p52_portao --modo push + p50_enumera por FORMA + git push <sha>:refs/heads/main num comando só"
    - "Rodada de conserto depois do review = review NOVO -N+1 antes de qualquer push (o portão recusa código depois do reviewed_head — provado: CODIGO DEPOIS DA REVISAO sobre a rodada 1)"
    - "Deploy da Vercel ausente depois do push: vigiar o verify de PROD; se disparar à mão, SEMPRE com fonte git no sha exato do pin, nunca do disco local, e só com ordem escrita do operador"

key-files:
  created:
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-UAT-1.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-UAT-2.md
    - .planning/phases/52-hub-do-rh-dados-e-contato/52-30-DECISAO.md
  modified:
    - src/features/agendamento/components/AgendamentoCandidatoCard.tsx
    - src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx
    - scripts/p52_contraste.cjs

key-decisions:
  - "Publicar sobre o 52-REVIEW-UAT-2.md (warnings 0); conteúdo autorizado pelas três decisões do UAT (52-UAT.md), mais a rodada «consertar agora» dos chips e notas decidida por escrito pelo operador"
  - "WR-01 (teste do Raven sem compor alfa) → backlog; residual_chips_agendamento → consertado em a0f24b76; residual_contraste_cartao → backlog com a nota da amostra; IN-04 → backlog; IN-01/02/03/05 → aceitar"
  - "Vercel sem deploy automático por 86 min (incidente upstream): o operador mandou, por escrito, disparar o deploy por API com fonte git no sha 70528fba de main — nunca do disco — e vigiar; Ready em 81 s"
  - "Defeito novo visto na conferência (vaga inativa → «Vaga não encontrada» no painel do candidato) é gap para diagnóstico no /gsd-verify-work 52, não conserto desta task"

patterns-established:
  - "O SUMMARY do plano que publica registra a enumeração INTEIRA (shas de código por plano) e as duas verificações de PROD verbatim, para que o próximo push tenha a base medida"

requirements-completed: [JORN-59, JORN-60, JORN-62]

coverage:
  - id: D1
    description: "Portão de review: 52-REVIEW-UAT-2.md (maior N) com critical 0 e diff_base = refs/gsd/52-26/sha; 52-30-DECISAO.md no contrato (publicar, janela única, residuais, WR, data, resposta verbatim)"
    requirement: JORN-59
    verification:
      - kind: other
        ref: "node scripts/p52_portao.cjs --revisao …/52-REVIEW-UAT --base refs/gsd/52-26/sha --plano …/52-30-PLAN.md --modo revisao (PORTAO OK … reviewed_head=a0f24b76… modo=revisao)"
        status: pass
      - kind: other
        ref: "node -e (verify 2 da Task 1: decisao de publicacao: publicar sobre 52-REVIEW-UAT-2.md (warnings=0))"
        status: pass
    human_judgment: false
  - id: D2
    description: "Chips, descritor de reserva e notas do cartão de entrevista opacos (text-*-100 sobre bg-*-800, cinza -700; notas com superfície), 6,38–9,37:1, guarda por forma com quatro mordidas"
    requirement: JORN-62
    verification:
      - kind: unit
        ref: "src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx (17 casos; fonte real + (a) cancelada + (d) reagendada)"
        status: pass
      - kind: other
        ref: "node scripts/p52_contraste.cjs (7 × ALVO agendamento-… OK; CONTRASTE OK: 8 cenario(s) no alvo; --auto-teste 24/24)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Push por sha pelo portão (PORTAO OK modo=push, enumeração 0 ALHEIO, pin refs/gsd/52-30/sha em origin/main) e os três marcadores no chunk index de PROD"
    requirement: JORN-59
    verification:
      - kind: other
        ref: "verify 1 da Task 2 (origin/main = HEAD; pin 52-30 no remoto; nada local) — verde em 16:35:47Z e de novo antes deste SUMMARY; reabre com o commit deste arquivo, declarado"
        status: pass
      - kind: other
        ref: "verify 2 da Task 2 (PRESENTE em PROD (chunk index): os três marcadores em /assets/index-EkWKvKBY.js)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Os quatro estados consertados vistos pelo operador no ar, sem cache, desktop e 360px (Raven 6 e 8 alternativas; painel concluído; painel rejeitado; controle da linha de prazo)"
    requirement: JORN-60
    verification: []
    human_judgment: true
    rationale: "Defeitos visuais: teste verde não prova a tela. Resposta do operador verbatim abaixo — aprovado nos itens 1, 2, 3 e 5; item 4 NÃO OBSERVADO (sem candidatura de teste no estado que mostra o cartão com chip), coberto pelos sete cenários do medidor"

duration: 10h 03m
completed: 2026-10-12
status: complete
---

# Phase 52 Plan 30: Publicação dos consertos do UAT da 52 — push por sha, deploy git-source após incidente da Vercel, conferência visual aprovada — Summary

**Os consertos dos quatro gaps do UAT (G-52-2 seleção do Raven, G-52-4 prazo no painel concluído, G-52-4b «Próximo passo» em texto, G-52-6 cartão rejeitado e selos) mais a rodada «consertar agora» dos chips e notas do cartão de entrevista (`a0f24b76`) estão no ar em `https://rh.beautysmile.com.br`, publicados por `git push origin 70528fba:refs/heads/main` pelo portão da fase (review -2 com critical 0 / warning 0; enumeração de 36 commits, 14 de código, 0 ALHEIO). A Vercel não construiu o push por 86 minutos (incidente upstream); por ordem escrita do operador, o deploy foi criado por API com fonte git no mesmo sha, e os três marcadores apareceram no chunk `index-EkWKvKBY.js` de PROD — o mesmo hash do build local. O operador conferiu os quatro estados no ar, desktop e 360px, e aprovou; viu um defeito novo fora dos gaps (vaga inativa → «Vaga não encontrada» no painel do candidato), registrado aqui para o `/gsd-verify-work 52`.**

## Performance

- **Duration:** 10h 03m de relógio de parede (07:06:48Z, abertura do review 1 → 17:09Z, aprovação da Task 3). Inclui as duas paradas do operador na Task 1, a rodada de conserto com review novo, 86 min de espera pela Vercel e a conferência visual humana.
- **Started:** 2026-10-12T07:06:48Z (`reviewed:` do 52-REVIEW-UAT-1.md)
- **Completed:** 2026-10-12T17:09Z (resposta do operador à Task 3); este SUMMARY às 17:18Z
- **Tasks:** 3 (checkpoint:decision em duas rodadas · auto · checkpoint:human-verify)
- **Files modified:** 3 de código/teste/medidor (um commit) + 3 arquivos de planejamento criados (dois reviews e a decisão)

## Accomplishments

- **Task 1 — review e decisão.** Review adversarial bloqueante nº 1 (`52-REVIEW-UAT-1.md`, `reviewed_head` 8010006e, `diff_base` 87cfe0ea = `refs/gsd/52-26/sha`): critical 0, warning 1, info 7. Operador: janela única confirmada, WR-01 backlog, chips e notas «consertar agora», cartão backlog. Conserto `a0f24b76` → review nº 2 (`52-REVIEW-UAT-2.md`, `reviewed_head` a0f24b76): critical 0, warning 0, info 5, approved. Operador: publicar, IN-04 backlog, demais INFO aceitar. `52-30-DECISAO.md` commitado em `70528fba`; os dois `<verify>` da Task 1 verdes.
- **Rodada de conserto `a0f24b76`** (3 arquivos, só nos caminhos da forma do `--caminhos`): os cinco chips do `STATUS_CONFIG` e o descritor de reserva passam ao par opaco dos selos do painel (texto `-100` sobre `-800` da família, cinza `-700`); as notas de reagendada e de cancelada ganham superfície `rounded-lg bg-*-800 px-3 py-2`; cópia intacta. O teste do cartão lê os descritores pela FORMA (10 → 17 casos, quatro mordidas pelo mesmo juiz); os sete cenários `agendamento-*` do medidor passam de `informativo` a `alvo` 4,5:1 no MESMO commit, ancorados nas classes novas.
- **Task 2 — push por sha.** Pin `refs/gsd/52-30/sha` = 70528fba. Passo 0b: `CONTRASTE OK` e os três marcadores no `index-EkWKvKBY.js` do build local. Comando de push do plano byte a byte: `PORTAO OK … modo=push ledger=[20261011000001,20261011000002,20261011000003,20261011000005]`, R = 29f34756 (= a fotografia do planejamento), S = 70528fba, enumeração 36 commits (22 planning, 14 codigo, 0 ALHEIO), push às 15:07:40Z. Verify 1 verde. Verify 2 AUSENTE por 47 rodadas (incidente da Vercel) → deploy disparado por API no sha 70528fba de `main` por ordem do operador → `PRESENTE em PROD (chunk index)` às 16:35:47Z.
- **Task 3 — conferência visual.** Aprovado nos itens 1 (Raven, 6 e 8 alternativas, desktop e 360px), 2 (painel concluído, dois cartões), 3 (painel rejeitado, topo e rolado) e 5 (controle: linha de prazo continua com avaliação pendente; selos «Aguardando Resposta» e «Em Análise» legíveis). Item 4 NÃO OBSERVADO. Um defeito novo fora dos gaps, abaixo.

## Task Commits

Ledger do plano (`.git/gsd-plan-head-before-52-30`) = `b08e7b3b`. `git rev-list --count b08e7b3b..70528fba` = **3**:

1. **Task 1, rodada de conserto («consertar agora»):** `a0f24b76` fix(52-30): chips e notas do cartao de entrevista opacos e legiveis — o mesmo par dos selos (G-52-6); medidor com os sete cenarios em alvo
2. **Task 1, review nº 2:** `482ec9aa` docs(52-30): review adversarial da rodada de conserto dos chips e notas — 52-REVIEW-UAT-2 (critical 0, warning 0, info 5)
3. **Task 1, decisão:** `70528fba` docs(52-30): decisao de publicacao dos consertos do UAT — publicar sobre 52-REVIEW-UAT-2 (warnings 0; chips consertados; cartao e IN-04 em backlog)

**Contexto, antes do ledger:** `b08e7b3b` docs(52-30): review adversarial dos consertos do UAT — 52-REVIEW-UAT-1 (critical 0, warning 1, info 7) — o review nº 1, commitado pelo orquestrador antes de o ledger ser gravado; é o commit base do ledger, não um dos três medidos.

**Task 2:** nenhum commit (o push e o ref `refs/gsd/52-30/sha` não mudam arquivo do repositório). **Task 3:** nenhum commit.

**Plan metadata:** o commit deste SUMMARY (`docs(52-30): SUMMARY — …`), feito DEPOIS do push: reabre `origin/main..HEAD` só com `.planning/`, como o `<success_criteria>` do plano declara. Sobe no próximo push com plano.

## Task 1 — as duas rodadas e as disposições do operador (verbatim)

### Rodada 1 — sobre o `52-REVIEW-UAT-1.md` (critical 0 · warning 1 · info 7)

Verify 1 do plano antes da parada: o portão no modo revisão aceitou o review nº 1. Levado ao operador: a janela única, o WR-01 com a proposta do revisor, e os dois residuais com o número de cada item (chips: Agendada 1,33 · Em andamento 1,14 · Concluída 1,46 · Reagendada 1,44 · Não compareceu 1,46 · nota reagendada 1,45 · nota cancelada 1,18; cartão: título 1,78 · departamento/data 1,57 · etapa 1,48 · eyebrow 1,39 · frase 1,67).

Confirmação escrita ao iniciar a execução (2026-10-12, verbatim):

```
Confirmo: nenhuma outra janela publica (push, apply ou deploy) até o fim do 52-30.
```

Resposta da rodada 1 (verbatim):

```
janela única: confirmo + WR-01: backlog + residual_chips_agendamento: consertar agora + residual_contraste_cartao: backlog
Motivo dos chips: mesmo defeito e mesmo par opaco dos selos (G-52-6); com os selos consertados, os chips e as notas do card de entrevista (1,14–1,46; nota de cancelada 1,18) ficariam os únicos ilegíveis do painel, e a nota de cancelada é justamente a que o candidato mais precisa ler. No residual do cartão, registre no backlog que a amostra mediu o pior caso sobre o gradiente e que PrazoEstimadoLinha, «Retirar minha candidatura» e o eyebrow «Sua entrevista» ficaram sem medir.
```

| Achado do review 1 | Disposição |
|---|---|
| **WR-01** — `AvaliacaoRavenScreen.shell.test.tsx:364-367` compara cores pela `contraste()` do medidor SEM compor o alfa; um ladrilho `bg-white/60` passaria com 13,39:1. Hoje as seis classes são opacas e o indicador tem 13,39:1 de verdade. Proposta: `medidor.contrasteDeClasses` nos quatro pares, ou afirmar `corDeClasse(t).a === 1` — só o teste muda | **backlog** (operador, rodada 1) |
| IN-01 (check a 360px ≈ 2 % do desenho; largura útil 45 → 41 px) | julgamento → Task 3, item 1 (aprovado: «itens de 8 alternativas ok») |
| IN-02 (âncora de informativo reprova como a de alvo) | primeira metade entrou no cabeçalho do medidor em `a0f24b76`; a segunda virou IN-05 do review 2 |
| IN-03 (`process.cwd()` no `concluidas.test`), IN-04 (`DECLARADOS = 24` é tripwire), IN-05 (célula da D-27 na UI-SPEC), IN-06 (forma `/\{[^{}]*\}/` sem completude no `selos.test`), IN-07 (`sips` sai 0 ao pular) | registrados; nenhum bloqueante; IN-06 foi implementado no teste NOVO do cartão (contagem de `icon:`), o `selos.test` segue sem a checagem |

### Rodada de conserto `a0f24b76` → review nº 2 (critical 0 · warning 0 · info 5, approved)

O portão, rodado sobre o review nº 1 depois do conserto, RECUSOU com `CODIGO DEPOIS DA REVISAO … (reviewed_head 8010006e): scripts/p52_contraste.cjs src/…/AgendamentoCandidatoCard.tsx src/…/AgendamentoCandidatoCard.test.tsx` (rc=1) — o portão vê o conserto, como o plano prevê. O review nº 2 (`reviewed_head` a0f24b76) entrou assumindo que a rodada introduziu defeito novo e não achou: cópia e a11y iguais por comando, paleta dos 10 tokens novos igual ao CSS emitido pelo build ao octeto, mordidas M1–M6 e A1–A4, e as reversões coerentes B1/B2 reproduzindo o 1,18 e o 1,33 do residual como `ABAIXO`.

Resposta da rodada 2 (2026-10-12 12:01 -03, verbatim):

```
janela única: confirmo + publicar. IN-04: backlog (a lista literal de cinco chips do medidor é a forma «iteração sobre lista literal» do CLAUDE.md: um chip novo fica fora da vigilância com o teste verde; trocar por derivação do mapa de status). Demais INFO: aceitar.
```

| INFO do review 2 | Disposição (`52-30-DECISAO.md`) |
|---|---|
| IN-01 — o descritor de reserva (status fora do mapa) também mudou; dentro da letra da decisão, declarado no commit, inalcançável pelo tipo de hoje | aceitar — `residual_chips_agendamento: consertado` cobre os cinco chips, o descritor de reserva e as duas notas |
| IN-02 — 52-UI-SPEC:585 e :822 ainda chamam os chips e as notas de residual translúcido | aceitar — emenda datada planning-only, fora do portão de código, a fazer no fecho da fase |
| IN-03 — completude da guarda ancorada só em `icon:` (tsc e medidor são a segunda e terceira defesa, provado) | aceitar |
| IN-04 — `CHIPS_AGENDAMENTO` em `p52_contraste.cjs:291-297` é lista literal de 5 dos 6 status | **backlog** (operador) |
| IN-05 — a linha `CENARIO DESCOLADO DO FONTE` de um `informativo` não aponta «passe o cenário a alvo» | aceitar |

**Qual caminho valeu para o conteúdo:** `warnings: 0` no review de maior N → `autorizacao: 52-UAT.md`: as três decisões do operador no UAT (G-52-4 «Esconder»; G-52-6 «Todos os selos»; «Cancelada» «Entra junto»), verbatim na DECISAO, mais a rodada «consertar agora» decidida por escrito na rodada 1.

Verifies da Task 1 (rodados pelo orquestrador depois do commit da decisão e de novo por este executor, antes deste SUMMARY, mesma saída):

```
PORTAO OK: revisao=.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-UAT-2.md reviewed_head=a0f24b760fa81d7d7da5ee92e962c09a9a6a6fa5 pin=- modo=revisao
decisao de publicacao: publicar sobre 52-REVIEW-UAT-2.md (warnings=0)
```

## Saída do medidor (verbatim, HEAD `70528fba`, igual desde `a0f24b76`)

```
$ node scripts/p52_contraste.cjs
ALVO painel-rejeicao: min=5.73 mediana=6.72 max=7.96 alvo=4.50 OK
CONTROLE controle-painel-rejeicao-antes: min=1.38 mediana=2.04 max=3.37 alvo=4.50 MORDE
ALVO agendamento-chip-agendada: min=6.49 mediana=6.49 max=6.49 alvo=4.50 OK
ALVO agendamento-chip-em_andamento: min=7.15 mediana=7.15 max=7.15 alvo=4.50 OK
ALVO agendamento-chip-concluida: min=9.37 mediana=9.37 max=9.37 alvo=4.50 OK
ALVO agendamento-chip-reagendada: min=6.38 mediana=6.38 max=6.38 alvo=4.50 OK
ALVO agendamento-chip-nao_compareceu: min=9.37 mediana=9.37 max=9.37 alvo=4.50 OK
ALVO agendamento-nota-reagendada: min=6.38 mediana=6.38 max=6.38 alvo=4.50 OK
ALVO agendamento-nota-cancelada: min=6.80 mediana=6.80 max=6.80 alvo=4.50 OK
INFORMATIVO painel-cartao-titulo: min=1.78 mediana=3.25 max=7.03
INFORMATIVO painel-cartao-departamento-data: min=1.57 mediana=2.66 max=5.18
INFORMATIVO painel-cartao-etapa: min=1.48 mediana=2.39 max=4.38
INFORMATIVO painel-proximo-passo-eyebrow: min=1.39 mediana=2.14 max=3.67
INFORMATIVO painel-proximo-passo-texto: min=1.67 mediana=2.95 max=6.06
CONTRASTE OK: 8 cenario(s) no alvo; 1 controle(s) mordem; amostras=480x286

$ node scripts/p52_contraste.cjs --auto-teste | tail -1
P52-CONTRASTE AUTO-TESTE OK: 24/24
```

Os sete ids que passaram de `informativo` a `ALVO`: `agendamento-chip-agendada` (1,33 → 6,49), `agendamento-chip-em_andamento` (1,14 → 7,15), `agendamento-chip-concluida` (1,46 → 9,37), `agendamento-chip-reagendada` (1,44 → 6,38), `agendamento-chip-nao_compareceu` (1,46 → 9,37), `agendamento-nota-reagendada` (1,45 → 6,38), `agendamento-nota-cancelada` (1,18 → 6,80). Para par opaco min = mediana = max: o número não depende do pixel do fundo. Os cinco `INFORMATIVO painel-*` seguem iguais aos do 52-29 (o residual do cartão, backlog).

> **Nota sobre os SUMMARYs anteriores:** a tabela «Residual» do `52-28-SUMMARY.md`, as tabelas (a) e (b) do `52-29-SUMMARY.md` e o terceiro `<verify>` do 52-28 (que procura as sete linhas `INFORMATIVO agendamento-…` por nome e hoje acha 0) descrevem o estado ANTES da decisão «consertar agora» desta rodada. Continuam corretos para a data deles; não foram reescritos (memória «regerar em bloco apaga o que foi anotado depois»).

## Task 2 — saídas (orquestrador, 2026-10-12; conferidas por este executor onde era só leitura)

**Precondição:** os dois `<verify>` da Task 1 verdes; `git status --porcelain -- supabase src scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts` vazio (os cinco itens sujos das outras janelas ficam fora desses caminhos).

**Passo 0 — pin:** `refs/gsd/52-30/sha` = `70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8` (= HEAD = S). Nenhum commit de código entre o pin e o push.

**Passo 0b — re-medição imediatamente antes:** `node scripts/p52_contraste.cjs` → `CONTRASTE OK: 8 cenario(s) no alvo; 1 controle(s) mordem; amostras=480x286` (saída acima). Build local e marcadores (reproduzido por este executor no mesmo HEAD, mesmo hash):

```
raven-alternativa-check -> build/assets/index-EkWKvKBY.js
painel-rejeicao -> build/assets/index-EkWKvKBY.js
painel-proximo-passo-texto -> build/assets/index-EkWKvKBY.js
```

**Passo 1 — o «Comando de push» do `<context>`, byte a byte (15:07:40Z / 12:07 -03):**

- `R` = `29f34756903cd61eb6579086c724b47ca8a8843b` (`origin/main` antes do push — igual à fotografia do planejamento) · `S` = `70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8`
- `PORTAO OK … pin=70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8 modo=push ledger=[20261011000001,20261011000002,20261011000003,20261011000005]` — a regra (8) conferiu, só leitura, que toda `_p52_` do pin está no ledger de PROD (a 0004 do bloco D não existe no disco; o 52-20 não rodou antes deste plano)
- `merge-base --is-ancestor R S` verdadeiro
- **Enumeração `p50_enumera.cjs --de 29f34756 --ate 70528fba`** com o `--caminhos` por forma, `--assunto`, `--revisoes …/52-REVIEW-UAT`, `--base refs/gsd/52-26/sha`, `--aplicado refs/gsd/52-30/sha`: **36 commits — 22 `planning`, 14 `codigo`, 0 ALHEIO**; todo `codigo` contido no `reviewed_head` (a0f24b76) e no pin. Os 14 de código, por plano:
  - 52-28: `01436adf` `48a4ee40` `03f81a48` `f5d85b2b` `0f5ac731` `5c412621`
  - 52-29: `3810ae7e` `c45e9136` `7669a3b2` `a2af65ca` `c3517ee6` `5dc5dcf9` `02924e2e`
  - 52-30: `a0f24b76`
  - Os 22 `planning`: o UAT e os diagnósticos da 52, os PLAN/SUMMARY/docs dos 52-28 e 52-29, o tracking à mão, os dois reviews e a decisão deste plano.
- `git push origin 70528fba:refs/heads/main` executado.

**Passo 2 — verify 1 (logo após o push, e de novo às 16:35:47Z, e de novo por este executor antes deste SUMMARY):**

```
origin/main = HEAD; pin 52-30 no remoto; nada local
```

**Passo 3 — verify 2:** AUSENTE em todas as rodadas de 15:08:25Z a 16:33Z (16 rodadas do executor da Task 2, 15:08–15:23Z, `TIMEOUT after 16 attempts`; 31 rodadas do vigia do orquestrador, 15:29–16:33Z; `visitados=53` em todas). Depois do deploy disparado (abaixo), às 16:35:47Z e de novo por este executor:

```
PRESENTE em PROD (chunk index): {"raven-alternativa-check":["/assets/index-EkWKvKBY.js"],"painel-rejeicao":["/assets/index-EkWKvKBY.js"],"painel-proximo-passo-texto":["/assets/index-EkWKvKBY.js"]}
```

Chunk em PROD = `assets/index-EkWKvKBY.js`, o mesmo hash do build local da Passo 0b e do build do revisor nº 2: o que está no ar é byte a byte o que foi medido e revisado.

## Incidente da Vercel e o deploy disparado por ordem do operador (desvio)

O plano assume que a Vercel constrói o `main` sozinha depois do push («a Vercel leva alguns minutos para publicar: repetir o MESMO comando … ausente depois de ~15 minutos = PARAR e devolver checkpoint»). Não construiu: a Vercel estava em incidente «Increased build and deployment failures» (major, desde 13:35Z, upstream GitHub), e nenhum deployment foi criado para o push de 15:07:40Z. O executor da Task 2 PAROU no ~15º minuto como mandado e devolveu checkpoint; o orquestrador conferiu o painel da Vercel e levou ao operador.

Decisão do operador (verbatim):

```
esperar 60 min, vigiando o Passo 3. Se em 60 min os marcadores não estiverem PRESENTE em PROD, disparar por mim: crie o deploy com fonte git exatamente em 70528fba (main), nunca do disco local, e siga vigiando. Se o deploy disparado falhar, PARAR e me trazer o erro, sem nova tentativa. Quando os marcadores aparecerem, siga para a conferência visual (Task 3).
```

Passados os 60 minutos sem deploy (47 rodadas AUSENTE), o orquestrador criou o deployment às 16:34:03Z pela API da Vercel (`create_deployment`, `gitSource` github `repoId` 1083989601, `ref` `main`, `sha` `70528fbaa96ca6e6f1381a5d7e4cfdc1807ddae8`, `target` production, `forceNew`): `dpl_8Zzy82HoDwHGgG6q2o7RbPcn4Pr2`, url `sistema-recrutamento-g8g4t5c4k-fercosnts-projects.vercel.app`, `githubCommitSha` = 70528fba…, Building 16:34:19Z → Ready 16:35:24Z, alias `https://rh.beautysmile.com.br`. Nada saiu do disco local: a fonte é o commit que o portão enumerou e que `origin/main` já apontava. Verify 1 e verify 2 verdes às 16:35:47Z.

O que isso muda e o que não muda: o CONTEÚDO publicado é o mesmo sha revisado, enumerado e empurrado; o canal de disparo foi o único desvio, e com ordem escrita (memória «escrita em PROD: aditivo autônomo, destrutivo com portão» — aqui, reversível e com portão humano). O deploy automático da Vercel para pushes futuros não foi medido depois do incidente: o próximo push com plano deve vigiar o verify de PROD do mesmo jeito e, se a Vercel voltar a não construir, levar ao operador antes de disparar.

## Task 3 — conferência visual do operador (verbatim)

Conferido no ar em `https://rh.beautysmile.com.br`, recarregando sem cache, desktop e 360px (2026-10-12, ~14:09 -03):

```
aprovado nos itens 1, 2, 3 e 5; item 4 não observado; um defeito novo fora dos 4 gaps.
1. Raven (8e4bb7a0, +claude7): marcada inequívoca (borda grossa, anel, check), o check acompanha a troca, foco por Tab distinto, desktop e 360px, itens de 8 alternativas ok. Saí sem concluir.
2. Painel +claude6: nos dois cards (Consultor 3a9254c3 e Social Media 8101c56f), sem linha de prazo; «Avaliações concluídas — aguardando a equipe» em texto simples, sem caixa; selo «Aguardando a equipe» opaco e legível (print).
3. Painel +claude8: caixa escura com o retorno e «Agradecemos seu interesse na Beauty Smile.» legíveis; selo «Rejeitado» sólido e legível, no topo e depois de rolar (print).
4. Card de entrevista com chips: NÃO OBSERVADO. As duas candidaturas com agendamento (+claude1 0b1c887b e +claude4 bf26ee3c) estão finalizada/rejeitada e o painel não mostra o card nesses estados; a cand1 d31c78bb mostra o card só em «Aguardando agendamento», sem chip. Coberto pelos 7 cenários do medidor.
5, provas pendentes): a linha de prazo continua aparecendo; selos «Aguardando Resposta» e «Em Análise» opacos e legíveis (print).
DEFEITO NOVO (gap para diagnóstico, não consertar nesta task): no painel da +cand1, a candidatura d31c78bb (vaga 629a5f31, INATIVA) aparece como «Vaga não encontrada» com departamento «N/A». Causa medida: a única policy de SELECT em vagas que alcança o candidato é «Público vê vagas ativas» (status = 'ativa' AND deleted_at IS NULL); inativada a vaga, o candidato ainda no funil perde título e departamento (vagasService.ts:382/397). Vai acontecer com candidato real quando o RH pausar ou fechar uma vaga com gente no processo. Sugestão: leitura do título/departamento das vagas das PRÓPRIAS candidaturas do candidato; prioridade: antes de inativar a primeira vaga real, não bloqueia a abertura.
```

Mapa para os gaps: item 1 → G-52-2 (inclui o julgamento IN-01 do review 1 sobre o check e a largura útil a 360px com 8 alternativas: «ok»); item 2 → G-52-4 e G-52-4b; item 3 → G-52-6 (caixa, «Agradecemos», selo «Rejeitado», conferido depois de rolar — o fundo é fixo); item 5 → o controle do G-52-4 (candidatura com avaliação pendente mantém a linha de prazo) e os outros selos opacos do G-52-6 (D-52-U16 preservada). Item 4 → ressalva, abaixo.

## Gap novo encontrado na conferência visual (fora dos quatro gaps)

**Para o `/gsd-verify-work 52` registrar formalmente** (gap para diagnóstico; nada foi consertado nesta task, como o `<resume-signal>` da Task 3 manda):

- **Sintoma (medido pelo operador):** no painel do candidato `+cand1`, a candidatura `d31c78bb` da vaga `629a5f31` (INATIVA) aparece como «Vaga não encontrada» com departamento «N/A».
- **Causa apontada pelo operador:** a única policy de SELECT em `vagas` que alcança o candidato é «Público vê vagas ativas» (`status = 'ativa' AND deleted_at IS NULL`); inativada a vaga, o candidato ainda no funil perde título e departamento (`vagasService.ts:382/397`).
- **Impacto:** vai acontecer com candidato real quando o RH pausar ou fechar uma vaga com gente no processo.
- **Sugestão do operador:** leitura do título/departamento das vagas das PRÓPRIAS candidaturas do candidato.
- **Prioridade (operador):** antes de inativar a primeira vaga real; não bloqueia a abertura.
- **Observação do executor, sem diagnóstico próprio:** é a classe «tela vazia não é dado ausente» (memória): o dado existe; é a leitura que a RLS recusa. O conserto toca policy ou RPC em `vagas` — escrita em banco, portanto plano próprio com ensaio e portão, não gap de front. A memória «exposição a anon inclui views» vale para a solução: uma policy nova para o candidato deve ser restrita às vagas das candidaturas dele, nunca «todas as vagas» (o RH escolheu não publicá-la).

## Backlog

Para o orquestrador levar aos «Pending Todos» do STATE.md (nenhum destes muda código neste plano):

1. **WR-01 (52-REVIEW-UAT-1)** — `AvaliacaoRavenScreen.shell.test.tsx:364-367`: o teste de contraste do Raven compara cores pela `contraste()` SEM compor o alfa (compositing); trocar `contrasteEntre` por `medidor.contrasteDeClasses` nos quatro pares (borda/fundo, borda/anel, glifo/fundoSelo, foco/fundo), ou afirmar `corDeClasse(t).a === 1` nos seis tokens, para que `bg-white` → `bg-white/60` no fonte deixe o caso vermelho. Só o teste muda. Disposição do operador: backlog.
2. **residual_contraste_cartao** — texto do cartão de vidro branco do painel do candidato sem superfície local. Nota pedida pelo operador: a AMOSTRA de cinco estilos do 52-29 mediu o PIOR CASO sobre o gradiente de fundo, através da pilha real de vidro: título 1,78 (texto grande, limiar 3:1); departamento/data 1,57; etapa 1,48; eyebrow «Próximo passo» 1,39; frase do «Próximo passo» 1,67 (limiar 4,5:1). Três estilos da mesma pilha NÃO foram medidos: `PrazoEstimadoLinha` (texto e chip «Estimativa»), rótulo «Retirar minha candidatura», eyebrow «Sua entrevista». Plano novo; os cinco `INFORMATIVO painel-*` do medidor passam a `alvo` no mesmo commit do conserto (regra do `<action>` da Task 1).
3. **IN-04 (52-REVIEW-UAT-2)** — `CHIPS_AGENDAMENTO` em `scripts/p52_contraste.cjs:291-297` é lista literal de 5 dos 6 status (omite `cancelada` sem razão de hoje): forma «iteração sobre lista literal» do CLAUDE.md — um chip novo fica fora da vigilância com o teste verde. Derivar a lista do `STATUS_CONFIG` pela mesma forma do teste (ou, no mínimo, acrescentar `cancelada`: 9 cenários no alvo). Código no `--caminhos` → review novo quando for feito. Disposição do operador: backlog.
4. **Gap novo — vaga inativa no painel do candidato** (seção acima): registrar no `/gsd-verify-work 52`; prioridade «antes de inativar a primeira vaga real».
5. **IN-02 (52-REVIEW-UAT-2), planning-only** — emenda datada nas células 52-UI-SPEC:585 e :822 (os chips, o descritor de reserva e as duas notas passaram ao par opaco em `a0f24b76`; o texto atual é o registro de antes da decisão). Disposição: aceitar; fazer no fecho da fase, fora do portão de código.

## Residual / ressalvas

- **Item 4 da Task 3 — NÃO OBSERVADO:** nenhuma candidatura de teste está num estado em que o painel mostre o cartão de entrevista com chip (`+claude1 0b1c887b` e `+claude4 bf26ee3c` estão finalizada/rejeitada; `d31c78bb` mostra o cartão só em «Aguardando agendamento», sem chip). Coberto pelos sete cenários `ALVO agendamento-*` do medidor (par opaco: o número não depende do pixel) e pela guarda por forma do `AgendamentoCandidatoCard.test.tsx` (17 casos). Fica como ressalva para a re-verificação do UAT, como o plano previa («senão, registrar NÃO OBSERVADO»).
- **Deploy automático da Vercel** não foi medido depois do incidente (ver desvio). O próximo push com plano vigia o verify de PROD como este fez.
- **`origin/main..HEAD` reabre com o commit deste SUMMARY**, só com `.planning/` — declarado no `<success_criteria>`; sobe no próximo push com plano. O verify 1 da Task 2 estava verde até este commit.

## Files Created/Modified

- `.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-UAT-1.md` — review adversarial nº 1 (revisor), `b08e7b3b`.
- `.planning/phases/52-hub-do-rh-dados-e-contato/52-REVIEW-UAT-2.md` — review adversarial nº 2 (revisor), `482ec9aa`.
- `.planning/phases/52-hub-do-rh-dados-e-contato/52-30-DECISAO.md` — decisão, disposições, janela única, respostas verbatim, backlog, `70528fba`.
- `src/features/agendamento/components/AgendamentoCandidatoCard.tsx` — `STATUS_CONFIG` e descritor de reserva opacos; notas com superfície; cópia intacta (`a0f24b76`).
- `src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx` — guarda por forma, contraste pela `contrasteDeClasses` do medidor, quatro mordidas, casos (a) e (d) lendo o DOM; 10 → 17 casos (`a0f24b76`).
- `scripts/p52_contraste.cjs` — os sete cenários `agendamento-*` de `informativo` a `alvo` 4,5:1, âncoras nas classes novas, cabeçalho emendado (`a0f24b76`).
- Ref `refs/gsd/52-30/sha` = `70528fba` (pin da publicação; não é arquivo).

## Decisions Made

- Publicar sobre o review de maior N (`52-REVIEW-UAT-2.md`, warnings 0) com o conteúdo autorizado pelas três decisões do UAT, mais a rodada «consertar agora» dos chips e notas — decidida pelo operador na rodada 1, revisada antes de qualquer push (memória «re-revisar o conserto antes do apply»).
- Janela única confirmada por escrito três vezes (início, rodada 1, rodada 2); registrada verbatim na DECISAO.
- Deploy disparado por API no sha exato do pin, só depois de 60 min de espera e com ordem escrita do operador; fonte git, nunca o disco.
- O defeito da vaga inativa é gap novo para o `/gsd-verify-work 52`, não conserto desta task.

## Deviations from Plan

**1. [Operacional — decisão do operador] Deploy da Vercel disparado por API depois do incidente**
- **Found during:** Task 2, Passo 3 (verify 2 AUSENTE depois de ~15 min)
- **Issue:** a Vercel não criou deployment para o push de 15:07:40Z (incidente «Increased build and deployment failures», major, 13:35Z–, upstream GitHub). O plano manda PARAR e conferir no painel — feito.
- **Decision:** o operador mandou esperar 60 min vigiando e, sem deploy, disparar com fonte git em `70528fba` (`main`), nunca do disco; parar se falhasse. Deploy `dpl_8Zzy82HoDwHGgG6q2o7RbPcn4Pr2` criado às 16:34:03Z, Ready 16:35:24Z; verifies verdes às 16:35:47Z.
- **Files modified:** nenhum; nenhum commit.
- **Impact:** o conteúdo publicado é o mesmo sha revisado e enumerado; só o canal de disparo mudou, com ordem escrita.

**2. [Previsto no `<action>` — não é desvio, registrado por clareza] Rodada de conserto e review nº 2**
- A Task 1 correu em duas rodadas porque o operador escolheu «consertar agora» para os chips e notas. É o caminho que o `<action>` descreve («código muda → review NOVO → esta task de novo»). O conserto ficou dentro da forma do `--caminhos` e o medidor mudou no mesmo commit.

**3. [Escrituração] O review nº 1 está antes do ledger do plano**
- `b08e7b3b` (o review nº 1) foi commitado pelo orquestrador antes de o ledger `.git/gsd-plan-head-before-52-30` ser gravado; o ledger aponta para ele. Os commits MEDIDOS do plano são 3 (`a0f24b76`, `482ec9aa`, `70528fba`); o review nº 1 é nomeado como contexto, não contado.

**4. [Execução] Duração**
- O plano estimou 3 tasks com confiança baixa; o relógio de parede (10h 03m) é dominado pelas paradas humanas e pelos 86 min do incidente da Vercel, não por trabalho de código.

---

**Total deviations:** 1 operacional (decidida pelo operador), 3 registros de execução. **Impact:** nenhuma mudança de escopo. Nenhum banco, Edge Function, migration, `db:types` ou primitivo compartilhado foi tocado; o `52-APLICACOES.json` e a condição 1 da D-41 emendada não mudam. Nenhum arquivo das outras janelas foi tocado ou staged.

## Issues Encountered

- Incidente da Vercel (acima). O `TIMEOUT after 16 attempts` do executor da Task 2 e as 31 rodadas do vigia estão em `52-30-prod-crawler.log` e `52-30-prod-crawler-vigia.log` no scratchpad da sessão.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova introduzida por este plano (só push de front-end revisado; o deploy disparado usa a mesma fonte git). O gap novo da vaga inativa toca uma policy de RLS existente em `vagas` — não é superfície deste plano, mas o conserto futuro é escrita em banco e deve ter plano próprio com ensaio e portão (ver seção do gap).

## User Setup Required

Nenhum.

## Next Phase Readiness

- **Próximo passo nomeado pelo plano:** `/gsd-verify-work 52` para reconciliar G-52-2, G-52-4, G-52-4b e G-52-6 (o `gap_ids` dos 52-28/52-29/52-30) sobre o que está no ar, registrar formalmente o gap novo da vaga inativa e a ressalva do item 4; depois, o 52-19.
- O 52-30 fecha a onda do gap closure do UAT da 52; `origin/main` = `70528fba` + os marcadores em PROD.
- **STATE.md, ROADMAP.md e REQUIREMENTS.md não foram tocados por este executor.** O orquestrador escreve o tracking à mão (convenção 1 do despacho; memória «gsd-tools corrompe o STATE.md»). Os passos «update STATE/ROADMAP» do execute-plan ficam satisfeitos por essa delegação. Este commit contém só o SUMMARY.
- O ledger `.planning/WINDOWS.md` não foi escrito por este executor (o commit nomeia só o SUMMARY); o orquestrador decide se o gap novo e a ressalva do item 4 entram lá no tracking à mão.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-12*

## Self-Check: PASSED

- FOUND: .planning/phases/52-hub-do-rh-dados-e-contato/52-30-SUMMARY.md (este arquivo)
- FOUND: .planning/phases/52-hub-do-rh-dados-e-contato/52-30-DECISAO.md, 52-REVIEW-UAT-1.md, 52-REVIEW-UAT-2.md
- FOUND: src/features/agendamento/components/AgendamentoCandidatoCard.tsx, …/__tests__/AgendamentoCandidatoCard.test.tsx, scripts/p52_contraste.cjs
- FOUND commits: a0f24b76, 482ec9aa, 70528fba (os 3 medidos, `b08e7b3b..HEAD`) e b08e7b3b (contexto) — ancestrais de HEAD
- Remoto: `origin/main` = `70528fba` = `refs/gsd/52-30/sha` antes deste commit; `PRESENTE em PROD (chunk index)` reproduzido antes deste SUMMARY
- Árvore: só os cinco itens das outras janelas seguem sujos, intocados
