---
phase: 52-hub-do-rh-dados-e-contato
plan: 11
subsystem: ui
tags: [react, tanstack-query, vitest, big-five, sjt, rh-hub, ux-07, rnf-07a]

requires:
  - phase: 52-01
    provides: "refs/gsd/52/base, scripts/p52_tipografia.cjs (harness da fase)"
  - phase: 52-08
    provides: "contrato das RPCs ler_devolutiva_bigfive_rh e ler_sjt_mc_rh (migration 20261011000001, ensaiada, NAO aplicada)"
provides:
  - "src/features/avaliacao/lib/bigFiveRotulos.tsx — DIM_LABEL, DIM_ORDER, BANDA_LABEL, BANDA_ORDER, BandaSegments, analogia (uma cópia, devolutiva do candidato + hub)"
  - "avaliacoesRhService: lerDevolutivaBigFiveRh, lerSjtMcRh, AvaliacoesRhServiceError, avaliacoesRhKeys (cast confinado até o db:types do 52-15)"
  - "BigFiveResultadoHub + COPY_BIG_FIVE_HUB — faixas da devolutiva, aviso fixo, devolutiva recolhível, sem número da escala"
  - "SjtMcDetalhe + COPY_SJT_MC_HUB + ROTULO_TAG_SJT — situação, alternativas em ordem neutra, escolhida com etiqueta pt-BR só nela"
  - "ScorecardAvaliacao: big_five -> BigFiveResultadoHub, sjt/mc -> SjtMcDetalhe; McBreakdown removido; marcador e selo em text-sm"
  - "guarda src/__tests__/guards/p52-ban-percentil-bigfive-hub.grep.test.ts"
affects: [52-12, 52-15, 52-23, 52-25]

actuals:
  tokens: 22500
  tasks: 2
  commits: 4
plan_head_before: 90241f827c713c4dade75fe33b4f68b2ce48f887
plan_head_after: 61375deff26cea6126b74d5c62a1af2d21b0d558

tech-stack:
  added: []
  patterns:
    - "Projeção explícita no serviço para tipo estreito (campo extra da rede descartado antes da tela)"
    - "Slot ReactNode (marcadorRevisao) para reusar um elemento do pai sem ciclo de import"

key-files:
  created:
    - src/features/avaliacao/lib/bigFiveRotulos.tsx
    - src/features/avaliacao/services/avaliacoesRhService.ts
    - src/features/avaliacao/services/__tests__/avaliacoesRhService.test.ts
    - src/features/avaliacao/components/BigFiveResultadoHub.tsx
    - src/features/avaliacao/components/__tests__/BigFiveResultadoHub.test.tsx
    - src/features/avaliacao/components/SjtMcDetalhe.tsx
    - src/features/avaliacao/components/__tests__/SjtMcDetalhe.test.tsx
    - src/__tests__/guards/p52-ban-percentil-bigfive-hub.grep.test.ts
  modified:
    - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
    - src/features/avaliacao/components/ScorecardAvaliacao.tsx
    - src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx

key-decisions:
  - "SjtMcDetalhe recebe o marcador de revisão por slot opcional `marcadorRevisao` (ReactNode): importar RevisaoHumanaMarker do ScorecardAvaliacao fecharia um ciclo, e o portão de tipografia do 52-11 exige que o marcador continue definido em ScorecardAvaliacao.tsx"
  - "ScoreValue foi para SjtMcDetalhe (único consumidor depois que o McBreakdown saiu), com «/ max» e «—» em text-white/70 em vez de /50 (UI-SPEC §Color: nada em /50 autorado nesta fase)"
  - "COPY_BIG_FIVE_ESTADO.nao_fez passa a apontar para COPY_BIG_FIVE_HUB.naoFez — um literal só; sem linha big_five o ScorecardAvaliacao segue usando o BigFiveEstado (o card «Não fez» que o plano manda manter)"
  - "`sem_big_five` vindo da RPC quando a lista viu uma linha big_five: o card mostra o aviso fixo e nenhuma faixa, e NÃO afirma «Big Five respondido» (a frase da UI-SPEC é só para `sem_devolutiva`)"
  - "texto_interpretativo nulo (a RPC junta a página por LEFT JOIN) vira string vazia na projeção; faixa fora do vocabulário é erro de formato, nunca faixa inventada"
  - "JORN-56/JORN-57 NÃO marcados completos em REQUIREMENTS.md: as RPCs só vão a PROD no 52-15; o cliente está escrito contra o contrato, com o serviço mockado nos testes"

