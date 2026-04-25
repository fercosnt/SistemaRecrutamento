---
phase: 03
phase_name: login-recuperacao-senha
review_type: code-review
depth: standard
files_reviewed: 27
files_reviewed_list:
  - src/features/auth/types/authTypes.ts
  - src/features/auth/types/index.ts
  - src/features/auth/utils/extractRole.ts
  - src/features/auth/utils/mapSupabaseError.ts
  - src/features/auth/utils/rememberMeStorage.ts
  - src/features/auth/utils/index.ts
  - src/features/auth/schemas/passwordSchema.ts
  - src/features/auth/schemas/loginSchema.ts
  - src/features/auth/schemas/esqueciSenhaSchema.ts
  - src/features/auth/schemas/redefinirSenhaSchema.ts
  - src/features/auth/schemas/index.ts
  - src/features/auth/services/authService.ts
  - src/features/auth/services/passwordService.ts
  - src/features/auth/services/index.ts
  - src/features/auth/hooks/useAuthFlowVariant.ts
  - src/features/auth/hooks/useRateLimitCooldown.ts
  - src/features/auth/hooks/useRecoverySession.ts
  - src/features/auth/hooks/index.ts
  - src/components/pages/LoginCandidatoPage.tsx
  - src/components/pages/LoginRHPage.tsx
  - src/components/pages/EsqueciSenhaPage.tsx
  - src/components/pages/RedefinirSenhaPage.tsx
  - src/store/authStore.ts
  - src/lib/supabase/client.ts
  - src/features/cadastro/services/authService.ts
  - src/features/cadastro/services/cadastroService.ts
  - src/features/auth/utils/__tests__/pitfall7.grep.test.ts
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
generated: 2026-04-24T00:00:00Z
---

# Phase 3: Code Review Report

**Reviewed:** 2026-04-24
**Depth:** standard
**Files Reviewed:** 27 (production sources + key tests)
**Status:** issues_found (no Critical findings — 5 Warnings + 6 Info)

## Summary

Phase 3 (login + recuperação de senha) is in healthy shape. The four critical correctness items the focus block flagged — Pitfall 7 redaction, D-19 storage-adapter ordering, D-13 JWT decode, D-14 LoginRH role gate, D-09 anti-enumeration, and ISSUE-007 retry clamp — all check out under careful inspection: the pitfall7.grep.test.ts guard catches the obvious leaks; `setRememberMeMode` wipes the obsolete store BEFORE flipping `currentMode`; `extractRole` decodes the JWT (no `session.user.app_metadata` fallback survives); `LoginRHPage` uses bounded 5×20ms polling on `useAuthStore.getState().role` and force-`signOut()` on non-admin before navigating; `requestPasswordReset` only surfaces `RATE_LIMITED` and swallows everything else (including network errors); and `extractRetryAfterSeconds` clamps to the [1, 3600] inclusive band as specified by ISSUE-007. No Critical findings. Five Warnings deserve attention before Phase 4: a leftover legacy setter (`setAdminUser`) in the unified store still lets a caller forge `role: 'administrador'` from a `usuarios_rh` row without a JWT check (D-14 attack surface, even though `LoginRHPage` no longer uses it); the Bug 1 fallback path in `authStore.initialize → fetchProfile` infers role purely from a DB row when `extractRole` returns null, which weakens the JWT-as-source-of-truth contract; the recovery hook’s `getSession()` fallback lifts ANY active session into `valid` (not just `PASSWORD_RECOVERY`), so a previously logged-in user landing on `/auth/redefinir-senha` could change another account’s password under their own session; the legacy `src/lib/supabase/client.ts:signOut` helper still does a raw `console.error('Error signing out:', error)` that, depending on the SDK version, can serialize a session payload (Pitfall 7 grey zone — the regex test does not match `error` as a token); and the Phase-2 `cadastro/services/authService.ts` still emits `console.error('Supabase Auth error:', error)` which is a known pre-existing leak and should at least be audit-flagged. Info items cover duplication, magic numbers, type-narrowing leftovers, and a couple of CTA UX gaps. Six Info items reflect refactor opportunities (the four pages share ~90% of error-toast routing).

## Critical findings

_(None — the four high-stakes items in the focus block all verified clean.)_

## Warning findings

