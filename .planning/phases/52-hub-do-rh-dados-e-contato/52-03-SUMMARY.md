---
phase: 52-hub-do-rh-dados-e-contato
plan: 03
subsystem: ui
tags: [react, tailwind, radix-alert-dialog, vitest, avaliacao-cognitiva, raven, candidato, jorn-60]

requires:
  - phase: 52-02
    provides: "SairDaProvaButton + COPY_SAIR_DA_PROVA (rotulo irAoPainel, confirmação de perda por temRespostaNaoSalva)"
  - phase: 52-01
    provides: "refs/gsd/52/base e scripts/p52_tipografia.cjs"
provides:
  - "AvaliacaoRavenScreen na shell da marca (RavenShell: BackgroundImage gradient + overlay preto 15%, container max-w-4xl) em todos os estados, inclusive carregamento"
  - "Saída «Ir ao painel» durante o Raven → /candidato/dashboard, com «Sair da avaliação?» quando há resposta enviada OU escolha do item atual"
  - "COPY.subtitulo e COPY.semVolta visíveis em todo item; grade com classes inteiras no fonte; matriz e alternativas em ladrilho branco; CTA accent sólido; tipografia 14/16/24 e 400/600"
affects: [52-14, 52-15, 52-25]

actuals:
  tokens: 6300
  tasks: 2
  commits: 4
plan_head_before: 0b9e420213a2013ff74bd75249fcc9215a01ffce
plan_head_after: c4e89b3ecd1f354a4d47e2ea04627fb8bf4cbd88

tech-stack:
  added: []
  patterns:
    - "Classe Tailwind responsiva escolhida em tempo de execução: a expressão devolve a classe INTEIRA (`'grid-cols-4 sm:grid-cols-8'`), nunca um prefixo interpolado; o teste prova o FONTE, porque o DOM não distingue o defeito do JIT"

key-files:
  created:
    - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-03/task1.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-03/task2.json
  modified:
    - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx

key-decisions:
  - "A prova da grade literal é sobre o FONTE, além do DOM: o template antigo também punha «sm:grid-cols-8» no atributo class (os dois testes por DOM ficaram verdes já no RED). O defeito é o JIT do Tailwind não gerar a classe; só a leitura do arquivo o enxerga"
  - "A shell envolve também os dois esqueletos de carregamento, não só os estados concluído/bloqueado: sem isso a tela piscava fundo claro → gradiente na troca de estado"
  - "O número da alternativa sem imagem (fallback) fica `text-slate-900`, não na escala branca: ele está sobre o ladrilho BRANCO sólido, onde branco seria invisível. A regra «slate → branco» do plano vale para texto sobre o glass"
  - "Alternativa marcada perde o `bg-[#35BFAD]/10`: o ladrilho fica branco sólido sempre (desenho preto sobre branco); a marcação é a borda e o anel accent, que o plano manda manter"
  - "Os botões «Ir ao painel» dos estados concluído/bloqueado continuam `GlassButton` com navegação direta (não há resposta a perder) e ganham `text-sm font-semibold text-white min-h-[44px]`"
  - "JORN-60 NÃO marcado completo em REQUIREMENTS.md: é declarado também pelos 52-14 e 52-15, ainda sem SUMMARY (mesma regra do 52-02)"

patterns-established:
  - "Telas de prova fora do container (Raven) usam SairDaProvaButton com rotulo=irAoPainel; a condição de perda inclui o estado de escolha ainda não enviada"

requirements-completed: []

