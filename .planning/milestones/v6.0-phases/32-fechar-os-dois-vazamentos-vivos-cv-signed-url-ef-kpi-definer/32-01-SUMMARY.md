---
phase: 32-fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer
plan: 01
subsystem: testing
tags: [deno, vitest, plpgsql, rls, storage, security, red-harness, jwt-impersonation, security-gate]

# Dependency graph
requires:
  - phase: 24
    provides: WR-04 vaga-scoped RLS predicate + JWT-impersonated behavioral smoke idiom (above structural pg_policies)
  - phase: 10
    provides: two-client authorize-THEN-authenticate EF skeleton (comparativo-candidatos)
  - phase: 27
    provides: submit-candidatura deno EF unit-test harness (loadHandler + makeChainable)
provides:
  - "RED acceptance harness for Phase 32: deno EF unit test (5 branches) targeting the not-yet-authored get-curriculo-url"
  - "seg32_smokes.sql — JWT-impersonated behavioral smoke, assertions (a)-(e), disposable fixed-UUID fixture, ROLLBACK-free cleanup"
  - "no-service-role-src guard extended with a curriculos-scoped client-createSignedUrl tripwire (firstCurriculosSignViolation)"
  - "cvUploadService.test.ts getSignedUrl block re-pointed at functions.invoke('get-curriculo-url')"
affects: [32-02, 32-03, 32-04, get-curriculo-url, funil_kpis, rh_le_historico, curriculos-bucket]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RED-first acceptance harness: every test fails for a KNOWN, intended reason before any implementation exists"
    - "Direct storage.objects RLS assertion (deny/allow) as the behavioral proof of a bucket-policy change — not a candidaturas/vagas reconstruction, not the EF (service_role bypasses RLS)"
    - "Hybrid smoke fixture: real discovered candidato (FK-bound) + synthetic recruiters (vagas.created_by has no FK) for deterministic vaga-scope assertions"

key-files:
  created:
    - supabase/functions/get-curriculo-url/index.test.ts
    - supabase/tests/seg32_smokes.sql
  modified:
    - src/__tests__/guards/no-service-role-src.grep.test.ts
    - src/features/vagas/services/__tests__/cvUploadService.test.ts

key-decisions:
  - "seg32 fixture uses synthetic recruiter UUIDs (vagas.created_by has no FK — Relationships:[]) so funil_kpis/rh_le_historico assertions are deterministic (recruiter A owns ONLY the empty vagaA), while the CV owner is a real discovered candidato (candidatos.user_id / candidaturas.candidato_id FK real rows)"
  - "T3.1/T3.2 RED is a TypeError pinned to cvUploadService.ts:195 (the exact client-signing line 32-02 removes) — the service still reaches createSignedUrl, so mockInvoke is never called; this is a right-reason RED, not a syntax error"
  - "Pitfall-7 redaction guard (T5.1) kept deterministically GREEN — redaction is an always-on invariant, not one of the intended-RED getSignedUrl contract surfaces; both signing paths stubbed with the SECRET token"
  - "curriculos createSignedUrl tripwire scoped by same-line co-location so the legitimate avatar-bucket signer (perfilRhService, .from(AVATAR_BUCKET) on a separate line) is not flagged"

patterns-established:
  - "Behavioral DB smoke is the load-bearing gate: assertion (a) reads storage.objects directly under recruiter-A rh JWT (0 rows) vs owning candidate JWT (1 row)"
  - "deno EF test imports the future handler via loadHandler(); module-not-found IS the intended RED until the EF is authored"

requirements-completed: []  # RED-first harness only — SEG-01/SEG-02 are CLOSED (marked complete) when 32-04 applies the migrations + deploys the EF and seg32_smokes.sql runs GREEN. This plan authors the acceptance tests; it does not satisfy the requirements.

# Metrics
duration: 8min
completed: 2026-07-15
---

# Phase 32 Plan 01: Phase 32 Acceptance Harness (RED-first) Summary

