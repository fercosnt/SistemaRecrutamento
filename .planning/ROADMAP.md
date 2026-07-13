# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06)
- ✅ **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (shipped 2026-06-26)
- 🔧 **Standalone (pós-v2.0)** — Phase 17 (Navegação & Arquitetura de Informação) — mini-fase fora de milestone (shipped 2026-06-28)
- ✅ **v3.0 — M3 Refinamento RH & Hardening** — Phases 18–21 (shipped 2026-06-30)
- ✅ **v4.0 — M4 Correção & Blindagem do Funil** — Phases 22–27 (shipped 2026-07-13)
- 🚧 **v5.0 — M5 Gestão de Usuários & Perfil RH** — Phases 28–30 (em andamento)

## Overview

M5 é feature-work deliberadamente enxuto — **não** hardening. Depois de o M4 ter corrigido e blindado o funil ponta-a-ponta, o M5 implementa de verdade as duas telas de gestão de contas internas que os milestones anteriores deixaram apenas gateadas/ocultadas: **A14 · Gestão de Usuários RH** (`/rh/configuracoes`, hoje um empty-state) e **A37 · Meu Perfil RH** (`/rh/meu-perfil`, hoje um stub). O eixo é **segurança** — A14/A37 são superfície de escalonamento de privilégio (criar usuário, atribuir o papel `administrador`, resetar senha de terceiro), então toda escrita privilegiada roda numa Edge Function service_role **authenticate-THEN-authorize** (nunca service_role no client), sobre um `usuarios_rh` com RLS admin-only que **preserva** a policy `auth_admin_le_usuarios_rh` da qual o `custom_access_token_hook` depende (declarada em migration file no M4/SEC-09 — não re-migrar), com LGPD via soft-delete/desativação + trilha de auditoria append-only e uma guarda anti-lockout server-enforced. O milestone entrega isso em 3 fases: primeiro o núcleo seguro (EF + RLS + auditoria + anti-lockout), securável isoladamente antes de qualquer UI (P28); depois o console de administração que consome esse write-path seguro (P29); e por fim o self-service de perfil, de menor privilégio, com anti-privilege-escalation — o perfil **nunca** escreve `role` (P30). A visão maior "Operação & Comunicação" do M5-DRAFT foi resequenciada p/ **M6**.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

M5 continua a numeração a partir da **Phase 28** (M4 terminou na Phase 27).

- [ ] **Phase 28: Gestão de Usuários RH — Núcleo Seguro** - EF privilegiada authenticate-THEN-authorize + RLS admin-only (auth-hook preservado) + auditoria append-only + guarda anti-lockout
- [ ] **Phase 29: Console de Gestão de Usuários RH** - `administrador` lista, cria, muda papel, desativa/reativa e reseta senha de usuários RH pela UI real de `/rh/configuracoes`
- [ ] **Phase 30: Meu Perfil RH** - usuário RH edita o próprio nome/foto e troca a própria senha (re-auth), sem jamais poder escrever `role`

## Phase Details

### 🚧 v5.0 — M5 Gestão de Usuários & Perfil RH (em andamento)

**Milestone Goal:** Implementar de verdade a gestão de contas internas do RH (A14 + A37) — o feature-debt que o M4 deixou gateado/ocultado — com segurança como eixo: toda operação privilegiada roda numa Edge Function service_role authenticate-THEN-authorize, RLS preserva o auth-hook, e LGPD via soft-delete + auditoria. Cada fase que toca escrita de usuário é candidata a `/gsd-secure-phase`.

