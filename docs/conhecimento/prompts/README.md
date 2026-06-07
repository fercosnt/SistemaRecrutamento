# Prompt Library — Versionada e Auditável (Híbrido git→DB)

Library de prompts para todas as Edge Functions de IA do M2 Funil RH. Cada template é versionado (SemVer + content_hash + schema_version_required), validado por Zod, e instrumentado para auditoria LGPD Art. 20.

**Architectural pattern**: Híbrido git→DB. Markdown no git é fonte autoritativa; CI script hidrata tabela `prompt_versions` Postgres; Edge Functions consultam **somente o DB** em runtime para canary % + rollback SQL <60s.

📘 **Documentação principal**: [`PRD-ai-prompt-library-m2.md`](../../prds/m2-funil-rh/PRD-ai-prompt-library-m2.md) (37 RFs + 15 RNFs)

## Estrutura da pasta

### Documentos vivos (consultar antes de mudar prompts)
- **[`USAGE.md`](./USAGE.md)** — como Edge Functions consomem (exemplo concreto + helpers `_shared/`)
- **[`RUNBOOK.md`](./RUNBOOK.md)** — procedimentos: deploy PATCH/MINOR, deploy MAJOR, rollback emergencial, gold standard, cost anomaly, PII leak
- **[`CHANGELOG.md`](./CHANGELOG.md)** — versionamento global cronológico

### Pesquisas e auditoria
- **[`PESQUISA-prompt-library-ats.md`](./PESQUISA-prompt-library-ats.md)** — deep research consolidando best practices 2025
- **[`AUDITORIA-LGPD-LOGGING-VERSIONING.md`](./AUDITORIA-LGPD-LOGGING-VERSIONING.md)** — pattern de logging + versionamento + LGPD Art. 20 (schema completo)

### Templates (`templates/`) — prontos para uso

| Arquivo | call_type | Modelo padrão | Uso no funil |
|---|---|---|---|
| **`00-shared-zod-schemas.ts`** | — | — | Schemas Zod + `*_SCHEMA_VERSION` exports |
| **`01-cv-summary.md`** | cv_summary | Haiku 4.5 | Resumo de CV (Etapa 2 — análise individual) |
| **`02-cv-job-match.md`** | cv_job_match | Sonnet 4.6 | Análise match CV × vaga (Etapa 2) |
| **`03-comparative-ranking.md`** | comparative_ranking | Sonnet 4.6 | Comparativo entre candidatos (Etapa 2 + 6) |
| **`04-interview-guide.md`** | interview_guide | Sonnet 4.6 | Geração de guia STAR/PEI (Etapa 4 + 5) |
| **`05-transcript-analysis.md`** | transcript_analysis | Sonnet 4.6 | Análise de transcrição entrevista (Etapa 4) |
| **`06-culture-fit-essay.md`** | culture_fit_essay | Sonnet 4.6 | Avaliação de redação cultural (Etapa 3) |
| **`07-work-sample-sjt.md`** | work_sample_sjt | Sonnet 4.6 | Avaliação de SJT/Work Sample aberto (Etapa 3) |
| **`08-edge-function-reference.ts`** | — | — | Reference implementation completa (Deno + Anthropic + circuit + retry + cost calc) |

**Fallback universal**: GPT-4o-mini (ativado apenas quando circuit breaker Anthropic abrir — 5 falhas em 60s).

### Fontes (`fontes/`) — research que sustenta os templates
- `01-web-best-practices-llm-as-judge.md` — best practices 2025 LLM-as-judge
- `02-anthropic-vs-openai-structured-outputs-caching.md` — comparativo Anthropic × OpenAI
- `03-github-repos-ats-prompts-schemas.md` — repos de referência OSS
- `04-bias-mitigation-llm-judge-academic.md` — bias mitigation acadêmico (counterfactual, DI, kappa)
- `05-production-patterns-logging-versioning-lgpd.md` — patterns de produção + LGPD

## Como Edge Functions consomem (resumo)

Edge Functions **NÃO** importam markdown direto. Em runtime, chamam `loadPrompt(call_type)` que faz query DB:

```typescript
import { loadPrompt } from "../_shared/prompt-loader.ts";
import { callAI } from "../_shared/ai-client.ts";
import { CvJobMatchSchema, CV_JOB_MATCH_SCHEMA_VERSION } from
  "../../../docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts";

const prompt = await loadPrompt("cv_job_match");          // query DB + canary %

// Compat check (fail-fast em mismatch)
if (prompt.schema_version_required !== CV_JOB_MATCH_SCHEMA_VERSION) {
  throw new Error("Schema mismatch — deploy Edge Function antes do prompt");
}

const result = await callAI({
  schema: CvJobMatchSchema,
  prompt,
  cacheable_context: { job_description, critical_competencies, bars_rubric },
  dynamic_input: { cv_text },
  candidato_id, vaga_id, idempotency_key,
});
// callAI internamente: cache, retry, circuit breaker, GPT fallback, logging
```

Ver exemplo completo em [`USAGE.md`](./USAGE.md).

## Versionamento (SemVer + content_hash + schema_version_required)

- **MAJOR** (X.0.0): muda critério avaliativo OU schema Zod (incompatível) — exige gold standard validation
- **MINOR** (x.X.0): novos exemplos few-shot OU expansão de contexto
- **PATCH** (x.x.X): typo, reformulação sem mudança semântica
- **content_hash**: SHA-256 calculado no CI a partir de `system + user + frontmatter sem hash` — tamper-proof
- **schema_version_required**: aponta para `*_SCHEMA_VERSION` em `00-shared-zod-schemas.ts` — permite deploy assíncrono Edge Function vs prompt
- **Imutabilidade**: row em `prompt_versions` com `deployed_at IS NOT NULL` é imutável (trigger PL/pgSQL)
- **Retenção**: forever-while-referenced — purga só órfãs +1y deprecated
- **Filename SEM suffix `-vN`** — histórico vive em git log + DB rows

Procedimento completo de bump em [`RUNBOOK.md`](./RUNBOOK.md) §1 e §2.

## Próximos passos no M2

1. **Phase 0**: migration do schema (AUDITORIA §2 + delta `schema_version_required`); CI sync script `scripts/sync-prompts.ts`; `_shared/{ai-client,prompt-loader,audit-logger,pii-masker,circuit-breaker,injection-detector}.ts`; gold standard pre-deploy n=30
2. **Phase 1**: Edge Function `analise-candidato-individual` consome library (templates 01 + 02); admin UI `/admin/{ai-logs,prompt-versions,ai-costs}`
3. **Phase 2**: Edge Functions Etapa 3 (templates 06 + 07)
4. **Phase 3**: Edge Functions Etapa 4 (templates 04 + 05)
5. **Phase 4**: Edge Functions Etapa 5 + 6 (reuso 03 + 04)
6. **Phase 5**: bias audit completo (counterfactual PT-BR + trimestral n=50)
