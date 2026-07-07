# Plan 24-01 Summary — Live-State Verification (PROD)

**Status:** ✅ Complete
**Wave:** 1 (BLOCKING · non-autonomous · read-only Supabase MCP)
**Completed:** 2026-07-07
**Requirements:** SEC-01, SEC-02, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, UX-08 (live-verify)

## What was done

Ran the mandatory read-only live-state reads against PROD via Supabase MCP `execute_sql` BEFORE any Phase-24 migration is authored, and recorded the findings + per-assumption go/no-go in `24-LIVE-STATE.md`.

- **Task 1** — dumped `pg_policies` for the 6 candidate/horizontal tables + `usuarios_rh`, and `information_schema.column_privileges` for `cognitivo_itens`/`perguntas`/`redacoes_candidato`. Proved `authenticated` currently SELECTs `gabarito_idx`, `rubric`, and the 9 redação verdict columns. Confirmed A3 (grep: no authenticated reader of gabarito_idx/rubric) and A7 (candidate redação read is a base-table policy).
- **Task 2** — confirmed SEC-09 auth_admin predicate = `SELECT/supabase_auth_admin/USING true` (byte-for-behavior; drift-fix only), SEC-10 backup table EXISTS (+ 35 PII columns captured for LGPD evidence), UX-08 `bigfive_itens`=120 with {28,58,88,118} all dim O/faceta 28, and that no `ativo` column exists yet.

## Key findings (gate the authoring waves)

- All researched mechanisms **HOLD** — zero divergence. SEC-01/07 column REVOKE is safe; SEC-02 correctly uses candidate-DENY RLS + DEFINER RPC (NOT column REVOKE, since RH shares the `authenticated` role); SEC-05/06/08 policies are role-only and need vaga-scoping; SEC-09 is a pure drift declaration; SEC-10 DROP is a real op; UX-08 must ADD the `ativo` column.
- **Deviation flagged for 24-06:** SEC-09 predicate matched exactly, so no escalation — the mirror migration is a faithful declaration, not a behavior change.

## key-files
- created: `.planning/phases/24-blindagem-de-seguran-a-pii-lgpd/24-LIVE-STATE.md`

## Self-Check: PASSED
- 24-LIVE-STATE.md exists, covers all 6 tables + auth_admin predicate + backup + item count; every assumption A1/A2/A3/A5/A7 marked CONFIRMED. No migration authored or applied (read-only).
