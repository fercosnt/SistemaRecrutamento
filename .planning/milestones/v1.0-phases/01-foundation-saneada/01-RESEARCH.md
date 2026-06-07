# Phase 1: Foundation Saneada - Research

**Researched:** 2026-04-20
**Domain:** Security hardening, Auth unification, Types pipeline, Route guards (React + Supabase)
**Confidence:** HIGH

## Summary

Phase 1 addresses critical security and architectural debt in the Beauty Smile ATS. The codebase currently exposes a Supabase `service_role` key in the client-side bundle via `VITE_SUPABASE_SERVICE_ROLE_KEY` -- any env var prefixed `VITE_` is included in the browser bundle by Vite. Two separate Zustand auth stores (`authStore` and `adminAuthStore`) create duplicated initialization logic, race conditions in `onAuthStateChange`, and inconsistent session handling. Route guards are split across `ProtectedRoute` and `ProtectedAdminRoute` with no role awareness or cross-role redirect logic. There is no `npm run db:types` script, no husky pre-commit hook, and no consolidated migration baseline.

The phase consolidates auth into a single Zustand store with role awareness (via Supabase Custom Access Token Hook injecting role into JWT), replaces the two route guards with a unified `RoleGuard`, removes the `supabaseAdmin` client from the browser, establishes the Edge Function pattern for privileged operations, migrates the anonymous duplicate-check SELECT to an RPC SECURITY DEFINER function, and sets up the types pipeline with pre-commit enforcement.

**Primary recommendation:** Start by removing `supabaseAdmin` and `VITE_SUPABASE_SERVICE_ROLE_KEY` from client code (highest security impact, smallest blast radius), then unify the auth store, then build the RoleGuard, then set up migrations/types/hooks infrastructure.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 1 Edge Function only for MVP: `cadastrar-candidato`. Groups signUp + insert candidatos + insert termos LGPD atomically. Needs service_role because signUp with email_confirm and insert bypassing RLS require admin privilege.
- **D-01a:** Duplicate check via RPC Postgres `SECURITY DEFINER`: `check_candidato_duplicate(p_cpf text, p_email text) returns jsonb` returning `{cpf_exists: bool, email_exists: bool}`. Zero cold start.
- **D-01b:** 1 file per operation in `supabase/functions/<nome-kebab>/index.ts`, Deno std only, input validation with shared Zod via `supabase/functions/_shared/`, response pattern `{ ok: boolean, data?, error? }`.
- **D-01c:** Edge Function = operation needing RLS bypass. RPC SECURITY DEFINER = sanitized read of sensitive data. Client direct = everything RLS already covers.
- **D-02:** Hybrid baseline + forward migration. `pg_dump` schema-only -> `supabase/migrations/20260419000000_baseline.sql`. Legacy scripts archived in `docs/sql/legacy/`.
- **D-02a:** Validation: `supabase db reset` -> `npm run db:types` -> `npm run tsc`. If tsc passes, baseline is correct.
- **D-02b:** Forward migrations: `0002_rls_anon_to_rpc.sql`, `0003_unified_auth_role.sql`, `0004_check_candidato_duplicate_rpc.sql`.
- **D-02c:** Seed: `supabase/seed.sql` with 3 fake candidatos + 2 fake vagas + 1 fake RH user (dev local only).
- **D-02d:** NEVER apply migrations to prod without staging/preview. Use Supabase branching via Vercel Marketplace.
- **D-03:** Isolate RH code via re-export compatibility. `adminAuthStore.ts` becomes: `export const useAdminAuthStore = useAuthStore`. RH pages keep compiling. Real cleanup deferred to M2.
- **D-03b:** `supabaseAdmin` removed from `client.ts`. Any direct import of `supabaseAdmin` in RH pages must be identified and removed/stubbed.
- **D-04:** Loading spinner with 200ms delay using `<LoadingDelay delay={200}>`. Base component: `<Loader2 className="animate-spin" />` from lucide-react.
- **D-05:** Wrong role -> redirect to role's home + toast (Sonner). Candidato in `/rh/*` -> `/candidato/perfil`. RH in `/candidato/*` -> `/rh/dashboard`. No role -> `/auth/login`.
- **D-06:** `RoleGuard` centralized component. Accepts `role: Role | Role[]` where `Role = 'candidato' | 'rh' | 'administrador'`. Verification order: (1) isLoading -> spinner, (2) no session -> redirect login, (3) wrong role -> redirect home + toast, (4) correct role -> render children.

