---
phase: 49-consertos-da-jornada-bloco-2
plan: 05
subsystem: frontend-rh
tags: [jorn-33, jorn-34, jorn-25, d-36, d-67, kanban, update-status-modal, predicado-canonico, fonte-unica, tdd]
status: complete

# Dependency graph
requires:
  - phase: 48-consertos-da-jornada-bloco-1
    plan: "01"
    provides: "`public.candidatura_encerrada(etapa, status)` viva em PROD — o critério que o selo «Encerrada» do Kanban passa a espelhar"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "03"
    provides: "`supabase/functions/_shared/candidaturaEncerrada.ts` — a ÚNICA implementação TS do predicado; o Kanban a consome pelo reexport `@/lib/candidatura/candidaturaEncerrada`, nunca por allowlist própria"
  - phase: 25
    plan: "02"
    provides: "`getTerminalBadge`, `canDrag`, o menu OPER-01/02/03 do Kanban e as suas 7 asserções de regressão — a superfície que este plano estendeu sem reescrever"
provides:
  - "`src/lib/candidatura/proximaEtapa.ts` — `ETAPAS_DE_TRABALHO` (as 6, na ordem do funil) e `proximaEtapaDeTrabalho(etapa)`: a resposta ÚNICA para «qual é a próxima etapa de trabalho» (D-36), já consumida pelo Kanban e pelo hub do RH, e o caminho que o «Avançar» do comparativo usa no 49-22"
  - "`EtapaDeTrabalho` — o subconjunto tipado de `EtapaFunilM2` sem os terminais (o tipo que o Kanban usa para as suas colunas)"
  - "ramo `'encerrada'` em `getTerminalBadge` + marcador `kanban-selo-encerrada`, vivos em PROD — o card `status='finalizado'` em etapa de trabalho deixou de ser arrastável e perdeu o menu de ações"
  - "`VALID_TRANSITIONS` sem `rejeitado → em_analise` e sem `aprovado_proxima → finalizado`; frase neutra em lugar do select vazio"
affects: [49-06, 49-13, 49-18, 49-22]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 10256
  tasks: 2
  commits: 3
  plan_head_before: ab3063cd995c26b7bd32135a10e175ca21449309
  # `commits: 3` MEDIDO por `git rev-list --count ab3063cd..HEAD` no instante da escrita deste
  # SUMMARY (a9e1f568, 3ab8feec, 907e85fb) — todos de PRODUÇÃO e todos já em `origin/main`.
  # Re-medir DEPOIS do commit de metadado deste plano dá 4, por construção. A fronteira é esta.
  # `tokens: 10256` = 41 023 octetos de `git diff ab3063cd..HEAD -- src` ÷ 4.
  estimate_tokens_do_plano: 70000
  # O plano estimou 70 000 e o realizado foi 10 256 — 6,8× ABAIXO, registrado sem arredondar.
  # É a TERCEIRA vez seguida (49-03: 10×; 49-04: 6,6×), e a razão é a mesma e agora tem nome:
  # nestes planos o peso está em LEITURA e MEDIÇÃO, que não aparecem no diff. Aqui foram o
  # KanbanBoard de 527 linhas, o HubCandidatoRH de 482, as duas suítes, a varredura P1 e a
  # classificação das 6 cópias de lista de etapas. O conserto em si são ~30 linhas de lógica.
  # ⚠ Três planos consecutivos errando na MESMA direção e pela MESMA razão não é ruído da
  # estimativa; é a escala `estimateTokens` medindo a coisa errada para planos de leitura.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "`as const satisfies readonly T[]`: o `satisfies` prova que cada literal pertence ao enum (erro de digitação não compila) e o `as const` preserva a tupla, de onde sai um tipo SUBCONJUNTO (`EtapaDeTrabalho`) — foi isso que fez um `TS2739` pré-existente do Kanban desaparecer, em vez de precisar de conserto próprio"
    - "ramo novo de classificação DEPOIS dos ramos específicos: «Encerrada» só pega quem não é «Aprovado» nem «Rejeitado», porque o selo específico informa mais que o genérico — e inverter a ordem renomearia dois selos existentes sem ninguém pedir (a mesma decisão de ordem que o 49-03 tomou entre `knockout` e `encerrada`)"
    - "gate único reusado em vez de gate novo: o arraste e o menu já dependiam de `!terminalBadge`; ampliar o CONJUNTO que `getTerminalBadge` reconhece move as duas travas de uma vez. Um segundo `if (encerrada)` seria uma segunda verdade sobre «acabou»"
    - "controle sem destino não é renderizado: um select aberto e vazio convida ao clique e não responde — o operador tenta, não entende, e procura outro atalho (que era exatamente o atalho que este plano fechou)"
    - "mock de primitivo Radix + mock dos diálogos que ele passaria a montar: abrir o menu no happy-dom exige renderizar o conteúdo, e o conteúdo montava dois diálogos com hooks do TanStack Query que a suíte não provê — os dois mocks andam juntos ou nenhum funciona"

