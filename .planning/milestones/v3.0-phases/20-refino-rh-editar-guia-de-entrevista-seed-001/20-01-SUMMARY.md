---
phase: 20-refino-rh-editar-guia-de-entrevista-seed-001
plan: 01
subsystem: entrevista (guia edit write-path)
tags: [migration, security-definer-rpc, dedup, upsert, deno-test, sql-smoke, RED-by-design]
requires:
  - public.entrevista_guias (Phase 14 table)
  - public.usuarios_rh (auth-hook role source)
  - public.candidaturas → public.vagas.created_by (ownership)
  - supabase/migrations/20260624000002_salvar_avaliacao_entrevista_rpc.sql (clone skeleton)
  - supabase/migrations/20260420000002_unified_auth_role.sql (the usuarios_rh filter)
provides:
  - save_entrevista_guia_edits(uuid, text, jsonb) RPC (SECURITY DEFINER, role-from-usuarios_rh)
  - entrevista_guias UNIQUE(candidatura_id, tipo) + updated_at column (authored, not applied)
  - SQL smoke script (DENY/OK/upsert/dedup/role-from-table) for 20-02 to execute against PROD
  - Deno merge-preserve invariant test (RED-by-design until 20-04)
affects:
  - 20-02 (applies migration + runs the smoke via MCP)
  - 20-03 (service saveGuiaEdits calls this RPC)
  - 20-04 (EF merge turns the Deno test green)
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER RPC with role-from-usuarios_rh (NOT the JWT claim) — the ENTREV-08 deviation"
    - "dedup → updated_at → UNIQUE → CREATE FUNCTION (load-bearing statement order)"
    - "RED-by-design Deno test via injected GerarGuiaDeps mocks (no network)"
key-files:
  created:
    - supabase/migrations/20260629000001_entrevista_guia_edits.sql
    - .planning/phases/20-refino-rh-editar-guia-de-entrevista-seed-001/_smoke/save_entrevista_guia_edits.smoke.sql
    - supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts
  modified: []
decisions:
  - "Role derived from public.usuarios_rh inside the DEFINER (ativo + deleted_at IS NULL, recrutador→rh, administrador→administrador) — defeats a forged/stale JWT claim; matches the EF posture, not the salvar_avaliacao_entrevista JWT-claim habit."
  - "Dedup via DELETE … NOT IN (DISTINCT ON … ORDER BY created_at DESC, id DESC) — keep-latest with a deterministic tie-break; runs BEFORE ADD UNIQUE (else 23505)."
  - "updated_at set explicitly by both writers (RPC now() + EF upsert) — no trigger (no double-write ambiguity)."
  - "RPC shape guard rejects non-object jsonb (check_violation); body never touches candidaturas (RNF-07a)."
  - "Smoke is BEGIN/ROLLBACK-wrapped (disposable, not a migration); the 42601/D-22 no-wrapper rule applies to migrations only."
metrics:
  duration: 4min
  tasks: 2
  files: 3
  completed: 2026-06-29
---

# Phase 20 Plan 01: Author entrevista_guias edit migration + Wave-0 test scaffolds — Summary

Authored (NOT applied) the ENTREV-08 write-path migration — dedup → `updated_at` → `UNIQUE(candidatura_id, tipo)` → the `save_entrevista_guia_edits` SECURITY DEFINER RPC that derives role from `public.usuarios_rh` instead of the JWT claim — plus the SQL smoke that 20-02 runs against PROD and the RED-by-design Deno merge-preserve test that 20-04 turns green.

## What Was Built

### Task 1 — the migration file (`20260629000001_entrevista_guia_edits.sql`, commit `755f597`)
Four statements in the load-bearing order (20-RESEARCH Pitfall 2):
1. **dedup DELETE** — keeps the latest row per `(candidatura_id, tipo)` via `DISTINCT ON … ORDER BY candidatura_id, tipo, created_at DESC, id DESC` (deterministic `id DESC` tie-break), deletes the rest.
2. **`ADD COLUMN updated_at`** — backfill from `created_at`, then `DEFAULT now()` + `NOT NULL`.
3. **`ADD CONSTRAINT entrevista_guias_candidatura_tipo_key UNIQUE (candidatura_id, tipo)`** — the upsert arbiter (must exist before `ON CONFLICT`; must come after dedup else 23505).
4. **`CREATE OR REPLACE FUNCTION public.save_entrevista_guia_edits(uuid, text, jsonb)`** — `SECURITY DEFINER`, `SET search_path = ''`:
   - tipo guard (`online`/`presencial` → else `check_violation`);
   - **role from `public.usuarios_rh`** (ativo + `deleted_at IS NULL`, recrutador→rh, administrador→administrador) — the ENTREV-08 deviation; NULL/non-RH → `insufficient_privilege` (42501);
   - own-vaga via `candidaturas → vagas.created_by`; unknown candidatura → `no_data_found`; rh-without-ownership → 42501; administrador bypasses;
   - jsonb shape guard;
   - `INSERT … ON CONFLICT (candidatura_id, tipo) DO UPDATE SET guia = EXCLUDED.guia, updated_at = now()`;
   - `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE … TO authenticated`.
   - No `BEGIN/COMMIT` wrapper (D-22 / 42601). Body never touches `candidaturas` (RNF-07a).

