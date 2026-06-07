---
phase: 1
slug: foundation-saneada
status: validated
nyquist_compliant: true
wave_0_complete: true
validated_by: phase-4.2
validated_at: 2026-04-27
created: 2026-04-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.7 (unit) + Playwright 1.56.1 (E2E) |
| **Config file** | `vite.config.ts` (inline vitest config) + `playwright.config.ts` |
| **Quick run command** | `npm run test:run` |
| **Full suite command** | `npm run test:run && npm run test:e2e` |
| **Estimated runtime** | ~30 seconds (unit) + ~120 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run test:run && npm run lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FOUND-01 | T-1-01 | No service_role key in build output | build | `npm run build && ! grep -r 'service_role' build/` | No | ⬜ pending |
| 1-01-02 | 01 | 1 | FOUND-12 | T-1-01 | No supabaseAdmin in src/ | grep | `! grep -r 'supabaseAdmin' src/` | No | ⬜ pending |
| 1-01-03 | 01 | 1 | FOUND-11 | — | No manual Lembrar-me flags | grep | `! grep -r 'auth-session-temporary' src/` | No | ⬜ pending |
| 1-02-01 | 02 | 1 | FOUND-02 | — | Single auth store with all fields | unit | `vitest run src/store/__tests__/authStore.test.ts` | No | ⬜ pending |
| 1-02-02 | 02 | 1 | FOUND-06 | T-1-04 | Cross-tab logout via onAuthStateChange | manual | Manual: 2 tabs, logout in one | No | ⬜ pending |
| 1-03-01 | 03 | 2 | FOUND-04 | — | RoleGuard redirects correctly | unit | `vitest run src/components/__tests__/RoleGuard.test.tsx` | No | ⬜ pending |
| 1-03-02 | 03 | 2 | FOUND-05 | — | Redirect preserves ?redirect= | unit | Same RoleGuard test | No | ⬜ pending |
| 1-04-01 | 04 | 2 | FOUND-09 | — | Migrations consolidated | build | `npm run db:types && npm run lint` | No | ⬜ pending |
| 1-04-02 | 04 | 2 | FOUND-07 | — | db:types + tsc passes | build | `npm run db:types && npm run lint` | No | ⬜ pending |
| 1-04-03 | 04 | 2 | FOUND-08 | — | Pre-commit runs tsc | manual | `git commit --allow-empty -m "test"` | No | ⬜ pending |
| 1-05-01 | 05 | 3 | FOUND-03 | T-1-03 | Role in JWT via hook | integration | Requires Supabase local | No | ⬜ pending |
| 1-05-02 | 05 | 3 | FOUND-10 | T-1-02 | RPC returns {cpf_exists, email_exists} | integration | Requires Supabase local | No | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/__tests__/authStore.test.ts` — stubs for FOUND-02, FOUND-06
- [ ] `src/components/__tests__/RoleGuard.test.tsx` — stubs for FOUND-04, FOUND-05
- [ ] Vitest setup file with auth store mocks / Supabase client mock
- [ ] `npm run db:types` script in package.json

*Existing Vitest infrastructure covers test runner; stubs needed for new modules.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-tab logout | FOUND-06 | Browser storage events hard to test in Vitest | Open 2 tabs, logout in one, verify other logs out |
| Pre-commit hook runs tsc | FOUND-08 | Git hook cannot be tested in unit tests | Make a commit, verify tsc runs |
| Custom Access Token Hook enabled | FOUND-03 | Requires Supabase Dashboard action | Decode JWT after login, verify role claim exists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
