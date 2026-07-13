# Phase 23: Ressurreição da Stack de IA - Research

**Researched:** 2026-07-05
**Domain:** Deno Edge Functions (Supabase) · Anthropic/OpenAI SDK runtime · prompt-library versioning · psychometric honesty (frontend)
**Confidence:** HIGH (every claim tagged; call_type map + SDK error class + audit findings cross-verified against source at file:line)

## Summary

A stack de IA (`supabase/functions/_shared/*` + 7 EFs) tem toda a infraestrutura de resiliência **presente mas morta**: `SCHEMA_VERSIONS` conhece chaves fictícias de Phase-9, então 5 dos 7 call_types caem num `catch {}` mudo que roda um prompt-stub de 1 linha; o circuit breaker é instanciado por-chamada (nunca abre); o `isRetryable` não casa a mensagem literal do SDK (`"Request timed out."`); e os guardrails de custo só olham uma agregação diária de ontem. Este phase **religa** cada peça e substitui o percentil bruto por descritor qualitativo — mantendo IA como recomendação, nunca decisão (RNF-07a).

O achado central (AI-01) é maior do que "5 de 7": 4 dos 5 quebrados (`work_sample_sjt`, `culture_fit_essay`, `transcript_analysis`, `interview_guide`) só precisam da chave em `SCHEMA_VERSIONS` + catch estreitado; mas o 5º (`bigfive_devolutiva`) **nem existe no enum `llm_call_type`** — não há row em `prompt_versions` possível, o loadPrompt lança `PromptNotConfiguredError`, e mais: toda escrita em `ai_call_logs` da devolutiva falha silenciosamente (a coluna `call_type` é o enum). Consertá-lo exige uma migration (ALTER TYPE ADD VALUE) + seed + sync + SCHEMA_VERSIONS, não só uma linha.

**Primary recommendation:** Alinhar `SCHEMA_VERSIONS` ao enum real (8 call_types), estreitar os 7 catches para propagar `SchemaVersionMismatchError`/`PromptNotConfiguredError` como 500 estruturado (o próprio 500 é o alarme — o "0.0.0 em ai_call_logs" **não persiste** por causa da FK uuid), estender o enum p/ `bigfive_devolutiva`, trocar o default do breaker por um singleton module-level com invariante `THRESHOLD ≤ MAX_ATTEMPTS`, casar o timeout por `err.name === "APIConnectionTimeoutError"` + regex `/tim(e|ed)\s*out/i`, `parseIntEnv` nos 2 sites de env numérico, replay só de sucesso, guardrails com kill-switch pré-chamada + janela real + canal que não é silenciável, e banda qualitativa no lugar do percentil. **Redeployar as 7 EFs** (bundle-freeze) e manter imports `npm:` estáticos.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Resolução de versão de prompt (AI-01) | API / Backend (`_shared/prompt-loader.ts`) | Database (`prompt_versions`, enum `llm_call_type`) | O runtime lê o DB; a verdade de call_types é o enum + rows ativas |
| Circuit breaker / retry / timeout (AI-02/03/04/07) | API / Backend (`_shared/ai-client.ts`, `circuit-breaker.ts`) | — | Estado in-memory por-isolate; puro, sem DB |
| Idempotência / replay (AI-05) | API / Backend (`_shared/ai-client.ts`) | Database (`ai_call_logs.idempotency_key` UNIQUE) | Lookup no DB, decisão no runtime |
| Guardrails de custo (AI-06) | Database (trigger `notify_cost_anomaly`, cron aggregation) | API/Backend (`cost-alerter` EF + kill-switch em `callAi`) | Detecção no DB; corte de gasto precisa acontecer em runtime na EF |
| Descritor qualitativo (UX-07) | Browser / Client (`DevolutivaBigFiveView`, `ScorecardAvaliacao`, `ScoreCard`) | API/Backend (`gerar-devolutiva-bigfive` prompt input) | O número é exibido no client; a EF não deve alimentar o percentil cru ao LLM |
| Consolidação sem triagem + ≥2 etapas (UX-09) | API / Backend (`consolidar-decisao-final` EF) | Browser (`ConsolidacaoDashboard` renderiza null) | Gate server-authoritative; o client só reflete o `consolidated: null` |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Prompt library revival + circuit breaker (AI-01/02)**
- **AI-01 — reconciliar SCHEMA_VERSIONS:** substituir as chaves órfãs de Phase-9 (`sjt_evaluation`, `cv_summary`, `reference_check`, `final_recommendation`, etc.) pelos call_types REAIS que as 7 EFs passam a `loadPrompt(...)` — fonte de verdade = as rows de `prompt_versions` seedadas + os call sites das EFs. Dropar os placeholders mortos.
- **AI-01 — catch + alarme:** estreitar o catch nas EFs para NÃO degradar `SchemaVersionMismatchError`/`PromptNotConfiguredError` num stub silencioso (deixar propagar como erro estruturado); emitir um alarme no ai-logs (row/flag) quando um call_type resolver para `prompt_version` 0.0.0.
- **AI-02 — breaker compartilhado:** singleton module-level exportado de `circuit-breaker.ts`, injetado por TODA EF em `callAi` via `deps.breaker`. Estado in-memory por-isolate (aceito).
- **AI-02 — THRESHOLD:** env-configurável mantendo a invariante **THRESHOLD ≤ MAX_ATTEMPTS** (default 3, casando com MAX_ATTEMPTS default 3).

**Retry / timeout / idempotência (AI-03/04/05/07)**
- **AI-03 — casar timeout:** `isRetryable` deve casar por tipo (`APIConnectionTimeoutError` — checar `err.name`/`constructor.name`) E por regex ampliada `/tim(e|ed)\s*out/i`. Corrigir o comentário errado (~linha 382).
- **AI-04 — timeout do avaliar-transcricao-entrevista:** passar `timeoutMs` override de **60s** (precedente do `gerar-guia-entrevista` P21), env-overridable.
- **AI-05 — replay regenerável:** `tryIdempotencyReplay` faz replay APENAS de linhas de SUCESSO; falha cacheada (`success=false`) cai para chamada nova.
- **AI-07 — guarda de NaN:** helper `parseIntEnv(name, default)` em `MAX_ATTEMPTS` e `AI_CALL_TIMEOUT_MS`: NaN ou ≤0 → default (3 / 25000).

**Guardrails de custo + honestidade psicométrica (AI-06, UX-07/09)**
- **AI-06 — guardrails de custo:** corrigir escopo/janela/canal reais (rolling diário, per-vaga + global) e um canal que alarma de verdade — não detect-only com 1 dia de atraso.
- **UX-07 — percentil→descritor:** remover o percentil numérico bruto da devolutiva e das telas RH, substituindo por bandas qualitativas ("abaixo do esperado / dentro do esperado / acima do esperado" — bandas finais definidas no plano, alinhadas ao enquadramento psicométrico já usado). Nenhum número cru de percentil exposto.
- **UX-09 — triagem fora da consolidação:** REMOVER o peso de `triagem` das chaves ponderadas E exigir ≥2 etapas concluídas antes de exibir um número consolidado.
- **Escopo/redeploy:** toca as 7 EFs de IA + `_shared/*` + telas frontend. Cada EF tocada é REDEPLOYADA (bundle-freeze); imports `npm:` ESTÁTICOS preservados.

### Claude's Discretion
- Os call_types exatos dos 7 (enumerados abaixo — **resolvido nesta pesquisa**).
- O shape exato do alarme 0.0.0 (nova coluna/flag em ai_call_logs vs row de alerta dedicada). **Recomendação abaixo.**
- As bandas qualitativas exatas do UX-07 (nº de bandas + labels pt-BR) dentro da restrição "sem número cru".
- Detalhe interno do cost-guardrail (escopo/janela) conforme `ai-cost.ts` + cost-alerter mapeados abaixo.
- Assinatura exata de `parseIntEnv`.

