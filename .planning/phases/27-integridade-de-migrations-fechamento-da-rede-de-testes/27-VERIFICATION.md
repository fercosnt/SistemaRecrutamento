---
phase: 27-integridade-de-migrations-fechamento-da-rede-de-testes
verified: 2026-07-12T21:30:00Z
status: human_needed
score: 7/8 must-haves fully verified + 1 sanctioned partial (DBMIG-01)
overrides_applied: 0
human_verification:
  - test: "DBMIG-01 — fill 20260419000000_baseline.sql with the real Figma-Make base schema and prove a from-empty rebuild (branch reset + pre-check + push) catalog-diffs EMPTY vs live PROD"
    expected: "A from-zero replay of baseline+72 migrations completes with no `does not exist` error and the six catalog-fingerprint queries diff empty vs PROD"
    why_human: "Needs a Supabase CLI-authenticated / Docker or Pro-branch session (SUPABASE_ACCESS_TOKEN not available in this session); already tracked as pending in 27-HUMAN-UAT.md (2/2 tests pending)"
  - test: "DBMIG-01 — confirm the PROD ledger reconcile (73/73 version rows == filenames, `supabase db push --linked` = up to date) actually landed as the 27-05 SUMMARY claims"
    expected: "`supabase migration list --linked` shows 0 drift; `supabase db push --linked` prints \"Remote database is up to date\""
    why_human: "Requires live Supabase CLI/MCP access this verifier does not have; SUMMARY records the specific reconcile (42 rows realigned) but was not independently re-run"
  - test: "DBMIG-02 backfill data-integrity — confirm no genuine knockout audit row in PROD was mislabeled by the pre-CR-01-fix backfill window"
    expected: "`SELECT count(*) FROM historico_candidatura WHERE auto_rejeitado=false AND etapa_de='inscricao' AND etapa_para='inscricao' AND criterio_texto LIKE 'knockout%'` returns 0"
    why_human: "The code review (27-REVIEW.md CR-01, BLOCKER) found the ORIGINAL backfill WHERE-clause would flip every genuine knockout audit row to false; the fix (commit f1a6293) is confirmed correct in the migration FILE, and the fix commit message asserts \"live PROD verified 0 knockout rows existed when the original ran → no live corruption\" — but that live-PROD assertion was not independently re-run by this verifier (no DB access). Given this is exactly the class of 'silent green regression' the phase exists to close, and it concerns LGPD-relevant audit-trail honesty, it should be re-confirmed with a live query before treating DBMIG-02 as fully closed."
  - test: "CI-07 EF redeploy completeness — confirm the 3 EFs NOT authed-invoked in 27-06 (avaliar-transcricao-entrevista, gerar-guia-entrevista, consolidar-decisao-final) actually resolve the bare-`zod` import at runtime, not just at the platform verify_jwt gate"
    expected: "An authenticated live-invoke of each of the 3 returns a handled response with no import-resolution 500 (ERR_MODULE_NOT_FOUND class)"
    why_human: "The 27-06 PLAN's own acceptance criteria only require an authed live-invoke of the CANARY (avaliar-redacao-cultural) + submit-candidatura; the SUMMARY records only \"Deployed Functions success\" + a no-auth curl (401) for the other 3. A no-auth 401 on a verify_jwt=true EF happens at the platform edge BEFORE the function code runs, so it does NOT prove the cross-boundary bare-zod import resolves inside the handler — this verifier independently re-ran the no-auth curls (confirmed 401×5 / 405,405,401×3, matching config.toml) but could not authenticate to exercise the code path. This is exactly the risk 27-REVIEW.md WR-01 flagged for consolidar-decisao-final's `src/` cross-boundary import."
---

# Phase 27: Integridade de Migrations & Fechamento da Rede de Testes Verification Report

**Phase Goal:** As 73 migrations reconstroem o banco do zero e o ledger de versões converge (destrava pgTAP e reprodutibilidade), e a rede de testes fecha sobre o código já corrigido — cobrindo o único auto-reject sancionado (submit-candidatura knockout), os contratos client↔EF reais e os gates de bundle/verify_jwt — a blindagem que impede regressão verde silenciosa.
**Verified:** 2026-07-12T21:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