### Claude's Discretion
- Internal structure of `RoleGuard` (hooks, effects, composition) -- must respect verification order and 200ms delay
- Exact naming of migration files (timestamps vs sequential) -- must follow Supabase CLI pattern
- How to organize `_shared/` inside `supabase/functions/` (shared Zod schemas)
- Implementation of `LoadingDelay` (setTimeout vs useEffect vs CSS transition)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | service_role removed from client-side bundle; privileged ops via Edge Functions | Remove `supabaseAdmin` from `client.ts`, delete `VITE_SUPABASE_SERVICE_ROLE_KEY` usage, create `cadastrar-candidato` Edge Function |
| FOUND-02 | Auth unified in 1 Zustand store with user, session, role, profile, isLoading | Merge `authStore` + `adminAuthStore` into single store, add `role` field derived from JWT claims |
| FOUND-03 | Role read from `usuarios_rh`/`candidatos` table via Custom Access Token Hook in JWT | Create PL/pgSQL `custom_access_token_hook` that queries both tables, inject role into JWT `app_metadata` |
| FOUND-04 | RoleGuard centralized redirects by role + destination (replaces ProtectedRoute + ProtectedAdminRoute) | Build `RoleGuard` component per D-06, update all routes in `routes.tsx` |
| FOUND-05 | Protected route without session redirects to `/auth/login` with `?redirect=` preserved | RoleGuard handles this in step (2) of verification order |
| FOUND-06 | Logout clears session in all tabs via `onAuthStateChange` | Supabase `onAuthStateChange` fires `SIGNED_OUT` across tabs when using localStorage; single listener in RootLayout |
| FOUND-07 | `npm run db:types` generates `database.types.ts`; `tsc --noEmit` passes | Add script to package.json: `npx supabase gen types typescript --project-id $PROJECT_ID > database.types.ts` |
| FOUND-08 | Husky pre-commit hook runs `tsc --noEmit` | Install husky, create `.husky/pre-commit` with `npm run lint` |
| FOUND-09 | Migrations consolidated in `supabase/migrations/` numbered (source of truth) | Baseline + forward migrations per D-02 |
| FOUND-10 | RLS anonymous SELECT on `candidatos` moved to RPC SECURITY DEFINER returning `{ exists: boolean }` | Create `check_candidato_duplicate` function per D-01a |
| FOUND-11 | Manual "Lembrar-me" flags removed; delegated to native Supabase `persistSession` | Remove `auth-session-temporary`, `auth-was-temporary` localStorage/sessionStorage logic from App.tsx |
| FOUND-12 | `adminAuthStore.ts` deleted; `supabaseAdmin` removed from `client.ts` | Re-export compatibility shim per D-03, remove supabaseAdmin export |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| service_role key removal | Frontend Client | -- | Key is imported via Vite env var in `client.ts`; removal is a client-side code change |
| Edge Function `cadastrar-candidato` | API / Backend (Supabase Edge) | -- | Privileged operation (signUp + insert) must run server-side with service_role |
| RPC `check_candidato_duplicate` | Database (Postgres) | -- | SECURITY DEFINER function runs in Postgres, called via client `.rpc()` |
| Custom Access Token Hook | Database (Postgres) | -- | PL/pgSQL function runs in auth pipeline before JWT is issued |
| Unified auth store (Zustand) | Frontend Client | -- | Client-side state management, reads JWT claims |
| RoleGuard component | Frontend Client | -- | React component wrapping routes, reads auth store |
| Cross-tab logout | Frontend Client | -- | Supabase JS handles via localStorage `storage` events + `onAuthStateChange` |
| Migrations baseline | Database (Postgres) | -- | Schema-only pg_dump applied via Supabase CLI |
| Types pipeline (`db:types`) | Build tooling | -- | Supabase CLI generates types, husky enforces at commit time |
| Husky pre-commit | Build tooling | -- | Git hook runs `tsc --noEmit` |

## Standard Stack

