# Phase 9: AI Prompt Library & Cost Infra - Research

**Researched:** 2026-06-08
**Domain:** Supabase Edge Functions (Deno) + Anthropic/OpenAI structured-output SDKs + Postgres prompt versioning/auditing/cron + React admin UI
**Confidence:** HIGH (live schema grounded via database.types.ts; SDK APIs verified against official docs + npm registry; one MEDIUM area: pg_net→EF live wiring not testable without secrets)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Area 1 — v1 Scope Boundary**
- Build the **3 read-only admin pages** this phase (`/admin/ai-logs`, `/admin/prompt-versions`, `/admin/ai-costs`). Pages work over the schema even with no data yet (real consumers arrive Phase 10+). UI-SPEC already approved at `09-UI-SPEC.md`.
- **pgmq async queues DEFERRED to Phase 11** — no producer/consumer this phase. Phase 9 ships only the **pg_cron jobs** (`ai_cost_daily` aggregation + retention purge) that `cost-alerter` depends on.
- **GPT-4o-mini circuit-breaker fallback: implement fully now** — breaker (5 fails/60s) + OpenAI fallback is core of `ai-client.ts`.
- **Gold-standard tooling (`scripts/calculate-pearson.ts` + notebook) DEFERRED to Phase 10+** (needs real log data). Phase 9 ships only the SQL query templates in RUNBOOK (already exist).

**Area 2 — Verification (no real consumer)**
- Prove `ai-client` works via **Deno unit tests with Anthropic SDK mocked** + **one live manual smoke** (human-gated). Do NOT wire a real consumer (`cv_summary`) — that is Phase 10.
- Cost-alerter thresholds = PRD verbatim: custo/candidato p95 ≤ R$ 1,00 (3× baseline R$ 0,38); error rate per call_type 24h: >5% warn / >10% rollback. Target average ≤ R$ 0,50/candidato (RNF-10).
- Prompt activation: sync script writes the 7 as `is_active=false` + `is_canary=false`; first activation per call_type via **SQL one-time manual**, not auto-activate.

**Area 3 — forbidden-string CI lint (LGPD-04)**
- Mechanism: **Vitest grep test** reusing the `pitfall7.grep.test.ts` precedent. Runs in existing CI, fails the build. NOT a separate shell grep.
- Forbidden terms: "teste psicológico", "teste psicotécnico", "psicotécnico", "laudo psicológico", "psicólogo" (in product copy) — RNF-12. Claude finalizes exact list from PRD/CLAUDE.md.
- Scan scope: `src/` + `supabase/functions/`. Exclude `docs/` and `.planning/`.

### Claude's Discretion
- Exact final forbidden-terms list (from RNF-12 + PRD).
- Fine implementation tuning within the PRD's 10 locked decisions.
- Layout/composition of the 3 admin pages (read-only) following Beauty Smile design system + glass UI.

### Deferred Ideas (OUT OF SCOPE)
- pgmq async eval queues (`ai_evaluation_queue` + `ai_evaluation_retry`) → Phase 11.
- Gold-standard validation tooling (`scripts/calculate-pearson.ts` + blind-rating notebook) → Phase 10+.
- Real consumer EF wiring (`cv_summary`/`cv_job_match`) → Phase 10.
- v2/v3 PRD items: pgvector FAQ, Anthropic 1h cache, declarative multi-provider routing, real A/B testing, metric-based auto-rollback, fine-tuning, LLM-based PII detection.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **IA-01** | 7 prompts as a versioned library (system + user + Zod output schema) with hybrid git→DB versioning + admin review/gold-standard UI | Templates 01-07 + `00-shared-zod-schemas.ts` already on disk; `prompt_versions` schema in AUDITORIA §2.2; SemVer+SHA-256 hash via `scripts/sync-prompts.ts`; admin UI per UI-SPEC. Standard stack §below. |
| **IA-02** | Every AI call records prompt_version, model_version, generated_at, input_hash, output, cost/tokens — auditable retroactively via SQL | `ai_call_logs` schema (AUDITORIA §2.3) + `audit-logger.ts` helper + PII masking. SQL audit queries already in AUDITORIA §8. |
| **IA-03** | Anthropic prompt caching (ephemeral) on stable parts + Haiku/Sonnet mix, average cost ≤ R$ 0,50/candidate | `cache_control: {type:'ephemeral'}` on system + (vaga+rubric) blocks; Haiku 4.5 for cv_summary, Sonnet 4.6 for the other 6; `cost_usd` calc using verified 2026 pricing. §Code Examples. |
| **IA-04** | EF cost-alerter fires email DPO/RH lead + row in recruiter_alerts via cost_anomaly channel (post-INSERT trigger on ai_cost_daily) | pg_net (`net.http_post`) → EF wiring (NOT persistent LISTEN). `recruiter_alerts` table must be CREATED (does not exist). §Architecture Patterns + §Common Pitfalls. |
| **LGPD-04** | CI fails if a forbidden string ("teste psicológico" etc.) appears in source | Vitest grep test reusing `pitfall7.grep.test.ts` pattern, scoped to `src/` + `supabase/functions/`. §Code Examples. |
</phase_requirements>

---

## Summary

Phase 9 ships the **shared AI infrastructure** for the M2 funnel — versioned prompts, a runtime prompt loader, an Anthropic-first/OpenAI-fallback AI client with circuit breaker, mandatory cost/token logging, and a cost-anomaly alerter — but wires **no real consumer EF** (those come Phase 10+). Nearly all the conceptual design is already frozen in three authoritative artifacts: the PRD (`PRD-ai-prompt-library-m2.md`, 10 locked decisions), the schema spec (`AUDITORIA-LGPD-LOGGING-VERSIONING.md` §2), and a 17 KB reference implementation (`08-edge-function-reference.ts`). The research job here is therefore mostly **reconciliation**: confirming the frozen artifacts against the *current* SDK reality and the *live* Postgres schema, and flagging where they diverge.

Two divergences are load-bearing and the planner MUST address them. **(1) SDK staleness:** the reference EF pins `@anthropic-ai/sdk@0.52.0` and `zod@3.22.0`, but Anthropic's `messages.parse()` + `zodOutputFormat` structured-output API only shipped (public beta) on 2025-11-14 and reached GA after that; it does NOT exist in 0.52.0, and the helper requires `zod ^3.25.0 || ^4.0.0`. The current published versions are `@anthropic-ai/sdk@0.102.0`, `openai@6.42.0`, `zod@4.4.3` (all verified on npm registry 2026-06-08). The reference is a forward-written blueprint, not runnable as-pinned. **(2) Table-name conflict:** the AUDITORIA/PRD/reference schema reference English table names (`candidates`, `jobs`, `recruiters`, `applications`) but the live DB uses pt-BR (`candidatos`, `vagas`, `usuarios_rh`, `candidaturas`) and `recruiter_alerts` does not exist at all. Every FK in the new migrations must be retargeted; `recruiter_alerts` must be created.

