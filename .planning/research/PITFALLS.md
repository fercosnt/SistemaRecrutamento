# Domain Pitfalls

**Domain:** React + Supabase ATS brownfield rebuild (auth, RLS, type generation)
**Researched:** 2026-04-19
**Confidence:** HIGH (verified against codebase evidence + official Supabase docs + community reports)

---

## Critical Pitfalls

Mistakes that cause security breaches, data leaks, or require rewrites.

### Pitfall 1: service_role Key in Vite Bundle (CONFIRMED IN CODEBASE)

**What goes wrong:** `VITE_SUPABASE_SERVICE_ROLE_KEY` is read via `import.meta.env` in `src/lib/supabase/client.ts:14`. Any env var prefixed with `VITE_` is embedded in the client-side JavaScript bundle by Vite. An attacker opens DevTools, finds the key, and bypasses all 103 RLS policies to read/write/delete any row in any table.

**Why it happens:** The original dev needed admin-level operations (e.g., user creation during cadastro) and took the shortcut of creating a `supabaseAdmin` client in client-side code. The comment on line 68 says "NUNCA exponha este cliente em code client-side desprotegido" -- but it IS client-side code. The `VITE_` prefix guarantees it ships to the browser.

**Consequences:**
- Full database read/write access for any visitor with DevTools knowledge
- RLS is meaningless -- the service_role key bypasses ALL policies
- User PII (CPF, nome, endereco, telefone) fully exposed
- LGPD violation with regulatory risk

**Prevention:**
1. Delete `supabaseAdmin` from `src/lib/supabase/client.ts` entirely
2. Remove `VITE_SUPABASE_SERVICE_ROLE_KEY` from all `.env*` files
3. Move every operation that needs elevated privileges to a Supabase Edge Function (Deno) that reads the service_role key from `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` (auto-injected by Supabase runtime, never touches the browser)
4. Add a CI check: `grep -r "VITE_SUPABASE_SERVICE_ROLE" src/ && exit 1` to prevent re-introduction
5. Note: Supabase is migrating from JWT-based service_role keys to revocable secret keys (announced Nov 2025). New projects post-Nov 2025 no longer have legacy service_role keys. Plan for the new key model.

**Detection:**
- `grep -r "service_role\|SERVICE_ROLE" src/` finding any hits in client code
- Browser DevTools > Sources > search for the key value in bundled JS
- Supabase dashboard: Settings > API > check if the key has been rotated recently

**Phase:** Phase 1 (Security Foundation) -- this is the single most urgent fix. Nothing else matters if the service_role key is public.

---

### Pitfall 2: Two Auth Stores Creating Route Protection Bypass (CONFIRMED IN CODEBASE)

**What goes wrong:** `authStore` and `adminAuthStore` both listen to the same `supabase.auth.onAuthStateChange`. When a candidato logs in, BOTH stores receive the session. If `ProtectedAdminRoute` only checks `adminAuthStore.isAdminAuthenticated` (which was set by the same auth event), a candidato can access RH pages. The E2E tests prove this: 9/21 fail because protected routes load content instead of redirecting to login.

**Why it happens:** The system was built incrementally -- candidato auth came first, then RH auth was bolted on as a separate store instead of adding a `role` field to the existing store. Each store has its own "remember me" flags (`auth-session-temporary`, `admin-auth-session-temporary`) in localStorage/sessionStorage, creating 4+ flags that can get out of sync.

**Consequences:**
- Candidatos can access RH dashboard (authorization bypass)
- Logged-out users see protected pages (authentication bypass, confirmed by E2E)
- Logout doesn't work reliably (both stores need to clear, race conditions between them)
- Tab switching and reload cause inconsistent auth state