### Task 2 — the two Wave-0 scaffolds (commit `cb01594`)
- **SQL smoke** (`_smoke/save_entrevista_guia_edits.smoke.sql`, 170 lines, `BEGIN; … ROLLBACK;`): seven cases via `set_config('request.jwt.claims', …)` + seeded/cleared `usuarios_rh` rows — candidato→42501, RH-no-posse→42501, RH-own→ok, administrador bypass→ok, upsert→1 row, dedup→1 latest (`guia.seq=3`), and the **CRITICAL anti-claim case** (JWT `app_metadata.role='rh'` but no `usuarios_rh` row → DENY, proving the role comes from the table, not the claim). Header documents the PROD-UUID placeholders 20-02 fills + that it runs via Supabase MCP `execute_sql`.
- **Deno merge-preserve test** (`_local/merge-preserve.test.ts`, 225 lines, **RED-by-design until 20-04**): imports `handler` + `GerarGuiaDeps`, injects a mock anthropic (returns parsed guide or null), a mock `supabaseAdmin` seeding a current row with one `origem:'manual'` question + capturing every `.insert/.upsert`. Three assertions: (1) successful regen preserves the manual question, (2) failed regen (guide=null) does NOT clobber it, (3) fresh questions stamped `origem:'ia'`. No network.

## Verification Results

- **Task 1 grep gate:** `MIGRATION_OK` — `FROM public.usuarios_rh` present; `ON CONFLICT (candidatura_id, tipo)` present; `REVOKE ALL ON FUNCTION public.save_entrevista_guia_edits` present; no `auth.jwt() #>> '{app_metadata,role}'`; no `BEGIN;` wrapper; no INSERT/UPDATE against `candidaturas`.
- **Task 2 scaffold gate:** `SCAFFOLDS_OK` — both files exist, smoke references `set_config('request.jwt.claims'` + `save_entrevista_guia_edits`, Deno test references `origem`. Min-lines met (smoke 170 ≥ 30; Deno 225 ≥ 40). Smoke is `BEGIN;`/`ROLLBACK;`-wrapped.
- **RED-by-design confirmed:** `deno test … merge-preserve.test.ts` → `0 passed | 3 failed` with **calibrated assertion failures** (handler ran to status 200, the blind `.insert()` produced 0 manual + 0 `origem:'ia'` questions). NOT a syntax/import error — the imports resolve and mocks work end-to-end. Flips green when 20-04 adds the merge.
- **vitest:** `662 passed (662)` — fully green (RED Deno test is outside the vitest scope, as designed).
- **tsc:** `npm run lint` → **257 error TS** (≤ 258 baseline; flat — new files are SQL + a Deno test, not tsc-compiled).
- **No PROD apply / no EF redeploy performed** (apply is the [BLOCKING] 20-02; EF merge is 20-04).

## Threat Model Coverage (this plan's authored controls)

| Threat ID | Mitigation authored here |
|-----------|--------------------------|
| T-20-01 (IDOR) | own-vaga guard `candidaturas→vagas.created_by`; RH-no-posse → 42501; smoke CASE 2 asserts the DENY |
| T-20-02 (JWT-claim spoof) | role from `usuarios_rh` (ativo + deleted_at IS NULL), not the claim; smoke CASE 7 asserts claim-says-rh-no-row → DENY |
| T-20-03 (candidate calls RPC) | no usuarios_rh row → role NULL → 42501; REVOKE PUBLIC + GRANT authenticated; smoke CASE 1 |
| T-20-04 (manual dropped on regen) | merge-preserve invariant encoded in the Deno test (made green in 20-04) |
| T-20-05 (guide write → candidaturas) | RPC body never touches candidaturas (RNF-07a); verified by source grep |
| T-20-SC (supply chain) | zero external packages this phase — no install surface |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration grep gate tripped on an explanatory comment**
- **Found during:** Task 1 verification.
- **Issue:** The Task 1 gate is a blunt negative source-grep `! grep -iq "auth.jwt() #>> '{app_metadata,role}'"`. My header comment described the deviation by quoting that exact literal string ("NOT from the JWT claim `auth.jwt() #>> '{app_metadata,role}'`") — which made the negative grep fail even though no role-decision code uses it.
- **Fix:** Reworded the comment to describe the claim without the literal pattern ("the JWT app_metadata role claim … via auth.jwt()"). The actual role logic was always `usuarios_rh`-sourced; only the prose tripped the gate.
- **Files modified:** `supabase/migrations/20260629000001_entrevista_guia_edits.sql` (comment only, same commit `755f597`).

No other deviations — plan executed as written.

## Known Stubs

None. The migration, smoke, and Deno test are complete authored artifacts. The Deno test is intentionally RED (the EF merge it asserts lands in 20-04, per the plan's must_haves truth #5); this is documented behavior, not a stub.

## Notes for Downstream Plans

- **20-02 ([BLOCKING], human-gated):** apply `20260629000001_entrevista_guia_edits.sql` via Supabase MCP `apply_migration` (NOT `db push` — 42601 on the `$$` body); then fill the placeholder UUIDs in the smoke from PROD seed data and run it via MCP `execute_sql`; then `npm run db:types` to regenerate `database.types.ts` (repo ROOT). The smoke's CASE 6 dedup re-runs the migration's own predicate scoped to a throwaway candidatura — safe inside the ROLLBACK fixture.
- **20-03:** `saveGuiaEdits` calls `supabase.rpc('save_entrevista_guia_edits', { p_candidatura_id, p_tipo, p_guia: { perguntas } })`; reuse `mapRpcError` (42501→FORBIDDEN). The RPC arg order is `(uuid, text, jsonb)`.
- **20-04 ([BLOCKING]):** make `merge-preserve.test.ts` green — read the current guia, split by `origem`, keep all `'manual'`, stamp fresh `'ia'`, upsert on `(candidatura_id, tipo)`; failed-regen (guide=null) must merge manual into the incompleto payload (or skip the write), never clobber. Then redeploy the EF.

## Self-Check: PASSED

- Files: all 4 created files FOUND (migration, smoke, Deno test, SUMMARY).
- Commits: `755f597` (Task 1), `cb01594` (Task 2) both FOUND in git log.
