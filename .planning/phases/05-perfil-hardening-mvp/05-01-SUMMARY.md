---
phase: 05-perfil-hardening-mvp
plan: 01
subsystem: testing
tags: [github-actions, ci, lighthouse, lhci, playwright, axe-core, vitest, e2e, a11y, error-boundary]

requires:
  - phase: 04-1-auth-hydration-fix
    provides: "Wave-0-RED-scaffold + smoke-runtime gate discipline; pitfall7.grep node:fs guard idiom; jest-dom triple-slash shim precedent; lint baseline 296"
  - phase: 03-login-recuperacao-senha
    provides: "login-flow.spec.ts makeJwt + page.route mock idiom; candidatura-submit.spec.ts Tier-2 env-gating idiom"
provides:
  - "First-ever GitHub Actions CI pipeline (.github/workflows/ci.yml) — unit (lint+vitest) + e2e (playwright chromium) + lighthouse jobs"
  - "Lighthouse CI config (lighthouserc.cjs) — vite preview port 4173, mobile preset, minScore 0.8 Perf+A11y on 3 public routes"
  - "e2e/a11y.spec.ts — AxeBuilder WCAG A/AA scan loop over 4 public routes (unconditional Tier-1)"
  - "e2e/perfil.spec.ts — PERF-01/02 Tier-1 mocked-auth shell smoke + Tier-2 env-gated real round-trip"
  - "ErrorBoundaryRoot render-catch test (HARD-03 scaffold for 05-03 App-root hoist)"
  - "DevNav DEV-gate grep guard (HARD-06) — node:fs regex assertion on App.tsx"
  - "@lhci/cli + @axe-core/playwright devDependencies"
affects: [05-03-perfil-polish, 05-04-a11y, 05-02-design-system, phase-verification]

tech-stack:
  added: ["@lhci/cli@^0.15.1", "@axe-core/playwright@^4.11.3"]
  patterns:
    - "CI quality-gate infra (no prior .github/ — net-new pipeline)"
    - "LHCI config as .cjs (not .js) under package type:module"
    - "Tier-1 deterministic mock + Tier-2 env-gated skip-with-reason (carried from Phase 3/4 E2E)"
    - "node:fs grep guard under __tests__/ for vitest collection"

key-files:
  created:
    - ".github/workflows/ci.yml"
    - "lighthouserc.cjs"
    - "e2e/a11y.spec.ts"
    - "e2e/perfil.spec.ts"
    - "src/components/__tests__/ErrorBoundaryRoot.test.tsx"
    - "src/__tests__/guards/devnav-gate.grep.test.ts"
  modified:
    - "package.json"
    - "package-lock.json"
  deleted:
    - "e2e/job-application-flow.spec.ts"

key-decisions:
  - "lighthouserc.js → lighthouserc.cjs: package.json has type:module, so a .js module.exports config resolves to {} under ESM and LHCI crashes; .cjs is the verified correct extension"
  - "DevNav grep guard placed under src/__tests__/guards/ (not plan's tests/guards/): vitest include glob is **/__tests__/**, so tests/guards/ would never be collected — matches pitfall7.grep precedent"
  - "Canonical ErrorBoundary = src/components/ErrorBoundary.tsx (richer 8.3KB BeautySmileLogo+GlassCard fallback); 05-03 hoists THIS one to App root and deletes/re-exports the cadastro copy"
  - "Vitest v4 console-spy any escape hatch reused from STATE.md [02-04] for the ErrorBoundaryRoot console.error suppression typing"

patterns-established:
  - "GitHub Actions CI gate: lint(296-invariant) + vitest + playwright chromium + LHCI; VITE_ env only for anon-safe vars (service_role never VITE_-prefixed)"
  - "LHCI as .cjs under ESM packages"
  - "a11y route-loop spec (AxeBuilder WCAG A/AA) for public routes; auth-gated routes go Tier-2"

requirements-completed: [HARD-01, HARD-02, HARD-03, HARD-04, HARD-06, PERF-01, PERF-02]

duration: ~18min
completed: 2026-06-06
---

# Phase 5 Plan 01: Wave 0 Quality-Gate Infrastructure Summary

**First-ever GitHub Actions CI pipeline (unit+e2e+lighthouse) + Lighthouse CI config + axe-core a11y spec + perfil E2E (Tier-1 mock / Tier-2 env-gated) + ErrorBoundary-root and DevNav grep scaffolds — the Nyquist sampling infra every downstream Phase 5 wave gates against.**

