---
phase: 51-consertos-da-jornada-bloco-3
plan: 18
subsystem: ui
tags: [react, tanstack-query, cache, avaliacao, gap-closure, G2, WR-01]

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-07 (molde setQueryData + invalidateQueries no Raven; fábrica avaliacaoStatusKey); 51-01 («Voltar às avaliações» como caminho padrão pós-envio)"
provides:
  - "helper `marcarInstrumentoRegistrado(queryClient, candidaturaId, card)` em src/features/avaliacao/lib/avaliacaoStatusCache.ts"
  - "prova cognitiva, caso aberto do SJT, envio final do Big Five e último envio da Redação escrevem a conclusão em ['avaliacao','status',id] e invalidam a entrada"
  - "entrada (51-18) em deferred-items.md: recusa de reenvio em pontuar_cognitivo vai ao backlog (UF-3 segue open)"
affects: [51-22 review dos gaps, 51-24 push/fecho, 51-SECURITY UF-3, backlog pontuar_cognitivo]

actuals:
  tokens: 20163
  tasks: 2
  commits: 2
plan_head_before: 359fd59a88082f621e3eb006bdd12ba426cdae56
plan_head_after: 4003bfb1a85b060e034a4a2ee056876928e25649

tech-stack:
  added: []
  patterns:
    - "Conclusão de prova escrita no cache de status por UM helper (`marcarInstrumentoRegistrado`), chamado só no sucesso do envio; a chave vem da fábrica única `avaliacaoStatusKey`"
    - "Rota-sentinela que lê o cache no próprio render, para provar que a escrita veio ANTES da navegação"

key-files:
  created:
    - src/features/avaliacao/lib/avaliacaoStatusCache.ts
    - src/features/avaliacao/lib/__tests__/avaliacaoStatusCache.test.ts
    - src/features/avaliacao-cognitiva/components/__tests__/ProvaCognitivaScreen.conclusao.test.tsx
    - src/features/avaliacao/components/__tests__/conclusao-cache.test.tsx
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-18/task1.json
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-18/task1-junit.xml
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-18/task2.json
    - .planning/phases/51-consertos-da-jornada-bloco-3/.red-51-18/task2-junit.xml
  modified:
    - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
    - src/features/avaliacao/components/SjtCasoAbertoScreen.tsx
    - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
    - src/features/avaliacao/components/RedacaoEditorScreen.tsx
    - .planning/phases/51-consertos-da-jornada-bloco-3/deferred-items.md

key-decisions:
  - "G2 só no cliente (decisão do operador, 51-GAPS-DECISAO): nenhum objeto de banco tocado; a recusa de reenvio em pontuar_cognitivo foi ao backlog, e o UF-3 segue open por ela"
  - "Um helper único em vez de quatro cópias do molde; o AvaliacaoRavenScreen não foi migrado (ele escreve a chave raven, que não é card)"
  - "A Redação só marca no envio que completa o conjunto: mesmo critério do allSubmitted, com submittedIds mais o pergunta.id recém-enviado"
  - "Entrada de cache ausente continua ausente: o updater devolve undefined e o TanStack v5 não cria a entrada. A invalidação roda mesmo assim"

patterns-established:
  - "marcarInstrumentoRegistrado: escreve só `registrado: true` do card, invalida sempre e não fabrica a entrada"

requirements-completed: [JORN-46]

coverage:
  - id: D1
    description: "Helper escreve só registrado: true do card pedido, invalida, não fabrica a entrada ausente e não toca a entrada de outra candidatura; toda folha continua booleana"
    requirement: JORN-46
    verification:
      - kind: unit
        ref: "src/features/avaliacao/lib/__tests__/avaliacaoStatusCache.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "TRACER: prova cognitiva → «Voltar às avaliações» → AvaliacaoContainer real com «Prova cognitiva» em «Concluído» e sem «Começar avaliação»; locked/erro não escrevem nem invalidam"
    requirement: JORN-46
    verification:
      - kind: integration
        ref: "src/features/avaliacao-cognitiva/components/__tests__/ProvaCognitivaScreen.conclusao.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Caso aberto, Big Five final e último envio da Redação escrevem o próprio card antes de navegar; LOCKED não toca o cache; o 1º envio da Redação não toca o status"
    requirement: JORN-46
    verification:
      - kind: integration
        ref: "src/features/avaliacao/components/__tests__/conclusao-cache.test.tsx"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-10-10
