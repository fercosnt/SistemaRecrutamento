# Phase 10: Triagem RH com IA + Comparativo (Etapa 2) - Research

**Researched:** 2026-06-08
**Domain:** AI-driven candidate triage — Supabase Edge Functions composing Phase 9 AI infra, async pg_net triggers, new analysis tables with RLS, server-side paginated RH panel, client-side PDF export
**Confidence:** HIGH (all infra grounded in shipped Phase 8/9 code, exact file paths cited)

## Summary

Phase 10 is overwhelmingly a **composition phase**, not a greenfield one. Every hard part — the AI runtime (`callAi` with Anthropic `messages.parse` + Zod structured output + ephemeral caching + circuit breaker + audit logging), the async `pg_net` trigger→EF dispatch pattern, the two-client EF shape, the JWT `app_metadata.role` RLS idiom, the prompt library with `cv_job_match` and `comparative_ranking` already authored — shipped in Phases 8 and 9 and is verified live. The new work is: (1) two thin Edge Functions (`analise-candidato-individual`, `comparativo-candidatos`) that wire existing helpers to two new tables; (2) one trigger on `candidaturas` that fires `pg_net` post-knockout; (3) two new tables with RLS; (4) a frontend data layer + panel rewrite + comparativo screen + PDF export.

The single biggest correctness risk is **PII leakage via `select('*')`**: the existing `listCandidaturasByVaga` in `candidaturasService.ts:1158-1176` already does `select('*', candidato:candidatos(..., data_nascimento, cpf, ...))` — the exact anti-pattern the Phase 8 lesson ([[reference_select_star_leaks_pii]]) warns against. The new `analise_candidato_vaga` table carries `score_match`/`flags`/`gaps` which are RH-only PII; the panel read MUST use an explicit column allowlist and the new table's RLS MUST deny `candidato` entirely.

Two **schema-name gaps** must be closed by the planner: (a) `prompt-loader.ts:33` `SCHEMA_VERSIONS` map does NOT contain `comparative_ranking` — `loadPrompt('comparative_ranking', ...)` will throw `SchemaVersionMismatchError` until it's added; (b) the seeded prompts are `is_active=false` (migration `...0004_seed`) — both `cv_job_match` and `comparative_ranking` must be activated (`UPDATE prompt_versions SET is_active=true`) before either EF can resolve a prompt. A third mapping gap: the live `CvJobMatchSchema` uses **English keys** (`reasoning`/`strengths`/`gaps`/`match_score`), so the EF must MAP Zod output → pt-BR DB columns (`resumo_cv`/`pontos_fortes`/`score_match`).

**Primary recommendation:** Build two EFs that import only `_shared/ai-client.ts` (which re-exports `loadPrompt`, `logAiCall`, `callAi`, `CircuitBreaker`), follow the `submit-candidatura` two-client shape, deploy with `--no-verify-jwt` for the trigger-invoked `analise-candidato-individual` (it authenticates a Vault Bearer like `cost-alerter`) and JWT-ON for `comparativo-candidatos` (called by an authenticated RH user). Persist to `analise_candidato_vaga` (UNIQUE on candidatura_id, upsert) and `comparativo_solicitado`. Frontend: replace `select('*')` with an explicit allowlist join, add server-side sort/filter/paginate, add a `supabase.functions.invoke` comparativo hook, and `jspdf@4.2.1` + `jspdf-autotable@5.0.8` for export.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Análise Individual por IA (TRIAGEM-01)**
- Disparo: trigger DB pós-knockout no INSERT de candidatura → `pg_net` chama EF `analise-candidato-individual` assíncrona (≤30s, fora da transação do `submit_candidatura_atomic`). Reusa o padrão pg_net da Phase 9 (cost-anomaly).
- Falha: persiste row com `status='falhou'` + `erro`; painel mostra "análise pendente/falhou — reprocessar" com botão de reprocessamento manual. Não deixa row ausente.
- Fonte do `score_match` 0-100: a EF usa o prompt `cv_job_match` (Sonnet) sobre CV + respostas da Etapa 1, num único call que retorna score + resumo_cv + resumo_respostas + pontos_fortes + gaps + flags. Pesos da vaga (`pesos_avaliacao`) **não** entram aqui.
- Idempotência: 1 row por candidatura (upsert em `candidatura_id`), mantém a última análise; histórico em `ai_call_logs` (Phase 9).

**Painel de Candidatos (TRIAGEM-02)**
- Layout: tabela densa (shadcn `table.tsx`) no shell glass RH, coluna `score_match` escaneável (substitui cards glass de `VagaCandidatosRHPage`, mantém RHLayout/glass shell).
- Seleção: checkbox por linha + barra sticky com contagem; botão "Comparar" habilita só com 2-10 selecionados.
- Paginação: server-side, 20/pág, reusa `PaginationParams` no hook `useCandidaturas`.
- Ordenação/filtros: default `score_match` DESC; filtros por etapa + status; busca por nome mantida; candidaturas sem análise (pendente/falhou) vão pro fim.

**Comparativo & Export PDF (TRIAGEM-03/04)**
- Tabela: candidatos como **colunas** (até 10), atributos como linhas; scroll horizontal no overflow.
- PDF: client-side `jspdf` + `jspdf-autotable` (texto selecionável). Preferido sobre html2canvas/server-side.
- Persistência: grava cada solicitação em `comparativo_solicitado` (candidatura_ids + ranking JSON + latência_ms; RF-09); tela sempre roda fresh, sem cache no V1.
- Ações: avançar/rejeitar inline com dialog de confirmação chamando RPC `avancar_etapa` existente; IA é sugestão, nunca auto-ação. Rejeição aqui não exige justificativa longa.

**Apresentação da IA & Guardrails (RNF-07a)**
- Todo score/ranking carrega selo "Sugestão da IA — decisão é sempre humana".
- Score 0-100 + banda de cor (verde/amarelo/vermelho), sem auto-ação.
- Modelo: análise individual = `cv_job_match` (Sonnet); comparativo = `comparative_ranking` (Sonnet). Teto ≤ R$0,50/candidato no funil.
- Flags: `string[]` livre do modelo, badges informativos, sem gating.

**Comparativo on-demand (TRIAGEM-03 — contrato da EF)**
- EF `comparativo-candidatos` recebe `{ vaga_id, candidatura_ids[] }`; valida 2-10 ids e que **todos pertencem à mesma vaga** (erro 400 caso contrário); retorna ranking + justificativa Zod-validada em P95 ≤5s; usa a infra de IA da Phase 9 (two-client D-23, ai-client, audit-logger).

