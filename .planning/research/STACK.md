# Technology Stack

**Project:** Sistema de Recrutamento Beauty Smile (ATS Hardening)
**Researched:** 2026-04-19
**Focus:** Auth unification, Edge Functions, type generation pipeline, RLS hardening, route guards

---

## Recommended Stack

### Core Framework (KEEP -- no changes)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | ^18.3.1 | UI runtime | Already in use; React 19 migration is unnecessary risk for this milestone |
| React Router DOM | ^6.28.0 | Client routing + guards | Stay on v6. v7 is backwards-compatible but changes package imports (`react-router` replaces `react-router-dom`). Migration to v7 adds noise without security value. Upgrade after M1 if desired |
| Vite | 6.3.5 | Build tooling | Already current; no action needed |
| TypeScript | 5.3.3 | Type safety | Already in strict mode; update to ~5.7 when convenient but not blocking |

**Confidence:** HIGH (Context7 + npm registry verified)

### Backend as a Service

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | ^2.103.3 | Client SDK | Update from ^2.48.1. Fixes auth bugs, Edge Function improvements. Latest stable as of 2026-04-17. Non-breaking within v2 |
| supabase (CLI) | ^2.89.1 | Type gen, migrations, Edge Functions | Install as devDependency. Required for `supabase gen types`, `supabase functions deploy`. Requires Node.js 20+ |
| Supabase Edge Functions | Deno runtime | Server-side privileged ops | Replaces `supabaseAdmin` (service_role) from client bundle. All ops needing RLS bypass go here |
| Supabase Auth Hooks | PL/pgSQL | JWT custom claims | Inject `user_role` into JWT via `custom_access_token_hook`. Avoids extra DB query on every route check |

**Confidence:** HIGH (Context7 docs verified, npm versions confirmed via WebSearch)

### Auth & State

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | ^4.5.2 | Auth store (unified) | Stay on v4. Zustand v5 exists but changes middleware API. Not worth the churn for this milestone. Merge `authStore` + `adminAuthStore` into ONE store with `role` field |
| @supabase/supabase-js auth | built-in | Session management | Use `onAuthStateChange` as single source of truth. Remove localStorage/sessionStorage flag hacks. `persistSession: true` handles "Remember me" natively |

**Confidence:** HIGH (Context7 verified Zustand v4 persist middleware, Supabase auth docs)

### Type Generation Pipeline

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| supabase CLI | ^2.89.1 | `supabase gen types typescript` | Generates `database.types.ts` from live schema. Use `--project-id` for remote, `--local` for local dev |
| husky | ^9.1.7 | Git hooks | Runs pre-commit hook. Stable, 24M weekly downloads. Simple `.husky/pre-commit` script |
| lint-staged | ^15.4.3 | Staged file filtering | Not strictly needed for type gen (types regenerate on any commit), but useful for running `tsc --noEmit` on staged `.ts/.tsx` files |

**Confidence:** HIGH (npm versions verified via WebSearch)

### Dev Tooling (NEW -- currently missing)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ESLint | ^9.x | Linting | Project has ZERO linting beyond `tsc --noEmit`. Add flat config. Use `@typescript-eslint/eslint-plugin` for TS rules |
| Prettier | ^3.x | Formatting | No formatter configured. Add with `.prettierrc` for consistency |

**Confidence:** MEDIUM (versions approximate -- check npm at install time)

### Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | Pro (already paid) | Frontend hosting | SPA deployment. Add `vercel.json` with `rewrites` for SPA routing |
| Supabase | Pro (already paid) | Database, Auth, Storage, Edge Functions | All backend. Edge Functions for privileged operations |

**Confidence:** HIGH (project constraints confirmed in PROJECT.md)

---

## Critical Changes for This Milestone

### 1. Remove `supabaseAdmin` from Client Bundle

**Current state:** `VITE_SUPABASE_SERVICE_ROLE_KEY` is read in `src/lib/supabase/client.ts:14` and exposed in the Vite bundle. This is a **critical security vulnerability** -- anyone can inspect the bundle and get full database access.

**Target state:**
- Delete `VITE_SUPABASE_SERVICE_ROLE_KEY` from all `.env*` files
- Delete `supabaseAdmin` export from `src/lib/supabase/client.ts`
- Move privileged operations to Supabase Edge Functions
- Edge Functions access `SUPABASE_SERVICE_ROLE_KEY` via `Deno.env.get()` (auto-injected by Supabase runtime)

**Edge Function pattern (verified via Context7):**

```typescript
// supabase/functions/admin-create-candidato/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // User-scoped client (respects RLS)
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  // Admin client (bypasses RLS) -- only use when necessary
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // ... operation logic
})
```

