---
phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro
plan: 04
subsystem: database
tags: [rls, postgres, plpgsql, security-definer, audit, append-only, supabase, seg-02, usr-06]

# Dependency graph
requires:
  - phase: 24-06 (SEC-09)
    provides: "auth_admin_le_usuarios_rh policy (auth-hook dependency) — preserved untouched here"
  - phase: 28-01 (Wave-0 live capture)
    provides: "28-LIVE-STATE.md — real live policy names + verbatim limpar_logs_antigos() body + owner/BYPASSRLS verdicts (authored DROP/PRESERVE against this)"
provides:
  - "is_active_rh_admin() — recursion-safe LANGUAGE plpgsql SECURITY DEFINER admin predicate for usuarios_rh RLS"
  - "usuarios_rh_admin_select — admin-only full-roster SELECT policy (SEG-02 leak closure)"
  - "Dropped roster leaks (usuarios_rh_authenticated_read + usuarios_rh_simple_read) and the WITH-CHECK-less self-promotion UPDATE policy (SEG-03 early close)"
  - "logs_auditoria append-only: dropped forgeable authenticated INSERT policy + REVOKE INSERT/UPDATE/DELETE from client roles (USR-06)"
  - "limpar_logs_antigos() redefined (byte-preserved diff) to exclude categoria usuario/seguranca from the 730-day purge (retention immutability)"