status: complete
---

# Phase 51 Plan 18: Conclusão da prova escrita no cache da lista (G2) Summary

**Novo helper `marcarInstrumentoRegistrado`: escreve `registrado: true` em `['avaliacao','status',id]` e invalida a entrada no sucesso do envio da prova cognitiva, do caso aberto do SJT, do Big Five final e do último envio da Redação. Assim, «Voltar às avaliações» já não abre a lista do cache de 5 min com um convite para refazer a prova. Isso foi provado por um tracer que vai da tela da prova até o `AvaliacaoContainer` real.**

## Performance

- **Duration:** cerca de 8 min
- **Started:** 2026-10-10T05:14:30Z
- **Completed:** 2026-10-10T05:22:15Z
- **Tasks:** 2/2
- **Files modified:** 13 (5 de código, 4 de teste, 4 de evidência RED e deferred-items)

## Accomplishments

- **Tracer:** na base, o card «Prova cognitiva» da lista real mostrava `Pendente` + `Começar avaliação` depois de «Prova registrada» (o RED está registrado). No HEAD ele aparece «Concluído» e sem o botão.
- **As três telas irmãs** escrevem o próprio card antes de navegar. A rota-sentinela lê o cache no próprio render, o que prova a ordem.
- **Bordas:** um envio `LOCKED`/`'locked'` ou com erro não escreve nem invalida o cache. O 1º envio da Redação também não toca o status. O helper não fabrica uma entrada ausente nem mexe na de outra candidatura. Toda folha continua booleana (RNF-07a).
- **Servidor:** a defesa (recusar reenvio em `pontuar_cognitivo`) ficou registrada no backlog como `(51-18)` em `deferred-items.md`.

## Task Commits

1. **Task 1 (tracer): a prova cognitiva escreve a conclusão no cache da lista**: `4014c299` (feat)
2. **Task 2: caso aberto, Big Five e último envio da Redação, mais o backlog do servidor**: `4003bfb1` (feat)

**Plan metadata:** commit do SUMMARY (docs). Nenhuma escrita em STATE nem em ROADMAP: o orquestrador cuida do rastreamento.

## RED contra a base (`refs/gsd/51-18/base` = `359fd59a`)

| Task | Falhou na base | Razão |
|---|---|---|
| 1 | `avaliacaoStatusCache.test.ts` (arquivo) | ausência: o helper é parte do conserto |
| 1 | envio ok → `cognitivo.registrado = true` | `{ registrado: false }`: o envio não escrevia o cache |
| 1 | TRACER (tela → lista real) | o card recebido foi `"Prova cognitivaTempo estimado: ~10 minPendenteComeçar avaliação"` |
| 2 | caso aberto, sucesso | a sentinela da lista leu `registrado=false` |
| 2 | Big Five, sucesso | a sentinela da devolutiva leu `registrado=false` |
| 2 | Redação, último envio | o 1º envio (intacto) passou; no final, `redacao.registrado` continuava `false` |

Os casos `locked`, erro e `LOCKED` passam na base e no HEAD. Eles são bordas de regressão. Evidência: `.red-51-18/task{1,2}.json` + `task{1,2}-junit.xml`. Os worktrees foram removidos.

## Verificação

