---
phase: 51-consertos-da-jornada-bloco-3
plan: 02
subsystem: ui
tags: [react, tanstack-query, vitest, rh, hub, scorecard, big-five, sjt, lgpd]

requires:
  - phase: 49
    provides: "ler_resposta_caso_aberto_sjt (49-44, em PROD) + RespostaCasoAbertoSjt; D-53/D-56; scripts/p50_enumera.cjs"
  - phase: 51-01
    provides: "origin/main == HEAD no mesmo checkout (push serializado da Onda A)"
provides:
  - "«N avaliações respondidas» + «Ver respostas» (hub-ver-respostas) logo depois da seção «Avaliação Assíncrona», em qualquer etapa, abrindo o ScorecardAvaliacao no lugar"
  - "linhasDeAvaliacao (tipo sjt/big_five): uma fonte para o N do hub, o estado da seção e o que o detalhe mostra (C-8)"
  - "Big Five no detalhe = «Big Five — Concluído» / «Big Five — Não fez», pela regra de estadoBigFive (D-19, D-32)"
  - "Caso aberto: «Texto do candidato» (RPC ler_resposta_caso_aberto_sjt) ao lado das citações da IA (D-20)"
  - "ScorecardAvaliacao passa a ser montado (o hub é a primeira montagem, C-7)"
affects: [51-03, 51-04, 51-05, JORN-45, verify-work-51]

actuals:
  tokens: 10359
  tasks: 2
  commits: 4
plan_head_before: d63c9900804c2032abe0398d41d963cf67ff1e30
plan_head_after: 99ba6bf299dc7b14897af2b5dd5423144e351440

tech-stack:
  added: []
  patterns:
    - "Bloco irmão do HubSection para caminho que existe em qualquer etapa (molde IN-04), com expandir no lugar useState + useId (molde RespostaCasoAbertoSjt)"
    - "Filtro exportado do componente de detalhe reusado pelo contador — número e detalhe com uma fonte só"
    - "RED pelo componente que JÁ existe (hub inteiro), para a falha ser de asserção e não de módulo ausente"

key-files:
  created:
    - src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx
    - src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx
  modified:
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/features/avaliacao/components/ScorecardAvaliacao.tsx
    - src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx
    - src/features/decisao/components/RespostaCasoAbertoSjt.tsx

key-decisions:
  - "O texto do candidato aparece no card do caso aberto mesmo com a pontuação `falhou` (citações, dimensões e red flags continuam só sem falha): é conteúdo do candidato, não da IA, e o EDGE-PROBE pede caminho até o conteúdo de todo registro anunciado"
  - "Big Five vira UMA linha calculada sobre as linhas filtradas (estadoBigFive), não um card por linha `big_five`; com zero linhas o detalhe mantém «Sem avaliações registradas ainda.» em vez de «Não fez»"
  - "O selo neutro «Contextual · não-eliminatório» fica no card do Big Five (não é nota nem cor); dimensões, faixas e resumo da IA saem"
  - "Rótulo da coluna «Texto do candidato» (exportado como ROTULO_TEXTO_DO_CANDIDATO): não afirma que é o texto avaliado — R1–R4 da migration 20261003000001"
  - "Enquanto carrega ou com erro, o bloco não afirma número (a seção acima já mostra o estado); o botão fica sempre"

patterns-established:
  - "Prova de mordida reaproveitada do 51-01: worktree descartável em refs/gsd/51-02/base + node_modules por symlink + testes do HEAD copiados"

requirements-completed: [JORN-45]

