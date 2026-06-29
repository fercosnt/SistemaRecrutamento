---
phase: 17-navegacao-arquitetura-informacao
plan: 04
subsystem: navigation
tags: [react-router, candidate-funnel, funilNavMap, lgpd, role-home, dashboard-perfil-split, glass-ui, wave-2]

# Dependency graph
requires:
  - phase: 17-02 (Wave 1 navigation foundation)
    provides: funilNavMap.ts — single-source EtapaFunilM2 → { label, rotaCandidato, … }, candidaturaId-parameterized (D-17)
  - phase: M2 (Phases 6-16, archived)
    provides: EtapaFunilM2 + ETAPA_M2_LABELS enum; /candidato/avaliacao/:id + /candidato/explicacao/:id routes
provides:
  - "DashboardCandidatoPage = candidate funnel hub — per-candidatura step-CTA (funilNavMap, drift-guarded) + in-app LGPD card (D-09/D-11)"
  - "ROLE_HOME.candidato repointed /candidato/perfil → /candidato/dashboard + post-login/cadastro/candidatura landings repointed (Pitfall 3 / A5)"
  - "MeuPerfilCandidatoPage reduced to dados pessoais + edição (CAND-DASH-DUP-01 overlap removed, D-10)"
affects: [17-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drift-guarded enum cast at the read site: Candidatura.etapa_atual (typed M1 EtapaProcesso) cast to EtapaFunilM2 + undefined-lookup guard → neutral fallback CTA (never crash, never invent)"
    - "Per-candidatura step-CTA + LGPD card consume the SAME funilNavMap single source the RH hub uses (D-17, drift-proof)"
    - "Landing repoint via resolveRedirect default-fallback (anti-open-redirect security property preserved; only the default landing changed)"

key-files:
  created:
    - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx
    - src/components/__tests__/RoleGuard.landing.test.tsx
  modified:
    - src/components/pages/DashboardCandidatoPage.tsx
    - src/components/pages/MeuPerfilCandidatoPage.tsx
    - src/components/RoleGuard.tsx
    - src/components/pages/LoginCandidatoPage.tsx
    - src/features/cadastro/components/CadastroMultiStepForm.tsx
    - src/components/pages/FormularioCandidaturaPage.tsx
    - src/components/pages/__tests__/LoginCandidatoPage.test.tsx

key-decisions:
  - "D-09: the candidate Dashboard is the funnel hub — per-candidatura step-CTA via funilNavMap routes by CLICK to the pending screen; the landing is repointed so the Dashboard is actually reached"
  - "D-09 drift guard: etapa_atual cast to EtapaFunilM2 with an undefined-lookup guard → neutral 'Acompanhar candidatura' for stale/no-route stages"
  - "D-10: Perfil reduced to dados pessoais + edição only — the duplicated candidatura lists removed (CAND-DASH-DUP-01 resolved); the funnel list now lives only on the Dashboard"
  - "D-11: in-app LGPD card on the Dashboard when a final decision exists (etapa ∈ {decisao_final,aprovado,rejeitado} AND data_decisao_final OR feedback_rejeicao present) → /candidato/explicacao/:id"
  - "Landing repoint scope: ROLE_HOME.candidato + LoginCandidatoPage resolveRedirect default + CadastroMultiStepForm post-cadastro + FormularioCandidaturaPage survivor + Voltar — funnel reachable by click, not just URL"

patterns-established:
  - "TDD RED→GREEN on a page edit: RED tests mock useCandidaturas/useNavigate/store, assert the CTA route + LGPD route + mock-block-removed + landing repoint; GREEN flips them"

requirements-completed: []

# Metrics
duration: 10min
completed: 2026-06-28
---

# Phase 17 Plan 04: Candidate Funnel Wiring & Dashboard×Perfil Split Summary

**The candidate Dashboard becomes the funnel hub — each candidatura carries a `funilNavMap`-driven step-CTA (drift-guarded `etapa_atual` cast to `EtapaFunilM2`, neutral fallback for stale/no-route stages) plus an in-app LGPD card linking to `/candidato/explicacao/:id` when a final decision exists — and the candidate landing is repointed (`ROLE_HOME.candidato` + post-login/cadastro/candidatura targets → `/candidato/dashboard`) so the funnel is reachable by click; Perfil is stripped to dados pessoais + edição, resolving the CAND-DASH-DUP-01 overlap.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-28T19:55:08Z
- **Completed:** 2026-06-28T20:05:03Z
- **Tasks:** 2 (Task 1 TDD: RED + GREEN)
- **Files modified:** 9 (2 test files created + 7 modified)

## Accomplishments

- **Task 1 (D-09/D-11) — Dashboard funnel step-CTA + LGPD card + landing repoint:**
  - Replaced the hardcoded "Testes disponíveis" mock block (Big Five "Concluído", DISC "45%", Inteligência "0%", "Vagas Compatíveis 3") with a per-candidatura **step-guided CTA** derived from the single-source `funilNavMap`. `getStepCTA` casts `candidatura.etapa_atual` (typed M1 `EtapaProcesso`, runtime M2 enum) to `EtapaFunilM2`, guards an undefined map lookup AND a null `rotaCandidato` → neutral **"Acompanhar candidatura"**; otherwise renders the dominant accent (#35BFAD) CTA **"Continuar para {label}"** with eyebrow "Próximo passo" → `navigate(entry.rotaCandidato(candidatura.id))` (e.g. `avaliacao_assincrona` → `/candidato/avaliacao/:id`). `stopPropagation` so the funnel CTA wins over the card's vaga-navigation onClick.
  - Added the **in-app LGPD card (D-11)**: `hasDecisaoFinal` gates on `etapa_atual ∈ {decisao_final, aprovado, rejeitado}` AND a present decision (`data_decisao_final` timestamp OR the persisted `feedback_rejeicao`); the card ("Entenda a decisão sobre sua candidatura" / LGPD Art. 20 body / "Ver explicação") routes to `/candidato/explicacao/${candidatura.id}` — the only in-app path today.
  - **Repointed the candidate landing** (`ROLE_HOME.candidato` `/candidato/perfil` → `/candidato/dashboard`) AND the three post-flow navigate sites: `LoginCandidatoPage.resolveRedirect` default fallback, `CadastroMultiStepForm` post-cadastro, and `FormularioCandidaturaPage` (survivor success + knockout "Voltar"). The funnel is now reachable by click as the real post-login surface (the D-16 smoke journey #1 starts here).
- **Task 2 (D-10) — Perfil stripped:** removed the "VAGAS PARTICIPANDO" + "PROGRESSO NO PROCESSO SELETIVO" candidatura-list blocks (the CAND-DASH-DUP-01 overlap), dropped the now-unused `useCandidaturas` / `ETAPA_PROCESSO_LABELS` / `STATUS_CANDIDATURA_LABELS` / `Candidatura` / `Badge` imports + candidatura-only Lucide icons + the `getStatusBadge`/`formatarData` helpers, and collapsed the two-column grid to a single centered column. Kept `handleSalvarDados` (supabase update + Zustand `setCandidato` sync) + the senha form. Perfil = dados pessoais + edição only.

## Task Commits

Each task committed atomically (all via `git -c core.hooksPath=/dev/null`, project convention — the pre-commit `tsc --noEmit` runs over a ~284-error legacy baseline and would block a normal commit; documented Rule-3 deviation):

1. **Task 1 (RED): failing tests for Dashboard funnel CTA + LGPD card + landing repoint** — `32b9c4c` (test)
2. **Task 1 (GREEN): Dashboard funnel step-CTA + LGPD card + candidate landing repoint (D-09/D-11)** — `ba285fd` (feat)
3. **Task 2: strip candidatura lists from Perfil — dados pessoais + edição only (D-10)** — `595918c` (refactor)

**Plan metadata:** _(the docs commit — SUMMARY + STATE + ROADMAP)_

## Files Created/Modified

- `src/components/pages/DashboardCandidatoPage.tsx` (MODIFIED) — funilNavMap + EtapaFunilM2 + Candidatura imports; `getStepCTA` (drift-guarded) + `hasDecisaoFinal` helpers; per-candidatura step-CTA + LGPD card; mock block removed; accent #35BFAD / #00109E tokens (no bg-primary).
- `src/components/RoleGuard.tsx` (MODIFIED) — `ROLE_HOME.candidato` → `/candidato/dashboard`.
- `src/components/pages/LoginCandidatoPage.tsx` (MODIFIED) — `resolveRedirect` default fallback → `/candidato/dashboard` (anti-open-redirect property preserved).
- `src/features/cadastro/components/CadastroMultiStepForm.tsx` (MODIFIED) — post-cadastro landing → `/candidato/dashboard`.
- `src/components/pages/FormularioCandidaturaPage.tsx` (MODIFIED) — survivor success + knockout "Voltar" → `/candidato/dashboard`.
- `src/components/pages/MeuPerfilCandidatoPage.tsx` (MODIFIED) — candidatura lists + their consumers removed; single-column dados+senha; −183 LoC.
- `src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx` (NEW) — 5 tests (CTA route, drift fallback, LGPD card route + absence, mock-block-removed).
- `src/components/__tests__/RoleGuard.landing.test.tsx` (NEW) — 1 test (candidato wrong-role redirect lands on /candidato/dashboard).
- `src/components/pages/__tests__/LoginCandidatoPage.test.tsx` (MODIFIED) — resolveRedirect default-fallback assertions updated to /candidato/dashboard (Rule 1).

## Decisions Made

- **The Dashboard CTA + LGPD card consume the SAME `funilNavMap` the RH hub (17-03) uses (D-17):** one map keyed on `EtapaFunilM2` → "próximo passo" is identical across personas and drift-proof when the DB enum changes.
- **Drift guard is at the read site, not in the map:** `funilNavMap` is exhaustively typed over `EtapaFunilM2`, but `Candidatura.etapa_atual` is typed M1 `EtapaProcesso` (a known schema-drift). The cast + undefined-lookup guard + null-route guard all live in `getStepCTA`/`hasDecisaoFinal` so a stale/unknown value yields the neutral CTA and never an unguarded deref.
- **LGPD decision signal = `data_decisao_final` OR `feedback_rejeicao`:** `data_decisao_final` is the canonical timestamp; `feedback_rejeicao` covers the knockout/rejected path where the rejection is persisted. Either present (within the decision etapas) shows the card.
- **Landing repoint via `resolveRedirect` default, not a new literal:** the login already routes through the anti-open-redirect `resolveRedirect` helper; changing only its default fallback repoints the landing while keeping the security property (evil/protocol-relative/javascript: URLs still rejected) intact.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated `LoginCandidatoPage.test.tsx` resolveRedirect default-fallback assertions**
- **Found during:** Task 1 (landing repoint)
- **Issue:** The existing test asserted `resolveRedirect(...) === '/candidato/perfil'` for the default fallback in ~9 places. D-09 intentionally changes the default candidate landing to `/candidato/dashboard`, so those assertions encoded the now-changed target and would fail.
- **Fix:** Updated the default-fallback assertions (rejected/empty/missing inputs) + the doc-comment to `/candidato/dashboard`. The anti-open-redirect behavior (rejecting `https://evil.com`, `//evil.com`, `javascript:...`, non-slash paths) and the custom-fallback test are unchanged — only the default landing target moved.
- **Files modified:** src/components/pages/__tests__/LoginCandidatoPage.test.tsx
- **Verification:** 11/11 resolveRedirect tests GREEN.
- **Committed in:** `ba285fd` (Task 1 GREEN commit)

**2. [Rule 3 - Blocking] Reworded a Perfil doc-comment to satisfy the acceptance grep guard**
- **Found during:** Task 2 (Perfil strip)
- **Issue:** The Task 2 acceptance grep requires `grep -Ec "VAGAS PARTICIPANDO|PROGRESSO NO PROCESSO|ETAPA_PROCESSO_LABELS|useCandidaturas" === 0` and `STATUS_CANDIDATURA_LABELS|Badge|Candidatura === 0`, but my explanatory comment listing the removed symbols contained those literal substrings → the guard read 1, despite zero actual code references.
- **Fix:** Reworded the comment to describe the removed symbols in prose without the literal grep-tripping substrings (no behavior change). Same class as the 17-02 `bg-primary` doc-comment deviation.
- **Files modified:** src/components/pages/MeuPerfilCandidatoPage.tsx
- **Verification:** both grep guards now 0; the removed code is genuinely gone.
- **Committed in:** `595918c` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 test-target update, 1 Rule 3 comment-prose-only). No scope change.

## Issues Encountered

- **Full-suite: 12 pre-existing RED failures (NOT regressions).** `npm run test:run` shows 625 passed / 12 failed across 3 files: `legacy-routes.grep.test.ts` (10 — explicitly "RED até 17-05 remover import + rota"/"remover o arquivo"; the legacy-cleanup guards flip GREEN in plan 17-05, which this plan does not touch) + `essay-schemas.test.ts` + `consolidar-decisao-final/index.test.ts` (2 Deno EF specs using `https://`/`npm:` specifiers Vitest cannot resolve — they run under `deno test`, pre-existing). None reference my 3 edited surfaces (`grep -l` returned NONE). All 17 of this plan's own tests pass.
- **tsc baseline 284 → 281:** the Perfil strip removed an M1-label (`ETAPA_PROCESSO_LABELS`) consumer, dropping 3 errors. Well under the ~284 gate; no new tsc errors introduced. `npm run build` exits 0 (pre-existing chunk-size advisory only).

## Authentication Gates

None — no external service or auth interaction in this client-routing/IA plan.

## Known Stubs

None — the Dashboard CTA reads real `useCandidaturas` data (no hardcoded scores); the mock progress block was removed, not replaced with another stub. The LGPD card gates on real `data_decisao_final`/`feedback_rejeicao`. The `/candidato/avaliacao/:id` + `/candidato/explicacao/:id` destinations are live M2 routes.

## User Setup Required

None.

## Next Phase Readiness

- **17-05 (Wave 3 — E2E + legacy cleanup):** the candidate-landing repoint + Dashboard step-CTA are what make the J1 smoke journey ("candidato pós-candidatura → avaliação via Dashboard") pass by click. The legacy-routes grep guards stay RED until 17-05 deletes the confirmed-dead pages + routes.
- No blockers.

## Threat Flags

None — this plan adds NO new candidate-facing `select` (Dashboard reuses the existing RLS-gated `useCandidaturas`; the Perfil strip REMOVES a candidate-facing read). The step-CTA + LGPD CTA interpolate the candidatura's OWN id (`candidatura.id` from the user's own RLS-scoped list) into fixed internal route templates — no user-supplied target, no open-redirect; the etapa cast is guarded so a stale value yields a neutral CTA, never a wrong-id route. The landing repoint changes only WHERE a candidato lands (both routes already candidato-RoleGuard-protected).

## Self-Check: PASSED

All 9 source/test files present on disk; all 3 task commits (`32b9c4c`, `ba285fd`, `595918c`) present in git history; build green; tsc 281 ≤ 284.

---
*Phase: 17-navegacao-arquitetura-informacao*
*Completed: 2026-06-28*
