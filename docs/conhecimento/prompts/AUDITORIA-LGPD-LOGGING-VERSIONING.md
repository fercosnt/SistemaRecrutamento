# Padrão de Auditoria LGPD — Logging, Versionamento e Pattern Art. 20 para ATS com IA

> Documento standalone | Compilado em 2026-04-27 | Stack: Supabase Postgres + Edge Functions
> Complementa: [PESQUISA-prompt-library-ats.md](./PESQUISA-prompt-library-ats.md)

---

## ÍNDICE

1. [Princípios de Design (LGPD-First)](#1-principios)
2. [Schema Postgres Completo](#2-schema)
3. [Versionamento de Prompts (SemVer + Hash)](#3-versionamento)
4. [Geração de Explicação para o Candidato (Art. 20)](#4-explicacao)
5. [PII Handling — Mascaramento e Pseudonimização](#5-pii)
6. [Workflow de Revisão Humana (HITL)](#6-hitl)
7. [Retenção e Deleção Automática](#7-retencao)
8. [Cost Monitoring](#8-monitoring)
9. [Checklist de Compliance Pré-Deploy](#9-checklist)

---

<a id="1-principios"></a>
## 1. PRINCÍPIOS DE DESIGN (LGPD-FIRST)

### Pilares regulatórios

1. **LGPD Art. 6º (Privacy by Design)** — sistema construído com privacidade desde o início, não retrofitada
2. **LGPD Art. 9º (Transparência)** — candidato sabe que há automação, conhece critérios
3. **LGPD Art. 11/12 (Dados sensíveis)** — sem coleta de raça, religião, orientação, saúde
4. **LGPD Art. 15 (Retenção limitada)** — 90-180 dias rejeitados, 5 anos aprovados
5. **LGPD Art. 18 (Direitos do titular)** — acesso, retificação, exclusão, portabilidade
6. **LGPD Art. 20 (Decisão automatizada)** — direito a revisão + explicação clara
7. **LGPD Art. 38 (RIPD)** — Avaliação de Impacto documentada antes de produção
8. **LGPD Art. 41 (DPO)** — Encarregado nomeado e canal de contato público
9. **ANPD Nota Técnica 12/2025** — RIPD + Privacy by Design + transparência algorítmica
10. **Lei 9.029/95** — proibição de discriminação no recrutamento

### Princípios de implementação

- **Imutabilidade**: prompts versionados nunca editados; rollback via `is_active=false`
- **Pseudonimização**: PII real nunca fica em logs; apenas templates com placeholders
- **Reproducibilidade**: dado o `prompt_version_id` + input pseudonimizado, resultado é reproduzível
- **Auditabilidade**: cada decisão tem trilha completa: prompt → resposta → modelo → versão → timestamp
- **Limitação de finalidade**: log é apenas para auditoria/compliance; NÃO usado para retreino sem consentimento

---

<a id="2-schema"></a>
## 2. SCHEMA POSTGRES COMPLETO

### 2.1 Extensões e tipos

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgmq;

CREATE TYPE llm_call_type AS ENUM (
  'cv_summary',
  'cv_job_match',
  'comparative_ranking',
  'interview_guide',
  'transcript_analysis',
  'culture_fit_essay',
  'work_sample_sjt'
);

CREATE TYPE llm_provider AS ENUM ('anthropic', 'openai', 'google');

CREATE TYPE candidate_status AS ENUM (
  'pending_ai',
  'ai_screened',
  'auto_approved',
  'auto_rejected',
  'flagged_for_review',
  'human_reviewing',
  'human_confirmed_approved',
  'human_confirmed_rejected',
  'candidate_review_requested',
  'archived'
);
```

### 2.2 Tabela `prompt_versions`

```sql
CREATE TABLE prompt_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_type       llm_call_type NOT NULL,

  -- Versionamento (IMUTÁVEL após publicação)
  semver          TEXT NOT NULL,
  content_hash    TEXT NOT NULL UNIQUE,

  -- Conteúdo
  system_template TEXT NOT NULL,
  user_template   TEXT NOT NULL,

  -- Parâmetros do modelo
  model_id        TEXT NOT NULL,
  temperature     NUMERIC(3,2) NOT NULL DEFAULT 0,
  max_tokens      INTEGER NOT NULL,

  -- Estado
  is_active       BOOLEAN NOT NULL DEFAULT false,
  is_canary       BOOLEAN NOT NULL DEFAULT false,
  canary_pct      SMALLINT DEFAULT 0 CHECK (canary_pct BETWEEN 0 AND 100),

  -- Changelog obrigatório
  change_summary  TEXT NOT NULL,
  changed_by      TEXT NOT NULL,
  approved_by     TEXT,

  -- Rollback
  previous_version_id UUID REFERENCES prompt_versions(id),

  -- Métricas pós-deploy
  avg_score_delta  NUMERIC(5,2),
  p95_latency_ms   INTEGER,
  error_rate_pct   NUMERIC(5,2),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at     TIMESTAMPTZ,
  deprecated_at   TIMESTAMPTZ,

  -- Apenas UMA versão active por call_type (canary não conta)
  CONSTRAINT unique_active_per_type
    EXCLUDE USING btree (call_type WITH =)
    WHERE (is_active = true AND is_canary = false)
);

CREATE INDEX idx_prompt_versions_type_active ON prompt_versions (call_type, is_active, is_canary);
CREATE INDEX idx_prompt_versions_hash        ON prompt_versions (content_hash);
```

### 2.3 Tabela `ai_call_logs` (auditoria principal)

```sql
CREATE TABLE ai_call_logs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Contexto
  candidato_id          UUID NOT NULL REFERENCES candidates(id) ON DELETE SET NULL,
  vaga_id               UUID NOT NULL REFERENCES jobs(id) ON DELETE SET NULL,
  call_type             llm_call_type NOT NULL,

  -- Rastreabilidade
  prompt_version_id     UUID NOT NULL REFERENCES prompt_versions(id),
  prompt_hash           TEXT NOT NULL,

  -- Modelo
  provider              llm_provider NOT NULL,
  model_id              TEXT NOT NULL,
  model_snapshot        TEXT,

  -- Inputs PSEUDONIMIZADOS (LGPD-compliant)
  system_prompt         TEXT NOT NULL,
  user_prompt_template  TEXT NOT NULL,  -- Template, NÃO dados reais
  input_token_count     INTEGER NOT NULL,

  -- Outputs
  raw_response          JSONB NOT NULL,
  parsed_score          NUMERIC(5,2),
  parsed_reasoning      TEXT,           -- Para Art. 20
  output_token_count    INTEGER NOT NULL,

  -- Performance
  latency_ms            INTEGER NOT NULL,
  attempt_number        SMALLINT NOT NULL DEFAULT 1,
  cost_usd              NUMERIC(10,6),

  -- Estado
  success               BOOLEAN NOT NULL DEFAULT true,
  error_code            TEXT,
  error_message         TEXT,

  -- Idempotência
  idempotency_key       TEXT UNIQUE,

  -- Retenção
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retain_until          TIMESTAMPTZ NOT NULL,
  triggered_by          TEXT NOT NULL DEFAULT 'system',

  CONSTRAINT valid_score CHECK (parsed_score IS NULL OR (parsed_score >= 0 AND parsed_score <= 100)),
  CONSTRAINT valid_latency CHECK (latency_ms >= 0),
  CONSTRAINT valid_attempts CHECK (attempt_number BETWEEN 1 AND 5)
);

CREATE INDEX idx_ai_logs_candidato_vaga ON ai_call_logs (candidato_id, vaga_id);
CREATE INDEX idx_ai_logs_created_at     ON ai_call_logs (created_at DESC);
CREATE INDEX idx_ai_logs_call_type      ON ai_call_logs (call_type);
CREATE INDEX idx_ai_logs_retain_until   ON ai_call_logs (retain_until) WHERE retain_until IS NOT NULL;
CREATE INDEX idx_ai_logs_provider_model ON ai_call_logs (provider, model_id);
CREATE INDEX idx_ai_logs_vaga_cost      ON ai_call_logs (vaga_id, cost_usd) WHERE success = true;
CREATE INDEX idx_ai_logs_error          ON ai_call_logs (error_code) WHERE success = false;
CREATE INDEX idx_ai_logs_idempotency    ON ai_call_logs (idempotency_key) WHERE idempotency_key IS NOT NULL;
```

### 2.4 Tabela `candidate_ai_decisions` (HITL Art. 20)

```sql
CREATE TABLE candidate_ai_decisions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidato_id          UUID NOT NULL REFERENCES candidates(id),
  vaga_id               UUID NOT NULL REFERENCES jobs(id),

  -- Agregação dos 7 logs
  ai_call_log_ids       UUID[] NOT NULL,
  ai_composite_score    NUMERIC(5,2) NOT NULL,
  ai_recommendation     TEXT NOT NULL,
  ai_reasoning_summary  TEXT NOT NULL,

  -- Estado
  status                candidate_status NOT NULL DEFAULT 'ai_screened',

  -- HITL (LGPD Art. 20)
  review_requested_at   TIMESTAMPTZ,
  review_requested_by   TEXT,
  reviewer_id           UUID REFERENCES recruiters(id),
  reviewed_at           TIMESTAMPTZ,
  human_decision        TEXT,
  human_notes           TEXT,
  human_overrode_ai     BOOLEAN,

  -- LGPD: explicação entregue
  explanation_delivered_at  TIMESTAMPTZ,
  explanation_channel       TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (candidato_id, vaga_id)
);

CREATE INDEX idx_decisions_status         ON candidate_ai_decisions (status);
CREATE INDEX idx_decisions_review_pending ON candidate_ai_decisions (review_requested_at)
  WHERE status = 'candidate_review_requested';
CREATE INDEX idx_decisions_candidato      ON candidate_ai_decisions (candidato_id);
```

### 2.5 Tabela `ai_cost_daily` (agregação para retenção pós-purge)

```sql
CREATE TABLE ai_cost_daily (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE NOT NULL,
  vaga_id     UUID REFERENCES jobs(id),
  call_type   llm_call_type NOT NULL,
  provider    llm_provider NOT NULL,
  call_count           INTEGER NOT NULL DEFAULT 0,
  total_input_tokens   BIGINT NOT NULL DEFAULT 0,
  total_output_tokens  BIGINT NOT NULL DEFAULT 0,
  total_cost_usd       NUMERIC(12,6) NOT NULL DEFAULT 0,
  error_count          INTEGER NOT NULL DEFAULT 0,
  UNIQUE (date, vaga_id, call_type, provider)
);
```

---

<a id="3-versionamento"></a>
## 3. VERSIONAMENTO DE PROMPTS (SemVer + Hash)

### 3.1 Regras de SemVer

```
call_type: cv_job_match
semver:    2.1.0

MAJOR (X.0.0) → mudança de critério avaliativo
  Ex: adicionou peso para Stack Técnica que antes não existia
  Impacto: scores não comparáveis com versões anteriores

MINOR (x.X.0) → novos exemplos few-shot, contexto expandido
  Ex: adicionou 2 exemplos calibrados de score 5
  Impacto: scores comparáveis, mas distribuição pode mudar

PATCH (x.x.X) → typo, reformulação de frase, sem mudança semântica
  Ex: "currículo" → "CV" no system prompt
  Impacto: scores devem ser idênticos
```

### 3.2 Regra de ouro: imutabilidade

**Uma versão publicada NUNCA é editada.** Qualquer mudança, mesmo correção de typo, gera nova versão com novo hash. O log de auditoria sempre referencia exatamente qual prompt gerou qual decisão.

### 3.3 Workflow de deploy

```sql
-- 1. Criar nova versão (não-ativa por padrão)
INSERT INTO prompt_versions (
  call_type, semver, content_hash, system_template, user_template,
  model_id, temperature, max_tokens,
  change_summary, changed_by, previous_version_id
) VALUES (
  'cv_job_match', '2.1.0',
  encode(digest(:full_content, 'sha256'), 'hex'),
  :system_template, :user_template,
  'claude-sonnet-4-6', 0, 2048,
  'Adicionado peso para experiência com Kafka',
  'tech-lead@empresa.com',
  (SELECT id FROM prompt_versions WHERE call_type = 'cv_job_match' AND semver = '2.0.3')
);

-- 2. Canary deploy (10% do tráfego)
UPDATE prompt_versions
SET is_canary = true, canary_pct = 10, deployed_at = NOW()
WHERE call_type = 'cv_job_match' AND semver = '2.1.0';

-- 3. Após 24-48h se métricas OK, promover a active
UPDATE prompt_versions SET is_active = false WHERE call_type = 'cv_job_match' AND semver = '2.0.3';
UPDATE prompt_versions SET is_active = true, is_canary = false, canary_pct = 0
WHERE call_type = 'cv_job_match' AND semver = '2.1.0';
```

### 3.4 Rollback (sub-60s)

```sql
-- Rollback emergencial: desativa versão problemática
UPDATE prompt_versions SET is_active = false, deprecated_at = NOW()
WHERE call_type = 'cv_job_match' AND semver = '2.1.0';

-- Reativa versão anterior
UPDATE prompt_versions SET is_active = true, deprecated_at = NULL
WHERE call_type = 'cv_job_match' AND semver = '2.0.3';
```

### 3.5 Selector na Edge Function

```typescript
// Busca versão ativa
const { data: prompt } = await supabase
  .from('prompt_versions')
  .select('*')
  .eq('call_type', CALL_TYPE)
  .eq('is_active', true)
  .single();

// Canary routing (10% do tráfego)
const { data: canary } = await supabase
  .from('prompt_versions')
  .select('*')
  .eq('call_type', CALL_TYPE)
  .eq('is_canary', true)
  .single();

let activePrompt = prompt;
if (canary && Math.random() * 100 < (canary.canary_pct ?? 0)) {
  activePrompt = canary;
  console.log(`[Canary] Usando ${canary.semver} (${canary.canary_pct}%)`);
}
```

---

<a id="4-explicacao"></a>
## 4. GERAÇÃO DE EXPLICAÇÃO PARA O CANDIDATO (Art. 20)

### 4.1 Função SQL

```sql
CREATE OR REPLACE FUNCTION generate_candidate_explanation(
  p_candidato_id UUID,
  p_vaga_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_explanation TEXT := '';
  v_log RECORD;
  v_decision RECORD;
BEGIN
  SELECT * INTO v_decision
  FROM candidate_ai_decisions
  WHERE candidato_id = p_candidato_id AND vaga_id = p_vaga_id;

  IF v_decision IS NULL THEN
    RETURN 'Sua candidatura não foi avaliada por sistema automatizado.';
  END IF;

  v_explanation := format(
    '## Explicação da Avaliação Automatizada%s%sSua candidatura foi avaliada por inteligência artificial em %s.%s%sScore composto: %s/100%sRecomendação do sistema: %s%s%s',
    E'\n\n', '',
    to_char(v_decision.created_at, 'DD/MM/YYYY'),
    E'\n\n', '',
    v_decision.ai_composite_score,
    E'\n', v_decision.ai_recommendation,
    E'\n\n', E'\n'
  );

  FOR v_log IN
    SELECT call_type, parsed_score, parsed_reasoning
    FROM ai_call_logs
    WHERE candidato_id = p_candidato_id AND vaga_id = p_vaga_id AND success = true
    ORDER BY created_at
  LOOP
    v_explanation := v_explanation || format(
      E'\n### %s (score: %s/100)%s%s%s',
      v_log.call_type, v_log.parsed_score, E'\n', v_log.parsed_reasoning, E'\n'
    );
  END LOOP;

  v_explanation := v_explanation || E'\n\n**Direitos LGPD (Art. 20)**: Você pode solicitar revisão por recrutador humano em rh@empresa.com no prazo de 15 dias.';

  RETURN v_explanation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 Exemplo de saída

```markdown
## Explicação da Avaliação Automatizada

Sua candidatura foi avaliada por inteligência artificial em 27/04/2026.

Score composto: 72/100
Recomendação do sistema: advance

### cv_summary (score: 80/100)
Profissional sênior com 8 anos em backend Python, fortemente alinhado com a stack solicitada (FastAPI, AWS, microsserviços).

### cv_job_match (score: 72/100)
Análise: candidato atende requisitos críticos de Python e AWS com evidência clara. Gap identificado em Kafka (vaga pede explicitamente, sem menção no CV) e parcial em liderança formal de squad >5 pessoas.

**Direitos LGPD (Art. 20)**: Você pode solicitar revisão por recrutador humano em rh@empresa.com no prazo de 15 dias.
```

### 4.3 Endpoint REST

```typescript
// supabase/functions/explain-decision/index.ts
serve(async (req: Request) => {
  const { candidato_id, vaga_id } = await req.json();

  // Verificar autorização (apenas próprio candidato OU recrutador)
  const { data: { user } } = await supabase.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", ""));
  if (user.id !== candidato_id && !await isRecruiter(user.id)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: explanation } = await supabase.rpc('generate_candidate_explanation', {
    p_candidato_id: candidato_id,
    p_vaga_id: vaga_id,
  });

  // Registrar entrega da explicação
  await supabase.from('candidate_ai_decisions').update({
    explanation_delivered_at: new Date().toISOString(),
    explanation_channel: 'portal',
  }).eq('candidato_id', candidato_id).eq('vaga_id', vaga_id);

  return new Response(JSON.stringify({ explanation }), { status: 200 });
});
```

---

<a id="5-pii"></a>
## 5. PII HANDLING — MASCARAMENTO E PSEUDONIMIZAÇÃO

### 5.1 Regras PT-BR (Deno regex)

```typescript
const PII_RULES = [
  { regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, placeholder: "[CPF]" },
  { regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, placeholder: "[CNPJ]" },
  { regex: /\b[\w._%+-]+@[\w.-]+\.[a-z]{2,}\b/gi, placeholder: "[EMAIL]" },
  { regex: /\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, placeholder: "[TELEFONE]" },
  { regex: /\b\d{2}\/\d{2}\/(19|20)\d{2}\b/g, placeholder: "[DATA_NASC]" },
  { regex: /\b(Rua|Av\.?|Avenida|Alameda|Travessa)\s+[\w\s]+,\s*\d+/gi, placeholder: "[ENDERECO]" },
  { regex: /\bRG\s*:?\s*\d{1,2}\.?\d{3}\.?\d{3}-?\d{1}\b/gi, placeholder: "[RG]" },
];

function maskPII(text: string): { masked: string; piiFound: string[] } {
  let masked = text;
  const piiFound: string[] = [];
  for (const rule of PII_RULES) {
    if (rule.regex.test(text)) {
      piiFound.push(rule.placeholder.replace(/[\[\]]/g, ""));
      masked = masked.replace(rule.regex, rule.placeholder);
    }
  }
  return { masked, piiFound };
}
```

### 5.2 Pipeline 2 etapas

```
INPUT bruto (CV uploaded)
    ↓
[Etapa 1] Pré-processamento: maskPII() — mascarar PII estrutural
    ↓
INPUT pseudonimizado → enviado ao LLM
    ↓
LLM processa sem ver dados reais
    ↓
[Etapa 2] Logging: salvar APENAS template + dados pseudonimizados
    ↓
ai_call_logs (sem PII real, apenas placeholders + tipos detectados)
```

### 5.3 O que NÃO mascarar

- Skills técnicos (Python, AWS, etc) — necessários para avaliação
- Nomes de empresas (parcial — sem dados de contato)
- Cargos e descrições de função
- Datas de início/fim de empregos (mas mascarar data de nascimento)

### 5.4 Cobertura realista

- Regex PT-BR detecta ~85% dos casos óbvios
- Casos não detectados: nomes próprios escritos sem padrão (ex: "Joao Silva" sem acento), endereços abreviados ("R. das Flores"), telefones em formato livre
- Para volume >10k candidatos/mês: considerar Microsoft Presidio (Python) via microserviço dedicado, ou LLM-based PII detection

---

<a id="6-hitl"></a>
## 6. WORKFLOW DE REVISÃO HUMANA (HITL)

### 6.1 Estados do candidato

```
pending_ai → ai_screened → auto_approved | auto_rejected | flagged_for_review
                                ↓ (candidato pede Art. 20)
                       candidate_review_requested
                                ↓
                       human_reviewing
                                ↓
                  human_confirmed_approved | human_confirmed_rejected
```

### 6.2 SQL Functions

```sql
-- Candidato solicita revisão (Art. 20)
CREATE OR REPLACE FUNCTION request_human_review(
  p_candidato_id UUID,
  p_vaga_id UUID,
  p_requested_by TEXT DEFAULT 'candidate'
) RETURNS VOID AS $$
BEGIN
  UPDATE candidate_ai_decisions
  SET status = 'candidate_review_requested',
      review_requested_at = NOW(),
      review_requested_by = p_requested_by,
      updated_at = NOW()
  WHERE candidato_id = p_candidato_id
    AND vaga_id = p_vaga_id
    AND status IN ('auto_rejected', 'auto_approved', 'ai_screened');

  -- Notifica recrutadores via Postgres LISTEN/NOTIFY
  PERFORM pg_notify('human_review_needed', json_build_object(
    'candidato_id', p_candidato_id,
    'vaga_id', p_vaga_id,
    'requested_by', p_requested_by,
    'requested_at', NOW()
  )::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrutador registra decisão final
CREATE OR REPLACE FUNCTION record_human_decision(
  p_candidato_id UUID,
  p_vaga_id UUID,
  p_reviewer_id UUID,
  p_decision TEXT,  -- 'approve' | 'reject' | 'escalate'
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_ai_recommendation TEXT;
BEGIN
  SELECT ai_recommendation INTO v_ai_recommendation
  FROM candidate_ai_decisions
  WHERE candidato_id = p_candidato_id AND vaga_id = p_vaga_id;

  UPDATE candidate_ai_decisions
  SET status = CASE p_decision
        WHEN 'approve' THEN 'human_confirmed_approved'::candidate_status
        WHEN 'reject'  THEN 'human_confirmed_rejected'::candidate_status
        ELSE 'flagged_for_review'::candidate_status
      END,
      reviewer_id = p_reviewer_id,
      reviewed_at = NOW(),
      human_decision = p_decision,
      human_notes = p_notes,
      human_overrode_ai = (p_decision != v_ai_recommendation),
      updated_at = NOW()
  WHERE candidato_id = p_candidato_id AND vaga_id = p_vaga_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.3 SLA de revisão (cron alert)

```sql
-- Alerta diário se há reviews pendentes >5 dias úteis
SELECT cron.schedule(
  'human-review-sla-check',
  '0 9 * * 1-5',  -- 9h em dias úteis
  $$
    INSERT INTO recruiter_alerts (recruiter_id, alert_type, message, created_at)
    SELECT
      r.id,
      'human_review_overdue',
      format('Candidato %s aguarda revisão Art. 20 há %s dias',
             cad.candidato_id,
             EXTRACT(EPOCH FROM (NOW() - cad.review_requested_at))/86400),
      NOW()
    FROM candidate_ai_decisions cad
    JOIN jobs j ON cad.vaga_id = j.id
    JOIN recruiters r ON r.id = j.recruiter_id
    WHERE cad.status = 'candidate_review_requested'
      AND cad.review_requested_at < NOW() - INTERVAL '5 days';
  $$
);
```

---

<a id="7-retencao"></a>
## 7. RETENÇÃO E DELEÇÃO AUTOMÁTICA

### 7.1 Política

| Status do candidato | Retenção |
|---------------------|----------|
| Aprovados (contratados) | 5 anos (e-Social/CLT) |
| Rejeitados | 90-180 dias |
| Em processo | até decisão + 90 dias |
| Banco de talentos | 12-24 meses (com consentimento renovável) |

### 7.2 Cron de purga (preserva logs com revisão pendente)

```sql
-- Diária às 2h: purga logs vencidos
SELECT cron.schedule(
  'ai-logs-retention-cleanup',
  '0 2 * * *',
  $$
    DELETE FROM ai_call_logs
    WHERE retain_until < NOW()
    AND id NOT IN (
      SELECT unnest(ai_call_log_ids)
      FROM candidate_ai_decisions
      WHERE status IN ('candidate_review_requested', 'human_reviewing')
    );
  $$
);
```

### 7.3 Agregação para cost_daily ANTES de purgar

```sql
SELECT cron.schedule(
  'ai-cost-aggregation',
  '30 1 * * *',  -- 30 min antes da purga
  $$
    INSERT INTO ai_cost_daily (date, vaga_id, call_type, provider, call_count,
      total_input_tokens, total_output_tokens, total_cost_usd, error_count)
    SELECT
      DATE(created_at), vaga_id, call_type, provider,
      COUNT(*), SUM(input_token_count), SUM(output_token_count),
      SUM(cost_usd), SUM(CASE WHEN success = false THEN 1 ELSE 0 END)
    FROM ai_call_logs
    WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY DATE(created_at), vaga_id, call_type, provider
    ON CONFLICT (date, vaga_id, call_type, provider) DO UPDATE SET
      call_count = EXCLUDED.call_count,
      total_input_tokens = EXCLUDED.total_input_tokens,
      total_output_tokens = EXCLUDED.total_output_tokens,
      total_cost_usd = EXCLUDED.total_cost_usd;
  $$
);
```

### 7.4 Direito de exclusão (Art. 18 LGPD)

```sql
CREATE OR REPLACE FUNCTION delete_candidate_data(p_candidato_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Atomicamente remove TODOS os dados do candidato
  DELETE FROM ai_call_logs WHERE candidato_id = p_candidato_id;
  DELETE FROM candidate_ai_decisions WHERE candidato_id = p_candidato_id;
  DELETE FROM applications WHERE candidato_id = p_candidato_id;
  DELETE FROM candidates WHERE id = p_candidato_id;

  -- Log da deleção (sem ID do candidato — compliance)
  INSERT INTO data_deletion_log (deletion_type, deleted_at)
  VALUES ('candidate_full_deletion', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

<a id="8-monitoring"></a>
## 8. COST MONITORING

### 8.1 Queries de dashboard

```sql
-- Custo por vaga (últimos 30 dias)
SELECT
  j.title AS vaga,
  COUNT(DISTINCT l.candidato_id) AS candidatos,
  COUNT(*) AS chamadas,
  SUM(l.input_token_count + l.output_token_count) AS total_tokens,
  ROUND(SUM(l.cost_usd)::numeric, 4) AS custo_usd,
  ROUND(AVG(l.latency_ms)::numeric) AS lat_media_ms,
  ROUND(100.0 * SUM(CASE WHEN l.success = false THEN 1 ELSE 0 END) / COUNT(*), 2) AS error_pct
FROM ai_call_logs l
JOIN jobs j ON l.vaga_id = j.id
WHERE l.created_at >= NOW() - INTERVAL '30 days'
GROUP BY j.id, j.title
ORDER BY custo_usd DESC
LIMIT 20;

-- Detecção de anomalia: vaga com >500 candidatos em 7 dias (possível spam)
SELECT vaga_id, COUNT(DISTINCT candidato_id) AS candidatos
FROM ai_call_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY vaga_id
HAVING COUNT(DISTINCT candidato_id) > 500;

-- Custo por modelo
SELECT provider, model_id, COUNT(*) AS chamadas,
       SUM(cost_usd) AS custo_usd, AVG(latency_ms) AS lat_ms
FROM ai_call_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY provider, model_id;

-- Error rate por call_type (últimas 24h)
SELECT call_type, error_code, COUNT(*) AS ocorrencias,
       MIN(created_at) AS primeiro, MAX(created_at) AS ultimo
FROM ai_call_logs
WHERE success = false AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY call_type, error_code
ORDER BY ocorrencias DESC;

-- Cache hit rate (Anthropic)
SELECT call_type, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE (raw_response->'usage'->>'cache_read_input_tokens')::int > 0) AS cache_hits,
       ROUND(100.0 * COUNT(*) FILTER (WHERE (raw_response->'usage'->>'cache_read_input_tokens')::int > 0) / COUNT(*), 1) AS hit_rate_pct
FROM ai_call_logs
WHERE provider = 'anthropic' AND success = true
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY call_type;
```

---

<a id="9-checklist"></a>
## 9. CHECKLIST DE COMPLIANCE PRÉ-DEPLOY

### Documentação obrigatória

- [ ] **RIPD** (Avaliação de Impacto LGPD) escrito e revisado pelo DPO
- [ ] **Modelo Card** para cada call_type (modelo usado, dataset de validação, métricas, limitações)
- [ ] **Política de retenção** publicada e linkada na privacidade do site
- [ ] **Texto de aviso ao candidato** sobre uso de IA (na tela de candidatura)
- [ ] **Canal LGPD** ativo (email/portal) para solicitações Art. 18 e Art. 20
- [ ] **Política de versionamento** documentada (quando bumper MAJOR/MINOR/PATCH)
- [ ] **Plano de incidente** se vier disparate impact (>4/5 rule)

### Implementação técnica

- [ ] Schema Postgres deployado (todas as tabelas + índices)
- [ ] pg_cron jobs configurados (retention + agregação + SLA alert)
- [ ] pgmq queues criadas (`ai_evaluation_queue` + `ai_evaluation_retry`)
- [ ] PII masking testado em CVs reais
- [ ] Prompt versions iniciais inseridas (1.0.0 para todos os 7 call_types)
- [ ] Edge Function deployada com secrets configurados (`supabase secrets set`)
- [ ] Endpoint `explain-decision` testado com candidato real
- [ ] HITL workflow testado: candidato → review_request → recruiter → decision

### Validação interna (PT-BR)

- [ ] Counterfactual testing executado com 4 pares de nomes (PT-BR)
- [ ] WER do Whisper medido em amostras de NE/SP/RS/Sul (se for usar Template 5)
- [ ] 30+ candidatos reais avaliados por humanos (raters calibrados) e comparados com LLM
- [ ] Pearson/Spearman > 0.70 entre LLM e humanos antes de produção
- [ ] Disparate Impact Ratio > 0.80 em todas as dimensões protegidas
- [ ] Teste de prompt injection executado com payloads conhecidos

### Operações

- [ ] Dashboard de custo monitorado (alerta se >$200/vaga)
- [ ] Alerta para vagas com >500 candidatos em 7 dias
- [ ] Alerta para error rate > 5% em qualquer call_type
- [ ] Alerta para reviews humanos pendentes >5 dias úteis
- [ ] Backup das `prompt_versions` em git (versão MD com frontmatter)

---

> **Última atualização:** 2026-04-27
> **Próxima revisão obrigatória:** quando ANPD publicar regulamentação definitiva do Art. 20 (esperada 2026-2027)
