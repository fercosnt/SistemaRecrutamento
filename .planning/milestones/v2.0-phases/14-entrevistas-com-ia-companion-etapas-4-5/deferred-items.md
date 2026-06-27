# Phase 14 — Deferred Items

> Out-of-scope discoveries logged during execution (per SCOPE BOUNDARY rule).
> NOT fixed in the discovering plan.

## From Plan 14-01

- **`supabase/functions/_shared/__tests__/essay-schemas.test.ts` fails under the full `npm run test:run`.**
  - **Discovered during:** 14-01 full-suite verification.
  - **Cause:** this is a Phase-13 Deno test (commit `3af37d8`) that imports `deno.land/std` + uses `Deno.test`. It lives under `_shared/__tests__/` so Vitest's `include` (`**/__tests__/**/*.test.ts`) picks it up, but vite.config.ts's `exclude` list does NOT name it (the other deno EF tests ARE excluded by path). It runs GREEN under `deno test` — it only fails under Vitest because of the runtime mismatch.
  - **Why deferred:** pre-existing (Phase 13), not touched by Plan 14-01, unrelated to this plan's files. Per the SCOPE BOUNDARY rule, out of scope.
  - **Suggested fix (future):** add `'supabase/functions/_shared/__tests__/essay-schemas.test.ts'` (or `'supabase/functions/_shared/__tests__/**'`) to the vite.config.ts `test.exclude` array, mirroring the existing per-EF deno-test excludes.
