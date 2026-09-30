---
phase: 49-consertos-da-jornada-bloco-2
plan: "41"
subsystem: ui
tags: [jorn-41, prompt-injection, sinal-revisao, rotuloDoSinal, triagem, hub-candidato, redacao-cultural, sjt, rnf-07a, react, vitest, mutacao]
status: complete

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "38"
    provides: "_shared/sinal-revisao.ts (SINAL_INSTRUCAO_AO_MODELO, ROTULO_SINAL, rotuloDoSinal, sinaisDe), zero imports"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "39"
    provides: "as formas gravadas: analise_candidato_vaga.flags, redacoes_candidato.flags e scores_candidato.metadata.motivos_revisao com instrucao_ao_modelo"
provides:
  - "AnaliseIABlock («Sinais de atenção» do hub): flags mapeados por rotuloDoSinal; o código do sinal vira a frase pt-BR e os demais voltam como são"
  - "TriagemTable: o badge do código conhecido mostra o rótulo em tom âmbar (o do selo de proveniência), com quebra de linha; os demais badges ficam como estavam"
  - "RedacaoReviewPanel: SinaisDaRedacao (exportado), a seção «Sinais de atenção» com os flags da redação selecionada, que some com a lista vazia; é a primeira vez que o painel mostra flags (inclusive possivel_plagio_intercandidato)"
  - "CasoAbertoMetadata.motivos_revisao?: string[] declarado em scoresRhService.ts"
  - "ScorecardAvaliacao (caso_aberto): com instrucao_ao_modelo em motivos_revisao (via sinaisDe), o rótulo em tom neutro sob o marcador de pendente_humano; outros motivos não renderizados"
  - "13 testes Vitest novos (3 hub, 3 triagem, 3 redação, 4 SJT), todos lendo o rótulo de _shared/sinal-revisao"
affects: [49-42 (entrevista, comparativo, PDF e log do admin, pelas mesmas funções), 49-43 (push, prova do chunk e conferência visual), JORN-41]

actuals:
  tokens: 4089
  tasks: 2
  commits: 4
  plan_head_before: af9068e78097b788a5b7284e93ff10f720839913
  plan_head_after: a0e428f8432ce56340d6fcaf718c04cbaee2f6fc

tech-stack:
  added: []
  patterns:
    - "Telas leem o sinal só por _shared/sinal-revisao.ts (import relativo, zero imports), e os testes também: nenhuma cópia da frase no front"
    - "Código conhecido do vocabulário = rótulo difere do código (rotuloDoSinal(c) !== c); é isso que decide o tom âmbar na triagem, sem lista literal de códigos"
    - "Checagem de tom destrutivo por TOKEN de classe (^(bg|text|border)-(red|destructive)), não por substring: a base do Badge carrega aria-invalid:border-destructive"

key-files:
  created: []
  modified:
    - src/features/hub-candidato/components/AnaliseIABlock.tsx
    - src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx
    - src/features/triagem/components/TriagemTable.tsx
    - src/features/triagem/components/__tests__/TriagemTable.test.tsx
    - src/features/triagem/components/RedacaoReviewPanel.tsx
    - src/features/triagem/components/__tests__/RedacaoReviewPanel.test.tsx
    - src/features/avaliacao/components/ScorecardAvaliacao.tsx
    - src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx
    - src/features/avaliacao/services/scoresRhService.ts

key-decisions:
  - "Hub: o item do sinal usa o mesmo estilo neutro da lista «Sinais de atenção» (só o texto muda). O plano pedia o rótulo, não um tom; o âmbar ficou só no badge da triagem, onde o plano o autoriza"
  - "Redação: a seção vive dentro de AnaliseIA (logo abaixo do aviso de rubrica), que é o que o painel renderiza para a linha selecionada; reusa o título «Sinais de atenção» do hub para o RH ler o mesmo nome nas duas telas"
  - "SJT: o rótulo aparece sempre que o código está em motivos_revisao, e não só enquanto a linha está pendente_humano. O fato de o texto ter sido sinalizado continua verdadeiro depois da revisão; o marcador neutro segue decidido só pelo status"
  - "SJT: o rótulo fica numa linha própria abaixo do cabeçalho (título + selo + marcador), porque a frase é longa demais para o grupo flex do marcador"
  - "Nenhum deploy, nenhum push (o push e a prova do chunk são do 49-43); nenhuma leitura nem escrita em PROD"
  - "requirements-completed fica []: JORN-41 não é marcado neste plano (restam 49-42 e 49-43; quem marca é o verificador)"

requirements-completed: []