**Client invocation:**
```typescript
const { data, error } = await supabase.functions.invoke('admin-create-candidato', {
  body: { nome, email, cpf }
})
```

**Confidence:** HIGH (Context7 docs + Supabase official docs)

### 2. Unified Auth Store with Role from JWT

**Current state:** Two parallel Zustand stores (`authStore` + `adminAuthStore`) both listen to `onAuthStateChange`. A candidato logging in triggers both stores. Route protection is broken (E2E proves it).

**Target architecture:**

```
Supabase Auth --> onAuthStateChange --> Single useAuthStore
                                            |
                                   role from JWT claims
                                   (candidato | rh | admin)
                                            |
                                   <RoleGuard> component
                                            |
                              Route renders or Navigate to /login
```

**How role gets into JWT (Supabase Custom Access Token Hook):**

```sql
-- Migration: create user_roles table + hook
CREATE TYPE public.app_role AS ENUM ('candidato', 'rh', 'admin');

CREATE TABLE public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'candidato'
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Hook function: injects role into JWT claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  claims jsonb;
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Security: only auth system can call this
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT ALL ON TABLE public.user_roles TO supabase_auth_admin;
```

**Then enable the hook in Supabase Dashboard:** Authentication > Hooks > Custom Access Token > Point to `public.custom_access_token_hook`.

**Reading role in the unified store:**

```typescript
// Role is available in session.user.app_metadata or via JWT decode
const role = session?.user?.user_metadata?.user_role
  ?? session?.user?.app_metadata?.user_role
  ?? 'candidato'
```

**Confidence:** HIGH (Context7 Supabase RBAC docs, custom_access_token_hook verified)

### 3. Type Generation Pipeline

**Target `package.json` scripts:**

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --project-id \"$SUPABASE_PROJECT_REF\" --schema public > database.types.ts",
    "db:types:local": "supabase gen types typescript --local --schema public > database.types.ts",
    "typecheck": "tsc --noEmit",
    "prepare": "husky"
  }
}
```

**Pre-commit hook (`.husky/pre-commit`):**

```bash
#!/bin/sh
npx tsc --noEmit
```

**Note on type gen in pre-commit:** Do NOT auto-regenerate types on every commit. The generation requires either a running local Supabase instance or network access to the remote project. Instead:
1. Run `npm run db:types` manually after any migration
2. Pre-commit hook runs `tsc --noEmit` to catch stale types
3. CI/CD runs `npm run db:types && tsc --noEmit` to verify types match schema

**Confidence:** HIGH (Supabase CLI docs verified, husky docs verified)

### 4. RLS Hardening for ATS Roles

**Best practices (verified via Context7):**

1. **Always use `TO` clause:** Explicitly scope policies to `authenticated` or `anon`. Never leave policies without a role target.

```sql
-- GOOD: explicit role
CREATE POLICY "candidatos_own_data" ON candidatos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- BAD: no TO clause (applies to all roles including anon)
CREATE POLICY "candidatos_own_data" ON candidatos
  FOR SELECT
  USING (user_id = auth.uid());
```

2. **Use `(SELECT auth.uid())` not `auth.uid()`** in policy expressions to ensure the function is called once per query, not per row:

```sql
CREATE POLICY "own_data" ON candidatos
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()));
```

3. **Role-based access via JWT claim:**

```sql
-- RH can see all candidatos
CREATE POLICY "rh_view_all_candidatos" ON candidatos
  FOR SELECT TO authenticated
  USING (
    (SELECT (auth.jwt()->>'user_role'))::app_role IN ('rh', 'admin')
  );

-- Candidato sees only own data
CREATE POLICY "candidato_own_data" ON candidatos
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (SELECT (auth.jwt()->>'user_role'))::app_role = 'candidato'
  );
```

4. **Anonymous policies for duplicate check:** Restrict to existence check only, never expose data:

```sql
-- Edge Function approach (preferred): move duplicate check to Edge Function
-- that uses service_role. Remove anonymous SELECT policies entirely.
```

**Confidence:** HIGH (Context7 RLS docs, Supabase RBAC guide)

### 5. React Router v6 Role Guards

**Pattern for `createBrowserRouter` (already used in project):**

```typescript
// src/components/guards/RoleGuard.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

type AllowedRole = 'candidato' | 'rh' | 'admin'

interface RoleGuardProps {
  allowed: AllowedRole[]
  redirectTo?: string
}

