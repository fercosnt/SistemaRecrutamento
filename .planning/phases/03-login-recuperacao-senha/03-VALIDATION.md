---
phase: 3
slug: login-recuperacao-senha
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from RESEARCH.md §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (unit/integration)** | Vitest 4.0.7 + happy-dom + @testing-library/react + @testing-library/user-event |
| **Framework (E2E)** | Playwright 1.56.1 |
| **Config files** | `vitest.config.ts`, `playwright.config.ts` (both present from Phase 2) |
| **Quick run command** | `npm run test:run src/features/auth` |
| **Full suite command** | `npm run test:run && npm run test:e2e` |
| **Estimated runtime (quick)** | ~5 seconds (auth subset) |
| **Estimated runtime (full)** | ~90 seconds (vitest ~30s + playwright chromium ~60s) |

---

## Sampling Rate

- **After every task commit:** `npm run test:run src/features/auth` (~5s, auth subset only)
- **After every plan wave:** `npm run test:run && npx playwright test login-flow password-recovery --project=chromium` (~90s)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

> Filled incrementally during planning. Each PLAN.md task must reference a Behavior ID (B1-B16) and supply an automated verify command OR a Wave 0 dependency.

| Task ID | Plan | Wave | Requirement | Threat Ref | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|----------|-----------|-------------------|-------------|--------|
| *TBD during planning* | — | — | — | — | — | — | — | — | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Critical Behaviors (from RESEARCH.md §Validation Architecture)

| ID | Behavior | Requirement | Threat Ref |
|----|----------|-------------|------------|
| B1 | Login candidato with correct creds → `role=candidato` in authStore + redirect `/candidato/perfil` | AUTH-01 | — |
| B2 | Login candidato with wrong creds → INVALID_CREDENTIALS + generic "Email ou senha inválidos" | AUTH-01 | T-03-02 |
| B3 | Login with unconfirmed email → EMAIL_NOT_CONFIRMED + resend button triggers `supabase.auth.resend` | AUTH-01 | — |
| B4 | Rate limit → cooldown countdown + disabled submit until zero | AUTH-01 | T-03-06 |
| B5 | "Lembrar-me" unchecked → sessionStorage → dies on tab close | AUTH-02 | T-03-04, T-03-10 |
| B6 | "Lembrar-me" checked (default) → localStorage → survives tab close | AUTH-02 | — |
| B7 | `extractRole` returns role from JWT payload, not `app_metadata` | AUTH-01 | T-03-07 (Bug 1) |
| B8 | LoginRH rejects non-administrador roles (signOut + error toast) | AUTH-01 | T-03-01 (Bug 2/3) |
| B9 | `resetPasswordForEmail` always returns neutral copy (no enumeration) | AUTH-03 | T-03-02 |
| B10 | Redefinir-senha: deeplink → PASSWORD_RECOVERY → form → updateUser → redirect | AUTH-04 | — |
| B11 | Password mismatch on redefinir-senha surfaces Zod error on submit | AUTH-04 | T-03-08 |
| B12 | Expired/single-use recovery link surfaces InvalidLinkState | AUTH-03 | T-03-05 |
| B13 | Network error during signIn surfaces NETWORK_ERROR toast | AUTH-01 | — |
| B14 | Password NEVER in `console.*` during any auth flow | AUTH-01..04 | T-03-03 |
| B15 | Sonner toast renders in DOM for all auth flows (split-instance regression) | AUTH-01..04 | — |
| B16 | `setRememberMeMode('session')` clears localStorage `sb-*` keys | AUTH-02 | T-03-04 |

---

## Wave 0 Requirements

