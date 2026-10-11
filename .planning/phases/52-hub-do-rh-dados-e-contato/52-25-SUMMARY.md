---
phase: 52-hub-do-rh-dados-e-contato
plan: 25
subsystem: ui
tags: [react, hub-rh, avaliacao-assincrona, tipografia, vitest, tdd]

requires:
  - phase: 52-11
    provides: "ScorecardAvaliacao com BigFiveResultadoHub e SjtMcDetalhe (o detalhe que agora monta aberto); refs/gsd/52/base e scripts/p52_tipografia.cjs"
  - phase: 52-10
    provides: "hub em quatro abas; seção assíncrona na aba Avaliações; os 2 achados de tipografia herdados («Linha do funil», «Currículo»)"
  - phase: 52-24
    provides: "RespostasInscricaoBloco (um dos arquivos da varredura tipográfica do verify)"
provides:
  - "Seção «Avaliação assíncrona» (título com «a» minúsculo) com COPY_AVALIACOES_RESPONDIDAS.contagem(n) UMA vez e o ScorecardAvaliacao aberto logo abaixo, dentro da seção"
  - "estadoDaAssincrona (local ao HubCandidatoRH): havendo linha sjt/big_five → com_dados em qualquer etapa; sem linha → estadoDoInstrumento de hoje"
  - "AvaliacoesRespondidasBloco.tsx reduzido à constante COPY_AVALIACOES_RESPONDIDAS (contagem, nenhuma)"
  - "Título de seção do hub em text-2xl fixo nos 5 lugares (D-52-U22)"
  - "hubVerRespostas.test.tsx substituído: contagem única, sem «Ver respostas», detalhe aberto na seção, o dado vence a etapa"
affects: [52-14, 52-15, 52-UAT]

actuals:
  tokens: 44227   # chars/4 do diff inteiro fa8638e6..50e6b189 (176908 chars; inclui os 3 registros RED com o JUnit embutido); só src/: 8928
  tasks: 1
  commits: 2
plan_head_before: fa8638e661e6870d737eab7ab26eeaf0ecb68378
plan_head_after: 50e6b189

tech-stack:
  added: []
  patterns:
    - "Estado de seção em que o dado vence a etapa: função própria que devolve com_dados quando há linha e delega ao estadoDoInstrumento quando não há"
    - "Mordida de RED separada do rótulo: rodada extra com SÓ o título trocado (edição temporária, revertida) para provar que o caso de comportamento falha na asserção dele, e não no heading"

key-files:
  created:
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-25/task1-contagem-uma-vez.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-25/task1-sem-ver-respostas.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-25/task1-dado-vence-etapa.json
  modified:
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/features/hub-candidato/components/HubSection.tsx
    - src/features/agendamento/components/AgendamentoBlock.tsx
    - src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx
    - src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx
    - src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx
    - src/features/hub-candidato/components/__tests__/hubAbas.test.tsx

key-decisions:
  - "A regra «o dado vence a etapa» mora numa função própria (estadoDaAssincrona), não dentro do estadoDoInstrumento: a Prova cognitiva e a Redação usam o estadoDoInstrumento e continuam presas à etapa — o plano muda SÓ esta seção"
  - "Sem linha, a seção segue o estado de hoje (futuro / sem_dados / nao_se_aplica). Por isso «Nenhuma avaliação respondida ainda.» não aparece mais no hub: a casca da seção já diz o vazio. A chave `nenhuma` fica na constante, como o plano manda"
  - "A contagem fica em text-sm, como a linha que já existia na seção. Não mudou de tamanho"
  - "Erro de leitura numa vaga nao_aplica: o HubSection mostra o erro (precedência do AsyncState) e não monta o detalhe. Antes, o «Ver respostas» continuava ao lado do erro. O caso do hubEmptyState passou a travar «erro, nunca Não se aplica»"

patterns-established:
  - "Teste do hub que precisa provar o detalhe montado SEM o conteúdo dele: mock parcial de ScorecardAvaliacao (marcador `stub-scorecard-avaliacao`) com o linhasDeAvaliacao real"

requirements-completed: [JORN-58]

