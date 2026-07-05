---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: M4 — Correção & Blindagem do Funil
status: executing
stopped_at: "Phase 22 / Plan 22-02 complete — supply-chain hardened: 8 wildcards pinned, 2 dead deps removed, vitest/@vitest/ui/happy-dom advisories cleared, 691/691 non-guard Vitest green (CI-09/11/12)"
last_updated: "2026-07-05T21:09:16.479Z"
last_activity: 2026-07-05
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 6
  completed_plans: 2
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-05 — M4/v4.0 kickoff)

**Core value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Current focus:** Phase 22 — Rede de Testes, Destravamento & Varredura de Honestidade

## Current Position

Phase: 22 (Rede de Testes, Destravamento & Varredura de Honestidade) — EXECUTING
Plan: 3 of 6
Status: Ready to execute
Last activity: 2026-07-05

Progress: [███░░░░░░░] 33%

## Roadmap (M4 — Phases 22–27)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 22 — Rede de Testes, Destravamento & Varredura de Honestidade | Corpus Deno verde em CI + typecheck destravado (baseline 257) + login/landing/copy honestos | CI-01/02/04/05/08/09/11/12/14, UX-02/04/05 |
| 23 — Ressurreição da Stack de IA | 7 call_types com prompt real + circuit breaker/retry/guardrails vivos + descritor qualitativo | AI-01..07, UX-07/09 |
| 24 — Blindagem Segurança / PII / LGPD | RLS nunca é segredo de coluna + EF privilegiada autentica-E-autoriza + IDOR/PII fechados | SEC-01..11, UX-08 |
| 25 — Funil (lado RH) | Kanban/Editar-Vaga/decisão sobre enums+colunas que existem; RH não rejeita sem trilha (RNF-07a) | FUNIL-02/03/04/05/06/09/11, UX-03/06 |
| 26 — Funil (lado candidato) | Etapas alcançáveis + scoring íntegro/não-manipulável + reinscrição pós soft-delete | FUNIL-01/07/08/10/12, UX-01 |
| 27 — Migrations & Rede de Testes | 49 migrations reconstroem o banco + ledger converge + testes cobrem auto-reject/contratos | DBMIG-01/02, CI-03/06/07/10/13/15 |

Coverage: 56/56 requirements mapeados ✓ · 0 unmapped. Execução numérica: 22 → 23 → 24 → 25 → 26 → 27.

## Performance Metrics

**Velocity (histórico de milestones):**

- M1 (v1.0): 7 fases / ~40 plans — shipped 2026-06-06. · M2 (v2.0): 11 fases / 63 plans — shipped 2026-06-26. · Phase 17 standalone: 5 plans — shipped 2026-06-28. · M3 (v3.0): 4 fases / 16 plans — shipped 2026-06-30.
- Ledger detalhado por plano arquivado em `milestones/v1.0-*`, `milestones/v2.0-*`, `milestones/v3.0-*` e nos SUMMARY de cada fase.

**By Phase (M4):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 22 | TBD | - | - |
| 23 | TBD | - | - |
| 24 | TBD | - | - |
| 25 | TBD | - | - |
| 26 | TBD | - | - |
| 27 | TBD | - | - |

*Updated after each plan completion.*
| Phase 22 P01 | 13min | 2 tasks | 2 files |
| Phase 22 P02 | 18min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Log completo em PROJECT.md Key Decisions. Recentes que afetam o M4:

