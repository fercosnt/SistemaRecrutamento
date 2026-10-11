---
phase: 52-hub-do-rh-dados-e-contato
plan: 02
subsystem: ui
tags: [react, radix-alert-dialog, vitest, avaliacao, candidato, jorn-60]

requires:
  - phase: 52-01
    provides: "refs/gsd/52/base, scripts/p52_tipografia.cjs (harness da fase)"
provides:
  - "SairDaProvaButton + COPY_SAIR_DA_PROVA (src/features/avaliacao/components/SairDaProvaButton.tsx): saída durante a prova, com confirmação de perda (memória) ou direta depois do flush (rascunho); um componente para as 6 telas — o Raven (52-03) reusa com rotulo=\"irAoPainel\""
  - "SJT MC e Prova cognitiva com confirmação «Sair da avaliação?» quando ≥1 resposta marcada (D-24, D-36, D-52-U15)"
  - "Big Five (introdução e páginas), Redação e Caso prático com saída direta depois de `await flushNow()`"
  - "[emenda 2026-10-11 (CR-01 do 52-REVIEW-PORTAO-1; decisão do operador em 52-14-DECISAO-RODADA-1.md P1, «Confirm like memory screens (Recommended)»; código aacef0a6 e 0b4d486b)] SUPERSEDE a linha anterior: Big Five e Caso prático confirmam a saída (memória → confirma) — Big Five com ≥1 resposta, Caso prático com texto não vazio; sem nada saem direto. Só a Redação sai direto, gravando antes só se houve edição (`flushSeEditou`)"
  - "Cronômetro do SJT MC: «Tempo decorrido: mm:ss (sem limite de tempo)» com tabular-nums (D-26, D-52-U20)"
  - "Guarda p52-ban-tempo-sugerido.grep (varredura recursiva de src/features/avaliacao, código e comentário, mordida provada)"
affects: [52-03, 52-14, 52-15, 52-25]

actuals:
  tokens: 10400
  tasks: 2
  commits: 4
plan_head_before: fa107dd0c76db97140aea1d745099d7e757e5122
plan_head_after: 38f7a7f60fc57ebc4349e0e6407ab5588459df8a

tech-stack:
  added: []
  patterns:
    - "Saída de tela de prova por um componente só, com a decisão «rascunho → direto; memória → confirma» tomada pela TELA (temRespostaNaoSalva / antesDeSair), não pelo componente"

key-files:
  created:
    - src/features/avaliacao/components/SairDaProvaButton.tsx
    - src/features/avaliacao/components/__tests__/SairDaProvaButton.test.tsx
    - src/__tests__/guards/p52-ban-tempo-sugerido.grep.test.ts
  modified:
    - src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx
    - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
    - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
    - src/features/avaliacao/components/RedacaoEditorScreen.tsx
    - src/features/avaliacao/components/SjtCasoAbertoScreen.tsx
    - src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx
    - src/features/avaliacao-cognitiva/components/__tests__/navegacao-cognitiva.test.tsx

key-decisions:
  - "Big Five: o botão também está na INTRODUÇÃO (página 0), por um slot opcional `acaoSair` do `BigFiveIntro` — a introdução é o primeiro render da prova (E8 «desde o primeiro render») e hoje não tinha saída. O `BigFiveIntro` renderizado sozinho (teste próprio) não muda: sem a prop, nada aparece"
  - "`antesDeSair` que rejeita não prende o candidato: o componente faz try/catch/finally e navega mesmo assim (E8 error: sair é navegação local; o rascunho segue no buffer do hook). O plano escrevia só try/finally, que deixaria a rejeição escapar como unhandled rejection do onClick"
  - "O guarda do cronômetro conta COMENTÁRIOS (ao contrário do `rotulos-navegacao-candidato`): o docblock ensinando a frase antiga é a forma mais provável de ela voltar (Pitfall 12)"
  - "Importação direta `./SairDaProvaButton` / `@/features/avaliacao/components/SairDaProvaButton`, nunca pelo barrel `components/index.ts` — o SJT MC documenta um ciclo de import pelo barrel"
  - "JORN-60 NÃO marcado completo em REQUIREMENTS.md: é declarado também pelos 52-03 (Raven), 52-14 e 52-15, ainda sem SUMMARY"