coverage:
  - id: D1
    description: "Hub do RH: «N avaliações respondidas» + «Ver respostas» depois da seção «Avaliação Assíncrona», em qualquer etapa; detalhe só monta depois do clique; aria-expanded/aria-controls; «disponíveis para revisão» saiu"
    requirement: JORN-45
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx"
        status: pass
      - kind: other
        ref: "crawler PROD: hub-ver-respostas em /assets/PerfilCandidatoRHPage-BXo3zA4t.js (chunk lazy) de https://rh.beautysmile.com.br"
        status: pass
    human_judgment: false
  - id: D2
    description: "C-8: N, estado da seção e detalhe usam linhasDeAvaliacao (sjt + big_five); entrevista/redação não entram no N nem viram card de caso aberto"
    requirement: JORN-45
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx#só entrevista/redação: a seção usa a contagem FILTRADA (sem dados) e o detalhe não inventa card"
        status: pass
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx#é exportada e devolve só as linhas sjt e big_five"
        status: pass
    human_judgment: false
  - id: D3
    description: "Big Five no detalhe: «Concluído» / «Não fez», sem faixa, dígito, dimensão ou resumo da IA (D-19, D-32, T-51-05)"
    requirement: JORN-45
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx#com linha big_five: diz «Concluído» e nada que leia como nota (faixa, dígito, resumo da IA)"
        status: pass
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx#sem linha big_five: a linha do Big Five diz «Não fez»"
        status: pass
    human_judgment: false
  - id: D4
    description: "Caso aberto: texto integral do candidato ao lado das citações, como nó de texto (<b> literal), estados da RPC (D-20, T-51-04)"
    requirement: JORN-45
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx#o texto com marcação aparece LITERAL, nunca como HTML (T-51-04)"
        status: pass
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx#mostra as citações E o texto do candidato, lido pela RPC da candidatura"
        status: pass
      - kind: other
        ref: "grep -c dangerouslySetInnerHTML src/features/avaliacao/components/ScorecardAvaliacao.tsx = 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "Conferência no navegador (D-28): leitura do bloco no hub real, as duas colunas citações/texto em md: e empilhadas no estreito, e a contagem repetida dentro e fora da seção em com_dados"
    requirement: JORN-45
    verification: []
    human_judgment: true
    rationale: "Layout, contraste do texto âmbar dentro do card do scorecard e a leitura da contagem duplicada não são assertáveis por teste unitário; e o texto integral em PROD depende de uma sessão de RH real (RPC com guarda de papel)"

duration: 3h (relógio; ~2h35 de sessão parada entre a Task 1 e a Task 2)
completed: 2026-10-09
status: complete
---

# Phase 51 Plan 02: «Ver respostas» no hub do RH (JORN-45) Summary

**O hub do RH diz quantas avaliações o candidato respondeu (só SJT e Big Five, a mesma função que decide o detalhe) e ganhou «Ver respostas», que abre ali mesmo o `ScorecardAvaliacao` — montado pela primeira vez. No detalhe, o Big Five diz só «Concluído»/«Não fez» e o caso aberto mostra o texto integral do candidato ao lado das citações da IA. Publicado e servido em PROD no chunk lazy `PerfilCandidatoRHPage-BXo3zA4t.js`.**

## Performance

- **Duration:** 3h de relógio. Task 1 durou ~20 min e a Task 2 com a publicação, ~10 min. Entre as duas a sessão ficou parada (commits 21:30 → 00:07 -03:00).
- **Started:** 2026-10-09T00:11:03Z
- **Completed:** 2026-10-09T03:13Z
- **Tasks:** 2 (4 commits: RED + GREEN por task)
- **Files modified:** 6 (2 criados, 4 editados)
- **tsc (D-53):** baseline medida = **89**; 89 ao fim de cada task (teto 90).

## Accomplishments

- `AvaliacoesRespondidasBloco` (novo) é irmão do `HubSection` «Avaliação Assíncrona», no molde do IN-04. Mostra «N avaliação(ões) respondida(s)» ou «Nenhuma avaliação respondida ainda.» e o botão «Ver respostas» / «Ocultar respostas» (`hub-ver-respostas`, `aria-expanded`, `aria-controls` por `useId`). O `ScorecardAvaliacao` só monta com `aberto`. O bloco usa a mesma query do hub (mesma chave), sem pedido novo.
- `linhasDeAvaliacao` (exportada em `ScorecardAvaliacao.tsx`) filtra `tipo IN ('sjt','big_five')`. O filtro vale **antes** do vazio e do despacho no detalhe, no N do bloco, no `<p>` da seção e no `estado` da seção. Uma candidatura com só entrevista/redação agora mostra a seção «Sem dados nesta etapa». Antes, mostrava «2 registro(s) … disponíveis para revisão».
- O Big Five virou uma linha só, «Big Five — Concluído» / «Big Five — Não fez», por `estadoBigFive`. `BigFiveBreakdown`, `BIGFIVE_BANDA_LABEL` e `BIGFIVE_DIM_LABEL` foram apagados (o grep em `src/` não achou outro uso).
- No caso aberto, a coluna «Texto do candidato» (`RespostaCasoAbertoConteudo`, agora export nomeado) fica ao lado das citações: duas colunas em `md:`, empilhadas no celular. Os quatro estados da RPC vêm do componente reusado.
- O cabeçalho «⚠ NÃO MONTADO» foi reescrito. A Decisão Final ficou igual (C-7).

