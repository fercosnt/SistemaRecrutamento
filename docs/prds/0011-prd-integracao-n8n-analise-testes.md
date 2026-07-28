# PRD-DEV-011: Integração N8N para Análise de Testes

## 1. Introduction/Overview

The Integração N8N para Análise de Testes establishes automated workflows that receive psychometric test results from the frontend, process them through Claude AI for advanced personality and behavioral analysis, and return structured insights to be displayed in the HR dashboard. This integration is the intelligence layer that transforms raw scores into actionable hiring recommendations.

**Problem it solves:** HR receives numerical test scores but lacks expertise to interpret complex psychological data. Manual interpretation is inconsistent, time-consuming, and requires specialized training. N8N workflows with Claude AI provide instant, consistent, expert-level analysis of every candidate.

**Goal:** Implement N8N webhook endpoints that receive test completion events, trigger Claude AI analysis workflows, generate personality profiles and role-fit assessments, and store results back in Supabase for HR visualization—all automatically within minutes of test completion.

## 2. Goals

1. Create N8N webhook endpoints for each test type (Big Five, DISC, Raven)
2. Trigger workflows automatically when candidates complete tests
3. Fetch candidate data and test results from Supabase within workflows
4. Send structured prompts to Claude 3.5 Sonnet for AI analysis
5. Parse AI responses into structured JSON for database storage
6. Generate personality profiles, behavioral insights, and cognitive assessments
7. Calculate role-fit match scores based on test results + job requirements
8. Store AI analysis in `analise_ia` table linked to candidates
9. Send email notifications to HR when high-match candidates complete tests
10. Handle errors gracefully with retry logic and logging

## 3. User Stories

### Primary Flow - Automation
**As a** candidate completing the Big Five test
**When** I submit my responses
**Then** N8N receives a webhook, analyzes my personality with AI, and stores the profile—all without manual intervention

**As an** HR professional
**I want** AI analysis to complete within 5 minutes of test submission
**So that** I can review candidate profiles immediately

**As an** HR manager
**I want** to receive email alerts when high-match candidates (≥85% fit) complete tests
**So that** I can fast-track top talent

### Secondary Flow - Quality & Reliability
**As a** system administrator
**I want** N8N workflows to log all executions with success/failure status
**So that** I can monitor integration health and debug issues

**As an** HR professional
**I want** consistent AI analysis quality across all candidates
**So that** comparisons are fair and unbiased

**As a** developer
**I want** webhook payloads to be validated before processing
**So that** malformed requests don't crash workflows

## 4. Functional Requirements

### FR-001: N8N Webhooks Setup
Create 3 primary webhooks in N8N:

**1. Big Five Test Completed:**
- URL: `https://fernandocosta.app.n8n.cloud/webhook/big-five-completo`
- Method: POST
- Trigger: Called from frontend after test submission

**2. DISC Test Completed:**
- URL: `https://fernandocosta.app.n8n.cloud/webhook/disc-completo`
- Method: POST
- Trigger: Called from frontend after test submission

**3. Raven Test Completed:**
- URL: `https://fernandocosta.app.n8n.cloud/webhook/raven-completo`
- Method: POST
- Trigger: Called from frontend after test submission

**Webhook Payload Example (Big Five):**
```json
{
  "candidato_id": "uuid-123-456",
  "resultado_id": "uuid-789-abc",
  "pontuacoes": {
    "abertura": 75,
    "conscienciosidade": 68,
    "extroversao": 82,
    "amabilidade": 71,
    "neuroticismo": 34
  },
  "data_conclusao": "2025-01-15T14:32:00Z"
}
```

### FR-002: Workflow Architecture
Each workflow follows this structure:

**Nodes:**
1. **Webhook Trigger** - Receives POST request
2. **Validate Payload** - Check required fields exist
3. **Fetch Candidate Data** - Query Supabase for full candidate profile
4. **Fetch Test Results** - Get detailed test data (all responses if needed)
5. **Fetch Job Requirements** - Get vaga requirements if candidate applied
6. **Prepare AI Prompt** - Build structured prompt for Claude
7. **Call Claude AI** - HTTP request to Claude API
8. **Parse AI Response** - Extract structured data from AI text
9. **Store Analysis** - Insert into `analise_ia` table
10. **Send Notifications** - Email HR if match ≥85%
11. **Error Handler** - Log failures, retry if transient error

**Flow Diagram:**
```
Webhook → Validate → Fetch Data → Build Prompt → Claude AI
                ↓                                      ↓
            Error Log                          Parse Response
                                                       ↓
                                                Store Analysis
                                                       ↓
                                              Send Notifications
```

