---
phase: 52-hub-do-rh-dados-e-contato
plan: 10
subsystem: ui
tags: [react, radix-tabs, react-router, hub-rh, cadastro, lgpd, vitest]

requires:
  - phase: 52-09
    provides: "useCadastroCandidatoRh (EF ler-cadastro-candidato-rh com log; cadastro com 19 campos, disponibilidade, email null nos fictícios)"
  - phase: 52-11
    provides: "componentes da aba Avaliações (BigFiveResultadoHub, SjtMcDetalhe via ScorecardAvaliacao) — montados pelo 52-25"
  - phase: 52-23
    provides: "ContatoCandidatoHeader no cabeçalho do hub; as abas nascem abaixo dele"
provides:
  - "HubCandidatoRH em quatro abas (Resumo · Cadastro e inscrição · Avaliações · Histórico), data-testid hub-abas, aba em ?aba= gravada com replace; valor desconhecido → resumo"
  - "ABAS_HUB (rótulos e valores das abas, exportado)"
  - "AbaCadastroInscricao (local ao HubCandidatoRH): HubSection «Dados do cadastro» lido pelo useCadastroCandidatoRh"
  - "DadosCadastroBloco + COPY_DADOS_CADASTRO — 10 pares + «Endereço» (7) + «Disponibilidade» (3), «Não informado», celular texto puro"
  - "lib/formatos.ts — formatarCpf, formatarCep, formatarDataBr, idadeEm, formatarNascimento, inicioDisponibilidade, ROTULO_GENERO/COMO_CONHECEU/TURNO/MODELO_TRABALHO e rotuloX()"
affects: [52-14, 52-15, 52-24, 52-25, 52-UAT]

actuals:
  tokens: 67132   # chars/4 do diff inteiro (inclui ~43k dos três registros RED com o JUnit embutido); só src/: 23642
  tasks: 1
  commits: 2
plan_head_before: 2e93970cccec82bba684e33283d5f8aadfcf6ff1
plan_head_after: e0417b3324ce37e04f46cb714cca46a21ce8749f

tech-stack:
  added: []
  patterns:
    - "Aba na URL: useSearchParams acima do early return; setSearchParams com cópia do URLSearchParams e { replace: true }"
    - "Hook de dado pessoal num filho local da aba (como o 52-23 no cabeçalho), nunca no corpo do hub"
    - "Teste de navegação com createMemoryRouter + espião em volta do useSearchParams real (vê as opções E a URL, e historyAction === 'REPLACE')"

key-files:
  created:
    - src/features/hub-candidato/components/DadosCadastroBloco.tsx
    - src/features/hub-candidato/lib/formatos.ts
    - src/features/hub-candidato/lib/__tests__/formatos.test.ts
    - src/features/hub-candidato/components/__tests__/hubAbas.test.tsx
    - src/features/hub-candidato/components/__tests__/dadosCadastroBloco.test.tsx
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-10/task1-abas.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-10/task1-cadastro.json
    - .planning/phases/52-hub-do-rh-dados-e-contato/.red-52-10/task1-formatos.json
  modified:
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/features/hub-candidato/components/__tests__/hubAcoesEmTriagem.test.tsx
    - src/features/hub-candidato/components/__tests__/hubAcoesEncerrada.test.tsx
    - src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx
    - src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx
    - src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx
    - src/features/hub-candidato/components/__tests__/contatoCandidatoHeader.test.tsx

key-decisions:
  - "O hook useCadastroCandidatoRh é chamado num filho local (AbaCadastroInscricao), não no corpo do hub: o not-found não dispara a EF (nem a linha de log), e a chave é a mesma do cabeçalho — uma chamada à EF serve aos dois"
  - "«Endereço» e «Disponibilidade» são h3 seguidos de um <dl> próprio em grade, em vez de h3 dentro do mesmo <dl>: um <h3> não é filho válido de <dl>. Visualmente igual (o h3 ocupa a linha inteira, como o sm:col-span-2 pedia)"
  - "Um e-mail @invalido.local que chegue no cadastro (EF antiga) vira «Não informado» — a mesma regra do cabeçalho (UI-SPEC, linha 2 da ficha)"
  - "LinkedIn/Instagram: URL se houver, senão o @/nome — ambos como texto; o link http(s) é do 52-24"
  - "setSearchParams recebe uma CÓPIA do URLSearchParams (new URLSearchParams(atual)), não o objeto memoizado mutado; outros parâmetros da URL são preservados"
  - "Além dos mapas ROTULO_*, o módulo exporta rotuloGenero/rotuloComoConheceu/rotuloTurno/rotuloModeloTrabalho, que aplicam o mapa sobre lower(trim(valor)) e devolvem o valor cru quando desconhecido"

