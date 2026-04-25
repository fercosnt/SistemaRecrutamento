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

- [ ] **AUTH-01**: Login com email + senha com mensagens claras de erro
- [ ] **AUTH-02**: Checkbox "Lembrar-me" controla `persistSession` do Supabase
- [ ] **AUTH-03**: Recuperacao de senha por email com link valido por 1h
- [ ] **AUTH-04**: Redefinicao de senha funcional via deeplink do email

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
| AUTH-01 | Phase 3: Login + Recuperacao | In progress — Partial (03-04, 2026-04-25): authService.signIn ({email, senha, rememberMe}) → AuthError (D-19 ORDER-LOCK: setRememberMeMode BEFORE signInWithPassword), authService.signOut, authService.resendConfirmation all shipped at @/features/auth/services with full mapSupabaseError integration + Pitfall 7 redaction. tryAutoLogin moved here (canonical Phase 3 source). 41 passing tests in authService.test.ts including ORDER-LOCK regression gate (T1.2). Page rewrite (LoginCandidatoPage + LoginRHPage with role gate, D-14 Bug 2/3) pending Wave 4 (Plan 03-05) |
| AUTH-02 | Phase 3: Login + Recuperacao | In progress — Partial (03-04, 2026-04-25): authService.signIn now calls setRememberMeMode(rememberMe ? 'local' : 'session') BEFORE supabase.auth.signInWithPassword — closes the D-19 storage-swap business-flow gap. Test T1.2 locks the invocation order via mock.invocationCallOrder. Page rewrite (checkbox wired to signIn input) pending Wave 4 (Plan 03-05) |
| AUTH-03 | Phase 3: Login + Recuperacao | In progress — Partial (03-04, 2026-04-25): passwordService.requestPasswordReset(email, isRH?) shipped at @/features/auth/services with D-09 anti-enumeration discipline (swallows ALL errors except RATE_LIMITED; UI shows neutral copy regardless). isRH branches redirectTo to include `?tipo=rh`. 13 passing tests including swallow-vs-surface matrix. EsqueciSenhaPage rewrite + "válido por 1 hora" copy pending Wave 5 (Plan 03-06) |
| AUTH-04 | Phase 3: Login + Recuperacao | In progress — Partial (03-04, 2026-04-25): passwordService.setNewPassword(novaSenha) shipped at @/features/auth/services (wraps supabase.auth.updateUser with full error mapping incl. weak_password / same_password → SERVER_ERROR field=senha). useRecoverySession hook shipped at @/features/auth/hooks — 3-path PASSWORD_RECOVERY state machine (event + getSession + 2s timeout) with cleanup (T-03-07 mitigation). 6 passing tests covering all 3 convergence paths + cancelled-flag late-event no-op. RedefinirSenhaPage rewrite + full deeplink → form → updateUser flow pending Waves 5-6 (Plan 03-06 + 03-07) |
| VAGA-01 | Phase 4: Vagas + Candidatura | Pending |
| VAGA-02 | Phase 4: Vagas + Candidatura | Pending |
| VAGA-03 | Phase 4: Vagas + Candidatura | Pending |
| CAND-01 | Phase 4: Vagas + Candidatura | Pending |
| CAND-02 | Phase 4: Vagas + Candidatura | Pending |
| CAND-03 | Phase 4: Vagas + Candidatura | Pending |
| CAND-04 | Phase 4: Vagas + Candidatura | Pending |
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
*Last updated: 2026-04-25 after Phase 3 Wave 3 (03-04) — all 4 AUTH requirements upgraded with service+hook layer landed (authService signIn/signOut/resend + passwordService requestPasswordReset/setNewPassword + 3 hooks: useRateLimitCooldown, useRecoverySession, useAuthFlowVariant; cadastro compat shim with SignUpError rename). 45 new passing tests across the auth feature. Business flows (4 page rewrites) pending Waves 4-5 (03-05/06)*
