---
phase: 05-perfil-hardening-mvp
plan: 06
subsystem: auth
tags: [supabase, otp, password-recovery, verifyOtp, pkce, react-hook-form, playwright, a11y, pitfall-7]

requires:
  - phase: 03-07
    provides: PKCE cross-browser recovery limitation finding (the bug D-15 eliminates)
  - phase: 05-02
    provides: passwordSchema as single source of password complexity (reused by WR-01 fix)
provides:
  - Email-OTP password recovery (verifyOtp type:'recovery') that works cross-browser/device — PKCE code_verifier deeplink dependency eliminated
  - 6-digit token field on the recovery schema + input-otp UI on RedefinirSenhaPage
  - Perfil change-password widget wrapped in a <form> (a11y) with enforced re-auth + passwordSchema validation (WR-01)
  - Rewritten e2e/password-recovery-flow.spec.ts (B10 unconditional, real-email scenarios Tier-2 skip-with-reason)
affects: [auth-recovery, perfil, e2e]

tech-stack:
  added: []
  patterns:
    - "flowType-independent OTP recovery: verifyOtp({type:'recovery'}) verifies the 6-digit {{ .Token }} regardless of client flowType — no client.ts change, login/OAuth PKCE preserved"
    - "Branded Supabase email template emits {{ .Token }} (6-digit OTP) instead of {{ .ConfirmationURL }} magic link — Dashboard config, not git"
    - "Re-auth gate for in-session password change: signInWithPassword({ email, password: atual }) before updateUser (WR-01)"

key-files:
  created: []
  modified:
    - src/features/auth/services/passwordService.ts
    - src/features/auth/schemas/redefinirSenhaSchema.ts
    - src/features/auth/hooks/useRecoverySession.ts
    - src/components/pages/EsqueciSenhaPage.tsx
    - src/components/pages/RedefinirSenhaPage.tsx
    - src/components/pages/MeuPerfilCandidatoPage.tsx
    - e2e/password-recovery-flow.spec.ts

key-decisions:
  - "(D-15) Migrate recovery PKCE magic-link → email-OTP via verifyOtp({type:'recovery'}); eliminates the cross-browser code_verifier-in-localStorage dependency that failed silently (Phase 3 03-07 finding)"
  - "(Pitfall 3) DO NOT flip client.ts flowType:'pkce' — OTP recovery is flowType-independent; login/OAuth PKCE security preserved (git diff on client.ts is empty)"
  - "(WR-01) User chose re-auth over dropping the field: handleAlterarSenha now reverifies the current password via signInWithPassword before updateUser, and validates the new password against the shared passwordSchema (>=8 + upper/lower/digit) instead of the ad-hoc min-6 check"
  - "Branded Beauty Smile recovery email kept; only the magic-link button/link swapped for a {{ .Token }} 6-digit code box + validity copy 24h → 1h (OTP expiry 3600s)"

patterns-established:
  - "Resume-after-blocking-checkpoint: fold deferred code-review findings (WR-01) BEFORE the human UAT so the human verifies the corrected code, not the parked code"

requirements-completed: [HARD-04]

duration: ~2 days wall-clock (code 2026-06-06 autonomous; parked at blocking human gates; resumed + UAT-approved 2026-06-06)
completed: 2026-06-06
---

# Phase 05 Plan 06: PKCE→OTP Password Recovery Migration Summary

**Password recovery migrated from PKCE magic-link to email-OTP (`verifyOtp({type:'recovery'})`), eliminating the cross-browser `code_verifier` deeplink failure; plus the perfil change-password widget hardened with a real re-auth gate + shared `passwordSchema` and wrapped in a `<form>` for a11y.**

## Performance

- **Tasks:** 4 (2 autonomous code + 1 BLOCKING human-action template edit + 1 BLOCKING human-verify UAT)
- **Files modified:** 7
- **Lint baseline:** 292 held (no growth); build exit 0