patterns-established:
  - "Teste existente do hub que procura conteúdo de uma aba monta com <MemoryRouter initialEntries={['/rh/candidatos/cand-1?aba=<aba>']}>"

requirements-completed: [JORN-54, JORN-58]

coverage:
  - id: D1
    description: "O hub tem quatro abas (Resumo abre primeiro), com a aba na URL (?aba=) gravada com replace; valor desconhecido → Resumo"
    requirement: JORN-58
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubAbas.test.tsx (9 casos)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Seções existentes na aba da D-52-U01 sem mudar conteúdo; ações de funil no «Próximo passo» do Resumo; contato fora das abas"
    requirement: JORN-58
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/hubAbas.test.tsx#Resumo / ?aba=avaliacoes / ?aba=historico / o contato fica no cabeçalho"
        status: pass
      - kind: unit
        ref: "hubAcoesEmTriagem, hubAcoesEncerrada, hubEmptyState, hubVerRespostas, hubNotFound, contatoCandidatoHeader (só initialEntries; nenhuma asserção mudou)"
        status: pass
    human_judgment: false
  - id: D3
    description: "«Dados do cadastro» lido pelo useCadastroCandidatoRh: 10 pares + Endereço + Disponibilidade na ordem da UI-SPEC, formatos (CPF, CEP, nascimento com idade em São Paulo), «Não informado», Detalhes só com valor"
    requirement: JORN-54
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/dadosCadastroBloco.test.tsx (12 casos)"
        status: pass
      - kind: unit
        ref: "src/features/hub-candidato/lib/__tests__/formatos.test.ts (13 casos)"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-40: registro fictício/anonimizado mostra o celular como texto puro, sem tel:/wa.me/mailto: nem botão na ficha; campo livre com marcação vira texto (T-52-71)"
    requirement: JORN-54
    verification:
      - kind: unit
        ref: "src/features/hub-candidato/components/__tests__/dadosCadastroBloco.test.tsx#fictício / e-mail marcado / nenhum link / campo livre"
        status: pass
    human_judgment: false
  - id: D5
    description: "As abas e a ficha em PROD: quebra das 4 abas a 360px, leitura da ficha com dado real, volta de um workspace caindo na aba certa"
    verification: []
    human_judgment: true
    rationale: "Nada foi publicado: a EF e o cliente sobem no 52-15. Layout responsivo e a sensação de navegação só se veem no navegador."

duration: 10min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 10: Hub do RH em abas e «Dados do cadastro» Summary

**O hub do RH passou a ter quatro abas (Resumo · Cadastro e inscrição · Avaliações · Histórico), e a aba fica na URL (`?aba=`, gravada com `replace`). A aba «Cadastro e inscrição» mostra a ficha inteira do candidato — os 10 dados pessoais, «Endereço» e «Disponibilidade» — lida pela mesma chamada à EF com log que alimenta o contato do cabeçalho. O celular de registro fictício aparece como texto puro, sem link.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-10-11T05:28:56Z
- **Completed:** 2026-10-11T05:38:30Z
- **Tasks:** 1 (tracer, TDD)
- **Files modified:** 15 (8 criados, 7 editados)

## Accomplishments

- `HubCandidatoRH`: `Tabs` do Radix com `data-testid="hub-abas"`. A `TabsList` usa `flex h-auto w-full flex-wrap gap-2 bg-transparent p-0` e os gatilhos têm as classes do `EntrevistaWorkspace`. Cada `TabsContent` é `space-y-6 pt-2`. `useSearchParams` fica acima do early return de not-found.
- Distribuição da D-52-U01, sem mudar o conteúdo de nenhuma seção:
  - **Resumo:** Próximo passo (com Avançar/Retroceder/Rejeitar), Linha do funil, Currículo, Análise da IA, Agendamento, Decisão Final.
  - **Avaliações:** Avaliação Assíncrona + «Ver respostas», Prova cognitiva, Raciocínio lógico (Matrizes), Redação + «Abrir workspace de redação», Entrevista.
  - **Histórico:** `HistoricoBlock`.
  - O contato segue no cabeçalho, fora das abas.
- Aba «Cadastro e inscrição»: `HubSection titulo="Dados do cadastro"` com `DadosCadastroBloco`, a partir de `useCadastroCandidatoRh(candidaturaId)`. Carregando e erro ficam com o `HubSection`.
- `DadosCadastroBloco`: os pares na ordem da UI-SPEC.
  - Campo ausente → «Não informado» (`text-white/60`).
  - E-mail `break-all`; todo `<dd>` tem `break-words`.
  - «Detalhes de como conheceu» só aparece com valor.
  - Disponibilidade sem linha → três «Não informado».
  - Nenhum link nem botão.
