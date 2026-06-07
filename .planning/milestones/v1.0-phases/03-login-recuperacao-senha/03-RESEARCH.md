# Phase 3: Login + Recuperação de Senha — Research

**Researched:** 2026-04-24
**Domain:** Supabase Auth client-side — session lifecycle, password recovery deeplinks, structured error taxonomy, JWT decode
**Confidence:** HIGH (all load-bearing claims verified against `@supabase/auth-js@2.104.1` typings shipped in `node_modules/` + official Supabase docs via Context7)

---

## Summary

Phase 3 wires four auth touchpoints (LoginCandidato, LoginRH, EsqueciSenha, RedefinirSenha) onto `@supabase/supabase-js` v2.104, closes two Phase 1 carryover bugs (extractRole, LoginRH legacy setters), and introduces `src/features/auth/` as the canonical home for the auth service + hooks + schemas. The supabase-js SDK already owns persistSession, detectSessionInUrl, and the `PASSWORD_RECOVERY` event wiring — Phase 3's job is to (a) wrap it in a project-shaped `AuthError` taxonomy that mirrors Phase 2 (`cadastroService`), (b) swap storage conditionally based on "Lembrar-me", and (c) decode the access_token JWT to read `app_metadata.role` (the SDK does not expose custom hook claims via `session.user.app_metadata`).

All 21 CONTEXT.md decisions (D-01..D-21) are already locked; UI is frozen by 03-UI-SPEC.md (6/6 dimensions PASS). This research answers the three discretion items (D-19 storage swap, D-20 JWT decode, D-21 layout — resolved by UI-SPEC) plus seven wiring questions the planner raised at UI-SPEC handoff.

**Primary recommendation:** Single new `src/features/auth/services/authService.ts` + `passwordService.ts` + Zustand-backed rate-limit slice; keep `supabase.createClient` as a singleton but pass a **custom Storage adapter** (`rememberMeStorage`) that routes reads/writes to `localStorage` (persistent) or `sessionStorage` (ephemeral) based on a runtime flag set before login. Use `jwt-decode@4.0.0` for the extractRole fix — 13.9 kB unpacked, zero deps, decode-only (Supabase already verifies the signature server-side).

---

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01..D-18 — do NOT relitigate)

- **D-01** Invalid credentials → generic `"Email ou senha inválidos"` (no email-vs-password distinction; anti-enumeration).
- **D-02** Email not confirmed → specific message + **"Reenviar email de confirmação" CTA** calling `supabase.auth.resend({ type: 'signup', email })`.
- **D-03** Rate limit → "Muitas tentativas. Tente novamente em {N}s" with visual countdown + disabled submit. Cooldown from `Retry-After` when present, fallback fixed 60s.
- **D-04** Network error → "Erro de conexão. Verifique sua internet." + retry button. Pattern mirrors `duplicateCheckService.NETWORK_ERROR`.
- **D-05** "Lembrar-me" checkbox **checked by default**.
- **D-06** Unchecked → sessão em `sessionStorage` (morre ao fechar). Storage swap strategy = Claude's discretion (D-19).
- **D-07** Candidato com "Lembrar-me" marcado → **sem timeout**. NÃO aplicar `useSessionTimeout` (que é RH/admin).
- **D-08** Redirect pós-login candidato → sempre `/candidato/perfil`.
- **D-09** Esqueci-senha → mensagem **neutra**: "Se o email estiver cadastrado, enviamos um link...". Idêntica para sucesso e not-found (anti-enumeration).
- **D-10** Redefinir-senha → 2 campos (nova + confirmar), Zod `.refine()` match.
- **D-11** Password strength → **Zod silent**. Sem zxcvbn, sem meter, sem checklist em tempo real. Erro só no submit.
- **D-12** Pós-redefinir → auto-login via `tryAutoLogin` (Phase 2 helper reutilizado) + toast "Senha alterada com sucesso" + navigate `/candidato/perfil` com `replace: true`.
- **D-13** **Bug 1 (AUTH-JWT-01) — IN SCOPE CRÍTICO.** `extractRole()` lê JWT payload (não `session.user.app_metadata`).
- **D-14** **Bug 2/3 (AUTH-LOGIN-01/02) — IN SCOPE.** LoginRH reescrito; rejeita qualquer `role !== 'administrador'` após signIn (signOut forçado).
- **D-15** **Bug 6 (AUTH-RPC-01) — OUT OF SCOPE.** Permanece tracked em KNOWN-ISSUES; Phase 4 ou 5.
- **D-16** Redefinir senha **NÃO reapresenta LGPD consent**.
- **D-17** `authService.AuthError.code` union: `INVALID_CREDENTIALS | EMAIL_NOT_CONFIRMED | RATE_LIMITED | NETWORK_ERROR | SERVER_ERROR | UNKNOWN_ERROR` + opcional `field?` + opcional `retryAfterSeconds?`.
- **D-18** Drop legacy `error` alias do Phase 2 → **NÃO nesta phase**. Deferred para Phase 5 ou v2.0.

### Claude's Discretion (answered by this research)

- **D-19** Storage swap strategy → RESEARCHED (Q1): custom Storage adapter wrapper (option `b` from CONTEXT). See §Q1.
- **D-20** JWT decode library → RESEARCHED (Q2): `jwt-decode@4.0.0`. See §Q2.
- **D-21** Layout/UI dos 4 formulários → **RESOLVED by 03-UI-SPEC.md** (995 lines, approved 2026-04-24, 6/6 dimensions PASS).

### Deferred Ideas (OUT OF SCOPE — do NOT plan)

- MFA / 2FA / passkeys → Phase 5 ou v2.0
- Social login (Google/LinkedIn) → backlog M2
- Bug 6 / AUTH-RPC-01 → Phase 4 ou 5 (tracked em KNOWN-ISSUES)
- Password strength meter visual (zxcvbn) → Phase 5+
- LGPD re-consent em reset de senha → só quando POLICY_VERSION mudar
- Email "sua senha foi alterada" → backlog M2
- Returning URL pós-login (alternativa ao D-08) → Phase 4
- Telemetry/audit tables → Phase 5 hardening
- Drop `error` alias (T-02-03) → Phase 5 ou v2.0

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Login com email + senha com mensagens claras de erro | §Q6 (error-code detection), §Standard Stack, §Code Examples (signInWithPassword wrapper) |
| AUTH-02 | Checkbox "Lembrar-me" controla `persistSession` do Supabase | §Q1 (storage swap strategy), §Code Examples (rememberMeStorage adapter) |
| AUTH-03 | Recuperação de senha por email com link válido por 1h | §Q7 (resetPasswordForEmail + updateUser flow), §Environment Availability (Supabase Dashboard OTP expiry config), §Pitfall 4 |
| AUTH-04 | Redefinição de senha funcional via deeplink do email | §Q7 (PASSWORD_RECOVERY event wiring), §Code Examples (full recovery flow), §Pitfall 5 (link-once constraint) |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Email/password authentication | Supabase Auth (external) | Client service wrapper | `signInWithPassword` is a REST call; SDK abstracts the HTTP. Client wrapper maps SDK errors → AuthError taxonomy. |
| Session persistence | Browser storage + supabase-js | — | `persistSession: true` + Storage adapter owns the lifecycle. No server state needed client-side beyond JWT. |
| JWT role extraction | Browser (client) | — | The Custom Access Token Hook runs server-side and embeds `role` in the JWT payload. The client decodes the token to read the claim — no re-verification needed (SDK already verified). |
| Password reset email | Supabase Auth (external) | — | `resetPasswordForEmail` fires an email via Supabase SMTP. Template lives in Dashboard; custom SMTP out of scope. |
| Password update post-recovery | Browser → Supabase Auth | — | `updateUser({ password })` is a PATCH to `/auth/v1/user` authenticated via the recovery JWT. Client-only. |
| Rate-limit state (cooldown timer) | Browser (in-memory / Zustand slice) | — | Transient UI state; MUST NOT live in localStorage (user clearing storage ≠ legit unlock — UI-SPEC line 404). |
| Error taxonomy mapping | Client service layer | — | `authService` maps `AuthApiError.code` (supabase-js) → project `AuthError.code` (D-17 union). Single source of truth for UI copy. |
| Role-gated redirect | RoleGuard + authStore | — | Already in place from Phase 1. Phase 3 only fixes the role-extraction source (D-13) — RoleGuard untouched. |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.104.1 (current in package.json) | Auth SDK — `signInWithPassword`, `resetPasswordForEmail`, `updateUser`, `onAuthStateChange`, `resend` | Already in prod; upgraded in Phase 2 Plan 02-04 to fix Bug 5 (sb_publishable_ anon key parsing). `2.104.x` is current stable — no upgrade needed for Phase 3. [VERIFIED: `npm view @supabase/supabase-js version` returns 2.104.1] |
| `jwt-decode` | 4.0.0 | Decode JWT access_token payload to read `app_metadata.role` | Official Auth0 package, decode-only, zero dependencies, 13.9 kB unpacked, tree-shakeable ESM, TypeScript types bundled (no `@types/jwt-decode` needed). Signature verification unnecessary — Supabase-js already verifies server-side. [VERIFIED: `npm view jwt-decode` → 4.0.0, MIT, zero deps, 13.9 kB] |
| `react-hook-form` | 7.55.0 | Form state + validation orchestration | Phase 2 stack; 4 auth pages all follow the same RHF + Zod pattern used in `CadastroMultiStepForm`. |
| `@hookform/resolvers` | 5.2.2 | Zod ↔ RHF bridge | Used in Phase 2 for `zodResolver`. Already installed. |
| `zod` | 3.22.4 | Schema validation (email, password regex, refine match) | Phase 2 canonical; extract shared `passwordSchema` from `candidatoSchema.ts` (§Q4). |
| `sonner` | 2.0.3 | Toast notifications | Phase 2 canonical. **CRITICAL:** import as `from 'sonner'` (unversioned). `vite.config.ts` has `resolve.dedupe: ['sonner']` since Phase 2 Plan 02-06 — do NOT re-introduce a versioned alias. [VERIFIED: repo `vite.config.ts` + commit `466438b`] |
| `zustand` | 4.5.2 | Auth store (`useAuthStore`) + rate-limit slice | Already in place. Phase 3 adds a `rateLimitedUntil: number \| null` field (in-memory only — NOT persisted via `partialize`). |
| `lucide-react` | 0.487.0 | Icons enumerated by UI-SPEC (Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, Clock, Send, ShieldCheck) | Phase 2 canonical. |

### Supporting (existing — no new installs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-router-dom` | 6.28.0 | `useNavigate`, `useSearchParams` for `?tipo=rh` | Already used in all 4 pages. |
| shadcn/ui primitives | vendored | `Button`, `Input`, `Label`, `Checkbox`, `Form` | UI-SPEC § Form Field Contracts dictates exact usage. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jwt-decode` | Manual base64url split (`atob(token.split('.')[1])`) | Zero added bytes but must hand-handle base64url → base64 padding conversion (`.replace(/-/g,'+').replace(/_/g,'/')`), URL-safe chars, and UTF-8 decoding. Edge cases catch every project that tries it. `jwt-decode` is 13.9 kB for a bug-free, maintained solution. Recommend `jwt-decode`. |
| `jwt-decode` | `jose` | `jose` is 17.6 kB gzipped and implements the full JOSE spec (JWS/JWE/JWK/JWKS) — overkill for decode-only. Worth it if we needed to verify signatures client-side (we don't — supabase-js does). |
| Custom storage adapter | Recreate `supabase.createClient()` per login (option `a` in D-19) | **REJECTED.** The client is a singleton exported from `src/lib/supabase/client.ts`; 20+ files import `supabase` directly. Re-creating would require a subscription/ref pattern or a factory, and would detach all in-flight `onAuthStateChange` subscriptions. Broken blast radius. |
| Custom storage adapter | `localStorage` always + `beforeunload` signOut (option `c` in D-19) | **REJECTED.** `beforeunload` is unreliable on mobile (iOS Safari doesn't fire it consistently), async handlers inside beforeunload are ignored, and a crashed browser leaves the session dangling — defeating the purpose of "ephemeral when unchecked". |

**No new installs required** — `jwt-decode` is the only new dependency.

**Installation:**
```bash
npm install jwt-decode
```

**Version verification (2026-04-24):**
- `@supabase/supabase-js@2.104.1` — [VERIFIED: `npm view`; published recently]
- `jwt-decode@4.0.0` — [VERIFIED: `npm view`; MIT, 0 deps, 13.9 kB unpacked, published over a year ago, stable]

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (CLIENT)                                │
│                                                                          │
│  ┌─────────────────┐   ┌──────────────────┐   ┌───────────────────┐    │
│  │ Login pages     │   │ EsqueciSenha     │   │ RedefinirSenha    │    │
│  │ (Candidato/RH)  │   │ page             │   │ page              │    │
│  └───────┬─────────┘   └────────┬─────────┘   └─────────┬─────────┘    │
│          │                      │                       │              │
│          │  signIn(creds)       │ requestReset(email)   │ setNewPwd()  │
│          ▼                      ▼                       ▼              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  src/features/auth/services/authService.ts                       │  │
│  │  • signIn(email, senha, rememberMe) → AuthError|void             │  │
│  │  • requestPasswordReset(email) → void (neutral)                  │  │
│  │  • setNewPassword(newSenha) → AuthError|void + autoLogin         │  │
│  │  • resendConfirmation(email) → void                              │  │
│  │  • extractRetryAfterSeconds(error) → number (fallback 60s)       │  │
│  │  • mapSupabaseError(error) → AuthError                           │  │
│  └────┬──────────────────────────────────────────────────┬──────────┘  │
│       │                                                  │             │
│       │ sets rememberMeStorage flag                      │             │
│       ▼                                                  ▼             │
│  ┌──────────────────────────┐         ┌───────────────────────────┐   │
│  │ rememberMeStorage        │         │ supabase-js singleton     │   │
│  │ (custom Storage adapter) │────────▶│ (src/lib/supabase/client) │   │
│  │ routes to local vs       │         │ persistSession: true      │   │
│  │ sessionStorage           │         │ storage: rememberMeStorage│   │
│  └──────────────────────────┘         │ detectSessionInUrl: true  │   │
│                                       └────────┬──────────────────┘   │
│                                                │                       │
│                                                │ REST: /auth/v1/*      │
└────────────────────────────────────────────────┼───────────────────────┘
                                                 │
                                                 ▼
                            ┌──────────────────────────────────────┐
                            │   SUPABASE AUTH (external SaaS)      │
                            │   • /auth/v1/token (signIn)          │
                            │   • /auth/v1/recover                 │
                            │   • /auth/v1/user (updateUser)       │
                            │   • /auth/v1/resend                  │
                            │   + Custom Access Token Hook injects │
                            │     app_metadata.role into JWT       │
                            └──────────────────────────────────────┘

       ┌─────────────────────────────────────────────────────────┐
       │ supabase.auth.onAuthStateChange (listener in App.tsx)   │
       │ ─ SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED            │
       │     → authStore.setSession(session)                     │
       │     → extractRole(session) — NEW: decodes JWT payload   │
       │     → role drives RoleGuard redirect                    │
       │ ─ PASSWORD_RECOVERY                                     │
       │     → RedefinirSenha page uses as signal to show form   │
       │ ─ SIGNED_OUT → authStore.clearAuth()                    │
       └─────────────────────────────────────────────────────────┘
```

