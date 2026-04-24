---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: phase_3_context_ready
stopped_at: "Phase 3 context gathered — 16 decisions captured across 4 gray areas (login errors, Remember-me storage, password reset UX, carryover bugs scope). Ready to plan."
last_updated: "2026-04-24T16:00:00.000Z"
last_activity: 2026-04-24 -- Phase 3 discuss-phase complete (03-CONTEXT.md + 03-DISCUSSION-LOG.md)
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 11
  completed_plans: 11
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-19)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao
**Current focus:** Phase 03 — login + recuperação de senha (ready to plan)

## Current Position

Phase: 02 (cadastro-candidato) — **COMPLETE** (6/6 plans). Phase 03 ready to plan.
Plan: 02-06 complete. All plans 02-01 → 02-06 landed. Phase 2 UAT green; 3 UAT-discovered bugs fixed and regression-covered.
Status: Phase 2 fully green. Cadastro candidato fluxo end-to-end funcional em produção — 4-step form + draft persistence (sans senha) + LGPD mandatory guard + structured error_code routing + auto-login + redirect to `/candidato/perfil`. 3 UAT bugs (Sonner Toaster split-instance, duplicateCheck RPC `this`-binding, `check_candidato_duplicate` digest schema qualifier) discovered and fixed in-place; all have regression coverage where automatable. Migration `20260421000002_fix_digest_schema_in_rpc.sql` applied to production via `npx supabase db push` and live-smoke verified 200. Playwright cadastro-flow = 13 passed + 3 env-skipped. Vitest = 178 passed + 1 pre-existing LoadingProgress failure (deferred-items.md).
Last activity: 2026-04-24 -- Plan 02-06 UAT complete (8 atomic commits: ec42794, 53b5e75, 5c01f52, 9fa2507, 1c18aab, da859d4, 466438b, 8c6df3b)

