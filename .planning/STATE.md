---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: M3 — Refinamento RH & Hardening
status: executing
stopped_at: Completed 18-02-PLAN.md (RESIL-02 bigfive Promise.allSettled fan-out)
last_updated: "2026-06-29T06:10:29.598Z"
last_activity: 2026-06-29
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 7
  completed_plans: 2
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29 — M3/v3.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 18 — Resiliência das EFs de IA & Bugs do Funil

## Current Position

Phase: 18 (Resiliência das EFs de IA & Bugs do Funil) — EXECUTING
Plan: 3 of 7
Status: Ready to execute
Last activity: 2026-06-29

Progress: [███░░░░░░░] 29%

## Roadmap (M3 — Phases 18–21)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 18 — Resiliência EFs & Bugs Funil | EFs de IA resistem a latência/overload + 4 achados live corrigidos | RESIL-01/02/03, FIX-01/02 |
| 19 — Performance (Bundle & Cache) | First paint sem 661 KiB monolítico + mudanças escritas em ≤60s | PERF-03, PERF-04 |
| 20 — Refino RH (Editar Guia) | RH edita guia de entrevista por write-path seguro auth-then-authz | ENTREV-06/07/08 |
| 21 — Production-Readiness (UATs) | UATs live deferidos do M2 fechados em PROD | PROD-01, PROD-02 |

Coverage: 12/12 requirements mapeados ✓ · 0 unmapped. Execução numérica: 18 → 19 → 20 → 21.

## Performance Metrics

**Velocity (histórico de milestones):**

- M1 (v1.0): 7 fases / ~32 plans — shipped 2026-06-06. · M2 (v2.0): 11 fases / 63 plans — shipped 2026-06-26. · Phase 17 standalone: 5 plans — shipped 2026-06-28.
- Ledger detalhado por plano arquivado em `milestones/v1.0-*`, `milestones/v2.0-*` e nos SUMMARY de cada fase.

**By Phase (M3):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 18 | TBD | - | - |
| 19 | TBD | - | - |
| 20 | TBD | - | - |
| 21 | TBD | - | - |

*Updated after each plan completion.*
| Phase 18 P01 | 18min | 3 tasks | 2 files |
| Phase 18 P02 | 7min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions. Recentes que afetam o M3:

- [M2/Phases 6–15]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row sozinho).
- [M2/Phase 10]: EFs privilegiadas = two-client + autorizar DEPOIS de autenticar (IDOR/PII guard) — base direta do write-path do ENTREV-08.
- [M2/AVAL-03]: Imports `npm:` ESTÁTICOS em toda EF de IA (nunca `await import([...].join(""))`) — relevante p/ RESIL-01/02.
- [M2/Phases 6/13/15]: Revisão humana sempre obrigatória pós-IA; zero auto-rejeição por score (RNF-07a) — invariante a preservar no guia (ENTREV-08).
- [Phase ?]: [Phase 18/18-01] RESIL-01: callAi passa { timeout: AI_CALL_TIMEOUT_MS (25s default), maxRetries:0 } no 2o arg de parse() em ambos os provedores; loop hand-rolled e o unico dono do retry (Pitfall 1). Env-config com default-guard.
- [Phase ?]: [Phase 18/18-01] Open Question A2 RESOLVIDA: parse() aceita 2o arg RequestOptions em @anthropic-ai/sdk@0.102.0 + openai@6.42.0 (verificado nos .d.ts cacheados); rota per-call escolhida (sem fallback de constructor). _shared change so vale em PROD apos redeploy (Plan 18-07, Pitfall 6).
- [Phase 18]: [Phase 18/18-02] RESIL-02: gerar-devolutiva-bigfive paraleliza as 5 dims OCEAN via Promise.allSettled (index-mapped → ordem O-C-E-A-N preservada), 1 tentativa/dim (era 2), degrade per-dim inline ao BAND_TEMPLATES; mata o timeout achado #2. NOT Promise.all. Code-only — live so apos redeploy Plan 18-07 (bundle freeze).

### Pending Todos

SEED-001 (`ENTREV-GUIA-EDIT-01`) absorvido como ENTREV-06/07/08 → Phase 20. Demais: ver `.planning/todos/`.

### Blockers/Concerns

- Phase 18 sem CONTEXT.md ainda — recomendado `/gsd-discuss-phase 18` antes de planejar (achados live #1–4 têm detalhe operacional em MEMORY `project_funil_e2e_seed_achados`).

## Deferred Items

Carregados do fechamento do M2. HARD-02 + PERF-01 entraram no M3 como PERF-03/PERF-04; o resto fica para M4.

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Tech-debt | FOUND-08 (tsc burn-down tail) | Deferred → M4 | M2 close + M3 kickoff |
| Tech-debt | CC0-01 (item-bank cognitivo real seed) | Deferred → M4 | M2 close + M3 kickoff |
| Feature | SCHED-01 / BIAS-01 / JUDGE-01 / NORM-01 / DEVOL-01 | Deferred → M4 candidates | M3 kickoff |

## Session Continuity

Last session: 2026-06-29T06:10:29.593Z
Stopped at: Completed 18-02-PLAN.md (RESIL-02 bigfive Promise.allSettled fan-out)
Resume file: None
