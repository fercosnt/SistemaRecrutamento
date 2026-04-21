---
phase: 2
slug: cadastro-candidato
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Sourced from `02-RESEARCH.md` §Validation Architecture (Pathway 8). Planner fills the Per-Task Verification Map once tasks exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (unit/integration)** | Vitest 3.x (already installed in package.json) |
| **Framework (E2E)** | Playwright 1.x (already installed, 4 specs in repo) |
| **Unit config** | `vitest.config.ts` |
| **E2E config** | `playwright.config.ts` |
| **Quick run command** | `npm run test:run` (Vitest single run) + `npm run lint` (tsc --noEmit) |
| **Full suite command** | `npm run test:run && npm run test:e2e && npm run build` |
| **Estimated runtime** | unit ~15s · E2E ~40-60s (headless) · full ~90s cold |

**Wave 0 dependency install:** Research Pathway 8 identified that `@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom` may not be in `package.json`. Verify in Wave 0; if missing, install as devDependencies.

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (Vitest changed-files) + `npm run lint` for the touched directory
- **After every plan wave:** Run `npm run test:run && npm run test:e2e -- --reporter=line`
- **Before `/gsd-verify-work`:** Full suite must be green — `test:run`, `test:e2e`, `build`
- **Max feedback latency:** 30 seconds (unit-level); 120 seconds (E2E per wave)

---

## Per-Task Verification Map

> **Planner fills this after tasks are created.** Template row below shows the required shape. Every task from `02-XX-PLAN.md` must produce at least one row here mapping to an automated command — OR declare a Wave 0 blocker that provides the scaffold.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _(planner fills)_ | _(01)_ | _(0)_ | _(CAD-XX)_ | _(— or T-02-XX)_ | _(e.g., "anon user cannot bypass duplicate check via anon SELECT")_ | unit / integration / e2e | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Based on RESEARCH.md §Validation Architecture. Wave 0 is a foundation/scaffolding wave that must complete BEFORE any feature code changes.

### Dependencies
- [ ] **Install testing-library** (if missing) — `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- [ ] **Verify Vitest JSDOM environment** — `vitest.config.ts` uses `environment: 'jsdom'` for hook tests
- [ ] **Upgrade `@supabase/supabase-js`** — 2.48.1 → ≥ 2.50.x (Research Pathway 9 carryover blocker; required for `rpc()` with `sb_publishable_` anon key)

### Test scaffolding (stubs per new/modified surface)
- [ ] `src/features/cadastro/hooks/__tests__/useCadastroDraft.test.ts` — stubs for save/load/clear/clearOnAuthChange/PII-exclusion
- [ ] `src/features/cadastro/hooks/__tests__/useLeaveGuard.test.ts` — stubs for beforeunload register/cleanup, dirty-state toggle
- [ ] `src/features/cadastro/hooks/__tests__/useDuplicateCheck.test.ts` — update existing or add: RPC path, rate_limited toast
- [ ] `src/features/cadastro/services/__tests__/cadastroService.test.ts` — update: `error_code` routing, auto-login + retry 1x, fallback to `/auth/login`
- [ ] `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` — update: `supabase.rpc('check_candidato_duplicate')` mock
- [ ] `e2e/cadastro-flow.spec.ts` — extend with 6 cases:
  1. Happy path: 4 steps → submit → auto-login → `/candidato/perfil` + toast
  2. EMAIL_EXISTS at submit → auto-navigate Step 1 + inline error + toast
  3. CPF_EXISTS at blur (debounce) → inline indicator + cannot advance Step 1
  4. LGPD mandatory unchecked → submit button disabled
  5. Draft restore: fill Step 1-2 → refresh → Step 1-2 pre-filled (senha empty)
  6. rate_limited response → toast "Muitas tentativas…" + field re-enabled

### Schema & infra audit (probes, not changes)
- [ ] **Audit `autorizacoes` columns in prod** — `\d public.autorizacoes` via Supabase SQL Editor. Research Open Question 2: confirm whether `ip_aceite`, `data_aceite`, `user_id` exist (Edge Function inserts them best-effort; baseline migration is 0 bytes, so column presence unverified).
- [ ] **Probe `inet_client_addr()`** — Research Open Question 1: write a 3-line SQL function returning `inet_client_addr()`, call from client via RPC, compare to browser's public IP. Decides if Phase 2 rate-limit uses IP or falls back to `auth.uid()`-only.
- [ ] **Verify SDK version** — after upgrade, confirm `rpc()` works with the `sb_publishable_` anon key format (Research Pathway 9).

### Exit criteria for Wave 0
- All 8 test stub files exist (green or pending, but file-present)
- `npm run test:run` passes with new stubs (empty `it.todo()` acceptable)
- `@supabase/supabase-js` upgraded and pinned; `npm run lint` passes (ignoring pre-existing `features/vagas` errors documented in KNOWN-ISSUES-CARRYOVER-PHASE-3.md)
- Audit SQL results captured in a comment at the top of `02-01-PLAN.md` or as an appendix here

---

## Manual-Only Verifications

Behaviors that cannot be automated within Phase 2's scope. Each must be executed during `/gsd-verify-work`.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iPhone 12 Pro viewport (390×844) form fills end-to-end without horizontal scroll, logout reachable | HARD-05 (carryover from Phase 5) | Playwright has mobile projects but visual regressions need eyeballs; UI-SPEC declares iPhone 12 Pro as mandatory baseline | Open Chrome DevTools → iPhone 12 Pro device emulation → complete Steps 1-4 → verify no horizontal scroll, no overflow, 44px touch targets, LGPD mandatory distinct |
| LGPD copy legal review (4 checkbox strings + policy text + "Saiba mais" modal) | CAD-05 | Legal compliance; needs human reviewer from the business/legal side | Export the 4 checkbox strings + policy V1.0 text from UI-SPEC §Microcopy Catalog → send to Beauty Smile legal/compliance lead → capture sign-off in PR |
| Edge Function redeploy after contract change (add `error_code`/`field`/`message`) | CAD-07 | Supabase CLI deploy is a manual command; cannot be in a unit test. Must verify `--no-verify-jwt` is applied (Phase 1 UAT blocker #1) | `supabase functions deploy cadastrar-candidato --no-verify-jwt` → curl OPTIONS + POST probes → verify 200/400 as expected |
| Production policy URL resolves | D-16 | The "Saiba mais" link points to a policy page that must exist in the Beauty Smile product / hosting; verifying 200 OK on prod URL is not a unit test | `curl -I https://beautysmile.com.br/politica-de-privacidade` OR inline modal with stamped text (acceptable fallback for MVP) |
| Rate-limit trigger on real user | D-12 | Emulating `inet_client_addr()` in unit tests is fragile; better to have one production smoke test at release | In a private tab, call `supabase.rpc('check_candidato_duplicate', …)` 31x in 60s → verify the 31st returns `{rate_limited: true}` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner fills)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (planner enforces)
- [ ] Wave 0 covers all MISSING references (dep install, test stubs, SDK upgrade, column audit, IP probe)
- [ ] No `--watch` flags in commands (all single-run for CI determinism)
- [ ] Feedback latency < 30s at task level, < 120s at wave level
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 completes

**Approval:** pending — Wave 0 completion