### Deferred Ideas (OUT OF SCOPE)
- Autorização/PII das EFs de IA (autenticar-E-autorizar, IDOR) → **Phase 24** (NÃO apertar authz/verify_jwt aqui).
- Seed real do banco de itens cognitivo (CC0-01) → M5/PSICO.
- Calibração real do SJT / LLM-as-judge / norma local do cognitivo → M5.
- WR-02 do Phase 22 (literal `psicólogo(a)` no gerar-devolutiva-bigfive) — já RESOLVIDO em 22-04 via fragment-join; se a devolutiva for tocada, manter a solução existente.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | 7 call_types com prompt real + alarme 0.0.0 + catch restrito `(A3)` | Tabela definitiva de call_types (§AI-01); 5 quebrados mapeados a file:line; `bigfive_devolutiva` precisa enum+seed+sync (achado novo); alarme deve ser no catch, não scan de ai_call_logs (FK uuid impede persistir 0.0.0) |
| AI-02 | Circuit breaker instância compartilhada + THRESHOLD ≤ MAX_ATTEMPTS `(A4)` | `deps.breaker ?? new CircuitBreaker()` (ai-client.ts:300); zero EFs injetam (grep confirmado); singleton module-level + THRESHOLD env default 3 |
| AI-03 | `isRetryable` casa `"Request timed out."` `(A5)` | Confirmado no source oficial do SDK: `APIConnectionTimeoutError`, msg `"Request timed out."`, sem status; regex atual `/timeout/i` falha; teste mascara com `"529 overloaded"` |
| AI-04 | `avaliar-transcricao-entrevista` timeoutMs override `(A6)` | Call site sem `timeoutMs` (index.ts:208-226); precedente `gerar-guia-entrevista:274` (`60_000`); template `transcript_analysis` max_tokens 4000 |
| AI-05 | Replay de idempotência regenerável `(A23)` | `tryIdempotencyReplay` (ai-client.ts:252-279) devolve `success=false`; mapa de impacto por EF (§AI-05) |
| AI-06 | Guardrails de custo escopo/janela/canal corretos `(A24)` | Cadeia trigger→cron→cost-alerter mapeada; 4 furos verificados; kill-switch pré-chamada recomendado |
| AI-07 | `parseIntEnv` NaN guard `(A48)` | 2 sites: ai-client.ts:70,78 (únicos `Number(Deno.env.get)` numéricos) |
| UX-07 | Devolutiva + telas RH sem percentil cru `(QW12)` | Sites exatos: `DevolutivaBigFiveView:168/171/198`, `ScorecardAvaliacao:276`, `ScoreCard`; EF injeta percentil no prompt (:597) |
| UX-09 | Peso triagem fora da consolidação + ≥2 etapas `(QW8)` | `WEIGHTED_KEYS` inclui `triagem` (consolidar:99); gate `presentRows.length > 0` (:360) permite 1 etapa |
</phase_requirements>

## Standard Stack

**Nenhum pacote novo.** Este phase edita código Deno existente e uma migration; não instala dependências. Os SDKs já estão pinados e estaticamente importados nas EFs.

### Core (já em uso — pins verificados no código/comentários, NÃO re-instalar)
| Library | Version | Purpose | Provenance |
|---------|---------|---------|-----------|
| `@anthropic-ai/sdk` | 0.102.0 | Cliente Anthropic (structured output + timeout) | `[CITED: ai-client.ts:43]` pin no código; classe de erro verificada `[VERIFIED: anthropic-sdk-typescript/src/core/error.ts]` |
| `openai` | 6.42.0 | Fallback gpt-4o-mini | `[CITED: ai-client.ts:45]` |
| `zod` | 3.25.76 | Schemas structured-output | `[CITED: ai-client.ts:47]` — nota: EFs de IA reais usam `zod/v4` (memory MEMORY.md avaliar-redacao) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Match por `err.name === "APIConnectionTimeoutError"` (import-free) | `import { APIConnectionTimeoutError } from "npm:@anthropic-ai/sdk"` + `instanceof` | `instanceof` exige import estático do SDK em `ai-client.ts` (hoje só injetado via `deps`) e falha p/ o SDK OpenAI (classe diferente do mesmo nome). `err.name` + regex cobre ambos sem import — **recomendado** |
| Cap ≤15 no peso de triagem (alternativa REQUIREMENTS.md) | Remover triagem dos WEIGHTED_KEYS | CONTEXT trava em REMOVER — triagem é pré-triagem de CV, não etapa de avaliação |

**Installation:** N/A (nenhum pacote novo).

## Package Legitimacy Audit

**Nenhum pacote externo novo é introduzido neste phase.** Todos os SDKs (`@anthropic-ai/sdk@0.102.0`, `openai@6.42.0`, `zod@3.25.76`) já estão pinados e em uso em `supabase/functions/_shared/*` e nas 7 EFs desde a Phase 9 (imports `npm:` estáticos — [[reference_ef_npm_join_import_bug]]). Não há `npm install`, `pip install` nem `cargo add`. slopcheck não se aplica.

**Regra load-bearing:** manter os imports `npm:` **estáticos** ao tocar qualquer EF (nunca `await import([...].join(""))` — esconde o pacote do bundler de deploy e 500a com `ERR_MODULE_NOT_FOUND`).

## Architecture Patterns

### System Data Flow (o trio que precisa alinhar)

```
                         ┌───────────────────────────────────────────┐
   RH clica ação  ──────▶│  EF/index.ts  (7 EFs de IA)               │
   (triagem/aval/…)      │  loadPrompt(call_type, supabaseAdmin)     │
                         └───────────────┬───────────────────────────┘
                                         │ call_type (string)
                                         ▼
        ┌────────────────────────────────────────────────────────────┐
        │  _shared/prompt-loader.ts                                    │
        │  1. SELECT prompt_versions WHERE call_type=… is_active       │──▶ DB: prompt_versions
        │     (falha → PromptNotConfiguredError)                       │    (call_type = enum llm_call_type)
        │  2. assertSchemaVersionCompat(call_type, row.schema_ver)     │
        │     SCHEMA_VERSIONS[call_type] === row.schema_version_required│
        │     (mismatch → SchemaVersionMismatchError)  ◀── AI-01 aqui  │
        └───────────────┬────────────────────────────────────────────┘
       HOJE: catch {} ──┤ (BUG) engole os 2 erros → stub 1 linha 0.0.0
       AI-01: propagar ─┤ SchemaVersionMismatch/PromptNotConfigured → 500 + alerta
                        ▼
        ┌────────────────────────────────────────────────────────────┐
        │  _shared/ai-client.ts  callAi(args, deps)                    │
        │  0. tryIdempotencyReplay ── AI-05 (só success=true)          │──▶ DB: ai_call_logs
        │  1. detectPromptInjection (pre-API)                          │
        │  2. maskPII                                                  │
        │  3. breaker.canRequest() ── AI-02 (sharedBreaker singleton)  │
        │  4. loop while attempt<MAX_ATTEMPTS (parseIntEnv ── AI-07)   │
        │     anthropic.messages.parse({timeout: effectiveTimeoutMs})  │──▶ Anthropic (60s p/ transcricao ── AI-04)
        │     catch → isRetryable(err) ── AI-03 (APIConnectionTimeout) │
        │     breaker.recordFailure()  (THRESHOLD ── AI-02)            │
        │  5. OPEN/esgotado → runOpenAIFallback (gpt-4o-mini)          │──▶ OpenAI
        │  6. calculateCost + logAiCall  (+ kill-switch ── AI-06)      │
        └────────────────────────────────────────────────────────────┘
```