Primary use case trace — **Login happy path:**
1. User types email + senha, checks "Lembrar-me" (default true), submits.
2. `LoginCandidatoPage` → `authService.signIn({email, senha, rememberMe: true})`.
3. `authService` sets `rememberMeStorage.mode = 'local'` BEFORE calling supabase-js.
4. `supabase.auth.signInWithPassword({email, password})` → Supabase returns `{user, session}`.
5. SDK writes session via the injected Storage adapter → `localStorage['sb-auth-token']`.
6. SDK fires `SIGNED_IN` event → App.tsx listener → `authStore.setSession(session)`.
7. `extractRole(session)` (NEW: decodes JWT payload) reads `app_metadata.role` → `'candidato'`.
8. `authStore.role = 'candidato'` → `isAuthenticated = true`.
9. `LoginCandidatoPage` calls `navigate('/candidato/perfil', {replace: true})`.
10. RoleGuard sees `role === 'candidato'` → renders `MeuPerfilCandidatoPage`.

Primary use case trace — **Password recovery:**
1. User on `/auth/esqueci-senha` submits email.
2. `authService.requestPasswordReset(email)` → `supabase.auth.resetPasswordForEmail(email, {redirectTo: '{origin}/auth/redefinir-senha'})`.
3. Supabase sends email (template from Dashboard). UI shows neutral "Se o email estiver cadastrado..." regardless of result (D-09).
4. User clicks email link → browser opens `https://app/auth/redefinir-senha#access_token=...&type=recovery`.
5. `detectSessionInUrl: true` on createClient → SDK parses hash fragment → fires `PASSWORD_RECOVERY` event.
6. `RedefinirSenhaPage` mounts, subscribes to `onAuthStateChange` + checks `getSession()`. Both paths confirm recovery session is valid.
7. User fills nova + confirmar senha, submits.
8. `authService.setNewPassword(nova)` → `supabase.auth.updateUser({password: nova})`.
9. On success, SDK fires `USER_UPDATED` (session stays valid — user is already logged in via the recovery JWT).
10. `tryAutoLogin(email, nova)` (Phase 2 helper) — **but see §Q7 Pitfall 2: auto-login likely unnecessary; user is already SIGNED_IN**.
11. Toast "Senha alterada com sucesso" + `navigate('/candidato/perfil', {replace: true})`.

### Recommended Project Structure

```
src/
├── features/
│   └── auth/                       # NEW: canonical home for Phase 3
│       ├── services/
│       │   ├── authService.ts      # NEW: signIn/signOut/resend/mapSupabaseError/extractRetryAfterSeconds
│       │   ├── passwordService.ts  # NEW: requestPasswordReset/setNewPassword
│       │   └── index.ts            # UPDATE barrel: export * from both
│       ├── hooks/
│       │   ├── useLoginForm.ts     # NEW: RHF + signIn wiring (reused by Candidato + RH)
│       │   ├── useRateLimitCooldown.ts  # NEW: subscribes to rateLimitedUntil, derives live seconds
│       │   ├── useRecoverySession.ts    # NEW: validates PASSWORD_RECOVERY event on mount
│       │   └── index.ts            # UPDATE barrel
│       ├── schemas/                # NEW directory
│       │   ├── passwordSchema.ts   # NEW: extracted from candidatoSchema (see §Q4)
│       │   ├── loginSchema.ts      # MOVED from src/schemas/loginSchema.ts
│       │   ├── adminLoginSchema.ts # MOVED from src/schemas/adminLoginSchema.ts
│       │   ├── passwordRecoverySchema.ts    # MOVED + augmented
│       │   ├── redefinirSenhaSchema.ts     # NEW: uses passwordSchema + refine match
│       │   └── index.ts            # NEW barrel
│       ├── types/
│       │   ├── authTypes.ts        # NEW: AuthError class + code union (D-17) + type guards
│       │   └── index.ts            # UPDATE barrel
│       ├── utils/
│       │   ├── extractRole.ts      # NEW: jwt-decode wrapper (D-13 fix source for authStore)
│       │   ├── rememberMeStorage.ts    # NEW: custom Storage adapter (Q1 answer)
│       │   └── index.ts            # NEW barrel
│       └── README.md               # UPDATE: describe Phase 3 module layout
├── store/
│   └── authStore.ts                # EDIT: extractRole imports from features/auth/utils (D-13 fix)
├── lib/
│   └── supabase/
│       └── client.ts               # EDIT: storage = rememberMeStorage (Q1)
├── components/
│   └── pages/
│       ├── LoginCandidatoPage.tsx  # REWRITE
│       ├── LoginRHPage.tsx         # REWRITE (D-14 fix)
│       ├── EsqueciSenhaPage.tsx    # REWRITE
│       └── RedefinirSenhaPage.tsx  # REWRITE
└── features/cadastro/services/
    └── authService.ts              # EDIT: compat shim re-exporting from features/auth (see §Q3)
```

### Pattern 1: AuthError taxonomy (mirror of Phase 2 CadastroError)

**What:** Single `AuthError extends Error` class with a canonical code union. UI consumers pattern-match on `code` to render specific UX (toast copy, inline block, countdown).

**When to use:** Every `authService` entry point that can fail MUST `throw new AuthError(message, code, field?, retryAfterSeconds?)`. Never re-throw raw supabase-js errors.

**Example:**
```typescript
// Source: Phase 2 src/features/cadastro/services/cadastroService.ts:109-128 (proven pattern)

export class AuthError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_CREDENTIALS'
      | 'EMAIL_NOT_CONFIRMED'
      | 'RATE_LIMITED'
      | 'NETWORK_ERROR'
      | 'SERVER_ERROR'
      | 'UNKNOWN_ERROR',
    public field?: 'email' | 'senha',
    public retryAfterSeconds?: number,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
```

### Pattern 2: SDK error → AuthError mapping

**What:** Switch on `AuthApiError.code` (not string matching) to decide the project `code`. Supabase-js 2.104+ exposes `code` as a string that matches the `ErrorCode` union exported by `@supabase/auth-js/dist/module/lib/error-codes.d.ts`.

**When to use:** Every catch block in `authService` that receives a supabase-js `AuthError` (via `isAuthError(err)` or checking `err instanceof Error && 'code' in err`).

**Example:**
```typescript
// Source: VERIFIED against node_modules/@supabase/auth-js/dist/main/lib/error-codes.d.ts (line 6)
// and error taxonomy from Phase 2 Plan 02-05 02-05-SUMMARY.md

import { isAuthError } from '@supabase/supabase-js'
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'

function mapSupabaseError(err: unknown): AuthError {
  if (!(err instanceof Error) || !isAuthError(err)) {
    return new AuthError(
      'Erro inesperado. Tente novamente.',
      'UNKNOWN_ERROR',
      undefined,
      undefined,
      err
    )
  }

  const supabaseErr = err as SupabaseAuthError

  switch (supabaseErr.code) {
    case 'invalid_credentials':
      return new AuthError(
        'Email ou senha inválidos. Verifique os dados e tente novamente.',
        'INVALID_CREDENTIALS',
        undefined,
        undefined,
        supabaseErr
      )
    case 'email_not_confirmed':
      return new AuthError(
        'Confirme seu email antes de fazer login.',
        'EMAIL_NOT_CONFIRMED',
        'email',
        undefined,
        supabaseErr
      )
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new AuthError(
        'Muitas tentativas. Tente novamente em alguns instantes.',
        'RATE_LIMITED',
        undefined,
        extractRetryAfterSeconds(supabaseErr),
        supabaseErr
      )
    case 'weak_password':
      return new AuthError(
        'Senha muito fraca. Escolha uma senha mais forte.',
        'SERVER_ERROR', // weak is categorized under SERVER — UI maps to generic error toast
        'senha',
        undefined,
        supabaseErr
      )
    case 'same_password':
      return new AuthError(
        'A nova senha deve ser diferente da atual.',
        'SERVER_ERROR',
        'senha',
        undefined,
        supabaseErr
      )
    case 'session_expired':
    case 'otp_expired':
    case 'bad_jwt':
      return new AuthError(
        'Sessão expirada. Solicite um novo link.',
        'SERVER_ERROR',
        undefined,
        undefined,
        supabaseErr
      )
    default:
      // Check HTTP status as a fallback when code is undefined (known gap: invalid_credentials
      // sometimes ships with code=undefined — tracked in supabase/auth-js#947)
      if (supabaseErr.status === 400 && /credentials/i.test(supabaseErr.message)) {
        return new AuthError(
          'Email ou senha inválidos. Verifique os dados e tente novamente.',
          'INVALID_CREDENTIALS',
          undefined,
          undefined,
          supabaseErr
        )
      }
      if (supabaseErr.status && supabaseErr.status >= 500) {
        return new AuthError(
          'Algo deu errado. Tente novamente em alguns instantes.',
          'SERVER_ERROR',
          undefined,
          undefined,
          supabaseErr
        )
      }
      return new AuthError(
        'Erro inesperado. Tente novamente.',
        'UNKNOWN_ERROR',
        undefined,
        undefined,
        supabaseErr
      )
  }
}
```

### Pattern 3: Runtime-flag Storage adapter (D-06 / D-19)

**What:** Wrap `localStorage` and `sessionStorage` in a Storage-interface-compatible object whose `getItem/setItem/removeItem` delegate to one or the other based on a module-scoped flag. Flag is set BEFORE `signInWithPassword` fires.

**When to use:** Replace `storage: window.localStorage` in `src/lib/supabase/client.ts` with `storage: rememberMeStorage`.

**Example:** see §Code Examples → "rememberMeStorage adapter".

### Pattern 4: Client-side JWT decode (D-13 / D-20)

**What:** Use `jwt-decode` to extract `app_metadata.role` from the signed access_token. The SDK has already verified the signature (the token arrived from `/auth/v1/token`), so decode-only is safe.

**When to use:** `extractRole(session)` in `authStore.ts` — and ONLY there. No other code should decode JWTs.

**Example:** see §Code Examples → "extractRole fix".

### Pattern 5: PASSWORD_RECOVERY event + updateUser

**What:** Supabase-js fires a `PASSWORD_RECOVERY` `AuthChangeEvent` when the user arrives at the `redirectTo` URL. The session at that moment is a valid, authenticated session (recovery JWT). Calling `updateUser({password})` while in this session changes the password and keeps the session alive — the user is already logged in.

**When to use:** `RedefinirSenhaPage` on mount + `useRecoverySession` hook.

**Example:** see §Code Examples → "Full recovery flow".

### Anti-Patterns to Avoid

- **String-matching on `error.message`** — Phase 1/2 scaffolds use `error.message.includes('Invalid login credentials')`. BREAKS when supabase-js changes wording (has happened between versions). Use `error.code` (or status fallback).
- **Verifying JWT signature client-side** — The SDK already verifies. Using `jose.jwtVerify` requires the JWKS endpoint + async verification + bundle cost for zero security gain.
- **Storing rate-limit cooldown in localStorage** — user clearing storage ≠ legitimate unlock (UI-SPEC line 404). Keep in Zustand in-memory slice or a `useRef`.
- **Forging `role` through legacy setters** — `setAdminUser(row)` with client-side heuristic (`'nome_completo' in obj`) is the exact Bug 2 we're fixing. Never trust client-supplied role; always decode from JWT.
- **Recreating the supabase client per login** (D-19 option `a`) — singleton is imported across 20+ files; recreation breaks every `onAuthStateChange` subscription.
- **Using `beforeunload` for session cleanup** (D-19 option `c`) — unreliable on mobile Safari; async handlers ignored; crashed browser leaves session dangling.
- **Showing `{emailValue}` in esqueci-senha success state** — scaffold currently does this; removed per UI-SPEC Dim1 (anti-enumeration + type-error display).
- **Looking for `role` at `session.user.app_metadata.role`** — this is the Phase 1 Bug 1 root cause. The SDK populates `session.user.app_metadata` from `auth.users.raw_app_meta_data`, which does NOT contain the hook-injected `role`. Only the JWT payload does. [VERIFIED: KNOWN-ISSUES-CARRYOVER-PHASE-3.md + Phase 1 live JWT inspection]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT base64url decode | Manual `atob` + string split | `jwt-decode@4.0.0` | URL-safe base64 padding, UTF-8 decode, error handling. 13.9 kB saves one bug-prone helper. |
| Password complexity validation | Custom regex | `passwordSchema` in `features/auth/schemas/` (extracted from Phase 2 candidatoSchema) | Zod `.refine()` chain is proven; reuse identical messages across cadastro + reset. |
| JWT signature verification | `jose`, `jsonwebtoken`, etc. | **Nothing** — supabase-js already verifies | We receive the JWT FROM `/auth/v1/token`; the channel is authenticated. Client-side re-verification adds bundle cost for zero gain. |
| Storage swap logic | Recreating supabase client per login | Custom Storage adapter (§Pattern 3) | Singleton preservation is critical. Adapter is ~30 lines. |
| Rate-limit cooldown (client-side) | setInterval countdown with manual cleanup | `useRateLimitCooldown` hook (new; subscribes to Zustand slice) | Handles remount, tab visibility, cleanup automatically via React lifecycle. |
| "Reenviar email" CTA logic | Custom resend endpoint | `supabase.auth.resend({type: 'signup', email})` | Built into SDK. [VERIFIED: supabase-js Context7 docs — `resend()` method on auth namespace] |
| Recovery session validation | Query string parsing + custom session storage | `supabase.auth.onAuthStateChange` + `PASSWORD_RECOVERY` event + `detectSessionInUrl: true` | SDK handles hash-fragment parsing and session materialization natively. |
| **Client-side rate-limit tracker (existing `src/services/rateLimitService.ts`)** | Keep the localStorage-based service | **Delete it.** Rely on Supabase's server-side rate limit + D-03 cooldown UI | The current service tracks per-email in localStorage — trivially bypassed by clearing storage or using incognito. Supabase enforces server-side at `/auth/v1/*` endpoints. The client only needs to react to a 429. |
| Logging service (`src/services/logAccessService.ts`) | Keep it, wire auth events through it | **Defer to Phase 5.** Remove from Phase 3 scope per D-17 (auth_audit_log is Phase 5 hardening) | Phase 3 is behavior-first; audit telemetry is a separate concern. |

