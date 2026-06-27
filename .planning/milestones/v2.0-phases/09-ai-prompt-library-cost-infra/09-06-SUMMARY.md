---
phase: 09-ai-prompt-library-cost-infra
plan: 06
subsystem: ci-versioning
tags: [deno, github-actions, sha-256, zod, supabase, prompt-versioning, idempotent-upsert, ia-01, rf-pl-07]

# Dependency graph
requires:
  - phase: 09-01
    provides: Wave-0 RED scaffold scripts/__tests__/sync-prompts.test.ts (the export contract this plan satisfies)
  - phase: 09-02
    provides: standardized template frontmatter (id/call_type/semver/content_hash/schema_version_required/model_id/...) + zod@3.25.76 pin
  - phase: 09-03
    provides: prompt_versions table + content_hash text column + seed placeholder rows (hybrid git->DB contract; ON CONFLICT(content_hash))
provides:
  - "scripts/sync-prompts.ts — Deno git->DB sync: parseTemplate + frontmatterSchema/validateFrontmatter (RF-PL-01) + contentHash SHA-256 (RF-PL-02) + buildUpsertRow + syncAll idempotent UPSERT (RF-PL-07) + RF-PL-11 semver-collision throw"
  - ".github/workflows/prompts-sync.yml — path-filtered CI sync (push to main on docs/conhecimento/prompts/templates/**) via denoland/setup-deno@v2 + service_role secret"
affects: [09-07, 09-08]

