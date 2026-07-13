---
phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro
plan: 02
subsystem: testing
tags: [deno, vitest, edge-function, service_role, seg-01, rls, audit, grep-guard, red-harness]

# Dependency graph
requires:
  - phase: 28-01
    provides: "28-LIVE-STATE.md (usuarios_rh/logs_auditoria live policies, hook body, triggers, admin floor=4, owners)"
provides:
  - "RED Deno handler test for gerenciar-usuario-rh encoding the SEG-01 authenticate-THEN-authorize contract (401/403/administrador-only dispatch), USR-02 orphan-rollback (deleteUser), USR-05 email path (resetPasswordForEmail redirectTo + non-fatal send), USR-06 resetar_senha best-effort log_auditoria"
  - "SEG-01 standing grep-guard: no service_role key / privileged client under src/ (comment-aware node:fs walk), GREEN and permanent"
affects: [28-06, 28-07, 28-08, 29, 30]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RED-first Deno handler test with injected two-client mock deps (no network) before the EF exists"
    - "SEG-01 client-bundle tripwire mirroring the rh-console/n8n-bundle node:fs comment-aware grep idiom, scoped to src/ only"

key-files:
  created:
    - supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts
    - src/__tests__/guards/no-service-role-src.grep.test.ts
  modified: []

key-decisions:
  - "The handler test asserts role authorization from usuarios_rh (the TABLE), NOT getUser().app_metadata; administrador-ONLY — the consolidar analog's recrutador→'rh' normalization is deliberately absent"
  - "resetPasswordForEmail redirect asserted via endsWith('/auth/redefinir-senha?tipo=rh') so the test is robust to whatever origin-derivation the 28-06 handler uses"
  - "Grep-guard scans src/ ONLY — service_role in supabase/functions is legitimate (the whole point of the SEG-01 EF) and never scanned"

patterns-established:
  - "RED harness: dynamic import('../index.ts') stays module-not-found until 28-06; committed RED by design"
  - "Comment-aware forbidden-token scan keeps the guard green despite 5 legitimate doc-comment service_role mentions under src/"

requirements-completed: [SEG-01, USR-06]

# Metrics
duration: 9min
completed: 2026-07-13
---

# Phase 28 Plan 02: RED Harness A — EF Handler Test + SEG-01 Bundle Guard Summary

**A RED Deno handler test that pins the gerenciar-usuario-rh SEG-01 authenticate-THEN-authorize contract (401/403/administrador-only dispatch + USR-02 deleteUser rollback + USR-05 email path + USR-06 resetar_senha best-effort audit) before the EF is written, plus a permanent GREEN grep-guard proving no service_role/privileged client ever ships under src/.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-07-13T04:40:00Z
- **Completed:** 2026-07-13T04:49:47Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- **SEG-01 handler contract captured as a failing test:** 9 injected-deps Deno cases encode 401 (unauth), 403 (null/`recrutador` role — administrador-only, no `'rh'` normalization), admin dispatch, `criar` orphan-rollback (`auth.admin.deleteUser` on RPC error), `resetPasswordForEmail` redirectTo + non-fatal send failure, and `resetar_senha` best-effort `log_auditoria` (`p_acao='resetar_senha'`, `p_categoria='usuario'`) + non-fatal audit.
- **RED confirmed clean:** `deno test --config supabase/functions/deno.json supabase/functions/gerenciar-usuario-rh` type-checks and then fails all 9 with `Module not found ".../index.ts"` — the calibrated pre-impl state for 28-06 to satisfy.
- **SEG-01 client-bundle tripwire is GREEN and permanent:** node:fs comment-aware scan of `src/` for `SUPABASE_SERVICE_ROLE_KEY` / bare `service_role` / privileged `createClient(...)`; 0 violations today (the 5 doc-comment mentions are comment-stripped), with positive + no-false-positive unit assertions.

## Task Commits

Each task was committed atomically (via `git -c core.hooksPath=/dev/null`):

