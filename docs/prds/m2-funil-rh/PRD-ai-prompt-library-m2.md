# PRD — AI Prompt Library (M2 Funil RH)

**Autor**: Fernando Costa (RH Beauty Smile / Tech Lead) | **Data**: 2026-05-10 | **Status**: Draft v0.1
**Nível**: Standard
**Milestone**: M2 — Funil RH
**Upstream**: PRD-MASTER M2 v0.3 + PESQUISA prompt-library-ats + AUDITORIA-LGPD-LOGGING-VERSIONING + 8 templates depositados (`docs/conhecimento/prompts/`) + 5 fontes técnicas

---

## 0. Sumário Executivo

A AI Prompt Library é o subsistema que **versiona, audita e serve** os 7 prompts de IA usados pelas Edge Functions do M2 Funil RH. Resolve um gap crítico entre o pattern atual (templates Markdown isolados em `docs/conhecimento/prompts/`) e o requisito LGPD Art. 20 (qualquer decisão automatizada precisa ser **reproduzível retroativamente** com prompt + modelo + input pseudonimizado registrados).

**Decisão arquitetural-chave**: **Híbrido git→DB**. Templates Markdown no git (`docs/conhecimento/prompts/templates/`) são fonte autoritativa para devs/PRs/diff. Um build script (CI on-merge-to-main) hidrata a tabela `prompt_versions` no Postgres. Edge Functions em runtime consultam **somente o DB** — nunca o filesystem — para permitir canary routing + rollback SQL <60s sem redeploy.

**Decisões críticas lockadas nesta sessão**:

| # | Decisão |
|---|---------|
| 1 | Source-of-truth: Híbrido git→DB (markdown autoritativo + sync para Postgres) |
| 2 | Versionamento: SemVer (X.Y.Z) + content_hash SHA-256 + schema_version_required (compat matrix) |
| 3 | Retenção de versões: forever-while-referenced (purga só quando órfã + >1 ano deprecated) |
| 4 | Estrutura template: 1 arquivo `.md` com frontmatter + system + user + few-shot inline; Zod importado de `00-shared-zod-schemas.ts` |
| 5 | Modelo por uso: Haiku 4.5 para CV summary; Sonnet 4.6 para os 6 demais usos |
| 6 | Cache strategy: Anthropic ephemeral 5min default; system + (vaga + rubric) cacheados |
| 7 | Logging: tabela `ai_call_logs` (AUDITORIA §2.3); endpoint admin read-only `/admin/ai-logs` |
| 8 | Bias mitigation: pre-deploy + trimestral + por novo MAJOR (n=30/n=50/n=30, blind, 2 raters) |
| 9 | Cost alerts: pg_cron horário + Postgres NOTIFY + Edge Function `cost-alerter` envia email DPO |
| 10 | Fallback: GPT-4o-mini só quando circuit breaker Anthropic abrir (5 falhas em 60s) |

**Custo esperado por candidato** (mix Haiku + Sonnet, cache 30-40% hit rate): R$ 0,38 — dentro do RNF-10 (≤R$ 0,50).

---

## 1. Problema & Contexto

### 1.1 Problema central

> "Como Tech Lead da Beauty Smile, eu não consigo provar a um candidato (LGPD Art. 20) — ou ao DPO — que a decisão automatizada que rejeitou sua candidatura em 2026-08 foi baseada exatamente no prompt v2.1.0 do `cv_job_match`, com modelo `claude-sonnet-4-6`, sem que eu tenha um sistema que: (a) versione prompts imutavelmente, (b) registre cada chamada com prompt_version_id + input_hash pseudonimizado, e (c) permita rollback de prompt em <60s se um bias audit detectar violação 4/5."

### 1.2 Evidências

| Fonte | Evidência |
|-------|-----------|
| **AUDITORIA-LGPD-LOGGING-VERSIONING.md** §1 | LGPD Art. 20 (decisão automatizada) + Art. 9 (transparência) exigem trilha completa: prompt → resposta → modelo → versão → timestamp |
| **PESQUISA-prompt-library-ats.md** §3-5 | Best practices 2025: structured output via Zod + tool use, prompt caching para chunks estáveis (vaga+rubric), Pearson/Spearman ≥0.70 vs raters humanos antes de produção |
| **PRD-MASTER M2** §8.4 | 7 Edge Functions de IA + 1 NOVA (`gerar-devolutiva-bigfive`) precisam consumir prompts versionados — atualmente o Master assume isso mas não especifica COMO |
| **PRD-MASTER M2** §8.8 | Decisão "RAG via filesystem `docs/conhecimento/`" lockada para conhecimento auxiliar (Big Five Word docs, ICAR60 etc) — porém prompts em si exigem versionamento + canary que filesystem-only não suporta |
| **fontes/04-bias-mitigation-llm-judge-academic.md** | Counterfactual testing PT-BR (4 pares de nomes, regiões NE/SP/RS) detecta proxies demográficos antes de IPO — exige re-rodar com nova versão de prompt |
| **fontes/05-production-patterns-logging-versioning-lgpd.md** | SemVer + content_hash + canary deploy é pattern padrão em ATS production-grade (Workday, Eightfold) |

### 1.3 Contexto histórico

- **2026-04-27**: Deep Research #5 retornou 8 templates prontos depositados em `docs/conhecimento/prompts/templates/`. AUDITORIA-LGPD escreveu o schema completo de `prompt_versions` + `ai_call_logs` + `candidate_ai_decisions` + `ai_cost_daily`. Reference implementation `08-edge-function-reference.ts` (17KB) já tem circuit breaker + retry + idempotency + logging.
- **Estado atual**: artefatos prontos no filesystem, MAS nenhuma Edge Function ainda os consome (M2 Phase 0 não iniciada). PRD-MASTER §8.5 propõe estrutura `_shared/prompts/*.ts` que é incompatível com o pattern Híbrido git→DB acordado nesta sessão — este PRD **substitui** essa estrutura.
- **Tensão resolvida**: README atual de `docs/conhecimento/prompts/` falava de "filename suffix `vN`" para versionamento. AUDITORIA falava de SemVer + hash em DB. **Híbrido**: filename mantém-se simples (`01-cv-summary.md` é sempre o "current"); SemVer + hash vivem no frontmatter; DB é runtime.

---

## 2. Objetivos & Métricas

### 2.1 Objective (OKR)

> **Estabelecer infraestrutura de prompts versionada, auditável e reprodutível** que sustente as 7 Edge Functions de IA do M2 Funil RH com compliance LGPD Art. 20 + custo ≤R$ 0,50/candidato + qualidade ≥0.70 Pearson vs raters humanos.

### 2.2 Métrica Primária

**Reproducibility Rate** = % de decisões automatizadas (em `candidate_ai_decisions`) para as quais é possível **rerodar exatamente o mesmo prompt+modelo+input pseudonimizado** e obter score dentro de ±5 pontos do original.

- **Alvo**: ≥99% (1% de tolerância para drift do modelo provedor entre datas)
- **Como medir**: cron mensal pega 50 logs aleatórios do mês anterior, replay via Edge Function dev, compara
- **Threshold de alerta**: <97% → investigar drift do provedor ou bug em logging

### 2.3 Métricas Secundárias

| Métrica | Alvo | Como medir |
|---------|------|------------|
| **Cache hit rate** (Anthropic ephemeral) | ≥30% (mix de vagas hot/cold) | Query SQL na AUDITORIA §8 (`raw_response.usage.cache_read_input_tokens > 0`) |
| **Custo médio por candidato** (até decisão final) | R$ 0,38 (RNF-10 ≤R$ 0,50) | Sum `cost_usd` em `ai_call_logs` agrupado por `candidato_id+vaga_id` |
| **Latência p95** por call_type | <8s (cv_summary), <12s (cv_job_match, transcript), <15s (ranking, interview_guide) | Percentil de `latency_ms` em `ai_call_logs` |
| **Pearson r** AI vs raters humanos (gold standard) | ≥0.70 (pre-deploy + trimestral) | Procedimento §6.7 (RF-PL-15) |
| **Disparate Impact Ratio** (4/5 rule) | ≥0.80 por gênero/região | Procedimento §6.7 + counterfactual PT-BR |
| **Rollback time** (deprecate active version) | <60s desde decisão até primeiro tráfego na versão anterior | Smoke test trimestral cronometrado |

