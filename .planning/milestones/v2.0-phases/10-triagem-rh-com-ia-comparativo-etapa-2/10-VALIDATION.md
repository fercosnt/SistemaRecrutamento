---
phase: 10
slug: triagem-rh-com-ia-comparativo-etapa-2
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed Validation Architecture lives in `10-RESEARCH.md` (## Validation Architecture).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (frontend hooks/services/components) + `deno test` (Edge Functions, mocked SDK) + SQL smokes (trigger/tables/RLS via Supabase) |
| **Config file** | `vitest.config.ts`; deno tests under `supabase/functions/**/__tests__` |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && npm run lint && npm run build` |
| **Estimated runtime** | ~60–90 seconds (vitest); deno + SQL smokes run per-EF/per-migration |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (scoped) + relevant `deno test`
- **After every plan wave:** Run full suite `npm run test:run && npm run lint && npm run build`
- **Before `/gsd:verify-work`:** Full suite green + SQL smokes PASS + deno suites green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

> Planner fills exact task IDs. Skeleton by requirement (from RESEARCH ## Validation Architecture):

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-XX | — | 0 | TRIAGEM-01..04 | — | RED stubs calibrated to fail pre-impl | unit/deno | `npm run test:run` / `deno test` | ❌ W0 | ⬜ pending |
| 10-XX | — | 1 | TRIAGEM-01 | T-10 IDOR/PII | trigger fires only post-knockout; EF writes row ≤30s; falha → status='falhou' row | sql-smoke + deno | SQL smoke + `deno test analise-candidato-individual` | ❌ W0 | ⬜ pending |
| 10-XX | — | 1 | TRIAGEM-01 | T-10 PII-leak | `analise_candidato_vaga` RLS DENIES candidato; RH own-vaga only | sql-smoke | RLS smoke (set_config jwt claims) | ❌ W0 | ⬜ pending |
| 10-XX | — | 2 | TRIAGEM-02 | T-10 select(*) | panel read uses explicit column allowlist (no select('*')); paginated 20/pg, score DESC nulls-last, filters etapa+status | unit | `npm run test:run` (useCandidaturas) | ❌ W0 | ⬜ pending |
| 10-XX | — | 2 | TRIAGEM-03 | T-10 IDOR/400 | `comparativo-candidatos` rejects <2/>10 and mixed-vaga (400); persists comparativo_solicitado; P95 ≤5s | deno | `deno test comparativo-candidatos` | ❌ W0 | ⬜ pending |
| 10-XX | — | 3 | TRIAGEM-04 | — | comparativo table renders ≤10 columns + PDF export produces file | unit + manual | `npm run test:run` + manual PDF check | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] deno RED stubs for `analise-candidato-individual` + `comparativo-candidatos` (module-not-found → fail before impl)
- [ ] vitest RED stubs for the paginated/allowlist candidaturas query + comparativo invoke hook
- [ ] SQL smoke runbook for trigger (post-knockout only), `analise_candidato_vaga` + `comparativo_solicitado` DDL/RLS, upsert idempotency
- [ ] LGPD-04 grep guard extended to new EF/frontend paths (no "teste psicológico"); PII-redaction (Pitfall 7) for the new EF logs

*Existing infrastructure (vitest, deno, SQL smoke pattern from Phase 8/9) covers the rest.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF export opens + tabela legível com até 10 colunas | TRIAGEM-04 | jspdf render only verifiable visually | RH abre comparativo, clica Exportar PDF, abre arquivo |
| Trigger ≤30s end-to-end em PROD | TRIAGEM-01 | Requires live pg_net + Anthropic call + Vault Bearer | Submeter candidatura real pós-knockout, observar row em ≤30s |
| Painel pré-ranqueado + multi-select + comparativo P95 ≤5s | TRIAGEM-02/03 | Real candidaturas + AI latency | RH UAT no painel live |
| `is_active=true` flip dos prompts em PROD | TRIAGEM-01/03 | BLOCKING manual SQL apply | Apply via Supabase MCP/SQL Editor |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
