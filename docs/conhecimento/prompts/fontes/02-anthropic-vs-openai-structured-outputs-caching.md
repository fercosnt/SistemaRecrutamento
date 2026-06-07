# Subagente 2 — Anthropic vs OpenAI: Structured Outputs + Caching + Modelos

> Coletado em 2026-04-27 via deep-research subagente (Sonnet)
> Fontes: docs.anthropic.com, platform.claude.com, openai SDK docs (Context7), supabase docs

---

# Comparativo Técnico Anthropic vs OpenAI para ATS em Supabase Edge Functions (Deno)

## 1. Tabela Comparativa Central

| Dimensão | Anthropic (Sonnet 4.6) | Anthropic (Haiku 4.5) | OpenAI (GPT-4o) | OpenAI (GPT-4o-mini) |
|---|---|---|---|---|
| **Input base** | $3 / MTok | $1 / MTok | ~$2.50 / MTok | ~$0.15 / MTok |
| **Output base** | $15 / MTok | $5 / MTok | ~$10 / MTok | ~$0.60 / MTok |
| **Cache write (5m)** | $3.75 / MTok (+25%) | $1.25 / MTok (+25%) | Automático, sem custo adicional | Automático, sem custo adicional |
| **Cache read** | $0.30 / MTok (10% do base) | $0.10 / MTok (10% do base) | ~50% de desconto no input | ~50% de desconto no input |
| **Contexto** | 1M tokens | 200k tokens | 128k tokens | 128k tokens |
| **Structured output** | Tool use + `strict: true` + `.parse()` + Zod nativo | Idem | `response_format.json_schema` strict mode + `.parse()` + Zod nativo | Idem |
| **Garantia JSON** | Alta (strict tool use) | Alta | Muito alta (strict mode bloqueia refusals e falhas de schema) | Alta |
| **Latência típica 500 tokens** | ~2-4s | ~1-2s | ~3-5s | ~1-2s |
| **Fine-tuning** | Não disponível (Claude 4.x) | Não disponível | Disponível (GPT-4o e gpt-4o-mini) | Disponível |
| **Cache TTL** | 5 min (padrão) ou 1h (2x custo) | Idem | Automático (~1h estimado) | Automático |
| **Mínimo para cache** | 2.048 tokens (Sonnet 4.6) | 4.096 tokens (Haiku 4.5) | 1.024 tokens prefix | 1.024 tokens prefix |
| **Deno / Edge support** | Sim (`npm:@anthropic-ai/sdk`) | Sim | Sim (`npm:openai`) | Sim |
| **Zod integration** | `zodOutputFormat()` via `@anthropic-ai/sdk/helpers/zod` | Idem | `zodResponseFormat()` via `openai/helpers/zod` | Idem |

---

## 2. Structured Outputs / JSON Mode

### Anthropic — `messages.parse()` com Zod (recomendado)

```typescript
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const CandidateEvaluation = z.object({
  overall_score: z.number().min(0).max(100),
  bars_dimensions: z.array(z.object({
    dimension: z.string(),
    score: z.number().min(1).max(5),
    evidence: z.string(),
    level: z.enum(['exemplary', 'proficient', 'developing', 'inadequate']),
  })),
  recommendation: z.enum(['advance', 'hold', 'reject']),
  reasoning: z.string(),
  red_flags: z.array(z.string()).optional(),
});

const result = await client.messages.parse({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: resumeText }],
  output_config: { format: zodOutputFormat(CandidateEvaluation, 'evaluation') },
});

const evaluation = result.parsed_output;
```

**Edge cases Anthropic:**
- Nested objects profundos: suportados sem limite documentado
- Arrays de objetos complexos: suportados
- Optional fields com `z.optional()` ou `.nullable()`: suportados
- `additionalProperties: false` aplicado automaticamente
- Falha de parsing: retorna `null` em `parsed_output`, não quebra o fluxo

### OpenAI — Structured Outputs com strict mode

```typescript
import { zodResponseFormat } from 'openai/helpers/zod';

const completion = await client.chat.completions.parse({
  model: 'gpt-4o-2024-08-06',
  messages: [/* ... */],
  response_format: zodResponseFormat(CandidateEvaluation, 'evaluation'),
});

const evaluation = completion.choices[0]?.message.parsed;
```

