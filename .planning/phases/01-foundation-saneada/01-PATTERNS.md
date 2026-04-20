# Phase 1: Foundation Saneada - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 16 new/modified files
**Analogs found:** 14 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/store/authStore.ts` | store | request-response | `src/store/authStore.ts` (self - refactor) | exact |
| `src/store/adminAuthStore.ts` | store | request-response | `src/store/adminAuthStore.ts` (self - convert to shim) | exact |
| `src/lib/supabase/client.ts` | config | request-response | `src/lib/supabase/client.ts` (self - remove supabaseAdmin) | exact |
| `src/components/RoleGuard.tsx` | component | request-response | `src/components/ProtectedRoute.tsx` + `src/components/ProtectedAdminRoute.tsx` | exact |
| `src/components/LoadingDelay.tsx` | component | request-response | `src/components/ProtectedRoute.tsx` (loading section) | role-match |
| `src/router/routes.tsx` | route | request-response | `src/router/routes.tsx` (self - swap guards) | exact |
| `src/App.tsx` | provider | event-driven | `src/App.tsx` (self - simplify init) | exact |
| `src/hooks/useSessionTimeout.ts` | hook | event-driven | `src/hooks/useSessionTimeout.ts` (self - change import) | exact |
| `src/features/cadastro/services/cadastroService.ts` | service | CRUD | `src/features/cadastro/services/cadastroService.ts` (self - stub supabaseAdmin calls) | exact |
| `src/features/cadastro/services/duplicateCheckService.ts` | service | CRUD | `src/features/cadastro/services/duplicateCheckService.ts` (self - migrate to RPC) | exact |
| `supabase/functions/cadastrar-candidato/index.ts` | controller | request-response | `src/features/cadastro/services/cadastroService.ts` (logic source) | role-match |
| `supabase/functions/_shared/schemas.ts` | utility | transform | `src/features/cadastro/schemas/candidatoSchema.ts` | role-match |
| `supabase/migrations/20260419000000_baseline.sql` | migration | batch | `supabase/migrations/20250116_create_logs_acesso_table.sql` | role-match |
| `supabase/migrations/*_rls_anon_to_rpc.sql` | migration | batch | (same pattern as baseline) | role-match |
| `supabase/migrations/*_unified_auth_role.sql` | migration | batch | (same pattern as baseline) | role-match |
| `supabase/migrations/*_check_candidato_duplicate_rpc.sql` | migration | batch | (same pattern as baseline) | role-match |

## Pattern Assignments

### `src/store/authStore.ts` (store, request-response) -- MODIFY

**Analog:** `src/store/authStore.ts` (self, lines 1-199) + `src/store/adminAuthStore.ts` (merge source)

**Imports pattern** (lines 1-14):
```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '../../database.types'
import { supabase } from '@/lib/supabase/client'
```

**Core store pattern** (lines 48-178):
```typescript
// Zustand create + persist middleware skeleton
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // State fields
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,

      // Actions use get().clearUser() pattern for internal calls
      clearUser: () => {
        set({ user: null, session: null, isAuthenticated: false })
      },

      initialize: async () => {
        try {
          set({ isLoading: true })
          const { data: { session }, error } = await supabase.auth.getSession()
          // ... profile fetch based on role
        } catch (error) {
          get().clearUser()
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try { await supabase.auth.signOut() } catch (error) { /* log */ }
        get().clearUser()
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
```

**Selector hooks pattern** (lines 183-199):
```typescript
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useCandidato = () => useAuthStore((state) => state.candidato)
export const useUser = () => useAuthStore((state) => state.user)
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)
```

**Key changes for Phase 1:**
- Add `role: Role | null` and `profile: Record<string, unknown> | null` to state
- Add `extractRole(session)` helper reading `session.user.app_metadata.role`
- Add `fetchProfile(userId, role)` that queries `candidatos` or `usuarios_rh` based on role
- Rename `candidato` to `profile` (generic for both personas)
- Preserve `clearUser` -> rename to `clearAuth` for clarity

---

### `src/store/adminAuthStore.ts` (store, request-response) -- REWRITE to shim

**Analog:** `src/store/adminAuthStore.ts` (self, lines 1-415)

**Current API surface used by RH pages** (lines 384-414):
```typescript
// These selector hooks must be preserved as re-exports
export const useIsAdminAuthenticated = () => useAdminAuthStore((state) => state.isAuthenticated)
export const useAdminUser = () => useAdminAuthStore((state) => state.adminUser)
export const useAdminRole = () => useAdminAuthStore((state) => state.role)
export const useAdminAuthLoading = () => useAdminAuthStore((state) => state.isLoading)
export const useAdminPermission = (permission: keyof PermissoesRH) => { ... }
export const useAdminHasRole = (requiredRole: RoleType) => { ... }
```

**Exported types that must be preserved** (lines 26-85):
```typescript
export type RoleType = 'recrutador' | 'administrador'
export interface UsuarioRH { ... }
export interface PermissoesRH { ... }
```

**Key changes for Phase 1:**
- Replace entire store with re-exports from unified `authStore`
- `export const useAdminAuthStore = useAuthStore`
- Map selector hooks: `useAdminUser` -> `useAuthStore(s => s.profile)`, etc.
- Keep `RoleType`, `UsuarioRH`, `PermissoesRH` type exports for backward compat
- Keep `DEFAULT_PERMISSIONS` map for `hasPermission` adapter

---

### `src/lib/supabase/client.ts` (config, request-response) -- MODIFY

**Analog:** `src/lib/supabase/client.ts` (self, lines 1-128)

**Anon client pattern to KEEP** (lines 42-62):
```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    flowType: 'pkce',
    storageKey: 'sb-auth-token'
  }
})
```

**Code to REMOVE** (lines 14, 23-29, 79-90):
```typescript
// DELETE line 14:
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// DELETE lines 23-29 (service role warning):
if (!supabaseServiceRoleKey || supabaseServiceRoleKey === 'YOUR_SERVICE_ROLE_KEY_HERE') { ... }