## Performance

- **Duration:** ~18 min (continuation: Task 1 pre-committed at 0814af1; Tasks 2-3 + finalize this session)
- **Completed:** 2026-06-06
- **Tasks:** 3 (Task 1 prior session, Tasks 2-3 this session)
- **Files created:** 6 / **deleted:** 1 / **modified:** 2

## Accomplishments

- **CI pipeline (HARD-01/D-03):** `.github/workflows/ci.yml` — three jobs (unit lint+vitest, e2e playwright chromium, lighthouse), enforces the 296 lint zero-growth invariant as a CI-red gate (Task 1).
- **LHCI (HARD-02/D-05):** `lighthouserc.cjs` — vite preview port 4173, mobile preset, minScore 0.8 Performance+Accessibility on the 3 public routes (Task 1).
- **a11y spec (HARD-04/D-08):** `e2e/a11y.spec.ts` — AxeBuilder WCAG2 A/AA scan loop over `/auth/login`, `/auth/esqueci-senha`, `/cadastro`, `/vagas` (Task 2).
- **perfil E2E (PERF-01/02/D-01):** `e2e/perfil.spec.ts` — Tier-1 mocked-auth shell smoke (lands on `/candidato/perfil`, logout reachable) + Tier-2 env-gated real-candidaturas round-trip; zero fixme (Task 2).
- **HARD-03 scaffold:** `ErrorBoundaryRoot.test.tsx` — canonical `src/components/ErrorBoundary.tsx` catches a throwing child → "Ops! Algo deu errado" fallback renders (Task 3).
- **HARD-06 guard:** `devnav-gate.grep.test.ts` — node:fs regex asserts `import.meta.env.DEV && <DevNavigationMenu` stays in App.tsx (Task 3).
- **Deps + prune:** `@lhci/cli` + `@axe-core/playwright` installed; legacy `e2e/job-application-flow.spec.ts` (PRD-0005 duplicate) deleted (Task 1).

## Task Commits

1. **Task 1: Install LHCI+axe; prune legacy spec; author CI+LHCI config** — `0814af1` (chore, prior session)
2. **Task 2: Author a11y + perfil E2E specs** — `128c224` (test)
3. **Task 3: ErrorBoundary root render test + DevNav grep guard** — `a247e56` (test, tdd — both scaffolds GREEN on first run)

**Plan metadata:** this commit (docs).

## Files Created/Modified

- `.github/workflows/ci.yml` — net-new CI pipeline (unit+e2e+lighthouse), 296-lint gate, VITE_ anon-only env (Task 1)
- `lighthouserc.cjs` — LHCI config, port 4173, minScore 0.8 Perf+A11y ×2 public-route budgets (Task 1)
- `e2e/a11y.spec.ts` — 4-public-route AxeBuilder WCAG A/AA loop (Task 2)
- `e2e/perfil.spec.ts` — Tier-1 mock + Tier-2 `test.skip(!E2E_REAL_LOGIN, ...)` (Task 2)
- `src/components/__tests__/ErrorBoundaryRoot.test.tsx` — 2 tests: catch-throw + happy-path (Task 3)
- `src/__tests__/guards/devnav-gate.grep.test.ts` — 1 grep guard (Task 3)
- `package.json` / `package-lock.json` — 2 devDependencies (Task 1)
- `e2e/job-application-flow.spec.ts` — DELETED (Task 1, D-04 legacy prune)

## Decisions Made

