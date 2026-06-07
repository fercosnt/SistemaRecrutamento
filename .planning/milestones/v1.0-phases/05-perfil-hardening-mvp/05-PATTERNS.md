# Phase 5: Perfil + Hardening MVP - Pattern Map

**Mapped:** 2026-06-06
**Files analyzed:** 16 (4 NEW, 10 MODIFY, 2 VERIFY)
**Analogs found:** 13 / 16 (3 net-new infra files have no in-repo analog)

> Read-only mapping. All paths absolute-relative to repo root
> `/Users/fernando/Cursor Repo/DB Sistema de recrutamento/`.
> **Verification status:** every claim in the upstream context block was confirmed by
> direct grep/read. Notable confirmations: env vars are `VITE_SUPABASE_URL` /
> `VITE_SUPABASE_ANON_KEY` (resolves RESEARCH A1); `GlassButton` lives **inside**
> `src/components/ui/glass.tsx` (not a standalone file); the token break is real
> (config wraps every color in `hsl(var(--x))`, globals.css defines them all as hex);
> perfil page wires real `useCandidato()` + `useCandidaturas()` (no mock import);
> bare `<input>` at `MeuPerfilCandidatoPage.tsx:329`; `.github/` and `lighthouserc.js`
> do not exist.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| NEW `e2e/perfil.spec.ts` | test (E2E) | request-response (auth-gated read) | `e2e/candidatura-submit.spec.ts` (env-gated login + Tier-2) + `e2e/login-flow.spec.ts` (mock route) | exact (role+flow) |
| NEW `e2e/a11y.spec.ts` | test (E2E/a11y) | request-response (per-route scan) | `e2e/login-flow.spec.ts` unconditional block (route loop, `@playwright/test` import) | role-match (new `AxeBuilder` dep) |
| NEW `.github/workflows/ci.yml` | config (CI) | batch (pipeline) | **none in repo** — net-new | no analog |
| NEW `lighthouserc.js` | config (perf budget) | batch | **none in repo** — net-new | no analog |
| MODIFY `src/components/ui/input.tsx` | component (primitive) | request-response (form input) | self — already token-driven (`text-foreground`, `bg-input-background`) | exact (fix in place) |
| MODIFY `src/components/ui/select.tsx` | component (primitive) | request-response (form select) | self + cadastro known-good glass-input styling | exact (fix in place) |
| MODIFY `src/components/ui/glass.tsx` (`GlassButton`) | component (primitive) | event-driven (click) | self — `GlassButton` forwardRef at line 147 | exact (D-14 inline-flex fix) |
| MODIFY `src/components/BeautySmileLogo.tsx` | component | transform (render) | self — `BeautySmileLogoProps` at line 3 | exact (D-14 type union) |
| MODIFY `src/styles/globals.css` | config (design tokens) | transform (CSS var resolution) | self — `:root` token block lines 6–66 | exact (D-07 channel-triplet rewrite) |
| MODIFY `tailwind.config.js` | config | transform (build) | self — `colors` block lines 15–56 | exact (no change if triplet path) |
| MODIFY `src/App.tsx` | provider (root) | event-driven | `src/features/cadastro/components/ErrorBoundary.tsx` (the component to hoist) | exact (D-09 mount) |
| VERIFY `src/components/pages/MeuPerfilCandidatoPage.tsx` | component (page) | CRUD (read) | self — wires `useCandidaturas()` line 25 | exact (D-01 verify+polish) |
| MODIFY `e2e/job-application-flow.spec.ts` | test | — | **delete** (D-04 legacy prune) | — |
| NEW `supabase/migrations/2026XXXX_vaga_status_sync.sql` (D-13 F-04-08-B) | migration | batch (DDL+backfill) | `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql` | exact (DO-block + repair pattern) |
| NEW `supabase/migrations/2026XXXX_bloco_valido_reconcile.sql` (D-13 F-04-08-C) | migration | batch (DDL reconcile) | same migration analog | exact |
| MODIFY (D-15 carve-out) `src/features/auth/services/passwordService.ts` + `RedefinirSenhaPage.tsx` + `useRecoverySession.ts` + `redefinirSenhaSchema.ts` + `EsqueciSenhaPage.tsx` + `e2e/password-recovery-flow.spec.ts` | service/component/hook/schema/test | request-response (OTP verify) | self (existing PKCE flow) + `input-otp@1.4.2` primitive | role-match (flow swap) |