**Primary recommendation:** Build the 4 migrations (schema + RPCs/triggers + cron + seed) grounded in the LIVE pt-BR table names, apply them via Supabase MCP `apply_migration` (bypasses the 42601 transaction-pooler error for PL/pgSQL — established Phase 6/7/8 precedent), bump the SDKs to current pinned versions in the new `_shared/` modules, use `messages.parse()` GA structured outputs, wire cost-alerter via `pg_net` (`net.http_post`) from a post-INSERT trigger (Edge Functions cannot hold a persistent `LISTEN`), and gate the single live API smoke as `[BLOCKING] non-autonomous` because `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` are not yet in Supabase secrets.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Prompt versioning storage (`prompt_versions`) | Database / Storage | — | Runtime source of truth; canary % + rollback are SQL state, not code |
| git→DB sync (hash, UPSERT) | CI (GitHub Action) | Database | Build-time hydration; git is authoring source, DB is runtime |
| Prompt loading at runtime | API / Backend (Edge Function) | Database | EF queries `prompt_versions` per call; no filesystem reads |
| AI call + structured output | API / Backend (Edge Function) | External (Anthropic/OpenAI) | Server-side only — API keys never reach client |
| Cost/token/audit logging | API / Backend (Edge Function) | Database | EF writes `ai_call_logs` after each call (service_role) |
| PII masking | API / Backend (Edge Function) | — | Must run before any log write; never client-side |
| Cost aggregation + retention purge | Database (pg_cron) | — | Scheduled SQL; no app code |
| Cost-anomaly detection + alert dispatch | Database trigger (detect) + API/Backend EF (send email) | External (email provider) | Trigger detects via pg_net→EF; EF sends email + writes `recruiter_alerts` |
| Promote-canary / rollback | Database (RPC SECURITY DEFINER) | Frontend (admin UI invokes) | State-changing, privileged; UI only calls the RPC |
| Admin read views | Frontend (React + TanStack Query) | Database (RLS-gated SELECT) | Read-only operational/compliance tooling, role `administrador` |
| Forbidden-string guard (LGPD-04) | CI (Vitest in existing pipeline) | — | Static source scan; no runtime component |

---

## Standard Stack

### Core
| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `@anthropic-ai/sdk` | **0.102.0** (latest; pin a recent stable) | Anthropic Claude calls + `messages.parse()` structured outputs + `zodOutputFormat` | Official SDK; structured outputs GA; cache_control support `[VERIFIED: npm registry + platform.claude.com]` |
| `openai` | **6.42.0** (latest) | GPT-4o-mini fallback via `chat.completions.parse()` + `zodResponseFormat` | Official SDK; structured-output parity `[VERIFIED: npm registry + openai-node/helpers.md]` |
| `zod` | **3.25.x or 4.x** (≥3.25.0 REQUIRED) | Output schema validation; SDK helper peer dep | Helper peer dep is `^3.25.0 \|\| ^4.0.0` — **3.22.0 in current files is too old** `[VERIFIED: npm view @anthropic-ai/sdk peerDependencies]` |
| `@supabase/supabase-js` | **2.x** | DB reads/writes (service_role in EF, anon+JWT in UI) | Project standard; existing EFs import via `https://esm.sh/@supabase/supabase-js@2` `[VERIFIED: codebase]` |

### Supporting (already in repo — reuse, do not add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `recharts` | ^2.15.2 | `/admin/ai-costs` charts | Via vendored `src/components/ui/chart.tsx` `[CITED: 09-UI-SPEC.md]` |
| `@tanstack/react-query` | v5 | Server state in admin pages | Project convention (staleTime 5min, retry 2) |
| shadcn/ui (vendored) | n/a | table/dialog/badge/select/etc. | All primitives the 3 pages need already exist `[CITED: 09-UI-SPEC.md]` |
| `vitest` | (installed) | Unit + grep guard tests | Existing CI runner |

