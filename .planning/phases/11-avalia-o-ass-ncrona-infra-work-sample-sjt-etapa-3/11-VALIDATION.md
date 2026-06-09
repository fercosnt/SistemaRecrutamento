---
phase: 11
slug: avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-09
---

# Phase 11 — Validation Strategy

> Detailed Validation Architecture in `11-RESEARCH.md` (## Validation Architecture).

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | vitest 4.x (frontend) + `deno test` (avaliar-redacao EF, mocked SDK) + SQL smokes (tables/RLS/etapa-gate/pontuar_sjt RPC) |
| Quick run | `npm run test:run` |
| Full suite | `npm run test:run && npm run lint && npm run build` |
| Estimated runtime | ~60-90s vitest |

## Sampling Rate
- After every task commit: `npm run test:run` (scoped) + relevant `deno test`
- After every wave: full suite + SQL smokes
- Max feedback latency: 90s

## Per-Task Verification Map (skeleton — planner fills task IDs)

| Wave | Requirement | Secure Behavior | Test Type | Command |
|------|-------------|-----------------|-----------|---------|
| 0 | AVAL-01..09 | RED stubs calibrated to fail pre-impl | unit/deno | `npm run test:run` / `deno test` |
| 1 | AVAL-01/09 | scores_candidato + perguntas + respostas_avaliacao + RLS (candidato own-row + etapa gate back-lock; RH allowlist read, candidato NO score read) | sql-smoke | RLS 3-role matrix via set_config jwt.claims |
| 1 | AVAL-02 | pontuar_sjt SECURITY DEFINER: Σ peso server-side, <threshold OR ≥1 atencao → pendente_humano, NEVER etapa change | sql-smoke | scoring fixture smoke |
| 2 | AVAL-03 | avaliar-redacao EF: authorize (auth.uid() owns candidatura + etapa gate — C1 lesson) before scoring; work_sample_sjt prompt; 1-5→weighted 0-25; <13/25 OR red_flag → pendente_humano; candidato/non-owner → 403 | deno | `deno test avaliar-redacao` |
| 3 | (BLOCKING) | migrations applied PROD + work_sample_sjt is_active=true + EF deployed + types regen + smokes | sql-smoke | MCP apply + smokes |
| 4 | AVAL-01/02/09 | container + SJT MC/open-case screens + autosave 30s + back-lock + testesAplicaveis ext | unit | `npm run test:run` |
| 5 | AVAL-02/03 | RH scorecard read (allowlist role-gated, no select('*')) | unit | `npm run test:run` |

## Wave 0 Requirements
- [ ] deno RED stub for avaliar-redacao (module-not-found + authz 403 cases)
- [ ] vitest RED stubs (container, autosave hook, SJT screens, scorecard allowlist)
- [ ] SQL smoke runbook (tables/RLS/etapa-gate/pontuar_sjt)
- [ ] LGPD-04 grep guard extended to new feature/EF paths

## Manual-Only Verifications
| Behavior | Req | Why Manual |
|----------|-----|-----------|
| Full candidate assessment flow live | AVAL-01/02/09 | Real candidatura at etapa=avaliacao_assincrona + AI calls |
| SJT open-case AI scoring quality | AVAL-03 | Real AI call + rubric judgment |
| Autosave 30s + back-lock end-to-end | AVAL-09 | Real session + tab close + etapa advance |
| RH scorecard visual | AVAL-02/03 | Live data + visual |

## Validation Sign-Off
- [ ] nyquist_compliant: true set in frontmatter
**Approval:** pending
