# Phase 15 — Deferred Items

Out-of-scope discoveries logged during plan execution (NOT fixed — they belong to other plans / harnesses).

## From Plan 15-03 (2026-06-26)

- **`supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` fails to collect under vitest** — it is a **Deno** EF test (authored in 15-02), meant to run via `deno test`, not vitest's Node env. Out of scope for 15-03 (a different plan + a different test harness). The Deno suite runs in 15-06 / the Deno CI step.
- **`supabase/functions/_shared/__tests__/essay-schemas.test.ts` fails to collect under vitest** — another Deno shared test (Phase 11/13). Same reason: Deno harness, not vitest.
- **`src/features/admin/bias-audit/__tests__/biasMath.test.ts` fails to collect** — a **Plan 15-05** Wave-0 RED scaffold (`../biasMath` is not authored yet — that is 15-05's job). Expected RED until 15-05 lands `biasMath.ts`.

All three are pre-existing collection failures unrelated to `src/features/decisao`; none are in this plan's commits. Plan 15-03's own tests (consolidacaoContract, decisaoService, RegistrarDecisaoForm, forbidden-strings) are all GREEN.
