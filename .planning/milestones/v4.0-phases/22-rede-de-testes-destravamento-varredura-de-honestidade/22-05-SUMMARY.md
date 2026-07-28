---
phase: 22-rede-de-testes-destravamento-varredura-de-honestidade
plan: 05
subsystem: testing
tags: [e2e, playwright, credentials, ci-guard, vitest, lgpd, secrets-hygiene]

# Dependency graph
requires:
  - phase: 22 (Plan 22-04)
    provides: forbidden-strings.grep.test.ts guard precedent (grep-guard structure reused)
provides:
  - "e2e specs + fixtures read test credentials from env-only (skip-if-unset), no hardcoded fallbacks"
  - "keys-only .env.test.example documenting all required test-credential keys (no values)"
  - "no-hardcoded-test-creds.grep.test.ts CI guard blocking credential regressions under e2e/"
affects: [phase-22 (22-06 tsconfig e2e coverage), phase-24 (SEC hardening), any future e2e spec]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Env-only test credentials with skip-if-unset gating (describeRealAuth / E2E_REAL_LOGIN / per-test test.skip)"
    - "Split Tier-1 mock values (deterministic, in-repo) from Tier-2 real creds (env-only) so unconditional mock tests never dereference unset env"
    - "grep-guard scanning e2e/ for banned real-credential literals (mirrors forbidden-strings.grep.test.ts)"

key-files:
  created:
    - "src/__tests__/guards/no-hardcoded-test-creds.grep.test.ts"
  modified:
    - ".env.test.example"
    - "e2e/login-flow.spec.ts"
    - "e2e/vagas-browse.spec.ts"
    - "e2e/auth-hydration.spec.ts"
    - "e2e/navegacao.spec.ts"
    - "e2e/explicacao-flow.spec.ts"
    - "e2e/candidatura-submit.spec.ts"
    - "e2e/perfil.spec.ts"
    - "e2e/prova-cognitiva.spec.ts"
    - "e2e/password-recovery-flow.spec.ts"
    - "e2e/fixtures/a11y-session.ts"
    - "e2e/README.md"

key-decisions:
  - "Guard bans specific real-account literals (fernando/teste123 + current .env.test accounts), NOT the @beautysmile.com.br / @teste.com domains broadly — avoids false-flagging the legitimate mocked (a11y@), dynamic (test+<ts>@), and negative-path (invalido@teste.com) emails"
  - "perfil.spec.ts PERF-01 (unconditional Tier-1 mock) uses a new MOCK_USER constant, reserving env-only TEST_USER for the E2E_REAL_LOGIN-gated PERF-02 — stripping the fallback wholesale would have broken the CI mock test"

patterns-established:
  - "Env-only test creds + skip-if-unset (no hardcoded fallback)"
  - "grep-guard permanently blocks a banned literal class from returning under a tree"

requirements-completed: [CI-08]

# Metrics
duration: 14min
completed: 2026-07-05
---

# Phase 22 Plan 05: Test-Credential Hygiene (CI-08) Summary

**Every real test-account credential removed from e2e/ — specs read env vars with skip-if-unset, `.env.test.example` documents keys value-free, and a new `no-hardcoded-test-creds` CI guard permanently blocks any credential literal from returning.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-07-05T21:36Z (after 22-04)
- **Completed:** 2026-07-05T21:50Z
- **Tasks:** 2
- **Files modified:** 13 (12 modified + 1 created)

## Accomplishments
- Stripped `|| 'fernando@beautysmile.com.br'` / `'teste123'` fallbacks from 9 specs + 1 fixture; `TEST_USER`/`TEST_ADMIN` now read `process.env.X!`, gated by `describeRealAuth` / `E2E_REAL_LOGIN` / per-test `test.skip` so nothing is dereferenced in the default (all-skipped) run.
- Rewrote `.env.test.example` to document all required keys (candidato, admin, gating, supabase) with value-free placeholders — `grep -cE "fernando@beautysmile|teste123" .env.test.example` == 0.
- Added `src/__tests__/guards/no-hardcoded-test-creds.grep.test.ts` (15 assertions): whole-scan + 6 banned-literal regex proofs + 6 allowed-literal (no-false-positive) proofs + scan-reach + README-coverage locks.
- Scrubbed the stale creds from `e2e/README.md` → key references + pointer to `.env.test.example`. `.env.test` untouched and still gitignored.

## Task Commits

Each task was committed atomically (husky bypass via `git -c core.hooksPath=/dev/null`, documented project convention):

1. **Task 1: Strip hardcoded credential fallbacks from specs, fixtures, and README** — `d13f51a` (refactor)
2. **Task 2: Rewrite .env.test.example (keys only) + add the no-hardcoded-creds guard** — `93cf7a7` (test)