## Accomplishments
- **OTP recovery (D-15):** `verifyRecoveryOtp(email, token)` wraps `verifyOtp({type:'recovery'})` with `mapSupabaseError` + Pitfall-7 redaction (token NEVER logged); 6-digit token field added to `redefinirSenhaSchema`; `RedefinirSenhaPage` renders an `input-otp` 6-box input before the password fields; `EsqueciSenhaPage` carries the email forward in router state with D-09 anti-enumeration copy preserved.
- **Cross-browser fix proven:** real-email UAT — code arrives as a 6-digit OTP, redefinition + login succeed in a separate browser context (the PKCE failure mode is gone). `client.ts` `flowType:'pkce'` untouched (Pitfall 3).
- **WR-01 (resume fold-in):** `handleAlterarSenha` now requires + reverifies the current password (`signInWithPassword`) before `updateUser`, validates the new password against `passwordSchema` (≥8 + upper/lower/digit), and redacts auth error logs to `{ code, status }` (IN-02). UAT tests A (wrong current pw rejected), B (weak new pw rejected), C (happy path) all PASS.
- **a11y (HARD-04):** perfil change-password widget wrapped in a `<form>`; recovery routes pass axe with zero WCAG A/AA violations.
- **E2E:** `password-recovery-flow.spec.ts` rewritten around OTP entry; B10 unconditional (`test.fixme` count 0); real-email scenarios kept as Tier-2 skip-with-reason (D-04).

## Task Commits
1. **Task 1: OTP service + 6-digit token schema** - `b67f87e` (feat)
2. **Task 2: OTP UI + perfil form a11y + E2E rewrite** - `87c5811` (feat)
3. **Task 3: [BLOCKING human-action] Supabase "Reset Password" template → {{ .Token }}** - Dashboard config (not git); completed + saved by Fernando 2026-06-06
4. **Task 4: [BLOCKING human-verify] real-email cross-browser UAT + change-password widget** - approved 2026-06-06
5. **Resume fold-in: WR-01 re-auth + passwordSchema** - `226a57c` (fix)

**Supporting docs:** `680b52d` (deferred /vagas a11y flake), `9ce0f76` (park at checkpoint), `f74cf5f` (record WR-01 fold-in in checkpoint)

## Decisions Made
- See key-decisions frontmatter. The single new decision this resume cycle: **WR-01 resolved via re-auth** (option b) rather than dropping the "Senha Atual" field (option a) — user-selected; keeps the 3-field UI approved at the 05-02/05-03 smoke gates meaningful and closes the security gap.

## Deviations from Plan
None in the autonomous code (Tasks 1-2 executed as written). The WR-01 fold-in was a planned resume item explicitly logged in `05-06-CHECKPOINT.md` (from `05-REVIEW.md` WR-01), not unplanned scope.

## Issues Encountered
- **First UAT email still showed the magic link.** Root cause: the live Supabase "Reset Password" template (a pre-existing branded HTML) still used `{{ .ConfirmationURL }}`; Task 3 had not yet been saved. Resolved by replacing the button/link with a `{{ .Token }}` 6-digit code box (branding preserved) and requesting a fresh email. Confirmed: `flowType:'pkce'` does NOT prevent `{{ .Token }}` from rendering a usable OTP — `verifyOtp` is flowType-independent, as the D-15 design assumed.

## User Setup Required
**Supabase Dashboard email template (one-time, already applied):** Authentication → Email Templates → "Reset Password" must emit `{{ .Token }}` (6-digit OTP). Completed 2026-06-06. Not in git (Dashboard-only config).

## Next Phase Readiness
- Phase 5 plan execution complete (6/6). Ready for the orchestrator phase-verification gate.
- Deferred (non-blocking, logged in `deferred-items.md` / `05-REVIEW.md`): DEF-05-06-A (`/vagas` axe color-contrast flake), CR-01 (`input-background` token — design decision deferred to user), WR-04 / IN-01 / IN-03 (backlog).

---
*Phase: 05-perfil-hardening-mvp*
*Completed: 2026-06-06*