# Tech tracking
tech-stack:
  added: [denoland/setup-deno@v2 GitHub Action, "npm:@supabase/supabase-js@2 (Deno specifier)"]
  patterns: [canonical sorted-key JSON for reproducible content_hash, path-filtered CI workflow scoped to template dir, is_active=false sync (no auto-activate — decision #2), service_role secret never VITE_-prefixed]

key-files:
  created:
    - scripts/sync-prompts.ts
    - .github/workflows/prompts-sync.yml
  modified: []

key-decisions:
  - "content_hash canonicalizes frontmatter via SORTED-KEY JSON (not bare JSON.stringify as the RESEARCH snippet showed) — the RED test asserts reorder-invariance, so sorted-key is a strict superset of the contract"
  - "sync-prompts computes the REAL canonical content_hash from git templates; the 09-03 seed deliberately used a sentinel hash (encode(digest('seed:<type>:<semver>','sha256'),'hex')) + placeholder bodies — so the first real merge inserts the true rows and ON CONFLICT(content_hash) DO NOTHING makes re-runs no-ops"
  - "exported BOTH the test-contract names (contentHash/validateFrontmatter/buildUpsertRow) AND the plan-body names (parseTemplate/frontmatterSchema/syncAll/semverCollisionMessage) so the RED test flips GREEN and the plan acceptance greps all match"
  - "CLI entrypoint gated behind import.meta.main so `deno test` import never tries to construct a Supabase client or read env"

patterns-established:
  - "Pattern: YAML frontmatter mini-parser handles quoted values with trailing inline comments (schema_version_required: \"1.0.0\"  # comment) — take up to the matching closing quote, discard the trailing comment"
  - "Pattern: path-filtered prompts-sync.yml is the ONLY git->DB writer of prompt_versions; runtime (Plan 05) reads only the DB, never the filesystem"

requirements-completed: [IA-01]

# Metrics
duration: ~14min
completed: 2026-06-08
---

# Phase 9 Plan 06: git→DB Prompt-Library Sync Summary

**A Deno sync script (`scripts/sync-prompts.ts`) that Zod-validates each of the 7 git templates' frontmatter, computes a deterministic SHA-256 content_hash, and idempotently UPSERTs each into `prompt_versions` at `is_active=false`/`is_canary=false` (ON CONFLICT(content_hash) DO NOTHING) — plus a path-filtered GitHub Action (`prompts-sync.yml`) that runs it on merge to main only when a template changes. Flips the Plan 09-01 `sync-prompts.test.ts` RED test GREEN (7/7).**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-06-08
- **Completed:** 2026-06-08
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- **`scripts/sync-prompts.ts` (Deno, 307 LoC):** exports `parseTemplate` (splits the `--- ... ---` frontmatter + the SYSTEM/USER fenced code blocks), `frontmatterSchema` + `validateFrontmatter` (RF-PL-01 Zod — rejects a missing field and a non-SemVer `semver`), `contentHash` (RF-PL-02 — SHA-256 hex via Web Crypto over `system + user + canonicalJSON(frontmatter-without-hash)`, reorder-invariant via sorted keys), `buildUpsertRow` (always `is_active=false` + `is_canary=false`, carries the computed hash), `syncAll` (reads all `*.md`, validates, hashes, UPSERTs ON CONFLICT(content_hash) DO NOTHING, throws RF-PL-11 on a same-(call_type,semver)-different-hash collision), and `semverCollisionMessage`. CLI entrypoint reads `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env`, gated behind `import.meta.main`.
- **`.github/workflows/prompts-sync.yml`:** triggers on `push` to `main` path-filtered to `docs/conhecimento/prompts/templates/**`; checkout → `denoland/setup-deno@v2` → `deno run --allow-read --allow-env --allow-net scripts/sync-prompts.ts` with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` injected from GH secrets. Header documents `is_active=false` + one-time manual activation (decision #2) and that the service_role secret is server-side only and never VITE_-prefixed. `ci.yml` untouched.
- **RED → GREEN:** `scripts/__tests__/sync-prompts.test.ts` flips from module-not-found RED to 7/7 GREEN. All 7 live templates additionally verified to parse + pass Zod + hash deterministically.

## Task Commits

Each task committed atomically (hook bypass `git -c core.hooksPath=/dev/null` per project convention):

1. **Task 1: scripts/sync-prompts.ts** — `58331e2` (feat)
2. **Task 2: .github/workflows/prompts-sync.yml** — `8dcf661` (feat)

**Plan metadata:** (this docs commit)

## Files Created/Modified

- `scripts/sync-prompts.ts` — Deno git→DB sync (parseTemplate + frontmatterSchema + contentHash + buildUpsertRow + syncAll + RF-PL-11 collision guard)
- `.github/workflows/prompts-sync.yml` — path-filtered CI sync on merge to main via Deno + service_role secret

## Decisions Made

- **Sorted-key canonical JSON for content_hash:** the RESEARCH snippet (§Code Examples) used a bare `JSON.stringify(fmNoHash)`, but the RED test asserts that reordered-but-equal frontmatter yields the SAME hash. Sorting keys before stringify satisfies that contract and makes the hash robust to YAML key-order edits — a strict superset of the RESEARCH algorithm, same SHA-256 class.
- **Hash relationship to the 09-03 seed:** the seed migration deliberately wrote a sentinel hash `encode(digest('seed:<call_type>:1.0.0','sha256'),'hex')` over a `seed:` string (not the real bodies, which were `[SEED PLACEHOLDER]`). This script computes the REAL canonical hash over actual `system + user + frontmatter`. The two differ by design — the first real merge inserts the true rows; `ON CONFLICT(content_hash) DO NOTHING` then makes every subsequent run a no-op. The seed comment explicitly anticipates this hydration.
- **Dual export surface:** the RED test imports `contentHash`/`validateFrontmatter`/`buildUpsertRow`; the plan body's acceptance greps want `parseTemplate`/`frontmatterSchema`/`syncAll`/`is_active`/`ON CONFLICT`/`content_hash`. Exported all of them so both gates pass from one module.
- **`import.meta.main` gate:** keeps `deno test`'s static import of the module from constructing a Supabase client or touching env — the test never makes a real DB call (its contract), and this enforces it structurally.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] YAML frontmatter parser dropped quoted values with trailing inline comments**
- **Found during:** Task 1 (post-write smoke against all 7 real templates)
- **Issue:** The 7 templates carry lines like `schema_version_required: "1.0.0"  # CvSummarySchema em 00-shared-zod-schemas.ts`. The first parser only stripped a trailing `# comment` when the value was UNQUOTED, then required the value to END with a quote to unquote — so the quoted-value-plus-trailing-comment case parsed to the literal `"1.0.0"  # CvSummarySchema...`, failing the SemVer regex and rejecting every real template (`valid=false`).
- **Fix:** For a quoted value, take everything up to the matching closing quote and discard whatever follows (including the inline comment); unquoted values keep the ` #` strip. After the fix all 7 templates parse + pass Zod + hash.
- **Files modified:** scripts/sync-prompts.ts
- **Verification:** 7/7 unit tests still GREEN; all 7 live templates `valid=true` with deterministic hashes (e.g. `01-cv-summary` → `31a0883b7322…`).
- **Committed in:** 58331e2 (Task 1 commit — caught and fixed before commit)

---

**Total deviations:** 1 auto-fixed (1 bug, fixed pre-commit)
**Impact on plan:** Correctness requirement — without it the CI sync would reject every valid template at runtime. No scope change; export surface and behavior are exactly as specified.

## Issues Encountered

- A verify one-liner printed `MODIFIED` for `ci.yml` only because a preceding `grep -c` returned exit 1 (zero matches, by design) and short-circuited the `&&/||` chain. `git diff .github/workflows/ci.yml` is empty and `git status` shows ci.yml is untracked-of-changes — ci.yml is genuinely UNCHANGED.

## Threat Surface (threat_model coverage)

All addressed in the authored code: T-09-19 (invalid/forged frontmatter → `frontmatterSchema` throws in `syncAll` before any UPSERT → build fails); T-09-20 (service_role only ever a GH secret, injected via `env:`, never VITE_-prefixed, never logged); T-09-21 (sync writes `is_active=false`/`is_canary=false` only — no auto-activation path exists in the code); T-09-SC (accepted — pinned official `denoland/setup-deno@v2`, same trust tier as ci.yml's existing actions). No new threat surface beyond the register.

## User Setup Required

Before the Action can write to PROD on the first template merge, Fernando must configure two repo secrets (Settings → Secrets and variables → Actions): `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service_role — server-side only, NOT VITE_-prefixed). Until then the workflow exists but the sync step exits 1 with a missing-env message (safe — no partial write). Activation of the synced prompts (`is_active=true` per call_type) remains a separate one-time manual SQL step (decision #2 / Plan 09-07 territory).

## Next Phase Readiness

- IA-01 hybrid git→DB versioning is code-complete: the only writer of new `prompt_versions` from the authoring source, idempotent and non-activating. Plan 09-07's PROD apply of the 09-03 migrations + the first real template merge will hydrate the true rows; Plan 09-05's runtime loader reads only the DB.
- The `prompt_versions` UPSERT shape (`call_type, semver, content_hash, system_template, user_template, model_id, fallback_model_id, temperature, max_tokens, schema_version_required, change_summary, changed_by, is_active, is_canary`) is asserted against the 09-03 schema column set.

## Self-Check: PASSED

- Files: `scripts/sync-prompts.ts` + `.github/workflows/prompts-sync.yml` + this SUMMARY.md FOUND on disk.
- Commits: `58331e2`, `8dcf661` FOUND in git log.
- Test: `deno test scripts/__tests__/sync-prompts.test.ts` → 7 passed / 0 failed.
- tsc baseline: 293 = 293 (zero growth — scripts/ outside the `src` tsconfig include scope).

---
*Phase: 09-ai-prompt-library-cost-infra*
*Completed: 2026-06-08*
