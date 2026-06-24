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
