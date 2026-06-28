---
phase: 17
slug: navegacao-arquitetura-informacao
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Config file** | `vitest.config.ts` / `playwright.config.ts` (existing) |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && npm run test:e2e` |
| **Estimated runtime** | ~unit fast (<30s) · e2e nav smoke ~1–2 min |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (+ `npm run lint` tsc baseline guard)
- **After every plan wave:** Run full suite (`npm run test:run && npm run test:e2e`)
- **Before `/gsd:verify-work`:** Full suite green; navegability E2E green
- **Max feedback latency:** ~120 seconds (e2e nav smoke)

---

## Per-Task Verification Map

> Populated by the planner (Dimension 8). Each task maps to a unit assertion (funilNavMap derivation, route table, redirects, role-gating) or a Playwright navigation assertion (resolves to expected route/heading). Precedent: `e2e/cadastro-flow.spec.ts`.

| Task ID | Plan | Wave | Decision | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------|------------|-----------------|-----------|-------------------|-------------|--------|
| _TBD by planner_ | — | — | D-NN | — | — | unit / e2e | `npm run test:run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Calibrated RED tests authored before implementation, per the smoke-runtime gate established in M1 Phase 4.1. Candidate Wave-0 assertions (planner finalizes):

- [ ] `funilNavMap` unit test — `etapa_atual → { rotaCandidato, rotaWorkspaceRH, label, CTA }` for every `EtapaFunilM2` member (RED until `src/lib/navegacao/funilNavMap.ts` lands)
- [ ] Route-table test — catch-all `path:'*'` resolves to `NotFoundPage`; plural→singular redirects resolve without breaking existing links (RED until `routes.tsx` updated)
- [ ] Playwright nav smoke — 4 broken journeys resolve to the right route/heading (RED until wiring lands): (a) candidato pós-candidatura → avaliação via Dashboard; (b) RH TriagemTable → hub → each of 3 workspaces; (c) admin → sidebar → /admin/*; (d) URL inválida → 404

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Decision | Why Manual | Test Instructions |
|----------|----------|------------|-------------------|
| Hub renders the FULL pipeline with real service data vs empty states for not-yet-reached stages | D-07 | Requires a candidatura seeded at a known `etapa_atual` in live PROD; E2E asserts route/heading, not per-section data accuracy | RH login → TriagemTable → click candidate → hub shows current-stage CTA dominant + passed stages + future stages as empty/locked |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
