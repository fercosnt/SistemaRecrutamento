---
phase: 29-console-de-gest-o-de-usu-rios-rh
plan: 01
subsystem: ui
tags: [tanstack-query, zod, supabase-functions, react-hooks, allowlist, contract-test]

# Dependency graph
requires:
  - phase: 28-gest-o-de-usu-rios-rh-n-cleo-seguro
    provides: "gerenciar-usuario-rh EF (authenticate-THEN-authorize, 5 actions), usuarios_rh admin-only RLS, anti-lockout trigger, _shared/usuario-rh-schemas contract"
provides:
  - "usuarioRhSchemas: novoUsuarioSchema + editarPapelSchema + PAPEL_OPTIONS mirroring the EF criar/mudar_papel branches"
  - "usuariosRhService: listUsuariosRh (allowlist roster read) + criar/mudarPapel/ativarDesativar/resetarSenha (EF-backed writes) + UsuarioRhRow + USUARIOS_RH_LIST_COLUMNS + UsuariosRhServiceError"
  - "useUsuariosRh hooks: query + 4 mutations (useCriarUsuario/useMudarPapel/useAtivarDesativar/useResetarSenha) + usuariosRhKeys"
  - "usuariosRhService contract/allowlist test (26 cases) incl. client↔EF drift guard"
affects: [29-02-NovoUsuarioDialog, 29-03-EditarPapelDialog-UsuariosRhTable, 29-04-GestaoUsuariosPage]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client Zod schema mirrors the EF _shared .strict() branch verbatim (drift guard via safeParse in the test)"
    - "Service normalizes every EF error_code onto .details.error_code; UNAUTHORIZED distinct; EMAIL_SEND_FAILED resolve-with-warning"
    - "TanStack mutations invalidate the list on success (server-truth refetch for anti-lockout count)"

key-files:
  created:
    - src/features/admin/schemas/usuarioRhSchemas.ts
    - src/features/admin/services/usuariosRhService.ts
    - src/features/admin/hooks/useUsuariosRh.ts
    - src/features/admin/services/__tests__/usuariosRhService.test.ts
  modified: []

key-decisions:
  - "Flat feature layout (src/features/admin/{schemas,services,hooks}/) per CONTEXT lock, not the nested sub-feature shape of the 4 existing admin features"
  - "Service carries the raw EF error_code on .details.error_code; the hook owns the pt-BR toast copy; the create dialog owns EMAIL_EXISTS field routing (no onError toast on criar)"
  - "UNAUTHORIZED mapped to a distinct 'sessão expirou' outcome (code UNAUTHORIZED), not the generic SERVER_ERROR bucket"

patterns-established:
  - "usuariosRhService.invokeWrite: single normalizer for all 5 EF actions (transport-error + {ok:false} + {ok:true,warning?} branches via extractEfErrorCode)"
  - "Allowlist projection const USUARIOS_RH_LIST_COLUMNS (9 cols) — never the wildcard; asserted by the test string + a grep guard"

requirements-completed: [USR-01, USR-02, USR-03, USR-04, USR-05]

# Metrics
duration: 5min
completed: 2026-07-13
---

# Phase 29 Plan 01: Console de Gestão de Usuários RH — Data Layer Summary

**Typed, contract-safe data layer for the RH console: an allowlist `usuarios_rh` roster read + 5 EF-backed write actions (criar/mudar_papel/ativar/desativar/resetar_senha) with every error_code normalized, plus TanStack hooks that invalidate on success — all consuming the already-live Phase-28 secure EF.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-13T19:47:32Z
- **Completed:** 2026-07-13T19:52:37Z
- **Tasks:** 3 (Task 2 is TDD: RED → GREEN)
- **Files modified:** 4 created

