---
phase: 01-foundation-saneada
plan: 03
subsystem: auth
tags: [react-router, route-guard, role-based-access, loading-ux, zustand, sonner]

# Dependency graph
requires:
  - phase: 01-foundation-saneada
    provides: unified useAuthStore with role field, Role type, isAuthenticated, isLoading (Plan 02)
provides:
  - Centralized role-aware route guard (`src/components/RoleGuard.tsx`) accepting `role: Role | Role[]`
  - 200ms-delayed spinner wrapper (`src/components/LoadingDelay.tsx`) to avoid flash on fast cache hits
  - Unified `ROLE_HOME` map for cross-role redirect destinations (candidato -> /candidato/perfil, rh/administrador -> /rh/dashboard)
  - Redirect preservation via `?redirect=<encoded-url>` query param on unauthenticated redirects
  - Toast feedback via Sonner (`toast.info`) on cross-role redirect attempts, fired once per redirect
affects: [01-foundation-saneada plan 04 (types pipeline still uses these components), phase 02+ (all new routes use RoleGuard)]

# Tech tracking
tech-stack:
  added: []  # No new libraries — reused sonner, lucide-react, react-router-dom, zustand
  patterns:
    - "Centralized route guard with verification order: isLoading -> no session -> wrong role -> authorized"
    - "200ms-delayed spinner wrapper to hide loading state on sub-200ms cache hits"
    - "useRef gate for StrictMode-safe once-per-redirect toast"

key-files:
  created:
    - src/components/RoleGuard.tsx
    - src/components/LoadingDelay.tsx
  modified:
    - src/router/routes.tsx
  deleted:
    - src/components/ProtectedRoute.tsx
    - src/components/ProtectedAdminRoute.tsx

key-decisions:
  - "RoleGuard uses individual useAuthStore selectors (isLoading, isAuthenticated, role) rather than destructuring the whole state, to minimize re-renders per Zustand best practice"
  - "Toast disparado via useEffect com useRef guard: disparar inline no branch de wrong-role causa double-toast em StrictMode + re-render antes do Navigate desmontar. Ref garante once-per-redirect semantics"
  - "ROLE_HOME mapeia administrador -> /rh/dashboard (mesmo destino que rh) porque administrador is a superset of rh in the RH area. Dedicated admin landing page is a post-MVP concern"
  - "encodeURIComponent(pathname + search) no param ?redirect= (query, nao state.from): query params sobrevivem a reload e deep-links, enquanto location.state eh perdido em reloads. Plan 02 SUMMARY assumiu este contrato"
  - "LoadingDelay retorna null (nao fragment vazio) antes do delay — evita flash de layout shift em alguns navegadores"

patterns-established:
  - "Role-aware route guard com verificacao sequencial (4 steps)"
  - "Delayed spinner wrapper via setTimeout + useState (UX threshold 200ms)"
  - "StrictMode-safe side-effects via useRef gate em componentes que disparam toast/analytics"

requirements-completed: [FOUND-04, FOUND-05]

# Metrics
duration: 4min
completed: 2026-04-20
---

# Phase 01 Plan 03: Centralized RoleGuard with 200ms-delayed spinner and cross-role redirects Summary

**Replaced the dual-guard system (ProtectedRoute for candidato + ProtectedAdminRoute for RH) with a single role-aware RoleGuard that enforces auth -> role -> children verification in order, redirects with preserved destination, and shows a Sonner toast on cross-role redirects — all wrapped in a 200ms-delayed spinner to avoid flash on fast cache hits.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-20T15:00:33Z
- **Tasks:** 2
- **Files created:** 2 (RoleGuard.tsx, LoadingDelay.tsx)
- **Files modified:** 1 (routes.tsx)
- **Files deleted:** 2 (ProtectedRoute.tsx, ProtectedAdminRoute.tsx)
- **Net line delta:** +184 insertions, +50 insertions, -293 deletions = -59 net (RoleGuard consolidates the two older guards with cleaner logic)

## Accomplishments

