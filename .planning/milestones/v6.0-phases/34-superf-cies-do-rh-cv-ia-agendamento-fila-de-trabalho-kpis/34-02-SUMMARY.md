---
phase: 34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis
plan: 02
subsystem: ui
tags: [react, tanstack-query, supabase-rls, signed-url, pii-allowlist, rh-hub]

# Dependency graph
requires:
  - phase: 32
    provides: get-curriculo-url EF (authenticate-THEN-authorize signed URL) + rh_le_historico WR-04 hardening
  - phase: 10
    provides: analise_candidato_vaga table + rh_le_analise RLS (RH/admin SELECT, candidate denied)
  - phase: 17
    provides: HubCandidatoRH + HubSection (the RH candidate hub surface + async-state wrapper)
provides:
  - "CvButton — imperative signed-URL CV open (getSignedUrl → window.open; URL never cached/logged)"
  - "AnaliseIABlock — the FULL IA analysis (pontos_fortes/gaps in full, band chip, SugestaoIABadge) — RH-only"
  - "HistoricoBlock — read-only newest-first etapa-transition feed"
  - "analiseCandidatoService + useAnaliseCandidato — allowlist read of analise_candidato_vaga"
  - "historicoCandidaturaService + useHistoricoCandidatura — allowlist read of historico_candidatura"
affects: [phase-35, 34-03-agendamento, 34-04-fila, 34-05-kpi]

# Tech tracking
tech-stack:
  added: []  # zero new npm — all primitives shipped in P32/P33/P10
  patterns:
    - "Hub read = explicit allowlist const + XServiceError + entrevistaKeys-style useQuery (staleTime/gcTime 5min, retry 2) — never select('*')"
    - "Signed-URL open is imperative & ephemeral: fetch on-click → window.open immediately → only a boolean loading/error flag in state (Pitfall 7)"
    - "Blocks self-wrap in HubSection (estado='com_dados') and own their empty/failed copy inside children when it differs from HubSection's generic empty"

key-files:
  created:
    - src/features/hub-candidato/services/analiseCandidatoService.ts
    - src/features/hub-candidato/hooks/useAnaliseCandidato.ts
    - src/features/hub-candidato/components/AnaliseIABlock.tsx
    - src/features/hub-candidato/services/historicoCandidaturaService.ts
    - src/features/hub-candidato/hooks/useHistoricoCandidatura.ts
    - src/features/hub-candidato/components/HistoricoBlock.tsx
    - src/features/hub-candidato/components/CvButton.tsx
    - src/features/hub-candidato/services/__tests__/analiseCandidatoService.test.ts
    - src/features/hub-candidato/services/__tests__/historicoCandidaturaService.test.ts
    - src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx
    - src/features/hub-candidato/components/__tests__/CvButton.test.tsx
  modified:
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx

key-decisions:
  - "IA block is RH-only by construction — imported only under HubCandidatoRH; the candidate has no rh_le_analise SELECT (DB-denied)"
  - "CvButton never pre-checks CV existence — it opens via the EF and surfaces a missing/failed CV as its own inline error (the plan's imperative contract), keeping zero extra reads"
  - "scoreBandClass duplicated locally (module-private in TriagemTable) rather than widening the triagem export surface — this plan does not touch TriagemTable"
  - "CV + Análise da IA placed right after the funnel timeline (high-value cluster); Histórico appended as the last block after Decisão Final"

patterns-established:
  - "PII-safe hub read: ANALISE_HUB_ALLOWLIST / HISTORICO_ALLOWLIST consts, source-probed by service tests, never a star projection"
  - "The full-analysis vs vaga-table-density split: the hub renders pontos_fortes/gaps IN FULL; the top-2 truncation lives only in TriagemTable"

requirements-completed: [VISRH-01, VISRH-02, VISRH-03]

# Metrics
duration: 11min
completed: 2026-07-16
---

# Phase 34 Plan 02: RH Candidate-Visibility Surfaces (CV / IA / Histórico) Summary

