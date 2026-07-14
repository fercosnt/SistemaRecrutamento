# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06) — `milestones/v1.0-ROADMAP.md`
- ✅ **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (shipped 2026-06-26) — `milestones/v2.0-ROADMAP.md`
- 🔧 **Standalone (pós-v2.0)** — Phase 17 (Navegação & Arquitetura de Informação) — mini-fase fora de milestone (shipped 2026-06-28)
- ✅ **v3.0 — M3 Refinamento RH & Hardening** — Phases 18–21 (shipped 2026-06-30) — `milestones/v3.0-ROADMAP.md`
- ✅ **v4.0 — M4 Correção & Blindagem do Funil** — Phases 22–27 (shipped 2026-07-13) — `milestones/v4.0-ROADMAP.md`
- ✅ **v5.0 — M5 Gestão de Usuários & Perfil RH** — Phases 28–30 (shipped 2026-07-14) — `milestones/v5.0-ROADMAP.md`
- 🚧 **v6.0 — M6 Operação do Funil RH** — Phases 31–35 (em andamento)

## Overview

O M6 não constrói um ATS — constrói a **esteira** que faz o funil (já avaliativo) **andar** pela mão do RH. É deliberadamente um milestone de *reuse-and-tighten*, **não** build-from-scratch: 1 tabela nova (`agendamentos_entrevista`), 2 read-primitives novos (a EF `get-curriculo-url` e a RPC `funil_kpis` DEFINER), o fechamento de 2 vazamentos horizontais vivos, e a generalização do write-path de funil que já existe — zero dependências npm novas. As quatro dimensões de pesquisa (stack, features, arquitetura, pitfalls) convergiram independentemente na mesma **ordem security-first**: dados + RLS aterrissam e são provados por smoke comportamental (JWT impersonado) **antes** de qualquer UI que os consome. O milestone entrega em 5 fases: primeiro o avançar/rejeitar per-etapa em todo o funil + reject-do-comparativo, puro reuso do trigger auditável já correto (P31 — a vitória de menor risco, que desriscar o milestone cedo); depois o fechamento server-only dos dois leaks (CV role-only no bucket + `rh_le_historico` role-only nunca varrido) via EF authenticate-THEN-authorize + RPC DEFINER vaga-scoped, **BLOCKING** para as telas de leitura (P32); a camada de dados do agendamento — tabela nova + RLS bidirecional provada por smoke antes de qualquer form (P33); as superfícies do RH cabeadas contra primitivos já seguros — CV + análise da IA + feed de histórico + agendamento + fila de trabalho + dashboard de KPIs (P34); e por fim a leitura do agendamento pelo painel do candidato, fechando o modelo "sem e-mail = painel é o canal único" (P35).

**Invariantes preservadas em toda fase (gates, não requisitos):**
- **RNF-07a** — o sistema **nunca** rejeita/avança por score; toda transição é um write disparado por humano (`ator=auth.uid()` → `auto_rejeitado=false`).
- **RNF-12a** — linguagem sempre "avaliação comportamental/cognitiva" (nunca "teste psicológico").
- **No-email** — COMM está fora do M6; o candidato é notificado **apenas** pelo painel in-app (nenhum wiring de `notificar-candidato`/n8n/pg_net num diff do M6).
- **Trilha única** — nenhum código do M6 faz `INSERT` direto em `historico_candidatura`; toda transição é `UPDATE candidaturas.etapa_atual` (+ opcional `etapa_justificativa`) e o trigger `avancar_etapa()` é o único escritor. O trigger **não é editado** no M6 (carrega o guard ENTREV-03 + o predicado GUC `auto_rejeitado`).
- **RLS não é segredo de coluna** — leituras candidato-facing usam allowlist explícita, nunca `select('*')`.
- **Migrations PROD via Supabase MCP** `apply_migration`/`execute_sql` (bypassa 42601 em corpos PL/pgSQL); **baseline tsc permanece flat** (104).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

M6 continua a numeração a partir da **Phase 31** (M5 terminou na Phase 30).

