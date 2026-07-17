---
phase: 32-fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer
plan: 02
subsystem: security
tags: [edge-function, deno, storage, rls, signed-url, idor, pii, seg-01, two-client, authenticate-then-authorize]

# Dependency graph
requires:
  - phase: 32-01
    provides: "RED acceptance harness — deno EF unit test (5 branches) + extended no-service-role guard (firstCurriculosSignViolation) + cvUploadService.test getSignedUrl→invoke contract"
  - phase: 10
    provides: "two-client authenticate-THEN-authorize EF skeleton (comparativo-candidatos) — cloned verbatim on the security lines"
  - phase: 04
    provides: "curriculos private bucket + storage RLS (curriculos_select_own_or_rh) + cvUploadService original client signer"
provides:
  - "get-curriculo-url Edge Function: the single privileged RH CV path (authenticate JWT → authorize role from usuarios_rh → authorize vaga ownership → mint 60s signed URL). deno test GREEN 5/5."
  - "Migration A (authored, applied in 32-04): DROP+CREATE curriculos_select_own_or_rh with the candidate own-folder branch ONLY — the role-only RH read leak removed."
  - "cvUploadService.getSignedUrl(candidaturaId) → functions.invoke('get-curriculo-url'); the last client-side createSignedUrl over curriculos removed from src/."
