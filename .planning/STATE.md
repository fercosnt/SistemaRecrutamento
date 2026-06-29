---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: M3 — Refinamento RH & Hardening
status: roadmap_created
last_updated: "2026-06-29"
last_activity: 2026-06-29
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29 — M3/v3.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** M3 (v3.0 — Refinamento RH & Hardening) — roadmap criado, pronto para planejar Phase 18.

## Current Position

Phase: 18 of 21 (Resiliência das EFs de IA & Bugs do Funil) — not started
Plan: — of TBD
Status: Roadmap created — ready to plan Phase 18
Last activity: 2026-06-29 — ROADMAP.md criado (4 fases 18–21, 12/12 requirements mapeados)

Progress: [░░░░░░░░░░] 0%

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

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions. Recentes que afetam o M3:

- [M2/Phases 6–15]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row sozinho).
- [M2/Phase 10]: EFs privilegiadas = two-client + autorizar DEPOIS de autenticar (IDOR/PII guard) — base direta do write-path do ENTREV-08.
- [M2/AVAL-03]: Imports `npm:` ESTÁTICOS em toda EF de IA (nunca `await import([...].join(""))`) — relevante p/ RESIL-01/02.
- [M2/Phases 6/13/15]: Revisão humana sempre obrigatória pós-IA; zero auto-rejeição por score (RNF-07a) — invariante a preservar no guia (ENTREV-08).

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

Last session: 2026-06-29
Stopped at: ROADMAP.md criado p/ M3 (4 fases 18–21) + REQUIREMENTS.md traceability preenchida (12/12).
Resume file: None — próximo passo `/gsd-discuss-phase 18` ou `/gsd-plan-phase 18`.