### Recommended file touch-set
```
supabase/functions/
├── _shared/
│   ├── prompt-loader.ts      # SCHEMA_VERSIONS realinhado (AI-01)
│   ├── circuit-breaker.ts    # THRESHOLD env-config + sharedBreaker singleton (AI-02)
│   ├── ai-client.ts          # isRetryable (AI-03) · parseIntEnv (AI-07) · replay success-only (AI-05) · breaker default (AI-02) · cost kill-switch (AI-06)
│   ├── ai-cost.ts            # (leitura AI-06 — cálculo já correto)
│   └── audit-logger.ts       # alarme 0.0.0 opcional (AI-01)
├── avaliar-transcricao-entrevista/index.ts   # timeoutMs:60_000 (AI-04) + catch estreitado (AI-01)
├── {avaliar-redacao, avaliar-redacao-cultural, gerar-guia-entrevista,
│    gerar-devolutiva-bigfive, analise-candidato-individual,
│    comparativo-candidatos}/index.ts          # catch estreitado (AI-01)
├── consolidar-decisao-final/index.ts          # triagem out + ≥2 etapas (UX-09)
└── cost-alerter/index.ts                       # wire candidate_cost_over_1 + janela (AI-06)
supabase/migrations/
└── 2026XXXXXXXXXX_ai_stack_revival.sql         # ALTER TYPE llm_call_type ADD VALUE 'bigfive_devolutiva' + seed + activate + cost trigger fix (AI-01/06)
scripts/sync-prompts.ts                          # CALL_TYPES += bigfive_devolutiva (AI-01)
src/features/avaliacao/components/{DevolutivaBigFiveView,ScorecardAvaliacao}.tsx  # UX-07
src/components/ScoreCard.tsx                      # UX-07 (Raven percentile)
src/features/decisao/components/ConsolidacaoDashboard.tsx  # UX-09 render de null
```

### Anti-Patterns to Avoid
- **`catch {}` que degrada silenciosamente** (o bug central AI-01): um `SchemaVersionMismatchError` deve falhar alto, não virar prompt genérico de 12 palavras persistido como avaliação oficial.
- **`new CircuitBreaker()` por chamada** (AI-02): reseta o contador toda vez → THRESHOLD inalcançável.
- **Confiar em scan de `ai_call_logs` p/ o alarme 0.0.0**: a row do stub **não persiste** (ver Pitfall 1). Alarme no ponto de degradação.
- **`await import([...].join(""))`**: esconde o pacote do bundler → 500 em PROD.
- **Editar `_shared` sem redeployar cada EF**: bundle-freeze — só a EF redeployada vê a mudança.

## AI-01 — The definitive call_type map

**As 7 EFs de IA (call site `loadPrompt` + `callAi`) vs SCHEMA_VERSIONS vs enum vs seed:**

| # | Edge Function | call_type passado | file:line (loadPrompt / stub 0.0.0) | Em `SCHEMA_VERSIONS`? | Em enum `llm_call_type`? | Seedado (mig 04)? | Em `CALL_TYPES` (sync)? | schema_ver_required (template) | Verdito HOJE |
|---|---------------|-------------------|-------------------------------------|-----------------------|--------------------------|-------------------|-------------------------|--------------------------------|--------------|
| 1 | analise-candidato-individual | `cv_job_match` | :228 / (stub :235) | **SIM** (1.0.0) | SIM | SIM | SIM | 1.0.0 | ✅ **RODA REAL** |
| 2 | comparativo-candidatos | `comparative_ranking` | :240 / (stub :247) | **SIM** (1.0.0) | SIM | SIM | SIM | 1.0.0 | ✅ **RODA REAL** |
| 3 | avaliar-redacao | `work_sample_sjt` | :236 / :243 | ❌ (órfã `sjt_evaluation`) | SIM | SIM | SIM | 1.0.0 | ❌ STUB 0.0.0 (SchemaVersionMismatch) |
| 4 | avaliar-redacao-cultural | `culture_fit_essay` | :228 / :235 | ❌ | SIM | SIM | SIM | 1.0.0 | ❌ STUB 0.0.0 |
| 5 | avaliar-transcricao-entrevista | `transcript_analysis` | :194 / :201 | ❌ | SIM | SIM | SIM | 1.0.0 | ❌ STUB 0.0.0 |
| 6 | gerar-guia-entrevista | `interview_guide` | :229 / :236 | ❌ | SIM | SIM | SIM | 1.0.0 | ❌ STUB 0.0.0 |
| 7 | gerar-devolutiva-bigfive | `bigfive_devolutiva` | :571 / :578 (**stub 1.0.0!**) | ❌ | **❌ NÃO** | **❌ NÃO** | **❌ NÃO** | 1.0.0 (template 08) | ❌ STUB 1.0.0 (PromptNotConfigured + enum reject) |

`[VERIFIED: grep supabase/functions/*/index.ts]` · `[VERIFIED: prompt-loader.ts:33-42]` · `[VERIFIED: 20260609000001:54-62 enum]` · `[VERIFIED: 20260609000004 seed]` · `[VERIFIED: scripts/sync-prompts.ts:32-40]` · `[VERIFIED: docs/conhecimento/prompts/templates/*.md frontmatter]`

**Chaves ÓRFÃS em `SCHEMA_VERSIONS` a DROPAR** (não existem no enum, sem template, sem EF): `sjt_evaluation`, `interview_questions`, `interview_summary`, `reference_check`, `final_recommendation`. (`cv_summary` é call_type REAL/seedado mas sem EF consumidora — manter para espelhar o enum, é inócuo.) `[VERIFIED: prompt-loader.ts:33-42 vs enum]`

### Fix alvo de `SCHEMA_VERSIONS` (deve espelhar o enum `llm_call_type` real):
```ts
export const SCHEMA_VERSIONS: Record<string, string> = {
  cv_summary: "1.0.0",            // real/seedado (sem EF hoje — manter espelhando o enum)
  cv_job_match: "1.0.0",          // analise-candidato-individual
  comparative_ranking: "1.0.0",   // comparativo-candidatos
  interview_guide: "1.0.0",       // gerar-guia-entrevista        ← ADICIONAR
  transcript_analysis: "1.0.0",   // avaliar-transcricao-entrevista ← ADICIONAR
  culture_fit_essay: "1.0.0",     // avaliar-redacao-cultural      ← ADICIONAR
  work_sample_sjt: "1.0.0",       // avaliar-redacao               ← ADICIONAR
  bigfive_devolutiva: "1.0.0",    // gerar-devolutiva-bigfive      ← ADICIONAR (+ enum+seed+sync, ver abaixo)
};
```

### `bigfive_devolutiva` é a exceção profunda (não é só uma chave)
`bigfive_devolutiva` **não é valor válido do enum `public.llm_call_type`** (só os 7: cv_summary, cv_job_match, comparative_ranking, interview_guide, transcript_analysis, culture_fit_essay, work_sample_sjt). Consequências verificadas:
- `prompt_versions.call_type` é `llm_call_type NOT NULL` → **nenhuma row para bigfive_devolutiva pode existir**; `loadPrompt` lança `PromptNotConfiguredError` (activeRes.error no cast do enum, `22P02`) → catch → stub `1.0.0`.
- `ai_call_logs.call_type` também é `llm_call_type NOT NULL` → **toda escrita de auditoria da devolutiva falha** (`22P02`), engolida pelo `audit-logger` (console.error). A devolutiva Big Five nunca teve auditoria/custo logados.
- `bigfive_devolutiva` foi adicionado em Phase 12 (template 08, 2026-06-09) DEPOIS do enum/seed/CALL_TYPES de Phase 9 congelarem — o array `CALL_TYPES` do sync-prompts (`z.enum`) rejeitaria o template 08 no sync. `[VERIFIED: sync-prompts.ts:32-40; 20260612000002 só usa 'bigfive_devolutiva' como comentário de coluna text, nunca como enum]`

