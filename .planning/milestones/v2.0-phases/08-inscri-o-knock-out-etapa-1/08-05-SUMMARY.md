---
phase: 08-inscri-o-knock-out-etapa-1
plan: 05
subsystem: candidato-ui
tags: [react, candidato-ui, knockout, lgpd, d-15, d-16, feedback-rejeicao, e2e, edge-function]

# Dependency graph
requires:
  - phase: 08-04
    provides: submit_candidatura_atomic returns status/etapa_atual + writes feedback_rejeicao (D-15 neutral copy)
  - phase: 04-05
    provides: submit-candidatura Edge Function (two-client pattern) + submitCandidaturaWithRespostas wrapper
  - phase: 04
    provides: FormularioCandidaturaPage + MeuPerfilCandidatoPage + DashboardCandidatoPage candidate surfaces
provides:
  - "FormularioCandidaturaPage branches post-submit on RPC status: rejeitado → inline D-15 neutral result; survivor → success + navigate"
  - "EF submit-candidatura passes status + etapa_atual through to the client (D-16)"
  - "submitCandidaturaWithRespostas surfaces SubmitCandidaturaResult { candidaturaId, status, etapa_atual }"
  - "feedback_rejeicao rendered below the rejeitado badge on /perfil (2 surfaces) + dashboard, muted tone, criterion never shown"
  - "e2e/inscricao-knockout.spec.ts promoted from fixme stub to env-gated runnable (no-leak contract runs unconditionally)"
