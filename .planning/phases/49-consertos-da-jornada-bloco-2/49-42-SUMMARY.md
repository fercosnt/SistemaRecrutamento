---
phase: 49-consertos-da-jornada-bloco-2
plan: "42"
subsystem: ui
tags: [jorn-41, prompt-injection, sinal-revisao, rotuloDoSinal, sinaisDe, entrevista, comparativo, decisao-final, pdf, jspdf, ai-logs, filtro-celula, rnf-07a, rf-24, react, vitest, mutacao]
status: complete

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "38"
    provides: "_shared/sinal-revisao.ts (rotuloDoSinal, sinaisDe, SINAL_INSTRUCAO_AO_MODELO), a linha-evento none prompt_injection_flagged e o rótulo dela em CAUSA_FALLBACK_ROTULO"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "40"
    provides: "entrevista_analises.bias_flags com o elemento { sinal } e comparativo ranking.sinais_revisao (chave ausente sem sinal)"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "41"
    provides: "o idioma das telas (import relativo de _shared, tom âmbar, tomDestrutivo por token) e os arnêses red41.cjs/mut41.cjs"
provides:
  - "TranscricaoReviewPanel: SinalRevisaoAviso (âmbar) por análise, na vigente e na superada, lido de sinaisDe(bias_flags); pendentes/flagFired/bloqueado seguem só com bloqueio_avanco"
  - "exportComparativo(candidates, proveniencia?, sinais?): uma linha rotuloDoSinal por código distinto abaixo da proveniência, a tabela desce com a mesma folga; sem sinais, o PDF de antes; ComparativeRankingView.sinais_revisao?"
  - "ComparativoScreen: prop sinaisRevisao (undefined = não fiado), aviso âmbar acima do ranking, 3º argumento do exportComparativo"
  - "ComparativoCandidatosPage e DecisaoFinalPage fiam sinaisDe(ranking.sinais_revisao) — os 2 consumidores de <ComparativoScreen"
  - "aiLogsService: EstadoChamada com 'sinal', estadoDaChamada (movido da página) e o filtro de Status derivado dele; AiLogsFilters.status: EstadoChamada"
  - "AiLogsPage: selo «Sinal» âmbar com a causa legível; Select com Todos/Sucesso/Fallback/Falha/Sinal; reexporta estadoDaChamada"
  - "28 testes Vitest novos (9 da Task 1, 8 da Task 2, 11 da Task 3), inclusive o teste de concordância filtro ≡ célula com a semântica SQL do nulo"
affects: [49-43 (push, prova do chunk e conferência visual das telas), JORN-41]

actuals:
  tokens: 11768
  tasks: 3
  commits: 6
  plan_head_before: 757a15398bd393debb0c8301534b1e187ab8c31a
  plan_head_after: 48deef2cbe49898cb2292d12ce1117f57a660476

tech-stack:
  added: []
  patterns:
    - "Marca de leitura x bandeira de avanço: o sinal é renderizado junto da análise e fica FORA de pendentes/bloqueado. O teste que distingue as duas usa duas vigentes (bandeira confirmada numa, sinal na outra), porque com uma vigente só a mutação não morderia"
    - "Filtro ≡ célula: o predicado do estado mora no serviço, e o filtro é a tradução dele estado por estado. O teste aplica os filtros capturados do cliente mockado a cada forma de linha com a semântica SQL do nulo (neq sobre nulo não seleciona)"
    - "Folga medida na execução: o PDF confere que a linha do sinal tem até a tabela a MESMA folga que a proveniência já tem, lida da própria chamada e não de constante copiada"
    - "RED que passa no pre-commit: a assinatura/prop nova entra no teste por um alias tipado largo (exportarComSinais, TelaComSinais, cast do status), que o GREEN remove"

key-files:
  created: []
  modified:
    - src/features/entrevista/components/TranscricaoReviewPanel.tsx
    - src/features/entrevista/components/__tests__/TranscricaoReviewPanel.test.tsx
    - src/features/triagem/pdf/exportComparativo.ts
    - src/features/triagem/pdf/__tests__/exportComparativo.test.ts
    - src/features/triagem/components/ComparativoScreen.tsx
    - src/features/triagem/components/__tests__/ComparativoScreen.test.tsx
    - src/components/pages/ComparativoCandidatosPage.tsx
    - src/components/pages/__tests__/ComparativoCandidatosPage.test.tsx
    - src/features/decisao/components/DecisaoFinalPage.tsx
    - src/features/decisao/components/__tests__/DecisaoFinalPage.test.tsx
    - src/features/admin/ai-logs/components/AiLogsPage.tsx
    - src/features/admin/ai-logs/components/__tests__/AiLogsPage.test.tsx
    - src/features/admin/ai-logs/services/aiLogsService.ts
    - src/features/admin/ai-logs/services/__tests__/aiLogsService.test.ts