### Core (already installed)
| Library | Version (project) | Version (registry) | Purpose | Why Standard |
|---------|-------------------|-------------------|---------|--------------|
| zustand | ^4.5.2 | 5.0.12 | Auth state management | Already in project; single store pattern is idiomatic [VERIFIED: package.json + npm registry] |
| @supabase/supabase-js | ^2.48.1 | 2.103.3 | Supabase client (auth, DB, functions) | Already in project; `functions.invoke()` for Edge Functions [VERIFIED: package.json + npm registry] |
| zod | ^3.22.4 | 4.3.6 | Input validation (shared schemas for Edge Functions) | Already in project; used in forms [VERIFIED: package.json + npm registry] |
| react-router-dom | ^6.28.0 | -- | Routing + Navigate for guards | Already in project [VERIFIED: package.json] |
| sonner | ^2.0.3 | -- | Toast notifications for role redirects | Already in project [VERIFIED: package.json] |
| lucide-react | ^0.487.0 | -- | Loader2 icon for spinner | Already in project [VERIFIED: package.json] |

### New Dependencies Required
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| husky | ^9.1.7 | Git hooks (pre-commit) | FOUND-08: run `tsc --noEmit` before commits [VERIFIED: npm registry] |

### No New Dependencies Needed
The phase does NOT require any new runtime dependencies. All functionality is covered by existing libraries. Husky is the only new dev dependency.

**Zustand version note:** The project pins `^4.5.2` while registry has `5.0.12`. Zustand v5 is a major version with breaking changes (requires React 18.x minimum, which this project has). However, upgrading Zustand is OUT OF SCOPE for this phase. The `^4.5.2` range is fine -- all patterns documented here work with v4. [ASSUMED]

**Installation:**
```bash
npm install -D husky
npx husky init
```

## Architecture Patterns

### System Architecture Diagram

```
Browser Tab A                          Browser Tab B
     |                                      |
     v                                      v
[React App]                           [React App]
     |                                      |
     v                                      v
[useAuthStore (Zustand + persist)]    [useAuthStore (Zustand + persist)]
     |         ^                            |         ^
     |         | (storage event)            |         | (storage event)
     v         |                            v         |
[localStorage: auth-storage]  <-------->  [localStorage: auth-storage]
     |
     v
[supabase.auth.onAuthStateChange] -----> fires SIGNED_OUT across tabs
     |
     v
[supabase client (anon key only)]
     |
     +--- .rpc('check_candidato_duplicate') --> [Postgres: SECURITY DEFINER fn]
     |
     +--- .functions.invoke('cadastrar-candidato') --> [Edge Function: Deno]
     |                                                       |
     |                                                       v
     |                                                 [supabaseAdmin (service_role)]
     |                                                       |
     |                                                       +--- auth.admin.signUp()
     |                                                       +--- .from('candidatos').insert()
     |                                                       +--- .from('autorizacoes').insert()
     |
     +--- .auth.getSession() --> JWT contains { app_metadata: { role: 'candidato'|'rh'|'administrador' } }
                                       ^
                                       |
                              [Postgres: custom_access_token_hook]
                                       |
                              Queries candidatos + usuarios_rh tables
```

### Recommended Project Structure (changes for Phase 1)
```
src/
├── store/
│   ├── authStore.ts              # MODIFIED: unified store with role, profile
│   └── adminAuthStore.ts         # MODIFIED: re-export shim only
├── components/
│   ├── RoleGuard.tsx             # NEW: centralized route guard
│   ├── LoadingDelay.tsx          # NEW: 200ms delayed spinner
│   ├── ProtectedRoute.tsx        # DELETED (replaced by RoleGuard)
│   └── ProtectedAdminRoute.tsx   # DELETED (replaced by RoleGuard)
├── lib/supabase/
│   └── client.ts                 # MODIFIED: supabaseAdmin removed
├── router/
│   └── routes.tsx                # MODIFIED: use RoleGuard
├── App.tsx                       # MODIFIED: single store init, remove "Lembrar-me" hacks
└── hooks/
    └── useSessionTimeout.ts      # MODIFIED: import from unified store

supabase/
├── migrations/
│   ├── 20260419000000_baseline.sql              # NEW: pg_dump schema-only
│   ├── 20260420000001_rls_anon_to_rpc.sql       # NEW: FOUND-10
│   ├── 20260420000002_unified_auth_role.sql     # NEW: FOUND-03
│   └── 20260420000003_check_candidato_duplicate_rpc.sql  # NEW: D-01a
├── functions/
│   ├── _shared/
│   │   └── schemas.ts            # NEW: shared Zod schemas (Deno-compatible)
│   └── cadastrar-candidato/
│       └── index.ts              # NEW: FOUND-01
├── seed.sql                      # NEW: dev data
└── config.toml                   # Supabase CLI config
```

