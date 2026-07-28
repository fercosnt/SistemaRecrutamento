---
phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro
verified: 2026-07-13T05:58:05Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Create a real RH user (action=criar) and reset a password (action=resetar_senha), then confirm the set-password/recovery email actually arrives in the target inbox and the /auth/redefinir-senha?tipo=rh link sets a password."
    expected: "Email is delivered; the recovery link lands on the RH set-password page and successfully sets a password. If custom SMTP is required (GoTrue built-in cap is ~2/hr), flag it."
    why_human: "Actual email delivery depends on live SMTP/GoTrue config and is out-of-process — no grep or SQL smoke can prove an inbox received it. The EF handler-level dispatch (resetPasswordForEmail with correct redirectTo, non-fatal on send failure) IS verified by the Deno test; only the live delivery leg is manual."
  - test: "USR-07 anti-lockout under TRUE concurrency: reduce the world to exactly two active admins (A,B) disposably, then in two overlapping DB sessions demote A and B simultaneously (per the documented 2-session script in usr_rh_anti_lockout_smoke.sql case 5)."
    expected: "Exactly ONE demotion commits; the second fails with SQLSTATE P0001 (LAST_ADMIN); afterward count(active administrador) >= 1. Restore the two admins."
    why_human: "A single SQL session cannot truly parallelize, so the advisory-lock write-skew defense (pg_advisory_xact_lock before the admin count) can only be proven with two overlapping live sessions. Single-session cases 1-4 (demote/deactivate/delete the last admin -> P0001; non-last demote succeeds) are proven GREEN on PROD."
---

# Phase 28: Gestão de Usuários RH — Núcleo Seguro Verification Report

**Phase Goal:** Existe — e é comprovadamente seguro — o núcleo de servidor para gerir contas RH: uma Edge Function service_role que autentica-DEPOIS-autoriza toda escrita de usuário sobre `usuarios_rh` com RLS admin-only, trilha de auditoria append-only e guarda anti-lockout server-enforced — zero service_role no client e a policy do auth-hook preservada.
**Verified:** 2026-07-13T05:58:05Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every privileged write served by an EF returning **401** (unauth) / **403** (non-admin) **before any write** (SEG-01) | ✓ VERIFIED | `gerenciar-usuario-rh/index.ts` handler: `getUser()` first (401 if null, L216-219), authorize from the **table** (`role='administrador' AND ativo AND deleted_at IS NULL`, L224-233 → 403) BEFORE dispatch (L251-258). Deno test **9/9 GREEN** locally: 401 asserts `rpcCalls.length===0` (no write); 403 for null-row + for `recrutador` (role read from `usuarios_rh`, not JWT). EF deployed PROD verify_jwt ON, boot smoke = 401 (28-07). |
| 2 | recrutador/candidato read **0** rows from `usuarios_rh`; admin reads full list; `auth_admin_le_usuarios_rh` still resolves all RH roles (SEG-02) | ✓ VERIFIED | Migration `20260713000001` drops the 2 `qual=true` roster leaks + the WITH-CHECK-less self-promotion UPDATE, adds recursion-safe `is_active_rh_admin()` DEFINER + `usuarios_rh_admin_select`, preserves `auth_admin_le_usuarios_rh` (SEC-09) + own-row policy. SEG-02 smoke (4 cases incl. SEC-09 `USING true` guard) ran **GREEN on PROD** (28-08). Live policy set post-apply = `[RH pode ler seu próprio perfil, auth_admin_le_usuarios_rh, usuarios_rh_admin_select]` (28-07). |
| 3 | Server refuses to remove/demote/deactivate the **last active administrador** (USR-07) | ✓ VERIFIED (single-session; concurrency → human) | Migration `20260713000002`: `trg_usuarios_rh_anti_lockout` BEFORE UPDATE OR DELETE, advisory-lock before count, `RAISE P0001`. EF defense-in-depth `wouldBreakAdminFloor` pre-count (L161-192). USR-07 smoke cases 1-4 (demote/deactivate/delete last admin → P0001, 0 mutation; non-last demote succeeds) **GREEN on PROD**. `is_active_rh_admin`/RPCs confirmed present in `database.types.ts` (regenerated `--linked`). Case 5 (2-session write-skew) → human item. |
| 4 | Each management action appends **one immutable** audit row (actor, target, action, timestamp) — append-only (USR-06) | ✓ VERIFIED | Migration `20260713000003` atomic mutate+audit RPCs (`gerir_usuario_rh_mutacao`, `criar_usuario_rh_com_audit` — mutation + `log_auditoria` in ONE tx, EXECUTE REVOKEd). Migration `20260713000004` drops the forgeable `Sistema insere logs` INSERT policy, `REVOKE INSERT,UPDATE,DELETE … FROM authenticated, anon`, purge-exempts `categoria IN ('usuario','seguranca')`. USR-06 smoke (6 cases: atomic mutate, atomic create, rollback-together, INSERT-denied ×2, admin UPDATE/DELETE denied, resetar_senha shape) **GREEN on PROD** (28-08). |
| 5 | No service_role/admin client in the client bundle (SEG-01 invariant) | ✓ VERIFIED | SEG-01 grep-guard `no-service-role-src.grep.test.ts` **5/5 GREEN** locally (comment-aware; scans `src/`). Independent grep of `src/` finds only doc-comment prose mentions; `src/lib/supabase/client.ts:63` documents `supabaseAdmin` REMOVED. |

