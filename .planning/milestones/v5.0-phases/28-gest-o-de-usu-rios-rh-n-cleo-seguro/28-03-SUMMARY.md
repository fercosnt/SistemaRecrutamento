---
phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro
plan: 03
subsystem: testing
tags: [postgres, rls, sql-smoke, impersonated-jwt, audit, anti-lockout, seg-02, usr-06, usr-07]

# Dependency graph
requires:
  - phase: 28 (28-01)
    provides: 28-LIVE-STATE.md (real policy names, admin floor=4, owners, hook body)
  - phase: 28 (28-CONTEXT/PATTERNS)
    provides: behavioral SQL smoke idiom (submit_candidatura_atomic_smokes.sql)
provides:
  - "supabase/tests/usr_rh_seg02_smoke.sql — SEG-02 roster-leak / own-row / admin-roster / SEC-09-preserved behavioral smoke (RED)"
  - "supabase/tests/usr_rh_anti_lockout_smoke.sql — USR-07 last-admin P0001 (demote/deactivate/delete) + non-last succeeds + documented 2-session advisory-lock proof (RED)"
  - "supabase/tests/usr_rh_audit_append_only_smoke.sql — USR-06 atomic mutate+audit (ativar + criar) + rollback-together + append-only INSERT/UPDATE/DELETE denial + resetar_senha shape (RED)"
