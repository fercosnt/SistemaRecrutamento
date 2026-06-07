# Prompt Library — USAGE.md

Como Edge Functions Deno consomem a biblioteca de prompts em runtime.

**Architectural pattern**: Híbrido git→DB.
- **Git**: markdown em `templates/*.md` é fonte autoritativa (diff + blame + PR review)
- **DB**: tabela `prompt_versions` Postgres é runtime (canary % + rollback SQL <60s)
- **Edge Functions**: consultam **somente o DB** — NUNCA filesystem read em runtime

Documentação completa em [`PRD-ai-prompt-library-m2.md`](../../prds/m2-funil-rh/PRD-ai-prompt-library-m2.md).

---

## 1. Estrutura de uma Edge Function consumidora

```
supabase/functions/
├── _shared/
│   ├── ai-client.ts          # wrapper Anthropic + OpenAI fallback + retry + cost
│   ├── prompt-loader.ts      # query DB + canary % routing
│   ├── audit-logger.ts       # INSERT em ai_call_logs (PII mascarada)
│   ├── pii-masker.ts         # regex PT-BR (CPF, CNPJ, email, tel, RG, endereço, data nasc)
│   ├── circuit-breaker.ts    # in-memory, 5 falhas em 60s
│   └── injection-detector.ts # regex anti prompt-injection
└── analise-candidato-individual/
    └── index.ts              # consome _shared/* — 80 linhas no típico
```

---

## 2. Exemplo concreto — `analise-candidato-individual`

```typescript
// supabase/functions/analise-candidato-individual/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  CvJobMatchSchema,
  CV_JOB_MATCH_SCHEMA_VERSION,
  type CvJobMatch,
} from "../../../docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";
import { callAI } from "../_shared/ai-client.ts";
import { logAICall } from "../_shared/audit-logger.ts";
import { detectInjection } from "../_shared/injection-detector.ts";

const CALL_TYPE = "cv_job_match" as const;

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.json();
  const {
    candidato_id,
    vaga_id,
    cv_text,
    job_description,
    critical_competencies,
    bars_rubric,
    idempotency_key,
  } = body;

  // 1. Validação de input
  if (!candidato_id || !vaga_id || !cv_text || cv_text.trim().length < 50) {
    return new Response(
      JSON.stringify({ error: "invalid_input" }),
      { status: 400 }
    );
  }

  // 2. Detecção de prompt injection
  const injection = detectInjection(cv_text);
  if (injection.detected) {
    await logAICall({
      candidato_id, vaga_id, call_type: CALL_TYPE,
      error_code: "prompt_injection_detected",
      error_message: `Pattern: ${injection.pattern}`,
      idempotency_key,
    });
    return new Response(
      JSON.stringify({ flagged_for_human_review: true, score: 10 }),
      { status: 200 }
    );
  }

  // 3. Carregar prompt da DB (canary % routing aplicado dentro)
  const prompt = await loadPrompt(CALL_TYPE);

  // 4. Validar compat schema (fail-fast em mismatch)
  if (prompt.schema_version_required !== CV_JOB_MATCH_SCHEMA_VERSION) {
    console.error(
      `[Schema mismatch] DB requires ${prompt.schema_version_required}, code has ${CV_JOB_MATCH_SCHEMA_VERSION}`
    );
    return new Response(
      JSON.stringify({ error: "schema_version_mismatch" }),
      { status: 503 }
    );
  }

  // 5. Chamar IA — wrapper trata: cache, retry, circuit breaker, fallback GPT, logging
  const result = await callAI({
    schema: CvJobMatchSchema,
    prompt,                                // contém system_template, user_template, model_id, etc
    cacheable_context: {
      // Marcado cache_control: ephemeral em ai-client.ts
      job_description,
      critical_competencies,
      bars_rubric,
    },
    dynamic_input: {
      // NÃO cacheado
      cv_text,
    },
    candidato_id,
    vaga_id,
    idempotency_key,
  });

  // 6. Aggregate em candidate_ai_decisions (separate logic — fora deste exemplo)
  // ...

  return new Response(
    JSON.stringify({
      ...result.parsed,
      metadata: {
        prompt_version: prompt.semver,
        model: result.model_used,         // 'claude-sonnet-4-6' ou 'gpt-4o-mini' se fallback
        cache_hit: result.cache_hit,
        cost_usd: result.cost_usd,
        latency_ms: result.latency_ms,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
```

