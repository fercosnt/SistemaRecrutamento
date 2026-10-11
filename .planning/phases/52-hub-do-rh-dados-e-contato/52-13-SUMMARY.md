---
phase: 52-hub-do-rh-dados-e-contato
plan: 13
subsystem: ui
tags: [react, tanstack-query, vitest, revisao, triagem, lgpd-art-20, jorn-62]

requires:
  - phase: 52-01
    provides: "refs/gsd/52/base, scripts/p52_tipografia.cjs (harness da fase)"
  - phase: 52-08
    provides: "contrato da RPC ler_contexto_rejeicao_triagem_revisao (migration 20261011000001, ensaiada, NAO aplicada; motivo vem de candidaturas.motivo_rejeicao, ressalva A5)"
provides:
  - "revisaoService.lerContextoRejeicaoTriagem + tipo ContextoRejeicaoTriagem (cast confinado até o db:types do 52-15)"
  - "ContextoRejeicaoTriagemRevisao + COPY_CONTEXTO_TRIAGEM: motivo (rótulo do MOTIVO_OPTIONS) e justificativa (inteira) como dois pares sm:col-span-2 na grade de contexto do diálogo"
  - "ResponderRevisaoDialog monta o contexto só para origem humana_triagem"
  - "MOTIVO_OPTIONS exportado do RejeitarCandidaturaDialog (um mapa só)"
affects: [52-14, 52-15, 52-25]

actuals:
  tokens: 7600
  tasks: 2
  commits: 3
plan_head_before: ee66a34d714864cf5c02353e66042bd1f2cdcb10
plan_head_after: 9720e6fe2273227c856938419a2e21ca2530b613

tech-stack:
  added: []
  patterns:
    - "Componente de contexto que entra DENTRO de uma grade existente por invólucro `contents` — os pares viram células da grade do pai"

key-files:
  created:
    - src/features/revisao/components/ContextoRejeicaoTriagemRevisao.tsx
    - src/features/revisao/components/__tests__/ContextoRejeicaoTriagemRevisao.test.tsx
  modified:
    - src/features/revisao/services/revisaoService.ts
    - src/features/revisao/services/__tests__/revisaoService.test.ts
    - src/features/revisao/components/ResponderRevisaoDialog.tsx
    - src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx
    - src/features/triagem/components/RejeitarCandidaturaDialog.tsx

key-decisions:
  - "Montado DENTRO da grade de contexto do diálogo (52-UI-SPEC: «dois pares a mais no bloco de contexto, sm:col-span-2»), não ao lado do knockout como um bloco separado; o invólucro com data-testid é `display: contents`"
  - "Rótulo dos pares em `text-sm font-semibold uppercase tracking-wide text-white/70`: mesma forma dos vizinhos (EYEBROW), mas em /70 — a 52-UI-SPEC §Color proíbe /50 autorado nesta fase"
  - "Erros pelo `classificarErroRevisao` existente, sem código novo: 42501 sem «decisor» → DESCONHECIDO (não a recusa do guard), P0002 → VALIDACAO; o componente mostra a frase própria + «Tentar novamente», nunca a mensagem"
  - "String vazia/só espaços em motivo ou justificativa = ausente («Não registrado»), por `textoOuNulo` (suposição registrada no plano)"
  - "JORN-62 NÃO marcado completo em REQUIREMENTS.md: a RPC só vai a PROD no 52-15 e o JORN-62 cobre outros itens de outros planos"

patterns-established:
  - "Contexto de pedido de revisão por origem: automatica → ContextoKnockoutRevisao (bloco próprio); humana_triagem → ContextoRejeicaoTriagemRevisao (pares na grade); humana → nenhum"

requirements-completed: []

coverage:
  - id: D1
    description: "No diálogo «Responder revisão» de um pedido humana_triagem, «Motivo da rejeição» (rótulo do MOTIVO_OPTIONS; código desconhecido cru) e «Justificativa registrada» (inteira, whitespace-pre-wrap); ausente → «Não registrado»; automatica e humana sem o componente"
    requirement: JORN-62
    verification:
      - kind: unit
        ref: "src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx#ResponderRevisaoDialog — pedido de rejeição na triagem (D-38)"
        status: pass
    human_judgment: true
    rationale: "A RPC ler_contexto_rejeicao_triagem_revisao ainda não está em PROD (vai no 52-15); o serviço é mockado nos testes. A tela real com o pedido humana_triagem de PROD só pode ser conferida depois do apply e do deploy."
  - id: D2
    description: "Estados honestos do contexto (carregando, erro com «Tentar novamente», vazio) e coerção estrita do serviço (só `disponivel` passa; 42501/P0002 classificados)"
    requirement: JORN-62
    verification:
      - kind: unit
        ref: "src/features/revisao/components/__tests__/ContextoRejeicaoTriagemRevisao.test.tsx"
        status: pass
      - kind: unit
        ref: "src/features/revisao/services/__tests__/revisaoService.test.ts#lerContextoRejeicaoTriagem — RPC do contexto da triagem, coerção estrita (52-13)"
        status: pass
      - kind: other
        ref: "node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- src/features/revisao/components/ContextoRejeicaoTriagemRevisao.tsx src/features/revisao/components/ResponderRevisaoDialog.tsx"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 13: Motivo e justificativa no diálogo de revisão `humana_triagem` Summary