**Diferenças OpenAI:**
- Refusals explícitas: pode retornar `finish_reason: "content_filter"` com `refusal` field — tratamento obrigatório
- `additionalProperties: false` aplicado automaticamente
- `anyOf` com tipos mistos pode ser problemático
- `$ref` em schema requer unfolding manual
- GPT-4o-mini suporta structured outputs desde update de agosto 2024

### Robustez Comparada

- Ambos altamente confiáveis com Zod helpers
- OpenAI strict mode é mais rigoroso ao nível do modelo (rejeita tokens fora do schema)
- Anthropic depende do modelo seguir instruções (muito confiável com Sonnet/Haiku 4.x)
- Para volume alto: equivalentes com os helpers certos

---

## 3. Prompt Caching — Análise Completa

### Anthropic — Mecanismo Explícito

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: `SISTEMA ATS — RUBRIC BARS\n\n${jobDescription}\n\n${barsRubric}`,
      cache_control: { type: 'ephemeral' }, // breakpoint — tudo acima é cacheado
    }
  ],
  messages: [
    { role: 'user', content: `Avalie o candidato:\n${resumeText}` }
  ],
});

// Verificar hit
const { cache_read_input_tokens, cache_creation_input_tokens } = response.usage;
const cacheHit = cache_read_input_tokens > 0;
```

**Requisitos por modelo (2026):**

| Modelo | Tokens mínimos para cache |
|---|---|
| Claude Sonnet 4.6 | **2.048 tokens** |
| Claude Haiku 4.5 | **4.096 tokens** |
| Claude Haiku 3.5 | 2.048 tokens |

### Análise de ROI — ATS

**Premissa:** vaga + rubric BARS = 3.000 tokens, output = 500 tokens, 100 candidatos/vaga

**Sonnet 4.6 sem caching:**
- Input: 3.800 × 100 × $3/MTok = $1.14
- Output: 500 × 100 × $15/MTok = $0.75
- **Total: $1.89 por vaga / 100 candidatos**

**Sonnet 4.6 com caching (5-min TTL):**
- 1 cache write: 3.000 × $3.75/MTok = $0.011
- 99 cache reads: 3.000 × 99 × $0.30/MTok = $0.089 (vs $0.891 sem cache)
- Input variável: 800 × 100 × $3/MTok = $0.24
- Output: 500 × 100 × $15/MTok = $0.75
- **Total: $1.09** — economia ~42% nos tokens de contexto

**1.000 candidatos com 1h TTL (assíncrono):**
- Cache write 1h: 3.000 × $6.00/MTok = $0.018 (uma vez)
- 999 reads: 3.000 × 999 × $0.30/MTok = $0.899
- Vs sem cache: 3.000 × 1.000 × $3/MTok = $9.00
- **Economia no contexto: 90%**

### OpenAI — Caching Automático

- Funciona automaticamente sem marcadores explícitos
- Prefixo imutável cacheado por ~1h
- Mínimo: 1.024 tokens de prefixo
- Desconto: ~50% nos cached input tokens
- Sem custo de write adicional
- Menos controle: você não sabe com certeza o que foi cacheado

**Vantagem OpenAI:** Zero configuração, automático
**Vantagem Anthropic:** Controle explícito, verificação via `usage`, TTL configurável (5min ou 1h)

---

## 4. Recomendação de Modelo por Uso (7 Etapas ATS)

| # | Uso no ATS | Modelo Recomendado | Justificativa |
|---|---|---|---|
| 1 | **Resumo de CV** (parse + 3-4 parágrafos estruturados) | **Haiku 4.5** | Output estruturado simples; latência crítica; não requer raciocínio complexo |
| 2 | **Match CV × vaga** (score 0-100 + justificativa) | **Sonnet 4.6** | Raciocínio nuançado; precisa extrair evidências; rubric BARS cacheável; erros caros |
| 3 | **Comparativo N candidatos** (ranking) | **Sonnet 4.6** | Precisa ponderar trade-offs entre candidatos; síntese qualitativa |
| 4 | **Geração guia entrevista** (5-7 perguntas STAR/PEI + BARS) | **Sonnet 4.6** | Criatividade contextual; qualidade percebida pelos candidatos |
| 5 | **Análise transcrição entrevista** (score por competência + citação) | **Sonnet 4.6** | Análise nuançada de evidências; flags de viés requerem raciocínio |
| 6 | **Avaliação redação fit cultural** (score 1-5 BARS) | **Sonnet 4.6** | Nuance qualitativa; rubric repetido = cacheável |
| 7 | **Scoring Work Sample/SJT aberto** | **Sonnet 4.6** | Casos clínicos exigem raciocínio profissional |

**Nota:** Use Haiku 4.5 ou GPT-4o-mini APENAS para Uso 1 (resumo). Os 6 usos avaliativos precisam de Sonnet 4.6 / GPT-4o.

---

## 5. Estimativa de Custo por Candidato — Funil Completo

**Premissas:**
- Vaga + rubric BARS = 3.000 tokens (cacheados)
- Resume médio = 800 tokens input
- Output médio por uso = 400 tokens
- Batch size: 50 candidatos (cache hit em 5 min)

### Stack Anthropic (Haiku 4.5 + Sonnet 4.6)

| Uso | Modelo | Input não-cached | Input cached (3k) | Output | Custo/candidato |
|---|---|---|---|---|---|
| 1. Resumo CV | Haiku 4.5 | 800 tok | - | 400 tok | $0.0028 |
| 2. Match | Sonnet 4.6 | 500 tok | 3.000 tok | 800 tok | $0.01440 |
| 3. Comparativo | Sonnet 4.6 | 1.500 tok | - | 800 tok | $0.01650 |
| 4. Guia entrevista | Sonnet 4.6 | 300 tok | 3.000 tok | 500 tok | $0.01240 |
| 5. Transcrição | Sonnet 4.6 | 4.000 tok | 1.500 tok | 600 tok | $0.02145 |
| 6. Redação fit | Sonnet 4.6 | 600 tok | 1.500 tok | 400 tok | $0.00825 |
| 7. SJT/Work sample | Sonnet 4.6 | 1.000 tok | 1.500 tok | 500 tok | $0.01290 |
| **TOTAL** | | | | | **~$0.090/candidato** |

**Para 1.000 candidatos por vaga:** ~$90 com caching otimizado
**Sem caching:** ~$130-140 (estimativa)
**Economia com caching:** ~32-35%

---

## 6. Edge Functions Supabase + Deno — Implementação

### Importação dos SDKs em Deno

```typescript
// Suportado pelo Deno moderno usado em Supabase
import Anthropic from 'npm:@anthropic-ai/sdk@0.52.0';
import OpenAI from 'npm:openai@4.104.0';