## Task Commits

1. **Task 1 (tracer): «Ver respostas» no hub** — RED `ee944be8` (test) · GREEN `14394528` (feat). Gate do tracer: modo interativo, `end-of-phase`, `<verify>` só automatizado. O verify rodou de novo depois do commit (11 arquivos, 93 testes verdes; tsc 89) e a execução seguiu.
2. **Task 2: detalhe certo + publicação** — RED `51a10d93` (test) · GREEN `99ba6bf2` (fix)

### TDD — evidência RED

- **Task 1:** `RED_EVIDENCE_OK` (`target_test_failed`) no alvo «é exportada e devolve só as linhas sjt e big_five». O registro está em `.red-51-02/task1.json` (expected: função; actual: `undefined`). No arquivo inteiro, os 8 casos falharam por asserção: export ausente, testid ausente, cópia nova ausente, seção ainda `com_dados`. Duas das primeiras falhas eram do próprio teste («Found multiple elements»: o vazio «futuro»/«sem dados» se repete em outras seções). Corrigi escopando as duas na seção antes do commit RED.
- **Task 2:** `RED_EVIDENCE_OK` no alvo «com linha big_five: diz «Concluído»…», registro em `.red-51-02/task2.json`. O actual impresso é o card antigo com «Muito alto»/«Muito baixo» e o resumo da IA. Os 5 casos novos falharam. O UX-07 e os 5 do 49-41 passaram (são não-regressão).
- Formato: o `tap-flat` do vitest quebra o TAP com as mensagens multilinha do testing-library, o mesmo problema do 51-01. Por isso o alvo da Task 2 abre com `expect(container.textContent).toContain(…)`, uma mensagem de linha única, e foi filtrado por `-t dígito`. O `getByText` seguinte continua no teste.

## Prova de mordida (D-56) — worktree descartável em `refs/gsd/51-02/base` = `d63c9900`

`ScorecardAvaliacao.test.tsx` e `hubVerRespostas.test.tsx` do HEAD foram copiados para o worktree, com `node_modules` por symlink. Resultado: **13 falhas, 6 passes, os 2 arquivos falhando, nenhuma falha de carga**. No HEAD, os mesmos arquivos passam 100%.

```
ScorecardAvaliacao.test.tsx (base)
  passed | não renderiza nenhum percentil cru nas rows Big Five
  failed | com linha big_five: diz «Concluído» …   | AssertionError: expected 'Perfil comportamental (Big Five)Conte…' to contain 'Big Five — Concluído'
  failed | sem linha big_five: … «Não fez»          | Unable to find an element with the text: Big Five — Não fez
  failed | mostra as citações E o texto do candidato | Unable to find an element with the text: Texto do candidato
  failed | o texto com marcação aparece LITERAL     | Unable to find an element with the text: antes <b>negrito</b> depois
  failed | sem resposta enviada: …                  | Unable to find an element with the text: Texto do candidato
  passed | (5 casos do 49-41)
hubVerRespostas.test.tsx (base)
  failed | é exportada e devolve só as linhas sjt e big_five | expected 'undefined' to be 'function'
  failed | anuncia «3 avaliações respondidas» …              | Unable to find … 3 avaliações respondidas
  failed | o botão existe com aria-expanded=false …          | Unable to find … [data-testid="hub-ver-respostas"]
  failed | depois do clique: …                               | idem
  failed | em etapa ANTERIOR à avaliação …                   | idem
  failed | singular …                                        | Unable to find … 1 avaliação respondida
  failed | zero linhas …                                     | Unable to find … Nenhuma avaliação respondida ainda.
  failed | só entrevista/redação …                           | Unable to find … Sem dados nesta etapa
```

