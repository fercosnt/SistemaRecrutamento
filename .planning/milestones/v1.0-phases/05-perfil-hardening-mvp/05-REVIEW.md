---
phase: 05-perfil-hardening-mvp
status: issues_found
depth: standard
critical: 2
warning: 4
info: 3
reviewed: 2026-06-06
files_reviewed: 28
files_reviewed_list:
  - src/App.tsx
  - src/components/BeautySmileLogo.tsx
  - src/components/layouts/CandidatoNavbar.tsx
  - src/components/pages/CadastroPage.tsx
  - src/components/pages/EsqueciSenhaPage.tsx
  - src/components/pages/FormularioCandidaturaPage.tsx
  - src/components/pages/LoginCandidatoPage.tsx
  - src/components/pages/MeuPerfilCandidatoPage.tsx
  - src/components/pages/RedefinirSenhaPage.tsx
  - src/components/pages/VagaDetalhePage.tsx
  - src/components/pages/VagasPublicasPage.tsx
  - src/components/ui/glass.tsx
  - src/components/ui/select.tsx
  - src/features/auth/hooks/useRecoverySession.ts
  - src/features/auth/hooks/index.ts
  - src/features/auth/schemas/redefinirSenhaSchema.ts
  - src/features/auth/services/passwordService.ts
  - src/features/cadastro/components/CadastroMultiStepForm.tsx
  - src/features/cadastro/components/ErrorBoundary.tsx
  - src/features/cadastro/components/steps/DadosPessoaisStep.tsx
  - src/features/cadastro/components/steps/DadosProfissionaisStep.tsx
  - src/features/cadastro/components/steps/EnderecoStep.tsx
  - src/features/cadastro/services/cadastroService.ts
  - src/store/authStore.ts
  - src/styles/globals.css
  - supabase/migrations/20260606000001_vaga_status_sync.sql
  - supabase/migrations/20260606000002_bloco_valido_reconcile.sql
  - .github/workflows/ci.yml
  - lighthouserc.cjs
---

# Phase 05: Code Review Report

**Reviewed:** 2026-06-06
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Orchestrator Verification (2026-06-06)

Findings verified against the live code during execute-phase:

- **CR-01** — CONFIRMED real (`input-background` absent from `tailwind.config.js`), but NOT auto-fixed: candidate inputs override with `bg-white/xx`, and adding the white token would flip bare inputs to solid white, changing the dark-glass look the user approved at the 05-02/05-03 smoke gates. **Design decision deferred to user.**
- **CR-02** — FALSE POSITIVE. The `if (cancelled) return` at `App.tsx:176` runs before `onAuthStateChange` registration (`:184`); under StrictMode the first mount's async returns at the guard before any subscription is created, so no listener leaks. No fix needed.
- **WR-02, WR-03** — FIXED (commit below): redacted cadastro PII log + suppressed `invokeError.message` (password-leak risk). Pitfall-7 compliance.
- **WR-01** — DEFERRED to 05-06 resume: `MeuPerfilCandidatoPage` change-password handler is mid-rewrite in the parked 05-06 plan; the reauthenticate gap + min-len 6→8 will be addressed there (logged in `05-06-CHECKPOINT.md`).
- **WR-04, IN-01, IN-02, IN-03** — Backlog (latent/pre-existing/minor). IN-03 (CI `npx lhci`) is a safe quick win for a future pass.

## Summary

Phase 5 (perfil-hardening-mvp) delivers CI infrastructure, design-system token repair, OTP password-recovery migration, shared navbar extraction, ErrorBoundary hoist, DB data-hygiene migrations, and accessibility fixes. The security posture is generally solid: no `service_role` key in client code, Pitfall 7 (credential redaction) is observed in the new OTP service, and the auth store correctly delegates privileged operations to Edge Functions. The OTP recovery flow (`verifyRecoveryOtp` → `setNewPassword`) is structurally correct.