### 2.4 Métricas Guardrail (NÃO podem piorar)

| Guardrail | Threshold | Trigger se violado |
|-----------|-----------|---------------------|
| **Custo/candidato p95** | ≤R$ 1,00 (3× baseline) | Email DPO via `cost-alerter` Edge Function |
| **Error rate por call_type (24h)** | <5% | Email DPO + rollback automático para versão anterior se >10% |
| **Spam de vaga** (cand > 500/7d) | Flag anti-spam | Email DPO + audit do CAPTCHA da vaga |
| **PII leak em logs** | 0 ocorrências | Quarterly audit manual de 100 logs random; qualquer match de regex PII = incident report |
| **Inter-rater agreement (gold standard)** | κ ≥ 0.60 | Se humanos não concordam entre si, métrica AI vs humano não é confiável → recalibrar raters |

---

## 3. Escopo

### 3.1 v1 — MVP Prompt Library M2 (estimativa: 3-4 semanas, parte da Phase 0 do M2)

**Backend / Database**:
- Migration: criar tabelas `prompt_versions`, `ai_call_logs`, `candidate_ai_decisions`, `ai_cost_daily`, `data_deletion_log` conforme AUDITORIA §2 (schema completo)
- Migration: criar enums `llm_call_type`, `llm_provider`, `candidate_status`
- Migration: criar pg_cron jobs (retention purge diário, agregação cost_daily, SLA HITL alert)
- Migration: criar pgmq queues `ai_evaluation_queue` + `ai_evaluation_retry`

**Build/CI**:
- Script `scripts/sync-prompts.ts` (Deno): lê `docs/conhecimento/prompts/templates/*.md`, valida frontmatter, calcula content_hash SHA-256, faz UPSERT em `prompt_versions` com `is_active=false` + `is_canary=false` por padrão
- GitHub Action `.github/workflows/prompts-sync.yml`: roda no merge para `main` apenas se path filter casa `docs/conhecimento/prompts/templates/**`; fail se algum frontmatter for inválido (Zod check do shape do frontmatter)
- Migration manual SQL (via Supabase Dashboard) para `is_active=true` na primeira deploy de cada call_type (canary path opcional)

**Edge Functions**:
- `_shared/ai-client.ts`: wrapper Deno + Anthropic SDK 0.52+ + zodOutputFormat helper. Implementa: query DB para versão ativa + canary % routing + circuit breaker (5/60s) + retry exponential 3x + cost calc + idempotency check + PII masking + prompt injection detection + ai_call_logs INSERT + GPT-4o-mini fallback (OpenAI SDK 4.104+)
- `_shared/prompt-loader.ts`: helper que recebe `call_type`, retorna `{ prompt_version_row, system_template, user_template, schema_version_required, model_id, max_tokens, temperature }` com fallback para canary versão se aplicável
- `_shared/audit-logger.ts`: helper para INSERT pseudonimizado em `ai_call_logs` (chama `maskPII()` antes)
- `_shared/pii-masker.ts`: regex PT-BR (CPF, CNPJ, email, tel, RG, endereço, data nasc) — extraído do reference 08
- `_shared/circuit-breaker.ts`: implementação simples in-memory (1 instância por isolate) — conhecida limitação documentada

**Templates (renome/refinamento — sem renaming de arquivo)**:
- Atualizar frontmatter dos 7 templates (01-07) com campos padronizados (ver §6.1 RF-PL-04)
- Adicionar `schema_version_required` em cada (`CV_SUMMARY_SCHEMA_VERSION`, `CV_JOB_MATCH_SCHEMA_VERSION`, etc)
- Atualizar `00-shared-zod-schemas.ts`: adicionar exports `*_SCHEMA_VERSION` por uso (ex: `export const CV_JOB_MATCH_SCHEMA_VERSION = "1.0.0"`)
- Não renomear arquivos com `-v1`: filename é "current"; histórico vive no git + DB

**Documentação**:
- `docs/conhecimento/prompts/CHANGELOG.md` — versionamento global cronológico (cada bump uma linha; SemVer + call_type + change_summary + author + commit)
- `docs/conhecimento/prompts/USAGE.md` — exemplo concreto de Edge Function consumindo (corrige README atual + complementa reference 08)
- `docs/conhecimento/prompts/RUNBOOK.md` — procedimentos: como criar nova versão, como fazer canary, como rollback, como rodar gold standard validation

**Admin UI** (mínimo para LGPD):
- `/admin/ai-logs` — tabela read-only de `ai_call_logs` filtrável por candidato_id, vaga_id, call_type, status — RLS apenas para `admin` role
- `/admin/prompt-versions` — listagem + diff entre versões + botão "promote canary" + botão "rollback" (chama RPC SECURITY DEFINER)
- `/admin/ai-costs` — agregação `ai_cost_daily` em gráficos (Recharts) por vaga, por call_type, por dia

**Gold standard validation tooling**:
- Notebook (`docs/validacao-gold-standard/notebook-template.md`) com queries SQL prontas: pegar 30 logs random, exportar JSON pseudonimizado, formato planilha para 2 raters humanos pontuarem cego
- Script `scripts/calculate-pearson.ts`: lê CSV exportado dos raters + JSON dos scores AI, calcula Pearson/Spearman/kappa/Disparate Impact

### 3.2 v2 (após validação) — estimativa +4-6 semanas

- **Vector DB para FAQ knowledge** (pgvector) — quando knowledge base passar de 50 docs (atual: ~30)
- **Anthropic 1h cache** (beta) — se vagas de alto volume justificarem (>20 cand/h sustentado)
- **Multi-provider routing** declarativo (yaml config: `if cost_per_call > X use Haiku else Sonnet`) — substituir hardcode no frontmatter
- **Prompt template inheritance** — base templates + extends para reduzir duplicação entre os 7 (atualmente cada um repete antibias rules)
- **A/B testing real (não só canary)** — duas versões active simultaneamente com split %, compara métricas
- **Auto-rollback** baseado em métricas (error rate >10% por 1h → SQL UPDATE automático)

### 3.3 v3 (futuro)

- Fine-tuning de modelo proprietário em logs (após >5000 candidatos com gold standard)
- LLM-based PII detection (Microsoft Presidio ou similar) substituindo regex PT-BR
- Multi-language prompts (espanhol/inglês para vagas internacionais)
- Skills externas no formato Anthropic Skills (quando estável fora de beta)
- Knowledge graph integration (Neo4j ou similar) para relacionar competências entre vagas

---

## 3b. Fora do Escopo

| Item | Por que fora | Quando reconsiderar |
|------|---------------|---------------------|
| **Vector DB para os prompts em si** | Prompts são <50 textos curtos, não exigem similarity search; filesystem + DB row é suficiente | Se prompts virarem >200 e devs precisarem buscar por similaridade |
| **Fine-tuning custom** | Pre-1000 candidatos avaliados é prematuro (PRD-Master §8.7 já lockou); custo de calibração + risco de overfitting > benefício | M3 ou após 5000 candidatos com gold standard estabilizado |
| **Multi-tenancy de prompts** | Beauty Smile é single-tenant; cada call_type tem 1 versão active globalmente | Se modelo de negócio pivotar para SaaS multi-clínica |
| **Editor de prompts in-app (admin UI WYSIWYG)** | Versionamento em git é mandatório por LGPD (audit + diff + blame); editor in-app fragmenta source-of-truth | Apenas como read-only viewer com diff (não edit) |
| **Suporte a múltiplos idiomas no MESMO call_type** | Beauty Smile opera só pt-BR; over-engineering para 1 cliente | Se expansão internacional for confirmada |
| **Streaming de outputs** | Os 7 usos retornam JSON estruturado (Zod), não texto livre — streaming não agrega valor; aumenta complexidade de validação | Se algum uso evoluir para texto longo conversacional (improvável neste M2) |
| **Real-time collaboration em prompts** | 1-2 devs editam prompts via PR — git resolve conflitos | Se equipe Tech crescer >5 e bottleneck em PR review |
| **Cache distribuído (Redis)** | Anthropic já oferece cache server-side; cache local em Edge Function isolate é suficiente | Se múltiplas regions forem ativadas (custo cross-region) |
| **Whisper transcript automático** | PRD-Master §8.7 lockou: paste manual de transcrição. Template 05 (`transcript-analysis`) consome texto colado | M3 se UAT mostrar bottleneck em RH digitar transcrição |
| **Telemetria realtime (Datadog/NewRelic)** | Postgres + Recharts admin UI cobre observabilidade necessária para volume M2 (<200 cand/vaga) | Volume >1000 cand/dia |

