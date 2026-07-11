---
phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos
plan: 04
subsystem: avaliacao / config-vaga (candidate avaliação container id contract)
tags: [FUNIL-05, contract-test, tdd, id-mapping, avaliacao-container]
requires:
  - cargoTemplates.baseTestes (TEMPLATE-side test ids)
  - AvaliacaoContainer.deriveCards / testeLabel / handleOpenTeste
provides:
  - "@/lib/testes/testeContract — canonical TEMPLATE↔CONTAINER test-id mapping (single source)"
  - "AvaliacaoContainer CONTAINER_RECOGNIZED exported set (real side of the contract)"
  - "contract test guarding invariant E (every cargoTemplate teste ⊆ container recognized set)"
affects:
  - "src/features/avaliacao/components/AvaliacaoContainer.tsx (deriveCards now filters+maps; single-source config)"
tech-stack:
  added: []
  patterns:
    - "single-source id map (ETAPA_M2_LABELS idiom) applied to container per-card config"
    - "contract test asserts vs the REAL exported set, not a replica (feedback_integration_contract_gap)"
key-files:
  created:
    - src/lib/testes/testeContract.ts
    - src/lib/testes/__tests__/testeContract.test.ts
  modified:
    - src/features/avaliacao/components/AvaliacaoContainer.tsx
decisions:
  - "deriveCards filters CANDIDATE_FACING template tests then maps each through the lib (kills verbatim t.teste → default 'mc' misroute)"
  - "testeLabel + handleOpenTeste collapsed into ONE co-located CONTAINER_TESTE_CONFIG (label+route) → no duplicate id switch; CONTAINER_RECOGNIZED = Object.keys(config)"
  - "cognitivo carries label + route STUB only — reachability = Phase 26 (NOT pulled forward)"
  - "TesteAplicavel['teste'] left as z.string() — narrowing to the union skipped (would need a cast cascade; the contract test guards it at runtime instead)"
metrics:
  duration: 12min
  tasks: 2
  files: 3
  tsc_errors: 115
  tests: "13/13 (10 contract + 3 existing container)"
  completed: 2026-07-11
---

# Phase 25 Plan 04: Canonical Template↔Container Test-id Contract Summary

FUNIL-05 closed at the id-contract level: one canonical `@/lib/testes/testeContract` maps every `cargoTemplates` TEMPLATE test id to the CONTAINER card ids the candidate `AvaliacaoContainer` actually renders/routes, `deriveCards` now filters + maps through it instead of copying `t.teste` verbatim, and a contract test (invariant E) asserts every template teste lands in the container's exported recognized set — regress-guarding the mis-route that sent `redacao_cultural`/`cognitivo`/`work_sample_sjt` to the default `target='mc'` branch.

## What Was Built

**1. `src/lib/testes/testeContract.ts` (new — the canonical contract)**
- `TEMPLATE_TESTES` union: `{triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}` (exactly what `baseTestes` emits).
- `CONTAINER_TESTES` union: `{sjt_mc, sjt_caso_aberto, big_five, redacao, cognitivo}`.
- `CANDIDATE_FACING` (`ReadonlySet<string>`): `{work_sample_sjt, redacao_cultural, big_five, cognitivo}` — `triagem`/`entrevista` excluded (T-25-04-03).
- `templateTesteToContainerCards(t: string): ContainerTeste[]` from a single `TEMPLATE_TO_CONTAINER` record:
  - `work_sample_sjt → ['sjt_mc','sjt_caso_aberto']`, `redacao_cultural → ['redacao']`, `big_five → ['big_five']`, `cognitivo → ['cognitivo']`, `triagem`/`entrevista`/unknown → `[]` (defensive: unknown ids are dropped, never rendered as a broken default-label card).

