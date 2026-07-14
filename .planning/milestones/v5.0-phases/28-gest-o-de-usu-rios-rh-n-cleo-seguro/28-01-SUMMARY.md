# Plan 28-01 Summary — Wave-0 Live-State Capture

**Status:** Complete
**Requirements:** SEG-02, USR-07, USR-06 (traceability capture)
**Autonomous:** false (PROD read via Supabase MCP `execute_sql`, orchestrator-run, read-only)

## What was done

Captured the LIVE PROD state of every object Phase 28 mutates, resolving RESEARCH assumptions A1–A6 → `28-LIVE-STATE.md`. All reads only; zero mutations.

## Key findings

- **SEG-02 leak CONFIRMED:** `usuarios_rh` carries two `qual=true` `{authenticated}` SELECT policies (`usuarios_rh_authenticated_read`, `usuarios_rh_simple_read`) — the roster is readable by anyone authenticated today. Both DROP in 28-04.
- **Own-row SELECT already exists** (`RH pode ler seu próprio perfil`, `auth.uid()=user_id`) → 28-04 PRESERVES it, does NOT create a duplicate (M4/SEC-08 OR-defeat avoidance). `auth_admin_le_usuarios_rh` (SEC-09) present + `USING true` → PRESERVE.
- **DEVIATION (extra finding, not in RESEARCH):** `RH pode atualizar seu próprio perfil` (UPDATE, own-row, no WITH CHECK) is a **live self-promotion hole** (`SET role='administrador'`). Grep confirms **zero client writes to `usuarios_rh`** → safe to DROP now, zero regression, closes SEG-03 early. Added to 28-04's DROP list.
- **USR-04 needs NO hook change:** `custom_access_token_hook` already filters `ativo AND deleted_at IS NULL` (captured verbatim). NOT touched this phase.
- **Anti-lockout floor = 4** active administradores (USR-07).
- **Append-only:** `logs_auditoria` has an authenticated INSERT policy (`Sistema insere logs`) to DROP; no UPDATE/DELETE policy; only delete path is `limpar_logs_antigos()` (captured verbatim) → 28-04 excludes `categoria IN ('usuario','seguranca')` from the 730-day purge (RESEARCH Q2). All objects owned by postgres/BYPASSRLS → DEFINER audit insert survives the INSERT-policy drop.
- `Admin vê logs` SELECT predicate uses `usuarios_rh.id = auth.uid()` (should be `user_id`) — likely broken; pre-existing, audit-read UI is USR-10 (deferred), NOT fixed here.
- Create-path trigger `trigger_criar_preferencias_padrao` (AFTER INSERT) is safe (runs in DEFINER context).

## Key files
- created: `.planning/phases/28-gest-o-de-usu-rios-rh-n-cleo-seguro/28-LIVE-STATE.md`

## Self-Check: PASSED
A1–A6 each have a CONFIRMED/DEVIATION verdict; "Policies to DROP/PRESERVE/ADD" enumerated; admin floor (4) recorded; hook-touch decision (NO) recorded; `limpar_logs_antigos()` verbatim body captured. No PROD object mutated.