**Prevention:**
1. Merge into ONE Zustand auth store with a `role: 'candidato' | 'rh' | 'admin' | null` field
2. Derive role from a database lookup (e.g., `profiles.role` or `auth.users.raw_app_meta_data.role`), not from which login page was used
3. Single `onAuthStateChange` listener in ONE place (React context or top-level effect), never duplicated
4. Clean up the listener on unmount: `return () => subscription.unsubscribe()` -- the current code has multiple listeners that may not all clean up
5. Replace manual localStorage/sessionStorage flags with Supabase's native `persistSession` option
6. Build a single `<RoleGuard requiredRole="rh">` component that checks the unified store

**Detection:**
- `grep -r "authStore\|adminAuthStore\|onAuthStateChange" src/` showing multiple listeners
- E2E test: access `/rh/dashboard` without session -> should redirect to `/auth/login`
- E2E test: login as candidato -> navigate to `/rh/dashboard` -> should redirect or show 403

**Phase:** Phase 1 (Security Foundation) -- must be resolved together with Pitfall 1.

---

### Pitfall 3: Big-Bang Auth Migration Breaks All Existing Sessions

**What goes wrong:** When you replace two auth stores with one, change storage keys, or switch from manual flags to `persistSession`, every existing user's session becomes invalid. They get silently logged out (or worse, stuck in a half-authenticated state where the old flags exist but the new store doesn't recognize them). In a brownfield rebuild this happens to real users who are currently using the system.

**Why it happens:** The old stores persist to `sb-auth-token` and `sb-admin-auth-token` storage keys. A new unified store will use a single key. Old sessions linger in localStorage and interfere with the new auth flow. Additionally, `zustand/persist` serializes the entire store shape -- if the shape changes, rehydration fails silently or produces partial state.

**Consequences:**
- All active users forced to re-login (acceptable if communicated)
- If not handled: zombie sessions where old localStorage entries conflict with new store
- `zustand/persist` rehydrates stale data with wrong shape, causing runtime errors (e.g., accessing `candidato.nome_completo` on undefined)

**Prevention:**
1. Add a migration step in the new store's `zustand/persist` config using the `migrate` option with a version number:
   ```typescript
   persist(storeCreator, {
     name: 'auth-store',
     version: 2,
     migrate: (persistedState, version) => {
       if (version < 2) return { ...defaultState } // force re-auth
       return persistedState
     }
   })
   ```
2. On app startup, explicitly clear old storage keys: `localStorage.removeItem('sb-admin-auth-token')`, remove all `auth-session-temporary` / `auth-was-temporary` flags
3. Force `supabase.auth.getSession()` on first load of the new version to re-establish state from server, not from stale localStorage
4. Deploy behind a feature flag or maintenance window with clear communication to the ~10 active users

**Detection:**
- After deploy: monitor auth errors in Supabase Dashboard > Auth > Logs
- Check for `localStorage` keys from old system still present in browser

**Phase:** Phase 1, immediately after the store unification. Must be part of the same deployment.

---

### Pitfall 4: Manually Edited database.types.ts Causing Silent Runtime Failures (CONFIRMED IN CODEBASE)

**What goes wrong:** `database.types.ts` was hand-edited instead of auto-generated, causing 7+ production bugs where frontend code referenced columns that don't exist (`data_candidatura`, `localizacao`, `ativa` as boolean) or enums that were removed (`desistente`). TypeScript compiles fine because the types file SAYS the column exists -- but runtime Supabase queries return 400 errors.

**Why it happens:** The developer changed the database schema (added columns, renamed enums, ran migrations) but didn't regenerate types. Or worse, they edited the types file directly to "fix" TypeScript errors instead of fixing the database. There was no automated pipeline -- no npm script, no pre-commit hook, no CI check.

**Consequences:**
- TypeScript gives false confidence ("it compiles, it must be right")
- 400 errors only discovered in production/manual testing
- Enum mismatches cause silent data loss (inserting a value Postgres rejects)
- Debugging is extremely slow because the types file acts as a red herring