- [ ] **Phase 31: Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo (funil-02)** - controles per-etapa de avançar/rejeitar/retroceder nas 6 etapas + reject-do-comparativo, tudo pelo write-path auditável único (trigger), justificativa server-enforced, RNF-07a
- [ ] **Phase 32: Fechar os Dois Vazamentos Vivos — CV Signed-URL EF + KPI DEFINER RPC (BLOCKING)** - EF `get-curriculo-url` authenticate-THEN-authorize (policy role-only do bucket removida) + RPC `funil_kpis` DEFINER vaga-scoped + `rh_le_historico` endurecido — server-only, gatilho da Phase 34
- [ ] **Phase 33: Camada de Dados do Agendamento de Entrevista** - tabela nova `agendamentos_entrevista` + RLS bidirecional (RH vaga-scoped, candidato own-row allowlist sem `observacoes_rh`), provada por smoke antes de qualquer UI
- [ ] **Phase 34: Superfícies do RH — CV/IA, Agendamento, Fila de Trabalho + KPIs** - telas do RH contra os primitivos já seguros: CV + análise IA completa + feed de histórico, form de agendar/reagendar/cancelar/comparecimento, fila de trabalho cross-vaga + dashboard de KPIs
- [ ] **Phase 35: Painel do Candidato — Leitura do Agendamento** - card do agendamento no painel do candidato (own-row, `America/Sao_Paulo`) + download `.ics` + badge de lembrete ≤24h, sem e-mail

## Phase Details

### 🚧 v6.0 — M6 Operação do Funil RH (em andamento)

**Milestone Goal:** Fazer o funil (já avaliativo desde o M2) *andar* pela mão do RH — controles de avanço/rejeição/retrocesso auditáveis em todas as 6 etapas (RNF-07a), agendamento de entrevista dentro do sistema com o candidato acompanhando pelo painel (sem e-mail), CV + análise da IA visíveis ao RH, e o dashboard/lista como fila de trabalho real com KPIs operacionais sobre `historico_candidatura` — construído security-first (os 2 leaks vivos fecham server-side antes de qualquer UI que os leia). Feature-work (net-new operação), **não** hardening.

### Phase 31: Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo (funil-02)
**Goal**: O RH move cada candidatura por qualquer uma das 6 etapas do funil — avançar, rejeitar (motivo estruturado por enum + justificativa livre ≥50 exigida no servidor) e retroceder (justificativa obrigatória) — e rejeita direto da tela de comparativo, tudo pelo **mesmo** write-path auditável único (`UPDATE candidaturas.etapa_atual` → trigger `avancar_etapa()`), sem nunca auto-rejeitar por score.
**Depends on**: Phase 30 (M5 shipped) — nada dentro do M6 (é o primeiro; puro reuso do trigger + RLS já vaga-scoped desde a P24)
**Requirements**: OPER-01, OPER-02, OPER-03, OPER-04
**Success Criteria** (what must be TRUE):
  1. RH avança um candidato para a próxima etapa em **qualquer** uma das 6 etapas (não só a etapa 5/Kanban) e a transição aparece na trilha com origem→destino, autor e timestamp — escrita exclusivamente pelo trigger (nenhum `INSERT` direto em `historico_candidatura`) (OPER-01).
  2. RH rejeita um candidato em qualquer etapa informando um motivo estruturado (enum) **e** uma justificativa livre; o servidor recusa a rejeição com justificativa < 50 caracteres (RAISE na camada RPC/serviço, não só validação de formulário) e nenhuma rejeição é disparada por score (`auto_rejeitado=false` — RNF-07a) (OPER-02).
  3. RH move um candidato para uma etapa **anterior** informando justificativa obrigatória, respeitando o guard de regressão do trigger, e a regressão fica registrada na trilha (OPER-03).
  4. RH rejeita um candidato a partir da tela de **comparativo** exigindo justificativa, pelo mesmo write-path auditável — os botões `onRejeitar`/`onAvancar` que hoje são no-op passam a escrever de verdade (débito funil-02 fechado) (OPER-04).
**Plans**: 6 plans in 4 waves

Plans:
- [x] 31-01-PLAN.md — DB contract: enum `motivo_rejeicao_rh` + DEFINER RPC `rejeitar_candidatura` (≥50 RAISE + vaga-owner guard) + 2 exact-signature DROPs (dead M1 overloads) + RED behavioral smoke (authored-not-applied)
- [ ] 31-02-PLAN.md — service + hook: extend `updateCandidaturaEtapa` (always SET `etapa_justificativa`) + `rejeitarCandidatura` service + `useRejeitarCandidatura` (3-tree invalidation) + tests
- [ ] 31-03-PLAN.md — shared dialogs: `RejeitarCandidaturaDialog` (motivo Select + ≥50 counter, light modal) + `RetrocederCandidaturaDialog` (earlier-stage destino + required justificativa)
- [ ] 31-04-PLAN.md — RH surfaces: Kanban card `DropdownMenu` (avançar/retroceder/rejeitar) + `HubCandidatoRH` "Próximo passo" action row (OPER-01/02/03)
- [ ] 31-05-PLAN.md — comparativo rewire (OPER-04): replace no-justificativa reject with the shared dialog → `rejeitar_candidatura` RPC; advance + read-only embed preserved
- [ ] 31-06-PLAN.md — [BLOCKING] apply migration via Supabase MCP `apply_migration` + 5 behavioral smokes GREEN + regen `database.types.ts`
**UI hint**: yes

