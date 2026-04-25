---
phase: 04
slug: vagas-candidatura
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-25
updated: 2026-04-25
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | Vitest 1.x (unit) + Playwright 1.x (E2E) |
| **Config files** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test:run -- --reporter=basic` |
| **Full suite command** | `npm run test:run && npm run test:e2e` |
| **Type-check command** | `npm run lint` (`tsc --noEmit`) |
| **Estimated runtime** | unit ~12s · e2e ~45s · type-check ~6s |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint` (always — pre-commit hook) + targeted `npm run test:run -- <test-file>` for any added/modified Vitest spec
- **After every plan wave:** Run `npm run test:run` (full Vitest)
- **Before `/gsd-verify-work`:** Full suite (`npm run test:run && npm run test:e2e`) must be green
- **Max feedback latency:** 60 seconds for unit; 90 seconds for E2E

---

## Per-Task Verification Map

> Per-Task Verification Map will be filled by gsd-executor as each task lands; planner has confirmed all tasks across 04-01..04-08 have `<verify><automated>` blocks (manual audit complete 2026-04-25 during checker iteration 1).
>
> **Planner audit summary (manual count):**
> - Plan 04-01: 8 tasks (Tasks 1-4 SQL migrations, Task 5 SQL smoke checkpoint, Task 6 Vitest stubs, Task 7 Pitfall 7 grep extension, Task 8 Playwright stubs + fixtures) — all have automated verify
> - Plan 04-02: routing migration + isUuid + getVagaBySlug + VagasPage delete — all have automated verify
> - Plan 04-03: cvUploadService implementation — all have automated verify
> - Plan 04-04: useVagaPerguntas + candidaturaFormSchema (dynamic Zod factory) — all have automated verify
> - Plan 04-05: 4 tasks (schemas patch, Edge Function source, candidaturasService wrapper + Vitest, deploy checkpoint) — all have automated verify
> - Plan 04-06: VagaDetalhePage patch (slug param + 404 state) — all have automated verify
> - Plan 04-07: FormularioCandidaturaPage rewrite (1 monolithic task) — has automated verify with grep + tsc gate
> - Plan 04-08: 4 tasks (Playwright promotion x2, UAT skeleton, final checkpoint battery) — all have automated verify

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _Filled by gsd-executor as each task lands_ | 04-01..04-08 | 0..4 | VAGA-01..03, CAND-01..04 | T-04-01..T-04-12 | _per task_ | unit / integration / e2e / sql-smoke / human-verify | _per task `<automated>`_ | per task | ⬜ pending |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Stubs and infra that must land BEFORE feature plans. Filled by gsd-planner.

- [ ] `src/features/vagas/services/__tests__/cvUploadService.test.ts` — stubs for CAND-01 (size/MIME/path)
- [ ] `src/features/vagas/services/__tests__/vagasService.test.ts` — extend with `getVagaBySlug` cases (VAGA-02)
- [ ] `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` — stubs for CAND-02 cache key + ordering
- [ ] `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` — Zod factory cases (5 tipo_resposta variants)
- [ ] `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` — extend `PHASE_4_VAGAS_PATHS` (incl. `curriculo_nome|file\.name` PII guard — see B2 resolution)
- [ ] `e2e/vagas-browse.spec.ts` — stubs for VAGA-01 + VAGA-02 (anonymous browse)
- [ ] `e2e/candidatura-submit.spec.ts` — stubs for CAND-01..04 (logged-in apply, duplicate, login redirect roundtrip)
- [ ] DB migration applied locally (`supabase db push`) so types regen + tests run against live schema

*Vitest, Playwright, jwt-decode, RHF, Zod, TanStack Query — all already installed (Phase 2/3).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real PDF upload to Supabase Storage `curriculos` bucket from real browser | CAND-01 | Real Storage requires authenticated session + network round-trip; flaky in headless CI | UAT runbook: log in, browse vaga, upload `~/test-cv-1mb.pdf`, confirm preview shows filename + size + remove button, confirm submit succeeds, confirm row appears in `storage.objects` with path `<auth.uid()>/<uuid>.pdf` |
| Slug trigger applies on real RH-created vaga | VAGA-02 | RH UI lands in Phase 6; for Phase 4 verify by direct INSERT INTO vagas in SQL editor | Insert two rows with `titulo='Designer Junior'` — confirm slugs are `designer-junior` and `designer-junior-2` |
| signed URL expires after 1h | CAND-01 (D-08) | Time-based; cannot be tested in <1h CI run | Generate signed URL, save it, wait 1h+1m, hit URL — expect 400/expired |
| Mobile sticky CTA visible at iPhone 12 viewport (390×844) | VAGA-02 | Layout regression visible only on real device sizes; Playwright viewport may not catch iOS Safari quirks | Open `/vagas/:slug` on real iPhone or Chrome DevTools 390×844 — confirm "Candidatar-se" CTA stays anchored to bottom on scroll |
| DB smoke: slug dedup, bucket policies, RPC grants, UNIQUE constraint | VAGA-02 / CAND-01 / CAND-04 | SQL-only; runs against live DB | Plan 04-01 Task 5 checkpoint — runs inline psql / Supabase Studio queries (no separate shell script per RESEARCH.md Open Question 6 resolution) |
| Cross-browser PKCE recovery deeplink (Phase 3 carryover D-16) | AUTH-04 | Out of Phase 4 scope per D-16 — deferred to Phase 5 | _Not applicable to Phase 4 UAT_ |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`--watch`, `--ui`) in any automated command
- [ ] Feedback latency <60s for unit, <90s for E2E
- [x] `nyquist_compliant: true` set in frontmatter (planner manual audit complete 2026-04-25)

**Approval:** pending (awaits gsd-executor to fill the per-task table as each task lands)