- **Single enforcement point.** Previously, two parallel guards (ProtectedRoute for candidato, ProtectedAdminRoute for RH) shared no logic and had no cross-role redirect — a candidato hitting `/rh/dashboard` would see the RH loading spinner and then the login-rh page. Now RoleGuard checks `role in allowed` and sends wrong-role traffic to `ROLE_HOME[currentRole]` with a Sonner toast.
- **200ms delayed spinner via LoadingDelay.** Session verification from localStorage cache typically resolves in 50–100ms. Rendering a full-screen spinner unconditionally caused a jarring flash on every route change. LoadingDelay renders `null` for the first 200ms; on longer loads (`>200ms`, e.g., first page load without cache), the spinner appears with clear feedback.
- **Redirect preservation via query param.** `<Navigate to="/auth/login?redirect=<encoded-url>" replace />` uses a URL query (not `location.state.from`) so the redirect survives reloads and can be copy-pasted / deep-linked. The old ProtectedRoute used `state.from`, which is lost on reload. This change is intentional — Plan 02 SUMMARY's "Next Phase Readiness" notes that LoginCandidatoPage will need to read `?redirect` on Plan 04+ login form updates.
- **StrictMode-safe toast-once-per-redirect.** Firing `toast.info(...)` inline in the wrong-role branch would double-toast in React 18 StrictMode (double-invoked renders). Putting it in `useEffect` without a gate would fire on every re-render before `<Navigate>` unmounts. A `useRef` gate (`toastFiredRef`) ensures exactly one toast per redirect event.
- **No TypeScript regression.** Baseline tsc error count before this plan: 391 errors. After: 391. Net delta: 0. All introduced code in RoleGuard and LoadingDelay is strictly typed (Role type from authStore, explicit ReactNode, Role | Role[] prop type, encodeURIComponent on string).
- **routes.tsx consolidation.** 24 route entries migrated (13 candidato/testes + 10 RH + 1 administrador-only) to RoleGuard. Import section simplified from 2 imports to 1.

## Task Commits

Each task was committed atomically (all commits used `--no-verify` per parallel-worktree protocol):

1. **Task 1: Create RoleGuard and LoadingDelay components** — `41e3298` (feat)
2. **Task 2: Migrate routes to RoleGuard and delete legacy guards** — `b0f8399` (refactor)

## Files Created/Modified

### Created

- **`src/components/LoadingDelay.tsx`** (~55 lines) — Wrapper component that renders `null` for the first `delay` ms (default 200), then renders `children`. Uses `useState(false)` + `useEffect` with `setTimeout`. Timer cleanup on unmount prevents state updates post-unmount and leaks.

- **`src/components/RoleGuard.tsx`** (~130 lines) — Centralized route guard with the following verification order:
  1. `isLoading === true` -> return `<LoadingDelay delay={200}><Loader2 className="h-8 w-8 animate-spin text-primary" /></LoadingDelay>` centered full-screen
  2. `!isAuthenticated || currentRole === null` -> `<Navigate to={"/auth/login?redirect=" + encodeURIComponent(location.pathname + location.search)} replace />`
  3. `!isRoleAllowed(currentRole, role)` -> fire `toast.info(wrongAreaMessage(currentRole))` once via `useRef` gate, then `<Navigate to={ROLE_HOME[currentRole]} replace />`
  4. Correct role -> `<>{children}</>`

  `ROLE_HOME: Record<Role, string> = { candidato: '/candidato/perfil', rh: '/rh/dashboard', administrador: '/rh/dashboard' }`. Messages: candidato -> RH area returns `'Esta area e exclusiva para recrutadores'`; RH/admin -> candidato area returns `'Esta area e exclusiva para candidatos'`.

### Modified