coverage:
  - id: D1
    description: "Raven em andamento: sem nenhuma escolha, «Ir ao painel» vai direto a /candidato/dashboard; com escolha no item atual (não enviada) abre «Sair da avaliação?» — «Continuar» mantém item e escolha, «Sair» vai ao painel; com resposta anterior enviada e nenhuma escolha atual, também confirma"
    requirement: JORN-60
    verification:
      - kind: unit
        ref: "src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx#AvaliacaoRavenScreen — saída «Ir ao painel» durante a prova (52-03 / D-24, D-52-U14)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Shell da marca: BackgroundImage gradient + overlay bg-black 15%, container max-w-4xl, no estado em andamento e nos estados não liberado / já respondeu"
    requirement: JORN-60
    verification:
      - kind: unit
        ref: "src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx#AvaliacaoRavenScreen — shell da marca (52-03 / 51-UI-REVIEW Pilar 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Instruções visíveis no item 1 e no item 2; grade com classes inteiras no fonte (8 → grid-cols-4 sm:grid-cols-8; 6 → grid-cols-3 sm:grid-cols-6); CTA bg-[#35BFAD] text-white; tipografia do contrato"
    requirement: JORN-60
    verification:
      - kind: unit
        ref: "src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx#as instruções / grade / fonte / CTA"
        status: pass
      - kind: other
        ref: "node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "Guarda rotulos-navegacao-candidato verde e provado mordendo (arquivo temporário com o rótulo antigo o deixa vermelho; removido, volta a verde)"
    requirement: JORN-60
    verification:
      - kind: other
        ref: "terceiro <verify> da Task 2 (arquivo __p52_mordida_rotulo.tsx plantado e removido)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Aparência real do Raven na shell: contraste do glass sobre o gradiente, ladrilhos brancos das matrizes, grade de 8 no desktop e de 4 no mobile, CTA turquesa"
    requirement: JORN-60
    verification:
      - kind: other
        ref: "node scripts/p52_tipografia.cjs (classes) — sem conferência visual"
        status: pass
    human_judgment: true
    rationale: "Os testes provam classes e comportamento; a leitura visual (contraste, proporção das matrizes reais de 6/8 opções, toque no mobile) é julgamento — e o front não foi publicado (sem push neste plano)."

duration: 5min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 03: Raven na shell da marca com saída «Ir ao painel» Summary

**O Raven passa a viver na shell do candidato (gradiente com overlay de 15%, coluna `max-w-4xl`). Durante a prova há um «Ir ao painel» que pede confirmação de perda quando existe qualquer resposta, inclusive a escolha ainda não enviada do item atual. As instruções que estavam no `COPY` e nunca apareciam agora aparecem em todo item. A grade usa classes inteiras que o JIT gera, a matriz e as alternativas ficam em ladrilho branco e o «Próximo item» é turquesa sólido.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-10-11T05:11:54Z
- **Completed:** 2026-10-11T05:16:49Z
- **Tasks:** 2 (Task 1 tracer + TDD; Task 2 TDD)
- **Files modified:** 2 de código (1 criado, 1 editado) + 2 registros de evidência RED

## Accomplishments

- `RavenShell`, o mesmo molde do `ScreenShell` do SJT MC com `max-w-4xl`, envolve **todos** os estados da tela: carregamento, concluído, não liberado e em andamento.
- `SairDaProvaButton rotulo="irAoPainel" destino="/candidato/dashboard"` fica na primeira linha do painel. A condição de perda é `Object.keys(respostas).length > 0 || escolha !== null` (T-52-06): a escolha do item atual também se perde ao sair, então também conta.
- `COPY.subtitulo` (16/400, `text-white/80`) e `COPY.semVolta` (14/400, `text-white/70`) aparecem no cabeçalho de todo item.
- A grade usa `nOpcoes > 6 ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-3 sm:grid-cols-6'`. O template antigo nunca gerava `sm:grid-cols-*` no CSS, e a grade ficava com 3/4 colunas também no desktop.
- A matriz e as alternativas ficam em `bg-white rounded-lg p-2`. A alternativa marcada mantém `border-[#35BFAD] ring-2 ring-[#35BFAD]/40`.
- O CTA usa `bg-[#35BFAD] text-white` (com `hover:bg-[#35BFAD]/90`, `min-h-[44px]`, 14/600), e o trilho da barra é `bg-white/20`.
- Os três `h1` passam a `text-2xl font-semibold text-white`. O eyebrow passa a `text-sm font-semibold text-white/70`, sem caixa-alta, e os textos `slate-*` sobre o glass passam à escala branca.