**Quem responde a revisão de uma rejeição feita pelo RH vê o motivo, com o rótulo do mesmo `MOTIVO_OPTIONS` do diálogo de rejeição, e a justificativa inteira de quem rejeitou. Os dois vêm da RPC `ler_contexto_rejeicao_triagem_revisao` (52-08), lida sob demanda e sem cache, e entram como dois pares na grade de contexto do diálogo. Fica tudo em código: a RPC só vai a PROD no 52-15.**

## Performance

- **Duration:** ~4 min (relógio do executor, da gravação do ledger ao último commit de código)
- **Started:** 2026-10-11T03:52:50Z
- **Completed:** 2026-10-11T03:56:34Z
- **Tasks:** 2
- **Files modified:** 7 (2 criados, 5 modificados)

## Accomplishments

- `RejeitarCandidaturaDialog.tsx`: `const MOTIVO_OPTIONS` → `export const MOTIVO_OPTIONS`. Nada mais muda, e o mesmo motivo continua com um nome só.
- `revisaoService.lerContextoRejeicaoTriagem(pedidoId)`: chama a RPC por cast confinado ao nome (como em `lerContextoKnockout`) e faz coerção estrita. Só um objeto com `situacao = 'disponivel'` passa; nulo, array, escalar ou situação desconhecida viram `indisponivel` sem texto. Os erros saem por `classificarErroRevisao`. A função também está no objeto `revisaoService`.
- `ContextoRejeicaoTriagemRevisao` + `COPY_CONTEXTO_TRIAGEM`: `useQuery` com `[...revisoesKeys.all, 'contexto-triagem', pedidoId]` e `staleTime: 0, gcTime: 0, retry: false`. São dois pares `sm:col-span-2`. A justificativa usa `text-base whitespace-pre-wrap text-white/90`, nunca truncada, e todo texto sai como nó React. Estados: carregando, erro com «Tentar novamente» e vazio com «Não registrado».
- `ResponderRevisaoDialog`: o componente só monta quando `linha.origem === 'humana_triagem'`, dentro da grade de contexto. O knockout (`automatica`) continua igual.

## Task Commits

1. **Task 1 (tracer): motivo e justificativa no diálogo `humana_triagem`**
   - `c54198e1` test(52-13): testes vermelhos (RED)
   - `084d8075` feat(52-13): motivo e justificativa no dialogo de revisao humana_triagem (D-38) (GREEN)
2. **Task 2: estados do contexto e coerção estrita do serviço:** `9720e6fe` test(52-13)

## Verification

| Portão | Comando | Resultado |
|---|---|---|
| Task 1 `<verify>` | `npx vitest run src/features/revisao src/features/triagem` | 22 arquivos / 403 testes verdes (no GREEN) e 23 / 419 depois da Task 2 |
| Task 2 `<verify>` 1 | `npx vitest run src/features/revisao` | 11 arquivos / 242 testes verdes |
| Task 2 `<verify>` 2 | `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- …ContextoRejeicaoTriagemRevisao.tsx …ResponderRevisaoDialog.tsx` | `TIPOGRAFIA OK (127 linhas acrescentadas varridas)` |
| Suíte inteira | `npx vitest run` | 239/240 arquivos e 2812/2814 testes. As 2 falhas são as já conhecidas de `promessasComExecutor.test.ts` (baseline) |
| tsc (hook de pre-commit) | — | `tsc errors: 89 (frozen baseline: 96)`, sem erro em arquivo tocado |
| Tracer gate | modo interativo, `end-of-phase`, `<verify>` só automatizado | Verify rodado de novo e verde, depois a Task 2 |

