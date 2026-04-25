# Sistema de Recrutamento Beauty Smile

## What This Is

ATS (Applicant Tracking System) web para a Beauty Smile, rede de clinicas odontologicas com tecnologia laser Fotona. Duas personas: Candidato (publico, mobile-first) e RH/Admin (interno, desktop-first). O candidato se cadastra, se candidata a vagas, faz avaliacoes comportamentais/cognitivas e acompanha seu status. O RH gerencia vagas, faz triagem via kanban de 8 etapas, compara scores e toma decisoes de aprovacao/rejeicao com revisao humana obrigatoria.

Brownfield rebuild: sistema iniciado em out/2025 via Figma Make, desenvolvido em modo firefighting ate nov/2025. Reaproveitando ~70% UI/forms/schemas, reconstruindo ~20% fundacao (auth, client, types, RLS, guards), deletando ~10% (duplicatas, artefatos).

## Core Value

Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar, avaliar e decidir sobre candidatos num unico sistema rastreavel com scores comparaveis.

## Requirements

### Validated

<!-- Existente e funcional no codebase atual (pre-rebuild ou validated em fases concluidas) -->

- ✓ **Login + Recuperação de senha end-to-end** — Phase 3 completa: AuthError taxonomy + mapSupabaseError + 4 Zod schemas + extractRole (jwt-decode, fecha Bug 1/D-13) + rememberMeStorage adapter (D-19) + authService (signIn order-lock setRememberMeMode antes de signInWithPassword) + passwordService (D-09 anti-enum) + 3 hooks (useRateLimitCooldown in-memory T-03-06, useRecoverySession 3-path state machine, useAuthFlowVariant) + 4 page rewrites (LoginCandidato/LoginRH com bounded polling 5×20ms fechando Bug 2-3/D-14, EsqueciSenha 2-state, RedefinirSenha 3-state) + cadastro compat shim Option A. Validated 2026-04-25 via Playwright 11 cenários + Vitest 96/96 auth + UAT 6/6 PASS + verifier passed 3/3 success criteria. Requirements: AUTH-01, AUTH-02, AUTH-03 ✓ + AUTH-04 ✓ (com limitação documentada PKCE cross-browser deferida a Phase 4 — OTP code flow é a mitigação preferida)
- ✓ **Cadastro candidato end-to-end em produção** — Phase 2 completa: 4-step form + draft persistence (sans senha via sessionStorage) + LGPD mandatory guard + structured error_code routing + auto-login + redirect `/candidato/perfil`. Validated 2026-04-24 via Chrome UAT + Playwright 13/13 passing. Requirements: CAD-01, CAD-02, CAD-03, CAD-04, CAD-05, CAD-06, CAD-07 ✓
- ✓ **Foundation saneada** — Phase 1 completa: service_role removido do bundle, auth unificado, RoleGuard, Custom Access Token Hook, types pipeline, migrations. Requirements: FOUND-01..FOUND-12 ✓ (Bug 1/D-13 + Bug 2-3/D-14 fechados em Phase 3; Bug 6/D-15 RPC CPF carryover ainda diferido a Phase 4)
- ✓ Multi-step form de cadastro (4 steps: Dados, Endereco, Disponibilidade, Autorizacoes LGPD) — existing (`CadastroMultiStepForm`), now end-to-end wired by Phase 2
- ✓ Validacao CPF (digito verificador + formato) com 35 testes — existing (`cpfValidator.ts`)
- ✓ Duplicate check de CPF/email com debounce + abort — existing (`useDuplicateCheck`)
- ✓ Auto-preenchimento de endereco via ViaCEP — existing (`useViaCEP`)
- ✓ Design system Beauty Smile (Tailwind + shadcn/ui + 29 Radix primitives + glass UI) — existing
- ✓ TanStack Query hooks para vagas e candidaturas (query keys hierarquicas) — existing
- ✓ Schemas Zod por step + agregado — existing
- ✓ Layouts RH (Sidebar + TopBar + main) — existing
- ✓ Paginas visuais de todas as areas (34 paginas) — existing (migrar para features/)
- ✓ Playwright config + estrutura E2E (4 specs) — existing
- ✓ CRUD vagas RH (apos round de fix) — existing
- ✓ Dashboard RH com metricas 100% DB (apos correcao) — existing
- ✓ RLS: 103 policies em 34 tabelas — existing

### Active

<!-- Milestone M1: Fases 1-5 (MVP Candidato) -->

