---
phase: 52-hub-do-rh-dados-e-contato
plan: 24
subsystem: ui
tags: [react, hub-rh, inscricao, linkify, xss, rnf-07a, vitest]

requires:
  - phase: 52-09
    provides: "useCadastroCandidatoRh com `inscricao` (pergunta_id, bloco, ordem, texto_pergunta, tipo_resposta, eliminatoria, removida, resposta { texto?, opcoes?, numero? } | null), já na ordem do formulário"
  - phase: 52-10
    provides: "Hub em quatro abas (?aba=), AbaCadastroInscricao local ao HubCandidatoRH, DadosCadastroBloco com LinkedIn/Instagram como texto"
  - phase: 52-06
    provides: "FormularioCandidaturaPage com CartaoInscricaoEncerrada já extraído (este plano mexeu só nos helpers de bloco)"
provides:
  - "src/features/vagas/lib/blocosFormulario.ts — DEFAULT_BLOCO, ROTULO_BLOCO, rotuloDoBloco, groupByBloco<T extends { bloco: string | null }> (uma cópia só, formulário e hub)"
  - "src/features/hub-candidato/lib/linkify.ts — segmentosComLinks(texto): Array<string | { href }>, só http(s), pontuação final .,;:) fora"
  - "src/features/hub-candidato/components/TextoComLinks.tsx — <a target=_blank rel=noopener noreferrer aria-label=«{url} (abre em nova aba)»> por segmento"
  - "RespostasInscricaoBloco + COPY_RESPOSTAS_INSCRICAO — a seção «Respostas da inscrição» na aba Cadastro"
  - "DadosCadastroBloco: LinkedIn/Instagram por segmentosComLinks"
affects: [52-14, 52-15, 52-25, 52-UAT]

actuals:
  tokens: 41977   # chars/4 do diff inteiro (inclui ~30k dos quatro registros RED com o JUnit embutido); só src/: 9947
  tasks: 1
  commits: 3
plan_head_before: df17f88e5bc66cdc6aee9f833a808d1888d6deac
plan_head_after: 40450826dec0859ec081de17f410288e381c2753

tech-stack:
  added: []
  patterns:
    - "Texto do candidato com link: segmentosComLinks (puro, .ts) + TextoComLinks (render) — um nó de texto por string, um <a> por { href }"
    - "Teste de 'nenhum HTML cru' lendo o fonte dos três arquivos (existsSync + readFileSync), além do teste de DOM com <script>"

key-files:
  created:
    - src/features/vagas/lib/blocosFormulario.ts
    - src/features/hub-candidato/lib/linkify.ts
    - src/features/hub-candidato/components/TextoComLinks.tsx
    - src/features/hub-candidato/components/RespostasInscricaoBloco.tsx
    - src/features/hub-candidato/lib/__tests__/linkify.test.ts
    - src/features/hub-candidato/components/__tests__/respostasInscricaoBloco.test.tsx
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-24/task1-linkify.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-24/task1-respostas.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-24/task1-cadastro.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-24/task1-hub.json
  modified:
    - src/components/pages/FormularioCandidaturaPage.tsx
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/features/hub-candidato/components/DadosCadastroBloco.tsx
    - src/features/hub-candidato/components/__tests__/dadosCadastroBloco.test.tsx
    - src/features/hub-candidato/components/__tests__/hubAbas.test.tsx

key-decisions:
  - "O render dos links mora num componente próprio, TextoComLinks.tsx, usado pela seção nova e pela DadosCadastroBloco. Assim a ficha do cadastro não importa da seção de respostas, e a regra de link fica num lugar só"
  - "A seção de respostas é um segundo HubSection dentro do mesmo AbaCadastroInscricao: mesmo hook, mesmo isLoading/isError (skeleton e erro do HubSection, E4). O vazio é do próprio bloco, em estado com_dados"
  - "As respostas se agrupam na ordem em que a EF entregou, sem reordenar no cliente. Há uma mutação que reordena por `ordem` e é pega pelo teste"
  - "multiple_choice → <ul>. single_choice com uma opção → <p>. Mais de uma opção em qualquer tipo também vai para <ul>. Opções e texto livre passam pelo TextoComLinks; o número sai por toLocaleString('pt-BR')"
  - "O regex de URL ignora maiúsculas (HTTPS:// também vira link), mas continua só http(s). «https://» sem endereço (por exemplo «https://.») fica texto"
  - "O selo usa Badge variant=outline com border-white/20 bg-white/5 text-sm font-semibold text-white/80. O twMerge do cn sobrescreve o text-xs font-medium da base"