key-decisions:
  - "Entrevista: o aviso aparece também na análise SUPERADA que teve o sinal. O plano diz «para cada análise renderizada», e a marca é da análise, não da vigência. A falha não recebe aviso, porque o caminho falhou não grava sinal (49-40)"
  - "Entrevista: o aviso fica sob o cabeçalho da análise (título + selos), em âmbar, com role=note. Não entra no bloco «Bandeiras» nem no tooltip do Avançar"
  - "PDF: a primeira linha do cabeçalho fica em y=20 (a da proveniência, ou a do sinal sem ela), mais 5 por linha, e a tabela começa 6 abaixo da última. Com só a proveniência isso dá 26, o valor de antes. Sem linha nenhuma, 22. Códigos repetidos saem uma vez"
  - "Comparativo: as duas páginas passam sinaisDe(...), que devolve sempre um array. A prop sai FIADA, e [] quer dizer «sem sinal». O handleExport passa a prop como veio: undefined só num consumidor que não fia"
  - "Admin: estadoDaChamada testa o código do sinal ANTES de success. Filtros: sinal = eq(error_code, sinal); falha = eq(success,false) + or(error_code.is.null, error_code.neq.sinal); fallback = eq(success,true) + not(error_code is null) + neq(error_code, sinal); sucesso = eq(success,true) + is(error_code, null). As quatro formam uma partição, o que fecha também a discordância antiga do 49-15 («Sucesso» listava fallbacks)"
  - "O código do sinal no serviço vem de AI_ERROR_CODE.prompt_injection_flagged (import relativo de _shared), e não é uma string repetida"
  - "Nenhum deploy, nenhum push (são do 49-43); nenhuma leitura nem escrita em PROD"
  - "requirements-completed fica []: JORN-41 não é marcado neste plano (resta o 49-43, e quem marca é o verificador)"

requirements-completed: []

coverage:
  - id: D1
    description: "Aba da transcrição: análise com { sinal } em bias_flags mostra o rótulo pt-BR (vigente e superada); o sinal sozinho não abre o bloco da bandeira nem o botão de confirmar; sinal + bandeira pendente = dois avisos e o gating de hoje; bandeira confirmada + sinal noutra vigente = Avançar habilitado"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "src/features/entrevista/components/__tests__/TranscricaoReviewPanel.test.tsx#TranscricaoReviewPanel — o sinal de instrução à IA (49-42 / JORN-41) (5 testes)"
        status: pass
      - kind: other
        ref: "mut41.cjs (scratchpad): P1 do plano (sinal em pendentes) exit 1 no teste «sinal SEM trava»; P2 (sinal em flagFired), P3 (aviso não renderizado), P4 (vermelho) exit 1; restaurado=true"
        status: pass
    human_judgment: false
  - id: D2
    description: "PDF do comparativo: com o código em sinais, uma linha com EXATAMENTE rotuloDoSinal, entre o título e a tabela, com a folga da proveniência; com proveniência, y distintos; código repetido sai uma vez; sem sinais ou [], o PDF de hoje"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "src/features/triagem/pdf/__tests__/exportComparativo.test.ts#exportComparativo — o sinal de revisão no cabeçalho (49-42 / JORN-41) (4 testes) + os 8 de antes, sem remoção"
        status: pass
      - kind: other
        ref: "mut41.cjs: Q1 (código cru), Q2 (tabela não desce), Q3 (sinal sobre a proveniência), Q4 (sem dedupe), Q5 (folga menor só com sinal) exit 1; restaurado=true"
        status: pass
    human_judgment: false
  - id: D3
    description: "Comparativo e Decisão Final: aviso acima do ranking com sinaisRevisao; nada com [] ou sem a prop; Exportar PDF passa o código como 3º argumento (undefined sem a prop); as duas páginas fiam a prop a partir do ranking"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "ComparativoScreen.test.tsx#o sinal de revisão do ranking (4) + DecisaoFinalPage.test.tsx#o sinal de revisão do ranking chega ao comparativo embutido (2) + ComparativoCandidatosPage.test.tsx#sinaisRevisao vem do ranking da EF (2)"
        status: pass
      - kind: other
        ref: "verify da Task 2 → «todo consumidor fiado» (2 consumidores); mut41.cjs: N1..N6 exit 1; restaurado=true"
        status: pass
    human_judgment: false
  - id: D4
    description: "Log do admin: linha-evento do sinal = «Sinal» com a causa legível, nunca «Falha»; três estados de hoje iguais; Select com os quatro estados; filtro ≡ célula em 7 formas × 4 estados"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "aiLogsService.test.ts#filtro de Status ≡ célula de Status (5) + AiLogsPage.test.tsx#o estado «Sinal» (6) + forbidden-strings.grep.test.ts"
        status: pass
      - kind: other
        ref: "mut41.cjs + sha256: M1 do plano (Falha = só success=false) exit 1 na concordância; M2 (neq perde o nulo), M3 (sem estado sinal), M4 («Sucesso» antigo), M5 (Select sem Sinal), M6 (vermelho) exit 1; shasum -c OK"
        status: pass
    human_judgment: false
  - id: D5
    description: "Regressão: vitest inteiro e teto D-53"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "CI=true npx vitest run → 218 arquivos, 2374 testes, 0 falhas; npm run lint → RC 2, 89 error TS (início 89, teto 90)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Conferência visual: o aviso da transcrição, o do comparativo e da Decisão Final, a legibilidade da linha longa no PDF landscape e o selo «Sinal» no admin"
    requirement: JORN-41
    verification: []
    human_judgment: true
    rationale: "Os testes provam o texto, a presença, a posição relativa, o tom por classe e a folga no PDF mockado, mas não o layout real nem o PDF renderizado. O front não foi publicado (o push é do 49-43), e a conferência visual é do checkpoint do 49-43"

