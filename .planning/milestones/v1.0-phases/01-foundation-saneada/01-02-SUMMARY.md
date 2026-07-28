---
phase: 01-foundation-saneada
plan: 02
subsystem: auth

tags: [zustand, supabase-auth, jwt, react, role-based-access, persist-middleware]

# Dependency graph
requires:
  - phase: 00-backup-saneamento
    provides: stable branch backup/local-state-2026-04 + STATE with auth concerns documented
provides:
  - Single Zustand auth store (`src/store/authStore.ts`) with role awareness (candidato | rh | administrador)
  - `extractRole(session)` helper reading from JWT `app_metadata.role`
  - `fetchProfile(userId, role)` helper with DB-lookup fallback when the Custom Access Token Hook is not yet deployed
  - `setSession`, `clearAuth`, `logout`, `initialize` as first-class unified actions
  - New selector hooks: `useRole`, `useProfile` (alongside legacy `useIsAuthenticated`, `useCandidato`, `useUser`, `useAuthLoading`)
  - Compatibility shim at `src/store/adminAuthStore.ts` re-exporting `useAuthStore as useAdminAuthStore` plus adapter selectors (`useIsAdminAuthenticated`, `useAdminUser`, `useAdminRole`, `useAdminAuthLoading`, `useAdminPermission`, `useAdminHasRole`)
  - `UsuarioRH`, `PermissoesRH`, `RoleType` (alias of `Role`), `DEFAULT_PERMISSIONS` preserved for RH page imports
affects: [01-foundation-saneada plans 03 (RoleGuard), 04 (Custom Access Token Hook), 05 (types pipeline), future M2 RH migration]

# Tech tracking
tech-stack:
  added: []  # No new libraries — reused zustand + @supabase/supabase-js
  patterns:
    - "Single auth store with role derived from JWT app_metadata (graceful DB-lookup fallback before hook deploys)"
    - "Compatibility shim pattern: re-export unified store under legacy name + adapter selector hooks"
    - "Role mapping at boundary: 'rh' in unified store <-> 'recrutador' in legacy RH API"

key-files:
  created: []
  modified:
    - src/store/authStore.ts
    - src/store/adminAuthStore.ts

key-decisions:
  - "Unified store keeps backward-compat fields (candidato, adminUser, permissions, isAdmin) and legacy setters so App.tsx, LoginRHPage, ProtectedAdminRoute, useSessionTimeout, and 10+ other consumers keep compiling without touching them (respects Wave 1 parallel scope: authStore.ts + adminAuthStore.ts only)"
  - "extractRole returns null when app_metadata.role is missing; fetchProfile's fallback then queries usuarios_rh -> candidatos -> defaults to 'candidato' (graceful pre-hook behavior for Plan 04 timing)"
  - "Unified store uses 'rh' for recrutador; shim's useAdminRole converts back to 'recrutador' to preserve legacy API"
  - "hasRole accepts both 'rh' (unified) and 'recrutador' (legacy) so ProtectedAdminRoute compiles without modification"
  - "Persist key remains 'auth-storage' (not 'admin-auth-storage') — single localStorage slot enables cross-tab sync via onAuthStateChange"

patterns-established:
  - "Unified role-aware auth store with JWT-derived role + DB-lookup fallback"
  - "Compatibility shim for deprecated store: re-export + adapter selectors with role mapping"
  - "Deprecation via JSDoc @deprecated on legacy fields/methods pointing to replacements"

requirements-completed: [FOUND-02, FOUND-06]

# Metrics
duration: 8min
completed: 2026-04-20
---

# Phase 01 Plan 02: Unified Auth Store with Role Awareness Summary

**Single Zustand authStore with role derived from JWT app_metadata (with DB-lookup fallback), plus an adminAuthStore compatibility shim re-exporting the unified store and adapter selectors so RH pages keep compiling**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-20T04:21:02Z
- **Completed:** 2026-04-20T04:29:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Eliminated the dual-store race condition: previously, authStore (candidato) and adminAuthStore (RH) both called `supabase.auth.getSession()` independently and both listened to `onAuthStateChange`. After this plan, there is ONE store of truth — `useAdminAuthStore` is a re-export of `useAuthStore`.
- Unified `AuthState` exposes `role: Role | null` sourced from `session.user.app_metadata.role`. When the JWT hook has not yet been deployed (Plan 04), the store gracefully falls back to a DB lookup on `usuarios_rh` first, then `candidatos`, defaulting to `'candidato'` if no profile is found.
- `profile: Record<string, unknown> | null` holds the candidato or usuario_rh row generically; backward-compat typed accessors (`candidato: CandidatoRow | null`, `adminUser: UsuarioRHRow | null`) remain so all 10+ consumer files compile unchanged.
- Zustand `persist` config keeps the same `auth-storage` localStorage key for seamless migration. `onAuthStateChange` SIGNED_OUT fires across tabs via the localStorage storage event (single store = single source of cross-tab sync).
- Net TypeScript error delta from plan execution: **-2** (removed 2 pre-existing errors in LoginRHPage and adminAuthStore, introduced 0 new errors).

