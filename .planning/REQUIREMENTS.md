# Requirements: Sistema de Recrutamento Beauty Smile

**Defined:** 2026-06-07
**Core Value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar, avaliar e decidir sobre candidatos num unico sistema rastreavel com scores comparaveis.
**Milestone:** v2.0 — M2 Funil RH + Avaliação por IA
**Design source (frozen):** `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` v1.1 + 5 mini-PRDs + `docs/conhecimento/` (RAG)
**Phase numbering:** continues from M1 → M2 starts at **Phase 6**

> Pipeline de 6 etapas: `inscricao` → `triagem` → `avaliacao_assincrona` → `entrevista_online` → `entrevista_presencial` → `decisao_final` (+ terminais `aprovado` / `rejeitado`). IA é sempre **recomendação, nunca decisão** (RNF-07a). REQ-IDs rastreiam os RF/RNF do PRD-MASTER entre colchetes.

## v1 Requirements

Requirements for M2. Each maps to roadmap phases. Todos derivados do conjunto **Must** do PRD-MASTER v1.1.

### Funil (Pipeline core)

- [ ] **FUNIL-01**: Migration controlada deprecando o enum `etapa_processo` legado (10 valores, nunca exercido) → novo enum de 6 etapas + 2 estados terminais, com backup das tabelas antes do drop [§3.1, §8.1 mig 01/02/03]
- [ ] **FUNIL-02**: Trigger PL/pgSQL `avancar_etapa()` em `UPDATE candidaturas` faz auto-advance de etapa e bloqueia regressão sem justificativa [§3.1, §8.1 mig 15]
- [ ] **FUNIL-03**: `historico_candidatura` registra trilha de auditoria completa de toda transição de etapa (incl. `auto_rejeitado`, critério textual, timestamp, ator) [RF-04, §8.1 mig 13]
- [ ] **FUNIL-04**: RLS habilitado em 100% das tabelas novas do M2 (candidato lê só próprio dado; RH/admin leem conforme role via JWT `app_metadata`) [RNF-04, §8.3]

### Inscrição (Etapa 1)

- [x] **INSCR-01**: Form de inscrição LGPD-clean (nome, email, telefone, CEP, LinkedIn, data nascimento, disponibilidade início, pretensão, inglês, "como conheceu", Instagram por-cargo); **sem CPF/foto/estado civil/saúde**; campos legado removidos. Validação Zod client+server [RF-01]
- [ ] **INSCR-02**: Bloco de qualificação estruturada por template de cargo na Etapa 1 (máx 10 perguntas, ≤1 aberta; `vaga.qualificacao_etapa1` jsonb) — alimenta `score_match` (Etapa 2) + filtros do painel RH [RF-01a]
- [ ] **INSCR-03**: Knock-out questions configuráveis por vaga (binárias/single_choice) com tag por opção; knockouts padrão: presencial SP (todos) + harmonização orofacial (dentista) [RF-02]
- [ ] **INSCR-04**: Auto-rejeição imediata ao marcar opção `tag='knockout'` (`status='rejeitado'`, `etapa='inscricao'`, `motivo='knockout_automatico'`, `opcao_knockout_id`) + mensagem ao candidato + linha de auditoria em `historico_candidatura` (`auto_rejeitado=true`) [RF-03, RF-04]

### Triagem RH com IA (Etapa 2)

- [ ] **TRIAGEM-01**: Trigger no INSERT de candidatura (pós-knockout) chama EF `analise-candidato-individual`, que gera `analise_candidato_vaga` (resumo_cv, resumo_respostas, pontos_fortes, gaps, `score_match` 0-100, flags) em ≤30s, Zod-validado [RF-05, RF-06]
- [ ] **TRIAGEM-02**: Painel RH `/rh/vagas/:id/candidatos` lista candidaturas (score_match, top fortes/gaps, data, etapa), paginação 20/pág, ordenação default score DESC, filtros por etapa+status [RF-07]
- [ ] **TRIAGEM-03**: Comparativo on-demand — seleção de 2-10 candidatos → EF `comparativo-candidatos` retorna ranking + justificativa relativa (P95 ≤5s); persiste `comparativo_solicitado` (audit); erro 400 se candidatos de vagas diferentes [RF-08, RF-09]
- [ ] **TRIAGEM-04**: Tela de comparativo — tabela até 10 colunas (score estável, ranking 1-N, fortes, gaps, justificativa_ia, ação avançar/rejeitar) + export PDF [RF-10]

### Avaliação Assíncrona (Etapa 3)