duration: 14min
completed: 2026-09-30
---

# Phase 49 Plan 42: O sinal de instrução à IA aparece na entrevista, no comparativo, na Decisão Final, no PDF exportado e no log do admin Summary

**Na aba da transcrição, uma análise cujo `bias_flags` traz `{ sinal }` mostra o rótulo pt-BR em âmbar, e o avanço continua decidido só por `bloqueio_avanco`, como no portão do servidor. O comparativo e a Decisão Final mostram o aviso acima do ranking com `sinaisRevisao`, fiado nas duas páginas. O PDF exportado imprime a mesma frase, importada de `_shared/sinal-revisao.ts`, entre o título e a tabela. No admin, a linha-evento do 49-38 é «Sinal», e não «Falha». O filtro de Status passou a ser a tradução de `estadoDaChamada`, que mora no serviço, e um teste de concordância com a semântica SQL do nulo prova filtro ≡ célula em 7 formas × 4 estados. Nenhuma trava nova, e o tsc ficou em 89.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-09-30T07:16:29Z
- **Completed:** 2026-09-30T07:30:20Z
- **Tasks:** 3 de 3
- **Files modified:** 14 (0 criados, 14 editados; 12 do `files_modified` e 2 testes de página, ver Desvios)

## Accomplishments

- **Entrevista (`TranscricaoReviewPanel`).**
  - `SinalRevisaoAviso` renderiza, sob o cabeçalho da análise vigente e dentro do `<details>` da superada, o `rotuloDoSinal` de cada código que `sinaisDe(bias_flags)` encontra. As flags de viés do modelo são ignoradas.
  - `pendentes`, `flagFired`, `bloqueado` e o CTA ficaram como estavam.
  - O docblock da regra da revisão ganhou o parágrafo «marca de leitura, não bandeira de avanço», com referência ao `49-40-PLAN.md`.
- **PDF (`exportComparativo`).**
  - Recebe um terceiro parâmetro opcional, `sinais`, e imprime uma linha por código distinto, abaixo da proveniência. O `startY` passou a ser «última linha + 6», o que reproduz o 26 de antes quando só há proveniência.
  - Sem sinais, as chamadas de `doc.text` e o `startY` são os de hoje.
  - O docblock registra a decisão (a), o precedente D-27(b) aplicado pelo planejador, e que o operador não decidiu sobre o PDF.