**Authored the complete Phase 32 acceptance harness in a documented RED state — a deno EF unit test (5 authorize-THEN-authenticate branches), a JWT-impersonated `seg32_smokes.sql` (assertions a-e with a direct `storage.objects` deny/allow proof), an extended bundle guard tripwire, and a re-pointed `cvUploadService.getSignedUrl` test — so 32-02/03/04 build against a fixed, load-bearing behavioral contract.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-15T04:39:17Z
- **Completed:** 2026-07-15T04:46:41Z
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- **deno EF unit test** (`get-curriculo-url/index.test.ts`) — 5 branches: 401 (no session) / 403-role (candidato) / 403-owner (cross-recruiter rh) / 404 (NULL curriculo_url) / 200 (owner rh + administrador-bypass, asserting admin never reads `vagas`). This is the authoritative cross-recruiter 403 gate (no `role='recrutador'` PROD account exists for a live curl — RESEARCH Pitfall 6). Deno `Check` compiles clean; all 6 tests fail with "Module not found …index.ts" — the intended RED.
- **`seg32_smokes.sql`** — 8 `PASS` notices across assertions (a)-(e) over a disposable fixed-UUID fixture (real discovered candidato + 2 synthetic recruiters owning distinct vagas + 1 candidatura on vagaB + 3 historico rows for a median + a `curriculos` `storage.objects` row). Assertion (a) is the load-bearing SEG-01 proof: a DIRECT `SELECT count(*) FROM storage.objects WHERE bucket_id='curriculos' AND name=<path>` — recruiter-A rh JWT → 0 rows, owning candidate → 1 row. ROLLBACK-free cleanup deletes only the fixture (storage → historico → candidatura → vagas).
- **Bundle guard extended** — `firstCurriculosSignViolation` tripwire: a client `createSignedUrl` co-located with `curriculos` cannot survive in `src/`. Scan case RED (catches `cvUploadService.ts:195`); positive/negative/comment-aware contract cases GREEN; the avatar-bucket signer is not flagged.
- **`cvUploadService.test.ts`** — `getSignedUrl` T3.1/T3.2 now assert `functions.invoke('get-curriculo-url', { body: { candidatura_id } })` and that the client never signs; Pitfall-7 redaction guard drives the invoke path and stays GREEN.

## Task Commits

1. **Task 1: deno EF unit test (RED — EF absent)** — `886d81c` (test)
2. **Task 2: seg32_smokes.sql behavioral smoke (authored, RED until 32-04)** — `900db4f` (test)
3. **Task 3: extend bundle guard + update cvUploadService test (RED until 32-02)** — `cbf9afc` (test)

_No TDD multi-commit: this plan authors tests only; there is no implementation to green here._

## Files Created/Modified

- `supabase/functions/get-curriculo-url/index.test.ts` (created) — deno unit test importing the future `handler` via `loadHandler()`; `makeMockSupabaseAdmin` routes `usuarios_rh`/`candidaturas`/`vagas` + stubs `storage.from('curriculos').createSignedUrl`; records `vagas` reads to prove admin ownership-bypass.
- `supabase/tests/seg32_smokes.sql` (created) — JWT-impersonated behavioral smoke; disposable fixture; assertions (a)-(e); ROLLBACK-free cleanup. Authored now, RUN in 32-04 after migrations apply + EF deploy.
- `src/__tests__/guards/no-service-role-src.grep.test.ts` (modified) — added `firstCurriculosSignViolation` + a new `describe` with the scan case (RED) and 3 contract cases (GREEN).
- `src/features/vagas/services/__tests__/cvUploadService.test.ts` (modified) — hoisted `mockInvoke` + `functions.invoke` on the client mock; rewrote the `getSignedUrl` block; updated the Pitfall-7 path.

## RED State — what turns each surface GREEN

This is a documented RED harness. Do NOT "fix" the RED by reverting — the RED is the deliverable.