**Prevention:**
1. Generate types exclusively via CLI: `npx supabase gen types typescript --project-id $PROJECT_REF > database.types.ts`
2. Add to `package.json`: `"db:types": "supabase gen types typescript --project-id $PROJECT_REF > database.types.ts"`
3. Pre-commit hook (husky + lint-staged): regenerate types if any `supabase/migrations/*.sql` file changed
4. CI pipeline: `npm run db:types && git diff --exit-code database.types.ts` -- fails if types are out of sync
5. Never reference string literal enums in code. Always use: `Database['public']['Enums']['status_candidatura']`
6. Add `database.types.ts` header comment: `// AUTO-GENERATED -- DO NOT EDIT. Run npm run db:types`

**Detection:**
- `git log --oneline database.types.ts` showing manual edits (not just regeneration commits)
- `grep -r "status.*===.*'" src/` finding hardcoded enum string comparisons
- Runtime 400 errors from Supabase REST API

**Phase:** Phase 1 (Foundation) -- must be automated before any schema changes in subsequent phases.

---

### Pitfall 5: RLS Anonymous SELECT Exposing PII via Enumeration (CONFIRMED IN CODEBASE)

**What goes wrong:** The duplicate check feature allows anonymous users to query `candidatos` by CPF/email to see if they already exist. The RLS policy "Allow anonymous SELECT for duplicate check" on the `candidatos` table may return full rows (nome, telefone, endereco, data_nascimento) instead of just a boolean "exists" response. An attacker can enumerate all CPFs in the database.

**Why it happens:** The developer needed duplicate checking during registration (before the user has an account). The simplest implementation was an anonymous SELECT policy. Without column restrictions in the policy or a dedicated Edge Function, the entire row is accessible.

**Consequences:**
- CPF enumeration: systematically probe all 11-digit combinations or known ranges
- PII exposure: nome_completo, telefone, endereco, data_nascimento of all candidates
- LGPD violation: exposing personal data to unauthenticated users

**Prevention:**
1. Replace the anonymous SELECT policy with a Supabase Edge Function that receives CPF/email, runs a `SELECT EXISTS(...)` query using the service_role key server-side, and returns only `{ exists: true/false }`
2. Add rate limiting to the Edge Function (e.g., 10 requests per minute per IP)
3. Remove ALL anonymous SELECT policies from tables containing PII
4. Audit all 103 RLS policies -- any policy with `role() = 'anon'` on a PII table needs review
5. Use `supabase-js` RLS testing tools or Supashield CLI to audit policies

**Detection:**
- `curl` the Supabase REST API with just the anon key, no auth token, querying `candidatos?cpf=eq.12345678900` -- if it returns data, the policy is too permissive
- Review `docs/RLS_POLICIES.md` for any "anonymous" or "anon" policies on sensitive tables

**Phase:** Phase 1 (Security Foundation) -- must be resolved when migrating service_role operations to Edge Functions.

---

## Moderate Pitfalls

### Pitfall 6: "Remember Me" via Manual Storage Flags Instead of Supabase Native persistSession

**What goes wrong:** The current implementation in `App.tsx:137-177` uses 4 custom flags (`auth-session-temporary`, `auth-was-temporary`, `admin-auth-session-temporary`, `admin-auth-was-temporary`) in localStorage/sessionStorage to implement "Remember Me". On page reload, it checks these flags and calls `supabase.auth.signOut()` if the session was "temporary". This creates race conditions: if the auth state change fires before the flag check completes, the user sees a flash of authenticated content then gets logged out.

**Why it happens:** The developer didn't know that Supabase's `createClient` accepts `persistSession: false` to disable session persistence (session-only, cleared on tab close). Instead, they implemented a custom flag system on top of `persistSession: true`.

**Prevention:**
1. Use two Supabase client configurations -- but NOT two clients. Instead, create the client at login time with the appropriate `persistSession` value based on the "Remember Me" checkbox
2. Since `persistSession` can only be set at client initialization, the cleanest pattern is: always persist, and on login with "Remember Me" unchecked, set a flag that triggers `signOut()` on the `beforeunload` event (browser close) rather than on page reload
3. Or use Supabase's built-in session expiry: set a shorter `expiresIn` for non-remembered sessions

