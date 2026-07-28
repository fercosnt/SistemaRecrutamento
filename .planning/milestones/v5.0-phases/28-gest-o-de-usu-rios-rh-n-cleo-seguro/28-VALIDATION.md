---
phase: 28
slug: gest-o-de-usu-rios-rh-n-cleo-seguro
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-13
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Behavioral SQL smokes with impersonated JWT are the load-bearing gate — structural `pg_policies`/greps pass while a real leak persists (M4/SEC-07/08 lesson). Derived from `28-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit/component + grep-guards) · Deno test (EF handler w/ injected mock deps) · SQL behavioral smokes (impersonated JWT, PROD via MCP `execute_sql`) |
| **Config file** | `vite.config.ts` · `supabase/functions/deno.json` |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` |
| **Type-check** | `npm run lint` (tsc --noEmit; must not inflate the frozen baseline) |
| **Estimated runtime** | ~40s Vitest + ~15s Deno |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (scoped where possible)
- **After every plan wave:** Full suite (Vitest + Deno) + the SQL smokes relevant to that wave on PROD
- **Before `/gsd:verify-work` / `/gsd-secure-phase`:** Full suite green + `npm run lint` not above baseline + all SEG-01/02, USR-06/07 SQL smokes PASS
- **Max feedback latency:** ~60 seconds (unit/Deno); SQL smokes are per-wave

---

## Per-Requirement Verification Map

*(Planner refines to per-task IDs; every requirement below MUST have a green automated check or a PROD smoke before the phase gate.)*

| Req ID | Behavior | Threat Ref | Test Type | Automated / Smoke Command | File Exists | Status |
|--------|----------|-----------|-----------|---------------------------|-------------|--------|
| SEG-01 | Unauth invoke → 401; authenticated non-admin → 403; admin → dispatch | T-EoP | Deno test (injected getUser/usuarios_rh mocks) | `deno test … gerenciar-usuario-rh` | ❌ W0 | ⬜ pending |
| SEG-01 | No service_role key / privileged client in `src/` bundle | T-EoP | grep-guard (Vitest) | `npm run test:run` | ❌ W0 | ⬜ pending |
| SEG-02 | Candidato JWT + recrutador JWT `SELECT * FROM usuarios_rh` → **0 rows** (drops the live `qual=true` leaks) | T-Info | SQL smoke (impersonated JWT) | PROD smoke via MCP | ❌ W0 | ⬜ pending |
| SEG-02 | Admin JWT reads full roster; own-row read works for non-admin RH (`user_id=auth.uid()`) | T-Info | SQL smoke | PROD smoke | ❌ W0 | ⬜ pending |
| SEG-02 | `auth_admin_le_usuarios_rh` still present + `USING true` after migration | T-Tamper | SQL assertion (`pg_policies`) | PROD smoke | ❌ W0 | ⬜ pending |
| USR-07 | Demote/deactivate/delete the **last** active admin → raises `LAST_ADMIN` (P0001), 0 mutation | T-DoS | SQL smoke (single-admin fixture) | PROD smoke | ❌ W0 | ⬜ pending |
| USR-07 | Concurrency: two parallel demotions → exactly one succeeds, ≥1 admin remains (advisory-lock) | T-DoS | SQL smoke (2 sessions) | PROD smoke | ❌ W0 | ⬜ pending |
| USR-06 | DB-only mutation writes row change **and** one `logs_auditoria` row (`categoria='usuario'`) atomically; forced failure rolls back both | T-Repud | SQL smoke (disposable fixture) | PROD smoke | ❌ W0 | ⬜ pending |
| USR-06 | `criar_usuario_rh_com_audit` writes exactly one `logs_auditoria` row (`categoria='usuario'`, `acao='criar'`) atomically (create path, not only `ativar`) | T-Repud | SQL smoke (disposable fixture) | PROD smoke | ❌ W0 | ⬜ pending |
| USR-06 | `resetar_senha` audited best-effort (GoTrue-side): exactly one `logs_auditoria` row (`categoria='usuario'`, `acao='resetar_senha'`) — Deno spy (28-02) + audit-row-shape SQL smoke (28-03) | T-Repud | Deno test + SQL smoke | `deno test …` / PROD smoke | ❌ W0 | ⬜ pending |
| USR-06 | Candidato/recrutador JWT cannot INSERT/UPDATE/DELETE `logs_auditoria`; admin cannot UPDATE/DELETE either (append-only) | T-Tamper | SQL smoke | PROD smoke | ❌ W0 | ⬜ pending |
| USR-06 | Retention: `limpar_logs_antigos()` excludes `categoria IN ('usuario','seguranca')` — a `categoria='usuario'` row survives a simulated purge | T-Tamper | SQL smoke (disposable fixture) | PROD smoke | ❌ W0 | ⬜ pending |
| USR-02* | `criar` orphan-rollback: forced `usuarios_rh` insert failure → `deleteUser` called (no orphan GoTrue user) | T-Integrity | Deno test (mock admin.* + rpc) | `deno test …` | ❌ W0 | ⬜ pending |
| USR-05* | Recovery email path: `resetPasswordForEmail` invoked w/ correct `redirectTo`; send-failure → `EMAIL_SEND_FAILED` non-fatal | T-Info | Deno test | `deno test …` | ❌ W0 | ⬜ pending |

*USR-02/05 are P29 requirements, but the EF write-path + create/reset actions land here (SEG-01 surface); their handler-level tests belong to this phase's EF.*

---

## Wave 0 Requirements

- [ ] **Live-state capture** (resolves RESEARCH A1–A6): `pg_policies` on `usuarios_rh` + `logs_auditoria`; `pg_get_functiondef('custom_access_token_hook')`; `pg_get_functiondef('limpar_logs_antigos')`; `pg_get_triggerdef` on `usuarios_rh`; active-admin `count(*)`; function owners. Write `28-LIVE-STATE.md` (M4 24-01 discipline).
- [ ] `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts` — SEG-01 auth/authz + USR-02 rollback + email path + resetar_senha best-effort audit (injected deps, per `consolidar-decisao-final` precedent).
- [ ] SQL smoke harness for SEG-02 (roster leak), USR-07 (last-admin + concurrency), USR-06 (atomic audit for ativar + criar, resetar_senha audit-shape, append-only, retention exclusion) — impersonated JWT, disposable fixtures, cleanup.
- [ ] Grep-guard extension: no service_role / privileged client in `src/` (SEG-01).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recovery email actually delivered to the new/reset user's inbox | USR-02 / USR-05 | Depends on live SMTP config + GoTrue rate limit (built-in = 2/hr); email delivery is out-of-process | Create/reset a real test user; confirm the `/auth/redefinir-senha` email arrives and the OTP sets a password. Deferred to HUMAN-UAT. Flag if custom SMTP is needed. |
| Anti-lockout under real concurrent admin sessions | USR-07 | True parallelism needs 2 live sessions | The 2-session SQL smoke proves advisory-lock; a live double-click test confirms UX. |

---

*Nyquist: every phase requirement (SEG-01/02, USR-06/07) maps to a behavioral smoke or handler test above. `nyquist_compliant` flips to true when Wave 0 lands the harness files and the map has no ❌ without a scheduled task.*
