# Phase 1: Foundation Saneada - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

The application runs on a secure, type-safe foundation where no privileged key reaches the browser, auth is unified under one store with role awareness, routes enforce access control, and the types pipeline catches drift at commit time.

12 requirements: FOUND-01 through FOUND-12.

</domain>

<decisions>
## Implementation Decisions

### Edge Functions: Escopo e Estrutura

- **D-01:** Escopo mínimo no MVP — **1 única Edge Function**: `cadastrar-candidato`. Agrupa atomicamente `auth.signUp` + insert `candidatos` + insert termos LGPD numa transação. Precisa de service_role porque signUp com email_confirm e insert bypassando RLS requerem privilégio admin.
- **D-01a:** Duplicate check **NÃO** vai para Edge Function. Migrar para RPC Postgres `SECURITY DEFINER`: `check_candidato_duplicate(p_cpf text, p_email text) returns jsonb` retornando apenas `{cpf_exists: bool, email_exists: bool}`. Vantagens: zero cold start (~50ms vs ~500ms), custo zero, sem boilerplate Deno.
- **D-01b:** Padrão estrutural: 1 arquivo por operação em `supabase/functions/<nome-kebab>/index.ts`, Deno std apenas (sem framework), input validation com Zod compartilhado via `supabase/functions/_shared/`, response pattern `{ ok: boolean, data?, error? }`.
- **D-01c:** Critério de separação: Edge Function = operação que precisa bypass RLS intencional (signUp, bulk imports). RPC SECURITY DEFINER = leitura sanitizada de dados sensíveis. Client direto = tudo que RLS do usuário já cobre.

### Migrations: Consolidação do Schema

- **D-02:** Abordagem **híbrida baseline + forward**. `pg_dump` do schema prod → `supabase/migrations/20260419000000_baseline.sql` (schema-only, sem dados). Scripts antigos arquivados em `docs/sql/legacy/` com README explicativo.
- **D-02a:** Validação do baseline: `supabase db reset` → `npm run db:types` → `npm run tsc`. Se tsc passa, baseline está correto.
- **D-02b:** Forward migrations a partir de Phase 1:
  - `0002_rls_anon_to_rpc.sql` — migra anonymous SELECT para RPC SECURITY DEFINER (FOUND-10)
  - `0003_unified_auth_role.sql` — role no JWT via Custom Access Token Hook (FOUND-03)
  - `0004_check_candidato_duplicate_rpc.sql` — função RPC para duplicate check
- **D-02c:** Seed separado: `supabase/seed.sql` com 3 candidatos fake + 2 vagas fake + 1 usuário RH fake (dev local apenas).
- **D-02d:** Protocolo de aplicação: NUNCA aplicar migrations direto em prod sem testar em staging/preview. Usar Supabase branching via Vercel Marketplace para validar.

### Código RH durante Phase 1

- **D-03:** Isolar via **re-export de compatibilidade**. `adminAuthStore.ts` vira: `export const useAdminAuthStore = useAuthStore`. Páginas RH continuam compilando sem alteração. Zero risco de regressão na área RH.
- **D-03a:** Limpeza real (remover re-export, migrar imports das 10+ páginas RH) fica para M2.
- **D-03b:** `supabaseAdmin` é removido de `client.ts` (FOUND-12). Qualquer import direto de `supabaseAdmin` em páginas RH quebrará — esses imports precisam ser identificados e removidos/stubados durante Phase 1.

### Route Guard: Comportamento de Loading e Role

- **D-04:** Loading — **Spinner centralizado com delay de 200ms**. Componente `<LoadingDelay delay={200}>` que só renderiza filhos após 200ms de `isLoading=true`. Componente base: `<Loader2 className="animate-spin" />` do lucide-react (já instalado). Skeleton fica para Fase 5 (HARD-02).
- **D-04a:** Rationale do delay: verificação de sessão em cache ~50-100ms → usuário nunca vê spinner. Primeira carga ~500ms+ → delay esgota, spinner aparece com feedback claro. Tela branca = usuário pensa que travou.
- **D-05:** Role errado — **Redirect para home do role + toast informativo** (Sonner, já no stack).
  - Candidato em `/rh/*` → redirect `/candidato/perfil` + toast "Esta área é exclusiva para recrutadores"
  - RH em `/candidato/*` → redirect `/rh/dashboard` + toast "Esta área é exclusiva para candidatos"
  - Sem role (edge case) → redirect `/auth/login` (trata como não-autenticado)
  - Nunca 403 (UX ruim), nunca `/` genérico (descarta contexto)