### Claude's Discretion
- (None explicitly marked; all 4 grey areas were "aceitar tudo". Treat the UI-SPEC and CONTEXT decisions as locked; researcher freedom is limited to implementation detail within them.)

### Deferred Ideas (OUT OF SCOPE)
- Comparativo lado-a-lado de **redações** (RF-17a → V2).
- LLM-as-judge com calibração contínua (Vervoe-style) — Future.
- Cache/reabertura de comparativos anteriores sem re-rodar — V2 (V1 sempre roda fresh).
- Filtro por faixa de score no painel — não pedido.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRIAGEM-01 | Trigger no INSERT de candidatura (pós-knockout) → EF `analise-candidato-individual` gera `analise_candidato_vaga` (resumo_cv, resumo_respostas, pontos_fortes, gaps, score_match 0-100, flags) em ≤30s, Zod-validado | pg_net pattern = `notify_cost_anomaly()` (`20260609000002_prompt_library_rpcs.sql:249-327`); EF composes `loadPrompt('cv_job_match')`+`callAi`+`logAiCall` from `ai-client.ts`; CvJobMatchSchema at `00-shared-zod-schemas.ts:106`; knockout columns at `20260608000001:48-53` |
| TRIAGEM-02 | Painel `/rh/vagas/:id/candidatos` (score_match, top fortes/gaps, data, etapa), 20/pág, default score DESC, filtros etapa+status | `useCandidaturas.ts` (`candidaturasKeys.listByVaga` accepts PaginationParams), `candidaturasService.ts:1145` listByVaga; UI-SPEC §A; route at `routes.tsx:302` |
| TRIAGEM-03 | Comparativo on-demand 2-10 → EF `comparativo-candidatos` ranking + justificativa (P95 ≤5s); persiste `comparativo_solicitado`; 400 se vagas diferentes | ComparativeRankingSchema at `00-shared-zod-schemas.ts:139`; `comparative_ranking` prompt at `templates/03-comparative-ranking.md`; `supabase.functions.invoke` pattern; two-client D-23 from `submit-candidatura/index.ts` |
| TRIAGEM-04 | Tela comparativo — até 10 colunas (score, ranking 1-N, fortes, gaps, justificativa_ia, ação avançar/rejeitar) + export PDF | UI-SPEC §B; `jspdf@4.2.1` + `jspdf-autotable@5.0.8`; `avancar_etapa` RPC (Phase 6) for inline actions |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Async análise dispatch | Database (trigger + pg_net) | API/EF | Trigger fires fire-and-forget; analysis runs out-of-band ≤30s, not in submit txn |
| AI inference (score/resumo/ranking) | API/Backend (Edge Function) | — | Anthropic key + service_role must never reach client; Phase 9 infra is server-only |
| Analysis persistence + RLS | Database | API/EF (writes via service_role) | `analise_candidato_vaga` carries RH-only PII; RLS enforces candidato-no-access |
| Panel data fetch (sorted/filtered/paginated) | API/Backend (PostgREST) | Frontend (TanStack Query) | Server-side ranking by score_match; allowlist projection prevents PII leak |
| Comparativo invocation | Frontend → API/EF | — | `functions.invoke` with user JWT; EF validates same-vaga + 2-10 |
| PDF export | Browser/Client | — | Client-side jspdf; no server round-trip, no PII leaves the authenticated RH session beyond what's already on screen |
| Ranking/score display + guardrail badge | Browser/Client | — | Pure render of server-computed values; RNF-07a framing is UI |

## Standard Stack

### Core (already in repo — reuse, do not reinstall)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` (Deno `npm:`) | 0.102.0 | `messages.parse` structured output in EFs | Already pinned + consumed by `ai-client.ts` [VERIFIED: npm registry — 0.102.0 current] |
| `openai` (Deno `npm:`) | 6.42.0 | Circuit-breaker fallback model | Already pinned in `ai-client.ts` [VERIFIED: npm registry] |
| `zod` (Deno `npm:`) | 3.25.76 | Structured output schemas | Pinned in `00-shared-zod-schemas.ts:16`; peer-dep of parse helpers [VERIFIED: code] |
| `@supabase/supabase-js` | 2.104.0 | Client + EF createClient | Already in `package.json` |
| `@tanstack/react-query` | 5.90.10 | Server-state for panel + comparativo | Project standard (staleTime 5min, retry 2) |

### Supporting (NEW — install for this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jspdf` | 4.2.1 | Client-side PDF document | Comparativo export (TRIAGEM-04) [VERIFIED: npm registry — created 2015, 14.8M weekly downloads, no postinstall] |
| `jspdf-autotable` | 5.0.8 | Table layout plugin for jspdf | Comparativo table (candidates-as-columns) [VERIFIED: npm registry — 3.2M weekly downloads, no postinstall] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jspdf+autotable | html2canvas snapshot | Raster (not selectable text), heavier bundle, font/contrast bugs on glass UI — rejected by CONTEXT |
| jspdf+autotable | Server-side PDF (EF) | Extra round-trip + EF cold start; client-side is near-instant and keeps PII in-session — rejected by CONTEXT |
| `pg_net` trigger | Supabase Realtime / DB webhooks UI | Project already owns the pg_net pattern (Phase 9); webhooks UI config lives outside git (Runtime State concern) |

**Installation:**
```bash
npm install jspdf@4.2.1 jspdf-autotable@5.0.8
```
(`@anthropic-ai/sdk`, `openai`, `zod` are Deno `npm:` specifiers resolved at EF runtime — NOT npm-installed into the Vite app. Do not add them to `package.json`.)

**Version verification (run before locking):**
```bash
npm view jspdf version            # expect 4.2.1+
npm view jspdf-autotable version  # expect 5.0.8+
```

## Package Legitimacy Audit