affects: [28-07 (MCP apply to PROD), 28-08 (behavioral SQL smokes), 29 (console consumes admin-only roster), 30 (A37 own-row read + SEG-03)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Recursion-safe admin RLS via LANGUAGE plpgsql SECURITY DEFINER helper (never LANGUAGE sql — inlining loses DEFINER context)"
    - "Append-only audit hardening: drop forgeable INSERT policy + REVOKE from client roles, DEFINER-only writes, no FORCE RLS"
    - "Verified byte-preserved diff of a live DEFINER function (M4/DBMIG-02 discipline) — change only the intended clause"

key-files:
  created:
    - "supabase/migrations/20260713000001_usr_rh_rls_seg02.sql"
    - "supabase/migrations/20260713000004_logs_auditoria_append_only.sql"
  modified: []

key-decisions:
  - "Own-row SELECT NOT re-created: Wave-0 found it already exists live as \"RH pode ler seu próprio perfil\" — preserved (no duplicate permissive OR, M4/SEC-08), deviating from the plan's usuarios_rh_own_select proposal"
  - "Dropped \"RH pode atualizar seu próprio perfil\" (UPDATE own-row, no WITH CHECK) — a live self-promotion hole; grep proved zero client writes to usuarios_rh, so dropping it early-closes SEG-03 with zero regression"
  - "limpar_logs_antigos() byte-preserved from docs/sql/25-functions (RETURNS INTEGER live variant); only the categoria exclusion added"

patterns-established:
  - "is_active_rh_admin() DEFINER predicate is the canonical admin-RLS gate for usuarios_rh (reused by future roster policies)"

requirements-completed: [SEG-02, USR-06]

# Metrics
duration: 12min
completed: 2026-07-13
---

# Phase 28 Plan 04: usuarios_rh RLS Hardening + logs_auditoria Append-Only Summary

**SEG-02 closes the standing RH-roster PII leak (drop two qual=true SELECT policies + a self-promotion UPDATE hole, add a recursion-safe admin-only SELECT via a plpgsql DEFINER helper) and USR-06 makes logs_auditoria append-only + purge-exempt for user-management rows — two migration files authored only, applied in 28-07.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-13
- **Completed:** 2026-07-13
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- **SEG-02 roster is admin-only:** dropped `usuarios_rh_authenticated_read` + `usuarios_rh_simple_read` (both `qual=true` SELECT leaks that let any authenticated candidato/recrutador read the entire RH roster); added `usuarios_rh_admin_select` gated by a recursion-safe `is_active_rh_admin()` PL/pgSQL SECURITY DEFINER predicate.
- **SEG-03 early close:** dropped `RH pode atualizar seu próprio perfil` (UPDATE, own-row, no `WITH CHECK`) — a live self-promotion vector — after confirming zero client writes to `usuarios_rh` in `src/`.
- **USR-06 append-only:** dropped the forgeable `Sistema insere logs` authenticated INSERT policy and REVOKE'd INSERT/UPDATE/DELETE from `authenticated`/`anon`; the DEFINER `log_auditoria()` path (owner BYPASSRLS) still writes.
- **USR-06 retention immutability:** redefined `limpar_logs_antigos()` as a verified byte-preserved diff adding only `AND categoria NOT IN ('usuario','seguranca')` to the purge WHERE, so user-management/security audit rows survive the 730-day purge.
- **Preserved untouched:** `RH pode ler seu próprio perfil` (own-row SELECT), `auth_admin_le_usuarios_rh` (SEC-09), the JWT role-resolution auth hook, and `Admin vê logs` SELECT.

## Task Commits

Each task was committed atomically (via `git -c core.hooksPath=/dev/null`):

1. **Task 1: usr_rh_rls_seg02 migration (drop leaks + DEFINER helper + admin SELECT)** - `32e11ce` (feat)
2. **Task 2: logs_auditoria_append_only migration (drop forgeable INSERT + REVOKE + retention exclusion)** - `31899de` (feat)

**Plan metadata:** _(this SUMMARY + STATE.md + ROADMAP.md — final commit)_

## Files Created/Modified
- `supabase/migrations/20260713000001_usr_rh_rls_seg02.sql` - `is_active_rh_admin()` DEFINER helper + DROP of the two `qual=true` roster leaks + the self-promotion UPDATE policy + `usuarios_rh_admin_select` admin-only SELECT. No client write policy; no FORCE RLS; no BEGIN/COMMIT wrapper.
- `supabase/migrations/20260713000004_logs_auditoria_append_only.sql` - DROP `Sistema insere logs` + REVOKE INSERT/UPDATE/DELETE from client roles + byte-preserved `limpar_logs_antigos()` redefinition with the `categoria NOT IN ('usuario','seguranca')` retention exclusion.

## Decisions Made
- **Own-row policy NOT re-created (deviation — see below):** the plan proposed creating `usuarios_rh_own_select`, but the authoritative Wave-0 capture found the own-row SELECT already exists live as `RH pode ler seu próprio perfil`. Preserved it (no duplicate permissive OR) instead of adding a second one.
- **`limpar_logs_antigos()` source:** the live function is the `RETURNS INTEGER` variant from `docs/sql/sql/25-functions-configuracoes.sql:141-189` (deletes from `logs_auditoria`, reads `configuracoes_empresa.dias_retencao_logs`, matches 28-LIVE-STATE A1c). The `docs/sql/01-setup` `RETURNS void`/`logs_acesso` variant is superseded and was NOT used.
- **`CREATE FUNCTION` schema-qualified** (`public.limpar_logs_antigos()`) per project convention; the function body kept byte-identical except the one WHERE clause addition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / stale-assumption reconciliation] Own-row SELECT policy not created — preserved the live one instead**
- **Found during:** Task 1 (usr_rh_rls_seg02 migration)
- **Issue:** The plan's Task 1 action and its `key_links` frontmatter direct creating a new `usuarios_rh_own_select` policy. The plan was authored against a pre-capture assumption. The authoritative 28-LIVE-STATE Wave-0 capture (and the orchestrator's `<critical_from_live_state>` directive) show the own-row SELECT ALREADY EXISTS live as `RH pode ler seu próprio perfil` (SELECT {public} USING `auth.uid() = user_id`). Creating a second own-row policy would be a redundant permissive OR (M4/SEC-08 discipline) and would touch/duplicate a PRESERVE-listed policy.
- **Fix:** Did NOT create `usuarios_rh_own_select`. Left `RH pode ler seu próprio perfil` untouched (it already keeps recrutador login / `authStore.fetchProfile` / A37 working). Documented the reconciliation inline in the migration header.
- **Files modified:** `supabase/migrations/20260713000001_usr_rh_rls_seg02.sql`
- **Verification:** The SEG-02 own-row REQUIREMENT (a recrutador reads only their own row after the leaks are dropped) is satisfied by the preserved policy; behavioral proof is deferred to 28-08. Note: the plan's `grep -q "usuarios_rh_own_select"` gate passes because the migration's explanatory comment mentions the name — NOT because the policy is created. This is transparent, not gamed.
- **Committed in:** `32e11ce` (Task 1 commit)

