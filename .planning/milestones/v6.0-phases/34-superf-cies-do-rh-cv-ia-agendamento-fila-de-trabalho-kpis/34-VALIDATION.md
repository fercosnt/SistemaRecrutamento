---
phase: 34
slug: superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-16
---

# Phase 34 — Validation Strategy

> Per-phase validation contract. The KPI-04 `funil_kpis` extension is the security/PII-critical
> piece → its behavioral JWT-impersonated SQL smoke is the load-bearing gate (above pg_policies).
> The 4 UI surfaces are vitest/component-testable.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.9` (happy-dom) + Playwright CT; **SQL behavioral smoke** via MCP `execute_sql` (result-returning form — `RAISE NOTICE` invisible over MCP, P33 learning) |
| **Config** | `vite.config.ts` (`test:` block) |
| **Quick run** | `npm run test:run` + `npm run lint` (tsc ≤104 baseline) |
| **Full suite** | `npm run test:run && npm run lint && npm run build` + the KPI smoke via MCP |
| **Estimated runtime** | vitest ~40s · lint ~30s · smoke ~2s |

---

## Sampling Rate

- **Per task commit:** `npm run test:run` + `npm run lint` (tsc must hold ≤104).
- **Per wave merge:** full `npm run test:run && npm run lint && npm run build`; for the RPC/view wave, run the SQL smoke via MCP.
- **Phase gate:** full suite green + `funil34_kpis_smokes` every assertion PASS (result-returning, zero SKIP) + `database.types.ts` regenerated (tsc holds baseline).

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Command | Wave-0? |
|--------|----------|-----------|---------|---------|
| KPI-04 | 4 new keys present, PII-free, vaga-scoped, admin bypass | **live SQL smoke** | MCP `execute_sql funil34_kpis_smokes.sql` | ✅ |
| KPI-04 | no_show join vaga-scoped + 0-agendamento → `taxa=null` (no crash / no div-by-zero) | live SQL smoke | same | ✅ |
| KPI-04 | knockout_rate correct on a seeded `motivo_rejeicao='knockout_automatico'` candidatura | live SQL smoke | same | ✅ |
| KPI-04 | drop_per_stage uses closed/exited denominator (excludes in-progress) + no knockout self-loop | live SQL smoke | same | ✅ |
| KPI-04 | time_to_hire median from inscricao→`aprovado` transition | live SQL smoke | same | ✅ |
| KPI-04 | **3 existing keys preserved** (median/conversion/volume) — no dropped CTE (DBMIG-02) | live SQL smoke + `pg_get_functiondef` diff | same | ✅ |
| KPI-01/03 | `v_fila_trabalho` vaga-scoped (recruiter A ≠ B) + `entrou_etapa_em`=latest transition | live SQL smoke | same (or `v_fila_trabalho_smoke`) | ✅ |
| KPI-01/03 | SLA badge aging/breach classification from `entrou_etapa_em` | unit | `npm run test:run` (`slaThresholds` pure-fn test) | ✅ |
| KPI-02/04 | Dashboard renders MetricCards + charts from RPC keys; loading/empty/error states | component | `npm run test:run` | ✅ |
| VISRH-01 | CV button → `getSignedUrl` → `window.open`; never caches/logs the URL | unit + grep guard | `npm run test:run` + signed-url console grep guard | partial |
| VISRH-02 | IA hook allowlist projection (no `select('*')`), full arrays (no `.slice(0,2)`), candidate never sees | component + grep | `npm run test:run` | ✅ |
| VISRH-03 | Histórico hook allowlist read, read-only render | component | `npm run test:run` | ✅ |
| AGEND-02/03 | `agendamentoService` payload EXCLUDES trigger-stamped cols (vaga_id/agendado_por/updated_*); reagendar/cancelar/compareceu semantics | unit | `npm run test:run` | ✅ |
| all reads | no `select('*')` in new services | grep guard | `npm run test:run` (extend `src/__tests__/guards/*.grep.test.ts`) | partial |

---

## Wave 0 Requirements

- [ ] **`supabase/tests/funil34_kpis_smokes.sql`** — the load-bearing KPI-04 gate. Clone the `seg32_smokes.sql` / P33 harness: `set_config('request.jwt.claims', …)` JWT impersonation + `SET ROLE authenticated`; **result-returning** (per-assertion `set_config('smoke34.<x>', …)` + final `SELECT` — RAISE NOTICE invisible over MCP); PII-leak regex `v_res::text ~* '"(ator|candidato_id|candidatura_id|candidato|nome|email|cpf|user_id)"…'`.
  **⚠ FIXTURE CORRECTION (P32/P33 live fact — overrides the RESEARCH "synthetic recruiter" note):** `vagas.created_by` **HAS** FK `vagas_created_by_fkey` → recruiters MUST be **real 0-vaga `usuarios_rh` users** (discover 2 distinct + 1 admin), NOT synthetic UUIDs (Pitfall 4). Real FK-bound candidato(s).
  Seed: 1 hired candidatura (transition→`aprovado`), 1 knockout (`motivo_rejeicao='knockout_automatico'`), 1 agendamento `compareceu=false`, 1 `compareceu IS NULL`, + an empty vaga (0 agendamentos → `no_show_rate.taxa` must be `null`, not error). ROLLBACK-free disposable-UUID cleanup.
- [ ] `slaThresholds.ts` (`SLA_POR_ETAPA` constant) + aging/breach pure-fn unit test.
- [ ] IA / Histórico / agendamento service+hook tests — allowlist projection (no `select('*')`, no `.slice`, correct payload excluding trigger-stamped cols).
- [ ] Dashboard + Fila component tests — states contract (loading/empty/error/success) via `AsyncState`/`HubSection`.
- [ ] Grep-guard extension — new services added to `select('*')` / trigger-stamped-column tripwires.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Instructions |
|----------|-------------|------------|--------------|
| CV opens the real PDF in a new tab for the owning RH; denied for a non-owner recruiter (live EF round-trip) | VISRH-01 | Needs a live signed-URL round-trip against a real CV in PROD storage | Deferred to a live HUMAN-UAT (precedent P21) — the EF authz is already proven by P32 smoke (a) |
| Charts render legibly (visual) | KPI-02 | Visual judgment | Live check / screenshot |

*Remaining behaviors have automated coverage.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`funil34_kpis_smokes.sql`, slaThresholds, service tests)
- [ ] KPI smoke uses REAL 0-vaga usuarios_rh (not synthetic)
- [ ] `nyquist_compliant: true` set once Wave 0 authored

**Approval:** pending
