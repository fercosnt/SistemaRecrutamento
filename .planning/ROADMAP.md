# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06)
- 🚧 **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (roadmapped 2026-06-07)

## Phases

<details>
<summary>✅ v1.0 — M1 MVP Candidato (Phases 1–5) — SHIPPED 2026-06-06</summary>

Full detail archived in `milestones/v1.0-ROADMAP.md`. Audit: `milestones/v1.0-MILESTONE-AUDIT.md` (PASSED, 38/38 reqs).

- [x] **Phase 1: Foundation Saneada** — Unified auth, Edge Functions, types pipeline, RLS hardening (5/5 plans) — 2026-04-20
- [x] **Phase 2: Cadastro Candidato** — Multi-step registration rewired to Edge Function (6/6 plans) — 2026-04-24
- [x] **Phase 3: Login + Recuperação de Senha** — Candidate authentication + password recovery (7/7 plans) — 2026-04-27
- [x] **Phase 4: Vagas + Candidatura** — Job listing, detail page, CV upload, application flow (9/9 plans) — 2026-04-26
- [x] **Phase 4.1: Auth Hydration Fix** (INSERTED) — hydrateFromSession + waitForCandidatoHydrated; smoke-runtime gate established (5/5 plans) — 2026-04-27
- [x] **Phase 4.2: Phase 1 Verification Backfill** (INSERTED) — 12 FOUND-* partial→satisfied; VALIDATION draft→validated (1/1 plan) — 2026-04-27
- [x] **Phase 5: Perfil + Hardening MVP** — Real-data profile, first CI pipeline (unit+e2e+lighthouse green), a11y zero-violations, OTP recovery, ErrorBoundary root (7/7 plans) — 2026-06-06

</details>

### 🚧 v2.0 — M2 Funil RH + Avaliação por IA (Phases 6–16)

- [x] **Phase 6: Pipeline Backbone & Schema** — Funil de 6 etapas, trigger `avancar_etapa()`, trilha de auditoria e RLS — fundação de schema do M2 (completed 2026-06-07)
- [ ] **Phase 7: Configuração de Vaga & Tags** — Templates por cargo real, pesos por sliders, wizard de tags em opções
- [ ] **Phase 8: Inscrição & Knock-out (Etapa 1)** — Form LGPD-clean, qualificação por cargo, knockouts auto-rejeição auditável
- [ ] **Phase 9: AI Prompt Library & Cost Infra** — 7 prompts versionados git→DB, logging de custo/tokens, cost-alerter EF, lint de linguagem de produto
- [ ] **Phase 10: Triagem RH com IA + Comparativo (Etapa 2)** — `score_match` automático, painel de candidatos, comparativo até 10 + export PDF
- [ ] **Phase 11: Avaliação Assíncrona — Infra + Work Sample/SJT (Etapa 3)** — Bloco de testes, scoring determinístico SJT 4/2/1/0, case aberto BARS, autosave + back-lock
- [ ] **Phase 12: Big Five + Devolutiva** — IPIP-NEO-120 PT-BR scoring anti-tampering server-side + devolutiva D-lite híbrida
- [ ] **Phase 13: Redação Cultural + Revisão Humana** — Redação fit-cultural 4-dim BARS + 3-cores + fila de revisão humana obrigatória
- [ ] **Phase 14: Entrevistas com IA Companion (Etapas 4+5)** — Guias STAR/PEI, análise de transcrição BARS, dashboard do gestor, raciocínio lógico contextual
- [ ] **Phase 15: Decisão Final Auditável & LGPD Art. 20** — Consolidação de scorecards, justificativa obrigatória, explicação ao candidato, bias audit
- [ ] **Phase 16: Compliance & A11y Hardening** — WCAG AA cross-screen + fechamento de tech-debt herdado do M1

## Phase Details

### Phase 6: Pipeline Backbone & Schema

