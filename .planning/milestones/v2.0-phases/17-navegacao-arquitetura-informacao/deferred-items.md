# Phase 17 — Deferred / Out-of-Scope Items

Discoveries logged during execution that are NOT in the current plan's scope. Not fixed here
(SCOPE BOUNDARY — only auto-fix issues directly caused by the current task's changes).

## From 17-03 (RH funnel wiring)

### 1. `supabase/functions/*` Deno tests fail under Vitest (PRE-EXISTING, out of scope)
- **Files:** `supabase/functions/_shared/__tests__/essay-schemas.test.ts`,
  `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts`
- **Cause:** these are **Deno** tests (import from `https://` URLs); the Vitest Node ESM
  loader cannot resolve `https:` schemes → `Error: Only URLs with a scheme in: file and data
  are supported by the default ESM loader. Received protocol 'https:'`. They are meant to run
  under `deno test`, not `npm run test:run`.
- **Why deferred:** pre-existing infra mismatch, unrelated to the client-side `src/` changes of
  17-03. Not introduced by this plan; no `supabase/functions/*` file was touched.

### 2. `legacy-routes.grep.test.ts` is RED by design until 17-05 (Wave 3, EXPECTED)
- **File:** `src/__tests__/guards/legacy-routes.grep.test.ts`
- **Cause:** the 17-01 calibrated RED guard asserts the 12 confirmed-dead legacy components
  (TesteBigFive/DISC/Raven + Instrucoes* + ConclusaoTestes + Questionario* + Inscricao +
  GlassShowcase + VagaLPPage.tsx file presence) are removed. The test names literally read
  "RED até 17-05 remover import + rota".
- **Why deferred:** legacy deletion is **Wave 3 / Plan 17-05** scope (D-12), explicitly NOT
  17-03. These flip GREEN when 17-05 lands.