coverage:
  - id: D1
    description: "Hub do candidato: flags [instrucao_ao_modelo, cv_nao_extraido] mostram o rótulo pt-BR em «Sinais de atenção», sem o código cru, e cv_nao_extraido como texto; sem tom destrutivo; nota do modelo intacta"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx#AnaliseIABlock — o sinal de revisão com rótulo pt-BR (49-41 / JORN-41) (3 testes)"
        status: pass
      - kind: other
        ref: "mut41.cjs (scratchpad): M2 (flags sem rotuloDoSinal) exit 1; X2 (item em vermelho) exit 1; sha256 restaurado"
        status: pass
    human_judgment: false
  - id: D2
    description: "Lista da triagem: o badge do sinal mostra o rótulo em âmbar, nunca destrutivo; cv_nao_extraido segue cru; nota 78 e checkbox da linha habilitado"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "src/features/triagem/components/__tests__/TriagemTable.test.tsx#TriagemTable — o sinal de revisão com rótulo pt-BR (49-41 / JORN-41) (3 testes)"
        status: pass
      - kind: other
        ref: "mut41.cjs: M1 (badge com o código) exit 1; X1 (badge do sinal em vermelho) exit 1; sha256 restaurado"
        status: pass
    human_judgment: false
  - id: D3
    description: "Revisão da redação: a seção de sinais mostra o rótulo do sinal e possivel_plagio_intercandidato; com flags [] a seção não existe; tom neutro; notas da IA intactas"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "src/features/triagem/components/__tests__/RedacaoReviewPanel.test.tsx#AnaliseIA — os flags da redação, com o rótulo do sinal (49-41 / JORN-41) (3 testes)"
        status: pass
      - kind: other
        ref: "mut41.cjs: R1 (seção não renderizada), R2 (seção vazia não some), R3 (código cru) exit 1 cada; sha256 restaurado"
        status: pass
    human_judgment: false
  - id: D4
    description: "Card da SJT caso aberto: com o código em motivos_revisao, o rótulo junto do marcador «Requer revisão humana»; outro motivo ou chave ausente = nada; tom neutro; composto 17 intacto; o tipo declara motivos_revisao"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx#ScorecardAvaliacao — o motivo do sinal junto de pendente_humano (49-41 / JORN-41) (4 testes)"
        status: pass
      - kind: other
        ref: "mut41.cjs: S1 (nunca mostra), S2 (mostra por pendente, ignorando o motivo), S3 (vermelho) exit 1 cada; T1 (tirar motivos_revisao do tipo) leva o tsc de 89 a 90 com TS2339; tudo restaurado"
        status: pass
    human_judgment: false
  - id: D5
    description: "Regressão: vitest inteiro, guard forbidden-strings e teto D-53"
    requirement: JORN-41
    verification:
      - kind: unit
        ref: "CI=true npx vitest run → 218 arquivos, 2346 testes, 0 falhas; forbidden-strings.grep.test.ts verde; npm run lint → 89 error TS (início 89, teto 90)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Conferência visual das quatro telas (legibilidade do rótulo longo no badge da triagem, posição no card da SJT e na revisão da redação)"
    requirement: JORN-41
    verification: []
    human_judgment: true
    rationale: "Os testes provam o texto, a presença, a ausência e o tom por classe, mas não o layout real. O front não foi publicado (o push é do 49-43), e a conferência visual é do checkpoint do 49-43"

duration: 7min
completed: 2026-09-30
---

# Phase 49 Plan 41: O RH vê o sinal de revisão com o rótulo pt-BR no hub, na triagem, na revisão da redação e no card da SJT Summary

**As quatro telas em que o RH já lê o resultado da IA agora leem o sinal por `_shared/sinal-revisao.ts`. No hub e na triagem, `instrucao_ao_modelo` vira a frase «Possível instrução dirigida à IA no texto analisado…» (na triagem, num badge âmbar). A revisão da redação passa a renderizar `flags`, o que não fazia desde a Phase 13. O card da SJT caso aberto mostra o motivo sob «Requer revisão humana», e o tipo `CasoAbertoMetadata` declara `motivos_revisao`. Nenhuma nota, cor de reprovação ou ação muda por causa do sinal, e o tsc ficou em 89.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-09-30T07:07:24Z
- **Completed:** 2026-09-30T07:14:00Z
- **Tasks:** 2 de 2
- **Files modified:** 9 (0 criados, 9 editados)

## Accomplishments

