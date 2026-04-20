# Architecture Patterns

**Domain:** ATS (Applicant Tracking System) brownfield rebuild - React + Supabase
**Researched:** 2026-04-19
**Confidence:** HIGH (based on codebase analysis + verified Supabase/React Router docs)

## Recommended Architecture

### Target State: Layered SPA with Edge Functions as Security Boundary

```
Browser (React SPA on Vercel)
   |
   +---> Supabase JS Client (anon key ONLY)
   |        |
   |        +---> Postgres (RLS enforced on every table)
   |        +---> Auth (single project, role in profile tables)
   |        +---> Storage (curriculos, avatares)
   |        +---> Edge Functions (privileged operations)
   |
   +---> ViaCEP API (address autocomplete, public)
   |
   X  N8N Webhooks (deferred to Phase 10, out of MVP)
   X  supabaseAdmin / service_role in client (REMOVED)
```

**Key difference from current state:** The `supabaseAdmin` client with `VITE_SUPABASE_SERVICE_ROLE_KEY` is eliminated entirely from the browser bundle. All operations requiring RLS bypass move to Supabase Edge Functions (Deno).

### Component Boundaries

| Component | Responsibility | Communicates With | Trust Level |
|-----------|---------------|-------------------|-------------|
| **Unified Auth Store** | Session state, role resolution, profile data | Supabase Auth, profile tables | Client (untrusted) |
| **RoleGuard** | Route protection by role (candidato/rh/admin) | Auth Store | Client (untrusted) |
| **Feature Modules** (`src/features/*`) | Business logic per domain: hooks, services, schemas, types | Supabase client (anon), Edge Functions | Client (untrusted) |
| **Page Components** (`src/features/*/pages/`) | UI composition, layout binding | Feature module hooks/services | Client (untrusted) |
| **Supabase Edge Functions** | Privileged ops: user creation, admin deletes, RLS bypass | Supabase Admin client (service_role), Postgres | Server (trusted) |
| **Supabase RLS Policies** | Row-level authorization | auth.uid(), profile tables | Server (trusted) |
| **Type Generation Pipeline** | `database.types.ts` from live schema | Supabase CLI, pre-commit hook | Build-time |

### Data Flow

#### Flow 1: Candidato Registration (current biggest security issue)

**Current (BROKEN - service_role in browser):**
```
Browser -> supabaseAdmin.auth.admin.signUp()     [BYPASSES RLS]
Browser -> supabaseAdmin.from('candidatos').insert() [BYPASSES RLS]
```

**Target (Edge Function as security boundary):**
```
Browser -> supabase.functions.invoke('cadastrar-candidato', {
             body: { dadosPessoais, endereco, disponibilidade, autorizacoes }
           })
   |
   v
Edge Function (Deno, has SUPABASE_SERVICE_ROLE_KEY in env)
   |
   +-- Validate input (Zod schema, server-side)
   +-- supabaseAdmin.auth.admin.signUp()
   +-- supabaseAdmin.from('candidatos').insert()
   +-- supabaseAdmin.from('disponibilidade').insert()
   +-- supabaseAdmin.from('autorizacoes').insert()
   +-- If any step fails: rollback (delete auth user, delete rows)
   +-- Return { success, candidatoId } to browser
```

**Why Edge Function, not RLS-only:** Registration requires creating an `auth.users` entry AND inserting into `candidatos` atomically. The `auth.admin.signUp()` method requires the service_role key. No amount of RLS policy can make this work from anon-key-only client. This is the canonical use case for Edge Functions.

#### Flow 2: Auth State Resolution (login -> role detection)

```
1. User signs in via supabase.auth.signInWithPassword()
2. onAuthStateChange fires with session
3. Unified auth store receives session:
   a. Query candidatos WHERE user_id = auth.uid() -> if found, role = 'candidato'
   b. Query usuarios_rh WHERE user_id = auth.uid() AND ativo = true -> if found, role = RH role
   c. If neither found -> role = null (limbo state, redirect to appropriate signup)
4. Store sets: { user, session, role, profile }
5. RoleGuard reads role from store, permits/blocks route access
```

**Critical invariant:** A single auth.users row can match at most ONE profile table. The store MUST check both tables and resolve to a single role. If both match (data corruption), prefer the RH profile and log a warning.

#### Flow 3: Authenticated Candidato Operations (candidatura, profile, tests)

```
Browser (logged in as candidato)
   |
   +-- supabase.from('candidaturas').insert()  [RLS: candidato_id = auth.uid()]
   +-- supabase.storage.upload('curriculos/...') [RLS: bucket policy]
   +-- supabase.from('candidatos').update()    [RLS: user_id = auth.uid()]
```

