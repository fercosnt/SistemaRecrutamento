# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06) — `milestones/v1.0-ROADMAP.md`
- ✅ **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (shipped 2026-06-26) — `milestones/v2.0-ROADMAP.md`
- 🔧 **Standalone (pós-v2.0)** — Phase 17 (Navegação & Arquitetura de Informação) — mini-fase fora de milestone (shipped 2026-06-28)
- ✅ **v3.0 — M3 Refinamento RH & Hardening** — Phases 18–21 (shipped 2026-06-30) — `milestones/v3.0-ROADMAP.md`
- ✅ **v4.0 — M4 Correção & Blindagem do Funil** — Phases 22–27 (shipped 2026-07-13) — `milestones/v4.0-ROADMAP.md`
- ✅ **v5.0 — M5 Gestão de Usuários & Perfil RH** — Phases 28–30 (shipped 2026-07-14) — `milestones/v5.0-ROADMAP.md`
- ✅ **v6.0 — M6 Operação do Funil RH** — Phases 31–35 (shipped 2026-07-17) — `milestones/v6.0-ROADMAP.md`
- ✅ **v7.0 — M7 Comunicação com o Candidato (COMM)** — Phases 36–41 (shipped 2026-07-28) — `milestones/v7.0-ROADMAP.md`
- 📋 **Próximo milestone** — a definir (`/gsd-new-milestone`)

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

O próximo milestone continua a numeração a partir da **Phase 42** (o M7 terminou na Phase 41).

## Phase Details

<details>
<summary>✅ v1.0 — M1 MVP Candidato (Phases 1–5) — SHIPPED 2026-06-06</summary>

Full detail archived in `milestones/v1.0-ROADMAP.md`. Requirements: `milestones/v1.0-REQUIREMENTS.md`. Audit: `milestones/v1.0-MILESTONE-AUDIT.md` (PASSED, 38/38 reqs).

</details>

<details>
<summary>✅ v2.0 — M2 Funil RH + Avaliação por IA (Phases 6–16) — SHIPPED 2026-06-26</summary>

Full detail archived in `milestones/v2.0-ROADMAP.md`. Requirements: `milestones/v2.0-REQUIREMENTS.md`. Audit: `v2.0-MILESTONE-AUDIT.md` (PASSED, 42/42 reqs; o único BLOCKER AVAL-03 foi corrigido + redeployado + PROD-smoked pós-audit). Pipeline backbone de 6 etapas + IA-assisted evaluation; `historico_candidatura` + o trigger `avancar_etapa()` (único escritor da trilha) nascem aqui, na Phase 6 — a fundação que o M7 reusou (o trigger CASE de DISPATCH-01 lê `historico_candidatura`).

</details>

<details>
<summary>✅ Phase 17 — Navegação & Arquitetura de Informação (standalone mini-fase) — SHIPPED 2026-06-28</summary>

Cabeou na navegação real de produção o funil construído no M2, antes só alcançável por URL direta / DevNavigationMenu DEV-only. 5/5 plans / 4 waves. Standalone — sem lifecycle de milestone.

</details>

<details>
<summary>✅ v3.0 — M3 Refinamento RH & Hardening (Phases 18–21) — SHIPPED 2026-06-30</summary>

Full detail archived in `milestones/v3.0-ROADMAP.md`. Requirements: `milestones/v3.0-REQUIREMENTS.md`. Audit: `milestones/v3.0-MILESTONE-AUDIT.md` (12/12 reqs, status tech_debt). Hardening (não expansão) do funil de IA do M2: resiliência das EFs, code-splitting, RH edita o guia de entrevista, e fechamento de HUMAN-UATs live. A Phase 21 achou+corrigiu 3 defeitos live em PROD.

</details>

<details>
<summary>✅ v4.0 — M4 Correção & Blindagem do Funil (Phases 22–27) — SHIPPED 2026-07-13</summary>

Full detail archived in `milestones/v4.0-ROADMAP.md`. Requirements: `milestones/v4.0-REQUIREMENTS.md`. Audit: `milestones/v4.0-MILESTONE-AUDIT.md` (status tech_debt — 55/56 reqs Complete + DBMIG-01 sanctioned partial). Hardening/correção ponta-a-ponta em 6 fases (43 plans). **A P24/SEC-03 (`20260706110005_sec03_n8n_serverside.sql`) deixou 3 triggers `AFTER` com `net.http_post` + Vault secret `n8n_webhook_base` dormentes (graceful-skip) — a meia-ponte que o M7/Phase 39 substituiu, aposentando o n8n.** Invariante: IA recomenda, humano decide (RNF-07a).

</details>

<details>
<summary>✅ v5.0 — M5 Gestão de Usuários & Perfil RH (Phases 28–30) — SHIPPED 2026-07-14</summary>

Full detail archived in `milestones/v5.0-ROADMAP.md`. Requirements: `milestones/v5.0-REQUIREMENTS.md`. Audit: `milestones/v5.0-MILESTONE-AUDIT.md` (status tech_debt — 13/13 reqs Complete, 0 gaps). Feature-work enxuto com segurança como eixo: A14 console de gestão de usuários RH (EF authenticate-THEN-authorize admin-only) + A37 meu-perfil self-service (RPC SEG-03-por-construção). O padrão EF authenticate-THEN-authorize + smokes comportamentais que o M7 reusou foi provado aqui e no M4.

</details>

