---
phase: 11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3
plan: 03
subsystem: avaliacao (candidate data/logic layer)
tags: [sjt, autosave, back-lock, allowlist, anti-tamper, zod, tanstack]
requires:
  - "11-02 (PROD: pontuar_sjt RPC, respostas_avaliacao + perguntas tables, avaliar-redacao EF)"
  - "Phase-7 testesAplicaveisSchema (extended in place)"
provides:
  - "testesAplicaveisSchema SJT-key extension (tipo/cargo/itens_ids/bateria_size/threshold.mc_min_pct=60)"
  - "respostaAvaliacaoSchema (strict, no score field)"
  - "useAvaliacaoDraft (sessionStorage dies-with-tab)"
  - "useAutosaveAvaliacao (30s debounce + 42501 back-lock catch)"
  - "avaliacaoService (allowlist reads + pontuar_sjt RPC + avaliar-redacao EF invoke)"
affects:
  - "Plan 11-05 (candidate UI consumes service + hooks)"
  - "Plan 11-06 (RH scorecard reuses avaliacaoService allowlist idiom)"
tech-stack:
  added: []
  patterns: [allowlist-projection, anti-tamper-strict-zod, sessionStorage-draft, trailing-edge-debounce, rls-back-lock-catch]
key-files:
  created:
    - src/features/avaliacao/schemas/respostaAvaliacaoSchema.ts
    - src/features/avaliacao/hooks/useAvaliacaoDraft.ts
    - src/features/avaliacao/hooks/useAutosaveAvaliacao.ts
    - src/features/avaliacao/services/avaliacaoService.ts
  modified:
    - src/features/config-vaga/schemas/testesAplicaveisSchema.ts
    - tests/setup.ts
decisions:
  - "RTL<->vitest fake-timer bridge added to tests/setup.ts (jest shim) — the 11-01 useAutosaveAvaliacao RED test could not flip GREEN otherwise (RTL waitFor + vi.useFakeTimers incompatibility)"
  - "autosave hook takes upsert as an injected dependency (testability); production passes avaliacaoService.upsertResposta"
  - "not-yet-regenerated PROD surfaces (perguntas/respostas_avaliacao/pontuar_sjt) reached via a confined LooseQuery `as never` cast until database.types.ts is regenerated in the apply wave"
metrics:
  duration: ~18 min (fully autonomous)
  completed: 2026-06-09
  tasks: 2
  files: 6
---

# Phase 11 Plan 03: Avaliação data/logic layer (SJT schema + autosave + service) Summary

Extended the Phase-7 `testesAplicaveisSchema` with the SJT battery keys and scaffolded the non-UI half of `src/features/avaliacao/`: the strict client answer schema (no score field), the sessionStorage draft hook, the 30s-debounced autosave hook with the RLS back-lock catch, and the service wired to the server-authoritative `pontuar_sjt` RPC + `avaliar-redacao` EF with allowlist reads — flipping the 11-01 RED schema + autosave-hook tests GREEN.

## What Was Built

**Task 1 (`594a3c4`):**
- `testesAplicaveisSchema.ts` — added 5 optional SJT keys to `testeAplicavelSchema` (`tipo:'sjt'`, `cargo`, `itens_ids[]`, `bateria_size`, `threshold`) plus `sjtThresholdSchema` (`mc_min_pct` default 60, `case_min` default 13, `flag_on_atencao` default true). The 4 legacy keys are untouched; new keys are optional so Phase-7 callers keep parsing (AVAL-01).
- `respostaAvaliacaoSchema.ts` — `.strict()` discriminated union: MC `{tipo:'mc', respostas:{pergunta_id,opcao_id}[]}` + open-case `{tipo:'caso_aberto', pergunta_id, texto}`. No `score`/`pontuacao` field; `.strict()` rejects an injected one (anti-tamper, Pitfall 5).
- `useAvaliacaoDraft.ts` — `save`/`load`/`clear` over sessionStorage (LGPD dies-with-tab), keyed by `candidatura_id` + `teste`, `_savedAt` stamp, try/catch-swallow.

