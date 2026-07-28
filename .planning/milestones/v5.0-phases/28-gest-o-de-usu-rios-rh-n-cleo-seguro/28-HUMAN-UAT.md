# Phase 28 — HUMAN-UAT (deferred live checks)

**Status:** deferred (verification passed 5/5; these 2 items are live-environment-gated, not gaps)
**Context:** the backend is proven on PROD (migrations applied, EF deployed, 3 behavioral smokes GREEN). These two need a live human round-trip that no automated smoke can perform.

## 1. Recovery / set-password email delivery (USR-02 / USR-05)

- **What:** When `administrador` creates a user (or triggers a password reset), the target should receive a set-password email (`/auth/redefinir-senha?tipo=rh`) and be able to set a password + sign in.
- **Why deferred:** The EF *dispatch* (`resetPasswordForEmail` with the right `redirectTo`, non-fatal `EMAIL_SEND_FAILED` on send failure) is verified in the Deno handler test. Actual inbox delivery depends on the project's live SMTP/GoTrue config (built-in SMTP is 2 emails/hr).
- **How to test (after Phase 29's console UI, or via a direct EF call):** create a real test RH user; confirm the email arrives; complete the set-password flow; sign in. **Flag if a custom SMTP is needed** (built-in rate limit).

## 2. USR-07 anti-lockout under real concurrency (2-session write-skew)

- **What:** Two overlapping sessions each demoting a different admin, reduced to exactly two active admins, must serialize on `pg_advisory_xact_lock` so exactly one succeeds and ≥1 active admin always remains.
- **Why deferred:** Single-session SQL cannot truly parallelize. Cases 1–4 (last-admin demote/deactivate/delete → P0001; non-last allowed) are GREEN on PROD; the advisory-lock code path is in place.
- **How to test:** Follow the documented 2-session procedure in `supabase/tests/usr_rh_anti_lockout_smoke.sql` §(5) against a disposable 2-admin state; assert S1 commits, S2 raises `P0001`, and ≥1 admin remains.

---
*Both are confirmatory of an already-proven boundary. Carry forward to the milestone-close HUMAN-UAT sweep.*
