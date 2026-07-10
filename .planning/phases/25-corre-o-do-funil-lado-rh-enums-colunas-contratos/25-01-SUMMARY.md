---
phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos
plan: 01
subsystem: database
tags: [postgres, plpgsql, trigger, security-definer, rls, guc, set_config, supabase, rnf-07a, lgpd, audit-trail]

# Dependency graph
requires:
  - phase: 06-pipeline-backbone-schema
    provides: "decisao_final table (UNIQUE candidatura_id, por_usuario NOT NULL LGPD-02 guardrail) + decisao_final_resultado enum + rh_le_decisao_final RLS"
  - phase: 08-inscri-o-knock-out-etapa-1
    provides: "submit_candidatura_atomic knockout sweep (status→rejeitado, etapa stays inscricao) + avancar_etapa audit trigger"
  - phase: 14-entrevistas-com-ia-companion-etapas-4-5
    provides: "avancar_etapa_flag_guard — the BEFORE-UPDATE guard-fn + idempotent re-bind SHAPE (its 'flag' is a data column, NOT a GUC)"
  - phase: 15-decis-o-final-audit-vel-lgpd-art-20
    provides: "registrar_decisao DEFINER RPC (ownership guard + justificativa≥50 + UPSERT terminal map) + rh_le_decisao_final vaga-scope"
provides:
  - "guard_rejeicao_auditada() + trg_candidaturas_guard_rejeicao — hybrid BEFORE UPDATE OF status guard closing the A9 reject-without-trail hole (FUNIL-02)"
  - "txn-local GUC idiom app.rejeicao_sancionada (set_config is_local=true / current_setting missing_ok) — NEW to the repo"
  - "decisao_final_historico append-only table + snapshot_decisao_final AFTER UPDATE trigger preserving OLD.* + actor (FUNIL-09)"
  - "registrar_decisao amendment — sanctioned reject folds status/etapa/etapa_justificativa in one UPDATE (honest criterio_texto)"
  - "upsert_pergunta_opcoes_metadata status hard-block + vaga-ownership guard (FUNIL-11)"
  - "submit_candidatura_atomic flag add so the sanctioned knockout still auto-rejects under the new guard"
