---
phase: 29
slug: console-de-gest-o-de-usu-rios-rh
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-13
---

# Phase 29 — Validation Strategy

> UI phase consuming the Phase-28 `gerenciar-usuario-rh` EF (no backend work). Validation is component-level (RTL) over the console interactions + the `error_code`→UX mapping, plus a service-level test of the invoke contract. Live/visual round-trips (real EF call, email delivery) go to HUMAN-UAT.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library (jsdom/happy-dom) — component + service tests |
| **Config file** | `vite.config.ts` (`test` block) |
| **Quick run** | `npm run test:run` |
| **Type-check** | `npm run lint` (tsc --noEmit; must not inflate the frozen 104 baseline) |
| **E2E (deferred)** | Playwright (`e2e/`) — real admin login is env-gated (HUMAN-UAT) |

---

## Sampling Rate

- **Per task commit:** `npm run test:run` (scoped)
- **Per wave:** full Vitest + `npm run lint` (tsc ≤104) + `npm run build`
- **Phase gate:** full suite green, tsc ≤104, build 0, axe Tier-A still green

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Command | Status |
|--------|----------|-----------|---------|--------|
| USR-01 | Console renders the roster (nome/email, cargo, papel badge, status badge, primeiro_acesso chip, último login) from `usuariosRhService.list` | RTL (mocked service) | `npm run test:run` | ⬜ |
| USR-01 | List query uses an explicit allowlist projection (never `select('*')`) | service unit / grep-guard | `npm run test:run` | ⬜ |
| USR-02 | "Novo usuário" dialog submits `invoke('gerenciar-usuario-rh',{action:'criar',...})`; success → toast + list refetch; `EMAIL_SEND_FAILED` → success-with-warning toast | RTL (mocked invoke) | `npm run test:run` | ⬜ |
| USR-03 | "Editar papel" dispatches `action:'mudar_papel'` w/ novo_papel ∈ {recrutador, administrador} | RTL | `npm run test:run` | ⬜ |
| USR-04 | Desativar/Reativar dispatch `action:'desativar'`/`'ativar'` behind an AlertDialog confirm | RTL | `npm run test:run` | ⬜ |
| USR-05 | Resetar senha dispatches `action:'resetar_senha'` behind an AlertDialog confirm | RTL | `npm run test:run` | ⬜ |
| USR-07 (UX) | The last active administrador row disables Desativar/Rebaixar (tooltip); `LAST_ADMIN` error_code → authoritative toast | RTL | `npm run test:run` | ⬜ |
| (contract) | `usuariosRhService` maps every EF `error_code` (LAST_ADMIN/EMAIL_EXISTS/VALIDATION/FORBIDDEN/NOT_FOUND/SERVER_ERROR/EMAIL_SEND_FAILED) to the right UX outcome | service unit | `npm run test:run` | ⬜ |
| (guard) | Route keeps `RoleGuard role="administrador"`; AsyncState 5-state used (no blank screen) | RTL + route assertion | `npm run test:run` | ⬜ |

---

## Wave 0 Requirements

- [ ] `src/features/admin/services/__tests__/usuariosRhService.test.ts` — mocked `supabase.functions.invoke` + `.from().select()`; asserts the allowlist projection + every error_code mapping.
- [ ] `src/features/admin/components/__tests__/*.test.tsx` — roster render, create dialog, row actions + confirms, anti-lockout disable.

---

## Manual-Only Verifications (→ HUMAN-UAT)

| Behavior | Requirement | Why Manual |
|----------|-------------|------------|
| Real create → new user gets set-password email → signs in (first-ever recrutador) | USR-02 | Live EF + SMTP delivery |
| Real reset → email arrives | USR-05 | Live SMTP |
| Visual/glass/AA sweep on the live console | UI-SPEC | Human/axe live |

---

*Nyquist: every USR-01..05 requirement + the USR-07 UX + the error-code contract maps to a component/service test above. `nyquist_compliant` flips true when Wave 0 lands the test files.*