### WR-01: Legacy `setAdminUser` setter still forges `role: 'administrador'` without JWT validation (D-14 attack surface remnant)

**Severity:** Warning
**File:** `src/store/authStore.ts:373-399`
**Issue:**
The unified store retains the legacy `setAdminUser(adminUser)` setter for back-compat (annotated `@deprecated`). Its body explicitly writes `role: mappedRole` to the store from a `usuarios_rh` row, where `mappedRole` is derived from `rhRow.role === 'administrador' ? 'administrador' : 'rh'`. There is **no JWT check**. This is the exact code path Bug 2/3 (AUTH-LOGIN-01/02) exploited — a caller passing any object with `nome_completo` and `role: 'administrador'` flips `isAdmin: true` and `permissions: administrador` in-store with zero verification.

Phase 3 fixed `LoginRHPage` to NOT call this setter (verified — `setAdminUser` / `setAdminSession` / `setUser` are absent from the rewritten file). However, the setter is still exported on the public surface of `useAuthStore` and is reachable via `useAdminAuthStore` (the compat shim re-exports the unified store). Any current OR future RH page (or a test that does `useAuthStore.getState().setAdminUser({...})`) re-introduces the bypass with one line. The `@deprecated` JSDoc is non-binding.

**Reproduction sketch:**
```ts
// From any client-side code that imports useAuthStore (legitimate or attacker-controlled):
useAuthStore.getState().setAdminUser({
  nome_completo: 'X',
  role: 'administrador',
  // …minimal fields satisfying UsuarioRHRow type
})
// → store.role === 'administrador', store.isAdmin === true,
//   store.permissions === ALL TRUE — without ever calling supabase.auth.*
```
This won't survive a real network round-trip (the actual JWT in `session.access_token` doesn't have the role), but `RoleGuard` reads `useAuthStore.role` directly, so the in-tab UI exposes the admin surface until `onAuthStateChange` re-fires `setSession` and `extractRole` corrects it. That's a window for a UI flash + any synchronous data fetch the admin page kicks off on mount.

**Fix:**
Either (a) make `setAdminUser` a no-op that logs a deprecation warning and instead delegates to `setSession(get().session)` so role re-derives from the JWT, or (b) remove the role/permissions/isAdmin writes inside `setAdminUser` and only update `profile`/`adminUser` (keep `role` derivation exclusive to `setSession` + `initialize`). Option (b) preserves the current legacy callers (none in Phase 3 scope) without giving them a privilege-elevation lever:

```ts
setAdminUser: (adminUser) => {
  if (adminUser && typeof adminUser === 'object' && 'nome_completo' in adminUser) {
    const rhRow = adminUser as UsuarioRHRow
    set({
      profile: rhRow as unknown as Record<string, unknown>,
      adminUser: rhRow,
      candidato: null,
      // Role / permissions / isAdmin REMOVED — derive from JWT only.
    })
  } else {
    set({ user: adminUser as User | null })
  }
},
```
Track this in M2 cleanup as documented in the file's M2-removal comment.

---

### WR-02: `fetchProfile` fallback infers role from DB row when JWT has no `role` claim — weakens JWT-as-authority contract

**Severity:** Warning
**File:** `src/store/authStore.ts:167-202` (and `initialize` at L296-340 calling it)
**Issue:**
When `extractRole(session)` returns `null` (JWT has no `app_metadata.role`), `fetchProfile` queries `usuarios_rh` first, and if a row exists with `role === 'administrador'`, returns `resolvedRole: 'administrador'` — **trusting the DB row as the source of role authority**. The Phase 1 architecture explicitly designates the JWT as the role-of-record (the Custom Access Token Hook injects it server-side); the DB is supposed to be a fallback for legacy JWTs only.

In production this is mostly safe because the hook is enabled and JWTs always carry `role`. But two failure modes warrant attention:

1. **Hook misconfiguration / regression:** if a future migration breaks the access-token hook, every login will fall through to `fetchProfile`'s DB lookup, which silently keeps the app working (good for UX) but lets `usuarios_rh.role` (mutable in DB) determine the in-app role. RLS protects against tampering, but a compromised RH user with `update` on their own row could theoretically self-promote to `administrador` and the next refresh would honor it.
2. **Masked Bug 1 regression:** if `extractRole` is ever broken (e.g., a future `jwt-decode` upgrade changes the payload-key shape, or a different JWT flavor lands), the fallback would mask the regression — `role` would still be populated, but from the DB, undermining the D-13 fix's explicit goal ("JWT is the authority").

