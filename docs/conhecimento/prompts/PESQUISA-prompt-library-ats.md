# PESQUISA — Library de Prompts de IA para ATS (7 Usos do Funil)

> Compilado em 2026-04-27 | Modo: Deep Research | Domínio: Prompt Engineering / LLM-as-Judge / HR Tech / LGPD
> 5 subagentes paralelos (Sonnet 4.6) | 60+ fontes consultadas | 12 papers acadêmicos 2024-2026 + 15 repos GitHub
> Stack: Supabase Edge Functions (Deno) + Anthropic Claude Sonnet 4.6 + OpenAI GPT-4o (fallback)
>
> Documentos relacionados:
> - [PESQUISA-regulacao-ai-hiring-hrtech.md](../../regulacao-ai-hiring-hrtech/PESQUISA-regulacao-ai-hiring-hrtech.md) — LGPD, EU AI Act, NYC Law 144
> - [PESQUISA-ai-hiring-assessment-hrtech.md](../../ai-hiring-assessment-hrtech/PESQUISA-ai-hiring-assessment-hrtech.md) — IA aplicada
> - [PESQUISA-sistema-avaliacao-candidatos-recrutamento.md](../PESQUISA-sistema-avaliacao-candidatos-recrutamento.md) — sistema overview
> - [templates/](./templates/) — 7 templates prontos + Zod schemas + Edge Function de referência

---

## ÍNDICE