### Phase 28: Gestão de Usuários RH — Núcleo Seguro
**Goal**: Existe — e é comprovadamente seguro — o núcleo de servidor para gerir contas RH: uma Edge Function service_role que **autentica-DEPOIS-autoriza** toda escrita de usuário (criar / mudar papel / desativar-reativar / resetar senha de terceiro) sobre um `usuarios_rh` com RLS admin-only, com trilha de auditoria append-only e guarda anti-lockout server-enforced — zero service_role no client e a policy do auth-hook preservada.
**Depends on**: Phase 27 (M4 shipped) — nada dentro do M5
**Requirements**: USR-06, USR-07, SEG-01, SEG-02
**Success Criteria** (what must be TRUE):
  1. Toda escrita privilegiada de usuário (criar / mudar papel / desativar / reset) é servida por uma Edge Function service_role que retorna 401 para chamador não autenticado e 403 para chamador autenticado que **não** é `administrador`, **antes** de qualquer escrita — verificável por smoke com JWT impersonado (SEG-01).
  2. Um `recrutador` ou candidato consultando `usuarios_rh` lê **zero** linhas (a lista é admin-only), enquanto um `administrador` lê a lista completa; a policy `auth_admin_le_usuarios_rh` de que o login-hook depende continua resolvendo o papel de todos os RH corretamente (SEG-02).
  3. O servidor recusa remover, rebaixar ou desativar o **último `administrador` ativo** (retorna um erro distinto), garantindo ≥1 admin ativo a todo momento (USR-07).
  4. Cada ação de gestão de usuários grava exatamente uma linha de auditoria imutável (ator, alvo, ação, timestamp) que não pode ser atualizada nem deletada — append-only (USR-06).
  5. Nenhuma service_role key ou client admin aparece no bundle do cliente; todo caminho privilegiado roda apenas server-side (invariante SEG-01, verificável por grep-guard de bundle).
**Plans**: 8 plans / 4 waves
- [x] 28-01-PLAN.md — Wave 0 live-state capture (pg_policies/hook/triggers/admin-count/owners → 28-LIVE-STATE.md; resolves A1–A6) [BLOCKING]
- [x] 28-02-PLAN.md — RED harness A: EF Deno handler test (401/403/rollback/email) + SEG-01 no-service_role-in-src grep-guard
- [x] 28-03-PLAN.md — RED harness B: 3 behavioral SQL smokes (SEG-02 roster leak · USR-07 last-admin · USR-06 atomic-audit/append-only)
- [x] 28-04-PLAN.md — SEG-02 RLS rewrite (drop qual=true leaks · is_active_rh_admin DEFINER helper · admin+own-row SELECT) + logs_auditoria append-only
- [ ] 28-05-PLAN.md — USR-07 advisory-lock anti-lockout trigger + USR-06 atomic mutate+audit RPCs (gerir_usuario_rh_mutacao · criar_usuario_rh_com_audit)
- [ ] 28-06-PLAN.md — SEG-01 EF gerenciar-usuario-rh (authenticate-THEN-authorize, admin-only) + strict Zod discriminated-union schema
- [ ] 28-07-PLAN.md — [BLOCKING] apply 4 migrations via Supabase MCP apply_migration + regen database.types.ts + deploy EF (JWT-ON)
- [ ] 28-08-PLAN.md — [BLOCKING] behavioral SQL smokes GREEN on PROD + full Vitest/Deno suite + tsc gate

### Phase 29: Console de Gestão de Usuários RH
**Goal**: O `administrador` opera o console real de gestão de usuários em `/rh/configuracoes` — lista os usuários RH e executa toda ação de conta ponta-a-ponta através do write-path seguro da Phase 28 (nunca escrevendo direto do client).
**Depends on**: Phase 28
**Requirements**: USR-01, USR-02, USR-03, USR-04, USR-05
**Success Criteria** (what must be TRUE):
  1. O `administrador` abre `/rh/configuracoes` e vê a lista real de usuários RH com nome, email, papel e status ativo/inativo (substituindo o empty-state de hoje) (USR-01).
  2. O `administrador` cria um novo usuário RH (email + papel); o novo usuário define a própria senha e acessa o painel RH — exercitando a **primeira** conta `recrutador` do sistema (USR-02).
  3. O `administrador` altera o papel de um usuário (`recrutador` ↔ `administrador`) e a mudança passa a valer no próximo acesso / JWT desse usuário (USR-03).
  4. O `administrador` desativa um usuário RH e ele deixa de acessar o painel RH; ao reativá-lo, o acesso é restaurado — nenhuma identidade é jamais hard-deletada (USR-04).
  5. O `administrador` dispara um reset de senha para um usuário RH e esse usuário recebe o caminho de redefinição (USR-05).
**Plans**: TBD
**UI hint**: yes

