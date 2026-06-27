---
phase: 11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3
plan: 06
subsystem: ui
tags: [react, tanstack-query, supabase, allowlist, lgpd, rnf-07a, sjt, scorecard]

# Dependency graph
requires:
  - phase: 11-04
    provides: scores_candidato write path (pontuar_sjt RPC) + score row shape
  - phase: 11-05
    provides: features/avaliacao/components barrel (AvaliacaoContainer + 2 SJT screens)
  - phase: 10
    provides: SugestaoIABadge (RNF-07a guardrail) + allowlist panel-read idiom (triagemService)
provides:
  - RH read-only SJT scorecard (allowlist read of scores_candidato — never select('*'))
  - useScorecardCandidato TanStack Query hook keyed by candidaturaId
  - ScorecardAvaliacao component (MC breakdown + open-case BARS + citations/red_flags, neutral, SugestaoIABadge, pendente_humano marker)
affects: [11-decisao-rh, phase-12-entrevista, rh-funil]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RH allowlist read mirrors triagemService — explicit column list, never select('*') (T-11-06-01, reference_select_star_leaks_pii)"
    - "AI-derived RH blocks always carry the reused SugestaoIABadge (RNF-07a); neutral 'Requer revisão humana' on pendente_humano — never auto-rejects"
    - "narrow `as never` cast confined to the database.types.ts gap for the not-yet-regenerated scores_candidato table (Phase-11 apply-wave precedent)"

key-files:
  created:
    - src/features/avaliacao/services/scoresRhService.ts
    - src/features/avaliacao/hooks/useScorecardCandidato.ts
    - src/features/avaliacao/components/ScorecardAvaliacao.tsx
    - src/features/avaliacao/services/__tests__/scoresRhService.test.ts
  modified:
    - src/features/avaliacao/components/index.ts

key-decisions:
  - "scores_candidato reached via narrow `as never` cast (types regen lands in Phase-11 apply wave) — column allowlist + return shape stay typed locally"
  - "open-case composite falls back to row.score when metadata.composite_0_25 absent"
  - "neutral score display 'x / max' with no red/green tint — SugestaoIABadge stays the single AI signal (UI-SPEC §RH Scorecard View score-color rule)"

patterns-established:
  - "RH scorecard: per-subtipo card (mc → per-item tag/peso; caso_aberto → BARS dims 1-5 + composite 0-25 + citações + red_flags)"
  - "pendente_humano → neutral CircleDashed 'Requer revisão humana' badge; falhou → 'Pontuação indisponível' state; loading skeleton; empty 'Sem avaliações registradas ainda.'"

requirements-completed: [AVAL-02, AVAL-03]

# Metrics
duration: ~5min
completed: 2026-06-09
---

# Phase 11 Plan 06: RH Scorecard (read-only SJT scores) Summary

**RH-facing read-only SJT scorecard — allowlist read of `scores_candidato` (never `select('*')`), a candidaturaId-keyed TanStack hook, and a structured per-dimension component (MC breakdown + open-case BARS + citations/red_flags) that reuses `SugestaoIABadge` (RNF-07a) and surfaces a neutral "Requer revisão humana" marker on `pendente_humano` — never an auto-decision.**

## Performance

- **Duration:** ~5 min (fully autonomous)
- **Started:** 2026-06-09T06:44:12Z
- **Completed:** 2026-06-09T06:48Z
- **Tasks:** 2
- **Files modified:** 5 (4 created + 1 modified)

## Accomplishments
- `scoresRhService.getScores(candidaturaId)` — EXPLICIT column allowlist read of `scores_candidato` (`id, tipo, subtipo, pergunta_id, score, score_max, status, metadata, citacoes, red_flags`); never a star projection (T-11-06-01, `reference_select_star_leaks_pii`). Candidate denied by RLS at the DB.
- `useScorecardCandidato` — TanStack `useQuery` keyed `['scorecard-avaliacao', candidaturaId]`, staleTime 5min, retry 2, `enabled: !!candidaturaId` (project defaults, mirrors `useTriagemPanel`).
- `ScorecardAvaliacao` — desktop RH shell (not the candidate glass shell). MC per-item breakdown from `metadata.respostas` (item/tag/peso) + open-case BARS dims 1-5 → composite 0-25 from `metadata.dimension_scores` + `citacoes`/`red_flags`. `SugestaoIABadge` full on each panel header + compact inline on every AI dimension. Neutral `Requer revisão humana` marker on `pendente_humano`, `Pontuação indisponível` on `falhou`, skeleton on loading, empty-state copy. No red/green pass-fail tints.
- Wave-0 RED → GREEN allowlist test asserts the select string contains every allowlisted column and never `'*'` (4/4 green).
- Barrel extended with `ScorecardAvaliacao` + `ScorecardAvaliacaoProps` — the Plan-11-05 exports preserved.