<details>
<summary>✅ v6.0 — M6 Operação do Funil RH (Phases 31–35) — SHIPPED 2026-07-17</summary>

Full detail archived in `milestones/v6.0-ROADMAP.md`. Requirements: `milestones/v6.0-REQUIREMENTS.md`. Audit: `v6.0-MILESTONE-AUDIT.md` (status tech_debt — 19/19 reqs Complete; integração cross-fase 9/9 seams WIRED, 4/4 E2E flows). *Reuse-and-tighten* security-first: construiu a **esteira** que faz o funil andar pela mão do RH — avançar/rejeitar/retroceder auditável (P31), fechamento dos 2 leaks horizontais vivos (P32, BLOCKING), `agendamentos_entrevista` + RLS bidirecional (P33), superfícies RH CV/IA/agendamento/Fila/KPIs (P34), e o card do agendamento no painel do candidato + `.ics` client-side (P35). **O `.ics` hand-rolled (RFC-5545) de `agendamentoCandidatoService.gerarIcsAgendamento` que o M7/Phase 38 portou verbatim para `_shared/ics.ts` nasce aqui.** Invariante: painel é o canal único (sem e-mail) — que o M7 complementou com o *push* transacional.

</details>

<details>
<summary>✅ v7.0 — M7 Comunicação com o Candidato (COMM) (Phases 36–41) — SHIPPED 2026-07-28</summary>

Full detail archived in `milestones/v7.0-ROADMAP.md`. Requirements: `milestones/v7.0-REQUIREMENTS.md`. Audit: `milestones/v7.0-MILESTONE-AUDIT.md` (status tech_debt — **21/21 reqs Complete**, 0 gaps; integração cross-fase 6/6, fluxos E2E 4/4).

Fez o candidato **saber** que o funil (operado pela mão do RH desde o M6) está andando. **Integração aditiva**, não greenfield: gatilhos de DB → `pg_net` → EF `notificar-candidato` (self-auth) → Resend, com **zero dependências npm novas** no caminho de envio. **Aposentou o n8n pessoal e resolveu SEC-03 por substituição** — os 4 triggers `trg_n8n_*` foram DROPados no mesmo phase que criou os novos (P39), sem janela de double-send.

Entregou: identidade de remetente & entregabilidade (P36); ledger `notificacoes_enviadas` + `config_sla_etapa` (P37); a EF com os 4 templates + port do `.ics` (P38); o rewire dos triggers (P39, fase de maior risco); a timeline de prazo no painel (P40); e a reconciliação webhook + retry `pg_cron` que fechou o fire-and-forget (P41).

**Incomum para um milestone: o pipeline foi provado por EXECUÇÃO EM PRODUÇÃO, não por leitura de código** — uma aprovação real disparou a cadeia `trigger → EF → Resend → webhook → ledger` e reconciliou para `entregue` em 5 s.

⚠ **Achado de processo:** a P39 fechou originalmente **sem VERIFICATION.md e sem code review**, e por isso 2 defeitos **CRÍTICOS** ficaram vivos em PROD (aprovado recebia a cópia de rejeição; survivor-guard do knockout era dead code). Cada camada de verificação aplicada depois encontrou algo que a anterior não pegou — o review achou CR-01/CR-02, e o UAT ao vivo achou W-01 (preheader não ramificado), invisível às asserções que olham só o texto visível. A fase de maior risco foi exatamente a que pulou o gate.

**Aberto no fecho (não-bloqueante, rastreado):** `m7-ativar-modo-producao` (**high** — `NOTIFICACOES_MODO=teste`, nenhum candidato real recebe e-mail ainda) e `m7-cleanup-n8n-cloud` (superfície externa do n8n segue ativa). UAT-36-1 `partial`: infra fechada, falta só teste de caixa de entrada real.

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 (M1) | v1.0 | 40/40 | Complete | 2026-06-06 |
| 6–16 (M2) | v2.0 | 63/63 | Complete | 2026-06-26 |
| 17 | standalone | 5/5 | Complete | 2026-06-28 |
| 18–21 (M3) | v3.0 | 16/16 | Complete | 2026-06-30 |
| 22–27 (M4) | v4.0 | 43/43 | Complete | 2026-07-13 |
| 28–30 (M5) | v5.0 | 19/19 | Complete | 2026-07-14 |
| 31–35 (M6) | v6.0 | 20/20 | Complete | 2026-07-17 |
| 36–41 (M7) | v7.0 | 25/25 | Complete | 2026-07-28 |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/v1.0-*`.*
*v2.0 milestone shipped 2026-06-26 — 11 phases (6–16), 42/42 requirements, audit PASSED.*
*v3.0 milestone shipped 2026-06-30 — 4 phases (18–21), 12/12 requirements, audit tech_debt.*
*v4.0 milestone shipped 2026-07-13 — 6 phases (22–27), 55/56 requirements Complete + DBMIG-01 sanctioned partial, audit tech_debt.*
*v5.0 milestone shipped 2026-07-14 — 3 phases (28–30), 13/13 requirements, audit tech_debt.*
*v6.0 milestone shipped 2026-07-17 — 5 phases (31–35), 19/19 requirements, audit tech_debt.*
*v7.0 milestone shipped 2026-07-28 — 6 phases (36–41), 25 plans, 21/21 requirements Complete, audit tech_debt (0 gaps). Pipeline de comunicação provado ponta-a-ponta em produção.*