- **Hub (`AnaliseIABlock`).** «Sinais de atenção» passa cada item por `rotuloDoSinal`. O código do sinal vira a frase pt-BR; `cv_nao_extraido` e os demais continuam como eram.
- **Triagem (`TriagemTable`).** O badge de um código conhecido do vocabulário (rótulo ≠ código) mostra o rótulo com as cores âmbar do selo de proveniência. Ele quebra linha (`whitespace-normal`, `max-w-[16rem]`) porque a frase é longa. Os badges dos outros códigos ficaram iguais, e nenhuma ação da linha muda.
- **Revisão da redação (`RedacaoReviewPanel`).** `SinaisDaRedacao` é um componente novo e exportado, renderizado dentro de `AnaliseIA` logo abaixo do aviso de rubrica. Ele lista os `flags` da redação selecionada, cada um por `rotuloDoSinal`, e não renderiza nada com a lista vazia. De quebra, o `possivel_plagio_intercandidato`, que o SELECT sempre trouxe, aparece ao revisor pela primeira vez.
- **SJT (`scoresRhService` + `ScorecardAvaliacao`).** `CasoAbertoMetadata` ganhou `motivos_revisao?: string[]`, com docblock. No card `caso_aberto`, `sinaisDe(meta.motivos_revisao).includes(SINAL_INSTRUCAO_AO_MODELO)` decide se o rótulo aparece, em tom neutro, numa linha abaixo do cabeçalho do marcador. Os outros motivos não são renderizados, conforme o plano.

## Task Commits

1. **Task 1 (tracer, TDD):**
   - RED `0347bf8a`: test(49-41).
   - GREEN `0e856ba8`: feat(49-41).
   - Portão do tracer: modo `interactive`, `human_verify_mode` ausente (logo `end-of-phase`), verify só com `<automated>`. O verify rodou de novo com exit 0 (`2 passed`, `41 passed`). Tracer verificado de ponta a ponta, e a expansão seguiu.
2. **Task 2 (TDD):** RED `99a4345f` test(49-41), depois GREEN `a0e428f8` feat(49-41).

## RED de cada task (saída real, antes do `feat`)

Registro no scratchpad (`red41.cjs`): `vitest run --reporter=tap-flat`, com o trailer TAP (`# tests/# pass/# fail`) derivado das linhas ok/not ok. `check tdd-red-evidence` deu **RED_EVIDENCE_OK** (`target_test_failed`) nos quatro registros.

| Task | Arquivo | Resultado | Teste-alvo | Mensagem |
|---|---|---|---|---|
| 1 | `AnaliseIABlock.test.tsx` | exit 1, 14 ok / 2 not ok | «mostra o RÓTULO do sinal, e não o código cru» | `Unable to find an element with the text: Possível instrução dirigida à IA…` |
| 1 | `TriagemTable.test.tsx` | exit 1, 23 ok / 2 not ok | «o badge mostra o RÓTULO do sinal, e não o código cru» | a mesma |
| 2 | `RedacaoReviewPanel.test.tsx` | exit 1, reprovaram os 2 testes com sinal | «mostra o RÓTULO pt-BR do sinal e o código de plágio, numa seção de sinais» | `Unable to find an element by: [data-testid="redacao-sinais"]` |
| 2 | `ScorecardAvaliacao.test.tsx` | exit 1, 4 ok / 2 not ok | «com o código em motivos_revisao, o rótulo pt-BR aparece junto do marcador» | `Unable to find an element with the text: Possível instrução…` |

Os controles já passavam no RED, como esperado, porque descrevem o comportamento de hoje: `cv_nao_extraido` cru, `flags: []` sem seção, outro motivo ou chave ausente sem rótulo.

## Mordida por mutação

O arnês é o `mut41.cjs`, que fica no scratchpad e não é commitado. A cada rodada ele:
1. lê o arquivo em Buffer e aplica UMA troca, com âncora única;
2. roda os testes do arquivo;
3. restaura byte a byte num `finally` e confere o sha256.

Todas as rodadas terminaram com `restaurado=true`.

