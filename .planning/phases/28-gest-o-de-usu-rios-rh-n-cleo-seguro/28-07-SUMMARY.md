# Plan 28-07 Summary — [BLOCKING] Apply migrations + deploy EF (PROD)

**Status:** Complete
**Requirements:** SEG-01, SEG-02, USR-06, USR-07 (live)
**Autonomous:** false (PROD apply via Supabase MCP + CLI deploy, orchestrator-run under Fernando's standing PROD authorization)

## What was done

1. **Applied the 4 authored migrations to PROD via Supabase MCP `apply_migration`** (bypasses 42601; each writes its own version row) in dependency order:
   - `usr_rh_rls_seg02` — `is_active_rh_admin()` plpgsql DEFINER + drop 2 `qual=true` roster leaks + drop the self-promotion UPDATE policy + `usuarios_rh_admin_select`.
   - `usr_rh_anti_lockout` — `tg_usuarios_rh_anti_lockout()` + `trg_usuarios_rh_anti_lockout` (BEFORE UPDATE OR DELETE, advisory-lock, P0001).
   - `usr_rh_mutacao_rpc` — `gerir_usuario_rh_mutacao` + `criar_usuario_rh_com_audit` (atomic mutate+audit, REVOKEd).
   - `logs_auditoria_append_only` — drop `Sistema insere logs` INSERT policy + REVOKE + `limpar_logs_antigos()` retention exclusion.
2. **Deployed the EF `gerenciar-usuario-rh`** via `supabase functions deploy` (auto-bundles `_shared` + `deno.json` zod import map; verify_jwt ON). script size 2.93MB.
3. **Regenerated `database.types.ts`** at repo ROOT via `npm run db:types` (CLI, --linked) — the 3 new functions present; tsc baseline held at 104.

## Live verification (post-apply, via MCP + curl)

- `usuarios_rh` policies = `[RH pode ler seu próprio perfil, auth_admin_le_usuarios_rh, usuarios_rh_admin_select]` — the two `qual=true` roster leaks AND the WITH-CHECK-less self-promotion UPDATE policy are **GONE**.
- `logs_auditoria` policies = `[Admin vê logs]` — the forgeable authenticated INSERT policy (`Sistema insere logs`) is **GONE** (append-only).
- `trg_usuarios_rh_anti_lockout` present = true.
- `auth_admin_le_usuarios_rh` (SEC-09) intact + `qual='true'` (untouched).
- 3 new functions present (`is_active_rh_admin`, `gerir_usuario_rh_mutacao`, `criar_usuario_rh_com_audit`).
- **EF boot smoke: POST with no Authorization → HTTP 401** (verify_jwt gateway + EF guard).
- `custom_access_token_hook` NOT touched (already filters ativo/deleted — USR-04 needs no hook change).

## Ledger note

MCP `apply_migration` records version rows by its own timestamp, not the filename version (M2–M4 precedent) → cosmetic ledger drift vs the `20260713000001..04` filenames. Version-row reconcile is deferred to the M5 DBMIG follow-up (already tracked), consistent with the migration file headers.

## Self-Check: PASSED
All 4 migrations applied (each returned success); EF deployed + 401 boot smoke; types regenerated; SEC-09 + hook intact; leaks + self-promotion + forgeable-audit-insert all removed live. The 28-08 behavioral smokes now run GREEN against this applied state.