- [ ] **AVAL-01**: `vaga.testes_aplicaveis` jsonb configura testes ativos (default por template, admin override, validação ≥1 obrigatório); tela `/candidato/avaliacao/:id` mostra pendentes + tempo estimado, ordem livre, cada teste salvo independente [RF-11, RF-12]
- [ ] **AVAL-02**: Work Sample/SJT múltipla escolha — scoring determinístico Σ pesos (escala 4/2/1/0), threshold `<60% OU ≥1 atencao` → revisão humana (nunca auto-reject); persiste `scores_candidato` tipo=`sjt` [RF-13]
- [ ] **AVAL-03**: Work Sample/SJT case aberto avaliado por `avaliar-redacao` com rubric BARS (0-25 + citações + red_flags Zod-validado), threshold `<13/25 OU red flag` → revisão humana [RF-14]
- [ ] **AVAL-04**: Big Five IPIP-NEO-120 PT-BR (120 itens Likert) — scoring TS-port server-side anti-tampering via `submit-bigfive-final`; 5 dimensões OCEAN + 30 facetas + norm_group; persiste `scores_candidato` tipo=`big_five` com `metadata` jsonb [RF-15]
- [ ] **AVAL-05**: Redação fit cultural v1.1 — 1 pergunta padrão BS + 1-2 customizáveis por template; 200-500 palavras hard min/max; autosave 30s local + 30s DB; seed `perguntas_redacao` [RF-16]
- [ ] **AVAL-06**: Avaliação de redação por `avaliar-redacao` — 4 dimensões BARS (pesos iguais V1) + 3 caps determinísticos + sistema 3 cores + few-shot cacheado; Zod `EssayScoringV1`; persiste `redacoes_candidato` + `bloqueio_avanco` se vermelho [RF-17, RF-17b]
- [ ] **AVAL-07**: Revisão humana sempre obrigatória pós-IA (status `pendente_humano`) — UI 1-redação-por-vez, sidebar por cor, sliders override, `notas_revisor ≥50 chars`, `decisao_revisor` (aprovado/reprovado/duvida); "duvida" escala ao gestor [RF-17a]
- [ ] **AVAL-08**: Devolutiva Big Five D-lite (híbrido 25 templates oficiais + IA; 5 dim + percentil + 5 bandas + texto ~150-200 palavras/dim + disclaimers LGPD sem nominalização CRP) via `gerar-devolutiva-bigfive`; in-app + email (n8n); persiste `devolutivas_candidato`. **Nunca** devolutiva para SJT/Redação [RF-19a, RF-19b]
- [ ] **AVAL-09**: Autosave de progresso a cada 30s + bloqueio de back após avançar etapa; RLS + EF impedem candidato fazer testes fora de `etapa_atual='avaliacao_assincrona'` [RF-18, RF-19]

### Entrevistas (Etapas 4 + 5)

- [ ] **ENTREV-01**: EF `gerar-guia-entrevista` (tipo `online`) retorna 5-7 perguntas STAR/PEI customizadas com âncoras BARS 1-5 + dimensão; prioriza dimensões fracas (≥1 pergunta cobre dimensão com score <3) [RF-20, RF-21]
- [ ] **ENTREV-02**: Tela do gestor `/rh/candidato/:id/entrevista` mostra dashboard do candidato + guia + scorecard inline editável (`notas_humanas`); notificação ao gestor 24h antes (agendamento manual no V1 — auto-scheduling deferido, ver Future) [RF-22, RF-20c]
- [ ] **ENTREV-03**: Análise de transcrição — RH cola transcrição → EF `avaliar-transcricao-entrevista` retorna scores BARS por competência + flags + citações; flag linguagem/sotaque em score <3 bloqueia `avancar_etapa()` até revisão humana confirmada [RF-23, RF-24]
- [ ] **ENTREV-04**: EF `gerar-guia-entrevista` (tipo `presencial`) gera guia focado nos GAPS da entrevista online (dimensões com score <4) [RF-25]
- [ ] **ENTREV-05**: Prova de raciocínio lógico (matriz + letra-número, itens CC0) aplicável online com proctoring leve, opt-in (`vaga.aplica_cognitivo`, default false); banda qualitativa (5 faixas) marcada **CONTEXTUAL** no painel; bloqueia rejeição por cognitivo isolado (override exige justificativa expandida + `bias_audit_log`) [RF-26, RF-27]

### Decisão Final (Etapa 6)

- [ ] **DECISAO-01**: EF `consolidar-decisao-final` agrega todos os scorecards (não re-pontua) + aplica pesos da vaga → dashboard JSON com score consolidado + breakdown por etapa + recomendação textual [RF-29]
- [ ] **DECISAO-02**: UI consolidada permite ver candidato lado-a-lado com finalistas (reusa o Comparativo da Etapa 2) [RF-30]
- [ ] **DECISAO-03**: Decisão final exige justificativa textual obrigatória ≥50 caracteres → `decisao_final` com `por_usuario` NOT NULL + `decisao` enum (aprovado/rejeitado/em_espera) + DB constraints [RF-31]
- [ ] **DECISAO-04**: Endpoint `/candidato/explicacao/:id` (LGPD Art. 20) mostra motivo da rejeição + score + opção "Solicitar revisão por pessoa natural" → abre ticket interno + notifica RH responsável [RF-32]

