---
phase: 28
status: fixed
critical: 0
warnings: 4
nits: 4
---

# Phase 28 — Code Review (resolved)

Deep review of the 6 security-core source files. **0 Critical, 4 Warning, 4 Nit** — all applied. Authenticate-THEN-authorize confirmed correct and non-bypassable (table-sourced role, fails closed, two-client D-23, advisory-lock anti-lockout).

## Warnings (all fixed)

- **WR-01 — self-promotion closure was undeclared/untested.** Baseline write-policy names (`usuarios_rh_update_own` etc.) are ABSENT live (verified: `usuarios_rh` has only 3 SELECT policies, zero write policies) and a live recrutador self-promotion `UPDATE` affects **0 rows**. Made it declarative (idempotent `DROP POLICY IF EXISTS` for the baseline write-policy names in migration 000001) + added a regression assertion (SEG-02 smoke case 5) + re-proved live post-fix.
- **WR-02 — recovery `redirectTo` trusted the client `Origin` header** (account-takeover surface). `resolveOrigin` now prefers the server-trusted `PUBLIC_APP_URL` env; an `Origin` is honored only if on an explicit allowlist; else the hardcoded prod URL.
- **WR-03 — RPC invalid-action reused ERRCODE `P0001`** (which the EF maps to LAST_ADMIN). Changed to `22023` (invalid_parameter_value) + added a `22023 → VALIDATION` arm to `mapMutacaoError`. Re-applied the RPC to PROD.
- **WR-04 — denied/blocked privileged attempts left no audit trail.** Added best-effort `categoria='seguranca'` (purge-exempt) security audit on the 403 path and both LAST_ADMIN paths (EF pre-count + trigger-raised).

## Nits (all fixed)

- **IN-01** — orphan GoTrue identity on a *thrown* create-RPC: wrapped createUser+RPC; compensating `deleteUser` now runs on a thrown rejection too.
- **IN-02** — `resetar_senha` target lookup now scoped `.is('deleted_at', null)` (no recovery link to a soft-deleted user).
- **IN-03** — email schema reordered `.trim().toLowerCase().email()` (was validating before trimming).
- **IN-04** — `criar` now returns the new `usuarios_rh.id` (`usuarioRhId`) alongside `userId` (Phase-29 console contract).

## Post-fix gates

- `deno check` clean · Deno EF test **9/9** · tsc **104** · Vitest **775/775** · EF redeployed, boot smoke **401** · WR-01 self-promotion denial re-proved live (0 rows).
- PROD re-applied: WR-01 defensive drops (no-op) + WR-03 RPC ERRCODE fix (`usr_rh_review_fixes_wr01_wr03`).
