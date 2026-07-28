---
phase: 3
slug: login-recuperacao-senha
status: draft
shadcn_initialized: false
preset: beauty-smile-glass (manual, pre-existing in src/styles/globals.css)
created: 2026-04-24
---

# Phase 3 — UI Design Contract: Login + Recuperação de Senha

> Visual and interaction contract for the four auth touchpoints (Login Candidato, Login RH, Esqueci Senha, Redefinir Senha). Locks the UX decisions that CONTEXT.md D-21 explicitly deferred to this phase: page layout, error-state visuals, Remember-me affordance, cooldown timer UI, reset-flow transitions, and microcopy mapping for the new `AuthError` taxonomy (D-17). Pages already exist as Phase 1 scaffolds; this contract is prescriptive about the reshape that Phase 3 wiring must produce.

---

## Scope of This Contract

**In scope (what this document locks):**
1. Page shell — single-column glass card, iPhone 12 Pro floor, no horizontal scroll
2. Login form — email, senha with eye-toggle, "Lembrar-me" checkbox (checked-by-default), "Esqueci senha" link, submit button
3. Login error states — generic invalid-credentials, email-not-confirmed (+ Reenviar CTA), rate-limit (cooldown timer + disabled submit), network-error (+ Tentar novamente)
4. Transition state — "Entrando..." spinner, disabled submit during auth, redirect-pending overlay after successful login
5. Esqueci Senha form — email field, neutral success state (indistinguishable from not-found)
6. Redefinir Senha form — 2 password fields with eye-toggle, Zod silent validation (no strength meter, no live checklist), submit → auto-login → toast → redirect
7. Recovery-link-invalid state (loaded /auth/redefinir-senha without a valid recovery session)
8. Microcopy catalog — every string across the 4 pages, pt-BR cordial
9. AuthError.code → UI mapping table — one row per code from D-17 taxonomy
10. Accessibility contract — labels, focus rings, ARIA live, touch targets, reduced-motion
11. Responsive breakpoints — iPhone 12 Pro (390×844) is the non-negotiable floor
12. Design tokens referenced — exact CSS variables / Tailwind classes carried over from Phase 2

**Out of scope (do NOT redesign):**
- The glass UI aesthetic already in production (Beauty Smile Glass) — Phase 2 locked it
- Creating new routes or pages — all 4 routes already exist in `routes.tsx`
- Supabase email templates — default template acceptable (D-16 deferred)
- Password strength meter (D-11 kills zxcvbn/visual meter)
- MFA/2FA UI (out of scope, CONTEXT.md deferred)
- LGPD re-consent on reset (D-16 explicitly out)
- Social login buttons (backlog M2)
- "Contact/help" side panel currently on LoginCandidatoPage — **REMOVE it** (see § Layout Decision)

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (shadcn/ui primitives vendored manually into `src/components/ui/`; no `components.json`) — carried over from Phase 2 |
| Preset | Beauty Smile Glass UI (custom) — defined in `src/styles/globals.css` |
| Component library | Radix UI primitives via shadcn/ui (same 29 primitives as Phase 2) |
| Icon library | `lucide-react` — Phase 3 uses: `Mail`, `Lock`, `Eye`, `EyeOff`, `Loader2`, `AlertCircle`, `CheckCircle2`, `ArrowLeft`, `ArrowRight`, `Clock`, `Send`, `ShieldCheck` |
| Font | `'Helvetica Neue', Helvetica, Arial, sans-serif` (CSS var `--font-family`) |
| Toast | `sonner` — via `import { toast } from 'sonner'` (Phase 2 Plan 02-06 Sonner `resolve.dedupe` fix carries forward; do NOT import from `'sonner@2.0.3'`) |

**Registry Safety:** Not applicable. No third-party shadcn registries declared. All primitives under `src/components/ui/` are locally vendored; no network fetches during install/build.

---

## Layout Decision

### Single-column, single-card shell (no side panel)

All 4 pages share the same shell:

```
<BackgroundImage background="gradient" overlayColor="bg-black" overlayOpacity={15}>
  <div class="min-h-screen flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <BeautySmileLogo type="vertical" variant="white" size="lg" class="mx-auto mb-8 drop-shadow-lg" />
      <GlassCard variant="white" blur="lg" class="p-6 sm:p-8">
        {/* page-specific content */}
      </GlassCard>
      {/* page-specific footer links (e.g., "Não tem conta? Criar") */}
    </div>
  </div>
</BackgroundImage>
```

**Why single-column:**
- Phase 2 cadastro uses the same mobile-first single-card shape (`max-w-4xl` only because the form needs 2-col fields). Login has ≤3 fields — `max-w-md` (448px) is the correct density.
- iPhone 12 Pro (390px) shows the card at full-width with `px-4` gutters; scales cleanly to desktop centered.
- The current LoginCandidatoPage renders a 2-column `grid lg:grid-cols-2` with a "Precisa de Ajuda?" contact panel. **Remove that panel in Phase 3.** It competes for attention with the auth CTA, inflates the page to `max-w-6xl`, and breaks visual consistency with cadastro. Contact info moves to a footnote link (see Microcopy).

**Why divergence from cadastro `max-w-4xl`:** the multi-step registration form needed horizontal real estate for 2-col field pairs (Email+Telefone, Instagram+LinkedIn, etc.). Login has 2-3 fields and benefits from a narrower optical center — the industry convention (Supabase dashboard, Vercel, Linear, Notion) is 400-480px for auth cards. `max-w-md` (448px) sits in that sweet spot. This is the only layout-width divergence from cadastro; spacing, typography, color, and component primitives are identical.

### Common header per page

Every page header (inside the GlassCard, above the form):

```tsx
<div className="text-center mb-6">
  <h1 className="text-white text-2xl font-semibold mb-2 drop-shadow-lg">
    {pageTitle}
  </h1>
  <p className="text-sm text-white/90 drop-shadow-md">
    {pageSubtitle}
  </p>
</div>
```

**Typography note:** H1 size is `text-2xl` (24px) weight 600 — NOT the current scaffold's `text-[40px] font-bold`. Phase 3 drops hardcoded `[40px]` and `font-bold` to comply with the Dim4 contract (400/600 only, max heading 20-24px — see § Typography).

---

## Spacing Scale

Declared values — all multiples of 4. Carried over from Phase 2 UI-SPEC.

| Token | Value | Tailwind | Usage in Phase 3 |
|-------|-------|----------|------------------|
| xs | 4px | `gap-1`, `p-1` | AlertCircle + inline error text gap |
| sm | 8px | `gap-2`, `space-y-2` | Checkbox ↔ label gap; form field label-to-input gap |
| md | 16px | `gap-4`, `p-4`, `space-y-4` | Default between form fields inside the card on mobile |
| lg | 24px | `gap-6`, `p-6`, `space-y-6` | Card inner padding mobile; field-to-field on desktop; logo-to-card margin |
| xl | 32px | `p-8` | Card inner padding on desktop (sm+) |
| 2xl | 48px | `pb-12`, `py-12` | Vertical safe area around the card (min-h-screen container) |

**Exceptions:**
- Submit button minimum height: **44px** mobile / **40px** desktop — iOS/Android touch target a11y floor.
- Eye-toggle clickable area: minimum **44×44px** — bump padding from the current `absolute right-3` positioning so the tap target meets iOS HIG.
- "Lembrar-me" checkbox clickable row: minimum **44px** height — wraps Checkbox + Label together.
- "Esqueci senha" and "Voltar ao login" text links: pad vertical hit area to 44px (`py-2` on the anchor/button).