coverage:
  - id: D1
    description: "A contagem «N avaliações respondidas» aparece uma vez só no hub (defeito c). O «Ver respostas» saiu (D-52-U03)"
    requirement: JORN-58
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx#«3 avaliações respondidas» aparece exatamente UMA vez no hub"
        status: pass
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx#nenhum «Ver respostas» / «Ocultar respostas»"
        status: pass
    human_judgment: false
  - id: D2
    description: "O ScorecardAvaliacao monta aberto dentro da seção, logo depois da contagem, com as linhas que o número conta (C-8)"
    requirement: JORN-58
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx#o ScorecardAvaliacao está montado ABERTO dentro da seção"
        status: pass
    human_judgment: false
  - id: D3
    description: "O dado vence a etapa: com linha sjt/big_five a seção é com_dados em inscricao/triagem. Sem linha a etapa ainda manda, e nao_se_aplica fica como estava"
    requirement: JORN-58
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx#o dado vence a etapa (inscricao, triagem) + zero linhas em etapa anterior"
        status: pass
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx#«Não se aplica» só com evidência positiva (6 casos)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Títulos de seção do hub em text-2xl fixo nos 5 lugares; p52_tipografia verde sobre os arquivos de tela do hub"
    requirement: JORN-58
    verification:
      - kind: other
        ref: "node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- HubCandidatoRH.tsx HubSection.tsx DadosCadastroBloco.tsx RespostasInscricaoBloco.tsx AgendamentoBlock.tsx → TIPOGRAFIA OK (748 linhas)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Leitura e hierarquia da aba Avaliações toda aberta (contagem, cards SJT MC / caso aberto / Big Five), e os títulos a 24px abaixo de 768px"
    verification: []
    human_judgment: true
    rationale: "As RPCs do 52-11 não estão em PROD (52-15). A ordem dos cards, a densidade da aba aberta e a quebra do título a 360px pedem olho humano no UAT da fase"

duration: 6min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 25: «Avaliação assíncrona» aberta, contagem uma vez, títulos em 24px Summary

**A seção «Avaliação assíncrona» agora diz «N avaliações respondidas» uma vez e mostra o ScorecardAvaliacao aberto dentro dela. Isso vale em qualquer etapa em que haja linha `sjt`/`big_five`. O «Ver respostas» saiu do hub, e os cinco títulos de seção estão em `text-2xl`.**

## Performance

- **Duration:** ~6 min (relógio da sessão: 05:52:14Z → 05:57:59Z)
- **Started:** 2026-10-11T05:52:14Z
- **Completed:** 2026-10-11T05:57:59Z
- **Tasks:** 1 (tracer, TDD)
- **Files modified:** 7 de código e teste, mais 3 registros RED

## Accomplishments

- **Defeito (c) resolvido.** A frase aparecia duas vezes: uma na seção e outra no bloco irmão. Agora aparece uma vez, dentro da seção, com o `ScorecardAvaliacao` logo abaixo (D-18, D-52-U03).
- **O dado vence a etapa.** `estadoDaAssincrona` devolve `com_dados` sempre que houver linha, em qualquer etapa (inclusive `inscricao`/`triagem` ou etapa desconhecida). Sem linha, vale o `estadoDoInstrumento` de hoje, e `nao_se_aplica` não mudou. Assim se mantém o motivo pelo qual o bloco era irmão na 51-02 (caminho em qualquer etapa), mas sem o botão.
- **`AvaliacoesRespondidasBloco.tsx`** ficou só com `COPY_AVALIACOES_RESPONDIDAS` (`contagem`, `nenhuma`). O cabeçalho diz por que o arquivo continua. O componente, `botaoAbrir` e `botaoOcultar` saíram.
- **D-52-U22.** `text-2xl` fixo em `HubSection.tsx`, em «Linha do funil», «Currículo», no h1 «Candidatura não encontrada» e na linha do título do `AgendamentoBlock.tsx` (só essa linha do arquivo). Os 2 achados de tipografia herdados do 52-10 sumiram.
- **`hubVerRespostas.test.tsx` substituído, não apagado.** Os casos do botão (`hub-ver-respostas`, `aria-expanded`/`aria-controls`, detalhe só depois do clique) deram lugar a casos que travam o comportamento novo. O caso C-8 (`linhasDeAvaliacao`) ficou como estava.

## Task Commits

1. **Task 1 (tracer): «Avaliação assíncrona» aberta, contagem uma vez, o dado vence a etapa, títulos em 24px**
   - RED `31a42669` (test): os três arquivos de teste e os três registros de evidência RED
   - GREEN `50e6b189` (feat): hub, seção, agendamento e constante

