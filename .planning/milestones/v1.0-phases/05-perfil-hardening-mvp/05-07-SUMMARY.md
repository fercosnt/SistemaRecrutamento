---
phase: 05-perfil-hardening-mvp
plan: 07
subsystem: ci-e2e-a11y
tags: [gap-closure, a11y, e2e, playwright, ci, axe, background-image]
gap_closure: true
requires:
  - "05-06 (OTP recovery page — introduced the #token input-otp a11y node)"
  - "05-02 (globals.css channel-triplet token repair — NOT touched here)"
provides:
  - "Deterministic green a11y error-gate on all 5 public routes (0 WCAG A/AA violations x3 runs)"
  - "Full chromium suite green under CI-condition env (31 passed / 42 skipped / 0 failed / 0 flaky x2)"
  - "BackgroundImage solid dark base layer (resilience + axe-computable contrast)"
affects:
  - "GAP-05-CI-1..5 closed → SC2/HARD-01 + SC4/HARD-04 honest-close at the deterministic-core layer"
tech-stack:
  added: []
  patterns:
    - "axe .exclude(selector) with tracked reason (D-08 sanctioned deferral) for library/placeholder false-positives"
    - "test-scoped page.route fixtures (not describe-scoped) to keep sibling tests' real-navigation gating intact"
    - "unconditional solid base color behind async background-image for both a11y and visual resilience"
key-files:
  created:
    - .planning/phases/05-perfil-hardening-mvp/05-07-SUMMARY.md
  modified:
    - src/components/BackgroundImage.tsx
    - e2e/a11y.spec.ts
    - e2e/cadastro-flow.spec.ts
    - e2e/vagas-browse.spec.ts
    - e2e/password-recovery-flow.spec.ts
decisions:
  - "BackgroundImage gets an unconditional bottom-most bg-[#00109E] layer (hex literal, not bg-primary token) — must render independent of token resolution + image load (ErrorBoundary precedent, PATTERNS §App.tsx)"
  - "Two residual axe nodes the base layer cannot fix are deferred via .exclude with tracked reasons: Select trigger placeholder muted-foreground (#989ed6, F-04.1-A) and the input-otp transparent #token input (GAP-05-CI-4 false-positive) — visible digit slots stay scanned"
  - "vagas B-J01 mock is test-scoped (not describe-scoped) so B-J02/B-J03/B-J04 keep real-navigation + self-skip-on-zero-cards gating"
metrics:
  duration: ~35 min
  tasks: 4
  files_changed: 5
  completed: 2026-06-06
---

# Phase 5 Plan 07: CI Gap-Closure (GAP-05-CI-1..5) Summary

**One-liner:** Closed the 5 live-CI gaps by giving `BackgroundImage` an unconditional solid dark base layer (fixes the axe-vs-background-image color-contrast root cause across all public glass routes), tracking two residual non-fixable axe nodes via `.exclude` (Select placeholder + input-otp transparent input), gating the real-submit cadastro happy-path as Tier-2, and adding `page.route` fixtures for vagas B-J01 and the recovery-B10 candidatos hydration — yielding a deterministic green chromium suite under the exact CI-condition env.

## What Was Built

This is a gap-closure plan: it turns CI green without feature behavior changes. The first-ever live GitHub Actions run (run 27073197523) surfaced 5 gaps; config defects were already fixed in 7f51806, and this plan fixes the test suite + one shared UI primitive.

| Task | Gap(s) | Change |
|------|--------|--------|
| 1 | GAP-05-CI-4 + GAP-05-CI-5 | `BackgroundImage` solid dark base layer + a11y `.exclude` tracking |
| 2 | GAP-05-CI-1 | Gate cadastro happy-path real-submit as Tier-2 (skip-with-reason) |
| 3 | GAP-05-CI-2 + GAP-05-CI-3 | `page.route` fixtures: vagas list (B-J01) + recovery candidatos (B10) |
| 4 | SC2/SC4 acceptance | Full chromium suite + lint/build/vitest invariants green |

### Root cause of the a11y failures (GAP-4/5)

axe-core cannot compute contrast against the async CSS `background-image` (a `.jpeg` loaded with `opacity-0` until onload). It walked up to the nearest solid color — the light body background (`#ffffff`) — and reported every white-text element as ~1.3:1. The fix renders a solid `#00109E` (brand primary, ~12:1 vs white) as the bottom-most, unconditional layer behind the image. This is a genuine resilience improvement (white text always has a dark backdrop even if the image 404s) AND gives axe a real dark ancestor. One edit cascaded to all 4 failing public glass routes.

The base layer eliminated the dominant white-on-light violations but surfaced two residual nodes it cannot fix (both pre-existing, both tracked):

1. **Select trigger placeholder** — shadcn `<Select>` placeholder text renders in muted-foreground `#989ed6` over the dark glass `#303c9d` (~3.62:1) at the not-yet-chosen "Selecione uma opção" state. This is the F-04.1-A backlog finding (muted-token-on-glass), not a BackgroundImage issue. Deferred via `.exclude('[data-slot="select-trigger"]')`.
2. **input-otp transparent `#token` input** — the `input-otp@1.4.2` library renders a real but intentionally transparent `<input id="token">`; the six visible digits are painted by the `InputOTPSlot` divs. axe flags the transparent input's own text color vs glass (~3:1 large-text) — a false-positive since the element carries no perceivable text. Deferred via `.exclude('#token')`. The visible digit slots remain scanned.

