---
phase: 24-blindagem-de-seguran-a-pii-lgpd
plan: 06
subsystem: database
tags: [rls, lgpd, pii, supabase, auth-hook, console-log, grep-guard, migration]

# Dependency graph
requires:
  - phase: 24-01
    provides: "live-state capture — auth_admin predicate (A2), backup_m2 existence + 35-col PII list (A1)"
  - phase: 16
    provides: "FX-14 rh-console.grep.test.ts guard idiom (comment-aware node:fs scan)"
provides:
  - "SEC-09: auth_admin_le_usuarios_rh policy declared in a migration file (execute_sql-only drift ended)"
  - "SEC-10: DROP of backup_m2.candidaturas_pre_funil PII snapshot (LGPD erasure completeness)"
  - "SEC-11: RH pages free of operational console.log; grep guard extended to lock it"
affects: [24-08, 27, DBMIG-01, M5]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration-file mirror of an execute_sql-only live RLS policy (idempotent DROP+CREATE, zero behavior change)"
    - "FX-14 console.log grep guard extended by adding page paths to RH_PATH_FILES"

key-files:
  created:
    - supabase/migrations/20260706110006_sec09_auth_admin_policy.sql
    - supabase/migrations/20260706110007_sec10_drop_backup.sql
  modified:
    - src/components/pages/ConfiguracoesPage.tsx
    - src/components/pages/MeuPerfilPage.tsx
    - src/__tests__/guards/rh-console.grep.test.ts

key-decisions:
  - "SEC-09 is a faithful mirror of the live predicate (SELECT/supabase_auth_admin/USING true) — NOT a re-migration; version-row reconcile deferred to Phase 27/DBMIG-01"
  - "SEC-11 console.error sites in VagasRHPage/CriarEditarVagaPage left intact (FX-14 allows console.error) — not DEV-gated"
  - "Webhook handler param id → _id after removing its log (noUnusedParameters)"

patterns-established:
  - "Declared mirror of execute_sql-only live RLS policy in a migration file (drift-fix, zero behavior change)"
  - "Grep-guard coverage extension = add path to RH_PATH_FILES (no regex change)"

requirements-completed: [SEC-09, SEC-10, SEC-11]

# Metrics
duration: 12min
completed: 2026-07-07
---

# Phase 24 Plan 06: Declarations, LGPD Erasure & RH Log Hygiene Summary

**Declared the execute_sql-only auth_admin RLS policy in a migration file (rebuild-safe), authored the LGPD DROP of the backup_m2 PII snapshot, and stripped operational console.log (incl. a candidate-email leak) from RH pages with the grep guard extended to lock it.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-07
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- **SEC-09** — `20260706110006_sec09_auth_admin_policy.sql`: idempotent `DROP POLICY IF EXISTS` + `CREATE POLICY auth_admin_le_usuarios_rh ON public.usuarios_rh AS PERMISSIVE FOR SELECT TO supabase_auth_admin USING (true)` + the supporting `GRANT SELECT ... TO supabase_auth_admin`. This is a byte-for-behavior mirror of the 24-01/A2-captured live predicate — zero behavior change, ending the execute_sql-only drift so a future `supabase db reset` keeps RH login working (the `custom_access_token_hook` dependency). Inline comment defers the version-row reconcile to Phase 27/DBMIG-01.
- **SEC-10** — `20260706110007_sec10_drop_backup.sql`: `DROP TABLE IF EXISTS backup_m2.candidaturas_pre_funil; DROP SCHEMA IF EXISTS backup_m2 CASCADE;`. Completes LGPD erasure for the 2026-06-07 cutover PII snapshot that lived outside the covered erasure flow; the 35-col PII list from 24-01 is referenced inline as the erasure evidence.
- **SEC-11** — removed 8 operational `console.log` calls (5 in ConfiguracoesPage incl. L491 candidate-email reset leak, 3 in MeuPerfilPage) and extended `RH_PATH_FILES` in the FX-14 grep guard to cover both pages so a regression re-fails.

## Task Commits

1. **Task 1: SEC-09 auth_admin policy mirror + SEC-10 backup drop migrations** — `9eed6e9` (feat)
2. **Task 2: SEC-11 strip RH console.log + extend grep guard** — `27aa3dd` (fix)

**Plan metadata:** (docs commit — this SUMMARY + STATE/ROADMAP)

## Files Created/Modified