**Goal**: O pipeline de 6 etapas existe no banco como fonte de verdade auditável, com avanço controlado por trigger e RLS em todas as tabelas novas — a fundação sobre a qual todo o resto do M2 é construído.
**Depends on**: M1 (handoff em `etapa_atual='triagem'`)
**Requirements**: FUNIL-01, FUNIL-02, FUNIL-03, FUNIL-04, LGPD-02
**Success Criteria** (what must be TRUE):

  1. O enum legado `etapa_processo` (10 valores) foi deprecado com backup, e candidaturas existem com o novo enum de 6 etapas (`inscricao` → `triagem` → `avaliacao_assincrona` → `entrevista_online` → `entrevista_presencial` → `decisao_final`) + terminais `aprovado`/`rejeitado`.
  2. Um `UPDATE candidaturas` avança a etapa via trigger `avancar_etapa()` e uma tentativa de regressão sem justificativa é bloqueada.
  3. Toda transição de etapa (incluindo `auto_rejeitado`) gera uma linha em `historico_candidatura` com critério textual, timestamp e ator — verificável por query SQL.
  4. Um candidato não consegue ler dado de outra candidatura, e RH/admin leem conforme `role` do JWT — RLS habilitado em 100% das tabelas novas do M2.
  5. Auditoria SQL confirma que nenhuma decisão pode persistir com `por_usuario IS NULL` (guardrail estrutural zero-auto-rejeição).

**Plans**: 5 plans
Plans:
**Wave 1**

- [x] 06-01-PLAN.md — SQL-smoke runbook (Wave 0: pre-cutover discovery + 5 phase audits)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — historico_candidatura table + live enum cutover (backup + v2 enum + ALTER USING + companion column) [BLOCKING apply]
- [x] 06-03-PLAN.md — decisao_final (LGPD-02 structural guardrail) + bias_audit_log (schema-only)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-04-PLAN.md — avancar_etapa() PL/pgSQL trigger (regression block + same-txn audit write) [BLOCKING apply]

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 06-05-PLAN.md — FUNIL-04 RLS bundle (candidato isolation + RH/admin role reads + candidaturas UPDATE policy) [BLOCKING apply]

**Note**: Migration-heavy — `avancar_etapa()` é PL/pgSQL (`CREATE FUNCTION`/`$$...$$`). Aplicar workaround `supabase db push --linked` SQLSTATE 42601 (SQL Editor manual + `migration repair`) documentado em CLAUDE.md §Commands.

### Phase 7: Configuração de Vaga & Tags

**Goal**: O RH consegue configurar uma vaga por cargo real (template + pesos + testes aplicáveis + tags em opções) — a config que alimenta knockouts (Etapa 1), score_match (Etapa 2) e testes aplicáveis (Etapa 3).
**Depends on**: Phase 6
**Requirements**: VAGACFG-01, VAGACFG-02, VAGACFG-03
**Success Criteria** (what must be TRUE):

  1. RH cria uma vaga escolhendo um dos templates de cargo real (dentista, recepcionista, consultor_vendas_premium, sdr_social_seller, assistente_financeiro, asb, tsb, vaga_generica) e os `testes_aplicaveis` + pesos default são pré-preenchidos, com override permitido.
  2. RH ajusta `pesos_avaliacao` via sliders e a UI mostra erro inline se a soma ≠ 100%.
  3. RH marca tags em opções de pergunta (knockout/atencao/neutro/pontua/fortemente_pontua + peso + nota_ia) com bulk-mark "tudo informativa", e a validação só dispara no "Publicar vaga".

**Plans**: 4 plans
Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Wave-0 test scaffolds (9 specs) + SQL smoke runbook + D-13 Phase-4 regression case *(SHIPPED 2026-06-07 — 9 RED test files + runbook; wave_0_complete: true)*

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — schema: enum_tag_opcao + pergunta_opcao_metadata + vagas jsonb columns + sync RPC + publish_vaga RPC + RLS [BLOCKING non-autonomous apply + db:types] *(SHIPPED 2026-06-07 — 4 migrations applied live via D-22 MCP path + 5 smokes PASS; database.types.ts regenerated)*

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 07-03-PLAN.md — config-vaga feature scaffold (schemas/templates/types/service/hooks/publishGate/opcoes-normalize) + Phase-4 reader edit (D-13)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 07-04-PLAN.md — 3 UI blocks (TemplateVagaSelector + PesosSliders + Tag Wizard) + real publish/save wiring in CriarEditarVagaPage

**UI hint**: yes

### Phase 8: Inscrição & Knock-out (Etapa 1)

