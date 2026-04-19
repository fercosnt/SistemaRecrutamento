# Sistema de Recrutamento Beauty Smile

## What This Is

ATS (Applicant Tracking System) web para a Beauty Smile, rede de clinicas odontologicas com tecnologia laser Fotona. Duas personas: Candidato (publico, mobile-first) e RH/Admin (interno, desktop-first). O candidato se cadastra, se candidata a vagas, faz avaliacoes comportamentais/cognitivas e acompanha seu status. O RH gerencia vagas, faz triagem via kanban de 8 etapas, compara scores e toma decisoes de aprovacao/rejeicao com revisao humana obrigatoria.

Brownfield rebuild: sistema iniciado em out/2025 via Figma Make, desenvolvido em modo firefighting ate nov/2025. Reaproveitando ~70% UI/forms/schemas, reconstruindo ~20% fundacao (auth, client, types, RLS, guards), deletando ~10% (duplicatas, artefatos).

## Core Value

Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar, avaliar e decidir sobre candidatos num unico sistema rastreavel com scores comparaveis.

## Requirements

### Validated

<!-- Existente e funcional no codebase atual (pre-rebuild) -->

- ✓ Multi-step form de cadastro (4 steps: Dados, Endereco, Disponibilidade, Autorizacoes LGPD) — existing (`CadastroMultiStepForm`)
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

- [ ] Auth unificado: 1 store com campo `role` (candidato | rh | admin), sem service_role no client
- [ ] RoleGuard centralizado validando session + role do banco
- [ ] Pipeline de types automatizado (`npm run db:types` + hook pre-commit)
- [ ] Migrations consolidadas em `supabase/migrations/` numeradas
- [ ] Login candidato estavel com "Lembrar-me" via `persistSession` nativo do Supabase
- [ ] Recuperacao de senha funcional (email + link + redefinicao)
- [ ] Rotas protegidas que REALMENTE redirecionam sem sessao
- [ ] Cadastro candidato end-to-end sobre fundacao nova (sem service_role)
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

**Estado atual (pos-Fase 0):**
- 43 arquivos WIP commitados em `backup/local-state-2026-04`
- Arquivos orfaos deletados (`.tmp`, `.backup`, shell scripts)
- DevNavigationMenu gateado por `import.meta.env.DEV`
- 9/21 E2E de login falhando (rotas protegidas nao redirecionam, logout nao funciona)
- service_role exposto no client-side bundle (CRITICO — Fase 1 resolve)

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
| Auth unificado em 1 store com `role` | 2 stores paralelos causavam bypass de rotas protegidas (E2E provou) | — Pending (Fase 1) |
| service_role → Edge Functions | service_role exposto no browser e risco critico de seguranca | — Pending (Fase 1) |
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
*Last updated: 2026-04-19 after initialization*
