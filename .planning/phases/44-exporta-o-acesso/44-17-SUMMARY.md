---
phase: 44-exporta-o-acesso
plan: 17
subsystem: privacidade (copy LGPD + portões de teste)
tags: [lgpd, export, copy, vitest, portao-por-tabela, cr-01-bis]
status: complete

requires:
  - phase: 44-exporta-o-acesso (44-14..44-16)
    provides: "CLAUSULA_POR_FAMILIA, familiaDaRazao, lacunasDaFronteira, (cr1)..(cr3); canal CANAL_PRIVACIDADE_EMAIL = rh@"
provides:
  - "COPY_PEDIR_COPIA.oQueNaoEsta sem a igualdade falsa entre candidatos, nomeando o roteiro da entrevista, convite estreitado (BD-18, BD-19)"
  - "VEREDITO_POR_TABELA + familiasGenericas + colunasDeVinculo + lacunasPorTabela (com naoMedidas/semRazaoNoYaml declarados para o 44-18)"
  - "caso (cr5) — portão por TABELA derivado do artefato e do catálogo"
  - "(cr3) controles 2 e 4 derivados dos dados (IN-01)"
  - "BD-18..BD-21 no 44-CONTEXT; nota datada CR-01-bis na 44-UI-SPEC"
affects: [44-18, 44-19, 44-20, 44-21, 44-22]

actuals:
  tokens: 5654        # chars/4 sobre as linhas +/- do diff dee65a6c..c1c42fa0 (22619 chars)
  tasks: 2
  commits: 2          # git rev-list --count plan_head_before..HEAD, medido antes do commit de metadados
plan_head_before: dee65a6c5b0cd1a3e63c10af0af3fb094929d650
plan_head_after: c1c42fa0c0e633d9f83c626f2ebd44088437fbfe

tech-stack:
  added: []
  patterns:
    - "Portão por tabela: classe DERIVADA (famílias que dividem um marcador × colunas de vínculo de chave_titular × catálogo) comparada por igualdade de conjuntos com um mapa de escopo deliberado"
    - "expect.soft no caso de portão para o vermelho mostrar todas as lacunas de uma vez, cada uma nomeando a tabela"
    - "Controles de mordida escolhem o alvo pelos dados derivados, nunca por nome de decisão em aberto"

key-files:
  created:
    - .planning/phases/44-exporta-o-acesso/44-17-SUMMARY.md
  modified:
    - src/features/privacidade/services/exportacaoService.ts
    - src/features/privacidade/services/__tests__/exportacaoService.test.ts
    - .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md
    - .planning/phases/44-exporta-o-acesso/44-CONTEXT.md

key-decisions:
  - "BD-18 (operador): entrevista_guias NOMEADA e RETIDA — a frase nomeia «o roteiro que a equipe monta para conduzir a sua entrevista»; allowlist 1.4.0, EF e banco intocados"
  - "BD-19 (operador): o convite final só oferece saber mais; o ramo que oferecia entregar o retido saiu do arquivo inteiro do serviço"
  - "BD-21 (planejador): classe genérica derivada do mapa, colunas de vínculo de chave_titular menos a raiz candidatos, igualdade de conjuntos com VEREDITO_POR_TABELA"

patterns-established:
  - "Nova frase derivada mecanicamente da antiga (substituição exata, falha se não casar) — nunca redigitada"

requirements-completed: [EXPORT-01, EXPORT-02]