> slopcheck was **unavailable** at research time (`pip install slopcheck` failed in sandbox). Per protocol, packages are tagged `[ASSUMED]` and the planner SHOULD gate the install behind a `checkpoint:human-verify` task. However, both libraries are decade-old, multi-million-download, zero-postinstall packages — risk is minimal; a quick `npm view` confirm at install time suffices.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| jspdf | npm | ~11 yrs (2015-05) | 14.8M/wk | github.com/parallax/jsPDF | unavailable | Approved [ASSUMED] — verify `npm view` at install |
| jspdf-autotable | npm | mature | 3.2M/wk | github.com/simonbengtsson/jsPDF-AutoTable | unavailable | Approved [ASSUMED] — verify `npm view` at install |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**Postinstall scripts:** none on either package (verified via `npm view ... scripts.postinstall` → empty)

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────── INSCRIÇÃO (Phase 8, existing) ──────────────────────┐
│ submit-candidatura EF → submit_candidatura_atomic RPC (txn):               │
│   INSERT candidaturas (etapa='inscricao') + respostas + knockout sweep     │
│   survivor → etapa_atual='triagem' ; knockout → status='rejeitado'         │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                    │ AFTER INSERT trigger (NEW, Phase 10)
                                    │ WHEN status <> 'rejeitado' (post-knockout)
                                    ▼
                    ┌──────────────────────────────────┐
                    │ trg_candidatura_analise()        │  SECURITY DEFINER
                    │ reads Vault project_url +         │  SET search_path=''
                    │ edge_invoke_key; PERFORM          │  (pattern: notify_cost_anomaly)
                    │ net.http_post(.../analise-...)    │
                    └───────────────┬──────────────────┘
                                    │ pg_net async (out of txn, ≤30s SLA)
                                    │ Bearer <edge_invoke_key>
                                    ▼
        ┌────────────────── analise-candidato-individual EF ──────────────────┐
        │ (--no-verify-jwt; self-auth Vault Bearer like cost-alerter)         │
        │  1. validate Bearer == SERVICE_KEY                                   │
        │  2. supabaseAdmin.from('candidaturas').select(allowlist) by id      │
        │  3. fetch CV text (from curriculo_url storage) + respostas + vaga    │
        │  4. loadPrompt('cv_job_match') → callAi(...) [Anthropic Sonnet,      │
        │     ephemeral cache on system+vaga, Zod CvJobMatchSchema]            │
        │  5. MAP English Zod keys → pt-BR cols + UPSERT analise_candidato_vaga│
        │     (status='sucesso' | on any failure 'falhou'+erro — NEVER absent) │
        │  6. logAiCall already fired inside callAi (ai_call_logs)             │
        └─────────────────────────────────────────────────────────────────────┘
                                    │ writes
                                    ▼
            ┌───────────── analise_candidato_vaga (NEW table) ───────────────┐
            │ UNIQUE(candidatura_id) · score_match · pontos_fortes[] ·       │
            │ gaps[] · flags[] · status · RLS: admin full / RH own vagas /   │
            │ candidato NO ACCESS                                            │
            └───────────────────────────────┬───────────────────────────────┘
                                            │ read (allowlist join)
                                            ▼
   ┌──── RH Panel /rh/vagas/:id/candidatos (TanStack Query, server-side) ────┐
   │ listByVaga JOIN analise → sort score_match DESC nulls-last, 20/pg,      │
   │ filter etapa+status. ALLOWLIST select (NOT '*'). Renders dense table.   │
   │   └─ select 2-10 rows → "Comparar (N)"                                  │
   └───────────────────────────────┬─────────────────────────────────────────┘
                                    │ supabase.functions.invoke (user JWT)
                                    ▼
        ┌──────────────── comparativo-candidatos EF ─────────────────────────┐
        │ (JWT-ON; two-client D-23: anon→getUser, service_role→reads/writes) │
        │  1. validate 2-10 ids + all same vaga_id (else 400)                 │
        │  2. fetch the N analise_candidato_vaga rows for the ids             │
        │  3. loadPrompt('comparative_ranking') → callAi(...) [Sonnet, Zod    │
        │     ComparativeRankingSchema] — P95 ≤5s                             │
        │  4. INSERT comparativo_solicitado (ids, ranking JSON, latencia_ms)  │
        │  5. return ranking → client renders columns + jspdf export          │
        └─────────────────────────────────────────────────────────────────────┘
