---
phase: 52-hub-do-rh-dados-e-contato
plan: 23
subsystem: ui
tags: [react, hub-rh, contato, whatsapp, mailto, lgpd, tanstack-query, vitest]

requires:
  - phase: 52-09
    provides: "useCadastroCandidatoRh (EF ler-cadastro-candidato-rh com log; contato: null para todo @invalido.local)"
  - phase: 52-11
    provides: "hub com o bloco de avaliações respondidas (harness de testes do hub)"
provides:
  - "src/features/hub-candidato/lib/contato.ts — contatoUtilizavel, normalizarCelularWhatsApp, montarLinkWhatsApp, montarMailto, formatarCelular, primeiroNome, assuntoEmail, mensagemWhatsApp"
  - "ContatoCandidatoHeader + COPY_CONTATO — «Vaga: {título}», «Enviar e-mail», «Chamar no WhatsApp», skeleton, erro com «Recarregar contato», «Sem contato disponível.»"
  - "HubCandidatoRH monta ContatoCandidatoHeader no cabeçalho, fora das abas (D-12)"
  - "vi.mock de useCadastroCandidatoRh nos cinco testes que montam o hub"
affects: [52-10, 52-14, 52-15, 52-24, 52-SECURITY, 52-UAT]

actuals:
  tokens: 36112   # chars/4 do diff realizado inteiro (inclui ~25k dos três relatórios JUnit da evidência RED); só código: 10952
  tasks: 2
  commits: 4
plan_head_before: 5cd07694e374267a1820bd0c0ce18b8bc900a25d
plan_head_after: 806045c7e2300184f472b3e5d3ed9a372844189f

tech-stack:
  added: []
  patterns:
    - "contato decidido por função pura (contatoUtilizavel) antes de qualquer montagem de link — o componente nunca lê contato do cadastro"
    - "mailto: só de endereço validado por regex sem ?/&/#; assunto por encodeURIComponent"
    - "módulo ainda inexistente carregado por import() com especificador em variável — RED falha por asserção, não por coleta"

key-files:
  created:
    - src/features/hub-candidato/lib/contato.ts
    - src/features/hub-candidato/lib/__tests__/contato.test.ts
    - src/features/hub-candidato/components/ContatoCandidatoHeader.tsx
    - src/features/hub-candidato/components/__tests__/contatoCandidatoHeader.test.tsx
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-23/task1.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-23/task2-lib.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-23/task2-header.json
  modified:
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/features/hub-candidato/components/__tests__/hubAcoesEmTriagem.test.tsx
    - src/features/hub-candidato/components/__tests__/hubAcoesEncerrada.test.tsx
    - src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx
    - src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx
    - src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx

key-decisions:
  - "A linha «Vaga: {título}» fica dentro do ContatoCandidatoHeader (o plano a pôs lá; o título vem da mesma leitura do contato). Com isso ela só aparece quando a leitura do contato termina."
  - "Erro e carregando só tomam a linha quando não há dado (isError && !data, isLoading && !data): um refetch que falha com dado em cache continua mostrando o contato"
  - "Sem nome no cadastro, a mensagem do WhatsApp começa por «Olá!». A UI-SPEC não define esse caso, e um registro real sempre tem nome"
  - "Celular válido aparece formatado (formatarCelular); inválido aparece cru, como gravado, com a frase da Invariante 7"

patterns-established:
  - "Cabeçalho de dado pessoal: o hook mora no componente filho, nunca no corpo do HubCandidatoRH (early return de not-found)"

requirements-completed: [JORN-53]

coverage:
  - id: D1
    description: "O cabeçalho do hub mostra o e-mail do candidato com «Enviar e-mail» (mailto: com assunto da vaga, corpo vazio), lido pelo useCadastroCandidatoRh do 52-09, montado no HubCandidatoRH fora das abas"
    requirement: JORN-53
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/contatoCandidatoHeader.test.tsx#contato com e-mail / mailto: com o assunto da vaga / HubCandidatoRH monta ContatoCandidatoHeader"
        status: pass
    human_judgment: false
  - id: D2
    description: "«Chamar no WhatsApp» com wa.me/55…, a mensagem pronta, target _blank e rel noopener noreferrer. Número fora do formato vira texto com a frase da Invariante 7"
    requirement: JORN-53
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/lib/__tests__/contato.test.ts (40 casos)"
        status: pass
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/contatoCandidatoHeader.test.tsx#celular válido / celular fora do formato"
        status: pass
    human_judgment: false
  - id: D3
    description: "Privacidade (JORN-53, SC2, D-40): fictício com celular no cadastro, tombstone e e-mail @INVALIDO.LOCAL. Os três mostram só «Sem contato disponível.», sem mailto:, wa.me, mensagem pronta, assunto, dígitos ou causa"
    requirement: JORN-53
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/contatoCandidatoHeader.test.tsx#privacidade (3 renders)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Estados: skeleton, erro com «Recarregar contato» (refetch), sem contato, sem título de vaga. O clique não dispara rede (D-15)"
    requirement: JORN-53
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/contatoCandidatoHeader.test.tsx#carregando / erro / sem título / clique"
        status: pass
    human_judgment: false
  - id: D5
    description: "O contato aparece de fato no hub em PROD, com o layout a 360px (quebra sem rolagem) e o WhatsApp abrindo com a mensagem"
    verification: []
    human_judgment: true
    rationale: "Nada foi publicado: a EF e o cliente sobem no 52-15, depois do portão do bloco B. O layout responsivo e o comportamento do WhatsApp e do cliente de e-mail só dá para ver no navegador."

