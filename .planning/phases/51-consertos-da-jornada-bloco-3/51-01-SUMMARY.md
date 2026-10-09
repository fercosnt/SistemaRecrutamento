---
phase: 51-consertos-da-jornada-bloco-3
plan: 01
subsystem: ui
tags: [react, react-router, vitest, candidato, navegacao, grep-guard]

requires:
  - phase: 26
    provides: "AvaliacaoContainer conectado + frase canônica do wait-state (wait-state-copy.grep.test.ts)"
  - phase: 49
    provides: "D-52 (publicação conferida), D-53 (tsc ≤ 90), D-56 (portão prova que morde), scripts/p50_enumera.cjs"
provides:
  - "«Ir ao painel» no cabeçalho da lista de avaliações (todo estado) e no tudo-concluído (onBackToPanel injetado)"
  - "Convenção D-25/D-37 aplicada em 7 telas: «Voltar às avaliações» → lista; «Ir ao painel» → dashboard só onde a etapa avançou"
  - "Estado próprio «Sua etapa avançou» na ProvaCognitivaScreen (antes: toast sobre «Prova registrada»)"
  - "Nomes D-15 em 3 superfícies: card do container e ProvaCognitivaScreen = «Prova cognitiva»; Raven = «Raciocínio lógico (Matrizes)»"
  - "Guarda por forma rotulos-navegacao-candidato.grep.test.ts (varredura recursiva, mordida provada contra a base)"
affects: [51-02, 51-03, 51-04, 51-05, 51-06, JORN-43, JORN-48]

actuals:
  tokens: 15896
  tasks: 3
  commits: 6
plan_head_before: cd92cf425b56a8b16f215052ca7807483db0fc13
plan_head_after: c84715ce4bb065d13f653403f6270e8ee65c2d3f

tech-stack:
  added: []
  patterns:
    - "COPY_NAV local `as const` por tela (voltarAvaliacoes / irAoPainel) + backToList / goToPanel"
    - "Teste de navegação REAL: MemoryRouter com rotas-sentinela (SENTINELA-LISTA / SENTINELA-PAINEL), não navigate espião"
    - "Testes de tela com `vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))` para rodar sem .env.local"

key-files:
  created:
    - src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts
    - src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx
    - src/features/avaliacao-cognitiva/components/__tests__/navegacao-cognitiva.test.tsx
  modified:
    - src/features/avaliacao/components/AvaliacaoContainer.tsx
    - src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx
    - src/features/avaliacao/components/RedacaoEditorScreen.tsx
    - src/features/avaliacao/components/SjtCasoAbertoScreen.tsx
    - src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx
    - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
    - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
    - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
    - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
    - e2e/prova-cognitiva.spec.ts

key-decisions:
  - "Sem onBackToPanel o shell NÃO renderiza os botões «Ir ao painel» (nunca um botão inerte); o modo conectado sempre injeta navigate('/candidato/dashboard')"
  - "O toast LOCKED do envio (redação, SJT MC, caso prático, Big Five) é o mesmo estado «Sua etapa avançou» do D-37: passa a levar direto a /candidato/dashboard; o envio bem-sucedido continua voltando à lista"
  - "ProvaCognitivaScreen: o 42501 no envio vira estado próprio («Sua etapa avançou» + «Ir ao painel»); antes caía no «Prova registrada», que reconhecia um envio que o servidor recusou"
  - "ProvaCognitivaScreen muda de DESTINO além do rótulo: os botões dos estados de dentro da prova iam ao dashboard e passam a ir à lista (D-37: a tela vive dentro do container)"
  - "Constantes de rótulo locais por tela (COPY_NAV), não import de COPY_NAVEGACAO do container: evita ciclo de import pelo barril components/"

patterns-established:
  - "Guarda de rótulo por forma: raízes de feature varridas recursivamente, linhas de comentário fora, sanidade da regex + piso de arquivos"
  - "Prova de mordida: worktree descartável em refs/gsd/<plano>/base + node_modules por symlink + os testes novos copiados"

requirements-completed: [JORN-44, JORN-46]

