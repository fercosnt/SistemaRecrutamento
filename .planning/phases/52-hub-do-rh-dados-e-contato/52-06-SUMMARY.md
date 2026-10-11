---
phase: 52-hub-do-rh-dados-e-contato
plan: 06
subsystem: ui
tags: [react, react-router, zustand, radix-select, tailwind, vitest, open-redirect]

requires:
  - phase: 52-01
    provides: "harness da fase (scripts/p52_tipografia.cjs, base refs/gsd/52/base)"
provides:
  - "LoginCandidatoPage respeita a sessão aberta do candidato (resolveRedirect + escopo /candidato/), com «Verificando sua sessão…» durante a hidratação; COPY_LOGIN_SESSAO exportado"
  - "«Meu painel» na CandidatoNavbar (ausente em /candidato/dashboard)"
  - "CartaoInscricaoEncerrada exportado de FormularioCandidaturaPage.tsx, legível no vidro, texto da D-15 intacto"
  - "SelectItem com realce bg-[#35BFAD]/20 e texto herdado do painel (D-52-U21)"
affects: [52-10, 52-UAT, FormularioCandidaturaPage, select]

actuals:
  tokens: 8661
  tasks: 2
  commits: 5
plan_head_before: b3746b42225a3da37eda30fffcc64bd8d7640f21
plan_head_after: 1b9b75c6374754d468a68b061bb4e85938a24865

tech-stack:
  added: []
  patterns:
    - "Efeito de sessão aberta gated por ref de envio em curso: a sessão que nasce do próprio submit pertence ao onSubmit"
    - "Andaime refactor antes do RED quando o símbolo testado ainda não existe (RED na asserção, não no import)"
    - "Evidência RED via reporter JUnit do Vitest (o TAP do Vitest sai malformado com mensagens multilinha)"

key-files:
  created:
    - src/components/layouts/__tests__/CandidatoNavbar.test.tsx
    - src/components/pages/__tests__/FormularioCandidaturaPage.agradecemos.test.tsx
    - src/components/ui/__tests__/select.test.tsx
  modified:
    - src/components/pages/LoginCandidatoPage.tsx
    - src/components/pages/__tests__/LoginCandidatoPage.test.tsx
    - src/components/layouts/CandidatoNavbar.tsx
    - src/components/pages/FormularioCandidaturaPage.tsx
    - src/components/ui/select.tsx

key-decisions:
  - "Login: durante a hidratação E no instante do redirecionamento de uma sessão de candidato aberta, mostra o Loader2 + «Verificando sua sessão…» (o formulário não pisca antes do navigate)"
  - "Login: envioEmCursoRef impede o efeito de sessão aberta de correr na frente do onSubmit (em PROD o listener do App hidrata o store durante o signIn) — sem isso, ?redirect=/vagas/123 seria sequestrado para o painel"
  - "CartaoInscricaoEncerrada usa o próprio useNavigate (sem prop) — a página só renderiza <CartaoInscricaoEncerrada />"
  - "SelectTrigger (hover:text-white, :62) fica como está — o plano e a D-52-U21 tratam só do SelectItem"

patterns-established:
  - "Sessão aberta no login: validar com resolveRedirect, restringir escopo com prefixo, nunca um startsWith como validação"

requirements-completed: [JORN-62]

coverage:
  - id: D1
    description: "Candidato com sessão hidratada que abre o login vai direto ao destino (resolveRedirect, escopo /candidato/, senão painel); //evil.com e /rh/… caem no painel; RH/sem sessão veem o formulário; «Verificando sua sessão…» durante a hidratação; sessão do próprio envio não sequestra o destino"
    requirement: JORN-62
    verification:
      - kind: unit
        ref: "src/components/pages/__tests__/LoginCandidatoPage.test.tsx#sessão aberta do candidato (52-06 · 51-17)"
        status: pass
    human_judgment: false
  - id: D2
    description: "«Meu painel» na navbar do candidato, à esquerda de «Área do candidato», ausente em /candidato/dashboard"
    requirement: JORN-62
    verification:
      - kind: unit
        ref: "src/components/layouts/__tests__/CandidatoNavbar.test.tsx#CandidatoNavbar — «Meu painel» (52-06)"
        status: pass
      - kind: unit
        ref: "npx vitest run src/__tests__/guards (rotulos-navegacao-candidato verde)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Cartão de inscrição encerrada legível no vidro (text-2xl text-white / text-white/80 / text-white/70), texto D-15 inalterado"
    requirement: JORN-62
    verification:
      - kind: unit
        ref: "src/components/pages/__tests__/FormularioCandidaturaPage.agradecemos.test.tsx"
        status: pass
    human_judgment: true
    rationale: "Legibilidade real sobre o vidro/gradiente é visual; o teste prova as classes, não o contraste percebido. Conferência na UAT da 52 (recarregar sem cache)."
  - id: D4
    description: "SelectItem com realce turquesa 20% e texto herdado nos dois fundos (painel padrão e bg-[#00109E]/95)"
    requirement: JORN-62
    verification:
      - kind: unit
        ref: "src/components/ui/__tests__/select.test.tsx"
        status: pass
    human_judgment: true
    rationale: "Conferência VISUAL nos dois consumidores (RejeitarCandidaturaDialog — fundo padrão; CandidatosRHPage — fundo azul) fica para a UAT da 52; render em cache não é conferência — recarregar sem cache."