## Task Commits

Each task was committed atomically (all commits used `--no-verify` per parallel-worktree protocol):

1. **Task 1: Rewrite authStore.ts as unified store with role and profile** — `fb48e24` (refactor)
2. **Task 2: Convert adminAuthStore.ts to re-export compatibility shim** — `ee30fec` (refactor)

_Note: Task 2's commit also includes small follow-up changes to `authStore.ts` to widen `hasRole` and type `adminUser` as `UsuarioRHRow` (Rule 3 auto-fixes — see Deviations below)._

## Files Created/Modified

- `src/store/authStore.ts` — Rewritten as unified store with `Role` type, `extractRole`, `fetchProfile`, `clearAuth`, `setSession`, `initialize`, `logout`. Adds `role`, `profile`, and compat fields `candidato`, `adminUser`, `permissions`, `isAdmin`. New selector hooks `useRole`, `useProfile` plus preserved legacy hooks.
- `src/store/adminAuthStore.ts` — Replaced ~415-line Zustand store with ~220-line compatibility shim. Re-exports `useAuthStore as useAdminAuthStore`, preserves `UsuarioRH`/`PermissoesRH`/`PreferenciasNotificacoes` interfaces, preserves `DEFAULT_PERMISSIONS` map, and provides adapter selector hooks that translate between unified store state and legacy RH API.

## Decisions Made

- **Keep backward-compat surface on unified store.** The plan's minimal interface is `{ user, session, role, profile, isLoading, isAuthenticated, initialize, logout, clearAuth, setSession }`. However, 5 files (App.tsx, LoginRHPage, ProtectedAdminRoute, useSessionTimeout, RHSidebar, RHTopBar, plus useVagas/useCandidaturas hooks) destructure `setUser`, `setCandidato`, `setAdminUser`, `clearAdminUser`, `hasRole`, `hasPermission`, `adminUser`, `candidato`, `permissions`, `isAdmin` directly from the store. Since the orchestrator locked `files_modified` to the two store files, adding backward-compat fields/methods to the unified store (marked `@deprecated`) was the only way to keep the codebase compiling. These will be removed in M2 when RH pages migrate.
- **Typed back-compat accessors.** `candidato: CandidatoRow | null` and `adminUser: UsuarioRHRow | null` — typed against the `Database` row types so consumers accessing `.nome_completo`, `.user_id`, `.email`, etc. keep their type inference. `profile` remains the generic `Record<string, unknown>` per the plan's action.
- **hasRole accepts legacy AND unified values.** Widened from `'recrutador' | 'administrador'` to `Role | 'recrutador'` so ProtectedAdminRoute (which passes `RoleType = Role` through the shim re-export) compiles without being modified. Implementation treats `'rh'` and `'recrutador'` as equivalent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added backward-compat fields and methods to unified AuthState**
- **Found during:** Task 1 (rewrite authStore.ts)
- **Issue:** The plan's new `AuthState` interface removed `setUser`, `setCandidato`, `setLoading`, `clearUser`, `candidato` — but App.tsx, ProtectedAdminRoute, useSessionTimeout, LoginRHPage, and 5 other files destructure these from the store. Strict plan would fail `npm run lint` with 30+ new TS2339 errors. Orchestrator guidance restricts `files_modified` to authStore.ts + adminAuthStore.ts, so consumers cannot be edited.
- **Fix:** Preserved all legacy fields/setters on unified store as `@deprecated` (candidato, adminUser, permissions, isAdmin, setUser, setCandidato, setAdminUser, setAdminSession, setLoading, clearUser, clearAdminUser, hasRole, hasPermission). Typed `candidato` and `adminUser` against Database row types so existing field-access patterns type-check.
- **Files modified:** src/store/authStore.ts
- **Verification:** `npm run lint` delta = 0 new errors (stayed at 395 baseline after Task 1; dropped to 393 after Task 2 which removed 2 pre-existing errors).
- **Committed in:** `fb48e24` (Task 1)

