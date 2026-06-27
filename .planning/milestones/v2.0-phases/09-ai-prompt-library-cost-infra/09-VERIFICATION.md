---
phase: 09-ai-prompt-library-cost-infra
verified: 2026-06-08T02:30:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Deploy cost-alerter EF and configure Vault secrets"
    expected: "supabase functions deploy cost-alerter --no-verify-jwt succeeds; Vault secrets project_url + edge_invoke_key set; trigger fires net.http_post and a recruiter_alerts row is inserted for a synthetic over-threshold cost event"
    why_human: "Requires CLI access (supabase functions deploy) and Vault SQL not runnable autonomously; RESEND_API_KEY and deploy credentials are not in scope for automated verification"
  - test: "Configure RESEND_API_KEY and verify email delivery to DPO/RH lead"
    expected: "Email arrives at dpo@beautysmile.app (or COST_ALERTER_TO override) when cost anomaly is triggered after deploy"
    why_human: "Email delivery is an external side-effect gated on RESEND_API_KEY secret; no live traffic yet; cost-alerter EF not yet deployed"
  - test: "Configure ANTHROPIC_API_KEY + OPENAI_API_KEY and run a live ai-client smoke"
    expected: "A real callAi() invocation returns a structured output conforming to the Zod schema, writes an ai_call_logs row with prompt_version_id + input_hash + cost_usd, and usage.cache_read_input_tokens > 0 on the second call (cache hit)"
    why_human: "Live API keys not configured in Supabase secrets; real Anthropic/OpenAI calls require them; cost per call cannot be measured without live traffic"
  - test: "Activate one prompt per call_type (one-time manual SQL)"
    expected: "UPDATE prompt_versions SET is_active=true WHERE call_type='cv_summary' AND semver='1.0.0' (and for other 6 call_types) succeeds without violating the unique_active_per_type EXCLUDE constraint"
    why_human: "Activation is a deliberate manual step per orchestrator-decision #2; auto-activation was intentionally excluded from the sync script"
---

# Phase 9: AI Prompt Library & Cost Infra — Verification Report