**Goal**: O candidato se inscreve num form LGPD-clean com qualificação por cargo e knockouts objetivos, com auto-rejeição imediata e auditável — sem que nenhum trait/score participe da decisão.
**Depends on**: Phase 6, Phase 7
**Requirements**: INSCR-01, INSCR-02, INSCR-03, INSCR-04, LGPD-01
**Success Criteria** (what must be TRUE):

  1. O form de inscrição coleta apenas os campos permitidos (nome, email, telefone, CEP, LinkedIn, data nascimento, disponibilidade, pretensão, inglês, "como conheceu", Instagram por-cargo) e o schema Zod rejeita campos proibidos (sem CPF/foto/estado civil/saúde), validando client + server.
  2. O bloco de qualificação por template aparece na Etapa 1 (máx 10 perguntas, ≤1 aberta) e é persistido em `vaga.qualificacao_etapa1` para alimentar score_match e filtros.
  3. Ao marcar uma opção `tag='knockout'`, a candidatura grava `status='rejeitado'`, `etapa='inscricao'`, `motivo='knockout_automatico'` + `opcao_knockout_id`, o candidato vê a mensagem padrão, e uma linha `auto_rejeitado=true` entra em `historico_candidatura`.
  4. Os knockouts padrão funcionam: presencial SP = Não (todos os cargos) e harmonização orofacial = Não (apenas dentista).

**Plans**: TBD
**UI hint**: yes

### Phase 9: AI Prompt Library & Cost Infra

**Goal**: Existe a infraestrutura de IA compartilhada — 7 prompts versionados com output Zod, logging obrigatório de custo/tokens e alerta de anomalia — consumida por toda Edge Function de IA do funil.
**Depends on**: Phase 6
**Requirements**: IA-01, IA-02, IA-03, IA-04, LGPD-04
**Success Criteria** (what must be TRUE):

  1. Os 7 prompts existem como library versionada (system + user + Zod output schema) com versionamento híbrido git→DB e admin UI de revisão/gold-standard.
  2. Toda chamada IA grava `prompt_version`, `model_version`, `generated_at`, `input_hash`, `output` e `custo_tokens`, auditável retroativamente via SQL.
  3. Anthropic prompt caching (ephemeral) está ativo nas partes estáveis do contexto com mix Haiku/Sonnet, mantendo custo médio ≤ R$ 0,50/candidato no funil completo.
  4. O EF `cost-alerter` dispara email ao DPO/RH lead + linha em `recruiter_alerts` quando uma anomalia de custo é detectada via canal `cost_anomaly`.
  5. O CI falha se qualquer string proibida ("teste psicológico" etc.) aparece no source — linguagem de produto enforçada por lint/grep.

**Plans**: TBD
**Note**: O trigger PL/pgSQL pós-INSERT em `ai_cost_daily` (canal `cost_anomaly`) é migration-heavy — aplicar workaround SQLSTATE 42601 (CLAUDE.md §Commands).

### Phase 10: Triagem RH com IA + Comparativo (Etapa 2)

**Goal**: O RH abre uma vaga e vê candidatos pré-ranqueados por `score_match` gerado na inscrição, e compara até 10 lado-a-lado com ranking IA justificado + export PDF — triando 30 candidatos em minutos, com a IA sempre como recomendação.
**Depends on**: Phase 8, Phase 9
**Requirements**: TRIAGEM-01, TRIAGEM-02, TRIAGEM-03, TRIAGEM-04
**Success Criteria** (what must be TRUE):

  1. Em ≤30s após o INSERT de uma candidatura que passou knock-out, existe um row Zod-validado em `analise_candidato_vaga` com resumo_cv, pontos_fortes, gaps, `score_match` (0-100) e flags.
  2. O painel `/rh/vagas/:id/candidatos` lista candidaturas com score_match, top fortes/gaps, data e etapa, paginação 20/pág, ordenação default score DESC e filtros por etapa+status.
  3. RH seleciona 2-10 candidatos e o comparativo retorna ranking + justificativa relativa em P95 ≤5s, persistindo `comparativo_solicitado`; selecionar candidatos de vagas diferentes retorna erro 400.
  4. A tela de comparativo mostra até 10 colunas (score estável, ranking 1-N, fortes, gaps, justificativa_ia, ação avançar/rejeitar) e permite export PDF.

**Plans**: TBD
**UI hint**: yes

### Phase 11: Avaliação Assíncrona — Infra + Work Sample/SJT (Etapa 3)