### Pattern 1: Unified Auth Store with Role from JWT
**What:** Single Zustand store that reads role from JWT `app_metadata.role` instead of querying a table at runtime.
**When to use:** After Custom Access Token Hook is deployed (migration `0003`).
**Example:**
```typescript
// Source: Supabase docs custom-access-token-hook + Zustand persist pattern
// src/store/authStore.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export type Role = 'candidato' | 'rh' | 'administrador'

export interface AuthState {
  user: User | null
  session: Session | null
  role: Role | null
  profile: Record<string, unknown> | null  // candidato or usuario_rh row
  isLoading: boolean
  isAuthenticated: boolean

  initialize: () => Promise<void>
  logout: () => Promise<void>
  clearAuth: () => void
}

// Extract role from JWT app_metadata
function extractRole(session: Session | null): Role | null {
  if (!session?.user) return null
  const role = session.user.app_metadata?.role
  if (role === 'candidato' || role === 'rh' || role === 'administrador') return role
  return null
}
```

### Pattern 2: Custom Access Token Hook (PL/pgSQL)
**What:** Postgres function that runs in the Supabase Auth pipeline to inject custom claims into JWTs before they are issued.
**When to use:** To add `role` to JWT so the client can read it without an extra DB query.
**Example:**
```sql
-- Source: Supabase official docs - custom-access-token-hook.mdx [CITED: context7]
-- Migration: 0003_unified_auth_role.sql

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- Check usuarios_rh first (rh or administrador)
  SELECT role INTO user_role
  FROM public.usuarios_rh
  WHERE user_id = (event->>'user_id')::uuid
    AND ativo = true
    AND deleted_at IS NULL;

  -- If not RH, check candidatos
  IF user_role IS NULL THEN
    PERFORM 1 FROM public.candidatos
    WHERE user_id = (event->>'user_id')::uuid;
    IF FOUND THEN
      user_role := 'candidato';
    END IF;
  END IF;

  claims := event->'claims';

  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(COALESCE(user_role, 'candidato')));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant permissions for auth admin to execute
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Grant read access to the tables the hook queries
GRANT SELECT ON public.usuarios_rh TO supabase_auth_admin;
GRANT SELECT ON public.candidatos TO supabase_auth_admin;
```

**CRITICAL:** After deploying this migration, the hook must be **enabled in Supabase Dashboard** under Authentication > Hooks > Custom Access Token. The migration creates the function but does NOT enable it -- that requires a Dashboard action or API call. [CITED: Supabase docs custom-access-token-hook.mdx]

### Pattern 3: RPC SECURITY DEFINER for Duplicate Check
**What:** Postgres function that checks for duplicate CPF/email without exposing the candidatos table to anonymous SELECT.
**Example:**
```sql
-- Source: Supabase RLS best practices [CITED: context7]
-- Migration: 0004_check_candidato_duplicate_rpc.sql

CREATE OR REPLACE FUNCTION public.check_candidato_duplicate(
  p_cpf text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'cpf_exists', EXISTS(SELECT 1 FROM public.candidatos WHERE cpf = p_cpf),
    'email_exists', EXISTS(SELECT 1 FROM public.candidatos WHERE email = p_email)
  ) INTO result;

  RETURN result;
END;
$$;

-- Only anon and authenticated can call this
GRANT EXECUTE ON FUNCTION public.check_candidato_duplicate TO anon, authenticated;
```

