---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: phase_3_planned
stopped_at: "Phase 3 plans approved — 7 plans across 7 waves, VERIFICATION PASSED on iteration 2 (1 BLOCKER + 6 WARNINGS resolved). All 4 AUTH requirements covered; Bug 1 (D-13) + Bug 2/3 (D-14) scoped; Bug 6 (D-15) correctly deferred. Ready to execute."
last_updated: "2026-04-24T19:30:00.000Z"
last_activity: 2026-04-24 -- Phase 3 planned (7 PLAN.md files, VALIDATION.md + PATTERNS.md + RESEARCH.md created)
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 18
  completed_plans: 11
  percent: 61
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-19)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao
**Current focus:** Phase 03 — login + recuperação de senha (ready to execute, 7 plans)

## Current Position

Phase: 03 (login-recuperacao-senha) — **READY TO EXECUTE** (0/7 plans). Phase 02 complete. All upstream artifacts in place: 03-CONTEXT.md (21 decisions), 03-UI-SPEC.md (6/6 PASS), 03-RESEARCH.md (Q1-Q10 + validation + threat model), 03-PATTERNS.md (17 analogs), 03-VALIDATION.md (16 behaviors B1-B16 + Wave 0 runbook), 7 PLAN.md files.
Plan: Waves 0→6 sequential (single-parallelism per revised checker iteration 2). Plan 03-01 (Wave 0) is `autonomous: false` — gated by jwt-decode install + Supabase Dashboard audit (OTP expiry 3600s + redirect URLs for /auth/redefinir-senha).
Status: Phase 3 planned and verified. 7 plans cover AUTH-01..AUTH-04 + Bug 1 (D-13 extractRole JWT decode) + Bug 2/3 (D-14 LoginRH role gate). Threat model T-03-01..T-03-10 (3 HIGH + 5 MEDIUM + 2 LOW) has mitigations in dedicated tasks. Bug 6 (D-15 RPC CPF) correctly out of scope. Planner revision iteration 1 resolved 1 BLOCKER + 6 WARNINGS; iteration 2 VERIFICATION PASSED on all 11 dimensions. Next: `/gsd-execute-phase 3`.
Last activity: 2026-04-24 -- Phase 3 planning complete (commits: 1eeb2b6 research, e702f08 validation+patterns, dd5b2b3 plans, 7420254 revisions)

Progress: [######----] 61% of currently-defined plans (11/18) — Phase 1 (5/5) + Phase 2 (6/6) + Phase 3 (0/7). Phases 4/5 have TBD plan counts; milestone M1 advances with Phase 3 scope now locked at 7 plans.

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

Last session: 2026-04-24 (Phase 3 plan-phase)
Stopped at: **Phase 3 plans approved.** 7 PLAN.md files landed across 7 sequential waves (0→6). Wave structure:
  - W0 (03-01): jwt-decode install + Supabase Dashboard audit + 9 test stubs (autonomous: false — human checkpoint)
  - W1 (03-02): AuthError class + mapSupabaseError + 4 Zod schemas (passwordSchema extracted, cadastro re-wired)
  - W2 (03-03): extractRole (jwt-decode/D-13 Bug 1 fix) + rememberMeStorage adapter (D-19) + authStore surgical edit + client.ts
  - W3 (03-04): authService (move + expand: signIn/signOut/resend) + passwordService (requestPasswordReset/setNewPassword) + useRateLimitCooldown + useRecoverySession + useAuthFlowVariant + cadastro compat shim (SignUpError rename, Option A)
  - W4 (03-05): LoginCandidatoPage + LoginRHPage rewrite (D-14 Bug 2/3 fix — bounded polling 5×20ms for onAuthStateChange role race)
  - W5 (03-06): EsqueciSenhaPage + RedefinirSenhaPage rewrite + delete 5 obsolete services + orphan test enumeration
  - W6 (03-07): E2E login-flow + password-recovery + B10-lite (unconditional) + pitfall7.grep.test.ts + UAT runbook (autonomous: false)

Open planner resolutions (closed 8 UI-SPEC deferrals):
  1. D-19 storage swap: custom `rememberMeStorage` Storage adapter (option b) ← LOCKED
  2. D-20 JWT decode: `jwt-decode@^4.0.0` (13.9kB, zero deps) ← LOCKED
  3. authService location: MOVES to `src/features/auth/services/`, cadastro becomes compat shim re-exporting tryAutoLogin ← LOCKED
  4. passwordSchema: EXTRACTED to `src/features/auth/schemas/passwordSchema.ts`, cadastro imports ← LOCKED
  5. `?tipo=rh`: separate routes for Login pages, shared pages use `useAuthFlowVariant()` hook ← LOCKED
  6. Obsolete services: DELETE rateLimitService, userTypeDetectionService, passwordChangeConfirmationService, errorHandlingService, securityValidationService (+ orphan test enumeration) ← LOCKED
  7. Scaffold cleanup: factored into W4/W5 page rewrite tasks ← LOCKED
  8. `"Esqueci minha senha"` label: grep acceptance on both login pages ← LOCKED

Key planner insights to carry into execution:
  - `extractRetryAfterSeconds` CLAMPS at 3600 (not silent fallback to 60) — prevents UX/server desync on Supabase retry-after > 3600s (tests T2.14-T2.18 cover)
  - LoginRH role gate uses bounded polling (5 retries × 20ms, cap 100ms) on authStore.role — 0ms setTimeout is explicitly rejected in acceptance criteria (macrotask race under React Concurrent)
  - B10 E2E downgrade to test.fixme only for full deeplink path; B10-lite (localStorage pre-seed via addInitScript) runs unconditionally
  - Pitfall 7 redaction enforced via grep acceptance on every auth service/hook/util + dedicated `pitfall7.grep.test.ts` Vitest guard in W6
  - Cadastro authService compat shim renames OLD AuthError → SignUpError (Option A); Phase 2 cadastroService.ts + 2 test files explicitly added to 03-04 files_modified

Resume file: .planning/phases/03-login-recuperacao-senha/03-01-PLAN.md
Next: run `/gsd-execute-phase 3` to begin execution at Wave 0 (03-01 install + Dashboard audit checkpoint).
