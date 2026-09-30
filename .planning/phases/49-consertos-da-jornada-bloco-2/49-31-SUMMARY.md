---
phase: 49-consertos-da-jornada-bloco-2
plan: "31"
subsystem: frontend
tags: [react, entrevista, transcricao, scorecard, analise-vigente, cr-03, jorn-12, d-39, mutation-testing, vercel, lazy-chunk]

requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "30"
    provides: "salvar_avaliacao_entrevista(uuid,uuid,jsonb,text) grava na análise nomeada por id; SalvarAvaliacaoArgs com analiseId; o workspace já mandava o id da vigente mais recente"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "10"
    provides: "confirmar_revisao_entrevista aceita qualquer vigente por id e recusa superada/falha"
provides:
  - "TranscricaoReviewPanel: pendentes = vigentes com bloqueio_avanco e sem revisao_confirmada_em; um botão «Confirmar revisão humana — {entrevista}» por pendente, com o id da própria análise; bloqueado = há pendente; marcador data-testid transcricao-revisao-pendente"
  - "EntrevistaScorecardInline: props vigentes/analiseId/onEscolherAnalise; linha data-testid scorecard-analise-em-revisao; radiogroup com 2+ vigentes; Salvar desabilitado sem análise; SCORECARD_COPY exportado"
  - "EntrevistaWorkspace: analiseEscolhidaId (padrão = vigente mais recente) alimenta competências, analiseId e o salvar; key do scorecard = id da análise"
  - "Docstrings de vigenteMaisRecente/getAnalise: padrão do scorecard, não a única análise revisável"
affects: [49-VERIFICATION re-verificação do JORN-12, 49-33, 49-34, 49-35]

actuals:
  tokens: 9429
  tasks: 2
  commits: 2
  plan_head_before: ab3d567da7cdba760c1d5582319cff53be573da8
  plan_head_after: 7bd1aa0dbd449aebe14c2f7d77751ea5211b6df7

tech-stack:
  added: []
  patterns:
    - "Leitor de tela derivando a bandeira como o portão do servidor a deriva (EXISTS sobre todas as vigentes), nunca de um singular"
    - "Negativo de botão com rótulo sufixado consultado por regex de prefixo — string exata viraria vácuo verde"
    - "Remount por key = id da entidade editada, para que estado inicial de useState não vaze entre entidades"

key-files:
  created:
    - src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx
  modified:
    - src/features/entrevista/components/TranscricaoReviewPanel.tsx
    - src/features/entrevista/components/__tests__/TranscricaoReviewPanel.test.tsx
    - src/features/entrevista/services/entrevistaService.ts
    - src/features/entrevista/components/EntrevistaScorecardInline.tsx
    - src/features/entrevista/components/EntrevistaWorkspace.tsx
    - .planning/REQUIREMENTS.md

key-decisions:
  - "vigenteMaisRecente deixa de ser a fonte da bandeira e do botão (promote): vira só o PADRÃO do scorecard. A bandeira, o bloqueio e as confirmações derivam de `vigentes`"
  - "Uma escolha do scorecard que deixou de ser vigente (superada por análise nova) cai de volta no padrão, em vez de apontar para uma linha que a RPC recusa"
  - "JORN-12 NÃO vira Complete: célula avançada para «Gaps Found — CR-03 consertado (49-30 banco, 49-31 tela) e no ar; aguarda re-verificação»; o mark-complete real devolveu not_found"

patterns-established:
  - "A regex de prefixo do botão fica escrita em cada consulta (não numa constante), para que o <verify> do plano conte as consultas que a usam"

requirements-completed: []