**Fix:**
Add a structured warning (no PII, just a code) when the DB-fallback path resolves a role, so monitoring can detect when the JWT path is failing:

```ts
// inside fetchProfile, BEFORE returning resolvedRole from rhRow:
if (!role && rhRow) {
  console.warn('[AUTH] role resolved via DB fallback (JWT app_metadata.role missing)', {
    resolvedRole,
    // NO email, NO user_id — just the fact-of.
  })
}
```
Stronger: gate the admin promotion behind a JWT claim — if `role !== 'administrador'` in the DB OR the JWT didn't carry the claim, downgrade to `rh` regardless. (Phase 4 hardening.)

---

### WR-03: `useRecoverySession.getSession()` fallback accepts ANY active session, not just `PASSWORD_RECOVERY`

**Severity:** Warning
**File:** `src/features/auth/hooks/useRecoverySession.ts:70-79`
**Issue:**
The hook converges on `valid` via three paths: (1) the `PASSWORD_RECOVERY` event, (2) the `getSession()` fallback, (3) 2s timeout → `invalid`. Path (2) reads:
```ts
supabase.auth.getSession().then(({ data }) => {
  if (cancelled) return
  if (data.session?.user?.email) {
    setState((prev) => prev.status === 'validating' ? { status: 'valid', email: ... } : prev)
  }
})
```
This converges to `valid` for **any** active session — not specifically a recovery session. Concrete scenario: a candidato is already logged in (regular session in localStorage), navigates to `/auth/redefinir-senha` directly (or via a stale email link in a different tab where `PASSWORD_RECOVERY` already fired and was consumed), the hook reads the existing session, sets status='valid' with the logged-in user's email, and the form submits `setNewPassword(novaSenha)` against the active session — silently changing the logged-in user's password. The user thinks they're using a "recovery" link, but they're actually rotating their own current password. This isn't an external attack (auth still required), but it bypasses the link-token validation that recovery flows are supposed to enforce, and the UI gives no signal that the link wasn't actually used.

The Supabase docs explicitly recommend distinguishing recovery sessions by listening to the `PASSWORD_RECOVERY` event ONLY; `getSession()` cannot tell a recovery session apart from a normal one.

**Fix:**
Either (a) drop the `getSession()` fallback entirely and rely only on the event + 2s timeout (the SDK fires the event reliably when `detectSessionInUrl: true` parses the hash; the fallback was added for a race that may not exist in practice), or (b) gate the fallback on the URL — only treat `getSession()` as recovery-confirming when `window.location.hash` contains `type=recovery`:

```ts
supabase.auth.getSession().then(({ data }) => {
  if (cancelled) return
  const isRecoveryUrl = window.location.hash.includes('type=recovery')
                     || window.location.search.includes('type=recovery')
  if (isRecoveryUrl && data.session?.user?.email) {
    setState((prev) =>
      prev.status === 'validating'
        ? { status: 'valid', email: data.session!.user.email! }
        : prev
    )
  }
})
```
Option (b) preserves the race-mitigation while requiring proof-of-recovery-arrival.

---

### WR-04: `src/lib/supabase/client.ts:signOut` helper logs the raw `error` object (Pitfall 7 grey zone — pre-existing, but reachable from Phase 3 paths)

**Severity:** Warning
**File:** `src/lib/supabase/client.ts:91-97` (and `getCurrentUser` at L77-86)
**Issue:**
Two helpers in the supabase client module still do raw error logging:
```ts
// L80-83 (getCurrentUser):
if (error) {
  console.error('Error fetching current user:', error)
  return null
}
// L93-96 (signOut):
if (error) {
  console.error('Error signing out:', error)
  throw error
}
```
The Phase 3 grep test (`pitfall7.grep.test.ts`) checks for `console.* … (senha|password|access_token|refresh_token)` within ~80 chars of the call — these lines pass that grep because the literal token name doesn't appear inline (the leak would be inside the serialized `error` object at runtime, which the regex can't see). Whether the SDK ever puts `access_token` / `refresh_token` inside the thrown error is version-dependent — supabase-js error objects historically have included the request body in some surfaces, especially when the underlying fetch error wraps the request payload.