## Task Commits

1. **Task 1 (tracer): saída «Ir ao painel» e shell**
   - `f63545c9` test(52-03): RED
   - `fc0a9be4` feat(52-03): Raven na shell da marca com saída «Ir ao painel» e confirmação de perda (GREEN)
2. **Task 2: instruções, grade literal, CTA, tipografia; guarda provado**
   - `9752815d` test(52-03): RED
   - `c4e89b3e` feat(52-03): instruções do Raven visíveis, grade literal, CTA accent e tipografia do contrato (GREEN)

Nenhum REFACTOR foi necessário.

## TDD Gate Compliance

**RED, Task 1.** Alvo: `AvaliacaoRavenScreen — saída «Ir ao painel» durante a prova (52-03 / D-24, D-52-U14) > escolha no item atual → diálogo; «Sair» vai a /candidato/dashboard`. O classificador deu `RED_EVIDENCE_OK` (`target_test_failed`) sobre o relatório JUnit da execução (`NO_COLOR=1 DEBUG_PRINT_LIMIT=0 npx vitest run … --reporter=junit`). Registro em `.red-52-03/task1.json`. **Avaliação semântica:** o alvo rodou. A liberação e as questões resolveram, e «Alternativa 1» foi encontrada e clicada. A falha veio na asserção planejada: `Unable to find an element by: [data-testid="sair-da-prova"]`. Os 7 casos falharam por asserção (4 sem botão de saída, 3 sem `BackgroundImage`), sem erro de import nem de fixture. Na primeira submissão, o classificador recusou o nome curto do alvo (`no_target_test_failure`). O JUnit do Vitest emite o nome qualificado `describe > teste`, e com esse nome o registro passou. O relatório não foi editado.

**RED, Task 2.** Alvo: `AvaliacaoRavenScreen — shell da marca (52-03 / 51-UI-REVIEW Pilar 2) > as instruções (subtítulo e «sem volta») estão no item 1 e continuam no item seguinte`, com `RED_EVIDENCE_OK` via JUnit (`.red-52-03/task2.json`). **Avaliação semântica:** a prova montou e a falha foi `COPY.subtitulo` ausente do DOM. A prova de fonte da grade e o CTA também falharam, cada um na sua asserção planejada. **Dois testes de grade por DOM ficaram verdes já no RED, e isso era esperado.** O template antigo também produz «sm:grid-cols-8» no atributo `class`, porque o defeito está no JIT do Tailwind e não no DOM. Por isso foi acrescentada a prova de fonte (`fonte: as classes da grade estão escritas inteiras`), que é o teste que morde. Os testes por DOM ficam como cobertura do comportamento.

**GREEN.** Os dois `feat(52-03)` vieram depois dos `test(52-03)` correspondentes.

## Verificação

| Portão | Resultado |
|---|---|
| `npx vitest run src/features/avaliacao-cognitiva src/__tests__/guards` (Task 1) | 25 arquivos / 206 testes verdes |
| Gate do tracer (interativo, `end-of-phase`, verify só `<automated>`) | verify rodado de novo, verde; seguiu para a Task 2 sem checkpoint |
| `npx vitest run src/features/avaliacao-cognitiva src/__tests__/guards` (Task 2) | 25 arquivos / 211 testes verdes |
| `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- …/AvaliacaoRavenScreen.tsx` | `TIPOGRAFIA OK (144 linhas acrescentadas varridas)` |
| Mordida do guarda de rótulos (3º `<verify>`, rodado como escrito) | `guarda de rotulos mordeu e voltou a verde`, exit 0; `git status --porcelain -- src` vazio |
| lint (`npm run -s lint`) | 89 `error TS` (a baseline); o hook aceitou os 4 commits (teto 96) |
| Suíte inteira (`npx vitest run`) | 2934/2936. Os 2 vermelhos são a baseline `promessasComExecutor.test.ts` |