coverage:
  - id: D1
    description: "Com a online (mais antiga) bandeirada e a presencial (mais nova) sem bandeira, o bloco aparece, nomeia a online, o único botão confirma pelo id da online e o Avançar fica desabilitado com o tooltip da bandeira"
    requirement: "JORN-12"
    verification:
      - kind: unit
        ref: "TranscricaoReviewPanel.test.tsx › a revisão em CADA vigente pendente (CR-03) — RED antes (5 failed | 28 passed), GREEN 33/33"
        status: pass
    human_judgment: false
  - id: D2
    description: "Os negativos do painel mordem: N1 (ignora revisao_confirmada_em) e N2 (bloco e botão para toda vigente) reprovam, exit 1"
    requirement: "JORN-12"
    verification:
      - kind: unit
        ref: "mutações N1 (2 failed) e N2 (5 failed) no TranscricaoReviewPanel.tsx; restauração 33/33"
        status: pass
    human_judgment: false
  - id: D3
    description: "O scorecard nomeia a análise avaliada, deixa escolher entre vigentes e desabilita o Salvar sem vigente"
    requirement: "JORN-12"
    verification:
      - kind: unit
        ref: "EntrevistaScorecardInline.test.tsx — RED 3 failed, GREEN 3/3"
        status: pass
    human_judgment: false
  - id: D4
    description: "Os dois marcadores no arquivo SERVIDO de mesmo nome do chunk local"
    requirement: "JORN-12"
    verification:
      - kind: other
        ref: "curl https://rh.beautysmile.com.br/assets/EntrevistaWorkspace-wNA6aToS.js contém transcricao-revisao-pendente e scorecard-analise-em-revisao"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-09-29
status: complete
---

# Phase 49 Plan 31: revisão por vigente pendente e escolha da análise avaliada (CR-03, metade de tela) Summary

**O painel da transcrição passa a mostrar e a deixar confirmar TODA vigente com bandeira pendente, cada uma pelo próprio id e rotulada pela entrevista, em vez de olhar só a mais recente. O scorecard passa a dizer sobre qual análise a nota será gravada e a deixar o RH escolher quando há duas. Os dois comportamentos foram provados vermelho→verde, os negativos foram mordidos por mutação, e o chunk servido em `rh.beautysmile.com.br` contém os dois marcadores.**

## Performance

- **Duration:** ~10 min (marcador de início 2026-09-30T01:53:50Z, logo depois da precondição; fim ~02:01Z)
- **Tasks:** 2/2
- **Files modified:** 7 (1 criado, 6 editados)

## Accomplishments

- **Precondição (população (b)) remedida só leitura em 2026-09-30T01:53:42Z: `n = 0`.** Ou seja, nenhum par `(candidatura, tipo)` tem mais de uma linha que `entrevista_analise_vigente` aceite. A tela e o portão olham as mesmas vigentes, sem linha legada escondida.
- Painel: `pendentes` / `flagFired` / `bloqueado` derivam de `vigentes`, e há uma confirmação por pendente. O docblock «A REGRA DA REVISÃO» e o comentário JSX foram reescritos para descrever a regra nova sem reproduzir a retirada.
- Scorecard: mostra a linha de qual análise, o radiogroup (no molde do seletor `TIPOS`, 44px, `aria-checked`) e o Salvar desabilitado com a frase do que falta. O workspace passa o id ESCOLHIDO ao salvar e remonta o scorecard por `key`.
- Publicado: `git push origin main` → `28ff8ea3..7bd1aa0d`, e `origin/main..HEAD` ficou vazio. Os dois marcadores estão no ar no mesmo chunk lazy.

## Evidência literal

### Task 1: RED (antes do conserto)

```
× a bandeira da vigente MAIS ANTIGA aparece, nomeia a entrevista e confirma pelo id DELA
× duas vigentes bandeiradas e não confirmadas ⇒ dois botões, cada um com o id da SUA análise
× uma confirmada e outra pendente ⇒ continua bloqueado, e SÓ a pendente tem botão
× todas as bandeiradas confirmadas ⇒ «Revisão humana confirmada», nenhum botão, sem tom destrutivo
× vigente do grupo SEM tipo, bandeirada ⇒ botão rotulado «Entrevista não identificada»
TestingLibraryElementError: Unable to find an element by: [data-testid="transcricao-revisao-pendente"]   ← caso principal
AssertionError: expected [ Array(1) ] to have a length of 2 but got 1                                      ← duas bandeiradas
Tests  5 failed | 28 passed (33)
```

O caso principal reprovou porque **o bloco de bandeira não existia na tela**. É exatamente o CR-03: a online bandeirada ficava escondida atrás da presencial limpa. A falha é da consulta ao DOM renderizado, não de carregamento. «Todas confirmadas» também reprovou no RED, mas só porque consultava o `data-testid="transcricao-bandeiras"`, que é novo.