- **Comparativo e Decisão Final.**
  - `ComparativoScreenProps.sinaisRevisao` segue o idioma de `provedorIa`: `undefined` quer dizer «não fiado».
  - O aviso âmbar fica acima da tabela, e o `handleExport` passa a prop como 3º argumento.
  - As duas páginas fiam `sinaisDe(…ranking?.sinais_revisao)`.
  - Varredura D-50: `grep -rln '<ComparativoScreen' src` fora de testes dá **2 consumidores**, `ComparativoCandidatosPage.tsx` e `DecisaoFinalPage.tsx`. Os dois estão fiados, e não há terceiro.
- **Log do admin.**
  - `EstadoChamada` e `estadoDaChamada` foram para o `aiLogsService.ts`, com o docblock do 49-15 e o parágrafo do sinal. O código do sinal é testado antes de `success`.
  - `AiLogsFilters.status` passou a ser `EstadoChamada`, e o `listAiLogs` traduz cada estado para a consulta.
  - A página reexporta `estadoDaChamada` e mostra «Sinal» em âmbar com a causa do mapa. O Select ganhou «Fallback» e «Sinal».

## Task Commits

1. **Task 1 (tracer, TDD):**
   - RED `49e7a6a1`: test(49-42).
   - GREEN `3103e36a`: feat(49-42).
   - Portão do tracer: modo `interactive`, `human_verify_mode` ausente (logo `end-of-phase`), verify só com `<automated>`. O verify rodou de novo com exit 0 (50/50). O tracer está verificado de ponta a ponta, e a expansão seguiu.
2. **Task 2 (TDD):** RED `0241e750` test(49-42), depois GREEN `513ee48d` feat(49-42).
3. **Task 3 (TDD):** RED `8c4a04e5` test(49-42), depois GREEN `48deef2c` feat(49-42).

## RED de cada task (saída real, antes do `feat`)

O arnês é o `red41.cjs` do scratchpad: `vitest run --reporter=tap-flat`, com o trailer TAP derivado das linhas ok/not ok. `check tdd-red-evidence` deu **RED_EVIDENCE_OK** (`target_test_failed`) nos seis registros (`red42-t1a/t1b/t2a/t2b/t3a/t3b.json`).

| Task | Arquivo | Resultado | Teste-alvo | Mensagem |
|---|---|---|---|---|
| 1 | `TranscricaoReviewPanel.test.tsx` | exit 1, 34 ok / 4 not ok | «vigente com o elemento { sinal } ⇒ o RÓTULO pt-BR aparece…» | `Unable to find an element by: [data-testid="analise-sinal-revisao"]` |
| 1 | `exportComparativo.test.ts` | exit 1, 9 ok / 3 not ok | «com o código em `sinais`, imprime EXATAMENTE o rótulo…» | `expected [] to have a length of 1 but got +0` |
| 2 | `ComparativoScreen.test.tsx` | exit 1, 21 ok / 2 not ok | «…o rótulo pt-BR aparece ACIMA do ranking, em tom âmbar» | `Unable to find an element by: [data-testid="comparativo-sinal-revisao"]`; o do PDF deu `expected undefined to deeply equal [ 'instrucao_ao_modelo' ]` |
| 2 | `DecisaoFinalPage.test.tsx` + `ComparativoCandidatosPage.test.tsx` | exit 1, 22 ok / 3 not ok | «ranking com `sinais_revisao` ⇒ o rótulo pt-BR aparece acima do ranking» | o mesmo `Unable to find…`; no stub, `Expected the element to have attribute` |
| 3 | `aiLogsService.test.ts` | exit 1, 10 ok / 4 not ok | «o filtro «Falha» NÃO seleciona o evento de sinal…» | `expected true to be false`: o `eq('success', false)` de hoje seleciona o evento. «Sinal» deu `expected [ 'falha com código', …(3) ] to deeply equal [ 'evento de sinal' ]` |
| 3 | `AiLogsPage.test.tsx` | exit 1, 10 ok / 5 not ok | «a linha-evento mostra «Sinal»…» | `Unable to find … [data-testid="ai-log-sinal"]`; `estadoDaChamada` deu `expected 'falha' to be 'sinal'`; o Select deu `[ 'Todos', 'Sucesso', 'Falha' ]` |

Os controles já passavam no RED, como esperado, porque descrevem o comportamento de hoje. São eles: sem o elemento `{ sinal }` não há aviso; `sinais` ausente ou `[]` deixa o PDF igual; sem a prop não há aviso; os três estados de hoje na célula.