### Configuração de Vaga (transversal)

- [x] **VAGACFG-01**: Templates de vaga pelos cargos reais Beauty Smile (dentista, recepcionista, consultor_vendas_premium, sdr_social_seller, assistente_financeiro, asb, tsb, vaga_generica) com `testes_aplicaveis` + pesos default + banco SJT por cargo; RH escolhe no create, override depois [RF-33]
- [x] **VAGACFG-02**: Pesos `vaga.pesos_avaliacao` jsonb configuráveis via sliders na UI com validação soma = 100% (erro inline se ≠) [RF-34]
- [x] **VAGACFG-03**: Wizard de marcação de tags em opções de pergunta (knockout/atencao/neutro/pontua/fortemente_pontua + peso + nota_ia) com bulk-mark "tudo informativa" e validação progressiva só no "Publicar vaga" [RF-35, RF-36]

### Integração IA (AI Prompt Library)

- [ ] **IA-01**: Library de 7 prompts versionados (system prompt + user message + Zod output schema por uso), versionamento híbrido git→DB + admin UI de revisão/gold-standard [§3.1, mini-PRD AI Prompt Library]
- [ ] **IA-02**: Logging estruturado obrigatório de toda chamada IA (`prompt_version`, `model_version`, `generated_at`, `input_hash`, `output`, `custo_tokens`), auditável retroativamente em SQL [RNF-09]
- [ ] **IA-03**: Anthropic prompt caching (ephemeral) nas partes estáveis do contexto (vaga + rubric + few-shot) + mix Haiku/Sonnet, mantendo custo médio ≤ R$ 0,50 por candidato no funil completo [RNF-10, §8.4]
- [ ] **IA-04**: EF `cost-alerter` — Postgres LISTEN no canal `cost_anomaly` (trigger pós-INSERT em `ai_cost_daily`) + cron horário → email DPO/RH lead + linha em `recruiter_alerts` [§8.4]

### LGPD / Bias / Acessibilidade

- [x] **LGPD-01**: Minimização de PII no form Etapa 1 (sem foto/CPF/estado civil/saúde); data de nascimento coletada conscientemente **com monitoramento de viés etário** (RNF-07b); schema Zod rejeita campos proibidos [RNF-07, RF-01]
- [ ] **LGPD-02**: Guardrail — **zero** auto-rejeições por trait/score; 100% das `decisao_final` têm `por_usuario IS NOT NULL` (enforced via RLS + SQL audit) [RNF-07a]
- [ ] **LGPD-03**: `bias_audit_log` com snapshot mensal de selection rate por raça/gênero/idade (regra 4/5 EEOC — export CSV manual no V1) [RNF-07b, §8.1 mig 14]
- [ ] **LGPD-04**: Linguagem de produto "avaliação comportamental/cognitiva" (nunca "teste psicológico") — lint custom/grep de strings proibidas no CI [RNF-12]
- [ ] **LGPD-05**: UI RH e Candidato passam WCAG AA (axe-core ≥ 90 nas telas principais) [RNF-11]

## Future Requirements

Deferred — out of M2 v1, candidatos a M2 v2 / M3.

- **MS Bookings (auto-scheduling)** — agendamento de entrevista online/presencial via Microsoft Bookings + webhook EF `webhook-bookings` + `agendamentos_entrevista`; V1 usa agendamento manual [RF-20a, RF-20b, RF-25a — deferido por decisão 2026-06-07]
- **Bias audit automatizado** — cron + dashboard interno + alertas se regra 4/5 violada [§3.2]
- **LLM-as-judge com calibração contínua** — RH pontua N candidatos, IA aprende preferência da clínica (Vervoe-style) [§3.2]
- **Cognitivo: norma local (N≥200) + validação criterial** [§3.2]
- **Dashboard de fairness exposto ao admin** (não só auditor) [§3.2]
- **Carta de devolução personalizada por IA** (LGPD-friendly, sem expor critério) [§3.2]
- **Workflow n8n de SLA** — notificação a candidatos parados em etapa há > X dias [§3.2]
- **Comparativo lado-a-lado de redações** [RF-17a → V2]
- **Teste prático freela (dentista, 1 semana)** — label de próxima etapa; política RH fora do sistema [RF-28, Could]
- **v3:** calendar Google/Outlook direto · WhatsApp Business API · onboarding handoff → `funcionarios` · IA gera descrição de vaga · análise preditiva de retenção · multi-tenant [§3.3]

