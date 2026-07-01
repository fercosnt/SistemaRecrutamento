---
phase: 19-performance-bundle-cache
plan: 03
subsystem: cache-invalidation
tags: [PERF-04, tanstack-query, cache, freshness, invalidation]
requires:
  - "decisaoKeys.consolidacao factory (useConsolidacao.ts:21-22)"
  - "19-01 RED regression tests (useEntrevistaScorecard.test.ts + useRedacaoRevisao.test.ts)"
provides:
  - "useEntrevistaScorecard: vagaId param + targeted consolidacao invalidation on salvarAvaliacao (Gap A)"
  - "useRedacaoRevisao: per-row candidaturaId threaded through mutation vars + targeted consolidacao invalidation (Gap B)"
  - "useCandidaturas: per-query refetchOnWindowFocus:true for cross-client ≤60s freshness"
affects:
  - "EntrevistaWorkspace.tsx + HubCandidatoRH.tsx (scorecard call sites)"
  - "RedacaoReviewPanel.tsx (redação review mutate call site)"
tech-stack:
  added: []
  patterns:
    - "TARGETED cache invalidation (decisaoKeys.consolidacao(id, vagaId)), never broad decisaoKeys.all"
    - "per-query refetchOnWindowFocus paired with staleTime ≤60s; global default kept false"
    - "mutation-variable threading of a per-row id used for invalidation only (not forwarded to the service)"
key-files:
  created: []
  modified:
    - src/features/entrevista/hooks/useEntrevistaScorecard.ts
    - src/features/entrevista/components/EntrevistaWorkspace.tsx
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/features/triagem/hooks/useRedacaoRevisao.ts
    - src/features/triagem/components/RedacaoReviewPanel.tsx
    - src/features/vagas/hooks/useCandidaturas.ts
decisions:
  - "Invalidation is TARGETED to decisaoKeys.consolidacao(candidaturaId, vagaId) in both gap hooks — broad decisaoKeys.all is forbidden (CONTEXT Área 2 ALVO)"
  - "candidaturaId in useRedacaoRevisao is carried in mutation vars for invalidation ONLY; mutationFn still calls salvarRevisao(redacaoId, payload) — service signature unchanged"
  - "refetchOnWindowFocus applied PER-QUERY to useCandidaturas only; global QueryClient default stays false (App.tsx:43) so RH/AI reads are not refetched"
  - "RNF-07a preserved: cache-only invalidation, zero candidaturas writes; consolidacao stays read-only/advisory"
metrics:
  duration: 6min
  completed: 2026-06-29
  tasks: 2
  files: 6
---

# Phase 19 Plan 03: PERF-04 Cache Invalidation & Freshness Summary

Two surgical invalidation-gap closures plus one per-query freshness toggle: scorecard and redação-review saves now invalidate the TARGETED `decisaoKeys.consolidacao(candidaturaId, vagaId)` key (threading the ids), and the candidate dashboard read refetches on window focus for cross-client ≤60s visibility — without flipping the global QueryClient default.

## What Was Built

**Gap A — `useEntrevistaScorecard` (Task 1):** Added `vagaId: string | undefined` as the 2nd positional param (before `options`). On `salvarAvaliacao` success the hook now invalidates the existing `entrevistaKeys.scorecard` key (kept) AND the TARGETED `decisaoKeys.consolidacao(candidaturaId, vagaId)` key, guarded by both ids present. So the Decisão Final dashboard refetches in ≤60s instead of holding pre-write data for the 5-min staleTime. Call sites threaded with the already-available `vagaId`: `EntrevistaWorkspace.tsx:87` (mirrors `useGuiaEntrevista` at L74) and `HubCandidatoRH.tsx:90`.

**Gap B — `useRedacaoRevisao` (Task 2):** Extended the `salvar` mutation variables to `{ redacaoId, candidaturaId, payload }`. `candidaturaId` is carried for invalidation ONLY — `mutationFn` still calls `salvarRevisao(redacaoId, payload)` (service signature unchanged). `onSuccess(_d, vars)` keeps the existing `queue` + `duvidas` invalidations and adds the TARGETED `decisaoKeys.consolidacao(vars.candidaturaId, vagaId)` invalidation using the per-row `candidatura_id` (the hook only knows `vagaId`; each essay carries its own `candidatura_id`). Call site `RedacaoReviewPanel.handleSalvar` threads `selected.candidatura_id`.