patterns-established:
  - "Telas com rascunho: `antesDeSair={flushNow}` com ordem flush→navegar verificada por flush DIFERIDO no teste (o sentinela da rota não pode aparecer antes de o flush terminar)"
  - "[emenda 2026-10-11 (CR-01 do 52-REVIEW-PORTAO-1; decisão do operador em 52-14-DECISAO-RODADA-1.md P1, «Confirm like memory screens (Recommended)»; código aacef0a6 e 0b4d486b)] «com rascunho» passou a ser só a Redação, e o `antesDeSair` dela é `flushSeEditou`, não `flushNow`"

requirements-completed: []

coverage:
  - id: D1
    description: "SJT MC: com 1 resposta, «Voltar às avaliações» abre «Sair da avaliação?» / «Se sair agora, as respostas desta prova não serão salvas.»; «Continuar» fecha e mantém a resposta; «Sair» vai a /candidato/avaliacao/:id; com 0 respostas sai direto, sem diálogo"
    requirement: JORN-60
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx#SJT múltipla escolha — saída durante a prova (52-02 / D-24, D-52-U15)"
        status: pass
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/SairDaProvaButton.test.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "Prova cognitiva no grupo da confirmação (D-36): 0 respostas → direto; 1 → diálogo, Continuar mantém, Sair navega"
    requirement: JORN-60
    verification:
      - kind: unit
        ref: "src/features/avaliacao-cognitiva/components/__tests__/navegacao-cognitiva.test.tsx#ProvaCognitivaScreen — saída durante a prova (52-02 / D-36)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Big Five (introdução e com resposta), Redação e Caso prático (com e sem texto): o clique chama flushNow e só navega depois que ele termina; nunca abre o diálogo"
    requirement: JORN-60
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx#Telas com rascunho — saída direta depois do flush (52-02 / D-24, D-36)"
        status: pass
    human_judgment: false
    amendment: "[emenda 2026-10-11 (CR-01 do 52-REVIEW-PORTAO-1; decisão do operador em 52-14-DECISAO-RODADA-1.md P1, «Confirm like memory screens (Recommended)»; código aacef0a6 e 0b4d486b)] o comportamento de D3 foi revogado para Big Five e Caso prático e o describe acima não existe mais (renomeado e dividido). A cobertura vigente é: navegacao-provas.test.tsx#Big Five e Caso prático — memória → confirma (52-02 rodada 1 / CR-01, D-36 emendada); navegacao-provas.test.tsx#Redação — a única tela que relê o rascunho: sai direto depois do flush (52-02 / D-24, D-36); RedacaoEditorScreen.saida-rascunho.test.tsx#Redação — sair não grava vazio por cima do rascunho (52-02 rodada 1 / WR-01). Medido em 2026-10-11: 3 arquivos, 29 testes verdes"
  - id: D4
    description: "Cronômetro do SJT MC diz «Tempo decorrido: mm:ss (sem limite de tempo)» com tabular-nums; a frase antiga não existe em src/features/avaliacao (código nem docblock)"
    requirement: JORN-60
    verification:
      - kind: unit
        ref: "src/__tests__/guards/p52-ban-tempo-sugerido.grep.test.ts"
        status: pass
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx#cronômetro diz «Tempo decorrido: mm:ss (sem limite de tempo)» com tabular-nums (D-26)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Aparência do botão e do diálogo na tela real (posição acima do título, «Sair» vermelho, foco inicial em «Continuar» visível, leitura em mobile)"
    requirement: JORN-60
    verification:
      - kind: other
        ref: "node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- <6 arquivos de tela/componente>"
        status: pass
    human_judgment: true
    rationale: "Os testes provam comportamento e classes; a leitura visual (contraste do vermelho sobre o glass, alinhamento no mobile) é julgamento — e o front ainda não foi publicado (sem push neste plano)."

duration: 9min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 02: Saída durante as provas e «Tempo decorrido» Summary