**Task 2 (`970e8d8`):**
- `useAutosaveAvaliacao.ts` — immediate sessionStorage buffer via `useAvaliacaoDraft` + trailing-edge 30s debounce (clear+reset timer per edit) → a single server `upsert` per window; flush on unmount + `flushNow()`. A 42501/403 back-lock rejection sets a neutral `locked` state and does NOT re-throw (Pitfall 3). `upsert` is injected (testability).
- `avaliacaoService.ts` — `getAvaliacaoContext` (allowlist candidatura `id,status,etapa_atual,vaga_id` + vaga `testes_aplicaveis` + active `perguntas` allowlist), `loadResposta`, `upsertResposta` (returns raw `{error}` for the hook's back-lock branch), `pontuarSjt` → `supabase.rpc('pontuar_sjt')`, `avaliarRedacao` → `supabase.functions.invoke('avaliar-redacao')`. `AvaliacaoServiceError`. No `select('*')`; no client-side scoring.

## Verification

- `npm run test:run -- testesAplicaveisSchema` → 4/4 PASS (SJT keys parse; `threshold.mc_min_pct` defaults to 60; legacy 4-key entries still parse).
- `npm run test:run -- useAutosaveAvaliacao` → 3/3 PASS (30s debounce; single upsert per window; 42501 → `locked`, no re-throw).
- Full `npm run test:run` → 455 tests PASS (44/45 files). The one failing file is `AvaliacaoContainer.test.tsx`, the Plan 11-05 UI-component RED scaffold — out of scope for this plan ("No UI components yet").
- Service has no star projection and no client score path (acceptance greps pass).
- `npm run build` exits 0.
- tsc baseline: 292 (≤ 293 invariant; net −1, the fake-timer bridge un-stuck the LoadingProgress-adjacent flow).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] RTL ⇄ vitest fake-timer bridge in `tests/setup.ts`**
- **Found during:** Task 2 (running the 11-01 `useAutosaveAvaliacao` RED test).
- **Issue:** `@testing-library/dom`'s `jestFakeTimersAreEnabled()` only returns true when a global `jest` exists. Under vitest there is no `jest` global, so `waitFor` believed REAL timers were active and polled with `setInterval` — which `vi.useFakeTimers()` had stubbed — so `waitFor` hung to its 5s timeout even though `locked` was already `true` on the first synchronous check. The RED test (fixed contract from 11-01) could not flip GREEN without RTL detecting vitest's fake timers.
- **Fix:** Added a minimal, additive `jest` shim to `tests/setup.ts` delegating `advanceTimersByTime`/`advanceTimersByTimeAsync` to `vi`. RTL still reads `setTimeout.clock` to decide whether timers are faked, so tests on real timers behave exactly as before. Confirmed via full-suite run (455 pass, zero regression).
- **Files modified:** `tests/setup.ts`
- **Commit:** `970e8d8`

**2. [Rule 3 - Blocking] Confined `LooseQuery` cast for not-yet-regenerated PROD surfaces**
- **Found during:** Task 2 (tsc on `avaliacaoService.ts`).
- **Issue:** `perguntas`, `respostas_avaliacao` and the `pontuar_sjt` RPC are live in PROD (11-02) but `database.types.ts` is regenerated only in the Phase-11 apply wave (BLOCKING checklist #4); `supabase.from('perguntas')` typed columns as `never` → 3 net-new tsc errors.
- **Fix:** A narrow `LooseQuery`/`UntypedClient` cast on the table/rpc names only — column allowlists and return shapes stay typed locally, confining the cast to the generated-types gap. Documented in the module JSDoc.
- **Files modified:** `src/features/avaliacao/services/avaliacaoService.ts`
- **Commit:** `970e8d8`

## TDD Gate Compliance

Both tasks are `tdd="true"` against the 11-01 Wave-0 RED tests (smoke-runtime gate). The RED tests pre-existed in 11-01; this plan provided the GREEN implementations (`feat` commits flip the calibrated failures). No new `test()` commit was authored because the RED scaffolds already shipped in 11-01 — the RED→GREEN transition is asserted by the now-passing 4 schema + 3 autosave cases.

## Known Stubs

None. The not-yet-regenerated-types cast (Deviation 2) is a typed gap, not a runtime stub — the RPC/table/EF are live in PROD.

## Self-Check: PASSED

- Files exist: respostaAvaliacaoSchema.ts, useAvaliacaoDraft.ts, useAutosaveAvaliacao.ts, avaliacaoService.ts, testesAplicaveisSchema.ts (modified), tests/setup.ts (modified) — all FOUND.
- Commits exist: 594a3c4 (Task 1) + 970e8d8 (Task 2) — both FOUND in git log.