coverage:
  - id: D1
    description: "Lista de avaliações: «Ir ao painel» no cabeçalho (todo estado) e no tudo-concluído, frase canônica mantida; WrongEtapaState diz «Ir ao painel» → dashboard"
    requirement: JORN-44
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx#«Ir ao painel» na lista (51-01 / JORN-44)"
        status: pass
      - kind: unit
        ref: "src/__tests__/guards/wait-state-copy.grep.test.ts"
        status: pass
      - kind: other
        ref: "crawler PROD: avaliacao-ir-ao-painel em /assets/index-_4uQIozX.js de https://rh.beautysmile.com.br"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cinco telas do container: «Voltar às avaliações» → lista nos estados de dentro da prova; «Ir ao painel» → dashboard direto no «Sua etapa avançou»"
    requirement: JORN-46
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "ProvaCognitivaScreen «Prova cognitiva» com destinos D-37 e estado próprio de etapa avançada; AvaliacaoRavenScreen «Raciocínio lógico (Matrizes)» com «Ir ao painel»"
    requirement: JORN-46
    verification:
      - kind: unit
        ref: "src/features/avaliacao-cognitiva/components/__tests__/navegacao-cognitiva.test.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "Guarda por forma dos rótulos de navegação do candidato, com mordida provada contra refs/gsd/51-01/base"
    requirement: JORN-46
    verification:
      - kind: unit
        ref: "src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Conferência visual das telas no navegador (D-28: telas 43–48 conferidas no navegador) — posição do botão no cabeçalho em 320px, destaque no tudo-concluído"
    requirement: JORN-44
    verification: []
    human_judgment: true
    rationale: "Layout e leitura do cabeçalho com dois botões no celular não são assertáveis por teste unitário; o e2e da prova cognitiva é gated em E2E_REAL_LOGIN e não rodou"

duration: 20min
completed: 2026-10-09
status: complete
---

# Phase 51 Plan 01: Navegação do candidato (JORN-44, JORN-46) Summary

**«Ir ao painel» no cabeçalho e no tudo-concluído da lista de avaliações. Nas sete telas de prova, o rótulo agora diz o destino: «Voltar às avaliações» leva à lista e «Ir ao painel» leva direto ao dashboard quando a etapa avançou. Os nomes do D-15 foram aplicados e um guarda por forma, com a mordida provada, impede o rótulo antigo de voltar. Publicado e conferido no chunk `index-_4uQIozX.js` de PROD.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-10-08T23:46:14Z
- **Completed:** 2026-10-09T00:06Z
- **Tasks:** 3 (6 commits: RED + GREEN por task)
- **Files modified:** 13 (3 criados, 10 editados)
- **tsc (D-53):** baseline medida no Passo 0 = **89**; 89 ao fim de cada task (teto 90). O hook de pre-commit reporta 89 contra a sua própria baseline congelada de 96.

## Accomplishments

- `AvaliacaoShell` ganhou a prop `onBackToPanel`, que o docblock prometia desde a Phase 11 e não existia. Agora há «Ir ao painel» ao lado de «Sair» (`data-testid="avaliacao-ir-ao-painel"`) em todo estado da lista e um botão de destaque no tudo-concluído (`avaliacao-concluida-ir-ao-painel`), embaixo da frase canônica mantida byte a byte.
- Nas cinco telas do container, o defeito do C-11 (rótulo «painel» com destino lista) deixou de existir. O «Sua etapa avançou» não passa mais pelo `WrongEtapaState`.
- A `ProvaCognitivaScreen` passou a se chamar «Prova cognitiva». Os botões dela voltam à lista e o 42501 virou estado próprio. O Raven passou a se chamar «Raciocínio lógico (Matrizes)».
- Guarda por forma novo. Contra a base, ele reprova com 14 linhas em 9 arquivos.

## Tabela D-24 / C-11 — sítio · estado · antes · depois