---

## 4. Personas

### Persona 1: Tech Lead (Fernando) — owner da prompt library
- **Responsabilidade**: bumpa versões via PR; revisa diff; aprova canary→active; investiga drift mensal
- **Frustração atual**: prompts em arquivos `.md` sem ferramenta para deploy controlado; mudar prompt = redeploy de Edge Function = 5min de downtime
- **Sucesso**: SQL UPDATE para promover/rollback em <60s; gold standard validation cronometrada com tooling pronto

### Persona 2: DPO Beauty Smile — guardião da compliance LGPD
- **Responsabilidade**: aprova RIPD; recebe alertas de cost/error/PII; assina relatório trimestral de gold standard
- **Frustração atual**: nenhum sistema produtivo permite responder "qual prompt avaliou candidato X em data Y" — auditoria reativa via grep em git é frágil
- **Sucesso**: dashboard `/admin/ai-logs` filtrável; explanation Art. 20 entregue em <2 cliques; relatório Pearson trimestral em PDF/email

### Persona 3: Sara (RH lead, persona 1 do PRD-MASTER) — gold standard rater
- **Responsabilidade**: avalia 30 candidatos pre-deploy + 50 trimestral em modo cego; assina inter-rater agreement com segundo rater
- **Frustração atual**: sem tooling para rating estruturado — abrir 30 abas e digitar score em planilha é doloroso
- **Sucesso**: notebook em `docs/validacao-gold-standard/` exporta planilha pronta com candidatos pseudonimizados, ela preenche scores BARS 1-5 + comentário, importa de volta

### Persona 4: Recrutador (Sara + 2 colegas) — consumidor read-only
- **Responsabilidade**: consulta `/admin/ai-logs` se candidato pedir explicação Art. 20; nunca edita prompts
- **Frustração atual**: hoje só Tech consegue extrair info; ela depende de pedir
- **Sucesso**: filtro por `candidato_id` em 3s, vê últimos 5-10 logs com `parsed_reasoning` legível

---

## 5. User Stories & Epic Hypotheses

### Épico 1: Versioning & Deploy

> **Hipótese**: Se permitirmos que devs façam bump SemVer via PR + um build script CI sincroniza com Postgres, então o tempo de deploy de uma mudança de prompt cai de 5min (redeploy Edge Function) para <2min (PR merge → CI sync → SQL promote canary), sem perda de auditoria.
>
> **Tiny act of discovery (Phase 0)**: bumpar `01-cv-summary` de 1.0.0 para 1.0.1 (PATCH = typo fix), medir tempo end-to-end PR-merge → ai_call_logs registra novo prompt_version_id. Aceitar se <120s.

**Stories**:
- US-PL-01: Como Tech Lead, ao mergear PR alterando `templates/02-cv-job-match.md`, quero CI Action recalcular content_hash e UPSERT em `prompt_versions` com `is_active=false`, para que eu valide manualmente antes de promover
- US-PL-02: Como Tech Lead, quero rodar `SELECT promote_to_canary('cv_job_match', '2.1.0', 10)` (RPC) e ver 10% do tráfego ir para v2.1.0, sem afetar o `is_active` v2.0.x
- US-PL-03: Como Tech Lead, quero rodar `SELECT promote_canary_to_active('cv_job_match', '2.1.0')` (RPC SECURITY DEFINER) e ter v2.0.x marcada `is_active=false`, `deprecated_at=NOW()` em mesma transação
- US-PL-04: Como Tech Lead, em emergência, quero rodar `SELECT rollback_to_version('cv_job_match', '2.0.5')` e ter v2.1.0 desativada + v2.0.5 reativada em <1s

### Épico 2: Runtime Consumption

> **Hipótese**: Se Edge Functions consultam DB (não filesystem) na primeira chamada por isolate (warm cache), então mudanças de prompt + canary % se propagam em <30s sem redeploy, e cache do isolate cobre 80% das chamadas em rajadas (Etapa 2 triagem).
>
> **Tiny act of discovery (Phase 1)**: instrumentar `_shared/prompt-loader.ts` com latência de query DB. Se p95 >50ms, considerar cache em isolate por 5min.

**Stories**:
- US-PL-05: Como Edge Function `analise-candidato-individual`, quando recebo trigger ON INSERT, quero query `prompt_versions WHERE call_type='cv_job_match' AND is_active=true` retornando 1 row em <50ms
- US-PL-06: Como Edge Function, quero ter probabilidade `canary_pct/100` de roteamento para versão canary se existir, e logar essa decisão em `ai_call_logs.prompt_version_id`
- US-PL-07: Como Edge Function, quero verificar na startup que `CODE_SCHEMA_VERSION` matches `prompt.schema_version_required`; se não bate, emitir alerta e fail-fast (não rodar com schema incompatível)
- US-PL-08: Como Edge Function, quando Anthropic call falha 5× em 60s, quero o circuit breaker abrir e a 6ª chamada ser direcionada para GPT-4o-mini com mesmo system+user+Zod, e logar `provider='openai'` + `error_code='anthropic_circuit_open'`

### Épico 3: Auditing & Compliance

> **Hipótese**: Se cada chamada IA registra prompt_version_id + content_hash + input_token_count + raw_response (com PII mascarada) + custo + retain_until em `ai_call_logs`, então qualquer auditoria LGPD Art. 20 pode ser respondida em <5min via dashboard, sem grep em logs.
>
> **Tiny act of discovery (Phase 1)**: rodar 10 chamadas em dev, gerar explanation via `generate_candidate_explanation()` SQL function, validar com DPO interno (RH lead) que texto é compreensível.

**Stories**:
- US-PL-09: Como DPO, quando candidato pede Art. 20 via email, quero abrir `/admin/ai-logs?candidato_id=X` e ver últimas 7 chamadas com `parsed_reasoning` legível
- US-PL-10: Como DPO, quero clicar em "Gerar explicação Art. 20" e o sistema chamar `generate_candidate_explanation()` (RPC) + entregar texto via portal/email + registrar `explanation_delivered_at` em `candidate_ai_decisions`
- US-PL-11: Como DPO, quero relatório trimestral autogerado: total candidatos avaliados, % gold standard validation OK, custo total, error rate por call_type, top 5 versões deprecated

### Épico 4: Cost & Quality Monitoring

> **Hipótese**: Se cron horário agrega `ai_cost_daily` + Postgres NOTIFY emite eventos quando thresholds violados + Edge Function `cost-alerter` envia email DPO, então anomalias (vaga spam, drift de modelo, error rate) são detectadas em <60min vs 24-48h hoje.

**Stories**:
- US-PL-12: Como DPO, quero receber email se vaga ultrapassa R$ 200 em IA no mês corrente
- US-PL-13: Como DPO, quero receber email se algum candidato individual ultrapassa R$ 1,00 (3× baseline R$ 0,38)
- US-PL-14: Como DPO, quero receber email se algum call_type tem error_rate >5% nas últimas 24h
- US-PL-15: Como DPO, quero receber email se alguma vaga recebe >500 candidatos em 7 dias (anti-spam)
- US-PL-16: Como Tech Lead, quero rodar gold standard mensal: script exporta 50 logs aleatórios pseudonimizados, formato planilha; após raters preencherem, script importa e calcula Pearson/Spearman/kappa/DI ratio; relatório PDF auto-gerado

---

## 6. Requisitos Funcionais