export function RoleGuard({ allowed, redirectTo = '/auth/login' }: RoleGuardProps) {
  const { isAuthenticated, isLoading, role } = useAuthStore()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner />

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (!allowed.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
```

**Router usage:**

```typescript
const router = createBrowserRouter([
  // Public routes
  { path: '/auth/login', element: <LoginPage /> },
  { path: '/vagas', element: <VagasPublicasPage /> },

  // Candidato routes
  {
    element: <RoleGuard allowed={['candidato']} />,
    children: [
      { path: '/candidato/perfil', element: <MeuPerfilCandidatoPage /> },
      { path: '/candidato/candidaturas', element: <MinhasCandidaturasPage /> },
    ]
  },

  // RH routes
  {
    element: <RoleGuard allowed={['rh', 'admin']} />,
    children: [
      { path: '/rh/dashboard', element: <DashboardRHPage /> },
      { path: '/rh/vagas', element: <VagasRHPage /> },
    ]
  },
])
```

**Confidence:** HIGH (React Router v6 docs verified via Context7, standard pattern)

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth state | Zustand v4 unified store | React Context | Zustand already in use across app; switching adds churn. Zustand persist middleware handles session restore |
| Auth state | Zustand v4 unified store | Zustand v5 | v5 changes middleware API (`create()` no longer needs extra `()`). Not worth migration risk during security-critical work |
| Route guards | RoleGuard wrapper component | React Router v7 loaders | Project is on v6 with `createBrowserRouter`. Wrapper pattern is idiomatic v6. Loaders require data-router patterns not yet adopted |
| Route guards | RoleGuard wrapper component | HOC `withAuth()` | Wrapper component with `<Outlet>` is cleaner, more composable, standard React Router v6 pattern |
| Type gen trigger | Manual + CI verification | Pre-commit auto-gen | Auto-gen in pre-commit requires running Supabase instance or network access. Fragile. Better to verify types match than regenerate |
| Role storage | JWT custom claims (auth hook) | DB lookup on every page | JWT claim is available synchronously after login. DB lookup adds latency to every route transition. Custom access token hook is the official Supabase RBAC pattern |
| Role storage | JWT custom claims (auth hook) | `app_metadata` manual set | `app_metadata` requires admin API to update. Custom hook auto-updates JWT on every token refresh |
| Edge Functions | Supabase Edge Functions (Deno) | Vercel Serverless Functions | Supabase Edge Functions have automatic access to `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL`. No env var configuration needed. Direct DB access possible via `pg` module. Already on Supabase Pro |
| Git hooks | husky 9 | lefthook | husky is the ecosystem standard (24M/week downloads). Already well-documented. lefthook is faster but less ecosystem support |
| Service role replacement | Edge Functions | Supabase Database Functions (RPC) | Edge Functions handle complex logic (file upload, email, multi-step). RPC is good for simple DB operations. Use both: RPC for simple queries, Edge Functions for orchestration |

---

## Packages to REMOVE

| Package | Why Remove |
|---------|------------|
| `@supabase/auth-helpers-react` ^0.5.0 | Designed for Next.js. Project is Vite/React SPA. Not used anywhere in code. Dead dependency |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` (env var) | Must be deleted from all `.env*` files. Never in client bundle |
| `supabaseAdmin` export in `client.ts` | Entire admin client construct must be removed from client-side code |

---

## Packages to ADD

```bash
# Core (update)
npm install @supabase/supabase-js@^2.103.3

# Dev dependencies
npm install -D supabase@^2.89.1 husky@^9.1.7 lint-staged@^15.4.3

# Initialize husky
npx husky init
```

---

## Installation Summary

```bash
# Update Supabase client
npm install @supabase/supabase-js@latest

# Remove dead dependency
npm uninstall @supabase/auth-helpers-react

# Add dev tooling
npm install -D supabase husky lint-staged

# Initialize husky
npx husky init

# Create pre-commit hook
echo 'npx tsc --noEmit' > .husky/pre-commit

# Add type gen script to package.json
npm pkg set scripts.db:types="supabase gen types typescript --project-id \"\$SUPABASE_PROJECT_REF\" --schema public > database.types.ts"
npm pkg set scripts.db:types:local="supabase gen types typescript --local --schema public > database.types.ts"
npm pkg set scripts.typecheck="tsc --noEmit"
```

---

## Sources

- [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions) (Context7 verified)
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) (Context7 verified)
- [Supabase RBAC with Custom Claims](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac) (Context7 verified)
- [Supabase Type Generation](https://supabase.com/docs/guides/api/rest/generating-types) (Context7 verified)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security) (Context7 verified)
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) - v2.103.3
- [supabase CLI npm](https://www.npmjs.com/package/supabase) - v2.89.1
- [husky npm](https://www.npmjs.com/package/husky) - v9.1.7
- [React Router v6 docs](https://reactrouter.com/6.30.3/) (Context7 verified)
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys) - New publishable/secret key model