affects: [32-04, 34, get-curriculo-url, curriculos-bucket, VISRH-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "authenticate-THEN-authorize EF: getUser (401) → role from usuarios_rh via service_role recrutador→rh (403) → candidatura_id-only body → vaga.created_by ownership (admin bypasses) BEFORE any privileged read/sign"
    - "candidatura_id-only input: the EF never trusts a client-supplied storage path — resolves curriculo_url server-side (Tampering guard)"
    - "single privileged signer: the client is rewired to functions.invoke; the service_role EF is the ONLY curriculos CV signer (bundle guard enforced)"

key-files:
  created:
    - supabase/functions/get-curriculo-url/index.ts
    - supabase/migrations/20260715000001_curriculos_drop_rh_read.sql
  modified:
    - src/features/vagas/services/cvUploadService.ts

key-decisions:
  - "candidatura_id body parsed with a minimal manual guard (typeof string + non-empty) rather than a zod import — no npm dependency added; the Tampering guard is by construction (the EF only ever reads candidatura_id, never a client path)"
  - "getSignedUrl throws CVUploadServiceError('...','UPLOAD_FAILED', error ?? data) on the invoke failure (exact 32-PATTERNS shape) — extractEfErrorCode normalization skipped to keep the invoke call signature exactly { body: { candidatura_id } } as the test asserts and avoid over-engineering"
  - "Migration A keeps the policy NAME curriculos_select_own_or_rh (cosmetic rename to _select_own deferred) — the behavioral smoke (RH direct Storage read denied) is the gate, not the policy name"

patterns-established:
  - "Cross-plan RED→GREEN: 32-01 authored the deno test RED (module-not-found); 32-02 authored index.ts to green all 5 branches — no in-plan test commit (the test already existed)"
  - "Redacted EF logging (Pitfall 7): the handler logs only { candidatura_id, role } — never the signed URL nor the resolved path"

requirements-completed: []  # SEG-01 is CLOSED (marked complete) only when 32-04 deploys the EF + applies Migration A and seg32_smokes.sql runs GREEN. This plan authors + greens the code layer; it does not apply/deploy.

# Metrics
duration: 5min
completed: 2026-07-15
---

# Phase 32 Plan 02: SEG-01 CV Signed-URL EF + Client Rewire + Migration A Summary

**Built the `get-curriculo-url` Edge Function (authenticate-THEN-authorize two-client, candidatura_id-only, vaga-ownership guard, 60s signed URL), rewired `cvUploadService.getSignedUrl` to invoke it, and authored the migration that removes the role-only RH read branch from the `curriculos` Storage policy — greening the deno EF test (5/5), the extended bundle guard, and the cvUploadService test, with tsc held at the 104 baseline.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-15T04:52:07Z
- **Completed:** 2026-07-15T04:56:50Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- **EF `get-curriculo-url/index.ts`** — clones the PROD-live `comparativo-candidatos` two-client skeleton (D-23) verbatim on the security lines: Step 1 `supabaseUser.auth.getUser()` → 401; Step 2 role read from `usuarios_rh` via `supabaseAdmin` (map `recrutador→rh` / `administrador→administrador`; role NOT from `getUser().app_metadata`) → 403; Step 3 `candidatura_id`-only body (never a client path); Step 4 `candidaturas.select('curriculo_url, vaga_id')` allowlist projection, NULL → 404; Step 5 `role='rh'` must own `vagas.created_by` (admin bypasses, never reads `vagas`) → 403; Step 6 `storage.from('curriculos').createSignedUrl(path, 60)` → 200 `{ ok, signedUrl }`. Static `esm.sh` import (never `.join("npm:")`); signed URL never logged (Pitfall 7). **deno test GREEN 6/6** across the 5 branches.
- **Migration A** (`20260715000001_curriculos_drop_rh_read.sql`) — DROP+CREATE `curriculos_select_own_or_rh` with the candidate own-folder branch ONLY; the role-only OR clause (`auth.jwt() '{app_metadata,role}' IN ('rh','administrador')`) removed. Upload policies (`insert/update/delete_own`) untouched; no BEGIN/COMMIT wrapper (D-22). **Authored, NOT applied** — 32-04 applies it via MCP AFTER the EF deploy (RESEARCH Pitfall 1 ordering).
- **Client rewire** — `cvUploadService.getSignedUrl(path)` → `getSignedUrl(candidaturaId)` calling `supabase.functions.invoke('get-curriculo-url', { body: { candidatura_id } })`; removed the client `createSignedUrl` + the 3600s constant (the EF owns the 60s TTL). The last client-side `createSignedUrl` over `curriculos` is gone from `src/`.

## Task Commits

Each task committed atomically:

1. **Task 1: EF get-curriculo-url (authenticate-THEN-authorize)** — `4a42894` (feat)
2. **Task 2: Migration A — drop RH read branch of curriculos policy (authored, not applied)** — `0edb5ea` (feat)
3. **Task 3: Rewire cvUploadService.getSignedUrl → functions.invoke** — `277b637` (feat)

**Plan metadata:** (this SUMMARY + STATE + ROADMAP) — final docs commit.

_Task 1 is `tdd="true"` but its RED test was authored in 32-01 (cross-plan RED→GREEN); Task 1 is the single GREEN implementation commit._

## Files Created/Modified

- `supabase/functions/get-curriculo-url/index.ts` (created) — the SEG-01 CV signed-URL EF; exported `handler(req, { supabaseAdmin, supabaseUser })`, `import.meta.main`-guarded `Deno.serve` two-client wiring.
- `supabase/migrations/20260715000001_curriculos_drop_rh_read.sql` (created) — Storage RLS: candidate own-folder read branch only. Authored; applied in 32-04.
- `src/features/vagas/services/cvUploadService.ts` (modified) — `getSignedUrl` now routes through the EF; doc comments updated (path→candidaturaId, 1h→60s, EF signer).

## Verification

- `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/get-curriculo-url` → **6 passed / 0 failed** (401 / 403-role / 403-owner / 404-NULL / 200-owner / 200-admin-bypass).
- `npm run test:run -- cvUploadService.test.ts no-service-role-src.grep.test.ts` → **23 passed** (both files GREEN; the `firstCurriculosSignViolation` scan now finds no client curriculos signer in `src/`).
- `npm run lint` (tsc --noEmit) → **104 errors — baseline held exactly** (no new errors; `cvUploadService.ts` clean; no live `getSignedUrl` caller to break).
- `npm run build` (vite) → **succeeds** (assert-chunks / PERF-03 conditions met).
- `seg32_smokes.sql` remains RED by design — it needs 32-03's `funil_kpis` RPC + `rh_le_historico` hardening and the 32-04 apply/deploy.

## Decisions Made

- **Manual `candidatura_id` guard over zod.** A `typeof id === 'string' && id.trim() !== ''` check (400 VALIDATION otherwise) — no npm dependency added, and the Tampering guard (T-32-03) is by construction because the handler only ever consumes `candidatura_id` and resolves the path server-side.
- **`error ?? data` as the thrown detail** in `getSignedUrl` — matches 32-PATTERNS §cvUploadService.ts exactly; skipped `extractEfErrorCode` to keep the invoke call signature precisely `{ body: { candidatura_id } }` (the test asserts it) and avoid over-engineering.
- **Policy name kept.** `curriculos_select_own_or_rh` retained (rename cosmetic) — the behavioral smoke is the gate, not `pg_policies`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The deno test greened on the first run of the authored EF; the two Vitest files and the guard greened immediately after the rewire; tsc held at the 104 baseline with no collateral.

## User Setup Required

None - no external service configuration required. (EF deploy, Migration A apply, and running `seg32_smokes.sql` via MCP happen in 32-04.)

## Next Phase Readiness

- **32-03** builds Migration B (`funil_kpis` DEFINER + `rh_le_historico` WR-04) against `seg32_smokes.sql` (b)/(c)/(d)/(e).
- **32-04** [BLOCKING] executes the ordered apply (RESEARCH Pitfall 1): **deploy `get-curriculo-url` (JWT-ON) → apply Migration A (drop the RH Storage branch) → apply Migration B → reconcile `supabase_migrations.schema_migrations` → regen `database.types.ts` (repo ROOT) → run `seg32_smokes.sql` via MCP** (the load-bearing gate) + a live curl.
- SEG-01 is greened at the code layer; the live behavioral proof (cross-recruiter deny + Storage RH-read gone) is 32-04's job.
- No blockers.

## Self-Check: PASSED

- Files verified on disk: `get-curriculo-url/index.ts`, `20260715000001_curriculos_drop_rh_read.sql`, `cvUploadService.ts`, `32-02-SUMMARY.md` — all FOUND.
- Commits verified: `4a42894`, `0edb5ea`, `277b637` — all FOUND.

---
*Phase: 32-fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer*
*Completed: 2026-07-15*
