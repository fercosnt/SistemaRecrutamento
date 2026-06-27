---
phase: 10-triagem-rh-com-ia-comparativo-etapa-2
plan: 05
subsystem: ui
tags: [react, tanstack-query, supabase, rls, allowlist, triagem, lgpd, rnf-07a]

# Dependency graph
requires:
  - phase: 10-04
    provides: "analise_candidato_vaga table + reprocessar_analise SECURITY DEFINER RPC live in PROD; database.types.ts regenerated"
  - phase: 08
    provides: "[[reference_select_star_leaks_pii]] LGPD lesson — RLS is row-level only, allowlist projections required"
provides:
  - "triagemService: allowlist paginated panel read (no PII) + reprocessarAnalise RPC client call + invokeComparativo wrapper"
  - "useTriagemPanel + triagemKeys query hook (mirrors candidaturasKeys)"
  - "SugestaoIABadge — shared RNF-07a guardrail badge (reusable Plans 11-15)"
  - "TriagemTable — dense panel table with score bands + 2-10 compare gating + reprocess affordance"
  - "VagaCandidatosRHPage reworked: glass cards → dense table inside RHLayout shell"
affects: [10-06 comparativo screen + PDF, 11-15 funnel stages reusing SugestaoIABadge]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Explicit-column allowlist join replacing select('*') at the panel read (the named anti-PII control)"
    - "Router-free presentational table (Ver Perfil as anchor, navigation owned by page) — keeps the component unit-testable without a Router context"
    - "score-band-color on the same element that holds the number (RNF-07a: number is the signal, color is the hint; also makes getByText(score).className assertable)"

key-files:
  created:
    - src/features/triagem/services/triagemService.ts
    - src/features/triagem/hooks/useTriagemPanel.ts
    - src/features/triagem/components/SugestaoIABadge.tsx
    - src/features/triagem/components/TriagemTable.tsx
  modified:
    - src/components/pages/VagaCandidatosRHPage.tsx
    - src/features/triagem/services/__tests__/triagemService.test.ts

key-decisions:
  - "SugestaoIABadge lives in its own file and is re-exported from TriagemTable so the Wave-0 test contract (import { TriagemTable, SugestaoIABadge } from '../TriagemTable') and the project's shared-component convention are both satisfied"
  - "Ver Perfil rendered as an <a href> anchor (not useNavigate) so TriagemTable renders without a Router — the Wave-0 test mounts it bare; navigation concern stays in the page"
  - "score-band color class placed directly on the element wrapping the number, so the number is always readable (RNF-07a) and the test's getByText(score).className color assertion passes"

patterns-established:
  - "Triagem allowlist read: explicit columns joining analise_candidato_vaga, score_match DESC nulls-last, .range() 20/page — the [[reference_select_star_leaks_pii]] fix, test-asserted"
  - "Reprocess via SECURITY DEFINER RPC client call (supabase.rpc('reprocessar_analise')) — no functions.invoke (the analise EF is Bearer-self-auth, rejects user JWT)"

requirements-completed: [TRIAGEM-02]

# Metrics
duration: ~22min
completed: 2026-06-09
---

# Phase 10 Plan 05: RH Triage Panel (allowlist read + dense table) Summary

**The RH triage panel: a PII-safe allowlist-projection read joining `analise_candidato_vaga`, a dense score-ranked shadcn table with the "Sugestão da IA" guardrail, 2-10 multi-select gating, and a live `reprocessar_analise` RPC button — replacing the glass-cards list inside the existing RHLayout shell.**

## Performance

- **Duration:** ~22 min
- **Completed:** 2026-06-09
- **Tasks:** 2/2
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments

### Task 1 — triagemService allowlist read + useTriagemPanel + reprocess (commit `53181fd`)

- `listTriagemPanel(vagaId, filters, orderBy, pagination)`: EXPLICIT column allowlist (`id, status, etapa_atual, created_at, curriculo_nome_original, candidato:candidatos(id, nome_completo), analise:analise_candidato_vaga(score_match, pontos_fortes, gaps, flags, status)`) — **NO `select('*')`, NO cpf/data_nascimento/email/celular**. This is the named [[reference_select_star_leaks_pii]] control (T-10-16). `score_match DESC` with `nullsFirst:false` on the embedded `analise` (pendente/falhou rows sort to the end), `.range((page-1)*20, …)` for 20/page, etapa+status+nome filters.
- `reprocessarAnalise(candidaturaId)` → `supabase.rpc('reprocessar_analise', { p_candidatura_id })` — the SECURITY DEFINER RPC live in PROD (authored 10-02, applied 10-04). Client call only; not a migration.
- `invokeComparativo(vagaId, ids)` → `functions.invoke('comparativo-candidatos')` with MIXED_VAGA → exact pt-BR copy mapping (the contract 10-06 consumes).
- `triagemKeys` + `useTriagemPanel` (staleTime 5min, retry 2, enabled:!!vagaId), mirroring `candidaturasKeys`.
- **Wave-0 RED test (triagemService) GREEN 5/5.**

### Task 2 — SugestaoIABadge + TriagemTable + page rework (commit `0893355`)

