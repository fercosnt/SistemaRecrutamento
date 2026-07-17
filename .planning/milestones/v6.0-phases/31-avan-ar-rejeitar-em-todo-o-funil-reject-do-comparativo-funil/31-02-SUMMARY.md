---
phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil
plan: 02
subsystem: ui
tags: [typescript, react, tanstack-query, supabase-rpc, service-layer, mutation-hook, funnel]

# Dependency graph
requires:
  - phase: 31 (plan 01)
    provides: the rejeitar_candidatura DEFINER RPC contract (enum motivo_rejeicao_rh + ≥50 gate + single-audit-row reject) that this typed client path calls
  - phase: 15 (decisao final)
    provides: registrarDecisao / useRegistrarDecisao — the service+hook triad copied verbatim (error class shape, p_-prefixed params, mutation+toast+invalidation)
provides:
  - "rejeitarCandidatura() service — thin typed pass-through to the rejeitar_candidatura RPC (pre-regen `as never` cast, dropped in 31-06); RPC error → TriagemServiceError DATABASE_ERROR"
  - "MotivoRejeicaoRh type — 6-value union mirroring the enum"
  - "updateCandidaturaEtapa(id, etapa, justificativa?) — now ALWAYS SETs etapa_justificativa (justificativa ?? null), closing the stale-OLD trigger-read hazard (OPER-01/03)"
  - "useRejeitarCandidatura hook — mutation → success/error toast + 3-tree invalidation (candidaturasKeys.all + vagasKeys.all + triagemKeys.all)"
  - "UpdateCandidaturaEtapaVars.justificativa (optional) forwarded to the service — feeds the Retroceder dialog (31-03)"
affects: [31-03 (shared dialogs consume these), 31-04/31-05 (Kanban/Hub/Comparativo surfaces), 31-06 (BLOCKING apply + regen types drops the `as never`)]

# Tech tracking
tech-stack:
  added: []  # zero new npm packages — @supabase/supabase-js, @tanstack/react-query, sonner already in use
  patterns:
    - "Pre-regen `supabase.rpc('name' as never, {...} as never)` cast for a not-yet-typed RPC (Phase-15 decisaoService precedent); the cast is removed after db:types regen"
    - "Every etapa UPDATE ALWAYS writes etapa_justificativa (never omitted) so the avancar_etapa() trigger never reads a stale OLD value"
    - "Service error class + p_-prefixed RPC params (TriagemServiceError mirrors DecisaoServiceError)"
    - "TanStack mutation → toast → 3-tree invalidation (copied from useRegistrarDecisao)"

key-files:
  created:
    - src/features/triagem/hooks/useRejeitarCandidatura.ts
    - src/features/triagem/hooks/__tests__/useRejeitarCandidatura.test.ts
  modified:
    - src/features/triagem/services/triagemService.ts
    - src/features/triagem/services/__tests__/triagemService.test.ts
    - src/features/vagas/hooks/useCandidaturas.ts

key-decisions:
  - "rejeitarCandidatura keeps the `as never` cast on both the RPC key and the params object — the RPC/enum are not in database.types.ts until 31-06 regen; the exact call string `supabase.rpc('rejeitar_candidatura' as never, {...} as never)` is the pre-regen pattern, and 31-06 removes the casts"
  - "updateCandidaturaEtapa widens the local `update` object type to include `etapa_justificativa: string | null` and sets it on EVERY call — forward advance → null, regression → fresh text, reject → the ≥50 text; keeps the `.update(update as never)` cast and the status:'rejeitado' branch"
  - "The service does NOT re-implement the ≥50 gate (T-31-02) — it forwards to the RPC whose check_violation RAISE is authoritative; it only maps that error to TriagemServiceError for the toast"

patterns-established:
  - "Client-tier reject path is a thin typed pass-through; the DB RPC is the sole ≥50 + WR-04 authority"
  - "Optional justificativa threaded through the mutation VARIABLES (not a hook param) so the Retroceder dialog carries the per-transition text"

requirements-completed: [OPER-01, OPER-02, OPER-03]

# Metrics
duration: ~12min
completed: 2026-07-14
---

# Phase 31 Plan 02: rejeitarCandidatura Service + Hook + always-set etapa_justificativa Summary

**Typed client path to the reject RPC: `rejeitarCandidatura` service (pre-regen `as never` cast) + `useRejeitarCandidatura` 3-tree-invalidation hook, plus the `updateCandidaturaEtapa` extension that ALWAYS writes `etapa_justificativa` — closing the stale-OLD trigger-read hazard.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-14T21:00Z (approx)
- **Completed:** 2026-07-14T21:05Z
- **Tasks:** 2 (both TDD)
- **Files created:** 2 · **Files modified:** 3

## Accomplishments
- Extended `updateCandidaturaEtapa` to `(candidaturaId, novaEtapa, justificativa?)` and made `etapa_justificativa` a permanent member of the UPDATE SET (`justificativa ?? null`) — forward advance writes null, a regression carries the fresh text, a reject carries the ≥50 text. This closes the Pitfall-3 hazard where the trigger would read a stale stored justificativa (OPER-01/03).
- Added `rejeitarCandidatura(candidaturaId, motivo, justificativa)` mirroring `registrarDecisao`: empty-id guard → `TriagemServiceError('INVALID_INPUT')`; `supabase.rpc('rejeitar_candidatura' as never, { p_candidatura_id, p_motivo, p_justificativa } as never)`; RPC error → `TriagemServiceError DATABASE_ERROR`. Exported the `MotivoRejeicaoRh` 6-value union. The `as never` casts are the pre-regen pattern (31-06 removes them after `npm run db:types`).
- Created `useRejeitarCandidatura` copying `useRegistrarDecisao`: success → `toast.success('Candidato movido para "Rejeitado".')` + invalidate all THREE key trees (`candidaturasKeys.all`, `vagasKeys.all`, `triagemKeys.all`); error → `toast.error('Não foi possível rejeitar o candidato. Tente novamente.')`.
- Threaded optional `justificativa` through `UpdateCandidaturaEtapaVars` and forwarded it in the `useUpdateCandidaturaEtapa` mutationFn, leaving the existing invalidation block untouched — the Retroceder dialog (31-03) can now pass its required text.

