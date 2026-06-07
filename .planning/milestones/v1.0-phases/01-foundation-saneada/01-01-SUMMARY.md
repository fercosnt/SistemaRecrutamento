---
phase: 01-foundation-saneada
plan: 01
subsystem: auth
tags: [supabase, security, auth, edge-functions, service-role, vite]

# Dependency graph
requires:
  - phase: 00-inventory
    provides: "Audit that flagged supabaseAdmin exposure on the client bundle and manual Lembrar-me hacks as critical fixes"
provides:
  - "Anon-only Supabase client (src/lib/supabase/client.ts) with no service_role reference"
  - "cadastroService delegating to Edge Function via supabase.functions.invoke('cadastrar-candidato')"
  - "Login pages free of sessionStorage/localStorage auth flags (Supabase persistSession is the single source of truth)"
  - "Renamed env var SUPABASE_SERVICE_ROLE_KEY (no VITE_ prefix) so Vite never bundles the secret"
affects:
  - "01-02 (auth store unification)"
  - "01-05 (Edge Function cadastrar-candidato) — this plan is the contract the function must satisfy"
  - "02-* (any future cadastro/auth work inherits the anon-only client contract)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Privileged-ops pattern: server-side service_role inside Edge Function, client invokes via supabase.functions.invoke"
    - "Edge Function response envelope: { ok: boolean, data?: {...}, error?: string } (D-01b)"
    - "Lembrar-me delegated to Supabase persistSession — no manual session storage flags"

key-files:
  created: []
  modified:
    - src/lib/supabase/client.ts
    - src/features/cadastro/services/cadastroService.ts
    - src/components/pages/LoginCandidatoPage.tsx
    - src/components/pages/LoginRHPage.tsx
    - .env.local.example
    - .env.local (outside git — renamed VITE_SUPABASE_SERVICE_ROLE_KEY to SUPABASE_SERVICE_ROLE_KEY)

key-decisions:
  - "Tombstone comment in client.ts explicitly names supabaseAdmin to stop reintroductions; grep for the identifier yields a helpful redirect to Edge Functions"
  - "CadastroError code union extended with EDGE_FUNCTION_ERROR rather than replacing existing codes, preserving public contract for consumers (CadastroPage, useFormToast)"
  - "signUp/AuthError re-exported from cadastroService for backward compat, marked TODO for Phase 2 cleanup — avoids breaking any callers discovered later"
  - "Lembrar-me checkbox kept in UI as visual affordance but is now a no-op; Supabase persistSession:true already delivers the behavior users expect"
  - ".env.local secret value NOT deleted — user will rotate the leaked key in Supabase Dashboard as a separate out-of-band action (per orchestrator guidance)"

patterns-established:
  - "Anon-only client boundary: src/lib/supabase/client.ts exports only the anon client; privileged work lives behind supabase.functions.invoke"
  - "Single-transaction cadastro flow: one client-side call (Edge Function) replaces the previous multi-step client orchestration, moving rollback responsibility to the server"

requirements-completed: [FOUND-01, FOUND-11, FOUND-12]

# Metrics
duration: ~30min
completed: 2026-04-20
---

# Phase 1 Plan 1: Foundation Saneada — Service-Role Removal Summary

**Removed the service_role Supabase client from the browser bundle, rerouted cadastro through an Edge Function contract, and replaced manual Lembrar-me session flags with Supabase persistSession.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-20T03:56:00Z (approx, from plan execution start)
- **Completed:** 2026-04-20T04:25:57Z
- **Tasks:** 2 of 2
- **Files modified:** 5 (4 tracked in git + .env.local renamed locally)

## Accomplishments

- **Eliminated the service_role leak** (FOUND-12, threats T-1-01/T-1-03): `src/lib/supabase/client.ts` no longer references `VITE_SUPABASE_SERVICE_ROLE_KEY` nor exports a `supabaseAdmin` client. The key was renamed to `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` so Vite will not inject it into the browser bundle. A tombstone comment in `client.ts` documents the removal and redirects future readers to Edge Functions.
- **Routed cadastro through an Edge Function contract** (FOUND-01, threat T-1-02): `cadastroService.cadastrarCandidato` is now a thin wrapper over `supabase.functions.invoke('cadastrar-candidato')`. The CadastroError contract is preserved (and extended with `EDGE_FUNCTION_ERROR`), so the consumer at `src/components/pages/CadastroPage.tsx` and error toasts continue to work without change.
- **Removed manual Lembrar-me hacks** (FOUND-11): both login pages lost the `sessionStorage`/`localStorage` auth-session/auth-was-temporary flags. Supabase's `persistSession: true` already handles the desired behavior; the checkbox stays in the UI.
- **Scoped out unrelated TypeScript errors**: 393 pre-existing tsc errors remain (2 fewer than the baseline of 395, because two `supabaseAdmin` overload errors in `cadastroService.ts` disappeared). Target files introduced zero new errors.

## Task Commits

Each task was committed atomically (with `--no-verify` per parallel-wave protocol):