**CV open button (P32 signed-URL EF), the FULL IA analysis replacing the empty "Score de Triagem" placeholder, and a read-only Histórico feed — all wired onto HubCandidatoRH against already-shipped secure primitives, every read an explicit allowlist (never `select('*')`), the signed URL never cached or logged.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-07-16T16:53:34Z
- **Completed:** 2026-07-16T~17:05Z
- **Tasks:** 3
- **Files modified:** 13 (11 created, 2 modified)

## Accomplishments

- **VISRH-02 — full IA analysis on the hub.** `analiseCandidatoService.getAnalise` reads the 5-column allowlist (`score_match, pontos_fortes, gaps, flags, status`→`analise_status`) of `analise_candidato_vaga` — never a star projection. `AnaliseIABlock` renders `pontos_fortes`/`gaps` **in full** (a test proves 5→5, no `.slice`), the `score_match` band chip (number+colour in one element, thresholds 70/40), `flags` under "Sinais de atenção", and the `SugestaoIABadge` (RNF-07a). Empty + `falhou` states per UI-SPEC; neutral non-clinical framing (RNF-12a). RH-only — the candidate is DB-denied.
- **VISRH-01 — CV open button.** `CvButton` calls `cvUploadService.getSignedUrl(candidaturaId)` on click and `window.open(url,'_blank')` immediately; only a boolean loading/error flag lives in state — the 60s-TTL URL is never cached and never passed to `console.*` (a console-spy test + grep gate prove it). Inline idle/`Abrindo…`(aria-busy)/error states, `min-h-[44px]`.
- **VISRH-03 — read-only Histórico feed.** `historicoCandidaturaService.listHistorico` reads the 5-column allowlist of `historico_candidatura` ordered `criado_em` DESC; `HistoricoBlock` renders a newest-first read-only list (`origem → destino`, autor/"Sistema", pt-BR date, justificativa) with no edit affordance.
- **Wiring.** `HubCandidatoRH` gained the two hook reads; the empty "Score de Triagem" placeholder was replaced by the Currículo + Análise da IA blocks after the timeline; `HistoricoBlock` appended as the last block. OPER action row, CTA, and timeline untouched.

## Task Commits

1. **Task 1: IA read layer + AnaliseIABlock (VISRH-02)** — `44add19` (feat)
2. **Task 2: Histórico read layer + CvButton (VISRH-03 + VISRH-01)** — `f01fe58` (feat)
3. **Task 3: Wire the three blocks into HubCandidatoRH** — `5f09137` (feat)

**Plan metadata:** (this SUMMARY + STATE/ROADMAP/REQUIREMENTS) — final `docs(34-02)` commit.

## Files Created/Modified

- `services/analiseCandidatoService.ts` — allowlist read of the IA analysis (score_match/pontos_fortes/gaps/flags/status→analise_status), `AnaliseCandidatoServiceError`, maybeSingle → null-on-missing
- `hooks/useAnaliseCandidato.ts` — `analiseHubKeys` + useQuery (5min stale/gc, retry 2, enabled:!!id)
- `components/AnaliseIABlock.tsx` — full analysis render; local colorblind-safe `scoreBandClass`; empty/`falhou` copy
- `services/historicoCandidaturaService.ts` — allowlist read of historico_candidatura, criado_em DESC, limit 100
- `hooks/useHistoricoCandidatura.ts` — `historicoKeys` + useQuery
- `components/HistoricoBlock.tsx` — read-only newest-first feed (ETAPA_M2_LABELS, date-fns ptBR, ator→"Sistema")
- `components/CvButton.tsx` — imperative getSignedUrl → window.open; never caches/logs the URL
- `components/HubCandidatoRH.tsx` — hook reads + placeholder replaced + Histórico appended
- 4 test files (services × 2, components × 2) + `hubNotFound.test.tsx` (mock update)

## Decisions Made