These operations work with anon key + RLS. No Edge Function needed.

#### Flow 4: RH Operations (status updates, candidate review)

```
Browser (logged in as RH user)
   |
   +-- supabase.from('candidaturas').update()  [RLS: check usuarios_rh.user_id = auth.uid()]
   +-- supabase.from('vagas').insert/update()  [RLS: check usuarios_rh role]
```

Most RH operations can work via RLS policies that check `EXISTS (SELECT 1 FROM usuarios_rh WHERE user_id = auth.uid() AND ativo = true)`. Edge Functions only needed for operations that truly bypass RLS (e.g., admin.deleteUser).

## Architecture Decisions

### 1. Unified Auth Store (replaces dual-store pattern)

**Current problem:** Two Zustand stores (`authStore` + `adminAuthStore`) both call `supabase.auth.getSession()` on the same session, both listen to `onAuthStateChange`, and race against each other. A candidato login populates `authStore` correctly but `adminAuthStore` also detects the session and tries (and fails) to find a `usuarios_rh` row, causing console errors and state confusion.

**Target pattern:** Single `useAuthStore` with a discriminated union state:

```typescript
type AuthRole = 'candidato' | 'recrutador' | 'administrador'

interface AuthState {
  // Core
  user: User | null
  session: Session | null
  role: AuthRole | null
  isAuthenticated: boolean
  isLoading: boolean

  // Profile (discriminated by role)
  profile: CandidatoProfile | RHProfile | null

  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>

  // Role checks
  hasRole: (required: AuthRole) => boolean
  isAtLeast: (required: AuthRole) => boolean // hierarchy check
}

// Role hierarchy for isAtLeast()
const ROLE_HIERARCHY: Record<AuthRole, number> = {
  candidato: 0,
  recrutador: 1,
  administrador: 2,
}
```

**Why single store:** One Supabase Auth session = one user = one role. Having two stores pretending there are two independent sessions is architecturally wrong and causes the race conditions proven by E2E failures (9/21 login tests failing).

**Session persistence:** Use Supabase Auth's native `persistSession: true` (already configured). Remove the custom "Lembrar-me" logic using `sessionStorage` flags -- it fights against Supabase's built-in session management and creates edge cases. If "Lembrar-me" is truly needed, use `supabase.auth.signInWithPassword()` with `options: { persistSession: rememberMe }`.

### 2. RoleGuard Component (replaces ProtectedRoute + ProtectedAdminRoute)

**Current problem:** Two separate guard components (`ProtectedRoute` for candidatos, `ProtectedAdminRoute` for RH) with duplicated loading/redirect logic. `ProtectedRoute` only checks `isAuthenticated` but never verifies the user is actually a candidato -- an RH user accessing `/candidato/dashboard` would pass the guard.

**Target pattern:** Single `RoleGuard` component:

```typescript
interface RoleGuardProps {
  children: ReactNode
  /** Allowed roles. If omitted, any authenticated user passes. */
  allow: AuthRole[]
  /** Minimum role level (alternative to explicit list). */
  minRole?: AuthRole
  /** Where to redirect if not authenticated. */
  loginPath?: string
  /** Where to redirect if authenticated but wrong role. */
  forbiddenPath?: string
}
```

Usage in routes:
```tsx
// Candidato routes
<RoleGuard allow={['candidato']} loginPath="/auth/login">
  <DashboardCandidatoPage />
</RoleGuard>

// RH routes (any RH role)
<RoleGuard allow={['recrutador', 'administrador']} loginPath="/auth/login-rh">
  <DashboardRHPage />
</RoleGuard>

// Admin-only
<RoleGuard allow={['administrador']} loginPath="/auth/login-rh" forbiddenPath="/rh/dashboard">
  <ConfiguracoesPage />
</RoleGuard>
```

**Verification requirement:** The RoleGuard MUST verify the role from the database (profile table query), not just from the Zustand store's persisted localStorage. On mount, it should call `supabase.auth.getUser()` (not `getSession()` -- `getUser()` validates with the server) and then check the profile table. This prevents a user from manually editing localStorage to fake a role.

### 3. Edge Functions Architecture

**When to use Edge Functions:**
1. Operations requiring `service_role` key (user creation, admin user deletion)
2. Operations that need atomic multi-table transactions beyond RLS scope
3. Third-party API calls with secrets (future: n8n webhook relay, email sending)