**Fix bigfive_devolutiva (migration + sync + código):**
1. Migration nova: `ALTER TYPE public.llm_call_type ADD VALUE IF NOT EXISTS 'bigfive_devolutiva';` — **não-transacional** em uso; ADD VALUE não pode ser usado na mesma transação que insere com o valor. Aplicar via **Supabase MCP `apply_migration`** (precedente M2, grava version row, contorna 42601) e reconciliar o ledger. **NÃO editar a migration 20260609000001** (DBMIG-01/Phase-27 rebuild — o enum extend deve ser arquivo próprio p/ o ledger convergir).
2. Seed uma row `prompt_versions` p/ `bigfive_devolutiva` (semver 1.0.0, schema_version_required 1.0.0, model claude-sonnet-4-6, max_tokens 1200, temperature 0) e **ativar** (`is_active=true`) — a ativação é manual/one-time por call_type (precedente Phase 10/11).
3. `scripts/sync-prompts.ts`: adicionar `"bigfive_devolutiva"` ao array `CALL_TYPES` (o template 08 já existe e valida).
4. `SCHEMA_VERSIONS`: adicionar `bigfive_devolutiva: "1.0.0"`.
5. Estreitar o catch em `gerar-devolutiva-bigfive/index.ts:573` (hoje stub `1.0.0` — que nem é pego por um alarme "0.0.0").

### Onde estreitar o catch (todas as 7 EFs)
Padrão idêntico em cada EF: `try { const loaded = await loadPrompt(...); resolved = resolvedPromptFromLoaded(...) } catch { resolved = { …stub…, prompt_version: "0.0.0" } }`. Estreitar para **re-lançar** `SchemaVersionMismatchError` e `PromptNotConfiguredError` (as duas classes já são exportadas de `prompt-loader.ts:58/76` com `.code`) como 500 estruturado, e só degradar (se degradar) em erros verdadeiramente transientes de rede no SELECT. Catch bare (`catch {`) a substituir:

| EF | catch (linha) | stub prompt_version |
|----|---------------|---------------------|
| analise-candidato-individual | :230 | "0.0.0" (:235) |
| avaliar-redacao | :238 | "0.0.0" (:243) |
| avaliar-redacao-cultural | :230 | "0.0.0" (:235) |
| avaliar-transcricao-entrevista | :196 | "0.0.0" (:201) |
| comparativo-candidatos | :242 | "0.0.0" (:247) |
| gerar-guia-entrevista | :231 | "0.0.0" (:236) |
| gerar-devolutiva-bigfive | :573 | "1.0.0" (:578) |

### O alarme 0.0.0 — decisão de design (Claude's discretion)
**Não escanear `ai_call_logs` procurando prompt_version="0.0.0".** O stub seta `prompt_version_id` = undefined → `logAiCall` insere `prompt_version_id: prompt.prompt_version_id ?? prompt.prompt_version` = `"0.0.0"` numa coluna `uuid NOT NULL REFERENCES prompt_versions(id)` → o INSERT **falha** (`22P02` invalid uuid), engolido pelo audit-logger → **nenhuma row 0.0.0 persiste**. (`[VERIFIED: 20260609000001:163 prompt_version_id uuid NOT NULL FK; audit-logger.ts:110-148]`)

Recomendação: **o 500 propagado É o alarme primário** (o RH vê erro, aparece nos logs da EF, nada roda morto em silêncio). Como belt-and-suspenders, escrever uma row de alerta dedicada via service_role **no catch** (ou em `logAiCall` quando `prompt.prompt_version === "0.0.0"`) numa tabela que aceite o valor — ex.: `recruiter_alerts` com `threshold_violated='ai_prompt_stub_fired'`, ou uma coluna/flag booleana em `ai_call_logs` (se a migration adicionar). Ver Open Question 3 sobre a coluna `ai_call_logs.prompt_version` (text) que o audit-logger escreve mas que **não existe** na migration base.

## AI-02 — Circuit breaker singleton + invariante

**Estado atual (`[VERIFIED: ai-client.ts:300]`):** `const breaker: BreakerLike = deps.breaker ?? new CircuitBreaker();` — e **zero EFs passam `breaker`** (`[VERIFIED: grep supabase/functions/*/index.ts → ZERO]`). Cada `callAi` cria um breaker zerado; dentro de 1 chamada `recordFailure` roda no máx `MAX_ATTEMPTS=3` vezes < `THRESHOLD=5` → nunca abre.

**Fix (mínimo, sem tocar consumidor):**
```ts
// circuit-breaker.ts — THRESHOLD env-config com invariante
const RAW_THRESHOLD = parseIntEnv("CIRCUIT_BREAKER_THRESHOLD", 3);   // AI-07 helper
const MAX = parseIntEnv("MAX_ATTEMPTS", 3);
const THRESHOLD = Math.min(RAW_THRESHOLD, MAX);   // invariante THRESHOLD ≤ MAX_ATTEMPTS
export const sharedBreaker = new CircuitBreaker(); // singleton module-level (por-isolate)

// ai-client.ts:300 — trocar o default
const breaker: BreakerLike = deps.breaker ?? sharedBreaker;
```
- Estado sobrevive entre requests do mesmo isolate; testes que injetam `breaker` continuam válidos.
- Invariante `THRESHOLD ≤ MAX_ATTEMPTS` garante que a escada de retry de UMA chamada falha já atinge o THRESHOLD → OPEN torna-se determinístico.
- **Pitfall de teste:** um singleton module-level polui estado entre testes no mesmo arquivo (module cache do dynamic import). Testes de `callAi` que NÃO injetam breaker passam a compartilhar estado — a maioria já injeta um `breaker` mock; o novo teste "5 falhas consecutivas → canRequest()===false" deve injetar um breaker próprio OU resetar. Ver Validation Architecture.

**Contrato de teste a atualizar:** `circuit-breaker.test.ts` **hard-coda `const THRESHOLD = 5`** (`[VERIFIED: circuit-breaker.test.ts:23,44-45,48-51]`) e assere "abre após 5 falhas / fica fechado em 4". Mudar o default p/ 3 quebra esses testes → **atualizar** para o novo default + adicionar teste da invariante `THRESHOLD ≤ MAX_ATTEMPTS`.

## AI-03 — isRetryable casa o timeout do SDK

**Verificado no source oficial** `[VERIFIED: github.com/anthropics/anthropic-sdk-typescript src/core/error.ts]`: a classe é `APIConnectionTimeoutError` (extends `APIConnectionError` extends `APIError`), mensagem default **`"Request timed out."`**, e **sem propriedade `status`** (typed `undefined`). O SDK OpenAI usa a mesma classe/mensagem. A regex atual `/529|overloaded|timeout|503|429/i` (ai-client.ts:238) **não casa** `"Request timed out."` — "timed out" tem espaço. `statusOf(err)` retorna undefined (sem status). → timeout é fatal na 1ª tentativa → pula direto p/ gpt-4o-mini.

**O comentário em ai-client.ts:378-382 afirma que casa — está errado; corrigir junto** (CONTEXT).

**Fix:**
```ts
function isRetryable(err: unknown): boolean {
  const s = statusOf(err);
  if (s !== undefined && RETRYABLE_STATUS.has(s)) return true;
  const name = (err as { name?: string })?.name ?? (err as object)?.constructor?.name;
  if (name === "APIConnectionTimeoutError") return true;      // tipo (Anthropic + OpenAI)
  const msg = err instanceof Error ? err.message : String(err);
  return /529|overloaded|503|429|tim(e|ed)\s*out/i.test(msg);  // regex ampliada
}
```
**Teste que mascarou o bug (`[VERIFIED: ai-client.test.ts:45,257-270]`):** o mock lança `new Error("anthropic 529 overloaded")` — casa `/overloaded/i`, então o teste "timeout stays retryable" nunca exercitou a mensagem real. **Adicionar** teste: `isRetryable(new Error("Request timed out."))===true` e um erro com `name:"APIConnectionTimeoutError"` sem status.