## Mordida por mutação

O arnês é o `mut41.cjs`, que fica no scratchpad e não é commitado. A cada rodada ele:
1. lê o arquivo em Buffer e aplica UMA troca, com âncora única;
2. roda os testes;
3. restaura num `finally` e confere o sha256.

Todas as rodadas deram `restaurado=true`. Na Task 3, o `shasum -a 256 -c` dos dois arquivos de produção depois das seis rodadas deu `OK`.

| Mutação | Arquivo | Troca | Exit | Reprovou |
|---|---|---|---|---|
| **P1 (plano)** | `TranscricaoReviewPanel.tsx` | o sinal entra em `pendentes` | 1 | «sinal SEM trava…» |
| P2 | idem | o sinal entra em `flagFired` | 1 | «vigente com o elemento { sinal }…» (o bloco da bandeira apareceu) |
| P3 | idem | aviso não renderizado na vigente | 1 | 3 testes do sinal |
| P4 | idem | aviso em `red-*` | 1 | «vigente com o elemento { sinal }…» (tom) |
| Q1 | `exportComparativo.ts` | imprime o código cru | 1 | os 3 testes com sinal |
| Q2 | idem | a tabela não desce com o sinal | **0 → 1** | sobreviveu na 1ª rodada; depois do reforço do teste, 2 testes (ver Desvios) |
| Q3 | idem | o sinal cai no y da proveniência | 1 | «…y DISTINTOS…» |
| Q4 | idem | sem dedupe | 1 | «…sai UMA vez» |
| Q5 | idem | folga menor só com sinal | 1 | «…imprime EXATAMENTE o rótulo…» |
| N1 | `ComparativoScreen.tsx` | `handleExport` sem os sinais | 1 | o teste do 3º argumento e os 2 de aridade |
| N2 | idem | aviso não renderizado | 1 | tela e Decisão Final |
| N3 | idem | aviso em `red-*` | 1 | o teste do aviso (tom) |
| N4 | `DecisaoFinalPage.tsx` | a página não fia a prop | 1 | «ranking com `sinais_revisao`…» |
| N5 | `ComparativoCandidatosPage.tsx` | passa o valor cru (`undefined` sem a chave) | 1 | «…fiada como [], nunca deixada «não fiada»» |
| N6 | idem | a página não fia a prop | 1 | os 2 testes da página |
| **M1 (plano)** | `aiLogsService.ts` | «Falha» volta a ser só `success=false` | 1 | «o filtro «Falha» NÃO seleciona…» e a concordância |
| M2 | idem | «Falha» com `neq` (o nulo some) | 1 | a concordância (`falha × falha sem código`) |
| M3 | idem | sem o estado `sinal` | 1 | 5 testes (serviço e página) |
| M4 | idem | «Sucesso» = só `success=true` (a discordância antiga) | 1 | a concordância |
| M5 | `AiLogsPage.tsx` | Select sem «Sinal» | 1 | as opções e «escolher «Sinal»…» |
| M6 | idem | selo «Sinal» em `red-*` | 1 | «a linha-evento mostra «Sinal»…» |

A M2 prova que o avaliador modela a semântica SQL do nulo. Sem isso, a tradução ingênua («código diferente do sinal» = `neq`) passaria, e a falha sem código sumiria do filtro «Falha» em PROD.

## Regressão e verificação

- Verify da Task 1 (tracer): exit 0, 50/50.
- Verify da Task 2: 48/48 e «todo consumidor fiado».
- Verify da Task 3: com o guard `forbidden-strings`, 48/48.
- Portão D-53: `npm run lint` deu RC 2 com **89 `error TS`** no início e no fim do plano, abaixo do teto 90.
- O pre-commit (`tsc errors: 89 (frozen baseline: 96)`) passou nos 6 commits, sem nenhum `--no-verify`. A primeira tentativa do commit RED da Task 1 foi recusada pelo hook, com 98 erros; ver Desvios.
- `CI=true npx vitest run` → **218 arquivos, 2374 testes, 0 falhas**, exit 0. Antes eram 2346; os 28 novos são deste plano.
- Critérios de aceitação:
  - `grep -c 'sinal-revisao' exportComparativo.ts` = 2;
  - `grep -c 'estadoDaChamada' aiLogsService.ts` = 3;
  - nenhuma linha removida de `TranscricaoReviewPanel.test.tsx` nem de `exportComparativo.test.ts` (`git diff 757a1539 | grep -c '^-[^-]'` = 0 nos dois).