coverage:
  - id: D1
    description: "A frase de fronteira não afirma mais igualdade entre candidatos, nomeia o roteiro da entrevista e não oferece entregar o retido — a mesma na tela, no .html e no .json"
    requirement: EXPORT-02
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr5) CR-01-bis · toda tabela retida com vínculo ao titular numa família da configuração do sistema tem veredito próprio na frase"
        status: pass
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr2) CR-01 · a frase é a mesma na tela, no .html e no .json"
        status: pass
      - kind: other
        ref: "Task 1 verify 1 (node: FRASE NAO MUDOU / SONDA CEGA / TRECHO RETIRADO AINDA NO SERVICO / FRASE SEM O CANAL)"
        status: pass
    human_judgment: true
    rationale: "O texto final da frase é aprovado pelo operador no checkpoint do 44-22 (BD-18/BD-19 decidem o conteúdo; a redação exata ainda passa por ele)"
  - id: D2
    description: "Portão (cr5) por TABELA derivado do artefato e do catálogo — vermelho com a frase de HEAD, verde com a nova, mordendo a frase real"
    requirement: EXPORT-02
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr5)"
        status: pass
      - kind: other
        ref: "Task 2 verify 2 (mutação única do serviço, md5 + cmp contra o backup)"
        status: pass
    human_judgment: false
  - id: D3
    description: "(cr3) controles 2 e 4 escolhidos pelos dados derivados (IN-01)"
    requirement: EXPORT-02
    verification:
      - kind: unit
        ref: "src/features/privacidade/services/__tests__/exportacaoService.test.ts#(cr3) CR-01 · o portão morde"
        status: pass
      - kind: other
        ref: "grep -cE \"CLAUSULA_POR_FAMILIA\\['BD-13 \\(ii\\)'\\]|colunas_excluidas\\?\\.justificativa\" = 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "44-UI-SPEC = código (célula «O que não está na cópia») + nota datada CR-01-bis com a redação anterior verbatim; BD-18..BD-21 no CONTEXT"
    requirement: EXPORT-01
    verification:
      - kind: other
        ref: "Task 1 verify 2 (ui-spec = codigo; nota historica preservada; BD-18..BD-21 no CONTEXT)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-10-07
---

# Phase 44 Plan 17: CR-01-bis — a frase e o núcleo do portão (TRACER) Summary

**A frase de fronteira deixa de dizer ao titular que a configuração retida «é o mesmo para todos os candidatos», passa a nomear «o roteiro que a equipe monta para conduzir a sua entrevista» e o convite final só oferece saber mais. Um portão (cr5) por TABELA, derivado do artefato e do catálogo, prende cada tabela por titular retida numa família da configuração do sistema a um veredito próprio na frase. Ele foi visto vermelho com a frase antiga e mordendo a frase real.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-10-07T12:05:45Z
- **Completed:** 2026-10-07T12:12:00Z
- **Tasks:** 2 (1 tracer + 1 auto, ambos tdd)
- **Files modified:** 4 (+ este SUMMARY, STATE.md, ROADMAP.md)

## Accomplishments

- **Frase (BD-18, BD-19).** A nova `COPY_PEDIR_COPIA.oQueNaoEsta` foi derivada **mecanicamente** da antiga, por substituição exata que falha se não casar. Mudaram três coisas, e só elas:
  - (a) a oração «, que é o mesmo para todos os candidatos» saiu, e a cláusula termina em «perguntas.»;
  - (b) «o roteiro que a equipe monta para conduzir a sua entrevista;» é o primeiro item de «Também não entram:»;
  - (c) «, ou pedir algum deles,» saiu.

  A frase é a mesma na tela, no `.html` e no `.json`, com uma fonte só. Os sete marcadores de `CLAUSULA_POR_FAMILIA` continuam nela, e o (cr1) segue verde.
- **Contrato de copy primeiro.** A célula «O que não está na cópia» da 44-UI-SPEC é igual ao código caractere a caractere, com `rh@beautysmile.com.br` no lugar da interpolação. Uma nota datada «CR-01-bis» guarda a redação anterior verbatim, lida de `git show dedca1fb:…`. A nota também explica que o «idêntica à atual» da nota do canal se refere a essa redação. As notas antigas não foram editadas.
- **44-CONTEXT:** o adendo «2026-10-06 (madrugada) — fechamento do CR-01-bis» registra:
  - BD-18 (OPERADOR), com a oração retirada verbatim e a premissa como foi medida;
  - BD-19 (OPERADOR), com o ramo retirado verbatim;
  - BD-20 (OPERADOR, com IN-01/IN-02 por adjacência do PLANEJADOR);
  - BD-21 (PLANEJADOR).