1. [Resumo Executivo — 12 verdades que mudam o projeto](#1-resumo-executivo)
2. [Patterns Gerais de Prompt Engineering 2025-2026](#2-patterns-gerais)
3. [Mitigação de Bias em LLM-as-Judge](#3-bias-mitigation)
4. [Controle de Custo: Modelo + Caching + Fine-tuning](#4-controle-custo)
5. [Auditoria LGPD Art. 20 — Logging e Versionamento](#5-auditoria-lgpd)
6. [Library dos 7 Templates Prontos](#6-templates)
7. [Stack Recomendada e Estimativa de Custo](#7-stack)
8. [Gaps e Oportunidades](#8-gaps)
9. [Fontes Tieradas](#9-fontes)

---

<a id="1-resumo-executivo"></a>
## 1. RESUMO EXECUTIVO — 12 VERDADES QUE MUDAM O PROJETO

### Sobre prompt patterns

1. **Rubrica BARS 1-5 com descrição comportamental por nível supera escala numérica abstrata em 30% de correlação com humanos** (HuggingFace cookbook 2024). Isso é estrutural, não fine-tuning. Os 7 templates implementam BARS completo com âncoras descritivas em todas as dimensões críticas.

2. **CoT (Chain-of-Thought) explícito como campo SEPARADO antes do score melhora consistência em 10-15%, mas a ordem importa**: `reasoning` ANTES de `score`. Inverter polui. Padrão G-Eval (Liu et al. 2023) e EvalPlanner (2025).

3. **Pointwise com rubrica BARS é mais robusto que pairwise para scoring individual** (Pairwise or Pointwise? arXiv 2504.14716, abr/2025). Pairwise é 35% vulnerável a "distractor features"; pointwise apenas 9%. Para ATS onde candidatos podem "jogar" via verbosidade, pointwise vence. Pairwise APENAS na etapa de ranking final (Template 3).

4. **Temperature=0 + structured outputs com Zod é o padrão de produção** (Sharma 2025; Beatty et al. 2024). Determinismo e auditabilidade são requisitos LGPD, não otimização. Para variância controlada, usar ensemble (3 runs + média), não temperatura alta.

### Sobre LLM-as-Judge

5. **Claude Sonnet 4 é o LLM mais forte em 4/7 dimensões de SJT scoring** (arXiv 2507.13881, jul/2025). Para os 7 usos do ATS, Sonnet 4.6 vence GPT-4o em raciocínio nuançado. Usar Sonnet 4.6 nos 6 usos avaliativos; Haiku 4.5 apenas no Resumo CV (Uso 1).

6. **"Cite Before You Speak" é o pattern mais defensável tecnicamente para análise de transcrição** (Dokasto 2025). LLM extrai trecho LITERAL do transcript ANTES de julgar. Previne verbosity bias e permite auditoria por humano. Implementado em Templates 5, 6 e 7.

7. **Adicionar critérios de inclusão/exclusão por nível BARS melhora kappa em 0.08-0.21** vs descrição BARS simples (SJT paper 2025). Aplicado especificamente no Template 7 (Work Sample/SJT).

### Sobre bias mitigation (CRÍTICO PT-BR)

8. **Chain-of-Thought NÃO é garantia de fairness — gera MAIS bias que Direct Answer em scoring** (Justice or Prejudice? arXiv 2410.02736). Conflito interessante com #2: usar CoT estruturado como rationale (positivo) MAS auditar bias separadamente, não confiar em CoT como "auto-debiasing".

9. **GPT-4.1 infere gênero/raça em 100% dos casos mesmo com perguntas neutras** (DAIQ paper 2025). Anonimização de input é necessária mas NÃO suficiente. Combinar pré-processamento (remoção de PII) + instrução anti-bias no prompt + audit no output (counterfactual testing).

10. **PT-BR tem GAP DE PESQUISA crítico**: nenhum paper acadêmico testa bias de LLMs em nomes afro-brasileiros, indígenas, ou nordestinos. Whisper tem bias documentado por escolaridade e idade em PT-BR (Leal et al. COLING 2025) MAS sem WER quantitativo por região. **Validação interna obrigatória antes de produção**.

### Sobre custo e produção

11. **Prompt caching com vaga + rubric repetidos economiza 90% nos tokens de contexto** (Anthropic 5min/1h TTL). Para 1000 candidatos/vaga: $9 → $0.90 nos tokens cached. Estrutura obrigatória do system prompt: `[tools/schema] → [system: JD + BARS + cache_control] → [messages: CV]`. Total estimado: ~$90 por 1000 candidatos pelos 7 usos completos.

12. **LGPD Art. 20 não exige revisão humana (veto presidencial 2018) MAS exige explicação reproduzível** que o candidato pode solicitar em até 15 dias. Schema Postgres com `prompt_version_id`, `prompt_hash`, `parsed_reasoning` é o mínimo viável. ANPD Nota Técnica 12/2025 recomenda RIPD + Privacy by Design — design da library implementa ambos.

---

<a id="2-patterns-gerais"></a>
## 2. PATTERNS GERAIS DE PROMPT ENGINEERING 2025-2026

### 2.1 Few-shot vs Zero-shot

| Quando usar | Padrão |
|-------------|--------|
| **Zero-shot** (default) | Tarefa bem definida + rubric BARS rico + critérios objetivos |
| **Few-shot** (3-5 exemplos calibrados) | Tarefa com nuance qualitativa difícil de capturar em rubric texto |
| **Few-shot ensemble** (3 runs + média) | Decisões de alto impacto: Templates 5 (transcrição) e 7 (SJT) |

**Sweet spot:** 3-5 exemplos. Acima disso, risco de "anchoring" (modelo replica padrões dos exemplos sem generalizar).

### 2.2 Chain-of-Thought (CoT) — Quando funciona, quando polui

| Modo | Resultado | Uso recomendado |
|------|-----------|-----------------|
| **CoT explícito como CAMPO SEPARADO antes do score** (G-Eval) | +10-15% consistência | ✅ Padrão dos templates |
| **CoT inline no texto livre antes do JSON** | Pode poluir parsing | ❌ Evitar |
| **CoT com "think step by step" sem estrutura** | Inconsistente; pode AUMENTAR bias (Justice or Prejudice 2024) | ❌ Evitar |
| **EvalPlanner: plan + execute separados** | SOTA 2025, mas requer fine-tuning | Tier 3 — futuro |

**Implementação:** Schema Zod com campo `reasoning` ANTES de `score`/`recommendation`. Modelo é forçado a preencher na ordem.

### 2.3 Structured Outputs

**Anthropic vs OpenAI — comparação:**

| Aspecto | Anthropic (Sonnet 4.6) | OpenAI (GPT-4o) |
|---------|------------------------|-----------------|
| Implementação | Tool use + `messages.parse()` + `zodOutputFormat()` | `response_format.json_schema` strict + `chat.completions.parse()` + `zodResponseFormat()` |
| Robustez | Alta (depende do modelo seguir instruções) | Muito alta (rejeita tokens fora do schema no nível do modelo) |
| Refusals | Trata via `parsed_output: null` | Trata via `message.refusal` field — checagem obrigatória |
| Limitações Zod | Suporta nested, arrays, optional | `z.union()` com 3+ tipos, `z.discriminatedUnion()`, `z.record()` podem falhar |
| Streaming + JSON | Não suportado simultaneamente | Não suportado simultaneamente |

**Recomendação:** Anthropic + Zod via `zodOutputFormat` é o padrão dos templates. OpenAI como fallback usando `zodResponseFormat`.

### 2.4 Temperature

| Valor | Uso |
|-------|-----|
| **0** | Padrão para todos os usos avaliativos (Templates 2-7). Reproducibilidade + auditabilidade obrigatórias. |
| **0.1** | Apenas Template 4 (Geração de Guia de Entrevista) — leve criatividade para variar perguntas. |
| **0.25-0.5** | Beatty et al. 2024 sugerem para outros casos, mas **não para scoring de candidatos**. |
| **>0.5** | NUNCA para tarefas avaliativas. |

**IMPORTANTE:** Temperature=0 NÃO garante determinismo real (Schroeder & Wood-Doughty 2024 — Omega varia 0.17-1.0 entre runs). Para alto risco: rodar 3-5 vezes com seeds diferentes.

### 2.5 Pointwise vs Pairwise

| Modo | Onde usar nos 7 usos |
|------|---------------------|
| **Pointwise com rubric BARS** | Templates 1, 2, 5, 6, 7 — scoring individual |
| **Pairwise** (com double-eval invertido) | Template 3 — ranking de N candidatos |
| **Híbrido** | Template 3 — pointwise para scores individuais + pairwise APENAS para desempate (delta <5pts) |

---

<a id="3-bias-mitigation"></a>
## 3. MITIGAÇÃO DE BIAS EM LLM-AS-JUDGE

### 3.1 Os 4 vetores de bias relevantes

| Bias | Como mitigar | Onde no template |
|------|--------------|------------------|
| **Position bias** | Double evaluation com swap + média | Template 3 (ranking) |
| **Verbosity bias** | "Cite Before You Speak" + extrair trecho mínimo | Templates 5, 6, 7 |
| **Self-enhancement bias** | Não usar mesmo modelo que gerou output como juiz | Pipeline geral |
| **Diversity bias** (raça, gênero) | Pré-processamento PII + instrução anti-bias + audit counterfactual | Todos os templates |

### 3.2 Técnicas de prompt anti-bias (8 técnicas)

1. **Blind Scoring + Instrução Explícita** — Padrão em todos os system prompts
2. **Rubric Decomposição (Analítico)** — Holístico concentra mais bias; analítico separa
3. **Counterfactual Check Automatizado** — Pares de nomes (João/Caio Kauê, Ana/Iracema) com delta <0.5
4. **Self-Critique / Bias Reflection Loop** — Segundo prompt de auditoria pós-scoring
5. **Multi-Judge Ensemble** — Claude + GPT-4o em decisões finais
6. **Normalização de Transcrição** — Pipeline 2 etapas (Whisper → normalize → score)
7. **Ancoragem com Exemplos Calibrados** — BARS com exemplos diversos
8. **Tratamento Explícito de Sotaque** — Wording dedicado nos Templates 5, 6

### 3.3 PT-BR — gaps críticos

| Gap | Impacto | Mitigação |
|-----|---------|-----------|
| Sem dataset de bias para nomes afro-brasileiros/indígenas | Não sabemos magnitude do bias em LLMs comerciais para nomes BR | Counterfactual testing interno com pares calibrados |
| Whisper sem WER por região PT-BR | Sotaque NE/RS pode ter erro de transcrição alto que vira erro de scoring | Validação interna com gravações de candidatos de diferentes regiões |
| Bias por escolaridade na transcrição PT-BR (documentado) | Candidatos com menor escolaridade têm WER pior | Pipeline de normalização (Etapa 1) + flag em `bias_flags` |
| Bias por estilo de escrita PT-BR formal vs informal | Candidatos NE com escrita rebuscada podem ser penalizados | Style neutralization explícita no Template 6 |

### 3.4 O que é teatro

- ❌ "Só remover nome do CV" — LLM re-identifica por combinação de empregadores+cursos+localização
- ❌ Instrução genérica "seja justo" — GPT-4.1 infere raça em 100% mesmo assim
- ❌ Chain-of-Thought como garantia de fairness — gera MAIS bias que Direct Answer
- ❌ Temperature=0 como garantia de consistência — variabilidade existe (Omega 0.17-1.0)
- ❌ Auditoria única — humanos seguem IA biasada 90% das vezes (Brookings 2025)

### 3.5 O que funciona (evidência empírica)

| Técnica | Redução de bias mensurada |
|---------|---------------------------|
| Anonimização (nome + dados demográficos) | -56% viés gênero (Claude, Beatty 2024) |
| Rubric analítico decomposto | Melhora consistência + reduz viés (Kucia 2026) |
| Ensemble multi-model | Reduz self-preference bias |
| Normalização transcrição | Reduz penalização por sotaque |
| Counterfactual testing | Detecta bias (não elimina) |

---

<a id="4-controle-custo"></a>
## 4. CONTROLE DE CUSTO: MODELO + CACHING + FINE-TUNING

### 4.1 Recomendação de modelo por uso

| # | Uso | Modelo | Custo/candidato | Justificativa |
|---|-----|--------|-----------------|---------------|
| 1 | Resumo CV | **Haiku 4.5** | $0.0028 | Output estruturado simples |
| 2 | Match CV×Vaga | **Sonnet 4.6** | $0.0144 | Raciocínio nuançado, BARS rico |
| 3 | Comparativo N candidatos | **Sonnet 4.6** | $0.0165 | Síntese qualitativa |
| 4 | Guia entrevista | **Sonnet 4.6** | $0.0124 | Criatividade contextual |
| 5 | Análise transcrição | **Sonnet 4.6** | $0.0214 | Análise nuançada de evidências |
| 6 | Redação fit cultural | **Sonnet 4.6** | $0.0083 | Nuance qualitativa |
| 7 | Work Sample/SJT | **Sonnet 4.6** | $0.0129 | Sonnet 4 é melhor LLM em SJT (paper 2025) |
| **TOTAL** | | | **~$0.090/candidato** | Com cache hits |

**Para 1000 candidatos por vaga:** ~$90 com caching otimizado.
**Sem caching:** ~$130-140 (-32% economia com cache).

### 4.2 Prompt caching — ROI específico

**Anthropic — Mecanismo explícito:**

```typescript
system: [
  { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
  { type: "text", text: `Vaga: ${jd}\nRubric: ${bars}`, cache_control: { type: "ephemeral" } },
],
messages: [{ role: "user", content: `<CV>${cv}</CV>` }]
```

**Requisitos mínimos:**
- Sonnet 4.6: 2.048 tokens
- Haiku 4.5: 4.096 tokens
- Haiku 3.5: 2.048 tokens

**TTL options:**
- 5 min (default): ideal para batch processing
- 1h (2x custo de write): ideal para processamento assíncrono ao longo do dia

**OpenAI — Caching automático:**
- Funciona sem configuração; prefixo cacheado por ~1h
- Mínimo 1.024 tokens; ~50% desconto no input cached
- Vantagem: zero overhead. Desvantagem: menos controle.

### 4.3 Fine-tuning vs Prompt Engineering

**Decisão para o ATS: SEM fine-tuning em 2026.**

- Volume típico (100-500 candidatos/mês) não justifica overhead
- Caching reduz custo de repetir contexto a 10% do base
- Schema BARS rico via prompt é suficiente
- Anthropic não oferece fine-tuning público (Claude 4.x)

**Quando reconsiderar:** volume >50k req/mês com mesma tarefa, ou qualidade ainda não-aceitável após múltiplas iterações de prompt.

---

<a id="5-auditoria-lgpd"></a>
## 5. AUDITORIA LGPD ART. 20 — LOGGING E VERSIONAMENTO

### 5.1 Schema Postgres para logs (ai_call_logs)

Ver detalhes completos em [fontes/05-production-patterns-logging-versioning-lgpd.md](./fontes/05-production-patterns-logging-versioning-lgpd.md).

**Colunas obrigatórias:**
- `candidato_id`, `vaga_id`, `call_type`
- `prompt_version_id`, `prompt_hash` (SHA-256 do prompt SEM dados do candidato)
- `provider`, `model_id`, `model_snapshot`
- `system_prompt`, `user_prompt_template` (PSEUDONIMIZADO — sem PII real)
- `parsed_score`, `parsed_reasoning` (para Art. 20)
- `latency_ms`, `cost_usd`, `success`, `error_code`
- `idempotency_key` (UNIQUE) para webhook duplicados
- `retain_until` (90-180 dias rejeitados, 5 anos aprovados)

### 5.2 Versionamento de prompts (SemVer + Hash)

```
call_type: cv_job_match
semver:    2.1.0
hash:      sha256:a3f7b1c2...

MAJOR (2.x.x) → mudança de critério avaliativo (peso novo, dimensão nova)
MINOR (x.1.x) → novos exemplos few-shot, contexto expandido
PATCH (x.x.0) → typo, reformulação de frase
```

**Regra de ouro: imutabilidade.** Versão publicada nunca é editada. Mudança = nova versão com novo hash.

**Rollback (sub-60s):**
```sql
UPDATE prompt_versions SET is_active = false WHERE semver = '2.1.0' AND call_type = 'cv_job_match';
UPDATE prompt_versions SET is_active = true  WHERE semver = '2.0.3' AND call_type = 'cv_job_match';
```

### 5.3 Geração de explicação para o candidato (Art. 20)

```typescript
async function generateCandidateExplanation(candidatoId, vagaId): Promise<string> {
  const { data: logs } = await supabase
    .from("ai_call_logs")
    .select("call_type, parsed_score, parsed_reasoning, model_id, created_at")
    .eq("candidato_id", candidatoId)
    .eq("vaga_id", vagaId)
    .eq("success", true)
    .order("created_at");

  // Agrega reasonings dos 7 usos em texto humanizado
  // Inclui: data avaliação + score + reasoning + direito Art. 20
  return `## Explicação da Avaliação Automatizada\n\n...`;
}
```

### 5.4 Edge cases (10 patterns implementados na Edge Function de referência)

1. CV vazio (parsing falhou) → flag `cv_parsing_failed`
2. Contexto truncado (>12k chars) → trunca em sentence boundary
3. Rate limit 429 → SDK retry automático
4. Resposta JSON inválida → safeParse + retry
5. Refusal do LLM → não retry (determinístico), encaminha para humano
6. Prompt injection no CV → defesa em camadas + flag
7. Timeout Edge Function → AbortController + queue retry
8. Score outlier (=100) → força revisão humana
9. Webhook duplicado → idempotency_key UNIQUE
10. Fallback provider → Anthropic → OpenAI via circuit breaker

---

<a id="6-templates"></a>
## 6. LIBRARY DOS 7 TEMPLATES PRONTOS

Cada template em arquivo `.md` separado em [templates/](./templates/) com:
- Frontmatter (semver, model, temperature, change_summary, custo estimado)
- System prompt completo (anti-bias + CoT + BARS)
- User message template
- Schema Zod (referência a `00-shared-zod-schemas.ts`)
- Edge cases tratados
- Exemplo de output
- Checklist de QA

| # | Template | Modelo | Custo/call | Cache | Arquivo |
|---|----------|--------|------------|-------|---------|
| 0 | Schemas Zod compartilhados | — | — | — | [00-shared-zod-schemas.ts](./templates/00-shared-zod-schemas.ts) |
| 1 | Resumo de CV | Haiku 4.5 | $0.0028 | ❌ | [01-cv-summary.md](./templates/01-cv-summary.md) |
| 2 | Match CV × Vaga | Sonnet 4.6 | $0.0144 | ✅ | [02-cv-job-match.md](./templates/02-cv-job-match.md) |
| 3 | Comparativo N candidatos | Sonnet 4.6 | $0.0165 | ❌ | [03-comparative-ranking.md](./templates/03-comparative-ranking.md) |
| 4 | Guia entrevista | Sonnet 4.6 | $0.0124 | ✅ | [04-interview-guide.md](./templates/04-interview-guide.md) |
| 5 | Análise transcrição | Sonnet 4.6 | $0.0214 | ✅ | [05-transcript-analysis.md](./templates/05-transcript-analysis.md) |
| 6 | Redação fit cultural | Sonnet 4.6 | $0.0083 | ✅ | [06-culture-fit-essay.md](./templates/06-culture-fit-essay.md) |
| 7 | Work Sample / SJT | Sonnet 4.6 | $0.0129 | ✅ | [07-work-sample-sjt.md](./templates/07-work-sample-sjt.md) |
| 8 | Edge Function de referência | — | — | — | [08-edge-function-reference.ts](./templates/08-edge-function-reference.ts) |

**Padrões aplicados em todos os templates:**
- Output JSON estrito via Zod (zodOutputFormat / zodResponseFormat)
- CoT obrigatório: campo `reasoning` ANTES de `score`
- BARS rubric 1-5 com âncoras descritivas comportamentais
- "Cite Before You Speak" em Templates 5, 6, 7
- Anti-bias: instrução explícita + audit no output (`bias_flags`/`bias_audit`)
- Insufficient evidence como opção (não chutar)
- Defesa contra prompt injection no input
- Cache structure otimizada (system + JD + rubric estável; CV/resposta variável)

---

<a id="7-stack"></a>
## 7. STACK RECOMENDADA E ESTIMATIVA DE CUSTO

### 7.1 Stack final

| Componente | Solução |
|------------|---------|
| Provider primário | Anthropic Claude (Sonnet 4.6 + Haiku 4.5) |
| Provider fallback | OpenAI GPT-4o + GPT-4o-mini |
| SDK | `npm:@anthropic-ai/sdk@0.52` + `npm:openai@4.104` (Deno) |
| Schema validation | Zod 3.22+ via `zodOutputFormat` / `zodResponseFormat` |
| Edge Functions | Supabase Edge Functions (Deno runtime, 150s timeout free / 400s pro) |
| Database | Supabase Postgres + pgmq + pg_cron + pgcrypto |
| Logging | Tabela `ai_call_logs` (PII-pseudonimizada) + retention via pg_cron |
| Versionamento | Tabela `prompt_versions` (SemVer + content_hash + is_active/is_canary) |
| Queue | pgmq (`ai_evaluation_queue` + `ai_evaluation_retry`) |
| Cost monitoring | Tabela `ai_cost_daily` (agregação noturna via pg_cron) |
| HITL workflow | Tabela `candidate_ai_decisions` + `request_human_review()` SQL function |
| PII detection | Regex Deno (~85% casos BR) — Microsoft Presidio para escala >10k/mês |
| Bias audit | Counterfactual testing manual + LangFair em produção |

### 7.2 Estimativa de custo (1000 candidatos/vaga)

| Cenário | Custo |
|---------|-------|
| **Anthropic com caching otimizado (recomendado)** | **~$90** |
| Anthropic sem caching | ~$135 |
| OpenAI com caching automático | ~$60-70 (input mais barato) |
| Híbrido (Sonnet em scoring, Haiku/GPT-4o-mini em parse) | ~$70-80 |

**Premissas:**
- Vaga + rubric BARS = 3.000 tokens (cacheados)
- CV médio = 800 tokens
- Output médio por uso = 400-800 tokens
- Batch dentro de 5 min (TTL Anthropic) ou TTL 1h para assíncrono

### 7.3 Volume e custo mensal estimado

| Volume | Custo/mês (Anthropic + cache) |
|--------|-------------------------------|
| 100 candidatos/mês (PME) | ~$9 |
| 500 candidatos/mês (médio) | ~$45 |
| 2.000 candidatos/mês (alto volume) | ~$180 |
| 10.000 candidatos/mês | ~$900 |

---

<a id="8-gaps"></a>
## 8. GAPS E OPORTUNIDADES

### 8.1 Gaps técnicos (ordenados por impacto)

1. **PT-BR bias em LLMs é gap crítico de pesquisa** — necessária validação interna com counterfactual testing (pares de nomes BR diversos) ANTES do deploy em produção. Estimar 1-2 semanas de trabalho de QA.

2. **Whisper WER por região PT-BR não documentado** — gravar amostras de candidatos de NE/SP/RS/Sul e medir WER comparativo antes de produção. Pipeline de normalização (Etapa 1 do Template 5) mitiga parcialmente.

3. **Prompt injection sofisticada** — regex detecta ~80% dos casos óbvios; ataques sofisticados precisam de classificador ML treinado. Para volume de ATS próprio, regex + system defense + audit no score (=100 = anomalia) é suficiente.

4. **PII Detection em Deno sem biblioteca matura** — Microsoft Presidio é Python-only. Para escala >10k candidatos/mês, considerar microserviço Python dedicado ou LLM-based PII detection (custo extra).

5. **Anthropic Structured Outputs em beta** — Zod com `safeParse` como fallback obrigatório. OpenAI strict mode é mais rigoroso ao nível do modelo.

6. **Nenhum benchmark público de HR/PT-BR** — você precisará criar ground truth com 30-100 candidatos reais avaliados por humanos (raters calibrados) e medir Pearson/Spearman vs LLM antes de produção.

### 8.2 Gaps regulatórios

1. **ANPD Nota Técnica 12/2025 não-vinculante** — design segue recomendações; ajuste fino quando regulamentação definitiva sair (esperada em 2026-2027).

2. **PL 2.338/23 (Marco BR de IA) em tramitação** — incluirá hiring como high-risk similar ao EU AI Act. Acompanhar para adaptação.

3. **Sem SLA de revisão humana implementado** — schema captura `review_requested_at` mas precisa de cron job que alerta recrutadores se >5 dias úteis. Implementar como Phase 2.

### 8.3 Oportunidades futuras (Tier 3)

1. **EvalPlanner pattern** (planning + execution separados) — SOTA 2025; requer fine-tuning. Considerar quando volume justificar.

2. **Prometheus 2 como juiz open-source auditável** — alternativa local self-hosted ao Claude/GPT-4o; requer infra própria. Considerar para soberania de dados ou compliance estrito.

3. **Specialização de modelos por dimensão** (paper SJT 2025) — diferentes modelos para diferentes competências. Overhead operacional alto, mas pode melhorar Pearson em 0.05-0.10.

4. **A/B testing automatizado de prompts em produção** — schema captura `is_canary` e `canary_pct`, mas falta job que compara distribuição de scores e promove/reverte automaticamente.

5. **Whisper fine-tuned para PT-BR multi-regional** — projeto interno se WER for alto após validação. Alternativa: Sabiá-2 (que mostra menos sensibilidade dialetal segundo paper 2024).

---

<a id="9-fontes"></a>
## 9. FONTES TIERADAS

### Tier 1 — Essenciais (ler antes de implementar)

1. [Pairwise or Pointwise? — arXiv 2504.14716 (abr/2025)](https://arxiv.org/abs/2504.14716) — base para escolha pointwise no ATS
2. [HuggingFace LLM-as-Judge Cookbook (2024)](https://huggingface.co/learn/cookbook/en/llm_judge) — BARS rubric melhora 30% vs escala numérica
3. [Anthropic — Demystifying Evals (2025)](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) — "way out" / insufficient evidence
4. [SJT Open-Response LLM Scoring — arXiv 2507.13881 (jul/2025)](https://arxiv.org/html/2507.13881) — inclusion/exclusion criteria + Sonnet 4 best
5. [Dokasto — "Cite Before You Speak" (2025)](https://dokasto.com/blog/we-are-letting-llms-decide/) — pattern para Templates 5, 6, 7
6. [Anthropic Prompt Caching Docs](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching) — implementação exata
7. [ANPD Nota Técnica 12/2025](https://lefosse.com/noticias/inteligencia-artificial-anpd-publica-nota-tecnica-sobre-decisoes-automatizadas/) — LGPD Art. 20 compliance
8. [Wilson & Caliskan UW 2024 (arXiv 2407.20371)](https://arxiv.org/abs/2407.20371) — bias em embeddings de CVs

### Tier 2 — Aprofundamento

9. [Justice or Prejudice? CALM Framework (arXiv 2410.02736)](https://arxiv.org/html/2410.02736v1) — 12 tipos de bias em LLM-as-judge
10. [G-Eval (arXiv 2303.16634)](https://arxiv.org/pdf/2303.16634) — CoT + log-prob weighting
11. [Prometheus 2 (ACL 2024)](https://arxiv.org/html/2405.01535v2) — rubric 1-5 com âncoras descritivas
12. [Survey on LLM-as-a-Judge (arXiv 2411.15594)](https://arxiv.org/html/2411.15594v6) — mapeamento de 200+ papers
13. [Eightfold Anzenberg 2025 (arXiv 2507.02087)](https://arxiv.org/html/2507.02087v1) — Impact Ratio LLMs vs ML
14. [PNAS Nexus An et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11937954/) — bias interseccional
15. [Brookings AI Hiring Threat to Autonomy (nov/2025)](https://www.brookings.edu/articles/ais-threat-to-individual-autonomy-in-hiring-decisions/) — humanos seguem IA biasada
16. [interviewstreet/hiring-agent (GitHub, 141 stars)](https://github.com/interviewstreet/hiring-agent) — único repo com rubric ATS production
17. [prometheus-eval/prometheus-eval (GitHub, 1.1k stars)](https://github.com/prometheus-eval/prometheus-eval) — framework LLM-as-judge
18. [promptfoo (GitHub, 20.6k stars)](https://github.com/promptfoo/promptfoo) — eval framework production
19. [MuPe Life Stories Dataset (COLING 2025)](https://aclanthology.org/2025.coling-main.407/) — ASR bias PT-BR
20. [Invisible Filters (arXiv 2508.16673)](https://arxiv.org/html/2508.16673v1) — bias por estilo linguístico

### Tier 3 — Referência

21. [Schroeder & Wood-Doughty (arXiv 2412.12509)](https://arxiv.org/abs/2412.12509) — temperature=0 não garante determinismo
22. [DAIQ Demographic Inference (arXiv 2508.15830)](https://arxiv.org/html/2508.15830v1) — GPT-4.1 infere raça em 100%
23. [De-Anonymization Ko 2026 (arXiv 2603.18382)](https://arxiv.org/abs/2603.18382) — anonimização não basta
24. [No Thoughts Just AI (arXiv 2509.04404)](https://arxiv.org/html/2509.04404v1) — humanos seguem IA biasada
25. [Beatty Hidden Bias (arXiv 2410.16927)](https://arxiv.org/html/2410.16927v1) — anonimização -56% bias gênero
26. [Bonil et al. — Racial Biases Portuguese LLMs (arXiv 2509.02834)](https://arxiv.org/html/2509.02834v1)
27. [Dialectal Profiling PT-BR LLMs (arXiv 2410.10991)](https://arxiv.org/html/2410.10991)
28. [LLMCert-B Counterfactual Bias (arXiv 2405.18780)](https://arxiv.org/abs/2405.18780)
29. [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
30. [Resume-Based Prompt Injections HR AI (RecSysHR 2025)](https://recsyshr.aau.dk/wp-content/uploads/2025/09/RecSysHR2025-paper_9.pdf)
31. [LangFair CVS Health](https://medium.com/cvs-health-tech-blog/how-to-assess-your-llm-use-case-for-bias-and-fairness-with-langfair-7be89c0c4fab)
32. [Sharma — Skill-Aware Interview Scoring (Medium 2025)](https://medium.com/@raghavsharma6002/designing-an-automated-skill-aware-interview-scoring-system-using-llms-7f7fa2ed4d66)
33. [Microsoft Presidio (PII Anonymizer)](https://github.com/microsoft/presidio)
34. [confident-ai/deepeval (15k stars)](https://github.com/confident-ai/deepeval)
35. [jxnl/instructor (12.8k stars)](https://github.com/jxnl/instructor)
36. [llmkit-ai/llmkit (119 stars — prompt versioning)](https://github.com/llmkit-ai/llmkit)
37. [sliday/resume-job-matcher (266 stars)](https://github.com/sliday/resume-job-matcher)
38. [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
39. [Supabase pgmq](https://supabase.com/docs/guides/queues/pgmq)
40. [Supabase pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron)

---

## ANEXOS

- [fontes/01-web-best-practices-llm-as-judge.md](./fontes/01-web-best-practices-llm-as-judge.md) — síntese subagente 1
- [fontes/02-anthropic-vs-openai-structured-outputs-caching.md](./fontes/02-anthropic-vs-openai-structured-outputs-caching.md) — comparação técnica
- [fontes/03-github-repos-ats-prompts-schemas.md](./fontes/03-github-repos-ats-prompts-schemas.md) — 15 repos rankeados
- [fontes/04-bias-mitigation-llm-judge-academic.md](./fontes/04-bias-mitigation-llm-judge-academic.md) — 12 papers + técnicas anti-bias
- [fontes/05-production-patterns-logging-versioning-lgpd.md](./fontes/05-production-patterns-logging-versioning-lgpd.md) — schema Postgres + edge cases

---

> **Próximos passos sugeridos:**
> 1. Implementar tabelas `ai_call_logs`, `prompt_versions`, `candidate_ai_decisions` no Supabase
> 2. Deploy de Edge Function de referência ([08-edge-function-reference.ts](./templates/08-edge-function-reference.ts)) ajustando para Uso 2 (Match)
> 3. Validação interna com 30-100 candidatos reais (counterfactual testing PT-BR)
> 4. Bench de WER do Whisper por região antes de Template 5 (transcrição)
> 5. RIPD (Avaliação de Impacto LGPD) documentado antes de produção