- `npx vitest run src/features/avaliacao src/features/avaliacao-cognitiva src/__tests__/guards`: 41 arquivos, 315 testes, todos verdes, entre eles os guardas `rotulos-navegacao-candidato` e `nomes-instrumentos`.
- Checagem de forma da Task 1: a chamada do helper vem depois do desvio `locked` e antes de `setDone(true)`, com o card `'cognitivo'`, e o helper usa `avaliacaoStatusKey`, `setQueryData` e `invalidateQueries`.
- Checagem de forma da Task 2: as três telas chamam o helper com o card certo, e a entrada `(51-18)` de `pontuar_cognitivo` está presente.
- `tsc`: 89 erros, dentro do teto de 90 (D-53); nenhum erro em arquivo deste plano. O hook de commit informou "frozen baseline: 96".
- `git status --porcelain -- supabase` saiu vazio: nenhum objeto de banco tocado.
- `git ls-remote origin refs/heads/main` deu `53cb73ff240df4507fd808aa86c909e43a941669` no início e no fim: nada foi publicado.

## Files Created/Modified

- `src/features/avaliacao/lib/avaliacaoStatusCache.ts`: o helper, com docblock citando G2, WR-01 e o molde do 51-07.
- `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx`: `useQueryClient` e a chamada no sucesso.
- `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx`, `BigFiveQuestionnaireScreen.tsx`: `useQueryClient` e a chamada antes do toast e da navegação.
- `src/features/avaliacao/components/RedacaoEditorScreen.tsx`: a chamada só quando `conjuntoCompleto` é verdadeiro.
- Testes: `avaliacaoStatusCache.test.ts`, `ProvaCognitivaScreen.conclusao.test.tsx` (tracer) e `conclusao-cache.test.tsx`.
- `deferred-items.md`: a entrada `(51-18)`.

## Decisions Made

Seguem as escolhas (1)–(3) do planejador, sem alteração. Ver `key-decisions`.

## Deviations from Plan

### Ajustes menores (sem mudança de escopo)

**1. Tipo do commit da Task 2: `feat` em vez de `fix`**
- O plano sugeria o assunto `fix(51-18): …`. O despacho do orquestrador pedia `feat(51-18)`/`test(51-18)`. Usei `feat(51-18)` com o texto de assunto do plano.

**2. Valor de retorno do mock de `submitProva`: `'registrado'` em vez de `'ok'`**
- O `<behavior>` dizia «`submitProva` resolvendo `'ok'`». O tipo real é `SubmitProvaOutcome = 'registrado' | 'locked'`, então o teste usa `'registrado'`, como no `navegacao-cognitiva.test.tsx`. O comportamento coberto é o mesmo: qualquer resultado diferente de `'locked'`.

**3. Lista do tracer com um segundo card pendente (Big Five)**
- Com o cognitivo como único card, o envio concluído leva a lista ao estado «Tudo concluído!», que não mostra cards. O contexto do teste inclui `big_five` pendente para que o CARD «Prova cognitiva» apareça e seja conferido pelo rótulo «Concluído».

**4. Teste da Redação espera o contador ver a caixa vazia antes do 2º texto**
- O `RedacaoCounter` tem debounce de 200 ms. Se o mesmo texto válido é digitado de novo antes disso, a validade não muda de lado, e o `setIsValid(false)` do `goNext` deixa o botão desabilitado. Isso é um artefato do teste, não do produto: uma pessoa real não reescreve 220 palavras em menos de 200 ms. O teste espera `0 palavras` antes de digitar.

**5. TDD: um commit por task (teste e implementação juntos)**
- O plano manda commitar os arquivos de cada task juntos. O RED foi provado à parte, contra a base, num worktree separado, e a evidência foi commitada.

O guard `guard-git.sh` não bloqueou os `node -e` de verificação: rodaram direto.

## Threat Flags

Nenhuma superfície nova. As mitigações do registro foram aplicadas e testadas:
- T-51-75: escrita e invalidação no envio, com tracer; o resíduo do servidor está no backlog.
- T-51-76: o teste de folhas booleanas confirma que nenhum número entra no cache.
- T-51-77: testes de isolamento e de LOCKED/erro.

## Next Phase Readiness

- O código está pronto para o review do 51-22 (base `refs/gsd/51-gaps/base` = `03ceab59`). O push sai no 51-24.
- O UF-3 do `51-SECURITY.md` segue `open` pela defesa do servidor que está no backlog.

## Self-Check: PASSED