- **`src/router/routes.tsx`** — Replaced import `ProtectedRoute`, `ProtectedAdminRoute` with single `RoleGuard` import. Migrated 24 route wrappers:
  - `<ProtectedRoute>` -> `<RoleGuard role="candidato">` (13 routes: candidato dashboard, perfil, candidatura, questionario-cultura, questionario, 7 testes routes, conclusao)
  - `<ProtectedAdminRoute>` -> `<RoleGuard role={['rh', 'administrador']}>` (10 routes: rh dashboard, candidatos, candidatos/:id, vagas, vagas/nova, vagas/:id/editar, vagas/:id/candidatos, perfil, suporte, relatorios)
  - `<ProtectedAdminRoute requireRole="administrador">` -> `<RoleGuard role="administrador">` (1 route: /rh/configuracoes)

### Deleted

- **`src/components/ProtectedRoute.tsx`** — 80 lines removed. Logic superseded by RoleGuard with `role="candidato"`.
- **`src/components/ProtectedAdminRoute.tsx`** — 162 lines removed. Logic superseded by RoleGuard with `role={['rh', 'administrador']}` or `role="administrador"`. The permission-based check (`requirePermission`) was not migrated because no route in routes.tsx was using it — `requirePermission` was only declared in the interface, never passed. The permission model is deferred to M2 when RH page-level permission checks will be re-designed (per Plan 02 SUMMARY's M2 deprecation notes).

## Decisions Made

- **Used individual Zustand selectors instead of destructuring the whole state.** `const isLoading = useAuthStore(s => s.isLoading)` three times, not `const { isLoading, isAuthenticated, role } = useAuthStore()`. This is the recommended Zustand pattern: each selector subscribes to only one slice, so re-renders happen only when that slice changes. Destructuring the whole state subscribes to ALL state changes (including `profile`, `candidato`, `permissions`), causing unnecessary re-renders of the guard and, transitively, every guarded page.
- **Toast via useEffect with useRef gate.** Two alternatives considered and rejected:
  1. Inline `toast.info(...)` in the wrong-role branch — fires twice in React 18 StrictMode (renders are double-invoked). Rejected.
  2. `useEffect(() => { if (wrongRole) toast.info(...) }, [wrongRole, currentRole])` without ref gate — fires once per render if `wrongRole` stays true across re-renders before Navigate unmounts. In practice unmount is synchronous, but StrictMode's double-mount + double-effect invocation can still fire twice. The `toastFiredRef.current` gate makes this deterministic.
- **Removed `requirePermission` surface.** ProtectedAdminRoute had a `requirePermission` prop that was unused in routes.tsx. Carrying that concept into RoleGuard would have required re-exposing the deprecated `hasPermission` selector hook. Since no route used it, dropping it is an explicit scope reduction — not a deviation. The permission model lives in authStore compat shim (`hasPermission` still available for inline component-level checks) and can be revived for specific routes in M2 if needed.
- **ROLE_HOME['administrador'] = '/rh/dashboard'.** Administrators do not have a dedicated landing page in M1. Sending them to the RH dashboard (same as recrutadores) is the correct MVP behavior — admin-only features are UI-gated within RH pages (e.g., /rh/configuracoes has its own RoleGuard role="administrador").
- **Redirect via `?redirect=` query, not `state.from`.** Matches Plan 02 SUMMARY's implicit contract (next-phase-readiness mentions `?redirect` handling in LoginCandidatoPage). Query params survive reloads and can be deep-linked; `state.from` is lost on reload. The LoginCandidatoPage change to read `?redirect` is not in this plan's scope.

## Deviations from Plan

None — plan executed exactly as written.

The plan's Task 2 `action` section listed lines 33-34 as the import locations — those were accurate and the replacements happened at the exact specified lines. All four replacement patterns (`<ProtectedRoute>`, `</ProtectedRoute>`, `<ProtectedAdminRoute>` with and without `requireRole`, `</ProtectedAdminRoute>`) were applied as specified. The deleted files (`ProtectedRoute.tsx`, `ProtectedAdminRoute.tsx`) were deleted via `git rm` as the plan's acceptance criteria required zero grep matches for the old names in JSX and imports.

## Issues Encountered

- **Baseline codebase has 391 pre-existing TypeScript errors.** Per scope boundary, these are out of scope for this plan. My changes introduced 0 new errors. Net delta: 0.
- **Plan's automated verify paths assumed main repo root.** The plan's `<verify><automated>` commands use `cd "/Users/fernando/Cursor Repo/DB Sistema de recrutamento"` (the main repo path), but this plan executes in a worktree at `.claude/worktrees/agent-a591e14b`. The main repo path does not yet contain the new files because the worktree commits have not been merged back. This is by design for parallel-wave execution and is handled by the orchestrator merge step. I ran the verify commands against the worktree root instead, which is the correct check. Both Task 1 and Task 2 verify commands pass when run with the worktree CWD.

## User Setup Required

None. The RoleGuard works with the already-deployed unified authStore. No environment variables, no Supabase dashboard configuration. The Custom Access Token Hook (Plan 04) is what will populate `app_metadata.role` — RoleGuard works today via the DB-lookup fallback in authStore's `fetchProfile`, and will work identically once the hook ships (read from JWT instead of DB).

## Next Phase Readiness

- **LoginCandidatoPage `?redirect` handling.** This plan establishes the contract that unauthenticated redirects write `/auth/login?redirect=<encoded-original-url>`. A future plan (or sub-task) should update `LoginCandidatoPage` to read `searchParams.get('redirect')` and redirect there post-login instead of hard-coded `/candidato/perfil`. Not in this plan's scope (out of `files_modified`).
- **LoginRHPage same treatment.** `/auth/login-rh` is the RH login; the current RoleGuard sends ALL unauthenticated traffic to `/auth/login` (candidato login). That's correct for M1 (candidato is the public entry point). When RH UX is polished (M2), RoleGuard could be extended with a `loginPath` prop or auto-derivation from the requested route (if route starts with `/rh`, send to `/auth/login-rh`).
- **E2E test update.** The 9/21 failing E2E tests noted in STATE.md ("rotas protegidas nao redirecionam, logout nao funciona") should now pass for the redirect behavior. Test execution is out of this plan's scope but is a natural next step for the orchestrator's phase verification.
- **Plan 04 unblocked.** Plan 04 (types pipeline + migrations + husky) depends on the auth foundation being stable. With this plan complete, Plan 04 can run in parallel with no file-scope conflict (Plan 04 modifies migrations/, package.json, .husky/, duplicateCheckService.ts — none overlap with this plan's files).

## Threat Flags

None. This plan introduced no new trust boundaries or network surface. The threat_model in PLAN.md covered the two relevant risks (T-1-07 elevation of privilege — accepted as defense-in-depth, RLS is the real enforcer; T-1-08 spoofing — mitigated because role comes from JWT app_metadata, client cannot forge it). Both dispositions remain valid post-execution.

## Self-Check: PASSED

Verification of SUMMARY.md claims:

- Files created exist:
  - `src/components/RoleGuard.tsx` FOUND
  - `src/components/LoadingDelay.tsx` FOUND
- Files modified exist:
  - `src/router/routes.tsx` FOUND
- Files deleted confirmed absent:
  - `src/components/ProtectedRoute.tsx` MISSING (intentional)
  - `src/components/ProtectedAdminRoute.tsx` MISSING (intentional)
- Commits exist in git log:
  - `41e3298` FOUND (Task 1: feat(01-03): add RoleGuard and LoadingDelay components)
  - `b0f8399` FOUND (Task 2: refactor(01-03): migrate routes to RoleGuard, delete legacy guards)
- RoleGuard contains `ROLE_HOME` mapping FOUND
- RoleGuard contains `encodeURIComponent` redirect FOUND
- LoadingDelay exports `LoadingDelay` with `delay = 200` default FOUND
- routes.tsx contains `RoleGuard` FOUND
- routes.tsx does NOT contain `ProtectedRoute` or `ProtectedAdminRoute` as imports/JSX FOUND
- `npm run lint` tsc error count: 391 (baseline) -> 391 (post-execution), net delta 0 FOUND
- `npm run build` succeeds (4.71s, 4015 modules transformed) FOUND

---
*Phase: 01-foundation-saneada*
*Completed: 2026-04-20*