// DELETE lines 79-90 (entire supabaseAdmin client):
export const supabaseAdmin = createClient<Database>(...)
```

**Helper functions to KEEP** (lines 95-125):
```typescript
export const hasActiveSession = async (): Promise<boolean> => { ... }
export const getCurrentUser = async () => { ... }
export const signOut = async () => { ... }
export type { Database }
```

---

### `src/components/RoleGuard.tsx` (component, request-response) -- NEW

**Analog:** `src/components/ProtectedRoute.tsx` (lines 1-80) + `src/components/ProtectedAdminRoute.tsx` (lines 1-162)

**Imports pattern** (from ProtectedRoute lines 11-14 + ProtectedAdminRoute lines 15-16):
```typescript
import { ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
// NEW: replace custom spinner with Loader2
import { Loader2 } from 'lucide-react'
// NEW: import from unified store
import { useAuthStore, type Role } from '@/store/authStore'
```

**Loading spinner pattern** (from ProtectedRoute lines 56-65):
```typescript
// CURRENT: full-page gradient spinner
if (isLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00109E] to-[#0066CC]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg drop-shadow-lg">Verificando autenticacao...</p>
      </div>
    </div>
  )
}
// NEW: simpler Loader2 spinner with 200ms delay (per D-04)
```

**Redirect pattern** (from ProtectedRoute lines 68-75):
```typescript
if (!isAuthenticated) {
  return (
    <Navigate
      to="/auth/login"
      state={{ from: location.pathname + location.search }}
      replace
    />
  )
}
```

**Toast on wrong role pattern** (from ProtectedAdminRoute lines 141-148):
```typescript
if (requireRole && !hasRole(requireRole)) {
  toast.error('Permissao insuficiente', {
    description: `Esta area requer nivel de acesso "${requireRole}".`,
    icon: <ShieldAlert className="w-5 h-5" />,
    duration: 5000,
  })
  return <Navigate to="/rh/dashboard" replace />
}
```

**Children render pattern** (from ProtectedRoute line 79):
```typescript
return <>{children}</>
```

---

### `src/components/LoadingDelay.tsx` (component, request-response) -- NEW

**Analog:** `src/components/ProtectedRoute.tsx` (loading section, lines 56-65)

**Pattern:** Simple wrapper component using `useState` + `useEffect` with `setTimeout(200ms)`.
No existing analog for the delay pattern specifically. Use standard React `useEffect` + `setTimeout`:
```typescript
// Pattern to follow:
import { type ReactNode, useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export function LoadingDelay({ delay = 200, children }: { delay?: number; children: ReactNode }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [delay])
  return show ? <>{children}</> : null
}
```

---

### `src/router/routes.tsx` (route, request-response) -- MODIFY

**Analog:** `src/router/routes.tsx` (self, lines 1-377)

**Current guard wrapping pattern** (lines 137-151):
```typescript
// Candidato routes use ProtectedRoute:
{
  path: '/candidato/dashboard',
  element: (
    <ProtectedRoute>
      <DashboardCandidatoPage />
    </ProtectedRoute>
  ),
},

// RH routes use ProtectedAdminRoute:
{
  path: '/rh/dashboard',
  element: (
    <ProtectedAdminRoute>
      <DashboardRHPage />
    </ProtectedAdminRoute>
  ),
},