Progress: [##########] 100% of currently-defined plans (11/11) — Phase 1 (5/5) + Phase 2 (6/6). Phases 3/4/5 have TBD plan counts; milestone M1 advances at ~45% of the estimated total scope.

## Performance Metrics

**Velocity:**

- Total plans completed: 11
- Recent plan durations (Phase 2 Wave 2+3 stream): 02-02 (~15 min), 02-04 (~20 min), 02-05 (~10 min), 02-03 (~50 min), 02-06 (~150 min including UAT + 3 bug fixes)
- Total execution time for Phase 2: ~245 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 2 | 6/6 | ~245 min | ~41 min |

**Recent Trend:**

- Last 5 plans: 02-02 migration, 02-04 hooks, 02-05 services, 02-03 EF deploy, 02-06 wiring+UAT — full Phase 2 closed.
- Trend: Autonomous-only plans (02-02/02-04/02-05) all under 25 min; plans with live UAT surface production-only bugs that aren't catchable by automated tests alone. 02-06 UAT found 3 such bugs (Sonner split-instance, detached `this`, digest schema) — each required its own fix commit + regression coverage where automatable. Phase 2 total UAT-vs-automation ratio: ~40% of wall-clock time spent on UAT-discovery + fix, indicating that manual browser validation continues to be load-bearing.

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
- [02-06 UAT]: UAT-driven insights — 3 bugs that no automated gate caught reshape the Phase 2+ UAT playbook: (a) **Sonner split-instance** — Vite alias `'sonner@2.0.3': 'sonner'` caused optimizeDeps to emit two pre-bundles, each with its own `ToastState` singleton; Toaster subscribed to one, 12 pages wrote into the other. Fix: remove alias + `resolve.dedupe: ['sonner']` + unversioned imports across 12 files + E2E "Sonner DOM contract" regression (`cadastro-flow.spec.ts:276`) asserts `<li data-sonner-toast>` appears inside the Notifications region. (b) **duplicateCheck `this`-detachment** — `const rpc = supabase.rpc as unknown as (...)` extracts the method reference and drops `this`; supabase-js internals dereference `this.rest` and crash before any network I/O. Fix: invoke through `.call(supabase, ...)`. Unit tests with `vi.mock('@/lib/supabase/client')` cannot catch this — only live browser can. Audit finding: this is the only occurrence in src/. (c) **digest schema qualifier** — `check_candidato_duplicate` with `SET search_path = ''` calls `public.digest(...)`, but hosted Supabase installs pgcrypto in `extensions`. Fix: migration 20260421000002 re-creates function with `extensions.digest((...)::text, 'sha256'::text)`. Local `supabase db reset` does NOT reproduce the bug — always live-smoke RPCs against hosted URL.
- [02-06 UAT]: Insight — when fixing a cross-phase bug discovered in a later plan's UAT, commit under the originating plan's scope (`fix(02-02-carryover): ...`) and document discovery in the later plan's SUMMARY. Keeps migration provenance clear and UAT discovery traceable.
- [02-06 UAT]: Insight — Vite `resolve.dedupe` + alias-removal is the canonical fix for any library with module-level singletons (Sonner, Zustand store globals, react-hot-toast, react-toastify, etc.). Prefer `resolve.dedupe` as belt-and-braces even when an alias has been removed — it enforces single-copy at the resolver layer regardless of future alias re-introductions.

### Pending Todos

None yet.

### Blockers/Concerns

- **Resolved in Phase 1:** service_role removed from bundle (verified: 0 matches in build/assets/*.js)
- **Resolved in Phase 1:** auth store unified (extractRole bug deferred to Phase 3 — see KNOWN-ISSUES-CARRYOVER-PHASE-3.md)
- **Resolved in Phase 2 Plan 02-03 (2026-04-21):** Edge Function `cadastrar-candidato` redeployed with `--no-verify-jwt` (Bug 4 closed); contract evolved to `{ ok, error_code, message, field? }` with legacy `error` alias; policy_version written to every autorizacoes row. 3 live smoke tests passed (VALIDATION + EMAIL_EXISTS + ok=true valid create).
- **Resolved in Phase 2 Plan 02-06 (2026-04-24 UAT):** (a) Sonner Toaster split-instance — removed vite alias, added `resolve.dedupe`, rewrote 12 pages' imports, added E2E regression. (b) duplicateCheck RPC `this`-detachment — invoke through `.call(supabase, ...)`. (c) `check_candidato_duplicate` digest schema — authored migration `20260421000002_fix_digest_schema_in_rpc.sql` qualifying `extensions.digest(...)`; applied via `npx supabase db push` + live-smoke 200.
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

Last session: 2026-04-24 (Phase 3 discuss-phase)
Stopped at: **Phase 3 context captured.** 03-CONTEXT.md + 03-DISCUSSION-LOG.md written with 16 locked implementation decisions across 4 gray areas: (1) Login error taxonomy — generic "Email ou senha inválidos" for credentials (security > UX), dedicated CTA for `email_not_confirmed`, cooldown timer for rate-limit, dedicated NETWORK_ERROR (matches Phase 2 pattern). (2) Remember-me — checked by default, `sessionStorage` if unchecked, no timeout for candidates, always redirect to `/candidato/perfil`. (3) Reset flow — neutral "if email exists" message, senha+confirmar fields, Zod silent validation (no strength meter), auto-login + toast + redirect after reset. (4) Carryover scope — Bug 1 (AUTH-JWT-01 extractRole) IN (pre-req for criterion 1), Bug 2/3 (AUTH-LOGIN-01/02 LoginRH forge) IN (canonical rewrite), Bug 6 (AUTH-RPC-01 CPF) OUT (moves to Phase 4/5), LGPD re-consent NOT shown on reset. Three open Claude's Discretion items (D-19 storage swap strategy, D-20 JWT decode library, D-21 UI layout divergence) flagged for planner/UI-phase.
Resume file: .planning/phases/03-login-recuperacao-senha/03-CONTEXT.md
Next: run `/gsd-ui-phase 3` (recommended — phase has 4 UI forms + glass UI Beauty Smile design system consistency) OR `/gsd-plan-phase 3` (skip UI-SPEC if planner is comfortable deferring UI decisions to implementation).