key-files:
  created:
    - src/lib/candidatura/proximaEtapa.ts
    - src/lib/candidatura/__tests__/proximaEtapa.test.ts
  modified:
    - src/components/KanbanBoard.tsx
    - src/components/__tests__/KanbanBoard.test.tsx
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/components/modals/UpdateStatusModal.tsx
    - src/components/modals/__tests__/UpdateStatusModal.test.tsx

key-decisions:
  - "O util devolve `undefined` em `decisao_final`, e isso é a regra, não um caso de borda: depois da decisão final não há etapa de trabalho, há DECISÃO — e quem grava os terminais é `registrar_decisao`/`rejeitar_candidatura`, pelo caminho auditado. Por isso `aprovado` e `rejeitado` ficam FORA de `ETAPAS_DE_TRABALHO`."
  - "`FUNNEL_ORDER` (`RetrocederCandidaturaDialog.tsx:55`) NÃO foi unificada com `ETAPAS_DE_TRABALHO`, apesar de os seis valores coincidirem hoje. Ela responde a outra pergunta — quais etapas ANTERIORES são destino de retrocesso — e as duas terem a mesma resposta é coincidência da ordem, não invariante. Fundi-las faria uma mudança de escopo de retrocesso mexer no avanço."
  - "`TIMELINE` (as 8 etapas do hub) FICA. Ela desenha a linha do tempo e alimenta `estadoDaSecao`; desenhar a jornada e decidir o avanço são perguntas diferentes. O que saiu do hub foi só o `TIMELINE.slice(0, 6)` que DECIDIA."
  - "O selo «Encerrada» é NEUTRO (`bg-white/15 text-white/80`), não verde nem vermelho. «Encerrada» não afirma se acabou bem ou mal; pintar com cor de desfecho inventaria um desfecho que a linha não tem — a mesma forma do defeito que o 49-04 removeu da célula DISC, que pintava verde fixo para ausência."
  - "O ramo «Encerrada» vem DEPOIS de Aprovado e Rejeitado. `aprovado/finalizado` casa com o predicado canônico também, e o ramo específico ganha de propósito: «Aprovado» diz mais ao RH que «Encerrada». Há teste fixando essa ordem."
  - "O marcador `kanban-selo-encerrada` é o `data-testid` SÓ do caso novo; Aprovado/Rejeitado mantêm `terminal-pill-<id>`. Um elemento tem um `data-testid` só, e trocar o nome existente seria reescrever asserções de 25-02 para acomodar um caso novo. A identificação por card ficou num `data-candidatura-id` à parte."
  - "Com a lista de transições vazia, o select deixa de ser RENDERIZADO — não fica presente e desabilitado. E a frase antiga («Este status é final») saiu porque para `rejeitado` era FALSA: há caminho, só não é este. A frase nova diz o que é verdade (mudar só o status não registra autor nem motivo) e nomeia o caminho que registra."
  - "Evidência de RED registrada à mão: `gsd-tools check tdd-red-evidence` NÃO consegue classificar um run vitest (ver Findings). Nenhuma linha de contador foi sintetizada para fazê-lo devolver OK."

requirements-completed: []
# ⚠ Os 3 IDs do plano (JORN-33, JORN-34, JORN-25) ficaram BLOQUEADOS pelo portão de ID
# compartilhado (#2388). `requirements.ready-ids` devolveu `ready: []`,
# `blocked: [JORN-33, JORN-34, JORN-25]`, e nada foi marcado em REQUIREMENTS.md:
#   · JORN-33 — declarado também pelo 49-18 (sem SUMMARY);
#   · JORN-34 — também pelo 49-06 e 49-18;
#   · JORN-25 — também pelo 49-06, 49-08, 49-13, 49-18 e 49-22.
# Isso é o portão funcionando. O JORN-25 em particular NÃO poderia ser marcado aqui de jeito
# nenhum: a metade que importa dele é a trava no `avancar_etapa` (49-06) — esta tela só deixa
# de OFERECER.