### Phase 32: Fechar os Dois Vazamentos Vivos — CV Signed-URL EF + KPI DEFINER RPC (BLOCKING)
**Goal**: Existe — e é comprovadamente seguro por smoke comportamental (JWT impersonado) — o par de read-primitives vaga-scoped que as telas do RH da Phase 34 vão consumir: a EF `get-curriculo-url` (authenticate-THEN-authorize, com a policy de leitura role-only do bucket `curriculos` **removida**) e a RPC `funil_kpis` SECURITY DEFINER (vaga-scoped internamente), com `rh_le_historico` endurecido em defesa-em-profundidade. **Zero UI end-user** — esta fase é gatilho (BLOCKING) da Phase 34.
**Depends on**: Phase 30 (M5 shipped) — independente da Phase 31; **BLOCKING** para a Phase 34
**Requirements**: SEG-01, SEG-02
**Success Criteria** (what must be TRUE):
  1. O CV de um candidato só é acessível via a EF `get-curriculo-url`, que autentica e **depois** autoriza posse da vaga (dono ou admin) antes de emitir um signed URL de TTL curto; um smoke com JWT impersonado prova que o recrutador A **não** obtém o CV de um candidato da vaga do recrutador B, e a policy de leitura role-only do bucket `curriculos` foi removida (a EF é o único caminho RH) (SEG-01).
  2. A agregação de KPIs roda numa RPC `funil_kpis` SECURITY DEFINER vaga-scoped por construção (scoping interno `WHERE v.created_by = auth.uid()` salvo admin); um smoke prova que o recrutador A **não** vê números da vaga do recrutador B, e a RPC retorna apenas agregados PII-safe (nunca identidade de candidato) (SEG-02).
  3. A policy `rh_le_historico` de `historico_candidatura` está endurecida para o predicado vaga-scoped WR-04 (defense-in-depth), fechando o vazamento role-only diferido na P24 e nunca varrido — verificado por smoke comportamental, **não** por inspeção de `pg_policies` (SEG-02).
  4. Nenhuma service_role key aparece no bundle do cliente e não há `createSignedUrl` client-side sobre `curriculos` — a EF é o único caminho privilegiado (verificável por grep-guard de bundle) (SEG-01).
**Plans**: TBD

Plans:
- [ ] 32-01: RED harness — smokes comportamentais (JWT impersonado) para cross-recrutador do CV, cross-recrutador dos KPIs e leak de PII (RED até apply)
- [ ] 32-02: EF `get-curriculo-url` (authenticate-THEN-authorize, posse da vaga OR admin → `createSignedUrl` TTL curto) + remoção da policy role-only do bucket `curriculos` + client rewire (sem `createSignedUrl` client-side)
- [ ] 32-03: RPC `funil_kpis` SECURITY DEFINER `SET search_path=''` (vaga-scoped interno, agregados PII-safe: mediana por etapa via `LEAD`, conversão etapa→etapa, volume) + endurecimento `rh_le_historico` WR-04
- [ ] 32-04: [BLOCKING] apply via Supabase MCP + deploy EF (JWT-ON) + regen `database.types.ts` + smokes GREEN em PROD
**UI hint**: no

### Phase 33: Camada de Dados do Agendamento de Entrevista
**Goal**: Existe — e é comprovadamente isolado por smoke — a tabela nova `agendamentos_entrevista` com RLS bidirecional: RH vaga-scoped (write/read, predicado WR-04 via join `candidaturas→vagas`) e candidato own-row read por allowlist explícita que **exclui** `observacoes_rh`. Provada segura **antes** de qualquer UI de agendamento (form RH na P34, card do candidato na P35).
**Depends on**: Phase 30 (M5 shipped) — independente das Phases 31/32
**Requirements**: AGEND-01, SEG-03
**Success Criteria** (what must be TRUE):
  1. RH agenda uma entrevista para um candidato (modalidade online/presencial, data/hora `timestamptz`, link de videochamada **ou** local) gravada com o autor (`agendado_por`) na tabela `agendamentos_entrevista`, vaga-scoped — verificável por smoke: o RH dono da vaga escreve, o RH não-dono é **negado** (AGEND-01).
  2. O candidato lê **apenas** a própria linha de agendamento; um smoke cross-candidato prova que o candidato A não vê o agendamento de B (SEG-03).
  3. A projeção do candidato exclui `observacoes_rh` (observações internas do RH) — verificado por smoke de allowlist, nunca `select('*')` (SEG-03).
  4. Um recrutador não-dono da vaga não lê nem escreve agendamentos daquela vaga (isolamento cross-recrutador vaga-scoped) (SEG-03).