### FR-003: Claude AI Prompts
**Big Five Analysis Prompt:**
```
Você é um psicólogo organizacional especialista em avaliação de personalidade.

Analise o seguinte perfil Big Five de um candidato:

Candidato: {{ $node["Fetch Candidate"].json.nome_completo }}
Vaga: {{ $node["Fetch Job"].json.titulo }}

Pontuações Big Five (0-100):
- Abertura a Experiências: {{ $node["Webhook"].json.pontuacoes.abertura }}
- Conscienciosidade: {{ $node["Webhook"].json.pontuacoes.conscienciosidade }}
- Extroversão: {{ $node["Webhook"].json.pontuacoes.extroversao }}
- Amabilidade: {{ $node["Webhook"].json.pontuacoes.amabilidade }}
- Neuroticismo: {{ $node["Webhook"].json.pontuacoes.neuroticismo }}

Requisitos da Vaga:
{{ $node["Fetch Job"].json.requisitos_personalidade }}

Forneça uma análise estruturada em JSON com os seguintes campos:

{
  "resumo_perfil": "Descrição breve do perfil de personalidade (2-3 frases)",
  "pontos_fortes": ["Lista de 3-5 pontos fortes baseados nas pontuações"],
  "areas_desenvolvimento": ["Lista de 2-3 áreas para desenvolvimento"],
  "fit_cultural": "Avaliação de fit cultural (1-2 frases)",
  "fit_funcao": {
    "score": 85,
    "justificativa": "Explicação do score de fit (2-3 frases)"
  },
  "recomendacoes_onboarding": ["Lista de 2-3 recomendações para integração"],
  "risco_turnover": "baixo|médio|alto",
  "probabilidade_sucesso": 85
}
```

**DISC Analysis Prompt:**
```
Você é um especialista em avaliação comportamental DISC.

Analise o perfil DISC do candidato:

Candidato: {{ $node["Fetch Candidate"].json.nome_completo }}
Vaga: {{ $node["Fetch Job"].json.titulo }}

Pontuações DISC (0-100):
- D (Dominância): {{ $node["Webhook"].json.pontuacoes.D }}
- I (Influência): {{ $node["Webhook"].json.pontuacoes.I }}
- S (Estabilidade): {{ $node["Webhook"].json.pontuacoes.S }}
- C (Conformidade): {{ $node["Webhook"].json.pontuacoes.C }}

Perfil combinado: {{ $node["Webhook"].json.perfil_primario }}{{ $node["Webhook"].json.perfil_secundario }}

Requisitos comportamentais da vaga:
{{ $node["Fetch Job"].json.requisitos_comportamentais }}

Retorne análise estruturada em JSON:

{
  "descricao_perfil": "Descrição do perfil comportamental (2-3 frases)",
  "caracteristicas_principais": ["Lista de 4-6 características comportamentais"],
  "estilo_comunicacao": "Como esta pessoa se comunica (1-2 frases)",
  "estilo_trabalho": "Como esta pessoa trabalha melhor (1-2 frases)",
  "motivadores": ["Lista de 3-4 fatores motivacionais"],
  "estressores": ["Lista de 2-3 fatores de estresse"],
  "fit_funcao": {
    "score": 90,
    "justificativa": "Explicação do score"
  },
  "dicas_gestao": ["Lista de 3-4 dicas para gerenciar esta pessoa"],
  "funcoes_ideais": ["Lista de 3-5 tipos de função ideais"]
}
```