- [x] Auth unificado: 1 store com campo `role` (candidato | rh | admin), sem service_role no client ✓ Phase 1
- [x] RoleGuard centralizado validando session + role do banco ✓ Phase 1
- [x] Pipeline de types automatizado (`npm run db:types` + hook pre-commit) ✓ Phase 1
- [x] Migrations consolidadas em `supabase/migrations/` numeradas ✓ Phase 1
- [x] Login candidato estavel com "Lembrar-me" via storage adapter D-19 (localStorage/sessionStorage swap) ✓ Phase 3
- [x] Recuperacao de senha funcional (email + link + redefinicao) ✓ Phase 3 (limitação cross-browser PKCE deferida a Phase 4)
- [x] Rotas protegidas que REALMENTE redirecionam sem sessao ✓ Phase 1
- [x] Cadastro candidato end-to-end sobre fundacao nova (sem service_role) ✓ Phase 2
- [ ] Listagem publica de vagas ativas (`status = 'ativa'`, nao campo boolean `ativa`)
- [ ] Pagina de detalhe da vaga simples (`/vagas/:slug`)
- [ ] Candidatura com upload de curriculo para Supabase Storage
- [ ] Formulario de candidatura com perguntas de triagem (tabela `respostas_formulario`)
- [ ] Perfil do candidato com candidaturas reais (sem mock)
- [ ] E2E suite completa do candidato passando 100%
- [ ] Lighthouse mobile > 80 (Performance + Accessibility)

### Out of Scope

- Landing page dedicada por vaga (VagaLPPage) — removida do escopo por decisao do usuario; pagina simples `/vagas/:slug` atende
- Raven Progressive Matrices — SATEPSI-desfavoravel desde 2023 + licenca Pearson inviavel; substituido por ICAR
- Automacoes n8n no MVP (Fases 0-8) — dependencia externa fragil; Fase 10
- App mobile nativo — SPA responsivo mobile-first atende
- Multi-tenant — single-tenant Beauty Smile, sem `tenant_id`
- Sentry no MVP — Vercel Runtime Logs nativos atendem; Sentry so em V3+ se volume justificar
- Psicologo consultor externo — equipe interna + IA; linguagem "avaliacao comportamental" (nao "teste psicologico")
- IA generativa para triagem automatica de CV — custo e risco de vies
- Chatbot com candidato — WhatsApp manual atende

## Context

**Estado atual (pos-Phase 3):**
- Phase 1 completa (fundacao saneada): service_role removido do bundle, auth unificado, RoleGuard, Custom Access Token Hook, migrations consolidadas
- Phase 2 completa (cadastro candidato end-to-end em produção): UAT green 2026-04-24 incluindo draft persistence, LGPD mandatory guard, auto-login, redirect `/candidato/perfil`
- Phase 3 completa (login + recuperação de senha end-to-end): UAT 6/6 PASS 2026-04-25, verifier passed 3/3, code review advisory 0 critical/5 warning/6 info; Bug 1 (D-13) e Bug 2-3 (D-14) estruturalmente fechados; AUTH-04 com limitação documentada PKCE cross-browser deferida a Phase 4 (OTP code flow preferido); 1528 LoC dead code purged; 5 advisory warnings classificados como Phase 4 hardening
- Phase 4 (Vagas + Candidatura) pronta para planejar — herda Bug 6/D-15 RPC `check_candidato_duplicate` CPF mismatch + 1 carryover Phase 1 (`useVagas` query usa `ativa` em vez de `status`) + WR-01..WR-05 advisory hardening do Phase 3 review + PKCE OTP-flow migration + Phase 5 a11y backlog (change-password widget bare inputs)
- DevNavigationMenu gateado por `import.meta.env.DEV`

**Estado historico (pre-Phase 1):**
- 43 arquivos WIP commitados em `backup/local-state-2026-04`
- Arquivos orfaos deletados (`.tmp`, `.backup`, shell scripts)
- 9/21 E2E de login falhando (rotas protegidas nao redirecionam, logout nao funciona) — resolved pela Phase 1
- service_role exposto no client-side bundle — resolved pela Phase 1 (FOUND-01)

**Documentacao existente:**
- PRD-Mestre: `docs/prds/PRD-MASTER-sistema-recrutamento.md` (1187 linhas, v1.2)
- Plano faseado aprovado: `~/.claude/plans/cached-painting-stearns.md` (12 fases)
- Analise brownfield: `.planning/codebase/` (7 docs, 2753 linhas)
- 5 mini-PRDs dos testes psicometricos em `docs/prds/`
- Banco de 25 itens Fit Cultural ja gerado

