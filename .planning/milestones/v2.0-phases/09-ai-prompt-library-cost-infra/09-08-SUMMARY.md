---
phase: 09-ai-prompt-library-cost-infra
plan: 08
subsystem: ui
tags: [react, tanstack-query, recharts, supabase, rls, rpc, admin, lgpd]

# Dependency graph
requires:
  - phase: 09 (Plans 01-07)
    provides: ai_call_logs / prompt_versions / ai_cost_daily tables + promote/rollback SECURITY DEFINER RPCs + regenerated database.types.ts
provides:
  - 3 read-only internal admin pages gated role=administrador (ai-logs, prompt-versions, ai-costs)
  - aiLogsService/promptVersionsService/aiCostsService with explicit column allowlists (no select('*'))
  - prompt-versions promote_to_canary / promote_canary_to_active / rollback_to_version RPC wiring surfacing server RAISE verbatim
  - 3 routes /admin/ai-logs, /admin/prompt-versions, /admin/ai-costs gated administrador
affects: [Phase 10 AI consumers will populate these tables; admin compliance/review surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin feature folder (service/hook/component) mirroring features/vagas conventions"
    - "Explicit column allowlist constants on every PII-adjacent service read (anti select('*'))"
    - "RPC error mapper: PG 42501 -> acesso restrito, P0001/other -> server RAISE verbatim in Sonner toast"
    - "recharts via vendored chart.tsx + --chart-1..5 tokens (no ad-hoc hex)"

key-files:
  created:
    - src/features/admin/ai-logs/services/aiLogsService.ts
    - src/features/admin/ai-logs/hooks/useAiLogs.ts
    - src/features/admin/ai-logs/components/AiLogsPage.tsx
    - src/features/admin/prompt-versions/services/promptVersionsService.ts
    - src/features/admin/prompt-versions/hooks/usePromptVersions.ts
    - src/features/admin/prompt-versions/components/PromptVersionsPage.tsx
    - src/features/admin/ai-costs/services/aiCostsService.ts
    - src/features/admin/ai-costs/hooks/useAiCosts.ts
    - src/features/admin/ai-costs/components/AiCostsPage.tsx
  modified:
    - src/router/routes.tsx

key-decisions:
  - "Allowlists corrected to the actual regenerated schema: ai_call_logs uses prompt_hash + prompt_version_id (there is no prompt_version column); ai_cost_daily uses total_cost_usd / total_input_tokens / total_output_tokens (not the plan's assumed cost_usd)."
  - "RPC arg names taken from database.types.ts: all 3 take (p_call_type, p_semver); promote_to_canary also (p_canary_pct?). The plan's interfaces block assumed (p_version_id, p_pct) — corrected to the live signatures."
  - "Buttons use className styling instead of the variant prop: the vendored Button's version-pinned cva import widens variant to string and trips tsc (TS2322). Matches the rest of the codebase which styles via className."
  - "Badge variants mapped: success -> default, canary -> secondary, fail -> destructive (vendored badge has only default/secondary/destructive/outline, no success/warning)."

patterns-established:
  - "Admin compliance pages: RHLayout shell + GlassCard surfaces + UI-SPEC empty state as the default-at-ship state"
  - "RPC-call-site service wrappers re-throw a typed Error preserving the server RAISE message verbatim"

requirements-completed: [IA-01, IA-02, IA-03]

# Metrics
duration: 9min
completed: 2026-06-08
---

# Phase 9 Plan 08: AI Admin Pages (logs / versions / costs) Summary

**Three read-only internal admin pages (ai-logs, prompt-versions, ai-costs) gated role=administrador over the empty-at-ship AI schema, with explicit PII column allowlists, promote/rollback RPC wiring that surfaces server RAISE messages verbatim, and a recharts cost dashboard — tsc held at 293, LGPD-04 guard GREEN, build clean.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-06-08T04:52:58Z
- **Completed:** 2026-06-08T05:01:22Z
- **Tasks:** 3/3
- **Files modified:** 10 (9 created + routes.tsx)

## Accomplishments

### Task 1 — ai-logs (commit 063dcfb)
- `aiLogsService`: `AiLogsServiceError` + `listAiLogs(filters, pagination)` (server pagination 50) + `getAiLogDetail(id)`. EXPLICIT column allowlist constants — `parsed_reasoning`/`raw_response` only in the detail path, never in the list projection.
- `useAiLogs`/`useAiLogDetail`: hierarchical `aiLogsKeys`, staleTime 5min, retry 2.
- `AiLogsPage`: RHLayout + GlassCard filter bar (Candidato, Vaga, Tipo de chamada, Status + Limpar filtros) over a GlassCard table; row click → Dialog with reasoning + raw JSON in scroll-area; Skeleton loading; UI-SPEC empty/error states; success/falha status badge.
- Route `/admin/ai-logs` gated `RoleGuard role="administrador"`.

### Task 2 — prompt-versions (commit 0d233d8)
- `promptVersionsService`: explicit allowlist list + `promoteToCanary`/`promoteCanaryToActive`/`rollbackToVersion` calling `supabase.rpc(...)`. `mapRpcError` maps PG `42501` → "Acesso restrito a administradores" and preserves domain `P0001`/other RAISE messages verbatim.
- `usePromptVersions` + 3 mutations invalidating the list on success.
- `PromptVersionsPage`: versions grouped by call_type (Accordion); semver, content_hash (8-char mono + full-hash tooltip), status badges (ativa accent / canário secondary / canary_pct), deploy/deprecated dates; 2-select side-by-side diff of system_template + user_template; AlertDialog confirms for all 3 state-changing actions (UI-SPEC §Destructive Actions); Sonner toast surfaces RPC RAISE verbatim on failure, success message on ok; empty state.
- Route `/admin/prompt-versions` gated administrador.

### Task 3 — ai-costs (commit 12cf2c4)
- `aiCostsService`: explicit allowlist read of `ai_cost_daily` filtered by month (gte/lt date range) + `currentMonth()`.
- `useAiCosts`: `aiCostsKeys` + useQuery.
- `AiCostsPage`: RHLayout + month Select; 3 recharts in GlassCards via vendored `chart.tsx` using `--chart-1..5` (line = daily cost with p95 ReferenceLine, bar = top 10 vagas, pie = by call_type); paginated `ai_cost_daily` table; Skeleton loading; UI-SPEC empty state with the pg_cron note.
- Route `/admin/ai-costs` gated administrador.
- LGPD-04 forbidden-strings grep guard GREEN over src/ (8/8); build exit 0.

## Verification

- **No select('*')** in any of the 3 admin services — explicit allowlist constants confirmed (grep clean of real `.select('*')` calls).
- **3 routes** gated `RoleGuard role="administrador"` (not `['rh','administrador']`).
- **RPC wiring:** 3 `supabase.rpc(...)` call sites in promptVersionsService; server RAISE surfaced verbatim.
- **tsc baseline:** held at 293 (zero growth) — verified via `npm run lint` before each commit.
- **LGPD-04 guard:** `forbidden-strings.grep.test.ts` GREEN (8/8) over the full src/.
- **Build:** `npm run build` exit 0 (only the pre-existing >500kB chunk-size advisory).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Allowlist columns corrected to the real regenerated schema**
- **Found during:** Task 1 / Task 3
- **Issue:** The plan's interfaces block assumed `prompt_version` (ai_call_logs) and `cost_usd` (ai_cost_daily). The live regenerated database.types.ts has `prompt_hash` + `prompt_version_id` (no `prompt_version`) and `total_cost_usd` / `total_input_tokens` / `total_output_tokens`.
- **Fix:** Allowlist constants written against the actual Row types.
- **Files:** aiLogsService.ts, aiCostsService.ts
- **Commits:** 063dcfb, 12cf2c4

**2. [Rule 3 - Blocking] RPC arg names corrected to live signatures**
- **Found during:** Task 2
- **Issue:** Plan assumed `promote_to_canary(p_version_id, p_pct)`. Live signatures (database.types.ts + migration 20260609000002) are `(p_call_type, p_semver)` for all 3, plus `p_canary_pct?` for promote_to_canary.
- **Fix:** Service wrappers call the RPCs with the correct named args.
- **Files:** promptVersionsService.ts, usePromptVersions.ts
- **Commit:** 0d233d8

**3. [Rule 1 - Bug] Button variant prop trips tsc (TS2322) — use className**
- **Found during:** Task 1
- **Issue:** Passing `variant="ghost"` to the vendored Button widened the literal to `string` (version-pinned cva import), adding 3 new tsc errors. Also 3 implicit-any callback params (Select/Dialog onValueChange/onOpenChange).
- **Fix:** Styled buttons via className (matches the rest of the codebase) and typed the callback params. tsc returned to 293.
- **Files:** AiLogsPage.tsx
- **Commit:** 063dcfb

## Known Stubs

- The "Comparar versões" header button on PromptVersionsPage is a no-op (`onClick={() => undefined}`) because selecting exactly 2 rows already renders the diff inline below; the button is present per UI-SPEC copy with its disabled tooltip ("Selecione duas versões para comparar"). Intentional — the diff is driven by checkbox selection, not the button. No data stub; all 3 pages render the documented empty states over the genuinely-empty-at-ship schema (consumers arrive Phase 10+).

## Threat Flags

None — no new security surface beyond the plan's threat_model (T-09-26..29 all addressed: allowlist, RoleGuard, DEFINER-backed RPC, LGPD-04 guard).

## Self-Check: PASSED

- FOUND: src/features/admin/ai-logs/components/AiLogsPage.tsx
- FOUND: src/features/admin/prompt-versions/components/PromptVersionsPage.tsx
- FOUND: src/features/admin/ai-costs/components/AiCostsPage.tsx
- FOUND commits: 063dcfb, 0d233d8, 12cf2c4
