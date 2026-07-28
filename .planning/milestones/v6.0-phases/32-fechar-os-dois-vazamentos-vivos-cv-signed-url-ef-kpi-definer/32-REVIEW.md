---
phase: 32-fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer
reviewed: 2026-07-16T00:00:00Z
resolved: 2026-07-16
resolution: "WR-01/02/03/04/05 ALL fixed (EF redeployed + funil_kpis CREATE OR REPLACE live); 5/5 smokes still GREEN; deno 6/6; tsc 104. Info items deferred."
status: resolved
depth: standard
files_reviewed: 5
files_reviewed_list:
  - supabase/functions/get-curriculo-url/index.ts
  - src/features/vagas/services/cvUploadService.ts
  - supabase/migrations/20260715000001_curriculos_drop_rh_read.sql
  - supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql
  - supabase/tests/seg32_smokes.sql
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-07-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 32 is a server-only security phase (SEG-01, SEG-02) that closes two live horizontal leaks: the role-only `curriculos` Storage read branch (replaced by a vaga-scoped `get-curriculo-url` Edge Function) and the funnel-KPI aggregation channel (a PII-safe `funil_kpis` DEFINER RPC + `rh_le_historico` WR-04 hardening). The core hardening is sound and behaviorally proven: the two-client D-23 authenticate-THEN-authorize skeleton is correctly cloned, the static `esm.sh` import discipline is honored, the role is correctly read from `usuarios_rh` (not the null `raw_app_meta_data`) with `ativo`/`deleted_at` guards, the signed URL is never logged, and Migration A drops **both** role-only read policies (proven by smoke `(a)`). No BLOCKER-tier defect was found — no cross-tenant CV access, no PII in the KPI payload, no secret leak.

The residual gaps are all correctness/defense-in-depth issues the smokes and deno tests do not exercise, and they cluster around one theme the phase overlooked: **soft-delete (`candidaturas.deleted_at`) is invisible to the RLS-scoped RH path (`sec08_candidaturas_dup_policy_remediation`), but the two new service_role/DEFINER surfaces bypass that invariant** — the EF serves a soft-deleted candidatura's CV, and `funil_kpis` counts soft-deleted candidaturas in every aggregate. Plus a cross-recruiter existence oracle (404-before-ownership), one inconsistently-swallowed query error, and a 500-for-bad-input path.

No structural findings block was provided.

## Warnings

### WR-01: EF leaks candidatura existence / CV-presence to non-owning RH (404 computed before the ownership check)

**File:** `supabase/functions/get-curriculo-url/index.ts:147-180`
**Issue:** The handler resolves the candidatura and returns **404 NOT_FOUND** (missing row or NULL `curriculo_url`) at lines 160-162, *before* the `role === "rh"` ownership check at lines 168-180 (which returns **403 FORBIDDEN**). For a non-owning recruiter probing an arbitrary `candidatura_id`, the two responses form an oracle:

- `404` → the candidatura does not exist, or has no CV.
- `403` → the candidatura exists, has a CV, and belongs to *another recruiter's* vaga.

So a recruiter can determine whether a candidatura they do **not** own has a CV uploaded — a cross-recruiter existence/CV-presence disclosure. Practical exploitability is low (candidatura IDs are unguessable UUIDs), and no CV bytes leak either way, but it is a genuine defense-in-depth gap that neither the deno test (which asserts 404 and 403 in isolation) nor the SQL smoke (which never invokes the EF) covers.
**Fix:** Make the not-owner and not-found cases indistinguishable. Since `vaga_id` is required to check ownership, keep the resolve, but for `role === "rh"` return the same `404 NOT_FOUND` (not 403) when the recruiter does not own the vaga:
```ts
if (role === "rh") {
  const { data: vagaRow, error: vagaErr } = await supabaseAdmin
    .from("vagas").select("created_by").eq("id", cand.vaga_id).maybeSingle();
  if (vagaErr) return errorResponse("SERVER_ERROR", "Falha ao verificar a vaga.", 500);
  if (!vagaRow || vagaRow.created_by !== user.id) {
    // Uniform 404 — do NOT reveal that the CV exists but is owned by another recruiter.
    return errorResponse("NOT_FOUND", "Currículo não encontrado.", 404);
  }
}
```