**Supabase:** Pro ja contratado. Edge Functions (Deno) para operacoes privilegiadas.
**Vercel:** Pro ja contratado. Frontend hosting + preview URLs.

## Constraints

- **Branch base**: `backup/local-state-2026-04` (main desatualizado 5 meses, so tem export Figma Make inicial)
- **Seguranca**: service_role NUNCA no client; RLS em 100% das tabelas; LGPD compliance
- **Stack**: React 18 + Vite + TypeScript strict + Supabase + shadcn/ui + TanStack Query + Zustand + RHF + Zod
- **Pipeline**: `database.types.ts` gerado automaticamente; `tsc --noEmit` passa sempre
- **Idioma**: dominio em pt-BR (tabelas, enums, mensagens), codigo tecnico em en
- **Legal**: linguagem de produto usa "avaliacao comportamental/cognitiva" (nunca "teste psicologico") — RNF-12a
- **Decisao humana**: sistema NUNCA rejeita candidato automaticamente por score (RNF-07a)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Auth unificado em 1 store com `role` | 2 stores paralelos causavam bypass de rotas protegidas (E2E provou) | ✓ Shipped (Phase 1) |
| service_role → Edge Functions | service_role exposto no browser e risco critico de seguranca | ✓ Shipped (Phase 1 + 2) |
| Structured Edge Function error contract `{ ok, error_code, message, field? }` | Forms precisam rotear erros de servidor para o campo correto + step correto | ✓ Shipped (Phase 2) |
| Sonner single-instance via Vite `resolve.dedupe` | Aliases versionados em vite.config.ts criam pre-bundles separados; module-level singletons (ToastState) silenciosamente quebram | ✓ Shipped (Phase 2 UAT fix) |
| Schema-qualify extensions under hardened `SET search_path = ''` RPCs | Hosted Supabase instala pgcrypto em `extensions`, não `public` — local CLI não reproduz o bug | ✓ Shipped (Phase 2 UAT carryover fix) |
| extractRole decodifica JWT payload (não SDK-populated user record) | Bug 1/D-13: SDK `session.user.app_metadata` não inclui custom claims do JWT hook; só o token decodificado tem `role` | ✓ Shipped (Phase 3) |
| LoginRH bounded polling 5×20ms (≤100ms) sobre `useAuthStore.getState().role` | Bug 2-3/D-14: `setTimeout(0)` é macrotask race sob React 18 Concurrent Mode; bounded polling com early-exit é determinístico | ✓ Shipped (Phase 3) |
| `setRememberMeMode` ANTES de `signInWithPassword` (order-lock) | SDK escreve a sessão no storage corrente; flipping o mode flag depois deixa a sessão no store errado | ✓ Shipped (Phase 3) |
| `passwordService.requestPasswordReset` engole tudo exceto RATE_LIMITED | D-09 anti-enumeration: revelar "email não existe" permite enumeração de contas; RATE_LIMITED é a única classe que precisa surfacing (cooldown UI) | ✓ Shipped (Phase 3) |
| `extractRetryAfterSeconds` clamp [1, 3600] (não silent fallback 60) | ISSUE-007: server pode dizer >3600s; UI não pode mostrar countdown maior que 1h sem desync — clamp truthful em ambos extremos | ✓ Shipped (Phase 3) |
| Pitfall 7 redaction enforced em 3 camadas | Service-level redacted logs + Vitest console-spy + node:fs grep guard (`pitfall7.grep.test.ts`) — defense-in-depth pra evitar leak de senha/token em qualquer fluxo de log | ✓ Shipped (Phase 3) |
| Raven descartado, ICAR substitui | SATEPSI-desfavoravel desde 2023 + licenca Pearson inviavel | ✓ Good |
| DISC = contexto, nao eliminatorio | Informa gestor na entrevista; nao filtra | ✓ Good |
| Pipeline 8 etapas com testes_async paralelo | Reduz dropout candidato; gestor entra na entrevista com perfil completo | ✓ Good |
| VagaLPPage removida do escopo | Pagina simples `/vagas/:slug` atende; complexidade WYSIWYG desnecessaria | ✓ Good |
| n8n fora do MVP | Dependencia externa fragil (conta pessoal n8n.cloud); isolavel | ✓ Good |
| Branch base = backup branch | main desatualizado 5 meses; todo trabalho reaproveitavel no backup | ✓ Good |
| M1 = Fases 1-5 (MVP Candidato) | Entrega fluxo candidato completo e testavel antes de tocar area RH | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-25 after Phase 3 completion*
