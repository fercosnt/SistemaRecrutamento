# Phase 2 — Deferred Items (out-of-scope for current plan)

This file logs out-of-scope issues discovered during plan execution. Items here
are NOT fixed in the current plan — they're tracked for the appropriate
downstream plan.

## From Plan 02-04 (hook-level D-10/D-13/D-14)

### Pre-existing TypeScript errors outside hook scope

- **`src/features/cadastro/hooks/useFormToast.ts` L221** — `TS2559: Type '"Alguns
  campos contêm erros ou estão vazios"' has no properties in common with type
  'ToastOptions'`. Pre-existing since commit d551d00 (Task 7 Visual Feedback,
  pre-Phase 1). Not touched by 02-04. **Owner:** whoever re-touches toast copy.

- **Bulk errors in `src/features/vagas/`, `src/components/pages/`, `src/App.tsx`**
  — Pre-existing Phase 1 carryover (documented in
  `.planning/phases/01-foundation-saneada/KNOWN-ISSUES-CARRYOVER-PHASE-3.md`).
  Plan 02-04 T5 acceptance criterion explicitly filters these out via
  `grep -v 'src/features/vagas'`.

### Pre-existing service test failures (26 total)

- **`src/features/cadastro/services/__tests__/duplicateCheckService.test.ts`** —
  10 failures. Tests assert the legacy `supabase.from('candidatos').select()`
  anon-SELECT path, but the service was migrated to `supabase.rpc(
  'check_candidato_duplicate', ...)` in Phase 1 commit b9361369 (01-04) and
  then in Wave 1 (commit ff19c21) the RPC contract was extended with
  `rate_limited`. **Owner: Plan 02-05** (service layer patch rewrites these
  tests to mock `rpc` and assert the new `CheckCandidatoDuplicateResponse` shape
  per 02-PATTERNS.md § duplicateCheckService.test.ts PATCH).

- **`src/features/cadastro/services/__tests__/cadastroService.test.ts`** — 16
  failures. Tests assert legacy error codes (`AUTH_FAILED`, `INSERT_FAILED`,
  `ROLLBACK_FAILED`, `VALIDATION_ERROR`) that were removed from the service in
  Phase 1 commit fda6de81 (refactor through Edge Function). **Owner: Plan 02-05**
  (per 02-PATTERNS.md § cadastroService.test.ts PATCH: extend suite with new
  error_code cases `EMAIL_EXISTS`, `CPF_EXISTS`, `VALIDATION`, `SERVER_ERROR`).

These 26 failures pre-exist Wave 2 and are NOT a regression from Plan 02-04.
Plan 02-04 T5's "Expect: exits 0" line was written assuming Plan 02-01 scaffolds
were still `.todo` stubs, but they were actually populated with the OLD
behavior — which broke during Phase 1 service refactors. The fix belongs to
02-05.

## From Plan 02-05 (services stream D-02/D-05/D-06/D-07/D-12)

### Pre-existing LoadingProgress component test failure

- **`src/features/cadastro/components/__tests__/LoadingProgress.test.tsx`** —
  1 failure: `"não deve exibir mensagem de erro quando errorMessage ausente"`.
  Assertion `expect(errorMessages.length).toBeLessThanOrEqual(1)` receives 2.
  Verified pre-existing via `git checkout 7362935 -- src/features/cadastro/services/` +
  rerun: same 1/13 failure on that checkout. Not caused by Plan 02-05
  (services stream only touched `services/` tree). **Owner:** whoever
  re-touches `LoadingProgress.tsx` (Plan 02-06 rewiring CadastroMultiStepForm
  will deprecate `LoadingProgress` per UI-SPEC § deprecation — test may
  become obsolete with the deprecation).

## Phase 1 Carryover (not discovered during 02-04)

See `.planning/phases/01-foundation-saneada/KNOWN-ISSUES-CARRYOVER-PHASE-3.md`.