## Task Commits

Each task was committed atomically (TDD: test → feat; pre-commit hook bypassed via `core.hooksPath=/dev/null` per this repo's documented workflow):

1. **Task 1 (test): extend service test suite** — `9abfdf3` (test)
2. **Task 1 (feat): rejeitarCandidatura + always-set etapa_justificativa** — `91e6083` (feat)
3. **Task 2 (test): useRejeitarCandidatura invalidation test** — `e37cd0c` (test)
4. **Task 2 (feat): useRejeitarCandidatura hook + forward justificativa** — `1fd8616` (feat)

**Plan metadata:** (this SUMMARY + STATE + ROADMAP) — see final docs commit.

## Files Created/Modified
- `src/features/triagem/services/triagemService.ts` — added `MotivoRejeicaoRh` union + `rejeitarCandidatura()`; extended `updateCandidaturaEtapa` to always SET `etapa_justificativa`.
- `src/features/triagem/services/__tests__/triagemService.test.ts` — extended the mock (capture `.update()` payload + `supabase.rpc`) and added 7 assertions (3 update-payload, 1 update invalid-input, 3 reject).
- `src/features/triagem/hooks/useRejeitarCandidatura.ts` — NEW mutation hook (toast + 3-tree invalidation).
- `src/features/triagem/hooks/__tests__/useRejeitarCandidatura.test.ts` — NEW hook test (3-tree invalidation + success/error toast).
- `src/features/vagas/hooks/useCandidaturas.ts` — `UpdateCandidaturaEtapaVars` gains optional `justificativa`; mutationFn forwards it.

## Decisions Made
- **Kept the double `as never` cast (RPC key + params) on `rejeitarCandidatura`** — the RPC and `motivo_rejeicao_rh` enum are not in `database.types.ts` until the 31-06 regen, so the plain `.rpc('rejeitar_candidatura', {...})` would fail tsc. This matches the plan's explicit Warning #2 requirement and the Phase-15 intermediate `decisaoService` precedent. 31-06 drops both casts.
- **`etapa_justificativa` is in the SET on every path** (not conditionally) — the local `update` object type was widened to `{ etapa_atual; status?; etapa_justificativa: string | null }` and the `.update(update as never)` cast retained; the `status:'rejeitado'` branch preserved verbatim.
- **The service does not re-check ≥50** — defense-in-depth stays server-side (the RPC's `check_violation` RAISE); the client only maps the error to a toast (threat T-31-02 mitigate).

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed TDD (RED test commit → GREEN feat commit); each task's `<verify>` gate ran green.

## Issues Encountered
None. RED was confirmed for both tasks before implementing (6 service-test fails; the hook-test module-resolution failure), and both flipped GREEN after the minimal implementation.

## Verification
- `npx vitest run src/features/triagem/services/__tests__/triagemService.test.ts` — 12/12 GREEN (5 pre-existing + 7 new).
- `npx vitest run src/features/triagem` — 45/45 GREEN (full triagem suite).
- `npx vitest run src/features/vagas/hooks` — 4/4 GREEN (no regression from the `useCandidaturas` change).
- `npm run lint` (tsc `--noEmit`) — **104 errors, held at the M5 baseline** (no NEW errors from these files; the `as never` casts type-check).

## TDD Gate Compliance
Both tasks are `tdd="true"`. Gate sequence honored per task: a `test(...)` commit (RED) precedes the `feat(...)` commit (GREEN). RED was verified by running the suite before each implementation. No unexpected pass during RED. No REFACTOR commit was needed.

## User Setup Required
None — no external service configuration. This is a pure client-tier plan.

## Next Phase Readiness
- The typed client contract is ready for 31-03 (`RejeitarCandidaturaDialog` via `useRejeitarCandidatura`; `RetrocederCandidaturaDialog` via the extended `useUpdateCandidaturaEtapa`).
- **Blocking dependency for a working reject at runtime:** 31-06 must apply `20260714100001_rejeitar_candidatura_rpc.sql` via Supabase MCP `apply_migration` and regen `database.types.ts` — the RPC does not exist in PROD until then, and the two `as never` casts remain until the regen. Until 31-06, `rejeitarCandidatura` will fail at runtime (the RPC key is unknown to PostgREST), which is expected for this authored-ahead plan.
- No blockers introduced. The trigger `avancar_etapa()` remains unedited (invariant preserved).

## Self-Check: PASSED

- FOUND: src/features/triagem/hooks/useRejeitarCandidatura.ts
- FOUND: src/features/triagem/hooks/__tests__/useRejeitarCandidatura.test.ts
- FOUND commit: 9abfdf3 (Task 1 test)
- FOUND commit: 91e6083 (Task 1 feat)
- FOUND commit: e37cd0c (Task 2 test)
- FOUND commit: 1fd8616 (Task 2 feat)

---
*Phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil*
*Completed: 2026-07-14*