### Task 1: GREEN

`CI=true npx vitest run …/TranscricaoReviewPanel.test.tsx src/__tests__/guards` → exit 0, **9 arquivos, 111/111** (guard de strings proibidas incluso).

Contagens do `<verify>`:
- `transcricao-revisao-pendente` = 1 e `pendentes` = 3 no painel;
- consultas pelo rótulo antigo como string exata = **0**;
- `/^Confirmar revisão humana/` = **6** linhas no teste.

### Task 1: os negativos mordem (D-56)

As mutações rodaram depois do commit do GREEN (`c6371860`), uma de cada vez, com o exit code do vitest conferido.

| Mutação | Inversão | Exit | Reprovados |
|---|---|---|---|
| N1 | `pendentes = vigentes.filter(a => a.bloqueio_avanco)` (ignora `revisao_confirmada_em`) | **1** | «uma confirmada e outra pendente» (`expected [ <button…(2)> ] to have a length of 1 but got 2`); «todas confirmadas» (`Unable to find … /Revisão humana confirmada/`). 2 failed \| 31 passed |
| N2 | `pendentes = vigentes`; `flagFired = vigentes.length > 0` | **1** | 5 failed \| 28 passed, **incluindo «sem bandeira não há botão»** (`Found multiple elements with the role "button" and name /^Confirmar revisão humana/`) e «superada bandeirada» (`expected [ Array(1) ] to have a length of +0 but got 1`) |

Cada uma foi restaurada com `git checkout -- src/features/entrevista/components/TranscricaoReviewPanel.tsx`. O arquivo voltou limpo e o reteste deu **33/33, exit 0**.

### Task 2: RED e GREEN

- RED do teste novo: **3 failed (3)**. Os erros foram `Unable to find … [data-testid="scorecard-analise-em-revisao"]`, `Unable to find … role "radiogroup"` e `Unable to find … «Nenhuma análise vigente: …»`.
- GREEN: `CI=true npx vitest run src/features/entrevista` → **10 arquivos, 118/118**. A suíte inteira deu **218 arquivos, 2333/2333** (eram 2326 no 49-30; +4 do painel, porque três casos foram substituídos por sete, e +3 do scorecard).
- `tsc`: **89** antes do plano e **89** depois das duas tasks. O conjunto de mensagens, diffado sem linha e coluna, é **idêntico** e nenhuma mensagem vem dos arquivos tocados. O `<verify>` imprimiu `tsc 89 <= 90`. O hook de pre-commit aceitou (teto 96).

### Publicação

- Build local: `grep -rl` achou os dois marcadores no mesmo chunk lazy, `build/assets/EntrevistaWorkspace-wNA6aToS.js`.
- `git push origin main` → `28ff8ea3..7bd1aa0d  main -> main`. Esse push também levou os três commits do 49-32 (`5d6c08e8`, `9cc339ba`, `ab3d567d`, só `supabase/functions/_shared` + docs). É inofensivo, como o plano previa: o repositório só tem os workflows `ci.yml` e `prompts-sync.yml` (este filtrado a `docs/conhecimento/prompts/templates/**`), nenhum deles publica Edge Function, e as EFs continuam sem deploy até o 49-34.
- `git log --oneline origin/main..HEAD` → **vazio**.
- Poll do arquivo servido: ausente nas tentativas 1 e 2 (a Vercel ainda publicava) e presente na 3, às 01:59:47Z (~30 s).
- `<verify>` verbatim, um marcador por chamada:
  - `no ar: EntrevistaWorkspace-wNA6aToS.js` (`transcricao-revisao-pendente`)
  - `no ar: EntrevistaWorkspace-wNA6aToS.js` (`scorecard-analise-em-revisao`)

### JORN-12 continua sem Complete

