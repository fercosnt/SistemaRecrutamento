# Plan 28-08 Summary — [BLOCKING] Behavioral SQL smokes GREEN on PROD + phase gate

**Status:** Complete
**Requirements:** SEG-01, SEG-02, USR-06, USR-07 (live-proven)
**Autonomous:** false (PROD smokes via Supabase MCP, orchestrator-run)

## What was done

Ran the three behavioral SQL smokes (authored RED in 28-03) against the applied PROD state (28-07). All GREEN (no assertion raised). Impersonated-JWT, disposable fixtures, ROLLBACK-free cleanup — zero residue, admin floor restored to 4.

## Smoke results (PROD)

**SEG-02 (`usr_rh_seg02_smoke.sql`)** — GREEN + independently re-confirmed:
- candidato JWT → **0** `usuarios_rh` rows; recrutador → own row only; **admin → full roster**; `auth_admin_le_usuarios_rh` preserved (USING true). The `is_active_rh_admin()` DEFINER predicate resolves `auth.uid()` correctly under `SET ROLE authenticated`.

**USR-07 (`usr_rh_anti_lockout_smoke.sql`)** — GREEN (cases 1–4; case 5 is the documented 2-session concurrency proof):
- demote / deactivate / delete the **last** active admin → `P0001` (LAST_ADMIN), row unchanged; demoting a **non-last** admin succeeds (not over-eager). Real admins deactivated only inside always-unwound subtransactions → floor restored to 4.

**USR-06 (`usr_rh_audit_append_only_smoke.sql`)** — GREEN (6 cases):
- atomic mutate (`ativar`) → exactly 1 `categoria='usuario'` audit row; atomic create (`criar_usuario_rh_com_audit`) → row + 1 `acao='criar'` audit row; **rollback-together** (NOT_FOUND → 0 audit rows); append-only INSERT **denied** for candidato + recrutador; admin UPDATE/DELETE on `logs_auditoria` **denied**; `resetar_senha` audit shape recorded.

## Smoke fix applied (test-only, not a product defect)

The USR-06 smoke initially failed with `23503 usuarios_rh_updated_by_fkey` — it passed a **synthetic** actor UUID, but the RPC correctly sets `updated_by`/`created_by = p_actor`, which is FK'd to `auth.users`. In production the EF passes the real admin `user_id` from `getUser()`, so the RPC is correct. Fixed the authored smoke to derive the actor from the captured real admin uid (`current_setting('smoke6.admin_uid')`). Re-ran → GREEN. The FK error aborted the whole tx → no residue.

## Phase gate

- **Vitest 775/775** · **Deno EF corpus 201/0** · **tsc 104** (baseline held) · build green (verified 28-06 post-merge).

## Self-Check: PASSED
All 3 smokes GREEN on PROD; zero residue (leftover_rh=0, leftover_logs=0); admin floor=4; full local suite green. SEG-01 (EF 401/403 + no service_role in client bundle) proven by the 28-02 Deno test (9/9) + grep-guard + the 28-07 boot smoke (401). Phase 28's 5 ROADMAP success criteria are live-verified.