Linhas medidas no código de `refs/gsd/51-01/base` (`cd92cf42`). O «antes» foi **medido por execução**: o probe rodou o `navegacao-provas.test.tsx` com os rótulos antigos contra a base. Nos 5 estados de dentro da prova, «Voltar ao painel» chegou à LISTA. Nos 3 estados «Sua etapa avançou», **não** chegou ao painel (foi à lista, que mostra o bloqueio).

| Tela | Linha (base) | Estado | Rótulo antigo → destino | Rótulo novo → destino |
|---|---|---|---|---|
| AvaliacaoContainer | 195-201 | cabeçalho, todo estado da lista | — (só «Sair») | «Ir ao painel» → `/candidato/dashboard` |
| AvaliacaoContainer | 224-231 | tudo concluído | — (só texto) | «Ir ao painel» → `/candidato/dashboard` (frase canônica mantida) |
| AvaliacaoContainer | 305-307 | `WrongEtapaState` (etapa ≠ assíncrona) | «Voltar ao painel» → dashboard | «Ir ao painel» → dashboard |
| RedacaoEditorScreen | 229-230 | toast LOCKED no envio | (sem botão) → lista | (sem botão) → **dashboard** |
| RedacaoEditorScreen | 249-250 | «Sua etapa avançou» (`locked`) | «Voltar ao painel» → lista | «Ir ao painel» → **dashboard** |
| RedacaoEditorScreen | 286-287 | nenhuma redação pendente | «Voltar ao painel» → lista | «Voltar às avaliações» → lista |
| RedacaoEditorScreen | 306-307 | redações concluídas | «Voltar ao painel» → lista | «Voltar às avaliações» → lista |
| RedacaoEditorScreen | 319-320 | sem pergunta | «Voltar ao painel» → lista | «Voltar às avaliações» → lista |
| SjtMultiplaEscolhaScreen | 154 | envio ok (sem botão) | → lista | → lista (inalterado) |
| SjtMultiplaEscolhaScreen | 157-158 | toast LOCKED no envio | (sem botão) → lista | (sem botão) → **dashboard** |
| SjtMultiplaEscolhaScreen | 186-187 | sem perguntas | «Voltar ao painel» → lista | «Voltar às avaliações» → lista |
| SjtCasoAbertoScreen | 145 | envio ok (sem botão) | → lista | → lista (inalterado) |
| SjtCasoAbertoScreen | 148-149 | toast LOCKED no envio | (sem botão) → lista | (sem botão) → **dashboard** |
| SjtCasoAbertoScreen | 168-169 | «Sua etapa avançou» (`locked`) | «Voltar ao painel» → lista | «Ir ao painel» → **dashboard** |
| SjtCasoAbertoScreen | 201-202 | sem pergunta | «Voltar ao painel» → lista | «Voltar às avaliações» → lista |
| BigFiveQuestionnaireScreen | 376-377 | toast LOCKED no envio | (sem botão) → lista | (sem botão) → **dashboard** |
| BigFiveQuestionnaireScreen | 414-415 | «Sua etapa avançou» (`autosave.locked`) | «Voltar ao painel» → lista | «Ir ao painel» → **dashboard** |
| BigFiveQuestionnaireScreen | 431-432 | itens indisponíveis | «Voltar ao painel» → lista | «Voltar às avaliações» → lista |
| DevolutivaBigFiveView | 167-170 | devolutiva em preparo / erro | «Voltar ao painel» → lista | «Voltar às avaliações» → lista (frase canônica mantida) |
| DevolutivaBigFiveView | 275-278 | rodapé da devolutiva | «Voltar ao painel» → lista | «Voltar às avaliações» → lista |
| ProvaCognitivaScreen | 217-218 | vaga sem prova (`!optedIn`) | «Voltar ao painel» → dashboard | «Voltar às avaliações» → **lista** |
| ProvaCognitivaScreen | 260-261 | prova registrada | «Voltar ao painel» → dashboard | «Voltar às avaliações» → **lista** |
| ProvaCognitivaScreen | 275-276 | sem itens | «Voltar ao painel» → dashboard | «Voltar às avaliações» → **lista** |
| ProvaCognitivaScreen | 166-169 | 42501 no envio | toast + tela «Prova registrada» com «Voltar ao painel» → dashboard | estado próprio «Sua etapa avançou» + «Ir ao painel» → dashboard |
| AvaliacaoRavenScreen | 153-154 | concluída / já respondeu | «Voltar ao painel» → dashboard | «Ir ao painel» → dashboard |
| AvaliacaoRavenScreen | 168-169 | não liberada | «Voltar ao painel» → dashboard | «Ir ao painel» → dashboard |