duration: 9min
completed: 2026-10-11
status: complete
---

# Phase 52 Plan 06: Achados do 51-17 do lado do candidato e do SelectItem Summary

**Login que respeita a sessão aberta do candidato (resolveRedirect + escopo `/candidato/`, «Verificando sua sessão…»), «Meu painel» na navbar, cartão de knockout legível no vidro com o texto da D-15 intacto e `SelectItem` com realce `#35BFAD/20` e texto herdado (D-52-U21)**

## Performance

- **Duration:** 9 min
- **Started:** 2026-10-11T04:31:52Z
- **Completed:** 2026-10-11T04:40:59Z
- **Tasks:** 2 (Task 1 tracer + Task 2)
- **Files modified:** 8 (5 de produção/teste existentes + 3 testes novos)

## Accomplishments

- O candidato já logado que clica no link do e-mail (`/auth/login?redirect=/candidato/…`) vai direto ao destino, sem ver o formulário; destino validado pelo `resolveRedirect` e restrito a `/candidato/`, senão o painel.
- Enquanto o `authStore` hidrata: `Loader2` + «Verificando sua sessão…» (`text-base text-white/80`) no lugar do formulário. RH/admin ou sem sessão: o formulário de hoje.
- «Meu painel» (`LayoutDashboard`, `min-h-[44px]`, `hidden sm:inline`, `aria-label`, `data-testid="navbar-meu-painel"`) à esquerda de «Área do candidato», ausente em `/candidato/dashboard`.
- `CartaoInscricaoEncerrada` extraído e exportado: `h1` `text-2xl font-semibold text-white` (era 30px cinza), corpo `text-white/80`, «Agradecemos…» `text-white/70`; as três frases pinadas por teste.
- `SelectItem`: sem `hover/focus:text-white`, `[&_*]:…!text-white`, `bg-white/25` + blur, `focus:text-accent-foreground`; realce `hover:bg-[#35BFAD]/20 focus:bg-[#35BFAD]/20`; provado com o Select ABERTO nos dois fundos.

## Task Commits

1. **Task 1 (tracer): sessão aberta do candidato + «Meu painel»**
   - `f5425b87` test(52-06): testes vermelhos (RED)
   - `89a16c7e` fix(52-06): login respeita a sessão aberta; «Meu painel» (GREEN)
2. **Task 2: «Agradecemos» legível + `SelectItem` com texto herdado**
   - `1e769bcf` refactor(52-06): extrai `CartaoInscricaoEncerrada` sem mudar texto nem cor (andaime)
   - `2b03355d` test(52-06): testes vermelhos (RED)
   - `1b9b75c6` fix(52-06): cores no vidro; `SelectItem` D-52-U21 (GREEN)

**Plan metadata:** commit deste SUMMARY (docs)

## TDD — RED / GREEN

- **RED Task 1:** `LoginCandidatoPage.test.tsx` «sessão aberta» (a)–(g) e `CandidatoNavbar.test.tsx` (a)–(e). Alvos `(a) candidato hidratado … vai direto ao destino` e `(a) em /candidato/perfil: «Meu painel» presente` — `gsd-tools check tdd-red-evidence` → **RED_EVIDENCE_OK** (JUnit). Avaliação semântica: o alvo executou e falhou na asserção planejada (`navigateMock` com 0 chamadas; `navbar-meu-painel` inexistente), sem falha de import/fixture. As negativas (e), (f), (g) e navbar (b), (e) passavam no RED por definição.
- **GREEN Task 1:** 173/173 no escopo do `<verify>`. Mutação: retirar o `envioEmCursoRef` do efeito faz o (g) reprovar — o portão morde.
- **RED Task 2:** após o andaime `refactor`, `FormularioCandidaturaPage.agradecemos.test.tsx` (a)–(c) e `select.test.tsx` (a)–(c) ×2 fundos falham na asserção de classe; (d)/(e) do cartão passam no RED e provam que a extração não mudou o texto. Alvos `(b) corpo text-white/80 …` e `SelectItem no painel padrão … (a)` → **RED_EVIDENCE_OK**.
- **GREEN Task 2:** 11/11 nos dois arquivos; 550/550 no escopo do `<verify>`.

## Verification

- `npx vitest run src/components/pages/__tests__/LoginCandidatoPage.test.tsx src/components/layouts src/__tests__/guards` → 16 files, 173/173 (gate do tracer re-rodado após o commit, verde).
- `npx vitest run src/components src/features/triagem src/__tests__/guards` → 53 files, 550/550.
- `node scripts/p52_tipografia.cjs --base refs/gsd/52/base -- <4 arquivos>` → `TIPOGRAFIA OK (119 linhas acrescentadas varridas)`.
- lint: `exit=2 tsc errors=89` (≤ 90) — baseline inalterado.
- Suíte inteira: 2910/2912 — só os 2 reds baseline de `promessasComExecutor.test.ts`.