**`SairDaProvaButton` em cinco telas de prova do container. SJT MC e Prova cognitiva pedem confirmação de perda só com resposta marcada. Big Five, Redação e Caso prático saem direto depois de `await flushNow()`. O cronômetro do SJT MC diz «Tempo decorrido», e um guarda por forma impede a volta da frase antiga.**

## Emenda (2026-10-11) — Big Five e Caso prático confirmam a saída

Registro posterior ao fecho deste plano; o resto deste SUMMARY fica como estava (registro histórico do que o 52-02 entregou em 2026-10-11T04:07Z), inclusive o parágrafo de abertura acima. No portão do bloco B, o
`52-REVIEW-PORTAO-1` (CR-01) mostrou que Big Five e Caso prático **gravam** o rascunho mas **não o releem**:
sair sem aviso perdia as respostas. O operador decidiu (2026-10-11, `52-14-DECISAO-RODADA-1.md`, Pergunta 1,
verbatim «Confirm like memory screens (Recommended)») tratá-las como telas de memória. Commits da rodada:
`aacef0a6` (Big Five e Caso prático confirmam) e `0b4d486b` (Redação: sair ou blur antes da releitura não grava
`{}` — WR-01 do -1, que fecha o primeiro item dos Known Risks abaixo). O D3 do `coverage:` e as linhas de
`provides`/`patterns-established` levam a nota da emenda.

## Performance

- **Duration:** ~9 min
- **Started:** 2026-10-11T03:58:35Z
- **Completed:** 2026-10-11T04:07:29Z
- **Tasks:** 2 (Task 1 tracer + TDD; Task 2 TDD)
- **Files modified:** 10 (3 criados, 7 editados)

## Accomplishments

- Um componente só (`SairDaProvaButton`, `data-testid="sair-da-prova"`) com as seis frases travadas em `COPY_SAIR_DA_PROVA`. A tela decide o ramo: `temRespostaNaoSalva` (memória) ou `antesDeSair` (rascunho).
- SJT MC e Prova cognitiva: com ≥1 resposta, o diálogo «Sair da avaliação?»; «Continuar» é o `AlertDialogCancel` e recebe o foco inicial; «Sair» usa `bg-[#EF4444]`. Sem resposta, saem direto (D-52-U15).
- Big Five (introdução e páginas), Redação e Caso prático: saem direto, só depois que o `flushNow` do `useAutosaveAvaliacao` termina. O hook não mudou.
- O SJT MC agora diz «Tempo decorrido: mm:ss (sem limite de tempo)» com `tabular-nums`, e o docblock foi reescrito. O guarda `p52-ban-tempo-sugerido` varre `src/features/avaliacao` inteira, comentários incluídos, com sanidade de mordida e piso de 10 arquivos.

## Task Commits

1. **Task 1 (tracer): SJT MC, componente, «Tempo decorrido», ban**
   - `e4511be0` test(52-02): testes vermelhos (RED)
   - `a0d71b68` feat(52-02): saída durante o SJT MC com confirmação de perda; Tempo decorrido (GREEN)
2. **Task 2: Prova cognitiva (confirmação) e as três telas com rascunho**
   - `7c550501` test(52-02): testes vermelhos (RED)
   - `38f7a7f6` feat(52-02): saída durante a prova cognitiva e nas três telas com rascunho (GREEN)

Nenhum REFACTOR foi necessário.

## TDD Gate Compliance

**RED, Task 1:** o alvo foi `navegacao-provas › SJT múltipla escolha … › com 1 resposta → diálogo; …`. O classificador deu `RED_EVIDENCE_OK` (`target_test_failed`), sobre o relatório JUnit da execução (`NO_COLOR=1 DEBUG_PRINT_LIMIT=0 npx vitest run … --reporter=junit`). **Avaliação semântica:** o alvo rodou, marcou a resposta (a asserção `aria-checked="true"` passou) e falhou na asserção planejada, `Unable to find an element by: [data-testid="sair-da-prova"]`. No mesmo RED, os outros três casos do SJT MC também falharam por asserção, e o guarda (i) reprovou as duas linhas reais (`SjtMultiplaEscolhaScreen.tsx:9` e `:225`). O `SairDaProvaButton.test.tsx` não carregou (o módulo ainda não existia); por isso ele não foi o alvo.

