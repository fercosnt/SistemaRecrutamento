---
phase: 52-hub-do-rh-dados-e-contato
plan: 07
subsystem: ui
tags: [react, a11y, radiogroup, vitest, grep-guard, fairness]

requires:
  - phase: 52-01
    provides: "harness da fase (scripts/p52_tipografia.cjs, base refs/gsd/52/base)"
provides:
  - "EntrevistaScorecardInline: notas 1–5 por competência em radiogroup de 5 botões, nenhuma marcada ao abrir, obrigatórias; nenhuma nota da IA no estado nem perto do controle"
  - "SCORECARD_COPY.subtitulo e SCORECARD_COPY.notaFaltante (frases da UI-SPEC §Copy)"
  - "src/__tests__/guards/p52-ban-jargao-entrevista.grep.test.ts — ban de «BARS sliders» e de notas_humanas como texto visível em src/features/entrevista, com mordida provada"
affects: [52-SECURITY, 52-UAT, EntrevistaWorkspace]

actuals:
  tokens: 8338
  tasks: 2
  commits: 4
plan_head_before: f5937b6778993adc8b961b15c0e39626eb1d126b
plan_head_after: f3a7e2042b44bc03a8fbdb274a7673372b7e751d

tech-stack:
  added: []
  patterns:
    - "Controle com estado VAZIO: radiogroup de botões role=radio (o Slider do Radix não tem «nenhum»)"
    - "Avisos de bloqueio ligados ao botão por aria-describedby com ids de useId, só os visíveis"
    - "Guarda de texto visível por subtração: tira os usos como NOME (chave, campo, propriedade, colchete, allowlist de select, identificador) e reprova o que sobra"

key-files:
  created:
    - src/__tests__/guards/p52-ban-jargao-entrevista.grep.test.ts
  modified:
    - src/features/entrevista/components/EntrevistaScorecardInline.tsx
    - src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx

key-decisions:
  - "A nota da IA não entra mais na lista de competências (só os nomes); o selo «Sugestão IA» do cabeçalho segue com a mesma regra de antes (há score numérico na análise), calculado direto de competenciasIA, sem nota exposta"
  - "Clicar de novo na nota marcada a mantém (radiogroup sem «nenhum» depois de escolhido) — a suposição sinalizada no plano, agora testada"
  - "O guarda trata JSX-comment ({/* … */}) como comentário, além de //, * e /*"

patterns-established:
  - "Ban de jargão por subtração de usos como nome, com sub-testes de mordida e não-mordida contra a MESMA função reprova()"

requirements-completed: [JORN-61]

coverage:
  - id: D1
    description: "Notas 1–5 vazias e obrigatórias: radiogroup por competência (aria-label = competência) com 5 radios «1»…«5», nenhum marcado com score 4 da IA na fixture; sem leitura «x / 5»; Salvar desabilitado até todas as notas e as notas escritas; payload só com as notas escolhidas; saving desabilita os botões"
    requirement: JORN-61
    verification:
      - kind: unit
        ref: "src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx#notas 1–5 vazias e obrigatórias (52-07 / JORN-61, D-25, D-52-U12) (a)–(e)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Subtítulo «Escolha uma nota de 1 a 5 para cada competência. A decisão é sempre humana.» e rótulo «Notas do gestor (obrigatório)» com sufixo em span font-normal text-white/70"
    requirement: JORN-61
    verification:
      - kind: unit
        ref: "src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx#a tela fala com o entrevistador, não com o banco (52-07 / D-52-U13)"
        status: pass
      - kind: other
        ref: "node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- src/features/entrevista/components/EntrevistaScorecardInline.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ban de «BARS sliders» e de notas_humanas como texto visível em src/features/entrevista, com mordida provada no código real (RED) e por fixtures"
    requirement: JORN-61
    verification:
      - kind: unit
        ref: "src/__tests__/guards/p52-ban-jargao-entrevista.grep.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Aparência dos botões 1–5 no vidro (contraste da nota livre vs. marcada, quebra com nome de competência longo, alvo de 44px) no workspace real"
    verification: []
    human_judgment: true
    rationale: "jsdom não renderiza CSS; contraste e quebra visual só se conferem na tela — fica para a UAT da 52"

duration: 7min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 07: Entrevista — notas 1–5 vazias e obrigatórias, sem jargão Summary

**A avaliação da entrevista deixou de chegar pré-marcada pela IA: cada competência é um radiogroup de 5 botões que começa vazio, «Salvar avaliação» só habilita com todas as notas escolhidas pelo gestor e as notas escritas, e o subtítulo «BARS sliders 1–5 — notas_humanas» virou uma instrução simples, guardada por um ban com mordida provada.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-10-11T04:43:11Z
- **Completed:** 2026-10-11T04:50:31Z
- **Tasks:** 2 (1 tracer + 1 auto, ambos tdd)
- **Files modified:** 3 (1 criado, 2 modificados)

