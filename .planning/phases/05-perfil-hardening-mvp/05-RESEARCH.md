# Phase 5: Perfil + Hardening MVP - Research

**Researched:** 2026-06-06
**Domain:** CI/CD (GitHub Actions + Playwright/Vitest against Supabase), Lighthouse CI, Supabase Auth recovery flow (PKCE → OTP), axe-core a11y, Tailwind/shadcn CSS-variable token repair
**Confidence:** HIGH (CI/LHCI/axe/OTP syntax verified against official docs + npm registry; codebase findings verified by direct grep/read)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** Perfil (PERF-01/02): **Verify + polish only.** Keep current `MeuPerfilCandidatoPage` layout. Confirm via smoke-runtime that real data renders (no mock), fix styling/contrast, write E2E. NO structural rework of listing or progresso UX.
- **D-02** Root-cause the "fonts black on dark glass" bug at the **shared primitive level** (shared input / shadcn Select / glass primitive), then sweep consumers. NO per-page patches. Lift cadastro's known-good glass-input styling.
- **D-03** Set up **REAL GitHub Actions CI** (`.github/workflows/*`) running Vitest + Playwright on push/PR — an actual green check, not a local runbook. Requires Supabase test-env + test-user secrets.
- **D-04** Prune legacy `e2e/job-application-flow.spec.ts` (PRD-0005 duplicate of `candidatura-submit.spec.ts`). Deterministic core (login + cadastro + candidatura) passes 100%. Real-email/live-Supabase scenarios stay **explicitly skipped-with-reason**, not silently fixme'd.
- **D-05** Automate Lighthouse in CI (LHCI) with >80 assertion budget (Performance + Accessibility) on key routes. Pairs with D-03.
- **D-06** **Measure-first** on perf fixes. Only fold D-17 (`vagasService.enriquecerVaga` N+1) IF Lighthouse Performance actually < 80. No premature optimization.
- **D-07** Repair `bg-primary` token (tailwind.config HSL-channel vs globals.css HEX mismatch) → then sweep hex-literal workarounds (`bg-[#00109E]`) back to semantic tokens. Pairs with D-02.
- **D-08** Full candidate-flow a11y audit + fix (labels / tab order / visible focus) across cadastro, login, recovery, vagas, candidatura, perfil.
- **D-09** HARD-03 — promote/hoist `ErrorBoundary` to App root.
- **D-10** HARD-06 — verify `DevNavigationMenu` DEV gating (already present at `App.tsx:221`); no change expected.
- **D-11** HARD-05 — manual iPhone 12 Pro viewport validation; confirm logout reachable.
- **D-12** Quick UX bugs: F-04.1-B (CEP "encontrado" toast loops via useEffect dep array) + F-04.1-E (422 transient on first `setNewPassword` → friendly retry toast).
- **D-13** DB hygiene migrations: F-04-08-B (vaga soft-deleted but `status='ativa'` → CHECK/trigger sync) + F-04-08-C (`bloco_valido_check` schema drift → reconciliation migration). PL/pgSQL `db push` workaround applies.
- **D-14** Code-review debt: WR-01-09 / WR-02-09 deferred items + GlassButton inline-flex primitive fix + BeautySmileLogo type union. Pairs with D-02.
- **D-15** PKCE→OTP recovery migration (D-16) — **heaviest single item; candidate to carve into its own plan/wave/sub-phase.**

### Claude's Discretion
- Exact wave/plan decomposition (expect several waves given phase size).
- Which specific routes get LHCI budgets and a11y audit depth per route.
- Internal structure of the glass-input primitive fix and token sweep.

### Deferred Ideas (OUT OF SCOPE)
- **None pushed to M2 backlog.** All four backlog buckets (D-12/13/14/15) deliberately folded into Phase 5 ("close M1 clean").
- Carve-out candidate (not deferred, flagged): **D-15/D-16 PKCE→OTP** — split into its own plan/wave/sub-phase if it balloons.
- Per-candidatura progresso UX (vs current first-candidatura-only block) — OUT for M1 (D-01); future M2+ enhancement.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-01 | Listagem de candidaturas do candidato com status + etapa + data (dados reais, sem mock) | Already implemented — `MeuPerfilCandidatoPage.tsx` wires `useCandidaturas()` (verified: no mock import). Verify-and-polish + E2E only (§Q-PERF). |
| PERF-02 | Página de perfil `/candidato/perfil` com dados pessoais + candidaturas | Already implemented — `useCandidato()` + `useCandidaturas()` (verified). E2E + contrast polish. |
| HARD-01 | E2E suite completa passa 100% em CI | §Q1 — GitHub Actions YAML + Supabase strategy + secrets list. |
| HARD-02 | Lighthouse mobile > 80 Performance + Accessibility | §Q2 — LHCI config + assertion budget. |
| HARD-03 | ErrorBoundary global no root | §Q-MECH — verified NOT mounted at root; hoist existing `ErrorBoundary.tsx`. |
| HARD-04 | Labels + tab order + focus visível | §Q4 — axe-core/playwright + manual checklist. |
| HARD-05 | Validação manual mobile (iPhone 12 Pro) — logout acessível | §Q-MECH — manual UAT; Playwright mobile project already exists. |
| HARD-06 | DevNavigationMenu oculto em produção | §Q-MECH — verified gated at `App.tsx:221`. Verify-only. |
</phase_requirements>

## Summary

Phase 5 is a **verify-and-polish + quality-hardening** phase, not a net-new feature build. Direct codebase inspection confirms: the perfil page already renders real data (no mock), `DevNavigationMenu` is already DEV-gated, and `ErrorBoundary` exists but is scoped to cadastro (NOT at App root). The genuinely new work is **infrastructure** (a first-ever `.github/workflows/` CI running Playwright + Vitest + LHCI against Supabase), an **auth-flow migration** (PKCE → OTP recovery — the heaviest item), a **design-system root-cause fix** (the `bg-primary` HSL-vs-HEX token break that has forced 136 `bg-[#...]` hex-literal workarounds across the codebase), and an **a11y audit** layered on the existing Playwright suite.

The CI question (HARD-01) is the highest-leverage decision and the explicitly-flagged downstream unknown. The recommendation is **two-tier**: a deterministic core (login + cadastro + candidatura + perfil) that runs **mocked / hermetically against a dedicated Supabase test project** unconditionally on every PR, plus an **env-gated tier** for scenarios needing real email or live Supabase that stays skipped-with-reason in default CI (the pattern Phase 3 already established with `E2E_AUTH_TEST_USERS`). Avoid the live production project in CI — RLS, data pollution, and rate-limit blast make it unsafe.