---

## 3. `_shared/prompt-loader.ts` — query DB + canary

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export type LoadedPrompt = {
  id: string;
  semver: string;
  content_hash: string;
  call_type: string;
  system_template: string;
  user_template: string;
  model_id: string;
  fallback_model_id: string;
  temperature: number;
  max_tokens: number;
  schema_version_required: string;
  is_canary: boolean;
};

export async function loadPrompt(call_type: string): Promise<LoadedPrompt> {
  // Query active + canary em paralelo
  const [activeResult, canaryResult] = await Promise.all([
    supabase
      .from("prompt_versions")
      .select("*")
      .eq("call_type", call_type)
      .eq("is_active", true)
      .eq("is_canary", false)
      .single(),
    supabase
      .from("prompt_versions")
      .select("*")
      .eq("call_type", call_type)
      .eq("is_canary", true)
      .maybeSingle(),
  ]);

  if (activeResult.error || !activeResult.data) {
    throw new Error(`No active prompt for call_type=${call_type}`);
  }

  const active = activeResult.data;
  const canary = canaryResult.data;

  // Canary % routing
  if (canary && canary.canary_pct > 0) {
    if (Math.random() * 100 < canary.canary_pct) {
      console.log(
        `[Canary] Using ${canary.semver} (${canary.canary_pct}%) for ${call_type}`
      );
      return { ...canary, is_canary: true };
    }
  }

  return { ...active, is_canary: false };
}
```

---

## 4. `_shared/ai-client.ts` — Anthropic + GPT fallback

Usa o reference completo em [`templates/08-edge-function-reference.ts`](./templates/08-edge-function-reference.ts) como base. Key patterns:

- **Cache control**: `cacheable_context` recebe array de chunks marcados `{ type: "text", text, cache_control: { type: "ephemeral" } }`
- **Retry**: 3 tentativas com exponential backoff (1s, 2s, 4s + jitter ±500ms) intra-call
- **Circuit breaker**: 5 falhas em 60s → OPEN → próxima call usa GPT-4o-mini
- **Cost calc**: `input × p.input + cached_read × p.cached_read + output × p.output` (preços em `COST_PER_TOKEN` const)
- **Idempotency**: se `idempotency_key` já existe em `ai_call_logs`, retorna resultado cacheado com header `X-Idempotent-Replay: true`

---

## 5. `_shared/audit-logger.ts` — INSERT pseudonimizado

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";
import { maskPII } from "./pii-masker.ts";

const supabase = createClient(/* ... */);

export async function logAICall(params: {
  candidato_id: string;
  vaga_id: string;
  call_type: string;
  prompt_version_id?: string;
  prompt_hash?: string;
  provider?: "anthropic" | "openai";
  model_id?: string;
  model_snapshot?: string;
  system_prompt?: string;
  user_prompt_template?: string;
  input_token_count?: number;
  raw_response?: any;
  parsed_score?: number;
  parsed_reasoning?: string;
  output_token_count?: number;
  latency_ms?: number;
  attempt_number?: number;
  cost_usd?: number;
  success?: boolean;
  error_code?: string;
  error_message?: string;
  idempotency_key?: string;
  retain_until?: string;
}) {
  // PII masking ANTES de salvar (defense-in-depth — templates já são pseudonimizados)
  const safeUserTemplate = params.user_prompt_template
    ? maskPII(params.user_prompt_template)
    : null;

  // Retention based on outcome
  const retainDays = params.parsed_score && params.parsed_score >= 50 ? 365 * 5 : 180;
  const retainUntil = params.retain_until ?? new Date(
    Date.now() + retainDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  await supabase.from("ai_call_logs").insert({
    ...params,
    user_prompt_template: safeUserTemplate,
    retain_until: retainUntil,
    triggered_by: "system",
    success: params.success ?? false,
  });
}
```

---

## 6. Frontmatter mínimo de um template