## Accomplishments

- **Nota vazia e obrigatória (D-25 + D-52-U12):** estado inicial `{}` (`Record<string, number | undefined>`); sai o `Slider`, sai o `clampScore` (que punha a nota da IA, ou 3 quando ela não dava nota), sai a leitura «x / 5». Por competência: rótulo `text-sm font-semibold` com `break-words` + `role="radiogroup"` (`aria-label` = competência) com 5 `button role="radio"` «1»…«5» (`aria-label="n de 5"`, `min-h-[44px] min-w-[44px]`, `flex flex-wrap gap-2`, `data-testid="entrevista-nota-<key>-<n>"`, tratamento do seletor de análise: marcada `border-white/40 bg-white/25 text-white`, livre `border-white/20 bg-white/5 text-white/80 hover:bg-white/15`).
- **A nota da IA não chega perto do controle:** a lista de competências carrega só os nomes; o selo «Sugestão IA» do cabeçalho é calculado à parte, sem mostrar nota.
- **Salvar:** `semNotaFaltante = competencias.some(c => scores[c.key] == null)` entra no `disabled`; aviso «Escolha uma nota para todas as competências para salvar a avaliação.» (`text-sm text-white/75`, `data-testid="entrevista-nota-faltante"`). Os três avisos (sem vigente, nota faltante, notas obrigatórias) têm ids de `useId` e o botão aponta para os visíveis por `aria-describedby`. `handleSalvar` monta `scoresHumanos` só com notas definidas.
- **Loading (E9):** as notas vivem num `fieldset disabled={saving}` e cada botão também recebe `disabled={saving}`.
- **Sem jargão (D-52-U13):** `SCORECARD_COPY.subtitulo` = «Escolha uma nota de 1 a 5 para cada competência. A decisão é sempre humana.»; rótulo «Notas do gestor» + `<span className="font-normal text-white/70">(obrigatório)</span>`.
- **Ban com mordida:** `p52-ban-jargao-entrevista.grep.test.ts` varre `src/features/entrevista` (fora de `__tests__` e de comentário). No RED achou exatamente a linha real do subtítulo (`EntrevistaScorecardInline.tsx:158`) e nenhuma outra: a allowlist do `select` em `entrevistaService.ts` e o campo `notas_humanas: string | null` do tipo passaram. Os sub-testes (ii-a/b/c) exercitam a MESMA função `reprova()`: 8 fixtures que mordem, 11 de nome que não mordem, 7 de comentário e «BARS» sozinho que não mordem; piso de 6 arquivos (há 8).

## Task Commits

1. **Task 1 (tracer): notas 1–5 vazias e obrigatórias**
   - RED `60b277b5` (test) — RED_EVIDENCE_OK
   - GREEN `593d3c60` (feat)
   - Portão do tracer (interativo, `end-of-phase`, `<verify>` só `<automated>`): `npx vitest run src/features/entrevista` rodado de novo, 11 arquivos e 135 testes verdes. Tracer verificado de ponta a ponta, segui para a Task 2.
2. **Task 2: subtítulo, rótulo e ban do jargão**
   - RED `92a2f766` (test) — RED_EVIDENCE_OK
   - GREEN `f3a7e204` (feat)

**Plan metadata:** commit `docs(52-07)` deste SUMMARY

## TDD Gate Compliance

- **RED Task 1:** alvo `notas 1–5 vazias e obrigatórias … > (a) abre com score 4 da IA e NENHUMA nota marcada…` em `EntrevistaScorecardInline.test.tsx`. `gsd-tools check tdd-red-evidence` deu **RED_EVIDENCE_OK** (JUnit; 13 testes, 6 falhas, 7 passando). Avaliação semântica: o alvo rodou e falhou na asserção planejada (`getByRole('radiogroup', { name: competência })` não acha o controle, porque a tela ainda era o `Slider` pré-preenchido). Não houve falha de import, coleta ou fixture. Falharam também (b)–(e) e o caso antigo «Salvar habilitado», agora reescrito para escolher a nota.
- **RED Task 2:** alvo `Entrevista do RH sem jargão na tela … > (i) nenhuma linha de código …` em `p52-ban-jargao-entrevista.grep.test.ts`. Resultado **RED_EVIDENCE_OK** (JUnit; 142 testes, 4 falhas). Avaliação semântica: a varredura falhou listando só a linha real do subtítulo, o que prova a mordida sobre o código e não só sobre as fixtures. Falharam junto os três testes de componente do subtítulo e do rótulo. Os sub-testes de sanidade passaram no RED, como esperado: eles testam a regra, não o código.
- Os commits `test(52-07)` vêm antes dos `feat(52-07)` nas duas tasks. Não houve REFACTOR.
- Os registros de evidência ficaram fora do repositório, no scratchpad da sessão, como nos planos anteriores.

## Files Created/Modified

