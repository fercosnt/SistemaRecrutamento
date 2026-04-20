---
status: complete
phase: 01-foundation-saneada
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
  - 01-05-SUMMARY.md
started: 2026-04-20T18:47:14Z
updated: 2026-04-20T23:15:00Z
completed: 2026-04-20T23:15:00Z
verdict: "Phase 1 structurally complete. 7/11 pass, 3 issues (all with documented phase-fix targets), 1 blocked by dependency. Core security objective (service_role removal) verified. Auth read-path bugs route to Phase 3; Edge Function deploy flags + SDK version route to Phase 2."
---

## Current Test

status: session complete (11/11 tests processed)

## Tests

### 1. Cold Start Smoke Test
expected: From a clean state (kill any running vite dev server; ideally rm -rf node_modules && npm install to simulate fresh clone), run `npm run dev` on port 3003. The server boots without errors, http://localhost:3003 loads the home page, and the browser console shows no red errors (warnings ok).
result: pass

### 2. Service Role Not in Production Bundle
expected: Run `npm run build` then `grep -r "service_role" build/` — zero matches. Also `grep -r "VITE_SUPABASE_SERVICE_ROLE_KEY" build/` — zero matches. This confirms the CRITICAL vulnerability is fixed for any deployed build.
result: pass

### 3. Login Persistence Without Manual Lembrar-me
expected: Log in as a candidato (any existing user). Confirm you reach the candidato area. Refresh the page (F5). You are still logged in — no redirect to /auth/login. Open DevTools → Application → Local Storage — there is NO `auth-session-temporary` key, NO `auth-was-temporary` key. Only `auth-storage` (Zustand persist) and `sb-<project-ref>-auth-token` (Supabase) exist.
result: pass
notes: "All 4 legacy keys (auth-session-temporary, auth-was-temporary, admin-auth-session-temporary, admin-auth-was-temporary) confirmed absent. admin-auth-storage exists with null state as expected side-effect of the compat shim (useAdminAuthStore re-export triggers its own persist slot but holds no meaningful state). Session persists after F5. Bugs 1 and 2 from KNOWN-ISSUES-CARRYOVER-PHASE-3 reproduce as expected — out of scope for this test."

### 4. Unauthenticated Redirect Preserves Destination
expected: While logged out, type http://localhost:3003/candidato/perfil in the URL bar and press Enter. You are redirected to `/auth/login?redirect=%2Fcandidato%2Fperfil` (note the URL-encoded `/candidato/perfil` in the query string). This is the new RoleGuard behavior — old ProtectedRoute used location.state (lost on reload).
result: pass

### 5. Cross-Role Redirect with Toast
expected: Known limitation — Bug 1 in KNOWN-ISSUES-CARRYOVER-PHASE-3.md means `role` may be null for candidato after login (extractRole reads wrong source). If role IS populated correctly (e.g. for RH users where the DB-lookup fallback works), a candidato visiting `/rh/dashboard` should be redirected to `/candidato/perfil` with a Sonner toast that says something like "Esta area e exclusiva para recrutadores". If Bug 1 blocks this test, mark as blocked with note "blocked by extractRole bug (Phase 3 fix)".
result: issue
reported: "Candidato logou via /auth/login → acessou /rh/dashboard sem bloqueio. Tentativa de /candidato/perfil redirecionou para /rh/dashboard (role na store = 'administrador')."
severity: blocker
security_impact: true
diagnosis: |
  Root cause (triangulated via localStorage + JWT decode):
  - JWT access_token payload DOES contain app_metadata.role='candidato' (Custom Access Token Hook is working).
  - session.user.app_metadata at runtime is {provider, providers} — role field absent because Supabase JS SDK populates it from auth.users.raw_app_meta_data (NOT the signed JWT claims).
  - Bug 1 (extractRole reads wrong source) causes role=null in store after setSession.
  - fetchProfile fallback in initialize() queries usuarios_rh FIRST, then candidatos. Test user (fernando@beautysmile.com.br) exists in BOTH tables — usuarios_rh hit wins, resolvedRole='administrador'.
  - RoleGuard sees isAuthenticated=true, role='administrador' → allows /rh/dashboard, redirects /candidato/perfil to /rh/dashboard.
  - Additional side effect: login form does not visibly redirect (setTimeout 1s + determineRedirectUrl may be receiving wrong role).
  - Bug 3 (useVagas queries .eq('ativa', true)) fired on /rh/dashboard — unrelated but surfaced because RH area was accessible.
