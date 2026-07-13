---
phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring
plan: 05
subsystem: candidate-assessment-client
tags: [react, typescript, supabase-client, sjt, rls-projection, confined-cast, rnf-07a, vitest]

# Dependency graph
requires:
  - phase: 26 (plan 01)
    provides: pontuar_sjt v2 RAISEs — 42501 (foreign/re-submit/back-lock) + 22023 (dup/incomplete/empty-battery); FUNIL-07 server battery-membership teeth
  - phase: 26 (plan 02)
    provides: get_avaliacao_status neutral DEFINER RPC (per-card presence booleans) + pontuar_cognitivo etapa gate widened to avaliacao_assincrona
  - phase: 11 (avaliacao-assincrona infra)
    provides: getAvaliacaoContext / pontuarSjt / getOpcoesSjt + the allowlist-projection invariant
  - phase: 24 (SEC blindagem)
    provides: SEC-07 rubric drop + the avaliacaoService.rubric.test.ts supabase-mock idiom
provides:
  - "avaliacaoService (client): FUNIL-07 battery filter (.in itens_ids else .eq cargo), FUNIL-08 aplica_cognitivo surfaced on AvaliacaoContext, FUNIL-12 getAvaliacaoStatus over the neutral RPC (narrow confined cast), FUNIL-01 neutral pontuarSjt error mapping (42501->LOCKED, 22023->DATABASE_ERROR, digit-free)"
  - "avaliacaoService.funil.test.ts: 8 mocked-client unit tests (filter routing + neutral error mapping + status booleans)"