# Coverage (#1602)
coverage:
  - deliverable: "Um util só responde «qual é a próxima etapa de trabalho» (D-36), e Kanban e hub o consomem"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/lib/candidatura/__tests__/proximaEtapa.test.ts — tabela-verdade de 12 casos (a cadeia inteira das 6, `decisao_final`→undefined, os 2 terminais, null/undefined/desconhecida/vazia)"
        status: pass
      - kind: test
        ref: "src/lib/candidatura/__tests__/proximaEtapa.test.ts — a lista são as 6 sem terminais; e a travessia da cadeia a partir de `inscricao` percorre exatamente `ETAPAS_DE_TRABALHO`"
        status: pass
      - kind: test
        ref: "src/components/__tests__/KanbanBoard.test.tsx#«Avançar» usa proximaEtapaDeTrabalho — `triagem`→`avaliacao_assincrona` e `entrevista_presencial`→`decisao_final`; em `decisao_final` não há «Avançar»"
        status: pass
      - kind: command
        ref: "node -e '… proximaEtapaDeTrabalho( nos DOIS arquivos · candidaturaEncerrada( no Kanban' → OK"
        status: pass
  - deliverable: "O Kanban trata encerrada pelo predicado canônico: selo «Encerrada», sem arraste e sem menu (JORN-33)"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/components/__tests__/KanbanBoard.test.tsx#card `finalizado` em etapa de trabalho ganha o selo «Encerrada» (marcador `kanban-selo-encerrada`, cor sem verde/vermelho)"
        status: pass
      - kind: test
        ref: "src/components/__tests__/KanbanBoard.test.tsx#card encerrado NÃO expõe o menu de ações — «Ver Perfil» continua"
        status: pass
      - kind: test
        ref: "src/components/__tests__/KanbanBoard.test.tsx#card encerrado NÃO é arrastável — drag recusado, zero mutação"
        status: pass
      - kind: test
        ref: "src/components/__tests__/KanbanBoard.test.tsx#os selos Aprovado e Rejeitado continuam — o ramo novo vem DEPOIS deles (2 casos)"
        status: pass
  - deliverable: "Retirada a pedido NÃO é encerrada por esse predicado, por desenho (D-34 / Invariante 9 da 45-UI-SPEC)"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/components/__tests__/KanbanBoard.test.tsx#retirada a pedido NÃO é encerrada: sem selo, com menu, e o arraste CHAMA a mutação"
        status: pass
  - deliverable: "O modal não reabre nem encerra candidatura só mudando o status (JORN-34 · D-67)"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/components/modals/__tests__/UpdateStatusModal.test.tsx#status atual `rejeitado`: nenhuma opção é oferecida, «Em Análise» ausente da tela, botão desabilitado"
        status: pass
      - kind: test
        ref: "src/components/modals/__tests__/UpdateStatusModal.test.tsx#status atual `aprovado_proxima`: oferece `em_analise` e `rejeitado`, NÃO `finalizado`"
        status: pass
      - kind: test
        ref: "src/components/modals/__tests__/UpdateStatusModal.test.tsx#`aguardando_resposta` e `em_analise` continuam oferecendo o que oferecem hoje (regressão)"
        status: pass
      - kind: test
        ref: "src/components/modals/__tests__/UpdateStatusModal.test.tsx#as 7 asserções de 25-02 e 48-16 seguem verdes no mesmo arquivo (12/12)"
        status: pass
  - deliverable: "A frase que substitui o select vazio é neutra e não promete nada ao candidato"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/components/modals/__tests__/UpdateStatusModal.test.tsx#a tela diz por quê e aponta o caminho auditado — «pedido de revisão da decisão» presente; /psicológic/i e /privacidade@/i ausentes"
        status: pass
      - kind: test
        ref: "src/__tests__/guards/forbidden-strings.grep.test.ts (LGPD-04 / RNF-12) verde no mesmo run"
        status: pass
  - deliverable: "Nada aqui introduz portão de evidência no avanço (D8)"
    human_judgment: true
    rationale: "É uma afirmação NEGATIVA sobre desenho, e nenhuma asserção a decide. O que se pode mostrar: o util não recebe nota, análise nem parecer — só a etapa (assinatura `(etapa: string | null | undefined)`), e o gate do Kanban é `candidaturaEncerrada(etapa, status)`, que lê dois campos de ESTADO. Nenhum dos dois consulta produção de evidência da etapa atual. Que isso seja suficiente para dizer «D8 intacto» é juízo."
  - deliverable: "Publicado: os dois marcadores estão no build, no chunk certo, e no ar"
    human_judgment: false
    verification:
      - kind: command
        ref: "npm run build → exit 0, assert-chunks PASSED, 47 chunks; grep -rl kanban-selo-encerrada build/assets/ → CandidatosRHPage-CBHX2UaI.js (chunk lazy de /rh/*)"
        status: pass
      - kind: command
        ref: "git push origin main; git log --oneline origin/main..HEAD → vazio"
        status: pass
      - kind: command
        ref: "crawler em https://rh.beautysmile.com.br → PRESENTE em PROD: kanban-selo-encerrada · PRESENTE em PROD: «não pode ser alterado por aqui»"
        status: pass
  - deliverable: "O RH entende «Encerrada» e a frase do modal sem treinamento"
    human_judgment: true
    rationale: "Os testes provam que o selo aparece, que a ação desaparece e que os marcadores estão no ar. Se «Encerrada» num badge neutro comunica ao recrutador que ali não há o que fazer, e se a frase do modal o manda ao pedido de revisão em vez de fazê-lo procurar outro atalho, é juízo de UX sobre texto em pt-BR. Nenhuma das duas telas foi aberta por pessoa nesta sessão."