### 6.1 Versionamento

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|---------------------|------------|
| **RF-PL-01** | Cada template `.md` tem frontmatter padronizado | Frontmatter contém: `id`, `call_type`, `semver`, `content_hash`, `schema_version_required`, `model_id`, `fallback_model_id`, `temperature`, `max_tokens`, `change_summary`, `changed_by`, `created_at`, `estimated_cost_per_call`. Validado via Zod no CI script `sync-prompts.ts`. Se algum campo faltar OU `semver` não bater regex `^\d+\.\d+\.\d+$`, build falha. | Must |
| **RF-PL-02** | content_hash é SHA-256 de `system_template + user_template + JSON.stringify(frontmatter sem hash)` | Calculado no CI; armazenado em frontmatter (devs comitam `content_hash: tbd` e CI sobrescreve no merge). Conflito de hash entre versões com mesmo `semver` = build fail. | Must |
| **RF-PL-03** | SemVer semantics enforçadas | MAJOR (X.0.0): mudança de critério avaliativo OU de schema Zod (incompatível). MINOR (x.X.0): novos exemplos few-shot OU expansão de contexto. PATCH (x.x.X): typo, reformulação sem mudança semântica. Documentado em CHANGELOG.md por linha. | Must |
| **RF-PL-04** | Imutabilidade pós-publicação | Uma vez `prompt_versions` row tem `is_active=true` ou `deployed_at IS NOT NULL`, qualquer UPDATE de `system_template/user_template/content_hash` é bloqueado por trigger PL/pgSQL. Mudanças exigem nova row com novo SemVer. | Must |
| **RF-PL-05** | Schema Zod versionado independentemente | `00-shared-zod-schemas.ts` exporta `*_SCHEMA_VERSION` por uso (ex: `CV_JOB_MATCH_SCHEMA_VERSION = "1.0.0"`). Frontmatter de template referencia `schema_version_required`. Edge Function valida na startup que `import.SCHEMA_VERSION === prompt.schema_version_required`; se não bate, fail-fast com log estruturado. | Must |
| **RF-PL-06** | Retenção de versões antigas: forever-while-referenced | Cron mensal `prompt-versions-cleanup`: deleta rows de `prompt_versions WHERE deprecated_at < NOW - INTERVAL '1 year' AND id NOT IN (SELECT prompt_version_id FROM ai_call_logs UNION SELECT prompt_version_id FROM candidate_ai_decisions)`. Versões com referências ficam preservadas indefinidamente. | Must |

### 6.2 Build & Deploy

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|---------------------|------------|
| **RF-PL-07** | CI sync script `scripts/sync-prompts.ts` | Roda em GitHub Action no merge para `main` (path filter: `docs/conhecimento/prompts/templates/**`). Lê todos `*.md` em `templates/`, valida frontmatter, calcula content_hash, faz UPSERT em `prompt_versions` com `is_active=false`, `is_canary=false`. Idempotente (mesmo content_hash não duplica row). | Must |
| **RF-PL-08** | Promote canary via RPC | RPC `promote_to_canary(call_type, semver, canary_pct)` SECURITY DEFINER + grant apenas para role `admin`. Validações: versão existe, ainda não `deprecated_at`, `canary_pct` entre 1-50. Set `is_canary=true`, `canary_pct=N`, `deployed_at=NOW()`. | Must |
| **RF-PL-09** | Promote canary→active via RPC | RPC `promote_canary_to_active(call_type, semver)` em transação: (a) UPDATE old active → `is_active=false, deprecated_at=NOW()`; (b) UPDATE canary → `is_active=true, is_canary=false, canary_pct=0`. Constraint `unique_active_per_type` garante atomicidade. | Must |
| **RF-PL-10** | Rollback emergencial via RPC | RPC `rollback_to_version(call_type, semver)`: desativa current active, reativa target version. Pré-requisito: target version existe e `deprecated_at IS NOT NULL` mas <1y antiga. Grava em `data_deletion_log` (audit trail) com `triggered_by`. | Must |
| **RF-PL-11** | Sync script bloqueia conflito de SemVer | Se PR introduz `semver: 2.0.0` mas DB já tem `2.0.0` com hash diferente, build falha com mensagem clara: "Cannot publish semver 2.0.0 — existing row has different content_hash. Either bump SemVer or revert change.". | Must |

### 6.3 Runtime Consumption

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|---------------------|------------|
| **RF-PL-12** | `_shared/prompt-loader.ts` query active+canary | Função `loadPrompt(call_type)` retorna objeto `{ id, semver, system_template, user_template, model_id, temperature, max_tokens, schema_version_required }`. Se canary existe, retorna canary com probabilidade `canary_pct/100`, senão active. Latência p95 <50ms (medido com EXPLAIN). | Must |
| **RF-PL-13** | Schema version compat check na startup do isolate | `_shared/ai-client.ts` valida `CODE_SCHEMA_VERSION === prompt.schema_version_required` antes da primeira chamada. Mismatch = throw error + log structured + retorna 503 ao client. | Must |
| **RF-PL-14** | Anthropic prompt caching para system + (vaga + rubric) | Reference 08 já implementa: chunk 1 = system_template (`cache_control: ephemeral`); chunk 2 = vaga + critical_competencies + bars_rubric (`cache_control: ephemeral`); message user = CV ou input dinâmico (sem cache). TTL 5min default. | Must |
| **RF-PL-15** | Circuit breaker + GPT-4o-mini fallback | Implementado in-memory por isolate. THRESHOLD=5 falhas, RESET_MS=60000. Quando OPEN: próxima chamada usa OpenAI SDK + GPT-4o-mini com mesmo system+user (adapt para Chat Completions API + function calling para Zod). Log dual provider em `ai_call_logs`. Após 60s, half-open: 1 chamada teste; sucesso → CLOSED, falha → OPEN. | Must |
| **RF-PL-16** | Retry exponential backoff intra-Anthropic | Antes do circuit breaker abrir: 3 retries dentro da call (1s, 2s, 4s + jitter ±500ms). Apenas para 429/529/503/timeout. Cada retry incrementa `attempt_number` no log. | Must |
| **RF-PL-17** | Idempotency via `idempotency_key` | Body de POST aceita opcional `idempotency_key` (UUID v4 client-gen). Se key já existe em `ai_call_logs`, retorna resultado cacheado com header `X-Idempotent-Replay: true`. Útil para retry de client em timeout. | Must |
| **RF-PL-18** | Prompt injection detection antes de chamar API | Reference 08 já tem 8 patterns regex (`ignore previous instructions`, `[SYSTEM]`, etc). Se detectado, NÃO chama API; retorna score baixo + `flagged_for_human_review=true` + log com `error_code='prompt_injection_detected'`. Padrão revisto trimestralmente. | Must |

### 6.4 Logging & Audit

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|---------------------|------------|
| **RF-PL-19** | Toda chamada IA gera 1 row em `ai_call_logs` | Mesmo em erro (exceto 4xx de input inválido). Campos obrigatórios: `candidato_id, vaga_id, call_type, prompt_version_id, prompt_hash, provider, model_id, model_snapshot, system_prompt (template), user_prompt_template (mascarado), input_token_count, raw_response (jsonb), output_token_count, latency_ms, attempt_number, cost_usd, success, retain_until, triggered_by`. | Must |
| **RF-PL-20** | PII masking em `user_prompt_template` antes de salvar | Aplicar regex PT-BR (CPF, CNPJ, email, tel, RG, endereço, data nasc) substituindo por `[CPF]`, `[EMAIL]`, etc. Bias flags `has_demographic_proxy` flag em `BiasFlags` Zod indica se proxy persistiu. | Must |
| **RF-PL-21** | retain_until calculado por outcome | Se `parsed_reasoning.recommendation === "advance"` (candidato continua no funil), `retain_until = NOW + 5 anos` (e-Social/CLT). Se `reject` ou `hold`, `retain_until = NOW + 180 dias` (LGPD Art. 15 limitação de finalidade). | Must |
| **RF-PL-22** | Cron diário purga logs vencidos | pg_cron `ai-logs-retention-cleanup` às 02:00 UTC: DELETE `ai_call_logs WHERE retain_until < NOW AND id NOT IN (SELECT unnest(ai_call_log_ids) FROM candidate_ai_decisions WHERE status IN ('candidate_review_requested', 'human_reviewing'))`. | Must |
| **RF-PL-23** | Cron diário agrega `ai_cost_daily` ANTES de purga | pg_cron `ai-cost-aggregation` às 01:30 UTC: INSERT INTO ai_cost_daily SELECT DATE, vaga_id, call_type, provider, COUNT, SUM(tokens), SUM(cost) FROM ai_call_logs WHERE DATE = ontem GROUP BY ... ON CONFLICT DO UPDATE. Garante histórico de custo após retenção. | Must |
| **RF-PL-24** | Endpoint `generate_candidate_explanation()` Art. 20 | RPC PL/pgSQL agrega logs do candidato+vaga, formata texto markdown com header + score composto + breakdown por call_type + footer com direitos LGPD. Edge Function `lgpd-explicacao-candidato` chama RPC + INSERT `explanation_delivered_at` em `candidate_ai_decisions`. | Must |
| **RF-PL-25** | Direito de exclusão Art. 18 | RPC `delete_candidate_data(p_candidato_id)` SECURITY DEFINER: DELETE em ordem das FKs (`ai_call_logs` → `candidate_ai_decisions` → `applications` → `candidates`) + INSERT em `data_deletion_log` (sem candidato_id). Atomico. | Must |