affects: [26-06 (AvaliacaoContainer consumes aplica_cognitivo + getAvaliacaoStatus), 26-07 (Wave 4 BLOCKING apply proves the RPC contracts live), 27 (database.types.ts regen drops the confined cast)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Narrow confined RPC cast (widen ONLY the fn name, never a blanket UntypedClient) until the Phase-27 types regen — mirrors cognitivoService.listItens"
    - "Client battery filter is presentation only; the server membership check in pontuar_sjt is the security teeth (defense-in-depth, Pitfall 4)"
    - "Neutral candidate-facing error mapping: the raw 22023 server message carries counts, so the client NEVER interpolates error.message for it (RNF-07a)"
    - "Coerce every status-RPC leaf to a strict boolean (missing card -> false) — never trust the payload to carry a numeric"

key-files:
  created:
    - src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts
  modified:
    - src/features/avaliacao/services/avaliacaoService.ts

key-decisions:
  - "22023 gets an EXPLICIT client branch with a fixed digit-free message instead of the generic ${error.message} fallthrough — the server RAISE 'bateria incompleta (% de %)' embeds answered/expected counts that must not cross the wire"
  - "getAvaliacaoStatus returns a narrowed AvaliacaoStatus (5 cards, booleans only); a foreign candidatura (42501) surfaces as a neutral DATABASE_ERROR (no verdict leak)"
  - "Battery filter reads the tipo==='sjt' element of testes_aplicaveis; itens_ids present -> .in('id', …), else cargo -> .eq('cargo', …), else active-only (unchanged) — allowlist columns kept, never select('*')"
  - "Requirements FUNIL-01/07/08/12 stay Pending — this plan is the client half only; the container (26-06) + the live migration apply (26-07) are still outstanding (honesty theme, mirrors 26-02)"

patterns-established:
  - "Thenable+chainable supabase query mock: .select/.eq/.in record args and return the builder; a .then leaf resolves await q — lets a test assert which filter branch ran"

requirements-advanced: [FUNIL-01, FUNIL-07, FUNIL-08, FUNIL-12]

# Metrics
duration: 16min
completed: 2026-07-12
---

# Phase 26 Plan 05: avaliacaoService wired to the corrected DB tier Summary

**Wired the single candidate SJT data boundary to the Wave-1 DB contracts: `getAvaliacaoContext` now battery-filters the `perguntas` query by the vaga's SJT `itens_ids` (else `cargo`) and surfaces `aplica_cognitivo`, a new `getAvaliacaoStatus` reads the neutral `get_avaliacao_status` RPC via a narrow confined cast returning per-card presence booleans, and `pontuarSjt` maps the rewritten RPC's `42501`/`22023` RAISEs to NEUTRAL codes+messages — every projection stays allowlist-only and no score/threshold ever reaches the candidate.**

## Performance

- **Duration:** ~16 min
- **Completed:** 2026-07-12
- **Tasks:** 2
- **Files:** 2 (1 modified, 1 created)

## Accomplishments
- **FUNIL-07 (client presentation):** `getAvaliacaoContext` resolves the `tipo==='sjt'` element of `testes_aplicaveis` and filters the `perguntas` query — `.in('id', itens_ids)` when the battery is itemized, else `.eq('cargo', cargo)`, else the prior active-only read. The candidate never sees another cargo's SJT questions in the UI. This is UX only; the server-side battery-membership check in `pontuar_sjt` (26-01) is the real control. The allowlist columns (`id, cargo, cenario, formato, tempo_est_min, status`) and the never-`select('*')` invariant are preserved.
- **FUNIL-08 (client half):** the vaga join is extended to `vaga:vagas ( testes_aplicaveis, aplica_cognitivo )`; `aplica_cognitivo` is added to `AvaliacaoContext` (default `false` when absent) so the container (26-06) can gate the cognitivo card on `aplica_cognitivo === true` rather than the always-emitted template entry.
- **FUNIL-12 (client half):** new exported `getAvaliacaoStatus(candidaturaId)` calls the neutral `get_avaliacao_status` RPC through the **narrow confined cast** idiom (widens only the RPC name; the RPC lands in `database.types.ts` at the Phase-27 regen) and returns a narrowed `AvaliacaoStatus` of per-card presence booleans (`registrado`/`iniciado`) — every leaf coerced to a strict boolean, a missing card defaulting to `false`, never a raw score.
- **FUNIL-01 (client half):** `pontuarSjt` now maps the rewritten RPC's RAISEs neutrally — `42501` (RLS back-lock / re-submit lock / out-of-battery pergunta) → `LOCKED`, and `22023` (unconfigured / duplicate / incomplete battery) → a NEW explicit `DATABASE_ERROR` branch with a **fixed, digit-free** message. The explicit `22023` branch is load-bearing: the server RAISE `'bateria incompleta (% de %)'` embeds the answered/expected counts, so the client must not echo `error.message` for it (RNF-07a).
- **Tests:** `avaliacaoService.funil.test.ts` (8 tests) proves the three filter branches (`.in` / `.eq(cargo)` / active-only), `aplica_cognitivo` surfacing, both neutral error mappings with a `/\d/` no-numeric-leak assertion, and the status-RPC booleans + neutral error path — all against a mocked Supabase client (no live DB; the RPC contracts are proven by the 26-07 smokes).

## Task Commits

Each task committed atomically (hooks-bypass per project rule):

1. **Task 1: avaliacaoService edits (Deltas A–D)** — `813e0e2` (feat)
2. **Task 2: unit tests (battery filter + neutral error mapping)** — `b1a2f30` (test)

**Plan metadata:** _(final docs commit — this SUMMARY + STATE + ROADMAP)_

## Files Created/Modified
- `src/features/avaliacao/services/avaliacaoService.ts` — `AvaliacaoContext.aplica_cognitivo` added; `getAvaliacaoContext` vaga join + candRow type + battery filter + return updated; new `AvaliacaoStatusCard`/`AvaliacaoStatus` interfaces + `getAvaliacaoStatus()` (narrow confined cast, `// Drop the cast after the Phase-27 regen` note); `pontuarSjt` error block extended with the neutral `22023` branch. +120/-7.
- `src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts` — 8 unit tests over a thenable+chainable supabase mock steered by a hoisted `state` object. +230.

## Decisions Made
- **Explicit `22023` branch over the generic fallthrough.** The pre-existing catch already funnelled unknown codes to `DATABASE_ERROR` with `${error.message}` — which for `22023` would surface `'bateria incompleta (3 de 10)'`, leaking the count. Added a dedicated branch with a fixed neutral message so the counts never reach the candidate; the funil test seeds exactly that raw message and asserts `/\d/` does not match the thrown message.
- **Requirements stay `Pending`.** Following 26-02's honesty precedent: FUNIL-01/07/08/12 are not satisfied until the container half (26-06) and the live migration apply (26-07) land. Marking them complete on the client half alone would misrepresent status, so no `requirements mark-complete` was run.
- **Narrow cast, not a blanket widen.** `getAvaliacaoStatus` widens only the `get_avaliacao_status` fn name (mirroring `cognitivoService.listItens`), never a blanket `UntypedClient` — keeping the surface tight (T-26-05-04) and dropping cleanly at the Phase-27 regen.

## Deviations from Plan

None — plan executed exactly as written. Both files match the plan `<action>`/`<behavior>` blocks and RESEARCH §Code Example 2 (battery filter) + the `cognitivoService.listItens` cast idiom. No auto-fixes (Rules 1–3) were required. tsc held flat at 104 (≤ the frozen 107 baseline).

## Threat Model Compliance
- **T-26-05-01 (select('*') leak) — mitigated:** the `perguntas` projection stays an explicit allowlist; `grep -c "select('\*')"` == 0.
- **T-26-05-02 (error leaks score/threshold) — mitigated:** both mapped errors carry neutral, digit-free messages; the funil test asserts `/\d/` does not match either thrown message even when the raw `22023` server message embeds counts.
- **T-26-05-03 (client filter bypass) — accepted:** the client filter is UX only; the server membership check in `pontuar_sjt` is the control.
- **T-26-05-04 (blanket cast widens surface) — mitigated:** the narrow confined cast widens only the RPC name.

## Issues Encountered
None. The existing `avaliacaoService.rubric.test.ts` (SEC-07 projection guard) continued to pass unchanged: its `testes_aplicaveis: {}` fixture is not an array, so the new battery filter takes the active-only branch and the projection string is untouched.

## User Setup Required
None — pure client TypeScript change. The live proof of the RPC contracts (apply + smokes) is the BLOCKING Wave 4 plan 26-07.

## Next Phase Readiness
- **26-06 (Wave 3) unblocked:** `AvaliacaoContainer` can now consume `ctx.aplica_cognitivo` to gate the cognitivo card and call `getAvaliacaoStatus` to derive the four-state card contract from real booleans (replacing the phantom `entry.status` read).
- **26-07 (Wave 4 BLOCKING):** applying `pontuar_sjt` v2 + `get_avaliacao_status` via MCP and running the funil01/funil12 smokes proves the RPC codes/shapes this client now depends on.
- No blockers. `database.types.ts` regen (which drops the confined cast) is Phase 27.

## Self-Check: PASSED

- FOUND: `src/features/avaliacao/services/avaliacaoService.ts`
- FOUND: `src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts`
- FOUND: `.planning/phases/26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring/26-05-SUMMARY.md`
- FOUND commit: `813e0e2` (Task 1) · `b1a2f30` (Task 2)
- tsc flat 104 (≤ 107 frozen baseline); vitest full suite 769/769; funil file 8/8

---
*Phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring*
*Completed: 2026-07-12*