This phase mixes FILE-verifiable artifacts (grep/read/run against the working tree) with LIVE-STATE
changes applied to PROD via Supabase MCP by the orchestrator (this verifier has no MCP access — no
`execute_sql`, no `apply_migration`, no `functions deploy`). Every FILE-level claim below was
independently re-executed in this session (not merely grepped from SUMMARY prose): `deno test` (EF
corpus + scripts), `npm run test:run` (Vitest), `npm run -s lint` (tsc count), and 8 live `curl`
probes against the deployed Edge Function invoke URLs (network-reachable, no auth required for a
posture check). LIVE-STATE claims that need a DB session or an authenticated invoke are routed to
Human Verification rather than marked FAILED, per this phase's own BLOCKING-wave design.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | CI-06: `entrevistaService.ts` uses the single canonical `extractEfErrorCode` from `@/lib/efErrors`; inverted local copy gone | ✓ VERIFIED | `entrevistaService.ts:28` imports `extractEfErrorCode` from `@/lib/efErrors`; `:638` calls it `(data, error)` (canonical order); `grep -c "async function extractEfErrorCode"` == 0 (no local dup). Full Vitest 770/770 green (re-run by this verifier). |
| 2 | CI-10: a bundle regression fails both `npm run build` (postbuild) and a dedicated CI step | ✓ VERIFIED | `package.json`: `postbuild` + `assert:chunks` both run `node scripts/assert-chunks.mjs`; `.github/workflows/ci.yml:111-112` adds a distinct `Bundle gate (PERF-03)` step after `npm run build` in the `e2e` job. `scripts/assert-chunks.mjs` has zero commits since Phase 19 (`git log` shows only the original `fd49e2e`) — body byte-unchanged. |
| 3 | CI-15: sync-prompts Deno test runs in CI as a distinct step, type-check ON (TS2352 repaired) | ✓ VERIFIED | `scripts/__tests__/sync-prompts.test.ts:30` uses `mod as unknown as {...}` (double-cast idiom). This verifier independently ran `deno test --allow-env --allow-read scripts/__tests__/` → **7 passed / 0 failed**, type-check ON (no `--no-check` anywhere). `.github/workflows/ci.yml:93-94` wires `Deno scripts test (sync-prompts)` as a distinct blocking step inside the `deno-test` job, no `--config` (correct — avoids the functions-scoped exclude). |
| 4 | CI-07: one bare-`zod` shared schema module is imported by both the EF (Deno import map) and the client contract test (node_modules); 3 migrated contract tests (redacao/entrevista/consolidacao) do a real `.safeParse`, anti-tamper reject asserted | ✓ VERIFIED (repo/test level) — LIVE redeploy propagation only partially confirmed, see human_verification | `supabase/functions/deno.json` has `"zod": "npm:zod@3.25.76"` + `"zod/v4"`; `_shared/schemas.ts`, `_shared/redacao-schemas.ts`, `_shared/entrevista-schemas.ts` all `import { z } from 'zod'` (bare specifier, 0 occurrences of `esm.sh`/`npm:zod` remaining in those 3 files). `consolidar-decisao-final/index.ts:51` imports the shared `ConsolidacaoRequestSchema` (`.uuid()` restored). The 3 contract tests (`redacao-contract.test.ts`, `entrevista-contract.test.ts`, `consolidacaoContract.test.ts`) have `node:fs` count == 0 and (for consolidacao) `Replica` count == 0, each calling `.safeParse` on the real imported schema with an injected-key reject assertion present. This verifier re-ran the full Deno EF corpus (`--config supabase/functions/deno.json supabase/functions`) → **192 passed / 0 failed** (the guard for a missed consumer). LIVE: the 5 EFs whose bundle reaches this module were redeployed per 27-06 SUMMARY; this verifier independently curl'd all 8 EF invoke URLs and got the exact posture the SUMMARY claims (5×401 jwt-on, 405/405/401 self-auth) — but a no-auth 401 on a jwt-on EF fires at the platform edge BEFORE the function boots, so it does NOT prove the bare-zod import resolves inside 3 of the 5 (avaliar-transcricao-entrevista, gerar-guia-entrevista, consolidar-decisao-final) — only the canary + submit-candidatura got an authed live-invoke per the plan's own acceptance bar. Routed to human_verification. |
| 5 | CI-13: `supabase/config.toml` declares `verify_jwt` for all 12 EFs — false for the 3 Bearer-self-auth EFs, true for the other 9 | ✓ VERIFIED | `supabase/config.toml` has exactly 12 `[functions.*]` blocks; `verify_jwt = false` for `analise-candidato-individual`, `cost-alerter`, `gerar-devolutiva-bigfive`; `true` for the other 9; `import_map` set on the 5 shared-zod EFs. LIVE posture independently re-confirmed by this verifier via 8 direct `curl` calls to `https://isljnozzlvckrgjjbjwp.supabase.co/functions/v1/<name>`: the 5 jwt-on EFs touched this phase → **401** each; the 3 Bearer-self-auth EFs → **405, 405, 401** (all handled, non-5xx, matching the declared posture exactly). |
| 6 | CI-03: `submit-candidatura` EF exports a testable `handler(req, deps)`; Deno test covers 401 / `.strict()` 400 / RPC-shape / error mapping; client contract test does a real anti-tamper `.safeParse`; SQL smoke covers knockout/survivor/dedup | ✓ VERIFIED (repo/test level) — LIVE smoke PASS claimed in SUMMARY, not independently re-run, see human_verification | `submit-candidatura/index.ts:90` exports `handler(req, deps)`; `:356` guards `Deno.serve` with `import.meta.main`. This verifier re-ran the Deno EF corpus and confirmed all 5 `submit-candidatura/index.test.ts` cases pass (401-no-write, `.strict()` 400, RPC-shape, 23505→DUPLICATE_CANDIDATURA, 23503→VALIDATION) inside the 192/0 total. `src/features/cadastro/__tests__/submitCandidaturaContract.test.ts` imports the real `submitCandidaturaSchema` and asserts both accept + injected-key reject. `supabase/tests/submit_candidatura_atomic_smokes.sql` (270 lines) asserts all three: knockout (`auto_rejeitado=true, ator NULL`), survivor (`auto_rejeitado=false` post-DBMIG-02), dedup (23505). 27-05 SUMMARY claims this ran live on PROD and passed after a fixture-tuning fix — not independently re-executed by this verifier (no DB access). |
| 7 | DBMIG-02: `avancar_etapa` trigger writes `auto_rejeitado=true` only for a GUC-sanctioned terminal system write; survivor advance writes `false`; trigger fix and backfill are two distinct files; RNF-07a preserved | ✓ VERIFIED (file level, CR-01 blocker found+fixed) — LIVE apply/backfill-safety not independently re-confirmed, see human_verification | `20260712110001_avancar_etapa_auto_rejeitado_fix.sql` reproduces the CURRENT live body (Phase-14 `v_blocked` flag guard preserved verbatim — the 27-05 SUMMARY records this was a pre-apply regression catch) and changes only the predicate to `(v_ator IS NULL AND current_setting('app.rejeicao_sancionada', true) IS NOT DISTINCT FROM 'on' AND NEW.etapa_atual = 'rejeitado')`. The backfill (`20260712110002_backfill_auto_rejeitado.sql`) is a distinct, DDL-free file. **27-REVIEW.md flagged CR-01 (BLOCKER, LGPD Art. 20-relevant): the original backfill `WHERE etapa_para <> 'rejeitado'` also matched the knockout's own `inscricao→inscricao` self-loop audit row, which would flip every genuine sanctioned-reject audit row to `false`.** This verifier confirmed the fix is live in the file (commit `f1a6293`): `AND NOT (etapa_de = 'inscricao' AND etapa_para = 'inscricao')` is present. The fix commit asserts "live PROD verified 0 knockout rows existed when the original ran → no live corruption" — this specific live-DB claim was not independently re-queried by this verifier. |
| 8 | DBMIG-01: 73 migrations reconstruct the DB from zero in a clean environment; ledger converges; no baseline-empty, no only-in-PROD objects | ⚠ PARTIAL — sanctioned deferral, not a gap | Ledger convergence: 27-05 SUMMARY claims 73/73 `schema_migrations` rows now match a local file exactly on version+name (0 orphans, 0 missing) — not independently re-queried (no MCP access). Baseline: `20260419000000_baseline.sql` is 37 lines, but confirmed by this verifier to be **comment-only** (no DDL) — the from-zero replay + catalog-fingerprint-vs-PROD proof is explicitly deferred as environment-gated (needs Docker/Pro-branch CLI session), tracked in `27-HUMAN-UAT.md` (2 tests: pending/pending). REQUIREMENTS.md itself marks DBMIG-01 `[~]` PARCIAL, consistent with this finding. Per explicit phase design, this residual does not block the other 7 requirements' closure. |