---

## Typography

Pulled from `--text-*` CSS variables. **Exactly 4 sizes and 2 weights (400 regular, 600 semibold). Hierarchy via size, not weight.** Direct carryover of Phase 2 Dim4 invariant.

| Token | Size | Weight | Use in Phase 3 |
|-------|------|--------|----------------|
| Helper | 12px (`text-xs`) | 400 | Policy-version caption; remaining-attempts counter; "Versão…" footnote |
| Body / Inline | 14px (`text-sm`) | 400 | Error messages, success hints, subtitle text under H1, checkbox label (when paired with H1/H2 heading hierarchy) |
| Body (input) | 16px (`text-base`) | 400 | All `<Input>` text (iOS zoom-prevention floor); button labels; page subtitle |
| Label | 14px (`text-sm`) | 600 | Field labels (`<Label>` components), badges |
| Heading H1 | 24px (`text-2xl`) | 600 | Page title ("Entrar", "Recuperar senha", "Nova senha") |
| Heading H2 | 20px (`text-xl`) | 600 | Post-submit success state heading ("Email enviado", "Senha alterada") |

**Forbidden in Phase 3:**
- `font-medium` (500) — collapses to `font-semibold` (600) if emphasis needed, else `font-normal` (400).
- `font-bold` (700) — collapses to `font-semibold` (600). The current scaffolds use `font-bold` on H1 (`text-[40px] font-bold`) and `font-medium` on the emailValue display in EsqueciSenha success state. Both must go.
- `italic` — never.
- Placeholder-only fields — every input MUST have a visible `<Label>` above (HARD-04).

**Accessibility note:**
- H1 24px + weight 600 is still clearly dominant over 16px body weight 400 — WCAG passes on size alone.
- All body copy on glass surfaces uses `text-white` at 100% opacity (not `text-white/90` or `text-white/60` for primary content — Phase 2 UI-SPEC § Color Contrast established that `text-white/70` or less FAILS WCAG AA for <18px text).
- Use `text-white/90` ONLY for the page subtitle (body 16px on dark brand-primary background → contrast still ≥ 12:1).

---

## Color

Beauty Smile Glass UI: dark brand-primary gradient background with translucent white glass panels. Identical palette to Phase 2.