### Pattern 4: Edge Function Structure (Deno)
**What:** Supabase Edge Function using Deno.serve pattern with service_role client.
**Example:**
```typescript
// Source: Supabase Edge Functions docs [CITED: context7]
// supabase/functions/cadastrar-candidato/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    // Validate with shared Zod schema (import from _shared/)

    // Create admin client inside the function (service_role stays server-side)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ... signUp + insert candidatos + insert autorizacoes atomically

    return new Response(
      JSON.stringify({ ok: true, data: { candidatoId, userId } }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

### Pattern 5: Cross-Tab Logout via onAuthStateChange
**What:** Supabase JS automatically fires `SIGNED_OUT` event across browser tabs because it uses `localStorage` as the storage medium. When one tab calls `signOut()`, the localStorage key is removed, triggering a `storage` event in other tabs, which Supabase JS picks up and fires `onAuthStateChange`.
**Key requirement:** The `onAuthStateChange` listener in `App.tsx` must call `clearAuth()` on the unified store when `SIGNED_OUT` fires. [VERIFIED: Supabase source code uses BroadcastChannel + localStorage storage events]

### Anti-Patterns to Avoid
- **Two auth stores:** Current codebase has `authStore` + `adminAuthStore` both calling `supabase.auth.getSession()` and both listening to auth changes. This creates race conditions and double-initializes.
- **Manual "Lembrar-me" flags:** The current `App.tsx` has `sessionStorage`/`localStorage` flags (`auth-session-temporary`, `auth-was-temporary`) to simulate session persistence. Supabase already handles this via `persistSession` option in `createClient`. Remove all manual logic.
- **service_role in VITE_ env var:** Any `VITE_*` variable is bundled into the client JS. The service_role key MUST NOT be in any `VITE_` prefixed variable. It should only exist in Edge Function environment (set via `supabase secrets set`).
- **Inline auth checks in components:** Components should not check `isAuthenticated` themselves. All access control goes through `RoleGuard` in the router.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT role injection | Custom middleware parsing tokens | Supabase Custom Access Token Hook | Runs in auth pipeline, no client-side token manipulation needed [CITED: context7] |
| Cross-tab session sync | Manual BroadcastChannel or storage events | Supabase `onAuthStateChange` + localStorage persistence | Supabase JS handles this natively when `persistSession: true` and storage is `localStorage` [VERIFIED: Supabase docs] |
| Pre-commit type checking | Custom git hook scripts | Husky + `npm run lint` | Standard tooling, handles `.husky/pre-commit` lifecycle correctly [VERIFIED: npm registry] |
| Duplicate check without exposing table | Client-side query with RLS | RPC `SECURITY DEFINER` function | Zero cold start, runs in Postgres, returns only boolean flags [CITED: context7 RLS best practices] |
| Session persistence ("Lembrar-me") | Manual localStorage/sessionStorage flags | Supabase `persistSession` option in `createClient` | Native Supabase feature, handles token refresh automatically [VERIFIED: Supabase docs] |

## Common Pitfalls

### Pitfall 1: Custom Access Token Hook Not Enabled After Migration
**What goes wrong:** The migration creates the PL/pgSQL function, but the hook is not enabled in Supabase Dashboard. JWTs continue without the `role` claim.
**Why it happens:** Enabling the hook requires a Supabase Dashboard action (Authentication > Hooks) or API call -- it cannot be done purely through SQL migrations.
**How to avoid:** Include a manual step in the plan to enable the hook in the Dashboard after deploying migration `0003`. Add a verification step that decodes a fresh JWT and confirms the `role` claim exists.
**Warning signs:** `session.user.app_metadata.role` returns `undefined` after login.

### Pitfall 2: Zustand Persist Rehydration Race with onAuthStateChange
**What goes wrong:** On page load, Zustand rehydrates stale state from localStorage before `onAuthStateChange` fires with the current session. This causes a brief flash where the store has old data.
**Why it happens:** Zustand `persist` middleware synchronously loads from localStorage, but Supabase auth check is async.
**How to avoid:** Set `isLoading: true` as the initial state. The `initialize()` function sets `isLoading: false` only AFTER `getSession()` completes. The `RoleGuard` shows a spinner while `isLoading` is true.
**Warning signs:** User sees a flash of login page before being redirected to their dashboard.

### Pitfall 3: Edge Function CORS on Browser Invoke
**What goes wrong:** Client calls `supabase.functions.invoke('cadastrar-candidato')` but gets a CORS error.
**Why it happens:** Edge Functions need CORS headers. When using `supabase.functions.invoke()` from the official client library, CORS is handled automatically because the request goes through the Supabase project URL. But if calling directly via `fetch`, CORS headers must be set manually.
**How to avoid:** Always use `supabase.functions.invoke()` from the Supabase JS client, not raw `fetch`. [CITED: context7]
**Warning signs:** Network tab shows `OPTIONS` preflight failing.

### Pitfall 4: Missing Grants on Hook Function
**What goes wrong:** The Custom Access Token Hook function fails silently because `supabase_auth_admin` does not have SELECT permission on `candidatos` or `usuarios_rh`.
**Why it happens:** The function queries these tables but the grants are not included in the migration.
**How to avoid:** The migration MUST include `GRANT SELECT ON public.candidatos TO supabase_auth_admin` and same for `usuarios_rh`. See Pattern 2 code example.
**Warning signs:** Auth works but role is always `null` or defaults to `'candidato'`.

### Pitfall 5: adminAuthStore Re-Export Breaking Type Contracts
**What goes wrong:** RH pages import `useAdminAuthStore` and access `.adminUser`, `.hasPermission()`, `.hasRole()` -- properties that don't exist on the unified `useAuthStore`.
**Why it happens:** The re-export shim `export const useAdminAuthStore = useAuthStore` maps the name but not the interface.
**How to avoid:** The re-export file must also re-export compatibility types and derived selectors that map unified store fields to the old API surface. For MVP, keep the shim thin: re-export the store and add adapter selectors for `adminUser`, `hasPermission`, `hasRole`.
**Warning signs:** TypeScript errors in RH pages after the refactor.

### Pitfall 6: Vite Env Var Leak After Removing service_role
**What goes wrong:** `VITE_SUPABASE_SERVICE_ROLE_KEY` is removed from code but remains in `.env.local`. Vite still bundles it, making it accessible via `import.meta.env`.
**How to avoid:** Remove the variable from `.env.local` AND `.env` AND any `.env.*` files. Rename it WITHOUT the `VITE_` prefix if it's needed for local Supabase CLI. Add a build-time check: grep the built JS for the service_role key pattern.
**Warning signs:** `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` returns a value in browser devtools.

## Code Examples

### Unified Auth Store (complete skeleton)
```typescript
// Source: Zustand v4 docs [CITED: context7 /pmndrs/zustand]
// src/store/authStore.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export type Role = 'candidato' | 'rh' | 'administrador'

