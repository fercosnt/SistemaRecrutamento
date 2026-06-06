# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06)
- 📋 **v2.0 — M2 Funil RH + Avaliação por IA** — planned (run `/gsd:new-milestone`; PRD-MASTER v1.1 ready)

## Phases

<details>
<summary>✅ v1.0 — M1 MVP Candidato (Phases 1–5) — SHIPPED 2026-06-06</summary>

Full detail archived in `milestones/v1.0-ROADMAP.md`. Audit: `milestones/v1.0-MILESTONE-AUDIT.md` (PASSED, 38/38 reqs).

- [x] **Phase 1: Foundation Saneada** — Unified auth, Edge Functions, types pipeline, RLS hardening (5/5 plans) — 2026-04-20
- [x] **Phase 2: Cadastro Candidato** — Multi-step registration rewired to Edge Function (6/6 plans) — 2026-04-24
- [x] **Phase 3: Login + Recuperação de Senha** — Candidate authentication + password recovery (7/7 plans) — 2026-04-27
- [x] **Phase 4: Vagas + Candidatura** — Job listing, detail page, CV upload, application flow (9/9 plans) — 2026-04-26
- [x] **Phase 4.1: Auth Hydration Fix** (INSERTED) — hydrateFromSession + waitForCandidatoHydrated; smoke-runtime gate established (5/5 plans) — 2026-04-27
- [x] **Phase 4.2: Phase 1 Verification Backfill** (INSERTED) — 12 FOUND-* partial→satisfied; VALIDATION draft→validated (1/1 plan) — 2026-04-27
- [x] **Phase 5: Perfil + Hardening MVP** — Real-data profile, first CI pipeline (unit+e2e+lighthouse green), a11y zero-violations, OTP recovery, ErrorBoundary root (7/7 plans) — 2026-06-06

</details>

### 📋 v2.0 — M2 Funil RH + Avaliação por IA (Planned)

Not yet roadmapped. Design is frozen (PRD-MASTER v1.1 + 5 mini-PRDs). Start with `/gsd:new-milestone`.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation Saneada | v1.0 | 5/5 | Complete | 2026-04-20 |
| 2. Cadastro Candidato | v1.0 | 6/6 | Complete | 2026-04-24 |
| 3. Login + Recuperação de Senha | v1.0 | 7/7 | Complete | 2026-04-27 |
| 4. Vagas + Candidatura | v1.0 | 9/9 | Complete | 2026-04-26 |
| 4.1 Auth Hydration Fix | v1.0 | 5/5 | Complete | 2026-04-27 |
| 4.2 Phase 1 Verification Backfill | v1.0 | 1/1 | Complete | 2026-04-27 |
| 5. Perfil + Hardening MVP | v1.0 | 7/7 | Complete | 2026-06-06 |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/`.*