**Primary recommendation:** Decompose into ~6 waves: **Wave 0** (CI scaffold + test infra) → **Wave A** (token repair D-07 + glass primitive D-02 + GlassButton/Logo D-14, the design-system root-cause batch) → **Wave B** (perfil verify+polish + ErrorBoundary hoist + DevNav verify + quick UX bugs D-12) → **Wave C** (a11y audit D-08 + LHCI D-05) → **Wave D** (DB hygiene migrations D-13) → **Wave E / sub-phase 5.1** (PKCE→OTP recovery D-15 — carve out). LHCI/perf-fix (D-06) is conditional on measurement.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Perfil real-data rendering (PERF-01/02) | Frontend (React) | API (Supabase RLS-protected SELECT via `useCandidaturas`) | Already built; data fetched client-side via TanStack Query against RLS-scoped tables. |
| E2E CI execution (HARD-01) | CI/CD (GitHub Actions runner) | API (Supabase test project) | Tests drive the browser; Supabase test project (NOT prod) provides backend. |
| Lighthouse budgets (HARD-02) | CI/CD | CDN/Static (Vite `build/` served by `vite preview`) | LHCI audits the production build served statically. |
| ErrorBoundary (HARD-03) | Frontend (React root) | — | Pure client-tier render-error catch. |
| a11y (HARD-04) | Frontend (Radix/shadcn primitives) | CI/CD (axe-core gate) | Radix gives ARIA/focus for free; manual label/tab-order work is component-tier; axe enforces in CI. |
| Token repair (D-07) | Frontend (Tailwind build + CSS vars) | — | Build-time CSS-variable resolution; no runtime/server involvement. |
| PKCE→OTP recovery (D-15) | API (Supabase Auth + email templates) | Frontend (Esqueci/Redefinir pages + hook) | Flow type + email template config is Supabase-Auth-tier; UI consumes the new verify path. |
| DB hygiene (D-13) | Database (Postgres migrations) | — | CHECK constraints / triggers / reconciliation migrations. |

## Standard Stack

### Core (NEW packages for this phase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@lhci/cli` | 0.15.1 | Lighthouse CI runner + assertion engine | The canonical way to enforce Lighthouse budgets in CI; `lhci autorun` collects + asserts + (optionally) uploads. `[VERIFIED: npm registry]` `[CITED: googlechrome.github.io/lighthouse-ci]` |
| `@axe-core/playwright` | 4.11.3 | `AxeBuilder` — inject axe-core into a Playwright page + scan | Official Playwright-recommended a11y integration; runs inside existing Playwright suite. `[VERIFIED: npm registry]` `[CITED: playwright.dev/docs/accessibility-testing]` |

### Supporting (already installed — no install needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@playwright/test` | 1.56.1 | E2E runner | Already configured (`playwright.config.ts`, 3 projects: chromium / mobile-chrome [Pixel 5] / tablet). |
| `vitest` | 4.0.7 | Unit/integration runner | Already configured. |
| `@supabase/supabase-js` | 2.104.0 (installed; 2.107.0 latest) | Auth client incl. `verifyOtp` | `verifyOtp({ type: 'recovery' })` already available in 2.104.0 — no upgrade required for D-15. |
| `tailwindcss` | 3.4.0 | Token system | D-07 fix is config + CSS-var only, no version change. |

**Installation:**
```bash
npm install -D @lhci/cli@^0.15.1 @axe-core/playwright@^4.11.3
```

**Version verification (run during Wave 0):**
```bash
npm view @lhci/cli version          # → 0.15.1 (verified 2026-06-06)
npm view @axe-core/playwright version  # → 4.11.3 (verified 2026-06-06)
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@lhci/cli` autorun | `treosh/lighthouse-ci-action` (Marketplace) | The Action wraps `@lhci/cli`; using the CLI directly keeps config in-repo (`lighthouserc.js`) and is identical to local runs. Prefer CLI. |
| Dedicated Supabase test project | `supabase start` local stack in CI | Local stack = full hermetic isolation but heavier CI (Docker, migrations, seed) and email flows still need Inbucket/mailpit. Dedicated remote test project is lighter to bootstrap and matches the team's existing `--linked` workflow. Recommend remote test project for the deterministic core; revisit local stack only if flakiness demands it. |
| `@axe-core/playwright` | `jest-axe` / standalone `axe-core` | jest-axe runs against jsdom (no real layout → misses focus/contrast). Playwright+axe runs against a real browser — required for HARD-04 focus-visible + contrast checks. |

## Package Legitimacy Audit

> slopcheck was not installable in this research session (no network pip access confirmed). Both packages are nonetheless **well-established, high-trust** and verified directly on the npm registry. Per protocol, they are tagged below with registry evidence; the planner SHOULD still gate the install behind the normal Wave 0 lint/build verification (not a `checkpoint:human-verify` — these are first-party Google/Deque packages with millions of weekly downloads and canonical source repos).

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@lhci/cli` | npm | ~6 yrs | high (Google official) | github.com/GoogleChrome/lighthouse-ci | unavailable | Approved (official Google) |
| `@axe-core/playwright` | npm | ~4 yrs | high (Deque official) | github.com/dequelabs/axe-core-npm | unavailable | Approved (official Deque) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

# Priority Question Spine

## Q1 [HIGHEST] — GitHub Actions CI: Playwright + Vitest against Supabase (D-03 / HARD-01)

### Recommended approach: dedicated Supabase **test project** + two-tier test gating

The CONTEXT.md flag asks "dedicated test project vs. live project with seeded test user." **Recommendation: dedicated Supabase test project**, for three reasons grounded in this codebase:

1. **RLS + data pollution.** The candidatura flow writes real rows (`candidaturas`, `respostas_formulario`, storage objects) and enforces a `UNIQUE partial idx (candidato_id, vaga_id) WHERE deleted_at IS NULL`. Running cadastro/candidatura E2E against prod pollutes prod data AND the UNIQUE constraint makes re-runs fail (a candidate can only apply once). A throwaway test project lets you reset/seed freely.
2. **Rate-limit blast.** The recovery flow consumes email-send rate-limit budget. Hammering prod's GoTrue rate limits in CI degrades real users.
3. **Secret hygiene.** A test project lets you put a `service_role` key in GitHub secrets for **seeding** (admin user creation) without ever exposing the prod service_role to CI logs.

**Two-tier gating** (extends the Phase 3 `E2E_AUTH_TEST_USERS` pattern already in the suite):

- **Tier 1 — Deterministic core (unconditional, every PR):** Most existing specs already mock `POST /auth/v1/token` and other Supabase endpoints via Playwright `page.route(...)` (verified: `login-flow.spec.ts` uses `makeJwt` + route mocks; `password-recovery-flow.spec.ts` uses `addInitScript` localStorage pre-seed). These need **no live Supabase** — they run hermetically in CI today. This is the 100%-green core HARD-01 demands.
- **Tier 2 — Live-Supabase / real-email (env-gated, skipped-with-reason):** Scenarios that genuinely need a real backend or real inbox stay `test.fixme(process.env.E2E_AUTH_TEST_USERS !== 'true', '...reason...')`. In default CI these are **skipped, not failed** (D-04 compliance). They can be promoted to run when the test-project secrets are wired.

### Concrete workflow YAML shape

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, 'backup/**']
  pull_request:

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint          # tsc --noEmit (baseline 296 zero-growth invariant)
      - run: npm run test:run      # Vitest single run

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Build
        run: npm run build
      - name: Run Playwright (deterministic core only by default)
        run: npx playwright test --project=chromium
        env:
          CI: true
          # Anon-key + URL point at the dedicated TEST project (safe to expose to CI run).
          VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          # Tier-2 gate OFF by default → live-Supabase/real-email specs skip-with-reason.
          E2E_AUTH_TEST_USERS: ''
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

> NOTE on env var names: `playwright.config.ts` already loads `.env.test` via `dotenv`. Confirm the actual Vite env var names the app reads in `src/lib/supabase/client.ts` (the plan must grep `import.meta.env.VITE_*`) and mirror those exact names in the workflow `env:` block. The YAML above assumes `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — **planner must verify** (tagged `[ASSUMED]`).