**When NOT to use Edge Functions:**
1. Standard CRUD with RLS (reads, candidato self-updates, RH updates within RLS)
2. File uploads (Supabase Storage + bucket policies handle this)
3. Client-side validation (keep Zod in browser for UX; duplicate on server for security)

**Edge Functions to create for M1:**

| Function | Purpose | Trigger |
|----------|---------|---------|
| `cadastrar-candidato` | Multi-table registration with auth.admin.signUp | `supabase.functions.invoke()` from CadastroMultiStepForm |
| `admin-delete-user` | Delete auth.users entry (admin only) | `supabase.functions.invoke()` from RH panel |

**Deployment:** `supabase functions deploy <name>` from `supabase/functions/<name>/index.ts`. Environment variables (`SUPABASE_SERVICE_ROLE_KEY`) are automatically available in Edge Functions without explicit configuration.

**Edge Function template:**
```typescript
// supabase/functions/cadastrar-candidato/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create admin client (service_role from env)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    // 2. Verify calling user (optional, for authenticated endpoints)
    const authHeader = req.headers.get('Authorization')!
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // 3. Parse and validate body
    const body = await req.json()
    // ... Zod validation ...

    // 4. Perform privileged operations
    // ... signUp, inserts, etc ...

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

### 4. Feature-Based Folder Structure Migration

**Current state:** 35 page components in `src/components/pages/`, 3 feature modules in `src/features/` (auth skeleton, cadastro mature, vagas partial).

**Target structure:**

```
src/
  features/
    auth/                          # Auth (Phase 1)
      components/
        LoginForm.tsx
        ResetPasswordForm.tsx
      hooks/
        useAuth.ts                 # wraps unified auth store
      services/
        authService.ts             # signIn, signUp (client-side only now)
      store/
        authStore.ts               # THE unified auth store (moved from src/store/)
      types/
        auth.types.ts
      guards/
        RoleGuard.tsx              # Single route guard component

    cadastro/                      # Registration (Phase 4 - already mature)
      components/                  # Keep existing structure
      hooks/
      schemas/
      services/
        cadastroService.ts         # Calls Edge Function instead of supabaseAdmin
      types/

    vagas/                         # Job Listings (Phase 5)
      components/
        VagaCard.tsx
        VagaFilters.tsx
      hooks/
        useVagas.ts                # existing
        useCandidaturas.ts         # existing
      pages/
        VagasPublicasPage.tsx      # migrated from components/pages/
        VagaDetalhePage.tsx
      services/
        vagasService.ts            # existing
        candidaturasService.ts     # existing (remove webhook code for MVP)
      store/
        vagasStore.ts              # existing
      types/
        vagasTypes.ts              # existing

    candidato/                     # Candidato Area (Phase 5)
      pages/
        DashboardCandidatoPage.tsx
        MeuPerfilCandidatoPage.tsx
        FormularioCandidaturaPage.tsx
      hooks/
      services/

    rh/                            # RH Area (post-M1)
      pages/
        DashboardRHPage.tsx
        CandidatosRHPage.tsx
        VagasRHPage.tsx
        ...
      components/
        RHLayout.tsx
        RHSidebar.tsx
        RHTopBar.tsx
      hooks/
      services/

    testes/                        # Psychometric Tests (post-M1)
      pages/
      components/
      hooks/
      services/

  components/
    ui/                            # shadcn/ui primitives (keep)
    ErrorBoundary.tsx              # Global error boundary (keep)
    BackgroundImage.tsx            # Shared visual component (keep)

  lib/
    supabase/
      client.ts                    # ONLY exports anon client (supabaseAdmin REMOVED)

  router/
    routes.tsx                     # Route definitions with RoleGuard
```

**Migration strategy:** Move pages incrementally per phase. Phase 1 moves auth pages. Phase 4-5 moves candidato/vagas pages. RH pages stay in `components/pages/` until M2. Each move is one commit: rename file, update imports, verify build passes.

### 5. Service Layer Decomposition

**Current problem:** `candidaturasService.ts` is 1200 lines mixing CRUD, webhook retry logic, N8N payload construction, and structured logging. `cadastroService.ts` is 590 lines with manual multi-table transaction and rollback.

**Decomposition principles:**
1. **One service file per aggregate root** -- `candidaturasService` handles candidatura CRUD, nothing else
2. **Extract cross-cutting concerns** -- webhook logic, retry, logging become shared utilities
3. **Edge Functions absorb privileged logic** -- cadastro's multi-table insert moves server-side
4. **Services call `supabase` (anon) only** -- no `supabaseAdmin` in any service

**Target decomposition for candidaturasService:**

```
features/vagas/services/
  candidaturasService.ts        # CRUD only (create, list, listByVaga, getById)
  candidaturaStatusService.ts   # Status transitions with business rules
  (webhookService removed from MVP -- n8n deferred to Phase 10)