- `src/features/entrevista/components/EntrevistaScorecardInline.tsx`: controle de nota reescrito, avisos com `aria-describedby`, subtítulo e rótulo novos, docblock atualizado com o residual F13.
- `src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx`: casos (a)–(e) das notas, subtítulo e rótulo. Três casos antigos foram ajustados (ver Deviations).
- `src/__tests__/guards/p52-ban-jargao-entrevista.grep.test.ts`: guarda novo.

## Decisions Made

- **Selo «Sugestão IA»:** fica no cabeçalho com a mesma condição de antes (alguma competência com `score` numérico). O plano proíbe pré-preencher ou mostrar a nota da IA junto do controle; o selo não mostra nota nenhuma, e a nota já não entra na lista de competências que alimenta o controle.
- **Idempotência:** clicar de novo na nota marcada mantém a nota (suposição sinalizada no plano). Está testado no caso (d).
- **Comentário JSX:** o guarda trata `{/* … */}` como comentário, tanto em linha inteira quanto no fim de uma linha, além de `//`, `*` e `/*`.

## Deviations from Plan

### Ajustes em testes existentes (comportamento mudado de propósito pelo plano)

**1. [Rule 1 - testes que codificavam o comportamento removido] Três casos antigos de `EntrevistaScorecardInline.test.tsx`**
- **Found during:** Tasks 1 e 2
- **Issue:** os casos pressupunham o comportamento que o plano remove: (i) `queryByRole('radiogroup')` / `getByRole('radiogroup')` sem nome, mas agora há um radiogroup por competência; (ii) «Salvar habilitado» esperava `scoresHumanos: { Comunicação: 4 }` herdado da IA, exatamente o defeito da D-25; (iii) nome acessível «Notas do gestor», que agora tem o sufixo «(obrigatório)».
- **Fix:** (i) o seletor de análise passa a ser buscado pelo nome da legenda (`SCORECARD_COPY.escolherLegenda`), e a asserção continua a mesma; (ii) o caso escolhe a nota 4 com um clique antes de salvar, e o payload esperado não mudou; (iii) o nome acessível esperado passa a ser «Notas do gestor (obrigatório)». Nenhuma asserção foi afrouxada. O arquivo está em `files_modified` do plano.
- **Commits:** `60b277b5`, `92a2f766`

---

**Total deviations:** 1 (ajuste de testes antigos ao comportamento novo especificado)
**Impact on plan:** nenhum desvio de escopo.

## Issues Encountered

- O classificador de evidência RED pede o nome qualificado do alvo (`suite > teste`). Com o nome curto ele devolveu `no_target_test_failure`. Repeti a classificação com o nome qualificado, que é o que o JUnit emite, e saiu RED_EVIDENCE_OK.

## Residual declarado (F13), para o `52-SECURITY.md`

- **T-52-13 (accept):** `salvar_avaliacao_entrevista` só recusa quando NENHUMA nota está entre 1 e 5. A regra «todas as competências notadas» existe apenas no cliente (`semNotaFaltante`), porque o bloco A não mexe no banco (D-33). Um cliente adulterado ainda consegue gravar notas parciais. Fortalecer o servidor exige migration, fora deste plano.
- **T-52-12 (mitigate):** coberto. Estado inicial vazio, «Salvar» exige todas as notas, e o teste usa fixture com `score: 4` da IA.

## Verification

- `npx vitest run src/features/entrevista src/__tests__/guards`: 26 arquivos, 283 testes verdes.
- `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- src/features/entrevista/components/EntrevistaScorecardInline.tsx`: **TIPOGRAFIA OK** (100 linhas acrescentadas varridas).
- `npm run -s lint`: exit 2 com **89** `error TS`, igual ao baseline (portão do plano ≤ 90; hook ≤ 96).
- Suíte inteira: 2922 testes verdes e 2 vermelhos, os dois de baseline (`promessasComExecutor.test.ts`), sem regressão.

## Known Stubs

Nenhum.

## User Setup Required

Nenhum. Não há banco, EF nem dependência nova, e não houve push.

## Next Phase Readiness

- O controle está pronto para a UAT da 52 (D4: aparência no vidro, nome longo de competência, alvo de 44px).
- O residual F13 entra no `52-SECURITY.md`.

## Self-Check: PASSED

- FOUND: `src/features/entrevista/components/EntrevistaScorecardInline.tsx`
- FOUND: `src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx`
- FOUND: `src/__tests__/guards/p52-ban-jargao-entrevista.grep.test.ts`
- FOUND: `60b277b5`, `593d3c60`, `92a2f766`, `f3a7e204` (ancestrais de HEAD)
- `check evaluation-scope --plan 52-07 --commits-only`: `resolved`, com os 4 commits do plano
- Critérios de aceite das duas tasks rodados de novo: `role="radiogroup"` presente, sem import de `Slider`, sem `clampScore`; casos do `<behavior>` verdes; guarda verde com sub-testes de mordida; tipografia OK; tsc 89

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*