fix_plan_phase_3:
  - "Rewrite extractRole to decode session.access_token via jwt-decode (JWT is signed truth)."
  - "When JWT has role claim, TRUST IT — do not override via DB fallback."
  - "DB fallback only runs when JWT lacks role (hook not enabled, old sessions)."
  - "LoginCandidatoPage: reject login if JWT role !== 'candidato' even if DB has a usuarios_rh row (refuse the dual-account bypass)."
  - "LoginRHPage: same mirror — reject login if JWT role === 'candidato'."

### 6. 200ms Delayed Spinner (No Flash on Cached Sessions)
expected: With a logged-in session (warm localStorage), navigate between protected routes in the candidato area. You should NOT see a full-screen loading spinner flash for each navigation — RoleGuard hides the spinner for the first 200ms while it verifies the cached session. First page load (cold cache) may show the spinner briefly; subsequent nav is instant.
result: pass
notes: "Cold boot showed a brief spinner during initial auth hydration, then subsequent navigations were instantaneous — matches the LoadingDelay 200ms threshold design (spinner only renders when loading exceeds threshold)."

### 7. Cross-Tab Logout
expected: Open two browser tabs, both logged in as the same user. In tab A, click logout. Within a second or two, tab B also shows the logged-out state (redirected to login or home). This is onAuthStateChange firing across tabs via localStorage storage event — the unified store owns a single source of truth, so both tabs react to the same auth event.
result: issue
reported: "User observed: opening /rh/dashboard URL in a new tab causes the ORIGINAL tab to be kicked to /auth/login. Two tabs cannot coexist with the same session. Cross-tab logout protocol (two simultaneous tabs, logout in one) could not be validated because tabs cannot stay simultaneous."
severity: major
ux_impact: true
security_impact: false
diagnosis: |
  Likely pre-existing Supabase SDK behavior: when the second tab hydrates and calls auth.getSession(), the refresh token rotates. The first tab's stored refresh token becomes invalid; next auth check in tab 1 fails and clears the session. This is not a Phase 1 regression — it is standard Supabase JS SDK multi-tab refresh rotation. However, with the unified store, the single localStorage auth-storage slot amplifies the race (both tabs see the same persisted key immediately).
  The TRUE cross-tab logout protocol was not tested because setup preconditions (two tabs simultaneously logged in) could not be achieved.
remediation_options:
  - option: "Configure Supabase client with shared BroadcastChannel for refresh token coordination (supabase-js >= 2.x supports this)"
    phase_target: 3
    effort: small
  - option: "Use Supabase's `refreshTokens: false` + manual refresh in a single leader tab (web locks API)"
    phase_target: "post-MVP"
    effort: large
  - option: "Accept as known limitation; document in user-facing help (rare multi-tab use case)"
    phase_target: "none"
    effort: none
notes: "Core cross-tab logout (the single-source-of-truth in unified store) IS structurally in place — state.clearAuth() and onAuthStateChange are both wired. The issue is that tab coexistence itself is broken upstream of this mechanism."

### 8. JWT Contains Role Claim
expected: After login, open DevTools → Application → Local Storage → find the Supabase session (key like `sb-<project-ref>-auth-token`). Copy the `access_token` value. Paste at https://jwt.io (or decode locally). Inspect payload. Confirm `app_metadata.role` is one of "candidato" | "rh" | "administrador". User already confirmed this works after Wave 2 checkpoint — mark pass if still true.
result: pass
notes: "Confirmed during Test 5 diagnosis: access_token payload contains app_metadata.role='candidato' for fernando@beautysmile.com.br. Custom Access Token Hook is emitting correctly at the signing layer. Frontend read-path bug (Test 5 issue) is separate and does not invalidate this test."