affects: [phase-09, phase-10, candidato-status-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Post-submit result-state branch (submitResult: 'rejeitado' | 'enviado' | null) drives inline knockout vs. success surface — no navigate on knockout"
    - "feedback_rejeicao gated on status==='rejeitado' && feedback_rejeicao at every surface; criterion (opcao_knockout_id) never sent/rendered (T-08-13)"
    - "E2E live steps env-gated (E2E_REAL_LOGIN + E2E_ALLOW_DB_WRITE + KNOCKOUT_VAGA_SLUG) with test.skip; deterministic string contract runs in CI"

key-files:
  created: []
  modified:
    - src/components/pages/FormularioCandidaturaPage.tsx
    - src/components/pages/MeuPerfilCandidatoPage.tsx
    - src/components/pages/DashboardCandidatoPage.tsx
    - src/features/vagas/services/candidaturasService.ts
    - supabase/functions/submit-candidatura/index.ts
    - e2e/inscricao-knockout.spec.ts

key-decisions:
  - "EF status passthrough: the RETURN jsonb from submit_candidatura_atomic (candidatura_id + status + etapa_atual) is forwarded in the EF success data; the criterion is never included (audit-only)"
  - "A5 honored: knocked-out candidaturas ALSO fire the nova-candidatura webhook in V1 (RH wants the record); webhook NOT suppressed for status='rejeitado' — documented inline"
  - "Candidate-facing neutral phrasing rendered LOCALLY (D-15 copy + warm closer); shared STATUS_CANDIDATURA_LABELS.rejeitado='Rejeitado' left UNCHANGED (RH-facing) per plan"
  - "feedback render gated on candidatura.status (the typed DB column on CandidaturaRow), not the dashboard's pre-existing candidatura.status_candidatura alias — type-safe and correct"

requirements-completed: [INSCR-04, LGPD-01]

# Metrics
duration: ~20min
completed: 2026-06-08
---

# Phase 8 Plan 05: Inscrição & Knock-out Etapa 1 (candidato status UI) Summary

**Wired the candidate-facing knockout result (D-15 + D-16): FormularioCandidaturaPage branches on the RPC `status` to show the neutral D-15 message inline on a knockout (vs. success + navigate on a survivor), the EF passes `status`/`etapa_atual` through, and `feedback_rejeicao` renders below the rejeitado badge on /perfil + dashboard — the criterion is never exposed. E2E spec promoted from fixme stub to env-gated runnable.**

## Performance
- **Duration:** ~20 min (fully autonomous)
- **Completed:** 2026-06-08
- **Tasks:** 2 (both auto)
- **Files modified:** 6 (3 pages + service wrapper + EF + E2E spec)

## Accomplishments
- **EF passthrough (Task 1):** `submit-candidatura/index.ts` now reads `status` + `etapa_atual` off the RPC return and forwards them in the success `data`. The nova-candidatura webhook is documented as firing for ALL candidaturas including knocked-out ones (A5). Two-client pattern + IDOR cross-check + path check unchanged.
- **Service wrapper:** `submitCandidaturaWithRespostas` return type widened to a new exported `SubmitCandidaturaResult { candidaturaId, status?, etapa_atual? }`; the EF `SubmitCandidaturaResponse.data` interface gained the two fields.
- **Inline D-15 result (Task 1):** `FormularioCandidaturaPage` introduces a `submitResult` state. On `status==='rejeitado'` it renders a calm/muted GlassCard with a Display heading + the exact LOCKED D-15 copy + warm closer + a "Voltar" action — NO success toast, NO auto-navigate. Survivors keep the existing success path. The criterion never appears (`grep opcao_knockout_id` = 0 in the page).
- **feedback_rejeicao display (Task 2):** rendered below the rejeitado badge on `MeuPerfilCandidatoPage` (both the vagas-participando surface and the progresso surface) and on `DashboardCandidatoPage` (below the status in the render loop). All three gate on `status==='rejeitado' && feedback_rejeicao`, muted tone, no red alarm, criterion never shown. The `listCandidaturas` wildcard `select('*, ...)` already includes `feedback_rejeicao`, so no query change was needed.
- **E2E promoted:** `e2e/inscricao-knockout.spec.ts` 2 `test.fixme` live steps converted to env-gated runnable tests (`E2E_REAL_LOGIN` + `E2E_ALLOW_DB_WRITE` + `KNOCKOUT_VAGA_SLUG`); the deterministic no-leak string contract runs unconditionally.

## Task Commits
1. **Task 1: EF passthrough + FormularioCandidaturaPage rejection/survivor branch** — `e659fa5` (feat)
2. **Task 2: feedback_rejeicao display on /perfil + dashboard + promote E2E** — `f2aea70` (feat)

**Plan metadata:** _(final docs commit — this SUMMARY + STATE + ROADMAP + REQUIREMENTS)_

## Files Created/Modified
- `supabase/functions/submit-candidatura/index.ts` — forward `status`/`etapa_atual` in success data (D-16); A5 webhook comment.
- `src/features/vagas/services/candidaturasService.ts` — `SubmitCandidaturaResult` export; wrapper surfaces status/etapa_atual.
- `src/components/pages/FormularioCandidaturaPage.tsx` — `submitResult` state; post-submit status branch; inline D-15 neutral result surface.
- `src/components/pages/MeuPerfilCandidatoPage.tsx` — feedback_rejeicao below rejeitado badge on both surfaces.
- `src/components/pages/DashboardCandidatoPage.tsx` — feedback_rejeicao below rejeitado status in render loop.
- `e2e/inscricao-knockout.spec.ts` — promote fixme → env-gated runnable; live steps skip cleanly without flags.

## Verification Results
- `npm run build` → exit 0 (both tasks).
- `grep -c "Após análise dos requisitos da vaga" FormularioCandidaturaPage.tsx` = 1.
- `grep -c "opcao_knockout_id" FormularioCandidaturaPage.tsx` = 0 (criterion absent).
- `grep -c "feedback_rejeicao" MeuPerfilCandidatoPage.tsx` = 5; `DashboardCandidatoPage.tsx` = 3.
- `npm run test:run -- src/components/pages` → 11/11 pass; full vitest 418/418 (LoadingProgress carryover also green).
- `npm run test:e2e -- e2e/inscricao-knockout.spec.ts --list` → 9 tests parse (3 × 3 projects); chromium run = 1 passed (no-leak contract) + 2 skipped (live, env-gated).

## Threat Surface (from plan threat_model)
- **T-08-13 (HIGH, Info Disclosure / LGPD):** mitigated — every surface renders ONLY `feedback_rejeicao` (the single neutral D-15 copy); `opcao_knockout_id` is never sent to or rendered by the client (grep-asserted absent in FormularioCandidaturaPage; the other two pages render only `feedback_rejeicao`). E2E no-leak contract asserts none of the criterion fragments appear.
- **T-08-14 (Access Control):** unchanged — `listCandidaturas` row scope (own rows via RLS) untouched.
- **T-08-SC:** zero new packages this plan.

## Deviations from Plan
None — plan executed as written. The service wrapper return-type change (new `SubmitCandidaturaResult`) was the natural consequence of the EF passthrough the plan asked for, not a deviation.

## Issues Encountered
- **EF deploy is out-of-scope for this plan's verification.** The `submit-candidatura` Edge Function passthrough is a code change; the plan's verification is build/test-only (no deploy step). The live EF must be re-deployed (`supabase functions deploy submit-candidatura`) before the inline knockout branch exercises against PROD — flag this for phase UAT (mirrors the 04-05 EF-deploy human-action). Until deployed, the live function still returns the old shape (data.status undefined) and the client falls through to the survivor path. The DB-side knockout (auto-reject + feedback_rejeicao persistence from Plan 04) is ALREADY live, so the /perfil + dashboard feedback display works against PROD today.

## User Setup Required
- **Phase UAT:** deploy `submit-candidatura` so the inline D-15 result branch is exercised end-to-end. Run the live E2E steps with `E2E_REAL_LOGIN=1 E2E_ALLOW_DB_WRITE=1 KNOCKOUT_VAGA_SLUG=<slug>` against the SMOKE-1 seeded knockout vaga.

## Self-Check: PASSED
- `src/components/pages/FormularioCandidaturaPage.tsx` — FOUND (grep D-15 message = 1, opcao_knockout_id = 0)
- `src/components/pages/MeuPerfilCandidatoPage.tsx` — FOUND (feedback_rejeicao = 5)
- `src/components/pages/DashboardCandidatoPage.tsx` — FOUND (feedback_rejeicao = 3)
- `supabase/functions/submit-candidatura/index.ts` — FOUND (status passthrough)
- `e2e/inscricao-knockout.spec.ts` — FOUND (9 tests parse)
- Commit `e659fa5` — FOUND in git log
- Commit `f2aea70` — FOUND in git log

## Next Phase Readiness
- Candidate-facing knockout result is wired end-to-end at the code layer: inline D-15 on submit + persisted feedback_rejeicao on /perfil + dashboard, criterion never exposed. Phase 8 plan execution 5/5.
- **EF deploy flag** carried into phase UAT (above).
- **Phase 10 flag (carried from 08-04):** the AI/triagem trigger must filter `status <> 'rejeitado'` so knocked-out candidates are not analysed (T-08-12).

---
*Phase: 08-inscri-o-knock-out-etapa-1*
*Completed: 2026-06-08*