## Decisions Made

Ver `key-decisions` no frontmatter. Nenhuma decisão do operador foi criada ou atribuída neste plano. O sinal no PDF é o precedente D-27(b) aplicado pelo PLANEJADOR, como o próprio plano registra.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Prova da fiação] Testes em dois arquivos de teste de página fora do `files_modified`**
- **Found during:** Task 2 (RED).
- **Issue:** O `<behavior>` pede que um teste confira que a prop chega das DUAS páginas. O `files_modified` da Task 2 só tem o teste da tela, e uma asserção lá dentro só poderia ser uma sonda de texto sobre o fonte das páginas. As páginas já têm testes próprios: o da Decisão Final renderiza o `ComparativoScreen` REAL, e o do comparativo usa um stub.
- **Fix:** 2 testes em `DecisaoFinalPage.test.tsx`: o rótulo aparece com `sinais_revisao`, e nada sem a chave. 2 testes em `ComparativoCandidatosPage.test.tsx`: o stub passou a expor a prop como `data-sinais`, e `undefined` vira «nao-fiado» para não se confundir com `[]`.
- **Verificação:** N4, N5 e N6 reprovam.
- **Files modified:** `src/features/decisao/components/__tests__/DecisaoFinalPage.test.tsx`, `src/components/pages/__tests__/ComparativoCandidatosPage.test.tsx`.
- **Committed in:** `0241e750` (RED da Task 2).

**2. [Rule 1 - Aridade] Os dois testes de export de hoje do `ComparativoScreen` conferem o 3º argumento**
- **Found during:** Task 2 (GREEN).
- **Issue:** O `toHaveBeenCalledWith(candidates, undefined)` confere a ARIDADE. Com o 3º parâmetro na chamada, os dois testes reprovariam, embora o comportamento («sem a prop, o PDF não afirma nada») seja o pedido.
- **Fix:** As duas asserções ganharam o 3º argumento `undefined`, com nota. É o mesmo tratamento que o 49-13 deu a esse trecho quando acrescentou o 2º parâmetro. O que elas provam não mudou. A alternativa, chamar com aridade condicional só para preservar a asserção, seria código de produção moldado por um detalhe do teste.
- **Verificação:** a N1 (sem os sinais na chamada) reprova os dois, então eles continuam vigiando a chamada.
- **Committed in:** `513ee48d`.

**3. [Rule 1 - Teste fraco] O teste do PDF passou a exigir a folga da proveniência**
- **Found during:** Task 1 (mutação Q2).
- **Issue:** «startY maior que o y da linha» aceitava a tabela a 2 mm da base do texto. A Q2 (tabela no 22 histórico, com o sinal em y=20) sobreviveu com exit 0.
- **Fix:** `folgaDaProveniencia()` mede, na própria execução, a folga que a linha de proveniência tem até a tabela. A linha do sinal tem de ter pelo menos essa folga. Não há constante copiada.
- **Verificação:** Q2 e Q5 passaram a reprovar.
- **Committed in:** `3103e36a`.

**4. [Rule 3 - Bloqueio do hook] Os RED usam alias tipados, que o GREEN remove**
- **Found during:** Task 1 (commit RED).
- **Issue:** O pre-commit roda o tsc sobre a árvore inteira contra a baseline congelada (96). O teste RED chamando `exportComparativo` com 3 argumentos levou a contagem a 98, e o hook recusou o commit. A prop `sinaisRevisao` e o `status: 'sinal'` dariam o mesmo resultado nas Tasks 2 e 3.
- **Fix:** Cada RED teve um alias local de assinatura larga (`exportarComSinais`, `TelaComSinais`, o cast do `status`, e `svc.estadoDaChamada` lido por namespace), com um comentário dizendo que o GREEN o remove. Os três GREEN removeram. O `startY` passou a ser lido por função, porque o TS estreitava a propriedade a `null` depois da atribuição.
- **Verificação:** tsc em 89 em todos os commits, e os RED reprovaram por asserção (RED_EVIDENCE_OK).
- **Committed in:** `49e7a6a1`, `0241e750` e `8c4a04e5` (alias), e `3103e36a`, `513ee48d` e `48deef2c` (remoção).

