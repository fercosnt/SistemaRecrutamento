---
phase: 37-camada-de-dados-de-notifica-o-notificacoes-enviadas-config-s
verified: 2026-07-22T18:16:59Z
status: passed
score: 13/13 must-haves verified
overrides_applied: 0
---

# Phase 37: Camada de Dados de Notificação — Verification Report

**Phase Goal (reescopado):** Reconciliar o drift PROD→repo das tabelas `notificacoes_enviadas` e `config_sla_etapa` (que já existiam em produção antes de a fase começar) e fechar as lacunas reais que restavam entre o schema vivo e o que a EF da P38 / o painel da P40 precisam — sem re-aplicar o que já está no ledger e sem mascarar divergência.
**Verified:** 2026-07-22T18:16:59Z
**Status:** passed
**Re-verification:** No — initial verification

## Method

Goal-backward, against the rescoped goal (not the original "build from scratch" roadmap wording). All 5 required-reading files were read (`37-CONTEXT.md`, `37-SCHEMA-VIVO.md`, 5×PLAN, 5×SUMMARY, the archived drift todo). Every command in the verification instructions was re-run independently in this session — no command result was taken from a SUMMARY without re-running it. Where the instructions state PROD state was already verified by the orchestrator via Supabase MCP (which I do not have access to), I treated that as fact per the task brief, but I independently corroborated it through a different tool path wherever possible (see "Independent corroboration" below).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `notificacoes_enviadas` registra cada disparo (audit trail) — existe em PROD (LEDGER-01) | ✓ VERIFIED | `supabase/migrations/20260721000001_notificacoes_enviadas.sql` declares all 16 baseline + 2 additive columns; `database.types.ts` (regenerated from live PROD catalog via `--linked`) contains the same 18 columns — this is strong indirect proof the columns exist in PROD, since the type generator cannot invent columns that aren't in the live catalog it reads |
| 2 | `UNIQUE(dedupe_key)` torna o envio idempotente (LEDGER-02) | ✓ VERIFIED | `uq_notif_dedupe UNIQUE (dedupe_key)` in migration file; smoke assertion (a) of `p37_lacunas_rls_idempotencia_smokes.sql` inserts the same `dedupe_key` twice and requires SQLSTATE `23505` named `uq_notif_dedupe` on the second insert — a real empirical test, not a catalog-only check; assertion (b) proves the exact `ON CONFLICT DO NOTHING RETURNING id` claim protocol P38 will use |
| 3 | Candidato-DENY + RH vaga-scoped join-through provado por smoke comportamental (LEDGER-03) | ✓ VERIFIED | Smoke assertions (g)+(h)+(i)+(j): real JWT impersonation (`request.jwt.claims` + `SET ROLE authenticated`), not a `pg_policies` lookup. Cross-checked structurally: the `USING` predicate text of `rh_le_notificacoes` (in the reconstructed migration) is byte-identical to the audited `rh_gerencia_agendamento` policy in `supabase/migrations/20260716000001_agendamentos_entrevista.sql` — confirmed by direct file comparison in this session |
| 4 | `config_sla_etapa` existe, non-PII, public-read, seedada do PRD §5.1.1 (TIMELINE-01) | ✓ VERIFIED | `supabase/migrations/20260721000002_config_sla_etapa.sql` — 8/8 seed rows, `sla_public_read` policy `{anon,authenticated}`; smoke assertions (k)/(l) prove 8 rows cover all 8 enum labels, 3 CHECKs fire, `anon` reads all 8 |
| 5 | Os arquivos de migration reconstruídos (`20260721000001`, `20260721000002`) correspondem 1:1 às versions do ledger, sem `CREATE TABLE IF NOT EXISTS` | ✓ VERIFIED | Both files exist, 158/108 lines; `grep "CREATE TABLE IF NOT EXISTS"` on actual DDL lines returns 0 (only appears inside explanatory comments); `git log` confirms neither file was later edited by 37-03/37-04 |
| 6 | Fidelidade do reconstruído provada por smoke, não por leitura | ✓ VERIFIED | `p37_fidelidade_schema_smoke.sql` read against `information_schema.columns`/`pg_constraint`/`pg_indexes`/`pg_policies`/`pg_trigger`/`pg_enum` — confirmed **not tautological**: literals compared are independently transcribed arrays, and the strongest assertion (e) compares two live-catalog reads against each other (`rh_le_notificacoes.qual` vs the audited `rh_gerencia_agendamento.qual`), not a hardcoded string. Confirmed read-only: 0 write keywords outside string literals/comments |
| 7 | Migration aditiva fecha só as lacunas reais (`destinatario_original`, `modo`+CHECK, trigger `tocar_atualizado_em`), sem criar índice fantasma | ✓ VERIFIED | `20260722000002_p37_notificacoes_lacunas.sql` — no `CREATE INDEX` outside a comment explaining why; no `CREATE POLICY` anywhere in the file; no `BEGIN;`/`COMMIT;` wrapper |
| 8 | `atualizado_em` deixa de ficar congelado (avança em UPDATE) | ✓ VERIFIED | `tocar_atualizado_em()` + 2×`BEFORE UPDATE` triggers in additive migration; smoke assertions (e)/(f) require strictly-greater timestamp post-UPDATE with fixture rows deliberately backdated (correctly reasoned around Postgres `now()` being transaction-start-time-constant) |
| 9 | Nenhuma policy nova em lugar nenhum (candidato-DENY permanece implícito) | ✓ VERIFIED | `grep "CREATE POLICY"` across all 3 migration files returns exactly 2 hits — both are the two policies already reconstructed as PROD state (`rh_le_notificacoes`, `sla_public_read`), zero in the additive file |
| 10 | Literal de role é sempre `administrador`, nunca `admin` | ✓ VERIFIED | `grep "'admin'"` (bare) across all 5 SQL artifacts = 0 hits; `'administrador'` present where expected (migration policy, both smoke files) |
| 11 | `database.types.ts` conhece as duas tabelas sem `any`, diff explicável | ✓ VERIFIED | `git show --stat 7ecf891` = 146 insertions / 0 deletions; diff hunk-by-hunk matches only expected additions (2 tables, 6 relationships, enum, 1 pre-existing RPC hunk inherited from P36) |
| 12 | Item de drift arquivado (`pending/` → `done/`) com histórico preservado | ✓ VERIFIED | `.planning/todos/pending/37-drift-prod-tabelas-notificacao.md` absent; `.planning/todos/done/37-drift-prod-tabelas-notificacao.md` present with `## Resolução` section; `git log --follow` on the done/ path resolves the full chain back to `2b19935` (original discovery commit) |
| 13 | Ledger de PROD reconciliado — 4 versions Local=Remote, zero pendência | ✓ VERIFIED (independent) | `supabase migration list --linked` run directly in this session (not from a SUMMARY) shows `20260721000001/2` and `20260722000001/2` present and matched in both Local and Remote columns |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260721000001_notificacoes_enviadas.sql` | DDL fiel — tabela, 5 constraints, 5 índices, RLS, enum, COMMENTs | ✓ VERIFIED | 158 lines; contains `uq_notif_dedupe`, `rh_le_notificacoes`, all 3 explicit indexes incl. `idx_notif_retry`; no `IF NOT EXISTS`/`BEGIN`/`COMMIT` |
| `supabase/migrations/20260721000002_config_sla_etapa.sql` | DDL fiel — tabela, 4 constraints, RLS, seed 8/8 | ✓ VERIFIED | 108 lines; `ck_sla_prazo_consistente`, `sla_public_read`, `ON CONFLICT (etapa) DO NOTHING` seed |
| `supabase/migrations/20260722000002_p37_notificacoes_lacunas.sql` | Migration aditiva — 2 colunas + CHECK + função/2 triggers, sem índice | ✓ VERIFIED | 178 lines; `destinatario_original`, `modo`, `ck_notif_modo`, `tocar_atualizado_em()`, 2×`CREATE TRIGGER`; explicit scope note for the non-created index |
| `supabase/tests/p37_fidelidade_schema_smoke.sql` | Gate estrutural, catálogo × arquivo, toggle `v_pos_aditiva` | ✓ VERIFIED | 495 lines, 12 assertions, confirmed read-only, confirmed not tautological (catalog-vs-catalog comparison in the strongest assertion) |
| `supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql` | Gate comportamental — RLS, idempotência, CHECKs, trigger | ✓ VERIFIED | 653 lines, 14 assertions + auto-enforced count gate (o); real JWT impersonation, real fixture with cleanup |
| `database.types.ts` | Tipos incl. as 2 tabelas + enum `status_notificacao` | ✓ VERIFIED | `notificacoes_enviadas` (18-col Row/Insert/Update, `destinatario_original` required in Insert, `modo?` optional), `config_sla_etapa`, enum with 6 labels — confirmed by grep and by reading the actual diff (146/0) |
| `.planning/todos/done/37-drift-prod-tabelas-notificacao.md` | Item de drift resolvido, histórico preservado | ✓ VERIFIED | Present with 4-block resolution (`Resolvido`/`Corrigido`/`Deliberadamente NÃO feito`/`Continua em aberto`); `git log --follow` confirms rename chain intact |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `20260721000001_notificacoes_enviadas.sql` § `rh_le_notificacoes` | `20260716000001_agendamentos_entrevista.sql` § `rh_gerencia_agendamento` | Predicate text should be the same join-through vaga-scoped shape | ✓ WIRED | Directly compared both `USING` clauses in this session — identical text (`administrador` OR `rh AND candidatura_id IN (SELECT ... JOIN vagas ... WHERE v.created_by = auth.uid())`) |
| `supabase/functions/_shared/email-config.ts` (`resolverDestinatario`/`resolverModo`, P36) | `notificacoes_enviadas.destinatario_original` / `.modo` | Column shape matches the pair those functions produce | ✓ WIRED | Additive migration's column comments explicitly cite `resolverDestinatario()`/`resolverModo()`; `modo` domain (`producao`/`teste`) and fail-safe default (`teste`) mirror the described contract |
| `p37_fidelidade_schema_smoke.sql` | `pg_constraint`/`pg_policies`/`pg_indexes`/`information_schema.columns` | Catalog queries, not string transcription for the strongest assertion | ✓ WIRED | Confirmed via source read — assertion (e) reads `rh_gerencia_agendamento.qual` from the catalog live, not a hand-typed literal |
| `database.types.ts` § `notificacoes_enviadas`/`config_sla_etapa` | P38 EF / P40 `DashboardCandidatoPage` | Typed consumption, no `any` | ⚠ N/A (future phase) | Types exist and are correctly shaped; actual consumption is P38/P40 scope, not verifiable here — correctly deferred |

### Data-Flow Trace (Level 4)

Not applicable in the conventional sense — this phase produces no UI/API surface, only database schema + regenerated types. The equivalent "data flows" check is: does `database.types.ts` (generated from the **live PROD catalog**, not from the local migration files) actually contain the new columns? Yes — confirmed above. Since `npm run db:types --linked` reads PROD directly, this is strong indirect proof the additive migration was truly applied in PROD (a generator cannot invent columns from a catalog that doesn't have them).

### Behavioral Spot-Checks / Commands Re-Run

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Test suite | `npm run test:run` | `126 passed (126)` files / `1018 passed (1018)` tests | ✓ PASS — matches claimed 126/1018 exactly |
| Build | `npm run build` | Green; `assert-no-secrets PASSED`; `assert-chunks PASSED` (41 chunks, eager 902.94kB < 2722.92kB baseline) | ✓ PASS |
| Lint baseline | `npm run lint 2>&1 \| grep -c "error TS"` | `97` | ✓ PASS — matches claimed baseline (97), under CI ceiling (104) |
| Migration files exist + non-trivial | `wc -l` on 5 core SQL artifacts | 158/108/178/495/653 lines | ✓ PASS |
| No `CREATE TABLE IF NOT EXISTS` in real DDL | `grep` on non-comment lines | 0 hits | ✓ PASS |
| No `BEGIN;`/`COMMIT;` wrapper | `grep -E "^\s*(BEGIN\|COMMIT)\s*;"` | 0 hits, all 3 files | ✓ PASS |
| No `CREATE INDEX` in additive migration | `grep` | 0 hits (only in a comment header) | ✓ PASS |
| No new `CREATE POLICY` | `grep` across 3 migration files | 2 hits total, both pre-existing PROD policies (reconstructed, not new) | ✓ PASS |
| Role literal correctness | `grep "'admin'"` (bare) vs `'administrador'` | 0 bare / 3 correct occurrences | ✓ PASS |
| Anti-pattern scan (TBD/FIXME/XXX/TODO/HACK/placeholder) | `grep -iE` on 5 SQL artifacts | Only false positives (word "placeholder" in a comment explaining its avoidance; "TODOS" Portuguese substring match) | ✓ PASS — no real debt markers |
| Ledger reconciliation (independent, via CLI not MCP) | `supabase migration list --linked` | `20260721000001\|20260721000001`, `20260721000002\|20260721000002`, `20260722000001\|20260722000001`, `20260722000002\|20260722000002` — Local=Remote for all 4 | ✓ PASS — independently corroborates 37-04/37-05 SUMMARY claims through a different tool path |
| Commit existence | `git cat-file -t` on 8 referenced commits | All resolve to `commit` | ✓ PASS |
| `git log --follow` on archived todo | `git log --follow --oneline` | Chain intact: `f35c3e6 → 61527d9 → f16cb6d → 2b19935` | ✓ PASS |
| `database.types.ts` diff purity | `git show --stat 7ecf891` | `146 insertions(+), 0 deletions` | ✓ PASS |

### Probe Execution

No conventional `scripts/*/tests/probe-*.sh` files exist for this phase; the phase's equivalent gate mechanism is the two `supabase/tests/p37_*.sql` smoke files, which are SQL executed via Supabase MCP `execute_sql` (not invocable from this Bash-only session — I do not have MCP tool access). Per the task brief, PROD execution results (12/12 baseline, 6/6 post-additive delta, 7/7 behavioral core, plus 14/14 in the disposable-container pre-validation) are treated as fact, already independently affirmed by the orchestrator. I corroborated this indirectly through: (1) the ledger CLI check above, (2) the `database.types.ts` diff being generated from the live PROD catalog and correctly reflecting the new columns, (3) direct source review confirming the smoke files are read-only/non-tautological/well-constructed, and (4) structural comparison of the `rh_le_notificacoes` predicate against its audited precedent.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LEDGER-01 | 37-01/02/03/04/05 | `notificacoes_enviadas` audit trail exists | ✓ SATISFIED | Migration file + types + PROD apply evidence |
| LEDGER-02 | 37-01/02/03/04 | `UNIQUE(dedupe_key)` durable idempotency | ✓ SATISFIED | Constraint + empirical smoke assertion (a)/(b) |
| LEDGER-03 | 37-01/02/03/04 | RH vaga-scoped join-through + candidato-DENY | ✓ SATISFIED | Policy text structurally verified against audited precedent + behavioral smoke (g/h/i/j) |
| TIMELINE-01 | 37-01/02/03/04/05 | `config_sla_etapa` non-PII, public-read, seeded | ✓ SATISFIED | Migration + seed + smoke (k)/(l) |

No orphaned requirements: REQUIREMENTS.md traceability table maps exactly these 4 IDs to Phase 37, and all 4 appear in at least one plan's `requirements:` frontmatter field.

### Anti-Patterns Found

None (blocker or warning level). All grep hits for debt markers were false positives (comment text explaining deliberate avoidance of a placeholder pattern; Portuguese word substring collisions with "TODO"). No stubs, no empty handlers, no hardcoded-empty returns — this is pure DDL/SQL, not application code, so the React/API stub patterns in the skill's checklist do not apply.

## Skepticism Directive — Answered

1. **Is the fidelity smoke tautological?** No. Read the full 495-line file. It queries the live Postgres catalog (`information_schema.columns`, `pg_constraint`, `pg_indexes`, `pg_policies`, `pg_trigger`, `pg_enum`) and compares against independently-transcribed literal arrays — not against the migration file's text at runtime. The single most important assertion, (e), goes further and compares one live-catalog read (`rh_le_notificacoes.qual`) against a second live-catalog read (`rh_gerencia_agendamento.qual`, the audited P33/WR-04 precedent) — a genuine catalog-vs-catalog comparison, not "comparing a thing to itself." I independently verified this claim's premise by opening `20260716000001_agendamentos_entrevista.sql` and confirming its `USING` clause text is identical to the reconstructed `rh_le_notificacoes` predicate.

2. **Is the "10 sabotagens" / disposable-container claim real or narrative?** I cannot reproduce the disposable Postgres container run from this session (no DB access here). However, the smoke files show strong evidence of iterative, adversarial construction rather than one-shot narrative: they correctly handle a genuine Postgres subtlety (PG17 `NOT NULL` appearing in `pg_constraint` as `contype='n'`, filtered out to keep counts stable), correctly reason through `now()` being transaction-start-constant (redesigning the trigger-timestamp assertion to backdate fixture rows instead of naively asserting `>`), and include a self-enforcing count gate (`smoke37.pass` GUC) specifically to defeat a documented pitfall (partial/SKIP runs reading as green). This level of correctness is consistent with real iteration against a real database, not narrative. I treat the "10 sabotagens" claim as plausible but not independently re-verified by me.

3. **Is the "desvio deliberado" (partial re-run inline via MCP, not the full 1148 lines both times) acceptable?** Yes, on inspection. The argument is that `ADD COLUMN`/`ADD CONSTRAINT`/`CREATE TRIGGER` cannot alter enum labels, unrelated `indexdef`, an unrelated policy's `qual`, or unrelated seed data — that is correct Postgres semantics. The items that *could* change with the additive DDL (column/constraint/trigger counts, presence of the 2 new columns) *were* re-verified in Ata 2 of `37-04-SUMMARY.md` (6/6 PASS). This is a reasoned, bounded trade-off, not corner-cutting — I flag it as a WARNING-level note (see below), not a blocker.

4. **Is the unknown drift origin a phase gap or legitimately out of scope?** Out of scope, and appropriately disclosed rather than silently dropped. `37-CONTEXT.md` explicitly rescoped Phase 37 to "reconciliar o drift e fechar as lacunas" — never "find out who applied it." The archived todo's "Continua em aberto" section names the unknown origin first and flags "a mesma falha pode se repetir" as a process signal. This is honest incompleteness, not a phase-level failure. I recommend (informational, non-blocking) that a `.planning/todos/pending/` item be opened to track this as a process/security follow-up, since currently the warning only lives inside an archived `done/` document where it is less likely to be revisited.

## Independent Corroboration Beyond the Brief

Two checks in this report were **not** pre-supplied by the verification instructions and were run purely on my own initiative to stress-test the SUMMARY narrative:
- `supabase migration list --linked` (via CLI, a different tool path than the orchestrator's MCP) — confirms ledger reconciliation independently.
- Direct text comparison between `rh_le_notificacoes` (new) and `rh_gerencia_agendamento` (audited precedent, P33/WR-04) — confirms the smoke's strongest assertion is testing something real, not a tautology.

Both corroborate the SUMMARY claims rather than contradicting them.

## Minor Findings (non-blocking)

1. **Stale ROADMAP.md checkbox.** `.planning/ROADMAP.md` line 97 still shows `- [ ] 37-01-PLAN.md` even though `37-SCHEMA-VIVO.md` and (as of commit `13696ad`, the most recent commit in the repo) `37-01-SUMMARY.md` exist and are committed. `STATE.md` correctly shows the phase as 5/5 COMPLETE with an explanatory note about the SUMMARY-counting handler gap. Cosmetic only — does not affect the phase's actual deliverables. Recommend updating the ROADMAP checkbox in a follow-up commit.
2. **Drift origin has no dedicated tracking item.** See skepticism point 4 above — recommend opening a `.planning/todos/pending/` entry.

Neither finding blocks phase completion; both are informational and do not affect any of the 13 must-haves above.

## Human Verification Required

None. This phase is pure database schema/migration work with no UI, no visual component, and no real-time/external-service behavior that requires human judgment beyond what has already been verified by SQL assertions (structural + behavioral) and by the commands re-run in this session.

## Gaps Summary

No gaps. All 13 consolidated must-haves (4 ROADMAP Success Criteria + 9 rescoped-goal-specific truths drawn from PLAN frontmatter across the 5 plans) are VERIFIED against actual codebase evidence — not SUMMARY claims taken on faith. Every command referenced in the verification brief was independently re-run in this session and matched the claimed output exactly (test count, build green, lint baseline, ledger state). The two smoke files were read in full and confirmed to be genuine behavioral/structural tests rather than tautological or narrative-only. Two minor, non-blocking documentation-hygiene items are noted above for optional follow-up.

---

_Verified: 2026-07-22T18:16:59Z_
_Verifier: Claude (gsd-verifier)_