## Files Created/Modified

- `src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx`: `RavenShell`, saída durante a prova, instruções, grade literal, ladrilhos, CTA accent e tipografia.
- `src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx` (novo): 12 casos (saída com 0/1 resposta e com resposta anterior, shell nos três estados, instruções em dois itens, grade por DOM e por fonte, CTA).
- `.planning/phases/52-hub-do-rh-dados-e-contato/.red-52-03/task{1,2}.json`: evidência RED.

## Decisions Made

As decisões estão no frontmatter (`key-decisions`). Em resumo:

- A grade é provada pelo fonte.
- A shell cobre também os esqueletos de carregamento.
- O número de fallback continua escuro sobre o ladrilho branco.
- A alternativa marcada perde o tingimento de fundo e mantém a borda e o anel.
- O JORN-60 segue aberto porque é compartilhado com os 52-14 e 52-15.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Teste que não mordia] Prova de fonte para a grade literal**
- **Found during:** Task 2 (RED)
- **Issue:** o `<behavior>` pedia «com nOpcoes = 8 a grade tem `grid-cols-4` e `sm:grid-cols-8`». Por DOM essa asserção já passava com o código defeituoso, porque o template interpolado também produz a string inteira no atributo `class`. Um RED só com ela seria *unexpected green*.
- **Fix:** acrescentado um teste que lê `AvaliacaoRavenScreen.tsx` e exige `'grid-cols-4 sm:grid-cols-8'` e `'grid-cols-3 sm:grid-cols-6'` escritos inteiros, e nenhum `sm:${`. Os testes por DOM continuam lá.
- **Files modified:** `AvaliacaoRavenScreen.shell.test.tsx`
- **Committed in:** `9752815d`

**2. [Ajuste de texto] O comentário da grade não cita o template antigo literalmente**
- **Found during:** Task 2 (GREEN)
- **Issue:** o comentário explicativo escrevia o template antigo com o prefixo e a interpolação, e casava a prova de fonte (`not.toMatch(/sm:\$\{/)`).
- **Fix:** o comentário passou a descrever o defeito em prosa («interpolava o sufixo depois do prefixo `sm:`»). O teste não foi afrouxado.
- **Committed in:** `c4e89b3e`

**3. [Rule 2 - Completude] A shell também nos esqueletos de carregamento**
- **Found during:** Task 1
- **Issue:** o plano pedia a shell no estado em andamento e nos estados concluído/bloqueado. Os dois `Skeleton` de carregamento ficariam sobre o fundo claro, e a tela piscaria na troca de estado.
- **Fix:** os dois esqueletos também ficam dentro de `RavenShell`.
- **Committed in:** `fc0a9be4`

---

**Total deviations:** 3 (1 teste que não mordia, 1 ajuste de texto para um critério literal, 1 completude)
**Impact on plan:** nenhum aumento de escopo. Tudo ficou nos dois arquivos do plano.

## Issues Encountered

- Na Task 1, o classificador de RED recusou o nome curto do alvo. Com o nome qualificado do JUnit (`describe > teste`), o mesmo relatório passou. Detalhe em «TDD Gate Compliance».

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova: a saída é navegação local e a resposta só sai no envio que já existia. T-52-06 está mitigada: `escolha !== null` entra na condição, coberta pelos casos «escolha no item atual (ainda não enviada)». T-52-SC: nenhuma instalação.

## User Setup Required

None. Nenhuma configuração externa.

## Next Phase Readiness

- O JORN-60 segue aberto até os 52-14 e 52-15.
- O front **não foi publicado**, porque o plano não manda push. As mudanças do Raven só existem no `main` local.

## Self-Check: PASSED

- FOUND: `src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx`, `src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx`, `.red-52-03/task1.json`, `.red-52-03/task2.json`
- FOUND (ancestrais de HEAD): `f63545c9`, `fc0a9be4`, `9752815d`, `c4e89b3e`
- `commits: 4`, medido por `git rev-list --count 0b9e4202..HEAD`

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*