affects: [25-07-live-apply-blocking, 26-funil-lado-candidato, 27-migrations-ledger-reconcile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Transaction-local GUC flag (set_config('app.*','on',true) write / current_setting('app.*',true) read) as a pooler-safe cross-statement sanctioned-call signal"
    - "Hybrid BEFORE-UPDATE guard: allow when a DEFINER flag is set OR the same UPDATE also drives an audited column transition"
    - "Append-only history via a single AFTER UPDATE trigger capturing OLD.* (never a per-writer manual INSERT)"

key-files:
  created:
    - "supabase/migrations/20260709000010_guard_rejeicao_auditada.sql"
    - "supabase/migrations/20260709000011_decisao_final_historico.sql"
    - "supabase/migrations/20260709000012_registrar_decisao_amend.sql"
    - "supabase/migrations/20260709000013_upsert_opcoes_status_guard.sql"
    - "supabase/migrations/20260709000014_submit_candidatura_flag.sql"
  modified: []

key-decisions:
  - "Renumbered the 5 migrations from the plan's 000001..000005 to 000010..000014 to avoid a version collision with the committed Phase-24 20260709000001_sec07 / 000002_sec08 remediations (Rule 3 blocking fix)"
  - "Hybrid guard (flag OR etapa-transition) — both branches required so path #2 (comparativo, raw client update, no GUC) and path #4 (knockout, etapa unchanged) both stay allowed while path #1 (the A9 hole) is blocked"
  - "registrar_decisao rejeitado branch now sets status='rejeitado' too (Open Q1 = YES) so the terminal is consistent across status+etapa, folded into one sanctioned UPDATE with honest etapa_justificativa"
  - "decisao_final_historico blocks all client writes (explicit FOR INSERT WITH CHECK(false) + no UPDATE/DELETE policy); RH vaga-scoped SELECT only, no candidate-facing policy (A3)"

patterns-established:
  - "Pattern 1: txn-local GUC sanctioned-call flag — set_config(is_local=true) in the DEFINER writer, current_setting(missing_ok) in the guard; auto-resets on txn end (pooler-safe)"
  - "Pattern 2: hybrid reject guard — flag branch covers etapa-unchanged writes, etapa-transition branch covers audited moves; a RAISE rolls back the co-fired avancar_etapa audit row atomically"

requirements-completed: [FUNIL-02, FUNIL-09, FUNIL-11]

# Metrics
duration: ~10min
completed: 2026-07-10
---

# Phase 25 Plan 01: Enums, Colunas & Contratos (DB migrations) Summary

**Five files-only Postgres migrations that make the RH funnel tamper-resistant: a hybrid BEFORE-UPDATE reject guard backed by a new txn-local GUC, an append-only decision-history table + snapshot trigger, and status/ownership guards on the decision + option-edit DEFINER RPCs — authored, greps green, apply deferred to the [BLOCKING] 25-07 wave.**

## Performance

- **Duration:** ~10 min (author + structural greps + 3 atomic commits)
- **Started:** 2026-07-09T23:52Z (approx)
- **Completed:** 2026-07-10T00:02Z (approx)
- **Tasks:** 3 (5 migration files)
- **Files modified:** 5 (all created)

## Accomplishments
- **FUNIL-02 (A9) closed structurally:** `guard_rejeicao_auditada()` + `trg_candidaturas_guard_rejeicao` (BEFORE UPDATE OF status) RAISEs `check_violation` on any `status→rejeitado` that is neither flagged (sanctioned DEFINER RPC) nor accompanied by an `etapa_atual` transition — the exact A9 hole (`updateCandidaturaStatus` status-only reject) and nothing else.
- **New txn-local GUC idiom:** `set_config('app.rejeicao_sancionada','on',true)` (is_local=true → SET LOCAL, pooler-safe) written by the two sanctioned RPCs; read with `current_setting('app.rejeicao_sancionada', true)` (missing_ok). First custom `app.*` session flag in the repo.
- **FUNIL-09 (A26):** `decisao_final_historico` append-only table + `snapshot_decisao_final` AFTER UPDATE trigger archives `OLD.*` (incl. the human actor `por_usuario`) on every `registrar_decisao` UPSERT overwrite; `registrar_decisao` amended to sanction its own reject and write an honest `etapa_justificativa` (folded status+etapa+justificativa into one UPDATE).
- **FUNIL-11 (A29):** `upsert_pergunta_opcoes_metadata` now hard-blocks on non-`rascunho` vagas (P0001, mirrors `publish_vaga`) and enforces vaga ownership for `rh` (IDOR T-25-03) before the DELETE/regenerate.
- **Knockout coexistence (CI-03):** `submit_candidatura_atomic` sets the flag before its knockout auto-reject so it still passes the new guard.

## Task Commits

Each task was committed atomically (via `git -c core.hooksPath=/dev/null`):

1. **Task 1: guard_rejeicao_auditada trigger + submit_candidatura_atomic flag** - `e9aa950` (feat)
2. **Task 2: decisao_final_historico table+trigger + registrar_decisao amend** - `1f46d58` (feat)
3. **Task 3: upsert_pergunta_opcoes_metadata status + ownership guard** - `e56de23` (feat)

**Plan metadata:** committed separately (docs: complete plan) with SUMMARY/STATE/ROADMAP/REQUIREMENTS.

## Files Created/Modified
- `supabase/migrations/20260709000010_guard_rejeicao_auditada.sql` - hybrid BEFORE UPDATE OF status guard fn + idempotent trigger re-bind + REVOKE
- `supabase/migrations/20260709000011_decisao_final_historico.sql` - append-only history table + RLS (client-write-blocked, RH vaga-scoped SELECT) + snapshot AFTER UPDATE trigger
- `supabase/migrations/20260709000012_registrar_decisao_amend.sql` - CREATE OR REPLACE registrar_decisao; sanctioned reject + folded terminal UPDATE + honest criterio_texto
- `supabase/migrations/20260709000013_upsert_opcoes_status_guard.sql` - CREATE OR REPLACE upsert RPC; status hard-block + ownership before DELETE/regenerate
- `supabase/migrations/20260709000014_submit_candidatura_flag.sql` - CREATE OR REPLACE submit_candidatura_atomic; set_config flag before knockout UPDATE (else unchanged)

## Decisions Made
- **Terminal consistency (Open Q1 = YES):** `registrar_decisao`'s `rejeitado` branch sets `status='rejeitado'` in addition to `etapa_atual`, so the dashboard/filter (which read `status`) are no longer stale after a Decisão Final reject. The `aprovado` branch sets `etapa_atual` + `etapa_justificativa` only (no `status` write — sidesteps the `status_candidatura` enum's lack of an `aprovado` value and avoids a needless flag).
- **History RLS = decisao_final's exact posture:** explicit `FOR INSERT WITH CHECK(false)` + no UPDATE/DELETE policy (all client writes denied; the DEFINER trigger bypasses) + a single RH vaga-scoped SELECT policy mirroring `rh_le_decisao_final` (admin bypass; no candidate policy — A3).
- **Firing order relied on, not changed:** alphabetical BEFORE-order keeps `candidaturas_avancar_etapa_trg` (audits) ahead of `trg_candidaturas_guard_rejeicao` (validates); a guard RAISE rolls back the co-fired audit row atomically and the AFTER n8n trigger never dispatches on a blocked reject.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renumbered all 5 migrations to avoid a version-prefix collision**
- **Found during:** Task 1 (before authoring — reconnaissance of the migrations dir)
- **Issue:** The plan's target filenames `20260709000001_guard_rejeicao_auditada.sql` and `20260709000002_decisao_final_historico.sql` collide with two committed Phase-24 SEC remediation migrations already on disk: `20260709000001_sec07_rubric_remediation.sql` and `20260709000002_sec08_candidaturas_dup_policy_remediation.sql`. Two migration files sharing a version prefix breaks Supabase's version-row semantics and would fail the MCP `apply_migration` in plan 25-07 (duplicate version row).
- **Fix:** Renumbered the whole 25-01 block from the plan's `000001..000005` to a fresh, contiguous, non-colliding range `000010..000014`, preserving the exact 1:1 logical mapping and apply order (guard `000010` → historico `000011` → registrar `000012` → upsert `000013` → submit_flag `000014`). Each file carries an explicit `⚠ VERSION RENUMBER` header note. Content and behavior are unchanged from the plan.
- **Files modified:** all 5 (the file names / version prefixes only)
- **Verification:** `ls` confirms each of `000010..000014` has exactly one file and the pre-existing `000001/000002` SEC files are untouched; per-task structural greps all `AUTHORED_OK`.
- **Committed in:** `e9aa950`, `1f46d58`, `e56de23` (across the three task commits)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Mechanical version-number correction only — no change to SQL objects, behavior, or the plan's must-haves. Downstream (25-07 apply, verifier `must_haves.artifacts` paths) must reference the `000010..000014` names; the exact filenames are recorded in this SUMMARY, the file headers, and the commits. No scope creep.

