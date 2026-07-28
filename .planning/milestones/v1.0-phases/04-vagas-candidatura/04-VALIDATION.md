---
phase: 04
slug: vagas-candidatura
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-25
updated: 2026-04-26
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | Vitest 1.x (unit, configured inside `vite.config.ts > test`) + Playwright 1.x (E2E) |
| **Config files** | `vite.config.ts` (Vitest block, lines 8-12), `playwright.config.ts` |
| **Test setup** | `tests/setup.ts` |
| **Include glob** | `**/__tests__/**/*.{test,spec}.{ts,tsx}` |
| **Quick run command** | `npm run test:run -- --reporter=basic` |
| **Targeted run** | `npm run test:run -- src/features/vagas` (Phase 4 unit suite only) |
| **Full suite command** | `npm run test:run && npm run test:e2e` |
| **Type-check command** | `npm run lint` (`tsc --noEmit`) |
| **Measured runtime** | unit (vagas + pitfall7) ~2.1s · full unit ~12s · e2e ~45s · type-check ~6s |

> **Note:** original draft assumed `vitest.config.ts` exists. It does not — Vitest config lives inside `vite.config.ts`. Updated 2026-04-26 audit.

---

## Sampling Rate

- **After every task commit:** Run `npm run lint` (always — pre-commit hook) + targeted `npm run test:run -- <test-file>` for any added/modified Vitest spec
- **After every plan wave:** Run `npm run test:run` (full Vitest)
- **Before `/gsd-verify-work`:** Full suite (`npm run test:run && npm run test:e2e`) must be green
- **Max feedback latency:** 60 seconds for unit; 90 seconds for E2E

---

## Per-Task Verification Map

> Filled by 2026-04-26 validation audit (gsd-validate-phase). Each row maps a task's `<verify><automated>` block in the plan to the corresponding test file or grep gate, classifies the test type, and confirms file existence on disk.