patterns-established:
  - "Leitura sensível sob demanda no hub: useQuery com staleTime 0, gcTime 0, retry false e chaves avaliacoesRhKeys.*"
  - "Teste de privacidade por cast: montar o componente com um campo que o tipo não tem (percentil: 87, tag nas alternativas) e provar que ele não chega ao DOM"

requirements-completed: []

coverage:
  - id: D1
    description: "Rótulos e faixas do Big Five extraídos para lib/bigFiveRotulos.tsx; a devolutiva do candidato importa de volta com comportamento idêntico"
    requirement: JORN-56
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/DevolutivaBigFiveView.test.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "Big Five no hub (BigFiveResultadoHub): aviso fixo, faixas O C E A N da devolutiva, Ver/Ocultar devolutiva acessível, sem devolutiva sem faixa, skeleton, erro com Recarregar devolutiva"
    requirement: JORN-56
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/BigFiveResultadoHub.test.tsx"
        status: pass
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx#ScorecardAvaliacao — Big Five: faixa sim, percentil não (52-11 / D-01, substitui a D-32)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nenhum número da escala do Big Five no hub: tipo sem o campo, projeção no serviço, teste do 87 e guarda por forma (mutações provaram que os três mordem)"
    requirement: JORN-56
    verification:
      - kind: unit
        ref: "src/__tests__/guards/p52-ban-percentil-bigfive-hub.grep.test.ts"
        status: pass
      - kind: unit
        ref: "src/features/avaliacao/services/__tests__/avaliacoesRhService.test.ts#retorno «disponivel» válido → objeto tipado, projetado sem campo extra"
        status: pass
    human_judgment: false
  - id: D4
    description: "SJT MC no hub (SjtMcDetalhe): Situação {n}, cenário, todas as alternativas na ordem do servidor, escolhida com Check/«Escolhida»/etiqueta pt-BR/peso só nela, legenda da D-37, alternativa sumida, falhou, erro/recarregar"
    requirement: JORN-57
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/SjtMcDetalhe.test.tsx"
        status: pass
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx#ScorecardAvaliacao — SJT MC: exatamente uma etiqueta, nenhum código cru (52-11 / D-21)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Leitura visual do hub com dados reais (faixas, recolhível, alternativas) — só observável depois do apply das RPCs (52-15) e do hub em abas"
    requirement: JORN-56
    verification: []
    human_judgment: true
    rationale: "As RPCs não estão em PROD (52-15) e o hub ainda abre o detalhe pelo «Ver respostas» (52-25); legibilidade e hierarquia visual pedem olho humano no UAT da fase"

duration: 13min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 11: Big Five e SJT MC no hub do RH Summary

**O hub do RH passa a mostrar o Big Five com as faixas que o candidato viu na devolutiva (aviso fixo, texto recolhível, nenhum número da escala) e o SJT de múltipla escolha com cada situação, todas as alternativas em ordem neutra e a escolhida com a etiqueta em pt-BR só nela — cliente escrito contra as RPCs do 52-08, ainda não aplicadas.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-10-11T03:35:43Z
- **Completed:** 2026-10-11T03:49:06Z
- **Tasks:** 2 (Task 1 tracer + Task 2)
- **Files modified:** 11 (8 criados, 3 editados)