- **Portão (cr5):** `VEREDITO_POR_TABELA` tem uma entrada (`entrevista_guias` → BD-18). As funções `familiasGenericas`, `colunasDeVinculo` e `lacunasPorTabela` são puras. A classe genérica, as colunas de vínculo e o conjunto de tabelas são **derivados na execução**. Hoje o conjunto `comVinculo` é exatamente `{entrevista_guias}`: isso foi **medido**, porque `semVeredito` e `vereditoOrfao` saem vazios contra o artefato e o catálogo reais, e não está escrito como contagem.
- **IN-01:** os controles 2 e 4 do (cr3) escolhem a família pelos dados derivados. Nenhum nome de decisão em aberto aparece no caso, e uma seleção vazia reprova com mensagem.

## Evidências

### (cr5) VERMELHO com a frase de HEAD (antes do passo 4 do Task 1)

`npx vitest run …/exportacaoService.test.ts -t "CR-01"` saiu com código 1. O (cr1), o (cr2) e o (cr3) ficaram verdes; só o (cr5) falhou, e falhou nas asserções planejadas (RED válido, não erro de carga):

```
 × (cr5) CR-01-bis · toda tabela retida com vínculo ao titular numa família da configuração do sistema tem veredito próprio na frase
AssertionError: veredito sem marcador na frase — a frase não nomeia esta tabela retida; reescreva-a pela 44-UI-SPEC: expected [ 'entrevista_guias' ] to deeply equal []
+ [
+   "entrevista_guias",
+ ]
AssertionError: trecho retirado voltou à frase: igualdade entre candidatos (BD-18): expected true to be false // Object.is equality
AssertionError: trecho retirado voltou à frase: oferta de entregar o retido (BD-19): expected true to be false // Object.is equality
      Tests  1 failed | 3 passed | 50 skipped (54)
```

`marcadorAusente = [entrevista_guias]`, e os dois trechos retirados foram acusados. `semVeredito` e `vereditoOrfao` já estavam vazios, ou seja, a classe derivada é igual às chaves de `VEREDITO_POR_TABELA`.

### VERDE com a frase nova

- `npx vitest run src/features/privacidade`: 11 arquivos, 163 testes verdes.
- `src/features/privacidade` + `docs/compliance/__tests__`: **254/254** (baseline 253 + o (cr5)).
- `tsc`: `npm run -s lint` sai com código 2 e **89** `error TS`, igual ao baseline.
- Task 1 verify 1: `frase nova no servico; os dois trechos retirados sairam do arquivo inteiro`.
- Task 1 verify 2: `ui-spec = codigo` · `nota historica preservada` · `BD-18..BD-21 no CONTEXT`.
- Task 2 verify 1: `(cr1),(cr2),(cr3),(cr5) verdes`.

### Mutação real (Task 2): o portão MORDE a frase real

O marcador `VEREDITO_POR_TABELA.entrevista_guias` foi lido do próprio arquivo de teste e retirado do serviço por `perl`. O teste rodou só com o filtro `CR-01-bis`, e o serviço foi restaurado do backup feito antes da mutação:

```
CR-01-bis mordeu nomeando entrevista_guias; md5 5290f90ed2db79199f1d1a2639f39733 -> 124c8cd9560fd1b48c57d807c1833ba5 -> 5290f90ed2db79199f1d1a2639f39733
R=1
AssertionError: veredito sem marcador na frase — a frase não nomeia esta tabela retida; reescreva-a pela 44-UI-SPEC: expected [ 'entrevista_guias' ] to deeply equal []
      Tests  1 failed | 53 skipped (54)
```

- antes = depois (`5290f90e…`), e ambos diferem do mutado (`124c8cd9…`);
- `cmp -s` contra o backup não acusou diferença;
- `git diff --quiet HEAD -- exportacaoService.ts` confirmou depois que o serviço é o do commit `6562031e`.

## Task Commits

1. **Task 1 (TRACER): decisão → contrato → portão → frase → tela, .html e .json.** Commit `6562031e` (feat). O tracer feedback gate foi resolvido assim: interativo, `end-of-phase`, verify só `<automated>`. Os dois verifies rodaram de novo e passaram, então a expansão seguiu sem checkpoint.
2. **Task 2: mutação real + (cr3) derivado (IN-01).** Commit `c1c42fa0` (test).

**Plan metadata:** commit `docs(44-17)` (SUMMARY + STATE + ROADMAP).

## Files Created/Modified