# Metrics
duration: 27 min
completed: 2026-09-22
tasks: 2
files: 7
---

# Phase 49 Plano 05: Fonte única da próxima etapa, e nenhuma ação sobre candidatura encerrada Summary

O Kanban passou a reconhecer o terceiro estado terminal que ele ignorava — `status='finalizado'`
numa etapa de trabalho — e, com isso, o card de uma candidatura já encerrada ganhou selo, deixou de
ser arrastável e perdeu o menu «Avançar/Retroceder/Rejeitar». No mesmo passo, a regra de «qual é a
próxima etapa» deixou de existir em duas cópias e o `UpdateStatusModal` parou de oferecer os dois
atalhos que reabriam e encerravam candidatura sem deixar rastro.

## O que estava errado — medido na varredura C1, não inferido

**JORN-33.** `getTerminalBadge` conhecia dois casos: `etapa_atual` terminal e `status='rejeitado'`.
O terceiro — `status='finalizado'` em etapa de **trabalho** — devolvia `null`. E como
`!terminalBadge` é o que libera **o arraste** (`canDrag`) **e o menu inteiro**, uma candidatura já
encerrada continuava empurrável para a frente. São **3 linhas em PROD** nesse estado
(`triagem/finalizado`, `entrevista_online/finalizado`, `decisao_final/finalizado`).

**JORN-34 e D-67.** Duas transições do `VALID_TRANSITIONS` escreviam **só o status**, e por isso
gravavam **zero histórico**: com `etapa_atual` igual, o `avancar_etapa` sai no early-return, então
não nasce linha, nem autor, nem justificativa.

| Transição | O que fazia | Caminho certo |
|---|---|---|
| `rejeitado → em_analise` | **reabria** uma candidatura encerrada | pedido de revisão da decisão (`responder_revisao_decisao`, D-01) — transição sancionada |
| `aprovado_proxima → finalizado` | **encerrava** pelo mesmo atalho | a decisão final (`registrar_decisao`), que grava autor e justificativa |

⚠ E a segunda fecha o círculo com a primeira: `aprovado_proxima → finalizado` é a **origem
plausível** das 3 linhas do JORN-33. O mesmo defeito, visto de dois lugares.

**D-36.** Três telas ofereciam «Avançar» e cada uma respondia por conta própria qual era a próxima
etapa — duas com a mesma aritmética escrita de dois jeitos, e a terceira sem responder nada.

## Passo 1 (D-50) — varredura pela FORMA: as cópias da lista de etapas

Re-rodados o padrão **P1 da C1** (`updateCandidaturaEtapa(|avancarEtapa(|onAvancar(|updateCandidaturaStatus(|updateStatus(`)
e `grep -rn "WORKING_STAGES" src`. **Delta vs. kickoff: nenhuma ocorrência nova de P1** (as 9
medidas no 49-03 seguem as mesmas). A varredura das LISTAS, que é a desta classe, saiu assim:

| Onde | Lista | Decide «próxima etapa»? | Classe |
|---|---|---|---|
| `KanbanBoard.tsx:58` `WORKING_STAGES` | 6 | **SIM** (`:178-179`) — e também as colunas (`:85`) e `columnForEtapa` (`:125`) | **defeito de forma** → consertado |
| `HubCandidatoRH.tsx:76` `WORKING_STAGES = TIMELINE.slice(0,6)` | 6 | **SIM** (`:138-139`) | **defeito de forma** → consertado |
| `ComparativoCandidatosPage.tsx:120` `PROXIMA_ETAPA_APOS_TRIAGEM` | — | **SIM, e sempre a MESMA** (`avaliacao_assincrona`) | **defeito** (D-36) — conserto é o **49-22**, que consome o util deste plano |
| `RetrocederCandidaturaDialog.tsx:55` `FUNNEL_ORDER` | 6 | NÃO — decide destinos de **retrocesso** (`slice(0, currentIndex)`) | escopo deliberado (ver key-decisions) |
| `HubCandidatoRH.tsx:63` `TIMELINE` | 8 | NÃO — **desenha** a linha do tempo, alimenta `estadoDaSecao` | escopo deliberado |
| `triagemService.ts:400` (em `ETAPA_M2_OPTIONS`) | 8 | NÃO — opções do **filtro** do painel | escopo deliberado |
| `VagaCandidatosRHPage.tsx:56` `STATUS_OPTIONS` (com `finalizado`) | — | NÃO — é **filtro** (`statusFiltro`), não escritor | escopo deliberado: filtrar por `finalizado` é legítimo, você QUER vê-las |
| `funilNavMap.test.ts:39`, `MatrizRetencaoTable.test.tsx:50`, `RetencaoPage.test.tsx:58`, `matrizRetencao.generated.ts` | — | NÃO — fixtures de teste e matriz gerada | escopo |

⚠ **Duas cópias entravam na mesma pergunta e uma terceira mentia** — e a que mentia é a mais
perigosa das três, porque não divergia: ela estava **errada sempre**. Um candidato em
`entrevista_presencial` avançava para `avaliacao_assincrona`, três etapas **atrás**. Há teste novo
no Kanban fixando exatamente esse caso, para que o 49-22 tenha contra o que comparar.

## Accomplishments

1. **`src/lib/candidatura/proximaEtapa.ts`** — `ETAPAS_DE_TRABALHO` (as 6, na ordem do funil) e
   `proximaEtapaDeTrabalho(etapa)`, null-safe e allowlist. O docblock registra o D-36, quem consome,
   e — em duas advertências — que o util **não autoriza nada** (quem aceita é `avancar_etapa`) e que
   **não é portão de evidência** (D8). Tabela-verdade de 12 casos + a travessia da cadeia.

2. **O Kanban e o hub importam o util.** As duas cópias locais de `WORKING_STAGES` saíram. As
   colunas do board são os mesmos seis valores, na mesma ordem — nada mudou na tela ali.

3. **`getTerminalBadge` ganhou o ramo «Encerrada»** pelo predicado canônico
   `candidaturaEncerrada(etapa, status)` (D-21), **depois** dos ramos Aprovado e Rejeitado, em cor
   neutra e com o marcador `kanban-selo-encerrada`. `canDrag` e o menu **não precisaram mudar**: eles
   já dependiam de `!terminalBadge`; o que mudou foi o CONJUNTO que a função reconhece.

4. **Retirada a pedido segue fora**, por desenho (D-34): sem selo, com menu, e com o arraste
   **chamando** a mutação — o teste prova as três coisas, porque «não regrediu» aqui significa
   «continua operável», e uma asserção só de ausência de selo não diria isso.

5. **`VALID_TRANSITIONS.rejeitado` virou `[]` e `aprovado_proxima` perdeu `finalizado`**, cada linha
   com o comentário da sua razão e do caminho auditado que a substitui.

6. **Sem destino, o select deixou de ser renderizado.** No lugar, uma frase neutra. Saiu também a
   frase «Este status é final», que para `rejeitado` era **falsa**.

7. **Publicado e provado no ar:** build verde (47 chunks, `assert-chunks PASSED`), os dois
   marcadores no chunk lazy `CandidatosRHPage-CBHX2UaI.js`, `origin/main..HEAD` vazio, e os dois
   lidos de volta de `https://rh.beautysmile.com.br`.

## Verification results

| Verify | Resultado |
|---|---|
| `npx vitest run src/lib/candidatura …/KanbanBoard.test.tsx src/features/hub-candidato` (T1) | **111 passed** (12 arquivos) |
| forma: `proximaEtapaDeTrabalho(` nos dois arquivos · `candidaturaEncerrada(` no Kanban | **OK** |
| `npm run -s lint` (tsc --noEmit) após T1 | **exit 2, 89 `error TS`** — teto do plano é 90 |
| `npx vitest run src/components src/lib src/features/hub-candidato src/__tests__/guards` (T2) | **369 passed** (46 arquivos) |
| `npm run -s lint` após T2 | **exit 2, 89 `error TS`** |
| conjunto de erros `tsc` × baseline de 90 (ignorando linha/coluna) | **um erro REMOVIDO, zero acrescentado** (ver Findings 3) |
| `npm run build` | **exit 0**, `assert-chunks PASSED`, 47 chunks |
| `grep -rl kanban-selo-encerrada build/assets/` | `CandidatosRHPage-CBHX2UaI.js` |
| `grep -rl "não pode ser alterado por aqui" build/assets/` | `CandidatosRHPage-CBHX2UaI.js` |
| `git push origin main` → `git log --oneline origin/main..HEAD` | **vazio** |
| crawler em PROD (`kanban-selo-encerrada`) | **PRESENTE** (1ª tentativa) |
| crawler em PROD (frase do modal) | **PRESENTE** |