**Plan metadata:** _(this commit)_ (docs: complete plan)

## Files Created/Modified
- `src/__tests__/guards/no-hardcoded-test-creds.grep.test.ts` — CREATED. Recursive grep guard scanning `e2e/` (`.ts/.tsx/.md`) for real-account credential literals; rides the existing `unit` job via `npm run test:run`.
- `.env.test.example` — Rewritten keys-only: candidato `TEST_USER_*`, admin `TEST_ADMIN_*`, gating `E2E_AUTH_TEST_USERS`/`E2E_CANDIDATURA_ID`/`E2E_VAGA_ID`, supabase `TEST_SUPABASE_*` + `VITE_SUPABASE_*`. All values are empty placeholders.
- `e2e/login-flow.spec.ts` — `TEST_USER` env-only; the two form-validation `fill('teste123')` sites → neutral `'SenhaValida1'`.
- `e2e/{vagas-browse,auth-hydration,navegacao,explicacao-flow,candidatura-submit,prova-cognitiva,password-recovery-flow}.spec.ts` — `TEST_USER`/`TEST_ADMIN` env-only (no fallback); auth-hydration SC-2 gained a `TEST_USER_EMAIL` skip.
- `e2e/perfil.spec.ts` — Split `MOCK_USER` (Tier-1 deterministic mock) from env-only `TEST_USER` (Tier-2).
- `e2e/fixtures/a11y-session.ts` — Neutral `'mock-password-123'` fill value (login fully intercepted by `mockSession`, not a real credential).
- `e2e/README.md` — Credentials section rewritten to key references + `.env.test.example` pointer.

## Decisions Made
- **Ban specific real-account literals, not whole domains.** The guard's `HARDCODED_CREDS` regex anchors on the specific real accounts (`fernando@beautysmile`, `teste123`, `Candidato@2026`, `E2eAdmin`, `candidato.funil@teste.com`, `e2e.admin@beautysmile.com.br`). A broad `@beautysmile.com.br` / `@teste.com` ban would have flagged the legitimate mocked (`a11y@beautysmile.com.br`), dynamic (`test+<ts>@beautysmile.com.br`), and negative-path (`invalido@teste.com`, `teste@teste.com`) emails. The banned set covers both the legacy and current `.env.test` generations, so a paste of either is caught. Allowed-literal sub-tests lock the no-false-positive contract.
- **MOCK_USER split in perfil.spec.ts.** PERF-01 (Tier-1) runs unconditionally in CI and mocks the token endpoint, so its email/password are form-fill strings, not credentials. Stripping the fallback to `process.env.TEST_USER_EMAIL!` would have made the unconditional test fill `undefined` in CI. A dedicated `MOCK_USER` keeps PERF-01 deterministic while `TEST_USER` becomes env-only for the gated PERF-02.

## Deviations from Plan

None — plan executed exactly as written. (The MOCK_USER split and the neutral form-validation fill values are the mechanical realization of Task 1's "keep negative-path / mocked literals working while removing real creds"; the guard's specific-literal scoping is the mechanical realization of Task 2's "NOT flagging the intentional negative literals".)

## Issues Encountered
- **perfil.spec.ts double-duty constant.** The single `TEST_USER` served both the unconditional Tier-1 mock (PERF-01) and the gated Tier-2 real login (PERF-02). Resolved by introducing `MOCK_USER` for the mock path so the env-only strip could not break CI. No other spec had this coupling (all other TEST_USER reads are behind describeRealAuth or E2E_REAL_LOGIN).

## User Setup Required
None — no external service configuration required. (Anyone running the real-auth E2E battery locally populates `.env.test` from the documented `.env.test.example` keys; the real-auth suites stay OFF by default in CI, so absence does not break the pipeline.)

## Next Phase Readiness
- Wave 1 of Phase 22 is complete (22-01..22-05). Plan **22-06** (tsconfig `paths` + e2e/scripts coverage + Deno CI job + measured tsc baseline pin) is unblocked. Note for 22-06: adding `e2e/` to the tsconfig `include` will now type-check these specs — the `process.env.X!` non-null assertions are intentional and type-clean (`(string|undefined) || string!` yields `string`).
- Gates green: full Vitest **721/721** (incl. new guard 15/15), tsc **257 flat**, `.env.test` gitignored + untouched.

---
*Phase: 22-rede-de-testes-destravamento-varredura-de-honestidade*
*Completed: 2026-07-05*

## Self-Check: PASSED
- FOUND: `.env.test.example`
- FOUND: `src/__tests__/guards/no-hardcoded-test-creds.grep.test.ts`
- FOUND: `e2e/README.md`
- FOUND commit: `d13f51a` (Task 1)
- FOUND commit: `93cf7a7` (Task 2)