> NOTE: `playwright.config.ts` `webServer.command` is `npm run dev` (port 3003) with `reuseExistingServer: !process.env.CI`. In CI this will spawn the Vite dev server. For LHCI you want the **production build** served by `vite preview` — keep these as separate jobs/configs (see Q2). The existing Playwright webServer config works as-is for the E2E job.

### Secrets list (GitHub → Settings → Secrets and variables → Actions)

| Secret | Used by | Tier |
|--------|---------|------|
| `TEST_SUPABASE_URL` | app build/runtime in CI | 1 + 2 |
| `TEST_SUPABASE_ANON_KEY` | app build/runtime in CI | 1 + 2 |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | a seed step (`supabase.auth.admin.createUser`) — **never** read by app code | 2 only |
| `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` | Tier-2 login specs | 2 only |

**Test-user provisioning (Tier 2, when enabled):** a Playwright global-setup or a small seed script calls `supabase.auth.admin.createUser({ email, password, email_confirm: true })` against the test project using the test service_role (server-side in the runner only). `email_confirm: true` bypasses the confirmation email so login specs don't need a real inbox. **CLAUDE.md security rule still holds**: the service_role must NEVER reach client bundle — it lives only in the CI seed step's process env, not in `import.meta.env`.

**Real-email scenarios (D-04):** Recovery-email deliverability (B10-real / UAT-3) genuinely needs an inbox and stays manual-UAT / env-gated. Do NOT attempt to automate real Gmail polling in CI — keep it skipped-with-reason exactly as Phase 3 did.

### Blast radius
- NEW: `.github/workflows/ci.yml` (does not exist yet — verified). No source changes for Tier 1.
- Prune `e2e/job-application-flow.spec.ts` (D-04 — legacy PRD-0005 duplicate; verified present, 22.9 KB).
- Lint baseline 296 zero-growth invariant must hold (CI runs `npm run lint`).

