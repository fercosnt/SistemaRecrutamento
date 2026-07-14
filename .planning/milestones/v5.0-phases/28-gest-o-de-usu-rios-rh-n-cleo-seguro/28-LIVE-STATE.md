# Phase 28 — Live DB State Capture (Wave 0)

**Captured:** 2026-07-13 via Supabase MCP `execute_sql` (read-only; zero mutations).
**Purpose:** Resolve RESEARCH assumptions A1–A6 against PROD reality BEFORE authoring migrations (M4 24-01 discipline). 28-04 / 28-05 author against THIS, not against assumptions.

---

## A1 — `usuarios_rh` policies (LIVE)

| policyname | cmd | roles | qual | with_check | Verdict |
|---|---|---|---|---|---|
| `RH pode ler seu próprio perfil` | SELECT | {public} | `auth.uid() = user_id` | — | **PRESERVE** — this IS the own-row SELECT (A37/authStore.fetchProfile). Do NOT create a duplicate own-row policy (M4/SEC-08 OR-defeat). |
| `auth_admin_le_usuarios_rh` | SELECT | {supabase_auth_admin} | `true` | — | **PRESERVE** — SEC-09, auth-hook dependency. Never touch. |
| `usuarios_rh_authenticated_read` | SELECT | {authenticated} | `true` | — | **DROP** — roster leak (SEG-02). |
| `usuarios_rh_simple_read` | SELECT | {authenticated} | `true` | — | **DROP** — roster leak (SEG-02). |
| `RH pode atualizar seu próprio perfil` | UPDATE | {public} | `auth.uid() = user_id` | **(none)** | **DROP** — ⚠️ LIVE self-promotion hole: no `WITH CHECK` → any RH can `UPDATE ... SET role='administrador'` / `ativo=true` on own row. See "Extra finding" below. |

**Missing (to ADD in 28-04):** an **admin-only SELECT** policy (full roster) via the `LANGUAGE plpgsql SECURITY DEFINER` helper `is_active_rh_admin()` (recursion-safe). After the two `qual=true` drops, a non-admin RH sees only their own row; admin sees the roster; candidato sees nothing.

## A1b — `logs_auditoria` policies (LIVE)