1. **Task 1: Remove supabaseAdmin and service_role from client.ts** — `52e4d7e` (feat)
2. **Task 2: Stub cadastroService to use Edge Function + remove Lembrar-me hacks** — `fda6de8` (refactor)

## Files Created/Modified

- **`src/lib/supabase/client.ts`** — Removed `supabaseAdmin` createClient export, removed `supabaseServiceRoleKey` env lookup and its warning block, added tombstone comment. Kept `supabase` anon client plus helpers (`hasActiveSession`, `getCurrentUser`, `signOut`) and `Database` type export. Cleaned the JSDoc reference to admin storage key separation.
- **`src/features/cadastro/services/cadastroService.ts`** — Replaced ~500 lines of multi-step orchestration (signUp + 3 inserts + rollback helpers + mapping functions) with a single `supabase.functions.invoke('cadastrar-candidato')` call. Extended `CadastroError` code union with `EDGE_FUNCTION_ERROR`. Added a typed `CadastrarCandidatoResponse` interface matching the D-01b envelope. Re-exports `signUp`/`AuthError` from `./authService` for backward compat (TODO: remove in Phase 2).
- **`src/components/pages/LoginCandidatoPage.tsx`** — Removed `sessionStorage.setItem('auth-session-temporary', 'true')`, `localStorage.setItem('auth-was-temporary', 'true')`, and their removal siblings from `onSubmit`. Replaced with comment pointing to FOUND-11 / persistSession.
- **`src/components/pages/LoginRHPage.tsx`** — Same treatment for `admin-auth-session-temporary` / `admin-auth-was-temporary`.
- **`.env.local.example`** — Added documented `SUPABASE_SERVICE_ROLE_KEY` entry (without `VITE_` prefix) with a warning explaining why the prefix must never be added.
- **`.env.local`** (outside git, not committed) — Renamed `VITE_SUPABASE_SERVICE_ROLE_KEY` to `SUPABASE_SERVICE_ROLE_KEY`, kept the value (user will rotate the key in Supabase Dashboard separately).

## Decisions Made

- **Keep tombstone comment in client.ts** despite the plan's literal "does NOT contain `supabaseAdmin`" check. The two acceptance criteria in the plan were mutually exclusive (must remove the string AND must contain `// supabaseAdmin REMOVED`). Chose the explicit tombstone because (a) the plan's action section required it verbatim, (b) a grep that returns a helpful comment directing readers to Edge Functions is a better deterrent than a silent removal, and (c) no executable code references `supabaseAdmin`. Verified separately that the tombstone is the only occurrence.
- **Preserve `CadastroError` code union as superset, not replacement.** Existing tests and consumer code match specific codes (`AUTH_FAILED`, `INSERT_FAILED`, `ROLLBACK_FAILED`). Even though those codes will no longer be emitted from the new invoke-based flow (the server will map them server-side), keeping the union prevents breakage if future callers do exhaustive checks. `EDGE_FUNCTION_ERROR` was simply added to the union.
- **Serialize endereco/disponibilidade/autorizacoes as nested objects in the invoke body** rather than flattening per top-level field. The Edge Function (Plan 05) can destructure and remap. This mirrors the `CandidatoFormData` shape and makes both sides easier to reason about.
- **Do not delete the service_role value in `.env.local`** — per orchestrator guidance, the user will rotate the key manually in the Supabase Dashboard. Renaming alone is sufficient to stop Vite from bundling it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Contradiction] Tombstone kept despite conflicting "does NOT contain supabaseAdmin" check**
- **Found during:** Task 1 automated verify step
- **Issue:** The plan's `<action>` section required adding `// supabaseAdmin REMOVED ...` as a comment, but the `<acceptance_criteria>` and `<verify>` grep both asserted the file does NOT contain `supabaseAdmin`. Literally impossible to satisfy both.
- **Fix:** Kept the tombstone comment (explicit plan action takes precedence over auto-generated verify grep). Verified manually that `supabaseAdmin` appears only in the tombstone comment and nowhere as executable code. Also confirmed the stricter-sounding check "does NOT contain `VITE_SUPABASE_SERVICE_ROLE_KEY`" is fully satisfied.
- **Files modified:** src/lib/supabase/client.ts
- **Verification:** `grep -E "^[^/]*supabaseAdmin" src/lib/supabase/client.ts` (matches only comment lines) and `grep -c "supabaseAdmin" src/lib/supabase/client.ts` returns 1 (tombstone line).
- **Committed in:** 52e4d7e (Task 1)

**2. [Rule 3 - Blocking] Used `.env.local.example` instead of `.env.example` for Supabase documentation**
- **Found during:** Task 1 (.env file updates)
- **Issue:** The plan instructed updating or creating `.env.example`. The repo already has `.env.example` but it contains Anthropic/OpenAI/etc. API keys (no Supabase entries), while `.env.local.example` is the canonical Supabase template. Adding Supabase keys to the wrong file would have created two conflicting templates.
- **Fix:** Updated `.env.local.example` (the actual Supabase template) with the new `SUPABASE_SERVICE_ROLE_KEY` entry. Left `.env.example` alone.
- **Files modified:** .env.local.example
- **Verification:** New template line is grep-visible: `grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local.example` matches.
- **Committed in:** 52e4d7e (Task 1)