O portão que fixava as faixas foi trocado. Na base ele **reprova** o card com faixas, ou seja, continua mordendo. Worktree removido (`git worktree list` mostra só o checkout principal).

## Publicação (D-52)

- `npm run build` ok, `assert-chunks PASSED` (52 chunks). O `hub-ver-respostas`, o «Texto do candidato» e o «Big Five — Concluído» estão em **`build/assets/PerfilCandidatoRHPage-BXo3zA4t.js`**, chunk lazy de `/rh/*`, não `index-*`.
- O push foi por sha, num comando só, com a árvore limpa em `src supabase scripts e2e docs/compliance p46apply.cjs efdeploy.cjs database.types.ts`: `c84715ce..99ba6bf2 -> main`, sem force. Enumeração de `scripts/p50_enumera.cjs`:

```
e9ed5254 planning docs(51-01): complete navegacao do candidato plan — SUMMARY, evidencia RED, WINDOWS #88
d63c9900 planning docs(51-01): STATE/ROADMAP — 51-01 concluido, 1/17 (gsd-tools corrupcao restaurada a mao: completed_phases 17->9, status, bloco historico da Phase 44)
ee944be8 codigo test(51-02): RED — Ver respostas no hub, contagem filtrada e linhasDeAvaliacao
14394528 codigo feat(51-02): tracer — Ver respostas no hub, detalhe expandido no lugar e contagem filtrada
51a10d93 codigo test(51-02): RED — Big Five concluido/nao fez sem faixa e texto integral ao lado das citacoes
99ba6bf2 codigo fix(51-02): detalhe do hub — Big Five concluido ou nao fez e texto integral ao lado das citacoes
enumeracao ok: 6 commit(s) em c84715ce..99ba6bf2
```

- Depois do push: `git ls-remote origin refs/heads/main` == HEAD e `git log --oneline origin/main..HEAD` **vazio**. O crawler deu **AUSENTE** na 1ª tentativa, logo após o push (Vercel ainda publicando), e **PRESENTE** na 2ª, 2 minutos depois: `PRESENTE em PROD, chunk lazy: hub-ver-respostas ["/assets/PerfilCandidatoRHPage-BXo3zA4t.js"]`. O hash é o mesmo do build local.
- **Nenhuma escrita em banco, EF ou migration.** O D-21 não disparou (D-38/C-6): o texto vem da RPC que já está em PROD. A única publicação foi o front, pela Vercel.

## Files Created/Modified