**Key insight:** Supabase-js 2.104 already owns ~80% of what Phase 3 needs (session persistence, JWT emission, rate limit enforcement, email delivery, recovery event, resend, updateUser). The project's job is a thin client wrapper: error mapping + storage swap + JWT decode + UI copy. Everything else is reinventing the SDK.

---

## Common Pitfalls

### Pitfall 1: `session.user.app_metadata.role` is always `undefined` (Bug 1 — D-13)

**What goes wrong:** `extractRole()` reads `session.user.app_metadata.role` and always gets `null`. RoleGuard never redirects; user stuck on `/auth/login`.

**Why it happens:** supabase-js populates `session.user.app_metadata` from the Auth server's user record (`auth.users.raw_app_meta_data`), NOT from the JWT. The Custom Access Token Hook injects `role` into the JWT payload only — never into the user record. [VERIFIED: KNOWN-ISSUES-CARRYOVER-PHASE-3.md §Bug 1 + live JWT inspection at jwt.io]

**How to avoid:** Decode `session.access_token` directly. `jwt-decode` + typed payload shape.

**Warning signs:** `auth-storage` in localStorage shows `role: null` after a successful login.

### Pitfall 2: Auto-login after `updateUser` is redundant — user is already signed in

**What goes wrong:** Calling `tryAutoLogin(email, newPassword)` after `supabase.auth.updateUser({password})` may succeed, but it's a race: the SDK is still processing the `USER_UPDATED` event when the second signIn fires.

**Why it happens:** The recovery session from clicking the email link is already authenticated. `updateUser` changes the password but keeps the session alive (and emits `USER_UPDATED`, not `SIGNED_OUT`). `tryAutoLogin` performs an unnecessary round-trip.

**How to avoid:** After `updateUser` success, the user is ALREADY `SIGNED_IN`. Just call `authStore.initialize()` (to refresh the role extraction via the NEW access token) OR trust the `USER_UPDATED` handler in App.tsx to update the session. Then `navigate('/candidato/perfil')`.

**Fallback:** If `updateUser` returns `session_expired` or the recovery JWT was invalidated mid-flow, THEN fall back to `tryAutoLogin` + redirect to `/auth/login` if that also fails. See §Code Examples → "setNewPassword with fallback".

**Warning signs:** Toast "Senha alterada" appearing twice; `SIGNED_IN` event fired after `USER_UPDATED`; `console.log` showing duplicate session objects.

### Pitfall 3: Rate-limit `Retry-After` header is NOT exposed by supabase-js

**What goes wrong:** Plan assumes `AuthError.retryAfter` or similar field — none exists. `AuthApiError` has only `{message, status, code}`.

**Why it happens:** supabase-js throws on 429, but the SDK doesn't surface response headers. The underlying fetch promise resolves with `AuthApiError`; the `Response.headers.get('Retry-After')` is discarded inside the SDK. [VERIFIED: `node_modules/@supabase/auth-js/dist/main/lib/errors.d.ts` — AuthError class has no retryAfter field]

**How to avoid:** Implement `extractRetryAfterSeconds(error)` with 3 strategies:
1. **Parse the message** — Supabase sometimes embeds "try again in X seconds" text. Regex `/(\d+)\s*second/i`.
2. **Parse `code`** — different codes imply different windows (email send = 60s, request = configurable).
3. **Fallback to fixed value** — 60s for `over_email_send_rate_limit`, 60s for `over_request_rate_limit`.

See §Code Examples → "extractRetryAfterSeconds helper".

**Warning signs:** Cooldown timer shows `0s` immediately; button stays disabled; error toast has no countdown.

### Pitfall 4: Recovery link expiry default may be 1h OR 24h — Dashboard-configurable

**What goes wrong:** AUTH-03 mandates 1h expiry. Research found conflicting defaults in Supabase docs (1h for magic link / OTP, 24h in some password-reset contexts).

**Why it happens:** Supabase Dashboard exposes `Auth > Providers > Email > Email OTP Expiration`. The project's current setting is not committed to the repo — likely still default 24h (the current scaffold at `RedefinirSenhaPage.tsx:421` hardcodes `"Links de recuperação expiram em 24 horas"`, suggesting it was written against the 24h default).

**How to avoid:** Phase 3 MUST verify the Dashboard setting is **3600 seconds (1 hour)**. This is a one-time runbook step — add it to the Wave 0 task checklist. UI-SPEC line 567 already corrects the copy to "1 hora".

**Warning signs:** Email link still valid after 2h in QA; copy mismatches reality.

### Pitfall 5: Recovery link is single-use — second click fails silently

**What goes wrong:** User clicks email link → lands on `/auth/redefinir-senha` → navigates away → clicks the same email link again → gets `otp_expired` or `bad_jwt` with no clear messaging.

**Why it happens:** Supabase recovery tokens are single-use by design (security). Second click = token already consumed.

**How to avoid:** Map `otp_expired`, `bad_jwt`, `session_expired` all to the "Link inválido ou expirado" InvalidLinkState in `RedefinirSenhaPage` (UI-SPEC lines 531-565). Add a "Solicitar novo link" CTA.

**Warning signs:** Users report "the link doesn't work" despite clicking recently.

### Pitfall 6: Sonner import specifier drift (Phase 2 Plan 02-06 regression)

**What goes wrong:** A future agent adds a new page with `import { toast } from 'sonner@2.0.3'`. Vite optimizeDeps creates a second pre-bundle → split instance → toasts silently dropped.

**Why it happens:** Phase 2 Plan 02-06 removed all `'sonner@2.0.3'` imports + added `resolve.dedupe: ['sonner']`. The dedupe is belt-and-braces, but relies on the library name being consistent.

**How to avoid:** Phase 3 new files MUST use `import { toast } from 'sonner'` (unversioned). Add an E2E regression assertion in the Sonner DOM contract test (already in `e2e/cadastro-flow.spec.ts:276` — extend it to cover login/reset toasts).

**Warning signs:** Toast shows nothing in UAT; `<section aria-label="Notifications alt+T">` is empty in DOM inspector.

### Pitfall 7: `supabase.rpc as unknown as (...)` detached `this` (Phase 2 Plan 02-06 regression — source of truth)

**What goes wrong:** Any extracted reference to a supabase-js method (e.g., `const rpc = supabase.rpc`) loses `this`, and internal `this.rest` crashes.

**Why it happens:** supabase-js internals dereference `this`. Detached calls lose context.

**How to avoid:** Call through `.call(supabase, ...)` OR always invoke as `supabase.method(...)` directly. Phase 3 `authService` should always invoke as `supabase.auth.signInWithPassword(...)` — no extraction.

**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'rest')` before any network I/O.

### Pitfall 8: `redirectTo` URL must be allow-listed in Supabase Dashboard

**What goes wrong:** `resetPasswordForEmail(email, {redirectTo: 'http://localhost:3003/auth/redefinir-senha'})` silently sends the default Supabase redirect URL instead.

**Why it happens:** Supabase Dashboard maintains an allow-list at `Auth > URL Configuration > Redirect URLs`. Only URLs matching the list will be honored.

**How to avoid:** Phase 3 Wave 0 runbook step: confirm `http://localhost:3003/auth/redefinir-senha`, `http://localhost:3003/auth/redefinir-senha?tipo=rh`, and the production URL are registered. Document in the same preflight checklist as Pitfall 4.

**Warning signs:** Email link redirects to Supabase's hosted page instead of `/auth/redefinir-senha`.

### Pitfall 9: `AuthApiError.code` is sometimes `undefined` for `invalid_credentials`

**What goes wrong:** Supabase server returns 400 with body `{"message":"Invalid login credentials"}` but no `code` field. Client-side `AuthApiError.code === undefined`. Phase 3 code that only switches on `error.code` misses this case.