- `supabase/migrations/20260706110006_sec09_auth_admin_policy.sql` — declared mirror of the live `auth_admin_le_usuarios_rh` policy + supporting grant (idempotent, drift-fix, zero behavior change)
- `supabase/migrations/20260706110007_sec10_drop_backup.sql` — DROP TABLE + DROP SCHEMA CASCADE for the backup_m2 PII snapshot (LGPD erasure)
- `src/components/pages/ConfiguracoesPage.tsx` — removed 5 console.log (empresa/webhook/permissoes/redefinir-senha email/preview); handler stubs kept for M5; webhook param `id`→`_id`
- `src/components/pages/MeuPerfilPage.tsx` — removed 3 console.log (salvar-dados/alterar-senha/alterar-foto); stubs kept
- `src/__tests__/guards/rh-console.grep.test.ts` — `RH_PATH_FILES` now includes ConfiguracoesPage + MeuPerfilPage (regex/comment-awareness unchanged; console.error still allowed)

## Decisions Made

- **SEC-09 is a mirror, not a re-migration.** The 24-01/A2 capture confirmed the live predicate byte-for-behavior (`SELECT` / `{supabase_auth_admin}` / `qual true`); the DROP+CREATE reproduces exactly that. No divergence was flagged, so the byte-for-behavior guard held — this remains in scope as a drift-fix. Version-row reconcile is Phase 27/DBMIG-01.
- **console.error left intact.** VagasRHPage/CriarEditarVagaPage `console.error` sites were not touched and not DEV-gated — FX-14 deliberately allows `console.error`, and the plan gave discretion; leaving them keeps genuine error reporting.
- **Handler stubs preserved.** MeuPerfilPage save handlers and ConfiguracoesPage stubs are M5 work; only the logs were removed, keeping the stub bodies (with TODO(M5) comments) so button wiring stays valid.

## Deviations from Plan

None - plan executed exactly as written. The webhook param rename `id`→`_id` (to satisfy `noUnusedParameters` after removing its log) is a mechanical consequence of the SEC-11 edit, not a scope change.

## Issues Encountered

None. `noUnusedParameters`/`noUnusedLocals` were checked pre-edit: all logged state vars (dadosEmpresa, webhooks, permissoesEditando, usuarioSelecionado, templateEditando, dadosPessoais, senhas) are referenced elsewhere, so no new TS6133 appeared; the single unused-after-removal param was renamed with a `_` prefix.

## Verification

- `grep -c "auth_admin_le_usuarios_rh"` on sec09 ⇒ 5 (≥2); `TO supabase_auth_admin` + `USING (true)` + `DROP POLICY IF EXISTS` present
- `grep -c "DROP TABLE IF EXISTS backup_m2|DROP SCHEMA IF EXISTS backup_m2"` on sec10 ⇒ 2
- No outer BEGIN/COMMIT wrapper in either migration
- `grep -nE 'console\.(log|debug|info|warn)\s*\(' ConfiguracoesPage MeuPerfilPage | grep -v '//'` ⇒ 0
- `npm run test:run -- rh-console.grep` ⇒ 4/4 green (both pages covered)
- `npm run lint` (tsc) ⇒ 128 errors (≤133 baseline; unchanged from start)
- No migration writes candidaturas or auto-rejects (RNF-07a)

## User Setup Required

None. Migrations are FILES ONLY — PROD apply (auth_admin declare + backup drop via Supabase MCP) is Plan 24-08. SEC-11 is client-only (ships with the frontend build).

## Next Phase Readiness

- 24-08 will apply both migrations against PROD (Supabase MCP `execute_sql`/`apply_migration`) and run the smokes: post-apply `SELECT to_regclass('backup_m2.candidaturas_pre_funil')` ⇒ NULL, and a pg_policies re-confirm that `auth_admin_le_usuarios_rh` is unchanged.
- Version-row reconcile for the auth_admin policy remains deferred to Phase 27/DBMIG-01 (ledger convergence).
- Out-of-scope note carried from 24-LIVE-STATE.md: `usuarios_rh` also carries two `{authenticated} USING true` SELECT policies (broader RH-PII surface) — logged for a future phase, untouched here (SEC-09 scope is the auth_admin policy only).

## Self-Check: PASSED

- Files: all 4 (2 migrations, guard test, SUMMARY) FOUND on disk
- Commits: `9eed6e9`, `27aa3dd` FOUND in git log

---
*Phase: 24-blindagem-de-seguran-a-pii-lgpd*
*Completed: 2026-07-07*