**Raven Analysis Prompt:**
```
Você é um especialista em avaliação cognitiva.

Analise o desempenho no Teste Raven:

Candidato: {{ $node["Fetch Candidate"].json.nome_completo }}
Vaga: {{ $node["Fetch Job"].json.titulo }}

Pontuação Bruta: {{ $node["Webhook"].json.pontuacao_bruta }}/60
Percentil: {{ $node["Webhook"].json.percentil }}º
Classificação: {{ $node["Webhook"].json.classificacao }}

Desempenho por conjunto:
- Set A (Básico): {{ $node["Fetch Results"].json.pontuacao_conjunto_a }}/12
- Set B (Intermediário): {{ $node["Fetch Results"].json.pontuacao_conjunto_b }}/12
- Set C (Avançado): {{ $node["Fetch Results"].json.pontuacao_conjunto_c }}/12
- Set D (Difícil): {{ $node["Fetch Results"].json.pontuacao_conjunto_d }}/12
- Set E (Muito Difícil): {{ $node["Fetch Results"].json.pontuacao_conjunto_e }}/12

Tempo total: {{ $node["Fetch Results"].json.tempo_total_minutos }} minutos

Requisitos cognitivos da vaga:
{{ $node["Fetch Job"].json.requisitos_cognitivos }}

Retorne análise estruturada em JSON:

{
  "perfil_cognitivo": "Descrição geral do perfil cognitivo (2-3 frases)",
  "raciocinio_visual": "alto|médio|baixo",
  "raciocinio_abstrato": "alto|médio|baixo",
  "logica_complexa": "alto|médio|baixo",
  "velocidade_processamento": "rápida|média|lenta",
  "pontos_fortes_cognitivos": ["Lista de 2-3 pontos fortes"],
  "areas_desafio": ["Lista de 1-2 áreas de desafio"],
  "fit_funcao": {
    "score": 75,
    "justificativa": "Explicação do score"
  },
  "funcoes_adequadas": ["Lista de tipos de função adequadas"],
  "recomendacoes_treinamento": ["Lista de 2-3 recomendações"]
}
```

### FR-004: Supabase Integration
**Fetch Candidate Data:**
```javascript
// N8N Supabase Node Configuration
{
  "resource": "Rows",
  "operation": "Get",
  "table": "candidatos",
  "filters": {
    "id": "={{ $json.candidato_id }}"
  },
  "returnAll": false,
  "limit": 1,
  "additionalFields": {
    "select": "*,candidaturas(*,vagas(*))"
  }
}
```

**Store AI Analysis:**
```javascript
// N8N Supabase Node - Insert
{
  "resource": "Rows",
  "operation": "Insert",
  "table": "analise_ia",
  "rows": {
    "candidato_id": "={{ $node['Fetch Candidate'].json.id }}",
    "tipo_analise": "big_five", // or "disc", "raven"
    "resultado_id": "={{ $json.resultado_id }}",
    "analise_json": "={{ $node['Parse AI Response'].json }}",
    "modelo_ia": "claude-3.5-sonnet",
    "versao_prompt": "v1.0",
    "data_analise": "={{ $now }}"
  }
}
```

### FR-005: Claude AI Integration
**HTTP Request Node Configuration:**
```javascript
{
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages",
  "authentication": "headerAuth",
  "headers": {
    "x-api-key": "={{ $credentials.claudeApiKey }}",
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  },
  "body": {
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 4096,
    "temperature": 0.3,
    "messages": [
      {
        "role": "user",
        "content": "={{ $json.prompt }}"
      }
    ]
  }
}
```

**Parse AI Response:**
```javascript
// Code Node - Extract JSON from AI response
const response = $input.item.json.content[0].text;

// AI responses are wrapped in JSON code blocks
const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);

if (jsonMatch) {
  const parsed = JSON.parse(jsonMatch[1]);
  return { json: parsed };
} else {
  // Fallback: Try to parse response directly
  try {
    return { json: JSON.parse(response) };
  } catch (e) {
    throw new Error('Failed to parse AI response as JSON');
  }
}
```

### FR-006: Error Handling
**Validation Node:**
```javascript
// Validate webhook payload
const required = ['candidato_id', 'resultado_id', 'pontuacoes'];

for (const field of required) {
  if (!$json[field]) {
    throw new Error(`Missing required field: ${field}`);
  }
}

// Validate score ranges
const scores = $json.pontuacoes;
for (const [key, value] of Object.entries(scores)) {
  if (value < 0 || value > 100) {
    throw new Error(`Invalid score for ${key}: ${value}`);
  }
}

return { json: $json }; // Pass through if valid
```

**Error Handler Node:**
```javascript
// Log error to Supabase
{
  "resource": "Rows",
  "operation": "Insert",
  "table": "logs_n8n_errors",
  "rows": {
    "workflow_id": "={{ $workflow.id }}",
    "execution_id": "={{ $execution.id }}",
    "error_message": "={{ $json.error.message }}",
    "error_stack": "={{ $json.error.stack }}",
    "input_data": "={{ $json.input }}",
    "timestamp": "={{ $now }}"
  }
}
```

**Retry Logic:**
```javascript
// Set Node - Configure retry
{
  "maxRetries": 3,
  "retryDelay": 5000, // 5 seconds
  "retryOn": ["timeout", "rate_limit", "server_error"]
}
```

### FR-007: Composite Analysis (All Tests Combined)
**Trigger:** After candidate completes all 3 tests (Big Five + DISC + Raven)

