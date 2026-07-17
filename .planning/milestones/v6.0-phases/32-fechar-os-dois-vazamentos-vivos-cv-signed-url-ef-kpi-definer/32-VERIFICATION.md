---
phase: 32-fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer
verified: 2026-07-17T05:15:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
retroactive: true
retroactive_note: "This phase shipped in a prior session (2026-07-15/16) and was never formally verified. This VERIFICATION.md is produced goal-backward against the live codebase + live PROD state, not from SUMMARY.md claims."
---

# Phase 32: Fechar os Dois Vazamentos Vivos — CV Signed-URL EF + KPI DEFINER RPC (BLOCKING) — Verification Report

**Phase Goal:** Existe — e é comprovadamente seguro por smoke comportamental (JWT impersonado) — o par de read-primitives vaga-scoped que as telas do RH da Phase 34 consomem: a EF `get-curriculo-url` (authenticate-THEN-authorize, com a policy de leitura role-only do bucket `curriculos` REMOVIDA) e a RPC `funil_kpis` SECURITY DEFINER (vaga-scoped internamente), com `rh_le_historico` endurecido em defesa-em-profundidade. Zero UI — esta fase é o gatilho (BLOCKING) da Phase 34.

**Verified:** 2026-07-17
**Status:** passed
**Re-verification:** No — initial (retroactive) verification. No prior `*-VERIFICATION.md` existed for this phase.

## Method

This is a retroactive, goal-backward verification. SUMMARY.md claims were treated as hypotheses, not evidence. Every truth below was checked against the live codebase and, where feasible, the live PROD Supabase project, independently in this session:

- Ran the deno EF unit test directly (`deno test`) — not just cited the SUMMARY's claimed pass count.
- Ran the Vitest guard + service test files directly (`npm run test:run`).
- Pulled a live schema-only dump of `storage`/`public` from the linked PROD project (`supabase db dump --linked -s storage,public`) and inspected the actual live `CREATE POLICY`/`CREATE FUNCTION` bodies — not the migration file text alone.
- Confirmed the live Edge Function deployment state (`supabase functions list --project-ref …`) and its verify_jwt posture with an unauthenticated `curl` against the real PROD URL.
- Minted real Bearer tokens for the `candidato.funil@teste.com` and `e2e.admin@beautysmile.com.br` test accounts (gotrue `/token?grant_type=password`) and curled the live EF to observe real 401/403 behavior first-hand.
- Confirmed the migration ledger reconciliation (`supabase migration list --linked`) is still true today (not just at go-live time).
- Walked the git history for both the go-live commit and the subsequent code-review fix commit.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SEG-01 (Roadmap SC1): CV only reachable via `get-curriculo-url` EF, which authenticates THEN authorizes (role + vaga ownership, dono or admin) before minting a short-TTL signed URL; JWT-impersonated smoke proves recruiter A cannot get recruiter B's vaga CV; role-only Storage read branch removed | ✓ VERIFIED | `index.ts` implements the 6-step authenticate→authorize→resolve→sign flow; `deno test` run live in this session: **6/6 pass** (401/403-role/403-owner/404/200-owner/200-admin-bypass). Live schema dump of `storage.objects` policies shows `curriculos_select_own_or_rh` recreated with **only** the candidate own-folder branch (`(storage.foldername(name))[1] = auth.uid()::text`) — no role-only OR clause. The separate `"RH lê currículos"` policy (a second role-only leak discovered live during 32-04) is **absent** from the live dump — confirmed dropped. |
| 2 | SEG-02 (Roadmap SC2): `funil_kpis` is `SECURITY DEFINER`, vaga-scoped internally (`v.created_by = auth.uid()`, admin bypass); smoke proves recruiter A sees no vaga-B numbers; RPC returns only PII-safe aggregates | ✓ VERIFIED | Live schema dump of `public.funil_kpis` confirms `LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''`, internal `WHERE (v_is_admin OR v.created_by = v_uid) AND (p_vaga_id IS NULL OR v.id = p_vaga_id)` scope, and CTE projections limited to `candidatura_id/etapa_de/etapa_para/criado_em/vaga_id` — no `ator`, no `candidatos` columns anywhere in the body. 32-04-SUMMARY documents smoke assertions (b)/(d) PASS live (recruiter A empty vaga-B numbers; recruiter B PII-free owned aggregates) — corroborated structurally by the live function body matching the migration text verbatim. |
| 3 | SEG-02 (Roadmap SC3): `rh_le_historico` hardened to the WR-04 vaga-scoped predicate (closes the P24-deferred role-only leak), verified behaviorally (not just `pg_policies` inspection) | ✓ VERIFIED | Live schema dump shows `rh_le_historico` USING clause is **exactly** the WR-04 join predicate: `admin bypass OR (rh AND candidatura_id IN (candidaturas JOIN vagas WHERE created_by = auth.uid()))`. `candidato_le_proprio_historico` is untouched (same live dump); only these 2 policies exist on `historico_candidatura` (no INSERT policy added). 32-04-SUMMARY documents smoke assertion (c) PASS live (recruiter A denied direct SELECT on vaga-B historico). |
| 4 | SEG-01 (Roadmap SC4): no service_role key in the client bundle and no client-side `createSignedUrl` over `curriculos`; the EF is the sole privileged path (bundle grep-guard) | ✓ VERIFIED | `cvUploadService.ts:199-213` — `getSignedUrl(candidaturaId)` calls `supabase.functions.invoke('get-curriculo-url', …)`; no `createSignedUrl` token remains anywhere touching `curriculos` in `src/`. Ran `npm run test:run` on both `cvUploadService.test.ts` + `no-service-role-src.grep.test.ts` live in this session: **23/23 pass** (guard's `firstCurriculosSignViolation` scan finds nothing). |
| 5 | EF deployed JWT-ON and Migration A applied strictly AFTER the EF deploy (RH never loses CV access); live curl proves no-auth→401, candidato→403, administrador passes the role gate | ✓ VERIFIED | `supabase functions list` shows `get-curriculo-url` ACTIVE, version 2. Live curl performed in this session (no Authorization header) → **HTTP 401** `{"code":"UNAUTHORIZED_NO_AUTH_HEADER",...}` (platform gateway-level JWT-ON — stronger than the handler-only check). Live curl with a real `candidato.funil@teste.com` Bearer → **HTTP 403** `{"error_code":"FORBIDDEN"}`. Live curl with a real `e2e.admin@beautysmile.com.br` Bearer → **HTTP 404** `{"error_code":"NOT_FOUND"}` for a fabricated candidatura id — proving the admin correctly bypasses the role gate that blocked the candidato test and reaches real business logic (the 200-with-signedUrl branch is additionally proven by the deno unit test's mocked admin-bypass case, 6/6 green). |
| 6 | `database.types.ts` (repo ROOT) regenerated with `funil_kpis`; migration ledger reconciled to filenames; `lint`/`build` stay green (no regression) | ✓ VERIFIED | `grep funil_kpis database.types.ts` → present (`4688:funil_kpis: { Args: { p_vaga_id?: string }; ... }`). `supabase migration list --linked` run live in this session shows `20260715000001` and `20260715000002` both present with matching Local\|Remote versions (still reconciled a day+ later — no drift regression). `npm run lint` shows pre-existing baseline errors (97, none touching Phase 32 files) — no new errors introduced by Phase 32 surfaces. |
| 7 | Requirement traceability: SEG-01/SEG-02 are declared in PLAN frontmatter and mapped to Phase 32 in REQUIREMENTS.md — no orphaned requirements | ✓ VERIFIED (with a documentation-only follow-up) | `requirements: [SEG-01, SEG-02]` appears across 32-01/32-02/32-03/32-04 PLAN frontmatter; REQUIREMENTS.md traceability table maps both to "Phase 32". **Note:** REQUIREMENTS.md still shows `[ ]`/"Pending" for SEG-01/SEG-02 — this is exactly the bookkeeping gap this retroactive verification exists to close, not a code gap. Recommend flipping both to `[x]`/"Complete" once this VERIFICATION.md is accepted. |
| 8 | Post-ship code-review findings were fixed and redeployed live, not left as latent debt | ✓ VERIFIED | `32-REVIEW.md` (2026-07-16, status: resolved) documents 5 warnings (WR-01 cross-recruiter existence oracle via 404-before-403 ordering; WR-02 `funil_kpis` counting soft-deleted candidaturas; WR-03 EF signing a soft-deleted CV; WR-04 swallowed `usuarios_rh` query error; WR-05 malformed-UUID 500-not-4xx). Git commit `853cb03` ("fix(32): resolve code-review WR-01..05") shows all 5 fixed; the current `index.ts` and migration B both contain the fix code (`WR-01`/`WR-02`/`WR-03`/`WR-04`/`WR-05` inline comments + the actual guard logic); `get-curriculo-url` live version bumped to 2 (redeployed) matching the commit. |

**Score:** 8/8 truths verified (0 overrides used)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/get-curriculo-url/index.ts` | authenticate-THEN-authorize EF, `candidatura_id`-only input, 60s signed URL | ✓ VERIFIED | Exists, 230 lines, exports `handler`, `import.meta.main`-guarded `Deno.serve`. Deployed live (v2, ACTIVE). `deno test` 6/6 green in this session. |
| `supabase/functions/get-curriculo-url/index.test.ts` | 5-branch deno unit test (401/403-role/403-owner/404/200) | ✓ VERIFIED | Exists, 6 `Deno.test` cases (5 branches + admin-bypass sub-case), all pass live. |
| `supabase/migrations/20260715000001_curriculos_drop_rh_read.sql` | DROP+CREATE `curriculos_select_own_or_rh` candidate-branch-only; also drops the second `"RH lê currículos"` policy found at go-live | ✓ VERIFIED | File contains both DROPs; live schema dump confirms both are gone from PROD and the recreated policy has only the candidate own-folder branch. |
| `supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql` | `funil_kpis` DEFINER RPC + `rh_le_historico` WR-04 hardening | ✓ VERIFIED | File matches the live `pg_get_functiondef`/policy body byte-for-byte (module verified via schema dump), plus the WR-02 soft-delete guard added post-review (commit `853cb03`). |
| `supabase/tests/seg32_smokes.sql` | JWT-impersonated behavioral smoke, 5 labeled assertions (a)-(e), disposable fixture | ✓ VERIFIED | Exists, 200 lines, `RAISE NOTICE 'PASS …'`/`RAISE EXCEPTION` pairs for all 5 assertions, dynamic real-account fixture (fixed after the synthetic-UUID/FK bug found at go-live), `storage.allow_delete_query` GUC handling for the `protect_delete()` trigger. 32-04-SUMMARY documents 5/5 PASS at apply time; not independently re-executed in this session (would require a privileged psql/MCP session against PROD — the static content + live schema dump + live curl evidence corroborate the same claims from a different angle). |
| `src/features/vagas/services/cvUploadService.ts` | `getSignedUrl(candidaturaId)` → `functions.invoke`; no client `createSignedUrl` | ✓ VERIFIED | Confirmed by direct read; no `createSignedUrl` token near `curriculos` remains. |
| `src/__tests__/guards/no-service-role-src.grep.test.ts` | extended tripwire: no client `createSignedUrl` over `curriculos` survives in `src/` | ✓ VERIFIED | `firstCurriculosSignViolation` present; scan + contract cases pass (ran live, 23/23 combined with the service test). |
| `src/features/vagas/services/__tests__/cvUploadService.test.ts` | `getSignedUrl` block mocks `functions.invoke` | ✓ VERIFIED | Confirmed by direct read + live test run. |
| `database.types.ts` (repo root) | regenerated, contains `funil_kpis` | ✓ VERIFIED | `grep funil_kpis database.types.ts` → present. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `cvUploadService.ts` | `get-curriculo-url` EF | `supabase.functions.invoke('get-curriculo-url', { body: { candidatura_id } })` | ✓ WIRED | Grep + test confirm; also consumed downstream. |
| `get-curriculo-url/index.ts` | `curriculos` bucket | `supabaseAdmin.storage.from('curriculos').createSignedUrl(path, 60)` | ✓ WIRED | Present in code; deno test exercises it (mocked). |
| `get-curriculo-url/index.ts` | `usuarios_rh` + `vagas.created_by` | role read + ownership check before any privileged read | ✓ WIRED | Present in code; deno test + live curl (candidato→403, admin bypass) both exercise this. |
| `funil_kpis` | `historico_candidatura → candidaturas → vagas` | internal `WHERE (v_is_admin OR v.created_by = v_uid)` | ✓ WIRED | Confirmed live via schema dump (exact CTE join present). |
| `rh_le_historico` | `candidaturas JOIN vagas.created_by` | WR-04 join predicate (no direct `vaga_id` on `historico_candidatura`) | ✓ WIRED | Confirmed live via schema dump. |
| **Phase 34 `CvButton.tsx`** | `cvUploadService.getSignedUrl` | `import { getSignedUrl } from '@/features/vagas/services/cvUploadService'` | ✓ WIRED (downstream proof) | Confirms the SEG-01 primitive is not an orphaned artifact — it is actively consumed by the shipped Phase 34 RH surface. |
| **Phase 34 `funilKpisService.ts`** | `funil_kpis` RPC | `supabase.rpc('funil_kpis', { p_vaga_id })` | ✓ WIRED (downstream proof) | Confirms the SEG-02 primitive is not orphaned — consumed by `RelatoriosRHPage.tsx` (shipped Phase 34 dashboard). |

### Data-Flow Trace (Level 4)

Not applicable in the traditional sense (this phase ships zero UI — pure server-side primitives). The equivalent "does the data really flow correctly" check was done by (a) executing the deno test live, (b) live-curling the deployed EF with real accounts, (c) diffing the live DB schema dump against the migration text. All three converge on the same behavior described in the SUMMARYs — no hollow/stub primitive was found.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Deno EF unit test (5 branches) | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/get-curriculo-url` | `6 passed \| 0 failed` | ✓ PASS |
| Vitest guard + service test | `npm run test:run -- cvUploadService.test.ts no-service-role-src.grep.test.ts` | `2 passed (2 files) / 23 passed (23 tests)` | ✓ PASS |
| Live EF, no Authorization header | `curl -X POST .../functions/v1/get-curriculo-url` | `HTTP 401` `UNAUTHORIZED_NO_AUTH_HEADER` (gateway-level) | ✓ PASS |
| Live EF, real `candidato` Bearer | same, with a minted candidato Bearer | `HTTP 403` `{"error_code":"FORBIDDEN"}` | ✓ PASS |
| Live EF, real `administrador` Bearer | same, with a minted admin Bearer + fake candidatura_id | `HTTP 404` `{"error_code":"NOT_FOUND"}` (proves admin bypasses the role gate that blocked the candidato) | ✓ PASS |
| Live PROD schema — `curriculos` Storage policies | `supabase db dump --linked -s storage,public` → grep policies | `curriculos_select_own_or_rh` = candidate-only branch; `"RH lê currículos"` absent | ✓ PASS |
| Live PROD schema — `funil_kpis` function body | same dump → extract `CREATE OR REPLACE FUNCTION public.funil_kpis` | `SECURITY DEFINER`, `search_path=''`, PII-safe CTEs, matches migration | ✓ PASS |
| Live PROD schema — `rh_le_historico` policy | same dump → grep policy | WR-04 join predicate present verbatim | ✓ PASS |
| Migration ledger reconciliation (still true today) | `supabase migration list --linked` | `20260715000001` / `20260715000002` both Local==Remote | ✓ PASS |
| `npm run lint` regression check | `npm run lint` | 97 pre-existing errors, none in Phase 32 files | ✓ PASS (no regression) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention is used in this project; the equivalent "probe" for this phase is `supabase/tests/seg32_smokes.sql`, run via Supabase MCP `execute_sql` (not a shell probe script). It was not re-executed in this session (would require a privileged psql/MCP session against PROD outside this tool's available function set); the live schema dump + live curl evidence above independently corroborate the same claims the smoke makes. This is documented, not silently skipped.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| SEG-01 | 32-01, 32-02, 32-04 | CV access vaga-scoped via EF; role-only bucket policy removed; smoke proves cross-recruiter deny | ✓ SATISFIED | Truths 1, 4, 5, 8 above. REQUIREMENTS.md still shows `[ ]`/Pending — recommend flipping to Complete now that this VERIFICATION.md exists. |
| SEG-02 | 32-01, 32-03, 32-04 | KPI aggregation vaga-scoped by construction (DEFINER RPC); `rh_le_historico` hardened WR-04 | ✓ SATISFIED | Truths 2, 3, 5, 8 above. Same REQUIREMENTS.md bookkeeping note applies. |

No orphaned requirements: REQUIREMENTS.md's Phase 32 row lists exactly SEG-01 and SEG-02, and both are declared in every relevant PLAN's `requirements:` frontmatter. Coverage 2/2.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | — | — | None found. Scanned all 8 Phase-32 files (EF, test, migrations, smoke, client service, guard, service test) for `TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER` — zero matches. |

### Human Verification Required

None. This phase's own execution plan (32-04) included a `checkpoint:human-verify` blocking gate that was already run and approved during the original execution session (evidenced by Phase 34 having since been planned, executed, and shipped against these primitives — a later phase cannot BLOCK-depend on and consume an unapproved gate). No further human verification items were identified in this retroactive pass; every claim that could be independently checked was checked live in this session (deno test, Vitest, live curl x3, live schema dump, migration ledger).

## Gaps Summary

No gaps. All 8 merged must-haves (4 ROADMAP Success Criteria + 4 plan-level truths spanning sequencing/regen/traceability/code-review-closure) verified directly against the live codebase and live PROD state, not from SUMMARY.md narrative alone. The only non-blocking finding is a documentation bookkeeping gap: REQUIREMENTS.md still shows SEG-01/SEG-02 as `[ ]`/"Pending" despite the code being live and proven — this VERIFICATION.md is the missing artifact that should trigger flipping those to `[x]`/"Complete".

---

*Verified: 2026-07-17*
*Verifier: Claude (gsd-verifier)*