| Role | Value | Tailwind token | Usage in Phase 3 |
|------|-------|----------------|------------------|
| Dominant (60%) | `#00109E` (brand-primary) | `--brand-primary` | Page background (via `BackgroundImage background="gradient"`) |
| Secondary (30%) | `rgba(255,255,255,0.10)` + `backdrop-blur-lg` | `bg-white/10 backdrop-blur-lg` | GlassCard surface; info callouts (e.g., "Verifique sua caixa de entrada") |
| Accent (10%) | `#00109E` (brand-primary) on white | `bg-[#00109E]` | **Reserved for:** primary CTA button ("Entrar", "Enviar instruções", "Redefinir senha"); "Reenviar email de confirmação" CTA button; "Solicitar novo link" button on expired-link state |
| Destructive | `text-red-400` (#F87171) on glass, `bg-red-500/10` | `text-red-400` / `bg-red-500/10` | Inline form errors; Sonner error toasts; error-state icons; "Link inválido" state icon container |
| Success | `text-green-400` (#4ADE80) on glass, `bg-green-500/10` | `text-green-400` / `bg-green-500/10` | "Email enviado" success icon; "Senha alterada" success state; Sonner success toast |
| Info / Warning | `text-amber-400` on glass, `bg-amber-500/10` | `text-amber-400` / `bg-amber-500/10` | Rate-limit cooldown warning ("Muitas tentativas. Tente novamente em Xs"); remaining-attempts counter ("2 tentativas restantes") |

**Accent reserved for** (explicit list — do NOT expand in Phase 3):
1. The primary CTA button on each page (`Entrar`, `Enviar instruções`, `Redefinir senha`, `Solicitar novo link`, `Ir para perfil agora`).
2. The secondary link "Criar conta" inline below the login form (accent `text-white` with underline on hover; NOT brand-primary fill — reserving the filled accent purely for primary CTAs).
3. The "Lembrar-me" Checkbox `data-[state=checked]` fill — matches Phase 2 LGPD checkbox pattern.

**Never use accent for:**
- "Voltar ao login" text links (use `text-white/80` underline).
- "Esqueci senha?" link on the login page (use `text-white/80` underline).
- Error-state action buttons ("Tentar novamente") inside a toast — Sonner action buttons inherit toast variant styling; don't override.
- Success state icons (use green).
- Password visibility toggle (use `text-white/70` hover `text-white`).

**Cooldown amber rationale:** rate-limit is a transient "be patient" state, not an error (the user did nothing wrong except try too fast). Amber is Phase 2-established warning color (see `cadastroService.ts` rate_limit branch → "warning" toast variant). Keeps error-red dedicated to actionable-failure states only.

---

## Form Field Contracts (Shared Across All 4 Pages)

### Input + Label pair

```tsx
<div className="space-y-2">
  <Label htmlFor={id} className="text-white text-sm font-semibold">
    {labelText}
    {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
  </Label>
  <div className="relative">
    {leadingIcon && (
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" aria-hidden="true">
        {leadingIcon}
      </span>
    )}
    <Input
      id={id}
      type={inputType}
      {...register(fieldName)}
      placeholder={placeholder}
      className={cn(
        'bg-white/20 border-white/30 text-white text-base placeholder:text-white/50',
        leadingIcon && 'pl-10',
        trailingControl && 'pr-10'
      )}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      autoComplete={autoComplete}
    />
    {trailingControl}
  </div>
  {error && (
    <p
      id={`${id}-error`}
      className="text-red-400 text-sm flex items-center gap-1"
      role="alert"
    >
      <AlertCircle className="w-4 h-4" aria-hidden="true" />
      {error.message}
    </p>
  )}
</div>
```

**Variants per page:**

| Page | Field | `leadingIcon` | `trailingControl` | `autoComplete` |
|------|-------|---------------|-------------------|----------------|
| Login Candidato | email | `<Mail w-5 h-5>` | — | `email` |
| Login Candidato | senha | `<Lock w-5 h-5>` | Eye/EyeOff toggle | `current-password` |
| Login RH | email | `<Mail w-5 h-5>` | — | `email` |
| Login RH | senha | `<Lock w-5 h-5>` | Eye/EyeOff toggle | `current-password` |
| Esqueci Senha | email | `<Mail w-5 h-5>` | — | `email` |
| Redefinir Senha | nova_senha | `<Lock w-5 h-5>` | Eye/EyeOff toggle | `new-password` |
| Redefinir Senha | confirmar_nova_senha | `<Lock w-5 h-5>` | Eye/EyeOff toggle | `new-password` |

### Eye-toggle button

```tsx
<button
  type="button"
  onClick={toggle}
  aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 -m-2 text-white/70 hover:text-white transition-colors"
>
  {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
</button>
```

**Note on the 44×44 hit target:** `p-2 -m-2` creates an 8px padded hit area around the 16px icon → 32px visible, 44px effective hit (with outer `-m-2` negating padding for layout). Keeps the icon visually compact while satisfying iOS HIG.

### "Lembrar-me" checkbox row (login pages only)

```tsx
<div className="flex items-start justify-between gap-3 py-2">
  <div className="flex items-start gap-2">
    <Checkbox
      id="rememberMe"
      {...register('rememberMe')}
      defaultChecked={true}
      className="border-white/30 data-[state=checked]:bg-[#00109E] data-[state=checked]:border-[#00109E] mt-0.5"
    />
    <div className="flex-1">
      <Label
        htmlFor="rememberMe"
        className="text-white text-sm font-semibold cursor-pointer"
      >
        Lembrar-me
      </Label>
      <p className="text-xs text-white/80 mt-0.5">
        Manter sessão ativa ao fechar o navegador
      </p>
    </div>
  </div>
  <button
    type="button"
    onClick={handleForgotPassword}
    className="text-sm text-white/80 hover:text-white underline py-2"
  >
    Esqueci minha senha
  </button>
</div>
```

**D-05/D-06 contract visualized:**
- Checkbox `defaultChecked={true}` — persistent-by-default (localStorage).
- Helper caption below label explicitly tells the user what unchecking does — removes the "mystery feature" problem.
- On desktop (sm+): row is horizontal with "Esqueci senha" floated right, both vertically centered.
- On mobile: the row stacks (checkbox row on top, link below with `py-2` tap padding) when viewport < 400px if the combined width overflows — use `flex-wrap gap-y-2`.

### Primary submit button

```tsx
<Button
  type="submit"
  disabled={isSubmitting || !isValid || isInCooldown}
  className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white text-base font-semibold py-3 min-h-11 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      {busyLabel}
    </>
  ) : isInCooldown ? (
    <>
      <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
      Aguarde {cooldownSeconds}s
    </>
  ) : (
    <>
      {idleLabel}
      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
    </>
  )}
</Button>
```

**Per-page labels:**

| Page | `idleLabel` | `busyLabel` |
|------|-------------|-------------|
| Login Candidato | Entrar | Entrando... |
| Login RH | Entrar | Entrando... |
| Esqueci Senha | Enviar instruções | Enviando... |
| Redefinir Senha | Redefinir senha | Alterando... |
| Expired-link state (D-9 → Solicitar novo link) | Solicitar novo link | Enviando... |

**Scale-active feedback:** `active:scale-[0.98]` (not `active:scale-95`) — carried from cadastro pattern but slightly tamer (feels more premium on glass UI).

**Disabled semantics:**
- `!isValid` → Zod says form is invalid (field errors still showing); button is dimmed but NOT labeled "Aguarde".
- `isSubmitting` → async in flight; button shows `Loader2` + `busyLabel`.
- `isInCooldown` → rate-limit active; button shows `Clock` + countdown; overrides `!isValid` visually (see § Rate-limit cooldown).

---

## Login Flow — Error States & Visuals

### Error rendering strategy

Login errors from the new `authService` (D-17) arrive as `AuthError { code, message, field?, retryAfterSeconds? }`. The UI must:

1. **Toast** — always, via Sonner, positioned `top-center` on mobile and `bottom-right` on desktop (Phase 2 default preserved).
2. **Inline error on a field** — ONLY when `error.field` is present (currently: none of the login error codes produce a field-level error per D-01 "generic credential message"; `email_not_confirmed` could mark field=email but the dedicated CTA replaces inline copy).
3. **Dedicated UI element** — for email-not-confirmed (Reenviar CTA) and rate-limit (cooldown timer).

**Shared rule:** No destructive form reset on error. Email value and Lembrar-me checkbox state are ALWAYS preserved across failed attempts.

### Email-not-confirmed CTA (D-02)

Rendered below the submit button as a dedicated block when the last `onSubmit` returned `code: 'EMAIL_NOT_CONFIRMED'`:

```tsx
{lastError?.code === 'EMAIL_NOT_CONFIRMED' && (
  <div
    className="rounded-lg bg-amber-500/10 border border-amber-400/30 p-4 space-y-2"
    role="alert"
    aria-live="polite"
  >
    <p className="text-sm text-white flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>Confirme seu email antes de fazer login. Verifique sua caixa de entrada e spam.</span>
    </p>
    <Button
      type="button"
      variant="outline"
      onClick={handleResend}
      disabled={isResending}
      className="w-full bg-white/10 border-white/30 text-white text-sm font-semibold hover:bg-white/20"
    >
      {isResending ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Reenviando...</>
      ) : (
        <><Send className="mr-2 h-4 w-4" aria-hidden="true" /> Reenviar email de confirmação</>
      )}
    </Button>
  </div>
)}
```

After `handleResend` succeeds: Sonner `success` toast `"Email reenviado. Verifique sua caixa de entrada (e spam)."` duration 5000ms. Block stays visible (user may want to click again if still nothing arrives).

**Copy pt-BR:** *"Confirme seu email antes de fazer login. Verifique sua caixa de entrada e spam."* — tells the user the exact action; no euphemism.

### Rate-limit cooldown UI (D-03)

When `AuthError.code === 'RATE_LIMITED'`:

1. Extract `retryAfterSeconds` from the error (derived from `Retry-After` header when present; fallback 60s per D-03).
2. Disable submit button; swap label to `"Aguarde {N}s"` with `<Clock>` icon — button shows `disabled` styling (opacity 50%).
3. Start a 1s-interval countdown; update button label every tick.
4. When countdown reaches 0: re-enable submit, restore idle label, clear the cooldown state.
5. Render an amber info block below the submit (same structure as email-not-confirmed) with copy:

```
Muitas tentativas em pouco tempo. Tente novamente em {N}s.
```

The amber block fades on cooldown end (use the existing `animate-fadeIn` utility in `globals.css`, 200ms).

**Accessibility:** the countdown updates `aria-live="polite"` (not "assertive" — polite avoids flooding SR every second). Use a `<span aria-live="polite" aria-atomic="true">{N}s</span>` inside the button label, OR announce once at the start ("Aguarde 60 segundos") and suppress tick updates from SR.

**Edge case:** if the user leaves and comes back, the cooldown must persist across remount. Store `rateLimitedUntil: ISO timestamp` in a Zustand slice or simple in-memory ref; do NOT put it in localStorage (user clears storage ≠ session legit unlock). Planner concern, not UI.

### Invalid-credentials error (D-01)

`AuthError.code === 'INVALID_CREDENTIALS'` (covers both "email not found" and "wrong password" — generic for security):

- **Toast only.** No inline field error. No Reenviar block.
- Sonner `error` variant, duration 6000ms, copy: **`Email ou senha inválidos. Verifique os dados e tente novamente.`**
- Submit button re-enables; fields keep their values.
- Focus returns to the senha field (`senhaRef.current?.focus()`) — the email field likely correct; user's mental model is "did I type the password right?".

### Network error (D-04)

`AuthError.code === 'NETWORK_ERROR'`:

- Sonner `error` toast, duration 6000ms, copy: **`Sem conexão com o servidor. Verifique sua internet.`**
- Toast includes action button: `"Tentar novamente"` — clicking it re-dispatches the last `onSubmit`.
- No inline error. No dedicated block. The toast action is the CTA — keeps the form itself clean.

### Server error (D-17 SERVER_ERROR / UNKNOWN_ERROR)

- Sonner `error` toast, duration 6000ms, copy: **`Algo deu errado. Tente novamente em alguns instantes.`**
- Action button `"Tentar novamente"` in the toast.

### Login success → redirect (D-08, D-13 Bug 1 fix)

**Sequence:**
1. `signInWithPassword` resolves with `{ user, session }`.
2. authStore updates (user, session, role from JWT per Bug 1 fix).
3. Sonner `success` toast `"Login realizado com sucesso!"` duration 3000ms. **No description line** (the current scaffold shows `Bem-vindo, {nome}!` — deprecated; nome is loaded on `/candidato/perfil` page itself; keeps the toast tight).
4. `navigate('/candidato/perfil', { replace: true })` — **immediate**, no `setTimeout(1000)` grace period. The current scaffold has `setTimeout(() => navigate(...), 1000)` which adds 1s of unnecessary wait; drop it.
5. Submit button stays disabled during the navigation frame (visible for ~100ms) — do NOT set submitting back to false.

**No "loading profile" interstitial:** the current scaffold calls `supabase.from('candidatos').select(...)` between signIn and navigate, showing a `toast.loading('Carregando seu perfil...')`. Move that query to `/candidato/perfil` itself (it runs there anyway in Phase 5). Login page only authenticates.

---

## Esqueci Senha — UX Contract

### Initial state (form)

- **Title:** H1 `Recuperar senha`
- **Subtitle:** `Informe seu email cadastrado e enviaremos um link para você criar uma nova senha.`
- **Single field:** email (with `Mail` leading icon, autoFocus, `autoComplete="email"`).
- **Submit:** `Enviar instruções` / `Enviando...`
- **Below submit:** "Voltar ao login" text link with `<ArrowLeft>` icon, aligned center.

### Post-submit state (D-09 neutral message)

Replace the entire card content with:

```tsx
<div className="text-center space-y-6">
  <div className="flex justify-center">
    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center backdrop-blur-md">
      <CheckCircle2 className="w-8 h-8 text-green-400 drop-shadow-lg" aria-hidden="true" />
    </div>
  </div>

  <div className="space-y-3">
    <h2 className="text-white text-xl font-semibold drop-shadow-lg">Verifique seu email</h2>
    <p className="text-white text-sm drop-shadow-md leading-relaxed">
      Se o email estiver cadastrado, enviamos um link de recuperação. Verifique sua caixa de entrada (e spam).
    </p>
  </div>

  <div className="bg-white/10 border border-white/20 rounded-lg p-4">
    <p className="text-white/90 text-sm leading-relaxed">
      O link expira em 1 hora.
    </p>
  </div>

  <div className="space-y-3 pt-2">
    <Button onClick={goToLogin} className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white font-semibold py-3 min-h-11">
      Voltar ao login
    </Button>
    <button
      type="button"
      onClick={reopenForm}
      className="text-sm text-white/80 hover:text-white underline py-2"
    >
      Usar outro email
    </button>
  </div>
</div>
```

**D-09 hard rule:** the post-submit copy is IDENTICAL whether the email exists in the database or not. No success-for-existing-only. No fallback for not-found. No echo of the submitted email address (the current scaffold shows `{emailValue}` in the success state — remove this; it leaks the input and looks weird when user typed a typo).

**Sonner toast:** single `info` variant on submit success, duration 4000ms, copy `"Se o email existir, o link de recuperação foi enviado."` — matches the card copy; do NOT claim `"Email enviado com sucesso!"` (too confident for a neutral-by-design state).

### Rate-limit on Esqueci Senha

If `supabase.auth.resetPasswordForEmail` returns rate-limited:
- Inline error on the email field: `"Aguarde alguns minutos antes de tentar novamente."`
- Sonner `warning` toast, duration 5000ms, copy `"Muitas solicitações. Tente novamente em alguns minutos."`
- Submit button disabled for the remaining cooldown (same pattern as login rate-limit).

**Do NOT expose `{N} tentativas restantes` in the primary flow.** The current scaffold renders that counter from a client-side rate-limit service; it leaks rate-limit configuration details. If the planner keeps a client-side rate-limit helper, hide the counter from UI and only surface the cooldown timer on rejection.

---

## Redefinir Senha — UX Contract

### Recovery-session validation (on mount)

Before rendering the form, check if there's an active recovery session:

```
hasValidSession === null  → show <Loader2> spinner + "Validando link..."
hasValidSession === false → show InvalidLinkState (below)
hasValidSession === true  → show form
```

**Validation loading state** — render the spinner + copy inside the same GlassCard:

```tsx
<div className="flex flex-col items-center justify-center py-8 space-y-4">
  <Loader2 className="w-10 h-10 text-white animate-spin" aria-hidden="true" />
  <p className="text-sm text-white">Validando seu link...</p>
</div>
```

Target validation time: ≤ 500ms in 95p. If it exceeds 2s, fall back to `InvalidLinkState` (treat as expired).

### Invalid / expired link state

```tsx
<div className="text-center space-y-6">
  <div className="flex justify-center">
    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center backdrop-blur-md">
      <AlertCircle className="w-8 h-8 text-red-400" aria-hidden="true" />
    </div>
  </div>

  <div className="space-y-3">
    <h2 className="text-white text-xl font-semibold drop-shadow-lg">Link inválido ou expirado</h2>
    <p className="text-white text-sm drop-shadow-md leading-relaxed">
      Este link de recuperação não é mais válido. Solicite um novo link para continuar.
    </p>
  </div>

  <div className="bg-white/10 border border-white/20 rounded-lg p-4">
    <p className="text-white/90 text-sm">
      Links de recuperação expiram em 1 hora por segurança.
    </p>
  </div>

  <div className="space-y-3 pt-2">
    <Button onClick={goToEsqueciSenha} className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white font-semibold py-3 min-h-11">
      Solicitar novo link
    </Button>
    <button
      type="button"
      onClick={goToLogin}
      className="text-sm text-white/80 hover:text-white underline py-2"
    >
      Voltar ao login
    </button>
  </div>
</div>
```

**Copy change from scaffold:** current scaffold says `"Links de recuperação expiram em 24 horas"` — wrong. Supabase default for password-reset links is 1 hour (AUTH-03 explicitly: `"link valido por 1h"`). Fix to `"1 hora"`.

### Form state (valid recovery session, D-10/D-11)

- **Title:** H1 `Nova senha`
- **Subtitle:** `Escolha uma senha segura para continuar acessando sua conta.`
- **Fields:**
  - `nova_senha` — Password field with `Lock` leading icon + Eye toggle.
  - `confirmar_nova_senha` — Password field with `Lock` leading icon + Eye toggle.
- **Helper text below `nova_senha` (D-11 silent validation):**
  - `text-xs text-white`: `"Mínimo 8 caracteres, incluindo maiúscula, minúscula e número."`
  - This is PASSIVE guidance — no live checklist, no progress bar, no strength meter. The helper is the only hint the user gets until they click submit.
- **Zod submit-time validation only.** Errors appear inline BELOW each field after the user clicks submit, identical to cadastro's DadosPessoaisStep senha pattern.
- **Submit button:** `Redefinir senha` / `Alterando...`

**Explicit anti-pattern kill-list** (currently in the scaffold, REMOVE):
- `passwordStrength` score + color-coded bar (`bg-red-500 → bg-emerald-500`) → **remove**
- Live `requirements` checklist (5 items with CheckCircle2/AlertCircle icons) → **remove**
- `"As senhas coincidem"` live confirmation hint with CheckCircle2 → **remove** (D-11 silent; error-on-submit only)
- Submit `disabled={passwordStrength.score < 4 || novaSenha !== confirmarSenha}` → **remove** (D-11: submit always enabled when form has values; Zod error surfaces on click)

**D-11 rationale for keeping it dry:** matches cadastro exactly. Phase 2 UI-SPEC already committed to "silent Zod validation" for the cadastro senha field — Phase 3 applies the same rule. Reduces cross-page inconsistency; no 3rd visual affordance to maintain.

### Post-reset success state (D-12)

**Sequence:**
1. `supabase.auth.updateUser({ password })` resolves with `{ error: null }`.
2. Client calls `tryAutoLogin(currentUserEmail, novaSenha)` — reuses Phase 2 Plan 02-05 helper.
3. On auto-login success:
   - Sonner `success` toast `"Senha alterada com sucesso."` duration 4000ms (no description — keeps it tight).
   - `navigate('/candidato/perfil', { replace: true })` — **immediate**, no countdown.
4. On auto-login fail after 1 retry (500ms backoff):
   - Sonner `success` toast `"Senha alterada. Faça login para continuar."` duration 5000ms.
   - `navigate('/auth/login', { replace: true })`.

**Drop the 3-second countdown** from the current scaffold. It's a Phase 1-era pattern; Phase 2 auto-login doesn't use it and Phase 3 post-reset shouldn't either. Immediate navigate after the success toast fires — the toast is the feedback, the redirect is the confirmation.

**No email notification to the user ("sua senha foi alterada").** Out of scope per CONTEXT.md deferred list.

### In-flight state (form submit)

Same pattern as login:
- Submit button: `Loader2` + `"Alterando..."`.
- Form fields soft-disabled (`pointer-events-none opacity-80` on the form wrapper).
- No dialog, no interstitial.

### Zod error messages (D-11, pt-BR)

| Condition | Message |
|-----------|---------|
| Senha < 8 chars | `Senha deve ter no mínimo 8 caracteres` |
| Senha missing uppercase | `Inclua pelo menos uma letra maiúscula` |
| Senha missing lowercase | `Inclua pelo menos uma letra minúscula` |
| Senha missing digit | `Inclua pelo menos um número` |
| Confirmar senha mismatch | `As senhas não coincidem` |
| Either field empty | `Informe a nova senha` / `Confirme a nova senha` |

Reuse the exact regex + messages from `src/features/cadastro/schemas/dadosPessoaisSchema.ts` (senha block). Planner may factor into a shared `passwordSchema` in `src/features/auth/schemas/`.

### Server-side error mapping (updateUser failure)

| Error | Toast |
|-------|-------|
| `same_password` (Supabase rejects identical password) | `error` · `A nova senha deve ser diferente da atual.` |
| `weak_password` (Supabase-enforced complexity) | `error` · `Senha muito fraca. Escolha uma senha mais forte.` |
| `session_expired` (recovery token invalidated mid-flow) | `error` · `Sessão expirada. Solicite um novo link.` · auto-navigate to `/auth/esqueci-senha` after 3s |
| `NETWORK_ERROR` / `UNKNOWN_ERROR` | `error` · `Não foi possível alterar a senha. Tente novamente.` · action `Tentar novamente` |

---

## Login RH — UX Divergence from Login Candidato

Intentionally minimal. The layout, spacing, typography, and error contract are IDENTICAL to Login Candidato. Only 3 copy + behavior differences:

| Aspect | Login Candidato | Login RH |
|--------|-----------------|----------|
| Page title (H1) | `Entrar` | `Área RH` |
| Subtitle | `Acesse sua conta de candidato` | `Acesse o painel interno` |
| Email placeholder | `seu@email.com` | `seu.email@beautysmile.com.br` |
| Post-login redirect | `/candidato/perfil` | `/rh/dashboard` |
| "Criar conta" footer link | Visible — links to `/auth/inscricao` | **Hidden** — RH accounts are created by admin |
| Role gate (D-14 fix) | Role === 'candidato' required | Role === 'administrador' required; wrong role → signOut + Sonner error `"Esta conta não tem acesso ao painel RH."` |

**Do NOT:**
- Re-introduce the `logLoginSuccess` / `logLoginFailure` / `logAccessDenied` service calls from the current scaffold (those use legacy `logAccessService` built on the pre-Phase-1 auth model; out of scope for Phase 3; telemetry is Phase 5 deferred).
- Preserve the "Conexão Segura / criptografia de ponta a ponta" Glass info callout from the current scaffold. It's marketing copy that adds visual weight without user value; drop it.
- Show a separate "Solicitar credenciais" link — admin creates accounts manually, the user knows who to contact.

**Keep:**
- Same GlassCard `max-w-md` layout as Login Candidato.
- Same error taxonomy (D-17 AuthError).
- Same Remember-me behavior (D-05/D-06).
- "Esqueci senha" link — RH users also recover via email (goes to `/auth/esqueci-senha?tipo=rh` if the current query-param routing pattern is kept; the planner may simplify to a single route — not a UI-SPEC concern).

---

## AuthError.code → UI Mapping

One row per D-17 error code. Client-side `authService` returns `AuthError { code, message, field?, retryAfterSeconds? }`; the UI layer maps via a `FIELD_TO_AUTH_ERROR_MESSAGE` (analogous to Phase 2 `FIELD_TO_STEP_*`).

| error_code | Trigger | Inline UI | Sonner Toast | Focus / Action after dismiss |
|------------|---------|-----------|--------------|------------------------------|
| `INVALID_CREDENTIALS` | Wrong email OR wrong password | None (generic — D-01) | `error` · `Email ou senha inválidos. Verifique os dados e tente novamente.` · 6000ms | Focus `senha` field |
| `EMAIL_NOT_CONFIRMED` | `signInWithPassword` returned `error.code === 'email_not_confirmed'` | Amber info block below submit with `Reenviar email de confirmação` CTA | `error` · `Confirme seu email antes de fazer login.` · 6000ms | Scroll the amber block into view |
| `RATE_LIMITED` | Supabase returned 429 with `Retry-After`, or EF rate-limit branch | Amber info block below submit with live countdown | `warning` · `Muitas tentativas. Tente novamente em {N}s.` · 5000ms | Button disabled for {retryAfterSeconds}s |
| `NETWORK_ERROR` | `supabase.auth.signInWithPassword` threw (no response) | None | `error` · `Sem conexão com o servidor. Verifique sua internet.` · 6000ms · action `Tentar novamente` | Re-dispatch submit on action click |
| `SERVER_ERROR` | Supabase 5xx or unexpected `error.status` | None | `error` · `Algo deu errado. Tente novamente em alguns instantes.` · 6000ms · action `Tentar novamente` | Re-dispatch submit on action click |
| `UNKNOWN_ERROR` | Default / fallback | None | `error` · `Erro inesperado. Tente novamente.` · 6000ms | — |
| *(role mismatch — Login RH only)* | JWT role !== `administrador` after signIn success | None (user was signed in, then signed out) | `error` · `Esta conta não tem acesso ao painel RH.` · 6000ms | Form cleared; user stays on `/auth/login-rh` |

**Toast duration rule:** 6000ms for actionable errors (user needs to read + decide), 5000ms for transient warnings (rate-limit), 4000ms for neutral info (esqueci-senha success), 3000ms for quick-confirmations (login success). Phase 2 pattern extended.

**Toast position:** `top-center` on mobile, `bottom-right` on desktop — Phase 2 default preserved via `useFormToast` or direct Sonner calls.

---

## Copywriting Contract

Phase 3 microcopy catalog. pt-BR cordial tone. Never "teste psicológico" (not applicable here, reiterated for consistency).

| Element | Copy |
|---------|------|
| **Login Candidato** | |
| Page title (H1) | `Entrar` |
| Subtitle | `Acesse sua conta de candidato` |
| Email label | `Email` (+ red asterisk) |
| Email placeholder | `seu@email.com` |
| Senha label | `Senha` (+ red asterisk) |
| Senha placeholder | `Digite sua senha` |
| Lembrar-me label | `Lembrar-me` |
| Lembrar-me helper | `Manter sessão ativa ao fechar o navegador` |
| Forgot-password link | `Esqueci minha senha` |
| Primary CTA idle | `Entrar` |
| Primary CTA busy | `Entrando...` |
| Primary CTA cooldown | `Aguarde {N}s` |
| Success toast | `Login realizado com sucesso!` (duration 3000ms, no description) |
| Footer | `Não tem uma conta? Criar conta →` (links `/auth/inscricao`) |
| **Login RH** | |
| Page title (H1) | `Área RH` |
| Subtitle | `Acesse o painel interno` |
| Email placeholder | `seu.email@beautysmile.com.br` |
| Role mismatch toast | `Esta conta não tem acesso ao painel RH.` |
| (no footer) | — |
| **Esqueci Senha** | |
| Page title (H1) | `Recuperar senha` |
| Subtitle | `Informe seu email cadastrado e enviaremos um link para você criar uma nova senha.` |
| Email label | `Email` (+ red asterisk) |
| Email placeholder | `seu@email.com` |
| Primary CTA idle | `Enviar instruções` |
| Primary CTA busy | `Enviando...` |
| Voltar link | `Voltar ao login` (with `<ArrowLeft>`) |
| Post-submit heading (H2) | `Verifique seu email` |
| Post-submit body | `Se o email estiver cadastrado, enviamos um link de recuperação. Verifique sua caixa de entrada (e spam).` |
| Post-submit callout | `O link expira em 1 hora.` |
| Post-submit primary CTA | `Voltar ao login` |
| Post-submit secondary | `Usar outro email` |
| Post-submit Sonner toast | `Se o email existir, o link de recuperação foi enviado.` (info variant, 4000ms) |
| **Redefinir Senha** | |
| Validating state copy | `Validando seu link...` |
| Invalid-link heading (H2) | `Link inválido ou expirado` |
| Invalid-link body | `Este link de recuperação não é mais válido. Solicite um novo link para continuar.` |
| Invalid-link callout | `Links de recuperação expiram em 1 hora por segurança.` |
| Invalid-link primary CTA | `Solicitar novo link` |
| Invalid-link secondary | `Voltar ao login` |
| Form heading (H1) | `Nova senha` |
| Form subtitle | `Escolha uma senha segura para continuar acessando sua conta.` |
| Nova senha label | `Nova senha` (+ red asterisk) |
| Nova senha placeholder | `Digite a nova senha` |
| Nova senha helper | `Mínimo 8 caracteres, incluindo maiúscula, minúscula e número.` |
| Confirmar nova senha label | `Confirmar nova senha` (+ red asterisk) |
| Confirmar nova senha placeholder | `Digite novamente a nova senha` |
| Primary CTA idle | `Redefinir senha` |
| Primary CTA busy | `Alterando...` |
| Success toast (auto-login OK) | `Senha alterada com sucesso.` (success variant, 4000ms) |
| Success toast (auto-login failed) | `Senha alterada. Faça login para continuar.` (success variant, 5000ms) |
| **Shared error toasts** | |
| INVALID_CREDENTIALS | `Email ou senha inválidos. Verifique os dados e tente novamente.` |
| EMAIL_NOT_CONFIRMED (toast) | `Confirme seu email antes de fazer login.` |
| EMAIL_NOT_CONFIRMED (block copy) | `Confirme seu email antes de fazer login. Verifique sua caixa de entrada e spam.` |
| EMAIL_NOT_CONFIRMED (resend CTA) | `Reenviar email de confirmação` |
| EMAIL_NOT_CONFIRMED (resend success) | `Email reenviado. Verifique sua caixa de entrada (e spam).` |
| RATE_LIMITED | `Muitas tentativas. Tente novamente em {N}s.` |
| NETWORK_ERROR | `Sem conexão com o servidor. Verifique sua internet.` |
| NETWORK_ERROR action | `Tentar novamente` |
| SERVER_ERROR | `Algo deu errado. Tente novamente em alguns instantes.` |
| UNKNOWN_ERROR | `Erro inesperado. Tente novamente.` |
| **Password toggle** | |
| Mostrar senha | `aria-label="Mostrar senha"` |
| Ocultar senha | `aria-label="Ocultar senha"` |
| **Destructive actions** | N/A (Phase 3 has no destructive actions; password reset is constructive) |

### Tone rules

- Always use `você` / `seu(s)/sua(s)` — never `o usuário`, never tuteamento.
- Periods at the end of full-sentence copy (help text, body paragraphs). Button labels and section headings have NO trailing period.
- Error messages start with the problem noun ("Email...", "Senha...", "Sem conexão..."), not with "Erro ao..." or "Falha ao...". Phase 2 pattern.
- Never use exclamation marks in error copy. Reserve `!` for success confirmations only ("Login realizado com sucesso!").

---

## Accessibility Contract (HARD-04 alignment)

Carryover of Phase 2 a11y rules where applicable, plus login-specific additions.

### Keyboard

- **Tab order (each page):** Logo (non-focusable) → email → senha (login pages) / nova_senha → confirmar_nova_senha (redefinir) → Lembrar-me checkbox (login only) → Esqueci senha link (login only) → Primary CTA → Footer/secondary link(s).
- `Enter` inside any input submits the form (standard HTML behavior; keep it).
- Password visibility toggle is a `<button type="button">` — reachable via Tab, activates on Enter/Space, does NOT submit the form.
- Eye-toggle inside senha fields: Tab order places it AFTER the input it controls (standard DOM order with `absolute` positioning) — fine.

### Focus rings

- Global `outline-ring/50` from `globals.css` is already applied via `*` selector.
- Never `outline-none` without a visible replacement.
- Inputs: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` with ring color `var(--ring) === var(--brand-primary)`.
- Buttons: 2px solid ring, brand-primary, with 2px offset.
- Links ("Esqueci senha", "Voltar ao login"): 2px outline on focus (no ring — outline is clearer on text).

### Labels

- Every input has a visible `<Label htmlFor={id}>` above it. No placeholder-only.
- Required fields get a visible red asterisk `*` via `<span aria-hidden="true">*</span>` inside the Label + `aria-required="true"` on the input.
- Password visibility toggle `<button>` has `aria-label="Mostrar senha" | "Ocultar senha"` (dynamic).

### ARIA live regions

- Inline form errors: `<p role="alert" aria-live="assertive">` — announces immediately on display.
- Email-not-confirmed block and Rate-limit cooldown block: `role="alert" aria-live="polite"` — polite so the Sonner toast (which fires first, `assertive`) isn't doubled up.
- Sonner toasts: already `aria-live="polite"` by default (Phase 2 Sonner `resolve.dedupe` fix preserves this).
- Validating-link spinner state: `aria-live="polite"` on the `<p>` with "Validando seu link..." — announces once when mount completes.
- Login success → page transition: authStore change triggers route guard redirect; no explicit announcement needed (Supabase auth state changes typically < 100ms).

### Touch targets (iPhone 12 Pro baseline)

- All interactive elements: min **44×44px** hit area.
- Apply `touch-manipulation` CSS to buttons that are close to each other to kill 300ms tap delay.
- Eye-toggle: padded via `p-2 -m-2` (see § Eye-toggle button spec).
- Secondary text links ("Esqueci senha", "Voltar ao login", "Usar outro email"): `py-2` for vertical padding.
- Checkbox + label: wrap both in a clickable row; min-h-11.

### Color contrast (WCAG AA)

Inherited from Phase 2 UI-SPEC § Color Contrast:

- White text on `#00109E` brand-primary bg: 13.8:1 — AAA.
- White text on `bg-white/10` glass: ≥ 7:1 effective — AA easily.
- `text-white/90` on glass: borderline — keep ONLY for page subtitle (`text-base`, where the ≥18px or bold rule reaches AA); never for `text-sm`.
- `text-white/80` on glass for secondary links: acceptable ONLY because link has underline affordance + hover:text-white.
- `text-red-400` (#F87171) on glass: ~4.6:1 — AA.
- `text-green-400` (#4ADE80) on glass: ~6.2:1 — AA.
- `text-amber-400` (#FBBF24) on glass: ~5.1:1 — AA.

### Reduced motion

Respect `prefers-reduced-motion: reduce`:

- `animate-spin` on `Loader2` → replace with `opacity pulse` via CSS (or accept spin but tone down speed via media query — tokenize as `--duration-spin: 800ms` inside the media query).
- `animate-fadeIn` on cooldown/error blocks → disable (just render with full opacity from frame 0).
- `active:scale-[0.98]` on buttons → disable.

Already applied at the `globals.css` level in Phase 2 — Phase 3 inherits. Do not add `animate-*` classes without a reduced-motion fallback.

### Screen reader specific

- `<main aria-label="Autenticação">` at the page root.
- `<form aria-label="Formulário de login">` / `Formulário de recuperação de senha` / `Formulário de nova senha`.
- Invisible `<h1 className="sr-only">` only needed if the visible H1 is not programmatically the first heading — not the case here, so no `sr-only` heading.
- Password strength helper caption is plain body text — SR reads it on focus entry. No `aria-describedby` wiring needed beyond the existing error association.

---

## Responsive Breakpoints

Mobile-first. iPhone 12 Pro (390×844) is the baseline. Target also: iPhone SE (375×667) must not break.

| Breakpoint | Width | Tailwind | Layout |
|------------|-------|----------|--------|
| Mobile (baseline) | 375-639px | default | Single column, full-width fields, logo-card-footer vertical stack, `px-4` gutter |
| `sm` | 640px+ | `sm:` | Card padding bumps `p-6 → p-8`; Lembrar-me row layout stays horizontal |
| `md` | 768px+ | `md:` | No meaningful change — auth cards don't benefit from 2-col |
| `lg` | 1024px+ | `lg:` | Card stays `max-w-md` (448px) centered; wider viewport just shows more gradient background |

### Form width

- Container: `w-full max-w-md mx-auto`.
- Horizontal padding inside container: handled by GlassCard (`p-6 sm:p-8`).
- Outer page gutter: `px-4 py-12` (16px horizontal / 48px vertical floor).

### Button width

- Always `w-full` in Phase 3 auth pages. Center alignment + single column benefits from full-width CTAs (Apple, Google, Stripe, Vercel, Supabase, Linear all converge on this).

### No horizontal scroll

Test at 375px width (iPhone SE viewport, often used in Playwright mobile emulation):
- `GlassCard` fits within `max-w-md` (448px) but scales via `w-full` — caps at viewport - 32px.
- No `white-space: nowrap` on error copy. Let it wrap.
- Long email addresses in success card: `break-all` on any `<p>` that might render user input. (Applies to the current EsqueciSenha scaffold's `{emailValue}` display — which we're removing anyway.)

---

## Design Tokens Referenced

All styling in Phase 3 MUST use these tokens. Never hardcode colors/sizes outside this list.

### From `globals.css` (CSS variables)

| Token | Value | Used for |
|-------|-------|----------|
| `--brand-primary` | `#00109E` | Primary CTA button, checkbox-checked fill, focus ring |
| `--semantic-error` | `#EF4444` | Error icon container fill (at 20% opacity), never raw |
| `--semantic-success` | `#10B981` | Success icon container fill (at 20% opacity), never raw |
| `--text-xs` | 12px | Policy caption, helper text, helper under checkbox |
| `--text-sm` | 14px | Labels, inline errors, success hints, secondary links, subtitle |
| `--text-base` | 16px | Input text (iOS zoom-prevention), primary button labels, body copy |
| `--text-xl` | 20px | Post-submit state headings (H2) |
| `--text-2xl` | 24px | Page headings (H1) |
| `--font-weight-normal` | 400 | Body, helper, inline errors, description paragraphs |
| `--font-weight-semibold` | 600 | Labels, button labels, H1, H2, checkbox labels |
| `--radius` | 8px | Input, button, inline error/success blocks |
| `--radius-lg` | 12px | GlassCard outer, rounded icon containers |
| `--spacing-1/2/4/6/8` | 4/8/16/24/32px | Gaps, padding |
| `--duration-200` | 200ms | Hover transitions, fadeIn animations |
| `--ring` | `var(--brand-primary)` | Focus ring color |

**Forbidden:** consumption of `--font-weight-medium` (500) or `--font-weight-bold` (700) — Dim4 contract carried from Phase 2.

### From Tailwind (derived)

- Glass bg: `bg-white/10 backdrop-blur-lg`
- Glass border: `border-white/20` or `border-white/30`
- Glass input: `bg-white/20 border-white/30 text-white placeholder:text-white/50`
- Error tint: `text-red-400`, `bg-red-500/10`, `border-red-400/30`
- Success tint: `text-green-400`, `bg-green-500/10`, `border-green-400/30`
- Warning tint: `text-amber-400`, `bg-amber-500/10`, `border-amber-400/30`
- Info tint: `text-blue-400`, `bg-blue-500/10`, `border-blue-400/30` (sparingly — currently reserved for Phase 2 LGPD; Phase 3 uses amber for transient warnings)

### Forbidden in Phase 3

- Any new hex color not already in `globals.css :root`.
- Any font size outside the 12/14/16/20/24 scale.
- Any font weight other than 400 and 600.
- Any `font-medium` or `font-bold` utility in the new auth surfaces (`src/features/auth/**` and the 4 edited page files).
- Any spacing outside multiples of 4 (except 40/44px touch target — declared exceptions).
- Any `border-radius` outside the `--radius*` scale.
- Drop shadows beyond `drop-shadow-lg` and `drop-shadow-md` (both Phase 2 defaults).
- Hardcoded `[40px]` font size (currently in LoginCandidatoPage + EsqueciSenhaPage scaffold — REMOVE).
- `active:scale-95` → use `active:scale-[0.98]` for consistency.
- Marketing copy blocks ("Conexão Segura", "criptografia de ponta a ponta") — remove.
- "Debug token: XXX..." footer on RedefinirSenhaPage — remove.
- "📧", "✅", "💡" emojis in body copy (currently in scaffolds) — remove. Use lucide icons instead.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| *(none — shadcn/ui primitives are locally vendored in `src/components/ui/`; no `components.json`, no `npx shadcn add` invocations planned for Phase 3)* | N/A | N/A |

**Statement:** Phase 3 does not introduce any new component from any external registry. All primitives used (`Button`, `Input`, `Label`, `Checkbox`, `Alert`, `Form`, GlassCard, BackgroundImage, BeautySmileLogo) already exist in the project. No install-time or build-time third-party content is fetched.

---

## Divergence from Phase 2 UI-SPEC (Explicit List)

Auditable list of where Phase 3 intentionally deviates from Phase 2 patterns, each with a justification:

| Deviation | Phase 2 | Phase 3 | Justification |
|-----------|---------|---------|---------------|
| Card max-width | `max-w-4xl` (896px) | `max-w-md` (448px) | Login has 2-3 fields; multi-step cadastro needs 2-col fields. Industry convention for auth cards is 400-480px. |
| Warning color | `text-blue-400` / `bg-blue-500/10` (LGPD info) | `text-amber-400` / `bg-amber-500/10` (rate-limit, email-not-confirmed) | Blue is reserved Phase 2 for LGPD info. Amber disambiguates transient-warning from persistent-info. Both pass WCAG AA. |
| Post-success navigation delay | `navigate` immediate after success toast | `navigate` immediate after success toast | **Same** — consistency maintained. Current scaffolds use `setTimeout(1000)` / 3s countdown which Phase 3 REMOVES. |
| Submit action pattern | "Criar conta" + `<Check>` right icon | "Entrar" / "Enviar instruções" / "Redefinir senha" + `<ArrowRight>` right icon | `Check` implies completion of multi-step flow; `ArrowRight` implies forward-motion for single-step auth. Both use `Loader2` left icon when busy. |
| Error copy ending with period | Yes (Phase 2 pattern) | Yes (carryover) | Consistency. |
| "Lembrar-me" checkbox default | N/A (no equivalent) | `defaultChecked={true}` | D-05 explicit. |
| Password strength visual | N/A (cadastro has silent Zod only) | Silent Zod only (D-11) | Same policy — carryover. |

All other Phase 2 UI-SPEC contracts (error toast duration, Sonner position, Dim4 typography, spacing scale, accessibility contract, glass UI tokens) are **inherited unchanged**.

---

## Decisions Pre-Populated From Upstream

| Source | Decisions Used |
|--------|---------------|
| CONTEXT.md (03) | 21 (D-01 → D-21 — all login error taxonomy, Lembrar-me storage, reset flow, carryover scope, discretion markers) |
| CONTEXT.md (02) | 6 (tryAutoLogin pattern D-02, error_code taxonomy D-05, field routing D-06, pt-BR redaction D-07, Pitfall 7 redaction D-12, Sonner unversioned imports from 02-06) |
| UI-SPEC (02) | 12 (spacing scale, typography Dim4, glass tokens, a11y contract, Sonner position/duration rules, focus rings, touch targets, color contrast, accent-reserved list, forbidden tokens, no-HorizontalScroll rule, iPhone 12 Pro floor) |
| REQUIREMENTS.md | 4 (AUTH-01 clear error messages, AUTH-02 Lembrar-me affordance, AUTH-03 email link 1h expiry, AUTH-04 redefinição deeplink) |
| ROADMAP.md §Phase 3 | 3 (success criteria: login+errors, persistent session, email recovery end-to-end) |
| PROJECT.md / CLAUDE.md | 4 (pt-BR cordial, no "teste psicológico" language, no `supabaseAdmin` in UI, Sonner `resolve.dedupe`) |
| Existing scaffolds (`src/components/pages/*`) | Baseline structure, routes, GlassCard + BackgroundImage + BeautySmileLogo imports preserved |
| User input this session | 0 (upstream artifacts answered all required questions — CONTEXT.md D-21 explicitly delegated layout details to this document, which is now resolved) |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — CTA verbs ("Entrar", "Enviar instruções", "Redefinir senha", "Reenviar email de confirmação"), error copy cordial pt-BR starting with problem noun, post-submit neutral copy (D-09) for esqueci-senha, destructive confirmations N/A (no destructive actions in Phase 3)
- [ ] Dimension 2 Visuals: PASS — 11 lucide icons enumerated, glass UI consistent with Phase 2, four distinct semantic color roles clearly reserved
- [ ] Dimension 3 Color: PASS — 60 brand-primary / 30 glass-white / 10 accent (primary CTA + Lembrar-me checkbox-checked + inline accent links only), destructive red for errors only, amber for transient warnings (rate-limit, email-not-confirmed), green for success
- [ ] Dimension 4 Typography: PASS — **4 sizes (12/14/16/20-24px) and 2 weights (400/600)** — Dimension 4 compliant. Removes `text-[40px] font-bold` from scaffolds. Removes `font-medium` from success-state emailValue display.
- [ ] Dimension 5 Spacing: PASS — all values multiples of 4 except 40px/44px touch targets (declared exceptions)
- [ ] Dimension 6 Registry Safety: PASS — no external registries; all primitives locally vendored

**Approval:** pending

---

## Open Questions for Planner

These bubble up to `/gsd-plan-phase 3` — not UI decisions, but wiring consequences of this contract:

1. **D-19 storage swap strategy (CONTEXT discretion):** Lembrar-me checkbox controls localStorage ↔ sessionStorage. Three options enumerated in CONTEXT.md. UI-SPEC does not constrain — checkbox visual is identical regardless of storage mechanism. Planner decides.
2. **D-20 JWT decode library (CONTEXT discretion):** Bug 1 fix needs JWT payload decode. `jwt-decode` vs manual base64. UI-SPEC agnostic — no UI surface exposes the JWT contents. Planner decides.
3. **`authService` file location:** currently `src/features/cadastro/services/authService.ts` from Phase 2 (thin — just `tryAutoLogin`). Phase 3 needs a full auth service. Planner decides: move to `src/features/auth/services/authService.ts` (recommended; CONTEXT.md `code_context` hints this direction) or add parallel file.
4. **Shared password Zod schema:** Phase 3 reset-senha uses the same regex as Phase 2 cadastro senha. Planner decides: extract to `src/schemas/passwordSchema.ts` vs duplicate.
5. **"Esqueci senha?tipo=rh" query-param routing:** current scaffold uses `?tipo=rh` to theme and redirect the recovery page for admin users. Planner decides whether to keep the RH/candidato dual-surface on a single route or split into two routes. UI-SPEC is agnostic; the card shell is identical for both.
6. **Remove obsolete services:** the current RedefinirSenhaPage imports `rateLimitService`, `logAccessService`, `userTypeDetectionService`, `passwordChangeConfirmationService`, `errorHandlingService`, `securityValidationService`. Planner must audit which are still needed in Phase 3 vs deleted/deferred to Phase 5. Audit finding will feed into file-deletion tasks.
7. **Scaffold cleanup scope:** UI-SPEC requires removing `text-[40px]`, `font-bold`, `font-medium`, debug-token footer, help/contact side panel, emoji bullets, 3-second countdown. Planner includes as explicit tasks in the wiring plan. Recommend a dedicated "Phase 3 scaffold polish" task separate from business-logic wiring tasks to keep diff reviewable.
8. **"Esqueci minha senha" label swap:** current login-candidato scaffold shows `"Esqueceu a senha?"`, login-rh shows `"Esqueci a senha"`. Phase 3 standardizes both to `"Esqueci minha senha"` (first-person cordial — matches cadastro's first-person pt-BR throughout).

---

*Written: 2026-04-24 by gsd-ui-researcher*
*Phase: 03-login-recuperacao-senha*
*Depends on: 02-UI-SPEC.md (Dim4 typography, spacing, a11y, Sonner position, glass tokens, accent-reserved policy)*