**Webhook:** `https://fernandocosta.app.n8n.cloud/webhook/analise-completa`

**Composite Analysis Prompt:**
```
Você é um psicólogo organizacional especialista.

Combine as análises de Big Five, DISC e Raven para criar um perfil completo:

Big Five:
{{ $node['Fetch Big Five Analysis'].json.analise_json }}

DISC:
{{ $node['Fetch DISC Analysis'].json.analise_json }}

Raven:
{{ $node['Fetch Raven Analysis'].json.analise_json }}

Vaga alvo: {{ $node['Fetch Job'].json.titulo }}
Requisitos da vaga: {{ $node['Fetch Job'].json.descricao_completa }}

Crie uma análise integrada em JSON:

{
  "resumo_executivo": "Visão geral do candidato (3-4 frases)",
  "match_score_geral": 87,
  "recomendacao": "APROVAR|APROVAR COM RESSALVAS|REJEITAR|AGUARDAR ENTREVISTA",
  "confianca_recomendacao": 85,
  "sintese_pontos_fortes": ["Top 5 pontos fortes integrados"],
  "sintese_areas_desenvolvimento": ["Top 3 áreas de melhoria"],
  "adequacao_funcao": {
    "personalidade": 85,
    "comportamento": 90,
    "capacidade_cognitiva": 75,
    "fit_geral": 87
  },
  "proximo_passo": "Agendar entrevista online",
  "perguntas_entrevista": ["3-5 perguntas recomendadas para entrevista"],
  "red_flags": ["Lista de preocupações, se houver"],
  "potencial_longo_prazo": "alto|médio|baixo"
}
```

**Store Composite Analysis:**
```javascript
{
  "table": "analise_ia",
  "rows": {
    "candidato_id": "={{ $json.candidato_id }}",
    "tipo_analise": "composite",
    "analise_json": "={{ $node['Parse Composite'].json }}",
    "modelo_ia": "claude-3.5-sonnet",
    "versao_prompt": "composite-v1.0"
  }
}
```

### FR-008: Email Notifications
**When to send:**
- Match score ≥ 85% (high-fit candidate)
- Red flags detected (for HR awareness)
- All tests completed (composite analysis ready)

**Email Template (High Match):**
```html
Assunto: 🌟 Candidato de Alto Potencial: {{ $json.candidato_nome }}

Olá, Equipe de RH,

Um candidato de alto potencial completou os testes psicométricos:

Candidato: {{ $json.candidato_nome }}
Vaga: {{ $json.vaga_titulo }}
Match Score: {{ $json.match_score }}% ⭐

Resumo:
{{ $json.resumo_executivo }}

Recomendação: {{ $json.recomendacao }}

Próximo passo sugerido: {{ $json.proximo_passo }}

[Ver perfil completo no painel]
{{ $json.link_painel }}

---
Este email foi gerado automaticamente pela análise de IA.
```

**N8N Send Email Node:**
```javascript
{
  "resource": "Email",
  "operation": "Send",
  "fromEmail": "noreply@beautysmile.com.br",
  "toEmail": "rh@beautysmile.com.br",
  "subject": "={{ $json.subject }}",
  "emailType": "html",
  "html": "={{ $json.emailBody }}"
}
```

### FR-009: Workflow Monitoring
**Logging:**
Every workflow execution logs to `logs_n8n_execucoes`:
```sql
CREATE TABLE logs_n8n_execucoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  candidato_id UUID REFERENCES candidatos(id),
  status TEXT, -- 'success' | 'error' | 'timeout'
  duracao_segundos INTEGER,
  erro_mensagem TEXT,
  payload_entrada JSONB,
  payload_saida JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Metrics Dashboard (N8N built-in):**
- Workflow execution count (last 30 days)
- Success rate (%)
- Average execution time
- Error breakdown by type

### FR-010: Environment Variables
Store in N8N credentials:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (for RLS bypass in workflows)
- `CLAUDE_API_KEY`
- `SMTP_USER` (for email notifications)
- `SMTP_PASSWORD`

## 5. Non-Goals (Out of Scope)

1. **Manual AI prompt editing by HR** - Prompts managed by developers only
2. **Real-time AI analysis during test** - Only post-completion
3. **Multiple AI model comparison** - Claude only for MVP
4. **Custom workflow creation by HR** - Pre-built workflows only
5. **Workflow versioning** - Single active version per workflow
6. **A/B testing of prompts** - Fixed prompts for consistency
7. **Integration with external psychology APIs** - Claude AI only
8. **Batch re-analysis of old candidates** - New candidates only
9. **Manual workflow triggers from UI** - Automatic only
10. **Workflow scheduling** - Event-driven only, no cron jobs

## 6. Design Considerations

**Prompt Engineering:**
- Use structured output (JSON) for reliable parsing
- Provide clear examples in prompts
- Set temperature=0.3 for consistency
- Include role context ("You are a psychologist...")

**Performance:**
- Claude API calls take 5-15 seconds
- Total workflow: <2 minutes target
- Parallel processing where possible (fetch data + build prompt)

**Reliability:**
- Retry transient failures (network, rate limits)
- Log all executions for debugging
- Validate payloads before expensive operations

## 7. Technical Considerations

### N8N Workflow Export
Workflows exported as JSON, stored in Git:
```
n8n-workflows/
  big-five-analysis.json
  disc-analysis.json
  raven-analysis.json
  composite-analysis.json
  high-match-notification.json