**2. `src/features/avaliacao/components/AvaliacaoContainer.tsx` (rewired)**
- `deriveCards` now filters to `CANDIDATE_FACING` template tests and maps each through the lib (one template entry may fan out to multiple cards — SJT → mc + caso), replacing the verbatim `t.teste` copy that fell to the container's default branch.
- `testeLabel` + `handleOpenTeste` collapsed into ONE co-located `CONTAINER_TESTE_CONFIG` (`{ label, route }` per container id) — the single source that kills the two duplicate id switches. `handleOpenTeste` routes via `cfg.route(candidaturaId)` (redação keeps its own `/candidato/redacao/:id` path; a legacy `bigfive` alias + `formato==='caso_aberto'` fallback preserved).
- Exported `CONTAINER_RECOGNIZED = new Set(Object.keys(CONTAINER_TESTE_CONFIG))` so the contract test asserts against the REAL container's declared set, not a replica ([[feedback_integration_contract_gap]]).
- Added a `cognitivo` label ("Avaliação cognitiva") + `.../cognitivo` route STUB — reachability is Phase 26.

**3. `src/lib/testes/__tests__/testeContract.test.ts` (new — the regress-guard, invariant E)**
- Per-id mapping assertions (the RED gate before the lib existed).
- CONTRACT block: iterates every `cargoTemplates` entry's `testes_aplicaveis`, runs each `teste` through the lib, and asserts every emitted id ∈ `CONTAINER_RECOGNIZED` (imported from the container) — plus every candidate-facing teste emits ≥1 card, and the lib's container-id union ⊆ the container's recognized set.

## TDD Gate Compliance

`type: tdd` plan — gate sequence honored in git:
1. RED: `test(25-04)` `cb8a8a9` — contract test failed at module-resolution (`@/lib/testes/testeContract` + `CONTAINER_RECOGNIZED` absent). Calibrated failure, not an unexpected pass.
2. GREEN: `feat(25-04)` `f8d3428` — lib + container rewire → 13/13 green.
3. REFACTOR: folded into GREEN (the single-source `CONTAINER_TESTE_CONFIG` collapse) — no separate `refactor` commit needed (no post-GREEN changes).

## Task Commits

| Task | Gate | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | RED (test) | `cb8a8a9` | src/lib/testes/__tests__/testeContract.test.ts |
| 2 | GREEN (feat) | `f8d3428` | src/lib/testes/testeContract.ts, src/features/avaliacao/components/AvaliacaoContainer.tsx |

## Verification

- Plan `<automated>` verify: `CONTRACT_OK` (testeContract green + `templateTesteToContainerCards` present in container + AvaliacaoContainer green).
- `npm run test:run -- testeContract AvaliacaoContainer`: **13/13 pass** (10 contract + 3 existing container; the presentational-mode test still renders `sjt_mc`/`sjt_caso_aberto` cards + empty state, no regression).
- `npx tsc --noEmit`: **115 errors — flat, NOT increased** (baseline 115 after 25-03).
- `npm run build`: green (pre-existing chunk-size advisories only).
- No stored jsonb rewritten — mapping is read-time only (Runtime State Inventory: code-only).

## Deviations from Plan

None — plan executed as written. The optional narrowing of `TesteAplicavel['teste']` from `z.string()` to the canonical union was **declined** (Claude's discretion per the plan): it would require cast churn at the jsonb read boundary; the runtime contract test provides the guard instead. `TesteCard.teste` also left as `string` (the presentational `testes` prop keeps accepting stored ids; the value-level guarantee is enforced by `deriveCards` + the contract test).

## Threat Model Outcome

- T-25-04-01 (verbatim copy → default 'mc' misroute): mitigated — shared-lib mapping + `CANDIDATE_FACING` filter; contract test asserts no default-branch fall-through.
- T-25-04-02 (both-sides mocks pass while contract breaks): mitigated — test imports the container's exported `CONTAINER_RECOGNIZED`, not a replica.
- T-25-04-03 (non-candidate-facing card rendered to candidate): mitigated — `triagem`/`entrevista` map to `[]` and are filtered by `deriveCards`.
- T-25-SC (supply chain): n/a — zero package installs.

## Follow-ups (Phase 26 — NOT this plan)

- Actual reachability of the `cognitivo` screen + SJT-battery-by-cargo wiring (FUNIL-05 here is the id contract only; `cognitivo` carries label + route stub).

## Self-Check: PASSED

- FOUND: src/lib/testes/testeContract.ts
- FOUND: src/lib/testes/__tests__/testeContract.test.ts
- FOUND: src/features/avaliacao/components/AvaliacaoContainer.tsx (CONTAINER_RECOGNIZED export present)
- FOUND commit: cb8a8a9 (RED)
- FOUND commit: f8d3428 (GREEN)
