# Phase 3: Login + Recuperação de Senha — Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 17 new/rewritten files + 2 edits (authStore.ts, client.ts) + 1 compat shim (cadastro/authService.ts)
**Analogs found:** 17 / 17 (every new file has a concrete repo-local analog)
**Primary analog:** `src/features/cadastro/` (Phase 2 canonical)

---

## Scope Summary

Phase 3 populates the empty `src/features/auth/{hooks,services,types}/` scaffold (plus new `utils/` and `schemas/` dirs) by mirroring the Phase 2 `src/features/cadastro/` organization. Four existing pages in `src/components/pages/` are rewritten against the new `authService`/`passwordService` API. Two small edits close carryover Bug 1 (D-13 — `authStore.extractRole` reads JWT payload) and Bug 2/3 (D-14 — LoginRH uses canonical signIn + JWT role gate).

The canonical `AuthError` taxonomy (D-17) is a direct structural clone of Phase 2 `CadastroError` (`src/features/cadastro/services/cadastroService.ts:109-128`) with a different code union. All error-mapping, toast wiring, `.call(supabase, ...)` RPC idioms, `vi.mock('@/lib/supabase/client')` test patterns, and Sonner-from-unversioned-specifier imports are carried forward from Phase 2.

---

## File Classification

| File | New/Rewrite/Edit | Role | Data Flow | Closest Analog | Match Quality |
|------|------------------|------|-----------|----------------|---------------|
| `src/features/auth/services/authService.ts` | NEW (moved from cadastro/) | service | request-response | `src/features/cadastro/services/cadastroService.ts` | exact (error class + mapSupabase) |
| `src/features/auth/services/passwordService.ts` | NEW | service | request-response | `src/features/cadastro/services/authService.ts` (signUp/signIn shape) | exact |
| `src/features/auth/utils/extractRole.ts` | NEW (Bug 1 fix) | utility | transform | `src/store/authStore.ts:129-136` (current extractRole) | exact (function to replace) |
| `src/features/auth/utils/rememberMeStorage.ts` | NEW (D-19) | utility | storage adapter | `src/lib/supabase/client.ts` (storage config) + `src/features/cadastro/hooks/useCadastroDraft.ts` (sessionStorage pattern) | partial (no Storage-adapter analog) |
| `src/features/auth/utils/mapSupabaseError.ts` | NEW (or inline in authService) | utility | transform | `src/features/cadastro/services/authService.ts:170-222` (`mapSupabaseAuthError`) | exact |
| `src/features/auth/hooks/useLoginForm.ts` (implied by RESEARCH Q3/Q10) | NEW | hook | request-response | `src/features/cadastro/hooks/useDuplicateCheck.ts` (RHF + service call) | role-match |
| `src/features/auth/hooks/useAuthFlowVariant.ts` | NEW | hook | state | `src/components/pages/EsqueciSenhaPage.tsx:39-41` (`?tipo=rh` detection, current scaffold) | role-match |
| `src/features/auth/hooks/useRateLimitCooldown.ts` | NEW | hook | time-driven state | no direct analog (use `useState`+`useEffect` for interval) | no analog |
| `src/features/auth/hooks/useRecoverySession.ts` | NEW | hook | event-driven | `src/components/pages/RedefinirSenhaPage.tsx:114-150` (current checkRecoverySession, but rewritten) | partial |
| `src/features/auth/schemas/passwordSchema.ts` | NEW (extracted) | schema | validation | `src/features/cadastro/schemas/candidatoSchema.ts:135-156` (senhaSchema) | exact (copy the block) |
| `src/features/auth/schemas/loginSchema.ts` | NEW (moved from src/schemas/) | schema | validation | `src/schemas/loginSchema.ts` (move as-is, minor tweaks) | exact |
| `src/features/auth/schemas/esqueciSenhaSchema.ts` | NEW (moved + renamed) | schema | validation | `src/schemas/passwordRecoverySchema.ts` (move as-is) | exact |
| `src/features/auth/schemas/redefinirSenhaSchema.ts` | NEW | schema | validation | `src/features/cadastro/schemas/candidatoSchema.ts:174-215` (dadosPessoaisSchema `.refine()` senha match) | exact |
| `src/features/auth/types/authTypes.ts` (AuthError class) | NEW | type | error class | `src/features/cadastro/services/cadastroService.ts:109-128` (CadastroError) | exact |
| `src/components/pages/LoginCandidatoPage.tsx` | REWRITE | component/page | request-response | `src/components/pages/LoginCandidatoPage.tsx` (current scaffold, L46-322) — keep shell, swap logic | self + UI-SPEC |
| `src/components/pages/LoginRHPage.tsx` | REWRITE (D-14 Bug 2/3 fix) | component/page | request-response | `src/components/pages/LoginRHPage.tsx` (current scaffold, L44-150) + Login Candidato rewrite | self + UI-SPEC |
| `src/components/pages/EsqueciSenhaPage.tsx` | REWRITE | component/page | request-response | current scaffold L33-100 + passwordService | self + UI-SPEC |
| `src/components/pages/RedefinirSenhaPage.tsx` | REWRITE | component/page | event-driven (PASSWORD_RECOVERY) | current scaffold L48-150 + passwordService + useRecoverySession | self + UI-SPEC |
| `src/store/authStore.ts` (lines 129-136) | EDIT (Bug 1 fix) | store | — | self (replace body of `extractRole`) | exact |
| `src/lib/supabase/client.ts` (line 39) | EDIT | config | — | self (swap `storage: window.localStorage` → `storage: rememberMeStorage`) | exact |
| `src/features/cadastro/services/authService.ts` | DELETE or SHIM | service | — | becomes re-export from `@/features/auth/services/authService` | self |

---

## Pattern Assignments

### `src/features/auth/types/authTypes.ts` — `AuthError` class (type, error class)

**Analog:** `src/features/cadastro/services/cadastroService.ts:109-128`

**Core pattern to copy — class shape** (cadastroService.ts:109-128):
```typescript
export class CadastroError extends Error {
  constructor(
    message: string,
    public code:
      | 'EMAIL_EXISTS'
      | 'CPF_EXISTS'
      | 'VALIDATION'
      | 'SERVER_ERROR'
      | 'NETWORK_ERROR'
      | 'EDGE_FUNCTION_ERROR'
      | 'UNKNOWN_ERROR',
    public field?: string,
    public table?: string,
    public originalError?: unknown,
    public details?: unknown
  ) {
    super(message)
    this.name = 'CadastroError'
  }
}
```