// RH with role check:
{
  path: '/rh/configuracoes',
  element: (
    <ProtectedAdminRoute requireRole="administrador">
      <ConfiguracoesPage />
    </ProtectedAdminRoute>
  ),
},
```

**Key changes for Phase 1:**
- Replace `<ProtectedRoute>` with `<RoleGuard role="candidato">`
- Replace `<ProtectedAdminRoute>` with `<RoleGuard role={['rh', 'administrador']}>`
- Replace `<ProtectedAdminRoute requireRole="administrador">` with `<RoleGuard role="administrador">`
- Update imports: remove `ProtectedRoute`, `ProtectedAdminRoute`, add `RoleGuard`

---

### `src/App.tsx` (provider, event-driven) -- MODIFY

**Analog:** `src/App.tsx` (self, lines 1-275)

**QueryClient config pattern to KEEP** (lines 24-33):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})
```

**RootLayout onAuthStateChange pattern** (lines 193-222):
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // update store
    } else if (event === 'SIGNED_OUT') {
      // clear store
    } else if (event === 'TOKEN_REFRESHED' && session) {
      // update session
    } else if (event === 'USER_UPDATED' && session) {
      // update user
    }
  }
)
subscriptionRef.current = subscription
```

**Code to REMOVE** (lines 138-178):
```typescript
// DELETE: checkRememberMe() - lines 139-158
// DELETE: checkAdminRememberMe() - lines 162-177
// These are manual "Lembrar-me" hacks replaced by Supabase persistSession
```

**Key changes for Phase 1:**
- Remove `useAdminAuthStore` initialization (unified store handles both)
- Remove `checkRememberMe` / `checkAdminRememberMe` functions
- Remove `sessionStorage`/`localStorage` temporary session flags
- Single `initialize()` call, single `onAuthStateChange` listener
- `onAuthStateChange` calls unified store's `setSession` / `clearAuth`

---

### `supabase/functions/cadastrar-candidato/index.ts` (controller, request-response) -- NEW

**Analog:** `src/features/cadastro/services/cadastroService.ts` (logic source, lines 328-590)

**Business logic to port** (lines 338-519):
```typescript
// STEP 1: signUp (lines 343-355)
const authResult = await signUp({ email, password, metadata: { nome_completo, cpf } })

// STEP 2: insert candidatos (lines 362-394)
const { data: candidatoResult, error } = await supabaseAdmin
  .from('candidatos').insert(candidatoData).select('id')

// STEP 3: insert disponibilidade (lines 438-466)
// STEP 4: insert autorizacoes (lines 474-500)
```

**Error class pattern** (lines 65-82):
```typescript
export class CadastroError extends Error {
  constructor(
    message: string,
    public code: 'AUTH_FAILED' | 'INSERT_FAILED' | 'ROLLBACK_FAILED' | ...,
    public table?: string,
    public originalError?: unknown,
    public details?: unknown
  ) {
    super(message)
    this.name = 'CadastroError'
  }
}
```

**Rollback pattern** (lines 247-298):
```typescript
async function rollbackAuth(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  // ...
}
async function rollbackDatabase(userId: string, candidatoId?: string): Promise<void> {
  if (candidatoId) {
    await supabaseAdmin.from('candidatos').delete().eq('id', candidatoId)
  }
  await rollbackAuth(userId)
}
```

**Response pattern (from CONTEXT.md D-01b):**
```typescript
// Success:
return new Response(JSON.stringify({ ok: true, data: { candidatoId, userId } }),
  { headers: { 'Content-Type': 'application/json' }, status: 200 })

// Error:
return new Response(JSON.stringify({ ok: false, error: error.message }),
  { headers: { 'Content-Type': 'application/json' }, status: 400 })
```

---

### `supabase/functions/_shared/schemas.ts` (utility, transform) -- NEW

**Analog:** `src/features/cadastro/schemas/candidatoSchema.ts` (lines 1-60)

**Zod schema pattern** (lines 12-53):
```typescript
import { z } from 'zod'

const cpfSchema = z
  .string()
  .min(1, 'CPF e obrigatorio')
  .refine(validateCPF, { message: 'CPF invalido.' })

const emailSchema = z
  .string()
  .min(1, 'Email e obrigatorio')
  .email('Email invalido')
  .toLowerCase()
  .trim()
```

**Key adaptation for Deno Edge Functions:**
- Import Zod from esm.sh: `import { z } from 'https://esm.sh/zod@3'`
- Export only the subset of schemas needed by Edge Functions (signUp input)
- Keep validation messages in pt-BR

---

### `src/features/cadastro/services/duplicateCheckService.ts` (service, CRUD) -- MODIFY

**Analog:** `src/features/cadastro/services/duplicateCheckService.ts` (self, lines 1-281)

**Current direct SELECT pattern to REPLACE** (lines 143-148):
```typescript
// CURRENT: Direct anonymous SELECT on candidatos table
const { data, error } = await supabase
  .from('candidatos')
  .select('id, nome_completo, email, cpf, created_at')
  .eq('cpf', cleanedCPF)
  .maybeSingle()