| Surface | RED now (right reason) | Turns GREEN in |
|---------|------------------------|----------------|
| `get-curriculo-url/index.test.ts` (deno) | `./index.ts` does not exist → module-not-found on `await import()`; harness itself compiles (`Check` passes) | **32-02** authors `supabase/functions/get-curriculo-url/index.ts` (the exported `handler`, `import.meta.main`-guarded) |
| Guard scan `firstCurriculosSignViolation` | `cvUploadService.ts:195` still runs `supabase.storage.from('curriculos').createSignedUrl(path,…)` | **32-02** rewires `getSignedUrl` to `functions.invoke('get-curriculo-url', …)` |
| `cvUploadService.test.ts` T3.1/T3.2 | `getSignedUrl` still reaches the client-signing branch (TypeError pinned to line 195; `mockInvoke` never called) | **32-02** same rewire |
| `seg32_smokes.sql` (a)-(e) | `public.funil_kpis` absent; `curriculos` RH role-only branch + role-only `rh_le_historico` still live | **32-03** authors `funil_kpis` DEFINER + `rh_le_historico` WR-04; **32-04** applies Migration A/B via MCP + deploys the EF, then RUNs the smoke via `execute_sql` (every assertion → `NOTICE PASS`) |

Guard contract cases (positive/negative/comment-aware), the existing service_role scan, the Pitfall-7 redaction guard, and all non-`getSignedUrl` cvUploadService tests remain GREEN. `tsc --noEmit` holds at the 104 baseline (no production files touched).

## Decisions Made

- **Synthetic recruiters, real candidato (hybrid fixture).** `vagas.created_by` has no FK (`Relationships: []`), so synthetic fixed-UUID recruiters own only the disposable vagas — making assertions (b) `funil_kpis` vaga-scope and (c) `rh_le_historico` deny fully deterministic (recruiter A owns only the empty vagaA). The CV owner must be a real discovered candidato because `candidatos.user_id` / `candidaturas.candidato_id` FK real rows; its `user_id` doubles as the CV own-folder path and the positive-control impersonation `sub`.
- **T3.1/T3.2 RED as a TypeError pinned to line 195.** Not configuring `mockCreateSignedUrl` in those two tests makes the old `getSignedUrl` throw at the exact client-signing line 32-02 deletes — a right-reason RED that points at the code to remove. Configuring it would have made T3.2 falsely GREEN (old impl throws `UPLOAD_FAILED` for the wrong path).
- **Redaction guard stays GREEN.** T5.1 is defense-in-depth, not a contract surface; both signing paths are stubbed with the SECRET token so redaction is verified whichever path runs.

## Deviations from Plan

None - plan executed exactly as written. (One in-file cleanup during Task 2: removed a dead `jsonb_path_query` placeholder loop in assertion (d) before it could error at runtime in 32-04; the portable text-regex PII scan below it is the real check. Not a plan deviation — pre-commit correction within the same task.)

## Issues Encountered

None. The deno harness compiled on the first run (clean `Check`), the smoke passed all grep gates (8 `PASS` notices, impersonation idiom, direct `storage.objects` assertion), and the client tests produced exactly the 3 intended REDs with no collateral failures.

## User Setup Required

None - no external service configuration required. (Migration apply + EF deploy + running `seg32_smokes.sql` via MCP happen in 32-04.)

## Next Phase Readiness

- **32-02** (EF + client rewire + Migration A) has a fixed contract to build against: the deno test's 5 branches + the guard tripwire + the `getSignedUrl` invoke shape.
- **32-03** (funil_kpis DEFINER + rh_le_historico WR-04) has `seg32_smokes.sql` (b)/(c)/(d)/(e) as its acceptance spec.
- **32-04** applies Migration A/B via MCP `apply_migration`, deploys the EF (JWT-ON), reconciles `supabase_migrations.schema_migrations`, regenerates `database.types.ts` (repo ROOT), then RUNs `seg32_smokes.sql` via `execute_sql` as the load-bearing phase gate.
- No blockers. Ordering landmine reminder for 32-04 (RESEARCH Pitfall 1): deploy EF → rewire client → drop the Storage RH branch → run smokes.

## Self-Check: PASSED

- Files verified on disk: `get-curriculo-url/index.test.ts`, `seg32_smokes.sql`, `no-service-role-src.grep.test.ts`, `cvUploadService.test.ts`, `32-01-SUMMARY.md` — all FOUND.
- Commits verified: `886d81c`, `900db4f`, `cbf9afc` — all FOUND.

---
*Phase: 32-fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer*
*Completed: 2026-07-15*