### 9. Cadastro Flow via Edge Function
expected: Open http://localhost:3003/cadastro. Fill the multi-step form with valid data and submit. Expected (if Edge Function deployed): a new candidato row is created in Supabase, you see a success toast, and are redirected to login or dashboard. Expected (Edge Function NOT deployed — current state): form submission throws EDGE_FUNCTION_ERROR or a 404 toast. If cadastro flow errors because `supabase functions deploy cadastrar-candidato` has not been run yet, mark BLOCKED with blocked_by: release-build.
result: issue
reported: "Edge Function deployed and reachable (gateway responds to POST), but cadastro end-to-end fails with 2 bugs: (1) Function returns 401 Unauthorized — deployed without --no-verify-jwt flag, gateway rejects anonymous callers; cadastro is anonymous flow by definition (user does not yet exist); need redeploy with --no-verify-jwt. (2) duplicateCheckService throws TypeError: Cannot read properties of undefined (reading 'rest') on supabase.rpc() — suspected incompatibility between @supabase/supabase-js v2.48.1 and new sb_publishable_ anon key format; fix: npm install @supabase/supabase-js@latest."
severity: blocker
security_impact: false
runtime_blocker: true
scope_note: "User flagged both bugs as natural Phase 2 (Cadastro Candidato) scope. Edge Function structural deployment path is OK — deploy + invoke wire-up works; failure is at two independent runtime layers (auth gate + SDK version)."
diagnosis:
  bug_a:
    name: "Edge Function rejects anonymous callers (401)"
    root_cause: "`supabase functions deploy cadastrar-candidato` ran without `--no-verify-jwt`. Default deploy requires a valid JWT, but cadastro is an anonymous flow (user is being created)."
    fix: "Redeploy: `npx supabase functions deploy cadastrar-candidato --no-verify-jwt --project-ref isljnozzlvckrgjjbjwp`. Validation remains enforced by Zod schema + service_role server-side."
  bug_b:
    name: "supabase-js SDK TypeError on rpc() with sb_publishable_ key"
    root_cause: "The project uses the new `sb_publishable_` anon key format (rolled out by Supabase in late 2025 / early 2026). @supabase/supabase-js v2.48.1 did not yet parse this format correctly for the rpc() client, leaving `rest` undefined."
    fix: "npm install @supabase/supabase-js@latest (should be >= 2.50.x). Lockfile regeneration + type check + spot-test duplicate check endpoint."
phase_fix_target: 2
phase_2_requirements_additions:
  - "CAD-DEPLOY-01: Edge Function cadastrar-candidato MUST be deployed with --no-verify-jwt (anonymous invocation). Document in deploy runbook."
  - "CAD-DEPS-01: @supabase/supabase-js MUST be upgraded to >= 2.50.x to support sb_publishable_ anon key format. Pin version; regenerate lockfile."
  - "CAD-SMOKE-01: After deploy + dep upgrade, cadastro happy-path must complete end-to-end (form submit → candidato row created → redirect)."

### 10. Duplicate Check via RPC
expected: On the cadastro form's "Dados Pessoais" step, enter a CPF that IS already registered. The form surfaces a "Este CPF já está cadastrado" style validation error in real time (on blur / as you type past the last digit). Under the hood this calls `supabase.rpc('check_candidato_duplicate')` — open DevTools Network tab and confirm the request is to `/rest/v1/rpc/check_candidato_duplicate`, NOT a raw SELECT on `/rest/v1/candidatos`.
result: blocked
blocked_by: "Test 9 Bug B — supabase-js v2.48.1 incompatibility with sb_publishable_ anon key format. supabase.rpc() throws TypeError before any network request is issued, so the duplicate check cannot be observed live. Structural path is correct: duplicateCheckService.ts calls rpc('check_candidato_duplicate'); migration 20260420000003 defines the RPC; anon SELECT on candidatos was revoked in migration 20260420000001."
phase_fix_target: 2

### 11. Husky Pre-Commit Blocks TSC Errors
expected: Temporarily introduce a TypeScript error in any source file (e.g. `const x: number = "string"` in a random .ts file). Stage it and try `git commit -m "test"`. The husky pre-commit hook runs `npm run lint` (tsc --noEmit) and blocks the commit because the project has pre-existing errors (baseline 388). Use `git commit --no-verify` to bypass, then revert the test file. Note: because the baseline already has errors, the hook is stricter than "zero errors" — it blocks any commit. That is intended for now; tolerated errors will be cleaned up in later phases.
result: pass
notes: ".husky/pre-commit executable, runs npm run lint (tsc --noEmit), blocked `git commit --allow-empty` as expected. Git log confirms the test commit is absent. 388 baseline TS errors displayed in output — all pre-existing (cadastroService tests, legacy types, vagasTypes.ts) with gradual reduction planned for Phases 2/4/7. Hook satisfies FOUND-08."

## Summary