- Antes da edição, a célula lia a anotação do planejamento, «Gaps Found — CR-03 em conserto (49-30 banco, 49-31 tela); aguarda re-verificação», e a caixa estava `[ ]`. Ela não tinha se perdido nem virado, então não foi preciso restaurar nada.
- Edit de uma linha, entrado no mesmo commit/push da Task 2: «Gaps Found — CR-03 consertado (49-30 banco, 49-31 tela) e no ar; aguarda re-verificação».
- Simulação numa cópia descartável: `"updated": false`, `"not_found": ["JORN-12"]`, `"total": 1`, e a caixa e a célula não viraram. O `<verify>` imprimiu `JORN-12 resiste ao mark-complete`.
- `mark-complete JORN-12` real, depois do plano: `"updated": false`, `"not_found": ["JORN-12"]`. `grep -cE '^- \[x\] \*\*JORN-12\*\*' .planning/REQUIREMENTS.md` = **0**, e a célula continua com o texto final. Por isso o `requirements-completed` está vazio, de propósito.

## Task Commits

1. **Task 1 (tracer): painel por vigente pendente, testes e docstrings**: `c6371860` (fix)
2. **Task 2: scorecard com escolha da análise, workspace, célula do JORN-12 e publicação**: `7bd1aa0d` (fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] A regex de prefixo ficou escrita em cada consulta, e não numa constante**
- **Found during:** Task 1 (terceiro `<verify>`)
- **Issue:** a primeira versão guardava `/^Confirmar revisão humana/` numa constante `CONFIRMAR`. O `<verify>` conta as LINHAS que contêm a regex literal (≥ 2) e achou 1. Os negativos já consultavam pela regex, mas o instrumento do plano não conseguia enxergar isso.
- **Fix:** a regex passou a ser escrita em cada uma das 6 consultas, e a constante saiu. Um comentário no teste explica o motivo. O comportamento dos testes não mudou.
- **Files modified:** `src/features/entrevista/components/__tests__/TranscricaoReviewPanel.test.tsx`
- **Commit:** `c6371860`

**2. [Acréscimo] `data-testid="transcricao-bandeiras"` no contêiner do bloco de bandeira**
- O caso «todas confirmadas ⇒ sem tom destrutivo» precisava de uma âncora para ler a classe do bloco, e o negativo «sem bandeira» usa a mesma âncora para afirmar que o bloco inteiro não aparece. O marcador de publicação continua sendo `transcricao-revisao-pendente`.

**3. [Acréscimo] Escolha obsoleta cai no padrão**
- O workspace resolve `analiseEmRevisao = vigentes.find(id === analiseEscolhidaId) ?? vigenteMaisRecente`. Se uma análise nova supera a escolhida, a tela volta ao padrão em vez de nomear uma linha que a RPC do 49-30 recusaria com 23514.

Nenhum outro desvio. Nenhum pacote instalado. Nenhuma escrita em PROD: a única consulta ao banco foi a precondição, só leitura (`set transaction read only`).

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>`. As ameaças T-49-31-01..05 foram mitigadas e provadas: o caso de duas vigentes e N1/N2 (01), o remount por `key` (02), os botões rotulados pela entrevista, incluindo «não identificada» (03), a simulação e o `mark-complete` real (04) e a população (b) = 0 (05). T-49-31-SC: nenhuma instalação.

## Next Phase Readiness

- **Verificador:** as duas metades do CR-03 estão no ar: banco no 49-30, tela neste plano. O JORN-12 aguarda re-verificação. A célula não vira Complete sozinha.
- **Pendente registrado no 49-30 e resolvido aqui por docstring:** `entrevistaService.getAnalise` (forma singular, sem chamador fora do serviço) fica, documentado como o PADRÃO do scorecard, e não como a única análise revisável.
- **49-33/49-34:** o push deste plano já levou os commits do 49-32 ao `origin/main`. O deploy das 7 EFs continua sendo do 49-34.
- **Fora do escopo, intocado:** a obrigatoriedade das notas do gestor (JORN-47, Bloco 3).

## Self-Check: PASSED

- FOUND: `src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx`, `src/features/entrevista/components/TranscricaoReviewPanel.tsx`, `src/features/entrevista/components/EntrevistaScorecardInline.tsx`, `src/features/entrevista/components/EntrevistaWorkspace.tsx`
- FOUND: commits `c6371860`, `7bd1aa0d` (`git rev-list --count ab3d567d..HEAD` = 2)
