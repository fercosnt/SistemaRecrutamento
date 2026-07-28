---
phase: 07-configura-o-de-vaga-tags
plan: 02
subsystem: database
tags: [postgres, supabase, plpgsql, security-definer, rls, jsonb, migrations]

# Dependency graph
requires:
  - phase: 06-pipeline-backbone
    provides: "M2 schema backbone (status_vaga 4-value enum, RLS role idiom (select auth.jwt() #>> '{app_metadata,role}') IN ('rh','administrador'), SECURITY DEFINER + search_path='' atomic-write idiom)"
  - phase: 07-01
    provides: "Wave-0 RED test scaffolds + 07-SQL-SMOKE-RUNBOOK.md (the 5 smoke sections this plan ran against the live apply)"
provides:
  - "enum_tag_opcao (5 values: knockout/atencao/neutro/pontua/fortemente_pontua) live in DB"
  - "pergunta_opcao_metadata table (opcao_id + opcao_texto, tag, peso CHECK -999..100, nota_ia, ordem) + indexes + RLS — live in DB"
  - "vagas.testes_aplicaveis jsonb + vagas.pesos_avaliacao jsonb columns (no sum=100 CHECK — drafts allowed invalid) — live in DB"
  - "upsert_pergunta_opcoes_metadata(p_pergunta_id, p_opcoes) RPC — atomic jsonb↔table sync, SECURITY DEFINER, in-body 42501 role check, gen_random_uuid opcao_id backfill, GRANT EXECUTE TO authenticated"
  - "publish_vaga(p_vaga_id) RPC — server-side D-12 publish gate (pesos sum=100 + ≥1 obrigatorio + knockout/obrigatoria invariant), only rascunho→ativa"
  - "database.types.ts regenerated from live schema with the new enum/table/columns"
  - "F8/F10 JOIN CONTRACT (D-14): pergunta_opcao_metadata stores BOTH opcao_id (primary join key) AND opcao_texto (denormalized fallback/audit)"