**Freshness — `useCandidaturas` (Task 2):** Added per-query `refetchOnWindowFocus: true` (staleTime is already 1min ≤60s). Needs BOTH to fire (RESEARCH Pitfall 5). The global QueryClient default in `App.tsx:43` is unchanged (stays `false`), so expensive RH/AI reads are not refetched. Per the verified candidate-visible-read audit, `useCandidaturas` is the only candidate-visible mutable-status read needing the pairing — `useExplicacao` (static rejection explanation), `useAllCandidaturas`, and `useVagaCandidaturas` (RH reads) are untouched.

## Verification

- **Both Plan-01 regression tests now GREEN:** `useEntrevistaScorecard.test.ts` (Gap A) and `useRedacaoRevisao.test.ts` (Gap B) — were RED-by-design after 19-01, both assert the exact targeted `decisaoKeys.consolidacao(...)` key.
- **Full vitest suite: 661/661 passing** (79 files). Was 659 pass / 2 RED-by-design before this plan; both RED tests flipped GREEN, total unchanged at 661.
- **tsc: 258 errors** (= FOUND-08 baseline; ≤ 258 ✓). No new type errors introduced.
- **Verification greps:** targeted `decisaoKeys.consolidacao` present in both hooks; no `decisaoKeys.all` invalidation code introduced (only mentioned in comments as the forbidden alternative); `refetchOnWindowFocus: true` in `useCandidaturas`; `App.tsx:43` global default still `false`; both call-site patterns present.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Second `useEntrevistaScorecard` caller required the new positional `vagaId` arg**
- **Found during:** Task 1 (tsc rose 258 → 259 after the signature change)
- **Issue:** Making `vagaId` a required positional param (before `options`) broke a second, read-only caller — `HubCandidatoRH.tsx:90` (`useEntrevistaScorecard(candidaturaId)`), outside the plan's `files_modified`. This is a blocking issue directly caused by the signature change (Rule 3), not a plan-listed call site.
- **Fix:** Threaded the already-in-scope `vagaId` (computed at `HubCandidatoRH.tsx:85` from `contexto?.vaga_id`) into the call: `useEntrevistaScorecard(candidaturaId, vagaId)`. This caller is read-only (does not invoke `salvarAvaliacao`), so the invalidation is inert there — the change only satisfies the new required-arg contract. tsc returned to 258.
- **Files modified:** src/features/hub-candidato/components/HubCandidatoRH.tsx
- **Commit:** 2eb478b

## Threat Surface

No new security-relevant surface. Per the plan's `<threat_model>`: invalidation is TARGETED (no over-broad cache churn / cross-candidatura refetch leakage — T-19-03-01); `refetchOnWindowFocus` is per-query on the candidate's own-row, already-RLS-scoped list (T-19-03-02); zero candidaturas writes (RNF-07a — T-19-03-03); zero new packages (T-19-03-SC). No Threat Flags.

## Known Stubs

None.

## Deferred

- Cross-client ≤60s live freshness check (one tab observing another client's write surfacing on refocus) is a Phase 21 manual/deferred UAT — not blocking here. The same-client invalidation path (the PERF-04 requirement met by this plan) is fully covered by the two GREEN regression tests.

## Self-Check: PASSED

- FOUND: src/features/entrevista/hooks/useEntrevistaScorecard.ts (decisaoKeys.consolidacao)
- FOUND: src/features/triagem/hooks/useRedacaoRevisao.ts (decisaoKeys.consolidacao)
- FOUND: src/features/vagas/hooks/useCandidaturas.ts (refetchOnWindowFocus: true)
- FOUND: commit 2eb478b (Task 1 — Gap A)
- FOUND: commit aed9232 (Task 2 — Gap B + freshness)