- `src/features/privacidade/services/exportacaoService.ts`: `oQueNaoEsta` reescrita. O docblock ganhou um parágrafo em paráfrase (sem os trechos retirados e sem nenhuma das nove strings do (t)) que aponta o (cr5).
- `src/features/privacidade/services/__tests__/exportacaoService.test.ts`:
  - `VEREDITO_POR_TABELA`, `RAIZ_DO_TITULAR`, os tipos estruturais e os três helpers;
  - o caso (cr5);
  - os controles 2 e 4 do (cr3), agora derivados.
- `.planning/phases/44-exporta-o-acesso/44-UI-SPEC.md`: célula = código, mais a nota CR-01-bis.
- `.planning/phases/44-exporta-o-acesso/44-CONTEXT.md`: adendo BD-18..BD-21.

## Decisions Made

- **`expect.soft` nas listas do (cr5) e nas sondas dos trechos retirados.** O vermelho mostra todas as lacunas de uma vez (marcador e dois trechos), e cada uma nomeia a tabela ou o trecho. As sanidades ficam com `expect` duro, porque uma população vazia deve parar o caso antes.
- **Os helpers e o (cr5) moram dentro do `describe` CR-01, depois do (cr3)**, como pede o plano. `lacunasPorTabela` não tem parâmetro para o texto do YAML: este plano não o lê, e o parâmetro seria TS6133 sob `noUnusedParameters`. O 44-18 o acrescenta na quarta posição.
- **`naoMedidas` e `semRazaoNoYaml` já existem no tipo de retorno e devolvem `[]`.** Nenhuma asserção do (cr5) os lê neste plano, então não podem produzir verde falso. Eles existem para o 44-18 preencher sem mudar a forma do retorno.

## Deviations from Plan

**Commit do tracer como `feat` único, sem um `test(...)` RED separado.** O plano manda commitar os quatro arquivos do Task 1 num só commit `feat(44-17)` depois dos dois verifies verdes. O vermelho foi **executado e registrado** acima, mas não commitado à parte. O `workflow.tdd_mode` não está ligado no `config.json`, então o portão de commits RED/GREEN não se aplica. O Task 2 é um commit `test(44-17)`, como o plano prescreve. Não é desvio de regra 1–4; fica registrado só por transparência.

Fora isso, nada a declarar: o plano foi executado como escrito.

## Issues Encountered

Nenhum.

## Known Stubs

Nenhum stub que chegue à UI. Os campos `naoMedidas` e `semRazaoNoYaml` de `LacunasPorTabela` devolvem `[]` por desenho e não são assertados. O 44-18 os preenche e os asserta, junto com o `(cr5b)` e o bloco `colunas_fora_do_escopo` do catálogo. Eles não entram no `WINDOWS.md` porque não estão sendo usados como prova de nada neste plano.

## Invariantes da rodada (conferidos)

- `git diff --quiet dedca1fb -- docs/compliance supabase` sai 0: artefato, YAML, catálogo, SQL e EFs ficaram byte a byte.
- `REQUIREMENTS.md intocado` (diff contra `dedca1fb`).
- `ROADMAP: só caixas desta rodada`. Mudaram só a caixa do 44-17 e a linha de progresso da Phase 44 (`13/16` → `17/22`, contagem de PLAN/SUMMARY no disco).
- STATE.md: nenhuma linha de corpo removida além de `Last session:` e `Stopped at:`. Foi editado à mão, sem gsd-tools.
- Nenhuma requisição a PROD, nenhum push. `origin/main..HEAD` segue com commits locais, e a publicação é do 44-22.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

O 44-18 pode começar: estender o (cr5) com a cobertura fail-closed das tabelas excluídas que o catálogo nunca mediu (`naoMedidas`), a razão por tabela no YAML (`semRazaoNoYaml`, parâmetro `yamlTexto`) e o `(cr5b)` com sete controles. A frase nova ainda precisa da aprovação do operador no checkpoint do 44-22.

---
*Phase: 44-exporta-o-acesso*
*Completed: 2026-10-07*

## Self-Check: PASSED

- FOUND: os dois arquivos de código, este SUMMARY; commits `6562031e` e `c1c42fa0` no log.
