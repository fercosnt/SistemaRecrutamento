# Requirements: Sistema de Recrutamento Beauty Smile

**Defined:** 2026-04-19
**Core Value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar com scores comparaveis.
**Milestone:** M1 — MVP Candidato (Fases 1-5)

## v1 Requirements

Requirements for M1. Each maps to roadmap phases.

### Foundation (Seguranca + Types)

- [ ] **FOUND-01**: service_role removido do client-side bundle; operacoes privilegiadas via Edge Functions
- [ ] **FOUND-02**: Auth unificado em 1 store Zustand com campos `user`, `session`, `role`, `profile`, `isLoading`
- [ ] **FOUND-03**: Role lido da tabela `usuarios_rh` (rh) ou `candidatos` (candidato) via Custom Access Token Hook no JWT
- [ ] **FOUND-04**: RoleGuard centralizado redireciona conforme role + destino (substitui ProtectedRoute + ProtectedAdminRoute)
- [ ] **FOUND-05**: Rota protegida sem sessao redireciona para `/auth/login` com `?redirect=` preservado
- [ ] **FOUND-06**: Logout limpa sessao em todas as abas via `onAuthStateChange`
- [ ] **FOUND-07**: `npm run db:types` gera `database.types.ts` automaticamente; `tsc --noEmit` passa
- [ ] **FOUND-08**: Hook pre-commit (husky) roda `tsc --noEmit` antes de cada commit
- [ ] **FOUND-09**: Migrations consolidadas em `supabase/migrations/` numeradas (fonte da verdade)
- [ ] **FOUND-10**: RLS anonymous SELECT em `candidatos` movido para RPC `SECURITY DEFINER` retornando apenas `{ exists: boolean }`
- [ ] **FOUND-11**: Flags manuais de "Lembrar-me" removidas; delegado para `persistSession` nativo do Supabase
- [ ] **FOUND-12**: `adminAuthStore.ts` deletado; `supabaseAdmin` removido de `client.ts`

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

- [ ] **VAGA-01**: Listagem publica de vagas filtrando por `status = 'ativa'` (nao campo boolean `ativa`)
- [ ] **VAGA-02**: Pagina de detalhe da vaga (`/vagas/:slug`) com descricao, requisitos, botao "Candidatar-se"
- [ ] **VAGA-03**: Botao "Candidatar-se" leva ao formulario (se logado) ou ao login (se nao)
- [ ] **CAND-01**: Upload de curriculo (PDF, < 5MB) para Supabase Storage bucket `curriculos`
- [ ] **CAND-02**: Resposta as perguntas de triagem customizadas da vaga (salvas em `respostas_formulario`)
- [ ] **CAND-03**: Registro de candidatura vinculando `candidato_id + vaga_id` com `status = 'aguardando_resposta'` e `etapa_atual = 'triagem'`
- [ ] **CAND-04**: Prevencao de candidatura duplicada (mesmo candidato + mesma vaga)

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
| FOUND-01 | Phase 1: Foundation Saneada | Complete (2026-04-20) |
| FOUND-02 | Phase 1: Foundation Saneada | Complete — partial (Bug 1 extractRole → Phase 3) |
| FOUND-03 | Phase 1: Foundation Saneada | Complete — hook emits, frontend read deferred to Phase 3 |
| FOUND-04 | Phase 1: Foundation Saneada | Complete (2026-04-20) |
| FOUND-05 | Phase 1: Foundation Saneada | Complete (2026-04-20) |
| FOUND-06 | Phase 1: Foundation Saneada | Complete (2026-04-20) |
| FOUND-07 | Phase 1: Foundation Saneada | Complete (2026-04-20) |
| FOUND-08 | Phase 1: Foundation Saneada | Complete (2026-04-20) |
| FOUND-09 | Phase 1: Foundation Saneada | Complete (2026-04-20) |
| FOUND-10 | Phase 1: Foundation Saneada | Complete (2026-04-20; + 02-02 rate_limit patch + 02-02 carryover digest fix) |
| FOUND-11 | Phase 1: Foundation Saneada | Complete (2026-04-20) |
| FOUND-12 | Phase 1: Foundation Saneada | Complete (2026-04-20) |
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
| VAGA-01 | Phase 4: Vagas + Candidatura | Scaffolded (04-01 Wave 0 — DB schema ready: vagas table existing + slugify pipeline + UNIQUE slug idx; needs Wave 1 04-02 service layer + Wave 3 04-06 page wiring) |
| VAGA-02 | Phase 4: Vagas + Candidatura | Scaffolded (04-01 Wave 0 — slugify + generate_unique_vaga_slug + vagas_set_slug BEFORE INSERT trigger + UNIQUE idx vagas_slug live; needs Wave 1 04-02 getVagaBySlug service + Wave 3 04-06 VagaDetalhePage) |
| VAGA-03 | Phase 4: Vagas + Candidatura | Scaffolded (04-01 Wave 0 — UI stubs B-J03 in playwright; needs Wave 3 04-06 routes.tsx + Candidatar-se redirect logic) |
| CAND-01 | Phase 4: Vagas + Candidatura | Scaffolded (04-01 Wave 0 — private curriculos bucket 5MB+pdf + 4 RLS policies live; D-10 path schema {auth.uid()}/{uuid}.pdf locked; cvUploadService stub + 13 it.skip ready; needs Wave 1 04-03 implementation + Wave 3 04-07 form integration) |
| CAND-02 | Phase 4: Vagas + Candidatura | Scaffolded (04-01 Wave 0 — perguntas_formulario table existing + types regen confirmed; useVagaPerguntas + candidaturaFormSchema stubs + 11+4 it.skip ready; needs Wave 1 04-04 dynamic Zod factory + Wave 3 04-07 form integration) |
| CAND-03 | Phase 4: Vagas + Candidatura | Scaffolded (04-01 Wave 0 — submit_candidatura_atomic SECURITY DEFINER RPC live; needs Wave 2 04-05 Edge Function deploy + Wave 3 04-07 form submit integration) |
| CAND-04 | Phase 4: Vagas + Candidatura | Scaffolded (04-01 Wave 0 — UNIQUE partial idx candidaturas_candidato_vaga_unique_idx WHERE deleted_at IS NULL live; server-side defense ready; client-side hint + EF mapping of Postgres 23505 → DUPLICATE_CANDIDATURA pending Wave 2 04-05 + Wave 3 04-07) |
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

---
*Requirements defined: 2026-04-19*
*Last updated: 2026-04-25 after Phase 4 Wave 0 (04-01) — All 7 Phase 4 requirements (VAGA-01-03, CAND-01-04) now SCAFFOLDED at the DB layer (4 migrations live: vagas slug pipeline + curriculos bucket + submit_candidatura_atomic RPC + UNIQUE partial idx for CAND-04) + test harness (4 vitest stubs / 34 it.skip + 2 playwright stubs / 11 fixme + 3 fixtures + pitfall7.grep extension with PHASE_4_VAGAS_PATHS). Full coverage requires Waves 1-3 (Plans 04-02..04-07) + Wave 4 promote+UAT (Plan 04-08). D-22 db push workaround pattern locked (CLAUDE.md updated). D-10 curriculos path schema {auth.uid()}/{uuid}.pdf locked.*