Two blockers are found: (1) a missing Tailwind color mapping for `--input-background` introduced in Plan 05-02 causes every `bg-input-background` class (input fields, select triggers, checkboxes, OTP slots) to silently produce no background color on light-background admin/form views — a visible white-screen regression on non-glass surfaces; (2) the auth-listener setup in `App.tsx` has a race condition where `initialize()` resolves after a fast unmount during the async IIFE, allowing `onAuthStateChange` to be registered after the cleanup return has already run, leaving a permanently live, never-unsubscribed listener.

Four warnings cover: (a) the "Alterar Senha" widget in `MeuPerfilCandidatoPage` collects a "Senha Atual" field but does not use it before calling `updateUser` — the current-password field is purely decorative, providing false UX assurance; (b) `cadastroService` logs the user's full email and nome in a `console.log` statement, violating the module's own Pitfall 7 contract; (c) `invokeError.message` is logged verbatim in `cadastroService`, and `invokeError` in some SDKs can echo the serialized request body (containing the user's password); (d) `sidebar` tokens in `globals.css` reference `var(--neutral-*)` and `var(--brand-*)` raw hex variables, but the tailwind config wraps sidebar tokens in `hsl()` — if `sidebar` colors are ever used as Tailwind classes, they will be invalid.

---

## Critical Issues

### CR-01: `bg-input-background` Tailwind class silently has no effect — inputs/selects/checkboxes lose background

**File:** `src/styles/globals.css:71` / `src/components/ui/select.tsx:55`

**Issue:** Plan 05-02 added `--input-background: 0 0% 100%` to `globals.css` and wired `bg-input-background` into the Select trigger, Input, Checkbox, InputOTP slot, and Textarea primitives. However `input-background` is **not registered** as a color entry in `tailwind.config.js` (only `input: "hsl(var(--input))"` exists — the `input-background` key is absent). Tailwind therefore has no knowledge of `bg-input-background` and emits nothing for the class. On any non-glass white-background surface — the admin panel, light-mode forms, and the OTP slot cells in `RedefinirSenhaPage` when the `bg-white/20` override is not present — these elements render with a transparent background instead of the intended `#ffffff`, producing invisible text on transparent fields.

This was introduced in commit `d7aed92` (Plan 05-02), which added the CSS variable to `globals.css` but omitted the corresponding Tailwind color mapping. It is not pre-existing.

**Fix:** Add the `input-background` color entry to `tailwind.config.js` colors block:

```js
// tailwind.config.js — inside theme.extend.colors:
'input-background': 'hsl(var(--input-background))',
```

---

### CR-02: Race condition in `App.tsx` auth-listener — subscription can be registered after cleanup runs

**File:** `src/App.tsx:168-216`

**Issue:** `RootLayout` runs `initialize()` inside an async IIFE before registering the `onAuthStateChange` subscription. The cleanup function (returned synchronously from `useEffect`) sets `cancelled = true` and unsubscribes `subscriptionRef.current`. If the component unmounts during the `await initialize()` call (e.g., during React strict-mode double-invocation or a fast navigation), the cleanup runs first (`cancelled = true`, `subscriptionRef.current` is still `null`), and then when `initialize()` resolves, execution continues past the `if (cancelled) return` guard **only if** the guard is checked before `onAuthStateChange` is called. Looking at the code: `if (cancelled) return` at line 176 does guard the listener registration. However in **Strict Mode** React mounts, unmounts, and remounts effects. On the second mount, `initialize()` runs a second time and a second subscription is registered in `subscriptionRef.current`, replacing the first — but the first subscription is never unsubscribed. This leaves a zombie `onAuthStateChange` listener that keeps calling `hydrateFromSession` on every auth event for the lifetime of the page, causing duplicate hydrations and potential state races.

The `cancelled` flag guards the first-mount subscription correctly but does not guard against Strict Mode's remount creating a leaked first-subscription.

**Fix:** Unsubscribe any previous subscription before registering a new one, or move the subscription registration outside the async IIFE using an effect-scoped ref pattern:

```tsx
// In the async IIFE, before registering a new subscription:
if (subscriptionRef.current) {
  subscriptionRef.current.unsubscribe()
  subscriptionRef.current = null
}
if (cancelled) return
const { data: { subscription } } = supabase.auth.onAuthStateChange(...)
subscriptionRef.current = subscription
```

---

## Warnings

### WR-01: `MeuPerfilCandidatoPage` collects "Senha Atual" but never verifies it before `updateUser`

**File:** `src/components/pages/MeuPerfilCandidatoPage.tsx:111-160`

**Issue:** The "Alterar Senha" form collects three fields: `senhas.atual`, `senhas.nova`, and `senhas.confirmar`. The handler `handleAlterarSenha` validates only that `nova === confirmar` and `nova.length >= 6`, then calls `supabase.auth.updateUser({ password: senhas.nova })` directly. The `senhas.atual` field value is **never used** in the handler — it is not passed to `reauthenticate()` or to `signInWithPassword` for re-verification. This means any authenticated session can change the account password without knowing the current password, which undermines the standard re-authentication gate. The Supabase SDK's `updateUser` for password change does not require re-authentication by default.

This also violates the minimum-length rule inconsistently with the rest of the app: the `passwordSchema` (Phase 3) requires ≥ 8 chars with uppercase + lowercase + digit, but `handleAlterarSenha` only checks `>= 6` chars (line 122).

**Fix:** Either (a) remove the "Senha Atual" field entirely and set honest UX expectations ("Your session authorizes this change"), or (b) call `supabase.auth.signInWithPassword({ email, password: senhas.atual })` before `updateUser` to enforce re-verification. Also align the min-length check with `passwordSchema` (8 chars, not 6).

---

### WR-02: `cadastroService` logs user email and full name — violates its own Pitfall 7 contract

**File:** `src/features/cadastro/services/cadastroService.ts:172-176`

**Issue:** The module's own comment at line 20-21 states: "Nenhum `console.*` deste módulo pode receber `data` (que contém senha) ou qualquer campo senha/confirmar_senha." However line 172-176 logs:

```ts
console.log('[CADASTRO] Invocando Edge Function cadastrar-candidato', {
  email: data.dadosPessoais.email,   // <-- PII in logs
  nome: data.dadosPessoais.nome_completo, // <-- PII in logs
  hasPassword: Boolean(data.dadosPessoais.senha),
})
```

The email is PII. The CLAUDE.md Pitfall 7 rule says to log only boolean flags. The `requestPasswordReset` function in `passwordService.ts` (same codebase) explicitly refuses to log the email for the same reason. Inconsistent application of the rule, and any log aggregation system that captures these logs will contain user emails and full names from cadastro submissions.

**Fix:** Replace the log with redacted flags only:
```ts
console.log('[CADASTRO] Invocando Edge Function cadastrar-candidato', {
  hasEmail: Boolean(data.dadosPessoais.email),
  hasNome: Boolean(data.dadosPessoais.nome_completo),
  hasPassword: Boolean(data.dadosPessoais.senha),
})
```

---

### WR-03: `invokeError.message` logged verbatim — may echo serialized request body containing password

**File:** `src/features/cadastro/services/cadastroService.ts:237-239`

**Issue:** When the Edge Function invocation fails at the network layer, line 237-239 logs:
```ts
console.error(
  '[CADASTRO] Falha de rede ao invocar Edge Function:',
  invokeError.message || String(invokeError)
)
```

In some versions of `supabase-js`, `FunctionsHttpError.message` or `String(error)` serialization can include the request body or URL that was sent. If the request body is included in the error string, `password` (the user's plain-text password) would appear in the log. The Pitfall 7 comment on line 235-236 acknowledges the risk ("invokeError pode transportar o request body em alguns SDKs") but still logs `invokeError.message`. This is inconsistent — acknowledging the risk and then doing it anyway.

**Fix:** Replace the log with a static message that does not include any part of `invokeError`:
```ts
console.error('[CADASTRO] Falha de rede ao invocar Edge Function (message suppressed — may contain request body)')
```
or log only the error `name` and `status` if available:
```ts
console.error('[CADASTRO] Falha de rede:', {
  name: invokeError instanceof Error ? invokeError.name : 'unknown',
  status: (invokeError as { status?: number }).status,
})
```

---

### WR-04: `globals.css` sidebar tokens reference hex `var(--brand-*)` / `var(--neutral-*)` but tailwind sidebar color mapping (if added later) would wrap them in `hsl()` — token type mismatch

**File:** `src/styles/globals.css:147-154`

**Issue:** The semantic token block (lines 53-72) was correctly repaired to HSL channel triplets by Plan 05-02. However the `sidebar` block (lines 147-154) still assigns raw CSS hex variable references:

```css
--sidebar: var(--neutral-900);           /* resolves to #2D2E30 — hex */
--sidebar-primary: var(--brand-primary); /* resolves to #00109E — hex */
--sidebar-accent: var(--neutral-800);    /* resolves to #4A4C4E — hex */
```

If a future phase adds `sidebar` to `tailwind.config.js` colors as `hsl(var(--sidebar))` (the shadcn convention), the `hsl(#2D2E30)` expression is invalid CSS and will produce transparent. `tailwind.config.js` does not currently map sidebar colors, so there is no immediate breakage — but this is a latent inconsistency that will cause a hard-to-debug visual regression when the sidebar UI is built.

**Fix:** Convert sidebar tokens to HSL channel triplets matching the pattern established for the semantic tokens:
```css
--sidebar: 220 3% 18%;           /* neutral-900 #2D2E30 */
--sidebar-primary: 234 100% 31%; /* brand-primary #00109E */
--sidebar-accent: 215 4% 30%;    /* neutral-800 #4A4C4E */
/* etc. */
```

---

## Info

### IN-01: `select.tsx` and other shadcn primitives use version-pinned import paths (`@radix-ui/react-select@2.1.6`, `lucide-react@0.487.0`)

**File:** `src/components/ui/select.tsx:4,9`

**Issue:** Import statements use versioned package specifiers (`from "@radix-ui/react-select@2.1.6"` and `from "lucide-react@0.487.0"`). This is the shadcn CLI's generated output format and is project-wide convention (same pattern appears in `pagination.tsx`, `input-otp.tsx`, `calendar.tsx`, `radio-group.tsx`, `sheet.tsx`, etc.). These are functionally fine as long as the versions match `package.json` (they do — `^2.1.6` and `^0.487.0`). However the version pin in the import string is brittle: a minor version upgrade via `npm update` will cause the installed version to diverge from the import specifier, breaking the module resolution in some bundler configurations.

**Fix:** Remove the version suffix from the import specifier (this is also the shadcn official guidance post-2024):
```ts
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
```
Note: this is pre-existing across the entire `src/components/ui/` directory, not a new introduction by Phase 5 — flagging here because `select.tsx` was touched in this phase.

---

### IN-02: `MeuPerfilCandidatoPage` logs raw `error` objects on password/data save failures

**File:** `src/components/pages/MeuPerfilCandidatoPage.tsx:83,98,142,156,217,243,259`

**Issue:** All error handlers call `console.error('...', error)` passing the full error object. In contrast, `passwordService.ts` (Phase 5 / Plan 05-06) carefully logs only `{ code, status }` from Supabase errors. Supabase auth errors can include fields like `message` that may echo internal session state or auth token details. Lines 142 and 156 specifically log errors from `supabase.auth.updateUser`, which is the most sensitive operation on this page.

**Fix:** Mirror the `passwordService` pattern — log only `{ code, status }` for Supabase errors, and `error instanceof Error ? error.message : String(error)` for generic errors.

---

### IN-03: CI `lighthouse` job installs `@lhci/cli` globally at a pinned version rather than using the devDependency

**File:** `.github/workflows/ci.yml:70`

**Issue:** The lighthouse job runs `npm install -g @lhci/cli@0.15.1` as a separate step rather than using the `@lhci/cli` already installed as a devDependency (package.json has `"@lhci/cli": "^0.15.1"`). This means the global install and the devDependency can drift if one is updated without the other. It also adds an unnecessary network call in CI.

**Fix:** Replace the global install with `npx lhci autorun` (which will use the devDependency) or `./node_modules/.bin/lhci autorun`:
```yaml
- run: npx lhci autorun
```
The `npm ci` step already installs the devDependency, so no separate install is needed.

---

_Reviewed: 2026-06-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