- `src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx`: bloco novo, `COPY_AVALIACOES_RESPONDIDAS`.
- `src/features/hub-candidato/components/HubCandidatoRH.tsx`: contagem filtrada, cópia D-18 e montagem do bloco como irmão. O comentário do `LiberacaoCognitivoBlock` não foi mexido.
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx`: `linhasDeAvaliacao`, `BigFiveEstado` + `COPY_BIG_FIVE_ESTADO`, `ROTULO_TEXTO_DO_CANDIDATO`, texto ao lado das citações e cabeçalho reescrito.
- `src/features/decisao/components/RespostaCasoAbertoSjt.tsx`: `export` em `RespostaCasoAbertoConteudo`, e nada mais.
- `src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx`: as faixas viraram «Concluído»; entraram «Não fez» e o texto integral; render dentro de `QueryClientProvider`; mock do client Supabase e de `getRespostaCasoAbertoSjt`.
- `src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx`: teste novo, pelo hub inteiro.

## Decisions Made

As escolhas do planejador (1–5) foram seguidas. As decisões de execução estão em `key-decisions`. As duas que mudam o que o RH vê:

1. O texto do candidato aparece mesmo quando a pontuação falhou.
2. O Big Five virou uma linha calculada, e não um card por linha.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - teste] Duas asserções do RED eram ambíguas**
- **Found during:** Task 1, no RED
- **Issue:** `getByText('Etapa ainda não iniciada')` e `getByText('Sem dados nesta etapa')` casavam várias seções do hub («Found multiple elements»). Era falha do teste, não da feature.
- **Fix:** helper `secaoAssincrona()` (heading → seção) e `within(...)`. Feito antes do commit RED.
- **Committed in:** `ee944be8`

**2. [Rule 3 - bloqueio] O caso aberto passou a usar `useQuery`, e os testes antigos não tinham provider**
- **Found during:** Task 2
- **Issue:** os 5 casos do 49-41 renderizavam sem `QueryClientProvider`. Com o texto integral no card, eles quebrariam por fixture, não por regressão.
- **Fix:** `render` local que embrulha em `QueryClientProvider`, mais `vi.mock('@/lib/supabase/client')` e `getRespostaCasoAbertoSjt` mockado (padrão `sem_resposta_enviada`). Os 5 casos continuam verdes, inalterados no conteúdo.
- **Committed in:** `51a10d93`

**3. [Processo] Commits por task e arquivos**
- O TDD foi feito com RED (`test`) e GREEN por task, como no 51-01: 4 commits em vez de 2. Por isso o critério «`git show --stat HEAD` lista os quatro arquivos» da Task 1 se cumpre na soma `ee944be8` + `14394528` (1 + 3 arquivos), e não num commit só. O GREEN da Task 2 tem o assunto exato do plano. O arquivo de teste dela foi no RED.

---

**Total deviations:** 2 auto-fixed (1 Rule 1 de teste, 1 Rule 3) + 1 de processo.
**Impact on plan:** nenhum fora do escopo. Nenhuma mudança de banco, rota ou acesso.

## Issues Encountered

- O `tap-flat` quebra com as mensagens multilinha do testing-library (já registrado no 51-01). Contornei escolhendo um alvo de asserção de linha única e filtrando um caso só por `-t`.
- O crawler pegou a Vercel ainda publicando na 1ª tentativa. Na 2ª, o marcador já estava no ar.

## Known Stubs

Nenhum.

## Deferred / fora do escopo (registrado, não consertado)

- `src/features/entrevista/components/CognitivoBandCard.tsx:16` tem `@see … ScorecardAvaliacao.tsx (BigFiveBreakdown CONTEXTUAL badge)`, e `src/components/ScoreCard.tsx:43` cita `ScorecardAvaliacao.tsx:246-275`. As duas referências de comentário ficaram velhas: o `BigFiveBreakdown` saiu, mas o selo «Contextual · não-eliminatório» continua no card do Big Five. Os dois arquivos estão fora de `files_modified`.
- Em `com_dados`, a contagem aparece duas vezes: no `<p>` da seção (D-18, pedido pelo plano) e no bloco logo abaixo (o caminho que o D-17 exige em toda etapa). Vale conferir no navegador na UAT (coverage D5).
- R4 da migration 20261003000001 é residual latente. Se uma candidatura tiver duas linhas `sjt/caso_aberto`, os dois cards mostram o mesmo texto, porque a RPC devolve um texto por candidatura. Hoje há 0 casos, medido pelo revisor do 49-44.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 51-03 (próximo da Onda A): `origin/main` == HEAD e árvore limpa nos caminhos de código.
- A conferência no navegador (D-28) fica para a UAT da fase, coverage D5.

## Self-Check: PASSED

- FOUND: `AvaliacoesRespondidasBloco.tsx`, `hubVerRespostas.test.tsx`, `.red-51-02/task1.json`, `.red-51-02/task2.json`.
- FOUND em HEAD **e** em `origin/main`: `ee944be8`, `14394528`, `51a10d93`, `99ba6bf2`.
- `git rev-list --count d63c9900..99ba6bf2` = 4.
- Verificação do plano no HEAD: `vitest src/features/avaliacao src/features/hub-candidato src/features/decisao src/__tests__/guards` deu 50 arquivos e 384 testes, todos verdes. tsc 89. Marcador no chunk lazy, no build e em PROD.

---
*Phase: 51-consertos-da-jornada-bloco-3*
*Completed: 2026-10-09*