## Accomplishments

- `lib/bigFiveRotulos.tsx`: as seis peças saíram de `DevolutivaBigFiveView.tsx` com tipos próprios (`DimBigFive`, `BandaBigFive`) — a devolutiva do candidato e o hub desenham com o mesmo código.
- `avaliacoesRhService`: `lerDevolutivaBigFiveRh` e `lerSjtMcRh` por cast confinado, `situacao` por lista `as const`, projeção campo a campo (o número da escala e a `tag`/`peso` de alternativa são descartados antes da tela), `42501 → UNAUTHORIZED`, `P0002 → NOT_FOUND`, mensagens fixas que não ecoam o retorno.
- `BigFiveResultadoHub`: título «Big Five», selo neutro, aviso fixo da D-07 sempre visível, faixas O C E A N com `BandaSegments`, «Ver devolutiva»/«Ocultar devolutiva» (`aria-expanded`/`aria-controls`, conteúdo montado só aberto, sem abas), estados de carregando/erro/sem devolutiva.
- `SjtMcDetalhe`: substitui o `McBreakdown` (que mostrava `fortemente_pontua` cru); legenda da D-37, «Situação {n}», cenário `whitespace-pre-line`, alternativas na ordem do servidor, escolhida com borda/`Check`/«Escolhida»/etiqueta/peso, sem accent.
- `ScorecardAvaliacao`: `RevisaoHumanaMarker` e o selo do «Não fez» em `text-sm font-semibold`, ícone `h-4 w-4` (UI-SPEC `:244-254`).
- `ScorecardAvaliacao.test.tsx`: SÓ o `describe` da D-32 trocado pelo da D-01 («faixa sim, percentil não», com o «Não fez» copiado tal como estava), mais um `describe` novo do SJT MC; o portão `INTACTO` confirma harness/UX-07, D-20 e 49-41 byte a byte.

## Task Commits

1. **Task 1 (tracer): Big Five no hub**
   - `49d835af` refactor(52-11): rótulos do Big Five em módulo compartilhado
   - `ed5f0189` feat(52-11): Big Five no hub — faixas da devolutiva, aviso fixo, devolutiva recolhível, sem percentil
   - Portão do tracer: interativo, `end-of-phase`, só `<automated>` → re-rodado o vitest da task (56 arquivos, 484 testes verdes) → «Tracer verified end-to-end — expanding».
2. **Task 2: SJT MC no hub**
   - `d0b12b66` test(52-11): testes vermelhos (RED)
   - `61375def` feat(52-11): SJT MC com situação, alternativas em ordem neutra e escolhida

## Verificação (resultados literais)

| Portão | Resultado |
|---|---|
| `npx vitest run src/features/avaliacao src/features/hub-candidato src/__tests__/guards` (Task 1) | 56 arquivos, 484 testes, 0 falhas |
| `npx vitest run src/features/avaliacao src/features/hub-candidato src/components src/__tests__/guards` (Task 2) | 79 arquivos, 672 testes, 0 falhas (linha de base antes do plano: 75 / 636) |
| `INTACTO` (`ScorecardAvaliacao.test.tsx` vs `refs/gsd/52/base`), Tasks 1 e 2 | `INTACTO: harness+fixtures+UX-07 (1 it)` · `INTACTO: D-20 (3 it)` · `INTACTO: 49-41 (5 it)` |
| Tipografia 52-11 (marcador + selo) | `TIPOGRAFIA 52-11 OK … (a base reprova com 3 achados, o portao morde)` |
| `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- …` | `TIPOGRAFIA OK (551 linhas acrescentadas varridas)`; `--auto-teste` ok (16 casos) |
| Lint (`npm run -s lint`) | exit 2, **89** `error TS` (≤ 90; antes do plano: 89 — nenhum erro novo) |
| `hubVerRespostas INTACTO` (Tasks 1 e 2) | `sem diff contra refs/gsd/52/base na arvore, no index e no HEAD`; verde no vitest sem edição |