## Files Created/Modified

- `src/components/pages/LoginCandidatoPage.tsx` — efeito de sessão aberta, `COPY_LOGIN_SESSAO`, estado «Verificando sua sessão…», `envioEmCursoRef`.
- `src/components/pages/__tests__/LoginCandidatoPage.test.tsx` — `beforeEach` de arquivo (store hidratado sem sessão) + bloco «sessão aberta» (a)–(g).
- `src/components/layouts/CandidatoNavbar.tsx` — «Meu painel».
- `src/components/layouts/__tests__/CandidatoNavbar.test.tsx` — novo.
- `src/components/pages/FormularioCandidaturaPage.tsx` — `CartaoInscricaoEncerrada` exportado, cores do vidro.
- `src/components/pages/__tests__/FormularioCandidaturaPage.agradecemos.test.tsx` — novo.
- `src/components/ui/select.tsx` — classes do `SelectItem`.
- `src/components/ui/__tests__/select.test.tsx` — novo (Select aberto nos dois fundos).

## Decisions Made

Ver `key-decisions` no frontmatter. Em resumo: o login mostra o estado de verificação também no instante do redirecionamento (sem piscar o formulário); a sessão nascida do próprio envio fica com o `onSubmit`; o `SelectTrigger` não foi tocado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Efeito de sessão aberta correria na frente do `onSubmit`**
- **Found during:** Task 1 (desenho do efeito)
- **Issue:** em PROD o listener do App (`hydrateFromSession`) põe `isAuthenticated=true, role='candidato'` DURANTE o `signIn`; o efeito novo dispararia antes do `onSubmit` terminar e mandaria ao painel quem pediu `?redirect=/vagas/123` (fluxo VAGA-03).
- **Fix:** `envioEmCursoRef` (true no início do `onSubmit`, false no `catch`); o efeito e o estado de verificação ignoram a sessão enquanto o envio está em curso.
- **Files modified:** `src/components/pages/LoginCandidatoPage.tsx`, teste (g)
- **Verification:** caso (g) verde; mutação sem o ref → (g) vermelho.
- **Committed in:** `f5425b87` (teste), `89a16c7e` (código)

**2. [Rule 3 - Blocking] Testes de formulário existentes precisavam de store hidratado**
- **Found during:** Task 1
- **Issue:** o estado inicial REAL do `authStore` é `isLoading: true`; com a página lendo o store, os testes UX-04/UX-05 existentes veriam «Verificando sua sessão…» em vez do formulário.
- **Fix:** `beforeEach` de arquivo que põe o store em `isLoading:false, isAuthenticated:false, role:null` (o visitante sem sessão que esses testes descrevem). Nenhuma asserção existente foi alterada ou afrouxada.
- **Committed in:** `f5425b87`

**3. [Processo] Commit `refactor` extra antes do RED da Task 2**
- **Issue:** com o símbolo `CartaoInscricaoEncerrada` inexistente, o RED seria «Element type is invalid» (falha de carga = INVALID_RED).
- **Fix:** extração pura (texto e classes idênticos) em `1e769bcf`; o RED passou a falhar na asserção de classe. O plano previa um único commit `fix` na Task 2; ficaram `refactor` + `test` + `fix`.

**4. [Processo] Evidência RED em JUnit, não TAP**
- O reporter `tap-flat` do Vitest emite mensagens de erro multilinha sem indentação (TAP malformado → `invalid_record`). Reexecutado o mesmo alvo com `--reporter=junit`; classificador → RED_EVIDENCE_OK.

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking) + 2 de processo.
**Impact on plan:** correção necessária para não regredir o VAGA-03; sem aumento de escopo.

## Issues Encountered

- A rota real do login do candidato é `/auth/login` (o plano diz `/candidato/login`); os testes usam `/auth/login`. Sem efeito no comportamento.

## Pendente para a UAT da 52 (registrado por instrução do plano)

- **Conferência VISUAL do `SelectItem` nos dois consumidores** — `RejeitarCandidaturaDialog` (fundo padrão, o relatado no 51-17) e `CandidatosRHPage` (fundo `bg-[#00109E]/95`). Render em cache não é conferência: recarregar sem cache.
- Legibilidade do cartão «Inscrição recebida / Agradecemos» sobre o vidro (D3).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `FormularioCandidaturaPage.tsx` volta a ser editado pelo 52-10 (extração de `ROTULO_BLOCO`/`groupByBloco`); este plano mexeu só no cartão de knockout (agora `CartaoInscricaoEncerrada`, acima do `// ---- component`).
- Sem push (o plano não manda).

---
*Phase: 52-hub-do-rh-dados-e-contato*
*Completed: 2026-10-11*