O RESEARCH listava redação ×4, SJT MC ×2, caso prático ×3, Big Five ×3 e devolutiva ×2. Todos os sítios estão acima. Nas telas, o «×N» do RESEARCH conta a definição do destino (`:189`, `:141`, `:132`, `:343`) como um sítio. A **devolutiva não tem estado de etapa avançada**, por isso só ganhou «Voltar às avaliações». O **SJT MC não tem tela bloqueada renderizada**, só o toast LOCKED, que agora vai ao dashboard.

## Task Commits

1. **Task 1 (tracer): «Ir ao painel» na lista** — RED `2c9adceb` (test) · GREEN `42adc43a` (feat). Tracer feedback gate: modo interativo, `end-of-phase`, `<verify>` só automatizado. O verify rodou de novo depois do commit (24/24, tsc 89) e a execução seguiu para as tasks seguintes.
2. **Task 2: cinco telas do container** — RED `3468aa6c` (test) · GREEN `9224605b` (fix)
3. **Task 3: prova cognitiva + Raven + guarda** — RED `19fbcc90` (test: guarda + testes de tela) · GREEN `c84715ce` (feat)

### TDD — evidência RED

- **Task 1:** o classificador deu `RED_EVIDENCE_OK` (`target_test_failed`) no alvo «o card do instrumento textual se chama «Prova cognitiva» (D-15)», com o registro em `.red-51-01/task1.json` (expected «Prova cognitiva», actual «Avaliação cognitiva»). O alvo do cabeçalho (`task1-header.json`) recebeu `INVALID_RED / invalid_record` por **formato**: o `tap-flat` do vitest emite sem indentação a mensagem multilinha do testing-library («Unable to find an element by: [data-testid=…]»). Na avaliação semântica, ele falhou pelo motivo planejado (testid ausente). Foram 8 falhas de 14 no RED, todas por testid, rótulo ou export ausentes. O caso «sem onBackToPanel» passa já no RED, de propósito: é contrato de não-regressão.
- **Task 2:** 8/8 falharam no RED por «Unable to find role=button name=…» (rótulo novo ausente). Antes disso, um probe na base com os rótulos antigos mostrou que as telas chegavam a cada estado, ou seja, a falha não era de fixture.
- **Task 3:** o guarda falhou em (i) só nos 2 arquivos cognitivos (as 5 telas já estavam corrigidas). Os testes de tela tiveram 7/7 falhas: heading/rótulo ausentes e, no 42501, «Sua etapa avançou.» ausente porque a tela mostrava «Prova registrada».

## Prova de mordida (D-56) — worktree descartável em `refs/gsd/51-01/base` = `cd92cf42`

Os quatro testes novos/alterados foram copiados para o worktree (`node_modules` por symlink) e rodados lá: **25 falhas, 9 passes, 4 arquivos falhando**. No HEAD, os mesmos arquivos passam 100%. Saída do guarda na base:

```
× (i) nenhuma linha de código diz o rótulo antigo «Voltar ao painel»
  src/features/avaliacao/components/AvaliacaoContainer.tsx:306  Voltar ao painel
  src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx:415  Voltar ao painel
  src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx:432  Voltar ao painel
  src/features/avaliacao/components/DevolutivaBigFiveView.tsx:170  Voltar ao painel
  src/features/avaliacao/components/DevolutivaBigFiveView.tsx:278  Voltar ao painel
  src/features/avaliacao/components/RedacaoEditorScreen.tsx:250  Voltar ao painel
  src/features/avaliacao/components/RedacaoEditorScreen.tsx:287  Voltar ao painel
  src/features/avaliacao/components/RedacaoEditorScreen.tsx:307  Voltar ao painel
  src/features/avaliacao/components/RedacaoEditorScreen.tsx:320  Voltar ao painel
  src/features/avaliacao/components/SjtCasoAbertoScreen.tsx:169  Voltar ao painel
  src/features/avaliacao/components/SjtCasoAbertoScreen.tsx:202  Voltar ao painel
  src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx:187  Voltar ao painel
  src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx:46  voltar: 'Voltar ao painel',
  src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx:90  backToPanel: 'Voltar ao painel',
× (ii) os dois rótulos novos aparecem ao menos uma vez cada
✓ (iii-a/b/c) sanidade (regex casa o antigo, não casa os novos; varredura ≥ 10 arquivos)
```

Na base, o `AvaliacaoContainer.test.tsx` novo falhou em 8 casos: COPY_NAVEGACAO, «Prova cognitiva», os dois testids, o conectado e o WrongEtapaState. O caso FUNIL-08 também falhou, porque o `COGNITIVO_LABEL` dele agora é «Prova cognitiva». Todos os 8 casos do `navegacao-provas` e os 7 do `navegacao-cognitiva` falharam na base. O worktree foi removido (`git worktree list` mostra só o checkout principal).

## Publicação (D-52)

- `npm run build` ok, `assert-chunks PASSED`. O marcador `avaliacao-ir-ao-painel` (e `avaliacao-concluida-ir-ao-painel`, «Voltar às avaliações») está em **`build/assets/index-_4uQIozX.js`**, o chunk eager (as rotas do candidato são estáticas em `routes.tsx`).
- Push por sha, num comando só, com a árvore limpa em `src supabase scripts e2e docs/compliance`: `1650769f..c84715ce -> main`, sem force. Enumeração impressa por `scripts/p50_enumera.cjs`:

```
9a801eb0 planning docs(phase-44): complete phase execution — verificacao passed 7/7 pos-CR-01-bis
d7e3368f planning docs(45): escritura o fecho da fase — 45-06 e 45-11 ganham SUMMARY, ROADMAP 13/13
8c753f32 planning docs(50): revisao do delta pos-verificacao 797c6110
026d3369 planning docs(phase-50): re-verificacao pos-797c6110 — passed 8/8
fde578cd planning docs(51): capture phase context
ef837d63 planning docs(state): record phase 51 context session
e377f192 planning docs(51): research phase domain — JORN-42 mecanismo medido + 12 correcoes de fato
3bafa726 planning docs(phase-51): add validation strategy + operator answers to research fact corrections (D-30..D-38)
61787675 planning docs(51): create phase plan — 15 planos em 12 ondas (Onda A telas/textos, Onda B banco)
7142fbf4 planning docs(51): revise plans after checker iteration 1 — 17 planos em 13 ondas
00c4ac12 planning docs(51): revise plans after checker iteration 2 — mordida do (k) pelo ramo decisao_final, guarda de nomes sensivel a maiuscula
623fc083 planning docs(51): directed revision — MD2 derruba o CHECK de coerencia, runner com SMOKES por smoke (gate interno do p45), mordidas do 51-15 com controle
52270dac planning docs(51): directed revision — 51-13 re-pina o (C3/i) do p45 do arquivo 0004 com a rede (C3/ix) antes, revisao_rejeicao no (z); 51-06 controle offline, <smoke> e capturar da tabela nova; 51-08 (z) por forma
aa0748d8 planning docs(51): micro-round 51-13 — rede (C3/ix) delimita statement pelo primeiro ; fora de literal (sentinela tem 'foi removido;'), controle da fronteira sobre o UPDATE de decisao_final com DEFEITO DA REDE distinto, (6) ancorado, historico da contagem no estatico; MD1 pela mesma regra
2ee5301f planning docs(51): record phase 51 planned — 17 plans / 13 waves, checker passed
cd92cf42 planning docs(51): begin phase 51 execution — STATE focus/head (begin-phase corruption restored by hand: completed_phases, Phase 44 block)
2c9adceb codigo test(51-01): RED — Ir ao painel na lista de avaliacoes e Prova cognitiva no card
42adc43a codigo feat(51-01): tracer — Ir ao painel na lista de avaliacoes (cabecalho, tudo concluido, etapa errada)
3468aa6c codigo test(51-01): RED — telas de prova dizem o destino (Voltar as avaliacoes / Ir ao painel)
9224605b codigo fix(51-01): telas de prova — Voltar as avaliacoes para a lista, Ir ao painel quando a etapa avancou
19fbcc90 codigo test(51-01): RED — guarda por forma dos rotulos do candidato + nomes/destinos da prova cognitiva e do Raven
c84715ce codigo feat(51-01): rotulos da prova cognitiva e do Raven — nomes D-15, destinos D-37
enumeracao ok: 22 commit(s) em 1650769f..c84715ce
```

