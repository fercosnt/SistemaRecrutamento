# Roadmap: Sistema de Recrutamento Beauty Smile

## Overview

Milestone M1 delivers the MVP Candidato: a secure, mobile-first flow where a candidate can register, log in, browse jobs, apply with CV upload, and track application status. The work starts by eliminating the critical service_role exposure and unifying auth (Phase 1), then layers registration (Phase 2), login/password recovery (Phase 3), job browsing and application (Phase 4), and closes with profile visibility, E2E coverage, and quality hardening (Phase 5). Existing UI, forms, and schemas are reused throughout -- this is a security-first hardening with targeted feature completion.

Branch base: `backup/local-state-2026-04` (Fase 0 complete).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation Saneada** - Unified auth, Edge Functions, types pipeline, RLS hardening ✓ 2026-04-20
- [x] **Phase 2: Cadastro Candidato** - Multi-step registration rewired to Edge Function ✓ 2026-04-24
- [ ] **Phase 3: Login + Recuperacao de Senha** - Candidate authentication and password recovery
- [ ] **Phase 4: Vagas + Candidatura** - Job listing, detail page, CV upload, application flow
- [ ] **Phase 5: Perfil + Hardening MVP** - Candidate profile with real data, E2E 100%, Lighthouse, a11y

## Phase Details

### Phase 1: Foundation Saneada
**Goal**: The application runs on a secure, type-safe foundation where no privileged key reaches the browser, auth is unified under one store with role awareness, routes enforce access control, and the types pipeline catches drift at commit time
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10, FOUND-11, FOUND-12
**Success Criteria** (what must be TRUE):
  1. Visiting the app in a browser and inspecting the JS bundle reveals zero occurrences of the service_role key
  2. A single Zustand auth store holds user, session, role, profile, and isLoading -- no second auth store exists in the codebase
  3. An unauthenticated visitor accessing `/candidato/perfil` is redirected to `/auth/login?redirect=/candidato/perfil`
  4. Running `npm run db:types` regenerates `database.types.ts` from the live schema and `tsc --noEmit` passes with zero errors
  5. Logging out in one browser tab triggers logout in all open tabs
**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md — Remove service_role from client, clean supabaseAdmin, remove Lembrar-me hacks ✓
- [x] 01-02-PLAN.md — Unified auth store with role awareness + adminAuthStore re-export shim ✓
- [x] 01-03-PLAN.md — RoleGuard component + migrate all routes + delete old guards ✓
- [x] 01-04-PLAN.md — Migrations baseline + forward migrations + types pipeline + husky + duplicate check RPC ✓ (awaiting Edge Function deploy — see 01-05-CHECKPOINT.md)
- [x] 01-05-PLAN.md — App.tsx simplification + cadastrar-candidato Edge Function + final verification ✓ (awaiting Edge Function deploy — see 01-05-CHECKPOINT.md)

**Carryover bugs to Phase 3:** `KNOWN-ISSUES-CARRYOVER-PHASE-3.md` documents 2 auth bugs (extractRole reads wrong source; LoginRHPage legacy setters) to be fixed when Phase 3 rewrites login. +1 vagas bug (query uses `ativa` not `status`) to be fixed in Phase 4.