- **lighthouserc.js → .cjs** — package.json `type:module` makes a `.js` `module.exports` resolve to `{}` under ESM → LHCI crashes. `.cjs` forces CommonJS. The plan's `files_modified: lighthouserc.js` should be read as `lighthouserc.cjs`.
- **DevNav guard path** — placed at `src/__tests__/guards/devnav-gate.grep.test.ts` (not plan's `tests/guards/`) because vitest `include` is `**/__tests__/**/*.{test,spec}.{ts,tsx}`; the plan path would not be collected and the verify command would find zero tests. Matches the `pitfall7.grep` precedent.
- **Canonical ErrorBoundary** — `src/components/ErrorBoundary.tsx` (richer fallback) chosen and documented in the test header; 05-03 hoists this one.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] lighthouserc.js → lighthouserc.cjs (Task 1, prior session)**
- **Found during:** Task 1
- **Issue:** Plan named the config `lighthouserc.js`, but package.json `type:module` makes a `.js` `module.exports` config resolve to `{}` under ESM, crashing `lhci autorun`.
- **Fix:** Authored as `lighthouserc.cjs` (CommonJS); verified `node -e "require('./lighthouserc.cjs')"` exits 0.
- **Files modified:** lighthouserc.cjs (in place of lighthouserc.js)
- **Verification:** `node -e "require('./lighthouserc.cjs')"` OK; `npx lhci autorun --help` resolves.
- **Committed in:** 0814af1 (Task 1 commit)

**2. [Rule 3 - Blocking] DevNav grep guard relocated to src/__tests__/guards/ (Task 3)**
- **Found during:** Task 3
- **Issue:** Plan prescribed `tests/guards/devnav-gate.grep.test.ts`, but vitest.config.ts `include` only collects `**/__tests__/**/*.{test,spec}.{ts,tsx}` — the plan path would never run, so the verify command `npm run test:run -- devnav-gate` would match zero tests.
- **Fix:** Placed the guard at `src/__tests__/guards/devnav-gate.grep.test.ts` (inside a `__tests__/` dir), matching both the include glob and the pitfall7.grep precedent. Documented in the file header.
- **Files modified:** src/__tests__/guards/devnav-gate.grep.test.ts
- **Verification:** `npm run test:run -- devnav-gate` → 1 passed.
- **Committed in:** a247e56 (Task 3 commit)

**3. [Rule 1 - Bug] Vitest v4 console-spy typing grew lint baseline to 297 (Task 3)**
- **Found during:** Task 3
- **Issue:** `let errorSpy: ReturnType<typeof vi.spyOn>` for `console.error` triggered TS2322 (Vitest v4 overloaded-method spy signature mismatch), pushing the lint count 296 → 297.
- **Fix:** Applied the `any` escape hatch documented in STATE.md decision [02-04] for overloaded DOM/console method spies.
- **Files modified:** src/components/__tests__/ErrorBoundaryRoot.test.tsx
- **Verification:** `npm run lint` → 296 (back to baseline); 3 tests pass.
- **Committed in:** a247e56 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug). All in test/config scope; zero source-behavior changes. No scope creep.
**Impact on plan:** All three were necessary for the prescribed verify commands to actually execute and for the 296-lint invariant to hold. The lighthouserc.cjs and grep-path fixes correct plan-text mismatches against verified codebase config.

## Commit Policy Note

All commits used `git commit --no-verify` per the project's sanctioned escape (`.husky/pre-commit` runs `tsc --noEmit` against 296 pre-existing legacy errors documented in STATE.md/PROJECT.md). The lint baseline held at **296** throughout — confirmed after every task; no new TS errors in any file this plan touched.

## Known Stubs

None. The E2E specs are intentional Wave 0 scaffolds (skip-with-reason for Tier-2, never fixme) — the RED a11y assertions are the downstream contract for 05-04, not stubs. Both grep/render scaffolds pass GREEN now.

## Issues Encountered

None beyond the 3 auto-fixed deviations above.

## User Setup Required

**GitHub Actions CI requires repo-side verification (HARD-01 / user_setup):** after merge, confirm the workflow appears under the repo **Actions** tab and the first run is green (Tier-1 only — no Supabase secrets required; Tier-2 live secrets are a Plan 05-04 follow-up). Optional repo secrets `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` enable Tier-2 later; service_role must NEVER be `VITE_`-prefixed.

## Next Phase Readiness

- All Phase 5 downstream waves now have automated verify commands to gate against (CI green, LHCI budget, a11y scan, perfil E2E, ErrorBoundary + DevNav guards).
- 05-02 (design-system) / 05-03 (perfil polish) / 05-04 (a11y fixes) can flip the RED a11y/perfil assertions GREEN.
- 05-03 hoists the canonical `src/components/ErrorBoundary.tsx` to App root (HARD-03).

## Self-Check: PASSED

All 7 created files verified present on disk; all 3 task commits (0814af1, 128c224, a247e56) verified in git log.

---
*Phase: 05-perfil-hardening-mvp*
*Completed: 2026-06-06*