export interface AuthState {
  user: User | null
  session: Session | null
  role: Role | null
  profile: Record<string, unknown> | null
  isLoading: boolean
  isAuthenticated: boolean

  initialize: () => Promise<void>
  logout: () => Promise<void>
  clearAuth: () => void
  setSession: (session: Session | null) => void
}

function extractRole(session: Session | null): Role | null {
  const role = session?.user?.app_metadata?.role
  if (role === 'candidato' || role === 'rh' || role === 'administrador') return role
  return null
}

async function fetchProfile(userId: string, role: Role | null) {
  if (role === 'rh' || role === 'administrador') {
    const { data } = await supabase
      .from('usuarios_rh')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .is('deleted_at', null)
      .single()
    return data
  }
  // Default: candidato
  const { data } = await supabase
    .from('candidatos')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      role: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      clearAuth: () => set({
        user: null, session: null, role: null, profile: null,
        isAuthenticated: false,
      }),

      setSession: (session) => {
        const role = extractRole(session)
        set({
          session,
          user: session?.user ?? null,
          role,
          isAuthenticated: !!session,
        })
      },

      initialize: async () => {
        try {
          set({ isLoading: true })
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const role = extractRole(session)
            const profile = await fetchProfile(session.user.id, role)
            set({ user: session.user, session, role, profile, isAuthenticated: true })
          } else {
            get().clearAuth()
          }
        } catch {
          get().clearAuth()
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try { await supabase.auth.signOut() } catch { /* noop */ }
        get().clearAuth()
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
```

### RoleGuard Component
```typescript
// src/components/RoleGuard.tsx
import { type ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useAuthStore, type Role } from '@/store/authStore'

interface RoleGuardProps {
  children: ReactNode
  role: Role | Role[]
}

const ROLE_HOME: Record<Role, string> = {
  candidato: '/candidato/perfil',
  rh: '/rh/dashboard',
  administrador: '/rh/dashboard',
}

export function RoleGuard({ children, role: allowedRoles }: RoleGuardProps) {
  const { isLoading, isAuthenticated, role } = useAuthStore()
  const location = useLocation()
  const [showSpinner, setShowSpinner] = useState(false)

  // 200ms delay before showing spinner
  useEffect(() => {
    if (!isLoading) { setShowSpinner(false); return }
    const timer = setTimeout(() => setShowSpinner(true), 200)
    return () => clearTimeout(timer)
  }, [isLoading])

  // (1) Loading
  if (isLoading) {
    if (!showSpinner) return null // blank for <200ms
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // (2) No session
  if (!isAuthenticated || !role) {
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }

  // (3) Wrong role
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  if (!roles.includes(role)) {
    const home = ROLE_HOME[role]
    toast.info(
      role === 'candidato'
        ? 'Esta area e exclusiva para recrutadores'
        : 'Esta area e exclusiva para candidatos'
    )
    return <Navigate to={home} replace />
  }

  // (4) Authorized
  return <>{children}</>
}
```

### adminAuthStore Re-Export Shim
```typescript
// src/store/adminAuthStore.ts (COMPATIBILITY SHIM)
// Re-exports from unified store for backward compatibility
// Real cleanup deferred to M2

export { useAuthStore as useAdminAuthStore } from './authStore'
export type { Role as RoleType } from './authStore'

// Legacy selector hooks -- map to unified store
export const useIsAdminAuthenticated = () =>
  useAuthStore((s) => s.isAuthenticated && (s.role === 'rh' || s.role === 'administrador'))
export const useAdminUser = () => useAuthStore((s) => s.profile)
export const useAdminRole = () => useAuthStore((s) => s.role)
export const useAdminAuthLoading = () => useAuthStore((s) => s.isLoading)

import { useAuthStore } from './authStore'
```

### Client.ts After Cleanup
```typescript
// src/lib/supabase/client.ts (AFTER Phase 1)
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,  // Replaces manual "Lembrar-me"
    flowType: 'pkce',
    storageKey: 'sb-auth-token',
  },
})