lib/
  errors/
    ServiceError.ts             # Base class for typed service errors
  http/
    retryFetch.ts              # Generic retry with exponential backoff (reusable)
```

**Target decomposition for cadastroService:**

```
features/cadastro/services/
  cadastroService.ts           # Thin wrapper: validates form data, calls Edge Function
                               # ~50 lines instead of ~590
```

The heavy lifting (signUp, multi-table insert, rollback) moves into `supabase/functions/cadastrar-candidato/index.ts`.

### 6. Type Generation Pipeline

**Pipeline:**
```bash
# In package.json scripts:
"db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > database.types.ts",
"db:types:local": "supabase gen types typescript --local > database.types.ts"
```

**Pre-commit hook (via Husky + lint-staged):**
```bash
# .husky/pre-commit
npx lint-staged

# lint-staged.config.js
module.exports = {
  'database.types.ts': () => 'npm run db:types && git add database.types.ts',
  '*.{ts,tsx}': ['tsc --noEmit'],
}
```

**Why auto-generate:** The current `database.types.ts` was hand-maintained and has drifted from the actual schema (evidenced by `as any` casts in candidaturasService.ts). Auto-generation eliminates drift and catches schema changes at build time.

## Anti-Patterns to Avoid

### Anti-Pattern 1: service_role Key in Client Bundle
**What:** Exposing `VITE_SUPABASE_SERVICE_ROLE_KEY` via Vite env vars
**Why bad:** Any user can extract this key from the browser bundle and bypass ALL RLS policies, reading/writing/deleting any row in any table. This is equivalent to giving every visitor full database admin access.
**Instead:** Delete `VITE_SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. Move all operations requiring service_role to Edge Functions.

### Anti-Pattern 2: Dual Auth Stores for Single Auth Session
**What:** Two Zustand stores (`authStore` + `adminAuthStore`) both listening to the same `onAuthStateChange` event
**Why bad:** Race conditions on initialization, state desynchronization, both stores calling `getSession()` simultaneously, one store's `signOut()` doesn't clear the other
**Instead:** Single unified store with `role` discriminator

### Anti-Pattern 3: Client-Side Role Verification Without Server Check
**What:** `ProtectedRoute` checks `isAuthenticated` from Zustand localStorage, which can be manually set to `true`
**Why bad:** Anyone can open devtools, set `auth-storage` in localStorage to `{isAuthenticated: true}`, and access protected routes
**Instead:** RoleGuard must call `supabase.auth.getUser()` on mount (server-validated) and verify profile table existence

### Anti-Pattern 4: N+1 Queries in Service Layer
**What:** `enriquecerVaga()` in vagasService.ts makes 3 additional Supabase queries per vaga (totalCandidatos, emAnalise, aprovados) and then `listVagas` calls this in `Promise.all` for every vaga in the page -- up to 12 vagas x 3 queries = 36 extra queries per page load
**Why bad:** Latency scales linearly with page size, hammers Supabase connection pool
**Instead:** Use a Postgres VIEW or RPC function that joins candidatura counts in a single query, or use `.select('*, candidaturas(count)')` syntax

### Anti-Pattern 5: Manual Transaction Rollback in Client
**What:** `cadastroService.ts` manually deletes rows if a subsequent insert fails, but this runs in the browser with service_role
**Why bad:** Rollback can fail silently (network drop, tab close), leaving orphaned auth.users entries. Also exposes delete capability to the client.
**Instead:** Edge Function handles the entire transaction server-side. If the function crashes, Deno runtime guarantees cleanup is attempted. For true atomicity, use a Postgres function (`SELECT cadastrar_candidato_completo(...)`) called from the Edge Function.

## Patterns to Follow

### Pattern 1: Discriminated Auth State
**What:** Auth store uses role field to discriminate which profile data is loaded
**When:** Always -- this is the core auth pattern
**Example:**
```typescript
// In a component
const { role, profile } = useAuthStore()
if (role === 'candidato') {
  const candidato = profile as CandidatoProfile
  // TypeScript knows this is safe because role === 'candidato'
}
```