**Detection:**
- Search for `sessionStorage.*auth\|localStorage.*temporary` in the codebase
- User reports of being randomly logged out or staying logged in when they unchecked "Remember Me"

**Phase:** Phase 1, during auth store unification. Must be simplified as part of the single-store migration.

---

### Pitfall 7: Monolith Service File Accumulating More Mutations During Rebuild

**What goes wrong:** `candidaturasService.ts` is 1000+ lines with 5 major functions. During the rebuild, developers add new features (upload, formulario, status transitions) to the same file because "that's where candidaturas code goes." The file grows to 2000+ lines, becomes untestable, and merge conflicts become constant.

**Why it happens:** Brownfield inertia -- the file exists, it works, and splitting it feels like unnecessary refactoring when there are features to ship. Each developer adds "just one more function."

**Consequences:**
- Merge conflicts on every PR that touches candidaturas
- Impossible to unit test individual functions (setup requires importing the entire module)
- Bug fixes in one function accidentally affect others due to shared state/imports
- Code review becomes perfunctory because nobody reads 1000+ line diffs

**Prevention:**
1. Split BEFORE adding new features, not after. Create the split as the first PR of the rebuild:
   - `candidaturasQueryService.ts` (list, get, filter)
   - `candidaturasMutationService.ts` (create, update, delete)
   - `candidaturasStatusService.ts` (status transitions, auto-advance)
   - `candidaturasWebhookService.ts` (N8N webhook dispatch)
2. Each new file gets a barrel export in `index.ts` so existing imports don't break
3. Add a lint rule or PR review checklist: "Is this service file > 300 lines? Split first."

**Detection:**
- `wc -l src/features/vagas/services/candidaturasService.ts` growing over time
- Multiple PRs with conflicts in the same file

**Phase:** Phase 2 (after security foundation is solid). Do NOT attempt this simultaneously with auth migration -- too much change at once.

---

### Pitfall 8: Supabase API Key Migration Breaking Deployed Edge Functions

**What goes wrong:** Supabase announced (Nov 2025) that new projects no longer use legacy `anon`/`service_role` JWT-based keys. Projects restored after Nov 2025 also lose legacy keys. If you create Edge Functions using the new `SUPABASE_SECRET_KEY` pattern but your project still uses legacy keys (or vice versa), auth verification fails silently.

**Why it happens:** The project was created before the key migration. Edge Functions default to JWT verification using the `apikey` header. When migrating to the new key model, you need `--no-verify-jwt` and must implement your own authorization logic inside the function.

**Consequences:**
- Edge Functions return 401 after a project restore or key rotation
- Deployed functions that worked yesterday stop working after Supabase auto-migrates keys
- Custom auth logic in Edge Functions may have bypass vulnerabilities if implemented incorrectly

**Prevention:**
1. Check the project's current key model in Supabase Dashboard > Settings > API
2. If still on legacy keys: continue using them for now, but plan migration
3. When creating Edge Functions, document which key model they expect
4. Pin the Supabase CLI version in package.json to avoid surprise behavior changes
5. Test Edge Functions after any key rotation

**Detection:**
- Edge Functions returning 401 unexpectedly
- Supabase Dashboard showing "legacy keys" warning

**Phase:** Phase 1, when creating Edge Functions to replace the client-side service_role usage. Must choose the correct key model upfront.

---

### Pitfall 9: onAuthStateChange Listener Leaks Causing Stale State

**What goes wrong:** Multiple `onAuthStateChange` listeners are registered (one per store, one per protected route component, etc.) but not all are properly cleaned up on unmount. This causes: (a) stale callbacks updating unmounted components, (b) duplicated side effects (e.g., fetching candidato profile twice), (c) in extreme cases, Web Lock deadlocks that freeze the auth flow entirely.

