---
phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring
plan: 06
subsystem: candidate-assessment-client
tags: [react, typescript, tanstack-query, rnf-07a, funil-08, funil-12, contract-test, vitest]

# Dependency graph
requires:
  - phase: 26 (plan 02)
    provides: pontuar_cognitivo etapa gate widened to include 'avaliacao_assincrona'; get_avaliacao_status neutral DEFINER RPC (per-card presence booleans)
  - phase: 26 (plan 04)
    provides: the honest all-done copy at AvaliacaoContainer:209 ("Acompanhe o andamento pelo seu painel.")
  - phase: 26 (plan 05)
    provides: avaliacaoService.getAvaliacaoContext surfaces vaga.aplica_cognitivo on AvaliacaoContext + getAvaliacaoStatus(candidaturaId) reader
  - phase: 25 (plan 04)
    provides: the FUNIL-05 template↔container test-id contract (testeContract.ts + CONTAINER_RECOGNIZED) — its guard forbids editing testeContract.ts
provides:
  - "AvaliacaoContainer (client): FUNIL-08 cognitivo card gated on vaga.aplica_cognitivo (template-driven entry SKIPed → exactly one gated card) → real /candidato/prova-cognitiva/:id route; FUNIL-12 every card's neutral state derived from get_avaliacao_status booleans (phantom entry.status read removed)"
  - "exported AVALIACAO_ASSINCRONA_ETAPA (render etapa, single source for the wrong-etapa gate) + exported CONTAINER_TESTE_CONFIG for the route↔gate contract test"
  - "cognitivo-contract.test.ts: route↔gate invariant (card render etapa ∈ pontuar_cognitivo accepted set, against the REAL container config)"
  - "AvaliacaoContainer.test.tsx (extended): connected-mode gate/route + three neutral card states from mocked status booleans"
