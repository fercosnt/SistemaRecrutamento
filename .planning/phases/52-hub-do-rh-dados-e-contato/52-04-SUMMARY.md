---
phase: 52-hub-do-rh-dados-e-contato
plan: 04
subsystem: ui
tags: [react, tanstack-query, useQueries, vitest, candidato, painel, avaliacao, d-27]

requires:
  - phase: 52-01
    provides: "arnês da fase (p52_tipografia.cjs, base refs/gsd/52/base)"
  - phase: 51
    provides: "AvaliacaoContainer com «Ir ao painel» por callback injetado; get_avaliacao_status com guarda de titular; marcarInstrumentoRegistrado"
provides:
  - "deriveCards, avaliacoesConcluidas e avaliacaoQueryOptions exportados de AvaliacaoContainer.tsx (allDone usa avaliacoesConcluidas)"
  - "hook useIdsAvaliacoesConcluidas (src/features/avaliacao/hooks/), useQueries das duas chaves do container"
  - "painel do candidato: «Avaliações concluídas — aguardando a equipe» no span neutro herdado e selo «Aguardando a equipe», sem escrita no banco"
  - "«Ver devolutiva» (COPY_VER_DEVOLUTIVA) no card big_five concluído e no «Tudo concluído», por callback injetado onVerDevolutiva"
affects: [52-UAT, painel do candidato, lista de avaliações, devolutiva Big Five]

actuals:
  tokens: 9467
  tasks: 2
  commits: 4
plan_head_before: 31c17cc9a81205ddb570b9f7d60ebd84e322d7ec
plan_head_after: e3c074b4bc46b5b93ca904252deff41162b1e810

tech-stack:
  added: []
  patterns:
    - "Estado novo entregue às linhas herdadas pelos DADOS (statusInfo/stepCTA), nunca por markup copiado — mantém a varredura tipográfica verde sem afrouxá-la"
    - "Hook com useQueries em módulo próprio, mockado pelo caminho nos testes que montam a página sem QueryClientProvider"
    - "Prova de não-escrita com o serviço REAL sobre cliente Supabase espião (escrita = spy; leitura real provada para não ser vácuo)"

key-files:
  created:
    - src/features/avaliacao/hooks/useIdsAvaliacoesConcluidas.ts
    - src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx
  modified:
    - src/features/avaliacao/components/AvaliacaoContainer.tsx
    - src/components/pages/DashboardCandidatoPage.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.navbar.test.tsx
    - src/components/pages/__tests__/DashboardCandidatoPage.reaberta.test.tsx
    - src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx

key-decisions:
  - "52-04: a chave de status em avaliacaoQueryOptions é literal (['avaliacao','status',id]), NÃO importada de avaliacaoStatusKey — importar quebraria todo teste que mocka useStatusRavenCandidato só com o hook (inclusive o novo concluidas.test)"
  - "52-04: o hook só considera candidaturas em avaliacao_assincrona e não encerradas; carregando/erro ⇒ fora do conjunto ⇒ CTA de hoje (D-52-U16)"
  - "52-04: o alias legado `bigfive` conta como Big Five para o «Ver devolutiva» (o mesmo que testeLabel/handleOpenTeste já fazem)"

patterns-established:
  - "D-27 por dados: SELO_AGUARDANDO_EQUIPE via statusInfo e { label, destino: null } via stepCTA alimentam o selo e o span neutro herdados"

requirements-completed: [JORN-59]