| Mutação | Arquivo | Troca | Exit | Reprovou |
|---|---|---|---|---|
| M1 | `TriagemTable.tsx` | badge com `{flag}` em vez de `{rotulo}` | 1 | os 2 testes do rótulo |
| M2 | `AnaliseIABlock.tsx` | `itens={analise.flags}` (sem `rotuloDoSinal`) | 1 | os 2 testes do rótulo |
| X1 (extra) | `TriagemTable.tsx` | badge do sinal em `red-*` | 1 | «tom âmbar, nunca destrutivo…» |
| X2 (extra) | `AnaliseIABlock.tsx` | item da lista em `text-red-300` | 1 | «…não usa tom destrutivo (RNF-07a)» |
| R1 | `RedacaoReviewPanel.tsx` | `SinaisDaRedacao` não renderizado | 1 | os 2 testes com sinal |
| R2 | `RedacaoReviewPanel.tsx` | sem o `return null` da lista vazia | 1 | «flags vazio ⇒ a seção NÃO aparece» |
| R3 | `RedacaoReviewPanel.tsx` | `<li>{f}</li>` (código cru) | 1 | os 2 testes com sinal |
| S1 | `ScorecardAvaliacao.tsx` | `sinalInstrucao = false` | 1 | os 2 testes com o código |
| S2 | `ScorecardAvaliacao.tsx` | `sinalInstrucao = pendente` (ignora o motivo) | 1 | «sem o código…» e «sem motivos_revisao…» |
| S3 (extra) | `ScorecardAvaliacao.tsx` | rótulo em `red-*` | 1 | «tom neutro e a nota composta intacta» |
| T1 | `scoresRhService.ts` | tirar `motivos_revisao?` do tipo | — | tsc de 89 para **90**, com `TS2339 … 'motivos_revisao' does not exist on type 'CasoAbertoMetadata'` em `ScorecardAvaliacao.tsx(146,40)` |

A T1 mede o que o plano afirmava: sem a declaração, a leitura gastaria a única folga do teto D-53.

## Regressão e verificação

- Verify da Task 1: exit 0 (41/41). Verify da Task 2 com o guard: exit 0 (3 arquivos, 62/62).
- `CI=true npx vitest run` → **218 arquivos, 2346 testes, 0 falhas**, exit 0. Os stack traces no fim do log vêm de `console` de outras suítes: nenhuma linha `stderr |` cita os quatro arquivos deste plano.
- `npm run lint`: **89 `error TS`** no início do plano e **89** no fim (RC 2, teto 90). O pre-commit (`tsc errors: 89 (frozen baseline: 96)`) passou nos 4 commits, sem nenhum `--no-verify`.
- `grep -c 'sinal-revisao'`: `AnaliseIABlock.tsx` 1 e `TriagemTable.tsx` 3. `grep -c 'motivos_revisao' scoresRhService.ts` = 1.

## Decisions Made

Ver `key-decisions` no frontmatter. Nenhuma decisão do operador foi criada ou atribuída neste plano.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug no teste] A checagem de «tom destrutivo» por substring reprovaria todo `Badge`**
- **Found during:** Task 1, GREEN.
- **Issue:** O teste RED da triagem usava `expect(badge.className).not.toMatch(/red|destructive/)`. A classe base do `Badge` (`src/components/ui/badge.tsx`) carrega `aria-invalid:ring-destructive/20` e `aria-invalid:border-destructive`, que são estado de campo inválido e não a cor do elemento. O teste reprovaria qualquer implementação, inclusive a correta: um portão que reprova tudo não distingue nada.
- **Fix:** o helper `tomDestrutivo(className)` filtra por token `^(bg|text|border)-(red|destructive)`. Ele foi aplicado aos testes de tom do hub e da triagem, e o mesmo predicado foi usado nos testes da Task 2.
- **Verificação:** as mutações X1, X2 e S3 (cor vermelha real) reprovam, então o predicado ainda morde.
- **Files modified:** `AnaliseIABlock.test.tsx` e `TriagemTable.test.tsx`.
- **Committed in:** `0e856ba8`, junto do GREEN da Task 1. O RED `0347bf8a` já reprovava pelo motivo certo, a ausência do rótulo; o defeito só apareceria depois.

---

**Total deviations:** 1 auto-fixed (Rule 1, no próprio teste). **Impact on plan:** nenhum no escopo. Sem o conserto, o GREEN da Task 1 seria impossível.

### Notas de execução (não são desvios)

- As mutações X1, X2, S3 e T1 foram além do plano e não mudaram código.
- A seção da redação também mostra `possivel_plagio_intercandidato` cru, porque é o que a spec pede («o rótulo do sinal E o código de plágio»). Dar rótulo aos outros códigos está fora do escopo.
- Arquivos de outra janela (`.planning/ui-reviews/.gitignore`, `docs/specs/DRAFT-banco-sjt-marketing.md`, `docs/vagas/`) não foram tocados nem incluídos em commit. Todo `git add` foi por pathspec.

## TDD Gate Compliance

- Task 1: RED `0347bf8a` test(49-41), com RED_EVIDENCE_OK nos dois arquivos. Depois, GREEN `0e856ba8` feat(49-41).
- Task 2: RED `99a4345f` test(49-41), com RED_EVIDENCE_OK nos dois arquivos. Depois, GREEN `a0e428f8` feat(49-41).
- REFACTOR: nenhum.