### 6.5 Admin UI

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|---------------------|------------|
| **RF-PL-26** | `/admin/ai-logs` — table read-only | TanStack Table com colunas: `created_at`, `candidato_id`, `vaga_id`, `call_type`, `provider`, `model_id`, `prompt_version (semver)`, `success`, `parsed_score`, `cost_usd`, `latency_ms`. Filtros: candidato, vaga, call_type, status. Paginação 50 rows. Click row → modal com `parsed_reasoning` + raw_response. RLS: apenas `admin` role. | Must |
| **RF-PL-27** | `/admin/prompt-versions` — versioning panel | Lista de versões agrupada por `call_type`. Cada row mostra: semver, content_hash (truncado 8 chars), is_active/is_canary/canary_pct, deployed_at, deprecated_at. Botão "Promote to canary 10%" (chama RPC), "Promote to active" (chama RPC), "Rollback" (chama RPC com confirm dialog). Diff: clicar 2 versões mostra diff side-by-side do system_template + user_template. | Must |
| **RF-PL-28** | `/admin/ai-costs` — cost dashboard | Recharts: linha de custo diário 30d, bar chart top 10 vagas mais caras, pie chart por call_type. Tabela de `ai_cost_daily` paginada. Filtro por mês. | Should |
| **RF-PL-29** | RLS policies para admin tables | `ai_call_logs`, `prompt_versions`, `candidate_ai_decisions`, `ai_cost_daily`, `data_deletion_log`: SELECT apenas para `admin`/`rh` roles via JWT custom claim. INSERT/UPDATE/DELETE apenas via RPCs SECURITY DEFINER. Anon não tem acesso. | Must |

### 6.6 Cost Monitoring & Alerts

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|---------------------|------------|
| **RF-PL-30** | Edge Function `cost-alerter` | Triggered via Postgres LISTEN no canal `cost_anomaly`. Trigger PL/pgSQL após INSERT em `ai_cost_daily` emite NOTIFY se threshold violado. EF envia email via Supabase SMTP/Resend para DPO + RH lead. | Must |
| **RF-PL-31** | Thresholds de alerta | Vaga >R$ 200/mês → alert "vaga_cost_high". Candidato individual >R$ 1,00 (cumulativo `ai_call_logs.cost_usd` por candidato_id) → alert "candidate_cost_outlier". Error rate >5% por call_type/24h → alert "error_rate_high". Vaga >500 cand/7d → alert "spam_suspect". Cache hit rate <20% sustentado 7d → alert "cache_anomaly". | Must |
| **RF-PL-32** | Recruiter alert in-app | Trigger PL/pgSQL também INSERT em `recruiter_alerts` table → UI admin badge mostra unread count. | Should |

### 6.7 Bias Mitigation & Gold Standard

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|---------------------|------------|
| **RF-PL-33** | Pre-deploy gold standard validation | Antes de promover qualquer prompt v1.0.0 ou novo MAJOR a `is_active=true`: 30 candidatos reais (anonimizados) avaliados por 2 raters humanos calibrados (RH lead + segundo rater externo) em modo cego (sem ver score AI). Aceite: Pearson r ≥ 0.70, Spearman ρ ≥ 0.65, inter-rater κ ≥ 0.60, Disparate Impact Ratio ≥ 0.80 (4/5 rule por gênero/região). Se algum threshold violado, prompt fica em `is_canary=false, is_active=false` e PR review revisa. | Must |
| **RF-PL-34** | Validação trimestral em produção | Cron mensal exporta 50 logs aleatórios pseudonimizados em formato planilha. RH lead + segundo rater pontuam cego. Script `scripts/calculate-pearson.ts` calcula métricas. Relatório PDF emitido para DPO. Drift detectado (Pearson <0.65) = abrir investigação (modelo update? distribution shift? prompt drift?). | Must |
| **RF-PL-35** | Counterfactual testing PT-BR | Suite automatizada `tests/bias/counterfactual.test.ts` com 4 pares (Maria/João, Ana/Pedro, Carla/Bruno, Lúcia/Marcos) + 3 regiões (NE/SP/RS) marcadas em endereço/CEP. Roda em CI pre-merge. Score variance entre pares >10 pontos = test fail. | Must |
| **RF-PL-36** | Bias flags persistidos em raw_response | Schema Zod `BiasFlags` (já em `00-shared-zod-schemas.ts`): `has_demographic_proxy`, `has_regional_marker`, `has_disfluency_only`, `notes`. Templates 01-07 obrigam o LLM retornar flags como parte do output. Logs com qualquer flag=true marcados para review trimestral. | Must |
| **RF-PL-37** | Anti-bias rules em todos os system prompts | Templates 01-07 incluem section "Anti-bias (LGPD + Lei 9.029/95)" instruindo: ignorar nome/gênero/idade/raça/estado civil/religião/endereço; usar linguagem neutra; basear-se apenas em mérito (skills, experiência, citações textuais). Validação: PR diff-check obriga essa section presente; CI test grep. | Must |

---

## 7. Requisitos Não-Funcionais

| ID | RNF | Alvo |
|----|-----|------|
| **RNF-PL-01** | Latência query DB para versão ativa | p50 <20ms, p95 <50ms (índice `idx_prompt_versions_type_active`) |
| **RNF-PL-02** | Latência total Edge Function (call_type cv_summary) | p95 <8s (Haiku 4.5 + cache hit) |
| **RNF-PL-03** | Latência total Edge Function (call_type cv_job_match) | p95 <12s (Sonnet 4.6 + cache hit) |
| **RNF-PL-04** | Latência total Edge Function (call_type ranking) | p95 <15s (Sonnet 4.6 + N candidatos no input) |
| **RNF-PL-05** | Cache hit rate Anthropic | ≥30% mix (vagas hot ≥70%, vagas cold ~5%) |
| **RNF-PL-06** | Custo médio por candidato (até decisão final) | R$ 0,38 (esperado), ≤R$ 0,50 (RNF-10 do Master) |
| **RNF-PL-07** | Disponibilidade end-to-end | 99.5% (incluindo fallback GPT-4o-mini quando Anthropic down) |
| **RNF-PL-08** | RPO (Recovery Point Objective) | 0 — todos logs em Postgres com replicação Supabase native |
| **RNF-PL-09** | RTO (Recovery Time Objective) rollback de prompt | <60s desde decisão até primeiro tráfego em versão anterior |
| **RNF-PL-10** | Reproducibility Rate (KPI primário) | ≥99% mensal |
| **RNF-PL-11** | LGPD compliance | RIPD assinado, RIPD revisado anualmente, DPO nomeado, canal LGPD ativo |
| **RNF-PL-12** | Privacy by Design | PII mascarada antes de log; templates sem PII real; reproducibility com pseudonimização |
| **RNF-PL-13** | Segurança | RLS em todas tabelas; RPCs SECURITY DEFINER auditadas; circuit breaker contra DDoS provider |
| **RNF-PL-14** | Idempotência | 100% das chamadas com `idempotency_key` retornam mesmo resultado em retry |
| **RNF-PL-15** | Observability | Cost alerts <60min latency; gold standard report mensal; admin dashboard real-time |

---

## 8. Considerações Técnicas

### 8.1 Schema (delta sobre AUDITORIA §2)

A AUDITORIA já especifica o schema completo. Refinamentos deste PRD:

**Adicionar campo em `prompt_versions`** (não estava no AUDITORIA):
```sql
ALTER TABLE prompt_versions
  ADD COLUMN schema_version_required TEXT NOT NULL DEFAULT '1.0.0';

-- Constraint: schema_version_required deve estar registrado em known_schema_versions
CREATE TABLE known_schema_versions (
  schema_id    TEXT PRIMARY KEY,  -- ex: 'cv_job_match'
  version      TEXT NOT NULL,     -- ex: '1.0.0'
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schema_id, version)
);
```

