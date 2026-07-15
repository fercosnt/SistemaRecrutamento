---
phase: 31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil
plan: 06
status: complete
completed: 2026-07-14
requirements: [OPER-01, OPER-02, OPER-03, OPER-04]
---

# 31-06 SUMMARY — [BLOCKING] Apply reject-RPC migration to PROD + smokes + regen types

**Executed by the orchestrator (non-autonomous gate) with the operator's explicit authorization (AskUserQuestion → "Autorizar apply em PROD").**

## What went live (PROD)
- **Migration applied** via Supabase MCP `apply_migration`: enum `public.motivo_rejeicao_rh` (6 pt-BR values) + `SECURITY DEFINER` RPC `public.rejeitar_candidatura(uuid, motivo_rejeicao_rh, text)` (server `btrim`+`char_length>=50` RAISE, WR-04 vaga-owner guard, early-terminal guard, single `UPDATE candidaturas` → trigger writes the one audit row) + DROP of the two dead M1 overloads.
- **DROP-signature correction (live catch):** the migration file dropped `rejeitar_candidato(uuid, text, uuid)`, but the LIVE identity signature is `rejeitar_candidato(uuid, uuid, text)` (args `candidatura_uuid, usuario_rh_uuid, motivo`) — `database.types.ts:4620` rendered the arg order misleadingly. The `(uuid,text,uuid)` DROP was a no-op; the correct `(uuid,uuid,text)` overload was dropped via `execute_sql` and the migration file was corrected for clean-room replay. `avancar_etapa(uuid,uuid)` dropped cleanly on the first apply. **The zero-arg trigger fn `avancar_etapa()` is intact and still bound to `candidaturas_avancar_etapa_trg`** (verified pre- and post-apply).

## Behavioral smokes — 5/5 PASS (JWT-impersonated, disposable fixture, ROLLBACK-free)
Run via MCP `execute_sql` (result-returning variant so PASS/SKIP is visible, not swallowed NOTICEs). `ready=y`, `setup_err=null` (fixture genuinely built, not skipped):
- **(a)** authorized owner + `<50` justificativa → `check_violation` (OPER-02 — server is the authority, not the client counter). PASS
- **(e)** cross-recruiter (owns no vaga) → `insufficient_privilege` 42501 (WR-04 IDOR guard). PASS
- **(c)** bare regression UPDATE with empty justificativa → RAISEd by the reused `avancar_etapa` trigger (OPER-03). PASS
- **(b/d)** valid owner reject → exactly ONE new `historico_candidatura` row, `auto_rejeitado=false` (RNF-07a — no score path), `status='rejeitado'`. PASS
- Disposable fixture (`31010031-*` UUIDs) cleaned up; no PROD candidatura mutated.

## Grants note (repo norm, not a deviation)
The new RPC's EXECUTE grantees are `{anon, authenticated, postgres, service_role}` — identical to the prior security-audited DEFINER RPCs `registrar_decisao` and `reprocessar_analise`. This is Supabase's `ALTER DEFAULT PRIVILEGES` behavior; the real access control is the in-body role-guard (`role IN (rh,administrador)` + vaga ownership), which the smoke assertions (e) prove. Left as-is to match the audited sibling pattern. `REVOKE ... FROM PUBLIC` + `GRANT ... TO authenticated` applied as authored.

## Migration ledger reconcile
MCP `apply_migration` wrote the version row with its own timestamp `20260714234114` (name `20260714100001_rejeitar_candidatura_rpc`) — the known MCP drift. Reconciled the `supabase_migrations.schema_migrations` row to `version=20260714100001`, `name=rejeitar_candidatura_rpc` so it matches the local filename and `supabase db push --linked` stays clean. No leftover drift row.

## Types regen + cast cleanup
- `database.types.ts` (repo ROOT) regenerated via `npx supabase gen types typescript --linked`: `rejeitar_candidatura` + `motivo_rejeicao_rh` present; `avancar_etapa(uuid,uuid)` + `rejeitar_candidato(...)` gone (19 insertions / 8 deletions).
- Dropped the pre-regen `as never` casts on the `rejeitar_candidatura` call in `triagemService.ts` — now fully typed.

## Full gate
- `npm run test:run` → **897/897 GREEN** (113 files)
- `npm run lint` (tsc) → **104 errors — baseline held, zero regression** (no triagemService errors after cast removal)
- `npm run build` → **0 errors**, PERF-03 chunk assertions PASSED (eager index 883 kB)

## Requirements
OPER-01, OPER-02, OPER-03, OPER-04 — all now LIVE end-to-end across the three RH surfaces (Kanban card menu, HubCandidatoRH action row, ComparativoScreen) through the single audited write-path.

## Landmines obeyed
- Trigger `avancar_etapa()` never edited; DROP touched only the exact 2-arg / 3-arg dead overloads (real signatures), never zero-arg, never CASCADE. Verified intact post-apply.
- RPC never manual-INSERTs `historico_candidatura` (trigger is the sole audit writer). No score auto-reject (RNF-07a).