## Issues Encountered

Nenhum além do desvio acima.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`: só leitura de colunas que o front já buscava, e nenhuma rede, rota ou escrita nova. Mitigações cumpridas:
- **T-49-41-01:** seção de sinais no `RedacaoReviewPanel`. Mordida por R1, R2 e R3.
- **T-49-41-02:** tom âmbar/neutro, nenhuma ação desabilitada e nota/composto intactos. X1, X2 e S3 mordem, e o checkbox da triagem é conferido `not.toBeDisabled()`.
- **T-49-41-03:** o rótulo vem só de `_shared/sinal-revisao.ts`, e os testes também o leem de lá, sem nenhuma cópia da frase.
- **T-49-41-SC:** nenhum pacote instalado.

## User Setup Required

Nenhum.

## Next Phase Readiness

- **49-42:** faltam a transcrição (`bias_flags` `{ sinal }` pelo `sinaisDe`), o comparativo com o PDF (`ranking.sinais_revisao`) e o log do admin. `SinaisDaRedacao` e o helper `tomDestrutivo` podem servir de molde.
- **49-43:** o push, a prova do marcador no chunk certo e a conferência visual (D6). As rotas `/rh/*` viram chunks lazy: procure a frase do rótulo com `grep -rl` em `build/assets/`, e não no índice eager.
- JORN-41 segue «Gaps Found». Quem marca é o verificador.

## Self-Check: PASSED

- FOUND (modificados): os 9 arquivos de `files_modified`.
- FOUND commits: `0347bf8a`, `0e856ba8`, `99a4345f`, `a0e428f8`.
- `commits: 4` foi medido por `git rev-list --count af9068e7..HEAD` antes do commit deste SUMMARY. `plan_head_after` = `a0e428f8432ce56340d6fcaf718c04cbaee2f6fc`.
- Critérios de aceitação: RED → GREEN nas duas tasks; `sinal-revisao` ≥ 1 nos dois arquivos da Task 1; `motivos_revisao` ≥ 1 em `scoresRhService.ts`; guard `forbidden-strings` verde; vitest inteiro verde (218/2346); `error TS` em 89 no início e no fim (≤ 90, sem subir).

## Correção pós-revisão (49-REVIEW-GAPS-2 CR-01) — 2026-09-30

Acrescentada depois; o texto acima fica como foi escrito.

- **O card da SJT não mostra mais o sinal «sob o marcador de `pendente_humano`» na linha sinalizada sem outra causa.** Desde o conserto do CR-01, o sinal não manda a linha para `pendente_humano`: ela é gravada `sucesso`, com `instrucao_ao_modelo` em `motivos_revisao`. Antes disso, a nota composta saía da Decisão Final (`normalizeSjtComposite` só soma `sucesso`).
- **O componente não precisou mudar.** A key-decision desta SUMMARY («o rótulo aparece sempre que o código está em motivos_revisao, e não só enquanto a linha está pendente_humano; o marcador neutro segue decidido só pelo status») já cobria o caso. Um teste novo prende isso: linha `sucesso` com o código mostra o rótulo e NÃO mostra «Requer revisão humana».
- **Onde esta SUMMARY diz** «o rótulo junto do marcador «Requer revisão humana»» e «mostra o motivo sob «Requer revisão humana»», **leia:** junto do marcador só quando outra causa pôs a linha em `pendente_humano`, e sozinho numa linha `sucesso`.
- A afirmação «nenhuma nota … muda por causa do sinal» valia para as telas deste plano. Ela não valia para a consolidação da SJT, que era efeito do 49-39 (ver a correção no 49-39-SUMMARY).

## Correção pós-revisão (49-REVIEW-GAPS-3 CR-02) — 2026-09-30

Acrescentada depois; o texto acima e a correção anterior ficam como foram escritos.

- **O `ScorecardAvaliacao` não está montado em tela nenhuma.** Ele só é exportado pelo barril e sai do build por tree-shaking. Um teste verde dele não prova que o RH vê o aviso. A frase «O componente não precisou mudar», na correção anterior, estava certa sobre o componente e errada sobre a tela publicada.
- **Onde o RH vê o sinal da SJT agora:** na Decisão Final. `consolidar-decisao-final` devolve `breakdown[].sinais_revisao`, e o `ConsolidacaoDashboard` mostra o rótulo junto da etapa SJT (`data-testid="decisao-sjt-sinal-revisao"`). Commits `44702539` (RED) e `483e25ae` (GREEN). Decisão do operador: «1», 2026-09-30.