### WR-02: `funil_kpis` counts soft-deleted candidaturas in every aggregate (inaccurate KPIs + bypasses the RH soft-delete invariant)

**File:** `supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql:60-109`
**Issue:** Neither `scoped_hist` (the `JOIN public.candidaturas c` at line 71) nor the `volume` CTE (line 105) filters `c.deleted_at IS NULL`. `candidaturas` has a `deleted_at` soft-delete column (database.types.ts:844), and the project invariant (`20260709000002_sec08_candidaturas_dup_policy_remediation.sql:23`: *"RH does NOT see drafts/soft-deleted: deleted_at IS NULL"*) is that RH must not see soft-deleted candidaturas. Because `funil_kpis` is `SECURITY DEFINER`, it bypasses that RLS scope and folds soft-deleted candidaturas into `volume_by_stage`, the `median_time_per_stage` deltas, and the `conversion_stage_to_stage` counts. Result: KPIs are inflated/inaccurate, and the RH-facing dashboard (Phase 34) will show volumes that don't reconcile with the RH's own candidatura list. This is a correctness defect, not PII (the smoke's PII assertion still passes), so it slipped the gate.
**Fix:** Add the soft-delete filter to both CTEs:
```sql
-- scoped_hist WHERE clause:
   WHERE (v_is_admin OR v.created_by = v_uid)
     AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
     AND c.deleted_at IS NULL          -- exclude soft-deleted candidaturas
-- volume WHERE clause: add the same `AND c.deleted_at IS NULL`.
```

### WR-03: EF serves the CV of a soft-deleted candidatura (candidaturas resolve omits `deleted_at IS NULL`)

**File:** `supabase/functions/get-curriculo-url/index.ts:151-155`
**Issue:** The role query correctly filters `usuarios_rh.deleted_at` (line 120), but the candidatura resolve does **not** filter `candidaturas.deleted_at`:
```ts
.from("candidaturas").select("curriculo_url, vaga_id").eq("id", candidaturaId).maybeSingle();
```
Because the EF reads via `service_role` (RLS-bypassing), it will mint a signed URL for a **soft-deleted** candidatura's CV — a candidatura the owning RH can no longer see through the normal RLS-scoped list (`sec08` invariant, same as WR-02). Ownership is still enforced (own-vaga only, no cross-tenant leak), so this is defense-in-depth / LGPD-consistency rather than a cross-tenant breach, but a soft-deleted (e.g. withdrawn) application's CV remaining fetchable is a data-visibility decision that should be made explicitly, not by omission.
**Fix:** Filter soft-deleted rows on the resolve so the EF matches the RLS visibility invariant (or add a code comment documenting a deliberate decision to keep them accessible):
```ts
.from("candidaturas").select("curriculo_url, vaga_id")
  .eq("id", candidaturaId).is("deleted_at", null).maybeSingle();
```

### WR-04: EF role-check swallows its query error → transient DB failure or duplicate row silently becomes a 403

**File:** `supabase/functions/get-curriculo-url/index.ts:115-121`
**Issue:** The `usuarios_rh` read destructures only `data` (`const { data: rhRow } = ...`), discarding `error` — unlike the `candidaturas` read (line 156: `candErr → 500`) and the `vagas` read (line 174: `vagaErr → 500`), which both surface failures. Two consequences:
1. A transient DB error on the role lookup yields `rhRow = undefined → role = null →` **403 FORBIDDEN** — a legitimate RH sees "Acesso negado" (a permanent-looking denial with no retry signal) instead of a retryable 500, and the real server error is never logged.
2. If a `user_id` ever has two `usuarios_rh` rows, `.maybeSingle()` returns an error (not data); the swallowed error means that RH is silently locked out (403).

Fails closed (secure), but the inconsistency masks server errors and produces a misleading UX.
**Fix:** Capture and surface the error like the sibling reads:
```ts
const { data: rhRow, error: rhErr } = await supabaseAdmin
  .from("usuarios_rh").select("role").eq("user_id", user.id)
  .eq("ativo", true).is("deleted_at", null).maybeSingle();
if (rhErr) return errorResponse("SERVER_ERROR", "Falha ao verificar o acesso.", 500);
```

### WR-05: Malformed / non-UUID `candidatura_id` returns 500 (SERVER_ERROR) instead of a 4xx — and is untested

**File:** `supabase/functions/get-curriculo-url/index.ts:132-162`
**Issue:** Input validation (lines 135-145) checks only `typeof id !== "string" || id.trim() === ""` — it does not validate UUID shape. A non-UUID string (e.g. `"abc"`) passes validation, then `.eq("id", candidaturaId)` against the `uuid`-typed `candidaturas.id` column raises Postgres `22P02` (invalid text representation), which is caught by `candErr` at line 156 → **500 SERVER_ERROR**. Client-supplied bad input should not surface as a server error (it pollutes error monitoring and misleads callers into treating a 4xx condition as an outage). The deno test suite covers 401/403/404/200 but exercises neither the `VALIDATION` branch (empty/missing id → 400) nor this malformed-id path, so the mis-status is unproven.
**Fix:** Validate UUID format before the DB read and return `400 VALIDATION` (or treat as `404`):
```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (typeof id !== "string" || !UUID_RE.test(id.trim())) {
  return errorResponse("VALIDATION", "candidatura_id inválido.");
}
```
Add a deno test for the malformed-id and missing-id (VALIDATION) branches.

## Info

### IN-01: Migration A recreates a policy whose name no longer matches its scope

**File:** `supabase/migrations/20260715000001_curriculos_drop_rh_read.sql:34-41`
**Issue:** The recreated policy keeps the name `curriculos_select_own_or_rh`, but the RH (`_or_rh`) branch is exactly what this migration removed — the name now advertises a capability the policy no longer grants. A future maintainer auditing `pg_policies` could read the name and wrongly assume an RH read path still exists (the very P24-class confusion this phase is fixing).
**Fix:** Rename to `curriculos_select_own` (drop old, create new-named) so the policy name states the actual scope.

### IN-02: Client `getSignedUrl` collapses all EF errors into one code, discarding the EF's error semantics

**File:** `src/features/vagas/services/cvUploadService.ts:199-213`
**Issue:** Every EF outcome (401 UNAUTHORIZED, 403 FORBIDDEN, 404 NOT_FOUND, 500 SERVER_ERROR) is mapped to a single `CVUploadServiceError` with `code: 'UPLOAD_FAILED'` and the generic message "Não foi possível gerar URL de download". The `CVUploadServiceError` code union already includes `UNAUTHORIZED`, so a caller wanting to distinguish "session expired" or "access denied" from "not found" cannot. The EF's structured `error_code`/`message` is available via `error.context` on a `FunctionsHttpError` but is dropped.
**Fix:** Optionally read `error.context` (or the returned body) and map `UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND` to distinct codes for better downstream UX. Low priority — behavior is safe, only granularity is lost.

### IN-03: Non-POST returns `error_code: "SERVER_ERROR"` with HTTP 405

**File:** `supabase/functions/get-curriculo-url/index.ts:98`
**Issue:** A wrong HTTP method is a client error (405 Method Not Allowed), but the body labels it `SERVER_ERROR`. Cosmetic mismatch — harmless, but slightly misleading for anyone triaging by `error_code`.
**Fix:** Use a client-oriented code (e.g. `"VALIDATION"`) or introduce a `"METHOD_NOT_ALLOWED"` code for the 405.

### IN-04: Stale doc comment — `removeCV` claims "RH cleanup" but no RH delete path exists on curriculos

**File:** `src/features/vagas/services/cvUploadService.ts:216-218`
**Issue:** The doc comment says `removeCV` is "Used by candidate self-service (re-upload replaces) or by RH cleanup." Migration A (and the original bucket migration) leave only own-folder write policies (`curriculos_delete_own`, matching `foldername[1] = auth.uid()`), so an RH calling this client path against another user's folder would be denied by Storage RLS — "RH cleanup" via `removeCV` cannot work. Pre-existing, not introduced here, but the comment misleads.
**Fix:** Drop "or by RH cleanup" from the comment (or route RH cleanup through a privileged EF if that capability is actually wanted).

---

_Reviewed: 2026-07-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