**Plans**: TBD

Plans:
- [ ] 33-01: Reconciliar o schema autoritativo de `agendamentos_entrevista` (propostas de ARCHITECTURE.md `observacoes_rh`/`status`/`agendado_por` × FEATURES.md `entrevistador`/`compareceu`) numa definição única; migration da tabela + enum `modalidade` + soft-delete
- [ ] 33-02: RLS bidirecional — RH WR-04 (join `candidaturas→vagas`, USING + WITH CHECK) + candidato own-row SELECT; RED harness com smokes cross-recrutador, cross-candidato e exclusão de `observacoes_rh`
- [ ] 33-03: [BLOCKING] apply via Supabase MCP + regen `database.types.ts` + smokes GREEN em PROD
**UI hint**: no

### Phase 34: Superfícies do RH — CV/IA, Agendamento, Fila de Trabalho + KPIs
**Goal**: O RH opera o funil pelas superfícies reais, cabeadas contra primitivos **já seguros** (Phases 32/33): vê o CV + a análise da IA completa + o feed de atividade do candidato; agenda / reagenda / cancela entrevistas e registra comparecimento; e usa a fila de trabalho cross-vaga priorizada por aging/SLA + o dashboard de KPIs operacionais que substitui a agregação client-side morta do M1 (`RelatoriosRHPage`).
**Depends on**: Phase 31 (write-path unificado), Phase 32 (EF CV + RPC KPIs seguros — **BLOCKING**), Phase 33 (tabela de agendamento)
**Requirements**: VISRH-01, VISRH-02, VISRH-03, KPI-01, KPI-02, KPI-03, KPI-04, AGEND-02, AGEND-03
**Success Criteria** (what must be TRUE):
  1. RH abre/baixa o CV do candidato pela URL assinada da EF `get-curriculo-url` (dono da vaga ou admin); nenhum recrutador acessa o CV de uma vaga que não é sua (VISRH-01).
  2. RH vê a análise da IA **completa** (score_match + forças/gaps na íntegra, não truncados a 2) na tela do candidato, além de um feed de atividade **read-only** do histórico (etapa origem→destino, autor, data, justificativa) por allowlist; o candidato nunca vê score/análise (VISRH-02, VISRH-03).
  3. RH agenda, reagenda e cancela uma entrevista e registra o comparecimento/no-show do candidato (`compareceu`), refletido no card do candidato no painel (AGEND-02, AGEND-03).
  4. RH vê uma fila de trabalho **cross-vaga** priorizada por tempo-em-etapa/SLA + um indicador de aging/SLA breach (candidatos parados além do limite por etapa), mantendo o Kanban por-vaga existente — os dois artefatos coexistem (KPI-01, KPI-03).
  5. RH vê KPIs operacionais sobre `historico_candidatura` — tempo **mediano** por etapa, conversão etapa-a-etapa, volume por vaga/etapa, time-to-hire, taxa de knockout, drop por etapa e taxa de no-show (habilitada por AGEND-03) — computados pela RPC `funil_kpis` DEFINER vaga-scoped (nunca agregação client-side, nunca PII) (KPI-02, KPI-04).
**Plans**: TBD

Plans:
- [ ] 34-01: Tela do candidato no hub RH — CV via EF (signed URL), painel "Análise da IA" completo (forças/gaps na íntegra, bandas neutras Big Five) + card de identidade allowlist (VISRH-01/02)
- [ ] 34-02: Seção "Histórico" read-only renderizando `historico_candidatura` (feed de atividade, allowlist) (VISRH-03)
- [ ] 34-03: Form de agendamento (shadcn Calendar + `<input type="time">` em Popover) escrevendo `agendamentos_entrevista` + reagendar/cancelar + `compareceu` (AGEND-02/03)
- [ ] 34-04: Fila de trabalho cross-vaga (sort por time-in-stage/SLA) + badge de aging/SLA breach (KPI-01/03)
- [ ] 34-05: Dashboard de KPIs (recharts via `@/components/ui/chart`, consumindo `funil_kpis`) substituindo a agregação M1 do `RelatoriosRHPage`; decidir base de coorte da conversão K4 (recomendação: coorte fechada por janela de inscrição) (KPI-02/04)
**UI hint**: yes