This is **not new code** introduced by Phase 3; it's pre-existing in client.ts. But it's now reachable from `signOut` paths (`LoginRHPage` calls `supabase.auth.signOut()` directly on role mismatch — though that goes through `auth.signOut`, not the helper). The grep test guards Phase 3 surfaces, so the cleanup is in scope for Phase 3 even though the issue is older.

**Fix:**
Apply the same redaction shape used everywhere else in Phase 3:
```ts
// signOut helper:
if (error) {
  console.error('Error signing out:', { code: error.code ?? 'unknown', status: error.status })
  throw error
}
// getCurrentUser helper:
if (error) {
  console.error('Error fetching current user:', { code: error.code ?? 'unknown', status: error.status })
  return null
}
```
Also extend the regex in `pitfall7.grep.test.ts` to flag `console\.error\(.*['"][^'"]*['"]\s*,\s*error\b` (raw-error-object passthrough) so this pattern fails the build going forward.

---

### WR-05: `src/features/cadastro/services/authService.ts` and `cadastroService.ts` log the raw `error` object — pre-existing Pitfall 7 leak still in compat layer

**Severity:** Warning
**File:** `src/features/cadastro/services/authService.ts:265, 295, 322-323, 349, 367, 378-379, 405`
**Issue:**
The Phase-2 cadastro service files (compat layer for D-17 Option A) still log raw `error` objects in multiple places, e.g.:
- `authService.ts:265` — `console.error('Supabase Auth error:', error)` inside `signUp`
- `authService.ts:295` — `console.error('Network/Unknown error during sign up:', err)`
- `authService.ts:322-323` — `console.error('Supabase Auth error:', error)` inside `signIn`
- `authService.ts:349` — `console.error('Network/Unknown error during sign in:', err)`
- `authService.ts:367` — `console.error('Supabase Auth error:', error)` inside `signOut`
- `authService.ts:405` — `console.error('Error getting current user:', err)`
- `cadastroService.ts:295`, `313` — `console.error('[CADASTRO] Erro ao invocar Edge Function:', invokeError.message …)` (this one is OK, it extracts `message`)

These files are NOT inside `PHASE_3_AUTH_PATHS` in `pitfall7.grep.test.ts`, so the grep does not scan them — but the Phase 3 spec moved `tryAutoLogin` here as a re-export from `@/features/auth/services` (D-17 Option A), so users now traverse this surface during cadastro. The risk profile is the same as WR-04: raw `error` may serialize tokens depending on the SDK version. Not directly reintroduced by Phase 3, but Phase 3 pinned the file to the load path via the compat shim.

**Fix:**
Apply the redacted-shape pattern that Phase 3's own services use. Smallest patch:
```ts
// authService.ts:265 (and the parallel sites at 322, 367):
console.error('Supabase Auth error:', { code: error.code ?? 'unknown', status: error.status })

// authService.ts:295/349/378/405:
console.error('Network/Unknown error during sign up:', err instanceof Error ? err.message : String(err))
```
And add the cadastro service paths to `PHASE_3_AUTH_PATHS` (or a new `LEGACY_AUTH_PATHS` array) in `pitfall7.grep.test.ts` so the grep test catches future regressions across the whole auth surface, not just `src/features/auth/`.

---

## Info findings

### IN-01: ~90% duplication of error-toast routing across LoginCandidatoPage and LoginRHPage