```

### Recommended Structure
```
supabase/functions/
├── analise-candidato-individual/index.ts   # NEW — trigger sink (--no-verify-jwt)
├── comparativo-candidatos/index.ts          # NEW — RH-invoked (JWT ON)
├── _shared/
│   ├── ai-client.ts          # EXISTING — import callAi, loadPrompt, logAiCall
│   ├── schemas.ts            # EXTEND — add EF body schemas (analise/comparativo)
│   └── analise-mappers.ts    # NEW (optional) — CvJobMatch→pt-BR column mapper
supabase/migrations/
├── 20260610000001_analise_tables.sql        # NEW — 2 tables + RLS + index
├── 20260610000002_analise_trigger.sql       # NEW — trg_candidatura_analise + pg_net
src/features/
├── triagem/                                  # NEW feature dir
│   ├── hooks/{useTriagemPanel,useComparativo}.ts
│   ├── services/triagemService.ts            # allowlist join read + invoke
│   ├── components/{TriagemTable,ComparativoScreen,SugestaoIABadge}.tsx
│   └── pdf/exportComparativo.ts              # jspdf + autotable
```

### Pattern 1: Compose Phase 9 AI infra in an EF
**What:** EFs import ONLY `_shared/ai-client.ts`, which re-exports `loadPrompt`, `logAiCall`, `callAi`, `CircuitBreaker`, `calculateCost`, `maskPII`, `detectPromptInjection`.
**When:** Any EF that calls a model.
**Example:**
```typescript
// Source: supabase/functions/_shared/ai-client.ts:54-58, :249 (callAi signature)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0"
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod"
import OpenAI from "npm:openai@6.42.0"
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod"
import { callAi, loadPrompt, resolvedPromptFromLoaded } from "../_shared/ai-client.ts"
import { CvJobMatchSchema } from "../../../docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts"
// NOTE: copy the schema into _shared/ for EF import scope — do not reach into docs/ at runtime.

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{ persistSession:false }})
const loaded = await loadPrompt('cv_job_match', supabaseAdmin)        // DB-only, active/canary
const prompt = resolvedPromptFromLoaded(loaded, 'cv_job_match', 'gpt-4o-mini')
const result = await callAi(
  { prompt, rawInput: cvPlusRespostasText, vagaRubricBlock, candidato_id, vaga_id,
    schema: CvJobMatchSchema, idempotency_key: candidatura_id },
  { anthropic: new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') }),
    openai:    new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') }),
    supabase:  supabaseAdmin, zodOutputFormat, zodResponseFormat }
)
// result.parsed is CvJobMatch (English keys); logAiCall already wrote ai_call_logs inside callAi.
```
**Key:** `callAi` ALREADY does injection-detect → maskPII → breaker → Anthropic(parse+cache+retry) → OpenAI fallback → cost → `logAiCall`. The EF does NOT re-implement any of that. `idempotency_key=candidatura_id` makes re-triggered analyses replay (cost_usd=0) instead of double-charging.

### Pattern 2: Async trigger → pg_net → EF (Vault Bearer auth)
**What:** A `SECURITY DEFINER` trigger reads two Vault secrets and `PERFORM net.http_post(...)` with a Bearer; the EF is deployed `--no-verify-jwt` and self-authenticates the Bearer.
**Source of truth:** `notify_cost_anomaly()` in `20260609000002_prompt_library_rpcs.sql:249-327` + the auth check in `cost-alerter/index.ts:118-140`.
**Example (trigger — adapt for `candidaturas`):**
```sql
-- Source: 20260609000002_prompt_library_rpcs.sql:249-327 (verbatim pattern)
CREATE OR REPLACE FUNCTION public.trg_candidatura_analise()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_project_url text; v_invoke_key text;
BEGIN
  -- Only analyze survivors (post-knockout). Knockouts are status='rejeitado'.
  IF NEW.status = 'rejeitado' OR NEW.opcao_knockout_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name='project_url';
  SELECT decrypted_secret INTO v_invoke_key  FROM vault.decrypted_secrets WHERE name='edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN RETURN NEW; END IF;  -- graceful skip
  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/analise-candidato-individual',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || v_invoke_key),
    body := jsonb_build_object('candidatura_id', NEW.id, 'vaga_id', NEW.vaga_id)
  );
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_candidaturas_analise AFTER INSERT ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.trg_candidatura_analise();
```
**Auth model (critical):** pg_net carries NO user JWT. The EF therefore CANNOT call `auth.getUser()`. It MUST be deployed `--no-verify-jwt` and compare the incoming `Bearer` against `SUPABASE_SERVICE_ROLE_KEY` (== the Vault `edge_invoke_key`), exactly as `cost-alerter/index.ts:128-140` does. Reject 401 on mismatch.
**Vault note:** `project_url` + `edge_invoke_key` Vault secrets already exist (created human-gated in Phase 9 Plan 07). Reuse them — no new secret needed. Confirm via `select name from vault.decrypted_secrets`.

### Pattern 3: Status-row always written (never-absent invariant)
**What:** Wrap the analysis in try/catch; on ANY failure write `analise_candidato_vaga (candidatura_id, status='falhou', erro=...)` via upsert. The panel reprocess button re-invokes the EF.
**Why:** CONTEXT locks "não deixa row ausente". A missing row is indistinguishable from "not yet triggered". `callAi` itself never throws for model/injection failures (returns `flagged_for_human_review`), but `loadPrompt` throws `PromptNotConfiguredError`/`SchemaVersionMismatchError`, and storage/PDF-parse/DB can throw — all must land a `status='falhou'` row.

### Pattern 4: Allowlist projection on the panel read (anti-PII-leak)
**What:** Replace `select('*', candidato:candidatos(...))` with an explicit column list joining `analise_candidato_vaga`.
**Source of the hazard:** `candidaturasService.ts:1158-1176` currently does `select('*')` AND pulls `data_nascimento, cpf`. RLS is row-level only — it does NOT hide columns ([[reference_select_star_leaks_pii]]). The new analysis columns (`score_match`, `gaps`, `flags`) are RH-only.
**Example:**
```typescript
// Replace candidaturasService.ts listByVaga select() with:
.select(`
  id, status, etapa_atual, created_at, curriculo_nome_original,
  candidato:candidatos ( id, nome_completo ),
  analise:analise_candidato_vaga ( score_match, pontos_fortes, gaps, flags, status )
`, { count: 'exact' })
// NO data_nascimento, NO cpf, NO email/celular on the panel grid (RNF-07b age-bias hygiene).
```

### Anti-Patterns to Avoid
- **`select('*')` on any candidato-adjacent read** — leaks PII + score criterion. Always allowlist.
- **Calling `auth.getUser()` in the trigger-invoked EF** — pg_net has no JWT; will always fail. Use Vault Bearer self-auth.
- **Re-implementing retry/cache/logging in the EF** — `callAi` owns all of it.
- **Reaching into `docs/conhecimento/...` from EF runtime** — copy the Zod schemas into `_shared/` (EF import scope); `docs/` is not deployed with the function.
- **Activating prompts via code** — `is_active=true` flip is a manual SQL step (Phase 9 D); do it as a one-time human/MCP apply, not in the EF.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Anthropic structured output | Manual JSON-schema prompt + regex parse | `callAi` + `zodOutputFormat(CvJobMatchSchema)` | SDK auto-revalidates client-side, handles unsupported keywords (`ai-client.ts:320`) |
| Retry / circuit breaking | Custom retry loop | `callAi` (exp-backoff 3x on 429/503/529 + breaker→OpenAI) | Already shipped + tested (`ai-client.ts:317-387`) |
| PII masking before log | Custom regex | `maskPII` (re-exported) | Phase 9 ordering invariant (mask-before-write, Pitfall 6) |
| AI call audit logging | Custom insert | `logAiCall` (fired inside `callAi`) | retain_until + input_hash + masked template (`audit-logger.ts:103`) |
| async dispatch out of txn | LISTEN/NOTIFY + worker | `pg_net` trigger + Vault Bearer EF | Project owns this exact pattern (`notify_cost_anomaly`) |
| PDF table layout | Manual jspdf `.text()` positioning | `jspdf-autotable` `autoTable(doc, {head,body})` | Handles column widths, page breaks, wrapping |
| Pagination/sort/filter | Client-side array ops | PostgREST `.range()`/`.order()`/`.eq()` | Server-side scales to 30+ candidates; `candidaturasService.ts:1198-1214` precedent |

**Key insight:** The entire AI runtime is a solved problem in this repo. Phase 10's EFs should be ~150 LoC each — mostly input assembly + output mapping + persistence. If a Phase 10 EF is re-implementing retries or logging, it's wrong.

## Runtime State Inventory

> Phase 10 creates new tables/triggers/EFs — it is mostly additive, but the async dispatch touches live runtime state. Each category answered explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing `candidaturas` rows in PROD have NO `analise_candidato_vaga` row (table is new). Survivors inserted before the trigger exists will never auto-analyze. | **Backfill decision:** the panel reprocess button + an optional one-time backfill (invoke EF per existing survivor) — plan a backfill task or accept that pre-trigger candidaturas show "pendente" until manually reprocessed. |
| Live service config | Vault secrets `project_url` + `edge_invoke_key` already created (Phase 9 Plan 07, human-gated) — REUSED by the new trigger, no new secret. n8n `nova-candidatura` webhook unaffected. | Confirm secrets exist: `select name from vault.decrypted_secrets`. None to create. |
| OS-registered state | None — no Task Scheduler / cron / pm2 changes (pg_cron jobs from Phase 9 unrelated). | None. |
| Secrets / env vars | EFs need `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (set Phase 9), `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (standard). The trigger-EF additionally relies on `edge_invoke_key` Vault secret == service_role JWT. | Verify ANTHROPIC/OPENAI keys are deployed to the new functions (they're project-level EF secrets — confirm with `supabase secrets list`). |
| Build artifacts / installed pkgs | `jspdf` + `jspdf-autotable` new in `package.json` → must `npm install` + commit lockfile. `database.types.ts` (repo ROOT) must be regenerated after the migration to expose the new tables. | `npm install`; `npm run db:types` after migration apply. |

**The canonical question — after every file is updated, what runtime systems still need a change?** (1) The two EFs must be `supabase functions deploy`-ed (analise with `--no-verify-jwt`, comparativo WITHOUT). (2) Prompts `cv_job_match` + `comparative_ranking` must be flipped `is_active=true` in PROD. (3) `comparative_ranking` must be added to `prompt-loader.ts:33` SCHEMA_VERSIONS (code) before deploy. (4) `database.types.ts` regenerated.

## Common Pitfalls

### Pitfall 1: `comparative_ranking` missing from runtime SCHEMA_VERSIONS
**What goes wrong:** `loadPrompt('comparative_ranking', ...)` throws `SchemaVersionMismatchError` → comparativo EF 500s for every request.
**Why:** `prompt-loader.ts:33-41` `SCHEMA_VERSIONS` lists `cv_summary, cv_job_match, sjt_evaluation, interview_questions, interview_summary, reference_check, final_recommendation` — it does NOT include `comparative_ranking` (the DB enum `llm_call_type` and the shared schemas DO). `assertSchemaVersionCompat` fails fast on the unknown call_type.
**How to avoid:** Add `comparative_ranking: "1.0.0"` (and align the map to the actual seeded call_types) in `prompt-loader.ts` as a Wave-0 code task BEFORE the comparativo EF is wired.
**Warning sign:** deno test of comparativo EF throws `<desconhecido>` in the error message.

### Pitfall 2: Seeded prompts are `is_active=false`
**What goes wrong:** `loadPrompt` throws `PromptNotConfiguredError` (no active row) for `cv_job_match` and `comparative_ranking` → both EFs fail until activation.
**Why:** `20260609000004_prompt_library_seed.sql:2,24-25` seeds `is_active=false`; activation is a deliberate manual SQL step (Phase 9 D).
**How to avoid:** A one-time PROD `UPDATE prompt_versions SET is_active=true WHERE call_type IN ('cv_job_match','comparative_ranking') AND is_canary=false` — plan as a BLOCKING human/MCP apply task, the same class as Phase 8's PROD migration apply.
**Warning sign:** EF returns `prompt_not_configured`.

### Pitfall 3: English Zod keys vs pt-BR DB columns
**What goes wrong:** `result.parsed` from `CvJobMatchSchema` has `reasoning`, `strengths[].competency`, `gaps[].requirement`, `match_score`, `recommendation` — NOT `resumo_cv`, `pontos_fortes`, `gaps` (text[]), `score_match`. A naive spread into the insert writes nothing/nulls.
**Why:** `00-shared-zod-schemas.ts:106-131` defines English keys; the table (RF-06) uses pt-BR.
**How to avoid:** Write an explicit mapper: `score_match = match_score`; `pontos_fortes = strengths.map(s => s.competency)` (or a formatted string); `gaps = gaps.map(g => g.requirement)`; `resumo_cv` / `resumo_respostas` — note `CvJobMatchSchema` has NO `resumo_cv` field. **Decision needed:** either (a) derive `resumo_cv` from a separate `cv_summary` call, or (b) extend `CvJobMatchSchema` to add `resumo_cv`/`resumo_respostas` (a MAJOR schema bump → new semver + re-sync). Simplest V1: store `reasoning` as `resumo_respostas` and the `cv_summary` prompt output (or a truncated CV) as `resumo_cv`. **Flag for discuss-phase.**
**Warning sign:** `analise_candidato_vaga.resumo_cv` is null in smokes.

### Pitfall 4: CV is a stored PDF, not text
**What goes wrong:** The EF needs `{{CV_TEXT_ANONYMIZED}}` but `candidaturas.curriculo_url` points to a PDF in the `curriculos` storage bucket — there's no extracted CV text column.
**Why:** Phase 4 stored the raw PDF (D-10 path schema); no text extraction shipped.
**How to avoid:** **Decision needed.** Options: (a) the EF downloads the PDF via service_role storage + parses text (needs a Deno PDF lib — adds a dependency + latency, risks the ≤30s SLA); (b) V1 analyzes ONLY the Etapa-1 `respostas_formulario` + vaga (skip CV text), and `resumo_cv` becomes "CV anexado — análise baseada nas respostas"; (c) run `cv_summary` prompt which already targets CV. Given the ≤30s SLA and no shipped extractor, (b) is the lowest-risk V1. **Flag for discuss-phase** — this materially changes the prompt input and the `resumo_cv` field.
**Warning sign:** EF latency > 30s or `resumo_cv` is empty.

### Pitfall 5: Comparativo P95 ≤5s with up to 10 candidates
**What goes wrong:** Sending 10 full CV+analysis blobs to Sonnet blows the token budget + latency past 5s; the `comparative_ranking` prompt also prescribes **double-evaluation** (run twice with inverted order — `templates/03-comparative-ranking.md`), which doubles latency.
**Why:** Position-bias mitigation in the prompt design vs the P95 SLA conflict.
**How to avoid:** (1) Feed the comparativo the ALREADY-COMPUTED per-candidate analyses (`pontos_fortes`/`gaps`/`score_match` from `analise_candidato_vaga`), NOT raw CVs — they're compact. (2) Cache the stable vaga/rubric context via the ephemeral `cache_control` blocks `callAi` already sets (`ai-client.ts:324-327`). (3) **Decision:** for V1, run double-evaluation SINGLE-pass to hit 5s, OR run sequentially and accept higher P95 — measure. **Flag for discuss-phase** (the prompt prescribes double-eval; SLA may force single-eval in V1).
**Warning sign:** comparativo invoke > 5s in UAT.

### Pitfall 6: pg_net failure leaves no analysis row
**What goes wrong:** If `net.http_post` fails (network/EF down), no `analise_candidato_vaga` row is ever written → panel shows nothing, no "falhou" to reprocess.
**Why:** The trigger fires fire-and-forget; pg_net failures are silent at the DB layer.
**How to avoid:** The "falhou" row is written by the EF on its internal errors, but a never-delivered POST writes nothing. Mitigation: the panel treats "no analise row for a survivor" as `pendente` and offers reprocess; optionally a reconcile cron (deferred) re-invokes for survivors with no row older than N minutes. V1: reprocess button covers it (CONTEXT: "não deixa row ausente" is satisfied by treating absent-as-pendente in the UI + manual reprocess).
**Warning sign:** survivors stuck "pendente" indefinitely.

### Pitfall 7: 42601 on PL/pgSQL migration push
**What goes wrong:** The trigger migration (`CREATE FUNCTION ... $$...$$` + `CREATE TRIGGER`/`COMMENT`) may hit `SQLSTATE 42601` via `db push --linked`.
**Why:** Documented in CLAUDE.md §Commands (D-22).
**How to avoid:** Author WITHOUT a `BEGIN; ... COMMIT;` wrapper (Phase 8 did this and pushed clean). If 42601 still fires, apply via **Supabase MCP `execute_sql`** (memory: bypasses 42601 + reconciles version rows) or SQL Editor + `migration repair --status applied <version>`.
**Warning sign:** `cannot insert multiple commands into a prepared statement`.

### Pitfall 8: idempotency on re-trigger / re-upsert
**What goes wrong:** A duplicate INSERT or manual reprocess re-runs the model and double-charges + duplicates rows.
**Why:** AFTER INSERT fires once per insert, but reprocess re-invokes.
**How to avoid:** (1) `callAi` with `idempotency_key=candidatura_id` replays the prior `ai_call_logs` result at cost 0 (`ai-client.ts:212-239`) — but a deliberate reprocess WANTS a fresh call, so reprocess should use a fresh idempotency_key (e.g. `candidatura_id:retry:<ts>`). (2) The table `UNIQUE(candidatura_id)` + `INSERT ... ON CONFLICT (candidatura_id) DO UPDATE` keeps exactly one row (latest wins, CONTEXT idempotency lock).
**Warning sign:** two rows per candidatura, or reprocess returns the stale (failed) result.

## Code Examples

### Comparativo EF — same-vaga validation + invoke
```typescript
// Source pattern: submit-candidatura/index.ts:142-178 (two-client D-23) + functions.invoke
// 1. validate body 2-10 ids
if (ids.length < 2 || ids.length > 10) return errorResponse('VALIDATION','Selecione 2 a 10 candidatos.',400)
// 2. fetch the analyses + confirm all same vaga
const { data: rows } = await supabaseAdmin
  .from('analise_candidato_vaga')
  .select('candidatura_id, vaga_id, score_match, pontos_fortes, gaps, flags, resumo_cv')
  .in('candidatura_id', ids)
