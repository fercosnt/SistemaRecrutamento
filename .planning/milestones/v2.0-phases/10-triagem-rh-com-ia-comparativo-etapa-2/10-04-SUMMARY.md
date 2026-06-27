# Plan 10-04 SUMMARY — [BLOCKING] PROD apply

**Plan:** 10-04 (triagem-prod-apply)
**Type:** checkpoint:human-verify (autonomous: false)
**Executed:** 2026-06-09 by the orchestrator via Supabase MCP + CLI, under user authorization ("Reautorizo o MCP — você aplica").
**Status:** complete — all 6 acceptance criteria met.

## What was applied to live PROD (project `isljnozzlvckrgjjbjwp`)

1. **3 migrations applied** via Supabase MCP `apply_migration` (auto-recorded in `supabase_migrations`; no 42601 — the no-wrapper authoring held even for the PL/pgSQL `$$` bodies):
   - `20260610000001_analise_tables` — `analise_candidato_vaga` + `comparativo_solicitado` + RLS (candidato DENY, RH/admin SELECT) + indexes.
   - `20260610000002_analise_trigger` — `trg_candidaturas_analise` AFTER INSERT (survivor-only pg_net dispatch).
   - `20260610000003_reprocessar_rpc` — `reprocessar_analise(uuid)` SECURITY DEFINER (own-vaga guarded).
2. **Prompt activation (Pitfall 2 closed):** `UPDATE prompt_versions SET is_active=true WHERE call_type IN ('cv_job_match','comparative_ranking') AND is_canary=false` — both now `is_active=true` (verified).
3. **Both Edge Functions deployed** via supabase CLI (auto-bundles `_shared`):
   - `analise-candidato-individual` — **--no-verify-jwt** (Bearer self-auth), script 435.2 kB.
   - `comparativo-candidatos` — JWT verify ON (no flag), script 432.3 kB.
4. **`database.types.ts` regenerated** at repo ROOT (`npm run db:types`) — now exposes `analise_candidato_vaga` + `comparativo_solicitado`. Committed `1236b03`.

## Live verification

| Check | Result |
|-------|--------|
| 3 migrations recorded | ✅ list_migrations shows 000001/000002/000003 |
| prompts is_active | ✅ cv_job_match=true, comparative_ranking=true |
| reprocessar_analise | ✅ exists, prosecdef=true (SECURITY DEFINER) |
| 2 new tables present | ✅ |
| candidaturas guard cols (status, opcao_knockout_id) | ✅ both present |
| trigger trg_candidaturas_analise | ✅ installed |
| comparativo no-auth curl | ✅ HTTP 401 (JWT-ON evidence) |
| EF secrets ANTHROPIC_API_KEY + OPENAI_API_KEY | ✅ both set |

## SQL smokes (10-SQL-SMOKES.md)

| Smoke | Result |
|-------|--------|
| SMOKE-1 — trigger survivor/knockout gate | ⚠️ trigger installed + survivor guard in place; **actual pg_net dispatch firing deferred to live UAT**. The Vault secrets (`project_url`/`edge_invoke_key`) are not visible to the MCP query role (they read fine only inside the SECURITY DEFINER function context); the trigger gracefully skips if absent. Real dispatch is observable only by submitting a live candidatura — left for UAT to avoid PROD side effects. |
| SMOKE-2 — candidato RLS DENY | ✅ candidato sees **0 rows** |
| SMOKE-3 — RH + admin SELECT | ✅ rh=1, admin=1 |
| SMOKE-4 — UNIQUE(candidatura_id) upsert | ✅ exactly 1 row, latest (score 73, sucesso) wins |
| SMOKE-5 — comparativo audit row | ✅ ids_n=2, has_ranking=true, latencia_ms=1840 |
| BONUS — reprocessar_analise candidato denial (T-10-22) | ✅ raised `42501: forbidden` for candidato caller |

Test fixtures cleaned up — both tables back to 0 rows.

## Open items for UAT (Wave 6 / phase verification)
- **SMOKE-1 live dispatch:** submit a real survivor candidatura post-knockout, confirm an `analise_candidato_vaga` row appears in ≤30s (TRIAGEM-01 SLA). If it doesn't, confirm Vault `project_url` + `edge_invoke_key` exist (Phase 9 P07) — the trigger skips silently when they're absent.
- The `unpdf@0.11.0` CV-extraction path exercises only on a real candidatura with a PDF CV.

## Deviation
- Used MCP `apply_migration` (records version rows automatically) instead of `db push --linked` + manual reconcile — cleaner, same end state. `supabase migration list` reflects all three. The `supabase_migrations` table is authoritative; local migration files match.