**Divergence for Phase 3 (D-17):**
- Class name: `AuthError`
- Code union: `INVALID_CREDENTIALS | EMAIL_NOT_CONFIRMED | RATE_LIMITED | NETWORK_ERROR | SERVER_ERROR | UNKNOWN_ERROR` (6 members, no `EMAIL_EXISTS`/`CPF_EXISTS`/`VALIDATION`/`EDGE_FUNCTION_ERROR` — those are cadastro-only)
- `field?: 'email' | 'senha'` (typed literal union, narrower than cadastro's `string`)
- Add `retryAfterSeconds?: number` for `RATE_LIMITED`
- Drop `table?` (no multi-table rollback in auth)
- Keep `originalError?: unknown` and `this.name = 'AuthError'`

**Naming collision note:** `src/features/cadastro/services/authService.ts:72-88` already exports a class named `AuthError` with a DIFFERENT code union. The new `src/features/auth/types/authTypes.ts::AuthError` supersedes it. When moving `tryAutoLogin` out of `cadastro/services/cadastroService.ts:294-306`, update `cadastro/services/cadastroService.ts:28` (`import { signUp, AuthError } from './authService'`) to re-export from `@/features/auth/types` instead — documented in §Shared Patterns below.

---

### `src/features/auth/services/authService.ts` — signIn / signOut / resend (service, request-response)

**Analog:** `src/features/cadastro/services/cadastroService.ts` (structure) + `src/features/cadastro/services/authService.ts:304-355` (existing `signIn`, which moves here) + `src/features/cadastro/services/authService.ts:170-222` (`mapSupabaseAuthError`, which becomes Phase 3 `mapSupabaseError`).

**Imports pattern** (copy from cadastroService.ts:27-29, adjust):
```typescript
import { supabase } from '@/lib/supabase/client'
import { isAuthError } from '@supabase/supabase-js'
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'
import { AuthError } from '../types/authTypes'
```

**Core pattern — signIn with mapped error** (structural copy of cadastro/authService.ts:315-355 + RESEARCH.md §Pattern 2):
```typescript
export async function signIn(
  email: string,
  senha: string,
  rememberMe: boolean
): Promise<{ user: User; session: Session }> {
  // Set storage mode BEFORE calling supabase-js (rememberMeStorage reads this flag)
  setRememberMeMode(rememberMe ? 'local' : 'session')

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      console.error('[AUTH] signIn error:', error.message)  // Pitfall 7: never log password
      throw mapSupabaseError(error)
    }

    if (!data.user || !data.session) {
      throw new AuthError(
        'Erro ao fazer login. Tente novamente.',
        'UNKNOWN_ERROR'
      )
    }

    return { user: data.user, session: data.session }
  } catch (err) {
    if (err instanceof AuthError) throw err
    console.error('[AUTH] Network/Unknown error during signIn:', err instanceof Error ? err.message : String(err))
    throw new AuthError(
      'Sem conexão com o servidor. Verifique sua internet.',
      'NETWORK_ERROR',
      undefined,
      undefined,
      err
    )
  }
}
```

**Key conventions preserved from Phase 2:**
1. **Re-throw project error class unwrapped** — `if (err instanceof AuthError) throw err` (cadastroService.ts:255-257 pattern).
2. **Log message only, never object/data** — cadastroService.ts:205-207 proves the Pitfall 7 rule. NO `console.log(err)` or `console.log({ email, senha })`.
3. **Named exports, no default** — `export async function signIn(...)` (CLAUDE.md convention).
4. **JSDoc with `@example`** — cadastroService.ts:155-161 shows the style; planner should preserve.

**Resend pattern** (D-02, from RESEARCH.md — new, no cadastro analog):
```typescript
export async function resendConfirmation(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) throw mapSupabaseError(error)
  } catch (err) {
    if (err instanceof AuthError) throw err
    throw new AuthError('Sem conexão com o servidor. Verifique sua internet.', 'NETWORK_ERROR', undefined, undefined, err)
  }
}
```

**mapSupabaseError pattern** — structural clone of `mapSupabaseAuthError` in `cadastro/authService.ts:170-222`, but switch on `error.code` (not `error.message.includes(...)`). Full body in RESEARCH.md §Pattern 2, lines 307-400. Keep `console.error('[AUTH]', ...)` logging discipline.

---

### `src/features/auth/services/passwordService.ts` — requestPasswordReset / setNewPassword (service, request-response)

**Analog:** `src/features/cadastro/services/cadastroService.ts::tryAutoLogin` (lines 294-306) + `src/features/cadastro/services/authService.ts:362-384` (`signOut` pattern for wrapping supabase-js call).

**Core pattern — requestPasswordReset (D-09 neutral)** — no existing exact analog; structure mirrors `tryAutoLogin`:
```typescript
export async function requestPasswordReset(email: string): Promise<void> {
  // D-09: do NOT surface "email exists" vs "not found" — always resolve successfully
  // unless the call itself fails (network/rate-limit).
  try {
    const redirectTo = `${window.location.origin}/auth/redefinir-senha`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    // Map rate-limit / network errors to AuthError; success (even when email
    // doesn't exist in the DB) is indistinguishable per D-09.
    if (error) {
      console.error('[AUTH] resetPasswordForEmail error:', error.message)
      throw mapSupabaseError(error)
    }
  } catch (err) {
    if (err instanceof AuthError) throw err
    console.error('[AUTH] Network error during requestPasswordReset:', err instanceof Error ? err.message : String(err))
    throw new AuthError(
      'Sem conexão com o servidor. Verifique sua internet.',
      'NETWORK_ERROR',
      undefined,
      undefined,
      err
    )
  }
}
```

**Core pattern — setNewPassword (D-10/D-12)** — wraps `supabase.auth.updateUser({ password })` + optional `tryAutoLogin`:
```typescript
export async function setNewPassword(novaSenha: string): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) {
      console.error('[AUTH] updateUser error:', error.message)
      throw mapSupabaseError(error)
    }
  } catch (err) {
    if (err instanceof AuthError) throw err
    console.error('[AUTH] Network error during setNewPassword:', err instanceof Error ? err.message : String(err))
    throw new AuthError(
      'Sem conexão com o servidor. Verifique sua internet.',
      'NETWORK_ERROR',
      undefined,
      undefined,
      err
    )
  }
}
```

**Reuse `tryAutoLogin` unchanged** — after `setNewPassword` resolves, page calls `tryAutoLogin(email, novaSenha)`. `tryAutoLogin` stays at `src/features/cadastro/services/cadastroService.ts:294-306` until Phase 3 scaffold polish moves it to `@/features/auth/services/authService.ts`. See §Shared Patterns for the compat shim.

---

### `src/features/auth/utils/extractRole.ts` — JWT decode (utility, transform) — **Bug 1 fix**

**Analog:** `src/store/authStore.ts:121-136` (current `extractRole` that reads `app_metadata.role` from `session.user` — the bug).

**Current broken code to REPLACE** (authStore.ts:129-136):
```typescript
function extractRole(session: Session | null): Role | null {
  if (!session?.user) return null
  const raw = session.user.app_metadata?.role
  if (raw === 'candidato' || raw === 'rh' || raw === 'administrador') {
    return raw
  }
  return null
}
```

**Why it's broken (Bug 1, D-13):** `session.user.app_metadata` is hydrated from `auth.users.raw_app_meta_data` — where `role` column doesn't exist. The Custom Access Token Hook injects `role` into the SIGNED JWT payload at `/auth/v1/token` response time. The SDK does NOT re-parse the JWT to merge claims back into `session.user.app_metadata`.

**New pattern — JWT decode via `jwt-decode@4.0.0`** (D-20 decision; RESEARCH.md confirms 13.9 kB zero-dep):
```typescript
// src/features/auth/utils/extractRole.ts
import { jwtDecode } from 'jwt-decode'
import type { Session } from '@supabase/supabase-js'

export type Role = 'candidato' | 'rh' | 'administrador'

interface SupabaseJwtPayload {
  app_metadata?: { role?: unknown }
  sub?: string
  exp?: number
}

export function extractRole(session: Session | null): Role | null {
  if (!session?.access_token) return null
  try {
    const payload = jwtDecode<SupabaseJwtPayload>(session.access_token)
    const raw = payload.app_metadata?.role
    if (raw === 'candidato' || raw === 'rh' || raw === 'administrador') {
      return raw
    }
    return null
  } catch (err) {
    console.warn('[AUTH] Failed to decode JWT for role extraction:', err instanceof Error ? err.message : String(err))
    return null
  }
}
```

**Convention preserved:** exact same return-type contract (`Role | null`), exact same valid-role whitelist. authStore.ts:322 becomes `import { extractRole } from '@/features/auth/utils'`. fallback path in `initialize` (L180-213) stays unchanged.

---

### `src/features/auth/utils/rememberMeStorage.ts` — storage adapter (utility) — **D-19**

**Analog:** `src/lib/supabase/client.ts:36-56` (storage config) + `src/features/cadastro/hooks/useCadastroDraft.ts:29-67` (sessionStorage guarded access pattern with try/catch).

**Why no exact analog:** No Storage-interface adapter exists in the repo. This is the unique net-new pattern of Phase 3.

**Pattern to copy — guarded storage access** (useCadastroDraft.ts:29-46):
```typescript
const save = useCallback((data: Partial<CandidatoFormData>) => {
  try {
    // ...
    sessionStorage.setItem(CADASTRO_DRAFT_KEY, JSON.stringify(safe))
  } catch (err) {
    console.warn('[useCadastroDraft] save failed', err)
  }
}, [])
```

**New shape (must conform to `@supabase/supabase-js` Storage interface):**
```typescript
// src/features/auth/utils/rememberMeStorage.ts
let currentMode: 'local' | 'session' = 'local'

export function setRememberMeMode(mode: 'local' | 'session'): void {
  currentMode = mode
}

export const rememberMeStorage: Storage = {
  getItem: (key) => {
    try {
      // Always read from BOTH — if a session was written to localStorage
      // previously and the user unchecks Remember-me in a later login, the
      // session adapter must still see the stale value until signIn swaps it.
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      const target = currentMode === 'local' ? window.localStorage : window.sessionStorage
      target.setItem(key, value)
      // Wipe the other store to avoid duplicate sessions
      const other = currentMode === 'local' ? window.sessionStorage : window.localStorage
      other.removeItem(key)
    } catch (err) {
      console.warn('[rememberMeStorage] setItem failed', err)
    }
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch (err) {
      console.warn('[rememberMeStorage] removeItem failed', err)
    }
  },
  clear: () => { /* not used by supabase-js */ },
  length: 0,
  key: () => null,
}
```

**Edit to `src/lib/supabase/client.ts:39`:**
```typescript
// Before:
storage: window.localStorage,
// After:
storage: rememberMeStorage,
```

---

### `src/features/auth/schemas/passwordSchema.ts` — shared Zod schema (schema, validation)

**Analog:** `src/features/cadastro/schemas/candidatoSchema.ts:127-156` (`senhaSchema`).

**Exact block to extract** (candidatoSchema.ts:135-156 — keep messages verbatim per UI-SPEC Zod error table):
```typescript
const senhaSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(100, 'Senha deve ter no máximo 100 caracteres')
  .refine(
    (val) => /[A-Z]/.test(val),
    { message: 'Senha deve conter pelo menos 1 letra maiúscula' }
  )
  .refine(
    (val) => /[a-z]/.test(val),
    { message: 'Senha deve conter pelo menos 1 letra minúscula' }
  )
  .refine(
    (val) => /[0-9]/.test(val),
    { message: 'Senha deve conter pelo menos 1 número' }
  );
```

**Divergence:** make it `export const passwordSchema` (named export). After extraction, `cadastro/schemas/candidatoSchema.ts:135-156` imports from `@/features/auth/schemas/passwordSchema` to keep a single source of truth. The messages wording in UI-SPEC Zod error table (`Senha deve ter no mínimo 8 caracteres`, etc.) matches this block verbatim — do NOT re-phrase.

---

### `src/features/auth/schemas/redefinirSenhaSchema.ts` — 2-field match (schema, validation) — **D-10**

**Analog:** `src/features/cadastro/schemas/candidatoSchema.ts:196-202` (`.refine()` with `path: ['confirmar_senha']`).

**Pattern to copy** (candidatoSchema.ts:196-202):
```typescript
export const dadosPessoaisSchema = z.object({
  // ...
  senha: senhaSchema,
  confirmar_senha: z.string().min(1, 'Por favor, confirme sua senha'),
})
  .refine((data) => data.senha === data.confirmar_senha, {
    message: 'As senhas não coincidem',
    path: ['confirmar_senha'], // Erro aparece no campo confirmar_senha
  })
```

**Phase 3 shape (2 fields only, D-10 labels match UI-SPEC):**
```typescript
import { z } from 'zod'
import { passwordSchema } from './passwordSchema'

export const redefinirSenhaSchema = z.object({
  nova_senha: passwordSchema,
  confirmar_nova_senha: z.string().min(1, 'Confirme a nova senha'),
})
  .refine((data) => data.nova_senha === data.confirmar_nova_senha, {
    message: 'As senhas não coincidem',
    path: ['confirmar_nova_senha'],
  })

export type RedefinirSenhaFormData = z.infer<typeof redefinirSenhaSchema>
```

Field names snake_case pt-BR per CLAUDE.md (matches existing `senha` / `confirmar_senha` convention).

---

### `src/features/auth/schemas/loginSchema.ts` and `esqueciSenhaSchema.ts` — moved (schema, validation)

**Analogs:** `src/schemas/loginSchema.ts` (entire file) + `src/schemas/passwordRecoverySchema.ts` (entire file).

**Move loginSchema.ts as-is.** Existing file is already compliant with Phase 3 UI-SPEC (email + password + rememberMe boolean with `default(false)` — but note UI-SPEC D-05 says `defaultChecked={true}` on the UI side; RHF `defaultValues.rememberMe` in the page should set `true`, NOT the Zod `.default(false)` — leave the schema default but override in `useForm({ defaultValues })`).

**Rename `passwordRecoverySchema` → `esqueciSenhaSchema`** (pt-BR domain per CLAUDE.md). Existing file body (schemas/passwordRecoverySchema.ts:20-27) is 8 lines; copy verbatim, just rename the export symbol.

**After move:** delete `src/schemas/loginSchema.ts`, `src/schemas/adminLoginSchema.ts`, `src/schemas/passwordRecoverySchema.ts`. Update `src/components/pages/*` imports to `@/features/auth/schemas`.

---

### `src/features/auth/hooks/useFormToast.ts` — NOT a new file

**Analog:** `src/features/cadastro/hooks/useFormToast.ts` (entire 240-line file).

**Decision:** Phase 3 pages REUSE the existing `useFormToast` from cadastro — do NOT fork or duplicate. Planner imports as:
```typescript
import { useFormToast } from '@/features/cadastro/hooks'
```
This is fine despite the domain-boundary smell because:
1. `useFormToast` is pure UI with zero cadastro-specific logic (useFormToast.ts:34-237).
2. Duplicating would create two Sonner call sites and break the Phase 2 Plan 02-06 `resolve.dedupe: ['sonner']` invariant.
3. In M2, the hook moves to `src/hooks/useFormToast.ts` as a cross-feature utility.

**CRITICAL Sonner import rule** (useFormToast.ts:34):
```typescript
import { toast } from 'sonner'      // YES — unversioned
import type { ExternalToast } from 'sonner'
```
**NEVER:**
```typescript
import { toast } from 'sonner@2.0.3'  // NO — breaks resolve.dedupe
```
Verified by `vite.config.ts` comment (lines 27-28: *"`from 'sonner@2.0.3'` import to `from 'sonner'` and drop the alias. `resolve.dedupe: ['sonner']` enforces a single copy"*).

**Toast duration convention from useFormToast** (L80, 94, 104, 113):
- `success`: 4000ms default
- `error`: 6000ms default (errors stick longer)
- `info`: 4000ms default
- `warning`: 5000ms default

UI-SPEC lines 671-681 confirm these exact durations per error code.

---

### `src/features/auth/hooks/useRateLimitCooldown.ts` — live countdown (hook, time-driven state)

**Analog:** No existing hook exercises `setInterval` + countdown. Closest structural analog: `src/features/cadastro/hooks/useCadastroDraft.ts` (useCallback structure). Adopt a simple pattern inspired by the draft hook.

**Recommended shape (new, no repo analog to cite):**
```typescript
// src/features/auth/hooks/useRateLimitCooldown.ts
import { useEffect, useState } from 'react'

export function useRateLimitCooldown(rateLimitedUntil: number | null): {
  secondsRemaining: number
  isInCooldown: boolean
} {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!rateLimitedUntil) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [rateLimitedUntil])

  const secondsRemaining = rateLimitedUntil ? Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000)) : 0
  return { secondsRemaining, isInCooldown: secondsRemaining > 0 }
}
```

**Convention enforced:** hook file name `useCamelCase.ts` (CLAUDE.md), named export (CLAUDE.md). State source (`rateLimitedUntil`) lives in a Zustand slice or a ref in the page per UI-SPEC lines 403-404 — **MUST NOT** use `localStorage` (user clearing storage ≠ legitimate unlock).

---

### `src/features/auth/hooks/useRecoverySession.ts` — PASSWORD_RECOVERY event (hook, event-driven)

**Analog:** `src/components/pages/RedefinirSenhaPage.tsx:114-150` (current `checkRecoverySession` in page component — extract to hook).

**Current in-page code to extract** (RedefinirSenhaPage.tsx:115-150):
```typescript
useEffect(() => {
  const checkRecoverySession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) { /* set invalid */ return }
      if (!session) { /* set invalid */ return }
      setHasValidSession(true)
    } catch (error) { /* set invalid */ }
  }
  checkRecoverySession()
}, [])
```

**Phase 3 new hook shape (RESEARCH.md Q7):**
```typescript
export function useRecoverySession(): { state: 'loading' | 'valid' | 'invalid' } {
  const [state, setState] = useState<'loading' | 'valid' | 'invalid'>('loading')

  useEffect(() => {
    let cancelled = false

    // Listener catches PASSWORD_RECOVERY emitted by detectSessionInUrl: true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' && session) setState('valid')
    })

    // Also check getSession() as fallback (handles mount-after-event race)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (cancelled) return
      if (error || !session) setState('invalid')
      else if (state === 'loading') setState('valid')
    })

    // 2s timeout → fallback invalid (UI-SPEC line 527)
    const timeoutId = setTimeout(() => {
      if (!cancelled && state === 'loading') setState('invalid')
    }, 2000)

    return () => { cancelled = true; subscription.unsubscribe(); clearTimeout(timeoutId) }
  }, [])

  return { state }
}
```

**Divergence from current scaffold:** Current scaffold only calls `getSession()` once (RedefinirSenhaPage.tsx:119). New hook ALSO subscribes to `PASSWORD_RECOVERY` event to handle the race where hash fragment is still being parsed by `detectSessionInUrl: true`. Per RESEARCH.md Q7 Pitfall 2, this is the canonical Supabase recovery pattern.

---

### `src/features/auth/hooks/useAuthFlowVariant.ts` — candidato vs RH variant (hook, state)

**Analog:** `src/components/pages/EsqueciSenhaPage.tsx:34-41` (current `?tipo=rh` detection).

**Current pattern to extract** (EsqueciSenhaPage.tsx:34-41):
```typescript
const [searchParams] = useSearchParams()
const tipoUsuario = searchParams.get('tipo') === 'rh' ? 'rh' : 'candidato'
const isRH = tipoUsuario === 'rh'
```

**Phase 3 hook (extracted to kill duplication across pages):**
```typescript
import { useSearchParams } from 'react-router-dom'

export function useAuthFlowVariant(): { variant: 'candidato' | 'rh'; isRH: boolean } {
  const [searchParams] = useSearchParams()
  const variant = searchParams.get('tipo') === 'rh' ? 'rh' : 'candidato'
  return { variant, isRH: variant === 'rh' }
}
```

**Open planner question (UI-SPEC line 986):** whether to keep `?tipo=rh` query-param routing or split into two routes. Pattern works either way.

---

### `src/components/pages/LoginCandidatoPage.tsx` (REWRITE) — component/page

**Analog (self):** Current `src/components/pages/LoginCandidatoPage.tsx:46-322` — keep the shell (GlassCard + BackgroundImage + BeautySmileLogo), rewrite the body per UI-SPEC.

**Imports to preserve** (current L1-15):
```typescript
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { BackgroundImage } from '../BackgroundImage';
import { GlassCard } from '../ui/glass';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight, AlertCircle, Clock, Send } from 'lucide-react';  // Mail+Lock+Loader2+ArrowRight+Clock+Send NEW (UI-SPEC L51)
import { toast } from 'sonner';
```

**New imports (Phase 3 service layer):**
```typescript
import { loginSchema, type LoginFormData } from '@/features/auth/schemas';
import { AuthError, signIn, resendConfirmation } from '@/features/auth/services';
import { useRateLimitCooldown } from '@/features/auth/hooks/useRateLimitCooldown';
import { useFormToast } from '@/features/cadastro/hooks';  // reuse (see §Shared Patterns)
```

**Core onSubmit pattern (rewritten from L67-173 scaffold):**
```typescript
const onSubmit = async (data: LoginFormData) => {
  try {
    const { session } = await signIn(data.email, data.password, data.rememberMe)
    // authStore listener picks up SIGNED_IN → role via extractRole → RoleGuard
    toast.success('Login realizado com sucesso!')
    navigate('/candidato/perfil', { replace: true })  // UI-SPEC L434: immediate, no setTimeout(1000)
  } catch (err) {
    if (err instanceof AuthError) {
      setLastError(err)  // drives UI state for EMAIL_NOT_CONFIRMED block + cooldown
      toast.error(err.message)  // copy per D-17 + UI-SPEC lines 743-752
      if (err.code === 'RATE_LIMITED' && err.retryAfterSeconds) {
        setRateLimitedUntil(Date.now() + err.retryAfterSeconds * 1000)
      }
    } else {
      toast.error('Erro inesperado. Tente novamente.')
    }
  }
}
```

**Divergences from scaffold — must remove (UI-SPEC lines 905-919):**
1. Remove `max-w-6xl` + `grid lg:grid-cols-2` + "Precisa de Ajuda?" contact panel (L214-380).
2. Change container to `w-full max-w-md` (UI-SPEC L84).
3. Remove `text-[40px] font-bold` → use `text-2xl font-semibold` (UI-SPEC L94-102).
4. Remove `setTimeout(() => navigate(...), 1000)` (L163-165) — immediate navigation.
5. Remove in-login `supabase.from('candidatos').select(...)` (L118-154) — move to `/candidato/perfil` page itself.
6. Remove `useAuthStore().setUser / setSession` (L50, L112-113) — `onAuthStateChange` listener in App.tsx:158 handles this.
7. Change `rememberMe: false` default → `rememberMe: true` (D-05; line 63 of scaffold).
8. Replace `active:scale-95` → `active:scale-[0.98]` (UI-SPEC L915).
9. Replace ad-hoc inline error `if (error.message.includes(...))` (L84-100) with `err instanceof AuthError + err.code` pattern matching.

**Form field shell (UI-SPEC L182-224, exact):** wrap `<Input>` with leading Mail icon and pr-10 for eye-toggle on password. See `src/features/cadastro/components/steps/DadosPessoaisStep.tsx:29` for the `Eye, EyeOff, Loader2, CheckCircle2, AlertCircle` lucide-react import idiom.

---

### `src/components/pages/LoginRHPage.tsx` (REWRITE) — **D-14 Bug 2/3 fix**

**Analog:** current `src/components/pages/LoginRHPage.tsx:44-150` + Login Candidato rewrite.

**Current broken code to REPLACE** (LoginRHPage.tsx:23-25, 46-48):
```typescript
import { useAdminAuthStore } from '@/store/adminAuthStore';    // LEGACY — REMOVE
import { logLoginSuccess, logLoginFailure, logAccessDenied } from '@/services/logAccessService';  // UI-SPEC L651: REMOVE
// ...
const { setUser, setSession, setAdminUser } = useAdminAuthStore();  // LEGACY setters forge 'administrador' — REMOVE
```

**New pattern — same as LoginCandidato + role gate (D-14):**
```typescript
const onSubmit = async (data: LoginFormData) => {
  try {
    await signIn(data.email, data.password, data.rememberMe)
    // Wait one tick for authStore to absorb the SIGNED_IN event and derive role
    // from JWT (Bug 1 fix). Then gate.
    const role = useAuthStore.getState().role
    if (role !== 'administrador') {
      await supabase.auth.signOut()
      toast.error('Esta conta não tem acesso ao painel RH.')  // UI-SPEC L675
      return
    }
    toast.success('Login realizado com sucesso!')
    navigate('/rh/dashboard', { replace: true })
  } catch (err) {
    if (err instanceof AuthError) toast.error(err.message)
    else toast.error('Erro inesperado. Tente novamente.')
  }
}
```

**Divergences from current scaffold (UI-SPEC L640-660):**
- H1 `Área RH`, subtitle `Acesse o painel interno`, email placeholder `seu.email@beautysmile.com.br` (UI-SPEC table L641-648).
- Remove `logLoginSuccess / logLoginFailure / logAccessDenied` (out of scope, Phase 5).
- Remove "Conexão Segura / criptografia de ponta a ponta" callout (UI-SPEC L652).
- Hide "Criar conta" footer link (RH accounts are admin-created; UI-SPEC L647).

---

### `src/components/pages/EsqueciSenhaPage.tsx` (REWRITE) — component/page

**Analog (self):** current `src/components/pages/EsqueciSenhaPage.tsx:33-100` — keep the mounting effects, rewrite onSubmit.

**Current imports to drop** (EsqueciSenhaPage.tsx:25-31):
```typescript
import { isRateLimited, recordAttempt, getRemainingTime, getRemainingAttempts } from '@/services/rateLimitService';  // UI-SPEC L502: counter HIDDEN in primary flow
import { logPasswordResetRequest } from '@/services/logAccessService';  // out of scope
```

**New imports:**
```typescript
import { esqueciSenhaSchema, type EsqueciSenhaFormData } from '@/features/auth/schemas';
import { requestPasswordReset, AuthError } from '@/features/auth/services';
```

**Core onSubmit pattern (rewritten from L67-100 scaffold):**
```typescript
const onSubmit = async (data: EsqueciSenhaFormData) => {
  try {
    await requestPasswordReset(data.email)
    // D-09: identical success copy regardless of whether the email exists
    setEmailEnviado(true)
    toast.info('Se o email existir, o link de recuperação foi enviado.')
  } catch (err) {
    if (err instanceof AuthError && err.code === 'RATE_LIMITED') {
      toast.warning(`Muitas solicitações. Tente novamente em ${err.retryAfterSeconds ?? 60}s.`)
    } else {
      // D-09: other errors still surface generic neutral copy to avoid enumeration
      setEmailEnviado(true)
    }
  }
}
```

**Post-submit state** — exactly per UI-SPEC lines 455-489 (replace entire card content with CheckCircle2 success block, hard-coded copy, "Voltar ao login" + "Usar outro email" CTAs). Do NOT render `{emailValue}` (UI-SPEC L491).

---

### `src/components/pages/RedefinirSenhaPage.tsx` (REWRITE) — component/page, event-driven

**Analog (self):** current `src/components/pages/RedefinirSenhaPage.tsx:48-150` — keep the 3-state rendering (validating / invalid / form), rewrite every logic bit.

**Current imports to DROP** (RedefinirSenhaPage.tsx:11-25 — UI-SPEC Open Q6 audit):
```typescript
import { logPasswordResetCompleted, logPasswordResetFailed } from '@/services/logAccessService';  // out of scope
import { detectUserType } from '@/services/userTypeDetectionService';                              // dead, hook replaces
import { sendPasswordChangeConfirmation, ... } from '@/services/passwordChangeConfirmationService';// out of scope (no confirm email)
import { processError, isAuthError, ... } from '@/services/errorHandlingService';                  // replaced by mapSupabaseError
import { validatePassword } from '@/services/securityValidationService';                           // D-11 kills zxcvbn
```

**New imports:**
```typescript
import { redefinirSenhaSchema, type RedefinirSenhaFormData } from '@/features/auth/schemas'
import { setNewPassword, AuthError } from '@/features/auth/services'
import { tryAutoLogin } from '@/features/cadastro/services/cadastroService'  // D-12 reuse
import { useRecoverySession } from '@/features/auth/hooks/useRecoverySession'
```

**Core render-state machine** (structural; replaces L114-150 + the 4 `passwordStrength` blocks):
```typescript
const { state } = useRecoverySession()  // 'loading' | 'valid' | 'invalid'

if (state === 'loading') return <ValidatingState />
if (state === 'invalid') return <InvalidLinkState />  // UI-SPEC L532-565
// else: form
```

**Core onSubmit pattern:**
```typescript
const onSubmit = async (data: RedefinirSenhaFormData) => {
  try {
    await setNewPassword(data.nova_senha)
    const email = (await supabase.auth.getUser()).data.user?.email
    if (!email) throw new AuthError('Sessão inválida. Solicite um novo link.', 'SERVER_ERROR')
    const autoLogged = await tryAutoLogin(email, data.nova_senha)
    if (autoLogged) {
      toast.success('Senha alterada com sucesso.')
      navigate('/candidato/perfil', { replace: true })  // UI-SPEC L596
    } else {
      toast.success('Senha alterada. Faça login para continuar.')
      navigate('/auth/login', { replace: true })  // UI-SPEC L599
    }
  } catch (err) {
    if (err instanceof AuthError) toast.error(err.message)
    else toast.error('Não foi possível alterar a senha. Tente novamente.')
  }
}
```

**Divergences from scaffold** (UI-SPEC L583-602, L915):
1. Remove `PasswordStrength` interface (L35-46).
2. Remove `passwordStrength` score/label/color/requirements computation (L85-112).
3. Remove live strength bar + requirements checklist + "As senhas coincidem" CheckCircle (D-11 silent Zod only).
4. Remove `countdown, setCountdown` and the 3-second auto-nav (L57, L73 scaffold).
5. Remove debug `token: XXX...` footer (UI-SPEC L917).
6. Change "expires in 24h" → "expires in 1 hour" (UI-SPEC L567 fix).

---

### `src/components/pages/__tests__/LoginCandidatoPage.test.tsx` (OPTIONAL, parallel) — component test

**Analog:** No page-level test exists for current auth pages (inferred from `ls` — only services have `__tests__/`). Skip unit-level page tests; rely on `e2e/login-flow.spec.ts` (already exists) for integration coverage.

**Service-level tests (REQUIRED):** `src/features/auth/services/__tests__/authService.test.ts` + `passwordService.test.ts`. See §Shared Patterns — Vitest mock.

---

## Shared Patterns

### Vitest supabase mock pattern

**Source:** `src/features/cadastro/services/__tests__/authService.test.ts:25-37` AND `duplicateCheckService.test.ts:40-48`

**Apply to:** All new `src/features/auth/services/__tests__/*.test.ts` files.

**Excerpt (authService.test.ts:25-37):**
```typescript
// Mock do Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
  },
}))

// Import do mock após configuração
import { supabase } from '@/lib/supabase/client'
```

**Phase 3 test suite must mock these methods** (matrix from RESEARCH.md §Standard Stack):
- `supabase.auth.signInWithPassword`
- `supabase.auth.signOut`
- `supabase.auth.resetPasswordForEmail`
- `supabase.auth.updateUser`
- `supabase.auth.resend`
- `supabase.auth.onAuthStateChange` (for useRecoverySession tests)
- `supabase.auth.getSession`, `getUser`

**Error taxonomy assertion pattern** (authService.test.ts:125-131 + duplicateCheckService.test.ts:139-142):
```typescript
await expect(
  signIn({ email: 'x@y.z', password: 'wrong', rememberMe: true })
).rejects.toThrow(AuthError)

await expect(
  signIn({ email: 'x@y.z', password: 'wrong', rememberMe: true })
).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
```

### `.call(supabase, ...)` RPC idiom

**Source:** `src/features/cadastro/services/duplicateCheckService.ts:184-192`

**Apply to:** Any Phase 3 code that calls `supabase.rpc(...)` or `supabase.auth.*` through a destructured/aliased reference. **Phase 3 authService should NOT need this** (always calls `supabase.auth.signInWithPassword` with full context). Preserved in the pattern map for future-proofing — if the planner extracts `const { auth } = supabase; auth.signInWithPassword(...)`, the `this.rest` crash recurs.

**Excerpt (duplicateCheckService.ts:184-192):**
```typescript
const { data, error } = (await (
  supabase.rpc as unknown as (
    fn: 'check_candidato_duplicate',
    args: { p_cpf: string; p_email: string }
  ) => Promise<{ data: unknown; error: { message: string } | null }>
).call(supabase, 'check_candidato_duplicate', {
  p_cpf: cpfCleaned,
  p_email: emailCleaned,
}))
```

**Rule:** Always call Supabase client methods with the client as `this` — either via direct member access (`supabase.auth.signInWithPassword(...)`) or `.call(supabase, ...)` when using a casted reference. See comment at duplicateCheckService.ts:179-183 for the original rationale.

### Sonner toast import discipline

**Source:** `src/features/cadastro/hooks/useFormToast.ts:34`, verified by `vite.config.ts:27-28`.

**Apply to:** Every file in `src/features/auth/**` and the 4 edited pages.

**REQUIRED:**
```typescript
import { toast } from 'sonner'
```

**FORBIDDEN:**
```typescript
import { toast } from 'sonner@2.0.3'       // breaks resolve.dedupe — Plan 02-06 fix
import { Toaster } from 'sonner@2.0.3'     // same
```

**Toast variants used across Phase 3** (per UI-SPEC):
- `toast.success(msg)` — default 4000ms (login success, senha alterada) — UI-SPEC L702, L741
- `toast.error(msg)` — default 6000ms (INVALID_CREDENTIALS, EMAIL_NOT_CONFIRMED toast, NETWORK_ERROR) — UI-SPEC L669-674
- `toast.warning(msg)` — default 5000ms (RATE_LIMITED) — UI-SPEC L671
- `toast.info(msg)` — default 4000ms (Esqueci-senha neutral success) — UI-SPEC L723
- `toast.error(msg, { action })` — for "Tentar novamente" retry CTAs (NETWORK_ERROR/SERVER_ERROR) — UI-SPEC L672-673

### Pitfall 7 redaction (Password/token logging)

**Source:** `src/features/cadastro/services/cadastroService.ts:165-170` and L203-208, L259-263.

**Apply to:** Every `console.log` / `console.error` / `console.warn` in `src/features/auth/**`.

**Rule:** NEVER log `senha`, `password`, `access_token`, `refresh_token`, or full error objects that may carry request body. Only log: email, message, error.code, status.

**Canonical example (cadastroService.ts:165-170):**
```typescript
// Pitfall 7: redaction — NEVER log `data` directly (contém senha).
console.log('[CADASTRO] Invocando Edge Function cadastrar-candidato', {
  email: data.dadosPessoais.email,
  nome: data.dadosPessoais.nome_completo,
  hasPassword: Boolean(data.dadosPessoais.senha),
})
```

**Canonical error-extraction (cadastroService.ts:205-208):**
```typescript
console.error(
  '[CADASTRO] Erro ao invocar Edge Function:',
  invokeError.message || String(invokeError)  // .message only — never the whole object
)
```

### Feature barrel export convention

**Source:** `src/features/cadastro/services/index.ts`, `src/features/cadastro/hooks/index.ts`, `src/features/cadastro/components/index.ts`.

**Apply to:** `src/features/auth/{services,hooks,types,utils,schemas}/index.ts`.

**Excerpt (services/index.ts, lines 7-11):**
```typescript
export * from './viaCepService'
export * from './duplicateCheckService'
export * from './authService'
export * from './cadastroService'
export * from './n8nService'
```

**Phase 3 barrels:**
```typescript
// src/features/auth/services/index.ts
export * from './authService'
export * from './passwordService'

// src/features/auth/hooks/index.ts
export { useLoginForm } from './useLoginForm'
export { useAuthFlowVariant } from './useAuthFlowVariant'
export { useRateLimitCooldown } from './useRateLimitCooldown'
export { useRecoverySession } from './useRecoverySession'

// src/features/auth/types/index.ts
export * from './authTypes'

// src/features/auth/utils/index.ts
export * from './extractRole'
export * from './rememberMeStorage'
export * from './mapSupabaseError'  // or inlined in authService.ts

// src/features/auth/schemas/index.ts
export * from './passwordSchema'
export * from './loginSchema'
export * from './esqueciSenhaSchema'
export * from './redefinirSenhaSchema'
```

**Mixing patterns:** `cadastro/services/index.ts` uses `export *` (re-export everything); `cadastro/hooks/index.ts` uses named re-exports. Both are acceptable — planner picks per file (named for hooks preserves better tree-shaking + refactor-friendliness).

### Named export convention (NEVER default)

**Source:** `CLAUDE.md` §Key Conventions + `src/features/cadastro/components/CadastroMultiStepForm.tsx` (all components use `export function` never `export default`).

**Apply to:** Every Phase 3 file. Component files:
```typescript
export function LoginCandidatoPage({ ... }: Props) { ... }  // YES
```
**NEVER:**
```typescript
export default LoginCandidatoPage  // NO
```

### Compat shim for `cadastro/services/authService.ts`

**Source:** `cadastro/services/authService.ts:72-88` (existing AuthError class with different code union — causes naming collision with new `src/features/auth/types/authTypes::AuthError`).

**Apply:** Keep `cadastro/services/authService.ts` as a thin compat layer that re-exports from `@/features/auth/services/authService` (or delete entirely if planner migrates the 2 call sites — `cadastrarCandidato` L28 and `tryAutoLogin` L294-306).

**Recommendation:** Planner moves `tryAutoLogin` from `cadastroService.ts:294-306` to `@/features/auth/services/authService.ts` AND deletes `cadastro/services/authService.ts` entirely. Updates `cadastro/services/cadastroService.ts:28` to:
```typescript
// Before:
import { signUp, AuthError } from './authService'
// After:
import { signUp, AuthError } from '@/features/auth/services'  // or inline the single remaining signUp use-case
```

`signUp` is currently unused in cadastro (RPC via Edge Function replaces it — see cadastroService.ts:133-138 comment "TODO: remove in Phase 3 cleanup"). Drop `signUp` export entirely.

---

## Divergences from Phase 2 (Intentional)

| Divergence | Phase 2 | Phase 3 | Justification |
|------------|---------|---------|---------------|
| Service layer home | `src/features/cadastro/services/{authService,cadastroService}.ts` | `src/features/auth/services/{authService,passwordService}.ts` | Auth is a cross-cutting concern not specific to cadastro. CONTEXT.md code_context line 108 flags this move. |
| AuthError class uniqueness | Two classes named `AuthError` (cadastro/authService.ts:72-88 AND cadastro/cadastroService.ts:109-128 CadastroError — different) | Single `AuthError` in `src/features/auth/types/authTypes.ts`; `CadastroError` stays | Eliminates the dual-class-same-name confusion. Cadastro's AuthError (cadastro/authService.ts) is deleted or replaced by the new one. |
| Error code union | `EMAIL_EXISTS / CPF_EXISTS / VALIDATION / SERVER_ERROR / NETWORK_ERROR / EDGE_FUNCTION_ERROR / UNKNOWN_ERROR` (CadastroError) | `INVALID_CREDENTIALS / EMAIL_NOT_CONFIRMED / RATE_LIMITED / NETWORK_ERROR / SERVER_ERROR / UNKNOWN_ERROR` (AuthError) | D-17 narrows the taxonomy to auth-specific codes; field type also narrows to `'email' \| 'senha'` union. |
| Error mapping strategy | `error.message.includes(...)` string matching (cadastro/authService.ts:172-214) | Switch on `error.code` (D-17 + RESEARCH.md §Pattern 2) | Supabase-js 2.104+ exposes structured `ErrorCode` — string matching is fragile across SDK updates. |
| Storage strategy | `storage: window.localStorage` (client.ts:39) | `storage: rememberMeStorage` (custom adapter) | D-19 requires conditional persistence based on Remember-me checkbox. |
| JWT role source | `session.user.app_metadata.role` (authStore.ts:131) — **broken** | `jwtDecode(session.access_token).app_metadata.role` — NEW | D-13 Bug 1 fix. SDK doesn't merge Custom Access Token Hook claims back into `session.user.app_metadata`. |
| Card max-width | `max-w-4xl` (cadastro multistep, 2-col fields) | `max-w-md` (auth, 2-3 fields) | UI-SPEC § Layout Decision — industry convention for auth cards is 400-480px. |
| Password validation UX | Silent Zod on submit (cadastro) | Silent Zod on submit (D-11) | Same policy — reuse `passwordSchema` directly. |
| Logging service | `logAccessService` used on 4 auth pages (LoginRH/EsqueciSenha/RedefinirSenha) | REMOVED (out of scope, Phase 5) | UI-SPEC L651 + CONTEXT deferred list. |

---

## No Analog Found

| File | Role | Data Flow | Reason | Guidance |
|------|------|-----------|--------|----------|
| `src/features/auth/utils/rememberMeStorage.ts` | utility | storage adapter | Repo has no custom `Storage`-interface adapter. | Use the sketch in §Pattern Assignments; pattern docs in RESEARCH.md §Q1. |
| `src/features/auth/hooks/useRateLimitCooldown.ts` | hook | time-driven state | No existing `setInterval` countdown hook. | Use the sketch above; minimal 15-line pattern. |

Both files are ≤ 50 lines; the lack of analog is not a risk.

---

## Metadata

**Analog search scope:**
- `src/features/cadastro/` (Phase 2 canonical — all subdirs read)
- `src/components/pages/{Login,EsqueciSenha,RedefinirSenha}*.tsx` (scaffolds)
- `src/store/authStore.ts` (Bug 1 fix target)
- `src/lib/supabase/client.ts` (storage config target)
- `src/schemas/{login,adminLogin,passwordRecovery}Schema.ts` (sources to move)
- `e2e/{cadastro-flow,login-flow,password-recovery-flow}.spec.ts` (Playwright patterns)
- `vite.config.ts` (Sonner dedupe invariant)

**Files scanned:** 22 source files + 3 e2e specs + 1 vite config = 26 reads. Grep used to locate specific line ranges before targeted Read calls.

**Pattern extraction date:** 2026-04-24
