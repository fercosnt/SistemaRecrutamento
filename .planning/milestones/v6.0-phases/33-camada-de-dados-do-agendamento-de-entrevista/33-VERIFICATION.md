---
phase: 33-camada-de-dados-do-agendamento-de-entrevista
verified: 2026-07-16T00:00:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
---

# Phase 33: Camada de Dados do Agendamento de Entrevista Verification Report

**Phase Goal:** The table `public.agendamentos_entrevista` EXISTS and is proven isolated by behavioral smoke — RLS bidirectional (RH vaga-scoped WR-04; candidate own-row read via explicit allowlist that EXCLUDES `observacoes_rh`), proven secure BEFORE any UI. Zero UI end-user.
**Verified:** 2026-07-16
**Status:** passed
**Re-verification:** No — initial verification

## Method

This is a goal-backward verification with **independent live-PROD re-checking**, not a re-read of SUMMARY.md claims. In addition to reading the 3 PLAN/SUMMARY pairs and the migration/smoke source files, I connected directly to the linked PROD Supabase project via `supabase db query --linked` (Management API, independent of the executor's MCP session) and:

1. Queried `pg_class`/`pg_policies`/`pg_proc`/`pg_trigger`/`pg_constraint`/`information_schema` directly to confirm the table, RLS state, policy count/predicate text, RPC signature/hardening, trigger, and FK delete-actions as they actually exist in PROD right now — not as claimed.
2. **Re-ran the full 8-assertion SEG-03 smoke myself**, using a result-table-adapted clone of `supabase/tests/seg33_agendamento_smokes.sql` (identical fixture, identical JWT-impersonation logic, identical predicates — only the success-signaling mechanism changed from `RAISE NOTICE` to a row insert, because `RAISE NOTICE` isn't surfaced by `supabase db query`, exactly the same limitation the executor hit with MCP `execute_sql`). This is a fresh, independent execution against live PROD, not a re-read of the executor's reported result.
3. Confirmed disposable fixture cleanup left 0 leftover rows after my own run.
4. Ran `npm run lint` myself to independently count the tsc baseline.
5. Ran `supabase migration list --linked` and `supabase db push --linked --dry-run` myself to confirm the ledger state and the exact scope of the documented non-blocking `db push` limitation.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | **SC1/AGEND-01** — `agendamentos_entrevista` exists with the 15-col reconciled schema, reused enums, `agendado_por`, FK `candidatura_id → candidaturas ON DELETE CASCADE`; RH vaga-owner writes, non-owner denied | ✓ VERIFIED | Live `information_schema.columns` count = 15; live `pg_constraint.confdeltype='c'` for `candidatura_id` FK; independent re-run assertion (b) PASS ("owner inserted + read back"), (a) PASS (non-owner reads 0) |
| 2 | **SC2/SEG-03** — candidate reads only own row; cross-candidate deny | ✓ VERIFIED | Independent re-run assertion (g) PASS ("non-owning user reads 0 rows via RPC"); ownership join `ca.user_id = auth.uid()` confirmed in live function source (pg_policies/pg_proc query) and in migration text |
| 3 | **SC3/SEG-03** — candidate projection excludes `observacoes_rh` | ✓ VERIFIED | `get_meu_agendamento` live `RETURNS TABLE` has exactly 7 columns (`id, candidatura_id, tipo, data_hora, local_ou_link, status, compareceu`) — confirmed via `database.types.ts:4575-4586` AND via migration source; `observacoes_rh`/`entrevistador`/`agendado_por`/`updated_by`/`vaga_id` absent. Independent re-run assertion (e) PASS (direct base-table read = 0 rows) + (f) PASS (RPC returns 1 row, no RH-internal cols possible — excluded from the return type itself) |
| 4 | **SC4/SEG-03** — non-owner recruiter cannot read/write vaga's agendamentos | ✓ VERIFIED | Independent re-run assertion (a) PASS (cross-recruiter read = 0) + (c) PASS (spoofed-`vaga_id` INSERT denied, 42501) |
| 5 | RLS predicate is join-through-candidaturas form (not the spoofable direct `vaga_id` form); exactly ONE `CREATE POLICY` | ✓ VERIFIED | Live `pg_policies.qual`/`with_check` text queried directly = `candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id=c.vaga_id WHERE v.created_by=(select auth.uid()))`; zero occurrences of `SELECT id FROM public.vagas WHERE created_by` or `vaga_id = ANY` in the migration; live `pg_policies` count for the table = 1 |
| 6 | Exactly one candidate DEFINER RPC, `SECURITY DEFINER SET search_path=''`, hardened | ✓ VERIFIED | Live `pg_proc.prosecdef=true`, `proconfig={search_path=""}` for both `get_meu_agendamento` and the trigger fn `agendamento_normaliza_vaga_id`; live trigger count on the table = 1 |
| 7 | 33-03-SUMMARY's "8/8 PASS, zero SKIP" PROD gate claim holds | ✓ VERIFIED (independently reproduced) | My own fresh execution of the equivalent logic against live PROD returned: a=PASS, b=PASS, c=PASS, d=PASS, e=PASS, f=PASS, g=PASS, h=PASS. Fixture used a real `administrador` `usuarios_rh` row (`aa864c64…`, `ativo=true`), real 0-vaga recruiters, real FK-bound candidato. Cleanup verified 0 leftover `33010033-*` rows post-run |
| 8 | `database.types.ts` (repo ROOT) regenerated with the new table + RPC; tsc baseline held | ✓ VERIFIED | `grep agendamentos_entrevista / get_meu_agendamento database.types.ts` both match; `npm run lint` independently run = exactly 104 `error TS` lines (baseline, no increase); `git show a3f8c7f --stat` = only `database.types.ts` touched (+88/-0), not hand-edited |
| 9 | M6 invariants held: no `historico_candidatura` INSERT, no `avancar_etapa()` edit, zero new npm deps | ✓ VERIFIED | `grep historico_candidatura\|avancar_etapa` on the migration = 0 matches; `git show <33-01/33-02/33-03 commits> --stat` = zero `package.json`/`package-lock.json` changes across all 3 commits |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260716000001_agendamentos_entrevista.sql` | CREATE TABLE (15 cols) + trigger + RLS (1 policy) + DEFINER RPC | ✓ VERIFIED | File matches live PROD state exactly (independently diffed against live `pg_catalog`); no `BEGIN/COMMIT`, no `CREATE TYPE` |
| `supabase/tests/seg33_agendamento_smokes.sql` | 8 JWT-impersonated assertions (a–h), real-user fixture | ✓ VERIFIED | All 8 `PASS (x)` notices present in source; independently re-executed against PROD with identical logic → 8/8 PASS |
| `database.types.ts` (repo ROOT) | Regenerated types incl. `agendamentos_entrevista` + `get_meu_agendamento` | ✓ VERIFIED | Present, matches live signature (7-col RPC return, 15-col table Row/Insert/Update) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `rh_gerencia_agendamento` USING/WITH CHECK | `public.vagas.created_by` | `candidatura_id IN (candidaturas JOIN vagas WHERE created_by=(select auth.uid()))` | ✓ WIRED | Confirmed live via direct `pg_policies` query — text matches verbatim |
| `get_meu_agendamento` ownership | `public.candidatos.user_id` | `candidaturas JOIN candidatos WHERE ca.user_id = auth.uid()` | ✓ WIRED | Confirmed live via migration source + independently reproduced smoke (g) cross-candidate deny |
| BEFORE trigger `trg_agendamento_normaliza_vaga` | `NEW.vaga_id` | forces `vaga_id := candidatura.vaga_id` on INSERT/UPDATE | ✓ WIRED | Live trigger count = 1 on the table; smoke (c) confirms the spoof vector is closed (belt, per plan's documented caveat that this is not the sole predicate-choice discriminator — the static grep + live `pg_policies.qual` text is) |

### Behavioral Spot-Checks / Probe Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SEG-03 8-assertion behavioral gate, live PROD | Independently re-run adapted clone of `seg33_agendamento_smokes.sql` via `supabase db query --linked` | `a=PASS, b=PASS, c=PASS, d=PASS, e=PASS, f=PASS, g=PASS, h=PASS`, fixture cleanup verified 0 leftover rows | ✓ PASS |
| tsc baseline | `npm run lint 2>&1 \| grep -c "error TS"` | `104` | ✓ PASS (matches documented baseline, no increase) |
| Migration/ledger reconciliation | `supabase migration list --linked` | `20260716000001` present with matching Local/Remote columns (no drift) | ✓ PASS |
| `db push --linked` known limitation | `supabase db push --linked --dry-run` | Fails only on pre-existing `20260713*`/`20260714*` drift rows (M5/DBMIG-01 debt) — `20260716000001` is NOT among the listed drift versions | ✓ CONFIRMED NON-BLOCKING (matches documented, deferred, pre-existing M5 debt — not a P33 defect) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AGEND-01 | 33-01, 33-02, 33-03 | RH agenda entrevista, `agendado_por` gravado, vaga-scoped | ✓ SATISFIED | Table + trigger + RLS live; smoke (a)(b)(c) PASS |
| SEG-03 | 33-02, 33-03 | Isolamento candidato own-row + RH vaga-scoped, `observacoes_rh` excluída | ✓ SATISFIED | RLS + DEFINER RPC live; smoke (a)(c)(d)(e)(f)(g)(h) PASS |

Note: `.planning/REQUIREMENTS.md` still shows both rows as "Pending" in its status column — this is a document-maintenance lag observed across the whole M6 milestone (SEG-01/SEG-02 from the already-shipped Phase 32 show the same stale "Pending" marker), not a Phase-33-specific gap. Non-blocking; flagged for housekeeping only.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in the migration or smoke file | — | None |

**Informational (non-blocking, pre-existing repo-wide pattern, not introduced by this phase):** Live `information_schema.routine_privileges` shows `anon` holds `EXECUTE` on `get_meu_agendamento`, and live `information_schema.role_table_grants` shows `anon`/`authenticated` hold full CRUD privileges on the base table via Supabase's default-privilege auto-grant (independently confirmed to be identical on the established `candidaturas` table and the `get_minha_redacao` template function this RPC was cloned from). This is neutralized in practice: RLS is the actual gate on the base table (0 rows for anon — no matching policy), and `auth.uid()` returns NULL for the anon role inside the DEFINER RPC, so `ca.user_id = auth.uid()` is always false for anon. Not a Phase-33 regression; identical to the codebase's established `get_minha_redacao`/`candidaturas` precedent.

### Human Verification Required

None. Every must-have was verifiable programmatically, and the load-bearing SEG-03 acceptance gate was independently re-executed live against PROD by the verifier (not just re-read from SUMMARY.md), with matching 8/8 PASS results plus additional direct `pg_catalog` structural confirmation of RLS state, policy predicate text, RPC hardening, and FK delete-actions.

### Gaps Summary

None. All 4 ROADMAP Success Criteria for Phase 33 are met and independently reproduced against live PROD. The one known limitation (`supabase db push --linked` not reporting "up to date") was independently confirmed to be scoped entirely to pre-existing M5/DBMIG-01 ledger drift (`20260713*`/`20260714*` versions) — the Phase 33 migration (`20260716000001`) is not among the drifted versions and is correctly reconciled on both local and remote ledgers. Per the verification brief, this is recorded as a non-blocking, explicitly-deferred backlog item, not a Phase-33 gap.

---

_Verified: 2026-07-16_
_Verifier: Claude (gsd-verifier)_