**Severity:** Info
**File:** `src/components/pages/LoginCandidatoPage.tsx:96-149` + `src/components/pages/LoginRHPage.tsx:130-183`
**Issue:**
The `catch (err) { if (isAuthError(err)) { switch (err.code) { … } } }` blocks in both pages are nearly identical (only the `setCooldown(60)` fallback ordering differs trivially — Login candidato has the `setCooldown(60)` in the `else` branch, LoginRH does too — so they're literally identical). The same is true for `handleResend`. This is a known Phase 4 refactor opportunity (would naturally become a `useLoginForm` hook as suggested in 03-RESEARCH.md §Q3 module layout, which planned but did not extract `useLoginForm.ts`).
**Fix:**
Extract `handleAuthErrorToast(err, { setCooldown, retryHandler, focusRef })` into `src/features/auth/hooks/useAuthErrorToast.ts` (or just a util). Saves ~120 lines and removes one drift vector. Phase 4.

---

### IN-02: `setCooldown(60)` on a fresh `RATE_LIMITED` whose `retryAfterSeconds` is undefined silently undershoots an extracted clamp

**Severity:** Info
**File:** `src/components/pages/LoginCandidatoPage.tsx:117-118` (mirror in LoginRHPage:151-152, EsqueciSenhaPage:97-98)
**Issue:**
```ts
if (err.retryAfterSeconds) setCooldown(err.retryAfterSeconds)
else setCooldown(60)
```
Per ISSUE-007 (locked decision in Phase 3), the *server-side* wait is the source of truth and the client must never be optimistic relative to it. The fallback to `60` is reasonable when the SDK didn't expose retry info, but `err.retryAfterSeconds` is documented to always be set by `mapSupabaseError` for any code mapped to `RATE_LIMITED` (it goes through `extractRetryAfterSeconds` which returns 60 fallback). So the page-level `else setCooldown(60)` is functionally equivalent and not a bug, but it's subtle that the page-level fallback would never trigger in practice — making it dead-code-ish defense.
**Fix:**
Either remove the `else` branch (and let the `if` always fire because `extractRetryAfterSeconds` always returns ≥1), or make it explicit that it's belt-and-braces:
```ts
// extractRetryAfterSeconds always returns [1, 3600]; this fallback is belt-and-braces.
setCooldown(err.retryAfterSeconds ?? 60)
```
Cosmetic.

---

### IN-03: Magic numbers in LoginRHPage role gate (`5`, `20ms`, `100ms`) not derived from a documented constant

**Severity:** Info
**File:** `src/components/pages/LoginRHPage.tsx:115-117`
**Issue:**
```ts
for (let i = 0; i < 5 && !useAuthStore.getState().role; i++) {
  await new Promise((r) => setTimeout(r, 20))
}
```
The 5×20ms = 100ms cap is the canonical D-14 budget, but the integers are inlined. Future contributors editing this loop without re-reading the comment could accidentally widen it to e.g. 10×100ms (1s ≫ React 18 microtask resolution; risk: navigation finishes before the gate fires). The inline comment IS thorough, but a named constant would make the intent self-documenting.
**Fix:**
```ts
const ROLE_GATE_MAX_RETRIES = 5
const ROLE_GATE_RETRY_DELAY_MS = 20  // Total cap: 100ms
```
And reference these in the loop. Cosmetic, low priority.

---

### IN-04: `extractRole` whitelist comparison repeats role literals; minor drift risk

**Severity:** Info
**File:** `src/features/auth/utils/extractRole.ts:62`
**Issue:**
```ts
if (raw === 'candidato' || raw === 'rh' || raw === 'administrador') {
  return raw
}
```
The list of valid roles is also encoded in the `Role` type (line 38) and in `authStore.fetchProfile` (multiple places) and in `useAuthStore.hasRole`. Any change to the role enum (Phase 5 hardening might add `super_admin` for instance) requires updating all four sites; the type checker only catches three of them — `extractRole`'s string comparison is structural and would silently fall through to `null` for a new valid role.
**Fix:**
Centralize role membership:
```ts
const VALID_ROLES = ['candidato', 'rh', 'administrador'] as const satisfies readonly Role[]
function isRole(x: unknown): x is Role {
  return typeof x === 'string' && (VALID_ROLES as readonly string[]).includes(x)
}
// then: if (isRole(raw)) return raw
```
Trivial improvement.

---

### IN-05: `useAuthFlowVariant` does not memoize the returned object — re-creates `{variant, isRH}` on every render

**Severity:** Info
**File:** `src/features/auth/hooks/useAuthFlowVariant.ts:26-34`
**Issue:**
The hook returns `{ variant, isRH }` as a fresh object on every call. Consumers (`EsqueciSenhaPage`) destructure into a `const`, so it doesn't trigger re-renders, but if anyone passes the object into a `useEffect` dep array or React.memo prop, it'd cause needless work. Not a current bug, just a sharp edge.
**Fix:**
```ts
return useMemo(() => ({ variant, isRH: variant === 'rh' }), [variant])
```
Or simpler — return primitives:
```ts
return [variant, variant === 'rh'] as const
```
Not blocking.

---

### IN-06: EsqueciSenhaPage success-card "Verifique seu email" missing autocomplete/heading link to "open email" → minor a11y/UX gap

**Severity:** Info
**File:** `src/components/pages/EsqueciSenhaPage.tsx:147-153`
**Issue:**
The success state shows a heading "Verifique seu email" and copy "Verifique sua caixa de entrada (e spam)" but renders no actionable link or CTA to *open* a webmail client. Most modern reset flows provide an `mailto:` deep-link or — better — a hint based on the email TLD ("Abrir Gmail" if `@gmail.com`). Not a bug, and explicitly OUT of UI-SPEC L443-503 by my reading, so just an idea.
**Fix:**
Optional enhancement — add a secondary button that uses `mailto:` (universal) or a TLD-aware deep link. Phase 5 polish.

---

## Strengths

This is a high-quality phase. Concrete observations:

1. **Bug 1 (D-13) is fixed cleanly with a defensive type guard.** `extractRole` short-circuits on `null`/empty token, decodes via `jwt-decode@4`, narrows `payload.app_metadata?.role` from `unknown`, validates against a literal whitelist, and returns `null` from a deliberately-empty catch block. The test suite (T1.1-T1.8) covers null session, empty token, all three valid roles, unknown role rejection, missing `app_metadata`, malformed JWT, and the Pitfall 7 zero-console-call invariant. The "no fallback to `session.user.app_metadata`" rule is honored — the file does not import `User`-shaped fields at all.

2. **Bug 2/3 (D-14) is fixed in LoginRHPage with all the right ingredients in the right order.** No legacy setters survive (`setAdminUser`/`setAdminSession`/`setUser` are absent — verified via Grep). The role gate uses bounded 5×20ms polling on `useAuthStore.getState().role` (NOT `setTimeout(0)`, which the comment explicitly explains is rejected per RESEARCH §Pitfall 1). On `role !== 'administrador'`, the page calls `await supabase.auth.signOut()` BEFORE any toast/return, eliminating the privilege-elevation window. Comment density on this block is exemplary — a future contributor reading it cannot misunderstand the intent.

3. **D-09 anti-enumeration is honored asymmetrically and correctly.** `requestPasswordReset` only surfaces `over_email_send_rate_limit`/`over_request_rate_limit` codes; everything else (`user_not_found`, network throws, anything mapped to `UNKNOWN_ERROR`) is swallowed at the service layer. The service-layer comment block explicitly documents the swallow-vs-surface asymmetry vs `setNewPassword` (where the user is already auth'd, so throwing on errors is correct). Test T2.2 locks the swallow behavior; T2.5b locks the network-throw swallow. EsqueciSenhaPage further hardens the UX with a defensive catch-all that still routes to the neutral success card if some future error escapes the swallow. Belt-and-braces.

4. **ISSUE-007 clamp is implemented as the spec requires (deviating from RESEARCH on purpose).** `extractRetryAfterSeconds` clamps `secs > 3600` to `3600` (NOT silent-fallback to 60). The deviation is documented in the JSDoc with the rationale ("UI cooldown NUNCA pode ficar abaixo do server-side wait"). T2.14-T2.17 lock the boundary: 99999→3600, 7200→3600, 3601→3600, 3600→3600. The page-level `useRateLimitCooldown` hook then re-clamps to `[0, 3600]` defensively (`Math.max(0, Math.min(3600, ...))`).

5. **Pitfall 7 redaction discipline is enforced at multiple layers.**
   - Service-level: `signIn` logs `{ email, rememberMe, hasPassword }`; `setNewPassword` logs `{ hasPassword }`; `requestPasswordReset` logs only `{ isRH }` (not even the email). Error-paths log `{ code, status }`, never the raw `error`.
   - Test-level: every test installs console spies on all 5 methods AND exercises every branch in a single test that asserts `expectNoConsoleCalls()` or `serializeAll().not.toContain(secret)`.
   - Static-grep level: `pitfall7.grep.test.ts` reads files directly via node:fs (RESEARCH §Pitfall 7 prohibits child_process), recurses through `src/features/auth/`, scans for `console.* … (senha|password|access_token|refresh_token)` within 80 chars, and includes a sanity-check assertion that the file count stays ≥10 (so dropping a path fails loud). The maintenance contract for adding Phase 3 surfaces is documented inline.

6. **Storage-adapter (D-19) ordering is correct and tested.** `setRememberMeMode('session')` wipes sb-* keys from the `currentMode` store BEFORE flipping the flag (T-03-04). The wipe is symmetric (`session → local` also wipes session). `removeItem` defensively wipes BOTH stores on SIGNED_OUT. `getItem` does read-through (backing first, OTHER fallback). The adapter is module-scoped without `__resetForTests`, and the tests use `vi.resetModules() + dynamic import` to get a fresh module per test — handles the singleton trap cleanly.

7. **TDD discipline is visible.** Each Wave 0 test file landed as `it.todo` per VALIDATION.md and was promoted to real assertions in subsequent Waves. Tests cite the behavior IDs (B1-B16) in their comment headers. Test names cite test IDs (T1.1-T2.18, etc.) that map to the validation matrix. Console spy harness uses the `any[]` escape hatch documented in STATE.md 02-04 — consistent with project convention.

8. **D-17 Option A (rename OLD `AuthError` → `SignUpError`) executed without breaking Phase 2.** The old `AuthError` class in `cadastro/services/authService.ts` was renamed to `SignUpError`. The new canonical `AuthError` (D-17 taxonomy) lives at `@/features/auth/types/authTypes.ts`. The compat shim at the bottom of `cadastro/services/authService.ts` re-exports `tryAutoLogin` from the new location. Phase 3 consumers import from `@/features/auth/types`; Phase 2 consumers continue importing `SignUpError` from cadastro. Two type universes coexist without aliasing or namespace pollution.

9. **`useRecoverySession` cleanup is rigorous.** The `cancelled` flag prevents late state updates after unmount; `clearTimeout(timeoutId)` cancels the 2s fallback; `subscription.unsubscribe()` releases the listener. T3.11 + T3.12 lock both, and T3.12 specifically validates that a late event after unmount is a no-op (the regression-canary for the React strict-mode double-mount footgun).

## Recommendations for Phase 4

1. **Address WR-01 by removing role-elevation from `setAdminUser`.** Track in M2 cleanup ticket. Even though Phase 3 doesn't use it, leaving the lever attached to a public store is an unnecessary residual risk and contradicts the spirit of the D-14 fix.

2. **Address WR-03 (`useRecoverySession` over-broad fallback).** The conservative fix is to drop the `getSession()` path entirely; the safer-but-still-permissive fix is to gate it on `window.location.hash.includes('type=recovery')`. If Phase 4 PKCE work touches the same file, fix it then.

3. **Promote WR-02's structured warning.** Add a `console.warn('[AUTH] role resolved via DB fallback', { resolvedRole })` in `fetchProfile`. Cheap, gives observability into "is the JWT hook ever failing in prod?"

4. **Cleanup WR-04/WR-05 raw-error logs in `lib/supabase/client.ts` and `cadastro/services/`.** Either as a Phase 4 chore or rolled into Phase 5 hardening. Extend `pitfall7.grep.test.ts`'s `PHASE_3_AUTH_PATHS` (or rename to `AUTH_PATHS`) to cover them.

5. **Extract `useLoginForm` / `useAuthErrorToast` (IN-01).** With Phase 3 done, the duplication is now a fixed cost; extracting saves ~120 lines and gives Phase 4 a single place to add per-error UX (e.g., reCAPTCHA challenge on repeated `RATE_LIMITED`).

6. **PKCE same-browser limitation already deferred to Phase 4 (per 03-07-SUMMARY.md).** Once Phase 4 lands the OTP flow, revisit `useRecoverySession` and consider tightening the convergence rules per WR-03.

7. **a11y backlog (deferred to Phase 5).** Out of scope per focus block. The pages already have `role="alert"` + `aria-live="assertive"` on field errors and `aria-live="polite"` on the cooldown countdown — the foundation is solid.

8. **Type-narrowing centralization (IN-04).** Consider a `src/features/auth/utils/roleGuards.ts` with `isRole(x): x is Role` and a `VALID_ROLES` array satisfies-typed against `Role`. Smallest possible refactor, removes drift risk for future role additions.

---

_Reviewed: 2026-04-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