**Plan metadata:** commit do SUMMARY (este arquivo); STATE/ROADMAP num commit separado, à mão.

## Files Created/Modified

- `src/features/hub-candidato/components/HubCandidatoRH.tsx`: seção aberta, título «Avaliação assíncrona», `estadoDaAssincrona`, `assincronaNaoSeAplica` removido, três títulos em `text-2xl`
- `src/features/hub-candidato/components/HubSection.tsx`: título em `text-2xl`
- `src/features/agendamento/components/AgendamentoBlock.tsx`: título em `text-2xl` (uma linha)
- `src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx`: só a constante
- `src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx`: substituído (10 casos)
- `src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx`: casos do «Ver respostas» trocados pelo detalhe dentro da seção, mais um caso novo (ver Deviations)
- `src/features/hub-candidato/components/__tests__/hubAbas.test.tsx`: título e stub (ver Deviations)
- `.planning/phases/52-hub-do-rh-dados-e-contato/.red-52-25/*.json`: os três registros RED

## Decisions Made

As decisões estão em `key-decisions`. A principal: a regra «o dado vence a etapa» é uma função só desta seção, e não uma mudança no `estadoDoInstrumento`, porque a Prova cognitiva e a Redação continuam presas à etapa.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `hubAbas.test.tsx` travava o bloco que o plano tira do hub**
- **Found during:** Task 1 (RED)
- **Issue:** o caso `?aba=avaliacoes` do 52-10 procurava o heading «Avaliação Assíncrona», que o plano renomeia para «a» minúsculo. Também exigia o stub `stub-ver-respostas` do `AvaliacoesRespondidasBloco`, componente que a D-52-U03 tira do hub. O arquivo não está em `files_modified`.
- **Fix:** o título passou para «Avaliação assíncrona». O mock do bloco foi removido (virou mock morto). A asserção do stub foi trocada por `queryByText('Ver respostas')` nulo. Que o detalhe mora na seção da aba Avaliações já é travado no `hubVerRespostas.test.tsx`. Nenhuma outra asserção mudou.
- **Revisor (52-14):** conferir. É a única edição de teste fora da lista do plano, e troca um lock do comportamento antigo por um do comportamento novo. Não afrouxa nada.
- **Committed in:** `31a42669`

**2. [Registro pedido pelo plano] `hubEmptyState.test.tsx` mudou por causa da D-52-U03**
- O mock do bloco (`hub-ver-respostas`) virou um mock parcial do `ScorecardAvaliacao` (`stub-scorecard-avaliacao`), com o `linhasDeAvaliacao` real.
- Os títulos dos casos do hub passaram para «Avaliação assíncrona». O caso isolado do `HubSection`, com título arbitrário, ficou igual.
- Os cinco casos que exigiam o «Ver respostas» ficaram assim:
  - nao_aplica sem linha → nenhum detalhe;
  - nao_aplica com linha → detalhe dentro da seção;
  - vaga desconhecida sem linha → «Sem dados nesta etapa», sem detalhe;
  - redação nao_aplica → a assíncrona diz «Sem dados nesta etapa»;
  - erro de leitura → erro, nunca «Não se aplica».
- Caso novo: etapa `triagem` com linha → detalhe aberto.

---

**Total deviations:** 1 auto-fixed (Rule 3) + 1 ajuste registrado que o plano já previa.
**Impact on plan:** nenhum escopo novo. As duas edições trocam locks do «Ver respostas» por locks do comportamento que o substitui.

## Issues Encountered

- **No RED real, 7 dos 10 casos do `hubVerRespostas` falham antes no heading,** porque o título ainda era «Avaliação Assíncrona». Para separar título de comportamento, rodei uma segunda vez com SÓ o título trocado no `HubCandidatoRH` (edição temporária, desfeita com `git checkout --` do arquivo e nunca commitada). Nessa rodada, todos os casos de comportamento falharam na asserção deles. O de etapa anterior, por exemplo, falhou porque «Etapa ainda não iniciada» estava presente. Esse é o registro `task1-dado-vence-etapa.json`.

## TDD Gate Compliance

