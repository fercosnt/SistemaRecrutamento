# Phase 18 — Deferred Items (out-of-scope discoveries during execution)

These items were discovered during plan execution but are OUTSIDE the scope of the
task that found them. Logged here per the executor SCOPE BOUNDARY rule — NOT fixed.

## From 18-02 (RESIL-02 bigfive parallelization)

- **Vitest tries to load 2 Deno EF tests not in the `vite.config.ts` exclude list.**
  `npm run test:run` reports 3 failed *suites* (0 failed tests) because Vitest's
  `include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']` matches Deno test files that
  use `https://deno.land` / `npm:` specifiers the Node ESM loader cannot resolve.
  - `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` — added in
    commit `350e994` (FIX-01 work); NOT in the exclude list. **Pre-existing.**
  - `supabase/functions/_shared/__tests__/essay-schemas.test.ts` — added in commit
    `3af37d8` (Phase 13); NOT in the exclude list. **Pre-existing.**
  - (The third, `gerar-devolutiva-bigfive`, was a regression introduced by 18-02's
    move into `__tests__/` and was FIXED in 18-02 by adding it to the exclude list.)
  - **Fix when in scope:** add both paths to the `vite.config.ts` `test.exclude`
    array (same one-line pattern used for the other EF tests). Likely a good fit for
    Plan 18-07 (deploy/cleanup) or a dedicated FIX-01-regression-test plan, since
    FIX-01's Deno test is the one consolidar suite that should run under `deno test`.