- Pós-push: `git ls-remote origin refs/heads/main` == HEAD; `git log --oneline origin/main..HEAD` **vazio**. O crawler achou o marcador na primeira tentativa, 90 s depois do push: `PRESENTE em PROD: avaliacao-ir-ao-painel ["/assets/index-_4uQIozX.js"]`. O hash do chunk servido por `https://rh.beautysmile.com.br` é o mesmo do build local.
- **Nenhuma escrita em banco, EF ou migration** neste plano. A única publicação foi o front, pela Vercel.

## Files Created/Modified

- `src/features/avaliacao/components/AvaliacaoContainer.tsx` — `COPY_NAVEGACAO`, `onBackToPanel` (shell + modo de apresentação + injeção no conectado), botões com testid, `WrongEtapaState` «Ir ao painel», card «Prova cognitiva».
- `src/features/avaliacao/components/{RedacaoEditorScreen,SjtCasoAbertoScreen,SjtMultiplaEscolhaScreen,BigFiveQuestionnaireScreen,DevolutivaBigFiveView}.tsx` — `COPY_NAV` local, `backToList` / `goToPanel`.
- `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` — nome, intro sem «raciocínio lógico», destinos D-37, estado `etapaAvancou`, docblock.
- `src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx` — `titulo` e `voltar`.
- `e2e/prova-cognitiva.spec.ts` — heading `/Prova cognitiva/i` (PC-01, PC-02); botão do PC-01 (vaga sem prova) `/Voltar às avaliações/i`.
- `src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts` — guarda novo.
- `src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx` — 8 casos novos; `COGNITIVO_LABEL` = «Prova cognitiva».
- `src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx`, `src/features/avaliacao-cognitiva/components/__tests__/navegacao-cognitiva.test.tsx` — navegação real por rota-sentinela.

## Decisions Made

As escolhas do planejador (1-4) foram seguidas. `ExplicacaoCandidatoPage` e `PrivacidadeCandidatoPage` não mudaram, porque o «Voltar ao painel» delas vai mesmo ao painel, e `e2e/explicacao-flow.spec.ts` ficou intocado. As decisões de execução estão em `key-decisions`. A principal: a regra 2 («Sua etapa avançou» → painel) também vale para o toast LOCKED do envio, que é o mesmo estado em forma transitória.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] O 42501 da prova cognitiva mostrava «Prova registrada»**
- **Found during:** Task 3
- **Issue:** `outcome === 'locked'` fazia `toast.info(etapaAdvanced)` + `setDone(true)`, e a tela ficava no reconhecimento «Prova registrada» de um envio que o servidor recusou. O plano pedia «o estado `etapaAdvanced` ganha botão», mas esse estado não existia como tela.
- **Fix:** estado próprio `etapaAvancou`, com o texto `COPY.etapaAdvanced` e «Ir ao painel» → dashboard. O toast duplicado saiu.
- **Verification:** `navegacao-cognitiva.test.tsx` «Sua etapa avançou (envio bloqueado)» (RED na base, verde no HEAD).
- **Committed in:** `c84715ce`

