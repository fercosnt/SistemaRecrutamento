# Milestones

## v1.0 M1 — MVP Candidato (Shipped: 2026-06-06)

**Phases completed:** 7 phases (1, 2, 3, 4, 4.1, 4.2, 5), 43 plans, 95 tasks
**Audit:** PASSED — 38/38 requirements satisfied, integration sound, CI green (run 27076233734). See `milestones/v1.0-MILESTONE-AUDIT.md`.
**Timeline:** 2025-11-05 → 2026-06-06 · ~47.9k LOC (src) · branch `backup/local-state-2026-04`

**Delivered:** A secure, mobile-first ATS candidate experience — register, log in, recover password, browse jobs, apply with CV upload, and view real application status on a profile page — built security-first on Supabase (Auth + DB + Storage + Edge Functions).

**Key accomplishments:**

- **Security foundation (Phase 1):** Removed the `service_role` client from the browser bundle (privileged ops moved to Edge Functions), unified auth into a single Zustand store with role derived from the JWT `app_metadata` (DB-lookup fallback), and replaced the dual ProtectedRoute/ProtectedAdminRoute system with a single role-aware `RoleGuard` (auth → role → children, preserved redirect). RLS anon-SELECT on `candidatos` moved to a `SECURITY DEFINER` RPC returning only a boolean.
- **Candidate registration (Phase 2):** End-to-end 4-step cadastro wired to a Deno Edge Function (Zod validation + atomic `candidatos` insert with rollback + LGPD consent), CPF/email duplicate-check via RPC, ViaCEP autofill, sessionStorage draft persistence, auto-login → `/candidato/perfil`. Verified by 13 Playwright scenarios + iPhone 12 Pro UAT.
- **Login + password recovery (Phase 3):** Login with remember-me (`persistSession`), anti-enumeration recovery flow, and a 3-state redefinir-senha machine — later migrated PKCE→email-OTP (Phase 5) to eliminate the cross-browser `code_verifier` deeplink failure. ~1.5k LoC of legacy auth code deleted.
- **Jobs + application (Phase 4):** Public job listing filtered by `status='ativa'`, slug-routed detail pages (anti-enumeration), and an atomic candidatura submit via Edge Function (two-client pattern, IDOR cross-check, 23505→DUPLICATE mapping) with private-bucket CV upload. VAGA-03 `?redirect=` preserved through login with an anti-open-redirect guard.
- **Auth hydration gate (Phase 4.1/4.2):** Introduced `hydrateFromSession` + `waitForCandidatoHydrated` to close the async gap between `onAuthStateChange` and navigation across all three login paths, plus a `RoleGuard` redirect-loop guard — establishing the smoke-runtime test gate Phase 4 lacked. Phase 1 verification artifacts backfilled.
- **Profile + hardening (Phase 5):** Real-data candidate profile, repaired the semantic-token system at its source (HSL channel triplets), root-level ErrorBoundary, first-ever GitHub Actions CI (unit + e2e + lighthouse) + Lighthouse CI + axe-core a11y at **zero WCAG A/AA violations**, two DB data-hygiene migrations, and a **fully green live CI run**.

**Known tech debt (deferred to M2 backlog):** PERF-01 ≤60s apply→display cache-invalidation window · HARD-02 Lighthouse Performance 0.62–0.68 (user-approved warn-baseline; bundle work post-M1) · FOUND-08 husky tsc gate bypassed pending 292-error baseline burn-down · stray RH-path debug `console.log`. Full detail in `milestones/v1.0-MILESTONE-AUDIT.md`.

---