**3. [Rule 1 - Contradiction] Task 2 verify grep would have failed on the JSDoc mentioning supabaseAdmin server-side**
- **Found during:** Task 2 automated verify step
- **Issue:** My initial rewrite of `cadastroService.ts` had a JSDoc line: `1. supabaseAdmin.auth.signUp (com service_role)` describing what the Edge Function does on the server. The grep check `! grep -q 'supabaseAdmin' src/features/cadastro/services/cadastroService.ts` failed on that comment.
- **Fix:** Rephrased the JSDoc to describe the behavior without naming the client: `Criação do usuário no Auth (usando service_role no backend)`. Semantics preserved.
- **Files modified:** src/features/cadastro/services/cadastroService.ts
- **Verification:** `grep -q 'supabaseAdmin' src/features/cadastro/services/cadastroService.ts` returns false.
- **Committed in:** fda6de8 (Task 2)

---

**Total deviations:** 3 auto-fixed (2 plan contradictions with literal verify checks, 1 blocking env-file-ambiguity)
**Impact on plan:** No scope creep. All three deviations were minor adjustments to reconcile the plan's prose intent with its literal automated checks. The security-critical goals (no service_role in client, no supabaseAdmin executable usage, no Lembrar-me hacks) are fully achieved.

## Issues Encountered

- **Pre-existing TypeScript errors at baseline (395).** Out-of-scope per deviation rules. Verified my changes reduced the count to 393 (two `supabaseAdmin` overload errors in cadastroService disappeared after the refactor). The login pages still have their original 11 pre-existing errors (unused React import, `sonner@2.0.3` module path, etc.); none were introduced by this plan.
- **Full `npm run lint` never passes green.** Per orchestrator guidance this is accepted; the phase-end verification will handle blanket lint status. The target files for this plan have zero errors except on the already-broken test file (`cadastroService.test.ts`, 8 errors — all pre-existing per stash/unstash baseline comparison).

## Deferred Issues

- **`cadastroService.test.ts` tests** are stale vs the new implementation (they still mock `supabase.from`/`auth.admin.deleteUser` and import a non-existent `CandidatoCompleteData` type). Since the file was already red at baseline and this plan does not own test migration, it's deferred. Plan 02 or a later TDD pass should regenerate these tests to cover the new invoke-based contract.
- **Service-role key rotation.** Until the user rotates the leaked key in the Supabase Dashboard, the old value is still valid as a credential. The value still exists in `.env.local` for Supabase CLI use; it is no longer VITE_-prefixed so it won't reach the browser. Tracked as a user action item.

## User Setup Required

**One manual action is required before Phase 1 ships:**
- **Rotate the Supabase service_role key** in Supabase Dashboard → Settings → API. Replace the value in `.env.local` under `SUPABASE_SERVICE_ROLE_KEY`. The previously exposed key should be considered compromised since it was shipped in the browser bundle.

No other dashboard/env changes are required by this plan.

## Threat Flags

None — this plan only closes existing surfaces; it does not introduce new endpoints, auth paths, file access patterns, or schema changes.

## Next Phase Readiness

- **Wave 2 (Plan 02 — auth unification, Plan 03 — RLS/RPC)** is unblocked: both depend on the anon-only client contract this plan established.
- **Wave 3 (Plan 05 — Edge Function cadastrar-candidato)** has a concrete client contract to target: it must accept the JSON body shape emitted by `cadastroService.cadastrarCandidato` and return the `{ ok, data: { userId, candidatoId, disponibilidadeId?, autorizacoesId? } | error }` envelope. Until Plan 05 ships, cadastro attempts will throw `CadastroError('...', 'EDGE_FUNCTION_ERROR')` at runtime — expected and accepted per orchestrator guidance.
- **Concern:** The stale `cadastroService.test.ts` suite will start failing at runtime even though it was already red at compile time. If Vitest runs in CI, the suite should be skipped (`.skip`) or rewritten before the Phase 1 gate.

## Self-Check: PASSED

Verified after SUMMARY.md creation:

- FOUND: `.planning/phases/01-foundation-saneada/01-01-SUMMARY.md`
- FOUND: commit `52e4d7e` (Task 1 — client.ts + .env.local.example)
- FOUND: commit `fda6de8` (Task 2 — cadastroService.ts + both login pages)
- FOUND: `src/lib/supabase/client.ts`
- FOUND: `src/features/cadastro/services/cadastroService.ts`
- FOUND: `src/components/pages/LoginCandidatoPage.tsx`
- FOUND: `src/components/pages/LoginRHPage.tsx`
- FOUND: `.env.local.example`

No missing items.

---
*Phase: 01-foundation-saneada*
*Plan: 01*
*Completed: 2026-04-20*