```

### Claude API Costs
- Model: claude-3-5-sonnet-20241022
- Cost: ~$0.015 per analysis (avg 3000 tokens)
- Monthly estimate: 200 candidates × 4 analyses × $0.015 = $12/month

### Supabase RLS Bypass
Workflows use service role key to bypass RLS:
```javascript
// N8N Supabase Credential
{
  "host": "https://[project-ref].supabase.co",
  "serviceRole": "eyJhbGc..." // Service role key
}
```

**Security:** Service role key stored in N8N credentials (encrypted)

### Rate Limiting
**Claude API:**
- Tier 1: 50 requests/min
- Handle 429 errors with exponential backoff

**Supabase:**
- No rate limits for service role
- Monitor usage in Supabase dashboard

## 8. Success Metrics

**Primary:**
1. AI analysis success rate: ≥ 98%
2. Analysis completion time: ≤ 2 minutes
3. HR satisfaction with AI quality: ≥ 4.5/5

**Secondary:**
1. Email notification delivery: ≥ 99%
2. Workflow error rate: ≤ 2%
3. Match score accuracy (validated over time): ≥ 80% correlation with hire success

**Business:**
1. Time to hire ↓ 30% (faster with AI insights)
2. Quality of hire ↑ 20% (better matching)
3. HR time savings: 15 min/candidate → 2 min/candidate (87% reduction)

## 9. Open Questions

### Critical (Must Resolve Before Development)
1. **Claude API Key:** Use personal or create Anthropic organization account?
   - **Recommendation:** Organization account for billing and limits

2. **Prompt Version Control:** How to track prompt changes?
   - **Recommendation:** Store version in `analise_ia.versao_prompt`, update on changes

3. **Re-analysis Trigger:** Should we allow HR to manually re-run analysis?
   - **Recommendation:** Yes, add "Re-analisar" button in admin (calls webhook manually)

### Medium Priority
4. **Composite Analysis Timing:** Run immediately after 3rd test or wait for manual trigger?
   - **Recommendation:** Automatic after 3rd test completion

5. **Email Recipients:** Send to all HR or specific recruiter for vaga?
   - **Recommendation:** Send to vaga owner (recruiter assigned to job posting)

6. **Failure Notifications:** Alert developers on workflow failures?
   - **Recommendation:** Yes, send to Slack channel #n8n-alerts

---

## Acceptance Criteria Summary

✅ N8N webhooks created for Big Five, DISC, Raven completion
✅ Workflows fetch candidate data from Supabase
✅ AI prompts generate structured JSON responses
✅ Claude API integration working with proper authentication
✅ AI analysis stored in `analise_ia` table
✅ Composite analysis triggered after all 3 tests complete
✅ Email notifications sent for high-match candidates (≥85%)
✅ Error handling logs failures to database
✅ Retry logic handles transient failures
✅ Workflow execution time ≤2 minutes (90th percentile)
✅ AI analysis success rate ≥98%
✅ All workflows tested with real candidate data
✅ Documentation exists for prompt versions and workflow logic

---

**Target Audience:** Backend Developer / Integration Specialist
**Estimated Effort:** 3-4 days (workflow setup + testing + prompt refinement)
**Dependencies:**
- ✅ N8N instance running (fernandocosta.app.n8n.cloud)
- ✅ Claude API key with Tier 1 limits
- ✅ Supabase service role key
- ⏳ PRD-DEV-007, 008, 009 (tests must trigger webhooks)
- ⏳ `analise_ia` table in Supabase
**Blocker Status:** 🚨 CRITICAL - Required for AI-powered candidate insights, differentiator feature