**Score:** 5/5 truths verified (SC3 concurrency leg and recovery-email delivery routed to human verification, not gaps).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/gerenciar-usuario-rh/index.ts` | authenticate-THEN-authorize EF, admin-only, 5 actions | ✓ VERIFIED | 500 lines; two-client D-23; auth→authz→parse→dispatch; orphan-rollback (deleteUser on RPC fail); best-effort email + audit. Not a stub. |
| `supabase/functions/_shared/usuario-rh-schemas.ts` | `.strict()` discriminated union + error vocabulary | ✓ VERIFIED | 5-branch discriminated union, `papel` narrowed to {recrutador, administrador}, `zodPathToFieldName`. Imported by EF (import chain resolves — Deno test passes). |
| `migrations/20260713000001_usr_rh_rls_seg02.sql` | drop leaks + DEFINER helper + admin SELECT | ✓ VERIFIED (applied PROD) | Substantive; leaks + self-promotion UPDATE dropped live (28-07). `is_active_rh_admin` present in `database.types.ts`. |
| `migrations/20260713000002_usr_rh_anti_lockout.sql` | BEFORE UPDATE OR DELETE anti-lockout trigger | ✓ VERIFIED (applied PROD) | advisory-lock + P0001; trigger present live (28-07); smoke GREEN. |
| `migrations/20260713000003_usr_rh_mutacao_rpc.sql` | atomic mutate+audit / create+audit RPCs | ✓ VERIFIED (applied PROD) | Both RPCs present in `database.types.ts`; EXECUTE REVOKEd; smoke GREEN. |
| `migrations/20260713000004_logs_auditoria_append_only.sql` | drop forgeable INSERT + REVOKE + retention exclusion | ✓ VERIFIED (applied PROD) | `Sistema insere logs` gone live (28-07); byte-preserved diff of `limpar_logs_antigos`; smoke GREEN. |
| `.../__tests__/index.test.ts` | 401/403/rollback/email/audit handler tests | ✓ VERIFIED | 9/9 GREEN locally. |
| `src/__tests__/guards/no-service-role-src.grep.test.ts` | SEG-01 bundle tripwire | ✓ VERIFIED | 5/5 GREEN locally. |
| `supabase/tests/usr_rh_{seg02,anti_lockout,audit_append_only}_smoke.sql` | behavioral impersonated-JWT smokes | ✓ VERIFIED | Substantive real assertions (RAISE on FAIL); all GREEN on PROD (28-08). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| EF `handler` | `usuarios_rh` (authorize) | `supabaseAdmin.from('usuarios_rh').select('role').eq(user_id).eq(ativo).is(deleted_at)` before dispatch | ✓ WIRED | L224-233; role read from table, `!== 'administrador'` → 403. |
| EF `handleMutacao` | `gerir_usuario_rh_mutacao` RPC | `supabaseAdmin.rpc('gerir_usuario_rh_mutacao', {p_actor,p_target,p_action,p_novo_papel})` | ✓ WIRED | L365-370; param names match migration signature; P0001→LAST_ADMIN, P0002→NOT_FOUND. |
| EF `handleCriar` | `criar_usuario_rh_com_audit` RPC | `supabaseAdmin.rpc(...)` after `createUser`, compensating `deleteUser` on error | ✓ WIRED | L301-319; orphan-rollback asserted by Deno test. |
| RPCs | `logs_auditoria` | `PERFORM log_auditoria(... categoria='usuario' ...)` same tx | ✓ WIRED | Atomic; rollback-together proven by smoke case 3. |
| anti-lockout trigger | mutate RPC UPDATE | `BEFORE UPDATE OR DELETE` fires inside DEFINER RPC + service_role path | ✓ WIRED | Bypass-proof backstop; smoke cases 1-3 GREEN. |
| RLS `usuarios_rh_admin_select` | `is_active_rh_admin()` | `USING (public.is_active_rh_admin())` | ✓ WIRED | Recursion-safe DEFINER predicate. |
| EF (Phase 28) | RH console UI | (deferred to Phase 29 by design) | ℹ️ N/A | Phase 28 goal is the server-side núcleo; Phase 29 wires the `/rh/configuracoes` console to this write-path. Not an orphan for this phase. |

### Behavioral Spot-Checks (run locally this verification)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SEG-01 bundle guard | `vitest run …/no-service-role-src.grep.test.ts` | 5 passed | ✓ PASS |
| EF auth/authz/rollback/email/audit | `deno test … gerenciar-usuario-rh` | 9 passed / 0 failed | ✓ PASS |
| tsc baseline held | `npm run lint` (grep error TS) | 104 errors (baseline) | ✓ PASS |
| 3 new fns exist on PROD (independent) | `grep … database.types.ts` (regen `--linked`) | criar_usuario_rh_com_audit / gerir_usuario_rh_mutacao / is_active_rh_admin all present | ✓ PASS |

### Probe / Smoke Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| SEG-02 roster leak | `usr_rh_seg02_smoke.sql` (PROD via MCP, 28-08) | GREEN (candidato 0 / recrutador own-row / admin full / SEC-09 preserved) | ✓ PASS (orchestrator PROD run; file substantive, re-read this verification) |
| USR-07 last-admin | `usr_rh_anti_lockout_smoke.sql` cases 1-4 (PROD, 28-08) | GREEN (P0001 on demote/deactivate/delete last; non-last succeeds) | ✓ PASS |
| USR-06 atomic + append-only | `usr_rh_audit_append_only_smoke.sql` 6 cases (PROD, 28-08) | GREEN (atomic mutate/create, rollback-together, INSERT/UPDATE/DELETE denials, reset shape) | ✓ PASS |
| USR-07 concurrency (case 5) | 2-session write-skew | not runnable single-session | → HUMAN |

*Note: the three PROD smokes were executed by the orchestrator via Supabase MCP `execute_sql` (28-08). As a subagent the verifier cannot re-issue MCP calls, but the smoke files were re-read and confirmed to contain real behavioral assertions (RAISE EXCEPTION on failure, not no-op), and `database.types.ts` regenerated from the linked remote independently confirms the RPCs/predicate exist on PROD — corroborating the GREEN claim beyond SUMMARY prose.*

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| USR-06 | 28-03/04/05/06 | Append-only audit (ator, alvo, ação, timestamp) | ✓ SATISFIED | Atomic mutate+audit RPCs + append-only migration; smoke 6/6 GREEN. |
| USR-07 | 28-05 | Server-enforced anti-lockout (≥1 active admin) | ✓ SATISFIED | Trigger + EF pre-count; smoke cases 1-4 GREEN (concurrency → human). |
| SEG-01 | 28-02/06/07 | authenticate-THEN-authorize EF; zero service_role in client | ✓ SATISFIED | Deno 9/9 + grep-guard 5/5; EF deployed verify_jwt ON. |
| SEG-02 | 28-04 | RLS admin-only roster; auth-hook policy preserved | ✓ SATISFIED | Leaks dropped live; SEG-02 smoke 4/4 GREEN incl. SEC-09 guard. |

No orphaned requirements: REQUIREMENTS.md maps exactly USR-06/07, SEG-01/02 to Phase 28, all claimed by plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No `TBD`/`FIXME`/`XXX`; no stub returns; no placeholder | ℹ️ Info | Clean. (grep TODO false-positive on `index.ts:211` is a legitimate HTTP-405 handler, not a debt marker.) |

**Known accepted deviations (documented in migration headers + summaries, not gaps):**
- MCP `apply_migration` records version rows by its own timestamp → cosmetic ledger drift vs the `20260713000001..04` filenames; reconcile deferred to the M5 DBMIG follow-up (M2–M4 precedent). Schema objects proven present on PROD via `db:types --linked` + GREEN smokes.
- The preserved own-row SELECT policy `RH pode ler seu próprio perfil` is live-drift (no migration file yet); preserved (not re-created) to avoid a duplicate permissive policy; its file reconciliation is deferred to DBMIG, like SEC-09.

### Human Verification Required

**1. Recovery / set-password email actually delivered (USR-02 / USR-05 leg of the EF)**
- **Test:** Create a real RH user (`action=criar`) and reset a password (`action=resetar_senha`); confirm the email arrives and `/auth/redefinir-senha?tipo=rh` sets a password.
- **Expected:** Delivery succeeds and the link works. Flag if custom SMTP is needed (GoTrue built-in ≈ 2/hr).
- **Why human:** Live SMTP/GoTrue delivery is out-of-process. The EF dispatch (correct `redirectTo`, non-fatal on send failure) is already verified by the Deno test.

**2. USR-07 anti-lockout under true concurrent admin sessions (smoke case 5)**
- **Test:** Reduce to exactly two active admins disposably; demote both in two overlapping DB sessions (script in `usr_rh_anti_lockout_smoke.sql` case 5).
- **Expected:** Exactly one commits; the other fails P0001; ≥1 active admin remains. Restore the two admins.
- **Why human:** True parallelism (advisory-lock write-skew) needs two live sessions. Single-session cases 1-4 are GREEN on PROD.

### Gaps Summary

No gaps. All 5 ROADMAP success criteria are verified in the codebase and on PROD: the privileged write-path EF authenticates-then-authorizes (401/403 before any write, admin-only from the table), the roster is RLS admin-only with the SEC-09 auth-hook policy preserved, the anti-lockout trigger + EF pre-count refuse last-admin removal, every management action writes exactly one immutable append-only audit row atomically, and no service_role/admin client ships in the client bundle. Two items are routed to a live HUMAN-UAT (recovery-email delivery and the 2-session concurrency proof) — these are confirmatory and depend on out-of-process resources (SMTP, true parallelism), not missing implementation. Per the status decision tree, the presence of human verification items makes the phase status `human_needed` even though the score is 5/5.

---

_Verified: 2026-07-13T05:58:05Z_
_Verifier: Claude (gsd-verifier)_