### Phase 35: Painel do Candidato — Leitura do Agendamento
**Goal**: O candidato acompanha a entrevista agendada **exclusivamente** pelo painel — um card na superfície "Próximo passo" com data/hora em `America/Sao_Paulo` + link clicável ou local (leitura own-row por allowlist), download `.ics` client-side e badge de lembrete quando a entrevista está a ≤24h — fechando o modelo "sem e-mail = painel é o canal único". É a menor fase; depende da tabela + RLS da Phase 33.
**Depends on**: Phase 33 (tabela `agendamentos_entrevista` + RLS provada segura)
**Requirements**: AGEND-04, AGEND-05
**Success Criteria** (what must be TRUE):
  1. O candidato vê a entrevista agendada num card no painel — data/hora em `America/Sao_Paulo` + link clicável ou local — com a rota das etapas `entrevista_online`/`entrevista_presencial` mapeada no `funilNavMap` (hoje ausente, sem isso o agendamento é invisível ao candidato); o painel é o **único** canal (sem e-mail) (AGEND-04).
  2. A leitura do candidato é restrita à própria linha por allowlist explícita e **nunca** expõe `observacoes_rh` (observações internas do RH) (AGEND-04).
  3. O candidato baixa um arquivo `.ics` do agendamento, gerado client-side no navegador (substituto do convite `.ics` que o mercado manda por e-mail — zero e-mail, zero backend de calendário) (AGEND-05).
  4. O candidato vê um badge de lembrete quando a entrevista está a ≤24h (AGEND-05).
**Plans**: TBD

Plans:
- [ ] 35-01: `rotaCandidato` para `entrevista_online`/`entrevista_presencial` no `funilNavMap` + card do agendamento own-row (allowlist) na superfície "Próximo passo" do `HubCandidatoRH` (AGEND-04)
- [ ] 35-02: Download `.ics` client-side + badge de lembrete ≤24h (reusa o idioma `America/Sao_Paulo` de `EntrevistaDashboard.tsx`) (AGEND-05)
**UI hint**: yes

<details>
<summary>✅ v1.0 — M1 MVP Candidato (Phases 1–5) — SHIPPED 2026-06-06</summary>

Full detail archived in `milestones/v1.0-ROADMAP.md`. Requirements: `milestones/v1.0-REQUIREMENTS.md`. Audit: `milestones/v1.0-MILESTONE-AUDIT.md` (PASSED, 38/38 reqs).

</details>

<details>
<summary>✅ v2.0 — M2 Funil RH + Avaliação por IA (Phases 6–16) — SHIPPED 2026-06-26</summary>

Full detail archived in `milestones/v2.0-ROADMAP.md`. Requirements: `milestones/v2.0-REQUIREMENTS.md`. Audit: `v2.0-MILESTONE-AUDIT.md` (PASSED, 42/42 reqs; the single BLOCKER AVAL-03 was fixed + redeployed + PROD-smoked post-audit). Pipeline backbone de 6 etapas + IA-assisted evaluation; `historico_candidatura` + o trigger `avancar_etapa()` (único escritor da trilha) nascem aqui, na Phase 6 — a fundação que o M6 reusa verbatim.

</details>

<details>
<summary>✅ Phase 17 — Navegação & Arquitetura de Informação (standalone mini-fase) — SHIPPED 2026-06-28</summary>

Cabeou na navegação real de produção o funil construído no M2 (avaliação do candidato + workspaces RH de entrevista/redação/decisão + telas admin), antes só alcançável por URL direta / DevNavigationMenu DEV-only. 5/5 plans / 4 waves. Standalone — sem lifecycle de milestone.

</details>

<details>
<summary>✅ v3.0 — M3 Refinamento RH & Hardening (Phases 18–21) — SHIPPED 2026-06-30</summary>

Full detail archived in `milestones/v3.0-ROADMAP.md`. Requirements: `milestones/v3.0-REQUIREMENTS.md`. Audit: `milestones/v3.0-MILESTONE-AUDIT.md` (12/12 reqs, status tech_debt). Hardening (não expansão) do funil de IA do M2: resiliência das EFs, code-splitting, RH edita o guia de entrevista, e fechamento de HUMAN-UATs live. A Phase 21 achou+corrigiu 3 defeitos live em PROD.