## Task Commits

1. **Task 1: scoresRhService (allowlist read) + useScorecardCandidato hook** — `bec6c90` (feat) — service + hook + allowlist test (RED confirmed module-not-found, then GREEN 4/4)
2. **Task 2: ScorecardAvaliacao component (structured + SugestaoIABadge + pendente_humano marker)** — `061120b` (feat) — component + barrel extension

**Plan metadata:** (this docs commit)

## Files Created/Modified
- `src/features/avaliacao/services/scoresRhService.ts` — RH allowlist read of `scores_candidato` (`getScores` + `ScoresRhServiceError` + typed `ScoreRow`/`McMetadata`/`CasoAbertoMetadata`)
- `src/features/avaliacao/hooks/useScorecardCandidato.ts` — TanStack Query hook keyed by candidaturaId
- `src/features/avaliacao/components/ScorecardAvaliacao.tsx` — structured neutral RH scorecard (MC + BARS, SugestaoIABadge, pendente_humano marker)
- `src/features/avaliacao/services/__tests__/scoresRhService.test.ts` — allowlist/no-`*` PII-leak guard (4 tests)
- `src/features/avaliacao/components/index.ts` — appended ScorecardAvaliacao export (11-05 exports kept)

## Decisions Made
- `scores_candidato` is live in PROD but may not yet be in `database.types.ts` (regen lands in the Phase-11 apply wave) — reached via a narrow `as never` cast confined to the generated-types gap; the column allowlist + return shape stay typed locally (same precedent as `avaliacaoService` `perguntas`/`respostas_avaliacao`).
- Open-case composite falls back to `row.score` when `metadata.composite_0_25` is absent.
- Neutral score display only ("x / max", "x / 5", "x / 25") — no red/green tints, so the `SugestaoIABadge` stays the single AI signal (UI-SPEC §RH Scorecard View score-color rule).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. RED confirmed (module-not-found), GREEN flipped on first implementation pass; full suite green with no regressions.

## Verification
- `npm run test:run -- scoresRhService` — 4/4 PASS (allowlist columns present + no `'*'`).
- `npm run test:run` (full) — 462/462 PASS, 46/46 files (no regressions; the historical LoadingProgress carryover is also green).
- `npm run test:run -- forbidden-strings` — 9/9 PASS (LGPD-04 grep green).
- `grep SugestaoIABadge` + `grep "Requer revisão humana"` GREEN in ScorecardAvaliacao.tsx; no `select('*')`.
- `npm run build` — exit 0 (~5.2s).
- tsc baseline 291 ≤ 293 invariant (zero growth).
- Hook bypass `git -c core.hooksPath=/dev/null` per project convention.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RH scorecard read surface complete and test-guarded against over-projection. Ready for mounting into the RH funil/decisão surface (Phase 11 decisão / Phase 12).
- The `scores_candidato` table read depends on `database.types.ts` regen in the Phase-11 BLOCKING apply wave to drop the narrow `as never` cast — behavior is unaffected until then.

## Self-Check: PASSED
- FOUND: src/features/avaliacao/services/scoresRhService.ts
- FOUND: src/features/avaliacao/hooks/useScorecardCandidato.ts
- FOUND: src/features/avaliacao/components/ScorecardAvaliacao.tsx
- FOUND: src/features/avaliacao/services/__tests__/scoresRhService.test.ts
- FOUND commit: bec6c90 (Task 1)
- FOUND commit: 061120b (Task 2)

---
*Phase: 11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3*
*Completed: 2026-06-09*
