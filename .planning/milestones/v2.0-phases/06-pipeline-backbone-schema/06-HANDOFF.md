---
artifact: Execution Handoff
phase: 06-pipeline-backbone-schema
status: APPLIED via Supabase MCP 2026-06-07 — only git commits remain
project_ref: isljnozzlvckrgjjbjwp
created: 2026-06-07
---

> **UPDATE 2026-06-07:** All 6 migrations were APPLIED to production via the Supabase MCP
> (`execute_sql`), all 5 SQL audits passed, `database.types.ts` regenerated, `npm run test:run`
> = 358/358. Migrations recorded in `supabase_migrations` (versions 20260607000001–06). The trigger
> shipped as **SECURITY DEFINER** (deviation D-06-DEFINER, approved — see runbook). **The manual
> SQL-Editor steps below are now historical** — the ONLY remaining work is the git commits (the
> tsc-292 hook blocks agent commits). See the "Commits" section.

# Phase 6 — Execution Handoff (authoring complete)

All 7 files for Phase 6 are **authored and pass their plan verification greps**. What remains is
inherently yours: the **commits** (agent commits are blocked by the tsc-292 pre-commit hook +
classifier-barred bypass) and the **3 live-DB applies** (Supabase SQL Editor, D-22 42601 workaround,
mutating live production data). Do these in your terminal / SQL Editor.

## Files authored (all pass acceptance greps)

| Plan | File | Apply mechanism |
|------|------|-----------------|
| 06-01 | `.planning/phases/06-pipeline-backbone-schema/06-SQL-SMOKE-RUNBOOK.md` | n/a (verification harness — fill result blocks as you go) |
| 06-02 T1 | `supabase/migrations/20260607000001_historico_candidatura.sql` | SQL Editor (apply AFTER cutover) |
| 06-02 T2 | `supabase/migrations/20260607000002_etapa_processo_v2_cutover.sql` | SQL Editor (42601) — **live data** |
| 06-03 T1 | `supabase/migrations/20260607000003_decisao_final.sql` | db push or SQL Editor |
| 06-03 T2 | `supabase/migrations/20260607000004_bias_audit_log.sql` | db push or SQL Editor |
| 06-04 T1 | `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` | SQL Editor (42601) |
| 06-05 T1 | `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql` | SQL Editor (42601-eligible) |

## ⚠ Apply order ≠ file-timestamp order

The cutover (`...02`) must run **before** `historico_candidatura` (`...01`) because the audit table
references `public.etapa_processo`, which only becomes the v2 type after the cutover's final RENAME.
File timestamps stay `...01`/`...02` only so `migration repair` reconciles cleanly. **Do NOT rely on
`supabase db push` to apply the batch** — it runs in timestamp order and would hit `...01` (and the
42601 migrations) first. Apply manually in the SQL Editor in the dependency order below, repair all,
then run one `db push` to confirm.

## Recommended path — one SQL-Editor session, dependency order

Run in the **Supabase SQL Editor** (project `isljnozzlvckrgjjbjwp`):

1. **Runbook §A discovery** — paste §A queries, capture `discovery_total_rows` + distribution into
   the runbook §A result block. Note any orphan etapa values.
2. **`...02` cutover** — paste + run. (Takes the `backup_m2` snapshot, swaps the enum, renames back
   to `etapa_processo`, adds `etapa_justificativa`.)
3. **`...01` historico_candidatura** — paste + run (now `public.etapa_processo` is v2).
4. **Orphan audit (only if §A showed orphans)** — run the INSERT template in `...02`'s trailing comment.
5. **Runbook §B FUNIL-01 smoke** — `post_total` MUST equal `discovery_total_rows`. Capture to §B.
6. **`...03` decisao_final** + **`...04` bias_audit_log** — paste + run.
7. **`...05` avancar_etapa trigger** — paste + run.
8. **Runbook §C/§D smokes** — pick a real candidatura at `triagem`; run the 4 regression cases + the
   audit-trail query. Capture to §C/§D. Restore the test candidatura afterward (or from `backup_m2`).
9. **`...06` RLS bundle** — paste + run.
10. **Runbook §E/§F smokes** — role-impersonation + `rowsecurity` all-true + `decisao_final` LGPD-02
    audit (`= 0`) + client-INSERT-rejected. Capture to §E/§F.

Then in your terminal:

```bash
# Reconcile local migration state (mark all 6 as applied)
supabase migration repair --status applied 20260607000001
supabase migration repair --status applied 20260607000002
supabase migration repair --status applied 20260607000003
supabase migration repair --status applied 20260607000004
supabase migration repair --status applied 20260607000005
supabase migration repair --status applied 20260607000006

# Confirm remote is in sync
supabase db push --linked            # MUST report "Remote database is up to date"

# Regenerate types + regression guard
npm run db:types                     # rewrites src/types/database.types.ts (8-value enum + etapa_justificativa)
npm run test:run                     # only the pre-existing LoadingProgress carryover is allowed
```

Finally, flip the runbook frontmatter: `nyquist_compliant: true`, `wave_0_complete: true`.

## Commits (your terminal)

Suggested commit grouping (matches the plan/wave boundaries; tsc-292 hook will block unless you use
your established convention):

```bash
# Wave 1
git add .planning/phases/06-pipeline-backbone-schema/06-SQL-SMOKE-RUNBOOK.md
git commit -m "docs(06-01): SQL-smoke runbook — discovery + 5 audit harness"

# Wave 2
git add supabase/migrations/20260607000001_historico_candidatura.sql \
        supabase/migrations/20260607000002_etapa_processo_v2_cutover.sql src/types/database.types.ts
git commit -m "feat(06-02): historico_candidatura + etapa_processo v2 cutover (FUNIL-01/03)"

git add supabase/migrations/20260607000003_decisao_final.sql \
        supabase/migrations/20260607000004_bias_audit_log.sql
git commit -m "feat(06-03): decisao_final LGPD-02 guardrail + bias_audit_log schema"

# Wave 3
git add supabase/migrations/20260607000005_avancar_etapa_trigger.sql src/types/database.types.ts
git commit -m "feat(06-04): avancar_etapa() trigger — regression block + audit (FUNIL-02/03)"

# Wave 4
git add supabase/migrations/20260607000006_rls_policies_m2_backbone.sql \
        .planning/phases/06-pipeline-backbone-schema/06-SQL-SMOKE-RUNBOOK.md src/types/database.types.ts
git commit -m "feat(06-05): M2 backbone RLS bundle — candidato isolation + RH UPDATE (FUNIL-04)"
```

## After applies succeed

Tell me (or run): the 5 SQL audits green + `db push` "up to date" + types regenerated. Then I'll run
phase verification (`gsd-verifier`) and mark Phase 6 complete in ROADMAP/STATE. Resume signal per the
plans: paste the captured smoke results into the runbook and reply **"applied"**.
