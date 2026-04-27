# Requirements: Sistema de Recrutamento Beauty Smile

**Defined:** 2026-04-19
**Core Value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar com scores comparaveis.
**Milestone:** M1 — MVP Candidato (Fases 1-5)

## v1 Requirements

Requirements for M1. Each maps to roadmap phases.

### Foundation (Seguranca + Types)

- [x] **FOUND-01**: service_role removido do client-side bundle; operacoes privilegiadas via Edge Functions ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-02**: Auth unificado em 1 store Zustand com campos `user`, `session`, `role`, `profile`, `isLoading` ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-03**: Role lido da tabela `usuarios_rh` (rh) ou `candidatos` (candidato) via Custom Access Token Hook no JWT ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-04**: RoleGuard centralizado redireciona conforme role + destino (substitui ProtectedRoute + ProtectedAdminRoute) ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-05**: Rota protegida sem sessao redireciona para `/auth/login` com `?redirect=` preservado ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-06**: Logout limpa sessao em todas as abas via `onAuthStateChange` ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-07**: `npm run db:types` gera `database.types.ts` automaticamente; `tsc --noEmit` passa ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-08**: Hook pre-commit (husky) roda `tsc --noEmit` antes de cada commit ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-09**: Migrations consolidadas em `supabase/migrations/` numeradas (fonte da verdade) ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-10**: RLS anonymous SELECT em `candidatos` movido para RPC `SECURITY DEFINER` retornando apenas `{ exists: boolean }` ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-11**: Flags manuais de "Lembrar-me" removidas; delegado para `persistSession` nativo do Supabase ✓ Phase 1 (verification backfilled via Phase 4.2 — see 01-VERIFICATION.md)
- [x] **FOUND-12**: `adminAuthStore.ts` deletado; `supabaseAdmin` removido de `client.ts` _(literal close em Phase 4.1 [04.1-04] 2026-04-27 — file deleted + 2 import sites migrated; verification backfill via Phase 4.2)_

### Cadastro (Candidato)

- [x] **CAD-01**: Candidato preenche formulario multi-step de 4 etapas (Dados, Endereco, Disponibilidade, Autorizacoes) ✓ Phase 2
- [x] **CAD-02**: Validacao de CPF (digito verificador + formato) em tempo real ✓ Phase 2
- [x] **CAD-03**: Validacao de duplicata de CPF e email contra base existente (via Edge Function, nao anon SELECT) ✓ Phase 2
- [x] **CAD-04**: Auto-preenchimento de endereco via ViaCEP ✓ Phase 2
- [x] **CAD-05**: Aceite explicito dos termos LGPD (checkbox obrigatorio) ✓ Phase 2
- [x] **CAD-06**: Auto-login apos cadastro bem-sucedido com redirect para `/candidato/perfil` ✓ Phase 2
- [x] **CAD-07**: `cadastroService` usa Edge Function `cadastrar-candidato` (nao `supabaseAdmin`) ✓ Phase 2

### Autenticacao (Candidato)