**Orçamento (nota do A5):** com timeout retriável ativo + `gerar-guia`/`avaliar-transcricao` a 60s, 3 tentativas × 60s estoura o teto ~150s do EF. Mitigar: limitar retries a 1 quando `effectiveTimeoutMs > 25s`, OU reduzir MAX_ATTEMPTS efetivo p/ chamadas de timeout longo. **Decidir no plano** (o backoff exp `2^attempt*1000` também soma). Recomendação: cap de tentativas em função de `effectiveTimeoutMs` (ex.: `attempts = timeoutMs > 25000 ? 2 : MAX_ATTEMPTS`).

## AI-04 — timeoutMs no avaliar-transcricao-entrevista

**Call site (`[VERIFIED: avaliar-transcricao-entrevista/index.ts:208-226]`):** `callAi({ prompt, rawInput: body.transcricao, …, idempotency_key: `${cand}:transcript` }, { anthropic, openai, supabase, zodOutputFormat, zodResponseFormat })` — **não passa `timeoutMs`** → herda o default 25s. Template `transcript_analysis` tem `max_tokens: 4000` + input = transcrição completa → mesmo perfil que fazia `gerar-guia` 500ar antes do P21.

**Precedente a espelhar (`[VERIFIED: gerar-guia-entrevista/index.ts:270-274]`):** `timeoutMs: 60_000`. `CallAiArgs.timeoutMs` já existe e é aplicado ao Anthropic E ao fallback (`[VERIFIED: ai-client.ts:192,297-299,486]`).

**Fix:** adicionar `timeoutMs: 60_000` (env-overridable, ex.: `parseIntEnv("TRANSCRICAO_TIMEOUT_MS", 60000)`) ao `callAi` de `avaliar-transcricao-entrevista`. Considerar o mesmo para `avaliar-redacao-cultural` (max_tokens 2500) com medição real de `ai_call_logs.latency_ms` (menor risco — decidir no plano).

## AI-05 — replay só de sucesso (mapa de impacto)

**Bug (`[VERIFIED: ai-client.ts:252-279]`):** `tryIdempotencyReplay` busca por `idempotency_key` **sem filtrar `success=true`** e devolve a row anterior mesmo `success=false` (com `flagged_for_human_review`). Como `ai_call_logs.idempotency_key` é UNIQUE e as keys são estáveis, uma falha transiente vira estado terminal — o RH re-clica e replaya a falha p/ sempre.

**Fix (mínimo):** no lookup, `.eq("success", true)` (ou retornar null quando `existing.success === false`). O replay de injection-detected (`success=false`) pode ser dropado sem perda: a chamada nova re-roda `detectPromptInjection` (pré-API, custo zero) e re-detecta → mesmo resultado. **Nenhum caller depende de failure-replay.**

**Mapa por EF (quem o fix destrava):**
| EF | idempotency_key | Passa key? | AI-05 destrava reprocess? |
|----|-----------------|-----------|---------------------------|
| gerar-guia-entrevista | `${cand}:${tipo}` (:269) | SIM | **SIM** |
| avaliar-transcricao-entrevista | `${cand}:transcript` (:217) | SIM | **SIM** |
| gerar-devolutiva-bigfive | `bigfive_devolutiva:${cand}:${dim}:${banda}` (:618) | SIM | **SIM** (fan-out n8n) |
| avaliar-redacao-cultural | `${cand}:${pergunta_id}:${inputHash}` (:262) | SIM (content-hashed) | **SIM** se input inalterado |
| analise-candidato-individual | — (deliberadamente ausente, :250-256) | NÃO | já funciona (reprocessar_analise re-fire) |
| comparativo-candidatos | — (deliberadamente ausente, :262) | NÃO | sempre fresh |
| avaliar-redacao (SJT) | — | NÃO | sempre fresh |

**Reprocess wiring (`[VERIFIED: 20260610000003_reprocessar_rpc.sql]`):** `reprocessar_analise(p_candidatura_id)` (role rh/administrador) re-dispara o mesmo `net.http_post` do trigger → só afeta `analise-candidato-individual` (que não usa key). Os reprocess de guia/transcrição/devolutiva dependem do fix AI-05 no replay.

## AI-06 — guardrails de custo (os 4 furos)

**Cadeia (`[VERIFIED: 20260609000002:249-303; 20260609000003:36-60; cost-alerter/index.ts]`):**
`ai_call_logs` (write real-time) → pg_cron `ai-cost-aggregation` @ 01:30 agrega **o dia de ONTEM** em `ai_cost_daily` (grão date/vaga_id/call_type/provider) → AFTER INSERT/UPDATE trigger `notify_cost_anomaly` avalia thresholds → `net.http_post` (Vault Bearer) → `cost-alerter` EF (dedup + insert `recruiter_alerts` + Resend best-effort).

| # | Furo | Evidência | Fix |
|---|------|-----------|-----|
| 1 | **Janela:** alerta ~25h depois do gasto (agrega dia anterior às 01:30) | 20260609000003:55 `WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'` | Kill-switch **pré-chamada** em `callAi` (rolling do dia corrente) — não depender do cron |
| 2 | **Escopo:** `total_cost_usd > 200` numa fatia DIÁRIA por (date,vaga,call_type,provider); PRD é "R$200/mês por vaga" → nunca cruza | 20260609000002:267-270; comentário "cost-alerter refines against 30-day window" é **falso** (EF só dedup+insert) | Avaliar janela 30-dias por vaga (no trigger OU no cost-alerter, como o comentário promete) + threshold global |
| 3 | **Canal:** `candidate_cost_over_1` é código morto (o trigger só emite `vaga_cost_over_200` + `error_rate`) | cost-alerter/index.ts:93 `case 'candidate_cost_over_1'` nunca acionado | Emitir `candidate_cost_over_1` agregando por `candidato_id` |
| 4 | **Silencioso:** Vault secrets ausentes → `RETURN NEW` mudo (dispatch pulado) | 20260609000002:301-303 | `RAISE WARNING` quando `project_url`/`edge_invoke_key` ausentes (não skip mudo) |
| 5 | **Sem teto runtime:** `callAi` só contabiliza custo a posteriori | ai-client.ts (nenhum budget pré-chamada) | Kill-switch barato: `SELECT SUM(cost_usd)`/contador do dia; recusar novas chamadas acima de teto hard configurável (env) |

