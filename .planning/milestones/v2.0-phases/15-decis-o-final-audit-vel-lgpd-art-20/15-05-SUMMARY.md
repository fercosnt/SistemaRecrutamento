---
phase: 15-decis-o-final-audit-vel-lgpd-art-20
plan: 05
subsystem: admin/bias-audit
tags: [eeoc-4-5, lgpd, adverse-impact, age-band, csv-export, admin, pure-fn, no-drift]

# Dependency graph
requires:
  - phase: 15-decis-o-final-audit-vel-lgpd-art-20
    plan: 01
    provides: the RED biasMath Wave-0 golden test (EEOC 4/5 + bandFromAge) this plan flips GREEN
  - phase: 15-decis-o-final-audit-vel-lgpd-art-20
    plan: 02
    provides: gerar_bias_snapshot RPC + bias_audit_log (AUTHORED, applied LIVE in 15-06)
  - phase: 09-ai-prompt-library-cost-infra
    provides: AiCostsPage admin pattern (RHLayout + GlassCard + Table + CSV blob idiom)
provides:
  - biasMath pure module (computeAdverseImpact EEOC 4/5 + bandFromAge) — TS mirror of the gerar_bias_snapshot SQL (no-drift)
  - biasAuditService (allowlist read + snapshot RPC invoke + CSV export)
  - useBiasAudit hooks (latest-snapshot query + gerar-snapshot mutation)
  - BiasAuditPage admin view (honest AGE-only banner + 4/5 table + snapshot + CSV)
