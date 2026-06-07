# Phase 05 — Deferred Items

Out-of-scope discoveries logged during plan execution (SCOPE BOUNDARY rule).
These are NOT fixed by the plan that discovered them.

## 05-06

### DEF-05-06-A — `/vagas` axe `color-contrast` (serious) is data-dependent / flaky

- **Discovered during:** 05-06 Task 2 (running the full `e2e/a11y.spec.ts` after
  adding `/auth/redefinir-senha` to the route loop).
- **Symptom:** `a11y: /vagas has no WCAG A/AA violations` fails with multiple
  `color-contrast` (serious) violations on the live vaga cards / status badges.
- **Why deferred:** Out of scope for 05-06 (PKCE→OTP recovery). Plan 05-06 touched
  ZERO vagas surfaces (`git diff` confirmed). The failure is data-dependent — it
  PASSED in the first a11y run this session and FAILED in a later run with the same
  recovery-page code, depending purely on which vagas/badge colors render at scan
  time. 05-04 recorded this gate as GREEN; the regression is in the live-data
  vagas rendering, not in any recovery/auth code.
- **Recovery-page gate (the 05-06 responsibility) is GREEN:** `/auth/esqueci-senha`
  and `/auth/redefinir-senha` both pass axe with zero WCAG A/AA violations.
- **Suggested owner:** a dedicated vagas-a11y / badge-token follow-up (cross-refs
  the Phase 4 F-04-08-G white-text-contrast backlog item) — pin the vaga seed data
  in the a11y harness or fix the badge token contrast so the scan is deterministic.