- `lib/formatos.ts`: helpers puros, sem dependência. A idade é calculada na data de São Paulo, por `Intl.DateTimeFormat` com `America/Sao_Paulo`.
- Os seis testes que montam o hub ganharam só o `MemoryRouter` com `initialEntries` `?aba=`. Nenhuma asserção mudou; o diff é `import` + wrapper.
- **Nada publicado.** O cliente sobe no 52-15.

## Task Commits

1. **Task 1 (tracer): abas na URL e «Dados do cadastro»**
   - `c9f112a1` test(52-10): RED — abas na URL, Dados do cadastro e formatos
   - `e0417b33` feat(52-10): hub em quatro abas com a aba na URL; Dados do cadastro (D-08, D-09, D-17, D-52-U18)

**Tracer gate:** modo interativo, `end-of-phase`, e o `<verify>` só tem `<automated>`. O verify foi re-executado depois do commit GREEN e saiu verde (exit 0, 19 arquivos, 305 casos). É a única task do plano, então não há expansão.

## Verificação (comandos do plano, literais)

| Comando | Resultado |
|---|---|
| `npx vitest run src/features/hub-candidato src/__tests__/guards/nomes-instrumentos.grep.test.ts src/__tests__/guards/forbidden-strings.grep.test.ts` | exit 0, 19 arquivos, **305 passaram**, 0 falhas |
| `npm run build … grep -rl "hub-abas" build/assets/ \| grep -v '/index-'` | `marcador em chunk lazy: build/assets/PerfilCandidatoRHPage-BgltOupO.js` (o chunk lazy da rota do RH; o marcador não está no índice) |
| lint (teto ≤ 90) | `lint exit=2 tsc errors=89`, passa. O pre-commit também deu 89 nos dois commits |
| suíte inteira `npx vitest run` | 3025 passaram, 2 falharam, ambas em `promessasComExecutor.test.ts` (baseline pré-existente) |
| `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- DadosCadastroBloco.tsx formatos.ts` | `TIPOGRAFIA OK (322 linhas acrescentadas varridas)` |

**Prova de que os testes mordem.** Cada mutação foi aplicada e restaurada uma por vez (`git diff --quiet` nos 3 arquivos depois). Todas ficaram vermelhas:

| Mutação | Falhas |
|---|---|
| `{ replace: false }` | 1 |
| aba padrão `cadastro` em vez de `resumo` | 2 |
| ausente vira `—` | 5 |
| celular vira `<a href="tel:">` | 1 |
| sem a defesa `@invalido.local` no e-mail | 1 |
| «Detalhes» sempre renderizado | 2 |
| mapa sem `toLowerCase` | 1 |
| fuso `UTC` em vez de São Paulo | 1 |
| sem o singular «(1 ano)» | 1 |
| aba Cadastro sem a seção | 1 |

## Files Created/Modified

- `src/features/hub-candidato/components/HubCandidatoRH.tsx`: abas, `?aba=`, `ABAS_HUB`, `AbaCadastroInscricao`, seções redistribuídas
- `src/features/hub-candidato/components/DadosCadastroBloco.tsx`: a ficha e `COPY_DADOS_CADASTRO`
- `src/features/hub-candidato/lib/formatos.ts`: formatos e mapas
- `formatos.test.ts` (13), `dadosCadastroBloco.test.tsx` (12), `hubAbas.test.tsx` (9): os testes novos
- `hubAcoesEmTriagem` / `hubAcoesEncerrada` / `hubNotFound` / `contatoCandidatoHeader` (`?aba=resumo`) e `hubEmptyState` / `hubVerRespostas` (`?aba=avaliacoes`): só o `MemoryRouter`
- `.red-52-10/task1-*.json`: a evidência RED

## Decisions Made

Ver `key-decisions` no frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Os testes do hub não tinham Router: entrou o `MemoryRouter` inteiro, não só o `initialEntries`**
- **Found during:** Task 1 (GREEN)
- **Issue:** o plano supunha que os testes já montavam com `MemoryRouter` e mandava mudar só o `initialEntries`. Na verdade eles mockam `useParams`/`useNavigate` e renderizam sem Router nenhum, e o `useSearchParams` lança fora de um Router (35 falhas).
- **Fix:** cada montagem do hub ganhou `<MemoryRouter initialEntries={['/rh/candidatos/cand-1?aba=<aba>']}>` e o `import`. Nenhuma asserção mudou. O diff de cada arquivo é só `import` + wrapper (conferido com `git diff -U0`).
- **Files modified:** os 4 do plano (`hubAcoesEmTriagem`, `hubAcoesEncerrada`, `hubEmptyState`, `hubVerRespostas`) e mais 2 fora da lista: `hubNotFound.test.tsx`, porque o hook roda antes do early return, e `contatoCandidatoHeader.test.tsx`, porque o caso de montagem do 52-23 monta o hub. O `historicoAtorRotulos.test.tsx` não monta o hub e ficou intocado.
- **Committed in:** `e0417b33`