// supabaseAdmin REMOVED -- service_role key must NEVER be in client code
// Privileged operations go through Edge Functions (supabase.functions.invoke)

export type { Database }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `supabaseAdmin` in client bundle | Edge Functions for privileged ops | Supabase Edge Functions GA (2023) | service_role key never reaches browser |
| Two separate auth stores | Single store with role from JWT | Supabase Custom Access Token Hooks (2024) | No runtime role query, consistent state |
| Manual session persistence flags | `persistSession` in `createClient` | Supabase JS v2 (2022) | Zero custom code for session handling |
| `ProtectedRoute` + `ProtectedAdminRoute` | Single `RoleGuard` with role prop | React pattern evolution | DRY, centralized access control |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Zustand v4 `^4.5.2` supports all patterns needed; no upgrade required | Standard Stack | LOW -- v4 is stable and widely used; upgrade would be additive |
| A2 | `usuarios_rh.role` column values are `'recrutador'` and `'administrador'` based on current `adminAuthStore.ts` types | Pattern 2 (Hook) | MEDIUM -- if DB uses different values, hook returns null role. Verify with `SELECT DISTINCT role FROM usuarios_rh` |
| A3 | Supabase `onAuthStateChange` cross-tab behavior works via localStorage storage events + BroadcastChannel | Pattern 5 | LOW -- this is documented Supabase behavior and confirmed in source |
| A4 | The Custom Access Token Hook maps `recrutador` -> `rh` in JWT for simpler frontend role model | Pattern 2 | MEDIUM -- if not mapped, frontend needs to handle both `recrutador` and `rh` as role values |

## Open Questions (RESOLVED)

1. **What are the exact role values in `usuarios_rh.role`?** — RESOLVED in Plan 04, Task 1: Custom Access Token Hook maps `'recrutador'` -> `'rh'` via CASE statement for frontend consistency with `/rh/*` routes.
   - What we know: `adminAuthStore.ts` defines `RoleType = 'recrutador' | 'administrador'`
   - Resolution: Map to `'rh'` in the hook for consistency with route prefixes (`/rh/*`)

2. **Is the `db:types` script using local or remote Supabase?** — RESOLVED in Plan 04, Task 2: Uses `--local` flag for dev, `--project-id` for CI.
   - What we know: No `db:types` script exists yet; Supabase CLI v2.53.6 is installed
   - Resolution: Use `--local` for dev (after `supabase db reset` applies migrations), `--project-id` for CI