**Phase Goal:** Existe a infraestrutura de IA compartilhada — 7 prompts versionados com output Zod, logging obrigatório de custo/tokens e alerta de anomalia — consumida por toda Edge Function de IA do funil.
**Verified:** 2026-06-08T02:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Os 7 prompts existem como library versionada (system + user + Zod output schema) com versionamento híbrido git→DB e admin UI de revisão/gold-standard | VERIFIED | 7 templates (01-07) at `docs/conhecimento/prompts/templates/` all carry 7/7 required frontmatter fields (call_type, semver, content_hash, schema_version_required, model_id, fallback_model_id, temperature/max_tokens). `scripts/sync-prompts.ts` (307 LoC) performs idempotent UPSERT ON CONFLICT(content_hash) DO NOTHING with `is_active=false`. `prompts-sync.yml` GitHub Action triggers path-filtered on template changes. 3 admin pages at `/admin/ai-logs`, `/admin/prompt-versions`, `/admin/ai-costs` gated `RoleGuard role="administrador"` and wired to SECURITY DEFINER RPCs (promote_to_canary / promote_canary_to_active / rollback_to_version). `00-shared-zod-schemas.ts` exports 7 typed Zod schemas (CvSummarySchema…WorkSampleSjtSchema) + 7 SCHEMA_VERSION exports. |
| 2 | Toda chamada IA grava prompt_version, model_version, generated_at, input_hash, output, custo_tokens — auditável retroativamente via SQL | VERIFIED (infra level) | `audit-logger.ts` `logAiCall()` INSERTs all required fields: `prompt_version_id` (FK to prompt_versions), `model_id`, `input_hash` (SHA-256 of masked input, Web Crypto), `output` (alias of `raw_response`), `cost_usd`, `created_at` (DB default). PII masked via `maskPII()` BEFORE computing `input_hash` and before any persist (Pitfall-6 ordering confirmed by source-text). `ai_call_logs` table live in PROD (database.types.ts regenerated; 7 SQL smokes PASS). No live AI traffic yet by design (Phase 10+ brings first consumer EF); infra is complete and unit-tested under mocked Anthropic/OpenAI SDKs (5 Deno tests, 31/31 pass). |
| 3 | Anthropic prompt caching (ephemeral) ativo nas partes estáveis do contexto + mix Haiku/Sonnet, custo médio ≤ R$ 0,50/candidato | VERIFIED (design level) | `ai-client.ts` sends two `cache_control: {type: "ephemeral"}` blocks (system_template + vagaRubricBlock) per Anthropic message. Model selection: `cv_summary` → `claude-haiku-4-5`; other 6 call_types → `claude-sonnet-4-6`; fallback → `gpt-4o-mini`. `ai-cost.ts` `calculateCost()` uses verified 2026 pricing; cached tokens billed at `cached_read` rate. Live cost metric cannot be validated without live traffic (Phase 10+); design satisfies all structural requirements for the ≤R$0.50 target. |
| 4 | EF cost-alerter dispara email DPO/RH lead + linha em recruiter_alerts via canal cost_anomaly (trigger pós-INSERT em ai_cost_daily) | VERIFIED (infra level, deploy human-gated) | `notify_cost_anomaly()` AFTER INSERT/UPDATE trigger on `ai_cost_daily` fires `net.http_post` to the cost-alerter EF using Vault Bearer. SMOKE-6 confirmed graceful-skip (trigger does not crash when Vault secrets absent). `cost-alerter/index.ts`: Bearer self-auth (401 on mismatch) + dedup by (threshold_violated, vaga_id, date) + UNCONDITIONAL `recruiter_alerts` INSERT via service_role + best-effort Resend email (graceful degradation on absent RESEND_API_KEY). EF source committed (e3e539b). Two pg_cron jobs live (SMOKE-7 confirmed). Actual deployment is human-gated (Vault secrets + `supabase functions deploy`). |
| 5 | CI falha se string proibida ("teste psicológico" etc.) aparece no source | VERIFIED | `src/__tests__/guards/forbidden-strings.grep.test.ts` (117 LoC) scans `src/` + `supabase/functions/` with `__tests__` self-exclusion. FORBIDDEN regex covers all 5 RNF-12 terms. Sub-test asserts regex matches each term. Runs via `npm run test:run` which is the `vitest` step in `ci.yml` (confirmed: line 52). Test is GREEN 8/8 over the current codebase. |

