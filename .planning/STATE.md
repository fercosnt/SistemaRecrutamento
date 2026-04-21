---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: wave_2_complete
stopped_at: Phase 2 Wave 2 complete — plans 02-03/02-04/02-05 all landed; Edge Function redeployed + UAT-passed; ready for Wave 3 (02-06)
last_updated: "2026-04-21T05:00:00.000Z"
last_activity: 2026-04-21 -- Plan 02-03 complete (EF redeployed + schema-aligned via UAT)
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 11
  completed_plans: 9
  percent: 82
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-19)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao
**Current focus:** Phase 01 — foundation-saneada

## Current Position

Phase: 02 (cadastro-candidato) — Wave 2 complete (3/3 plans); Wave 3 ready (02-06)
Plan: 02-03 complete. 02-01, 02-02, 02-03, 02-04, 02-05 done. Pending: 02-06 (form wiring — Wave 3 last).
Status: Wave 2 fully green. Edge Function `cadastrar-candidato` redeployed with `--no-verify-jwt` (resolves KNOWN-ISSUES Bug 4) and UAT-passed on 3 live smoke tests (VALIDATION+field=email on empty body; EMAIL_EXISTS+field=email on duplicate; ok=true+4 IDs on valid create). Schema-alignment hotfix in commit `9547d65` normalized cpf/celular formatting at EF boundary, dropped obsolete `data_aceite`, and translated disponibilidade field names — created one downstream carryover (RPC `check_candidato_duplicate` cpf_exists always-false) tracked as Bug 6 in KNOWN-ISSUES-CARRYOVER-PHASE-3.md, with UNIQUE-constraint + error-message-match serving as the CPF_EXISTS safety net.
Last activity: 2026-04-21 -- Plan 02-03 complete (3 atomic commits: df3f752, 2796405, 9547d65)

Progress: [########--] 82% (milestone M1 — Phase 1 done + Phase 2 Wave 2 complete; only 02-06 + Phases 3/4/5 remain)

## Performance Metrics

**Velocity:**

- Total plans completed: 9
- Recent plan durations (Phase 2 Wave 2 stream): 02-02 (~15 min migration + types regen), 02-04 (~20 min hooks stream), 02-05 (~10 min services stream), 02-03 (~50 min EF rewrite + user-gated deploy + UAT schema-alignment hotfix)
- Total execution time for Phase 2 so far: ~95 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 2 | 5/6 | ~95 min | ~19 min |

**Recent Trend:**

- Last 4 plans: 02-02 migration, 02-04 hooks, 02-05 services, 02-03 EF deploy — all Wave-1+2 work landed. 02-03 was the longest due to human-action checkpoint (deploy) + live UAT surfacing a schema-divergence bug that required a hotfix commit.
- Trend: Autonomous-only plans (02-02/02-04/02-05) all under 25 min; plans with human-action checkpoints + live UAT (02-03) land in ~50 min with schema-alignment hotfixes being the dominant time.

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
- [02-03]: Keep legacy `error` alias as verbatim copy of `message` in Edge Function error body during Phase 2→3 transition — protects any cached Phase-1 client bundles from displaying `undefined`; drop alias in Phase 3 per T-02-03
- [02-03]: Format cpf and celular to DB-canonical strings (`XXX.XXX.XXX-XX`, `(XX) XXXXX-XXXX`) inside the Edge Function write boundary rather than mutating the Zod schema or DB — lets the client continue submitting either digits-only or masked values while satisfying DB CHECK constraints. Trade-off: creates carryover that RPC `check_candidato_duplicate` cpf_exists compares digits-only vs formatted column and always returns false (Bug 6 in KNOWN-ISSUES-CARRYOVER-PHASE-3.md). UNIQUE constraint is the safety net
- [02-03]: Translate disponibilidade field names at the EF write boundary (`turno_preferido` → `periodo_disponivel`, `modelo_trabalho` → `regime_trabalho`) instead of renaming Zod schema fields — isolates blast radius from client form state. Drop `data_aceite` from autorizacoes INSERT (column does not exist in real schema)

### Pending Todos

None yet.

### Blockers/Concerns

- **Resolved in Phase 1:** service_role removed from bundle (verified: 0 matches in build/assets/*.js)
- **Resolved in Phase 1:** auth store unified (extractRole bug deferred to Phase 3 — see KNOWN-ISSUES-CARRYOVER-PHASE-3.md)
- **Resolved in Phase 2 Plan 02-03 (2026-04-21):** Edge Function `cadastrar-candidato` redeployed with `--no-verify-jwt` (Bug 4 closed); contract evolved to `{ ok, error_code, message, field? }` with legacy `error` alias; policy_version written to every autorizacoes row. 3 live smoke tests passed (VALIDATION + EMAIL_EXISTS + ok=true valid create).
- **Deferred to Phase 3:** extractRole reads `session.user.app_metadata` (SDK-populated, missing role) instead of JWT payload
- **Deferred to Phase 3:** LoginRHPage legacy setters bypass role validation
- **Deferred to Phase 3 (NEW from 02-03 UAT):** RPC `check_candidato_duplicate` cpf_exists always returns false — compares client-supplied digits-only CPF vs now-formatted `candidatos.cpf` column. UNIQUE constraint on `candidatos.cpf` + EF unique-violation branch maps to `CPF_EXISTS` + `field: 'cpf'` via error-message substring match, so the user still gets correct form-level feedback at submit-time (just not at debounce-time). Fix: migration that normalizes CPF inside the RPC (strip formatting before compare). Tracked as Bug 6 in KNOWN-ISSUES-CARRYOVER-PHASE-3.md.
- **Deferred to Phase 4:** useVagas() queries non-existent `ativa` column (schema uses `status` enum)
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
Stopped at: Phase 2 Wave 2 complete — plans 02-03/02-04/02-05 all landed; Edge Function redeployed + UAT-passed; ready for Wave 3 (02-06). 02-03 landed via 3 atomic commits (df3f752 T1 shared constants+schemas; 2796405 T2 EF rewrite; 9547d65 UAT schema alignment hotfix) + this docs commit.
Resume file: .planning/phases/02-cadastro-candidato/02-03-SUMMARY.md (Wave 2 closeout handoff). For next session, start from .planning/phases/02-cadastro-candidato/02-06-PLAN.md.
Next: run `/gsd-execute-phase 2` to continue — only 02-06 (CadastroMultiStepForm wiring + AutorizacoesStep LGPD layout + font-weight sweep + E2E 6 cases, Wave 3) remains in Phase 2. All primitives live: structured EF error contract, service-layer error_code routing, useCadastroDraft + useLeaveGuard hooks, 300ms debounce default, FIELD_TO_STEP tables, RATE_LIMITED handling, tryAutoLogin.