**2. [Rule 2 - Missing Critical] Defesa `@invalido.local` no e-mail da ficha**
- **Found during:** Task 1
- **Issue:** a UI-SPEC (linha 2 da ficha) pede «a mesma regra do `@invalido.local`». O 52-09 já devolve `email: null` nos fictícios, mas uma EF antiga devolveria o endereço marcado.
- **Fix:** um e-mail em `@invalido.local`, em qualquer caixa e com espaço, vira «Não informado». O celular continua como texto (D-40). Tem teste próprio e mutação que morde.
- **Committed in:** `e0417b33`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 critical). **Impact:** nenhuma asserção existente mudou. A defesa só estreita o que aparece.

## Issues Encountered

- **Tipografia em `HubCandidatoRH.tsx`.** `p52_tipografia.cjs` sobre esse arquivo dá 2 achados: os `h2` «Linha do funil» e «Currículo» (`text-xl … md:text-2xl`). As linhas são herança: entraram no diff só porque foram re-indentadas para dentro do `TabsContent`. O plano manda mover as seções «sem mudar o conteúdo delas», e o 52-25 é dono exatamente desses títulos (D-52-U22: «Linha do funil», «Currículo» → `text-2xl`, com essa varredura no verify dele). Este plano não roda a tipografia sobre o hub. Se o 52-25 não acontecer, os dois achados ficam.
- A suíte imprime um `DOMException [AbortError]` do `happy-dom` no teardown (um `fetch` abortado ao fechar a janela). Não é falha: exit 0, todos os arquivos passam. Não investiguei de qual arquivo vem.

## TDD Gate Compliance

- **RED** (`c9f112a1`). Os três alvos saíram do mesmo relatório JUnit (`--reporter=junit`), e os três deram `RED_EVIDENCE_OK` (`target_test_failed`):
  - `hubAbas › ?aba=cadastro → «Dados do cadastro» …` (`task1-abas.json`). **Avaliação semântica:** o arquivo foi coletado (9 casos). O hub montou inteiro num `createMemoryRouter` (o heading «Fulana de Teste» aparece no dump). A falha foi na asserção planejada: o `hub-abas` não existe.
  - `DadosCadastroBloco › fictício (email null, celular gravado) …` (`task1-cadastro.json`). O import dinâmico com especificador em variável devolveu `null`, e a falha foi a asserção «DadosCadastroBloco não existe». Os 12 casos caíram pela mesma ausência.
  - `formatos › formatarCpf('12345678901') …` (`task1-formatos.json`). As 13 falhas são asserções de função ausente.
  - Nenhum erro de coleta, de import ou de fixture.
- **GREEN:** `e0417b33`. **REFACTOR:** nenhum.

## Known Stubs

Nenhum. LinkedIn/Instagram como texto é decisão do plano: o link `http(s)` é do 52-24. A seção «Respostas da inscrição» da mesma aba também é do 52-24.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>`:
- **T-52-71:** valores em nó de texto, sem `dangerouslySetInnerHTML`; teste com `<script>`/`<img onerror>`.
- **T-52-72:** a aba lê só pelo `useCadastroCandidatoRh`, a EF com log do 52-09; nenhuma consulta direta do cliente.
- **T-52-SC:** nenhuma instalação.

## User Setup Required

None.

## Next Phase Readiness

- O 52-24 entra na aba «Cadastro e inscrição»: «Respostas da inscrição» e o link `http(s)` de LinkedIn/Instagram na `DadosCadastroBloco`.
- O 52-25 entra na aba «Avaliações»: seção assíncrona aberta, contagem uma vez e títulos em `text-2xl`, o que limpa os 2 achados de tipografia acima. O `hubVerRespostas.test.tsx` já monta em `?aba=avaliacoes`.
- `REQUIREMENTS.md` não foi tocado. O JORN-58 também é declarado pelo 52-25, e nada está em PROD (52-15).

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*

## Self-Check: PASSED

- 8/8 arquivos criados presentes; commits `c9f112a1` e `e0417b33` ancestrais de HEAD; SUMMARY em `cc139fd1`.
- STATE.md (só frontmatter: `stopped_at`, `last_updated`, `completed_plans` 184 → 185; `percent` segue 94) e ROADMAP.md (só a linha do 52-10) escritos à mão, sem gsd-tools; `git diff` conferido: 4 linhas, só essas.