patterns-established:
  - "Texto livre de candidato no hub: sempre TextoComLinks (ou nó de texto puro), nunca HTML cru"

requirements-completed: []   # JORN-55 também é declarado pelo 52-14 e pelo 52-15, ainda sem SUMMARY (gate de ID compartilhado). Nada publicado (52-15). REQUIREMENTS.md não foi tocado

coverage:
  - id: D1
    description: "«Respostas da inscrição» na aba Cadastro, abaixo de «Dados do cadastro», com a inscricao do mesmo useCadastroCandidatoRh"
    requirement: JORN-55
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubAbas.test.tsx#?aba=cadastro → «Respostas da inscrição» abaixo de «Dados do cadastro»"
        status: pass
    human_judgment: false
  - id: D2
    description: "Grupos por bloco (rotuloDoBloco; vazio → Geral; desconhecido → o nome), <ol> na ordem da EF, ficha neutra, vazio sem causa, resposta por tipo, Sem resposta, nota de removida, código cru"
    requirement: JORN-55
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/respostasInscricaoBloco.test.tsx (grupos/ordem, vazio, por tipo, parciais)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Eliminatória com selo neutro e sem veredito, sem opção não escolhida (D-19, RNF-07a)"
    requirement: JORN-55
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/respostasInscricaoBloco.test.tsx#selo «Eliminatória» só na eliminatória …"
        status: pass
    human_judgment: false
  - id: D4
    description: "Links só http(s), por segmento, em aba nova com rel noopener noreferrer e aria-label; <script>/javascript:/data: como texto; LinkedIn/Instagram pela mesma regra"
    requirement: JORN-55
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/lib/__tests__/linkify.test.ts (6 casos)"
        status: pass
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/respostasInscricaoBloco.test.tsx#texto do candidato e links (4 casos)"
        status: pass
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/dadosCadastroBloco.test.tsx#LinkedIn https → link … / javascript: ou data: ficam texto"
        status: pass
    human_judgment: false
  - id: D5
    description: "O formulário do candidato segue idêntico depois da extração dos blocos"
    verification:
      - kind: unit
        ref: "npx vitest run src/components/pages/__tests__ src/features/vagas (21 arquivos, 204/204, no commit refactor)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Leitura real em PROD: respostas longas, portfólio clicável abrindo em aba nova, selo legível no vidro, quebra a 360px"
    verification: []
    human_judgment: true
    rationale: "Nada foi publicado: EF e cliente sobem no 52-15. Layout, legibilidade do selo e abertura do link em aba nova só se veem no navegador, e com cache limpo."

duration: 10min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 24: Respostas da inscrição no hub do RH Summary

**A aba «Cadastro e inscrição» do hub ganhou a seção «Respostas da inscrição». As respostas aparecem agrupadas e ordenadas como no formulário que o candidato preencheu, usando a mesma função de agrupamento do formulário, agora extraída para `blocosFormulario.ts`. A pergunta eliminatória leva um selo neutro e nenhum veredito. Só URLs `http(s)` viram link, em aba nova; o resto, inclusive `<script>` e `javascript:`, aparece como texto. O LinkedIn e o Instagram da ficha seguem a mesma regra de link.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-10-11T05:40:05Z
- **Completed:** 2026-10-11T05:49:40Z
- **Tasks:** 1 (tracer, TDD)
- **Files modified:** 15 (10 criados, 5 editados)

## Accomplishments