**Goal**: O candidato convocado faz o bloco de avaliação assíncrona com Work Sample/SJT por cargo (scoring determinístico, nunca auto-rejeição), com autosave e back-lock — e o RH vê scorecards estruturados.
**Depends on**: Phase 7, Phase 9, Phase 10
**Requirements**: AVAL-01, AVAL-02, AVAL-03, AVAL-09
**Success Criteria** (what must be TRUE):

  1. A tela `/candidato/avaliacao/:id` mostra os testes pendentes (default por `vaga.testes_aplicaveis`, ≥1 obrigatório) com tempo estimado, ordem livre, e cada teste salvo independentemente.
  2. O Work Sample/SJT de múltipla escolha pontua via Σ pesos na escala 4/2/1/0, persiste `scores_candidato` tipo=`sjt`, e `<60% OU ≥1 atencao` roteia para revisão humana — nunca auto-rejeita.
  3. O case aberto SJT é avaliado por `avaliar-redacao` com rubric BARS (0-25 + citações + red_flags Zod-validado) e `<13/25 OU red flag` roteia para revisão humana.
  4. Autosave a cada 30s preserva progresso, o back fica bloqueado após avançar etapa, e RLS + EF impedem o candidato de fazer testes fora de `etapa_atual='avaliacao_assincrona'`.

**Plans**: TBD
**UI hint**: yes

### Phase 12: Big Five + Devolutiva

**Goal**: O candidato responde o Big Five contextual com scoring à prova de adulteração server-side, e recebe uma devolutiva D-lite respeitosa e LGPD-compliant — sem que o Big Five rejeite ninguém.
**Depends on**: Phase 11
**Requirements**: AVAL-04, AVAL-08
**Success Criteria** (what must be TRUE):

  1. O candidato responde os 120 itens Likert do IPIP-NEO-120 PT-BR, e o scoring acontece server-side via `submit-bigfive-final` (anti-tampering), persistindo `scores_candidato` tipo=`big_five` com 5 dimensões OCEAN + 30 facetas + norm_group em `metadata`.
  2. Após concluir, `gerar-devolutiva-bigfive` produz devolutiva híbrida (25 templates + IA: 5 dim + percentil + 5 bandas + ~150-200 palavras/dim + disclaimers LGPD sem nominalização CRP), entregue in-app + email e persistida em `devolutivas_candidato`.
  3. Nenhuma devolutiva é gerada para SJT/Redação — apenas mensagem genérica de etapa concluída.

**Plans**: TBD
**UI hint**: yes

### Phase 13: Redação Cultural + Revisão Humana

**Goal**: O candidato escreve a redação fit-cultural avaliada por IA em 4 dimensões BARS com sistema de 3 cores, e toda redação passa por revisão humana obrigatória antes de qualquer avanço — a IA jamais decide sozinha.
**Depends on**: Phase 11
**Requirements**: AVAL-05, AVAL-06, AVAL-07
**Success Criteria** (what must be TRUE):

  1. O candidato responde 1 pergunta padrão BS + 1-2 customizáveis por template, com hard min/max 200-500 palavras e autosave 30s local + 30s DB; o seed `perguntas_redacao` (13 rows) existe.
  2. `avaliar-redacao` retorna 4 dimensões BARS + 3 caps determinísticos + classificação 3-cores (Zod `EssayScoringV1`), persiste `redacoes_candidato`, e marca `bloqueio_avanco` se vermelho.
  3. Toda redação analisada entra em status `pendente_humano`; a UI 1-redação-por-vez com sidebar por cor permite override por sliders, exige `notas_revisor ≥50 chars` e `decisao_revisor`, e "duvida" escala ao gestor — nunca há auto-rejeição.

**Plans**: TBD
**UI hint**: yes

### Phase 14: Entrevistas com IA Companion (Etapas 4+5)

**Goal**: O gestor entra na entrevista preparado — com dashboard do candidato 24h antes e guia STAR/PEI gerado por IA priorizando dimensões fracas — e a transcrição é analisada contra rubric BARS, com raciocínio lógico opt-in marcado como contextual.
**Depends on**: Phase 11, Phase 13
**Requirements**: ENTREV-01, ENTREV-02, ENTREV-03, ENTREV-04, ENTREV-05
**Success Criteria** (what must be TRUE):

  1. `gerar-guia-entrevista` (tipo `online`) retorna 5-7 perguntas STAR/PEI com âncoras BARS 1-5 + dimensão, garantindo ≥1 pergunta para cada dimensão com score <3.
  2. A tela `/rh/candidato/:id/entrevista` mostra dashboard + guia + scorecard inline editável (`notas_humanas`), com notificação ao gestor 24h antes (agendamento manual no V1).
  3. RH cola a transcrição e `avaliar-transcricao-entrevista` retorna scores BARS + flags + citações; uma flag de linguagem/sotaque em score <3 bloqueia `avancar_etapa()` até revisão humana confirmada.
  4. `gerar-guia-entrevista` (tipo `presencial`) gera guia focado nos GAPS da entrevista online (dimensões com score <4).
  5. A prova de raciocínio lógico (itens CC0, opt-in via `vaga.aplica_cognitivo`) aplica online com proctoring leve, exibe banda qualitativa marcada CONTEXTUAL, e rejeição por cognitivo isolado exige justificativa expandida + `bias_audit_log`.