affects: [26-07 (Wave 4 BLOCKING apply proves the RPC contracts this container consumes live), 27 (database.types.ts regen drops the confined cast in avaliacaoService)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route↔gate contract as a shared constant: the container exports the render etapa constant AND the route config; the contract test imports the REAL exports (not a replica) and asserts membership in the RPC-accepted set — a change to either side breaks the test (integration-contract-gap)"
    - "Gate a template-driven card at the derivation layer, not the contract lib: cargoTemplates.baseTestes emits cognitivo UNCONDITIONALLY, so deriveCards SKIPs it and appends exactly one gated card — testeContract.ts is untouched (its Phase-25 FUNIL-05 guard stays green)"
    - "Card completion state derives ONLY from the candidate's own neutral presence booleans (get_avaliacao_status); no vaga-config field and no raw score reaches the card (RNF-07a)"
    - "Connected-component test = mock the service layer (getAvaliacaoContext + getAvaliacaoStatus) + react-router useNavigate + authStore, render under a real QueryClientProvider + MemoryRouter — deterministic, no network"

key-files:
  created:
    - src/features/avaliacao/__tests__/cognitivo-contract.test.ts
  modified:
    - src/features/avaliacao/components/AvaliacaoContainer.tsx
    - src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx

key-decisions:
  - "Added an ADDITIVE em_andamento/parcial branch to statusInfo (label 'Em andamento', CircleDot, neutral white tint) — the plan's 'statusInfo unchanged' hint conflicted with the must-have (Task 2 asserts 'iniciado=true renders Em andamento') + 26-UI-SPEC Card State Contract (em_andamento pill + CircleDot). The four existing states are byte-unchanged; accent stays reserved for Concluído only"
  - "Requirements FUNIL-08/12 stay Pending — the container + client halves are complete but the live RPC apply (26-07 BLOCKING) proves the get_avaliacao_status / pontuar_cognitivo contracts live; marking complete on the code half alone would misrepresent status (honesty theme, mirrors 26-01/02/03/05)"
  - "The route↔gate contract test mirrors the RPC-accepted etapa set as a local const (the SQL is not importable) but imports the container's REAL render-etapa constant + route config — so a future container-side edit that de-syncs from the RPC gate breaks the test"

patterns-established:
  - "Skip-then-append gate for an always-emitted template card: `continue` on the template id in the main loop, then push exactly once behind the real source-of-truth flag"

requirements-advanced: []

# Metrics
duration: 15min
completed: 2026-07-12
---

# Phase 26 Plan 06: Cognitivo card reachability + card-state-from-status-RPC Summary

**Made the cognitive assessment reachable in the candidate assessment hub and rebuilt the four-state neutral card contract on the candidate's own rows: `deriveCards` now SKIPs the always-emitted template `cognitivo` entry and appends exactly one cognitivo card gated on `vaga.aplica_cognitivo` (zero when false, one when true) routing to the REAL `/candidato/prova-cognitiva/:id` screen, and EVERY card's completion state derives from the neutral `get_avaliacao_status` booleans (registrado→Concluído, iniciado→Em andamento, else Pendente) — the phantom `entry.status` read is gone for all five cards — with a route↔gate contract test and connected-mode component tests locking both behaviors.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-12
- **Tasks:** 2
- **Files:** 3 (2 modified, 1 created)

## Accomplishments
- **FUNIL-08 (client half — reachability):** `CONTAINER_TESTE_CONFIG.cognitivo.route` now returns `/candidato/prova-cognitiva/${id}` (the real screen verified at `routes.tsx:269`), replacing the dead `/candidato/avaliacao/:id/cognitivo` stub. In `deriveCards`, the main `testes_aplicaveis` loop `continue`s on the `cognitivo` template id — `cargoTemplates.baseTestes` emits it UNCONDITIONALLY for all 8 cargos, so leaving it in the loop would render an ungated card for every vaga. A single cognitivo card is then appended LAST (26-UI-SPEC ordering) ONLY when `ctx.aplica_cognitivo === true`. Net: ZERO cognitivo cards when the vaga does not apply it, exactly ONE (no duplicate React key, no ungated card) when it does. `testeContract.ts` was NOT edited (`git diff --quiet` clean) — its Phase-25 FUNIL-05 guard asserts `templateTesteToContainerCards('cognitivo') === ['cognitivo']` and stays green.
- **FUNIL-12 (client half — honest card state):** a sibling TanStack Query (`['avaliacao','status',candidaturaId]`) calls `getAvaliacaoStatus`; a new `deriveCardState(cardId, status)` maps each container card id 1:1 onto the RPC key (sjt_mc, sjt_caso_aberto, big_five, redacao, cognitivo) and computes `concluido | em_andamento | pendente` from the presence booleans. The phantom `String(entry.status ?? 'pendente')` read at the old `:312` is removed for ALL FIVE cards — `grep -c "entry.status"` on the file is **0** (including comments). `allDone` still counts a card done only when its derived state is Concluído.
- **Route↔gate contract test (`cognitivo-contract.test.ts`):** imports the container's REAL exports (`AVALIACAO_ASSINCRONA_ETAPA` — the single constant the wrong-etapa gate reads — and `CONTAINER_TESTE_CONFIG`) and asserts the render etapa ∈ the `pontuar_cognitivo` accepted set (the same three literals as `20260712100002:83`), plus that the cognitivo route is the real `/candidato/prova-cognitiva/:id` (not a `/avaliacao/` stub). A future edit to either the container render etapa or the RPC gate mirror breaks it ([[feedback_integration_contract_gap]]).
- **Component tests (extended, not rewritten):** connected-mode tests mock the service layer (`getAvaliacaoContext` + `getAvaliacaoStatus`), `react-router` `useNavigate`, and `authStore`, rendering under a real `QueryClientProvider` + `MemoryRouter`. Using a `testes_aplicaveis` that INCLUDES a cognitivo entry (mirroring `cargoTemplates.baseTestes`), they assert EXACTLY ZERO cognitivo cards when `aplica_cognitivo=false` and EXACTLY ONE (with the real-route CTA firing `navigate('/candidato/prova-cognitiva/CAND123')`) when true; a third test asserts the three neutral card states (Concluído / Em andamento / Pendente) render from mocked status booleans, with the RNF-07a no-score assertion held.
- **RNF-07a + neutral UI preserved:** no card shows pass/fail/red; accent (`#35BFAD`) stays reserved for Concluído only; the em_andamento pill is the same neutral white tint as Pendente (distinct only via CircleDot icon + label + "Continuar avaliação" CTA). The 26-04 honest all-done copy at `:209` is intact (`grep -c` = 1).

## Task Commits

Each task committed atomically (hooks-bypass per project rule — husky pre-commit `npm run lint` would otherwise run against the frozen 107 baseline):

1. **Task 1: cognitivo card gate + real route + card-state-from-status-RPC** — `8f864c4` (feat)
2. **Task 2: route↔gate contract test + connected-mode container tests** — `e3404d8` (test)

**Plan metadata:** _(final docs commit — this SUMMARY + STATE + ROADMAP)_

## Files Created/Modified
- `src/features/avaliacao/components/AvaliacaoContainer.tsx` — cognitivo route fix; `CONTAINER_TESTE_CONFIG` + new `AVALIACAO_ASSINCRONA_ETAPA` exported; additive `em_andamento`/`parcial` branch in `statusInfo` (CircleDot); new `deriveCardState` helper; `deriveCards(ctx, status)` SKIPs the template cognitivo + gated append + derives every card state from the status booleans; sibling status query wired; the wrong-etapa gate reads the new constant. +88/−11.
- `src/features/avaliacao/__tests__/cognitivo-contract.test.ts` — NEW; 2 tests (route↔gate membership + real-route). +50.
- `src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx` — extended with service/router/authStore mocks + a `renderConnected` helper + 3 connected-mode tests (gate zero/one + three card states); the 3 existing presentational tests are unchanged. +~160.

## Decisions Made
- **Additive `em_andamento` branch in `statusInfo`.** The plan's interfaces note said "Feed statusInfo() unchanged", but the must-have Task-2 behavior ("iniciado=true renders Em andamento") and the 26-UI-SPEC Card State Contract (em_andamento pill + CircleDot, neutral tint) both require the em_andamento state to render visible text. Leaving statusInfo unchanged would have rendered a "Pendente" pill for the em_andamento state and failed the must-have component test. Resolved by ADDING an `em_andamento`/`parcial` case (Rule 2 — the neutral helper lacked a state the FUNIL-12 contract requires); the four pre-existing states are byte-identical, accent stays Concluído-only, and the existing presentational tests (which use only `pendente`/`feito`) are unaffected.
- **Requirements stay Pending.** Following the phase's honesty precedent (26-01/02/03/05), FUNIL-08/12 are not marked complete: the container + client halves are done, but the live migration apply + behavioral smokes (26-07 BLOCKING) prove the `pontuar_cognitivo` gate and `get_avaliacao_status` shape in PROD. No `requirements mark-complete` was run.
- **Contract test imports the REAL container config.** The `pontuar_cognitivo` accepted-etapa set is mirrored as a local const (SQL is not importable), but the render etapa (`AVALIACAO_ASSINCRONA_ETAPA`) and route (`CONTAINER_TESTE_CONFIG`) are imported from the container itself — so the test guards the container side, not a replica.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical UI state] statusInfo could not render the em_andamento state**
- **Found during:** Task 1 (implementing the FUNIL-12 `iniciado→Em andamento` derivation)
- **Issue:** `statusInfo()` had no `em_andamento` case → the derived em_andamento state would render a "Pendente" pill, contradicting the FUNIL-12 must-have ("iniciado→Em andamento") and the 26-UI-SPEC Card State Contract (Em andamento + CircleDot).
- **Fix:** Added an additive `em_andamento`/`parcial` branch (label "Em andamento", CircleDot, neutral `text-white/70` tint — same as Pendente per the SPEC, no accent/warning). The four existing states are byte-unchanged.
- **Files modified:** `AvaliacaoContainer.tsx` (statusInfo + CircleDot import)
- **Commit:** `8f864c4`