affects: [28-04, 28-05, 28-07, 28-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Impersonated-JWT SQL smoke: set_config request.jwt.claims + SET ROLE authenticated → assert the ROW PROJECTION, not pg_policies metadata"
    - "Rolled-back subtransaction to reconstruct a 'last active admin' world on a live DB with a 4-admin floor — real admins never permanently mutated"
    - "RED harness: undefined_function / no-raise / non-zero-count expected-failures go GREEN only after the migrations apply"

key-files:
  created:
    - supabase/tests/usr_rh_seg02_smoke.sql
    - supabase/tests/usr_rh_anti_lockout_smoke.sql
    - supabase/tests/usr_rh_audit_append_only_smoke.sql
  modified: []

key-decisions:
  - "Assert row projection (count of visible rows), never a pg_policies grep — the M4/SEC-07/08 lesson (structural grep passes while a real leak persists)"
  - "Reconstruct the last-admin world inside a PL/pgSQL OUTER subtransaction that is ALWAYS unwound (sentinel 22023 raise on pass; FAIL raise propagating on fail) — real admins are restored either way; the smoke never permanently touches a real admin (safer than the 'disposable single-admin fixture' alternative given the live floor is 4)"
  - "Impersonate a non-admin RH via a disposable recrutador fixture (live has 0 recrutadores) so the mandatory own-row read path is actually exercised"
  - "Use free auth.users ids (NOT already an RH) as the usuarios_rh.user_id FK target for disposable fixtures; guard cleanup of the AFTER-INSERT preferencias_notificacoes child"

patterns-established:
  - "Pattern 1: last-admin trigger proof via unwound subtransaction (deactivate every other admin one row at a time — each legally passes the trigger — then attempt the forbidden mutation, catch P0001, sentinel-rollback)"
  - "Pattern 2: append-only proof via impersonated INSERT (candidato/recrutador → insufficient_privilege) + admin UPDATE/DELETE (insufficient_privilege from REVOKE)"
  - "Pattern 3: atomic mutate+audit proof — exactly one categoria='usuario' row per RPC keyed on the disposable recurso_id; rollback-together via a NOT_FOUND target writing 0 rows"

requirements-completed: [SEG-02, USR-07, USR-06]

# Metrics
duration: 17min
completed: 2026-07-13
---

# Phase 28 Plan 03: RED Harness B — Behavioral SQL Smokes Summary

**Three impersonated-JWT behavioral SQL smokes that are the load-bearing verification gate for SEG-02 (roster leak), USR-07 (anti-lockout), and USR-06 (atomic-audit + append-only) — authored RED before their migrations exist, asserting the row projection rather than pg_policies metadata.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-07-13T04:50:00Z
- **Completed:** 2026-07-13T05:06:30Z
- **Tasks:** 3
- **Files modified:** 3 created

## Accomplishments
- **SEG-02 smoke** — candidato AND recrutador impersonated `SELECT count(*) FROM usuarios_rh` = 0 rows (roster leak closed); recrutador own-row read returns exactly 1 (mandatory for non-admin login); admin reads the full roster; `auth_admin_le_usuarios_rh` regression-guarded present with `qual='true'` (SEC-09 preserved).
- **USR-07 smoke** — demote / deactivate / delete of the LAST active admin each raise SQLSTATE `P0001` with 0 mutation; a non-last-admin demote still succeeds (not over-eager); a documented 2-session advisory-lock write-skew proof for 28-08. The live 4-admin floor is respected — the last-admin world is reconstructed inside a rolled-back subtransaction so no real admin is ever permanently mutated.
- **USR-06 smoke** — exactly one `categoria='usuario'` audit row per mutation for BOTH `gerir_usuario_rh_mutacao('ativar')` AND `criar_usuario_rh_com_audit` (atomic mutate+audit); rollback-together (a NOT_FOUND mutation writes 0 rows); append-only denial for candidato/recrutador INSERT and admin UPDATE/DELETE; the `resetar_senha` best-effort EF audit-row shape.

## Task Commits

Each task committed atomically (via `git -c core.hooksPath=/dev/null`, the project's documented husky-bypass practice):

1. **Task 1: SEG-02 roster-leak behavioral smoke** — `3219e03` (test)
2. **Task 2: USR-07 anti-lockout behavioral smoke** — `00d4c8a` (test)
3. **Task 3: USR-06 atomic-audit + append-only behavioral smoke** — `5614728` (test)

**Plan metadata:** _(this commit)_ (docs: complete plan)

## Files Created/Modified
- `supabase/tests/usr_rh_seg02_smoke.sql` (211 lines) — SEG-02: 4 cases + disposable recrutador fixture + ROLLBACK-free cleanup. RED (assertions 1-2 leak-positive today; assertion 4 GREEN regression guard).
- `supabase/tests/usr_rh_anti_lockout_smoke.sql` (243 lines) — USR-07: 4 executable cases + a documented 2-session concurrency proof + disposable committed admin fixture. RED (trigger absent today).
- `supabase/tests/usr_rh_audit_append_only_smoke.sql` (345 lines) — USR-06: 6 cases (mutate, create, rollback-together, INSERT denial ×2, UPDATE/DELETE denial, resetar_senha shape) + disposable target + seed audit row. RED (RPCs + REVOKE/policy-drop absent today; case 6 GREEN documentation).

## Decisions Made
- **Row projection over metadata.** Every leak/denial assertion reads the actual visible-row count (or catches the actual raise), never `pg_policies` — the M4/SEC-07/08 lesson that a structural grep passes while a real leak persists. Only the SEC-09 preservation guard reads `pg_policies` (it asserts a policy still *exists* — a structural fact — not the absence of a leak).
- **Unwound-subtransaction last-admin reconstruction.** Because the live active-admin floor is 4 and the trigger counts the whole table, a demote/deactivate/delete of a lone disposable admin cannot reach 0-others. The smoke instead deactivates every *other* active admin one row at a time (each legally passing the trigger) inside an OUTER PL/pgSQL subtransaction, attempts the forbidden mutation on the now-last fixture, and unwinds the subtransaction on BOTH the pass path (sentinel `22023` raise) and the fail path (FAIL raise propagating out) — so real admins are always restored. This is strictly safer than the plan's alternative "disposable single-admin fixture", which cannot make the whole-table count see one admin.
- **Disposable non-admin RH fixture for the own-row path.** Live has 0 recrutadores, so the mandatory own-row read (login-critical) is exercised via a disposable `recrutador` row keyed to a free `auth.users` id (a valid, unique `user_id` FK target that is not already an RH).

## Deviations from Plan

None material — plan executed as written. Two authoring choices worth recording (both within "Claude's Discretion" and the plan's stated `OR` alternatives; neither weakens an assertion):

1. **[Design choice — not a deviation] Last-admin isolation via rolled-back subtransaction.** The plan offered two routes ("disposable single-active-admin fixture … in an isolated context" OR "assert against the trigger directly by attempting to demote/deactivate/delete the LAST active admin"). Since the trigger counts the entire table (floor=4 live), the only faithful isolation is a subtransaction that temporarily reduces the active-admin set to the fixture and is always unwound. Chosen for safety: no real admin row is ever permanently changed.
2. **[Design choice — not a deviation] `criar_usuario_rh_com_audit` result decoupled from its return type.** The create RPC's return type is authored in 28-05; the smoke calls it via `PERFORM` and looks the new id up by `user_id` + `[SMOKE]` email, so it is robust whether 28-05 makes the RPC return the new id or `void`.

## Issues Encountered
None. All three files passed their `<automated>` verify greps and the min-lines floors (211 / 243 / 345 vs 60 / 50 / 60).

## Threat Flags
None. No new security surface introduced — these are read-only/rolled-back test assets that mutate only disposable fixtures they create and clean up.

## Known Stubs
None. The three smokes are intentionally RED (pre-migration): they assert the FINAL secure behavior and will fail/skip until 28-04/28-05 land the RLS + trigger + RPCs and 28-07 applies them to PROD, at which point 28-08 runs them GREEN. This is the plan's Nyquist test-first contract, not an incomplete stub.

## Next Phase Readiness
- **28-04** (SEG-02 RLS rewrite + logs_auditoria append-only) and **28-05** (anti-lockout trigger + mutate/create audit RPCs) now have executable acceptance criteria to satisfy — the migrations must make these three smokes return PASS.
- **28-08** can paste-and-run each `.sql` on PROD (Supabase SQL Editor / MCP execute_sql) after 28-07 applies the migrations; the 2-session concurrency proof in the anti-lockout smoke must be run in two overlapping MCP/psql sessions.
- Blockers: none.

## Self-Check: PASSED

- All 3 smoke files + SUMMARY.md exist on disk.
- All 3 task commits present in git history (3219e03, 00d4c8a, 5614728).

---
*Phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro*
*Completed: 2026-07-13*
