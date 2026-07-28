# CLAUDE.md — Sistema de Recrutamento Beauty Smile

## Project Overview

ATS (Applicant Tracking System) para a Beauty Smile. React 18 + Vite + TypeScript strict + Supabase (Auth, DB, Storage, Edge Functions). Duas personas: Candidato (publico, mobile-first) e RH/Admin (interno, desktop-first).

**Milestone atual:** M1 — MVP Candidato (Fases 1-5)
**Branch base:** `backup/local-state-2026-04`
**Planning:** `.planning/` (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md)
**PRD-Master:** `docs/prds/PRD-MASTER-sistema-recrutamento.md`

## Commands

```bash
npm run dev              # Vite dev server (porta 3003)
npm run build            # Producao → build/
npm run lint             # tsc --noEmit (type-check only)
npm run db:types         # Regenerar database.types.ts (requer Supabase CLI)

npm run test             # Vitest watch
npm run test:run         # Vitest single run
npm run test:e2e         # Playwright
npm run test:e2e:headed  # Playwright com browser visivel
```

### Migrations + db push — workaround conhecido (PL/pgSQL)

Migrations contendo `CREATE FUNCTION` ou `DO` blocks com corpo `$$ ... $$`
combinados com statements adjacentes (`COMMENT` / `REVOKE` / `GRANT`) podem
falhar via `supabase db push --linked` no transaction pooler com:

```
ERROR: cannot insert multiple commands into a prepared statement (SQLSTATE 42601)
```

**Workaround** (estabelecido em Phase 4 / Plan 04-01 / migrations 03 + 04):

1. Abrir Supabase SQL Editor → colar SQL do arquivo de migration → executar manualmente.
2. Sincronizar estado local: `supabase migration repair --status applied <version>`.
3. Confirmar: `supabase db push --linked` deve responder "Remote database is up to date".
4. Remover wrappers `BEGIN; ... COMMIT;` do topo do arquivo e adicionar nota inline
   explicando o motivo — o driver do Supabase CLI já envolve cada migration em
   sua própria transação implícita; o BEGIN/COMMIT externo é o gatilho do erro.

Esse padrão deve recorrer em Phase 4+ e Phase 5 (mais migrations PL/pgSQL).

## Architecture

- **Frontend:** SPA React com Vite, alias `@/` → `src/`
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions). Sem servidor Node proprio.
- **Auth:** 1 store Zustand unificado com `role` (candidato | rh | admin). Role via JWT Custom Access Token Hook.
- **Estado servidor:** TanStack Query v5 (staleTime 5min, retry 2)
- **Forms:** React Hook Form + Zod (schemas pt-BR, validacao por step)
- **UI:** Tailwind CSS + shadcn/ui (Radix) + glass UI Beauty Smile
- **Types:** `database.types.ts` gerado pelo Supabase CLI (NUNCA editar manualmente)

## Key Conventions

- **Idioma:** dominio em pt-BR (tabelas, enums, mensagens), codigo tecnico em en
- **Componentes:** PascalCase.tsx, export nomeado (nunca default)
- **Hooks:** useCamelCase.ts
- **Services:** camelCaseService.ts com classes de erro customizadas
- **Features:** `src/features/<dominio>/` com components/, hooks/, services/, schemas/, types/
- **Imports:** `@/` para absolutos, relativos dentro da mesma feature
- **Enums DB:** snake_case pt-BR (`status_vaga`, `etapa_processo`)
- **Query keys:** hierarquicas (`vagasKeys.list(filters, orderBy, pagination)`)

## Security Rules

- **NUNCA** usar `supabaseAdmin` ou service_role key no client-side
- Operacoes privilegiadas vao para Edge Functions (`supabase/functions/`)
- RLS habilitado em 100% das tabelas com dados de usuario
- Duplicate check via RPC SECURITY DEFINER (nao anon SELECT)
- DevNavigationMenu gateado por `import.meta.env.DEV`
- Linguagem de produto: "avaliacao comportamental/cognitiva" (nunca "teste psicologico")
- Sistema NUNCA rejeita candidato automaticamente por score (RNF-07a)

## File Structure

```
src/
├── features/          # Organizacao por dominio (auth, cadastro, vagas)
├── components/
│   ├── pages/         # Paginas (legado, migrar para features/)
│   └── ui/            # shadcn/ui primitives
├── store/authStore.ts # Auth unificado (1 store)
├── lib/supabase/      # Client anon APENAS
├── router/routes.tsx  # Todas as rotas
└── hooks/             # Hooks compartilhados
```

## GSD Workflow

Este projeto usa o framework GSD para execucao faseada:
- `/gsd-plan-phase N` — planeja fase N
- `/gsd-execute-phase N` — executa fase N
- `/gsd-progress` — verifica progresso
- `/gsd-verify-work` — valida features via UAT

**Estado atual:** `.planning/STATE.md`
**Roadmap:** `.planning/ROADMAP.md` (5 fases, 38 requirements)