**Score:** 5/5 truths verified (at infra-delivery level appropriate for a "no consumer yet" phase)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/conhecimento/prompts/templates/01-07-*.md` | 7 prompt templates with standardized frontmatter | VERIFIED | All 7 exist with 7/7 required fields; `model_id` assignment correct (Haiku for cv_summary, Sonnet for others, gpt-4o-mini as fallback) |
| `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts` | Zod schemas for 7 call_types | VERIFIED | 7 schemas exported; zod@3.25.76; 7 SCHEMA_VERSION exports; zodOutputFormat referenced |
| `scripts/sync-prompts.ts` | Deno git→DB sync with SHA-256, Zod validation, idempotent UPSERT | VERIFIED | 307 LoC; exports contentHash (SHA-256 Web Crypto), validateFrontmatter (Zod), buildUpsertRow (is_active=false), syncAll (RF-PL-11 collision guard); 7/7 Deno tests GREEN |
| `.github/workflows/prompts-sync.yml` | Path-filtered CI sync on template merge | VERIFIED | Triggers on push to main, path `docs/conhecimento/prompts/templates/**`; denoland/setup-deno@v2; injects SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server-side, not VITE_-prefixed) |
| `supabase/migrations/20260609000001_prompt_library_schema.sql` | 6 tables + 3 enums + RLS | VERIFIED | 6 tables confirmed in database.types.ts (ai_call_logs, prompt_versions, ai_cost_daily, candidate_ai_decisions, data_deletion_log, recruiter_alerts). 3 enums: llm_call_type (7 values), llm_provider, candidate_status. RLS enabled (SMOKE-1 PASS) |
| `supabase/migrations/20260609000002_prompt_library_rpcs.sql` | Immutability trigger + 3 SECURITY DEFINER RPCs + cost-anomaly pg_net trigger | VERIFIED | SMOKE-4 (immutability) + SMOKE-5 (RPC auth P0001/42501) + SMOKE-6 (cost-anomaly net.http_post graceful-skip) all PASS |
| `supabase/migrations/20260609000003_prompt_library_cron.sql` | 2 pg_cron jobs | VERIFIED | SMOKE-7 PASS: ai-cost-aggregation (01:30) + ai-logs-retention-cleanup (02:00) both active |
| `supabase/migrations/20260609000004_prompt_library_seed.sql` | 7 seed rows is_active=false | VERIFIED | 7 rows inserted; is_active=false; content_hash via encode(extensions.digest(...),'hex') |
| `supabase/functions/_shared/pii-masker.ts` | PT-BR PII masking (7 categories) | VERIFIED | Exists; maskPII() returns {masked, placeholders}; CPF/CNPJ/email/telefone/data-nasc/endereco/RG covered; 4/4 Deno tests GREEN |
| `supabase/functions/_shared/injection-detector.ts` | 8-pattern adversarial detector | VERIFIED | detectPromptInjection() returns {detected, pattern?}; 7/7 Deno tests GREEN |
| `supabase/functions/_shared/circuit-breaker.ts` | In-memory 5/60s breaker | VERIFIED | CircuitBreaker CLOSED/OPEN/HALF-OPEN; THRESHOLD=5/RESET_MS=60000; Deno tests GREEN |
| `supabase/functions/_shared/ai-cost.ts` | COST_PER_TOKEN + calculateCost() | VERIFIED | 3 models (Sonnet/Haiku/gpt-4o-mini); cached tokens billed at cached_read rate; Deno tests GREEN |
| `supabase/functions/_shared/ai-client.ts` | callAi() Anthropic-first/OpenAI-fallback runtime | VERIFIED | 13.9KB; ephemeral cache_control on 2 blocks; circuit-breaker gating; OpenAI fallback (provider='openai', error_code='anthropic_circuit_open'); Deno tests 5/5 GREEN (mocked SDK) |
| `supabase/functions/_shared/prompt-loader.ts` | DB-only active+canary resolution | VERIFIED | loadPrompt() reads prompt_versions (no filesystem); explicit column allowlist (no select('*')); canary routing via Math.random() |
| `supabase/functions/_shared/audit-logger.ts` | mask-then-INSERT ai_call_logs | VERIFIED | maskPII() called BEFORE input_hash computation and before INSERT; all required audit fields included; graceful error logging (code+summary only) |
| `supabase/functions/cost-alerter/index.ts` | Bearer self-auth + recruiter_alerts INSERT + Resend email | VERIFIED | Bearer self-auth (401 on mismatch); dedup by (threshold_violated, vaga_id, date); UNCONDITIONAL recruiter_alerts INSERT (not gated on email); best-effort Resend (graceful skip if RESEND_API_KEY absent) |
| `src/features/admin/ai-logs/` (service + hook + component) | Read-only ai_call_logs admin page | VERIFIED | aiLogsService uses EXPLICIT column allowlists (no select('*')); filter bar; detail modal; RoleGuard role="administrador" |
| `src/features/admin/prompt-versions/` (service + hook + component) | Prompt versions diff + promote/rollback admin page | VERIFIED | promote_to_canary/promote_canary_to_active/rollback_to_version RPC wiring; RPC errors surfaced verbatim; AlertDialog confirms; Accordion by call_type; 2-select diff |
| `src/features/admin/ai-costs/` (service + hook + component) | Cost dashboard (Recharts) | VERIFIED | 3 recharts (line/bar/pie); aiCostsService explicit allowlist on ai_cost_daily; paginated table |
| `src/router/routes.tsx` (3 admin routes) | /admin/ai-logs, /admin/prompt-versions, /admin/ai-costs gated administrador | VERIFIED | All 3 routes present with `<RoleGuard role="administrador">` wrapper |
| `src/__tests__/guards/forbidden-strings.grep.test.ts` | LGPD-04 CI grep guard | VERIFIED | 117 LoC; SCAN_ROOTS ['src', 'supabase/functions']; __tests__ self-exclusion; 5 RNF-12 terms; 8/8 GREEN |
| `database.types.ts` (root) | Regenerated with 6 new AI tables | VERIFIED | Contains all 6 tables: ai_call_logs (prompt_version_id, prompt_hash, input_hash, cost_usd, created_at, model_id…), ai_cost_daily, prompt_versions, candidate_ai_decisions, data_deletion_log, recruiter_alerts |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ai-client.ts` | `ai_call_logs` table | `audit-logger.ts` → `logAiCall()` → `.from("ai_call_logs").insert()` | WIRED | Confirmed: ai-client imports audit-logger; logAiCall inserts the full audit row |
| `notify_cost_anomaly()` trigger | `cost-alerter/index.ts` | `net.http_post` with Vault Bearer | WIRED (deploy pending) | Trigger sources confirmed in migration 02; graceful-skip when Vault absent (SMOKE-6 PASS) |
| `cost-alerter` | `recruiter_alerts` table | service_role `.from('recruiter_alerts').insert()` at line 207 | WIRED | UNCONDITIONAL INSERT not gated on email; confirmed in source |
| `prompts-sync.yml` | `prompt_versions` table | `scripts/sync-prompts.ts` `syncAll()` → Supabase UPSERT | WIRED | GitHub Action → Deno script → UPSERT; path-filtered to template directory |
| `PromptVersionsPage.tsx` | `promote_to_canary`, `promote_canary_to_active`, `rollback_to_version` | `promptVersionsService.ts` → `supabase.rpc(...)` | WIRED | 3 RPC call sites confirmed; arg names corrected to live schema (p_call_type, p_semver) |
| Admin routes | `RoleGuard role="administrador"` | `src/router/routes.tsx` | WIRED | All 3 routes wrapped in RoleGuard with role="administrador" (not rh+administrador) |
| `audit-logger.ts` | `maskPII()` before INSERT | `pii-masker.ts` import; mask called at line 105 before input_hash (line 106) | WIRED (correct order) | Source-order verified: maskPII → computeInputHash → insertRow build → INSERT |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `AiLogsPage.tsx` | `logs` (ai_call_logs rows) | `useAiLogs` → `aiLogsService.listAiLogs()` → Supabase query | Yes — queries live `ai_call_logs` table via explicit allowlist select | VERIFIED (empty-at-ship by design; Phase 10 populates) |
| `PromptVersionsPage.tsx` | `versions` (prompt_versions rows) | `usePromptVersions` → `promptVersionsService.listPromptVersions()` → Supabase query | Yes — queries live `prompt_versions` table (7 seed rows exist) | VERIFIED |
| `AiCostsPage.tsx` | `costs` (ai_cost_daily rows) | `useAiCosts` → `aiCostsService.getAiCosts()` → Supabase query | Yes — queries live `ai_cost_daily` table | VERIFIED (empty until pg_cron aggregation runs with real log data) |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| LGPD-04 guard GREEN (8/8) | `npx vitest run src/__tests__/guards/forbidden-strings.grep.test.ts` | 8 passed, 0 failed | PASS |
| Vitest full suite (427 tests) | `npm run test:run` | 39 files / 427 tests passed | PASS |
| Build clean | `npm run build` | exit 0 (only pre-existing chunk-size advisory) | PASS |
| tsc baseline held | `npm run lint` | 293 errors = frozen baseline (zero growth) | PASS |
| Deno _shared helper tests (31) | `deno test --no-check --allow-read --allow-env supabase/functions/_shared/__tests__/ai-client.test.ts ...` (5 Phase-9 files) | 31 passed, 0 failed | PASS |
| Deno sync-prompts tests (7) | `deno test --no-check --allow-read --allow-env scripts/__tests__/sync-prompts.test.ts` | 7 passed, 0 failed | PASS |
| Live ai-client smoke (real API) | Real Anthropic call via deployed EF | ANTHROPIC_API_KEY not configured; skipped by design | SKIP (human-gated) |
| cost-alerter deploy + live trigger | `supabase functions deploy cost-alerter` + Vault secrets | Not deployed; Vault secrets absent | SKIP (human-gated) |

Note: `strict-schema.test.ts` fails under `deno test` (NotCapable: env access "FORCE_TTY") — pre-existing Phase 8 artifact using Vitest imports incompatible with `deno test`. Excluded from Phase 9 Deno count; 31 + 7 = 38 Phase-9 Deno tests all PASS.

---

### Probe Execution

No `probe-*.sh` scripts declared for this phase. SQL smokes were run autonomously via Supabase MCP `execute_sql` during Plan 09-07 (all 7/7 PASS per SUMMARY). Results are in `09-07-SUMMARY.md`.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| IA-01 | 09-02, 09-03, 09-06, 09-08 | Library de 7 prompts versionados git→DB + admin UI | SATISFIED | 7 templates + sync-prompts.ts + prompts-sync.yml + 3 admin pages; REQUIREMENTS.md marked [x] |
| IA-02 | 09-03, 09-05 | Logging estruturado de toda chamada IA | SATISFIED (infra) | audit-logger.ts + ai_call_logs table live; all required fields present; REQUIREMENTS.md marked [x] |
| IA-03 | 09-04, 09-05 | Prompt caching ephemeral + Haiku/Sonnet mix | SATISFIED (infra) | cache_control:{type:"ephemeral"} on 2 blocks; COST_PER_TOKEN verified; REQUIREMENTS.md marked [x] |
| IA-04 | 09-03, 09-07 | EF cost-alerter anomaly alerting | PARTIAL (code complete, deploy human-gated) | notify_cost_anomaly trigger LIVE (SMOKE-6 PASS); cost-alerter source committed; recruiter_alerts INSERT unconditional; deploy + Vault secrets = human-gated; REQUIREMENTS.md still [ ] pending full lifecycle |
| LGPD-04 | 09-01 | CI fails on forbidden product strings | SATISFIED | forbidden-strings.grep.test.ts GREEN 8/8 in CI; REQUIREMENTS.md still [ ] (status tracking lag, not a gap) |

Note on REQUIREMENTS.md status: IA-04 and LGPD-04 remain `[ ]` in REQUIREMENTS.md. For LGPD-04, the CI guard is live and GREEN — the checkbox likely reflects a tracking lag. For IA-04, the checkbox appropriately stays open pending the human-gated EF deploy + Vault secrets.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ai-client.ts` | 6 | "TODO" appearing as Portuguese word ("que TODO Edge Function consumidor") | Info | False positive — Portuguese idiom "todo" (= "every"), not a code debt marker |
| `scripts/sync-prompts.ts` | 16-17 | "placeholder" in doc comment describing seed sentinel hash behavior | Info | Legitimate documentation of the known follow-up (seed vs sync hash difference, tracked in 09-07-SUMMARY.md) |
| `01-cv-summary.md` et al. | frontmatter | `content_hash: tbd` in git templates | Info | By design — sync-prompts.ts computes the real SHA-256 at merge time; PRD §6.1 RF-PL-02 |

No TBD, FIXME, or XXX debt markers found in any Phase 9 source files. No orphaned return null/return [] stubs. No select('*') in any admin service.

---

### Human Verification Required

#### 1. Deploy cost-alerter EF and configure Vault secrets

**Test:** Run `supabase functions deploy cost-alerter --no-verify-jwt`. Then run Vault SQL: `select vault.create_secret('https://[project_url]','project_url'); select vault.create_secret('<service_role_jwt>','edge_invoke_key');`. Insert a synthetic ai_cost_daily row above the PRD threshold (cost_per_candidato_usd > 0.38) and verify a recruiter_alerts row is inserted.
**Expected:** Deploy succeeds; Vault secrets created; trigger fires net.http_post to deployed EF; recruiter_alerts row appears with threshold_violated, vaga_id, created_at; no crash if RESEND_API_KEY absent.
**Why human:** Requires Supabase CLI credentials, live deployment, and Vault SQL — not runnable autonomously.

#### 2. Configure RESEND_API_KEY and verify email delivery to DPO/RH lead

**Test:** Add `RESEND_API_KEY` to Supabase Edge Function secrets. Trigger a cost anomaly after EF is deployed. Check that an email arrives at `dpo@beautysmile.app` (or `COST_ALERTER_TO` override).
**Expected:** Email received; cost-alerter logs Resend response; alert row in recruiter_alerts exists.
**Why human:** External email delivery requires live secret and deployed EF; no live AI traffic yet.

#### 3. Configure ANTHROPIC_API_KEY + OPENAI_API_KEY and run live ai-client smoke

**Test:** Add `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` to Supabase Edge Function secrets. Invoke a temporary smoke EF that calls `callAi()` with a real prompt. Inspect ai_call_logs for the inserted row.
**Expected:** Structured output conforms to Zod schema; ai_call_logs row has prompt_version_id + input_hash + cost_usd > 0; on second call `cache_read_input_tokens > 0` (ephemeral cache hit).
**Why human:** Requires live API keys not currently in Supabase secrets; real API billing; orchestrator-decision #2.

#### 4. Activate prompt_versions per call_type (one-time manual SQL)

**Test:** Run `UPDATE prompt_versions SET is_active=true WHERE call_type='cv_summary' AND semver='1.0.0';` for each of the 7 call_types.
**Expected:** Each UPDATE succeeds; the unique_active_per_type EXCLUDE constraint is not violated (one active+non-canary row per call_type); `prompt-loader.ts` can then fetch the active prompt via `loadPrompt()`.
**Why human:** Intentionally manual per orchestrator-decision #2 (no auto-activation); requires DB access and human decision on which semver to activate first.

---

### Known Follow-up (Non-blocking)

**content_hash duplication on first sync-prompts merge:** The 09-03 seed wrote 7 placeholder rows with sentinel hashes (`seed:<call_type>:1.0.0`). The first real `sync-prompts.ts` merge will insert 7 new rows with real SHA-256 hashes (ON CONFLICT(content_hash) DO NOTHING means no conflict with sentinel hashes → 14 rows transiently). Resolve when wiring the first real consumer at Phase 10 by removing the seed placeholder rows or superseding them. Tracked in 09-07-SUMMARY.md. This is NOT a gap — it is an expected, documented transition state.

---

### Gaps Summary

No blocking gaps found. All 5 success criteria are verified at the infra-delivery level appropriate for a "no consumer yet" phase:

- Criterion 1 (7 prompts + git→DB + admin UI): Fully verified.
- Criterion 2 (audit logging): Infra complete, tested under mocked SDK. No live traffic yet by design.
- Criterion 3 (ephemeral caching + Haiku/Sonnet + cost target): Design satisfies structural requirements; cost metric unmeasurable without live traffic (Phase 10+).
- Criterion 4 (cost-alerter EF): Code complete, trigger live in PROD, recruiter_alerts INSERT unconditional; only EF deploy + Vault secrets are human-gated.
- Criterion 5 (CI forbidden-string guard): Fully verified, GREEN in CI.

The 4 human verification items are all in the deploy/secrets/live-smoke category — consistent with the scope statement in 09-CONTEXT.md. Status is `human_needed`, not `gaps_found`.

---

_Verified: 2026-06-08T02:30:00Z_
_Verifier: Claude (gsd-verifier)_

---

## Human Validation (2026-06-08) — Fernando

Items ①②③ DONE: ① Vault secrets `project_url` + `edge_invoke_key` created; ② `cost-alerter` deployed `--no-verify-jwt`; ③ `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` set in EF secrets.

Deferred (non-blocking):
- `RESEND_API_KEY` — alert rows write to DB without email; `COST_ALERTER_TO/FROM` on defaults. Set when email delivery is wanted.
- Prompt `is_active=true` activation — deferred until first merge to `main` (sync-prompts hydrates real templates first, per sequencing note). Placeholders remain inactive.
- Live `callAi()` smoke — naturally runs when Phase 10 wires the first consumer EF.

**Phase 9 accepted as complete** — infra live in PROD, AI keys set; remaining items tracked for Phase 10 consumer wiring.
