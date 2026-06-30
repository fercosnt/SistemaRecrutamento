# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06)
- ✅ **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (shipped 2026-06-26)
- 🔧 **Standalone (pós-v2.0)** — Phase 17 (Navegação & Arquitetura de Informação) — mini-fase fora de milestone (shipped 2026-06-28)
- ✅ **v3.0 — M3 Refinamento RH & Hardening** — Phases 18–21 (shipped 2026-06-30)

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

<details>
<summary>✅ Phase 17 — Navegação & Arquitetura de Informação (standalone mini-fase) — SHIPPED 2026-06-28</summary>

Cabeou na navegação real de produção o funil construído no M2 (avaliação do candidato + workspaces RH de entrevista/redação/decisão + telas admin), antes só alcançável por URL direta / DevNavigationMenu DEV-only. Hub de candidato real, Dashboard × Perfil consolidados, entrada às telas admin, 404 glass, remoção de legado morto, teste E2E de navegabilidade. 5/5 plans / 4 waves. Verifier 13/13, security 18/18 closed, 4 UATs live fechados 4/4. Standalone — sem lifecycle de milestone.

</details>

<details>
<summary>✅ v3.0 — M3 Refinamento RH & Hardening (Phases 18–21) — SHIPPED 2026-06-30</summary>

Full detail archived in `milestones/v3.0-ROADMAP.md`. Requirements: `milestones/v3.0-REQUIREMENTS.md`. Audit: `milestones/v3.0-MILESTONE-AUDIT.md` (12/12 reqs, integration OK, status tech_debt — known/tracked items to M4).

Hardening (não expansão) do funil de IA do M2 para uso real em PROD: resiliência das Edge Functions (RESIL-01 per-call timeout+backoff, RESIL-02 devolutiva 5-dim paralela, RESIL-03 `<AsyncState>` nas 5 telas de IA) + 2 bugs de funil (FIX-01/02) (P18); code-splitting route+vendor e invalidação de cache ≤60s (PERF-03/04) (P19); RH edita/adiciona/remove/reordena o guia de entrevista por write-path seguro authenticate-THEN-authorize + merge-preserve anti-silent-discard (ENTREV-06/07/08) (P20); e fechamento dos HUMAN-UAT live deferidos do M2/M3 em PROD (PROD-01/02) (P21). **A Phase 21 achou + corrigiu 3 defeitos live em PROD: devolutiva-bigfive nunca persistia (FK auth uid vs candidatos.id), gerar-guia-entrevista 500 em toda geração (timeout 25s RESIL-01 curto demais → override per-call), e autosave sem região aria-live (P16 #4).** Invariante preservada: IA recomenda, humano decide (RNF-07a); write-paths privilegiados authenticate-THEN-authorize.

</details>

## Progress

**Execution Order:**
Phases execute in numeric order: 18 → 19 → 20 → 21

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 (M1) | v1.0 | 40/40 | Complete | 2026-06-06 |
| 6–16 (M2) | v2.0 | 63/63 | Complete | 2026-06-26 |
| 17 | standalone | 5/5 | Complete | 2026-06-28 |
| 18. Resiliência EFs & Bugs Funil | v3.0 | 7/7 | Complete   | 2026-06-29 |
| 19. Performance — Bundle & Cache | v3.0 | 3/3 | Complete   | 2026-06-29 |
| 20. Refino RH — Editar Guia | v3.0 | 5/5 | Complete   | 2026-06-30 |
| 21. Production-Readiness — UATs | v3.0 | 1/1 | Complete   | 2026-06-30 |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/v1.0-*`.*
*v2.0 milestone shipped 2026-06-26 — full requirements and roadmap detail archived under `.planning/milestones/v2.0-*`. 11 phases (6–16), 42/42 requirements, audit PASSED.*
*v3.0 milestone shipped 2026-06-30 — full requirements and roadmap detail archived under `.planning/milestones/v3.0-*`. 4 phases (18–21), 12/12 requirements, audit OK (tech_debt accepted). Phase 21 found+fixed 3 live PROD defects beyond the planned UAT scope.*
