# Phase 13 — Deferred Items (out of scope)

Discovered during plan execution; NOT fixed (SCOPE BOUNDARY — only auto-fix issues
directly caused by the current plan's changes).

## DI-13-01 — Pre-existing deno type-check error in strict-schema.test.ts

- **File:** `supabase/functions/_shared/__tests__/strict-schema.test.ts:88`
- **Error:** `TS7053 — Element implicitly has an 'any' type because expression of type
  '"cpf" | "foto" | "estado_civil" | "saude"' can't be used to index type {...}`
- **Origin:** Phase 8 (`1ea5bc3` — test(08-01) RED scaffolds), untouched by Plan 13-02.
- **Impact:** `deno test supabase/functions/` (suite-wide, with default type-check) fails
  on this one file. Per-file deno tests for the Phase-13 EF + schemas all pass GREEN
  (24/24). The error does NOT affect runtime — `deno test --no-check` runs the file fine.
- **Disposition:** Deferred. Not in Plan 13-02's `files_modified`. A one-line index-key
  cast (`(payloadWithForbiddenKey as Record<string, unknown>)[forbiddenKey]`) would close
  it, but that touches a Phase-8 file outside this plan's scope.
- **Discovered:** Plan 13-02, Task 3 (full-suite deno run).

## DI-13-02 — Plan 13-05 RH-queue RED scaffolds fail under `vitest run` (whole-suite)

- **Files:** `src/features/triagem/components/__tests__/RedacaoOverrideForm.test.tsx`,
  `src/features/triagem/components/__tests__/RedacaoSidebar.test.tsx`
- **Error:** Cannot find module — `RedacaoOverrideForm` / `RedacaoSidebar` do not exist yet.
- **Origin:** Plan 13-01 (`3364b8d` — Wave-0 RED scaffolds). These are the **RH human-review
  queue** surfaces, authored in **Plan 13-05**. They are calibrated RED until 13-05 lands.
- **Impact:** A whole-suite `vitest run` reports 2 failing *files* (0 failing tests — they
  fail at module-resolution, not assertion). Plan 13-03's own surface (the candidate essay
  layer) is GREEN: redacaoService 4/4 + redacao-contract 5/5 + RedacaoCounter 3/3 = 12/12.
- **Disposition:** Deferred to Plan 13-05 (RH review queue) — NOT in Plan 13-03's scope
  (this plan owns only the candidate essay layer; the RH queue is a separate wave).
- **Discovered:** Plan 13-03, full-suite regression check.

## DI-13-03 — `essay-schemas.test.ts` (Deno EF test) fails under `vitest run`

- **File:** `supabase/functions/_shared/__tests__/essay-schemas.test.ts`
- **Error:** The EF schema imports `npm:zod@3.25.76/v4` (a Deno specifier); Vitest runs under
  Node/Vite and has no resolver for `npm:` → the file fails at module resolution under
  `vitest run`. It passes under `deno test` (Plan 13-01/13-02 ran it GREEN 16/16).
- **Origin:** Plan 13-01 (`3af37d8` — EssayScoringV1 schema + GREEN deno test).
- **Disposition:** Deferred / expected — Deno EF tests are run via `deno test`, not Vitest
  (precedent: `strict-schema.test.ts`, DI-13-01). Not caused by Plan 13-03.
- **Discovered:** Plan 13-03, full-suite regression check.