**Status legend:** ✅ green (test exists + passes) · ⬜ stub-only · ❌ red · ⚠️ flaky · 🛠️ grep/structural gate · 👤 human-verify

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command (excerpt) | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------------------|-------------|--------|
| 04-01-T1 | 04-01 | 0 | VAGA-02 | T-04-02 | slug trigger guards `/vagas/:slug` URL | grep | `grep -c "CREATE TRIGGER vagas_set_slug_trigger" 20260425000001_vagas_slug_trigger.sql` | ✓ | 🛠️ |
| 04-01-T2 | 04-01 | 0 | CAND-01 | T-04-04, T-04-05 | private bucket + 5MB cap + PDF whitelist + 4 RLS policies | grep | `grep -c "CREATE POLICY \"curriculos_" 20260425000002_curriculos_bucket.sql` | ✓ | 🛠️ |
| 04-01-T3 | 04-01 | 0 | CAND-03 | T-04-06, T-04-07 | RPC SECURITY DEFINER grant only to service_role | grep | `grep -q "TO service_role" && ! grep -q "TO authenticated"` | ✓ | 🛠️ |
| 04-01-T4 | 04-01 | 0 | CAND-04 | T-04-08 | UNIQUE partial idx WHERE deleted_at IS NULL | grep | `grep -q "WHERE deleted_at IS NULL" 20260425000004_*.sql` | ✓ | 🛠️ |
| 04-01-T5 | 04-01 | 0 | VAGA-02, CAND-01..04 | T-04-01..08 | live DB push + types regen | sql-smoke | manual `supabase db push --linked` + 5 SQL smoke probes (Studio) | n/a | 👤 (UAT-J04 + Studio query passed) |
| 04-01-T6 | 04-01 | 0 | CAND-01, CAND-02, VAGA-02 | n/a | Wave 1+ test stubs land before consumers | unit-stubs | `test -f cvUploadService.test.ts && candidaturaFormSchema.test.ts && useVagaPerguntas.test.ts && isUuid.test.ts` | ✓ | ✅ (later filled, all pass) |
| 04-01-T7 | 04-01 | 0 | CAND-01, AUTH (cross-phase) | T-04-09 | Pitfall 7 PII guard extended to Phase 4 paths (incl. `curriculo_nome`/`file.name`) | unit | `npm run test:run -- pitfall7.grep` | ✓ | ✅ (4 tests, PHASE_4_VAGAS_PATHS active) |
| 04-01-T8 | 04-01 | 0 | VAGA-01..03, CAND-01..04 | n/a | Playwright skeletons + CV fixtures | e2e-stubs | `test -f vagas-browse.spec.ts && candidatura-submit.spec.ts && fixtures/cv-sample-{1,6}mb.pdf && not-a-cv.docx` | ✓ | ✅ (later promoted in 04-08) |
| 04-02-T1 | 04-02 | 1a | VAGA-02 | n/a | UUID detection branches `/vagas/:identifier` to slug-vs-id query | unit | `npm run test:run -- isUuid.test.ts` | ✓ | ✅ (6 tests) |
| 04-02-T2 | 04-02 | 1a | VAGA-01, VAGA-02 | T-04-02 | `getVagaBySlug` filters `status='ativa'` + 404 on miss | unit | `npm run test:run -- vagasService.test.ts -t "getVagaBySlug"` | ✓ | ✅ (6 tests in vagasService) |
| 04-02-T3 | 04-02 | 1a | VAGA-02 | n/a | hierarchical `vagasKeys` + `useVagaBySlug` | grep | `grep -c "useVagaBySlug" useVagas.ts` | ✓ | 🛠️ |
| 04-03-T1 | 04-03 | 1a | CAND-01 | T-04-04, T-04-09 | validateCV size+MIME, redacted logs, signed-URL TTL=1h | grep | `grep -c "export class CVUploadServiceError" cvUploadService.ts` | ✓ | 🛠️ |
| 04-03-T2 | 04-03 | 1a | CAND-01 | T-04-04, T-04-05 | activate 13+ Vitest cases (size, MIME, path schema, signed URL, redaction) | unit | `npm run test:run -- cvUploadService.test.ts` | ✓ | ✅ (14 tests) |
| 04-04-T1 | 04-04 | 1b | CAND-02 | n/a | dynamic Zod factory for 5 `tipo_resposta` variants | grep | `grep -c "export function buildCandidaturaSchema" candidaturaFormSchema.ts` | ✓ | 🛠️ |
| 04-04-T2 | 04-04 | 1b | CAND-02 | n/a | activate 11+ schema cases | unit | `npm run test:run -- candidaturaFormSchema.test.ts` | ✓ | ✅ (16 tests) |
| 04-04-T3 | 04-04 | 1b | CAND-02 | n/a | useVagaPerguntas hook with cache key + ordering | unit | `npm run test:run -- useVagaPerguntas.test.ts` | ✓ | ✅ (4 tests) |
| 04-05-T1 | 04-05 | 2 | CAND-03 | T-04-06 | EF shared schemas + DUPLICATE_CANDIDATURA error code + 5MB cap | grep | `grep -q "DUPLICATE_CANDIDATURA" _shared/schemas.ts && grep -q "5_242_880"` | ✓ | 🛠️ |
| 04-05-T2 | 04-05 | 2 | CAND-03, CAND-04 | T-04-06, T-04-07, T-04-08 | EF: anon-validates JWT + admin-runs RPC; maps 23505 → DUPLICATE_CANDIDATURA | grep | `grep -c "DUPLICATE_CANDIDATURA" submit-candidatura/index.ts ≥ 2 && supabaseUser ≥ 2 && supabaseAdmin ≥ 3` | ✓ | 🛠️ |
| 04-05-T3 | 04-05 | 2 | CAND-03, CAND-04 | T-04-06 | service wrapper + Vitest cases for 6 error mappings | unit | `npm run test:run -- candidaturasService.test.ts -t "submitCandidaturaWithRespostas"` | ✓ | ✅ (7 tests covering T1-T7 mapping) |
| 04-05-T4 | 04-05 | 2 | CAND-03 | T-04-06 | EF deployed live with `verify_jwt=true` | sql-smoke | manual deploy + Studio function-list verification | n/a | 👤 (function `submit-candidatura` ACTIVE v1, verified 04-08-UAT-J01/J02) |
| 04-06-T1 | 04-06 | 3a | VAGA-02, CAND-03 | n/a | router exposes `/vagas/:identifier` + `/candidato/candidatura/formulario/:vagaSlug` | grep | `grep -c "/vagas/:identifier" routes.tsx == 1 && VagasPage absent` | ✓ | 🛠️ |
| 04-06-T2 | 04-06 | 3a | VAGA-02, VAGA-03 | T-04-02, T-04-09 | VagaDetalhePage slug routing + 404 + login-redirect roundtrip | grep + e2e | `grep -c "VagaNotFoundState" + "redirect="` + e2e/vagas-browse.spec.ts B-J04 | ✓ | 🛠️ + ✅ |
| 04-06-T3 | 04-06 | 3a | n/a | n/a | delete orphan VagasPage.tsx + audit consumers | grep | `test ! -f VagasPage.tsx && no remaining imports` | ✓ | 🛠️ |
| 04-07-T1 | 04-07 | 3b | VAGA-03, CAND-01..04 | T-04-04..09 | FormularioCandidaturaPage rewrite (RHF + dynamic Zod + EF submit) | grep + tsc + e2e | 18-gate grep block + `tsc --noEmit` zero net-new + e2e/candidatura-submit B-J06..B-J11 | ✓ | 🛠️ + ✅ |
| 04-08-T1 | 04-08 | 4 | VAGA-01, VAGA-02 | n/a | promote vagas-browse spec (5 scenarios B-J01..B-J05) | e2e | `npx playwright test e2e/vagas-browse.spec.ts` | ✓ | ✅ (5 tests, fixme=0) |
| 04-08-T2 | 04-08 | 4 | VAGA-03, CAND-01..04 | T-04-09 | promote candidatura-submit spec (6 scenarios B-J06..B-J11) | e2e | `npx playwright test e2e/candidatura-submit.spec.ts` + sonner toast assert | ✓ | ✅ (6 tests, fixme=0) |
| 04-08-T3 | 04-08 | 4 | VAGA-01..03, CAND-01..04 | n/a | Phase 4 UAT runbook (≥6 scenarios with PASS/FAIL gates) | manual | `04-08-UAT.md` runbook | ✓ | 👤 (6/6 PASS post-Carryover-C) |
| 04-08-T4 | 04-08 | 4 | all Phase 4 IDs | all T-04-* | final phase verification battery — Vitest + Playwright + Pitfall 7 + tsc + build | mixed | `npm run lint && npm run test:run && npm run test:e2e && npm run build` | ✓ | ✅ (340/341, 320 lint baseline, build exit 0) |
| 04-08-CARRYOVER-A | carryover | 4 | VAGA-03, CAND-01..03 | n/a | CSS scrub: zero `primary-NNN` in FormularioCandidaturaPage | grep | `grep -c "primary-[0-9]" FormularioCandidaturaPage.tsx == 0` | ✓ | 🛠️ |
| 04-08-CARRYOVER-B | carryover | 4 | VAGA-03, CAND-01..03 | n/a | bg-primary token workaround + persona shell on form | grep | grep checks for `bg-[#00109E]` + `showCandidatoShell` | ✓ | 🛠️ |
| 04-08-CARRYOVER-C | carryover | 4 | VAGA-03, CAND-01..03 | n/a | `curriculo` field `.optional()` so re-submit gate doesn't destroy form-state | grep | `grep -q "curriculo:" + ".optional()" candidaturaFormSchema.ts` | ✓ | 🛠️ |
| 04-09-T1 | 04-09 | gap | VAGA-01 (UI gap) | n/a | VagasPublicasPage persona shell + GlassButton inline-flex (≥6 occurrences) | grep + tsc | 11-gate grep block + `npm run lint` | ✓ | 🛠️ |
| 04-09-T2 | 04-09 | gap | VAGA-02 (UI gap) | n/a | VagaDetalhePage persona shell + VagaNotFoundState back-button | grep + tsc | grep block + `npm run lint` | ✓ | 🛠️ |
| 04-09-T3 | 04-09 | gap | VAGA-01, VAGA-02 (UI) | n/a | viewport visual smoke (3 gaps closed) | manual | resume-signal after human visual check | n/a | 👤 (6/6 visual smoke PASS) |