- **D-06:** RoleGuard — **componente centralizado** substituindo `ProtectedRoute` + `ProtectedAdminRoute`.
  - Aceita `role: Role | Role[]` onde `Role = 'candidato' | 'rh' | 'administrador'`
  - Ordem crítica de verificação: (1) isLoading → spinner, (2) sem sessão → redirect login, (3) role errado → redirect home + toast, (4) role correto → render children
  - Guard SÓ age depois do store estar inicializado (previne redirect prematuro)

### Claude's Discretion

- Estrutura interna do `RoleGuard` (hooks, effects, composição) — desde que respeite a ordem de verificação e o delay de 200ms
- Naming exato dos arquivos de migration (timestamps vs sequencial) — desde que sigam padrão Supabase CLI
- Como organizar `_shared/` dentro de `supabase/functions/` (schemas Zod compartilhados)
- Implementação do `LoadingDelay` (setTimeout vs useEffect vs CSS transition)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projeto e Requisitos
- `.planning/PROJECT.md` — Visão geral, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 12 requirements FOUND-01..12 com acceptance criteria
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, dependencies

### PRD e Documentação Técnica
- `docs/prds/PRD-MASTER-sistema-recrutamento.md` — PRD-Mestre v1.2 (1187 linhas)
- `docs/RLS_POLICIES.md` — 103 policies em 34 tabelas, padrões SQL de RLS
- `docs/technical/SECURITY_DECISIONS.md` — Decisões de segurança existentes

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Arquitetura auth, fluxos, fronteira frontend↔backend
- `.planning/codebase/CONVENTIONS.md` — Padrões de código, naming, imports, schemas Zod
- `.planning/codebase/CONCERNS.md` — Bugs conhecidos, riscos técnicos, E2E failures
- `.planning/codebase/STRUCTURE.md` — Árvore de diretórios, onde adicionar código novo

### Arquivos Críticos (ler antes de implementar)
- `src/store/authStore.ts` — Store atual do candidato (será base do unificado)
- `src/store/adminAuthStore.ts` — Store RH (será convertido em re-export)
- `src/lib/supabase/client.ts` — Dois clients (anon + service_role) — service_role será removido
- `src/components/ProtectedRoute.tsx` — Guard atual candidato (será substituído por RoleGuard)
- `src/components/ProtectedAdminRoute.tsx` — Guard atual RH (será substituído por RoleGuard)
- `src/App.tsx` — RootLayout com lógica duplicada de "Lembrar-me" e inicialização de 2 stores
- `src/features/cadastro/services/cadastroService.ts` — Usa supabaseAdmin (migrará para Edge Function)
- `src/features/cadastro/services/duplicateCheckService.ts` — Usa anon SELECT (migrará para RPC)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Loader2` do lucide-react — base para spinner do RoleGuard
- `toast` do Sonner — feedback de redirect por role errado
- `useAuthStore` — base para o store unificado (já tem user, session, isLoading)
- `vagasKeys` / `candidaturasKeys` — padrão de query keys hierárquicas para TanStack Query
- `cn()` helper (`@/lib/utils`) — merge de classes Tailwind
- Schemas Zod existentes em `features/cadastro/schemas/` — padrão a seguir para validação

### Established Patterns
- Zustand com `persist` middleware para auth state em localStorage
- TanStack Query v5 com `staleTime: 5min, retry: 2`
- React Hook Form + Zod para forms
- Custom error classes com union de códigos (`CadastroError`, `DuplicateCheckError`)
- Feature-based organization: `features/<domain>/{components,hooks,services,schemas,types}`

### Integration Points
- `src/App.tsx` — RootLayout inicializa stores e registra `onAuthStateChange` (precisa refactor)
- `src/router/routes.tsx` — Todas as rotas definidas num único array (RoleGuard wraps aqui)
- `supabase/functions/` — Diretório para novas Edge Functions (criar `cadastrar-candidato/`)
- `supabase/migrations/` — Diretório para baseline + novas migrations

</code_context>

<specifics>
## Specific Ideas

- RoleGuard implementação sugerida pelo usuário com `useEffect` + guard sequencial (ver D-06)
- Delay de 200ms é threshold específico baseado em latência de cache Supabase (~50-100ms)
- Response pattern `{ ok, data?, error? }` para Edge Functions — consistente e simples
- Rate limiting para RPC de duplicate check via policies Postgres (mais natural que rate limit em Edge Function)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-saneada*
*Context gathered: 2026-04-20*