### Phase 30: Meu Perfil RH
**Goal**: Cada usuário RH gerencia o próprio perfil em `/rh/meu-perfil` — edita nome de exibição, troca a própria senha com re-autenticação (senha atual) e faz upload da própria foto — com a garantia dura de que esse caminho self-service **nunca** pode escalar um papel.
**Depends on**: Phase 28 (compartilha `usuarios_rh` + o isolamento de escrita de `role` estabelecido lá)
**Requirements**: PERFIL-01, PERFIL-02, PERFIL-03, SEG-03
**Success Criteria** (what must be TRUE):
  1. Um usuário RH edita o próprio nome de exibição e a mudança persiste e aparece ao longo do painel RH (PERFIL-01).
  2. Um usuário RH troca a própria senha somente após informar a senha atual correta; senha atual errada é rejeitada (re-autenticação) (PERFIL-02).
  3. Um usuário RH faz upload/troca da própria foto de perfil em storage privado, legível apenas por ele (RLS own-row), e a nova foto é exibida (PERFIL-03).
  4. Nenhuma ação self-service — pela UI, pela API ou por RLS — escreve ou altera `role`; um `recrutador` não tem caminho para se auto-promover a `administrador` (SEG-03, verificável por smoke).
**Plans**: TBD
**UI hint**: yes

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

Hardening/correção do funil ponta-a-ponta (**não** expansão) em 6 fases (43 plans): rede de testes/CI + typecheck destravado + varredura de honestidade candidate-facing (P22); ressurreição da stack de IA — 7 call_types rodam o prompt real com circuit breaker/retry/guardrails vivos + honestidade psicométrica (P23); blindagem PII/gabarito/IDOR — RLS nunca é segredo de coluna (column REVOKE / RPC SECURITY DEFINER), toda EF privilegiada autentica-**E**-autoriza, policies vaga-scoped (P24); correção do drift M1→M2 pelo lado RH — enums/colunas que existem, sem rejeição sem trilha (P25) e pelo lado candidato — alcançabilidade + `pontuar_sjt` não-manipulável + reinscrição pós soft-delete (P26); e integridade de migrations (ledger convergido) + fechamento da rede de testes sobre o código já corrigido (P27). Invariante: IA recomenda, humano decide (RNF-07a); linguagem "avaliação comportamental/cognitiva" (RNF-12a). A policy `auth_admin_le_usuarios_rh` foi declarada em migration file (SEC-09) — **base direta do M5, não re-migrar**.

</details>

## Progress

**Execution Order:**
Phases execute in numeric order: 28 → 29 → 30

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 (M1) | v1.0 | 40/40 | Complete | 2026-06-06 |
| 6–16 (M2) | v2.0 | 63/63 | Complete | 2026-06-26 |
| 17 | standalone | 5/5 | Complete | 2026-06-28 |
| 18–21 (M3) | v3.0 | 16/16 | Complete | 2026-06-30 |
| 22–27 (M4) | v4.0 | 43/43 | Complete | 2026-07-13 |
| 28. Gestão de Usuários RH — Núcleo Seguro | v5.0 | 4/8 | In Progress|  |
| 29. Console de Gestão de Usuários RH | v5.0 | 0/TBD | Not started | - |
| 30. Meu Perfil RH | v5.0 | 0/TBD | Not started | - |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/v1.0-*`.*
*v2.0 milestone shipped 2026-06-26 — full requirements and roadmap detail archived under `.planning/milestones/v2.0-*`. 11 phases (6–16), 42/42 requirements, audit PASSED.*
*v3.0 milestone shipped 2026-06-30 — full requirements and roadmap detail archived under `.planning/milestones/v3.0-*`. 4 phases (18–21), 12/12 requirements, audit OK (tech_debt accepted). Phase 21 found+fixed 3 live PROD defects beyond the planned UAT scope.*
*v4.0 milestone shipped 2026-07-13 — full requirements and roadmap detail archived under `.planning/milestones/v4.0-*`. 6 phases (22–27), 55/56 requirements Complete + DBMIG-01 sanctioned partial (ledger converged live 73/73; baseline+rebuild deferred environment-gated), audit status tech_debt (accepted). Hardening/correção, não expansão.*
*v5.0 milestone opened 2026-07-13 — feature-work enxuto (A14 + A37, o feature-debt gateado/ocultado do M4), segurança como eixo. 3 phases (28–30), 13/13 requirements mapeados (0 unmapped). Numeração continua da Phase 28.*