- **`blocosFormulario.ts`.** `DEFAULT_BLOCO`, `ROTULO_BLOCO`, `rotuloDoBloco` e `groupByBloco` saíram do `FormularioCandidaturaPage`, que agora os importa e não os define mais. O `groupByBloco` virou genérico sobre `{ bloco: string | null }`. Os testes de página e de vagas seguiram verdes: 204/204.
- **`RespostasInscricaoBloco`.**
  - Um `h3` (`rotuloDoBloco`) por grupo que tenha pergunta.
  - Dentro de cada grupo, um `<ol>` na ordem da EF, com uma ficha neutra por pergunta (`rounded-lg border border-white/15 bg-white/5 p-4`).
  - Pergunta em `text-sm font-semibold text-white/70`. Selo «Eliminatória» só se `eliminatoria`.
  - Resposta em `text-base text-white/90 leading-relaxed whitespace-pre-line break-words`.
  - «Sem resposta» quando não há resposta; a nota de pergunta removida quando ela saiu do formulário depois da inscrição.
  - Vazio: as duas frases da UI-SPEC, sem alegar causa.
- **`segmentosComLinks` + `TextoComLinks`.** Só `http(s)` vira link, com `target="_blank"`, `rel="noopener noreferrer"`, `aria-label` «{url} (abre em nova aba)», `ExternalLink` (`h-4 w-4 ml-1`, `aria-hidden`) e `break-all`. A pontuação final fica fora do link. Nenhum dos arquivos usa HTML cru, e um teste lê o fonte para garantir isso.
- **Hub.** `HubSection titulo="Respostas da inscrição"` logo abaixo de «Dados do cadastro», com `data?.inscricao ?? []` do mesmo hook. Não há leitura nova; skeleton e erro são os do `HubSection`.
- **`DadosCadastroBloco`.** LinkedIn e Instagram passam por `TextoComLinks`. E-mail e celular seguem texto (D-40).
- **Nada publicado.** O marcador `hub-respostas-inscricao` está no chunk lazy `build/assets/PerfilCandidatoRHPage-BOMGpE3i.js` (build local). O deploy é do 52-15.

## Task Commits

1. **Task 1 (tracer): «Respostas da inscrição»**
   - `71cfd86c` refactor(52-24): blocos do formulario compartilhados (uma copia so)
   - `7745a2c2` test(52-24): RED — respostas da inscricao, selo Eliminatoria e links so http(s)
   - `40450826` feat(52-24): respostas da inscricao no hub — selo Eliminatoria, links so http(s) (D-19, D-20)

**Tracer gate.** Modo interativo, `end-of-phase`, e o `<verify>` só tem `<automated>`. Os três comandos foram re-executados depois do commit GREEN e saíram verdes (tabela abaixo). Como é a única task do plano, não há expansão.

## Verificação (comandos do plano, literais)

| Comando | Resultado |
|---|---|
| `npx vitest run src/features/hub-candidato src/components/pages/__tests__ src/__tests__/guards` | exit 0, 44 arquivos, **500 passaram**, 0 falhas. O `DOMException [AbortError]` do happy-dom no teardown é o mesmo já registrado no 52-10 e não é falha |
| `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- src/features/hub-candidato/components/RespostasInscricaoBloco.tsx` | `TIPOGRAFIA OK (126 linhas acrescentadas varridas)` |
| lint (teto ≤ 90) | `lint exit=2 tsc errors=89`, passa. O pre-commit deu 89 nos três commits |
| suíte inteira `npx vitest run` | 3045 passaram, 2 falharam, ambas em `promessasComExecutor.test.ts` (baseline pré-existente) |
| tipografia informativa: `TextoComLinks.tsx`, `linkify.ts`, `blocosFormulario.ts`, `DadosCadastroBloco.tsx` | `TIPOGRAFIA OK (333 linhas acrescentadas varridas)` |
| `npm run build` + `grep -rl hub-respostas-inscricao build/assets/` | build exit 0; marcador só no chunk lazy `PerfilCandidatoRHPage-*.js` |

**Prova de que os testes mordem.** Cada mutação foi aplicada sozinha e restaurada (backup em arquivo). Todas ficaram vermelhas:

