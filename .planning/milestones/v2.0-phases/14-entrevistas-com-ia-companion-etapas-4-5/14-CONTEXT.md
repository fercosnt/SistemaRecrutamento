# Phase 14: Entrevistas com IA Companion (Etapas 4+5) - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 grey areas resolved, all accepted as recommended

<domain>
## Phase Boundary

O gestor entra na entrevista preparado — **dashboard do candidato + guia STAR/PEI gerado por IA
priorizando dimensões fracas** (≥1 pergunta por dimensão com score <3) — e a **transcrição é
analisada contra rubric BARS** (scores por competência + flags + citações), com a prova de
**raciocínio lógico opt-in marcada CONTEXTUAL** (nunca rejeita sozinha). Cobre ENTREV-01..05
(Etapas 4 entrevista online + 5 presencial do funil). A IA jamais decide sozinha (RNF-07a):
flag de linguagem/sotaque em score <3 bloqueia `avancar_etapa()` até revisão humana confirmada.

**Fora de escopo:** decisão final consolidada (Phase 15), a11y hardening (Phase 16),
auto-scheduling/calendário automático (Future).
</domain>

<decisions>
## Implementation Decisions

### Spec source (binding)
- Vincular a **`docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md`** (seções de entrevista: guia STAR/PEI, dashboard, análise de transcrição) + **`docs/prds/m2-funil-rh/PRD-cognitivo-raciocinio.md`** (ENTREV-05 — itens CC0, banda qualitativa, CONTEXTUAL, bias_audit_log) como specs autoritativas. Consultar também `docs/prds/prd-db-004-entrevistas-avaliacoes.md` (anterior). O planner/researcher consolidam e implementam verbatim (rubric BARS, STAR/PEI, itens CC0, banding); só gaps genuínos sobem ao usuário.

### EF architecture
- **2 EFs NOVAS dedicadas**, ambas clonando o padrão PROD-green (`analise-candidato-individual`/`avaliar-redacao-cultural`):
  1. `gerar-guia-entrevista` — branch por `tipo` (`online` → 5-7 perguntas STAR/PEI com âncoras BARS 1-5 + dimensão, ≥1 cobrindo dimensão score<3; `presencial` → guia focado nos GAPS da online, dimensões score<4).
  2. `avaliar-transcricao-entrevista` — RH cola transcrição → scores BARS por competência + flags + citações; flag linguagem/sotaque em score<3 → bloqueia avancar_etapa até revisão humana.
- Padrão obrigatório: imports `npm:` ESTÁTICOS + helpers `zodOutputFormat`/`zodResponseFormat` injetados + schema `npm:zod@3.25.76/v4` + **authenticate-THEN-authorize** (role + posse via `candidatos.user_id`=auth.uid()/`vagas.created_by` p/ RH — NUNCA `candidato_id===user.id`, ver [[reference_ef_authenticate_vs_authorize]]) + JWT-on + NUNCA escreve candidaturas decisão (RNF-07a). call_types `interview_guide` + `transcript_analysis` já existem no enum `llm_call_type` (prompt_versions is_active=false → ativar+hidratar no apply wave, como culture_fit_essay). Aplicar a cadeia [[reference_ef_npm_join_import_bug]].

### Cognitive prova proctoring (ENTREV-05)
- **Proctoring leve MÍNIMO V1:** soft timer + tab-blur/visibility-change logging + paste-block no campo de resposta. **SEM webcam, SEM screen capture, SEM biometria** (privacy-light, LGPD-friendly). Logado como contexto em `bias_audit_log`, NUNCA auto-rejeita. opt-in via `vaga.aplica_cognitivo` (default false). Banda qualitativa (5 faixas) marcada **CONTEXTUAL** no painel; rejeição por cognitivo isolado exige justificativa expandida + `bias_audit_log`.

### 24h gestor notification
- **V1 = in-app + agendamento MANUAL.** RH define datetime da entrevista; indicador/dashboard in-app surfaceia entrevistas próximas + computa/exibe o marcador 24h. **SEM pipeline automatizado de email/calendário** nesta phase (auto-scheduling deferido → Future per ENTREV-02). NÃO wire n8n email agora.

### Claude's Discretion
- Nomes exatos de tabelas/colunas/índices (watch index-name collisions — ver Phase 13 idx_perguntas_cargo), estrutura dos componentes, RLS specifics, e o set exato de competências BARS da entrevista — tudo à discrição do planner desde que honre os PRDs + as decisões acima.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AI infra Phase 9** (`supabase/functions/_shared/`): ai-client (callAi + zodOutputFormat/zodResponseFormat helpers), prompt-loader (DB active), audit-logger (LGPD-02), pii-masker, injection-detector. PROD-green EF refs: `analise-candidato-individual`, `avaliar-redacao-cultural` (static imports + zod/v4 + authorize-then-act).
- **scores_candidato** generic sink — `tipo_score` enum já forward-declara `entrevista` + `cognitivo` (Phase 11). Sem ALTER TYPE p/ esses.
- **RH UI patterns**: ScorecardAvaliacao, SugestaoIABadge ('Sugestão da IA — decisão é sempre humana'), TriagemTable/useTriagemPanel, RH-guarded routes. RedacaoReviewPanel (Phase 13) é análogo p/ o painel inline editável.
- **salvar_revisao_redacao** RPC (Phase 13) é o template p/ uma review/notes-write RPC SECURITY DEFINER role+own-vaga guarded.

### Established Patterns
- Migrations PL/pgSQL → PROD via Supabase MCP `apply_migration` (D-22, bypassa 42601, grava version row). EFs deploy via CLI `supabase functions deploy` (auto-bundla _shared). Prompt hydrate: row [SEED PLACEHOLDER] → execute_sql UPDATE (dollar-quote) system/user_template + is_active=true (NÃO setar deployed_at antes do content — immutability trigger trava template/hash após deployed_at).
- Commits via `git -c core.hooksPath=/dev/null`; tsc baseline ≤291; Wave-0 RED tests (smoke-runtime gate).
- avancar_etapa() é o trigger/RPC de avanço de funil — a flag bias bloqueia ele (não escreve decisão de candidatura; RNF-07a).

### Integration Points
- Novas tabelas: guias de entrevista + análise de transcrição (scores BARS) + cognitivo (itens CC0 + respostas + banding) + bias_audit_log. Rota RH `/rh/candidato/:id/entrevista`. Rota candidato p/ a prova cognitiva (opt-in). `vagas.aplica_cognitivo` flag (default false). `vagas.testes_aplicaveis` (Phase 7) decide aplicabilidade.
</code_context>

<specifics>
## Specific Ideas
- ENTREV-05 CONTEXTUAL: o cognitivo NUNCA é eliminatório isolado; banda qualitativa + bias_audit_log na rejeição.
- Flag linguagem/sotaque (anti-viés regional) em score<3 → bloqueia avanço até revisão humana (mesma filosofia da redação cultural style-neutralization).
- Itens CC0 (creative-commons-zero / public domain) p/ a prova de raciocínio — ver PRD-cognitivo-raciocinio.md.
</specifics>

<deferred>
## Deferred Ideas
- Auto-scheduling / integração calendário (Google/MS Bookings) → Future (per ENTREV-02 + milestone scope).
- Email automation n8n p/ a notificação 24h → fora desta phase.
- A11y/WCAG da UI de entrevista + prova → Phase 16.
</deferred>
