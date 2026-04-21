---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: wave_2_partial
stopped_at: Phase 2 Wave 2 services+hooks green — only 02-03 (Edge Function) remains before Wave 3 form wiring (02-06)
last_updated: "2026-04-21T04:03:00.000Z"
last_activity: 2026-04-21 -- Plan 02-05 complete (119 passing service tests, CadastroError evolved, tryAutoLogin + FIELD_TO_STEP tables exported, RATE_LIMITED flag honored)
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 11
  completed_plans: 8
  percent: 73
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-19)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao
**Current focus:** Phase 01 — foundation-saneada

## Current Position

Phase: 02 (cadastro-candidato) — Wave 2 mostly green (4/6 plans complete)
Plan: 02-05 complete. 02-01, 02-02, 02-04, 02-05 done. Pending: 02-03 (Edge Function deploy/contract), 02-06 (form wiring).
Status: Services stream (Wave 2) green. 119 passing service tests. cadastroService routes error_code -> CadastroError.code + field; tryAutoLogin (D-02 single-retry + 500ms backoff) exported; FIELD_TO_STEP_INDEX/PATH tables exported for 02-06 consumer. duplicateCheckService honors RPC `rate_limited` flag with RATE_LIMITED code.
Last activity: 2026-04-21 -- Plan 02-05 complete (4 atomic commits: 96e820d, a9de922, fbdbb27, 0693fa7)

Progress: [#######---] 73% (milestone M1 — Phase 1 done + Phase 2 Wave 2 nearly complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 8
- Recent plan durations (Phase 2 Wave 2 stream): 02-02 (~15 min migration + types regen), 02-04 (~20 min hooks stream), 02-05 (~10 min services stream)
- Total execution time for Phase 2 so far: ~45 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 2 | 4/6 | ~45 min | ~11 min |

**Recent Trend:**

- Last 3 plans: 02-02 migration, 02-04 hooks, 02-05 services — all completed under 25 min each
- Trend: Wave 2 velocity high — pre-structured plans with tight <verify> gates execute without checkpoints

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-M1]: Branch base is `backup/local-state-2026-04`, not main
- [Pre-M1]: service_role removal is Phase 1 day 1 priority (critical security)
- [Pre-M1]: Fase 0 (Backup & Saneamento) already completed
- [02-04]: happy-dom sessionStorage quota tests must spy on the instance, not Storage.prototype (methods bind to instance after first write)
- [02-04]: vitest v4 spy typing for overloaded DOM methods (addEventListener) doesn't satisfy `ReturnType<typeof vi.spyOn>`; use `any` escape hatch with explicit annotations on callbacks
- [02-04]: vi.spyOn is idempotent — always call `vi.restoreAllMocks()` in beforeEach when each test asserts spy call counts
- [02-05]: CadastroError.code union reset to Phase 2 canonical set (EMAIL_EXISTS/CPF_EXISTS/VALIDATION/SERVER_ERROR + transport codes); legacy AUTH_FAILED/INSERT_FAILED/ROLLBACK_FAILED/VALIDATION_ERROR removed — dead code since FOUND-01 moved multi-table logic to Edge Function
- [02-05]: callDuplicateRpc return type narrowed to non-null booleans despite widened response interface — the rate_limited=true branch throws, so the resolved return path is statically known to have booleans. Avoids non-null assertions at call sites
- [02-05]: FIELD_TO_STEP_INDEX / FIELD_TO_STEP_PATH exported as fixed whitelists (not helper functions) — O(1) lookup + undefined-check enforces T-02-11 mitigation (unknown server `field` values fall through to generic toast)
- [02-05]: Pitfall 7 redaction idiom — logs emit `{ email, nome, hasPassword: Boolean(senha) }` instead of raw `data`; invokeError stripped to `.message || String(err)` before logging to prevent SDK body leakage

### Pending Todos

None yet.

### Blockers/Concerns

- **Resolved in Phase 1:** service_role removed from bundle (verified: 0 matches in build/assets/*.js)
- **Resolved in Phase 1:** auth store unified (extractRole bug deferred to Phase 3 — see KNOWN-ISSUES-CARRYOVER-PHASE-3.md)
- **Deferred to Phase 3:** extractRole reads `session.user.app_metadata` (SDK-populated, missing role) instead of JWT payload
- **Deferred to Phase 3:** LoginRHPage legacy setters bypass role validation
- **Deferred to Phase 4:** useVagas() queries non-existent `ativa` column (schema uses `status` enum)
- **Pending manual:** Edge Function `cadastrar-candidato` not yet deployed (see 01-05-CHECKPOINT.md) — cadastro runtime broken until deployed
- 103 RLS policies still need audit (deferred from Phase 1 scope)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| service tests | `duplicateCheckService.test.ts` — 10 failures asserting legacy anon-SELECT path | RESOLVED by Plan 02-05 T4 (commit 0693fa7) — rewritten for RPC + rate_limit | 02-04 T5 |
| service tests | `cadastroService.test.ts` — 16 failures asserting legacy error codes (`AUTH_FAILED`, `INSERT_FAILED`) | RESOLVED by Plan 02-05 T3 (commit fbdbb27) — rewritten for structured error_code | 02-04 T5 |
| lint | `src/features/cadastro/hooks/useFormToast.ts:221` — TS2559 on sonner toast copy. Pre-existing since d551d00 (pre-Phase 1). | Phase 3 carryover | 02-04 T5 |
| component tests | `src/features/cadastro/components/__tests__/LoadingProgress.test.tsx` — 1 failure `expect 2 to be less than or equal to 1`. Verified pre-existing via checkout of 7362935. | Out-of-scope for 02-05 — likely obsoleted when 02-06 deprecates LoadingProgress per UI-SPEC | 02-05 T5 |

Full details: `.planning/phases/02-cadastro-candidato/deferred-items.md`

## Session Continuity

Last session: 2026-04-21
Stopped at: Phase 2 Wave 2 — Plan 02-05 (services stream) complete. 119 passing service tests, 4 atomic commits (96e820d, a9de922, fbdbb27, 0693fa7).
Resume file: .planning/phases/02-cadastro-candidato/02-05-SUMMARY.md (handoff to 02-06 CadastroMultiStepForm wiring + 02-03 Edge Function contract deploy)
Next: run `/gsd-execute-phase 2` to continue — 02-03 Edge Function (error_code contract + deploy) is the last Wave 2 piece; then 02-06 wires the Wave-2 primitives into the multi-step form.