const vagas = new Set(rows.map(r => r.vaga_id))
if (vagas.size !== 1 || rows.length !== ids.length)
  return errorResponse('VALIDATION','Os candidatos pertencem a vagas diferentes.',400)
```

### Frontend comparativo invoke hook
```typescript
// Source: supabase.functions.invoke + TanStack mutation
export const triagemKeys = {
  panel: (vagaId, filters, orderBy, pagination) =>
    ['triagem','panel', vagaId, { filters, orderBy, pagination }] as const,
  comparativo: (vagaId, ids) => ['triagem','comparativo', vagaId, ids.slice().sort()] as const,
}
async function invokeComparativo(vagaId: string, candidaturaIds: string[]) {
  const { data, error } = await supabase.functions.invoke('comparativo-candidatos', {
    body: { vaga_id: vagaId, candidatura_ids: candidaturaIds },
  })
  if (error) throw error
  return data  // { ranking, latencia_ms }
}
```

### PDF export (candidates as columns)
```typescript
// Source: jspdf-autotable v5 API
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
export function exportComparativo(ranking: RankedCandidate[]) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.text('Comparativo de Candidatos — Beauty Smile', 14, 16)
  // attributes as rows, candidates as columns
  const head = [['Atributo', ...ranking.map(c => c.nome)]]
  const body = [
    ['Ranking IA', ...ranking.map(c => `${c.rank}º`)],
    ['Score', ...ranking.map(c => String(c.composite_score))],
    ['Pontos fortes', ...ranking.map(c => c.relative_strengths.join('; '))],
    ['Gaps', ...ranking.map(c => c.relative_weaknesses.join('; '))],
    ['Justificativa', ...ranking.map(c => c.rationale)],
  ]
  autoTable(doc, { head, body, startY: 22, styles: { fontSize: 8, cellWidth: 'wrap' } })
  doc.save('comparativo-candidatos.pdf')
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@anthropic-ai/sdk@0.52` (reference template) | `0.102.0` (live pin) | Phase 9 | Use 0.102.0 — the 08-edge-function-reference.ts version is stale |
| Custom JSON parse of LLM output | `messages.parse` + `zodOutputFormat` | Phase 9 | Structured output is solved; just pass the Zod schema |
| `select('*')` RH reads | Explicit column allowlist | Phase 8 lesson | Mandatory for any candidato-adjacent read |

**Deprecated/outdated:**
- `08-edge-function-reference.ts` SDK pins (0.52/4.104) — superseded by live `ai-client.ts` pins.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `jspdf@4.2.1` + `jspdf-autotable@5.0.8` are legitimate (slopcheck unavailable) | Package Audit | Low — both decade-old, multi-M downloads, no postinstall; verify `npm view` at install |
| A2 | Vault `project_url`+`edge_invoke_key` still exist in PROD (created Phase 9 P07) | Pattern 2 / Runtime State | Trigger dispatch silently skips if absent — confirm before relying on it |
| A3 | `resumo_cv` should come from CV text, but no extractor ships → V1 may analyze respostas-only | Pitfall 3/4 | Changes prompt input + `resumo_cv` semantics — MUST confirm in discuss-phase |
| A4 | Comparativo can hit P95 ≤5s by feeding compact pre-computed analyses + single-eval | Pitfall 5 | If double-eval is mandatory, SLA may need relaxation — confirm |
| A5 | `comparative_ranking` schema_version is "1.0.0" and matches the shared schema | Pitfall 1 | Mismatch → EF 500; verify the seed semver |
| A6 | ANTHROPIC/OPENAI keys are available to the new EFs as project secrets | Runtime State | EF 500 on missing key — confirm `supabase secrets list` |

**Non-empty:** these 6 assumptions need confirmation before they become locked decisions. A3 and A4 are the highest-impact (they change the prompt contract).

## Open Questions (RESOLVED)

> All 4 closed via the user during plan-phase; see CONTEXT.md `### Decisões resolvidas pós-research (2026-06-08)`.