## Out of Scope

Exclusões explícitas (§3b do PRD-MASTER) — com razão e consideração futura.

- **DISC obrigatório** — validade preditiva ~zero; mantido só como opt-in para liderança
- **Análise facial / vídeo da entrevista** — risco reputacional + EU AI Act fev/2026; proibido por princípio (nunca)
- **Auto-rejeição por trait/score** — viola RNF-07a + expõe a EEOC/LGPD; IA é sempre recomendação (nunca)
- **Detecção de ChatGPT em redação** — <80% confiabilidade + falso-positivo p/ não-nativos; mitigação = follow-up ao vivo na Etapa 4
- **Raven Progressive Matrices** — SATEPSI-desfavorável + licença inviável + adverse impact alto; substituído por raciocínio CC0
- **ICAR60 como instrumento** — licença non-commercial + zero validação PT-BR + fora SATEPSI; só itens CC0 avulsos reposicionados como prova técnica
- **Cultura como etapa separada** — vira dimensão da redação (culture-fit AI scoring isolado = discriminação)
- **n8n no core do funil (decisões avaliativas)** — workflows de decisão vivem no Git com auditoria; n8n só para periféricas (notificações/lembretes)
- **Multi-tenant** — Beauty Smile single-tenant; sem `tenant_id`
- **App mobile nativo do RH** — SPA responsiva atende (RH usa desktop)
- **Sentry** — Vercel Runtime Logs nativos atendem
- **Banco SJT completo p/ todos os cargos no MVP** — 1-2 SJT por cargo no V1; banco cresce no V2
- **Subescala verbal / rotação 3D no cognitivo** — verbal = adverse impact alto; 3D = assets pesados/baixa cobertura

## Tech-debt backlog (herdado do M1 — não-formalizado como REQ-ID)

Rastreado, endereçável oportunisticamente dentro das fases do M2 (decisão 2026-06-07: não vira requirement formal). Endereçamento consolidado na **Phase 16 (Compliance & A11y Hardening)**:

- **PERF-01 cache-invalidation** — janela ≤60s entre apply e display no perfil candidato
- **HARD-02 Lighthouse Performance** — bundle 661 KiB monolítico (code-splitting); warn-baseline 0.62-0.68
- **FOUND-08 tsc baseline burn-down** — 292 erros legados; husky pre-commit hoje bypassado via `core.hooksPath=/dev/null`
- console.log de debug no RH-path

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| FUNIL-01 | Phase 6 | Pending |
| FUNIL-02 | Phase 6 | Pending |
| FUNIL-03 | Phase 6 | Pending |
| FUNIL-04 | Phase 6 | Pending |
| LGPD-02 | Phase 6 | Pending |
| VAGACFG-01 | Phase 7 | Complete |
| VAGACFG-02 | Phase 7 | Complete |
| VAGACFG-03 | Phase 7 | Complete |
| INSCR-01 | Phase 8 | Complete |
| INSCR-02 | Phase 8 | Pending |
| INSCR-03 | Phase 8 | Pending |
| INSCR-04 | Phase 8 | Pending |
| LGPD-01 | Phase 8 | Complete |
| IA-01 | Phase 9 | Pending |
| IA-02 | Phase 9 | Pending |
| IA-03 | Phase 9 | Pending |
| IA-04 | Phase 9 | Pending |
| LGPD-04 | Phase 9 | Pending |
| TRIAGEM-01 | Phase 10 | Pending |
| TRIAGEM-02 | Phase 10 | Pending |
| TRIAGEM-03 | Phase 10 | Pending |
| TRIAGEM-04 | Phase 10 | Pending |
| AVAL-01 | Phase 11 | Pending |
| AVAL-02 | Phase 11 | Pending |
| AVAL-03 | Phase 11 | Pending |
| AVAL-09 | Phase 11 | Pending |
| AVAL-04 | Phase 12 | Pending |
| AVAL-08 | Phase 12 | Pending |
| AVAL-05 | Phase 13 | Pending |
| AVAL-06 | Phase 13 | Pending |
| AVAL-07 | Phase 13 | Pending |
| ENTREV-01 | Phase 14 | Pending |
| ENTREV-02 | Phase 14 | Pending |
| ENTREV-03 | Phase 14 | Pending |
| ENTREV-04 | Phase 14 | Pending |
| ENTREV-05 | Phase 14 | Pending |
| DECISAO-01 | Phase 15 | Pending |
| DECISAO-02 | Phase 15 | Pending |
| DECISAO-03 | Phase 15 | Pending |
| DECISAO-04 | Phase 15 | Pending |
| LGPD-03 | Phase 15 | Pending |
| LGPD-05 | Phase 16 | Pending |