**Nota de ferramenta:** o relatório `tap-flat` do Vitest foi recusado (`invalid_record`, «Non-TAP data in report»). O Testing Library escreve a mensagem de erro em várias linhas sem indentar, e com `DEBUG_PRINT_LIMIT=0` a linha «Ignored nodes» continua lá. Rodei de novo com o reporter JUnit, um formato suportado, e o XML foi entregue sem edição.

**RED, Task 2:** o alvo foi `navegacao-provas › Telas com rascunho … › Redação, com texto escrito → flush, depois a lista; sem diálogo`, com `RED_EVIDENCE_OK` via JUnit. **Avaliação semântica:** o título «Redação cultural» e o textbox renderizaram, a digitação aconteceu e o teste falhou na asserção planejada (botão de saída ausente). Os sete casos novos falharam todos pela mesma asserção, e todos os passos anteriores (heading, radio, «Começar», textbox) passaram.

**GREEN:** os dois `feat(52-02)` vieram depois dos `test(52-02)` correspondentes.

## Verificação (planejada)

| Portão | Resultado |
|---|---|
| `npx vitest run SairDaProvaButton.test.tsx navegacao-provas.test.tsx src/__tests__/guards` (Task 1) | 15 arquivos / 156 testes verdes |
| `npx vitest run src/features/avaliacao src/features/avaliacao-cognitiva src/__tests__/guards` (Task 2) | 47 arquivos / 373 testes verdes |
| lint (`npm run -s lint`) | exit 2, **89** `error TS`: a baseline, dentro do teto de 90. No RED da Task 1 foram 90, por causa do import do módulo ainda inexistente; voltou a 89 no GREEN |
| `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- <6 arquivos>` | `TIPOGRAFIA OK (196 linhas acrescentadas varridas)` |
| `npm run build` + marcador | `sair-da-prova` em `build/assets/index-DA3iZ537.js` (chunk eager, como previsto) |
| Suíte inteira (`npx vitest run`) | 2834/2836. Os 2 vermelhos são a baseline `promessasComExecutor.test.ts` |
| `rotulos-navegacao-candidato.grep` | verde, e seguindo mordendo (o componente carrega os dois rótulos novos) |

**Gate do tracer (Task 1):** a execução é interativa (`auto_advance=false`), em `human_verify_mode` padrão `end-of-phase`, e o `<verify>` do tracer é só `<automated>`. Rodei o verify de novo, ele ficou verde e a execução seguiu para a Task 2 sem checkpoint.

## Files Created/Modified

- `src/features/avaliacao/components/SairDaProvaButton.tsx`: o componente e as frases.
- `src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx`: botão na primeira linha do painel, «Tempo decorrido» e docblock.
- `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx`: botão com confirmação (D-36).
- `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx`: botão na introdução (slot `acaoSair`) e nas páginas, com `antesDeSair={autosave.flushNow}`.
- `src/features/avaliacao/components/RedacaoEditorScreen.tsx` e `SjtCasoAbertoScreen.tsx`: botão com `antesDeSair={flushNow}`.
- Testes: `SairDaProvaButton.test.tsx` (novo), `navegacao-provas.test.tsx` e `navegacao-cognitiva.test.tsx` (estendidos), `p52-ban-tempo-sugerido.grep.test.ts` (novo).

## Decisions Made

As decisões estão no frontmatter (`key-decisions`). Em resumo: o botão também aparece na introdução do Big Five; `antesDeSair` rejeitado não prende o candidato; o guarda conta comentários; a importação é direta, sem o barrel; e o JORN-60 continua aberto porque é compartilhado com 52-03, 52-14 e 52-15.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `antesDeSair` rejeitado escaparia como unhandled rejection**
- **Found during:** Task 1
- **Issue:** a ação do plano escrevia `try { await antesDeSair?.() } finally { navigate(destino) }`. Se a Promise rejeita (o `upsert` pode lançar por rede), a rejeição sobe do `onClick` assíncrono como unhandled rejection. A navegação acontece, mas fica um erro solto no console e no Vitest.
- **Fix:** `try { … } catch { /* o rascunho segue no buffer do hook */ } finally { navigate(destino) }`. O teste «com antesDeSair que rejeita → navega mesmo assim» cobre o caso.
- **Files modified:** `src/features/avaliacao/components/SairDaProvaButton.tsx`
- **Committed in:** `a0d71b68`

