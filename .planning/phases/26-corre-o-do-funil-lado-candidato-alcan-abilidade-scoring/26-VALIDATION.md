---
phase: 26
slug: corre-o-do-funil-lado-candidato-alcan-abilidade-scoring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-12
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. See `26-RESEARCH.md` §Validation Architecture for the per-requirement proof map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (unit/component) · Deno test (EF corpus) · SQL behavioral smokes (server-authoritative RPCs/triggers) · Playwright (e2e, gated) |
| **Config file** | `vitest.config.ts` · `supabase/functions/deno.json` |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` |
| **Type-check** | `npm run lint` (tsc --noEmit; frozen baseline ~107 — must not inflate) |
| **Estimated runtime** | ~90 seconds (vitest) + ~10s (deno) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (scoped to touched feature where possible)
- **After every plan wave:** Run full suite (vitest + deno)
- **Before verification:** Full suite green + `npm run lint` not above baseline + SQL smokes PASS on PROD
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

> Filled by the planner (per PLAN.md task) and the nyquist auditor. One row per task; every DB-authoritative behavior gets a SQL behavioral smoke (set_config request.jwt.claims + SET ROLE authenticated, disposable fixture, cleanup) as its load-bearing proof — structural greps alone are insufficient (Phase 24/25 lesson).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | — | — | FUNIL-01 | pontuar_sjt manipulation | dup-reject / full-battery denominator / re-submit lock / incomplete-reject; never writes candidaturas | sql-smoke + unit | `npm run test:run` + PROD smoke | ❌ W0 | ⬜ pending |
| TBD | — | — | FUNIL-07 | cross-battery / cross-cargo SJT | client filter itens_ids→cargo; server rejects out-of-battery pergunta_id (42501) | sql-smoke + unit | idem | ❌ W0 | ⬜ pending |
| TBD | — | — | FUNIL-08 | cognitive unreachable | container card gated by aplica_cognitivo → real route; pontuar_cognitivo (5-arg) accepts avaliacao_assincrona | contract + sql-smoke | idem | ❌ W0 | ⬜ pending |
| TBD | — | — | FUNIL-10 | reinscription blocked | insert→soft-delete→re-insert succeeds after legacy unfiltered index dropped | sql-smoke | PROD smoke | ❌ W0 | ⬜ pending |
| TBD | — | — | FUNIL-12 | phantom-field cards | card completion derived from own rows via neutral RPC (booleans only, no score leak) | unit + sql-smoke | `npm run test:run` | ❌ W0 | ⬜ pending |
| TBD | — | — | UX-01 | dishonest wait copy | canonical "Acompanhe o andamento pelo seu painel." on 6 screens; grep guard bans re-intro | grep-guard + unit | `npm run test:run` | ❌ W0 | ⬜ pending |
| TBD | — | — | n8n PII (SEC-03 2nd) | PII/URL in bundle | client URLs+PII deleted; AFTER INSERT candidatos trigger (no-PII body, graceful skip); bundle grep guard bans hstgr host + PII | grep-guard + sql-smoke | `npm run test:run` + PROD smoke | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] RED tests for `pontuar_sjt` integrity (dup, denominator, re-submit lock, incomplete) — SQL smoke harness
- [ ] RED test for the neutral status RPC (booleans only, candidate-DENY on scores_candidato)
- [ ] Contract test: cognitivo container card route ↔ `pontuar_cognitivo` accepted etapa
- [ ] Grep guard: honest wait copy (extend `src/__tests__/guards/`)
- [ ] Grep guard extension: `n8n-bundle.grep.test.ts` bans hstgr host + candidate PII literals

*Existing infrastructure (vitest + deno + Playwright) covers the harness; new RED tests are per-requirement.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FUNIL-10 legacy index discovery + drop on PROD | FUNIL-10 | Un-versioned M1 index; not in any migration file — must be discovered via `pg_indexes`/`pg_constraint` on live PROD, then dropped via MCP `execute_sql` ([BLOCKING], non-autonomous) | Run discovery SQL (26-RESEARCH §FUNIL-10); confirm the unfiltered unique on (candidato_id, vaga_id); DROP; run insert→soft-delete→re-insert smoke |
| Vault secret `n8n_webhook_base` creation | n8n PII | Operational secret = Fernando's human-action; dispatch graceful-skips until set | `vault.create_secret('<n8n base url>', 'n8n_webhook_base')` — deferred, not blocking |
| PROD migration apply | FUNIL-01/07/08/12 + n8n | Migrations apply via Supabase MCP `apply_migration` (bypasses 42601; no `db push`; no BEGIN/COMMIT wrapper) — [BLOCKING], non-autonomous | Apply each migration via MCP; reconcile version rows; run behavioral smokes |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