- **RED** `31a42669`. Três alvos, todos `RED_EVIDENCE_OK (target_test_failed)` em relatório JUnit, sem erro de coleta, import ou fixture:
  - **`task1-contagem-uma-vez.json`** (rodada 1: 38 casos, 16 falhas, 0 erros, exit 1). Falha `expected [<p>, <p>] to have a length of 1 but got 2`, que é o próprio defeito (c).
  - **`task1-sem-ver-respostas.json`** (mesma rodada). Falha `expected <button …> to be null`: o `hub-ver-respostas` ainda existia.
  - **`task1-dado-vence-etapa.json`** (rodada de mordida com só o título trocado: 10 casos, 8 falhas). Falha na asserção de que «Etapa ainda não iniciada» deveria ser nula em `triagem` com linha `sjt`.
- **GREEN** `50e6b189`. Os 28 casos dos dois arquivos alvo passaram.
- **REFACTOR:** nenhum.
- **Mutações sobre o GREEN** (arquivo copiado, mutado e restaurado; `cmp` confirmou a restauração). Todas mordem:
  - o dado não vence a etapa → 3 falhas;
  - sem o `ScorecardAvaliacao` → 5 falhas;
  - contagem duplicada → 5 falhas;
  - `nao_se_aplica` perdido → 1 falha.

## Verification

| Comando | Resultado |
|---|---|
| `npx vitest run src/features/hub-candidato src/features/agendamento src/features/avaliacao src/__tests__/guards` | 74 arquivos, **725/725** |
| `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- HubCandidatoRH.tsx HubSection.tsx DadosCadastroBloco.tsx RespostasInscricaoBloco.tsx AgendamentoBlock.tsx` | `TIPOGRAFIA OK (748 linhas acrescentadas varridas)`, exit 0; `--auto-teste` ok (16 casos) |
| a mesma varredura antes deste plano (`base..HEAD~1`) | os 2 `h2` com `text-xl … md:text-2xl` («Linha do funil», «Currículo») |
| `grep -nE "text-xl\|md:text-2xl"` nos componentes do hub e no `AgendamentoBlock` | nenhuma linha |
| lint (`npm run -s lint`) | exit 2, **89** `error TS` (baseline; nenhum em arquivo deste plano), verify `≤ 90` ok; hook do commit: `tsc errors: 89 (frozen baseline: 96)` |
| suíte inteira `npx vitest run` | **3048/3050**: só os 2 reds de baseline em `promessasComExecutor.test.ts` |
| tracer gate (interativo, `end-of-phase`, verify só `<automated>`) | verify re-rodado e verde, sem checkpoint. O plano não tem tarefa de expansão |

## Known Stubs

Nenhum. A chave `COPY_AVALIACOES_RESPONDIDAS.nenhuma` não é usada no hub, porque a casca da seção já diz o vazio. Ela fica por ordem do plano: a constante mantém `contagem` e `nenhuma`.

## Deferred (fora do escopo, para registro)

- Três comentários de documentação ainda descrevem o «Ver respostas»:
  - `ScorecardAvaliacao.tsx:14-15` («o hub do RH o abre no lugar, pelo «Ver respostas» …»);
  - `BigFiveResultadoHub.tsx:23` (`@see … AvaliacoesRespondidasBloco.tsx (recolhível acessível)`);
  - o mock morto `AvaliacoesRespondidasBloco` em `contatoCandidatoHeader.test.tsx:81-84`. Ele é inofensivo: o teste monta `?aba=resumo` e o hub não importa mais o componente.
- Nenhum desses três arquivos está no plano. Ficam para uma passada de documentação (ou para o 52-14).
- A ordem dos cards dentro do `ScorecardAvaliacao` (UI-SPEC: SJT MC → Caso aberto → Big Five) segue a ordem das linhas para MC e caso aberto, com o Big Five por último. Isso é do 52-11 e não mudou aqui.

## Threat Flags

Nenhuma superfície nova. T-52-73 (accept) está como o plano prevê: a seção mostra em etapa anterior o que o RH já lia por RLS/RPC. A etapa era apresentação, não controle de acesso. Nenhuma instalação (T-52-SC).

## User Setup Required

Nenhum. Nada foi publicado (52-15) e não houve push.

## Next Phase Readiness

- A aba Avaliações está toda aberta, e os títulos do hub estão no contrato tipográfico. Os achados de tipografia do `HubCandidatoRH` que o 52-10 e o 52-24 registraram estão resolvidos.
- Para o 52-14: conferir a edição do `hubAbas.test.tsx` (Deviation 1) e os comentários desatualizados listados acima.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- FOUND: os 7 arquivos de código e teste e os 3 registros `.red-52-25/*.json`
- FOUND: `31a42669` e `50e6b189` (ancestrais de HEAD)