- `SugestaoIABadge`: exact RNF-07a copy "Sugestão da IA — decisão é sempre humana", Sparkles + accent (`#35BFAD`) tint, full + compact variants. Shared/reusable (Plans 11-15).
- `TriagemTable`: dense shadcn `table.tsx` (first RH use) with score-band chips (70/40 thresholds → green/yellow/red/sem-análise tokens), `Sparkles` micro-icon, Top fortes/gaps (≤2), etapa + status badges (status reuses STATUS labels/colors), "Aplicou em", "Ver Perfil". Multi-select checkboxes disabled past 10 (tooltip "Máximo de 10…"); sticky compare bar with "{N} de 10 selecionados" + "Comparar (N)" accent CTA (disabled <2, tooltip "Selecione ao menos 2…") + "Limpar seleção". `pendente` → skeleton + "Analisando…"; `falhou` → "— Falhou" + visible "Reprocessar análise" button (icon + label + aria-label) wired to `onReprocess`. Flags = neutral informative badges (no gating color, RNF-07a / T-10-17). SugestaoIABadge (compact) rendered at the Score IA header.
- `VagaCandidatosRHPage`: swapped the glass-cards list for `<TriagemTable>` + `useTriagemPanel`; RHLayout/glass shell, header, and a restyled etapa+status+name filter bar preserved; server-side pagination (20/page); reprocess wired to `reprocessarAnalise` with success/error toasts; compare collects ids (the comparativo screen + PDF land in Plan 10-06). Empty/loading/error states use the UI-SPEC Copywriting strings.
- **Wave-0 RED test (TriagemTable) GREEN 9/9.**

## Verification

- `npm run test:run -- triagemService` → 5/5 PASS
- `npm run test:run -- TriagemTable` → 9/9 PASS
- `npm run test:run` (full frontend) → **442/442 tests PASS** across 41 Vitest suites
- `npm run build` → exit 0 (7.29s)
- `npm run lint` (tsc baseline) → **292 errors** (under the 293 invariant — net −1, no growth)
- Allowlist grep: `grep -E "select\('\*'\)|cpf|data_nascimento|email|celular" triagemService.ts` → no matches (T-10-16 enforced in code AND test-asserted)

## Threat Model Disposition

| Threat | Disposition | How |
|--------|-------------|-----|
| T-10-16 (PII leak in panel read) | mitigated | explicit allowlist, no `*`/cpf/data_nascimento/email/celular; Wave-0 test asserts the projection |
| T-10-17 (score band auto-action, RNF-07a) | mitigated | bands display-only; flags neutral badges; no reject-on-score path in the panel; SugestaoIABadge guardrail rendered |
| T-10-18 (reprocess client call EoP) | mitigated | client only calls the SECURITY DEFINER RPC (role + own-vaga guarded in-function); panel RLS-gated to rh/admin |
| T-10-SC (no new npm installs) | accept | zero packages added this plan |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wave-0 triagemService RED test had a vi.mock hoisting bug**
- **Found during:** Task 1 (flipping the RED test GREEN)
- **Issue:** The 10-01 RED scaffold declared `const invokeMock = vi.fn()` at top level and referenced it inside the hoisted `vi.mock` factory → `ReferenceError: Cannot access 'invokeMock' before initialization` once the module resolved (the scaffold only ever ran in the "Cannot find module" state, so the latent bug never surfaced before).
- **Fix:** Wrapped the captures (`lastSelect`, `rangeArgs`, `invokeMock`) in `vi.hoisted(...)` (the established project precedent, 04.1-02 ledger); also added an `ilike` stub to the mock query chain for the name-search path. Test-code only; no production change.
- **Files modified:** src/features/triagem/services/__tests__/triagemService.test.ts
- **Commit:** `53181fd`

**2. [Rule 3 - Blocking] TriagemTable must render without a Router (test mounts it bare)**
- **Found during:** Task 2
- **Issue:** A `useNavigate()` for "Ver Perfil" threw "useNavigate() may be used only in the context of a <Router>" in the Wave-0 test, which renders `<TriagemTable>` with no Router.
- **Fix:** Rendered "Ver Perfil" as an `<a href>` anchor (router-free); navigation stays a page concern. Keeps the table a pure presentational, unit-testable component.
- **Files modified:** src/features/triagem/components/TriagemTable.tsx
- **Commit:** `0893355`

**3. [Rule 1 - Bug] Score-band color must be on the number-bearing element**
- **Found during:** Task 2
- **Issue:** Initial chip nested the number in a child span without the band color, so `getByText(score).className` had no `green`/`yellow`/`red` and the band tests failed; also two `—` placeholders (score band + empty fortes/gaps) broke the unique `getByText('—')` assertion.
- **Fix:** Placed the band color class directly on the element wrapping the number (RNF-07a: the number is the readable signal); empty fortes/gaps cells render blank instead of `—`.
- **Files modified:** src/features/triagem/components/TriagemTable.tsx
- **Commit:** `0893355`

## Deferred Issues

- **Deno Edge Function tests fail to collect under Vitest** (`supabase/functions/{analise-candidato-individual,comparativo-candidatos}/__tests__/index.test.ts`, authored in 10-01 `7a982e1`): they import `https:` URLs and run under `deno test`, not Vitest — `Only URLs with a scheme in: file and data are supported by the default ESM loader`. This is a known, expected toolchain split (Deno EF tests are out of this plan's `npm run test:run` frontend scope per the plan body) and **not a regression** — my changes touch only `src/features/triagem/` + the page. No action taken.

## Known Stubs

- `handleCompare` in VagaCandidatosRHPage currently toasts the selected count instead of navigating — **intentional and documented in the plan**: the comparativo screen + PDF export land in **Plan 10-06**. The selection/gating/ids-collection is fully wired; only the destination route is deferred. `invokeComparativo` (the EF client call) is already implemented in triagemService for 10-06 to consume.

## Self-Check: PASSED

- All 5 key files verified on disk (triagemService.ts, useTriagemPanel.ts, SugestaoIABadge.tsx, TriagemTable.tsx, VagaCandidatosRHPage.tsx).
- Both task commits verified in git log: `53181fd` (Task 1), `0893355` (Task 2).