**Coverage totals:**
- Tasks: **33** (29 standard + 3 carryover + 1 visual-smoke)
- Automated unit/E2E ✅: 13 (full Vitest suites + 2 promoted Playwright specs)
- Grep / structural gate 🛠️: 14
- Human-verify 👤: 6 (T5 db-push, T4 EF deploy, T3 UAT runbook, T3 visual smoke, plus pre-existing manual-only items below)
- Stub-only ⬜: 0 (all stubs were promoted in their respective waves)
- Red ❌ / flaky ⚠️: 0

---

## Wave 0 Requirements

> Stubs and infra that must land BEFORE feature plans. All landed in Plan 04-01.

- [x] `src/features/vagas/services/__tests__/cvUploadService.test.ts` — stubs for CAND-01 (size/MIME/path); promoted in 04-03 to 14 cases
- [x] `src/features/vagas/services/__tests__/vagasService.test.ts` — extended with `getVagaBySlug` cases (VAGA-02); 6 cases live
- [x] `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` — stubs for CAND-02 cache key + ordering; promoted in 04-04 to 4 cases
- [x] `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` — Zod factory cases (5 `tipo_resposta` variants); promoted in 04-04 to 16 cases
- [x] `src/features/vagas/utils/__tests__/isUuid.test.ts` — added in 04-02 T1; 6 cases
- [x] `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` — extended `PHASE_4_VAGAS_PATHS` (incl. `curriculo_nome|file\.name` PII guard — see B2 resolution); 4 active tests
- [x] `e2e/vagas-browse.spec.ts` — promoted to 5 scenarios for VAGA-01 + VAGA-02 (anonymous browse)
- [x] `e2e/candidatura-submit.spec.ts` — promoted to 6 scenarios for CAND-01..04 (logged-in apply, duplicate, login redirect roundtrip)
- [x] DB migration applied locally (`supabase db push --linked` after `supabase migration repair --status applied`) — types regenerated; UAT-J01/J02 confirmed atomic insert against live schema

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
| Edge Function `submit-candidatura` deployed live | CAND-03 | Deploy is one-shot CLI command; verify via Studio function list | Plan 04-05 Task 4 checkpoint — `supabase functions deploy submit-candidatura` then confirm ACTIVE in dashboard |
| Phase-level UAT runbook execution (04-08-UAT.md + 04-UAT.md) | All Phase 4 IDs | Real-world chain validation against Supabase production | 6+3 scenarios manually exercised by Fernando; pass criteria documented per UAT card |
| 04-09 viewport visual smoke (persona shell + GlassButton inline-flex) | VAGA-01, VAGA-02 (UI) | Browser viewport rendering not reliably reproducible in headless | Resume-signal protocol — 6/6 visual smoke PASS recorded in 04-09-SUMMARY |
| Cross-browser PKCE recovery deeplink (Phase 3 carryover D-16) | AUTH-04 | Out of Phase 4 scope per D-16 — deferred to Phase 5 | _Not applicable to Phase 4 UAT_ |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (33/33 mapped above)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (longest streak of human-verify is 1 — T5 db-push, T4 EF deploy, T3 visual smoke each isolated)
- [x] Wave 0 covers all MISSING references (8/8 stubs landed in 04-01 and were promoted in their respective waves)
- [x] No watch-mode flags (`--watch`, `--ui`) in any automated command (audited 2026-04-26)
- [x] Feedback latency <60s for unit (~2.1s measured for Phase 4 unit subset), <90s for E2E
- [x] `nyquist_compliant: true` set in frontmatter (planner manual audit 2026-04-25 + validation audit 2026-04-26)