affects: [phase-08-inscricao-knockout, phase-10-triagem-score-match, phase-11-avaliacao-assincrona, 07-03, 07-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-called SECURITY DEFINER RPC: in-body role check (42501) replaces RLS (which does not apply to DEFINER bodies) + GRANT EXECUTE TO authenticated (NOT service_role) because the RPC is invoked by the authenticated RH client, not an Edge Function"
    - "Atomic jsonb↔relational-table sync via single DEFINER RPC (DELETE existing rows + re-INSERT + jsonb writeback to perguntas_formulario.opcoes_resposta) — no non-atomic client orchestration (D-10)"
    - "opcao_id backfill: COALESCE(existing opcao_id, gen_random_uuid()) inside the RPC migrates string[] → [{id,texto}] jsonb shape (D-13)"
    - "Server-side publish gate: publish_vaga re-checks the 3 D-12 conditions before flipping status — defense-in-depth against a client UPDATE status='ativa' that skips validation"

key-files:
  created:
    - "supabase/migrations/20260607010001_pergunta_opcao_metadata.sql"
    - "supabase/migrations/20260607010002_vagas_config_columns.sql"
    - "supabase/migrations/20260607010003_upsert_pergunta_opcoes_metadata_rpc.sql"
    - "supabase/migrations/20260607010004_publish_vaga_rpc.sql"
  modified:
    - "database.types.ts"

key-decisions:
  - "D-14 F8/F10 JOIN CONTRACT: pergunta_opcao_metadata persists BOTH opcao_id (uuid, primary join key) AND opcao_texto (denormalized fallback/audit). F8 (knockout, Phase 8) and F10 (score_match, Phase 10) join PRIMARILY by opcao_id, using opcao_texto only as fallback/audit when an opcao_id is unresolvable. Phase 8 must NOT re-litigate this — join by opcao_id first."
  - "D-22 apply path: applied via Supabase MCP execute_sql + manual supabase_migrations version-row reconciliation — NOT `supabase migration repair` CLI. execute_sql bypasses the SQLSTATE 42601 transaction-pooler bug for PL/pgSQL $$...$$ bodies adjacent to COMMENT/GRANT/REVOKE; reconciliation done by writing the 4 version rows directly so `supabase db push --linked` reports up-to-date."
  - "010004 RAISE fix (commit 8f1941b): the publish_vaga pesos-mismatch RAISE had a doubled %% (literal percent) that left zero placeholders for one bound arg; corrected to a single % so v_soma binds. §4a smoke confirms the corrected 'soma atual: 95' message renders."
  - "vagas columns: only testes_aplicaveis + pesos_avaliacao added this phase — qualificacao_etapa1 is Phase 8, NOT here. No sum=100 CHECK (drafts allowed invalid; sum gated at publish only, D-12)."

patterns-established:
  - "Client-called DEFINER RPC pattern: in-body 42501 role check + GRANT EXECUTE TO authenticated (deviation from the EF-called analog which grants to service_role)"
  - "jsonb↔table atomic sync with stable uuid opcao_id backfill inside a single DEFINER transaction"

requirements-completed: [VAGACFG-01, VAGACFG-02, VAGACFG-03]

# Metrics
duration: ~5min (Task 4 + close-out; Tasks 1-3 in prior dispatches)
completed: 2026-06-07
---

# Phase 7 Plan 02: Schema + Write-Path for Vaga Config & Tags Summary

**enum_tag_opcao + pergunta_opcao_metadata (opcao_id AND opcao_texto, peso CHECK, RLS) + vagas jsonb config columns + 2 client-called SECURITY DEFINER RPCs (atomic jsonb↔table sync + server-side publish gate) applied live and reflected in regenerated database.types.ts**

## Performance

- **Duration:** ~5 min (this dispatch: Task 4 regen + build + close-out; Tasks 1-3 executed in prior dispatches incl. the blocking apply checkpoint)
- **Completed:** 2026-06-07T18:19Z
- **Tasks:** 4 (Tasks 1-2 DDL+RPC migrations; Task 3 blocking-human live apply; Task 4 types regen)
- **Files modified:** 5 (4 migration files created + database.types.ts regenerated)

## Accomplishments

- **enum_tag_opcao** (5 tags) + **pergunta_opcao_metadata** table (opcao_id + opcao_texto + tag default 'neutro' + peso CHECK(-999..100) default 0 + nota_ia + ordem + UNIQUE(pergunta_id, opcao_id)) + `idx_pom_pergunta` + partial `idx_pom_knockout` + RLS `rh_gerencia_opcao_metadata` (FOR ALL, live role idiom) — all live in DB.
- **vagas.testes_aplicaveis** jsonb + **vagas.pesos_avaliacao** jsonb columns with sane defaults, no sum=100 CHECK (drafts allowed invalid).
- **upsert_pergunta_opcoes_metadata** RPC — atomic jsonb↔table sync, SECURITY DEFINER + search_path='', in-body 42501 role check, gen_random_uuid opcao_id backfill, jsonb writeback to perguntas_formulario, GRANT EXECUTE TO authenticated.
- **publish_vaga** RPC — server-side D-12 gate (pesos sum=100 + ≥1 obrigatorio + knockout/obrigatoria invariant), only rascunho→ativa.
- **database.types.ts** regenerated from live schema, build exit 0.

## Task Commits

1. **Task 1: enum + table + indexes + RLS + vagas columns** - `c9cffdf` (feat)
2. **Task 2: sync RPC + publish-gate RPC** - `18fe3a1` (feat) + `8f1941b` (fix — RAISE format string correction in publish_vaga)
3. **Task 3: [BLOCKING] live apply via D-22 (MCP execute_sql + version-row reconciliation) + 5 runbook smokes** - no code commit (live DB apply; orchestrator-owned)
4. **Task 4: regenerate database.types.ts** - `11f7add` (chore)

**Plan metadata:** (this docs commit — SUMMARY + STATE + ROADMAP)

## F8/F10 JOIN CONTRACT (D-14) — DO NOT RE-LITIGATE

`pergunta_opcao_metadata` persists **BOTH**:
- **`opcao_id`** (uuid, generated inside `opcoes_resposta`) — the **PRIMARY join key**.
- **`opcao_texto`** (denormalized) — **fallback/audit only**.

Downstream consumers:
- **F8 (knockout, Phase 8)** — joins perguntas_formulario.opcoes_resposta ↔ pergunta_opcao_metadata **by opcao_id first**; opcao_texto is the fallback when an opcao_id is unresolvable (e.g. legacy rows pre-backfill) and serves as the human-readable audit trail.
- **F10 (score_match, Phase 10)** — same contract: match by **opcao_id**, fall back to opcao_texto.

The `upsert_pergunta_opcoes_metadata` RPC guarantees every option carries a stable opcao_id (COALESCE(existing, gen_random_uuid())) and rewrites opcoes_resposta into the `[{id,texto}]` shape (D-13). Phase 8 must join by opcao_id — opcao_texto is fallback/audit, not the primary key.

## Apply Path (D-22) — MCP execute_sql, NOT migration repair CLI

The 4 migrations were applied to the live project (isljnozzlvckrgjjbjwp) via **Supabase MCP `execute_sql`** (the Phase-6 path that bypasses SQLSTATE 42601 in the transaction pooler — the PL/pgSQL `$$...$$` RPC bodies adjacent to COMMENT/GRANT/REVOKE trigger 42601 via `supabase db push`). Migration-history reconciliation was done by **writing the 4 version rows (20260607010001-04) directly into `supabase_migrations.schema_migrations`** — NOT via `supabase migration repair`. After reconciliation, `supabase db push --linked` reports "Remote database is up to date".

## publish_vaga RAISE Fix (commit 8f1941b)

The original 010004 had a pesos-mismatch RAISE whose format string used a doubled `%%` (an escaped literal percent), leaving **zero** placeholders while binding **one** arg (`v_soma`) — a runtime format error. The orchestrator corrected it to a single `%` so `v_soma` binds. The §4a smoke confirms the corrected message renders (`soma atual: 95`).

## Smoke Results — ALL 5 PASS (07-SQL-SMOKE-RUNBOOK.md)

Run against a throwaway fixture vaga+pergunta, fully deleted afterward (zero production residue):

- **§1 Idempotency** — RPC called twice: row_count=2, opcao_ids stable across both calls.
- **§2 opcao_id generation** — null_ids=0; jsonb rewritten from string[] to `[{id,texto}]`.
- **§3 RLS deny** — candidato role: RPC → 42501 (forbidden, in-body check); direct INSERT → 42501 (RLS violation).
- **§4 publish guard** — sum=95 → rejected P0001 "soma atual: 95" + vaga stays rascunho; sum=100 + ≥1 obrigatorio → transitions to ativa.
- **§5 db push** — "Remote database is up to date" (version rows reconciled).

## Decisions Made

See frontmatter `key-decisions` — D-14 (F8/F10 join contract), D-22 (apply path), the 010004 RAISE fix, and the vagas-columns scope (only testes_aplicaveis + pesos_avaliacao; no sum=100 CHECK).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] publish_vaga RAISE format-string correction**
- **Found during:** Task 3 (live apply, before applying 010004)
- **Issue:** The pesos-mismatch RAISE used a doubled `%%` (escaped literal percent) leaving zero placeholders with one bound arg (`v_soma`) — a runtime format error.
- **Fix:** Corrected to a single `%` so `v_soma` binds.
- **Files modified:** supabase/migrations/20260607010004_publish_vaga_rpc.sql
- **Verification:** §4a smoke confirms the corrected "soma atual: 95" message renders.
- **Committed in:** `8f1941b` (part of Task 2 scope)

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** The RAISE fix was required for the publish guard to render its error message correctly. No scope creep.

## Issues Encountered

The known SQLSTATE 42601 transaction-pooler limitation for PL/pgSQL `$$...$$` migrations adjacent to COMMENT/GRANT/REVOKE recurred (as forecast in CLAUDE.md §Commands). Resolved via the D-22 path: MCP `execute_sql` apply + direct version-row reconciliation. This is the established M2 path (Phase 6 precedent).

## User Setup Required

None — no external service configuration required. The blocking live apply (Task 3) was completed by the orchestrator via Supabase MCP.

## Next Phase Readiness

- **07-03** (config-vaga feature scaffold) and **07-04** (UI blocks) can now persist real data — the load-bearing schema + write-path is live and typed.
- **Phase 8** (knockout, F8) and **Phase 10** (score_match, F10) inherit the D-14 join contract documented above — join by opcao_id, opcao_texto as fallback/audit.
- `database.types.ts` is current; build exit 0; no blockers.

## Self-Check: PASSED

All created/modified files exist on disk (4 migrations + database.types.ts + 07-02-SUMMARY.md). All task commits present in git log (c9cffdf, 18fe3a1, 8f1941b, 11f7add).

---
*Phase: 07-configura-o-de-vaga-tags*
*Completed: 2026-06-07*
