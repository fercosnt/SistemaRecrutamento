# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06)
- ✅ **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (shipped 2026-06-26)
- 🔧 **Standalone (pós-v2.0)** — Phase 17 (Navegação & Arquitetura de Informação) — mini-fase fora de milestone

## Phases

<details>
<summary>✅ v1.0 — M1 MVP Candidato (Phases 1–5) — SHIPPED 2026-06-06</summary>

Full detail archived in `milestones/v1.0-ROADMAP.md`. Requirements: `milestones/v1.0-REQUIREMENTS.md`. Audit: `milestones/v1.0-MILESTONE-AUDIT.md` (PASSED, 38/38 reqs).

</details>

<details>
<summary>✅ v2.0 — M2 Funil RH + Avaliação por IA (Phases 6–16) — SHIPPED 2026-06-26</summary>

Full detail archived in `milestones/v2.0-ROADMAP.md`. Requirements: `milestones/v2.0-REQUIREMENTS.md`. Audit: `v2.0-MILESTONE-AUDIT.md` (PASSED, 42/42 reqs; the single BLOCKER AVAL-03 was fixed + redeployed + PROD-smoked post-audit).

The full RH hiring funnel + AI-assisted evaluation across 11 phases (63 plans): pipeline backbone & RLS (P6), vaga config + tags (P7), inscrição + objective knockouts (P8), shared AI prompt library + cost infra (P9), AI triagem + comparativo (P10), async evaluation — Work-Sample/SJT + Big Five + cultural redação with mandatory human review (P11–13), AI-companion interviews + cognitive (P14), auditable final decision + LGPD Art. 20 + bias audit (P15), and WCAG-AA / tech-debt hardening (P16). Invariant: the system NEVER auto-rejects on a score (RNF-07a); AI is always a recommendation with a human decision.

</details>

### Phase 17 — Navegação & Arquitetura de Informação (standalone mini-fase)

**Goal:** Cabear na navegação real de produção o funil construído no M2 (avaliação do candidato + workspaces RH de entrevista/redação/decisão + telas admin), hoje só alcançável por URL direta / DevNavigationMenu DEV-only. Reescreve o perfil mock do RH como hub de candidato real (guiado por etapa), consolida Dashboard × Perfil do candidato, dá entrada às telas admin, adiciona 404, remove legado morto comprovado, e protege as jornadas com teste E2E de navegabilidade.

- **Origem:** auditoria `.planning/ui-reviews/nav-audit-2026-06-28.md` (§6 recomendações). Absorve os todos RH-NAV-WIRING-01, CAND-DASH-DUP-01, ENTREV-PERFIL-DUP-01.
- **Tipo:** mini-fase standalone fora de milestone (pós v2.0 arquivado). Não adiciona capacidades novas — é wiring de navegação + IA + limpeza de legado.
- **Context:** `.planning/phases/17-navegacao-arquitetura-informacao/17-CONTEXT.md`
- **Status:** Context gathered — ready for `/gsd-plan-phase 17`.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 (M1) | v1.0 | 40/40 | Complete | 2026-06-06 |
| 6–16 (M2) | v2.0 | 63/63 | Complete | 2026-06-26 |
| 17 | standalone | 0/— | Context gathered | — |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/v1.0-*`.*
*v2.0 milestone shipped 2026-06-26 — full requirements and roadmap detail archived under `.planning/milestones/v2.0-*`. 11 phases (6–16), 42/42 requirements, audit PASSED.*