**Why it happens:** Known bug — tracked at [supabase/auth-js#947](https://github.com/supabase/auth-js/issues/947). The server response to `/auth/v1/token` with bad credentials lacks the code property in some deployments.

**How to avoid:** Fallback detection: `if (status === 400 && /invalid|credentials/i.test(message)) return AuthError('INVALID_CREDENTIALS', ...)`. Already in §Code Examples → mapSupabaseError.

**Warning signs:** Wrong-password attempts produce generic `UNKNOWN_ERROR` toast instead of "Email ou senha inválidos".

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Dev server + tsc | ✓ | local | — |
| Supabase CLI | `npm run db:types` | ✓ (via npx) | 1.x | — |
| Supabase Auth (hosted) | signIn, resetPasswordForEmail, updateUser | ✓ | project `isljnozzlvckrgjjbjwp` live | — |
| Supabase Dashboard email template customization | password reset email | ✓ | default template OK (D-21 defers customization) | Branded template is backlog M2 |
| Custom Access Token Hook (deployed) | JWT role claim | ✓ (Phase 1 Wave 2) | active in prod | — |
| SMTP provider | email delivery | ✓ (built-in Supabase SMTP) | default | Custom SMTP (Sendgrid/Mailgun) is backlog; rate limit is lower on built-in |
| `jwt-decode` | extractRole | ✗ (not installed) | 4.0.0 needed | Manual base64 split (rejected per §Don't Hand-Roll) |
| Email OTP Expiration setting | AUTH-03 1h | **UNVERIFIED** | Dashboard config (see Pitfall 4) | Wave 0 runbook step MUST verify 3600s |
| Redirect URL allow-list | AUTH-04 deeplink | **UNVERIFIED** | Dashboard config (see Pitfall 8) | Wave 0 runbook step MUST verify allow-list contains `/auth/redefinir-senha` URLs |
| Playwright browsers (chromium) | E2E | ✓ | Phase 2 | — |

**Missing dependencies with no fallback:**
- `jwt-decode@4.0.0` — must be installed as new dep (Wave 0 or Wave 1 first task).

**Missing dependencies with fallback:**
- Email OTP Expiration + Redirect URL allow-list — dashboard configs; validated at Wave 0, not code-blocking.

**Config state that MUST be verified before execution (Wave 0 runbook):**

1. **Supabase Dashboard — Auth > Providers > Email > Email OTP Expiration** → set to `3600` seconds (1 hour) per AUTH-03. Default might be 86400 (24h). Get a screenshot; diff against current settings.
2. **Supabase Dashboard — Auth > URL Configuration > Redirect URLs** → must include (exact matches or wildcards):
   - `http://localhost:3003/auth/redefinir-senha`
   - `http://localhost:3003/auth/redefinir-senha?tipo=rh` (if query-preserving match needed)
   - Production URL equivalents (TBD when prod is deployed)
3. **Custom Access Token Hook** → confirm still enabled (Phase 1 Plan 04 artifact). Run `curl -X POST .../auth/v1/token?grant_type=password` with valid creds, decode the returned `access_token` at jwt.io, verify `app_metadata.role` is present.
4. **Rate limit config** (optional sanity) — Auth > Rate Limits. Default of `30 emails/hour` on built-in SMTP is acceptable for dev UAT. Bump to custom SMTP before prod (backlog).

---

## Code Examples

### Q1 storage swap — `rememberMeStorage` adapter

```typescript
// Source: based on supabase-js v2 Storage interface
// (node_modules/@supabase/auth-js/dist/main/lib/types.d.ts — SupportedStorage)
// Recommended approach for D-06 / D-19 option (b).

// src/features/auth/utils/rememberMeStorage.ts

const STORAGE_KEY_PREFIX = 'sb-'
type StorageMode = 'local' | 'session'

let currentMode: StorageMode = 'local'

function getBackingStore(): Storage {
  return currentMode === 'local' ? window.localStorage : window.sessionStorage
}

function getOtherStore(): Storage {
  return currentMode === 'local' ? window.sessionStorage : window.localStorage
}

/**
 * Called BEFORE `supabase.auth.signInWithPassword`. Sets which underlying
 * storage subsequent writes route to. Also migrates an existing session
 * from the OTHER store (covers "logged-in, then changed Lembrar-me setting
 * on next login" edge case).
 *
 * Security note: if `mode === 'session'`, ANY keys already persisted in
 * localStorage under the supabase prefix are cleared to prevent session
 * leakage across "ephemeral" logins.
 */
export function setRememberMeMode(mode: StorageMode): void {
  if (mode === currentMode) return
  // Wipe the other store's supabase keys so toggling from local → session
  // doesn't leave a persistent session orphaned in localStorage.
  const other = currentMode === 'local' ? window.localStorage : window.sessionStorage
  for (let i = other.length - 1; i >= 0; i--) {
    const key = other.key(i)
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      other.removeItem(key)
    }
  }
  currentMode = mode
}

/**
 * Custom Storage adapter: implements the supabase-js SupportedStorage interface
 * (getItem / setItem / removeItem). Fulfills `auth.storage` contract.
 *
 * The SDK writes `sb-auth-token` and `sb-<project>-auth-token` keys; this
 * adapter routes them all to the current backing store.
 */
export const rememberMeStorage = {
  getItem(key: string): string | null {
    // Read-through: check both stores so a freshly-booted tab can find the
    // session regardless of which store it was last written to (handles
    // "user closed tab with Lembrar-me checked, reopened tab later").
    return getBackingStore().getItem(key) ?? getOtherStore().getItem(key)
  },
  setItem(key: string, value: string): void {
    getBackingStore().setItem(key, value)
  },
  removeItem(key: string): void {
    // Remove from both stores defensively (SIGNED_OUT must clear everywhere).
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}
```

Used in `src/lib/supabase/client.ts`:
```typescript
// BEFORE (current):
// storage: window.localStorage,

// AFTER:
import { rememberMeStorage } from '@/features/auth/utils/rememberMeStorage'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: rememberMeStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    flowType: 'pkce',
    storageKey: 'sb-auth-token',
  },
})
```

Used in `authService.signIn`:
```typescript
// src/features/auth/services/authService.ts

import { setRememberMeMode } from '@/features/auth/utils/rememberMeStorage'

export async function signIn(input: {
  email: string
  senha: string
  rememberMe: boolean
}): Promise<void> {
  // Set storage mode BEFORE the signIn call so the SDK writes to the right store.
  setRememberMeMode(input.rememberMe ? 'local' : 'session')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.senha,
  })

  if (error) throw mapSupabaseError(error)
  if (!data.session) throw new AuthError('Sessão não estabelecida', 'UNKNOWN_ERROR')
  // onAuthStateChange listener in App.tsx will handle authStore.setSession.
}
```

### Q2 JWT decode — `extractRole` fix (D-13)

```typescript
// Source: jwt-decode@4.0.0 README + recommended pattern from
// KNOWN-ISSUES-CARRYOVER-PHASE-3.md §Bug 1 "Fix proposed (Phase 3) Opção A"

// src/features/auth/utils/extractRole.ts

import { jwtDecode } from 'jwt-decode'
import type { Session } from '@supabase/supabase-js'
import type { Role } from '@/store/authStore'

interface SupabaseAccessTokenPayload {
  app_metadata?: {
    role?: string
    provider?: string
    providers?: string[]
  }
  user_metadata?: Record<string, unknown>
  sub?: string
  email?: string
  exp?: number
  iat?: number
  aud?: string
}

/**
 * Extracts the role claim from the signed access_token JWT.
 *
 * WHY NOT session.user.app_metadata.role? The SDK populates `session.user`
 * from the /auth/v1/user endpoint, which reads `auth.users.raw_app_meta_data`
 * — a column that does NOT contain the hook-injected role. The Custom Access
 * Token Hook injects `role` ONLY into the JWT payload. Decoding the access_token
 * is the only reliable way to read it client-side.
 *
 * Signature verification is NOT needed: the token came directly from the
 * Supabase Auth endpoint over HTTPS, and supabase-js validates signatures
 * server-side on every subsequent request. This function is decode-only.
 */
export function extractRole(session: Session | null): Role | null {
  if (!session?.access_token) return null

  try {
    const payload = jwtDecode<SupabaseAccessTokenPayload>(session.access_token)
    const raw = payload.app_metadata?.role
    if (raw === 'candidato' || raw === 'rh' || raw === 'administrador') {
      return raw
    }
    return null
  } catch {
    // Malformed token — treat as no role (RoleGuard will redirect to login).
    // Do NOT log the error: the token contains signed claims we don't want
    // to surface in console.error.
    return null
  }
}
```

Used in `src/store/authStore.ts`:
```typescript
// REPLACE lines 121-136 with:
import { extractRole } from '@/features/auth/utils/extractRole'
// ... (rest of store uses extractRole unchanged)
```

### Full login service — `authService.signIn` with error mapping

```typescript
// src/features/auth/services/authService.ts (key function)

import { supabase } from '@/lib/supabase/client'
import { isAuthError as isSupabaseAuthError } from '@supabase/supabase-js'
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'
import { setRememberMeMode } from '@/features/auth/utils/rememberMeStorage'
import { AuthError } from '@/features/auth/types/authTypes'

export async function signIn(input: {
  email: string
  senha: string
  rememberMe: boolean
}): Promise<void> {
  // Pitfall 7 redaction: NEVER log input.senha.
  console.log('[AUTH] signIn invoked', {
    email: input.email,
    rememberMe: input.rememberMe,
    hasPassword: Boolean(input.senha),
  })

  setRememberMeMode(input.rememberMe ? 'local' : 'session')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.senha,
  })

  if (error) {
    console.error('[AUTH] signIn error:', { code: error.code, status: error.status })
    throw mapSupabaseError(error)
  }
  if (!data.session) {
    throw new AuthError('Sessão não estabelecida.', 'UNKNOWN_ERROR')
  }
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) {
    console.error('[AUTH] resend error:', { code: error.code })
    throw mapSupabaseError(error)
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('[AUTH] signOut error:', { code: error.code })
    throw mapSupabaseError(error)
  }
}

function mapSupabaseError(err: SupabaseAuthError): AuthError {
  // See §Pattern 2 — full switch. Abbreviated here:
  switch (err.code) {
    case 'invalid_credentials':
      return new AuthError('Email ou senha inválidos. Verifique os dados e tente novamente.', 'INVALID_CREDENTIALS', undefined, undefined, err)
    case 'email_not_confirmed':
      return new AuthError('Confirme seu email antes de fazer login.', 'EMAIL_NOT_CONFIRMED', 'email', undefined, err)
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new AuthError('Muitas tentativas. Tente novamente em alguns instantes.', 'RATE_LIMITED', undefined, extractRetryAfterSeconds(err), err)
    case 'same_password':
      return new AuthError('A nova senha deve ser diferente da atual.', 'SERVER_ERROR', 'senha', undefined, err)
    case 'weak_password':
      return new AuthError('Senha muito fraca. Escolha uma senha mais forte.', 'SERVER_ERROR', 'senha', undefined, err)
    case 'session_expired':
    case 'otp_expired':
    case 'bad_jwt':
      return new AuthError('Sessão expirada. Solicite um novo link.', 'SERVER_ERROR', undefined, undefined, err)
    default:
      // Fallback for known gap: invalid_credentials with undefined code
      if (err.status === 400 && /credentials/i.test(err.message)) {
        return new AuthError('Email ou senha inválidos. Verifique os dados e tente novamente.', 'INVALID_CREDENTIALS', undefined, undefined, err)
      }
      if ((err.status ?? 0) >= 500) {
        return new AuthError('Algo deu errado. Tente novamente em alguns instantes.', 'SERVER_ERROR', undefined, undefined, err)
      }
      return new AuthError('Erro inesperado. Tente novamente.', 'UNKNOWN_ERROR', undefined, undefined, err)
  }
}

/**
 * Heuristic for retry-after seconds. Supabase-js does NOT expose the
 * Retry-After header (verified against @supabase/auth-js 2.104 type defs).
 * Strategy:
 *   1. Regex the message for "in X seconds" / "try again in X"
 *   2. Fall back to a fixed value per code (60s matches Supabase default
 *      email-send and request token-bucket refill.)
 */
export function extractRetryAfterSeconds(err: SupabaseAuthError): number {
  const match = err.message?.match(/(\d+)\s*second/i)
  if (match) {
    const secs = parseInt(match[1], 10)
    if (Number.isFinite(secs) && secs > 0 && secs <= 3600) return secs
  }
  if (err.code === 'over_email_send_rate_limit') return 60
  if (err.code === 'over_request_rate_limit') return 60
  return 60 // default fallback
}
```

### Full password recovery flow — `passwordService`

```typescript
// src/features/auth/services/passwordService.ts

import { supabase } from '@/lib/supabase/client'
import { AuthError } from '@/features/auth/types/authTypes'
import { mapSupabaseError } from './authService'  // or internal re-export

/**
 * D-09 — ALWAYS returns without throwing. UI shows neutral message regardless
 * of whether email exists. Silently logs (internal only) errors for debugging.
 *
 * Exception: RATE_LIMITED is the only error code we surface — user needs to
 * see the cooldown or they'll keep clicking Submit.
 */
export async function requestPasswordReset(email: string, isRH: boolean = false): Promise<void> {
  const redirectTo = `${window.location.origin}/auth/redefinir-senha${isRH ? '?tipo=rh' : ''}`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) {
    console.error('[AUTH] resetPasswordForEmail error:', { code: error.code, status: error.status })
    // ONLY throw on rate-limit so UI can show cooldown
    if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
      throw mapSupabaseError(error)
    }
    // All other errors: swallow (anti-enumeration). UI shows neutral success regardless.
  }
}

/**
 * Called from RedefinirSenhaPage after user submits new password.
 * The user MUST already have a valid recovery session (confirmed by
 * useRecoverySession hook on mount).
 *
 * After updateUser success, the user is STILL SIGNED_IN (the recovery
 * session stays alive). No manual re-login needed — just refresh the
 * role from the new access_token and navigate.
 */
export async function setNewPassword(newSenha: string): Promise<void> {
  console.log('[AUTH] setNewPassword invoked', { hasPassword: Boolean(newSenha) })

  const { error } = await supabase.auth.updateUser({ password: newSenha })
  if (error) {
    console.error('[AUTH] updateUser error:', { code: error.code })
    throw mapSupabaseError(error)
  }
  // On success:
  //   - SDK fires USER_UPDATED → App.tsx listener → authStore.setSession (role re-extracted)
  //   - User remains authenticated with the new password
  //   - Caller should navigate('/candidato/perfil', { replace: true })
}
```

### `useRecoverySession` hook — validate recovery JWT on mount

```typescript
// src/features/auth/hooks/useRecoverySession.ts

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type RecoveryState =
  | { status: 'validating' }
  | { status: 'valid'; email: string }
  | { status: 'invalid' }

/**
 * On mount:
 * 1. Check getSession() — if the user arrived via deeplink, detectSessionInUrl
 *    has already parsed the hash fragment and materialized the session.
 * 2. Subscribe to onAuthStateChange to catch the PASSWORD_RECOVERY event
 *    (fires async in some browsers if the session arrives slightly after mount).
 * 3. Timeout at 2s — if neither path confirms a valid session, treat as invalid.
 */
export function useRecoverySession(): RecoveryState {
  const [state, setState] = useState<RecoveryState>({ status: 'validating' })

  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (!cancelled && state.status === 'validating') {
        setState({ status: 'invalid' })
      }
    }, 2000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' && session?.user?.email) {
        setState({ status: 'valid', email: session.user.email })
      }
    })

    // Also check imperatively — detectSessionInUrl may have already materialized
    // the session before this component mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session?.user?.email) {
        setState({ status: 'valid', email: data.session.user.email })
      }
    })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
     
  }, [])

  return state
}
```

### Rate-limit cooldown — Zustand slice + hook

```typescript
// src/features/auth/hooks/useRateLimitCooldown.ts

import { useEffect, useState } from 'react'
import { create } from 'zustand'

interface RateLimitState {
  rateLimitedUntil: number | null // epoch ms
  setCooldown: (seconds: number) => void
  clear: () => void
}

// NOT persisted (in-memory only). User clearing storage != legit unlock.
const useRateLimitStore = create<RateLimitState>((set) => ({
  rateLimitedUntil: null,
  setCooldown: (seconds) => set({ rateLimitedUntil: Date.now() + seconds * 1000 }),
  clear: () => set({ rateLimitedUntil: null }),
}))

export function useRateLimitCooldown(): {
  remainingSeconds: number
  isActive: boolean
  setCooldown: (seconds: number) => void
} {
  const { rateLimitedUntil, setCooldown } = useRateLimitStore()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!rateLimitedUntil || rateLimitedUntil <= now) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [rateLimitedUntil, now])

  const remaining = rateLimitedUntil ? Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000)) : 0
  return {
    remainingSeconds: remaining,
    isActive: remaining > 0,
    setCooldown,
  }
}
```

### Shared password schema (Q4)

```typescript
// src/features/auth/schemas/passwordSchema.ts

import { z } from 'zod'

/**
 * Shared password schema. Extracted from the Phase 2 candidatoSchema.ts
 * senhaSchema to keep cadastro and redefinir-senha in lock-step.
 *
 * Requisitos (D-11):
 * - Mínimo 8 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 */
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(100, 'Senha deve ter no máximo 100 caracteres')
  .refine((val) => /[A-Z]/.test(val), { message: 'Inclua pelo menos uma letra maiúscula' })
  .refine((val) => /[a-z]/.test(val), { message: 'Inclua pelo menos uma letra minúscula' })
  .refine((val) => /[0-9]/.test(val), { message: 'Inclua pelo menos um número' })

// src/features/auth/schemas/redefinirSenhaSchema.ts

export const redefinirSenhaSchema = z
  .object({
    nova_senha: passwordSchema,
    confirmar_nova_senha: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((d) => d.nova_senha === d.confirmar_nova_senha, {
    message: 'As senhas não coincidem',
    path: ['confirmar_nova_senha'],
  })

export type RedefinirSenhaFormData = z.infer<typeof redefinirSenhaSchema>
```

Then in `candidatoSchema.ts`:
```typescript
// REPLACE the existing inline senhaSchema (lines 135-156) with:
import { passwordSchema } from '@/features/auth/schemas/passwordSchema'
const senhaSchema = passwordSchema  // preserves existing local alias
```

---

## Q1–Q10: Answers to Required Research Questions

### Q1 — Storage swap strategy for "Lembrar-me" (D-19)

**Recommendation:** **Option (b) — Custom Storage adapter wrapper** (`rememberMeStorage`).

**Justification:**

| Criterion | (a) Recreate client | (b) Storage adapter | (c) Always local + beforeunload signOut |
|-----------|---------------------|---------------------|------------------------------------------|
| Blast radius | 20+ files import `supabase` singleton; recreation breaks all subscriptions | Zero — `createClient()` stays intact; only `auth.storage` changes | Zero code changes, but semantically fragile |
| SDK compat | Must re-subscribe `onAuthStateChange` per recreation; race conditions | Full native support — `storage` option is first-class in createClient | Full native support |
| Refresh-token behavior | BROKEN: if client is recreated mid-lifetime of a token, the new client has no awareness of pending refresh | Correct — single SDK instance manages its own refresh | Correct |
| Test surface | Hard — requires mocking the entire createClient flow | Small — unit test the adapter (30 lines) + smoke test session-then-close-tab | Medium — requires unreliable beforeunload test |
| Regression risk | HIGH — adminAuthStore shim + every import breaks | LOW — adapter is additive, typed against SupportedStorage interface | HIGH — beforeunload is unreliable on mobile Safari; async handlers ignored |
| Mobile safety | N/A | Works on all browsers | BROKEN on iOS Safari in some cases |

Option (a) fails the singleton constraint; option (c) fails mobile reliability. Option (b) is the only one that doesn't require a tradeoff.

**Code sketch:** see §Code Examples → "rememberMeStorage adapter". Full working implementation is ~30 lines plus the `setRememberMeMode()` helper.

**Edge case — "logged in with Lembrar-me, then returned without session":** `rememberMeStorage.getItem` does a read-through (check local, then session). This covers the case where a user logged in persistent in tab A, then opened tab B (different session — sessionStorage is per-tab). Without read-through, tab B would appear logged out despite having a valid localStorage session. [Verified: standard browser sessionStorage semantics — one store per tab/window.]

**Edge case — migrating FROM local TO session:** `setRememberMeMode('session')` clears the `sb-*` keys from localStorage BEFORE mode swap, so an old persistent session doesn't leak into what the user intends as an ephemeral login.

**Confidence:** HIGH. Pattern is the supabase-js documented way to customize storage ([VERIFIED: Context7 docs + `auth.storage` config]).

### Q2 — JWT decode library (D-20)

**Recommendation:** **`jwt-decode@4.0.0`**.

**Justification:**

| Criterion | jwt-decode 4.0.0 | Manual base64 split | jose 6.x |
|-----------|-------------------|---------------------|-----------|
| Bundle cost | 13.9 kB unpacked, ~2-3 kB minified+gzipped | 0 | ~17.6 kB gzipped (full JOSE spec) |
| Tree-shakeable | Yes (ESM) | N/A | Yes (ESM) — but we'd still pull the `jwtDecode`-equivalent |
| TypeScript types | Bundled (no `@types/*` needed) | Manual | Bundled |
| Edge cases handled | base64url padding, URL-safe chars, UTF-8 decoding, malformed token | All manual — bug-prone | Handled |
| Maintenance | Auth0 OSS, 4.0.0 published, stable | Project-owned | panva, very active |
| Signature verify | NO (decode-only) | N/A | YES (we don't need this — SDK does it) |
| Dependencies | 0 | 0 | 0 |

**Why not `jose`:** it does more than we need. `jose` is the right choice if we had to verify signatures ourselves (e.g., edge workers validating JWTs without a central auth service). In our case, supabase-js has already received the token directly from `/auth/v1/token` over HTTPS; the channel is trusted. Decode-only is safe and sufficient.

**Why not manual base64:** too many edge cases. Base64url ↔ base64 padding, URL-safe char substitution, UTF-8 decoding for `utf8` claims (unlikely but possible in `email` fields with diacritics). Every project that rolls this hand-grown helper eventually hits a bug. 13.9 kB is cheap insurance.

**Exact import + usage:** see §Code Examples → "extractRole fix". Key line:
```typescript
import { jwtDecode } from 'jwt-decode'
const payload = jwtDecode<SupabaseAccessTokenPayload>(session.access_token)
const role = payload.app_metadata?.role
```

**Confidence:** HIGH. Package verified against npm registry; typed payload is the documented pattern per jwt-decode README.

### Q3 — `src/features/auth/` module layout

**Recommendation:**

```
src/features/auth/
├── services/
│   ├── authService.ts         # signIn, signOut, resendConfirmation, mapSupabaseError, extractRetryAfterSeconds
│   ├── passwordService.ts     # requestPasswordReset, setNewPassword
│   └── index.ts               # barrel
├── hooks/
│   ├── useLoginForm.ts        # RHF orchestration shared by Candidato + RH
│   ├── useRateLimitCooldown.ts
│   ├── useRecoverySession.ts
│   └── index.ts
├── schemas/                   # NEW directory
│   ├── passwordSchema.ts      # shared with cadastro (Q4)
│   ├── loginSchema.ts         # moved from src/schemas/
│   ├── adminLoginSchema.ts    # moved from src/schemas/
│   ├── passwordRecoverySchema.ts  # moved + augmented
│   ├── redefinirSenhaSchema.ts    # new
│   └── index.ts
├── types/
│   ├── authTypes.ts           # AuthError class + type guards
│   └── index.ts
├── utils/                     # NEW directory
│   ├── extractRole.ts         # jwt-decode wrapper (D-13 source)
│   ├── rememberMeStorage.ts   # custom Storage adapter (Q1)
│   └── index.ts
└── README.md                  # update to describe the module
```

**Does `authService.ts` move from `src/features/cadastro/services/` to `src/features/auth/services/`?**

**YES, but with a compat shim.**

- **New canonical location:** `src/features/auth/services/authService.ts` — contains the Phase 3 `AuthError` (D-17 taxonomy), `signIn`, `signOut`, `resendConfirmation`, `mapSupabaseError`, `extractRetryAfterSeconds`.
- **Compat shim:** `src/features/cadastro/services/authService.ts` — rewritten as a thin re-export. The ONLY symbol Phase 2 `cadastroService.ts` consumes from `./authService` is `signUp` and `AuthError` (line 28: `import { signUp, AuthError } from './authService'`). Preserve those exports by:
  - Keep the `signUp` function body in `src/features/cadastro/services/authService.ts` (it's cadastro-specific — only the cadastro flow calls it; the Phase 3 login flow doesn't sign up users).
  - Also keep `tryAutoLogin` in cadastroService.ts OR move to `authService.ts` (new). RECOMMENDATION: **move `tryAutoLogin` to `src/features/auth/services/authService.ts`** and import it from cadastroService.
  - The OLD `AuthError` class in `src/features/cadastro/services/authService.ts` had a DIFFERENT code union (`WEAK_PASSWORD|EMAIL_EXISTS|INVALID_EMAIL|INVALID_CREDENTIALS|NETWORK_ERROR|UNKNOWN_ERROR|EMAIL_NOT_CONFIRMED`) than the new one we're building (D-17). Rename the old one to `SignUpError` to avoid confusion, then delete the `INVALID_CREDENTIALS|EMAIL_NOT_CONFIRMED` codes from it (dead — only login uses those, and login now lives in the new authService).

**Compat shim implementation:**

```typescript
// src/features/cadastro/services/authService.ts (AFTER Phase 3)

// Re-export the new canonical module for external consumers who were
// importing from here. cadastroService.ts is the only known consumer, but
// this keeps the contract stable for any other legacy imports.
export { AuthError } from '@/features/auth/types/authTypes'
export { tryAutoLogin } from '@/features/auth/services/authService'

// Keep signUp here — it's cadastro-specific (called only by cadastroService,
// which calls Edge Function for the rest of the multi-table orchestration).
// This preserves the existing authService.signUp() API.
export { signUp } from './signUpService'  // OR keep inline
```

**Confidence:** HIGH. This mirrors the Phase 1 `adminAuthStore.ts` shim pattern (src/store/adminAuthStore.ts re-exports useAuthStore) — established and tested idiom in this codebase.

### Q4 — Password schema factoring

**Recommendation:** **Extract to `src/features/auth/schemas/passwordSchema.ts`**.

**Justification:**
- Exactly the same regex used in 2 places (cadastro Step 1, redefinir-senha). Duplicating means 2 places to update when policy changes.
- `redefinirSenhaSchema` composes `passwordSchema` + `.refine` for match — same composition pattern used in Phase 2 `candidatoSchema.ts` for `dadosPessoaisSchema`.
- Single test suite covers the regex (currently tested inside candidatoSchema tests — moving them too).
- Error messages are pt-BR canonical — extract alongside the regex to avoid drift.

**Implementation:** see §Code Examples → "Shared password schema (Q4)".

**Migration:** Edit `src/features/cadastro/schemas/candidatoSchema.ts` to import from the new location. Vitest tests for the senhaSchema move too. [VERIFIED: only 1 consumer today — `candidatoSchema.ts` line 135]

**Confidence:** HIGH.

### Q5 — Rate-limit countdown mechanics

**Answer:** supabase-js does **NOT** expose `Retry-After` header via `AuthError`. [VERIFIED: `node_modules/@supabase/auth-js/dist/main/lib/errors.d.ts` — AuthError class has only `message`, `status`, `code`, `__isAuthError`.]

**Strategy — `extractRetryAfterSeconds(error)`:**

1. **Parse message regex** — Supabase occasionally embeds "try again in X seconds" in `error.message`. Regex `/(\d+)\s*second/i`.
2. **Fallback per code** — `over_email_send_rate_limit` → 60s (default token bucket refill); `over_request_rate_limit` → 60s.
3. **Ultimate fallback** — 60s.

```typescript
export function extractRetryAfterSeconds(err: SupabaseAuthError): number {
  const match = err.message?.match(/(\d+)\s*second/i)
  if (match) {
    const secs = parseInt(match[1], 10)
    if (Number.isFinite(secs) && secs > 0 && secs <= 3600) return secs
  }
  if (err.code === 'over_email_send_rate_limit') return 60
  if (err.code === 'over_request_rate_limit') return 60
  return 60
}
```

**Why 60s as default:** Supabase Auth default token bucket is 30 capacity with 60s refill on the email endpoints (verified via rate-limits docs). Using 60s ensures the retry button re-enables AT OR AFTER the actual server-side unlock, never before.

**Confidence:** HIGH on the SDK gap; MEDIUM on 60s fixed fallback (it's the documented Supabase default but per-project rate limits may differ when custom SMTP is configured — fine since we don't have custom SMTP in scope).

### Q6 — Email-not-confirmed detection (D-02)

**Answer:** `error.code === 'email_not_confirmed'`. [VERIFIED against `@supabase/auth-js/dist/main/lib/error-codes.d.ts` line 6 — `'email_not_confirmed'` is a canonical `ErrorCode` enum member.]

**Detection logic:**
```typescript
if (error.code === 'email_not_confirmed') {
  // Show Reenviar CTA
}
```

No substring matching on `error.message`. No status-code-only heuristic. The `code` field is reliable for this specific error (verified enum).

**Resend call (D-02):**
```typescript
await supabase.auth.resend({ type: 'signup', email })
```

[VERIFIED: supabase-js API `resend({type, email})` documented in Context7 docs — type 'signup' triggers the email-verification resend flow.]

**Confidence:** HIGH.

### Q7 — `resetPasswordForEmail` + `updateUser` flow

**Canonical flow (verified against supabase-js + Supabase docs + AuthChangeEvent type def):**

1. **Sending the email:**
   ```typescript
   await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/auth/redefinir-senha`
   })
   ```
   [VERIFIED: Context7 /supabase/supabase-js — resetPasswordForEmail params]
   - `redirectTo` MUST be in the Dashboard allow-list (see Pitfall 8).
   - Email template = Supabase default (customization out of scope per D-21).

2. **Receiving the deeplink:**
   - User clicks email link `https://<supabase-project>.supabase.co/auth/v1/verify?...&redirect_to=<redirectTo>`
   - Supabase server verifies the OTP token, mints a session, redirects to `redirectTo` with hash fragment (PKCE flow) `#access_token=...&refresh_token=...&type=recovery`
   - With `detectSessionInUrl: true` (currently set in `client.ts:45`), supabase-js automatically parses the fragment on mount.
   - SDK fires `onAuthStateChange` with event `'PASSWORD_RECOVERY'` and a valid `session`.

3. **Detecting the recovery session:**
   ```typescript
   const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
     if (event === 'PASSWORD_RECOVERY') {
       // Session is authenticated via recovery JWT — safe to show the new-password form.
     }
   })
   ```
   [VERIFIED: `@supabase/auth-js/dist/main/lib/types.d.ts:14` — `PASSWORD_RECOVERY` is an official AuthChangeEvent]
   - PLUS: also call `supabase.auth.getSession()` on mount — the event may fire before the component subscribes if the mount is slow (race). Both paths converge.

4. **Calling `updateUser`:**
   ```typescript
   const { error } = await supabase.auth.updateUser({ password: newSenha })
   ```
   [VERIFIED: Context7 /supabase/supabase-js PATCH /auth/user]

5. **Post-`updateUser` state:**
   - Session STAYS VALID — the user is still authenticated with the recovery JWT (which has been re-scoped to a full session).
   - SDK fires `USER_UPDATED` (not a new `SIGNED_IN`).
   - App.tsx listener (line 167) calls `setSession` → authStore re-derives `role` from the new access_token.
   - **`tryAutoLogin` is UNNECESSARY in the happy path.** It's only useful as a fallback if `updateUser` itself returns `session_expired` (meaning the recovery token was invalidated mid-flow — rare but possible if the user waits > expiry window on the redefinir page).

6. **Link expiry:**
   - Supabase Dashboard `Auth > Providers > Email > Email OTP Expiration` governs this.
   - AUTH-03 requires **1 hour (3600s)**. Default might be `86400` (24h). Wave 0 runbook MUST verify (Pitfall 4).

**End-to-end code sketch — complete recovery flow:**

```typescript
// src/components/pages/RedefinirSenhaPage.tsx (schematic)

function RedefinirSenhaPage() {
  const recovery = useRecoverySession() // returns { status: 'validating' | 'valid' | 'invalid' }
  const navigate = useNavigate()
  const { handleSubmit, formState: { errors, isSubmitting } } = useForm({ ... })

  async function onSubmit(data) {
    try {
      await setNewPassword(data.nova_senha)
      toast.success('Senha alterada com sucesso.', { duration: 4000 })
      // User already SIGNED_IN via recovery session + USER_UPDATED fired.
      // authStore has the new role from the refreshed access_token.
      navigate('/candidato/perfil', { replace: true })
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.code === 'SERVER_ERROR' && /session|expired/i.test(err.message)) {
          // Fallback: recovery token invalidated mid-flow.
          // Try re-login with the still-known email + new password.
          // (The email was captured when PASSWORD_RECOVERY event fired.)
          const retryOk = await tryAutoLogin(recovery.email, data.nova_senha)
          if (retryOk) {
            toast.success('Senha alterada com sucesso.', { duration: 4000 })
            navigate('/candidato/perfil', { replace: true })
          } else {
            toast.success('Senha alterada. Faça login para continuar.', { duration: 5000 })
            navigate('/auth/login', { replace: true })
          }
          return
        }
      }
      // All other errors: surface via toast, stay on page.
      toast.error(getErrorCopy(err))
    }
  }

  if (recovery.status === 'validating') return <ValidatingSpinner />
  if (recovery.status === 'invalid') return <InvalidLinkState />
  return <Form onSubmit={handleSubmit(onSubmit)}>...</Form>
}
```

**Confidence:** HIGH on flow mechanics; MEDIUM on exact expiry default (needs Dashboard verification in Wave 0).

### Q8 — `?tipo=rh` query param detection (from UI-SPEC)

**Current state:** `EsqueciSenhaPage.tsx` lines 40-41 and `RedefinirSenhaPage.tsx` lines 66-67 already read `searchParams.get('tipo')`. It works; the pattern is reused.

**Recommendation:** **Keep the query-param pattern for EsqueciSenha and RedefinirSenha (both serve candidato + RH).** These pages are genuinely dual-purpose — same layout, same Supabase call, only the post-submit "Voltar ao login" link and the redirect target differ.

**For LoginCandidato vs LoginRH — keep them as SEPARATE routes** (`/auth/login` vs `/auth/login-rh`), as currently. Reasons:
- Different role expectations (LoginCandidato accepts any role and navigates per role; LoginRH rejects non-administrator).
- Different footer content (LoginCandidato has "Criar conta" link; LoginRH has no signup path — administrators create RH accounts manually, per UI-SPEC line 648).
- Different success redirects (`/candidato/perfil` vs `/rh/dashboard`).
- Security: keeping them separate makes the D-14 fix (LoginRH role check) explicit and auditable.

**Simplest ApproachPhase 3 consumer pattern:**
```typescript
// src/features/auth/hooks/useAuthFlowVariant.ts (new)
import { useSearchParams } from 'react-router-dom'

export type AuthVariant = 'candidato' | 'rh'

export function useAuthFlowVariant(): AuthVariant {
  const [searchParams] = useSearchParams()
  return searchParams.get('tipo') === 'rh' ? 'rh' : 'candidato'
}
```

Used by EsqueciSenhaPage + RedefinirSenhaPage. Kept simple — no context, no state, just a derived value.

**No new routes needed.** Rotas `/auth/login`, `/auth/login-rh`, `/auth/esqueci-senha`, `/auth/redefinir-senha` already exist in `routes.tsx`. [VERIFIED]

**Confidence:** HIGH.

### Q9 — Obsolete services audit

**Kept:**
- `src/features/cadastro/services/cadastroService.ts` — Phase 2 canonical, still in use (CadastroMultiStepForm)
- `src/features/cadastro/services/duplicateCheckService.ts` — Phase 2 canonical
- `src/features/cadastro/services/n8nService.ts` — unrelated to Phase 3; leave alone
- `src/features/cadastro/services/viaCepService.ts` — cadastro-only; leave alone

**Moved/refactored:**
- `src/features/cadastro/services/authService.ts` — rewrite as compat shim re-exporting from `src/features/auth/services/` (see §Q3). Preserve `signUp` (cadastro needs it), move `tryAutoLogin` into new module, replace old `AuthError` class with re-export of the NEW D-17 `AuthError` (or rename old to `SignUpError`). 
- `src/schemas/loginSchema.ts` → `src/features/auth/schemas/loginSchema.ts`
- `src/schemas/adminLoginSchema.ts` → `src/features/auth/schemas/adminLoginSchema.ts`
- `src/schemas/passwordRecoverySchema.ts` → `src/features/auth/schemas/passwordRecoverySchema.ts`

**Deleted (obsolete, functionality replaced by Supabase SDK + new authService):**

| File | Reason | Consumers |
|------|--------|-----------|
| `src/services/rateLimitService.ts` | Client-side localStorage-based limiter; trivially bypassed; rely on Supabase server-side + D-03 cooldown UI | EsqueciSenhaPage (rewritten per UI-SPEC — no longer calls this) |
| `src/services/userTypeDetectionService.ts` | Post-reset "detect type" query on candidatos/usuarios_rh; replaced by `extractRole(session)` from JWT | RedefinirSenhaPage (rewritten — uses role from authStore) |
| `src/services/passwordChangeConfirmationService.ts` | Send-email-after-password-change via n8n; OUT OF SCOPE per CONTEXT `deferred` | RedefinirSenhaPage (rewritten — no email sending in Phase 3) |
| `src/services/errorHandlingService.ts` | Custom `processError` wrapper; replaced by new `authService.mapSupabaseError` | RedefinirSenhaPage (rewritten) |
| `src/services/securityValidationService.ts` | Hand-rolled password strength scoring (5 criteria, 0-5 score); replaced by Zod silent per D-11 | RedefinirSenhaPage (rewritten — Zod only) |

**Deferred-delete (Phase 5):**
| File | Reason |
|------|--------|
| `src/services/logAccessService.ts` | Login/logout audit logging; CONTEXT.md defers `auth_audit_log` to Phase 5 hardening. Current consumers (LoginRHPage, EsqueciSenhaPage, RedefinirSenhaPage, useSessionTimeout) all get rewritten in Phase 3 WITHOUT these calls. File becomes orphaned — keep the file (harmless) and delete in Phase 5 when adding proper telemetry |
| `src/store/adminAuthStore.ts` | Phase 1 compat shim re-exporting useAuthStore. Still used by LoginRHPage (being rewritten) and useSessionTimeout (untouched per D-07). Leave alone — removal is M2 concern (01-02 Plan notes) |

**Audit results:**
```bash
grep -rn "logAccessService\|rateLimitService\|userTypeDetectionService\|passwordChangeConfirmationService\|errorHandlingService\|securityValidationService" src/
```
- Only consumers: the 4 auth pages being rewritten + useSessionTimeout (logAccessService only).
- After Phase 3 rewrite: 5 of 6 services become orphaned. **Delete in Phase 3.** logAccessService keeps ONE consumer (useSessionTimeout — NOT in scope for Phase 3 per D-07); that consumer stays.

**Confidence:** HIGH. Cross-referenced every import via grep.

### Q10 — Scaffold cleanup task shape

**Exact delete/keep/create list (for planner to task-ify):**

**Files to DELETE:**
- `src/services/rateLimitService.ts`
- `src/services/userTypeDetectionService.ts`
- `src/services/passwordChangeConfirmationService.ts`
- `src/services/errorHandlingService.ts`
- `src/services/securityValidationService.ts`
- `src/services/__tests__/*` for the 5 above (if any exist — verify with `ls`)

**Files to MOVE:**
- `src/schemas/loginSchema.ts` → `src/features/auth/schemas/loginSchema.ts`
- `src/schemas/adminLoginSchema.ts` → `src/features/auth/schemas/adminLoginSchema.ts`
- `src/schemas/passwordRecoverySchema.ts` → `src/features/auth/schemas/passwordRecoverySchema.ts`
- (then delete the `src/schemas/` directory if empty — verify first; other schemas may exist)

**Files to CREATE:**

Services:
- `src/features/auth/services/authService.ts` — new D-17 taxonomy + signIn/signOut/resend
- `src/features/auth/services/passwordService.ts` — requestPasswordReset/setNewPassword
- `src/features/auth/services/index.ts` — barrel (update existing stub)
- `src/features/auth/services/__tests__/authService.test.ts` — 7-10 tests (mapSupabaseError per code, extractRetryAfterSeconds per input)
- `src/features/auth/services/__tests__/passwordService.test.ts` — 3-4 tests

Hooks:
- `src/features/auth/hooks/useLoginForm.ts`
- `src/features/auth/hooks/useRateLimitCooldown.ts`
- `src/features/auth/hooks/useRecoverySession.ts`
- `src/features/auth/hooks/useAuthFlowVariant.ts` (Q8)
- `src/features/auth/hooks/index.ts` — barrel (update existing stub)

Schemas:
- `src/features/auth/schemas/passwordSchema.ts` — extracted (Q4)
- `src/features/auth/schemas/redefinirSenhaSchema.ts` — new
- `src/features/auth/schemas/index.ts` — new barrel

Types:
- `src/features/auth/types/authTypes.ts` — `AuthError` class + code union (D-17) + type guards
- `src/features/auth/types/index.ts` — barrel (update existing stub)

Utils:
- `src/features/auth/utils/extractRole.ts` — jwt-decode wrapper (D-13)
- `src/features/auth/utils/rememberMeStorage.ts` — Storage adapter (Q1)
- `src/features/auth/utils/index.ts` — new barrel
- `src/features/auth/utils/__tests__/extractRole.test.ts` — 3 tests (valid role, invalid role, malformed token)
- `src/features/auth/utils/__tests__/rememberMeStorage.test.ts` — 4 tests (mode switch, read-through, clear both, clearOtherOnSwitch)

README:
- `src/features/auth/README.md` — UPDATE to describe the new layout

**Files to REWRITE (in-place):**
- `src/components/pages/LoginCandidatoPage.tsx` — full rewrite to new spec
- `src/components/pages/LoginRHPage.tsx` — full rewrite (D-14 fix)
- `src/components/pages/EsqueciSenhaPage.tsx` — full rewrite
- `src/components/pages/RedefinirSenhaPage.tsx` — full rewrite
- `src/store/authStore.ts` — EDIT: import `extractRole` from `@/features/auth/utils`, delete the inline `extractRole` function (D-13)
- `src/lib/supabase/client.ts` — EDIT: replace `storage: window.localStorage` with `storage: rememberMeStorage`
- `src/features/cadastro/services/authService.ts` — REWRITE as compat shim (§Q3)
- `src/features/cadastro/schemas/candidatoSchema.ts` — EDIT: import `passwordSchema` instead of inline senhaSchema (§Q4)
- `package.json` — EDIT: add `jwt-decode` dependency
- `src/features/auth/README.md` — UPDATE layout description

**Tests already existing that need update:**
- `src/features/cadastro/services/__tests__/authService.test.ts` — since the file relocates, delete the old tests (they tested signUp + AuthError union that's now different); the new auth service gets its own tests at `src/features/auth/services/__tests__/`. Keep signUp tests IF `signUp` stays in cadastro's authService (shim).
- E2E: add `e2e/login-flow.spec.ts` (new file, Playwright) — 5-8 scenarios per §Validation Architecture.
- E2E: add `e2e/password-recovery.spec.ts` (new file) — 3-4 scenarios (validating mock email to bypass the actual SMTP — see §Validation Architecture).

**Task shape for planner:**

1. Wave 0: Install `jwt-decode`, create passwordSchema, create authTypes.ts (AuthError class)
2. Wave 1a: Create `extractRole` util + unit tests → edit authStore to use it (closes D-13/Bug 1)
3. Wave 1b: Create `rememberMeStorage` + unit tests → edit `client.ts` to use it (closes D-06/D-19)
4. Wave 1c: Create authService + passwordService + unit tests
5. Wave 2a: Rewrite LoginCandidatoPage (UI-SPEC compliant)
6. Wave 2b: Rewrite LoginRHPage (UI-SPEC + D-14 fix)
7. Wave 2c: Rewrite EsqueciSenhaPage (UI-SPEC + neutral copy)
8. Wave 2d: Rewrite RedefinirSenhaPage (UI-SPEC + PASSWORD_RECOVERY event)
9. Wave 2e: Move schemas, compat-shim cadastro/authService, delete obsolete services
10. Wave 3: E2E suite (login-flow + password-recovery) + manual UAT at iPhone 12 Pro

**Confidence:** HIGH on the enumeration; plan sequencing is a planner concern but the dependencies are clear.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| supabase-js v1 callback-based auth | v2 Promise-based + `onAuthStateChange` subscription | 2022-10 (v2 stable) | All auth calls return `{data, error}`; current scaffold already uses v2 |
| `sessionStorage` vs `localStorage` hardcoded | Custom `storage` adapter (any `SupportedStorage` interface) | supabase-js v2.1+ | Q1 recommendation depends on this |
| Manual JWT decode with base64 regex | `jwt-decode@4.0.0` (zero-dep, tree-shakeable) | 2022-06 (4.0 release) | D-20 recommendation |
| `Retry-After` header parsing | NOT available via `AuthError`; parse message + fallback | Still valid 2026-04 | Q5 mitigation |
| Role in `session.user.user_metadata` | Role in JWT `app_metadata` via Custom Access Token Hook | Supabase Auth hooks stable 2024 | D-13 fix relies on this |
| `supabase.auth.api.resetPasswordForEmail` (v1) | `supabase.auth.resetPasswordForEmail` (v2) | 2022-10 | Already v2 in scaffold |

**Deprecated/outdated in the current scaffold:**
- `src/services/rateLimitService.ts` — client-side rate limiting via localStorage; bypassable.
- `src/services/securityValidationService.ts` — hand-rolled strength scoring; replaced by Zod silent.
- `src/services/userTypeDetectionService.ts` — post-reset "which table has this user_id" query; replaced by JWT role claim.
- Manual `setAdminUser` forgery in LoginRHPage — replaced by JWT role check.
- 24-hour link expiry copy in RedefinirSenhaPage — incorrect; should be 1h per AUTH-03 + Dashboard config.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Dashboard `Email OTP Expiration` is NOT currently set to 3600s; likely 86400s (24h) default | Pitfall 4, Environment Availability, §Q7 | If already 1h, Wave 0 runbook step is a no-op; if not, Wave 0 MUST change it before any UAT |
| A2 | Supabase Dashboard `Redirect URLs` allow-list includes `http://localhost:3003/auth/redefinir-senha` | Pitfall 8, Environment Availability | If missing, deeplinks fall back to Supabase-hosted page — breaks AUTH-04 |
| A3 | `invalid_credentials` error code from supabase-js 2.104 is reliably populated most of the time, but has a known gap (issue #947). Fallback status+message check covers the gap | Pitfall 9, Code Examples | If the fallback is wrong for a specific Supabase deployment, wrong-password attempts may show generic UNKNOWN_ERROR |
| A4 | `tryAutoLogin` after `updateUser` is unnecessary (user is already SIGNED_IN via recovery session) | Pitfall 2, §Q7 | If wrong, fallback to `tryAutoLogin` + redirect to /auth/login is already in the setNewPassword catch path — graceful degradation |
| A5 | Default Supabase email rate limit (built-in SMTP) is ~30 emails/hour (may vary by project tier) | §Q5, Environment Availability | If project has custom SMTP, limit is higher; if hit rate-limit in UAT with built-in SMTP, don't panic |
| A6 | `logAccessService` has no runtime-critical consumer beyond `useSessionTimeout` (which is not in Phase 3 scope) | §Q9 | If grep missed a consumer, that consumer will break at runtime — Wave 0 should re-grep after auth pages are rewritten to confirm |

**Mitigation strategy:** Wave 0 runbook (see Environment Availability) addresses A1/A2. A3 is handled by fallback code. A4 is handled by try/catch fallback. A5 is a UAT-env concern, not blocking.

---

## Open Questions

1. **Should the "Criar conta" footer link on LoginCandidatoPage navigate to `/auth/inscricao` (current route, Phase 1 stub) or `/cadastro` (Phase 2 canonical)?**
   - What we know: both routes exist in `routes.tsx`. Phase 2 success page navigates to `/candidato/perfil` from `/cadastro`. `/auth/inscricao` is a Phase 1 scaffold (InscricaoPage) that may predate the merged cadastro flow.
   - What's unclear: whether `/auth/inscricao` is a redirect shim or still a standalone page.
   - Recommendation: Point "Criar conta" to `/cadastro` (Phase 2 canonical). Verify `/auth/inscricao` either is a redirect to `/cadastro` or gets one in Phase 3. (Low blast radius — 1 line change + test.)

2. **Does `cadastroService.signUp` still throw `EMAIL_EXISTS` now that the Edge Function returns `error_code: 'EMAIL_EXISTS'` directly?**
   - What we know: Phase 2 Plan 02-05 canonical `CadastroError` union includes `EMAIL_EXISTS`. The OLD `AuthError` in `cadastro/services/authService.ts` also has `EMAIL_EXISTS`. They're parallel unions.
   - What's unclear: whether `signUp` is even called in Phase 2 flow (CadastroMultiStepForm calls `cadastrarCandidato` via EF, not `signUp` directly).
   - Recommendation: grep `signUp(` in src/ to verify. If no callers, delete during Phase 3 cleanup. If callers, leave `signUp` untouched in the shim.

3. **Should Phase 3 attempt to fix the 24h → 1h link expiry in the Supabase Dashboard programmatically (via `supabase.auth.admin.updateConfig` or similar) OR as a manual runbook step?**
   - What we know: Dashboard config is admin-managed; no public API exposes this.
   - Recommendation: manual runbook step in Wave 0; document in `03-01-PLAN.md` preflight checklist; screenshot the before/after setting for audit.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.7 (unit/integration), Playwright 1.56.1 (E2E) |
| Config file | `vitest.config.ts`, `playwright.config.ts` (both present from Phase 2) |
| Quick run command | `npm run test:run` (vitest single-run) |
| Full suite command | `npm run test:run && npm run test:e2e` |
| Testing libraries | `@testing-library/react`, `@testing-library/user-event`, `happy-dom` |

### Critical Behaviors (must be validated)

| ID | Behavior | Maps to Requirement |
|----|----------|---------------------|
| B1 | Login candidato with correct creds → role=candidato in authStore + redirect /candidato/perfil | AUTH-01, D-13 |
| B2 | Login candidato with wrong creds → INVALID_CREDENTIALS + generic "Email ou senha inválidos" | AUTH-01, D-01 |
| B3 | Login with unconfirmed email → EMAIL_NOT_CONFIRMED + "Reenviar email" button triggers resend | AUTH-01, D-02 |
| B4 | Rate limit 429 → RATE_LIMITED + cooldown countdown on submit button + disabled until zero | AUTH-01, D-03 |
| B5 | "Lembrar-me" unchecked → session in sessionStorage → survives page reload in SAME tab, dies on tab close | AUTH-02, D-06 |
| B6 | "Lembrar-me" checked (default) → session in localStorage → survives tab close and browser restart | AUTH-02, D-05 |
| B7 | `extractRole` returns role from JWT payload, not app_metadata | D-13, Bug 1 |
| B8 | LoginRH rejects candidato/rh roles (signOut + error toast); only administrador proceeds | D-14, Bug 2/3 |
| B9 | `resetPasswordForEmail` always returns neutral UI copy; actual error is swallowed (except RATE_LIMITED) | AUTH-03, D-09 |
| B10 | Redefinir-senha flow: deeplink → PASSWORD_RECOVERY event → form → updateUser → redirect /candidato/perfil | AUTH-04, D-12 |
| B11 | Password mismatch on redefinir-senha surfaces Zod error on submit (not live) | D-11 |
| B12 | Expired/single-use recovery link surfaces "Link inválido ou expirado" InvalidLinkState | AUTH-03, Pitfall 5 |
| B13 | Network error during signIn surfaces NETWORK_ERROR toast with "Tentar novamente" action | AUTH-01, D-04 |
| B14 | Password not redacted in any `console.*` call during any auth flow (Pitfall 7) | D-12 Phase 2 carryover |
| B15 | Sonner toast renders in DOM for all auth flows (regression against split-instance bug) | Phase 2 Plan 02-06 UAT |
| B16 | `rememberMeStorage.setRememberMeMode('session')` clears localStorage supabase keys | Q1 security |

### Validation Strategies per Behavior

| Behavior | Unit | Component | E2E | Manual UAT | Notes |
|----------|------|-----------|-----|------------|-------|
| B1 | authService.signIn — mock supabase.auth.signInWithPassword; assert setRememberMeMode called + throws nothing | — | cadastro-flow-like test in login-flow.spec.ts | ✓ iPhone 12 Pro | authStore role assertion covered by E2E URL change |
| B2 | mapSupabaseError with `{code:'invalid_credentials'}` → `AuthError{code:'INVALID_CREDENTIALS'}` | LoginCandidatoPage render after submit with wrong creds → toast text match | login-flow E2E: fill wrong creds → assert toast + field preservation | ✓ | Covered by mapSupabaseError unit tests |
| B3 | mapSupabaseError with `{code:'email_not_confirmed'}` → `AuthError{code:'EMAIL_NOT_CONFIRMED'}` | LoginCandidatoPage shows Reenviar block | login-flow E2E (requires seed user with unconfirmed email — env-gated) | ✓ | resend call mock asserts `{type:'signup', email}` |
| B4 | extractRetryAfterSeconds with rate-limit error + useRateLimitCooldown counts down + button reenables | — | ✓ login-flow (simulate by mocking 429 response at test level — skip in CI) | ✓ | Rate-limit E2E is deterministically flaky; env-gated like Phase 2 rate_limited test |
| B5/B6 | rememberMeStorage adapter test: set mode session → setItem routes to sessionStorage; reload simulated by re-read → still there; teardown mock | — | manual (browser-only) | ✓ — CRITICAL iPhone 12 Pro UAT | Cannot fully automate: real tab-close behavior requires real browser |
| B7 | extractRole with valid JWT → returns role; with malformed → null; with missing role claim → null | — | E2E login-flow asserts redirect works end-to-end (implicit) | ✓ | jwt-decode unit tests cover |
| B8 | mapSupabaseError OK; LoginRH role check in authService.signIn variant (or in page-level) | LoginRHPage component test: after signIn with role='candidato' session, assert signOut called + toast match | login-rh-flow E2E (env-gated: needs candidato user + admin user) | ✓ | D-14 critical; cover with both unit + component |
| B9 | passwordService.requestPasswordReset with `{code:'invalid_email'}` → NO throw; with `{code:'over_email_send_rate_limit'}` → throws | EsqueciSenhaPage component: submit invalid email → shows neutral success UI | esqueci-senha E2E: submit any email → assert neutral copy + toast | ✓ | D-09 anti-enumeration |
| B10 | passwordService.setNewPassword mock; useRecoverySession hook test (mock onAuthStateChange) | RedefinirSenhaPage renders correct state per useRecoverySession return | Full recovery E2E: mock email flow (intercept supabase.auth.resetPasswordForEmail → inject a manually-generated recovery session) | ✓ — 2-person UAT (dev + real email) | E2E for email deeplink is manual-only; use supabase.auth.admin.generateLink in test setup if available |
| B11 | redefinirSenhaSchema parse with mismatched passwords → Zod error at `confirmar_nova_senha` | RedefinirSenhaPage component: fill mismatched → submit → inline error visible | E2E redefinir-flow (with mocked recovery session) | — | Zod schema test is sufficient |
| B12 | useRecoverySession returns `{status:'invalid'}` when no session + 2s timeout | RedefinirSenhaPage with invalid state → InvalidLinkState rendered | — | ✓ | Mock the getSession + onAuthStateChange to time out |
| B13 | mapSupabaseError with network failure (supabase.auth threw) → AuthError{code:'NETWORK_ERROR'} | — | — | ✓ disconnect wifi in UAT | Network errors hard to automate deterministically |
| B14 | Grep src/features/auth/ for `console.*.*senha\|password\|access_token` → zero matches; unit test: spy console, call signIn, assert no mock.calls contain password | — | — | ✓ | Phase 2 Pitfall 7 pattern exactly |
| B15 | — | — | E2E: after any toast fires, assert `<section aria-label="Notifications alt+T"> <li data-sonner-toast>` present within 1s | ✓ | Extend Phase 2 `cadastro-flow.spec.ts:276` regression pattern to login flows |
| B16 | rememberMeStorage test: start with `sb-*` keys in localStorage, call setRememberMeMode('session'), assert localStorage emptied of sb-* prefix | — | — | ✓ | Security test (session leakage prevention) |

### Coverage Matrix

| Behavior | Unit | Component | E2E | Manual UAT |
|----------|------|-----------|-----|------------|
| B1 (login success) | ✓ | — | ✓ | ✓ |
| B2 (invalid creds) | ✓ | ✓ | ✓ | ✓ |
| B3 (email not confirmed) | ✓ | ✓ | env-gated | ✓ |
| B4 (rate limit) | ✓ | — | env-gated | ✓ |
| B5 (session ephemeral) | ✓ (adapter) | — | — | ✓ CRITICAL |
| B6 (session persistent) | ✓ (adapter) | — | — | ✓ CRITICAL |
| B7 (extractRole JWT) | ✓ | — | ✓ (implicit via B1) | ✓ |
| B8 (LoginRH role gate) | ✓ | ✓ | env-gated | ✓ |
| B9 (reset neutral) | ✓ | ✓ | ✓ | ✓ |
| B10 (redefinir flow) | ✓ | ✓ | partial (mocked) | ✓ 2-person |
| B11 (password mismatch) | ✓ (schema) | ✓ | — | ✓ |
| B12 (expired link) | ✓ (hook) | ✓ | — | ✓ |
| B13 (network error) | ✓ | — | — | ✓ |
| B14 (no password in logs) | ✓ (grep + spy) | — | — | — |
| B15 (Sonner DOM) | — | — | ✓ | ✓ |
| B16 (storage leakage) | ✓ | — | — | ✓ |

### Untestable Behaviors (Manual UAT only)

- **B5/B6 tab-close session lifecycle** — real browser behavior on actual tab close cannot be faked reliably in Playwright (context.close() isn't the same as user-driven tab close in all browsers for sessionStorage semantics). MUST manual-UAT in Chrome + Safari.
- **B10 real email deliverability** — Supabase built-in SMTP rate-limits; email arrival in actual inbox requires a real mailbox. Mock in E2E; verify once per Phase in UAT with a real test email account.
- **B13 real network disconnection** — chrome DevTools offline mode is close, but not perfectly equivalent to real flaky network. Manual UAT: turn off wifi mid-submit.
- **B14 password-in-logs — browser devtools network inspection for request/response bodies** — static unit tests cover console.log; network leakage requires dev inspection in real flow.
- **B15 Sonner split-instance regression** — E2E catches if someone re-adds a versioned import; the underlying root cause can only be manually re-verified by inspecting `.vite/deps/` for `sonner*.js` files.

### Test Infrastructure Gaps

- **MSW (Mock Service Worker):** NOT currently in the project. Decision: do NOT introduce for Phase 3. The Phase 2 pattern of `vi.mock('@/lib/supabase/client')` plus `vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue(...)` is sufficient for unit/component tests. MSW is defer-to-phase-5 if integration tests grow.
- **Playwright "logged-in" fixture:** Not needed for Phase 3 (login IS the flow). Phase 4 will need it — Phase 3 setup leaves the "signed in as candidato" browser state reproducible via Playwright's `storageState` feature.
- **Mock recovery link in E2E:** requires either `supabase.auth.admin.generateLink` (service_role, server-only) OR intercepting the Supabase email and manually pasting the deeplink URL into Playwright. Recommendation: use `supabase.auth.admin.generateLink` in a **Playwright global setup script** that talks to Supabase via service_role (stays server-side; never in browser bundle). If infra not ready, fall back to manual UAT for B10.
- **Test user seeds:** Phase 2 already uses `test+${Date.now()}@beautysmile.com.br` pattern. Phase 3 login tests need stable users:
  - `test-candidato-confirmed@beautysmile.com.br` (confirmed)
  - `test-candidato-unconfirmed@beautysmile.com.br` (for B3)
  - `test-admin@beautysmile.com.br` (administrador for B8 success path)
  - `test-rh@beautysmile.com.br` (rh role — should REJECT in LoginRH)
  - Decision: env-gate like Phase 2 (`E2E_AUTH_TEST_USERS=true`). Document in Playwright README.

### Sampling Rate

- **Per task commit:** `npm run test:run src/features/auth` (unit subset) — ~5 seconds.
- **Per wave merge:** `npm run test:run && npx playwright test login-flow password-recovery --project=chromium` — ~90 seconds.
- **Phase gate:** full `npm run test:run && npm run test:e2e` green before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] Create `src/features/auth/services/__tests__/authService.test.ts` — covers B1, B2, B3, B4, B13, B14
- [ ] Create `src/features/auth/services/__tests__/passwordService.test.ts` — covers B9, B10 (service layer)
- [ ] Create `src/features/auth/utils/__tests__/extractRole.test.ts` — covers B7
- [ ] Create `src/features/auth/utils/__tests__/rememberMeStorage.test.ts` — covers B5, B6, B16 adapter layer
- [ ] Create `src/features/auth/hooks/__tests__/useRecoverySession.test.ts` — covers B12
- [ ] Create `src/features/auth/hooks/__tests__/useRateLimitCooldown.test.ts` — covers B4 (hook layer)
- [ ] Create `src/features/auth/schemas/__tests__/redefinirSenhaSchema.test.ts` — covers B11
- [ ] Create `e2e/login-flow.spec.ts` — covers B1, B2, B3 (env-gated), B4 (env-gated), B8 (env-gated), B15
- [ ] Create `e2e/password-recovery.spec.ts` — covers B9, B10 (mocked session), B12
- [ ] Component tests: reuse React Testing Library pattern from Phase 2 — LoginCandidatoPage, EsqueciSenhaPage, RedefinirSenhaPage component tests for UI state transitions

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **yes** | supabase-js `signInWithPassword` + `resetPasswordForEmail` + `updateUser`; server-side JWT mint + Custom Access Token Hook; all controls SDK-managed |
| V3 Session Management | **yes** | supabase-js `persistSession` + token refresh; custom storage adapter routes to local/session; no client-side session forgery surface |
| V4 Access Control | yes | RoleGuard (from Phase 1) + JWT-derived role claim; LoginRH role-check (D-14) is an access control primitive |
| V5 Input Validation | **yes** | Zod schemas (email, password regex); server-side Supabase Auth rejects invalid payloads |
| V6 Cryptography | yes (transitively) | NEVER hand-rolled: HS256 JWT signing done by Supabase Auth; bcrypt password hashing done by Supabase Auth; TLS by infra. Client-side: `jwt-decode` does base64url only (NOT crypto) |
| V7 Error Handling | yes | AuthError taxonomy; Pitfall 7 redaction (no senha in logs); D-12 carryover |
| V11 Business Logic | yes | D-01 anti-enumeration (generic invalid-creds); D-09 neutral esqueci-senha copy; D-14 role-check (no role forgery) |

### Known Threat Patterns for React SPA + Supabase Auth

| Pattern | STRIDE | Standard Mitigation | Phase 3 Application |
|---------|--------|---------------------|---------------------|
| User enumeration via error messages | Info Disclosure | Generic error copy | D-01 (generic "Email ou senha inválidos"); D-09 (neutral esqueci-senha) |
| Brute force login | DoS | Server-side rate limit + client UX countdown | Supabase `over_email_send_rate_limit` + D-03 UI (useRateLimitCooldown) |
| JWT decode DoS | DoS | Try/catch around decode; never log raw token | `extractRole` wraps `jwtDecode` in try/catch (§Code Examples) |
| Session fixation via storage swap | Spoofing | Clear OTHER store on mode switch | `setRememberMeMode` clears `sb-*` keys from prior store (Q1) |
| Role escalation via client-side setters | Elevation of Privilege | Only trust JWT-derived role; reject LoginRH if role !== administrador | D-14 fix (signOut on role mismatch) |
| Recovery link replay | Spoofing | Single-use tokens (Supabase default) + expiry (1h per AUTH-03) | Maps to `otp_expired` / `bad_jwt` → InvalidLinkState; Pitfall 5 |
| Recovery link in logs/referrer | Info Disclosure | `redirectTo` points to SPA route; deeplink uses hash fragment (not query) — not sent in Referer header | Default supabase-js behavior; no client code change |
| Password in URL/query/log | Info Disclosure | Zod password schema never traverses URL; console.* never logs password | Pitfall 7 (Phase 2 pattern extended to features/auth) |
| Cross-tab logout not propagated | Logic bug | supabase.auth listens to `storage` events; fires SIGNED_OUT | ALREADY IN PLACE via App.tsx onAuthStateChange (Phase 1 FOUND-06) |
| Token refresh during storage swap | Race / Tampering | Adapter read-through (getItem checks both stores) | Q1 `rememberMeStorage.getItem` reads from both (§Code Examples) |
| Toast spoofing (split-instance dropping errors) | Logic bug | vite `resolve.dedupe` + unversioned imports | Phase 2 Plan 02-06 fix carries forward; Phase 3 new files MUST use `'sonner'` unversioned |

### Threat Severity Ranking (for planner `<threat_model>` inclusion)

| # | Threat | Severity | Mitigation location |
|---|--------|----------|---------------------|
| T-03-01 | Role forgery via LoginRH legacy setters (Bug 2) | **HIGH** | D-14 fix — signOut on role !== 'administrador' in LoginRHPage |
| T-03-02 | User enumeration via login/reset error distinction | **HIGH** | D-01 generic "Email ou senha inválidos"; D-09 neutral esqueci-senha |
| T-03-03 | Password in console.* during error paths (Pitfall 7 carryover) | **HIGH** | authService/passwordService Pitfall 7 redaction; B14 test assertion |
| T-03-04 | Session leakage on storage swap (local → session with active session) | MEDIUM | setRememberMeMode clears OTHER store's sb-* keys (Q1) |
| T-03-05 | Recovery link replay (user clicks twice, token already consumed) | MEDIUM | Map otp_expired/bad_jwt → InvalidLinkState (Pitfall 5) |
| T-03-06 | Brute force bypass via client-side rate-limit spoof | MEDIUM | Delete client-side rateLimitService; rely on server-side + D-03 UI (purely cosmetic) |
| T-03-07 | JWT decode DoS (malformed token crashes app) | LOW | try/catch in extractRole (§Code Examples) |
| T-03-08 | Password-mismatch Zod schema bypass via DevTools | LOW | Server-side Supabase rejects weak/invalid passwords; client schema is UX not security |
| T-03-09 | Supabase Dashboard misconfiguration (24h expiry vs 1h, missing redirect URL) | MEDIUM | Wave 0 runbook (Pitfall 4, 8); screenshot before/after |
| T-03-10 | "Lembrar-me" unchecked but session persists anyway (storage swap bug) | MEDIUM | B5 manual UAT test is CRITICAL; adapter unit tests insufficient for real-browser |

---

## Project Constraints (from CLAUDE.md)

| Directive | Compliance plan for Phase 3 |
|-----------|-----------------------------|
| React 18 + Vite + TypeScript strict | All new files in features/auth/ pass `tsc --noEmit` cleanly |
| Supabase anon key ONLY on client; NO service_role | All new code uses `supabase` singleton (anon); no new service_role usage |
| RLS habilitado em 100% das tabelas | N/A for Phase 3 (no new tables; auth.users is Supabase-managed) |
| `supabaseAdmin` NEVER used client-side | Not introduced; kept removed per FOUND-12 |
| pt-BR for domain; en for technical code | UI copy pt-BR cordial (from UI-SPEC); code comments en where appropriate |
| Named exports (NOT default) for components | All 4 page rewrites + new components use `export function` |
| Features organization `src/features/<domain>/{components,hooks,services,schemas,types}` | NEW layout conforms exactly (+ utils/) |
| Sonner unversioned imports; resolve.dedupe preserved | All new files `from 'sonner'` unversioned; regression E2E assertion |
| Pitfall 7 redaction (NEVER log senha/password/access_token) | All new authService/passwordService calls redact; unit test asserts (B14) |
| NUNCA rejeitar candidato automaticamente por score | N/A for Phase 3 (no score surface) |
| DevNavigationMenu dev-only gated by `import.meta.env.DEV` | No change; already in place |
| "Avaliação comportamental/cognitiva" language (NEVER "teste psicológico") | N/A for Phase 3 pages (pure auth; no assessment copy) |
| Husky pre-commit runs tsc --noEmit | Files touched by Phase 3 MUST pass cleanly; `--no-verify` pattern only for pre-existing unrelated carryovers (established Phase 1/2 precedent) |

---

## Sources

### Primary (HIGH confidence)

- **Context7 `/supabase/supabase-js` (v2.58.0 snapshot)** — createClient auth config, signInWithPassword, resetPasswordForEmail, updateUser, onAuthStateChange, AuthApiError, resend
- **Context7 `/supabase/supabase`** — password recovery flow example, PASSWORD_RECOVERY event usage
- **`node_modules/@supabase/auth-js/dist/main/lib/error-codes.d.ts`** (shipped in this project's node_modules, version 2.104.1) — canonical `ErrorCode` enum with 80+ codes including `invalid_credentials`, `email_not_confirmed`, `over_email_send_rate_limit`, `over_request_rate_limit`, `same_password`, `weak_password`, `session_expired`, `otp_expired`, `bad_jwt`
- **`node_modules/@supabase/auth-js/dist/main/lib/errors.d.ts`** — AuthError class signature (only `message`, `status`, `code` fields; no Retry-After)
- **`node_modules/@supabase/auth-js/dist/main/lib/types.d.ts:14`** — `AuthChangeEvent = 'INITIAL_SESSION' | 'PASSWORD_RECOVERY' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'`
- **npm registry** — version verification: `@supabase/supabase-js@2.104.1`, `jwt-decode@4.0.0`, `jose@6.2.2`
- **Phase 1 KNOWN-ISSUES-CARRYOVER-PHASE-3.md** — Bug 1/2/6 root-cause evidence with live JWT snapshots
- **Phase 2 Plan 02-05-SUMMARY.md / 02-06-SUMMARY.md** — proven error taxonomy patterns, Pitfall 7 redaction idiom, Sonner resolve.dedupe regression fix

### Secondary (MEDIUM confidence)

- **Supabase docs — Auth Error Codes** (https://supabase.com/docs/guides/auth/debugging/error-codes) — guidance to use `error.code`/`error.name` over message match
- **Supabase docs — Passwords** (https://supabase.com/docs/guides/auth/passwords) — canonical resetPasswordForEmail + updateUser flow
- **Supabase docs — Rate limits** (https://supabase.com/docs/guides/auth/rate-limits) — token bucket 30 capacity, 60s refill (built-in SMTP)
- **GitHub supabase/auth-js issue #947** — known gap: invalid_credentials sometimes ships with undefined code
- **Auth0 jwt-decode README** (via npm view + search) — TypeScript usage, decode-only behavior, zero dependencies

### Tertiary (LOW confidence — FLAG for validation)

- **Exact email OTP expiry default** — conflicting docs between "1 hour default" (magic link/OTP) and "24 hours" (some password recovery contexts). Wave 0 MUST verify live Dashboard setting.
- **Retry-After header — confirmed NOT on AuthError.** Secondary — the SDK does not surface it. Fallback to message parse + fixed 60s.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all versions verified against node_modules + npm registry
- Architecture: **HIGH** — singleton pattern + storage adapter + JWT decode are standard supabase-js idioms, verified against official docs
- Pitfalls: **HIGH (1-9)** — all verified either against typed source, documented gaps, or Phase 1/2 production evidence
- Error code mapping: **HIGH** — canonical enum from shipped SDK types
- Password recovery flow: **HIGH** — `PASSWORD_RECOVERY` is confirmed in AuthChangeEvent union; flow sequence verified against docs
- Dashboard config (Pitfall 4, 8): **MEDIUM** — needs live verification in Wave 0
- Retry-After parsing heuristic: **MEDIUM** — SDK gap is HIGH confidence; exact fallback duration (60s) is based on docs for built-in SMTP defaults

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days — auth domain is stable; supabase-js minor versions unlikely to break wire contract)

---

*Phase: 03-login-recuperacao-senha*
*Research by gsd-phase-researcher, 2026-04-24*
*Consumes: 03-CONTEXT.md (21 decisions) + 03-UI-SPEC.md (approved 6/6) + REQUIREMENTS.md (AUTH-01..04) + KNOWN-ISSUES-CARRYOVER-PHASE-3.md (Bug 1/2 in-scope)*
*Produces: stack, patterns, Q1-Q10 answers, validation architecture, threat model — for /gsd-plan-phase 3 consumption*