```

**New RPC call pattern:**
```typescript
// NEW: Call RPC SECURITY DEFINER function
const { data, error } = await supabase
  .rpc('check_candidato_duplicate', { p_cpf: cleanedCPF, p_email: cleanedEmail })
// Returns: { cpf_exists: boolean, email_exists: boolean }
```

**Error handling pattern to KEEP** (lines 58-67):
```typescript
export class DuplicateCheckError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'DATABASE_ERROR',
    public field?: DuplicateCheckField
  ) {
    super(message)
    this.name = 'DuplicateCheckError'
  }
}
```

---

### `src/features/cadastro/services/cadastroService.ts` (service, CRUD) -- MODIFY

**Analog:** `src/features/cadastro/services/cadastroService.ts` (self, lines 1-590)

**Key changes for Phase 1:**
- Remove `import { supabaseAdmin } from '@/lib/supabase/client'` (line 19)
- Replace `supabaseAdmin` calls with `supabase.functions.invoke('cadastrar-candidato', { body: data })`
- Simplify to a single function call wrapping the Edge Function invocation
- Keep `CadastroError` class and error handling pattern

---

### SQL Migrations (migration, batch) -- NEW

**Analog:** `supabase/migrations/20250116_create_logs_acesso_table.sql`

**Migration file naming convention:**
```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

**Existing migration style** (timestamp-prefixed, descriptive suffix).

**New migrations to create:**
1. `20260419000000_baseline.sql` -- pg_dump schema-only output
2. `20260420000001_rls_anon_to_rpc.sql` -- revoke anon SELECT on candidatos, update RLS
3. `20260420000002_unified_auth_role.sql` -- custom_access_token_hook PL/pgSQL function + grants
4. `20260420000003_check_candidato_duplicate_rpc.sql` -- RPC SECURITY DEFINER function

**SQL patterns from RESEARCH.md:**

Custom Access Token Hook (Pattern 2):
```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE claims jsonb; user_role text;
BEGIN
  SELECT role INTO user_role FROM public.usuarios_rh
    WHERE user_id = (event->>'user_id')::uuid AND ativo = true AND deleted_at IS NULL;
  IF user_role IS NULL THEN
    PERFORM 1 FROM public.candidatos WHERE user_id = (event->>'user_id')::uuid;
    IF FOUND THEN user_role := 'candidato'; END IF;
  END IF;
  -- ... inject into claims
END; $$;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
```

RPC Duplicate Check (Pattern 3):
```sql
CREATE OR REPLACE FUNCTION public.check_candidato_duplicate(p_cpf text, p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN jsonb_build_object(
    'cpf_exists', EXISTS(SELECT 1 FROM public.candidatos WHERE cpf = p_cpf),
    'email_exists', EXISTS(SELECT 1 FROM public.candidatos WHERE email = p_email)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.check_candidato_duplicate TO anon, authenticated;
```

---

## Shared Patterns

### Authentication Store Access
**Source:** `src/store/authStore.ts` lines 48-178
**Apply to:** All files importing auth state (`RoleGuard`, `App.tsx`, `useSessionTimeout`, `routes.tsx`)
```typescript
// Always use selector for performance:
const { isLoading, isAuthenticated, role } = useAuthStore()
// Or individual selectors:
const isAuth = useAuthStore((s) => s.isAuthenticated)
```

### Custom Error Classes
**Source:** `src/features/cadastro/services/cadastroService.ts` lines 65-82
**Apply to:** All service files, Edge Function error handling
```typescript
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}
```

### Toast Notifications
**Source:** `src/components/ProtectedAdminRoute.tsx` lines 93-98
**Apply to:** `RoleGuard` redirect feedback
```typescript
import { toast } from 'sonner'
// Info for redirects:
toast.info('Esta area e exclusiva para recrutadores')
// Error for auth failures:
toast.error('Autenticacao necessaria', { description: '...' })
```

### Supabase Client Import
**Source:** `src/lib/supabase/client.ts` line 42
**Apply to:** All files needing DB access
```typescript
import { supabase } from '@/lib/supabase/client'
// After Phase 1: NEVER import supabaseAdmin from this file
```

### Navigate with Redirect Preservation
**Source:** `src/components/ProtectedRoute.tsx` lines 69-75
**Apply to:** `RoleGuard` unauthenticated redirect
```typescript
<Navigate
  to={`/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
  replace
/>
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `supabase/seed.sql` | seed | batch | No seed file exists yet; follow Supabase CLI convention (plain SQL INSERT statements) |
| `.husky/pre-commit` | config | batch | No husky config exists yet; follow `npx husky init` output convention (`npm run lint`) |

## Metadata

**Analog search scope:** `src/`, `supabase/`
**Files scanned:** 12 source files read, 3 glob searches
**Pattern extraction date:** 2026-04-20