**2. [Rule 2 - D-37] O toast LOCKED do envio também vai direto ao painel**
- **Found during:** Task 2
- **Issue:** redação, SJT MC, caso prático e Big Five, ao receber LOCKED no envio, mostravam «Sua etapa avançou» e iam à lista, que mostra o bloqueio. É o salto do C-11 por outro caminho.
- **Fix:** `goToPanel()` nesses quatro `catch`. O envio bem-sucedido continua voltando à lista.
- **Committed in:** `9224605b`

**3. [Rule 1 - teste] Testes novos dependiam de `.env.local`**
- **Found during:** Task 3, na prova de mordida
- **Issue:** o `importOriginal` dos serviços carrega o client Supabase real, que lança sem `VITE_SUPABASE_*`. No worktree limpo, os dois arquivos falharam **ao carregar**, não na asserção, e uma falha assim não serve como mordida. A CI fornece placeholders (`ci.yml:48-49`), então a CI não foi afetada.
- **Fix:** `vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))` nos dois arquivos. A mordida foi rodada de novo e passou a falhar pelas asserções.
- **Committed in:** `c84715ce`

**4. [Processo] Commits e testes além do texto do plano**
- O TDD foi feito em dois commits por task, RED (`test`) e GREEN (`feat`/`fix`): 6 commits em vez de 3. O GREEN da Task 3 saiu como `feat(51-01)` e não com o `test(51-01)` que o plano sugeria, porque o commit muda código de tela. O guarda saiu no RED da Task 3. Todos casam o `--assunto` do enumerador.
- Os dois arquivos de teste de tela (`navegacao-provas`, `navegacao-cognitiva`) não estavam em `files_modified`. Eles são a prova de DESTINO do `<behavior>` das Tasks 2 e 3, porque o guarda só vê rótulos. Ambos casam o `--caminhos` do push.
- O plano dizia «8 commits só de `.planning/` à frente de `origin/main`»; eram **16**, todos classificados `planning` pelo enumerador.

---

**Total deviations:** 3 auto-fixed (2 Rule 1, 1 Rule 2) + 1 de processo.
**Impact on plan:** dentro do escopo do D-37/C-11. Nenhuma mudança de banco nem de rota.

## Issues Encountered

- O vitest `--reporter=tap-flat` emite sem indentação as mensagens multilinha do testing-library, o que deixa o TAP malformado para o classificador de RED. A evidência por máquina saiu do alvo de asserção simples. Os demais alvos ficaram com avaliação semântica registrada.

## Known Stubs

Nenhum.

## Deferred / fora do escopo (registrado, não consertado)

- `e2e/prova-cognitiva.spec.ts` foi editado e **não rodou**: ele é gated em `E2E_REAL_LOGIN` e em candidaturas semeadas. Ficou registrado no ledger `WINDOWS.md` #88 (`unrun-verify`).
- O D-15 em outras superfícies fica para os planos seguintes da fase («Avaliação de raciocínio» em `LiberacaoCognitivoBlock.tsx:72`, `useLiberacaoCognitivo.ts:88`, o hub, o e-mail D-31). Este plano aplicou os nomes só nos três arquivos que tocou, como o must_have pede.
- O `etapaAdvanced` diz «suas respostas já estão salvas» mesmo no 42501 da prova cognitiva, que não tem autosave. A redação do texto é anterior a este plano e ficou como estava.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 51-02 (próximo da Onda A, encadeado por `depends_on`): `origin/main` == HEAD, árvore limpa nos caminhos de código.
- Conferência no navegador (D-28) fica para a UAT da fase: coverage D5.

## Self-Check: PASSED

- FOUND: os 3 arquivos criados e o `AvaliacaoContainer.tsx`.
- FOUND em HEAD **e** em `origin/main`: `2c9adceb`, `42adc43a`, `3468aa6c`, `9224605b`, `19fbcc90`, `c84715ce`.
- `git rev-list --count cd92cf42..c84715ce` = 6.
- Verificação do plano no HEAD: `vitest src/__tests__/guards src/features/avaliacao src/features/avaliacao-cognitiva` → 34 arquivos, 232 testes, todos verdes; tsc 89; marcador no `index-*`; crawler PRESENTE.

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-09*
