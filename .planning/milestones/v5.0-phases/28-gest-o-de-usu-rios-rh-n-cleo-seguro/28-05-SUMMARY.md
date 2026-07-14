---
phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro
plan: 05
subsystem: database
tags: [postgres, plpgsql, trigger, security-definer, advisory-lock, anti-lockout, audit, atomic, supabase, usr-07, usr-06]

# Dependency graph
requires:
  - phase: 28-01 (Wave-0 live capture)
    provides: "28-LIVE-STATE.md — active-admin floor (4), coexisting triggers on usuarios_rh, log_auditoria signature, owner/BYPASSRLS verdicts (authored against this)"
  - phase: 28-03 (RED smokes)
    provides: "usr_rh_anti_lockout_smoke + usr_rh_audit_atomic smokes that turn GREEN once these migrations apply (28-08)"
  - phase: 28-04 (RLS hardening)
    provides: "usuarios_rh client writes denied + logs_auditoria append-only — these RPCs are the only sanctioned write path"
provides:
  - "tg_usuarios_rh_anti_lockout() + trg_usuarios_rh_anti_lockout — BEFORE UPDATE OR DELETE race-safe anti-lockout guard (pg_advisory_xact_lock before count; RAISE P0001)"
  - "gerir_usuario_rh_mutacao(p_actor,p_target,p_action,p_novo_papel) — atomic DB-only mutate+audit RPC (mudar_papel/desativar/ativar)"
  - "criar_usuario_rh_com_audit(p_actor,p_user_id,p_email,p_nome,p_cargo,p_papel) — atomic create+audit RPC returning the new usuarios_rh id"