**Why it happens:** Known Supabase issue (supabase/supabase-js#1594, supabase/supabase#41968): the GoTrue client uses Web Locks without timeouts, and leaked listeners can hold locks indefinitely. In the current codebase, both `authStore` and `adminAuthStore` register listeners, plus `App.tsx` has its own listener for the "remember me" logic.

**Consequences:**
- Auth state becomes inconsistent between stores
- `getSession()` or `refreshSession()` hangs indefinitely (documented Supabase bug)
- Memory leaks in long-running SPA sessions
- Logout fails because a stale listener re-sets the session after signOut clears it

**Prevention:**
1. ONE listener, ONE location (top-level `AuthProvider` or `App.tsx` useEffect)
2. Always return the cleanup function: `return () => subscription.unsubscribe()`
3. Never call Supabase auth methods inside `onAuthStateChange` callbacks (causes re-entrant lock acquisition -- documented in supabase/auth-js#762)
4. Use `supabase.auth.getUser()` for initial state (server-validated), not `getSession()` (reads local storage only)

**Detection:**
- `grep -rn "onAuthStateChange" src/` -- should return exactly 1 result
- Users reporting "app freezes on login" or "logout doesn't work" intermittently

**Phase:** Phase 1, as part of auth unification.

---

### Pitfall 10: Partial Feature Flag Migration Creating Zombie Code Paths

**What goes wrong:** During brownfield rebuild, old pages/components coexist with new ones. The router imports both `VagasPage` and `VagasPublicasPage`, both `CadastroPage` and `InscricaoPage`, both `MeuPerfilPage` and `MeuPerfilCandidatoPage`. Users can navigate to old pages that use the old auth store, old service functions, and stale types -- creating bugs that only appear on specific routes.

**Why it happens:** Developers create new versions of pages but don't delete old ones "just in case." The router grows to accommodate both. Without a clear migration plan, nobody knows which page is canonical.

**Consequences:**
- Users hit old pages with broken auth/types and report bugs in code you thought you'd replaced
- Bundle size bloats (dead code is still imported and bundled by Vite)
- Confusion about which component to fix when bugs are reported

**Prevention:**
1. Create an explicit migration manifest: `OLD_PAGE -> NEW_PAGE -> DELETE_DATE`
2. When creating a new version of a page, immediately redirect the old route to the new one (HTTP 301 or React Router redirect)
3. Delete old pages within the same PR that introduces replacements, not in a future "cleanup" phase
4. Add a `_deprecated/` folder with an eslint rule that errors on imports from it

**Detection:**
- Router file importing multiple versions of the same conceptual page
- `VagasPage.tsx` and `VagasPublicasPage.tsx` both handling `/vagas`
- `git ls-files src/components/pages/ | wc -l` growing instead of staying stable

**Phase:** Ongoing through all phases. Enforce the "delete old when introducing new" rule from Phase 1.

---

## Minor Pitfalls

### Pitfall 11: DevNavigationMenu Shipping to Production

**What goes wrong:** `App.tsx:41-123` contains a floating dev menu listing ALL routes including `/rh/*` admin routes. The CONCERNS.md notes it lacks an `import.meta.env.DEV` gate. If deployed, any user sees the full application surface area.

**Prevention:** Wrap in `{import.meta.env.DEV && <DevNavigationMenu />}` or delete entirely and use React DevTools / a browser extension for route navigation during development.

**Phase:** Phase 1 (immediate, one-line fix).

---

### Pitfall 12: Hardcoded Mock Data Surviving Rebuild Phases

**What goes wrong:** Mock arrays (e.g., `vagasParticipando`, `etapasProcesso`, `userName: 'Joao Silva'`) were left in production code through multiple rounds of development. During rebuild, new mocks are introduced for features under construction and then forgotten.

**Prevention:**
1. Never use inline mock arrays in page components. Create a `__mocks__/` directory with clearly-labeled fixtures
2. Add `// MOCK:` prefix to any temporary data, and a pre-commit grep that warns on `MOCK:` in non-test files
3. Use TanStack Query's placeholder data feature instead of inline mocks

**Phase:** Ongoing. Add the grep check in Phase 1.

---

### Pitfall 13: Mixed pt-BR / en-US Naming Without Convention

**What goes wrong:** Database columns are pt-BR (`nome_completo`, `data_nascimento`), React handlers are en-US (`handleLogout`, `candidate`), types mix both. New developers guess the wrong convention and create inconsistencies.

**Prevention:**
1. Document the convention explicitly: "Database columns/enums/tables: pt-BR. TypeScript variables/functions/components: en-US. UI text: pt-BR."
2. Generated types from the database naturally stay pt-BR -- don't rename them in wrapper types
3. Add the convention to the project's contributing guide

**Phase:** Phase 1 (document the convention). Enforce ongoing.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Auth Unification | Big-bang session invalidation (Pitfall 3) | Use zustand `migrate` + clear old keys on startup |
| Phase 1: service_role Removal | Breaking cadastro flow (currently uses supabaseAdmin) | Build Edge Function for user creation FIRST, test it, then remove client-side admin |
| Phase 1: RLS Audit | Over-restricting policies breaks existing features | Test each policy change against all existing queries before deploying |
| Phase 1: Type Pipeline | First auto-generation reveals schema drift | Run `tsc --noEmit` after first generation, expect 20+ type errors to fix |
| Phase 2: Service Splitting | Import path breakage across 34 pages | Use barrel exports (`index.ts`) and update imports in the same PR |
| Phase 3: Candidatura Flow | Upload to Storage needs authenticated user | Ensure auth is solid (Phase 1) before attempting file uploads |
| Phase 3: Formulario | New table `formularios_candidatura` needs RLS from day 1 | Write RLS policies in the same migration that creates the table |
| Phase 4: Psychometric Tests | N8N webhook dependency | Build with Edge Function fallback; N8N is on a personal account |
| Phase 5: E2E Stabilization | Tests pass locally but fail in CI | Use Supabase test project with seeded data; avoid hitting production |

---

## Sources

- Codebase analysis: `src/lib/supabase/client.ts` (lines 14, 79-90 -- service_role in browser), `src/store/authStore.ts`, `.planning/codebase/CONCERNS.md`
- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys) -- service_role key must be server-side only
- [Supabase Security Retro 2025](https://supabase.com/blog/supabase-security-2025-retro) -- new key model, automatic leak detection
- [Supabase API Key Changes Discussion #29260](https://github.com/orgs/supabase/discussions/29260) -- migration from legacy to publishable/secret keys
- [Supabase onAuthStateChange Reference](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) -- cleanup pattern
- [supabase/auth-js#762](https://github.com/supabase/auth-js/issues/762) -- re-entrant lock bug in onAuthStateChange
- [supabase/auth-js#294](https://github.com/supabase/auth-js/issues/294) -- persistSession multi-tab issues
- [supabase/supabase#41968](https://github.com/supabase/supabase/issues/41968) -- onAuthStateChange hang bug
- [Supabase Type Generation Docs](https://supabase.com/docs/guides/api/rest/generating-types) -- CI automation pattern
- [Supabase Type Generation via GitHub Actions](https://supabase.com/docs/guides/deployment/ci/generating-types) -- scheduled type sync
- [CVE-2025-48757 -- Supabase RLS Misconfiguration](https://blog.pluto.security/p/cve-202548757-what-happened-why-it-b22) -- 170+ apps exposed
- [6 Common Supabase Auth Mistakes](https://startupik.com/6-common-supabase-auth-mistakes-and-fixes/) -- session management pitfalls
- [Supabase Session Management Docs](https://supabase.com/docs/guides/auth/sessions) -- persistSession behavior
- [Supashield RLS Auditing CLI](https://github.com/Rodrigotari1/supashield) -- automated policy testing