**2. [Rule 3 - Blocking] Widened `hasRole` parameter type to `Role | 'recrutador'`**
- **Found during:** Task 2 (shim installation)
- **Issue:** The shim re-exports `Role as RoleType`. `ProtectedAdminRoute` is typed `requireRole: RoleType` and calls `hasRole(requireRole)`. Unified store's initial `hasRole: (r: 'recrutador' | 'administrador') => boolean` rejected `'candidato'` and `'rh'`, producing `error TS2345: Argument of type 'Role' is not assignable...` — a new error introduced by my changes.
- **Fix:** Widened type to `Role | 'recrutador'`, updated implementation to treat `'rh'` and `'recrutador'` as equivalent in the role hierarchy check, and added a branch for `'candidato'`.
- **Files modified:** src/store/authStore.ts
- **Verification:** The TS2345 error in `ProtectedAdminRoute.tsx(141,31)` disappeared in final diff.
- **Committed in:** `ee30fec` (Task 2)

**3. [Rule 3 - Blocking] Typed `adminUser` as `UsuarioRHRow` instead of `Record<string, unknown>`**
- **Found during:** Task 2 (shim installation)
- **Issue:** `useSessionTimeout.ts` does `adminUser.user_id` and `adminUser.email` expecting `string`. With `adminUser: Record<string, unknown>`, both became `unknown`, producing 2 new TS2322 errors.
- **Fix:** Typed `adminUser` as `Database['public']['Tables']['usuarios_rh']['Row'] | null` (aliased `UsuarioRHRow`). Consumers that access row columns get typed inference; `useAdminUser` selector in shim casts back to `UsuarioRH` for legacy API fidelity.
- **Files modified:** src/store/authStore.ts
- **Verification:** useSessionTimeout errors absent from final `npm run lint` diff.
- **Committed in:** `ee30fec` (Task 2)

---

**Total deviations:** 3 auto-fixed (all Rule 3 — blocking typecheck failures caused by interface narrowing)
**Impact on plan:** All deviations were back-compat adjustments to keep the broader codebase compiling while honoring the orchestrator's `files_modified` scope (authStore.ts + adminAuthStore.ts only). No architectural drift — the unified-store invariant is intact (`adminAuthStore.ts` has 0 `create<...>` calls). Legacy fields are marked `@deprecated` and documented for removal in M2.

## Issues Encountered

- **Baseline has 395 pre-existing TypeScript errors** across the codebase (unrelated to auth). Per deviation rule scope boundary, these are out of scope for this plan. My changes removed 2 of them (as a side effect of eliminating the dual-store) and introduced 0 new ones. Net delta: -2.
- **`candidato` field type collision.** The plan said to type `profile` as `Record<string, unknown>`, but consumers accessing `candidato.nome_completo` then got `unknown`. Resolved by typing the legacy `candidato` field specifically as `CandidatoRow` (while `profile` stays generic as specified). This is documented as a pragmatic split — new code uses `profile` with role-based casts, old code uses `candidato`.

## User Setup Required

None — no external service configuration required for this plan. The Custom Access Token Hook (Plan 04) is what requires the Supabase Dashboard "enable hook" step; the unified store is deployed today and works without it via the DB-lookup fallback.

## Next Phase Readiness

- **Plan 03 (RoleGuard)** can import `useAuthStore` and `Role` directly from `@/store/authStore`. The unified store exposes `isLoading`, `isAuthenticated`, `role` as the three signals the guard needs.
- **Plan 04 (Custom Access Token Hook)** will populate `session.user.app_metadata.role`; the unified store's `extractRole` is already wired to read it. Once the hook ships and is enabled in the Dashboard, the DB-lookup fallback in `fetchProfile` becomes a no-op (JWT carries the role).
- **App.tsx refactor** (remove `initializeAdmin`, `checkRememberMe`, `checkAdminRememberMe` — per PATTERNS.md) is OUT of scope for this plan (not in `files_modified`). It is tracked elsewhere in the phase. The current compat shim means App.tsx continues to work as-is.
- **Cross-tab logout** (FOUND-06): already works via Zustand persist + Supabase's localStorage-backed `onAuthStateChange`. Single storage key `auth-storage` ensures SIGNED_OUT fires in all tabs.

## Self-Check: PASSED

Verification of SUMMARY.md claims:

- Files modified exist:
  - `src/store/authStore.ts` FOUND
  - `src/store/adminAuthStore.ts` FOUND
- Commits exist in git log:
  - `fb48e24` FOUND (Task 1)
  - `ee30fec` FOUND (Task 2)
- No second Zustand store created: `grep -c 'create<' src/store/adminAuthStore.ts` returns 0 FOUND
- `extractRole` function present in authStore.ts FOUND
- Files scope respected: only `src/store/authStore.ts` + `src/store/adminAuthStore.ts` modified in this plan (no touches to `src/lib/supabase/client.ts`, `.planning/STATE.md`, `.planning/ROADMAP.md`) FOUND

---
*Phase: 01-foundation-saneada*
*Completed: 2026-04-20*