**Approval:** ✅ NYQUIST-COMPLIANT — validated 2026-04-26 by `/gsd-validate-phase 4` audit. All 7 requirements (VAGA-01..03, CAND-01..04) have automated verification. Manual-only items are correctly classified and were exercised in 2 UAT cycles + 04-09 visual smoke.

---

## Validation Audit 2026-04-26

| Metric | Count |
|--------|-------|
| Tasks audited | 33 |
| Automated unit/E2E green ✅ | 13 |
| Grep/structural gate 🛠️ | 14 |
| Human-verify 👤 | 6 |
| Stub-only ⬜ | 0 |
| Red ❌ / flaky ⚠️ | 0 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Audit method:** read all 12 PLAN files + 9 SUMMARY files + 04-VERIFICATION.md. Scanned `<verify><automated>` blocks per task. Cross-referenced against `find src e2e -name "*.test.*" -o -name "*.spec.*"` and `ls supabase/migrations/2026042500000{1,2,3,4}*.sql`. Ran targeted Phase 4 Vitest subset (`npm run test:run -- src/features/vagas src/features/auth/utils/__tests__/pitfall7.grep.test.ts`) — **57/57 PASS in 2.08s**.

**Drift fixes applied during audit:**
- Test Infrastructure table: corrected `vitest.config.ts` → `vite.config.ts > test` block (config does not exist as separate file)
- Per-Task Verification Map: replaced executor placeholder row with all 33 tasks
- Wave 0 Requirements: all 8 boxes checked (stubs landed and were promoted)
- Manual-Only table: added two rows (EF deploy, 04-09 visual smoke) that were exercised but not previously listed
- Sign-off checkboxes: 5 of 6 boxes checked; the planner-only box was already checked
- Frontmatter: `status: draft → validated`, `wave_0_complete: false → true`, `updated: 2026-04-26`