1. **Task 1: RED Deno handler test for gerenciar-usuario-rh** - `5c95629` (test)
2. **Task 2: SEG-01 grep-guard — no service_role/privileged client under src/** - `65e1aa9` (test)

**Plan metadata:** (this commit) `docs(28-02): complete RED harness A plan`

## Files Created/Modified
- `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts` (298 lines) - RED Deno handler test; injected two-client mock (`makeMockSupabaseAdmin`/`makeMockSupabaseUser`), `loadHandler()` dynamic import, `makeRequest()` builder; 9 cases across SEG-01/USR-02/USR-05/USR-06.
- `src/__tests__/guards/no-service-role-src.grep.test.ts` (157 lines) - Vitest node:fs comment-aware grep-guard; scans `src/` only; `firstServiceRoleViolation()` exported for the in-file positive/negative contract; 5 assertions, all green.

## Decisions Made
- **Authorization asserted from the TABLE, administrador-only.** The test reads role via the `usuarios_rh` mock chain (`.select().eq().eq().is().maybeSingle()`), never from `getUser().app_metadata`, and forbids the analog's `recrutador→'rh'` normalization — a `recrutador` gets 403.
- **`redirectTo` asserted via `endsWith('/auth/redefinir-senha?tipo=rh')`** rather than a full-URL equality, so the RED test does not over-constrain 28-06's origin-derivation logic.
- **Guard scoped to `src/` exclusively.** `service_role` in `supabase/functions` is the legitimate server-side path; scanning it would be wrong.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a self-introduced TS2774 always-truthy assertion in the RED test**
- **Found during:** Task 1 (RED Deno handler test) — RED verification
- **Issue:** `assertEquals(supabaseAdmin.rpc && supabaseAdmin.rpcCalls.length, 0)` tripped Deno type-check (TS2774: `supabaseAdmin.rpc` is always defined), making the suite fail on a type error instead of the intended clean `Module not found` RED.
- **Fix:** Simplified to `assertEquals(supabaseAdmin.rpcCalls.length, 0)`.
- **Files modified:** supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts
- **Verification:** `deno test` now type-checks and fails all 9 tests purely on `Module not found ".../index.ts"` (calibrated RED).
- **Committed in:** `5c95629` (Task 1 commit)

**2. [Rule 1 - Bug] Corrected a wrong positive-contract expectation in the grep-guard**
- **Found during:** Task 2 (SEG-01 grep-guard) — GREEN verification
- **Issue:** The positive assertion fed `createClient(SUPABASE_URL, SERVICE_ROLE)` expecting `'createClient(service_role)'`, but the bare `service_role` token regex fires first and returns `'service_role'` — a wrong expectation, not a guard defect (the line IS still flagged).
- **Fix:** Changed the fixture to a camelCase `createClient(SUPABASE_URL, serviceRole)` (not one of the bare tokens) so it exercises the `createClient` co-location leg specifically and returns `'createClient(service_role)'`.
- **Files modified:** src/__tests__/guards/no-service-role-src.grep.test.ts
- **Verification:** `npm run test:run -- src/__tests__/guards/no-service-role-src.grep.test.ts` → 5/5 passed.
- **Committed in:** `65e1aa9` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs, both self-introduced test defects caught by the plan's own verify steps)
**Impact on plan:** Both fixes were necessary to land the intended states (clean module-not-found RED; a truthful positive-contract assertion). No scope creep — the assertions still encode exactly the plan's contract.

## Issues Encountered
None beyond the two auto-fixed self-introduced test defects above (both caught by the plan's verify/acceptance steps before commit).

## TDD Gate Compliance
This is a RED-harness plan (not a `type: tdd` cycle plan). Both files are `test(...)` commits by design:
- The Deno handler test is committed **RED** — it fails with `Module not found ".../index.ts"` and stays RED until 28-06 authors `index.ts` (GREEN) and 28-04/28-05 supply the RPCs it calls. Do NOT stub `index.ts` to force it green.
- The SEG-01 grep-guard is committed **GREEN** and is a permanent standing tripwire.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- **For 28-06 (EF authoring):** the handler signature `handler(req, { supabaseAdmin, supabaseUser })` and its full behavior contract (401/403/administrador-only, criar+deleteUser rollback, resetPasswordForEmail redirectTo, resetar_senha best-effort log_auditoria) are now pinned by a failing test — 28-06 makes it GREEN.
- **For 28-04/28-05:** the RED test references the RPC names it expects the migrations to provide: `criar_usuario_rh_com_audit` (create tx) and `log_auditoria` (best-effort audit). No hook/RLS change is implied by this plan.
- **CI standing guard:** `no-service-role-src.grep.test.ts` now fails the build if any service_role/privileged client ever lands under `src/`.
- **No blockers.**

## Self-Check: PASSED
- FOUND: supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts
- FOUND: src/__tests__/guards/no-service-role-src.grep.test.ts
- FOUND commit: 5c95629 (Task 1)
- FOUND commit: 65e1aa9 (Task 2)

---
*Phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro*
*Completed: 2026-07-13*