**Plans**: TBD
**UI hint**: yes

### Phase 15: Decisão Final Auditável & LGPD Art. 20

**Goal**: O RH decide com visão consolidada de todos os scorecards e justificativa textual obrigatória, e o candidato rejeitado pode exercer seu direito LGPD Art. 20 — com bias audit mensal como trilha de defesa.
**Depends on**: Phase 10, Phase 14
**Requirements**: DECISAO-01, DECISAO-02, DECISAO-03, DECISAO-04, LGPD-03
**Success Criteria** (what must be TRUE):

  1. `consolidar-decisao-final` agrega todos os scorecards (não re-pontua) + aplica pesos da vaga, produzindo dashboard JSON com score consolidado + breakdown por etapa + recomendação textual.
  2. A UI consolidada permite ver o candidato lado-a-lado com finalistas reusando o Comparativo da Etapa 2.
  3. A decisão final exige justificativa ≥50 chars e persiste `decisao_final` com `por_usuario` NOT NULL + `decisao` enum (aprovado/rejeitado/em_espera) — DB constraints garantem.
  4. O candidato rejeitado acessa `/candidato/explicacao/:id`, vê motivo + score, e "Solicitar revisão por pessoa natural" abre ticket interno + notifica RH.
  5. `bias_audit_log` registra snapshot mensal de selection rate por raça/gênero/idade (regra 4/5 EEOC) com export CSV manual.

**Plans**: TBD
**UI hint**: yes

### Phase 16: Compliance & A11y Hardening

**Goal**: Todo o lado RH e candidato do M2 passa WCAG AA, e o tech-debt herdado do M1 é endereçado — fechando o milestone com qualidade de release.
**Depends on**: Phase 15
**Requirements**: LGPD-05
**Success Criteria** (what must be TRUE):

  1. As telas principais de RH e Candidato do M2 passam axe-core ≥90 (WCAG AA), verificado em CI.
  2. O tech-debt herdado do M1 é triado e endereçado oportunisticamente (PERF-01 cache-invalidation ≤60s, HARD-02 Lighthouse/bundle code-splitting, FOUND-08 tsc baseline burn-down, console.log RH-path) — escopo documentado mesmo onde diferido.

**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation Saneada | v1.0 | 5/5 | Complete | 2026-04-20 |
| 2. Cadastro Candidato | v1.0 | 6/6 | Complete | 2026-04-24 |
| 3. Login + Recuperação de Senha | v1.0 | 7/7 | Complete | 2026-04-27 |
| 4. Vagas + Candidatura | v1.0 | 9/9 | Complete | 2026-04-26 |
| 4.1 Auth Hydration Fix | v1.0 | 5/5 | Complete | 2026-04-27 |
| 4.2 Phase 1 Verification Backfill | v1.0 | 1/1 | Complete | 2026-04-27 |
| 5. Perfil + Hardening MVP | v1.0 | 7/7 | Complete | 2026-06-06 |
| 6. Pipeline Backbone & Schema | v2.0 | 5/5 | Complete   | 2026-06-07 |
| 7. Configuração de Vaga & Tags | v2.0 | 2/4 | Executing | - |
| 8. Inscrição & Knock-out (Etapa 1) | v2.0 | 0/0 | Not started | - |
| 9. AI Prompt Library & Cost Infra | v2.0 | 0/0 | Not started | - |
| 10. Triagem RH com IA + Comparativo (Etapa 2) | v2.0 | 0/0 | Not started | - |
| 11. Avaliação Assíncrona — Infra + Work Sample/SJT (Etapa 3) | v2.0 | 0/0 | Not started | - |
| 12. Big Five + Devolutiva | v2.0 | 0/0 | Not started | - |
| 13. Redação Cultural + Revisão Humana | v2.0 | 0/0 | Not started | - |
| 14. Entrevistas com IA Companion (Etapas 4+5) | v2.0 | 0/0 | Not started | - |
| 15. Decisão Final Auditável & LGPD Art. 20 | v2.0 | 0/0 | Not started | - |
| 16. Compliance & A11y Hardening | v2.0 | 0/0 | Not started | - |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/`.*
*v2.0 milestone roadmapped 2026-06-07 — 11 phases (6–16), 42 requirements mapped (100% coverage).*