**Trigger imutabilidade** (RF-PL-04):
```sql
CREATE OR REPLACE FUNCTION prevent_published_prompt_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.deployed_at IS NOT NULL THEN
    IF OLD.system_template != NEW.system_template
       OR OLD.user_template != NEW.user_template
       OR OLD.content_hash  != NEW.content_hash
       OR OLD.semver        != NEW.semver THEN
      RAISE EXCEPTION 'Prompt version % already deployed (deployed_at=%) — content is immutable. Create a new version.',
        OLD.semver, OLD.deployed_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prompt_versions_immutable
  BEFORE UPDATE ON prompt_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_published_prompt_edit();
```

**RPCs SECURITY DEFINER**:
```sql
CREATE OR REPLACE FUNCTION promote_to_canary(
  p_call_type llm_call_type,
  p_semver TEXT,
  p_canary_pct INTEGER DEFAULT 10
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  IF p_canary_pct < 1 OR p_canary_pct > 50 THEN
    RAISE EXCEPTION 'canary_pct must be between 1 and 50';
  END IF;
  UPDATE prompt_versions
  SET is_canary=true, canary_pct=p_canary_pct, deployed_at=COALESCE(deployed_at, NOW())
  WHERE call_type=p_call_type AND semver=p_semver AND deprecated_at IS NULL
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Version % for call_type % not found or deprecated', p_semver, p_call_type; END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION promote_canary_to_active(
  p_call_type llm_call_type,
  p_semver TEXT
) RETURNS UUID AS $$
DECLARE v_old_id UUID; v_new_id UUID;
BEGIN
  -- Atomic em transação
  SELECT id INTO v_old_id FROM prompt_versions
    WHERE call_type=p_call_type AND is_active=true AND is_canary=false;
  IF v_old_id IS NOT NULL THEN
    UPDATE prompt_versions SET is_active=false, deprecated_at=NOW()
      WHERE id=v_old_id;
  END IF;
  UPDATE prompt_versions
    SET is_active=true, is_canary=false, canary_pct=0
    WHERE call_type=p_call_type AND semver=p_semver
    RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rollback_to_version(
  p_call_type llm_call_type,
  p_semver TEXT
) RETURNS UUID AS $$
DECLARE v_target_id UUID;
BEGIN
  -- Validar target existe e <1y deprecated
  SELECT id INTO v_target_id FROM prompt_versions
    WHERE call_type=p_call_type AND semver=p_semver
      AND deprecated_at > NOW() - INTERVAL '1 year';
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Cannot rollback to %: not found or deprecated >1y', p_semver;
  END IF;
  -- Desativar current
  UPDATE prompt_versions SET is_active=false, deprecated_at=NOW()
    WHERE call_type=p_call_type AND is_active=true;
  -- Reativar target
  UPDATE prompt_versions SET is_active=true, deprecated_at=NULL WHERE id=v_target_id;
  -- Audit
  INSERT INTO data_deletion_log (deletion_type, deleted_at)
    VALUES ('prompt_rollback:' || p_call_type::TEXT || ':' || p_semver, NOW());
  RETURN v_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.2 Estrutura de arquivos (delta sobre PRD-Master §8.5)

Este PRD substitui a proposta anterior `_shared/prompts/*.ts` (que era hardcode). Nova estrutura:

```
docs/conhecimento/prompts/
├── README.md                         # Visão geral + onboarding
├── USAGE.md                          # NOVO — exemplo concreto de Edge Function consumindo
├── CHANGELOG.md                      # NOVO — versionamento global cronológico
├── RUNBOOK.md                        # NOVO — procedimentos de deploy/rollback/gold standard
├── PESQUISA-prompt-library-ats.md    # mantém
├── AUDITORIA-LGPD-LOGGING-VERSIONING.md # mantém
├── fontes/                           # mantém (5 arquivos)
└── templates/
    ├── 00-shared-zod-schemas.ts      # +exports *_SCHEMA_VERSION
    ├── 01-cv-summary.md              # frontmatter padronizado (sem rename)
    ├── 02-cv-job-match.md
    ├── 03-comparative-ranking.md
    ├── 04-interview-guide.md
    ├── 05-transcript-analysis.md
    ├── 06-culture-fit-essay.md
    ├── 07-work-sample-sjt.md
    └── 08-edge-function-reference.ts # mantém como reference (não importado)

scripts/
├── sync-prompts.ts                   # CI: sync FS → DB
├── calculate-pearson.ts              # gold standard: CSV raters → Pearson/Spearman/kappa/DI
└── export-gold-standard.ts           # gold standard: 30/50 logs random pseudonimizados → planilha

supabase/
├── functions/
│   ├── _shared/
│   │   ├── ai-client.ts              # NOVO (substitui o que estava em PRD-Master §8.5)
│   │   ├── prompt-loader.ts          # NOVO
│   │   ├── audit-logger.ts           # NOVO (já existia em §8.5, refinar)
│   │   ├── pii-masker.ts             # NOVO (extraído de reference 08)
│   │   ├── circuit-breaker.ts        # NOVO (extraído de reference 08)
│   │   └── injection-detector.ts     # NOVO (extraído de reference 08)
│   ├── analise-candidato-individual/index.ts  # consome _shared/ai-client + prompt-loader
│   ├── comparativo-candidatos/index.ts
│   ├── gerar-guia-entrevista/index.ts
│   ├── avaliar-redacao/index.ts
│   ├── avaliar-transcricao-entrevista/index.ts
│   ├── gerar-devolutiva-bigfive/index.ts       # NOVO v0.3 master
│   ├── consolidar-decisao-final/index.ts
│   ├── lgpd-explicacao-candidato/index.ts
│   └── cost-alerter/index.ts                   # NOVO neste PRD
└── migrations/
    ├── 20260601000010_prompt_library_schema.sql      # tabelas + enums + indexes
    ├── 20260601000011_prompt_library_rpcs.sql        # RPCs + triggers
    ├── 20260601000012_prompt_library_cron.sql        # pg_cron jobs
    └── 20260601000013_prompt_library_seed.sql        # seed v1.0.0 dos 7 prompts

src/features/admin/                    # NOVO
├── ai-logs/
│   ├── components/AILogsTable.tsx
│   ├── components/LogDetailModal.tsx
│   ├── hooks/useAILogs.ts
│   └── services/aiLogsService.ts
├── prompt-versions/
│   ├── components/PromptVersionsList.tsx
│   ├── components/PromptVersionDiff.tsx
│   ├── components/PromoteCanaryDialog.tsx
│   ├── components/RollbackDialog.tsx
│   └── services/promptVersionsService.ts
└── ai-costs/
    ├── components/CostDashboard.tsx
    ├── components/CostByVagaChart.tsx
    └── services/aiCostsService.ts
```

### 8.3 Fluxo runtime end-to-end (cv_job_match como exemplo)

```
1. DB trigger ON INSERT candidaturas → pgmq.send('ai_evaluation_queue', ...)
2. pg_cron worker invoca Edge Function `analise-candidato-individual`
3. EF: validate input (cv_text length, vaga exists)
4. EF: idempotency check (ai_call_logs WHERE idempotency_key=?)
5. EF: detect prompt injection in cv_text (regex)
6. EF: prompt-loader query DB →
   {id, semver: '2.1.0', system_template, user_template, schema_version_required: '1.0.0', model_id: 'claude-sonnet-4-6', ...}
7. EF: validate CODE_SCHEMA_VERSION === schema_version_required → fail-fast se não bate
8. EF: pii-masker.mask(cv_text)
9. EF: truncate (cv 12k chars, vaga 3k)
10. EF: circuit-breaker.canRequest() → if NO, enqueue retry, return 202
11. EF: anthropic.messages.parse({
       model: model_id,
       system: [
         {type: 'text', text: system_template, cache_control: {type:'ephemeral'}},
         {type: 'text', text: vaga + critical_competencies + bars_rubric, cache_control: {type:'ephemeral'}}
       ],
       messages: [{role:'user', content: '<CV>...</CV>...'}],
       output_config: {format: zodOutputFormat(CvJobMatchSchema)}
     })
12. EF: if 5xx ⇒ retry exp backoff 3x (1s, 2s, 4s + jitter); circuit-breaker.recordFailure()
13. EF: if circuit OPEN after 5 fails ⇒ openai.chat.completions.create({
       model: 'gpt-4o-mini',
       messages: [system, user],
       tools: [{type:'function', function: {name:'cv_job_match', parameters: zodToJsonSchema(CvJobMatchSchema)}}]
     }) — log provider='openai'
14. EF: parse + validate Zod
15. EF: calculate cost (Sonnet input + cached_read + output)
16. EF: maskPII(user_prompt_template) before save
17. EF: ai_call_logs INSERT (full row)
18. EF: if parsed.recommendation: aggregate em candidate_ai_decisions (separate logic)
19. EF: return {parsed, metadata: {prompt_version, cache_hit, cost_usd, latency_ms}}
20. Trigger AFTER INSERT em ai_call_logs (cost-alerter Edge Function via NOTIFY se threshold)
```

### 8.4 Decisões técnicas-chave (delta sobre PRD-Master §8.7)

| Decisão | Razão | Alternativa rejeitada |
|---------|-------|----------------------|
| **Híbrido git→DB para prompts** (vs FS-only OU DB-only) | Git-as-source-of-truth dá diff/blame/PR review LGPD-compliant; DB-as-runtime dá canary % + rollback SQL <60s sem redeploy | FS-only (perde canary); DB-only (perde diff/blame) |
| **SemVer + content_hash AMBOS no frontmatter** | SemVer é human-readable + comunica intent (MAJOR/MINOR/PATCH); hash é tamper-proof + identidade exata | OU SemVer (vulnerável a edit silent) OU hash (não comunica intent) |
| **schema_version_required como compat matrix** | Permite deploy assíncrono de Edge Function + prompt: prompt v2.1.0 (schema v2) coexiste com prompt v1.5.x (schema v1) durante transição | Embutir schema no content_hash (toda mudança de texto vira potencialmente breaking — mata MINOR/PATCH semântica) |
| **Forever-while-referenced retention** | LGPD Art. 20: enquanto candidato puder pedir explicação, prompt original existe + reproducible; só órfãs são purgadas | Fixed retention 1y/90d (perde reproducibility para aprovados com 5y retention) |
| **Haiku 4.5 só para CV summary** | Extração estruturada simples não exige raciocínio profundo; ~5× mais barato que Sonnet; medido em fontes/02 | Sonnet universal (+60% custo); Haiku universal (qualidade insuficiente em ranking comparativo) |
| **Anthropic ephemeral 5min** (vs 1h beta) | Vagas hot (Etapa 2 triagem) têm rajada em <5min; vagas cold pagam fresh sem premium 2× do 1h cache | 1h cache (premium 2× cache write penaliza vagas low-traffic); sem cache (custo +25-40%) |
| **GPT-4o-mini fallback só após circuit OPEN** | Cobre outage real Anthropic; não confunde 429 transient com degradação; preserva sinal de SRE | Fallback a cada falha (mascara hiccups e dobra custo de outliers); sem fallback (outage Anthropic >5min bloqueia funil) |
| **Postgres NOTIFY + Edge Function `cost-alerter` (vs Slack webhook)** | Sem 3rd-party deps; Beauty Smile não tem Slack centralizado; email DPO + recruiter_alerts table cobrem necessidades | Slack webhook (depende de config externa, secret rotation); só dashboard (passive — anomalia passa dias) |
| **Pre-deploy + trimestral + por novo MAJOR (gold standard)** | Pre-deploy gate evita deploy ruim; trimestral detecta drift sutil; MAJOR exige re-validation | Pre-deploy só (drift não-monitorado); multi-run + variance (custo 3× sem benefício marginal em temp=0) |
| **Filename sem version suffix** (ex: `01-cv-summary.md`, não `01-cv-summary-v1.md`) | Filename é "current"; histórico vive em git log + DB rows; renaming a cada bump cria churn em PR diffs | Filename suffix (duplica info, churn em renames, conflita com SemVer no frontmatter) |
| **Trigger PL/pgSQL para imutabilidade** (vs convenção apenas) | Defesa-em-profundidade: mesmo se admin UI bug ou SQL manual, trigger bloqueia | Convenção apenas (vulnerável a typo SQL ou bug UI) |

### 8.5 Diagrama: Fluxo Híbrido git→DB

```
DEV:
  PR alterando templates/02-cv-job-match.md
    │
    │ frontmatter.semver: 2.0.5 → 2.1.0
    │ change_summary: "Adicionado peso para Kafka"
    │ content_hash: tbd  ← deixa CI calcular
    ▼
GitHub Actions (path filter: docs/conhecimento/prompts/templates/**):
  ├─ deno check sync-prompts.ts
  ├─ scripts/sync-prompts.ts:
  │   ├─ ler templates/02-cv-job-match.md
  │   ├─ validar frontmatter Zod (RF-PL-01)
  │   ├─ calcular SHA-256 content_hash
  │   ├─ INSERT INTO prompt_versions (call_type, semver, content_hash, system, user,
  │   │     model_id, schema_version_required, max_tokens, temperature, change_summary, ...)
  │   │     ON CONFLICT (content_hash) DO NOTHING  -- idempotente
  │   └─ tests/bias/counterfactual.test.ts (RF-PL-35) — fail se variance >10
  └─ merge to main → row aparece com is_active=false, is_canary=false
    │
    ▼
TECH LEAD (manual via /admin/prompt-versions):
  click "Promote to canary 10%"
    │
    │ frontend chama RPC:
    │   SELECT promote_to_canary('cv_job_match', '2.1.0', 10)
    ▼
DB:
  prompt_versions WHERE semver='2.1.0' →
    is_canary=true, canary_pct=10, deployed_at=NOW()
    │
    ▼
EDGE FUNCTION (próxima invocação):
  prompt-loader.loadPrompt('cv_job_match'):
    ├─ query DB
    ├─ active row: v2.0.5 (90%)
    ├─ canary row: v2.1.0 (10%)
    └─ random < 0.10 ⇒ retorna canary
                else ⇒ retorna active
    ▼
24-48h DEPOIS (validação canary OK):
  click "Promote canary to active"
    │
    │ RPC: promote_canary_to_active('cv_job_match', '2.1.0')
    ▼
DB (em transação):
  v2.0.5: is_active=false, deprecated_at=NOW()
  v2.1.0: is_active=true, is_canary=false, canary_pct=0
    │
    ▼
EMERGÊNCIA — bias audit detecta violação 4/5 em v2.1.0:
  click "Rollback to v2.0.5"
    │
    │ RPC: rollback_to_version('cv_job_match', '2.0.5')
    ▼
DB (em transação, <60s):
  v2.1.0: is_active=false, deprecated_at=NOW()
  v2.0.5: is_active=true, deprecated_at=NULL
  data_deletion_log: 'prompt_rollback:cv_job_match:2.0.5'
    │
    ▼
PRÓXIMA EDGE FUNCTION INVOCAÇÃO usa v2.0.5
```

---

## 9. Riscos & Mitigações

| # | Risco | Prob. | Impacto | Mitigação | Owner |
|---|-------|-------|---------|-----------|-------|
| 1 | **CI sync script tem bug e marca todas versões is_active=false** | Baixa | Crítico | RPC requer `is_active=true` apenas via `promote_canary_to_active` (não pelo CI); CI só faz INSERT com defaults `false` | Tech Lead |
| 2 | **Trigger imutabilidade bloqueia rollback legítimo** | Baixa | Médio | Trigger só checa SE `deployed_at IS NOT NULL`; rollback usa UPDATE em campos `is_active/deprecated_at` que não estão na lista de imutáveis | Tech Lead |
| 3 | **Schema Zod muda mas dev esquece de bumpar `*_SCHEMA_VERSION`** | Média | Médio | Tests/CI validam `00-shared-zod-schemas.ts`: se schema muda (hash do export muda) mas `_SCHEMA_VERSION` não, build fail com mensagem clara | Tech Lead |
| 4 | **Canary % funciona mas sem amostragem suficiente em vagas low-traffic** | Média | Baixo | Cron diário verifica que canary tem ≥30 chamadas; se não, alerta para aumentar canary_pct ou aceitar mais tempo de canary | Tech Lead |
| 5 | **GPT-4o-mini fallback degrada qualidade em transcript analysis** | Média | Médio | Fallback só ativa em circuit OPEN (raro); log com `provider='openai'` permite filtrar essas decisões para review humano se DPO quiser | Tech Lead + DPO |
| 6 | **Cron retention purga logs de candidatos ainda em processo de Art. 20** | Baixa | Crítico | WHERE clause exclui logs referenciados em `candidate_ai_decisions WHERE status IN ('candidate_review_requested','human_reviewing')` (já implementado em RF-PL-22) | Tech Lead |
| 7 | **Postgres NOTIFY perdido se Edge Function `cost-alerter` está down** | Média | Baixo | NOTIFY é fire-and-forget; Edge Function tem trigger via cron horário também (idempotente — alerts duplicados deduplicados por chave time-bucket) | Tech Lead |
| 8 | **Gold standard validation 30 candidatos é amostra pequena (CI baixo)** | Média | Médio | 30 + raters duplos com kappa ≥ 0.60 dá CI 95% para Pearson r=0.70 ±0.15. Aceito como baseline; aumentar para 50+ na trimestral | DPO + Tech |
| 9 | **PII masking regex falha em CV não-padrão (ex: nome no header)** | Alta | Médio | Regex cobre ~85%; bias_flags.has_demographic_proxy pegado pelo LLM cobre o resto; quarterly audit manual de 100 logs | Tech + DPO |
| 10 | **Custo de gold standard humano (raters externos) escala com volume** | Média | Baixo | Trimestral fixo n=50 (não escala); orçamento ~R$ 500/trimestre por rater externo; aceitável | DPO |
| 11 | **Schema PROMPT_VERSIONS exige migration contra DB já em produção (Phase 0)** | Alta | Médio | Phase 0 do M2 é greenfield (sem dados em produção ainda) — migration roda em DB vazio; tests E2E em staging | Tech Lead |
| 12 | **Anthropic muda formato `usage.cache_read_input_tokens`** | Baixa | Baixo | Anthropic SDK garante backward compat; tests E2E verificam estrutura; alerta se field missing | Tech Lead |

---

## 10. Questões em Aberto

| # | Pergunta | Decisão necessária por | Bloqueia |
|---|----------|-------------------------|----------|
| 1 | Qual provedor de email DPO (Resend? Supabase SMTP nativo? AWS SES)? | Phase 0 task `cost-alerter` | RF-PL-30 |
| 2 | RH lead Beauty Smile aceita ser segundo rater no gold standard ou contratamos consultor externo? | Phase 0 (pre-deploy validation) | RF-PL-33 |
| 3 | Counterfactual testing: quais 4 pares de nomes PT-BR usar? Material da fonte 04 sugere mas não enumera definitivos. | Phase 0 task `tests/bias/counterfactual.test.ts` | RF-PL-35 |
| 4 | Endpoint `lgpd-explicacao-candidato` retorna texto via portal logado OU email automático ou ambos? | Phase 1 task | RF-PL-24 |
| 5 | Admin UI usa shadcn DataTable + TanStack Table, ou alternativa? CLAUDE.md cita shadcn — assumir sim. | Phase 1 frontend | RF-PL-26, 27, 28 |
| 6 | Cost alert email é em pt-BR ou en? Beauty Smile é pt-BR — assumir pt. | Phase 0 task `cost-alerter` | RF-PL-30 |
| 7 | Quanto tempo de canary mínimo antes de promover a active (24h? 48h? métricas-driven)? | Phase 1 RUNBOOK | RF-PL-09 |
| 8 | DPO oficial Beauty Smile já nomeado? Email de contato LGPD existe? | Antes de Phase 0 | RF-PL-30, RNF-PL-11 |
| 9 | Storage de raters externos (CSV no Drive? Notion? Supabase Storage)? | Phase 1 gold standard | RF-PL-33, 34 |
| 10 | Tooling de geração de planilha gold standard: pandas Python? TypeScript Deno? | Phase 1 tooling | RF-PL-34 |

---

## 11. Timeline & Fases

Encaixa-se em **Phase 0** + **Phase 1** do M2 (não cria fase nova).

### Phase 0 do M2 — Foundation (3-4 semanas, paralelo a outros mini-PRDs)

**Semana 1**: Database
- Migration: tabelas + enums + indexes (AUDITORIA §2 + delta §8.1)
- Migration: triggers imutabilidade + RPCs (`promote_to_canary`, `promote_canary_to_active`, `rollback_to_version`)
- Migration: pg_cron jobs (retention, aggregation, SLA HITL alert)
- Migration: pgmq queues
- Migration: seed v1.0.0 dos 7 prompts (read templates → calcular hash → INSERT inicial; primeira versão é deployed_at=NOW + is_active=true sem canary path)

**Semana 2**: Build/CI + Templates
- `scripts/sync-prompts.ts` + GitHub Action
- Frontmatter padronizado nos 7 templates (RF-PL-01)
- `00-shared-zod-schemas.ts` exports `*_SCHEMA_VERSION`
- CHANGELOG.md inicial + USAGE.md + RUNBOOK.md
- `tests/bias/counterfactual.test.ts` (após resolver Q-10.3)

**Semana 3**: Edge Function `_shared/`
- `_shared/ai-client.ts` + `prompt-loader.ts` + `audit-logger.ts` + `pii-masker.ts` + `circuit-breaker.ts` + `injection-detector.ts`
- Refactoring `08-edge-function-reference.ts` em modules consumíveis
- Edge Function `cost-alerter` (trigger NOTIFY + email)
- Tests E2E em staging com 1 Edge Function (sugestão: `analise-candidato-individual` mais isolada)

**Semana 4**: Validation + UAT
- Pre-deploy gold standard validation (n=30, RH lead + segundo rater, blind, Pearson/Spearman/kappa/DI)
- Counterfactual testing E2E
- Performance test: latência p95, cache hit rate
- Aprovação RIPD + RH

### Phase 1+ do M2 — Consumers (paralelo a Phase 0 features de funil)

- Demais Edge Functions (comparativo, gerar-guia, avaliar-redacao, avaliar-transcricao, gerar-devolutiva-bigfive, consolidar-decisao, lgpd-explicacao) consomem `_shared/` library
- Admin UI: `/admin/ai-logs`, `/admin/prompt-versions`, `/admin/ai-costs`
- Trimestral gold standard tooling: `scripts/calculate-pearson.ts`, `scripts/export-gold-standard.ts`
- DPO RIPD revision
- Documentation pass: USAGE.md amplifies

### Marcos

| Marco | Data alvo | Critério |
|-------|-----------|----------|
| **M0**: Schema + RPCs deployadas em staging | 2026-06-07 | Migration aplicada; smoke test rollback <60s OK |
| **M1**: CI sync funcionando | 2026-06-14 | PR de teste alterando `01-cv-summary.md` (PATCH) ⇒ row criada em <120s |
| **M2**: Primeira Edge Function consome library | 2026-06-21 | `analise-candidato-individual` em staging usa prompt-loader |
| **M3**: Gold standard pre-deploy passes | 2026-06-28 | Pearson r ≥0.70 em 30 casos pre-deploy |
| **M4**: Production deploy | 2026-07-05 | Todos 7 prompts active em prod; cost-alerter rodando; admin UI live |

---

## 12. Histórico de Mudanças

| Versão | Data | Mudança | Autor |
|--------|------|---------|-------|
| **v0.1** | 2026-05-10 | PRD inicial. 9 questões discovery resolvidas via AskUserQuestion. Lock: Híbrido git→DB; SemVer+hash+schema_version_required; forever-while-referenced; Haiku 4.5 só CV summary; Anthropic ephemeral 5min; Postgres NOTIFY+email DPO; gold standard pre-deploy+trimestral+MAJOR; circuit-breaker fallback GPT-4o-mini. Substitui §8.5 do PRD-MASTER (estrutura `_shared/prompts/*.ts` hardcoded) por estrutura modular `_shared/ai-client.ts + prompt-loader.ts + ...`. Adiciona campo `schema_version_required` ao schema da AUDITORIA + trigger imutabilidade + RPCs. Especifica admin UI mínima (`/admin/ai-logs`, `/admin/prompt-versions`, `/admin/ai-costs`). | Fernando |