1. **`resumo_cv` source (A3).** CvJobMatchSchema has no resumo_cv field and no CV-text extractor ships. Options: respostas-only V1 (lowest risk), run `cv_summary` prompt (extra call + cost), or extend the schema (MAJOR bump). ~~Recommendation: respostas-only.~~ **RESOLVED:** user chose to **extract the CV PDF text inside the EF** (Deno-compatible parser, e.g. `unpdf`); `resumo_cv` is a faithful CV summary, not respostas-only. Extraction failure → analysis proceeds on respostas + flag `cv_nao_extraido`, never breaks the row. (CONTEXT.md post-research decision #1.)
2. **Comparativo double-evaluation vs ≤5s (A4).** The prompt prescribes double-eval for position-bias; the SLA may forbid it. **RESOLVED:** **single-eval V1** to meet P95 ≤5s; mitigate position bias by anchoring on the stable `score_match` + ordering candidates by score before the prompt; double-eval deferred to V2 and documented in the plan. (CONTEXT.md post-research decision #2.)
3. **Backfill of pre-trigger candidaturas.** Survivors inserted before the trigger exists have no analysis. **RESOLVED:** **reprocess button only** — trigger covers all NEW candidaturas; old ones (test data) show "análise pendente/falhou" with a Reprocessar análise button. No one-time historical loop. (CONTEXT.md post-research decision #3.)
4. **`pontos_fortes`/`gaps` as text[] vs structured.** Zod gives objects (`{competency, evidence, impact}`); the table column is `text[]`. **RESOLVED:** flatten to concise `competency` strings for the `text[]` columns; keep full structured objects in `resumo_respostas`/`ai_call_logs.raw_response` for audit. (Claude's discretion, ratified in CONTEXT.md.)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Anthropic API (key) | analise + comparativo EFs | ✓ (Phase 9 deployed) | — | OpenAI gpt-4o-mini via breaker |
| OpenAI API (key) | breaker fallback | ✓ (Phase 9) | — | — |
| Supabase Vault secrets (project_url, edge_invoke_key) | trigger dispatch | ✓ assumed (A2) | — | trigger skips gracefully if absent |
| pg_net extension | trigger | ✓ (`CREATE EXTENSION` in `...0001:47`) | — | — |
| Supabase pg_cron | (not needed this phase) | ✓ | — | — |
| jspdf / jspdf-autotable | PDF export | ✗ (new) | 4.2.1 / 5.0.8 | none — required, `npm install` |
| Supabase CLI (db push / functions deploy / db:types) | migration + EF deploy + types | ✓ | — | MCP execute_sql for 42601 |

**Missing with no fallback:** jspdf + jspdf-autotable — must install.
**Missing with fallback:** none blocking.

## Validation Architecture

> nyquist_validation = true (config.json). Section included.

### Test Framework
| Property | Value |
|----------|-------|
| Frontend framework | Vitest (happy-dom), config in `vite.config.ts:9-32`, include `**/__tests__/**/*.{test,spec}.{ts,tsx}` |
| EF framework | `deno test` (Deno tests EXCLUDED from Vitest at `vite.config.ts:19-27`); existing suites in `supabase/functions/_shared/__tests__/` |
| E2E | Playwright (`playwright.config.ts`, `npm run test:e2e`) |
| Quick run | `npm run test:run` (Vitest) / `deno test supabase/functions/...` (EF) |
| Full suite | `npm run test:run && npm run test:e2e` |
| DB smokes | SQL via Supabase MCP `execute_sql` (fixture + `set_config('request.jwt.claims',...)` to simulate RH/candidato — Phase 7/8 precedent) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Command / Approach | Exists? |
|-----|----------|-----------|--------------------|---------|
| TRIAGEM-01 | trigger fires pg_net only for survivors (not knockouts) | DB smoke | insert knockout row → assert NO net.http_post; insert survivor → assert dispatch | ❌ Wave 0 |
| TRIAGEM-01 | analise EF maps CvJobMatch→pt-BR + upserts, writes 'falhou' on error | deno test (mocked Anthropic/supabase via `deps`, like `ai-client.test.ts`) | `deno test analise-candidato-individual/...test.ts` | ❌ Wave 0 |
| TRIAGEM-01 | RLS: candidato CANNOT read analise_candidato_vaga | DB smoke | set jwt claims role=candidato → SELECT returns 0 rows | ❌ Wave 0 |
| TRIAGEM-01 | RLS: RH reads own-vaga analyses; admin full | DB smoke | role=rh + role=administrador SELECT assertions | ❌ Wave 0 |
| TRIAGEM-02 | listByVaga allowlist (NO cpf/data_nascimento), score DESC nulls-last, 20/pg | vitest (service) + integration | mock supabase chain; assert select() string has no `*`/`cpf` | ❌ Wave 0 |
| TRIAGEM-02 | panel renders score band + select 2-10 + reprocess on falhou | vitest (RTL component) | render TriagemTable, assert bands + compare-bar gating | ❌ Wave 0 |
| TRIAGEM-03 | EF rejects <2/>10 and mixed-vaga (400) | deno test | mocked rows, assert 400 codes | ❌ Wave 0 |
| TRIAGEM-03 | comparativo_solicitado audit row written | DB smoke | invoke → assert one row (ids, ranking, latencia_ms) | ❌ Wave 0 |
| TRIAGEM-04 | comparativo screen columns + jspdf export | vitest (RTL) + manual | render + mock jspdf; manual PDF visual | ❌ Wave 0 + manual |
| RNF-07a | "Sugestão da IA" badge present on panel + comparativo; no auto-action | vitest (RTL) | assert SugestaoIABadge rendered; no reject-on-score path | ❌ Wave 0 |
| LGPD-04 | no forbidden product terms in new code | grep guard (existing) | `pitfall*/forbidden-strings.grep` extended to new paths | ⚠️ extend |

### Sampling Rate
- **Per task commit:** `npm run test:run` (Vitest) + `deno test <changed EF>` for EF tasks.
- **Per wave merge:** full Vitest + deno EF suites + DB smokes for any migration wave.
- **Phase gate:** full suite green + UAT (panel + comparativo + PDF + reprocess) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `supabase/functions/analise-candidato-individual/__tests__/index.test.ts` — TRIAGEM-01 EF (mock deps, RED)
- [ ] `supabase/functions/comparativo-candidatos/__tests__/index.test.ts` — TRIAGEM-03 (2-10 + same-vaga, RED)
- [ ] `src/features/triagem/services/__tests__/triagemService.test.ts` — allowlist + sort/paginate (RED)
- [ ] `src/features/triagem/components/__tests__/TriagemTable.test.tsx` — bands + compare gating (RED)
- [ ] DB smoke runbook — trigger survivor/knockout, RLS 3-role matrix, comparativo audit row
- [ ] Extend `prompt-loader.ts` SCHEMA_VERSIONS test to include `comparative_ranking`
- [ ] Extend LGPD-04 forbidden-strings.grep allowlist to `supabase/functions/analise-*` + `comparativo-*` + `src/features/triagem/`

## Security Domain

> security_enforcement not set to false → enabled.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | comparativo EF: JWT verify ON + two-client `auth.getUser` (D-23). analise EF: Vault Bearer self-auth (`--no-verify-jwt`, like cost-alerter) |
| V3 Session Management | yes | RH JWT `app_metadata.role` IN ('rh','administrador') for panel + comparativo |
| V4 Access Control | yes | RLS on `analise_candidato_vaga` + `comparativo_solicitado`: admin full, RH own-vaga, candidato DENY; comparativo EF verifies RH role server-side |
| V5 Input Validation | yes | Zod body schemas (ids 2-10, uuid); same-vaga check; injection-detect inside `callAi` |
| V6 Cryptography | yes (indirect) | Vault `decrypted_secrets`; service_role JWT never client-side; never hand-roll |
| V8 Data Protection (PII) | yes | allowlist projection (no cpf/data_nascimento on panel); analise table candidato-DENY; logs masked (Pitfall 6) |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Candidato reads own score/flags via adjacent route | Information Disclosure | RLS DENY candidato on analise_candidato_vaga + allowlist projection ([[reference_select_star_leaks_pii]]) |
| `select('*')` leaks cpf/data_nascimento + criterion | Information Disclosure | Explicit column allowlist (Pattern 4); RNF-07b age-bias hygiene |
| pg_net EF invoked by anonymous actor (no JWT verify) | Spoofing | Vault Bearer == service_role compare, 401 on mismatch (cost-alerter precedent) |
| IDOR: RH compares candidatos of a vaga they don't own | Elevation of Privilege | EF re-checks vaga ownership / role; RLS on analise reads |
| Prompt injection via CV/respostas | Tampering | `detectPromptInjection` short-circuits inside `callAi` (already wired) |
| Auto-rejection by score (LGPD-02 / RNF-07a) | — (compliance) | NO score-gated status change; flags are non-gating badges; inline reject is human-confirmed |
| AI cost runaway across 30+ candidates | DoS (cost) | ephemeral cache on stable vaga/rubric; idempotency_key replay; ≤R$0,50/candidato ceiling |

## Sources

### Primary (HIGH confidence — codebase, verified this session)
- `supabase/functions/_shared/ai-client.ts` — callAi signature, cache_control, retry/fallback, idempotency replay
- `supabase/functions/_shared/prompt-loader.ts` — loadPrompt, SCHEMA_VERSIONS gap (no comparative_ranking)
- `supabase/functions/_shared/audit-logger.ts` — logAiCall, retain_until
- `supabase/functions/submit-candidatura/index.ts` — two-client D-23 EF shape
- `supabase/functions/cost-alerter/index.ts:118-140` — Vault Bearer self-auth, `--no-verify-jwt`
- `supabase/migrations/20260609000002_prompt_library_rpcs.sql:249-327` — notify_cost_anomaly pg_net pattern (verbatim template)
- `supabase/migrations/20260608000001_inscricao_knockout.sql:48-53` — knockout columns (status/opcao_knockout_id)
- `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:39-76` — RLS app_metadata.role idiom
- `supabase/migrations/20260609000004_prompt_library_seed.sql` — prompts seeded is_active=false
- `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts:106,139` — CvJobMatchSchema / ComparativeRankingSchema (English keys)
- `docs/conhecimento/prompts/templates/02,03-*.md` — prompt frontmatter (Sonnet, semver 1.0.0)
- `src/features/vagas/services/candidaturasService.ts:1145-1214` — listByVaga (current select('*') hazard)
- `src/features/vagas/hooks/useCandidaturas.ts` — candidaturasKeys, PaginationParams
- `vite.config.ts` — Vitest config + Deno exclusions
- `npm view` (this session) — jspdf 4.2.1, jspdf-autotable 5.0.8, @anthropic-ai/sdk 0.102.0, openai 6.42.0

### Secondary (MEDIUM)
- npmjs download stats API (jspdf 14.8M/wk, autotable 3.2M/wk)

### Tertiary (LOW)
- None — all claims grounded in repo or registry.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all infra is shipped + verified; new deps are mainstream + registry-confirmed
- Architecture: HIGH — patterns are verbatim from Phase 9 (notify_cost_anomaly) + Phase 4 (two-client)
- Pitfalls: HIGH — schema-name gap, is_active=false, English-keys, CV-as-PDF, P95/double-eval all found by direct code inspection
- Open decisions (resumo_cv source, double-eval) are the only MEDIUM areas — flagged for discuss-phase

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (stable repo infra; jspdf may minor-bump — re-verify `npm view` at install)