### Phase 2: Cadastro Candidato
**Goal**: A new candidate can complete the multi-step registration form and land on their profile page, with all server-side operations going through Edge Functions instead of client-side service_role
**Depends on**: Phase 1
**Requirements**: CAD-01, CAD-02, CAD-03, CAD-04, CAD-05, CAD-06, CAD-07
**Success Criteria** (what must be TRUE):
  1. A candidate fills all 4 steps (Dados Pessoais, Endereco, Disponibilidade, Autorizacoes LGPD) and submits successfully
  2. Entering a CPF or email already in the database shows a duplicate warning before submission -- and the duplicate check goes through an Edge Function, not a direct anon SELECT on `candidatos`
  3. After successful registration, the candidate is auto-logged in and lands on `/candidato/perfil` without a manual login step
  4. The LGPD consent checkbox is mandatory -- form cannot submit without it
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [x] 02-01-PLAN.md — Wave 0: SDK upgrade + testing-library install + schema audit + test stubs ✓ 2026-04-20
- [x] 02-02-PLAN.md — Wave 1: Migration 0005 (rate_limit table + patched RPC + policy_version column) + db push + types regen ✓ 2026-04-21
- [x] 02-03-PLAN.md — Wave 2: Edge Function contract evolution (error_code/field/message) + _shared/constants.ts + redeploy with --no-verify-jwt ✓ 2026-04-21
- [x] 02-04-PLAN.md — Wave 2: New hooks (useCadastroDraft, useLeaveGuard) + useDuplicateCheck debounce 300ms + client constants ✓ 2026-04-21
- [x] 02-05-PLAN.md — Wave 2: cadastroService error_code routing + tryAutoLogin + FIELD_TO_STEP tables + duplicateCheckService RATE_LIMITED ✓ 2026-04-21
- [x] 02-06-PLAN.md — Wave 3: CadastroMultiStepForm wiring + AutorizacoesStep LGPD layout + font-weight sweep + E2E 6 cases ✓ 2026-04-24 (+3 UAT bug fixes: Sonner split-instance, duplicateCheck `this`-binding, digest schema carryover)

### Phase 3: Login + Recuperacao de Senha
**Goal**: A returning candidate can log in, stay logged in across sessions, and recover a forgotten password via email
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. A candidate logs in with email and password and sees clear error messages for wrong credentials or unregistered email
  2. Checking "Lembrar-me" keeps the session alive after closing and reopening the browser; unchecking it does not
  3. Clicking "Esqueci minha senha" sends an email with a reset link; clicking the link opens the password redefinition page and the new password works immediately
**Plans**: 7 plans
**UI hint**: yes

Plans:
- [x] 03-01-PLAN.md — Wave 0: jwt-decode install + Dashboard audit + test stubs (B1..B16) ✓ 2026-04-24
- [x] 03-02-PLAN.md — Wave 1: AuthError + mapSupabaseError + 4 Zod schemas (passwordSchema shared with cadastro) ✓ 2026-04-25
- [x] 03-03-PLAN.md — Wave 2: extractRole (jwt-decode) + rememberMeStorage adapter + authStore/client.ts wire (Bug 1/D-13 closed) ✓ 2026-04-25
- [x] 03-04-PLAN.md — Wave 3: authService + passwordService + 3 hooks (useRateLimitCooldown, useRecoverySession, useAuthFlowVariant) + cadastro compat shim (SignUpError rename) ✓ 2026-04-25
- [x] 03-05-PLAN.md — Wave 4: LoginCandidatoPage + LoginRHPage rewrite (D-14 Bug 2/3 role gate via bounded polling 5×20ms) ✓ 2026-04-25
- [x] 03-06-PLAN.md — Wave 5: EsqueciSenhaPage 2-state + RedefinirSenhaPage 3-state via useRecoverySession + 5 obsolete services + 3 legacy schemas deleted (1528 LoC purged) + src/schemas/ rmdir ✓ 2026-04-25
- [x] 03-07-PLAN.md — Wave 6: Playwright E2E login-flow + password-recovery-flow promoted (11 scenarios, B1+B2+B15+B3+B4+B8 + B9+B12+B10-lite+B15 + B10-fixme) + Pitfall 7 Vitest grep guard (B14) + UAT runbook 6/6 PASS (B5+B6+B10-real+B13+B14-DevTools+T-03-09) + nyquist_compliant flipped; 2 production-only findings captured (Phase 4 PKCE cross-browser, Phase 5 a11y) ✓ 2026-04-25

### Phase 4: Vagas + Candidatura
**Goal**: A candidate can browse active jobs, view job details, upload a CV, answer screening questions, and submit an application
**Depends on**: Phase 1, Phase 3
**Requirements**: VAGA-01, VAGA-02, VAGA-03, CAND-01, CAND-02, CAND-03, CAND-04
**Success Criteria** (what must be TRUE):
  1. The public jobs page (`/vagas`) lists only jobs with `status = 'ativa'` and is accessible without login
  2. Clicking a job card opens `/vagas/:slug` showing description, requirements, and a "Candidatar-se" button
  3. A logged-in candidate can upload a PDF CV (under 5MB), answer screening questions, and submit -- resulting in a candidatura record with `status = 'aguardando_resposta'` and `etapa_atual = 'triagem'`
  4. Attempting to apply to the same job twice shows a clear message that a candidatura already exists
  5. An unauthenticated visitor clicking "Candidatar-se" is redirected to login and returned to the job after authenticating