| Mutação | Falhas |
|---|---|
| pontuação final dentro do link | 4 |
| `javascript:`/`data:` aceitos no regex | 4 |
| «https://» sem endereço vira link | 1 |
| sem `rel` / sem `target` | 2 / 2 |
| selo em toda pergunta | 1 |
| múltipla escolha sem `<ul>` | 1 |
| sem «Sem resposta» / sem a nota de removida | 1 / 1 |
| número sem `pt-BR` | 1 |
| reordenar por `ordem` no cliente | 1 |
| sem `whitespace-pre-line` | 1 |
| LinkedIn sem links | 1 |
| hub sem a seção | 1 |
| vazio sem a frase | 1 |

## Files Created/Modified

- `src/features/vagas/lib/blocosFormulario.ts`: os helpers de bloco, uma cópia só
- `src/components/pages/FormularioCandidaturaPage.tsx`: importa `groupByBloco`/`rotuloDoBloco` e não define mais nenhum dos quatro
- `src/features/hub-candidato/lib/linkify.ts`: `segmentosComLinks`
- `src/features/hub-candidato/components/TextoComLinks.tsx`: o render dos segmentos
- `src/features/hub-candidato/components/RespostasInscricaoBloco.tsx`: a seção e `COPY_RESPOSTAS_INSCRICAO`
- `src/features/hub-candidato/components/HubCandidatoRH.tsx`: o segundo `HubSection` na `AbaCadastroInscricao`
- `src/features/hub-candidato/components/DadosCadastroBloco.tsx`: `comLinks` no `Par` de LinkedIn e Instagram
- `linkify.test.ts` (6) e `respostasInscricaoBloco.test.tsx` (12): os testes novos. `dadosCadastroBloco.test.tsx` (1 caso substituído, 1 novo) e `hubAbas.test.tsx` (1 caso novo)
- `.red-52-24/task1-*.json`: a evidência RED

## Decisions Made

Ver `key-decisions` no frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Substituído o caso do 52-10 «nenhum link na ficha … (o link é do 52-24)»**
- **Found during:** Task 1 (RED)
- **Issue:** `dadosCadastroBloco.test.tsx` tinha um caso que exigia `querySelector('a') === null` com `linkedin_url: 'https://…'`. O próprio título dizia que o link era do 52-24. Esse caso contradiz o `<behavior>` deste plano («LinkedIn `https://linkedin.com/in/x` em Dados do cadastro → link em aba nova»), e o `<verify>` (`npx vitest run src/features/hub-candidato`) roda esse arquivo. Não dava para cumprir os dois.
- **Fix:** o caso saiu e entraram dois no lugar, com o contrato da D-20 mais estreito:
  - LinkedIn `https` vira exatamente um `<a>` com `href`, `target`, `rel` e `aria-label`; Instagram `www.…` fica texto; a ficha tem **um** `<a>` só, de modo que e-mail e celular seguem texto.
  - `javascript:` e `data:` em LinkedIn/Instagram ficam texto, sem nenhum `[href]` e sem `<script>`.
  - Nenhuma outra asserção do arquivo mudou. Um comentário no teste registra a substituição.
- **Por que não parei.** O plano não manda parar aqui. O caso antigo se declarava provisório e apontava para este plano, e o substituto morde mais do que o original. **Mesmo assim, foi uma edição de teste existente e merece o olhar do revisor (52-14).**
- **Files modified:** `src/features/hub-candidato/components/__tests__/dadosCadastroBloco.test.tsx`
- **Committed in:** `7745a2c2` (RED; o caso novo do LinkedIn foi um dos alvos `RED_EVIDENCE_OK`)

**2. [Rule 2 - Missing Critical] Um caso no `hubAbas.test.tsx`, arquivo fora da lista do plano**
- **Issue:** nenhum teste da lista provava que a seção é montada no hub, e o artefato `key_links` (HubCandidatoRH → RespostasInscricaoBloco) ficaria sem verificação.
- **Fix:** um caso novo: a seção aparece abaixo de «Dados do cadastro» com a `inscricao` do mock do mesmo hook, e todas as chamadas do hook são `('cand-1')`. A mutação «hub sem a seção» é pega por ele. Nenhum caso existente mudou.
- **Committed in:** `7745a2c2`