Both exclusions follow the D-08 sanctioned mechanism (`.exclude` with a tracked tracking comment) per the a11y spec's own header, not a gate disable. The other 4 routes / all non-excluded nodes remain scanned at AA.

## Verification (actual output under CI-condition env)

CI-condition env for every run:
`CI=true E2E_AUTH_TEST_USERS='' VITE_SUPABASE_URL=https://placeholder.supabase.co VITE_SUPABASE_ANON_KEY=placeholder-anon-key-for-ci-mocked-tests`

| Check | Result |
|-------|--------|
| `e2e/a11y.spec.ts` (5 public routes) | **5 passed** x3 consecutive runs — 0 flaky |
| `e2e/cadastro-flow.spec.ts` | **12 passed / 4 skipped** x2 — happy-path skip-with-reason; mock/anon core green |
| `e2e/vagas-browse.spec.ts` + `e2e/password-recovery-flow.spec.ts` | **8 passed / 4 skipped** x2 — B-J01 renders fixture list, B10 reaches `/candidato/perfil` |
| **Full `npx playwright test --project=chromium`** | **31 passed / 42 skipped / 0 failed / 0 flaky** x2, exit 0 |
| `npm run lint` tsc error count | **292** (zero growth from baseline) |
| `npm run build` | **exit 0** (built in ~6.3s) |
| `npm run test:run` (vitest) | **357 passed / 1 failed** — the 1 failure is the pre-existing `LoadingProgress.test.tsx` carryover from Phase 2/3 [02-06], NOT a regression |

The a11y determinism check ran 5x before the second `.exclude` was added (mapping the flaky `#token` node), then 3x after — all green. Tier-2 / seed-gated specs that skip-with-reason are expected and allowed.

## Deviations from Plan

### Auto-fixed / scope-clarified

**1. [Rule 3 - Blocking] a11y gate required two `.exclude` deferrals beyond the BackgroundImage base layer**
- **Found during:** Task 1
- **Issue:** The plan's hypothesis was that the BackgroundImage solid base layer alone closes GAP-4/5. It closed the dominant white-on-light failures, but two residual nodes remained: the shadcn Select placeholder muted-foreground (`#989ed6`, F-04.1-A) and the input-otp transparent `#token` input (GAP-05-CI-4, an axe false-positive). Neither is fixable via BackgroundImage; the Select node needs a token/placeholder-color change (explicitly OUT of plan scope — no token/feature work) and the `#token` node carries no perceivable text.
- **Fix:** Added two `.exclude(selector)` calls in `e2e/a11y.spec.ts`, each with a tracked tracking comment, per the spec header's own D-08 sanctioned mechanism ("for known-unfixable elements this phase, prefer `.exclude(selector)` with a tracking comment over disabling the whole gate"). Task 4 explicitly authorizes addressing "any remaining axe contrast node" within scope. `e2e/a11y.spec.ts` was not in the plan's `files_modified` frontmatter, but this is the in-spirit, scope-compliant close of GAP-4/5 — test-config only, no token, feature, globals.css, or tailwind.config.js edits.
- **Files modified:** `e2e/a11y.spec.ts`
- **Commit:** 65666c0

No other deviations. service_role never touched; globals.css / tailwind.config.js never touched; performance never touched; unrelated M2 docs (`docs/prds/*`, `docs/conhecimento/`, `docs/prds/m2-funil-rh/`) never staged.

## Commit Protocol Note

All commits used the sanctioned `git -c core.hooksPath=/dev/null` bypass to skip the frozen 292-error tsc pre-commit baseline — the established Phase 05 convention (precedent [03-01]..[05-06]), documented in this plan's `<objective>`. The change set (test-only + one primitive edit) did not grow the 292 baseline.

## Known Stubs

None. The vagas/candidatos JSON fixtures are synthetic E2E test data committed to test files (non-PII placeholders), not application stubs.

## Out of Plan's Autonomous Scope (Human-Owned)

The live GitHub Actions run on `backup/local-state-2026-04` is the human-owned confirmation gate that flips HARD-01 to a real green check (tracked as the phase's `human_verification` item in 05-VERIFICATION.md). This plan green-lights the deterministic core locally under the exact CI-condition env, but does not push.

## Self-Check: PASSED

- `src/components/BackgroundImage.tsx` — FOUND (modified, contains `bg-[#00109E]`)
- `e2e/a11y.spec.ts` — FOUND (two tracked `.exclude` deferrals)
- `e2e/cadastro-flow.spec.ts` — FOUND (Tier-2 gate)
- `e2e/vagas-browse.spec.ts` — FOUND (vagas list fixture)
- `e2e/password-recovery-flow.spec.ts` — FOUND (candidatos hydration mock)
- `.planning/phases/05-perfil-hardening-mvp/05-07-SUMMARY.md` — FOUND
- Commit 65666c0 (Task 1) — verified in git log
- Commit b400227 (Task 2) — verified in git log
- Commit 76e8ffd (Task 3) — verified in git log
