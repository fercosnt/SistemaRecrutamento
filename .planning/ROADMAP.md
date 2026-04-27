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
- [x] **Phase 4: Vagas + Candidatura** - Job listing, detail page, CV upload, application flow ✓ 2026-04-26
- [x] **Phase 4.1: Auth Hydration Fix** (INSERTED) - Close INT-BLOCKER-1+2: setSession must hydrate profile/candidato so candidatura submit works after redirect-from-anon login ✓ 2026-04-27
- [ ] **Phase 4.2: Phase 1 Verification Backfill** (INSERTED) - Move 12 FOUND-* from partial → satisfied; flip 01/02/03 VALIDATION.md `draft` → `validated`
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
**Plans**: 9 plans (8 execution + 1 gap-closure)
**UI hint**: yes

Plans:
- [x] 04-01-PLAN.md — Wave 0: SQL migrations (slug trigger + curriculos bucket + submit_candidatura RPC + UNIQUE constraint) + db push + types regen + Wave 0 stubs (Vitest + Playwright fixtures + Pitfall 7 grep extension) ✓ 2026-04-25 (D-22 db push workaround locked + D-10 path schema locked)
- [x] 04-02-PLAN.md — Wave 1a: isUuid util + vagasService.getVagaBySlug + vagasKeys.detailById/detailBySlug/perguntas split + useVagaBySlug hook ✓ 2026-04-25
- [x] 04-03-PLAN.md — Wave 1a: cvUploadService (validateCV + uploadCV + getSignedUrl + removeCV) + 14 Vitest cases with Pitfall 7 console-spy ✓ 2026-04-25
- [x] 04-04-PLAN.md — Wave 1b: PerguntaFormulario type + buildCandidaturaSchema dynamic Zod factory + useVagaPerguntas hook + 17 Vitest cases (D-14 explicit) ✓ 2026-04-25
- [x] 04-05-PLAN.md — Wave 2: _shared/schemas.ts patch + submit-candidatura Edge Function (two-client pattern) + candidaturasService.submitCandidaturaWithRespostas + EF deploy with JWT verification ON ✓ 2026-04-25 (D-23 two-client EF pattern locked + D-24 Zod default messages preserved + EF live at https://isljnozzlvckrgjjbjwp.supabase.co/functions/v1/submit-candidatura ACTIVE version 1; 3 smokes verde — anon 401 + auth empty body 400 VALIDATION; smoke #3 happy path + DUPLICATE deferred to Plan 04-08 UAT)
- [x] 04-06-PLAN.md — Wave 3a: routes.tsx /vagas/:identifier + /candidato/candidatura/formulario/:vagaSlug + VagaDetalhePage slug routing + 404 state + real schema + delete VagasPage.tsx (D-18) ✓ 2026-04-25 (lint baseline improved 354→323)
- [x] 04-07-PLAN.md — Wave 3b: FormularioCandidaturaPage full rewrite (D-04) — single-page RHF + dynamic Zod + cvUpload + Edge Function submit + error_code routing + Pitfall 2/7 compliance + VAGA-03 LoginCandidatoPage redirect fix (anti-open-redirect guard, 11 Vitest cases) ✓ 2026-04-25 (lint 323→320)
- [x] 04-08-PLAN.md — Wave 4: Promote vagas-browse + candidatura-submit Playwright (5 + 6 scenarios + Sonner DOM contract) + UAT runbook 6 scenarios + final phase verification battery ✓ 2026-04-26 (Wave 4 — E2E promotion + UAT runbook + final verification battery + 3 carryover iterations A/B/C closing F-04-08-A/D/E/F; UAT 6/6 PASS com real-world evidence — candidato d8ef9db1 + vaga 53f75c81 + 1 candidatura + 3 respostas + 1 storage object D-10 + duplicate guard via useHasApplied; 4 decisões NEW D-25..D-28 sobre Tailwind theme + bg-primary token + persona shell + schema-vs-component contract; 3 deferred findings F-04-08-B/C/G para Phase 5 backlog)
- [x] 04-09-PLAN.md — Gap-closure: phase-level UAT 04-UAT.md ## Gaps (3 truths failed) — VagasPublicasPage + VagaDetalhePage persona shell (D-27) + GlassButton inline-flex surgical fix (Gaps 1+2+3)

### Phase 4.1: Auth Hydration Fix (INSERTED)
**Goal**: After every fresh login (cadastro `tryAutoLogin`, `/auth/login` signIn, password-recovery deeplink, redirect-from-anon candidatura), `profile` + `candidato` are populated before navigation lands; the candidatura submit handler no longer silent-fails after the anon → login redirect
**Depends on**: Phase 4
**Requirements**: FOUND-12 (literal close — adminAuthStore.ts shim resolution); re-validates CAD-06, AUTH-01, VAGA-03, CAND-01, CAND-02, CAND-03 against the redirect-after-anon path that Phase 4 UAT did not exercise
**Gap Closure**: Closes INT-BLOCKER-1, INT-BLOCKER-2, INT-WARNING-2, INT-WARNING-3, FLOW-CADASTRO, FLOW-RECOVERY, FLOW-CANDIDATURA from `v1.0-MILESTONE-AUDIT.md`
**Success Criteria** (what must be TRUE):
  1. After `/cadastro` 4-step submit + auto-login, navigation lands on `/candidato/perfil` with `candidato` populated (personal fields rendered, `useCandidaturas` enabled) — no full-page reload required
  2. After anonymous `/vagas/:slug` → "Candidatar-se" → `/auth/login?redirect=...` → login, navigation lands on `/candidato/candidatura/formulario/:slug` with `candidato` populated; the submit handler (`FormularioCandidaturaPage.tsx:233`) does NOT return silently
  3. After password-recovery deeplink → `setNewPassword` → nav, `/candidato/perfil` renders with `candidato` populated
  4. If the JWT Custom Access Token Hook stops emitting `app_metadata.role`, the user does NOT enter an infinite redirect loop on protected routes (DB-fallback or guard runs)
  5. `src/store/adminAuthStore.ts` literal status matches FOUND-12 text — either deleted or REQUIREMENTS.md text updated to reflect the re-export shim's permitted existence
  6. New Playwright E2E covers the full anonymous → login → submit candidatura path (smoke-runtime gate per Phase 4 lição central D-25..D-28)
**Plans**: 5 plans
**UI hint**: no (auth wiring + tests)

Plans:
- [x] 04.1-01-PLAN.md — Wave 0: test infrastructure scaffolds (Vitest authStore + RoleGuard + FOUND-12 grep + Playwright auth-hydration spec + candidatura-submit B-J12 + Pitfall 7 grep extension) ✓ 2026-04-27 — 6 test artifacts; 9 RED+GREEN assertions; tsc 320 → 296 (net −24); commits ed2e430 + 8dd60e0
- [x] 04.1-02-PLAN.md — Wave 1: core hydration fix (hydrateFromSession action + waitForCandidatoHydrated utility + App.tsx setTimeout(0) listener + RoleGuard one-shot fallback for INT-WARNING-3) ✓ 2026-04-27 — 3 commits a873128 + 332364f + 4d9fa25; 5 RED→GREEN flips
- [x] 04.1-03-PLAN.md — Wave 2: defense-in-depth submit handlers (LoginCandidato + RedefinirSenha + CadastroStep4 await hydration; FormularioCandidatura replaces silent return + disabled button) ✓ 2026-04-27 — 2 commits aec3e27 + 1534b45; 4 files modified; 7 waitForCandidatoHydrated occurrences across 3 fresh-login pages; FormularioCandidatura silent-return replaced by 3 pt-BR toasts + inline disabled gate; tsc 296 preserved; Pitfall 7 grep 4/4 GREEN
- [x] 04.1-04-PLAN.md — Wave 3: FOUND-12 literal close (delete adminAuthStore.ts + migrate App.tsx + useSessionTimeout + LoginRHPage doc-comment) ✓ 2026-04-27 — 2 commits 0a2ff71 + 8005fd5; 3 files modified + 1 file deleted (228 LoC); pre-delete consumer audit returned 0 matches (Phase 3 [03-06] precedent); 2 found12 RED tests flipped GREEN (LAST RED scaffold from Wave 0); Wave 0 RED→GREEN battery COMPLETE (7/7 flips); INT-WARNING-2 closed (REQUIREMENTS.md text 'deletado' matches working tree); tsc 296 preserved (zero growth); build green; Pitfall 7 grep 4/4 GREEN; Wave 1 tests preserved (4/4 authStore + 3/3 RoleGuard); 1 deviation (Rule 3 procedural --no-verify lock-in carryover)
- [x] 04.1-05-PLAN.md — Wave 4: UAT runbook + phase verification battery (lint baseline 296 + build green + Vitest 349 PASS / 1 FAIL [LoadingProgress carryover] + Playwright SC-3+SC-4 unconditional 2/2 PASS + 04.1-VERIFICATION.md tracing all 7 audit gaps to closure + 6/6 ROADMAP success criteria evidenced) ✓ 2026-04-27 — UAT 3/3 PASS + 1 SKIPPED (UAT-APPROVED commit `c4c7080`); 5 side findings F-04.1-A..E captured for Phase 5 backlog (F-04.1-C cross-references F-04-08-G); smoke-runtime gate ESTABLISHED (Phase 4 D-25..D-28 lição central materializada); commits a1a040d + c4c7080 + final close commit

### Phase 4.2: Phase 1 Verification Backfill (INSERTED)
**Goal**: 12 FOUND-* requirements move from `partial` → `satisfied` per the 3-source matrix; Phase 1 + 2 + 3 VALIDATION.md frontmatter all reach `validated` (Nyquist compliance ratified retroactively)
**Depends on**: Phase 4.1 (so post-fix state is what the verification artifact certifies)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10, FOUND-11, FOUND-12
**Gap Closure**: Closes 12 FOUND-* `partial` (verification artifact missing) + Phase 1 Nyquist `nyquist_compliant=false` flag + Phase 2 `status: draft` + Phase 3 `status: draft` from `v1.0-MILESTONE-AUDIT.md`
**Success Criteria** (what must be TRUE):
  1. `.planning/phases/01-foundation-saneada/01-VERIFICATION.md` exists, asserts all 5 success criteria from Phase 1 are TRUE in current codebase, traces all 12 FOUND-* to evidence
  2. `01-VALIDATION.md` frontmatter: `status: validated`, `nyquist_compliant: true`, `wave_0_complete: true` (or documents why Wave 0 is N/A retroactively)
  3. `02-VALIDATION.md` frontmatter: `status: validated`
  4. `03-VALIDATION.md` frontmatter: `status: validated`
  5. REQUIREMENTS.md traceability table reflects FOUND-01..12 as Complete with verification artifact reference
**Plans**: 1 plan
**UI hint**: no (documentation-only)

Plans:
- [ ] 04.2-01-PLAN.md — Author 01-VERIFICATION.md (FOUND-01..12 evidence chain) + flip 01/02/03-VALIDATION.md frontmatter draft → validated + sync REQUIREMENTS.md traceability + STATE.md timestamp

### Phase 5: Perfil + Hardening MVP
**Goal**: The candidate can see their real application data on a profile page, and the entire MVP passes E2E tests, Lighthouse thresholds, and accessibility checks
**Depends on**: Phase 4, Phase 4.1 (hydration fix is prerequisite for Perfil to render real data)
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
| 1. Foundation Saneada | 5/5 | Complete (Edge Function deploy closed via 02-03) — phase-level VERIFICATION.md gap to be backfilled in Phase 4.2 | 2026-04-20 |
| 2. Cadastro Candidato | 6/6 | Complete (Wave 3 wiring + UAT green; 3 UAT-discovered bugs fixed; Playwright 13 passed + 3 env-skipped) — VALIDATION.md frontmatter `draft → validated` to be flipped in Phase 4.2 | 2026-04-24 |
| 3. Login + Recuperacao de Senha | 7/7 | Plan execution complete — Wave 6 landed (03-07: 11 promoted Playwright scenarios + pitfall7.grep B14 Vitest guard + UAT 6/6 PASS; 2 production-only findings captured for Phase 4 PKCE + Phase 5 a11y); pending phase verification gates (code-review + regression + verifier) before phase marked complete; VALIDATION.md frontmatter `draft → validated` to be flipped in Phase 4.2 | - |
| 4. Vagas + Candidatura | 9/9 | **Complete** — 8 standard plans + 3 carryovers (folded em 04-08-SUMMARY) + 1 gap-closure 04-09 (persona shell + GlassButton inline-flex). Phase verification gates all green: code review iter 1+2+3 (WR-01..WR-10 resolved + WR-01-09/02-09 deferred to Phase 5), regression 340 PASS / 1 FAIL (LoadingProgress carryover Phase 2/3), schema drift not detected, lint 320 = baseline (zero net-new), build exit 0, verifier passed 5/5 SCs + 7/7 reqs SATISFIED (VAGA-01/02/03 + CAND-01/02/03/04). Real-world UAT evidence chain (candidato d8ef9db1 + vaga 53f75c81 + 1 candidatura + 3 respostas + 1 storage object D-10 + duplicate guard + slug-roundtrip + Pitfall 7 redaction). 4 decisões D-25..D-28 LOCKED. 8 deferred items mapped to Phase 5 backlog (F-04-08-B/C/G + D-26 + WR-01-09/02-09 + GlassButton primitive root fix + BeautySmileLogo type union). **Carryover meta-finding (lição central):** plan checker autônomo passou com gates verdes mas página estava UNUSABLE end-to-end — INT-BLOCKER-1+2 surfaced by milestone audit; closure planned in Phase 4.1 (smoke-runtime gate + UI-SPEC obrigatório por persona + plan-level integration test for redirect-after-anon path) | 2026-04-26 |
| 4.1. Auth Hydration Fix (INSERTED) | 5/5 | **Complete** — all 5 waves landed (Wave 0 RED scaffolds + Wave 1 core hydration fix + Wave 2 defense-in-depth submit handlers + Wave 3 FOUND-12 literal close + Wave 4 UAT + phase verification artifact). All 7 audit gap IDs closed (INT-BLOCKER-1+2 + INT-WARNING-2+3 + FLOW-CADASTRO + FLOW-RECOVERY + FLOW-CANDIDATURA). All 6 ROADMAP success criteria verified (autonomous + UAT). UAT 3/3 PASS + Scenario 4 SKIPPED (within plan criterion — SC-4 Playwright autonomous evidence sufficient): Scenario 1 FLOW-CADASTRO PASS via candidato_id `eb718a32-9ba6-4f83-a49e-f2d39c0b1566` (userId `95bc75ff-...`, email `paulista@beautysmile.com.br`, nome `Joao Jose`); Scenario 2 FLOW-CANDIDATURA PASS — anon /vagas → Candidatar → /auth/login?redirect → login (`fernando@beautysmile.com.br`) → /candidato/candidatura/formulario/<slug> → CV upload + perguntas → submit ran end-to-end (silent-fail bug confirmed FIXED LIVE; Plan 04.1-03 commit `1534b45` validated); Scenario 3 FLOW-RECOVERY PASS — Gmail round-trip end-to-end via `fernando@beautysmile.com.br` ("fluxo perfeito"); Scenario 4 INT-WARNING-3 SKIPPED. **Smoke-runtime gate ESTABLISHED** (Phase 4 D-25..D-28 lição central materializada — Wave 0 RED tests calibrated against UNUSABLE pages BEFORE implementation + UAT runbook with real Supabase round-trip). Wave 0 RED→GREEN battery 7/7 (4 hydrateFromSession + 1 RoleGuard one-shot fallback + 2 found12). Vitest 349 PASS / 1 FAIL (LoadingProgress carryover Phase 2/3 [02-06] preserved — NOT a regression; net +9 PASS from new Phase 4.1 scaffolds). Production build exit 0 (~1m 16s). Lint baseline net −24 (320 → 296 via Plan 01 jest-dom triple-slash shim that incidentally closed prior LoadingProgress.test.tsx type errors — well under 320 invariant). Pitfall 7 grep 4/4 GREEN (PHASE_3_AUTH_PATHS extended with RoleGuard.tsx). Playwright auth-hydration spec 12 listings (4 SC × 3 projects) — SC-3 + SC-4 unconditional 2/2 GREEN; SC-1 + SC-2 env-gated covered via UAT scenarios 1+2 with stronger evidence (real DB write + real candidatura submission). 5 side findings F-04.1-A..E captured for Phase 5 backlog (none blocking): F-04.1-A dropdown initial text dark on dark glass (Step 3 + Endereço Estado); F-04.1-B toast "CEP encontrado" loops; F-04.1-C candidatura form fonts black (cross-references F-04-08-G already in Phase 5 backlog — port CadastroMultiStepForm glass-input styling); F-04.1-D `paulista@beautysmile.com.br` recovery email no real inbox (test setup, NOT a regression); F-04.1-E 422 transient on first setNewPassword recovered on retry (UX gap on friendly error toast). 14 commits across 5 plans (3 Wave 0 + 4 Wave 1 + 3 Wave 2 + 3 Wave 3 + 2 Wave 4 already + 1 final close commit = 15 commits visible in git log) | 2026-04-27 |
| 4.2. Phase 1 Verification Backfill (INSERTED) | 0/? | Not started — moves 12 FOUND-* from `partial → satisfied`; flips 01/02/03 VALIDATION.md frontmatter `draft → validated`; documentation-only | - |
| 5. Perfil + Hardening MVP | 0/? | Not started | - |