- [ ] Install `jwt-decode@^4.0.0` dependency (verified safe in RESEARCH.md Q2)
- [ ] Verify Supabase Dashboard: Email OTP Expiration = 3600s (not default 86400s) — blocks AUTH-03 + B12
- [ ] Verify Supabase Dashboard: Redirect URLs allow-list includes `/auth/redefinir-senha` — blocks B10
- [ ] Create `src/features/auth/utils/__tests__/extractRole.test.ts` stub — covers B7
- [ ] Create `src/features/auth/utils/__tests__/rememberMeStorage.test.ts` stub — covers B5, B6, B16
- [ ] Create `src/features/auth/services/__tests__/authService.test.ts` stub — covers B1, B2, B3, B4, B13, B14
- [ ] Create `src/features/auth/services/__tests__/passwordService.test.ts` stub — covers B9, B10 (service layer)
- [ ] Create `src/features/auth/hooks/__tests__/useRecoverySession.test.ts` stub — covers B12
- [ ] Create `src/features/auth/hooks/__tests__/useRateLimitCooldown.test.ts` stub — covers B4 (hook layer)
- [ ] Create `src/features/auth/schemas/__tests__/redefinirSenhaSchema.test.ts` stub — covers B11
- [ ] Create `e2e/login-flow.spec.ts` stub — covers B1, B2, B3 (env-gated), B4 (env-gated), B8 (env-gated), B15
- [ ] Create `e2e/password-recovery.spec.ts` stub — covers B9, B10 (mocked), B12
- [ ] Document E2E test users env-gating: `E2E_AUTH_TEST_USERS=true` with `test-candidato-confirmed`, `test-candidato-unconfirmed`, `test-admin`, `test-rh`

---

## Manual-Only Verifications (UAT)

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| B5 tab-close session death | AUTH-02 | Playwright `context.close()` not equivalent to real tab close for sessionStorage semantics | 1. Login com "Lembrar-me" desmarcado. 2. Fechar aba do navegador. 3. Reabrir `/auth/login`. 4. Assert: formulário vazio (não logado). |
| B6 tab-close session persistence | AUTH-02 | Mesmo motivo — real browser only | 1. Login com "Lembrar-me" marcado (default). 2. Fechar navegador inteiro. 3. Reabrir e ir em `/candidato/perfil`. 4. Assert: acesso direto (autenticado). |
| B10 real email deliverability | AUTH-03 | Supabase SMTP rate-limits; real inbox needed | 1. Submit reset de email real. 2. Conferir inbox dentro de 60s. 3. Clicar link. 4. Assert: landing em `/auth/redefinir-senha` com session ativa. |
| B13 real network failure | AUTH-01 | DevTools offline != real flaky network | 1. Login page aberta. 2. Desligar wifi. 3. Click Entrar. 4. Assert: toast NETWORK_ERROR com botão "Tentar novamente". |
| B14 password in network body | AUTH-01..04 | Static grep covers console; network inspection needs DevTools | 1. DevTools Network panel aberto. 2. Login válido. 3. Inspecionar request body do endpoint auth. 4. Assert: senha aparece SOMENTE no body HTTPS (expected), NÃO em query/headers/logs. |
| B15 split-instance root cause | AUTH-01..04 | E2E catches regression but not root | 1. `ls node_modules/.vite/deps/ \| grep sonner`. 2. Assert: apenas 1 arquivo `sonner*.js`. |
| T-03-09 Dashboard config audit | AUTH-03 | Dashboard state not in code | 1. Screenshot OTP Expiration = 3600s. 2. Screenshot Redirect URLs. 3. Anexar ao SUMMARY. |

---

## Untestable at Unit Level (documented)

- **B5/B6 tab-close lifecycle** — documented in Manual-Only. Adapter unit test covers storage routing; browser behavior requires human UAT.
- **B10 email arrival** — Playwright mock flow uses `supabase.auth.admin.generateLink` or intercepted hash fragment; real deliverability manual.

---

## Test Infrastructure Gaps (documented — defer unless blocking)

- **MSW not installed.** Decision: do NOT introduce. Phase 2 `vi.mock('@/lib/supabase/client')` pattern is sufficient. Revisit Phase 5.
- **Playwright `storageState` fixture for "logged-in candidato"** — NOT needed for Phase 3 (login IS the flow). Phase 4 needs it; leave Phase 3 setup reproducible via storage state capture after login E2E.
- **`supabase.auth.admin.generateLink` for recovery E2E** — requires service_role in a Playwright `globalSetup` script (server-side, never in browser bundle). If not ready in Wave 0, fall back to manual UAT for B10 happy path.

---

## Validation Sign-Off Checklist

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (Dashboard audit + test stubs)
- [ ] No watch-mode flags in test commands
- [ ] Feedback latency < 90s (wave-level)
- [ ] `nyquist_compliant: true` set in frontmatter
- [ ] `wave_0_complete: true` set after Dashboard audit + stubs land

**Approval:** pending

---

*Consumes: 03-RESEARCH.md §Validation Architecture + §Security Domain*
*Produces: per-task verification map (filled during planning) + Wave 0 runbook*