**Regressão, além do pedido pelo plano:** a suíte vitest inteira — **209 arquivos / 2129 testes, 0
falhas** — porque `KanbanBoard` e `HubCandidatoRH` são importados por telas que este plano não
abriu, e porque o tipo `WorkingStage` mudou de forma (de `EtapaFunilM2` para o subconjunto), o que
não apareceria no subconjunto de arquivos tocados.

## TDD Gate Compliance

`workflow.tdd_mode` é **false**, então o gate não bloqueia. A Task 1 é `type="tracer"` (um commit de
produção, como o plano manda); a Task 2 é `tdd="true"` e seguiu a ordem:

| Tarefa | Gate | Commit | Estado |
|---|---|---|---|
| Task 1 (tracer) | — | `a9e1f568` `feat(49-05): …` | ✓ 111/111, `tsc` 89 |
| Task 2 | RED | `3ab8feec` `test(49-05): …` | ✓ 4 alvo reprovam (12 descobertos, 8 passam) |
| Task 2 | GREEN | `907e85fb` `feat(49-05): …` | ✓ 12/12 no arquivo, 369/369 nas pastas, 2129/2129 na suíte |
| Task 2 | REFACTOR | — | não houve: o conserto é uma constante e um ramo de JSX; não há o que limpar |

**RED medido** (`--reporter=tap`, artefato guardado em `/tmp/red-4905-t2.tap`): **12 testes
descobertos, 8 passam, 4 reprovam** — e os 4 são exatamente os alvo, por asserção:

| Alvo | Motivo da reprovação |
|---|---|
| `rejeitado` sem opção | `AssertionError: expected <select …> to be null` |
| a frase neutra | `TestingLibraryElementError: Unable to find … /não pode ser alterado por aqui/i` |
| `aprovado_proxima` sem `finalizado` | `AssertionError: expected [ 'em_analise', 'finalizado', …] to not include 'finalizado'` |
| `finalizado` sem select | `AssertionError: expected <select …> to be null` |

