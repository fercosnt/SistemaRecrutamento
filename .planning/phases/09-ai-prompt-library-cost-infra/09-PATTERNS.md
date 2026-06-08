# Phase 9: AI Prompt Library & Cost Infra - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 22 new + 2 modified
**Analogs found:** 19 / 24 (5 no-analog — net-new surfaces)

> Source of truth for new-file shapes. Every "Analog" path is a real file in this repo (read at mapping time). Excerpts include line numbers so the planner can cite "copy lines N-M of <analog>" directly in plan actions. Frozen design artifacts (PRD / AUDITORIA / `08-edge-function-reference.ts`) supply the *content*; the analogs below supply the *project conventions* (import style, error contract, RLS idiom, RPC structure, layout shell, grep-guard shape).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/_shared/ai-client.ts` | service (EF helper) | request-response | `supabase/functions/submit-candidatura/index.ts` + `docs/.../08-edge-function-reference.ts` | role-match (forward-ref impl exists, SDK stale) |
| `supabase/functions/_shared/prompt-loader.ts` | service (EF helper) | CRUD (read) | `submit-candidatura/index.ts` (supabaseAdmin select) | role-match |
| `supabase/functions/_shared/audit-logger.ts` | service (EF helper) | CRUD (write) | `submit-candidatura/index.ts` (supabaseAdmin RPC/insert) | role-match |
| `supabase/functions/_shared/pii-masker.ts` | utility | transform | `08-edge-function-reference.ts` §PII | partial (no in-repo analog; reference only) |
| `supabase/functions/_shared/circuit-breaker.ts` | utility | event-driven | `08-edge-function-reference.ts` §CircuitBreaker (L47-60) | partial (reference only) |
| `supabase/functions/_shared/injection-detector.ts` | utility | transform | `08-edge-function-reference.ts` | partial (reference only) |
| `supabase/functions/_shared/ai-cost.ts` | utility | transform | `08-edge-function-reference.ts` §Custo + RESEARCH §Code Examples | partial (reference only) |
| `supabase/functions/cost-alerter/index.ts` | controller (EF) | event-driven (pg_net POST in) | `supabase/functions/submit-candidatura/index.ts` | role-match (no `--no-verify-jwt` precedent yet) |
| `supabase/functions/_shared/__tests__/ai-client.test.ts` | test | — | `supabase/functions/_shared/__tests__/strict-schema.test.ts` | role-match (Deno test) |
| `supabase/functions/_shared/__tests__/pii-masker.test.ts` | test | — | `_shared/__tests__/strict-schema.test.ts` | role-match |
| `supabase/functions/_shared/__tests__/circuit-breaker.test.ts` | test | — | `_shared/__tests__/strict-schema.test.ts` | role-match |
| `scripts/sync-prompts.ts` | script (Deno CLI) | batch (file→DB UPSERT) | none (`scripts/` dir does not exist) | **no analog** |
| `scripts/__tests__/sync-prompts.test.ts` | test (Deno) | — | `_shared/__tests__/strict-schema.test.ts` | role-match |
| `.github/workflows/prompts-sync.yml` | config (CI) | event-driven (path-filter) | `.github/workflows/ci.yml` | role-match |
| `supabase/migrations/2026XXXX_prompt_library_schema.sql` | migration | CRUD (DDL) | `supabase/migrations/20260607000004_bias_audit_log.sql` (RLS table) | role-match |
| `supabase/migrations/2026XXXX_prompt_library_rpcs.sql` | migration | CRUD (RPC+trigger) | `supabase/migrations/20260607010004_publish_vaga_rpc.sql` | exact (SECURITY DEFINER RPC) |
| `supabase/migrations/2026XXXX_prompt_library_cron.sql` | migration | batch (pg_cron) | none in repo (no pg_cron migration yet) | **no analog** (pattern from Supabase docs) |
| `supabase/migrations/2026XXXX_prompt_library_seed.sql` | migration | CRUD (seed) | `20260607010001_pergunta_opcao_metadata.sql` (seed inserts) | role-match |
| `src/features/admin/ai-logs/` page | component (page) | CRUD (read+filter) | `src/components/pages/DashboardRHPage.tsx` | role-match |
| `src/features/admin/prompt-versions/` page | component (page) | CRUD (read+RPC) | `DashboardRHPage.tsx` + `publish_vaga` RPC call site | role-match |
| `src/features/admin/ai-costs/` page | component (page) | CRUD (read+chart) | `DashboardRHPage.tsx` + `src/components/ui/chart.tsx` | role-match |
| admin hooks (`useAiLogs.ts` etc.) | hook | CRUD (read) | `src/features/vagas/hooks/useVagas.ts` (vagasKeys) | exact (query-key pattern) |
| admin services (`aiLogsService.ts` etc.) | service | CRUD (read) | `src/features/vagas/services/vagasService.ts` | exact (error class + allowlist) |
| `src/__tests__/guards/forbidden-strings.grep.test.ts` | test (CI guard) | — | `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` | **exact** |
| `src/router/routes.tsx` (MODIFY) | route | — | `src/router/routes.tsx` L248-302 (RoleGuard rows) | exact (self) |
| `database.types.ts` (REGEN, not hand-edit) | config | — | — | n/a — `npm run db:types` after apply |

---

## Pattern Assignments

### `supabase/functions/_shared/ai-client.ts` + `cost-alerter/index.ts` (EF, request/event-driven)

**Analog:** `supabase/functions/submit-candidatura/index.ts` (the live EF convention; the `08-` reference supplies the AI-specific body but its SDK pins are stale — see Pitfall 1 in RESEARCH).

**Import style** (`submit-candidatura/index.ts` L25-30) — Supabase via `esm.sh`, shared via `../_shared/*.ts`:
```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { submitCandidaturaSchema, type SubmitCandidaturaInput } from '../_shared/schemas.ts'
```
**Override for AI SDKs (RESEARCH Standard Stack L105-114):** use `npm:` specifiers, current pins — NOT the reference's `@0.52.0`/`zod@3.22.0`:
```ts
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
import OpenAI from "npm:openai@6.42.0";
import { z } from "npm:zod@3.25.76";   // re-verify with `npm view` at execute time
```

**Two-client D-23 pattern** (`submit-candidatura/index.ts` L126-156) — env read + anon-with-Authorization for `auth.getUser()`, service_role ONLY for privileged reads/writes:
```ts
const SUPABASE_URL = Deno.env.get('SUPABASE_URL'); const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
const { data: userRes } = await supabaseUser.auth.getUser()      // identity ONLY
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
```
Note: `audit-logger.ts` writes `ai_call_logs` via `supabaseAdmin` (service_role). `cost-alerter` is server-internal (pg_net Bearer) → deploy `--no-verify-jwt` but validate the shared Vault Bearer in-handler (RESEARCH Security Domain "Cost-alerter EF open to public POST").

**CORS + JSON response contract** (`submit-candidatura/index.ts` L36-65) — copy verbatim for any user-facing EF; cost-alerter is internal so CORS is optional:
```ts
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
function jsonResponse(body, status) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
// error shape: { ok: false, error_code, message, field? }   // success: { ok: true, data: {...} }
```

**PII-safe logging discipline** (`submit-candidatura/index.ts` L269-271) — log code + summary, NEVER the raw payload. This is the precedent `audit-logger.ts` must extend (mask `user_prompt_template` before INSERT — RESEARCH Pitfall 6):
```ts
// Pitfall 7 — log code + summary message; never log full RPC payload (PII / curriculo path)
console.error('[submit-candidatura] RPC failed:', { code, message: msg })
```

**Fire-and-forget downstream call** (`submit-candidatura/index.ts` L303-323) — the pattern cost-alerter's email send + the `pg_net` trigger mirror (non-blocking `.catch`):
```ts
fetch(URL, { method: 'POST', headers: {...}, body: JSON.stringify({...}) })
  .catch((e) => console.warn('[...] webhook failed (non-blocking):', e?.message ?? String(e)))
```

**Postgres error-code mapping** (`submit-candidatura/index.ts` L249-278) — reuse for RPC-call sites (`23505`→DUPLICATE, `23503`→VALIDATION; in Phase 9 map RPC RAISE `P0001`/`42501` for the promote/rollback call sites in the admin UI).

---

### `supabase/migrations/2026XXXX_prompt_library_rpcs.sql` (migration, RPC + trigger)

**Analog:** `supabase/migrations/20260607010004_publish_vaga_rpc.sql` — **exact** structural template for `promote_to_canary`, `promote_canary_to_active`, `rollback_to_version`, and the `notify_cost_anomaly` trigger function.

**Header / no-wrapper note** (`publish_vaga_rpc.sql` L26-33) — copy the inline note; do NOT wrap in `BEGIN; ... COMMIT;` (SQLSTATE 42601 — RESEARCH Pitfall 4):
```sql
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already wraps each
-- migration in its own implicit transaction; an outer BEGIN/COMMIT combined with the `$$ ... $$`
-- PL/pgSQL body + adjacent COMMENT/REVOKE/GRANT breaks the prepared-statement boundary parser ...
```

**SECURITY DEFINER skeleton + in-body role check** (`publish_vaga_rpc.sql` L35-57) — the load-bearing convention. RLS does NOT apply inside DEFINER, so the role check is explicit. **Use `'administrador'` (and `'rh'` where applicable) — NOT `'admin'`** (RESEARCH Pattern 4 corrects the PRD's `GRANT TO admin`):
```sql
CREATE OR REPLACE FUNCTION public.promote_to_canary(p_version_id uuid, p_pct int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_role text;
BEGIN
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;
  -- ... PRD §8.1 body (validate canary_pct 1..50, deactivate-then-activate ordering — Pitfall 5) ...
END;
$$;
```

**RAISE contract** (`publish_vaga_rpc.sql` L66-71) — domain errors use `errcode = 'P0001'`; the admin UI surfaces the message verbatim (UI-SPEC: "canary_pct must be between 1 and 50"). **Escape literal `%` as `%%`** in RAISE format strings (MEMORY: publish_vaga `%%` bug pre-apply):
```sql
RAISE EXCEPTION 'Os pesos de avaliacao precisam somar 100%% (soma atual: %).', v_soma USING errcode = 'P0001';
```

**Grant footer** (`publish_vaga_rpc.sql` L124-128) — for RPCs called from the authenticated admin client (promote/rollback), GRANT to `authenticated` (the in-body check restricts to admin). The PRD's `GRANT ... TO admin` is wrong for this project:
```sql
COMMENT ON FUNCTION public.promote_to_canary(uuid,int) IS '...';
REVOKE ALL ON FUNCTION public.promote_to_canary(uuid,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_to_canary(uuid,int) TO authenticated;
```

**cost-anomaly trigger:** body shape from RESEARCH Pattern 3 (L265-287) — `notify_cost_anomaly()` SECURITY DEFINER → `net.http_post` to the cost-alerter EF using Vault-decrypted secrets; `AFTER INSERT OR UPDATE ON ai_cost_daily`. Dedup per Pitfall 7.

---

### `supabase/migrations/2026XXXX_prompt_library_schema.sql` (migration, DDL + RLS)

**Analog:** `supabase/migrations/20260607000004_bias_audit_log.sql` — the table + admin-only-read RLS idiom for an audit/log table.

**RLS table pattern** (`bias_audit_log.sql` L23-37) — `gen_random_uuid()` PK, `timestamptz DEFAULT now()`, `ENABLE ROW LEVEL SECURITY`, and the **verified live RLS idiom** (note the `(select ...)` wrapper and `'administrador'`):
```sql
CREATE TABLE public.ai_call_logs ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ... created_at timestamptz NOT NULL DEFAULT now() );
ALTER TABLE public.ai_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY administrador_le_ai_call_logs ON public.ai_call_logs
  FOR SELECT USING ( (select auth.jwt() #>> '{app_metadata,role}') = 'administrador' );
-- NO INSERT policy: writes only via EF service_role (bypasses RLS), same as bias_audit_log
```
**Critical retargeting (RESEARCH Pitfall 2):** all FKs use **pt-BR live table names** — `candidato_id → candidatos(id)`, `vaga_id → vagas(id)`. There is NO `candidates`/`jobs`/`recruiters`. **`recruiter_alerts` must be CREATED** (Pitfall 3) with the provisional shape in RESEARCH Open Q2. Enable extensions: `CREATE EXTENSION IF NOT EXISTS pg_cron; pg_net; pgcrypto;`.

---

### `src/__tests__/guards/forbidden-strings.grep.test.ts` (test, CI guard)

**Analog:** `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` — **exact** template. Copy the whole shape; only change ROOT depth, SCAN_ROOTS, and the FORBIDDEN regex.

**Self-exclusion + node:fs collector** (`pitfall7.grep.test.ts` L26-86) — the `__tests__` skip is load-bearing so the guard's own regex literal doesn't trip it:
```ts
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
function collectFiles(pathRel) {
  // ... if (entry === '__tests__') continue   // tests legitimately name the terms
  // ... if (cst.isFile() && /\.(ts|tsx)$/.test(entry)) out.push(child)
}
```
**Phase 9 changes:** `ROOT = resolve(__dirname, '../../..')` (file at `src/__tests__/guards/` is 3 deep); `SCAN_ROOTS = ['src', 'supabase/functions']` (exclude `docs/`, `.planning/` — locked); regex from RESEARCH Code Examples L385:
```ts
const FORBIDDEN = /teste\s+psicol[oó]gico|teste\s+psicot[eé]cnico|psicot[eé]cnico|laudo\s+psicol[oó]gico|psic[oó]logo/i
```
**Iteration scope** (`pitfall7.grep.test.ts` L88-105) — same `violations[]` accumulate + throw-with-list pattern; keep the descriptive failure message so CI prints the offending file:line.

---

### Admin pages — `src/features/admin/{ai-logs,prompt-versions,ai-costs}/` (component, CRUD read)

**Analog:** `src/components/pages/DashboardRHPage.tsx` (layout + in-file useQuery convention) + `src/components/ui/chart.tsx` (recharts wrapper) + UI-SPEC §Page-Level notes.

**Layout shell** (`DashboardRHPage.tsx` L3, L141-153, L381) — wrap in `RHLayout` (= `BackgroundImage darkBlue` + `RHSidebar` + `RHTopBar`, content in `<main className="flex-1 p-4 lg:p-6">` per `RHLayout.tsx` L44). NO net-new layout (UI-SPEC §Scope Note):
```tsx
import { RHLayout } from '../RHLayout';
export function AiLogsPage() {
  return ( <RHLayout> {/* GlassCard filter bar + GlassCard table */} </RHLayout> );
}
```
> Convention note: this project also nests pages under `src/components/pages/`. RESEARCH §Project Structure proposes `src/features/admin/<page>/`; CLAUDE.md prefers `features/<dominio>/`. Either is acceptable — planner should pick one and keep hooks/services/components co-located.

**Server-state hook + hierarchical query keys** (`src/features/vagas/hooks/useVagas.ts` L12-60) — **exact** template for `aiLogsKeys` / `promptVersionsKeys` / `aiCostsKeys`:
```ts
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
export const aiLogsKeys = {
  all: ['ai-logs'] as const,
  lists: () => [...aiLogsKeys.all, 'list'] as const,
  list: (filters?, pagination?) => [...aiLogsKeys.lists(), { filters, pagination }] as const,
} as const
// useQuery({ queryKey: aiLogsKeys.list(filters, pagination), queryFn: () => listAiLogs(...) })
```

**Service with custom error class + explicit column allowlist** (`src/features/vagas/services/vagasService.ts` L13, L28-42) — the anti-`select('*')` precedent (RESEARCH anti-pattern + MEMORY `reference_select_star_leaks_pii`). `ai_call_logs` reads MUST allowlist columns; never project `curriculo_nome_original` / raw candidate PII:
```ts
import { supabase } from '@/lib/supabase/client'
export class AiLogsServiceError extends Error {
  constructor(message: string, public code: 'NETWORK_ERROR'|'DATABASE_ERROR'|'NOT_FOUND'|'UNAUTHORIZED', public details?: unknown) {
    super(message); this.name = 'AiLogsServiceError'
  }
}
// .select('id, created_at, candidato_id, vaga_id, call_type, provider, model_id, prompt_version, success, parsed_score, cost_usd, latency_ms')  // EXPLICIT allowlist — UI-SPEC L147-149
```

**RPC call site (prompt-versions promote/rollback)** — invoke the SECURITY DEFINER RPC from the authenticated client and surface the server RAISE message verbatim in a Sonner toast (UI-SPEC L127). Map `42501`→"acesso restrito", domain `P0001`→message-as-is.

**Route registration** (`src/router/routes.tsx` L248-302) — add 3 rows mirroring the existing RH rows, gated by `administrador` only (NOT `['rh','administrador']` — these are admin-only compliance pages):
```tsx
{ path: '/admin/ai-logs', element: ( <RoleGuard role="administrador"><AiLogsPage /></RoleGuard> ) },
{ path: '/admin/prompt-versions', element: ( <RoleGuard role="administrador"><PromptVersionsPage /></RoleGuard> ) },
{ path: '/admin/ai-costs', element: ( <RoleGuard role="administrador"><AiCostsPage /></RoleGuard> ) },
```

---

### Deno tests — `supabase/functions/_shared/__tests__/*.test.ts` + `scripts/__tests__/sync-prompts.test.ts`

**Analog:** `supabase/functions/_shared/__tests__/strict-schema.test.ts` (5.6 KB, existing Deno test) — the in-repo precedent for Deno test layout under `_shared/__tests__/`. Mock the Anthropic/OpenAI SDK + supabase client (no real API calls this phase — locked decision). Run via `deno test supabase/functions/_shared/__tests__/`.

---

### `.github/workflows/prompts-sync.yml` + ci.yml integration

**Analog:** `.github/workflows/ci.yml` — existing pipeline. New workflow is **path-filtered** on `docs/conhecimento/prompts/templates/**` (RESEARCH §Project Structure). The LGPD-04 grep guard does NOT need a new workflow — it runs inside the existing `unit` job's `npm run test:run` step (ci.yml L52). Keep the tsc-baseline gate intact:
```yaml
# ci.yml L43-52 (existing — the LGPD-04 grep test rides this Vitest step)
- name: Type-check (frozen tsc baseline 292 — CI red only on growth)
  run: COUNT=$(npm run -s lint 2>&1 | grep -c "error TS" || true); [ "$COUNT" -le 292 ]
- run: npm run test:run      # ← forbidden-strings.grep.test.ts runs here
```

---

## Shared Patterns

### Authentication / Authorization (EF + RPC + UI)
**Source:** `submit-candidatura/index.ts` L126-178 (two-client D-23) · `publish_vaga_rpc.sql` L53-57 (in-body role check) · `routes.tsx` L251 (RoleGuard).
**Apply to:** all EFs (ai-client consumers, cost-alerter), all 3 promote/rollback RPCs, all 3 admin pages.
- EF: `supabaseUser` for `auth.getUser()`, `supabaseAdmin` (service_role) for privileged reads/writes — NEVER service_role for auth.
- RPC: SECURITY DEFINER + `SET search_path = ''` + explicit `auth.jwt() #>> '{app_metadata,role}' IN ('administrador')` check (RLS does not apply in DEFINER body).
- UI: `<RoleGuard role="administrador">` + RLS `(select auth.jwt() #>> '{app_metadata,role}') = 'administrador'` on every new table.

### Error Handling
**Source:** `submit-candidatura/index.ts` L56-65, L249-278 (EF error contract + PG code map) · `vagasService.ts` L28-42 (service error class).
**Apply to:** all EFs (`{ ok, error_code, message, field? }`), all admin services (custom Error subclass with `code` union), all RPC call sites (surface RAISE message verbatim per UI-SPEC).

### PII / `select('*')` guard
**Source:** `submit-candidatura/index.ts` L269-271 (log discipline) · `vagasService.ts` (explicit `.select()` columns) · MEMORY `reference_select_star_leaks_pii`.
**Apply to:** `audit-logger.ts` (mask `user_prompt_template` before INSERT), `pii-masker.ts`, all admin `ai_call_logs` reads (explicit column allowlist — RLS is row-level only, does NOT hide PII columns).

### Migration authoring (42601 avoidance)
**Source:** `publish_vaga_rpc.sql` L26-33 + `bias_audit_log.sql` L19-20 (no-BEGIN/COMMIT note) · CLAUDE.md §Migrations · MEMORY Phase 6/7/8.
**Apply to:** all 4 new migrations. Author WITHOUT `BEGIN; ... COMMIT;` wrapper; PL/pgSQL-heavy ones (RPCs + cost-anomaly trigger) apply via **Supabase MCP** then reconcile (`migration repair --status applied` / version rows) — this apply step is `[BLOCKING] non-autonomous`.

### Verified live conventions (do not re-derive)
- Role value: **`'administrador'`** (not `'admin'`). RLS idiom: `(select auth.jwt() #>> '{app_metadata,role}')`.
- pt-BR table names: `candidatos`, `vagas`, `usuarios_rh`, `candidaturas`. No `candidates/jobs/recruiters/applications`.
- `database.types.ts` lives at **repo ROOT** — regenerate via `npm run db:types`, never hand-edit.
- Commits: `git -c core.hooksPath=/dev/null` (bypass pre-commit tsc vs ~293 baseline).
- EF imports: `esm.sh` for `@supabase/supabase-js@2`; `npm:` for AI SDKs at CURRENT pins (not the reference's `0.52.0`).

---

## No Analog Found

Files with no close in-repo match — planner uses RESEARCH.md / frozen artifacts instead:

| File | Role | Data Flow | Reason / Source to use |
|------|------|-----------|------------------------|
| `scripts/sync-prompts.ts` | script (Deno) | batch | `scripts/` dir does not exist. Use RESEARCH §Code Examples L412-419 (Web Crypto SHA-256 + UPSERT ON CONFLICT(content_hash) DO NOTHING) + frontmatter Zod-validate. |
| `supabase/migrations/..._cron.sql` | migration | pg_cron | No pg_cron migration in repo. Use RESEARCH Don't-Hand-Roll (`cron.schedule`) + Supabase docs; aggregation 01:30, purge 02:00 only (NO pgmq this phase). |
| `_shared/pii-masker.ts` | utility | transform | No PII-mask code in repo. Source: `08-edge-function-reference.ts` §PII (PT-BR regex) + RESEARCH Pitfall 6. |
| `_shared/injection-detector.ts` | utility | transform | No analog. Source: `08-edge-function-reference.ts` (8 regex) + RESEARCH Security Domain RF-PL-18. |
| `_shared/ai-cost.ts` | utility | transform | No analog. Source: RESEARCH §Code Examples L425-433 (verified `COST_PER_TOKEN` table). |

> `ai-client.ts` / `circuit-breaker.ts` are listed as "partial" rather than "no analog" because `08-edge-function-reference.ts` is a forward-written reference impl (e.g. CircuitBreaker class at L47-60) — copy its *logic* but bump the SDK pins and split into the `_shared/` module layout.

---

## Metadata

**Analog search scope:** `supabase/functions/**`, `supabase/migrations/**`, `src/features/**`, `src/components/**`, `src/router/`, `.github/workflows/`, `docs/conhecimento/prompts/templates/`.
**Files scanned (read in full or targeted):** `submit-candidatura/index.ts`, `pitfall7.grep.test.ts`, `publish_vaga_rpc.sql`, `bias_audit_log.sql`, `useVagas.ts`, `vagasService.ts` (head), `RHLayout.tsx`, `DashboardRHPage.tsx` (grep), `_shared/constants.ts`, `08-edge-function-reference.ts` (head), `routes.tsx` (targeted), `ci.yml` (grep).
**Key absent surfaces confirmed:** `scripts/` (none), pg_cron migration (none), `recruiter_alerts` table (none), `@tanstack/react-table` (not installed — use vendored `table.tsx`).
**Pattern extraction date:** 2026-06-08