**RED (Task 1):** dois testes falharam por asserção: `Unable to find an element by: [data-testid="revisao-contexto-triagem"]`. O componente ainda não existia, e o teste RED não importava o módulo novo (usava os literais da UI-SPEC) justamente para não virar falha de carga. Os dois casos negativos (`automatica`, `humana`) passaram no RED, como devem: são guardas de não-montagem.

**Task 2 — os testes mordem (prova por mutação):** os testes de estado passaram na primeira execução, porque a Task 1 já escreveu os estados copiando o `ContextoKnockoutRevisao`. Para provar que eles detectam regressão, injetei três defeitos temporários: a coerção do serviço passou a aceitar qualquer objeto, `gcTime` foi para 300000 e o «Tentar novamente» deixou de chamar o `refetch`. Resultado: **4 testes vermelhos** em 2 arquivos. Restaurei os dois arquivos com `git checkout --` por caminho e a suíte voltou a 242/242.

## Decisions Made

Ver `key-decisions` no frontmatter. Em resumo:

- O componente entra na grade de contexto, conforme a UI-SPEC.
- Os rótulos ficam em `/70` (nada de `/50` nesta fase).
- Os erros são classificados sem código novo.
- String vazia conta como ausente.
- JORN-62 não foi marcado.

## Deviations from Plan

**1. [Rule 1 - Bug no exemplo do plano] Código de motivo do `<behavior>` não existe no enum**
- **Found during:** Task 1
- **Issue:** o `<behavior>` usa `motivo: 'perfil_nao_aderente'` como caso com rótulo. Esse valor não está em `MOTIVO_OPTIONS` (o enum tem `perfil_desalinhado` → «Perfil desalinhado com a vaga»). Usado como estava, o teste do rótulo conferiria o caminho do código desconhecido.
- **Fix:** o caso com rótulo usa `perfil_desalinhado`. `perfil_nao_aderente` virou o caso de motivo desconhecido (código cru), que o próprio `<behavior>` pede. A Task 2 cobre também todos os códigos de `MOTIVO_OPTIONS`.
- **Files modified:** `src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx`
- **Committed in:** `c54198e1`

**2. [Esclarecimento] «Montar ao lado do knockout» × «dois pares na grade existente»**
- O `<action>` diz «montar ao lado do knockout». O `must_haves`, a 52-UI-SPEC (linha 580) e o 52-PATTERNS pedem os pares **dentro** da grade de contexto, com `sm:col-span-2`. Segui a UI-SPEC: o componente entra na grade, e o `key_link` (`linha.origem === 'humana_triagem' ? <ContextoRejeicaoTriagemRevisao pedidoId={linha.pedido_id} /> : null`) é o mesmo.

**3. [Esclarecimento] «erro 42501 → erro classificado de permissão»**
- O `classificarErroRevisao` existente não tem código de «permissão»: um 42501 sem «decisor» na mensagem vira `DESCONHECIDO`. Como o plano manda usar o classificador existente, o teste confere `DESCONHECIDO` (e que não é `GUARD_DECISOR`). `P0002` → `VALIDACAO`. Não criei código novo.

**Total deviations:** 1 auto-fix (Rule 1, no dado de teste) e 2 esclarecimentos de leitura. **Impact:** nenhum aumento de escopo.

## Issues Encountered

None.

## Known Stubs

None. O componente está ligado ao serviço real. A RPC ainda não está em PROD, o que é dependência de sequência (52-15), não stub.

## Threat Flags

None. A superfície é a RPC já modelada no 52-08 (T-52-36). T-52-37 (HTML na justificativa) tem teste: a marcação aparece literal.

## User Setup Required

None.

## Next Phase Readiness

- **Não publicar o front antes do 52-15.** Sem a RPC em PROD, o diálogo `humana_triagem` cai no estado de erro, com «Tentar novamente». Isso não quebra nada, mas a função ainda não serve para nada.
- O 52-14 (review bloqueante da migration) e o 52-15 (apply + `db:types`) removem o cast confinado de `lerContextoRejeicaoTriagem`.
- Conferência visual na UAT: o pedido `humana_triagem` de PROD (`revertida`, justificativa de 60 caracteres no histórico — 52-RESEARCH F3) só aparece em modo «Ver resposta». O contexto monta nos dois modos.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- FOUND: src/features/revisao/components/ContextoRejeicaoTriagemRevisao.tsx
- FOUND: src/features/revisao/components/__tests__/ContextoRejeicaoTriagemRevisao.test.tsx
- FOUND commits: c54198e1, 084d8075, 9720e6fe (ancestrais de HEAD)