Nenhuma falha de carregamento de módulo, nenhuma descoberta vazia: **não é INVALID_RED (#3770)**.

⚠ **O 5º caso do `<behavior>` já passava no RED, por construção** (`aguardando_resposta` e
`em_analise` continuando a oferecer o que oferecem hoje): ele não descreve comportamento novo,
descreve o que o conserto **não pode** quebrar. Registrado para não parecer que 5 asserções novas
ficaram verdes de graça — a mesma nota que o 49-03 e o 49-04 precisaram fazer, pela mesma razão.

⚠ **A tabela-verdade de `proximaEtapaDeTrabalho` não tem RED próprio**, e a razão é do instrumento:
o RED de um módulo que ainda não existe é um `ERR_MODULE_NOT_FOUND`, que o próprio #3770 classifica
como `fixture_or_load_failure` — isto é, **INVALID_RED**. Ela entrou no commit da Task 1, que é
`tracer`, não `tdd`.

## Tracer feedback gate (Task 1)

`gate` ausente no `<task>` → `blocking` (o padrão), **não** `blocking-human`. `AUTO_CHAIN=false`,
`AUTO_CFG=false`, `HUMAN_VERIFY_MODE=end-of-phase`, e o `<verify>` do tracer tem **só**
`<automated>` (nenhum `<human-check>`). Pelo ramo do `execute_tasks`: re-rodar o `<verify>` ponta a
ponta; passou (**111/111**) → `⚡ Tracer verified end-to-end — expanding`, sem checkpoint. Registrado
porque a decisão de **não** parar aqui é tão reportável quanto a de parar.

## Findings

**1. `gsd-tools check tdd-red-evidence` continua inaplicável a este repositório — e nada foi
sintetizado para contornar isso.** O checker casa `/^# tests (\d+)/m`, `/^# pass (\d+)/m` e
`/^# fail (\d+)/m` — os contadores do `node:test`. O TAP do vitest não emite essas linhas, e
aninha as suítes sob um `not ok` de nível de **arquivo**, o que cai no ramo
`fixture_or_load_failure`. O 49-03 mediu o mesmo para Deno e o 49-04 para vitest; **este é o
terceiro registro do mesmo fato**, e ele já foi nomeado: os dois únicos runners do projeto estão
fora do alcance do checker. Escrever as três linhas `#` à mão faria o checker devolver
`RED_EVIDENCE_OK` e **seria forjar o artefato que ele existe para ler**. Não foi feito. O veredito
honesto é **inaplicável neste runtime**, não «aprovado».

**2. O menu do Kanban não abre com `fireEvent.click` no happy-dom, e mocká-lo puxa dois diálogos
que a suíte não sustenta.** A primeira versão dos testes de «Avançar» clicava no gatilho
`aria-label="Ações do candidato"` e procurava o item — e reprovou, porque o `DropdownMenuContent`
do Radix só existe no DOM depois de um gesto de ponteiro que o happy-dom não produz. O conserto
seguiu o precedente do repositório (`UsuariosRhTable.test.tsx`), **mas ele não basta sozinho**: com
o conteúdo do menu sempre renderizado, o `RejeitarCandidaturaDialog` e o
`RetrocederCandidaturaDialog` passam a **montar de verdade**, e ambos chamam hooks do TanStack
Query (`useRejeitarCandidatura`, `useUpdateCandidaturaEtapa`) sem o `QueryClientProvider` que esta
suíte deliberadamente não instala. Foram precisos **três** mocks, e os três andam juntos — mockar o
dropdown sem mockar os diálogos troca uma falha por outra. Registrado porque o caminho intuitivo
(«mocka o primitivo») quebra pela metade, de um jeito que só aparece ao rodar.

**3. `tsc` foi de 90 para 89, e o erro que saiu não foi consertado de propósito.** O
`STAGE_STYLE: Record<WorkingStage, …>` do Kanban tinha um `TS2739` pré-existente: `WorkingStage`
era `(typeof WORKING_STAGES)[number]` sobre um array anotado `EtapaFunilM2[]`, e portanto colapsava
em `EtapaFunilM2` — o `Record` passava a exigir chaves para `aprovado` e `rejeitado`, que não são
colunas. Com a lista vivendo no util como `as const satisfies readonly EtapaFunilM2[]`, o tipo
voltou a ser a tupla literal e o erro desapareceu. **O conjunto de mensagens foi diferenciado, não
só contado**: exatamente uma linha removida, nenhuma acrescentada — que é o que separa um ganho
real de uma compensação (um erro novo entrando enquanto um antigo sai mantém o número e passa o
portão). O teto do plano era 90, com margem zero; a margem passou a ser 1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Os testes de «Avançar» não conseguiam abrir o menu, e o conserto óbvio quebrava pela metade**

- **Found during:** Task 1
- **Issue:** ver Finding 2. `fireEvent.click` no gatilho não abre o `DropdownMenuContent` do Radix
  no happy-dom (2 testes reprovando por `Unable to find an element with the text: Avançar` /
  `Retroceder`). Mockar só `@/components/ui/dropdown-menu` trocaria isso por um erro de
  `QueryClientProvider` ausente, vindo de dois diálogos que passariam a montar.
- **Fix:** três mocks, com o porquê escrito em cada um: `dropdown-menu` → elementos nativos (forma
  já usada em `UsuariosRhTable.test.tsx`), e `RejeitarCandidaturaDialog` / `RetrocederCandidaturaDialog`
  → só o seu `trigger`. Os diálogos têm suíte própria; o que se testa aqui é o roteamento do card.
- **Files modified:** `src/components/__tests__/KanbanBoard.test.tsx`
- **Verification:** 111/111 na Task 1, e as 7 asserções de 25-02 do mesmo arquivo seguem verdes —
  elas não tocavam o menu, então os mocks não podiam tê-las «consertado».
- **Commit:** `a9e1f568`

### Desvio deliberado da LETRA do plano, registrado

**O `data-testid` do selo «Encerrada» não substituiu `terminal-pill-<id>`; ele convive com ele.** O
`<behavior>` pede `data-testid="kanban-selo-encerrada"` no pill, e um elemento só pode ter um
`data-testid`. Renomear o atributo para todos os selos reescreveria duas asserções de 25-02
(`terminal-pill-rej`, `terminal-pill-apr`) para acomodar um caso novo — e alterar teste existente
para o código novo passar é a forma que este projeto evita. O marcador novo é o `data-testid` **do
caso novo**; Aprovado e Rejeitado mantêm o nome antigo, e a identificação por card do selo
encerrada ficou num `data-candidatura-id` à parte (assertado no teste). O invariante que o plano
protege — o marcador existe, está no build e está no ar — está satisfeito.

**Total deviations:** 1 auto-corrigida (Rule 3) + 1 desvio deliberado de letra. **Impact:** nenhum
no comportamento entregue.

## Fora de escopo, registrado e NÃO tocado

- **`ComparativoCandidatosPage.tsx:120`** — o «Avançar» que grava `PROXIMA_ETAPA_APOS_TRIAGEM` fixo.
  É o terceiro item da varredura acima e o mais errado dos três, mas o conserto é o **49-22**, que
  agora tem o util para consumir. Não tocado (Scope Boundary).
- **`PROXIMA_ETAPA_APOS_TRIAGEM` (`triagemService.ts:374`) não foi removida.** Ela ainda tem
  chamador vivo (o comparativo). Removê-la aqui exigiria consertar o comparativo no mesmo passo, o
  que é o 49-22. O util não a reusa nem a contradiz — a substitui quando aquele plano rodar.
- **`getScoreColor` em `vagasTypes.ts:821` segue sem chamador**, e o `KanbanBoard.tsx:137` segue com
  a sua cópia local. Export morto, já registrado pelo 49-04, fora deste escopo.
- **`liberar_cognitivo` L36** (`v_status IN ('rejeitado','finalizado')` em vez do predicado) — item
  14 da C1, classificado no kickoff como equivalente em dado. Não tocado; é função SQL, e este plano
  não abre migration.
- **`VagaCandidatosRHPage.tsx:56`** oferece `finalizado` como valor de **filtro**. Classificado acima
  como escopo deliberado, e nomeado aqui porque o grep por `'finalizado'` o traz junto com o defeito.

## Known Stubs

**Nenhum.** Os 2 arquivos criados e os 5 modificados foram varridos por
`TODO|FIXME|placeholder|coming soon|not available|não disponível`. Os acertos são todos legítimos:
(a) `placeholder` como **atributo HTML** de `SelectValue` e `Textarea` no modal; (b) «na etapa em que
**TODO** candidato entra» no `HubCandidatoRH:228`, onde «TODO» é o quantificador português; (c) a
palavra `placeholder` num comentário do `HubCandidatoRH:380` que descreve o que foi **substituído**
numa fase anterior.

## Threat Flags

Nenhuma superfície nova. O plano **remove** superfície:

- **T-49-05-01** (reabrir/encerrar por status sem trilha — *Tampering*): mitigado no cliente, com 5
  asserções. ⚠ **A defesa no banco é o 49-06** — um cliente modificado ainda pode mandar o `PATCH`;
  o que este plano garante é que a tela não o oferece.
- **T-49-05-02** (arrastar encerrada para a frente no Kanban — *Tampering*): mitigado pelo predicado
  canônico gateando arraste e menu, com 3 asserções. Segunda camada também no 49-06.
- **T-49-05-SC** (npm/pip/cargo installs): **zero instalação de pacote** neste plano.

## Next

Plano 49-06 — e ele é a **outra metade** dos dois consertos deste: a trava de «candidatura
encerrada» no trigger `avancar_etapa`, que é o que de fato recusa o avanço (D-35), com a exceção
sancionada da reabertura (D-01) e das transições terminais que o próprio sistema grava. Enquanto ele
não rodar, o que existe é uma tela que não oferece — não um sistema que recusa.

Para quem mexer nisto depois, dois avisos:

1. **`ETAPAS_DE_TRABALHO` e `FUNNEL_ORDER` têm os mesmos seis valores e NÃO devem ser fundidas.** O
   docblock do util registra a razão onde quem for mexer vai ler. Se um dia o retrocesso deixar de
   poder ir a `inscricao`, a lista dele muda e a do avanço não.
2. **O `49-22` consome `proximaEtapaDeTrabalho` e deve REMOVER `PROXIMA_ETAPA_APOS_TRIAGEM`** junto,
   ou a terceira cópia sobrevive como export morto esperando um chamador novo.

## Self-Check: PASSED

- Presentes no disco: `src/lib/candidatura/proximaEtapa.ts`,
  `src/lib/candidatura/__tests__/proximaEtapa.test.ts`, e este SUMMARY.
- Presentes no `git log` e **todos já em `origin/main`**: `a9e1f568`, `3ab8feec`, `907e85fb`.
- Marcadores lidos de volta de PROD: `kanban-selo-encerrada` e «não pode ser alterado por aqui».
