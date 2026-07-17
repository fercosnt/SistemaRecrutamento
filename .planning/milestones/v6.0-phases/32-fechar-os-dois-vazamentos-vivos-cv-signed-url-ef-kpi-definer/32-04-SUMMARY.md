---
phase: 32-fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer
plan: 04
status: complete
completed: 2026-07-15
requirements: [SEG-01, SEG-02]
---

# 32-04 SUMMARY — [BLOCKING] Take Phase 32 live + prove with the behavioral gate

**Executed by the orchestrator (non-autonomous gate) with the operator's explicit authorization (AskUserQuestion → "Autorizar go-live em PROD").** Ordered exactly per the sequencing landmine.

## Live actions (PROD), in order
1. **Deployed EF `get-curriculo-url`** (JWT-ON, `verify_jwt: true`, version 1 ACTIVE) via `supabase functions deploy`. Env obstacle: the local Docker edge-runtime rejected `deno.lock` v5 — worked around by moving `deno.lock` aside for the deploy, then restoring it (no code change; not the MCP deploy path).
2. **Applied Migration A** (`20260715000001`) via MCP `apply_migration` — dropped the RH role-only branch of `curriculos_select_own_or_rh`, own-folder + uploads intact.
3. **Applied Migration B** (`20260715000002`) via MCP — `funil_kpis` DEFINER (PII-safe) + `rh_le_historico` WR-04 hardening.
4. **Reconciled the ledger** — MCP wrote timestamp versions (`20260715202354` / `202417`); UPDATEd `supabase_migrations.schema_migrations` to the filename versions `20260715000001` / `20260715000002`.
5. **Regenerated `database.types.ts`** (ROOT) — `funil_kpis` now present.
6. **Ran `seg32_smokes.sql`** via MCP `execute_sql` (result-returning variant) — the load-bearing gate.

## ⭐ The behavioral smoke caught a SECOND live leak the plan missed (SEG-01)
On the first smoke run, assertion (a) FAILED (`recruiter A read 1 curriculos row`). Investigation of `pg_policy` showed **TWO** role-only RH read policies on the `curriculos` bucket:
- `curriculos_select_own_or_rh` — fixed by Migration A (the one the scout/plan found), AND
- **`RH lê currículos`** — a SEPARATE `EXISTS (SELECT 1 FROM usuarios_rh WHERE user_id=auth.uid() AND ativo)` policy the plan never identified → any active RH read any CV, no vaga scope.

This is the exact P24-class failure mode the phase's premise warns about: structural inspection of ONE policy passes while a second role-only policy keeps the leak open. **Dropped `RH lê currículos`** (`DROP POLICY IF EXISTS "RH lê currículos" ON storage.objects`) — completing the authorized SEG-01 intent ("remove the role-only RH read path"). Added this DROP to the Migration A file so a clean-room replay reproduces the fix.

## Fixture bugs the go-live surfaced (fixed in the committed `seg32_smokes.sql`)
- **`vagas.created_by` HAS a FK** (`vagas_created_by_fkey`) — the plan/scout assumed none. Synthetic recruiter UUIDs → 23503. Fixed: the smoke now **dynamically discovers 2 distinct real `usuarios_rh` users owning ZERO vagas** (deterministic scope) + 1 for admin. (Note: a real `role='recrutador'` account DOES exist — `fba9bc0f…` — contra the research's "0 recruiter accounts".)
- **`storage.objects` has a `protect_delete()` trigger** blocking direct DELETE unless `storage.allow_delete_query='true'` — the smoke now sets that session GUC before the fixture pre-delete + cleanup.

## Behavioral smoke — 5/5 PASS (JWT-impersonated, real principals, disposable fixture, ROLLBACK-free)
- **(a)** direct `storage.objects` read: recruiter A → 0 rows (both role-only RH branches gone); owning candidate → 1 row (own-folder intact). PASS
- **(b)** recruiter A `funil_kpis()` → all-empty (no vaga-B leak). PASS
- **(c)** recruiter A direct SELECT vaga-B `historico_candidatura` → 0 rows (rh_le_historico WR-04). PASS
- **(d)** recruiter B `funil_kpis()` → owned aggregates, PII-free (no ator/candidate identity key). PASS
- **(e)** administrador bypass + `p_vaga_id` narrowing (vagaB→1, empty vagaA→{}) + reads all historico. PASS
- Disposable fixture cleaned up (no PROD rows mutated).

## Full gate
- `npm run test:run` → **901/901 GREEN** (deno EF test + extended guards added coverage vs P31's 897)
- `npm run lint` (tsc) → **104 — baseline held**
- `npm run build` → **0 errors**, PERF-03 chunk assertions PASSED

## Requirements
SEG-01 (CV leak — both role-only RH read policies removed; EF is the single privileged RH CV path, authenticate-THEN-authorize) + SEG-02 (funil_kpis DEFINER vaga-scoped PII-safe + rh_le_historico WR-04) — both LIVE and behaviorally proven. Phase 32 is the BLOCKING gate for Phase 34, now unblocked.

## Landmines obeyed
- Sequencing: EF deployed BEFORE dropping the Storage policy (RH CV path never broken).
- `funil_kpis` PII-safe by construction (no ator/candidate join); DEFINER search_path=''.
- Ledger reconciled; types regenerated at repo ROOT.
- The trigger `avancar_etapa()` untouched.