**3. [Organização] `TextoComLinks.tsx`, arquivo fora da lista**
- O render dos links ficou num componente próprio para a `DadosCadastroBloco` não importar da seção de respostas. Pelo plano, LinkedIn e Instagram passam pelo mesmo `segmentosComLinks`, e passam.
- **Committed in:** `40450826`

**4. [Processo] Comentários sem o literal `dangerouslySetInnerHTML`**
- O teste de fonte proíbe `innerHTML` nos três arquivos, inclusive em comentário (mesma lição do 52-09 com `select('*')`). Os comentários dizem «HTML cru injetado no DOM».

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 critical) + 2 de organização/processo. **Impact:** um caso de teste do 52-10 foi substituído por um contrato mais estrito, e o revisor deve conferir. Não houve aumento de escopo.

## Issues Encountered

- **Tipografia em `HubCandidatoRH.tsx` (pré-existente, dono 52-25).** `p52_tipografia.cjs` sobre esse arquivo dá os mesmos 2 achados registrados no 52-10: os `h2` «Linha do funil» e «Currículo» (`text-xl … md:text-2xl`), linhas herdadas e re-indentadas pelo 52-10. São do 52-25 (D-52-U22). Não foram editados aqui, e o `<verify>` deste plano roda a tipografia só sobre `RespostasInscricaoBloco.tsx`, que deu OK.
- **O título da seção** vem do `HubSection` (`text-xl md:text-2xl`, no próprio `HubSection.tsx`). Não entra no diff deste plano.

## TDD Gate Compliance

- **Andaime:** `71cfd86c` refactor. É a extração pura dos blocos, pedida pelo plano como commit próprio.
- **RED** (`7745a2c2`). Os quatro alvos saíram do mesmo relatório JUnit (`--reporter=junit`, exit 1, 41 casos, 20 falhas, 0 erros), e os quatro deram `RED_EVIDENCE_OK` (`target_test_failed`):
  - `linkify › 'veja https://x.com/a. …'` (`task1-linkify.json`). O arquivo foi coletado (6 casos). O módulo não existia e a falha foi a asserção «segmentosComLinks não existe».
  - `RespostasInscricaoBloco › https://x.com/a. → link …` (`task1-respostas.json`). 12 casos coletados; a falha foi a asserção de componente ausente.
  - `DadosCadastroBloco › LinkedIn https → link …` (`task1-cadastro.json`). O componente real montou (os outros 12 casos passaram). A falha foi a asserção planejada: nenhum `link` no par LinkedIn.
  - `HubCandidatoRH › ?aba=cadastro → «Respostas da inscrição» …` (`task1-hub.json`). O hub montou inteiro (os outros 9 passaram). A falha foi o heading ausente.
  - Nenhum erro de coleta, de import ou de fixture.
- **GREEN:** `40450826`. **REFACTOR:** nenhum.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`:
- **T-52-27:** nó de texto e segmentos, sem HTML cru. Testado com `<script>`/`<img onerror>` e com leitura do fonte.
- **T-52-28:** só `http(s)` vira `<a>`. Testado com `javascript:`, `data:` e `mailto:`.
- **T-52-29:** `rel="noopener noreferrer"`, com mutação que morde.
- **T-52-30:** o componente só recebe `eliminatoria: boolean` e a resposta. O DOM não tem veredito nem a outra opção.
- **T-52-SC:** nenhuma instalação.

## User Setup Required

None.

## Next Phase Readiness

- O 52-14 (review) deve olhar o desvio 1, a substituição do caso do 52-10.
- O 52-25 limpa os 2 achados de tipografia do `HubCandidatoRH.tsx`.
- O 52-15 publica; depois do deploy, `git log --oneline origin/main..HEAD` tem de sair vazio. Sem push neste plano.
- `REQUIREMENTS.md` não foi tocado: o JORN-55 também é declarado pelo 52-14 e pelo 52-15.

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- 10/10 arquivos criados presentes; commits `71cfd86c`, `7745a2c2` e `40450826` ancestrais de HEAD; nenhum `dangerouslySetInnerHTML` nos três arquivos; o `FormularioCandidaturaPage.tsx` não define mais `ROTULO_BLOCO`/`DEFAULT_BLOCO`/`rotuloDoBloco`/`groupByBloco`.
