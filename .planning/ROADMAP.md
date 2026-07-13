# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06)
- ✅ **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (shipped 2026-06-26)
- 🔧 **Standalone (pós-v2.0)** — Phase 17 (Navegação & Arquitetura de Informação) — mini-fase fora de milestone (shipped 2026-06-28)
- ✅ **v3.0 — M3 Refinamento RH & Hardening** — Phases 18–21 (shipped 2026-06-30)
- ✅ **v4.0 — M4 Correção & Blindagem do Funil** — Phases 22–27 (shipped 2026-07-13)

## Overview

M4 é hardening/correção do funil ponta-a-ponta — **não** expansão. Depois de M1–M3 terem construído e resfriado o produto, duas auditorias adversariais (56 achados técnicos + 74 recs de produto de 6 personas) expuseram o débito estrutural: gabarito/PII legíveis por RLS row-level, uma stack de IA silenciosamente morta, o drift M1→M2 (enums mortos, colunas fantasma, contratos quebrados, scoring manipulável), migrations que não reconstroem o banco, e a ausência da rede de testes que teria pego cada defeito live. O milestone fecha isso em 6 fases: primeiro a rede de testes/CI + typecheck destravado + a varredura de honestidade imediata (P22); depois ressuscita a IA (P23); blinda toda a superfície de PII/gabarito/IDOR (P24); corrige o funil pelo lado RH (P25) e pelo lado candidato (P26); e fecha com a reconstrução de migrations + o endurecimento da rede de testes sobre o código já corrigido (P27). Invariante em todas as fases: **IA recomenda, humano decide** — o sistema nunca auto-rejeita por score (RNF-07a), a linguagem é "avaliação comportamental/cognitiva" (RNF-12a).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

M4 continua a numeração a partir da **Phase 22** (M3 terminou na Phase 21).

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

<details>
<summary>✅ v4.0 — M4 Correção & Blindagem do Funil (Phases 22–27) — SHIPPED 2026-07-13</summary>

Full detail archived in `milestones/v4.0-ROADMAP.md`. Requirements: `milestones/v4.0-REQUIREMENTS.md`. Audit: `milestones/v4.0-MILESTONE-AUDIT.md` (status tech_debt — 55/56 reqs Complete + DBMIG-01 sanctioned partial: ledger convergiu live 73/73, baseline+rebuild proof diferido environment-gated; 0 blockers, 0 orphans).

Hardening/correção do funil ponta-a-ponta (**não** expansão) em 6 fases (43 plans): rede de testes/CI + typecheck destravado + varredura de honestidade candidate-facing (P22); ressurreição da stack de IA — 7 call_types rodam o prompt real com circuit breaker/retry/guardrails vivos + honestidade psicométrica (P23); blindagem PII/gabarito/IDOR — RLS nunca é segredo de coluna (column REVOKE / RPC SECURITY DEFINER), toda EF privilegiada autentica-**E**-autoriza, policies vaga-scoped (P24); correção do drift M1→M2 pelo lado RH — enums/colunas que existem, sem rejeição sem trilha (P25) e pelo lado candidato — alcançabilidade + `pontuar_sjt` não-manipulável + reinscrição pós soft-delete (P26); e integridade de migrations (ledger convergido) + fechamento da rede de testes sobre o código já corrigido (P27). Invariante: IA recomenda, humano decide (RNF-07a); linguagem "avaliação comportamental/cognitiva" (RNF-12a).

</details>

## Progress

**Execution Order:**
Phases execute in numeric order: 22 → 23 → 24 → 25 → 26 → 27

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 (M1) | v1.0 | 40/40 | Complete | 2026-06-06 |
| 6–16 (M2) | v2.0 | 63/63 | Complete | 2026-06-26 |
| 17 | standalone | 5/5 | Complete | 2026-06-28 |
| 18–21 (M3) | v3.0 | 16/16 | Complete | 2026-06-30 |
| 22. Rede de Testes & Destravamento | v4.0 | 6/6 | Complete    | 2026-07-05 |
| 23. Ressurreição da Stack de IA | v4.0 | 6/6 | Complete    | 2026-07-06 |
| 24. Blindagem Segurança / PII / LGPD | v4.0 | 9/9 | Complete   | 2026-07-09 |
| 25. Funil — lado RH | v4.0 | 9/9 | Complete   | 2026-07-12 |
| 26. Funil — lado candidato | v4.0 | 7/7 | Complete   | 2026-07-12 |
| 27. Migrations & Rede de Testes | v4.0 | 6/6 | Complete    | 2026-07-12 |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/v1.0-*`.*
*v2.0 milestone shipped 2026-06-26 — full requirements and roadmap detail archived under `.planning/milestones/v2.0-*`. 11 phases (6–16), 42/42 requirements, audit PASSED.*
*v3.0 milestone shipped 2026-06-30 — full requirements and roadmap detail archived under `.planning/milestones/v3.0-*`. 4 phases (18–21), 12/12 requirements, audit OK (tech_debt accepted). Phase 21 found+fixed 3 live PROD defects beyond the planned UAT scope.*
*v4.0 milestone shipped 2026-07-13 — full requirements and roadmap detail archived under `.planning/milestones/v4.0-*`. 6 phases (22–27), 55/56 requirements Complete + DBMIG-01 sanctioned partial (ledger converged live 73/73; baseline+rebuild deferred environment-gated), audit status tech_debt (accepted). Hardening/correção, não expansão.*