// Alternativa via esm.sh
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.52.0';
```

### Edge Function Completa — Anthropic com Caching + Structured Output

```typescript
// supabase/functions/evaluate-candidate/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod';
import { z } from 'npm:zod';

const client = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
  timeout: 120_000, // Edge limit é 150s
  maxRetries: 2,
});

const BarsEvaluation = z.object({
  overall_score: z.number().min(0).max(100),
  dimensions: z.array(z.object({
    name: z.string(),
    score: z.number().min(1).max(5),
    evidence: z.string(),
    level: z.enum(['exemplary', 'proficient', 'developing', 'inadequate']),
  })),
  recommendation: z.enum(['advance', 'hold', 'reject']),
  reasoning: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
});

serve(async (req: Request) => {
  try {
    const { jobDescription, barsRubric, resumeText } = await req.json();

    // Estrutura otimizada: contexto estável PRIMEIRO
    const response = await client.messages.parse({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: `Você é um avaliador senior de RH especializado em BARS.

## DESCRIÇÃO DA VAGA
${jobDescription}

## RUBRIC BARS
${barsRubric}

Avalie currículos com base estritamente nesta rubric. Seja objetivo e baseie-se em evidências concretas.`,
          cache_control: { type: 'ephemeral' }, // TTL 5 min
        }
      ],
      messages: [
        { role: 'user', content: `Avalie o seguinte candidato:\n\n${resumeText}` }
      ],
      output_config: {
        format: zodOutputFormat(BarsEvaluation, 'bars_evaluation'),
      },
    });

    const evaluation = response.parsed_output;
    const cacheStats = {
      cacheHit: (response.usage.cache_read_input_tokens ?? 0) > 0,
      cachedTokens: response.usage.cache_read_input_tokens ?? 0,
      freshTokens: response.usage.input_tokens,
    };

    return new Response(
      JSON.stringify({ evaluation, cacheStats }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      const status = error.status ?? 500;
      const retryable = status === 429 || status >= 500;
      return new Response(
        JSON.stringify({ error: error.message, retryable }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### Gerenciamento de Secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets list

# No código Deno:
const apiKey = Deno.env.get('ANTHROPIC_API_KEY')!;
```

**Vault vs env vars:**
- ATS standalone: `supabase secrets set` é suficiente
- Multi-tenant SaaS: Vault para keys por tenant

---

## 7. Fine-tuning vs Prompt Engineering

### OpenAI Fine-tuning
- Modelos: `gpt-4o-mini` (mais comum), `gpt-4o`
- Dataset mínimo: 10 exemplos (prático: 50-100+)
- Custo treinamento: ~$0.025/MTok training tokens
- Inferência pós-FT: 2x preço base
- **Vale para:** volume > 50k req/mês com mesma tarefa, estilo muito específico

### Anthropic — Sem Fine-tuning Público (Claude 4.x)
- Foco em prompt engineering, cached prompts, Constitutional AI
- Compensação: few-shot examples no system prompt (cacheados)

### Decisão para o ATS
**Não há necessidade de fine-tuning em 2026:**
1. Schema BARS rico o suficiente via prompt
2. Com caching, custo de repetir contexto é mínimo
3. Volume de ATS próprio não justifica overhead
4. Se escalar 100k+ aval/mês, GPT-4o-mini fine-tuned pode ser mais barato

---

## 8. Gaps Identificados

1. **Cache TTL 5 min vs batch assíncrono:** Pipeline assíncrono (candidatos ao longo do dia) perde hits. Use TTL de 1h para batch.

2. **Mínimo Haiku 4.5 (4.096 tokens):** Rubric + JD precisam ter ≥ 4.096 tokens. Se menor: Haiku 3.5 (2.048) ou adicionar instruções.

3. **OpenAI caching não verificável facilmente:** Use `?.` defensivo em `prompt_tokens_details.cached_tokens`.

4. **Supabase Edge timeout:** 150s default (configurável até 400s no Pro). Monitore latência em Sonnet 4.6.

5. **OpenAI structured outputs limitações:** `z.union()` 3+ tipos, `z.discriminatedUnion()`, `z.record()` podem causar problemas. Teste antes.

6. **Sem streaming + JSON validado:** Use sem streaming para outputs estruturados.

---

## 9. Top Fontes Oficiais

1. Anthropic Pricing: https://platform.claude.com/docs/en/about-claude/pricing
2. Anthropic Prompt Caching: https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching
3. Anthropic Models Overview: https://platform.claude.com/docs/en/docs/about-claude/models/overview
4. Anthropic SDK TypeScript (Context7): `/anthropics/anthropic-sdk-typescript`
5. OpenAI Node SDK (Context7): `/openai/openai-node`
6. Supabase Secrets/Env Vars: https://supabase.com/docs/guides/functions/secrets
7. Anthropic Tool Use Overview: https://platform.claude.com/docs/en/docs/build-with-claude/tool-use/overview

---

## Recomendação Final

**Stack recomendada:** Anthropic como provider principal — Sonnet 4.6 (usos 2-7) + Haiku 4.5 (uso 1)
- Caching explícito e verificável ideal para vaga+rubric repetido
- Sonnet 4.6 com 1M contexto elimina preocupação com CVs longos
- Zod integration nativa madura
- **Total estimado:** ~$90/1000 candidatos com caching otimizado

**OpenAI GPT-4o-mini como fallback / A/B testing:**
- Caching automático sem overhead
- Input muito mais barato ($0.15 vs $1/MTok) para volume alto

**Estrutura de cache obrigatória:**
```
[tools/schema] → [system: JD + BARS rubric + cache_control] → [messages: resume]
```