**Mutações (prova de que as travas mordem, revertidas na hora):**
- render do campo numérico extra no `BigFiveResultadoHub` → 3 testes vermelhos (2 do componente, 1 do `describe` D-01 do Scorecard);
- linha de código `const p = 1 // percentil` no componente → o guarda acusa `BigFiveResultadoHub.tsx:205`;
- projeção do serviço com `...bruto` → o teste do serviço reprova (campo extra chega).

## Files Created/Modified

- `src/features/avaliacao/lib/bigFiveRotulos.tsx` — rótulos, ordens, `BandaSegments`, `analogia` (uma cópia).
- `src/features/avaliacao/services/avaliacoesRhService.ts` — leitores das duas RPCs, tipos estreitos, chaves de query.
- `src/features/avaliacao/components/BigFiveResultadoHub.tsx` — card do Big Five no hub.
- `src/features/avaliacao/components/SjtMcDetalhe.tsx` — card do SJT MC no hub.
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx` — despacho para os dois cards; `McBreakdown`/`ScoreValue` saem; tipografia do marcador e do selo.
- `src/features/avaliacao/components/DevolutivaBigFiveView.tsx` — importa os rótulos do módulo.
- Testes: `avaliacoesRhService.test.ts` (11), `BigFiveResultadoHub.test.tsx` (9), `SjtMcDetalhe.test.tsx` (11), `ScorecardAvaliacao.test.tsx` (D-01 + SJT MC), guarda `p52-ban-percentil-bigfive-hub.grep.test.ts` (4).

## Decisions Made

Ver `key-decisions` no frontmatter. As duas que mudam a forma do que o plano previa: o slot `marcadorRevisao` no `SjtMcDetalhe` (props do plano: `row` e `candidaturaId`) e o `ScoreValue` mudado para o `SjtMcDetalhe`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Ícone do marcador ficaria em 12px apesar do `h-4 w-4`**
- **Found during:** Task 1
- **Issue:** o `Badge` base tem `[&>svg]:size-3`, que vence `h-4 w-4` no ícone por especificidade. Trocar só a classe do ícone passaria no portão sem mudar o tamanho na tela.
- **Fix:** `[&>svg]:size-4` no `className` literal do `Badge` do `RevisaoHumanaMarker` (o `tailwind-merge` resolve com o `size-3` da base). O portão segue lendo `text-sm font-semibold` e `h-4 w-4`.
- **Files modified:** `src/features/avaliacao/components/ScorecardAvaliacao.tsx`
- **Committed in:** `ed5f0189`

**2. [Rule 3 - Blocking] Ciclo de import entre `SjtMcDetalhe` e `ScorecardAvaliacao`**
- **Found during:** Task 2
- **Issue:** o plano pede que o `SjtMcDetalhe` mantenha o `RevisaoHumanaMarker`; importá-lo do `ScorecardAvaliacao` (que importa o `SjtMcDetalhe`) fecharia um ciclo, e movê-lo de arquivo reprovaria o portão de tipografia, que o lê em `ScorecardAvaliacao.tsx`.
- **Fix:** prop opcional `marcadorRevisao?: ReactNode`; o `ScorecardAvaliacao` passa `<RevisaoHumanaMarker />` quando a linha está `pendente_humano`.
- **Files modified:** `SjtMcDetalhe.tsx`, `ScorecardAvaliacao.tsx`
- **Committed in:** `61375def`

**3. [Rule 2 - Correção de estilo dentro do contrato] Selo «Contextual · não-eliminatório» do card «Não fez» alinhado ao «Selo neutro» da UI-SPEC**
- **Found during:** Task 1
- **Issue:** o plano manda só `text-xs → text-sm`; a UI-SPEC (§Escopo da contagem, item 2) põe no contrato o elemento reestilizado inteiro, e o «Selo neutro» é `border-white/20 … text-white/80`.
- **Fix:** `border-white/15 … text-white/70` → `border-white/20 … text-white/80`, junto com o `text-sm`.
- **Committed in:** `ed5f0189`

---

**Total deviations:** 3 corrigidos automaticamente (1 bug, 1 bloqueio, 1 estilo dentro do contrato).
**Impact on plan:** nenhuma mudança de escopo nem de contrato; nenhum dos três blocos protegidos do teste foi tocado.

## TDD

`workflow.tdd_mode` não está ligado no config; os commits seguem os nomes do plano. Task 1: `refactor` + `feat` (o plano não prevê commit `test` separado). Task 2: o RED (`d0b12b66`) falhou assim: o `describe` novo do `ScorecardAvaliacao` reprovou por **asserção** (`Unable to find … Situação 1` — o card ainda era o `McBreakdown`); os testes do serviço reprovaram por `TypeError: lerSjtMcRh is not a function` e o arquivo do `SjtMcDetalhe` por import não resolvido (o módulo ainda não existia). Os dois últimos casos são RED por ausência, não por asserção. GREEN em `61375def`.

## Issues Encountered

Nenhum. Os dois vermelhos conhecidos de `promessasComExecutor.test.ts` (linha de base do 52-01) não estão no escopo dos comandos deste plano.

## Threat Model

- **T-52-31 (mitigate):** tipo sem o campo, projeção no serviço, guarda por forma e teste do `87`. As três travas foram mutadas e as três reprovaram.
- **T-52-32 (mitigate):** `SjtMcAlternativaRh` sem `tag`/`peso`; o teste de projeção do serviço e o teste «exatamente uma etiqueta» (fixture com 4 etiquetas distintas) passam.
- **T-52-33 (accept, residual declarado):** `getScores` (existente) ainda traz `metadata.dimensoes[].percentil` pela rede para o navegador do RH. Nenhuma tela o renderiza (o hub não lê mais `metadata.dimensoes` para o Big Five), mas o dado continua trafegando. Fica para o `52-SECURITY.md` (O5: sem decisão do operador, segue a recomendação).
- **T-52-SC:** nenhuma instalação.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Os cards só funcionam de verdade depois do apply da migration `20261011000001` e do `db:types` (52-15). Até lá, em PROD, `lerDevolutivaBigFiveRh`/`lerSjtMcRh` vão cair no estado de erro do card («Não foi possível carregar…» + «Recarregar…») — o resto do detalhe continua visível. **Não publicar o front deste plano antes do 52-15**, ou o RH verá esse erro no hub.
- O cast confinado em `avaliacoesRhService.chamarRpc` deve ser removido no mesmo commit que regenerar `database.types.ts` (52-15).
- 52-12 pode rodar o mesmo portão `INTACTO`: os três blocos da base estão byte a byte. O `describe` D-01 e o do SJT MC, além do `vi.mock`/`beforeEach` de `avaliacoesRhService` antes do harness, são do 52-11.
- 52-23 acrescenta o `vi.mock` de `useCadastroCandidatoRh` (não foi posto aqui, conforme o plano).
- Linha `sjt/mc` do motor antigo (1 de 6 em PROD, `itens: []`): o card mostra só o cabeçalho e a pontuação, sem legenda e sem situações.

## Self-Check: PASSED

- Arquivos: os 8 criados existem (`[ -f ]` conferido) e os 3 editados estão nos commits.
- Commits `49d835af`, `ed5f0189`, `d0b12b66`, `61375def` são ancestrais de HEAD; `git rev-list --count 90241f82..HEAD` = 4.
- Critérios de aceite das duas tasks re-rodados depois do último commit: vitest 79/672 verde, `INTACTO` ×3, tipografia 52-11 OK, `TIPOGRAFIA OK`, lint 89, `hubVerRespostas INTACTO`.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*
