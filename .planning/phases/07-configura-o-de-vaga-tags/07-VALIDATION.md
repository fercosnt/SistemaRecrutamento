---
phase: 7
slug: configura-o-de-vaga-tags
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-07
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `07-RESEARCH.md` § Validation Architecture (grounded on live DB).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit + RTL component) + Playwright (e2e) — both in tree |
| **Config file** | project root (vitest config + playwright config; existing) |
| **Quick run command** | `npm run test:run -- <touched-module>` |
| **Full suite command** | `npm run test:run && npm run test:e2e` |
| **Estimated runtime** | Vitest single run ~tens of seconds; e2e longer |

**Baseline note:** tsc baseline ~292–296 pre-existing errors (FOUND-08); commits via
`git -c core.hooksPath=/dev/null` (Fernando commits in his terminal). 1 pre-existing
LoadingProgress Vitest failure carried since Phase 2 — NOT a regression; do not treat as red.

---

## Sampling Rate

- **After every task commit:** `npm run test:run -- <touched-module>` (quick)
- **After every plan wave:** `npm run test:run` (full Vitest) + `npm run build` (exit 0) + lint baseline ≤ 296
- **Before `/gsd:verify-work`:** Full Vitest + Playwright green + live SQL smoke runbook
  (RPC idempotency, RLS deny for candidato, opcao_id generation, `db push` up-to-date)
- **Max feedback latency:** quick run < ~60s

---

## Per-Requirement Verification Map

> Task IDs are TBD until plans exist; the planner maps each row to a concrete task in PLAN frontmatter.

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| VAGACFG-01 | Selecting a cargo template copies its pesos+testes into the vaga form state | unit | `npm run test:run -- config-vaga/templates` | ❌ W0 |
| VAGACFG-01 | All 8 `cargoTemplates` pesos sum to exactly 100 | unit | `npm run test:run -- cargoTemplates` | ❌ W0 |
| VAGACFG-01 | TemplateVagaSelector renders 8 cargo cards; on-select deep-copies template defaults; re-select opens "Trocar template" AlertDialog | component | `npm run test:run -- TemplateVagaSelector` | ❌ W0 |
| VAGACFG-02 | `pesosAvaliacaoSchema.refine` rejects sum≠100, accepts sum=100 (integer guard) | unit | `npm run test:run -- pesosAvaliacaoSchema` | ❌ W0 |
| VAGACFG-02 | Live "Soma: X%" indicator red when ≠100, accent when =100; no silent rebalance (D-08) | component | `npm run test:run -- PesosSliders` | ❌ W0 |
| VAGACFG-03 | `upsert_pergunta_opcoes_metadata` RPC idempotent, generates opcao_id, writes both jsonb + table | integration | manual SQL smoke (runbook) | ❌ W0 |
| VAGACFG-03 | Bulk-mark sets all options to neutro/0/null (D-11) | unit + component | `npm run test:run -- BulkMarkDialog` | ❌ W0 |
| VAGACFG-03 | Tag wizard renders only for single/multiple_choice; empty-state otherwise (D-11) | component | `npm run test:run -- PerguntaWithTagsForm` | ❌ W0 |
| D-12 | Publish gate blocks when sum≠100 OR no obrigatorio test OR knockout pergunta not obrigatoria | unit + e2e | `npm run test:run -- publishGate` | ❌ W0 |
| D-13 (regression) | Phase-4 candidato form still builds correct `z.enum` after `[{id,texto}]` shape change (normalizer from `@/lib/opcoes`) | unit (regression) | `npm run test:run -- candidaturaFormSchema` | ✅ extend |
| Migration (D-22) | PL/pgSQL migration applies via SQL-Editor/MCP path; `db push` up-to-date | manual checkpoint | runbook § smoke | ❌ W0 |
| RLS (V4) | RH/administrador can write metadata; candidato/anon cannot | integration (RLS smoke) | SQL smoke (runbook) | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/config-vaga/schemas/__tests__/pesosAvaliacaoSchema.test.ts` — VAGACFG-02 refine + integer guard
- [ ] `src/features/config-vaga/templates/__tests__/cargoTemplates.test.ts` — VAGACFG-01 all 8 sum to 100 + copy semantics
- [ ] `src/features/config-vaga/components/__tests__/TemplateVagaSelector.test.tsx` — VAGACFG-01 8-card render + deep-copy-on-select + Trocar-template AlertDialog
- [ ] `src/features/config-vaga/components/__tests__/PesosSliders.test.tsx` — live-sum color states (no silent rebalance, D-08)
- [ ] `src/features/config-vaga/components/__tests__/PerguntaWithTagsForm.test.tsx` — choice-only render + empty state (D-11)
- [ ] `src/features/config-vaga/components/__tests__/BulkMarkDialog.test.tsx` — bulk neutro/0/null
- [ ] `src/features/config-vaga/services/__tests__/configVagaService.test.ts` — error mapping + RPC call shape (mock supabase)
- [ ] `src/features/config-vaga/__tests__/publishGate.test.ts` — D-12 three conditions
- [ ] Extend `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` — D-13 regression (objects→enum), normalizer from `@/lib/opcoes/opcoesNormalize`
- [ ] `.planning/phases/07-configura-o-de-vaga-tags/07-SQL-SMOKE-RUNBOOK.md` — RPC idempotency, opcao_id gen, RLS deny, db push up-to-date
- [ ] (Optional) Playwright e2e for the publish-gate happy/sad path (desktop RH)

*Framework already present — no install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PL/pgSQL migration apply | Migration (D-22) | SQLSTATE 42601 blocks autonomous `db push` for `$$`-body + adjacent COMMENT/GRANT | Apply via Supabase SQL Editor (or Supabase MCP `execute_sql`, Phase-6 path), then `supabase migration repair --status applied <version>`, confirm `db push --linked` reports up-to-date |
| RPC idempotency + RLS deny | VAGACFG-03 / RLS | Needs live DB + role-scoped JWT | SQL smoke runbook: run RPC twice (same result), assert opcao_id generated, assert candidato/anon write denied |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (use `test:run`, never `test` watch)
- [ ] Feedback latency < 60s
- [ ] `wave_0_complete: true` set in frontmatter after Plan 01 lands the scaffold
- [ ] `nyquist_compliant: true` set in frontmatter after Plans 03/04 flip the Wave-0 tests GREEN (before `/gsd:verify-work`)

**Approval:** pending
</content>