affects: [28-06 (EF calls both RPCs by name), 28-07 (MCP apply to PROD), 28-08 (behavioral SQL smokes)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Race-safe invariant guard: pg_advisory_xact_lock(hashtext(const)) BEFORE the count(*) serializes concurrent admin-removals to defeat snapshot write-skew (first repo use of an advisory lock)"
    - "Atomic mutate+audit: row change and log_auditoria() insert in one SECURITY DEFINER function body → one transaction; a RAISE anywhere (incl. the anti-lockout trigger) rolls both back"
    - "DEFINER RPC signatures pinned verbatim to the calling EF's .rpc() param names (28-06) to prevent contract drift caught only at PROD smoke"

key-files:
  created:
    - "supabase/migrations/20260713000002_usr_rh_anti_lockout.sql"
    - "supabase/migrations/20260713000003_usr_rh_mutacao_rpc.sql"
  modified: []

key-decisions:
  - "Anti-lockout is a BEFORE UPDATE OR DELETE trigger (not just an EF pre-count) — the only bypass-proof floor: it fires inside the DEFINER RPC and even for a raw service_role write. The EF pre-count (28-06) is friendly defense-in-depth; the trigger is the hard backstop."
  - "pg_advisory_xact_lock(hashtext('usuarios_rh_admin_guard')) taken BEFORE the count(*) — a fixed stable constant so every admin-removing mutation contends on one lock, defeating the two-concurrent-demotes write-skew to zero admins (RESEARCH Pitfall 3)."
  - "RPC param names pinned verbatim to 28-06's .rpc() calls (criar_usuario_rh_com_audit(p_actor,p_user_id,p_email,p_nome,p_cargo,p_papel) / gerir_usuario_rh_mutacao(p_actor,p_target,p_action,p_novo_papel)) — no drift."
  - "Numbering 20260713000002 (trigger) + 000003 (rpc) slots between 28-04's 000001 (rls) and 000004 (append-only) so PROD apply order is rls -> trigger -> rpc -> append-only (trigger must exist before the RPC's UPDATE fires it)."

patterns-established:
  - "Advisory-lock-before-count is the canonical shape for any 'never below N' server-enforced invariant in this repo."

requirements-completed: [USR-07, USR-06]

# Metrics
duration: 2min
completed: 2026-07-13
---

# Phase 28 Plan 05: usuarios_rh Anti-Lockout Trigger + Atomic Mutate+Audit RPCs Summary

**USR-07 lands a race-safe BEFORE UPDATE OR DELETE anti-lockout trigger (pg_advisory_xact_lock before the admin count, RAISE P0001) that no client, RPC, or service_role path can bypass, and USR-06 lands two atomic SECURITY DEFINER RPCs (gerir_usuario_rh_mutacao / criar_usuario_rh_com_audit) that commit the usuarios_rh row change and its logs_auditoria row in one transaction — two migration files authored only, applied in 28-07.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-07-13
- **Completed:** 2026-07-13
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- **USR-07 server-enforced anti-lockout (race-safe):** `tg_usuarios_rh_anti_lockout()` bound as `trg_usuarios_rh_anti_lockout` (BEFORE UPDATE OR DELETE) refuses any mutation that would drop the active-admin count (`role='administrador' AND ativo AND deleted_at IS NULL`) below 1, RAISEing SQLSTATE P0001 (EF maps → `LAST_ADMIN`). It early-returns for non-threatening transitions (OLD not an active admin; UPDATE that stays an active admin) and takes `pg_advisory_xact_lock(hashtext('usuarios_rh_admin_guard'))` BEFORE the `count(*)` so two concurrent demotions serialize and cannot write-skew to zero admins (RESEARCH Pitfall 3). Fires inside the DEFINER RPC and even for a raw service_role write.
- **USR-06 atomic mutate+audit (DB-only actions):** `gerir_usuario_rh_mutacao(p_actor,p_target,p_action,p_novo_papel)` reads `dados_antes` `FOR UPDATE` (NOT_FOUND → P0002), branches on action (mudar_papel/desativar → severidade `critico`; ativar → `aviso`), mutates (the UPDATE deliberately fires the anti-lockout trigger), then `PERFORM log_auditoria(..., p_categoria:='usuario')` — all in one transaction, so the row change and its audit row commit or roll back together.
- **USR-02/06 atomic create+audit:** `criar_usuario_rh_com_audit(p_actor,p_user_id,p_email,p_nome,p_cargo,p_papel)` INSERTs the usuarios_rh row (`primeiro_acesso=true, ativo=true, created_by=p_actor`; fires `trigger_criar_preferencias_padrao` AFTER INSERT in owner context) + the `criar` audit row and RETURNs the new id.
- **DEFINER hardening:** both RPCs are `SECURITY DEFINER SET search_path=public` with `REVOKE EXECUTE ... FROM public, authenticated, anon` — only the authorize-gated service_role EF (28-06) can invoke. The trigger fn is `REVOKE ALL ... FROM PUBLIC`.
- **Authoring discipline:** no BEGIN/COMMIT wrapper (D-22), idempotent trigger bind (`pg_trigger` IF NOT EXISTS) and `CREATE OR REPLACE` fns — ready for MCP `apply_migration` in 28-07.

## Task Commits

Each task was committed atomically (via `git -c core.hooksPath=/dev/null`):

1. **Task 1: usr_rh_anti_lockout migration (advisory-lock trigger)** - `29ba350` (feat)
2. **Task 2: usr_rh_mutacao_rpc migration (atomic mutate+audit RPCs)** - `12c35d9` (feat)

**Plan metadata:** _(this SUMMARY + STATE.md + ROADMAP.md — final commit)_

## Files Created/Modified
- `supabase/migrations/20260713000002_usr_rh_anti_lockout.sql` - `tg_usuarios_rh_anti_lockout()` (advisory-lock-before-count, P0001) + idempotent `trg_usuarios_rh_anti_lockout` BEFORE UPDATE OR DELETE bind + `REVOKE ALL FROM PUBLIC`. Coexists with `update_usuarios_rh_updated_at`. No BEGIN/COMMIT wrapper.
- `supabase/migrations/20260713000003_usr_rh_mutacao_rpc.sql` - `gerir_usuario_rh_mutacao(uuid,uuid,text,text)` + `criar_usuario_rh_com_audit(uuid,uuid,text,text,text,text)`, both SECURITY DEFINER SET search_path=public, each doing mutate + `log_auditoria(categoria='usuario')` in one tx, with `REVOKE EXECUTE FROM public,authenticated,anon`. No BEGIN/COMMIT wrapper.

## Decisions Made
- **Anti-lockout as a trigger, not just an EF check:** the CONTEXT Área 2 defense-in-depth is EF pre-count + DB trigger. Only the trigger is bypass-proof (fires inside the DEFINER RPC and for raw service_role), so it is authored here as the hard backstop; the friendly early `LAST_ADMIN` pre-count lives in the EF (28-06).
- **Advisory lock before count:** `pg_advisory_xact_lock(hashtext('usuarios_rh_admin_guard'))` is a fixed stable constant taken BEFORE the `count(*)`, so every admin-removing mutation contends on the same transaction-scoped lock — serializing concurrent demotions to defeat snapshot write-skew to zero admins. First advisory-lock use in the repo.
- **Signature pin:** RPC param names/types match 28-06's `.rpc()` call sites verbatim (`p_actor,p_user_id,p_email,p_nome,p_cargo,p_papel` / `p_actor,p_target,p_action,p_novo_papel`) so no contract drift is discovered only at the 28-08 PROD smoke.
- **Migration numbering:** `000002` (trigger) + `000003` (rpc) slot between 28-04's `000001` (rls) and `000004` (append-only), giving PROD apply order rls → trigger → rpc → append-only. The trigger must exist before the RPC's UPDATE would fire it.
- **severidade / log_auditoria mapping:** verified against the live 4-value `severidade_log` enum (info/aviso/erro/critico) and the verbatim `log_auditoria` signature (docs/sql/sql/25-functions-configuracoes.sql:63-77); `usuario` is a valid `categoria_log_auditoria` value.

## Deviations from Plan

None - plan executed exactly as written. Both migrations follow the plan's `<interfaces>` and 28-PATTERNS §usr_rh_mutacao_rpc / §usr_rh_anti_lockout shapes; signatures match 28-06's pinned `.rpc()` calls; numbering follows the plan's `files_modified` (000002/000003).

## Authentication Gates
None - files-only authoring plan; no external service, login, or secret required. PROD apply is 28-07 (a [BLOCKING] wave, MCP `apply_migration`).

## Issues Encountered
None. Both migration files pass their automated grep gates. The `log_auditoria` named params, the `usuarios_rh` INSERT columns (`user_id, email, nome_completo, cargo, role, primeiro_acesso, ativo, created_by`), the `severidade_log` enum values, and the RPC signatures were each verified against live schema/source before authoring.

## Known Stubs
None. These are trigger/RPC migrations with no UI or data-source wiring.

## Threat Flags
None. No new network endpoint, auth path, file access, or schema surface beyond the plan's `<threat_model>` (T-28-04 anti-lockout/write-skew, T-28-05 mutation-without-audit, T-28-08 SQL-injection-via-role, T-28-01 RPC-callable-by-non-admin). This plan ADDS the mitigations for T-28-04 (advisory-lock trigger) and T-28-05 (atomic mutate+audit) and hardens T-28-01 (REVOKE EXECUTE from client roles). p_papel/p_novo_papel are parameterized (no dynamic SQL string-building) — T-28-08 mitigated; the {recrutador,administrador} narrowing is the EF Zod layer's (28-06).

## User Setup Required
None - no external service configuration. Applied to PROD via Supabase MCP `apply_migration` in plan 28-07 (a [BLOCKING] wave, authorized by Fernando). Files-only here.

## Next Phase Readiness
- **28-06 (EF):** `criar_usuario_rh_com_audit` and `gerir_usuario_rh_mutacao` are authored with the exact param names the EF's `.rpc()` calls use — the EF can call them by name; the Deno test mocks these RPCs.
- **28-07 (apply):** both migrations are NO-BEGIN/COMMIT and idempotent (`CREATE OR REPLACE` / `pg_trigger` IF NOT EXISTS) — ready for MCP `apply_migration`. Recommended order: `000001` (rls) → `000002` (trigger) → `000003` (rpc) → `000004` (append-only). The trigger MUST apply before the RPC (the RPC's UPDATE fires it).
- **28-08 (smokes):** the RED behavioral smokes from 28-03 turn GREEN once applied — assert P0001 on a last-admin demote/deactivate/DELETE, a two-concurrent-demote race leaving ≥1 admin, one `categoria='usuario'` `logs_auditoria` row per mutation, and a forced-failure rollback taking both row change and audit row with it.
- **Concern (deferred, out of scope):** version-row reconcile for these files (MCP `apply_migration` writes a timestamp version, not the filename) is deferred to a DBMIG pass, exactly as prior phases' reconciles were deferred.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260713000002_usr_rh_anti_lockout.sql
- FOUND: supabase/migrations/20260713000003_usr_rh_mutacao_rpc.sql
- FOUND commit: 29ba350 (Task 1)
- FOUND commit: 12c35d9 (Task 2)

---
*Phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro*
*Completed: 2026-07-13*
