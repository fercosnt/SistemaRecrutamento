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

- [ ] **AUTH-01**: Login com email + senha com mensagens claras de erro (mostly complete — page + service + tests; E2E pending Wave 6)
- [ ] **AUTH-02**: Checkbox "Lembrar-me" controla `persistSession` do Supabase (mostly complete — page + adapter + tests; E2E pending Wave 6)
- [x] **AUTH-03**: Recuperacao de senha por email com link valido por 1h ✓ Phase 3 Wave 5 (page + service + copy)
- [x] **AUTH-04**: Redefinicao de senha funcional via deeplink do email ✓ Phase 3 Wave 5 (page + service + 3-state hook)

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
| AUTH-01 | Phase 3: Login + Recuperacao | Mostly complete (03-05, 2026-04-25): LoginCandidatoPage + LoginRHPage rewritten consuming authService.signIn / resendConfirmation + useRateLimitCooldown. AuthError.code → toast taxonomy fully wired (INVALID_CREDENTIALS / EMAIL_NOT_CONFIRMED / RATE_LIMITED / NETWORK_ERROR / SERVER_ERROR / UNKNOWN_ERROR + role mismatch on LoginRH). EMAIL_NOT_CONFIRMED amber block + Reenviar CTA. RATE_LIMITED live countdown. NETWORK_ERROR/SERVER_ERROR toast actions ("Tentar novamente"). D-14 Bug 2/3 closed via bounded polling 5×20ms on authStore.role. Pages tsc-clean (467 + 492 LoC). E2E coverage pending Wave 6 (Plan 03-07 login-flow.spec.ts) |
| AUTH-02 | Phase 3: Login + Recuperacao | Mostly complete (03-05, 2026-04-25): "Lembrar-me" checkbox rendered on both login pages with `defaultChecked: true` (D-05) via RHF defaultValues override. UI helper caption "Manter sessão ativa ao fechar o navegador" wired below checkbox (UI-SPEC L271). Checkbox value flows to `signIn({ rememberMe })` which triggers `setRememberMeMode('local' | 'session')` BEFORE `signInWithPassword` (D-19 ORDER-LOCK, test T1.2 regression-locked). Storage swap behavior verified at adapter layer (Plan 03-03 rememberMeStorage symmetric sb-* wipe). E2E rememberMe flag effect on session persistence pending Wave 6 (Plan 03-07) |
| AUTH-03 | Phase 3: Login + Recuperacao | Complete (03-06, 2026-04-25): EsqueciSenhaPage rewritten as 2-state machine (form → submitted) at 320 LoC consuming `requestPasswordReset(email, isRH)` from `@/features/auth/services`. D-09 anti-enumeration LOCKED at the page layer: success copy IDENTICAL whether email exists or not (no `{emailValue}` echo, defensive double-coverage of service-layer swallow). Toast `Se o email existir, o link de recuperação foi enviado.` (info, 4000ms). `useAuthFlowVariant()` threads `?tipo=rh` to "Voltar ao login" CTA. `useRateLimitCooldown()` wired with live amber countdown block on RATE_LIMITED. AUTH-03 "1 hora" copy verified: post-submit callout `O link expira em 1 hora.` (1 match), grep `24 hora` returns 0. Service layer (Plan 03-04) + page layer (Plan 03-06) both green. E2E coverage pending Wave 6 (Plan 03-07 password-recovery-flow.spec.ts). |
| AUTH-04 | Phase 3: Login + Recuperacao | Complete (03-06, 2026-04-25): RedefinirSenhaPage rewritten as 3-state machine (validating | invalid | valid) at 422 LoC gated by `useRecoverySession()`. D-11 silent Zod LOCKED: 0 strength meter, 0 live checklist, 0 `As senhas coincidem` affordance, helper text PASSIVE (`Mínimo 8 caracteres, incluindo maiúscula, minúscula e número.`). D-12 immediate navigate LOCKED: `toast.success(`Senha alterada com sucesso.`) + navigate('/candidato/perfil', { replace: true })` synchronous; 0 setCountdown matches. Pitfall 2 fallback: SERVER_ERROR matching `/sess(ã|a)o|expired|expirad/i` + recovery.status==='valid' → `tryAutoLogin(recovery.email, novaSenha)` → on retry success `/candidato/perfil`, on fail `/auth/login`. AUTH-03 "1 hora" copy verified: InvalidLinkState callout `Links de recuperação expiram em 1 hora por segurança.`, grep `24 hora` returns 0. Service layer (Plan 03-04) + hook layer (Plan 03-04) + page layer (Plan 03-06) all green. E2E coverage pending Wave 6 (Plan 03-07 password-recovery-flow.spec.ts). |
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
*Last updated: 2026-04-25 after Phase 3 Wave 5 (03-06) — AUTH-03 + AUTH-04 closed at the page layer. EsqueciSenhaPage rewritten as 2-state machine with D-09 anti-enumeration; RedefinirSenhaPage rewritten as 3-state machine via useRecoverySession with D-11 silent Zod + D-12 immediate nav. 1528 LoC of obsolete services + legacy schemas removed (`src/schemas/` directory dropped). AUTH-01 + AUTH-02 still mostly-complete pending Wave 6 E2E coverage. Pitfall 7 + Sonner discipline + AUTH-03 "1 hora" copy all enforceable via grep across all 4 auth pages.*
