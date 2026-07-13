---
phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos
plan: 07
subsystem: database
tags: [postgres, migrations, plpgsql, triggers, rls, mcp, prod-apply, behavioral-smokes]

requires:
  - phase: 25-01
    provides: "the 5 authored migration files (guard trigger, history table+trigger, registrar_decisao amend, upsert guard, submit flag)"
provides:
  - "5 Phase-25 migrations LIVE on PROD (guard_rejeicao_auditada trigger, decisao_final_historico table+snapshot trigger, amended registrar_decisao / upsert_pergunta_opcoes_metadata / submit_candidatura_atomic)"
  - "FUNIL-02/09/11 proven live via behavioral smokes A-E (all PASS)"
  - "database.types.ts regenerated with decisao_final_historico + amended RPCs"
affects: [26, 27]

tech-stack:
  added: []
  patterns:
    - "PROD apply via Supabase MCP apply_migration (bypasses 42601 on PL/pgSQL $$ bodies; writes its own version row)"
    - "Behavioral smokes: single atomic txn, disposable fixtures + set_config('request.jwt.claims') RH/admin simulation, n8n trigger disabled in-txn, hard-delete cleanup, all-or-nothing rollback"

key-files:
  created: []
  modified:
    - database.types.ts

key-decisions:
  - "Applied via MCP apply_migration (5 calls, numeric order 010..014); MCP wrote its own timestamp version rows (20260712002352..002532) — version-row drift vs the 20260709000010..14 filenames is EXPECTED and reconcile is deferred to Phase 27 (DBMIG)"
  - "Smokes run as ONE atomic transaction with the n8n AFTER trigger DISABLED in-txn (re-enabled at end) to prevent spurious webhook dispatches for the fixture status changes"
  - "vagas.created_by and decisao_final.por_usuario have NO FK constraint → used the real admin id (recruiter@teste.com) freely as actor/owner; sample real candidato reused only as a candidatura FK (hard-deleted)"

patterns-established:
  - "The guard is a HYBRID: flag branch (app.rejeicao_sancionada, set_config is_local) covers etapa-unchanged knockouts; etapa branch covers the comparativo inline reject"

requirements-completed: [FUNIL-02, FUNIL-09, FUNIL-11]

duration: ~40min (incl. MCP re-auth + 2 smoke iterations)
completed: 2026-07-12
---

# Phase 25 / Plan 07: PROD migration apply + behavioral smokes A-E Summary

**The 5 Phase-25 migrations are LIVE on PROD and the FUNIL-02/09/11 guarantees are proven by 8/8 behavioral smoke checks — a status-only reject can no longer escape the audit trail, decision amendments are archived, and option edits on active/non-owned vagas are blocked.**

## Performance
- **Duration:** ~40 min (MCP token re-auth mid-plan + one CHECK-constraint fixture fix)
- **Completed:** 2026-07-12
- **Tasks:** 3/3 (1 BLOCKING apply, 1 types regen, 1 BLOCKING smokes)

## Task 1 — Apply 5 migrations to PROD (Supabase MCP apply_migration)
Applied in numeric order via 5 `apply_migration` calls (all `{success:true}`):
1. `guard_rejeicao_auditada` — BEFORE UPDATE OF status trigger on candidaturas
2. `decisao_final_historico` — append-only table + RLS + AFTER UPDATE snapshot trigger
3. `registrar_decisao_amend` — sanctioned reject + folded status/etapa/justificativa
4. `upsert_opcoes_status_guard` — rascunho status hard-block + ownership guard
5. `submit_candidatura_flag` — knockout sanctioned-reject flag

**Existence checks (execute_sql):** `decisao_final_historico` present; `trg_candidaturas_guard_rejeicao` + `trg_decisao_final_snapshot` present; coexistence triggers `candidaturas_avancar_etapa_trg` + `trg_n8n_status_candidatura` intact; all 5 functions present. 5 new version rows written by MCP (`20260712002352..002532`).

**Version-row drift (deferred → Phase 27):** MCP wrote timestamp-based version rows, NOT the `20260709000010..14` filenames. Reconcile is Phase 27 (DBMIG-01) scope, per the plan.

## Task 2 — Regenerate database.types.ts
Regenerated via MCP `generate_typescript_types`, written to repo root (never hand-edited). `decisao_final_historico` present; build green; frontend tsc count unchanged (107).

## Task 3 — Behavioral smokes A-E (the FUNIL-02/09/11 gate)
All run as ONE atomic transaction (disposable fixtures, RH/admin simulated via `set_config('request.jwt.claims')`, n8n trigger disabled in-txn, hard-delete cleanup):

| Smoke | Requirement | Result |
|-------|-------------|--------|
| **A** | FUNIL-02 | status-only reject (etapa unchanged, no flag) → RAISEd `check_violation` (hole closed) ✅ |
| **B** | FUNIL-02/09 | `registrar_decisao` reject → status+etapa+justificativa folded, **1** historico_candidatura row ✅ |
| **C-i** | availability | comparativo etapa+status reject (flag OFF) → allowed via etapa branch ✅ |
| **C-ii** | availability/CI-03 | knockout `submit_candidatura_atomic` → still auto-rejects (status=rejeitado) ✅ |
| **D** | FUNIL-09 | second `registrar_decisao` (amend) → exactly **1** decisao_final_historico row, OLD decisao=`em_espera` ✅ |
| **E1** | FUNIL-11 | admin upsert on **ativa** vaga → **P0001** (blocked) ✅ |
| **E2** | FUNIL-11 | non-owner RH upsert on rascunho vaga → **42501** (blocked) ✅ |
| **E3** | FUNIL-11 | owner (administrador bypass) upsert on rascunho vaga → **ok** (opcoes_count=1) ✅ |

**Cleanup verified:** 0 smoke vagas, 0 smoke candidaturas, 0 residual decisao_final_historico rows, n8n trigger re-enabled (`tgenabled='O'`), 0 knockout residue. No test rows left in PROD (RNF-07a: no smoke asserted an auto-reject by score).

## Files Modified
- `database.types.ts` — regenerated (decisao_final_historico Row + amended RPC signatures)

## Verification
- All 5 migrations live + existence checks green.
- Smokes A-E: **8/8 PASS**; fixtures fully cleaned; coexistence triggers intact.
- Version-row reconcile deferred to Phase 27.
