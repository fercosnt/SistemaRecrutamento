---
phase: 6
slug: pipeline-backbone-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-07
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **This is a DB-schema phase.** The canonical "tests" are SQL smoke/audit queries run
> in the Supabase SQL Editor against the live DB, plus a regression-only Vitest run.
> There is no UI this phase, so Playwright/a11y do not apply.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | SQL smoke/audit queries (SQL Editor) — primary; Vitest (regression guard only) |
| **Config file** | `vitest.config.ts` (existing) — no new framework install |
| **Quick run command** | The matching SQL audit query after each migration apply (see RESEARCH §Code Examples) |
| **Full suite command** | `npm run test:run` (regression guard — no new unit suites authored this phase) |
| **Estimated runtime** | SQL audits ~seconds each; `npm run test:run` ~existing baseline |

---

## Sampling Rate

- **Per migration apply (each SQL-Editor step):** run the matching SQL smoke immediately.
- **After the cutover migration:** run the FUNIL-01 discovery + post-cutover `GROUP BY etapa_atual` count-match.
- **Before `/gsd:verify-work`:** all five SQL audits green + `supabase db push --linked` reports "up to date" + `npm run db:types` regenerated + `npm run test:run` shows no NEW regression (the single pre-existing LoadingProgress carryover from M1 is allowed).
- **Max feedback latency:** seconds (SQL audits are interactive).

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. Rows below map each phase requirement to its
> SQL-smoke proof (source: RESEARCH §Validation Architecture → Phase Requirements → Test Map
> and §Code Examples). Plan/Wave columns fill in once PLAN.md files exist.

| Req | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-----|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| FUNIL-01 | TBD | TBD | Live enum cutover, no data loss/orphans | — | Every live row maps to a valid v2 value; counts match pre/post | SQL smoke | discovery + post-cutover `GROUP BY etapa_atual` count match | ❌ W0 (SQL Editor) | ⬜ pending |
| FUNIL-02 | TBD | TBD | Forward/skip allowed, regression w/o justificativa blocked | T-06-tamper | Direct UPDATE regressing etapa with empty justificativa raises exception | SQL smoke | regression-block smoke (RESEARCH §Code Examples) | ❌ W0 (SQL Editor) | ⬜ pending |
| FUNIL-03 | TBD | TBD | Every transition logged (criterio/ator/timestamp) | T-06-repud | Each etapa UPDATE writes one `historico_candidatura` row | SQL smoke | `SELECT ... FROM historico_candidatura` after transitions | ❌ W0 (SQL Editor) | ⬜ pending |
| FUNIL-04 | TBD | TBD | RLS: candidato isolation, RH/admin via JWT role | T-06-disclosure | Candidato cannot read another candidatura; RH/admin read per `role` | SQL smoke (role-impersonated) | RLS read test as candidato JWT vs rh JWT | ❌ W0 (SQL Editor) | ⬜ pending |
| LGPD-02 | TBD | TBD | Zero auto-decision: `decisao_final.por_usuario` never NULL | T-06-lgpd | Structural CHECK/NOT NULL + `WITH CHECK false` block any NULL-actor decision | SQL smoke + structural CHECK | `SELECT count(*) FROM decisao_final WHERE por_usuario IS NULL` → 0 | ❌ W0 (SQL Editor) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] SQL smoke runbook — the pre-cutover discovery query + the 5 audit queries (FUNIL-01..04, LGPD-02) authored as a `.sql` or markdown checkpoint artifact in the phase directory, run in the SQL Editor.
- [ ] Pre-cutover discovery query MUST run BEFORE writing the `USING` CASE (confirms live row count + `etapa_atual` distribution + that the new M2 tables are absent). Removes Assumption A1/A5 from RESEARCH.
- [ ] (Optional) Vitest integration test connecting with anon + RH JWTs asserting RLS isolation — only if the project wants automated RLS regression (per Phase 4 live-smoke lesson D-25..D-28). Not required for the phase gate.
- No framework install needed (Vitest present; SQL Editor is the primary harness).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live enum cutover on production data | FUNIL-01 | 42601 workaround requires single-session SQL-Editor apply; mutates live `candidaturas` | Run discovery → backup snapshot (`backup_m2.*`) → apply cutover SQL → post-cutover count-match audit → `migration repair --status applied <version>` → `db push` verify |
| RLS role-impersonation reads | FUNIL-04 | Requires real candidato JWT vs RH JWT context against hosted DB (local reset does not reproduce hosted auth) | In SQL Editor / app, read a candidatura as candidato A (own → visible, other → 0 rows) and as RH (all visible) |

*All other proofs are SQL audits runnable directly in the SQL Editor.*

---

## Validation Sign-Off

- [ ] All requirements have an SQL-smoke proof or Wave 0 runbook entry
- [ ] Sampling continuity: each migration apply is followed by its matching audit (no blind applies)
- [ ] Wave 0 covers the pre-cutover discovery + all five audit queries
- [ ] No watch-mode flags (SQL audits are one-shot; `npm run test:run` not `test`)
- [ ] Feedback latency < ~60s (interactive SQL)
- [ ] `nyquist_compliant: true` set in frontmatter once the runbook + audits are wired into the plans

**Approval:** pending