3. **What RLS policies on `candidatos` allow anonymous SELECT currently?** — RESOLVED in Plan 04, Task 1: Migration includes discovery query `SELECT policyname FROM pg_policies WHERE tablename = 'candidatos' AND roles @> '{anon}'` before revoking.
   - What we know: FOUND-10 says anonymous SELECT exists and must be moved to RPC
   - Resolution: Run discovery query during migration task, revoke identified policies

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | db:types, migrations, Edge Functions | Yes | 2.53.6 | -- |
| Node.js | Build, dev server | Yes | (via npm/npx) | -- |
| Husky | Pre-commit hooks (FOUND-08) | No (not installed) | 9.1.7 (registry) | Install as dev dependency |
| Deno | Edge Functions local dev | Unknown | -- | Supabase CLI bundles Deno for `functions serve` |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- Husky: install via `npm install -D husky && npx husky init`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.7 (unit) + Playwright 1.56.1 (E2E) |
| Config file | `vite.config.ts` (inline vitest config) + `playwright.config.ts` |
| Quick run command | `npm run test:run` |
| Full suite command | `npm run test:run && npm run test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | No service_role key in build output | unit/build | `npm run build && ! grep -r 'service_role' build/` | No -- Wave 0 |
| FOUND-02 | Single auth store with all fields | unit | `vitest run src/store/__tests__/authStore.test.ts` | No -- Wave 0 |
| FOUND-04 | RoleGuard redirects correctly | unit | `vitest run src/components/__tests__/RoleGuard.test.tsx` | No -- Wave 0 |
| FOUND-05 | Unauthenticated redirect preserves ?redirect= | unit | Same RoleGuard test | No -- Wave 0 |
| FOUND-06 | Cross-tab logout | E2E (manual-only) | Manual: open 2 tabs, logout in one, verify other | Manual only -- browser storage events hard to test in Vitest |
| FOUND-07 | db:types + tsc passes | build | `npm run db:types && npm run lint` | No -- Wave 0 (script) |
| FOUND-08 | Pre-commit runs tsc | manual-only | `git commit --allow-empty -m "test"` | No -- Wave 0 (husky) |
| FOUND-10 | RPC returns {cpf_exists, email_exists} | integration | Requires Supabase local; `vitest run` with Supabase mock | No -- Wave 0 |
| FOUND-11 | No manual "Lembrar-me" flags in code | unit/grep | `! grep -r 'auth-session-temporary' src/ && ! grep -r 'auth-was-temporary' src/` | No -- Wave 0 |
| FOUND-12 | No supabaseAdmin in src/ | unit/grep | `! grep -r 'supabaseAdmin' src/` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run lint` (tsc --noEmit)
- **Per wave merge:** `npm run test:run && npm run lint`
- **Phase gate:** Full suite green + manual cross-tab logout test + bundle grep for service_role

### Wave 0 Gaps
- [ ] `src/store/__tests__/authStore.test.ts` -- covers FOUND-02, FOUND-06 (partial)
- [ ] `src/components/__tests__/RoleGuard.test.tsx` -- covers FOUND-04, FOUND-05
- [ ] Vitest setup file with auth store mocks / Supabase client mock
- [ ] `npm run db:types` script in package.json

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth (JWT + PKCE flow) |
| V3 Session Management | Yes | Supabase `persistSession` + `onAuthStateChange` cross-tab |
| V4 Access Control | Yes | RoleGuard (frontend) + RLS (backend) + Custom Access Token Hook |
| V5 Input Validation | Yes | Zod schemas (Edge Function input validation) |
| V6 Cryptography | No | Supabase handles password hashing (bcrypt) |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| service_role key in client bundle | Information Disclosure | Remove from VITE_ env vars; use only in Edge Functions |
| Direct anonymous SELECT on candidatos (CPF/email leak) | Information Disclosure | RPC SECURITY DEFINER returning only boolean flags |
| JWT role tampering | Elevation of Privilege | Role injected server-side via Custom Access Token Hook; client cannot modify |
| Cross-tab session desync | Spoofing | Supabase `onAuthStateChange` + localStorage sync |
| Stale JWT with old role after role change | Elevation of Privilege | Token refresh on auth state change; short JWT expiry (default 1h) |

## Sources

### Primary (HIGH confidence)
- Context7 `/supabase/supabase` -- Custom Access Token Hook, Edge Functions, RPC SECURITY DEFINER, onAuthStateChange
- Context7 `/pmndrs/zustand` -- Persist middleware, store patterns
- npm registry -- verified versions: zustand 5.0.12, @supabase/supabase-js 2.103.3, zod 4.3.6, husky 9.1.7
- Codebase analysis -- `authStore.ts`, `adminAuthStore.ts`, `client.ts`, `ProtectedRoute.tsx`, `ProtectedAdminRoute.tsx`, `App.tsx`, `routes.tsx`, `cadastroService.ts`

### Secondary (MEDIUM confidence)
- Supabase docs on Custom Access Token Hook enablement (Dashboard step required after migration)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, versions verified against npm registry
- Architecture: HIGH -- patterns verified against official Supabase docs via Context7, codebase thoroughly analyzed
- Pitfalls: HIGH -- derived from actual code analysis (e.g., `VITE_` prefix leak is visible in `client.ts`)

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable stack, no fast-moving dependencies)