### Decisions the planner still needs to make
- Confirm exact Vite env var names from `src/lib/supabase/client.ts` `[ASSUMED A1]`.
- Whether to provision a dedicated test project now (Tier 2 live) or ship Tier 1 green first and add Tier 2 later. Recommend Tier 1 first (delivers HARD-01's "100% in CI" with zero Supabase dependency), Tier 2 as a follow-up wave.

---

## Q2 — Lighthouse CI in GitHub Actions (D-05 / HARD-02)

### Recommended approach: `@lhci/cli autorun` against the production build served by `vite preview`

LHCI must audit the **production bundle** (`npm run build` → `build/`), not the dev server. `vite preview` serves `build/` statically. Mobile is the LHCI default preset — no extra flag needed for the mobile budget HARD-02 specifies.

### Concrete config shape

```javascript
// lighthouserc.js  (repo root)
module.exports = {
  ci: {
    collect: {
      // vite.config sets outDir=build/ and dev port 3003; preview defaults to 4173.
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',          // Vite preview prints "Local:   http://localhost:4173/"
      url: [
        'http://localhost:4173/auth/login',
        'http://localhost:4173/cadastro',
        'http://localhost:4173/vagas',
        'http://localhost:4173/candidato/perfil',  // requires auth — see NOTE
      ],
      numberOfRuns: 3,
      settings: {
        // mobile is the DEFAULT preset (Moto-G4-class throttling) — HARD-02 is "mobile > 80".
        // Leave preset unset for mobile, or set preset: 'desktop' to override.
      },
    },
    assert: {
      assertions: {
        'categories:performance':   ['error', { minScore: 0.8, aggregationMethod: 'optimistic' }],
        'categories:accessibility': ['error', { minScore: 0.8, aggregationMethod: 'optimistic' }],
      },
    },
    upload: { target: 'temporary-public-storage' },  // or 'filesystem' to keep reports as artifacts
  },
};
```

> `minScore: 0.8` encodes ">80" (Lighthouse scores are 0–1). `aggregationMethod: 'optimistic'` takes the best of `numberOfRuns` — reduces flaky failures from runner CPU jitter. `[CITED: googlechrome.github.io/lighthouse-ci/docs/configuration.html]`

> NOTE — `/candidato/perfil` is auth-gated. Auditing it requires either (a) an authenticated session (LHCI Puppeteer-script `--collect.puppeteerScript` that logs in first), or (b) auditing only public routes for the budget and covering perfil performance via a separate manual/Tier-2 pass. **Recommend (b) for the CI budget**: assert >80 on the **public** candidate routes (login, cadastro, vagas) where Lighthouse can render anonymously; treat perfil perf as a manual smoke (D-01 already polishes it). This avoids a brittle login-script in the LHCI collect step.

### CI job

```yaml
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: npm install -g @lhci/cli@0.15.1
      - run: lhci autorun
        env:
          VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```

### D-06 measure-first gate (the N+1 fix is conditional)

Run LHCI **first** and read the Performance score before touching `vagasService.enriquecerVaga`. The N+1 (3 queries/vaga) lives on the **vagas listing** path. Only if `/vagas` Performance comes in < 0.8 does the planner add a task to denormalize / RPC-batch `enriquecerVaga`. If it passes, D-17 stays deferred (no premature optimization, per D-06). **This makes the perf-fix a conditional task the plan should structure as: measure → branch.**

### Blast radius
- NEW: `lighthouserc.js` + LHCI CI job. No source changes unless the measure-first gate trips.
- `vite preview` default port is 4173 (not the dev 3003) — URLs must use 4173.

### Decisions the planner still needs
- Public-routes-only budget vs. authenticated perfil audit (recommend public-only `[ASSUMED A2]`).
- Whether to fail the build (`error`) or warn (`warn`) on first introduction — recommend `warn` for one PR to establish a baseline, then flip to `error`.

---

## Q3 — PKCE → OTP password-recovery migration (D-15 / D-16) — CARVE-OUT RECOMMENDED

### Verdict: **YES — carve into its own wave (5.E) or inserted sub-phase 5.1.**

This is the heaviest item and the only one that touches **live Supabase Auth config + email templates + a security-sensitive flow** that already shipped and was UAT-signed-off (AUTH-03/04). It deserves isolation for bisect-friendly rollback (the carryover discipline STATE.md flags as Phase 4's central lesson). It also requires a **human checkpoint** (Supabase Dashboard email-template edit + real-email UAT), so it cannot fully autonomous-complete.

### Root cause (confirmed, from 03-07-SUMMARY + client.ts)

`src/lib/supabase/client.ts` sets `flowType: 'pkce'` + `detectSessionInUrl: true`. The recovery email link carries a `?code=...`; the client must call `exchangeCodeForSession(code)`, which needs the `code_verifier` stored in the **originating browser's** localStorage. Cross-browser/device clicks fail silently with "Link inválido ou expirado" even though Supabase `/verify` succeeded. `[CITED: 03-07-SUMMARY.md §Production-only finding]`

### Recommended migration: email-OTP `verifyOtp({ type: 'recovery' })`

Switch recovery from "click a magic link" to "type a 6-digit code from the email into the same tab." This eliminates the browser-context dependency entirely because the code is verified server-side against the email — no `code_verifier` handshake. `[CITED: supabase.com/docs/reference/javascript/auth-verifyotp]`

**Core API shape** (already available in installed supabase-js 2.104.0):
```ts
// 1. Request — UNCHANGED call, but the email now carries a {{ .Token }} OTP (see template note)
await supabase.auth.resetPasswordForEmail(email)  // redirectTo no longer load-bearing for OTP

// 2. Verify the 6-digit code the user types in (NEW — replaces deeplink/exchangeCodeForSession)
const { data, error } = await supabase.auth.verifyOtp({
  email,
  token,            // the 6-digit code from the email
  type: 'recovery',
})
// On success: a session is established → user is in a PASSWORD_RECOVERY-equivalent authenticated state.

// 3. Set the new password (UNCHANGED)
await supabase.auth.updateUser({ password: novaSenha })
```
`[CITED: supabase.com/docs/reference/javascript/auth-verifyotp — type: 'recovery']`

**Supabase Dashboard config (human checkpoint):**
- Edit the **Reset Password** email template to include `{{ .Token }}` (the 6-digit OTP) instead of (or alongside) `{{ .ConfirmationURL }}`. `{{ .Token }}` "contains a 6-digit OTP that can be used instead of the `{{ .ConfirmationURL }}`." `[CITED: supabase.com/docs/guides/auth/auth-email-templates]`
- OTP expiry already audited at 3600s (T-03-09 / UAT-6) — unchanged.

### Blast radius (files — verified present)

| File | Change |
|------|--------|
| `src/components/pages/EsqueciSenhaPage.tsx` | Add "we'll email you a code" copy; on submit, navigate to redefinir with the email in state (carry email forward so verifyOtp has it). Currently 2-state (form → neutral success). Becomes: form → "enter the code we sent" handoff. |
| `src/components/pages/RedefinirSenhaPage.tsx` | Add a 6-digit code input (project already has `input-otp@1.4.2` dependency — reuse it) before the new-password fields. Calls `verifyOtp` then `updateUser`. |
| `src/features/auth/hooks/useRecoverySession.ts` | **Largest behavioral change.** Today it waits for `PASSWORD_RECOVERY` event / `getSession()` / 2s timeout (deeplink-driven). For OTP, "valid session" is established **after** `verifyOtp` succeeds, not on mount. The 3-path state machine is replaced by an OTP-verify gate. Consider whether this hook survives or is supplanted by an in-page verify step. |
| `src/features/auth/services/passwordService.ts` | Add `verifyRecoveryOtp(email, token)` wrapping `verifyOtp({ type:'recovery' })` with the existing `mapSupabaseError` + Pitfall-7 redaction idiom (NEVER log token). `requestPasswordReset` largely unchanged. |
| `src/lib/supabase/client.ts` | `flowType: 'pkce'` may stay (PKCE is still correct for OAuth/magic-link login); OTP recovery does not depend on flowType. **Do NOT flip the global flowType to implicit** — that would weaken login security (Phase 3 explicitly rejected mitigation (c)). |
| `e2e/password-recovery-flow.spec.ts` | Rewrite B9/B10/B12 around the OTP-entry flow. The fake-JWT deeplink flakiness (ISSUE-006) disappears — OTP verify is mockable via `page.route` on `/auth/v1/verify`. This is a **net testability win** (B10 can become unconditional). |
| `src/features/auth/schemas/redefinirSenhaSchema.ts` | Add a `token` field (6 digits) to the schema. |

**Also fold here:** F-04.1-E (422 transient on first `setNewPassword` → friendly retry toast, D-12) and the Phase-3-flagged a11y item — wrap the change-password widget on perfil in a `<form>` with `autocomplete='current-password'`/`'new-password'` (verified: `MeuPerfilCandidatoPage.tsx` lines 329/529/558/587 use bare `<input>` outside a `<form>`).

### Email-prefetch bonus
OTP-entry also mitigates the email-prefetch problem (scanners consuming magic links before the user clicks). `[CITED: supabase.com/docs/guides/troubleshooting/otp-verification-failures]`

### Decisions the planner still needs
- Single-page (enter email → code → new password all on redefinir) vs. two-page (esqueci sends, redefinir verifies). Recommend keeping email captured in router state from EsqueciSenhaPage so `verifyOtp` has the email without re-prompting. `[ASSUMED A3]`
- Whether `useRecoverySession` is refactored or retired. `[ASSUMED A4]`
- Keep PKCE deeplink as a fallback (dual-path) or fully replace. Recommend **full replace** for recovery to avoid maintaining two brittle paths; login/OAuth keep PKCE.

---

## Q4 — a11y audit tooling + approach (D-08 / HARD-04)

### Recommended approach: `@axe-core/playwright` `AxeBuilder` layered into the existing Playwright suite + a manual checklist for what axe can't catch

Automated axe-core covers ~30–50% of WCAG (missing labels, color contrast, ARIA misuse, duplicate IDs). The rest (logical tab order, focus-visible quality, meaningful focus traps) needs manual review. Radix/shadcn primitives give correct ARIA roles, focus management, and keyboard handling **for free** — the manual work concentrates on (a) custom glass inputs that bypass Radix, (b) the bare-`<input>` change-password widget, and (c) tab order across multi-step forms.

### Concrete shape

```ts
// e2e/a11y.spec.ts
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
`[CITED: playwright.dev/docs/accessibility-testing]` `[CITED: npmjs.com/package/@axe-core/playwright]`

**For known-unfixable-this-phase elements**, use `.exclude(selector)` or `.disableRules([...])` with a tracking comment rather than failing the gate — but prefer fixing (D-08 is a fix mandate, not just an audit).

### How it dovetails with LHCI Accessibility >80
LHCI's `categories:accessibility` runs axe-core under the hood too, but scores 0–1 and audits the production build. The Playwright axe specs are **stricter** (zero-violations on A/AA tags) and run per-route with better diagnostics. Use both: Playwright axe for actionable per-route diffs during development; LHCI accessibility >80 as the CI gate HARD-02 names. They reinforce each other.

### Manual checklist (the part axe misses — covers HARD-04's "tab order + focus visible")
- **Labels:** every input has an associated `<label htmlFor>` OR `aria-label`. (Login/Esqueci verified good; audit cadastro steps + candidatura form + perfil change-password.)
- **Tab order:** Tab through each multi-step form — order follows visual order, no traps, no skipped fields.
- **Focus-visible:** every interactive element shows a visible focus ring on keyboard focus (the glass UI's low-contrast risk — pair with D-07/F-04-08-G contrast work).
- **Logout reachability (HARD-05 overlap):** logout button reachable by keyboard + visible on iPhone 12 Pro viewport.

### Flows to cover (D-08 — all candidate-facing)
cadastro (4 steps), login, recovery (esqueci + redefinir — post-Q3 OTP UI), vagas (list + detail), candidatura (form), perfil.

### Blast radius
- NEW: `e2e/a11y.spec.ts` + axe install. Source fixes land in the shared primitives (pairs with D-02): the shared `Input`, shadcn `Select`, glass primitives. Fixing once at the primitive cascades to all consumers.

### Decisions the planner still needs
- Per-route audit depth (Claude's discretion per CONTEXT.md). Recommend: zero-violation gate on the 4 public routes unconditionally; auth-gated routes (perfil, candidatura form) covered via Tier-2 or manual axe run.

---

## Q5 — Tailwind `bg-primary` token repair (D-07 / D-26)

### Root cause (CONFIRMED by direct file read)

- `tailwind.config.js` line 27: `primary: { DEFAULT: "hsl(var(--primary))" }` — expects `--primary` to be **HSL channel components** (e.g. `234 100% 31%`).
- `src/styles/globals.css` line 8 + 52: `--brand-primary: #00109E;` then `--primary: var(--brand-primary);` — `--primary` resolves to a **HEX string**.
- Result: Tailwind emits `background-color: hsl(#00109E)` → **invalid CSS** → transparent background. `[VERIFIED: codebase grep + read]`
- Confirmed active path: `src/main.tsx` imports `./index.css` which `@import './styles/globals.css'` — so globals.css IS the live source-of-truth. `[VERIFIED]`
- Workaround footprint: **136 occurrences of `bg-[#...]` hex literals** across `src/` (verified via grep). These are the D-07 sweep target.

### Correct shadcn/Tailwind CSS-variable convention

The shadcn convention is: CSS variables hold **HSL channel triplets** (space-separated, no `hsl()` wrapper), and Tailwind wraps them with `hsl(var(--x))`. The fix is to redefine the `--primary` family in channel form:

```css
/* globals.css — define the SEMANTIC tokens as HSL channels (NOT hex).
   Keep the HEX brand palette for any raw consumers, but DECOUPLE --primary from it. */
:root {
  --brand-primary: #00109E;          /* keep raw hex for direct-hex consumers */
  /* #00109E = hsl(234, 100%, 31%) → channel triplet: */
  --primary: 234 100% 31%;           /* was: var(--brand-primary)  ❌ */
  --primary-foreground: 0 0% 100%;   /* was: #ffffff  ❌ */
  /* ...repeat channel-triplet conversion for every semantic token the config wraps in hsl():
     --background, --foreground, --card, --popover, --secondary, --muted, --accent,
     --destructive, --border, --input, --ring, --chart-1..5 — ALL currently hex. */
}
```

> **CRITICAL scope note:** the config wraps **every** color token in `hsl(var(--x))` (background, foreground, card, popover, secondary, muted, accent, destructive, border, input, ring, chart-1..5 — verified in tailwind.config.js). globals.css defines **all of them as hex**. So `bg-primary` is not the only broken token — `bg-secondary`, `bg-muted`, `bg-accent`, `border-border`, `bg-card`, etc. are ALL emitting invalid `hsl(#hex)`. The reason only `bg-primary` surfaced is that the codebase mostly uses hex literals or Tailwind's built-in palette and rarely the semantic tokens. **The clean fix converts the whole semantic block to channel triplets at once.** A safer-but-uglier alternative is to change the config to `var(--x)` (drop the `hsl()` wrapper) and keep hex in CSS — but that breaks Tailwind opacity modifiers (`bg-primary/90`), which the codebase relies on (D-25). **Recommend the channel-triplet conversion** so `bg-primary/90` opacity modifiers work.

### Safe sweep strategy (no visual regression)

1. **Convert** all semantic tokens in globals.css `:root` (and any dark variant) to HSL channel triplets. Compute each triplet from its current hex (deterministic).
2. **Verify** `bg-primary` now resolves: add a throwaway element or a Vitest/Playwright snapshot asserting computed `background-color` is the expected `rgb(0, 16, 158)`.
3. **Sweep** the 136 `bg-[#00109E]` (and sibling hex-literal) workarounds back to semantic tokens (`bg-primary`, `bg-primary/90`, etc.) **file-by-file**, re-rendering each page after.
4. **Smoke-runtime each swept page** (the Phase 4.1 gate — autonomous green is NOT sufficient; the F-04-08-D bug proved render-time-only failures pass all gates). Pair with the a11y/contrast pass (D-08/F-04-08-G).
5. This is the **same wave as D-02** (glass-input primitive) and **D-14** (GlassButton inline-flex + BeautySmileLogo type union) — the design-system root-cause batch.

### D-02 pairing
Lift the cadastro form's known-good glass-input styling into the shared `Input` / shadcn `Select` / glass primitive (F-04.1-C: "copiar o mesmo design do formulario de cadastro"). Fix once at the primitive; the dark-font-on-dark-glass defects (F-04.1-A, F-04.1-C, F-04-08-G) then can't recur. This is explicitly a **primitive-level** fix (D-02), not per-page.

### Blast radius
- `src/styles/globals.css` (token block rewrite — the highest-leverage single-file change).
- `tailwind.config.js` (no change if channel-triplet path chosen).
- 136 hex-literal sweep sites across `src/components/pages/*`, `src/features/cadastro/*`, etc. (incremental, file-by-file, smoke-runtime-gated).
- Shared `Input` / `Select` / glass primitives (D-02).

### Decisions the planner still needs
- Channel-triplet conversion (recommended) vs. config-drops-hsl-wrapper. `[recommend triplet]`
- Whether to sweep ALL 136 in this phase or only the candidate-facing pages (M1 scope). Recommend: convert tokens for ALL (one file, fixes everything), but sweep hex literals only on **candidate-facing** pages this phase; RH pages (M2) can keep working hex literals since the token now also works.

---

## Q-MECH — Mechanical hardening (D-09 / D-10 / D-11)

| Item | Status (verified) | Action |
|------|-------------------|--------|
| **HARD-03 / D-09** ErrorBoundary at root | **NOT mounted at root** (grep `ErrorBoundary` in `App.tsx` → 0 hits). Exists at `src/features/cadastro/components/ErrorBoundary.tsx`. (Also a second `src/components/ErrorBoundary.tsx` exists — planner must pick canonical.) | Hoist a single ErrorBoundary to wrap the router/app root in `App.tsx`. Pick the cadastro one or the components one as canonical; delete the other or re-export. |
| **HARD-06 / D-10** DevNav gated | **Confirmed gated** — `App.tsx:221` `{import.meta.env.DEV && <DevNavigationMenu />}`. | Verify-only. Optionally add a Vitest/grep guard asserting the gate stays. |
| **HARD-05 / D-11** mobile validation | Playwright `mobile-chrome` (Pixel 5) project exists; iPhone 12 Pro is a manual UAT viewport. | Manual UAT: confirm all flows + logout reachable on iPhone 12 Pro viewport. Add as a UAT runbook section. |

## Q-DB — DB hygiene migrations (D-13)

| Finding | Issue | Migration |
|---------|-------|-----------|
| F-04-08-B | vaga soft-deleted (`deleted_at` set) but `status='ativa'` — listing could surface a deleted vaga. | CHECK constraint or BEFORE-UPDATE trigger forcing `status != 'ativa'` when `deleted_at IS NOT NULL` (+ a one-time backfill UPDATE for existing drift). |
| F-04-08-C | `bloco_valido_check` constraint exists in live DB but not captured in `supabase/migrations/` — schema drift. | Reconciliation migration that re-declares the constraint so migrations are the source of truth (FOUND-09 invariant). |

**PL/pgSQL `db push` workaround applies** (CLAUDE.md / D-22): migrations with `CREATE FUNCTION`/`DO $$...$$` + adjacent `COMMENT`/`GRANT`/`REVOKE` fail via `supabase db push --linked` (SQLSTATE 42601). Workaround: run SQL manually in SQL Editor → `supabase migration repair --status applied <version>` → confirm `db push` says up-to-date → strip outer `BEGIN/COMMIT` (driver wraps each migration in its own transaction). **This is a human checkpoint.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lighthouse budgets in CI | Custom puppeteer + lighthouse-node script | `@lhci/cli autorun` + `lighthouserc.js` | Handles server start/ready, multi-run aggregation, assertion presets, report upload. |
| a11y scanning | Hand-written ARIA assertions | `@axe-core/playwright` `AxeBuilder` | 90+ WCAG rules maintained by Deque; runs in real browser. |
| Recovery OTP verification | Custom token table + email + verify endpoint | `supabase.auth.verifyOtp({ type:'recovery' })` | Native GoTrue flow; the OTP already exists in the recovery email via `{{ .Token }}`. |
| Test-user creation in CI | Direct SQL inserts into auth.users | `supabase.auth.admin.createUser({ email_confirm: true })` | Correctly hashes password, sets confirmation, fires hooks. |
| 6-digit code input UI | Custom 6-box input | `input-otp@1.4.2` (already installed) | Already a project dependency; accessible, paste-aware. |
| HSL token math | Manual per-page hex literals (the current 136-occurrence mess) | shadcn channel-triplet CSS vars + `hsl(var(--x))` | Restores opacity modifiers + single source of truth. |

**Key insight:** Every priority item has a first-party / already-installed solution. The phase's risk is integration sequencing (token fix before sweep before a11y before LHCI gate), not invention.

## Common Pitfalls

### Pitfall 1: Auditing the dev server with Lighthouse
**What goes wrong:** LHCI scores the unminified dev build → Performance always fails.
**How to avoid:** `startServerCommand: 'npm run preview'` (serves `build/`), URLs on port 4173, after `npm run build`.

### Pitfall 2: Service_role leaking into the client bundle in CI
**What goes wrong:** Putting test service_role in a `VITE_*` env var → it's inlined into the browser bundle (violates CLAUDE.md hard rule).
**How to avoid:** service_role lives ONLY in a CI seed-step process env, never `VITE_`-prefixed, never read by `client.ts`.

### Pitfall 3: Flipping global `flowType` to implicit for OTP recovery
**What goes wrong:** Weakens login/OAuth PKCE security (Phase 3 explicitly rejected this, mitigation (c)).
**How to avoid:** OTP recovery does NOT depend on flowType. Leave `flowType: 'pkce'`. Only change the verify call + email template.

### Pitfall 4: Token sweep visual regression (the F-04-08-D trap)
**What goes wrong:** Swapping `bg-[#00109E]` → `bg-primary` while the token is still broken → invisible buttons; OR converting tokens but missing a sibling token still emitting `hsl(#hex)`.
**How to avoid:** Convert the ENTIRE semantic token block to channel triplets in one pass; smoke-runtime each swept page (autonomous green is insufficient — this exact class of bug passed all Phase 4 gates).

### Pitfall 5: RHF onBlur + disabled-gate E2E (the Phase 3 auto-fix Rule 1)
**What goes wrong:** `.fill()` doesn't flush RHF `mode:'onBlur'` validation → submit stays disabled → click no-ops. Plus `getByLabel('Senha')` matches input + eye-toggle (strict-mode violation).
**How to avoid:** Use `#id` locators; `.blur()` (or Tab) after each `.fill()`. Any new recovery-OTP E2E inherits this.

### Pitfall 6: Marking a plan complete on green gates without smoke-runtime (Phase 4 central lesson)
**What goes wrong:** All autonomous gates pass but the page is UNUSABLE at render time (Tailwind/contrast/shell issues only manifest in a real browser).
**How to avoid:** **Smoke-runtime gate is inherited by Phase 5** (04.1-VERIFICATION established it). Every UI-touching plan needs real-browser evidence before "complete."

## Code Examples

### LHCI mobile budget (verbatim, repo root)
```javascript
// lighthouserc.js — see Q2 for full config
module.exports = {
  ci: {
    collect: { startServerCommand: 'npm run preview', startServerReadyPattern: 'Local:',
      url: ['http://localhost:4173/auth/login','http://localhost:4173/vagas'], numberOfRuns: 3 },
    assert: { assertions: {
      'categories:performance':   ['error', { minScore: 0.8, aggregationMethod: 'optimistic' }],
      'categories:accessibility': ['error', { minScore: 0.8, aggregationMethod: 'optimistic' }],
    }},
  },
}
```
`[CITED: googlechrome.github.io/lighthouse-ci/docs/configuration.html]`

### axe-core per-route gate
```ts
// Source: playwright.dev/docs/accessibility-testing
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze()
expect(results.violations).toEqual([])
```

### OTP recovery verify
```ts
// Source: supabase.com/docs/reference/javascript/auth-verifyotp (type: 'recovery')
const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' })
if (!error) await supabase.auth.updateUser({ password: novaSenha })
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| PKCE magic-link recovery (cross-browser fragile) | Email-OTP `verifyOtp({type:'recovery'})` | Eliminates browser-context dependency + email-prefetch token consumption. |
| Local Lighthouse runbook | `@lhci/cli autorun` in Actions with assertions | Budget enforced as a build gate, not a manual ritual. |
| Per-page hex-literal color workarounds | shadcn channel-triplet CSS vars | Restores semantic tokens + opacity modifiers; single source of truth. |

## Runtime State Inventory

> Not a rename/migration phase, but the PKCE→OTP migration (D-15) and DB hygiene (D-13) touch live runtime state. Categories below cover those.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing `candidaturas` / `respostas_formulario` rows with vaga drift (F-04-08-B: soft-deleted vaga still `status='ativa'`). | Data migration (backfill UPDATE) + code-edit (CHECK/trigger) — both tasks (D-13). |
| Live service config | **Supabase Auth "Reset Password" email template** lives in the Dashboard, NOT in git. PKCE→OTP requires editing it to emit `{{ .Token }}`. | Manual Dashboard edit (human checkpoint, D-15). |
| OS-registered state | None — verified (no OS-level registrations in this web app). | None. |
| Secrets/env vars | NEW GitHub Actions secrets (`TEST_SUPABASE_*`, `E2E_TEST_USER_*`) — not in git, set in repo settings. Existing `.env.test` consumed by playwright.config. | Add secrets in GitHub repo settings (human checkpoint, D-03). |
| Build artifacts | `build/` (Vite output) is what LHCI audits — regenerated each CI run, no stale-artifact risk. | None. |
| Schema drift | `bloco_valido_check` constraint exists in live DB, absent from `supabase/migrations/` (F-04-08-C). | Reconciliation migration (D-13). |

## Validation Architecture

> nyquist_validation is not explicitly false in config (treat as enabled).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.7 (unit) + Playwright 1.56.1 (E2E) |
| Config file | `playwright.config.ts` (3 projects); Vitest config inline in `vite.config.ts` (no separate vitest.config.* — verified) |
| Quick run command | `npm run test:run` (Vitest) / `npx playwright test --project=chromium --grep "<id>"` |
| Full suite command | `npm run test:run && npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01/02 | Perfil renders real candidaturas + personal data | E2E (Tier-2 auth) + manual smoke | `npx playwright test --grep "perfil"` | ❌ Wave 0 (new `e2e/perfil.spec.ts`) |
| HARD-01 | Deterministic core green in CI | E2E unconditional | `npx playwright test --project=chromium` | ✅ (login/cadastro/candidatura specs exist; prune job-application) |
| HARD-02 | Lighthouse mobile >80 Perf+A11y | LHCI | `lhci autorun` | ❌ Wave 0 (new `lighthouserc.js`) |
| HARD-03 | ErrorBoundary at root | Vitest render test + grep guard | `npm run test:run -- ErrorBoundary` | ❌ Wave 0 |
| HARD-04 | Zero WCAG A/AA violations on public routes | E2E axe | `npx playwright test e2e/a11y.spec.ts` | ❌ Wave 0 (new) |
| HARD-05 | iPhone 12 Pro flows + logout reachable | Manual UAT | — | Manual runbook |
| HARD-06 | DevNav DEV-gated | Vitest/grep guard | grep `import.meta.env.DEV && <DevNavigationMenu` | ✅ gate present; add guard |

### Sampling Rate
- **Per task commit:** `npm run lint` (baseline 296 zero-growth) + `npm run test:run`
- **Per wave merge:** full Vitest + `npx playwright test --project=chromium` + `lhci autorun` (once LHCI lands)
- **Phase gate:** full suite green + LHCI >80 + axe zero-violations + manual iPhone UAT, before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `.github/workflows/ci.yml` — unit + e2e + lighthouse jobs (D-03/05)
- [ ] `lighthouserc.js` — LHCI config (D-05)
- [ ] `e2e/a11y.spec.ts` — axe-core per-route (D-08)
- [ ] `e2e/perfil.spec.ts` — PERF-01/02 E2E (D-01)
- [ ] Install `@lhci/cli` + `@axe-core/playwright`
- [ ] Prune `e2e/job-application-flow.spec.ts` (D-04)
- [ ] ErrorBoundary root render test + grep guard (D-09)
- [ ] DevNav gate grep guard (D-10)

## Security Domain

> security_enforcement not disabled in config (treat as enabled).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase GoTrue; OTP recovery via `verifyOtp({type:'recovery'})`; OTP expiry 3600s. |
| V3 Session Management | yes | `persistSession` native Supabase; sessionStorage vs localStorage routing (rememberMe adapter, AUTH-02). |
| V4 Access Control | yes | RLS on all user-data tables (CLAUDE.md); RoleGuard; UNIQUE partial idx on candidaturas. |
| V5 Input Validation | yes | Zod schemas (pt-BR) + RHF; new `token` field validation for OTP. |
| V6 Cryptography | yes (don't hand-roll) | PKCE/OTP handled by GoTrue; CI service_role isolation. |
| V7 Error Handling/Logging | yes | Pitfall 7 grep guard — NEVER log password/token/access_token. Extend to `verifyRecoveryOtp` (never log `token`). |

### Known Threat Patterns for {Supabase + React SPA}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| service_role in client bundle | Info disclosure / Elevation | Never `VITE_`-prefix service_role; CI seed-step only (Pitfall 2). |
| Email enumeration on recovery | Info disclosure | D-09 anti-enumeration neutral copy (preserve in OTP rewrite). |
| OTP token in logs | Info disclosure | Pitfall 7 grep guard extended to recovery-OTP service. |
| Email prefetch consuming recovery token | DoS (account lockout) | OTP-entry flow (Q3) mitigates vs magic-link. |
| Open redirect on login `?redirect=` | Tampering | anti-open-redirect guard already shipped (VAGA-03 / Phase 4.1). |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vite env var names are `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Q1 | CI app build fails to connect; trivially fixed by grepping `client.ts`. Planner MUST verify. |
| A2 | LHCI budget audits public routes only (perfil perf manual) | Q2 | If perfil must be in the budget, needs an LHCI login puppeteer-script (added complexity). |
| A3 | Recovery email carried forward in router state from Esqueci→Redefinir | Q3 | If not, user re-enters email on redefinir (minor UX). |
| A4 | `useRecoverySession` is refactored/retired for OTP, not kept dual-path | Q3 | Dual-path maintenance burden if both kept. |
| A5 | slopcheck unavailability does not change disposition for `@lhci/cli`/`@axe-core/playwright` (official Google/Deque) | Pkg Audit | Negligible — both are canonical first-party packages. |

## Open Questions

1. **Dedicated test project provisioning timing**
   - What we know: Tier-1 deterministic core needs NO live Supabase (mocked). HARD-01's "100% in CI" is achievable Tier-1-only.
   - What's unclear: whether Fernando wants a dedicated test project stood up this phase (enables Tier-2 live specs).
   - Recommendation: ship Tier-1 green first (satisfies HARD-01); add Tier-2 + test project as a follow-up wave or sub-phase.

2. **PKCE→OTP carve-out granularity**
   - What we know: D-15 is the heaviest item, touches live Auth config + email template + a UAT-signed flow, needs a human checkpoint.
   - Recommendation: inserted sub-phase **5.1** OR a clearly-isolated final wave with its own UAT runbook. Atomic commits (carryover discipline) for bisect-friendly rollback.

3. **Which RH pages (M2) to leave on hex literals**
   - Recommendation: convert tokens for all (single-file), sweep hex literals only on candidate-facing pages this phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | all | ✓ | 20+ (CI pin) | — |
| npm registry | install LHCI/axe | ✓ | — | — |
| `@lhci/cli` | HARD-02 | install | 0.15.1 | — |
| `@axe-core/playwright` | HARD-04 | install | 4.11.3 | — |
| Playwright browsers | E2E + axe + LHCI | install in CI | chromium | `npx playwright install --with-deps` |
| Supabase test project | Tier-2 E2E | ✗ (not provisioned) | — | Tier-1 mocked core (no live backend) — sufficient for HARD-01 |
| Supabase Dashboard access | D-15 email template | ✓ (human) | — | — (human checkpoint) |
| GitHub Actions | D-03/05 | ✓ (repo on GitHub) | — | — |

**Missing dependencies with no fallback:** none blocking.
**Missing dependencies with fallback:** Supabase test project (Tier-1 mocked core covers HARD-01 without it).

## Sources

### Primary (HIGH confidence)
- Codebase direct read/grep: `tailwind.config.js`, `src/styles/globals.css`, `src/index.css`, `src/main.tsx`, `src/lib/supabase/client.ts`, `src/features/auth/services/passwordService.ts`, `src/features/auth/hooks/useRecoverySession.ts`, `src/components/pages/EsqueciSenhaPage.tsx`, `src/components/pages/MeuPerfilCandidatoPage.tsx`, `src/App.tsx`, `playwright.config.ts`, `package.json` — verified token break, PKCE config, no-mock perfil, ErrorBoundary-not-at-root, DevNav gate, 136 hex literals.
- npm registry: `@lhci/cli@0.15.1`, `@axe-core/playwright@4.11.3`, `axe-core@4.12.0`, `@supabase/supabase-js@2.107.0` (installed 2.104.0) — verified 2026-06-06.
- [googlechrome.github.io/lighthouse-ci/docs/configuration.html](https://googlechrome.github.io/lighthouse-ci/docs/configuration.html) — LHCI config + assertion shape.
- [playwright.dev/docs/accessibility-testing](https://playwright.dev/docs/accessibility-testing) — AxeBuilder usage.
- [supabase.com/docs/reference/javascript/auth-verifyotp](https://supabase.com/docs/reference/javascript/auth-verifyotp) — `verifyOtp({type:'recovery'})`.
- [supabase.com/docs/guides/auth/auth-email-templates](https://supabase.com/docs/guides/auth/auth-email-templates) — `{{ .Token }}` 6-digit OTP variable.
- `.planning/phases/03-login-recuperacao-senha/03-07-SUMMARY.md` — PKCE cross-browser root cause + 3 mitigations.

### Secondary (MEDIUM confidence)
- [npmjs.com/package/@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) — AxeBuilder API.
- [supabase.com/docs/guides/troubleshooting/otp-verification-failures](https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp_expired-errors-5ee4d0) — email prefetch / OTP expiry.
- WebSearch (GitHub Actions + Playwright + Supabase secrets, LHCI presets) — cross-verified against official docs above.

### Tertiary (LOW confidence)
- A1 env var names (assumed `VITE_*` — planner must grep `client.ts` to confirm).

## Metadata

**Confidence breakdown:**
- CI strategy (Q1): HIGH (codebase mock-pattern verified + Supabase admin API official) — A1 env names need a 1-line grep confirm.
- LHCI (Q2): HIGH (official config + verified version).
- PKCE→OTP (Q3): HIGH (official verifyOtp + email template + verified blast-radius files).
- a11y (Q4): HIGH (official Playwright+axe).
- Token repair (Q5): HIGH (root cause confirmed by direct file read; 136 occurrences counted).
- Mechanical/DB (Q-MECH/Q-DB): HIGH (ErrorBoundary/DevNav verified; D-13 from STATE.md + CLAUDE.md workaround).

**Research date:** 2026-06-06
**Valid until:** 2026-07-06 (stable tooling; supabase-js/LHCI/axe are slow-moving)