- [x] **AUTH-01**: Login com email + senha com mensagens claras de erro ✓ Phase 3 Wave 6 (page + service + Vitest unit + 6 promoted Playwright scenarios + UAT B13 NETWORK_ERROR PASS + UAT B14 DevTools redaction PASS)
- [x] **AUTH-02**: Checkbox "Lembrar-me" controla `persistSession` do Supabase ✓ Phase 3 Wave 6 (page + rememberMeStorage adapter + Vitest unit + UAT-1 B6 CHECKED → survives Cmd+Q PASS + UAT-2 B5 UNCHECKED → dies on tab close PASS)
- [x] **AUTH-03**: Recuperacao de senha por email com link valido por 1h ✓ Phase 3 Wave 6 (page + service + copy + B9 E2E unconditional + UAT-3 real-email PASS in same-browser + UAT-6 T-03-09 Dashboard re-audit confirms OTP=3600)
- [x] **AUTH-04**: Redefinicao de senha funcional via deeplink do email ✓ Phase 3 Wave 6 (page + service + 3-state hook + B10-lite E2E unconditional + B12 invalid-link E2E + UAT-3 same-browser PASS) **WITH KNOWN LIMITATION:** PKCE recovery deeplink works only when same-browser/storage as `/esqueci-senha` submission; cross-browser/device click fails silently with "Link inválido" UX (root cause: `code_verifier` lives in originating browser's localStorage). Implementation closed; cross-browser UX deferred to Phase 4 (preferred mitigation: switch to OTP code flow).

### Vagas e Candidatura

- [x] **VAGA-01**: Listagem publica de vagas filtrando por `status = 'ativa'` (nao campo boolean `ativa`) ✓ Phase 4 Wave 4 (server-side + UI + UAT — Wave 0 stub + 04-06 routes + UAT-J05 evidence)
- [x] **VAGA-02**: Pagina de detalhe da vaga (`/vagas/:slug`) com descricao, requisitos, botao "Candidatar-se" ✓ Phase 4 Wave 4 (slug routing live em 04-06 + UAT-J05 evidence — slug-formatado /vagas/teste-coordenador-rh-sede carregou com detalhes da vaga)
- [x] **VAGA-03**: Botao "Candidatar-se" leva ao formulario (se logado) ou ao login (se nao) ✓ Phase 4 Wave 4 (Plan 04-07 LoginCandidatoPage anti-open-redirect guard + UAT-J05 evidence — /auth/login?redirect=... com slug URL-encoded preservado → após login aterrissou em /candidato/candidatura/formulario/teste-coordenador-rh-sede)
- [x] **CAND-01**: Upload de curriculo (PDF, < 5MB) para Supabase Storage bucket `curriculos` ✓ Phase 4 Wave 4 (Plan 04-03 cvUploadService + Plan 04-01 bucket + UAT-J01/J04 evidence — 1 storage object real em curriculos/4fceff36-.../522328dc-....pdf, D-10 path schema, 460207 bytes, owner=auth.uid; bucket privado confirmado via incognito GET → HTTP 404)
- [x] **CAND-02**: Resposta as perguntas de triagem customizadas da vaga (salvas em `respostas_formulario`) ✓ Phase 4 Wave 4 (server + UI + UAT — Plan 04-04 + Plan 04-05 EF + UAT-J02 evidence: 3 respostas_formulario rows persistidas atomicamente via RPC submit_candidatura_atomic com texto curto + ["Imediata"] em resposta_opcoes + numérico 3)
- [x] **CAND-03**: Registro de candidatura vinculando `candidato_id + vaga_id` com `status = 'aguardando_resposta'` e `etapa_atual = 'triagem'` ✓ Phase 4 Wave 4 (server + UI + UAT — Plan 04-05 EF + UAT-J02 evidence: 1 candidaturas row criada com status='aguardando_resposta' + etapa_atual='triagem' + curriculo_url D-10 + curriculo_nome PII redacted client-side, ambos campos confirmados via Studio query)
- [x] **CAND-04**: Prevencao de candidatura duplicada (mesmo candidato + mesma vaga) ✓ Phase 4 Wave 4 (server + UI + UAT — Plan 04-01 UNIQUE partial idx + Plan 04-05 23505 → DUPLICATE_CANDIDATURA mapping + UAT-J03 evidence Caminho A: re-clique em Candidatar-se → toast "voce ja se candidatou" + permanência em /vagas/<slug> + SQL count=1 zero novas linhas)

### Perfil do Candidato

- [ ] **PERF-01**: Listagem de candidaturas do candidato com status + etapa + data (dados reais, sem mock)
- [ ] **PERF-02**: Pagina de perfil `/candidato/perfil` mostrando dados pessoais e candidaturas

### Hardening

- [ ] **HARD-01**: E2E suite completa do candidato passa 100% (login + cadastro + candidatura)
- [ ] **HARD-02**: Lighthouse mobile > 80 em Performance e Accessibility
- [ ] **HARD-03**: ErrorBoundary global plugado no root da aplicacao
- [ ] **HARD-04**: Labels em todos os inputs; tab order correto; focus visivel
- [ ] **HARD-05**: Validacao manual em mobile (iPhone 12 Pro viewport) — logout acessivel
- [ ] **HARD-06**: DevNavigationMenu oculto em producao (gateado por `import.meta.env.DEV`)

## v2 Requirements

Deferred to M2+ (Fases 6-11). Tracked but not in current roadmap.

### RH (Fases 6-8)

- **RH-01**: Login RH usando mesmo authStore unificado (role='rh')
- **RH-02**: Dashboard RH com metricas reais via RPC Postgres
- **RH-03**: CRUD completo de vagas com perguntas customizadas
- **RH-04**: Kanban por vaga com 8 etapas (drag-drop)
- **RH-05**: Transicoes de status com auto-advance de etapa
- **RH-06**: Refactor `candidaturasService.ts` em 4 arquivos especializados

### Testes Psicometricos (Fase 9)

- **TEST-01**: Big Five (IPIP-NEO-120) — filtro eliminatorio
- **TEST-02**: DISC — contexto comportamental (nao eliminatorio)
- **TEST-03**: ICAR-MR11 (Cognitivo) — filtro eliminatorio
- **TEST-04**: Fit Cultural Beauty Smile — filtro eliminatorio
- **TEST-05**: Scores via RPC deterministico no Postgres

### Integracoes e Producao (Fases 10-11)

- **INT-01**: Integracoes n8n (emails, analise, Notion) fire-and-forget
- **PROD-01**: CI GitHub Actions (lint + build em PR, E2E em merge)
- **PROD-02**: Deploy Vercel com envs separadas (preview/prod)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Landing page por vaga (VagaLPPage) | Decisao do usuario; pagina simples `/vagas/:slug` atende |
| Raven Progressive Matrices | SATEPSI-desfavoravel + licenca Pearson inviavel; substituido por ICAR |
| Automacoes n8n no MVP | Dependencia externa fragil; Fase 10 |
| App mobile nativo | SPA responsivo mobile-first atende |
| Multi-tenant | Single-tenant Beauty Smile |
| Sentry no MVP | Vercel Runtime Logs nativos atendem |
| IA generativa para triagem de CV | Custo e risco de vies |
| Edicao de perfil candidato (RF-20) | Should, defer to Fase 5+ se tempo |
| Upload/troca de foto perfil (RF-21) | Could, defer to M2 |
| Exclusao de conta LGPD (RF-22) | Must eventual, manual via email no MVP |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see `01-VERIFICATION.md`. Code complete Phase 1 (2026-04-20); partial per `v1.0-MILESTONE-AUDIT.md` (no `01-VERIFICATION.md`) until 2026-04-27; verification artifact backfilled retroactively under Phase 4.2 with current-codebase evidence chain. |
| FOUND-02 | Phase 1 + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see `01-VERIFICATION.md`. Code complete Phase 1 (2026-04-20); partial per audit until 2026-04-27; Bug 1 extractRole closed in Phase 3 (03-03); verification artifact backfilled retroactively under Phase 4.2 with current-codebase evidence chain. |
| FOUND-03 | Phase 1 + Phase 4.1 (INT-WARNING-3 guard) + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see 01-VERIFICATION.md. Hook emits app_metadata.role; Phase 3 reads JWT via extractRole; INT-WARNING-3 (role=null redirect-loop guard) closed via Phase 4.1 commit 4d9fa25 (RoleGuard fallbackTriedRef); verification artifact backfilled under Phase 4.2. |
| FOUND-04 | Phase 1 + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see `01-VERIFICATION.md`. Code complete Phase 1 (2026-04-20); partial per audit until 2026-04-27; verification artifact backfilled retroactively under Phase 4.2 with current-codebase evidence chain. |
| FOUND-05 | Phase 1 + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see `01-VERIFICATION.md`. Code complete Phase 1 (2026-04-20); partial per audit until 2026-04-27; verification artifact backfilled retroactively under Phase 4.2 with current-codebase evidence chain. |
| FOUND-06 | Phase 1 + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see `01-VERIFICATION.md`. Code complete Phase 1 (2026-04-20); partial per audit until 2026-04-27; verification artifact backfilled retroactively under Phase 4.2 with current-codebase evidence chain. |
| FOUND-07 | Phase 1 + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see `01-VERIFICATION.md`. Code complete Phase 1 (2026-04-20); partial per audit until 2026-04-27; verification artifact backfilled retroactively under Phase 4.2 with current-codebase evidence chain. |
| FOUND-08 | Phase 1 + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see `01-VERIFICATION.md`. Code complete Phase 1 (2026-04-20); partial per audit until 2026-04-27; verification artifact backfilled retroactively under Phase 4.2 with current-codebase evidence chain. |
| FOUND-09 | Phase 1 + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see `01-VERIFICATION.md`. Code complete Phase 1 (2026-04-20); partial per audit until 2026-04-27; verification artifact backfilled retroactively under Phase 4.2 with current-codebase evidence chain. |
| FOUND-10 | Phase 1 + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see `01-VERIFICATION.md`. Code complete Phase 1 (2026-04-20) + 02-02 rate_limit patch + carryover digest fix; partial per audit until 2026-04-27; verification artifact backfilled retroactively under Phase 4.2 with current-codebase evidence chain. |
| FOUND-11 | Phase 1 + Phase 4.2 verification backfill | **Complete (Phase 4.2, 2026-04-27)** — see `01-VERIFICATION.md`. Code complete Phase 1 (2026-04-20); partial per audit until 2026-04-27; verification artifact backfilled retroactively under Phase 4.2 with current-codebase evidence chain. |
| FOUND-12 | Phase 1 (literal close via Phase 4.1 [04.1-04] 2026-04-27 — Path A executed; verification backfill via Phase 4.2) | **Literal close complete** — `src/store/adminAuthStore.ts` deleted (228 LoC, 12 exported symbols of which 10 had zero real consumers); 2 real import sites migrated (App.tsx inline `useIsAdminAuthenticated` selector + useSessionTimeout direct `useAuthStore` import); LoginRHPage doc-comment rewritten. INT-WARNING-2 closed (REQUIREMENTS text matches working tree). FOUND-12 grep guard 2/2 GREEN (commits 0a2ff71 + 8005fd5). **Complete (Phase 4.2, 2026-04-27)** — Verification artifact backfilled under Phase 4.2 (2026-04-27) — see 01-VERIFICATION.md. |
| CAD-01 | Phase 2: Cadastro Candidato | Complete (2026-04-24) |
| CAD-02 | Phase 2: Cadastro Candidato | Complete (2026-04-24) |
| CAD-03 | Phase 2: Cadastro Candidato | Complete (2026-04-24; Bug 6 CPF debounce-time mismatch → Phase 3) |
| CAD-04 | Phase 2: Cadastro Candidato | Complete (2026-04-24) |
| CAD-05 | Phase 2: Cadastro Candidato | Complete (2026-04-24) |
| CAD-06 | Phase 2: Cadastro Candidato | Complete (2026-04-24) |
| CAD-07 | Phase 2: Cadastro Candidato | Complete (2026-04-24) |
| AUTH-01 | Phase 3: Login + Recuperacao | **Complete (03-07, 2026-04-25)**: full coverage at all layers. Page (LoginCandidato/RH rewritten 03-05 consuming authService) + Vitest unit (41 authService tests covering INVALID_CREDENTIALS / EMAIL_NOT_CONFIRMED / RATE_LIMITED / NETWORK_ERROR / SERVER_ERROR / UNKNOWN_ERROR taxonomy + D-19 ORDER-LOCK + bounded polling) + Promoted Playwright (B1 login success unconditional, B2 invalid creds unconditional, B3 email_not_confirmed env-gated, B4 rate_limit env-gated, B8 LoginRH rejects candidato env-gated, B15 Sonner DOM regression unconditional) + UAT-4 (B13 NETWORK_ERROR + Tentar novamente retry PASS) + UAT-5 (B14 DevTools network/console redaction PASS — password isolated to HTTPS body, console uses `hasPassword: true` Boolean sentinel + sanitized error fields). |
| AUTH-02 | Phase 3: Login + Recuperacao | **Complete (03-07, 2026-04-25)**: full coverage. Page ("Lembrar-me" defaultChecked via RHF override 03-05) + rememberMeStorage adapter (03-03 symmetric sb-* wipe + late-binding currentMode) + Vitest unit (T1.2 D-19 ORDER-LOCK regression gate) + UAT-1 (B6 CHECKED → localStorage survives Cmd+Q + relaunch PASS in regular Chrome session) + UAT-2 (B5 UNCHECKED → sessionStorage dies on tab close PASS). Storage routing (localStorage vs sessionStorage) verified at adapter layer + UAT-confirmed under real browser semantics. |
| AUTH-03 | Phase 3: Login + Recuperacao | **Complete (03-07, 2026-04-25)**: full coverage. Page (EsqueciSenhaPage 2-state 03-06 with D-09 anti-enumeration page-layer + service-layer double-coverage) + Vitest unit (passwordService.test.ts D-09 swallow vs surface) + Promoted Playwright (B9 neutral success + non-enumeration assertion `not.toBeVisible()` of submitted email; B12 invalid recovery link → InvalidLinkState; B15 Sonner DOM regression on esqueci-senha) + UAT-3 (B10 real-email deliverability PASS in same-browser; cross-browser PKCE limitation noted as Phase 4 finding) + UAT-6 (T-03-09 Dashboard re-audit confirms OTP=3600 + Redirect URLs unchanged since 03-01). "1 hora" copy verified: 0 matches for `24 hora` across both pages. |
| AUTH-04 | Phase 3: Login + Recuperacao | **Complete (03-07, 2026-04-25) WITH KNOWN LIMITATION**: full implementation coverage. Page (RedefinirSenhaPage 3-state 03-06 via useRecoverySession with D-11 silent Zod + D-12 immediate nav) + service layer (setNewPassword + Pitfall 2 session_expired fallback via tryAutoLogin) + hook (03-04 3-path convergence: PASSWORD_RECOVERY listener + getSession imperative + 2s timeout) + Promoted Playwright (B10-lite UNCONDITIONAL via `addInitScript` localStorage pre-seed exercising `useRecoverySession.status==='valid'`; B12 invalid-link InvalidLinkState; B10 full-deeplink fixme'd per ISSUE-006 — supabase-js URL-hash parsing flaky under headless Chromium with fake JWT) + UAT-3 same-browser PASS. **KNOWN LIMITATION:** PKCE recovery deeplink works only when clicked in the same browser/storage context where `/auth/esqueci-senha` was submitted. Cross-browser/device clicks fail silently with "Link inválido ou expirado" UX even when Supabase `/verify` succeeded (root cause: client-side `exchangeCodeForSession(code)` cannot find `code_verifier` in second browser's isolated localStorage; `/v1/logs/auth-logs` confirmed `grant_type=pkce SUCCESS` followed by client-side decrypt failure). Implementation is closed at all code layers. Cross-browser UX is a product/UX decision deferred to Phase 4; preferred mitigation: switch to OTP code flow (no PKCE — eliminates browser-context dependency). 3 mitigations documented in STATE.md Decisions log [03-07 UAT] + Blockers/Concerns. |
| VAGA-01 | Phase 4: Vagas + Candidatura | **Complete (04-08 Wave 4, 2026-04-26)**: full coverage. Server-side: vagas table com `status` enum + slugify pipeline + UNIQUE slug idx (Plan 04-01 Wave 0). Service layer: vagasService.getVagaBySlug + useVagaBySlug (Plan 04-02 Wave 1a). Routes: /vagas/:identifier + VagasPublicasPage filtrando por status='ativa' (Plan 04-06 Wave 3a). UAT-J05 evidence (2026-04-26): /vagas listagem renderiza apenas vagas ativas, acessível anonimamente. Traceability: `.planning/phases/04-vagas-candidatura/04-08-UAT.md` UAT-J05 + `04-01-SUMMARY.md` (DB schema) + `04-02-SUMMARY.md` (service) + `04-06-SUMMARY.md` (routes). |
| VAGA-02 | Phase 4: Vagas + Candidatura | **Complete (04-08 Wave 4, 2026-04-26)**: full coverage. Server-side: slugify + generate_unique_vaga_slug + vagas_set_slug BEFORE INSERT trigger + UNIQUE idx vagas_slug (Plan 04-01). Service: getVagaBySlug (Plan 04-02). UI: VagaDetalhePage com descrição + requisitos + botão Candidatar-se + 404 state (Plan 04-06). UAT-J05 evidence (2026-04-26): cole slug-formatted URL `/vagas/teste-coordenador-rh-sede` em nova aba → página da vaga carregou com detalhes (sem UUID; formato slug). Traceability: `04-08-UAT.md` UAT-J05 + `04-01-SUMMARY.md` + `04-02-SUMMARY.md` + `04-06-SUMMARY.md`. |
| VAGA-03 | Phase 4: Vagas + Candidatura | **Complete (04-08 Wave 4, 2026-04-26)**: full coverage. Plan 04-07 LoginCandidatoPage anti-open-redirect guard + 11 Vitest cases novos. UAT-J05 evidence (2026-04-26): logout → click Candidatar-se em /vagas/teste-coordenador-rh-sede → redirect para `/auth/login?redirect=...` com slug URL-encoded preservado → login (fernando@beautysmile.com.br) → aterrissou em `/candidato/candidatura/formulario/teste-coordenador-rh-sede` (NÃO em /vagas/... nem /candidato/perfil — consumer do redirect query param funcionando). Traceability: `04-08-UAT.md` UAT-J05 + `04-06-SUMMARY.md` (login redirect builder) + `04-07-SUMMARY.md` (anti-open-redirect guard). |
| CAND-01 | Phase 4: Vagas + Candidatura | **Complete (04-08 Wave 4, 2026-04-26)**: full coverage. Server-side: private curriculos bucket 5MB+pdf + 4 RLS policies; D-10 path schema {auth.uid()}/{uuid}.pdf locked (Plan 04-01). Service: cvUploadService (validateCV + uploadCV + getSignedUrl + removeCV) com 13 Vitest cases + Pitfall 7 console-spy (Plan 04-03 Wave 1a). UI: FormularioCandidaturaPage just-in-time upload (Plan 04-07 D-09). UAT-J01 evidence (2026-04-26): 1 storage object real em `curriculos/4fceff36-8c42-40a5-ad11-48bf0fc6cc81/522328dc-64c2-4d5b-ae64-08301cef9f1a.pdf` (D-10 OK), 460207 bytes, owner=auth.uid. UAT-J04 evidence: bucket privado confirmado — incognito GET path /public/ → HTTP 404 "Bucket not found"; Studio UI confirma Private + 5MB + application/pdf. Traceability: `04-08-UAT.md` UAT-J01/J04 + `04-01-SUMMARY.md` (bucket) + `04-03-SUMMARY.md` (service) + `04-07-SUMMARY.md` (UI integration via Carryover-B/C). |
| CAND-02 | Phase 4: Vagas + Candidatura | **Complete (04-08 Wave 4, 2026-04-26)**: full coverage. Server: PerguntaFormulario type + buildCandidaturaSchema dynamic Zod factory + useVagaPerguntas hook (Plan 04-04 Wave 1b). EF submit-candidatura validates respostas[] via Zod + RPC submit_candidatura_atomic INSERTs em respostas_formulario atomicamente (Plan 04-05 Wave 2). Client wrapper submitCandidaturaWithRespostas (Plan 04-05). UI: FormularioCandidaturaPage com perguntas dinâmicas via PerguntaInput (Plan 04-07; Carryover-C torna curriculo .optional() em D-28). UAT-J02 evidence (2026-04-26): 3 respostas_formulario rows persistidas atomicamente via RPC com texto curto + ["Imediata"] em resposta_opcoes + numérico 3 — todos com candidatura_id correspondente. Traceability: `04-08-UAT.md` UAT-J02 + `04-04-SUMMARY.md` (schema dynamic factory) + `04-05-SUMMARY.md` (EF + RPC) + `04-07-SUMMARY.md` (UI form). |
| CAND-03 | Phase 4: Vagas + Candidatura | **Complete (04-08 Wave 4, 2026-04-26)**: full coverage. Server: submit_candidatura_atomic RPC INSERT candidaturas com status + etapa_atual + curriculo metadata + respostas atomicamente (Plan 04-01 migration 20260425000003). EF orchestration: Zod validate → auth.getUser() → IDOR cross-check → defense-in-depth path validation → RPC → N8N webhook fire-and-forget AFTER COMMIT (Plan 04-05 Wave 2). UI: FormularioCandidaturaPage com submit + redirect /candidato/perfil (Plan 04-07). UAT-J02 evidence (2026-04-26): 1 candidaturas row criada com `status='aguardando_resposta'` ✓ + `etapa_atual='triagem'` ✓ + candidato_id `d8ef9db1-b30d-4121-a7cc-8770402c080a` + vaga_id `53f75c81-a152-43d8-87d3-03a275f678b9` (teste-asb-shopping-riomar) + curriculo_url D-10 OK + curriculo_nome_original PII (DB only, redacted client-side via Pitfall 7) + curriculo_tamanho_bytes=460207 + sequência temporal correta (storage upload às 01:48:43 → DB insert às 01:48:45 — 2s gap). Traceability: `04-08-UAT.md` UAT-J02 + `04-01-SUMMARY.md` (RPC migration) + `04-05-SUMMARY.md` (EF orchestration) + `04-07-SUMMARY.md` (UI submit). |
| CAND-04 | Phase 4: Vagas + Candidatura | **Complete (04-08 Wave 4, 2026-04-26)**: full coverage. Server: UNIQUE partial idx candidaturas_candidato_vaga_unique_idx (candidato_id, vaga_id) WHERE deleted_at IS NULL raises 23505 atomicamente (Plan 04-01 migration 20260425000004). EF maps 23505 → DUPLICATE_CANDIDATURA HTTP 409 com substring fallback `msg.includes('unique') && msg.includes('candidat')` (Plan 04-05). Client wrapper maps EF DUPLICATE_CANDIDATURA → CandidaturasServiceError code DUPLICATE_APPLICATION; T2 Vitest case asserts comportamento. UI: useHasApplied hook gate (Plan 04-07) + toast "voce ja se candidatou a esta vaga" + redirect para /vagas/<slug>. UAT-J03 evidence (2026-04-26 — Caminho A): re-clique em Candidatar-se na vaga ASB → toast "voce ja se candidatou a esta vaga" + permanência em `/vagas/teste-asb-shopping-riomar` (não chegou ao formulário). Confirmação SQL: `SELECT COUNT(*) FROM candidaturas WHERE candidato_id='d8ef9db1-...' AND vaga_id='53f75c81-...' AND deleted_at IS NULL` → **total=1** ✓ (zero novas linhas, UNIQUE partial idx + useHasApplied gate funcionais). Traceability: `04-08-UAT.md` UAT-J03 + `04-01-SUMMARY.md` (UNIQUE idx) + `04-05-SUMMARY.md` (EF mapping) + `04-07-SUMMARY.md` (useHasApplied gate). |
| PERF-01 | Phase 5: Perfil + Hardening | Pending |
| PERF-02 | Phase 5: Perfil + Hardening | Pending |
| HARD-01 | Phase 5: Perfil + Hardening | Pending |
| HARD-02 | Phase 5: Perfil + Hardening | Pending |
| HARD-03 | Phase 5: Perfil + Hardening | Pending |
| HARD-04 | Phase 5: Perfil + Hardening | Pending |
| HARD-05 | Phase 5: Perfil + Hardening | Pending |
| HARD-06 | Phase 5: Perfil + Hardening | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0
- Satisfied: 30/38 (FOUND-01..12 + CAD-01..07 + AUTH-01..04 + VAGA-01..03 + CAND-01..04)
- Partial: 0/38 (Phase 4.2 closed FOUND-01..12 — see 01-VERIFICATION.md)
- Orphaned (Phase 5 not started): 8/38 (PERF-01..02 + HARD-01..06)
- Source: `v1.0-MILESTONE-AUDIT.md` (2026-04-26)

---
*Requirements defined: 2026-04-19*
*Last updated: 2026-04-27 after Phase 4.2 closure (2026-04-27) — 01-VERIFICATION.md backfilled; 01/02/03-VALIDATION.md frontmatter flipped to status: validated; FOUND-01..11 v1 checkboxes flipped to [x]; Traceability table FOUND-01..12 rows rewritten to Complete; Coverage tally Satisfied 18/38 → 30/38 + Partial 12/38 → 0/38. Previous note: 2026-04-27 after Phase 4.1 close (Plan 04.1-05 — UAT 3/3 PASS + 1 SKIPPED + smoke-runtime gate ESTABLISHED). Phase 4.1 closes all 7 audit gap IDs from `v1.0-MILESTONE-AUDIT.md` (INT-BLOCKER-1+2 + INT-WARNING-2+3 + FLOW-CADASTRO+RECOVERY+CANDIDATURA) at code + UAT layers; FOUND-12 literal close confirmed via found12.test.ts 2/2 GREEN + UAT smoke-runtime gate. CAD-06 / AUTH-01 / AUTH-04 / VAGA-03 / CAND-01 / CAND-02 / CAND-03 RE-VALIDATED via UAT scenarios 1+2+3 PASS against fresh-login redirect-after-anon path that Phase 4 UAT did not exercise. 5 side findings F-04.1-A..E captured for Phase 5 visual-polish + UX backlog (none blocking; F-04.1-C cross-references F-04-08-G). Verification-artifact template established at `.planning/phases/04-1-auth-hydration-fix/04.1-VERIFICATION.md` (status:verified) — Phase 4.2 will consume this template to backfill `01-VERIFICATION.md` retroactively. Previous note (2026-04-26): after `/gsd-plan-milestone-gaps` — created Phase 4.1 (Auth Hydration Fix, closes INT-BLOCKER-1+2 + INT-WARNING-2/3 + 3 broken flows) and Phase 4.2 (Phase 1 Verification Backfill, moves 12 FOUND-* from partial → satisfied + flips 01/02/03 VALIDATION.md frontmatter draft → validated). FOUND-01..11 retraceable to Phase 4.2 closure; FOUND-12 retraceable to Phase 4.1 (literal `adminAuthStore.ts` shim resolution) + Phase 4.2 (verification artifact). Phase 5 (PERF-* + HARD-*) remains as originally planned — no remap; orphaned status reflects unstarted phase, not a missing one. Previous note (Phase 4 Wave 4 closure): — Phase 4 plan execution closed (8/8). Todos os 7 requirements VAGA-01..03 + CAND-01..04 agora têm full coverage at server + client + UI + UAT layers (cobertura tripla — DB schema/RPC + Edge Function + service wrapper + form integration + manual UAT 6/6 PASS contra infra real). UAT runbook executado pelo Fernando em 2026-04-26 com evidence chain real-world: candidato_id `d8ef9db1-b30d-4121-a7cc-8770402c080a` + vaga_id `53f75c81-a152-43d8-87d3-03a275f678b9` (teste-asb-shopping-riomar) + 1 candidatura row (status='aguardando_resposta' + etapa_atual='triagem') + 3 respostas_formulario rows persistidas atomicamente via RPC submit_candidatura_atomic + 1 storage object em `curriculos/4fceff36-.../522328dc-....pdf` (D-10 path schema, 460207 bytes, owner=auth.uid) + duplicate guard via useHasApplied (Caminho A — toast + permanência em /vagas/<slug> + SQL count=1) + slug-roundtrip /vagas/<slug> → /auth/login?redirect=... → /candidato/candidatura/formulario/<slug> preserved + Pitfall 7 redaction confirmada. Plan 04-08 incluiu 3 carryover iterations (A→B→C) closing 4 findings F-04-08-A (Tailwind primary-NNN inexistente) + F-04-08-D (bg-primary token quebrado projeto-wide) + F-04-08-E (shell candidato faltando) + F-04-08-F (schema curriculo required vs just-in-time upload). 4 decisões NEW D-25..D-28 (Tailwind theme + bg-primary token + persona shell + schema dynamic factories awareness). 3 deferred findings Phase 5 backlog F-04-08-B/C/G (vaga soft-deleted data hygiene + bloco_valido_check schema drift + WCAG AA visual polish). Phase 4 phase verification gates remaining (orchestrator-owned, separate workflow): code-review + regression + verifier — apenas após esses 3 gates Phase 4 será marcado [x] no top phase list do ROADMAP.*
