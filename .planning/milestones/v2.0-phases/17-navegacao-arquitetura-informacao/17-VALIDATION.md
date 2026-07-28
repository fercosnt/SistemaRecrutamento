---
phase: 17
slug: navegacao-arquitetura-informacao
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-28
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `17-RESEARCH.md` § Validation Architecture. This is a navigation/IA + legacy-cleanup phase — validation centers on **route resolution, redirects, role-gating, empty states, and the 404 catch-all** (NOT end-to-end data flow, already UAT'd in M2 per D-16).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit) + Playwright (E2E navigability smoke) |
| **Config file** | `vite.config.ts` (Vitest) / `playwright.config.ts` (existing) |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && npm run test:e2e` |
| **Estimated runtime** | ~unit fast (<30s) · e2e nav smoke ~1–2 min |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- <touched-area>` (+ `npm run lint` tsc baseline guard, ~301)
- **After every plan wave:** Run full suite (`npm run test:run && npm run test:e2e -- navegacao`)
- **Before `/gsd:verify-work`:** Full suite green; navegability E2E green (gated scenarios with `E2E_AUTH_TEST_USERS=true` + administrador cred)
- **Max feedback latency:** ~120 seconds (e2e nav smoke)

---

## Per-Task Verification Map

> Dimension 8 — each task maps to a unit assertion (funilNavMap derivation, route table, redirects, role-gating, empty state) or a Playwright navigation assertion (resolves to expected route/heading). Precedent: `e2e/cadastro-flow.spec.ts` + `e2e/login-flow.spec.ts` (gated real-auth).

| Task ID | Plan | Wave | Decision | Secure Behavior | Test Type | Automated Command | File | Status |
|---------|------|------|----------|-----------------|-----------|-------------------|------|--------|
| 17-01 T1 | 17-01 | 0 | D-17/D-14/D-13 | n/a (RED scaffolds) | unit (RED) | `npm run test:run -- funilNavMap routes.nav RHSidebar.admin` | src/lib/navegacao/__tests__/funilNavMap.test.ts · src/router/__tests__/routes.nav.test.tsx · src/components/__tests__/RHSidebar.admin.test.tsx | ❌ red (calibrated — funilNavMap module-not-found · catch-all path:'*' absent · Admin item absent) |
| 17-01 T2 | 17-01 | 0 | D-07/D-12 | grep guard | unit (RED) | `npm run test:run -- hubEmptyState legacy-routes` | src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx · src/__tests__/guards/legacy-routes.grep.test.ts | ❌ red (calibrated — HubSection module-not-found · 12 dead refs present + VagaLPPage.tsx present; MeuPerfilPage KEEP control green) |
| 17-01 T3 | 17-01 | 0 | D-16 | gated real-auth creds from env | e2e (RED) | `npx playwright test navegacao --list` | e2e/navegacao.spec.ts | ❌ red (calibrated — J4 404 heading absent; lists 12 tests × 3 projects; J1-J3 gated) |
| 17-02 T1 | 17-02 | 1 | D-17 | pure lib, no I/O | unit | `npm run test:run -- funilNavMap` | src/lib/navegacao/funilNavMap.ts | ⬜ pending |
| 17-02 T2 | 17-02 | 1 | D-14 | 404 renders for null role, no leak | unit (render) | `npm run lint` + routes.nav | src/components/pages/NotFoundPage.tsx | ⬜ pending |
| 17-02 T3 | 17-02 | 1 | D-08/D-14 | static internal redirect target only | unit + build | `npm run test:run -- routes.nav devnav-gate` | src/router/routes.tsx | ⬜ pending |
| 17-03 T1 | 17-03 | 2 | D-05/D-06/D-07 | reuse allowlist hooks (no select('*')) | unit | `npm run test:run -- hubEmptyState` | src/features/hub-candidato/* | ⬜ pending |
| 17-03 T2 | 17-03 | 2 | D-04/D-13 | sidebar visibility cosmetic; RoleGuard+RLS real | unit + build | `npm run test:run -- RHSidebar.admin` | RHSidebar.tsx · TriagemTable.tsx · PerfilCandidatoRHPage.tsx | ⬜ pending |
| 17-04 T1 | 17-04 | 2 | D-09/D-11 | own-id route param; drift-guarded | unit + build | `npm run lint` + build | DashboardCandidatoPage.tsx · RoleGuard.tsx | ⬜ pending |
| 17-04 T2 | 17-04 | 2 | D-10 | removes a candidate-facing read | build | `npm run build` | MeuPerfilCandidatoPage.tsx | ⬜ pending |
| 17-05 T1 | 17-05 | 3 | D-12 | build-after-each deletion (Pitfall 6) | grep guard + build | `npm run test:run -- legacy-routes devnav-gate` | routes.tsx + 12 deleted files | ⬜ pending |
| 17-05 T2 | 17-05 | 3 | D-16/D-03 | gated real-auth; route/heading only | e2e | `npx playwright test navegacao` | e2e/navegacao.spec.ts | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Calibrated RED tests authored before implementation (Plan 17-01), per the smoke-runtime gate established in M1 Phase 4.1. All authored under `__tests__/` dirs (vitest include glob) and the e2e dir.

- [x] `src/lib/navegacao/__tests__/funilNavMap.test.ts` — exhaustiveness over the 8 `EtapaFunilM2` members + candidaturaId param shape + `ETAPA_M2_LABELS` reuse (D-17) — RED (module-not-found) until 17-02
- [x] `src/router/__tests__/routes.nav.test.tsx` — catch-all `path:'*'` → NotFoundPage + param-preserving redirect (D-08/D-14) — RED until 17-02
- [x] `src/components/__tests__/RHSidebar.admin.test.tsx` — Admin item renders ONLY for administrador (D-13) — RED until 17-03
- [x] `src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx` — future-stage empty state copy, no invented data (D-07) — RED (module-not-found) until 17-03
- [x] `src/__tests__/guards/legacy-routes.grep.test.ts` — confirmed-dead components have zero routes.tsx refs; MeuPerfilPage kept (D-12) — RED until 17-05
- [x] `e2e/navegacao.spec.ts` — 4 journeys resolve to the right route/heading; gated real-auth for RH+candidate, unconditional 404 (D-16) — J4 RED until 17-02, J1-J3 until 17-03/04
- [ ] `administrador` E2E credential wired into `.env.test` (gated) for the RH/admin journey (J2+J3 cover the rh-role seed gap, A3) — env-provision item for the runtime battery (17-05), not a code artifact of this plan

---

## Manual-Only Verifications

| Behavior | Decision | Why Manual | Test Instructions |
|----------|----------|------------|-------------------|
| Hub renders the FULL pipeline with real service data vs empty states for not-yet-reached stages | D-07 | Requires a candidatura seeded at a known `etapa_atual` in live PROD; E2E asserts route/heading, not per-section data accuracy | RH login → TriagemTable → click candidate → hub shows current-stage CTA dominant + passed stages + future stages as empty/locked |
| Candidate funnel reachable BY CLICK from the real post-login landing | D-09 / Pitfall 3 | The landing repoint (ROLE_HOME→/candidato/dashboard) must be confirmed against a real login session, not just a direct goto | Candidato login → confirm landing is /candidato/dashboard → click "Continuar para {label}" → lands on /candidato/avaliacao/:id |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-06-28