coverage:
  - id: D1
    description: "Painel do candidato: candidatura em avaliacao_assincrona com todas as avaliações concluídas mostra «Avaliações concluídas — aguardando a equipe» no «Próximo passo», sem botão, e o selo «Aguardando a equipe» neutro; nada escrito no banco"
    requirement: "JORN-59"
    verification:
      - kind: unit
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx#todas concluídas → a frase no «Próximo passo», nenhum botão, selo «Aguardando a equipe»; nada escrito"
        status: pass
      - kind: unit
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx#uma avaliação pendente → o CTA de hoje"
        status: pass
      - kind: unit
        ref: "src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx#status carregando / status em erro → o CTA de hoje (D-52-U16)"
        status: pass
    human_judgment: true
    rationale: "Na vaga Consultor (fdbe1a4a) o estado só fica observável depois do banco de pré-vendas do bloco C (achado F7); a quebra de linha a 360px não é medível em jsdom (o teste só prova ausência de truncate/whitespace-nowrap). A UAT da 52 precisa ver o painel real."
  - id: D2
    description: "Os quatro testes que já montavam o painel seguem verdes só com o vi.mock do hook acrescentado (nenhuma asserção mudada)"
    requirement: "JORN-59"
    verification:
      - kind: other
        ref: "gate do harness do plano (git diff refs/gsd/52/base -U0 nos quatro arquivos) → HARNESS OK: 4/4 so acrescimo"
        status: pass
    human_judgment: false
  - id: D3
    description: "«Ver devolutiva» no card do Big Five concluído e no «Tudo concluído» (acima de «Ir ao painel»), navegando para /candidato/avaliacao/:id/bigfive/devolutiva; sem callback, nenhum botão"
    requirement: "JORN-59"
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx#AvaliacaoContainer — «Ver devolutiva» do Big Five (52-04 / pendência f)"
        status: pass
    human_judgment: true
    rationale: "Pendência (f) do UAT da 51 — o operador precisa confirmar na tela real que o caminho de volta à devolutiva existe e leva à devolutiva certa."

duration: 7min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 04: Painel «avaliações concluídas» e «Ver devolutiva» Summary

**O painel do candidato diz «Avaliações concluídas — aguardando a equipe», sem botão, quando todas as avaliações estão concluídas. Ele lê pela mesma regra e pelas mesmas chaves de cache do `AvaliacaoContainer`, por um hook `useQueries` em módulo próprio, e não escreve nada no banco. O card do Big Five concluído e o «Tudo concluído» ganham «Ver devolutiva».**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-10-11T04:10:19Z
- **Completed:** 2026-10-11T04:17:16Z
- **Tasks:** 2 (Task 1 tracer + TDD; Task 2 TDD)
- **Files modified:** 9 (2 criados, 7 modificados)

## Accomplishments

- `AvaliacaoContainer.tsx` agora exporta `deriveCards`, `avaliacoesConcluidas` e `avaliacaoQueryOptions`. O `allDone` da lista chama `avaliacoesConcluidas`, então a regra existe num lugar só. O container consome `avaliacaoQueryOptions` sem mudar chave nem função de serviço.
- Hook novo, `useIdsAvaliacoesConcluidas`, em módulo próprio. Para cada candidatura em `avaliacao_assincrona` e não encerrada, ele faz um `useQueries` das duas chaves do container. Devolve o `Set` das candidaturas cujas duas leituras deram certo e cujos cards estão todos concluídos.
- Painel: a frase chega ao span neutro herdado por `stepCTA` com `destino: null`, e o selo herdado recebe `SELO_AGUARDANDO_EQUIPE` por `statusInfo`. Nenhum markup foi copiado. As únicas linhas existentes que mudaram foram `statusInfo`, `stepCTA` e a abertura do div do «Próximo passo» (só ganhou o `data-testid="painel-proximo-passo"`). Fora isso, só imports e constantes foram acrescentados.
- «Ver devolutiva» aparece no card `big_five` concluído e no «Tudo concluído», acima do «Ir ao painel». O botão só existe quando há callback `onVerDevolutiva`. O `ConnectedAvaliacaoContainer` injeta a rota `/candidato/avaliacao/${candidaturaId}/bigfive/devolutiva`, e o shell segue render puro.

## Task Commits

1. **Task 1 (tracer): painel lê o status e diz «concluídas»**
   - `eb1b5f25` test(52-04): testes vermelhos (RED)
   - `c5ab73b2` feat(52-04): painel do candidato diz «avaliacoes concluidas» sem mudar o banco (D-27) (GREEN; inclui os quatro `vi.mock` do harness)
2. **Task 2: «Ver devolutiva»**
   - `badbf26a` test(52-04): testes vermelhos (RED)
   - `e3c074b4` feat(52-04): devolutiva do Big Five reabrivel a partir do card concluido (GREEN)