- [M2/Phases 6–15]: Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL `$$`; grava version row sozinho) — relevante p/ DBMIG-01 (reconstrução do banco + ledger converge).
- [M2/Phase 10]: EFs privilegiadas = two-client + autorizar DEPOIS de autenticar (IDOR/PII guard) — base direta de SEC-04/05/06/08 (autentica-E-autoriza).
- [M2/Phases 8/11]: RLS é row-level, não column-level; `select('*')` vaza gabarito/veredito → answer-keys candidato-DENY + leitura via RPC SECURITY DEFINER — base de SEC-01/02/07.
- [M2/AVAL-03]: Imports `npm:` ESTÁTICOS em toda EF de IA (nunca `await import([...].join(""))`) — relevante p/ AI-01..07 ao mexer nas EFs de IA.
- [M3/Phase 18]: callAi tem per-call timeout (25s default) + maxRetries:0 + retry/backoff hand-rolled — AI-03/04 corrigem o casamento do timeout retriável e o override per-EF.
- [M2/Phases 6/13/15]: Revisão humana sempre obrigatória pós-IA; zero auto-rejeição por score (RNF-07a) — invariante a preservar em FUNIL-02, e o `submit-candidatura` é o único auto-reject sancionado (CI-03).
- [Phase ?]: [Phase 22/22-01] Deno EF corpus green under type-check ON via deno.json top-level exclude of the strict-schema Vitest probe; canonical CI command = deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions (--ignore= fallback NOT needed on Deno 2.7.7)
- [Phase ?]: [Phase 22/22-01] Fixed stale LOCAL timeoutMs type in ai-client.test.ts loadClient(), not product CallAiArgs (already has it) — zero product change
- [Phase ?]: [Phase 22/22-02] Pinned 8 wildcard prod deps to EXACT lockfile versions (no ^) as supply-chain ceiling — @tiptap/* 3.10.1, clsx 2.1.1, react-dnd/html5-backend 16.0.1, tailwind-merge 3.3.1 (CI-09); removed dead deps motion + @supabase/auth-helpers-react (CI-12)
- [Phase ?]: [Phase 22/22-02] Bumped vitest+@vitest/ui 4.0.7→4.1.9 lockstep (UI-server RCE) + happy-dom 20.0.10→20.10.6 (code-exec); vite 6.3.5 unchanged; 3 named advisories cleared, 691/691 non-guard Vitest green (CI-11)
- [Phase ?]: [Phase 22/22-02] Pre-existing LGPD-04 guard red (psicólogo literal in gerar-devolutiva-bigfive:192, commit 7853eac) is version-independent + out of supply-chain scope → deferred not fixed; trivial fragment-join fix logged in deferred-items.md for UX-02/Phase-24

### Pending Todos

Absorvidos do fechamento do M3: FOUND-08 (tsc burn-down tail, baseline 257) → CI-04; `extractEfErrorCode` dedup no `@/lib/efErrors` → CI-06. CC0-01 (seed cognitivo real) fica em M5/PSICO — no M4 só o gabarito é blindado (SEC-01). Demais: ver `.planning/todos/`.

### Blockers/Concerns

- None. Roadmap M4 criado, aguardando planejamento da Phase 22.
- Dependência crítica: Phase 22 (CI-01/02) é "destrava todo o resto" — a rede de testes precisa aterrissar verde antes de P23–26 para que cada fix seja regress-guarded. CI-02 (deno green) conserta a suíte atual sobre o código atual; P23–26 alteram código+testes juntos mantendo verde.
- DBMIG-01 é âncora/risco (L) — deliberadamente late (Phase 27), regress-guardando o código já corrigido.

## Deferred Items

Carregados do fechamento do M3 (absorvidos no M4 onde indicado).

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Tech-debt | FOUND-08 (tsc burn-down tail) | Absorvido → CI-04 (Phase 22) | M2 close · M3 kickoff |
| Tech-debt | `extractEfErrorCode` dedup (@/lib/efErrors) | Absorvido → CI-06 (Phase 27) | M3 close |
| Feature | CC0-01 (item-bank cognitivo real seed) | Deferred → M5/PSICO (M4 só blinda gabarito via SEC-01) | M2 close · M3 kickoff |
| Feature | Pipeline notificação · agendamento · relatórios/KPIs · banco de talentos · retenção LGPD | Deferred → M5 (`.planning/M5-DRAFT.md`) | M4 kickoff |

## Session Continuity

Last session: 2026-07-05T21:08:55.723Z
Stopped at: Phase 22 / Plan 22-02 complete — supply-chain hardened: 8 wildcards pinned, 2 dead deps removed, vitest/@vitest/ui/happy-dom advisories cleared, 691/691 non-guard Vitest green (CI-09/11/12)
Resume file: None

## Operator Next Steps

- Revisar o draft do roadmap (`.planning/ROADMAP.md`)
- Planejar a primeira fase com `/gsd-plan-phase 22`