### Pattern 2: Edge Function as RPC
**What:** Call Edge Functions like typed RPCs using `supabase.functions.invoke()`
**When:** Any operation needing service_role
**Example:**
```typescript
// In cadastroService.ts (client-side, ~50 lines)
export async function cadastrarCandidato(data: CandidatoFormData) {
  const { data: result, error } = await supabase.functions.invoke(
    'cadastrar-candidato',
    { body: data }
  )
  if (error) throw new CadastroError(error.message, 'NETWORK_ERROR')
  return result as CadastroCompleteResult
}
```

### Pattern 3: Feature Module Barrel Exports
**What:** Each feature exposes a public API via `index.ts`, internals are private
**When:** Always for cross-feature imports
**Example:**
```typescript
// features/auth/index.ts
export { useAuthStore, useIsAuthenticated } from './store/authStore'
export { RoleGuard } from './guards/RoleGuard'
export type { AuthRole } from './types/auth.types'

// features/vagas/pages/VagasPublicasPage.tsx
import { useIsAuthenticated } from '@/features/auth'  // clean import
```

### Pattern 4: React Router Layout Routes for Guards
**What:** Use layout routes to wrap entire route groups with guards instead of wrapping each route individually
**When:** Route groups share the same guard configuration
**Example:**
```tsx
// routes.tsx
{
  element: <RoleGuard allow={['candidato']} loginPath="/auth/login" />,
  children: [
    { path: '/candidato/dashboard', element: <DashboardCandidatoPage /> },
    { path: '/candidato/perfil', element: <MeuPerfilCandidatoPage /> },
    // ... all candidato routes inherit the guard
  ]
}
```

This eliminates the current pattern of wrapping every single route in `<ProtectedRoute>`.

## Suggested Build Order (Dependencies Between Components)

The architecture has clear dependency ordering. Building out of order causes rework.

```
Phase 1: Auth Foundation
  +-- Unified Auth Store (no dependencies)
  +-- RoleGuard component (depends on: auth store)
  +-- Edge Function: cadastrar-candidato (depends on: nothing client-side)
  +-- Remove supabaseAdmin from client.ts (depends on: Edge Function deployed)
  +-- Type generation pipeline (depends on: nothing)

Phase 2: Route Infrastructure
  +-- Layout routes with RoleGuard (depends on: auth store, RoleGuard)
  +-- Feature folder structure for auth (depends on: auth store moved)

Phase 3: Login/Password Flows
  +-- Login candidato stable (depends on: unified auth store)
  +-- Login RH stable (depends on: unified auth store)
  +-- Password recovery (depends on: auth store)

Phase 4: Cadastro on New Foundation
  +-- cadastroService calls Edge Function (depends on: Edge Function deployed)
  +-- Remove supabaseAdmin imports from cadastroService (depends on: Edge Function)
  +-- E2E tests for registration (depends on: cadastro working)

Phase 5: Candidato MVP Features
  +-- Public vagas listing (depends on: RLS, no auth needed)
  +-- Candidatura flow (depends on: auth store, RLS policies)
  +-- Candidato profile (depends on: auth store)
  +-- Feature folder migration for candidato/ (depends on: routes working)
```

**Key dependency chain:** Auth Store -> RoleGuard -> Routes -> Everything else. Do NOT start candidatura features before auth is solid. The 9/21 failing E2E tests prove this.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Auth session | Supabase handles natively | Supabase handles natively | Supabase handles natively |
| Vagas listing | N+1 is fine (<36 queries) | Move to VIEW/RPC, add pagination | Full-text search with pg_trgm |
| Candidatura CRUD | RLS direct queries | Add DB indexes on etapa_atual, status | Consider read replicas |
| Edge Functions | Cold start ~200ms | Warm, no issue | Consider regional deployment |
| Type generation | Manual trigger OK | Pre-commit hook | CI pipeline |

For M1 (Beauty Smile single-tenant, likely <1000 active users), the N+1 in vagasService is the only performance concern worth addressing. Everything else scales fine at this volume.

## Sources

- Supabase Edge Functions documentation (Context7, verified 2026-04-19): `supabase.functions.invoke()` API, Deno.env for service_role
- Supabase Auth documentation (Context7, verified 2026-04-19): `getUser()` vs `getSession()`, `auth.admin` namespace
- Codebase analysis: `src/lib/supabase/client.ts`, `src/store/authStore.ts`, `src/store/adminAuthStore.ts`, `src/components/ProtectedRoute.tsx`, `src/components/ProtectedAdminRoute.tsx`, `src/features/*/services/*.ts`
- React Router v6 layout routes: training data (MEDIUM confidence, but pattern is stable since v6.4)