total: 11
passed: 7
issues: 3
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "A candidato visiting /rh/dashboard is redirected with toast; cross-role redirects honor JWT role claim"
  status: failed
  reason: "User reported: candidato logged in via /auth/login → reached /rh/dashboard without any block. Trying to visit /candidato/perfil redirected back to /rh/dashboard because store.role='administrador' (persisted)."
  severity: blocker
  security_impact: true
  test: 5
  root_cause: "Triple-layer bug: (1) Bug 1 — extractRole reads session.user.app_metadata (SDK-populated from auth.users.raw_app_meta_data, lacks role) instead of JWT payload. (2) fetchProfile fallback queries usuarios_rh FIRST; test user exists in BOTH usuarios_rh and candidatos, so admin row wins and resolvedRole='administrador'. (3) LoginCandidatoPage does not reject the wrong-table resolution — trusts whatever fetchProfile returns."
  evidence:
    - "JWT access_token payload has app_metadata.role='candidato' (Hook is emitting correctly)"
    - "session.user.app_metadata at runtime = {provider, providers} — role field absent"
    - "localStorage auth-storage state.role = 'administrador'"
    - "Browser Network: HEAD /rest/v1/vagas?ativa=eq.true 400 — Bug 3 also reproducing live (separate issue, Phase 4 scope)"
  artifacts:
    - src/store/authStore.ts:129-136 (extractRole)
    - src/store/authStore.ts:147-X (fetchProfile fallback order)
    - src/components/pages/LoginCandidatoPage.tsx:112-165 (post-login flow)
  missing:
    - "JWT-based role extraction via jwt-decode (trust signed claim)"
    - "Role claim-vs-DB conflict rejection (refuse dual-account ambiguity at login)"
    - "LoginCandidatoPage login rejection when resolved role !== 'candidato'"
  phase_fix_target: 3
  phase_3_requirements_additions:
    - "AUTH-JWT-01: authStore.extractRole MUST decode session.access_token with jwt-decode; MUST NOT read session.user.app_metadata for role."
    - "AUTH-JWT-02: When JWT carries a role claim, it is authoritative. DB fallback only runs when role claim is absent (legacy sessions before hook activation)."
    - "AUTH-LOGIN-01: LoginCandidatoPage MUST reject login if resolved role !== 'candidato' (even if a usuarios_rh row exists for the same email)."
    - "AUTH-LOGIN-02: LoginRHPage MUST reject login if resolved role === 'candidato' (mirror of AUTH-LOGIN-01)."

- truth: "Multiple simultaneous tabs with the same session remain stable; logout in one tab propagates to others"
  status: failed
  reason: "Opening /rh/dashboard URL in a new tab kicks the original tab to /auth/login. Tab coexistence is broken; the true cross-tab logout protocol (two simultaneous tabs → logout in one → other auto-redirects) could not be tested because simultaneous tabs are impossible."
  severity: major
  test: 7
  root_cause: "Supabase JS SDK default multi-tab behavior: new tab hydration calls auth.getSession() which rotates the refresh token; the original tab's stored refresh token becomes invalid and the next auth check clears its session. Pre-existing SDK behavior, amplified by the unified-store single-localStorage-slot design."
  ux_impact: "Users opening links in new tabs (common pattern) lose their session in the original tab. Expected to surface as user complaints in Phase 5 QA."
  missing:
    - "Cross-tab session coordination via BroadcastChannel (supabase-js native option) OR web-locks single-leader refresh"
  phase_fix_target: 3
  phase_3_requirements_additions:
    - "AUTH-TABS-01: Multiple tabs with the same active session MUST coexist without kicking each other out."
    - "AUTH-TABS-02: Logout in one tab MUST propagate to all other tabs within 2s (via BroadcastChannel or storage event)."

- truth: "Anonymous cadastro flow completes end-to-end via Edge Function"
  status: failed
  reason: "Two runtime bugs: (A) Edge Function deployed without --no-verify-jwt, gateway returns 401 for anonymous callers. (B) @supabase/supabase-js v2.48.1 incompatible with sb_publishable_ anon key format — supabase.rpc() throws TypeError (rest undefined) before reaching network."
  severity: blocker
  runtime_blocker: true
  test: 9
  scope_reassignment: "Phase 2 (Cadastro Candidato) per user decision — Phase 1 built the structure correctly; the gap is deploy flags + SDK version, both natural Phase 2 setup concerns."
  missing:
    - "Edge Function redeploy with --no-verify-jwt (anonymous invocation)"
    - "supabase-js upgrade to >= 2.50.x (supports sb_publishable_ anon key format)"
    - "Post-upgrade smoke test of rpc() + functions.invoke()"
  phase_fix_target: 2

- truth: "Duplicate check uses RPC instead of anonymous SELECT on candidatos"
  status: blocked
  reason: "Cannot test duplicate check flow because supabase.rpc() call itself throws TypeError before network (same Bug B from Test 9 — SDK incompatibility with sb_publishable_ key). Structural code path IS correct (duplicateCheckService.ts calls rpc('check_candidato_duplicate'); migration 20260420000003 defines the function; anon SELECT on candidatos was revoked in 20260420000001). Only the runtime client layer is broken."
  severity: blocked_by_dep
  test: 10
  blocked_by: "Test 9 Bug B (supabase-js version)"
  phase_fix_target: 2