See frontmatter `key-decisions`. Core: IA block RH-only by construction; CvButton stays a pure imperative opener (no extra existence read); `scoreBandClass` duplicated locally instead of widening TriagemTable's export.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-commit `tsc` gate incompatible with the project's 104-error baseline → `--no-verify`**
- **Found during:** Task 1 (first commit attempt)
- **Issue:** The Phase-1 husky `pre-commit` runs `npm run lint` (strict `tsc --noEmit`), which exits non-zero on the **104 pre-existing tsc errors** (all in `cadastro/*` / `vagas/*` — 0 in `hub-candidato/*`). With that baseline, a normal `git commit` is impossible without `--no-verify`; fixing 104 unrelated errors is explicitly out of scope, and the plan itself encodes `tsc ≤ 104` as passing.
- **Fix:** Used `git commit --no-verify` (the mechanism the hook's own header designates as the sanctioned GSD-executor protocol). To preserve the type-check gate's intent, each task re-ran `npm run lint` and proved the total stayed at **104 with 0 errors in the new files**.
- **Files modified:** none (git-mechanics only)
- **Verification:** `grep -c "hub-candidato" lint_out = 0`; total error count held at 104 after every task; `npm run build` green.
- **Committed in:** all three task commits (documented in each commit body)

**2. [Rule 3 - Blocking] Added the two new hooks to `hubNotFound.test.tsx` mocks**
- **Found during:** Task 3 (wiring)
- **Issue:** `HubCandidatoRH` now calls `useAnaliseCandidato` + `useHistoricoCandidatura` (both `useQuery`). The existing `hubNotFound` suite renders `HubCandidatoRH` with no `QueryClientProvider`, so the unmocked hooks would throw "No QueryClient set" and break the pre-existing suite.
- **Fix:** Added `vi.mock` stubs for the two new hooks (mirroring the suite's existing hook-stub pattern).
- **Files modified:** `src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx`
- **Verification:** all 6 hub-candidato test files (35 tests) pass.
- **Committed in:** `5f09137` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking). **Impact:** both mechanical/necessary; no scope creep, no product-behavior change.

## TDD Gate Compliance

Both TDD tasks (1 & 2) followed RED→GREEN, but the RED and GREEN were committed **together per task** rather than as separate `test(...)` then `feat(...)` commits. Reason: the RED state is a module-not-found import failure, which the pre-commit `tsc` gate rejects (broken imports fail type-check), and committing a RED state is impossible without leaving the repo unbuildable mid-task. RED was PROVEN before implementation each time (`vitest` reported "Failed to resolve import … Does the file exist?" at collection — captured in the execution log) and GREEN was proven after (15 tests Task 1, 11 tests Task 2). No test passed unexpectedly during RED.

## Issues Encountered

- The verify grep gates (`select\('\*'\)` / `\.slice\(0`) initially matched my **doc comments** that referenced the forbidden patterns as things to avoid. Reworded the comments (kept the meaning) so the gates pass on intent, not incidental prose.

## Known Stubs

None. The three surfaces render real, RLS-gated data (or explicit empty/error states). `CvButton` deferring CV-existence to the EF error is the plan's imperative contract, not a stub.

## User Setup Required

None — no external service configuration. All primitives (get-curriculo-url EF, analise_candidato_vaga RLS, rh_le_historico) shipped in P32/P10.

## Next Phase Readiness

- 34-03 (agendamento form), 34-04 (Fila tab), 34-05 (KPI dashboard) remain — all autonomous, all planned + plan-checked. 34-01 (DB foundation: `funil_kpis` v2 + `v_fila_trabalho`) is live, so 34-04/05 have their reads ready.
- Live UAT of the three surfaces on `/rh/candidatos/:id` (open CV, view IA analysis, read Histórico) is a candidate for the phase-close verification pass.

## Self-Check: PASSED

- All 7 non-test created files exist on disk (verified).
- All 3 task commits exist in git history (`44add19`, `f01fe58`, `5f09137`).
- `npm run test:run -- src/features/hub-candidato` → 6 files / 35 tests green; `npm run lint` → 104 (≤104); `npm run build` → green.

---
*Phase: 34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis*
*Completed: 2026-07-16*