Otherwise the plan executed as written (Deltas A–C applied verbatim; testeContract.ts untouched; the :209 copy preserved; no package installs; no architectural changes).

## Threat Model Compliance
- **T-26-06-01 (raw score/pass-fail to candidate) — mitigated:** card state derives only from neutral booleans; no card shows red/failed; a below-threshold completed test still reads Concluído; the FORBIDDEN_SCORE regex assertion holds in the connected-mode test.
- **T-26-06-02 (cognitivo card routes to a 42501 screen) — mitigated:** the route↔gate contract test asserts `AVALIACAO_ASSINCRONA_ETAPA` ∈ the `pontuar_cognitivo` accepted set against the REAL container config.
- **T-26-06-03 (Concluído from a phantom/config field) — mitigated:** derivation reads the candidate's own rows via `get_avaliacao_status`; the phantom `entry.status` read is removed (`grep -c` = 0).
- **T-26-06-SC (installs) — accept/N/A:** no npm/registry installs this plan (no new shadcn primitive).

## Issues Encountered
The Task-1 acceptance grep `grep -c "entry.status" == 0` initially read 3 — all in doc-comments that mentioned the phantom field by name. Reworded the three comments (to "phantom per-entry vaga-config status field") so the literal `entry.status` token appears nowhere in the file, satisfying the acceptance exactly.

## TDD Notes
The plan splits implementation (Task 1, `AvaliacaoContainer.tsx`) from its behavior-locking tests (Task 2, the two test files), so the commit order is `feat` → `test` rather than a per-commit RED-first. This is consistent with the plan being `type: execute` (not `type: tdd`, so the RED-before-GREEN gate does not apply) and with the task/file allocation; each commit left the full suite green.

## User Setup Required
None — pure client TypeScript + test change. The live proof of the consumed RPC contracts (apply + behavioral smokes) is the BLOCKING Wave 4 plan 26-07.

## Next Phase Readiness
- **26-07 (Wave 4 BLOCKING) is the remaining gate:** applying `pontuar_sjt` v2 + `pontuar_cognitivo` gate + `get_avaliacao_status` + the FUNIL-10 index drop + the n8n trigger via MCP, then running the funil smokes, proves the RPC shapes/codes this container now depends on and flips FUNIL-01/07/08/10/12 to Complete.
- No blockers. `database.types.ts` regen (drops the confined cast in `avaliacaoService`) is Phase 27.

## Self-Check: PASSED

- FOUND: `src/features/avaliacao/components/AvaliacaoContainer.tsx`
- FOUND: `src/features/avaliacao/__tests__/cognitivo-contract.test.ts`
- FOUND: `src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx`
- FOUND: `.planning/phases/26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring/26-06-SUMMARY.md`
- FOUND commit: `8f864c4` (Task 1 feat) · `e3404d8` (Task 2 test)
- Artifact contains-checks: container `prova-cognitiva` ✓, contract `avaliacao_assincrona` ✓, component `aplica_cognitivo` ✓
- Acceptance greps: `entry.status` = 0 ✓, `:209` copy intact ✓, `testeContract.ts` unmodified ✓
- tsc flat 104 (≤ 107 frozen baseline); vitest full suite 774/774 (+5); target files 8/8

---
*Phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring*
*Completed: 2026-07-12*