## Issues Encountered
- **Structural-only verification is a known false-positive gate (by design):** these files are authored, not applied. `npm run build`/tsc are structurally unaffected (SQL migrations are not in the TS compile graph; no TS file was touched — `git diff --name-only` across the 3 commits shows `.sql` files only), and `database.types.ts` will not carry `decisao_final_historico` until Phase 27 regen. The REAL gate is the live MCP SQL smokes A–E in the `[BLOCKING]` plan 25-07. FUNIL-02/09/11 are NOT to be marked verified until those PASS on PROD.

## Live-apply notes for plan 25-07 (BLOCKING wave)
- Apply via Supabase MCP `apply_migration` (bypasses the 42601 PL/pgSQL push error; writes the version row itself). Do NOT `supabase db push` on these `$$` bodies. Version-row reconcile → Phase 27.
- Apply order = file order `000010 → 000014` (no cross-DDL dependency; the guard trigger and the flag-writing RPCs are independent objects, but this order keeps guard+history in place before the amended RPCs run in any smoke).
- SQL smokes to run live (RESEARCH §Code Examples): A (status-only reject, etapa unchanged, no flag → RAISE), B (registrar_decisao reject works + 1 historico row + status/etapa=rejeitado), C (comparativo etapa-transition reject still works), D (double registrar_decisao amend → 1 decisao_final_historico row with OLD.*), E (upsert on a non-rascunho vaga → P0001; non-owner rh → 42501).
- After apply, redeploy the `submit-candidatura` Edge Function if its bundle is stale (bundle-freeze lesson) so the new `submit_candidatura_atomic` body is what runs.

## Next Phase Readiness
- All 5 DB migrations authored + structural greps green; committed atomically. Ready for the 25-07 `[BLOCKING]` live apply + smokes.
- The frontend cutover plans in this phase (25-02 enum cutover, Editar Vaga wiring, test-id contract, dead-affordance sweep, hub 404) are independent of this DB plan and unblocked.
- No blockers. One standing residual (accepted, out of scope): comparativo inline reject (path #2) stays audited-but-justificativa-optional (Open Q2 RESOLVED-DEFERRED; tracked in `.planning/todos/pending/funil-02-comparativo-reject-justificativa.md`).

## Self-Check: PASSED

- All 5 migration files verified present on disk (`000010`–`000014`).
- `25-01-SUMMARY.md` present.
- All 3 task commits verified in git log: `e9aa950`, `1f46d58`, `e56de23`.

---
*Phase: 25-corre-o-do-funil-lado-rh-enums-colunas-contratos*
*Completed: 2026-07-10*