duration: 10min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 23: Contato no cabeçalho do hub Summary

**O cabeçalho do hub do RH passa a ter o contato do candidato. O e-mail vem com «Enviar e-mail» (`mailto:` validado, assunto «Beauty Smile — sua candidatura para {vaga}»). O celular vem com «Chamar no WhatsApp» (`wa.me/55…` com a mensagem pronta, nova aba, `noopener noreferrer`). A leitura é a EF com log do 52-09. Um registro fictício ou anonimizado nunca vira contato: nem com celular gravado, nem com o e-mail marcado chegando de uma EF antiga.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-10-11T05:19:01Z
- **Completed:** 2026-10-11T05:29:00Z
- **Tasks:** 2 (1 tracer + 1 auto, ambas TDD)
- **Files modified:** 13 (7 criados, 6 editados)

## Accomplishments

- `ContatoCandidatoHeader` no cabeçalho do `HubCandidatoRH`, abaixo do nome e do chip e fora das abas (D-12). O hook `useCadastroCandidatoRh` fica dentro do componente, e o corpo do hub não ganhou hook novo.
- `lib/contato.ts` reúne num lugar só as três regras: `contatoUtilizavel` (um `@invalido.local` em qualquer caixa ou com espaço derruba o registro inteiro), `montarMailto` (recusa `?`/`&`/`#`) e `normalizarCelularWhatsApp` (a regra da UI-SPEC).
- Estados E1 cobertos: skeleton `h-10 w-full max-w-md bg-white/5`, erro com «Recarregar contato» (`refetch`), «Sem contato disponível.» sem causa, `break-all` no e-mail e linha `flex flex-wrap gap-4`.
- Os cinco testes que montam o hub ganharam o `vi.mock` do hook. Nenhuma asserção mudou, e os 44 casos seguem verdes.
- **Nada publicado.** O cliente sobe no 52-15.

## Task Commits

1. **Task 1 (tracer): e-mail no cabeçalho, do hook do 52-09 ao «Enviar e-mail»**
   - `b7a2cd9c` test(52-23): cabecalho de contato com o hook mockado (RED)
   - `f2c640ca` feat(52-23): contato no cabecalho do hub — Enviar e-mail (GREEN)
2. **Task 2: WhatsApp, validação do `mailto:` e estados**
   - `32b2fc04` test(52-23): RED — WhatsApp, mailto validado, estados e privacidade do contato
   - `806045c7` feat(52-23): Chamar no WhatsApp, mailto validado e estados do contato (D-13..D-16)

**Tracer gate** (modo interativo, `end-of-phase`, `<verify>` só com `<automated>`): o verify da Task 1 foi re-executado depois do commit e saiu verde, com exit 0, 16 arquivos e 227 casos. Só então a expansão começou.

## Verificação (comandos do plano, literais)

| Comando | Resultado |
|---|---|
| `npx vitest run src/features/hub-candidato src/__tests__/guards/nomes-instrumentos.grep.test.ts src/__tests__/guards/no-service-role-src.grep.test.ts src/__tests__/guards/forbidden-strings.grep.test.ts` | exit 0, 17 arquivos, 280 passaram |
| `npx vitest run src/features/hub-candidato` | exit 0, 14 arquivos, 209 passaram (antes dos 2 casos novos de injeção; depois, verde também) |
| `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- src/features/hub-candidato/components/ContatoCandidatoHeader.tsx` | `TIPOGRAFIA OK (153 linhas acrescentadas varridas)` (rodado depois do commit; com `HubCandidatoRH.tsx` e `lib/contato.ts`: 261 linhas, OK) |
| lint (teto ≤ 90) | `lint exit=2 tsc errors=89`, passa; o pre-commit também reportou 89 em todos os commits |
| suíte inteira `npx vitest run` | 2991 passaram e 2 falharam, ambas em `promessasComExecutor.test.ts` (baseline pré-existente, nenhum arquivo deste plano) |

**Prova de que os testes mordem.** Cada mutação foi feita uma por vez e restaurada depois (`diff` idêntico, 55/55 de volta). Todas ficaram vermelhas:
- tirar `contatoUtilizavel` do cabeçalho: 1 falha (a defesa `@INVALIDO.LOCAL`);
- montar contato a partir do `cadastro` quando `contato` é nulo: 3 falhas;
- tirar o `toLowerCase` da defesa: 3 falhas;
- tirar `rel="noopener"`: 1 falha;
- aceitar DDD começando por `0`: 3 falhas;
- tirar `?`/`&` da regex do `mailto:`: **na primeira rodada falhou só 1 caso, o do `#`**. Os casos `?bcc=x@y.com` e `&bcc=x@y.com` já reprovam por causa do segundo `@`, então não diferenciavam a regra. Foram acrescentados `a@b.com?cc=chefe.com` e `a@b.com&body=oi` (um `@` só), e a mesma mutação passou a dar 2 falhas.