**Plans**: 8 plans
**UI hint**: yes

Plans:
- [x] 04-01-PLAN.md — Wave 0: SQL migrations (slug trigger + curriculos bucket + submit_candidatura RPC + UNIQUE constraint) + db push + types regen + Wave 0 stubs (Vitest + Playwright fixtures + Pitfall 7 grep extension) ✓ 2026-04-25 (D-22 db push workaround locked + D-10 path schema locked)
- [ ] 04-02-PLAN.md — Wave 1: isUuid util + vagasService.getVagaBySlug + vagasKeys.detailById/detailBySlug/perguntas split + useVagaBySlug hook
- [ ] 04-03-PLAN.md — Wave 1: cvUploadService (validateCV + uploadCV + getSignedUrl + removeCV) + 13 Vitest cases with Pitfall 7 console-spy
- [ ] 04-04-PLAN.md — Wave 1: PerguntaFormulario type + buildCandidaturaSchema dynamic Zod factory + useVagaPerguntas hook + 17 Vitest cases (D-14 explicit)
- [ ] 04-05-PLAN.md — Wave 2: _shared/schemas.ts patch + submit-candidatura Edge Function (two-client pattern) + candidaturasService.submitCandidaturaWithRespostas + EF deploy with JWT verification ON
- [ ] 04-06-PLAN.md — Wave 3: routes.tsx /vagas/:identifier + /candidato/candidatura/formulario/:vagaSlug + VagaDetalhePage slug routing + 404 state + real schema + delete VagasPage.tsx (D-18)
- [ ] 04-07-PLAN.md — Wave 3: FormularioCandidaturaPage full rewrite (D-04) — single-page RHF + dynamic Zod + cvUpload + Edge Function submit + error_code routing + Pitfall 2/7 compliance
- [ ] 04-08-PLAN.md — Wave 4: Promote vagas-browse + candidatura-submit Playwright (5 + 6 scenarios + Sonner DOM contract) + UAT runbook 6 scenarios + final phase verification battery

### Phase 5: Perfil + Hardening MVP
**Goal**: The candidate can see their real application data on a profile page, and the entire MVP passes E2E tests, Lighthouse thresholds, and accessibility checks
**Depends on**: Phase 4
**Requirements**: PERF-01, PERF-02, HARD-01, HARD-02, HARD-03, HARD-04, HARD-05, HARD-06
**Success Criteria** (what must be TRUE):
  1. `/candidato/perfil` shows the candidate's personal data and a list of their candidaturas with real status, etapa, and date -- no mocked data
  2. The full E2E suite (login, cadastro, candidatura flows) passes at 100% in CI
  3. Lighthouse mobile scores exceed 80 for both Performance and Accessibility
  4. Every form input has a visible label, tab order is logical, and focus indicators are visible
  5. On iPhone 12 Pro viewport, all flows complete successfully and the logout button is reachable
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation Saneada | 5/5 | Complete (Edge Function deploy closed via 02-03) | 2026-04-20 |
| 2. Cadastro Candidato | 6/6 | Complete (Wave 3 wiring + UAT green; 3 UAT-discovered bugs fixed; Playwright 13 passed + 3 env-skipped) | 2026-04-24 |
| 3. Login + Recuperacao de Senha | 7/7 | Plan execution complete — Wave 6 landed (03-07: 11 promoted Playwright scenarios + pitfall7.grep B14 Vitest guard + UAT 6/6 PASS; 2 production-only findings captured for Phase 4 PKCE + Phase 5 a11y); pending phase verification gates (code-review + regression + verifier) before phase marked complete | - |
| 4. Vagas + Candidatura | 1/8 | Wave 0 complete (04-01: 4 migrations + types regen + Wave 0 stubs); D-22 db push workaround pattern locked + D-10 curriculos path schema locked; Wave 1 (04-02 / 04-03 / 04-04) unblocked for parallel execution | - |
| 5. Perfil + Hardening MVP | 0/? | Not started | - |