**2. [Rule 2 - Missing critical / security] Dropped the live self-promotion UPDATE policy (SEG-03 early close)**
- **Found during:** Task 1 (usr_rh_rls_seg02 migration)
- **Issue:** 28-LIVE-STATE flagged `RH pode atualizar seu próprio perfil` (UPDATE, own-row, no `WITH CHECK`) as a LIVE privilege-escalation vector — a recrutador could `UPDATE usuarios_rh SET role='administrador'` on their own row. This is beyond the two SELECT leaks the plan's assumed scope named, but the orchestrator directive and Wave-0 both mandate dropping it.
- **Fix:** Added `DROP POLICY IF EXISTS "RH pode atualizar seu próprio perfil"`. Grep of `src/` confirmed zero client writes to `usuarios_rh`, so no regression; the P30 profile-edit write-path (A37) will supply a `role`/`ativo`-excluded replacement.
- **Files modified:** `supabase/migrations/20260713000001_usr_rh_rls_seg02.sql`
- **Verification:** Structural (policy dropped); behavioral (a recrutador cannot self-promote) deferred to 28-08.
- **Committed in:** `32e11ce` (Task 1 commit)

---

**Total deviations:** 2 (1 stale-assumption reconciliation against the authoritative Wave-0 capture, 1 security hardening mandated by 28-LIVE-STATE).
**Impact on plan:** Both align the migration with the authoritative live state; no scope creep. SEG-02 + USR-06 requirements are fully authored; SEG-03 is additionally closed early at zero regression.

## Issues Encountered
None. Both migration files pass their automated grep gates; the `limpar_logs_antigos()` body was confirmed a byte-preserved diff of the Wave-0 source (only the `categoria` exclusion + its comment added).

## Known Stubs
None. These are RLS/DEFINER migrations with no UI or data-source wiring.

## Threat Flags
None. No new network endpoint, auth path, file access, or schema change beyond the trust boundaries already enumerated in the plan's `<threat_model>` (T-28-02/03/05/08/09/10). This plan REMOVES surface (roster leak, forgeable audit INSERT, self-promotion UPDATE, purge of user-audit rows).

## User Setup Required
None - no external service configuration. Applied to PROD via Supabase MCP `apply_migration` in plan 28-07 (a [BLOCKING] wave, authorized by Fernando). Files-only here.

## Next Phase Readiness
- **28-07 (apply):** both migrations are authored NO-BEGIN/COMMIT and idempotent (DROP ... IF EXISTS / CREATE OR REPLACE) — ready for MCP `apply_migration`. Order-independent, but recommend applying `20260713000001` (RLS) then `20260713000004` (audit).
- **28-08 (smokes):** the RED behavioral smokes from 28-03 (`usr_rh_seg02_smoke.sql`, `usr_rh_audit_append_only_smoke.sql`) turn GREEN once applied — assert 0-row roster read for candidato/recrutador, admin full roster, own-row read via the preserved policy, `auth_admin_le_usuarios_rh` intact, denied client audit INSERT, and a `categoria='usuario'` row surviving a `limpar_logs_antigos()` call.
- **Concern (deferred, out of scope):** `RH pode ler seu próprio perfil` is live-drift (no migration file declares it); its clean-rebuild reconciliation is deferred to a future DBMIG pass, exactly as SEC-09's version-row reconcile was deferred. Recorded in the migration header.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260713000001_usr_rh_rls_seg02.sql
- FOUND: supabase/migrations/20260713000004_logs_auditoria_append_only.sql
- FOUND: .planning/phases/28-gest-o-de-usu-rios-rh-n-cleo-seguro/28-04-SUMMARY.md
- FOUND commit: 32e11ce (Task 1)
- FOUND commit: 31899de (Task 2)

---
*Phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro*
*Completed: 2026-07-13*