**2. [Rule 2 - Completude] Big Five: saída também na introdução**
- **Found during:** Task 2
- **Issue:** o plano dizia «primeira linha do painel da prova». No Big Five, o primeiro painel é a introdução (página 0), que não tinha nenhuma saída. A truth E8 pede o botão «desde o primeiro render da prova».
- **Fix:** slot opcional `acaoSair?: React.ReactNode` no `BigFiveIntro`, preenchido pela tela com o mesmo botão (saída direta depois do flush). Sem a prop, o `BigFiveIntro` renderiza como antes, e o `BigFiveIntro.test.tsx` segue verde.
- **Files modified:** `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx`
- **Committed in:** `38f7a7f6`

**3. [Ajuste de texto] O docblock do componente não cita o nome do evento de descarregamento da página**
- **Found during:** Task 1, na conferência dos critérios de aceite
- **Issue:** o critério «não contém … `beforeunload`» é um grep literal, e o docblock dizia «Não há `beforeunload`». Era verdade, mas casava o grep.
- **Fix:** o texto foi trocado por «O botão voltar do NAVEGADOR não é interceptado». O critério foi atendido sem afrouxar o grep.
- **Committed in:** `a0d71b68`

---

**Total deviations:** 3 (1 bug, 1 completude, 1 ajuste de texto para um critério literal)
**Impact on plan:** nenhum aumento de escopo. As três ficam dentro dos arquivos do plano.

## Issues Encountered

- O RED por TAP foi recusado pelo classificador. A causa e a troca para JUnit estão na nota de ferramenta acima.

## Known Risks (registrados, não consertados)

- **Flush de saída com buffer vazio grava `{}`.** O `flushNow` do hook faz `upsert({...bufferRef.current})` mesmo sem nenhuma edição na sessão. O plano manda não mudar o hook, então o risco fica registrado. Conferi quem lê o rascunho: Big Five e Caso prático **não restauram** o rascunho do banco (só a exportação LGPD lê `respostas_avaliacao`), então o `{}` não muda nada que o candidato veja. A Redação restaura e **semeia o buffer** na restauração (conserto de 2026-09-06), mas sobra uma corrida: clicar em «Voltar às avaliações» antes de o `loadResposta` responder grava `{}` por cima do rascunho. Ele é regravado 30 s depois pelo `update` tardio da restauração, se a aba continuar aberta. A janela é de uma leitura; o caso não foi testado.
- **Dois cliques rápidos no botão das telas com rascunho** disparam dois flushes. Fica como suposição do plano (*concurrency*), também não testado.

## Threat Flags

Nenhuma superfície nova: o botão só navega localmente. As ameaças T-52-04 e T-52-05 do plano estão mitigadas pelos testes D1–D3.

## User Setup Required

None. Nenhuma configuração externa.

## Next Phase Readiness

- O **52-03** (Raven) pode reusar `SairDaProvaButton` com `rotulo="irAoPainel"`, `destino="/candidato/dashboard"` e `temRespostaNaoSalva` derivado das respostas.
- O front **não foi publicado**: o plano não manda push. O marcador `sair-da-prova` só existe no build local.

## Self-Check: PASSED

- FOUND: `src/features/avaliacao/components/SairDaProvaButton.tsx`, `src/__tests__/guards/p52-ban-tempo-sugerido.grep.test.ts`, `src/features/avaliacao/components/__tests__/SairDaProvaButton.test.tsx`
- FOUND (ancestrais de HEAD): `e4511be0`, `a0d71b68`, `7c550501`, `38f7a7f6`
- `commits: 4` medido por `git rev-list --count fa107dd0..HEAD`

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*