</details>

<details>
<summary>✅ v4.0 — M4 Correção & Blindagem do Funil (Phases 22–27) — SHIPPED 2026-07-13</summary>

Full detail archived in `milestones/v4.0-ROADMAP.md`. Requirements: `milestones/v4.0-REQUIREMENTS.md`. Audit: `milestones/v4.0-MILESTONE-AUDIT.md` (status tech_debt — 55/56 reqs Complete + DBMIG-01 sanctioned partial). Hardening/correção ponta-a-ponta em 6 fases (43 plans): rede de testes/CI, ressurreição da stack de IA, blindagem PII/gabarito/IDOR (RLS nunca é segredo de coluna, policies vaga-scoped WR-04), correção do drift M1→M2, integridade de migrations. **A P24 declarou o predicado WR-04 vaga-scoped mas deferiu o re-scope de `rh_le_historico` — o vazamento role-only que o M6/Phase 32 fecha.** O bucket `curriculos` seguiu role-only (o 2º leak). Invariante: IA recomenda, humano decide (RNF-07a).

</details>

<details>
<summary>✅ v5.0 — M5 Gestão de Usuários & Perfil RH (Phases 28–30) — SHIPPED 2026-07-14</summary>

Full detail archived in `milestones/v5.0-ROADMAP.md`. Requirements: `milestones/v5.0-REQUIREMENTS.md`. Audit: `milestones/v5.0-MILESTONE-AUDIT.md` (status tech_debt — 13/13 reqs Complete, 0 gaps). Feature-work enxuto com segurança como eixo: A14 console de gestão de usuários RH (EF authenticate-THEN-authorize admin-only, RLS admin-only + self-promotion hole fechado, auditoria append-only, anti-lockout advisory-lock) + A37 meu-perfil self-service (RPC SEG-03-por-construção). O padrão EF authenticate-THEN-authorize + RLS vaga-scoped + smokes comportamentais que o M6 reusa foi provado aqui e no M4.

</details>

## Progress

**Execution Order:**
Phases execute in numeric order: 31 → 32 → 33 → 34 → 35

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 (M1) | v1.0 | 40/40 | Complete | 2026-06-06 |
| 6–16 (M2) | v2.0 | 63/63 | Complete | 2026-06-26 |
| 17 | standalone | 5/5 | Complete | 2026-06-28 |
| 18–21 (M3) | v3.0 | 16/16 | Complete | 2026-06-30 |
| 22–27 (M4) | v4.0 | 43/43 | Complete | 2026-07-13 |
| 28–30 (M5) | v5.0 | 19/19 | Complete | 2026-07-14 |
| 31. Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo | v6.0 | 1/6 | In Progress|  |
| 32. Fechar os Dois Vazamentos Vivos (BLOCKING) | v6.0 | 0/TBD | Not started | - |
| 33. Camada de Dados do Agendamento de Entrevista | v6.0 | 0/TBD | Not started | - |
| 34. Superfícies do RH — CV/IA, Agendamento, Fila + KPIs | v6.0 | 0/TBD | Not started | - |
| 35. Painel do Candidato — Leitura do Agendamento | v6.0 | 0/TBD | Not started | - |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/v1.0-*`.*
*v2.0 milestone shipped 2026-06-26 — full requirements and roadmap detail archived under `.planning/milestones/v2.0-*`. 11 phases (6–16), 42/42 requirements, audit PASSED.*
*v3.0 milestone shipped 2026-06-30 — full requirements and roadmap detail archived under `.planning/milestones/v3.0-*`. 4 phases (18–21), 12/12 requirements, audit OK (tech_debt accepted).*
*v4.0 milestone shipped 2026-07-13 — full requirements and roadmap detail archived under `.planning/milestones/v4.0-*`. 6 phases (22–27), 55/56 requirements Complete + DBMIG-01 sanctioned partial, audit status tech_debt (accepted).*
*v5.0 milestone shipped 2026-07-14 — full requirements and roadmap detail archived under `.planning/milestones/v5.0-*`. 3 phases (28–30), 13/13 requirements, audit tech_debt.*
*v6.0 milestone opened 2026-07-14 — reuse-and-tighten, security-first. 5 phases (31–35), 19/19 requirements mapeados (0 unmapped). Numeração continua da Phase 31.*