### Deno import style decision (IMPORTANT)
Existing EFs (`cadastrar-candidato`, `submit-candidatura`) import Supabase via `https://esm.sh/@supabase/supabase-js@2`. The reference EF uses `npm:@anthropic-ai/sdk@0.52.0` and `npm:zod@3.22.0`. **Recommendation:** use `npm:` specifiers for the AI SDKs (Supabase Edge Runtime supports `npm:` natively and it gives cleaner peer-dep resolution for the zod helper), keep `esm.sh` for `@supabase/supabase-js@2` to match existing EFs, and pin exact versions:
```ts
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
import OpenAI from "npm:openai@6.42.0";
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";
import { z } from "npm:zod@3.25.76";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```
`[ASSUMED]` exact patch pins — the planner/executor should re-run `npm view <pkg> version` at execution time as versions move fast (Anthropic SDK last modified 2026-06-06).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `messages.parse()` GA structured outputs | tool-use + manual JSON parse (old reference pattern) | parse() is GA, less code, client-side Zod re-validation built in — preferred. Tool-use only needed if targeting a model without SO support (all current models support it). |
| `npm:` SDK specifiers | `esm.sh` for AI SDKs | esm.sh historically had Deno type-resolution issues with `openai/helpers/zod` (GH #984); `npm:` is cleaner |
| pg_net → EF for cost-alerter | persistent `LISTEN` in EF | EFs are stateless/short-lived — cannot hold a connection open. pg_net (or cron) is the only viable trigger. |

**Installation (front-end deps already present; only verify):**
```bash
npm view @anthropic-ai/sdk version   # → 0.102.0 (2026-06-08)
npm view openai version              # → 6.42.0
npm view zod version                 # → 4.4.3 (use ≥3.25.0)
```
Edge Function deps are resolved at deploy via `npm:` specifiers — no `npm install` for EFs.

---

## Package Legitimacy Audit

> slopcheck could not be installed in this sandbox (`pip install slopcheck` failed). Per protocol, packages are tagged below with registry-verification evidence; the planner should re-run slopcheck at execution time OR gate first install behind a `checkpoint:human-verify`. All four are extremely well-established (8-figure weekly downloads, official org repos) so risk is minimal.

| Package | Registry | Latest | Source Repo | slopcheck | Disposition |
|---------|----------|--------|-------------|-----------|-------------|
| `@anthropic-ai/sdk` | npm | 0.102.0 (2026-06-06) | github.com/anthropics/anthropic-sdk-typescript | unavailable | Approved (official Anthropic org) |
| `openai` | npm | 6.42.0 | github.com/openai/openai-node | unavailable | Approved (official OpenAI org) |
| `zod` | npm | 4.4.3 | github.com/colinhacks/zod | unavailable | Approved (ubiquitous) |
| `@supabase/supabase-js` | npm | 2.x | github.com/supabase/supabase-js | unavailable | Approved (already in repo) |

**Packages removed due to slopcheck [SLOP]:** none
**Packages flagged [SUS]:** none
*slopcheck unavailable at research time → planner SHOULD re-verify or add a one-time `checkpoint:human-verify` before the first EF deploy that pulls these specifiers.*

---

## Architecture Patterns

### System Architecture Diagram

```
AUTHORING (git)                          CI (GitHub Action: prompts-sync.yml)
┌─────────────────────────┐             ┌──────────────────────────────────┐
│ templates/01-07.md      │  merge→main │ scripts/sync-prompts.ts (Deno)   │
│  frontmatter+system+user│────────────▶│  • Zod-validate frontmatter      │
│  content_hash: tbd      │ path-filter │  • SHA-256(system+user+fm)       │
└─────────────────────────┘             │  • UPSERT prompt_versions        │
                                         │    is_active=false,is_canary=false│
                                         │  ON CONFLICT(content_hash) NOTHING│
                                         └───────────────┬──────────────────┘
                                                         ▼
ADMIN UI (React, role=administrador)          ┌──────────────────────────────┐
┌────────────────────────────┐  invoke RPC    │  Postgres (Supabase)          │
│ /admin/prompt-versions      │───────────────▶│  prompt_versions  (runtime SoT)│
│  Promote canary / active /  │ SECURITY       │  ai_call_logs                 │
│  Rollback                   │ DEFINER        │  candidate_ai_decisions       │
│ /admin/ai-logs  (RLS SELECT)│◀───────────────│  ai_cost_daily                │
│ /admin/ai-costs (RLS SELECT)│   read         │  data_deletion_log            │
└────────────────────────────┘                │  recruiter_alerts (NEW)       │
                                               └───┬────────────────┬─────────┘
RUNTIME (Edge Function — Phase 10+ consumers)      │ pg_cron        │ trigger AFTER
┌──────────────────────────────────────────┐      │ 01:30 aggregate│ INSERT ai_cost_daily
│ consumer EF → _shared/ai-client.ts        │      │ 02:00 purge    │ if threshold:
│  1 prompt-loader.loadPrompt(call_type)────┼──────┤                │  net.http_post
│  2 schema_version compat check            │      ▼                ▼
│  3 pii-masker.mask(input)                 │   (writes        ┌─────────────────┐
│  4 injection-detector.detect()            │    ai_cost_daily) │ cost-alerter EF │
│  5 circuit-breaker.canRequest()           │                   │  • email DPO/RH │
│  6 anthropic.messages.parse(cache_control)│                   │  • INSERT       │
│     └fail 5/60s → OpenAI gpt-4o-mini parse│                   │    recruiter_   │
│  7 calc cost → audit-logger INSERT        │                   │    alerts       │
└───────────────────┬──────────────────────┘                   └─────────────────┘
                    ▼ Anthropic API (cache_read measured via usage.cache_read_input_tokens)
```

### Recommended Project Structure (delta — most paths from PRD §8.2)
```
supabase/functions/_shared/
├── ai-client.ts          # NEW — anthropic.messages.parse + circuit breaker + OpenAI fallback + cost + log
├── prompt-loader.ts      # NEW — query prompt_versions (active + canary % routing)
├── audit-logger.ts       # NEW — maskPII() then INSERT ai_call_logs (service_role)
├── pii-masker.ts         # NEW — PT-BR regex (from reference §PII)
├── circuit-breaker.ts    # NEW — in-memory per isolate (from reference)
├── injection-detector.ts # NEW — 8 regex patterns (from reference)
├── ai-cost.ts            # NEW — COST_PER_TOKEN table + calculateCost()
├── constants.ts          # EXISTS
└── schemas.ts            # EXISTS (Phase 2/8 cadastro/submit schemas — do not touch)

supabase/functions/cost-alerter/index.ts   # NEW — receives pg_net POST, sends email, writes recruiter_alerts
scripts/sync-prompts.ts                     # NEW — CI git→DB sync (Deno)
.github/workflows/prompts-sync.yml          # NEW — path-filtered on templates/**

supabase/migrations/
├── 2026XXXX_prompt_library_schema.sql   # tables + enums + indexes + recruiter_alerts (pt-BR FKs!)
├── 2026XXXX_prompt_library_rpcs.sql      # immutability trigger + 3 promote/rollback RPCs + cost-anomaly trigger
├── 2026XXXX_prompt_library_cron.sql      # pg_cron: aggregation 01:30, purge 02:00 (NO pgmq this phase)
└── 2026XXXX_prompt_library_seed.sql      # seed v1.0.0 of 7 prompts (is_active=false — manual activation)

src/features/admin/{ai-logs,prompt-versions,ai-costs}/  # 3 read-only pages (UI-SPEC)
src/router/routes.tsx                                    # +3 routes gated role 'administrador'

src/__tests__/guards/forbidden-strings.grep.test.ts     # NEW — LGPD-04 (reuse pitfall7 pattern)
```

### Pattern 1: Anthropic structured output (GA) with ephemeral caching
**What:** Call Claude, get Zod-validated typed output, cache the stable prefix.
**When to use:** Every Anthropic call in `ai-client.ts`.
```ts
// Source: platform.claude.com/docs/en/build-with-claude/structured-outputs + helpers.md (anthropic-sdk-typescript)
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";

const message = await anthropic.messages.parse({
  model: promptVersion.model_id,          // "claude-haiku-4-5" (cv_summary) | "claude-sonnet-4-6" (others)
  max_tokens: promptVersion.max_tokens,
  temperature: Number(promptVersion.temperature),
  system: [
    { type: "text", text: promptVersion.system_template, cache_control: { type: "ephemeral" } },
    { type: "text", text: vagaRubricBlock,               cache_control: { type: "ephemeral" } },
  ],
  messages: [{ role: "user", content: maskedInput }],
  output_config: { format: zodOutputFormat(CvJobMatchSchema, "cv_job_match") },
});
const parsed = message.parsed_output;                    // typed + client-side re-validated by SDK
const cachedTokens = message.usage.cache_read_input_tokens ?? 0;  // cache-hit measurement
```
**Notes (verified):** Structured outputs are **GA — no `anthropic-beta` header required**. Unsupported JSON-Schema keywords (`min`/`max`/`minLength`/`maxLength`) are **auto-transformed by the TS SDK into descriptions and re-validated client-side against your original Zod schema** — so the existing `00-shared-zod-schemas.ts` `.min()/.max()/.int()` constraints work as-is. **Changing `output_config.format` invalidates the prompt cache for that thread** — keep schemas stable per call_type. `[CITED: platform.claude.com/docs/en/build-with-claude/structured-outputs]`

### Pattern 2: OpenAI GPT-4o-mini fallback (structured-output parity)
**What:** When the Anthropic circuit breaker is OPEN, route to GPT-4o-mini with the same Zod schema.
```ts
// Source: github.com/openai/openai-node/blob/master/helpers.md
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";

const completion = await openai.chat.completions.parse({
  model: "gpt-4o-mini",
  messages: [{ role: "system", content: systemText }, { role: "user", content: maskedInput }],
  response_format: zodResponseFormat(CvJobMatchSchema, "cv_job_match"),
});
const parsed = completion.choices[0].message.parsed;     // log provider='openai'
```
`[CITED: openai-node helpers.md]` — gpt-4o-mini supports structured outputs. Log `provider='openai'` + `error_code='anthropic_circuit_open'` per RF-PL-15.

### Pattern 3: cost-alerter wiring — trigger → pg_net → EF (NOT LISTEN)
**What:** Post-INSERT trigger on `ai_cost_daily` evaluates thresholds and, if violated, fires an async HTTP POST to the `cost-alerter` EF via `pg_net`. The EF sends the email and writes `recruiter_alerts`.
**Why:** Edge Functions are stateless and short-lived — they **cannot** hold a persistent Postgres `LISTEN`. `pg_notify` would have no durable subscriber. `pg_net.net.http_post` is async (safe inside triggers) and is the canonical Supabase pattern.
```sql
-- Source: supabase.com/docs/guides/functions/schedule-functions + pg_net docs
-- Store secrets in Vault once (manual, human-gated — service_role key):
-- select vault.create_secret('https://isljnozzlvckrgjjbjwp.supabase.co', 'project_url');
-- select vault.create_secret('<service_role_jwt>', 'edge_invoke_key');

CREATE OR REPLACE FUNCTION notify_cost_anomaly() RETURNS TRIGGER AS $$
DECLARE v_alert TEXT;
BEGIN
  -- evaluate PRD thresholds against NEW row (vaga >R$200/mo, candidate >R$1, error_rate, spam)
  v_alert := detect_cost_anomaly(NEW);            -- helper returns alert_type or NULL
  IF v_alert IS NOT NULL THEN
    PERFORM net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='project_url')
             || '/functions/v1/cost-alerter',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='edge_invoke_key')),
      body := jsonb_build_object('alert_type', v_alert, 'vaga_id', NEW.vaga_id, 'date', NEW.date)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_ai_cost_daily_anomaly
  AFTER INSERT OR UPDATE ON ai_cost_daily
  FOR EACH ROW EXECUTE FUNCTION notify_cost_anomaly();
```
The trigger replaces the PRD's `pg_notify` channel design (which the PRD itself flags as fire-and-forget/lossy in Risk #7). Deploy `cost-alerter` with `--no-verify-jwt` (server-internal/cron, not user-facing) — Area code_context confirms this is the convention. `[CITED: supabase.com/docs/guides/functions/schedule-functions]` `[MEDIUM confidence — not live-testable without secrets]`

### Pattern 4: SECURITY DEFINER promote/rollback RPCs (Phase 6/7/8 precedent)
The PRD §8.1 provides full bodies for `promote_to_canary`, `promote_canary_to_active`, `rollback_to_version`. Follow the established `publish_vaga`/`upsert_pergunta_opcoes_metadata` precedent: `LANGUAGE plpgsql SECURITY DEFINER`, `GRANT EXECUTE ... TO authenticated` then re-check role `'administrador'` inside (RLS uses `'administrador'`, NOT `'admin'` — confirmed Phase 7/8). The PRD RPC bodies say `GRANT ... TO admin` — **correct this to the in-body role check against `'administrador'`** to match the live JWT claim convention.

### Anti-Patterns to Avoid
- **`select('*')` on `ai_call_logs` from the client** — RLS is row-level only and does NOT hide PII columns. The admin tables must read an explicit column allowlist (Phase 8 security-gate precedent: `reference_select_star_leaks_pii`). `user_prompt_template` is already masked but never project raw candidate-identifying columns to the browser.
- **`pg_notify`/`LISTEN` for cost alerts** — no durable subscriber; use pg_net trigger (Pattern 3).
- **Auto-activating prompts in the CI sync** — sync writes `is_active=false` only; activation is manual SQL (locked decision + PRD Risk #1).
- **Wrapping PL/pgSQL migrations in `BEGIN; ... COMMIT;`** — triggers SQLSTATE 42601 in the transaction pooler (CLAUDE.md). Author without the wrapper OR apply via Supabase MCP.
- **Editing `database.types.ts` by hand** — regenerate after migrations (`npm run db:types`); it lives at the **repo ROOT**, not `src/types/`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM JSON output parsing/validation | Custom JSON.parse + manual shape checks | `messages.parse()` + `zodOutputFormat` (Anthropic) / `chat.completions.parse()` + `zodResponseFormat` (OpenAI) | SDK injects the schema, retries on refusal, re-validates client-side against original Zod — GA feature |
| Prompt caching | Custom Redis/isolate cache | Anthropic `cache_control: {type:'ephemeral'}` server-side cache | Provider-native, measured via `usage.cache_read_input_tokens`; PRD §3b explicitly rejects Redis |
| Async HTTP from Postgres | `http` extension (blocking) | `pg_net` (`net.http_post`, async) | Blocking http in a trigger stalls the transaction; pg_net is async by design |
| Scheduled jobs | external scheduler / GH Action cron | `pg_cron` (`cron.schedule`) | In-DB, minute precision, already the Supabase pattern; PRD locks it |
| Forbidden-string scan | shell grep in a separate workflow | Vitest `node:fs` grep test in existing CI | Cross-platform deterministic; precedent `pitfall7.grep.test.ts`; locked decision |
| Cost-per-token math | re-derive pricing | `COST_PER_TOKEN` table from reference §Custo (verified correct vs 2026 pricing) | Reference values match current Anthropic/OpenAI rates exactly |
| SHA-256 content hash | custom hash | Deno `crypto.subtle.digest('SHA-256', ...)` (sync script) or Postgres `encode(digest(...,'sha256'),'hex')` (seed) | Standard library; AUDITORIA §3.3 uses pgcrypto digest |

**Key insight:** This phase is ~80% assembly of artifacts that already exist (templates, Zod schemas, reference EF, PRD-specified SQL). The custom work is the *reconciliation* (SDK bump, pt-BR table names, pg_net wiring) and the *new surfaces* (3 admin pages, sync script, CI workflow, cost-alerter EF). Resist re-designing what the PRD already locked.

---

## Runtime State Inventory

> This is a greenfield-additive phase (new tables/functions/files), not a rename/refactor. Included only because it touches live infra (cron, secrets, EF deploy).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No existing `prompt_versions`/`ai_call_logs`/`ai_cost_daily` rows (tables don't exist — confirmed 0 hits in database.types.ts). Seed inserts v1.0.0 × 7 as `is_active=false`. | Migration creates tables; seed inserts; manual SQL activates first version per call_type |
| Live service config | pg_cron jobs run server-side (no git mirror of the *schedule* state beyond the migration). cost-alerter requires Vault secrets (`project_url`, `edge_invoke_key`) set manually. | Apply cron migration; **human-gated** Vault secret creation |
| OS-registered state | None — Supabase-managed runtime, no Task Scheduler/launchd/pm2. State explicit: **None — verified, Supabase-hosted.** | none |
| Secrets/env vars | `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` **NOT yet in Supabase EF secrets** (CONTEXT.md). Service_role key already available to EFs as `SUPABASE_SERVICE_ROLE_KEY`. | **[BLOCKING] non-autonomous:** Fernando runs `supabase secrets set ANTHROPIC_API_KEY=... OPENAI_API_KEY=...` before the live smoke |
| Build artifacts | `database.types.ts` at ROOT becomes stale after the 4 migrations. | `npm run db:types` after apply (regenerate; do not hand-edit) |

**The canonical question:** after the migrations apply, what live state still needs human action? → (1) Supabase EF secrets for both API keys; (2) Vault secrets for cost-alerter pg_net auth; (3) one-time manual SQL `is_active=true` per call_type; (4) `database.types.ts` regen.

---

## Common Pitfalls

### Pitfall 1: Stale SDK in the reference implementation
**What goes wrong:** Copying `08-edge-function-reference.ts` verbatim pins `@anthropic-ai/sdk@0.52.0` + `zod@3.22.0`. `messages.parse()`/`zodOutputFormat`/`output_config` did not exist in 0.52.0 (structured outputs shipped 2025-11-14) and the helper needs `zod ≥3.25.0`. The EF will fail to import the helper or the method won't exist.
**Why it happens:** Reference was forward-written before the SDK feature shipped.
**How to avoid:** Pin current versions (`@anthropic-ai/sdk@0.102.0`, `zod@3.25.76` or `4.x`, `openai@6.42.0`); also bump the `import { z } from "npm:zod@3.22.0"` in `00-shared-zod-schemas.ts` to ≥3.25.0.
**Warning signs:** `zodOutputFormat is not a function`; `messages.parse is not a function`; peer-dep warnings.

### Pitfall 2: English vs pt-BR table names (schema conflict)
**What goes wrong:** AUDITORIA §2.3 declares FKs to `candidates(id)`, `jobs(id)`, `recruiters(id)`; the explanation/HITL SQL references `applications`. The live DB has **`candidatos`, `vagas`, `usuarios_rh`, `candidaturas`** (verified via `database.types.ts`). Migrations will fail with "relation does not exist".
**Why it happens:** Schema spec was written generically before the live pt-BR schema existed.
**How to avoid:** Retarget every FK: `ai_call_logs.candidato_id → candidatos(id)`, `vaga_id → vagas(id)`; `candidate_ai_decisions` likewise; `ai_cost_daily.vaga_id → vagas(id)`. There is **no `recruiters` table** — the SLA-alert SQL in AUDITORIA §6.3 joins `recruiters` and `jobs.recruiter_id`; map to `usuarios_rh` / `vagas_associadas_recrutadores` (a real table) or descope that specific cron (it's HITL SLA, arguably Phase 10+).
**Warning signs:** migration apply errors `relation "candidates" does not exist`.

### Pitfall 3: `recruiter_alerts` table does not exist
**What goes wrong:** RF-PL-32 + cost-alerter + AUDITORIA §6.3 all `INSERT INTO recruiter_alerts` — but the table is absent (verified: 0 hits in `supabase/` and `src/`).
**How to avoid:** The schema migration MUST `CREATE TABLE recruiter_alerts (id uuid pk, recruiter_id uuid?, alert_type text, message text, channel text, is_read boolean default false, created_at timestamptz default now())` with RLS for `administrador`/`rh`. Confirm column shape against any Phase 10+ consumer expectations.
**Warning signs:** "relation recruiter_alerts does not exist" when the cost-anomaly trigger/EF runs.

### Pitfall 4: SQLSTATE 42601 on PL/pgSQL migrations
**What goes wrong:** `CREATE FUNCTION`/`DO $$...$$` + adjacent `COMMENT`/`GRANT` via `supabase db push --linked` on the transaction pooler → `cannot insert multiple commands into a prepared statement (42601)`.
**How to avoid (established):** Apply via **Supabase MCP `apply_migration`/`execute_sql`** (bypasses 42601; reconcile by writing version rows + `db push` "up to date"), OR author with NO `BEGIN/COMMIT` wrapper (worked clean in Phase 8). The cost-anomaly trigger + 3 RPCs + immutability trigger are PL/pgSQL-heavy → use MCP apply. Migration apply is `[BLOCKING] non-autonomous` (classifier blocks `mcp__supabase__execute_sql` for PROD without an allow-rule + user authorization). `[CITED: CLAUDE.md §Commands + MEMORY.md Phase 6/7/8]`

### Pitfall 5: `unique_active_per_type` EXCLUDE constraint + rollback race
**What goes wrong:** The `EXCLUDE USING btree (call_type WITH =) WHERE (is_active=true AND is_canary=false)` constraint enforces one active per type. A naive rollback that sets the target active *before* deactivating the current one violates the constraint mid-transaction.
**How to avoid:** Order the UPDATEs (deactivate current → activate target) as the PRD RPC bodies already do; keep both in one transaction. The immutability trigger only checks `system_template/user_template/content_hash/semver` (NOT `is_active/deprecated_at`) so rollback UPDATEs of state columns are allowed (PRD Risk #2 confirms).
**Warning signs:** `conflicting key value violates exclusion constraint`.

### Pitfall 6: PII masking gap on bias proxies
**What goes wrong:** Regex masks CPF/email/phone/etc (~85% coverage per AUDITORIA §5.4) but misses unformatted names, abbreviated addresses. Names in CV headers leak into `user_prompt_template` if logged raw.
**How to avoid:** `audit-logger.ts` masks `user_prompt_template` before INSERT (reference does this). The LLM also returns `bias_flags.has_demographic_proxy` (already in every Zod schema) to flag residue. Never log the raw candidate input — only the masked template + placeholders. This is a security-gate item (Phase 8 LGPD leak precedent).
**Warning signs:** raw CPF/name visible in `ai_call_logs.user_prompt_template`.

### Pitfall 7: Cost-alerter duplicate alerts
**What goes wrong:** Trigger fires per INSERT/UPDATE; the aggregation cron upserts daily rows repeatedly → repeated alerts (PRD Risk #7).
**How to avoid:** Dedup by time-bucket: the cost-alerter EF checks `recruiter_alerts` for a same-`(alert_type, vaga_id, date)` row within the bucket before inserting/emailing. Make the alert insert idempotent.

---

## Code Examples

### LGPD-04 forbidden-string Vitest guard (reuse pitfall7 pattern)
```ts
// src/__tests__/guards/forbidden-strings.grep.test.ts
// Source: adapted from src/features/auth/utils/__tests__/pitfall7.grep.test.ts (verified in repo)
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(__dirname, '../../..')          // file at src/__tests__/guards/ → 3 up
const SCAN_ROOTS = ['src', 'supabase/functions']     // EXCLUDE docs/ and .planning/ (locked)
const FORBIDDEN = /teste\s+psicol[oó]gico|teste\s+psicot[eé]cnico|psicot[eé]cnico|laudo\s+psicol[oó]gico|psic[oó]logo/i

function collect(rel: string): string[] {
  const full = join(ROOT, rel); if (!existsSync(full)) return []
  const st = statSync(full); if (st.isFile()) return /\.(ts|tsx)$/.test(full) ? [full] : []
  const out: string[] = []
  for (const e of readdirSync(full)) {
    if (e === '__tests__' || e === 'node_modules') continue   // tests legitimately name the terms
    out.push(...collect(join(rel, e)))
  }
  return out
}
describe('LGPD-04 — forbidden psychological-test strings', () => {
  it('no forbidden term in src/ or supabase/functions/', () => {
    const viol: string[] = []
    for (const f of SCAN_ROOTS.flatMap(collect)) {
      readFileSync(f, 'utf-8').split('\n').forEach((t, i) => {
        if (FORBIDDEN.test(t)) viol.push(`${f}:${i + 1}  ${t.trim()}`)
      })
    }
    expect(viol, `LGPD-04 violations:\n${viol.join('\n')}`).toHaveLength(0)
  })
})
```
Note: the guard test itself lives under `__tests__` and is self-excluded, so its own regex literal does not trip it (same self-exclusion logic as pitfall7). `[VERIFIED: pattern from existing pitfall7.grep.test.ts]`

### content_hash in the Deno sync script
```ts
// scripts/sync-prompts.ts — Source: Deno std crypto (Web Crypto)
async function contentHash(system: string, user: string, fmNoHash: object): Promise<string> {
  const payload = system + user + JSON.stringify(fmNoHash)
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}
// then UPSERT into prompt_versions ... ON CONFLICT (content_hash) DO NOTHING (idempotent, RF-PL-07)
```

### Cost calc (verified pricing 2026-06-08)
```ts
// Source: 08-edge-function-reference.ts §Custo — values confirmed vs platform.claude.com/docs pricing
const COST_PER_TOKEN = {
  "claude-sonnet-4-6": { input: 3e-6,    cached_read: 0.3e-6,   output: 15e-6 },  // $3 / $15 per Mtok, cache_read 10%
  "claude-haiku-4-5":  { input: 1e-6,    cached_read: 0.1e-6,   output: 5e-6  },  // $1 / $5 per Mtok
  "gpt-4o-mini":       { input: 0.15e-6, cached_read: 0.075e-6, output: 0.6e-6 },
};
function calculateCost(model, inputTokens, cachedTokens, outputTokens) {
  const p = COST_PER_TOKEN[model] ?? { input:0, cached_read:0, output:0 };
  return (inputTokens - cachedTokens) * p.input + cachedTokens * p.cached_read + outputTokens * p.output;
}
```
`[VERIFIED: WebSearch (Anthropic pricing 2026) + matches reference table exactly]` Sonnet $3/$15, Haiku $1/$5, cache_read = 10% of input.

---

## State of the Art

| Old Approach (in frozen artifacts) | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Anthropic tool-use + manual JSON parse for structured output | `messages.parse()` + `zodOutputFormat`, GA | SO public beta 2025-11-14, now GA (no beta header) | Less code; SDK re-validates client-side; cache invalidated on format change |
| `@anthropic-ai/sdk@0.52.0` | `@anthropic-ai/sdk@0.102.0` | rolling (last pub 2026-06-06) | Reference EF not runnable as-pinned; bump required |
| `zod@3.22.0` | `zod ≥3.25.0` (helper peer dep) or `4.x` | — | Must bump shared schemas + EF imports |
| `openai@4.104` (PRD) | `openai@6.42.0` | — | `chat.completions.parse()` + `zodResponseFormat` available |
| `pg_notify` channel `cost_anomaly` + EF `LISTEN` (PRD §RF-PL-30) | post-INSERT trigger → `pg_net.net.http_post` → EF | — | EFs can't hold LISTEN; pg_net is the durable async pattern |
| English table names `candidates/jobs/recruiters/applications` | pt-BR `candidatos/vagas/usuarios_rh/candidaturas` | live schema | All migration FKs must retarget |

**Deprecated/outdated:** the `output_format` parameter + `structured-outputs-2025-11-13` beta header still work in a transition window but are no longer required — use `output_config.format` and no beta header.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact SDK patch pins (`0.102.0`/`6.42.0`/`3.25.76`) | Standard Stack | Low — re-verify with `npm view` at execution; versions move weekly |
| A2 | `npm:` specifiers preferred over `esm.sh` for AI SDKs in Deno | Standard Stack | Low — both work; npm: avoids historical esm.sh zod-helper type issues (GH #984) |
| A3 | cost-alerter pg_net→EF wiring works end-to-end | Architecture Pattern 3 | MEDIUM — not live-testable without Vault secrets + EF deploy; standard Supabase pattern but unverified in this project |
| A4 | `recruiter_alerts` column shape (recruiter_id/alert_type/message/channel/is_read/created_at) | Pitfall 3 | MEDIUM — no consumer exists yet to fix the contract; Phase 10+ may need different columns |
| A5 | HITL SLA cron (AUDITORIA §6.3, joins `recruiters`) is descopable / remappable to `usuarios_rh` | Pitfall 2 | Low — that cron is HITL not cost; arguably Phase 10+; CONTEXT only locks cost-aggregation + retention-purge crons |
| A6 | Email provider for cost-alerter (Resend vs Supabase SMTP) | Open Questions Q1 | MEDIUM — PRD Q-10.1 unresolved; affects cost-alerter task |
| A7 | Final forbidden-terms regex list | LGPD-04 example | Low — CONTEXT grants Claude discretion; list derived from RNF-12 + CLAUDE.md |
| A8 | seed migration sets first version `is_active=false` (manual activation), NOT the PRD §11 "first version is_active=true" note | User Constraints Area 2 | Low — CONTEXT explicitly overrides PRD: activation is one-time manual SQL |

---

## Open Questions

1. **Email provider for `cost-alerter`** (PRD Q-10.1 unresolved)
   - What we know: PRD says "Supabase SMTP / Resend"; no provider configured; no existing email-send code in repo.
   - What's unclear: which provider + whether an API key exists.
   - Recommendation: default to Resend (simple HTTP API, one secret `RESEND_API_KEY`); make it a human-gated config item alongside the API keys. Flag in plan as needs-confirmation.

2. **`recruiter_alerts` final schema**
   - What we know: table doesn't exist; multiple specs INSERT into it.
   - What's unclear: exact columns a future RH alerts UI (Phase 10+) will read.
   - Recommendation: create a minimal superset now (id, recruiter_id nullable, alert_type, message, channel, is_read, created_at) + RLS; document as provisional.

3. **HITL SLA cron + `recruiters`/`applications` references** (AUDITORIA §6.3, §7.4 `delete_candidate_data`)
   - What we know: those reference non-existent English tables; `delete_candidate_data` deletes `applications` (live = `candidaturas`).
   - Recommendation: descope HITL-SLA cron to Phase 10+ (it's not in CONTEXT's locked cron list); if `delete_candidate_data` (Art. 18) is in scope, retarget FKs to pt-BR and verify cascade order against live FKs.

4. **canary % routing math location**
   - What we know: AUDITORIA §3.5 puts `Math.random()` routing in the EF; PRD RF-PL-12 puts it in `prompt-loader.ts`.
   - Recommendation: centralize in `prompt-loader.loadPrompt(call_type)` (single source, testable). No conflict — just pick the loader.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (live) | all migrations/EFs | ✓ | ref `isljnozzlvckrgjjbjwp` | — |
| `pg_cron` extension | aggregation + purge crons | needs `CREATE EXTENSION` (verify enabled) | — | Supabase supports it; enable in migration |
| `pg_net` extension | cost-alerter trigger | needs `CREATE EXTENSION` (verify) | — | Supabase supports it; enable in migration |
| `pgcrypto` | seed content_hash (`digest`) | likely enabled (used in Phase 1 RPC `fix_digest_schema`) | — | `CREATE EXTENSION IF NOT EXISTS pgcrypto` |
| Supabase Vault | cost-alerter pg_net secrets | ✓ (Supabase-managed) | — | inline secret (less secure) |
| `ANTHROPIC_API_KEY` (EF secret) | live AI smoke | ✗ NOT SET | — | mocked unit tests autonomous; live smoke human-gated |
| `OPENAI_API_KEY` (EF secret) | fallback live smoke | ✗ NOT SET | — | same |
| Deno (EF runtime) | all EFs + sync script | ✓ (Supabase Edge Runtime) | — | — |
| Supabase MCP (apply_migration) | PROD migration apply (42601 bypass) | ✓ | — | author no-BEGIN/COMMIT + db push |

**Missing dependencies with no fallback:** none block planning. The two API keys block the **live smoke only** (mocked tests run without them).
**Missing dependencies with fallback:** `pg_cron`/`pg_net`/`pgcrypto` — enable via `CREATE EXTENSION IF NOT EXISTS` in the schema migration.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit/grep) + Playwright (e2e) — existing CI (`ci.yml`) |
| Config file | `vitest` via `npm run test:run`; CI job `unit` |
| Quick run command | `npm run test:run -- src/__tests__/guards` (grep guard) |
| Full suite command | `npm run test:run` (419/419 baseline as of Phase 8) |
| Deno EF tests | `deno test supabase/functions/_shared/__tests__/` (Anthropic/OpenAI mocked) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LGPD-04 | forbidden strings absent in src/+functions | unit (grep) | `npm run test:run -- forbidden-strings` | ❌ Wave 0 |
| IA-01 | sync script validates frontmatter + hashes + UPSERTs | deno unit (mock DB) | `deno test scripts/__tests__/sync-prompts.test.ts` | ❌ Wave 0 |
| IA-01 | promote/rollback RPCs enforce invariants | SQL smoke (MCP) | manual via Supabase MCP execute_sql against fixture | ❌ Wave 0 (smoke, not file) |
| IA-02 | ai-client writes full ai_call_logs row | deno unit (mock Anthropic+supabase) | `deno test supabase/functions/_shared/__tests__/ai-client.test.ts` | ❌ Wave 0 |
| IA-02 | PII masker strips PT-BR PII | deno unit | `deno test .../__tests__/pii-masker.test.ts` | ❌ Wave 0 |
| IA-03 | cache_control blocks present + cost calc correct | deno unit (assert request shape + math) | `deno test .../__tests__/ai-client.test.ts` | ❌ Wave 0 |
| IA-03 | live cache hit + cost ≤ target | manual smoke | **[BLOCKING] non-autonomous** (needs API keys) | ❌ human |
| IA-04 | circuit breaker opens at 5/60s → OpenAI fallback | deno unit (mock failures) | `deno test .../__tests__/circuit-breaker.test.ts` | ❌ Wave 0 |
| IA-04 | cost-anomaly trigger fires pg_net on threshold | SQL smoke (MCP) | manual fixture insert + assert net.http_post queued | ❌ Wave 0 |
| IA-01/03 | 3 admin pages render over empty schema | Playwright/component | existing e2e harness + new specs | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:run -- <touched area>` + `deno test <module>`
- **Per wave merge:** `npm run test:run` (full Vitest) + `npm run lint` (tsc zero-growth vs baseline 293)
- **Phase gate:** full Vitest green + build + all deno unit tests + the human-gated live smoke completed before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/guards/forbidden-strings.grep.test.ts` — LGPD-04
- [ ] `supabase/functions/_shared/__tests__/ai-client.test.ts` (+ mocks) — IA-02/03/04
- [ ] `supabase/functions/_shared/__tests__/pii-masker.test.ts` — IA-02
- [ ] `supabase/functions/_shared/__tests__/circuit-breaker.test.ts` — IA-04
- [ ] `scripts/__tests__/sync-prompts.test.ts` — IA-01
- [ ] Deno test runner wiring in CI (currently CI runs Vitest/Playwright only — add a `deno test` job or run locally as a gate)
- [ ] Admin page component/e2e specs over empty schema (empty-state assertions per UI-SPEC)

---

## Security Domain

> `security_enforcement` assumed enabled (not set to false in config). This phase handles candidate PII + automated-decision audit data — high LGPD sensitivity.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | EF two-client pattern (D-23): `supabaseUser` for `auth.getUser()`, `supabaseAdmin` only for privileged writes; never service_role for auth |
| V3 Session Management | partial | Admin pages gated by JWT custom claim role `'administrador'`; route guards |
| V4 Access Control | yes | RLS on all 6 new tables (SELECT only `administrador`/`rh`; writes only via SECURITY DEFINER RPC); cost-alerter EF `--no-verify-jwt` is server-internal, auth'd via Vault Bearer |
| V5 Input Validation | yes | Zod on EF bodies (`.strict()` precedent), sync-script frontmatter Zod, prompt-injection detector (8 regex) |
| V6 Cryptography | yes | SHA-256 via Web Crypto / pgcrypto — never hand-roll; secrets in Supabase secrets + Vault |
| V7 Error/Logging | yes | PII masking before every log write (`audit-logger.ts`); explicit column allowlist on client reads (no `select('*')`) |
| V9 Data Protection | yes | retain_until policy (5y advance / 180d reject); Art.18 deletion RPC; pseudonymized logs |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| PII leak via `select('*')` to admin client | Information Disclosure | Explicit column allowlist; mask `user_prompt_template`; RLS is row-level not column-level (Phase 8 precedent) |
| Prompt injection in candidate input | Tampering | `injection-detector.ts` 8 regex → low score + `flagged_for_human_review`, no API call (RF-PL-18) |
| Service_role key exposure | Elevation of Privilege | Never VITE_-prefixed; never returned to client; EF-only env (CLAUDE.md hard rule) |
| Unauthorized prompt promotion/rollback | Elevation of Privilege | RPCs SECURITY DEFINER + in-body role check `'administrador'`; UI cannot bypass |
| Cost-alerter EF open to public POST | Spoofing | Vault Bearer token check; `--no-verify-jwt` but validate the shared secret in handler |
| Forbidden product copy ("teste psicológico") | Compliance (LGPD/RNF-12) | LGPD-04 Vitest grep guard fails CI |
| Log retention beyond purpose | Compliance (LGPD Art.15) | pg_cron purge by `retain_until`, preserving review-pending logs |

---

## Project Constraints (from CLAUDE.md)

- **Migration apply:** PL/pgSQL `CREATE FUNCTION`/`DO $$` + adjacent `COMMENT`/`GRANT` triggers SQLSTATE 42601 on the pooler. Use Supabase MCP apply OR author with no `BEGIN/COMMIT` wrapper (Phase 8 worked clean unwrapped). `migration repair --status applied` to reconcile.
- **Security:** NEVER `supabaseAdmin`/service_role on client-side. Privileged ops → Edge Functions. RLS on 100% of user-data tables. Duplicate/privileged reads via SECURITY DEFINER RPC, not anon SELECT. DevNavigationMenu gated by `import.meta.env.DEV`.
- **Product language:** "avaliação comportamental/cognitiva" — NEVER "teste psicológico" (LGPD-04 enforces this).
- **System NEVER auto-rejects by score** (RNF-07a) — relevant to how `candidate_ai_decisions` is framed (advisory, human-in-the-loop).
- **Types:** `database.types.ts` generated by Supabase CLI at ROOT — NEVER hand-edit; regenerate (`npm run db:types`).
- **Conventions:** domain pt-BR (tables/enums/messages), code en; PascalCase.tsx named exports; `useCamelCase.ts`; `camelCaseService.ts`; features under `src/features/<dominio>/`; `@/` absolute imports; enums snake_case pt-BR; hierarchical query keys.
- **Commits:** `git -c core.hooksPath=/dev/null` (allowlisted) to bypass pre-commit tsc against legacy baseline (~293).
- **tsc baseline:** zero-growth invariant (CI red only if errors rise above frozen 292/293). New code must not add tsc errors.

---

## Sources

### Primary (HIGH confidence)
- `database.types.ts` (repo ROOT) — live table/column/PK inventory (the authoritative live-schema reflection)
- `docs/prds/m2-funil-rh/PRD-ai-prompt-library-m2.md` — 10 locked decisions, RPC bodies, RF/RNF, risks
- `docs/conhecimento/prompts/AUDITORIA-LGPD-LOGGING-VERSIONING.md` §2 — full schema, §4-8 SQL functions/queries
- `docs/conhecimento/prompts/templates/08-edge-function-reference.ts` — reference impl (note: SDK pins stale)
- `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts` — 7 Zod schemas + SCHEMA_VERSION exports
- `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` — grep-guard precedent (verified)
- `supabase/functions/cadastrar-candidato/index.ts` — two-client EF + import-style precedent
- `.github/workflows/ci.yml` — existing CI (unit/e2e/lighthouse, tsc zero-growth gate)
- platform.claude.com/docs/en/build-with-claude/structured-outputs — SO GA, JSON-schema limits, cache interaction
- github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md — `messages.parse` + `zodOutputFormat` API
- github.com/openai/openai-node/blob/master/helpers.md — `chat.completions.parse` + `zodResponseFormat`
- supabase.com/docs/guides/functions/schedule-functions — pg_cron + pg_net + Vault wiring
- npm registry (`npm view`) 2026-06-08 — `@anthropic-ai/sdk@0.102.0` (zod peer `^3.25.0||^4.0.0`), `openai@6.42.0`, `zod@4.4.3`

### Secondary (MEDIUM confidence)
- WebSearch — Anthropic/OpenAI 2026 pricing (Sonnet $3/$15, Haiku $1/$5, cache_read 10%) cross-checked vs reference COST_PER_TOKEN
- WebSearch — Anthropic SO public beta date 2025-11-14; supported models list
- WebSearch — Supabase pg_net trigger pattern + auth header conventions

### Tertiary (LOW confidence)
- pg_net→cost-alerter end-to-end (A3) — standard pattern but not live-tested in this project

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions + peer deps verified on npm registry; APIs verified against official docs
- Architecture: HIGH for prompt-loader/ai-client/RPCs/cron (grounded in PRD + live schema); MEDIUM for cost-alerter pg_net wiring (not live-testable without secrets)
- Pitfalls: HIGH — SDK staleness and pt-BR table conflict directly verified against files and registry
- Schema grounding: HIGH — confirmed against `database.types.ts` (live reflection)

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 for schema/patterns; ~7 days for exact SDK patch pins (re-run `npm view` at execution — Anthropic SDK ships weekly)