affects: [15-06 route wiring /admin/bias-audit + db:types regen removes the `as never` casts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TS/SQL no-drift: biasMath.ts mirrors the server-side gerar_bias_snapshot formula 1:1 (cognitivo bandaFromTotal precedent); the Wave-0 golden test pins both to the cited eeoc.gov example"
    - "AiCostsPage admin shell copied verbatim in structure (RHLayout + GlassCard + Table + loading/error/empty); CSV via Blob + URL.createObjectURL blob-download idiom"
    - "AUTHORED-NOT-YET-APPLIED contact points (bias_audit_log table + gerar_bias_snapshot RPC) bridged with `as never` casts until db:types regen in 15-06"

key-files:
  created:
    - src/features/admin/bias-audit/biasMath.ts
    - src/features/admin/bias-audit/services/biasAuditService.ts
    - src/features/admin/bias-audit/hooks/useBiasAudit.ts
    - src/features/admin/bias-audit/components/BiasAuditPage.tsx
  modified: []

key-decisions:
  - "CSV button uses GlassButton (not Button variant='outline') — the `@/components/ui/button` VariantProps widens `variant` to `string` under this tsconfig and errors TS2322; GlassButton is the established phase-15 secondary-action idiom (sibling ConsolidacaoDashboard) and carries no variant typing"
  - "bias_audit_log / gerar_bias_snapshot reached via `as never` casts (the table + RPC are AUTHORED in 15-02, applied LIVE in 15-06) — the casts MUST be removed after `npm run db:types` regenerates the types in 15-06"
  - "biasMath.flag never marks the reference band (razao_4_5 = 1.0 by construction) — guarded explicitly so a single-band or all-equal population produces zero flags"

requirements-completed: [LGPD-03]

# Metrics
duration: 8min
completed: 2026-06-26
---

# Phase 15 Plan 05: Admin Bias-Audit (EEOC 4/5 + AGE-only banner + CSV) Summary

**The `src/features/admin/bias-audit` surface (LGPD-03): a pure deterministic EEOC 4/5 adverse-impact module (selection-rate per age band, reference = highest-rate band, `razao_4_5 < 0.8` flag, small-sample + null-exclusion accounting) that flips the Plan-01 Wave-0 golden test GREEN (18/18), wired to an allowlist-read + snapshot-RPC + CSV-export service/hook, and an admin page copying AiCostsPage verbatim with an always-visible honest AGE-only limitation banner (race/gender NOT collected — LGPD-01). build 0; tsc 291 ≤ 305.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-26T01:56:43Z
- **Tasks:** 2
- **Files created:** 4 (596 lines total) under `src/features/admin/bias-audit`

## Accomplishments

- **`biasMath.ts` (pure EEOC 4/5 — flips the Wave-0 golden test GREEN, 18/18):**
  - `computeAdverseImpact(bands, opts?)` → `{ metodo, limitacao, bands[], faixa_referencia, small_sample_warning, excluded_sem_data, n_total }`. `selection_rate = selected/applicants`; `reference_band` = highest selection rate (`razao_4_5 = 1.0`); `razao_4_5 = rate/reference_rate`; `flag = razao_4_5 < 0.8` (never the reference band); `small_sample_warning` when any band `applicants < 30`; `excluded_sem_data` surfaced (Pitfall 4 — null/invalid birthdate never silently dropped). The cited 0.70 worked example (0.35/0.50) flags; 0.90 does not.
  - `bandFromAge(age)` boundaries: 24→`18-24`, 25→`25-34`, 44→`35-44`, 45→`45-54`, 55→`55+` (open-ended top band).
  - **No DB/network imports** — pure deterministic; the TS mirror of the server-side `gerar_bias_snapshot` SQL (no-drift).
- **`biasAuditService.ts`:** `BIAS_AUDIT_COLUMNS = 'id, snapshot_em, periodo, dados, criado_em'` allowlist (never the star — [[reference_select_star_leaks_pii]]); `BiasAuditServiceError` class; `listLatestSnapshot()` (latest-row allowlist read, copy of `listAiCostDaily`); `gerarSnapshot(periodo)` (`supabase.rpc('gerar_bias_snapshot', { p_periodo })`, mirrors `reprocessarAnalise`, maps 42501→UNAUTHORIZED); `exportCsv(dados, periodo?)` (CSV `Blob` + `URL.createObjectURL` download over `dados.bands[]` — faixa/applicants/selected/selection_rate/razao_4_5/flag, with cell escaping).
- **`useBiasAudit.ts`:** `useLatestBiasSnapshot` (`useQuery`, staleTime 5min, retry 2) + `useGerarBiasSnapshot` (`useMutation` → toast.success "Snapshot registrado em bias_audit_log." + invalidate; toast.error on failure).
- **`BiasAuditPage.tsx`:** copies AiCostsPage verbatim in structure — `RHLayout` + header "Auditoria de viés" + an **always-visible honest AGE-only limitation banner** (verbatim 15-UI-SPEC copy: "Esta auditoria considera apenas faixa etária. Raça e gênero não são coletados…") + a `GlassCard` with the selection-rate `Table` (Faixa etária / Selection rate / Razão 4/5) over `dados.bands[]`. Rows with `razao_4_5 < 0.8` get the destructive tint (`border-red-400/30 bg-red-500/15 text-red-300`) + the 4/5 EEOC tooltip; the reference band renders neutral + a "referência (maior taxa)" micro-label. "Gerar snapshot" (`Button`) + "Exportar CSV" (`GlassButton`) — both `min-h-[44px]`. Loading (Skeleton) / error (retry) / empty ("Nenhum snapshot ainda") states + period label + small-sample + excluded-count honesty lines. No charts library (table suffices V1).

## Task Commits

Each task committed atomically (`git -c core.hooksPath=/dev/null` per project convention):

1. **Task 1: biasMath + biasAuditService + useBiasAudit (math + data layer)** — `95f2942` (feat)
2. **Task 2: BiasAuditPage (admin view — banner + table + snapshot + CSV)** — `baf23bb` (feat)

**Plan metadata:** _final commit_ (docs: SUMMARY + STATE + ROADMAP + REQUIREMENTS)

## Files Created

- `src/features/admin/bias-audit/biasMath.ts` (159 lines) — pure EEOC 4/5 + age-banding fns; the TS mirror of the SQL RPC.
- `src/features/admin/bias-audit/services/biasAuditService.ts` (157 lines) — allowlist read + `gerar_bias_snapshot` RPC invoke + CSV blob export.
- `src/features/admin/bias-audit/hooks/useBiasAudit.ts` (52 lines) — latest-snapshot query + gerar-snapshot mutation (toast).
- `src/features/admin/bias-audit/components/BiasAuditPage.tsx` (228 lines) — admin view (banner + table + snapshot + CSV).

## Decisions Made

- **CSV action uses `GlassButton`, not `Button variant="outline"`:** the `@/components/ui/button` `VariantProps` view under this tsconfig widens a literal `variant="outline"` to `variant: string` and raises `TS2322` (no working precedent in the codebase passes `variant=` to this Button — the only `variant="secondary"` is on a `Badge`). `GlassButton` is the established phase-15 secondary-action idiom (the sibling `ConsolidacaoDashboard` uses it) and carries no variant typing. The primary "Gerar snapshot" stays the default `Button` (matches AiCostsPage's retry button).
- **`as never` casts at the AUTHORED-NOT-YET-APPLIED boundary:** `bias_audit_log` (table) and `gerar_bias_snapshot` (RPC) are authored in 15-02 and applied LIVE in 15-06 [BLOCKING]. Until `npm run db:types` regenerates `database.types.ts` in 15-06, they do not exist in the generated types, so the supabase client contact points use `'bias_audit_log' as never` (the `.from()` arg) and `'gerar_bias_snapshot' as never` + `{ p_periodo } as never` (the `.rpc()` args). **These casts MUST be removed after the db:types regen in 15-06** (they mask absent types — [[feedback_integration_contract_gap]]).
- **The reference band is never flagged:** `flag` is computed as `!isReference && razao_4_5 < 0.8`, so a single-band or all-equal-rate population produces zero flags (the reference band's own ratio is 1.0 by construction).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CSV `Button variant="outline"` → `GlassButton` (TS2322 in own file)**
- **Found during:** Task 2 (BiasAuditPage build/tsc)
- **Issue:** `<Button variant="outline" …>` raised `TS2322` (`variant` widened to `string`) — a tsconfig/VariantProps identity quirk in this repo; no codebase precedent passes `variant=` to this `Button`. The error was in my own file (in scope).
- **Fix:** swapped the CSV button to `GlassButton` (the established phase-15 secondary-action idiom — sibling `ConsolidacaoDashboard`). Re-verified build 0 + all Task-2 acceptance greps (banner, CSV button, min-h-[44px], no recharts) still pass.
- **Files modified:** `src/features/admin/bias-audit/components/BiasAuditPage.tsx`
- **Verification:** `npm run lint` → 0 errors in bias-audit (tsc 291 ≤ 305); `npm run build` exit 0.
- **Committed in:** `baf23bb` (Task 2 commit)

**Total deviations:** 1 auto-fixed (Rule 1 — a typing bug in my own file). No scope creep.

## Deferred Issues

None within this plan's scope.

## Pre-existing / Out-of-scope (NOT mine)

- 2 Deno EF test suites fail at suite collection: `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` (the Wave-0 RED golden test from 15-01 — calibrated module-not-found until the EF lands in 15-02) and `supabase/functions/_shared/__tests__/essay-schemas.test.ts` (from 13-01). Both predate this plan (`44ef5dc`, `3af37d8`), are outside `src/features/admin/bias-audit`, and are untouched by this plan. **All 596 vitest tests pass** (including the bias-audit golden test, 18/18).
- The 3 pre-existing not-mine working-tree paths (`src/components/pages/LoginRHPage.tsx`, `.planning/phases/11-*/11-HUMAN-UAT.md`, `.planning/ui-reviews/`) were left untouched per instruction.

## Known Stubs

None. All four files are wired end-to-end against the AUTHORED data layer: `biasMath` is fully implemented (golden test GREEN), the service reads the real `bias_audit_log` via allowlist and invokes the real `gerar_bias_snapshot` RPC, the hook wraps both, and the page renders live snapshot data with empty/loading/error states. The only pending item is the db:types regen + route wiring in 15-06 (tracked, not a stub) — the empty-snapshot state is the honest default-at-ship presentation (no snapshot exists until an admin generates one over a real population, per 15-VALIDATION HUMAN-UAT).

## Threat Flags

None new. The plan's threat register is honored:
- **T-15-16** (re-identification): the service reads only banded aggregate columns via `BIAS_AUDIT_COLUMNS` (never the star); the page renders only banded aggregates + `small_sample_warning`.
- **T-15-17** (non-admin generate/view): `gerar_bias_snapshot` guards `administrador` (15-02); the route `RoleGuard role="administrador"` is layered in 15-06.
- **T-15-18** (hidden limitation): the AGE-only limitation banner is rendered unconditionally (asserted by the `apenas faixa etária` grep).
- **T-15-19** (TS/SQL drift): `biasMath` mirrors the `gerar_bias_snapshot` formula 1:1; the Wave-0 golden test pins both to the cited eeoc.gov example.
- **T-15-SC** (npm installs): no new packages — the table replaces a charts library.

## Verification

- `npm run test:run -- biasMath` → **GREEN (18/18)** — selection-rate, reference band, the cited 0.70 flag, the 0.90 non-flag, small_sample_warning both ways, excluded-count, metodo/limitacao self-description, and all 10 bandFromAge boundary cases.
- `npm run build` → **exit 0**.
- AGE-only limitation banner present + rendered unconditionally; `<0.8` flag tint + reference-band micro-label + 4/5 tooltip present; "Gerar snapshot" + "Exportar CSV" wired (`min-h-[44px]`); no charts library; 0 forbidden terms (LGPD-04).
- `npm run lint` → tsc 291 (0 errors in bias-audit; ≤ 305 budget).
- Live snapshot over a real population is deferred to HUMAN-UAT per 15-VALIDATION.md (and depends on 15-06 applying the RPC + regenerating db:types).

## Next Plan Readiness

- **15-06 [BLOCKING]** applies `gerar_bias_snapshot` + `bias_audit_log` LIVE in PROD, regenerates `database.types.ts` (`npm run db:types`), then **removes the 2 `as never` casts** in `biasAuditService.ts` (the `.from('bias_audit_log')` and `.rpc('gerar_bias_snapshot', …)` contact points), and wires the route `/admin/bias-audit` → `BiasAuditPage` with `RoleGuard role="administrador"` (copy the `/admin/ai-costs` block at `routes.tsx`).
- No blockers introduced by this plan.

## Self-Check: PASSED

- FOUND: src/features/admin/bias-audit/biasMath.ts
- FOUND: src/features/admin/bias-audit/services/biasAuditService.ts
- FOUND: src/features/admin/bias-audit/hooks/useBiasAudit.ts
- FOUND: src/features/admin/bias-audit/components/BiasAuditPage.tsx
- FOUND commit: 95f2942 (Task 1) · baf23bb (Task 2)

---
*Phase: 15-decis-o-final-audit-vel-lgpd-art-20*
*Completed: 2026-06-26*