| policyname | cmd | roles | qual | Verdict |
|---|---|---|---|---|
| `Sistema insere logs` | INSERT | {authenticated} | with_check `true` | **DROP** — append-only (USR-06). Only the DEFINER RPC `log_auditoria` (owner postgres, BYPASSRLS) inserts → drop does NOT break audit writes. |
| `Admin vê logs` | SELECT | {authenticated} | `EXISTS(usuarios_rh WHERE id = auth.uid() AND role='administrador' AND ativo AND deleted_at IS NULL)` | **KEEP** (out of phase scope). ⚠️ OBSERVATION: predicate uses `usuarios_rh.id = auth.uid()` but `auth.uid()` maps to `user_id`, not `id` → likely never matches (admin can't read logs). Pre-existing; audit-read UI is USR-10 (deferred). Not fixed here. |

**No UPDATE / DELETE policy exists** on `logs_auditoria` → append-only already holds at the policy layer. The ONLY delete path is the DEFINER `limpar_logs_antigos()` purge (A1c) — hardened in 28-04.

## A1c — `limpar_logs_antigos()` (LIVE, verbatim — source for the 28-04 byte-preserved diff)

`public.limpar_logs_antigos()` → `integer`, `LANGUAGE plpgsql SECURITY DEFINER`, `SET search_path TO 'public'`. Body deletes `WHERE created_at < v_data_limite AND severidade IN ('info','aviso')` (retention from `configuracoes_empresa.dias_retencao_logs`, default 730d), then logs a `categoria='sistema'` row.

**28-04 diff (RESEARCH Q2):** byte-preserve the entire body; add ONLY `AND categoria NOT IN ('usuario','seguranca')` to the DELETE WHERE, so user-management/security audit rows are never purged. Verified diff — not a blind CREATE OR REPLACE.

```
DELETE FROM logs_auditoria
WHERE created_at < v_data_limite
  AND severidade IN ('info', 'aviso');   -- 28-04 adds: AND categoria NOT IN ('usuario','seguranca')
```

## A2 — `custom_access_token_hook(event jsonb)` (LIVE, verbatim)

`LANGUAGE plpgsql STABLE SET search_path TO 'public'`. Reads `usuarios_rh` by `user_id` **`WHERE ativo = true AND deleted_at IS NULL`**, maps `recrutador→'rh'`, `administrador→'administrador'`, else candidato/candidato-default.

**Verdict: NOT TOUCHED this phase.** It ALREADY filters `ativo AND deleted_at IS NULL` → a deactivated (`ativo=false`) RH user's next token resolves to `candidato` (loses RH access). **USR-04 needs NO hook change** (RESEARCH A2 CONFIRMED). Preserving it also preserves `auth_admin_le_usuarios_rh` (SEC-09).

## A5 — triggers on `usuarios_rh` (LIVE)

| trigger | timing | fn | Note |
|---|---|---|---|
| `trigger_criar_preferencias_padrao` | AFTER INSERT | `criar_preferencias_padrao()` | Inserts `preferencias_notificacoes (usuario_rh_id=NEW.id, created_by=NEW.user_id)`. **Fires on the EF create path.** Runs inside the DEFINER RPC (postgres/BYPASSRLS) → INSERT succeeds. RESEARCH Q3 CONFIRMED present; body is safe (2 cols, no exotic NOT NULLs surfaced). The 28-02 Deno rollback test + 28-08 create smoke exercise it; createUser rollback compensates if it ever raises. |
| `update_usuarios_rh_updated_at` | BEFORE UPDATE | `update_updated_at_column()` | Standard `updated_at` bump. Harmless. The anti-lockout trigger (28-05) is a SEPARATE `BEFORE UPDATE OR DELETE` trigger — coexists. |

## cnt — active-administrador floor

**`SELECT count(*) FROM usuarios_rh WHERE role='administrador' AND ativo AND deleted_at IS NULL` = 4.** Anti-lockout floor (USR-07): the trigger must refuse any mutation that would drop this below 1.

## A4 — owners / BYPASSRLS

All relevant objects owned by **`postgres`, `rolbypassrls=true`**: tables `usuarios_rh` + `logs_auditoria`; procs `log_auditoria(...)`, `custom_access_token_hook(event jsonb)`, `limpar_logs_antigos()`. → The DEFINER audit-insert path (`log_auditoria`) writes regardless of the dropped authenticated INSERT policy. RESEARCH A4 CONFIRMED.

## A3 — SMTP / rate limit

**UNVERIFIED** (Auth→SMTP is dashboard-only, not SQL-visible). Consequence already designed for: the EF (28-06) treats `resetPasswordForEmail` failure as **non-fatal `EMAIL_SEND_FAILED`** (best-effort). Built-in SMTP is 2 emails/hr — flag custom SMTP for HUMAN-UAT if delivery is unreliable.

---

## Assumptions A1–A6 — Resolution

| # | Claim | Verdict |
|---|---|---|
| A1 | `usuarios_rh` carries two `qual=true` SELECT leaks | **CONFIRMED** — `usuarios_rh_authenticated_read` + `usuarios_rh_simple_read`. |
| A2 | Hook already filters `ativo AND deleted_at` → no change | **CONFIRMED** — body verbatim above. |
| A3 | SMTP config / rate limit | **UNVERIFIED** (dashboard) → non-fatal email path. |
| A4 | DEFINER audit owner is BYPASSRLS | **CONFIRMED** — postgres/bypassrls. |
| A5 | Live triggers on `usuarios_rh` incl. `trigger_criar_preferencias_padrao` | **CONFIRMED** — 2 triggers; create-path safe. |
| A6 | append-only holds (no UPDATE/DELETE policy) | **CONFIRMED** — only the `limpar_logs_antigos` purge deletes → hardened in 28-04. |

## Extra finding (DEVIATION — not in RESEARCH) → feeds 28-04

**`RH pode atualizar seu próprio perfil` (UPDATE, own-row, no `WITH CHECK`) is a LIVE self-promotion vector** — a `recrutador` can `UPDATE usuarios_rh SET role='administrador' WHERE user_id=auth.uid()`. This is SEG-03's threat, live today. **Grep of `src/` finds ZERO client writes to `usuarios_rh`** (authStore only SELECTs own-row; no `data_ultimo_login` writer in src) → **dropping this UPDATE policy is safe now, zero client regression**, and closes SEG-03 early. **28-04 must DROP it.** Phase 30 (A37 profile edit) will supply the replacement write path (EF or a `role`/`ativo`-excluded own-row UPDATE `WITH CHECK`).

## Migration authoring contract (for 28-04 / 28-05)

**28-04 — Policies to DROP:** `usuarios_rh_authenticated_read`, `usuarios_rh_simple_read`, `RH pode atualizar seu próprio perfil` (usuarios_rh); `Sistema insere logs` (logs_auditoria).
**28-04 — Policies to PRESERVE (do NOT re-create):** `RH pode ler seu próprio perfil` (own-row SELECT), `auth_admin_le_usuarios_rh` (SEC-09), `Admin vê logs`.
**28-04 — to ADD:** `is_active_rh_admin()` (plpgsql DEFINER) + one admin-only SELECT policy on `usuarios_rh`; `limpar_logs_antigos()` retention-exclusion diff.
**28-05 — anti-lockout:** floor is proven (4 admins); trigger `BEFORE UPDATE OR DELETE` with `pg_advisory_xact_lock` counts `role='administrador' AND ativo AND deleted_at IS NULL`, raises `LAST_ADMIN` (P0001) if it would reach 0. Coexists with `update_usuarios_rh_updated_at`.
**Hook:** NOT touched.