**Decisão CONTEXT:** "rolling diário, per-vaga + global, canal que alarma de verdade". O item que efetivamente **corta gasto em runtime** é o kill-switch pré-chamada (#5) — priorizar. `cost_usd` é `numeric(10,6)` e há índice `idx_ai_logs_vaga_cost (vaga_id, cost_usd) WHERE success=true` — a soma per-vaga do dia é barata.

## Runtime State Inventory

> Phase toca estado de runtime (enum, rows ativas, Vault) além de código. **Obrigatório.**

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `prompt_versions`: rows ativas dos call_types. cv_job_match + comparative_ranking + work_sample_sjt ativados (memory Phase 10/11). culture_fit_essay / transcript_analysis / interview_guide — **ativação em PROD NÃO confirmada** (só 200 OK, que o stub também retorna). `bigfive_devolutiva` — **impossível** (não está no enum). | Verificar `SELECT call_type, is_active FROM prompt_versions` no plano ([BLOCKING] task); ativar os que faltam; seed+ativar bigfive_devolutiva |
| **Live service config (schema/enum)** | Enum `public.llm_call_type` (7 valores) NÃO inclui `bigfive_devolutiva` — é estado do banco, não só do git. `ai_call_logs.call_type` e `prompt_versions.call_type` dependem dele | Migration `ALTER TYPE … ADD VALUE 'bigfive_devolutiva'` via Supabase MCP apply_migration (não-transacional) + reconciliar ledger |
| **OS-registered state** | pg_cron jobs `ai-cost-aggregation` (01:30) + `ai-logs-retention-cleanup` (02:00) registrados no banco (não no git além da migration) | AI-06: se mudar a janela do cron, re-`cron.schedule` (mesmo nome sobrescreve). Verificar `SELECT * FROM cron.job` |
| **Secrets/env vars** | Vault `project_url` + `edge_invoke_key` (cost-alerter dispatch); `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`; novos: `MAX_ATTEMPTS`, `AI_CALL_TIMEOUT_MS`, `CIRCUIT_BREAKER_THRESHOLD`, `TRANSCRICAO_TIMEOUT_MS`, teto de custo. Memory: Vault secrets "nunca confirmados visíveis em PROD" | Confirmar Vault secrets (A24 #4); os novos env são default-guarded (parseIntEnv) — ausência é segura |
| **Build artifacts / bundle** | Bundle-freeze: cada EF carrega sua cópia de `_shared/*`; editar `_shared` NÃO propaga sem redeploy | Redeployar as **7 EFs** + `cost-alerter` após tocar `_shared` |

**A migration é [BLOCKING]/non-autonomous** (aplicação em PROD via MCP), padrão M2. O enum ADD VALUE e a ativação de prompt_versions são escritas em PROD.

## Common Pitfalls

### Pitfall 1: O alarme "0.0.0 em ai_call_logs" não tem onde pousar
**O que dá errado:** planejar um scan de `ai_call_logs WHERE prompt_version='0.0.0'`.
**Por quê:** o stub seta `prompt_version_id=undefined` → `logAiCall` tenta inserir `"0.0.0"` numa coluna `uuid NOT NULL FK` → INSERT falha (22P02), engolido → nenhuma row persiste. Além disso `ai_call_logs` **não tem** coluna `prompt_version` (text) na migration base — o audit-logger escreve uma chave sem coluna (ver Open Q3).
**Como evitar:** alarme no ponto de degradação (catch → 500 + alert row dedicada), não pós-hoc.

### Pitfall 2: ALTER TYPE ADD VALUE + db push = 42601 / não-transacional
**O que dá errado:** `bigfive_devolutiva` no enum via `supabase db push` falha ou não pode ser usado na mesma txn.
**Como evitar:** aplicar via Supabase MCP `apply_migration` (precedente M2, grava version row, contorna 42601); ADD VALUE em statement próprio, sem usar o valor na mesma transação; arquivo de migration NOVO (não editar 20260609000001 — DBMIG-01/Phase-27).

### Pitfall 3: Singleton de breaker polui testes
**O que dá errado:** `sharedBreaker` module-level mantém estado entre testes no mesmo arquivo (module cache).
**Como evitar:** testes de `callAi` que exercitam o breaker devem injetar um breaker próprio; o teste "5 falhas → OPEN" usa uma instância fresh de `CircuitBreaker`, não o singleton.

### Pitfall 4: Corpus Deno é bloqueante (Phase 22) — mudar código E teste juntos
**O que dá errado:** mudar `THRESHOLD` default (3) ou `isRetryable` sem atualizar `circuit-breaker.test.ts` (hard-coda 5) / adicionar teste de timeout → CI vermelho bloqueante.
**Como evitar:** cada mudança em `_shared` vem com o teste atualizado. Comando canônico: `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions`.

### Pitfall 5: Big Five NÃO é avaliativo — "abaixo/dentro/acima do esperado" é errado p/ a devolutiva
**O que dá errado:** aplicar as bandas "abaixo/dentro/acima do esperado" ao Big Five candidate-facing.
**Por quê:** traço alto de Neuroticismo não é "pior"; a devolutiva é explicitamente não-avaliativa (`DevolutivaBigFiveView:47` "never pass/fail framing"). A moldura avaliativa cabe nas telas RH de SCORE de job-fit (SJT/redação/entrevista/cognitivo), não na personalidade.
**Como evitar:** ver UX-07 abaixo — split de duas famílias de banda.

### Pitfall 6: Estreitar o catch pode expor 500 ao candidato/RH sem fallback
**O que dá errado:** `SchemaVersionMismatchError` propaga como 500 em telas que antes "funcionavam" (com stub).
**Por quê/como evitar:** é o comportamento desejado (falhar alto > rodar morto), MAS garantir que o 500 seja tratado no client (mensagem pt-BR amigável, não tela branca) e que a persistência never-absent (row `pendente_humano`) não fabrique sucesso. Verificar cada EF: o 500 deve vir ANTES de qualquer escrita de resultado.

## UX-07 — percentil → descritor qualitativo

**Sites exatos (`[VERIFIED: grep src/]`):**
| Arquivo | Linha | O que exibe | Ação |
|---------|-------|-------------|------|
| `DevolutivaBigFiveView.tsx` (candidato) | :168 | `Percentil {row.percentil} · {BANDA_LABEL[row.banda]}` | Remover `Percentil {n}`, manter banda |
| ″ | :171 | `<Progress value={row.percentil} />` (barra = percentil) | Remover a barra numérica OU torná-la não-quantitativa |
| ″ | :198 | `Percentil {dash.percentil}` por dimensão | Remover |
| ″ | :86-90 | `analogia()` deriva `acima = percentil-1` | Reformular sem número, ou remover |
| `ScorecardAvaliacao.tsx` (RH) | :276 | `Percentil {d.percentil}` (Big Five rows) | Remover, manter `BIGFIVE_BANDA_LABEL` |
| `ScoreCard.tsx` (RH) | :7,20 | Raven percentile (inteligencia 0-100) | Bandar (cognitivo é provisório — norma real M5) |
| `gerar-devolutiva-bigfive/index.ts` | :597 | `## PERCENTIL\n${percentil}` injetado NO prompt do LLM | Passar **banda**, não percentil cru; guard/teste que o texto de saída não emite dígitos de percentil |

**Infra já existe:** `BANDA_LABEL` (DevolutivaBigFiveView:48) + `BIGFIVE_BANDA_LABEL` (ScorecardAvaliacao:231) já mapeiam as 5 bandas neutras. Cutoffs determinísticos: `bandOf(percentil)` ≤15/16-35/36-64/65-84/≥85 → muito_baixo/mod_baixo/medio/mod_alto/muito_alto (`[VERIFIED: gerar-devolutiva-bigfive/index.ts:97-102; _shared/bigfive-scoring.ts]`).

**Recomendação de bandas (dentro de "sem número cru" — decidir labels finais no plano):**
- **Big Five (candidato + RH Big Five rows):** manter as **5 bandas NEUTRAS** de traço (muito baixo → muito alto). Não-avaliativo. Só dropar o número. (Norma Johnson já wired em `bigfive-scoring.ts` — **committed/tracked confirmado**, `[VERIFIED: git ls-files]`.)
- **Telas RH de SCORE de job-fit (Raven/cognitivo, SJT/redação/entrevista se exibirem percentil):** banda **avaliativa** de 3 níveis "abaixo do esperado / dentro do esperado / acima do esperado" (o exemplo do CONTEXT). Cognitivo é provisório (norma real deferida M5).

**Verificar no plano:** `RelatoriosRHPage.tsx` e `CandidatosRHPage.tsx` também referenciam percentil (grep) — confirmar se exibem número cru ao RH e incluir no escopo se sim.

## UX-09 — triagem fora da consolidação + ≥2 etapas

**Estado (`[VERIFIED: consolidar-decisao-final/index.ts:99,139-143,329-368]`):**
- `WEIGHTED_KEYS = ["triagem", "work_sample_sjt", "redacao_cultural", "entrevista"]` — `triagem` lê `analise_candidato_vaga.score_match` (pré-triagem de CV, 0-100) e É ponderada com `pesos['triagem']`.
- Renormaliza sobre `presentRows` (`effective_weight = w/Σpresent`); consolida se `presentRows.length > 0 && sumPresentWeight > 0` → **1 etapa presente já gera número** (effective_weight=1.0).

**Fix:**
1. **Remover `triagem` dos `WEIGHTED_KEYS`** → `["work_sample_sjt", "redacao_cultural", "entrevista"]`. Recomendação: mover triagem para os `CONTEXT_KEYS` (visível ao RH como contexto, sem peso) — preserva a visibilidade do score de CV sem distorcer o agregado. `pesos['triagem']` na config jsonb passa a ser ignorado (seguro; o balanceamento da soma dos pesos é config de vaga — Phase 25).
2. **Exigir ≥2 etapas presentes:** mudar o gate `if (presentRows.length > 0 …)` → `if (presentRows.length >= 2 && sumPresentWeight > 0)`. Com <2, `consolidated=null` (server-authoritative). Ajustar `buildRecommendation` (:192) e o frontend `ConsolidacaoDashboard` (renderiza `consolidated`) — quando null com 1 etapa presente, mostrar mensagem distinta ("Agregado suprimido até ≥2 etapas concluídas"), não o empty-state atual "Ainda não há scorecards". As rows de breakdown por etapa continuam exibidas (scores individuais são legítimos; só o AGREGADO é gated). `[VERIFIED: ConsolidacaoDashboard.tsx:71,120-123,143]`

## Code Examples

### parseIntEnv (AI-07) — assinatura recomendada
```ts
// _shared/ai-client.ts (ou um _shared/env.ts novo, reutilizável)
function parseIntEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw == null ? NaN : Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  if (raw != null) console.warn(`[ai-client] env ${name}="${raw}" inválido → default ${fallback}`);
  return fallback;
}
const MAX_ATTEMPTS = parseIntEnv("MAX_ATTEMPTS", 3);          // era Number(...) :70
const AI_CALL_TIMEOUT_MS = parseIntEnv("AI_CALL_TIMEOUT_MS", 25000); // :78
```
Aplica também a `CIRCUIT_BREAKER_THRESHOLD` (AI-02) e ao teto de custo (AI-06). Único par numérico existente hoje: ai-client.ts:70,78 (`[VERIFIED: grep — nenhum outro Number(Deno.env.get) numérico nas EFs]`).

## Validation Architecture

> `workflow.nyquist_validation: true` `[VERIFIED: .planning/config.json]` — seção incluída.

### Test Framework
| Property | Value |
|----------|-------|
| Framework (EFs) | Deno test (nativo) — `std/assert` |
| Config file | `supabase/functions/deno.json` |
| Quick run | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/_shared/__tests__/ai-client.test.ts` |
| Full suite (Deno) | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` (**bloqueante em CI desde Phase 22**, 148/0) |
| Framework (frontend) | Vitest 4.1.9 — `npm run test:run` (UX-07/09) |

### Phase Requirements → Test Map
| Req | Behavior | Type | Command | File exists? |
|-----|----------|------|---------|-------------|
| AI-01 | SCHEMA_VERSIONS cobre os call_types que as EFs passam (sweep) | unit | `deno test … prompt-loader` (novo teste sweep call_types vs SCHEMA_VERSIONS) | ❌ Wave 0 (novo) |
| AI-01 | catch estreitado: SchemaVersionMismatch propaga (não stub) | unit (por EF) | teste que injeta loadPrompt-que-lança e assere 500, não stub 0.0.0 | ❌ Wave 0 |
| AI-01 | bigfive_devolutiva no enum + row ativa | SQL smoke (PROD, [BLOCKING]) | `SELECT 'bigfive_devolutiva'::llm_call_type; SELECT is_active FROM prompt_versions WHERE call_type='bigfive_devolutiva'` | ❌ Wave 0 |
| AI-02 | 5 falhas consecutivas → canRequest()===false (breaker compartilhado) | unit | novo teste em ai-client.test.ts (breaker fresh injetado) | ❌ Wave 0 |
| AI-02 | invariante THRESHOLD ≤ MAX_ATTEMPTS | unit | novo teste em circuit-breaker.test.ts + **atualizar THRESHOLD=5→3** | ⚠️ existe (:23 hard-coda 5) |
| AI-03 | `isRetryable("Request timed out.")===true` + name APIConnectionTimeoutError | unit | novo teste ai-client.test.ts (o atual usa "529 overloaded" — mascara) | ⚠️ existe (:257 fraco) |
| AI-04 | avaliar-transcricao passa timeoutMs 60_000 a messages.parse | unit | espelhar o teste P21 de gerar-guia (`opts.timeout===60000`) | ❌ Wave 0 |
| AI-05 | replay ignora success=false (cai p/ chamada nova) | unit | ai-client.test.ts: mock ai_call_logs com row success=false → callAi faz chamada real, não replay | ❌ Wave 0 |
| AI-06 | kill-switch pré-chamada recusa acima do teto | unit | novo teste callAi com mock de soma-do-dia > teto → não chama provider | ❌ Wave 0 |
| AI-06 | candidate_cost_over_1 emitido/roteado | unit (cost-alerter) | teste do branch (:93) | ⚠️ verificar |
| AI-07 | parseIntEnv NaN → default | unit | `MAX_ATTEMPTS="abc"` → 3; `AI_CALL_TIMEOUT_MS="25s"` → 25000 | ❌ Wave 0 |
| UX-07 | devolutiva/scorecard sem `Percentil {n}` | unit (Vitest RTL) | render → `expect(screen.queryByText(/Percentil \d/)).toBeNull()` + banda presente | ❌ Wave 0 |
| UX-07 | EF não emite dígito de percentil no texto | unit (Deno) | guard sobre o output personalizado | ❌ Wave 0 |
| UX-09 | triagem fora dos WEIGHTED_KEYS + <2 etapas → consolidated null | unit (Deno) | consolidar-decisao-final: 1 etapa presente → `consolidated===null`; triagem não pondera | ⚠️ existe suíte consolidação — estender |

### Sampling Rate
- **Per task commit:** `deno test … <arquivo tocado>` + `npm run test:run <componente>` (< 30s).
- **Per wave merge:** corpus Deno completo + `npm run test:run` + `npm run lint` (tsc baseline pinado — Phase 22 mediu 133; STATE menciona 133, CONTEXT menciona 133; confirmar antes de commit).
- **Phase gate:** corpus Deno verde (bloqueante) + Vitest verde + build 0 antes de `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `prompt-loader.test.ts` — sweep: todo call_type que uma EF passa ∈ SCHEMA_VERSIONS (guard de regressão do bug AI-01)
- [ ] `ai-client.test.ts` — timeout real (`"Request timed out."` + name), shared-breaker 5-falhas, replay success-only, kill-switch custo, parseIntEnv NaN
- [ ] `circuit-breaker.test.ts` — **atualizar** THRESHOLD 5→3 + teste da invariante
- [ ] teste por-EF do catch estreitado (7 EFs) — pode ser 1 teste parametrizado por EF
- [ ] Vitest UX-07 (DevolutivaBigFiveView, ScorecardAvaliacao, ScoreCard) + UX-09 (ConsolidacaoDashboard null)
- [ ] SQL smokes [BLOCKING]: enum bigfive_devolutiva + is_active dos 5 call_types quebrados

## Security Domain

> `security_enforcement` ausente em config → tratado como habilitado. **NÃO apertar authz aqui (Phase 24).**

### Applicable ASVS Categories
| ASVS | Applies | Standard Control (neste phase) |
|------|---------|-------------------------------|
| V5 Input Validation | yes | Transcrição/redação UNTRUSTED já passam por `detectPromptInjection` + `maskPII` dentro de `callAi` — **preservar** ao tocar EFs |
| V6 Cryptography | no | — |
| V7 Error Handling / Logging | yes | Estreitar catch NÃO deve vazar PII no 500 (mensagem genérica + code); logs redigidos (só ids/counts — precedente consolidar:396) |
| V4 Access Control | **defer** | IDOR das EFs de IA (A19/A20/A25/A30) → **Phase 24**. Não mexer em verify_jwt/Bearer aqui |

### Known Threat Patterns for {Deno EF + LLM}
| Pattern | STRIDE | Standard Mitigation (in-scope) |
|---------|--------|-------------------------------|
| Prompt injection via transcrição/redação | Tampering | `detectPromptInjection` pré-API (já existe) — não regredir |
| PII em ai_call_logs | Info Disclosure | `maskPII` antes do INSERT (audit-logger) — não regredir |
| Custo descontrolado (retry loop / n8n) | DoS/financeiro | AI-06 kill-switch pré-chamada + AI-05 replay success-only (evita re-cobrança) |
| 500 vazando stack/PII no catch estreitado | Info Disclosure | mensagem pt-BR genérica + error_code; nunca o payload |
| **NÃO fechar aqui:** IDOR/authz de gerar-devolutiva-bigfive/analise/comparativo | Spoofing/Elevation | **Phase 24** (A19/A20/A25/A30) — deliberadamente fora |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Deno | corpus de testes EF | ✓ (CI setup-deno@v2) | 2.7.7 (Phase 22) | — |
| Supabase CLI | `functions deploy`, `db push` | ✓ | linked (isljnozzlvckrgjjbjwp) | Supabase MCP apply_migration (enum) |
| Supabase MCP (execute_sql/apply_migration) | aplicar enum+seed+ativação em PROD; verificar is_active | ✓ (contexto do orquestrador; **indisponível ao subagente researcher** por restrição de tools) | — | supabase db push (falha em 42601 nos $$) |
| ANTHROPIC_API_KEY / OPENAI_API_KEY | runtime das EFs | ✓ (PROD, memory) | — | — |
| Vault: project_url, edge_invoke_key | cost-alerter dispatch | **? não confirmado** (memory A24) | — | RAISE WARNING quando ausente (AI-06 fix) |

**Missing/uncertain sem fallback claro:** ativação de `prompt_versions` p/ culture_fit_essay/transcript_analysis/interview_guide em PROD — **verificar no plano** (SELECT is_active). Vault secrets — confirmar.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `SCHEMA_VERSIONS` com chaves fictícias (Phase 9) | Espelhar o enum `llm_call_type` real | Este phase | 5/7 call_types deixam de rodar stub |
| `new CircuitBreaker()` por chamada | `sharedBreaker` singleton por-isolate | Este phase (audit A4) | breaker passa a abrir |
| `isRetryable` regex `/timeout/i` | `+APIConnectionTimeoutError` + `/tim(e|ed)\s*out/i` | Este phase (audit A5, SDK 0.102.0) | timeout volta a ser retriável |
| Cost guardrail detect-only (cron dia-anterior) | Kill-switch pré-chamada + janela real | Este phase (audit A24) | gasto cortado em runtime |
| Percentil cru na devolutiva/RH | Banda qualitativa (5 neutras BigFive / 3 avaliativas job-fit) | Este phase (QW12) | honestidade psicométrica |

**Deprecated/outdated:** chaves `sjt_evaluation`, `interview_questions`, `interview_summary`, `reference_check`, `final_recommendation` (SCHEMA_VERSIONS) — nunca existiram no enum/template/EF → dropar.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | culture_fit_essay / transcript_analysis / interview_guide TÊM row `is_active=true` em PROD (o mecanismo do stub é SchemaVersionMismatch, não PromptNotConfigured) | AI-01 / Runtime Inventory | Se NÃO ativados, o fix precisa também ATIVAR essas rows, não só adicionar a chave. **Verificar `SELECT call_type,is_active FROM prompt_versions` no plano [BLOCKING].** |
| A2 | `ai_call_logs` **não tem** coluna `prompt_version` (text) — só `prompt_version_id` (uuid) + `prompt_hash` | AI-01 alarme / Open Q3 | Se o audit-logger insere `prompt_version` e a coluna não existe, TODO insert de ai_call_logs pode falhar (PGRST204) — inclusive os 2 call_types que "funcionam". Pode haver drift PROD (coluna adicionada via execute_sql, como o auth-hook policy). **Verificar `\d ai_call_logs` no plano.** |
| A3 | tsc baseline atual = 133 (Phase 22 mediu; pinado no ci.yml) | Validation | STATE.md tem menções a 133 e a "257/301" em anotações antigas — confirmar o baseline vigente antes de commitar (husky gate) |
| A4 | Big Five é não-avaliativo → bandas neutras (não "abaixo/dentro/acima do esperado") na devolutiva | UX-07 | Labels finais são discretion do plano; a família errada quebra a moldura "never pass/fail" |

## Open Questions

1. **Ativação em PROD dos 3 call_types (culture_fit_essay/transcript_analysis/interview_guide)?**
   - Sabemos: cv_job_match+comparative_ranking (P10) e work_sample_sjt (P11) ativados; enum tem os 7.
   - Incerto: is_active dos outros 3. O researcher não tem acesso MCP (restrição de tools).
   - Recomendação: 1ª task do plano = `SELECT call_type, is_active, semver FROM prompt_versions ORDER BY call_type` via MCP; ativar o que faltar.

2. **Orçamento de retry com timeout longo:** 3 tentativas × 60s > teto ~150s do EF.
   - Recomendação: cap de tentativas em função de `effectiveTimeoutMs` (`>25s → 2 tentativas`) ou reduzir MAX_ATTEMPTS p/ chamadas longas. Decidir no plano.

3. **Coluna `ai_call_logs.prompt_version` (text) existe?** O audit-logger a escreve; a migration base não a declara.
   - Recomendação: verificar `information_schema.columns`. Se ausente e o insert falha, adicionar a coluna (migration) resolve DOIS problemas — integridade de auditoria (IA-02) E dá um lugar p/ o alarme 0.0.0 (uma flag booleana `is_stub` seria ainda mais limpa).

4. **RelatoriosRHPage / CandidatosRHPage exibem percentil cru?** (grep sinaliza referência)
   - Recomendação: confirmar no plano; incluir no escopo UX-07 se exibem número ao RH.

## Sources

### Primary (HIGH confidence)
- Código-fonte do repo (file:line citados): `_shared/{prompt-loader,circuit-breaker,ai-client,ai-cost,audit-logger}.ts`; 7 EFs `*/index.ts`; `consolidar-decisao-final/index.ts`; `cost-alerter/index.ts`; `scripts/sync-prompts.ts`; migrations `20260609000001/2/3/4`, `20260610000003`; templates `docs/conhecimento/prompts/templates/*.md`; frontend `DevolutivaBigFiveView/ScorecardAvaliacao/ScoreCard/ConsolidacaoDashboard`.
- `.planning/M4-SYSTEM-AUDIT.md` findings A3/A4/A5/A6/A23/A24/A48 (evidência com file:line/cenário/fix).
- Anthropic SDK TypeScript oficial — `src/core/error.ts` (`APIConnectionTimeoutError`, `"Request timed out."`, sem status) `[VERIFIED via WebFetch]`.

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` + MEMORY.md — histórico de ativação de prompts (Phase 10/11), bundle-freeze, imports npm estáticos, MCP apply_migration.

### Tertiary (LOW confidence)
- Estado `is_active` PROD dos 3 call_types e existência da coluna `ai_call_logs.prompt_version` — **não verificável sem MCP nesta sessão** (flagged Assumptions A1/A2, Open Q1/Q3).

## Metadata

**Confidence breakdown:**
- call_type map (AI-01): HIGH — cruzado grep EFs × SCHEMA_VERSIONS × enum × seed × sync × templates.
- Circuit breaker / isRetryable / parseIntEnv / replay (AI-02/03/05/07): HIGH — file:line + SDK source oficial + testes lidos.
- Cost guardrails (AI-06): HIGH — cadeia trigger/cron/EF lida a file:line.
- UX-07/09: HIGH nos sites; MEDIUM nas labels finais (discretion) e nas telas RH secundárias (Open Q4).
- Estado PROD (ativação, coluna prompt_version): LOW — sem MCP; verificar no plano.

**Research date:** 2026-07-05
**Valid until:** ~2026-08-05 (estável; o único risco de currency é o pin do SDK Anthropic — reconfirmar `APIConnectionTimeoutError` se o pin subir de 0.102.0)