## TDD

**RED, Task 1:** o alvo foi `DashboardCandidatoPage — avaliações concluídas (52-04 / D-27) > todas concluídas → …`. O classificador deu `RED_EVIDENCE_OK` (`target_test_failed`) sobre o relatório JUnit da execução (`NO_COLOR=1 DEBUG_PRINT_LIMIT=0 npx vitest run … --reporter=junit`). **Avaliação semântica:** o arquivo carregou, a página montou e o alvo falhou na primeira asserção planejada, `Unable to find an element by: [data-testid="painel-proximo-passo"]` (o rodapé ainda não tinha o testid nem o estado). Os outros três casos falharam por asserção de espera: a query `['avaliacao','status',id]` nunca existiu, porque a página ainda não chamava o hook. Não houve erro de import, sintaxe ou fixture.

**RED, Task 2:** o alvo foi `AvaliacaoContainer — «Ver devolutiva» do Big Five … > modo conectado: card do Big Five concluído → …`, com `RED_EVIDENCE_OK` via JUnit (21 testes, 4 falhas, 17 passam). **Avaliação semântica:** o card do Big Five renderizou como «Concluído» e o alvo falhou na asserção planejada, `Unable to find an element by: [data-testid="avaliacao-ver-devolutiva"]`. As outras três falhas foram `COPY_VER_DEVOLUTIVA` indefinido, o «Tudo concluído» sem o botão e o apresentacional com callback sem o botão. Os três casos negativos (pendente, «Tudo concluído» sem Big Five e apresentacional sem callback) passaram já no RED. Isso é esperado: eles provam ausência, e o GREEN não podia fazê-los reprovar.

**GREEN:** os dois `feat` acima. Não houve REFACTOR.

## Prova de mordida da proibição de escrita (D-27)

Plantei à mão no hook, sem commitar, um `import { supabase } from '@/lib/supabase/client'` e, no ramo das concluídas, `void supabase.from('candidaturas').update({ status: 'em_analise' }).eq('id', id)`. Resultado de `npx vitest run …concluidas.test.tsx`:

```
× todas concluídas → a frase no «Próximo passo», nenhum botão, selo «Aguardando a equipe»; nada escrito
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
Tests  1 failed | 3 passed (4)
```

Desfiz as duas mudanças à mão, com Edit (sem `git checkout`/`git stash`). `cmp` contra a cópia de antes do plantio deu igual byte a byte, e a suíte voltou a 89/89.

## Verificação

| Gate | Resultado |
|---|---|
| `npx vitest run src/components/pages/__tests__ src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx` (Task 1) | 10 arquivos, 89/89 verdes (eram 85 antes do plano; +4 do teste novo) |
| Gate do harness (Task 1, comando do plano verbatim) | `+8 -0` em cada um dos quatro arquivos; `HARNESS OK: 4/4 so acrescimo` |
| lint (`npm run -s lint`) | exit 2, **89** `error TS` (a baseline; teto 90). No RED da Task 2 foram 93, por causa da prop e do export ainda inexistentes; voltou a 89 no GREEN |
| `npx vitest run src/features/avaliacao src/components/pages/__tests__ src/__tests__/guards` (Task 2) | 56 arquivos, 455/455 verdes |
| `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- AvaliacaoContainer.tsx DashboardCandidatoPage.tsx useIdsAvaliacoesConcluidas.ts` | `TIPOGRAFIA OK (198 linhas acrescentadas varridas)`; `--auto-teste` ok (16 casos) |
| `git diff refs/gsd/52/base -U0 -- DashboardCandidatoPage.tsx` | nenhuma linha acrescentada com `font-medium` ou `text-xs`. As linhas removidas são só `statusInfo`, `stepCTA` e a abertura do div `:454` |
| Suíte inteira (`npx vitest run`) | 2845/2847. As 2 falhas são as reds de baseline em `promessasComExecutor.test.ts` |
| `npm run build` | ok. Os marcadores `painel-proximo-passo` e `avaliacao-ver-devolutiva` estão em `build/assets/index-*.js` (chunk eager) |