---

**Total deviations:** 4 auto-fixed (1 Rule 2, 2 Rule 1, 1 Rule 3). **Impact on plan:** nenhum no escopo de produção. Todas as mudanças estão em testes, e duas delas tornam a prova mais forte do que o plano pedia.

### Notas de execução (não são desvios)

- O teste «sinal SEM trava» usa DUAS vigentes, uma com a bandeira confirmada e outra com o sinal. Com uma vigente só, a mutação do plano (sinal em `pendentes`) não morderia: sem bandeira, o bloco inteiro nem renderiza, e o sinal em `pendentes` ficaria invisível.
- O aviso também aparece na análise superada. O plano diz «para cada análise renderizada», e isso tem teste próprio.
- As mutações P2..P4, Q1..Q5, N1..N6 e M2..M6 foram além do plano e não mudaram código.
- Arquivos de outra janela (`.planning/ui-reviews/.gitignore`, `docs/specs/DRAFT-banco-sjt-marketing.md`, `docs/vagas/`) não foram tocados nem incluídos em commit. Todo `git add` foi por pathspec.

## TDD Gate Compliance

- Task 1: RED `49e7a6a1` test(49-42), com RED_EVIDENCE_OK nos dois arquivos. Depois, GREEN `3103e36a` feat(49-42).
- Task 2: RED `0241e750` test(49-42), com RED_EVIDENCE_OK nos dois registros. Depois, GREEN `513ee48d` feat(49-42).
- Task 3: RED `8c4a04e5` test(49-42), com RED_EVIDENCE_OK nos dois arquivos. Depois, GREEN `48deef2c` feat(49-42).
- REFACTOR: nenhum.

## Issues Encountered

Só a recusa do pre-commit no primeiro commit RED (Desvio 4), resolvida sem `--no-verify`.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`. Só há leitura de colunas que o front já buscava. O único filtro novo de consulta é montado a partir de uma CONSTANTE (`AI_ERROR_CODE.prompt_injection_flagged`), e não de entrada do usuário: o `.or(...)` não recebe texto de fora. Mitigações cumpridas:
- **T-49-42-01:** o sinal fica fora de `pendentes`/`bloqueado`. O teste «sinal SEM trava» e a P1 mordem.
- **T-49-42-02:** a varredura de `<ComparativoScreen` dá 2 consumidores, os 2 fiados; N4, N5 e N6 mordem.
- **T-49-42-03:** o estado `'sinal'` está na célula e o filtro é derivado do mesmo predicado. A concordância cobre 7 formas × 4 estados, e M1 e M2 mordem.
- **T-49-42-04:** o PDF imprime o `rotuloDoSinal` importado. Q1..Q5 e N1 mordem.
- **T-49-42-SC:** nenhum pacote instalado.

## User Setup Required

Nenhum.

## Next Phase Readiness

- **49-43:**
  - o push (o front sai pela Vercel) e a prova do marcador no chunk CERTO. `/rh/*` e `/admin/*` viram chunks lazy: procure a frase do rótulo e «Sinal» com `grep -rl` em `build/assets/`, e não no índice eager. O `exportComparativo` fica no chunk assíncrono do jsPDF;
  - a conferência visual (D6);
  - a ordem de apply e deploy do 49-38 continua valendo: a migration `20260930000001` vem antes das EFs.
- JORN-41 segue «Gaps Found». Quem marca é o verificador.

## Self-Check: PASSED

- FOUND (modificados): os 14 arquivos de `key-files.modified`.
- FOUND commits: `49e7a6a1`, `3103e36a`, `0241e750`, `513ee48d`, `8c4a04e5`, `48deef2c`.
- `commits: 6` foi medido por `git rev-list --count 757a1539..HEAD` antes do commit deste SUMMARY. `plan_head_after` = `48deef2cbe49898cb2292d12ce1117f57a660476`.
- Critérios de aceitação:
  - RED → GREEN nas três tasks;
  - P1 e M1 (as mutações do plano) com exit ≠ 0, e sha256 restaurado;
  - `sinal-revisao` ≥ 1 em `exportComparativo.ts`, e `estadoDaChamada` ≥ 1 em `aiLogsService.ts`;
  - «todo consumidor fiado»;
  - guard `forbidden-strings` verde;
  - vitest inteiro verde (218/2374);
  - `error TS` em 89 (≤ 90, sem subir).