## Files Created/Modified

- `src/features/hub-candidato/lib/contato.ts`: os oito helpers puros
- `src/features/hub-candidato/lib/__tests__/contato.test.ts`: 40 casos
- `src/features/hub-candidato/components/ContatoCandidatoHeader.tsx`: o componente e `COPY_CONTATO`
- `src/features/hub-candidato/components/__tests__/contatoCandidatoHeader.test.tsx`: 17 casos (tracer, WhatsApp/mailto/estados, os três renders de privacidade, montagem no hub)
- `src/features/hub-candidato/components/HubCandidatoRH.tsx`: import e montagem no cabeçalho
- `hubAcoesEmTriagem` / `hubAcoesEncerrada` / `hubEmptyState` / `hubNotFound` / `hubVerRespostas` `.test.tsx`: `vi.mock` do hook
- `.red-52-23/task1.json`, `task2-lib.json`, `task2-header.json`: a evidência RED

## Decisions Made

Ver `key-decisions` no frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Casos de injeção no `mailto:` com um `@` só**
- **Found during:** Task 2 (prova de mordida)
- **Issue:** os casos do `<behavior>` (`?bcc=x@y.com`) não diferenciavam uma regex que esquecesse `?`/`&`, porque o segundo `@` já reprova o endereço. A mitigação do T-52-24 ficava sem teste que a segurasse.
- **Fix:** dois casos novos (`a@b.com?cc=chefe.com`, `a@b.com&body=oi`). Isso só acrescenta asserções e não afrouxa nenhuma.
- **Files modified:** `src/features/hub-candidato/lib/__tests__/contato.test.ts`
- **Committed in:** `806045c7`

---

**Total deviations:** 1 auto-fixed (1 critical). **Impact:** nenhum no comportamento. A mitigação T-52-24 agora tem um teste que reprova quando ela regride.

## Issues Encountered

- O primeiro RED da Task 1 usou `import('../ContatoCandidatoHeader')` com literal. O import-analysis do Vite reprovou a coleta do arquivo, uma falha de carga que **não** serve como RED. Isso foi corrigido antes de qualquer commit com o especificador em variável (molde de `instrumentosDaVaga.test.ts`), e o RED válido veio na segunda execução.

## TDD Gate Compliance

- **RED, Task 1.** Alvo: `ContatoCandidatoHeader — e-mail do candidato com «Enviar e-mail» (52-23 / D-12, D-14) > contato com e-mail → link «Enviar e-mail» com href mailto:`. Classificador: `RED_EVIDENCE_OK` (`target_test_failed`), relatório JUnit, registro em `.red-52-23/task1.json`. **Avaliação semântica:** o arquivo foi coletado (4 casos) e a falha veio na asserção planejada (o componente era `undefined`). O caso do hub montou o `HubCandidatoRH` inteiro e falhou por não achar `hub-contato-email`. Não houve erro de coleta nem de fixture.
- **RED, Task 2.** Foram dois alvos sobre o mesmo relatório JUnit, ambos com `RED_EVIDENCE_OK`:
  - `montarMailto — … > a@b.com?bcc=x@y.com → null …` (`task2-lib.json`): o módulo não existia, e os 38 casos da lib falharam por asserção (função ausente).
  - `ContatoCandidatoHeader — privacidade … > defesa — contato.email em @INVALIDO.LOCAL …` (`task2-header.json`): o cabeçalho do tracer tratava o e-mail marcado como contato.
  - **Avaliação semântica:** fictício, tombstone e «sem e-mail e sem celular» passaram já no RED. Era o esperado, porque o tracer lê só de `contato`. A defesa `@INVALIDO.LOCAL` é o caso que morde.
- **GREEN:** `f2c640ca` e `806045c7`. REFACTOR: nenhum.

## Known Stubs

None.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`. As mitigações estão testadas: T-52-24 (`montarMailto`, com os casos de injeção), T-52-25 (`rel`) e T-52-78 (os três renders de privacidade e `contatoUtilizavel`). Para T-52-SC, nenhuma instalação foi feita (ícones do `lucide-react`, que já existia).

## User Setup Required

None.

## Next Phase Readiness

- 52-10 (abas) deve manter o `ContatoCandidatoHeader` **acima** do `Tabs`, como o cabeçalho de hoje. As abas nascem abaixo dele.
- 52-24 pode reusar `formatarCelular` de `lib/contato.ts` para o celular como texto na aba Cadastro, ou mover o helper para `formatos.ts` como a RESEARCH sugere.
- O deploy é do 52-15. Depois dele, `git log --oneline origin/main..HEAD` tem de sair vazio (CLAUDE.md). Neste plano não houve push.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- 7/7 arquivos criados presentes; commits `b7a2cd9c`, `f2c640ca`, `32b2fc04`, `806045c7` ancestrais de HEAD.