## Accomplishments
- `usuarioRhSchemas.ts` — `novoUsuarioSchema` + `editarPapelSchema` + `PAPEL_OPTIONS`, mirroring the EF's `criar`/`mudar_papel` branches with byte-identical pt-BR validation messages (the `action` discriminator omitted; the service adds it).
- `usuariosRhService.ts` — `listUsuariosRh` (explicit 9-column allowlist, never the wildcard, T-29-01) + 4 write functions dispatching through `functions.invoke('gerenciar-usuario-rh')` (T-29-02, client never writes `usuarios_rh` directly). Every EF `error_code` (LAST_ADMIN/EMAIL_EXISTS/VALIDATION/FORBIDDEN/NOT_FOUND/SERVER_ERROR/UNAUTHORIZED) round-trips to `.details.error_code`; `UNAUTHORIZED` is a distinct session-expired outcome; `EMAIL_SEND_FAILED` resolves success-with-warning (no throw).
- `useUsuariosRh.ts` — `useQuery` (staleTime 5min, retry 2) + 4 mutation hooks; every `onSuccess` invalidates `usuariosRhKeys.list()`; `LAST_ADMIN`/`UNAUTHORIZED` mapped on row mutations; create errors deferred to the dialog.
- Contract/allowlist test (26 cases) including the client↔EF drift guard — a body built from a valid `NovoUsuarioForm` parses under the EF's OWN shared `.strict()` `gerenciarUsuarioRhSchema`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Client Zod schemas mirroring the EF contract** — `0547852` (feat)
2. **Task 2: usuariosRhService (test-first)** — `9628734` (test, RED) → `129d9b8` (feat, GREEN)
3. **Task 3: useUsuariosRh query + 4 mutations** — `3498fea` (feat)

**Plan metadata:** committed with SUMMARY/STATE/ROADMAP (docs).

## Files Created/Modified
- `src/features/admin/schemas/usuarioRhSchemas.ts` — client Zod create/edit form schemas + PAPEL_OPTIONS + inferred types.
- `src/features/admin/services/usuariosRhService.ts` — allowlist roster read + 5 EF-backed writes + `UsuariosRhServiceError` + `UsuarioRhRow` + `USUARIOS_RH_LIST_COLUMNS`.
- `src/features/admin/hooks/useUsuariosRh.ts` — `usuariosRhKeys` + query + 4 mutation hooks (invalidate-on-success).
- `src/features/admin/services/__tests__/usuariosRhService.test.ts` — 26-case contract/allowlist/error-mapping/drift-guard test.

## TDD Gate Compliance
- **RED:** `9628734` (`test(29-01)`) — test failed on the missing `../usuariosRhService` module (service not yet implemented).
- **GREEN:** `129d9b8` (`feat(29-01)`) — 26/26 pass.
- **REFACTOR:** none needed (implementation clean on first GREEN). Gate sequence intact (test → feat).

## Decisions Made
- Followed the CONTEXT-locked **flat** feature layout (`src/features/admin/{schemas,services,hooks}/`) rather than the nested sub-feature shape used by the 4 existing admin features.
- Service returns the raw EF `error_code` on `.details.error_code`; the **hook** owns the pt-BR toast copy and the **create dialog** (Wave 2) owns `EMAIL_EXISTS` field routing — so `useCriarUsuario` has no `onError` toast.
- `UNAUTHORIZED` → distinct `code:'UNAUTHORIZED'` + "Sua sessão expirou. Entre novamente." (not the generic bucket).

## Deviations from Plan

None - plan executed exactly as written.

_One cosmetic guard adjustment (not a plan deviation): reworded a docstring so it no longer contained the literal `select('*')` string, keeping the `grep` wildcard-projection guard at 0 matches. No behavior change._

## Issues Encountered
None. The verification `grep` initially matched a docstring mention of the forbidden wildcard; reworded the comment so the guard reads a clean 0.

## User Setup Required
None - no external service configuration required. The `gerenciar-usuario-rh` EF, RLS, RPCs and anti-lockout trigger are already live on PROD (Phase 28). No backend/migration/apply work in this plan.

## Next Phase Readiness
- **Ready for Wave 2** (29-02 NovoUsuarioDialog, 29-03 EditarPapelDialog + UsuariosRhTable): the typed service + hooks + schemas are the contract every component consumes.
- No blockers. Full suite green (801/801, +26); tsc baseline flat at 104 (≤104 gate held).

## Self-Check: PASSED
- Files: all 4 FOUND.
- Commits: `0547852`, `9628734`, `129d9b8`, `3498fea` all FOUND.

---
*Phase: 29-console-de-gest-o-de-usu-rios-rh*
*Completed: 2026-07-13*