**Gate do tracer (Task 1):** a execução é interativa (`auto_advance=false`), no `human_verify_mode` padrão (`end-of-phase`), e o `<verify>` do tracer só tem `<automated>`. Rodei o verify de novo sobre o estado commitado, ele ficou verde, e a execução seguiu para a Task 2 sem checkpoint.

## Files Created/Modified

- `src/features/avaliacao/hooks/useIdsAvaliacoesConcluidas.ts`: hook novo. O docblock explica por que ele mora fora da página.
- `src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx`: os quatro casos do `<behavior>`. O `avaliacaoService` é o real, e quem é mockado é `@/lib/supabase/client` (cliente espião em `vi.hoisted`).
- `src/features/avaliacao/components/AvaliacaoContainer.tsx`: exports da regra e das queries, `onVerDevolutiva` no shell e nas props públicas, `COPY_VER_DEVOLUTIVA` e a rota injetada pelo modo conectado.
- `src/components/pages/DashboardCandidatoPage.tsx`: `COPY_PAINEL_AVALIACOES` (exportado), `SELO_AGUARDANDO_EQUIPE`, chamada do hook no topo, `statusInfo`/`stepCTA` condicionados e `data-testid`.
- `DashboardCandidatoPage.{funnel,encerrada,navbar,reaberta}.test.tsx`: só o `vi.mock` do hook, 8 linhas acrescentadas em cada.
- `src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx`: `describe` novo com 7 casos, só acréscimo (mais `COPY_VER_DEVOLUTIVA` no import existente).

## Decisions Made

- A chave de status em `avaliacaoQueryOptions` ficou literal. Ela não usa `avaliacaoStatusKey`, a fábrica que já existe em `useStatusRavenCandidato.ts`. Experimentei importá-la, mas os testes que mockam aquele módulo com uma fábrica que só exporta o hook (o `concluidas.test` novo, e potencialmente outros) quebrariam com «No export defined on the mock». O plano pedia a chave literal e o docblock registra o porquê.
- O alias legado `bigfive` conta como Big Five para o «Ver devolutiva», como `testeLabel` e `handleOpenTeste` já tratam.

## Deviations from Plan

None - plan executed exactly as written.

A tentativa com `avaliacaoStatusKey` acima foi desfeita antes de qualquer commit e não chegou ao código entregue. Os `test(52-04)` da Task 2 são o commit RED exigido por `tdd="true"`; o plano só nomeava o `feat`.

## Issues Encountered

- Nenhum bloqueio.
- Fica para a UAT: o estado concluído só é observável em PROD na vaga Consultor depois do banco de pré-vendas do bloco C (F7), como o plano registra. A quebra de linha a 360px não é medida em jsdom: o teste só prova que o span não tem `truncate` nem `whitespace-nowrap`.
- Custo de leitura: o painel faz agora duas leituras por candidatura em `avaliacao_assincrona` (contexto, que inclui `perguntas` quando a vaga tem bateria, e status). Elas vêm do cache compartilhado com a lista de avaliações e respeitam o `staleTime` global.

## Threat Flags

Nenhuma superfície nova. T-52-07 foi mitigado pelo teste com o serviço real sobre o cliente espião (zero `update`/`insert`/`upsert`/`delete`/`functions.invoke`, `rpc` só `get_*`, leitura real provada), e a mordida foi provada acima. T-52-08 (accept) não mudou: o painel reusa as RPCs do container, que já têm a guarda de titular. T-52-SC: nenhuma instalação.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- O código está pronto e **não foi enviado** (sem push, conforme a regra do despacho). Antes da UAT, o front sai pela Vercel com push no `main`. Conferir `git log --oneline origin/main..HEAD` e o marcador no `index-*`.
- Não há migration nem escrita em PROD neste plano.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- FOUND: src/features/avaliacao/hooks/useIdsAvaliacoesConcluidas.ts
- FOUND: src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx
- FOUND: eb1b5f25, c5ab73b2, badbf26a, e3c074b4 (ancestrais de HEAD)