**Score:** 7/8 truths fully verified at the level available to this verifier + 1 sanctioned partial (DBMIG-01, documented residual, tracked separately — not counted as failed per the phase's own routing).

### Deferred Items

None deferred to a later milestone phase — DBMIG-01's residual is deferred to a future **environment-gated session within this same requirement**, already tracked in `27-HUMAN-UAT.md`, not to a later roadmap phase. Not applicable to the Step 9b later-phase filter.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/entrevista/services/entrevistaService.ts` | canonical `extractEfErrorCode` import, no local dup | ✓ VERIFIED | grep-confirmed; 770/770 Vitest green |
| `package.json` | `assert:chunks` + `postbuild` scripts | ✓ VERIFIED | both present, wired to `assert-chunks.mjs` |
| `.github/workflows/ci.yml` | Bundle gate step, sync-prompts step, tsc gate at 104 | ✓ VERIFIED | all 3 present; re-confirmed live via `grep` and by re-running the referenced commands |
| `scripts/__tests__/sync-prompts.test.ts` | double-cast module cast, type-check clean | ✓ VERIFIED | re-ran `deno test` → 7/7 pass, type-check ON |
| `supabase/functions/deno.json` | `zod`/`zod/v4` import map | ✓ VERIFIED | present, correct npm specifiers |
| `supabase/functions/_shared/schemas.ts` | bare `import { z } from 'zod'` | ✓ VERIFIED | 1 occurrence, 0 `esm.sh` remaining |
| `supabase/functions/_shared/redacao-schemas.ts` | bare `import { z } from 'zod'` | ✓ VERIFIED | 1 occurrence |
| `supabase/functions/_shared/entrevista-schemas.ts` | bare `import { z } from 'zod'` | ✓ VERIFIED | 1 occurrence |
| `supabase/functions/consolidar-decisao-final/index.ts` | imports shared `ConsolidacaoRequestSchema` | ✓ VERIFIED | line 51; `.uuid()` restored |
| `src/features/avaliacao/__tests__/redacao-contract.test.ts` | real `.safeParse`, no fs-probe | ✓ VERIFIED | `node:fs` == 0 |
| `src/features/entrevista/__tests__/entrevista-contract.test.ts` | real `.safeParse` for guia/transcricao; cognitivo stays a documented replica (scoped exception) | ✓ VERIFIED (scoped) | `node:fs` == 0; `SubmitCognitivoBodySchemaReplica` intentionally out of CI-07 scope (27-02 SUMMARY + 27-REVIEW WR-02) |
| `src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts` | real `.safeParse`, no fs-probe, no Replica | ✓ VERIFIED | `node:fs` == 0, `Replica` == 0 |
| `supabase/config.toml` | 12-fn `verify_jwt` table | ✓ VERIFIED | 12 blocks, 3 false / 9 true, 5 `import_map` |
| `supabase/functions/submit-candidatura/index.ts` | exported `handler(req, deps)` | ✓ VERIFIED | line 90; `Deno.serve` thin-wrapped at 356-357 |
| `supabase/functions/submit-candidatura/index.test.ts` | Deno EF unit test (5 cases) | ✓ VERIFIED | re-ran, all 5 pass inside the 192/0 corpus |
| `src/features/cadastro/__tests__/submitCandidaturaContract.test.ts` | real `.safeParse` anti-tamper | ✓ VERIFIED | imports real shared schema |
| `supabase/tests/submit_candidatura_atomic_smokes.sql` | knockout/survivor/dedup + DBMIG-02 assertions | ✓ VERIFIED (authored) | 270 lines, all 3 assertion classes present; LIVE-run PASS claimed by SUMMARY, not independently re-run |
| `supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql` | GUC-gated predicate, flag guard preserved, no wrapper | ✓ VERIFIED | file matches claims exactly, including the pre-apply regression catch |
| `supabase/migrations/20260712110002_backfill_auto_rejeitado.sql` | distinct data-only file, CR-01 self-loop guard | ✓ VERIFIED | CR-01 fix present (`NOT (etapa_de='inscricao' AND etapa_para='inscricao')`) |
| `supabase/migrations/20260419000000_baseline.sql` | filled with real base-schema DDL | ✗ NOT MET (sanctioned deferral) | 37 lines, comment-only, no DDL — documented residual |
| `database.types.ts` | regenerated | UNCERTAIN | claimed regenerated in 27-05 SUMMARY; not independently diffed against live PROD schema by this verifier |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `entrevistaService.ts:638` | `src/lib/efErrors.ts:38` | `extractEfErrorCode(data, error)` import | ✓ WIRED | canonical arg order confirmed |
| `package.json` postbuild | `scripts/assert-chunks.mjs` | npm lifecycle | ✓ WIRED | `npm run build` self-gates |
| `.github/workflows/ci.yml` e2e job | `scripts/assert-chunks.mjs` | dedicated step after build | ✓ WIRED | distinct failure signal |
| `.github/workflows/ci.yml` deno-test job | `scripts/__tests__/sync-prompts.test.ts` | dedicated Deno step, no `--config` | ✓ WIRED | re-ran, 7/7 pass |
| `src/features/cadastro/__tests__/submitCandidaturaContract.test.ts` | `supabase/functions/_shared/schemas.ts` (submitCandidaturaSchema) | real import + `.safeParse` | ✓ WIRED | valid-parse true, injected-key false |
| `supabase/functions/submit-candidatura/index.test.ts` | `submit-candidatura/index.ts` (`handler`) | dynamic import + injected mock deps | ✓ WIRED | 5/5 cases pass |
| `supabase/functions/consolidar-decisao-final/index.ts` | `src/features/decisao/schemas/consolidacaoSchema.ts` | cross-boundary relative import | ✓ WIRED (repo/Deno-corpus level) — LIVE runtime resolution not authed-confirmed | flagged WR-01 in 27-REVIEW.md; accepted per fix commit but no authed live-invoke evidence for this specific EF in 27-06 SUMMARY |
| `avancar_etapa` trigger predicate | `app.rejeicao_sancionada` GUC | `current_setting('app.rejeicao_sancionada', true)` | ✓ WIRED (file level) | GUC precedent confirmed set by `submit_candidatura_atomic` (20260709000014:136) |

### Data-Flow Trace (Level 4)

This phase is backend/DB/CI-infrastructure, not UI-rendering, so the Level-4 analog is: does the
audit column actually get written/read correctly end-to-end, not just declared correctly.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `historico_candidatura.auto_rejeitado` | GUC-gated predicate in `avancar_etapa()` | `submit_candidatura_atomic` sets `app.rejeicao_sancionada='on'` only on the knockout path | Real (predicate logic verified in file; live write claimed PASS by 27-05 SUMMARY, not independently re-queried) | ⚠ STATIC-UNVERIFIED (file-correct, live-unconfirmed) |
| `submit_candidatura_atomic_smokes.sql` assertions | `v_status`, `v_etapa`, `v_auto`, `v_ator` read back post-RPC | disposable fixture on fixed UUIDs, `set_config('request.jwt.claims','',true)` | Real read-back pattern (not hardcoded) | ✓ FLOWING (as authored; live execution not independently re-run) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CI-15 sync-prompts type-checks clean, type-check ON | `deno test --allow-env --allow-read scripts/__tests__/` | `7 passed \| 0 failed` | ✓ PASS |
| Deno EF corpus green (CI-03/CI-07 wiring, incl. submit-candidatura) | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` | `192 passed \| 0 failed` | ✓ PASS |
| Full Vitest suite green | `npm run test:run` | `99 files, 770 tests passed` | ✓ PASS |
| tsc frozen baseline == 104 (re-pinned this phase) | `npm run -s lint 2>&1 \| grep -c "error TS"` | `104` | ✓ PASS |
| CI-13 live verify_jwt posture — 5 jwt-on EFs | `curl -o /dev/null -w '%{http_code}' https://isljnozzlvckrgjjbjwp.supabase.co/functions/v1/<name>` ×5 | `401,401,401,401,401` | ✓ PASS |
| CI-13 live verify_jwt posture — 3 Bearer-self-auth EFs | same, ×3 | `405,405,401` (all handled, non-5xx) | ✓ PASS |
| `assert-chunks.mjs` byte-unchanged since Phase 19 | `git log --oneline -- scripts/assert-chunks.mjs` | single commit `fd49e2e` (Phase 19) | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist in the repo and no plan/summary in this phase declares a
probe script. Step 7c: **SKIPPED (no probes declared for this phase)**.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DBMIG-01 | 27-04, 27-05 | 73 migrations rebuild-from-zero + ledger converges | ⚠ PARTIAL | ledger convergence claimed live (human_verification); baseline-fill/rebuild-proof sanctioned-deferred |
| DBMIG-02 | 27-04, 27-05 | `auto_rejeitado` distinguishes system-write from sanctioned auto-reject | ✓ SATISFIED (file) / human_verification (live-data-integrity re: CR-01) | trigger + backfill files correct, CR-01 blocker found+fixed |
| CI-03 | 27-03, 27-05 | `submit-candidatura` EF+RPC test coverage | ✓ SATISFIED (file/test) / human_verification (live smoke re-run) | handler+tests+smoke all present and internally consistent |
| CI-06 | 27-01 | `extractEfErrorCode` deduped | ✓ SATISFIED | fully file-verifiable, re-confirmed |
| CI-07 | 27-02, 27-03, 27-06 | real cross-runtime contract tests | ✓ SATISFIED (repo/test) / human_verification (3 of 5 EF live-resolution unconfirmed) | see truth #4 |
| CI-10 | 27-01 | bundle gate wired build+CI | ✓ SATISFIED | fully file-verifiable, re-confirmed |
| CI-13 | 27-02, 27-06 | `verify_jwt` declared + live-posture-confirmed | ✓ SATISFIED | file + independently re-confirmed live via curl |
| CI-15 | 27-01 | sync-prompts test runs in CI, type-check ON | ✓ SATISFIED | fully file-verifiable, re-confirmed |

No orphaned requirements: REQUIREMENTS.md maps exactly these 8 IDs to Phase 27 (`grep "Phase 27"` → 8 rows in the tracking table), matching the phase's declared requirement set and the union of all 6 plans' frontmatter `requirements:` lists.

### Anti-Patterns Found

Scanned all 21 files listed in `27-REVIEW.md`'s `files_reviewed_list` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and placeholder-language patterns: **zero matches**. No debt markers, no stub returns, no hardcoded-empty stand-ins found in the modified/created files. The one genuine BLOCKER found during this phase's own code-review gate (CR-01, backfill self-loop corruption) was already fixed in a follow-up commit (`f1a6293`) prior to this verification pass — confirmed present in the current file.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | none found | — | — |

### Human Verification Required

### 1. DBMIG-01 — baseline-fill + clean-room rebuild-from-zero proof

**Test:** Run the deferred rebuild loop (local `supabase db reset` seed-disabled, or a Pro preview branch reset-to-empty + pre-check + push of the 73 local files), fill `20260419000000_baseline.sql` with the real Figma-Make base schema, and catalog-fingerprint-diff the result vs live PROD.
**Expected:** From-zero replay completes with no `does not exist` error; the six catalog queries (tables/columns, enums, functions, triggers, policies, indexes) diff empty.
**Why human:** Needs Docker or a Supabase Pro branch + CLI auth token, unavailable to this verifier's session. Already tracked as 2 pending tests in `27-HUMAN-UAT.md`.

### 2. DBMIG-01 — re-confirm live ledger convergence

**Test:** `supabase migration list --linked` and `supabase db push --linked`.
**Expected:** 0 drift rows; "Remote database is up to date".
**Why human:** Requires an authenticated Supabase CLI/MCP session this verifier does not have. 27-05 SUMMARY records a specific reconcile (42 rows realigned via a single `UPDATE`) — plausible and internally consistent, but not independently re-executed here.

### 3. DBMIG-02 — confirm no genuine knockout audit row was corrupted by the pre-CR-01-fix backfill

**Test:** `SELECT count(*) FROM historico_candidatura WHERE auto_rejeitado=false AND etapa_de='inscricao' AND etapa_para='inscricao' AND criterio_texto LIKE 'knockout%'`.
**Expected:** 0 rows.
**Why human:** 27-REVIEW.md's CR-01 finding was a genuine BLOCKER (the shipped backfill would flip every genuine knockout audit row) that was fixed at the file level and asserted-safe in the fix commit message ("0 knockout rows existed when the original ran"), but that specific live-PROD claim needs a direct query to close with confidence — this is LGPD Art. 20-adjacent audit-trail integrity, exactly the kind of thing a "regressão verde silenciosa" gate should catch.

### 4. CI-07 — confirm the 3 non-canary redeployed EFs resolve bare-`zod` at runtime

**Test:** Authenticated live-invoke of `avaliar-transcricao-entrevista`, `gerar-guia-entrevista`, and `consolidar-decisao-final` with a valid body.
**Expected:** A handled response (validation error, success, or a legitimate business-logic error) — NOT a 500/ERR_MODULE_NOT_FOUND import-resolution failure.
**Why human:** The 27-06 plan's own acceptance bar only required an authed live-invoke of the canary (`avaliar-redacao-cultural`) + `submit-candidatura`; the SUMMARY records deploy success + a no-auth 401 for the remaining 3, but a no-auth 401 on a `verify_jwt=true` EF fires at the platform edge before the function code runs, so it cannot prove the `src/`-crossing import (`consolidar-decisao-final`, flagged WR-01 in 27-REVIEW.md) or the bare-zod import (all 3) actually resolves inside the handler.

### Gaps Summary

No FILE-level gaps: every artifact, wiring, and test claimed by the six plans' `must_haves` was
independently re-verified in this session (re-ran `deno test` ×2, `npm run test:run`, `npm run -s lint`,
and 8 live `curl` posture checks — none contradicted the SUMMARYs). The one genuine defect surfaced
during the phase (CR-01, a BLOCKER that would have silently corrupted the knockout audit trail) was
already caught by this phase's own code-review gate and fixed before this verification pass.

What remains is exclusively LIVE-STATE confirmation this verifier cannot perform without Supabase
MCP/CLI access: (1) DBMIG-01's baseline-fill + rebuild-from-zero proof, sanctioned as an
environment-gated deferral and already tracked in `27-HUMAN-UAT.md`; (2) a direct re-query to close
the CR-01 live-data-integrity question with certainty rather than trusting the fix commit's own
assertion; (3) authenticated live-invoke confirmation for 3 of the 5 redeployed EFs that only got a
platform-gate check, not a code-path check, in the BLOCKING wave. None of these are code defects —
they are confirmatory checks appropriate for human/orchestrator execution with live database access.

---

*Verified: 2026-07-12T21:30:00Z*
*Verifier: Claude (gsd-verifier)*