---

## Pattern Assignments

### NEW `e2e/perfil.spec.ts` (test, auth-gated read) — PERF-01/02, D-01

**Analog:** `e2e/candidatura-submit.spec.ts` (Tier-2 env-gated structure) + `e2e/login-flow.spec.ts` (Tier-1 mock route).

**Tier-1 mock pattern — copy from `e2e/login-flow.spec.ts:640-666`** (deterministic, runs unconditionally in CI; the perfil E2E can mock the candidaturas SELECT the same way auth is mocked):
```ts
// makeJwt — decode-valid (NOT signature-verifiable) JWT for mocked auth.
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-signature-not-verified`
}
// ...
await page.route('**/auth/v1/token?grant_type=password', (route) => {
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    access_token: candidateJwt, refresh_token: 'fake-refresh', expires_in: 3600,
    token_type: 'bearer', user: { id: 'test-uuid', email: 'test@x.com', app_metadata: { provider: 'email' } },
  }) })
})
```

**RHF onBlur + #id-locator pattern — copy from `e2e/login-flow.spec.ts:676-680`** (Pitfall 5: `.fill()` alone does not flush `mode:'onBlur'`; `getByLabel` partial-matches the eye-toggle):
```ts
await page.locator('#email').fill('test@x.com')
await page.locator('#email').blur()
await page.locator('#password').fill('ValidPass123')
await page.locator('#password').blur()
await page.getByRole('button', { name: /^Entrar$/ }).click()
```

**Tier-2 env-gating pattern — copy from `e2e/candidatura-submit.spec.ts:58-61, 100-105`** (real-Supabase scenarios skip-with-reason, NOT fixme — satisfies D-04):
```ts
test.skip(!process.env.E2E_REAL_LOGIN, 'Requires E2E_REAL_LOGIN=1 (real auth round-trip is flaky without opt-in)')
// ... and for DB-writing variants:
test.skip(!process.env.E2E_ALLOW_DB_WRITE, 'DB-writing test — set E2E_ALLOW_DB_WRITE=1 to enable')
```

**TEST_USER + login helper — copy from `e2e/candidatura-submit.spec.ts:22-39`**:
```ts
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
  password: process.env.TEST_USER_PASSWORD || 'teste123',
}
async function login(page: Page) {
  await page.goto('/auth/login')
  await fillAndBlur(page, '#email', TEST_USER.email)
  await fillAndBlur(page, '#senha, #password', TEST_USER.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/candidato/, { timeout: 10000 })
}
```

**Sonner DOM contract assertion (if asserting a toast) — copy from `candidatura-submit.spec.ts:153-155`**:
```ts
const notificationsRegion = page.locator('section[aria-label*="Notifications"]')
await expect(notificationsRegion.locator('li[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 })
```

> Route under test: `/candidato/perfil` (confirmed `src/router/routes.tsx:144` → `MeuPerfilCandidatoPage`). Logout button asserted via `getByRole('button', { name: /sair/i })` per `login-flow.spec.ts:51` (HARD-05 reachability overlap).

---

### NEW `e2e/a11y.spec.ts` (test, per-route scan) — HARD-04, D-08

**Analog:** `e2e/login-flow.spec.ts` route-loop structure + new `@axe-core/playwright` dep.

**Core pattern (RESEARCH §Q4 verbatim; new dep `@axe-core/playwright@4.11.3`):**
```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const routes = ['/auth/login', '/auth/esqueci-senha', '/cadastro', '/vagas']

for (const route of routes) {
  test(`a11y: ${route} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
}
```

> Auth-gated routes (`/candidato/perfil`, candidatura form) covered via Tier-2 (reuse the `login()` helper + `E2E_REAL_LOGIN` gate from `perfil.spec.ts`) or manual axe run — do NOT block the unconditional public-route gate on them.
> For known-unfixable elements this phase, prefer `.exclude(selector)` with a tracking comment over disabling the gate (D-08 is a fix mandate).

---

### NEW `.github/workflows/ci.yml` (config, CI pipeline) — HARD-01, D-03/D-05

**Analog:** NONE in repo (`.github/` does not exist — verified). Use RESEARCH §Q1 + §Q2 YAML verbatim as the source pattern.

**Confirmed env-var names (resolves RESEARCH A1):** `src/lib/supabase/client.ts:19-20` reads `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`. The workflow `env:` block MUST use exactly these names:
```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
  E2E_AUTH_TEST_USERS: ''   # Tier-2 OFF by default → live specs skip-with-reason
```

**Lint gate (baseline-296 invariant):** the `unit` job MUST run `npm run lint` (= `tsc --noEmit`) — the 296 zero-growth invariant carried from Phase 4.1/4.2 is enforced here. Lint failure = CI red.

**Playwright project flag:** default CI run is `npx playwright test --project=chromium` (chromium project confirmed `playwright.config.ts:71`; mobile-chrome/tablet exist for manual/UAT).

> `playwright.config.ts:88` `webServer.command` is `npm run dev` (port 3003, `baseURL: http://localhost:3003`) with `reuseExistingServer: !process.env.CI`. The E2E job uses this as-is. LHCI is a SEPARATE job against `vite preview` (port 4173) — do not merge them.
> service_role (`TEST_SUPABASE_SERVICE_ROLE_KEY`) lives ONLY in a CI seed-step process env, NEVER `VITE_`-prefixed (CLAUDE.md hard rule / Pitfall 2).

---

### NEW `lighthouserc.js` (config, perf budget) — HARD-02, D-05/D-06

**Analog:** NONE in repo. Use RESEARCH §Q2 config verbatim.

**Key constraints (verified against codebase):** Vite outDir is `build/`, dev port 3003, `vite preview` default 4173. LHCI must audit the production build (`npm run build` → `npm run preview`), URLs on **4173**. `minScore: 0.8` = ">80"; mobile is the default preset (no flag). `aggregationMethod: 'optimistic'` reduces runner-jitter flake.

**Measure-first gate (D-06):** structure the N+1 fix (`vagasService.enriquecerVaga`) as a CONDITIONAL task — only act if `/vagas` Performance comes in < 0.8. If it passes, D-17 stays deferred (no premature optimization).

> Recommend public-routes-only budget (login, cadastro, vagas) — `/candidato/perfil` is auth-gated; auditing it needs an LHCI puppeteer login script (brittle). Perfil perf covered by D-01 manual smoke.

---

### MODIFY `src/components/ui/input.tsx` (primitive) — D-02, D-08

**Analog:** self (already token-driven) + the cadastro form's known-good glass-input styling (F-04.1-C: "copiar o mesmo design do formulario de cadastro").

**Current state (the whole file — `input.tsx:1-26`):**
```tsx
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref} type={type} data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground ... border-input ... bg-input-background ...",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  )
)
```

> **Why this is the root-cause site (D-02):** Input already references semantic tokens `text-foreground`, `bg-input-background`, `border-input`, `placeholder:text-muted-foreground`, `text-primary`. These tokens are **broken** until D-07 lands (config emits `hsl(#hex)` → invalid → transparent/black). So D-02 (primitive) and D-07 (token) MUST land in the SAME wave (RESEARCH §Q5 confirms). After the token fix, this primitive renders correctly without per-consumer hex patches. The dark-font-on-dark-glass defects (F-04.1-A/C, F-04-08-G) collapse once tokens resolve + `text-foreground` reads the correct channel value.

---

### MODIFY `src/components/ui/select.tsx` (primitive) — D-02, D-08

**Analog:** self. The `SelectTrigger` (line 38) is the F-04.1-A "dropdown initial text dark-on-dark" culprit.

**Current SelectTrigger className (`select.tsx:51-57`) — the dark-on-dark + hostile-override site:**
```ts
"border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground ... bg-input-background px-3 py-2 text-sm ...",
// hover overrides that fight the resting state:
"hover:bg-white/25 hover:backdrop-blur-lg hover:border-white/40 ...",
"hover:text-white [&_*]:hover:text-white [&_*]:hover:!text-white",
```

> **D-02 fix target:** the resting (non-hover) text color resolves to a broken/dark token while the glass background is dark → invisible until hover flips everything to white. The `[&_*]:hover:!text-white` `!important` cascade is a workaround that masks the real token break. Fix at the primitive: resting `data-[placeholder]:text-muted-foreground` + value text must resolve to a contrast-safe channel once D-07 lands; then the heavy hover `!important` overrides can be simplified. Pair with the contrast pass (F-04-08-G / D-08).

---

### MODIFY `src/components/ui/glass.tsx` — `GlassButton` (primitive) — D-14

**Analog:** self. `GlassButton` forwardRef at `glass.tsx:147-192`.

**Current className (`glass.tsx:168-185`) — the inline-flex defect:**
```tsx
className={cn(
  props.blur ? blurVariants[props.blur] : blurVariants.md,
  'backdrop-saturate-150',
  !props.opacity && (props.variant ? variantStyles[props.variant] : variantStyles.white),
  props.border !== false && 'border',
  'rounded-xl shadow-lg',
  'px-6 py-3 cursor-pointer',          // ← no inline-flex / items-center / justify-center
  'hover:bg-white/20 active:scale-95',
  'transition-all duration-200',
  disabled && 'opacity-50 cursor-not-allowed',
  className
)}
```

> **D-14 fix:** add `'inline-flex items-center justify-center gap-2'` to the base classes so buttons with an icon + text child center/align correctly (matches the shadcn `Button` primitive convention). Single-line primitive change; cascades to all 9 `GlassButton` consumers (`MeuPerfilCandidatoPage`, `VagasPublicasPage`, `QuestionarioPage`, `KanbanBoard`, `RichTextEditor`, `UpdateStatusModal`, examples). No per-consumer patch.

---

### MODIFY `src/components/BeautySmileLogo.tsx` — D-14 (type union)

**Analog:** self. `BeautySmileLogoProps` at `BeautySmileLogo.tsx:3-7`:
```tsx
interface BeautySmileLogoProps {
  className?: string;
  variant?: 'primary' | 'white' | 'accent' | 'secondary';
  type?: 'icon' | 'horizontal' | 'vertical';
}
```
> **D-14:** reconcile/widen the `type`/`variant` union per the deferred WR review item (the call sites pass a value not in the current union, or a missing variant). Confirm the exact missing member from the WR-01-09/WR-02-09 ledger during planning; the fix is a one-line union extension here.

---

### MODIFY `src/styles/globals.css` (design tokens) — D-07/D-26

**Analog:** self. `:root` semantic token block lines 45–66.

**Current (broken) — `globals.css:46-65`:**
```css
--background: #ffffff;             /* config wraps as hsl(var(--background)) → hsl(#ffffff) INVALID */
--foreground: var(--neutral-900);  /* → hsl(#2D2E30) INVALID */
--primary: var(--brand-primary);   /* → hsl(#00109E) INVALID — the surfaced bug */
--primary-foreground: #ffffff;
--secondary: var(--brand-secondary);
--muted: var(--neutral-100);
--muted-foreground: var(--neutral-600);
--accent: var(--brand-accent);
--destructive: var(--semantic-error);
--border: var(--neutral-200);
--input: var(--neutral-300);
--input-background: var(--neutral-white);
--ring: var(--brand-primary);
```

**Fix pattern (RESEARCH §Q5 — channel-triplet conversion, the recommended path):**
```css
/* keep raw hex palette (--brand-*, --neutral-*) for direct-hex consumers;
   DECOUPLE the semantic tokens and define them as HSL channel triplets: */
--background: 0 0% 100%;            /* #ffffff */
--foreground: 220 3% 19%;           /* #2D2E30 */
--primary: 234 100% 31%;           /* #00109E */
--primary-foreground: 0 0% 100%;
/* ...convert EVERY semantic token the config wraps in hsl(): background, foreground,
   card, popover, secondary, muted(+fg), accent(+fg), destructive(+fg), border,
   input, ring (+ chart-1..5 if referenced). Compute each triplet from current hex. */
```

> **CRITICAL (Pitfall 4):** convert the ENTIRE semantic block in ONE pass — `bg-primary` is not the only broken token; `bg-secondary/bg-muted/bg-accent/border-border/bg-card/bg-input-background` ALL currently emit `hsl(#hex)`. Channel-triplet path preserves opacity modifiers (`bg-primary/90`, relied on per D-25). Then sweep the **136** `bg-[#...]` hex literals back to semantic tokens — **candidate-facing pages only** this phase, file-by-file, smoke-runtime-gated. RH/M2 pages keep working hex literals.

---

### MODIFY `tailwind.config.js` — D-07

**Analog:** self. `colors` block lines 15–56 already wraps every token in `hsl(var(--x))`.
> **No change required** if the channel-triplet path is chosen (recommended). The config is already correct; globals.css is the wrong half. Do NOT drop the `hsl()` wrapper (would break opacity modifiers).

---

### MODIFY `src/App.tsx` (root) — HARD-03, D-09

**Analog (component to hoist):** `src/features/cadastro/components/ErrorBoundary.tsx` (full class component, `getDerivedStateFromError` + `componentDidCatch` + fallback UI + reset). A second `src/components/ErrorBoundary.tsx` also exists — **planner picks the canonical one**, deletes/re-exports the other.

**Mount site — `App.tsx:218-225` (`RootLayout` return):**
```tsx
return (
  <>
    <Outlet />
    {import.meta.env.DEV && <DevNavigationMenu />}   {/* HARD-06/D-10 gate — VERIFY-ONLY, confirmed present */}
    <Toaster position="top-right" />
  </>
)
```

**D-09 fix:** wrap the router/app root in the hoisted `<ErrorBoundary>`. Two viable mount points: (a) wrap `<Outlet />` inside `RootLayout`, or (b) wrap `<RouterProvider router={router} />` at the top-level `App` export. Prefer wrapping at the `RouterProvider`/app-export level so router-construction and provider errors are also caught. Import path: `@/features/cadastro/components/ErrorBoundary` (or the chosen canonical). The fallback UI uses hardcoded `bg-gradient-to-br from-[#00109E]` hex literals (`ErrorBoundary.tsx:146,192`) — leave as-is (it must render even if the token system is broken; this is the one place hex literals are correct).

> **HARD-06/D-10 (verify-only):** DevNav gate confirmed at `App.tsx:221`. Optionally add a Vitest/grep guard asserting `import.meta.env.DEV && <DevNavigationMenu` stays.

---

### VERIFY `src/components/pages/MeuPerfilCandidatoPage.tsx` (page) — PERF-01/02, D-01

**Analog:** self (760 LoC, confirmed). Real-data wiring verified:
```tsx
import { useAuthStore, useCandidato } from '@/store/authStore';      // line 12
import { useCandidaturas } from '@/features/vagas/hooks/useCandidaturas';  // line 14
const candidato = useCandidato();                                    // line 20
const { data: candidaturasData, isLoading: isLoadingCandidaturas } = useCandidaturas();  // line 25
```
> **No mock import** (grep confirmed). D-01 = verify-and-polish only: smoke-runtime confirm real data renders, fix contrast (pairs with D-07/D-02), write the E2E. NO structural rework of listing or first-candidatura progresso block.
> **a11y/D-15 overlap (RESEARCH §Q3):** bare `<input>` at line 329 (also 529/558/587) is the change-password widget OUTSIDE a `<form>`. The OTP carve-out wave wraps it in `<form>` with `autocomplete='current-password'`/`'new-password'`.

---

### NEW migrations `supabase/migrations/*.sql` (D-13) — F-04-08-B + F-04-08-C

**Analog:** `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql` — the canonical idempotent-DDL pattern.

**Header + idempotent DO-block pattern to copy (`...constraint.sql:1-40`):**
```sql
-- =============================================================================
-- Migration: <name>  | Date: 2026-XX-XX | Phase: 05 | Requirement: D-13 / F-04-08-B
-- PURPOSE / COMPANION COMPONENTS / PRECONDITION (manual verify BEFORE applying)
-- NOTE: No explicit BEGIN; ... COMMIT; wrapper. The Supabase CLI driver wraps
--   each migration in its own implicit transaction; an outer BEGIN/COMMIT combined
--   with DO $$ ... END $$ breaks the prepared-statement boundary parser.
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS ( SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='...' ) THEN
    -- DDL here
  END IF;
END $$;
```

- **F-04-08-B:** CHECK constraint or BEFORE-UPDATE trigger forcing `status != 'ativa'` when `deleted_at IS NOT NULL`, + one-time backfill `UPDATE`. Include the precondition check (find existing drift first) like the analog does for duplicates.
- **F-04-08-C:** reconciliation migration re-declaring `bloco_valido_check` so migrations are source-of-truth (FOUND-09 invariant).

> **PL/pgSQL `db push` workaround is a HUMAN CHECKPOINT** (CLAUDE.md / D-22): `CREATE FUNCTION`/`DO $$...$$` + adjacent `COMMENT`/`GRANT`/`REVOKE` → SQLSTATE 42601 via `db push --linked`. Workaround: run SQL manually in SQL Editor → `supabase migration repair --status applied <version>` → confirm `db push` up-to-date → strip outer `BEGIN/COMMIT`.

---

### D-15 CARVE-OUT (sub-phase 5.1 / final wave) — PKCE→OTP recovery

**Analog:** the existing PKCE recovery flow (files verified present). This is a flow-swap, not a copy-from-analog. Blast radius per RESEARCH §Q3:

| File | Change | Pattern source |
|------|--------|----------------|
| `src/features/auth/services/passwordService.ts` | add `verifyRecoveryOtp(email, token)` wrapping `verifyOtp({type:'recovery'})` with existing `mapSupabaseError` + Pitfall-7 redaction (NEVER log token) | self — existing service error idiom |
| `src/components/pages/RedefinirSenhaPage.tsx` | add 6-digit code input before new-password fields | `src/components/ui/input-otp.tsx` (already installed, `input-otp@1.4.2`) |
| `src/components/pages/EsqueciSenhaPage.tsx` | carry email forward in router state; "we emailed a code" copy | self |
| `src/features/auth/hooks/useRecoverySession.ts` | replace 3-path PASSWORD_RECOVERY state machine with OTP-verify gate (largest behavioral change; may be retired) | self |
| `src/features/auth/schemas/redefinirSenhaSchema.ts` | add `token` (6-digit) field | self — existing Zod schema |
| `e2e/password-recovery-flow.spec.ts` | rewrite B9/B10/B12 around OTP entry; mock `/auth/v1/verify` via `page.route` (same mock idiom as `login-flow.spec.ts:654`) | `login-flow.spec.ts` route mock |
| `src/lib/supabase/client.ts` | **DO NOT** flip `flowType: 'pkce'` (line 56) — OTP recovery is flowType-independent (Pitfall 3) | — |

> Requires a Supabase Dashboard email-template edit (`{{ .Token }}`) + real-email UAT → **human checkpoint**. Atomic commits for bisect-friendly rollback. Carve into its own wave/sub-phase 5.1 if it balloons.

---

## Shared Patterns

### Playwright mock route (Tier-1 deterministic)
**Source:** `e2e/login-flow.spec.ts:640-666` (`makeJwt` + `page.route('**/auth/v1/token...')` + `route.fulfill`).
**Apply to:** `e2e/perfil.spec.ts`, `e2e/a11y.spec.ts` (for any auth-gated route), the rewritten `e2e/password-recovery-flow.spec.ts` (`/auth/v1/verify`). Runs unconditionally in CI with zero live-Supabase dependency — this IS the 100%-green core HARD-01 demands.

### Tier-2 env-gating (skip-with-reason)
**Source:** `e2e/candidatura-submit.spec.ts:58-61, 100-105` (`test.skip(!process.env.E2E_REAL_LOGIN, '...reason...')` + `E2E_ALLOW_DB_WRITE`).
**Apply to:** all new specs' real-Supabase/real-email scenarios. D-04: skipped-with-reason, NEVER silently fixme'd.

### RHF onBlur + #id locators (E2E)
**Source:** `e2e/login-flow.spec.ts:676-680` (`.fill()` then `.blur()`; `#id` not `getByLabel`).
**Apply to:** every new spec that fills a form (Pitfall 5). `getByLabel('Senha')` strict-mode-collides with the eye-toggle `aria-label`.

### Sonner DOM contract
**Source:** `e2e/candidatura-submit.spec.ts:153-155` + `login-flow.spec.ts:682` (`section[aria-label*="Notifications"]` / `getByLabel('Notifications alt+T')` → `li[data-sonner-toast]`).
**Apply to:** any new spec asserting a toast (Toaster mounted at `App.tsx:223`).

### Semantic-token primitives (the D-02↔D-07 coupling)
**Source:** `src/components/ui/input.tsx`, `src/components/ui/select.tsx` (already reference `text-foreground`, `bg-input-background`, `text-muted-foreground`, `border-input`).
**Apply to:** the design-system root-cause wave. Fix tokens in `globals.css` (D-07) FIRST, then the primitives render correctly — do NOT patch consumers per-page. Smoke-runtime each swept page (Pitfall 6 — autonomous green is insufficient; this exact bug class passed all Phase 4 gates).

### Idempotent migration + db-push workaround
**Source:** `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql` (header doc + `DO $$ ... IF NOT EXISTS ... END $$`; no outer BEGIN/COMMIT).
**Apply to:** both D-13 migrations. PL/pgSQL push is a human checkpoint (CLAUDE.md).

### Pitfall-7 secret/log hygiene
**Source:** CLAUDE.md security rules + existing `mapSupabaseError` idiom in `passwordService.ts`.
**Apply to:** `verifyRecoveryOtp` (NEVER log `token`); CI workflow (service_role NEVER `VITE_`-prefixed — Pitfall 2). Baseline-296 lint invariant enforced in the CI `unit` job.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.github/workflows/ci.yml` | config (CI) | batch | `.github/` does not exist — first-ever CI. Use RESEARCH §Q1 YAML verbatim. |
| `lighthouserc.js` | config (perf) | batch | No LHCI config in repo. Use RESEARCH §Q2 config verbatim. |
| `e2e/a11y.spec.ts` (axe portion) | test | per-route scan | `AxeBuilder` is a new dep (`@axe-core/playwright`); route-loop structure borrows from `login-flow.spec.ts` but the scan API has no in-repo precedent. |

---

## Metadata

**Analog search scope:** `e2e/`, `src/components/ui/`, `src/components/`, `src/components/pages/`, `src/features/cadastro/components/`, `src/features/auth/`, `src/styles/`, `src/lib/supabase/`, `supabase/migrations/`, `tailwind.config.js`, `playwright.config.ts`, `src/router/routes.tsx`.
**Files scanned (read/grep):** 13 source/test/config files + 4 directory listings.
**Verifications resolved:** RESEARCH A1 (env vars = `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` — confirmed `client.ts:19-20`); GlassButton location (`glass.tsx:147`, not standalone); token break (config `hsl(var(--x))` vs globals.css hex — confirmed); `.github/` + `lighthouserc.js` absent; perfil real-data wiring + bare-input line 329; DevNav gate `App.tsx:221`; chromium project `playwright.config.ts:71`; webServer port 3003 / preview 4173.
**Pattern extraction date:** 2026-06-06