```yaml
---
id: cv_job_match                              # mesmo do call_type
call_type: cv_job_match                       # enum llm_call_type
semver: "2.1.0"                               # X.Y.Z, manual bump por dev
content_hash: tbd                             # CI calcula SHA-256
schema_version_required: "1.0.0"              # *_SCHEMA_VERSION em 00-shared
model_id: claude-sonnet-4-6
fallback_model_id: gpt-4o-mini
temperature: 0
max_tokens: 2048
change_summary: "Adicionado peso para experiência com Kafka"
changed_by: tech-lead@beauty-smile.com.br
created_at: 2026-04-27
estimated_cost_per_call_usd: 0.0144
---

# Template 2 — Análise Match CV × Vaga

## SYSTEM PROMPT
[texto do system prompt — usado direto pela API Anthropic]

## USER MESSAGE TEMPLATE
[texto com placeholders {{CV_TEXT_ANONYMIZED}}, {{JOB_DESCRIPTION}}, etc]

## OUTPUT SCHEMA (Zod)
import { CvJobMatchSchema } from "./00-shared-zod-schemas.ts";
```

CI script `scripts/sync-prompts.ts` parseia frontmatter (validação Zod), extrai system+user, calcula content_hash (SHA-256 sobre `system + user + JSON.stringify(frontmatter sem hash)`), faz UPSERT em `prompt_versions` com `is_active=false, is_canary=false`.

---

## 7. Procedimento de deploy de nova versão (resumo — full em `RUNBOOK.md`)

```
PR alterando templates/02-cv-job-match.md (semver: 2.0.5 → 2.1.0)
  ↓
GitHub Action rodando sync-prompts.ts
  ↓
INSERT INTO prompt_versions (semver=2.1.0, is_active=false, is_canary=false, content_hash=<sha>)
  ↓
[manual via /admin/prompt-versions UI]
SELECT promote_to_canary('cv_job_match', '2.1.0', 10)
  ↓
10% do tráfego em v2.1.0 por 24-48h
  ↓
Verificar métricas: error rate, custo, gold standard 30 casos
  ↓
SELECT promote_canary_to_active('cv_job_match', '2.1.0')
  ↓
v2.0.5 → is_active=false, deprecated_at=NOW()
v2.1.0 → is_active=true, canary_pct=0
  ↓
Em emergência (bias detected):
SELECT rollback_to_version('cv_job_match', '2.0.5')
```

---

## 8. Constraints e Gotchas

- **NUNCA** edite uma row de `prompt_versions` com `deployed_at IS NOT NULL` — trigger PL/pgSQL bloqueia
- **NUNCA** importe templates diretamente em Edge Function (`import { CV_PROMPT } from '...'`) — sempre via `loadPrompt()` para passar pelo canary routing
- Schema Zod é **deep-frozen** — bumpar `*_SCHEMA_VERSION` exige bump correspondente em `schema_version_required` no template
- `idempotency_key` deve ser UUID v4 client-gen (usar `crypto.randomUUID()` no client) — evita conflitos entre clientes
- Templates são **pseudonimizados** (sem dados reais) — nada de PII vaza para logs mesmo se masking falhar
- Cache TTL Anthropic é 5min default (`ephemeral`); cold-call (no recent activity) recolhe write penalty (1.25× input)
- Circuit breaker é **in-memory por isolate** — Supabase Edge Functions têm isolates efêmeros, então breaker reset em cold start; isso é aceitável (raros cold starts vs alto tráfego)

---

## 9. Onde reportar problemas

- **Schema mismatch** ao deploy: verificar `00-shared-zod-schemas.ts` exports vs frontmatter `schema_version_required`
- **CI sync falhando**: log do GitHub Action; geralmente é `change_summary` vazio ou `semver` regex inválido
- **Trigger imutabilidade bloqueando rollback**: rollback usa colunas `is_active/deprecated_at` que estão fora da lista do trigger; se erro persistir, abrir issue
- **Canary % não roteia**: verificar `prompt_versions WHERE is_canary=true AND call_type=X` retorna 1 row; verificar `canary_pct > 0`
- **Custo explodindo**: dashboard `/admin/ai-costs`; verificar `ai_cost_daily` agregado; se cache hit rate <20%, investigar
